#!/usr/bin/env python3
"""Peta data otomatis (10 Nov 2026): tiap berkas keluaran data dan tabel D1 sumber luar,
siapa penulisnya, kapan jalan, siapa pemakainya. Semua dari kode nyata.

  python3 scripts/agents/peta_data.py bangun   -> docs/PETA-DATA.md + docs/peta_data.json
  python3 scripts/agents/peta_data.py periksa  -> gagal bila ada yatim/tanpa-jadwal BARU
  python3 scripts/agents/peta_data.py uji      -> self-check

Opsi: --akar DIR (akar repo; fixture uji), --utang BERKAS (daftar utang), --laporan DIR.
Aturan pemilik 10 Nov 2026: tiap data eksternal punya pemakai nyata, tiap angka yang
sama cocok di semua tempat.

Batas heuristik (jujur): penulis = skrip scripts/**|src/** yang memuat nama berkas DAN
penanda tulis; nama berkas yang dirakit f-string tidak terlacak (penulis kosong ->
status `statis` bila ada pemakai, dengan catatan). Status memakai pemakai di repo saja;
pemakai di folder laporan lokal ditampilkan terpisah dan tidak mengubah status.
"""
import json, os, re, sys
from pathlib import Path

INI = Path(__file__).resolve().parent
AKAR0 = INI.parent.parent
UTANG0 = AKAR0 / "tests/agen/fixtures/peta-data-utang.json"
LAPORAN0 = Path.home() / "Documents/Laporan-Harian-BNPB/mesin"

LEMBAGA = {
    "bmkg.go.id": "BMKG", "inatews": "BMKG (InaTEWS)", "firms": "NASA FIRMS", "nasa.gov": "NASA",
    "usgs.gov": "USGS", "jtwc": "JTWC", "navy.mil": "JTWC (US Navy)", "esdac": "Copernicus",
    "copernicus": "Copernicus", "ecmwf": "ECMWF", "open-meteo": "Open-Meteo", "openaq": "OpenAQ",
    "bnpb.go.id": "BNPB", "esdm.go.id": "ESDM/PVMBG", "pvmbg": "ESDM/PVMBG", "kemenhut": "Kemenhut",
    "menlhk.go.id": "KLHK", "sipongi": "KLHK (SiPongi)", "bps.go.id": "BPS", "pusair": "PUPR",
    "openstreetmap": "OpenStreetMap", "overpass": "OpenStreetMap", "jma.go.jp": "JMA",
    "noaa.gov": "NOAA", "nasa": "NASA", "worldpop": "WorldPop", "gdacs": "GDACS", "himawari": "JMA/BMKG Himawari",
    "gov.id": "pemerintah ID", "go.id": "pemerintah ID",
}
IGNORE_HOST = ("localhost", "127.0.0.1", "w3.org", "example.", "schema.org", "github.com", "githubusercontent",
               "cloudflare", "googleapis", "gstatic", "jsdelivr", "unpkg", "wikipedia", "creativecommons")
TULIS = re.compile(r"write_text|write_bytes|json\.dump|writeFile|writeFileSync|open\([^)]*[\"']w|simpan|\.put\(|atomic|tulis|INSERT\s+(OR\s+\w+\s+)?INTO", re.I)
URL = re.compile(r"https?://[^\s\"'<>)\]\\`}]+")
TOKEN = re.compile(r"[A-Za-z0-9_\-]+(?:\.json)?")
TGL = re.compile(r"[_\-]\d{4}-\d{2}(?:-\d{2})?(?=\.json$|$)")
STAF = ("public/admin/", "public/bnpb/", "public/petugas/", "public/akademisi", "public/logpal/", "public/pipa/",
        "public/direktori", "public/kemitraan", "public/staf")
SKIP = ("node_modules/", ".git/", "tests/", "docs/", ".claude/", "scripts/agents/peta_data.py")


def baca(p):
    try:
        return p.read_text("utf-8", "ignore")
    except OSError:
        return ""


def semua(akar, pola):
    out = []
    for r, ds, fs in os.walk(akar):
        ds[:] = [d for d in ds if d not in ("node_modules", ".git", ".claude", "tests", "docs")]
        for f in fs:
            if re.search(r" 2(\.|$)", f):
                continue
            p = Path(r) / f
            rel = p.relative_to(akar).as_posix()
            if re.search(pola, rel):
                out.append((rel, p))
    return out


