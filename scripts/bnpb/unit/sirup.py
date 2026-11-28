"""Pembaca cache SIRUP BNPB untuk REN-2 dan SDU-1 (DESAIN-TEKNIS sec 6.25, 6.26; tiket RU-070, RU-071).

Pustaka murni, bukan langkah jalan.py. Membaca docs/pendanaan/cache/<jalur>-BNPB-<tahun>.json (hasil docs/pendanaan/sirup_tarik.py, ada di repo;
pembungkus panen.sirup RU-036 belum ada, tidak ada permintaan jaringan di sini). Nama penyedia tidak ada di sumber dan tidak pernah dibawa;
nama paket hanya dipakai untuk pengelompokan di sdu1.py dan tidak ditulis ke keluaran.

  paket(tahun, jalur)    -> list baris RUP BNPB tahun itu (jalur penyedia | swakelola)
  tahun_terbaru()        -> tahun terbesar yang punya berkas penyedia dan swakelola BNPB
  lokasi_kab(teks, peta) -> ([kode kab], jumlah_lokasi, jumlah_pusat, jumlah_tak_terpetakan); pagu dibagi rata ke semua lokasi tersebut (asumsi)
  peta_kab(kode_json, situs) -> peta nama ke kode kab; DKI Jakarta (prov 31) = lokasi pusat (kantor pusat BNPB), bukan kab

  python3 -I scripts/bnpb/unit/sirup.py --cek
"""
import json
import os
import re
import sys

AKAR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
CACHE = os.path.join(AKAR, "docs", "pendanaan", "cache")
JALUR = ("penyedia", "swakelola")
PUSAT_PROV = "31"
POLA = re.compile(r"^(.*?),\s*(.*?)\s*\((Kota|Kab)\.?\)\s*$")


def _norm(x):
    x = re.sub(r"\bkep\b", "kepulauan", re.sub(r"[^a-z0-9 ]", " ", x.lower()))
    return re.sub(r"\s+", "", x)


def tahun_terbaru(cache=CACHE):
    ada = {j: {int(m.group(1)) for f in os.listdir(cache) if (m := re.fullmatch(rf"{j}-BNPB-(\d{{4}})\.json", f))} for j in JALUR}
    bersama = ada["penyedia"] & ada["swakelola"]
    if not bersama:
        raise FileNotFoundError("cache SIRUP BNPB penyedia dan swakelola tidak ada untuk tahun yang sama")
    return max(bersama)


def paket(tahun, jalur, cache=CACHE):
    if jalur not in JALUR:
        raise ValueError(f"jalur {jalur!r} bukan penyedia atau swakelola")
    with open(os.path.join(cache, f"{jalur}-BNPB-{tahun}.json"), encoding="utf-8") as f:
        d = json.load(f)
    if not isinstance(d, list) or any(not isinstance(x, dict) or x.get("tahun") != tahun for x in d):
        raise ValueError(f"{jalur}-BNPB-{tahun}.json bukan daftar paket tahun {tahun}")
    return d


def peta_kab(kode_json, situs):
    """{(prov, nama tanpa spasi): [(kode, jenis)]}, dan {nama provinsi tanpa spasi: kode prov}."""
    prov = {_norm(s["nama"]): s["kode"] for s in situs}
    kab = {}
    for kode, v in kode_json.items():
        nama = v["nama"]
        jenis = "Kota" if nama.startswith("Kota") else "Kab"
        kab.setdefault((v["prov"], _norm(re.sub(r"^(Kab\.|Kota)\s+(Administrasi\s+)?", "", nama))), []).append((kode, jenis))
    return {"prov": prov, "kab": kab}


def lokasi_kab(teks, peta):
    """Pecah 'Prov, Kab (Kota) | ...'. Pusat = DKI Jakarta; tak terpetakan = pola atau nama tak dikenal (bukan ditebak)."""
    kode, pusat, tak = [], 0, 0
    bagian = [b.strip() for b in (teks or "").split("|") if b.strip()]
    for b in bagian:
        m = POLA.match(b)
        p = peta["prov"].get(_norm(m.group(1))) if m else None
        if p == PUSAT_PROV:
            pusat += 1
            continue
        c = peta["kab"].get((p, _norm(m.group(2)))) if m and p else None
        if c and len(c) > 1:
            c = [x for x in c if x[1] == m.group(3)]
        if c and len(c) == 1:
            kode.append(c[0][0])
        else:
            tak += 1
    return kode, len(bagian), pusat, tak


def cek():
    peta = peta_kab({"3201": {"nama": "Kab. Bogor", "prov": "32"}, "3271": {"nama": "Kota Bogor", "prov": "32"}, "1711": {"nama": "Kab. Bukittinggi", "prov": "13"},
                     "1375": {"nama": "Kota Bukittinggi", "prov": "13"}, "7109": {"nama": "Kab. Kep. Siau Tagulandang Biaro", "prov": "71"},
                     "3175": {"nama": "Kota Administrasi Jakarta Timur", "prov": "31"}},
                    [{"kode": "32", "nama": "Jawa Barat"}, {"kode": "13", "nama": "Sumatera Barat"}, {"kode": "71", "nama": "Sulawesi Utara"}, {"kode": "31", "nama": "DKI Jakarta"}])
    assert lokasi_kab("Jawa Barat, Bogor (Kab.)", peta) == (["3201"], 1, 0, 0)
    assert lokasi_kab("Jawa Barat, Bogor (Kota)", peta) == (["3271"], 1, 0, 0), "nama sama di Kab dan Kota dibedakan menurut jenis"
    assert lokasi_kab("Sumatera Barat, Bukit Tinggi (Kota)", peta)[0] == ["1375"] and lokasi_kab("Sumatera Barat, Bukit Tinggi(Kab)", peta)[0] == ["1711"]
    assert lokasi_kab("Sulawesi Utara, Kepulauan Siau Tagulandang Biaro (Kab.)", peta)[0] == ["7109"]
    assert lokasi_kab("DKI Jakarta, Jakarta Timur (Kota) | Jawa Barat, Bogor (Kab.)", peta) == (["3201"], 2, 1, 0), "Jakarta = pusat, dihitung sebagai lokasi"
    assert lokasi_kab("LAINNYA, Lainnya | Jawa Barat, Tak Ada (Kab.)", peta) == ([], 2, 0, 2), "tak terpetakan dihitung, tidak ditebak"
    assert lokasi_kab("", peta) == ([], 0, 0, 0) and lokasi_kab(None, peta) == ([], 0, 0, 0)
    th = tahun_terbaru()
    for j in JALUR:
        assert all(x["tahun"] == th for x in paket(th, j))
    for salah in (lambda: paket(th, "tender"),):
        try:
            salah(); raise AssertionError("jalur salah tidak ditolak")
        except ValueError:
            pass
    print(f"sirup.py --cek: lulus (tahun terbaru {th}, {len(paket(th, 'penyedia'))} paket penyedia, {len(paket(th, 'swakelola'))} swakelola)")


if __name__ == "__main__":
    if "--cek" in sys.argv:
        cek()
    else:
        print(__doc__)
