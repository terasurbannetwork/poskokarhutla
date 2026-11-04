#!/usr/bin/env python3
"""Rute Optimal Dua Belas Kampus Kunci (deck usulan, 2 Nov 2026). Pemilik: "buatnya yang optimal untuk univ2 dalam list. Jumlah harinya
menyesuaikan. Jelaskan juga kenapa mereka." Itinerary dan biaya: optimal_model.py. Alasan per kampus: analisis kampus 2 Nov 2026
(data/kegiatan-bnpb/ajuan-program-kampus-021126) dan riset kampus bersumber (QS 2027, laman kampus, GADRI).
"""
import csv
import json
import re
import sys
from pathlib import Path

AKAR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(Path(__file__).parent))
sys.path.insert(0, str(AKAR.parents[1] / 'scripts'))
import optimal_model as M  # noqa: E402
import susur_model as SM  # noqa: E402

ANGKA, PUSTAKA = {}, {}
R = M.R
R14 = M.HASIL_KUNCI[14]


def a(kunci, nilai, satuan, sumber, keyakinan='asumsi-kebijakan', pid='opt-model'):
    ANGKA[kunci] = {'nilai': nilai, 'satuan': satuan, 'pustaka': pid, 'sumber': sumber, 'keyakinan': keyakinan, 'tanggal_data': '2026-11-02'}


def t(kunci, opsi=''):
    assert kunci in ANGKA, kunci
    return '{{angka:%s%s}}' % (kunci, opsi)


def tulis(nama, kepala, baris):
    (AKAR / 'data/optimal').mkdir(parents=True, exist_ok=True)
    with (AKAR / 'data/optimal' / f'{nama}.csv').open('w', newline='', encoding='utf-8') as f:
        w = csv.writer(f)
        w.writerow(kepala)
        w.writerows(baris)
    return f'data/optimal/{nama}.csv'


def _tebal(teks):
    def ganti(m):
        out = []
        for bag in re.split(r'(\{\{[^}]+\}\})', m.group(1)):
            if bag.startswith('{{') or not bag.strip():
                out.append(bag)
            else:
                ki = bag[:len(bag) - len(bag.lstrip())]
                ka = bag[len(bag.rstrip()):]
                out.append(f'{ki}**{bag.strip()}**{ka}')
        return ''.join(out)
    return re.sub(r'\*\*(.+?)\*\*', lambda m: ganti(m) if '{{' in m.group(1) else m.group(0), teks)


def tm(kode, ikon, teks, keyakinan='asumsi-kebijakan'):
    return {'kode': kode, 'keyakinan': keyakinan, 'ikon': ikon, 'teks': _tebal(teks)}


def kt(nilai, label, ikon, warna='navy'):
    return {'nilai': nilai, 'label': label, 'ikon': ikon, 'warna': warna}


def jt(x, d=1):
    return round(x / 1e6, d)


PUSTAKA['opt-model'] = {'id': 'opt-model', 'type': 'report', 'author': [{'literal': 'Tim Tenaga Ahli Kepala BNPB'}],
                        'issued': {'date-parts': [[2026, 11, 2]]}, 'title': 'Model rute optimal dua belas kampus kunci (optimal_model.py)',
                        'verifikasi': 'primer'}
S_MODEL = 'Hitungan tim dari SBM 2026 dan tarif KAI, KCIC, pasar, Nov 2026'
S_QS = 'QS World University Rankings 2027, Jun 2026'
S_ALASAN = 'QS WUR 2027; laman kampus; analisis kampus tim, 2 Nov 2026'

# ---------------------------------------------------------------- angka
RN_ = {('Jabodetabek' if v[3] in ('Jakarta', 'Depok', 'Bogor') else 'Bandung raya' if v[3] in ('Bandung', 'Jatinangor') else v[3]) for v in M.K.values()}
a('opt.kampus', R['kampus'], 'kampus', S_QS, 'terverifikasi', 'susur-qs')
a('opt.ptn', sum(1 for k in R['aud'] if M.K[k][1] == 'PTN'), 'PTN', S_QS, 'terverifikasi', 'susur-qs')
a('opt.pts', sum(1 for k in R['aud'] if M.K[k][1] == 'PTS'), 'PTS', S_QS, 'terverifikasi', 'susur-qs')
a('opt.hari', R['hari'], 'hari', S_MODEL)
a('opt.harik', R['hari_kampus'], 'hari kampus', S_MODEL)
a('opt.libur', R['hari_libur'], 'hari tanpa kampus', S_MODEL)
a('opt.malam', R['malam'], 'malam', S_MODEL)
a('opt.pagu', jt(R['pagu']), 'juta rupiah', S_MODEL)
a('opt.riil', jt(R['riil']), 'juta rupiah', S_MODEL)
a('opt.perkampus', jt(R['pagu'] / R['kampus'], 2), 'juta rupiah', S_MODEL)
a('opt.p14', jt(R14['pagu']), 'juta rupiah', S_MODEL)
a('opt.hemat', jt(R14['pagu'] - R['pagu']), 'juta rupiah', S_MODEL)
a('opt.hari14', R14['hari'], 'hari', S_MODEL)
a('opt.lebih.singkat', R14['hari'] - R['hari'], 'hari', S_MODEL)
a('opt.slot.k', R['slot']['K'], 'slot', S_MODEL)
a('opt.slot.total', 3 * R['hari'], 'slot', S_MODEL)
a('opt.maks', 2, 'kampus per hari', S_MODEL)
a('opt.kota', len({M.K[k][3] for k in R['aud']}), 'kota', S_QS, 'terverifikasi', 'susur-qs')
a('opt.kontinjensi', 10, 'persen', 'Asumsi tim')
a('opt.wilayah', len(RN_), 'wilayah', S_QS, 'terverifikasi', 'susur-qs')
a('opt.terbukti', 9, 'kampus', S_ALASAN, 'penilaian-pakar', 'susur-qs')
a('opt.jajak', 3, 'kampus', S_ALASAN, 'penilaian-pakar', 'susur-qs')