def akar_data(rel):
    """public/data atau public/<modul>/data; None bila bukan."""
    m = re.match(r"(public/data|public/[^/]+/data)/", rel)
    return m.group(1) if m else None


def entri_data(akar):
    """Daftar (nama, jenis, contoh, jumlah). Subdir >25 berkas jadi keluarga; stem bertanggal digabung."""
    pohon = {}
    for rel, p in semua(akar, r"^public/.*data/.*\.json$"):
        r = akar_data(rel)
        if r:
            pohon.setdefault(r, []).append(rel[len(r) + 1:])
    hasil = []

    def total(berkas, pre):
        return sum(1 for b in berkas if b.startswith(pre))

    def jalan(root, berkas, pre, akar_root):
        langsung = [b for b in berkas if b.startswith(pre) and "/" not in b[len(pre):]]
        subs = sorted({b[len(pre):].split("/")[0] for b in berkas if b.startswith(pre) and "/" in b[len(pre):]})
        if len(langsung) > 12 and not akar_root:
            hasil.append((f"{root}/{pre}*.json", "keluarga", pre.rstrip("/"), len(langsung)))
        else:
            kel = {}
            for b in langsung:
                n = b[len(pre):]
                s = TGL.sub("*", n)
                kel.setdefault(s, []).append(n)
            for s, ns in kel.items():
                if "*" in s and len(ns) >= 1 and s != ns[0]:
                    hasil.append((f"{root}/{pre}{s}", "berkas", s, len(ns)))
                else:
                    hasil.append((f"{root}/{pre}{ns[0]}", "berkas", ns[0], 1))
        for s in subs:
            sub = pre + s + "/"
            n = total(berkas, sub)
            if n > 25:
                jalan(root, berkas, sub, False)
            else:
                hasil.append((f"{root}/{sub}**", "keluarga", s, n))

    for root, berkas in sorted(pohon.items()):
        jalan(root, berkas, "", True)
    return hasil


def tabel_d1(akar):
    t = set()
    for rel, p in semua(akar, r"^migrations/.*\.sql$"):
        t.update(re.findall(r"CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?[\"`]?(\w+)", baca(p), re.I))
    return sorted(t)


class Indeks:
    def __init__(self, akar, laporan):
        self.akar = akar
        self.teks = {}
        for rel, p in semua(akar, r"^(scripts|src)/.*\.(py|mjs|js|sh)$"):
            if not rel.startswith(SKIP):
                self.teks[rel] = baca(p)
        self.layar = {}
        for rel, p in semua(akar, r"^public/.*\.(js|mjs|html)$"):
            if "/data/" in rel or "/vendor/" in rel or "/lib/" in rel:
                continue
            self.layar[rel] = baca(p)
        self.lap = {}
        if laporan and Path(laporan).is_dir():
            for rel, p in semua(laporan, r"\.(py|js)$"):
                self.lap[rel] = baca(p)
        self.wf = {rel: baca(p) for rel, p in semua(akar, r"^\.github/workflows/.*\.ya?ml$")}
        self.idx = {}
        for sumber, kumpul in (("s", self.teks), ("p", self.layar), ("l", self.lap)):
            for rel, t in kumpul.items():
                for tok in set(TOKEN.findall(t)):
                    self.idx.setdefault(tok, set()).add((sumber, rel))
        self.jadwal = self._jadwal()

    # --- jadwal: skrip terjadwal = disebut di workflow ber-cron/dirantai, plus yang diimpor skrip terjadwal
    def _jadwal(self):
        ket = {}
        wtag = {}
        for w, t in self.wf.items():
            cron = re.findall(r"cron:\s*[\"']([^\"']+)", t)
            if cron:
                tag = f"{Path(w).name} cron {' | '.join(cron)}"
            elif re.search(r"workflow_run", t):
                tag = f"{Path(w).name} dirantai"
            else:
                continue
            wtag[w] = tag
            for s in set(re.findall(r"(?:scripts|src)/[\w./\-]+\.(?:py|mjs|js|sh)", t)):
                ket.setdefault(s, set()).add(tag)
        for rel in self.teks:
            if rel.startswith("scripts/") and rel not in ket:
                d, f = rel[len("scripts/"):].split("/")[0], Path(rel).stem
                pola = re.compile(rf"(?<![\w])(?:scripts/)?{re.escape(d)}/{re.escape(f)}(?![\w])")
                for w, tag in wtag.items():
                    if pola.search(self.wf[w]):
                        ket.setdefault(rel, set()).add(tag)
        stem_ke = {}
        for rel in self.teks:
            stem_ke.setdefault(Path(rel).stem, []).append(rel)
        antre = list(ket)
        while antre:
            induk = antre.pop()
            t = self.teks.get(induk)
            if t is None:
                continue
            ref = set(re.findall(r"(?:from|import)\s+(?:[\w.]+\.)?(\w+)", t))
            ref |= {m.rsplit("/", 1)[-1] for m in re.findall(r"[\w./\-]+(?=\.(?:py|mjs|js)\b)", t)}
            sepohon = Path(induk).parent
            ref |= {q for q in re.findall(r"[\"']([a-z][a-z0-9_]+)[\"']", t)
                    if (sepohon / (q + ".py")).as_posix() in self.teks or (sepohon / (q + ".mjs")).as_posix() in self.teks}
            for r in ref:
                for rel in stem_ke.get(r, ()):
                    if rel != induk and rel.startswith("scripts/") and rel not in ket:
                        ket[rel] = set(ket[induk])
                        antre.append(rel)
        return ket

    def cocok(self, kunci, jenis):
        """Set (sumber, rel) yang memuat nama; keluarga/prefiks lewat awalan token."""
        if jenis == "kunci":
            return set(self.idx.get(kunci, ()))
        if kunci.endswith("*.json") or "*" in kunci:
            awal = kunci.split("*")[0]
            out = set()
            for tok, v in self.idx.items():
                if tok.startswith(awal) and len(awal) >= 4:
                    out |= v
            return out
        return set(self.idx.get(kunci, ()))


