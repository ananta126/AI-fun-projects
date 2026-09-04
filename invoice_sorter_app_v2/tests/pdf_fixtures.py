"""Build sample PDFs: one invoice per file, with supporting pages after page 1."""

from __future__ import annotations

import io
from pathlib import Path

import fitz
from PIL import Image, ImageDraw, ImageFont


SAMPLE_INVOICES = [
    {
        "invoice_no": "20242500788",
        "date": "29/04/2024",
        "customer": "PORITE INDIA PVT.LTD.",
        "supporting_pages": 2,
    },
    {
        "invoice_no": "20242500752",
        "date": "28/04/2024",
        "customer": "PORITE INDIA PVT.LTD.",
        "supporting_pages": 4,
    },
    {
        "invoice_no": "20242500686",
        "date": "27/04/2024",
        "customer": "PORITE INDIA PVT.LTD.",
        "supporting_pages": 4,
    },
]


def invoice_page_text(invoice_no: str, invoice_date: str, customer: str) -> str:
    return (
        "TAX INVOICE\n"
        f"Invoice No. & Date : {invoice_no} - {invoice_date}\n"
        "Details Of Recipient :(Billed to)\n"
        f"{customer},\n"
        "GSTIN : 27AABCP1234A1Z5\n"
    )


def supporting_page_text(label: str) -> str:
    return (
        f"{label}\n"
        "Original For Consignee\n"
        "This is a delivery challan / receipt page.\n"
        "Total Invoice Value (In Word) Indian Rupees One Lakh\n"
        "Outward No: LL2-4Y Invoice No: ________\n"
        "It should stay attached to the preceding invoice package.\n"
    )


def _add_text_page(doc: fitz.Document, text: str) -> None:
    page = doc.new_page(width=595, height=842)
    page.insert_text((72, 72), text, fontsize=11)


def write_text_pdf(path: Path, invoices: list[dict] | None = None) -> Path:
    invoices = invoices or SAMPLE_INVOICES
    doc = fitz.open()
    for invoice in invoices:
        _add_text_page(
            doc,
            invoice_page_text(
                invoice["invoice_no"],
                invoice["date"],
                invoice["customer"],
            ),
        )
        for extra in range(invoice["supporting_pages"]):
            _add_text_page(
                doc,
                supporting_page_text(f"DELIVERY CHALLAN {extra + 1}"),
            )
    path.parent.mkdir(parents=True, exist_ok=True)
    doc.save(path)
    doc.close()
    return path


def _render_text_image(text: str, size=(1240, 1754)) -> Image.Image:
    image = Image.new("RGB", size, "white")
    draw = ImageDraw.Draw(image)
    try:
        font = ImageFont.truetype("DejaVuSans.ttf", 28)
    except OSError:
        font = ImageFont.load_default()
    y = 80
    for line in text.splitlines():
        draw.text((80, y), line, fill="black", font=font)
        y += 42
    return image


def write_scanned_pdf(path: Path, invoices: list[dict] | None = None) -> Path:
    invoices = invoices or SAMPLE_INVOICES
    doc = fitz.open()
    for invoice in invoices:
        pages = [
            invoice_page_text(
                invoice["invoice_no"],
                invoice["date"],
                invoice["customer"],
            )
        ]
        pages.extend(
            supporting_page_text(f"DELIVERY CHALLAN {extra + 1}")
            for extra in range(invoice["supporting_pages"])
        )
        for text in pages:
            image = _render_text_image(text)
            page = doc.new_page(width=595, height=842)
            buf = io.BytesIO()
            image.save(buf, format="PNG")
            page.insert_image(page.rect, stream=buf.getvalue())
    path.parent.mkdir(parents=True, exist_ok=True)
    doc.save(path)
    doc.close()
    return path
