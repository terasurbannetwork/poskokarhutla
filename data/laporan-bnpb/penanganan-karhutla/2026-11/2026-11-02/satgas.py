"""Slide "Hasil Pemadaman Satgas" (native deck.py) dari teks laporan satgas 2 Nov 2026 yang ditempel pemilik (kegiatan 1 Nov 2026):
bagian A.2 (target, padam, sisa per provinsi), B.1.c dan B.2.c (padam darat, padam water bombing), C (hambatan dan upaya).
Pemeriksa bersih 2 Nov: deck tidak memuat hasil pemadaman satgas (padam ±115,19 ha, sisa ±489,48 ha pada 85 FS).
Menulis CSV ke data/lap dan token ke data/angka.json akar proyek-bnpb skill, mengembalikan dict slide untuk bingkai.py."""
import csv, json, os

SKILL = os.environ.get('DECK_BNPB', os.path.expanduser('~/.claude/skills/ppt-konsultan/bnpb'))
AKAR = os.path.join(SKILL, 'assets', 'proyek-bnpb')
PUS = 'bnpb-satgas-karhutla-2026-11-01'
SO = 'Laporan Upaya Pemadaman Satgas Karhutla, 2 Nov 2026 (kegiatan 1 Nov 2026)'
CSV = 'data/lap/penanganan-021126-satgas.csv'
# provinsi, FS target, target ha, padam darat ha, padam udara (WB) ha, FS padam, padam ha, FS sisa, sisa ha
BARIS = [('Kalimantan Tengah', 79, 456.17, 14.29, 14.20, 16, 28.49, 63, 427.68),
         ('Kalimantan Selatan', 15, 34.60, 1.10, 5.50, 4, 6.60, 11, 28.00),
         ('Sumatera Selatan', 22, 79.50, 35.50, 17.00, 16, 52.50, 6, 27.00),
         ('Jambi', 17, 22.50, 14.50, 1.50, 13, 16.00, 4, 6.50),
         ('Kalimantan Barat', 10, 11.40, 4.10, 7.00, 9, 11.10, 1, 0.30),
         ('Riau', 1, 0.50, 0.50, 0.00, 1, 0.50, 0, 0.00)]
KOL = ['provinsi', 'fs_target', 'target', 'darat', 'udara', 'fs_padam', 'padam', 'fs_sisa', 'sisa']
r2 = lambda v: round(v + 1e-9, 2)
for b in BARIS:   # padam = darat + udara; target = padam + sisa (FS dan ha)
    assert r2(b[3] + b[4]) == b[6] and r2(b[6] + b[8]) == b[2] and b[5] + b[7] == b[1], b
JUM = {k: r2(sum(b[i] for b in BARIS)) for i, k in enumerate(KOL) if i}
assert (JUM['fs_target'], JUM['target'], JUM['darat'], JUM['udara'], JUM['fs_padam'], JUM['padam'], JUM['fs_sisa'], JUM['sisa']) == \
       (144, 604.67, 69.99, 45.20, 59, 115.19, 85, 489.48), JUM   # rekap teks satgas


def tulis():
    os.makedirs(os.path.join(AKAR, 'data', 'lap'), exist_ok=True)
    with open(os.path.join(AKAR, CSV), 'w', newline='', encoding='utf-8') as f:
        w = csv.writer(f); w.writerow(KOL); w.writerows(BARIS)
    pp = os.path.join(AKAR, 'pustaka.json'); pus = json.load(open(pp, encoding='utf-8'))
    if not any(x.get('id') == PUS for x in pus):
        pus.append({'id': PUS, 'type': 'report', 'author': [{'literal': 'Satuan Tugas Pengendalian Karhutla'}],
                    'issued': {'date-parts': [[2026, 11, 2]]}, 'verifikasi': 'primer',
                    'title': 'Laporan Upaya Pemadaman Karhutla oleh Satgas di Enam Provinsi, 2 November 2026 (kegiatan 1 November 2026)'})
        json.dump(pus, open(pp, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    rp = os.path.join(AKAR, 'data', 'angka.json'); reg = json.load(open(rp, encoding='utf-8'))
    ent = lambda v, s: {'nilai': v, 'satuan': s, 'pustaka': PUS, 'sumber': SO, 'keyakinan': 'resmi'}
    reg['angka'].update({'pen021126.padam': ent(JUM['padam'], 'ha'), 'pen021126.target': ent(JUM['target'], 'ha'),
                         'pen021126.fs_sisa': ent(JUM['fs_sisa'], 'FS'), 'pen021126.sisa.kalteng': ent(BARIS[0][8], 'ha')})
    json.dump(reg, open(rp, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)


def slide(bagian):
    tulis()
    t = lambda k, o='': '{{angka:%s%s}}' % (k, o)
    ha = lambda n, k, g: {'nama': n, 'grup': g, 'kepala': k, 'fmt': '2'}
    fs = lambda n, g: {'nama': n, 'grup': g, 'kepala': 'FS', 'fmt': '0'}
    return {
        # pemeriksa bersih 2 Nov: judul slide operasi pola Penanganan "<Topik> per Tanggal ..." satu baris (10b.06); angka di kepala panel
        'jenis': 'tabel-peringkat', 'jenis_slide': 'tabel', 'judul_bentuk': 'deskriptif', 'bagian': bagian, 'cut_off': False,
        'pesan': 'Hasil pemadaman satgas 1 November',
        'judul': 'Hasil Pemadaman Satgas per Tanggal 2 November 2026',   # tanggal laporan, sama dengan slide operasi (aturan pemilik 1 Nov)
        'tabel': {'judul_panel': (f'Padam ±{t("pen021126.padam", "|fmt=2")} ha dari target ±{t("pen021126.target", "|fmt=2")} ha; '
                                  f'±{t("pen021126.sisa.kalteng", "|fmt=2")} ha masih ditangani di Kalimantan Tengah (kegiatan 1 Nov)'), 'ikon': 'karhutla', 'peringkat': False, 'total': True, 'skala_huruf': 1.35, 'baris_maks_pt': 60,
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
