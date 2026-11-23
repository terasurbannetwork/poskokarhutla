"""Tabel kejadian bencana publik BNPB (portal GIS, semua jenis, per baris kejadian) -> data/gis-bnpb/kejadian_<tahun>.json

Sumber: https://gis.bnpb.go.id/databencana/tabel/pencarian.php (portal publik tanpa login; BUKAN API resmi, bentuk HTML bisa berubah).
Kolom sumber: No., Kode Identitas Bencana (KIB), ID Kabupaten, Tanggal Kejadian, Kejadian, Lokasi, Kabupaten, Provinsi,
Kronologi & Dokumentasi (tautan), Penyebab, Meninggal, Hilang, Terluka, Rumah Rusak, Rumah Terendam, Fasum Rusak.
Akses: tiap permintaan butuh cookie BARU (GET halaman, lalu satu POST dengan cookie itu; POST kedua dengan cookie lama
membalas tabel kosong). Satu tahun penuh keluar dalam satu POST. Data mulai 2005. Jeda 1 dtk antar permintaan, ulang 3x.
Sel dampak kosong = null (bukan 0); "0" tertulis tetap 0.

{"dibuat","sumber","tahun","jumlah","kejadian":[{kib,kab_kode,tanggal,jenis,kab,prov,kec,desa,lokasi_mentah,penyebab,
 dokumentasi,meninggal,hilang,luka,rumah_rusak,terendam,fasum_rusak}]}

Pakai:  python3 scripts/umum/gis_kejadian.py          (tahun ini dan tahun lalu)
        python3 scripts/umum/gis_kejadian.py semua    (2005 sampai tahun ini)
        python3 scripts/umum/gis_kejadian.py uji      (self-check pengurai, tanpa jaringan)
"""
import datetime as dt, html, http.cookiejar, json, os, re, sys, time, urllib.parse, urllib.request
from html.parser import HTMLParser

AKAR = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "../.."))
KELUAR = os.path.join(AKAR, "data/gis-bnpb")
URL = "https://gis.bnpb.go.id/databencana/tabel/pencarian.php"
TAHUN_AWAL = 2005
UA = {"User-Agent": "Mozilla/5.0 (compatible; centurisk97-pipa/1.0)"}
# nama kepala kolom (huruf kecil) -> kunci keluaran; dampak diparse int atau None
KOLOM = {"kode identitas bencana": "kib", "id kabupaten": "kab_kode", "tanggal kejadian": "tanggal", "kejadian": "jenis",
         "lokasi": "lokasi_mentah", "kabupaten": "kab", "provinsi": "prov", "kronologi & dokumentasi": "dokumentasi",
         "penyebab": "penyebab", "meninggal": "meninggal", "hilang": "hilang", "terluka": "luka", "rumah rusak": "rumah_rusak",
         "rumah terendam": "terendam", "fasum rusak": "fasum_rusak"}
DAMPAK = ["meninggal", "hilang", "luka", "rumah_rusak", "terendam", "fasum_rusak"]


class _Tabel(HTMLParser):
    """Kumpulkan baris <tr> -> daftar sel (teks, href pertama)."""
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.baris, self._sel, self._baris = [], None, None

    def handle_starttag(self, tag, a):
        if tag == "tr":
            self._baris = []
        elif tag == "td" and self._baris is not None:
            self._sel = {"t": [], "href": None}
        elif tag == "a" and self._sel is not None and self._sel["href"] is None:
            self._sel["href"] = dict(a).get("href") or None

    def handle_data(self, d):
        if self._sel is not None:
            self._sel["t"].append(d)

    def handle_endtag(self, tag):
        if tag == "td" and self._sel is not None and self._baris is not None:
            self._baris.append(("".join(self._sel["t"]), self._sel["href"]))
            self._sel = None
        elif tag == "tr" and self._baris is not None:
            if self._baris:
                self.baris.append(self._baris)
            self._baris = None


def angka(s):
    s = (s or "").strip()
    return int(s) if re.fullmatch(r"-?\d+", s) else None


