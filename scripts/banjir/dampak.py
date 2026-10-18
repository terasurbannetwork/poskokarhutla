"""Dampak banjir, tanpa jaringan -> public/banjir/data/dampak.json

Dihitung dari berkas lain (tidak ada panggilan jaringan):
  terpapar  kecamatan berstatus banjir Siaga/Awas hari ini (status.json hari ke-0): jumlah kecamatan, penduduk
            (public/data/penduduk.json, WorldPop), sekolah dan siswa (public/data/sekolah.json, dicocokkan lewat nama
            prov|kab|kec), puskesmas/klinik dan rumah sakit (public/data/fasilitas.json OSM, dicari kecamatannya lewat
            titik). Penduduk = semua penghuni kecamatan berstatus (BUKAN area tergenang). Sekolah dan faskes = yang tercatat di sumbernya
            dan cocok nama/titik kecamatan: bisa KURANG dari kenyataan (sekolah.json 90% cocok, fasilitas OSM tak lengkap).
  tahunan   kejadian, korban, dan kerugian tahunan banjir dari kejadian.json (BNPB/DIBI): nasional, dan provinsi yang
            terpapar. Hanya angka yang tercatat; kunci yang tidak ada pada sumbernya (mis. meninggal nasional, rupiah
            kerugian) tidak diisi.
  jalan     "berisiko terputus" = panjang jalan (OSM kelas 1-3: nasional/provinsi/kabupaten; sungai tidak dihitung) di kecamatan
            Siaga/Awas yang indeks bahaya banjir InaRISK-nya tinggi (>= 0,66). BUKAN jalan yang pasti tergenang: tanpa peta genangan
            nyata ini batas atas yang jujur. Jalan dibagi ke kecamatan lewat titik tengah tiap ruas.
  hari      blok dihitung untuk tiap hari status.json (0 = hari ini, 1-3 = prakiraan): `terpapar` = hari terpilih (--hari),
            `prakiraan` = {tanggal: blok} hari sesudahnya, `hari_semua` = semua tanggal (pemilih hari di layar).
Bagian tanpa data dibuang: tidak ada kecamatan Siaga/Awas -> tidak ada kunci "terpapar"; tidak ada sumber -> tidak ada
bagiannya. Per kejadian (kejadian_aktif_awal.json, B0001 ...) bila berkas itu satu hari dengan status.json.

{"hari", "dibuat", "terpapar": {"kec", "penduduk"?, "sekolah"?, "siswa"?, "faskes"?, "rs"?, "kec_tanpa_penduduk"?,
  "kec_tercakup_sekolah/faskes/jalan"?, "jalan_km"?, "jalan_nas_km"?, "kec_bahaya_tinggi"?, "kec_tanpa_bahaya"? (hanya kecamatan yang punya catatan; tak satu pun = kolomnya dibuang),
  "prov": {kode: {...sama}}, "kejadian": {kode: {...sama}}}, "prakiraan": {tanggal: {...sama tanpa kejadian}}, "hari_semua": [...],
 "cakupan": {"sekolah_cocok": 0.902, "prov_sekolah": [...], "prov_faskes": [...], "prov_jalan": [...]},
 "tahunan": {"nasional": {tahun: {kejadian, mengungsi, terdampak, rumah_rusak, ...}}, "prov": {kode: {tahun: {...}}}},
 "sumber": {...}}
Pakai:  python3 scripts/banjir/dampak.py [--hari N] [--keluar DIR] [--status berkas]   |   python3 scripts/banjir/dampak.py uji
"""
import argparse, datetime as dt, json, math, os, sys
from collections import defaultdict

sys.path.insert(0, os.path.dirname(__file__))
from umum import AKAR, KELUAR, WIB, baca, simpan

SIAGA = 2
TINGGI = 0.66          # batas bahaya InaRISK tinggi (RISET-PARAMETER.md)
KELAS_JALAN = (1, 2, 3)  # public/data/jalan.geojson k: 1 nasional, 2 provinsi, 3 kabupaten (6 = sungai, dibuang)


