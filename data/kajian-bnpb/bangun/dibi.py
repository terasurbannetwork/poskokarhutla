#!/usr/bin/env python3
"""Paket `dibi`: rekap kejadian bencana untuk dua kajian Kepala BNPB (Grand Design air Jawa dan mitigasi nasional).

Jalankan dari akar repo:
  python3 data/kajian-bnpb/bangun/dibi.py tarik   # tarik ulang DIBI + CKAN ke mentah.baru/, bangun + uji di sana, lalu tukar ke mentah/
  python3 data/kajian-bnpb/bangun/dibi.py         # bangun dari mentah yang tersimpan (luring) + self-check assert
Keluaran ditulis ke direktori sementara dan baru dipindah (os.replace) setelah self-check lolos: uji yang gagal tidak
meninggalkan CSV rusak, dan `tarik` yang gagal tidak menimpa mentah lama.
Python 3 stdlib saja. Silsilah, definisi, dan keterbatasan: data/kajian-bnpb/data/dibi/README.md.

Masukan:
  dibi.bnpb.go.id  Superset dasbor publik 1, tabel pdsi_staging.mv_dibi_dampak_by_kejadian (tamu, tanpa token)
                   -> mentah/dibi_{nasional,prov,kab_jawa,peristiwa}.json + mentah/dibi_dasbor.json
  data.bnpb.go.id  CKAN "Kompilasi Data Kejadian dan Dampak Bencana" 2010-2024 -> mentah/ckan.json
  data/kajian-bnpb/riset/mentah/dibi_tahun.json   tarik riset pagi 23 Okt 2026 (pembanding: total harus sama)
  data/kajian-bnpb/bangun/dibi_rujukan.json       angka pustaka (Renstra, USGS, Buletin BNPB, berita), disalin tangan + URL
  data/raw/hukum/teks/*.json                      korpus JDIH: tiap angka Renstra dicek ada di halaman yang dirujuk
  public/geo/kabupaten/3[1-6].json                119 nama kab/kota Jawa (properti `kab`)
  public/data/luas_resmi.json                     luas karhutla SiPongi per provinsi 2018-2026
  public/gempa/data/factsheet_gempa.json          korban gempa besar USGS/BNPB (dicocokkan 19 Okt 2026)
  (git blob tiap berkas masukan repo dicatat di dibi.json -> meta.masukan)
Kueri DIBI dan pencocok nama kab dipakai ulang dari scripts/banjir/kejadian.py (pipeline banjir).
"""
import csv, datetime as dt, hashlib, json, os, re, shutil, sys, tempfile, time
from collections import defaultdict

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", ".."))
P = lambda *a: os.path.join(ROOT, *a)
sys.path.insert(0, P("scripts/banjir"))
from kejadian import superset, kunci_nama, DIBI   # noqa: E402  kueri Superset DIBI yang sama dengan pipeline banjir
from umum import ambil, simpan, WIB              # noqa: E402

OUT = P("data/kajian-bnpb/data/dibi")
MENTAH = os.path.join(OUT, "mentah")
README = os.path.join(OUT, "README.md")
RUJUKAN = P("data/kajian-bnpb/bangun/dibi_rujukan.json")
RISET_TAHUN = P("data/kajian-bnpb/riset/mentah/dibi_tahun.json")
FACTSHEET_F = "public/gempa/data/factsheet_gempa.json"
LUAS_F = "public/data/luas_resmi.json"
CKAN = "https://data.bnpb.go.id/api/3/action/"
DASBOR = "https://dibi.bnpb.go.id/api/v1/dashboard/1"
LAB_R, LAB_T, LAB_E, LAB_A = "resmi", "terverifikasi", "estimasi-model", "asumsi-kebijakan"
LABEL = {LAB_R, LAB_T, LAB_E, LAB_A}       # kosakata.keyakinan tema.json (NASKAH-SPEK §9); tidak ada label kelima
PRIMER, SEKUNDER = "primer", "sekunder"
VERIF = {PRIMER, SEKUNDER}                  # medan `verifikasi` pustaka (NASKAH-SPEK §7): naskah `final` menolak sekunder
# label resmi = penerbit asli angka instansi/lembaga negara RI, disebut di awal kolom sumber
PENERBIT_RESMI = ("DIBI BNPB", "CKAN data.bnpb.go.id", "Buletin Info Bencana BNPB", "SiPongi", "KLHK", "Renstra BNPB", "BNPB", "BPBD",
                  "BRR NAD-Nias", "Bappenas", "Presiden RI", "Komnas HAM", "Kementerian Kesehatan", "Tulisan Hukum UJDIH BPK")
# verifikasi primer = angka dibaca di dokumen/halaman penerbitnya sendiri; domain berita selalu sekunder
PRIMER_PUTIH = ("https://dibi.bnpb.go.id/", "https://data.bnpb.go.id/", "https://bnpb.go.id/", "https://www.bnpb.go.id/",
                "https://setkab.go.id/", "data/raw/hukum/teks/", LUAS_F, "https://earthquake.usgs.gov/")
PRIMER_TANPA_URL = ("DIBI BNPB", "CKAN data.bnpb.go.id", "Buletin Info Bencana BNPB")   # tabel tanpa kolom url
URL_MATI = {"https://www.medcom.id/nasional/peristiwa/4ba2EyWk-korban-tewas-bencana-di-sulteng-2-081-orang":
            "URL artikel mati per 23 Okt 2026 (dialihkan ke beranda medcom.id); angka tidak dapat dibuka ulang"}

