#!/usr/bin/env python3
"""Paket `nonalam-sosial`: bencana nonalam (pandemi, gagal teknologi, kebakaran TPA) dan sosial (konflik, kerusuhan)
untuk Bab 8-9 dan Lampiran C/G *Grand Design Mitigasi Bencana Indonesia 2026-2030* (kajian Kepala BNPB, Okt 2026).

Jalankan dari akar repo:
  python3 data/kajian-bnpb/bangun/nonalam-sosial.py tarik   # tarik ulang sumber jaringan ke data/.../nonalam-sosial/mentah/, lalu bangun
  python3 data/kajian-bnpb/bangun/nonalam-sosial.py         # bangun luring dari mentah/ + rujukan + self-check assert
Python 3 stdlib saja. Silsilah, label, dan keterbatasan: data/kajian-bnpb/data/nonalam-sosial/README.md.

Masukan:
  dibi.bnpb.go.id      Superset dasbor publik 1: baris id_tipe_bencana >= 2000 (epidemi, kebakaran permukiman, gagal teknologi,
                       konflik sosial, lainnya) per tanggal x kab                       -> mentah/dibi_nonalam_sosial.json
  inarisk.bnpb.go.id   apiv4/kajian-summary/covid-19/<kab>?level=kabupaten (KRB 2022-2026), kajian=bahaya dan risiko
                                                                                       -> mentah/krb_covid19_kab.json
  WHO                  COVID-19 dashboard CSV (Indonesia), excess mortality 2020-2021 (rilis 19 Mei 2023), GHO OData
                       (imunisasi WUENIC, notifikasi TB, skor SPAR IHR)                 -> mentah/who_*.json|csv
  web.archive.org      arsip data.covid19.go.id (Satgas COVID-19): prov.json (data 30 Sep 2022) dan update.json (27 Okt 2022)
                                                                                       -> mentah/covid19goid_*.json
  data/raw/hukum/teks  korpus JDIH lokal: Renas PB 2025-2029 (Perban 1/2025) Tabel 2.2/2.5/2.6, Renstra BNPB (Perban 5/2025),
                       Perpres 17/2018 dan Perpres 46/2026 (dibaca langsung; angka dicek ke teks)
  bangun/nonalam-sosial_rujukan.json   angka pustaka yang disalin tangan + URL + tanggal akses + label (peristiwa, TPA,
                       konflik, Podes, regulasi, skenario)
  scripts/udara/kota.json              514 kab/kota (Kepmendagri 300.2.2-2138/2025)
  data/kajian-bnpb/data/dibi/mentah/dibi_nasional.json, dibi_prov.json  pembanding total DIBI paket `dibi`
Kueri DIBI dipakai ulang dari scripts/banjir/kejadian.py (superset) dan pola kab InaRISK dari bangun/skenario-hidromet.py.
"""
import csv, datetime as dt, gzip, io, json, os, re, sys, time, urllib.request, zipfile
import xml.etree.ElementTree as ET
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", ".."))
P = lambda *a: os.path.join(ROOT, *a)
OUT = P("data/kajian-bnpb/data/nonalam-sosial")
MENTAH = os.path.join(OUT, "mentah")
RUJUKAN = P("data/kajian-bnpb/bangun/nonalam-sosial_rujukan.json")
HUKUM = P("data/raw/hukum/teks")
TGL_TARIK = "2026-10-23"
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36"
LABEL = {"resmi", "terverifikasi", "estimasi-model", "asumsi-kebijakan", "sekunder"}

DIBI_URL = "https://dibi.bnpb.go.id/api/v1/chart/data"
DIBI_KOLOM = ["dt", "tahun", "id_provinsi_bps", "provinsi", "id_kab_bps", "kabupaten", "id_tipe_bencana", "jenis_bencana",
              "kategori_bencana", "is_bencana"]
DIBI_ANGKA = ["jumlah_kejadian", "meninggal", "hilang", "luka_sakit", "menderita", "mengungsi", "rumah_rusak_berat",
              "rumah_rusak_sedang", "rumah_rusak_ringan", "pendidikan_rusak", "fasyankes_rusak", "fasum_rusak"]
