#!/usr/bin/env python3
"""Jadwal Susur Kampus Kunci (deck usulan, 2 Nov 2026): skenario 7, 10, 14 hari kalender ke 12 kampus kunci di Jawa.
Pemilik 2 Nov 2026: sedikit kampus, hanya tier 1, jadwal rasional antara kerja, persiapan, istirahat, dan menyusuri kota.
Itinerary dan biaya dihitung di kunci_model.py. Jalankan dari akar proyek-kampus: python spek/bangun_spek_kunci.py,
lalu deck.py spek/kunci-021126.json --akar .
"""
import csv
import json
import re
import sys
from pathlib import Path

AKAR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(Path(__file__).parent))
sys.path.insert(0, str(AKAR.parents[1] / 'scripts'))
import kunci_model as M  # noqa: E402

ANGKA, PUSTAKA = {}, {}
HAS = M.HASIL
SK = [7, 10, 14]
KATA = {7: 'Tujuh hari', 10: 'Sepuluh hari', 14: 'Empat belas hari'}
SING = {'Tel-U': 'Telkom U'}


def sg(k):
    return SING.get(k, k)


def pus(pid, penulis, judul, tgl, url=None):
    PUSTAKA[pid] = {'id': pid, 'type': 'webpage' if url else 'report', 'author': [{'literal': penulis}], 'issued': {'date-parts': [tgl]},
                    'title': judul, 'verifikasi': 'sekunder' if url else 'primer', **({'URL': url} if url else {})}


def a(kunci, nilai, satuan, sumber, keyakinan='asumsi-kebijakan', pid='kunci-model'):
    ANGKA[kunci] = {'nilai': nilai, 'satuan': satuan, 'pustaka': pid, 'sumber': sumber, 'keyakinan': keyakinan,
                    'tanggal_data': '2026-11-02'}


def t(kunci, opsi=''):
    assert kunci in ANGKA, kunci
    return '{{angka:%s%s}}' % (kunci, opsi)


def tulis(nama, kepala, baris):
    (AKAR / 'data/kunci').mkdir(parents=True, exist_ok=True)
    with (AKAR / 'data/kunci' / f'{nama}.csv').open('w', newline='', encoding='utf-8') as f:
        w = csv.writer(f)
        w.writerow(kepala)
        w.writerows(baris)
    return f'data/kunci/{nama}.csv'


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


def _id(x, d=0):
    return f'{x:,.{d}f}'.replace(',', '#').replace('.', ',').replace('#', '.')


pus('kunci-model', 'Tim Tenaga Ahli Kepala BNPB', 'Model jadwal dan biaya susur kampus kunci Jawa (kunci_model.py)', [2026, 11, 2])
S_MODEL = 'Hitungan tim dari SBM 2026 dan tarif KAI, KCIC, pasar, Nov 2026'
S_QS = 'QS World University Rankings 2027, Jun 2026'
S_SBM = 'PMK Nomor 32 Tahun 2025 tentang SBM TA 2026'

# ---------------------------------------------------------------- angka
a('kunci.kampus', len(M.K), 'kampus kunci', S_QS, 'terverifikasi', 'susur-qs')
a('kunci.ptn', sum(1 for v in M.K.values() if v[1] == 'PTN'), 'PTN', S_QS, 'terverifikasi', 'susur-qs')
a('kunci.pts', sum(1 for v in M.K.values() if v[1] == 'PTS'), 'PTS', S_QS, 'terverifikasi', 'susur-binus')
KOTA_N = {}
for v in M.K.values():
    KOTA_N[v[3]] = KOTA_N.get(v[3], 0) + 1
a('kunci.kota', len(KOTA_N), 'kota', S_QS, 'terverifikasi', 'susur-qs')
a('kunci.skenario', len(SK), 'skenario', S_MODEL)
a('kunci.maks', 2, 'kampus per hari', S_MODEL)
a('kunci.tim', M.TIM, 'orang', S_MODEL)
a('kunci.paket', M.PAKET_KAMPUS / 1e6, 'juta rupiah', 'Asumsi tim: bahan cetak dan cenderamata')
a('kunci.kontinjensi', int(M.KONTINJENSI * 100), 'persen', 'Asumsi tim')
a('kunci.hotel.riil', int(M.HOTEL_RIIL * 100), 'persen', 'Asumsi tim: tarif korporat hotel')
for n in SK:
    r = HAS[n]
    p = f'kunci.s{n}.'
    a(p + 'hari', r['hari'], 'hari', S_MODEL)
    a(p + 'kampus', r['kampus'], 'kampus', S_MODEL)
    a(p + 'malam', r['malam'], 'malam', S_MODEL)
    a(p + 'harik', r['hari_kampus'], 'hari kunjungan', S_MODEL)
    a(p + 'libur', r['hari_libur'], 'hari tanpa kunjungan', S_MODEL)
    a(p + 'kota', r['kota'], 'kota', S_MODEL)
    a(p + 'pts', r['pts'], 'PTS', S_MODEL)
    a(p + 'pagu', jt(r['pagu']), 'juta rupiah', S_MODEL)
    a(p + 'riil', jt(r['riil']), 'juta rupiah', S_MODEL)
    a(p + 'perkampus', jt(r['pagu'] / r['kampus'], 2), 'juta rupiah', S_MODEL)
    a(p + 'perhari', jt(r['pagu'] / r['hari'], 2), 'juta rupiah', S_MODEL)
    a(p + 'slot.k', r['slot']['K'], 'slot', S_MODEL)
    a(p + 'slot.non', sum(r['slot'][j] for j in 'IS'), 'slot', S_MODEL)

