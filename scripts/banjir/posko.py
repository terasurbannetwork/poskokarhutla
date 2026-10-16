"""Titik tengah kecamatan dan rekomendasi posko banjir/longsor/rob -> public/banjir/data/pusat_kec.json, public/banjir/data/posko.json

Tiga tingkat, setara posko karhutla (Perka BNPB 3/2016: pos lapangan -> pos komando kabupaten -> pos komando provinsi):
  lapangan  : - permanen (pra-musim): kabupaten paling sering banjir + longsor (kejadian BNPB/DIBI), paling banyak PER_PROV per
                provinsi dan TERATAS seluruhnya, ditaruh di kecamatan dengan indeks bahaya InaRISK tertinggi untuk jenis dominannya.
              - siaga   : kecamatan Siaga/Awas (banjir atau longsor) hari ini s.d. +3 yang tidak terjangkau posko permanen
                (<= GABUNG_KM, kabupaten sama); kecamatan berdekatan dilayani satu posko di kecamatan berstatus tertinggi.
              - waspada : gugus >= WASPADA_MIN kecamatan Waspada berdekatan di satu kabupaten yang belum terlayani.
              - rob     : titik pantai rob.json dengan level >= 2 di hari ini s.d. +3 yang belum terlayani.
  kabupaten : satu per kabupaten yang punya posko lapangan, di kantor BPBD kabupaten (public/data/bpbd.json) bila namanya cocok;
              selain itu kecamatan senama kabupaten, lalu kecamatan terdekat dari titik berat posko lapangannya (berbobot level).
  provinsi  : di ibu kota provinsi yang punya posko kabupaten.
Titik dipindah ke desa terdekat (public/data/osm/desa.json, <= DESA_KM) bila provinsinya tercakup; selain itu titik tengah kecamatan.
Jarak = haversine; waktu tempuh darat = km x KELOK / LAJU (sama dengan karhutla). Titik tengah kecamatan = titik berat poligon terbesar.
"""
import json, math, os, sys

sys.path.insert(0, os.path.dirname(__file__))
from wilayah import AKAR, PROVINSI

DATA = os.path.join(AKAR, "public/banjir/data")
GABUNG_KM, PER_PROV, TERATAS, WASPADA_MIN, DESA_KM = 15.0, 3, 90, 4, 8.0
KELOK, LAJU = 1.4, 40.0
IBUKOTA = {
    "11": ("Banda Aceh", 5.55, 95.32), "12": ("Medan", 3.59, 98.67), "13": ("Padang", -0.95, 100.35), "14": ("Pekanbaru", 0.51, 101.45),
    "15": ("Kota Jambi", -1.61, 103.61), "16": ("Palembang", -2.98, 104.76), "17": ("Bengkulu", -3.80, 102.27), "18": ("Bandar Lampung", -5.43, 105.26),
    "19": ("Pangkalpinang", -2.13, 106.11), "21": ("Tanjungpinang", 0.92, 104.45), "31": ("Jakarta", -6.18, 106.83), "32": ("Bandung", -6.91, 107.61),
    "33": ("Semarang", -6.97, 110.42), "34": ("Yogyakarta", -7.80, 110.37), "35": ("Surabaya", -7.25, 112.75), "36": ("Serang", -6.12, 106.15),
    "51": ("Denpasar", -8.65, 115.22), "52": ("Mataram", -8.58, 116.12), "53": ("Kupang", -10.17, 123.61), "61": ("Pontianak", -0.03, 109.33),
    "62": ("Palangka Raya", -2.21, 113.92), "63": ("Banjarbaru", -3.44, 114.83), "64": ("Samarinda", -0.50, 117.15), "65": ("Tanjung Selor", 2.84, 117.37),
    "71": ("Manado", 1.47, 124.84), "72": ("Palu", -0.90, 119.87), "73": ("Makassar", -5.14, 119.42), "74": ("Kendari", -3.97, 122.51),
    "75": ("Gorontalo", 0.54, 123.06), "76": ("Mamuju", -2.68, 118.89), "81": ("Ambon", -3.70, 128.18), "82": ("Sofifi", 0.74, 127.56),
    "91": ("Jayapura", -2.53, 140.72), "92": ("Manokwari", -0.86, 134.08), "93": ("Merauke", -8.49, 140.40), "94": ("Nabire", -3.36, 135.50),
    "95": ("Wamena", -4.10, 138.94), "96": ("Sorong", -0.88, 131.26),
}


def km(a, b, c, d):
    r = math.pi / 180
    x = math.sin((c - a) * r / 2) ** 2 + math.cos(a * r) * math.cos(c * r) * math.sin((d - b) * r / 2) ** 2
    return 12742 * math.asin(math.sqrt(x))


