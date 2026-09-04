
# Invoice Sorter v2

This version was designed after inspecting the supplied scanned invoice PDFs.

The files are image PDFs, so normal PDF text extraction returns no text.
The app therefore uses OCR.

Each source PDF is treated as **one complete invoice package**. Only **page 1**
is read (GST header). The rest of the pages are copied with the file and are
not OCR'd. The app does not split multi-invoice PDFs.

Engine code lives in `core/sorter.py`. Streamlit UI is `app.py`. The Windows
desktop UI is `desktop_app.py` / `ui/desktop.py`. Timing helper:
`python tools/benchmark.py <input> <output>`.

## Output logic

Source:

Input/
  01-Sep-26/
    Invoice/
      random.pdf

Output:

Output/
  CUSTOMER NAME/
    YYYY/
      01-Sep-26/
        INVOICE_NUMBER.pdf

`YYYY` is the **printed invoice date** on page 1, not the source folder year.
The source day folder name is kept as-is (`01-Sep-26`, not rewritten). If the
printed date cannot be read, the file is `REVIEW` and is not copied.

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

Use **Python 3.12** (`py -3.12`), not 3.14. PaddlePaddle has no 3.14 wheel, and `pip install -r requirements.txt` used to fail before Streamlit installed.

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

The app uses **RapidOCR on page 1 only** (GST header band). Supporting pages are copied, not scanned. PaddleOCR is off unless you set `INVOICE_SORTER_USE_PADDLE=1`.

The printed GST **Invoice No.** (for example `20242500788`) is taken from the page text, not from scanner names like `3345.pdf`.

Folder names come from `customers.txt` (the billed-to list in Summary.xlsx). OCR is matched to that list, so Rapid Machining invoices file as `Rapid Machining Tech.Pvt.Ltd.` rather than OCR spellings.

## Install and run

```bat
py -3.12 -m venv .venv
.venv\Scripts\activate
python -m pip install -r requirements.txt
python -m streamlit run app.py
```

If Windows says `'streamlit' is not recognized`, keep using `python -m streamlit run app.py` (not `streamlit run app.py`). Or double-click `run.bat`.

Desktop (no browser):

```bat
python -m pip install -r requirements-desktop.txt
python desktop_app.py
```

A Windows `.exe` needs PyInstaller on Windows: `packaging\build_windows.bat`.
A Linux agent can only produce a Linux onedir, not `InvoiceSorter.exe`.

## Tests

The original sample PDF (`3344.pdf`) is a local file and is not in this repo.
Tests use one invoice PDF with supporting pages attached; only page 1 is read.

```bash
pip install -r requirements.txt
pytest tests -q
```

OCR tests need RapidOCR from `requirements.txt`. PaddleOCR is optional.

## Important

Before running this against a large production folder, test on a copy of the
data. The app is intentionally conservative: if it cannot extract a customer
invoice number, or printed date, it reports REVIEW rather than guessing.

PIS processing is not included yet.
