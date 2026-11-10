"""Harga pangan: Panel Harga Bapanas (hari ini per provinsi) + riwayat uji balik WFP Food Prices (HDX).
-> public/data/harga_pangan.json        harga hari ini per provinsi + selisih terhadap median 30 hari (bila arsip >= 7 hari)
-> public/data/harga_pangan_arsip.json  arsip bergulir 60 hari buatan sendiri (Bapanas tak punya riwayat publik); dibaca ulang tiap jalan
-> public/data/harga_pangan_wfp.json    median bulanan 60 bulan per provinsi x komoditas WFP (bahan uji balik; diunduh ulang hanya bila HDX berubah)
INDEKS/fitur, bukan prakiraan: selisih terhadap median hanya menunjukkan harga naik atau turun dari kebiasaan 30 hari terakhir.

Akses (diperiksa 10 Nov 2026):
  GET https://api-panelhargav2.badanpangan.go.id/api/provinces -> id internal Bapanas (BUKAN kode BPS) + national_id (= kode BPS), 38 provinsi.
  GET .../api/front/harga-pangan-informasi?province_id=<id>&city_id=&level_harga_id=3 -> 27 komoditas, today/yesterday; province_id kosong = nasional.
  Jeda 1 dtk antar permintaan (39 permintaan).
Lisensi: situs Bapanas tidak mencantumkan lisensi; ditulis apa adanya di keluaran. WFP via HDX: CC BY-IGO.
Pakai: python3 scripts/umum/harga_pangan.py   |   python3 scripts/umum/harga_pangan.py uji
"""
import csv, datetime as dt, importlib.util, io, json, os, statistics, sys

AKAR = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "../.."))
DIR = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(AKAR, "public/data/harga_pangan.json")
ARSIP = os.path.join(AKAR, "public/data/harga_pangan_arsip.json")
WFP = os.path.join(AKAR, "public/data/harga_pangan_wfp.json")
API = "https://api-panelhargav2.badanpangan.go.id/api"
HDX = "https://data.humdata.org/api/3/action/package_show?id=wfp-food-prices-for-indonesia"
WIB = dt.timezone(dt.timedelta(hours=7))
HARI_ARSIP, MIN_HARI, BULAN_WFP = 60, 7, 60
# id komoditas Bapanas -> komoditas WFP (padanan terdekat; sisanya WFP tak punya)
PADAN = {28: "Rice (medium quality)", 30: "Onions (shallot, medium)", 31: "Garlic (medium)", 32: "Chili (red, curly)", 126: "Chili (red, large)",
         34: "Meat (beef, first quality)", 35: "Meat (chicken)", 36: "Eggs", 37: "Sugar (local)", 38: "Oil (vegetable)"}
ALIAS_WFP = {"DAERAH ISTIMEWA YOGYAKARTA": "D.I YOGYAKARTA"}  # nama WFP -> nama Bapanas (huruf besar)


def _mod(nama):
    s = importlib.util.spec_from_file_location("umum_" + nama, os.path.join(DIR, nama + ".py"))
    m = importlib.util.module_from_spec(s)
    s.loader.exec_module(m)
    return m


def baca(jalur, awal):
    return json.load(open(jalur, encoding="utf-8")) if os.path.exists(jalur) else awal


def selisih(sekarang, riwayat):
    """% terhadap median riwayat (hari-hari sebelumnya); None bila riwayat < MIN_HARI atau harga 0/kosong."""
    r = [x for x in riwayat if x]
    if not sekarang or len(r) < MIN_HARI:
        return None
    return round((sekarang / statistics.median(r) - 1) * 100, 1)


def bulanan(baris, prov_kode, mulai):
    """baris WFP -> {kode_prov: {id_bapanas: [median per bulan sejak `mulai` 'YYYY-MM', None bila kosong]}}."""
    kebalik = {v: k for k, v in PADAN.items()}
    tmp = {}
    for r in baris:
        kode, kid = prov_kode.get(ALIAS_WFP.get(r["admin1"], r["admin1"])), kebalik.get(r["commodity"])
        if not kode or not kid or r["date"][:7] < mulai:
            continue
        tmp.setdefault((kode, kid), {}).setdefault(r["date"][:7], []).append(float(r["price"]))
    n = (dt.date.today().year * 12 + dt.date.today().month) - (int(mulai[:4]) * 12 + int(mulai[5:]) - 1)
    out = {}
    for (kode, kid), per in tmp.items():
        seri = []
        for i in range(n):
            y, m = divmod(int(mulai[:4]) * 12 + int(mulai[5:]) - 1 + i, 12)
            v = per.get(f"{y}-{m + 1:02d}")
            seri.append(round(statistics.median(v)) if v else None)
        out.setdefault(kode, {})[str(kid)] = seri
    return out


