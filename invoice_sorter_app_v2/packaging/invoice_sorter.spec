# -*- mode: python ; coding: utf-8 -*-
"""PyInstaller spec. Run from invoice_sorter_app_v2 via packaging/build_windows.bat."""

from pathlib import Path

spec_root = Path(SPECPATH).resolve().parent

a = Analysis(
    [str(spec_root / "desktop_app.py")],
    pathex=[str(spec_root)],
    binaries=[],
    datas=[
        (str(spec_root / "customers.txt"), "."),
    ],
    hiddenimports=[
        "rapidocr",
        "onnxruntime",
        "PySide6",
        "core.sorter",
        "ui.desktop",
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=["paddleocr", "paddle", "streamlit"],
    noarchive=False,
)
pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name="InvoiceSorter",
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=False,
    console=False,
)

coll = COLLECT(
    exe,
    a.binaries,
    a.datas,
    strip=False,
    upx=False,
    name="InvoiceSorter",
)
