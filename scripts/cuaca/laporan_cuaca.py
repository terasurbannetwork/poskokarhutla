"""Laporan harian cuaca ekstrem -> public/banjir/data/cuaca_laporan.json (kontrak v1: docs/multi-bencana/LAPORAN-HARIAN.md)

Disusun scripts/umum/laporan.py susun() lalu periksa(); galat = berkas lama dibiarkan (tulis() tidak dipakai: jalurnya terkunci ke public/<id>/data).
30 hari berakhir hari ini (WIB). Metrik: hujan maks (mm) dan embusan maks (km/jam) per provinsi dari cuaca_riwayat.json (analisis model, hari ini = prakiraan),
peringatan BMKG (arsip, per tanggal mulai) dan kejadian DIBI cuaca+gelombang. Hari tanpa sumber = null, bukan 0. Tanpa baris kabupaten (sumbernya per provinsi).
Pakai: python3 scripts/cuaca/laporan_cuaca.py   |   python3 scripts/cuaca/laporan_cuaca.py uji
"""
import datetime as dt, importlib.util, os, sys
from collections import Counter, defaultdict

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from dasar import AKAR, KELUAR, MASUKAN, PROVINSI, WIB, baca, hari_wib, sekarang, simpan

N = 30
METRIK = [
    {"k": "kec", "label": "Kecamatan Siaga dan Awas", "satuan": "kecamatan", "utama": True, "agregat": "jumlah", "arah": "naik_buruk", "desimal": 0},
    {"k": "hujan", "label": "Hujan harian tertinggi", "satuan": "mm", "agregat": "maks", "arah": "naik_buruk", "desimal": 0},
    {"k": "angin", "label": "Embusan tertinggi", "satuan": "km/jam", "agregat": "maks", "arah": "naik_buruk", "desimal": 0},
    {"k": "peringatan", "label": "Peringatan BMKG", "satuan": "peringatan", "agregat": "jumlah", "arah": "naik_buruk", "desimal": 0},
    {"k": "kejadian", "label": "Kejadian cuaca dan gelombang (DIBI)", "satuan": "kejadian", "agregat": "jumlah", "arah": "naik_buruk", "desimal": 0},
]


def laporan_modul():
    sp = importlib.util.spec_from_file_location("umum_laporan_cuaca", os.path.join(AKAR, "scripts/umum/laporan.py"))
    m = importlib.util.module_from_spec(sp)
    sp.loader.exec_module(m)
    return m


BULAN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"]


def tgl_id(iso):
    """'2025-10-18' -> '18 Okt 2025'."""
    y, m, d = iso[:10].split("-")
    return f"{int(d)} {BULAN[int(m) - 1]} {y}"


def periksa_cutoff(d):
    """Galat tambahan di luar laporan.periksa: cutoff (waktu data terakhir) tidak boleh lebih baru dari hari terakhir seri."""
    c = d.get("cutoff") or ""
    return [f"cutoff {c!r} lebih baru dari hari terakhir data {d['hari'][-1]}"] if c[:10] > d["hari"][-1] else []


def kab_indeks():
    """{(prov, nama kab): kode 4 digit} = 2 digit prov + urutan kab di public/geo/kabupaten/<prov>.json (sama dengan laporan banjir, BUKAN kode Kemendagri)."""
    import json
    out = {}
    for kp in PROVINSI:
        try:
            fs = json.load(open(os.path.join(AKAR, "public/geo/kabupaten", f"{kp}.json")))["features"]
        except OSError:
            continue
        for i, f in enumerate(fs, 1):
            out[(kp, f["properties"]["kab"])] = f"{kp}{i:02d}"
    return out


def catat_kec(seri, kec, pusat, kab_kode, hari0):
    """Tambah/ganti hari0 di seri append-only {tanggal: {"n", "prov": {kode: n}, "kab": {kode: n}}}: jumlah kecamatan t >= 2 hari ini (prakiraan model)."""
    n, prov, kab = 0, Counter(), Counter()
    kunci = list(pusat)
    for r in kec["kec"]:
        if r[1][0] >= 2:
            p, k, _ = kunci[r[0]].split("|", 2)
            n += 1
            prov[p] += 1
            if (p, k) in kab_kode:
                kab[kab_kode[(p, k)]] += 1
    seri.setdefault("tgl", {})[hari0] = {"n": n, "prov": dict(prov), "kab": dict(kab)}
    seri["tgl"] = dict(sorted(seri["tgl"].items())[-400:])
    return seri


