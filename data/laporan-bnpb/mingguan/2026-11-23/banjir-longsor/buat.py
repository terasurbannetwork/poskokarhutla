"""Paparan Situasi Banjir Sepekan 16 s.d. 22 Nov 2026 (dibuat 23 Nov 2026).

Mesin dan desain = deck 191126 (../../2026-11-09/banjir-longsor/buat.py). Baris diisi otomatis oleh ../../../generator/banjir_sepekan.py
dari laphar Dit. Koordalops 16 s.d. 22 Nov (WA pagi 17 s.d. 23 Nov di harian/2026-11/2026-11-*/wa-koordalops.txt; WA 22 dan 23 Nov
ditempel pemilik 23 Nov), lalu dikoreksi tangan di KOREKSI di bawah setelah dicek silang ke teks WA.
Probabilitas dan mitigasi dari data prakiraan sistem banjir (centurisk97.id/banjir/data, diunduh 23 Nov 2026) di bahan/gis.

    python buat.py          # keluaran ke Revisi N di folder ini
"""
import os, sys
from datetime import date

SINI = os.path.dirname(os.path.abspath(__file__))
GEN = os.path.abspath(os.path.join(SINI, '..', '..', '..', 'generator'))
sys.path.insert(0, GEN)
import banjir_sepekan as BS

GIS = os.path.join(SINI, 'bahan', 'gis')
if not os.path.exists(os.path.join(GIS, 'status.json')):
    BS.unduh_gis(GIS)
M = BS.muat_mesin(SINI)
BS.isi_mesin(M, date(2026, 11, 16), date(2026, 11, 22), (), GIS, SINI)
M.MINGGU.update(paparan=date(2026, 11, 23), catatan_sumber='')
D = None
M.KODE['Sumatera Utara'] = '12'

