"""Dampak peringatan dini (DP-02): bagian pembaca. Python 3.12 stdlib.

Umpan CAP dari Worker kita (GET /api/cuaca/nowcast, bukan scripts/banjir/peringatan.py, D2) -> peringatan aktif, bahaya
(ALGORITMA 2), kab tersentuh (poligon berpotongan dengan batas kab public/geo/kabupaten/, D35), sidik himpunan poligon.
Tidak menghitung penduduk/fasilitas: kaitkan di hook hitung_paparan (DP-03) dan hitung_fasilitas (DP-04).
Kosong = "tidak ada peringatan aktif" (bukan 0); sumber basi/mati = "belum terukur" (R null).

Pakai: python3 -I scripts/siklus/dampak_peringatan.py --cek
       python3 -I scripts/siklus/dampak_peringatan.py [--base URL] [--kini ISO] [--lama sidik.json] [--keluar hasil.json]
"""
import argparse, datetime as dt, glob, hashlib, importlib.util, json, os, re, sys, urllib.request

AB = os.path.dirname(os.path.abspath(__file__))
AKAR = os.path.normpath(os.path.join(AB, "../.."))
BASE_BAWAAN = os.environ.get("DAMPAK_BASE", "https://centurisk97.id")
SEGAR_JAM = 3  # ALGORITMA 1: umpan CAP paling lama 3 jam
# D32: kata yang tidak boleh ada di teks buatan kita; JS kembarannya di tests/dampak-peringatan/kata_dilarang.mjs (gerbang DP-22).
KATA_DILARANG = ("aman", "dijamin", "terdampak", "korban", "bebas", "padam")
TIDAK_ADA = "tidak ada peringatan aktif"
BELUM = "belum terukur"
# (kata kunci, bahaya, kode prakiraan); urutan penting: hujan lebat dulu. Hanya "hujan lebat" terbukti ada di umpan (DP-01).
PEMETAAN = (("hujan sangat lebat", "banjir_longsor", ("BNJ", "LSR")), ("hujan lebat", "banjir_longsor", ("BNJ", "LSR")),
            ("angin kencang", "cuaca_ekstrem", ("CEX",)), ("puting beliung", "cuaca_ekstrem", ("CEX",)))
SEVERITAS = {"minor": 1, "moderate": 2, "severe": 3, "extreme": 3}
# nama di public/geo/kabupaten/ yang salah eja terhadap scripts/udara/kota.json
ALIAS_KAB = {"75|Pahuwato": "7504"}


def _muat(nama, rel):
    s = importlib.util.spec_from_file_location(nama, os.path.join(AKAR, rel))
    m = importlib.util.module_from_spec(s)
    sys.modules.setdefault(nama, m)
    s.loader.exec_module(m)
    return m


def _waktu(s):
    d = dt.datetime.fromisoformat(re.sub(r"\.\d+(?=Z|[+-]\d\d:|$)", "", s).replace("Z", "+00:00"))  # 3.9 tak paham "Z" dan pecahan
    return d if d.tzinfo else d.replace(tzinfo=dt.timezone.utc)


# ---------- umpan ----------
def baca_umpan(base=BASE_BAWAAN, batas=20):
    """Satu panggilan; gagal -> None (R null, bukan galat)."""
    try:
        rq = urllib.request.Request(base.rstrip("/") + "/api/cuaca/nowcast", headers={"User-Agent": "centurisk97-dampak/1"})
        with urllib.request.urlopen(rq, timeout=batas) as r:
            d = json.load(r)
        return d if isinstance(d, dict) and isinstance(d.get("nowcast"), list) else None
    except Exception:
        return None


def status_umpan(doc, kini):
    """-> ("segar"|"basi"|"mati", umur_jam|None)."""
    if not doc or not doc.get("dibuat"):
        return "mati", None
    try:
        umur = (kini - _waktu(doc["dibuat"])).total_seconds() / 3600
    except ValueError:
        return "mati", None
    return ("segar" if umur <= SEGAR_JAM else "basi"), round(umur, 2)


