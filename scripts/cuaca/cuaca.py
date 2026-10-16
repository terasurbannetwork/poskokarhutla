"""Cuaca ekstrem: ringkasan prakiraan hujan, embusan angin, dan peluang ansambel untuk layar /cuaca/.

Tidak mengambil data baru: membaca keluaran modul banjir (sumber sama, tidak diunduh dua kali)
  public/banjir/data/hujan.json            Open-Meteo, kisi 0,25 derajat, 10 hari (hujan mm, embusan km/jam)
  public/banjir/data/hujan_ansambel.json   ECMWF IFS 51 anggota, peluang hujan harian >= 50 / >= 100 mm
  public/banjir/data/meta.json             nama provinsi
dan menulis
  public/banjir/data/cuaca_prakiraan.json   {dibuat, hari, hari_ini, sel:[[lat,lon,prov,[mm],[km/jam]]], ens:[[lat,lon,prov,[p50],[p100]]]}
  public/banjir/data/cuaca_meta.json        {dibuat, ambang, prov, hitung per hari, sumber}  (juga dibaca /api/status)
Keluaran sengaja di folder data banjir: hanya folder itu yang dikecualikan dari checkout main dan di-commit oleh banjir.yml
(token tanpa scope workflow, jadi workflow tak bisa disunting). public/cuaca/data hanya menampung penanda folder untuk registry.
Peringatan BMKG (nowcast CAP, gelombang) tidak disalin: layar membaca public/data/peringatan.json apa adanya.
Riwayat harian (tab Tren) append-only di public/banjir/data/cuaca_riwayat.json: tiap jalan menulis hari_ini (prakiraan) dan memperbarui
hari-hari lalu yang masih ada di hujan.json (past_days=7, analisis model); hari yang lebih tua dari itu tidak pernah disentuh lagi.
Hanya yang model hitung penuh per hari (sel hujan lebat, embusan kencang, nilai terbesar). Peringatan nowcast TIDAK dicatat: berkasnya
terbit sekali sehari dan nowcast hidup 2-3 jam, jadi hitungan "per hari" selalu tidak lengkap (A18).
Dampak (tab Dampak): jiwa di sel prakiraan hujan lebat hari ini + kejadian tahunan BNPB, lihat scripts/cuaca/dampak_cuaca.py (dirantai di akhir main).

Ambang dari docs/multi-bencana/bencana/cuaca.md §4 (hipotesis awal, belum dikunci uji balik):
  hujan harian 50 / 100 / 150 mm (kelas BMKG lebat, sangat lebat, ekstrem)
  embusan 15 / 20 / 25 m/s = 54 / 72 / 90 km/jam
Badai guntur (CAPE dan LI) tidak ditampilkan: indeks angkat (LI) tidak ada di sumber, dibuang (A18).

Pakai:  python3 scripts/cuaca/cuaca.py   |   python3 scripts/cuaca/cuaca.py uji
Jalankan sesudah hujan.py dan ansambel_hujan.py (dirantai di akhir scripts/banjir/posko.py).
"""
import os, sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "../banjir"))
from umum import KELUAR as BANJIR, baca, simpan

HUJAN = (50, 100, 150)
ANGIN = (54, 72, 90)


def tingkat(v, ambang):
    """0 bila di bawah ambang pertama, selain itu 1..3."""
    return sum(1 for a in ambang if (v or 0) >= a)


def hitung(sel, ens, n_hari):
    """Per hari: jumlah sel hujan [lebat, sangat lebat, ekstrem], embusan [waspada, siaga, awas], titik ansambel p50 >= 50%."""
    out = []
    for i in range(n_hari):
        h, a = [0, 0, 0], [0, 0, 0]
        for r in sel:
            if tingkat(r[3][i], HUJAN):
                h[tingkat(r[3][i], HUJAN) - 1] += 1
            if tingkat(r[4][i], ANGIN):
                a[tingkat(r[4][i], ANGIN) - 1] += 1
        out.append({"hujan": h, "angin": a, "ens": sum(1 for r in ens if (r[3][i] or 0) >= .5)})
    return out


