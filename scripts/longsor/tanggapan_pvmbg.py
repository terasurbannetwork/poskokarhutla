"""Panen sekali arsip Tanggapan Gerakan Tanah MAGMA (PVMBG) -> label longsor berkoordinat (sumber ke-3 kejadian.py: pvmbg).

Persetujuan pemilik (10 Nov 2026): panen sekali, jeda >= 1,2 dtk/permintaan, nama petugas TIDAK disimpan,
signature/token TIDAK ditulis ke repo (diambil segar dari /v1 tiap sesi, hanya di memori).
Tahap 1 `daftar`: halaman ?page=N sampai kosong -> data/raw/longsor/magma/daftar.jsonl (BERLANJUT, per halaman).
Tahap 2 `detail`: POST /v1/json/gertan per id CRS -> detail.jsonl (BERLANJUT, per id).
Tahap 3 `susun`: gabung -> public/longsor/data/tanggapan_pvmbg.json (murni, tanpa jaringan).
Pakai: python3 scripts/longsor/tanggapan_pvmbg.py [daftar|detail|susun|uji]   (tanpa argumen: ketiganya)
"""
import html, http.cookiejar, json, os, re, sys, time, urllib.parse, urllib.request

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from dasar import AKAR, KELUAR, MENTAH, UA, WIB, simpan

HOST = "https://magma.esdm.go.id"
RAW = os.path.join(MENTAH, "magma")
JEDA = 1.2
BULAN = {b: i + 1 for i, b in enumerate("januari februari maret april mei juni juli agustus september oktober november desember".split())}
ATRIBUSI = "MAGMA Indonesia, PVMBG Badan Geologi KESDM (magma.esdm.go.id), Tanggapan Gerakan Tanah; panen sekali 2026, tanpa nama petugas."


# ---------- jaringan ----------
class Sesi:
    def __init__(self):
        self.o = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
        self.o.addheaders = [("User-Agent", UA["User-Agent"])]
        self.tok = self.url = None
        self.n = 0

    def _buka(self, req):
        for i in range(5):
            time.sleep(JEDA)
            try:
                with self.o.open(req, timeout=60) as r:
                    return r.read().decode("utf-8", "replace")
            except urllib.error.HTTPError as e:
                if e.code in (419, 403) and req.method == "POST":
                    self.tok = None  # token/signature kedaluwarsa: ambil ulang
                    raise
                if e.code == 404:
                    raise
                time.sleep(10 * (i + 1))
            except Exception:
                time.sleep(10 * (i + 1))
        raise RuntimeError("magma: gagal berulang " + req.full_url.split("?")[0])

    def halaman(self, n):
        return self._buka(urllib.request.Request(f"{HOST}/v1/gerakan-tanah/tanggapan?page={n}"))

    def masuk(self):
        t = self._buka(urllib.request.Request(HOST + "/v1"))
        self.tok = re.search(r'csrf-token" content="([^"]+)"', t).group(1)
        self.url = HOST + re.search(r'(/v1/json/gertan\?signature=[0-9a-f]+)', t).group(1)
        self.n = 0

    def detail(self, crs):
        for _ in range(3):
            if not self.tok or self.n >= 300:
                self.masuk()
            self.n += 1
            req = urllib.request.Request(self.url, data=urllib.parse.urlencode({"id": crs}).encode(), method="POST",
                                         headers={"X-CSRF-TOKEN": self.tok, "X-Requested-With": "XMLHttpRequest"})
            try:
                return json.loads(self._buka(req))
            except urllib.error.HTTPError:
                continue
        raise RuntimeError("detail gagal " + crs)


# ---------- penguraian (murni) ----------
def tgl_indo(s):
    """'Senin, 27 April 2020 pukul 06:00:00' atau 'tanggal 2023-05-04' -> 'YYYY-MM-DD' atau None."""
    m = re.search(r"(\d{4})-(\d\d)-(\d\d)", s)
    if m:
        return m.group(0)
    m = re.search(r"(\d{1,2}) ([A-Za-z]+) (\d{4})", s)
    if m and m.group(2).lower() in BULAN:
        return f"{m.group(3)}-{BULAN[m.group(2).lower()]:02d}-{int(m.group(1)):02d}"
    return None


def koordinat(s):
    """'posisi -0.391964 LU dan 100.2992789 BT' -> (lat, lon). Tanda angka dipakai apa adanya; 'LS' berangka positif dibalik."""
    m = re.search(r"(-?\d+(?:\.\d+)?)\s*(LU|LS)\s*(?:dan|,)?\s*(-?\d+(?:\.\d+)?)\s*(BT|BB)", s)
    if not m:
        return None
    lat, lon = float(m.group(1)), float(m.group(3))
    if m.group(2) == "LS" and lat > 0:
        lat = -lat
    if m.group(4) == "BB" and lon > 0:
        lon = -lon
    return lat, lon