def lembaga_dari(urls):
    ss = []
    for u in urls:
        h = u.lower()
        for k, v in LEMBAGA.items():
            if k in h:
                ss.append(v)
                break
        else:
            ss.append(re.sub(r"^https?://(www\.)?", "", h).split("/")[0])
    return sorted(set(ss))


def kelas_pemakai(sumber, rel):
    if sumber == "l":
        return "laporan"
    if sumber == "p":
        return "layar staf" if rel.startswith(STAF) else "layar publik"
    if rel.startswith("src/"):
        return "peringatan" if re.search(r"peringatan|alarm|ews|notif|wa_|push", rel) else "worker"
    return "model/turunan"


def menulis(t, kunci):
    """Penanda tulis dalam 8 baris dari kemunculan nama (ponytail: nama lewat konstanta jauh tak terlacak)."""
    awal = kunci.split("*")[0].rstrip("/")
    if not awal:
        return False
    L = t.split("\n")
    for i, ln in enumerate(L):
        if awal in ln and TULIS.search("\n".join(L[max(0, i - 8):i + 9])):
            return True
    return False


def dasar(ent, ind):
    """Bangun satu baris peta untuk berkas/keluarga data."""
    nama, jenis, kunci, n = ent
    jenis_cari = "kunci"
    if jenis == "keluarga":
        kunci_cari = kunci.split("/")[-1] if not kunci.endswith("*.json") else kunci
    else:
        kunci_cari = kunci
    # untuk keluarga nested, verifikasi jalur induk agar token umum ("daerah") tak positif palsu
    leaf = nama.split("/")
    induk = "/".join(leaf[-3:-1]) if jenis == "keluarga" and not nama.endswith("*.json") else None
    hit = ind.cocok(kunci_cari, jenis_cari if "*" not in kunci_cari else "pref")
    if jenis == "keluarga" and nama.endswith("*.json"):  # keluarga langsung: nama direktori
        hit = ind.cocok(kunci.split("/")[-1], "kunci")
    longgar = set()
    if jenis == "berkas" and "*" not in kunci_cari:
        st = kunci_cari[:-5]
        if "_" in st and len(st) >= 8:
            longgar = {x for x in ind.idx.get(st, ()) if x not in hit}
    pen, pak = [], {}
    arsip_nama = "arsip" in nama
    for sumber, rel in sorted(hit | longgar):
        if rel == "scripts/agents/peta_data.py":
            continue
        if (sumber, rel) in longgar and sumber == "s":
            pak.setdefault("model/turunan (nama tanpa .json)", set()).add(rel)
            continue
        if sumber == "s":
            t = ind.teks[rel]
            if induk and induk.split("/")[-1] not in t:
                continue
            if menulis(t, kunci_cari):
                pen.append(rel)
            if not rel.startswith("src/") and rel not in pen:
                pak.setdefault("model/turunan", set()).add(rel)
            elif rel.startswith("src/"):
                pak.setdefault(kelas_pemakai("s", rel), set()).add(rel)
        else:
            t = (ind.layar if sumber == "p" else ind.lap)[rel]
            if induk and induk.split("/")[-1] not in t:
                continue
            ks = kelas_pemakai(sumber, rel) + (" (nama tanpa .json)" if (sumber, rel) in longgar else "")
            pak.setdefault(ks, set()).add(rel)
    # penulis yang membaca dirinya sendiri bukan pemakai
    pak = {k: sorted(v - set(pen)) for k, v in pak.items()}
    pak = {k: v for k, v in pak.items() if v}
    urls = sorted({u.rstrip(".,;") for p in pen for u in URL.findall(ind.teks[p]) if not any(i in u.lower() for i in IGNORE_HOST)})
    jad = sorted({j for p in pen for j in ind.jadwal.get(p, ())})
    return {"berkas": nama, "jenis": jenis, "jumlah": n, "lembaga": lembaga_dari(urls), "url": urls[:4],
            "penulis": pen, "jadwal": jad or ["TIDAK ADA"], "pemakai": pak, "arsip": arsip_nama}


