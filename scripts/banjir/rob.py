"""Banjir rob (pasang laut) -> public/banjir/data/rob.json

Sumber (lihat poskorob-riset/RISET.md):
- Open-Meteo Marine (SMOC 0,08 deg): sea_level_height_msl per jam, 3 hari lalu + 10 hari ke depan, dan maks harian
  wave_height (w), swell_wave_height (sw), wind_wave_height (ww), wave_period (wp, detik). 5 variabel x 13 hari = bobot 1/titik.
  gabung = 1 bila muka laut >= p95 DAN gelombang >= 1,25 m (air tinggi + gelombang, rob diperparah ombak). Ambang level
  tidak berubah; gabung hanya penanda tambahan.
- Arsip Open-Meteo Marine (isi sejak 2022-11-24): maksimum harian -> ambang per titik (persentil iklim model itu sendiri,
  jadi bias datum model saling hapus). Arsip mahal (kuota ~125 panggilan per titik), jadi:
  data/raw/banjir/rob/titik.json + ambang.json di-commit, arsip_*.json cuma cache lokal/Actions.
- IOC sea level monitoring: gauge sensor tekanan (prs) dekat titik -> offset model-gauge, r, air terkini.
- DIBI BNPB: kejadian "Banjir Rob" lewat permintaan drill-to-detail dasbor publik 1 (anonim, tanpa token),
  disetujui pemilik. Dipakai untuk riwayat dan validasi ambang.
- BMKG Maritim: PDF peringatan dini rob (pdftotext -layout) dan warning/warnings.json gelombang per provinsi.

Titik: kecamatan pesisir kabupaten sasaran (pantura Banten-Jatim + kota rob di luar Jawa). Tiap kecamatan dikirim
ke Open-Meteo dengan cell_selection=sea; kecamatan yang jatuh ke sel laut yang sama dirapatkan jadi satu titik
(kecamatan terdekat ke sel menang), sel lebih dari JARAK_MAKS km dibuang.

Pakai:  python3 scripts/data/rob.py      |  python3 scripts/data/rob.py uji
Env:    ROB_ARSIP_LOKASI=n  titik baru yang arsipnya boleh diunduh per jalan (bawaan 15; ~100 panggilan kuota per titik, kuota harian 10 rb).
"""
import datetime as dt, json, math, os, re, shutil, statistics, subprocess, sys, time, urllib.error, urllib.parse, \
    urllib.request, zlib

sys.path.insert(0, os.path.dirname(__file__))
from umum import KELUAR, MENTAH, WIB, KuotaHabis, ambil, baca, per_lokasi, simpan
from wilayah import AKAR, PROVINSI, Wilayah, _cincin

RAW = os.path.join(MENTAH, "rob")
MARINE = "https://marine-api.open-meteo.com/v1/marine"
IOC = "https://www.ioc-sealevelmonitoring.org/service.php"
DIBI = "https://dibi.bnpb.go.id/api/v1/chart/data"
BMKG = "https://maritim.bmkg.go.id/marine2026-data/"
PDF_ROB = BMKG + "doc/peringatan-dini-banjir-rob.pdf"
ARSIP_MULAI = "2022-11-24"  # arsip SMOC di Open-Meteo: jam sebelum ini null (dicek 13 Okt 2026)
JARAK_MAKS = 30  # km dari pusat kecamatan ke sel laut model
JARAK_ANTAR = 15  # km minimum antar-titik (selain titik terbaik tiap kabupaten)
PERSENTIL = (80, 90, 95, 97, 99)
OMBAK_GABUNG = 1.25  # m, batas bawah kategori gelombang "sedang" BMKG (1,25-2,5 m)

# Pantura: hanya kecamatan pesisir (cek geometri). Kota di luar Jawa: semua kecamatan (rob muara/sungai pasang).
PANTURA = {
    "36": ["Serang", "Tangerang", "Kota Tangerang"],
    "31": ["Kota Administrasi Jakarta Utara"],
    "32": ["Bekasi", "Karawang", "Subang", "Indramayu", "Cirebon", "Kota Cirebon"],
    "33": ["Brebes", "Tegal", "Kota Tegal", "Pemalang", "Pekalongan", "Kota Pekalongan", "Batang", "Kendal",
           "Kota Semarang", "Demak", "Jepara", "Pati", "Rembang"],
    "35": ["Tuban", "Lamongan", "Gresik", "Kota Surabaya", "Sidoarjo", "Pasuruan", "Kota Pasuruan", "Probolinggo",
           "Kota Probolinggo"],
}
KOTA = {"12": ["Kota Medan"], "14": ["Kota Dumai"], "16": ["Kota Palembang"], "61": ["Kota Pontianak"],
        "63": ["Kota Banjarmasin"], "73": ["Kota Makassar"], "71": ["Kota Manado"], "52": ["Kota Bima"],
        "53": ["Kota Kupang"], "81": ["Kota Ambon"], "96": ["Kota Sorong"]}


# ---------- fungsi murni ----------

def jarak_km(la1, lo1, la2, lo2):
    p = math.pi / 180
    a = math.sin((la2 - la1) * p / 2) ** 2 + math.cos(la1 * p) * math.cos(la2 * p) * math.sin((lo2 - lo1) * p / 2) ** 2
    return 12742 * math.asin(math.sqrt(a))


def persentil(xs, q):
    """Persentil q (0-100) interpolasi linier, seperti numpy bawaan."""
    s = sorted(xs)
    k = (len(s) - 1) * q / 100
    i = int(k)
    return s[i] if i + 1 >= len(s) else s[i] + (s[i + 1] - s[i]) * (k - i)


