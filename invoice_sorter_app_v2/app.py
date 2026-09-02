import io
import os
import re
import shutil
import tempfile
import threading
import zipfile
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime
from pathlib import Path

import fitz  # PyMuPDF
import numpy as np
import streamlit as st
from PIL import Image


DATE_FOLDER_RE = re.compile(r"^\d{1,2}-[A-Za-z]{3}-\d{2}$", re.I)
OCR_SCALE = 1.2
OCR_RETRY_SCALE = 1.7
HEADER_FRACTION = 0.4
HEADER_TALL_FRACTION = 0.55
_OUTPUT_LOCK = threading.Lock()
_PADDLE_LOCK = threading.Lock()
_PADDLE_ENGINE = None
_RAPID_LOCAL = threading.local()
os.environ.setdefault("PADDLE_PDX_ENABLE_MKLDNN_BYDEFAULT", "0")
os.environ.setdefault("FLAGS_use_mkldnn", "0")
os.environ.setdefault("OMP_NUM_THREADS", "1")
os.environ.setdefault("MKL_NUM_THREADS", "1")


def worker_count():
    # Pytest stays single-threaded so OCR tests stay stable.
    if os.environ.get("PYTEST_CURRENT_TEST"):
        return 1
    cpu = os.cpu_count() or 2
    return max(1, min(2, cpu))


def paddle_retry_enabled():
    return os.environ.get("INVOICE_SORTER_USE_PADDLE", "").strip().lower() in {"1", "true", "yes"}


def get_rapid_engine():
    """Fast ONNX OCR. One engine per thread so PDFs can be processed in parallel."""
    engine = getattr(_RAPID_LOCAL, "engine", None)
    if engine is None:
        from rapidocr import RapidOCR

        engine = RapidOCR(
            params={
                "Global.use_cls": False,
                "Global.max_side_len": 960,
                "Global.log_level": "error",
                "EngineConfig.onnxruntime.use_cuda": False,
                "EngineConfig.onnxruntime.intra_op_num_threads": 2,
                "EngineConfig.onnxruntime.inter_op_num_threads": 1,
            }
        )
        _RAPID_LOCAL.engine = engine
    return engine


def get_paddle_engine():
    """Slower CPU OCR used only for the first-page retry when explicitly enabled."""
    global _PADDLE_ENGINE
    if _PADDLE_ENGINE is False:
        return None
    if _PADDLE_ENGINE is None:
        with _PADDLE_LOCK:
            if _PADDLE_ENGINE is None:
                try:
                    from paddleocr import PaddleOCR

                    _PADDLE_ENGINE = PaddleOCR(
                        lang="en",
                        use_doc_orientation_classify=False,
                        use_doc_unwarping=False,
                        use_textline_orientation=False,
                    )
                except Exception:
                    _PADDLE_ENGINE = False
    return None if _PADDLE_ENGINE is False else _PADDLE_ENGINE


def get_ocr_engine():
    """RapidOCR for the normal path. Kept for tests and fallbacks."""
    return get_rapid_engine()


def _paddle_result_to_text(result) -> str:
    if not result:
        return ""
    first = result[0] if isinstance(result, list) else result
    rec_texts = None
    if hasattr(first, "get"):
        rec_texts = first.get("rec_texts")
    if rec_texts is None:
        rec_texts = getattr(first, "rec_texts", None)
    if rec_texts:
        return "\n".join(str(t) for t in rec_texts)
    lines = result[0] if isinstance(result, list) and result else []
    texts = []
    for item in lines or []:
        if item and len(item) >= 2 and item[1]:
            texts.append(str(item[1][0]))
    return "\n".join(texts)


def ocr_image_rapid(image: Image.Image) -> str:
    array = np.asarray(image.convert("RGB"))
    result = get_rapid_engine()(array)
    txts = getattr(result, "txts", None) or ()
    return "\n".join(txts)


def ocr_image_paddle(image: Image.Image) -> str:
    engine = get_paddle_engine()
    if engine is None:
        return ""
    array = np.asarray(image.convert("RGB"))
    with _PADDLE_LOCK:
        if hasattr(engine, "predict"):
            result = engine.predict(array)
        else:
            result = engine.ocr(array, cls=False)
        return _paddle_result_to_text(result)


def ocr_image(image: Image.Image) -> str:
    return ocr_image_rapid(image)


def safe_name(value: str) -> str:
    value = re.sub(r"\s+", " ", value or "").strip()
    value = re.sub(r'[<>:"/\\|?*]', "_", value)
    value = value.rstrip(". ")
    return value or "UNKNOWN"


