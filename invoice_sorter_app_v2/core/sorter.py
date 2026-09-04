import io
import os
import re
import shutil
import sys
import threading
import zipfile
from concurrent.futures import ThreadPoolExecutor
from datetime import date, datetime
from pathlib import Path

import fitz  # PyMuPDF
import numpy as np
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


def app_root() -> Path:
    """Folder that contains customers.txt (source tree or frozen EXE dir)."""
    if getattr(sys, "frozen", False):
        return Path(sys.executable).resolve().parent
    return Path(__file__).resolve().parents[1]


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


_PAN_RE = re.compile(r"^[A-Z]{5}\d{4}[A-Z]$", re.I)
_GSTIN_RE = re.compile(r"^\d{2}[A-Z]{5}\d{4}[A-Z]\dZ[A-Z0-9]$", re.I)
_PRINTED_DATE_RE = re.compile(r"\b(\d{1,2})[./-](\d{1,2})[./-](\d{4}|\d{2})\b")


def _plausible_gst_invoice_number(value: str) -> bool:
    value = (value or "").strip(" .,:;")
    if not value:
        return False
    if _PAN_RE.fullmatch(value) or _GSTIN_RE.fullmatch(value):
        return False
    if re.search(r"PAN|GSTIN", value, re.I):
        return False
    if re.fullmatch(r"20\d{9}", value):
        return True
    if re.fullmatch(r"\d{8,14}", value):
        return True
    return False


def extract_invoice_number(text: str):
    """Extract the printed GST invoice number, not PAN/GSTIN from the same header row."""
    text = normalize_ocr_text(text)
    labeled = re.search(
        r"Invoice\s*No\.?\s*(?:&\s*Date)?[\s:\-]*((?:(?!Invoice).){0,160})",
        text,
        flags=re.I | re.S,
    )
    windows = [labeled.group(1)] if labeled else []
    windows.append(text)

    for window in windows:
        match = re.search(r"\b(20\d{9})\b", window)
        if match:
            return match.group(1)

    patterns = [
        r"Invoice\s*No\.?\s*(?:&\s*Date)?\s*[:\-]?\s*([0-9A-Z][0-9A-Z./_-]{5,})",
        r"Invoice\s*(?:Number|#)\s*[:\-]?\s*([0-9A-Z][0-9A-Z./_-]{5,})",
    ]
    for pattern in patterns:
        for match in re.finditer(pattern, text, flags=re.I):
            invoice_no = match.group(1).strip(" .,:;")
            invoice_no = re.split(r"\s*[-–]\s*\d{1,2}[/-]\d{1,2}", invoice_no, maxsplit=1)[0]
            invoice_no = invoice_no.strip(" .,:;")
            if _plausible_gst_invoice_number(invoice_no):
                return invoice_no
    return None


def _calendar_date(day: int, month: int, year: int):
    try:
        return date(year, month, day)
    except ValueError:
        return None


def _parse_printed_date_token(day_s: str, month_s: str, year_s: str):
    day = int(day_s)
    month = int(month_s)
    year = int(year_s)
    if len(year_s) == 2:
        year = 2000 + year if year < 50 else 1900 + year
    if year < 1990 or year > 2099:
        return None
    return _calendar_date(day, month, year)


def extract_invoice_date(text: str):
    """Printed invoice date from the GST header. Source folder year is ignored."""
    text = normalize_ocr_text(text)
    labeled = re.search(
        r"Invoice\s*No\.?\s*(?:&\s*Date)?[\s:\-]*((?:(?!Invoice).){0,200})",
        text,
        flags=re.I | re.S,
    )
    windows = [labeled.group(1)] if labeled else []
    windows.append(text)

    for window in windows:
        after_number = re.search(
            r"\b20\d{9}\b\s*[-–:,]?\s*(\d{1,2}[./-]\d{1,2}[./-](?:\d{4}|\d{2}))",
            window,
        )
        candidates = []
        if after_number:
            candidates.append(after_number.group(1))
        candidates.extend(match.group(0) for match in _PRINTED_DATE_RE.finditer(window))
        for token in candidates:
            parsed = _PRINTED_DATE_RE.search(token)
            if not parsed:
                continue
            value = _parse_printed_date_token(*parsed.groups())
            if value:
                return value
    return None


_OFFICIAL_CUSTOMERS = None
_TOKEN_DROP = frozenset({"PVT", "LTD", "LIMITED", "PRIVATE", "LLC", "LLP", "CO"})
_TOKEN_FOLD = {
    "TECHNOLOGIES": "TECH",
    "TECHNOLOGY": "TECH",
    "ENGINEERING": "ENGG",
    "ENGINEERS": "ENGG",
    "MANUFACTURING": "MFG",
}


def load_official_customers():
    """Billed-to names from the client's Summary.xlsx customer list."""
    global _OFFICIAL_CUSTOMERS
    if _OFFICIAL_CUSTOMERS is None:
        path = app_root() / "customers.txt"
        names = []
        if path.exists():
            for line in path.read_text(encoding="utf-8").splitlines():
                name = " ".join(line.replace("\xa0", " ").split()).strip()
                if name and not name.startswith("#"):
                    names.append(name)
        _OFFICIAL_CUSTOMERS = names
    return _OFFICIAL_CUSTOMERS


def customer_tokens(name: str):
    tokens = []
    for word in re.findall(r"[A-Za-z0-9]+", (name or "").upper()):
        word = _TOKEN_FOLD.get(word, word)
        if word and word not in _TOKEN_DROP:
            tokens.append(word)
    return tokens


