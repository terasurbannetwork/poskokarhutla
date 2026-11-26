"""REN-2 Peta belanja lawan peta risiko dari SIRUP (DESAIN-TEKNIS sec 6.25; ALGORITMA sec 10.36; tiket RU-070).

Langkah jalan.py (bulanan; keluaran unit/belanja_risiko.json). Masukan: RUP BNPB penyedia dan swakelola tahun terbaru (sirup.py), terpapar.json, ikd.json.
  pangsa_belanja_k   = pagu_k / jumlah pagu berlokasi kab          (paket berlokasi pusat atau Jakarta dikeluarkan, dilaporkan terpisah)
  kebutuhan_k        = risiko_k x (1 - c_k)                         risiko = jiwa terpapar kelas tinggi, maksimum atas bahaya (mt2.komponen); c = ikd
  pangsa_kebutuhan_k = kebutuhan_k / jumlah kebutuhan
  rasio_k            = pangsa_belanja_k / pangsa_kebutuhan_k
  dua kelas (pemeriksa validasi-model 26 Nov): rasio rendah = kab 20% teratas kebutuhan, pagu > 0, rasio < 0,5 (asumsi, riset/6 P2);
  kebutuhan tinggi tanpa paket RUP BNPB = 20% teratas kebutuhan dan pagu 0 (bukan "kurang dilayani": DSP dan belanja BPBD tidak masuk RUP).
  Kab DKI tidak dibandingkan (berbeda dari ALGORITMA 10.36, menunggu keputusan induk).
Paket berlokasi lebih dari satu: pagu dibagi rata ke semua lokasi yang disebut (asumsi). Lokasi yang namanya tak terpetakan dihitung terpisah, bukan ditebak.
Tanpa pagu kab lain pun kab tetap ada: pagu 0 di RUP BNPB memang 0 rupiah rencana, tetapi kab tanpa risiko atau kapasitas tak masuk hitungan (bukan nol).
RUP adalah rencana, bukan realisasi. Dana Siap Pakai tidak masuk RUP. Tanpa nama paket atau penyedia di keluaran. Bukan uji balik: deskriptif, tanpa klaim prediksi.

  python3 -I scripts/bnpb/unit/ren2.py --cek
"""
import json
import math
import os
import re
import sys
from datetime import datetime, timedelta, timezone

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))  # -I tidak menaruh folder skrip
import mt2  # noqa: E402
import rapor  # noqa: E402
import sirup  # noqa: E402

AKAR = mt2.AKAR
SITUS = os.path.join(os.path.dirname(os.path.abspath(__file__)), "jdih_situs.json")
RASIO_MAKS = 0.5      # asumsi
POROS_ATAS = 0.2      # 20% teratas kebutuhan, asumsi
ASUMSI = ["Asumsi: rasio di bawah 0,5 dan 20% teratas", "Asumsi: pagu dibagi rata antar lokasi"]
MAKS_BARIS = 40


def pagu_kab(paket_daftar, peta):
    """-> {kab: pagu}, ringkasan {pagu_total, pagu_kab, pagu_pusat, pagu_tak_terpetakan, paket, paket_tanpa_lokasi}. Pagu dibagi rata per lokasi."""
    kab, r = {}, {"pagu_total": 0.0, "pagu_kab": 0.0, "pagu_pusat": 0.0, "pagu_tak_terpetakan": 0.0, "paket": 0, "paket_tanpa_lokasi": 0}
    for x in paket_daftar:
        pagu = x.get("pagu")
        if not isinstance(pagu, (int, float)) or isinstance(pagu, bool) or pagu < 0:
            continue   # pagu kosong dilewati, bukan 0; dihitung di paket
        r["paket"] += 1
        r["pagu_total"] += pagu
        kode, n, pusat, tak = sirup.lokasi_kab(x.get("lokasi"), peta)
        if n == 0:
            r["paket_tanpa_lokasi"] += 1
            r["pagu_tak_terpetakan"] += pagu
            continue
        bagi = pagu / n
        for k in kode:
            kab[k] = kab.get(k, 0.0) + bagi
        r["pagu_kab"] += bagi * len(kode)
        r["pagu_pusat"] += bagi * pusat
        r["pagu_tak_terpetakan"] += bagi * tak
    return kab, r