def parse_date_folder(folder_name: str):
    for fmt in ("%d-%b-%y", "%d-%B-%y"):
        try:
            return datetime.strptime(folder_name, fmt).date()
        except ValueError:
            pass
    return None


def render_page_band(page, scale=OCR_SCALE, fraction=HEADER_FRACTION):
    """Render only the invoice header band needed for identification."""
    rect = page.rect
    clip = fitz.Rect(0, 0, rect.width, max(1, rect.height * fraction))
    pix = page.get_pixmap(
        matrix=fitz.Matrix(scale, scale),
        clip=clip,
        alpha=False,
    )
    return Image.frombytes("RGB", [pix.width, pix.height], pix.samples)


def ocr_scanned_page(page, scale: float = OCR_SCALE) -> str:
    """OCR only the GST header band of the supplied page."""
    return ocr_image_rapid(render_page_band(page, scale=scale, fraction=HEADER_FRACTION))


def ocr_first_page(pdf_path: Path, scale: float = OCR_SCALE):
    """Read embedded text or OCR ONLY page 1 of a source PDF.

    Every source PDF is one complete invoice package. The remaining pages are
    supporting documents and are never rendered/OCR'd.
    """
    doc = fitz.open(pdf_path)
    if len(doc) == 0:
        doc.close()
        return "", 0

    page = doc[0]
    embedded = page.get_text("text").strip()
    if len(embedded) >= 40:
        text = embedded
    else:
        text = ocr_scanned_page(page, scale=scale)
    page_count = len(doc)
    doc.close()
    return text, page_count


def ocr_pdf(pdf_path: Path, scale: float = OCR_SCALE):
    """Backward-compatible name: now reads ONLY the first page."""
    text, _page_count = ocr_first_page(pdf_path, scale=scale)
    return [(0, text)]


def retry_ocr_first_page(pdf_path: Path, first_page_text: str):
    """Retry OCR at higher resolution, but still ONLY on page 1."""
    doc = fitz.open(pdf_path)
    if len(doc) == 0:
        doc.close()
        return first_page_text

    page = doc[0]
    embedded = page.get_text("text").strip()
    # If real embedded text exists, don't waste time OCR'ing it again.
    if len(embedded) >= 40:
        doc.close()
        return first_page_text

    image = render_page_band(
        page,
        scale=OCR_RETRY_SCALE,
        fraction=HEADER_TALL_FRACTION,
    )
    retried = ocr_image_rapid(image)
    if paddle_retry_enabled() and not extract_invoice_number(retried):
        paddle_text = ocr_image_paddle(image)
        if paddle_text:
            retried = paddle_text
    doc.close()
    return retried


def retry_ocr_without_invoice_starts(pdf_path: Path, page_texts):
    """Backward-compatible wrapper; retries only the first page."""
    if not page_texts:
        return []
    page_no, text = page_texts[0]
    return [(page_no, retry_ocr_first_page(pdf_path, text))]


def normalize_ocr_text(text: str) -> str:
    text = (text or "").replace("\u00a0", " ")
    text = re.sub(r"(?i)lnvoice", "Invoice", text)
    text = re.sub(r"(?i)InvoiceNo", "Invoice No", text)
    text = re.sub(r"(?i)Inv\.?\s*No", "Invoice No", text)
    return text


def extract_invoice_number(text: str):
    """Extract the printed invoice number from first-page OCR/text."""
    text = normalize_ocr_text(text)
    patterns = [
        r"Invoice\s*No\.?\s*(?:&\s*Date)?\s*[:\-]?\s*([0-9A-Z][0-9A-Z./_-]{5,})",
        r"Invoice\s*(?:Number|#)\s*[:\-]?\s*([0-9A-Z][0-9A-Z./_-]{5,})",
        r"Invoice\s*No\.?\s*(?:&\s*Date)?[:\-\s]*?(20\d{9})",
        r"\b(20\d{9})\b",
    ]

    for pattern in patterns:
        match = re.search(pattern, text, flags=re.I)
        if match:
            invoice_no = match.group(1).strip(" .,:;")
            invoice_no = re.split(r"\s*[-–]\s*\d{1,2}[/-]\d{1,2}", invoice_no, maxsplit=1)[0]
            invoice_no = invoice_no.strip(" .,:;")
            if re.fullmatch(r"\d{4,}", invoice_no) and len(invoice_no) < 8:
                continue
            return invoice_no
    return None