def lokasi(teks):
    """Teks sel Lokasi -> (kec, desa). Baris berawalan Kec./Kecamatan = kec; Ds./Desa/Kel./Kelurahan = desa."""
    kec, desa = [], []
    for g in re.split(r"\\n|\n", teks or ""):
        g = g.strip().lstrip(".").strip()
        m = re.match(r"(?i)^(kec(?:amatan)?|ds|desa|kel(?:urahan)?)\b\.?\s*(.+)$", g)
        if not m or g.endswith(":") or g.startswith("("):
            continue
        n = m.group(2).strip(" :")
        if not n:
            continue
        (kec if m.group(1).lower().startswith("kec") else desa).append(n)
    return list(dict.fromkeys(kec)), list(dict.fromkeys(desa))


def urai(teks_html):
    """HTML halaman -> daftar kejadian. Kolom dicari dari baris kepala (mengandung 'Kode Identitas')."""
    p = _Tabel()
    p.feed(teks_html)
    idx = None
    for b in p.baris:
        nama = [re.sub(r"\s+", " ", html.unescape(t)).strip().lower() for t, _ in b]
        if "kode identitas bencana" in nama:
            idx = {KOLOM[n]: i for i, n in enumerate(nama) if n in KOLOM}
            break
    if idx is None:
        return []
    hasil = []
    for b in p.baris:
        if len(b) <= max(idx.values()) or not re.fullmatch(r"\d{4}-\d\d-\d\d", b[idx["tanggal"]][0].strip()):
            continue
        t = lambda k: re.sub(r"[ \t]+", " ", b[idx[k]][0]).strip() if k in idx else ""
        kk = t("kab_kode")
        kec, desa = lokasi(b[idx["lokasi_mentah"]][0])
        o = {"kib": t("kib") or None, "kab_kode": f"{kk[:2]}.{kk[2:]}" if re.fullmatch(r"\d{4}", kk) else (kk or None),
             "tanggal": t("tanggal"), "jenis": t("jenis"), "kab": t("kab"), "prov": t("prov"), "kec": kec, "desa": desa,
             "lokasi_mentah": b[idx["lokasi_mentah"]][0].strip(), "penyebab": t("penyebab").lstrip("●\t ").strip() or None,
             "dokumentasi": (b[idx["dokumentasi"]][1] or "").strip() or None}
        for k in DAMPAK:
            o[k] = angka(b[idx[k]][0]) if k in idx else None
        hasil.append(o)
    return hasil


def ambil(tahun):
    """Satu tahun penuh; cookie baru per permintaan; ulang 3x bila gagal atau 0 baris."""
    body = urllib.parse.urlencode({"s_provinsi": "", "s_kejadian": "", "tgl_awal": f"{tahun}-01-01",
                                   "tgl_akhir": f"{tahun}-12-31", "submit": "Cari"}).encode()
    for ke in range(3):
        try:
            op = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
            op.open(urllib.request.Request(URL, headers=UA), timeout=60).read()
            r = op.open(urllib.request.Request(URL, data=body, headers=UA), timeout=120).read().decode("utf-8", "replace")
            kej = urai(r)
            if kej:
                return kej
        except OSError as e:
            print(f"gis_kejadian {tahun}: percobaan {ke + 1} gagal: {e}", file=sys.stderr)
        time.sleep(2)
    return []


def simpan(tahun, kej):
    os.makedirs(KELUAR, exist_ok=True)
    p = os.path.join(KELUAR, f"kejadian_{tahun}.json")
    tmp = p + ".tmp"
    d = {"dibuat": dt.datetime.now(dt.timezone(dt.timedelta(hours=7))).isoformat(timespec="seconds"),
         "sumber": "gis.bnpb.go.id/databencana (portal publik, tidak resmi sebagai API)", "tahun": tahun, "jumlah": len(kej), "kejadian": kej}
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(d, f, ensure_ascii=False, separators=(",", ":"))
    os.replace(tmp, p)


