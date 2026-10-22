"""Rekomendasi CARA PEMADAMAN per kompleks api -> disisipkan ke public/data/tugas_kompleks.json (kunci `rekomendasi`).

Fungsi murni + main. Jalan SESUDAH harian.py (pembuat tugas_kompleks.json), operasi.py, kendala.py. Membaca:
  tugas_kompleks.json (id, level, luas, ...), operasi.json (jenis, kanal, jam, bor, isi, ws, koef bersumber, prov.omc),
  kendala.json (air_km, jalan_km, kaki_km), akses.json (cadangan kaki_km), kluster.json (bara dari gambut_bara.hitung, isi, ws, hari),
  himawari.json (FRE), udara_kualitas.json (PM2.5 kabupaten, untuk catatan heli). Tidak ada angka dikarang: aturan yang datanya tidak ada dilewati; tanpa satu pun cara, kunci `rekomendasi` tidak ditulis.
Koefisien (jam_tiba, kanal_dekat, jarak_air_heli, isi_ambang, selang_pompa, omc_ph, ...) dipakai dari operasi.json `koef`, tidak diulang di sini.
Ambang lain ada di AMBANG dan ikut ditulis sebagai `taktik_ambang`. Ini ARAHAN PERENCANAAN, bukan perintah operasi.

KEDALAMAN BARA. FRP sesaat TIDAK bisa menunjukkan kedalaman gambut: bara gambut berpijar rendah dan tertutup abu, dan FRP bercampur nyala
vegetasi permukaan. Yang bisa ditaksir kasar hanya KEDALAMAN TERBAKAR (bukan ketebalan total gambut) dari energi radiatif terintegrasi:
  m_kg = FRE_MJ x 0,368 (Wooster dkk. 2005 JGR 110 D24311: FRE linear terhadap massa terbakar, r2 0,98; koefisien 0,368 kg/MJ dari ingatan,
         abstrak yang terverifikasi hanya memuat r2, jadi angkanya BELUM diverifikasi ke teks lengkap)
  D_m = m_kg / (A_m2 x BD), A = luas terbakar gambut_bara `a`, BD = gambut_bara.BD. FRE ~ sum(frp_MW x n x 600 s) sel Himawari-9 WLF dalam radius.
FRP yang dijumlah = FRP pindaian TERAKHIR per sel x n pindaian berdeteksi (himawari.json hanya menyimpan FRP terbaru; FRP dianggap tetap sepanjang n, jadi kasar).
Sel dijumlah hanya bila pusatnya dalam jari-jari ekuivalen kompleks + 1 km (setengah sel Himawari); A (gambut_bara `a`) = luas terbakar di dalam kompleks.
Sel dan kompleks tidak sejajar dan satu sel bisa dihitung dua kompleks bertetangga. Koefisien 0,368 berasal dari biomassa NYALA, bukan bara gambut.
Keterbatasan: resolusi Himawari 2 km; jendela himawari.json hanya ~3 jam, bukan umur kebakaran; bara kecil tak terdeteksi; FRE meremehkan bara
(berpijar rendah) dan melebihkan vegetasi. Karena itu FRE di sini PEMERIKSA KASAR untuk bara.d (persistensi + muka air), tidak memvalidasi dan bukan pengganti: FRE MENTAH dibandingkan dengan
d tanpa potongan muka air; pemotongan ke muka air proxy (api tidak membakar di bawah muka air) hanya untuk tampilan. Ketebalan total gambut tidak dihitung (tidak ada peta terbuka di repo).

Pakai:  python3 scripts/data/taktik.py        # tulis ulang tugas_kompleks.json
        python3 scripts/data/taktik.py uji    # self-check
"""
import datetime as dt, json, math, os, re, sys

sys.path.insert(0, os.path.dirname(__file__))
from wilayah import AKAR  # noqa: E402
import gambut_bara as GB  # noqa: E402
import kalibrasi as CAL  # noqa: E402
import operasi as OP  # noqa: E402  (kebutuhan sumber daya: rumus satu-satunya di operasi.kebutuhan/total)
sys.path.insert(0, os.path.join(AKAR, "scripts/scrape"))
from akses import KAKI_KMJ, daftar_akses, pasangkan_akses  # noqa: E402  (4 km/jam, kecepatan jalan kaki graf akses.json)

DATA = os.path.join(AKAR, "public/data")

