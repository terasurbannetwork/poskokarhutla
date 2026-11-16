#!/bin/sh
# bangun-rev2.sh : revisi 3 (judul Pengaruh Kunjungan) deck Karhutla Papsel sebelum dan sesudah kunjungan (Windows)
cd "$(dirname "$0")/../.." || exit 1
export PYTHONUTF8=1
export PATH=".venv/Scripts:$PATH"; export SOFFICE="/c/Program Files/LibreOffice/program/soffice.exe"
PY=".venv/Scripts/python.exe"
$PY assets/proyek-papsel/spek/data_papsel.py > /dev/null || exit 1
$PY assets/proyek-papsel/spek/bangun_spek_papsel_rev3.py || exit 1
$PY scripts/bank.py periksa assets/proyek-papsel/spek/papsel-kunjungan-rev3.json || exit 1
$PY scripts/winshim.py scripts/deck.py assets/proyek-papsel/spek/papsel-kunjungan-rev3.json "assets/proyek-papsel/out/Pengaruh Kunjungan Kepala BNPB terhadap Karhutla Papua Selatan 131126 (rev3).pptx" ${PDF:---pdf} --akar assets/proyek-papsel