def deret(hari, nilai):
    """nilai = {tanggal: x} -> daftar sejajar `hari`, tanggal tak ada = None."""
    return [nilai.get(d) for d in hari]


def susun_data(hari, riwayat, arsip, dibi, mulai_arsip, akhir_dibi, seri_kec=None):
    """-> (nasional, prov) berisi deret keempat metrik. Peringatan: null sebelum arsip dimulai; kejadian: null sesudah kejadian terakhir DIBI."""
    nas = {"hujan": deret(hari, {t: v[6] for t, v in riwayat["tgl"].items()}), "angin": deret(hari, {t: v[7] for t, v in riwayat["tgl"].items()})}
    per_n, per_p = Counter(), defaultdict(Counter)
    for r in arsip["baris"]:
        d = r[3][:10]
        per_n[d] += 1
        for p in set(r[5]):
            per_p[p][d] += 1
    kej_n, kej_p = Counter(), defaultdict(Counter)
    for k in dibi:
        if k["jenis"] in ("cuaca", "gelombang"):
            kej_n[k["tanggal"]] += 1
            if k.get("prov"):
                kej_p[k["prov"]][k["tanggal"]] += 1
    p_ada = lambda d: mulai_arsip is not None and d >= mulai_arsip
    k_ada = lambda d: akhir_dibi is not None and d <= akhir_dibi
    sk = (seri_kec or {}).get("tgl", {})
    nas["kec"] = [sk[d]["n"] if d in sk else None for d in hari]
    nas["peringatan"] = [per_n[d] if p_ada(d) else None for d in hari]
    nas["kejadian"] = [kej_n[d] if k_ada(d) else None for d in hari]
    prov = {}
    pk = {p for v in sk.values() for p in v["prov"]}
    for p in sorted(set(riwayat["prov"]) | set(per_p) | set(kej_p) | pk):
        if p not in PROVINSI:
            continue
        rw = riwayat["prov"].get(p, {})
        o = {"hujan": deret(hari, {t: v[0] for t, v in rw.items()}), "angin": deret(hari, {t: v[1] for t, v in rw.items()}),
             "kec": [sk[d]["prov"].get(p, 0) if d in sk else None for d in hari],
             "peringatan": [per_p[p][d] if p_ada(d) else None for d in hari], "kejadian": [kej_p[p][d] if k_ada(d) else None for d in hari]}
        if any(x for k in o.values() for x in k if x is not None):
            prov[p] = o
    return nas, prov


def kab_baris(hari, dibi, seri_kec, kab_kode, prov, akhir_dibi):
    """Baris kabupaten: kec (seri sejak mulai) dan kejadian DIBI cuaca+gelombang per kab; hanya kab yang punya nilai > 0 dan provinsinya ada di `prov`."""
    sk = (seri_kec or {}).get("tgl", {})
    nama = {v: k[1] for k, v in kab_kode.items()}
    kej = defaultdict(Counter)
    for k in dibi:
        kode = kab_kode.get((k.get("prov"), k.get("kab")))
        if k["jenis"] in ("cuaca", "gelombang") and kode:
            kej[kode][k["tanggal"]] += 1
    out = []
    for kode in sorted(set(kej) | {c for v in sk.values() for c in v["kab"]}):
        if kode[:2] not in prov:
            continue
        o = {"prov": kode[:2], "kode": kode, "nama": nama.get(kode, kode),
             "kec": [sk[d]["kab"].get(kode, 0) if d in sk else None for d in hari],
             "hujan": [None] * len(hari), "angin": [None] * len(hari), "peringatan": [None] * len(hari),
             "kejadian": [kej[kode][d] if akhir_dibi and d <= akhir_dibi else None for d in hari]}
        if any(x for k in ("kec", "kejadian") for x in o[k] if x):
            out.append(o)
    return out


