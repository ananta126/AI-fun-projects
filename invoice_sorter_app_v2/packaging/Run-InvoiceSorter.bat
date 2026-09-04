@echo off
cd /d "%~dp0"
if not exist "InvoiceSorter.exe" (
  echo InvoiceSorter.exe was not found in this folder.
  echo Unzip the FULL InvoiceSorter folder and double-click InvoiceSorter.exe.
  echo Do not install Python. Do not run .py files.
  pause
  exit /b 1
)
start "" "%~dp0InvoiceSorter.exe"