AS, BS, BV = "asumsi platform", "bersumber", "belum diverifikasi"
BSU = "bersumber untuk agen uji, ekstrapolasi belum diverifikasi"
_M = {   # nama: (nilai, status, sumber). Ikut ditulis ke JSON sebagai taktik_ambang {nilai, status, sumber}.
    "kaki_selang_km": (1.0, AS, "darat_selang: jalan kaki dari jalan/track/sungai <= 1 km (= kendala.rawa_jalan_km; 15 menit sekali jalan)"),
    "jalan_selang_km": (2.0, AS, "atau jalan utama <= 2 km (= kendala.jalan_utama_km)"),
    "kaki_heli_km": (5.0, AS, "regu darat dianggap tak sampai bila jalan kaki > 5 km"),
    "luas_besar_ha": (500.0, AS, "luas besar untuk ISI tinggi"),
    "bara_injeksi_cm": (30.0, AS, "injeksi bila kedalaman bakar tengah >= 30 cm (rentang D 15-51 cm: Ballhorn 2009 PNAS, Page 2002 Nature)"),
    "fb_injeksi": (0.3, AS, "atau persistensi >= 0,3; sinyal yang SAMA dengan kedalaman (tengah = 15 + 36 x fb), bukan bukti kedua"),
    "d_min_injeksi_cm": (15.0, AS, "kedalaman tengah terpotong muka air < 15 cm (batas bawah D) tidak memicu injeksi berlance"),
    "lance_tambah_cm": (20.0, AS, "lance = bara tinggi + 20 cm, dibulatkan NAIK ke kelipatan 50 cm"),
    "lance_langkah_cm": (50.0, AS, "kelipatan panjang lance"),
    "wt_rusak_cm": (-40.0, BS, "PP 57/2016 jo. PP 71/2014: muka air tanah gambut > 0,4 m di bawah permukaan = kriteria rusak"),
    "sekat_kanal_km": (2.0, AS, "kanal <= 2 km dari kompleks"),
    "kg_per_mj": (0.368, BV, "Wooster dkk. 2005 JGR 110 D24311; dari ingatan (abstrak hanya memuat r2 0,98); koefisien dari biomassa NYALA, bukan bara gambut"),
    "frp_detik": (600, BS, "satu pindaian Himawari-9 = 10 menit"),
    "himawari_sel_min": (3, AS, "< 3 sel dalam radius: FRE terlalu jarang"),
    "himawari_umur_jam": (6, AS, "himawari.json harus <= 6 jam SEBELUM tugas_kompleks.dibuat; sesudahnya tidak dipakai"),
    "setengah_sel_km": (1.0, BS, "setengah sel Himawari 2 km, ditambahkan ke jari-jari ekuivalen kompleks"),
    "target_hari": (3, AS, "target kurung T hari untuk kebutuhan; sama dengan operasi.json ringkas_T3 dan laci Ringkasan"),
    "debit_serang_lpm": (190, AS, "debit kerja satu selang serang 1,5 inci, dasar kehilangan tekanan (50 gpm; nilai lapangan belum diverifikasi)"),
    "gesek_c": (24, BV, "FL(psi per 100 ft) = C x (gpm/100)^2, C selang 1,5 inci = 24 (rumus kehilangan gesek dinas pemadam, IFSTA/NFPA; diingat dari buku ajar, teks belum dibuka)"),
    "jam_operasi_hari": (8, AS, "jam mesin pompa bekerja efektif per hari (selaras garis regu 8 jam di koef garis_mineral)"),
    "bsfc_kg_kwh": (0.38, AS, "konsumsi BBM spesifik mesin bensin kecil, kg per kWh pada beban kerja (kisaran umum ~0,3-0,4; bukan lembar pabrikan)"),
    "beban_mesin": (0.75, AS, "pembebanan mesin pompa terhadap daya nominal"),
    "bensin_kg_l": (0.74, BS, "massa jenis bensin ~0,72-0,78 kg/L (rujukan umum)"),
    "hp_kw": (0.7457, BS, "1 HP mekanik = 0,7457 kW"),
    "tangki_l": (5000, BV, "kapasitas tangki fleksibel/mobil tangki 5.000 L menurut laporan BNPB (disampaikan pemilik; teks laporan belum dibaca)"),
    "air_front_l_per_m": (80, AS, "turunan kasar koef m_per_drop: 4.000 L per jatuhan membasahi pita ~50 m (BNPB 2020 Muara Enim); dipakai untuk serangan front darat, itu pendekatan, bukan ukuran"),
    "rujukan_ha_hari": ([110, 271], BV, "rujukan lapangan BNPB 20-21 Okt 2026: 110-271 ha gambut padam per hari per provinsi (disampaikan pemilik; dokumen belum dibaca)"),
    "rujukan_personel_ha": ([45, 149], BV, "rujukan lapangan BNPB 20-21 Okt 2026: 45-149 personel per ha per hari, termasuk standby dan shift (disampaikan pemilik; dokumen belum dibaca)"),
    "melampaui_personel": (3000, AS, "kebutuhan personel tengah di atas ini dianggap melampaui rujukan lapangan"),
    "melampaui_air_l": (10000000, AS, "air per hari tengah di atas 10 juta L dianggap melampaui rujukan lapangan"),
    "batas_hisap_m": (7.5, BS, "hisap maksimum 7,5 m, Honda WB30 (powerequipment.honda.com.au/models/pumps/wb30); lebih dalam dari ini pompa celup"),
    "kedalaman_bor_m": (16, BS, "sumur bor dangkal 16-30 m (koef ha_per_bor arti, LPDS); batas bawah dipakai sebagai kedalaman minimum"),
    "celup_kw": (0.75, AS, "daya satu pompa celup listrik untuk sumur bor (1 HP)"),
    "celup_per_regu": (1, AS, "satu pompa celup tiap regu bara"),
    "celup_per_genset": (2, AS, "pompa celup per genset"),
    "beban_logistik_kw": (2.5, AS, "pengisian drone termal dan HT (0,5 kW) + penerangan malam (2 kW) per kompleks gambut; operasi gambut siang-malam (koef rotasi)"),
    "faktor_daya": (0.8, AS, "cos phi beban motor kecil"),
    "lonjakan_start": (3, BV, "faktor lonjakan start langsung motor (umumnya 3-7x arus nominal); 3x dari arahan pemilik"),
    "genset_kva": ([1, 2, 3, 5, 7.5, 10, 15, 20, 30, 40, 50, 60, 80, 100, 125, 150, 200], AS, "ukuran genset komersial umum (kVA); daftar katalog belum diverifikasi"),
    "tegangan_v": (230, BS, "satu fasa 230 V (PLN)"),
    "rho_cu": (0.0175, BS, "resistivitas tembaga ohm mm2/m (praktik instalasi; 0,0172 pada 20 C)"),
    "susut_maks": (0.05, BV, "batas susut tegangan 5% (PUIL 2011; pasal belum dibuka)"),
    "kaki_kmj": (KAKI_KMJ, AS, "kecepatan jalan kaki di gambut/rawa tanpa beban (scrape/akses.py KAKI_KMJ); memikul pompa dan air memperlambat, jadi jalan_kaki_jam batas bawah (faktor perlambatan belum ada sumbernya)"),
    "cari_jalan_km": (50.0, AS, "jalan terdekat dicari sampai 50 km garis lurus; lebih jauh: null"),
    "orang_akses": (15, BS, "orang per regu (koef orang_regu, Permen LHK P.32/2016); dipakai untuk air minum regu"),
    "pembasah_persen": (1, BSU, "dosis 1% bahan pembasah nabati memangkas waktu padam bara gambut sekitar 39% dibanding air murni (5%: sekitar 26%; tanpa selang kepercayaan, jadi 1% tidak pasti lebih baik dari 5%); Santoso dkk. 2021, IJWF 30(5):378-390, doi 10.1071/WF20117; UJI LABORATORIUM semprot permukaan, efeknya termal, volume air tetap sekitar 5,7 L per kg gambut. Berlaku untuk agen nabati yang diuji; produk lain (foam kelas A) ikuti dosis label"),
    "pembasah_dc": (350.0, AS, "gambut dianggap kering bila DC > 350 (sama dengan kelas aturan.py dan harian.py, tanpa sumber ambang); pemicu lain: bara terdeteksi, atau muka air proxy di bawah wt_rusak_cm (proksi, asumsi platform). Injeksi bukan pemicu"),
    "maks_huruf": (3000, BS, "batas JSON per rekomendasi; warga-api memotong di 3.000 (naik dari 2.000 pada 22 Okt 2026 untuk bahan pembasah)"),
}
AMBANG = {k: v[0] for k, v in _M.items()}
AMBANG_META = {k: {"nilai": v[0], "status": v[1], "sumber": v[2]} for k, v in _M.items()}
RUMUS = {"injeksi": "waktu semprot kira-kira setengah dari semprot permukaan: belum diverifikasi (Santoso 2021 hanya meneliti semprot permukaan: 5,7 +- 2,1 L per kg gambut)"}
POMPA = [   # Spesifikasi pabrikan dicari orkestrator (WebSearch); tiap baris: kelas, contoh_merek, hp, debit_lpm, tekanan_bar, sumber, status. Konsumsi BBM TIDAK ada di sumber (lihat bsfc).
    {"kelas": "tekanan_tinggi", "contoh_merek": "Waterax Mark-3 (MK3-ES)", "hp": 10.7, "kw": 8, "mesin": "2-tak 140 cc, campuran BBM 50:1", "debit_lpm": 379, "tekanan_bar": 26.2,
     "titik_kerja": [[303, 6.9], [265, 10.3], [151, 17.2]], "debit_kerja_lpm": 265, "kerja_bar": 10.3,
     "sumber": "https://www.flashwildfireservices.ca/products/mark-3%c2%ae-essential-portable-high-pressure-fire-pump ; https://www.flashwildfireservices.ca/pages/mark-3-watson", "status": "bersumber"},
    {"kelas": "jinjing_ringan", "contoh_merek": "Waterax Mini-Striker MSTR-P (Honda GXH50); pompa jinjing 2 HP generik belum diverifikasi", "hp": 2.1, "kw": 1.6, "mesin": "Honda GXH50 4-tak, 2,1 HP net", "debit_lpm": 303, "tekanan_bar": 5.9,
     "titik_kerja": [[257, 1.7], [159, 3.4], [45, 5.2]], "debit_kerja_lpm": 159, "kerja_bar": 3.4,
     "sumber": "https://res.cloudinary.com/aquifer-distribution/raw/upload/Aquifer/Documents/141800_1287_Waterax_100053_Specification%20Sheet.pdf (lembar spesifikasi Waterax 100053)", "status": "bersumber"},
    {"kelas": "debit_besar", "contoh_merek": "Honda WB30 3 inci (rujukan Alkon 6 HP dan kelas setara; Alkon sendiri belum diverifikasi)", "hp": 5.5, "kw": 3.6, "mesin": "GX160 4-tak", "debit_lpm": 1100, "tekanan_bar": 2.3,
     "debit_kerja_lpm": 660, "kerja_bar": None, "hisap_maks_m": 7.5,
     "sumber": "https://powerequipment.honda.com.au/models/pumps/wb30; head total 23 m (~2,3 bar); debit kerja = 1.100 x 0,6 (asumsi platform)", "status": "bersumber"},
    {"kelas": "portabel_besar", "contoh_merek": "Tohatsu VC52AS (butuh kendaraan atau jalan, 80 kg)", "hp": 40.8, "kw": 30, "mesin": "2-tak 617 mL, 40,8 PS", "debit_lpm": 1300, "tekanan_bar": 6,
     "titik_kerja": [[1300, 6], [1000, 8]], "debit_kerja_lpm": 1000, "kerja_bar": 8,
     "sumber": "https://tohatsu.com/ffdp/int/pump/medium_flow/vc52as.html", "status": "bersumber"},
]
CATATAN = {   # teks tetap, ditulis sekali di akar berkas (taktik_catatan) supaya tiap kompleks tetap <= 3.000 huruf
    "jaringan_pln": "belum ada data jaringan; kabel dari jaringan PLN di lahan gambut umumnya tidak praktis (asumsi platform)",
    "bbm_jenis": "bensin (campur oli bila mesin 2-tak, cek buku pompa); L/jam diturunkan dari HP x beban x bsfc (asumsi), bukan lembar pabrikan",
    "dasar": "dasar.luas_ha = hitungan piksel (px24 x ha_bara_piksel), bukan terukur; rekonsiliasi_ha_per_piksel = operasi.json rekonsiliasi.ha_per_piksel_setara_resmi",
    "genset": "untuk celup = pompa celup listrik sumur bor (bor >= 16 m lebih dalam dari batas hisap 7,5 m); logistik = pengisian drone termal dan HT serta penerangan malam",
    "tangki": "tangki_fleksibel = isi per hari dan mobil_tangki = rit per hari, masing-masing 5.000 L (laporan BNPB, belum diverifikasi); dihitung dari air_l_hari",
    "akses": "akses.jalan = titik jalan OSM terdekat dari pusat kompleks (jalan.geojson, disederhanakan, garis lurus bukan rute); kaki_km dan jam_tiba = perkiraan graf jalan+sungai OSM (akses.json, kendala.json), hanya kompleks yang masuk akses.json; jalan_kaki_jam = kaki_km / kaki_kmj, batas bawah karena memikul pompa dan air memperlambat; bawa = peralatan yang dipikul dari ujung jalan, jumlah per regu (asumsi platform kecuali air minum dan pompa); tak ada data = null",
    "pembasah": "Santoso dkk. 2021 (IJWF 30(5):378-390, doi 10.1071/WF20117) hanya menunjukkan: bahan pembasah nabati 1% memangkas waktu padam bara gambut sekitar 39% dibanding air murni (5%: sekitar 26%), uji laboratorium semprot permukaan, efek termal, volume air tetap sekitar 5,7 L per kg gambut; belum uji lapangan, dosis 1% berlaku untuk agen yang diuji dan produk lain (foam kelas A) mengikuti dosis label. Hidrofobisitas gambut tropis yang kering tak balik (drainase, kemarau, kebakaran; lapisan 0-50 cm paling rentan) adalah klaim terpisah, dari literatur Indonesia yang belum dibaca utuh (belum diverifikasi): studi gambut hidrofobik Kalimantan Tengah FTIR 2009 (agris.fao.org/search/es/records/65df24c863b8185d9cab1a4e), IJTech UI 2018 (ijtech.eng.ui.ac.id/download/article/805), studi Palangka Raya 2021 (e-journal.upr.ac.id/index.php/Agp/article/download/3696/2832). konsentrat_l_hari = air bara saja (tanpa air front) x 1%, bila memakai agen setara pada 1%. Cara: campur di jalur pompa dengan inductor atau proportioner foam, atau premix di tangki fleksibel, lalu semprot (diuji); injeksi belum diuji. Peringatan: pakai produk biodegradable berlabel kebakaran kelas A; jangan buang konsentrat ke kanal, sumber air minum atau kolam ikan; ikuti dosis label produk, lebih pekat tidak lebih baik. Peralatan dan ambang DC asumsi platform",
    "per_ha": "per_ha = total / luas operasi per skenario [rendah, tengah, tinggi]; personel_hari_rujukan = rasio regional BNPB 20-21 Okt, model tengah 24,75 (koef bara_regu catatan_regional)",
}
CAP_HELI = "Terbang tergantung jarak pandang dan asap."
PERAN_PELENGKAP = ("water_bombing", "sekat_kanal")


def jarak_km(a1, o1, a2, o2):
    return math.hypot((a2 - a1) * 110.57, (o2 - o1) * 111.32 * math.cos(math.radians((a1 + a2) / 2)))


def k_(koef, nama, p="mid"):
    return (koef.get(nama) or {}).get(p)


def fre_himawari(himawari, tugas_dibuat, lat, lon, luas_ha):
    """-> (fre_mj, n_sel) atau (None, 0). Sel dengan pusat dalam jari-jari ekuivalen kompleks + setengah sel. Himawari harus 0..umur_jam SEBELUM tugas_dibuat."""
    if not himawari or not himawari.get("baris"):
        return None, 0
    try:
        ac = dt.datetime.fromisoformat(himawari["acuan"].replace("Z", "+00:00"))
        td = dt.datetime.fromisoformat(tugas_dibuat.replace("Z", "+00:00"))
        if not 0 <= (td - ac).total_seconds() <= AMBANG["himawari_umur_jam"] * 3600:
            return None, 0
        c = himawari["kolom"]
        ilat, ilon, ifrp, in_ = c.index("lat"), c.index("lon"), c.index("frp"), c.index("n")
    except (KeyError, ValueError, AttributeError):
        return None, 0
    r = math.sqrt(luas_ha / 100 / math.pi) + AMBANG["setengah_sel_km"]
    fre, n = 0.0, 0
    for b in himawari["baris"]:
        if abs(b[ilat] - lat) < r / 100 + 0.02 and jarak_km(lat, lon, b[ilat], b[ilon]) <= r:
            fre += b[ifrp] * b[in_] * AMBANG["frp_detik"]
            n += 1
    return (round(fre), n) if n else (None, 0)


def kedalaman_fre(fre_mj, bara):
    """cm [rendah, tengah, tinggi] MENTAH dari FRE (rendah = A dan BD besar, tinggi = A dan BD kecil). Pemotongan muka air dilakukan pemanggil untuk tampilan."""
    m_kg = fre_mj * AMBANG["kg_per_mj"]
    a, bd = bara["a"], [b * 1000 for b in GB.BD]
    return [m_kg / (a[2] * 1e4 * bd[2]) * 100, m_kg / (a[1] * 1e4 * bd[1]) * 100, m_kg / (a[0] * 1e4 * bd[0]) * 100]


def d_mentah(bara):
    """kedalaman bakar persistensi TANPA potongan muka air: sama dengan gambut_bara.hitung (D_BAWAH, interpolasi fb, D_ATAS)."""
    return [GB.D_BAWAH, GB.D_BAWAH + (GB.D_ATAS - GB.D_BAWAH) * bara["fb"], GB.D_ATAS]


def susut_bar_per_100m(debit_lpm, c=None):
    """kehilangan tekanan selang 1,5 inci per 100 m (bar): FL = C (gpm/100)^2 psi per 100 ft. Hitung tangan: 378,541 L/min = 100 gpm -> 24 psi/100 ft = 5,429 bar/100 m."""
    c = AMBANG["gesek_c"] if c is None else c
    gpm = debit_lpm / 3.785411784
    return c * (gpm / 100) ** 2 * (100 / 0.3048 / 100) / 14.5037738
    # psi per 100 ft -> per 100 m: x (100 m / 30,48 m); psi -> bar: / 14,5038


def kabel_maks_m(beban_kw, penampang_mm2, faktor_daya=None):
    """panjang kabel tembaga satu arah maks (m) pada 230 V satu fasa untuk susut <= susut_maks: I = P/(V pf); dV = 2 I L rho / A -> L = susut V A / (2 I rho).
    Hitung tangan: 2 kW, pf 0,8, 4 mm2 -> I 10,87 A, L = 0,05 x 230 x 4 / (2 x 10,87 x 0,0175) = 120,9 m. Dipakai bila ada data trafo (belum ada)."""
    pf = AMBANG["faktor_daya"] if faktor_daya is None else faktor_daya
    i = beban_kw * 1000 / (AMBANG["tegangan_v"] * pf)
    return AMBANG["susut_maks"] * AMBANG["tegangan_v"] * penampang_mm2 / (2 * i * AMBANG["rho_cu"])