def sorot_dari(kec, siklon, nowcast_aktif, dampak=None, sarana=None):
    """Perlu perhatian, terurut: siklon, provinsi dengan kecamatan Awas/Siaga hari ini, peringatan BMKG aktif. Maks 8."""
    out = []
    for s in (siklon or {}).get("aktif", []):
        out.append({"tingkat": "siaga", "judul": f"Siklon tropis {s['nama']}", "teks": f"Angin maksimum {s['angin_kt']} knot ({s['kategori']}), {s['basin']}. Sumber JTWC.", "tautan": s.get("tautan")})
    if kec:
        for p, v in sorted(kec["prov"].items(), key=lambda kv: (-kv[1]["n"][0][2], -kv[1]["n"][0][1])):
            w, s, a = v["n"][0]
            if a or s:
                t = "awas" if a else "siaga"
                out.append({"tingkat": t, "judul": f"{PROVINSI.get(p, p)}: {a} kecamatan Awas, {s} kecamatan Siaga", "teks": f"Prakiraan model Centurisk97 untuk hari ini: {a} kecamatan Awas, {s} kecamatan Siaga, {w} kecamatan Waspada.", "prov": p})
    if kec and len(kec["hari"]) > 1:
        b = [(p, v["n"][1]) for p, v in kec["prov"].items() if v["n"][1][1] + v["n"][1][2]]
        b.sort(key=lambda x: -(x[1][2] * 1000 + x[1][1]))
        for p, (w, si, aw) in b[:2]:
            out.append({"tingkat": "awas" if aw else "siaga", "judul": f"Besok, {PROVINSI.get(p, p)}: {aw} kecamatan Awas, {si} kecamatan Siaga", "teks": f"Prakiraan model Centurisk97 untuk {tgl_id(kec['hari'][1])}.", "prov": p})
    if dampak and sarana:
        t = [(sarana["pelabuhan"][r[0]][0], r[2]) for r in dampak.get("pelabuhan", []) if max(r[1]) >= 2]
        if t:
            nm = ", ".join(n for n, _ in sorted(t, key=lambda x: -x[1])[:3])
            out.append({"tingkat": "waspada", "judul": f"{len(t)} pelabuhan dengan gelombang tinggi", "teks": f"Prakiraan 3 hari: {nm}. Hasil model, bukan peringatan resmi BMKG."})
    if nowcast_aktif:
        out.append({"tingkat": "info", "judul": f"BMKG: {nowcast_aktif} peringatan dini cuaca aktif", "teks": "Peringatan dini cuaca resmi BMKG yang sedang berlaku saat data diambil."})
    return out[:8]