# ---------------------------------------------------------------- koreksi hasil generator (cek silang WA, 23 Nov)
# kolom: (prov, kab, kecamatan, mulai, selesai|None, kk, jiwa, ungsi_kk, ungsi_jiwa, tinggi, kabar, kondisi)
KOREKSI = {
    # kejadian baru laphar 22 Nov: dampak dan pengungsi masih pendataan; generator menarik angka kejadian lama (riwayat 21 hari)
    'Pidie Jaya': dict(kk=D, jiwa=D, ungsi_kk=D, ungsi_jiwa=D,
                       kondisi='2 jiwa luka-luka; dampak dalam pendataan'),
    # kalimat Aceh dan Sumatera Utara dipadatkan jadi satu baris: L1 (1/3) berisi 14 kab/kota (gerbang T-7)
    'Aceh Singkil': dict(kondisi='1 jembatan amblas; 5 tiang listrik roboh'),
    'Kota Subulussalam': dict(kondisi='Rumah warga di beberapa titik masih tergenang'),
    'Aceh Selatan': dict(ungsi_jiwa=D, kondisi='Desa Kapasesak masih tergenang 15-20 cm'),
    'Aceh Barat Daya': dict(kondisi='Berangsur surut; dampak dalam pendataan'),
    'Aceh Tamiang': dict(kondisi='Data direvisi menjadi 541 KK; akses jalan putus'),
    'Padang Lawas Utara': dict(kondisi='800 rumah terdampak; 3 ruas jalan putus'),
    'Mandailing Natal': dict(mulai='18 Nov', kondisi='Sebagian surut; pembersihan alat berat'),
    # "melaksanakan pembersihan material pasca banjir" = sudah surut
    'Padang Lawas': dict(selesai='19 Nov', kondisi='78 rumah, 1 jembatan gantung terdampak'),
    'Tapanuli Tengah': dict(kondisi='Pembersihan lumpur; pengungsi sudah pulang'),
    'Pasaman Barat': dict(kondisi='1 jorong di Kecamatan Sasak Ranah Pasisia belum surut'),
    'Dharmasraya': dict(kondisi='Pembersihan rumah terdampak'),
    'Kota Mataram': dict(kondisi='2 rumah rusak'),
    'Lima Puluh Kota': dict(mulai='19 Nov', kondisi='Mulai surut; 451 rumah, 19 ruas jalan, 17 sekolah terdampak'),
    'Rokan Hilir': dict(mulai='15 Nov', kondisi='Surut 17 Nov, naik lagi 20 Nov (20-40 cm), surut kembali 22 Nov'),
    'Kota Dumai': dict(kondisi='Banjir belum surut; dampak dalam pendataan'),
    'Kota Pekanbaru': dict(kondisi='Banjir sudah surut; 500 m jalan sempat tergenang 10-20 cm'),
    'Seluma': dict(mulai='16 Nov', kondisi='Banjir belum surut; 66 rumah terdampak'),
    'Bengkulu Utara': dict(kondisi='Banjir belum surut; 230 rumah, 1 sekolah terdampak'),
    'Kota Bengkulu': dict(kondisi='Air sudah surut; data terakhir 2.539 KK, 8.662 jiwa'),
    'Boyolali': dict(jiwa=D, kondisi='Banjir sudah surut; 36 jiwa yang mengungsi sudah pulang'),
    'Banyuwangi': dict(mulai='18 Nov', kondisi='Air surut total; warga membersihkan material; 3 rumah rusak, 2 sekolah terdampak'),
    'Bima': dict(kondisi='Genangan mulai surut, warga membersihkan rumah; dampak dalam pendataan'),
    'Kapuas Hulu': dict(kondisi='Banjir belum surut; BPBD mengevakuasi warga; 11.113 rumah terdampak'),
    'Melawi': dict(mulai='16 Nov', kondisi='Debit air berangsur surut; 178 rumah terdampak'),
    # laphar 21 Nov ditulis "Banjr di Kab. Sambas" sehingga tidak terbaca generator; kejadian 16 Nov sudah surut, banjir baru 19 Nov
    'Sambas': dict(mulai='19 Nov', kk=281, tinggi='15-100 cm', kabar='21 Nov', kondisi='Tinggi muka air 15-100 cm; 281 rumah terdampak'),
    'Kota Singkawang': dict(kondisi='Air belum surut, tinggi 5-30 cm; 13 desa di 5 kecamatan terdampak'),
}
URUT = ['prov', 'kab', 'kec', 'mulai', 'selesai', 'kk', 'jiwa', 'ungsi_kk', 'ungsi_jiwa', 'tinggi', 'kabar', 'kondisi']
baru, sudah = [], set()
for r in M.BANJIR:
    if r[1] in sudah:   # Lima Puluh Kota tertulis dua ejaan ("Lima puluh Kota", "Limapuluh Kota"): baris laporan terbaru dipakai
        continue
    sudah.add(r[1])
    o = dict(zip(URUT, r)); o.update(KOREKSI.get(r[1], {}))
    baru.append(tuple(o[k] for k in URUT))
# tidak terbaca generator: Nias ("Banjr", laphar 20 Nov) dan Padangsidimpuan (ejaan geo "Kota Padang Sidempuan")
baru += [('Sumatera Utara', 'Nias', '', '20 Nov', '20 Nov', 3, D, D, D, D, '20 Nov', 'Banjir sudah surut; 3 rumah terdampak'),
         ('Sumatera Utara', 'Kota Padang Sidempuan', '', '20 Nov', D, 50, D, D, D, D, '20 Nov',
          '50 rumah terdampak; pengungsi didata')]
M.BANJIR = sorted(baru, key=lambda r: (M.KODE[r[0]], r[4] is not None, -(r[5] or 0)))
BS.multipeta(M)

# pengungsian: Pidie Jaya (angka kejadian lama) dibuang; Aceh Tamiang masih 103 jiwa mengungsi per laphar 22 Nov
M.UNGSI = [u for u in M.UNGSI if u[1] != 'Pidie Jaya']
M.UNGSI = [(u[0], u[1], u[2], True, 28, 103, 'Lokasi belum disebut; banjir sudah surut, 103 jiwa masih tercatat mengungsi', '22 Nov')
           if u[1] == 'Aceh Tamiang' else u for u in M.UNGSI]
