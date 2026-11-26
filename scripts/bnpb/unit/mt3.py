"""MT-3 Kalender kampanye dan sasaran edukasi per kab/kota (DESAIN-TEKNIS sec 6.12; ALGORITMA sec 10.16; tiket RU-095).

Langkah jalan.py (bulanan). Kab k masuk paket bulan m bila awal musim bahaya b (siaga.json kab[k].musim[b].mulai, sama dengan KS-4) jatuh 1 atau 2 bulan sesudah m
(bulan melingkar). Isi paket per (kab, bahaya):
  pesan          tindakan tingkat kesiapsiagaan (Waspada) bahaya itu dari public/ews_tindakan.js, dibaca lewat node (butir ber-rujukan di berkas itu, tidak disalin)
  porsi_rentan   jiwa_tinggi rentan / jiwa_tinggi (terpapar.json h[bahaya][3] / h[bahaya][2]; rentan GABUNGAN balita 0-4 dan lansia >= 60, belum terpisah); penyebut 0 = None
  saluran        "tatap muka" bila porsi_rentan > median nasional porsi bahaya itu (Asumsi: ambang = median nasional, belum disetel direktorat); selain itu "media dan daring";
                 porsi None = tidak ada usulan saluran (bukan "media")
  desa sasaran   10 desa dengan penduduk terpapar tinggi terbesar: BELUM ADA DATA sampai data/raw/unit/desa_terpapar.json ada (format di pd2.py); ditulis "belum ada data"
Pemisahan porsi lansia dan balita menunggu keputusan pemilik (DT sec 10 butir 8; terpapar.py belum memisahkannya). Tanpa nama orang: hanya kab, desa, dan jumlah.
Label wajib: "usulan analis, bukan rekomendasi resmi".

  python3 -I scripts/bnpb/unit/mt3.py --cek
"""
import json
import os
import re
import statistics
import subprocess
import sys
from datetime import datetime, timedelta, timezone

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))  # -I tidak menaruh folder skrip
import pd2  # noqa: E402
import rapor  # noqa: E402

AKAR, DATA = pd2.AKAR, pd2.DATA
BLN = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"]
LABEL_WAJIB = "usulan analis, bukan rekomendasi resmi"
NAMA_SUMBER = {"siaga": "Siaga pra-musim logbook Pusdalops", "terpapar": "Keterpaparan penduduk", "ews_tindakan": "Tindakan kesiapsiagaan peringatan dini"}
NAMA_BAHAYA = {"banjir": "Banjir", "longsor": "Tanah longsor", "karhutla": "Kebakaran hutan dan lahan", "cuaca": "Cuaca ekstrem", "kekeringan": "Kekeringan", "gempa": "Gempa bumi"}   # kunci data tetap; nama untuk layar
ASUMSI = ["Asumsi: ambang porsi rentan = median nasional", "Asumsi: rentan gabungan balita dan lansia"]
TERLARANG = {"nama", "nik", "telepon", "hp", "email", "pic", "wa"}   # kolom data orang; nama_kab dan nama_desa boleh
SALURAN_TATAP, SALURAN_DARING = "tatap muka", "media dan daring"
KOLOM_JIWA_TINGGI, KOLOM_RENTAN_TINGGI = 2, 3   # terpapar.json kolom_h


def bulan_paket(mulai):
    """Awal musim 1-12 -> [2 bulan sebelum, 1 bulan sebelum] melingkar; None bila tidak sah."""
    if isinstance(mulai, bool) or not isinstance(mulai, int) or not 1 <= mulai <= 12:
        return None
    return [(mulai - 3) % 12 + 1, (mulai - 2) % 12 + 1]


def porsi(h):
    """rentan tinggi / jiwa tinggi; None bila kosong atau penyebut 0."""
    try:
        jiwa, rentan = h[KOLOM_JIWA_TINGGI], h[KOLOM_RENTAN_TINGGI]
    except (TypeError, IndexError, KeyError):
        return None
    if not all(isinstance(x, (int, float)) and not isinstance(x, bool) for x in (jiwa, rentan)) or jiwa <= 0:
        return None
    return rentan / jiwa


