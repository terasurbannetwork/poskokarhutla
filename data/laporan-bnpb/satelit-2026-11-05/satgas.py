"""Slide "Hasil Pemadaman Satgas" (native deck.py) dari teks laporan satgas 5 Nov 2026 yang ditempel pemilik (kegiatan 4 Nov 2026):
bagian A.2 (target, padam, sisa per provinsi), B.1.c dan B.2.c (padam darat, padam water bombing), C (hambatan dan upaya).
Pemeriksa bersih 2 Nov: deck tidak memuat hasil pemadaman satgas (padam ±115,19 ha, sisa ±489,48 ha pada 85 FS).
Menulis CSV ke data/lap dan token ke data/angka.json akar proyek-bnpb skill, mengembalikan dict slide untuk bingkai.py."""
import csv, json, os

SKILL = os.environ.get('DECK_BNPB', os.path.expanduser('~/.claude/skills/ppt-konsultan/bnpb'))
AKAR = os.path.join(SKILL, 'assets', 'proyek-bnpb')
PUS = 'bnpb-satgas-karhutla-2026-11-04'
SO = 'Laporan Upaya Pemadaman Satgas Karhutla, 5 Nov 2026 (kegiatan 4 Nov 2026)'
CSV = 'data/lap/penanganan-051126-satgas.csv'
# provinsi, FS target, target ha, padam darat ha, padam udara (WB) ha, FS padam, padam ha, FS sisa, sisa ha
BARIS = [('Kalimantan Tengah', 93, 468.66, 62.76, 5.00, 35, 67.76, 58, 400.90),   # sisa: luar TNTP 7,11 ha/7 FS, TNTP 393,79 ha/51 FS
         ('Sumatera Selatan', 13, 45.00, 19.00, 9.00, 11, 28.00, 2, 17.00),
         ('Kalimantan Selatan', 30, 46.33, 26.03, 6.50, 20, 32.53, 10, 13.80),   # udara termasuk sebagian padam alami
         ('Jambi', 12, 18.50, 12.00, 0.00, 7, 12.00, 5, 6.50),
         ('Kalimantan Barat', 6, 8.50, 5.50, 0.00, 5, 5.50, 1, 3.00),
         ('Riau', 2, 2.00, 1.50, 0.00, 1, 1.50, 1, 0.50)]   # Riau: 1 FS padam, 1 FS sebagian tertangani (rekap 79 FS)
KOL = ['provinsi', 'fs_target', 'target', 'darat', 'udara', 'fs_padam', 'padam', 'fs_sisa', 'sisa']
r2 = lambda v: round(v + 1e-9, 2)
for b in BARIS:   # padam = darat + udara; target = padam + sisa (FS dan ha)
    assert r2(b[3] + b[4]) == b[6] and r2(b[6] + b[8]) == b[2] and b[5] + b[7] == b[1], b
JUM = {k: r2(sum(b[i] for b in BARIS)) for i, k in enumerate(KOL) if i}
assert (JUM['fs_target'], JUM['target'], JUM['darat'], JUM['udara'], JUM['fs_padam'], JUM['padam'], JUM['fs_sisa'], JUM['sisa']) == \
       (156, 588.99, 126.79, 20.50, 79, 147.29, 77, 441.70), JUM   # rekap teks satgas


def tulis():
    os.makedirs(os.path.join(AKAR, 'data', 'lap'), exist_ok=True)
    with open(os.path.join(AKAR, CSV), 'w', newline='', encoding='utf-8') as f:
        w = csv.writer(f); w.writerow(KOL); w.writerows(BARIS)
    pp = os.path.join(AKAR, 'pustaka.json'); pus = json.load(open(pp, encoding='utf-8'))
    if not any(x.get('id') == PUS for x in pus):
        pus.append({'id': PUS, 'type': 'report', 'author': [{'literal': 'Satuan Tugas Pengendalian Karhutla'}],
                    'issued': {'date-parts': [[2026, 11, 5]]}, 'verifikasi': 'primer',
                    'title': 'Laporan Upaya Pemadaman Karhutla oleh Satgas di Enam Provinsi, 5 November 2026 (kegiatan 4 November 2026)'})
        json.dump(pus, open(pp, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    rp = os.path.join(AKAR, 'data', 'angka.json'); reg = json.load(open(rp, encoding='utf-8'))
    ent = lambda v, s: {'nilai': v, 'satuan': s, 'pustaka': PUS, 'sumber': SO, 'keyakinan': 'resmi'}
    reg['angka'].update({'pen051126.padam': ent(JUM['padam'], 'ha'), 'pen051126.target': ent(JUM['target'], 'ha'),
                         'pen051126.fs_sisa': ent(JUM['fs_sisa'], 'FS'), 'pen051126.sisa.kalteng': ent(BARIS[0][8], 'ha')})
    json.dump(reg, open(rp, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)


def slide(bagian):
    tulis()
    t = lambda k, o='': '{{angka:%s%s}}' % (k, o)
    ha = lambda n, k, g: {'nama': n, 'grup': g, 'kepala': k, 'fmt': '2'}
    fs = lambda n, g: {'nama': n, 'grup': g, 'kepala': 'FS', 'fmt': '0'}
    return {
        # pemeriksa bersih 2 Nov: judul slide operasi pola Penanganan "<Topik> per Tanggal ..." satu baris (10b.06); angka di kepala panel
        'jenis': 'tabel-peringkat', 'jenis_slide': 'tabel', 'judul_bentuk': 'deskriptif', 'bagian': bagian, 'cut_off': False,
        'pesan': 'Hasil pemadaman satgas 4 November',
        'judul': 'Hasil Pemadaman Satgas per Tanggal 5 November 2026',   # tanggal laporan, sama dengan slide operasi (aturan pemilik 1 Nov)
        'tabel': {'judul_panel': (f'Padam ±{t("pen051126.padam", "|fmt=2")} ha dari target ±{t("pen051126.target", "|fmt=2")} ha; '
                                  f'±{t("pen051126.sisa.kalteng", "|fmt=2")} ha masih ditangani di Kalimantan Tengah (kegiatan 4 Nov)'), 'ikon': 'karhutla', 'peringkat': False, 'total': True, 'skala_huruf': 1.35, 'baris_maks_pt': 60,
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