def hitung(kec, pend, sekolah, fasilitas_kec):
    """kec: [kunci]; pend: {kunci: jiwa}; sekolah: {kunci: (n, siswa)}; fasilitas_kec: {kunci: (faskes, rs)};
    Sekolah/faskes tercakup = kecamatan yang punya catatan di sumbernya (kunci ada di `sekolah`/`fasilitas_kec`); kecamatan
    tanpa catatan (nama tak cocok atau memang tak tercatat) dibuang dari jumlah dan dihitung di kec_tercakup_*, bukan 0."""
    a = {"kec": len(kec)}
    pk = [k for k in kec if k in pend]
    if pk:
        a["penduduk"] = sum(pend[k] for k in pk)
        if len(pk) < len(kec):
            a["kec_tanpa_penduduk"] = len(kec) - len(pk)
    for nama, kolom, sumber in (("sekolah", ("sekolah", "siswa"), sekolah), ("faskes", ("faskes", "rs"), fasilitas_kec)):
        ck = [k for k in kec if k in sumber]
        if not ck:
            continue
        for i, c in enumerate(kolom):
            a[c] = sum(sumber[k][i] for k in ck)
        if len(ck) < len(kec):
            a[f"kec_tercakup_{nama}"] = len(ck)
    return a


def km(a1, o1, a2, o2):
    return math.hypot((a2 - a1) * 110.57, (o2 - o1) * 111.32 * math.cos(math.radians((a1 + a2) / 2)))


def jalan_per_kec(garis, cari, boleh):
    """garis: [(kelas, [[lon, lat], ...])]; cari(lon, lat) -> kunci "prov|kab|kec" atau None; boleh: himpunan kunci yang dihitung.
    -> {kunci: {kelas: km}}; tiap ruas masuk ke kecamatan titik tengahnya."""
    out = {}
    for kelas, pts in garis:
        for (x1, y1), (x2, y2) in zip(pts, pts[1:]):
            k = cari((x1 + x2) / 2, (y1 + y2) / 2)
            if k in boleh:
                d = out.setdefault(k, {})
                d[kelas] = d.get(kelas, 0) + km(y1, x1, y2, x2)
    return out


def hitung_jalan(kec, bahaya, jalan, prov_ok):
    """Jalan berisiko terputus: km jalan di kecamatan (dalam wilayah cakupan jalan) yang bahaya banjirnya tinggi.
    Kecamatan tanpa nilai bahaya tidak dihitung dan dilaporkan di kec_tanpa_bahaya; di luar cakupan -> kec_tercakup_jalan."""
    ck = [k for k in kec if k.split("|")[0] in prov_ok]
    if not ck:
        return {}
    tinggi = [k for k in ck if bahaya.get(k, -1) >= TINGGI]
    a = {"kec_bahaya_tinggi": len(tinggi), "jalan_km": round(sum(sum(jalan.get(k, {}).values()) for k in tinggi)),
         "jalan_nas_km": round(sum(jalan.get(k, {}).get(1, 0) for k in tinggi))}
    if len(ck) < len(kec):
        a["kec_tercakup_jalan"] = len(ck)
    tb = sum(1 for k in ck if k not in bahaya)
    if tb:
        a["kec_tanpa_bahaya"] = tb
    return a


def tahunan(blok):
    """{tahun: {kunci: angka}} dari blok kejadian.json, hanya kunci yang ada dan bukan None."""
    return {t: {k: v for k, v in d.items() if v is not None} for t, d in sorted((blok or {}).items()) if d}