# ---------------------------------------------------------------- CSV
ALASAN = [
    ('UI (PTN)', 'QS 2027 urutan 191, tertinggi di Indonesia; DRRC UI; aturan rektor Kampus Aman Bencana',
     'Rencana keberlangsungan usaha Jakarta; relawan medis RSUI'),
    ('UGM (PTN)', 'QS 206; PSBA sejak 1995; GAMA-EWS terpasang di 30 provinsi',
     'Peringatan dini longsor untuk desa rawan'),
    ('Unair (PTN)', 'QS 276; Magister Manajemen Bencana; dasbor bencana bersama BPBD Jatim; RS Kapal Ksatria Airlangga',
     'Layanan medis darurat kepulauan bersama ITS'),
    ('ITB (PTN)', 'QS 287; PPMB; ultrafiltrasi IGW di Sumatra 2025; seismograf Geolini',
     'Air bersih siaga; penilaian bangunan pascagempa'),
    ('IPB (PTN)', 'QS 419; pusat latih kebakaran hutan dan gambut; RFMRC-SEA sejak 2017',
     'Sertifikasi regu pemadam gambut untuk karhutla'),
    ('Unpad (PTN)', 'QS 496; Pusat Riset Kebencanaan; edukasi mitigasi pascagempa Sumedang 2024',
     'Mitigasi gempa; pemulihan trauma di Jawa Barat'),
    ('ITS (PTN)', 'QS 497; Puslit MKPI; pemodelan tsunami InaTEWS; desain kapal rumah sakit',
     'Kapal tanggap bencana kepulauan'),
    ('UB (PTN)', 'QS 616; tim medis darurat FK UB saat erupsi Semeru; pusat studi belum teridentifikasi',
     'Pendampingan erupsi dan longsor Jawa Timur; perlu dijajaki'),
    ('Undip (PTN)', 'QS 662; riset rob pesisir Semarang (2021); pusat studi belum teridentifikasi',
     'Rob pantura dan penurunan muka tanah; perlu dijajaki'),
    ('Binus (PTS)', 'PTS tertinggi di QS 2027 (901 sampai 950); unit kebencanaan belum dicari',
     'Sains data untuk sistem informasi bencana; perlu dijajaki'),
    ('Telkom U (PTS)', 'QS 1201 sampai 1400; PATRIOT-Net terhubung BMKG; VR SIGAP',
     'Komunikasi cadangan posko; edukasi sekolah berbasis VR'),
    ('UMY (PTS)', 'QS 1201 sampai 1400; PSLB; jembatan ke MDMC',
     'Jejaring relawan Muhammadiyah di seluruh Indonesia'),
]
c_alasan = tulis('alasan', ['kampus', 'dasar', 'cari'], [list(x) for x in ALASAN])
RAYA = {'Jakarta': 'Jabodetabek', 'Depok': 'Jabodetabek', 'Bogor': 'Jabodetabek', 'Bandung': 'Bandung raya', 'Jatinangor': 'Bandung raya'}
XY = {'Jabodetabek': (106.78, -6.37), 'Bandung raya': (107.68, -6.92), 'Yogyakarta': (110.39, -7.77), 'Semarang': (110.44, -7.05),
      'Surabaya': (112.78, -7.28), 'Malang': (112.61, -7.95)}
RN = {}
for k in R['aud']:
    c = RAYA.get(M.K[k][3], M.K[k][3])
    RN[c] = RN.get(c, 0) + 1
c_kota = tulis('kota', ['kota', 'kampus', 'lon', 'lat'], [[c, n, XY[c][0], XY[c][1]] for c, n in sorted(RN.items(), key=lambda x: -x[1])])
c_hari = tulis('hari', ['label', 'nilai'], [['Hari kunjungan kampus', R['hari_kampus']], ['Sabtu: kereta Bandung ke Semarang', 1],
                                            ['Minggu: istirahat', 1], ['Rabu: darat Yogyakarta ke Malang', 1]])
assert R['hari_kampus'] + 3 == R['hari']
c_itin = tulis('itin', ['hari', 'kota', 'pagi', 'siang', 'malam'], [[h['tgl'], h['kota'], h['pagi'], h['siang'], h['malam']] for h in M.OPT])
c_lokasi = tulis('lokasi', ['kegiatan', 'kelompok', 'mulai', 'selesai', 'tonggak'], [
    ['Jabodetabek: IPB, UI, Binus', 'Pekan pertama', 1, 2, 1],
    ['Bandung raya: Telkom U, ITB, Unpad', 'Pekan pertama', 2, 4, 3],
    ['Semarang: Undip', 'Akhir pekan dan pekan kedua', 4, 6, 6],
    ['Yogyakarta: UGM, UMY', 'Akhir pekan dan pekan kedua', 6, 8, 7],
    ['Malang: UB', 'Akhir pekan dan pekan kedua', 8, 9, 9],
    ['Surabaya: ITS, Unair, lalu pulang', 'Akhir pekan dan pekan kedua', 9, 10, 10],
])
KOMP = [('tiket_p', 'Tiket antarkota'), ('lokal', 'Transport lokal'), ('inap_p', 'Penginapan'), ('uh', 'Uang harian'),
        ('paket', 'Bahan kunjungan'), ('kontin_p', 'Kontinjensi')]
assert abs(sum(R[k] for k, _ in KOMP) - R['pagu']) < 1
c_biaya = tulis('biaya', ['komponen', 'nilai'], [[l, round(R[k] / 1e6, 2)] for k, l in KOMP])
RINCI = [('tiket_p', 'Tiket antarkota'), ('sewa', 'Sewa mobil dan sopir'), ('tol', 'Tol'), ('trf', 'Transport ke stasiun Jakarta'),
         ('inap_p', 'Penginapan (pagu)'), ('uh', 'Uang harian'), ('paket', 'Bahan dan cenderamata'), ('kontin_p', 'Kontinjensi'),
         ('pagu', 'Total pagu usulan'), ('tiket_r', 'Tiket antarkota (riil)'), ('inap_r', 'Penginapan (riil)'),
         ('kontin_r', 'Kontinjensi (riil)'), ('riil', 'Perkiraan riil')]
c_rinci = tulis('rinci', ['komponen', 'opt', 'p14'], [[l, jt(R[k], 2), jt(R14[k], 2)] for k, l in RINCI]
                + [['Pagu per kampus', jt(R['pagu'] / 12, 2), jt(R14['pagu'] / 12, 2)], ['Pagu per hari', jt(R['pagu'] / R['hari'], 2), jt(R14['pagu'] / 14, 2)],
                   ])
