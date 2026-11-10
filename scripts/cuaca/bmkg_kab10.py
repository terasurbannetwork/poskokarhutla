"""Prakiraan 10 hari BMKG per kab/kota -> public/banjir/data/cuaca_bmkg_kab10.json.

Sumber: https://www.bmkg.go.id/cuaca/prakiraan-cuaca/{adm1} (38 provinsi, daftar kode dari halaman induk). Halaman Nuxt membawa
<script id="__NUXT_DATA__"> (devalue: array datar, nilai merujuk indeks) berisi {status, lokasi, data:[{lokasi, cuaca:[10 baris]}]}.
Kode adm2 dipakai apa adanya dari BMKG (Papua Barat Daya di halaman ini 96.01..96.05 + 96.71, beda dari api adm4 di bmkg_prakiraan.py).
local_datetime BMKG tiap hari jamnya berganti (17:00, 01:00, 10:00): disimpan mentah di `waktu`, `tgl` = 10 karakter awalnya. Zona tidak ditebak.
Provinsi gagal: baris lamanya dibiarkan, kodenya masuk `gagal`. Jeda 2 detik per halaman.
Pakai: python3 scripts/cuaca/bmkg_kab10.py | ... uji
"""
import datetime as dt, json, os, re, sys, time, urllib.request

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from dasar import KELUAR, WIB, baca, simpan

BASIS = "https://www.bmkg.go.id/cuaca/prakiraan-cuaca"
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"
JEDA = 2.0
BERKAS = os.path.join(KELUAR, "cuaca_bmkg_kab10.json")


def unduh(url):
    for coba in range(2):  # halaman Papua kadang lambat: satu ulang sesudah jeda
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": UA}), timeout=60) as r:
                return r.read().decode("utf-8", "replace")
        except OSError:
            if coba:
                raise
            time.sleep(JEDA * 2)


def kode_provinsi(html):
    return sorted(set(re.findall(r'prakiraan-cuaca/(\d\d)["/?#]', html)))


def nuxt_semua(html):
    """Urai __NUXT_DATA__ (devalue): muatan `data` {kunci: nilai} -> daftar nilai (artikel, daftar, objek halaman)."""
    m = re.search(r'id="__NUXT_DATA__"[^>]*>(.*?)</script>', html, re.S)
    a = json.loads(m.group(1))

    def r(i):
        x = a[i]
        if isinstance(x, list):
            if x and x[0] in ("ShallowReactive", "Reactive", "Ref", "ShallowRef"):
                return r(x[1])
            return [r(j) for j in x]
        if isinstance(x, dict):
            return {k: r(v) for k, v in x.items()}
        return x
    return list(r(a[1]["data"]).values())


def nuxt(html):
    """Objek halaman provinsi {status, lokasi, data}."""
    for v in nuxt_semua(html):
        if isinstance(v, dict) and {"status", "lokasi", "data"} <= set(v):
            return v
    raise ValueError("objek data tak ditemukan di __NUXT_DATA__")


def num(v):
    try:
        return None if v is None or v == "" else float(v) if "." in str(v) else int(v)
    except ValueError:
        return None


def olah(o, adm1):
    """-> {kode_adm2: {nama, hari:[...]}}; baris tanpa weather_desc atau tanggal dibuang."""
    assert o.get("status") == 200 and o["data"], f"status {o.get('status')} data kosong"
    out = {}
    for d in o["data"]:
        k = d["lokasi"]["adm2"]
        assert k.startswith(adm1 + "."), f"adm2 {k} di luar provinsi {adm1}"
        hari = [{"tgl": c["local_datetime"][:10], "waktu": c["local_datetime"], "kondisi": c["weather_desc"],
                 "tmin": num(c.get("tmin")), "tmax": num(c.get("tmax")), "humin": num(c.get("humin")), "humax": num(c.get("humax"))}
                for c in d["cuaca"] if c.get("weather_desc") and c.get("local_datetime")]
        if hari:
            out[k] = {"nama": d["lokasi"]["kotkab"], "prov": adm1, "zona": d["lokasi"].get("time_zone"),
                      "dianalisis": d["cuaca"][0].get("analysis_local_datetime"), "hari": hari}
    return out


