"""Peta karhutla: hotspot, luas terbakar, belum padam, padam per provinsi per hari WIB (tahun berjalan) -> public/data/peta_karhutla.json
(+ luas dan belum per kabupaten -> public/data/peta_karhutla_kab.json, dan keempat metrik per kabupaten/kota + kecamatan -> peta_karhutla_wil.json,
keduanya berdampingan dengan --keluar; ketiga berkas dibawa bersama, satu yang hilang/tak selaras = bangun ulang penuh)

Metode "deck" (sama dengan deck BNPB 21 Okt 2026; rujukan data/laporan-bnpb/satelit-2026-10-21/hitung3.py, hitung_nasional.py, README.md):
- provinsi = wilayah.Wilayah().cari(lon, lat)[0]; hari = hari kalender WIB (UTC+7) dari acq_date + acq_time.
- hot   = LOKASI UNIK per hari WIB menurut scripts/data/titik_unik.py (keputusan pemilik 25 Okt 2026): M, S-NPP, NOAA-20, NOAA-21, keyakinan sedang/tinggi (VIIRS n/h, MODIS >= 30),
  tanpa sel industri; sel kisi titik_unik.sel dihitung sekali per hari, wilayah = deteksi paling awal. Aturannya DIIMPOR, bukan disalin. Sengaja tidak sama dengan SiPongi/GIS BNPB
  (titik mentah semua keyakinan; deck 21 Okt). Tidak ada seri "lokasi" lain: hot sendiri adalah lokasi unik. N21 selalu ikut, jadi pensiun S-NPP (SNPP_AKHIR) tidak mematahkan seri.
- luas  = (n_N20 x F20 + n_N21 x F21) / 2, n_* = titik NOAA-20 / NOAA-21 berkeyakinan n/h; F20 = 4,12 ha, F21 = 4,16 ha per titik (kalibrasi langsung per satelit,
  keputusan pemilik 25 Okt 2026; sumber angka: data/laporan-bnpb/metode-2026-10-25/kalibrasi_noaa.py + kalibrasi_noaa.json = luas resmi BNPB 2019-2025 dibagi
  titik N20 n/h per tahun, median 4,12; N21 2024-2025 median 4,16; uji Jan-Jul 2026 vs SiPongi 202.011 ha: lihat UJI_SIPONGI, cara lama (PORSI x 4,3) +20%).
  SARINGAN: titik di sel sumber panas tetap (titik_palsu.sel_industri(): smelter, tambang, kilang, pembangkit, lepas pantai; kawah tidak) dibuang dari hot
  DAN dari det (luas, belum, padam, dan pengecekan "bertahan"; keputusan pemilik 25 Okt 2026), SAMA dengan yang dipakai kalibrasi_noaa.py untuk faktor, karena faktor dibagi titik tersaring. Tanpa saringan
  10,5% titik N20/N21 n/h Jan-Jul 2026 (12.506 dari 118.545 di dalam batas wilayah, hitungan validasi-model 25 Okt dari viirs_noaa20/21.csv) tercampur panas bukan api lahan dan luas Jan-Jul melonjak ke +26% vs SiPongi. Hanya bd (hitungan celah dan bobot() per pita bujur) tidak disaring.
  Dua satelit dirata-rata (/2). PER PITA BUJUR 5 derajat (bd): di pita tempat satu satelit HILANG (anjlok(): 0 titik n/h sementara satelit lain >= CELAH_MIN titik; lintasan benar-benar
  tak ada) titik pita itu dihitung dari satelit yang ada saja, bobot penuh F20 atau F21 tanpa dibagi 2; belum dan padam memakai bobot pita yang sama. Rasio rendah tetapi bukan nol
  (mis. N21 864 vs N20 6.498 di pita 110E 24 Okt 2026) = tepi sapuan, sebaran normal: tetap /2, bukan celah.
  PORSI (S-NPP : N20+N21, 0,534) TIDAK lagi dipakai luas/belum/padam; hanya deteksi celah S-NPP (celah_hari, CELAH_NAS).
- belum = (bertahan_N20 x F20 + bertahan_N21 x F21) / 2; "bertahan" = titik hari d yang sel 3x3-nya (sel = round(lon/0,003375), round(lat/0,003375)) pernah terdeteksi
  NOAA-20/21 n/h 12-36 jam sebelumnya (kedua satelit dipakai untuk mengecek sel). Cadangan (stok): nilai hari terakhir periode, tidak dijumlahkan.
- padam(d) = bobot yang sama atas titik NOAA-20/21 n/h hari d-2 yang sel 3x3-nya tanpa deteksi NOAA-20/21 n/h pada hari d-1 dan d
  (aturan pemilik: 48 jam tanpa titik = padam). Beda dengan harian.py (72 jam, 168 jam gambut).
- angka dibulatkan SEKALI per provinsi (setengah ke atas); nasional = jumlah angka provinsi.
- kabupaten (public/data/peta_karhutla_kab.json, dari jalan yang sama, hari yang sama): luas dan belum per kabupaten = jumlah titik N20/N21 n/h (dan yang bertahan)
  di kabupaten itu x bobot per satelit di atas, dibulatkan sekali, setengah ke atas, sendiri-sendiri; hanya hari berluas/belum > 0 ditulis ("d": [[indeks_hari, luas, belum], ...]).
  Kunci = kode provinsi + "|" + nama kabupaten fitur public/geo/kabupaten/<prov>.json (sama dengan index.html aturWilayah); nama itu = properti kab
  public/geo/kecamatan/<prov>.json yang dibaca Wilayah.cari(...)[1]; titik di fitur tanpa nama (danau) = "<prov>|(tanpa nama)". Pembulatan terpisah membuat jumlah kabupaten bergeser dari angka provinsi paling banyak
  (m + 1) / 2 ha per hari (m = jumlah kabupaten tercatat di provinsi itu); aturan itu dipaksa periksa_kab. Padam dan hotspot tidak dipecah per kabupaten.
  Berkas kab membawa salinan hari/celah/celah_turunan/patah provinsi dan celah_luas (= celah_turunan: hari yang luas/belum-nya terdampak celah NOAA-20/21;
  dibaca peta_kab.js lewat PetaKarhutla.siapkan, jadi catatan celah tidak muncul untuk hari yang hanya kehilangan S-NPP).
- sumber panas tetap (smelter, tambang, kilang, PLTU; public/data/titik_palsu.json): DISARING dari hot, luas, belum, dan padam (lihat SARINGAN di atas).
  (Paragraf berikut ditulis sebelum 25 Okt 2026 saat saringan belum ada; dampaknya kini dibuang, bukan dilaporkan.)
  Dampaknya kecil nasional (STATIS: ~1% titik) tetapi nyata di kabupaten tertentu (Halmahera Tengah, Cilacap, Kota Cilegon); teks metode menyebutnya. Menyaringnya
  menggeser angka provinsi ~1% dan memutus paritas dengan deck (uji_deck); itu keputusan pemilik.
- celah = hari yang lintasan satelitnya hilang di FIRMS (lihat celah_hari): hotspot hari itu terlalu rendah, TIDAK dikoreksi.
  celah_turunan = hari yang luas/belum/padam-nya mewarisi celah NOAA-20/21 di pita mana pun (hari celah + 2 hari sesudahnya; celah hanya S-NPP tidak menurun karena
  luas/belum/padam tak memakai S-NPP). patah = hari WIB pertama yang hot-nya memuat N21 pengganti S-NPP (seri hot berbeda mulai hari itu).

Sumber: FIRMS area API lewat firms_sumber.py (SP bila ada, selain itu NRT; maks 5 hari/panggilan; ~240 panggilan untuk setahun, batas 5000/10 menit
aman). Antara-kompak per hari UTC di data/raw/peta_karhutla/utc/*.json.gz (di-ignore git): hot per provinsi, hitungan S-NPP/N20/N21 per pita bujur
5 derajat, dan (sel, menit, provinsi, kabupaten, kecamatan, satelit) tiap deteksi N20/N21 n/h (VREK 5; rekaman versi lain diunduh ulang). Tarikan harian hanya mengunduh hari yang belum ada + menghitung ulang JENDELA hari
terakhir; hari lebih tua dibawa dari JSON lama (bilangan bulat), jadi cache kosong di CI tidak apa-apa. Berkas provinsi dan kabupaten dibawa sebagai pasangan:
kab lama yang tak ada atau tak cocok dengan provinsi lama (periksa_kab) membuat bangun ulang penuh (tanpa cache = ~35 menit), jadi keduanya harus dipulihkan bersama.

Pakai:
  python3 scripts/data/peta_karhutla.py            # harian: hari baru + hitung ulang 4 hari terakhir
  python3 scripts/data/peta_karhutla.py --penuh    # bangun ulang 1 Jan..kemarin (cache UTC-hari dipakai ulang bila sudah lewat 12 jam dari akhir harinya)
  python3 scripts/data/peta_karhutla.py --uji      # self-check tanpa jaringan (butuh firms-raw-15-21okt.tar.gz + angka_nasional.json di data/laporan-bnpb)
  python3 scripts/data/peta_karhutla.py --ukur     # ukur porsi/faktor N21 setahun dari cache UTC-hari + JSON terbit (isi konstanta UKUR dari keluarannya)
  python3 scripts/data/peta_karhutla.py --statis   # hitung ulang konstanta STATIS (titik di sel sumber panas tetap, 20 Okt 2026) dari fikstur deck
Opsi: --mulai YYYY-MM-DD  --akhir YYYY-MM-DD  --jendela N  --keluar berkas.json  --cache folder
Butuh FIRMS_MAP_KEY (env atau .env).
"""
import csv, datetime as dt, gzip, io, json, math, os, statistics, sys, tarfile, time
from collections import defaultdict

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import firms
import titik_palsu
import titik_unik
import firms_sumber as FS
from firms_sumber import muat_ketersediaan, sumber_hari, unduh
from wilayah import AKAR, PROVINSI, Wilayah

WIB = dt.timezone(dt.timedelta(hours=7))
UTC = dt.timezone.utc
HARI = dt.timedelta(days=1)
BBOX = firms.BBOX[0]
FAMILI = ("VIIRS_SNPP", "VIIRS_NOAA20", "VIIRS_NOAA21", "MODIS")   # N21 ikut: dipakai luas/belum/padam (hot tidak)
VIIRS = {"N": 0, "N20": 1, "N21": 2}       # satelit VIIRS -> indeks di hitungan pita
HOT = {"N", "N20", "Terra", "Aqua"}        # sensor hitungan utama (tanpa N21)
G = 0.003375                               # sisi sel ~375 m
LEBAR = 8192                               # kemasan sel: round(lon/G) * LEBAR + round(lat/G) + LEBAR/2 (lat/G ada di -3400..1930)
NB = [i * LEBAR + j for i in (-1, 0, 1) for j in (-1, 0, 1)]
# Luas per titik, kalibrasi langsung per satelit (keputusan pemilik 25 Okt 2026). SUMBER: data/laporan-bnpb/metode-2026-10-25/kalibrasi_noaa.py -> kalibrasi_noaa.json
# (F20 = median 2019-2025 luas resmi BNPB / titik N20 n/h tanpa sel sumber panas tetap = 4,12; F21 = median 2024-2025 = 4,16; bulat 2 desimal). Uji: UJI_SIPONGI.
F20, F21 = 4.12, 4.16
FAKTOR = {"N20": F20, "N21": F21}          # ha per titik; tersimpan di JSON terbit ("faktor") dan menjadi kunci baca_lama
# PORSI HANYA untuk deteksi celah S-NPP (celah_hari, CELAH_NAS); TIDAK dipakai luas/belum/padam.
PORSI = 0.5337924177818518                 # S-NPP : N20+N21 (n/h) = median 16-19 Okt 2026 (deck BNPB 21 Okt, angka_nasional.json); KONSTAN
ACUAN = ("2026-10-16", "2026-10-17", "2026-10-18", "2026-10-19")   # hari S-NPP lengkap tempat PORSI diukur (hanya --uji yang memakainya)
SNPP_AKHIR = (FS.SNPP_AKHIR.date().isoformat(), FS.SNPP_AKHIR.hour * 60 + FS.SNPP_AKHIR.minute)   # akuisisi S-NPP terakhir yang didistribusikan FIRMS (tanggal UTC, menit) = 1 Nov 2026 13:00 UTC; diturunkan dari firms_sumber.SNPP_AKHIR (satu-satunya tempat batas ditulis); sesudahnya N21 menggantikan
PATAH = (dt.datetime.fromisoformat(SNPP_AKHIR[0]).replace(tzinfo=UTC) + dt.timedelta(minutes=SNPP_AKHIR[1])).astimezone(WIB).date()   # hari WIB pertama berseri hot baru
# Hasil --ukur (21 Okt 2026, 2026-01-01..2026-10-20, hari tanpa celah): dipakai teks metode supaya angka kalimat tidak diketik tangan.
#   porsi_median/porsi_agregat = rasio S-NPP:N20+N21 (n/h) median harian / jumlah setahun; snpp_n21_* = S-NPP : N21 sedang/tinggi (UTC-hari; p10/p90 harian).
UKUR = {"hari": 264, "porsi_median": 0.5, "porsi_agregat": 0.5085, "snpp_n21_hari": 248, "snpp_n21_median": 1.006, "snpp_n21_agregat": 1.0222,
        "snpp_n21_p10": 0.7771, "snpp_n21_p90": 1.25}
# Hasil --statis (22 Okt 2026, hari WIB 2026-10-20, fikstur deck): titik N20/N21 n/h di Indonesia ("titik") dan yang jatuh di sel sumber panas tetap
# titik_palsu.sel_industri() ("statis"); "bertahan" = yang terdeteksi lagi 12-36 jam sebelumnya (dasar "belum"). Dipakai teks metode; uji_deck membuktikannya.
# Uji Jan-Jul 2026 (25 Okt 2026): jumlah luas nasional hari WIB 1 Jan-31 Jul 2026 vs SiPongi; "lama" = selisih cara lama (titik x PORSI x 4,3). Diisi dari hasil bangun ulang penuh.
UJI_SIPONGI = {"sipongi": 202011, "kita": 219174, "selisih": "8,5", "lama": 20}   # kita = jumlah nasional luas 1 Jan-31 Jul 2026, bangun --penuh 25 Okt 2026 15.34 (+8,5%)
STATIS = {"hari": "2026-10-20", "titik": 12516, "statis": 130, "bertahan": 6158, "bertahan_statis": 117}
JENDELA = 4                               # hari terakhir yang dihitung ulang tiap jalan harian
WARM = 2                                   # hari sebelum hari hitung yang dibutuhkan (belum 36 jam, padam d-2)
LATENSI = dt.timedelta(hours=4)            # NRT terlambat; hari WIB d dianggap lengkap bila sudah (now - 4 jam) > d
TRUST = dt.timedelta(hours=12)             # rekaman cache sah bila ditarik >= 12 jam sesudah hari UTC-nya berakhir
VERSI = 1
VREK = 10                                   # 2: + tn (S-NPP semua keyakinan), h21t (N21 sesudah SNPP_AKHIR); 3: + kn/k (kabupaten tiap deteksi N20/N21 n/h);
                                           # 4: + hk/h21k/h21tk (hot per kecamatan), kw/q (kecamatan tiap deteksi N20/N21 n/h); 5: + s (satelit tiap deteksi N20/N21 n/h: 0 = N20, 1 = N21); 6: deteksi di sel sumber panas tetap (titik_palsu) tidak masuk c/m/p/k/q/kw/s; 7: hot/hk/h21*/tn hanya keyakinan sedang/tinggi (VIIRS n/h, MODIS >= 30); 8: hot/hk/h21*/tn juga membuang sel sumber panas tetap; 9: (dibatalkan); 10: hot = lokasi unik titik_unik (z*), hk/h21k/h21t* dihapus; rekaman versi lain diunduh ulang
VERSI_WIL = 1                              # peta_karhutla_wil.json (kabupaten/kota + kecamatan, jarang)
PITA = 5                                   # derajat bujur per pita deteksi celah
# celah (dikalibrasi pada 293 hari 2026): rasio S-NPP : N20+N21 nasional per hari bergeser +-20% secara alami (p10 0,34, p90 0,61) dan per pita
# bujur lebih liar (0,2-4,6; sapuan tiga satelit tak berhimpit), jadi pita hanya bertanda bila satelitnya NYARIS HILANG, nasional bila < 60% normal.
CELAH_NAS = 0.6                            # S-NPP nasional < 0,6 x (porsi x titik N20+N21)
CELAH_HILANG = 0.1                         # satu satelit di satu pita bujur <= 0,1 x yang diharapkan (S-NPP: porsi x N20+N21; N20/N21: satelit lainnya)
CELAH_MIN = 100                            # titik harapan minimal supaya dinilai (hari api sedikit tak berisik)
JEDA = 0.4                                 # detik antar panggilan FIRMS


def bul(v):
    """Setengah ke atas, sekali (sama dengan ganti.py deck)."""
    return int(math.floor(v + 0.5))


def sel(lon, lat):
    return round(lon / G) * LEBAR + round(lat / G) + LEBAR // 2


def tgl(s):
    return dt.date.fromisoformat(s)


