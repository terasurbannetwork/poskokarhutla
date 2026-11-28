"""PSPB-1 Register status RPBD 552 pemda menurut JDIH (DESAIN-TEKNIS sec 6.2; ALGORITMA sec 4.5; tiket RU-073).

Langkah jalan.py (mingguan, mengikuti MB-3). Masukan = keluaran jdih_daerah.jalan() (MB-3; cache panen 30 hari, jadi
dipanggil sesudah langkah MB-3 tidak menarik ulang jaringan). Status per pemda = jdih_daerah.status_rpbd():
  sesuai_3_2026 | berlaku | habis | belum_mulai | tidak_ditemukan | tidak_bisa_dicek
Pemda = 38 provinsi (jdih_situs.json) + 514 kab/kota (scripts/udara/kota.json, Kemendagri) = 552 baris, satu per pemda.
Situs JDIH provinsi yang tidak terbaca (diblokir, tanpa pencarian) = tidak_bisa_dicek untuk provinsi itu dan kab/kotanya,
bukan tidak_ditemukan. tidak_ditemukan berlabel "tidak terbit di JDIH, bukan berarti tidak punya".
Koreksi staf lewat unit_ketuk berkas usulan_rpbd: usulan ditulis di sini; pembacaan keputusan (terima.py gabung) menunggu
RU-034, jadi semua usulan berstatus menunggu dan register memakai status mesin.

  python3 -I scripts/bnpb/unit/pspb1.py --cek
"""
import json
import os
import re
import sys
from datetime import date, datetime, timedelta, timezone

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))  # -I tidak menaruh folder skrip
import jdih_daerah as J  # noqa: E402
import rapor  # noqa: E402
from terima import usulan_id  # noqa: E402,F401  (MB-7, RU-034; dipakai juga ks1.py lewat pspb1.usulan_id)

AKAR = rapor.AKAR
BERLAKU = ("berlaku", "sesuai_3_2026")
LABEL_TIDAK = "tidak terbit di JDIH, bukan berarti tidak punya"
NAMA_ST = {"sesuai_3_2026": "berlaku, sesuai Perban 3/2026", "berlaku": "berlaku", "habis": "habis", "belum_mulai": "belum mulai",
           "tidak_ditemukan": LABEL_TIDAK, "tidak_bisa_dicek": "situs JDIH provinsi tidak bisa dicek"}


def pemda():
    """[(kode, nama, tingkat)] 38 provinsi + 514 kab/kota."""
    with open(J.SITUS, encoding="utf-8") as f:
        prov = [(s["kode"], s["nama"], "provinsi") for s in json.load(f)]
    with open(os.path.join(AKAR, "scripts", "udara", "kota.json"), encoding="utf-8") as f:
        d = json.load(f)
    i = {k: n for n, k in enumerate(d["kolom"])}
    return prov + [(r[i["kode"]], r[i["nama"]], "kab/kota") for r in d["baris"]]


def teks_periode(r):
    t = f"{r['periode'][0]}-{r['periode'][1]}" if r["periode"] else (f"sampai {r['berlaku_sampai']}" if r["berlaku_sampai"] else None)
    return t and t + (", diduga" if r["diduga"] else "")


def register(jdih, daftar, hari_ini):
    situs = {s["kode"]: s["status"] for s in jdih["situs"]}
    per = {}
    for d in jdih["dok"]:
        per.setdefault(d["kode"], []).append(d)
    out = []
    for kode, nama, tingkat in daftar:
        ok = situs.get(kode[:2]) == "terbaca"
        dok = per.get(kode, [])
        st = J.status_rpbd(dok, hari_ini, ok)
        r = [d for d in dok if d["jenis_dok"] == "rpbd" and (not d["perubahan"] or not d["periode_diduga"])]
        pilih = max(r, key=lambda d: (d["tgl_tetap"] or f"{d['tahun'] or 0}-00-00", d["url"])) if r else None
        out.append({"kode": kode, "nama": nama, "tingkat": tingkat, "status": st,
                    "periode": pilih and pilih["periode"], "diduga": bool(pilih and pilih["periode_diduga"]),
                    "berlaku_sampai": pilih and pilih["berlaku_sampai"], "judul": pilih and pilih["judul"], "url": pilih and pilih["url"]})
    return out