def status(b):
    pakai_repo = {k: v for k, v in b["pemakai"].items() if not k.startswith("laporan")}
    jadwal = b["jadwal"] != ["TIDAK ADA"]
    if not pakai_repo:
        return "arsip" if b["arsip"] else "yatim"
    if b["arsip"] and not jadwal and not b["penulis"]:
        return "arsip"
    if b.get("jenis") == "d1" and not jadwal:
        return "statis"  # diisi lewat rute/permintaan, bukan jadwal
    if jadwal:
        return "terpakai"
    if b["penulis"] and b["url"]:
        return "tanpa-jadwal"
    return "statis"


def d1_baris(akar, ind):
    out = []
    wsrc = ind.teks.get("src/worker.js", "")
    m = re.search(r"async\s+scheduled\s*\(", wsrc)
    sched = wsrc[m.start():] if m else ""
    imp = {}
    for nm, f in re.findall(r"import\s*\{([^}]*)\}\s*from\s*[\"']\./(\w+)\.js[\"']", wsrc)[:0]:
        pass
    for isi, f in re.findall(r"import\s*\{([^}]*)\}\s*from\s*[\"']\./(\w+)\.js[\"']", wsrc):
        imp[f"src/{f}.js"] = [x.split(" as ")[-1].strip() for x in isi.split(",") if x.strip()]
    for tb in tabel_d1(akar):
        tulis = [r for r in sorted(x for k, x in ind.idx.get(tb, ()) if k == "s") if r.startswith("src/")
                 for t in [ind.teks[r]] if re.search(rf"(?:INSERT\s+(?:OR\s+\w+\s+)?INTO|REPLACE\s+INTO)\s+{tb}\b", t, re.I)]
        luar = [r for r in tulis if re.search(r"fetch\(", ind.teks[r]) and any(not any(i in u.lower() for i in IGNORE_HOST) for u in URL.findall(ind.teks[r]))]
        if not luar:
            continue
        urls = sorted({u.rstrip(".,;") for r in luar for u in URL.findall(ind.teks[r]) if not any(i in u.lower() for i in IGNORE_HOST)})
        jad = []
        for r in luar:
            if r == "src/worker.js" or any(re.search(rf"\b{re.escape(n)}\b", sched) for n in imp.get(r, [])):
                jad.append("worker scheduled() cron")
        pak = {}
        for sumber, rel in ind.idx.get(tb, ()):
            if sumber == "l" or rel in tulis:
                continue
            t = (ind.teks if sumber == "s" else ind.layar)[rel]
            pak.setdefault(kelas_pemakai(sumber, rel), set()).add(rel)
        for r in luar:
            if re.search(rf"(?:FROM|JOIN)\s+{tb}\b", ind.teks[r], re.I):
                pak.setdefault("worker", set()).add(r)
        # tabel dibaca oleh berkas penulisnya sendiri tidak dihitung; pemakai lain lewat SELECT/FROM/JOIN
        pak = {k: sorted(v) for k, v in pak.items() if v}
        out.append({"berkas": f"D1:{tb}", "jenis": "d1", "jumlah": 1, "lembaga": lembaga_dari(urls), "url": urls[:4],
                    "penulis": luar, "jadwal": sorted(set(jad)) or ["TIDAK ADA"], "pemakai": pak, "arsip": False})
    return out