def maks_harian(waktu, nilai, min_jam=20):
    """Deret per jam (waktu lokal 'YYYY-MM-DDTHH:MM') -> {tanggal: maksimum}; hari dengan < min_jam nilai dibuang."""
    hari = {}
    for t, v in zip(waktu, nilai):
        if v is not None:
            hari.setdefault(t[:10], []).append(v)
    return {d: round(max(vs), 3) for d, vs in hari.items() if len(vs) >= min_jam}


def level(h, a):
    """0 normal, 1 Waspada >= p95, 2 Siaga >= p99, 3 Awas >= max(p99 + 0,10, tertinggi teramati)."""
    if h is None or not a:
        return None
    if h >= max(a["p99"] + 0.10, a["amax"]):
        return 3
    return 2 if h >= a["p99"] else 1 if h >= a["p95"] else 0


def gabung(h, w, a):
    """Air tinggi + gelombang: 1 bila maks harian muka laut >= p95 DAN gelombang maks >= OMBAK_GABUNG; None bila tak ada data."""
    if h is None or w is None or not a:
        return None
    return int(h >= a["p95"] and w >= OMBAK_GABUNG)


def norm_kab(s):
    """Nama kabupaten DIBI/Kemendagri -> kunci banding ('Kota Adm. Jakarta Utara' == 'Kota Administrasi Jakarta Utara')."""
    s = s.lower().strip()
    for a in ("kota administrasi ", "kota adm. ", "kota adm ", "kabupaten ", "kab. ", "kab "):
        if s.startswith(a):
            s = ("kota " if a.startswith("kota") else "") + s[len(a):]
    return re.sub(r"[^a-z]", "", s)


def pearson(xs, ys):
    mx, my = sum(xs) / len(xs), sum(ys) / len(ys)
    sx = math.sqrt(sum((x - mx) ** 2 for x in xs))
    sy = math.sqrt(sum((y - my) ** 2 for y in ys))
    return sum((x - mx) * (y - my) for x, y in zip(xs, ys)) / (sx * sy) if sx and sy else None


def bersihkan(nilai):
    """Buang spike (> 6 MAD dari median) dan tolak sensor macet (simpangan < 5 cm). -> daftar indeks yang dipakai."""
    if len(nilai) < 12:
        return []
    med = statistics.median(nilai)
    mad = max(statistics.median(abs(v - med) for v in nilai), 0.02)
    ok = [i for i, v in enumerate(nilai) if abs(v - med) <= 6 * mad]
    return ok if len(ok) >= 12 and statistics.pstdev([nilai[i] for i in ok]) >= 0.05 else []


BULAN = {"jan": 1, "feb": 2, "mar": 3, "apr": 4, "mei": 5, "jun": 6, "jul": 7, "agu": 8, "ags": 8, "sep": 9,
         "okt": 10, "nov": 11, "des": 12}


def rentang_tanggal(teks):
    """'2 Oktober & 8 - 15 Oktober 2026' -> [('2026-10-02','2026-10-02'), ('2026-10-08','2026-10-15')].
    Bulan/tahun yang tidak ditulis diambil dari bagian sesudahnya (kebiasaan penulisan BMKG)."""
    pola = re.compile(r"(\d{1,2})\s*([A-Za-z]+)?\s*(\d{4})?(?:\s*[-–]\s*(\d{1,2})\s*([A-Za-z]+)?\s*(\d{4})?)?")
    bagian = []
    for p in re.split(r"&|,| dan ", teks):
        m = pola.search(p)
        if m:
            d1, b1, y1, d2, b2, y2 = m.groups()
            b1, b2 = [BULAN.get((b or "")[:3].lower()) for b in (b1, b2)]
            bagian.append([int(d1), b1, int(y1) if y1 else None, int(d2) if d2 else None, b2, int(y2) if y2 else None])
    bulan = tahun = None
    for b in reversed(bagian):  # isi dari kanan
        if b[3] is not None:
            b[4] = b[4] or bulan; b[5] = b[5] or tahun
            bulan, tahun = b[4], b[5]
        b[1] = b[1] or (b[4] if b[3] is not None else bulan); b[2] = b[2] or (b[5] if b[3] is not None else tahun)
        bulan, tahun = b[1], b[2]
    hasil = []
    for d1, b1, y1, d2, b2, y2 in bagian:
        try:
            a = dt.date(y1, b1, d1)
            z = dt.date(y2, b2, d2) if d2 is not None else a
        except (TypeError, ValueError):
            continue
        hasil.append((a.isoformat(), z.isoformat()))
    return hasil


PROV_PDF = re.compile(r"^(Pesisir|Perairan)\s")
TGL = re.compile(r"(Januari|Februari|Maret|April|Mei|Juni|Juli|Agustus|September|Oktober|November|Desember)"
                 r"|^&|^\d{1,2}\s*(-|&|$)", re.I)


