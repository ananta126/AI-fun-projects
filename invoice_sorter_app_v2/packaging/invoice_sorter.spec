# -*- mode: python ; coding: utf-8 -*-
"""PyInstaller spec. Run from invoice_sorter_app_v2 via packaging/build_windows.bat."""

from pathlib import Path

from PyInstaller.utils.hooks import collect_all, collect_data_files

spec_root = Path(SPECPATH).resolve().parent

datas = [
    (str(spec_root / "customers.txt"), "."),
]
binaries = []
hiddenimports = [
    "core.sorter",
    "ui.desktop",
    "fitz",
    "pymupdf",
    "PIL",
    "numpy",
    "cv2",
    "pyclipper",
    "shapely",
    "yaml",
]

for pkg in ("rapidocr", "onnxruntime"):
    pkg_datas, pkg_binaries, pkg_hidden = collect_all(pkg)
    datas += pkg_datas
    binaries += pkg_binaries
    hiddenimports += pkg_hidden

datas += collect_data_files("rapidocr")

a = Analysis(
    [str(spec_root / "desktop_app.py")],
    pathex=[str(spec_root)],
    binaries=binaries,
    datas=datas,
    hiddenimports=hiddenimports,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=["paddleocr", "paddle", "streamlit", "pytest"],
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