# pasangan angka sama dari sumber berbeda; hanya ditulis bila kedua berkas ada di peta. Tanpa penilaian.
PASANGAN = [
    ("Titik panas karhutla", "hotspot FIRMS (VIIRS/MODIS, semua kepercayaan)", "public/data/hotspot.json",
     "hotspot BMKG kepercayaan tinggi", "public/banjir/data/karhutla_bmkg.json"),
    ("PM2,5", "PM2,5 model/prakiraan", "public/udara/data/uji_panen_pm25.json", "PM2,5 stasiun BMKG", "public/udara/data/bmkg_pm25.json"),
    ("Modifikasi cuaca (OMC)", "operasi OMC publikasi BMKG", "public/udara/data/omc_bmkg.json",
     "logbook OMC Dalops BNPB", "public/data/bnpb/logbook_omc.json"),
    ("Siklon tropis", "JTWC", "public/banjir/data/cuaca_siklon.json", "BMKG/TCWC", "public/banjir/data/cuaca_siklon_bmkg.json"),
    ("Peringatan dini cuaca", "peringatan sistem sendiri", "public/banjir/data/peringatan.json",
     "peringatan BMKG", "public/banjir/data/peringatan_bmkg.json"),
    ("Gempa", "katalog InaTEWS BMKG", "public/gempa/data/inatews_katalog.json", "katalog merusak/tsunami", "public/gempa/data/katalog_merusak.json"),
    ("Petir", "petir BMKG", "public/banjir/data/cuaca_petir.json", "petir arsip BMKG", "public/banjir/data/cuaca_petir_arsip_2026-11.json"),
    ("Hotspot 24 jam", "hotspot.json", "public/data/hotspot.json", "hotspot24.json", "public/data/hotspot24.json"),
]


def pasangan(baris):
    ada = {b["berkas"] for b in baris}

    def cari(path):
        for n in ada:
            if n == path or (("*" in n) and path.startswith(n.split("*")[0]) and path.endswith(n.split("*")[-1])):
                return n
        return None
    out = []
    for konsep, la, a, lb, b in PASANGAN:
        na, nb = cari(a), cari(b)
        if na and nb:
            out.append({"konsep": konsep, "a": {"label": la, "berkas": na}, "b": {"label": lb, "berkas": nb}})
    return out


USUL_KELAS = [
    (r"cuaca|petir|siklon|peringatan|factsheet|sepekan|maritim|gelombang", "kartu di layar Cuaca (`/cuaca`) dan lampiran Laporan Kejadian Bencana Harian"),
    (r"gempa|inatews|tsunami", "kartu di layar Gempa (`/gempa`) dan peringatan dini lintas-sumber"),
    (r"omc|pm25|himawari|udara|awan", "kartu di layar Udara (`/udara`) dan Laporan Penanganan Karhutla"),
    (r"hotspot|titik|karhutla|kanal|konsesi|kemenhut|lahan", "layar Karhutla di peta utama dan Laporan Penanganan Karhutla"),
    (r"banjir|genangan|bendungan|hujan|bahaya", "layar Banjir (`/banjir`) dan model bahaya"),
    (r"gunung|abu|longsor", "layar Gunung Api atau Longsor"),
    (r"kemitraan|akademisi|direktori", "layar staf `/kemitraan` atau `/direktori`"),
    (r"bnpb|desa|presiden|operasi", "layar staf `/bnpb` atau panel `/presiden`"),
]


