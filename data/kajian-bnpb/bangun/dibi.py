#!/usr/bin/env python3
"""Paket `dibi`: rekap kejadian bencana untuk dua kajian Kepala BNPB (Grand Design air Jawa dan mitigasi nasional).

Jalankan dari akar repo:
  python3 data/kajian-bnpb/bangun/dibi.py tarik   # tarik ulang DIBI + CKAN ke data/kajian-bnpb/data/dibi/mentah/, lalu bangun
  python3 data/kajian-bnpb/bangun/dibi.py         # bangun dari mentah yang tersimpan (luring) + self-check assert
Python 3 stdlib saja. Silsilah, definisi, dan keterbatasan: data/kajian-bnpb/data/dibi/README.md.

Masukan:
  dibi.bnpb.go.id  Superset dasbor publik 1, tabel pdsi_staging.mv_dibi_dampak_by_kejadian (tamu, tanpa token)
                   -> mentah/dibi_{nasional,prov,kab_jawa,peristiwa}.json + mentah/dibi_dasbor.json
  data.bnpb.go.id  CKAN "Kompilasi Data Kejadian dan Dampak Bencana" 2010-2024 -> mentah/ckan_*.json
  data/kajian-bnpb/riset/mentah/dibi_tahun.json   tarik riset pagi 23 Okt 2026 (pembanding: total harus sama)
  data/kajian-bnpb/bangun/dibi_rujukan.json       angka pustaka (Renstra, USGS, Buletin BNPB, berita), disalin tangan + URL
  public/geo/kabupaten/3[1-6].json                119 nama kab/kota Jawa (properti `kab`)
  public/data/luas_resmi.json                     luas karhutla SiPongi KLHK per provinsi 2018-2026
  public/gempa/data/factsheet_gempa.json          korban gempa besar USGS/BNPB (dicocokkan 19 Okt 2026)
Kueri DIBI dan pencocok nama kab dipakai ulang dari scripts/banjir/kejadian.py (pipeline banjir).
"""
import csv, datetime as dt, json, os, sys, time
from collections import defaultdict

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", ".."))
P = lambda *a: os.path.join(ROOT, *a)
sys.path.insert(0, P("scripts/banjir"))
from kejadian import superset, kunci_nama, DIBI   # noqa: E402  kueri Superset DIBI yang sama dengan pipeline banjir
from umum import ambil, simpan, WIB              # noqa: E402

OUT = P("data/kajian-bnpb/data/dibi")
MENTAH = os.path.join(OUT, "mentah")
RUJUKAN = P("data/kajian-bnpb/bangun/dibi_rujukan.json")
RISET_TAHUN = P("data/kajian-bnpb/riset/mentah/dibi_tahun.json")
CKAN = "https://data.bnpb.go.id/api/3/action/"
DASBOR = "https://dibi.bnpb.go.id/api/v1/dashboard/1"
LAB_R, LAB_T, LAB_E, LAB_A, LAB_S = "resmi", "terverifikasi", "estimasi-model", "asumsi-kebijakan", "sekunder"
LABEL = {LAB_R, LAB_T, LAB_E, LAB_A, LAB_S}

# Kolom angka tabel DIBI yang dijumlah. jumlah_kejadian pecahan: satu kejadian lintas k kab tercatat 1/k per kab
# (Juklak BNPB 7/2023 hlm. 7 butir 4b), jadi jumlah nasional = jumlah kejadian, bukan jumlah baris.
M = ["jumlah_kejadian", "meninggal", "hilang", "luka_sakit", "menderita", "mengungsi", "menderita_mengungsi",
     "rumah_rusak_berat", "rumah_rusak_sedang", "rumah_rusak_ringan", "rumah_rusak", "rumah_terendam",
     "pendidikan_rusak", "rumah_ibadat_rusak", "fasyankes_rusak", "fasum_rusak", "kantor_rusak", "jembatan_rusak",
     "estimasi_kerugian_rumah"]
JAWA = [31, 32, 33, 34, 35, 36]
PROV_KODE = ["11", "12", "13", "14", "15", "16", "17", "18", "19", "21", "31", "32", "33", "34", "35", "36", "51", "52", "53",
             "61", "62", "63", "64", "65", "71", "72", "73", "74", "75", "76", "81", "82", "91", "92", "93", "94", "95", "96"]
PULAU = {"Sumatra": PROV_KODE[:10], "Jawa": PROV_KODE[10:16], "Bali–Nusa Tenggara": PROV_KODE[16:19],
         "Kalimantan": PROV_KODE[19:24], "Sulawesi": PROV_KODE[24:30], "Maluku": PROV_KODE[30:32], "Papua": PROV_KODE[32:]}
PULAU_PROV = {p: k for k, ps in PULAU.items() for p in ps}