def baca_tabel_rob(teks, kabs=None):
    """Teks `pdftotext -layout` lampiran PDF rob BMKG -> [{wilayah, lokasi, tanggal_mulai, tanggal_selesai, keterangan}].
    Kolom dikenali dari posisi: <4 nomor, 4-30 provinsi (sel tergabung, ditaruh di tengah), lalu lokasi, lalu tanggal.
    ponytail: heuristik tata letak; bila BMKG mengganti tabel, baris bisa tergabung/terpotong. Teks mentah ikut disimpan."""
    if "LAMPIRAN" not in teks:
        return []
    baris = teks.split("LAMPIRAN", 1)[1].splitlines()
    label, kelompok, kini = [], [], None   # label provinsi: [baris_awal, baris_akhir, teks]
    for i, ln in enumerate(baris):
        if not ln.strip():
            kini = None
            continue
        for m in re.finditer(r"\S+(?: \S+)*", ln):
            x, s = m.start(), m.group()
            if x < 4 and s.isdigit():
                continue
            if 4 <= x < 30 and not TGL.search(s):
                if label and label[-1][1] >= i - 2 and not PROV_PDF.match(s):
                    label[-1][1], label[-1][2] = i, label[-1][2] + " " + s
                else:
                    label.append([i, i, s])
                continue
            if (s.startswith(("No", "Lokasi", "Tanggal")) and len(s) < 12) or s.startswith("Lokasi dan waktu"):
                continue
            jenis = "t" if TGL.search(s) and x >= 30 else "l"
            # baris baru: lokasi berawalan Pesisir/Perairan sesudah lokasi yang tidak menggantung (koma, "Kab.", "dan")
            if kini is None or (jenis == "l" and PROV_PDF.match(s) and kini["l"]
                                and not re.search(r"(,|Pesisir|Kab\.|Kota|&|dan|\()\s*$", kini["l"])):
                kini = {"l": "", "t": "", "a": i, "z": i}
                kelompok.append(kini)
            kini[jenis] = (kini[jenis] + " " + s).strip()
            kini["z"] = i
    # baris tanpa tanggal = sambungan lokasi baris sebelumnya
    rapi = []
    for k in kelompok:
        if not k["t"] and rapi:
            rapi[-1]["l"] += ", " + k["l"]; rapi[-1]["z"] = k["z"]
        elif k["l"] or k["t"]:
            rapi.append(k)
    # tanggal di sel tergabung (mis. "3 - 4 Oktober &" / "11 - 15 Oktober 2026") berlaku untuk kedua baris
    for k, n in zip(rapi, rapi[1:]):
        if k["t"] and n["t"] and not re.search(r"\d{4}\s*$", k["t"]):
            k["t"] = n["t"] = k["t"] + " " + n["t"]
    wil = bagi_wilayah([(k["a"], k["z"], prov_disebut(k["l"], kabs or {})) for k in rapi],
                       [((b[0] + b[1]) / 2, b[2], kode_prov(b[2])) for b in label])
    hasil = []
    for k, w in zip(rapi, wil):
        for a, z in rentang_tanggal(k["t"]) or [(None, None)]:
            hasil.append({"wilayah": re.sub(r"\s+", " ", w), "kp": kode_prov(w), "lokasi": re.sub(r"\s+", " ", k["l"]).strip(" ,"),
                          "tanggal_mulai": a, "tanggal_selesai": z, "keterangan": k["t"]})
    return hasil


def kode_prov(label):
    """'Pesisir Kep.Riau' -> '21', 'Pesisir Jakarta' -> '31'."""
    n = re.sub(r"[^a-z]", "", label.lower().replace("pesisir", "").replace("kep.", "kepulauan "))
    return next((k for k, v in PROVINSI.items() if n and (n in re.sub(r"[^a-z]", "", v.lower()))), None)


def prov_disebut(lokasi, kabs):
    """Kode provinsi yang nama kabupaten/kotanya disebut di teks lokasi (kabs: {kode: {nama kab}})."""
    out = set()
    for kp, nama in kabs.items():
        for n in nama:
            b = re.sub(r"^Kota (Administrasi )?", "", n)
            if len(b) >= 4 and re.search(r"\b" + re.escape(b) + r"\b", lokasi, re.I):
                out.add(kp)
    return out


def bagi_wilayah(baris, label):
    """Label provinsi ada di tengah sel tergabung, jadi baris [(awal, akhir, {prov disebut})] dibagi jadi len(label)
    blok berurutan yang titik tengahnya paling dekat ke baris label [(baris, teks, kode)], ditambah denda 8 baris
    tiap baris yang menyebut kabupaten provinsi lain (pemrograman dinamis). -> nama wilayah per baris."""
    m, n = len(baris), len(label)
    if not n:
        return [""] * m
    if n > m:  # tidak bisa dibagi: label terdekat
        return [min(label, key=lambda b: abs(b[0] - (r[0] + r[1]) / 2))[1] for r in baris]
    salah = lambda r, k: 8 if r[2] and label[k][2] not in r[2] else 0
    biaya = lambda k, i, j: abs((baris[i][0] + baris[j - 1][1]) / 2 - label[k][0]) + sum(salah(baris[x], k) for x in range(i, j))
    f = [[math.inf] * (m + 1) for _ in range(n + 1)]
    asal = [[0] * (m + 1) for _ in range(n + 1)]
    f[0][0] = 0
    for k in range(1, n + 1):
        for j in range(k, m + 1):
            for i in range(k - 1, j):
                c = f[k - 1][i] + biaya(k - 1, i, j)
                if c < f[k][j]:
                    f[k][j], asal[k][j] = c, i
    hasil, j = [""] * m, m
    for k in range(n, 0, -1):
        i = asal[k][j]
        hasil[i:j] = [label[k - 1][1]] * (j - i)
        j = i
    return hasil