def rasio(pagu, kebutuhan):
    """-> {kab: {pangsa_belanja, pangsa_kebutuhan, rasio, kebutuhan_atas, kurang}} atas kab yang kebutuhannya terhitung (> 0)."""
    ada = {k: v for k, v in kebutuhan.items() if v is not None and v > 0}
    sk, sp = sum(ada.values()), sum(pagu.get(k, 0.0) for k in ada)
    if not ada or sk <= 0:
        return {}
    urut = sorted(ada, key=lambda k: (-ada[k], k))
    atas = set(urut[:max(1, math.ceil(POROS_ATAS * len(ada)))])
    out = {}
    for k, v in ada.items():
        pb = pagu.get(k, 0.0) / sp if sp > 0 else None
        pk = v / sk
        rs = None if pb is None else pb / pk
        paket0 = pagu.get(k, 0.0) == 0 and sp > 0
        out[k] = {"pangsa_belanja": pb, "pangsa_kebutuhan": pk, "rasio": rs, "kebutuhan_atas": k in atas,
                  "tanpa_paket": bool(k in atas and paket0),   # kebutuhan tinggi, tanpa paket RUP BNPB (bukan penilaian kinerja)
                  "kurang": bool(rs is not None and k in atas and not paket0 and rs < RASIO_MAKS)}   # rasio rendah, pagu > 0
    return out


def kebutuhan(terpapar, ikd, dibi, tahun_akhir):
    nilai, _ = mt2.komponen(terpapar, ikd, dibi, tahun_akhir)
    return {k: (None if nilai["risiko"].get(k) is None or nilai["celah_kapasitas"].get(k) is None else nilai["risiko"][k] * nilai["celah_kapasitas"][k])
            for k in set(nilai["risiko"]) | set(nilai["celah_kapasitas"])}