# Kolom angka tabel DIBI yang dijumlah. Juklak 7/2023 hlm. 7 butir 4b: satu kejadian lintas wilayah = 1 kejadian nasional,
# dihitung per wilayah terdampak di tingkat provinsi/kab. DIBI menyimpannya sebagai pecahan 1/k per kab (teramati di data,
# mis. Merapi 2010 5 x 0,2), jadi SUM(jumlah_kejadian) = jumlah kejadian nasional, bukan jumlah baris.
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
# (kode, nama, tanggal mulai, jendela DIBI [awal, akhir] atau None, kategori_bencana DIBI, id_provinsi_bps DIBI, kab (kunci_nama) atau None)
# id_provinsi_bps DIBI memakai kode lama untuk Papua: 91 = Papua + Papua Barat, 94 = Papua Pegunungan/Selatan/Tengah,
# 96 = Papua Barat Daya (92 dan 95 tidak ada di DIBI).
# Jendela dan cakupan wilayah = pilihan penyusun: jumlah DIBI per kejadian berlabel resmi dengan kolom turunan_penyusun=ya.
PERISTIWA = [
    ("aceh2004", "Gempa dan tsunami Aceh–Sumatera Utara", "2004-12-26", None, [], [], None),
    ("nias2005", "Gempa Nias–Simeulue", "2005-03-28", None, [], [], None),
    ("yogya2006", "Gempa Yogyakarta–Jawa Tengah", "2006-05-27", None, [], [], None),
    ("padang2009", "Gempa Sumatera Barat (Padang Pariaman)", "2009-09-30", ("2009-09-30", "2009-10-31"), ["Gempabumi"], [13], None),
    ("wasior2010", "Banjir bandang Wasior (Teluk Wondama)", "2010-10-04", ("2010-10-04", "2010-10-31"), ["Banjir"], [91], None),
    ("mentawai2010", "Gempa dan tsunami Mentawai", "2010-10-25", ("2010-10-25", "2010-11-30"), ["Tsunami", "Gempabumi"], [13], None),
    ("merapi2010", "Erupsi Merapi", "2010-10-26", ("2010-10-26", "2010-12-31"), ["Erupsi gunung api"], [33, 34], None),
    ("jakarta2013", "Banjir Jakarta Januari 2013", "2013-01-15", ("2013-01-15", "2013-01-31"), ["Banjir"], [31], None),
    ("karhutla2015", "Kebakaran hutan dan lahan 2015", "2015-01-01", ("2015-01-01", "2015-12-31"), ["Kebakaran hutan dan lahan"], [], None),
    ("pidiejaya2016", "Gempa Pidie Jaya", "2016-12-07", ("2016-12-07", "2016-12-31"), ["Gempabumi"], [11], None),
    ("lombok2018", "Gempa Lombok", "2018-07-29", ("2018-07-29", "2018-09-30"), ["Gempabumi"], [51, 52], None),
    ("sulteng2018", "Gempa, tsunami, dan likuefaksi Sulawesi Tengah", "2018-09-28", ("2018-09-28", "2018-10-31"), ["Gempabumi", "Tsunami"], [72], None),
    ("selatsunda2018", "Tsunami Selat Sunda", "2018-12-22", ("2018-12-22", "2018-12-31"), ["Tsunami"], [18, 36], None),
    ("karhutla2019", "Kebakaran hutan dan lahan 2019", "2019-01-01", ("2019-01-01", "2019-12-31"), ["Kebakaran hutan dan lahan"], [], None),
    ("wamena2019", "Kerusuhan Wamena", "2019-09-23", ("2019-09-23", "2019-10-31"), ["Konflik sosial"], [91, 94], None),
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
    # mulai 22 Nov: baris DIBI pertama yang membawa korban jiwa di kab terdampak utama (Agam, Tapanuli Tengah, Aceh Timur, ...);
    # baris 15-21 Nov tetap di jendela (tanpa korban jiwa, keterkaitannya tidak dibuktikan) dan dihitung di catatan
    ("sumatra2025", "Banjir dan longsor Sumatra (Aceh, Sumut, Sumbar)", "2025-11-22", ("2025-11-15", "2025-12-31"), ["Banjir", "Longsor"], [11, 12, 13], None),
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


def tarik(ke):
    """Semua jawaban API ke direktori `ke` (mentah.baru/); mentah/ lama tidak disentuh sampai bangun + uji lolos."""
    kini = dt.datetime.now(WIB).isoformat(timespec="seconds")
    bungkus = lambda kolom, saring, data: {"ditarik": kini, "sumber": DIBI, "tabel": "pdsi_staging.mv_dibi_dampak_by_kejadian",
                                           "kolom": kolom, "saring": saring, "data": data}
    jenis = ["tahun", "id_tipe_bencana", "jenis_bencana", "kategori_bencana", "is_bencana"]
    k = ["bulan"] + jenis
    simpan(os.path.join(ke, "dibi_nasional.json"), bungkus(k, [], kueri(k, [])))
    print("  nasional", file=sys.stderr)
    k = ["id_provinsi_bps", "provinsi"] + jenis
    simpan(os.path.join(ke, "dibi_prov.json"), bungkus(k, [], kueri(k, [])))
    print("  provinsi", file=sys.stderr)
    k = ["id_provinsi_bps", "provinsi", "id_kab_bps", "kabupaten"] + jenis
    s = [{"col": "id_provinsi_bps", "op": "IN", "val": JAWA}]
    simpan(os.path.join(ke, "dibi_kab_jawa.json"), bungkus(k, s, kueri(k, s)))
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
    simpan(os.path.join(ke, "dibi_peristiwa.json"), {"ditarik": kini, "sumber": DIBI, "kolom": k, "peristiwa": per})
    try:   # metadata dasbor: bukti definisi grafik publik (filter, pengelompokan)
        simpan(os.path.join(ke, "dibi_dasbor.json"), {"ditarik": kini, "dasbor": ambil(DASBOR), "grafik": ambil(DASBOR + "/charts")})
    except Exception as e:   # pakai salinan lama: teksnya bukti definisi, bukan angka
        print(f"  metadata dasbor dilewati, salinan lama dipakai: {e}", file=sys.stderr)
        shutil.copy2(os.path.join(MENTAH, "dibi_dasbor.json"), os.path.join(ke, "dibi_dasbor.json"))
    ck = {"ditarik": kini, "sumber": CKAN + "datastore_search", "paket": "data-bencana-indonesia", "seri": {}}
    for met, rid in list(CKAN_NAS.items()) + [("prov_kejadian", CKAN_PROV)]:
        try:
            ck["seri"][met] = {"resource_id": rid, "data": ckan_baris(rid)}
        except Exception as e:
            ck["seri"][met] = {"resource_id": rid, "galat": str(e)[:300]}
        print(f"  CKAN {met}: {'galat' if 'galat' in ck['seri'][met] else len(ck['seri'][met]['data'])}", file=sys.stderr)
    simpan(os.path.join(ke, "ckan.json"), ck)


# --------------------------------------------------------------------------------------------- bangun (luring)

from kejadian import Pencocok          # noqa: E402  nama kab DIBI -> nama `kab` di public/geo/kabupaten
from wilayah import PROVINSI           # noqa: E402

# digit pertama kode jenis: 13 kode Juklak 7/2023 hlm. 6 (101-109 alam, 201-203 nonalam, 301 sosial); 999 = kode DIBI di luar Juklak
KLAS = {1: "alam", 2: "nonalam", 3: "sosial", 9: "lainnya"}
# id_tipe_bencana DIBI (kode Juklak x10 + subjenis) -> jenis hidrometeorologi untuk kajian air. Erupsi/lahar bukan hidromet.
HIDRO = {1010: "banjir", 1016: "banjir", 1012: "banjir_bandang", 1011: "banjir_rob", 1013: "banjir_dan_longsor",
         1020: "tanah_longsor", 1022: "tanah_longsor", 1030: "gelombang_abrasi", 1031: "gelombang_abrasi", 1032: "gelombang_abrasi",
         1040: "cuaca_ekstrem", 1041: "cuaca_ekstrem", 1042: "cuaca_ekstrem", 1043: "cuaca_ekstrem",
         1050: "kekeringan", 1053: "kekeringan", 1060: "karhutla", 1061: "karhutla", 1062: "karhutla", 1063: "karhutla"}
HIDRO_JENIS = ["banjir", "banjir_bandang", "banjir_rob", "banjir_dan_longsor", "tanah_longsor", "cuaca_ekstrem",
               "kekeringan", "gelombang_abrasi", "karhutla"]
HIDRO_NAMA = {"banjir": "banjir", "banjir_bandang": "banjir bandang", "banjir_rob": "rob", "banjir_dan_longsor": "banjir dan longsor",
              "tanah_longsor": "tanah longsor", "cuaca_ekstrem": "cuaca ekstrem", "kekeringan": "kekeringan",
              "gelombang_abrasi": "gelombang/abrasi", "karhutla": "karhutla"}
PROV_ALIAS = {"Daerah Istimewa Yogyakarta": "34"}
# Kolom yang diterbitkan. menderita_mengungsi (= menderita + mengungsi, diperiksa) dan estimasi_kerugian_rumah (satuan tidak
# didokumentasikan DIBI) hanya ada di mentah.
KOL = ["kejadian", "meninggal", "hilang", "luka_sakit", "mengungsi", "menderita", "rumah_rusak_berat", "rumah_rusak_sedang",
       "rumah_rusak_ringan", "rumah_rusak", "rumah_terendam", "pendidikan_rusak", "rumah_ibadat_rusak", "fasyankes_rusak",
       "fasum_rusak", "kantor_rusak", "jembatan_rusak", "n_baris"]
CAKUPAN = ("bencana", "semua_laporan")
SUMBER_DIBI = "DIBI BNPB, dibi.bnpb.go.id dasbor publik 1 (pdsi_staging.mv_dibi_dampak_by_kejadian)"
SIPONGI = "SiPongi, KLHK (kini Kementerian Kehutanan)"
DIBI_TANDA = {"label": LAB_R, "verifikasi": PRIMER, "sumber": SUMBER_DIBI}   # baris langsung dari DIBI
FACTSHEET = {"2006-05-27": "yogya2006", "2009-09-30": "padang2009", "2010-10-25": "mentawai2010", "2018-08-05": "lombok2018",
             "2018-09-28": "sulteng2018", "2021-01-15": "sulbar2021"}
SATUAN = {"luas_ha": "ha", "kerugian_usd": "USD", "kasus_terkonfirmasi": "kasus", "kab_terdampak": "kab/kota", "baris_dibi": "baris"}


def seri(th):
    """Patahan seri 2024: is_bencana=false dan kategori nonalam/sosial/lainnya praktis baru tercatat sejak data 2024."""
    return "pra2024" if th < 2024 else "juklak2023"


def angka(v):
    """Kejadian pecahan dibulatkan 2 desimal; bilangan bulat ditulis tanpa ,0."""
    v = round(float(v), 2)
    return int(v) if v.is_integer() else v


def fid(v):
    """Angka gaya Indonesia untuk prosa: 5440.45 -> '5.440,45'."""
    v = angka(v)
    s = f"{v:,}" if isinstance(v, int) else f"{v:,.2f}".rstrip("0")
    return s.replace(",", "_").replace(".", ",").replace("_", ".")


def blob(rel):
    """git blob sha1 berkas (sama dengan `git hash-object`), tanpa memanggil git."""
    b = open(P(rel), "rb").read()
    return hashlib.sha1(b"blob %d\0" % len(b) + b).hexdigest()


def kosong():
    return {k: 0 for k in KOL}


def tambah(wadah, r):
    for k in KOL:
        wadah[k] += r["jumlah_kejadian" if k == "kejadian" else k] or 0


def agregat(rows, kunci):
    """{(kunci..., cakupan): jumlah}. 'semua_laporan' = semua baris dasbor; 'bencana' = is_bencana=true."""
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


def tanggal(ms):
    return dt.datetime.fromtimestamp(ms / 1000, WIB).date().isoformat()


def rekap_nasional(nas, th_tarik):
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
                      "kategori_dibi": kg, "cakupan": ck, "seri": seri(th), **{k: angka(x) for k, x in v.items()},
                      "status_data": "sementara (tahun berjalan saat tarik)" if th >= th_tarik else "final menurut jadwal DIBI",
                      **DIBI_TANDA})
    return baris, kat


def rekap_provinsi(prov, kat):
    a = agregat(prov, lambda r: (r["tahun"], prov_kode(r["provinsi"]), r["kategori_bencana"]))
    a.update(agregat(prov, lambda r: (r["tahun"], prov_kode(r["provinsi"]), "SEMUA")))
    baris = []
    for (th, pk, kg, ck), v in sorted(a.items(), key=lambda x: (x[0][0], x[0][1], x[0][2] == "SEMUA", x[0][2], x[0][3])):
        kj = kat.get(kg)
        baris.append({"tahun": th, "kode_prov": pk, "provinsi": PROVINSI[pk], "pulau": PULAU_PROV[pk],
                      "klasifikasi": KLAS[kj // 100] if kj else "semua", "kode_jenis_juklak": kj or "", "kategori_dibi": kg,
                      "cakupan": ck, "seri": seri(th), **{k: angka(x) for k, x in v.items()}, **DIBI_TANDA})
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
                        "cakupan": ck, **{k: angka(x) for k, x in v.items()}, **DIBI_TANDA})
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
        b.update(DIBI_TANDA)
        ringkas.append(b)
    return panjang, ringkas, nama, hid