def bangun(jdih, daftar, hari_ini):
    reg = register(jdih, daftar, hari_ini)
    kode = [r["kode"] for r in reg]
    if len(kode) != len(set(kode)):
        raise ValueError("baris ganda per pemda")
    n = lambda st, t=None: sum(1 for r in reg if r["status"] in st and (t is None or r["tingkat"] == t))  # noqa: E731
    jml = {t: sum(r["tingkat"] == t for r in reg) for t in ("provinsi", "kab/kota")}
    ber = n(BERLAKU)
    dicek = len(reg) - n(("tidak_bisa_dicek",))
    duga = sum(1 for r in reg if r["status"] in BERLAKU and r["diduga"])
    ditemukan = [r for r in reg if r["url"]]
    k1 = rapor.kartu(
        id="pspb1-rpbd", sistem="PSPB-1", pil="Register RPBD", ikon="resmi", judul="Status RPBD menurut JDIH",
        angka=[{"k": "berlaku", "label": f"Pemda ber-RPBD berlaku menurut JDIH, {duga} di antaranya masa diduga", "nilai": ber,
                "title": "masa diduga = tanpa periode di judul, penetapan + 5 tahun (asumsi riset/1)"},
               {"k": "persen", "label": f"Persen dari {dicek:,} pemda yang bisa dicek (%)".replace(",", "."), "nilai": 100 * ber / dicek if dicek else None, "desimal": 1,
                "title": f"batas bawah, {len(reg) - dicek:,} pemda tak bisa dicek (situs JDIH provinsi tidak terbaca)".replace(",", ".")},
               {"k": "prov", "label": f"Provinsi berlaku, dari {jml['provinsi']}", "nilai": n(BERLAKU, "provinsi")},
               {"k": "kab", "label": f"Kab/kota berlaku, dari {jml['kab/kota']}", "nilai": n(BERLAKU, "kab/kota")},
               {"k": "tidak", "label": "Tidak ditemukan, bukan berarti tidak punya", "nilai": n(("tidak_ditemukan",)), "title": LABEL_TIDAK},
               {"k": "cek", "label": "Situs JDIH provinsi tidak bisa dicek", "nilai": n(("tidak_bisa_dicek",)),
                "title": "situs provinsi diblokir robots atau tanpa pencarian yang bisa dibaca mesin; provinsi dan kab/kotanya tidak dinilai"}],
        kolom=[{"k": "pemda", "label": "Pemda"}, {"k": "status", "label": "Status"},
               {"k": "periode", "label": "Periode", "title": "dari judul; tanpa periode: penetapan + 5 tahun, bertanda diduga (asumsi riset/1)"},
               {"k": "judul", "label": "Dokumen JDIH", "title": "judul di situs JDIH provinsi; buka dari unduhan CSV kolom URL"},
               {"k": "url", "label": "URL"}],
        baris=[{"pemda": r["nama"], "status": NAMA_ST[r["status"]],
                "periode": teks_periode(r),
                "judul": r["judul"], "url": r["url"]} for r in sorted(ditemukan, key=lambda r: r["kode"])],
        rumus=None, sumber=["jdih_daerah"], label=["sekunder"], asumsi=["Asumsi: masa RPBD tanpa periode 5 tahun"], unduh="register_rpbd.csv")
    NAMA_SITUS = {s[0]: s[1] for s in daftar if s[2] == "provinsi"}
    k2 = rapor.kartu(
        id="pspb1-situs", sistem="PSPB-1", pil="Register RPBD", ikon="data", judul="Cakupan situs JDIH provinsi",
        angka=[{"k": "terbaca", "label": "Situs terbaca", "nilai": sum(s["status"] == "terbaca" for s in jdih["situs"])},
               {"k": "situs", "label": "Situs provinsi", "nilai": len(jdih["situs"])}],
        kolom=[{"k": "prov", "label": "Provinsi"}, {"k": "status", "label": "Status situs"},
               {"k": "kab", "label": "Pemda yang ikut status ini", "angka": True, "title": "provinsi dan kab/kota di provinsi itu"}],
        baris=[{"prov": NAMA_SITUS.get(s["kode"], s["kode"]), "status": s["status"].replace("_", " "),
                "kab": sum(1 for r in reg if r["kode"][:2] == s["kode"])} for s in sorted(jdih["situs"], key=lambda s: s["kode"])],
        rumus=None, sumber=["jdih_daerah"], label=["sekunder"])
    src = [{"nama": "JDIH provinsi (jdih_daerah.py, MB-3)", "url": "repo:scripts/bnpb/unit/jdih_situs.json", "diambil": hari_ini,
            "lisensi": "metadata peraturan daerah, informasi publik"}]
    b = rapor.berkas([k1, k2], src)
    b["data"] = {"hari": hari_ini, "label_tidak_ditemukan": LABEL_TIDAK, "jumlah": len(reg), "jumlah_tingkat": jml, "pemda": reg,
                 "koreksi": "keputusan staf lewat antrean setuju (terima.py gabung dari unit_ketuk); register ini memakai status mesin sampai gabung dipasang di langkah"}
    us = {"berkas": "rpbd", "baris": [{"id": usulan_id("rpbd", r["url"], r["kode"]),
                                        "sumber": {"jenis": "jdih", "nama": r["judul"][:200], "url": r["url"]}, "label": "sekunder",
                                        "isi": {"kode": r["kode"], "status": r["status"], "periode": r["periode"], "url": r["url"]},
                                        "keyakinan": "pola_longgar", "keputusan": "menunggu"} for r in ditemukan]}
    return b, us


_JDIH = {}