a('kunci.s14.slot.total', 3 * 14, 'slot', S_MODEL)
a('kunci.m710', jt((HAS[10]['pagu'] - HAS[7]['pagu']) / (HAS[10]['kampus'] - HAS[7]['kampus']), 2), 'juta rupiah', S_MODEL)
a('kunci.m1014', jt((HAS[14]['pagu'] - HAS[10]['pagu']) / (HAS[14]['kampus'] - HAS[10]['kampus']), 2), 'juta rupiah', S_MODEL)
a('kunci.tambah710', HAS[10]['kampus'] - HAS[7]['kampus'], 'kampus', S_MODEL)
a('kunci.tambah1014', HAS[14]['kampus'] - HAS[10]['kampus'], 'kampus', S_MODEL)
a('kunci.s10.ptn', sum(1 for k in HAS[10]['aud'] if M.K[k][1] == 'PTN'), 'PTN', S_MODEL)
a('kunci.s14.p1', sum(len(h['aud']) for h in M.S14[:7]), 'kampus', S_MODEL)
a('kunci.s14.p2', sum(len(h['aud']) for h in M.S14[7:]), 'kampus', S_MODEL)
# ---------------------------------------------------------------- CSV
RAYA = {'Jakarta': 'Jabodetabek', 'Depok': 'Jabodetabek', 'Bogor': 'Jabodetabek', 'Bandung': 'Bandung raya', 'Jatinangor': 'Bandung raya'}
KOTA_XY = {'Jabodetabek': (106.78, -6.37), 'Bandung raya': (107.68, -6.92), 'Yogyakarta': (110.39, -7.77), 'Semarang': (110.44, -7.05),
           'Surabaya': (112.78, -7.28), 'Malang': (112.61, -7.95)}
RAYA_N = {}
for v in M.K.values():
    RAYA_N[RAYA.get(v[3], v[3])] = RAYA_N.get(RAYA.get(v[3], v[3]), 0) + 1
c_kota = tulis('kota', ['kota', 'kampus', 'lon', 'lat'],
               [[k, n, KOTA_XY[k][0], KOTA_XY[k][1]] for k, n in sorted(RAYA_N.items(), key=lambda x: -x[1])])
c_cakup = tulis('cakupan', ['kampus'] + [f's{n}' for n in SK],
                [[f'{sg(k)} ({v[1]})'] + ['Dikunjungi' if k in HAS[n]['aud'] else 'Tidak' for n in SK] for k, v in M.K.items()])
c_ritme = tulis('ritme', ['kegiatan', 'kelompok', 'mulai', 'selesai', 'tonggak'], [
    ['Sarapan dan briefing tim', 'Pagi', 7, 7, ''],
    ['Berangkat ke kampus', 'Pagi', 8, 8, ''],
    ['Audiensi rektor', 'Pagi', 9, 10, 10],
    ['Temu pusat studi dan laboratorium', 'Pagi', 11, 11, ''],
    ['Makan siang dan rekap', 'Siang', 12, 13, ''],
    ['Kampus kedua atau istirahat', 'Siang', 14, 15, ''],
    ['Susur kota atau istirahat', 'Sore dan malam', 16, 18, ''],
    ['Makan malam', 'Sore dan malam', 19, 19, ''],
    ['Notula dan persiapan esok', 'Sore dan malam', 20, 21, 21],
])
c_slot = tulis('slot', ['skenario'] + list(M.JENIS), [[KATA[n]] + [HAS[n]['slot'][j] for j in M.JENIS] for n in SK])
c_hari = tulis('hari', ['skenario', 'harik', 'libur', 'maks'],
               [[KATA[n], HAS[n]['hari_kampus'], HAS[n]['hari_libur'], max(len(h['aud']) for h in M.SKENARIO[n])] for n in SK])


def itin(nama, hari, mulai=1, nomor=False):
    return tulis(nama, ['hari', 'kota', 'pagi', 'siang', 'malam'],
                 [[(f'H{i} ' if nomor else '') + h['tgl'], h['kota'], h['pagi'], h['siang'], h['malam']] for i, h in enumerate(hari, mulai)])


c_it7, c_it10 = itin('itin7', M.S7), itin('itin10', M.S10)
c_it14a, c_it14b = itin('itin14a', M.S14[:7]), itin('itin14b', M.S14[7:], 8)
c_it14 = tulis('itin_semua', ['hari', 'kota', 'pagi', 'siang', 'malam'],
               [[f'{KATA[n]}, {h["tgl"]}', h['kota'], h['pagi'], h['siang'], h['malam']] for n in SK for h in M.SKENARIO[n]])
for n in SK:
    HAS[n]['transport'] = HAS[n]['tiket_p'] + HAS[n]['lokal']
KOMP = [('transport', 'Transport'), ('inap_p', 'Penginapan'), ('uh', 'Uang harian'), ('paket', 'Bahan kunjungan'), ('kontin_p', 'Kontinjensi')]
c_biaya = tulis('biaya', ['skenario'] + [k for k, _ in KOMP], [[KATA[n]] + [jt(HAS[n][k], 3) for k, _ in KOMP] for n in SK])
c_per = tulis('per', ['skenario', 'perhari', 'perkampus'], [[KATA[n], jt(HAS[n]['pagu'] / n, 2), jt(HAS[n]['pagu'] / HAS[n]['kampus'], 2)] for n in SK])
RINCI = [('tiket_p', 'Tiket antarkota'), ('sewa', 'Sewa mobil dan sopir'), ('tol', 'Tol'), ('trf', 'Transport ke stasiun dan bandara Jakarta'),
         ('inap_p', 'Penginapan (pagu)'), ('uh', 'Uang harian'), ('paket', 'Bahan dan cenderamata'), ('kontin_p', 'Kontinjensi'),
         ('pagu', 'Total pagu usulan'), ('tiket_r', 'Tiket antarkota (riil)'), ('inap_r', 'Penginapan (riil)'), ('kontin_r', 'Kontinjensi (riil)'),
         ('riil', 'Perkiraan riil')]
for n in SK:
    assert abs(sum(HAS[n][k] for k, _ in RINCI[:8]) - HAS[n]['pagu']) < 1