def usul(b):
    for pola, teks in USUL_KELAS:
        if re.search(pola, b["berkas"], re.I):
            return teks
    return "tentukan pemilik: sambungkan ke layar modulnya, ke laporan harian, atau hentikan penulisnya"


def susun(akar, laporan):
    ind = Indeks(akar, laporan)
    baris = [dasar(e, ind) for e in entri_data(akar)] + d1_baris(akar, ind)
    for b in baris:
        b["status"] = status(b)
        b["catatan"] = ("penulis tak ketemu (nama dirakit f-string atau ditulis di workflow)"
                        if not b["penulis"] and b["jenis"] != "d1" else "")
        b["laporan_lokal"] = [x for k, v in b["pemakai"].items() if k.startswith("laporan") for x in v]
    return {"baris": baris, "pasangan": pasangan(baris), "tanggal": "2026-11-10"}


def hitung(peta):
    h = {}
    for b in peta["baris"]:
        h[b["status"]] = h.get(b["status"], 0) + 1
    return h


def muat_utang(p):
    try:
        return json.loads(Path(p).read_text("utf-8"))
    except OSError:
        return {"yatim": [], "tanpa-jadwal": [], "pengecualian": {}}


def periksa(peta, utang):
    """Daftar pelanggaran (teks). Pesan: sebab, akibat, perbaikan."""
    salah = []
    ada = {b["berkas"]: b["status"] for b in peta["baris"]}
    for st in ("yatim", "tanpa-jadwal"):
        izin = set(utang.get(st, [])) | set(utang.get("pengecualian", {}))
        for n, s in ada.items():
            if s == st and n not in izin:
                salah.append(f"{n} berstatus {st}: data diambil tetapi "
                             + ("tidak ada layar/laporan/model/peringatan yang memakainya" if st == "yatim"
                                else "tidak ada workflow/cron yang menjalankan penulisnya")
                             + ". Akibatnya data kosong yang membusuk (aturan pemilik 10 Nov 2026). "
                             + "Perbaiki: sambungkan pemakai/jadwal; kalau memang sah, tambahkan ke `pengecualian` "
                             + "di tests/agen/fixtures/peta-data-utang.json dengan {alasan, tanggal}.")
    for n, e in utang.get("pengecualian", {}).items():
        if not (isinstance(e, dict) and len(e.get("alasan", "")) >= 15 and re.match(r"\d{4}-\d{2}-\d{2}$", e.get("tanggal", ""))):
            salah.append(f"pengecualian {n} tanpa alasan >= 15 karakter dan tanggal YYYY-MM-DD.")
    for st in ("yatim", "tanpa-jadwal"):
        for n in utang.get(st, []):
            if ada.get(n) != st:
                salah.append(f"utang {st} `{n}` sudah lunas atau hilang (status sekarang: {ada.get(n, 'tidak ada')}). "
                             "Ratchet hanya boleh menyusut: hapus entri ini dari tests/agen/fixtures/peta-data-utang.json.")
    return salah