def validasi(titik, harian, ambang_q, kejadian, akhir):
    """Uji ambang terhadap kejadian DIBI per kabupaten (jendela +-1 hari karena tanggal laporan sering bergeser).
    POD = kejadian yang kena; POFD = hari tanpa kejadian yang tetap terpicu; FAR = hari terpicu tanpa kejadian;
    PSS (Peirce) = POD - POFD. harian[i] = {tanggal: maks}; ambang_q[i] = {q: ambang}."""
    kab = {}
    for i, t in enumerate(titik):
        if harian[i]:
            kab.setdefault((t["kp"], norm_kab(t["kab"])), []).append(i)
    mulai = min(min(h) for h in harian if h)
    ev = {}
    for k in kejadian:
        kunci = (k["kp"], norm_kab(k["kab"]))
        if mulai <= k["tanggal"] <= akhir and kunci in kab:
            ev.setdefault(kunci, set()).add(k["tanggal"])
    geser = lambda d, n: (dt.date.fromisoformat(d) + dt.timedelta(days=n)).isoformat()
    hasil = {"kab_berarsip": len(kab), "kab_berkejadian": len(ev), "kejadian_diuji": sum(map(len, ev.values())),
             "jendela_hari": 1, "persentil": {}}
    for q in PERSENTIL:
        kena = kena_tepat = n_ev = alarm = alarm_salah = non = non_alarm = 0
        for kunci, idx in kab.items():
            hari = sorted(set().union(*(harian[i].keys() for i in idx)))
            picu = {d for d in hari if any(harian[i].get(d, -9) >= ambang_q[i][q] for i in idx)}
            e = ev.get(kunci, set())
            dekat = {geser(d, n) for d in e for n in (-1, 0, 1)}
            for d in e:
                n_ev += 1
                kena += any(geser(d, n) in picu for n in (-1, 0, 1))
                kena_tepat += d in picu
            for d in hari:
                if d in picu:
                    alarm += 1
                    alarm_salah += d not in dekat
                if d not in dekat:
                    non += 1
                    non_alarm += d in picu
        pod, pofd = kena / n_ev if n_ev else None, non_alarm / non if non else None
        hasil["persentil"][f"p{q}"] = {
            "pod": round(pod, 3) if pod is not None else None, "pod_hari_sama": round(kena_tepat / n_ev, 3) if n_ev else None,
            "pofd": round(pofd, 3) if pofd is not None else None, "far": round(alarm_salah / alarm, 3) if alarm else None,
            "pss": round(pod - pofd, 3) if pod is not None and pofd is not None else None, "hari_terpicu": alarm}
    # di persentil berapa muka laut maksimum (+-1 hari) pada tanggal kejadian? 50 = hari biasa
    pangkat = []
    for kunci, e in ev.items():
        for d in e:
            r = []
            for i in kab[kunci]:
                vals = sorted(harian[i].values())
                for n in (-1, 0, 1):
                    v = harian[i].get(geser(d, n))
                    if v is not None:
                        r.append(100 * sum(x <= v for x in vals) / len(vals))
            if r:
                pangkat.append(max(r))
    if pangkat:
        hasil["persentil_kejadian"] = {"median": round(statistics.median(pangkat), 1),
                                       "p25": round(persentil(pangkat, 25), 1), "n": len(pangkat),
                                       "acak_median": round(100 * (0.5 ** (1 / 3)), 1)}  # maks 3 hari acak (*)
    return hasil


# ---------- jaringan ----------

def minta(url, body=None, kepala=None, coba=4, batas=90):
    """GET/POST -> bytes, coba ulang 5, 10, 20 dtk. body dict dikirim sebagai JSON."""
    h = {"User-Agent": "Mozilla/5.0 (poskobanjir/1.0)", **(kepala or {})}
    if isinstance(body, dict):
        body, h["Content-Type"] = json.dumps(body).encode(), "application/json"
    for i in range(coba):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, data=body, headers=h), timeout=batas) as r:
                return r.read()
        except Exception as e:
            if i == coba - 1 or (isinstance(e, urllib.error.HTTPError) and 400 <= e.code < 500 and e.code != 429):
                raise RuntimeError(f"{url.split('?')[0]}: {e}")
            time.sleep(5 * 2 ** i)


def marine(titik, **param):
    """Satu permintaan Open-Meteo Marine untuk banyak titik [(lat, lon)] -> daftar respons per titik."""
    q = {"latitude": ",".join(f"{a:.4f}" for a, _ in titik), "longitude": ",".join(f"{b:.4f}" for _, b in titik),
         "cell_selection": "sea", "timezone": "auto", **param}
    return per_lokasi(ambil(MARINE + "?" + urllib.parse.urlencode(q)))


# ---------- langkah ----------

ARAH = ((1, 0), (-1, 0), (0, 1), (0, -1), (.7, .7), (.7, -.7), (-.7, .7), (-.7, -.7))


def titik_laut(w, ring, jangkau):
    """Simpul kecamatan yang menghadap laut: titik geser sejauh j derajat DAN j + 0,03 derajat ke satu arah sama-sama
    di luar semua kecamatan (celah antar-poligon hasil penyederhanaan cuma sempit, laut lebar).
    Jangkauan dicoba dari dekat ke jauh. -> ((lon, lat) simpul, (lat, lon) titik laut, j) atau None."""
    for j in jangkau:
        for x, y in ring[::2]:
            for dx, dy in ARAH:
                if w.cari(x + dx * j, y + dy * j) is None and w.cari(x + dx * (j + .03), y + dy * (j + .03)) is None:
                    return (x, y), (y + dy * j, x + dx * j), j
    return None


def temukan_titik():
    """Kecamatan sasaran -> titik pesisir unik per sel model. Disimpan di titik.json (cek geometri + ~250 lokasi).
    SMOC di Open-Meteo juga mengembalikan nilai (ekstrapolasi) untuk sel di darat, jadi titik yang dikirim harus
    titik laut hasil cek geometri; pusat kecamatan bisa jatuh ke 'sel laut' di pegunungan."""
    w = Wilayah()
    calon = []
    for kp, kabs in list(PANTURA.items()) + list(KOTA.items()):
        for f in json.load(open(os.path.join(AKAR, "public/geo/kecamatan", f"{kp}.json")))["features"]:
            p = f["properties"]
            if p["kab"] not in kabs:
                continue
            # pantura: harus menyentuh laut (2 km); kota muara (Pontianak, Banjarmasin, Palembang): laut sampai ~30 km
            hasil = titik_laut(w, max(_cincin(f["geometry"]), key=len), (.02,) if kp in PANTURA else (.02, .1, .2, .3))
            if hasil:
                calon.append({"kp": kp, "kab": p["kab"], "kec": p["kec"], "v": hasil[0], "laut": hasil[1]})
    print(f"  {len(calon)} kecamatan pesisir")
    sel = {}
    for i in range(0, len(calon), 100):
        grup = calon[i:i + 100]
        for k, d in zip(grup, marine([k["laut"] for k in grup], hourly="sea_level_height_msl", forecast_days=1)):
            if not any(v is not None for v in d["hourly"]["sea_level_height_msl"]):
                continue
            s = (round(d["latitude"], 4), round(d["longitude"], 4))
            jk = jarak_km(k["v"][1], k["v"][0], *s)
            if jk <= JARAK_MAKS and ((s, k["kab"]) not in sel or jk < sel[s, k["kab"]][0]):
                sel[s, k["kab"]] = (jk, k)  # per kabupaten: Kota Cirebon tetap dapat titik walau selnya dipakai Kab. Cirebon
    titik = [{"lat": round(k["v"][1], 4), "lon": round(k["v"][0], 4), "sel": list(s), "kp": k["kp"],
              "prov": PROVINSI[k["kp"]], "kab": k["kab"], "kec": k["kec"], "jarak_sel_km": round(jk, 1)}
             for (s, _), (jk, k) in sel.items()]
    titik = jarangkan(titik)
    terbuang = sorted({f"{k['kab']}" for k in calon} - {t["kab"] for t in titik})
    print(f"  {len(titik)} titik; kabupaten tanpa titik (sel > {JARAK_MAKS} km / tanpa data): {terbuang}")
    return titik


