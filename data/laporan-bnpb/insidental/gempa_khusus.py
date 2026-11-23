"""Mesin Laporan Khusus Gempa satu halaman, gaya baku pemilik 20 Nov 2026 (dibakukan dari Laporan Khusus Gempa M5,4 Nias Barat 191126).

Pemilik 20 Nov 2026: "ke depan kalau mau bikin laporan gempa, kayak gini ya". Tiap kejadian cukup satu buat.py berisi KONFIG
lalu `gempa_khusus.bangun(KONFIG)`; tata letak, warna, dan aturan ada di sini saja. Contoh: gempa-nias-2026-11-19/buat.py.

Isi halaman (kiri ke kanan):
- Judul dua baris, baris baru sesudah titik koma; bagian [..] oranye.
- Peta guncangan per kab/kota (MMI MODEL repo scripts/gempa/guncangan.py, bukan pengamatan), cincin jarak putus-putus tiap
  100 km di lapisan paling bawah, cap "Laporan dibuat ... WIB", pil kab/kota merah = ada laporan (laphar BPBD atau daftar
  dirasakan BMKG), biru = belum ada laporan; dua kartu di bawah peta adalah legenda pil itu.
- Blok magnitudo navy + panel parameter berikon (waktu, kedalaman, pusat gempa, potensi tsunami).
- Tabel kondisi menurut BPBD dan BMKG: semua kab/kota tercatat (BPBD dan dirasakan BMKG), kolom korban dan kerusakan, sampai ke
  kotak MMI; satu baris paparan penduduk dibulatkan hanya bila model menunjukkan MMI VI ke atas. Tabel penduduk per kelas MMI
  dibuang (pemilik 20 Nov 2026: presisi palsu dari model yang belum diuji); masih bisa dinyalakan dengan 'tabel_penduduk': True.
- Kotak arti MMI (semua kelas di peta, bahasa umum) dan kotak tautan "Skala lengkap" ke situs BMKG.

BAWAAN SEJAK 23 Nov 2026 (pemilik: "jadikan alternatif ini sebagai default", Talaud 221126 Alternatif 1): SATU halaman. Tabel
kondisi setinggi isinya, di bawahnya blok peluang susulan M5 (blok_susulan_hal1: skala bertingkat per jendela 24 jam/3 hari/7 hari,
grafik kumulatif hari ke-1..7, satu baris kesimpulan 30 hari berikon info bergaris). Halaman kedua di bawah ini hanya dibuat bila
KONFIG 'dua_halaman': True, atau otomatis bila tabel kondisi terlalu panjang sehingga blok susulan tidak muat (contoh: Banda 171126).

Halaman kedua (pemilik 20 Nov 2026): kiri prediksi gempa susulan, kanan penanganan yang sudah dilakukan dan langkah yang disarankan.
- Susulan: model repo scripts/gempa/susulan.py (Reasenberg-Jones, kalibrasi Indonesia), hanya target yang terbit (M >= 5);
  peluang kumulatif sejak gempa utama; susulan tercatat dari USGS FDSN dalam jendela Gardner-Knopoff.
- Langkah disarankan dipilih dengan aturan tetap dari katalog tindakan gempa (public/bencana.json, logbook Pusdalops), tidak dikarang.
"""
import importlib.util, json, math, os, sys
from collections import Counter, defaultdict
from datetime import datetime, timedelta, timezone

DI_SINI = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(DI_SINI, '..', '..', '..'))
LB = os.path.join(REPO, 'data', 'laporan-bnpb')

_s = importlib.util.spec_from_file_location('bl', os.path.join(LB, 'mingguan/2026-11-09/banjir-longsor', 'buat.py'))
BL = importlib.util.module_from_spec(_s); _s.loader.exec_module(BL)
R, judul, tabel, kartu, label_peta, kepala_panel, rt, f0 = BL.R, BL.judul, BL.tabel, BL.kartu, BL.label_peta, BL.kepala_panel, BL.rt, BL.f0
TEKS, NAVY, MERAH, PUTIH, GARIS, KAB_TINT, TEKS3 = BL.TEKS, BL.NAVY, BL.MERAH, BL.PUTIH, BL.GARIS, BL.KAB_TINT, BL.TEKS3
sys.path.insert(0, os.path.join(REPO, 'scripts', 'gempa'))
import guncangan as G   # noqa: E402
from pptx.enum.shapes import MSO_SHAPE   # noqa: E402
from PIL import ImageFont   # noqa: E402

ROMAWI = {1: 'I', 2: 'II', 3: 'III', 4: 'IV', 5: 'V', 6: 'VI', 7: 'VII', 8: 'VIII', 9: 'IX', 10: 'X'}
DARI_ROMAWI = {v: k for k, v in ROMAWI.items()}
# tangga warna dari terang ke gelap; kelas terendah yang diwarnai memakai warna pertama (Nias: II terang, III; Banda: III..VI)
TANGGA = ['FBE7D6', 'F4C3A0', 'E8894A', 'D9600B', 'A84808']
# arti tiap kelas MMI dalam bahasa umum untuk pimpinan (pemilik 20 Nov 2026: kalimat baku BMKG seperti cerobong asap dan bandul
# lonceng dibuang; "bikin yang umum dan jelas"). Ringkasan dari skala MMI BMKG; skala lengkap lewat kotak tautan.
MMI_RINGKAS = {
    1: 'Tidak terasa; hanya terekam alat.',
    2: 'Terasa oleh orang yang sedang diam.',
    3: 'Terasa jelas di dalam rumah.',
    4: 'Terasa banyak orang; jendela bergetar.',
    5: 'Terasa hampir semua orang; benda jatuh.',
    6: 'Warga panik keluar rumah; rusak ringan.',
    7: 'Bangunan kurang kokoh rusak sedang.',
    8: 'Bangunan biasa rusak berat.',
    9: 'Bangunan kokoh rusak berat.',
    10: 'Sebagian besar bangunan hancur.',
}
URL_MMI = 'https://www.bmkg.go.id/gempabumi/skala-mmi'
BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
FON = os.path.join(REPO, 'data', 'kajian-bnpb', 'skill', 'deck-bnpb', 'assets', 'fonts', 'Roboto-Bold.ttf')
lebar = lambda t, pt: ImageFont.truetype(FON, int(pt * 20)).getlength(t) / 20   # lebar teks Roboto tebal dalam pt
PETA = (43.2, 102, 418, 338)   # x, y, w, h peta di slide
PX = (2000, int(2000 * 338 / 418))
band = lambda m: int(m + 0.5)


def nama_kab(kab):
    return kab if kab.startswith('Kota') else f'Kab. {kab}'


def angka(v, d=2):
    return f'{abs(v):.{d}f}'.replace('.', ',')


def koordinat(lat, lon):
    return f"{angka(lat)} {'LU' if lat >= 0 else 'LS'} {angka(lon)} BT"


def _hitung(c):
    pend = json.load(open(os.path.join(REPO, 'public', 'data', 'penduduk.json'), encoding='utf-8'))['kec']
    pk = json.load(open(os.path.join(REPO, 'public', 'banjir', 'data', 'pusat_kec.json'), encoding='utf-8'))
    g = c['gempa']
    kelas, maks, dekat = defaultdict(Counter), defaultdict(float), {}
    for kunci, (la, lo) in pk.items():
        kp, kab = kunci.split('|')[:2]
        if kp not in c['prov'] or kab == 'None':
            continue
        r = G.jarak_km(g['lat'], g['lon'], la, lo)
        m = G.mmi_perkiraan(g['m'], r, g['dalam'], g.get('jenis'))
        kelas[kab][band(m)] += pend.get(kunci, 0)
        maks[kab] = max(maks[kab], m)
        dekat[kab] = min(dekat.get(kab, 1e9), r)
        c.setdefault('_prov_kab', {})[kab] = kp
    return kelas, maks, dekat


def tata_label(calon, titik, lebar_lb, hindari, laut, beririsan, h=15.8):
    """Posisi kiri-atas pil label per kab/kota: rakus menurut urutan calon. Tiap calon dicoba di 8 arah pada 4 jarak dari titiknya;
    dipilih yang tidak menabrak (label lain, titik kab, cap waktu, legenda, skala, pusat gempa), di dalam peta, dengan skor
    jarak + hukuman bila pil menutupi daratan. Kab yang tidak mendapat tempat tidak diberi label (tetap tampil di tabel)."""
    pakai, pos = list(hindari), {}
    for kab in calon:
        tx, ty = titik[kab]
        w = lebar_lb[kab]
        terbaik = None
        for jr in (16, 30, 48, 72):
            for x, y in ((tx + jr, ty - h / 2), (tx - jr - w, ty - h / 2), (tx + jr * .6, ty - jr - h), (tx - w - jr * .6, ty - jr - h),
                         (tx + jr * .6, ty + jr), (tx - w - jr * .6, ty + jr), (tx - w / 2, ty - jr - h), (tx - w / 2, ty + jr)):
                kotak = (x, y, w, h)
                if not (48 <= x and x + w <= 461 and 104 <= y and y + h <= 438):
                    continue
                if any(beririsan((x - 3, y - 3, w + 6, h + 6), hb) for hb in pakai):
                    continue
                darat = sum(not laut(x + w * fx, y + h * fy) for fx in (.1, .5, .9) for fy in (.2, .8)) / 6
                skor = jr + 40 * darat
                if terbaik is None or skor < terbaik[0]:
                    terbaik = (skor, kotak)
            if terbaik and terbaik[0] < jr + 20:   # cukup baik pada jarak ini; jangan menjauh
                break
        if terbaik:
            pos[kab] = terbaik[1][:2]
            pakai.append(terbaik[1])
    return pos