def baris_versi(kode, metrik, nilai, versi, sumber, url, diakses, label, verifikasi, turunan, cakupan="", catatan=""):
    nama, tgl = PER[kode][1], PER[kode][2]
    if url in URL_MATI:
        catatan = (catatan + "; " if catatan else "") + URL_MATI[url]
    return {"kode": kode, "nama": nama, "tanggal": tgl, "metrik": metrik, "nilai": angka(nilai),
            "satuan": SATUAN.get(metrik, "unit" if metrik.startswith(("rumah", "pendidikan", "fasyankes")) else "jiwa"),
            "versi": versi, "sumber": sumber, "url_atau_berkas": url, "diakses": diakses, "label": label, "verifikasi": verifikasi,
            "turunan_penyusun": turunan, "cakupan_atau_jendela": cakupan, "catatan": catatan}


def baris_peristiwa(per_dibi, kode, jendela, kat, prov, kabs):
    """Baris DIBI satu kejadian: jendela tanggal + saring ulang kategori/provinsi/kab (mentah boleh lebih lebar dari definisi kini)."""
    s = {x["col"]: set(x["val"]) for x in per_dibi[kode]["saring"]}
    assert set(kat) <= s["kategori_bencana"] and (not prov or set(prov) <= s.get("id_provinsi_bps", set(prov))), \
        f"{kode}: definisi PERISTIWA melebar dari saring mentah {s}; jalankan `tarik`"
    return [r for r in per_dibi[kode]["data"] if jendela[0] <= tanggal(r["dt"]) <= jendela[1] and r["kategori_bencana"] in kat
            and (not prov or r["id_provinsi_bps"] in prov) and (not kabs or kunci_nama(r["kabupaten"]) in kabs)]


def kejadian_besar(per_dibi, ditarik, rujukan):
    out, dibi_jum = [], {}
    tgl_tarik = ditarik[:10]
    for kode, nama, mulai, jendela, kat, prov, kabs in PERISTIWA:
        if not jendela:
            ket = ("DIBI tidak memuat COVID-19 sebagai baris kejadian; kategori epidemi baru muncul 2024" if kode == "covid19" else
                   "dasbor publik 1 DIBI mulai 2008; kejadian pra-2008 menurut teks dasbor dikompilasi dari berbagai sumber, "
                   "tetapi tidak tersedia lewat dasbor ini")
            out.append(baris_versi(kode, "baris_dibi", 0, "DIBI", SUMBER_DIBI, DIBI, tgl_tarik, LAB_R, PRIMER, "tidak", "", ket))
            continue
        rows = baris_peristiwa(per_dibi, kode, jendela, kat, prov, kabs)
        cak = (f"{jendela[0]} s.d. {jendela[1]}; kategori {', '.join(kat)}; id_provinsi_bps DIBI {prov or 'semua'}"
               + (f"; kab {', '.join(kabs)}" if kabs else "") + "; cakupan semua_laporan (jendela dan wilayah dipilih penyusun)")
        if not rows:
            out.append(baris_versi(kode, "baris_dibi", 0, "DIBI", SUMBER_DIBI, DIBI, tgl_tarik, LAB_R, PRIMER, "ya", cak,
                                   "tidak ada baris DIBI dalam jendela ini: kejadian tidak tercatat di DIBI dengan kategori tersebut"))
            dibi_jum[kode] = None
            continue
        j = kosong()
        for r in rows:
            tambah(j, r)
        dibi_jum[kode] = (j, rows)
        nb = [r for r in rows if not r["is_bencana"]]
        dini = [r for r in rows if tanggal(r["dt"]) < mulai]
        ket = (f"{len(rows)} baris kelompok DIBI, semua laporan (is_bencana=false: {len(nb)} baris, "
               f"{fid(sum(r['meninggal'] or 0 for r in nb))} meninggal)" +
               (f"; {len(dini)} baris sebelum tanggal mulai {mulai} ({fid(sum(r['meninggal'] or 0 for r in dini))} meninggal)" if dini else ""))
        for m in ["meninggal", "hilang", "luka_sakit", "mengungsi", "menderita", "rumah_rusak_berat", "rumah_rusak_sedang",
                  "rumah_rusak_ringan", "rumah_rusak"]:
            out.append(baris_versi(kode, m, j[m], "DIBI", SUMBER_DIBI, DIBI, tgl_tarik, LAB_R, PRIMER, "ya", cak, ket))
        out.append(baris_versi(kode, "kab_terdampak", len({r["id_kab_bps"] for r in rows}), "DIBI", SUMBER_DIBI, DIBI,
                               tgl_tarik, LAB_R, PRIMER, "ya", cak, ket))
    fs = json.load(open(P(FACTSHEET_F), encoding="utf-8"))
    for c in fs["kasus"]:
        kode = FACTSHEET.get(c["tanggal"])
        if kode and c["meninggal"] is not None:
            usgs = "earthquake.usgs.gov" in c["sumber"]
            out.append(baris_versi(kode, "meninggal", c["meninggal"], "USGS" if usgs else "kutipan berita",
                                   ("USGS event page" if usgs else "BNPB/Basarnas, dikutip berita") + f" via {FACTSHEET_F}",
                                   c["sumber"], fs["tanggal"], LAB_T if usgs else LAB_R, PRIMER if usgs else SEKUNDER, "tidak", "",
                                   "korban jiwa = meninggal minimal tertulis di sumber"))
    luas = json.load(open(P(LUAS_F), encoding="utf-8"))
    luas_tgl = dt.date.fromtimestamp(os.path.getmtime(P(LUAS_F))).isoformat()
    for kode, th in (("karhutla2019", "2019"), ("karhutla2023", "2023")):
        i = luas["tahun"].index(th)
        out.append(baris_versi(kode, "luas_ha", round(sum(v[i] for v in luas["ha"].values()), 2), "SiPongi",
                               f"{SIPONGI}, indikasi luas kebakaran per provinsi, dijumlah ({LUAS_F}); data {th} diterbitkan KLHK",
                               f"{LUAS_F}#ha (git blob {blob(LUAS_F)[:12]})", luas_tgl, LAB_R, PRIMER, "tidak", "38 provinsi",
                               "indikasi dari titik panas + verifikasi, bukan citra; tanggal = waktu ubah berkas repo"))
    for r in rujukan["peristiwa"]:
        out.append(baris_versi(r["kode"], r["metrik"], r["nilai"], "pustaka", r["sumber"], r["url"], r["diakses"], r["label"],
                               r["verifikasi"], "tidak", "", r["catatan"]))
    return out, dibi_jum


# --------------------------------------------------------------------------------------------- penjelasan beda angka

def nilai(kb, kode, metrik, cari):
    """Satu nilai dari kejadian_besar: versi == cari atau cari ada di kolom sumber. Bukan tepat satu = galat (prosa basi)."""
    xs = [x for x in kb if x["kode"] == kode and x["metrik"] == metrik and (x["versi"] == cari or cari in x["sumber"])]
    assert len(xs) == 1, f"penjelasan {kode} {metrik} '{cari}': {len(xs)} baris cocok"
    return xs[0]["nilai"]


def rinci(rows, m, n=4, saring=lambda r: True):
    d = defaultdict(float)
    for r in rows:
        if saring(r):
            d[r["kabupaten"]] += r[m] or 0
    return ", ".join(f"{k} {fid(v)}" for v, k in sorted(((v, k) for k, v in d.items() if v), reverse=True)[:n])


def sama(a, b):
    return "sama dengan" if angka(a) == angka(b) else "berbeda dari"


