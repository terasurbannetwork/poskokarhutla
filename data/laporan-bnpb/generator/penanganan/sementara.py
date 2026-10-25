"""Tandai angka hari terakhir sebagai sementara di catatan kaki slide peta dan slide tabel. Pakai: python3 -I sementara.py <masuk> <keluar> "<kalimat>" """
import re, sys, zipfile
MASUK, KELUAR, KAL = sys.argv[1], sys.argv[2], sys.argv[3]
POLA = re.compile(rb'(<a:t>\*Data berdasarkan[^<]*?)(</a:t>)')   # kalimat catatan kaki bisa berubah; awalannya yang dicari
zi = zipfile.ZipFile(MASUK); zo = zipfile.ZipFile(KELUAR, 'w', zipfile.ZIP_DEFLATED); n = 0
for it in zi.infolist():
    d = zi.read(it.filename)
    if it.filename.startswith('ppt/slides/slide') and it.filename.endswith('.xml') and POLA.search(d):
        assert len(POLA.findall(d)) == 1, it.filename
        d = POLA.sub(rb'\1 ' + KAL.encode() + rb'\2', d); n += 1
    zo.writestr(it, d)
zo.close(); assert n == 2, n; print('ok', n)