M.UNGSI = [(u[0], u[1], u[2], u[3], u[4], u[5], 'Lokasi belum disebut; 20 Nov: pengungsi dalam pendataan', u[7])
           if u[1] == 'Aceh Selatan' else u for u in M.UNGSI]
M.UNGSI_HARI['kab'].pop('Pidie Jaya', None)
M.UNGSI_HARI['catatan'] = '"–" = laporan hari itu tidak memuat angka pengungsi'

# mitigasi: 14 kab/kota belum surut dengan dampak terbesar atau genangan yang masih dilaporkan (panel kiri muat 18 baris)
M.MITIGASI = {
    'Kapuas Hulu': 'Lanjutkan evakuasi warga; tuntaskan pendataan 11.113 rumah terdampak',
    'Pidie Jaya': 'Pantau genangan 10-100 cm sampai surut; rawat 2 korban luka; tuntaskan pendataan',
    'Aceh Singkil': 'Pantau desa yang belum surut; pulihkan jembatan beton amblas; ganti 5 tiang listrik PLN yang roboh',
    'Kota Subulussalam': 'Layani 18 jiwa pengungsi; pantau rumah warga yang masih tergenang',
    'Aceh Selatan': 'Pantau genangan 15-20 cm di Desa Kapasesak; tuntaskan pendataan pengungsi',
    'Aceh Barat Daya': 'Tuntaskan pendataan dampak dan pengungsi',
    'Padang Lawas Utara': 'Buka 3 ruas jalan yang terputus longsor; tuntaskan pendataan 800 rumah terdampak',
    'Mandailing Natal': 'Lanjutkan pembersihan material dengan alat berat; pulihkan 7 akses jalan',
    'Pasaman Barat': 'Pantau 1 jorong yang belum surut di Kecamatan Sasak Ranah Pasisia',
    'Lima Puluh Kota': 'Layani 9 jiwa pengungsi; pulihkan 19 ruas jalan dan 17 sekolah terdampak',
    'Kuantan Singingi': 'Pantau 233 rumah yang belum surut; siapkan evakuasi bila air naik',
    'Kota Dumai': 'Tuntaskan pendataan dampak; pantau wilayah yang belum surut',
    'Sambas': 'Pantau 281 rumah tergenang 15-100 cm; siapkan evakuasi bila air naik',
    'Kota Singkawang': 'Pantau genangan 5-30 cm di 13 desa; tuntaskan pendataan',
}

M.N_SIAGA_MITIGASI = 9   # 12 Siaga meluap di panel kanan (4 Awas lanjutan di atasnya)