KRB_URL = "https://inarisk.bnpb.go.id/apiv4/kajian-summary/covid-19/{k}?level={lv}&kajian={kj}"
WHO_CSV = "https://srhdpeuwpubsa.blob.core.windows.net/whdh/COVID/WHO-COVID-19-global-data.csv"
WHO_GEM = ("https://cdn.who.int/media/docs/default-source/world-health-data-platform/covid-19-excessmortality/"
           "2023-05-19_covid-19_gem.zip?sfvrsn=9a95fc1a_4")
GHO = "https://ghoapi.azureedge.net/api/{c}?$filter=SpatialDim%20eq%20'IDN'"
GHO_IND = {"WHS4_100": "imunisasi DTP3 anak 1 tahun (%) WUENIC", "WHS8_110": "imunisasi campak MCV1 anak 1 tahun (%) WUENIC",
           "TB_notif_num": "notifikasi kasus TB episode baru (orang)", "SDGIHR2018": "skor rata-rata 13 kapasitas inti IHR, SPAR edisi 1",
           "SDGIHR2021": "skor kapasitas inti IHR, SPAR edisi 2"}
ARSIP = {"covid19goid_prov.json": "https://web.archive.org/web/20221129135753id_/https://data.covid19.go.id/public/api/prov.json",
         "covid19goid_update.json": "https://web.archive.org/web/20221027173342id_/https://data.covid19.go.id/public/api/update.json"}


# --------------------------------------------------------------------------------------------- tarik (jaringan)

def ambil(url, data=None, coba=4, batas=300):
    for i in range(coba):
        try:
            req = urllib.request.Request(url, data=data, headers={"User-Agent": UA, "Accept-Encoding": "identity",
                                                                  **({"Content-Type": "application/json"} if data else {})})
            with urllib.request.urlopen(req, timeout=batas) as r:
                b = r.read()
            return gzip.decompress(b) if b[:2] == b"\x1f\x8b" else b   # arsip Wayback kadang mengirim gzip mentah
        except Exception as e:
            if i == coba - 1:
                raise
            print(f"  ulang {url[:80]}: {e}", file=sys.stderr)
            time.sleep(3 * (i + 1))


def simpan(nama, obj):
    os.makedirs(MENTAH, exist_ok=True)
    with open(os.path.join(MENTAH, nama), "w", encoding="utf-8") as f:
        json.dump(obj, f, ensure_ascii=False, separators=(",", ":"))


def tarik_dibi():
    badan = {"datasource": {"id": 1, "type": "table"}, "form_data": {"slice_id": 1, "dashboardId": 1},
             "queries": [{"columns": DIBI_KOLOM, "metrics": [{"expressionType": "SQL", "sqlExpression": f"SUM({m})", "label": m}
                                                              for m in DIBI_ANGKA] + [{"expressionType": "SQL",
                                                                                       "sqlExpression": "COUNT(*)", "label": "n_baris"}],
                          "filters": [{"col": "id_tipe_bencana", "op": ">=", "val": 2000}], "row_limit": 50000, "orderby": []}],
             "result_format": "json", "result_type": "full"}
    rows = json.loads(ambil(DIBI_URL, json.dumps(badan).encode()))["result"][0]["data"]
    assert len(rows) < 50000, "DIBI: batas baris Superset tercapai"
    kol = DIBI_KOLOM + DIBI_ANGKA + ["n_baris"]
    simpan("dibi_nonalam_sosial.json", {"sumber": DIBI_URL + " (dasbor publik 1, tabel pdsi_staging.mv_dibi_dampak_by_kejadian; "
                                        "saring id_tipe_bencana >= 2000; dikelompokkan per kolom, SUM)", "tarik": TGL_TARIK,
                                        "kolom": kol, "baris": [[r.get(k) for k in kol] for r in rows]})
    print(f"dibi: {len(rows)} baris", file=sys.stderr)