# Kejadian besar. DIBI mulai 2008; sebelum itu hanya versi pustaka (dibi_rujukan.json).
# (kode, nama, tanggal mulai, jendela DIBI [awal, akhir] atau None, kategori_bencana DIBI, kode prov BPS, kab (kunci_nama) atau None)
# Jendela dan cakupan wilayah = pilihan penyusun (label asumsi-kebijakan di kejadian_besar.csv).
PERISTIWA = [
    ("aceh2004", "Gempa dan tsunami Aceh–Sumatera Utara", "2004-12-26", None, [], [], None),
    ("nias2005", "Gempa Nias–Simeulue", "2005-03-28", None, [], [], None),
    ("yogya2006", "Gempa Yogyakarta–Jawa Tengah", "2006-05-27", None, [], [], None),
    ("padang2009", "Gempa Sumatera Barat (Padang Pariaman)", "2009-09-30", ("2009-09-30", "2009-10-31"), ["Gempabumi"], [13], None),
    ("wasior2010", "Banjir bandang Wasior (Teluk Wondama)", "2010-10-04", ("2010-10-04", "2010-10-31"), ["Banjir"], [91, 92], None),
    ("mentawai2010", "Gempa dan tsunami Mentawai", "2010-10-25", ("2010-10-25", "2010-11-30"), ["Tsunami", "Gempabumi"], [13], None),
    ("merapi2010", "Erupsi Merapi", "2010-10-26", ("2010-10-26", "2010-12-31"), ["Erupsi gunung api"], [33, 34], None),
    ("jakarta2013", "Banjir Jakarta Januari 2013", "2013-01-15", ("2013-01-15", "2013-01-31"), ["Banjir"], [31], None),
    ("karhutla2015", "Kebakaran hutan dan lahan 2015", "2015-01-01", ("2015-01-01", "2015-12-31"), ["Kebakaran hutan dan lahan"], [], None),
    ("pidiejaya2016", "Gempa Pidie Jaya", "2016-12-07", ("2016-12-07", "2016-12-31"), ["Gempabumi"], [11], None),
    ("lombok2018", "Gempa Lombok", "2018-07-29", ("2018-07-29", "2018-09-30"), ["Gempabumi"], [51, 52], None),
    ("sulteng2018", "Gempa, tsunami, dan likuefaksi Sulawesi Tengah", "2018-09-28", ("2018-09-28", "2018-10-31"), ["Gempabumi", "Tsunami"], [72], None),
    ("selatsunda2018", "Tsunami Selat Sunda", "2018-12-22", ("2018-12-22", "2018-12-31"), ["Tsunami"], [18, 36], None),
    ("karhutla2019", "Kebakaran hutan dan lahan 2019", "2019-01-01", ("2019-01-01", "2019-12-31"), ["Kebakaran hutan dan lahan"], [], None),
    ("wamena2019", "Kerusuhan Wamena", "2019-09-23", ("2019-09-23", "2019-10-31"), ["Konflik sosial"], [91, 94, 95], None),
    ("ambon2019", "Gempa Ambon–Maluku Tengah", "2019-09-26", ("2019-09-26", "2019-10-31"), ["Gempabumi"], [81], None),
    ("jabodetabek2020", "Banjir Jabodetabek awal 2020", "2020-01-01", ("2019-12-31", "2020-01-08"), ["Banjir"], [31, 32, 36],
     ["KOTA JAKARTABARAT", "KOTA JAKARTAPUSAT", "KOTA JAKARTASELATAN", "KOTA JAKARTATIMUR", "KOTA JAKARTAUTARA", "KEPULAUANSERIBU",
      "BOGOR", "KOTA BOGOR", "KOTA DEPOK", "BEKASI", "KOTA BEKASI", "TANGERANG", "KOTA TANGERANG", "KOTA TANGERANGSELATAN"]),
    ("sulbar2021", "Gempa Sulawesi Barat (Majene–Mamuju)", "2021-01-15", ("2021-01-14", "2021-01-31"), ["Gempabumi"], [76], None),
    ("seroja2021", "Siklon Tropis Seroja (NTT–NTB)", "2021-04-04", ("2021-04-03", "2021-04-30"), ["Banjir", "Longsor", "Cuaca ekstrem"], [52, 53], None),
    ("semeru2021", "Erupsi Semeru", "2021-12-04", ("2021-12-04", "2021-12-31"), ["Erupsi gunung api"], [35], None),
    ("cianjur2022", "Gempa Cianjur", "2022-11-21", ("2022-11-21", "2022-11-30"), ["Gempabumi"], [32], None),
    ("plumpang2023", "Kebakaran Depo Pertamina Plumpang", "2023-03-03", ("2023-03-03", "2023-03-10"), ["Gagal teknologi", "Kebakaran permukiman"], [31], None),
    ("serasan2023", "Tanah longsor Serasan (Natuna)", "2023-03-06", ("2023-03-06", "2023-03-31"), ["Longsor"], [21], None),
    ("karhutla2023", "Kebakaran hutan dan lahan 2023", "2023-01-01", ("2023-01-01", "2023-12-31"), ["Kebakaran hutan dan lahan"], [], None),
    ("demak2024", "Banjir Demak–Kudus 2024", "2024-02-05", ("2024-02-05", "2024-03-31"), ["Banjir"], [33], ["DEMAK", "KUDUS"]),
    ("lewotobi2024", "Erupsi Lewotobi Laki-laki November 2024", "2024-11-03", ("2024-11-03", "2024-11-30"), ["Erupsi gunung api"], [53], None),
    ("kerusuhan2025", "Kerusuhan akhir Agustus 2025", "2025-08-25", ("2025-08-25", "2025-09-05"), ["Konflik sosial"], [], None),
    ("sumatra2025", "Banjir dan longsor Sumatra (Aceh, Sumut, Sumbar)", "2025-11-25", ("2025-11-15", "2025-12-31"), ["Banjir", "Longsor"], [11, 12, 13], None),
    ("covid19", "Pandemi COVID-19", "2020-03-02", None, [], [], None),
]

# Seri nasional CKAN 2010-2024 per jenis (baris = 9 jenis alam, kolom = tahun). Meninggal membalas Not Found sejak riset.
CKAN_NAS = {"kejadian": "9b41007e-c998-456b-8cbc-385b17986e46", "meninggal": "b2fa5c46-9a07-4d30-a3bd-57e143e775f1",
            "hilang": "a19366cf-0ac4-45d1-bc6e-89a020ab45a1", "luka_sakit": "ce67795b-57e4-4c84-8c2a-3bf03828ff0d",
            "terdampak": "7f9e5218-bbba-4916-a2b8-13cf1764dc96", "mengungsi": "d7b61b56-43d5-4dcc-8d7b-45c993e1bdb0",
            "rumah_rusak": "27bbeb6b-6f86-4490-840a-c1bc6393102b"}
CKAN_PROV = "5dfcae7e-acb3-4548-82b5-61d876ea478a"   # Jumlah Kejadian Bencana Menurut Provinsi Tahun 2010-2024 (semua jenis)
CKAN_KE_DIBI = {"BANJIR": "Banjir", "CUACA EKSTREM": "Cuaca ekstrem", "ERUPSI GUNUNG API": "Erupsi gunung api",
                "GELOMBANG PASANG DAN ABRASI": "Gelombang pasang / Abrasi", "GEMPABUMI": "Gempabumi",
                "KEBAKARAN HUTAN DAN LAHAN": "Kebakaran hutan dan lahan", "KEKERINGAN": "Kekeringan",
                "TANAH LONGSOR": "Longsor", "TSUNAMI": "Tsunami"}


# --------------------------------------------------------------------------------------------- tarik (jaringan)

def kueri(kolom, saring):
    """SUM semua kolom M + COUNT(*) per kelompok `kolom`. DIBI kadang 521 beberapa menit: coba ulang 4x, jeda 90 dtk."""
    metrik = [(m, f"SUM({m})") for m in M] + [("n_baris", "COUNT(*)")]
    for i in range(4):
        try:
            rows = superset(kolom, metrik, saring)
            break
        except Exception as e:
            if i == 3:
                raise
            print(f"  DIBI gagal ({e}); coba lagi 90 dtk", file=sys.stderr)
            time.sleep(90)
    if len(rows) >= 50000:
        raise RuntimeError(f"DIBI {kolom}: batas 50.000 baris tercapai, data terpotong")
    return rows


def ckan_baris(rid):
    out, a = [], 0
    while True:
        r = ambil(f"{CKAN}datastore_search?resource_id={rid}&limit=1000&offset={a}")["result"]
        out += r["records"]
        a += 1000
        if a >= r.get("total", 0):
            return out


