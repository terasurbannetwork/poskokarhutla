#!/bin/sh
# bangun-wilayah.sh <kode> : deck karhutla sebelum dan sesudah kunjungan Kepala BNPB per wilayah (Windows)
cd "$(dirname "$0")/../.." || exit 1
export PYTHONUTF8=1
export PATH=".venv/Scripts:$PATH"; export SOFFICE="/c/Program Files/LibreOffice/program/soffice.exe"
PY=".venv/Scripts/python.exe"
K="$1"
$PY assets/proyek-papsel/spek/bangun_spek_wilayah.py "$K" || exit 1
NAMA=$($PY -c "import sys; sys.path.insert(0,'assets/proyek-papsel/spek'); from data_wilayah import WILAYAH; print(WILAYAH['$K']['nama'])")
$PY scripts/bank.py periksa "assets/proyek-papsel/spek/$K-kunjungan.json" || exit 1
$PY scripts/winshim.py scripts/deck.py "assets/proyek-papsel/spek/$K-kunjungan.json" "assets/proyek-papsel/out/Pengaruh Kunjungan Kepala BNPB terhadap Karhutla $NAMA 131126.pptx" ${PDF:---pdf} --akar assets/proyek-papsel