c_rinci = tulis('rinci', ['komponen'] + [f's{n}' for n in SK], [[l] + [jt(HAS[n][k], 2) for n in SK] for k, l in RINCI]
                + [['Pagu per hari'] + [jt(HAS[n]['pagu'] / n, 2) for n in SK], ['Pagu per kampus'] + [jt(HAS[n]['pagu'] / HAS[n]['kampus'], 2) for n in SK],
                   ['Riil per hari'] + [jt(HAS[n]['riil'] / n, 2) for n in SK], ['Riil per kampus'] + [jt(HAS[n]['riil'] / HAS[n]['kampus'], 2) for n in SK]])
import susur_model as SM  # noqa: E402
c_semua = tulis('semua', ['kode', 'nama', 'jenis', 'kota', 'qs', 'peran'],
                [[{'Tel-U': 'Telkom U', 'UAJ': 'Atma Jaya', 'UPNVY': 'UPN Veteran Yogyakarta', 'UPNJ': 'UPN Veteran Jatim', 'UINJ': 'UIN Jakarta'}.get(k, k),
                  v[0], v[1], v[3], v[5].replace('1401+', 'di luar 1400 besar'), 'Kunci, dikunjungi' if k in M.K else 'Diajak daring']
                 for k, v in sorted(SM.K.items(), key=lambda kv: (kv[0] not in M.K, list(SM.K).index(kv[0])))])
c_kampus = tulis('kampus', ['kode', 'nama', 'jenis', 'kota', 'qs27', 'qs26', 'unit'],
                 [[sg(k), v[0], v[1], v[3], v[5], str(M.QS26.get(k, '–')) if k in M.QS26 else {'Binus': '851–900', 'Tel-U': '1001–1200', 'UMY': '1201–1400'}[k], v[7]]
                  for k, v in M.K.items()])
LBL = {'WH': 'Whoosh Jakarta ke Bandung', 'KA-BDG-YK': 'KA Bandung ke Yogyakarta', 'KA-YK-SUB': 'KA Yogyakarta ke Surabaya',
       'KA-SMG-JKT': 'KA Semarang ke Jakarta', 'KA-SMG-SUB': 'KA Semarang ke Surabaya', 'SUB-CGK': 'Pesawat Surabaya ke Jakarta'}
c_tarif = tulis('tarif', ['item', 'pagu', 'riil', 'dasar'],
                [[LBL[k], M.TIKET[k][0] / 1e3, M.TIKET[k][1] / 1e3, M.TIKET[k][2]] for k in LBL]
                + [['Tol Yogyakarta ke Semarang', M.TOL['Yogyakarta ke Semarang'] / 1e3, M.TOL['Yogyakarta ke Semarang'] / 1e3, 'jumlah ruas Solo; Kompas TV mengutip BPJT'],
                   ['Tol Surabaya ke Malang', M.TOL['Surabaya ke Malang'] / 1e3, M.TOL['Surabaya ke Malang'] / 1e3, 'perkiraan Auto2000, 2026'],
                   ['Transport rumah ke stasiun atau bandara', M.TRANSFER_DKI / 1e3, M.TRANSFER_DKI / 1e3, 'SBM DKI, per orang per kali'],
                   ['Bahan dan cenderamata per kampus', M.PAKET_KAMPUS / 1e3, M.PAKET_KAMPUS / 1e3, 'asumsi tim']]
                + [[f'Sewa mobil dan sopir, {M.PROV_NAMA[p]}', M.SEWA[p] / 1e3, M.SEWA[p] / 1e3, 'SBM, per hari, termasuk BBM'] for p in ('DKI', 'Jabar', 'Jateng', 'DIY', 'Jatim')]
                + [[f'Hotel golongan IV, {M.PROV_NAMA[p]}', M.HOTEL_TA[p] / 1e3, M.HOTEL_TA[p] * M.HOTEL_RIIL / 1e3, 'SBM; riil delapan puluh persen'] for p in ('Jabar', 'DIY')])

KOL_HARI = [{'nama': 'hari', 'kepala': 'Hari'}, {'nama': 'kota', 'kepala': 'Kota'}, {'nama': 'pagi', 'kepala': 'Pagi'},
            {'nama': 'siang', 'kepala': 'Siang'}, {'nama': 'malam', 'kepala': 'Sore dan malam'}]


def grup_biaya(n):
    p = f'kunci.s{n}.'
    return [{'pil': 'Biaya dan ritme', 'nada': 'data', 'ikon': 'pembiayaan', 'kartu': [
        kt('Rp ' + t(p + 'pagu') + ' juta', 'pagu usulan, tim tiga orang', 'pembiayaan', 'oranye'),
        kt(t(p + 'kampus'), 'kampus kunci dikunjungi', 'sekolah'),
        kt(t(p + 'malam'), 'malam menginap', 'rumah'),
        kt(t(p + 'libur'), 'hari tanpa kunjungan kampus', 'kalender')]}]


def itin_slide(n, csv_, judul, judul_panel, pesan, grup=True):
    s = {'jenis': 'temuan-visual', 'jenis_slide': 'tabel', 'judul_bentuk': 'temuan', 'seri': 'itinerary', 'pesan': pesan,
         'cut_off': False, 'sumber': S_MODEL, 'judul': judul,
         'utama': {'judul': judul_panel, 'ikon': 'kalender',
                   'heatmap': {'mode': 'teks', 'skala_huruf': 1.0,
                               'data': {'csv': csv_, 'kolom': KOL_HARI, 'keyakinan': 'asumsi-kebijakan', 'sumber': S_MODEL}}}}
    if grup:
        s['grup'] = grup_biaya(n)
    return s