LBL = {'WH': 'Whoosh Jakarta ke Bandung', 'KA-BDG-SMG': 'KA Harina Bandung ke Semarang', 'SUB-CGK': 'Pesawat Surabaya ke Jakarta'}
c_tarif = tulis('tarif', ['item', 'pagu', 'riil', 'dasar'],
                [[LBL[k], M.TIKET[k][0] / 1e3, M.TIKET[k][1] / 1e3, M.TIKET[k][2]] for k in LBL]
                + [['Tol Yogyakarta ke Semarang', M.TOL['Yogyakarta ke Semarang'] / 1e3, M.TOL['Yogyakarta ke Semarang'] / 1e3, 'jumlah ruas lewat Solo; Kompas TV mengutip BPJT'],
                   ['Tol Yogyakarta ke Malang', M.TOL['Yogyakarta ke Malang'] / 1e3, M.TOL['Yogyakarta ke Malang'] / 1e3, 'asumsi tim; tarif resmi belum diriset'],
                   ['Tol Surabaya ke Malang', M.TOL['Surabaya ke Malang'] / 1e3, M.TOL['Surabaya ke Malang'] / 1e3, 'perkiraan Auto2000, 2026'],
                   ['Transport rumah ke bandara Jakarta', SM.TRANSFER_DKI / 1e3, SM.TRANSFER_DKI / 1e3, 'SBM DKI, per orang per kali'],
                   ]
                + [[f'Sewa mobil dan sopir, {SM.PROV_NAMA[p]}', SM.SEWA[p] / 1e3, SM.SEWA[p] / 1e3, 'SBM, per hari, termasuk BBM'] for p in ('DKI', 'Jabar', 'Jateng', 'DIY', 'Jatim')]
                + [['Uang harian luar kota', '', '', 'SBM per orang per hari: Jabar 430, Jateng 370, DIY 420, Jatim 410 ribu']]
                + [['Uang harian dalam kota, DKI Jakarta', SM.UH_DALAM / 1e3, SM.UH_DALAM / 1e3, 'SBM, lebih dari delapan jam']]
                + [[f'Hotel golongan IV dan III, {SM.PROV_NAMA[p]}', (SM.HOTEL_TA[p] + 2 * SM.HOTEL_STAF[p]) / 1e3, (SM.HOTEL_TA[p] + 2 * SM.HOTEL_STAF[p]) * SM.HOTEL_RIIL / 1e3,
                    'SBM, tiga kamar per malam; riil delapan puluh persen'] for p in ('Jabar', 'Jateng', 'DIY', 'Jatim')])

# ---------------------------------------------------------------- RAB dari itinerary
import susur_model as SM2  # noqa: E402
LBL_T = {'WH': 'Tiket Whoosh Jakarta ke Bandung', 'KA-BDG-SMG': 'Tiket KA Harina Bandung ke Semarang',
         'SUB-CGK': 'Tiket pesawat Surabaya ke Jakarta'}


def _hitung_rab():
    from collections import Counter
    tk, sw, tl, inap, uh = Counter(), Counter(), Counter(), Counter(), Counter()
    trf = 0
    for h in M.OPT:
        for x in h['tiket']:
            tk[x] += 1
        if h['sewa']:
            sw[h['sewa']] += 1
        for x in h['tol']:
            tl[x] += 1
        if h['inap']:
            inap[h['inap']] += 1
        if h['uh']:
            uh[h['uh']] += 1
        trf += h['trf']
    T = SM2.TIM
    g = []   # (kode kelompok, judul, [(uraian, volume, satuan volume, harga)])
    g.append(('A', 'Transport antarkota', [(LBL_T[k], n * T, f'{T} orang x {n} kali', M.TIKET[k][0]) for k, n in tk.items()]))
    g.append(('B', 'Transport lokal',
              [(f'Sewa mobil dan sopir, {SM2.PROV_NAMA[p]}', n, f'{n} hari', SM2.SEWA[p]) for p, n in sw.items()]
              + [(f'Tol {k}', n, f'{n} kali', M.TOL[k]) for k, n in tl.items()]
              + [('Transport rumah ke stasiun atau bandara Jakarta', trf * T, f'{T} orang x {trf} kali', SM2.TRANSFER_DKI)]))
    g.append(('C', 'Penginapan',
              sum([[(f'Hotel golongan IV, {SM2.PROV_NAMA[p]}', n, f'1 kamar x {n} malam', SM2.HOTEL_TA[p]),
                    (f'Hotel golongan III, {SM2.PROV_NAMA[p]}', 2 * n, f'2 kamar x {n} malam', SM2.HOTEL_STAF[p])] for p, n in inap.items()], [])))
    g.append(('D', 'Uang harian',
              [((f'Uang harian luar kota, {SM2.PROV_NAMA[p]}' if j == 'luar' else 'Uang harian dalam kota, DKI Jakarta'), n * T,
                f'{T} orang x {n} hari', SM2.UH_LUAR[p] if j == 'luar' else SM2.UH_DALAM) for (j, p), n in uh.items()]))
    g.append(('E', 'Bahan kunjungan', [('Bahan cetak dan cenderamata per kampus', R['kampus'], f'{R["kampus"]} kampus', SM2.PAKET_KAMPUS)]))
    sub = sum(v * h for _, _, its in g for _, v, _, h in its)
    g.append(('F', 'Kontinjensi', [('Kontinjensi sepuluh persen dari jumlah A sampai E', 1, '1 paket', round(sub * SM2.KONTINJENSI))]))
    tot = sum(v * h for _, _, its in g for _, v, _, h in its)
    assert abs(tot - R['pagu']) < 2, (tot, R['pagu'])
    return g, tot


RAB, RAB_TOTAL = _hitung_rab()
rab_rows, rab_ring = [], []
for kode, judul, its in RAB:
    jml = sum(v * h for _, v, _, h in its)
    rab_rows.append([kode, judul.upper(), '', '', ''])
    for i, (u, v, sv, h) in enumerate(its, 1):
        rab_rows.append([f'{kode}.{i}', u, sv, h, v * h])
    rab_rows.append(['', f'Jumlah {kode}', '', '', jml])
    rab_ring.append([kode, judul, f'{len(its)} butir', jml])
