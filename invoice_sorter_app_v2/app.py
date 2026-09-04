from pathlib import Path
from tempfile import TemporaryDirectory

import streamlit as st

from core.sorter import (
    extract_customer_name,
    extract_invoice_date,
    extract_invoice_number,
    looks_like_invoice_page,
    ocr_pdf,
    parse_date_folder,
    process,
    process_invoice_file,
    process_uploaded_zip,
    retry_ocr_without_invoice_starts,
    zip_output_tree,
)

# Re-exported for existing tests and scripts.
__all__ = [
    "extract_customer_name",
    "extract_invoice_date",
    "extract_invoice_number",
    "looks_like_invoice_page",
    "ocr_pdf",
    "parse_date_folder",
    "process",
    "process_invoice_file",
    "process_uploaded_zip",
    "retry_ocr_without_invoice_starts",
    "zip_output_tree",
]


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
        "Read page 1 → identify invoice, billed-to customer, and printed date → "
        "copy the complete PDF into Customer / year / source-day."
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
            - Creates a folder from the billed-to name in customers.txt
            - Year folder is the **printed invoice date**, not the source folder year
            - Keeps the source day folder name as-is under that year
            - Flags uncertain files (including missing printed dates)
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

                with TemporaryDirectory() as td:
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
└── Porite India Pvt. Ltd/
    └── 2024/
        ├── 25-Jun-26/
        │   └── 20242500788.pdf
        └── 26-Jun-26/
            └── 20242500686.pdf
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