def jarangkan(titik, min_km=JARAK_ANTAR):
    """Sel model berjarak ~9 km, jadi pantai panjang menghasilkan ratusan titik. Simpan satu titik terbaik (sel
    terdekat ke kecamatannya) per kabupaten, lalu tambah titik lain hanya bila >= min_km dari semua yang sudah ada."""
    urut = sorted(titik, key=lambda t: t["jarak_sel_km"])
    simpan_, kab = [], set()
    for t in urut:
        if t["kab"] not in kab:
            simpan_.append(t); kab.add(t["kab"])
    for t in urut:
        if t not in simpan_ and all(jarak_km(t["lat"], t["lon"], k["lat"], k["lon"]) >= min_km and t["sel"] != k["sel"]
                                    for k in simpan_):
            simpan_.append(t)
    return sorted(simpan_, key=lambda t: (t["kp"], t["lon"]))


def ambil_dibi():
    """Kejadian 'Banjir Rob' dari dasbor publik DIBI (permintaan drill-to-detail chart 1 di dasbor 1, anonim)."""
    url = DIBI + "?" + urllib.parse.urlencode({"form_data": json.dumps({"slice_id": 1}), "dashboard_id": 1})
    body = {"datasource": {"id": 1, "type": "table"}, "force": False,
            "form_data": {"slice_id": 1, "dashboardId": 1, "datasource": "1__table", "viz_type": "echarts_timeseries_bar"},
            "queries": [{"columns": [], "metrics": [], "orderby": [], "row_limit": 10000, "extras": {},
                         "filters": [{"col": "jenis_bencana", "op": "IN", "val": ["Banjir Rob"]}]}],
            "result_format": "json", "result_type": "drill_detail"}
    rows = json.loads(minta(url, body))["result"][0]["data"]
    simpan(os.path.join(RAW, "dibi.json"), rows)
    return rows


def normal_dibi(rows):
    out = []
    for r in rows:
        tgl = dt.datetime.fromtimestamp(r["dt"] / 1000, WIB).date().isoformat()
        if tgl < "2018-01-01":
            continue
        out.append({"tanggal": tgl, "kp": str(r["id_kab_bps"])[:2], "prov": r["provinsi"], "kab": r["kabupaten"],
                    "meninggal": r["meninggal"] or 0, "terdampak": r["menderita"] or 0, "mengungsi": r["mengungsi"] or 0,
                    "rumah_rusak": r["rumah_rusak"] or 0, "rumah_terendam": r["rumah_terendam"] or 0})
    return sorted(out, key=lambda k: k["tanggal"])


def perbarui_arsip(titik, urutan, kuota):
    """Unduh arsip ARSIP_MULAI..kemarin untuk titik yang belum punya; maksimum `kuota` titik per jalan, 5 per panggilan."""
    kemarin = (dt.datetime.now(WIB).date() - dt.timedelta(days=1)).isoformat()
    perlu = [i for i in urutan if not os.path.exists(arsip_jalur(titik[i]))][:kuota]
    for j in range(0, len(perlu), 5):
        grup = perlu[j:j + 5]
        try:
            res = marine([tuple(titik[i]["sel"]) for i in grup], hourly="sea_level_height_msl",
                         start_date=ARSIP_MULAI, end_date=kemarin)
        except (KuotaHabis, RuntimeError) as e:
            print(f"  arsip berhenti ({e}); lanjut jalan berikutnya", file=sys.stderr)
            return
        for i, d in zip(grup, res):
            h = d["hourly"]
            simpan(arsip_jalur(titik[i]), maks_harian(h["time"], h["sea_level_height_msl"]))
        print(f"  arsip {j + len(grup)}/{len(perlu)}")


def arsip_jalur(t):
    return os.path.join(RAW, f"arsip_{t['sel'][0]}_{t['sel'][1]}.json")


