"""Luas terbakar satelit per provinsi 2002-kini, independen dari hotspot.

Sumber: GWIS (EU JRC / Copernicus) Country Profile, burned area MODIS MCD64A1 C6.1
diagregasi ke batas GADM 3.6 level-1 (33 provinsi pra-pemekaran). Endpoint yang
dipanggil aplikasi gwis.jrc.ec.europa.eu/apps/country.profile:
  cprof.effis.emergency.copernicus.eu/api/v3/banf?level=ADM1&value=IDN.n_1
Angka yang dipakai = `lc_tot` (jumlah ha semua kelas tutupan lahan = angka utama
halaman), bukan `ba_area_ha` (cuma kejadian GlobFire di atas ambang ukuran).

Pembanding resmi (`python3 luas_satelit.py resmi`; tanpa argumen = GWIS; `uji` = self-check): SiPongi KLHK/Kemenhut rekap indikasi luas per provinsi 2015-kini
  opsroom.sipongidata.my.id/api/list/luas-kebakaran/provinsi
dipakai juga untuk public/data/luas_resmi.json (2018-kini; tahun berjalan s/d bulan "last").
GWIS bisa tertinggal setahun (Mei 2026: belum ada 2026, Des 2025 masih 0); `sampai` di
keluaran = bulan terakhir tahun terakhir dengan angka nasional > 0, bukan klaim GWIS.

Batas GADM 3.6: Kaltim termasuk Kaltara (kunci "64" = 64+65, Kaltara ~5-10% resminya), Papua = 91+93+94+95,
Papua Barat = 92+96. Papua Selatan (93) TIDAK bisa dipisah: API tak punya ADM2.
"""
import json
import os
import sys
import time
import urllib.request

AKAR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT = os.path.join(AKAR, "public/data/luas_satelit.json")
OUT_RESMI = os.path.join(AKAR, "public/data/luas_resmi.json")
API = "https://cprof.effis.emergency.copernicus.eu/api/v3"
SIPONGI = "https://opsroom.sipongidata.my.id/api/list/luas-kebakaran/provinsi?tahunAwal=2015&tahunAkhir=" + str(time.gmtime().tm_year)
TAHUN_AKHIR = time.gmtime().tm_year  # GWIS hanya mengembalikan tahun yang sudah ada; tahun kosong dibuang
BULAN = ["januari", "februari", "maret", "april", "mei", "juni", "juli", "agustus", "september", "oktober", "november", "desember"]

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
    with urllib.request.urlopen(req, timeout=120) as r:
        isi = r.read(50_000_001)
    if len(isi) > 50_000_000:
        raise RuntimeError(f"{url[:80]}: respons melebihi 50 MB")
    return json.loads(isi)


def angka_id(s):
    return float(str(s).replace(".", "").replace(",", "."))


def sampai_gwis(tahun, bulanan):
    """Bulan terakhir (YYYY-MM) tahun terakhir yang jumlah nasionalnya > 0."""
    n = len(tahun)
    tot = [sum(v[(n - 1) * 12 + b] for v in bulanan.values()) for b in range(12)]
    ada = [b for b in range(12) if tot[b] > 0]
    return {tahun[-1]: f"{tahun[-1]}-{ada[-1] + 1:02d}"} if ada else {}