def bahaya_dari_event(event):
    """Nama peristiwa CAP -> (bahaya, kode) atau None (jatuh ke tak_dipetakan)."""
    e = re.sub(r"[^\w\s]", " ", (event or "").lower())
    e = " ".join(e.split())
    return next(((b, k) for kata, b, k in PEMETAAN if kata in e), None)


def cincin_sah(r):
    """Cincin >= 4 titik dan tertutup (ALGORITMA 3.0)."""
    return isinstance(r, list) and len(r) >= 4 and r[0] == r[-1] and all(isinstance(p, list) and len(p) >= 2 for p in r)


def peringatan_aktif(doc, kini):
    """-> (aktif[{id,bahaya,kode,tingkat_bmkg,selesai,wilayah,poligon:[cincin]}], tak_dipetakan{n,nama}, catatan[])"""
    aktif, tak, catatan = [], {}, []
    for p in doc.get("nowcast") or []:
        try:
            if _waktu(p["selesai"]) <= kini:
                continue
        except (KeyError, ValueError):
            catatan.append(f"{p.get('id')}: waktu selesai tak terbaca")
            continue
        b = bahaya_dari_event(p.get("event"))
        if not b:
            tak[p.get("event") or "(tanpa nama)"] = 1
            continue
        sah = [c for c in (p.get("polygon") or []) if cincin_sah(c)]
        if len(sah) < len(p.get("polygon") or []):
            catatan.append(f"{p.get('id')}: {len(p['polygon']) - len(sah)} cincin dibuang (kurang dari 4 titik atau tak tertutup)")
        aktif.append({"id": p.get("id"), "bahaya": b[0], "kode": list(b[1]), "tingkat_bmkg": SEVERITAS.get((p.get("severity") or "").lower(), 1),
                      "selesai": p.get("selesai"), "wilayah": p.get("wilayah"), "poligon": sah})
    return aktif, {"n": len(tak), "nama": sorted(tak)}, catatan


# ---------- geometri kab ----------
_KAB = None


def muat_kab():
    """{kab4: {nama, bagian (cincin PB), kotak}} dari public/geo/kabupaten/<prov>.json."""
    global _KAB
    if _KAB is None:
        PB = _muat("sk_paparan_bangunan", "scripts/umum/paparan_bangunan.py")
        kk = _muat("sk_hvc", "scripts/bnpb/hvc_dasar.py").kab_kode()
        _KAB = {}
        for f in sorted(glob.glob(os.path.join(AKAR, "public/geo/kabupaten/*.json"))):
            prov = os.path.basename(f)[:2]
            for ft in json.load(open(f, encoding="utf-8"))["features"]:
                k = f"{prov}|{ft['properties']['kab']}"
                kab4 = kk.get(k) or ALIAS_KAB.get(k)
                if kab4:
                    bg = PB.cincin(ft["geometry"])
                    _KAB[kab4] = {"nama": ft["properties"]["kab"], "bagian": bg, "kotak": PB.kotak_cincin(bg)}
    return _KAB


def _silang(a, b, c, d):
    def o(p, q, r):
        return (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0])
    return o(a, b, c) * o(a, b, d) < 0 and o(c, d, a) * o(c, d, b) < 0


def berpotongan(cincin, bagian, kotak, PB=None):
    """Cincin poligon peringatan vs geometri kab: kotak dulu, lalu titik-dalam kedua arah dan perpotongan ruas (D35: poligon kecil tak terlewat)."""
    PB = PB or _muat("sk_paparan_bangunan", "scripts/umum/paparan_bangunan.py")
    xs, ys = [p[0] for p in cincin], [p[1] for p in cincin]
    if max(xs) < kotak[0] or min(xs) > kotak[2] or max(ys) < kotak[1] or min(ys) > kotak[3]:
        return False
    if any(PB.di_geom(p[0], p[1], bagian) for p in cincin):
        return True
    if any(_dalam_ring(luar[0], cincin) for luar, _ in bagian):
        return True
    for luar, _ in bagian:
        for a, b in zip(luar, luar[1:]):
            if max(a[0], b[0]) < min(xs) or min(a[0], b[0]) > max(xs) or max(a[1], b[1]) < min(ys) or min(a[1], b[1]) > max(ys):
                continue
            if any(_silang(a, b, c, d) for c, d in zip(cincin, cincin[1:])):
                return True
    return False


