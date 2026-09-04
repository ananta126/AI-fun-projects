@echo off
cd /d "%~dp0"

rem Desktop app (no Streamlit / no browser).
rem Prefer Python 3.12. Do not use the python.org yellow button (that is 3.14).
set "PY312="
where py >nul 2>&1 && for /f "delims=" %%I in ('py -3.12 -c "import sys; print(sys.executable)" 2^>nul') do set "PY312=%%I"
if not defined PY312 (
  echo Python 3.12 was not found.
  echo Install 3.12 from:
  echo   https://www.python.org/ftp/python/3.12.10/python-3.12.10-amd64.exe
  echo Then close this window and run run.bat again.
  pause
  exit /b 1
)

if not exist ".venv\Scripts\python.exe" (
  "%PY312%" -m venv .venv
)

call .venv\Scripts\activate.bat
python -m pip install -r requirements-desktop.txt
python desktop_app.py
