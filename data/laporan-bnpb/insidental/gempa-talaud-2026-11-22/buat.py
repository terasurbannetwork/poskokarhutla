"""Laporan Khusus Gempa M5,4 barat daya Melonguane (Kepulauan Talaud, Sulawesi Utara), 22 Nov 2026 14.54.39 WIB.

Gaya baku Nias 191126; mesin ../gempa_khusus.py. KONFIG dasar disusun generator/gempa_bot.py dari BMKG (gempaterkini,
gempadirasakan, diakses 23 Nov 2026), lalu ditambah laporan BPBD lewat Pusdalops BNPB (rekap WA Dalops 23/11/2026, entri 15 laphar
22/11/2026: dampak masih dalam pendataan). Laphar 22/11 belum terurai di harian/, jadi baris BPBD diisi di sini.

    python buat.py          # PPTX + PDF
    python buat.py --isi    # hanya slide isi
"""
import datetime as dt, os, sys

SINI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(SINI, '..'))
sys.path.insert(0, os.path.join(SINI, '..', '..', 'generator'))
isi = '--isi' in sys.argv
import gempa_bot   # noqa: E402

NAMA = 'Laporan Khusus Gempa M5,4 Kepulauan Talaud 221126'
c = gempa_bot.susun('talaud', dt.date(2026, 11, 23), SINI, NAMA)
c['sini'] = SINI

TALAUD = 'Kepulauan Talaud'
KONDISI = 'BPBD masih mendata dampak gempa; korban dan kerusakan belum dilaporkan.'
c['lapor'] = [(TALAUD, 'Kab. Kepulauan Talaud', '-', KONDISI)] + [r for r in c['lapor'] if r[0] != TALAUD]
c['dilapor'] = set(c['dilapor']) | {TALAUD}
c['bpbd'] = {TALAUD}
c['penanganan'] = [('BPBD Kab. Kepulauan Talaud', 'Mendata dampak gempa di wilayah kabupaten.')]
c['judul'] = ('Gempa [M5,4] mengguncang Kepulauan Talaud dan Sangihe;', c['judul'][1])   # Talaud terdekat, MMI model IV, dilapor BPBD
c['judul2'] ='penanganan BPBD saat ini berupa [pendataan dampak]'
c['judul_dokumen'] = 'Laporan Khusus Gempa Bumi M5,4 Kepulauan Talaud'
c['subjudul'] = 'Kabupaten Kepulauan Talaud dan Kepulauan Sangihe, Provinsi Sulawesi Utara'

if __name__ == '__main__':
    if isi:
        sys.argv.append('--isi')
    import gempa_khusus
    gempa_khusus.bangun(c)