def jam(jarak):
    return round(jarak * KELOK / LAJU, 1)


def sentroid(ring):
    a = cx = cy = 0.0
    for (x1, y1), (x2, y2) in zip(ring, ring[1:] + ring[:1]):
        c = x1 * y2 - x2 * y1
        a += c; cx += (x1 + x2) * c; cy += (y1 + y2) * c
    if abs(a) < 1e-12:
        return sum(p[1] for p in ring) / len(ring), sum(p[0] for p in ring) / len(ring)
    return cy / (3 * a), cx / (3 * a)


def pusat_kec():
    out, d = {}, os.path.join(AKAR, "public/geo/kecamatan")
    for fn in sorted(os.listdir(d)):
        kode = fn[:2]
        for f in json.load(open(os.path.join(d, fn)))["features"]:
            g, p = f["geometry"], f["properties"]
            ring = max((q[0] for q in (g["coordinates"] if g["type"] == "MultiPolygon" else [g["coordinates"]])), key=len)
            la, lo = sentroid(ring)
            out[f"{kode}|{p['kab']}|{p['kec']}"] = [round(la, 4), round(lo, 4)]
    return out


def gabung(kec, pusat):
    """kec: [(kunci, level)] satu kabupaten, urut level turun. Greedy: kecamatan tertinggi jadi posko, yang <= GABUNG_KM ikut."""
    sisa, hasil = list(kec), []
    while sisa:
        k, lv = sisa.pop(0)
        la, lo = pusat[k]
        ikut = [x for x in sisa if km(la, lo, *pusat[x[0]]) <= GABUNG_KM]
        sisa = [x for x in sisa if x not in ikut]
        hasil.append((k, lv, [k] + [x[0] for x in ikut]))
    return hasil


def pilih_permanen(skor, per_prov=PER_PROV, teratas=TERATAS):
    """skor: [(kunci_kab, n)] -> yang terpilih, urut n turun; paling banyak per_prov per provinsi dan teratas seluruhnya."""
    hit, out = {}, []
    for kb, n in sorted(skor, key=lambda x: (-x[1], x[0])):
        if n <= 0 or hit.get(kb[:2], 0) >= per_prov:
            continue
        hit[kb[:2]] = hit.get(kb[:2], 0) + 1
        out.append((kb, n))
        if len(out) >= teratas:
            break
    return out


def norm(s):
    """nama wilayah -> huruf saja, tanpa 'Kabupaten/Kab.'; 'Kota X' tetap beda dengan 'X'."""
    return "".join(c for c in s.upper().replace("KABUPATEN", "").replace("KAB.", "").replace("KAB ", "") if c.isalpha())


def desa_dekat(daftar, la, lo, batas=DESA_KM):
    """desa terdekat dari titik (daftar = [[lat, lon, kode, nama]]), atau None bila > batas km."""
    best = min(daftar, key=lambda d: (d[0] - la) ** 2 + ((d[1] - lo) * math.cos(la * math.pi / 180)) ** 2, default=None)
    return best if best and km(la, lo, best[0], best[1]) <= batas else None