def penjelasan(kb, dibi_jum, nas):
    """(status_bukti, teks) per peristiwa. Semua angka dibentuk dari data, jadi revisi DIBI/rujukan tidak meninggalkan prosa basi."""
    V = lambda kode, m, cari="DIBI": nilai(kb, kode, m, cari)
    R = lambda kode: dibi_jum[kode][1]
    jen = lambda kode: f"{PER[kode][3][0]}–{PER[kode][3][1]}"
    out = {}

    rows = R("merapi2010")
    out["merapi2010"] = ("sebagian", (
        f"{fid(V('merapi2010', 'meninggal', '1 Des 2010'))} = rekap BNPB 1 Des 2010; {fid(V('merapi2010', 'meninggal', '12 Des 2010'))} = "
        f"rekap BNPB 12 Des 2010, {sama(V('merapi2010', 'meninggal', '12 Des 2010'), V('merapi2010', 'meninggal'))} DIBI "
        f"{fid(V('merapi2010', 'meninggal'))} ({rinci(rows, 'meninggal')}): beda tanggal rekap. {fid(V('merapi2010', 'meninggal', 'skripsi'))} "
        "dari skripsi, sumber primernya tidak diketahui, jadi beda ini tidak terjelaskan."))

    rows = R("sulteng2018")
    s = lambda m, c: fid(V("sulteng2018", m, c))
    out["sulteng2018"] = ("tidak terbukti", (
        "Angka BNPB Okt 2018 adalah data dinamis tanggap darurat dan disebut sementara; DIBI adalah data statis (Juklak 7/2023). "
        f"Meninggal: BNPB 21 Okt {s('meninggal', '21 Okt')} (JPNN), BNPB 26 Okt {s('meninggal', 'BNPB/Basarnas')} (Medcom; artikelnya kini "
        f"mati), USGS {s('meninggal', 'USGS')}, DIBI {s('meninggal', 'DIBI')} ({rinci(rows, 'meninggal')}). Hilang: BNPB 21 Okt "
        f"{s('hilang', '21 Okt')} (JPNN; tidak ada versi hilang bertanggal 26 Okt di paket ini), USGS {s('hilang', 'USGS')}, DIBI "
        f"{s('hilang', 'DIBI')}. Luka DIBI {s('luka_sakit', 'DIBI')} {sama(V('sulteng2018', 'luka_sakit'), V('sulteng2018', 'luka_sakit', 'USGS'))} "
        f"USGS {s('luka_sakit', 'USGS')}. Mengapa meninggal DIBI berbeda dari semua versi Okt 2018 dan USGS tidak dapat dibuktikan "
        "dari data publik."))

    out["lombok2018"] = ("sebagian", (
        f"DIBI dalam jendela menjumlah rangkaian gempa {min(tanggal(r['dt']) for r in R('lombok2018'))} s.d. "
        f"{max(tanggal(r['dt']) for r in R('lombok2018'))} di {', '.join(sorted({r['provinsi'] for r in R('lombok2018')}))} "
        f"(meninggal {fid(V('lombok2018', 'meninggal'))}); USGS {fid(V('lombok2018', 'meninggal', 'USGS'))} per halaman gempa 5 Agu 2018; "
        f"{fid(V('lombok2018', 'meninggal', 'IGPA'))} adalah kutipan BNPB pada tanggal yang tidak diketahui."))

    rows = R("sulbar2021")
    mam = sum(r["mengungsi"] or 0 for r in rows if r["kabupaten"] == "Mamuju")
    out["sulbar2021"] = ("sebagian", (
        f"DIBI = {rinci(rows, 'meninggal')} = {fid(V('sulbar2021', 'meninggal'))}, {sama(V('sulbar2021', 'meninggal'), V('sulbar2021', 'meninggal', 'USGS'))} "
        f"USGS {fid(V('sulbar2021', 'meninggal', 'USGS'))} (halaman event us7000d030). Factsheet repo mencatat "
        f"{fid(V('sulbar2021', 'meninggal', 'BNPB/Basarnas'))} dari Basarnas via Antara (hari-hari awal). Renstra menulis 'lebih dari "
        f"{fid(V('sulbar2021', 'meninggal', 'Renstra'))}' (batas bawah). Pengungsi Mamuju DIBI {fid(mam)} "
        f"{sama(mam, V('sulbar2021', 'mengungsi', 'Renstra'))} Renstra {fid(V('sulbar2021', 'mengungsi', 'Renstra'))}."))

    rows = R("cianjur2022")
    lain = sorted({r["kabupaten"] for r in rows if r["kabupaten"] != "Cianjur"})
    out["cianjur2022"] = ("tidak terbukti", (
        f"Meninggal DIBI {fid(V('cianjur2022', 'meninggal'))} {sama(V('cianjur2022', 'meninggal'), V('cianjur2022', 'meninggal', 'Renstra'))} "
        f"Renstra {fid(V('cianjur2022', 'meninggal', 'Renstra'))}. Rumah rusak dan pengungsi Renstra "
        f"({fid(V('cianjur2022', 'rumah_rusak', 'Renstra'))} dan {fid(V('cianjur2022', 'mengungsi', 'Renstra'))}) lawan DIBI "
        f"({fid(V('cianjur2022', 'rumah_rusak'))} dan {fid(V('cianjur2022', 'mengungsi'))}); Renstra tidak menyebut tanggal rekap. "
        f"DIBI juga mencatat dampak di {', '.join(lain)} dalam jendela {jen('cianjur2022')}."))

    rows = R("jabodetabek2020")
    top = max(rows, key=lambda r: r["mengungsi"] or 0)
    tot = sum(r["mengungsi"] or 0 for r in rows)
    dki = sum(r["mengungsi"] or 0 for r in rows if str(r["id_kab_bps"]).startswith("31"))
    per_kab = defaultdict(int)
    for r in rows:
        per_kab[r["kabupaten"]] += 1
    out["jabodetabek2020"] = ("tidak terbukti", (
        f"DIBI mengungsi {fid(tot)} didominasi satu rekaman {top['kabupaten']} {fid(top['mengungsi'])} "
        f"({fid(round(100 * top['mengungsi'] / tot, 1))}%) bertanggal {tanggal(top['dt'])} (n_baris {top['n_baris']}). "
        f"{len(per_kab)} kab yang cocok, {sum(1 for v in per_kab.values() if v == 1)} di antaranya satu baris; tanggal baris: "
        f"{', '.join(sorted({tanggal(r['dt']) for r in rows}))}" +
        (", jadi bukan penjumlahan lintas tanggal laporan. " if len({tanggal(r['dt']) for r in rows}) == 1 else ". ") +
        "Angka "
        f"{top['kabupaten']} perlu dicek ke BPBD {top['kabupaten']}/BNPB; jangan dijadikan angka utama. Renstra "
        f"({fid(V('jabodetabek2020', 'mengungsi', 'Renstra'))} mengungsi) menyebut 'Banjir di DKI Jakarta': bila dibandingkan, pakai "
        f"DIBI DKI saja ({fid(dki)}). Angka DKI per metrik ditambahkan di bawah."))

    w = PER["sumatra2025"][3]
    out["sumatra2025"] = ("sebagian", (
        f"Tiga versi beda cakupan: DIBI (jendela {w[0]} s.d. {w[1]}, banjir+longsor, Aceh/Sumut/Sumbar, semua laporan), BNPB 12 Jan 2026 "
        "(data dinamis; pengungsi = yang masih bertahan pada tanggal itu), Buletin Des 2025 (Aceh saja per 31 Des)."))

    out["plumpang2023"] = ("sebagian", (
        f"DIBI tidak memuat kejadian ini (0 baris kategori {', '.join(PER['plumpang2023'][4])} di DKI, {jen('plumpang2023')}). "
        f"{fid(V('plumpang2023', 'meninggal', 'BPBD DKI'))} = BPBD DKI hari pertama; {fid(V('plumpang2023', 'meninggal', 'JPNN'))} "
        "tidak ditemukan ulang pada penelusuran 23 Okt 2026."))

    rows = R("kerusuhan2025")
    agu = defaultdict(lambda: defaultdict(float))
    for r in nas:
        if r["tahun"] == 2025 and r["bulan"] == 8 and r["kategori_bencana"] in ("Lainnya", "Kebakaran permukiman"):
            for m in ("meninggal", "hilang", "jumlah_kejadian"):
                agu[(r["kategori_bencana"], r["is_bencana"])][m] += r[m] or 0
    ag = lambda k: "; ".join(f"is_bencana={str(b).lower()}: {fid(v['jumlah_kejadian'])} kejadian, {fid(v['meninggal'])} meninggal, "
                             f"{fid(v['hilang'])} hilang" for (kk, b), v in sorted(agu.items()) if kk == k)
    out["kerusuhan2025"] = ("sebagian", (
        "Kueri hanya menyaring kategori Konflik sosial: DIBI punya " +
        "; ".join(f"{r['kabupaten']} {tanggal(r['dt'])} ({fid(r['meninggal'] or 0)} meninggal)" for r in rows) +
        " dalam jendela, jadi kerusuhan di Jakarta dan kota lain tidak tercatat SEBAGAI konflik sosial. DIBI Agustus 2025 (seluruh "
        f"Indonesia, mentah/dibi_nasional.json) juga punya kategori Lainnya ({ag('Lainnya')}) dan Kebakaran permukiman "
        f"({ag('Kebakaran permukiman')}) yang belum diperiksa per kab dan tanggal. {fid(V('kerusuhan2025', 'meninggal', 'Komnas HAM'))} "
        "= Komnas HAM (revisi Nov 2025)."))

    out["wamena2019"] = ("sebagian", (
        f"DIBI konflik sosial dalam jendela: {rinci(R('wamena2019'), 'meninggal')} meninggal. Angka "
        f"{fid(V('wamena2019', 'meninggal', 'Presiden'))} (Presiden) dan {fid(V('wamena2019', 'meninggal', 'Dewan Adat'))} (Dewan Adat "
        "Papua) berbeda sumber dan tanggal."))

    out["aceh2004"] = ("sebagian", (
        f"Pra-DIBI. {fid(V('aceh2004', 'meninggal', 'BRR'))} (BRR) dan {fid(V('aceh2004', 'meninggal', 'CNN'))} (CNN Indonesia) untuk "
        f"Aceh-Sumut; '>{fid(V('aceh2004', 'meninggal', 'PBB'))}' PBB mencakup seluruh kawasan Samudra Hindia, jadi tidak sebanding."))
    out["nias2005"] = ("tidak terbukti", (
        f"Pra-DIBI. Tiga sumber non-resmi ({fid(V('nias2005', 'meninggal', 'BRR'))} / hampir {fid(V('nias2005', 'meninggal', 'PreventionWeb'))}"
        f" / {fid(V('nias2005', 'meninggal', 'Mercy'))}); USGS tidak memberi total."))
    lain = [x["nilai"] for x in kb if x["kode"] == "yogya2006" and x["metrik"] == "meninggal" and x["versi"] == "pustaka"]
    out["yogya2006"] = ("tidak terbukti", (
        f"Pra-DIBI. USGS {fid(V('yogya2006', 'meninggal', 'USGS'))}; kutipan lain {fid(min(lain))}-{fid(max(lain))} tanpa tanggal rekap."))
    sm = lambda m: sama(V("lewotobi2024", m), V("lewotobi2024", m, "Renstra"))
    out["lewotobi2024"] = ("tidak terbukti", (
        f"Meninggal DIBI {fid(V('lewotobi2024', 'meninggal'))} {sm('meninggal')} Renstra; luka DIBI {fid(V('lewotobi2024', 'luka_sakit'))} "
        f"{sm('luka_sakit')} Renstra. Menderita dan mengungsi Renstra ({fid(V('lewotobi2024', 'menderita', 'Renstra'))} dan "
        f"{fid(V('lewotobi2024', 'mengungsi', 'Renstra'))}) lawan DIBI ({fid(V('lewotobi2024', 'menderita'))} dan "
        f"{fid(V('lewotobi2024', 'mengungsi'))}); tanggal rekap Renstra tidak disebut."))
    lu = sorted(x["nilai"] for x in kb if x["kode"] == "karhutla2015" and x["metrik"] == "luas_ha" and x["sumber"].startswith("KLHK,"))
    sp = V("karhutla2015", "luas_ha", "SiPongi KLHK, dikutip")
    out["karhutla2015"] = ("tidak terbukti", (
        f"Luas KLHK {fid(lu[0])}-{fid(lu[-1])} ha lawan kutipan SiPongi {fid(sp)} ha, berbeda {fid(round(lu[0] / sp))} kali; kemungkinan "
        "beda metode atau salah kutip, tidak dapat dibuktikan. SiPongi di repo hanya mulai 2018."))
    return out


