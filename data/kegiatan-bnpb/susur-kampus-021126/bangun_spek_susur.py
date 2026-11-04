#!/usr/bin/env python3
"""Rencana Susur Kampus Jawa (deck usulan, 2 Nov 2026): tiga skenario 3, 7, 15 hari kerja ke 38 PTN dan PTS unggulan.
Penyaji: Tenaga Ahli Kepala BNPB Bidang Riset, Inovasi, dan Kerja Sama Perguruan Tinggi.

Itinerary dan biaya dihitung di susur_model.py (SBM PMK 32/2025, tarif pasar bersumber); riset di
riset/susur-021126/*.json. Jalankan dari akar proyek-kampus: python spek/bangun_spek_susur.py, lalu
deck.py spek/susur-021126.json --akar .
"""
import csv
import json
import re
import sys
from datetime import date
from pathlib import Path

AKAR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(Path(__file__).parent))
sys.path.insert(0, str(AKAR.parents[1] / 'scripts'))
import susur_model as M  # noqa: E402

ANGKA, PUSTAKA = {}, {}
HAS = M.HASIL
SK = [3, 7, 15]
KATA = {3: 'Tiga hari', 7: 'Tujuh hari', 15: 'Lima belas hari'}


def pus(pid, penulis, judul, tgl, url=None):
    PUSTAKA[pid] = {'id': pid, 'type': 'webpage' if url else 'report', 'author': [{'literal': penulis}], 'issued': {'date-parts': [tgl]},
                    'title': judul, 'verifikasi': 'sekunder' if url else 'primer', **({'URL': url} if url else {})}


def a(kunci, nilai, satuan, pid, sumber, keyakinan='resmi', catatan=None):
    ANGKA[kunci] = {'nilai': nilai, 'satuan': satuan, 'pustaka': pid, 'sumber': sumber, 'keyakinan': keyakinan,
                    'tanggal_data': '2026-11-02', **({'catatan': catatan} if catatan else {})}


def t(kunci, opsi=''):
    assert kunci in ANGKA, kunci
    return '{{angka:%s%s}}' % (kunci, opsi)


def tulis(nama, kepala, baris):
    (AKAR / 'data/susur').mkdir(parents=True, exist_ok=True)
    with (AKAR / 'data/susur' / f'{nama}.csv').open('w', newline='', encoding='utf-8') as f:
        w = csv.writer(f)
        w.writerow(kepala)
        w.writerows(baris)
    return f'data/susur/{nama}.csv'


def _tebal(teks):
    """Token angka tidak boleh di dalam **tebal**: tebalkan potongan teks di sekitar token saja."""
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


# ---------------------------------------------------------------- pustaka
pus('susur-sbm', 'Kementerian Keuangan', 'Peraturan Menteri Keuangan Nomor 32 Tahun 2025 tentang Standar Biaya Masukan Tahun Anggaran 2026',
    [2025, 5, 14], 'https://jdih.kemenkeu.go.id/api/download/ccce2e9f-11fe-41ee-9da3-c7d42609b484/2025pmkeuangan032.pdf')
pus('susur-qs', 'Gebrak.id (mengutip QS Quacquarelli Symonds)', '20 kampus terbaik di Indonesia versi QS World University Rankings 2027',
    [2026, 6, 19], 'https://www.gebrak.id/2026/06/20-kampus-terbaik-di-indonesia-yang.html')
pus('susur-binus', 'BINUS University', 'BINUS University pertahankan posisi universitas swasta nomor 1 di QS WUR 2027', [2026, 6, 20],
    'https://binus.ac.id/2026/06/binus-university-pertahankan-posisi-universitas-swasta-no-1-di')
pus('susur-whoosh', 'Good News From Indonesia', 'Tarif normal Whoosh per kelas', [2026, 5, 31],
    'https://www.goodnewsfromindonesia.id/short/ada-diskon-tiket-whoosh-50-selama-libur-panjang-ayo-serbu')
pus('susur-muria', 'Investortrust (mengutip KAI)', 'KAI gabungkan tiga nama kereta jadi KA Muria, jadwal 12 perjalanan', [2026, 8, 26],
    'https://investortrust.id/business/114153/kai-gabungkan-3-nama-kereta-jadi-ka-muria-ini-jadwal-12-perjalanannya')
pus('susur-ka-banjir', 'Kompas TV (KAI Daop 4 Semarang)', '16 perjalanan kereta api dibatalkan akibat banjir Semarang', [2025, 10, 29],
    'https://www.kompas.tv/regional/626350/16-perjalanan-kereta-api-dibatalkan-akibat-banjir-semarang-ini-detailnya')
pus('susur-pesawat', 'Suara Surabaya', 'Harga tiket pesawat Jakarta ke Surabaya hari biasa dan libur panjang', [2026, 9, 10],
    'https://www.suarasurabaya.net/?p=129102')
pus('susur-ugm', 'Universitas Gadjah Mada', 'Keputusan Rektor 266/2026 tentang Kalender Akademik 2026/2027', [2026, 3, 1],
    'https://akademik.ugm.ac.id/wp-content/uploads/sites/35/2026/03/266-2026_KEPTOR_KALENDER_AKADEMIK.pdf')
pus('susur-skb', 'Kementerian Sekretariat Negara', 'SKB 3 Menteri libur nasional dan cuti bersama 2027', [2026, 9, 15],
    'https://setneg.go.id/baca/index/inilah_skb_3_menteri_libur_nasional_dan_cuti_bersama_2027')
pus('susur-bmkg', 'BMKG via InfoPublik', 'Awal dan puncak musim hujan 2026/2027 berdekatan', [2026, 10, 2],
    'https://infopublik.id/kategori/nasional-sosial-budaya/991951/awal-dan-puncak-musim-hujan-20262027-berdekatan-bmkg-tekankan-kesiaps')
pus('susur-kemenhub', 'Kementerian Perhubungan via iNews', 'Kemenhub prediksi puncak arus Nataru 2026 terjadi empat kali', [2026, 10, 27],
    'https://www.rctiplus.com/news/detail/terkini/5503237/kemenhub-prediksi-puncak-arus-nataru-2026-terjadi-empat-kali')
pus('susur-whoosh-jadwal', 'Metro TV (mengutip KCIC)', 'Jadwal dan frekuensi Whoosh sejak 14 Mar 2026', [2026, 3, 14],
    'https://www.metrotvnews.com/')
pus('susur-model', 'Tim Tenaga Ahli Kepala BNPB', 'Model itinerary dan biaya susur kampus Jawa (susur_model.py)', [2026, 11, 2])

S_SBM = 'PMK Nomor 32 Tahun 2025 tentang SBM TA 2026'
S_MODEL = 'Hitungan tim dari SBM 2026 dan tarif KAI, KCIC, pasar, Nov 2026'
S_QS = 'QS World University Rankings 2027, Jun 2026'

# ---------------------------------------------------------------- angka
TING = {'Inti': 0, 'Unggulan': 0, 'Penguat': 0}
for k in M.K.values():
    TING[k[2]] += 1
KOTA_N = {}
for k in M.K.values():
    KOTA_N[k[3]] = KOTA_N.get(k[3], 0) + 1