def main():
    pusat = pusat_kec()
    json.dump(pusat, open(os.path.join(DATA, "pusat_kec.json"), "w"), ensure_ascii=False, separators=(",", ":"))
    st = json.load(open(os.path.join(DATA, "status.json")))
    bahaya = json.load(open(os.path.join(DATA, "bahaya.json"))).get("kec", {})
    kj = json.load(open(os.path.join(DATA, "kejadian.json")))
    try:
        rob = json.load(open(os.path.join(DATA, "rob.json")))
    except (OSError, ValueError):
        rob = {"hari": [], "titik": []}
    try:
        desa = json.load(open(os.path.join(AKAR, "public/data/osm/desa.json")))
    except (OSError, ValueError):
        desa = {}
    bpbd = {}
    try:
        for b in json.load(open(os.path.join(AKAR, "public/data/bpbd.json")))["kantor"]:
            bpbd.setdefault(norm(b["nama"]), []).append(b)
    except (OSError, ValueError, KeyError):
        pass
    kode_prov = {v.lower(): k for k, v in PROVINSI.items()}
    lv_kec = {k: (max(v.get("b", [0])), max(v.get("l", [0]))) for k, v in st["kec"].items()}

    def baru(idx, jenis, k, layan, bh):
        p, kb, kc = k.split("|")
        la, lo = pusat[k]
        x = {"id": idx, "jenis": jenis, "bahaya": bh, "prov": p, "kab": kb, "kec": kc, "lat": la, "lon": lo,
             "b": 0, "l": 0, "r": 0, "h3": None, "nlv": [0, 0, 0, 0], "layan": [], "ib": round(bahaya.get(k, {}).get("banjir" if bh == "rob" else bh) or 0, 2)}
        for kk in layan:
            tambah(x, kk)
        return x

    def tambah(x, kk):
        if kk.split("|")[2] in x["layan"]:
            return
        b, l = lv_kec.get(kk, (0, 0))
        x["layan"].append(kk.split("|")[2]); x["b"] = max(x["b"], b); x["l"] = max(x["l"], l); x["nlv"][max(b, l)] += 1
        h3 = st["kec"].get(kk, {}).get("h3")
        if h3 is not None:
            x["h3"] = max(x["h3"] or 0, h3)

    def terdekat(x_list, kb, la, lo):
        c = [(km(la, lo, x["lat"], x["lon"]), x) for x in x_list if x["prov"] + "|" + x["kab"] == kb]
        c = [y for y in c if y[0] <= GABUNG_KM]
        return min(c, key=lambda y: y[0])[1] if c else None

    # 1. permanen pra-musim
    def nk(v, j):
        return sum((v.get(j) or {}).values())
    skor = [(kb, nk(v, "banjir") + nk(v, "longsor")) for kb, v in kj.get("kab", {}).items()]
    lap = []
    for kb, n in pilih_permanen(skor):
        v = kj["kab"][kb]
        bh = "longsor" if nk(v, "longsor") > nk(v, "banjir") else "banjir"
        cand = [(k, bahaya[k].get(bh) or 0, bahaya[k].get("banjir" if bh == "longsor" else "longsor") or 0) for k in bahaya if k.startswith(kb + "|") and k in pusat]
        if not cand:
            continue
        k = max(cand, key=lambda x: (x[1], x[2]))[0]
        x = baru(f"T{len(lap) + 1:03d}", "permanen", k, [k], bh)
        x["kejadian"] = n; x["kejadian_banjir"] = nk(v, "banjir"); x["kejadian_longsor"] = nk(v, "longsor")
        lap.append(x)
    # 2. kecamatan siaga/awas: ke permanen terdekat bila terjangkau, sisanya posko siaga baru
    aktif, sisa = [], {}
    for k, (b, l) in lv_kec.items():
        if max(b, l) >= 2 and k in pusat:
            kb = "|".join(k.split("|")[:2]); x = terdekat(lap, kb, *pusat[k])
            if x:
                tambah(x, k)
            else:
                sisa.setdefault(kb, []).append((k, max(b, l)))
    for kb, kec in sorted(sisa.items()):
        kec.sort(key=lambda x: (-x[1], x[0]))
        for k, lv, layan in gabung(kec, pusat):
            b, l = lv_kec[k]
            aktif.append(baru(f"L{len(aktif) + 1:03d}", "siaga", k, layan, "longsor" if l > b else "banjir"))
    # 3. gugus waspada yang belum terlayani
    sisa = {}
    for k, (b, l) in lv_kec.items():
        if max(b, l) == 1 and k in pusat:
            kb = "|".join(k.split("|")[:2])
            if not terdekat(lap + aktif, kb, *pusat[k]):
                sisa.setdefault(kb, []).append((k, 1))
    for kb, kec in sorted(sisa.items()):
        kec.sort(key=lambda x: (-(st["kec"][x[0]].get("h3") or 0), x[0]))
        for k, lv, layan in gabung(kec, pusat):
            if len(layan) >= WASPADA_MIN:
                b, l = lv_kec[k]
                aktif.append(baru(f"L{len(aktif) + 1:03d}", "waspada", k, layan, "longsor" if l > b else "banjir"))
    # 4. rob level >= 2 di hari status
    j0 = rob["hari"].index(st["hari"][0]) if st["hari"][0] in rob.get("hari", []) else None
    for t in rob.get("titik", []) if j0 is not None else []:
        lv = max([v for v in t["lv"][j0:j0 + len(st["hari"])] if v is not None] or [0])
        if lv < 2:
            continue
        p = t["prov"] if t["prov"] in PROVINSI else kode_prov.get(str(t["prov"]).lower())
        k = f"{p}|{t['kab']}|{t.get('kec') or ''}"
        la, lo = pusat.get(k, (t["lat"], t["lon"]))
        x = terdekat(lap + aktif, f"{p}|{t['kab']}", la, lo)
        if not x:
            if k not in pusat:
                pusat[k] = [round(t["lat"], 4), round(t["lon"], 4)]
            x = baru(f"L{len(aktif) + 1:03d}", "rob", k, [k], "rob"); aktif.append(x)
        x["r"] = max(x["r"], lv)
    lap += aktif
    # pindah ke desa terdekat bila provinsinya tercakup desa.json
    def ke_desa(x):
        d = desa_dekat(desa.get(x["prov"], []), x["lat"], x["lon"])
        if d:
            x["desa"], x["lat"], x["lon"] = d[3], d[0], d[1]
    for x in lap:
        ke_desa(x)
    # kabupaten: kecamatan terdekat dari titik berat posko lapangannya
    kab, per_kab = [], {}
    for x in lap:
        per_kab.setdefault(x["prov"] + "|" + x["kab"], []).append(x)
    for kb, anggota in sorted(per_kab.items()):
        w = [1 + max(a["b"], a["l"], a["r"]) for a in anggota]
        la = sum(a["lat"] * v for a, v in zip(anggota, w)) / sum(w)
        lo = sum(a["lon"] * v for a, v in zip(anggota, w)) / sum(w)
        nama = kb.split("|")[1]
        # Pos komando kabupaten = kantor BPBD (BNPB peta_bpbd) bila namanya cocok dan masuk akal jaraknya;
        # selain itu kecamatan senama kabupaten (biasanya ibu kota), lalu kecamatan terdekat dari titik berat
        bp = next((b for b in bpbd.get(norm(nama), []) if km(la, lo, b["lat"], b["lon"]) <= 200), None)
        kec_kab = [k for k in pusat if k.startswith(kb + "|")]
        kk = None if bp else next((k for k in kec_kab if norm(k.split("|")[2]) == norm(nama.replace("Kota ", ""))), None) or \
            min(kec_kab, key=lambda k: km(la, lo, *pusat[k]), default=None)
        la, lo = (bp["lat"], bp["lon"]) if bp else pusat[kk] if kk else (la, lo)
        y = {"id": f"K{len(kab) + 1:03d}", "prov": kb[:2], "kab": nama, "kec": kk.split("|")[2] if kk else None, "lat": round(la, 4), "lon": round(lo, 4),
             "lapangan": [a["id"] for a in anggota], "awas": sum(1 for a in anggota if max(a["b"], a["l"], a["r"]) == 3),
             "siaga": sum(1 for a in anggota if max(a["b"], a["l"], a["r"]) == 2), "induk": "P" + kb[:2] if kb[:2] in IBUKOTA else None}
        if bp:
            y["bpbd"] = {"alamat": bp.get("alamat"), "pusdalops": bp.get("pusdalops")}
        else:
            ke_desa(y)
        for a in anggota:
            a["induk"] = y["id"]; a["km_induk"] = round(km(a["lat"], a["lon"], y["lat"], y["lon"]), 1); a["jam_induk"] = jam(a["km_induk"])
        kab.append(y)
    prov = {}
    for y in kab:
        if y["induk"]:
            i = IBUKOTA[y["prov"]]
            y["km_induk"] = round(km(y["lat"], y["lon"], i[1], i[2]), 1); y["jam_induk"] = jam(y["km_induk"])
            prov.setdefault(y["prov"], []).append(y["id"])
    pv = [{"id": "P" + k, "prov": k, "nama": IBUKOTA[k][0], "lat": IBUKOTA[k][1], "lon": IBUKOTA[k][2], "kabupaten": v} for k, v in sorted(prov.items())]
    json.dump({"dibuat": st.get("hari", [""])[0], "gabung_km": GABUNG_KM, "per_prov": PER_PROV, "waspada_min": WASPADA_MIN, "kelok": KELOK, "laju_kmj": LAJU,
               "lapangan": lap, "kabupaten": kab, "provinsi": pv, "permanen": [x for x in lap if x["jenis"] == "permanen"]},
              open(os.path.join(DATA, "posko.json"), "w"), ensure_ascii=False, separators=(",", ":"))
    n = {j: sum(1 for x in lap if x["jenis"] == j) for j in ("permanen", "siaga", "waspada", "rob")}
    print(f"{len(pusat)} kecamatan; posko lapangan {len(lap)} {n}, kabupaten {len(kab)}, provinsi {len(pv)}", file=sys.stderr)