UMUM = ("tidak terbukti", "Beda tanggal rekap dan/atau cakupan wilayah; tidak dapat dibuktikan dari data publik.")


def rekonsiliasi(nas, nas_bar, ckan, bul, rujukan, kb, dibi_jum, ditarik, kat_bulan):
    out = []
    tgl = ditarik[:10]
    tot = {(r["tahun"], r["cakupan"]): r for r in nas_bar if r["kategori_dibi"] == "SEMUA"}
    kat = {(r["tahun"], r["kategori_dibi"], r["cakupan"]): r for r in nas_bar}
    alam = defaultdict(lambda: defaultdict(float))
    for r in nas_bar:
        if r["klasifikasi"] == "alam":
            for k in KOL:
                alam[(r["tahun"], r["cakupan"])][k] += r[k]
    dasbor = "mentah/dibi_dasbor.json (teks 'Kriteria Bencana' dan adhoc_filters grafik time series)"
    nb_m = defaultdict(lambda: [0, 0])   # baris is_bencana=false dengan korban meninggal
    for x in nas:
        if not x["is_bencana"] and (x["meninggal"] or 0) > 0:
            nb_m[x["tahun"]][0] += 1
            nb_m[x["tahun"]][1] += x["meninggal"]

    def r(topik, periode, metrik, nilai_, sumber, url, diakses, label, verifikasi, turunan, definisi, penj, bukti, dasar):
        out.append({"topik": topik, "periode_atau_peristiwa": periode, "metrik": metrik, "nilai": angka(nilai_), "sumber": sumber,
                    "url_atau_berkas": url, "diakses": diakses, "label": label, "verifikasi": verifikasi, "turunan_penyusun": turunan,
                    "definisi_cakupan": definisi, "penjelasan_beda": penj, "status_bukti": bukti, "dasar_bukti": dasar})

    ck = {}
    for rec in ckan["seri"]["kejadian"]["data"]:
        for y in range(2010, 2025):
            ck[y] = ck.get(y, 0) + (rec.get(f"{y}.0") or 0)
    alam9 = lambda th: sum(kat[(th, k, "bencana")]["kejadian"] for k in CKAN_KE_DIBI.values() if (th, k, "bencana") in kat)
    for th in (2023, 2024, 2025):
        s, b = tot[(th, "semua_laporan")], tot[(th, "bencana")]
        nb = s["kejadian"] - b["kejadian"]
        r("kejadian_nasional", th, "kejadian", s["kejadian"], SUMBER_DIBI, DIBI, tgl, LAB_R, PRIMER, "tidak",
          "SUM(jumlah_kejadian) semua laporan, tanpa saring is_bencana: sama dengan grafik time series dasbor publik",
          "angka dasar", "terbukti", "mentah/dibi_nasional.json")
        r("kejadian_nasional", th, "kejadian", b["kejadian"], SUMBER_DIBI, DIBI, tgl, LAB_R, PRIMER, "tidak",
          "hanya laporan is_bencana=true: ditandai kejadian bencana menurut ambang batas Juklak BNPB 7/2023 hlm. 7 (>=1 meninggal; >=50 "
          "terdampak/luka/mengungsi; >=5 rumah/fasum rusak; >=1 ha; permintaan bantuan nasional; atau status darurat). Bendera ini bukan "
          "fungsi ambang murni: ada laporan is_bencana=false yang membawa korban meninggal",
          (f"selisih {fid(nb)} kejadian dari laporan is_bencana=false (umumnya di bawah ambang; {nb_m[th][0]} baris kelompok di antaranya "
           f"membawa {fid(nb_m[th][1])} meninggal). Dasbor DIBI menyatakan semua laporan disimpan, tetapi hanya yang memenuhi ambang "
           "ditandai kejadian bencana; grafik publik tidak menyaring kolom ini." if nb else
           "sama dengan semua laporan: bendera is_bencana=false baru dipakai sejak data 2024 (Juklak 7/2023 ditetapkan 29 Des 2023), "
           "jadi angka sebelum 2024 tidak tersaring ambang; patahan seri, jangan dibandingkan langsung dengan 2024+."),
          "terbukti", dasbor + "; mentah/dibi_nasional.json")
        r("kejadian_nasional", th, "kejadian", alam[(th, "bencana")]["kejadian"], SUMBER_DIBI, DIBI, tgl, LAB_R, PRIMER, "tidak",
          "is_bencana=true, klasifikasi alam (kode Juklak 101-109) saja: seri yang paling sebanding antartahun",
          f"nonalam/sosial/lainnya {fid(b['kejadian'] - alam[(th, 'bencana')]['kejadian'])} kejadian "
          f"({fid(b['meninggal'] - alam[(th, 'bencana')]['meninggal'])} meninggal) dikeluarkan; kategori ini praktis baru tercatat sejak 2024",
          "terbukti", "mentah/dibi_nasional.json")
        if th <= 2024:
            a9 = alam9(th)
            pas = abs(a9 - ck[th]) < 1   # < 1: sisa pecahan jumlah_kejadian lintas kab
            r("kejadian_nasional", th, "kejadian", ck[th], "CKAN data.bnpb.go.id, Jumlah Kejadian Bencana Menurut Jenis 2010-2024",
              CKAN + "datastore_search?resource_id=" + CKAN_NAS["kejadian"], tgl, LAB_R, PRIMER, "tidak",
              "9 jenis bencana alam saja (banjir, cuaca ekstrem, erupsi, gelombang/abrasi, gempa, karhutla, kekeringan, longsor, tsunami); "
              "diunggah Mar 2025",
              f"DIBI is_bencana untuk 9 kategori yang sama = {fid(a9)}" +
              (" (sama; sisa < 1 = pecahan kejadian lintas kab). " if pas else ". ") +
              f"Selisih ke DIBI kejadian bencana ({fid(b['kejadian'])}) = {fid(b['kejadian'] - a9)} kejadian nonalam/sosial/lainnya "
              "yang tidak ada di CKAN" + ("." if pas else "; sisa selisih per jenis (rekonsiliasi_ckan_dibi.csv) = revisi DIBI setelah seri "
                                         "CKAN dibekukan Mar 2025 (tidak dapat dibuktikan per baris)."),
              "terbukti" if pas else "sebagian", "mentah/ckan.json; mentah/dibi_nasional.json; rekonsiliasi_ckan_dibi.csv")
    for x in rujukan["kejadian_nasional"]:
        th, m = x["tahun"], x["metrik"]
        if m == "kejadian" and x["nilai"] == 2107:
            p, bk = ("Angka konferensi pers 7 Jan 2025 dengan 'mekanisme pencatatan baru'. Yang terbukti hanya tanggalnya: dasbor DIBI "
                     "menyatakan data tahun berjalan sementara, direkonsiliasi tiap triwulan dan final sekitar Februari tahun berikutnya, "
                     "jadi 2.107 diumumkan sebelum data final (contoh resmi TW1 2025: Pusdalops 814 kejadian sebelum verifikasi menjadi "
                     f"1.223 sesudahnya). DIBI kini {fid(tot[(2024, 'bencana')]['kejadian'])} kejadian bencana (alam saja "
                     f"{fid(alam[(2024, 'bencana')]['kejadian'])}). Sebab selisihnya dugaan; BNPB sendiri menyebut 'mekanisme pencatatan "
                     "baru'. Aturan yang disebut berita ('Juklak nomor 2 tahun 2023') tidak cocok dengan korpus JDIH; standar data = Juklak "
                     "7/2023 (29 Des 2023), di bawah Perban 1/2023 Satu Data Bencana."), "sebagian"
        elif m == "kejadian" and x["nilai"] == 5593:
            sem = lambda k: fid(kat[(2024, k, "semua_laporan")]["kejadian"])
            p, bk = (f"Konferensi pers yang sama dengan 2.107. Rinciannya (lihat definisi) di atas DIBI semua laporan kini (banjir "
                     f"{sem('Banjir')}, longsor {sem('Longsor')}, cuaca {sem('Cuaca ekstrem')}). Dugaan: seluruh laporan masuk sebelum "
                     "penyaringan ambang dan pembersihan duplikat; tidak dapat dibuktikan dari data publik."), "tidak terbukti"
        elif m == "kejadian" and x["nilai"] == 1476:
            p, bk = ("8 jenis bencana alam dari laman DIBI pada tanggal akses BPK yang tidak tertulis (tulisan diunggah Jan 2025); lebih "
                     "kecil dari semua versi lain, sejalan dengan data sebelum verifikasi triwulan. Tidak dapat dibuktikan."), "tidak terbukti"
        elif m == "kejadian" and th == 2023:
            sm = abs(x["nilai"] - tot[(2023, "bencana")]["kejadian"]) < 0.5
            p, bk = (("Sama dengan DIBI dan CKAN." if sm else
                      "Tidak dapat dibuktikan; kemungkinan angka per tanggal liputan sebelum data final."), "terbukti" if sm else "tidak terbukti")
        elif m == "meninggal":
            p, bk = (f"DIBI 2024 kejadian bencana kini {fid(tot[(2024, 'bencana')]['meninggal'])} meninggal (alam saja "
                     f"{fid(alam[(2024, 'bencana')]['meninggal'])}). Angka konferensi pers diumumkan sebelum data final; tidak dapat "
                     "dibuktikan lebih jauh."), "sebagian"
        else:
            al = {q: alam[(2024, "bencana")][q] for q in ("rumah_rusak_berat", "rumah_rusak_sedang", "rumah_rusak_ringan")}
            p, bk = (f"DIBI 2024 bencana alam kini: RB {fid(al['rumah_rusak_berat'])}, RS {fid(al['rumah_rusak_sedang'])}, RR "
                     f"{fid(al['rumah_rusak_ringan'])} (jumlah {fid(sum(al.values()))}); angka konferensi pers sebelum data final."), "sebagian"
        r("kejadian_nasional" if m == "kejadian" else f"{m}_nasional", th, m, x["nilai"], x["sumber"], x["url"], x["diakses"],
          x["label"], x["verifikasi"], "tidak", x["definisi"], p, bk, "lihat penjelasan")
    for th, kol in ((2024, "kejadian_2024"), (2025, "kejadian_2025")):
        ada = [b for b in bul["bulan"] if b[kol] is not None]
        d_alam = sum(kat_bulan[(th, b["bulan"], "alam")] for b in ada)
        d_semua = sum(kat_bulan[(th, b["bulan"], "bencana")] for b in ada)
        sama_bln = [b for b in ada if abs(b[kol] - kat_bulan[(th, b["bulan"], "alam")]) < 1]
        beda = [b for b in ada if b not in sama_bln]
        r("kejadian_nasional", th, "kejadian", sum(b[kol] for b in ada), "Buletin Info Bencana BNPB 2025 (" + str(len(ada)) + " bulan)",
          bul["pola_url"], bul["diakses"], bul["label"], bul["verifikasi"], "tidak",
          ("angka bulan yang sama 2024 yang dikutip sebagai pembanding di buletin 2025" if th == 2024 else
           "angka bulanan Pusdalops per awal bulan berikutnya") + "; buletin menyebut 'kejadian bencana alam' (teks Maret dan Juni 2025)" +
          ("; tanpa April (buletin April salah salin)" if len(ada) < 12 else ""),
          f"DIBI bencana alam (kode 101-109, is_bencana) untuk bulan yang sama = {fid(d_alam)} (semua klasifikasi {fid(d_semua)}). " +
          (f"Pembanding 2024 = DIBI bencana alam kini di {len(sama_bln)} dari {len(ada)} bulan (selisih < 1); beda: " +
           ", ".join(f"bulan {b['bulan']} {fid(b[kol])} lawan {fid(kat_bulan[(th, b['bulan'], 'alam')])}" for b in beda) +
           ". Dugaan: angka 2024 sudah final saat buletin 2025 ditulis; tidak dibuktikan." if th == 2024 else
           "Buletin memakai data Pusdalops sebelum verifikasi triwulan; dasbor DIBI mencatat TW1 2025 naik dari 814 (Pusdalops) ke "
           "1.223 sesudah verifikasi dan 1.768 per 30 Jun 2025. Mekanisme terbukti dari dasbor; besarnya selisih per bulan tidak "
           "terurai. Per bulan: rekonsiliasi_bulanan.csv."),
          "sebagian", dasbor + "; rekonsiliasi_bulanan.csv")
    # beda antarversi per peristiwa, dibuat otomatis dari kejadian_besar
    pj = penjelasan(kb, dibi_jum, nas)
    grup = defaultdict(list)
    for x in kb:
        if x["metrik"] not in ("kab_terdampak", "baris_dibi"):
            grup[(x["kode"], x["metrik"])].append(x)
    for (kode, m), xs in sorted(grup.items()):
        if len({x["nilai"] for x in xs}) < 2:
            continue
        bk, p = pj.get(kode, UMUM)
        if kode == "jabodetabek2020" and dibi_jum.get(kode):
            dki = sum(rr[m] or 0 for rr in dibi_jum[kode][1] if str(rr["id_kab_bps"]).startswith("31"))
            p += f" DIBI DKI saja untuk {m}: {fid(dki)}."
        for x in xs:
            r("peristiwa", f"{kode} ({x['nama']})", m, x["nilai"], x["sumber"], x["url_atau_berkas"], x["diakses"], x["label"],
              x["verifikasi"], x["turunan_penyusun"], x["cakupan_atau_jendela"] or x["catatan"], p, bk,
              "kejadian_besar.csv; mentah/dibi_peristiwa.json")
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
                            "sama": "ya" if abs(b - v) < 0.5 else "tidak", "label": LAB_R, "verifikasi": PRIMER,
                            "sumber": "CKAN data.bnpb.go.id (resource " + CKAN_NAS[cm] + "); " + SUMBER_DIBI})
    return out, lewat