SLIDE = [
    {'jenis': 'sampul', 'layout': 'putih', 'judul_penuh': True, 'skala_subjudul': 0.85, 'foto': 'foto/sampul-ugm.jpg',
     'kepada': 'Disampaikan kepada Kepala Badan Nasional Penanggulangan Bencana',
     'kredit': 'Foto: Alharomain354, CC BY-SA 4.0, Wikimedia Commons', 'kota': 'Jakarta',
     'penyaji': {'nama': 'Alfatehan Septianta', 'jabatan': 'Tenaga Ahli Kepala BNPB Bidang Riset, Inovasi dan Kerja Sama Perguruan Tinggi'}},

    {'jenis': 'galeri', 'jenis_slide': 'navigasi', 'judul_bentuk': 'deskriptif', 'pesan': 'Ringkasan jadwal',
     'sumber': 'Hitungan tim, Nov 2026; QS WUR 2027', 'cut_off': False, 'skala_huruf': 1.5,
     'judul': f'Sepuluh hari menjangkau semua {t("kunci.s10.ptn")} PTN kunci ditambah UMY, dengan {t("kunci.s10.libur", "|satuan")} untuk perjalanan jauh dan istirahat',
     'grup': [{'pil': 'Angka kunci', 'nada': 'data', 'ikon': 'ringkasan', 'kartu': [
         kt(t('kunci.kampus'), 'kampus kunci tier satu', 'sekolah'),
         kt(t('kunci.maks', '|satuan'), 'paling banyak, bila searah', 'kalender'),
         kt('Rp ' + t('kunci.s10.pagu') + ' juta', 'pagu usulan sepuluh hari', 'pembiayaan', 'oranye')]}],
     'panel': [
         {'judul': 'Kampus kunci', 'ikon': 'sekolah', 'nada': 'kendala', 'temuan': [
             tm('Temuan A.1', 'sekolah', f'**{t("kunci.ptn")} PTN** dengan peringkat QS 2027 tujuh ratus besar dunia.', 'terverifikasi'),
             tm('Temuan A.2', 'lembaga', f'**{t("kunci.pts")} PTS** teratas di QS 2027: Binus, Telkom University, UMY.', 'terverifikasi'),
             tm('Temuan A.3', 'wilayah', f'**{t("kunci.kota", "|satuan")}** dari Bogor sampai Malang.', 'terverifikasi'),
         ]},
         {'judul': 'Ritme', 'ikon': 'kalender', 'nada': 'capaian', 'temuan': [
             tm('Temuan B.1', 'kalender', '**Pagi untuk kampus**; sore dipakai rekap atau menyusuri kota.'),
             tm('Temuan B.2', 'jiwa', '**Akhir pekan** dipakai untuk istirahat dan perjalanan jauh.'),
             tm('Temuan B.3', 'peringatan', '**Malam** untuk notula dan persiapan kampus esok hari.'),
         ]},
         {'judul': 'Keputusan', 'ikon': 'regulasi', 'nada': 'tindak', 'temuan': [
             tm('Temuan C.1', 'regulasi', '**Setujui skenario sepuluh hari**, 16–25 Nov 2026.'),
             tm('Temuan C.2', 'pembiayaan', f'**Pagu Rp {t("kunci.s10.pagu")} juta**, perkiraan riil Rp {t("kunci.s10.riil")} juta.'),
             tm('Temuan C.3', 'kalender', '**Surat audiensi** dikirim paling lambat 6 Nov.'),
         ]}]},

    # ---- Bagian 1: kampus kunci
    {'jenis': 'temuan-visual', 'jenis_slide': 'peta', 'judul_bentuk': 'temuan', 'rasio': 0.64,
     'pesan': 'Peta kampus kunci', 'cut_off': False, 'sumber': f'{S_QS}; laman kampus, Nov 2026',
     'judul': f'Dua belas kampus kunci berada di {t("kunci.kota", "|satuan")}; Jabodetabek dan Bandung raya masing-masing punya tiga',
     'utama': {'judul': 'Kampus kunci per kota', 'ikon': 'wilayah', 'peta': {
         'mode': 'titik', 'wilayah': ['31', '32', '33', '34', '35', '36'], 'skala': 'emas', 'satuan': 'Jumlah kampus kunci',
         'label': 6, 'skala_huruf': 1.15,
         'data': {'csv': c_kota, 'kolom': [{'nama': 'kota'}, {'nama': 'kampus', 'kepala': 'Kampus', 'fmt': '0'},
                                            {'nama': 'lon', 'fmt': '2'}, {'nama': 'lat', 'fmt': '2'}],
                  'keyakinan': 'terverifikasi', 'sumber': S_QS}}},
     'panel': {'judul': 'Cara memilih', 'ikon': 'sekolah', 'skala_huruf': 1.3, 'temuan': [
         tm('Temuan A.1', 'sekolah', f'**PTN tier satu.** {t("kunci.ptn")} PTN Jawa di tujuh ratus besar QS 2027, dari UI sampai Undip.', 'terverifikasi'),
         tm('Temuan A.2', 'lembaga', f'**PTS tier satu.** {t("kunci.pts")} PTS Jawa teratas di QS 2027; PTN tetap didahulukan.', 'terverifikasi'),
         tm('Temuan A.3', 'regulasi', '**Kampus lain** diajak lewat surat dan audiensi daring, tanpa kunjungan.', 'penilaian-pakar'),
         tm('Temuan A.4', 'peringatan', '**Urutan rute** mengikuti jalur kereta dari barat ke timur.', 'penilaian-pakar'),
     ]}},

    {'jenis': 'temuan-visual', 'jenis_slide': 'matriks', 'judul_bentuk': 'temuan', 'rasio': 0.64,
     'pesan': 'Cakupan per skenario', 'cut_off': False, 'sumber': S_MODEL,
     'judul': f'Tujuh hari mencakup {t("kunci.s7.kampus")} kampus; sepuluh hari {t("kunci.s10.kampus")} kampus; empat belas hari semua {t("kunci.s14.kampus")} kampus kunci',
     'utama': {'judul': 'Kampus yang dikunjungi tiap skenario', 'ikon': 'sekolah', 'heatmap': {
         'mode': 'kategori', 'ramp': 'netral', 'skala_huruf': 1.0,
         'kelas': [{'kunci': 'Tidak', 'label': 'Tidak', 'token': 'skala.netral.1'}, {'kunci': 'Dikunjungi', 'label': 'Dikunjungi', 'token': 'skala.netral.5'}],
         'data': {'csv': c_cakup, 'kolom': [{'nama': 'kampus', 'kepala': 'Kampus'}] + [{'nama': f's{n}', 'kepala': KATA[n]} for n in SK],
                  'keyakinan': 'asumsi-kebijakan', 'sumber': S_MODEL}}},
     'panel': {'judul': 'Yang bertambah', 'ikon': 'wilayah', 'skala_huruf': 1.3, 'temuan': [
         tm('Temuan B.1', 'wilayah', '**Tujuh hari.** Jakarta, Bandung, Yogyakarta, lalu Semarang; Jawa Timur belum.'),
         tm('Temuan B.2', 'sekolah', '**Sepuluh hari.** Menambah IPB serta tiga PTN Jawa Timur; semua PTN kunci masuk.'),
         tm('Temuan B.3', 'lembaga', '**Empat belas hari.** Menambah Binus dan Telkom University, dengan dua akhir pekan.'),
         tm('Temuan B.4', 'peringatan', '**Kampus Jakarta** dikunjungi dari rumah, tanpa menginap.'),
     ]}},

    # ---- Bagian 2: ritme
    {'jenis': 'temuan-visual', 'jenis_slide': 'panel', 'judul_bentuk': 'temuan',
     'pesan': 'Prinsip jadwal', 'cut_off': False, 'sumber': 'Rancangan tim, Nov 2026',
     'judul': f'Tujuh aturan jadwal menjaga tim tetap segar: paling banyak {t("kunci.maks", "|satuan")} dan istirahat tiap akhir pekan',
     'utama': {'judul': 'Aturan menyusun jadwal', 'ikon': 'kalender', 'daftar_ikon': {'mode': 'baris', 'baris': [
         {'ikon': 'sekolah', 'judul': 'Kampus di pagi hari', 'isi': 'Audiensi rektor mulai pukul 09.00 atau pukul 10.00; kampus kedua hanya bila searah, tempuh paling lama sekitar satu jam.',
          'angka': t('kunci.maks'), 'satuan': 'kampus per hari, paling banyak'},
         {'ikon': 'kalender', 'judul': 'Perjalanan jauh di hari tanpa kampus', 'isi': 'Kereta antarkota berangkat pagi; sisa hari dipakai istirahat dan persiapan kampus berikutnya.'},
         {'ikon': 'data', 'judul': 'Malam untuk notula dan persiapan', 'isi': 'Notula hari itu selesai sebelum tidur; profil kampus esok dibaca ulang bersama.'},
         {'ikon': 'jiwa', 'judul': 'Akhir pekan untuk istirahat', 'angka': t('kunci.s10.libur'), 'satuan': 'hari tanpa kampus dalam sepuluh hari', 'isi': 'Sabtu atau Minggu tanpa agenda resmi; bila perlu, perjalanan jauh dipindah ke akhir pekan.'},
         {'ikon': 'lembaga', 'judul': 'Satu penanggung jawab per kampus', 'isi': 'Tiap anggota tim memegang profil dan notula kampus tertentu sejak persiapan sampai tindak lanjut.'},
         {'ikon': 'peringatan', 'judul': 'Cadangan waktu di tiap kota', 'isi': 'Satu slot kosong di tiap kota untuk audiensi yang bergeser jam atau hari.'},
         {'ikon': 'wilayah', 'judul': 'Susur kota yang bernilai kebencanaan', 'isi': 'Museum Geologi Bandung, Museum Gunungapi Merapi, Polder Tawang Semarang; dibiayai uang harian.'},
     ]}}},

    {'jenis': 'temuan-visual', 'jenis_slide': 'grafik', 'judul_bentuk': 'deskriptif', 'rasio': 0.66,
     'pesan': 'Satu hari kunjungan', 'cut_off': False, 'sumber': 'Rancangan tim, Nov 2026',
     'judul': 'Satu hari kunjungan berjalan dari briefing pagi sampai notula malam, dengan sore yang longgar',
     'utama': {'judul': 'Jadwal satu hari kunjungan, jam', 'ikon': 'kalender', 'linimasa': {
         'hari_ini': 9, 'kepala_kegiatan': 'Kegiatan', 'ket_batang': 'Waktu kegiatan', 'ket_tonggak': 'Hasil tertulis',
         'ket_hari_ini': 'Audiensi dimulai', 'skala_huruf': 1.2,
         'data': {'csv': c_ritme, 'kolom': [{'nama': 'kegiatan'}, {'nama': 'kelompok'}, {'nama': 'mulai', 'fmt': '0'},
                                             {'nama': 'selesai', 'fmt': '0'}, {'nama': 'tonggak', 'fmt': '0'}],
                  'keyakinan': 'asumsi-kebijakan', 'sumber': 'Rancangan tim, Nov 2026'}}},
     'panel': {'judul': 'Hari tanpa kampus', 'ikon': 'jiwa', 'skala_huruf': 1.3, 'temuan': [
         tm('Temuan B.1', 'kalender', '**Hari perjalanan.** Kereta pagi, tiba siang, sore istirahat.'),
         tm('Temuan B.2', 'data', '**Hari rekap.** Notula digabung jadi draf tindak lanjut per kampus.'),
         tm('Temuan B.3', 'wilayah', '**Hari susur kota.** Museum dan kawasan rawan bencana setempat.'),
         tm('Temuan B.4', 'jiwa', '**Hari istirahat.** Tanpa agenda; tim boleh pulang bila di Jakarta.'),
     ]}},

    {'jenis': 'temuan-visual', 'jenis_slide': 'matriks', 'judul_bentuk': 'temuan', 'rasio': 0.62,
     'pesan': 'Komposisi waktu', 'cut_off': False, 'sumber': S_MODEL,
     'judul': f'Pada empat belas hari, kunjungan kampus hanya {t("kunci.s14.slot.k")} dari {t("kunci.s14.slot.total")} slot; istirahat dan susur kota {t("kunci.s14.slot.non")} slot',
     'utama': {'judul': 'Slot pagi, siang, malam menurut jenis kegiatan', 'ikon': 'kalender', 'kolom_tumpuk': {
         'data': {'csv': c_slot, 'kolom': [{'nama': 'skenario'}] + [{'nama': j, 'kepala': l, 'fmt': '0'} for j, l in M.JENIS.items()],
                  'keyakinan': 'asumsi-kebijakan', 'sumber': S_MODEL}}},
     'panel': {'judul': 'Hari kampus dan hari tanpa kampus', 'ikon': 'kalender', 'skala_huruf': 1.3, 'temuan': [
         tm('Temuan B.1', 'kalender', f'**Tujuh hari.** {t("kunci.s7.harik", "|satuan")}; {t("kunci.s7.libur", "|satuan")}.'),
         tm('Temuan B.2', 'kalender', f'**Sepuluh hari.** {t("kunci.s10.harik", "|satuan")}; {t("kunci.s10.libur", "|satuan")}.'),
         tm('Temuan B.3', 'kalender', f'**Empat belas hari.** {t("kunci.s14.harik", "|satuan")}; {t("kunci.s14.libur", "|satuan")}.'),
         tm('Temuan B.4', 'sekolah', f'**Batas.** Paling banyak {t("kunci.maks", "|satuan")}, hanya bila searah.'),
         tm('Temuan B.5', 'wilayah', '**Susur kota** mengisi sore hari kunjungan maupun hari bebas.'),
     ]}},

    # ---- Bagian 3: skenario
    itin_slide(7, c_it7, f'Tujuh hari: {t("kunci.s7.kampus")} kampus di barat dan tengah Jawa; hari terakhir di Semarang untuk rekap serta susur kota',
               'Skenario Ringkas, 16–22 Nov 2026', 'Skenario tujuh hari'),
    itin_slide(10, c_it10, f'Sepuluh hari: {t("kunci.s10.kampus")} kampus termasuk semua PTN kunci; akhir pekan di Semarang untuk istirahat dan rekap',
               'Skenario Seimbang, 16–25 Nov 2026', 'Skenario sepuluh hari'),
    itin_slide(14, c_it14a, f'Empat belas hari, pekan pertama: {t("kunci.s14.p1")} kampus di Jabodetabek dan Bandung raya, lalu akhir pekan di Yogyakarta',
               'Skenario Lengkap, pekan pertama, 16–22 Nov 2026', 'Skenario empat belas hari pekan pertama'),
    itin_slide(14, c_it14b, f'Empat belas hari, pekan kedua: {t("kunci.s14.p2")} kampus dari Yogyakarta sampai Malang, lalu pulang hari Minggu',
               'Skenario Lengkap, pekan kedua, 23–29 Nov 2026', 'Skenario empat belas hari pekan kedua', grup=False),

    # ---- Bagian 4: biaya dan keputusan
    {'jenis': 'temuan-visual', 'jenis_slide': 'grafik', 'judul_bentuk': 'temuan', 'rasio': 0.67,
     'pesan': 'Biaya tiga skenario', 'cut_off': False, 'sumber': S_MODEL,
     'judul': f'Tiap kampus tambahan dari tujuh ke sepuluh hari Rp {t("kunci.m710", "|fmt=2")} juta; dari sepuluh ke empat belas hari naik ke Rp {t("kunci.m1014", "|fmt=2")} juta',
     'utama': {'judul': 'Pagu usulan menurut komponen, Rp juta', 'ikon': 'pembiayaan', 'kolom_tumpuk': {
         'data': {'csv': c_biaya, 'kolom': [{'nama': 'skenario'}] + [{'nama': k, 'kepala': l, 'fmt': '1'} for k, l in KOMP],
                  'keyakinan': 'asumsi-kebijakan', 'sumber': S_MODEL}}},
     'panel': {'judul': 'Mengapa sepuluh hari', 'ikon': 'sekolah', 'skala_huruf': 1.3, 'temuan': [
         tm('Temuan C.1', 'sekolah', f'**Tujuh ke sepuluh hari** menambah {t("kunci.tambah710", "|satuan")}, semuanya PTN kunci.'),
         tm('Temuan C.2', 'lembaga', f'**Sepuluh ke empat belas hari** menambah {t("kunci.tambah1014", "|satuan")}, keduanya PTS.'),
         tm('Temuan C.3', 'pembiayaan', f'**Sepuluh hari** paling hemat: Rp {t("kunci.s10.perkampus", "|fmt=2")} juta per kampus.'),
         tm('Temuan C.4', 'rumah', f'**Akhir pekan** di luar kota tetap kena hotel dan uang harian; kontinjensi {t("kunci.kontinjensi", "|persen")}.'),
     ]}},

    {'jenis': 'temuan-visual', 'jenis_slide': 'panel', 'judul_bentuk': 'deskriptif', 'rasio': 0.68,
     'pesan': 'Persiapan dan risiko', 'cut_off': False, 'sumber': 'Rancangan tim, Nov 2026; BMKG, Okt 2026',
     'judul': 'Persiapan dimulai pekan ini; jadwal rektor dan cuaca menjadi risiko terbesar',
     'utama': {'judul': 'Urutan persiapan', 'ikon': 'kalender', 'alur': {'sorot': 0, 'label_hasil': 'Hasil', 'skala_huruf': 2.0, 'langkah': [
         {'judul': 'Pekan ini', 'butir': ['Surat audiensi', 'Konfirmasi rektor'], 'pelaku': 'Biro Hukum', 'hasil': 'Jadwal terkunci'},
         {'judul': 'Sepekan sebelum', 'butir': ['Pesan tiket', 'Profil kampus'], 'pelaku': 'Tim', 'hasil': 'Bahan siap'},
         {'judul': 'Selama perjalanan', 'butir': ['Notula harian', 'Rekap pekanan'], 'pelaku': 'Tim', 'hasil': 'Notula'},
         {'judul': 'Sepekan sesudah', 'butir': ['Draf PKS', 'Paparan hasil'], 'pelaku': 'Tenaga Ahli', 'hasil': 'Draf PKS'}]}},
     'panel': {'judul': 'Risiko', 'ikon': 'peringatan', 'skala_huruf': 1.3, 'temuan': [
         tm('Temuan C.1', 'kalender', '**Jadwal rektor bergeser.** Wakil rektor atau kepala pusat studi menjadi pengganti.'),
         tm('Temuan C.2', 'banjir', '**Hujan mulai naik akhir November.** Peringatan BMKG dicek sehari sebelumnya.', 'terverifikasi'),
         tm('Temuan C.3', 'jiwa', '**Tim lelah.** Hari istirahat tidak diisi agenda tambahan.'),
         tm('Temuan C.4', 'pembiayaan', '**Tarif tiket naik.** Kereta dan pesawat dipesan paling lambat 9 Nov.'),
     ]}},

    {'jenis': 'rekomendasi', 'jenis_slide': 'rekomendasi', 'judul_bentuk': 'deskriptif', 'keputusan': True, 'sumber': 'Rancangan tim, Nov 2026',
     'pesan': 'Keputusan yang diminta',
     'judul': 'Keputusan yang diminta: setujui skenario sepuluh hari dan kirim surat audiensi pekan ini',
     'rekomendasi': [
         {'kode': 'K-1', 'jenis': 'pembiayaan', 'langkah': 'Setujui skenario sepuluh hari', 'tenggat': '6 Nov 2026', 'status': 'baru',
          'rincian': 'Paling lambat 6 Nov. Kunjungan 16–25 Nov 2026 ke semua PTN kunci dan UMY.', 'lembaga': ['Kepala BNPB'],
          'dasar': t('kunci.s10.kampus'), 'biaya': f'Pagu Rp {t("kunci.s10.pagu")} juta, perkiraan riil lebih rendah.'},
         {'kode': 'K-2', 'jenis': 'regulasi', 'langkah': 'Kirim surat audiensi ke rektor', 'tenggat': '6 Nov 2026', 'status': 'baru',
          'rincian': 'Paling lambat 6 Nov. Surat Kepala BNPB berisi jadwal dan agenda tiap kampus.',
          'lembaga': ['Biro Hukum, Organisasi, dan Kerja Sama'], 'dasar': 'slide 13', 'risiko': 'Surat terlambat membuat jadwal rektor bergeser.'},
         {'kode': 'K-3', 'jenis': 'kapasitas', 'langkah': 'Tetapkan tim dan pemesanan', 'tenggat': '9 Nov 2026', 'status': 'baru',
          'rincian': 'Paling lambat 9 Nov. Surat tugas tim tiga orang; tiket kereta dan hotel dipesan.',
          'lembaga': ['Biro Umum dan Keuangan'], 'dasar': 'slide 17', 'risiko': 'Pemesanan mendadak menaikkan tarif.'},
         {'kode': 'K-4', 'jenis': 'data', 'langkah': 'Siapkan bahan kunjungan', 'tenggat': '13 Nov 2026', 'status': 'dikembangkan',
          'rincian': 'Paling lambat 13 Nov. Profil tiap kampus kunci dan bank masalah riset unit BNPB.',
          'lembaga': ['Tenaga Ahli Kepala BNPB'], 'dasar': 'slide 18', 'risiko': 'Tanpa bahan, audiensi berhenti pada perkenalan.'},
         {'kode': 'K-5', 'jenis': 'infrastruktur', 'langkah': 'Paparkan hasil kunjungan', 'tenggat': '2 Des 2026', 'status': 'baru',
          'rincian': 'Paling lambat 2 Des. Daftar koordinator kampus beserta draf PKS dipaparkan kepada Kepala BNPB.',
          'lembaga': ['Tenaga Ahli Kepala BNPB'], 'dasar': t('kunci.s10.kampus'), 'risiko': 'Tanpa paparan, draf PKS tertahan di tiap kampus.'},
     ]},

    {'jenis': 'penutup', 'foto': 'foto/sampul-ugm.jpg', 'kredit': 'Foto: Alharomain354, CC BY-SA 4.0, Wikimedia Commons',
     'laporan': 'Jadwal Susur Kampus Kunci'},

    {'jenis': 'pembatas-lampiran', 'kelompok': {'A': 'Rincian pendukung'}},
    {'jenis': 'lampiran-tabel', 'jenis_slide': 'lampiran', 'judul_bentuk': 'deskriptif', 'pesan': 'Daftar kampus', 'kode': 'A1',
     'maks_baris': 20, 'judul': 'Dua belas kampus kunci dikunjungi; kampus lain diajak lewat surat dan audiensi daring', 'judul_daftar': 'Kampus kunci dan kampus daring',
     'data': {'csv': c_semua, 'kolom': [{'nama': 'kode', 'kepala': 'Kampus'}, {'nama': 'nama', 'kepala': 'Nama resmi', 'rata': 'l'},
                                         {'nama': 'jenis', 'kepala': 'Jenis'}, {'nama': 'kota', 'kepala': 'Kota'},
                                         {'nama': 'qs', 'kepala': 'QS 2027'}, {'nama': 'peran', 'kepala': 'Peran', 'rata': 'l'}],
              'keyakinan': 'penilaian-pakar', 'sumber': f'{S_QS}; laman kampus, Nov 2026'}},
    {'jenis': 'lampiran-tabel', 'jenis_slide': 'lampiran', 'judul_bentuk': 'deskriptif', 'pesan': 'Itinerary tiga skenario', 'kode': 'A2',
     'maks_baris': 16, 'judul': 'Itinerary harian tiga skenario', 'judul_daftar': 'Itinerary harian tiga skenario',
     'data': {'csv': c_it14, 'kolom': KOL_HARI, 'keyakinan': 'asumsi-kebijakan', 'sumber': S_MODEL}},
    {'jenis': 'lampiran-tabel', 'jenis_slide': 'lampiran', 'judul_bentuk': 'deskriptif', 'pesan': 'Rincian biaya', 'kode': 'A3',
     'maks_baris': 18, 'judul': 'Rincian biaya per komponen dan skenario, juta rupiah', 'judul_daftar': 'Rincian biaya',
     'data': {'csv': c_rinci, 'kolom': [{'nama': 'komponen', 'kepala': 'Komponen'}] + [{'nama': f's{n}', 'kepala': KATA[n], 'fmt': '2'} for n in SK],
              'keyakinan': 'asumsi-kebijakan', 'sumber': S_MODEL}},
    {'jenis': 'lampiran-tabel', 'jenis_slide': 'lampiran', 'judul_bentuk': 'deskriptif', 'pesan': 'Tarif dan satuan biaya', 'kode': 'A4',
     'maks_baris': 20, 'judul': 'Tarif dan satuan biaya dalam hitungan, ribu rupiah', 'judul_daftar': 'Tarif dan satuan biaya',
     'data': {'csv': c_tarif, 'kolom': [{'nama': 'item', 'kepala': 'Butir'}, {'nama': 'pagu', 'kepala': 'Pagu', 'fmt': '0'},
                                         {'nama': 'riil', 'kepala': 'Riil', 'fmt': '0'}, {'nama': 'dasar', 'kepala': 'Dasar', 'rata': 'l'}],
              'keyakinan': 'terverifikasi', 'sumber': f'{S_SBM}; KAI; KCIC; agregator tiket, 2026'}},
]