def tindakan_node():
    """{bahaya: [tindakan tingkat 1]} dari public/ews_tindakan.js lewat node; gagal = galat (langkah gagal, bukan pesan kosong)."""
    js = ("import(process.argv[1]).then(m=>console.log(JSON.stringify(Object.fromEntries(Object.keys(m.BENCANA).map(k=>[k,m.tindakanUntuk(k,1)])))))")
    r = subprocess.run(["node", "-e", js, os.path.join(AKAR, "public", "ews_tindakan.js")], capture_output=True, text=True, timeout=60, check=True)
    return json.loads(r.stdout)


def bangun(siaga, terpapar, tindakan, desa_doc, hari):
    kab_s, kab_t = siaga["kab"], terpapar["kab"]
    mentah = []
    for k in sorted(kab_s):
        for b, m in sorted(((kab_s[k].get("musim")) or {}).items()):
            g = bulan_paket(m.get("mulai"))
            if g is None:
                raise ValueError(f"{k} {b}: bulan mulai {m.get('mulai')!r} tidak sah")
            mentah.append({"kab": k, "nama_kab": kab_s[k].get("nama") or k, "bahaya": b, "mulai": m["mulai"], "bulan": g,
                           "porsi": porsi(((kab_t.get(k) or {}).get("h") or {}).get(b))})
    med = {}
    for b in {x["bahaya"] for x in mentah}:
        v = [x["porsi"] for x in mentah if x["bahaya"] == b and x["porsi"] is not None]
        med[b] = statistics.median(v) if v else None
    desa_top, ambang = {}, terpapar["ambang"]["tinggi"]
    if desa_doc:
        for x in desa_doc["desa"]:
            for b, v in x["indeks"].items():
                if isinstance(v, (int, float)) and v > ambang and isinstance(x.get("penduduk"), (int, float)):
                    desa_top.setdefault((x["kab"], b), []).append({"desa": x.get("kode"), "nama_desa": x.get("nama"), "penduduk": x["penduduk"]})
        for k in desa_top:
            desa_top[k] = sorted(desa_top[k], key=lambda d: (-d["penduduk"], str(d["desa"])))[:10]
    paket = []
    for x in mentah:
        ps, md = x["porsi"], med[x["bahaya"]]
        saluran = None if ps is None or md is None else (SALURAN_TATAP if ps > md else SALURAN_DARING)
        pesan = tindakan.get(x["bahaya"]) or []
        paket.append({**{k: x[k] for k in ("kab", "nama_kab", "bahaya", "mulai", "bulan")}, "porsi_rentan": ps, "median_bahaya": md, "saluran": saluran,
                      "pesan": pesan, "pesan_ada": bool(pesan), "desa": desa_top.get((x["kab"], x["bahaya"])) if desa_doc else None})
    tanpa_musim = sum(1 for k in kab_s if not (kab_s[k].get("musim") or {}))
    ini = hari.month
    maju = lambda p: min((m - ini) % 12 for m in p["bulan"])   # noqa: E731
    paket.sort(key=lambda p: (maju(p), p["kab"], p["bahaya"]))
    bulan_ini = [p for p in paket if ini in p["bulan"]]
    sumber = [NAMA_SUMBER[k] for k in ("siaga", "terpapar", "ews_tindakan")]
    k1 = rapor.kartu(
        id="mt3-paket", sistem="MT-3", pil="Kampanye musiman", ikon="kalender", judul="Paket kampanye bulan ini",
        angka=[{"k": "ini", "label": f"Paket kampanye bulan {BLN[ini - 1]}", "nilai": len(bulan_ini)},
               {"k": "kab", "label": "Kab/kota dengan paket bulan ini", "nilai": len({p["kab"] for p in bulan_ini})},
               {"k": "tatap", "label": "Paket bulan ini dengan saluran tatap muka", "nilai": sum(p["saluran"] == SALURAN_TATAP for p in bulan_ini),
                "title": "porsi rentan di atas median nasional bahaya itu (asumsi)"},
               {"k": "tanpa_musim", "label": "Kab/kota tanpa data musim", "nilai": tanpa_musim, "title": "kab/kota tanpa musim bahaya di siaga.json: tidak punya paket (bukan kab/kota tanpa risiko); N = " + str(tanpa_musim)},
               {"k": "tanpa_porsi", "label": "Paket bulan ini tanpa data porsi rentan", "nilai": sum(p["porsi_rentan"] is None for p in bulan_ini), "title": "tidak ada usulan saluran; bukan 0 persen"}],
        kolom=[{"k": "kab", "label": "Kab/kota"}, {"k": "bahaya", "label": "Bahaya"}, {"k": "mulai", "label": "Awal musim"}, {"k": "paket", "label": "Bulan kampanye", "title": "2 dan 1 bulan sebelum awal musim"},
               {"k": "porsi", "label": "Porsi rentan, persen", "angka": True, "desimal": 1, "title": "rentan tinggi / jiwa tinggi; rentan = balita 0-4 dan lansia 60 tahun ke atas digabung; kosong = belum ada data"},
               {"k": "saluran", "label": "Saluran usulan", "title": "tatap muka bila porsi rentan di atas median nasional bahaya itu (asumsi); " + LABEL_WAJIB},
               {"k": "pesan", "label": "Pesan tindakan", "title": "butir pertama tindakan kesiapsiagaan; daftar lengkap ada di berkas data dan di ews_tindakan.js"},
               {"k": "desa", "label": "Desa sasaran", "title": "10 desa dengan penduduk terpapar tinggi terbesar; kosong = belum ada data per desa"}],
        baris=[{"kab": p["nama_kab"], "bahaya": NAMA_BAHAYA.get(p["bahaya"], p["bahaya"].replace("_", " ").capitalize()), "mulai": BLN[p["mulai"] - 1], "paket": " dan ".join(BLN[m - 1] for m in p["bulan"]),
                "porsi": None if p["porsi_rentan"] is None else p["porsi_rentan"] * 100, "saluran": p["saluran"],
                "pesan": p["pesan"][0] if p["pesan"] else None,
                "desa": None if not p["desa"] else ", ".join(f"{d['nama_desa'] or d['desa']}" for d in p["desa"][:3]) + (f" dan {len(p['desa']) - 3} lainnya" if len(p["desa"]) > 3 else "")} for p in bulan_ini[:300]],
        rumus="paket bulan m bila awal musim jatuh pada m + 1 atau m + 2; porsi rentan = rentan tinggi / jiwa tinggi; saluran tatap muka bila porsi di atas median nasional bahaya itu",
        sumber=sumber, label=["proksi", "hitungan_kita"], asumsi=ASUMSI, unduh="kampanye_bulan_ini.csv")
    kal = []
    for m in range(1, 13):
        pm = [p for p in paket if m in p["bulan"]]
        jenis = sorted({p["bahaya"] for p in pm})
        kal.append({"bulan": BLN[m - 1], "paket": len(pm), "bahaya": ", ".join(f"{NAMA_BAHAYA.get(j, j)} {sum(p['bahaya'] == j for p in pm)} kab" for j in jenis) or None})
    k2 = rapor.kartu(id="mt3-kalender", sistem="MT-3", pil="Kampanye musiman", ikon="kalender", judul="Kalender kampanye 12 bulan", angka=[],
                     kolom=[{"k": "bulan", "label": "Bulan"}, {"k": "paket", "label": "Paket kampanye", "angka": True}, {"k": "bahaya", "label": "Per bahaya"}],
                     baris=kal, rumus="jumlah paket (kab dan bahaya) yang bulan kampanyenya jatuh di bulan itu", sumber=["Siaga pra-musim logbook Pusdalops"], label=["hitungan_kita"])
    atr = [{"nama": "Siaga pra-musim (logbook Pusdalops BNPB, siaga.py)", "url": "repo:public/data/bnpb/siaga.json", "diambil": siaga["dibuat"][:10], "lisensi": "data internal BNPB, agregat"},
           {"nama": "Keterpaparan penduduk terpapar.json", "url": "repo:public/data/bnpb/terpapar.json", "diambil": terpapar["dibuat"][:10], "lisensi": str(terpapar.get("lisensi", "tidak tertulis"))[:200]},
           {"nama": "Tindakan kesiapsiagaan ews_tindakan.js", "url": "repo:public/ews_tindakan.js", "diambil": hari.isoformat(), "lisensi": "rujukan per butir di berkas itu"}]
    b = rapor.berkas([k1, k2], atr)
    b["data"] = {"label_wajib": LABEL_WAJIB, "hari": hari.isoformat(), "desa_ada": bool(desa_doc), "tanpa_musim": tanpa_musim, "ambang_tinggi": ambang, "median_porsi": med, "ambang_asumsi": True, "porsi_terpisah": False,
                 "paket": paket}
    return b