rab_rows.append(['', 'TOTAL PAGU USULAN', '', '', RAB_TOTAL])
c_rab = tulis('rab', ['kode', 'uraian', 'volume', 'harga', 'jumlah'], rab_rows)
c_rab_ring = tulis('rab_ringkas', ['kode', 'komponen', 'butir', 'jumlah'], rab_ring)
a('opt.rab.total', RAB_TOTAL / 1e6, 'juta rupiah', S_MODEL)
a('opt.rab.butir', sum(len(its) for _, _, its in RAB), 'butir', S_MODEL)


def tulis_xlsx():
    from openpyxl import Workbook
    from openpyxl.styles import Font, Alignment, PatternFill, Border, Side
    wb = Workbook()
    ws = wb.active
    ws.title = 'RAB'
    tebal = Font(name='Roboto', bold=True)
    biasa = Font(name='Roboto')
    ws['A1'] = 'RENCANA ANGGARAN BIAYA'
    ws['A1'].font = Font(name='Roboto', bold=True, size=13)
    ws['A2'] = 'Kunjungan Tenaga Ahli Kepala BNPB ke dua belas kampus kunci, 18 sampai 27 November 2026, tim tiga orang'
    ws['A3'] = 'Dasar: PMK Nomor 32 Tahun 2025 tentang SBM TA 2026; tarif KAI, KCIC, pasar; asumsi tim untuk bahan, tol Yogyakarta ke Malang, dan kontinjensi'
    for c in ('A2', 'A3'):
        ws[c].font = Font(name='Roboto', size=9, italic=True)
    kepala = ['No', 'Uraian', 'Volume', 'Satuan', 'Harga satuan (Rp)', 'Jumlah (Rp)']
    ws.append([])
    ws.append(kepala)
    r0 = ws.max_row
    isi = PatternFill('solid', fgColor='051C2C')
    for j in range(1, 7):
        c = ws.cell(r0, j)
        c.font = Font(name='Roboto', bold=True, color='FFFFFF')
        c.fill = isi
        c.alignment = Alignment(horizontal='center', vertical='center', wrap_text=True)
    sub_sel = []
    for kode, judul, its in RAB:
        ws.append([kode, judul.upper()])
        ws.cell(ws.max_row, 1).font = tebal
        ws.cell(ws.max_row, 2).font = tebal
        a0 = ws.max_row + 1
        for i, (u, v, sv, h) in enumerate(its, 1):
            if ' x ' in sv:
                p1, p2 = sv.split(' x ')
                sat = p1.split(' ', 1)[1] + ' ' + p2.split(' ', 1)[1]
            else:
                sat = sv.split(' ', 1)[1]
            ws.append([f'{kode}.{i}', u, v, sat, h])
            rr = ws.max_row
            ws.cell(rr, 6).value = f'=C{rr}*E{rr}'
            for j in range(1, 7):
                ws.cell(rr, j).font = biasa
        a1 = ws.max_row
        ws.append(['', f'Jumlah {kode}', None, None, None, f'=SUM(F{a0}:F{a1})'])
        ws.cell(ws.max_row, 2).font = tebal
        ws.cell(ws.max_row, 6).font = tebal
        sub_sel.append(f'F{ws.max_row}')
    ws.append(['', 'TOTAL PAGU USULAN', None, None, None, '=' + '+'.join(sub_sel)])
    for j in (2, 6):
        ws.cell(ws.max_row, j).font = Font(name='Roboto', bold=True, size=12)
    tipis = Side(style='thin', color='BFC5CC')
    for row in ws.iter_rows(min_row=r0, max_row=ws.max_row, max_col=6):
        for c in row:
            c.border = Border(bottom=tipis)
            if c.column in (5, 6):
                c.number_format = '#,##0'
    for kol, lb in zip('ABCDEF', (7, 52, 9, 14, 18, 18)):
        ws.column_dimensions[kol].width = lb
    ws.freeze_panes = ws.cell(r0 + 1, 1)
    keluar = AKAR / 'out/optimal/RAB Rute Optimal Kampus Kunci 021126.xlsx'
    keluar.parent.mkdir(parents=True, exist_ok=True)
    wb.save(keluar)
    return keluar


KOL_HARI = [{'nama': 'hari', 'kepala': 'Hari'}, {'nama': 'kota', 'kepala': 'Kota'}, {'nama': 'pagi', 'kepala': 'Pagi'},
            {'nama': 'siang', 'kepala': 'Siang'}, {'nama': 'malam', 'kepala': 'Sore dan malam'}]

