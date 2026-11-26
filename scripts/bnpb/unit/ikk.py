"""RRP-3 masukan: IKK BPS (indeks biaya konstruksi antarwilayah) per kab/kota dan provinsi (DESAIN-TEKNIS sec 5.9; tiket RU-054).

Langkah jalan.py (bulanan; BPS merilis IKK tahunan). Kalkulatornya di peramban (public/bnpb/unit/rrp3.js); berkas ini hanya
mengantar angka BPS, tarif stimulan dari Jam Aturan, dan kolom Formulir 08 Perka 15/2011 ke unit/ikk.json.

SUMBER  BPS WebAPI domain 0000: var 2515 (IKK kabupaten/kota, 514 kab) dan var 128 (IKK provinsi). Nama resmi BPS
        tidak ditulis utuh di sini: satu katanya ada di daftar kata tuduhan gerbang Ruang Unit (KEAMANAN-PRIVASI 9.3). Kota acuan berganti per tahun (2024 Banjarmasin=100, 2025 Surabaya=100): hanya tahun terbaru
        dipakai, tahun berbeda tidak dicampur.
KUNCI   BPS_KEY dari environment, hanya dipakai di URL saat ambil; galat disamarkan (bps.ambil). Tanpa BPS_KEY dipakai cache
        terakhir data/raw/unit/ikk/bps_<var>.json (data/raw di .gitignore). Tanpa cache: kartu menunggu data, bukan angka karangan.
WILAYAH Kode BPS bukan Kemendagri: kab dipetakan lewat nama dan provinsi (scripts/siklus/bps.py bersih_ikk, pemetaan yang sama
        dengan Jitupasna siklus). Provinsi BPS dipetakan ke kode Kemendagri lewat mayoritas kab-nya (Papua berkode beda).
        IKK kosong tetap None.

  python3 -I scripts/bnpb/unit/ikk.py --cek
"""
import importlib.util
import json
import os
import re
import sys
from collections import Counter
from datetime import datetime, timezone

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))  # -I tidak menaruh folder skrip
import aturan as jam  # noqa: E402
import rapor  # noqa: E402

AKAR = rapor.AKAR
CACHE = os.path.join(AKAR, "data", "raw", "unit", "ikk")
VAR = {"kab": 2515, "prov": 128}
LABEL_TARIF = "tarif_stimulan_juta"
# Formulir 08 Perka 15/2011 hlm. 104 (PDF hlm. 107), "formulir penilaian kerusakan dan kerugian ... pada lampiran 7" (hlm. 34);
# dibekukan sekali dari teks; tests/bnpb/fixtures/unit/rrp3_kolom.json harus sama.
# Nama BPS yang tidak dikenali pemeta siklus (kunci.kab4, 26 Nov 2026): nama lama atau tanpa "Administrasi". Kode dari
# scripts/udara/kota.json. ponytail: salinan kecil; pindahkan ke scripts/siklus/kunci.py (pemilik siklus) lalu hapus di sini.
ALIAS = {"Toba Samosir": "1212", "Kota Padangsidimpuan": "1277", "Kepulauan Seribu": "3101", "Kota Jakarta Pusat": "3171",
         "Kota Jakarta Utara": "3172", "Kota Jakarta Barat": "3173", "Kota Jakarta Selatan": "3174", "Kota Jakarta Timur": "3175",
         "Siau Tagulandang Biaro": "7109", "Pangkajene dan Kepulauan": "7310", "Mamuju Utara": "7601", "Maluku Tenggara Barat": "8103"}
KOLOM_FORMULIR = ["No", "Sektor/Sub Sektor", "Komponen Kerusakan dan Kerugian", "Lokasi",
                  "Data Kerusakan RB", "Data Kerusakan RS", "Data Kerusakan RR",
                  "Harga Satuan (Rp.) RB", "Harga Satuan (Rp.) RS", "Harga Satuan (Rp.) RR",
                  "Nilai Kerusakan (Damage) RB", "Nilai Kerusakan (Damage) RS", "Nilai Kerusakan (Damage) RR",
                  "Perkiraan Kerugian (Losses)", "Kerusakan + Kerugian", "Kebutuhan"]


def _muat_siklus_bps():
    p = os.path.join(AKAR, "scripts", "siklus", "bps.py")
    s = importlib.util.spec_from_file_location("siklus_bps_ikk", p)
    m = importlib.util.module_from_spec(s)
    s.loader.exec_module(m)
    return m


def _kab_info():
    d = json.load(open(os.path.join(AKAR, "scripts", "udara", "kota.json"), encoding="utf-8"))
    i = {k: n for n, k in enumerate(d["kolom"])}
    return {r[i["kode"]]: r[i["nama"]] for r in d["baris"]}


