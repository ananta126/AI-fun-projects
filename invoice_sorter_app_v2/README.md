
# Invoice Sorter v2

This version was designed after inspecting the supplied scanned invoice PDFs.

The files are image PDFs, so normal PDF text extraction returns no text.
The app therefore uses OCR.

Each source PDF is treated as **one complete invoice package**. Only **page 1**
is read (GST header). The rest of the pages are copied with the file and are
not OCR'd. The app does not split multi-invoice PDFs.

This is a **desktop app**. The Windows build is `InvoiceSorter.exe` (no browser,
no Streamlit). Engine: `core/sorter.py`. Desktop UI: `desktop_app.py` /
`ui/desktop.py`. Streamlit `app.py` is optional and not required to sort files.

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

## Windows desktop (recommended)

Give the client **only** `InvoiceSorter-windows.zip` from GitHub Actions
(**about 180 MB**). Do not zip the GitHub repo, `node_modules`, a Python
`.venv`, or the invoice PDFs into the same archive (that becomes ~1–2 GB
and still requires Python).

1. Download `InvoiceSorter-windows.zip` from the GitHub Actions run **Windows EXE**
   (artifact `InvoiceSorter-windows`).
2. Unzip. Open the `InvoiceSorter` folder.
3. Double-click `InvoiceSorter.exe` (or `Run Invoice Sorter.bat`).
4. Choose the month zip/folder of invoices on that PC, choose output, Sort.

The client must **not** install Python and must **not** run `run.bat` or `.py` files.

Keep the whole unzipped folder together (OCR models sit next to the exe). Windows
may show a SmartScreen prompt for an unsigned build; choose Run anyway.

To rebuild the exe on a Windows PC with Python 3.12: `packaging\build_windows.bat`.

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

## Install and run from source (no exe yet)

Double-click `run.bat`, or:

```bat
py -3.12 -m venv .venv
.venv\Scripts\activate
python -m pip install -r requirements-desktop.txt
python desktop_app.py
```

Streamlit is optional (`python -m pip install -r requirements.txt` then
`python -m streamlit run app.py`). Do not use Streamlit if you want the desktop window.

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
