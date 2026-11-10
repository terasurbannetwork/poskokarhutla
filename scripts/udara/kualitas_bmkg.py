"""Kualitas udara BMKG bulanan (teks saja) -> public/udara/data/kualitas_bmkg.json + kualitas_bmkg_arsip.json (append-only per bulan).

Sumber: www.bmkg.go.id/kualitas-udara/{spm,ozon,so2,no2,kimia-air-hujan} (__NUXT_DATA__; SPM: kategori dari kartu HTML apa adanya) dan
/kualitas-udara/ozon/{YYYY-MM} untuk bulan arsip ozon yang belum kita simpan. Data BULANAN untuk kajian, BUKAN siaga: `tertinggal_bulan` = selisih bulan data
terhadap bulan WIB sekarang (jujur). Satuan seperti tertulis (SPM dan ozon tidak menulis satuan di data -> null). Tak terbaca = null. PM2.5 jam-jaman TIDAK diambil di sini
(sudah ada bmkg_pm25.json). Jeda 2 detik, gagal-lunak per halaman, tanpa token.
Pakai: python3 scripts/udara/kualitas_bmkg.py | ... uji
"""
import html as _html, json, os, re, sys, time, datetime as dt

AKAR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "../..")
sys.path.insert(0, os.path.join(AKAR, "scripts/cuaca"))
from bmkg_kab10 import nuxt_semua, unduh  # noqa: E402
from dasar import WIB, baca, sekarang, simpan  # noqa: E402

W = "https://www.bmkg.go.id/kualitas-udara"
JEDA = 2.0
KELUAR = os.path.join(AKAR, "public/udara/data")
BERKAS, ARSIP = os.path.join(KELUAR, "kualitas_bmkg.json"), os.path.join(KELUAR, "kualitas_bmkg_arsip.json")
BULAN = ["januari", "februari", "maret", "april", "mei", "juni", "juli", "agustus", "september", "oktober", "november", "desember"]
_akhir = [0.0]


def ambil(url):
    t = _akhir[0] + JEDA - time.time()
    if t > 0:
        time.sleep(t)
    try:
        return unduh(url)
    finally:
        _akhir[0] = time.time()


def num(v):
    try:
        return None if v in (None, "") else float(str(v).replace(",", "."))
    except ValueError:
        return None


def ym(s):
    """'2026-09' atau 'September 2026' -> '2026-09'; lain -> None."""
    s = (s or "").strip().lower()
    m = re.fullmatch(r"(\d{4})-(\d{2})", s)
    if m:
        return s
    m = re.fullmatch(r"([a-z]+) (\d{4})", s)
    return f"{m.group(2)}-{BULAN.index(m.group(1)) + 1:02d}" if m and m.group(1) in BULAN else None


def tertinggal(bulan, kini):
    a, b = ym(bulan), ym(kini)
    return (int(b[:4]) - int(a[:4])) * 12 + int(b[5:]) - int(a[5:]) if a and b else None


def _daftar(vals, kunci):
    return next((v for v in vals if isinstance(v, list) and v and isinstance(v[0], dict) and kunci in v[0]), [])


def _dict(vals, kunci):
    return next((v for v in vals if isinstance(v, dict) and kunci in v), None)


def kartu_spm(h):
    """{id: kategori} dari kartu HTML: baris 'nama', 'Bulan • SPM', nilai, kategori."""
    b = _html.unescape(re.sub(r"<[^>]+>", "\n", re.sub(r"<(script|style)\b.*?</\1>", "", h, flags=re.S)))
    l = [x.strip() for x in b.split("\n") if x.strip()]
    return {l[i - 1]: l[i + 2] for i in range(1, len(l) - 2) if re.fullmatch(r"[A-Za-z]+ \d{4} • SPM", l[i])}


def urai_spm(vals, h=""):
    d, kat = _daftar(vals, "SPM"), kartu_spm(h)
    bul = sorted({x.get("bulan") for x in d if x.get("bulan")})
    return {"bulan": bul[-1] if bul else None, "satuan": None,
            "stasiun": [{"id": x["id"], "bulan": x.get("bulan"), "spm": num(x.get("SPM")), "kategori": kat.get(x["id"]), "lat": num(x.get("lat")), "lon": num(x.get("lon"))} for x in d]}


def urai_ozon(vals):
    d = _daftar(vals, "lokasi")
    arsip = _daftar(vals, "file")
    return {"bulan": d[0].get("bulan") if d else None, "satuan": None,
            "stasiun": [{"lokasi": x["lokasi"], "harian": [{"tgl": r.get("date"), "rata": num(r.get("mean")), "maks": num(r.get("max")), "min": num(r.get("min"))} for r in x.get("data", [])]} for x in d],
            "arsip_bulan": [a["file"] for a in arsip]}


def urai_gas(vals, kunci):
    o = _dict(vals, "waktu")
    if not o:
        return {"waktu": None, "satuan": None, "stasiun": []}
    return {"waktu": o.get("waktu"), "satuan": o.get("satuan"),
            "stasiun": [{"stasiun": x.get("STASIUN"), "lokasi": x.get("LOKASI"), "lat": num(x.get("LINTANG")), "lon": num(x.get("BUJUR")), "nilai": num(x.get(kunci)), "nab": num(x.get("NAB"))} for x in o.get("data", [])]}


