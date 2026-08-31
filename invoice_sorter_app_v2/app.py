
import io
import re
import shutil
import tempfile
import zipfile
from datetime import datetime
from pathlib import Path

import fitz  # PyMuPDF
import streamlit as st
import pytesseract
from PIL import Image
from pypdf import PdfReader, PdfWriter

# Windows default install is often missing from PATH.
_WINDOWS_TESSERACT = Path(r"C:\Program Files\Tesseract-OCR\tesseract.exe")
if shutil.which("tesseract") is None and _WINDOWS_TESSERACT.is_file():
    pytesseract.pytesseract.tesseract_cmd = str(_WINDOWS_TESSERACT)


DATE_FOLDER_RE = re.compile(r"^\d{1,2}-[A-Za-z]{3}-\d{2}$", re.I)


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


def render_page(page, scale=2.5):
    pix = page.get_pixmap(matrix=fitz.Matrix(scale, scale), alpha=False)
    return Image.frombytes("RGB", [pix.width, pix.height], pix.samples)


def ocr_pdf(pdf_path: Path):
    """
    OCR every page because the sample invoice is a scanned/image PDF.
    Returns [(page_number_zero_based, text), ...].
    """
    doc = fitz.open(pdf_path)
    output = []

    for page_no, page in enumerate(doc):
        # If a PDF has usable embedded text, keep it; otherwise OCR the image.
        embedded = page.get_text("text").strip()
        if len(embedded) >= 40:
            text = embedded
        else:
            img = render_page(page)
            text = pytesseract.image_to_string(img, config="--psm 6")

        output.append((page_no, text))

    doc.close()
    return output


def extract_invoice_number(text: str):
    """
    Based on the supplied sample, invoice number appears like:
    'Invoice No. & Date : 20242500788 - 29/04/2024'
    """
    patterns = [
        r"Invoice\s*No\.?\s*(?:&\s*Date)?\s*[:\-]?\s*([0-9A-Z][0-9A-Z./_-]{5,})",
        r"Invoice\s*(?:Number|#)\s*[:\-]?\s*([0-9A-Z][0-9A-Z./_-]{5,})",
    ]

    for pattern in patterns:
        match = re.search(pattern, text, flags=re.I)
        if match:
            invoice_no = match.group(1).strip(" .,:;")
            # Sample format is "20242500788 - 29/04/2024"; keep the number only.
            invoice_no = re.split(r"\s+[-–]\s+\d{1,2}[/-]", invoice_no, maxsplit=1)[0]
            return invoice_no.strip(" .,:;")

    return None


def extract_customer_name(text: str):
    """
    The supplied sample has:
      Details Of Recipient :(Billed to)
      PORITE INDIA PVT.LTD.,

    We prefer the billed-to customer over the supplier name.
    """
    patterns = [
        r"Details\s+Of\s+Recipient\s*:\s*\(Billed\s+to\)\s*(?:\n|\r\n)+\s*([A-Z0-9][^\n\r,]{2,}(?:PVT\.?\s*LTD\.?|LTD\.?|LIMITED|LLP|INC\.?|PRIVATE\s+LIMITED)?)",
        r"Billed\s+to\s*[:\-]?\s*(?:\n|\r\n)+\s*([A-Z0-9][^\n\r,]{2,})",
        r"Consignee\s*\(Shipped\s+to\)\s*:\s*(?:\n|\r\n)+\s*([A-Z0-9][^\n\r,]{2,})",
    ]

    for pattern in patterns:
        match = re.search(pattern, text, flags=re.I)
        if match:
            return re.sub(r"\s+", " ", match.group(1)).strip(" ,-")

    # Fallback specifically useful for OCR of this invoice family.
    match = re.search(r"(PORITE\s+INDIA\s+PVT\.?\s*LTD\.?)", text, flags=re.I)
    if match:
        return re.sub(r"\s+", " ", match.group(1)).strip()

    return None


def looks_like_invoice_page(text: str):
    # Delivery challans in the sample also say "Total Invoice Value" and have a
    # blank "Invoice No" form field. Require an actual invoice number.
    if re.search(r"\bINVOICE\b", text, re.I) is None:
        return False
    if re.search(r"Invoice\s*No", text, re.I) is None:
        return False
    return extract_invoice_number(text) is not None


def find_invoice_starts(page_texts):
    return [page_no for page_no, text in page_texts if looks_like_invoice_page(text)]


def split_invoice_packages(pdf_path: Path, invoice_starts):
    """
    If one source PDF contains multiple invoices, split it into packages.

    Example from the supplied sample:
      invoice starts on pages 1, 4, 9
    so packages become:
      pages 1-3
      pages 4-8
      pages 9-13

    Each package retains its supporting delivery-challan/receipt pages.
    """
    reader = PdfReader(str(pdf_path))
    starts = sorted(set(invoice_starts))
    packages = []

    for idx, start in enumerate(starts):
        end = starts[idx + 1] if idx + 1 < len(starts) else len(reader.pages)

        writer = PdfWriter()
        for page_no in range(start, end):
            writer.add_page(reader.pages[page_no])

        temp_path = pdf_path.parent / f".invoice_package_{idx + 1}.pdf"
        with open(temp_path, "wb") as f:
            writer.write(f)

        packages.append((start, end, temp_path))

    return packages