def genset_kva(beban_kw):
    """-> (kva_hitung, kva_komersial): kVA = kW / faktor daya x lonjakan start; komersial = ukuran daftar terkecil >= hitung (None bila melebihi daftar)."""
    kva = beban_kw / AMBANG["faktor_daya"] * AMBANG["lonjakan_start"]
    return round(kva, 2), next((x for x in AMBANG["genset_kva"] if x >= kva - 1e-9), None)


def l_jam(hp):
    """L bensin per jam dari HP: hp x 0,7457 kW x beban x bsfc / massa jenis. None bila hp tidak diketahui. Hitung tangan: 6 HP -> 4,474 x 0,75 x 0,38 / 0,74 = 1,723 L/jam."""
    return None if hp is None else round(hp * AMBANG["hp_kw"] * AMBANG["beban_mesin"] * AMBANG["bsfc_kg_kwh"] / AMBANG["bensin_kg_l"], 2)


def pompa_dan_energi(per, c, ctx, pompa_tbl):
    """per = [operasi.total([c],T,s) s=0..2]. ctx: air_km, jalan_km, dekat, sumur_bor, injeksi, T. -> (pompa:[{kelas,hp,unit,alasan}], air, energi)."""
    T = ctx["T"]
    tbl = {x["kelas"]: x for x in pompa_tbl}
    # air bara habis dalam T + hari_mopup hari (selaras operasi.kebutuhan: regu_bara = wb / (T + hari_mopup)); air front dalam T hari
    air_hari = [round(c["bara"][s] * OP.k("air_bara", s) / (T + OP.k("hari_mopup", s)) * (1 if ctx["gambut"] else 0) + c["front"][s] * 1000 * AMBANG["air_front_l_per_m"] / T) for s in range(3)]
    tot = [x["pompa"] for x in per]
    selang = OP.k("selang_pompa", 1)
    air_m = ctx["air_km"] * 1000 if ctx["air_km"] is not None else None
    kelas = []   # (kelas, unit[3], alasan)
    if ctx["dekat"] and not ctx["injeksi"]:
        besar = [min(x["regu_kerja"] and math.ceil(x["regu_kerja"]), t) for x, t in zip(per, tot)]
        kelas.append(("debit_besar", besar, f"Air {ctx['air_km']:g} km: debit besar isi tangki, satu per regu (alokasi asumsi platform)"))
        kelas.append(("jinjing_ringan", [t - b for t, b in zip(tot, besar)], "Jinjing mop-up, sisa pompa operasi.kebutuhan"))
    else:
        sebab = "injeksi butuh tekanan nozel jet shooter (angka belum diverifikasi)" if ctx["injeksi"] else \
            (f"air {air_m:g} m, selang {selang:g} m per pompa, estafet {math.ceil(air_m / selang)} pompa" if air_m else "sumber air jauh atau tak terukur, selang panjang")
        q_loss = (tbl.get("tekanan_tinggi") or {}).get("debit_kerja_lpm") or AMBANG["debit_serang_lpm"]
        kerja = (tbl.get("tekanan_tinggi") or {}).get("kerja_bar")
        loss = susut_bar_per_100m(q_loss) * selang / 100
        kelas.append(("tekanan_tinggi", tot, f"Tekanan tinggi: {sebab}; selang 1,5 inci {selang:g} m hilang ~{loss:.1f} bar pada {q_loss} L/menit"+ (f" dari tekanan kerja pompa {kerja:g} bar" if kerja else "") + " (rumus gesek belum diverifikasi)"))
    jalan_ok = ctx["jalan_km"] is not None and ctx["jalan_km"] * 1000 <= selang and "portabel_besar" in tbl
    if jalan_ok:   # Tohatsu VC52AS (80 kg) hanya bila ada jalan dalam jarak selang dari api; satu per regu bara, mengambil dari unit kelas pertama
        pb = [min(math.ceil(x["regu_bara"] - 1e-9), u) for x, u in zip(per, kelas[0][1])]
        kelas[0] = (kelas[0][0], [u - b for u, b in zip(kelas[0][1], pb)], kelas[0][2])
        kelas.append(("portabel_besar", pb, f"Jalan {ctx['jalan_km'] * 1000:g} m dari api (<= selang {selang:g} m): pompa 80 kg bisa diangkut kendaraan, satu per regu bara"))
    out = []
    jam = AMBANG["jam_operasi_hari"]
    for i_, (kl, unit, alasan) in enumerate(kelas):
        row = tbl.get(kl, {})
        q = row.get("debit_kerja_lpm") if i_ == 0 else None   # kebutuhan air hanya dibebankan ke kelas pertama (pemompa utama), supaya tak terhitung ganda
        unit_air = [math.ceil(a / (q * 60 * jam)) for a in air_hari] if q else None
        if unit_air:
            pilih = [max(u, w) for u, w in zip(unit, unit_air)]
            alasan += f"; unit = yang lebih besar antara operasi.kebutuhan dan air {air_hari[1]} L/hari / ({q} L/menit x {jam} jam)"
        else:
            pilih = list(unit)
            alasan += "; unit = alokasi operasi.kebutuhan" + (" (debit pompa belum diverifikasi)" if i_ == 0 else "")
        out.append({"kelas": kl, "hp": row.get("hp"), "unit": pilih, "alasan": re.sub(r"(?<=\d)\.(?=\d)", ",", alasan)})
    # BBM (bensin; mesin 2-tak butuh campur oli, rasio belum diverifikasi: cek buku pompa)
    bbm = []
    for o in out:
        lj = l_jam(o["hp"])
        bbm.append({"kelas": o["kelas"], "l_jam": lj, "l_hari": [round(u * lj * jam) for u in o["unit"]] if lj is not None else None})
    known = [b["l_hari"] for b in bbm if b["l_hari"]]
    total = [sum(x[s] for x in known) for s in range(3)] if known else None
    energi = {"bbm_l_hari": total, "bbm": bbm, "bbm_lengkap": all(b["l_hari"] for b in bbm),
              "jaringan_pln": None, "genset": []}
    if ctx["sumur_bor"] and AMBANG["kedalaman_bor_m"] > AMBANG["batas_hisap_m"]:   # bor 16-30 m lebih dalam dari batas hisap: pompa celup listrik
        n = [math.ceil(x["regu_bara"] * AMBANG["celup_per_regu"] - 1e-9) for x in per]
        kva = genset_kva(AMBANG["celup_per_genset"] * AMBANG["celup_kw"])
        energi["genset"].append({"untuk": "celup", "celup": n, "unit": [math.ceil(x / AMBANG["celup_per_genset"]) for x in n],
                                 "kva_hitung": kva[0], "kva_komersial": kva[1]})
    if ctx["gambut"]:
        kva = genset_kva(AMBANG["beban_logistik_kw"])
        energi["genset"].append({"untuk": "logistik", "unit": [1, 1, 1], "kva_hitung": kva[0], "kva_komersial": kva[1]})
    air = {"air_l_hari": air_hari}
    if not ctx["dekat"]:
        air["tangki_fleksibel"] = [math.ceil(a / AMBANG["tangki_l"]) for a in air_hari]   # isi per hari, kapasitas 5.000 L (taktik_catatan)
    if ctx["jalan_km"] is not None:
        air["mobil_tangki"] = [math.ceil(a / AMBANG["tangki_l"]) for a in air_hari]   # rit per hari, kapasitas 5.000 L
    energi["genset"] = energi["genset"] or None   # tanpa beban listrik nyata: null
    return out, air, energi


def kebutuhan(c, jenis, lance, T, ctx=None, pompa_tbl=None, rekon=None):
    """Kebutuhan sumber daya satu kompleks (rumus di operasi.total/kebutuhan, tidak diduplikasi). c = entri operasi.json atau None.
    Bentuk: target_hari, dasar, per_ha, total, hari_provinsi, melampaui_rujukan_lapangan, energi. per_ha = total / luas operasi per skenario (supaya layar
    bisa mengalikannya dengan luas yang dikonfirmasi petugas)."""
    try:
        per = [OP.total([c], T, s) for s in range(3)]
        gambut = jenis == "gambut"
        luas = [c["bara"][s] for s in range(3)]
        tot = {"regu": [x["regu"] for x in per], "personel": [x["personel"] for x in per], "selang_m": [x["selang"] for x in per],
               "bor": [c["bor"][s] for s in range(3)], "heli": [x["heli"] for x in per],
               "jet_shooter": [x["regu_bara"] for x in per] if gambut else None,   # satu per regu bara: asumsi platform
               "lance_cm": lance}
        r = {"target_hari": T, "dasar": {"luas_ha": luas, "rekonsiliasi_ha_per_piksel": rekon},
             "per_ha": None, "total": tot, "hari_provinsi": None, "melampaui_rujukan_lapangan": False, "energi": None}
        if ctx is not None:
            pompa, air, energi = pompa_dan_energi(per, c, dict(ctx, T=T, gambut=gambut), POMPA if pompa_tbl is None else pompa_tbl)
            tot["pompa"] = pompa
            tot["air_l_hari"] = air["air_l_hari"]
            for k_ in ("tangki_fleksibel", "mobil_tangki"):
                if k_ in air:
                    tot[k_] = air[k_]
            r["energi"] = energi
        f = lambda v, i: round(v[i] / luas[i], 2) if v and luas[i] > 0 else None
        ph = {"regu_hari": [f(tot["regu"], i) for i in range(3)], "personel_hari": [f(tot["personel"], i) for i in range(3)]}
        if ctx is not None:
            ph["air_l"] = [None if x is None else round(x) for x in (f(tot["air_l_hari"], i) for i in range(3))]
            bb = r["energi"]["bbm_l_hari"]
            ph["bbm_l"] = [f(bb, i) for i in range(3)] if bb else None
            ph["pompa_unit_hari"] = [f([sum(p["unit"][i] for p in pompa) for i in range(3)], i) for i in range(3)]
        ph["personel_hari_rujukan"] = AMBANG["rujukan_personel_ha"]
        r["per_ha"] = ph
        if luas[1] > 0:
            rj = AMBANG["rujukan_ha_hari"]
            r["hari_provinsi"] = [round(luas[1] / rj[1], 1), round(luas[1] / rj[0], 1)]
        r["melampaui_rujukan_lapangan"] = tot["personel"][1] > AMBANG["melampaui_personel"] or (ctx is not None and tot["air_l_hari"][1] > AMBANG["melampaui_air_l"])
        return r
    except (KeyError, TypeError, ValueError, IndexError):
        return None


def pembasah(jenis, bara, dc, wt, c, T, melampaui=False):
    """Bahan pembasah untuk gambut kering/berbara (pemicu: bara, DC > ambang, muka air proxy < -40 cm; injeksi BUKAN pemicu), atau None.
    konsentrat_l_hari = air BARA saja (bara x air_bara / (T + mopup), tanpa front) x pembasah_persen %, bila memakai agen setara pada 1%."""
    if jenis != "gambut":
        return None
    sebab = [x for x, ok in (("bara terdeteksi", bool(bara)), (f"DC {dc:g} (> {AMBANG['pembasah_dc']:g})" if dc is not None else "", dc is not None and dc > AMBANG["pembasah_dc"]),
                             (f"muka air proxy {wt:g} cm (< {AMBANG['wt_rusak_cm']:g})" if wt is not None else "", wt is not None and wt < AMBANG["wt_rusak_cm"])) if ok]
    if not sebab:
        return None
    pc = AMBANG["pembasah_persen"]
    air_bara = [c["bara"][s] * OP.k("air_bara", s) / (T + OP.k("hari_mopup", s)) for s in range(3)]
    return {"perlu": True, "alasan": "Gambut kering atau berbara: " + ", ".join(sebab) + ".", "konsentrasi_persen": pc,
            "konsentrat_l_hari": [round(a * pc / 100) for a in air_bara],
            "cara": "bila memakai agen setara pada 1% (nabati, diuji); produk lain ikuti dosis label. Campur di jalur pompa dengan inductor/proportioner foam atau premix di tangki fleksibel; semprot (diuji), injeksi belum diuji (alat asumsi platform)",
            "peringatan": "produk biodegradable berlabel kelas A; jangan buang ke kanal, air minum, kolam ikan; ikuti dosis label, lebih pekat tidak lebih baik"
            + ("; turunan dari kebutuhan air yang melampaui rujukan, pakai luas terkonfirmasi" if melampaui else ""),
            "status": AS}