def main():
    a = argparse.ArgumentParser()
    a.add_argument("--hari", type=int, default=0)
    a.add_argument("--keluar", default=KELUAR)
    a.add_argument("--status", default=os.path.join(KELUAR, "status.json"))  # untuk uji dengan status buatan
    a = a.parse_args()
    st = baca(a.status)
    if not st:
        sys.exit("status.json belum ada")
    d = a.hari
    hari = st["hari"][d]
    per_hari = {i: sorted(k for k, v in st["kec"].items() if v["b"][i] >= SIAGA) for i in range(d, len(st["hari"]))}
    kunci = set().union(*per_hari.values())
    out = {"hari": hari, "dibuat": dt.datetime.now(WIB).isoformat(timespec="minutes"), "hari_semua": st["hari"][d:], "sumber": {}}
    prov_ada = set()
    if kunci:
        pend_j = baca(os.path.join(AKAR, "public/data/penduduk.json"))
        pend = {k: v for k, v in (pend_j or {}).get("kec", {}).items() if k in kunci}
        sk_j = baca(os.path.join(AKAR, "public/data/sekolah.json"))
        sekolah, cak = {}, {}
        if sk_j:
            semua, cocok, ps = (pend_j or {}).get("kec", {}), 0, set()
            for r in sk_j["baris"]:
                k = f"{r[5]}|{r[6]}|{r[7]}"
                cocok += k in semua
                ps.add(r[5])
                if k in kunci:
                    n, s = sekolah.get(k, (0, 0))
                    sekolah[k] = (n + 1, s + (r[4] or 0))
            # kecamatan di provinsi yang tercakup tetapi tanpa sekolah cocok = 0 yang sah; di luar provinsi = dibuang
            sekolah = {k: sekolah.get(k, (0, 0)) for k in kunci if k.split("|")[0] in ps}
            cak = {"sekolah_cocok": round(cocok / len(sk_j["baris"]), 3), "prov_sekolah": sorted(ps)}  # sisanya namanya tak cocok: tak terhitung
        fas_j = baca(os.path.join(AKAR, "public/data/fasilitas.json"))
        fas = {}
        from wilayah import Wilayah
        w = Wilayah()

        def cari(x, y):
            m = w.cari(x, y)
            return f"{m[0]}|{m[1]}|{m[2]}" if m else None
        if fas_j:
            pf = {f.get("prov") for f in fas_j if f["t"] in ("faskes", "rs")}
            for f in fas_j:
                if f["t"] in ("faskes", "rs") and f.get("prov") in {k.split("|")[0] for k in kunci}:
                    k = cari(f["lon"], f["lat"])
                    if k in kunci:
                        x, y = fas.get(k, (0, 0))
                        fas[k] = (x + (f["t"] == "faskes"), y + (f["t"] == "rs"))
            fas = {k: fas.get(k, (0, 0)) for k in kunci if k.split("|")[0] in pf}
            cak["prov_faskes"] = sorted(pf - {None})
        # jalan berisiko terputus: hanya kecamatan Siaga/Awas dengan bahaya banjir tinggi yang perlu dihitung km-nya
        bahaya = {k: v["banjir"] for k, v in (baca(os.path.join(a.keluar, "bahaya.json"), {}) or {}).get("kec", {}).items()
                  if k in kunci and v.get("banjir") is not None}
        tinggi = {k for k, v in bahaya.items() if v >= TINGGI}
        jalan, prov_jalan = {}, set()
        gj = baca(os.path.join(AKAR, "public/data/jalan.geojson"))
        if gj:
            garis = [(f["properties"]["k"], ruas) for f in gj["features"] if f["properties"].get("k") in KELAS_JALAN for ruas in f["geometry"]["coordinates"]]
            prov_jalan = {(cari(*r[len(r) // 2]) or "|").split("|")[0] for _, r in garis[::40]} - {""}  # contoh titik: provinsi yang punya jalan
            jalan = jalan_per_kec([g for g in garis if g[1]], cari, tinggi) if tinggi else {}
            cak["prov_jalan"] = sorted(prov_jalan)

        def blok(ks):
            t = hitung(ks, pend, sekolah, fas)
            t.update(hitung_jalan(ks, bahaya, jalan, prov_jalan))
            return t

        def lengkap(ks):
            t = blok(ks)
            pv = defaultdict(list)
            for k in ks:
                pv[k.split("|")[0]].append(k)
            t["prov"] = {p: blok(x) for p, x in sorted(pv.items())}
            return t, set(pv)
        for i, ks in per_hari.items():
            if not ks:
                continue
            t, pa = lengkap(ks)
            prov_ada |= pa
            if i == d:
                ka = baca(os.path.join(a.keluar, "kejadian_aktif_awal.json"), {})
                if ka.get("hari") == hari and ka.get("kejadian"):
                    t["kejadian"] = {e["kode"]: blok(e["kec"]) for e in ka["kejadian"]}
                out["terpapar"] = t
            else:
                out.setdefault("prakiraan", {})[st["hari"][i]] = t
        if cak:
            out["cakupan"] = cak
        out["sumber"]["terpapar"] = ("status.json (Siaga/Awas banjir); penduduk WorldPop; sekolah Dapodik/EMIS; faskes OSM; jalan OSM kelas 1-3 dan bahaya banjir InaRISK. "
                                     "Penduduk total kecamatan, bukan area tergenang; sekolah dan faskes hanya yang tercatat dan cocok, bisa kurang; "
                                     "jalan = berisiko terputus (zona bahaya tinggi di kecamatan Siaga/Awas), bukan jalan yang pasti tergenang")
    kj = baca(os.path.join(KELUAR, "kejadian.json"))
    if kj:
        nas = tahunan(kj.get("nasional", {}).get("banjir"))
        pv = {p: tahunan(kj.get("prov", {}).get(p, {}).get("banjir")) for p in sorted(prov_ada)}
        th = {}
        if nas:
            th["nasional"] = nas
        pv = {p: v for p, v in pv.items() if v}
        if pv:
            th["prov"] = pv
        if th:
            out["tahunan"] = th
            out["sumber"]["tahunan"] = kj.get("sumber", "BNPB")
    simpan(os.path.join(a.keluar, "dampak.json"), out)
    tp = out.get("terpapar")
    print(f"dampak: hari {hari}: " + (f"{tp['kec']} kec Siaga/Awas, penduduk {tp.get('penduduk')}, sekolah {tp.get('sekolah')}, "
                                    f"siswa {tp.get('siswa')}, faskes {tp.get('faskes')}, rs {tp.get('rs')}, jalan berisiko {tp.get('jalan_km')} km "
                                    f"({tp.get('kec_bahaya_tinggi')} kec bahaya tinggi)" if tp else "tidak ada kecamatan Siaga/Awas, bagian terpapar dibuang")
          + f"; prakiraan {list(out.get('prakiraan', {}))}; tahunan {list(out.get('tahunan', {}))}", file=sys.stderr)


def uji():
    k1, k2 = "1|a|a", "1|a|b"
    t = hitung([k1, k2], {k1: 100}, {k1: (2, 300)}, {k2: (1, 1)})
    assert t == {"kec": 2, "penduduk": 100, "kec_tanpa_penduduk": 1, "sekolah": 2, "siswa": 300, "kec_tercakup_sekolah": 1,
                 "faskes": 1, "rs": 1, "kec_tercakup_faskes": 1}, t
    assert hitung([k1], {}, {}, {}) == {"kec": 1}          # tak ada sumber: semua dibuang, bukan nol
    t = hitung([k1, k2], {}, {k1: (0, 0)}, {})              # nama tak cocok (k2) tidak dihitung 0 diam-diam
    assert t == {"kec": 2, "sekolah": 0, "siswa": 0, "kec_tercakup_sekolah": 1}, t
    assert tahunan({"2024": {"kejadian": 3, "meninggal": None}, "2023": {}}) == {"2024": {"kejadian": 3}}
    assert tahunan(None) == {}
    # jalan: ruas dibagi ke kecamatan titik tengahnya; hanya kecamatan `boleh`
    cari = lambda x, y: "1|a|a" if x < 1 else "1|a|b" if x < 2 else None
    j = jalan_per_kec([(1, [[0, 0], [0.5, 0], [1.5, 0]]), (3, [[0.2, 0], [0.4, 0]]), (1, [[5, 0], [6, 0]])], cari, {"1|a|a", "1|a|b"})
    assert set(j) == {"1|a|a", "1|a|b"} and set(j["1|a|a"]) == {1, 3} and j["1|a|b"][1] > 0, j
    assert jalan_per_kec([(1, [[0, 0], [0.5, 0]])], cari, {"1|a|b"}) == {}   # kecamatan lain dibuang
    jl = {"1|a|a": {1: 10.4, 3: 5.0}, "1|a|b": {1: 99}}
    t = hitung_jalan([k1, k2, "2|x|y"], {k1: 0.7, k2: 0.2}, jl, {"1"})
    assert t == {"kec_bahaya_tinggi": 1, "jalan_km": 15, "jalan_nas_km": 10, "kec_tercakup_jalan": 2}, t   # k2 bahaya rendah: 99 km tak dihitung
    assert hitung_jalan(["2|x|y"], {}, {}, {"1"}) == {}                  # di luar cakupan: dibuang, bukan 0
    assert hitung_jalan([k1], {}, {}, {"1"})["kec_tanpa_bahaya"] == 1    # tanpa nilai bahaya: dilaporkan, tak diam-diam 0
    print("ok dampak")


if __name__ == "__main__":
    uji() if sys.argv[1:] == ["uji"] else main()
