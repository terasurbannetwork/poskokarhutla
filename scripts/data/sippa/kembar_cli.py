#!/usr/bin/env python3
"""SIPPA: jembatan kembar JS <-> Python (DESAIN-TEKNIS §5.1, SP-019/SP-026). Stdlib saja.
Dipanggil `python3 -I scripts/data/sippa/kembar_cli.py`: stdin = satu kasus {"fungsi","masukan"} atau daftar kasus
(bentuk acuan.json), stdout = JSON hasil (daftar bila masukan daftar). Galat masukan domain -> {"galat": "..."}, keluar 0;
JSON rusak atau fungsi tak dikenal -> keluar 2.
Pakai lain: kembar_cli.py uji   (semua kasus acuan.json + dispatcher)"""
import json
import sys
from pathlib import Path

AKAR = Path(__file__).resolve().parent
sys.path.append(str(AKAR))  # append: `-I` tidak memuat folder skrip, dan folder lain tidak boleh menang atas stdlib
import bersama  # noqa: E402
import hidraulika  # noqa: E402
import respons  # noqa: E402

ACUAN = AKAR.parents[2] / "tests" / "sippa" / "fixtures" / "acuan.json"
TOLERANSI = 0.01

# nama JS (camelCase) dan snake_case -> pemanggil(masukan)
FUNGSI = {
    "hidraulika": lambda m: hidraulika.hidraulika(m),
    "fSuhu": lambda m: hidraulika.f_suhu(m["suhu_c"]),
    "neracaAir": lambda m: hidraulika.neraca_air(m),
    "joukowsky": lambda m: hidraulika.joukowsky(m["dv"], m["a"]),
    "zona": lambda m: respons.zona(m.get("air"), m.get("jalan")),
    "saranSarana": lambda m: respons.saran_sarana(m["k"], m["versi"], m.get("api_aktif", False), m.get("cek")),
    "matriksRespons": lambda m: respons.matriks_respons(m["frp"], m["luas_ha"], m.get("zona"), m["koef"], m.get("jam_tiba")),
    "tingkatPemicu": lambda m: respons.tingkat_pemicu(m),
    "kuantil": lambda m: bersama.kuantil(m["xs"], m["p"]),
    "bandingRerata": lambda m: bersama.banding_rerata(m["a"], m["b"]),
    "bandingProporsi": lambda m: bersama.banding_proporsi(m["xa"], m["na"], m["xb"], m["nb"]),
    "vonisPilot": lambda m: bersama.vonis_pilot(m),
    "keuangan": lambda m: bersama.keuangan(m),
}
SNAKE = {"f_suhu": "fSuhu", "neraca_air": "neracaAir", "saran_sarana": "saranSarana", "matriks_respons": "matriksRespons",
         "tingkat_pemicu": "tingkatPemicu", "banding_rerata": "bandingRerata", "banding_proporsi": "bandingProporsi",
         "vonis_pilot": "vonisPilot"}


def jalankan(kasus):
    nama = SNAKE.get(kasus.get("fungsi"), kasus.get("fungsi"))
    if nama not in FUNGSI:
        raise KeyError(f"fungsi {kasus.get('fungsi')} tidak dikenal")
    try:
        return {"id": kasus.get("id"), "hasil": FUNGSI[nama](kasus.get("masukan") or {})}
    except ValueError as e:  # RangeError di JS
        return {"id": kasus.get("id"), "galat": str(e)}


def bandingkan(harap, hasil, tol=TOLERANSI, jalur="harap"):
    """Daftar selisih (kosong = cocok). Bilangan: relatif `tol`; string/bool/null: sama persis;
    `gerbang` = daftar kode urut; `gerbang_tanpa` = kode yang tidak boleh ada."""
    if isinstance(harap, dict):
        if not isinstance(hasil, dict):
            return [f"{jalur}: harapan objek, hasil {hasil!r}"]
        gal = []
        for k, v in harap.items():
            if k == "gerbang":
                kode = [g["kode"] for g in hasil.get("gerbang", [])]
                if kode != v:
                    gal.append(f"{jalur}.gerbang: harap {v}, hasil {kode}")
            elif k == "gerbang_tanpa":
                kode = [g["kode"] for g in hasil.get("gerbang", [])]
                gal += [f"{jalur}.gerbang_tanpa: {c} tidak boleh ada, hasil {kode}" for c in v if c in kode]
            elif k not in hasil:
                gal.append(f"{jalur}.{k}: tidak ada di hasil")
            else:
                gal += bandingkan(v, hasil[k], tol, f"{jalur}.{k}")
        return gal
    if isinstance(harap, list):
        if not isinstance(hasil, list) or len(harap) != len(hasil):
            return [f"{jalur}: harap {harap!r}, hasil {hasil!r}"]
        return [e for i, (a, b) in enumerate(zip(harap, hasil)) for e in bandingkan(a, b, tol, f"{jalur}[{i}]")]
    if isinstance(harap, (int, float)) and not isinstance(harap, bool):
        if not isinstance(hasil, (int, float)) or isinstance(hasil, bool):
            return [f"{jalur}: harap {harap}, hasil {hasil!r}"]
        batas = max(tol * abs(harap), 1e-9)
        return [] if abs(hasil - harap) <= batas else [f"{jalur}: harap {harap}, hasil {hasil} (selisih {abs(hasil - harap):.6g} > {batas:.3g})"]
    return [] if harap == hasil else [f"{jalur}: harap {harap!r}, hasil {hasil!r}"]


def uji_fixture(fungsi=None):
    """Jalankan kasus acuan.json (hanya `fungsi` bila diberikan); berhenti di galat pertama. Mengembalikan jumlah kasus."""
    kasus = json.loads(ACUAN.read_text(encoding="utf-8"))
    n = 0
    for k in kasus:
        if fungsi is not None and k["fungsi"] not in fungsi:
            continue
        r = jalankan(k)
        assert "hasil" in r, f"{k['id']}: galat tak terduga {r}"
        gal = bandingkan(k["harap"], r["hasil"], k.get("toleransi", TOLERANSI), k["id"])
        assert not gal, "; ".join(gal)
        n += 1
    assert n, f"tidak ada kasus acuan untuk {fungsi}"
    return n


def uji():
    n = uji_fixture()
    ada = {k["fungsi"] for k in json.loads(ACUAN.read_text(encoding="utf-8"))}
    assert ada <= set(FUNGSI), f"fungsi acuan tanpa pemanggil: {ada - set(FUNGSI)}"
    assert jalankan({"id": "X", "fungsi": "hidraulika", "masukan": {"dalam_m": 5.1}})["galat"].startswith("Injeksi lebih dari 5 m")
    assert bandingkan({"a": 1.0}, {"a": 1.02}) and not bandingkan({"a": 1.0}, {"a": 1.005}), "toleransi 1% harus menolak 2%"
    assert bandingkan({"vonis": "NO-GO"}, {"vonis": "HOLD"}) and bandingkan({"gerbang": ["H-SERAP"]}, {"gerbang": []})
    print(f"kembar_cli.py uji: OK ({n} kasus acuan.json semua fungsi)")


def main():
    if sys.argv[1:] == ["uji"]:
        return uji()
    try:
        m = json.load(sys.stdin)
    except json.JSONDecodeError as e:
        sys.exit(f"stdin bukan JSON: {e}")
    try:
        out = [jalankan(k) for k in m] if isinstance(m, list) else jalankan(m)
    except KeyError as e:
        sys.exit(f"galat: {e.args[0]}")
    json.dump(out, sys.stdout, ensure_ascii=False)
    sys.stdout.write("\n")


if __name__ == "__main__":
    main()