def bangun(mentah=MENTAH):
    """Bangun semua tabel dari `mentah`, jalankan uji(), lalu tulis ke direktori sementara di OUT. Kembalikan direktori itu."""
    baca = lambda nama: json.load(open(os.path.join(mentah, nama), encoding="utf-8"))
    nasj, provj, kabj, perj, ck = (baca(f) for f in ("dibi_nasional.json", "dibi_prov.json", "dibi_kab_jawa.json",
                                                      "dibi_peristiwa.json", "ckan.json"))
    dasbor = json.dumps(baca("dibi_dasbor.json"), ensure_ascii=False)
    rujukan = json.load(open(RUJUKAN, encoding="utf-8"))
    nas, prov, kab = nasj["data"], provj["data"], kabj["data"]
    th_tarik = int(nasj["ditarik"][:4])
    global PER
    PER = {p[0]: p for p in PERISTIWA}
    kat_bulan = defaultdict(float)
    for x in nas:
        kat_bulan[(x["tahun"], x["bulan"], "semua_laporan")] += x["jumlah_kejadian"]
        if x["is_bencana"]:
            kat_bulan[(x["tahun"], x["bulan"], "bencana")] += x["jumlah_kejadian"]
            if x["id_tipe_bencana"] // 1000 == 1:
                kat_bulan[(x["tahun"], x["bulan"], "alam")] += x["jumlah_kejadian"]
    kol = {}
    nas_bar, kat = rekap_nasional(nas, th_tarik)
    kol["rekap_nasional_tahunan"] = ["tahun", "klasifikasi", "kode_jenis_juklak", "kategori_dibi", "cakupan", "seri"] + KOL + \
        ["status_data", "label", "verifikasi", "sumber"]
    prov_bar = rekap_provinsi(prov, kat)
    kol["rekap_provinsi_tahunan"] = ["tahun", "kode_prov", "provinsi", "pulau", "klasifikasi", "kode_jenis_juklak", "kategori_dibi",
                                     "cakupan", "seri"] + KOL + ["label", "verifikasi", "sumber"]
    cocok = Pencocok()
    jawa, ringkas, nama_kab, hid = rekap_jawa(kab, cocok)
    kol["jawa_kab_hidromet"] = ["kode_kab_bps", "kab", "kode_prov", "provinsi", "tahun", "jenis_hidromet", "cakupan"] + KOL + \
        ["label", "verifikasi", "sumber"]
    kol["jawa_kab_hidromet_ringkas"] = list(ringkas[0])
    kb, dibi_jum = kejadian_besar(perj["peristiwa"], perj["ditarik"], rujukan)
    kol["kejadian_besar"] = list(kb[0])
    bul = rujukan["buletin_bulanan"]
    bulan = []
    for th in (2024, 2025):
        for b in range(1, 13):
            for c in CAKUPAN + ("alam",):
                bulan.append({"tahun": th, "bulan": b, "versi": "dibi_bencana_alam" if c == "alam" else f"dibi_{c}",
                              "kejadian": angka(kat_bulan[(th, b, c)]), "label": LAB_R, "verifikasi": PRIMER, "sumber": SUMBER_DIBI,
                              "catatan": "is_bencana=true, kode Juklak 101-109: pembanding utama buletin" if c == "alam" else ""})
            x = next(v for v in bul["bulan"] if v["bulan"] == b)[f"kejadian_{th}"]
            if x is not None:
                bulan.append({"tahun": th, "bulan": b, "versi": "buletin_bnpb", "kejadian": x, "label": bul["label"],
                              "verifikasi": bul["verifikasi"],
                              "sumber": "Buletin Info Bencana BNPB " + ("bulan itu" if th == 2025 else "2025 (pembanding bulan yang sama 2024)"),
                              "catatan": bul["pola_url"]})
    kol["rekonsiliasi_bulanan"] = list(bulan[0])
    rck, lewat = rekon_ckan(ck, nas)
    kol["rekonsiliasi_ckan_dibi"] = list(rck[0])
    rek = rekonsiliasi(nas, nas_bar, ck, bul, rujukan, kb, dibi_jum, nasj["ditarik"], kat_bulan)
    kol["rekonsiliasi"] = list(rek[0])
    tabel = {"rekap_nasional_tahunan": nas_bar, "rekap_provinsi_tahunan": prov_bar, "jawa_kab_hidromet": jawa,
             "jawa_kab_hidromet_ringkas": ringkas, "kejadian_besar": kb, "rekonsiliasi": rek, "rekonsiliasi_ckan_dibi": rck,
             "rekonsiliasi_bulanan": bulan}
    masukan = [os.path.relpath(f, ROOT) for f in (RUJUKAN, RISET_TAHUN)] + [FACTSHEET_F, LUAS_F] + \
        [f"public/geo/kabupaten/{p}.json" for p in JAWA]
    meta = {"paket": "dibi", "dibangun": dt.datetime.now(WIB).isoformat(timespec="seconds"), "dibi_ditarik": nasj["ditarik"],
            "ckan_ditarik": ck["ditarik"], "skrip": "data/kajian-bnpb/bangun/dibi.py", "label": sorted(LABEL), "verifikasi": sorted(VERIF),
            "masukan": {f: {"git_blob": blob(f), "diubah": dt.datetime.fromtimestamp(os.path.getmtime(P(f)), WIB).isoformat(timespec="seconds")}
                        for f in masukan},
            "ckan_meninggal": ck["seri"]["meninggal"].get("galat", "ada"), "ckan_sel_kosong_dilewati": lewat,
            "baris": {k: len(v) for k, v in tabel.items()}}
    uji(nas, prov, nas_bar, prov_bar, jawa, ringkas, nama_kab, cocok, kb, perj["peristiwa"], rck, rek, tabel, ck, rujukan,
        th_tarik, kat_bulan, dasbor)
    tmp = tempfile.mkdtemp(dir=OUT, prefix=".baru-")
    for nama, baris in tabel.items():
        with open(os.path.join(tmp, nama + ".csv"), "w", newline="", encoding="utf-8") as f:
            w = csv.DictWriter(f, fieldnames=kol[nama], lineterminator="\n")
            w.writeheader()
            w.writerows(baris)
    simpan(os.path.join(tmp, "dibi.json"), {"meta": meta, "tabel": tabel})
    return tmp