# ---------------------------------------------------------------- rekaman per hari UTC
def baru_rekaman(tarik):
    return {"v": VREK, "tarik": tarik, "h21": {}, "tn": 0, "bd": {}, "c": [], "m": [], "p": [], "k": [], "kn": [], "kw": [], "q": [], "s": [],
            "zla": [], "zlo": [], "zm": [], "zp": [], "zk": [], "zq": [], "zkn": [], "zkw": []}


def wajib(u, ket, acuan=None):
    """Famili yang harus utuh untuk hari UTC u: firms_sumber.wajib(longgar=True). Luas/belum/padam hanya memakai N20/N21; S-NPP hanya untuk lokasi unik (hot) dan celah S-NPP,
    jadi sesudah FS.SNPP_AKHIR (1 Nov 2026 13:00 UTC) S-NPP NRT opsional: tetap diminta untuk hari <= 1 Nov bila FIRMS masih melayani, tetapi galatnya TIDAK menahan hari
    (rekaman `src` S-NPP = None, hari itu `snpp` False, celah S-NPP tak dinilai); tanpa ini satu galat 400 di hari UTC 1 Nov membekukan peta_karhutla.json untuk selamanya.
    Baris NRT hilang dari data_availability atau hari sesudah tanggal batas juga opsional bila NOAA-20 ada; famili lain tak pernah opsional (hari bolong = gagal keras).
    `acuan` = jam patokan (bawaan jam dinding; swa-uji membekukannya)."""
    return FS.wajib(u, ket, FAMILI, longgar=True, acuan=acuan)


def sedang(r):
    """Keyakinan sedang/tinggi (keputusan pemilik 25 Okt 2026): VIIRS n/h, MODIS >= 30. Keyakinan rendah (l, MODIS < 30) tidak dihitung."""
    c = r["confidence"].strip().lower()
    if c in ("n", "h"):
        return True
    if c in ("l", ""):
        return False
    try:
        return float(c) >= 30
    except ValueError:
        return False


def rekam(baris, wil, tarik, industri=None):
    """[(sumber, baris_csv)] -> {tgl_utc: rekaman}. Rekaman:
    z* = TITIK PANAS (lokasi unik, titik_unik.py): per bagian hari UTC (b = menit >= 17:00 UTC = hari WIB berikutnya) deteksi PERTAMA tiap sel kisi titik_unik.sel dari M, N, N20, N21
         berkeyakinan sedang/tinggi (sedang()) tanpa sel industri, berurut menit: zla/zlo lintang/bujur, zm menit UTC, zp provinsi ("" = laut/luar), zk/zq indeks ke zkn (nama kabupaten)
         dan zkw (kunci kecamatan kode|kab|kec); hari_data menggabungkan dua bagian yang membentuk satu hari WIB dan menjatuhkan sel yang sama (deteksi paling awal menang);
    h21/tn = jumlah N21 / S-NPP sedang/tinggi di provinsi (hanya untuk --ukur);
    bd {pita bujur: [N, N20, N21 masing-masing (a, b)]} (n/h, di provinsi, tanpa saringan industri; dasar celah dan bobot()), c/m/p = sel, menit UTC, provinsi (0 = laut/luar) tiap N20/N21 n/h
    tersaring industri, s = satelitnya (0 = N20, 1 = N21), k = indeks ke kn (nama kabupaten terurut; "" = laut/luar atau fitur tanpa nama), q/kw = kecamatan, untuk luas/belum/padam.
    industri = set titik_palsu.sel_industri() (None = tanpa saringan): titik di sel itu tidak masuk z*/h21/tn maupun c/m/p/k/q/kw/s; hanya bd tetap lengkap.
    a/b = bagian hari UTC yang jatuh di hari WIB yang sama / berikutnya (batas 17:00 UTC = 00:00 WIB)."""
    out, memo, tab, kandidat = {}, {}, {}, {}
    for _, r in baris:
        s = r["satellite"]
        if s not in HOT and s not in VIIRS:
            continue
        jam = r["acq_time"].zfill(4)
        m = int(jam[:2]) * 60 + int(jam[2:])
        rec = out.setdefault(r["acq_date"], baru_rekaman(tarik))
        b = int(m >= 1020)
        lon, lat = float(r["longitude"]), float(r["latitude"])
        ind = bool(industri) and titik_palsu.palsu(lat, lon, industri)   # sel sumber panas tetap: tidak dihitung di mana pun (bd tetap lengkap untuk celah)
        ok = sedang(r) and not ind
        idn = memo.get((lon, lat))
        if idn is None:
            w = wil.cari(lon, lat)
            idn = memo[(lon, lat)] = w or ("", None, None)
        prov, kab = idn[0], idn[1] or ""   # fitur tanpa nama kabupaten (danau) -> kab ""
        kk = f"{prov}|{idn[1]}|{idn[2]}" if prov else ""   # kunci kecamatan persis seperti layar: kode|kab|kec
        if ok:
            kandidat.setdefault(r["acq_date"], []).append({"s": "M" if s in ("Terra", "Aqua") else s, "c": 1, "lat": lat, "lon": lon, "m": m, "b": b, "p": prov, "k": kab, "q": kk})
        if s == "N" and prov and ok:
            rec["tn"] += 1
        if s == "N21" and prov and ok:
            rec["h21"].setdefault(prov, [0, 0])[b] += 1
        if s in VIIRS and r["confidence"].lower() in ("n", "h"):
            if s != "N" and not ind:
                rec["c"].append(sel(lon, lat)); rec["m"].append(m); rec["p"].append(int(prov) if prov else 0); rec["k"].append(kab)
                rec["s"].append(int(s == "N21"))
                t = tab.setdefault(r["acq_date"], {})
                rec["q"].append(t.setdefault(kk, len(t)) if kk else -1)
                if kk and len(rec["kw"]) < len(t):
                    rec["kw"].append(kk)
            if prov:
                rec["bd"].setdefault(str(math.floor(lon / PITA) * PITA), [0] * 6)[VIIRS[s] * 2 + b] += 1
        if len(memo) > 200000:
            memo.clear()
    for tg, rec in out.items():
        kn = sorted(set(rec["k"]))   # k: nama kabupaten tiap deteksi -> indeks ke kn (nama unik terurut) supaya rekaman kecil dan tak bergantung urutan berkas wilayah
        ix = {n: i for i, n in enumerate(kn)}
        rec["kn"], rec["k"] = kn, [ix[n] for n in rec["k"]]
        kand = sorted(kandidat.get(tg, []), key=lambda x: x["m"])
        zkn, zkw = {}, {}
        for x in titik_unik.unik(kand, lambda x: x["b"]):   # aturan lokasi unik DIIMPOR dari titik_unik.py, bukan disalin
            rec["zla"].append(x["lat"]); rec["zlo"].append(x["lon"]); rec["zm"].append(x["m"]); rec["zp"].append(x["p"])
            rec["zk"].append(zkn.setdefault(x["k"], len(zkn))); rec["zq"].append(zkw.setdefault(x["q"], len(zkw)))
        rec["zkn"], rec["zkw"] = list(zkn), list(zkw)
    return out


def hari_data(rek, d):
    """Hari WIB d dari rekaman UTC d-1 (>=17:00Z) dan d (<17:00Z): hot {prov: n} = LOKASI UNIK hari itu menurut titik_unik (bagian z* kedua hari UTC digabung berurut waktu, sel yang sama
    sekali, deteksi paling awal menang), hotw {kode|kab|kec: n} sama per kecamatan, bd {pita: [N, N20, N21]}, det [(sel, menit_mutlak, prov)], sat [0 = N20, 1 = N21], kab [nama kabupaten]
    dan detw [kunci kecamatan] sejajar dengan det (untuk luas/belum/padam), snpp (False bila S-NPP tak utuh hari itu: tak didistribusikan, atau hari UTC >= SNPP_AKHIR; celah S-NPP tak dinilai)."""
    hot, bd, det, kab, sat, snpp = defaultdict(int), defaultdict(lambda: [0, 0, 0]), [], [], [], True
    hotw, detw, z = defaultdict(int), [], []
    for u, bagian in ((d - HARI, 1), (d, 0)):
        r = rek[u.isoformat()]
        ada = (r.get("src") or {}).get("VIIRS_SNPP", True) is not None
        snpp = snpp and ada and u.isoformat() < SNPP_AKHIR[0]
        for la, lo, m, p, k, i in zip(r["zla"], r["zlo"], r["zm"], r["zp"], r["zk"], r["zq"]):
            if (m >= 1020) == bool(bagian):
                z.append({"s": "M", "c": 1, "lat": la, "lon": lo, "p": p, "q": r["zkw"][i]})
        for pita, v in r["bd"].items():
            for i in range(3):
                bd[pita][i] += v[2 * i + bagian]
        dasar = u.toordinal() * 1440
        kw, q = r.get("kw", []), r.get("q") or [-1] * len(r["c"])
        for c, m, p, k, i, sa in zip(r["c"], r["m"], r["p"], r["k"], q, r["s"]):
            if (m >= 1020) == bool(bagian):
                det.append((c, dasar + m, str(p) if p else "")); kab.append(r["kn"][k]); sat.append(sa)
                detw.append(kw[i] if i >= 0 else "")
    for x in titik_unik.unik(z, lambda x: 0):   # urutan z = d-1 bagian b=1 lalu d bagian b=0 = urutan waktu; z sudah lolos dihitung() di rekam()
        if x["p"]:
            hot[x["p"]] += 1
            hotw[x["q"]] += 1
    return {"hot": hot, "bd": bd, "det": det, "kab": kab, "sat": sat, "snpp": snpp, "hotw": hotw, "detw": detw}


def bertahan(det, c, t):
    """Ada deteksi di 3x3 sel itu 12-36 jam sebelum t (menit)."""
    return any(t - 2160 <= x <= t - 720 for o in NB for x in det.get(c + o, ()))


NORMAL = [F20 / 2, F21 / 2]