def md(peta):
    L = ["# Peta data (dihasilkan, jangan disunting)", "",
         "Dihasilkan `python3 scripts/agents/peta_data.py bangun` dari kode nyata. Aturan pemilik 10 Nov 2026: "
         "tiap data eksternal punya pemakai nyata, dan tiap angka yang sama harus cocok di semua tempat.", "",
         "Status: `terpakai` (ada pemakai + penjadwal), `yatim` (tanpa pemakai), `tanpa-jadwal` (sumber luar, ada pemakai, penjadwal tidak ditemukan), "
         "`arsip` (append-only), `statis` (ada pemakai, tanpa penulis terjadwal atau tanpa sumber luar). "
         "Heuristik: penulis = skrip yang memuat nama berkas dan penanda tulis; nama dirakit f-string tak terlacak. "
         "Pemakai di folder laporan lokal dicatat terpisah dan tidak mengubah status.", "", "## Ringkasan", ""]
    h = hitung(peta)
    L += [f"- {k}: {v}" for k, v in sorted(h.items())] + [f"- total entri: {len(peta['baris'])}", ""]
    for st in ("yatim", "tanpa-jadwal"):
        L += [f"## Daftar {st}", ""]
        for b in peta["baris"]:
            if b["status"] == st:
                L.append(f"- `{b['berkas']}`" + (f" ({b['jumlah']} berkas)" if b["jumlah"] > 1 else "")
                         + (f" , penulis {', '.join(b['penulis'][:2])}" if b["penulis"] else "")
                         + (f" , laporan lokal memakai: {', '.join(b['laporan_lokal'][:2])}" if b["laporan_lokal"] else ""))
        L.append("")
    L += ["## Peta lengkap", "",
          "| Berkas | Lembaga | URL | Penulis | Jadwal | Pemakai | Status |", "|---|---|---|---|---|---|---|"]
    for b in sorted(peta["baris"], key=lambda x: x["berkas"]):
        pk = "; ".join(f"{k}: {len(v)}" for k, v in sorted(b["pemakai"].items())) or "-"
        pen = ", ".join(Path(p).name for p in b["penulis"][:2]) or "-"
        L.append(f"| `{b['berkas']}` | {', '.join(b['lembaga']) or '-'} | {(b['url'] or ['-'])[0][:60]} | {pen} | "
                 f"{'; '.join(b['jadwal'])[:70]} | {pk} | {b['status']} |")
    L += ["", "## Pengecekan tally (pasangan angka sama dari sumber berbeda, perlu label definisi)", ""]
    for p in peta["pasangan"]:
        L.append(f"- {p['konsep']}: {p['a']['label']} (`{p['a']['berkas']}`) berdampingan dengan {p['b']['label']} (`{p['b']['berkas']}`)")
    L += ["", "## Usul sambungan untuk yatim dan tanpa-jadwal", ""]
    for b in peta["baris"]:
        if b["status"] in ("yatim", "tanpa-jadwal"):
            L.append(f"- `{b['berkas']}` ({b['status']}): {usul(b)}")
    return "\n".join(L) + "\n"


def cli(argv):
    a = list(argv)

    def opsi(n, d):
        if n in a:
            i = a.index(n)
            v = a[i + 1]
            del a[i:i + 2]
            return v
        return d
    akar = Path(opsi("--akar", AKAR0))
    utang = Path(opsi("--utang", UTANG0))
    lap = opsi("--laporan", None)
    laporan = Path(lap) if lap else (LAPORAN0 if (a and a[0] == "bangun") else None)
    cmd = a[0] if a else "periksa"
    if cmd == "uji":
        return uji()
    peta = susun(akar, laporan)
    if cmd == "bangun":
        (akar / "docs").mkdir(exist_ok=True)
        (akar / "docs/PETA-DATA.md").write_text(md(peta), "utf-8")
        (akar / "docs/peta_data.json").write_text(json.dumps(peta, ensure_ascii=False, indent=1), "utf-8")
        print(json.dumps(hitung(peta), ensure_ascii=False))
        return 0
    salah = periksa(peta, muat_utang(utang))
    print(json.dumps({"hitung": hitung(peta), "pelanggaran": salah}, ensure_ascii=False, indent=1))
    return 1 if salah else 0


def uji():
    assert status({"pemakai": {}, "arsip": False, "jadwal": ["x"], "penulis": [], "url": []}) == "yatim"
    assert status({"pemakai": {"layar publik": ["a"]}, "arsip": False, "jadwal": ["TIDAK ADA"], "penulis": ["s.py"], "url": ["https://bmkg.go.id"]}) == "tanpa-jadwal"
    assert status({"pemakai": {"layar publik": ["a"]}, "arsip": False, "jadwal": ["w.yml cron 1"], "penulis": ["s.py"], "url": []}) == "terpakai"
    assert status({"pemakai": {"laporan": ["a"]}, "arsip": False, "jadwal": ["w"], "penulis": [], "url": []}) == "yatim"
    assert periksa({"baris": [{"berkas": "a", "status": "yatim"}]}, {"yatim": [], "tanpa-jadwal": [], "pengecualian": {}})
    assert not periksa({"baris": [{"berkas": "a", "status": "yatim"}]}, {"yatim": ["a"], "tanpa-jadwal": [], "pengecualian": {}})
    assert periksa({"baris": []}, {"yatim": ["a"], "tanpa-jadwal": [], "pengecualian": {}})  # ratchet menyusut
    print("peta_data: ok")
    return 0


if __name__ == "__main__":
    sys.exit(cli(sys.argv[1:]))