def rekomendasi(t, op, kd, kl, ak, himawari, koef, omc_hari, tugas_dibuat, pm25=None, T=None, rekon=None):
    """t tugas, op operasi.json kompleks, kd entri kendala, kl properti kluster, ak akses.json entri; semuanya boleh None.
    pm25 = PM2.5 rata-rata kabupaten kompleks BILA kategori berbahaya (susun menyaring dengan udara_kualitas.batas[3]), selain itu None. -> dict atau None."""
    op0 = op
    op, kd, kl, ak = op or {}, kd or {}, kl or {}, ak or {}
    koef = koef or {}
    T = T or AMBANG["target_hari"]
    bara = kl.get("bara")
    jenis = "gambut" if bara or kd.get("gambut") else op.get("jenis")
    if jenis is None and not kd:
        return None  # tidak ada satu pun data pendukung: tidak mengarang
    air = kd.get("air_km") if kd else op.get("kanal")
    air_diketahui = ("air_km" in kd) if kd else op.get("kanal") is not None
    jalan, kaki = kd.get("jalan_km"), kd.get("kaki_km", ak.get("kaki_km"))
    jam, jsum = op.get("jam", kd.get("jam")), op.get("jsum")
    isi = kl.get("isi", op.get("isi"))
    kanal = op.get("kanal")
    jam_tiba, kanal_dekat = k_(koef, "jam_tiba"), k_(koef, "kanal_dekat")
    heli_air, isi_amb = k_(koef, "jarak_air_heli", "hi"), k_(koef, "isi_ambang")
    cara, alat, cat = [], [], []
    PMP = "pompa Mark-3 + jinjing (Manggala Agni)"

    def tambah(kode, alasan, *a):
        cara.append({"metode": kode, "peran": "pelengkap" if kode in PERAN_PELENGKAP else "utama",
                     "alasan": re.sub(r"(?<=\d)\.(?=\d)", ",", alasan)})  # desimal Indonesia
        alat.extend(a)

    def selang():
        s = k_(koef, "selang_pompa")
        return f"selang {s:g} m per pompa (koef selang_pompa)" if s else None

    # bara: kedalaman bakar persistensi, dipotong ke muka air proxy untuk tampilan dan aturan
    bara_cm = d_tengah = d_tinggi = None
    wt = bara.get("wt") if bara else None
    pot = lambda x: round(min(x, max(0.0, -wt))) if wt is not None else round(x)
    if bara:
        bara_cm = [pot(x) for x in bara["d"]]
        d_tengah, d_tinggi = bara_cm[1], bara_cm[2]
        if bara.get("tertahan_air"):
            cat.append("muka air proxy di atas permukaan, bara tertahan air")
    fre_mj, n_sel = fre_himawari(himawari, tugas_dibuat, t["lat"], t["lon"], t.get("luas") or 0)
    if fre_mj is not None and n_sel < AMBANG["himawari_sel_min"]:
        cat.append(f"FRE Himawari hanya {n_sel} sel, terlalu jarang; pakai kedalaman persistensi")
    elif fre_mj is not None and bara and bara["a"][0] > 0:
        df, d0 = kedalaman_fre(fre_mj, bara), d_mentah(bara)   # keduanya MENTAH
        x = pot(df[1])
        c_ = f"FRE jendela 3 jam setara {x:g} cm" + (" (dipotong muka air)" if wt is not None and x < round(df[1]) else "") + " (pemeriksa kasar, tidak memvalidasi)"
        if df[0] > d0[2]:
            c_ += f"; mentah {df[1]:.0f} cm melebihi batas atas persistensi {d0[2]:g} cm, kemungkinan nyala vegetasi"
        elif df[2] < d0[0]:
            c_ += f"; mentah di bawah batas bawah persistensi {d0[0]:g} cm, FRE jendela pendek meremehkan bara"
        cat.append(c_)
    elif fre_mj is None and bara:
        cat.append("FRE Himawari tidak tersedia; kedalaman dari persistensi dan muka air")

    dekat = air is not None and kanal_dekat is not None and air <= kanal_dekat
    darat = (kaki is not None and kaki <= AMBANG["kaki_selang_km"]) or (jalan is not None and jalan <= AMBANG["jalan_selang_km"])
    kaki_jauh = kaki is not None and kaki > AMBANG["kaki_heli_km"]
    tak_tiba = (jam is not None and jam_tiba is not None and jam > jam_tiba) or (jam is None and jsum == "akses" and bool(op))
    lance = None
    if bara and not bara.get("tertahan_air") and d_tengah is not None:
        lance = int(math.ceil((d_tinggi + AMBANG["lance_tambah_cm"]) / AMBANG["lance_langkah_cm"]) * AMBANG["lance_langkah_cm"])
    # buka_akses: darat tak terjangkau dalam batas jam (atau jalan kaki terlalu jauh)
    if tak_tiba or kaki_jauh:
        sebab = (f"regu darat tiba {jam:g} jam (perkiraan), di atas batas {jam_tiba:g} jam" if jam is not None and jam_tiba is not None and jam > jam_tiba
                 else f"tidak ada rute jalan/sungai OSM dalam 18 jam" if tak_tiba else f"jalan kaki {kaki:g} km (> {AMBANG['kaki_heli_km']:g} km)")
        tambah("buka_akses", f"Buka akses atau jalur regu darat (perahu, motor trail): {sebab}. Tanpa regu darat bara tak padam; heli hanya menahan front. "
               "Jalur perahu/motor trail tak terpetakan (belum diverifikasi), survei dulu.",
               "perahu atau motor trail (asumsi platform)")
    # darat_selang
    if dekat and darat:
        tambah("darat_selang", f"Air {air:g} km dari kompleks (batas {kanal_dekat:g} km) dan akses darat "
               + (f"jalan kaki {kaki:g} km" if kaki is not None and kaki <= AMBANG["kaki_selang_km"] else f"jalan utama {jalan:g} km")
               + ", regu bisa menyedot dari kanal dan menyerang langsung.", PMP, selang())
    # sumur_bor
    if jenis == "gambut" and air_diketahui and not dekat and jam is not None and jam_tiba is not None and jam <= jam_tiba:
        b = op.get("bor")
        tambah("sumur_bor", "Gambut dengan air " + (f"{air:g} km" if air is not None else "tak terpetakan dalam jangkauan") + f" (di atas {kanal_dekat:g} km) dan regu darat tiba {jam:g} jam (perkiraan)"
               + (f"; {b[0]}-{b[2]} titik bor menurut operasi.json, tengah {b[1]}" if b else "") + ".",
               "bor dangkal 16-30 m + pompa (koef ha_per_bor)" + (f", {b[1]} titik bor (rentang {b[0]}-{b[2]})" if b else ""), PMP, selang())
    # injeksi: persistensi (fb) dan kedalaman tengah satu sinyal; muka air dangkal (d terpotong < 15 cm) tidak memicu
    inj = False
    if jenis == "gambut" and bara and not bara.get("tertahan_air") and d_tengah >= AMBANG["d_min_injeksi_cm"] \
            and (d_tengah >= AMBANG["bara_injeksi_cm"] or bara["fb"] >= AMBANG["fb_injeksi"]):
        inj = True
        dalam = d_tengah >= AMBANG["bara_injeksi_cm"]
        tambah("injeksi", f"Persistensi deteksi {bara['fb']:g} (proksi kedalaman, bukan ukuran); kedalaman bakar tengah {d_tengah} cm ({bara_cm[0]}-{d_tinggi})."
               + (" Semprot permukaan tak menembus sedalam itu (belum diverifikasi)." if dalam else "")
               + f" Lance {lance:.0f} cm (asumsi platform). Waktu injeksi belum diverifikasi.",
               f"jet shooter atau lance panjang {lance:.0f} cm (asumsi platform)", PMP)
    # sekat_kanal
    if jenis == "gambut" and wt is not None and wt < AMBANG["wt_rusak_cm"] and kanal is not None and kanal <= AMBANG["sekat_kanal_km"]:
        tambah("sekat_kanal", f"Muka air proxy {wt:g} cm (kriteria rusak di bawah {AMBANG['wt_rusak_cm']:g} cm, PP 57/2016) dan kanal {kanal:g} km: sekat menaikkan muka air. Pendukung dan pencegahan, bukan pemadaman cepat.",
               "cangkul, karung pasir atau papan sekat (asumsi platform)")
    # sekat_bakar
    if jenis in ("mineral", "savana") and isi is not None and isi_amb is not None:
        if isi < isi_amb:
            tambah("sekat_bakar", f"Lahan {jenis}, ISI {isi:g} di bawah {isi_amb:g}: api masih bisa dipukul langsung dengan kepyok dan garu.", "kepyok dan garu (asumsi platform)", "cangkul (asumsi platform)")
        else:
            g = k_(koef, "garis_" + jenis)
            tambah("sekat_bakar", f"Lahan {jenis}, ISI {isi:g} (batas {isi_amb:g}): serangan langsung makin sering gagal, buat sekat atau ilaran di depan api"
                   + (f" ({g:g} km per regu per hari)" if g else "") + ".", "cangkul untuk sekat atau ilaran (asumsi platform)", "kepyok dan garu (asumsi platform)")
    elif jenis in ("mineral", "savana"):
        cat.append("ISI tidak tersedia; metode lahan kering belum bisa dipilih")
    # water_bombing: selalu pelengkap, tidak pernah satu-satunya
    isi_tinggi = isi is not None and isi_amb is not None and isi >= isi_amb and (t.get("luas") or 0) >= AMBANG["luas_besar_ha"]
    if tak_tiba or kaki_jauh or isi_tinggi:
        if air is not None and heli_air is not None and air > heli_air:
            cat.append(f"water bombing tidak disarankan: sumber air {air:g} km, di atas {heli_air:g} km")
        elif not any(c["peran"] == "utama" for c in cara):
            cat.append("ISI tinggi dan luas besar, tetapi data akses dan air tidak cukup untuk memilih metode darat; heli saja tidak disarankan")
        else:
            sebab = "regu darat tiba lebih dari batas jam" if tak_tiba else f"jalan kaki {kaki:g} km (> {AMBANG['kaki_heli_km']:g})" if kaki_jauh else f"ISI {isi:g} (batas {isi_amb:g}) dan luas {t['luas']:g} ha"
            pasang = (" Heli menahan dan mendinginkan front, tidak memadamkan bara gambut" + ("; pasangkan dengan injeksi oleh regu darat." if inj and d_tengah >= AMBANG["bara_injeksi_cm"] else ".")) if jenis == "gambut" else " Heli menahan front sampai regu darat tiba."
            tambah("water_bombing", f"{sebab[0].upper() + sebab[1:]}." + pasang + (f" Sumber air {air:g} km." if air is not None else " Jarak sumber air belum terukur.") + " " + CAP_HELI,
                   "helikopter bucket (koef m_per_drop, BNPB 2020)")
            if pm25 is not None:
                cat.append(f"PM2.5 kabupaten {pm25:g} ug/m3 kategori berbahaya, heli kemungkinan tidak terbang")
    # OMC: info provinsi, bukan metode
    ph, phm = k_(koef, "omc_ph"), k_(koef, "omc_ph_maks")
    if omc_hari and ph is not None and phm is not None:
        cat.append(f"Info provinsi (bukan pemadaman titik): {len(omc_hari)} hari ke depan layak modifikasi cuaca, peluang hujan provinsi {ph * 100:g}-{phm * 100:g}% (koef omc_ph dan omc_ph_maks)")
    if not cara:
        return None
    cara.sort(key=lambda c: c["peran"] != "utama")
    M_ = [c["metode"] for c in cara[:4]]  # stabil: utama dulu, heli pelengkap tak pernah di depan
    kb = kebutuhan(op0, jenis, lance, T, {"air_km": air, "jalan_km": jalan, "dekat": dekat, "sumur_bor": "sumur_bor" in M_, "injeksi": inj}, rekon=rekon) if op0 else None
    if kb and jenis == "gambut" and CAL.n_koef(koef, "bara_regu", "ha_bara_piksel"):
        kb["berdasarkan_insiden"] = CAL.n_koef(koef, "bara_regu", "ha_bara_piksel")   # koef bara_regu + ha_bara_piksel dikalibrasi dari isian lapangan
    if kb:
        kb["pembasah"] = pembasah(jenis, bara, kl.get("dc"), wt, op0, T, kb["melampaui_rujukan_lapangan"])
    if kb and kb["melampaui_rujukan_lapangan"]:
        cat.insert(0, "luas bara dari hitungan piksel, bukan terukur; rujukan lapangan BNPB 20-21 Okt: 110-271 ha/hari per provinsi")
    if kb and bara:
        cat.append("dua luas berbeda: luas operasi (operasi.json) untuk kebutuhan, gambut_bara.a untuk FRE")
    r = {"cara": cara[:4], "alat": list(dict.fromkeys(a for a in alat if a))[:6], "bara_cm": bara_cm, "fre_mj": fre_mj,
         "kebutuhan": kb, "catatan": "; ".join(cat)}
    return muat(r)