def wfp(J, simp, prov_kode):
    meta = J.ambil(HDX, jeda_host=1)["result"]
    sumber = next(r for r in meta["resources"] if r["url"].endswith("wfp_food_prices_idn.csv"))
    ubah = meta["last_modified"]
    lama = baca(WFP, {})
    if lama.get("diperbarui_sumber") == ubah:
        return f"WFP tak berubah ({ubah[:10]})"
    teks = J.ambil(sumber["url"], mentah=True, batas=300).decode("utf-8")
    h = dt.date.today()
    y, m = divmod(h.year * 12 + h.month - 1 - (BULAN_WFP - 1), 12)
    mulai = f"{y}-{m + 1:02d}"
    simp(WFP, {"sumber": "WFP Food Prices for Indonesia (HDX)", "atribusi": "World Food Programme, via Humanitarian Data Exchange, https://data.humdata.org/dataset/wfp-food-prices-for-indonesia",
               "lisensi": meta.get("license_title"), "diperbarui_sumber": ubah, "jenis_keluaran": "RIWAYAT uji balik (median bulanan harga eceran, Rp per kg atau liter)",
               "bulan_mulai": mulai, "padanan_komoditas": {str(k): v for k, v in PADAN.items()},
               "wilayah": bulanan(csv.DictReader(io.StringIO(teks)), prov_kode, mulai)})
    return f"WFP diperbarui ({ubah[:10]})"


def jalan():
    J, simp = _mod("jaring"), _mod("kejadian").simpan
    provs = J.ambil(API + "/provinces", jeda_host=1)["data"]
    prov_kode = {p["nama"].upper(): p["national_id"].strip() for p in provs}
    hari = dt.datetime.now(WIB).date().isoformat()
    arsip = baca(ARSIP, {"hari": {}})["hari"]
    kom, hariini, gagal = {}, {}, []
    for pid, kode, nama in [("", "00", "Nasional")] + [(p["id"], p["national_id"].strip(), p["nama"]) for p in provs]:
        try:
            d = J.ambil(f"{API}/front/harga-pangan-informasi?province_id={pid}&city_id=&level_harga_id=3", jeda_host=1)["data"]
        except Exception as e:
            gagal.append(f"{nama}: {e}")
            continue
        for x in d:
            kom[x["id"]] = {"id": x["id"], "nama": x["name"], "satuan": x["satuan"]}
        hariini[kode] = {"nama": nama, "harga": {str(x["id"]): x["today"] or None for x in d}}
    if hariini:
        arsip[hari] = {k: v["harga"] for k, v in hariini.items()}
    for t in sorted(arsip)[:-HARI_ARSIP]:
        del arsip[t]
    simp(ARSIP, {"sumber": "Panel Harga Bapanas, arsip bergulir sendiri", "lisensi": "tidak dicantumkan situs sumber", "hari": arsip})
    sebelum = [arsip[t] for t in sorted(arsip) if t < hari]
    for kode, w in hariini.items():
        w["selisih_median_persen"] = {k: selisih(h, [s.get(kode, {}).get(k) for s in sebelum[-30:]]) for k, h in w["harga"].items()}
    try:
        status_wfp = wfp(J, simp, prov_kode)
    except Exception as e:
        status_wfp = f"WFP gagal: {e}"
    simp(OUT, {
        "sumber": "Panel Harga Bapanas (Badan Pangan Nasional), harga konsumen", "atribusi": "Badan Pangan Nasional, https://panelharga.badanpangan.go.id",
        "lisensi": "Situs Bapanas tidak mencantumkan lisensi; dipakai sebagai data publik dengan atribusi, hak tetap pada Bapanas",
        "jenis_keluaran": "INDEKS (harga hari ini dan selisih terhadap median 30 hari arsip sendiri; bukan prakiraan)", "tanggal": hari,
        "arsip_hari": len(sebelum), "selisih_aktif": len(sebelum) >= MIN_HARI, "status_wfp": status_wfp, "gagal": gagal,
        "catatan": "Harga 0 atau kosong = komoditas tak dilaporkan di wilayah itu. Kode wilayah = BPS (00 nasional). Riwayat uji balik: harga_pangan_wfp.json.",
        "komoditas": sorted(kom.values(), key=lambda k: k["id"]), "wilayah": hariini})
    print(f"harga_pangan: {len(hariini)} wilayah, {len(kom)} komoditas, arsip {len(arsip)} hari; {status_wfp}; gagal {len(gagal)}")


def uji():
    assert selisih(110, [100] * 10) == 10.0 and selisih(110, [100] * 3) is None and selisih(0, [100] * 10) is None
    assert selisih(90, [None] * 5 + [100] * 9) == -10.0
    h = dt.date.today()
    baris = [{"admin1": "ACEH", "commodity": "Eggs", "date": f"{h.year}-{h.month:02d}-15", "price": "30000"},
             {"admin1": "ACEH", "commodity": "Eggs", "date": f"{h.year}-{h.month:02d}-20", "price": "32000"},
             {"admin1": "DAERAH ISTIMEWA YOGYAKARTA", "commodity": "Rice (medium quality)", "date": f"{h.year}-{h.month:02d}-01", "price": "12000"},
             {"admin1": "ACEH", "commodity": "Wheat", "date": f"{h.year}-{h.month:02d}-01", "price": "1"}]
    o = bulanan(baris, {"ACEH": "11", "D.I YOGYAKARTA": "34"}, f"{h.year}-{h.month:02d}")
    assert o == {"11": {"36": [31000]}, "34": {"28": [12000]}}, o
    print("uji harga_pangan: ok")


if __name__ == "__main__":
    uji() if sys.argv[1:] == ["uji"] else jalan()