def sejajar(hari, hari_e, nilai):
    """Deret ansambel (mulai hari_e[0]) disejajarkan ke daftar `hari`; hari di luar jangkauan = None."""
    p = dict(zip(hari_e, nilai))
    return [p.get(t) for t in hari]


def olah(hujan, ans, prov):
    hari = hujan["hari"]
    sel = [[g["lat"], g["lon"], g["prov"], g["h"], g["g"]] for g in hujan["grid"]]
    ens = [[g["lat"], g["lon"], g["prov"], sejajar(hari, ans["hari"], g["p50"]), sejajar(hari, ans["hari"], g["p100"])] for g in ans["grid"]] if ans else []
    i0 = hari.index(hujan["hari_ini"])
    pakai = {r[2] for r in sel} | {r[2] for r in ens}
    return {"hari": hari, "hari_ini": hujan["hari_ini"], "sel": sel, "ens": ens}, {
        "hari": hari, "hari_ini": hujan["hari_ini"], "i0": i0, "sel": hujan["sel"],
        "ambang": {"hujan": list(HUJAN), "angin_kmj": list(ANGIN)},
        "prov": {k: v for k, v in prov.items() if k in pakai},
        "hitung": hitung(sel, ens, len(hari)),
        "sumber": {"hujan": "Open-Meteo (model terbaik per lokasi), kisi 0,25 derajat",
                   "ansambel": ans.get("model") if ans else None, "peringatan": "BMKG"}}


RIWAYAT_MAKS = 800
KOLOM_RW = ["hujan_lebat", "hujan_sangat_lebat", "hujan_ekstrem", "angin_waspada", "angin_siaga", "angin_awas", "hujan_maks_mm", "angin_maks_kmj"]


def riwayat(lama, sel, hari, hari_ini, hitung_hari):
    """Gabungkan hari <= hari_ini ke `lama` ({kolom, tgl, prov}); hari lebih tua dari yang ada di `hari` tidak disentuh.
    tgl[t] = [sel lebat, sangat lebat, ekstrem, embusan waspada, siaga, awas, mm terbesar, km/jam terbesar]; prov[kode][t] = [mm terbesar, km/jam terbesar]."""
    rw = lama if lama and lama.get("kolom") == KOLOM_RW else {"kolom": KOLOM_RW, "tgl": {}, "prov": {}}
    for i, t in enumerate(hari):
        if t > hari_ini:
            break
        h = hitung_hari[i]
        mm = [r[3][i] for r in sel if r[3][i] is not None]
        kj = [r[4][i] for r in sel if r[4][i] is not None]
        if not mm and not kj:
            continue
        rw["tgl"][t] = [*h["hujan"], *h["angin"], round(max(mm or [0])), round(max(kj or [0]))]
        for r in sel:
            if r[3][i] is None and r[4][i] is None:
                continue
            P = rw["prov"].setdefault(r[2], {}).get(t) or [0, 0]
            rw["prov"][r[2]][t] = [max(P[0], round(r[3][i] or 0)), max(P[1], round(r[4][i] or 0))]
    rw["tgl"] = dict(sorted(rw["tgl"].items())[-RIWAYAT_MAKS:])
    awal = next(iter(rw["tgl"]), "")
    rw["prov"] = {k: dict(sorted((t, v) for t, v in d.items() if t >= awal)) for k, d in rw["prov"].items()}
    rw["sumber"] = "Open-Meteo (model terbaik per lokasi), kisi 0,25 derajat; hari lampau = analisis model, bukan alat ukur"
    return rw


