@echo off
cd /d "%~dp0"

rem Packed desktop app: never ask for Python.
if exist "InvoiceSorter.exe" (
  start "" "%~dp0InvoiceSorter.exe"
  exit /b 0
)
if exist "dist\InvoiceSorter\InvoiceSorter.exe" (
  start "" "%~dp0dist\InvoiceSorter\InvoiceSorter.exe"
  exit /b 0
)

echo This folder is SOURCE CODE, not the Windows app.
echo Send the user InvoiceSorter.exe from GitHub Actions artifact
echo InvoiceSorter-windows (about 180 MB), not the Git repo zip.
echo.
echo To run from source you need Python 3.12 AND pip packages.
echo Python from the Microsoft Store / python.org yellow button will fail.
echo.

set "PY312="
where py >nul 2>&1 && for /f "delims=" %%I in ('py -3.12 -c "import sys; print(sys.executable)" 2^>nul') do set "PY312=%%I"
if not defined PY312 (
  echo Python 3.12 was not found. For source runs install:
  echo   https://www.python.org/ftp/python/3.12.10/python-3.12.10-amd64.exe
  echo Check "Add python.exe to PATH". Then run this file again.
  echo Prefer the packed InvoiceSorter.exe so the client needs no Python.
  pause
  exit /b 1
)

if not exist ".venv\Scripts\python.exe" (
  "%PY312%" -m venv .venv
)

call .venv\Scripts\activate.bat
python -m pip install -r requirements-desktop.txt
python desktop_app.py