def _tokens_in_order(needle, haystack):
    index = 0
    for token in haystack:
        if index < len(needle) and token == needle[index]:
            index += 1
    return index == len(needle)


def match_official_customer(text: str):
    """Map billed-to OCR text onto the official customer list."""
    text = normalize_ocr_text(text)
    billed = re.search(
        r"(?:Details\s+Of\s+Recipient|Billed\s+to)(.*?)(?:Consignee|GSTIN|Place\s+of\s+Supply|Invoice\s*No|$)",
        text,
        flags=re.I | re.S,
    )
    regions = []
    if billed:
        regions.append(billed.group(1))
    regions.append(text)

    customers = load_official_customers()
    for region in regions:
        hay = customer_tokens(region)
        compact = "".join(hay)
        best = None
        for name in customers:
            needle = customer_tokens(name)
            if not needle:
                continue
            if len(needle) == 1:
                matched = needle[0] in hay
            else:
                matched = _tokens_in_order(needle, hay) or ("".join(needle) in compact)
            if not matched:
                continue
            score = (len(needle), len(name))
            if best is None or score > best[0]:
                best = (score, name)
        if best:
            return best[1]
    return None


def extract_customer_name(text: str):
    """Billed-to customer, using the official list when OCR matches it."""
    official = match_official_customer(text)
    if official:
        return official

    text = normalize_ocr_text(text)
    billed = re.search(
        r"(?:Details\s+Of\s+Recipient|Billed\s+to)(.*?)(?:Consignee|GSTIN|Place\s+of\s+Supply|Invoice\s*No|$)",
        text,
        flags=re.I | re.S,
    )
    regions = [billed.group(1)] if billed else []
    regions.append(text)

    company = re.compile(
        r"([A-Z][A-Z0-9 .&'/-]*?(?:PRIVATE\s+LIMITED|PVT\.?\s*LTD\.?|LTD\.?|LIMITED|LLP)\.?)",
        re.I,
    )
    for region in regions:
        for match in company.finditer(region):
            name = canonicalize_customer_name(match.group(1))
            if _usable_customer_name(name) and not re.search(r"HIGHTEMP", name, re.I):
                return name

    match = re.search(r"(PORITE\s*INDIA\s*PVT\.?\s*LTD\.?)", text, flags=re.I)
    if match:
        return canonicalize_customer_name("PORITE INDIA PVT.LTD.")
    return None


def canonicalize_customer_name(name: str) -> str:
    """One legal name: drop plant names, OCR junk, and billed/shipped duplicates."""
    name = _clean_customer_name(name).replace("]", ")")
    legal = re.search(
        r"(.+?(?:PRIVATE\s+LIMITED|PVT\.?\s*LTD\.?|LTD\.?|LIMITED|LLP)\.?)",
        name,
        flags=re.I,
    )
    if legal:
        name = legal.group(1)
    return _clean_customer_name(name)


def _clean_customer_name(name: str) -> str:
    return re.sub(r"\s+", " ", name or "").strip(" ,-")


def _usable_customer_name(name: str) -> bool:
    if not name or len(name) < 4:
        return False
    if re.fullmatch(r"\d+", name):
        return False
    if re.match(r"^\d+\s*,", name):
        return False
    if re.match(r"^(GSTIN|INVOICE|TAX|FORM|FILE\s+COPY)\b", name, re.I):
        return False
    return True


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


def date_folder_name_for(path: Path, root: Path) -> str:
    for parent in [path, *path.parents]:
        if DATE_FOLDER_RE.match(parent.name):
            return parent.name
        if parent == root:
            break
    return path.parent.parent.name


def _review_result(source_pdf, root, page_count, invoice_no, customer, date_folder, invoice_date, reason):
    return [{
        "status": "REVIEW",
        "source_file": str(source_pdf.relative_to(root)),
        "source_pages": f"1-{page_count}" if page_count else "",
        "invoice_number": invoice_no or "",
        "customer": customer or "",
        "date_folder": date_folder,
        "year": str(invoice_date.year) if invoice_date else "",
        "reason": reason,
    }]


def process_invoice_file(source_pdf: Path, root: Path, output_root: Path):
    """Identify an invoice from page 1 and copy the COMPLETE source PDF."""
    first_page_text, page_count = ocr_first_page(source_pdf)
    invoice_no = extract_invoice_number(first_page_text)
    customer = extract_customer_name(first_page_text)
    invoice_date = extract_invoice_date(first_page_text)

    if not invoice_no or not customer or not invoice_date:
        retried_text = retry_ocr_first_page(source_pdf, first_page_text)
        if retried_text != first_page_text:
            first_page_text = retried_text
            invoice_no = extract_invoice_number(first_page_text)
            customer = extract_customer_name(first_page_text)
            invoice_date = extract_invoice_date(first_page_text)

    date_folder = date_folder_name_for(source_pdf, root)

    if not invoice_no or not customer:
        return _review_result(
            source_pdf,
            root,
            page_count,
            invoice_no,
            customer,
            date_folder,
            invoice_date,
            "Could not confidently extract invoice number/customer from page 1",
        )
    if not invoice_date:
        return _review_result(
            source_pdf,
            root,
            page_count,
            invoice_no,
            customer,
            date_folder,
            invoice_date,
            "Could not confidently extract printed invoice date from page 1",
        )

    customer = safe_name(customer)
    invoice_no = safe_name(invoice_no)
    year_folder = str(invoice_date.year)
    destination_dir = output_root / customer / year_folder / date_folder

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
        "year": year_folder,
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