def _dalam_ring(p, r):
    x, y, d = p[0], p[1], False
    for a, b in zip(r, r[1:]):
        if (a[1] > y) != (b[1] > y) and x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]:
            d = not d
    return d


def kab_tersentuh(aktif, kab=None):
    """-> ({kode_bahaya: {kab4: R}}, di_luar_wilayah[id]); R = maksimum tingkat_bmkg peringatan yang menyentuhnya."""
    kab = kab if kab is not None else muat_kab()
    PB = _muat("sk_paparan_bangunan", "scripts/umum/paparan_bangunan.py")
    hasil, luar = {}, []
    for p in aktif:
        kena = {k4 for k4, v in kab.items() if any(berpotongan(c, v["bagian"], v["kotak"], PB) for c in p["poligon"])}
        if not kena:
            luar.append(p["id"])
        for kode in p["kode"]:
            h = hasil.setdefault(kode, {})
            for k4 in kena:
                h[k4] = max(h.get(k4, 0), p["tingkat_bmkg"])
    return hasil, luar


def sidik_poligon(aktif):
    """16 heksa dari himpunan poligon per bahaya (urutan & id tak berpengaruh)."""
    baris = sorted(json.dumps([p["bahaya"], c], separators=(",", ":")) for p in aktif for c in p["poligon"])
    return hashlib.sha256("\n".join(baris).encode()).hexdigest()[:16]


# ---------- hook tiket lanjutan ----------
def hitung_paparan(aktif, tersentuh):
    """DP-03: penduduk/kelas bahaya per kab dan desa lewat paparan.py (satu mesin). Belum dikerjakan: None = belum terukur."""
    return None


def hitung_fasilitas(aktif, tersentuh):
    """DP-04: fasilitas per sumber lewat fasilitas.py, tidak dijumlah. Belum dikerjakan: None."""
    return None


# ---------- jalan ----------
def jalankan(doc, kini, sidik_lama=None, kab=None):
    """Satu putaran. Status prakiraan selalu dihitung ulang oleh pemanggil; hanya keterpaparan yang dilewati bila sidik sama (D3)."""
    st, umur = status_umpan(doc, kini)
    out = {"versi": 1, "dibuat": kini.isoformat(), "umpan": {"status": st, "umur_jam": umur, "dibuat": (doc or {}).get("dibuat")}}
    if st != "segar":  # R null; tidak ada angka 0
        return {**out, "teks": BELUM, "peringatan": None, "tak_dipetakan": None, "kab_tersentuh": None, "sidik": None, "hitung_paparan": False,
                "paparan": None, "fasilitas": None, "catatan": []}
    aktif, tak, catatan = peringatan_aktif(doc, kini)
    sd = sidik_poligon(aktif)
    out.update(teks=None if aktif else TIDAK_ADA, tak_dipetakan=tak, sidik=sd, catatan=catatan,
               peringatan=[{k: v for k, v in p.items() if k != "poligon"} for p in aktif])
    if not aktif:  # umpan segar dan kosong: R = 0 bermakna, jiwa tetap null
        return {**out, "kab_tersentuh": {}, "di_luar_wilayah": [], "hitung_paparan": False, "paparan": None, "fasilitas": None}
    ters, luar = kab_tersentuh(aktif, kab)
    hitung = sd != sidik_lama
    out.update(kab_tersentuh=ters, di_luar_wilayah=luar, hitung_paparan=hitung,
               paparan=hitung_paparan(aktif, ters) if hitung else None, fasilitas=hitung_fasilitas(aktif, ters) if hitung else None)
    return out