def tarik_krb():
    kota = [r[0] for r in json.load(open(P("scripts/udara/kota.json"), encoding="utf-8"))["baris"]]
    out = {"sumber": KRB_URL, "tarik": TGL_TARIK, "nasional": {}, "kab": {"bahaya": {}, "risiko": {}}}
    for kj in ("bahaya", "risiko"):
        out["nasional"][kj] = json.loads(ambil(KRB_URL.format(k="ALL", lv="nasional", kj=kj), batas=90))

        def satu(k):
            try:
                return k, json.loads(ambil(KRB_URL.format(k=k, lv="kabupaten", kj=kj), batas=90))
            except Exception as e:
                print(f"  krb {kj} {k}: {e}", file=sys.stderr)
                return k, None
        with ThreadPoolExecutor(4) as ex:   # ponytail: 4 jalur; turunkan bila InaRISK membalas 429
            for k, o in ex.map(satu, kota):
                if isinstance(o, dict) and "summary" in o:
                    out["kab"][kj][k] = o
        print(f"krb covid-19 {kj}: {len(out['kab'][kj])}/{len(kota)} kab", file=sys.stderr)
    simpan("krb_covid19_kab.json", out)


NS = "{http://schemas.openxmlformats.org/spreadsheetml/2006/main}"


def xlsx_baris(isi, lembar):
    """Pembaca xlsx minimal (stdlib): baris lembar ke-n sebagai dict kolom -> nilai teks."""
    z = zipfile.ZipFile(io.BytesIO(isi))
    ss = [''.join(t.text or '' for t in si.iter(NS + 't')) for si in ET.fromstring(z.read('xl/sharedStrings.xml')).findall(NS + 'si')]
    for r in ET.fromstring(z.read(f'xl/worksheets/sheet{lembar}.xml')).iter(NS + 'row'):
        out = {}
        for c in r.findall(NS + 'c'):
            v = c.find(NS + 'v')
            if v is not None:
                out[re.match(r'[A-Z]+', c.get('r')).group(0)] = ss[int(v.text)] if c.get('t') == 's' else v.text
        yield out


def tarik_who():
    teks = ambil(WHO_CSV).decode("utf-8")
    baris = [l for l in teks.splitlines() if l.startswith("Date_reported") or ",ID,Indonesia," in l]
    os.makedirs(MENTAH, exist_ok=True)
    open(os.path.join(MENTAH, "who_covid19_idn.csv"), "w", encoding="utf-8").write("\n".join(baris) + "\n")
    zz = zipfile.ZipFile(io.BytesIO(ambil(WHO_GEM)))
    nama = next(n for n in zz.namelist() if n.endswith("EstimatesByCountry.xlsx"))
    gem = [r for r in xlsx_baris(zz.read(nama), 2) if r.get("B") == "IDN"]
    simpan("who_excess_idn.json", {"sumber": WHO_GEM, "berkas": nama, "lembar": "Deaths by year", "tarik": TGL_TARIK,
                                   "kolom": {"C": "year", "D": "excess.mean", "E": "excess.low (95%)", "F": "excess.high (95%)"},
                                   "baris": gem})
    gho = {}
    for c in GHO_IND:
        gho[c] = [{k: x.get(k) for k in ("TimeDim", "Dim1", "Dim2", "NumericValue", "Date")}
                  for x in json.loads(ambil(GHO.format(c=c)))["value"]]
    simpan("who_gho_idn.json", {"sumber": GHO, "tarik": TGL_TARIK, "indikator": GHO_IND, "data": gho})
    print("who: selesai", file=sys.stderr)


def tarik_arsip():
    for nama, url in ARSIP.items():   # Wayback membalas 429 bila dipukul beruntun: jeda panjang
        simpan(nama, {"sumber": url, "tarik": TGL_TARIK, "isi": json.loads(ambil(url))})
        time.sleep(20)


def tarik(ulang=False):
    """Tiap sumber ditarik hanya bila berkas mentahnya belum ada (atau ulang=True)."""
    ada = lambda n: not ulang and os.path.exists(os.path.join(MENTAH, n))
    for berkas, f in [("dibi_nonalam_sosial.json", tarik_dibi), ("who_gho_idn.json", tarik_who),
                      ("covid19goid_update.json", tarik_arsip), ("krb_covid19_kab.json", tarik_krb)]:
        if not ada(berkas):
            f()