def main():
    ar = baca(ARSIP, {}) or {}
    log, gagal, kini, out = [], [], dt.datetime.now(WIB).strftime("%Y-%m"), {}

    def kunjung(nama, url, fn):
        c = {"url": url}
        try:
            r = fn(ambil(url))
            c["status"] = "ok"
            c["n_stasiun"] = len(r["stasiun"])
            out[nama] = r
        except Exception as x:
            c["status"] = f"gagal: {type(x).__name__} {x}"
            gagal.append(url)
        log.append(c)

    kunjung("spm", f"{W}/spm", lambda h: urai_spm(nuxt_semua(h), h))
    kunjung("ozon", f"{W}/ozon", lambda h: urai_ozon(nuxt_semua(h)))
    kunjung("so2", f"{W}/so2", lambda h: urai_gas(nuxt_semua(h), "SO2"))
    kunjung("no2", f"{W}/no2", lambda h: urai_gas(nuxt_semua(h), "NO2"))
    kunjung("kimia_air_hujan", f"{W}/kimia-air-hujan", lambda h: urai_gas(nuxt_semua(h), "PHjml"))
    if not out:
        raise RuntimeError("tak satu halaman pun berhasil: berkas lama dibiarkan")
    for nama, r in out.items():  # arsip per bulan, tidak pernah ditimpa
        b = ym(r.get("bulan") or r.get("waktu"))
        if b:
            ar.setdefault(nama, {}).setdefault(b, r | {"diambil": sekarang()})
        r["tertinggal_bulan"] = tertinggal(b, kini)
    if "ozon" in out:  # bulan arsip ozon yang belum disimpan
        for b in out["ozon"]["arsip_bulan"]:
            if b in ar.get("ozon", {}):
                continue
            try:
                o = urai_ozon(nuxt_semua(ambil(f"{W}/ozon/{b}")))
                assert o["stasiun"], "stasiun kosong"
                ar.setdefault("ozon", {})[b] = o | {"diambil": sekarang()}
                log.append({"url": f"{W}/ozon/{b}", "status": "ok", "n_stasiun": len(o["stasiun"])})
            except Exception as x:
                log.append({"url": f"{W}/ozon/{b}", "status": f"gagal: {type(x).__name__} {x}"})
                gagal.append(f"{W}/ozon/{b}")
    simpan(ARSIP, ar)
    simpan(BERKAS, {"dibuat": sekarang(), "sumber": "BMKG kualitas-udara (www.bmkg.go.id)", "catatan": "data bulanan untuk kajian, bukan siaga; tertinggal_bulan = jarak ke bulan WIB sekarang",
                    "halaman": log, "gagal": gagal, **out})
    print(f"kualitas_bmkg: {len(out)}/5 halaman ok, gagal {len(gagal)}, arsip " + ", ".join(f"{k}={len(v)}" for k, v in ar.items()), file=sys.stderr)


def uji():
    fx = json.load(open(os.path.join(AKAR, "scripts/cuaca/fixture/kualitas_nuxt.json")))
    s = urai_spm(fx["spm"], fx["spm_html"])
    assert s["bulan"] == "2026-09" and s["stasiun"][0]["id"] == "Bawil 1" and s["stasiun"][0]["spm"] == 45.92 and s["stasiun"][0]["lat"] == 3.53945, s["stasiun"][0]
    assert any(x["kategori"] for x in s["stasiun"]) or fx["spm_html"] == ""
    o = urai_ozon(fx["ozon"])
    assert o["stasiun"][0]["lokasi"] == "Kemayoran" and o["stasiun"][0]["harian"][0] == {"tgl": "2026-09-01", "rata": 7.987, "maks": 19.813, "min": 2.465}, o["stasiun"][0]["harian"][0]
    assert o["arsip_bulan"][-1] == "2026-09" and "2025-11" in o["arsip_bulan"]
    g = urai_gas(fx["so2"], "SO2")
    assert g["waktu"] == "2026-10" and g["satuan"] == "ppm" and g["stasiun"][0] == {"stasiun": "Ancol", "lokasi": "DKI Jakarta", "lat": -6.12555, "lon": 106.84643, "nilai": 0.015, "nab": 0.14}, g["stasiun"][0]
    k = urai_gas(fx["kimia"], "PHjml")
    assert k["stasiun"][0]["nilai"] == 4.3 and k["stasiun"][0]["nab"] == 5.6 and k["satuan"] == "asam/basa"
    assert urai_gas([], "NO2")["stasiun"] == [] and num("x") is None and num("1,5") == 1.5
    assert ym("September 2026") == "2026-09" and ym("2026-10") == "2026-10" and ym("zzz") is None
    assert tertinggal("September 2026", "2026-11") == 2 and tertinggal("2026-10", "2026-11") == 1 and tertinggal(None, "2026-11") is None
    print("uji kualitas_bmkg ok")


if __name__ == "__main__":
    uji() if sys.argv[1:] == ["uji"] else main()