def bangun(paket_daftar, tahun, docs, peta, nama, tahun_akhir, hari):
    pagu, ring = pagu_kab(paket_daftar, peta)
    keb = kebutuhan(docs["terpapar"]["kab"], docs["ikd"]["kab"], docs["dibi_kab_tahun"]["baris"], tahun_akhir)
    dki = sorted(k for k in keb if k[:2] == sirup.PUSAT_PROV)
    hasil = rasio(pagu, {k: v for k, v in keb.items() if k[:2] != sirup.PUSAT_PROV})   # lokasi Jakarta = pusat: kab DKI keluar dari kedua pangsa, bukan 0 belanja
    kurang = sorted((k for k, v in hasil.items() if v["kurang"]), key=lambda k: (hasil[k]["rasio"], k))
    tanpa = sorted((k for k, v in hasil.items() if v["tanpa_paket"]), key=lambda k: (-hasil[k]["pangsa_kebutuhan"], k))
    pct = lambda x: None if x is None else x * 100
    por = lambda x: None if not ring["pagu_total"] else 100 * x / ring["pagu_total"]
    KELAS = {"kurang": "rasio rendah", "tanpa": "kebutuhan tinggi, tanpa paket RUP BNPB"}
    baris = [{"kab": nama.get(k, k), "kelas": KELAS[j], "belanja": pct(hasil[k]["pangsa_belanja"]), "kebutuhan": pct(hasil[k]["pangsa_kebutuhan"]), "rasio": hasil[k]["rasio"]}
             for j, daf in (("kurang", kurang), ("tanpa", tanpa)) for k in daf[:MAKS_BARIS]]
    catatan = (f"RUP BNPB bukan seluruh belanja: belanja daerah lewat Dana Siap Pakai dan BPBD tidak masuk RUP, dan {por(ring['pagu_pusat']) or 0:.0f} persen pagu berlokasi pusat "
               "tidak ikut penyebut")
    kartu = rapor.kartu(
        id="ren2-belanja", sistem="REN-2", pil="Belanja lawan risiko", ikon="uang", judul="Rencana belanja BNPB lawan kebutuhan per kab/kota",
        angka=[{"k": "tahun", "label": "Tahun rencana umum pengadaan (RUP)", "nilai": tahun, "desimal": 0, "title": "RUP adalah rencana, bukan realisasi; Dana Siap Pakai tidak masuk RUP"},
               {"k": "paket", "label": "Paket penyedia dan swakelola BNPB", "nilai": ring["paket"], "desimal": 0},
               {"k": "pusat", "label": "Porsi pagu berlokasi pusat atau Jakarta, persen", "nilai": por(ring["pagu_pusat"]), "desimal": 1,
                "title": "dikeluarkan dari pangsa kab dan dilaporkan terpisah (kantor pusat BNPB di Jakarta)"},
               {"k": "tak", "label": "Porsi pagu tanpa lokasi terpetakan, persen", "nilai": por(ring["pagu_tak_terpetakan"]), "desimal": 1,
                "title": "lokasi tak tertulis atau namanya tak cocok dengan daftar kab/kota; tidak ditebak"},
               {"k": "kab", "label": "Kab/kota yang kebutuhannya terhitung", "nilai": len(hasil), "desimal": 0,
                "title": f"DKI Jakarta tidak dibandingkan: {len(dki)} kab/kota DKI tidak ikut karena paket berlokasi Jakarta dianggap pusat"},
               {"k": "kurang", "label": "Kebutuhan tinggi, rasio belanja rendah (hipotesis)", "nilai": len(kurang), "desimal": 0,
                "title": "20% teratas kebutuhan, pagu RUP lebih dari 0 dan rasio pangsa belanja lawan pangsa kebutuhan di bawah 0,5 (asumsi); deskriptif, bukan penilaian kinerja. " + catatan},
               {"k": "tanpa", "label": "Kebutuhan tinggi, tanpa paket RUP BNPB", "nilai": len(tanpa), "desimal": 0,
                "title": "20% teratas kebutuhan dan tidak ada paket RUP BNPB berlokasi di sana; bukan berarti tidak dilayani. " + catatan}],
        kolom=[{"k": "kab", "label": "Kab/kota"}, {"k": "kelas", "label": "Kelas", "title": catatan}, {"k": "belanja", "label": "Pangsa belanja, persen", "angka": True, "desimal": 2},
               {"k": "kebutuhan", "label": "Pangsa kebutuhan, persen", "angka": True, "desimal": 2, "title": "jiwa terpapar kelas tinggi kali celah kapasitas (proksi), dibagi jumlahnya"},
               {"k": "rasio", "label": "Rasio", "angka": True, "desimal": 2, "title": "pangsa belanja dibagi pangsa kebutuhan; 1 berarti sebanding"}] if baris else [],
        baris=baris,
        rumus="rasio = (pagu kab / pagu berlokasi kab) / (kebutuhan kab / jumlah kebutuhan); kebutuhan = jiwa terpapar kelas tinggi x (1 - kapasitas)",
        sumber=["sirup_bnpb", "terpapar", "ikd", "dibi_kab_tahun"], label=["resmi", "hitungan_kita", "proksi"], asumsi=ASUMSI)
    sumber = [{"nama": f"RUP SiRUP BNPB {tahun}, penyedia dan swakelola", "url": "repo:docs/pendanaan/cache", "diambil": hari, "lisensi": "informasi publik SiRUP LKPP"}] + \
        [{"nama": f"{n}.json", "url": f"repo:public/data/bnpb/{n}.json", "diambil": docs[n]["dibuat"][:10], "lisensi": docs[n].get("lisensi", "tidak tertulis")[:200]} for n in ("terpapar", "ikd")]
    b = rapor.berkas([kartu], sumber)
    b["data"] = {"tahun": tahun, "rup_rencana_bukan_realisasi": True, "dsp_tidak_di_rup": True, "ringkasan": ring, "dki_dikeluarkan": dki,
                 "ambang": {"rasio_maks": RASIO_MAKS, "kebutuhan_atas": POROS_ATAS, "asumsi": True},
                 "kab": {k: {j: (None if x is None else round(x, 8)) for j, x in v.items() if j in ("pangsa_belanja", "pangsa_kebutuhan", "rasio")} | {"kurang": v["kurang"], "tanpa_paket": v["tanpa_paket"]} for k, v in sorted(hasil.items())}}
    return b