def acuan(isi):
    """Catatan var BPS -> {tahun: kota acuan}, mis. {'2025': 'Surabaya'}; dari teks 'Kota X sebagai kota acuan (X=100) pada tahun A-B'."""
    out = {}
    note = " ".join((v.get("note") or "") for v in (isi.get("var") or []))
    for kota, a, b in re.findall(r"Kota\s+([A-Za-z ]+?)\s+sebagai kota acuan\s*\([^)]*\)\s*pada tahun\s*(\d{4})(?:\s*-\s*(\d{4}))?", note):
        for t in range(int(a), int(b or a) + 1):
            out[str(t)] = kota.strip()
    return out


def bersihkan(raw_kab, raw_prov, S=None):
    """Respons mentah BPS (bytes) -> {tahun, kab, prov, nama_prov, acuan, hitung}. Tahun = tahun terbaru yang berisi di var kab."""
    S = S or _muat_siklus_bps()
    sel_k, _ = S.urai(raw_kab, VAR["kab"])
    kab_th, hitung = S.bersih_ikk(sel_k)
    K = S._muat("kunci")
    kode = lambda s: K.kab4(s["label"], str(s["vervar"])[:2]) or ALIAS.get(s["label"])
    alias = {s["vervar"] for s in sel_k if not K.kab4(s["label"], str(s["vervar"])[:2]) and s["label"] in ALIAS}
    for s in sel_k:
        if s["vervar"] in alias:
            kab_th.setdefault(ALIAS[s["label"]], {})[str(s["tahun"])] = s["nilai"]
    hitung = {**hitung, "kab_tak_terpetakan": hitung["kab_tak_terpetakan"] - len(alias), "kab_alias": len(alias)}
    tahun = max((t for v in kab_th.values() for t, x in v.items() if x is not None), default=None)
    if tahun is None:
        raise ValueError("IKK kab: tidak ada nilai di tahun mana pun")
    kab = {k: v.get(tahun) for k, v in sorted(kab_th.items())}
    # provinsi BPS -> Kemendagri lewat mayoritas kab-nya (vervar kab BPS 4 digit, 2 digit awal = provinsi BPS)
    pasang = {}
    for s in sel_k:
        k4 = kode(s)
        if k4:
            pasang.setdefault(str(s["vervar"])[:2], Counter())[k4[:2]] += 1
    prov_map = {b: c.most_common(1)[0][0] for b, c in pasang.items()}
    sel_p, _ = S.urai(raw_prov, VAR["prov"])
    prov, nama_prov, tak = {}, {}, set()
    for s in sel_p:
        v = str(s["vervar"])
        if str(s["tahun"]) != tahun or len(v) != 4 or not v.endswith("00") or v == "9999":
            continue
        kd = prov_map.get(v[:2])
        if kd is None:
            tak.add(v)
            continue
        prov[kd] = s["nilai"]
        nama_prov[kd] = s["label"].title()
    ac = acuan(json.loads(raw_kab))
    hitung = {**hitung, "kab_berisi": sum(x is not None for x in kab.values()), "prov_berisi": sum(x is not None for x in prov.values()),
              "prov_tak_terpetakan": len(tak)}
    return {"tahun": int(tahun), "acuan": ac.get(tahun), "kab": kab, "prov": dict(sorted(prov.items())), "nama_prov": nama_prov, "hitung": hitung}


def ambil_bps(kini=None):
    """Tarik dua var ke cache bila BPS_KEY ada. Mengembalikan daftar var yang berhasil; tanpa kunci: []."""
    if not os.environ.get("BPS_KEY", "").strip():
        return []
    sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    import bps as B  # scripts/bnpb/bps.py: kunci() dari env, ambil() menyamarkan kunci di galat
    y = (kini or datetime.now(timezone.utc)).year - 1900
    os.makedirs(CACHE, exist_ok=True)
    ok = []
    for v in VAR.values():
        r = B.ambil(B.url_data("0000", v, f"{y - 2}:{y}"))   # API: maks 3 tahun per panggilan
        if r.get("status") != "OK" or r.get("data-availability") != "available":
            continue   # cache lama dipertahankan
        p = os.path.join(CACHE, f"bps_{v}.json")
        with open(p + ".tmp", "w", encoding="utf-8") as f:
            json.dump(r, f, ensure_ascii=False)
        os.replace(p + ".tmp", p)
        ok.append(v)
    return ok


def _baca_cache(v):
    p = os.path.join(CACHE, f"bps_{v}.json")
    if not os.path.exists(p):
        return None, None
    return open(p, "rb").read(), datetime.fromtimestamp(os.path.getmtime(p), timezone.utc).strftime("%Y-%m-%d")


