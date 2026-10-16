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
Bagian tanpa data dibuang: tidak ada kecamatan Siaga/Awas -> tidak ada kunci "terpapar"; tidak ada sumber -> tidak ada
bagiannya. Per kejadian (kejadian_aktif_awal.json, B0001 ...) bila berkas itu satu hari dengan status.json.

{"hari", "dibuat", "terpapar": {"kec", "penduduk"?, "sekolah"?, "siswa"?, "faskes"?, "rs"?, "kec_tanpa_penduduk"?,
  "kec_tercakup_sekolah/faskes"? (hanya kecamatan yang punya catatan; tak satu pun = kolomnya dibuang),
  "prov": {kode: {...sama}}, "kejadian": {kode: {...sama}}}, "cakupan": {"sekolah_cocok": 0.902},
 "tahunan": {"nasional": {tahun: {kejadian, mengungsi, terdampak, rumah_rusak, ...}}, "prov": {kode: {tahun: {...}}}},
 "sumber": {...}}
Pakai:  python3 scripts/banjir/dampak.py [--hari N] [--keluar DIR] [--status berkas]   |   python3 scripts/banjir/dampak.py uji
"""
import argparse, datetime as dt, os, sys
from collections import defaultdict

sys.path.insert(0, os.path.dirname(__file__))
from umum import AKAR, KELUAR, WIB, baca, simpan

SIAGA = 2


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
    terpapar_kec = sorted(k for k, v in st["kec"].items() if v["b"][d] >= SIAGA)
    out = {"hari": hari, "dibuat": dt.datetime.now(WIB).isoformat(timespec="minutes"), "sumber": {}}
    prov_ada = set()
    if terpapar_kec:
        kunci = set(terpapar_kec)
        pend_j = baca(os.path.join(AKAR, "public/data/penduduk.json"))
        pend = {k: v for k, v in (pend_j or {}).get("kec", {}).items() if k in kunci}
        sk_j = baca(os.path.join(AKAR, "public/data/sekolah.json"))
        sekolah = defaultdict(lambda: (0, 0))
        if sk_j:
            semua, cocok = (pend_j or {}).get("kec", {}), 0
            for r in sk_j["baris"]:
                k = f"{r[5]}|{r[6]}|{r[7]}"
                cocok += k in semua
                if k in kunci:
                    n, s = sekolah[k]
                    sekolah[k] = (n + 1, s + (r[4] or 0))
            out["cakupan"] = {"sekolah_cocok": round(cocok / len(sk_j["baris"]), 3)}  # sisanya namanya tak cocok: tak terhitung
        fas_j = baca(os.path.join(AKAR, "public/data/fasilitas.json"))
        fas = defaultdict(lambda: (0, 0))
        if fas_j:
            from wilayah import Wilayah
            w = Wilayah()
            for f in fas_j:
                if f["t"] in ("faskes", "rs") and f.get("prov") in {k.split("|")[0] for k in kunci}:
                    adm = w.cari(f["lon"], f["lat"])
                    k = f"{adm[0]}|{adm[1]}|{adm[2]}" if adm else None
                    if k in kunci:
                        x, y = fas[k]
                        fas[k] = (x + (f["t"] == "faskes"), y + (f["t"] == "rs"))
        t = hitung(terpapar_kec, pend, sekolah, fas)
        prov = defaultdict(list)
        for k in terpapar_kec:
            prov[k.split("|")[0]].append(k)
        t["prov"] = {p: hitung(ks, pend, sekolah, fas) for p, ks in sorted(prov.items())}
        prov_ada = set(prov)
        ka = baca(os.path.join(a.keluar, "kejadian_aktif_awal.json"), {})
        if ka.get("hari") == hari and ka.get("kejadian"):
            t["kejadian"] = {e["kode"]: hitung(e["kec"], pend, sekolah, fas) for e in ka["kejadian"]}
        out["terpapar"] = t
        out["sumber"]["terpapar"] = "status.json (Siaga/Awas banjir); penduduk WorldPop; sekolah Dapodik/EMIS; faskes OSM. Penduduk total kecamatan, bukan area tergenang; sekolah dan faskes hanya yang tercatat dan cocok, bisa kurang"
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
                                    f"siswa {tp.get('siswa')}, faskes {tp.get('faskes')}, rs {tp.get('rs')}" if tp else "tidak ada kecamatan Siaga/Awas, bagian terpapar dibuang")
          + f"; tahunan {list(out.get('tahunan', {}))}", file=sys.stderr)


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
    print("ok dampak")


if __name__ == "__main__":
    uji() if sys.argv[1:] == ["uji"] else main()
