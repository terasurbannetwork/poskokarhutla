"""Slide "Hasil Pemadaman Satgas" (native deck.py) dari teks laporan satgas 4 Nov 2026 yang ditempel pemilik (kegiatan 3 Nov 2026):
bagian A.2 (target, padam, sisa per provinsi), B.1.c dan B.2.c (padam darat, padam water bombing), C (hambatan dan upaya).
Pemeriksa bersih 2 Nov: deck tidak memuat hasil pemadaman satgas (padam ±115,19 ha, sisa ±489,48 ha pada 85 FS).
Menulis CSV ke data/lap dan token ke data/angka.json akar proyek-bnpb skill, mengembalikan dict slide untuk bingkai.py."""
import csv, json, os

SKILL = os.environ.get('DECK_BNPB', os.path.expanduser('~/.claude/skills/ppt-konsultan/bnpb'))
AKAR = os.path.join(SKILL, 'assets', 'proyek-bnpb')
PUS = 'bnpb-satgas-karhutla-2026-11-03'
SO = 'Laporan Upaya Pemadaman Satgas Karhutla, 4 Nov 2026 (kegiatan 3 Nov 2026)'
CSV = 'data/lap/penanganan-041126-satgas.csv'
# provinsi, FS target, target ha, padam darat ha, padam udara (WB) ha, FS padam, padam ha, FS sisa, sisa ha
BARIS = [('Kalimantan Tengah', 97, 487.34, 79.21, 14.00, 44, 93.21, 53, 394.13),   # darat termasuk ±50 ha TNTP padam karena hujan
         ('Sumatera Selatan', 26, 71.21, 22.21, 11.00, 18, 33.21, 8, 38.00),
         ('Kalimantan Barat', 7, 29.50, 2.30, 9.00, 3, 11.30, 4, 18.20),
         ('Kalimantan Selatan', 14, 26.31, 0.708, 8.50, 6, 9.21, 8, 17.10),
         ('Jambi', 11, 28.50, 16.50, 0.00, 4, 16.50, 7, 12.00),
         ('Riau', 2, 3.00, 1.00, 0.00, 0, 1.00, 2, 2.00)]   # Riau: FS belum padam seluruhnya, jadi 0 FS padam (rekap 75 FS)
KOL = ['provinsi', 'fs_target', 'target', 'darat', 'udara', 'fs_padam', 'padam', 'fs_sisa', 'sisa']
r2 = lambda v: round(v + 1e-9, 2)
for b in BARIS:   # padam = darat + udara; target = padam + sisa (FS dan ha)
    assert r2(b[3] + b[4]) == b[6] and r2(b[6] + b[8]) == b[2] and b[5] + b[7] == b[1], b
JUM = {k: r2(sum(b[i] for b in BARIS)) for i, k in enumerate(KOL) if i}
assert (JUM['fs_target'], JUM['target'], JUM['darat'], JUM['udara'], JUM['fs_padam'], JUM['padam'], JUM['fs_sisa'], JUM['sisa']) == \
       (157, 645.86, 121.93, 42.50, 75, 164.43, 82, 481.43), JUM   # rekap teks satgas


def tulis():
    os.makedirs(os.path.join(AKAR, 'data', 'lap'), exist_ok=True)
    with open(os.path.join(AKAR, CSV), 'w', newline='', encoding='utf-8') as f:
        w = csv.writer(f); w.writerow(KOL); w.writerows(BARIS)
    pp = os.path.join(AKAR, 'pustaka.json'); pus = json.load(open(pp, encoding='utf-8'))
    if not any(x.get('id') == PUS for x in pus):
        pus.append({'id': PUS, 'type': 'report', 'author': [{'literal': 'Satuan Tugas Pengendalian Karhutla'}],
                    'issued': {'date-parts': [[2026, 11, 4]]}, 'verifikasi': 'primer',
                    'title': 'Laporan Upaya Pemadaman Karhutla oleh Satgas di Enam Provinsi, 4 November 2026 (kegiatan 3 November 2026)'})
        json.dump(pus, open(pp, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    rp = os.path.join(AKAR, 'data', 'angka.json'); reg = json.load(open(rp, encoding='utf-8'))
    ent = lambda v, s: {'nilai': v, 'satuan': s, 'pustaka': PUS, 'sumber': SO, 'keyakinan': 'resmi'}
    reg['angka'].update({'pen041126.padam': ent(JUM['padam'], 'ha'), 'pen041126.target': ent(JUM['target'], 'ha'),
                         'pen041126.fs_sisa': ent(JUM['fs_sisa'], 'FS'), 'pen041126.sisa.kalteng': ent(BARIS[0][8], 'ha')})
    json.dump(reg, open(rp, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)


def slide(bagian):
    tulis()
    t = lambda k, o='': '{{angka:%s%s}}' % (k, o)
    ha = lambda n, k, g: {'nama': n, 'grup': g, 'kepala': k, 'fmt': '2'}
    fs = lambda n, g: {'nama': n, 'grup': g, 'kepala': 'FS', 'fmt': '0'}
    return {
        # pemeriksa bersih 2 Nov: judul slide operasi pola Penanganan "<Topik> per Tanggal ..." satu baris (10b.06); angka di kepala panel
        'jenis': 'tabel-peringkat', 'jenis_slide': 'tabel', 'judul_bentuk': 'deskriptif', 'bagian': bagian, 'cut_off': False,
        'pesan': 'Hasil pemadaman satgas 3 November',
        'judul': 'Hasil Pemadaman Satgas per Tanggal 4 November 2026',   # tanggal laporan, sama dengan slide operasi (aturan pemilik 1 Nov)
        'tabel': {'judul_panel': (f'Padam ±{t("pen041126.padam", "|fmt=2")} ha dari target ±{t("pen041126.target", "|fmt=2")} ha; '
                                  f'±{t("pen041126.sisa.kalteng", "|fmt=2")} ha masih ditangani di Kalimantan Tengah (kegiatan 3 Nov)'), 'ikon': 'karhutla', 'peringkat': False, 'total': True, 'skala_huruf': 1.35, 'baris_maks_pt': 60,
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