def main():
    sekarang = dt.datetime.now(WIB).isoformat(timespec="minutes")
    lama = baca(BERKAS, {}) or {}
    kab, gagal = dict(lama.get("kab", {})), []
    kode = kode_provinsi(unduh(BASIS))
    if len(kode) < 30:
        raise RuntimeError(f"daftar provinsi aneh ({len(kode)}): berkas lama dibiarkan")
    ok = 0
    for adm1 in kode:
        time.sleep(JEDA)
        try:
            baru = olah(nuxt(unduh(f"{BASIS}/{adm1}")), adm1)
            for k in [k for k, v in kab.items() if v["prov"] == adm1]:
                del kab[k]
            for k, v in baru.items():
                v["diambil"] = sekarang
            kab.update(baru)
            ok += 1
        except Exception as x:
            gagal.append(adm1)
            print(f"bmkg_kab10 {adm1}: {type(x).__name__} {x}", file=sys.stderr)
    if not ok:
        raise RuntimeError("tak satu provinsi pun berhasil: berkas lama dibiarkan")
    simpan(BERKAS, {"dibuat": sekarang, "sumber": "BMKG prakiraan-cuaca (www.bmkg.go.id)", "n_prov_ok": ok, "gagal": gagal, "n_kab": len(kab), "kab": kab})
    print(f"bmkg_kab10: {ok} provinsi ok, gagal {gagal}, {len(kab)} kab/kota", file=sys.stderr)


def uji():
    # potongan nyata (DKI Jakarta, 2 hari dipangkas) dalam bentuk devalue
    a = [["ShallowReactive", 1], {"data": 2}, ["ShallowReactive", 3], {"k": 4}, {"status": 5, "lokasi": 6, "data": 7}, 200,
         {"adm1": 23, "provinsi": 24}, [8], {"lokasi": 9, "cuaca": 12}, {"adm1": 23, "adm2": 25, "kotkab": 10, "time_zone": 26},
         "Administrasi Kepulauan Seribu", "x", [13, 14], {"weather_desc": 15, "local_datetime": 16, "analysis_local_datetime": 17, "tmin": 18, "tmax": 19, "humin": 20, "humax": 21},
         {"weather_desc": 15, "local_datetime": 22, "analysis_local_datetime": 17, "tmin": 18, "tmax": 19, "humin": 20, "humax": 27},
         "Berawan", "2026-11-10T17:00:00", "2026-11-10T07:00:00", 29, 32, 73, 75, "2026-11-11T01:00:00", "31", "DKI Jakarta", "31.01", "WIB", None]
    html = '<a href="/cuaca/prakiraan-cuaca/31">x</a><a href="/cuaca/prakiraan-cuaca/32/">y</a><a href="/cuaca/prakiraan-cuaca/baru">z</a>' + \
           '<script id="__NUXT_DATA__" type="application/json">' + json.dumps(a) + "</script>"
    assert kode_provinsi(html) == ["31", "32"]
    k = olah(nuxt(html), "31")
    h = k["31.01"]["hari"]
    assert k["31.01"]["nama"] == "Administrasi Kepulauan Seribu" and len(h) == 2
    assert h[0] == {"tgl": "2026-11-10", "waktu": "2026-11-10T17:00:00", "kondisi": "Berawan", "tmin": 29, "tmax": 32, "humin": 73, "humax": 75}
    assert h[1]["humax"] is None and k["31.01"]["dianalisis"] == "2026-11-10T07:00:00"
    try:
        olah(nuxt(html), "32")
        assert False
    except AssertionError as x:
        assert "di luar provinsi" in str(x)
    print("uji bmkg_kab10 ok")


if __name__ == "__main__":
    uji() if sys.argv[1:] == ["uji"] else main()