def extract_customer_name(text: str):
    """Extract the billed-to customer from first-page OCR/text."""
    text = normalize_ocr_text(text)
    patterns = [
        r"Details\s+Of\s+Recipient\s*:\s*\(Billed\s+to\)\s*(?:\n|\r\n)+\s*([A-Z0-9][^\n\r,]{2,}(?:PVT\.?\s*LTD\.?|LTD\.?|LIMITED|LLP|INC\.?|PRIVATE\s+LIMITED)?)",
        r"Billed\s+to\s*[:\-]?\s*(?:\n|\r\n)+\s*([A-Z0-9][^\n\r,]{2,})",
        r"Consignee\s*\(Shipped\s+to\)\s*:\s*(?:\n|\r\n)+\s*([A-Z0-9][^\n\r,]{2,})",
    ]

    for pattern in patterns:
        match = re.search(pattern, text, flags=re.I)
        if match:
            return re.sub(r"\s+", " ", match.group(1)).strip(" ,-")

    match = re.search(r"(PORITE\s*INDIA\s*PVT\.?\s*LTD\.?)", text, flags=re.I)
    if match:
        return "PORITE INDIA PVT.LTD."
    return None


def looks_like_invoice_page(text: str):
    text = normalize_ocr_text(text)
    invoice_no = extract_invoice_number(text)
    gst_form = re.search(r"FORM\s+GST\s+INV", text, re.I) is not None
    tax_invoice = re.search(r"TAX\s+INVOICE|\bFILE\s+COPY\b", text, re.I) is not None
    delivery_only = (
        re.search(r"DELIVERY\s*CHALLAN|Original\s+For\s+Consignee", text, re.I)
        and not gst_form
        and not tax_invoice
    )
    if delivery_only:
        return False
    if invoice_no:
        return True
    return bool(gst_form and tax_invoice)


def find_invoice_starts(page_texts):
    return [page_no for page_no, text in page_texts if looks_like_invoice_page(text)]


def split_invoice_packages(pdf_path: Path, invoice_starts):
    """Legacy helper retained for compatibility; not used by processing anymore."""
    from pypdf import PdfReader, PdfWriter

    reader = PdfReader(str(pdf_path))
    starts = sorted(set(invoice_starts))
    packages = []
    for idx, start in enumerate(starts):
        end = starts[idx + 1] if idx + 1 < len(starts) else len(reader.pages)
        writer = PdfWriter()
        for page_no in range(start, end):
            writer.add_page(reader.pages[page_no])
        temp_path = Path(tempfile.gettempdir()) / (
            f".invoice_package_{os.getpid()}_{threading.get_ident()}_{idx + 1}.pdf"
        )
        with open(temp_path, "wb") as f:
            writer.write(f)
        packages.append((start, end, temp_path))
    return packages


def date_folder_name_for(path: Path, root: Path) -> str:
    for parent in [path, *path.parents]:
        if DATE_FOLDER_RE.match(parent.name):
            return parent.name
        if parent == root:
            break
    return path.parent.parent.name


def process_invoice_file(source_pdf: Path, root: Path, output_root: Path):
    """Identify an invoice from page 1 and copy the COMPLETE source PDF."""
    first_page_text, page_count = ocr_first_page(source_pdf)
    invoice_no = extract_invoice_number(first_page_text)
    customer = extract_customer_name(first_page_text)

    if not invoice_no or not customer:
        retried_text = retry_ocr_first_page(source_pdf, first_page_text)
        if retried_text != first_page_text:
            first_page_text = retried_text
            invoice_no = extract_invoice_number(first_page_text)
            customer = extract_customer_name(first_page_text)

    date_folder = date_folder_name_for(source_pdf, root)

    if not invoice_no or not customer:
        return [{
            "status": "REVIEW",
            "source_file": str(source_pdf.relative_to(root)),
            "source_pages": f"1-{page_count}" if page_count else "",
            "invoice_number": invoice_no or "",
            "customer": customer or "",
            "date_folder": date_folder,
            "reason": "Could not confidently extract invoice number/customer from page 1",
        }]

    customer = safe_name(customer)
    invoice_no = safe_name(invoice_no)
    destination_dir = output_root / customer / date_folder

    with _OUTPUT_LOCK:
        destination_dir.mkdir(parents=True, exist_ok=True)
        destination = destination_dir / f"{invoice_no}.pdf"
        if destination.exists():
            destination = destination_dir / f"{invoice_no}__DUPLICATE.pdf"
        # Copy the original package intact. No PDF splitting/re-writing is needed.
        shutil.copy2(source_pdf, destination)

    return [{
        "status": "COPIED",
        "source_file": str(source_pdf.relative_to(root)),
        "source_pages": f"1-{page_count}" if page_count else "",
        "invoice_number": invoice_no,
        "customer": customer,
        "date_folder": date_folder,
        "destination": str(destination),
        "reason": "",
    }]


