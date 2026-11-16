#!/bin/sh
# bangun-nasional.sh : deck karhutla nasional sebelum dan sesudah pelantikan Kepala BNPB (Windows)
cd "$(dirname "$0")/../.." || exit 1
export PYTHONUTF8=1
export PATH=".venv/Scripts:$PATH"; export SOFFICE="/c/Program Files/LibreOffice/program/soffice.exe"
PY=".venv/Scripts/python.exe"
$PY assets/proyek-papsel/spek/bangun_spek_nasional.py || exit 1
$PY scripts/bank.py periksa assets/proyek-papsel/spek/nasional-pelantikan.json || exit 1
$PY scripts/winshim.py scripts/deck.py assets/proyek-papsel/spek/nasional-pelantikan.json "assets/proyek-papsel/out/Karhutla Nasional Sebelum dan Sesudah Pelantikan Kepala BNPB 131126.pptx" ${PDF:---pdf} --akar assets/proyek-papsel