def lokasi(judul):
    """'Laporan Tanggapan Gerakan Tanah di Desa, Kec, Kabupaten X, Provinsi' -> (kec, kab, prov)."""
    p = [x.strip() for x in re.sub(r"^.*? di ", "", judul, count=1).split(",")]
    p = [x for x in p if x]
    prov = p[-1] if p else None
    kab = p[-2] if len(p) >= 2 else None
    kec = p[-3] if len(p) >= 3 else None
    return kec, kab, prov


def parse_daftar(t):
    """HTML halaman daftar -> [{id,judul,desk,zona}]. Nama petugas sengaja tidak diambil."""
    out = []
    for b in t.split('<div class="timeline-item">')[1:]:
        m = re.search(r"/tanggapan/(CRS\d+)\?signature", b)
        j = re.search(r'timeline-title"><a>(.*?)</a>', b, re.S)
        if not (m and j):
            continue
        isi = [html.unescape(re.sub(r"<[^>]+>", "", x)).strip() for x in re.findall(r'<p class="blog-text">(.*?)</p>', b, re.S)]
        z = next((x for x in isi if "Zona Potensi" in x), "")
        out.append({"id": m.group(1), "judul": html.unescape(j.group(1)).strip(), "desk": isi[0] if isi else "", "zona": z})
    return out


def angka_dampak(h):
    """Teks dampak (HTML) -> dict hitungan terurai; kunci hanya bila ada. Penjumlahan per kategori."""
    t = html.unescape(re.sub(r"<[^>]+>|<Br>", "\n", h or "", flags=re.I)).lower()
    r = {}
    for kal in re.split(r"[\n.;]", t):
        n = re.search(r"(\d+)", kal)
        if not n:
            continue
        v = int(n.group(1))
        if re.search(r"rumah", kal) and re.search(r"rusak|hancur|roboh|tertimbun|terendam|terdampak", kal):
            r["rumah"] = r.get("rumah", 0) + v
        elif re.search(r"meninggal|tewas|korban jiwa|korban tewas", kal):
            r["meninggal"] = r.get("meninggal", 0) + v
        elif re.search(r"luka", kal):
            r["luka"] = r.get("luka", 0) + v
        elif re.search(r"hilang", kal):
            r["hilang"] = r.get("hilang", 0) + v
        elif re.search(r"mengungsi|pengungsi", kal):
            r["ungsi"] = r.get("ungsi", 0) + v
    return r


def satu(d, det):
    """Daftar + detail (boleh None) -> baris keluaran atau None bila tanpa tanggal/koordinat."""
    tgl = tgl_indo(d["desk"].split(" pada ", 1)[-1]) if " pada " in d["desk"] else None
    ll = koordinat(d["desk"])
    lap = (det or {}).get("laporan") or {}
    if not ll and lap.get("deskripsi"):
        ll = koordinat(lap["deskripsi"])
    if not tgl or not ll:
        return None
    kec, kab, prov = lokasi(d["judul"])
    tg = (det or {}).get("tanggapan") or {}
    kd = tg.get("kondisi") or {}
    z = re.search(r"Zona Potensi Gerakan Tanah ([A-Za-z]+(?: hingga [A-Za-z]+)?)", d["zona"] or kd.get("kerentanan", ""))
    lr = re.search(r"kemiringan lereng (.+)$", kd.get("morfologi", ""))
    fm = re.search(r"formasi (.+?)\. Jenis Batuan", kd.get("geologi", ""))
    tg_l = re.search(r"berupa (.+?)\.?$", kd.get("tata_guna_lahan", "").strip())
    dp = angka_dampak(tg.get("dampak"))
    return {"id": d["id"], "tgl": tgl, "lat": ll[0], "lon": ll[1], "kec": kec, "kab": kab, "prov": prov,
            "tipe": None if (tg.get("tipe") or "Belum").startswith("Belum") else tg["tipe"], "lereng": lr.group(1).strip() if lr else None,
            "geologi": fm.group(1).strip() if fm else None, "lahan": tg_l.group(1).strip() if tg_l else None,
            "zona": z.group(1) if z else None, "dampak": dp or None}


# ---------- tahapan ----------
def _jsonl(p):
    return [json.loads(x) for x in open(p)] if os.path.exists(p) else []


def tahap_daftar():
    os.makedirs(RAW, exist_ok=True)
    p = os.path.join(RAW, "daftar.jsonl")
    ada = _jsonl(p)
    ada_id = {x["id"] for x in ada}
    hal = max([x.get("hal", 0) for x in ada] + [0]) + 1
    s = Sesi()
    with open(p, "a") as f:
        while True:
            baris = parse_daftar(s.halaman(hal))
            if not baris:
                print(f"daftar: halaman {hal} kosong, selesai ({len(ada_id)} id)", file=sys.stderr)
                return
            for b in baris:
                if b["id"] not in ada_id:
                    ada_id.add(b["id"])
                    f.write(json.dumps({**b, "hal": hal}, ensure_ascii=False) + "\n")
            f.flush()
            if hal % 10 == 0:
                print(f"daftar: halaman {hal}, {len(ada_id)} id", file=sys.stderr)
            hal += 1