def tarik():
    kini = dt.datetime.now(WIB).isoformat(timespec="seconds")
    bungkus = lambda kolom, saring, data: {"ditarik": kini, "sumber": DIBI, "tabel": "pdsi_staging.mv_dibi_dampak_by_kejadian",
                                           "kolom": kolom, "saring": saring, "data": data}
    jenis = ["tahun", "id_tipe_bencana", "jenis_bencana", "kategori_bencana", "is_bencana"]
    k = ["bulan"] + jenis
    simpan(os.path.join(MENTAH, "dibi_nasional.json"), bungkus(k, [], kueri(k, [])))
    print("  nasional", file=sys.stderr)
    k = ["id_provinsi_bps", "provinsi"] + jenis
    simpan(os.path.join(MENTAH, "dibi_prov.json"), bungkus(k, [], kueri(k, [])))
    print("  provinsi", file=sys.stderr)
    k = ["id_provinsi_bps", "provinsi", "id_kab_bps", "kabupaten"] + jenis
    s = [{"col": "id_provinsi_bps", "op": "IN", "val": JAWA}]
    simpan(os.path.join(MENTAH, "dibi_kab_jawa.json"), bungkus(k, s, kueri(k, s)))
    print("  kab Jawa", file=sys.stderr)
    per = {}
    k = ["dt", "id_provinsi_bps", "provinsi", "id_kab_bps", "kabupaten", "jenis_bencana", "kategori_bencana", "is_bencana"]
    for kode, _, _, jendela, kat, prov, _ in PERISTIWA:
        if not jendela:
            continue
        th = sorted({int(jendela[0][:4]), int(jendela[1][:4])})
        s = [{"col": "tahun", "op": "IN", "val": th}, {"col": "kategori_bencana", "op": "IN", "val": kat}]
        if prov:
            s.append({"col": "id_provinsi_bps", "op": "IN", "val": prov})
        per[kode] = {"saring": s, "data": kueri(k, s)}
        print(f"  peristiwa {kode}: {len(per[kode]['data'])} baris", file=sys.stderr)
    simpan(os.path.join(MENTAH, "dibi_peristiwa.json"), {"ditarik": kini, "sumber": DIBI, "kolom": k, "peristiwa": per})
    try:   # metadata dasbor: bukti definisi grafik publik (filter, pengelompokan)
        simpan(os.path.join(MENTAH, "dibi_dasbor.json"), {"ditarik": kini, "dasbor": ambil(DASBOR), "grafik": ambil(DASBOR + "/charts")})
    except Exception as e:
        print(f"  metadata dasbor dilewati: {e}", file=sys.stderr)
    ck = {"ditarik": kini, "sumber": CKAN + "datastore_search", "paket": "data-bencana-indonesia", "seri": {}}
    for met, rid in list(CKAN_NAS.items()) + [("prov_kejadian", CKAN_PROV)]:
        try:
            ck["seri"][met] = {"resource_id": rid, "data": ckan_baris(rid)}
        except Exception as e:
            ck["seri"][met] = {"resource_id": rid, "galat": str(e)[:300]}
        print(f"  CKAN {met}: {'galat' if 'galat' in ck['seri'][met] else len(ck['seri'][met]['data'])}", file=sys.stderr)
    simpan(os.path.join(MENTAH, "ckan.json"), ck)


# --------------------------------------------------------------------------------------------- bangun (luring)

from kejadian import Pencocok          # noqa: E402  nama kab DIBI -> nama `kab` di public/geo/kabupaten
from wilayah import PROVINSI           # noqa: E402

KLAS = {1: "alam", 2: "nonalam", 3: "sosial", 9: "lainnya"}   # digit pertama kode jenis Juklak 7/2023 hlm. 6 dan 19
# id_tipe_bencana DIBI (kode Juklak x10 + subjenis) -> jenis hidrometeorologi untuk kajian air. Erupsi/lahar bukan hidromet.
HIDRO = {1010: "banjir", 1016: "banjir", 1012: "banjir_bandang", 1011: "banjir_rob", 1013: "banjir_dan_longsor",
         1020: "tanah_longsor", 1022: "tanah_longsor", 1030: "gelombang_abrasi", 1031: "gelombang_abrasi", 1032: "gelombang_abrasi",
         1040: "cuaca_ekstrem", 1041: "cuaca_ekstrem", 1042: "cuaca_ekstrem", 1043: "cuaca_ekstrem",
         1050: "kekeringan", 1053: "kekeringan", 1060: "karhutla", 1061: "karhutla", 1062: "karhutla", 1063: "karhutla"}
HIDRO_JENIS = ["banjir", "banjir_bandang", "banjir_rob", "banjir_dan_longsor", "tanah_longsor", "cuaca_ekstrem",
               "kekeringan", "gelombang_abrasi", "karhutla"]
PROV_ALIAS = {"Daerah Istimewa Yogyakarta": "34"}
# Kolom yang diterbitkan. menderita_mengungsi (= menderita + mengungsi, diperiksa) dan estimasi_kerugian_rumah (satuan tidak
# didokumentasikan DIBI) hanya ada di mentah.
KOL = ["kejadian", "meninggal", "hilang", "luka_sakit", "mengungsi", "menderita", "rumah_rusak_berat", "rumah_rusak_sedang",
       "rumah_rusak_ringan", "rumah_rusak", "rumah_terendam", "pendidikan_rusak", "rumah_ibadat_rusak", "fasyankes_rusak",
       "fasum_rusak", "kantor_rusak", "jembatan_rusak", "n_baris"]
CAKUPAN = ("bencana", "semua_laporan")
SUMBER_DIBI = "DIBI BNPB, dibi.bnpb.go.id dasbor publik 1 (pdsi_staging.mv_dibi_dampak_by_kejadian)"
FACTSHEET = {"2006-05-27": "yogya2006", "2009-09-30": "padang2009", "2010-10-25": "mentawai2010", "2018-08-05": "lombok2018",
             "2018-09-28": "sulteng2018", "2021-01-15": "sulbar2021"}
SATUAN = {"luas_ha": "ha", "kerugian_usd": "USD", "kasus_terkonfirmasi": "kasus", "kab_terdampak": "kab/kota", "baris_dibi": "baris"}
RUMAH = ("rumah_rusak_berat", "rumah_rusak_sedang", "rumah_rusak_ringan", "rumah_rusak", "rumah_terendam")


def baca(nama):
    return json.load(open(os.path.join(MENTAH, nama), encoding="utf-8"))


def angka(v):
    """Kejadian pecahan dibulatkan 2 desimal; bilangan bulat ditulis tanpa ,0."""
    v = round(float(v), 2)
    return int(v) if v.is_integer() else v


def kosong():
    return {k: 0 for k in KOL}


def tambah(wadah, r):
    for k in KOL:
        wadah[k] += r["jumlah_kejadian" if k == "kejadian" else k] or 0


def agregat(rows, kunci):
    """{(kunci..., cakupan): jumlah}. 'semua_laporan' = semua baris dasbor; 'bencana' = is_bencana (ambang Juklak 7/2023)."""
    out = defaultdict(kosong)
    for r in rows:
        k = kunci(r)
        tambah(out[k + ("semua_laporan",)], r)
        if r["is_bencana"]:
            tambah(out[k + ("bencana",)], r)
    return out


def kode_jenis(r):
    return r["id_tipe_bencana"] // 10


def prov_kode(nama, peta={kunci_nama(v): k for k, v in PROVINSI.items()}):
    return PROV_ALIAS.get(nama) or peta[kunci_nama(nama)]