a('susur.kampus', len(M.K), 'kampus', 'susur-qs', 'Daftar kampus kandidat tim, Nov 2026', 'penilaian-pakar')
a('susur.inti', TING['Inti'], 'kampus inti', 'susur-qs', S_QS, 'terverifikasi')
a('susur.unggul', TING['Unggulan'], 'kampus unggulan', 'susur-qs', S_QS, 'terverifikasi')
a('susur.penguat', TING['Penguat'], 'kampus penguat', 'susur-qs', 'Daftar kampus kandidat tim, Nov 2026', 'penilaian-pakar')
a('susur.pts', sum(1 for k in M.K.values() if k[1] == 'PTS'), 'PTS', 'susur-qs', 'Daftar kampus kandidat tim, Nov 2026', 'penilaian-pakar')
a('susur.kota', len(KOTA_N), 'kota', 'susur-qs', 'Daftar kampus kandidat tim, Nov 2026', 'penilaian-pakar')
a('susur.skenario', len(SK), 'skenario', 'susur-model', S_MODEL, 'asumsi-kebijakan')
a('susur.qs.pts', 4, 'PTS', 'susur-binus', S_QS, 'terverifikasi', catatan='Binus, Telkom University, UMY, Trisakti')
a('susur.tim', M.TIM, 'orang', 'susur-model', S_MODEL, 'asumsi-kebijakan')
a('susur.hotel.riil', int(M.HOTEL_RIIL * 100), 'persen', 'susur-model', 'Asumsi tim: tarif korporat hotel', 'asumsi-kebijakan')
a('susur.paket', M.PAKET_KAMPUS / 1e6, 'juta rupiah', 'susur-model', 'Asumsi tim: bahan cetak dan cenderamata', 'asumsi-kebijakan')
a('susur.forum', M.FORUM / 1e6, 'juta rupiah', 'susur-model', 'Asumsi tim: konsumsi dan bahan forum', 'asumsi-kebijakan')
a('susur.lokakarya', M.LOKAKARYA / 1e6, 'juta rupiah', 'susur-model', 'Asumsi tim: lokakarya sehari, peserta kampus dan BPBD', 'asumsi-kebijakan')
a('susur.lok.peserta', 100, 'peserta', 'susur-model', 'Asumsi tim', 'asumsi-kebijakan')
a('susur.fornas', M.FORNAS / 1e6, 'juta rupiah', 'susur-model', 'Asumsi tim: forum nasional dan PKS kolektif', 'asumsi-kebijakan')
a('susur.kontinjensi', int(M.KONTINJENSI * 100), 'persen', 'susur-model', 'Asumsi tim', 'asumsi-kebijakan')
a('susur.whoosh.n', 62, 'perjalanan per hari', 'susur-whoosh-jadwal', 'KCIC, jadwal sejak 14 Mar 2026', 'terverifikasi')
a('susur.muria.n', 12, 'perjalanan per hari', 'susur-muria', 'KAI, KA Muria sejak 1 Okt 2026', 'terverifikasi')
a('susur.ka.banjir', 16, 'perjalanan KA', 'susur-ka-banjir', 'KAI Daop 4 Semarang, Okt 2025', 'terverifikasi')
a('susur.pesawat.libur', 2.3, 'juta rupiah', 'susur-pesawat', 'Suara Surabaya, 10 Sep 2026', 'terverifikasi')
a('susur.pesawat.biasa', 0.5, 'juta rupiah', 'susur-pesawat', 'Suara Surabaya, 10 Sep 2026', 'terverifikasi')
a('susur.uh.dki', M.UH_LUAR['DKI'] / 1e3, 'ribu rupiah', 'susur-sbm', S_SBM)
a('susur.uh.jateng', M.UH_LUAR['Jateng'] / 1e3, 'ribu rupiah', 'susur-sbm', S_SBM)
a('susur.hotel.diy', M.HOTEL_TA['DIY'] / 1e6, 'juta rupiah', 'susur-sbm', S_SBM)
for n in SK:
    r = HAS[n]
    p = f'susur.s{n}.'
    a(p + 'hari', r['hari'], 'hari kerja', 'susur-model', S_MODEL, 'asumsi-kebijakan')
    a(p + 'aud', len(r['aud']), 'audiensi', 'susur-model', S_MODEL, 'asumsi-kebijakan')
    a(p + 'kampus', r['kampus'], 'kampus', 'susur-model', S_MODEL, 'asumsi-kebijakan')
    a(p + 'forum', r['forum'], 'forum', 'susur-model', S_MODEL, 'asumsi-kebijakan')
    a(p + 'peserta', len(r['peserta']), 'kampus', 'susur-model', S_MODEL, 'asumsi-kebijakan')
    a(p + 'lok', r['lok'], 'lokakarya', 'susur-model', S_MODEL, 'asumsi-kebijakan')
    a(p + 'kota', r['kota'], 'kota', 'susur-model', S_MODEL, 'asumsi-kebijakan')
    a(p + 'malam', r['malam'], 'malam', 'susur-model', S_MODEL, 'asumsi-kebijakan')
    a(p + 'pts', r['pts'], 'PTS', 'susur-model', S_MODEL, 'asumsi-kebijakan')
    a(p + 'pagu', jt(r['pagu']), 'juta rupiah', 'susur-model', S_MODEL, 'asumsi-kebijakan')
    a(p + 'riil', jt(r['riil']), 'juta rupiah', 'susur-model', S_MODEL, 'asumsi-kebijakan')
    a(p + 'perkampus', jt(r['pagu'] / r['kampus'], 2), 'juta rupiah', 'susur-model', S_MODEL, 'asumsi-kebijakan')
    a(p + 'giat.persen', round(100 * r['giat'] / r['pagu']), 'persen', 'susur-model', S_MODEL, 'asumsi-kebijakan')
a('susur.s15.inti', HAS[15]['inti'], 'kampus inti', 'susur-model', S_MODEL, 'asumsi-kebijakan')
a('susur.selisih.15', jt(HAS[15]['pagu'] - HAS[7]['pagu']), 'juta rupiah', 'susur-model', S_MODEL, 'asumsi-kebijakan')
a('susur.s15.peraud', jt(HAS[15]['pagu'] / len(HAS[15]['aud']), 2), 'juta rupiah', 'susur-model', S_MODEL, 'asumsi-kebijakan')
a('susur.s7.peraud', jt(HAS[7]['pagu'] / len(HAS[7]['aud']), 2), 'juta rupiah', 'susur-model', S_MODEL, 'asumsi-kebijakan')
a('susur.s15.sbm.persen', round(100 * (HAS[15]['tiket_p'] + HAS[15]['inap_p'] + HAS[15]['uh'] + HAS[15]['lokal']) / HAS[15]['pagu']), 'persen', 'susur-model', S_MODEL, 'asumsi-kebijakan')
a('susur.marginal.aud', jt((HAS[15]['pagu'] - HAS[7]['pagu']) / (len(HAS[15]['aud']) - len(HAS[7]['aud'])), 2), 'juta rupiah', 'susur-model', S_MODEL, 'asumsi-kebijakan')
a('susur.marginal', jt((HAS[15]['pagu'] - HAS[7]['pagu']) / (HAS[15]['kampus'] - HAS[7]['kampus']), 2), 'juta rupiah', 'susur-model', S_MODEL, 'asumsi-kebijakan')
a('susur.tambah.kampus', HAS[15]['kampus'] - HAS[7]['kampus'], 'kampus', 'susur-model', S_MODEL, 'asumsi-kebijakan')
a('susur.ruas', 12, 'ruas', 'susur-model', S_MODEL, 'asumsi-kebijakan')
a('susur.ruas.ka', 4, 'ruas', 'susur-model', S_MODEL, 'asumsi-kebijakan')
a('susur.qs.ui', M.K['UI'][6], 'peringkat', 'susur-qs', S_QS, 'terverifikasi')
a('susur.lok.total', jt(3 * M.LOKAKARYA), 'juta rupiah', 'susur-model', S_MODEL, 'asumsi-kebijakan')

# ---------------------------------------------------------------- CSV
NM = {k: v[0] for k, v in M.K.items()}
SING = {'UAJ': 'Atma Jaya', 'UPNVY': 'UPN Veteran Yogyakarta', 'UPNJ': 'UPN Veteran Jatim', 'UINJ': 'UIN Jakarta'}


def sg(k):
    return SING.get(k, k)


c_kota = tulis('kota', ['kota', 'kampus', 'lon', 'lat'],
               [[kota, n, M.KOTA_XY[kota][0], M.KOTA_XY[kota][1]] for kota, n in sorted(KOTA_N.items(), key=lambda x: -x[1])])
QS26 = {'UI': 189, 'UGM': 224, 'Unair': 287, 'ITB': 255, 'IPB': 399, 'Unpad': 515, 'ITS': 509, 'UB': 680, 'Undip': 624}
c_qs = tulis('qs_inti', ['kampus', 'qs', 'ikon', 'ket'], [[sg(k), v[6], 'sekolah', v[3]] for k, v in M.K.items() if v[6]])
c_qs_lain = tulis('qs_lain', ['kampus', 'qs'], [[f'{sg(k)} ({v[1]}{", 2026" if "2026" in v[5] else ""})', v[5].split(' (')[0].replace('1401+', 'di luar 1400 besar')] for k, v in M.K.items() if v[2] == 'Unggulan'])
def _id(x, d=0):
    return f'{x:,.{d}f}'.replace(',', '#').replace('.', ',').replace('#', '.')


_UK = [('Tanggal', lambda r, n: {3: '18–20 Nov', 7: '16–24 Nov', 15: '16 Nov sampai 4 Des'}[n]),
       ('Kota disinggahi', lambda r, n: _id(r['kota'])), ('Audiensi kampus', lambda r, n: _id(len(r['aud']))),
       ('Forum kampus kota', lambda r, n: _id(r['forum'])), ('Kampus terjangkau', lambda r, n: _id(r['kampus'])),
       ('Kampus inti', lambda r, n: _id(r['inti'])), ('PTS', lambda r, n: _id(r['pts'])),
       ('Malam menginap', lambda r, n: _id(r['malam'])), ('Pagu usulan, Rp juta', lambda r, n: _id(r['pagu'] / 1e6, 1)),
       ('Perkiraan riil, Rp juta', lambda r, n: _id(r['riil'] / 1e6, 1)),
       ('Penginapan, Rp juta', lambda r, n: _id(r['inap_p'] / 1e6, 1))]