def process_invoice_file(source_pdf: Path, root: Path, output_root: Path):
    page_texts = ocr_pdf(source_pdf)
    invoice_starts = find_invoice_starts(page_texts)

    if not invoice_starts:
        return [{
            "status": "REVIEW",
            "source_file": str(source_pdf.relative_to(root)),
            "invoice_number": "",
            "customer": "",
            "reason": "No invoice page detected",
        }]

    packages = split_invoice_packages(source_pdf, invoice_starts)
    results = []

    date_folder = date_folder_name_for(source_pdf, root)

    for start, end, package_path in packages:
        first_page_text = page_texts[start][1]

        invoice_no = extract_invoice_number(first_page_text)
        customer = extract_customer_name(first_page_text)

        try:
            if not invoice_no or not customer:
                results.append({
                    "status": "REVIEW",
                    "source_file": str(source_pdf.relative_to(root)),
                    "source_pages": f"{start + 1}-{end}",
                    "invoice_number": invoice_no or "",
                    "customer": customer or "",
                    "date_folder": date_folder,
                    "reason": "Could not confidently extract invoice number/customer",
                })
                continue

            customer = safe_name(customer)
            invoice_no = safe_name(invoice_no)

            date_folder = date_folder_name_for(source_pdf, root)

            # IMPORTANT:
            # The date folder comes from the SOURCE folder, not the invoice date.
            # This preserves the user's original filing date.
            destination_dir = output_root / customer / date_folder
            destination_dir.mkdir(parents=True, exist_ok=True)

            destination = destination_dir / f"{invoice_no}.pdf"

            if destination.exists():
                # Never silently overwrite.
                destination = destination_dir / f"{invoice_no}__DUPLICATE.pdf"

            shutil.copy2(package_path, destination)

            results.append({
                "status": "COPIED",
                "source_file": str(source_pdf.relative_to(root)),
                "source_pages": f"{start + 1}-{end}",
                "invoice_number": invoice_no,
                "customer": customer,
                "date_folder": date_folder,
                "destination": str(destination),
                "reason": "",
            })
        finally:
            if package_path.exists():
                package_path.unlink()

    return results


def date_folder_name_for(path: Path, root: Path) -> str:
    for parent in [path, *path.parents]:
        if DATE_FOLDER_RE.match(parent.name):
            return parent.name
        if parent == root:
            break
    return path.parent.parent.name


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


def process(root: Path, output_root: Path):
    root = resolve_input(root)
    results = []

    date_folders = find_date_folders(root)

    for date_folder in date_folders:
        pdfs = invoice_pdfs_in(date_folder)

        if pdfs is None:
            results.append({
                "status": "SKIPPED",
                "source_file": "",
                "date_folder": date_folder.name,
                "reason": "Invoice folder not found",
            })
            continue

        for pdf in pdfs:
            results.extend(process_invoice_file(pdf, root, output_root))

    return results


def zip_output_tree(output_root: Path) -> bytes:
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", compression=zipfile.ZIP_DEFLATED) as zf:
        for file in sorted(output_root.rglob("*")):
            if file.is_file():
                zf.write(file, file.relative_to(output_root).as_posix())
    return buffer.getvalue()


def process_uploaded_zip(zip_bytes: bytes, filename: str, work_dir: Path):
    safe_zip_name = Path(filename or "invoices.zip").name
    if not safe_zip_name.lower().endswith(".zip"):
        safe_zip_name += ".zip"
    work_dir.mkdir(parents=True, exist_ok=True)
    source = work_dir / safe_zip_name
    source.write_bytes(zip_bytes)
    output_root = work_dir / "sorted"
    output_root.mkdir(parents=True, exist_ok=True)
    results = process(source, output_root)
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
        "Extract date folders → OCR invoices → create a folder per customer → "
        "sort that day's invoices under the customer."
    )

    with st.sidebar:
        st.header("What this app does")
        st.markdown(
            """
            - Accepts a zip in the browser (no install for the client)
            - Or a local zip/folder on this computer
            - Finds nested `DD-MMM-YY` day folders
            - OCRs scanned PDFs
            - Creates a folder named after the customer
            - Sorts invoices into that day's subfolder
            - Splits multi-invoice PDFs
            - Flags uncertain files
            """
        )

    client_tab, local_tab = st.tabs(
        ["Client link (upload zip)", "This computer"]
    )

    with client_tab:
        st.caption(
            "The client only needs a browser. They upload the month zip and "
            "download a zip of customer folders."
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
                with st.spinner(
                    "OCR is reading the invoices. Large scanned zips can take several minutes..."
                ):
                    with tempfile.TemporaryDirectory() as td:
                        results, result_zip = process_uploaded_zip(
                            uploaded.getvalue(),
                            uploaded.name,
                            Path(td),
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
        st.caption("Use this only on a PC that already has Python and Tesseract.")
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
                    with st.spinner(
                        "OCR is reading the invoices. Scanned PDFs can take a little while..."
                    ):
                        results = process(source, output_root)
                    display_results(results)


if __name__ == "__main__":
    render_ui()