SLIDE = [
    {'jenis': 'sampul', 'layout': 'putih', 'judul_penuh': True, 'skala_subjudul': 0.85, 'foto': 'foto/sampul-ugm.jpg',
     'kepada': 'Disampaikan kepada Kepala Badan Nasional Penanggulangan Bencana',
     'kredit': 'Foto: Alharomain354, CC BY-SA 4.0, Wikimedia Commons', 'kota': 'Jakarta',
     'penyaji': {'nama': 'Alfatehan Septianta', 'jabatan': 'Tenaga Ahli Kepala BNPB Bidang Riset, Inovasi dan Kerja Sama Perguruan Tinggi'}},

    {'jenis': 'galeri', 'jenis_slide': 'navigasi', 'judul_bentuk': 'deskriptif', 'pesan': 'Ringkasan rute',
     'sumber': 'Hitungan tim, Nov 2026; QS WUR 2027', 'cut_off': False, 'skala_huruf': 1.6,
     'judul': f'Dua belas kampus kunci cukup ditempuh dalam {t("opt.hari", "|satuan")}; dibanding pola empat belas hari, lebih singkat {t("opt.lebih.singkat", "|satuan")} serta hemat Rp {t("opt.hemat")} juta',
     'grup': [{'pil': 'Angka kunci', 'nada': 'data', 'ikon': 'ringkasan', 'kartu': [
         kt(t('opt.kampus'), 'kampus kunci pilihan', 'sekolah'),
         kt(t('opt.hari', '|satuan'), '18–27 Nov 2026, Rabu sampai Jumat', 'kalender'),
         kt('Rp ' + t('opt.pagu') + ' juta', 'pagu usulan, tim tiga orang', 'pembiayaan', 'oranye')]}],
     'panel': [
         {'judul': 'Mengapa mereka', 'ikon': 'sekolah', 'nada': 'kendala', 'temuan': [
             tm('Temuan A.1', 'sekolah', f'**{t("opt.ptn")} PTN** dengan peringkat QS 2027 tujuh ratus besar dunia.', 'terverifikasi'),
             tm('Temuan A.2', 'lembaga', f'**{t("opt.pts")} PTS** teratas di QS 2027.', 'terverifikasi'),
             tm('Temuan A.3', 'peringatan', f'**{t("opt.terbukti")} kampus** sudah punya keahlian bencana terbukti; sisanya dijajaki.', 'penilaian-pakar'),
         ]},
         {'judul': 'Mengapa sepuluh hari', 'ikon': 'kalender', 'nada': 'capaian', 'temuan': [
             tm('Temuan B.1', 'kalender', f'**{t("opt.harik", "|satuan")}**, dua kampus searah per hari.'),
             tm('Temuan B.2', 'wilayah', '**Sabtu** kereta ke Semarang; **Rabu** darat ke Malang.'),
             tm('Temuan B.3', 'jiwa', '**Minggu** untuk istirahat penuh dan rekap pekan pertama.'),
         ]},
         {'judul': 'Keputusan', 'ikon': 'regulasi', 'nada': 'tindak', 'temuan': [
             tm('Temuan C.1', 'regulasi', '**Setujui rute sepuluh hari**, 18–27 Nov 2026.'),
             tm('Temuan C.2', 'pembiayaan', f'**Pagu Rp {t("opt.pagu")} juta**, perkiraan riil Rp {t("opt.riil")} juta.'),
             tm('Temuan C.3', 'kalender', '**Surat audiensi** dikirim paling lambat 6 Nov.'),
         ]}]},

    # ---- Bagian 1: mengapa mereka
    {'jenis': 'temuan-visual', 'jenis_slide': 'peta', 'judul_bentuk': 'temuan', 'rasio': 0.64,
     'pesan': 'Peta kampus kunci', 'cut_off': False, 'sumber': f'{S_QS}; laman kampus, Nov 2026',
     'judul': f'Dua belas kampus kunci terkumpul di {t("opt.wilayah", "|satuan")} sepanjang jalur kereta, dari Jabodetabek sampai Malang',
     'utama': {'judul': 'Kampus kunci per wilayah', 'ikon': 'wilayah', 'peta': {
         'mode': 'titik', 'wilayah': ['31', '32', '33', '34', '35', '36'], 'skala': 'emas', 'satuan': 'Jumlah kampus kunci',
         'label': 6, 'skala_huruf': 1.15,
         'data': {'csv': c_kota, 'kolom': [{'nama': 'kota'}, {'nama': 'kampus', 'kepala': 'Kampus', 'fmt': '0'},
                                            {'nama': 'lon', 'fmt': '2'}, {'nama': 'lat', 'fmt': '2'}],
                  'keyakinan': 'terverifikasi', 'sumber': S_QS}}},
     'panel': {'judul': 'Tiga dasar memilih', 'ikon': 'sekolah', 'skala_huruf': 1.3, 'temuan': [
         tm('Temuan A.1', 'sekolah', f'**Peringkat.** {t("opt.ptn")} PTN Jawa di tujuh ratus besar QS 2027, ditambah {t("opt.pts")} PTS teratas.', 'terverifikasi'),
         tm('Temuan A.2', 'peringatan', '**Keahlian bencana.** Sebagian besar punya pusat studi atau rekam tanggap darurat; Binus, UB, Undip perlu dijajaki.', 'penilaian-pakar'),
         tm('Temuan A.3', 'wilayah', '**Wilayah.** Tiap kampus dekat dengan bahaya utama di provinsinya.', 'penilaian-pakar'),
         tm('Temuan A.4', 'lembaga', '**Kampus lain** diajak lewat surat dan audiensi daring.', 'penilaian-pakar'),
         tm('Temuan A.5', 'regulasi', '**PTN didahulukan**; PTS hanya yang teratas di QS 2027.', 'penilaian-pakar'),
     ]}},

    {'jenis': 'temuan-visual', 'jenis_slide': 'tabel', 'judul_bentuk': 'temuan',
     'pesan': 'Alasan per kampus', 'cut_off': False, 'sumber': S_ALASAN,
     'judul': f'Dari {t("opt.kampus")} kampus kunci, {t("opt.terbukti")} sudah punya keahlian bencana terbukti; {t("opt.jajak")} lainnya masih perlu dijajaki',
     'utama': {'judul': 'Dasar terpilih dan yang dicari BNPB dari tiap kampus', 'ikon': 'sekolah', 'heatmap': {
         'mode': 'teks', 'skala_huruf': 1.0,
         'data': {'csv': c_alasan, 'kolom': [{'nama': 'kampus', 'kepala': 'Kampus'}, {'nama': 'dasar', 'kepala': 'Dasar terpilih'},
                                              {'nama': 'cari', 'kepala': 'Yang dicari BNPB'}],
                  'keyakinan': 'penilaian-pakar', 'sumber': S_ALASAN}}}},

    # ---- Bagian 2: rute
    {'jenis': 'temuan-visual', 'jenis_slide': 'grafik', 'judul_bentuk': 'temuan', 'rasio': 0.6,
     'pesan': 'Mengapa sepuluh hari', 'cut_off': False, 'sumber': S_MODEL,
     'judul': f'Sepuluh hari: {t("opt.harik", "|satuan")} ditambah akhir pekan serta sehari darat ke Malang, supaya tidak ada audiensi sesudah perjalanan panjang',
     'utama': {'judul': 'Susunan hari rute optimal', 'ikon': 'kalender', 'waterfall': {
         'akhir': 'Jumlah hari', 'cek_akhir': R['hari'],
         'data': {'csv': c_hari, 'kolom': [{'nama': 'label'}, {'nama': 'nilai', 'kepala': 'Hari', 'fmt': '0'}],
                  'keyakinan': 'asumsi-kebijakan', 'sumber': S_MODEL}}},
     'panel': {'judul': 'Pilihan yang ditolak', 'ikon': 'peringatan', 'skala_huruf': 1.36, 'temuan': [
         tm('Temuan B.1', 'kalender', f'**Pola empat belas hari** dengan lebih banyak hari bebas butuh Rp {t("opt.p14")} juta.'),
         tm('Temuan B.2', 'jiwa', '**Tiga kampus per hari** memangkas hari, tetapi audiensi jadi terburu-buru.'),
         tm('Temuan B.3', 'wilayah', '**Sembilan hari** bisa, tetapi UB diaudiensi sesudah lima jam di jalan.'),
         tm('Temuan B.4', 'pembiayaan', '**Yogyakarta dulu** juga sembilan hari, tetapi rutenya bolak-balik Surabaya ke Malang.'),
     ]}},

    {'jenis': 'temuan-visual', 'jenis_slide': 'tabel', 'judul_bentuk': 'temuan',
     'pesan': 'Itinerary sepuluh hari', 'cut_off': False, 'sumber': S_MODEL,
     'judul': f'Itinerary sepuluh hari: {t("opt.harik", "|satuan")}; Sabtu kereta ke Semarang, Minggu istirahat, Rabu darat ke Malang',
     'grup': [{'pil': 'Biaya dan ritme', 'nada': 'data', 'ikon': 'pembiayaan', 'kartu': [
         kt('Rp ' + t('opt.pagu') + ' juta', 'pagu usulan, tim tiga orang', 'pembiayaan', 'oranye'),
         kt('Rp ' + t('opt.perkampus', '|fmt=2') + ' juta', 'biaya per kampus', 'sekolah'),
         kt(t('opt.malam'), 'malam menginap di luar Jakarta', 'rumah'),
         kt(t('opt.libur'), 'hari tanpa audiensi', 'kalender')]}],
     'utama': {'judul': 'Rute searah, 18–27 Nov 2026, Rabu sampai Jumat', 'ikon': 'kalender', 'heatmap': {
         'mode': 'teks', 'skala_huruf': 1.0,
         'data': {'csv': c_itin, 'kolom': KOL_HARI, 'keyakinan': 'asumsi-kebijakan', 'sumber': S_MODEL}}}},

    {'jenis': 'temuan-visual', 'jenis_slide': 'grafik', 'judul_bentuk': 'temuan', 'rasio': 0.66,
     'pesan': 'Lokasi tim per hari', 'cut_off': False, 'sumber': S_MODEL,
     'judul': f'Rute bergerak satu arah dari barat ke timur; kunjungan kampus hanya {t("opt.slot.k")} dari {t("opt.slot.total")} slot waktu',
     'utama': {'judul': 'Lokasi tim per hari, hari ke-1 sampai ke-10', 'ikon': 'wilayah', 'linimasa': {
         'hari_ini': 1, 'kepala_kegiatan': 'Wilayah dan kampus', 'ket_batang': 'Tim berada di wilayah', 'ket_tonggak': 'Hari kunjungan utama',
         'ket_hari_ini': 'Berangkat', 'skala_huruf': 1.2,
         'data': {'csv': c_lokasi, 'kolom': [{'nama': 'kegiatan'}, {'nama': 'kelompok'}, {'nama': 'mulai', 'fmt': '0'},
                                              {'nama': 'selesai', 'fmt': '0'}, {'nama': 'tonggak', 'fmt': '0'}],
                  'keyakinan': 'asumsi-kebijakan', 'sumber': S_MODEL}}},
     'panel': {'judul': 'Ritme yang dijaga', 'ikon': 'jiwa', 'skala_huruf': 1.3, 'temuan': [
         tm('Temuan C.1', 'sekolah', f'**Pagi untuk kampus**; paling banyak {t("opt.maks", "|satuan")}, hanya bila searah.'),
         tm('Temuan C.2', 'kalender', '**Perjalanan jauh** di akhir pekan atau hari tanpa audiensi.'),
         tm('Temuan C.3', 'data', '**Sore dan malam** untuk notula serta persiapan kampus berikutnya.'),
         tm('Temuan C.4', 'jiwa', '**Minggu** tanpa agenda resmi dan menjadi cadangan bila audiensi bergeser.'),
         tm('Temuan C.5', 'wilayah', '**Searah ke timur**; berakhir di Surabaya yang dekat bandara.'),
     ]}},

    # ---- Bagian 3: biaya dan keputusan
    {'jenis': 'temuan-visual', 'jenis_slide': 'panel', 'judul_bentuk': 'temuan', 'rasio': 0.6,
     'pesan': 'Biaya rute optimal', 'cut_off': False, 'sumber': S_MODEL,
     'judul': f'Pagu Rp {t("opt.pagu")} juta, atau Rp {t("opt.perkampus", "|fmt=2")} juta per kampus; penginapan menjadi pos terbesar, disusul bahan kunjungan',
     'utama': {'judul': 'Susunan pagu usulan, Rp juta', 'ikon': 'pembiayaan', 'waterfall': {
         'akhir': 'Pagu usulan', 'cek_akhir': round(R['pagu'] / 1e6, 2),
         'data': {'csv': c_biaya, 'kolom': [{'nama': 'komponen'}, {'nama': 'nilai', 'kepala': 'Rp juta', 'fmt': '1'}],
                  'keyakinan': 'asumsi-kebijakan', 'sumber': S_MODEL}}},
     'panel': {'judul': 'Dibanding pola empat belas hari', 'ikon': 'sekolah', 'skala_huruf': 1.25, 'temuan': [
         tm('Temuan D.1', 'pembiayaan', f'**Lebih hemat Rp {t("opt.hemat")} juta** untuk dua belas kampus yang sama.'),
         tm('Temuan D.2', 'rumah', '**Lebih sedikit malam menginap** dan hari uang harian, karena hari bebas dipangkas dan akhir pekan dipakai untuk perjalanan.'),
         tm('Temuan D.3', 'peringatan', f'**Asumsi** bahan Rp satu setengah juta per kampus; kontinjensi {t("opt.kontinjensi", "|persen")}.'),
         tm('Temuan D.4', 'kalender', '**Tarif KA Harina dan tol Yogyakarta ke Malang** masih perkiraan; dicek sebelum memesan.'),
         tm('Temuan D.5', 'wilayah', '**Rute satu arah** dari barat ke timur, tanpa bolak-balik ke Jakarta.'),
     ]}},

    {'jenis': 'tabel-peringkat', 'jenis_slide': 'tabel', 'judul_bentuk': 'temuan', 'rasio': 0.66,
     'pesan': 'RAB ringkas', 'cut_off': False, 'sumber': 'PMK Nomor 32 Tahun 2025 tentang SBM TA 2026; hitungan tim, Nov 2026',
     'judul': f'RAB {t("opt.rab.butir", "|satuan")} dalam enam kelompok menjumlah Rp {t("opt.rab.total")} juta; rincian volume dan harga satuan di Lampiran',
     'tabel': {'judul_panel': 'Rencana anggaran biaya per kelompok, rupiah', 'ikon': 'pembiayaan', 'peringkat': False, 'total': True,
               'data': {'csv': c_rab_ring, 'kolom': [{'nama': 'kode', 'kepala': 'Kode'}, {'nama': 'komponen', 'kepala': 'Kelompok'},
                                                      {'nama': 'butir', 'kepala': 'Rincian'}, {'nama': 'jumlah', 'kepala': 'Jumlah (Rp)', 'fmt': '0'}],
                        'keyakinan': 'asumsi-kebijakan', 'sumber': S_MODEL}},
     'panel': {'judul': 'Cara membaca RAB', 'ikon': 'regulasi', 'skala_huruf': 1.3, 'temuan': [
         tm('Temuan E.1', 'regulasi', '**Harga satuan** mengikuti SBM 2026; tiket mengikuti tarif kereta dan pagu pesawat.', 'resmi'),
         tm('Temuan E.2', 'jiwa', '**Volume** dihitung dari itinerary: orang kali hari, kamar kali malam.'),
         tm('Temuan E.3', 'peringatan', '**Asumsi** ada pada bahan kunjungan, tol Yogyakarta ke Malang, dan kontinjensi.'),
         tm('Temuan E.4', 'data', '**Berkas Excel** RAB berumus disertakan untuk diisi bagian keuangan.'),
     ]}},

    {'jenis': 'rekomendasi', 'jenis_slide': 'rekomendasi', 'judul_bentuk': 'deskriptif', 'keputusan': True, 'sumber': 'Rancangan tim, Nov 2026',
     'pesan': 'Keputusan yang diminta',
     'judul': 'Keputusan yang diminta: setujui rute sepuluh hari dan kirim surat audiensi ke dua belas rektor pekan ini',
     'rekomendasi': [
         {'kode': 'K-1', 'jenis': 'pembiayaan', 'langkah': 'Setujui rute sepuluh hari', 'tenggat': '6 Nov 2026', 'status': 'baru',
          'rincian': 'Paling lambat 6 Nov. Kunjungan 18–27 Nov 2026 ke dua belas kampus kunci.', 'lembaga': ['Kepala BNPB'],
          'dasar': t('opt.kampus'), 'biaya': f'Pagu Rp {t("opt.pagu")} juta, perkiraan riil lebih rendah.'},
         {'kode': 'K-2', 'jenis': 'regulasi', 'langkah': 'Kirim surat audiensi ke rektor', 'tenggat': '6 Nov 2026', 'status': 'baru',
          'rincian': 'Paling lambat 6 Nov. Surat Kepala BNPB berisi jadwal dan agenda tiap kampus.',
          'lembaga': ['Biro Hukum, Organisasi, dan Kerja Sama'], 'dasar': 'slide 9', 'risiko': 'Surat terlambat membuat jadwal rektor bergeser.'},
         {'kode': 'K-3', 'jenis': 'kapasitas', 'langkah': 'Tetapkan tim dan pemesanan', 'tenggat': '9 Nov 2026', 'status': 'baru',
          'rincian': 'Paling lambat 9 Nov. Surat tugas tim tiga orang; tiket kereta dan hotel dipesan.',
          'lembaga': ['Biro Umum dan Keuangan'], 'dasar': 'slide 12', 'risiko': 'Pemesanan mendadak menaikkan tarif.'},
         {'kode': 'K-4', 'jenis': 'data', 'langkah': 'Siapkan bahan per kampus', 'tenggat': '13 Nov 2026', 'status': 'dikembangkan',
          'rincian': 'Paling lambat 13 Nov. Usulan kerja sama tiap kampus disusun dari tabel alasan.',
          'lembaga': ['Tenaga Ahli Kepala BNPB'], 'dasar': 'slide 6', 'risiko': 'Tanpa usulan, audiensi berhenti pada perkenalan.'},
         {'kode': 'K-5', 'jenis': 'infrastruktur', 'langkah': 'Paparkan hasil kunjungan', 'tenggat': '2 Des 2026', 'status': 'baru',
          'rincian': 'Paling lambat 2 Des. Daftar koordinator kampus beserta draf PKS dipaparkan kepada Kepala BNPB.',
          'lembaga': ['Tenaga Ahli Kepala BNPB'], 'dasar': t('opt.kampus'), 'risiko': 'Tanpa paparan, draf PKS tertahan di tiap kampus.'},
     ]},

    {'jenis': 'penutup', 'foto': 'foto/sampul-ugm.jpg', 'kredit': 'Foto: Alharomain354, CC BY-SA 4.0, Wikimedia Commons',
     'laporan': 'Rute Optimal Dua Belas Kampus Kunci'},

    {'jenis': 'pembatas-lampiran', 'kelompok': {'A': 'Rincian pendukung'}},
    {'jenis': 'lampiran-tabel', 'jenis_slide': 'lampiran', 'judul_bentuk': 'deskriptif', 'pesan': 'RAB rinci', 'kode': 'A1',
     'maks_baris': 20, 'judul': 'Rencana anggaran biaya rinci per butir, rupiah', 'judul_daftar': 'Rencana anggaran biaya rinci',
     'data': {'csv': c_rab, 'kolom': [{'nama': 'kode', 'kepala': 'No'}, {'nama': 'uraian', 'kepala': 'Uraian', 'rata': 'l'},
                                       {'nama': 'volume', 'kepala': 'Volume'}, {'nama': 'harga', 'kepala': 'Harga satuan', 'fmt': '0'},
                                       {'nama': 'jumlah', 'kepala': 'Jumlah', 'fmt': '0'}],
              'keyakinan': 'asumsi-kebijakan', 'sumber': f'PMK Nomor 32 Tahun 2025 tentang SBM TA 2026; {S_MODEL}'}},
    {'jenis': 'lampiran-tabel', 'jenis_slide': 'lampiran', 'judul_bentuk': 'deskriptif', 'pesan': 'Tarif dan satuan biaya', 'kode': 'A2',
     'maks_baris': 22, 'judul': 'Tarif dan satuan biaya dalam hitungan, ribu rupiah', 'judul_daftar': 'Tarif dan satuan biaya',
     'data': {'csv': c_tarif, 'kolom': [{'nama': 'item', 'kepala': 'Butir'}, {'nama': 'pagu', 'kepala': 'Pagu', 'fmt': '0'},
                                         {'nama': 'riil', 'kepala': 'Riil', 'fmt': '0'}, {'nama': 'dasar', 'kepala': 'Dasar', 'rata': 'l'}],
              'keyakinan': 'terverifikasi', 'sumber': 'PMK Nomor 32 Tahun 2025 tentang SBM TA 2026; KAI; KCIC; agregator tiket, 2026'}},
]

