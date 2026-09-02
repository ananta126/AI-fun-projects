
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

The client does **not** need Python. You host the app; they use a browser.

1. You start the app on a machine with Python (`pip install -r requirements.txt`).
2. Send them the URL.
3. They open **Client link (upload zip)**, upload `June 26-....zip`, wait for OCR, then download `sorted_invoices.zip`.

### Option A — you run it, they open the link on the same network

```bash
streamlit run app.py --server.address 0.0.0.0
```

Share `http://YOUR-PC-IP:8501`. Keep the PC on while they use it. This is only for a trusted local network.

### Option B — Streamlit Community Cloud (public URL)

Deploy `invoice_sorter_app_v2/app.py` from GitHub. OCR uses **PaddleOCR** from `requirements.txt`. First run downloads PP-OCR models.

The client then only needs the Streamlit URL. Invoice PDFs will pass through that host, so use a private app if the documents are confidential.

### Option C — you process the zip and send results back

If you cannot host a URL, have the client send the month zip. You run the sorter locally and return `sorted_invoices.zip`. They never install anything.

Do not email a Python installer unless they have IT support. OCR models come from pip.

## Windows / local OCR

Use **Python 3.11 or 3.12**, not 3.14. PaddlePaddle has no 3.14 wheel, and `pip install -r requirements.txt` used to fail before Streamlit installed.

**Do not click the yellow “Download Python” button on python.org.** That always installs the newest release (currently 3.14). Use this 64-bit installer instead:

https://www.python.org/ftp/python/3.12.10/python-3.12.10-amd64.exe

You can keep 3.14 installed. After 3.12 is present, always create the venv with:

```bat
py -3.12 -m venv .venv
```

`python` on PATH will still be 3.14 if that was installed last. That is expected. Use `py -3.12`, not `python`.

Default install uses **RapidOCR** (works on more Python versions):

```bash
python -m pip install -r requirements.txt
```

On Python 3.11/3.12 you can also install PaddleOCR:

```bash
python -m pip install -r requirements-paddle.txt
```

The app uses **RapidOCR on the page header only**. Delivery challan pages are not fully OCR'd. PaddleOCR is off unless you set `INVOICE_SORTER_USE_PADDLE=1`.

The printed GST **Invoice No.** (for example `20242500788`) is taken from the page text, not from scanner names like `3345.pdf`.

## Install and run

```bat
py -3.12 -m venv .venv
.venv\Scripts\activate
python -m pip install -r requirements.txt
python -m streamlit run app.py
```

If Windows says `'streamlit' is not recognized`, keep using `python -m streamlit run app.py` (not `streamlit run app.py`). Or double-click `run.bat`.

## Tests

The original sample PDF (`3344.pdf`) is a local file and is not in this repo.
Tests reconstruct that 13-page layout (invoice starts on pages 1, 4, and 9).

```bash
pip install -r requirements.txt
pytest tests -q
```

OCR tests need RapidOCR from `requirements.txt`. PaddleOCR is optional.

## Important

Before running this against a large production folder, test on a copy of the
data. The app is intentionally conservative: if it cannot extract a customer
or invoice number, it reports REVIEW rather than guessing.

PIS processing is not included yet.
