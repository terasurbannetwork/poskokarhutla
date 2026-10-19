"""Perkiraan kebutuhan musim karhutla per provinsi (30/60/90 hari) -> public/banjir/data/kebutuhan_musim.json

Bukan model baru: klimatologi titik panas yang sudah terbit dikalikan koefisien operasional tertulis (ASUMSI), lalu diberi tarif (ASUMSI).

  TITIK(p, H, skenario) = rerata, atas tahun-tahun skenario, jumlah titik panas p pada jendela H hari yang SAMA dengan jendela ini
                          (public/data/musim_harian.json, M+N+N20 semua keyakinan, 2019-2025). Jendela boleh melintasi tahun.
                          rata   = semua tahun 2019-2025;  analog = tahun El Nino di antara 2019-2025 (musim.json tahun_el_nino).
  KOMPLEKS      = TITIK / titik_per_kompleks(p)         titik_per_kompleks = rerata `n` kluster.json untuk kompleks operasi.json di p
  JAM_TERBANG   = KOMPLEKS x porsi_prioritas(p) x jam_heli_per_api    porsi = bagian kompleks operasi.json dengan lv = 3
  REGU_HARI     = KOMPLEKS x regu_hari_per_kompleks(p) x rotasi       regu_hari = rerata (wl + wb) skenario tengah operasi.json
  REGU_RATA     = REGU_HARI / H                          regu darat rata-rata yang siaga sepanjang jendela
  TERDAMPAK     = penduduk kecamatan berkompleks tingkat 2+ (p) x min(1, KOMPLEKS / kompleks_operasi(p))     WorldPop 2026
  RUPIAH        = JAM_TERBANG x tarif_heli_jam + REGU_HARI x 15 x biaya_orang_hari(p) + TERDAMPAK x masker_per_orang x harga_masker
Komponen tanpa data (provinsi dengan < 5 kompleks di operasi.json) = null, bukan 0. Label wajib: "perkiraan, belum diuji balik".

Pakai:  python3 scripts/bnpb/kebutuhan.py [--hari YYYY-MM-DD]   |   python3 scripts/bnpb/kebutuhan.py --cek
"""
import argparse, datetime as dt, json, os, sys, tempfile
from collections import defaultdict

AB = os.path.dirname(os.path.abspath(__file__))
AKAR = os.path.normpath(os.path.join(AB, "../.."))
sys.path.insert(0, os.path.join(AKAR, "scripts/umum"))
import kejadian as _kej

WIB = dt.timezone(dt.timedelta(hours=7))
LABEL = "perkiraan, belum diuji balik"
HORIZON = [30, 60, 90]
TAHUN = list(range(2019, 2026))
MIN_KOMPLEKS = 5     # provinsi dengan kompleks operasi.json lebih sedikit: koefisien terlalu tipis, komponen null
RONI_EL_NINO = 0.5   # ambang RONI untuk menandai skenario analog sebagai yang relevan sekarang

# Tarif dan koefisien = ASUMSI KERJA yang bisa diubah di sini. Tiap entri: nilai, satuan, sumber.
UH = {"14": 370e3, "15": 370e3, "16": 380e3, "61": 380e3, "62": 360e3, "63": 380e3, "64": 430e3, "53": 430e3, "93": 580e3}
UH_BAWAAN = 380e3
TARIF = {
    "heli_jam": {"nilai": 150e6, "satuan": "Rp/jam terbang", "sumber": "ASUMSI.heliJam tab Posko (public/index.html): sewa helikopter water bombing, Dana Siap Pakai BNPB"},
    "uang_harian": {"nilai": UH, "bawaan": UH_BAWAAN, "satuan": "Rp/orang/hari", "sumber": "SBM 2026 uang harian luar kota per provinsi (tab Posko); provinsi lain memakai nilai bawaan, asumsi"},
    "porsi_bko": {"nilai": 0.4, "satuan": "porsi personel", "sumber": "ASUMSI.porsiBKO tab Posko: porsi personel yang dibayar uang harian penuh"},
    "porsi_mpa": {"nilai": 0.4, "satuan": "porsi personel", "sumber": "ASUMSI.porsiMPA tab Posko: porsi Masyarakat Peduli Api"},
    "honor_mpa": {"nilai": 100e3, "satuan": "Rp/orang/hari", "sumber": "ASUMSI.honorMPA tab Posko"},
    "konsumsi": {"nilai": 150e3, "satuan": "Rp/orang/hari", "sumber": "ASUMSI.konsumsi tab Posko"},
    "harga_masker": {"nilai": 15e3, "satuan": "Rp/masker N95", "sumber": "estimasi tab Posko (HARGA 'Masker N95')"},
}
KOEF = {
    "orang_per_regu": {"nilai": 15, "satuan": "orang/regu", "sumber": "Permen LHK P.32/2016 (operasi.json koef orang_regu)"},
    "jam_heli_per_api": {"nilai": 3, "satuan": "jam terbang/kompleks prioritas", "sumber": "ASUMSI scripts/data/keputusan.py (rentang 1,5 sampai 6)"},
    "rotasi": {"nilai": 1.5, "satuan": "kali", "sumber": "operasi.json koef rotasi tengah: tiga giliran, dua regu bekerja"},
    "masker_per_orang": {"nilai": 2, "satuan": "masker/orang terdampak", "sumber": "ASUMSI platform: dua masker per orang untuk satu episode asap"},
}
SKENARIO = [("rata", "Rerata 2019-2025"), ("analog", "Tahun El Nino")]
KOLOM = ["prov", "titik", "kompleks", "jam_terbang", "regu_hari", "regu_rata", "terdampak", "masker", "rp_heli", "rp_regu", "rp_masker", "rp_total"]
Z = {"w": _kej._W}