def ioc(titik, prakiraan):
    """Gauge IOC (sensor prs) dalam 40 km dari titik: offset, r, fase, air terkini. Tidak pernah menggagalkan jalan."""
    hasil = {}
    try:
        daftar = json.loads(minta(IOC + "?query=stationlist&showall=a", batas=120))
    except Exception as e:
        print(f"  IOC daftar stasiun gagal: {e}", file=sys.stderr)
        return hasil
    stasiun = {s["code"]: s for s in daftar if s.get("country") == "IDN" and s.get("lat") is not None}
    sekarang = dt.datetime.now(dt.timezone.utc)
    mulai = (sekarang - dt.timedelta(days=3)).strftime("%Y-%m-%dT%H:%M")
    for kode, s in sorted(stasiun.items()):
        i = min(range(len(titik)), key=lambda i: jarak_km(s["lat"], s["lon"], titik[i]["lat"], titik[i]["lon"]))
        jk = jarak_km(s["lat"], s["lon"], titik[i]["lat"], titik[i]["lon"])
        if jk > 40 or prakiraan[i] is None:
            continue
        try:
            obs = json.loads(minta(f"{IOC}?query=data&code={kode}&timestart={mulai}&timestop="
                                   f"{sekarang.strftime('%Y-%m-%dT%H:%M')}&format=json", coba=2, batas=60))
        except Exception as e:
            print(f"  IOC {kode}: {e}", file=sys.stderr)
            continue
        obs = [o for o in obs if o.get("sensor") == "prs" and o.get("slevel") is not None]
        ok = bersihkan([o["slevel"] for o in obs])
        if not ok:
            continue
        jam = {}
        for k in ok:
            jam.setdefault(obs[k]["stime"][:13], []).append(obs[k]["slevel"])
        g = {t: sum(v) / len(v) for t, v in jam.items()}
        m = prakiraan[i]["utc"]
        def pasang(lag):  # gauge(t) vs model(t - lag)
            ps = [(g[t], m.get((dt.datetime.fromisoformat(t + ":00") - dt.timedelta(hours=lag)).strftime("%Y-%m-%dT%H")))
                  for t in g]
            return [p for p in ps if p[1] is not None]
        p0 = pasang(0)
        if len(p0) < 12:
            continue
        r = {lag: pearson(*zip(*pasang(lag))) or -1 for lag in range(-3, 4)}
        akhir = obs[ok[-1]]
        offset = sum(a - b for a, b in p0) / len(p0)
        umur = (sekarang - dt.datetime.fromisoformat(akhir["stime"]).replace(tzinfo=dt.timezone.utc)).total_seconds()
        hasil[i] = {"stasiun": kode, "nama": s.get("Location"), "jarak_km": round(jk, 1), "offset": round(offset, 3),
                    "r": round(r[0], 3), "fase_jam": max(r, key=r.get), "n_jam": len(p0), "obs": akhir["slevel"],
                    "obs_m": round(akhir["slevel"] - offset, 3), "waktu": akhir["stime"] + "Z", "lag_jam": round(umur / 3600, 1)}
        print(f"  IOC {kode} -> {titik[i]['kab']}/{titik[i]['kec']}: offset {offset:+.3f} m, r {r[0]:.3f}, "
              f"fase {hasil[i]['fase_jam']} j, umur {umur / 3600:.1f} j, {len(p0)} jam")
    return hasil


def pdf_teks(isi):
    """pdftotext -layout bila ada; kalau tidak, ambil string Tj/TJ dari stream Flate (kasar, tanpa tata letak)."""
    jalur = os.path.join(RAW, "bmkg_rob.pdf")
    with open(jalur, "wb") as f:
        f.write(isi)
    if shutil.which("pdftotext"):
        return subprocess.run(["pdftotext", "-layout", jalur, "-"], capture_output=True, text=True, timeout=60).stdout, "pdftotext"
    teks = []
    for m in re.finditer(rb"stream\r?\n(.*?)\r?\nendstream", isi, re.S):
        try:
            s = zlib.decompress(m.group(1))
        except zlib.error:
            continue
        for b in re.findall(rb"\[(.*?)\]\s*TJ|\((.*?)\)\s*Tj", s, re.S):
            teks.append(b"".join(re.findall(rb"\((.*?)(?<!\\)\)", b[0])) if b[0] else b[1])
    t = b"\n".join(teks).decode("latin-1")
    return (t, "stdlib") if re.search(r"Oktober|Januari|Desember|Juni", t) else ("", None)


def bmkg():
    out = {"rob": [], "gelombang": [], "sumber": PDF_ROB, "diambil": dt.datetime.now(WIB).isoformat(timespec="minutes")}
    try:
        teks, alat = pdf_teks(minta(PDF_ROB))
        out["alat"] = alat
        kabs = {kp: {f["properties"]["kab"] for f in json.load(open(os.path.join(AKAR, "public/geo/kabupaten", f"{kp}.json")))["features"]
                     if f["properties"].get("kab")} for kp in PROVINSI if os.path.exists(os.path.join(AKAR, "public/geo/kabupaten", f"{kp}.json"))}
        out["rob"] = baca_tabel_rob(teks, kabs)
        out["teks"] = re.sub(r"[ \t]+", " ", teks).strip()
        m = re.search(r"Jakarta,\s*(\d{1,2}\s+\w+\s+\d{4})", teks)
        out["terbit"] = m.group(1) if m else None
        print(f"  PDF rob BMKG ({alat}): {len(out['rob'])} baris")
    except Exception as e:
        print(f"  PDF rob BMKG gagal: {e}", file=sys.stderr)
    try:
        for prov, v in json.loads(minta(BMKG + "warning/warnings.json")).items():
            d = v.get("data") or {}
            wr = d.get("warning") or {}
            out["gelombang"].append({"prov": prov, "dari": d.get("valid_from"), "sampai": d.get("valid_until"),
                                     "zona": d.get("time_zone"), **{k: wr.get(k, []) for k in ("sedang", "tinggi", "sangat_tinggi", "ekstrem")}})
        print(f"  peringatan gelombang: {len(out['gelombang'])} provinsi")
    except Exception as e:
        print(f"  warnings.json BMKG gagal: {e}", file=sys.stderr)
    return out


