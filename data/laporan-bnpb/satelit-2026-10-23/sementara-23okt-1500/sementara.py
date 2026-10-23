"""Tandai angka hari terakhir sebagai sementara di catatan kaki slide peta dan slide tabel. Pakai: python3 -I sementara.py <masuk> <keluar> "<kalimat>" """
import sys, zipfile
MASUK, KELUAR, KAL = sys.argv[1], sys.argv[2], sys.argv[3]
LAMA = '<a:t>*Data berdasarkan Geographic Information System (GIS) dengan satelit NASA (FIRMS: VIIRS dan MODIS).</a:t>'
zi = zipfile.ZipFile(MASUK); zo = zipfile.ZipFile(KELUAR, 'w', zipfile.ZIP_DEFLATED); n = 0
for it in zi.infolist():
    d = zi.read(it.filename)
    if it.filename.startswith('ppt/slides/slide') and it.filename.endswith('.xml') and LAMA.encode() in d:
        assert d.count(LAMA.encode()) == 1; d = d.replace(LAMA.encode(), LAMA.replace(').</a:t>', f'). {KAL}</a:t>').encode()); n += 1
    zo.writestr(it, d)
zo.close(); assert n == 2, n; print('ok', n)