# ---------------------------------------------------------------- tata letak untuk 46 kab/kota (deck 191126: 13 kab/kota)
# Pemilik 23 Nov 2026 ("coba bikin semuanya ada di peta"): semua 46 kab/kota berlabel, merah belum surut, biru sudah surut.
# Supaya muat: peta dilebarkan 418 -> 560 pt, pil hanya nama (8 pt, warna = status), tabel per kab/kota diganti rekap per provinsi
# yang ramping di kanan (rincian per kab/kota di L1).
# Pemilik 23 Nov 2026 (Revisi 4 berkolom ditolak, "lebih suka yang sebelumnya"): Sumatera dipecah per provinsi supaya tidak padat;
# label tetap dicari di dekat titiknya seperti Revisi 3. Panel Sumatera berbagi satu skala (lebih besar), panel Jawa dan Nusa Tenggara
# Barat serta Kalimantan Barat berbagi skala lain; tiap panel memuat skala 100 km sendiri.
PETA = BS.PETA = (43.2, 102.0, 560.0, 338.0)
KANAN_PETA = PETA[0] + PETA[2]
T_PIL = 13.0
_y1, _y2, _h = 102.0, 274.0, 166.0
SUSUN = [   # (judul panel, kode provinsi, x, y, w, h, kelompok skala)
    ('Aceh', ['11'], 43.2, _y1, 196.0, _h, 'sum'),
    ('Sumatera Utara', ['12'], 245.2, _y1, 194.0, _h, 'sum'),
    ('Sumatera Barat', ['13'], 43.2, _y2, 116.0, _h, 'sum'),
    ('Riau', ['14'], 165.2, _y2, 140.0, _h, 'sum'),
    ('Bengkulu dan Sumatera Selatan', ['16', '17'], 311.2, _y2, 128.0, _h, 'sum'),
    ('Jawa dan Nusa Tenggara Barat', ['31', '32', '33', '34', '35', '36', '51', '52', '53'], 445.2, _y1, 158.0, _h, 'lain'),
    ('Kalimantan Barat', ['61'], 445.2, _y2, 158.0, _h, 'lain'),
]
_pts = {r[1]: M.pusat(M.KODE[r[0]], r[1]) for r in M.BANJIR}
_isi = {nm: [r for r in M.BANJIR if M.KODE[r[0]] in kode] for nm, kode, *_ in SUSUN}
assert sum(len(v) for v in _isi.values()) == len(M.BANJIR), 'ada kab/kota di luar panel'
_PAD = 0.35
_batas = {}
for nm, kode, x, y, w, h, g in SUSUN:
    xs, ys = [_pts[r[1]][0] for r in _isi[nm]], [_pts[r[1]][1] for r in _isi[nm]]
    bw, bh = max(max(xs) - min(xs) + 2 * _PAD, 1.2), max(max(ys) - min(ys) + 2 * _PAD, 1.2)
    _batas[nm] = ((min(xs) + max(xs)) / 2, (min(ys) + max(ys)) / 2, min(w / bw, (h - 14 - 16) / bh))   # 16 pt bawah: skala 100 km
SKALA = {g: min(60.0, *[_batas[nm][2] for nm, *_, g_ in SUSUN if g_ == g]) for g in ('sum', 'lain')}
KODE_PANEL = {nm: set(kode) for nm, kode, *_ in SUSUN}   # pemilik 23 Nov 2026: panel provinsi hanya mewarnai kab/kota provinsinya sendiri
SEMUA = sorted(M.SEMUA_PROV)
M.PANEL_BANJIR, SKALA_PANEL, _titik = [], {}, {}
for nm, kode, x, y, w, h, g in SUSUN:
    s = SKALA[g]; cx, cy, _ = _batas[nm]
    lon0, la1 = cx - w / s / 2, cy + (h - 30) / s / 2 + 14 / s
    M.PANEL_BANJIR.append((nm, x, y, w, h, (lon0, la1), SEMUA)); SKALA_PANEL[nm] = s
    for r in _isi[nm]:
        lon, lat = _pts[r[1]]
        _titik[r[1]] = (x + (lon - lon0) * s, y + (la1 - lat) * s)


def lebar(kab):
    return len(kab) * 8 * 0.53 + 20


def km_skala(s):
    """Panjang batang skala: 100 km, atau 50 km bila 100 km lebih dari 70 pt."""
    km = 100 if 100 / 111 * s <= 70 else 50
    return km, km / 111 * s


