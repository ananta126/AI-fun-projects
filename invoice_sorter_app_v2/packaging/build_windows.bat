@echo off
cd /d "%~dp0\.."

rem Windows EXE build. Requires Python 3.12 (not 3.14) and PyInstaller.
set "PY312="
where py >nul 2>&1 && for /f "delims=" %%I in ('py -3.12 -c "import sys; print(sys.executable)" 2^>nul') do set "PY312=%%I"
if not defined PY312 (
  echo Python 3.12 was not found. Install python-3.12.10-amd64.exe, then retry.
  pause
  exit /b 1
)

if not exist ".venv\Scripts\python.exe" (
  "%PY312%" -m venv .venv
)

call .venv\Scripts\activate.bat
python -m pip install -r requirements.txt -r requirements-desktop.txt
python -m pip install pyinstaller
python -m PyInstaller --noconfirm packaging\invoice_sorter.spec

echo.
echo Build finished. On Windows the EXE is dist\InvoiceSorter\InvoiceSorter.exe
echo A Linux agent produces a Linux onedir here, not a .exe.
pause