if __name__ == "__main__":
    if sys.argv[1:] == ["uji"]:
        assert abs(km(0, 0, 0, 1) - 111.19) < .1
        assert jam(40) == 1.4
        la, lo = sentroid([[0, 0], [2, 0], [2, 2], [0, 2]])
        assert abs(la - 1) < 1e-9 and abs(lo - 1) < 1e-9
        p = {"a": [0, 0], "b": [0, .1], "c": [0, 1]}
        assert [x[2] for x in gabung([("a", 3), ("b", 2), ("c", 2)], p)] == [["a", "b"], ["c"]]
        s = pilih_permanen([("11|A", 9), ("11|B", 8), ("11|C", 7), ("11|D", 6), ("12|E", 5), ("12|F", 0)], per_prov=3, teratas=10)
        assert [x[0] for x in s] == ["11|A", "11|B", "11|C", "12|E"], s  # batas per provinsi ditaati, skor 0 ditolak
        assert len(pilih_permanen([(f"1{i % 9}|K{i}", 10) for i in range(50)], per_prov=3, teratas=7)) == 7
        assert desa_dekat([[0, 0.05, "x", "Dekat"], [0, 1, "y", "Jauh"]], 0, 0)[3] == "Dekat"
        assert desa_dekat([[0, 1, "y", "Jauh"]], 0, 0) is None  # > DESA_KM ditolak
        assert norm("KAB. ROKAN HULU") == norm("Rokan Hulu") and norm("Kota MEDAN") != norm("Medan")
        print("ok")
    else:
        main()
        # turunan status: dijalankan di sini karena workflow tidak bisa disunting dari mesin agent (token tanpa scope workflow).
        # Pindahkan ke langkah sendiri di banjir.yml bila workflow disunting; jangan jalankan dua kali.
        import subprocess
        for s in ("kejadian_aktif", "seri_status", "dampak"):
            if subprocess.call([sys.executable, os.path.join(os.path.dirname(os.path.abspath(__file__)), s + ".py")]) != 0:
                print(f"::warning title={s}::{s}.py gagal; berkas lamanya dibiarkan", file=sys.stderr)
        # berita banjir (FASE-0 B3): uji dulu; bila uji gagal jangan jalan sungguhan
        umum = os.path.join(os.path.dirname(os.path.abspath(__file__)), "../umum/berita.py")
        if subprocess.call([sys.executable, umum, "banjir", "uji"]) != 0:
            print("::warning title=berita::uji berita banjir gagal; berita.json lama dibiarkan", file=sys.stderr)
        elif subprocess.call([sys.executable, umum, "banjir"]) != 0:
            print("::warning title=berita::berita banjir gagal; berkas lamanya dibiarkan", file=sys.stderr)
        # ringkasan cuaca ekstrem (/cuaca/): dari hujan.json dan ansambel yang baru saja dibuat; gagal = berkas lama dibiarkan
        cuaca = os.path.join(os.path.dirname(os.path.abspath(__file__)), "../cuaca/cuaca.py")
        if subprocess.call([sys.executable, cuaca, "uji"]) != 0 or subprocess.call([sys.executable, cuaca]) != 0:
            print("::warning title=cuaca::cuaca.py gagal; berkas lamanya dibiarkan", file=sys.stderr)
        # gunung api (status MAGMA/PVMBG): dirantai di sini karena belum ada workflow sendiri; gagal tidak boleh menggagalkan banjir
        magma = os.path.join(os.path.dirname(os.path.abspath(__file__)), "../gunungapi/magma.py")
        if subprocess.call([sys.executable, magma, "uji"]) != 0 or subprocess.call([sys.executable, magma]) != 0:
            print("::warning title=gunungapi::magma.py gagal; berkas lamanya dibiarkan", file=sys.stderr)
        # berita + dampak modul lain, harian (aturan A22). Keluaran HARUS di public/banjir/data/{berita,dampak}_<id>.json dan arsip mentah di
        # data/raw/banjir/berita_<id>: hanya dua folder itu yang di-cache, di-commit, dan diterbitkan banjir.yml/data.yml/titik.yml/terbit.yml.
        # Modul baru (cuaca, udara) cukup menaruh scripts/<id>/berita.py|dampak.py berbentuk sama (uji + jalan) dan menambah id di sini.
        # Urutan: setelah magma.py (dampak gunungapi membaca public/banjir/data/gunungapi_status.json).
        base = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
        for m in ("gempa", "gunungapi", "kekeringan", "cuaca", "udara"):
            for s in ("dampak", "berita"):
                p = os.path.join(base, m, s + ".py")
                if not os.path.exists(p):
                    continue
                try:   # cache arsip hilang = isi ulang 120 hari (± 8 mnt); batas waktu supaya tidak menahan terbit
                    ok = subprocess.call([sys.executable, p, "uji"]) == 0 and subprocess.call([sys.executable, p], timeout=900) == 0
                except subprocess.TimeoutExpired:
                    ok = False
                if not ok:
                    print(f"::warning title={m}-{s}::{m}/{s}.py gagal; berkas lamanya dibiarkan", file=sys.stderr)