BAGIAN = [('Peta kampus kunci', 'Mengapa Dua Belas Kampus Ini', 'Kampus'), ('Mengapa sepuluh hari', 'Rute Searah', 'Rute'),
          ('Biaya rute optimal', 'Biaya dan Keputusan', 'Keputusan')]
for n_, (pesan_, _, _) in reversed(list(enumerate(BAGIAN, 1))):
    SLIDE.insert(next(i for i, x in enumerate(SLIDE) if x.get('pesan') == pesan_), {'jenis': 'pembatas-seksi', 'bagian': n_})
SLIDE.insert(1, {'jenis': 'daftar-isi'})

SPEK = {
    '_catatan': 'Rute optimal dua belas kampus kunci, 2 Nov 2026. Dibangun dari spek/bangun_spek_optimal.py dan optimal_model.py.',
    'arah': 'Pemilik 2 Nov 2026: rute optimal ke UI, ITB, UGM, Unair, ITS, Undip, UB, IPB, Unpad, Binus, Telkom, UMY; hari menyesuaikan; jelaskan alasannya.',
    'pesan_kunci': 'Dua belas kampus kunci dapat dikunjungi dalam sepuluh hari dengan ritme wajar, lebih singkat dan lebih hemat dari pola empat belas hari.',
    'judul_dokumen': 'Rute Optimal Dua Belas Kampus Kunci',
    'subjek_dokumen': 'Sepuluh hari ke PTN dan PTS tier satu di Jawa',
    'format': 'kajian', 'bagian': [{'judul': j_, 'label': l_} for _, j_, l_ in BAGIAN],
    'kajian': 'optimal', 'tanggal': '2026-11-02', 'cut_off': '2 Nov 2026',
    'slide': SLIDE,
}