def main():
    t0 = time.time()
    os.makedirs(RAW, exist_ok=True)
    jalur_titik = os.path.join(RAW, "titik.json")
    titik = baca(jalur_titik)
    if not titik:
        print("Mencari titik pesisir...")
        titik = temukan_titik()
        simpan(jalur_titik, titik)
    print(f"{len(titik)} titik")

    print("DIBI...")
    try:
        rows = ambil_dibi()
    except Exception as e:
        print(f"  DIBI gagal ({e}), pakai cache", file=sys.stderr)
        rows = baca(os.path.join(RAW, "dibi.json"), [])
    kejadian = normal_dibi(rows)
    print(f"  {len(kejadian)} kejadian Banjir Rob sejak 2018")
    kab_tahun = {}
    for k in kejadian:
        c = kab_tahun.setdefault(f"{k['prov']}|{k['kab']}", {})
        c[k["tanggal"][:4]] = c.get(k["tanggal"][:4], 0) + 1

    print("Arsip & ambang...")
    jumlah = {}
    for k in kejadian:
        jumlah[(k["kp"], norm_kab(k["kab"]))] = jumlah.get((k["kp"], norm_kab(k["kab"])), 0) + 1
    urutan = sorted(range(len(titik)), key=lambda i: -jumlah.get((titik[i]["kp"], norm_kab(titik[i]["kab"])), 0))
    perbarui_arsip(titik, urutan, int(os.environ.get("ROB_ARSIP_LOKASI", "15")))
    jalur_ambang = os.path.join(RAW, "ambang.json")
    simpanan = baca(jalur_ambang, {"titik": {}, "validasi": None})
    harian, ambang_q, ambang = [], [], []
    for t in titik:
        h = baca(arsip_jalur(t)) or {}
        kunci = f"{t['sel'][0]}_{t['sel'][1]}"
        if len(h) >= 300:
            v = list(h.values())
            simpanan["titik"][kunci] = {**{f"p{q}": round(persentil(v, q), 3) for q in PERSENTIL},
                                        "amax": max(v), "n": len(v), "akhir": max(h)}
        a = simpanan["titik"].get(kunci)
        harian.append(h if len(h) >= 300 else {})
        ambang_q.append({q: a[f"p{q}"] for q in PERSENTIL} if a else None)
        ambang.append(a)
    if any(harian):
        akhir = max(max(h) for h in harian if h)
        simpanan["validasi"] = validasi(titik, harian, ambang_q, kejadian, akhir)
        simpanan["validasi"].update({"titik_berarsip": sum(1 for h in harian if h), "periode": [min(min(h) for h in harian if h), akhir]})
    simpan(jalur_ambang, simpanan)
    print(f"  ambang untuk {sum(1 for a in ambang if a)}/{len(titik)} titik")
    print("  validasi:", json.dumps(simpanan["validasi"], ensure_ascii=False))

    print("Prakiraan Open-Meteo Marine...")
    hari0 = dt.datetime.now(WIB).date()
    hari = [(hari0 + dt.timedelta(days=n)).isoformat() for n in range(-3, 10)]
    prakiraan = [None] * len(titik)
    for j in range(0, len(titik), 50):
        idx = list(range(j, min(j + 50, len(titik))))
        res = marine([tuple(titik[i]["sel"]) for i in idx], hourly="sea_level_height_msl,wave_height,swell_wave_height,wind_wave_height,wave_period",
                     past_days=3, forecast_days=10)
        for i, d in zip(idx, res):
            h = d["hourly"]
            geser = dt.timedelta(seconds=d.get("utc_offset_seconds", 0))
            hm, wm = maks_harian(h["time"], h["sea_level_height_msl"], 1), maks_harian(h["time"], h["wave_height"], 1)
            ekstra = {k: maks_harian(h["time"], h[v], 1) for k, v in (("sw", "swell_wave_height"), ("ww", "wind_wave_height"), ("wp", "wave_period"))}
            prakiraan[i] = {"h": [hm.get(x) for x in hari], "w": [wm.get(x) for x in hari],
                            **{k: [None if v.get(x) is None else round(v[x], 2) for x in hari] for k, v in ekstra.items()},
                            "utc": {(dt.datetime.fromisoformat(t) - geser).strftime("%Y-%m-%dT%H"): v
                                    for t, v in zip(h["time"], h["sea_level_height_msl"]) if v is not None}}

    print("IOC...")
    gauge = ioc(titik, prakiraan)

    print("BMKG...")
    b = bmkg()

    keluar = []
    for i, t in enumerate(titik):
        p, a = prakiraan[i], ambang[i]
        keluar.append({"lat": t["lat"], "lon": t["lon"], "sel": t["sel"], "prov": t["prov"], "kab": t["kab"], "kec": t["kec"],
                       "h": p["h"] if p else [], "w": p["w"] if p else [],
                       "p95": a["p95"] if a else None, "p99": a["p99"] if a else None, "amax": a["amax"] if a else None,
                       "sw": p["sw"] if p else [], "ww": p["ww"] if p else [], "wp": p["wp"] if p else [],
                       "gabung": [gabung(h, w, a) for h, w in zip(p["h"], p["w"])] if p else [],
                       "lv": [level(h, a) for h in p["h"]] if p else [], "ioc": gauge.get(i)})
    for k in kejadian:
        del k["kp"]
    rob = {"dibuat": dt.datetime.now(WIB).isoformat(timespec="minutes"), "hari": hari, "titik": keluar, "bmkg": b,
           "kejadian": kejadian, "kab_tahun": kab_tahun, "validasi": simpanan["validasi"],
           "aturan": {"waspada": "maks harian >= p95", "siaga": ">= p99", "awas": ">= max(p99 + 0,10 m, tertinggi 2022+)",
                      "gabung": f"muka laut >= p95 dan gelombang >= {OMBAK_GABUNG} m",
                      "datum": "MSL global model SMOC; ambang dari iklim model sendiri, bukan datum lokal",
                      "kalibrasi": "p95 dipertahankan untuk Waspada. Uji DIBI 13 Okt 2026 (26 kejadian, 16 kab): PSS p90 0,73, "
                                   "p95 0,67, p97 0,69 -- selisihnya < 1 galat baku POD (~0,08), sedangkan p90 menggandakan "
                                   "hari terpicu. Lihat 'validasi' untuk angka terkini."},
           "sumber": ["Open-Meteo Marine (CC BY 4.0, MeteoFrance SMOC)", "IOC Sea Level Monitoring Facility",
                      "DIBI BNPB", "BMKG Maritim"]}
    simpan(os.path.join(KELUAR, "rob.json"), rob)
    lv = [max((x for x in t["lv"] if x is not None), default=0) for t in keluar]
    print(f"gabung (air tinggi + gelombang >= {OMBAK_GABUNG} m): {sum(1 for t in keluar if any(t['gabung']))} titik")
    print(f"rob.json: {len(keluar)} titik, waspada+ {sum(x >= 1 for x in lv)}, siaga+ {sum(x >= 2 for x in lv)}, "
          f"awas {sum(x >= 3 for x in lv)}; {os.path.getsize(os.path.join(KELUAR, 'rob.json')) / 1024:.0f} KB; "
          f"{time.time() - t0:.0f} dtk")