def baca(j):
    return _kej.baca(os.path.join(AKAR, j))


def biaya_orang_hari(p):
    t = TARIF
    return t["porsi_bko"]["nilai"] * UH.get(p, UH_BAWAAN) + t["porsi_mpa"]["nilai"] * t["honor_mpa"]["nilai"] + t["konsumsi"]["nilai"]


def titik_jendela(per_tahun, mulai, H, tahun):
    """per_tahun = {'2019': [harian dari 1 Jan]}; jumlah titik pada [mulai.bulan-hari tahun, +H hari). None bila jendela melewati data."""
    try:
        awal = dt.date(tahun, mulai.month, mulai.day)
    except ValueError:
        return None
    total, tgl = 0, awal
    for _ in range(H):
        arr = per_tahun.get(str(tgl.year))
        i = (tgl - dt.date(tgl.year, 1, 1)).days
        if arr is None or i >= len(arr):
            return None
        total += arr[i]
        tgl += dt.timedelta(days=1)
    return total


def koef_prov(operasi, kluster, penduduk):
    """Koefisien turunan data per provinsi: titik/kompleks, porsi prioritas, regu-hari/kompleks, penduduk kecamatan berkompleks."""
    n = {f["properties"]["id"]: f["properties"]["n"] for f in kluster["features"]}
    g = defaultdict(list)
    for c in operasi["kompleks"]:
        g[c["prov"]].append(c)
    out = {}
    for p, l in g.items():
        ns = [n[c["id"]] for c in l if c["id"] in n]
        kec = {(c["prov"], c["kab"], c["kec"]) for c in l if c["lv"] >= 2}   # asap yang berarti: kompleks tingkat 2 ke atas
        pend = sum(penduduk["kec"].get("|".join(k), 0) for k in kec)
        out[p] = {"kompleks_operasi": len(l),
                  "titik_per_kompleks": sum(ns) / len(ns) if ns else None,
                  "porsi_prioritas": sum(c["lv"] >= 3 for c in l) / len(l),
                  "regu_hari_per_kompleks": sum(c["wl"][1] + c["wb"][1] for c in l) / len(l),
                  "pend_berkompleks": pend or None}
    return out


def hitung(titik, p, kp):
    """Satu baris dari titik panas yang diharapkan. kp = koef_prov[p] atau None. Satu rumus untuk semua provinsi dan horizon."""
    k, t = KOEF, TARIF
    if titik is None:
        return None
    if kp is None or not kp["titik_per_kompleks"] or kp["kompleks_operasi"] < MIN_KOMPLEKS:
        return {"titik": round(titik), "kompleks": None, "jam_terbang": None, "regu_hari": None, "regu_rata": None, "terdampak": None,
                "masker": None, "rp_heli": None, "rp_regu": None, "rp_masker": None, "rp_total": None}
    kom = titik / kp["titik_per_kompleks"]
    jam = kom * kp["porsi_prioritas"] * k["jam_heli_per_api"]["nilai"]
    rh = kom * kp["regu_hari_per_kompleks"] * k["rotasi"]["nilai"]
    ter = None if not kp["pend_berkompleks"] else kp["pend_berkompleks"] * min(1.0, kom / kp["kompleks_operasi"])
    mask = None if ter is None else ter * k["masker_per_orang"]["nilai"]
    rp_h = jam * t["heli_jam"]["nilai"]
    rp_r = rh * k["orang_per_regu"]["nilai"] * biaya_orang_hari(p)
    rp_m = None if mask is None else mask * t["harga_masker"]["nilai"]
    return {"titik": round(titik), "kompleks": round(kom, 1), "jam_terbang": round(jam), "regu_hari": round(rh), "regu_rata": None,
            "terdampak": None if ter is None else round(ter), "masker": None if mask is None else round(mask),
            "rp_heli": round(rp_h), "rp_regu": round(rp_r), "rp_masker": None if rp_m is None else round(rp_m),
            "rp_total": round(rp_h) + round(rp_r) + round(rp_m or 0)}