c_banding = tulis('banding', ['ukuran'] + [f's{n}' for n in SK], [[u] + [f(HAS[n], n) for n in SK] for u, f in _UK])


def itin_harian(n):
    return tulis(f'itin{n}', ['hari', 'kota', 'pagi', 'siang', 'malam'],
                 [[f'H{i} {h["tgl"]}', h['kota'], h['pagi'], h['siang'], h['malam']] for i, h in enumerate(M.SKENARIO[n], 1)])


def pekan(hari):
    out, cur = [], []
    for h in hari:
        if cur and (h['tgl'].startswith('Sen')):
            out.append(cur)
            cur = []
        cur.append(h)
    out.append(cur)
    return out


WIL = {'Depok': 'Jabodetabek', 'Jakarta': 'Jabodetabek', 'Bogor': 'Jabodetabek', 'Tangerang': 'Banten', 'Serang': 'Banten',
       'Bandung': 'Jawa Barat', 'Jatinangor': 'Jawa Barat', 'Purwokerto': 'Jawa Tengah', 'Semarang': 'Jawa Tengah', 'Solo': 'Jawa Tengah',
       'Yogyakarta': 'DIY', 'Surabaya': 'Jawa Timur', 'Malang': 'Jawa Timur', 'Jember': 'Jawa Timur', 'Tangerang Selatan': 'Banten'}


def itin_pekan(n):
    rows = []
    for i, pk in enumerate(pekan(M.SKENARIO[n]), 1):
        aud = [sg(k) for h in pk for k in h['aud']]
        fr = [f'Forum {M.K[h["forum"]["host"]][3]} ({len(h["forum"]["peserta"])} kampus)' for h in pk if h['forum']]
        fr += [f'Lokakarya {h["lok"]}' for h in pk if h['lok']]
        fr += ['Forum nasional dan PKS kolektif' for h in pk if h['fornas']]
        wil = []
        for h in pk:
            for c in re.split(r', ', h['kota'].replace(' (kantor)', '')):
                w = WIL.get(c, c)
                if w not in wil:
                    wil.append(w)
        tg = f'{pk[0]["tgl"][4:]} sampai {pk[-1]["tgl"][4:]}' if len(pk) > 1 else pk[0]['tgl'][4:]
        mlm = sum(1 for h in pk if h['inap'])
        tg += f'; {mlm} malam menginap' if mlm else '; tanpa menginap'
        rows.append([f'Pekan {i}', tg, '; '.join(wil), '; '.join(aud) or 'Konsolidasi di kantor', '; '.join(fr) or 'Tidak ada'])
    return tulis(f'pekan{n}', ['pekan', 'tanggal', 'wilayah', 'kampus', 'forum'], rows)


c_it3, c_it7 = itin_harian(3), itin_harian(7)
c_pk15 = itin_pekan(15)
c_it15 = itin_harian(15)

KOMP = [('tiket_p', 'Tiket antarkota'), ('inap_p', 'Penginapan'), ('uh', 'Uang harian'), ('lokal', 'Transport lokal'),
        ('giat', 'Kegiatan dan bahan'), ('kontin_p', 'Kontinjensi')]
for n in SK:
    HAS[n]['transport'] = HAS[n]['tiket_p'] + HAS[n]['lokal']
KOMP5 = [('transport', 'Transport'), ('inap_p', 'Penginapan'), ('uh', 'Uang harian'), ('giat', 'Kegiatan dan bahan'), ('kontin_p', 'Kontinjensi')]
c_tumpuk = tulis('biaya_tumpuk', ['skenario'] + [k for k, _ in KOMP5],
                 [[f'{n} hari'] + [jt(HAS[n][k]) for k, _ in KOMP5] for n in SK])
c_perk = tulis('per_kampus', ['skenario', 'peraud', 'perkampus'], [[f'{n} hari', jt(HAS[n]['pagu'] / len(HAS[n]['aud']), 2), jt(HAS[n]['pagu'] / HAS[n]['kampus'], 2)] for n in SK])
RINCI = [('tiket_p', 'Tiket antarkota'), ('sewa', 'Sewa mobil dan sopir'), ('tol', 'Tol'), ('trf', 'Transport ke stasiun dan bandara Jakarta'),
         ('inap_p', 'Penginapan (pagu)'), ('uh', 'Uang harian'), ('g_paket', 'Bahan dan cenderamata audiensi'),
         ('g_forum', 'Forum kampus kota'),
         ('kontin_p', 'Kontinjensi'), ('pagu', 'Total pagu usulan'), ('tiket_r', 'Tiket antarkota (riil)'),
         ('inap_r', 'Penginapan (riil)'), ('kontin_r', 'Kontinjensi (riil)'), ('riil', 'Perkiraan riil')]
for n in SK:
    for k, _ in RINCI:
        assert k in HAS[n], k
    assert abs(sum(HAS[n][k] for k, _ in RINCI[:9]) - HAS[n]['pagu']) < 1, n
    assert abs(HAS[n]['tiket_r'] + HAS[n]['inap_r'] + HAS[n]['kontin_r'] + sum(HAS[n][k] for k in ('sewa', 'tol', 'trf', 'uh', 'g_paket', 'g_forum')) - HAS[n]['riil']) < 1, n
c_rinci = tulis('biaya_rinci', ['komponen'] + [f's{n}' for n in SK],
                [[lbl] + [jt(HAS[n][k], 2) for n in SK] for k, lbl in RINCI]
                + [['Pagu per kampus terjangkau'] + [jt(HAS[n]['pagu'] / HAS[n]['kampus'], 2) for n in SK],
                   ['Riil per kampus terjangkau'] + [jt(HAS[n]['riil'] / HAS[n]['kampus'], 2) for n in SK]])
c_sbm = tulis('sbm', ['provinsi', 'uh', 'hotel_ta', 'hotel_staf', 'sewa'],
              [[M.PROV_NAMA[p], M.UH_LUAR[p] / 1e3, M.HOTEL_TA[p] / 1e3, M.HOTEL_STAF[p] / 1e3, M.SEWA[p] / 1e3]
               for p in ['DKI', 'Banten', 'Jabar', 'Jateng', 'DIY', 'Jatim']]
             + [['DKI Jakarta, dalam kota', M.UH_DALAM / 1e3, '', '', '']])
c_moda = tulis('moda', ['ruas', 'moda', 'waktu', 'tarif'], [
    ['Jakarta ke Bandung', 'Whoosh Halim ke Tegalluar', '47 menit', 350],
    ['Jakarta atau Bogor ke Bandung', 'Mobil, tol Cipularang (per mobil)', 'sekitar 3 jam, perkiraan', 83],
    ['Bandung ke Yogyakarta', 'KA Lodaya malam', 'sekitar 8 jam, perkiraan', 490],
    ['Jakarta ke Yogyakarta', 'Pesawat CGK ke YIA, pagu SBM', '–', 1134],
    ['Jakarta ke Semarang', 'KA Muria Gambir ke Tawang', '5 jam 20 menit', 410],
    ['Semarang ke Solo', 'Mobil, tol via Salatiga (per mobil)', '1 jam 30 menit', 92],
    ['Solo ke Yogyakarta', 'Mobil, tol (per mobil); KRL pada tujuh hari', 'sekitar 1 jam, perkiraan', 43],
    ['Yogyakarta ke Surabaya', 'KA Sancaka', '4 jam', 380],
    ['Jakarta ke Surabaya', 'Pesawat CGK ke SUB, pagu SBM', '1 jam 40 menit', 1337],
    ['Surabaya ke Malang', 'Mobil, tol Pandaan ke Malang (per mobil)', '1 jam 30 menit', 77],
    ['Malang ke Jember ke Surabaya', 'Mobil, tol belum dihitung', 'sekitar 5 jam per ruas, perkiraan', ''],
    ['Jakarta ke Serang', 'Mobil, tol belum dihitung', 'sekitar 2 jam, perkiraan', ''],
])
c_kampus = tulis('kampus', ['kode', 'nama', 'jenis', 'tingkat', 'kota', 'qs', 'unit'],
                 [[sg(k), v[0], v[1], v[2], v[3], v[5].replace('1401+', 'di luar 1400 besar'), v[7]] for k, v in M.K.items()])