def bangun(ikk, diambil):
    """ikk = hasil bersihkan() atau None (belum ada cache) -> isi berkas unit/ikk.json."""
    tarif = jam.nilai(LABEL_TARIF)
    nama_kab = _kab_info()
    sumber_k = ["BPS WebAPI var 2515 dan 128"]
    if ikk is None:
        k = rapor.kartu(
            id="rrp3-ikk", sistem="RRP-3", pil="Jitupasna permukiman", ikon="hitung", judul="Indeks biaya konstruksi IKK BPS",
            angka=[{"k": "kab", "label": "Kab/kota ber-IKK", "nilai": None, "title": "menunggu tarikan pertama BPS WebAPI (BPS_KEY)"}],
            kolom=[], baris=[], rumus=None, sumber=sumber_k, label=["resmi"])
        b = rapor.berkas([k], [{"nama": "BPS, IKK var 2515", "url": "https://webapi.bps.go.id/v1/api/list/model/data/domain/0000/var/2515",
                                "diambil": datetime.now(timezone.utc).strftime("%Y-%m-%d"), "lisensi": "Sumber: BPS, IKK"}])
        b["data"] = {"tahun": None, "acuan": None, "kab": {}, "prov": {}, "nama_kab": {}, "nama_prov": {}, "tarif_juta": tarif,
                     "kolom_formulir": KOLOM_FORMULIR, "status": "menunggu data"}
        return b
    baris = [{"kab": nama_kab.get(k, k), "prov": ikk["nama_prov"].get(k[:2]), "ikk": v, "ikk_prov": ikk["prov"].get(k[:2])}
             for k, v in ikk["kab"].items()]
    ac = f"kota acuan {ikk['acuan']}=100" if ikk["acuan"] else "kota acuan tidak tertulis di BPS"
    k = rapor.kartu(
        id="rrp3-ikk", sistem="RRP-3", pil="Jitupasna permukiman", ikon="hitung", judul="Indeks biaya konstruksi IKK BPS",
        angka=[{"k": "kab", "label": f"Kab/kota ber-IKK {ikk['tahun']}", "nilai": ikk["hitung"]["kab_berisi"], "title": f"{ac}; tahun lain tidak sebanding"},
               {"k": "prov", "label": "Provinsi ber-IKK, pengganti kab kosong", "nilai": ikk["hitung"]["prov_berisi"]},
               {"k": "tak", "label": "Wilayah BPS tak terpetakan ke kode Kemendagri", "nilai": ikk["hitung"]["kab_tak_terpetakan"] + ikk["hitung"]["prov_tak_terpetakan"]}],
        kolom=[{"k": "kab", "label": "Kab/kota"}, {"k": "prov", "label": "Provinsi"},
               {"k": "ikk", "label": "IKK kab/kota", "angka": True, "desimal": 2, "title": f"BPS var 2515, {ac}"},
               {"k": "ikk_prov", "label": "IKK provinsi", "angka": True, "desimal": 2, "title": "BPS var 128; dipakai bila IKK kab kosong"}],
        baris=baris, rumus=None, sumber=sumber_k, label=["resmi"], unduh="ikk_bps.csv")
    b = rapor.berkas([k], [{"nama": f"BPS, IKK {ikk['tahun']} ({ac})",
                            "url": "https://webapi.bps.go.id/v1/api/list/model/data/domain/0000/var/2515", "diambil": diambil,
                            "lisensi": "Sumber: BPS, IKK"}])
    b["data"] = {"tahun": ikk["tahun"], "acuan": ikk["acuan"], "kab": ikk["kab"], "prov": ikk["prov"],
                 "nama_kab": {k: nama_kab.get(k, k) for k in ikk["kab"]}, "nama_prov": ikk["nama_prov"],
                 "tarif_juta": tarif, "kolom_formulir": KOLOM_FORMULIR, "status": "ok"}
    return b


def jalan():
    try:
        ambil_bps()
    except Exception as e:  # noqa: BLE001 - BPS mati: cache terakhir tetap dipakai, galat disamarkan bps.ambil
        print(f"ikk.py: tarikan BPS gagal, memakai cache: {type(e).__name__}", file=sys.stderr)
    rk, tk = _baca_cache(VAR["kab"])
    rp, _ = _baca_cache(VAR["prov"])
    if rk is None or rp is None:
        return {"ikk": bangun(None, None)}
    return {"ikk": bangun(bersihkan(rk, rp), tk)}


