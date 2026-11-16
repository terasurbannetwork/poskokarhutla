#!/bin/sh
# bangun.sh : data, spek, lalu deck Karhutla Papsel sebelum dan sesudah kunjungan (Windows)
cd "$(dirname "$0")/../.." || exit 1
export PYTHONUTF8=1
export PATH=".venv/Scripts:$PATH"; export SOFFICE="/c/Program Files/LibreOffice/program/soffice.exe"
PY=".venv/Scripts/python.exe"
$PY assets/proyek-papsel/spek/bangun_spek_papsel.py || exit 1
$PY scripts/bank.py periksa assets/proyek-papsel/spek/papsel-kunjungan.json || exit 1
$PY scripts/winshim.py scripts/deck.py assets/proyek-papsel/spek/papsel-kunjungan.json "assets/proyek-papsel/out/Karhutla Papua Selatan Sebelum dan Sesudah Kunjungan Kepala BNPB 131126.pptx" ${PDF:---pdf} --akar assets/proyek-papsel