DASAR_TOL = {'Jakarta ke Bandung': 'jumlah tarif ruas; Kompas TV mengutip BPJT, Mar 2026',
             'Semarang ke Solo': 'Kompas TV mengutip BPJT, Mar 2026', 'Solo ke Yogyakarta': 'Kompas TV mengutip BPJT, Mar 2026',
             'Surabaya ke Malang': 'perkiraan Auto2000, 2026'}
LBL_TIKET = {'WH': 'Whoosh Jakarta ke Bandung', 'CGK-YIA': 'Pesawat Jakarta ke Yogyakarta, tiap arah', 'YIA-CGK': 'Pesawat Yogyakarta ke Jakarta',
             'CGK-SUB': 'Pesawat Jakarta ke Surabaya, tiap arah', 'SUB-CGK': 'Pesawat Surabaya ke Jakarta', 'KA-BDG-YK': 'KA Bandung ke Yogyakarta',
             'KA-YK-SUB': 'KA Yogyakarta ke Surabaya', 'KA-JKT-SMG': 'KA Jakarta ke Semarang, tiap arah', 'KA-SMG-JKT': 'KA Semarang ke Jakarta',
             'KRL': 'KRL Yogyakarta ke Solo'}
c_tiket = tulis('tarif', ['item', 'pagu', 'riil', 'dasar'],
                [[LBL_TIKET[k], v[0] / 1e3, v[1] / 1e3, v[2]] for k, v in M.TIKET.items() if k not in ('YIA-CGK', 'SUB-CGK', 'KA-SMG-JKT')]
                + [[f'Tol {k}', v / 1e3, v / 1e3, DASAR_TOL[k]] for k, v in M.TOL.items()]
                + [['Transport rumah ke stasiun atau bandara', M.TRANSFER_DKI / 1e3, M.TRANSFER_DKI / 1e3, 'SBM DKI, per orang per kali'],
                   ['Bahan dan cenderamata per audiensi', M.PAKET_KAMPUS / 1e3, M.PAKET_KAMPUS / 1e3, 'asumsi tim'],
                   ['Forum kampus kota', M.FORUM / 1e3, M.FORUM / 1e3, 'asumsi tim untuk konsumsi dan bahan']]
                + [['Tol lain dan mobil kembali ke Jakarta', '', '', 'belum dihitung; ditutup kontinjensi']]
                + [[f'Sewa mobil dan sopir, {M.PROV_NAMA[pv]}', M.SEWA[pv] / 1e3, M.SEWA[pv] / 1e3, 'SBM, per hari, termasuk BBM']
                   for pv in ('DKI', 'Jabar', 'Jateng', 'DIY', 'Jatim')])
c_kal = tulis('kalender', ['kegiatan', 'kelompok', 'mulai', 'selesai', 'tonggak'], [
    ['Surat dan konfirmasi rektor', 'Rencana', 1, 1, ''],
    ['Kunjungan (3, 7, atau 15 hari)', 'Rencana', 3, 5, 5],
    ['UAS semester gasal', 'Kalender kampus', 6, 7, ''],
    ['Libur semester gasal (UGM)', 'Kalender kampus', 8, 13, ''],
    ['Natal, Tahun Baru, puncak arus', 'Kalender nasional', 8, 10, ''],
    ['Puncak musim hujan Jawa', 'Cuaca', 5, 14, ''],
])

# ---------------------------------------------------------------- slide
R3, R7, R15 = (HAS[n] for n in SK)


def kartu_biaya(n, lain):
    return {'_n': n, '_lain': lain}


def _kartu_biaya_lama(n, lain):
    p = f'susur.s{n}.'
    return {'mode': 'kartu', 'latar': 'tint', 'kartu': [
        {'nilai': 'Rp ' + t(p + 'pagu') + ' juta', 'label': 'Pagu SBM', 'ket': f'perkiraan riil Rp {t(p + "riil")} juta', 'ikon': 'pembiayaan'},
        {'nilai': t(p + 'kampus'), 'label': 'Kampus terjangkau', 'ket': lain, 'ikon': 'sekolah'},
        {'nilai': 'Rp ' + t(p + 'perkampus', '|fmt=2') + ' juta', 'label': 'Biaya per kampus', 'ket': f'{t(p + "malam", "|satuan")} menginap', 'ikon': 'rumah'}]}


KOL_HARI = [{'nama': 'hari', 'kepala': 'Hari'}, {'nama': 'kota', 'kepala': 'Kota'}, {'nama': 'pagi', 'kepala': 'Pagi'},
            {'nama': 'siang', 'kepala': 'Siang'}, {'nama': 'malam', 'kepala': 'Sore dan malam'}]
KOL_PEKAN = [{'nama': 'pekan', 'kepala': 'Pekan'}, {'nama': 'tanggal', 'kepala': 'Tanggal'}, {'nama': 'wilayah', 'kepala': 'Wilayah'},
             {'nama': 'kampus', 'kepala': 'Audiensi'}, {'nama': 'forum', 'kepala': 'Forum'}]