def jalan():
    docs = mt2._docs()
    th = sirup.tahun_terbaru()
    daftar = sirup.paket(th, "penyedia") + sirup.paket(th, "swakelola")
    hari = (datetime.now(timezone.utc) + timedelta(hours=7)).date().isoformat()
    kode = mt2._muat(os.path.join(AKAR, "public", "data", "kemitraan", "kode.json"))
    peta = sirup.peta_kab(kode, mt2._muat(SITUS))
    return {"belanja_risiko": bangun(daftar, th, docs, peta, mt2._nama(), mt2.tahun_akhir_data(docs["dibi_kab_tahun"]["baris"]), hari)}


def cek():
    peta = sirup.peta_kab({"3201": {"nama": "Kab. Bogor", "prov": "32"}, "3271": {"nama": "Kota Bogor", "prov": "32"}, "1375": {"nama": "Kota Bukittinggi", "prov": "13"}},
                          [{"kode": "32", "nama": "Jawa Barat"}, {"kode": "13", "nama": "Sumatera Barat"}, {"kode": "31", "nama": "DKI Jakarta"}])
    P = lambda pagu, lok: {"pagu": pagu, "lokasi": lok}
    kab, r = pagu_kab([P(300, "Jawa Barat, Bogor (Kab.)"), P(200, "DKI Jakarta, Jakarta Timur (Kota)"), P(100, "Jawa Barat, Bogor (Kab.) | Sumatera Barat, Bukit Tinggi (Kota)"),
                       P(60, "DKI Jakarta, Jakarta Timur (Kota) | Jawa Barat, Bogor (Kota) | LAINNYA, Lainnya"), P(None, "Jawa Barat, Bogor (Kab.)"), P(40, None)], peta)
    assert kab == {"3201": 350.0, "1375": 50.0, "3271": 20.0}, kab
    assert r["pagu_pusat"] == 220.0 and r["pagu_tak_terpetakan"] == 60.0 and r["pagu_kab"] == 420.0 and r["paket_tanpa_lokasi"] == 1 and r["paket"] == 5
    assert abs(r["pagu_kab"] + r["pagu_pusat"] + r["pagu_tak_terpetakan"] - r["pagu_total"]) < 1e-9, "tiap rupiah terhitung tepat satu kali"
    assert "paket pusat tidak dihitung ke DKI" and "3175" not in kab and all(k[:2] != "31" for k in kab)
    # rumus: 4 kab, kebutuhan 40/30/20/10; pagu menurut pangsa kebutuhan kecuali a (20% teratas = 1 kab)
    keb = {"a": 40.0, "b": 30.0, "c": 20.0, "d": 10.0, "e": None, "f": 0}
    h = rasio({"a": 10.0, "b": 30.0, "c": 20.0, "d": 40.0}, keb)
    assert set(h) == {"a", "b", "c", "d"}, "kebutuhan kosong atau 0 tidak ikut hitungan, bukan dihitung nol"
    assert abs(h["a"]["pangsa_kebutuhan"] - 0.4) < 1e-12 and abs(h["a"]["pangsa_belanja"] - 0.1) < 1e-12 and abs(h["a"]["rasio"] - 0.25) < 1e-12
    assert h["a"]["kurang"] is True and h["a"]["tanpa_paket"] is False and h["a"]["kebutuhan_atas"] and not h["b"]["kurang"] and abs(h["b"]["rasio"] - 1.0) < 1e-12 and h["d"]["rasio"] == 4.0
    assert sum(v["pangsa_belanja"] for v in h.values()) - 1 < 1e-12 and sum(v["pangsa_kebutuhan"] for v in h.values()) - 1 < 1e-12
    # di luar 20% teratas rasio kecil tidak ditandai; rasio tepat 0,5 tidak ditandai; kab tanpa pagu: rasio 0 (rencana nol) dan ditandai bila di atas
    assert rasio({"a": 20.0, "b": 30.0, "c": 20.0, "d": 30.0}, keb)["a"]["rasio"] == 0.5 and rasio({"a": 20.0, "b": 30.0, "c": 20.0, "d": 30.0}, keb)["a"]["kurang"] is False
    r0 = rasio({"b": 100.0}, keb)
    assert r0["a"]["rasio"] == 0 and r0["a"]["kurang"] is False and r0["a"]["tanpa_paket"] is True, "tanpa paket RUP kelas sendiri, bukan rasio rendah"
    assert r0["d"]["tanpa_paket"] is False and r0["d"]["kurang"] is False and r0["b"]["tanpa_paket"] is False
    assert rasio({}, keb)["a"]["rasio"] is None, "tanpa satu pun paket berlokasi kab: rasio tidak ada, bukan 0"
    assert rasio({}, {}) == {} and rasio({"a": 1}, {"a": None}) == {}
    # data nyata
    docs = mt2._docs()
    hasil = jalan()["belanja_risiko"]
    rapor.periksa_berkas({"dibuat": "2026-11-26T00:00:00Z", "basi_jam": 1080, **hasil})
    d, k = hasil["data"], hasil["kartu"][0]
    ring = d["ringkasan"]
    assert d["rup_rencana_bukan_realisasi"] and d["dsp_tidak_di_rup"] and ring["paket"] > 1000 and ring["pagu_pusat"] > 0
    assert abs(ring["pagu_kab"] + ring["pagu_pusat"] + ring["pagu_tak_terpetakan"] - ring["pagu_total"]) < 1, "pagu hilang atau terhitung dua kali"
    assert ring["pagu_pusat"] / ring["pagu_total"] > 0.3, "paket pusat memang dominan di RUP BNPB dan dilaporkan terpisah"
    assert all(re.fullmatch(r"\d{4}", c) and c[:2] != "31" for c in d["kab"]) and d["dki_dikeluarkan"], "kab DKI tidak dibandingkan dengan belanja pusat"
    assert abs(sum(v["pangsa_belanja"] for v in d["kab"].values()) - 1) < 1e-6 and abs(sum(v["pangsa_kebutuhan"] for v in d["kab"].values()) - 1) < 1e-6
    ang = {a["k"]: a["nilai"] for a in k["angka"]}
    assert ang["kurang"] == sum(v["kurang"] for v in d["kab"].values()) and ang["tanpa"] == sum(v["tanpa_paket"] for v in d["kab"].values())
    assert not any(v["kurang"] and v["tanpa_paket"] for v in d["kab"].values()) and "Dana Siap Pakai" in json.dumps(k["angka"], ensure_ascii=False) and ang["kab"] == len(d["kab"])
    assert k["asumsi"] == ASUMSI and "RUP adalah rencana" in json.dumps(k["angka"], ensure_ascii=False)
    s = json.dumps(hasil, ensure_ascii=False)
    assert "·" not in s and not re.search(r"\baman\b|\bpaket\b.{0,3}nama|penyedia:", s, re.I)
    assert not any(x.get("paket") and isinstance(x["paket"], str) for x in [d]), "nama paket tidak dibawa"
    print(f"ren2.py --cek: lulus (RUP {d['tahun']}: {ring['paket']} paket, pusat {ang['pusat']:.1f}%, tak terpetakan {ang['tak']:.1f}%, {ang['kab']} kab terhitung, {ang['kurang']} rasio rendah, {ang['tanpa']} tanpa paket RUP, hipotesis)")


if __name__ == "__main__":
    if "--cek" in sys.argv:
        cek()
    else:
        print(__doc__)