def find_date_folders(root: Path):
    folders = [
        p for p in root.rglob("*")
        if p.is_dir() and DATE_FOLDER_RE.match(p.name)
    ]
    return sorted(
        folders,
        key=lambda p: (parse_date_folder(p.name) or datetime.min.date(), str(p)),
    )


def invoice_pdfs_in(date_folder: Path):
    invoice_dir = None
    for child in date_folder.iterdir():
        if child.is_dir() and child.name.lower() == "invoice":
            invoice_dir = child
            break
    if invoice_dir is None:
        return None
    return sorted(
        p for p in invoice_dir.rglob("*")
        if p.is_file() and p.suffix.lower() == ".pdf" and not p.name.startswith(".")
    )


def extract_zip(archive: Path, dest: Path) -> Path:
    dest.mkdir(parents=True, exist_ok=True)
    dest_resolved = dest.resolve()
    with zipfile.ZipFile(archive) as zf:
        for info in zf.infolist():
            target = (dest / info.filename).resolve()
            if dest_resolved not in target.parents and target != dest_resolved:
                raise ValueError(f"Unsafe zip entry: {info.filename}")
        zf.extractall(dest)
    return dest


def resolve_input(path: Path) -> Path:
    path = path.expanduser()
    if path.is_file() and path.suffix.lower() == ".zip":
        dest = path.parent / f"{path.stem}_extracted"
        if not find_date_folders(dest):
            if dest.exists():
                shutil.rmtree(dest)
            extract_zip(path, dest)
        return dest
    if path.is_dir():
        return path
    raise FileNotFoundError(path)


def process(root: Path, output_root: Path, progress=None):
    root = resolve_input(root)
    results = []
    jobs = []

    for date_folder in find_date_folders(root):
        pdfs = invoice_pdfs_in(date_folder)
        if pdfs is None:
            results.append({
                "status": "SKIPPED",
                "source_file": "",
                "date_folder": date_folder.name,
                "reason": "Invoice folder not found",
            })
            continue
        jobs.extend(pdfs)

    def _run(pdf):
        return process_invoice_file(pdf, root, output_root)

    total = len(jobs)
    if jobs:
        workers = min(worker_count(), total)
        if workers == 1:
            for index, pdf in enumerate(jobs, start=1):
                if progress:
                    progress(index - 1, total, pdf.name)
                results.extend(_run(pdf))
                if progress:
                    progress(index, total, pdf.name)
        else:
            done = 0
            if progress:
                progress(0, total, jobs[0].name)
            with ThreadPoolExecutor(max_workers=workers) as pool:
                for file_results in pool.map(_run, jobs):
                    results.extend(file_results)
                    done += 1
                    if progress:
                        progress(done, total, "")
    return results


def zip_output_tree(output_root: Path) -> bytes:
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", compression=zipfile.ZIP_DEFLATED) as zf:
        for file in sorted(output_root.rglob("*")):
            if file.is_file():
                zf.write(file, file.relative_to(output_root).as_posix())
    return buffer.getvalue()


def process_uploaded_zip(zip_bytes: bytes, filename: str, work_dir: Path, progress=None):
    safe_zip_name = Path(filename or "invoices.zip").name
    if not safe_zip_name.lower().endswith(".zip"):
        safe_zip_name += ".zip"
    work_dir.mkdir(parents=True, exist_ok=True)
    source = work_dir / safe_zip_name
    source.write_bytes(zip_bytes)
    output_root = work_dir / "sorted"
    output_root.mkdir(parents=True, exist_ok=True)
    results = process(source, output_root, progress=progress)
    return results, zip_output_tree(output_root)


def display_results(results):
    if not results:
        st.warning("No matching date folders / invoice PDFs were found.")
        return
    copied = sum(r["status"] == "COPIED" for r in results)
    review = sum(r["status"] == "REVIEW" for r in results)
    skipped = sum(r["status"] == "SKIPPED" for r in results)
    c1, c2, c3 = st.columns(3)
    c1.metric("Invoices copied", copied)
    c2.metric("Needs review", review)
    c3.metric("Skipped", skipped)
    st.dataframe(results, use_container_width=True)
    if review:
        st.warning("Some files need review. Nothing uncertain was silently filed.")