def pasang(tmp):
    for f in os.listdir(tmp):
        os.replace(os.path.join(tmp, f), os.path.join(OUT, f))
    os.rmdir(tmp)


# --------------------------------------------------------------------------------------------- self-check

def uji(nas, prov, nas_bar, prov_bar, jawa, ringkas, nama_kab, cocok, kb, per_dibi, rck, rek, tabel, ck, rujukan,
        th_tarik, kat_bulan, dasbor):
    # 1. total nasional = tarik riset pagi 23 Okt (riset/mentah/dibi_tahun.json, tanpa pengelompokan jenis)
    pagi = {r["tahun"]: r for r in json.load(open(RISET_TAHUN, encoding="utf-8"))}
    th_pagi = max(pagi)   # tahun berjalan saat riset pagi (23 Okt 2026); tahun sebelumnya sudah final saat itu
    tot = {r["tahun"]: r for r in nas_bar if r["kategori_dibi"] == "SEMUA" and r["cakupan"] == "semua_laporan"}
    for th, p in pagi.items():
        t = tot[th]
        for k, kp in (("kejadian", "jumlah_kejadian"), ("meninggal", "meninggal"), ("hilang", "hilang"), ("mengungsi", "mengungsi"),
                      ("menderita", "menderita"), ("rumah_rusak_berat", "rumah_rusak_berat"), ("n_baris", "n")):
            if th < th_pagi:   # sudah final saat riset pagi: tarik ulang kapan pun harus sama persis
                assert abs(t[k] - p[kp]) < 0.01, f"{th} {k}: tarik ulang {t[k]} != riset pagi {p[kp]} (DIBI direvisi?)"
            else:              # tahun berjalan saat riset pagi: boleh naik, tidak boleh turun
                assert t[k] >= p[kp] - 0.01, f"{th} {k}: tahun berjalan menyusut {t[k]} < {p[kp]}"
    assert th_tarik >= th_pagi, f"tahun tarik {th_tarik} sebelum riset pagi"
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
    # 4. invarian data DIBI: rumah_rusak = RB+RS+RR; tidak negatif; menderita_mengungsi = menderita + mengungsi
    for nama, rows in (("nasional", nas_bar), ("provinsi", prov_bar), ("jawa", jawa)):
        for r in rows:
            assert r["rumah_rusak"] == r["rumah_rusak_berat"] + r["rumah_rusak_sedang"] + r["rumah_rusak_ringan"], f"{nama} rumah {r}"
            assert all(r[k] >= 0 for k in KOL), f"{nama} negatif {r}"
    assert all(r["menderita_mengungsi"] == r["menderita"] + r["mengungsi"] for r in nas), "menderita_mengungsi bukan jumlah"
    # 5. kejadian besar: tiap peristiwa punya >=1 versi; baris peristiwa (tanpa jendela) = agregat provinsi dengan saring yang sama.
    #    Kueri peristiwa dan kueri provinsi terpisah, jadi baris kab yang tersunting di mentah peristiwa ketahuan di sini.
    assert {r["kode"] for r in kb} == {p[0] for p in PERISTIWA}
    for kode, v in per_dibi.items():
        s = {x["col"]: x["val"] for x in v["saring"]}
        x, y = defaultdict(float), defaultdict(float)
        for r in v["data"]:
            for m in M + ["n_baris"]:
                x[m] += r[m] or 0
        for r in prov:
            if r["tahun"] in s["tahun"] and r["kategori_bencana"] in s["kategori_bencana"] and \
                    ("id_provinsi_bps" not in s or r["id_provinsi_bps"] in s["id_provinsi_bps"]):
                for m in M + ["n_baris"]:
                    y[m] += r[m] or 0
        for m in M + ["n_baris"]:
            assert abs(x[m] - y[m]) < 0.01, f"peristiwa {kode} {m}: baris mentah peristiwa {x[m]} != agregat dibi_prov {y[m]}"
    # 6. CKAN: total resmi yang dikutip riset A §4.2 (seri 2010-2024 dibekukan Mar 2025)
    ckj = defaultdict(float)
    for rec in ck["seri"]["kejadian"]["data"]:
        for y in range(2010, 2025):
            ckj[y] += rec.get(f"{y}.0") or 0
    assert ckj[2024] == 3472 and ckj[2018] == 3397 and ckj[2023] == 5400, f"CKAN kejadian berubah: {dict(ckj)}"
    # 7. semua tabel: tanpa NaN/None/inf, label 4 kode, verifikasi primer/sekunder, sumber terisi, dan daftar putih:
    #    resmi = penerbit lembaga negara RI di awal kolom sumber; primer = url penerbit sendiri (domain berita selalu sekunder)
    for nama, rows in tabel.items():
        assert rows, f"tabel kosong {nama}"
        for r in rows:
            for k, v in r.items():
                assert v is not None, f"{nama}.{k} None"
                if isinstance(v, float):
                    assert v == v and v not in (float("inf"), float("-inf")), f"{nama}.{k} NaN/inf"
            assert r["label"] in LABEL, f"{nama} label {r['label']} bukan 4 kode keyakinan"
            assert r["verifikasi"] in VERIF, f"{nama} verifikasi {r['verifikasi']}"
            assert r.get("sumber"), f"{nama} tanpa sumber {r}"
            assert r["label"] != LAB_R or r["sumber"].startswith(PENERBIT_RESMI), \
                f"{nama}: label resmi untuk penerbit di luar daftar putih: {r['sumber'][:80]}"
            if r["verifikasi"] == PRIMER:
                url = r.get("url_atau_berkas")
                assert (url.startswith(PRIMER_PUTIH) if url is not None else r["sumber"].startswith(PRIMER_TANPA_URL)), \
                    f"{nama}: verifikasi primer untuk url di luar daftar putih: {url or r['sumber'][:80]}"
                assert r["label"] != LAB_R or url is None or not url.startswith("https://earthquake.usgs.gov/"), f"{nama}: USGS resmi"
            assert r.get("turunan_penyusun", "tidak") in ("ya", "tidak"), f"{nama} turunan_penyusun"
    # 8. angka pustaka dari korpus JDIH: tiap nilai (format Indonesia) harus ada di halaman yang dirujuk
    hal = {}
    for r in rujukan["peristiwa"]:
        m = re.fullmatch(r"(data/raw/hukum/teks/[\w.-]+\.json)#halaman=(\d+)", r["url"])
        if m:
            h = hal.setdefault(m.group(1), {x["n"]: x["t"] for x in json.load(open(P(m.group(1)), encoding="utf-8"))["halaman"]})
            pola = r"(?<![\d.,])" + re.escape(fid(r["nilai"])) + r"(?![\d]|[.,]\d)"
            assert re.search(pola, h[int(m.group(2))]), f"rujukan {r['kode']} {r['metrik']} {fid(r['nilai'])} tidak ada di {r['url']}"
    assert hal, "tidak ada rujukan korpus JDIH yang diperiksa"
    # 9. angka dasbor yang dikutip di penjelasan ada di teks dasbor DIBI
    for s in ("814", "1223", "1768", "Februari"):
        assert s in dasbor, f"teks dasbor DIBI tidak lagi memuat '{s}'"
    # 10. salin-tangan buletin: tiap bulan antara 30% dan 120% DIBI bencana alam bulan itu (2024: 60-100%, 2025: 47-67% saat ditulis)
    for b in rujukan["buletin_bulanan"]["bulan"]:
        for th in (2024, 2025):
            v, d = b[f"kejadian_{th}"], kat_bulan[(th, b["bulan"], "alam")]
            assert v is None or 0.3 * d <= v <= 1.2 * d, f"buletin {th}-{b['bulan']:02d} = {v} di luar 30-120% DIBI alam {fid(d)}: salah salin?"
    # 11. angka di README sama dengan data (prosa tidak boleh basi setelah DIBI direvisi)
    cek_readme(nas_bar, prov, ringkas, kb, rek, kat_bulan, rujukan, th_tarik)
    nb = defaultdict(lambda: [0, 0])
    for x in nas:
        if not x["is_bencana"] and (x["meninggal"] or 0) > 0:
            nb[x["tahun"]][0] += 1
            nb[x["tahun"]][1] += x["meninggal"]
    print("  is_bencana=false dengan meninggal>0 (baris kelompok nasional, meninggal): " +
          (", ".join(f"{t}: {n} baris, {m} jiwa" for t, (n, m) in sorted(nb.items())) or "tidak ada"), file=sys.stderr)
    print(f"ok dibi: {len(nas_bar)} baris nasional, {len(prov_bar)} provinsi, {len(jawa)} kab Jawa (119 kab), "
          f"{len(kb)} versi kejadian besar ({len({r['kode'] for r in kb})} peristiwa), {len(rek)} baris rekonsiliasi")


