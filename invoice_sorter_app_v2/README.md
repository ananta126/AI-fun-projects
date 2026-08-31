
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

## Windows prerequisite

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
