
# Invoice Sorter v2

This version was designed after inspecting the supplied 13-page sample invoice PDF.

The sample is a scanned/image PDF, so normal PDF text extraction returns no text.
The app therefore uses OCR.

The sample also contains multiple invoice packages in one PDF:
- invoice starts on page 1
- invoice starts on page 4
- invoice starts on page 9

The app detects invoice pages and splits the source PDF into:
- pages 1-3
- pages 4-8
- pages 9-13

Each package keeps its supporting pages.

## Output logic

Source:

Input/
  25-Jun-26/
    Invoice/
      random.pdf

Output:

Output/
  CUSTOMER NAME/
    25-Jun-26/
      INVOICE_NUMBER.pdf

The date folder is taken from the source day folder (`25-Jun-26`), not from
the invoice date printed inside the PDF.

You can point the app at:

- the extracted `June 26` folder, or
- the zip (`June 26-20260831T053601Z-001.zip`)

Nested date folders are found automatically. PIS folders are left untouched.

## Share with a client (no install on their PC)

The client does **not** need Python or Tesseract. You host the app; they use a browser.

1. You start the app on a machine that has Tesseract (your PC, a server, or Streamlit Community Cloud).
2. Send them the URL.
3. They open **Client link (upload zip)**, upload `June 26-....zip`, wait for OCR, then download `sorted_invoices.zip`.

### Option A — you run it, they open the link on the same network

```bash
streamlit run app.py --server.address 0.0.0.0
```

Share `http://YOUR-PC-IP:8501`. Keep the PC on while they use it. This is only for a trusted local network.

### Option B — Streamlit Community Cloud (public URL)

Deploy `invoice_sorter_app_v2/app.py` from GitHub. Add a root `packages.txt` containing:

```
tesseract-ocr
tesseract-ocr-eng
```

The client then only needs the Streamlit URL. Invoice PDFs will pass through that host, so use a private app if the documents are confidential.

### Option C — you process the zip and send results back

If you cannot host a URL, have the client send the month zip. You run the sorter locally and return `sorted_invoices.zip`. They never install anything.

Do not email a Python installer and ask the client to set up Tesseract unless they have IT support.

## Windows prerequisite (only for local / this-computer mode)


Tesseract OCR must be installed separately.

Install Tesseract OCR for Windows, then make sure `tesseract.exe` is on PATH.

If it is not on PATH, add this near the top of app.py:

```python
pytesseract.pytesseract.tesseract_cmd = r"C:\Program Files\Tesseract-OCR\tesseract.exe"
```

## Install and run

```bash
python -m venv .venv
.venv\Scripts\activate

pip install -r requirements.txt

streamlit run app.py
```

## Tests

The original sample PDF (`3344.pdf`) is a local file and is not in this repo.
Tests reconstruct that 13-page layout (invoice starts on pages 1, 4, and 9).

```bash
pip install -r requirements.txt
pytest tests -q
```

OCR tests are skipped unless Tesseract is on PATH.

## Important

Before running this against a large production folder, test on a copy of the
data. The app is intentionally conservative: if it cannot extract a customer
or invoice number, it reports REVIEW rather than guessing.

PIS processing is not included yet.