def bangun(src, hari):
    mulai = dt.date.fromisoformat(hari)
    mh, kp = src["musim_harian"], koef_prov(src["operasi"], src["kluster"], src["penduduk"])
    roni = (src["iklim"] or {}).get("keadaan_sekarang", {}).get("roni", {}).get("nilai")
    nino = [int(y) for y in src["musim"]["tahun_el_nino"] if int(y) in TAHUN]
    prov = {p: n for p, n in Z["w"].PROVINSI.items()}
    data, nas, tahun_pakai = {}, {}, {}
    for sk, _ in SKENARIO:
        thn = TAHUN if sk == "rata" else nino
        for H in HORIZON:
            ok = [y for y in thn if all(titik_jendela(mh["prov"].get(p, {}), mulai, H, y) is not None for p in list(mh["prov"])[:1])]
            tahun_pakai[f"{sk}|{H}"] = ok
            baris, tot = [], defaultdict(float)
            for p in sorted(prov):
                v = [titik_jendela(mh["prov"].get(p, {}), mulai, H, y) for y in ok]
                r = hitung(sum(v) / len(v) if v else None, p, kp.get(p))
                if r is None:
                    baris.append([p] + [None] * (len(KOLOM) - 1))
                    continue
                if r["regu_hari"] is not None:
                    r["regu_rata"] = round(r["regu_hari"] / H, 1)
                baris.append([p] + [r[c] for c in KOLOM[1:]])
                for c in KOLOM[1:]:
                    if r[c] is not None and c != "regu_rata":
                        tot[c] += r[c]
            data[f"{sk}|{H}"] = baris
            nas[f"{sk}|{H}"] = {c: (round(tot[c]) if c in tot else None) for c in KOLOM[1:] if c != "regu_rata"}
            nas[f"{sk}|{H}"]["regu_rata"] = None if not tot.get("regu_hari") else round(tot["regu_hari"] / H, 1)
            nas[f"{sk}|{H}"]["prov_berangka"] = sum(1 for b in baris if b[KOLOM.index("rp_total")] is not None)
    return {
        "versi": 1, "hari": hari, "label": LABEL,
        "rumus": {
            "titik": "rerata jumlah titik panas pada jendela H hari yang sama, atas tahun skenario (musim_harian.json, 2019-2025)",
            "kompleks": "titik / titik_per_kompleks provinsi (rerata n kluster untuk kompleks operasi.json)",
            "jam_terbang": "kompleks x porsi kompleks prioritas (lv 3) x jam_heli_per_api",
            "regu_hari": "kompleks x regu_hari_per_kompleks (rerata wl + wb tengah operasi.json) x rotasi",
            "regu_rata": "regu_hari / H",
            "terdampak": "penduduk kecamatan berkompleks tingkat 2+ x min(1, kompleks / kompleks operasi.json)",
            "masker": "terdampak x masker_per_orang",
            "rp_heli": "jam_terbang x tarif heli per jam",
            "rp_regu": "regu_hari x 15 orang x biaya orang-hari (0,4 x uang harian + 0,4 x honor MPA + konsumsi)",
            "rp_masker": "masker x harga masker",
            "rp_total": "rp_heli + rp_regu + rp_masker (komponen null tidak dijumlah)"},
        "tarif": TARIF, "koefisien": KOEF, "asumsi": True,
        "dasar": {"titik_panas": f"public/data/musim_harian.json sampai {mh['sd']}", "operasi": f"public/data/operasi.json per {src['operasi'].get('per')}",
                  "kluster": "public/data/kluster.json", "penduduk": "public/data/penduduk.json (WorldPop 2026)", "tahun_el_nino": nino,
                  "roni_sekarang": roni, "analog_relevan": roni is not None and roni >= RONI_EL_NINO,
                  "umur_titik_hari": (mulai - dt.date.fromisoformat(mh["sd"])).days},
        "batas": ["Klimatologi titik panas 2019-2025 pada jendela yang sama, bukan prakiraan; ENSO dan IOD diwakili hanya lewat skenario tahun El Nino.",
                  "Koefisien operasional dan tarif adalah asumsi kerja, bukan RAB; Manggala Agni yang sudah dibiayai DIPA tetap dihitung agar skala kebutuhan terlihat.",
                  "Provinsi dengan kurang dari 5 kompleks di operasi.json tidak punya koefisien yang layak: komponennya null, bukan nol."],
        "horizon": HORIZON, "skenario": [{"id": s, "nama": n} for s, n in SKENARIO], "tahun_dipakai": tahun_pakai,
        "provinsi": prov, "kolom": KOLOM, "data": data, "nasional": nas,
        "koef_provinsi": {p: {k: (round(v, 3) if isinstance(v, float) else v) for k, v in d.items()} for p, d in sorted(kp.items())},
    }