def main():
    L = laporan_modul()
    hujan = baca(os.path.join(MASUKAN, "hujan.json"))
    riw = baca(os.path.join(KELUAR, "cuaca_riwayat.json"))
    if not hujan or not riw:
        raise RuntimeError("hujan.json atau cuaca_riwayat.json tidak ada")
    hari_ini = hujan["hari_ini"]
    akhir_hari = min(hari_wib(1)[0], max(riw["tgl"]))   # hari WIB ini, atau riwayat terakhir bila lebih lama; bukan hari_ini hujan.json yang bisa basi
    hari = [(dt.date.fromisoformat(akhir_hari) - dt.timedelta(days=N - 1 - i)).isoformat() for i in range(N)]
    dibuat_data = (baca(os.path.join(MASUKAN, "meta.json")) or {}).get("dibuat") or f"{akhir_hari}T00:00+07:00"
    cutoff = dibuat_data if dibuat_data[:10] <= akhir_hari else f"{akhir_hari}T23:59+07:00"   # waktu data terakhir (model hujan), bukan jam tarik
    arsip = baca(os.path.join(KELUAR, "cuaca_arsip_bmkg.json")) or {"baris": []}
    dibi = (baca(os.path.join(KELUAR, "kejadian.json")) or {}).get("kejadian_dibi", [])
    mulai = min((r[3][:10] for r in arsip["baris"]), default=None)
    akhir = max((k["tanggal"] for k in dibi), default=None)
    kec = baca(os.path.join(KELUAR, "cuaca_kec.json"))
    pusat = baca(os.path.join(MASUKAN, "pusat_kec.json")) or {}
    kab_kode = kab_indeks()
    seri_kec = baca(os.path.join(KELUAR, "cuaca_seri_kec.json")) or {"tgl": {}}
    if kec and kec["hari"][0] == hari_ini and pusat:   # kec basi (hari lain) tidak dicatat sebagai hari ini
        catat_kec(seri_kec, kec, pusat, kab_kode, hari_ini)
        simpan(os.path.join(KELUAR, "cuaca_seri_kec.json"), seri_kec)
    nas, prov = susun_data(hari, riw, arsip, dibi, mulai, akhir, seri_kec)
    kab = kab_baris(hari, dibi, seri_kec, kab_kode, prov, akhir)
    per = baca(os.path.join(KELUAR, "peringatan.json")) or {}
    sorot = sorot_dari(kec, baca(os.path.join(KELUAR, "cuaca_siklon.json")), sum(1 for n in per.get("nowcast", []) if n.get("aktif")),
                       baca(os.path.join(KELUAR, "cuaca_dampak.json")), baca(os.path.join(KELUAR, "cuaca_sarana.json")))
    # prakiraan: peluang hujan >= 50 mm (ansambel) tertinggi per provinsi, 3 hari; tanpa ansambel jatuh ke hujan harian tertinggi (mm)
    prakiraan = None
    if kec:
        pm = {}
        for r in kec["kec"]:
            p = list(pusat)[r[0]].split("|")[0] if pusat else None
            if p and all(x is not None for x in r[2]):
                pm[p] = [max(a, b) for a, b in zip(pm.get(p, [0, 0, 0]), r[2])]
        top = sorted((p for p in pm if max(pm[p]) > 0), key=lambda p: -max(pm[p]))[:8]
        if top:
            prakiraan = {"judul": "Peluang hujan 50 mm atau lebih per hari, provinsi teratas", "hari": kec["hari"],
                         "baris": [{"label": PROVINSI.get(p, p), "prov": p, "nilai": pm[p], "satuan": "%"} for p in top]}
    if prakiraan is None:
        depan = [d for d in hujan["hari"] if d > hari_ini][:7]
        pm = {}
        for g in hujan["grid"]:
            if g.get("prov"):
                for d in depan:
                    pm.setdefault(g["prov"], {})[d] = max(pm.get(g["prov"], {}).get(d, 0), g["h"][hujan["hari"].index(d)] or 0)
        top = sorted(pm, key=lambda p: -max(pm[p].values()))[:8]
        prakiraan = {"judul": "Hujan harian tertinggi per provinsi, prakiraan model", "hari": depan,
                     "baris": [{"label": PROVINSI.get(p, p), "prov": p, "nilai": [round(pm[p][d]) for d in depan], "satuan": "mm"} for p in top]} if depan and top else None
    tambahan = []
    ver = (baca(os.path.join(KELUAR, "cuaca_verifikasi.json")) or {}).get("kita")
    if ver and ver.get("periode"):
        pct = lambda x: f"{x * 100:.0f}%".replace(".", ",")
        f = lambda v, k: "belum cukup data" if v[k] is None or v["n"] < ver.get("n_min", 30) else pct(v[k])   # n kecil: persen disembunyikan
        tambahan.append({"id": "verifikasi", "judul": "Ketepatan prakiraan hujan 50 mm (uji balik)", "kolom": ["Prakiraan", "Tepat (%)", "Alarm palsu (%)", "Skor kecocokan", "Hari uji"],
                         "baris": [[f"{L} hari sebelumnya", f(v, "pod"), f(v, "far"), f(v, "csi"), ver["n_hari"]] for L, v in sorted(ver["lead"].items())],
                         "catatan": "Acuan kejadian DIBI BNPB (hanya yang dilaporkan), " + tgl_id(ver["periode"][0]) + " sampai " + tgl_id(ver["periode"][1]) + "; titik sampel jarang."})
    gel, sar = baca(os.path.join(KELUAR, "cuaca_gelombang.json")), baca(os.path.join(KELUAR, "cuaca_sarana.json"))
    if gel and gel["titik"]:
        nm = {(round(p[1], 3), round(p[2], 3)): p[0] for p in (sar or {}).get("pelabuhan", [])}
        nama = lambda r: nm.get((round(r[0], 3), round(r[1], 3))) or ("Titik pesisir " + r[3] if r[3] else "Titik pesisir")   # nama pelabuhan Indonesia dari sarana; titik rob = kecamatan
        baris = [[nama(r), PROVINSI.get(r[2], r[2]), round(r[6] / 10, 1)] for r in sorted(gel["titik"], key=lambda r: -r[6])[:10]]
        tambahan.append({"id": "gelombang", "judul": "Gelombang tertinggi 3 hari ke depan", "kolom": ["Lokasi", "Provinsi", "Tinggi gelombang (m)"], "baris": baris,
                         "catatan": "Prakiraan model gelombang Open-Meteo Marine di pelabuhan dan titik pesisir; bukan peringatan resmi BMKG."})
    d = L.susun("cuaca", "Laporan Harian Cuaca Ekstrem", hari, METRIK, nas, prov, kab, cutoff=cutoff,
                hari_lengkap=hari[-2], sorot=sorot, prakiraan=prakiraan, tambahan=tambahan,
                sumber=[{"nama": "Open-Meteo", "url": "https://open-meteo.com", "catatan": "hujan dan angin (analisis dan prakiraan model), gelombang"},
                        {"nama": "BMKG", "url": "https://www.bmkg.go.id/alerts/nowcast/id", "catatan": "peringatan dini cuaca, arsip sejak mulai direkam"},
                        {"nama": "DIBI BNPB", "url": "https://dibi.bnpb.go.id", "catatan": "kejadian cuaca ekstrem dan gelombang"},
                        {"nama": "JTWC", "url": "https://www.metoc.navy.mil/jtwc/jtwc.html", "catatan": "siklon tropis"}])
    g = L.periksa(d) + periksa_cutoff(d)
    if g:
        raise ValueError("laporan cuaca ditolak:\n- " + "\n- ".join(g))
    simpan(os.path.join(KELUAR, "cuaca_laporan.json"), d)
    print(f"cuaca laporan: {len(hari)} hari, {len(prov)} provinsi, {len(kab)} kabupaten, {len(sorot)} sorotan", file=sys.stderr)