def muat(r):
    """<= maks_huruf huruf JSON. Urutan buang: rincian BBM per kelas, alasan pompa, alat (sampai 2), mobil_tangki, catatan (dipotong dari belakang 40 huruf per langkah), cara dari prioritas terendah."""
    ukur = lambda x: len(json.dumps(x, ensure_ascii=False, separators=(",", ":")))
    kb = r.get("kebutuhan") or {}
    def langkah():
        if (kb.get("energi") or {}).get("bbm"):
            kb["energi"].pop("bbm")
            return True
        pb = kb.get("pembasah")
        if pb and len(pb["alasan"]) > 40:
            pb["alasan"] = "Gambut kering atau berbara."   # sebab lengkap ada di ambang dan taktik_catatan.pembasah
            return True
        if pb and "taktik_catatan" not in pb["cara"]:
            pb["cara"] = "agen setara 1% (diuji), lainnya dosis label; inductor/proportioner foam; rincian taktik_catatan.pembasah"
            pb["peringatan"] = "biodegradable kelas A; jangan buang ke kanal, air minum; ikuti dosis label" + ("; turunan dari air melampaui rujukan, pakai luas terkonfirmasi" if "melampaui" in pb["peringatan"] else "")
            return True
        ps = (kb.get("total") or {}).get("pompa") or []
        if any("alasan" in p for p in ps):
            for p in ps:
                p.pop("alasan", None)
            return True
        if len(r["alat"]) > 2:
            r["alat"].pop()
            return True
        if (kb.get("total") or {}).get("mobil_tangki"):
            kb["total"].pop("mobil_tangki")   # sama dengan air_l_hari / 5.000 L (taktik_catatan.tangki)
            return True
        if r["catatan"]:
            r["catatan"] = r["catatan"][: max(0, len(r["catatan"]) - 40)].rstrip("; ")
            return True
        if len(r["cara"]) > 1:
            r["cara"].pop()
            return True
        return False
    while ukur(r) > AMBANG["maks_huruf"] and langkah():
        pass
    return r


KELAS_JALAN = {1: "trunk/primary", 2: "secondary", 3: "tertiary", 4: "unclassified (jalan desa/kebun)", 5: "track"}
CEL = 0.05   # derajat, indeks ruang jalan


