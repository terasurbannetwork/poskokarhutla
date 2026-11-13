"""Slide "Hasil Pemadaman Satgas" (native deck.py) dari teks laporan satgas 3 Nov 2026 yang ditempel pemilik (kegiatan 2 Nov 2026):
bagian A.2 (target, padam, sisa per provinsi), B.1.c dan B.2.c (padam darat, padam water bombing), C (hambatan dan upaya).
Pemeriksa bersih 2 Nov: deck tidak memuat hasil pemadaman satgas (padam ±115,19 ha, sisa ±489,48 ha pada 85 FS).
Menulis CSV ke data/lap dan token ke data/angka.json akar proyek-bnpb skill, mengembalikan dict slide untuk bingkai.py."""
import csv, json, os

SKILL = os.environ.get('DECK_BNPB', os.path.expanduser('~/.claude/skills/ppt-konsultan/bnpb'))
AKAR = os.path.join(SKILL, 'assets', 'proyek-bnpb')
PUS = 'bnpb-satgas-karhutla-2026-11-02'
SO = 'Laporan Upaya Pemadaman Satgas Karhutla, 3 Nov 2026 (kegiatan 2 Nov 2026)'
CSV = 'data/lap/penanganan-031126-satgas.csv'
# provinsi, FS target, target ha, padam darat ha, padam udara (WB) ha, FS padam, padam ha, FS sisa, sisa ha
BARIS = [('Kalimantan Tengah', 83, 502.65, 36.82, 17.00, 18, 53.82, 65, 448.83),
         ('Kalimantan Selatan', 17, 26.90, 2.20, 12.50, 9, 14.70, 8, 12.20),
         ('Sumatera Selatan', 23, 48.00, 26.00, 12.00, 19, 38.00, 4, 10.00),
         ('Jambi', 19, 29.50, 20.50, 1.00, 14, 21.50, 5, 8.00),
         ('Kalimantan Barat', 5, 13.80, 3.30, 10.00, 4, 13.30, 1, 0.50),
         ('Riau', 1, 1.25, 0.25, 0.00, 0, 0.25, 1, 1.00)]   # Riau: titik belum padam seluruhnya, jadi 0 FS padam (rekap 64 FS)
KOL = ['provinsi', 'fs_target', 'target', 'darat', 'udara', 'fs_padam', 'padam', 'fs_sisa', 'sisa']
r2 = lambda v: round(v + 1e-9, 2)
for b in BARIS:   # padam = darat + udara; target = padam + sisa (FS dan ha)
    assert r2(b[3] + b[4]) == b[6] and r2(b[6] + b[8]) == b[2] and b[5] + b[7] == b[1], b
JUM = {k: r2(sum(b[i] for b in BARIS)) for i, k in enumerate(KOL) if i}
assert (JUM['fs_target'], JUM['target'], JUM['darat'], JUM['udara'], JUM['fs_padam'], JUM['padam'], JUM['fs_sisa'], JUM['sisa']) == \
       (148, 622.10, 89.07, 52.50, 64, 141.57, 84, 480.53), JUM   # rekap teks satgas