def uji():
    assert persentil([1, 2, 3, 4, 5], 50) == 3 and abs(persentil([1, 2, 3, 4], 95) - 3.85) < 1e-9
    assert maks_harian(["2026-01-01T00:00", "2026-01-01T01:00", "2026-01-02T00:00"], [0.1, 0.5, 0.9], 2) == {"2026-01-01": 0.5}
    a = {"p95": 0.8, "p99": 0.9, "amax": 1.05}
    assert [level(h, a) for h in (0.5, 0.8, 0.95, 1.0, 1.05, None)] == [0, 1, 2, 2, 3, None]
    assert level(0.9, None) is None
    assert [gabung(h, w, a) for h, w in ((0.8, 1.25), (0.8, 1.2), (0.7, 2), (None, 2))] == [1, 0, 0, None]
    assert norm_kab("Kota Adm. Jakarta Utara") == norm_kab("Kota Administrasi Jakarta Utara") == "kotajakartautara"
    assert norm_kab("Kab. Demak") == norm_kab("Demak") != norm_kab("Kota Pekalongan")
    assert abs(pearson([1, 2, 3], [2, 4, 6]) - 1) < 1e-9 and pearson([1, 1, 1], [1, 2, 3]) is None
    v = [math.sin(i / 3) for i in range(48)]
    assert len(bersihkan(v + [18.4])) == 48 and bersihkan([18.432] * 30) == []  # spike dibuang, sensor macet ditolak
    assert rentang_tanggal("2 Oktober & 8 - 15 Oktober 2026") == [("2026-10-02", "2026-10-02"), ("2026-10-08", "2026-10-15")]
    assert rentang_tanggal("2 - 4 Oktober 2026 & 12 - 18 Oktober 2026")[1] == ("2026-10-12", "2026-10-18")
    assert rentang_tanggal("28 Oktober - 2 November 2026") == [("2026-10-28", "2026-11-02")]
    assert rentang_tanggal("08 -12 Oktober 2026") == [("2026-10-08", "2026-10-12")]
    contoh = """LAMPIRAN
No                                   Lokasi                                      Tanggal

                                      Pesisir Medan Belawan, Pesisir
  1      Pesisir Sumatera Utara                                                 2 Oktober &
                                      Medan Labuhan                         8 - 15 Oktober 2026

                                      Pesisir Batam                         10 - 15 Oktober 2026
  2      Pesisir Kep.Riau
                                      Pesisir Karimun                       11 - 16 Oktober 2026

                                      Pesisir Kota Semarang, Pesisir           4 - 8 Oktober &
  8      Pesisir Jawa Tengah          Pesisir Kab. Demak                    18 - 22 Oktober 2026
                                      Pesisir Kab. Jepara
                                      Pesisir Kab. Brebes, Pesisir Kota        4 - 9 Oktober 2026
"""
    r = baca_tabel_rob(contoh)
    assert [(x["wilayah"], x["tanggal_mulai"]) for x in r] == [
        ("Pesisir Sumatera Utara", "2026-10-02"), ("Pesisir Sumatera Utara", "2026-10-08"),
        ("Pesisir Kep.Riau", "2026-10-10"), ("Pesisir Kep.Riau", "2026-10-11"),
        ("Pesisir Jawa Tengah", "2026-10-04"), ("Pesisir Jawa Tengah", "2026-10-18"),
        ("Pesisir Jawa Tengah", "2026-10-04")], r
    assert "Jepara" in r[4]["lokasi"] and "Brebes" in r[6]["lokasi"], r
    # validasi: satu kabupaten, kejadian di hari pasang tertinggi -> kena di semua persentil
    t = [{"kp": "33", "kab": "Demak"}]
    h = [{(dt.date(2022, 1, 1) + dt.timedelta(days=n)).isoformat(): (0.5 if n != 100 else 2.0) + n * 1e-5 for n in range(400)}]
    q = [{p: persentil(list(h[0].values()), p) for p in PERSENTIL}]
    v = validasi(t, h, q, [{"tanggal": "2022-04-11", "kp": "33", "kab": "Kab. Demak"}], "2023-12-31")
    assert v["kejadian_diuji"] == 1 and v["persentil"]["p99"]["pod"] == 1.0, v
    t = [{"kab": k, "sel": [0, x], "lat": 0, "lon": x, "jarak_sel_km": j, "kp": "33"}
         for k, x, j in (("A", 0, 5), ("A", 0.05, 1), ("B", 0.1, 9), ("A", 0.3, 3))]
    assert [x["sel"][1] for x in jarangkan(t)] == [0.05, 0.1, 0.3]  # terbaik per kab + yang >= 15 km
    print("ok")


if __name__ == "__main__":
    uji() if sys.argv[1:] == ["uji"] else main()
