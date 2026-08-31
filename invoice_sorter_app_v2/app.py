
import re
import shutil
from pathlib import Path
from datetime import datetime

import fitz  # PyMuPDF
import streamlit as st
import pytesseract
from PIL import Image
from pypdf import PdfReader, PdfWriter


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
            return re.sub(r"\s+", " ", match.group(1)).strip(" ,.-")

    # Fallback specifically useful for OCR of this invoice family.
    match = re.search(r"(PORITE\s+INDIA\s+PVT\.?\s*LTD\.?)", text, flags=re.I)
    if match:
        return re.sub(r"\s+", " ", match.group(1)).strip()

    return None


def looks_like_invoice_page(text: str):
    # The supplied PDF has clear invoice pages containing these words.
    return (
        re.search(r"\bINVOICE\b", text, re.I) is not None
        and re.search(r"Invoice\s*No", text, re.I) is not None
    )


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

    date_folder = source_pdf.parent.parent.name
    parsed_date = parse_date_folder(date_folder)

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


def process(root: Path, output_root: Path):
    results = []

    date_folders = sorted(
        p for p in root.iterdir()
        if p.is_dir() and DATE_FOLDER_RE.match(p.name)
    )

    for date_folder in date_folders:
        invoice_dir = date_folder / "Invoice"

        if not invoice_dir.is_dir():
            results.append({
                "status": "SKIPPED",
                "source_file": "",
                "date_folder": date_folder.name,
                "reason": "Invoice folder not found",
            })
            continue

        pdfs = sorted(invoice_dir.rglob("*.pdf"))

        for pdf in pdfs:
            results.extend(process_invoice_file(pdf, root, output_root))

    return results


def render_ui():
    st.set_page_config(page_title="Invoice Sorter", page_icon="📁", layout="wide")

    st.title("📁 Invoice Sorter")
    st.write(
        "Scanned invoice PDFs → OCR → customer + invoice number → "
        "Customer / source-date / invoice-number.pdf"
    )

    st.info(
        "The supplied sample is a scanned PDF, so this version uses OCR. "
        "It also handles one PDF containing multiple invoice packages."
    )

    with st.sidebar:
        st.header("Folders")
        input_dir = st.text_input(
            "Input root",
            placeholder=r"C:\Invoices\Input"
        )
        output_dir = st.text_input(
            "Output root",
            placeholder=r"C:\Invoices\Output"
        )

        st.header("What this version does")
        st.markdown(
            """
            - Finds `DD-MMM-YY` folders
            - Opens each `Invoice` folder
            - OCRs scanned PDFs
            - Finds invoice pages
            - Extracts customer name
            - Extracts invoice number
            - Splits multi-invoice PDFs
            - Preserves the original date folder
            - Flags uncertain files
            """
        )

    st.markdown("### Expected input")

    st.code(
    r"""
    Input/
    ├── 25-Jun-26/
    │   ├── Invoice/
    │   │   ├── invoice_file_1.pdf
    │   │   └── invoice_file_2.pdf
    │   └── PIS/
    ├── 26-Jun-26/
    │   ├── Invoice/
    │   └── PIS/
    └── 27-Jun-26/
        ├── Invoice/
        └── PIS/
    """, language="text")

    st.markdown("### Output")

    st.code(
    r"""
    Output/
    ├── PORITE INDIA PVT.LTD./
    │   ├── 25-Jun-26/
    │   │   ├── 20242500788.pdf
    │   │   └── 20242500752.pdf
    │   └── 26-Jun-26/
    │       └── 20242500686.pdf
    └── Another Customer/
        └── 27-Jun-26/
            └── 20242500XXX.pdf
    """, language="text")

    if st.button("🚀 Process invoices", type="primary"):
        if not input_dir or not output_dir:
            st.error("Enter both Input root and Output root.")
        elif not Path(input_dir).is_dir():
            st.error(f"Input folder does not exist: {input_dir}")
        else:
            root = Path(input_dir)
            output_root = Path(output_dir)
            output_root.mkdir(parents=True, exist_ok=True)

            with st.spinner(
                "OCR is reading the invoices. Scanned PDFs can take a little while..."
            ):
                results = process(root, output_root)

            if not results:
                st.warning("No matching date folders / invoice PDFs were found.")
            else:
                copied = sum(r["status"] == "COPIED" for r in results)
                review = sum(r["status"] == "REVIEW" for r in results)
                skipped = sum(r["status"] == "SKIPPED" for r in results)

                c1, c2, c3 = st.columns(3)
                c1.metric("Invoices copied", copied)
                c2.metric("Needs review", review)
                c3.metric("Skipped", skipped)

                st.dataframe(results, use_container_width=True)

                if review:
                    st.warning(
                        "Some files need review. Nothing uncertain was silently filed."
                    )


if __name__ == "__main__":
    render_ui()