def tulis(nama, kolom, baris):
    with open(os.path.join(OUT, nama + ".csv"), "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=kolom, lineterminator="\n")
        w.writeheader()
        w.writerows(baris)
    return baris


def tanggal(ms):
    return dt.datetime.fromtimestamp(ms / 1000, WIB).date().isoformat()


def rekap_nasional(nas):
    kat = {}
    for r in nas:
        kat.setdefault(r["kategori_bencana"], set()).add(kode_jenis(r))
    assert all(len(v) == 1 for v in kat.values()), f"kategori DIBI dengan >1 kode Juklak: {kat}"
    kat = {k: v.pop() for k, v in kat.items()}
    a = agregat(nas, lambda r: (r["tahun"], r["kategori_bencana"]))
    a.update(agregat(nas, lambda r: (r["tahun"], "SEMUA")))
    baris = []
    for (th, kg, ck), v in sorted(a.items(), key=lambda x: (x[0][0], x[0][1] == "SEMUA", x[0][1], x[0][2])):
        kj = kat.get(kg)
        baris.append({"tahun": th, "klasifikasi": KLAS[kj // 100] if kj else "semua", "kode_jenis_juklak": kj or "",
                      "kategori_dibi": kg, "cakupan": ck, **{k: angka(x) for k, x in v.items()},
                      "status_data": "sementara (tahun berjalan)" if th == dt.date.today().year else "final menurut jadwal DIBI",
                      "label": LAB_R, "sumber": SUMBER_DIBI})
    return baris, kat


def rekap_provinsi(prov, kat):
    a = agregat(prov, lambda r: (r["tahun"], prov_kode(r["provinsi"]), r["kategori_bencana"]))
    a.update(agregat(prov, lambda r: (r["tahun"], prov_kode(r["provinsi"]), "SEMUA")))
    baris = []
    for (th, pk, kg, ck), v in sorted(a.items(), key=lambda x: (x[0][0], x[0][1], x[0][2] == "SEMUA", x[0][2], x[0][3])):
        kj = kat.get(kg)
        baris.append({"tahun": th, "kode_prov": pk, "provinsi": PROVINSI[pk], "pulau": PULAU_PROV[pk],
                      "klasifikasi": KLAS[kj // 100] if kj else "semua", "kode_jenis_juklak": kj or "", "kategori_dibi": kg,
                      "cakupan": ck, **{k: angka(x) for k, x in v.items()}, "label": LAB_R, "sumber": SUMBER_DIBI})
    return baris


def rekap_jawa(kab, cocok):
    hid = [r for r in kab if kode_jenis(r) in (101, 102, 103, 104, 105, 106)]
    tak = {r["id_tipe_bencana"] for r in hid} - set(HIDRO)
    assert not tak, f"id_tipe_bencana hidromet baru belum dipetakan di HIDRO: {tak}"
    nama = {}
    for r in kab:
        nama[r["id_kab_bps"]] = cocok.cari(r["kabupaten"], str(r["id_kab_bps"])[:2])
    a = agregat(hid, lambda r: (r["id_kab_bps"], r["tahun"], HIDRO[r["id_tipe_bencana"]]))
    panjang = []
    for (kk, th, j, ck), v in sorted(a.items()):
        pk, nm = nama[kk]
        panjang.append({"kode_kab_bps": kk, "kab": nm, "kode_prov": pk, "provinsi": PROVINSI[pk], "tahun": th, "jenis_hidromet": j,
                        "cakupan": ck, **{k: angka(x) for k, x in v.items()}, "label": LAB_R, "sumber": SUMBER_DIBI})
    # kejadian = porsi nasional (pecahan); n_baris = rekaman kab-kejadian = hitungan tingkat kab (Juklak 7/2023 butir 4b)
    met = ["kejadian", "n_baris", "meninggal", "mengungsi", "menderita", "rumah_rusak"]
    ringkas = []
    for kk, (pk, nm) in sorted(nama.items()):
        b = {"kode_kab_bps": kk, "kab": nm, "kode_prov": pk, "provinsi": PROVINSI[pk], "periode": "2015-2026", "cakupan": "bencana"}
        tot = dict.fromkeys(met, 0)
        for j in HIDRO_JENIS:
            for m in met:
                x = sum(a[(kk, th, j, "bencana")][m] for th in range(2015, 2027) if (kk, th, j, "bencana") in a)
                b[f"{j}__{m}"] = angka(x)
                tot[m] += x
        b.update({f"hidromet__{m}": angka(x) for m, x in tot.items()})
        b.update({"label": LAB_R, "sumber": SUMBER_DIBI})
        ringkas.append(b)
    return panjang, ringkas, nama, hid


def baris_versi(kode, metrik, nilai, versi, sumber, url, diakses, label, cakupan="", catatan=""):
    nama, tgl = PER[kode][1], PER[kode][2]
    return {"kode": kode, "nama": nama, "tanggal": tgl, "metrik": metrik, "nilai": angka(nilai),
            "satuan": SATUAN.get(metrik, "unit" if metrik.startswith(("rumah", "pendidikan", "fasyankes")) else "jiwa"),
            "versi": versi, "sumber": sumber, "url_atau_berkas": url, "diakses": diakses, "label": label,
            "cakupan_atau_jendela": cakupan, "catatan": catatan}


def kejadian_besar(per_dibi, ditarik, rujukan):
    out, dibi_jum = [], {}
    tgl_tarik = ditarik[:10]
    for kode, nama, mulai, jendela, kat, prov, kabs in PERISTIWA:
        if not jendela:
            ket = ("DIBI tidak memuat COVID-19 sebagai baris kejadian; kategori epidemi baru muncul 2024" if kode == "covid19" else
                   "dasbor publik 1 DIBI mulai 2008; kejadian pra-2008 menurut teks dasbor dikompilasi dari berbagai sumber, "
                   "tetapi tidak tersedia lewat dasbor ini")
            out.append(baris_versi(kode, "baris_dibi", 0, "DIBI", SUMBER_DIBI, DIBI, tgl_tarik, LAB_R, "", ket))
            continue
        rows = [r for r in per_dibi[kode]["data"] if jendela[0] <= tanggal(r["dt"]) <= jendela[1]
                and (not kabs or kunci_nama(r["kabupaten"]) in kabs)]
        cak = (f"{jendela[0]} s.d. {jendela[1]}; kategori {', '.join(kat)}; prov BPS {prov or 'semua'}"
               + (f"; kab {', '.join(kabs)}" if kabs else "") + " (jendela dan wilayah dipilih penyusun)")
        if not rows:
            out.append(baris_versi(kode, "baris_dibi", 0, "DIBI", SUMBER_DIBI, DIBI, tgl_tarik, LAB_R, cak,
                                   "tidak ada baris DIBI dalam jendela ini: kejadian tidak tercatat di DIBI dengan kategori tersebut"))
            dibi_jum[kode] = None
            continue
        j = kosong()
        for r in rows:
            tambah(j, r)
        dibi_jum[kode] = (j, rows)
        nb = sum(1 for r in rows if not r["is_bencana"])
        ket = f"{len(rows)} baris kelompok DIBI" + (f", {nb} di antaranya is_bencana=false" if nb else "")
        for m in ["meninggal", "hilang", "luka_sakit", "mengungsi", "menderita", "rumah_rusak_berat", "rumah_rusak_sedang",
                  "rumah_rusak_ringan", "rumah_rusak"]:
            out.append(baris_versi(kode, m, j[m], "DIBI", SUMBER_DIBI, DIBI, tgl_tarik, LAB_R, cak, ket))
        out.append(baris_versi(kode, "kab_terdampak", len({r["id_kab_bps"] for r in rows}), "DIBI", SUMBER_DIBI, DIBI,
                               tgl_tarik, LAB_R, cak, ket))
    fs = json.load(open(P("public/gempa/data/factsheet_gempa.json"), encoding="utf-8"))
    for c in fs["kasus"]:
        kode = FACTSHEET.get(c["tanggal"])
        if kode and c["meninggal"] is not None:
            usgs = "earthquake.usgs.gov" in c["sumber"]
            out.append(baris_versi(kode, "meninggal", c["meninggal"], "USGS" if usgs else "kutipan berita",
                                   ("USGS event page" if usgs else "kutipan BNPB/Basarnas di berita") +
                                   " via public/gempa/data/factsheet_gempa.json", c["sumber"], fs["tanggal"],
                                   LAB_T if usgs else LAB_S, "", "korban jiwa = meninggal minimal tertulis di sumber"))
    luas = json.load(open(P("public/data/luas_resmi.json"), encoding="utf-8"))
    for kode, th in (("karhutla2019", "2019"), ("karhutla2023", "2023")):
        i = luas["tahun"].index(th)
        out.append(baris_versi(kode, "luas_ha", round(sum(v[i] for v in luas["ha"].values()), 2), "KLHK SiPongi",
                               "KLHK SiPongi indikasi luas kebakaran per provinsi, dijumlah (public/data/luas_resmi.json)",
                               "public/data/luas_resmi.json#ha", "2026-10-23", LAB_R, "38 provinsi",
                               "indikasi dari titik panas + verifikasi, bukan citra"))
    for r in rujukan["peristiwa"]:
        out.append(baris_versi(r["kode"], r["metrik"], r["nilai"], "pustaka", r["sumber"], r["url"], r["diakses"], r["label"], "",
                               r["catatan"]))
    return out, dibi_jum


# Penjelasan beda angka per peristiwa (dibuktikan dari baris DIBI di mentah/dibi_peristiwa.json bila disebut 'terbukti').
PENJELASAN = {
    "merapi2010": ("terbukti", "347 = rekap BNPB 1 Des 2010; 386 = rekap BNPB 12 Des 2010 dan sama dengan DIBI (Sleman 277, Magelang 56, "
                   "Klaten 41, Boyolali 12): beda tanggal rekap. 354 dari skripsi, sumber primer tidak diketahui."),
    "sulteng2018": ("tidak terbukti", "Angka BNPB Okt 2018 adalah data dinamis tanggap darurat dan disebut sementara; DIBI adalah data "
                    "statis (Juklak 7/2023). DIBI: Palu 3.624, Sigi 289, Donggala 212, Parigi Moutong 15. Mengapa meninggal naik "
                    "dari 2.081 ke 4.140 sementara hilang turun dari 1.309 ke 705 tidak dapat dibuktikan dari data publik."),
    "lombok2018": ("sebagian", "DIBI dalam jendela menjumlah rangkaian gempa 29 Jul-19 Agu 2018 di NTB dan Bali; USGS per halaman gempa "
                   "5 Agu 2018; 560 adalah kutipan BNPB pada tanggal yang tidak diketahui."),
    "sulbar2021": ("sebagian", "DIBI = Mamuju 96 + Majene 11 = 107, sama dengan angka USGS yang dicatat factsheet; Renstra menulis "
                   "'lebih dari 100' (batas bawah); 105 adalah angka Basarnas hari-hari awal. Pengungsi Mamuju DIBI 60.505 sama "
                   "persis dengan Renstra."),
    "cianjur2022": ("tidak terbukti", "Meninggal sama (602). Rumah rusak dan pengungsi Renstra berbeda dari DIBI; Renstra tidak menyebut "
                    "tanggal rekap. DIBI juga mencatat dampak di Sukabumi, Bogor, Bandung, Kota Sukabumi pada 21 Nov 2022."),
    "jabodetabek2020": ("sebagian", "DIBI mengungsi = jumlah 'nominal terbesar' per baris laporan (Juklak 7/2023 hlm. 22) dijumlah lintas "
                        "kab dan lintas tanggal laporan dalam jendela, sehingga satu orang bisa terhitung di lebih dari satu laporan; "
                        "Renstra tidak menyebut cakupan wilayah dan tanggal. Angka DKI saja di kolom catatan."),
    "sumatra2025": ("sebagian", "Tiga versi beda cakupan: DIBI (jendela 15 Nov-31 Des 2025, banjir+longsor, 3 provinsi), BNPB 12 Jan 2026 "
                    "(data dinamis; pengungsi = yang masih bertahan pada tanggal itu), Buletin Des 2025 (Aceh saja per 31 Des)."),
    "plumpang2023": ("sebagian", "DIBI tidak memuat kejadian ini (0 baris kategori gagal teknologi/kebakaran permukiman di DKI, 3-10 Mar "
                     "2023). 17 = BPBD DKI hari pertama; 19 tidak ditemukan ulang pada penelusuran 23 Okt 2026."),
    "kerusuhan2025": ("terbukti", "DIBI hanya punya satu baris konflik sosial dalam jendela (Manokwari, 28 Agt 2025, 1 meninggal); kerusuhan "
                      "di Jakarta dan kota lain tidak tercatat di DIBI. 11 = Komnas HAM (revisi Nov 2025)."),
    "wamena2019": ("sebagian", "Kerusuhan sosial tercatat DIBI hanya bila masuk kategori konflik sosial di kab terkait; angka 33 (Presiden) "
                   "dan 43 (Dewan Adat Papua) berbeda sumber dan tanggal."),
    "aceh2004": ("sebagian", "Pra-DIBI. 126.741 (BRR) dan 127.720 (CNN Indonesia) untuk Aceh-Sumut; '>230.000' PBB mencakup seluruh "
                 "kawasan Samudra Hindia, jadi tidak sebanding."),
    "nias2005": ("tidak terbukti", "Pra-DIBI. Tiga sumber non-resmi (979 / hampir 1.000 / 850); USGS tidak memberi total."),
    "yogya2006": ("tidak terbukti", "Pra-DIBI. USGS 5.749; kutipan lain 5.700-5.737 tanpa tanggal rekap."),
    "lewotobi2024": ("tidak terbukti", "Meninggal dan luka sama (9 dan 63); menderita dan mengungsi Renstra berbeda dari DIBI, tanggal rekap "
                     "Renstra tidak disebut."),
    "karhutla2015": ("tidak terbukti", "Luas KLHK 2,61-2,65 juta ha lawan kutipan SiPongi 261.060 ha berbeda 10 kali; kemungkinan beda "
                     "metode atau salah kutip, tidak dapat dibuktikan. SiPongi di repo hanya mulai 2018."),
}
UMUM = ("tidak terbukti", "Beda tanggal rekap dan/atau cakupan wilayah; tidak dapat dibuktikan dari data publik.")


def rekonsiliasi(nas_bar, ckan, bul, rujukan, kb, dibi_jum, ditarik):
    out = []
    tgl = ditarik[:10]
    tot = {(r["tahun"], r["cakupan"]): r for r in nas_bar if r["kategori_dibi"] == "SEMUA"}
    kat = {(r["tahun"], r["kategori_dibi"], r["cakupan"]): r for r in nas_bar}
    dasbor = "mentah/dibi_dasbor.json (teks 'Kriteria Bencana' dan adhoc_filters grafik time series)"

    def r(topik, periode, metrik, nilai, sumber, url, diakses, label, definisi, penjelasan, bukti, dasar):
        out.append({"topik": topik, "periode_atau_peristiwa": periode, "metrik": metrik, "nilai": angka(nilai), "sumber": sumber,
                    "url_atau_berkas": url, "diakses": diakses, "label": label, "definisi_cakupan": definisi,
                    "penjelasan_beda": penjelasan, "status_bukti": bukti, "dasar_bukti": dasar})

    ck = {}
    for rec in ckan["seri"]["kejadian"]["data"]:
        for y in range(2010, 2025):
            ck[y] = ck.get(y, 0) + (rec.get(f"{y}.0") or 0)
    alam9 = lambda th: sum(kat[(th, k, "bencana")]["kejadian"] for k in CKAN_KE_DIBI.values() if (th, k, "bencana") in kat)
    for th in (2023, 2024, 2025):
        s, b = tot[(th, "semua_laporan")], tot[(th, "bencana")]
        nb = s["kejadian"] - b["kejadian"]
        r("kejadian_nasional", th, "kejadian", s["kejadian"], SUMBER_DIBI, DIBI, tgl, LAB_R,
          "SUM(jumlah_kejadian) semua laporan, tanpa saring is_bencana: sama dengan grafik time series dasbor publik",
          "angka dasar", "terbukti", "mentah/dibi_nasional.json")
        r("kejadian_nasional", th, "kejadian", b["kejadian"], SUMBER_DIBI, DIBI, tgl, LAB_R,
          "hanya laporan is_bencana=true: memenuhi ambang batas Juklak BNPB 7/2023 (>=1 meninggal; >=50 terdampak/luka/mengungsi; "
          ">=5 rumah/fasum rusak; >=1 ha; permintaan bantuan nasional; atau status darurat)",
          (f"selisih {angka(nb)} laporan di bawah ambang. Dasbor DIBI menyatakan semua laporan disimpan, tetapi hanya yang memenuhi "
           "ambang ditandai kejadian bencana; grafik publik tidak menyaring kolom ini." if nb else
           "sama dengan semua laporan: bendera is_bencana=false baru dipakai sejak data 2024 (Juklak 7/2023 ditetapkan 29 Des 2023)."),
          "terbukti", dasbor + "; mentah/dibi_nasional.json")
        if th <= 2024:
            a9 = alam9(th)
            pas = abs(a9 - ck[th]) < 1   # < 1: sisa pecahan jumlah_kejadian lintas kab
            r("kejadian_nasional", th, "kejadian", ck[th], "CKAN data.bnpb.go.id, Jumlah Kejadian Bencana Menurut Jenis 2010-2024",
              CKAN + "datastore_search?resource_id=" + CKAN_NAS["kejadian"], tgl, LAB_R,
              "9 jenis bencana alam saja (banjir, cuaca ekstrem, erupsi, gelombang/abrasi, gempa, karhutla, kekeringan, longsor, tsunami); "
              "diunggah Mar 2025",
              f"DIBI is_bencana untuk 9 kategori yang sama = {angka(a9)}" +
              (" (sama; sisa < 1 = pecahan kejadian lintas kab). " if pas else ". ") +
              f"Selisih ke DIBI kejadian bencana ({angka(b['kejadian'])}) = {angka(b['kejadian'] - a9)} kejadian nonalam/sosial/lainnya "
              "yang tidak ada di CKAN" + ("." if pas else "; sisa selisih per jenis (rekonsiliasi_ckan_dibi.csv) = revisi DIBI setelah seri "
                                         "CKAN dibekukan Mar 2025 (tidak dapat dibuktikan per baris)."),
              "terbukti" if pas else "sebagian", "mentah/ckan.json; mentah/dibi_nasional.json; rekonsiliasi_ckan_dibi.csv")
    for x in rujukan["kejadian_nasional"]:
        th, m = x["tahun"], x["metrik"]
        if m == "kejadian" and x["nilai"] == 2107:
            p, bk = ("Angka konferensi pers 7 Jan 2025 dengan 'mekanisme pencatatan baru'. Dasbor DIBI menyatakan data tahun berjalan "
                     "sementara, direkonsiliasi tiap triwulan dan final sekitar Februari tahun berikutnya; contoh resmi TW1 2025: "
                     "Pusdalops 814 kejadian sebelum verifikasi menjadi 1.223 sesudah verifikasi. Jadi 2.107 diumumkan sebelum "
                     f"verifikasi akhir; DIBI kini {angka(tot[(2024, 'bencana')]['kejadian'])} kejadian bencana. Aturan yang disebut "
                     "berita ('Juklak nomor 2 tahun 2023') tidak cocok dengan korpus JDIH: Juklak 2/2023 tentang klaster logistik, "
                     "standar data = Juklak 7/2023 (29 Des 2023), di bawah Perban 1/2023 Satu Data Bencana."), "sebagian"
        elif m == "kejadian" and x["nilai"] == 5593:
            sem = lambda k: angka(kat[(2024, k, "semua_laporan")]["kejadian"])
            p, bk = (f"Konferensi pers yang sama dengan 2.107. Rinciannya (banjir 2.284, longsor 933, cuaca 1.432) di atas DIBI semua "
                     f"laporan kini (banjir {sem('Banjir')}, longsor {sem('Longsor')}, cuaca {sem('Cuaca ekstrem')}). Dugaan: seluruh "
                     "laporan masuk sebelum penyaringan ambang dan pembersihan duplikat; tidak dapat dibuktikan dari data publik."), "tidak terbukti"
        elif m == "kejadian" and x["nilai"] == 1476:
            p, bk = ("8 jenis bencana alam dari laman DIBI pada tanggal akses BPK yang tidak tertulis (tulisan diunggah Jan 2025); lebih "
                     "kecil dari semua versi lain, sejalan dengan data sebelum verifikasi triwulan. Tidak dapat dibuktikan."), "tidak terbukti"
        elif m == "kejadian" and th == 2023:
            p, bk = (("Sama dengan DIBI dan CKAN." if x["nilai"] == 5400 else
                      "Tidak dapat dibuktikan; kemungkinan angka per tanggal liputan sebelum data final."),
                     "terbukti" if x["nilai"] == 5400 else "tidak terbukti")
        elif m == "meninggal":
            p, bk = (f"DIBI 2024 kejadian bencana kini {tot[(2024, 'bencana')]['meninggal']} meninggal. Angka konferensi pers diumumkan "
                     "sebelum verifikasi akhir; tidak dapat dibuktikan lebih jauh."), "sebagian"
        else:
            al = defaultdict(int)
            for (t, k, c), v in kat.items():
                if t == 2024 and c == "bencana" and k != "SEMUA" and v["kode_jenis_juklak"] and v["kode_jenis_juklak"] < 200:
                    for q in ("rumah_rusak_berat", "rumah_rusak_sedang", "rumah_rusak_ringan"):
                        al[q] += v[q]
            p, bk = (f"DIBI 2024 bencana alam kini: RB {al['rumah_rusak_berat']}, RS {al['rumah_rusak_sedang']}, RR "
                     f"{al['rumah_rusak_ringan']} (jumlah {sum(al.values())}); angka konferensi pers sebelum verifikasi akhir."), "sebagian"
        r("kejadian_nasional" if m == "kejadian" else f"{m}_nasional", th, m, x["nilai"], x["sumber"], x["url"], x["diakses"],
          x["label"], x["definisi"], p, bk, "lihat penjelasan")
    for th, kol in ((2024, "kejadian_2024"), (2025, "kejadian_2025")):
        ada = [b for b in bul["bulan"] if b[kol] is not None]
        dibi_sama = sum(kat_bulan[(th, b["bulan"], "bencana")] for b in ada)
        r("kejadian_nasional", th, "kejadian", sum(b[kol] for b in ada), "Buletin Info Bencana BNPB 2025 (" + str(len(ada)) + " bulan)",
          bul["pola_url"], bul["diakses"], bul["label"],
          ("angka bulan yang sama 2024 yang dikutip sebagai pembanding di buletin 2025" if th == 2024 else
           "angka bulanan Pusdalops per awal bulan berikutnya") + ("; tanpa April (buletin April salah salin)" if len(ada) < 12 else ""),
          f"DIBI is_bencana untuk bulan yang sama = {angka(dibi_sama)}. " +
          ("Angka pembanding 2024 sudah melewati verifikasi sehingga dekat dengan DIBI." if th == 2024 else
           "Buletin memakai data Pusdalops sebelum verifikasi triwulan; dasbor DIBI mencatat TW1 2025 naik dari 814 (Pusdalops) ke "
           "1.223 sesudah verifikasi dan 1.768 per 30 Jun 2025. Per bulan: rekonsiliasi_bulanan.csv."),
          "sebagian", dasbor + "; rekonsiliasi_bulanan.csv")
    # beda antarversi per peristiwa, dibuat otomatis dari kejadian_besar
    grup = defaultdict(list)
    for x in kb:
        if x["metrik"] not in ("kab_terdampak", "baris_dibi"):
            grup[(x["kode"], x["metrik"])].append(x)
    for (kode, m), xs in sorted(grup.items()):
        if len({x["nilai"] for x in xs}) < 2:
            continue
        bk, p = PENJELASAN.get(kode, UMUM)
        if kode == "jabodetabek2020" and dibi_jum.get(kode):
            dki = sum(rr[m] or 0 for rr in dibi_jum[kode][1] if str(rr["id_kab_bps"]).startswith("31"))
            p += f" DIBI DKI saja untuk {m}: {dki}."
        for x in xs:
            r("peristiwa", f"{kode} ({x['nama']})", m, x["nilai"], x["sumber"], x["url_atau_berkas"], x["diakses"], x["label"],
              x["cakupan_atau_jendela"] or x["catatan"], p, bk, "kejadian_besar.csv; mentah/dibi_peristiwa.json")
    return out


def rekon_ckan(ckan, nas):
    d = defaultdict(lambda: defaultdict(float))
    for x in nas:
        for c in (("semua_laporan",) + (("bencana",) if x["is_bencana"] else ())):
            for k in M:
                d[(x["tahun"], x["kategori_bencana"], c)][k] += x[k] or 0
    pasang = [("kejadian", "jumlah_kejadian"), ("hilang", "hilang"), ("luka_sakit", "luka_sakit"), ("mengungsi", "mengungsi"),
              ("terdampak", "menderita"), ("terdampak", "menderita_mengungsi"), ("rumah_rusak", "rumah_rusak")]
    out, lewat = [], []
    for cm, dm in pasang:
        for rec in ckan["seri"][cm]["data"]:
            jc = rec["JENIS BENCANA"].strip()
            for y in range(2010, 2025):
                v = rec.get(f"{y}.0")
                if not isinstance(v, (int, float)):
                    lewat.append(f"{cm} {jc} {y}")
                    continue
                b, s = d[(y, CKAN_KE_DIBI[jc], "bencana")][dm], d[(y, CKAN_KE_DIBI[jc], "semua_laporan")][dm]
                out.append({"tahun": y, "jenis_ckan": jc, "kategori_dibi": CKAN_KE_DIBI[jc], "metrik_ckan": cm, "metrik_dibi": dm,
                            "ckan": angka(v), "dibi_bencana": angka(b), "dibi_semua_laporan": angka(s), "selisih_dibi_bencana_minus_ckan": angka(b - v),
                            "sama": "ya" if abs(b - v) < 0.5 else "tidak", "label": LAB_R,
                            "sumber": "CKAN data.bnpb.go.id (resource " + CKAN_NAS[cm] + "); " + SUMBER_DIBI})
    return out, lewat


def bangun():
    nasj, provj, kabj, perj, ck = (baca(f) for f in ("dibi_nasional.json", "dibi_prov.json", "dibi_kab_jawa.json",
                                                      "dibi_peristiwa.json", "ckan.json"))
    rujukan = json.load(open(RUJUKAN, encoding="utf-8"))
    nas, prov, kab = nasj["data"], provj["data"], kabj["data"]
    global PER, kat_bulan
    PER = {p[0]: p for p in PERISTIWA}
    kat_bulan = defaultdict(float)
    for x in nas:
        kat_bulan[(x["tahun"], x["bulan"], "semua_laporan")] += x["jumlah_kejadian"]
        if x["is_bencana"]:
            kat_bulan[(x["tahun"], x["bulan"], "bencana")] += x["jumlah_kejadian"]
    os.makedirs(OUT, exist_ok=True)
    kol_n = ["tahun", "klasifikasi", "kode_jenis_juklak", "kategori_dibi", "cakupan"] + KOL + ["status_data", "label", "sumber"]
    nas_bar, kat = rekap_nasional(nas)
    tulis("rekap_nasional_tahunan", kol_n, nas_bar)
    prov_bar = rekap_provinsi(prov, kat)
    tulis("rekap_provinsi_tahunan", ["tahun", "kode_prov", "provinsi", "pulau", "klasifikasi", "kode_jenis_juklak", "kategori_dibi",
                                     "cakupan"] + KOL + ["label", "sumber"], prov_bar)
    cocok = Pencocok()
    jawa, ringkas, nama_kab, hid = rekap_jawa(kab, cocok)
    tulis("jawa_kab_hidromet", ["kode_kab_bps", "kab", "kode_prov", "provinsi", "tahun", "jenis_hidromet", "cakupan"] + KOL +
          ["label", "sumber"], jawa)
    tulis("jawa_kab_hidromet_ringkas", list(ringkas[0]), ringkas)
    kb, dibi_jum = kejadian_besar(perj["peristiwa"], perj["ditarik"], rujukan)
    tulis("kejadian_besar", list(kb[0]), kb)
    bul = rujukan["buletin_bulanan"]
    bulan = []
    for th in (2024, 2025):
        for b in range(1, 13):
            for c in CAKUPAN:
                bulan.append({"tahun": th, "bulan": b, "versi": f"dibi_{c}", "kejadian": angka(kat_bulan[(th, b, c)]),
                              "label": LAB_R, "sumber": SUMBER_DIBI, "catatan": ""})
            x = next(v for v in bul["bulan"] if v["bulan"] == b)[f"kejadian_{th}"]
            if x is not None:
                bulan.append({"tahun": th, "bulan": b, "versi": "buletin_bnpb", "kejadian": x, "label": bul["label"],
                              "sumber": "Buletin Info Bencana BNPB " + ("bulan itu" if th == 2025 else "2025 (pembanding bulan yang sama 2024)"),
                              "catatan": bul["pola_url"]})
    tulis("rekonsiliasi_bulanan", list(bulan[0]), bulan)
    rck, lewat = rekon_ckan(ck, nas)
    tulis("rekonsiliasi_ckan_dibi", list(rck[0]), rck)
    rek = rekonsiliasi(nas_bar, ck, bul, rujukan, kb, dibi_jum, nasj["ditarik"])
    tulis("rekonsiliasi", list(rek[0]), rek)
    tabel = {"rekap_nasional_tahunan": nas_bar, "rekap_provinsi_tahunan": prov_bar, "jawa_kab_hidromet": jawa,
             "jawa_kab_hidromet_ringkas": ringkas, "kejadian_besar": kb, "rekonsiliasi": rek, "rekonsiliasi_ckan_dibi": rck,
             "rekonsiliasi_bulanan": bulan}
    meta = {"paket": "dibi", "dibangun": dt.datetime.now(WIB).isoformat(timespec="seconds"), "dibi_ditarik": nasj["ditarik"],
            "ckan_ditarik": ck["ditarik"], "skrip": "data/kajian-bnpb/bangun/dibi.py", "label": sorted(LABEL),
            "ckan_meninggal": ck["seri"]["meninggal"].get("galat", "ada"), "ckan_sel_kosong_dilewati": lewat,
            "baris": {k: len(v) for k, v in tabel.items()}}
    simpan(os.path.join(OUT, "dibi.json"), {"meta": meta, "tabel": tabel})
    uji(nas, prov, kab, hid, nas_bar, prov_bar, jawa, ringkas, nama_kab, cocok, kb, dibi_jum, rck, rek, tabel, ck)
    return meta


# --------------------------------------------------------------------------------------------- self-check

def uji(nas, prov, kab, hid, nas_bar, prov_bar, jawa, ringkas, nama_kab, cocok, kb, dibi_jum, rck, rek, tabel, ck):
    # 1. total nasional = tarik riset pagi 23 Okt (riset/mentah/dibi_tahun.json, tanpa pengelompokan jenis)
    pagi = {r["tahun"]: r for r in json.load(open(RISET_TAHUN, encoding="utf-8"))}
    tot = {r["tahun"]: r for r in nas_bar if r["kategori_dibi"] == "SEMUA" and r["cakupan"] == "semua_laporan"}
    for th, p in pagi.items():
        t = tot[th]
        for k, kp in (("kejadian", "jumlah_kejadian"), ("meninggal", "meninggal"), ("hilang", "hilang"), ("mengungsi", "mengungsi"),
                      ("menderita", "menderita"), ("rumah_rusak_berat", "rumah_rusak_berat"), ("n_baris", "n")):
            if th < dt.date.today().year:
                assert abs(t[k] - p[kp]) < 0.01, f"{th} {k}: tarik ulang {t[k]} != riset pagi {p[kp]} (DIBI direvisi?)"
            else:
                assert t[k] >= p[kp] - 0.01, f"{th} {k}: tahun berjalan menyusut {t[k]} < {p[kp]}"
    # 2. provinsi dan kab Jawa menjumlah ke induknya, per tahun/kategori/cakupan/metrik
    def jum(rows, kunci, kol=KOL):
        d = defaultdict(lambda: defaultdict(float))
        for r in rows:
            for k in kol:
                d[kunci(r)][k] += r[k]
        return d
    a = jum([r for r in nas_bar if r["kategori_dibi"] != "SEMUA"], lambda r: (r["tahun"], r["kategori_dibi"], r["cakupan"]))
    b = jum([r for r in prov_bar if r["kategori_dibi"] != "SEMUA"], lambda r: (r["tahun"], r["kategori_dibi"], r["cakupan"]))
    assert a.keys() == b.keys()
    for k in a:
        for m in KOL:
            if m != "n_baris":
                assert abs(a[k][m] - b[k][m]) < 0.05, f"provinsi tidak menjumlah ke nasional {k} {m}: {b[k][m]} != {a[k][m]}"
    assert len({r["kode_prov"] for r in prov_bar}) == 38, "provinsi DIBI tidak 38"
    assert {r["kode_prov"] for r in prov_bar} == set(PROV_KODE)
    a = jum([r for r in prov_bar if r["kode_prov"] in PULAU["Jawa"] and r["kode_jenis_juklak"] and 101 <= r["kode_jenis_juklak"] <= 106],
            lambda r: (r["kode_prov"], r["tahun"], r["cakupan"]))
    b = jum(jawa, lambda r: (r["kode_prov"], r["tahun"], r["cakupan"]))
    assert a.keys() == b.keys(), "kab Jawa dan provinsi Jawa beda cakupan tahun"
    for k in a:
        for m in KOL:
            if m != "n_baris":
                assert abs(a[k][m] - b[k][m]) < 0.05, f"kab Jawa tidak menjumlah ke provinsi {k} {m}: {b[k][m]} != {a[k][m]}"
    # 3. tepat 119 kab/kota Jawa, semuanya cocok dengan nama peta
    peta = {(p, f["properties"]["kab"]) for p in map(str, JAWA)
            for f in json.load(open(P(f"public/geo/kabupaten/{p}.json"), encoding="utf-8"))["features"]}
    assert len(peta) == 119, f"peta Jawa {len(peta)} kab, harus 119"
    assert not cocok.gagal, f"nama kab DIBI tak cocok peta: {cocok.gagal}"
    assert set(nama_kab.values()) == peta, f"kab DIBI vs peta: kurang {peta - set(nama_kab.values())}, lebih {set(nama_kab.values()) - peta}"
    assert len(ringkas) == 119 and len({r["kode_kab_bps"] for r in jawa}) == 119
    for r in ringkas:   # ringkasan = jumlah baris panjang 2015-2026
        x = sum(j["kejadian"] for j in jawa if j["kode_kab_bps"] == r["kode_kab_bps"] and j["cakupan"] == "bencana" and 2015 <= j["tahun"] <= 2026)
        assert abs(x - r["hidromet__kejadian"]) < 0.05, f"ringkas {r['kab']}: {r['hidromet__kejadian']} != {x}"
    # 4. invarian baris: bencana <= semua laporan; rumah_rusak = RB+RS+RR; tidak negatif
    for nama, rows in (("nasional", nas_bar), ("provinsi", prov_bar), ("jawa", jawa)):
        idx = {tuple(v for k, v in r.items() if k not in KOL and k not in ("cakupan", "status_data")): r for r in rows if r["cakupan"] == "semua_laporan"}
        for r in rows:
            assert r["rumah_rusak"] == r["rumah_rusak_berat"] + r["rumah_rusak_sedang"] + r["rumah_rusak_ringan"], f"{nama} rumah {r}"
            assert all(r[k] >= 0 for k in KOL), f"{nama} negatif {r}"
            if r["cakupan"] == "bencana":
                s = idx[tuple(v for k, v in r.items() if k not in KOL and k not in ("cakupan", "status_data"))]
                assert all(r[k] <= s[k] + 0.01 for k in KOL), f"{nama}: bencana > semua laporan {r}"
    assert all(r["menderita_mengungsi"] == r["menderita"] + r["mengungsi"] for r in nas), "menderita_mengungsi bukan jumlah"
    # 5. kejadian besar: tiap peristiwa punya >=1 versi; jumlah DIBI tidak melebihi total tahunnya
    assert {r["kode"] for r in kb} == {p[0] for p in PERISTIWA}
    tahun_tot = {r["tahun"]: r for r in nas_bar if r["kategori_dibi"] == "SEMUA" and r["cakupan"] == "semua_laporan"}
    for kode, v in dibi_jum.items():
        if v:
            th = {int(tanggal(r["dt"])[:4]) for r in v[1]}
            for m in ("meninggal", "mengungsi", "rumah_rusak"):
                assert v[0][m] <= sum(tahun_tot[t][m] for t in th), f"{kode} {m} melebihi total tahunan"
    # 6. CKAN: total resmi yang dikutip riset A §4.2 (seri 2010-2024 dibekukan Mar 2025)
    ckj = defaultdict(float)
    for rec in ck["seri"]["kejadian"]["data"]:
        for y in range(2010, 2025):
            ckj[y] += rec.get(f"{y}.0") or 0
    assert ckj[2024] == 3472 and ckj[2018] == 3397 and ckj[2023] == 5400, f"CKAN kejadian berubah: {dict(ckj)}"
    # 7. semua tabel: tanpa NaN/None/inf di angka, label sah, sumber terisi
    for nama, rows in tabel.items():
        assert rows, f"tabel kosong {nama}"
        for r in rows:
            for k, v in r.items():
                assert v is not None, f"{nama}.{k} None"
                if isinstance(v, float):
                    assert v == v and v not in (float("inf"), float("-inf")), f"{nama}.{k} NaN/inf"
            assert r["label"] in LABEL, f"{nama} label {r['label']}"
            assert r.get("sumber"), f"{nama} tanpa sumber {r}"
    print(f"ok dibi: {len(nas_bar)} baris nasional, {len(prov_bar)} provinsi, {len(jawa)} kab Jawa (119 kab), "
          f"{len(kb)} versi kejadian besar ({len({r['kode'] for r in kb})} peristiwa), {len(rek)} baris rekonsiliasi")


if __name__ == "__main__":
    if sys.argv[1:] == ["tarik"]:
        tarik()
    bangun()