def cek_readme(nas_bar, prov, ringkas, kb, rek, kat_bulan, rujukan, th_tarik):
    teks = open(README, encoding="utf-8").read()
    # bagian prosa bebas: tiap angka >= 100 (bukan tahun) atau berpemisah harus ada di data atau di penjelasan yang dibangkitkan
    ada = {fid(v) for rows in (kb, rek, nas_bar) for r in rows for v in r.values() if isinstance(v, (int, float))}
    ada |= {t for r in rek for t in re.findall(r"[\d.,]+", r["penjelasan_beda"])} | {t for r in kb for t in re.findall(r"[\d.,]+", r["catatan"])}
    for judul in ("### Patahan seri 2024", "## Kejadian besar"):
        bagian = teks.split(judul, 1)[1].split("\n## ", 1)[0]
        for t in re.findall(r"\d{1,3}(?:\.\d{3})+(?:,\d+)?|\d+,\d+|\d{3,}", bagian):
            assert t in ada or (len(t) == 4 and 1990 <= int(t) <= 2030), f"README '{judul}': angka {t} tidak ada di data/penjelasan (basi?)"
    tot = {(r["tahun"], r["cakupan"]): r for r in nas_bar if r["kategori_dibi"] == "SEMUA"}
    alam = defaultdict(lambda: defaultdict(float))
    for r in nas_bar:
        if r["klasifikasi"] == "alam" and r["cakupan"] == "bencana":
            for k in KOL:
                alam[r["tahun"]][k] += r[k]
    wajib = []
    for th in range(2015, th_tarik + 1):
        b, s = tot[(th, "bencana")], tot[(th, "semua_laporan")]
        sel = [b["kejadian"], alam[th]["kejadian"], b["meninggal"], alam[th]["meninggal"], s["meninggal"], b["hilang"],
               b["luka_sakit"], b["mengungsi"], b["menderita"], b["rumah_rusak"]]
        wajib.append(f"| {th}{'*' if th == th_tarik else ''} | " + " | ".join(fid(v) for v in sel) + " |")
    wajib.append("Versi semua laporan: " + ", ".join(f"{th} = {fid(tot[(th, 'semua_laporan')]['kejadian'])}"
                                                   for th in range(2024, th_tarik + 1)) + " kejadian.")
    jk = {j: sum(r[f"{j}__kejadian"] for r in ringkas) for j in HIDRO_JENIS}
    jm = {j: sum(r[f"{j}__meninggal"] for r in ringkas) for j in HIDRO_JENIS}
    wajib.append(f"{fid(sum(jk.values()))} kejadian = " + ", ".join(f"{HIDRO_NAMA[j]} {fid(v)}" for j, v in
                                                                  sorted(jk.items(), key=lambda x: -x[1])) + ".")
    wajib.append(f"Meninggal {fid(sum(jm.values()))}: " + ", ".join(f"{HIDRO_NAMA[j]} {fid(v)}" for j, v in
                                                                 sorted(jm.items(), key=lambda x: -x[1]) if v) + ".")
    s24, b24, s25, b25 = tot[(2024, "semua_laporan")], tot[(2024, "bencana")], tot[(2025, "semua_laporan")], tot[(2025, "bencana")]
    a9 = sum(r["kejadian"] for r in nas_bar if r["tahun"] == 2024 and r["cakupan"] == "bencana" and r["kategori_dibi"] in CKAN_KE_DIBI.values())
    bul = rujukan["buletin_bulanan"]["bulan"]
    b24n = [b for b in bul if b["kejadian_2024"] is not None]
    sem = {r["kategori_dibi"]: r["kejadian"] for r in nas_bar if r["tahun"] == 2024 and r["cakupan"] == "semua_laporan"}
    wajib += [f"| {fid(s24['kejadian'])} | DIBI semua laporan |", f"| {fid(b24['kejadian'])} | DIBI kejadian bencana |",
              f"{fid(s24['kejadian'] - b24['kejadian'])} kejadian dari laporan is_bencana=false",
              f"| {fid(alam[2024]['kejadian'])} | DIBI kejadian bencana alam (101–109) |",
              f"= DIBI kejadian bencana untuk 9 jenis alam ({fid(a9)}); {fid(b24['kejadian'] - a9)} sisanya",
              f"| {fid(sum(b['kejadian_2024'] for b in b24n))} | Buletin BNPB 2025, pembanding {len(b24n)} bulan 2024 |",
              f"DIBI bencana alam bulan yang sama {fid(sum(kat_bulan[(2024, b['bulan'], 'alam')] for b in b24n))}",
              f"({fid(sem['Banjir'])} / {fid(sem['Longsor'])} / {fid(sem['Cuaca ekstrem'])})",
              f"2025: DIBI semua laporan {fid(s25['kejadian'])} lawan kejadian bencana {fid(b25['kejadian'])} lawan bencana alam "
              f"{fid(alam[2025]['kejadian'])}", f"jumlah 12 Buletin bulanan {fid(sum(b['kejadian_2025'] for b in bul))}",
              f"meninggal 2025 = {fid(b25['meninggal'])} kejadian bencana / {fid(s25['meninggal'])} semua laporan / "
              f"{fid(alam[2025]['meninggal'])} bencana alam"]
    nbp = defaultdict(list)
    for r in prov:
        if not r["is_bencana"] and (r["meninggal"] or 0) > 0:
            nbp[r["tahun"]].append(r)
    for th, rs in sorted(nbp.items()):
        rs.sort(key=lambda r: (-r["meninggal"], r["provinsi"]))
        wajib.append(f"{th}: {fid(sum(r['meninggal'] for r in rs))} meninggal di {len(rs)} kelompok provinsi-jenis (" + "; ".join(
            f"{r['provinsi']} {r['kategori_bencana'].lower()} {fid(r['meninggal'])} meninggal dari {fid(r['n_baris'])} laporan" for r in rs) + ")")
    for x in wajib:
        assert x in teks, f"README basi atau beda dengan data; baris yang diharapkan:\n{x}"


if __name__ == "__main__":
    if sys.argv[1:] == ["tarik"]:
        baru, lama = MENTAH + ".baru", MENTAH + ".lama"
        shutil.rmtree(baru, ignore_errors=True)
        os.makedirs(baru)
        tarik(baru)
        tmp = bangun(baru)              # gagal di sini = mentah/ dan keluaran lama utuh; mentah.baru/ disimpan untuk diperiksa
        shutil.rmtree(lama, ignore_errors=True)
        os.rename(MENTAH, lama)
        os.rename(baru, MENTAH)
        pasang(tmp)
        shutil.rmtree(lama)
    else:
        pasang(bangun())