def tulis():
    os.makedirs(os.path.join(AKAR, 'data', 'lap'), exist_ok=True)
    with open(os.path.join(AKAR, CSV), 'w', newline='', encoding='utf-8') as f:
        w = csv.writer(f); w.writerow(KOL); w.writerows(BARIS)
    pp = os.path.join(AKAR, 'pustaka.json'); pus = json.load(open(pp, encoding='utf-8'))
    if not any(x.get('id') == PUS for x in pus):
        pus.append({'id': PUS, 'type': 'report', 'author': [{'literal': 'Satuan Tugas Pengendalian Karhutla'}],
                    'issued': {'date-parts': [[2026, 11, 3]]}, 'verifikasi': 'primer',
                    'title': 'Laporan Upaya Pemadaman Karhutla oleh Satgas di Enam Provinsi, 3 November 2026 (kegiatan 2 November 2026)'})
        json.dump(pus, open(pp, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    rp = os.path.join(AKAR, 'data', 'angka.json'); reg = json.load(open(rp, encoding='utf-8'))
    ent = lambda v, s: {'nilai': v, 'satuan': s, 'pustaka': PUS, 'sumber': SO, 'keyakinan': 'resmi'}
    reg['angka'].update({'pen031126.padam': ent(JUM['padam'], 'ha'), 'pen031126.target': ent(JUM['target'], 'ha'),
                         'pen031126.fs_sisa': ent(JUM['fs_sisa'], 'FS'), 'pen031126.sisa.kalteng': ent(BARIS[0][8], 'ha')})
    json.dump(reg, open(rp, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)


def slide(bagian):
    tulis()
    t = lambda k, o='': '{{angka:%s%s}}' % (k, o)
    ha = lambda n, k, g: {'nama': n, 'grup': g, 'kepala': k, 'fmt': '2'}
    fs = lambda n, g: {'nama': n, 'grup': g, 'kepala': 'FS', 'fmt': '0'}
    return {
        # pemeriksa bersih 2 Nov: judul slide operasi pola Penanganan "<Topik> per Tanggal ..." satu baris (10b.06); angka di kepala panel
        'jenis': 'tabel-peringkat', 'jenis_slide': 'tabel', 'judul_bentuk': 'deskriptif', 'bagian': bagian, 'cut_off': False,
        'pesan': 'Hasil pemadaman satgas 2 November',
        'judul': 'Hasil Pemadaman Satgas per Tanggal 3 November 2026',   # tanggal laporan, sama dengan slide operasi (aturan pemilik 1 Nov)
        'tabel': {'judul_panel': (f'Padam ±{t("pen031126.padam", "|fmt=2")} ha dari target ±{t("pen031126.target", "|fmt=2")} ha; '
                                  f'±{t("pen031126.sisa.kalteng", "|fmt=2")} ha masih ditangani di Kalimantan Tengah (kegiatan 2 Nov)'), 'ikon': 'karhutla', 'peringkat': False, 'total': True, 'skala_huruf': 1.35, 'baris_maks_pt': 60,
                  'data': {'csv': CSV, 'urut': '-sisa', 'keyakinan': 'resmi', 'sumber': SO, 'kolom': [
                      {'nama': 'provinsi', 'kepala': 'Provinsi'},
                      fs('fs_target', 'Target'), ha('target', 'ha', 'Target'),
                      ha('darat', 'darat, ha', 'Padam'), ha('udara', 'udara, ha', 'Padam'), fs('fs_padam', 'Padam'), ha('padam', 'jumlah, ha', 'Padam'),
                      fs('fs_sisa', 'Masih ditangani'), ha('sisa', 'ha', 'Masih ditangani')]}},
        'pita': {'label': 'Hambatan dan upaya', 'nada': 'aksi', 'kolom': [
            {'ikon': 'karhutla', 'judul': 'Api gambut bawah permukaan', 'isi': 'Pembasahan dan pendinginan berulang, penyekatan, tambahan pompa dan tangki air'},
            {'ikon': 'peringatan', 'judul': 'Asap, jarak pandang rendah', 'isi': 'Jadwal terbang disesuaikan, drone dipakai, operasi mengutamakan keselamatan'},
            {'ikon': 'cuaca-ekstrem', 'judul': 'Awan potensial belum merata', 'isi': 'Koordinasi dengan BMKG, armada OMC siaga, penyemaian saat awan mendukung'},
            {'ikon': 'kesehatan', 'judul': 'Kualitas udara menurun', 'isi': 'Pantau ISPU dan jarak pandang, masker, fasilitas kesehatan siaga, PJJ situasional'}]},
        'sumber': f'{SO}; padam udara Kalimantan Selatan termasuk sebagian padam alami',
    }