def ringkas(h):
    u = h["umpan"]
    s = [f"umpan {u['status']}" + (f" (umur {u['umur_jam']} jam)" if u["umur_jam"] is not None else "")]
    if h["peringatan"] is None:
        s.append(BELUM)
    elif not h["peringatan"]:
        s.append(TIDAK_ADA)
    else:
        s.append(f"{len(h['peringatan'])} peringatan aktif, tak dipetakan {h['tak_dipetakan']['n']}, sidik {h['sidik']}, hitung_paparan={h['hitung_paparan']}")
        for kode, d in sorted((h["kab_tersentuh"] or {}).items()):
            s.append(f"  {kode}: {len(d)} kab tersentuh, R maks {max(d.values(), default=0)}")
        if h["di_luar_wilayah"]:
            s.append(f"  di luar wilayah: {len(h['di_luar_wilayah'])}")
    return "\n".join(s)


# ---------- --cek (tanpa jaringan) ----------
def _cek():
    def per(i, ev, ring, selesai="2026-11-26T12:00:00+00:00", sev="Moderate"):
        return {"id": i, "event": ev, "severity": sev, "mulai": "2026-11-26T07:00:00+07:00", "selesai": selesai, "wilayah": "x", "polygon": [ring]}

    def umpan(dibuat, *p):
        return {"dibuat": dibuat, "terbit": dibuat, "nowcast": list(p)}

    # tiga kab fiktif: A kotak 0..2, B kotak 2..4 (bersebelahan), C jauh
    def kotak(x0, y0, x1, y1):
        return [[x0, y0], [x1, y0], [x1, y1], [x0, y1], [x0, y0]]
    PB = _muat("sk_paparan_bangunan", "scripts/umum/paparan_bangunan.py")
    kab = {k: {"nama": k, "bagian": [(r, [])], "kotak": (r[0][0], r[0][1], r[2][0], r[2][1])}
           for k, r in (("A", kotak(0, 0, 2, 2)), ("B", kotak(2, 0, 4, 2)), ("C", kotak(10, 10, 12, 12)))}
    segar = "2026-11-26T07:30:00+00:00"  # umur 0,5 jam
    kini = _waktu("2026-11-26T08:00:00+00:00")
    HL = "Hujan Lebat dan Petir"

    # P1: segar, kosong
    h = jalankan(umpan(segar), kini, kab=kab)
    assert h["teks"] == TIDAK_ADA and h["peringatan"] == [] and h["paparan"] is None and h["kab_tersentuh"] == {}, h
    assert ringkas(h).endswith(TIDAK_ADA)
    # P2: basi dan mati -> belum terukur, R null
    for d, st in ((umpan("2026-11-26T03:00:00+00:00", per("1", HL, kotak(0.5, 0.5, 1, 1))), "basi"), (None, "mati")):
        h = jalankan(d, kini, kab=kab)
        assert h["umpan"]["status"] == st and h["teks"] == BELUM and h["peringatan"] is None and h["kab_tersentuh"] is None, h
    # P7: poligon di laut -> tidak membuat kab, tercatat di_luar_wilayah
    h = jalankan(umpan(segar, per("L", HL, kotak(50, 50, 51, 51))), kini, kab=kab)
    assert h["di_luar_wilayah"] == ["L"] and all(not v for v in h["kab_tersentuh"].values()), h
    # P13: peristiwa tak dikenal dihitung, tanpa paparan, tanpa galat
    h = jalankan(umpan(segar, per("P", "Petir", kotak(0.5, 0.5, 1, 1)), per("Q", "Gelombang Tinggi", kotak(0.5, 0.5, 1, 1))), kini, kab=kab)
    assert h["tak_dipetakan"] == {"n": 2, "nama": ["Gelombang Tinggi", "Petir"]} and h["peringatan"] == [] and h["kab_tersentuh"] == {}, h
    # pemetaan: hujan lebat -> BNJ+LSR, angin -> CEX; kedaluwarsa dibuang; cincin rusak dibuang dan dicatat
    d = umpan(segar, per("H", HL, kotak(0.5, 0.5, 1, 1)), per("W", "Angin Kencang", kotak(3, 0.5, 3.5, 1), sev="Severe"),
              per("X", HL, kotak(0.5, 0.5, 1, 1), selesai="2026-11-26T07:00:00+00:00"), per("Y", HL, [[0, 0], [1, 1], [0, 0]]))
    h = jalankan(d, kini, kab=kab)
    assert [p["id"] for p in h["peringatan"]] == ["H", "W", "Y"] and h["kab_tersentuh"]["BNJ"] == {"A": 2} and h["kab_tersentuh"]["CEX"] == {"B": 3}, h
    assert len(h["catatan"]) == 1
    # P23: poligon kecil di dalam kab (tanpa titik pusat desa), dan poligon yang hanya melintasi tepi dua kab
    h = jalankan(umpan(segar, per("K", HL, kotak(1.01, 1.01, 1.02, 1.02)), per("M", HL, kotak(1.9, 0.5, 2.1, 0.6))), kini, kab=kab)
    assert set(h["kab_tersentuh"]["BNJ"]) == {"A", "B"}, h
    # melintang di atas kab B tanpa satu titik pun di dalamnya
    assert berpotongan([[-1, 0.5], [5, 0.5], [5, 0.6], [-1, 0.6], [-1, 0.5]], kab["B"]["bagian"], kab["B"]["kotak"], PB)
    assert not berpotongan(kotak(5, 5, 6, 6), kab["A"]["bagian"], kab["A"]["kotak"], PB)
    # P9: sidik sama -> hitung dilewati, keluaran byte sama; poligon beda -> hitung lagi
    d = umpan(segar, per("H", HL, kotak(0.5, 0.5, 1, 1)))
    h1 = jalankan(d, kini, kab=kab)
    assert h1["hitung_paparan"] is True
    h2 = jalankan(d, kini, sidik_lama=h1["sidik"], kab=kab)
    assert h2["hitung_paparan"] is False
    assert h1["kab_tersentuh"] == h2["kab_tersentuh"]  # kab tersentuh tetap dihitung ulang
    assert json.dumps(jalankan(d, kini, h1["sidik"], kab), sort_keys=True) == json.dumps(h2, sort_keys=True)
    h3 = jalankan(umpan(segar, per("H", HL, kotak(0.6, 0.5, 1, 1))), kini, sidik_lama=h1["sidik"], kab=kab)
    assert h3["hitung_paparan"] is True and h3["sidik"] != h1["sidik"]
    # kata dilarang tidak muncul di teks buatan kita
    assert not [k for k in KATA_DILARANG if k in (TIDAK_ADA + BELUM)]
    # geometri nyata: kab dari public/geo terbaca 514 kode dan alias Pahuwato
    kb = muat_kab()
    assert len(kb) == 514 and "7504" in kb, len(kb)
    print("dampak_peringatan --cek: P1 P2 P7 P9 P13 P23 hijau")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--cek", action="store_true")
    ap.add_argument("--base", default=BASE_BAWAAN)
    ap.add_argument("--kini")
    ap.add_argument("--lama", help="berkas hasil sebelumnya (untuk sidik)")
    ap.add_argument("--keluar")
    a = ap.parse_args()
    if a.cek:
        _cek()
        sys.exit(0)
    kini = _waktu(a.kini) if a.kini else dt.datetime.now(dt.timezone.utc)
    lama = json.load(open(a.lama))["sidik"] if a.lama and os.path.exists(a.lama) else None
    hasil = jalankan(baca_umpan(a.base), kini, lama)
    if a.keluar:
        json.dump(hasil, open(a.keluar, "w"), ensure_ascii=False, sort_keys=True)
    print(ringkas(hasil))