def tahap_detail():
    p = os.path.join(RAW, "detail.jsonl")
    sudah = {x["id"] for x in _jsonl(p)}
    s, n = Sesi(), 0
    with open(p, "a") as f:
        for d in _jsonl(os.path.join(RAW, "daftar.jsonl")):
            if d["id"] in sudah:
                continue
            try:
                r = s.detail(d["id"])
                dat = r.get("data") or {}
            except Exception as e:
                print(f"detail {d['id']}: {e}", file=sys.stderr)
                dat = {}
            dat.get("laporan", {}).pop("pelapor", None)  # nama petugas tidak disimpan
            f.write(json.dumps({"id": d["id"], "data": dat}, ensure_ascii=False) + "\n")
            f.flush()
            n += 1
            if n % 100 == 0:
                print(f"detail: {n} baru", file=sys.stderr)


def tahap_susun():
    det = {x["id"]: x["data"] for x in _jsonl(os.path.join(RAW, "detail.jsonl"))}
    baris = [b for b in (satu(d, det.get(d["id"])) for d in _jsonl(os.path.join(RAW, "daftar.jsonl"))) if b]
    baris.sort(key=lambda b: (b["tgl"], b["id"]))
    tg = [b["tgl"] for b in baris]
    simpan(os.path.join(KELUAR, "tanggapan_pvmbg.json"), {
        "atribusi": ATRIBUSI, "n": len(baris), "rentang": [tg[0], tg[-1]] if tg else None,
        "catatan": "tgl = tanggal KEJADIAN (bukan tanggal laporan). dampak: rumah (rusak/hancur/roboh/terendam), meninggal, luka, hilang, ungsi, hanya bila tertulis angka.",
        "kejadian": baris})
    print(f"tanggapan_pvmbg: {len(baris)} kejadian {tg[:1]}..{tg[-1:]}", file=sys.stderr)


def uji():
    assert tgl_indo("pada Senin, 27 April 2020 pukul 06:00:00 WIB") == "2020-04-27"
    assert tgl_indo("pada tanggal 2023-05-04 pukul") == "2023-05-04"
    assert koordinat("posisi -0.391964 LU dan 100.2992789 BT.") == (-0.391964, 100.2992789)  # tanda dipakai
    assert koordinat("posisi 6.5 LS dan 105.9 BT") == (-6.5, 105.9) and koordinat("tanpa") is None
    assert lokasi("Laporan Tanggapan Gerakan Tanah di Malalak Timur, Malalak, Kabupaten Agam, Sumatera Barat") == ("Malalak", "Kabupaten Agam", "Sumatera Barat")
    assert angka_dampak("<p>4 unit rumah rusak.</p><p>2 unit rumah hancur.</p><p>1 unit bangunan rusak.</p><p>2 orang meninggal dunia</p>") == {"rumah": 6, "meninggal": 2}
    d = {"id": "CRS1", "judul": "Laporan Tanggapan Gerakan Tanah di A, B, Kabupaten C, Banten",
         "desk": "Gerakan tanah terjadi di A pada Senin, 27 April 2020 pukul 06:00:00 WIB. Secara Geografis posisi -6.5 LU dan 105.9 BT.",
         "zona": "Lokasi bencana berada pada Zona Potensi Gerakan Tanah Menengah hingga Tinggi."}
    det = {"tanggapan": {"tipe": "Longsoran", "dampak": "", "kondisi": {"morfologi": "daerah pedataran yang memiliki kemiringan lereng Miring : 4º - 8º",
           "geologi": "tersusun oleh formasi Formasi X. Jenis Batuan di antaranya", "tata_guna_lahan": "berupa Pemukiman, Kebun."}}}
    r = satu(d, det)
    assert r["tgl"] == "2020-04-27" and r["lat"] == -6.5 and r["zona"] == "Menengah hingga Tinggi" and r["geologi"] == "Formasi X" and r["lahan"] == "Pemukiman, Kebun", r
    assert satu(d, {"tanggapan": {"tipe": "Belum dilaporkan."}})["tipe"] is None
    assert satu({**d, "desk": "tanpa apa-apa"}, None) is None
    html_ = '<div class="timeline-item">x <p class="timeline-title"><a>Laporan di A, B, Kabupaten C, Banten</a></p><p class="blog-text">isi pada 1 Mei 2020</p><a href="/tanggapan/CRS20200430100751?signature=ab">Lihat Detail</a>'
    assert parse_daftar(html_)[0]["id"] == "CRS20200430100751"
    print("tanggapan_pvmbg: uji lolos")


if __name__ == "__main__":
    a = sys.argv[1:]
    if a == ["uji"]:
        uji()
    else:
        for nama, fn in (("daftar", tahap_daftar), ("detail", tahap_detail), ("susun", tahap_susun)):
            if not a or nama in a:
                fn()