def cek():
    S = _muat_siklus_bps()
    note = '<li>Kota Banjarmasin sebagai kota acuan (Banjarmasin=100) pada tahun 2024</li><li>Kota Surabaya sebagai kota acuan (Surabaya=100) pada tahun 2025</li>'
    sel = lambda var, vv, data: json.dumps({"status": "OK", "data-availability": "available", "var": [{"val": var, "note": note}],
                                            "turvar": [{"val": "0"}], "turtahun": [{"val": 0}], "vervar": vv,
                                            "tahun": [{"val": 124, "label": "2024"}, {"val": 125, "label": "2025"}],
                                            "datacontent": {f"{v}{var}0{t}0": x for (v, t), x in data.items()}}).encode()
    vk = [{"val": 1101, "label": "Simeulue"}, {"val": 1102, "label": "Aceh Singkil"}, {"val": 9471, "label": "Kota Jayapura"},
          {"val": 3171, "label": "Kota Jakarta Selatan"}]
    raw_k = sel(2515, vk, {(1101, 124): 120.5, (1101, 125): 112.5, (1102, 125): None, (9471, 125): 210.0, (3171, 125): 115.0})
    vp = [{"val": 1100, "label": "ACEH"}, {"val": 9400, "label": "PAPUA"}, {"val": 9999, "label": "INDONESIA"}, {"val": 3100, "label": "DKI JAKARTA"}]
    raw_p = sel(128, vp, {(1100, 125): 108.0, (9400, 125): 205.0, (9999, 125): 100.0, (1100, 124): 99.0, (3100, 125): 111.0})
    x = bersihkan(raw_k, raw_p, S)
    assert x["tahun"] == 2025 and x["acuan"] == "Surabaya", x
    assert x["kab"] == {"1109": 112.5, "1110": None, "9171": 210.0, "3174": 115.0}, x["kab"]   # BPS 1101 Simeulue = Kemendagri 1109; BPS 9471 Kota Jayapura = 9171
    assert x["prov"] == {"11": 108.0, "31": 111.0, "91": 205.0}, x["prov"]                  # Papua BPS 94 -> Kemendagri 91; nasional dibuang
    assert acuan({"var": [{"note": "Kota Semarang sebagai kota acuan (Semarang=100) pada tahun 2018-2020"}]}) == {"2018": "Semarang", "2019": "Semarang", "2020": "Semarang"}
    b = bangun(x, "2026-11-26")
    rapor.periksa_berkas({"dibuat": "2026-11-26T00:00:00Z", "basi_jam": 1080, **b})
    assert b["data"]["tarif_juta"] == {"RB": 60, "RS": 30, "RR": 15} and b["data"]["kolom_formulir"] == KOLOM_FORMULIR
    kb = {r["kab"]: r for r in b["kartu"][0]["baris"]}
    assert [r["ikk"] for n, r in kb.items() if "Singkil" in n] == [None], kb   # kosong tetap None, bukan 0
    beku = json.load(open(os.path.join(AKAR, "tests", "bnpb", "fixtures", "unit", "rrp3_kolom.json"), encoding="utf-8"))
    assert beku["kolom"] == KOLOM_FORMULIR, "kolom Formulir 08 berubah dari fixture beku"
    # tanpa cache: menunggu data, bukan angka karangan
    m = bangun(None, None)
    rapor.periksa_berkas({"dibuat": "2026-11-26T00:00:00Z", "basi_jam": 1080, **m})
    assert m["kartu"][0]["angka"][0]["nilai"] is None and m["data"]["status"] == "menunggu data" and m["data"]["kab"] == {}
    # tanpa BPS_KEY tidak ada jaringan
    simpan = os.environ.pop("BPS_KEY", None)
    try:
        assert ambil_bps() == []
        nyata = jalan()["ikk"]
    finally:
        if simpan is not None:
            os.environ["BPS_KEY"] = simpan
    rapor.periksa_berkas({"dibuat": "2026-11-26T00:00:00Z", "basi_jam": 1080, **nyata})
    s = json.dumps(nyata, ensure_ascii=False)
    assert "·" not in s and not re.search(r"\baman\b", s, re.I) and not re.search(r"[0-9a-f]{32}", s)
    d = nyata["data"]
    if d["status"] == "ok":
        assert len(d["kab"]) >= 500 and all(len(k) == 4 for k in d["kab"]), len(d["kab"])
        assert nyata["kartu"][0]["angka"][2]["nilai"] == 0, nyata["kartu"][0]["angka"][2]   # 514 kab BPS terpetakan semua
    print(f"ikk.py --cek: lulus (cache {d['status']}: IKK {d['tahun']}, {sum(v is not None for v in d['kab'].values())} kab, "
          f"{sum(v is not None for v in d['prov'].values())} provinsi)")


if __name__ == "__main__":
    if "--cek" in sys.argv:
        cek()
    elif "--ambil" in sys.argv:
        print("var tertarik:", ambil_bps())
    else:
        print(__doc__)