def main():
    hujan = baca(os.path.join(BANJIR, "hujan.json"))
    if not hujan:
        print("hujan.json tidak ada: cuaca dilewati", file=sys.stderr)
        sys.exit(1)
    ans = baca(os.path.join(BANJIR, "hujan_ansambel.json"))
    if ans and ans["hari"][0] < hujan["hari_ini"]:
        ans = None  # ansambel basi (hari pertamanya sudah lewat) dibuang, bukan ditampilkan salah hari
    prov = (baca(os.path.join(BANJIR, "meta.json")) or {}).get("provinsi", {})
    pr, meta = olah(hujan, ans, prov)
    pr["dibuat"] = meta["dibuat"] = (baca(os.path.join(BANJIR, "meta.json")) or {}).get("dibuat")
    simpan(os.path.join(BANJIR, "cuaca_prakiraan.json"), pr)
    simpan(os.path.join(BANJIR, "cuaca_meta.json"), meta)
    simpan(os.path.join(BANJIR, "cuaca_riwayat.json"), riwayat(baca(os.path.join(BANJIR, "cuaca_riwayat.json")), pr["sel"], pr["hari"], pr["hari_ini"], meta["hitung"]))
    try:
        import dampak_cuaca as dampak
        dampak.main(pr, meta)
    except Exception as e:  # dampak tak boleh menjatuhkan prakiraan
        print(f"::warning title=cuaca dampak::{e}", file=sys.stderr)
    h = meta["hitung"][meta["i0"]]
    print(f"cuaca: {len(pr['sel'])} sel, {len(pr['ens'])} titik ansambel; hari ini hujan lebat+ {sum(h['hujan'])} sel, embusan >= 54 km/jam {sum(h['angin'])} sel")


if __name__ == "__main__":
    if sys.argv[1:] == ["uji"]:
        assert [tingkat(v, HUJAN) for v in (None, 49.9, 50, 100, 150, 400)] == [0, 0, 1, 2, 3, 3]
        assert [tingkat(v, ANGIN) for v in (53, 54, 72, 90)] == [0, 1, 2, 3]
        assert sejajar(["a", "b", "c"], ["b", "c", "d"], [.1, .2, .3]) == [None, .1, .2]
        hj = {"hari": ["a", "b"], "hari_ini": "b", "sel": .25, "grid": [
            {"lat": 1, "lon": 2, "prov": "11", "h": [0, 120], "g": [10, 80]},
            {"lat": 1, "lon": 3, "prov": "12", "h": [60, 5], "g": [55, 10]}]}
        an = {"hari": ["b"], "model": "m", "grid": [{"lat": 1, "lon": 2, "prov": "11", "p50": [.7], "p100": [.2], "p3": [0]}]}
        pr, m = olah(hj, an, {"11": "Aceh", "12": "Sumut", "99": "Lain"})
        assert m["hitung"][1] == {"hujan": [0, 1, 0], "angin": [0, 1, 0], "ens": 1}, m["hitung"]
        assert m["hitung"][0] == {"hujan": [1, 0, 0], "angin": [1, 0, 0], "ens": 0}
        assert pr["ens"][0][3] == [None, .7] and "99" not in m["prov"] and m["i0"] == 1
        assert olah(hj, None, {})[0]["ens"] == []
        rw = riwayat(None, pr["sel"], pr["hari"], pr["hari_ini"], m["hitung"])
        assert rw["tgl"] == {"a": [1, 0, 0, 1, 0, 0, 60, 55], "b": [0, 1, 0, 0, 1, 0, 120, 80]}, rw["tgl"]
        assert rw["prov"]["11"]["b"] == [120, 80] and rw["prov"]["12"]["a"] == [60, 55]
        hj["hari"].append("c"); hj2 = riwayat(rw, [[1, 2, "11", [0, 120, 999], [10, 80, 99]]], ["a", "b", "c"], "b", [{"hujan": [0, 0, 0], "angin": [0, 0, 0]}] * 3)
        assert "c" not in hj2["tgl"] and hj2["tgl"]["a"][6] == 0 and hj2["prov"]["12"]["a"] == [60, 55]  # hari depan tak dicatat; hari lampau diperbarui, prov lain utuh
        print("ok")
    else:
        main()