def pita_sel(c):
    """Pita bujur 5 derajat (teks, kunci bd) dari sel c = round(lon/G) * LEBAR + round(lat/G) + LEBAR/2."""
    return str(math.floor((c // LEBAR) * G / PITA) * PITA)


def anjlok(a, b):
    """(a, b) = titik N20, N21 satu pita -> 'N20' / 'N21' bila satelit itu HILANG di pita itu (0 titik n/h sementara satelit lain >= CELAH_MIN titik: lintasan benar-benar tak ada),
    selain itu None. Rasio rendah tetapi bukan nol dianggap tepi sapuan (lintasan bergeser antar hari), bukan celah: sebarannya normal, dan rata-rata /2 meredamnya."""
    if b >= CELAH_MIN and a == 0:
        return "N20"
    if a >= CELAH_MIN and b == 0:
        return "N21"
    return None


def bobot(h):
    """{pita: [bobot N20, bobot N21]} ha per titik untuk hari WIB h. Pita normal: (F20 / 2, F21 / 2). Pita tempat satu satelit hilang (anjlok(): 0 titik n/h): satelit yang ada
    dipakai SAJA dengan bobot penuh ([F20, 0] atau [0, F21]); satelit yang hilang dibobot 0. Pita tanpa catatan (laut/luar) dan pita lain: NORMAL (.get(pita, NORMAL))."""
    out = {}
    for pita, v in h["bd"].items():
        x = anjlok(v[1], v[2])
        out[pita] = [F20, 0.0] if x == "N21" else [0.0, F21] if x == "N20" else NORMAL
    return out


def bw(w, c, s):
    """Bobot ha titik di sel c dari satelit s (0 = N20, 1 = N21) menurut bobot() hari itu."""
    return w.get(pita_sel(c), NORMAL)[s]


def _ha(titik, w):
    """Luas (ha) daftar titik [(sel, menit, satelit)] dengan bobot w = bobot()."""
    return sum(bw(w, c, s) for c, _, s in titik)


def hitung(hd, d, kab=None):
    """hd {tanggal: hari_data} berisi d-2..d. -> {prov: [hot, luas, belum, padam]} (float, belum dibulatkan). Urutan operasi sama dengan hitung3.py.
    luas = jumlah bobot() per satelit atas titik N20/N21 hari d; belum = bobot titik yang bertahan 12-36 jam; padam = bobot titik hari d-2 yang padam (bobot hari d-2).
    kab (dict kosong, opsional) diisi {(prov, kabupaten): [luas, belum]} (float): jumlah bobot titik kabupaten itu (provinsi = jumlah kabupatennya persis;
    pembulatan terpisah, lihat periksa_kab)."""
    h0, h1, h2 = hd[d - 2 * HARI], hd[d - HARI], hd[d]
    det = defaultdict(list)
    for h in (h0, h1, h2):
        for c, t, _ in h["det"]:
            det[c].append(t)
    sepi = {c for h in (h1, h2) for c, _, _ in h["det"]}
    per = lambda h: {k: [(c, t, s) for (c, t, p), s in zip(h["det"], h["sat"]) if p == k] for k in PROVINSI}
    L_, Lp_ = per(h2), per(h0)
    w2, w0 = bobot(h2), bobot(h0)
    out = {}
    for k in PROVINSI:
        L, Lp = L_[k], Lp_[k]
        luas = _ha(L, w2)
        belum = _ha([x for x in L if bertahan(det, x[0], x[1])], w2)
        padam = _ha([x for x in Lp if not any(x[0] + o in sepi for o in NB)], w0)
        out[k] = [h2["hot"].get(k, 0), luas, belum, padam]
    if kab is not None:
        for (c, t, p), s, nama in zip(h2["det"], h2["sat"], h2["kab"]):
            if p:
                v = kab.setdefault((p, nama), [0.0, 0.0])
                v[0] += bw(w2, c, s)
                if bertahan(det, c, t):
                    v[1] += bw(w2, c, s)
    return out


def hitung_wil(hd, d):
    """Seperti hitung() tetapi per kecamatan dan per kabupaten/kota. -> {kunci: [hot, luas, belum, padam]} (float), kunci "kode|kab|kec" dan "kode|kab"
    (persis properties.kunci di layar); hanya wilayah yang punya hot atau deteksi N20/N21 di d atau d-2. Rumus identik dengan hitung(): luas/belum/padam
    per wilayah memakai titik wilayah itu saja, jadi jumlah kecamatan = kabupaten = provinsi sebelum pembulatan."""
    h0, h1, h2 = hd[d - 2 * HARI], hd[d - HARI], hd[d]
    det = defaultdict(list)
    for h in (h0, h1, h2):
        for c, t, _ in h["det"]:
            det[c].append(t)
    sepi = {c for h in (h1, h2) for c, _, _ in h["det"]}
    kab = lambda k: k.rsplit("|", 1)[0]
    def per(h, f):
        g = defaultdict(list)
        for (c, t, _), w, s in zip(h["det"], h["detw"], h["sat"]):
            if w:
                g[f(w)].append((c, t, s))
        return g
    hot = {1: defaultdict(int), 0: defaultdict(int)}
    for w, n in h2["hotw"].items():
        hot[0][w] += n; hot[1][kab(w)] += n
    w2, w0 = bobot(h2), bobot(h0)
    out = {}
    for tingkat, f in ((0, lambda w: w), (1, kab)):
        L_, Lp_ = per(h2, f), per(h0, f)
        for k in set(hot[tingkat]) | set(L_) | set(Lp_):
            L, Lp = L_.get(k, []), Lp_.get(k, [])
            luas = _ha(L, w2)
            belum = _ha([x for x in L if bertahan(det, x[0], x[1])], w2)
            padam = _ha([x for x in Lp if not any(x[0] + o in sepi for o in NB)], w0)
            out[k] = [hot[tingkat].get(k, 0), luas, belum, padam]
    return out


def rasio_snpp(h):
    """Titik S-NPP n/h : titik N20+N21 n/h nasional (di provinsi) hari WIB itu; None bila tak ada N20/N21."""
    n = sum(v[0] for v in h["bd"].values())
    r = sum(v[1] + v[2] for v in h["bd"].values())
    return n / r if r else None


def porsi_acuan(hd_acuan):
    """Median rasio S-NPP/(N20+N21) pada hari acuan {tanggal: hari_data}."""
    rs = [rasio_snpp(h) for h in hd_acuan.values()]
    assert rs and None not in rs, "hari acuan porsi tidak lengkap"
    return statistics.median(rs)


def celah_hari(h, porsi):
    """Alasan celah (list teks, kosong = tak ada) untuk hari WIB. Dua jenis, keduanya hanya dinilai bila titik harapannya >= CELAH_MIN:
    (1) S-NPP nasional < CELAH_NAS x porsi x (N20+N21): bagian besar lintasan S-NPP hilang di FIRMS (mis. 20 Okt 2026, 13 Okt 2026);
    (2) S-NPP nyaris hilang di satu pita bujur 5 derajat (<= CELAH_HILANG x harapan), atau N20/N21 hilang di satu pita (anjlok(): 0 titik sementara satelit lain >= CELAH_MIN): lintasan regional hilang (sapuan satu lintasan ~25 derajat)."""
    pita = sorted(h["bd"].items())
    n, a, b = (sum(v[i] for _, v in pita) for i in range(3))
    alasan = []
    snpp = h.get("snpp", True)
    if snpp and porsi * (a + b) >= CELAH_MIN and n < CELAH_NAS * porsi * (a + b):
        alasan.append(f"S-NPP nasional: {n} dari ~{round(porsi * (a + b))}")
    for nama, (n, a, b) in pita:
        if snpp and porsi * (a + b) >= CELAH_MIN and n <= CELAH_HILANG * porsi * (a + b):
            alasan.append(f"S-NPP {nama}E: {n} dari ~{round(porsi * (a + b))}")
        sat = anjlok(a, b)
        if sat:   # luas/belum/padam di pita ini memakai satelit yang ada saja (bobot())
            alasan.append(f"{sat} {nama}E: {a if sat == 'N20' else b} vs {b if sat == 'N20' else a}")
    return alasan


def celah_menurun(alasan):
    """True bila celah menyangkut NOAA-20/21: luas/belum/padam ikut rendah (celah S-NPP saja hanya menurunkan hot)."""
    return any(not a.startswith("S-NPP") for a in alasan)


# ---------------------------------------------------------------- cache UTC-hari + unduhan
def jalur_rek(cache, u):
    return os.path.join(cache, f"{u.isoformat()}.json.gz")


def muat_rek(cache, u, terima_ulang=False):
    """Rekaman sah atau None (tak ada, rusak, versi lain, atau ditarik < 12 jam sesudah hari UTC-nya berakhir). Rekaman yang S-NPP NRT-nya ADA sumbernya tetapi gagal diunduh
    (`snpp_gagal` == 1; opsional sesudah SNPP_AKHIR, jadi hari tetap sah) dianggap belum sah SEKALI supaya jalan berikutnya mencoba lagi (3 jam kemudian di titik.yml); gagal lagi
    (`snpp_gagal` == 2) = final: S-NPP hilang dari `hot` hari WIB itu (batasan yang diterima; terima_ulang=True memuat rekaman itu apa adanya sebagai cadangan)."""
    try:
        with gzip.open(jalur_rek(cache, u), "rt") as f:
            rec = json.load(f)
        tarik = dt.datetime.fromisoformat(rec["tarik"])
    except (OSError, ValueError, KeyError):
        return None
    akhir_hari = dt.datetime.combine(u + HARI, dt.time(), UTC)
    if rec.get("v") != VREK or tarik < akhir_hari + TRUST:
        return None
    return None if rec.get("snpp_gagal") == 1 and not terima_ulang else rec


def snpp_gagal_lama(cache, u):
    """Hitungan `snpp_gagal` rekaman lama (0 bila tak ada/rusak), untuk menaikkannya bila S-NPP gagal lagi."""
    try:
        with gzip.open(jalur_rek(cache, u), "rt") as f:
            return int(json.load(f).get("snpp_gagal", 0))
    except (OSError, ValueError, TypeError):
        return 0


def simpan_rek(cache, u, rec):
    os.makedirs(cache, exist_ok=True)
    tmp = jalur_rek(cache, u) + ".tmp"
    with gzip.open(tmp, "wt") as f:
        json.dump(rec, f, separators=(",", ":"))
    os.replace(tmp, jalur_rek(cache, u))


def ambil_pelan(url):
    time.sleep(JEDA)
    return firms.ambil(url)


def unduh_hari(hari_utc, kunci, ket, wil, cache, log=print):
    """Unduh hari UTC (list date terurut) per potongan <= 5 hari, simpan tiap hari yang sukses utuh (semua famili). -> set hari yang sukses."""
    sah = set()
    industri, _ = titik_palsu.sel_industri()
    i = 0
    while i < len(hari_utc):
        j = i
        while j + 1 < len(hari_utc) and j - i < 4 and hari_utc[j + 1] - hari_utc[j] == HARI:
            j += 1
        u0, u1 = hari_utc[i], hari_utc[j]
        for coba in range(3):
            tarik = dt.datetime.now(UTC).isoformat(timespec="seconds")
            baris, ok = unduh(u0, u1, kunci, ambil_pelan, BBOX, ket, famili=FAMILI)
            rekaman = rekam(baris, wil, tarik, industri)
            ada = []
            for n in range((u1 - u0).days + 1):
                u = u0 + n * HARI
                if not wajib(u, ket) <= ok.get(u, set()) or u in sah:
                    continue
                rec = rekaman.get(u.isoformat()) or baru_rekaman(tarik)
                rec["src"] = {f: sumber_hari(f, u, ket).rsplit("_", 1)[1] if sumber_hari(f, u, ket) and f in ok.get(u, ()) else None for f in FAMILI}   # None = tak didistribusikan lagi / gagal diunduh dan opsional (S-NPP sesudah SNPP_AKHIR)
                if sumber_hari("VIIRS_SNPP", u, ket) and "VIIRS_SNPP" not in ok.get(u, ()):   # sumber S-NPP ada, tidak terunduh, hari tetap sah (longgar): tandai untuk satu percobaan ulang
                    rec["snpp_gagal"] = snpp_gagal_lama(cache, u) + 1
                simpan_rek(cache, u, rec)
                sah.add(u)
                ada.append(u)
            log(f"unduh {u0}..{u1} percobaan {coba + 1}: {len(ada)}/{(u1 - u0).days + 1} hari utuh, {len(baris)} baris")
            if all(u0 + n * HARI in sah for n in range((u1 - u0).days + 1)):
                break
            time.sleep(20 * (coba + 1))
        i = j + 1
    return sah


# ---------------------------------------------------------------- berkas keluaran
BULAN = ("Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des")


def koma(x, n=3):
    return f"{x:.{n}f}".replace(".", ",")


def ribu(x):
    return f"{x:,}".replace(",", ".")


def metode():
    """Teks metode untuk kaki kartu. Angka kalimat berasal dari konstanta (F20, F21, UJI_SIPONGI, UKUR, CELAH_*), tidak diketik di sini."""
    h = tgl(STATIS["hari"])
    statis = (f"Panas industri (smelter, tambang, kilang, pembangkit) dibuang dari titik panas, luas, belum padam, dan padam; gunung api (kawah) tidak disaring. "
              f"Pada {h.day} {BULAN[h.month - 1]} {h.year}, {koma(100 * STATIS['statis'] / STATIS['titik'], 1)}% titik NOAA-20/21 nasional "
              f"({koma(100 * STATIS['bertahan_statis'] / STATIS['bertahan'], 1)}% dari yang bertahan) berada di sel sumber panas industri; "
              f"daftar selnya diperbarui berkala, jadi hari lama tidak dihitung ulang sampai bangun ulang penuh.")
    return {
        "hot": "Titik panas = lokasi unik per hari kalender WIB: sel kisi sekitar 375 m yang terdeteksi MODIS, VIIRS S-NPP, NOAA-20, atau NOAA-21 berkeyakinan sedang dan tinggi "
               "(VIIRS nominal/tinggi, MODIS 30 ke atas), tiap sel dihitung sekali per hari berapa pun satelit dan lintasannya. Titik berkeyakinan rendah dan titik di sel sumber panas tetap "
               "(smelter, tambang, kilang, pembangkit) tidak dihitung. Angka ini tidak sama dengan SiPongi dan GIS BNPB, yang menghitung titik mentah semua keyakinan.",
        "luas": f"(titik NOAA-20 x {koma(F20, 2)} ha + titik NOAA-21 x {koma(F21, 2)} ha) / 2, titik berkeyakinan nominal/tinggi. Faktor tiap satelit = luas resmi BNPB "
                f"2019–2025 dibagi titik NOAA-20 (median {koma(F20, 2)} ha per titik; NOAA-21 2024–2025: {koma(F21, 2)} ha). Titik di sel sumber panas tetap (smelter, tambang, kilang, pembangkit) dibuang karena faktor dihitung dari titik tersaring (tanpa saringan 10,5% titik Jan–Jul 2026 bukan api lahan). Uji Jan–Jul 2026: jumlah luas nasional "
                f"{ribu(UJI_SIPONGI['kita'])} ha vs SiPongi {ribu(UJI_SIPONGI['sipongi'])} ha (+{UJI_SIPONGI['selisih']}%); cara lama (titik x porsi x 4,3 ha) +{UJI_SIPONGI['lama']}%. Saringan dipilih sesudah uji ini dilihat, jadi angka ini bukan uji luar contoh murni; uji tinggalkan satu tahun 2019–2025 meleset rata-rata 13,5%. "
                f"Di pita bujur 5 derajat tempat satu satelit tidak punya satu titik pun (lintasannya hilang di FIRMS) sementara satelit lain punya {CELAH_MIN} titik atau lebih, titik pita itu dihitung dari satelit yang ada saja, tanpa dibagi 2. "
                f"Faktor dikalibrasi pada jumlah luas harian setahun, jadi deteksi ulang lokasi yang sama lintas hari sudah terserap faktornya.",
        "belum": "Luas titik NOAA-20/21 hari itu (rumus yang sama) yang lokasinya (sel 3x3, sampai 375 m dari titik) sudah terdeteksi 12–36 jam sebelumnya oleh salah satu satelit. "
                 "Cadangan pada hari itu, bukan dijumlahkan antarhari.",
        "padam": "Luas dua hari sebelumnya (rumus yang sama) dari titik yang lokasinya tidak terdeteksi lagi sepanjang dua hari berikutnya (48 jam tanpa titik = padam).",
        "catatan": [
            "Perkiraan dari satelit, bukan luas resmi. Rentang galat 15–40% hanya berasal dari faktor dan sampling; faktor per titik tidak diuji per provinsi, "
            "faktor NOAA-21 baru dari 2 tahun penuh (2024–2025) dan dihitung ulang setelah luas resmi 2026 keluar; angka dapat jauh berbeda dari laporan lapangan BNPB.",
            "Hari bertanda celah: lintasan satelit hilang di FIRMS sehingga hotspot hari itu terlalu rendah; angka tidak dikoreksi. "
            "Celah NOAA-20/21 juga menurunkan luas, belum padam, dan padam pada hari itu dan dua hari sesudahnya (celah_turunan).",
            f"Deteksi celah disetel pada data 2026 sendiri dan belum diuji independen; kehilangan satelit di bawah {100 - CELAH_HILANG * 100:.0f}% per pita bujur "
            f"{PITA}° dan hari berisik (harapan kurang dari {CELAH_MIN} titik) tidak terdeteksi.",
            "Sumber NASA FIRMS: arsip standar (SP) bila tersedia, selain itu NRT; hari-hari NRT dapat bergeser sedikit saat diganti SP.",
            "Aturan padam 48 jam berbeda dengan peta cluster platform (72 jam, 168 jam di gambut kering).",
            f"S-NPP dijadwalkan berhenti didistribusikan FIRMS pada 1 Nov 2026 13.00 UTC. Titik panas memakai lokasi unik empat satelit, jadi NOAA-21 selalu ikut dan berhentinya S-NPP "
            f"tidak mematahkan seri; yang berkurang hanya cakupan tambahan S-NPP. Pada 2026 titik S-NPP sedang/tinggi sekitar {koma(UKUR['snpp_n21_median'], 2)} x titik NOAA-21 "
            f"(median harian {UKUR['snpp_n21_hari']} hari; sebaran harian {koma(UKUR['snpp_n21_p10'], 2)}–{koma(UKUR['snpp_n21_p90'], 2)}); porsi celah S-NPP tidak dihitung ulang.",
            statis,
        ],
    }


def baca_lama(jalur, mulai):
    """JSON lama bila utuh (versi, awal hari, faktor = FAKTOR, 38 provinsi, panjang larik cocok), selain itu None (bangun ulang penuh)."""
    try:
        lama = json.load(open(jalur))
        n = len(lama["hari"])
        assert lama["versi"] == VERSI and lama["hari"][0] == mulai.isoformat() and set(lama["prov"]) == set(PROVINSI)
        assert lama["faktor"] == FAKTOR
        assert (tgl(lama["hari"][-1]) - mulai).days == n - 1
        assert all(len(v[m]) == n for v in lama["prov"].values() for m in ("hot", "luas", "belum", "padam"))
        return lama
    except (OSError, ValueError, KeyError, AssertionError):
        return None


def susun(lama, mulai, awal_hitung, akhir, baru, celah_baru, turunan_baru, cutoff, dibuat):
    """Gabung hari lama (< awal_hitung, dibawa apa adanya) dengan hari baru {tanggal_iso: {prov: [hot, luas, belum, padam]}} (float).
    Angka dibulatkan sekali di sini; nasional = jumlah angka provinsi. turunan_baru = hari yang mewarisi celah NOAA-20/21 (hitungan jendela, termasuk 2 hari
    sebelum awal_hitung); patah = PATAH bila sudah dalam rentang hari."""
    hari = [(mulai + n * HARI).isoformat() for n in range((akhir - mulai).days + 1)]
    n_lama = (awal_hitung - mulai).days
    prov = {}
    for k, nama in PROVINSI.items():
        seri = {m: [] for m in ("hot", "luas", "belum", "padam")}
        for i, t in enumerate(hari):
            if i < n_lama:
                for m in seri:
                    seri[m].append(lama["prov"][k][m][i])
            else:
                for j, m in enumerate(seri):
                    seri[m].append(bul(baru[t][k][j]))
        prov[k] = {"nama": nama, **seri}
    nas = {m: [sum(prov[k][m][i] for k in prov) for i in range(len(hari))] for m in ("hot", "luas", "belum", "padam")}
    celah = sorted({c for c in (lama or {}).get("celah", []) if c < awal_hitung.isoformat()} | set(celah_baru))
    turunan = sorted(({c for c in (lama or {}).get("celah_turunan", []) if c < awal_hitung.isoformat()} | set(turunan_baru)) & set(hari))
    return {"versi": VERSI, "dibuat": dibuat, "cutoff": cutoff, "hari": hari, "faktor": dict(FAKTOR), "metode": metode(),
            "celah": celah, "celah_turunan": turunan, "patah": [],   # S-NPP pensiun tidak lagi mematahkan seri hot (lokasi unik 4 satelit); kunci dipertahankan untuk pembaca lama
            "nasional": nas, "prov": prov}


def periksa(isi):
    """Invarian berkas: larik selaras dengan hari, tak negatif, belum <= luas, nasional = jumlah provinsi, 38 provinsi, hari berurutan."""
    n = len(isi["hari"])
    assert n and [(tgl(isi["hari"][0]) + i * HARI).isoformat() for i in range(n)] == isi["hari"], "hari tidak berurutan"
    assert set(isi["prov"]) == set(PROVINSI) and len(isi["prov"]) == 38, len(isi["prov"])
    for m in ("hot", "luas", "belum", "padam"):
        assert len(isi["nasional"][m]) == n and all(isinstance(x, int) and x >= 0 for x in isi["nasional"][m]), f"nasional {m}"
        for k, v in isi["prov"].items():
            assert len(v[m]) == n and all(isinstance(x, int) and x >= 0 for x in v[m]), f"{k} {m}"
        assert isi["nasional"][m] == [sum(v[m][i] for v in isi["prov"].values()) for i in range(n)], f"nasional != jumlah provinsi ({m})"
    for k, v in isi["prov"].items():
        assert all(b <= a for a, b in zip(v["luas"], v["belum"])), f"belum > luas di {k}"
    assert all(b <= a for a, b in zip(isi["nasional"]["luas"], isi["nasional"]["belum"]))
    assert set(isi["celah"]) <= set(isi["hari"]) and isi["celah"] == sorted(isi["celah"])
    assert set(isi["celah_turunan"]) <= set(isi["hari"]) and isi["celah_turunan"] == sorted(isi["celah_turunan"])
    assert set(isi["patah"]) <= set(isi["hari"]), "patah di luar hari"
    assert set(isi["faktor"]) == set(FAKTOR) and all(isinstance(x, float) and 0 < x < 20 for x in isi["faktor"].values()), f"faktor tak sah: {isi['faktor']}"


# ---------------------------------------------------------------- kabupaten (peta_karhutla_kab.json)
TANPA = "(tanpa nama)"


def kunci_kab(prov, nama):
    """Kunci kabupaten = kunci layar (index.html aturWilayah: kode provinsi + "|" + properti kab fitur public/geo/kabupaten/<prov>.json).
    Titik di fitur tanpa nama (danau; nama kosong) memakai "<prov>|(tanpa nama)" supaya jumlah kabupaten tetap sama dengan provinsi dan nama tidak pernah kosong;
    layar tak punya fiturnya, jadi titik itu tak tergambar di peta kabupaten."""
    return f"{prov}|{nama or TANPA}"


def kunci_geo():
    """Himpunan kunci kabupaten yang dikenal layar (semua fitur public/geo/kabupaten/*.json)."""
    return {kunci_kab(p, f["properties"]["kab"]) for p in PROVINSI
            for f in json.load(open(os.path.join(AKAR, "public/geo/kabupaten", f"{p}.json")))["features"]}


def susun_kab(lama, n_lama, isi, baru):
    """Berkas kabupaten selaras dengan `isi` (berkas provinsi dari susun: hari, faktor, celah, ... disalin). Hari < n_lama dibawa dari `lama` (berkas kab lama atau None),
    hari lain dari baru {tanggal_iso: {(prov, kab): [luas, belum]}} (float dari hitung(), bobot per satelit). Tiap angka dibulatkan sekali, setengah ke atas; hari tanpa luas dan belum tidak ditulis ("d" jarang: [[indeks_hari, luas, belum], ...] urut indeks)."""
    kab = {}
    for key, v in ((lama or {}).get("kab") or {}).items():
        d = [e for e in v["d"] if e[0] < n_lama]
        if d:
            kab[key] = {"nama": v["nama"], "prov": v["prov"], "d": d}
    for i in range(n_lama, len(isi["hari"])):
        for (p, nama), (l, b) in sorted(baru[isi["hari"][i]].items()):
            luas, belum = bul(l), bul(b)
            if luas or belum:
                kab.setdefault(kunci_kab(p, nama), {"nama": nama or TANPA, "prov": p, "d": []})["d"].append([i, luas, belum])
    # celah_luas = celah_turunan: peta_kab.js (siapkan) memakainya untuk luas dan belum; "celah" memuat juga hari S-NPP saja yang tak menyentuh luas/belum (catatan celah palsu)
    return {**{k: isi[k] for k in ("versi", "dibuat", "cutoff", "hari", "faktor", "celah", "celah_turunan", "patah")}, "celah_luas": isi["celah_turunan"], "kab": dict(sorted(kab.items()))}


def periksa_kab(kab, isi, geo=None):
    """Invarian berkas kabupaten terhadap berkas provinsi `isi`; geo = kunci_geo() (bila ada, tiap kunci harus ada di GeoJSON layar).
    (a) hari dan faktor sama; jumlah luas dan jumlah belum kabupaten per provinsi per hari berbeda dari angka provinsi paling banyak (m + 1) / 2 ha, m = jumlah kabupaten
        yang tercatat hari itu di provinsi itu (tiap pembulatan geser <= 0,5 ha, provinsi dibulatkan sekali lagi; titik terkecil min(F20, F21) / 2 > 0,5 ha, jadi kabupaten
        berisi tak pernah hilang karena nol); m = 0 berarti angka provinsi harus 0;
    (b) tiap kunci ada di GeoJSON kabupaten layar (kecuali "<prov>|(tanpa nama)"), nama dan prov cocok dengan kuncinya, nama tak pernah kosong;
    (c) belum <= luas;
    (d) format jarang: "d" daftar [i, luas, belum] bilangan bulat, i naik ketat dalam 0..n-1, luas/belum >= 0, tidak keduanya nol."""
    n = len(isi["hari"])
    assert kab["hari"] == isi["hari"] and kab["faktor"] == isi["faktor"] and kab["versi"] == isi["versi"], "hari/faktor/versi kabupaten beda dari provinsi"
    assert kab.get("celah_luas", isi.get("celah_turunan")) == isi.get("celah_turunan"), "celah_luas kabupaten beda dari celah_turunan provinsi"   # berkas lama tanpa celah_luas boleh
    S = defaultdict(lambda: [0, 0, 0])
    for key, v in kab["kab"].items():
        p, _, nama = key.partition("|")
        assert p in PROVINSI and v["prov"] == p and v["nama"] == nama != "", f"kunci {key!r} tak cocok dengan nama/prov {v['nama']!r}/{v['prov']!r}"
        assert geo is None or nama == TANPA or key in geo, f"kunci {key!r} tak ada di GeoJSON kabupaten layar"
        assert v["d"], f"{key} tanpa hari"
        akhir = -1
        for e in v["d"]:
            assert isinstance(e, list) and len(e) == 3 and all(type(x) is int for x in e), f"{key} entri bukan [i, luas, belum] bulat: {e}"
            i, luas, belum = e
            assert akhir < i < n, f"{key} indeks hari tak naik/di luar hari: {e}"
            assert luas >= 0 and belum >= 0 and (luas or belum), f"{key} {e}: negatif atau nol dua-duanya (harus tak ditulis)"
            assert belum <= luas, f"{key} hari {isi['hari'][i]}: belum {belum} > luas {luas}"
            akhir = i
            s = S[(p, i)]
            s[0] += luas; s[1] += belum; s[2] += 1
    for p in PROVINSI:
        for i in range(n):
            jl, jb, m = S.get((p, i), (0, 0, 0))
            for jumlah, nama in ((jl, "luas"), (jb, "belum")):
                prov = isi["prov"][p][nama][i]
                assert abs(jumlah - prov) <= (m + 1) / 2 + 1e-9, f"{isi['hari'][i]} prov {p} {nama}: jumlah {m} kabupaten {jumlah} vs provinsi {prov} (batas {(m + 1) / 2})"


def baca_lama_kab(jalur, lama):
    """Berkas kab lama bila lolos periksa_kab terhadap berkas provinsi lama (hari, faktor, jumlah), selain itu None (bangun ulang penuh)."""
    try:
        kab = json.load(open(jalur))
        periksa_kab(kab, lama)
        return kab
    except (OSError, ValueError, KeyError, AssertionError):
        return None


def tulis(jalur, isi):
    os.makedirs(os.path.dirname(jalur), exist_ok=True)
    with open(jalur + ".tmp", "w") as f:
        json.dump(isi, f, ensure_ascii=False, separators=(",", ":"))
    os.replace(jalur + ".tmp", jalur)


# ---------------------------------------------------------------- kabupaten/kota + kecamatan (berkas terpisah, jarang)
def jalur_wil(jalur):
    return jalur[:-5] + "_wil.json" if jalur.endswith(".json") else jalur + "_wil.json"


def metode_wil():
    return {"format": "d[kunci] = larik datar, tiap 5 angka = [indeks_hari, hot, luas, belum, padam]; indeks_hari = posisi di hari[] peta_karhutla.json "
                      "(hari0 + indeks). Hanya hari dengan minimal satu angka bukan nol yang ditulis. Kunci kabupaten/kota \"kode|kab\", kecamatan \"kode|kab|kec\" "
                      "(sama dengan properties.kunci di layar).",
            "pembulatan": "Tiap wilayah dibulatkan sekali (setengah ke atas) dari angka desimalnya sendiri, jadi jumlah angka kecamatan dapat berbeda dari angka kabupaten/kota "
                          "dan jumlah kabupaten/kota dari angka provinsi (peta_karhutla.json): hot selalu sama persis; luas, belum, padam beda sekitar 1 per wilayah "
                          "yang dijumlahkan, dan wilayah yang seluruh angkanya membulat ke 0 tidak tertulis. Metode lain sama dengan peta_karhutla.json."}


def baca_lama_wil(jalur, mulai, lama):
    """JSON kab/kec lama bila selaras dengan JSON provinsi lama (versi, hari0, jumlah hari, faktor), selain itu None."""
    try:
        w = json.load(open(jalur))
        assert w["versi"] == VERSI_WIL and w["hari0"] == mulai.isoformat() and w["n"] == len(lama["hari"]) and w["faktor"] == FAKTOR
        return w
    except (OSError, ValueError, KeyError, AssertionError, TypeError):
        return None


def susun_wil(lama_w, mulai, awal_hitung, akhir, baru_w, dibuat):
    """Gabung hari lama (indeks < awal_hitung, dibawa apa adanya) dengan hari baru {tanggal_iso: {kunci: [hot, luas, belum, padam]}} (float) yang dibulatkan sekali."""
    n, n_lama = (akhir - mulai).days + 1, (awal_hitung - mulai).days
    d = {}
    for k, arr in ((lama_w or {}).get("d") or {}).items():
        keep = [x for q in range(0, len(arr), 5) if arr[q] < n_lama for x in arr[q:q + 5]]
        if keep:
            d[k] = keep
    for i in range(n_lama, n):
        for k, v in baru_w[(mulai + i * HARI).isoformat()].items():
            r = [bul(x) for x in v]
            if any(r):
                d.setdefault(k, []).extend([i, *r])
    return {"versi": VERSI_WIL, "dibuat": dibuat, "hari0": mulai.isoformat(), "n": n, "faktor": dict(FAKTOR), "metode": metode_wil(), "d": d}


def periksa_wil(w, isi):
    """Invarian: larik kelipatan 5, indeks naik dalam [0, n), bilangan bulat >= 0, belum <= luas; per hari hot kab = hot prov dan kec = kab persis; luas/belum/padam
    jumlah anak tidak melebihi induk + 0,5 x (jumlah anak + 1) (tiap anak dibulatkan sendiri; anak yang membulat ke 0 tak tertulis jadi batas bawah tak ada)."""
    n = w["n"]
    assert n == len(isi["hari"]) and w["hari0"] == isi["hari"][0] and w["faktor"] == isi["faktor"], "berkas wil tak selaras dengan provinsi"
    anak = defaultdict(lambda: [0, 0, 0, 0, 0])   # (kunci induk, hari) -> [jumlah anak, hot, luas, belum, padam]
    nilai = {}
    for k, arr in w["d"].items():
        parts = k.split("|")
        assert len(parts) in (2, 3) and parts[0] in PROVINSI and len(arr) % 5 == 0 and arr, k
        idx = arr[0::5]
        assert idx == sorted(set(idx)) and 0 <= idx[0] and idx[-1] < n, f"{k}: indeks hari"
        for q in range(0, len(arr), 5):
            v = arr[q + 1:q + 5]
            assert all(isinstance(x, int) and x >= 0 for x in v) and any(v) and v[2] <= v[1], f"{k} hari {arr[q]}: {v}"
            nilai[(k, arr[q])] = v
            a = anak[("|".join(parts[:-1]), arr[q])]
            a[0] += 1
            for j in range(4):
                a[1 + j] += v[j]
    for (induk, i), a in anak.items():
        ref = [isi["prov"][induk][m][i] for m in ("hot", "luas", "belum", "padam")] if "|" not in induk else nilai.get((induk, i), [0, 0, 0, 0])
        assert a[1] == ref[0], f"hot anak != induk di {induk} hari {i}: {a[1]} vs {ref[0]}"
        for j in (1, 2, 3):
            assert a[1 + j] <= ref[j] + 0.5 * (a[0] + 1), f"jumlah anak melebihi induk di {induk} hari {i} metrik {j}: {a[1 + j]} vs {ref[j]}"


# ---------------------------------------------------------------- jalan
def hari_lengkap_terakhir(sekarang):
    """Hari WIB lengkap terakhir: hari sebelum tanggal WIB dari (sekarang - 4 jam)."""
    return (sekarang - LATENSI).astimezone(WIB).date() - HARI


SIANG = (210, 480)                         # menit UTC lintasan siang NOAA-20/21 di atas Indonesia (13.30 waktu setempat = 03.30-08.00 UTC)
SIANG_SIAP = dt.time(9, 30)                # FIRMS NRT terlambat ~3 jam: sesudah 09.30 UTC (16.30 WIB) lintasan siang dianggap sudah lengkap


def siang_masuk(rec):
    """True bila rekaman hari UTC (sebagian) memuat deteksi n/h NOAA-20 DAN NOAA-21 dari lintasan siang."""
    return {s for m, s in zip(rec["m"], rec["s"]) if SIANG[0] <= m <= SIANG[1]} == {0, 1}


def belum_kini(rek, hd, akhir, sekarang, kunci, ket, wil, log=print):
    """Belum padam HARI INI (WIB) per provinsi, rumus sama dengan hitung(). Belum padam adalah stok, jadi layar memakai hari ini begitu kedua lintasan NOAA
    hari ini (malam 01.30 dan siang 13.30 waktu setempat) sudah masuk. Barat dan tengah (< ~127,5 BT) sudah final; Maluku, Malut, dan Papua masih kurang lintasan malam
    penutup hari WIB (15-17 UTC, ~1/3 deteksi timur) sampai hari utuh menggantikannya. Pemilik memilih tetap tampil apa adanya (27 Okt 2026).
    -> {"hari", "dibuat", "prov": {kode: ha}} atau None (belum sore, hari kemarin belum utuh, atau lintasan siang belum ada). Hari UTC ini tidak masuk cache."""
    d = sekarang.astimezone(WIB).date()
    if akhir != d - HARI or sekarang < dt.datetime.combine(d, SIANG_SIAP, UTC):
        return None
    baris, ok = unduh(d, d, kunci, ambil_pelan, BBOX, ket, famili=("VIIRS_NOAA20", "VIIRS_NOAA21"))
    if ok.get(d) != {"VIIRS_NOAA20", "VIIRS_NOAA21"}:
        log(f"peta_karhutla: belum hari ini dilewati, unduhan {d} tak utuh")
        return None
    rec = rekam(baris, wil, sekarang.isoformat(timespec="seconds"), titik_palsu.sel_industri()[0]).get(d.isoformat()) or baru_rekaman(sekarang.isoformat())
    if not siang_masuk(rec):
        log(f"peta_karhutla: belum hari ini dilewati, lintasan siang {d} belum masuk")
        return None
    rec["src"] = {}
    rek = {**rek, d.isoformat(): rec}
    for x in (d - 2 * HARI, d - HARI):
        hd.setdefault(x, hari_data(rek, x))
    hd = {**hd, d: hari_data(rek, d)}
    return {"hari": d.isoformat(), "dibuat": sekarang.astimezone(WIB).isoformat(timespec="minutes"),
            "prov": {k: bul(v[2]) for k, v in hitung(hd, d).items()}}


def bangun(argv, sekarang=None, log=print):
    opsi = {a: argv[i + 1] for i, a in enumerate(argv) if a.startswith("--") and i + 1 < len(argv) and not argv[i + 1].startswith("--")}
    sekarang = sekarang or dt.datetime.now(UTC)
    akhir = tgl(opsi["--akhir"]) if "--akhir" in opsi else hari_lengkap_terakhir(sekarang)
    mulai = tgl(opsi["--mulai"]) if "--mulai" in opsi else dt.date(akhir.year, 1, 1)
    jendela = int(opsi.get("--jendela", JENDELA))
    jalur = opsi.get("--keluar", os.path.join(AKAR, "public/data/peta_karhutla.json"))
    cache = opsi.get("--cache", os.path.join(AKAR, "data/raw/peta_karhutla/utc"))
    jalur_kab = os.path.splitext(jalur)[0] + "_kab.json"
    lama = None if "--penuh" in argv else baca_lama(jalur, mulai)
    lama_kab = baca_lama_kab(jalur_kab, lama) if lama else None
    if lama and not lama_kab:
        log(f"peta_karhutla: {os.path.basename(jalur_kab)} tidak ada/tidak cocok dengan berkas provinsi: bangun ulang penuh")
        lama = None
    jw = jalur_wil(jalur)
    lama_w = baca_lama_wil(jw, mulai, lama) if lama else None
    if lama and not lama_w:
        log("peta_karhutla: berkas kab/kec tak ada atau tak selaras: bangun ulang penuh")
        lama = None
    awal_hitung = mulai if not lama else max(mulai, min(tgl(lama["hari"][-1]), akhir) - (jendela - 1) * HARI)
    log(f"peta_karhutla: {awal_hitung}..{akhir} dihitung ({'penuh' if not lama else 'harian, lama s.d. ' + lama['hari'][-1]})")

    kunci = firms.kunci()
    ket = muat_ketersediaan(kunci, ambil_pelan, famili=("VIIRS_NOAA20", "VIIRS_NOAA21", "MODIS"))   # S-NPP boleh hilang dari daftar sesudah berhenti
    wil = Wilayah()
    perlu = [awal_hitung - (WARM + 1) * HARI + n * HARI for n in range((akhir - awal_hitung).days + WARM + 2)]   # UTC d-3 .. akhir
    rek, kosong = {}, []
    for u in perlu:
        r = muat_rek(cache, u)
        if r is None:
            kosong.append(u)
        else:
            rek[u.isoformat()] = r
    sah = unduh_hari(kosong, kunci, ket, wil, cache, log) if kosong else set()
    for u in sah:
        rek[u.isoformat()] = muat_rek(cache, u, True) or json.load(gzip.open(jalur_rek(cache, u), "rt"))
    for u in kosong:   # percobaan ulang S-NPP gagal total (jaringan): pakai rekaman lama yang bertanda `snpp_gagal`, bukan menghentikan peta
        if u.isoformat() not in rek and muat_rek(cache, u, True):
            rek[u.isoformat()] = muat_rek(cache, u, True)
    hilang = [u.isoformat() for u in perlu if u.isoformat() not in rek]
    if hilang:
        sys.exit(f"peta_karhutla: hari UTC tidak utuh setelah 3 percobaan: {hilang}; berkas lama dibiarkan")

    hd, baru, baru_kab, baru_w, celah_baru, turunan_baru = {}, {}, {}, {}, [], set()
    ambil_hd = lambda d: hd.setdefault(d, hari_data(rek, d))
    porsi = PORSI   # hanya untuk deteksi celah S-NPP; konstanta, tidak dihitung dari data (S-NPP berhenti 1 Nov 2026 dan hari acuan tak ada di cache/CI)
    for g in (awal_hitung - 2 * HARI, awal_hitung - HARI):   # hari sebelum jendela yang bercelah NOAA-20/21 menurunkan hari jendela (belum d+1, padam d..d+2)
        if celah_menurun(celah_hari(ambil_hd(g), porsi)):
            turunan_baru |= {(g + n * HARI).isoformat() for n in range(3) if g + n * HARI <= akhir}
    d = awal_hitung
    while d <= akhir:
        for x in (d - 2 * HARI, d - HARI, d):
            ambil_hd(x)
        baru_kab[d.isoformat()] = {}
        baru[d.isoformat()] = hitung(hd, d, baru_kab[d.isoformat()])
        baru_w[d.isoformat()] = hitung_wil(hd, d)
        alasan = celah_hari(hd[d], porsi)
        if alasan:
            celah_baru.append(d.isoformat())
        if celah_menurun(alasan):
            turunan_baru |= {(d + n * HARI).isoformat() for n in range(3) if d + n * HARI <= akhir}   # luas(d), belum(d..d+2), padam(d..d+2)
        for x in [x for x in hd if x < d - HARI]:
            del hd[x]
        d += HARI
    tarikan = [rek[u.isoformat()]["tarik"] for u in sah]
    cutoff = (dt.datetime.fromisoformat(max(tarikan)).astimezone(WIB).isoformat(timespec="minutes") if tarikan
              else (lama or {}).get("cutoff") or dt.datetime.fromisoformat(max(r["tarik"] for r in rek.values())).astimezone(WIB).isoformat(timespec="minutes"))
    isi = susun(lama, mulai, awal_hitung, akhir, baru, celah_baru, turunan_baru, cutoff, sekarang.astimezone(WIB).isoformat(timespec="minutes"))
    periksa(isi)
    isi_kab = susun_kab(lama_kab, (awal_hitung - mulai).days, isi, baru_kab)
    periksa_kab(isi_kab, isi, kunci_geo())
    isi_w = susun_wil(lama_w, mulai, awal_hitung, akhir, baru_w, isi["dibuat"])
    periksa_wil(isi_w, isi)
    for berkas, muatan in ((jw, isi_w), (jalur_kab, isi_kab), (jalur, isi)):   # provinsi terakhir: bila gagal di tengah, JSON provinsi lama memaksa bangun ulang
        tulis(berkas, muatan)
    if "--akhir" not in opsi:
        try:
            kini = belum_kini(rek, hd, akhir, sekarang, kunci, ket, wil, log)
        except Exception as e:   # tambahan: gagal = layar tetap memakai hari utuh terakhir
            kini = None
            log(f"peta_karhutla: belum hari ini gagal ({type(e).__name__}: {e})")
        if kini:
            tulis(os.path.join(os.path.dirname(jalur), "belum_kini.json"), kini)
            log(f"peta_karhutla: belum hari ini {kini['hari']} = {sum(kini['prov'].values())} ha")
    nas = isi["nasional"]
    log(f"peta_karhutla: {len(isi['hari'])} hari ({isi['hari'][0]}..{isi['hari'][-1]}), faktor N20 {F20} N21 {F21}, celah {len(isi['celah'])} hari ({len(isi['celah_turunan'])} turunan), "
        f"hot {nas['hot'][-1]} luas {nas['luas'][-1]} belum {nas['belum'][-1]} padam {nas['padam'][-1]} pada {isi['hari'][-1]}, cutoff {cutoff}; "
        f"{len(isi_kab['kab'])} kabupaten, {sum(len(v['d']) for v in isi_kab['kab'].values())} entri hari")
    return isi


def ukur(cache, jalur):
    """Ukur dari cache UTC-hari + JSON terbit (daftar hari dan celah) pada hari WIB tanpa celah -> dict untuk konstanta UKUR:
    porsi_median/porsi_agregat = S-NPP : N20+N21 (n/h) median harian / jumlah; snpp_n21_* = S-NPP : N21 sedang/tinggi per hari UTC (hari UTC yang menyentuh
    hari celah dibuang). Hari tanpa rekaman cache dilewati (hari = jumlah yang terpakai)."""
    isi = json.load(open(jalur))
    hari, celah = [tgl(h) for h in isi["hari"]], set(isi["celah"])
    rek = {}
    for u in [hari[0] - HARI] + hari:
        r = muat_rek(cache, u)
        if r:
            rek[u.isoformat()] = r
    rs, ns, rr, n21s, tns = [], 0, 0, [], [0, 0]
    for d in hari:
        if d.isoformat() in celah or (d - HARI).isoformat() not in rek or d.isoformat() not in rek:
            continue
        h = hari_data(rek, d)
        r = rasio_snpp(h)
        if r is not None:
            rs.append(r)
            ns += sum(v[0] for v in h["bd"].values()); rr += sum(v[1] + v[2] for v in h["bd"].values())
    for u in hari:
        if {u.isoformat(), (u + HARI).isoformat()} & celah or u.isoformat() not in rek:
            continue
        n21 = sum(sum(ab) for ab in rek[u.isoformat()]["h21"].values())
        if n21:
            n21s.append(rek[u.isoformat()]["tn"] / n21)
            tns[0] += rek[u.isoformat()]["tn"]; tns[1] += n21
    n21s.sort()
    return {"hari": len(rs), "porsi_median": round(statistics.median(rs), 4), "porsi_agregat": round(ns / rr, 4),
            "snpp_n21_hari": len(n21s), "snpp_n21_median": round(statistics.median(n21s), 4), "snpp_n21_agregat": round(tns[0] / tns[1], 4),
            "snpp_n21_p10": round(n21s[int(0.1 * (len(n21s) - 1))], 4), "snpp_n21_p90": round(n21s[int(0.9 * (len(n21s) - 1))], 4)}


def ukur_statis(baris, wil, hari):
    """[(sumber, baris_csv)] (harus memuat hari UTC hari-1 dan hari-2 untuk jendela belum) -> dict untuk konstanta STATIS pada hari WIB `hari` (date):
    titik = N20/N21 n/h di provinsi mana pun; statis = yang jatuh di sel titik_palsu.sel_industri() (tanpa kawah); bertahan = yang terdeteksi lagi 12-36 jam
    sebelumnya di sel 3x3 (bertahan() yang sama dengan hitung()); bertahan_statis = irisan keduanya."""
    import titik_palsu
    industri, _ = titik_palsu.sel_industri()
    det, titik = defaultdict(list), []
    for _, r in baris:
        if r["satellite"] in ("N20", "N21") and r["confidence"].lower() in ("n", "h"):
            jam = r["acq_time"].zfill(4)
            lon, lat = float(r["longitude"]), float(r["latitude"])
            c, t = sel(lon, lat), tgl(r["acq_date"]).toordinal() * 1440 + int(jam[:2]) * 60 + int(jam[2:])
            det[c].append(t); titik.append((lon, lat, c, t))
    awal = hari.toordinal() * 1440 - 420   # 00:00 WIB = 17:00 UTC hari sebelumnya
    out = {"hari": hari.isoformat(), "titik": 0, "statis": 0, "bertahan": 0, "bertahan_statis": 0}
    for lon, lat, c, t in titik:
        if awal <= t < awal + 1440 and (wil.cari(lon, lat) or ("",))[0]:
            b, s = bertahan(det, c, t), titik_palsu.palsu(lat, lon, industri)
            out["titik"] += 1; out["statis"] += s; out["bertahan"] += b; out["bertahan_statis"] += b and s
    return out


# ---------------------------------------------------------------- uji (tanpa jaringan)
FIKSTUR = os.path.join(AKAR, "data/laporan-bnpb/satelit-2026-10-21")


def baris_deck(jalur_tar):
    """Baca CSV FIRMS per hari UTC dari tarball deck BNPB tanpa mengekstrak -> [(sumber, baris)]."""
    baris = []
    with tarfile.open(jalur_tar) as t:
        for m in t.getmembers():
            if m.isfile() and m.name.endswith(".csv") and not os.path.basename(m.name).startswith("._"):   # "._*" = metadata AppleDouble macOS
                sumber = os.path.basename(m.name).rsplit("-", 1)[0]
                teks = t.extractfile(m).read().decode()
                baris += [(sumber, r) for r in csv.DictReader(io.StringIO(teks))]
    return baris


def uji_sintetis():
    assert [bul(x) for x in (0.4999, 0.5, 1.5, 2.5, 2.4999)] == [0, 1, 2, 3, 2], "pembulatan setengah ke atas"
    assert sel(100 + G, -2) - sel(100, -2) == LEBAR and sel(100, -2 + G) - sel(100, -2) == 1, "sel bertetangga"
    # satu hari UTC sintetis: provinsi 62, titik N20 pada 17:00Z (= 00:00 WIB hari berikutnya) masuk hari berikutnya
    class W:
        def cari(self, lon, lat):
            return ("62", "X", "Y") if lat < 0 else None
    row = lambda sat, jam, lat, conf="n", tgl_="2026-03-10": {"satellite": sat, "acq_date": tgl_, "acq_time": jam, "latitude": str(lat), "longitude": "113.0", "confidence": conf}
    rec = rekam([("s", row("N20", "1659", -2.0)), ("s", row("N20", "1700", -2.0)), ("s", row("N", "0100", -2.0, "l")), ("s", row("N21", "0100", -2.0)),
                 ("s", row("Terra", "0200", -2.0, "37")), ("s", row("N20", "0300", 3.0)), ("s", row("N", "0100", -2.0)),
                 ("s", row("Aqua", "0200", -2.0, "29")), ("s", row("Aqua", "0200", -2.0, "30")), ("s", row("N21", "0100", -2.0, "l"))], W(), "2026-03-11T05:00:00+00:00")["2026-03-10"]
    # TITIK PANAS = lokasi unik (titik_unik): deteksi pertama tiap sel per bagian hari UTC. Sel (-2,0; 113,0): N20 1659 (b0), N21/N/Terra/Aqua 30 (menit 60-120, b0) -> SATU entri (menit 60);
    # N20 1700 (b1) -> satu entri di bagian lain; N20 lintang 3,0 (luar provinsi) -> entri tanpa provinsi. DITOLAK: N 'l', N21 'l', Aqua 29 (keyakinan rendah).
    assert rec["zm"] == [60, 180, 1020] and rec["zp"] == ["62", "", "62"], rec
    assert len(rec["zm"]) < 7, "lokasi unik harus lebih sedikit daripada deteksi mentah sedang/tinggi (7)"
    assert sedang({"confidence": "l"}) is False and sedang({"confidence": "29"}) is False and sedang({"confidence": "30"}) and sedang({"confidence": "80"}) and sedang({"confidence": "N"}) and sedang({"confidence": "h"})
    assert rec["m"] == [1019, 1020, 60, 180] and rec["p"] == [62, 62, 62, 0], rec   # N20 x3 + N21 (n): bahan luas/belum/padam; S-NPP tidak ikut; titik laut p=0 tetap tercatat
    # saringan sel sumber panas tetap: titik di (-2,0; 113,0) dibuang dari z*/c/m/p/k/q/s/tn/h21 tetapi bd (celah) tetap lengkap; titik lain tetap
    ind = rekam([("s", row("N20", "0100", -2.0)), ("s", row("N20", "0200", -2.5)), ("s", row("N21", "0300", -2.0))], W(), "t", {titik_palsu.sel(-2.0, 113.0)})["2026-03-10"]
    assert ind["zm"] == [120] and ind["h21"] == {} and ind["tn"] == 0, ind   # titik di sel industri TIDAK dihitung
    assert ind["m"] == [120] and ind["s"] == [0] and ind["c"] == [sel(113.0, -2.5)] and ind["bd"]["110"] == [0, 0, 2, 0, 1, 0], ind   # bd (celah) tak disaring
    assert rec["s"] == [0, 0, 1, 0], rec["s"]                               # satelit sejajar c/m/p: N20, N20, N21
    assert rec["kn"] == ["", "X"] and rec["k"] == [1, 1, 1, 0], (rec["kn"], rec["k"])   # kabupaten sejajar dengan c/m/p
    assert rec["bd"]["110"] == [1, 0, 1, 1, 1, 0], rec["bd"]             # N n/h a=1; N20 a=1 b=1; N21 a=1  (N 'l' tidak masuk)
    assert rec["h21"] == {"62": [1, 0]} and rec["tn"] == 1, (rec["h21"], rec["tn"])   # hanya --ukur; N 'l' dan N21 'l' tak dihitung
    # hari WIB lintas dua hari UTC: sel yang sama di UTC 03-10 >= 17:00Z dan UTC 03-11 < 17:00Z = SATU lokasi di hari WIB 11 Mar; sel lain dihitung
    lin = rekam([("s", row("N20", "1800", -2.0)), ("s", row("N21", "1810", -2.0)), ("s", row("Terra", "1830", -2.5, "50")), ("s", row("N", "1900", -2.5, "l")),
                 ("s", row("N", "0100", -2.0, "n", "2026-03-11")), ("s", row("M", "0200", -2.0, "n", "2026-03-11")), ("s", row("Aqua", "0300", -2.0, "n", "2026-03-11")),
                 ("s", row("N20", "0400", -2.7, "n", "2026-03-11")), ("s", row("N20", "0500", -2.7, "n", "2026-03-11"))], W(), "t")
    for u_ in lin.values():
        u_["src"] = {f: "NRT" for f in FAMILI}
    hl = hari_data(lin, dt.date(2026, 3, 11))
    assert hl["hot"] == {"62": 3} and hl["hotw"] == {"62|X|Y": 3}, hl["hot"]   # sel -2,0 (N20 dan N21 hari UTC lalu + hari ini sama sel), sel -2,5, sel -2,7
    assert sum(1 for x in rec["zm"]) < 7 and sum(hl["hot"].values()) < 9 - 1, "lokasi unik <= deteksi mentah (N 'l' ditolak, duplikat sel dijatuhkan)"
    assert titik_unik.sel(-2.0, 113.0) == titik_unik.sel(-2.0001, 113.0001), "sel yang dilihat 2 satelit dengan koordinat berbeda sedikit = satu sel (aturan titik_unik)"
    # S-NPP berhenti didistribusikan (dijadwalkan 1 Nov 2026): opsional hanya selama NOAA-20 masih ada; hot (lokasi unik) tak terpengaruh, celah S-NPP tak dinilai
    D = dt.date
    ket = {f + "_NRT": (D(2026, 7, 1), D(2026, 11, 20)) for f in FAMILI}
    ket["VIIRS_SNPP_NRT"] = (D(2026, 7, 1), D(2026, 11, 1))
    assert wajib(D(2026, 11, 1), ket, FS.PRA) == set(FAMILI) and wajib(D(2026, 11, 2), ket, FS.PRA) == set(FAMILI) - {"VIIRS_SNPP"}
    del ket["VIIRS_SNPP_NRT"]                                   # barisnya hilang dari data_availability sesudah berhenti
    assert wajib(D(2026, 11, 2), ket, FS.PRA) == set(FAMILI) - {"VIIRS_SNPP"} and wajib(D(2026, 5, 2), {**ket, "VIIRS_SNPP_SP": (D(2012, 1, 1), D(2026, 6, 30))}, FS.PRA) == set(FAMILI)
    ket["VIIRS_SNPP_NRT"] = (D(2026, 7, 1), D(2026, 11, 1))
    assert wajib(D(2026, 11, 25), ket, FS.PRA) == set(FAMILI), "tak ada famili yang opsional bila semuanya melewati max_date (hari bolong = gagal keras)"
    mk = lambda src: {**baru_rekaman("t"), "src": {"VIIRS_SNPP": src}}
    assert hari_data({"2026-11-02": mk(None), "2026-11-03": mk(None)}, D(2026, 11, 3))["snpp"] is False
    assert hari_data({"2026-10-30": mk("NRT"), "2026-10-31": mk("NRT")}, D(2026, 10, 31))["snpp"] is True
    assert hari_data({"2026-10-31": mk("NRT"), "2026-11-01": mk("NRT")}, D(2026, 11, 1))["snpp"] is False   # hari WIB 1 Nov: S-NPP berhenti 13:00Z, tak lagi utuh
    h = hari_data({"2026-11-01": mk("NRT"), "2026-11-02": mk(None)}, D(2026, 11, 2))
    h["snpp"], h["bd"] = False, {"100": [0, 300, 300]}
    assert celah_hari(h, 0.534) == [], "tanpa S-NPP, celah S-NPP tak dinilai (bukan celah)"
    # belum dan padam: hari d, d-1, d-2 dibuat tangan
    d = dt.date(2026, 3, 10)
    t0 = d.toordinal() * 1440
    c1, c2, c3, c4 = 100000, 200000, 300000, 400000
    # det = [(sel, menit, prov)], sat sejajar (0 = N20, 1 = N21); bd kosong = kedua satelit ada (bobot F/2 masing-masing)
    H = lambda hot, det, sat, bd=None: {"hot": hot, "bd": bd if bd is not None else defaultdict(lambda: [0, 0, 0]), "det": det, "sat": sat}
    h2 = H({"62": 7}, [(c3, t0 + 600, "62"), (c4, t0 + 600, "62"), (c4 + 999999, t0 + 600, "")], [0, 1, 0])        # hari d: N20 di c3, N21 di c4 (prov 62), 1 titik di laut
    h1 = H({}, [(c3 + LEBAR + 1, t0 - 1440 + 600, ""), (c4 + 3 * LEBAR, t0 - 1440 + 600, "")], [1, 0])           # d-1: tetangga c3 (22 jam sebelum d 10:00: sah, satelit lain boleh), c4+3 sel bukan tetangga
    h0 = H({}, [(c1, t0 - 2880 + 600, "62"), (c2, t0 - 2880 + 600, "62")], [1, 0])                                  # d-2: c1 (N21) dan c2 (N20); hanya c1 muncul lagi (sebagai tetangga di d-1)
    h1["det"].append((c1 - LEBAR, t0 - 1440 + 700, "62")); h1["sat"].append(0)
    w20, w21 = F20 / 2, F21 / 2
    r = hitung({d - 2 * HARI: h0, d - HARI: h1, d: h2}, d)["62"]
    assert r[0] == 7 and abs(r[1] - (w20 + w21)) < 1e-9, r                                                  # luas = N20 x F20/2 + N21 x F21/2
    assert abs(r[2] - w20) < 1e-9, r                                                                         # belum: c3 (N20) bertahan, c4 (N21) tidak; c3 dicek oleh deteksi N21 hari d-1
    assert abs(r[3] - w20) < 1e-9, r                                                                         # padam: c1 (N21) muncul lagi di d-1, c2 (N20) tidak -> bobot N20
    assert hitung({d - 2 * HARI: h0, d - HARI: h1, d: h2}, d)["16"] == [0, 0, 0, 0], "provinsi tanpa titik"
    h2["kab"] = ["A", "B", ""]
    kb = {}
    assert hitung({d - 2 * HARI: h0, d - HARI: h1, d: h2}, d, kb)["62"] == r, "kab mengubah hitungan provinsi"
    assert kb.keys() == {("62", "A"), ("62", "B")} and abs(kb[("62", "A")][0] - w20) < 1e-9 and abs(kb[("62", "A")][1] - w20) < 1e-9 \
        and abs(kb[("62", "B")][0] - w21) < 1e-9 and kb[("62", "B")][1] == 0, kb                           # A: c3 N20 bertahan; B: c4 N21 tidak; titik laut tak dihitung
    # satelit anjlok PER PITA BUJUR (bd per pita 5 derajat): pita yang satu satelitnya 0 titik (dan yang lain >= CELAH_MIN) memakai satelit yang ada
    # saja, bobot penuh (F20 / F21, tanpa dibagi 2), satelit yang hilang dibobot 0; pita normal (termasuk rasio rendah tetapi bukan nol = tepi sapuan) tetap /2; pita lain tak terpengaruh. c3, c4 jatuh di pita "0".
    ada = lambda n20, n21, pita="0": {pita: [0, n20, n21]}
    assert bobot(H({}, [], [], ada(CELAH_MIN, 0)))["0"] == [F20, 0.0] and bobot(H({}, [], [], ada(0, CELAH_MIN)))["0"] == [0.0, F21]
    assert bobot(H({}, [], [], ada(CELAH_MIN, 1)))["0"] == NORMAL and bobot(H({}, [], [], ada(CELAH_MIN - 1, 0)))["0"] == NORMAL and bobot(H({}, [], [])) == {}
    assert bobot(H({}, [], [], ada(6498, 864, "110")))["110"] == NORMAL, "24 Okt 2026 pita 110: N21 864 vs N20 6.498 (rasio 0,13) = tepi sapuan, bukan hilang: tetap /2"
    assert bobot(H({}, [], [], ada(7543, 6079, "110")))["110"] == NORMAL and bobot(H({}, [], [], ada(6039, 8513, "110")))["110"] == NORMAL, "22 dan 23 Okt pita 110 normal"
    assert anjlok(1000, 0) == "N21" and anjlok(1000, 1) is None and anjlok(0, 1000) == "N20" and anjlok(50, 0) is None and anjlok(100, 0) == "N21", "hanya 0 titik; pita sepi (< CELAH_MIN) tak dinilai"
    assert pita_sel(sel(113.0, -2.0)) == "110" and pita_sel(sel(109.99, -2.0)) == "105" and pita_sel(sel(141.0, -2.0)) == "140"
    hn = lambda bd: H({"62": 2}, [(c3, t0 + 600, "62"), (c4, t0 + 600, "62")], [0, 0], bd)
    assert abs(hitung({d - 2 * HARI: h0, d - HARI: h1, d: hn(ada(CELAH_MIN, 0))}, d)["62"][1] - 2 * F20) < 1e-9, "N21 hilang di pita: dua titik N20 x F20 penuh"
    assert abs(hitung({d - 2 * HARI: h0, d - HARI: h1, d: hn(ada(CELAH_MIN, 5 * CELAH_MIN))}, d)["62"][1] - 2 * F20 / 2) < 1e-9, "dua satelit ada: dibagi 2"
    assert abs(hitung({d - 2 * HARI: h0, d - HARI: h1, d: hn(ada(CELAH_MIN, 0, "110"))}, d)["62"][1] - 2 * F20 / 2) < 1e-9, "hilang di pita lain: pita ini tetap dibagi 2"
    hs = hn(ada(0, CELAH_MIN)); hs["sat"] = [1, 0]   # N20 hilang di pita ini: titik N20 bobot 0, titik N21 bobot F21 penuh
    assert abs(hitung({d - 2 * HARI: h0, d - HARI: h1, d: hs}, d)["62"][1] - F21) < 1e-9
    # jendela belum tepat 12-36 jam
    det = {c1: [1000]}
    assert bertahan(det, c1 + LEBAR, 1000 + 720) and bertahan(det, c1, 1000 + 2160) and not bertahan(det, c1, 1000 + 719) and not bertahan(det, c1, 1000 + 2161)
    # celah: pita 100E kehilangan S-NPP (5 dari ~160 harapan), pita 115E normal
    h = {"hot": {}, "det": [], "bd": {"100": [5, 150, 150], "115": [160, 150, 150]}}
    al = celah_hari(h, 0.534)
    assert any(a.startswith("S-NPP 100E") for a in al) and not any("115E" in a for a in al), al
    h["bd"]["100"] = [150, 150, 150]
    assert celah_hari(h, 0.534) == [], celah_hari(h, 0.534)                                                  # normal
    h["bd"]["100"] = [80, 150, 150]                                                                          # pita kurang (0,5 x harapan) tapi tidak nyaris hilang: tak bertanda
    assert celah_hari(h, 0.534) == [], celah_hari(h, 0.534)
    h["bd"]["100"] = [2, 10, 12]                                                                             # hari api sedikit (harapan < 100): tak berisik
    assert celah_hari(h, 0.534) == [], celah_hari(h, 0.534)
    assert celah_hari({"bd": {"110": [0, 6498, 864]}, "snpp": False}, 0.534) == [], "24 Okt 2026 pita 110 (rasio 0,13) = tepi sapuan, bukan celah"
    assert celah_hari({"bd": {"110": [0, 6498, 0]}, "snpp": False}, 0.534) == ["N21 110E: 0 vs 6498"], "0 titik N21 sementara N20 6.498 = lintasan hilang"
    assert celah_hari({"bd": {"110": [0, 7543, 6079]}, "snpp": False}, 0.534) == [] and celah_hari({"bd": {"110": [0, 6039, 8513]}, "snpp": False}, 0.534) == [], "22/23 Okt normal"
    h["bd"]["115"] = [160, 150, 0]
    assert any(a.startswith("N21 115E") for a in celah_hari(h, 0.534)), celah_hari(h, 0.534)                  # NOAA-21 hilang (0 titik) di pita 115E
    h["bd"] = {"100": [100, 300, 300], "115": [100, 300, 300]}                                               # nasional: 200 dari harapan ~641 (< 0,6) walau tiap pita ~0,3 (tak nyaris hilang)
    assert celah_hari(h, 0.534) == ["S-NPP nasional: 200 dari ~641"], celah_hari(h, 0.534)
    # susun: hari lama dibawa, hari baru dibulatkan, nasional = jumlah provinsi
    awal = dt.date(2026, 3, 8)
    baru = {t: {k: [1, 1.5, 0.5, 2.5] for k in PROVINSI} for t in ("2026-03-09", "2026-03-10")}
    lama = {"celah": ["2026-03-08", "2026-03-09"], "prov": {k: {"hot": [3, 3], "luas": [9, 9], "belum": [4, 4], "padam": [1, 1]} for k in PROVINSI}}
    isi = susun(lama, awal, dt.date(2026, 3, 9), dt.date(2026, 3, 10), baru, ["2026-03-10"], ["2026-03-07", "2026-03-10"], "c", "d")
    periksa(isi)
    assert isi["faktor"] == FAKTOR and isi["patah"] == [] and isi["celah_turunan"] == ["2026-03-10"], (isi["faktor"], isi["patah"], isi["celah_turunan"])   # 03-07 di luar hari: dibuang
    assert isi["hari"] == ["2026-03-08", "2026-03-09", "2026-03-10"] and isi["prov"]["62"]["luas"] == [9, 2, 2] and isi["prov"]["62"]["padam"] == [1, 3, 3]
    assert isi["nasional"]["luas"] == [9 * 38, 2 * 38, 2 * 38] and isi["celah"] == ["2026-03-08", "2026-03-10"], isi["celah"]   # celah lama >= awal_hitung dihitung ulang
    bad = json.loads(json.dumps(isi)); bad["prov"]["62"]["belum"][1] = 99
    try:
        periksa(bad); raise SystemExit("periksa() harus menolak belum > luas")
    except AssertionError:
        pass
    for f_buruk in ({"N20": 0.0, "N21": 4.36}, {"N20": 4.22, "N21": -1.0}, {"N20": 4.22}, {"N20": 4.22, "N21": 99.0}):   # faktor nol/negatif/hilang/mustahil meloloskan luas serba nol atau gila: harus ditolak
        bad = json.loads(json.dumps(isi)); bad["faktor"] = f_buruk
        try:
            periksa(bad); raise SystemExit(f"periksa() harus menolak faktor {f_buruk}")
        except AssertionError:
            pass
    # baca_lama menolak JSON dengan faktor lain atau berkas bentuk lama ("porsi", tanpa "faktor") dan awal tahun lain, menerima yang sah
    import tempfile
    with tempfile.TemporaryDirectory() as tmp:
        jl = os.path.join(tmp, "lama.json")
        json.dump(isi, open(jl, "w"))
        assert baca_lama(jl, awal) is not None and baca_lama(jl, dt.date(2027, 1, 1)) is None
        json.dump({**isi, "faktor": {"N20": 4.3, "N21": 4.3}}, open(jl, "w"))
        assert baca_lama(jl, awal) is None, "faktor lama beda dari FAKTOR harus ditolak"
        json.dump({k: v for k, v in isi.items() if k != "faktor"} | {"porsi": PORSI}, open(jl, "w"))
        assert baca_lama(jl, awal) is None, "JSON bentuk lama (porsi) harus ditolak: bangun ulang penuh"
    # patah muncul begitu rentang hari memuatnya; celah_turunan hanya dari celah NOAA-20/21
    z = lambda t: {k: [0, 0, 0, 0] for k in PROVINSI}
    ts = [(dt.date(2026, 10, 30) + n * HARI).isoformat() for n in range(4)]
    assert susun(None, dt.date(2026, 10, 30), dt.date(2026, 10, 30), dt.date(2026, 11, 2), {t: z(t) for t in ts}, [], [], "c", "d")["patah"] == [], "S-NPP pensiun tidak mematahkan seri hot (lokasi unik 4 satelit)"
    assert celah_menurun(["N21 100E: 3 vs 300"]) and celah_menurun(["S-NPP nasional: 1 dari ~300", "N20 105E: 1 vs 200"]) and not celah_menurun(["S-NPP 100E: 1 dari ~300"]) and not celah_menurun([])
    # hitung_wil: dua kecamatan di satu kabupaten + satu kabupaten lain; jumlah kec = kab = provinsi (float), kunci persis kode|kab|kec
    kk = ("62|A|x", "62|A|y", "62|B|z")
    Hw = lambda hot, det: {"hot": {}, "hotw": hot, "bd": defaultdict(lambda: [0, 0, 0]), "det": [(c, t, "62") for c, t, _, _ in det], "detw": [w for _, _, w, _ in det], "sat": [s for _, _, _, s in det]}
    g2 = Hw({kk[0]: 3, kk[2]: 1}, [(c3, t0 + 600, kk[0], 0), (c4, t0 + 600, kk[1], 1), (c4 + 5 * LEBAR, t0 + 600, kk[2], 1)])
    g1 = Hw({}, [(c3 + LEBAR + 1, t0 - 1440 + 600, kk[0], 1)])
    g0 = Hw({}, [(c1, t0 - 2880 + 600, kk[0], 0), (c2, t0 - 2880 + 600, kk[2], 1)])
    rw = hitung_wil({d - 2 * HARI: g0, d - HARI: g1, d: g2}, d)
    assert set(rw) == {*kk, "62|A", "62|B"} and abs(rw["62|A|x"][1] - w20) < 1e-9 and rw["62|A|x"][2] == rw["62|A|x"][1] and rw["62|A|y"][2] == 0 and abs(rw["62|A|y"][1] - w21) < 1e-9, rw
    for j in range(4):
        assert abs(rw["62|A"][j] - rw["62|A|x"][j] - rw["62|A|y"][j]) < 1e-9 and abs(rw["62|A"][j] + rw["62|B"][j] - sum(rw[k][j] for k in kk)) < 1e-9, (j, rw)
    assert rw["62|A"][0] == 3 and rw["62|B"][0] == 1 and abs(rw["62|A|x"][3] - w20) < 1e-9 and abs(rw["62|B|z"][3] - w21) < 1e-9, rw   # c1 (N20) dan c2 (N21) tak muncul lagi: keduanya padam, bobot satelit masing-masing
    iw = susun_wil(None, d, d, d + HARI, {d.isoformat(): rw, (d + HARI).isoformat(): {"62|A": [0, 0.4, 0, 0]}}, "x")
    assert iw["d"]["62|A"] == [0, 3, bul(w20 + w21), bul(w20), bul(w20)] and iw["d"]["62|A|y"] == [0, 0, bul(w21), 0, 0] and iw["n"] == 2, iw["d"]   # hari 2 (semua membulat 0) tak tertulis
    # teks metode: angka dari konstanta, tanda baca bertipografi (en dash), tanpa ± (selera pemilik), klaim tak melampaui bukti
    mt = metode()
    teks = json.dumps(mt, ensure_ascii=False)
    assert koma(F20, 2) in mt["luas"] and koma(F21, 2) in mt["luas"] and "SiPongi" in mt["luas"] and "tanpa dibagi 2" in mt["luas"] and "2019–2025" in mt["luas"], mt["luas"]
    assert "NOAA-21 baru dari 2 tahun penuh" in mt["catatan"][0] and "luas resmi 2026 keluar" in mt["catatan"][0], mt["catatan"][0]
    assert "sampai 375 m dari titik" in mt["belum"] and "12–36 jam" in mt["belum"] and "Rentang galat 15–40%" in mt["catatan"][0], (mt["belum"], mt["catatan"][0])
    assert "±" not in teks + json.dumps(metode_wil(), ensure_ascii=False), "± di teks tayang"
    assert not any(x in teks for x in ("+-", "16-19", "12-36", "15-40")), "tanda baca ASCII di teks tayang"
    assert "1,0% titik NOAA-20/21 nasional (1,9% dari yang bertahan)" in mt["catatan"][-1] and "20 Okt 2026" in mt["catatan"][-1] and "gunung api" in mt["catatan"][-1], mt["catatan"][-1]
    assert "setara SiPongi dan GIS BNPB" not in teks and "lokasi unik" in mt["hot"] and "empat satelit" not in mt["hot"] and "tidak sama dengan SiPongi" in mt["hot"] and "tidak dibagi" not in mt["hot"], mt["hot"]
    assert "terserap faktornya" in mt["luas"] and "luas_periode" not in mt, "faktor dikalibrasi pada jumlah harian; seri sel unik dicabut"
    assert "faktor per titik tidak diuji per provinsi" in mt["catatan"][0] and "belum diuji independen" in mt["catatan"][2], mt["catatan"]
    assert hari_lengkap_terakhir(dt.datetime(2026, 10, 21, 14, 20, tzinfo=UTC)) == dt.date(2026, 10, 20)      # jalan 21.20 WIB
    assert hari_lengkap_terakhir(dt.datetime(2026, 10, 20, 19, 0, tzinfo=UTC)) == dt.date(2026, 10, 19)       # 02.00 WIB: NRT 20 Okt belum lengkap
    assert hari_lengkap_terakhir(dt.datetime(2026, 10, 20, 21, 0, tzinfo=UTC)) == dt.date(2026, 10, 20)       # 04.00 WIB


def harus_gagal(fn, ket):
    try:
        fn()
    except AssertionError:
        return
    raise SystemExit(f"periksa_kab() harus menolak: {ket}")


def uji_kab():
    """Berkas kabupaten tanpa jaringan: susun_kab (jarang, bulat, dibawa dari lama), periksa_kab menerima yang sah dan menolak tiap pelanggaran (a)-(d)."""
    d0, titik = dt.date(2026, 3, 8), 2.1   # titik = luas satu titik (angka sembarang dekat F/2; yang diuji pembulatan terpisah)
    pv = lambda kd: {k: [0, sum(n for (p, _), (n, _) in kd.items() if p == k) * titik, sum(nb for (p, _), (_, nb) in kd.items() if p == k) * titik, 0] for k in PROVINSI}
    hari = {"2026-03-08": {("62", "A"): [3, 1], ("62", "B"): [2, 2], ("16", "C"): [1, 0]}, "2026-03-09": {}, "2026-03-10": {("62", "A"): [1, 0], ("62", ""): [1, 1]}}
    isi = susun(None, d0, d0, d0 + 2 * HARI, {t: pv(kd) for t, kd in hari.items()}, [], [], "c", "d")
    fl = lambda kd: {key: [n * titik, nb * titik] for key, (n, nb) in kd.items()}   # kab dari hitung(): [luas, belum] float
    k = susun_kab(None, 0, isi, {t: fl(kd) for t, kd in hari.items()})
    geo = {"62|A", "62|B", "16|C"}
    assert list(k["kab"]) == ["16|C", "62|(tanpa nama)", "62|A", "62|B"], list(k["kab"])                      # terurut; titik tanpa nama kabupaten punya kunci "<prov>|(tanpa nama)"
    import re
    assert all(re.match(r"^\d+\|.", key) for key in k["kab"]), "nama kabupaten tidak pernah kosong: titik di fitur tanpa nama berkunci '<prov>|(tanpa nama)', bukan '<prov>|'"
    assert k["kab"]["62|A"]["d"] == [[0, bul(3 * titik), bul(titik)], [2, bul(titik), 0]] and k["kab"]["62|B"]["d"] == [[0, bul(2 * titik), bul(2 * titik)]], k["kab"]
    assert k["kab"]["62|(tanpa nama)"] == {"nama": TANPA, "prov": "62", "d": [[2, bul(titik), bul(titik)]]} and k["kab"]["16|C"]["d"] == [[0, 2, 0]], k["kab"]
    assert all(e[0] != 1 for v in k["kab"].values() for e in v["d"]), "hari tanpa titik (indeks 1) tak boleh ditulis"
    assert k["hari"] == isi["hari"] and k["faktor"] == FAKTOR and "porsi" not in k and k["celah"] == [] and k["patah"] == [] and k["celah_luas"] == [], k
    periksa_kab(k, isi, geo)
    isi_c = {**isi, "celah": ["2026-03-09", "2026-03-10"], "celah_turunan": ["2026-03-09"]}   # 10 Mar celah S-NPP saja: tak boleh masuk celah_luas
    kc = susun_kab(None, 0, isi_c, {t: fl(kd) for t, kd in hari.items()})
    assert kc["celah_luas"] == ["2026-03-09"] and kc["celah"] == isi_c["celah"], kc
    periksa_kab(kc, isi_c, geo)
    harus_gagal(lambda: periksa_kab({**kc, "celah_luas": isi_c["celah"]}, isi_c, geo), "(a) celah_luas bukan celah_turunan")
    # jumlah 62: A 3 + B 2 titik x 2,1 = 10,5 -> 11 (provinsi) vs 6,3 -> 6 + 4,2 -> 4 = 10 (kabupaten): selisih 1 <= (2 + 1) / 2
    assert isi["prov"]["62"]["luas"][0] == 11 and sum(v["d"][0][1] for key, v in k["kab"].items() if key in ("62|A", "62|B")) == 10
    # inkremental: hari < n_lama dibawa, hari >= n_lama dihitung ulang (entri lamanya dibuang)
    hari2 = {"2026-03-10": {("62", "A"): [2, 1]}}
    isi2 = susun(isi, d0, d0 + 2 * HARI, d0 + 2 * HARI, {t: pv(kd) for t, kd in hari2.items()}, [], [], "c", "d")
    k2 = susun_kab(k, 2, isi2, {t: fl(kd) for t, kd in hari2.items()})
    assert k2["kab"]["62|A"]["d"] == [[0, bul(3 * titik), bul(titik)], [2, bul(2 * titik), bul(titik)]] and "62|(tanpa nama)" not in k2["kab"] and "62|B" in k2["kab"], k2["kab"]
    periksa_kab(k2, isi2, geo)
    import tempfile
    isi3 = json.loads(json.dumps(isi)); isi3["prov"]["62"]["luas"][0] = 100
    with tempfile.TemporaryDirectory() as tmp:
        jk = os.path.join(tmp, "k.json")
        json.dump(k, open(jk, "w"))
        assert baca_lama_kab(jk, isi) is not None and baca_lama_kab(os.path.join(tmp, "tak-ada.json"), isi) is None
        assert baca_lama_kab(jk, isi3) is None, "kab lama harus ditolak bila jumlahnya tak cocok dengan provinsi lama: bangun ulang penuh"
    ubah = lambda f: (lambda: periksa_kab((lambda c: (f(c), c)[1])(json.loads(json.dumps(k))), isi, geo))
    harus_gagal(ubah(lambda c: c["kab"]["62|A"]["d"][0].__setitem__(2, 99)), "(c) belum > luas")
    harus_gagal(ubah(lambda c: c["kab"]["62|A"]["d"][0].__setitem__(1, 40)), "(a) jumlah kabupaten jauh dari provinsi")
    harus_gagal(ubah(lambda c: c["kab"].__setitem__("62|Z", c["kab"].pop("62|B") | {"nama": "Z"})), "(b) kunci tak ada di GeoJSON layar")
    harus_gagal(ubah(lambda c: c["kab"]["62|B"].__setitem__("nama", "A")), "(b) nama tak cocok dengan kunci")
    harus_gagal(ubah(lambda c: c["kab"].__setitem__("62|", c["kab"].pop("62|B") | {"nama": ""})), "(b) kunci bernama kosong")
    harus_gagal(ubah(lambda c: c["kab"]["62|B"]["d"].append([1, 0, 0])), "(d) entri nol dua-duanya (tak jarang)")
    harus_gagal(ubah(lambda c: c["kab"]["62|A"]["d"].insert(0, [2, 1, 0])), "(d) indeks tak naik")
    harus_gagal(ubah(lambda c: c["kab"]["62|B"]["d"].append([3, 1, 0])), "(d) indeks di luar hari")
    harus_gagal(ubah(lambda c: c["kab"]["62|B"]["d"][0].__setitem__(1, 5.0)), "(d) luas bukan bilangan bulat")
    harus_gagal(ubah(lambda c: c["kab"]["62|B"]["d"][0].pop()), "(d) entri bukan tiga angka")
    harus_gagal(ubah(lambda c: c["kab"]["62|B"].__setitem__("d", [])), "(d) kabupaten tanpa hari")
    harus_gagal(ubah(lambda c: c.__setitem__("faktor", {"N20": 4.3, "N21": 4.3})), "(a) faktor beda")
    harus_gagal(ubah(lambda c: c.__setitem__("hari", c["hari"][:2])), "(a) hari beda")
    harus_gagal(ubah(lambda c: c["kab"].pop("62|B")), "(a) kabupaten hilang: jumlah jauh di bawah provinsi")


def uji_geo():
    """Kunci kabupaten = kunci layar: tiap kabupaten bernama di public/geo/kecamatan/<prov>.json (yang dipakai Wilayah.cari) ada di public/geo/kabupaten/<prov>.json
    dan sebaliknya; satu fitur per nama; satu-satunya fitur tanpa nama (danau, kab = null) hanya di berkas kecamatan, jadi titiknya masuk kunci '<prov>|(tanpa nama)'."""
    geo, jumlah = kunci_geo(), 0
    for p in PROVINSI:
        fs = json.load(open(os.path.join(AKAR, "public/geo/kabupaten", f"{p}.json")))["features"]
        kab = {f["properties"]["kab"] for f in fs}
        kec = {f["properties"]["kab"] for f in json.load(open(os.path.join(AKAR, "public/geo/kecamatan", f"{p}.json")))["features"]} - {None}
        assert None not in kab and len(kab) == len(fs), f"{p}: fitur kabupaten tanpa nama atau nama ganda"
        assert kab == kec, f"{p}: nama kabupaten beda antara geo/kabupaten dan geo/kecamatan: {sorted(kab ^ kec)}"
        jumlah += len(kab)
    assert len(geo) == jumlah, (len(geo), jumlah)
    return jumlah


def uji_kini(baris, wil, rek, hd, baru):
    """belum_kini() atas unduhan NOAA-20/21 hari UTC 20 Okt (fikstur) = belum hari utuh 20 Okt per provinsi; sebelum 09.30 UTC atau kemarin belum utuh = None."""
    global unduh
    d, asli = dt.date(2026, 10, 20), unduh
    noaa = [(s, r) for s, r in baris if r["acq_date"] == d.isoformat() and r["satellite"] in ("N20", "N21")]
    unduh = lambda *a, **k: (noaa, {d: {"VIIRS_NOAA20", "VIIRS_NOAA21"}})
    try:
        jalan = lambda jam, akhir=d - HARI: belum_kini(rek, dict(hd), akhir, dt.datetime.combine(d, jam, UTC), "", {}, wil, log=lambda *_: None)
        assert jalan(dt.time(9, 0)) is None and jalan(dt.time(12, 0), d - 2 * HARI) is None, "belum hari ini sebelum lintasan siang lengkap"
        k = jalan(dt.time(12, 0))
        assert k["hari"] == d.isoformat() and k["prov"] == {p: bul(v[2]) for p, v in baru[d.isoformat()].items()}, "belum hari ini != belum hari utuh"
    finally:
        unduh = asli


def uji_deck():
    """(a) 18-20 Okt 2026 sama dengan angka_nasional.json deck untuk 38 provinsi x 4 metrik; (b) invarian; (c) 20 Okt bertanda celah."""
    tar, ref = os.path.join(FIKSTUR, "firms-raw-15-21okt.tar.gz"), os.path.join(FIKSTUR, "angka_nasional.json")
    assert os.path.exists(tar) and os.path.exists(ref), f"fikstur deck tidak ada di {FIKSTUR} (harus di-commit bersama skrip ini)"
    A = json.load(open(ref))
    baris, wil = baris_deck(tar), Wilayah()
    rek = rekam(baris, wil, "2026-10-21T14:41:00+00:00", titik_palsu.sel_industri()[0])
    st = ukur_statis(baris, wil, tgl(STATIS["hari"]))   # angka di teks metode (STATIS) = hitungan atas fikstur
    assert st == STATIS, f"STATIS usang: fikstur memberi {st}, konstanta {STATIS}; jalankan --statis dan salin hasilnya (titik_palsu.json berubah?)"
    assert 0 < st["statis"] < 0.05 * st["titik"], f"sel sumber panas tetap harus ada tetapi kecil: {st}"
    hd = {}
    for i in range(16, 21):
        hd[dt.date(2026, 10, i)] = hari_data(rek, dt.date(2026, 10, i))
    porsi = porsi_acuan({a: hd[tgl(a)] for a in ACUAN})
    assert abs(porsi - A["porsi"]) < 1e-12 and abs(porsi - PORSI) < 1e-12, (porsi, A["porsi"], PORSI)   # konstanta PORSI = median hari acuan = angka deck
    porsi = PORSI   # jalur bangun() memakai konstanta, bukan hasil porsi_acuan (hanya untuk celah S-NPP)
    baru, baru_kab = {}, {}
    for i in (18, 19, 20):
        d = dt.date(2026, 10, i)
        baru_kab[d.isoformat()] = {}
        baru[d.isoformat()] = hitung(hd, d, baru_kab[d.isoformat()])
    uji_kini(baris, wil, rek, hd, baru)
    for i in (18, 19, 20):   # jumlah kecamatan = kabupaten = provinsi sebelum pembulatan, tiap metrik, 38 provinsi
        d = dt.date(2026, 10, i)
        rw, rp = hitung_wil(hd, d), baru[d.isoformat()]
        for tingkat in (2, 1):
            tot = defaultdict(lambda: [0.0] * 4)
            for k, v in rw.items():
                if len(k.split("|")) == tingkat + 1:
                    for j in range(4):
                        tot[k.split("|")[0]][j] += v[j]
            for k, v in rp.items():
                assert all(abs(tot[k][j] - v[j]) < 1e-6 for j in range(4)), (d, tingkat, k, tot[k], v)
    assert len(A["prov"]) == 38
    # hot: keputusan pemilik 25 Okt 2026 = LOKASI UNIK (titik_unik) 4 satelit, sedang/tinggi, tanpa sel industri, jadi BUKAN lagi angka deck (deck = titik mentah semua keyakinan).
    # Pembanding mandiri: hitung ulang dari baris fikstur (tanpa rekam/hari_data) lewat titik_unik.unik berurut waktu; hot harus sama persis, <= deteksi mentah yang lolos saringan sama,
    # dan lebih kecil daripada deteksi mentah itu (sel yang dilihat dua satelit = satu).
    # luas/belum/padam deck memakai rumus lama (titik x PORSI x 4,3), jadi bukan pembanding persis:
    # (1) rumus baru dihitung ulang mandiri dari det/sat dan harus sama; (2) arah terhadap deck: kedua satelit utuh, (F20 + F21) / 4 = 2,07 ha per titik vs PORSI x 4,3 = 2,296 -> rasio ~0,89
    industri = titik_palsu.sel_industri()[0]
    pts = []
    for _, r in baris:
        sen = {"Terra": "M", "Aqua": "M"}.get(r["satellite"], r["satellite"])
        if sen not in titik_unik.SENSOR or not sedang(r) or titik_palsu.palsu(float(r["latitude"]), float(r["longitude"]), industri):
            continue
        jam = r["acq_time"].zfill(4)
        t = dt.datetime.fromisoformat(r["acq_date"]).replace(tzinfo=UTC) + dt.timedelta(hours=int(jam[:2]), minutes=int(jam[2:]))
        w = wil.cari(float(r["longitude"]), float(r["latitude"]))
        pts.append({"s": sen, "c": 1, "lat": float(r["latitude"]), "lon": float(r["longitude"]), "t": t, "wib": t.astimezone(WIB).date().isoformat(), "p": w[0] if w else ""})
    pts.sort(key=lambda x: x["t"])
    mandiri_hot, mentah = defaultdict(int), defaultdict(int)
    for x in pts:
        if x["p"]:
            mentah[(x["wib"], x["p"])] += 1
    for x in titik_unik.unik(pts, lambda x: x["wib"]):
        if x["p"]:
            mandiri_hot[(x["wib"], x["p"])] += 1
    assert sum(mandiri_hot.values()) < sum(mentah.values()), "lokasi unik harus lebih sedikit daripada deteksi mentah (sel yang dilihat dua satelit = satu)"
    selisih = 0
    salah = []
    for t in ("2026-10-18", "2026-10-19", "2026-10-20"):
        d = tgl(t)
        for k, v in A["prov"].items():
            ref_v, hasil, mand = bul(v["hot"][A["hari"].index(t)]), bul(baru[t][k][0]), mandiri_hot[(t, k)]
            if hasil != mand:
                salah.append(f"{t} {k} hot: mandiri sedang/tinggi {mand} != {hasil}")
            if hasil > mentah[(t, k)]:
                salah.append(f"{t} {k} lokasi unik {hasil} > deteksi mentah {mentah[(t, k)]}")
            selisih += ref_v - hasil   # selisih terhadap deck (informasi saja: deck titik mentah 3 satelit semua keyakinan)
        assert all((v == NORMAL) == (anjlok(hd[x]["bd"][k][1], hd[x]["bd"][k][2]) is None) for x in (d, d - 2 * HARI) for k, v in bobot(hd[x]).items()), f"{t}: bobot per pita menyimpang dari anjlok()"
        mandiri, W = defaultdict(float), bobot(hd[d])   # luas mandiri dari det/sat dengan bobot per pita (pita anjlok: satelit yang ada saja)
        for (c, m, p), sa in zip(hd[d]["det"], hd[d]["sat"]):
            mandiri[p] += W.get(pita_sel(c), NORMAL)[sa]
        for k, v in mandiri.items():
            if k:
                assert abs(baru[t][k][1] - v) < 1e-6, (t, k, baru[t][k][1], v)
        nas_baru = sum(v[1] for v in baru[t].values())
        nas_deck = sum(v["luas"][A["hari"].index(t)] for v in A["prov"].values())
        assert 0.82 < nas_baru / nas_deck < 0.95, f"{t}: luas nasional baru {nas_baru:.0f} vs deck {nas_deck:.0f} (rasio {nas_baru / nas_deck:.3f}, harapan ~0,88: bobot 2,07 vs 2,30 ha per titik, minus ~1% titik industri)"
        for k, v in baru[t].items():
            assert v[2] <= v[1] + 1e-9, (t, k, v)
    assert not salah, f"{len(salah)} hot salah, mis. {salah[:5]}"
    # (b) invarian lewat susun()+periksa() pada tiga hari itu
    awal = dt.date(2026, 10, 18)
    isi = susun(None, awal, awal, dt.date(2026, 10, 20), baru, [], [], "c", "d")
    periksa(isi)
    # (b') kabupaten dari data nyata: (a) jumlah = provinsi, (b) kunci ada di GeoJSON layar, (c) belum <= luas, (d) format jarang; tak ada titik yang jatuh di fitur tanpa nama
    kab = susun_kab(None, 0, isi, baru_kab)
    periksa_kab(kab, isi, kunci_geo())
    assert kab["kab"] and not any(key.endswith("|" + TANPA) for key in kab["kab"]), [key for key in kab["kab"] if key.endswith("|" + TANPA)]
    # (c) celah: 20 Okt (lintasan siang S-NPP hilang) bertanda, hari acuan 16-19 Okt tidak
    c = {i: celah_hari(hd[dt.date(2026, 10, i)], porsi) for i in range(16, 21)}
    assert c[20], f"20 Okt 2026 harus bertanda celah: {c[20]}"
    assert not any(x.startswith("S-NPP") for i in range(16, 20) for x in c[i]), f"hari acuan porsi tak boleh bertanda celah S-NPP: {c}"   # celah pita N20/N21 (17 Okt 130E, 19 Okt 100E) tidak mengganggu porsi
    return isi, porsi, c[20], kab


def uji_tahun_baru():
    """Jalur bangun() tanpa jaringan: tahun baru (mulai 2027-01-01) dengan JSON 2026 di jalur keluaran, rekaman Okt 2026 tak ada, S-NPP berhenti
    -> luas tetap dari FAKTOR (tidak KeyError, tidak nol), JSON 2026 tidak dipakai, hot memuat N21 pengganti."""
    import tempfile
    class W:
        def cari(self, lon, lat):
            return ("62", "X", "Y")
    row = lambda sat, jam, lon, conf="n": {"satellite": sat, "acq_date": "", "acq_time": jam, "latitude": "-2.0", "longitude": str(lon), "confidence": conf}
    with tempfile.TemporaryDirectory() as tmp:
        cache, jalur = os.path.join(tmp, "utc"), os.path.join(tmp, "x.json")
        for n in range(-3, 4):   # UTC 2026-12-29 .. 2027-01-03
            u = dt.date(2027, 1, 1) + n * HARI
            baris = [("s", {**row(sat, jam, lon), "acq_date": u.isoformat()}) for sat, jam, lon in
                     (("N20", "0600", 113.0), ("N20", "0600", 113.5), ("N20", "1800", 113.0), ("N21", "0610", 113.0), ("N21", "1810", 114.0), ("Terra", "0300", 113.0))]
            rec = rekam(baris, W(), "2027-01-10T00:00:00+00:00")[u.isoformat()]
            rec["src"] = {f: None if f == "VIIRS_SNPP" else "NRT" for f in FAMILI}     # S-NPP tak didistribusikan
            simpan_rek(cache, u, rec)
        json.dump({"versi": VERSI, "hari": ["2026-01-01", "2026-01-02"], "faktor": dict(FAKTOR), "prov": {}}, open(jalur, "w"))   # JSON 2026 basi di jalur keluaran
        asli = (globals()["muat_ketersediaan"], globals()["Wilayah"], firms.kunci, globals()["kunci_geo"])
        globals()["muat_ketersediaan"], globals()["Wilayah"], firms.kunci, globals()["kunci_geo"] = (lambda *a, **k: {}), W, (lambda: "K"), (lambda: {"62|X"})
        try:
            isi = bangun(["--mulai", "2027-01-01", "--akhir", "2027-01-03", "--keluar", jalur, "--cache", cache], sekarang=dt.datetime(2027, 1, 4, 12, tzinfo=UTC), log=lambda *_: None)
            kab = json.load(open(os.path.join(tmp, "x_kab.json")))   # berkas kabupaten ditulis berdampingan: <keluar>_kab.json
            iw = json.load(open(jalur_wil(jalur)))
        finally:
            globals()["muat_ketersediaan"], globals()["Wilayah"], firms.kunci, globals()["kunci_geo"] = asli
    assert list(kab["kab"]) == ["62|X"] and [e[0] for e in kab["kab"]["62|X"]["d"]] == [0, 1, 2] and kab["hari"] == isi["hari"], kab["kab"]
    assert [e[1] for e in kab["kab"]["62|X"]["d"]] == isi["nasional"]["luas"], "satu kabupaten = seluruh provinsi"
    assert set(iw["d"]) == {"62|X", "62|X|Y"} and iw["d"]["62|X|Y"] == iw["d"]["62|X"] and iw["d"]["62|X"][1] == 3 and len(iw["d"]["62|X"]) == 15, iw["d"]
    assert isi["hari"] == ["2027-01-01", "2027-01-02", "2027-01-03"] and isi["faktor"] == FAKTOR and isi["patah"] == [], isi["hari"]
    # tiap hari UTC: N20 2 (a) + 1 (b), N21 1 (a) + 1 (b), Terra 1 (a); hari WIB = b hari UTC sebelumnya + a hari UTC itu
    assert isi["nasional"]["hot"] == [3, 3, 3], isi["nasional"]["hot"]                   # lokasi unik: sel 113,0 (Terra+N20+N21 satu), 113,5, 114,0
    luas = bul((3 * F20 + 2 * F21) / 2)   # 3 titik N20 + 2 titik N21 n/h per hari WIB (kedua satelit ada tapi < CELAH_MIN: dibagi 2)
    assert isi["nasional"]["luas"] == [luas] * 3 and luas > 0, isi["nasional"]["luas"]


def uji_terbit():
    """Pasangan terbit public/data/peta_karhutla.json + peta_karhutla_kab.json (bila keduanya ada): (a)-(e) atas data nyata setahun, bukan hanya fikstur 18-20 Okt.
    (a) jumlah kabupaten = provinsi per hari, (b) tiap kunci ada di GeoJSON kabupaten layar, (c) belum <= luas, (d) format jarang, (e) hari/porsi/versi sama;
    plus satu jalan: dibuat/cutoff/celah/celah_turunan/patah sama (pasangan dari jalan yang sama; langkah pemulihan data.yml memakai `dibuat`). -> (n_kab, n_entri, n_hari) atau None."""
    jp, jk = (os.path.join(AKAR, "public/data", n) for n in ("peta_karhutla.json", "peta_karhutla_kab.json"))
    if not (os.path.exists(jp) and os.path.exists(jk)):
        return None
    P, K = json.load(open(jp)), json.load(open(jk))
    periksa(P)
    periksa_kab(K, P, kunci_geo())
    assert K["hari"] == P["hari"] and K.get("celah_luas", P["celah_turunan"]) == P["celah_turunan"], "hari/celah_luas terbit beda"
    beda = [k for k in ("dibuat", "cutoff", "celah", "celah_turunan", "patah") if K[k] != P[k]]
    assert not beda, f"pasangan terbit dari jalan berbeda: {beda} (jalankan peta_karhutla.py; data.yml memulihkan keduanya bersama)"
    return len(K["kab"]), sum(len(v["d"]) for v in K["kab"].values()), len(K["hari"])


def uji_snpp_berhenti():
    """unduh_hari + hari_data saat S-NPP berhenti: (a) CSV kepala saja, (b) galat, (c) baris NRT hilang dari data_availability; jam FS dibekukan sebelum/sesudah SNPP_AKHIR."""
    import contextlib, tempfile
    D = dt.date
    HDR = "latitude,longitude,acq_date,acq_time,satellite,confidence\n"
    SAT = {"VIIRS_SNPP": "N", "VIIRS_NOAA20": "N20", "VIIRS_NOAA21": "N21", "MODIS": "Terra"}
    class W:
        def cari(self, lon, lat):
            return ("62", "X", "Y")
    ket0 = {f + "_NRT": (D(2026, 7, 1), D(2026, 12, 31)) for f in FAMILI}
    ket0["VIIRS_SNPP_NRT"] = (D(2026, 7, 1), D(2026, 11, 1))     # (a)/(b): barisnya masih tercantum
    ket_c = {k: v for k, v in ket0.items() if k != "VIIRS_SNPP_NRT"}   # (c): barisnya dihapus
    def pabrik(mode):
        urls = []
        def ambil(u):
            urls.append(u)
            fam = u.split("/")[-4].rsplit("_", 1)[0]
            if fam == "VIIRS_SNPP" and mode == "a":
                return HDR
            if fam == "VIIRS_SNPP" and mode == "b":
                raise RuntimeError("HTTP Error 400: Bad Request")
            d0, n = D.fromisoformat(u.split("/")[-1]), int(u.split("/")[-2])
            return HDR + "".join(f"-2.0,{113.0 + k * 0.1},{d0 + dt.timedelta(days=k)},0100,{SAT[fam]},{'60' if fam == 'MODIS' else 'n'}\n" for k in range(n))
        return ambil, urls
    asli = (globals()["ambil_pelan"], time.sleep)
    err = io.StringIO()
    try:
        time.sleep = lambda x: None
        for mode, ket in (("0", ket0), ("a", ket0), ("b", ket0), ("0", ket_c), ("b", ket_c)):
            FS._SEKARANG = FS.SESUDAH
            ambil, urls = pabrik(mode)
            globals()["ambil_pelan"] = ambil
            with tempfile.TemporaryDirectory() as cache, contextlib.redirect_stderr(err):
                hari = [D(2026, 10, 31), D(2026, 11, 1), D(2026, 11, 2), D(2026, 11, 3)]
                sah = unduh_hari(hari, "K", ket, W(), cache, lambda *_: None)
                assert sah == set(hari), (mode, sah)
                sn = [u for u in urls if "VIIRS_SNPP" in u]
                if ket is ket_c:
                    assert not sn, (mode, "baris NRT S-NPP hilang dari data_availability: tak ada sumber, tak diminta")
                else:   # hari <= 1 Nov TETAP diminta (satu blok 31 Okt + 1 Nov), hari sesudahnya tidak
                    assert len(sn) == 1 and sn[0].endswith("/2/2026-10-31"), (mode, sn)
                rek = {u.isoformat(): muat_rek(cache, u + dt.timedelta(days=0)) or json.load(gzip.open(jalur_rek(cache, u), "rt")) for u in hari}
                assert all(r["src"]["VIIRS_NOAA20"] == "NRT" for r in rek.values()), (mode, [r["src"] for r in rek.values()])
                dapat = mode in ("0", "a") and ket is ket0   # S-NPP NRT diunduh (kepala saja pun diunduh); galat / baris hilang = None, hari TETAP sah (longgar)
                assert [rek[x]["src"]["VIIRS_SNPP"] for x in ("2026-10-31", "2026-11-01", "2026-11-02", "2026-11-03")] == (["NRT", "NRT", None, None] if dapat else [None] * 4), (mode, [r["src"] for r in rek.values()])
                h = hari_data(rek, D(2026, 11, 3))
                assert h["snpp"] is False and sum(h["hot"].values()) > 0, "tanpa S-NPP: celah S-NPP tak dinilai, N20/N21/M tetap menghitung"
        # galat S-NPP NRT sesudah batas: hari tetap sah, tetapi diberi SATU kesempatan ulang pada jalan berikutnya (snpp_gagal 1 -> belum sah; 2 = final)
        FS._SEKARANG = FS.SESUDAH
        def tua(cache, hari):   # tarik rekaman dibuat > 12 jam sesudah harinya (jam dinding uji sebelum 1 Nov, jadi rekaman baru selalu "terlalu baru")
            for u in hari:
                r = json.load(gzip.open(jalur_rek(cache, u), "rt")); r["tarik"] = "2026-11-05T00:00:00+00:00"; simpan_rek(cache, u, r)
        with tempfile.TemporaryDirectory() as cache, contextlib.redirect_stderr(err):
            hari = [D(2026, 10, 31), D(2026, 11, 1), D(2026, 11, 2), D(2026, 11, 3)]
            ambil, urls = pabrik("b"); globals()["ambil_pelan"] = ambil
            assert unduh_hari(hari, "K", ket0, W(), cache, lambda *_: None) == set(hari)
            tua(cache, hari)
            assert [json.load(gzip.open(jalur_rek(cache, u), "rt")).get("snpp_gagal") for u in hari] == [1, 1, None, None]
            assert muat_rek(cache, hari[0]) is None and muat_rek(cache, hari[1]) is None and muat_rek(cache, hari[2]) and muat_rek(cache, hari[3]), "gagal pertama: dicoba lagi (belum sah)"
            assert muat_rek(cache, hari[0], True) is not None, "tetapi bisa dipakai sebagai cadangan bila percobaan ulang gagal total"
            ambil, urls = pabrik("b"); globals()["ambil_pelan"] = ambil   # percobaan ulang yang gagal lagi: final
            unduh_hari(hari[:2], "K", ket0, W(), cache, lambda *_: None); tua(cache, hari[:2])
            assert [json.load(gzip.open(jalur_rek(cache, u), "rt")).get("snpp_gagal") for u in hari[:2]] == [2, 2] and all(muat_rek(cache, u) for u in hari[:2]), "gagal kedua: final, tak dicoba lagi"
        with tempfile.TemporaryDirectory() as cache, contextlib.redirect_stderr(err):
            ambil, urls = pabrik("b"); globals()["ambil_pelan"] = ambil
            unduh_hari(hari[:2], "K", ket0, W(), cache, lambda *_: None); tua(cache, hari[:2])
            ambil, urls = pabrik("0"); globals()["ambil_pelan"] = ambil   # percobaan ulang berhasil: S-NPP masuk, penanda hilang
            unduh_hari(hari[:2], "K", ket0, W(), cache, lambda *_: None); tua(cache, hari[:2])
            rr = [json.load(gzip.open(jalur_rek(cache, u), "rt")) for u in hari[:2]]
            assert all("snpp_gagal" not in r and r["src"]["VIIRS_SNPP"] == "NRT" for r in rr) and all(muat_rek(cache, u) for u in hari[:2]), rr
        # SEBELUM batas: (a) kepala saja = nol titik S-NPP tetapi hari sah; (b) galat = hari tidak sah (S-NPP wajib), tidak meledak
        FS._SEKARANG = FS.PRA
        for mode, sah_ok in (("0", True), ("a", True), ("b", False)):
            ambil, urls = pabrik(mode)
            globals()["ambil_pelan"] = ambil
            with tempfile.TemporaryDirectory() as cache, contextlib.redirect_stderr(err):
                sah = unduh_hari([D(2026, 10, 28), D(2026, 10, 29)], "K", ket0, W(), cache, lambda *_: None)
                assert (sah == {D(2026, 10, 28), D(2026, 10, 29)}) == sah_ok, (mode, sah)
                assert sum("VIIRS_SNPP" in u for u in urls) >= 1
                if sah_ok:
                    r = json.load(gzip.open(jalur_rek(cache, D(2026, 10, 28)), "rt"))
                    assert r["src"]["VIIRS_SNPP"] == "NRT" and r["src"]["VIIRS_NOAA20"] == "NRT"
        # wajib() longgar: sebelum batas S-NPP wajib sampai max_date NRT-nya; baris hilang + NOAA-20 ada = opsional; sesudah batas opsional untuk hari bersumber NRT
        assert wajib(D(2026, 11, 1), ket0, FS.PRA) == set(FAMILI) and wajib(D(2026, 11, 2), ket0, FS.PRA) == set(FAMILI) - {"VIIRS_SNPP"}
        assert wajib(D(2026, 11, 1), ket0, FS.SESUDAH) == set(FAMILI) - {"VIIRS_SNPP"} and wajib(D(2026, 10, 31), ket_c, FS.PRA) == set(FAMILI) - {"VIIRS_SNPP"}
        assert wajib(D(2026, 5, 2), {**ket0, "VIIRS_SNPP_SP": (D(2012, 1, 1), D(2026, 6, 30))}, FS.SESUDAH) == set(FAMILI), "arsip SP S-NPP tetap wajib"
        assert SNPP_AKHIR == ("2026-11-01", 780) and PATAH == D(2026, 11, 1), "turunan dari firms_sumber.SNPP_AKHIR tidak boleh bergeser"
    finally:
        globals()["ambil_pelan"], time.sleep = asli
        FS._SEKARANG = FS.PRA


def uji():
    FS._SEKARANG = FS.PRA   # hermetis: jam dibekukan sebelum SNPP_AKHIR (sesudahnya VIIRS_SNPP_NRT tak diminta lagi; lihat uji_snpp_berhenti)
    uji_sintetis()
    uji_snpp_berhenti()
    uji_kab()
    n_kab = uji_geo()
    uji_tahun_baru()
    isi, porsi, alasan, kab = uji_deck()
    nas = isi["nasional"]
    print(f"peta_karhutla: uji lolos | porsi {porsi:.4f} | 18-20 Okt: hot sedang/tinggi = hitungan mandiri 38 provinsi (<= deck), luas/belum/padam rumus baru | nasional hot {nas['hot']} luas {nas['luas']} "
          f"belum {nas['belum']} padam {nas['padam']} | celah 20 Okt: {alasan[:3]}")
    print(f"peta_karhutla: kabupaten | {n_kab} kabupaten di GeoJSON, nama sama dengan peta kecamatan | 18-20 Okt {len(kab['kab'])} kabupaten berisi, "
          f"{sum(len(v['d']) for v in kab['kab'].values())} entri hari, jumlah per provinsi = provinsi (selisih <= (m+1)/2 ha), belum <= luas, semua kunci ada di GeoJSON layar")
    t = uji_terbit()
    print("peta_karhutla: pasangan terbit tidak ada (dilewati)" if t is None else
          f"peta_karhutla: pasangan terbit | {t[2]} hari, {t[0]} kabupaten, {t[1]} entri hari | hari sama dengan provinsi, jumlah per provinsi = provinsi, belum <= luas, "
          f"semua kunci ada di GeoJSON layar, dibuat/cutoff/celah sama")


if __name__ == "__main__":
    if "--uji" in sys.argv:
        uji()
    elif "--statis" in sys.argv:
        print("STATIS =", ukur_statis(baris_deck(os.path.join(FIKSTUR, "firms-raw-15-21okt.tar.gz")), Wilayah(), tgl(STATIS["hari"])))
    elif "--ukur" in sys.argv:   # --keluar berkas.json: JSON yang dibaca (hari + celah), bawaan yang terbit
        jl = sys.argv[sys.argv.index("--keluar") + 1] if "--keluar" in sys.argv else os.path.join(AKAR, "public/data/peta_karhutla.json")
        print("UKUR =", ukur(os.path.join(AKAR, "data/raw/peta_karhutla/utc"), jl))
    else:
        bangun(sys.argv[1:])