def tata_label(rows, panel, titik):
    """Pola BS.tata_label_panel (Revisi 3): pil di panelnya sendiri, di celah terdekat titiknya; wilayah berwarna dihindari bila bisa."""
    from PIL import Image, ImageDraw
    x0, y0, W, H = PETA
    masker = Image.new('1', (int(W) + 1, int(H) + 1), 0); dm = ImageDraw.Draw(masker)
    larang = []
    for nm, px, py, pw, ph, (lon0, la1), _ in panel:
        s = SKALA_PANEL[nm]
        for r in [r for r in M.BANJIR if M.KODE[r[0]] in KODE_PANEL[nm]]:
            f = next((f for f in M.geo(M.KODE[r[0]]) if f['properties']['kab'] == r[1]), None)
            for poly in (M.cincin(f) if f else []):
                q = [(min(max(px + (lo - lon0) * s, px), px + pw) - x0, min(max(py + (la1 - la) * s, py), py + ph) - y0) for lo, la in poly[0]]
                if len(q) > 2:
                    dm.polygon(q, fill=1)
        larang.append((px, py, px + min(pw, len(nm) * 4.6 + 12), py + 14))                  # judul panel
        larang.append((px + pw - km_skala(s)[1] - 12, py + ph - 18, px + pw, py + ph))       # skala
    larang.append((PETA[0], _y1 + _h - 30, PETA[0] + 16, _y1 + _h))                         # panah utara (panel Aceh)
    titik_kotak = [(tx - 3, ty - 3, tx + 3, ty + 3) for tx, ty in titik.values()]   # menutup titik kab/kota lain: dihindari, tidak dilarang
    tumbuk = lambda a, b: a[0] < b[2] + 1.5 and b[0] < a[2] + 1.5 and a[1] < b[3] + 1.5 and b[1] < a[3] + 1.5
    pos, taruh = {}, []
    for r in sorted(rows, key=lambda r: (r[4] is not None, titik[r[1]][1])):   # belum surut dulu
        kab, (tx, ty) = r[1], titik[r[1]]
        lw = lebar(kab)
        p = next(p for p in panel if p[1] <= tx <= p[1] + p[3] and p[2] <= ty <= p[2] + p[4])
        terbaik = None
        # baris tetap berjarak seragam (bukan sembarang y): celah sempit di antara label tidak terbuang, label rapi sebaris
        for y in [p[2] + 15 + i * (T_PIL + 2.5) for i in range(int((p[4] - 15 - 4 - T_PIL) // (T_PIL + 2.5)) + 1)]:
            for x in range(int(p[1] + 3), int(p[1] + p[3] - lw - 3) + 1, 3):
                kt = (x, y, x + lw, y + T_PIL)
                if any(tumbuk(kt, b) for b in taruh + larang):
                    continue
                tutup = masker.crop((int(x - x0), int(y - y0), int(kt[2] - x0), int(kt[3] - y0))).getbbox() is not None
                dx = 0 if x <= tx <= kt[2] else min(abs(x - tx), abs(kt[2] - tx))
                skor = dx + abs(y + T_PIL / 2 - ty) * 0.8 + (40 if tutup else 0) + 120 * sum(tumbuk(kt, b) for b in titik_kotak)
                if terbaik is None or skor < terbaik[0]:
                    terbaik = (skor, x, y)
        if terbaik is None:
            raise SystemExit(f'label {kab} tidak mendapat tempat di panel {p[0]}')
        _, x, y = terbaik
        pos[kab] = (round(x, 1), round(y, 1))
        taruh.append((x, y, x + lw, y + T_PIL))
    return pos


M.POS_BANJIR = tata_label(M.BANJIR, M.PANEL_BANJIR, _titik)


def pil(k, x, y, nama, merah, titik):
    """label_peta mesin, dikecilkan (nama 8 pt, tanpa teks status; warna = status)."""
    lw, T = lebar(nama), T_PIL
    tx, ty = titik
    if x <= tx <= x + lw and y <= ty <= y + T:
        ax, ay = tx, ty
    elif tx < x or tx > x + lw:
        ax, ay = (x if tx < x else x + lw), y + T / 2
    else:
        ax, ay = tx, (y if ty < y else y + T)
    if abs(ax - tx) + abs(ay - ty) > 4:
        k.garis(ax, ay, tx, ty, M.GARIS_PANAH, 0.6)
    k.bulat(x, y, lw, T, M.PITA_MERAH if merah else M.PITA_BIRU)
    k.kotak(x + 1.8, y + 1.8, 9.4, 9.4, M.MERAH if merah else M.BIRU, bentuk=M.MSO_SHAPE.OVAL)
    k.gambar(M.ikon('peringatan' if merah else 'rumah'), x + 3.3, y + 3.3, 6.4, 6.4)
    k.teks(x + 13.5, y, lw - 14, T, [M.R(nama, 8, M.TEKS, True)], bungkus=False)
    k.kotak(tx - 2.2, ty - 2.2, 4.4, 4.4, M.PUTIH, M.TEKS, bentuk=M.MSO_SHAPE.OVAL)


def peta_banjir_panel(k, warna):
    for i, (nama, x, y, w, h, (lon0, la1), provs) in enumerate(M.PANEL_BANJIR):
        s = SKALA_PANEL[nama]
        ext = (lon0, lon0 + w / s, la1, la1 - h / s)
        png = os.path.join(SINI, 'bahan', f'peta-banjir-{i + 1}.png')
        M.gambar_peta(png, ext, (int(w * 5), int(h * 5)), {kk: v for kk, v in warna.items() if kk[0] in KODE_PANEL[nama]}, provs)
        k.bulat(x, y, w, h, M.PUTIH, M.GARIS_INSET, radius=3)
        k.gambar(png, x, y, w, h)
        # judul di pita putih: peta provinsi yang diperbesar berwarna sampai tepi atas panel
        k.bulat(x + 2, y + 2, min(w - 4, len(nama) * 4.4 + 10), 12, M.PUTIH, radius=2)
        k.teks(x + 5, y + 2, w - 10, 12, [M.R(nama, 8, M.TEKS3, True)], bungkus=False)
        km, pt = km_skala(s)   # skala per panel, kanan bawah
        k.garis(x + w - 6 - pt, y + h - 6, x + w - 6, y + h - 6, M.NAVY, 1.0)
        k.teks(x + w - 6 - max(pt, 40), y + h - 17, max(pt, 40), 10, [M.R(f'{km} km', 7, M.NAVY, True)], rata='r', bungkus=False)
    for r in M.BANJIR:
        pil(k, *M.POS_BANJIR[r[1]], r[1], not r[4], _titik[r[1]])
    x, y = PETA[0] + 5, _y1 + _h - 26   # panah utara satu kali, panel Aceh kiri bawah
    k.kotak(x + 1, y, 7, 10, M.NAVY, bentuk=M.MSO_SHAPE.ISOSCELES_TRIANGLE)
    k.teks(x - 4, y + 10, 17, 9, [M.R('U', 7, M.NAVY, True)], rata='c', bungkus=False)



def s_peta_banjir(Dk):
    """Pola mesin; kartu jumlah di bawah peta dilebarkan selebar peta baru (560 pt)."""
    belum = [r for r in M.BANJIR if not r[4]]
    s, k = Dk.slide(M.judul(f'Terdapat [{len(M.BANJIR)}] kab/kota terdampak banjir pada periode {M.periode()}; '
                            f'[{len(belum)}] kab/kota ([{M.f0(sum(r[5] or 0 for r in belum))}] KK) belum dilaporkan surut'))
    warna = {(M.KODE[r[0]], r[1]): (M.MERAH if not r[4] else M.BIRU) for r in M.BANJIR}
    peta_banjir_panel(k, warna)
    lk = (BS.PETA[2] - 5) / 2
    M.kartu(k, 43.2, 446.4, lk, len(belum), 'Belum dilaporkan surut (kab/kota)', True)
    M.kartu(k, 43.2 + lk + 5, 446.4, lk, len(M.BANJIR) - len(belum), 'Sudah dilaporkan surut (kab/kota)', False)
    return tabel_peta_banjir(k)


def tabel_peta_banjir(k):
    x, w = KANAN_PETA + 10, 916.8 - KANAN_PETA - 10
    kol = [('PROVINSI', w - 206, 'l'), ('KAB/KOTA', 46, 'c'), ('BELUM SURUT', 50, 'c'), ('KK', 56, 'c'), ('MENGUNGSI', 54, 'c')]
    baris, tot = [], [0, 0, 0, 0, 0]
    for prov in dict.fromkeys(r[0] for r in M.BANJIR):
        rs = [r for r in M.BANJIR if r[0] == prov]
        b = sum(1 for r in rs if not r[4])
        kk, uj, uk = sum(r[5] or 0 for r in rs), sum(r[8] or 0 for r in rs), sum(r[7] or 0 for r in rs if not r[8])
        tot = [tot[0] + len(rs), tot[1] + b, tot[2] + kk, tot[3] + uj, tot[4] + uk]
        baris.append(('data', [prov, len(rs), ('runs', [M.R(str(b) if b else '–', 9, M.MERAH if b else M.TEKS, True)]), M.f0(kk),
                               M.ungsi_jml(uj, uk, M.TEKS) if uj or uk else '–']))
    baris.append(('total', ['Total', tot[0], tot[1], M.f0(tot[2]), M.ungsi_jml(tot[3], tot[4], M.PUTIH)]))
    M.tabel(k, x, 101, kol, baris, kepala=26, minh=22)   # kepala 2 baris: "BELUM SURUT" terbungkus, 16,6 pt terlalu sesak
    # pemilik 23 Nov 2026: catatan kaki di bawah tabel dihilangkan


def _rincian_banjir(Dk, provs, hal):
    """Pola mesin, dirapikan (pemilik 23 Nov 2026: "bagusin", "surut belum surut bisa dibikin pill"): status jadi kolom pil sendiri
    (merah Belum surut, biru Surut tanggal), kolom KECAMATAN TERDAMPAK dibuang (minggu ini tidak ada laporan yang menyebut kecamatan),
    kalimat kondisi hanya fakta tanpa mengulang status, semua baris satu baris dan setinggi sama."""
    import re
    s, k = Dk.slide(M.judul(f'L1. Rincian [{len(M.BANJIR)}] kab/kota terdampak banjir{hal}'))
    M.kepala_panel(k, 43.2, 102, 873.6, 'Banjir sepekan per kab/kota', 'banjir',
                   f'Lama = hari sejak banjir mulai sampai surut, atau sampai {M.tgl_l(M.MINGGU["akhir"])} bila belum surut')
    kol = [('KAB/KOTA', 128, 'l'), ('STATUS', 82, 'c'), ('MULAI', 40, 'c'), ('LAMA', 32, 'c'), ('KK', 46, 'c'), ('JIWA', 46, 'c'),
           ('MENGUNGSI', 72, 'c'), ('TINGGI AIR', 52, 'c'), ('KONDISI TERAKHIR', 331.6, 'l'), ('KABAR', 44, 'c')]
    ulang = re.compile(r'^(?:banjir|air)\s+(?:sudah|telah)\s+surut(?:\s+total)?\s*[;,.]?\s*|^(?:banjir|air)\s+belum\s+surut\s*[;,.]?\s*', re.I)
    baris = []
    for prov in provs:
        baris.append(('prov', prov))
        for r in (r for r in M.BANJIR if r[0] == prov):
            ung = ' / '.join(x for x in (f'{M.f0(r[7])} KK' if r[7] else '', f'{M.f0(r[8])} jiwa' if r[8] else '') if x) or '–'
            isi = ulang.sub('', r[11]).strip()
            isi = re.sub(r'^(?:banjir|air)\s+(?=(?:sudah\s+)?(?:mulai|berangsur))', '', isi, flags=re.I)   # "Banjir mulai surut" -> "Mulai surut"
            isi = (isi[:1].upper() + isi[1:]) if isi else '–'
            pil = ('pil', 'Belum surut' if not r[4] else f'Surut {r[4]}', not r[4], 8)
            baris.append(('data', [('runs', [M.R(r[1], 8.5, M.TEKS, True)]), pil, r[3] or '–', M.f0(M.lama(r[3], r[4])), M.f0(r[5]),
                                   M.f0(r[6]), ung, r[9] or '–', ('runs', [M.R(isi, 8, M.TEKS)]), r[10]]))
    M.tabel(k, 43.2, 140, kol, baris, bawah=500, pt=8, maks=BARIS_L1, minh=BARIS_L1)


BARIS_L1 = 20.0   # tinggi baris data L1 (pt): pil 16 pt terbaca, semua baris setinggi sama


def s_rincian_banjir(Dk):
    """L1 dipecah per batas provinsi: jumlah halaman paling sedikit yang muat (ruang 340 pt), lalu potongan dicari yang paling
    seimbang supaya tidak ada halaman yang hampir kosong."""
    from itertools import combinations
    provs = list(dict.fromkeys(r[0] for r in M.BANJIR))
    t_ = [14.4 + BARIS_L1 * sum(1 for r in M.BANJIR if r[0] == p) for p in provs]
    for n in range(1, len(provs) + 1):
        calon = []
        for cut in combinations(range(1, len(provs)), n - 1):
            b_ = (0,) + cut + (len(provs),)
            hs = [sum(t_[b_[i]:b_[i + 1]]) for i in range(n)]
            if max(hs) <= 340:
                calon.append((max(hs) - min(hs), b_))
        if calon:
            _, b_ = min(calon)
            break
    bagi = [provs[b_[i]:b_[i + 1]] for i in range(len(b_) - 1)]
    for i, ps in enumerate(bagi, 1):
        _rincian_banjir(Dk, ps, f' ({i}/{len(bagi)})')
    return len(bagi)


def s_lampiran_ungsi(Dk, no='L2', jenis=None):
    """Pola mesin, dirapatkan: tanpa baris provinsi dan baris jenis (semua banjir), supaya tabel perkembangan muat di bawahnya."""
    U = [r for r in M.UNGSI if r[2] == 'banjir']
    t_j, t_k = sum(r[5] or 0 for r in U), sum(r[4] or 0 for r in U)
    s, k = Dk.slide(M.judul(f'{no}. Pengungsian sepekan di [{len(U)}] kab/kota'))
    M.kepala_panel(k, 43.2, 102, 873.6, 'Pengungsi per kab/kota', 'pengungsi',
                   'Angka dari laporan terakhir yang memuatnya; pengungsi yang sudah kembali tetap dicatat')
    kol = [('KAB/KOTA', 150, 'l'), ('PROVINSI', 112, 'l'), ('KONDISI', 100, 'c'), ('KK', 50, 'c'), ('JIWA', 56, 'c'),
           ('LOKASI PENGUNGSIAN DAN KETERANGAN', 345.6, 'l'), ('KABAR', 60, 'c')]
    baris = [('data', [('runs', [M.R(r[1], 8.5, M.TEKS, True)]), r[0], ('pil', 'Belum surut' if r[3] else 'Sudah surut', r[3], 8.6),
                       M.f0(r[4]), M.f0(r[5]), M.rt(r[6], 8), r[7]]) for r in U]
    baris.append(('total', ['Jumlah', '', '', M.f0(t_k), M.f0(t_j), ('runs', [M.R('KK dan jiwa dijumlah terpisah: tidak semua kab/kota melaporkan keduanya',
                                                                                  7.5, M.PUTIH, False)]), '']))
    M.tabel(k, 43.2, 136, kol, baris, bawah=300, pt=8, maks=20, minh=16)
    hari = M.UNGSI_HARI
    tgl = hari['tanggal']
    M.kepala_panel(k, 43.2, 312, 873.6, 'Perkembangan jiwa mengungsi per laporan harian', 'pengungsi', hari.get('catatan'))
    lebar = (873.6 - 150 - 110) / len(tgl)
    kol2 = [('KAB/KOTA', 150, 'l')] + [(t.upper(), lebar, 'c') for t in tgl] + [('PERUBAHAN', 110, 'c')]
    b2, tot = [], [0] * len(tgl)
    for kab, v in hari['kab'].items():
        ada = [x for x in v if x is not None]
        d = ada[-1] - ada[0] if len(ada) > 1 else None
        ubah = '–' if d is None else ('tetap' if d == 0 else f'{"+" if d > 0 else "−"}{M.f0(abs(d))} jiwa')
        b2.append(('data', [kab] + [M.f0(x) for x in v] + [ubah]))
        tot = [a + (x or 0) for a, x in zip(tot, v)]
    b2.append(('total', ['Jumlah'] + [M.f0(x) for x in tot] + ['']))
    M.tabel(k, 43.2, 346, kol2, b2, bawah=500, pt=8, maks=20, minh=14)


M.peta_banjir_panel, M.tabel_peta_banjir, M.s_rincian_banjir, M.s_lampiran_ungsi = peta_banjir_panel, tabel_peta_banjir, s_rincian_banjir, s_lampiran_ungsi
M.s_peta_banjir = s_peta_banjir
M._rincian_banjir = _rincian_banjir

if __name__ == '__main__':
    M.main()
