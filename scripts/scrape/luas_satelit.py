"""Luas terbakar satelit per provinsi 2002-kini, independen dari hotspot.

Sumber: GWIS (EU JRC / Copernicus) Country Profile, burned area MODIS MCD64A1 C6.1
diagregasi ke batas GADM 3.6 level-1 (33 provinsi pra-pemekaran). Endpoint yang
dipanggil aplikasi gwis.jrc.ec.europa.eu/apps/country.profile:
  cprof.effis.emergency.copernicus.eu/api/v3/banf?level=ADM1&value=IDN.n_1
Angka yang dipakai = `lc_tot` (jumlah ha semua kelas tutupan lahan = angka utama
halaman), bukan `ba_area_ha` (cuma kejadian GlobFire di atas ambang ukuran).

Pembanding resmi: SiPongi KLHK/Kemenhut rekap indikasi luas per provinsi 2015-kini
  opsroom.sipongidata.my.id/api/list/luas-kebakaran/provinsi
disimpan mentah saja (data/raw/luas_satelit/sipongi_provinsi.json).

Batas GADM 3.6: Kaltim termasuk Kaltara (kunci "64" = 64+65, Kaltara ~5-10% resminya), Papua = 91+93+94+95,
Papua Barat = 92+96. Papua Selatan (93) TIDAK bisa dipisah: API tak punya ADM2.
"""
import json
import os
import urllib.request

AKAR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
RAW = os.path.join(AKAR, "data/raw/luas_satelit")
OUT = os.path.join(AKAR, "public/data/luas_satelit.json")
API = "https://cprof.effis.emergency.copernicus.eu/api/v3"
SIPONGI = "https://opsroom.sipongidata.my.id/api/list/luas-kebakaran/provinsi?tahunAwal=2015&tahunAkhir=2026"
TAHUN = list(range(2002, 2026))

# nama GADM 3.6 -> kode Kemendagri (kode gabungan ditulis "64+65" dst.)
GADM = {
    "Aceh": "11", "Bali": "51", "Bangka Belitung": "19", "Banten": "36", "Bengkulu": "17",
    "Gorontalo": "75", "Jakarta Raya": "31", "Jambi": "15", "Jawa Barat": "32", "Jawa Tengah": "33",
    "Jawa Timur": "35", "Kalimantan Barat": "61", "Kalimantan Selatan": "63", "Kalimantan Tengah": "62",
    "Kalimantan Timur": "64", "Kepulauan Riau": "21", "Lampung": "18", "Maluku": "81",
    "Maluku Utara": "82", "Nusa Tenggara Barat": "52", "Nusa Tenggara Timur": "53",
    "Papua": "91+93+94+95", "Papua Barat": "92+96", "Riau": "14", "Sulawesi Barat": "76",
    "Sulawesi Selatan": "73", "Sulawesi Tengah": "72", "Sulawesi Tenggara": "74",
    "Sulawesi Utara": "71", "Sumatera Barat": "13", "Sumatera Selatan": "16",
    "Sumatera Utara": "12", "Yogyakarta": "34",
}


def ambil(url):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    return json.load(urllib.request.urlopen(req, timeout=120))


def main():
    os.makedirs(RAW, exist_ok=True)
    sub = ambil(f"{API}/subcountries?admin0=IDN&env=PROD")
    ha, bulanan, unmapped = {}, {}, {}
    for s in sub:
        kode = GADM[s["name"]]  # KeyError = GADM berubah, sengaja dibiarkan meledak
        p = os.path.join(RAW, f"gwis_{s['admin1']}.json")
        if not os.path.exists(p):
            d = ambil(f"{API}/banf?level=ADM1&value={s['admin1']}&year=2025&yearFrom=2002&yearTo=2025&env=PROD")
            d = {k: d[k] for k in ("banfyear", "banfmonth")}
            json.dump(d, open(p, "w"))
        d = json.load(open(p))
        th = {r["year"]: r for r in d["banfyear"]}
        assert sorted(th) == TAHUN, (s["name"], sorted(th))
        ha[kode] = [round(th[t]["lc_tot"]) for t in TAHUN]
        unmapped[kode] = [round(th[t]["unmapped"], 1) for t in TAHUN]
        bl = {(m["year"], m["month"]): m["lc_tot"] for m in d["banfmonth"]}
        bulanan[kode] = [round(bl.get((t, b), 0)) for t in TAHUN for b in range(1, 13)]
        # bulanan harus menjumlah ke tahunan (toleransi pembulatan)
        assert abs(sum(bulanan[kode]) - sum(ha[kode])) <= 24 * 13, s["name"]

    sp = os.path.join(RAW, "sipongi_provinsi.json")
    if not os.path.exists(sp):
        json.dump(ambil(SIPONGI), open(sp, "w"))

    json.dump({
        "sumber": "GWIS Country Profile (EU JRC/Copernicus), MODIS MCD64A1 C6.1 per GADM 3.6 ADM1, kolom lc_tot; "
                  "CC BY 4.0 (Keputusan Komisi 2011/833/EU). 64 termasuk Kaltara (65), 91+93+94+95=Papua lama, 92+96=Papua Barat lama; "
                  "93 tak terpisahkan. 2025 belum final (Des=0).",
        "tahun": [str(t) for t in TAHUN],
        "ha": ha,
        "bulanan": bulanan,
        "unmapped_persen": unmapped,
    }, open(OUT, "w"), separators=(",", ":"))
    print(OUT, len(ha), "provinsi")


if __name__ == "__main__":
    main()