def uji():
    hari = ["2026-10-10", "2026-10-11", "2026-10-12", "2026-10-13"]
    riw = {"tgl": {"2026-10-11": [0, 0, 0, 0, 0, 0, 80, 60], "2026-10-12": [0, 0, 0, 0, 0, 0, 20, 10]}, "prov": {"11": {"2026-10-11": [80, 60]}, "99": {"2026-10-11": [1, 1]}}}
    ars = {"baris": [["a", "e", "s", "2026-10-12T01:00+07:00", "x", ["11", "12"], "w"], ["b", "e", "s", "2026-10-12T05:00+07:00", "x", ["11"], "w"]]}
    dibi = [{"tanggal": "2026-10-11", "jenis": "cuaca", "prov": "11"}, {"tanggal": "2026-10-11", "jenis": "banjir", "prov": "11"}, {"tanggal": "2026-10-12", "jenis": "gelombang", "prov": "12"}]
    n, p = susun_data(hari, riw, ars, dibi, "2026-10-12", "2026-10-12")
    assert n["hujan"] == [None, 80, 20, None] and n["peringatan"] == [None, None, 2, 0] and n["kejadian"] == [0, 1, 1, None], n
    assert set(p) == {"11", "12"} and p["11"]["peringatan"] == [None, None, 2, 0] and p["12"]["kejadian"] == [0, 0, 1, None]   # 99 bukan provinsi; banjir bukan kejadian cuaca
    kec = {"hari": ["2026-10-18", "2026-10-19", "2026-10-20"], "prov": {"11": {"n": [[3, 1, 2], [0, 0, 0], [0, 0, 0]]}, "12": {"n": [[9, 0, 0], [0] * 3, [0] * 3]}, "13": {"n": [[0, 2, 0], [0, 4, 1], [0] * 3]}}}
    s = sorot_dari(kec, {"aktif": [{"nama": "X", "angin_kt": 90, "kategori": "Siklon tropis", "basin": "b"}]}, 3)
    assert [x["tingkat"] for x in s] == ["siaga", "awas", "siaga", "awas", "info"] and s[1]["prov"] == "11" and s[3]["prov"] == "13" and "—" not in str(s), [x["tingkat"] for x in s]
    sr = {"pelabuhan": [["Benoa", 0, 0, "51", "umum"], ["Merak", 0, 0, "36", "penyeberangan"]]}
    s2 = sorot_dari(None, None, 0, {"pelabuhan": [[0, [0, 1, 2], 45, 10], [1, [0, 0, 1], 20, 5]]}, sr)
    assert len(s2) == 1 and s2[0]["tingkat"] == "waspada" and "Benoa" in s2[0]["teks"] and "Merak" not in s2[0]["teks"], s2   # hanya t >= 2
    # seri kecamatan: catat, ganti hari yang sama, baris kab
    pusat = {"11|Aceh Barat Daya|A": [0, 0], "11|Aceh Barat Daya|B": [0, 0], "12|Nias|C": [0, 0]}
    kk = {("11", "Aceh Barat Daya"): "1101", ("12", "Nias"): "1201"}
    sk = catat_kec({}, {"kec": [[0, [2, 0, 0]], [1, [1, 0, 0]], [2, [3, 0, 0]]]}, pusat, kk, "2026-10-12")
    assert sk["tgl"]["2026-10-12"] == {"n": 2, "prov": {"11": 1, "12": 1}, "kab": {"1101": 1, "1201": 1}}, sk      # t=1 (Waspada) bukan Siaga+
    sk = catat_kec(sk, {"kec": [[2, [2, 0, 0]]]}, pusat, kk, "2026-10-12")
    assert sk["tgl"]["2026-10-12"]["n"] == 1                                                                         # hari yang sama diganti, bukan ditambah
    h3 = ["2026-10-11", "2026-10-12", "2026-10-13"]
    n3, p3 = susun_data(h3, {"tgl": {}, "prov": {}}, {"baris": []}, [{"tanggal": "2026-10-12", "jenis": "cuaca", "prov": "12", "kab": "Nias"}], None, "2026-10-12", sk)
    assert n3["kec"] == [None, 1, None] and p3["12"]["kec"] == [None, 1, None], n3     # sebelum seri dimulai null, bukan 0
    kb = kab_baris(h3, [{"tanggal": "2026-10-12", "jenis": "cuaca", "prov": "12", "kab": "Nias"}, {"tanggal": "2026-10-12", "jenis": "cuaca", "prov": "12", "kab": "Tak Dikenal"}], sk, kk, p3, "2026-10-12")
    assert [o["kode"] for o in kb] == ["1201"] and kb[0]["kejadian"] == [0, 1, None] and kb[0]["kec"] == [None, 1, None], kb
    L = laporan_modul()
    hr = [(dt.date(2026, 10, 1) + dt.timedelta(days=i)).isoformat() for i in range(N)]
    nas, prv = susun_data(hr, {"tgl": {}, "prov": {"11": {hr[5]: [50, 70]}}}, {"baris": []}, [], None, None)
    d = L.susun("cuaca", "j", hr, METRIK, nas, prv, [], cutoff="2026-10-30T10:00+07:00", hari_lengkap=hr[-2])
    assert L.periksa(d) == [], L.periksa(d)
    d["nasional"]["kec"] = d["nasional"]["kec"][:-1]
    assert any("panjang" in e for e in L.periksa(d)), "array nasional kurang satu harus ditolak"
    assert tgl_id("2025-10-18") == "18 Okt 2025" and tgl_id("2026-05-03T10:00") == "3 Mei 2026"
    assert "kecamatan Siaga" in s[2]["judul"] and "kecamatan Waspada" in s[1]["teks"] and "2026-10" not in str(s)
    assert "19 Okt 2026" in sorot_dari({"hari": ["2026-10-18", "2026-10-19"], "prov": {"11": {"n": [[0] * 3, [0, 1, 0]]}}}, None, 0)[0]["teks"]
    assert periksa_cutoff({"cutoff": "2026-10-13T12:27+07:00", "hari": ["2026-10-17", "2026-10-18"]}) == []
    assert periksa_cutoff({"cutoff": "2026-10-19T00:01+07:00", "hari": ["2026-10-17", "2026-10-18"]}), "cutoff sesudah hari terakhir harus ditolak"
    print("ok laporan cuaca")


if __name__ == "__main__":
    uji() if sys.argv[1:] == ["uji"] else main()