SLIDE = [
    {'jenis': 'sampul', 'layout': 'putih', 'judul_penuh': True, 'skala_subjudul': 0.85, 'foto': 'foto/sampul-ugm.jpg',
     'kepada': 'Disampaikan kepada Kepala Badan Nasional Penanggulangan Bencana',
     'kredit': 'Foto: Alharomain354, CC BY-SA 4.0, Wikimedia Commons', 'kota': 'Jakarta',
     'penyaji': {'nama': 'Alfatehan Septianta', 'jabatan': 'Tenaga Ahli Kepala BNPB Bidang Riset, Inovasi dan Kerja Sama Perguruan Tinggi'}},

    {'jenis': 'galeri', 'jenis_slide': 'navigasi', 'judul_bentuk': 'deskriptif', 'pesan': 'Ringkasan rencana',
     'sumber': 'Hitungan tim, Nov 2026; QS WUR 2027', 'cut_off': False, 'skala_huruf': 1.4,
     'judul': f'Skenario {t("susur.s15.hari", "|satuan")} menjangkau {t("susur.s15.kampus")} dari {t("susur.kampus")} kampus: {t("susur.s15.aud")} lewat audiensi dan {t("susur.s15.peserta")} lewat forum kampus kota',
     'grup': [{'pil': 'Angka kunci', 'nada': 'data', 'ikon': 'ringkasan', 'kartu': [
         kt(t('susur.kampus'), 'PTN dan PTS kandidat di Jawa', 'sekolah'),
         kt(t('susur.skenario'), 'skenario, paling lama lima belas hari kerja', 'kalender'),
         kt('Rp ' + t('susur.s15.pagu') + ' juta', 'pagu usulan, tarif SBM ditambah bahan', 'pembiayaan', 'oranye')]}],
     'panel': [
         {'judul': 'Sasaran', 'ikon': 'sekolah', 'nada': 'kendala', 'temuan': [
             tm('Temuan A.1', 'sekolah', f'**{t("susur.inti")} kampus inti** masuk QS 2027 peringkat tujuh ratus besar dunia.', 'terverifikasi'),
             tm('Temuan A.2', 'lembaga', f'**{t("susur.qs.pts")} PTS** masuk QS 2027; Binus PTS tertinggi.', 'terverifikasi'),
             tm('Temuan A.3', 'wilayah', f'**{t("susur.kota", "|satuan")}** di enam provinsi menampung semua kampus kandidat.', 'penilaian-pakar'),
         ]},
         {'judul': 'Pilihan', 'ikon': 'kalender', 'nada': 'capaian', 'temuan': [
             tm('Temuan B.1', 'kalender', f'**Tiga hari** cukup untuk {t("susur.s3.kampus")} kampus di luar Jakarta, lima di antaranya inti.'),
             tm('Temuan B.2', 'sekolah', f'**Tujuh hari** menuntaskan {t("susur.s7.kampus")} kampus, termasuk semua kampus inti.'),
             tm('Temuan B.3', 'wilayah', f'**Lima belas hari** menjangkau {t("susur.s15.kampus")} kampus, {t("susur.s15.peserta")} di antaranya lewat forum.'),
         ]},
         {'judul': 'Keputusan', 'ikon': 'regulasi', 'nada': 'tindak', 'temuan': [
             tm('Temuan C.1', 'regulasi', f'**Setujui skenario lima belas hari** mulai 16 Nov 2026, sebelum UAS kampus.'),
             tm('Temuan C.2', 'pembiayaan', f'**Pagu Rp {t("susur.s15.pagu")} juta**, perkiraan riil Rp {t("susur.s15.riil")} juta.'),
             tm('Temuan C.3', 'kalender', '**Unsoed** satu-satunya yang belum; disusulkan lewat audiensi daring.'),
         ]}]},

    # ---- Bagian 1
    {'jenis': 'temuan-visual', 'jenis_slide': 'peta', 'judul_bentuk': 'temuan', 'rasio': 0.66,
     'pesan': 'Peta kampus kandidat', 'cut_off': False, 'sumber': f'Daftar kampus kandidat tim, Nov 2026; {S_QS}',
     'judul': f'Kampus kandidat tersebar di {t("susur.kota", "|satuan")}; Yogyakarta dan Surabaya paling padat',
     'utama': {'judul': 'Kampus kandidat per kota', 'ikon': 'wilayah', 'peta': {
         'mode': 'titik', 'wilayah': ['31', '32', '33', '34', '35', '36'], 'skala': 'emas', 'satuan': 'Jumlah kampus kandidat',
         'label': 15, 'skala_huruf': 1.15,
         'data': {'csv': c_kota, 'kolom': [{'nama': 'kota'}, {'nama': 'kampus', 'kepala': 'Kampus', 'fmt': '0'},
                                            {'nama': 'lon', 'fmt': '2'}, {'nama': 'lat', 'fmt': '2'}],
                  'keyakinan': 'penilaian-pakar', 'sumber': 'Daftar kampus kandidat tim, Nov 2026'}}},
     'panel': {'judul': 'Tiga tingkat kampus', 'ikon': 'sekolah', 'skala_huruf': 1.3, 'temuan': [
         tm('Temuan A.1', 'sekolah', f'**Inti.** {t("susur.inti")} PTN di tujuh ratus besar QS 2027; selalu audiensi penuh.', 'terverifikasi'),
         tm('Temuan A.2', 'lembaga', f'**Unggulan.** {t("susur.unggul")} kampus lain yang masuk QS 2026 atau 2027.', 'terverifikasi'),
         tm('Temuan A.3', 'wilayah', f'**Penguat.** {t("susur.penguat")} PTN dan PTS besar yang menjadi simpul wilayahnya.', 'penilaian-pakar'),
         tm('Temuan A.4', 'lembaga', f'**Swasta.** {t("susur.pts")} dari {t("susur.kampus")} kampus kandidat adalah PTS.', 'penilaian-pakar'),
         tm('Temuan A.5', 'peringatan', '**Jarak.** Unsoed di Purwokerto di luar jalur; disusulkan lewat audiensi daring.', 'penilaian-pakar'),
     ]}},

    {'jenis': 'temuan-visual', 'jenis_slide': 'grafik', 'judul_bentuk': 'temuan', 'rasio': 0.58,
     'pesan': 'Peringkat kampus', 'cut_off': False, 'sumber': S_QS,
     'judul': f'UI memimpin di urutan {t("susur.qs.ui")} dunia; {t("susur.inti")} PTN Jawa masuk tujuh ratus besar QS 2027 dan menjadi kampus inti',
     'utama': {'judul': 'Urutan dunia QS 2027, kampus inti (makin kecil makin baik)', 'ikon': 'sekolah', 'kisi_ikon': {
         'kolom': 3, 'sorot': 0, 'skala_huruf': 0.9,
         'data': {'csv': c_qs, 'kolom': [{'nama': 'kampus'}, {'nama': 'qs', 'kepala': 'Urutan', 'fmt': '0'},
                                          {'nama': 'ikon'}, {'nama': 'ket'}],
                  'keyakinan': 'terverifikasi', 'sumber': 'QS World University Rankings 2026 dan 2027'}}},
     'panel': {'judul': 'Kampus unggulan', 'ikon': 'lembaga', 'peringkat': False, 'skala_huruf': 1.15,
               'data': {'csv': c_qs_lain, 'kolom': [{'nama': 'kampus', 'kepala': 'Kampus (edisi)'}, {'nama': 'qs', 'kepala': 'Peringkat QS'}],
                        'keyakinan': 'terverifikasi', 'sumber': S_QS}}},

    {'jenis': 'temuan-visual', 'jenis_slide': 'panel', 'judul_bentuk': 'deskriptif', 'rasio': 0.7,
     'pesan': 'Agenda satu kunjungan', 'cut_off': False, 'sumber': 'Rancangan agenda kunjungan tim, Nov 2026',
     'judul': 'Tiap kunjungan berjalan setengah hari dan pulang membawa koordinator kampus serta daftar pakar',
     'utama': {'judul': 'Alur satu kunjungan kampus', 'ikon': 'kalender', 'alur': {'sorot': 1, 'label_hasil': 'Hasil', 'skala_huruf': 2.1, 'langkah': [
         {'judul': 'Persiapan', 'butir': ['Surat dikirim H-10', 'Profil kampus disiapkan'], 'pelaku': 'Tim', 'hasil': 'Agenda'},
         {'judul': 'Audiensi', 'butir': ['Paparan kepada rektor', 'Program unggulan dibahas'], 'pelaku': 'Rektor', 'hasil': 'Koordinator'},
         {'judul': 'Temu pakar', 'butir': ['Pusat studi bencana', 'Lab dan alat uji'], 'pelaku': 'Pusat studi', 'hasil': 'Daftar pakar'},
         {'judul': 'Tindak lanjut', 'butir': ['Notula sepekan', 'Draf PKS'], 'pelaku': 'Biro Hukum', 'hasil': 'Draf PKS'}]}},
     'panel': {'judul': 'Dibawa dan diminta', 'ikon': 'regulasi', 'skala_huruf': 1.3, 'temuan': [
         tm('Temuan B.1', 'data', '**Dibawa.** Masalah riset dari unit BNPB beserta data sistem BNPB.'),
         tm('Temuan B.2', 'pembiayaan', '**Ditawarkan.** Jalan ke dana luar lewat proposal bersama BNPB.'),
         tm('Temuan B.3', 'lembaga', '**Diminta.** Koordinator kampus yang ditunjuk rektor.'),
         tm('Temuan B.4', 'kapasitas', '**Diminta.** Satu program unggulan sesuai bahaya di wilayahnya.'),
     ]}},

    # ---- Bagian 2
    {'jenis': 'tabel-peringkat', 'jenis_slide': 'matriks', 'judul_bentuk': 'temuan', 'rasio': 0.68,
     'pesan': 'Perbandingan tiga skenario', 'cut_off': False, 'sumber': S_MODEL,
     'grup': [{'pil': 'Selisih antarskenario', 'nada': 'data', 'ikon': 'pembiayaan', 'kartu': [
         kt('Rp ' + t('susur.marginal.aud', '|fmt=2') + ' juta', 'per audiensi tambahan dari tujuh ke lima belas hari', 'sekolah', 'oranye'),
         kt(t('susur.tambah.kampus'), 'kampus tambahan dari tujuh ke lima belas hari', 'sekolah'),
         kt('Rp ' + t('susur.selisih.15') + ' juta', 'biaya tambahan dari tujuh ke lima belas hari', 'pembiayaan')]}],
     'judul': f'Pagu usulan naik dari Rp {t("susur.s3.pagu")} juta untuk tiga hari kerja sampai Rp {t("susur.s15.pagu")} juta untuk lima belas hari kerja, tim tiga orang',
     'tabel': {'judul_panel': 'Tiga skenario, tim tiga orang, pagu usulan', 'ikon': 'kalender', 'peringkat': False,
               'data': {'csv': c_banding, 'kolom': [{'nama': 'ukuran', 'kepala': 'Ukuran'}] + [
                   {'nama': f's{n}', 'kepala': f'{KATA[n]}: {M.NAMA_SK[n]}'} for n in SK],
                        'keyakinan': 'asumsi-kebijakan', 'sumber': S_MODEL}},
     'panel': {'judul': 'Cara membaca', 'ikon': 'ringkasan', 'skala_huruf': 1.3, 'temuan': [
         tm('Temuan A.1', 'sekolah', '**Audiensi.** Temu rektor dan pusat studi; tuan rumah forum juga diaudiensi.'),
         tm('Temuan A.2', 'lembaga', '**Forum.** Kampus sekota bertemu di satu tuan rumah.'),
         tm('Temuan A.3', 'rumah', '**Malam** dihitung di luar Jabodetabek; tim pulang tiap akhir pekan.'),
         tm('Temuan A.4', 'pembiayaan', f'**Pagu** memakai tarif SBM; bahan dan forum {t("susur.s15.giat.persen", "|persen")} pagu lima belas hari.'),
     ]}},

    {'jenis': 'tabel-peringkat', 'jenis_slide': 'tabel', 'judul_bentuk': 'temuan', 'rasio': 0.7, 'seri': 'itinerary',
     'pesan': 'Skenario tiga hari', 'cut_off': False, 'sumber': S_MODEL,
     'judul': f'{t("susur.s3.hari", "|satuan")}: enam kampus di Bandung raya, Yogyakarta, Surabaya dengan satu malam menginap di Surabaya',
     'tabel': {'judul_panel': 'Itinerary skenario Kilat, 18–20 Nov 2026', 'ikon': 'kalender', 'peringkat': False,
               'data': {'csv': c_it3, 'kolom': KOL_HARI, 'keyakinan': 'asumsi-kebijakan', 'sumber': S_MODEL}},
     'panel': {'judul': 'Biaya dan cakupan', 'ikon': 'pembiayaan', 'angka_besar': kartu_biaya(3, 'lima inti, satu PTS')}},

    {'jenis': 'tabel-peringkat', 'jenis_slide': 'tabel', 'judul_bentuk': 'temuan', 'rasio': 0.7, 'seri': 'itinerary',
     'pesan': 'Skenario tujuh hari', 'cut_off': False, 'sumber': S_MODEL,
     'judul': f'{t("susur.s7.hari", "|satuan")}: semua kampus inti ditambah lima kampus lain; tim pulang ke Jakarta di akhir pekan',
     'tabel': {'judul_panel': 'Itinerary skenario Inti, 16–24 Nov 2026', 'ikon': 'kalender', 'peringkat': False,
               'data': {'csv': c_it7, 'kolom': KOL_HARI, 'keyakinan': 'asumsi-kebijakan', 'sumber': S_MODEL}},
     'panel': {'judul': 'Biaya dan cakupan', 'ikon': 'pembiayaan', 'angka_besar': kartu_biaya(7, f'{t("susur.s7.pts")} di antaranya PTS')}},

    {'jenis': 'tabel-peringkat', 'jenis_slide': 'tabel', 'judul_bentuk': 'temuan', 'rasio': 0.7, 'seri': 'itinerary',
     'pesan': 'Skenario lima belas hari', 'cut_off': False, 'sumber': S_MODEL,
     'judul': f'{t("susur.s15.hari", "|satuan")} sebelum UAS menjangkau {t("susur.s15.kampus")} kampus: {t("susur.s15.aud")} audiensi dan {t("susur.s15.forum")} forum kampus kota',
     'tabel': {'judul_panel': 'Ringkasan per pekan, 16 Nov sampai 4 Des 2026 (rincian harian di Lampiran)', 'ikon': 'kalender', 'peringkat': False,
               'data': {'csv': c_pk15, 'kolom': KOL_PEKAN, 'keyakinan': 'asumsi-kebijakan', 'sumber': S_MODEL}},
     'panel': {'judul': 'Biaya dan cakupan', 'ikon': 'pembiayaan', 'angka_besar': kartu_biaya(15, 'hanya Unsoed yang belum')}},

    # ---- Bagian 3
    {'jenis': 'temuan-visual', 'jenis_slide': 'grafik', 'judul_bentuk': 'temuan', 'rasio': 0.6,
     'pesan': 'Komposisi biaya', 'cut_off': False, 'sumber': S_MODEL,
     'judul': f'Per kampus terjangkau, lima belas hari paling murah (Rp {t("susur.s15.perkampus", "|fmt=2")} juta); per audiensi justru Rp {t("susur.s15.peraud", "|fmt=2")} juta, di atas tujuh hari',
     'utama': {'judul': 'Biaya per skenario menurut komponen, Rp juta', 'ikon': 'pembiayaan', 'kolom_tumpuk': {
         'data': {'csv': c_tumpuk, 'kolom': [{'nama': 'skenario'}] + [{'nama': k, 'kepala': l, 'fmt': '1'} for k, l in KOMP5],
                  'keyakinan': 'asumsi-kebijakan', 'sumber': S_MODEL}}},
     'panel': {'judul': 'Per audiensi dan per kampus, Rp juta', 'ikon': 'sekolah', 'dumbbell': {
         'satuan': 'Rp juta', 'skala_huruf': 1.25, 'baris_maks_pt': 70,
         'data': {'csv': c_perk, 'kolom': [{'nama': 'skenario'}, {'nama': 'peraud', 'kepala': 'Per audiensi', 'fmt': '2'},
                                            {'nama': 'perkampus', 'kepala': 'Per kampus terjangkau', 'fmt': '2'}],
                  'keyakinan': 'asumsi-kebijakan', 'sumber': S_MODEL}}}},

    {'jenis': 'tabel-peringkat', 'jenis_slide': 'tabel', 'judul_bentuk': 'temuan', 'rasio': 0.66,
     'pesan': 'Dasar biaya SBM', 'cut_off': False, 'sumber': S_SBM,
     'judul': f'Satuan SBM 2026 dan tarif resmi mengisi {t("susur.s15.sbm.persen", "|persen")} pagu lima belas hari; bahan dan forum {t("susur.s15.giat.persen", "|persen")} masih asumsi tim',
     'tabel': {'judul_panel': 'Satuan biaya perjalanan dinas, ribu rupiah', 'ikon': 'regulasi', 'peringkat': False,
               'data': {'csv': c_sbm, 'kolom': [{'nama': 'provinsi', 'kepala': 'Provinsi'},
                                                 {'nama': 'uh', 'kepala': 'Uang harian', 'fmt': '0'},
                                                 {'nama': 'hotel_ta', 'kepala': 'Hotel golongan IV', 'fmt': '0'},
                                                 {'nama': 'hotel_staf', 'kepala': 'Hotel golongan III', 'fmt': '0'},
                                                 {'nama': 'sewa', 'kepala': 'Sewa mobil', 'fmt': '0'}],
                        'keyakinan': 'resmi', 'sumber': S_SBM}},
     'panel': {'judul': 'Asumsi hitungan', 'ikon': 'ringkasan', 'skala_huruf': 1.27, 'temuan': [
         tm('Temuan A.1', 'jiwa', f'**Tim {t("susur.tim", "|satuan")}**: Tenaga Ahli setara golongan IV dan dua staf golongan III.'),
         tm('Temuan A.2', 'rumah', f'**Hotel riil** dihitung {t("susur.hotel.riil", "|persen")} pagu; pulang tiap akhir pekan.'),
         tm('Temuan A.3', 'sekolah', f'**Bahan dan cenderamata** Rp {t("susur.paket")} juta per audiensi; forum Rp {t("susur.forum")} juta.'),
         tm('Temuan A.4', 'peringatan', f'**Kontinjensi {t("susur.kontinjensi", "|persen")}** menutup selisih tarif dan perubahan jadwal.'),
     ]}},

    # ---- Bagian 4
    {'jenis': 'tabel-peringkat', 'jenis_slide': 'matriks', 'judul_bentuk': 'temuan', 'rasio': 0.66,
     'pesan': 'Rute dan moda', 'cut_off': False, 'sumber': 'KAI, media, agregator tiket, SBM 2026; Mei sampai Okt 2026',
     'judul': f'Kereta melayani {t("susur.ruas.ka")} dari {t("susur.ruas")} ruas utama; pesawat dipakai hanya untuk ruas Jakarta ke Yogyakarta dan Surabaya',
     'tabel': {'judul_panel': 'Ruas, moda, waktu tempuh, tarif ribu rupiah (tiket per orang, tol per mobil)', 'ikon': 'wilayah', 'peringkat': False,
               'data': {'csv': c_moda, 'kolom': [{'nama': 'ruas', 'kepala': 'Ruas'}, {'nama': 'moda', 'kepala': 'Moda'},
                                                  {'nama': 'waktu', 'kepala': 'Waktu tempuh'}, {'nama': 'tarif', 'kepala': 'Tarif', 'fmt': '0'}],
                        'keyakinan': 'penilaian-pakar', 'sumber': 'KAI, media, agregator tiket, SBM 2026; Mei sampai Okt 2026'}},
     'panel': {'judul': 'Pilihan moda', 'ikon': 'kalender', 'skala_huruf': 1.25, 'temuan': [
         tm('Temuan B.1', 'kalender', '**Jadwal kereta** menentukan jam audiensi; pindah kota di pagi buta atau sore.'),
         tm('Temuan B.2', 'wilayah', '**Mobil sewaan** per provinsi melayani bandara dan stasiun serta antarkampus.'),
         tm('Temuan B.3', 'pembiayaan', '**Pesawat** untuk berangkat ke Yogyakarta dan Surabaya serta pulang.'),
         tm('Temuan B.4', 'peringatan', '**Jadwal KA** diperiksa ulang di aplikasi KAI sebelum memesan.', 'penilaian-pakar'),
     ]}},

    {'jenis': 'temuan-visual', 'jenis_slide': 'grafik', 'judul_bentuk': 'temuan',
     'pesan': 'Jendela waktu', 'cut_off': False, 'rasio': 0.7, 'sumber': 'Kalender akademik UGM dan Undip 2026/2027; SKB Tiga Menteri 2026 dan 2027; Kemenhub; BMKG',
     'judul': f'Jendela terbaik {t("susur.s15.hari", "|satuan")} jatuh 16 Nov sampai 4 Des 2026, sebelum UAS dan arus Nataru',
     'utama': {'judul': 'Kalender pekan ke-1 (2 Nov 2026) sampai pekan ke-14 (1 Feb 2027)', 'ikon': 'kalender', 'linimasa': {
         'hari_ini': 1, 'kepala_kegiatan': 'Kegiatan', 'ket_batang': 'Masa berlaku', 'ket_tonggak': 'Evaluasi hasil',
         'ket_hari_ini': 'Pekan ini', 'skala_huruf': 1.25,
         'data': {'csv': c_kal, 'kolom': [{'nama': 'kegiatan'}, {'nama': 'kelompok'}, {'nama': 'mulai', 'fmt': '0'},
                                           {'nama': 'selesai', 'fmt': '0'}, {'nama': 'tonggak', 'fmt': '0'}],
                  'keyakinan': 'terverifikasi', 'sumber': 'UGM, Setneg, Kemenhub, BMKG; Mar sampai Okt 2026'}}},
     'panel': {'judul': 'Mengapa November', 'ikon': 'kalender', 'skala_huruf': 1.29, 'temuan': [
         tm('Temuan C.1', 'sekolah', '**Kuliah masih berjalan.** UAS gasal UGM dan Undip baru 7–18 Des.', 'terverifikasi'),
         tm('Temuan C.2', 'kalender', '**November tanpa libur nasional** menurut SKB Tiga Menteri.', 'terverifikasi'),
         tm('Temuan C.3', 'banjir', '**Hujan memuncak Desember sampai Februari** menurut BMKG.', 'terverifikasi'),
         tm('Temuan C.4', 'peringatan', '**Sesudah 4 Des** ada UAS, Nataru, lalu libur semester sampai akhir Januari.', 'penilaian-pakar'),
     ]}},

    {'jenis': 'temuan-visual', 'jenis_slide': 'panel', 'judul_bentuk': 'temuan',
     'pesan': 'Risiko dan mitigasi', 'cut_off': False, 'sumber': 'KAI Daop Semarang, Okt 2025; Suara Surabaya, Sep 2026; rancangan tim, Nov 2026',
     'judul': f'Lima risiko dikelola sejak awal; perjalanan darat terpanjang ada di hari ke Jember dan banjir pernah memutus {t("susur.ka.banjir", "|satuan")}',
     'utama': {'judul': 'Risiko pelaksanaan dan cara menanganinya', 'ikon': 'peringatan', 'daftar_ikon': {'mode': 'baris', 'baris': [
         {'ikon': 'kalender', 'judul': 'Jadwal rektor bergeser', 'isi': 'Surat dikirim paling lambat 6 Nov dan dikonfirmasi H-3; wakil rektor atau kepala pusat studi menjadi pengganti.'},
         {'ikon': 'jiwa', 'judul': 'Hari perjalanan panjang', 'isi': 'Tujuh hari memakai KA malam ke Yogyakarta; lima belas hari memuat sekitar sepuluh jam darat ke Jember dan kembali. Unej dapat diganti audiensi daring.'},
         {'ikon': 'banjir', 'judul': 'Hujan mulai memuncak', 'isi': 'Banjir Semarang Okt 2025 membatalkan atau memutar perjalanan KA; peringatan BMKG dicek sehari sebelumnya dan pesawat menjadi cadangan.',
          'angka': t('susur.ka.banjir'), 'satuan': 'perjalanan KA'},
         {'ikon': 'pembiayaan', 'judul': 'Tarif pesawat berubah', 'isi': 'Tarif Jakarta ke Surabaya mengikuti permintaan, dari setengah juta sampai lebih dari dua juta rupiah; tiket dibeli paling lambat 9 Nov.',
          'angka': t('susur.pesawat.libur'), 'satuan': 'juta rupiah, batas atas'},
         {'ikon': 'regulasi', 'judul': 'Tindak lanjut terlupa', 'isi': 'Notula dan draf PKS dikirim sepekan sesudah kunjungan dan dicatat di platform kemitraan.'},
     ]}}},

    {'jenis': 'rekomendasi', 'jenis_slide': 'rekomendasi', 'judul_bentuk': 'deskriptif', 'keputusan': True, 'sumber': 'Rancangan tim, Nov 2026',
     'pesan': 'Keputusan yang diminta',
     'judul': 'Keputusan yang diminta: setujui skenario lima belas hari dan mulai persiapan pekan ini',
     'rekomendasi': [
         {'kode': 'K-1', 'jenis': 'pembiayaan', 'langkah': 'Setujui skenario lima belas hari', 'tenggat': '6 Nov 2026', 'status': 'baru',
          'rincian': 'Paling lambat 6 Nov. Kunjungan 16 Nov sampai 4 Des 2026; sumber dana ditetapkan Sekretariat Utama.', 'lembaga': ['Kepala BNPB'],
          'dasar': t('susur.s15.kampus'), 'biaya': f'Pagu Rp {t("susur.s15.pagu")} juta, perkiraan riil lebih rendah.'},
         {'kode': 'K-2', 'jenis': 'regulasi', 'langkah': 'Kirim surat audiensi ke rektor', 'tenggat': '6 Nov 2026', 'status': 'baru',
          'rincian': 'Paling lambat 6 Nov. Surat Kepala BNPB ke kampus audiensi dan tuan rumah forum, berikut agendanya.',
          'lembaga': ['Biro Hukum, Organisasi, dan Kerja Sama'], 'dasar': 'slide 12', 'risiko': 'Surat terlambat membuat jadwal rektor bergeser ke Desember.'},
         {'kode': 'K-3', 'jenis': 'kapasitas', 'langkah': 'Siapkan bahan kunjungan', 'tenggat': '13 Nov 2026', 'status': 'dikembangkan',
          'rincian': 'Paling lambat 13 Nov. Profil kampus dilengkapi unit kebencanaannya; bank masalah riset disiapkan.',
          'lembaga': ['Tenaga Ahli Kepala BNPB'], 'dasar': 'slide 7', 'risiko': 'Tanpa bahan, audiensi berhenti pada perkenalan.'},
         {'kode': 'K-4', 'jenis': 'kapasitas', 'langkah': 'Tetapkan tim dan pemesanan', 'tenggat': '9 Nov 2026', 'status': 'baru',
          'rincian': 'Paling lambat 9 Nov. Surat tugas tim tiga orang; tiket dan hotel dipesan.',
          'lembaga': ['Biro Umum dan Keuangan'], 'dasar': 'slide 14', 'risiko': 'Pemesanan mendadak menaikkan tarif.'},
         {'kode': 'K-5', 'jenis': 'data', 'langkah': 'Paparkan hasil kunjungan', 'tenggat': '11 Des 2026', 'status': 'baru',
          'rincian': 'Paling lambat 11 Des. Daftar koordinator kampus beserta draf PKS dipaparkan kepada Kepala BNPB.',
          'lembaga': ['Tenaga Ahli Kepala BNPB'], 'dasar': t('susur.s15.kampus'), 'risiko': 'Tanpa paparan, draf PKS tertahan di tiap kampus.'},
     ]},

    {'jenis': 'penutup', 'foto': 'foto/sampul-ugm.jpg', 'kredit': 'Foto: Alharomain354, CC BY-SA 4.0, Wikimedia Commons',
     'laporan': 'Rencana Susur Kampus Jawa'},

    {'jenis': 'pembatas-lampiran', 'kelompok': {'A': 'Itinerary rinci', 'B': 'Rincian pendukung'}},
    {'jenis': 'lampiran-tabel', 'jenis_slide': 'lampiran', 'judul_bentuk': 'deskriptif', 'pesan': 'Itinerary lima belas hari', 'kode': 'A1',
     'maks_baris': 15, 'judul': 'Itinerary harian skenario lima belas hari, 16 Nov sampai 4 Des 2026',
     'judul_daftar': 'Itinerary harian skenario lima belas hari',
     'data': {'csv': c_it15, 'kolom': KOL_HARI, 'keyakinan': 'asumsi-kebijakan', 'sumber': S_MODEL}},
    {'jenis': 'lampiran-tabel', 'jenis_slide': 'lampiran', 'judul_bentuk': 'deskriptif', 'pesan': 'Daftar kampus', 'kode': 'B1',
     'maks_baris': 20, 'judul': 'Daftar kampus kandidat, tingkat, peringkat QS 2027, dan unit kebencanaan', 'judul_daftar': 'Daftar kampus kandidat',
     'data': {'csv': c_kampus, 'kolom': [{'nama': 'kode', 'kepala': 'Kampus'}, {'nama': 'nama', 'kepala': 'Nama resmi', 'rata': 'l'},
                                          {'nama': 'jenis', 'kepala': 'Jenis'}, {'nama': 'tingkat', 'kepala': 'Tingkat'},
                                          {'nama': 'kota', 'kepala': 'Kota'}, {'nama': 'qs', 'kepala': 'QS 2027'},
                                          {'nama': 'unit', 'kepala': 'Unit kebencanaan', 'rata': 'l'}],
              'keyakinan': 'penilaian-pakar', 'sumber': f'{S_QS}; laman kampus dan GADRI, Nov 2026'}},
    {'jenis': 'lampiran-tabel', 'jenis_slide': 'lampiran', 'judul_bentuk': 'deskriptif', 'pesan': 'Rincian biaya', 'kode': 'B2',
     'maks_baris': 16, 'judul': 'Rincian biaya per komponen dan skenario, juta rupiah', 'judul_daftar': 'Rincian biaya per skenario',
     'data': {'csv': c_rinci, 'kolom': [{'nama': 'komponen', 'kepala': 'Komponen'}] + [{'nama': f's{n}', 'kepala': KATA[n], 'fmt': '2'} for n in SK],
              'keyakinan': 'asumsi-kebijakan', 'sumber': S_MODEL}},
    {'jenis': 'lampiran-tabel', 'jenis_slide': 'lampiran', 'judul_bentuk': 'deskriptif', 'pesan': 'Tarif tiket', 'kode': 'B3',
     'maks_baris': 24, 'judul': 'Tarif dan satuan biaya dalam hitungan, ribu rupiah', 'judul_daftar': 'Tarif dan satuan biaya',
     'data': {'csv': c_tiket, 'kolom': [{'nama': 'item', 'kepala': 'Ruas'}, {'nama': 'pagu', 'kepala': 'Pagu', 'fmt': '0'},
                                         {'nama': 'riil', 'kepala': 'Riil', 'fmt': '0'}, {'nama': 'dasar', 'kepala': 'Dasar', 'rata': 'l'}],
              'keyakinan': 'terverifikasi', 'sumber': f'{S_SBM}; KCIC; KAI; tiket.com; Trip.com, 2026'}},
]