def jalan(semua):
    ini = dt.date.today().year
    for th in (range(TAHUN_AWAL, ini + 1) if semua else (ini - 1, ini)):
        kej = ambil(th)
        if not kej:
            print(f"gis_kejadian {th}: 0 baris, tidak ditulis (pertahankan berkas lama)", file=sys.stderr)
        else:
            simpan(th, kej)
            print(f"gis_kejadian {th}: {len(kej)} baris")
        time.sleep(2)


CONTOH = """<table><thead><tr><td><b>No.</td><td><b>Kode Identitas Bencana</b></td><td><b>ID Kabupaten</b></td><td><b>Tanggal Kejadian</b></td>
<td><b>Kejadian</b></td><td><b>Lokasi</b></td><td><b>Kabupaten</b></td><td><b>Provinsi</b></td><td><b>Kronologi &amp; Dokumentasi</b></td>
<td><b>Penyebab</b></td><td><b>Meninggal</b></td><td><b>Hilang</b></td><td><b>Terluka</b></td><td><b>Rumah Rusak</b></td>
<td><b>Rumah Terendam</b></td><td><b>Fasum Rusak</b></td></tr></thead><tbody>
<tr><td>1</td><td>3506 101 20240105 1</td><td>3506</td><td>2024-01-05</td><td>BANJIR</td>
<td>Kecamatan:\\n(1 Kecamatan /  1  Desa)\\nKec. Daha Selatan\\nDs. Samuda</td><td>KEDIRI</td><td>JAWA TIMUR</td>
<td><a href="https://drive.google.com/x" target="_blank">Dokumentasi</a></td><td>\u25cf\tHujan deras</td><td>0</td><td>2</td><td>0</td><td>5</td><td>961</td><td>0</td></tr>
<tr><td>2</td><td>5271 101 20240105 1</td><td>5271</td><td>2024-01-05</td><td>BANJIR</td><td>Ampenan</td><td>KOTA MATARAM</td>
<td>NUSA TENGGARA BARAT</td><td><a href="" target="_blank">Dokumentasi</a></td><td></td><td>0</td><td>0</td><td></td><td>0</td><td></td><td>0</td></tr>
<tr><td>3</td><td>1403 101 20240105 1</td><td>1403</td><td>2024-01-05</td><td>BANJIR</td><td>Kec. A
Ds. B
Kec. C
. Ds. D
Kel. E</td><td>BENGKALIS</td><td>RIAU</td><td></td><td></td><td>1</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td></tr></tbody></table>"""


def uji():
    k = urai(CONTOH)
    assert len(k) == 3, len(k)
    a, b, c = k
    assert a["kib"] == "3506 101 20240105 1" and a["kab_kode"] == "35.06" and a["tanggal"] == "2024-01-05" and a["jenis"] == "BANJIR"
    assert a["kec"] == ["Daha Selatan"] and a["desa"] == ["Samuda"], (a["kec"], a["desa"])
    assert a["dokumentasi"] == "https://drive.google.com/x" and a["penyebab"] == "Hujan deras"
    assert (a["meninggal"], a["hilang"], a["luka"], a["rumah_rusak"], a["terendam"], a["fasum_rusak"]) == (0, 2, 0, 5, 961, 0)
    assert b["luka"] is None and b["terendam"] is None and b["meninggal"] == 0 and b["penyebab"] is None and b["dokumentasi"] is None
    assert b["kec"] == [] and b["lokasi_mentah"] == "Ampenan"
    assert c["kec"] == ["A", "C"] and c["desa"] == ["B", "D", "E"], (c["kec"], c["desa"])
    assert urai(CONTOH.replace("3506 101 20240105 1", ""))[0]["kib"] is None  # KIB kosong (2019, 2026) tetap terbaca
    assert urai("<html>kosong</html>") == []
    print("uji gis_kejadian: ok")


if __name__ == "__main__":
    a = sys.argv[1:]
    uji() if a == ["uji"] else jalan(a == ["semua"])