def muat():
    return {"musim_harian": baca("public/data/musim_harian.json"), "operasi": baca("public/data/operasi.json"),
            "kluster": baca("public/data/kluster.json"), "penduduk": baca("public/data/penduduk.json"),
            "musim": baca("public/data/musim.json"), "iklim": baca("public/data/iklim_outlook.json")}


def cek():
    src = muat()
    for k, v in src.items():
        assert v, f"sumber hilang: {k}"
    hari = "2026-10-19"
    a, b = bangun(src, hari), bangun(src, hari)
    assert a == b, "tidak deterministik"
    # jendela pada angka tangan, termasuk lintas tahun
    pt = {"2020": [1] * 366, "2021": [2] * 365}
    assert titik_jendela(pt, dt.date(2026, 12, 30), 5, 2020) == 1 * 2 + 2 * 3, "jendela lintas tahun"
    assert titik_jendela(pt, dt.date(2026, 12, 30), 5, 2021) is None, "jendela melewati data harus None"
    # satu rumus pada angka tangan
    kp = {"kompleks_operasi": 10, "titik_per_kompleks": 20.0, "porsi_prioritas": 0.5, "regu_hari_per_kompleks": 10.0, "pend_berkompleks": 1000}
    r = hitung(400, "99", kp)   # 20 kompleks
    assert r["kompleks"] == 20 and r["jam_terbang"] == 30 and r["regu_hari"] == 300, r
    assert r["terdampak"] == 1000 and r["masker"] == 2000 and r["rp_masker"] == 30e6 and r["rp_heli"] == 30 * 150e6, r
    assert r["rp_regu"] == round(300 * 15 * (0.4 * UH_BAWAAN + 0.4 * 100e3 + 150e3)), r
    assert r["rp_total"] == r["rp_heli"] + r["rp_regu"] + r["rp_masker"]
    z = hitung(400, "99", None)
    assert z["titik"] == 400 and z["kompleks"] is None and z["rp_total"] is None, "tanpa koefisien harus null"
    assert hitung(None, "99", kp) is None
    ix = {k: i for i, k in enumerate(a["kolom"])}
    assert set(a["data"]) == {f"{s}|{h}" for s, _ in SKENARIO for h in HORIZON}
    for kunci, baris in a["data"].items():
        assert len(baris) == len(a["provinsi"]) == 38
        for r in baris:
            assert len(r) == len(KOLOM)
            for v in r[1:]:
                assert v is None or (isinstance(v, (int, float)) and v >= 0), (kunci, r)
            if r[ix["rp_total"]] is not None:
                assert r[ix["rp_total"]] == (r[ix["rp_heli"]] or 0) + (r[ix["rp_regu"]] or 0) + (r[ix["rp_masker"]] or 0), (kunci, r)
    # horizon lebih panjang tidak boleh lebih sedikit titik/rupiah (skenario sama)
    for s, _ in SKENARIO:
        n = [a["nasional"][f"{s}|{h}"] for h in HORIZON]
        assert n[0]["titik"] <= n[1]["titik"] <= n[2]["titik"], ("titik", s, n)
        assert n[0]["rp_total"] <= n[1]["rp_total"] <= n[2]["rp_total"], ("rupiah", s, n)
    assert a["nasional"]["rata|90"]["rp_total"] > 0 and a["nasional"]["rata|90"]["prov_berangka"] >= 20, a["nasional"]["rata|90"]
    assert a["label"] == LABEL and all(len(v) >= 1 for v in a["tahun_dipakai"].values()), a["tahun_dipakai"]
    with tempfile.TemporaryDirectory() as t:
        p = os.path.join(t, "k.json")
        _kej.simpan(p, a)
        assert next(iter(json.load(open(p)))) == "dibuat" and os.path.getsize(p) < 200_000, os.path.getsize(p)
    n = a["nasional"]
    print("cek ok:", {k: (v["titik"], v["kompleks"], v["jam_terbang"], v["regu_hari"], v["rp_total"]) for k, v in n.items()})


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--hari", default=dt.datetime.now(WIB).date().isoformat())
    ap.add_argument("--cek", action="store_true")
    ap.add_argument("--keluar", default=os.path.join(AKAR, "public/banjir/data/kebutuhan_musim.json"))
    a = ap.parse_args()
    if a.cek:
        return cek()
    isi = bangun(muat(), a.hari)
    _kej.simpan(a.keluar, isi)
    print(f"kebutuhan: {len(isi['data'])} tabel, nasional rata|90 Rp{isi['nasional']['rata|90']['rp_total']:,}, {os.path.getsize(a.keluar) // 1024} KB", file=sys.stderr)


if __name__ == "__main__":
    main()