for s_ in SLIDE:   # itinerary: sel berkalimat, jadi heatmap mode teks (tabel peringkat hanya satu baris per sel)
    if s_.get('seri') == 'itinerary':
        tb = s_.pop('tabel')
        s_['jenis'] = 'temuan-visual'
        s_['utama'] = {'judul': tb['judul_panel'], 'ikon': 'kalender',
                       'heatmap': {'mode': 'teks', 'skala_huruf': 1.0, 'data': tb['data']}}
        kb = s_.pop('panel')['angka_besar']
        p_ = f'susur.s{kb["_n"]}.'
        s_.pop('rasio', None)
        s_['grup'] = [{'pil': 'Biaya dan cakupan', 'nada': 'data', 'ikon': 'pembiayaan', 'kartu': [
            kt('Rp ' + t(p_ + 'pagu') + ' juta', 'pagu usulan, tim tiga orang', 'pembiayaan', 'oranye'),
            kt('Rp ' + t(p_ + 'riil') + ' juta', 'perkiraan riil', 'pembiayaan'),
            kt(t(p_ + 'kampus'), 'kampus terjangkau', 'sekolah'),
            kt('Rp ' + t(p_ + 'perkampus', '|fmt=2') + ' juta', 'biaya per kampus terjangkau', 'rumah')]}]