def cek():
    from slop import TRI, TIGA_RESMI
    from deck import RE_BOLEH
    teks = []

    def jalan(x, kunci=''):
        if isinstance(x, str):
            teks.append((kunci, x))
        elif isinstance(x, dict):
            for k, v in x.items():
                if k not in ('csv', 'sumber', 'foto', 'kredit', 'jenis', 'ikon', 'nada', 'warna', 'token', 'fmt', 'kode', 'tenggat', 'dasar', 'nama', 'kunci'):
                    jalan(v, k)
        elif isinstance(x, list):
            for v in x:
                jalan(v, kunci)
    jalan(SLIDE)
    for k, s in teks:
        s2 = re.sub(r'\{\{[^}]+\}\}', 'N', s.replace('**', ''))
        for m in TRI.finditer(s2):
            g = [x.lower() for x in m.groups()]
            if not any(all(any(r in x for r in st) for x in g) for st in TIGA_RESMI):
                print('TIGA:', m.group(0), '|', s[:90])
        s3 = RE_BOLEH.sub('', re.sub(r'\{\{[^}]+\}\}', '', s))
        if re.search(r'\d', s3) and k not in ('wilayah', 'sorot', 'hari_ini', 'skala_huruf', 'label', 'rasio', 'cek_akhir'):
            print('ANGKA:', k, '|', s[:90])
    for p in Path(AKAR / 'data/optimal').glob('*.csv'):
        for ln in p.read_text(encoding='utf-8').splitlines():
            for m in TRI.finditer(ln):
                print('TIGA CSV:', p.name, m.group(0))