def render_ui():
    st.set_page_config(page_title="Invoice Sorter", page_icon="📁", layout="wide")
    st.title("📁 Invoice Sorter")
    st.write(
        "Read page 1 → identify invoice/customer → copy the complete PDF into the customer/day folder."
    )

    with st.sidebar:
        st.header("What this app does")
        st.markdown(
            """
            - Accepts a zip in the browser (no install for the client)
            - Or a local zip/folder on this computer
            - Finds nested `DD-MMM-YY` day folders
            - Reads ONLY page 1 of each invoice PDF
            - OCRs only the GST header when page 1 has no usable text
            - Creates a folder named after the customer
            - Sorts the complete source PDF into that day's subfolder
            - Flags uncertain files
            """
        )

    client_tab, local_tab = st.tabs(["Client link (upload zip)", "This computer"])

    with client_tab:
        st.caption(
            "The client only needs a browser. They upload the month zip and download a zip of customer folders."
        )
        uploaded = st.file_uploader(
            "Upload invoice zip",
            type=["zip"],
            help="Example: June 26-20260831T053601Z-001.zip",
        )
        if st.button("🚀 Sort uploaded invoices", type="primary"):
            if not uploaded:
                st.error("Choose a zip file first.")
            else:
                bar = st.progress(0, text="Starting...")

                def on_progress(done, total, name):
                    label = f"Reading page 1: {done} of {total} PDFs"
                    if name:
                        label = f"{label}: {name}"
                    bar.progress(done / total if total else 1.0, text=label)

                with tempfile.TemporaryDirectory() as td:
                    results, result_zip = process_uploaded_zip(
                        uploaded.getvalue(),
                        uploaded.name,
                        Path(td),
                        progress=on_progress,
                    )
                st.session_state["last_results"] = results
                st.session_state["download_zip"] = result_zip
                st.session_state["download_name"] = "sorted_invoices.zip"

        if st.session_state.get("last_results") is not None:
            display_results(st.session_state["last_results"])
        if st.session_state.get("download_zip"):
            st.download_button(
                "⬇️ Download sorted invoices",
                data=st.session_state["download_zip"],
                file_name=st.session_state.get("download_name", "sorted_invoices.zip"),
                mime="application/zip",
            )

    with local_tab:
        st.caption(
            "Only page 1 is read. The original multi-page PDF is copied intact. "
            "PaddleOCR is off unless you set INVOICE_SORTER_USE_PADDLE=1."
        )
        input_dir = st.text_input(
            "Input zip or folder",
            placeholder=r"C:\Users\Ananta3011\Downloads\June 26-20260831T053601Z-001.zip",
        )
        output_dir = st.text_input(
            "Output root",
            placeholder=r"C:\Invoices\Output",
        )

        st.markdown("### Expected input")
        st.code(
            r"""
June 26-....zip
└── June 26/
    ├── 25-Jun-26/
    │   ├── Invoice/
    │   └── PIS/
    ├── 26-Jun-26/
    ├── 27-Jun-26/
    └── 30-Jun-26/
""",
            language="text",
        )

        st.markdown("### Output")
        st.code(
            r"""
Output/
└── PORITE INDIA PVT.LTD/
    ├── 25-Jun-26/
    │   ├── 20242500788.pdf
    │   └── 20242500752.pdf
    ├── 26-Jun-26/
    │   └── ...
    └── 30-Jun-26/
""",
            language="text",
        )

        if st.button("🚀 Process local invoices"):
            if not input_dir or not output_dir:
                st.error("Enter both Input zip/folder and Output root.")
            else:
                source = Path(input_dir)
                if not source.exists():
                    st.error(f"Input does not exist: {input_dir}")
                elif not (source.is_dir() or source.suffix.lower() == ".zip"):
                    st.error("Input must be a folder or a .zip file.")
                else:
                    output_root = Path(output_dir)
                    output_root.mkdir(parents=True, exist_ok=True)
                    bar = st.progress(0, text="Starting...")

                    def on_progress(done, total, name):
                        label = f"Reading page 1: {done} of {total} PDFs"
                        if name:
                            label = f"{label}: {name}"
                        bar.progress(done / total if total else 1.0, text=label)

                    results = process(source, output_root, progress=on_progress)
                    display_results(results)


if __name__ == "__main__":
    render_ui()