BAGIAN = [('Peta kampus kandidat', 'Sasaran dan Kampus', 'Sasaran'), ('Perbandingan tiga skenario', 'Tiga Skenario', 'Skenario'),
          ('Komposisi biaya', 'Biaya', 'Biaya'), ('Rute dan moda', 'Pelaksanaan dan Keputusan', 'Pelaksanaan')]
for n_, (pesan_, _, _) in reversed(list(enumerate(BAGIAN, 1))):
    SLIDE.insert(next(i for i, x in enumerate(SLIDE) if x.get('pesan') == pesan_), {'jenis': 'pembatas-seksi', 'bagian': n_})
SLIDE.insert(1, {'jenis': 'daftar-isi'})

SPEK = {
    '_catatan': 'Rencana susur kampus Jawa, 2 Nov 2026. Dibangun dari spek/bangun_spek_susur.py dan susur_model.py.',
    'arah': 'Pemilik 2 Nov 2026: plan ke PTN dan PTS top di Jawa, itinerary, detail, biaya; tanpa pertanyaan. Revisi sore: 20 dan 30 hari dibuang, paling lama 15 hari.',
    'pesan_kunci': 'Skenario lima belas hari pada 16 Nov sampai 4 Des 2026 menjangkau hampir semua kampus kandidat dengan biaya per kampus terendah.',
    'judul_dokumen': 'Rencana Susur Kampus Jawa',
    'subjek_dokumen': 'Lima skenario kunjungan PTN dan PTS unggulan',
    'format': 'kajian', 'bagian': [{'judul': j_, 'label': l_} for _, j_, l_ in BAGIAN],
    'kajian': 'susur', 'tanggal': '2026-11-02', 'cut_off': '2 Nov 2026',
    'slide': SLIDE,
}