if __name__ == '__main__':
    p = AKAR / 'pustaka.json'
    pl = json.loads(p.read_text(encoding='utf-8'))
    pl = [x for x in pl if x['id'] not in PUSTAKA] + list(PUSTAKA.values())
    p.write_text(json.dumps(pl, ensure_ascii=False, indent=1), encoding='utf-8')
    tema = json.loads((AKAR / 'tema.json').read_text(encoding='utf-8'))
    tema['kajian']['optimal'] = {
        'judul': 'Rute Optimal Kampus Kunci', 'subjudul': 'Sepuluh Hari ke Dua Belas PTN dan PTS Tier Satu di Jawa',
        'judul_pendek': 'Rute Optimal Kampus Kunci', 'nama_berkas': 'Rute Optimal Dua Belas Kampus Kunci {DDMMYY}',
        'batas_halaman_isi': None, 'lampiran': 'ABCDEFGHIJKL',
        'kata_kunci': ['BNPB', 'perguruan tinggi', 'kunjungan kampus', 'rute', 'biaya perjalanan dinas'], 'cakupan_sampul': 'Pulau Jawa'}
    (AKAR / 'tema.json').write_text(json.dumps(tema, ensure_ascii=False, indent=1), encoding='utf-8')
    reg_p = AKAR / 'data/angka.json'
    reg = json.loads(reg_p.read_text(encoding='utf-8'))
    reg['angka'] = {k: v for k, v in reg['angka'].items() if not k.startswith('opt.')}
    reg['angka'].update(ANGKA)
    reg_p.write_text(json.dumps(reg, ensure_ascii=False, indent=1), encoding='utf-8')
    (AKAR / 'spek/optimal-021126.json').write_text(json.dumps(SPEK, ensure_ascii=False, indent=2), encoding='utf-8')
    print('xlsx', tulis_xlsx())
    cek()
    print(f'{len(ANGKA)} angka, {len(SLIDE)} slide')
