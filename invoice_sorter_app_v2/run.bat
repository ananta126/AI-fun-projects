@echo off
cd /d "%~dp0"

rem Prefer Python 3.12. The python.org homepage installs 3.14, which cannot
rem install paddlepaddle. Do not use the Microsoft Store / pgAdmin Python.
set "PY312="
where py >nul 2>&1 && for /f "delims=" %%I in ('py -3.12 -c "import sys; print(sys.executable)" 2^>nul') do set "PY312=%%I"
if not defined PY312 (
  echo Python 3.12 was not found.
  echo Do not use the yellow "Download Python" button on python.org ^(that is 3.14^).
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
python -m pip install -r requirements.txt
python -m streamlit run app.py