def jalan():
    hari = (datetime.now(timezone.utc) + timedelta(hours=7)).date()
    return {"kampanye": bangun(pd2._baca(os.path.join(DATA, "siaga.json")), pd2._baca(os.path.join(DATA, "terpapar.json")), tindakan_node(), pd2.muat_desa(), hari)}


def _kunci(x, hasil=None):
    hasil = set() if hasil is None else hasil
    if isinstance(x, dict):
        for k, v in x.items():
            hasil.add(k); _kunci(v, hasil)
    elif isinstance(x, list):
        for v in x:
            _kunci(v, hasil)
    return hasil


def cek():
    from datetime import date
    assert bulan_paket(11) == [9, 10] and bulan_paket(1) == [11, 12] and bulan_paket(2) == [12, 1] and bulan_paket(13) is None and bulan_paket(True) is None
    assert porsi([100, 20, 50, 10]) == 0.2 and porsi([100, 20, 0, 0]) is None and porsi([100, 20, None, 5]) is None and porsi(None) is None
    siaga = {"dibuat": "2026-11-01", "kab": {"0001": {"nama": "Kab. A", "musim": {"banjir": {"mulai": 1}, "cuaca": {"mulai": 6}}},
                                            "0002": {"nama": "Kab. B", "musim": {"banjir": {"mulai": 1}}}, "0003": {"nama": "Kab. C", "musim": {"banjir": {"mulai": 1}}},
                                            "0004": {"nama": "Kab. D", "musim": {}}}}
    h = lambda j, r: {"banjir": [j, 0, j, r]}  # noqa: E731
    terpapar = {"dibuat": "2026-11-01T00:00", "lisensi": "x", "ambang": {"sedang_plus": 0.33, "tinggi": 0.5}, "kab": {"0001": {"h": h(100, 50)}, "0002": {"h": h(100, 10)}, "0003": {"h": h(0, 0)}, "0004": {"h": h(10, 10)}}}
    tind = {"banjir": ["Ketahui rute evakuasi.", "Siapkan tas siaga."], "cuaca": []}
    b = bangun(siaga, terpapar, tind, None, date(2026, 11, 26))
    p = {(x["kab"], x["bahaya"]): x for x in b["data"]["paket"]}
    assert set(p) == {("0001", "banjir"), ("0001", "cuaca"), ("0002", "banjir"), ("0003", "banjir")}, "kab tanpa musim tak punya paket"
    assert p[("0001", "banjir")]["bulan"] == [11, 12] and p[("0001", "cuaca")]["bulan"] == [4, 5]
    assert b["data"]["median_porsi"]["banjir"] == 0.3 and b["data"]["median_porsi"]["cuaca"] is None, "median dari porsi yang ada; 0003 penyebut 0 tidak ikut"
    assert p[("0001", "banjir")]["saluran"] == SALURAN_TATAP and p[("0002", "banjir")]["saluran"] == SALURAN_DARING
    assert p[("0003", "banjir")]["porsi_rentan"] is None and p[("0003", "banjir")]["saluran"] is None, "tanpa porsi: tanpa usulan saluran, bukan media"
    assert p[("0001", "cuaca")]["saluran"] is None and p[("0001", "cuaca")]["pesan"] == [] and p[("0001", "cuaca")]["pesan_ada"] is False
    assert p[("0001", "banjir")]["desa"] is None, "tanpa data per desa tidak ada daftar desa"
    k1 = b["kartu"][0]
    an = {a["k"]: a["nilai"] for a in k1["angka"]}
    assert (an["ini"], an["kab"], an["tatap"], an["tanpa_porsi"]) == (3, 3, 1, 1), an   # bulan November: 3 paket banjir
    assert {r["kab"] for r in k1["baris"]} == {"Kab. A", "Kab. B", "Kab. C"} and k1["baris"][0]["paket"] == "November dan Desember"
    kal = {x["bulan"]: x["paket"] for x in b["kartu"][1]["baris"]}
    assert kal["November"] == 3 and kal["April"] == 1 and kal["Mei"] == 1 and kal["Maret"] == 0 and kal["Juni"] == 0
    # data per desa: 10 teratas menurun menurut penduduk, hanya di atas ambang tinggi
    desa = {"desa": [{"kode": f"d{i}", "kab": "0001", "penduduk": 100 + i, "indeks": {"banjir": 0.9}} for i in range(12)] + [{"kode": "x", "kab": "0001", "penduduk": 9999, "indeks": {"banjir": 0.2}}]}
    b2 = bangun(siaga, terpapar, tind, desa, date(2026, 11, 26))
    dd = {(x["kab"], x["bahaya"]): x for x in b2["data"]["paket"]}[("0001", "banjir")]["desa"]
    assert b["data"]["tanpa_musim"] == 1 and {a["k"]: a["nilai"] for a in b["kartu"][0]["angka"]}["tanpa_musim"] == 1
    assert len(dd) == 10 and dd[0]["desa"] == "d11" and all(x["desa"] != "x" for x in dd)
    for x in (b, b2):
        rapor.periksa_berkas({"dibuat": "2026-11-26T00:00:00Z", "basi_jam": 1080, **x})
        assert not (_kunci(x["data"]) & TERLARANG), "kolom data orang di keluaran"
    try:
        bangun({"dibuat": "2026-11-01", "kab": {"0001": {"musim": {"banjir": {"mulai": 13}}}}}, terpapar, tind, None, date(2026, 11, 26))
        raise AssertionError("bulan mulai 13 tidak ditolak")
    except ValueError:
        pass
    # keluaran nyata
    n = jalan()["kampanye"]
    rapor.periksa_berkas({"dibuat": "2026-11-26T00:00:00Z", "basi_jam": 1080, **n})
    s = json.dumps(n, ensure_ascii=False)
    assert "·" not in s and not re.search(r"\baman\b", s, re.I) and not (_kunci(n["data"]) & TERLARANG)
    assert any(x["pesan_ada"] for x in n["data"]["paket"]), "pesan tindakan dari ews_tindakan.js terbaca"
    a = n["kartu"][0]["angka"]
    print(f"mt3.py --cek: lulus ({len(n['data']['paket'])} paket kab-bahaya, {a[0]['nilai']} bulan ini, desa {'ada' if n['data']['desa_ada'] else 'belum ada data'})")


if __name__ == "__main__":
    if "--cek" in sys.argv:
        cek()
    else:
        print(__doc__)