def cek_tiga():
    """Tiga-serangkai di teks slide ditolak gerbang anti-AI (S-18); cek dini sebelum membangun."""
    from slop import TRI, TIGA_RESMI
    teks = []

    def jalan(x):
        if isinstance(x, str):
            teks.append(x)
        elif isinstance(x, dict):
            for k, v in x.items():
                if k not in ('csv', 'sumber', 'foto', 'kredit', 'jenis', 'ikon', 'nada', 'warna'):
                    jalan(v)
        elif isinstance(x, list):
            for v in x:
                jalan(v)
    jalan(SLIDE)
    for p in Path(AKAR / 'data/susur').glob('*.csv'):
        teks += p.read_text(encoding='utf-8').splitlines()
    for s in teks:
        s2 = re.sub(r'\{\{[^}]+\}\}', 'N', s.replace('**', ''))
        for m in TRI.finditer(s2):
            g = [x.lower() for x in m.groups()]
            if any(all(any(r in x for r in st) for x in g) for st in TIGA_RESMI):
                continue
            print('TIGA:', m.group(0), '|', s[:90])


if __name__ == '__main__':
    p = AKAR / 'pustaka.json'
    pl = json.loads(p.read_text(encoding='utf-8'))
    pl = [x for x in pl if x['id'] not in PUSTAKA] + list(PUSTAKA.values())
    p.write_text(json.dumps(pl, ensure_ascii=False, indent=1), encoding='utf-8')
    tema = json.loads((AKAR / 'tema.json').read_text(encoding='utf-8'))
    tema['kajian']['susur'] = {
        'judul': 'Rencana Susur Kampus Jawa',
        'subjudul': 'Tiga Skenario Kunjungan ke PTN dan PTS Unggulan, Tiga sampai Lima Belas Hari',
        'judul_pendek': 'Rencana Susur Kampus Jawa', 'nama_berkas': 'Rencana Susur Kampus Jawa {DDMMYY}',
        'batas_halaman_isi': None, 'lampiran': 'ABCDEFGHIJKL',
        'kata_kunci': ['BNPB', 'perguruan tinggi', 'kunjungan kampus', 'itinerary', 'biaya perjalanan dinas'], 'cakupan_sampul': 'Pulau Jawa'}
    (AKAR / 'tema.json').write_text(json.dumps(tema, ensure_ascii=False, indent=1), encoding='utf-8')
    reg_p = AKAR / 'data/angka.json'
    reg = json.loads(reg_p.read_text(encoding='utf-8'))
    reg['angka'] = {k: v for k, v in reg['angka'].items() if not k.startswith('susur.')}
    reg['angka'].update(ANGKA)
    reg_p.write_text(json.dumps(reg, ensure_ascii=False, indent=1), encoding='utf-8')
    (AKAR / 'spek/susur-021126.json').write_text(json.dumps(SPEK, ensure_ascii=False, indent=2), encoding='utf-8')
    cek_tiga()
    print(f'{len(ANGKA)} angka, {len(SLIDE)} slide')