BAGIAN = [('Peta kampus kunci', 'Kampus Kunci', 'Kampus'), ('Prinsip jadwal', 'Ritme Kerja dan Istirahat', 'Ritme'),
          ('Skenario tujuh hari', 'Tiga Skenario', 'Skenario'), ('Biaya tiga skenario', 'Biaya dan Keputusan', 'Keputusan')]
for n_, (pesan_, _, _) in reversed(list(enumerate(BAGIAN, 1))):
    SLIDE.insert(next(i for i, x in enumerate(SLIDE) if x.get('pesan') == pesan_), {'jenis': 'pembatas-seksi', 'bagian': n_})
SLIDE.insert(1, {'jenis': 'daftar-isi'})

SPEK = {
    '_catatan': 'Jadwal susur kampus kunci, 2 Nov 2026. Dibangun dari spek/bangun_spek_kunci.py dan kunci_model.py.',
    'arah': 'Pemilik 2 Nov 2026: file baru, skenario 7 sampai 10/14 hari; sedikit kampus, hanya tier 1; jadwal rasional antara kerja, persiapan, istirahat, dan menyusuri kota.',
    'pesan_kunci': 'Sepuluh hari ke sepuluh kampus kunci memberi ritme yang wajar: pagi untuk kampus, sore dan akhir pekan untuk rekap, istirahat, dan menyusuri kota.',
    'judul_dokumen': 'Jadwal Susur Kampus Kunci',
    'subjek_dokumen': 'Skenario tujuh, sepuluh, empat belas hari ke PTN dan PTS tier satu di Jawa',
    'format': 'kajian', 'bagian': [{'judul': j_, 'label': l_} for _, j_, l_ in BAGIAN],
    'kajian': 'kunci', 'tanggal': '2026-11-02', 'cut_off': '2 Nov 2026',
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
        if re.search(r'\d', s3) and k not in ('wilayah', 'sorot', 'hari_ini', 'skala_huruf', 'label', 'rasio'):
            print('ANGKA:', k, '|', s[:90])
    for p in Path(AKAR / 'data/kunci').glob('*.csv'):
        for ln in p.read_text(encoding='utf-8').splitlines():
            for m in TRI.finditer(ln):
                print('TIGA CSV:', p.name, m.group(0))


if __name__ == '__main__':
    p = AKAR / 'pustaka.json'
    pl = json.loads(p.read_text(encoding='utf-8'))
    pl = [x for x in pl if x['id'] not in PUSTAKA] + list(PUSTAKA.values())
    p.write_text(json.dumps(pl, ensure_ascii=False, indent=1), encoding='utf-8')
    tema = json.loads((AKAR / 'tema.json').read_text(encoding='utf-8'))
    tema['kajian']['kunci'] = {
        'judul': 'Jadwal Susur Kampus Kunci',
        'subjudul': 'Skenario Tujuh sampai Empat Belas Hari ke PTN dan PTS Tier Satu di Jawa',
        'judul_pendek': 'Jadwal Susur Kampus Kunci', 'nama_berkas': 'Jadwal Susur Kampus Kunci {DDMMYY}',
        'batas_halaman_isi': None, 'lampiran': 'ABCDEFGHIJKL',
        'kata_kunci': ['BNPB', 'perguruan tinggi', 'kunjungan kampus', 'jadwal', 'biaya perjalanan dinas'], 'cakupan_sampul': 'Pulau Jawa'}
    (AKAR / 'tema.json').write_text(json.dumps(tema, ensure_ascii=False, indent=1), encoding='utf-8')
    reg_p = AKAR / 'data/angka.json'
    reg = json.loads(reg_p.read_text(encoding='utf-8'))
    reg['angka'] = {k: v for k, v in reg['angka'].items() if not k.startswith('kunci.')}
    reg['angka'].update(ANGKA)
    reg_p.write_text(json.dumps(reg, ensure_ascii=False, indent=1), encoding='utf-8')
    (AKAR / 'spek/kunci-021126.json').write_text(json.dumps(SPEK, ensure_ascii=False, indent=2), encoding='utf-8')
    cek()
    print(f'{len(ANGKA)} angka, {len(SLIDE)} slide')