def gwis():
    sub = ambil(f"{API}/subcountries?admin0=IDN&env=PROD")
    rows, tahun = {}, set()
    for s in sub:
        kode = GADM[s["name"]]  # KeyError = GADM berubah, sengaja dibiarkan meledak
        d = ambil(f"{API}/banf?level=ADM1&value={s['admin1']}&year={TAHUN_AKHIR}&yearFrom=2002&yearTo={TAHUN_AKHIR}&env=PROD")
        rows[kode] = d
        tahun |= {r["year"] for r in d["banfyear"]}
    TAHUN = list(range(2002, max(tahun) + 1))
    ha, bulanan, unmapped = {}, {}, {}
    for kode, d in rows.items():
        th = {r["year"]: r for r in d["banfyear"]}
        assert sorted(th) == TAHUN, (kode, sorted(th))
        ha[kode] = [round(th[t]["lc_tot"]) for t in TAHUN]
        unmapped[kode] = [round(th[t]["unmapped"], 1) for t in TAHUN]
        bl = {(m["year"], m["month"]): m["lc_tot"] for m in d["banfmonth"]}
        bulanan[kode] = [round(bl.get((t, b), 0)) for t in TAHUN for b in range(1, 13)]
        # bulanan harus menjumlah ke tahunan (toleransi pembulatan)
        assert abs(sum(bulanan[kode]) - sum(ha[kode])) <= len(TAHUN) * 13, kode
    tahun = [str(t) for t in TAHUN]
    sampai = sampai_gwis(tahun, bulanan)
    json.dump({
        "sumber": "GWIS Country Profile (EU JRC/Copernicus), MODIS MCD64A1 C6.1 per GADM 3.6 ADM1, kolom lc_tot; "
                  "CC BY 4.0 (Keputusan Komisi 2011/833/EU). 64 termasuk Kaltara (65), 91+93+94+95=Papua lama, 92+96=Papua Barat lama; "
                  f"93 tak terpisahkan. Tahun {tahun[-1]} terisi s/d {sampai.get(tahun[-1], '?')}; bulan sesudahnya 0 karena belum diproses GWIS, bukan nihil kebakaran. "
                  "Tahun berjalan menyusul bila GWIS sudah merilisnya.",
        "tahun": tahun,
        "sampai": sampai,
        "ha": ha,
        "bulanan": bulanan,
        "unmapped_persen": unmapped,
    }, open(OUT, "w"), separators=(",", ":"))
    print(OUT, len(ha), "provinsi, tahun", tahun[0], "-", tahun[-1], sampai)


def parse_last(s):
    """'Juli 2026' -> ('2026', '2026-07')."""
    b, t = s.strip().lower().split()
    return t, f"{t}-{BULAN.index(b) + 1:02d}"


def resmi_dari(sp, awal=2018):
    """Respons SiPongi -> isi luas_resmi.json (tahun string, ha per kode Kemendagri)."""
    tahun = [str(t) for t in range(awal, int(sp["tahun"][-1]) + 1)]
    ha = {}
    for p in sp["data"]:
        m = {str(x["tahun"]): angka_id(x["luas"]) for x in p["data_luas"] if "luas" in x}
        ha[p["id_mendagri"]] = [m[t] for t in tahun]  # KeyError = tahun hilang, jangan karang angka
    th, bln = parse_last(sp["last"])
    return {
        "sumber": "KLHK SiPongi Indikasi Luas Kebakaran per provinsi (opsroom.sipongidata.my.id/api/list/luas-kebakaran/provinsi); "
                  f"indikasi dari titik panas + verifikasi, bukan citra. {th} baru s/d {bln}. "
                  "2018-2023 identik dengan kutipan Tulisan Hukum JDIH BPK 2024.",
        "tahun": tahun,
        "sampai": {th: bln},
        "ha": ha,
    }


def resmi():
    sp = ambil(SIPONGI)
    tot = sum(angka_id(r["total"]) for r in sp["total"] if str(r["tahun"]) == str(sp["tahun"][-1]))
    out = resmi_dari(sp)
    assert abs(sum(v[-1] for v in out["ha"].values()) - tot) < 1, "jumlah provinsi != total nasional SiPongi"
    json.dump(out, open(OUT_RESMI, "w"), separators=(", ", ": "))
    print(OUT_RESMI, len(out["ha"]), "provinsi", out["tahun"][0], "-", out["tahun"][-1], out["sampai"])


def uji():
    assert parse_last("Juli 2026") == ("2026", "2026-07")
    sp = {"tahun": ["2024", 2025, 2026], "last": "Juli 2026", "data": [
        {"id_mendagri": "11", "data_luas": [{"tahun": "2024", "luas": "7.257,35"}, {"tahun": 2025, "luas": "8,50"}, {"tahun": 2026, "luas": "1.000,00"}]}]}
    r = resmi_dari(sp, 2024)
    assert r["tahun"] == ["2024", "2025", "2026"] and r["ha"]["11"] == [7257.35, 8.5, 1000.0], r
    assert r["sampai"] == {"2026": "2026-07"}
    b = {"11": [0] * 12 + [0, 5, 0] + [0] * 9}  # tahun terakhir: hanya Feb
    assert sampai_gwis(["2024", "2025"], b) == {"2025": "2025-02"}
    assert sampai_gwis(["2025"], {"11": [0] * 12}) == {}
    print("uji luas_satelit OK")


if __name__ == "__main__":
    {"uji": uji, "resmi": resmi}.get(sys.argv[1] if len(sys.argv) > 1 else "", gwis)()