def bangun(c):
    """c: lihat KONFIG di gempa-nias-2026-11-19/buat.py."""
    sini, nama = c['sini'], c['nama']
    BL.B.SINI = sini
    os.makedirs(os.path.join(sini, 'bahan', 'ikon'), exist_ok=True)
    g = c['gempa']
    KELAS, MAKS, DEKAT = _hitung(c)
    print('MMI maks:', {kab: round(m, 2) for kab, m in sorted(MAKS.items(), key=lambda t: -t[1])[:10]})
    ada = sorted({band(m) for m in MAKS.values() if band(m) >= 2}, reverse=True)[:4]   # paling banyak 4 kelas diwarnai
    WARNA = {b: TANGGA[i] for i, b in enumerate(sorted(ada))}
    gelap = lambda b: WARNA.get(b) in ('D9600B', 'A84808')

    _pil_asli, _ikon_asli = BL.pil_status, BL.ikon

    def pil_status(k, x, y, w, h, teks, merah, pt=9.19, warna=None):
        b = DARI_ROMAWI.get(teks)
        if b not in WARNA:
            return _pil_asli(k, x, y, w, h, teks, merah, pt, warna)
        k.bulat(x, y, w, h, WARNA[b])
        k.teks(x, y, w, h, [R(teks, min(pt, 8.5), PUTIH if gelap(b) else TEKS, True)], rata='c', bungkus=False)

    BL.pil_status = pil_status
    # pil peta dan kartu legenda: ikon menurut arti status laporan (dokumen = ada laporan, data = model)
    BL.ikon = lambda konsep, token='kertas': _ikon_asli({'peringatan': 'ringkasan', 'rumah': 'data'}.get(konsep, konsep), token)

    lon0, lon1, la1 = c['ext']
    EXT = (lon0, lon1, la1, la1 - (lon1 - lon0) * 338 / 418)
    KM_PX = PX[0] / ((lon1 - lon0) * 111.32 * math.cos(math.radians(g['lat'])))
    proyeksi = lambda f: (lambda lon, lat: (PETA[0] + f(lon, lat)[0] / PX[0] * PETA[2], PETA[1] + f(lon, lat)[1] / PX[1] * PETA[3]))

    Dk = BL.Deck()
    j1, j2 = c['judul']   # baris baru sesudah titik koma (pemilik 20 Nov 2026)
    # varian satu halaman (riset gaya alternatif 23 Nov 2026): isi halaman 2 dipadatkan ke kolom kanan halaman 1
    satu = c.get('satu_halaman', False)
    # bawaan sejak pemilik 23 Nov 2026 ("jadikan alternatif ini sebagai default", Talaud 221126 Alternatif 1): satu halaman, peluang
    # susulan mengisi ruang di bawah tabel kondisi, halaman 2 tidak dibuat. Dua halaman lama: KONFIG dua_halaman=True, atau otomatis
    # bila tabel kondisi terlalu panjang sehingga blok susulan tidak muat.
    hal1 = not satu and not c.get('dua_halaman', False)
    if satu:
        PEL = peluang_susulan(c)
        j2 = c.get('judul2_satu') or f"{j2}, peluang susulan 7 hari [{kategori(PEL['p7']).lower()}]"
    s, k = Dk.slide(judul(j1, pt=20) + ['\n'] + judul(j2, pt=20))

    # ================================================================ peta
    warna = {(kp, kab): WARNA[band(m)] for kp in c['prov'] for kab, m in MAKS.items() if band(m) in WARNA}
    png = os.path.join(sini, 'bahan', 'peta-guncangan.png')
    proj = proyeksi(BL.gambar_peta(png, EXT, PX, warna, BL.SEMUA_PROV))
    from PIL import Image, ImageDraw
    peta = Image.open(png).convert('RGBA')
    laut = lambda x, y: peta.getpixel((min(PX[0] - 1, max(0, int((x - PETA[0]) / PETA[2] * PX[0]))),
                                       min(PX[1] - 1, max(0, int((y - PETA[1]) / PETA[3] * PX[1])))))[3] == 0
    # cincin jarak tiap 100 km di lapisan PALING BAWAH: peta (laut transparan) ditumpuk di atasnya (pemilik 20 Nov 2026)
    lap = Image.new('RGBA', peta.size, (0, 0, 0, 0)); dr = ImageDraw.Draw(lap)
    cx = (g['lon'] - EXT[0]) / (EXT[1] - EXT[0]) * PX[0]
    cy = (EXT[2] - g['lat']) / (EXT[2] - EXT[3]) * PX[1]
    for r in c['radius']:
        rp = r * KM_PX
        for a in range(0, 360, 4):
            dr.arc([cx - rp, cy - rp, cx + rp, cy + rp], a, a + 2.2, fill=(122, 134, 153, 95), width=4)
    Image.alpha_composite(lap, peta).save(png)
    k.gambar(png, *PETA)

    ex, ey = proj(g['lon'], g['lat'])
    titik = c.get('titik', {})
    prov_kab = c.get('_prov_kab', {})
    titik_kab = lambda kab: proj(*titik.get(kab, BL.pusat(prov_kab.get(kab, c['prov'][0]), kab)))
    nama_label = lambda kab: c.get('label', {}).get(kab, kab.replace('Kepulauan ', 'Kep. '))
    lebar_label = lambda kab, b: (len(nama_label(kab)) * 9 + len(f'MMI {ROMAWI[b]}') * 7.5) * 0.53 + 26   # rumus label_peta
    pil_pusat = c.get('pil_pusat') or ('kiri' if ey > 330 and ex - 205 >= 48 else 'bawah')
    pusat_kotak = (ex - 72.5, ey + 30, 145, 15) if pil_pusat == 'bawah' else (ex - 205, ey - 7.5, 145, 15)
    LEG_Y, LEG_H = (366, 70) if satu else (379, 58)   # satu halaman: legenda pil peta masuk kotak legenda
    hindari = [(48, 106, 192, 16), (256 - 6, LEG_Y, 205, LEG_H), (48, 395, 160, 45)]   # cap waktu, legenda, panah utara + skala
    hindari += [pusat_kotak, (ex - 12, ey - 12, 24, 24)]
    beririsan = lambda a, b: a[0] < b[0] + b[2] and b[0] < a[0] + a[2] and a[1] < b[1] + b[3] and b[1] < a[1] + a[3]
    pos = c.get('pos')
    if not pos:   # tata otomatis: laporan dilapor dulu lalu MMI tertinggi, paling banyak 8 label
        ambang = min(ada) if ada else 3   # semua kelas yang diwarnai, termasuk yang terendah (pemilik 20 Nov 2026: kab MMI II ikut dilabeli)
        calon = [kab for kab in MAKS if (kab in c['dilapor'] or band(MAKS[kab]) >= ambang)]
        calon = [kab for kab in calon if 48 <= titik_kab(kab)[0] <= 461 and 104 <= titik_kab(kab)[1] <= 438]
        calon.sort(key=lambda kab: (kab not in c['dilapor'], -MAKS[kab]))
        calon = calon[:8]
        pos = tata_label(calon, {kab: titik_kab(kab) for kab in calon}, {kab: lebar_label(kab, band(MAKS[kab])) for kab in calon},
                         hindari + [(x - 3, y - 3, 6, 6) for x, y in (titik_kab(kb) for kb in calon)], laut, beririsan)
        print('label otomatis:', {kab: (round(x), round(y)) for kab, (x, y) in pos.items()})
    hindari += [(min(x, 461 - lebar_label(kab, band(MAKS[kab]))), y, lebar_label(kab, band(MAKS[kab])), 15.8) for kab, (x, y) in pos.items()]
    km_pt = PETA[2] / PX[0] * KM_PX
    for r in c['radius']:   # label cincin: pil kecil abu di laut, ditaruh sebelum label kab/kota supaya di bawahnya
        rp = r * km_pt
        for sudut in (135, 120, 150, 105, 165, 225, 45, 315, 180, 90, 270, 0, 210, 240, 30, 60, 300, 330):
            lx_, ly_ = ex + rp * math.cos(math.radians(sudut)), ey + rp * math.sin(math.radians(sudut))
            kotak = (lx_ - 17, ly_ - 6, 34, 12)
            if not (50 <= kotak[0] and kotak[0] + 34 <= 455 and 108 <= kotak[1] and kotak[1] + 12 <= 436):
                continue
            if any(beririsan(kotak, h) for h in hindari) or not all(laut(px, py) for px, py in
                                                                       ((lx_ - 17, ly_), (lx_ + 17, ly_), (lx_, ly_ - 6), (lx_, ly_ + 6))):
                continue
            k.bulat(*kotak, PUTIH, 'C9D1DC', radius=6)
            k.teks(*kotak, [R(f'{r} km', 7, TEKS3, True)], rata='c', bungkus=False)
            hindari.append(kotak)
            break
    # cap waktu pembuatan laporan (WIB = UTC+7), dihitung saat dibangun
    kini = datetime.now(timezone.utc) + timedelta(hours=7)
    cap = f'Laporan dibuat {kini.day} {BULAN[kini.month - 1]} {kini.year}, pukul {kini:%H.%M} WIB'
    print(cap)
    k.bulat(48, 106, 192, 16, PUTIH, GARIS, radius=8)
    k.gambar(_ikon_asli('kalender', 'navy'), 54, 109, 10, 10)
    k.teks(68, 106, 170, 16, [R(cap, 7.5, TEKS, True)], bungkus=False)
    for kab, (lx, ly) in pos.items():
        b = band(MAKS[kab])
        label_peta(k, lx, ly, nama_label(kab), f'MMI {ROMAWI[b]}', kab in c['dilapor'], titik_kab(kab))
    # pusat gempa: ikon + pil koordinat (di bawah ikon, atau di kiri dengan garis penunjuk)
    teks_pusat = f"Pusat gempa, {koordinat(g['lat'], g['lon'])}"
    if pil_pusat == 'bawah':
        k.garis(ex, ey + 11, ex, ey + 30, MERAH, 0.75)
    else:
        k.garis(ex - 205 + 150, ey, ex - 11, ey, MERAH, 0.75)
        k.kotak(ex - 205 + 147.5, ey - 2.5, 5, 5, PUTIH, MERAH, bentuk=MSO_SHAPE.OVAL)
    k.kotak(ex - 11, ey - 11, 22, 22, PUTIH, MERAH, 1.0, bentuk=MSO_SHAPE.OVAL)
    k.ikon_bulat('gempa', ex - 9, ey - 9, 18, MERAH)
    k.bulat(*pusat_kotak, PUTIH, MERAH, radius=7)
    k.teks(*pusat_kotak, [R(teks_pusat, 8, MERAH, True)], rata='c', bungkus=False)
    BL.unsur_peta(k, 100 / 111 * PETA[2] / (EXT[1] - EXT[0]))
    lx, ly = 256, LEG_Y
    k.bulat(lx - 6, ly, 205, LEG_H, PUTIH, GARIS, radius=4)
    dy_sw, dy_gr = (17, 33) if satu else (21, 45)
    for j in range(4):   # contoh garis putus cincin jarak
        k.garis(lx + j * 5, ly + dy_gr, lx + j * 5 + 3, ly + dy_gr, '9AA5B4', 1.25)
    k.teks(lx + 24, ly + dy_gr - 5, 175, 10, [R('Jarak dari pusat gempa, tiap 100 km', 7.5, TEKS)], bungkus=False)
    k.teks(lx, ly + 3, 195, 12, [R('Guncangan terkuat per kab/kota (MMI, model)', 7.5, TEKS, True)], bungkus=False)
    for i, b in enumerate(ada):
        k.kotak(lx + i * 48, ly + dy_sw, 16, 11, WARNA[b], GARIS, 0.5)
        k.teks(lx + i * 48 + 19, ly + dy_sw - 2, 28, 15, [R(ROMAWI[b], 9, TEKS, True)], bungkus=False)
    if satu:   # legenda pil peta sebaris di kotak legenda (kartu di bawah peta diganti kotak arti MMI)
        for i, (merah, teks) in enumerate(((True, 'Ada laporan'), (False, 'Belum ada laporan (model)'))):
            x_ = lx + i * 78
            k.kotak(x_, ly + 50, 10, 10, MERAH if merah else BL.BIRU, bentuk=MSO_SHAPE.OVAL)
            k.teks(x_ + 13, ly + 47, 110, 15, [R(teks, 7.5, TEKS)], bungkus=False)
    else:
        # kartu = legenda pil di peta: merah = ada laporan, biru = belum ada laporan (guncangan hanya perkiraan model)
        kartu(k, 43.2, 446.4, 206.1, 'Ada laporan', 'Tercatat di laporan BPBD atau dirasakan BMKG', True)
        kartu(k, 254.3, 446.4, 206.1, 'Belum ada laporan', 'Guncangan berdasarkan perhitungan model', False)

    # ================================================================ blok magnitudo + panel parameter berikon
    m_teks = f"M{angka(g['m'], 1)}"
    k.bulat(471.3, 101, 66, 38, NAVY, radius=4)
    k.teks(471.3, 102, 66, 22, [R(m_teks, 17, PUTIH, True)], rata='c', bungkus=False)
    k.teks(471.3, 124, 66, 11, [R('Magnitudo', 7, PUTIH)], rata='c', bungkus=False)
    p = c['par']
    PAR = [('Waktu (WIB)', p['waktu'], NAVY, 'kalender', 'navy'),
           ('Kedalaman', f"{g['dalam']:g} km", NAVY, 'turun', 'navy'),
           (p.get('pusat_label', 'Pusat gempa di laut'), p['pusat'], NAVY, 'wilayah', 'navy'),
           ('Potensi tsunami', p.get('tsunami', 'Tidak ada'), '1F6FB2' if p.get('tsunami', 'Tidak ada') == 'Tidak ada' else MERAH,
            'tsunami', 'biru')]
    x0, x1 = 541.3, 916.8
    k.bulat(x0, 101, x1 - x0, 38, PUTIH, GARIS, radius=4)
    IK = 13
    for PV in (8, 7.5, 7):   # ukuran nilai diturunkan bila empat butir belum muat
        isi = [max(lebar(a, 7), lebar(b, PV)) + 2 + IK + 4 for a, b, *_ in PAR]
        jeda = (x1 - x0 - sum(isi)) / len(PAR)
        if jeda >= 8:
            break
    print('strip: nilai', PV, 'pt, jeda', round(jeda, 1)); assert jeda >= 6, 'strip parameter terlalu sempit'
    x = x0
    for n, ((a, b, w, ik, tk), wt) in enumerate(zip(PAR, isi)):
        if n:
            k.garis(x, 110, x, 130, GARIS, 0.75)
        tx = x + jeda / 2
        k.gambar(_ikon_asli(ik, tk), tx, 120 - IK / 2, IK, IK)
        k.teks(tx + IK + 4, 106, wt - IK - 4, 11, [R(a, 7, TEKS3)], bungkus=False, jangkar='b')
        k.teks(tx + IK + 4, 119, wt - IK - 4, 13, [R(b, PV, w, True)], bungkus=False, jangkar='t')
        x += wt + jeda

    # ================================================================ kotak arti MMI (dihitung dulu: tingginya menentukan ruang tabel)
    # semua kelas yang tampil di peta (dan kelas BMKG di tabel kondisi), satu deret dari lemah ke kuat (pemilik 20 Nov 2026)
    kelas_box = sorted(set(ada) | {DARI_ROMAWI[l[2]] for l in c['lapor'] if l[2] != '-'})
    h_box = 56   # judul, batang skala bersambung, keterangan dua baris rata tengah di bawah tiap kelas
    yk = 496 - 6.5 - h_box   # teks terbawah >= 7 pt dari tepi bawah panel (gerbang T-7)
    MX, MW = 471.3, 445.5    # kotak MMI di kolom kanan; satu halaman: di bawah peta menggantikan kartu legenda
    if satu:
        h_box, yk, MX, MW = 50, 440.5, 43.2, 418

    if c.get('tabel_penduduk', False):
        # ================================================================ kondisi per kab/kota
        kepala_panel(k, 471.3, 147, 445.5, 'Kondisi pascagempa menurut BPBD dan BMKG', 'gempa')
        kol = [('', 98, 'l'), ('', 56, 'c'), ('', 40, 'c'), ('', 48, 'c'), ('', 203.5, 'l')]
        baris = []
        for l in c['lapor']:
            kab, nm, bm, kon = l[:4]
            jarak = l[4] if len(l) > 4 else f'{DEKAT[kab]:.0f} km'
            n = max(1, math.ceil(len(kon) * 4.05 / 200))   # taksiran baris Roboto 7,8 pt di kolom 203,5 pt (Nias: 103 huruf = 3 baris)
            baris.append(('data', [('runs', [R(nm, 8.6, TEKS, True)]), jarak, ('pil', ROMAWI[band(MAKS[kab])], False, 8.5),
                                   ('pil', bm, False, 8.5) if bm != '-' else '-', rt(kon, 7.8)], max(26, 10 * n + 6)))
        yb = tabel(k, 471.3, 184, kol, baris, kepala=24, pt=8.6)
        _kepala2(k, 471.3, 184, kol, ['KAB/KOTA', 'JARAK KE|PUSAT', 'MMI|MODEL', 'MMI|BMKG', 'KONDISI DAN TINDAKAN'], 24)

        # ================================================================ penduduk dalam jangkauan guncangan (model)
        y = yb + 10
        kepala_panel(k, 471.3, y, 445.5, 'Penduduk dalam jangkauan guncangan (model)', 'pengungsi')
        kolom = ada[:3]   # kelas tertinggi yang diwarnai, paling banyak tiga kolom
        ambang = min(ada) + 1 if len(ada) > 1 else min(ada)
        urut = sorted(((kab, m) for kab, m in MAKS.items() if band(m) >= ambang), key=lambda t: -t[1])
        ruang = yk - 8 - (y + 36) - 20 - 17   # tinggi untuk baris data di atas kotak MMI (baris total sekitar 17 pt)
        hb = 14 if ruang >= 14 * len(urut) else 12.5   # baris dirapatkan dulu sebelum digabung
        muat = int(ruang // hb)
        tampil, lain = (urut, []) if len(urut) <= muat else (urut[:muat - 1], urut[muat - 1:])
        assert len(tampil) >= 2, f'tabel penduduk hanya muat {muat} baris: pendekkan teks kondisi'
        lebar_kol = [170, 75] + [200.5 / len(kolom)] * len(kolom)
        kol = [('', lebar_kol[0], 'l'), ('', lebar_kol[1], 'c')] + [('', w, 'c') for w in lebar_kol[2:]]
        baris = [('data', [nama_kab(kab), ('pil', ROMAWI[band(m)], False, 8.5)] + [f0(KELAS[kab][b] or None) for b in kolom], hb)
                 for kab, m in tampil]
        if lain:
            cl = Counter()
            for kab, _ in lain:
                cl.update(KELAS[kab])
            baris.append(('data', [f'{len(lain)} kab/kota lainnya', '-'] + [f0(cl[b] or None) for b in kolom], hb))
        ct = Counter()
        for kab, _ in urut:
            ct.update(KELAS[kab])
        baris.append(('total', [f'Total {len(urut)} kab/kota', ''] + [f0(ct[b]) for b in kolom]))
        yt = tabel(k, 471.3, y + 36, kol, baris, kepala=20, pt=8.6, minh=12)
        _kepala2(k, 471.3, y + 36, kol, ['KAB/KOTA', 'MMI MAKS'] + [f'JIWA MMI {ROMAWI[b]}' for b in kolom], 20)
        print('jiwa per kelas:', {ROMAWI[b]: ct[b] for b in kolom}, 'tabel kondisi berakhir', round(yb), 'tabel penduduk', round(yt), 'kotak MMI', round(yk))
        assert yt <= yk - 4, 'tabel penduduk menabrak kotak MMI'
    else:
        # bawaan sejak pemilik 20 Nov 2026 ("tabel kondisi BPBD yang lebih lega", draf disetujui): tabel penduduk per kelas MMI dihapus; tabel kondisi
        # memuat semua kab/kota tercatat (BPBD dan dirasakan BMKG) dengan kolom korban dan kerusakan, sampai ke kotak MMI.
        kepala_panel(k, 471.3, 147, 445.5, 'Kondisi pascagempa menurut BPBD dan BMKG', 'gempa')
        kol = [('', 96, 'l'), ('', 44, 'c'), ('', 38, 'c'), ('', 38, 'c'), ('', 78, 'c'), ('', 151.5, 'l')]
        dampak = c.get('dampak', {})
        rasa = c.get('rasa_bmkg', {})   # {kab: (kelas BMKG, nama tempat di daftar BMKG)} untuk kab yang hanya dirasakan BMKG
        isi_baris = [(l[0], l[1], l[2], l[3], l[4] if len(l) > 4 else f'{DEKAT[l[0]]:.0f} km') for l in c['lapor']]
        sudah = {l[0] for l in c['lapor']}
        for kab in sorted(c['dilapor'] - sudah, key=lambda kb: -MAKS[kb]):
            kb_bmkg, tempat = rasa.get(kab, ('-', None))
            isi_baris.append((kab, nama_kab(kab), kb_bmkg,
                              f'Dirasakan di {tempat} menurut BMKG (skala {kb_bmkg}). Belum ada laporan BPBD.' if tempat else
                              'Dirasakan menurut BMKG. Belum ada laporan BPBD.', f'{DEKAT[kab]:.0f} km'))
        enam = sum(n for kab in MAKS for b, n in KELAS[kab].items() if b >= 6)
        y_bawah = yk - 8 - (24 if enam else 0)
        if satu:   # tabel setinggi isinya; sisa kolom kanan untuk susulan dan langkah
            y_bawah = 184 + 24 + 33 * len(isi_baris)
        if hal1:   # baris setinggi isi (sekitar 32 pt); sisa sampai kotak MMI untuk blok susulan
            y_rapat = 184 + 24 + 32 * len(isi_baris)
            if (yk - 8) - (y_rapat + (24 if enam else 0) + 10) >= BLOK_SUSULAN_MIN:
                y_bawah = y_rapat
            else:
                hal1 = False
                print('tabel kondisi terlalu panjang untuk blok susulan di halaman 1: kembali ke dua halaman')
        baris = [('data', [('runs', [R(nm, 8.4, TEKS, True)]), jr, ('pil', ROMAWI[band(MAKS[kab])], False, 8.5),
                           ('pil', bm, False, 8.5) if bm != '-' else '-', rt(dampak.get(kab, 'Belum ada laporan'), 7.6),
                           rt(kon, 7.6)]) for kab, nm, bm, kon, jr in isi_baris]
        yb = tabel(k, 471.3, 184, kol, baris, bawah=y_bawah, kepala=24, pt=8.4, maks=44)
        _kepala2(k, 471.3, 184, kol, ['KAB/KOTA', 'JARAK KE|PUSAT', 'MMI|MODEL', 'MMI|BMKG', 'KORBAN DAN|KERUSAKAN',
                                      'KONDISI DAN TINDAKAN'], 24)
        if enam:   # satu baris paparan, dibulatkan, hanya bila ada wilayah MMI VI ke atas menurut model
            bulat = f'{enam / 1000:.0f} ribu' if enam < 1e6 else f'{enam / 1e6:.1f} juta'.replace('.', ',')
            k.bulat(471.3, yb + 6, 445.5, 18, 'FBE7D6', radius=4)
            k.teks(479.3, yb + 6, 430, 18, [R(f'Sekitar {bulat} jiwa', 8, TEKS, True),
                                            R(' tinggal di wilayah dengan guncangan yang berpotensi merusak (MMI VI ke atas, perkiraan model).',
                                              8, TEKS)], bungkus=False)
        print('tabel kondisi:', len(baris), 'baris, berakhir', round(yb), '; jiwa MMI VI+', enam, '; kotak MMI', round(yk))
        # halaman 1 bawaan: baris boleh lebih tinggi dari perkiraan 32 pt selama blok susulan masih muat
        assert yb <= (yk - 18 - BLOK_SUSULAN_MIN - (24 if enam else 0) if hal1 else y_bawah) + 1, 'tabel kondisi menabrak kotak MMI'
        if satu:
            blok_susulan_langkah(k, c, MAKS, PEL, yb + 6)
        if hal1:
            y0 = yb + 10 + (24 if enam else 0)
            blok_susulan_hal1(k, c, y0, yk - 8)
            print('blok susulan halaman 1:', round(y0), 'sampai', round(yk - 8))

    # ================================================================ kotak arti MMI + kotak tautan BMKG
    k.bulat(MX, yk, MW, h_box, KAB_TINT, radius=4)
    k.teks(MX + 8, yk + 3, 325, 11, [R('MMI (Modified Mercalli Intensity)', 7.5, NAVY, True),
                                     R(': skala I sampai XII kuat guncangan di suatu tempat', 7.5, TEKS)], bungkus=False)
    x0k, x1k = MX + 8, MX + MW - 100 - 8   # deret kelas di kiri kotak tautan
    wk = (x1k - x0k) / len(kelas_box)
    dk = 13 if satu else 18
    for n, b in enumerate(kelas_box):   # batang skala: kotak warna bersambung dari lemah (kiri) ke kuat (kanan)
        cx = x0k + n * wk
        k.kotak(cx, yk + dk, wk, 12, WARNA.get(b, 'FFFFFF'), 'FFFFFF', 0.75)
        k.teks(cx, yk + dk, wk, 12, [R(f'MMI {ROMAWI[b]}', 7.5, PUTIH if gelap(b) else TEKS, True)], rata='c', bungkus=False)
        k.teks(cx + 3, yk + dk + (12 if satu else 14), wk - 6, 18, [R(MMI_RINGKAS[b], 7, TEKS)], rata='c', jangkar='t', spasi=0.95)
    bw = 100; bx = MX + MW - bw
    for sh in (k.bulat(bx, yk, bw, h_box, NAVY, radius=4),
               k.teks(bx + 12, yk + h_box / 2 - 12.5, bw - 40, 13, [R('Skala lengkap', 8.5, PUTIH, True)], bungkus=False, jangkar='b'),
               k.teks(bx + 12, yk + h_box / 2 + 0.5, bw - 40, 11, [R('di situs BMKG', 7, 'C9D1DC')], bungkus=False, jangkar='t')):
        sh.click_action.hyperlink.address = URL_MMI
    ax, ay = bx + bw - 14, yk + h_box / 2   # panah garis putih
    k.garis(ax - 12, ay, ax, ay, PUTIH, 1.5)
    k.garis(ax - 4.5, ay - 4.5, ax, ay, PUTIH, 1.5)
    k.garis(ax - 4.5, ay + 4.5, ax, ay, PUTIH, 1.5)

    if satu or hal1:
        sumber2 = None
    else:
        sumber2 = halaman_susulan(Dk, c, MAKS, datetime.now(WIB))   # 'kini' di atas UTC+7 tanpa zona WIB; jangan dikurangi dengan t0

    os.makedirs(c.get('keluar', sini), exist_ok=True)
    isi = os.path.join(c.get('keluar', sini), f'{nama}.pptx')
    Dk.I.simpan(isi)
    if '--isi' in sys.argv:
        print('isi saja:', isi); return isi
    sys.path.insert(0, os.path.join(LB, 'generator'))
    import lewat_deck
    keluar = lewat_deck.bingkai(
        isi, 'kajian', c['judul_dokumen'], c['subjudul'], c['tanggal'], sampul=False,
        susun=[{'halaman': 1, 'sumber': c['sumber']}] + ([{'halaman': 2, 'sumber': sumber2}] if sumber2 else []),
        spek_tambah={'subjek_dokumen': c['judul_dokumen'],
                     'tanpa_alur': 'laporan khusus satu halaman' if satu or hal1 else 'laporan khusus dua halaman'})
    print(keluar)
    return keluar


def _kepala2(k, x, y, kol, judul2, h):
    cx = x
    for (j, w, rata), t in zip(kol, judul2):
        runs = []
        for i, bag in enumerate(t.split('|')):
            runs += (['\n'] if i else []) + [R(bag, 7, PUTIH, True, 0.5)]
        # semua kepala tabel rata tengah (pemilik 20 Nov 2026: "header tabel tuh center"); isi sel tetap mengikuti kolomnya
        k.teks(cx, y, w, h, runs, rata='c', kiri=1, kanan=1, spasi=0.9)
        cx += w


# ======================================================================== halaman 2: gempa susulan, penanganan, langkah
WIB = timezone(timedelta(hours=7))


def persen(p):
    v = p * 100
    return '<1%' if v < 1 else f'{v:.1f}%'.replace('.', ',') if v < 10 else f'{v:.0f}%'


# kategori peluang untuk pimpinan (pemilik 20 Nov 2026): label kata besar, persen kecil. Ambang diadaptasi dari skala peluang
# IPCC (Mastrandrea dkk. 2010: very unlikely 0-10%, unlikely 0-33%, about as likely as not 33-66%, likely 66-100%), dipotong
# supaya tidak tumpang tindih. Bukan standar BMKG atau BNPB; selalu ditulis "diadaptasi dari skala peluang IPCC".
KATEGORI = ((0.10, 'Sangat kecil'), (0.33, 'Kecil'), (0.66, 'Sedang'), (1.01, 'Besar'))
WARNA_KAT = {'Sangat kecil': 'A9BCD6', 'Kecil': '5E7FA8', 'Sedang': 'E8894A', 'Besar': 'C8102E'}   # aksen kartu dan batang grafik
TEKS_KAT = {'Sangat kecil': '5E7FA8', 'Kecil': '3E5F8A', 'Sedang': 'C2621F', 'Besar': 'C8102E'}    # warna teks kategori (lebih gelap)


def kategori(p):
    return next(nama for batas, nama in KATEGORI if p < batas)


def susulan_teramati(g, t0):
    """Cacah gempa M >= 4 sesudah gempa utama dalam jarak Gardner-Knopoff (sama dengan susulan.jarak_gk), dari USGS FDSN.
    -> (cacah, radius_km), cacah None bila USGS tidak terjangkau."""
    import urllib.request
    r = 10 ** (0.1238 * g['m'] + 0.983)
    u = ('https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&minmagnitude=4'
         f"&starttime={(t0 + timedelta(minutes=1)).astimezone(timezone.utc):%Y-%m-%dT%H:%M:%S}"
         f"&latitude={g['lat']}&longitude={g['lon']}&maxradiuskm={r:.0f}")
    try:
        return len(json.load(urllib.request.urlopen(u, timeout=30))['features']), r
    except Exception as e:   # laporan tetap jadi; kalimatnya menyebut data belum tersedia
        print('USGS gagal:', e)
        return None, r


def riwayat_sekitar(g, n=3):
    """(cacah gempa M >= 5 dalam 100 km sejak 2000 dari riwayat USGS, <= n gempa merusak terkuat dalam 200 km dari katalog BMKG)."""
    d = os.path.join(REPO, 'public', 'gempa', 'data')
    m5 = json.load(open(os.path.join(d, 'riwayat_m5.json'), encoding='utf-8'))['baris']
    n_m5 = sum(1 for x in m5 if x[0] >= '2000' and G.jarak_km(g['lat'], g['lon'], x[1], x[2]) <= 100)
    kat = json.load(open(os.path.join(d, 'katalog_merusak.json'), encoding='utf-8'))['baris']
    dekat = [r for r in kat if r.get('lintang') is not None and r.get('magnitudo') is not None
             and G.jarak_km(g['lat'], g['lon'], r['lintang'], r['bujur']) <= 200]
    pilih = sorted(sorted(dekat, key=lambda r: -r['magnitudo'])[:n], key=lambda r: r['tanggal'], reverse=True)
    for r in pilih:
        th, bl, hr = r['tanggal'].split('-')
        r['tanggal_id'] = f"{int(hr)} {BULAN[int(bl) - 1]} {th}"
        r['jarak_km'] = G.jarak_km(g['lat'], g['lon'], r['lintang'], r['bujur'])   # dari pusat gempa laporan ini
    return (n_m5, pilih) if pilih else None


def langkah(c, MAKS, p7):
    """Langkah yang disarankan: aturan tetap atas katalog tindakan gempa public/bencana.json (logbook Pusdalops)."""
    reg = json.load(open(os.path.join(REPO, 'public', 'bencana.json'), encoding='utf-8'))
    label = reg['tindakan']
    boleh = next(b for b in reg['bencana'] if b['id'] == 'gempa')['kemampuan']['tindakan']
    daftar = [('pantau', 'Pantau gempa susulan bersama BMKG dan BPBD. Peluang susulan M5 ke atas dalam 7 hari sejak gempa utama '
                         f'tergolong {kategori(p7).lower()} ({persen(p7)}).'),
              ('imbauan', 'Sampaikan imbauan agar warga mengikuti informasi resmi BMKG dan menjauhi bangunan yang retak.')]
    kuat = [kab for kab, m in MAKS.items() if band(m) >= 5]
    if kuat:
        daftar.append(('kaji_cepat', f'Lakukan kaji cepat kerusakan di {len(kuat)} kab/kota dengan guncangan MMI V ke atas menurut model.'))
    rasa = sorted(c['dilapor'] - c['bpbd'])   # dirasakan menurut BMKG tetapi belum ada laporan BPBD
    if rasa:
        siapa = ' dan '.join(nama_kab(x) for x in rasa) if len(rasa) <= 2 else f'{len(rasa)} kab/kota'
        daftar.append(('kaji_cepat', f'Minta BPBD {siapa} mendata kondisi karena getaran dirasakan menurut BMKG.'))
    if c.get('kerusakan'):
        daftar += [('posko', 'Aktifkan posko dan rapat koordinasi penanganan di kab/kota terdampak.'),
                   ('logistik', 'Siapkan distribusi logistik bagi warga terdampak.'),
                   ('pengungsian', 'Siapkan tempat pengungsian dan tenda bagi warga yang rumahnya rusak.'),
                   ('kesehatan', 'Siagakan layanan kesehatan bagi korban luka.')]
    assert all(t in boleh for t, _ in daftar), 'tindakan di luar katalog gempa'
    gabung = {}   # satu butir per tindakan; kalimat tindakan yang sama digabung berurutan
    for t, teks in daftar:
        gabung[t] = f'{gabung[t]} {teks}' if t in gabung else teks
    return [(label[t], teks) for t, teks in gabung.items()]


def halaman_susulan(Dk, c, MAKS, kini):
    import susulan as SU
    g = c['gempa']
    M = SU.muat_model()
    assert M['terbit'] and M['terbit_target']['m5'], 'model susulan M5 tidak terbit: halaman susulan tidak boleh tampil'
    P = M['param']
    t0 = datetime(*c['waktu_utama'], tzinfo=WIB)
    t = (kini - t0).total_seconds() / 86400   # umur gempa saat laporan dibuat (hari), hanya dicetak ke log
    # peluang kumulatif sejak gempa utama (pemilik 20 Nov 2026: "diprediksi dari waktu saat terjadinya gempa utama"),
    # jendela mulai SU.T0 (1 jam sesudah gempa utama) seperti saat model diuji
    kum = lambda d: SU.peluang(g['m'], SU.T0, d - SU.T0, 5.0, P)['p']
    p24, p3, p7 = kum(1), kum(3), kum(7)
    print('susulan sejak gempa utama: 24 jam', round(p24, 4), '3 hari', round(p3, 4), '7 hari', round(p7, 4), '; umur laporan', round(t, 2), 'hari')

    s, k = Dk.slide(judul(f'Peluang gempa susulan M5 ke atas dalam 7 hari sejak gempa utama [{kategori(p7).lower()}];', pt=20) + ['\n']
                    + judul(c['judul2'], pt=20))
    # ================================================================ kiri: prediksi gempa susulan
    kepala_panel(k, 43.2, 101, 418, 'Prediksi gempa susulan (model)', 'gempa')
    k.teks(43.2, 137, 418, 12, [R('Peluang terjadi paling sedikit satu gempa susulan M5 ke atas, dihitung sejak gempa utama',
                                  7.5, TEKS3)], bungkus=False)
    w3 = (418 - 2 * 6) / 3
    for i, (lab, p) in enumerate((('24 jam pertama', p24), ('3 hari pertama', p3), ('7 hari pertama', p7))):
        # kartu: aksen kiri warna kategori, judul waktu, kategori besar + persen kecil sebaris, batang tipis 0-100%
        x = 43.2 + i * (w3 + 6)
        nm = kategori(p)
        k.bulat(x, 152, w3, 51, PUTIH, GARIS, radius=4)
        k.kotak(x, 152.4, 4, 50.2, WARNA_KAT[nm])
        k.teks(x + 12, 155, w3 - 20, 12, [R(lab, 8.5, TEKS3, True)], bungkus=False)
        k.teks(x + 12, 166, w3 - 20, 18, [R(nm, 13, TEKS_KAT[nm], True)], bungkus=False)
        lb = w3 - 20 - 62   # batang tipis 0-100% dan persen sebaris di bawah kategori (kategori dapat ruang penuh)
        k.bulat(x + 12, 189, lb, 4, 'E3E8EF', radius=2)
        k.bulat(x + 12, 189, max(4, lb * p), 4, WARNA_KAT[nm], radius=2)
        k.teks(x + w3 - 66, 184, 58, 12, [R(f'Peluang {persen(p)}', 7.5, TEKS3)], rata='r', bungkus=False)
    # catatan dihitung dulu: tingginya menentukan ruang grafik di atasnya
    n_amat, rgk = susulan_teramati(g, t0)
    ku = M['kinerja_uji']['m5']
    th = int(M['kinerja_uji']['rentang'][1][:4])
    baris = [('Susulan tercatat', 'Data susulan dari USGS belum tersedia.' if n_amat is None else
              f'{n_amat} gempa M4 ke atas dalam radius {rgk:.0f} km sejak gempa utama (USGS).' if n_amat else
              f'Belum ada gempa M4 ke atas dalam radius {rgk:.0f} km sejak gempa utama (USGS).'),
             ('Kategori', 'Sangat kecil di bawah 10%; kecil 10 sampai 33%; sedang 33 sampai 66%; besar di atas 66%. '
                          'Diadaptasi dari skala peluang IPCC.')]
    if g['dalam'] >= 70:
        baris.append(('Gempa dalam', f"Kedalaman {g['dalam']:g} km. Gempa dalam umumnya memicu lebih sedikit susulan; "
                                     'model ini belum membedakan kedalaman.'))
    nb = [max(1, math.ceil(len(b) * 3.5 / 318)) for _, b in baris]   # taksiran baris Roboto 7,5 pt di kolom 318 pt
    hb = 8 + sum(10 * n + 4 for n in nb) + 4
    y_cat = 496 - 7 - hb

    # ================================================================ grafik peluang kumulatif sejak gempa utama, hari ke-1 sampai ke-7
    hari = []
    for d in range(1, 8):
        akhir = t0 + timedelta(days=d)
        hari.append((f'Hari ke-{d}', f's.d. {akhir.day} {BULAN[akhir.month - 1]}', kum(d)))
    # warna batang = kategori peluangnya (terang ke gelap seiring naiknya kategori)
    k.teks(43.2, 207, 260, 13, [R('Peluang kumulatif sejak gempa utama', 8.5, TEKS, True)], bungkus=False)
    ada_kat = [nm for _, nm in KATEGORI if any(kategori(p) == nm for *_, p in hari)]
    lx = 461.2
    for nm in reversed(ada_kat):   # legenda kategori yang muncul, rata kanan sejajar judul grafik
        w = lebar(nm, 7) + 4
        lx -= w
        k.teks(lx, 207, w, 13, [R(nm, 7, TEKS3)], bungkus=False)
        lx -= 13
        k.kotak(lx, 210.5, 9, 7, WARNA_KAT[nm])
        lx -= 10
    dasar = y_cat - 30                     # label hari dan tanggal di bawah garis dasar
    puncak = 236                           # ruang label persen di atas batang tertinggi
    skala = max(p for *_, p in hari) * 1.12
    py = lambda p: dasar - p / skala * (dasar - puncak)
    for batas, _ in KATEGORI[:-1]:         # garis ambang kategori yang masuk rentang grafik
        if batas < skala:
            yg = py(batas)
            for x in range(int(43.2), int(445), 6):
                k.garis(x, yg, x + 3, yg, 'B8C2D0', 0.75)
            k.teks(445, yg - 6, 16.2, 12, [R(f'{batas * 100:.0f}%', 6.5, TEKS3)], rata='r', bungkus=False)
    slot = 418 / 7
    for n, (lab, tgl, p) in enumerate(hari):
        cx = 43.2 + n * slot + slot / 2
        top = min(py(p), dasar - 1.5)
        utama = n + 1 in (1, 3, 7)   # batang yang sama dengan angka di kotak atas
        bt = k.kotak(cx - 17, top, 34, dasar - top, WARNA_KAT[kategori(p)], NAVY if utama else None, 1.25,
                     bentuk=MSO_SHAPE.ROUND_2_SAME_RECTANGLE)   # ujung atas membulat (pemilik 20 Nov 2026)
        bt.adjustments[0] = min(0.5, 6 / min(34, max(dasar - top, 1)))
        bt.adjustments[1] = 0
        teks_p = persen(p)
        wp = lebar(teks_p, 8.5 if utama else 7.5) + 6
        k.bulat(cx - wp / 2, top - 15, wp, 12, PUTIH, radius=3)   # latar putih: garis ambang tidak menimpa angka
        k.teks(cx - 28, top - 15, 56, 12, [R(teks_p, 8.5 if utama else 7.5, TEKS if utama else TEKS3, utama)],
               rata='c', bungkus=False)
        k.teks(cx - 28, dasar + 3, 56, 11, [R(lab, 7.5, TEKS if utama else TEKS3, utama)], rata='c', bungkus=False)
        k.teks(cx - 28, dasar + 13, 56, 10, [R(tgl, 6.5, TEKS3)], rata='c', bungkus=False)
    k.garis_datar(43.2, 461.2, dasar, TEKS3, 0.75)
    assert dasar - puncak >= 60, 'ruang grafik susulan terlalu pendek'

    # ================================================================ kotak catatan
    k.bulat(43.2, y_cat, 418, hb, KAB_TINT, radius=4)
    yy = y_cat + 8
    for (a, b), n in zip(baris, nb):
        k.teks(51.2, yy, 82, 10, [R(a, 7.5, NAVY, True)], bungkus=False, jangkar='t')
        k.teks(135, yy, 318, 10 * n, [R(b, 7.5, TEKS)], jangkar='t', spasi=0.95)
        yy += 10 * n + 4
    # ================================================================ kanan: penanganan dan langkah
    kepala_panel(k, 471.3, 101, 445.5, 'Penanganan yang sudah dilakukan', 'lembaga')
    kol = [('', 150, 'l'), ('', 295.5, 'l')]
    pen = c.get('penanganan') or [('-', 'Belum ada laporan penanganan dari BPBD.')]
    baris = [('data', [('runs', [R(a, 8.6, TEKS, True)]), rt(b, 8)], 22) for a, b in pen]
    yb = tabel(k, 471.3, 140, kol, baris, kepala=20, pt=8.6)
    _kepala2(k, 471.3, 140, kol, ['PELAKU', 'TINDAKAN'], 20)
    y = yb + 12
    kepala_panel(k, 471.3, y, 445.5, 'Langkah yang disarankan', 'ringkasan')
    y += 40
    daftar = langkah(c, MAKS, p7)
    nl = [max(1, math.ceil(len(t) * 4.0 / 424)) for _, t in daftar]   # taksiran baris Roboto 8 pt di kolom 424 pt
    tinggi_isi = sum(14 + 11 * n for n in nl)
    sisa = 489 - y - tinggi_isi - 10 * (len(daftar) - 1)
    riwayat = riwayat_sekitar(g)
    if riwayat:   # selalu tampil (pemilik 20 Nov 2026); baris dikurangi bila ruang sempit: 6 + 36 kepala seksi + 18 kepala tabel
        muat = min(len(riwayat[1]), int((sisa - 60) // 14))
        riwayat = (riwayat[0], riwayat[1][:muat]) if muat >= 1 else None
        print('riwayat: baris tampil', muat, 'dari', len(riwayat[1]) if riwayat else 0)
    jarak = 10 if riwayat else min(18, max(8, (489 - y - tinggi_isi) / max(1, len(daftar) - 1)))
    for (lab, teks), n_ in zip(daftar, nl):
        k.nomor(471.3, y + 1, [d[0] for d in daftar].index(lab) + 1, 14)
        k.teks(492, y, 424.8, 13, [R(lab, 8.6, NAVY, True)], bungkus=False, jangkar='t')
        k.teks(492, y + 14, 424.8, 11 * n_, [R(teks, 8, TEKS)], jangkar='t', spasi=0.95)
        y += 14 + 11 * n_ + jarak
    assert y - jarak <= 489, 'daftar langkah melewati batas halaman'
    if riwayat:
        y = y - jarak + 6
        n_m5, merusak = riwayat
        kepala_panel(k, 471.3, y, 445.5, 'Riwayat gempa di sekitar pusat gempa', 'kalender',
                     kanan=f'{n_m5} gempa M5 ke atas dalam radius 100 km sejak 2000 (USGS)')
        kol = [('', 85, 'c'), ('', 75, 'c'), ('', 125, 'c'), ('', 95.5, 'c'), ('', 65, 'c')]   # semua sel rata tengah (pemilik 20 Nov 2026)
        baris = [('data', [r['tanggal_id'], f"M{angka(r['magnitudo'], 1)}", f"{r['jarak_km']:.0f} km",
                           r['lokasi'].replace('Sumatra', 'Sumatera'),
                           {True: 'Ya', False: 'Tidak'}.get(r['tsunami'], '-')], 14) for r in merusak]
        tabel(k, 471.3, y + 36, kol, baris, kepala=18, pt=8.4, minh=13)
        _kepala2(k, 471.3, y + 36, kol, ['TANGGAL', 'MAGNITUDO', 'JARAK DARI PUSAT GEMPA', 'LOKASI', 'TSUNAMI'], 18)
    return 'Model susulan Reasenberg-Jones (USGS); BPBD lewat Pusdalops BNPB; katalog gempa merusak BMKG; logbook Pusdalops'


# ======================================================================== bawaan 23 Nov 2026: peluang susulan di halaman 1
BLOK_SUSULAN_MIN = 120   # tinggi minimum blok (kepala 38 + skala tiga jendela + kesimpulan); kurang dari ini kembali ke dua halaman
BULAN_PANJANG = ('Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November',
                 'Desember')


def _tint(hexa, f):
    """Campur warna dengan putih; f=0 putih, f=1 warna asli."""
    r, g, b = (int(hexa[i:i + 2], 16) for i in (0, 2, 4))
    return ''.join(f'{round(255 - (255 - v) * f):02X}' for v in (r, g, b))


def blok_susulan_hal1(k, c, y0, y1, X=471.3, W=445.5, H=30):
    """Kolom kanan halaman 1 dari y0 sampai y1 (pemilik 23 Nov 2026, Talaud 221126 Alternatif 1):
    - kiri, skala bertingkat (gaya B pilihan pemilik): tiap jendela 24 jam, 3 hari, 7 hari pertama satu skala 0-100% yang dibagi
      empat kategori selebar ambangnya, penanda navy di posisi peluang, label 10/33/66% di bawah;
    - kanan, grafik peluang kumulatif hari ke-1 sampai ke-7 (batang 1, 3, 7 ditebalkan = angka skala);
    - bawah, satu baris kesimpulan berikon info bergaris abu (bukan bulatan solid): grafik terkumpul terlihat terus naik, pembaca
      perlu tahu sampai kapan kategorinya bertahan (H hari). Kalimat lengkap dan baku, satu baris.
    Peluang dihitung sejak gempa utama dengan model yang sama dengan halaman_susulan."""
    import susulan as SU
    M = SU.muat_model()
    assert M['terbit'] and M['terbit_target']['m5'], 'model susulan M5 tidak terbit: blok susulan tidak boleh tampil'
    g, P = c['gempa'], M['param']
    kum = lambda d: SU.peluang(g['m'], SU.T0, d - SU.T0, 5.0, P)['p']
    t0 = datetime(*c['waktu_utama'], tzinfo=WIB)
    kepala_panel(k, X, y0, W, 'Peluang gempa susulan M5 ke atas (model)', 'gempa',
                 kanan='Kategori diadaptasi dari skala peluang IPCC')
    top, bawah = y0 + 38, y1 - 22
    # ------------------------------------------------ kesimpulan
    pH, akhir = kum(H), t0 + timedelta(days=H)
    tetap = 'tetap ' if kategori(pH) == kategori(kum(7)) else ''
    abu = '8A93A3'
    k.bulat(X, y1 - 18, W, 14, 'EEF2F7', radius=3)
    k.kotak(X + 7, y1 - 14.75, 7.5, 7.5, None, abu, 0.6, bentuk=MSO_SHAPE.OVAL)   # ikon info bergaris, tanpa isi
    cx, cy = X + 10.75, y1 - 11   # huruf i digambar (titik + batang): teks di bawah 6 pt ditolak gerbang deck
    k.kotak(cx - 0.55, cy - 2.45, 1.1, 1.1, abu, bentuk=MSO_SHAPE.OVAL)
    k.kotak(cx - 0.45, cy - 0.75, 0.9, 3.1, abu)
    k.teks(X + 21, y1 - 18, W - 27, 14, [
        R('Peluang terus bertambah, tetapi semakin lambat. ', 7, TEKS3),
        R(f'Hingga {akhir.day} {BULAN_PANJANG[akhir.month - 1]} {akhir.year}, peluangnya {tetap}{kategori(pH).lower()}, '
          f'yaitu sekitar {persen(pH)}.', 7, TEKS, True)], bungkus=False)
    # ------------------------------------------------ kiri: skala bertingkat
    wk = 150
    tepi = [0.0] + [b for b, _ in KATEGORI[:-1]] + [1.0]
    hk = (bawah - top - 9) / 3
    for i, (lab, d) in enumerate((('24 jam pertama', 1), ('3 hari pertama', 3), ('7 hari pertama', 7))):
        p = kum(d); nm = kategori(p); y = top + i * hk
        k.teks(X, y + 1, wk - 70, 10, [R(lab, 7, TEKS3, True)], bungkus=False)
        k.teks(X + wk - 75, y + 1, 75, 10, [R(nm, 7.5, TEKS_KAT[nm], True), R(f'  {persen(p)}', 7, TEKS3)], rata='r',
               bungkus=False)
        yb = y + 15
        for j, (_, nmj) in enumerate(KATEGORI):
            x0, x1 = X + tepi[j] * wk, X + tepi[j + 1] * wk
            k.kotak(x0 + (0 if j == 0 else 0.6), yb, x1 - x0 - (0 if j == 0 else 0.6), 5,
                    WARNA_KAT[nmj] if nmj == nm else _tint(WARNA_KAT[nmj], 0.28))
        k.bulat(X + p * wk - 1.25, yb - 2.5, 2.5, 10, NAVY, radius=1.2)
    for b, _ in KATEGORI[:-1]:
        k.teks(X + b * wk - 12, bawah - 6, 24, 8, [R(f'{b * 100:.0f}%', 6, TEKS3)], rata='c', bungkus=False)
    # ------------------------------------------------ kanan: grafik peluang kumulatif hari ke-1 sampai ke-7
    gx0, gx1 = X + wk + 12, X + W
    hari = []
    for d in range(1, 8):
        akhir_d = t0 + timedelta(days=d)
        hari.append((f'Hari ke-{d}', f'{akhir_d.day} {BULAN[akhir_d.month - 1]}', kum(d)))
    dasar, puncak = bawah - 19, top + 13
    skala = max(p for *_, p in hari) * 1.12
    py = lambda p: dasar - p / skala * (dasar - puncak)
    for batas, _ in KATEGORI[:-1]:
        if batas < skala:
            yg = py(batas)
            for x in range(int(gx0), int(gx1 - 18), 6):
                k.garis(x, yg, x + 3, yg, 'B8C2D0', 0.75)
            k.teks(gx1 - 17, yg - 6, 17, 12, [R(f'{batas * 100:.0f}%', 6.5, TEKS3)], rata='r', bungkus=False)
    slot = (gx1 - 18 - gx0) / 7
    for n, (lab, tgl, p) in enumerate(hari):
        cx = gx0 + n * slot + slot / 2
        tp = min(py(p), dasar - 1.5)
        utama = n + 1 in (1, 3, 7)
        bt = k.kotak(cx - 12, tp, 24, dasar - tp, WARNA_KAT[kategori(p)], NAVY if utama else None, 1.0,
                     bentuk=MSO_SHAPE.ROUND_2_SAME_RECTANGLE)
        bt.adjustments[0] = min(0.5, 5 / min(24, max(dasar - tp, 1)))
        bt.adjustments[1] = 0
        tp_ = persen(p)
        wp = lebar(tp_, 7.5 if utama else 6.8) + 6
        k.bulat(cx - wp / 2, tp - 12, wp, 10, PUTIH, radius=3)
        k.teks(cx - 22, tp - 12, 44, 10, [R(tp_, 7.5 if utama else 6.8, TEKS if utama else TEKS3, utama)], rata='c',
               bungkus=False)
        k.teks(cx - 22, dasar + 2, 44, 9, [R(lab, 6.8, TEKS if utama else TEKS3, utama)], rata='c', bungkus=False)
        k.teks(cx - 22, dasar + 10, 44, 8, [R(tgl, 6, TEKS3)], rata='c', bungkus=False)
    k.garis_datar(gx0, gx1 - 18, dasar, TEKS3, 0.75)
    assert dasar - puncak >= 40, f'ruang grafik susulan terlalu pendek ({dasar - puncak:.0f} pt)'


# ======================================================================== varian satu halaman (riset gaya alternatif 23 Nov 2026)
def peluang_susulan(c):
    """Peluang kumulatif susulan M5 sejak gempa utama (sama dengan halaman_susulan) + susulan tercatat USGS."""
    import susulan as SU
    g = c['gempa']
    M = SU.muat_model()
    assert M['terbit'] and M['terbit_target']['m5'], 'model susulan M5 tidak terbit: blok susulan tidak boleh tampil'
    P = M['param']
    kum = lambda d: SU.peluang(g['m'], SU.T0, d - SU.T0, 5.0, P)['p']
    t0 = datetime(*c['waktu_utama'], tzinfo=WIB)
    n_amat, rgk = susulan_teramati(g, t0)
    return {'p24': kum(1), 'p3': kum(3), 'p7': kum(7), 'n_amat': n_amat, 'rgk': rgk}


def blok_susulan_langkah(k, c, MAKS, PEL, y):
    """Kolom kanan halaman 1 di bawah tabel kondisi: tiga kartu peluang susulan (tanpa grafik) lalu langkah yang disarankan.
    Penanganan BPBD sudah di kolom 'Kondisi dan tindakan', jadi tidak diulang; riwayat jadi satu kalimat di kepala seksi."""
    g = c['gempa']
    riw = riwayat_sekitar(g, n=1)
    kanan = (f"Terkuat sekitar: M{angka(riw[1][0]['magnitudo'], 1)} {riw[1][0]['lokasi'].replace('Sumatra', 'Sumatera')}, "
             f"{riw[1][0]['tanggal_id']}") if riw else None
    kepala_panel(k, 471.3, y, 445.5, 'Peluang gempa susulan M5 ke atas (model)', 'gempa', kanan=kanan)
    y += 37
    w3 = (445.5 - 2 * 6) / 3
    gaya = c.get('gaya_susulan', 'kartu')
    if gaya != 'kartu':
        GAYA_SUSULAN[gaya](k, c, PEL, 471.3, y, 445.5)
    for i, (lab, p) in enumerate((('24 jam pertama', PEL['p24']), ('3 hari pertama', PEL['p3']), ('7 hari pertama', PEL['p7']))
                                 if gaya == 'kartu' else ()):
        x = 471.3 + i * (w3 + 6)
        nm = kategori(p)
        k.bulat(x, y, w3, 46, PUTIH, GARIS, radius=4)
        k.kotak(x, y + 0.4, 4, 45.2, WARNA_KAT[nm])
        k.teks(x + 12, y + 2, w3 - 85, 11, [R(lab, 7.5, TEKS3, True)], bungkus=False)
        k.teks(x + 12, y + 18, w3 - 20, 16, [R(nm, 12, TEKS_KAT[nm], True)], bungkus=False)
        k.teks(x + w3 - 70, y + 2, 62, 11, [R(f'Peluang {persen(p)}', 7.5, TEKS3)], rata='r', bungkus=False)
        k.bulat(x + 12, y + 38.5, w3 - 20, 3.5, 'E3E8EF', radius=1.75)
        k.bulat(x + 12, y + 38.5, max(3.5, (w3 - 20) * p), 3.5, WARNA_KAT[nm], radius=1.75)
    y += 50
    amat = ('data susulan USGS belum tersedia' if PEL['n_amat'] is None else
            f"{PEL['n_amat']} susulan M4 ke atas tercatat dalam {PEL['rgk']:.0f} km (USGS)" if PEL['n_amat'] else
            f"belum ada susulan M4 ke atas dalam {PEL['rgk']:.0f} km (USGS)")
    skala = '' if gaya == 'tangga' else ' (sangat kecil <10%, kecil <33%)'   # gaya tangga sudah menulis ambang di kepalanya
    k.teks(471.3, y, 445.5, 10, [R(f'Kategori diadaptasi dari skala peluang IPCC{skala}; {amat}.', 7, TEKS3)],
           bungkus=False)
    y += 13
    kepala_panel(k, 471.3, y, 445.5, 'Langkah yang disarankan', 'ringkasan')
    y += 38
    daftar = [(lab, 'Pantau gempa susulan bersama BMKG dan BPBD.' if teks.startswith('Pantau gempa susulan') else teks)
              for lab, teks in langkah(c, MAKS, PEL['p7'])]
    for n, (lab, teks) in enumerate(daftar):
        k.nomor(471.3, y + 1, n + 1, 13)
        k.teks(490, y, 426.8, 12, [R(lab, 8.4, NAVY, True), R('  ' + teks, 7.8, TEKS)], jangkar='t', spasi=0.95)
        nb = max(1, math.ceil((len(lab) + len(teks)) * 3.95 / 426))
        y += 11 * nb + 7
    print('satu halaman: kolom kanan berakhir', round(y - 7))
    assert y - 7 <= 489, 'kolom kanan satu halaman melewati batas'


# ======================================================================== tiga gaya alternatif blok peluang susulan (23 Nov 2026)
# Semua mengisi kotak setinggi 46 pt yang sama dengan gaya 'kartu', jadi tata letak di bawahnya tidak bergeser.
JENDELA = (('24 jam pertama', 'p24', 1), ('3 hari pertama', 'p3', 3), ('7 hari pertama', 'p7', 7))
ABU_JALUR = 'E3E8EF'


def _susulan_tangga(k, c, PEL, x0, y, W):
    """Tiga baris di atas satu tangga kategori: segmen kategorinya terisi warna, jadi pergeseran antarjendela terlihat."""
    kol_l, kol_r = 72, 92
    tx, tw = x0 + kol_l, W - kol_l - kol_r
    sw = (tw - 3 * 2) / 4
    for j, (nm, ket) in enumerate(zip([n for _, n in KATEGORI], ('<10%', '10 sampai 33%', '33 sampai 66%', '>66%'))):
        k.teks(tx + j * (sw + 2), y, sw, 9, [R(f'{nm} {ket}', 6.5, TEKS3)], rata='c', bungkus=False)
    for i, (lab, kunci, _) in enumerate(JENDELA):
        p = PEL[kunci]
        nm = kategori(p)
        yr = y + 11 + i * 12
        k.teks(x0, yr, kol_l - 6, 11, [R(lab, 7.5, TEKS, True)], bungkus=False)
        for j, (_, n) in enumerate(KATEGORI):
            k.bulat(tx + j * (sw + 2), yr + 2.5, sw, 6, WARNA_KAT[n] if n == nm else ABU_JALUR, radius=3)
        k.teks(tx + tw + 8, yr, kol_r - 8, 11, [R(nm, 8.5, TEKS_KAT[nm], True), R(f'  {persen(p)}', 7, TEKS3)], bungkus=False)


def _susulan_linimasa(k, c, PEL, x0, y, W):
    """Garis waktu sejak gempa utama: tiap tonggak (24 jam, 3 hari, 7 hari) bertanggal, kategori di atas titik."""
    t0 = datetime(*c['waktu_utama'], tzinfo=WIB)
    tgl = lambda t: f'{t.day} {BULAN[t.month - 1]}'
    yl = y + 23
    cx = [x0 + 115, x0 + 245, x0 + 375]
    titik = [x0 + 4] + cx
    for i in range(3):   # ruas garis berwarna kategori jendela yang diakhirinya
        k.kotak(titik[i], yl - 1.25, titik[i + 1] - titik[i], 2.5, WARNA_KAT[kategori(PEL[JENDELA[i][1]])])
    k.kotak(x0, yl - 4, 8, 8, NAVY, bentuk=MSO_SHAPE.OVAL)
    k.teks(x0, y + 4, 60, 10, [R('Gempa utama', 7, TEKS3, True)], bungkus=False)
    k.teks(x0, yl + 6, 60, 10, [R(f"{tgl(t0)} {t0:%H.%M}", 7, TEKS3)], bungkus=False)
    for (lab, kunci, hari), x in zip(JENDELA, cx):
        p = PEL[kunci]
        nm = kategori(p)
        k.kotak(x - 5.5, yl - 5.5, 11, 11, WARNA_KAT[nm], PUTIH, 1.5, bentuk=MSO_SHAPE.OVAL)
        k.teks(x - 60, y, 120, 15, [R(nm, 11, TEKS_KAT[nm], True)], rata='c', bungkus=False)
        k.teks(x - 60, yl + 6, 120, 10, [R(f'{lab} (s.d. {tgl(t0 + timedelta(days=hari))})', 7.5, TEKS, True)],
               rata='c', bungkus=False)
        k.teks(x - 60, yl + 15, 120, 9, [R(f'Peluang {persen(p)}', 7, TEKS3)], rata='c', bungkus=False)


def _susulan_sinyal(k, c, PEL, x0, y, W):
    """Kartu bergaris tipis dengan empat batang naik (seperti sinyal): batang terisi sampai kategori peluangnya."""
    w3 = (W - 2 * 6) / 3
    for i, (lab, kunci, _) in enumerate(JENDELA):
        p = PEL[kunci]
        nm = kategori(p)
        tingkat = [n for _, n in KATEGORI].index(nm)
        x = x0 + i * (w3 + 6)
        k.bulat(x, y, w3, 46, PUTIH, GARIS, radius=4)
        for j, h in enumerate((8, 13, 18, 23)):
            k.bulat(x + 10 + j * 8.5, y + 39 - h, 6, h, WARNA_KAT[nm] if j <= tingkat else ABU_JALUR, radius=1.5)
        k.teks(x + 52, y + 5, w3 - 58, 11, [R(lab, 7.5, TEKS3, True)], bungkus=False)
        k.teks(x + 52, y + 16, w3 - 58, 16, [R(nm, 12, TEKS_KAT[nm], True)], bungkus=False)
        k.teks(x + 52, y + 31, w3 - 58, 10, [R(f'Peluang {persen(p)}', 7, TEKS3)], bungkus=False)


GAYA_SUSULAN = {'tangga': _susulan_tangga, 'linimasa': _susulan_linimasa, 'sinyal': _susulan_sinyal}