def indeks_jalan(geo):
    """geojson jalan -> {(i, j): [(k, lat1, lon1, lat2, lon2)]}; ruas didaftarkan ke tiap sel bbox-nya. None bila kosong."""
    ix = {}
    for f in (geo or {}).get("features", []):
        k = f["properties"].get("k")
        if k not in KELAS_JALAN:
            continue
        for g in f["geometry"]["coordinates"]:
            for (o1, a1), (o2, a2) in zip(g, g[1:]):
                for i in range(int(min(a1, a2) // CEL), int(max(a1, a2) // CEL) + 1):
                    for j in range(int(min(o1, o2) // CEL), int(max(o1, o2) // CEL) + 1):
                        ix.setdefault((i, j), []).append((k, a1, o1, a2, o2))
    return ix or None


def jalan_terdekat(ix, lat, lon, maks_km):
    """-> {lat, lon, kelas, km_garis_lurus} titik terdekat pada ruas jalan, atau None (indeks kosong/tak ada dalam maks_km)."""
    if not ix:
        return None
    ci, cj, best = int(lat // CEL), int(lon // CEL), None
    for r in range(int(maks_km / 5.5) + 2):
        if best and (r - 1) * CEL * 110.57 > best[0]:   # cincin berikut pasti lebih jauh dari yang terbaik
            break
        for i in range(ci - r, ci + r + 1):
            for j in range(cj - r, cj + r + 1):
                if max(abs(i - ci), abs(j - cj)) != r:
                    continue
                for k, a1, o1, a2, o2 in ix.get((i, j), ()):
                    c = math.cos(math.radians(lat))
                    dy, dx = (a2 - a1), (o2 - o1) * c
                    u = 0.0 if dy == dx == 0 else max(0.0, min(1.0, ((lat - a1) * dy + (lon - o1) * c * dx) / (dy * dy + dx * dx)))
                    pa, po = a1 + u * (a2 - a1), o1 + u * (o2 - o1)
                    d = jarak_km(lat, lon, pa, po)
                    if best is None or d < best[0]:
                        best = (d, pa, po, k)
    if not best or best[0] > maks_km:
        return None
    return {"lat": round(best[1], 5), "lon": round(best[2], 5), "kelas": KELAS_JALAN[best[3]], "km_garis_lurus": round(best[0], 2)}


def akses_kompleks(t, op, kd, ak, koef, ix, pb=None, regu=None):
    """Analisis AKSES satu kompleks -> dict atau None bila semua bagian tidak ada. Bagian tanpa data = None (tidak dikarang).
    jalan: jalan_terdekat; kaki_km, jam_tiba, dari: kendala/akses.json; jalan_kaki_jam = kaki_km / kaki_kmj; bawa: dipikul dari ujung jalan."""
    op, kd, ak = op or {}, kd or {}, ak or {}
    jalan = jalan_terdekat(ix, t["lat"], t["lon"], AMBANG["cari_jalan_km"])
    kaki = kd.get("kaki_km", ak.get("kaki_km"))
    dari = (ak.get("dari") or [None])[0]
    jam = next((x for x in (op.get("jam"), kd.get("jam"), dari and dari.get("jam")) if x is not None), None)
    jam_kaki = None if kaki is None else round(kaki / AMBANG["kaki_kmj"], 1)
    bawa = None
    if kaki is not None:
        air = kd.get("air_km") if "air_km" in kd else op.get("kanal")
        sp = k_(koef or {}, "selang_pompa")
        am = k_(koef or {}, "air_minum")
        n = AMBANG["orang_akses"]
        bawa = []
        if kaki > AMBANG["kaki_selang_km"]:
            jj = [p for p in POMPA if p["kelas"] == "jinjing_ringan"]
            if jj:
                bawa.append({"barang": "pompa jinjing " + jj[0]["contoh_merek"].split(" (")[0], "jumlah": 1, "satuan": "per regu", "hp": jj[0]["hp"], "status": jj[0]["status"]})
        bawa.append({"barang": "selang", "jumlah": None if air is None else int(math.ceil(air * 1000 / 50) * 50), "satuan": "m",
                     "dasar": "jarak ke air garis lurus, kelipatan 50 m, tanpa kelok" if air is not None else "jarak ke air tak diketahui", "status": AS,
                     "per_pompa_m": sp})
        bawa.append({"barang": "air minum", "jumlah": None if am is None else am * n, "satuan": "L per regu per hari", "per_orang_hari_l": am,
                     "dasar": f"koef air_minum x {n} orang", "status": BS if am is not None else AS})
        if pb:   # konsentrat 1 hari untuk satu regu (tengah) = konsentrat_l_hari tengah / regu tengah
            kt = pb["konsentrat_l_hari"][1]
            bawa.append({"barang": "bahan pembasah konsentrat", "jumlah": None if kt is None or not regu else round(kt / regu, 1), "satuan": "L per regu per hari",
                         "dasar": f"{pb['konsentrasi_persen']:g}% dari air tengah dibagi regu tengah", "status": AS})
            bawa.append({"barang": "inductor/proportioner", "jumlah": 1, "satuan": "per regu", "status": AS})
        bawa += [{"barang": b, "jumlah": 1, "satuan": u, "status": AS} for b, u in
                 (("P3K", "per regu"), ("GPS dan HT", "per regu"), ("parang", "per regu"), ("senter", "per orang"))]
    r = {"jalan": jalan, "kaki_km": kaki, "jam_tiba": jam, "dari": None if not dari else {x: dari.get(x) for x in ("dari", "jenis", "km_jalan", "jam")},
         "jalan_kaki_jam": jam_kaki, "bawa": bawa}
    return r if any(v is not None for v in r.values()) else None


def baca(nama):
    try:
        return json.load(open(os.path.join(DATA, nama)))
    except (OSError, ValueError):
        return None


def tgl_wib(dibuat):
    """ISO UTC "...Z" -> tanggal WIB (UTC+7) 'YYYY-MM-DD'; udara.hari bertanggal WIB."""
    return (dt.datetime.fromisoformat(dibuat.replace("Z", "+00:00")) + dt.timedelta(hours=7)).date().isoformat()


def susun(tugas, op, kendala, akses, kluster, himawari, udara=None, jalan=None):
    """-> tugas baru (kunci `dibuat` pertama, `taktik_ambang`, tiap kompleks +rekomendasi bila ada)."""
    koef = (op or {}).get("koef") or {}
    ops = {k["id"]: k for k in (op or {}).get("kompleks", [])}
    kds = (kendala or {}).get("kompleks", {})
    kls = {f["properties"]["id"]: f["properties"] for f in (kluster or {}).get("features", [])}
    daf_ak = pasangkan_akses(daftar_akses(akses), [(t["id"], t["lat"], t["lon"]) for t in tugas["kompleks"] if t.get("lat") is not None and t.get("lon") is not None])   # akses.json dicocokkan lewat LOKASI: id K#### berubah tiap putaran
    bt = ((udara or {}).get("batas") or [None] * 4)[3]
    hr = (udara or {}).get("hari", [])
    kab = (udara or {}).get("kab", [])
    tgl = tgl_wib(tugas["dibuat"])
    hari_ini = kab[hr.index(tgl)] if tgl in hr and len(kab) == len(hr) else []   # kab = satu daftar per hari; hari lain tidak dipakai
    pm = {(r[0], r[1]): r[2] for r in hari_ini if bt is not None and r[2] >= bt}
    out = {"dibuat": tugas["dibuat"], **{k: v for k, v in tugas.items() if k not in ("dibuat", "kompleks", "taktik_ambang")},
           "taktik_ambang": {**AMBANG_META, "rumus": RUMUS}, "taktik_catatan": CATATAN, "kompleks": []}
    kal = {n: {"n": v["kalibrasi"]["n"], "dari": v["kalibrasi"]["dari"], "sampai": v["kalibrasi"]["sampai"]} for n, v in koef.items() if isinstance(v, dict) and v.get("kalibrasi")}
    if GB.KAL_N:
        kal["kedalaman_bara"] = {"n": GB.KAL_N}
    if kal:
        out["kalibrasi"] = kal   # "berdasarkan N insiden" untuk koefisien yang dipakai kebutuhan bara; nama koefisien -> n
    for t in tugas["kompleks"]:
        t = {k: v for k, v in t.items() if k not in ("rekomendasi", "akses")}
        ak = daf_ak.get(t["id"])
        omc = [h for h in (((op or {}).get("prov") or {}).get(t.get("prov"), {}).get("omc") or {}).get("hari", []) if h >= tgl]
        r = rekomendasi(t, ops.get(t["id"]), kds.get(t["id"]), kls.get(t["id"]), ak, himawari, koef, omc, tugas["dibuat"], pm.get((t.get("prov"), t.get("kab"))), rekon=((op or {}).get("rekonsiliasi") or {}).get("ha_per_piksel_setara_resmi"))
        if r:
            t["rekomendasi"] = r
        kb = (r or {}).get("kebutuhan") or {}
        a = akses_kompleks(t, ops.get(t["id"]), kds.get(t["id"]), ak, koef, jalan, kb.get("pembasah"), ((kb.get("total") or {}).get("regu") or [None, None])[1])
        if a:
            t["akses"] = a   # kunci saudara rekomendasi (bukan di dalamnya): tidak makan 3.000 huruf
        out["kompleks"].append(t)
    return out


def main():
    OP.pasang_kalibrasi()   # KOEF operasi.py yang dipakai OP.k/OP.total sama dengan operasi.json
    GB.pasang_kalibrasi()
    tugas = baca("tugas_kompleks.json")
    if not tugas:
        print("taktik: tugas_kompleks.json tidak ada, dilewati")
        return
    out = susun(tugas, baca("operasi.json"), baca("kendala.json"), baca("akses.json"), baca("kluster.json"), baca("himawari.json"), baca("udara_kualitas.json"), indeks_jalan(baca("jalan.geojson")))
    with open(os.path.join(DATA, "tugas_kompleks.json"), "w") as f:   # sama dengan harian.simpan
        json.dump(out, f, ensure_ascii=False, separators=(",", ":"))
    n = sum("rekomendasi" in k for k in out["kompleks"])
    pb = sum(bool(((k.get("rekomendasi") or {}).get("kebutuhan") or {}).get("pembasah")) for k in out["kompleks"])
    print(f"taktik: {n}/{len(out['kompleks'])} kompleks mendapat rekomendasi, {sum('akses' in k for k in out['kompleks'])} analisis akses, {pb} pembasah")


KOEF = {k: {"lo": v[0], "mid": v[1], "hi": v[2]} for k, v in {
    "jam_tiba": (6, 6, 6), "kanal_dekat": (0.5, 0.5, 0.5), "jarak_air_heli": (2, 5, 15), "isi_ambang": (10, 8, 6),
    "selang_pompa": (200, 300, 500), "omc_ph": (0.15, 0.15, 0.15), "omc_ph_maks": (0.6, 0.6, 0.6), "garis_mineral": (1.8, 1.2, 0.6), "garis_savana": (3.0, 2.0, 1.2)}.items()}


def uji():
    T = lambda **k: {"id": "K1", "lat": -3.0, "lon": 112.0, "luas": 100, **k}
    M = lambda r: [c["metode"] for c in r["cara"]] if r else []
    P = lambda r, m: [c for c in r["cara"] if c["metode"] == m][0]
    KB = lambda r: {**r["kebutuhan"]["total"], "energi": r["kebutuhan"]["energi"]}   # bentuk datar untuk uji
    dc = "2026-10-21T05:00:00Z"
    bara = lambda fb=0.5, wt=None: GB.hitung([((2 * i, 0), tg, 10.0) for i in range(10) for tg in ("2026-10-15", "2026-10-16")][: 20 if fb >= 0.5 else 10] + ([((2 * i, 0), "2026-10-16", 5.0) for i in range(10, 20)] if fb >= 0.5 else []), 1000, wt=wt)
    R = lambda t, op, kd, kl, h=None, omc=(), pm=None, koef=KOEF: rekomendasi(t, op, kd, kl, None, h, koef, list(omc), dc, pm)
    # darat_selang: kanal 0,3 km, kaki 0,4 km; peran utama
    r = R(T(), {"jenis": "mineral", "isi": 5}, {"air_km": 0.3, "kaki_km": 0.4}, None)
    assert M(r)[0] == "darat_selang" and "0,3 km" in r["cara"][0]["alasan"] and r["cara"][0]["peran"] == "utama" and r["kebutuhan"] is None, r
    # sumur_bor: gambut, air 1,3 km, tiba 4 jam (perkiraan), 184 titik bor
    r = R(T(), {"jenis": "gambut", "jam": 4.0, "jsum": "perkiraan", "bor": [30, 184, 490], "kanal": 1.3}, None, None)
    assert M(r) == ["sumur_bor"] and "184" in r["cara"][0]["alasan"] and "(perkiraan)" in r["cara"][0]["alasan"] and r["bara_cm"] is None, r
    # gambut dalam, darat tak terjangkau: buka_akses (utama) + injeksi (utama) + water_bombing (pelengkap, dipasangkan)
    b = bara(0.5)
    assert b["d"][1] == 33, b
    r = R(T(luas=600), {"jenis": "gambut", "jam": None, "jsum": "akses", "kanal": 1.3}, {"air_km": 4.0, "kaki_km": 8.0}, {"bara": b, "isi": 10.2})
    assert {"injeksi", "water_bombing", "buka_akses"} <= set(M(r)) and M(r)[-1] == "water_bombing", r
    wb, inj = P(r, "water_bombing"), P(r, "injeksi")
    assert wb["peran"] == "pelengkap" and "tidak memadamkan bara" in wb["alasan"] and "pasangkan dengan injeksi" in wb["alasan"] and CAP_HELI in wb["alasan"], wb
    assert "Persistensi deteksi 0,5 (proksi kedalaman, bukan ukuran)" in inj["alasan"] and "tak menembus" in inj["alasan"] and "Lance 100 cm (asumsi platform)" in inj["alasan"], inj
    assert "belum diverifikasi" in P(r, "buka_akses")["alasan"] and P(r, "buka_akses")["peran"] == "utama"
    assert r["bara_cm"] == [15, 33, 51] and "jet shooter atau lance panjang 100 cm (asumsi platform)" in r["alat"], r
    # heli tak pernah satu-satunya: tanpa data akses/air dan hanya ISI tinggi -> tanpa heli
    r = R(T(luas=600), {"jenis": "gambut", "isi": 12}, None, {"isi": 12}) 
    assert r is None or "water_bombing" not in M(r), r
    # heli ditolak bila air > 15 km
    r = R(T(), {"jenis": "mineral", "jam": 9.0, "isi": 5}, {"air_km": 20.0, "kaki_km": 8.0}, None)
    assert "water_bombing" not in M(r) and "tidak disarankan" in r["catatan"] and M(r)[0] == "buka_akses", r
    # PM2.5 berbahaya: catatan heli tak terbang
    r = R(T(), {"jenis": "mineral", "jam": 9.0, "isi": 5}, {"air_km": 5.0, "kaki_km": 8.0}, None, pm=665.0)
    assert "water_bombing" in M(r) and "kemungkinan tidak terbang" in r["catatan"], r
    # injeksi lewat fb >= 0,3 walau d tengah < 30 (26): tanpa frasa 'tak menembus'
    b3 = dict(bara(0.5), d=[15, 26, 51], fb=0.3)
    r = R(T(), {"jenis": "gambut"}, {"air_km": 1, "kaki_km": 1}, {"bara": b3})
    assert "injeksi" in M(r) and "tak menembus" not in P(r, "injeksi")["alasan"], r
    # sekat_kanal pelengkap: wt -50, kanal 1,5 km
    r = R(T(), {"jenis": "gambut", "kanal": 1.5}, {"air_km": 1.5}, {"bara": bara(0.5, wt=-50)})
    assert P(r, "sekat_kanal")["peran"] == "pelengkap", r
    # muka air dangkal: bara_cm dipotong 10, tidak ada injeksi berlance (d < 15) dan tidak ada sekat_kanal
    bw = bara(0.5, wt=-10)
    r = R(T(), {"jenis": "gambut", "kanal": 1.5, "jam": 4.0}, {"air_km": 1.5, "kaki_km": 0.5}, {"bara": bw})
    assert r["bara_cm"] == [10, 10, 10] and "injeksi" not in M(r) and "sekat_kanal" not in M(r), r
    # tertahan air: tanpa injeksi
    r = R(T(), {"jenis": "gambut", "jam": 4.0, "kanal": 1.5}, {"air_km": 1.5}, {"bara": bara(0.5, wt=5)})
    assert "injeksi" not in M(r) and r["bara_cm"] == [0, 0, 0], r
    # sekat_bakar
    r = R(T(), {"jenis": "mineral", "isi": 10}, None, None)
    assert M(r) == ["sekat_bakar"] and "sekat atau ilaran" in r["cara"][0]["alasan"], r
    r = R(T(), {"jenis": "savana", "isi": 5}, None, None)
    assert M(r) == ["sekat_bakar"] and "kepyok" in r["cara"][0]["alasan"], r
    # omc: BUKAN cara, masuk catatan
    r = R(T(), {"jenis": "mineral", "isi": 5}, None, None, omc=["2026-10-22", "2026-10-23"])
    assert M(r) == ["sekat_bakar"] and "Info provinsi" in r["catatan"] and "15-60%" in r["catatan"] and "omc" not in M(r), r
    # data kosong: tanpa karangan
    assert R(T(), None, None, None) is None and R(T(), {}, {}, {}) is None
    assert R(T(), {"jenis": "gambut"}, None, None) is None
    # koef hilang: tidak jatuh; aturan yang butuh koef dilewati
    for kf in (None, {}, {"jam_tiba": None, "omc_ph": None}):
        r = R(T(), {"jenis": "gambut", "jam": 4.0, "kanal": 1.3, "isi": 9}, {"air_km": 1.3, "kaki_km": 1}, None, omc=["2026-10-22"], koef=kf)
        assert r is None, r
    r = R(T(), {"jenis": "mineral", "isi": 9}, {"air_km": 1.3}, None, omc=["2026-10-22"], koef={})
    assert r is None, r
    # FRE: sel dalam radius = sqrt(100 ha/100/pi)=0,56 km + 1 km; himawari harus SEBELUM tugas, maks 6 jam
    h = {"acuan": "2026-10-21T04:00:00Z", "kolom": ["lat", "lon", "u", "frp", "level", "rel", "qf", "n", "u0", "baru"],
         "baris": [[-3.0, 112.0, 0, 1000, 2, 3, 0, 6, 0, 0]]}
    assert fre_himawari(h, dc, -3.0, 112.0, 100) == (3600000, 1)
    assert fre_himawari(h, dc, -3.0, 113.0, 100) == (None, 0)
    assert fre_himawari(dict(h, acuan="2026-10-19T04:00:00Z"), dc, -3.0, 112.0, 100) == (None, 0)   # basi
    assert fre_himawari(dict(h, acuan="2026-10-21T06:00:00Z"), dc, -3.0, 112.0, 100) == (None, 0)   # sesudah tugas
    r = R(T(), {"jenis": "gambut", "jam": 4.0}, {"air_km": 1, "kaki_km": 1}, {"bara": b}, h)
    assert r["fre_mj"] == 3600000 and "terlalu jarang" in r["catatan"], r
    h3 = dict(h, baris=[[-3.0 + 0.001 * i, 112.0, 0, 1000, 2, 3, 0, 6, 0, 0] for i in range(3)])
    r = R(T(), {"jenis": "gambut", "jam": 4.0}, {"air_km": 1, "kaki_km": 1}, {"bara": b}, h3)
    assert r["fre_mj"] == 10800000 and "pemeriksa kasar, tidak memvalidasi" in r["catatan"] and "konsisten" not in r["catatan"] and "5 cm" in r["catatan"], r
    # T1: FRE besar + muka air dangkal (wt -10) tetap 'melebihi' (dibanding d MENTAH 15-51, bukan yang terpotong 10)
    h9 = dict(h, baris=[[-3.0 + 0.001 * i, 112.0, 0, 1000, 2, 3, 0, 600, 0, 0] for i in range(3)])
    r = R(T(), {"jenis": "gambut", "jam": 4.0}, {"air_km": 1, "kaki_km": 1}, {"bara": bara(0.5, wt=-10)}, h9)
    assert "melebihi" in r["catatan"] and r["bara_cm"] == [10, 10, 10] and "dipotong muka air" in r["catatan"], r
    assert max(round(min(x, 10.0)) for x in kedalaman_fre(1e9, bw)) == 10
    # kebutuhan: dari operasi.total (tidak diduplikasi); kompleks tanpa entri operasi -> null
    c = {"id": "K1", "jenis": "gambut", "ps": 1.0, "wl": [1.0, 2.0, 4.0], "wb": [1.0, 3.0, 8.0], "bor": [10, 20, 40], "wh": [0.0, 0.5, 1.0], "bara": [10.0, 20.0, 40.0], "front": [1.0, 2.0, 3.0], "kanal": 1.0}
    r = R(T(), c, {"air_km": 1.0, "kaki_km": 1.0}, {"bara": b})
    kb = KB(r)
    ref = OP.total([c], 3, 1)
    assert r["kebutuhan"]["target_hari"] == 3 and kb["regu"][1] == ref["regu"] and kb["personel"][1] == ref["personel"] and kb["selang_m"][1] == ref["selang"], (kb, ref)
    assert r["kebutuhan"]["dasar"]["luas_ha"] == [10, 20, 40] and kb["bor"] == [10, 20, 40] and kb["lance_cm"] == 100 and kb["jet_shooter"][1] == ref["regu_bara"], kb
    assert all(len(kb[x]) == 3 for x in ("regu", "personel", "selang_m", "bor", "heli", "air_l_hari", "jet_shooter"))
    assert "berdasarkan_insiden" not in r["kebutuhan"]   # KOEF uji tanpa kalibrasi
    kk = {n: dict(v, kalibrasi={"n": 12, "dari": "a", "sampai": "b"}) for n, v in KOEF.items()}
    kk.update(bara_regu=dict(KOEF["isi_ambang"], kalibrasi={"n": 12}), ha_bara_piksel=dict(KOEF["isi_ambang"], kalibrasi={"n": 15}))
    assert R(T(), c, {"air_km": 1.0, "kaki_km": 1.0}, {"bara": b}, koef=kk)["kebutuhan"]["berdasarkan_insiden"] == 12   # terkecil dari dua koefisien
    rm = R(T(), dict(c, jenis="mineral", isi=5), {"air_km": 1.0, "kaki_km": 1.0}, None)
    # pembasah: gambut + bara -> 1% air; gambut basah tanpa tanda kering -> null; mineral/savana -> null; DC dan muka air memicu tanpa bara
    pb = r["kebutuhan"]["pembasah"]
    ab_ = [round(c["bara"][i] * OP.k("air_bara", i) / (3 + OP.k("hari_mopup", i)) * 0.01) for i in range(3)]   # air BARA saja, tanpa front
    assert pb["perlu"] and pb["konsentrasi_persen"] == 1 and pb["konsentrat_l_hari"] == ab_ and pb["konsentrat_l_hari"][1] < round(kb["air_l_hari"][1] * 0.01) and pb["status"] == AS, (pb, kb["air_l_hari"])
    assert "kelas A" in pb["peringatan"] and "inductor" in pb["cara"] and "injeksi belum diuji" in pb["cara"] and pb["alasan"].startswith("Gambut kering atau berbara: ") and "mengalir" not in pb["alasan"] and "melampaui" not in pb["peringatan"], pb
    assert set(pb) == {"perlu", "alasan", "konsentrasi_persen", "konsentrat_l_hari", "cara", "peringatan", "status"}
    assert rm["kebutuhan"]["pembasah"] is None and R(T(), dict(c, jenis="savana", isi=5), {"air_km": 1.0, "kaki_km": 1.0}, None)["kebutuhan"]["pembasah"] is None
    # gambut basah (tanpa bara, DC 350 tidak > 350, muka air -10) + injeksi bukan pemicu -> null; DC 351, muka air -41 -> relevan
    assert pembasah("gambut", None, 200.0, -10.0, c, 3) is None and pembasah("gambut", None, 350.0, None, c, 3) is None and pembasah("gambut", None, None, None, c, 3) is None
    assert pembasah("gambut", None, 351.0, None, c, 3)["konsentrat_l_hari"] == ab_ and "muka air" in pembasah("gambut", None, 100.0, -41.0, c, 3)["alasan"] and pembasah("mineral", {"x": 1}, 500.0, None, c, 3) is None
    assert "melampaui rujukan" in pembasah("gambut", {"x": 1}, None, None, c, 3, True)["peringatan"]
    assert AMBANG_META["pembasah_persen"]["status"] == BSU and AMBANG_META["pembasah_dc"]["status"] == AS
    ab = akses_kompleks(T(), None, {"kaki_km": 6.0}, None, KOEF, None, pb, 4)
    bb = {x["barang"]: x for x in ab["bawa"]}
    assert bb["bahan pembasah konsentrat"]["jumlah"] == round(pb["konsentrat_l_hari"][1] / 4, 1) and bb["inductor/proportioner"]["jumlah"] == 1
    assert len(json.dumps(r, ensure_ascii=False, separators=(",", ":"))) <= AMBANG["maks_huruf"]
    # pompa dan air: kelas, unit, energi (semua hitung tangan)
    assert abs(susut_bar_per_100m(378.541178) - 5.4289) < 1e-3, susut_bar_per_100m(378.541178)   # 100 gpm: 24 psi/100 ft = 78,74 psi/100 m = 5,429 bar
    assert abs(kabel_maks_m(2, 4) - 120.93) < 0.05 and abs(kabel_maks_m(2, 2.5) - 120.93 * 2.5 / 4) < 0.05 and abs(kabel_maks_m(4, 4) - 60.46) < 0.05, kabel_maks_m(2, 4)
    assert genset_kva(1.5) == (5.62, 7.5) and genset_kva(0.0001)[1] == 1 and genset_kva(1000)[1] is None
    assert l_jam(6) == 1.72 and l_jam(None) is None
    assert all(x["sumber"] and x["status"] for x in POMPA)
    assert {x["kelas"] for x in POMPA} == {"tekanan_tinggi", "debit_besar", "jinjing_ringan", "portabel_besar"}
    assert all(v["status"] in (AS, BS, BV, BSU) and v["sumber"] for v in AMBANG_META.values())
    kd_ = lambda **k: dict({"air_km": 1.0, "kaki_km": 1.0, "jalan_km": 1.0}, **k)
    # kanal dekat: debit besar + jinjing, bbm > 0, tanpa tangki fleksibel, genset null (mineral, bukan gambut)
    cm = dict(c, jenis="mineral", isi=5)
    r = KB(R(T(), cm, kd_(air_km=0.3), None))
    assert [x["kelas"] for x in r["pompa"]] == ["debit_besar", "jinjing_ringan"] and "tangki_fleksibel" not in r and r["energi"]["genset"] is None, r["pompa"]
    assert r["energi"]["bbm_l_hari"] and r["energi"]["bbm_l_hari"][1] > 0 and r["energi"]["jaringan_pln"] is None and "belum ada data jaringan" in CATATAN["jaringan_pln"], r["energi"]
    assert r["pompa"][0]["hp"] == 5.5 and [a + b for a, b in zip(r["pompa"][0]["unit"], r["pompa"][1]["unit"])] == [OP.total([cm], 3, i)["pompa"] for i in range(3)]
    assert r["energi"]["bbm_l_hari"][1] == round(r["pompa"][0]["unit"][1] * 1.58 * 8) + round(r["pompa"][1]["unit"][1] * l_jam(2.1) * 8)
    # air jauh + bor: tekanan tinggi, tangki fleksibel, pompa celup dan genset (2 celup x 0,75 kW / 0,8 x 3 = 5,62 kVA -> 7,5)
    rj = R(T(), dict(c, jam=4.0), kd_(air_km=3.0), None)
    kj = KB(rj)
    assert "sumur_bor" in M(rj) and [x["kelas"] for x in kj["pompa"]] == ["tekanan_tinggi"] and kj["pompa"][0]["hp"] == 10.7, kj["pompa"]
    assert "estafet 10 pompa" in kj["pompa"][0]["alasan"] and "8,0 bar pada 265 L/menit dari tekanan kerja pompa 10,3 bar" in kj["pompa"][0]["alasan"], kj["pompa"][0]["alasan"]
    g = kj["energi"]["genset"]
    assert g[0]["kva_hitung"] == 5.62 and g[0]["kva_komersial"] == 7.5 and g[0]["celup"][1] == math.ceil(OP.total([dict(c, jam=4.0)], 3, 1)["regu_bara"]) and g[1]["kva_hitung"] == 9.38, g
    assert kj["energi"]["bbm_lengkap"] and kj["energi"]["bbm_l_hari"][1] == round(kj["pompa"][0]["unit"][1] * l_jam(10.7) * 8) and l_jam(10.7) == 3.07, kj["energi"]  # 10,7 x 0,7457 x 0,75 x 0,38 / 0,74 = 3,073
    # hp tak diketahui -> l_jam null, bbm tidak dikarang
    assert l_jam(None) is None
    # jalan <= selang: portabel_besar mengambil dari unit kelas pertama, jumlah tetap
    rp = KB(R(T(), dict(c, jam=4.0), kd_(air_km=3.0, jalan_km=0.2), None))
    pr = [OP.total([dict(c, jam=4.0)], 3, i) for i in range(3)]
    assert [x["kelas"] for x in rp["pompa"]] == ["tekanan_tinggi", "portabel_besar"] and rp["pompa"][1]["unit"] == [min(math.ceil(x["regu_bara"] - 1e-9), x["pompa"]) for x in pr], rp["pompa"]
    assert "portabel_besar" not in [x["kelas"] for x in kj["pompa"]]
    # air = bara x koef air_bara / T + front x 80 L/m / T; tangki 5.000 L; mobil tangki bila ada jalan
    assert kj["air_l_hari"][1] == round(20 * 200000 / 7 + 2 * 1000 * 80 / 3) and kj["tangki_fleksibel"][1] == math.ceil(kj["air_l_hari"][1] / 5000) and "mobil_tangki" in kj
    # tanpa jalan: tanpa mobil tangki; injeksi memaksa tekanan tinggi walau air dekat
    ri = KB(R(T(), c, kd_(air_km=0.3, jalan_km=None), {"bara": b}))
    assert [x["kelas"] for x in ri["pompa"]] == ["tekanan_tinggi"] and "mobil_tangki" not in ri, ri["pompa"]
    # unit = lebih besar dari operasi dan hitungan air (tabel bersimulasi debit 100 L/menit; HANYA uji, bukan data)
    tbl = [dict(x, debit_kerja_lpm=100) for x in POMPA]
    per = [OP.total([c], 3, s) for s in range(3)]
    o, a, e = pompa_dan_energi(per, c, {"air_km": 3.0, "jalan_km": 1.0, "dekat": False, "sumur_bor": False, "injeksi": False, "T": 3, "gambut": True}, tbl)
    assert o[0]["unit"][1] == max(per[1]["pompa"], math.ceil(a["air_l_hari"][1] / (100 * 60 * 8))) and "yang lebih besar antara operasi.kebutuhan" in o[0]["alasan"], o
    # T9: air bara dibagi T + hari_mopup (7), front dibagi T (3). K0002 nyata: 590 ha x 200.000 / 7 + 27,82 km x 80 / 3 = 17.599.010 L/hari
    k2 = {"id": "K0002", "jenis": "gambut", "ps": 1.0, "wl": [27.819, 54.478, 132.138], "wb": [105.357, 590.0, 2360.0], "bor": [24, 148, 394], "wh": [0, 0, 0],
          "bara": [295, 590, 1180], "front": [27.82, 27.82, 27.82], "kanal": 2.99, "jam": 5.3, "jsum": "akses", "isi": 9.4}
    r2 = R(T(luas=17000), k2, kd_(air_km=3.0), {"bara": b})
    k2t = r2["kebutuhan"]["total"]
    assert k2t["air_l_hari"][1] == 17599010 and math.ceil(17599010 / (265 * 60 * 8)) == 139 and math.ceil(40075200 * 0 + (590 * 200000 / 3 + 27820 * 80 / 3) / (265 * 60 * 8)) == 316, k2t["air_l_hari"]
    ops2 = OP.total([k2], 3, 1)["pompa"]
    assert ops2 == 246 and sum(p["unit"][1] for p in k2t["pompa"]) == max(ops2, 139), (ops2, k2t["pompa"])   # operasi.kebutuhan mendominasi; bukan lagi air yang membengkak 2,33x
    # bingkai: per_ha x luas = total (pembulatan), hari_provinsi, melampaui (personel tengah > 3.000 atau air > 10 juta), rujukan personel
    kb2 = r2["kebutuhan"]
    assert abs(kb2["per_ha"]["personel_hari"][1] * 590 - k2t["personel"][1]) < 590 * 0.005 + 1e-6 and abs(kb2["per_ha"]["air_l"][1] * 590 - k2t["air_l_hari"][1]) < 590 * 0.5 + 1
    assert abs(kb2["per_ha"]["regu_hari"][1] * 590 - k2t["regu"][1]) < 590 * 0.005 + 1e-6 and kb2["per_ha"]["personel_hari_rujukan"] == [45, 149]
    assert kb2["hari_provinsi"] == [round(590 / 271, 1), round(590 / 110, 1)] == [2.2, 5.4] and kb2["dasar"]["luas_ha"] == [295, 590, 1180]
    assert kb2["melampaui_rujukan_lapangan"] is True and "110-271 ha/hari per provinsi" in r2["catatan"] and kb2["pembasah"]["perlu"], (kb2["melampaui_rujukan_lapangan"], r2["catatan"])
    kb3 = KB(R(T(), cm, kd_(air_km=0.3), None))
    assert R(T(), cm, kd_(air_km=0.3), None)["kebutuhan"]["melampaui_rujukan_lapangan"] is False
    assert len(json.dumps(r2, ensure_ascii=False, separators=(",", ":"))) <= AMBANG["maks_huruf"] and k2t["pompa"]
    # rekonsiliasi diteruskan
    assert rekomendasi(T(), cm, kd_(air_km=0.3), None, None, None, KOEF, [], dc, None, None, 0.06)["kebutuhan"]["dasar"]["rekonsiliasi_ha_per_piksel"] == 0.06
    assert rm["kebutuhan"]["total"]["jet_shooter"] is None and rm["kebutuhan"]["energi"]["genset"] is None
    assert R(T(), None, {"air_km": 0.2, "kaki_km": 0.2}, None) is None or R(T(), None, {"air_km": 0.2, "kaki_km": 0.2}, None)["kebutuhan"] is None
    assert kebutuhan({"id": "x"}, "gambut", None, 3) is None
    # batas ukuran 3000 huruf: kebutuhan tetap ada, catatan dipangkas
    besar = {"cara": [{"metode": "darat_selang", "alasan": "x" * 700}, {"metode": "sumur_bor", "alasan": "y" * 700}, {"metode": "injeksi", "alasan": "z" * 700}],
             "alat": ["a" * 100] * 6, "bara_cm": [1, 2, 3], "fre_mj": 1, "kebutuhan": {"regu": [1, 2, 3]}, "catatan": "c" * 900}
    z = muat(besar)
    assert len(json.dumps(z, ensure_ascii=False, separators=(",", ":"))) <= AMBANG["maks_huruf"] and z["cara"][0]["metode"] == "darat_selang" and z["kebutuhan"], len(json.dumps(z))
    # susun: `dibuat` pertama, ambang berstatus, PM2.5 dari udara_kualitas, rekomendasi lama dibuang bila kini kosong
    tg = {"dibuat": dc, "kompleks": [T(prov="62", kab="Seruyan", rekomendasi={"lama": 1}), T(id="K2", prov="62", kab="Seruyan")]}
    ud = {"batas": [15.5, 55.4, 150.4, 250.4], "hari": ["2026-10-20", "2026-10-21"], "kab": [[], [["62", "Seruyan", 400.0, 500, 1, 1]]]}
    s = susun(tg, {"koef": KOEF, "kompleks": [{"id": "K1", "jenis": "mineral", "jam": 9.0, "isi": 5}], "prov": {}}, {"kompleks": {"K1": {"air_km": 5.0, "kaki_km": 8.0}}}, None, None, None, ud)
    assert list(s)[0] == "dibuat" and s["dibuat"] == dc and s["taktik_ambang"]["kg_per_mj"] == {"nilai": 0.368, "status": BV, "sumber": s["taktik_ambang"]["kg_per_mj"]["sumber"]}
    assert "kolom_air_min_mm" not in s["taktik_ambang"] and all({"nilai", "status", "sumber"} <= set(v) for k, v in s["taktik_ambang"].items() if k != "rumus")
    a = s["kompleks"][0]["rekomendasi"]
    assert a != {"lama": 1} and "kemungkinan tidak terbang" in a["catatan"] and "rekomendasi" not in s["kompleks"][1], s
    # akses: jalan terdekat pada geometri sintetis (ruas 112.0-112.1 di lat -3.0, secondary; track di lat -3.01 hanya 112.0-112.02)
    geo = {"features": [{"properties": {"k": 2}, "geometry": {"coordinates": [[[112.0, -3.0], [112.1, -3.0]]]}},
                        {"properties": {"k": 5}, "geometry": {"coordinates": [[[112.0, -3.01], [112.02, -3.01]]]}},
                        {"properties": {"k": 6}, "geometry": {"coordinates": [[[112.05, -3.019], [112.06, -3.019]]]}}]}   # sungai (k 6) bukan jalan: diabaikan
    ix = indeks_jalan(geo)
    j = jalan_terdekat(ix, -3.02, 112.05, 50)
    assert j["kelas"] == "secondary" and j["lat"] == -3.0 and j["lon"] == 112.05 and abs(j["km_garis_lurus"] - 2.21) < 0.02, j   # tegak lurus ke ruas
    j = jalan_terdekat(ix, -3.012, 112.01, 50)
    assert j["kelas"] == "track" and abs(j["km_garis_lurus"] - 0.22) < 0.02, j   # track lebih dekat dari secondary
    j = jalan_terdekat(ix, -3.0, 112.2, 50)
    assert j["lon"] == 112.1 and abs(j["km_garis_lurus"] - 11.12) < 0.1, j   # lewat ujung: titik akhir
    assert jalan_terdekat(ix, -3.0, 113.0, 50) is None and jalan_terdekat(None, -3.0, 112.0, 50) is None and indeks_jalan({"features": []}) is None
    tk = {"id": "K1", "lat": -3.02, "lon": 112.05}
    assert akses_kompleks(tk, None, None, None, None, None) is None   # tanpa data apa pun: null, tidak dikarang
    ac = akses_kompleks(tk, {"jam": None}, {"kaki_km": 6.0, "air_km": 1.31, "jam": None}, {"dari": [{"dari": "A1 Desa X", "jenis": "posko", "km_jalan": 20.0, "jam": 2.5, "kode": "A1"}]}, KOEF, ix)
    assert ac["jalan"]["kelas"] == "secondary" and ac["kaki_km"] == 6.0 and ac["jalan_kaki_jam"] == 1.5 and ac["jam_tiba"] == 2.5, ac
    assert ac["dari"] == {"dari": "A1 Desa X", "jenis": "posko", "km_jalan": 20.0, "jam": 2.5}, ac
    bw = {b["barang"].split(" ")[0]: b for b in ac["bawa"]}
    assert bw["pompa"]["jumlah"] == 1 and bw["selang"]["jumlah"] == 1350 and set(bw) >= {"P3K", "GPS", "parang", "senter", "air"}, bw
    assert not any(b["barang"].startswith("pompa") for b in akses_kompleks(tk, None, {"kaki_km": 0.8}, None, KOEF, ix)["bawa"])   # kaki <= 1 km: tanpa jinjing
    assert akses_kompleks(tk, None, {"kaki_km": 5.0}, None, KOEF, None)["jalan"] is None   # tanpa jalan.geojson: jalan null, bagian lain tetap
    ac0 = akses_kompleks(tk, None, None, None, KOEF, ix)
    assert ac0["kaki_km"] is None and ac0["jalan_kaki_jam"] is None and ac0["bawa"] is None and ac0["jalan"], ac0   # tanpa kaki_km: tak ada bawa/jam
    # susun: akses kunci saudara; rekomendasi tidak membengkak melewati 3.000 huruf karenanya
    s2 = susun(tg, {"koef": KOEF, "kompleks": [{"id": "K1", "jenis": "mineral", "jam": 9.0, "isi": 5}], "prov": {}}, {"kompleks": {"K1": {"air_km": 5.0, "kaki_km": 8.0}}}, None, None, None, ud, ix)
    k1 = s2["kompleks"][0]
    assert k1["akses"]["kaki_km"] == 8.0 and "akses" not in k1["rekomendasi"] and len(json.dumps(k1["rekomendasi"], ensure_ascii=False, separators=(",", ":"))) <= AMBANG["maks_huruf"]
    assert len(json.dumps(k1["akses"], ensure_ascii=False, separators=(",", ":"))) < 1800, "akses terlalu besar"
    # akses.json dicocokkan lewat LOKASI: id tugas (K0950) tak ada di akses.json tapi 1 km dari entri K0001 -> kaki_km terpakai;
    # id sama (K0001) tapi 20 km dari entri -> tidak ditempel; entri tanpa lokasi (berkas lama) diabaikan
    ak_ = {"_meta": {}, "K0001": {"lat": -3.0, "lon": 112.0, "kaki_km": 3.5, "dari": []}, "K0002": {"kaki_km": 9.9, "dari": []}}
    sk = lambda **k: susun({"dibuat": dc, "kompleks": [T(prov="62", kab="Seruyan", **k)]}, None, None, ak_, None, None)["kompleks"][0].get("akses") or {}
    assert sk(id="K0950", lat=-3.009)["kaki_km"] == 3.5, "id berubah, lokasi 1 km: harus cocok"
    assert sk(id="K0001", lat=-3.2).get("kaki_km") is None, "id sama tapi lokasi 20 km: tidak boleh ditempel"
    assert sk(id="K0002").get("kaki_km") == 3.5 and sk(id="K0002", lat=-9.0, lon=100.0).get("kaki_km") is None
    # tanggal WIB: 23:30Z = 06:30 WIB hari berikutnya; 17:00Z = 00:00 WIB
    assert tgl_wib("2026-10-21T23:30:00Z") == "2026-10-22" and tgl_wib("2026-10-21T16:59:00Z") == "2026-10-21" and tgl_wib("2026-10-21T17:00:00Z") == "2026-10-22"
    ud2 = {"batas": [15.5, 55.4, 150.4, 250.4], "hari": ["2026-10-21", "2026-10-22"], "kab": [[], [["62", "Seruyan", 400.0, 500, 1, 1]]]}
    s3 = susun({"dibuat": "2026-10-21T23:30:00Z", "kompleks": [T(prov="62", kab="Seruyan")]}, {"koef": KOEF, "kompleks": [{"id": "K1", "jenis": "mineral", "jam": 9.0, "isi": 5}], "prov": {}}, {"kompleks": {"K1": {"air_km": 5.0, "kaki_km": 8.0}}}, None, None, None, ud2)
    assert "kemungkinan tidak terbang" in s3["kompleks"][0]["rekomendasi"]["catatan"], "PM2.5 hari WIB 22 harus terpakai untuk dibuat 23:30Z tgl 21"
    print("taktik uji: OK")


if __name__ == "__main__":
    uji() if sys.argv[1:] == ["uji"] else main()