def jdih(jaringan=True):
    """Keluaran MB-3 sekali per proses (PSPB-1 dan KS-1 berbagi). jaringan=False: hanya cache panen; situs tanpa cache
    jadi tidak_bisa_dicek (dipakai --cek supaya bukti tidak bergantung jaringan)."""
    if jaringan not in _JDIH:
        if jaringan:
            _JDIH[jaringan] = J.jalan()["jdih_daerah"]
        else:
            P, asli = J.panen, (J.panen._buka, J.panen.JEDA_ULANG)

            def tolak(*a, **k):
                raise P.GagalAmbil("tanpa jaringan (--cek): hanya cache")
            P._buka, P.JEDA_ULANG = tolak, ()
            try:
                _JDIH[jaringan] = J.jalan()["jdih_daerah"]
            finally:
                P._buka, P.JEDA_ULANG = asli
    return _JDIH[jaringan]


def _hari_wib():
    return (datetime.now(timezone.utc) + timedelta(hours=7)).date().isoformat()


def jalan(jaringan=True):
    b, us = bangun(jdih(jaringan), pemda(), _hari_wib())
    return {"rpbd": b, "usulan_rpbd": us}


def cek():
    daftar = [("21", "Kepulauan Riau", "provinsi"), ("2101", "Kab. Karimun", "kab/kota"), ("31", "DKI Jakarta", "provinsi"),
              ("3171", "Kota Administrasi Jakarta Pusat", "kab/kota"), ("33", "Jawa Tengah", "provinsi"), ("3301", "Kab. Cilacap", "kab/kota")]
    dok = lambda kode, periode=None, tgl=None, tahun=2024, diduga=False, sampai=None: {  # noqa: E731
        "kode": kode, "jenis_dok": "rpbd", "judul": f"Peraturan {kode} tentang Rencana Penanggulangan Bencana", "nomor": "1", "tahun": tahun,
        "tgl_tetap": tgl, "periode": periode, "periode_diduga": diduga, "berlaku_sampai": sampai, "perubahan": False, "url": f"https://jdih.contoh/{kode}"}
    jdih = {"situs": [{"kode": "21", "status": "terbaca"}, {"kode": "31", "status": "terbaca"}, {"kode": "33", "status": "diblokir"}],
            "dok": [dok("21", [2023, 2027]), dok("2101", [2018, 2022]), dok("31", None, "2026-10-20", 2026, True, "2031-10-20"),
                    dok("3301", [2024, 2028])]}
    b, us = bangun(jdih, daftar, "2026-11-26")
    st = {r["kode"]: r["status"] for r in b["data"]["pemda"]}
    assert st == {"21": "berlaku", "2101": "habis", "31": "sesuai_3_2026", "3171": "tidak_ditemukan",
                  "33": "tidak_bisa_dicek", "3301": "tidak_bisa_dicek"}, st   # sesuai_3_2026 sesudah 6 Okt 2026; situs diblokir bukan tidak_ditemukan
    a = {x["k"]: x["nilai"] for x in b["kartu"][0]["angka"]}
    assert a["berlaku"] == 2 and a["tidak"] == 1 and a["cek"] == 2 and abs(a["persen"] - 100 * 2 / 4) < 1e-9, a   # penyebut = 4 pemda yang bisa dicek
    assert "1 di antaranya masa diduga" in b["kartu"][0]["angka"][0]["label"], b["kartu"][0]["angka"][0]   # DKI 2026 tanpa periode
    assert any(r["status"] == LABEL_TIDAK for r in b["kartu"][0]["baris"]) is False   # tabel hanya dokumen yang ditemukan
    assert LABEL_TIDAK in json.dumps(b["kartu"][0], ensure_ascii=False)
    assert len(us["baris"]) == 4 and all(len(x["id"]) == 16 and x["keputusan"] == "menunggu" for x in us["baris"])
    assert J.status_rpbd([dok("1", None, "2026-10-05", 2026, True, "2031-10-05")], "2026-11-26") == "berlaku"   # sehari sebelum 6 Okt
    try:
        bangun(jdih, daftar + [("21", "Kepulauan Riau", "provinsi")], "2026-11-26")
        raise AssertionError("baris ganda tidak ditolak")
    except ValueError:
        pass
    rapor.periksa_berkas({"dibuat": "2026-11-26T00:00:00Z", "basi_jam": 240, **b})
    pd = pemda()
    assert len(pd) == 552 and sum(t == "provinsi" for _, _, t in pd) == 38 and len({k for k, _, _ in pd}) == 552, len(pd)
    nyata = jalan(jaringan=False)
    rapor.periksa_berkas({"dibuat": "2026-11-26T00:00:00Z", "basi_jam": 240, **nyata["rpbd"]})
    d = nyata["rpbd"]["data"]
    assert d["jumlah"] == 552 and len({r["kode"] for r in d["pemda"]}) == 552
    s = json.dumps(nyata, ensure_ascii=False)
    assert "·" not in s and not re.search(r"\baman\b", s, re.I)
    a = {x["k"]: x["nilai"] for x in nyata["rpbd"]["kartu"][0]["angka"]}
    print(f"pspb1.py --cek: lulus (552 pemda: {a['berlaku']} berlaku menurut JDIH, {a['tidak']} tidak ditemukan, {a['cek']} situs tidak bisa dicek; "
          f"{len(nyata['usulan_rpbd']['baris'])} usulan)")


if __name__ == "__main__":
    if "--cek" in sys.argv:
        cek()
    else:
        print(__doc__)
