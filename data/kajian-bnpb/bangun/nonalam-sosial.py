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
  inarisk.bnpb.go.id   apiv4/kajian-summary/covid-19/<kab>?level=kabupaten (KRB 2022-2026), kajian=bahaya dan risiko;
                       Fakfak lewat kode InaRISK 9101 (KRB_ALIAS)                       -> mentah/krb_covid19_kab.json
  WHO                  COVID-19 dashboard CSV (Indonesia), excess mortality 2020-2021 (rilis 19 Mei 2023), GHO OData
                       (imunisasi WUENIC, notifikasi TB, skor SPAR IHR)                 -> mentah/who_*.json|csv
  web.archive.org      arsip data.covid19.go.id (Satgas COVID-19): prov.json (data 30 Sep 2022) dan update.json (27 Okt 2022)
                                                                                       -> mentah/covid19goid_*.json
  data/raw/hukum/teks  korpus JDIH lokal: Renas PB 2025-2029 (Perban 1/2025) Tabel 2.2/2.5/2.6, Renstra BNPB (Perban 5/2025),
                       Perpres 17/2018 dan Perpres 46/2026 (dibaca langsung; angka dicek ke teks)
  bangun/nonalam-sosial_rujukan.json   angka pustaka yang disalin tangan + URL + tanggal akses + label (peristiwa, TPA,
                       konflik, Podes, regulasi, skenario)
  scripts/udara/kota.json              514 kab/kota (Kepmendagri 300.2.2-2138/2025)
  data/kajian-bnpb/data/dibi/mentah/dibi_nasional.json  pembanding total DIBI paket `dibi` (dilewati bila tidak ada)
  data/kajian-bnpb/data/irbi/irbi_kab_2025.csv           penduduk_2026 pembanding untuk kab yang tergabung di KRB (dilewati bila tidak ada)
Kueri DIBI dipakai ulang dari scripts/banjir/kejadian.py (superset) dan pola kab InaRISK dari bangun/skenario-hidromet.py.
"""
import csv, datetime as dt, gzip, io, json, os, re, sys, time, urllib.parse, urllib.request, zipfile
import xml.etree.ElementTree as ET
from collections import Counter, defaultdict
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
KRB_ALIAS = {"9203": "9101"}   # Kab. Fakfak: InaRISK memakai kode BPS 9101, bukan Kepmendagri 9203 (9203 membalas nol)
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
    out = {"sumber": KRB_URL, "tarik": TGL_TARIK, "alias_kode": KRB_ALIAS, "nasional": {}, "kab": {"bahaya": {}, "risiko": {}}}
    for kj in ("bahaya", "risiko"):
        out["nasional"][kj] = json.loads(ambil(KRB_URL.format(k="ALL", lv="nasional", kj=kj), batas=90))

        def satu(k):
            try:
                return k, json.loads(ambil(KRB_URL.format(k=KRB_ALIAS.get(k, k), lv="kabupaten", kj=kj), batas=90))
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


# --------------------------------------------------------------------------------------------- bangun (luring)
# Berkas mentah BPS (Podes 2024, Statistik Kriminal 2024/2025) dan WHO JEE 2023 diekstrak SEKALI dari PDF dengan PyMuPDF
# (23 Okt 2026, bukan stdlib); skrip ini hanya membacanya dan memeriksa jumlahnya. Lihat README.

sys.path.insert(0, P("scripts/banjir"))
from kejadian import kunci_nama   # noqa: E402  normalisasi nama wilayah yang sama dengan pipeline banjir dan paket dibi
from wilayah import PROVINSI      # noqa: E402  38 provinsi, kode Kemendagri

PROV_KODE = ["11", "12", "13", "14", "15", "16", "17", "18", "19", "21", "31", "32", "33", "34", "35", "36", "51", "52", "53",
             "61", "62", "63", "64", "65", "71", "72", "73", "74", "75", "76", "81", "82", "91", "92", "93", "94", "95", "96"]
PULAU = {"Sumatra": PROV_KODE[:10], "Jawa": PROV_KODE[10:16], "Bali–Nusa Tenggara": PROV_KODE[16:19],
         "Kalimantan": PROV_KODE[19:24], "Sulawesi": PROV_KODE[24:30], "Maluku": PROV_KODE[30:32], "Papua": PROV_KODE[32:]}
PULAU_PROV = {p: k for k, ps in PULAU.items() for p in ps}
PAPUA_LAMA = {"91": "91", "93": "91", "94": "91", "95": "91", "92": "92", "96": "92"}   # batas 2022: Papua, Papua Barat
_ALIAS = {kunci_nama(v): k for k, v in PROVINSI.items()}
_ALIAS.update({"DAERAHISTIMEWAYOGYAKARTA": "34", "KEPULAUANBANGKABELITUNG": "19", "ACEH": "11", "NANGGROEACEHDARUSSALAM": "11"})
KLAS = {1: "alam", 2: "nonalam", 3: "sosial", 9: "lainnya"}   # digit pertama kode jenis Juklak BNPB 7/2023
JENIS_JUKLAK = {201: "epidemi_wabah", 202: "kebakaran_gedung_permukiman", 203: "gagal_teknologi", 301: "konflik_sosial", 999: "lainnya"}
WIB = dt.timezone(dt.timedelta(hours=7))
DIBI_SUMBER = "DIBI BNPB, dibi.bnpb.go.id dasbor publik 1 (pdsi_staging.mv_dibi_dampak_by_kejadian)"
KRB_SUMBER = "InaRISK BNPB, Kajian Risiko Bencana 2022-2026, apiv4/kajian-summary/covid-19 (lisensi tidak tertulis; tulis 'Sumber: InaRISK BNPB')"


def prov_kode(nama):
    k = _ALIAS.get(kunci_nama(str(nama)))
    assert k, f"nama provinsi tidak dikenal: {nama!r}"
    return k


def baca(nama):
    return json.load(open(os.path.join(MENTAH, nama), encoding="utf-8"))


def angka(v):
    """Bilangan bulat ditulis tanpa ,0; pecahan dibulatkan 2 desimal (kejadian DIBI pecahan 1/k per kab, Juklak 7/2023)."""
    if v is None:
        return None
    v = round(float(v), 2)
    return int(v) if v.is_integer() else v


_KORPUS = {}


def korpus(berkas, hal):
    if berkas not in _KORPUS:
        d = json.load(open(os.path.join(HUKUM, berkas), encoding="utf-8"))
        _KORPUS[berkas] = {h["n"]: h["t"] for h in d["halaman"]}
    return _KORPUS[berkas][hal]


def cek_korpus(berkas, hal, potongan):
    rata = lambda s: re.sub(r"\s+", " ", s)
    assert rata(potongan) in rata(korpus(berkas, hal)), f"kutipan tidak ada di korpus {berkas} hlm {hal}: {potongan!r}"


def tulis(nama, kolom, baris):
    with open(os.path.join(OUT, nama + ".csv"), "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=kolom, lineterminator="\n", extrasaction="raise")
        w.writeheader()
        for b in baris:
            w.writerow({k: ("" if b.get(k) is None else b.get(k)) for k in kolom})
    return baris


HARI_METODE = "hari kalender inklusif (tanggal awal dan tanggal akhir ikut dihitung)"


def hari(a, b):
    """Satu konvensi untuk semua durasi paket ini: inklusif, seperti masa status 'terhitung sejak ... sampai dengan ...'."""
    return (dt.date.fromisoformat(b) - dt.date.fromisoformat(a)).days + 1


# ---------------------------------------------------------------- Renas PB 2025-2029: tabel KRB 2022-2026 per jenis bahaya
_TOKEN = re.compile(r"(?<![\w.])(\d{1,3}(?:\.\d{3})+|\d{1,3}|-)(?![\w.])")


def renas_baris(hal, label):
    """Angka pada baris tabel Renas yang memuat `label` (regex), dibaca sesudah label. '-' = 0."""
    for baris in korpus("perban-nomor-1-tahun-2025.json", hal).splitlines():
        m = re.search(label, baris)
        if m:
            return [0 if t == "-" else int(t.replace(".", "")) for t in _TOKEN.findall(baris[m.end():])]
    raise AssertionError(f"baris {label!r} tidak ada di Renas hlm {hal}")


RENAS_HARAP = {   # nilai yang diketik dari Tabel 2.2/2.5/2.6 (riset A §1.4); dibandingkan dengan hasil baca korpus
    ("COVID-19", "luas"): [187857435, 3433775, 1181863, 192473073],
    ("Epidemi dan wabah penyakit", "luas"): [190870008, 1217305, 385762, 192473075],
    ("Kegagalan teknologi", "luas"): [179546, 3794, 3600, 186940],
    ("COVID-19", "terpapar"): [272566688, 28208985, 27413330, 957980],
    ("Epidemi dan wabah penyakit", "terpapar"): [272566688, 28208985, 27413330, 957980],
    ("Kegagalan teknologi", "terpapar"): [713784, 94387, 221154, 1732],
    ("Kegagalan teknologi", "kerugian"): [584288, 0, 584288, 0],
}


def krb_nonalam():
    baca_ = {
        ("COVID-19", "luas"): renas_baris(22, r"COVID-19"),
        ("Epidemi dan wabah penyakit", "luas"): renas_baris(22, r"EPIDEMI WABAH"),
        ("Kegagalan teknologi", "luas"): renas_baris(22, r"KEGAGALAN TEKNOLOGI"),
        ("COVID-19", "terpapar"): renas_baris(24, r"\d+\s+COVID-19"),
        ("Epidemi dan wabah penyakit", "terpapar"): renas_baris(24, r"\d+\s+EPIDEMI WABAH"),
        ("Kegagalan teknologi", "terpapar"): renas_baris(24, r"\d+\s+KEGAGALAN\s{2,}"),
        ("Kegagalan teknologi", "kerugian"): renas_baris(25, r"KEGAGALAN TEKNOLOGI"),
    }
    for k, v in RENAS_HARAP.items():
        assert baca_[k] == v, f"Renas {k}: korpus {baca_[k]} != diketik {v}"
    kol = {"luas": [("luas_bahaya_rendah", "ha"), ("luas_bahaya_sedang", "ha"), ("luas_bahaya_tinggi", "ha"), ("luas_bahaya_total", "ha")],
           "terpapar": [("penduduk_terpapar", "jiwa"), ("terpapar_kelompok_umur_rentan", "jiwa"), ("terpapar_penduduk_miskin", "jiwa"),
                        ("terpapar_penduduk_disabilitas", "jiwa")],
           "kerugian": [("potensi_kerugian_fisik", "juta Rp"), ("potensi_kerugian_ekonomi", "juta Rp"), ("potensi_kerugian_total", "juta Rp"),
                        ("potensi_kerusakan_lingkungan", "ha")]}
    tabel = {"luas": ("Tabel 2.2", 22), "terpapar": ("Tabel 2.5", 24), "kerugian": ("Tabel 2.6", 25)}
    out = []
    for (bahaya, t), vals in baca_.items():
        for (m, sat), v in zip(kol[t], vals):
            out.append({"bahaya": bahaya, "metrik": m, "nilai": v, "satuan": sat,
                        "sumber": f"Renas PB 2025-2029 (Perban BNPB 1/2025) {tabel[t][0]}, sumber asli Kajian Risiko Bencana 2022-2026",
                        "url": f"data/raw/hukum/teks/perban-nomor-1-tahun-2025.json#halaman={tabel[t][1]}", "label": "resmi",
                        "catatan": "'-' di tabel ditulis 0" if v == 0 else
                        "angka ini (= terpapar COVID-19 API InaRISK) melebihi penduduk KRB karena terpapar Sulbar terhitung ganda di API "
                        "(lihat rekonsiliasi); tulis 'praktis seluruh penduduk'"
                        if m == "penduduk_terpapar" and v > 2e8 else ""})
    return out


# ---------------------------------------------------------------- DIBI
def dibi_baris():
    m = baca("dibi_nonalam_sosial.json")
    K, out = m["kolom"], []
    for b in m["baris"]:
        r = dict(zip(K, b))
        kj = r["id_tipe_bencana"] // 10
        out.append({"tanggal": dt.datetime.fromtimestamp(r["dt"] / 1000, WIB).date().isoformat() if r["dt"] else "",
                    "tahun": r["tahun"], "kode_prov": prov_kode(r["provinsi"]), "provinsi": r["provinsi"],
                    "id_kab_bps": angka(r["id_kab_bps"]), "kabupaten": r["kabupaten"], "id_tipe_bencana": r["id_tipe_bencana"],
                    "jenis_bencana": str(r["jenis_bencana"]).strip(), "kode_jenis_juklak": kj, "jenis_juklak": JENIS_JUKLAK[kj],
                    "klasifikasi": KLAS[kj // 100], "cakupan": "bencana" if r["is_bencana"] else "di_bawah_ambang",
                    **{k: float(r[k] or 0) for k in DIBI_ANGKA}, "n_baris": r["n_baris"], "catatan_penyusun": ""})   # dibulatkan saat ditulis
    out.sort(key=lambda r: (r["kode_jenis_juklak"], r["tanggal"], r["kode_prov"], str(r["id_kab_bps"]), r["id_tipe_bencana"]))
    # Tanda mutu: entri ganda subjenis (tanggal, kab, dan dampak sama, beda id_tipe dalam satu jenis Juklak)
    kunci = defaultdict(list)
    for r in out:
        kunci[(r["tanggal"], r["id_kab_bps"], r["kode_jenis_juklak"], r["meninggal"], r["luka_sakit"], r["mengungsi"])].append(r)
    for rs in kunci.values():   # termasuk dampak nol (Bima 16 Mar 2025): kejadiannya tetap terhitung dua kali
        if len(rs) > 1 and len({r["id_tipe_bencana"] for r in rs}) > 1:
            for r in rs:
                r["catatan_penyusun"] = "dugaan entri ganda: dampak identik tercatat di dua subjenis; rekap DIBI menjumlah keduanya"
    # entri identik beda tahun (Maluku Tengah 3 Apr 2025 dan 3 Apr 2026)
    mt = defaultdict(list)
    for r in out:
        mt[(r["tanggal"][5:], r["id_kab_bps"], r["kode_jenis_juklak"], r["meninggal"], r["luka_sakit"], r["rumah_rusak_berat"])].append(r)
    for rs in mt.values():
        if len({r["tahun"] for r in rs}) > 1 and any(r["meninggal"] for r in rs):
            for r in rs:
                r["catatan_penyusun"] = "dugaan entri ganda lintas tahun: tanggal-bulan, kab, meninggal, luka, dan rumah rusak berat identik"
    return out


def dibi_rekap(baris):
    met = ["jumlah_kejadian", "meninggal", "hilang", "luka_sakit", "menderita", "mengungsi", "rumah_rusak_berat", "n_baris"]
    agg = defaultdict(lambda: {k: 0 for k in met})
    for r in baris:
        for tingkat, kode in (("nasional", "00"), ("provinsi", r["kode_prov"])):
            for cak in (("semua_laporan", "bencana") if r["cakupan"] == "bencana" else ("semua_laporan",)):
                a = agg[(tingkat, kode, r["tahun"], r["kode_jenis_juklak"], cak)]
                for k in met:
                    a[k] += r[k]
    out = []
    for (tingkat, kode, th, kj, cak), a in sorted(agg.items()):
        out.append({"tingkat": tingkat, "kode_prov": kode, "provinsi": "INDONESIA" if kode == "00" else PROVINSI[kode],
                    "pulau": "" if kode == "00" else PULAU_PROV[kode], "tahun": th, "kode_jenis_juklak": kj, "jenis_juklak": JENIS_JUKLAK[kj],
                    "klasifikasi": KLAS[kj // 100], "cakupan": cak, **{k: angka(v) for k, v in a.items()},
                    "status_data": "sementara" if th >= 2026 else "final", "sumber": DIBI_SUMBER, "label": "resmi"})
    return out


def cek_dibi_paket(rekap):
    """Total row-level paket ini == agregat paket `dibi` (tarik terpisah, hari sama). Tahun berjalan boleh naik."""
    jalur = P("data/kajian-bnpb/data/dibi/mentah/dibi_nasional.json")
    if not os.path.exists(jalur):
        print("  lewati cek silang paket dibi: mentah tidak ada", file=sys.stderr)
        return 0
    ref = defaultdict(lambda: defaultdict(float))
    for r in json.load(open(jalur, encoding="utf-8"))["data"]:
        if r["id_tipe_bencana"] >= 2000:
            for cak in (("semua_laporan", "bencana") if r["is_bencana"] else ("semua_laporan",)):
                for k in ("jumlah_kejadian", "meninggal", "mengungsi", "n_baris"):
                    ref[(r["tahun"], r["id_tipe_bencana"] // 10, cak)][k] += r[k] or 0
    ini = {(r["tahun"], r["kode_jenis_juklak"], r["cakupan"]): r for r in rekap if r["tingkat"] == "nasional"}
    assert set(ref) == set(ini) or all(k[0] >= 2026 for k in set(ref) ^ set(ini)), f"kunci beda: {set(ref) ^ set(ini)}"
    for k, v in ref.items():
        for m, x in v.items():
            y = ini[k][m]
            assert (round(y, 2) == round(x, 2)) if k[0] <= 2025 else (y >= x), f"DIBI {k} {m}: paket ini {y} vs paket dibi {x}"
    return len(ref)


# ---------------------------------------------------------------- KRB COVID-19 per kab
# 6 kab lama yang tidak ada sebagai unit di KRB 2022-2026 (508 unit; API membalas nol semua): kode -> kab yang barisnya memuat wilayahnya.
# Dasar: penduduk dan luas wilayah API baris tetangga setara jumlah keduanya (diperiksa terhadap penduduk_2026 paket irbi di bangun()).
KRB_TANPA_UNIT = {"1212": "1206", "7109": "7108", "7111": "7110", "7310": "7309", "7504": "7503", "7601": "7605"}
# kab dengan terpapar > penduduk di API (Sulbar persis 2x; sisanya selisih 1 sampai 19.040 jiwa). Daftar tertutup: kab baru = gagal.
KRB_TERPAPAR_LEBIH = {"1106", "1107", "1206", "1409", "1503", "1505", "1704", "2104", "3210", "5204", "6471", "7271", "7309", "7403", "7413",
                      "7602", "7603", "7604", "7605", "7606", "9406", "9504", "9506", "9603", "9605"}


def krb_covid():
    d = baca("krb_covid19_kab.json")
    kota = {r[0]: r for r in json.load(open(P("scripts/udara/kota.json"), encoding="utf-8"))["baris"]}
    assert set(d["kab"]["bahaya"]) == set(kota) == set(d["kab"]["risiko"]), "KRB COVID: kab tidak lengkap"
    assert d.get("alias_kode") == KRB_ALIAS, f"KRB COVID: mentah ditarik tanpa alias kode {KRB_ALIAS} (Fakfak akan nol)"
    nol = {k for k, v in d["kab"]["bahaya"].items() if not v["summary"]["penduduk"]}
    assert nol == set(KRB_TANPA_UNIT), f"KRB COVID: kab berpenduduk 0 {sorted(nol)} != daftar putih {sorted(KRB_TANPA_UNIT)}"
    assert all(kota[a][2] == kota[b][2] for a, b in KRB_TANPA_UNIT.items()), "KRB COVID: kab tergabung harus satu provinsi dengan barisnya"
    dom = lambda s: "" if not s["total_luas"] else max(("rendah", "sedang", "tinggi"), key=lambda c: s[c + "_luas"])
    nm = lambda k: kota[k][1].strip()
    memuat = defaultdict(list)
    for a, b in KRB_TANPA_UNIT.items():
        memuat[b].append(nm(a))
    kab = []
    for k in sorted(kota):
        b, r = d["kab"]["bahaya"][k], d["kab"]["risiko"][k]
        sb, sr = b["summary"], r["summary"]
        kap = [c for c in ("rendah", "sedang", "tinggi") if sb["kapasitas_kabupaten"].get(c)]
        cat = [f"memuat wilayah {', '.join(memuat[k])} (penduduk dan luas wilayah API setara jumlah keduanya)"] if k in memuat else []
        if k in KRB_ALIAS:
            cat.append(f"API memakai kode InaRISK {KRB_ALIAS[k]} (kode BPS), bukan {k}")
        if sb["terpapar"] > sb["penduduk"]:
            cat.append("terpapar API > penduduk API" + (" (persis 2x: terhitung ganda di seluruh Sulbar)" if sb["terpapar"] == 2 * sb["penduduk"] else ""))
        kab.append({"kode": k, "nama": nm(k), "kode_prov": kota[k][2], "provinsi": PROVINSI[kota[k][2]],
                    "pulau": PULAU_PROV[kota[k][2]], "penduduk": sb["penduduk"], "terpapar": sb["terpapar"], "jiwa_terpapar": sb["jiwa_terpapar"],
                    "bahaya_luas_rendah": sb["rendah_luas"], "bahaya_luas_sedang": sb["sedang_luas"], "bahaya_luas_tinggi": sb["tinggi_luas"],
                    "risiko_luas_rendah": sr["rendah_luas"], "risiko_luas_sedang": sr["sedang_luas"], "risiko_luas_tinggi": sr["tinggi_luas"],
                    "kelas_bahaya_dominan": dom(sb), "kelas_risiko_dominan": dom(sr), "kapasitas_kab": kap[0] if kap else "",
                    "rs_bahaya_sedang": b["assets"]["rumah_sakit"]["sedang"], "rs_bahaya_tinggi": b["assets"]["rumah_sakit"]["tinggi"],
                    "puskesmas_bahaya_sedang": b["assets"]["puskesmas"]["sedang"], "puskesmas_bahaya_tinggi": b["assets"]["puskesmas"]["tinggi"],
                    "sekolah_bahaya_sedang": b["assets"]["sekolah"]["sedang"], "sekolah_bahaya_tinggi": b["assets"]["sekolah"]["tinggi"],
                    "sumber": KRB_SUMBER, "tarik": d["tarik"], "label": "resmi", "catatan": "; ".join(cat)})
        if k in KRB_TANPA_UNIT:   # nol API = bukan data; ditulis kosong (None), bukan 0
            kab[-1].update({m: None for m in KRB_JUMLAH}, kelas_bahaya_dominan="", kelas_risiko_dominan="", kapasitas_kab="",
                           catatan=f"tidak ada sebagai unit di KRB 2022-2026 (API membalas nol); tergabung dalam baris {nm(KRB_TANPA_UNIT[k])}")
    lebih = {r["kode"] for r in kab if r.get("penduduk") and r["terpapar"] > r["penduduk"]}
    assert lebih == KRB_TERPAPAR_LEBIH, f"KRB COVID: kab terpapar > penduduk berubah: baru {sorted(lebih - KRB_TERPAPAR_LEBIH)}, hilang {sorted(KRB_TERPAPAR_LEBIH - lebih)}"
    for r in kab:   # peringatan (bukan assert): penduduk KRB jauh di atas kolom jiwa kota.json
        j = kota[r["kode"]][5]
        if r.get("penduduk") and j and r["penduduk"] / j > 1.6:
            print(f"  peringatan KRB {r['kode']} {r['nama']}: penduduk {r['penduduk']} = {r['penduduk'] / j:.2f}x jiwa kota.json {j}", file=sys.stderr)
    return kab, d["nasional"]


KRB_JUMLAH = ["penduduk", "terpapar", "jiwa_terpapar", "bahaya_luas_rendah", "bahaya_luas_sedang", "bahaya_luas_tinggi", "risiko_luas_rendah",
              "risiko_luas_sedang", "risiko_luas_tinggi", "rs_bahaya_sedang", "rs_bahaya_tinggi", "puskesmas_bahaya_sedang",
              "puskesmas_bahaya_tinggi", "sekolah_bahaya_sedang", "sekolah_bahaya_tinggi"]


def krb_wilayah(kab, nas):
    out = []
    sb, sr = nas["bahaya"]["summary"], nas["risiko"]["summary"]
    ab = nas["bahaya"]["assets"]
    api = {"penduduk": sb["penduduk"], "terpapar": sb["terpapar"], "jiwa_terpapar": sb["jiwa_terpapar"],
           "bahaya_luas_rendah": sb["rendah_luas"], "bahaya_luas_sedang": sb["sedang_luas"], "bahaya_luas_tinggi": sb["tinggi_luas"],
           "risiko_luas_rendah": sr["rendah_luas"], "risiko_luas_sedang": sr["sedang_luas"], "risiko_luas_tinggi": sr["tinggi_luas"],
           "rs_bahaya_sedang": ab["rumah_sakit"]["sedang"], "rs_bahaya_tinggi": ab["rumah_sakit"]["tinggi"],
           "puskesmas_bahaya_sedang": ab["puskesmas"]["sedang"], "puskesmas_bahaya_tinggi": ab["puskesmas"]["tinggi"],
           "sekolah_bahaya_sedang": ab["sekolah"]["sedang"], "sekolah_bahaya_tinggi": ab["sekolah"]["tinggi"]}
    out.append({"tingkat": "nasional_api", "kode": "00", "nama": "INDONESIA (kajian-summary ALL)", **api, "n_kab": "",
                "kab_kapasitas_rendah": sb["kapasitas_kabupaten"]["rendah"], "kab_kapasitas_sedang": sb["kapasitas_kabupaten"]["sedang"],
                "kab_kapasitas_tinggi": sb["kapasitas_kabupaten"]["tinggi"], "kab_risiko_dominan_sedang_tinggi": ""})
    grup = [("nasional_jumlah_kab", lambda r: "00", lambda k: "INDONESIA (jumlah 514 kab)"),
            ("pulau", lambda r: r["pulau"], lambda k: k), ("provinsi", lambda r: r["kode_prov"], lambda k: PROVINSI[k])]
    for tingkat, kf, nf in grup:
        g = defaultdict(list)
        for r in kab:
            g[kf(r)].append(r)
        for k in (sorted(g) if tingkat != "pulau" else list(PULAU)):
            rs = g[k]
            out.append({"tingkat": tingkat, "kode": k if tingkat != "pulau" else "", "nama": nf(k),
                        **{m: sum(r[m] or 0 for r in rs) for m in KRB_JUMLAH}, "n_kab": len(rs),
                        "kab_kapasitas_rendah": sum(r["kapasitas_kab"] == "rendah" for r in rs),
                        "kab_kapasitas_sedang": sum(r["kapasitas_kab"] == "sedang" for r in rs),
                        "kab_kapasitas_tinggi": sum(r["kapasitas_kab"] == "tinggi" for r in rs),
                        "kab_risiko_dominan_sedang_tinggi": sum(r["kelas_risiko_dominan"] in ("sedang", "tinggi") for r in rs)})
    for r in out:
        r.update({"sumber": KRB_SUMBER, "label": "resmi", "metode": "jumlah kab penyusun" if r["tingkat"] != "nasional_api" else "API",
                  "catatan": "" if r["terpapar"] <= r["penduduk"] else
                  "terpapar > penduduk: API menghitung ganda terpapar 5 kab Sulbar (persis 2x) dan selisih 1-19.040 jiwa di 20 kab lain; "
                  "tulis 'praktis seluruh penduduk', bukan angka presisi" if r["kode"] == "00" else
                  "terpapar > penduduk di API untuk kab penyusun (lihat catatan krb_covid19_kab.csv)"})
    return out


# ---------------------------------------------------------------- COVID-19
EXCESS_METODE = ("estimasi model WHO: kematian berlebih semua sebab dikurangi kematian akibat guncangan lain (konflik/bencana alam), "
                 "Methods §7; dibulatkan")
EXCESS_CATATAN = ("selalu tulis sebagai rentang (rerata dengan selang 95%); galat = selang 95% di baris batas_bawah/batas_atas; Indonesia tidak punya "
                  "data kematian semua sebab bulanan nasional, WHO memodelkan dari data bulanan Jakarta dan data tahunan historis (Methods §5.1); "
                  "WHO: bukan statistik resmi nasional")


def covid_tabel(rj, krb_kab):
    out = []
    tambah = lambda **k: out.append({"metrik": "", "periode": "", "tanggal_data": "", "nilai": None, "satuan": "", "sumber": "", "url": "",
                                     "diakses": TGL_TARIK, "label": "", "metode": "", "catatan": "", **k})
    who = list(csv.DictReader(open(os.path.join(MENTAH, "who_covid19_idn.csv"), encoding="utf-8")))
    for v in rj["covid_versi"]:
        cek_korpus(*v["cek_korpus"])
        # Renstra tidak menyebut tanggal potong: pekan WHO yang mengapit angka itu dicatat sebagai pembanding
        kk = "Cumulative_cases" if v["metrik"] == "kasus_terkonfirmasi" else "Cumulative_deaths"
        i = next(i for i, r in enumerate(who) if int(r[kk]) >= v["nilai"])
        a, b = who[i - 1], who[i]
        assert "2023-06-01" <= a["Date_reported"] < b["Date_reported"] <= "2023-07-31", f"COVID {v['metrik']}: tanggal potong WHO bergeser dari akhir Jun 2023"
        tambah(metrik=v["metrik"], periode=v["periode"], nilai=v["nilai"], satuan=v["satuan"], sumber=v["sumber"], url=v["url"],
               label=v["label"], metode="dicek ke korpus JDIH lokal",
               catatan=f"{v['catatan']}; pembanding WHO: kumulatif {a['Date_reported']} = {a[kk]}, {b['Date_reported']} = {b[kk]}")
    # Satgas COVID-19 (data.covid19.go.id), arsip Wayback
    up = baca("covid19goid_update.json")
    u, url_up = up["isi"]["update"], up["sumber"]
    sat = "Satgas Penanganan COVID-19 / Kemenkes, data.covid19.go.id update.json (arsip Wayback 27 Okt 2022)"
    tambah(metrik="kasus_terkonfirmasi", periode="kumulatif", tanggal_data=u["penambahan"]["tanggal"], nilai=u["total"]["jumlah_positif"],
           satuan="kasus", sumber=sat, url=url_up, label="resmi")
    tambah(metrik="meninggal", periode="kumulatif", tanggal_data=u["penambahan"]["tanggal"], nilai=u["total"]["jumlah_meninggal"],
           satuan="jiwa", sumber=sat, url=url_up, label="resmi")
    th = defaultdict(lambda: [0, 0])
    kum930 = None
    for h in u["harian"]:
        tgl = h["key_as_string"][:10]
        th[tgl[:4]][0] += h["jumlah_positif"]["value"]
        th[tgl[:4]][1] += h["jumlah_meninggal"]["value"]
        if tgl == "2022-09-30":
            kum930 = (h["jumlah_positif_kum"]["value"], h["jumlah_meninggal_kum"]["value"])
    akhir = u["harian"][-1]
    assert akhir["jumlah_positif_kum"]["value"] == sum(v[0] for v in th.values()) == u["total"]["jumlah_positif"], "covid19.go.id: kumulatif kasus != jumlah harian"
    assert akhir["jumlah_meninggal_kum"]["value"] == sum(v[1] for v in th.values()) == u["total"]["jumlah_meninggal"], "covid19.go.id: kumulatif meninggal != jumlah harian"
    for y in sorted(th):
        per = f"{y} (s.d. {akhir['key_as_string'][:10]})" if y == akhir["key_as_string"][:4] else y
        tambah(metrik="kasus_baru_per_tahun", periode=per, nilai=th[y][0], satuan="kasus", sumber=sat, url=url_up, label="resmi",
               metode="jumlah harian")
        tambah(metrik="meninggal_per_tahun", periode=per, nilai=th[y][1], satuan="jiwa", sumber=sat, url=url_up, label="resmi",
               metode="jumlah harian")
    tambah(metrik="kasus_terkonfirmasi", periode="kumulatif", tanggal_data="2022-09-30", nilai=kum930[0], satuan="kasus", sumber=sat,
           url=url_up, label="resmi", catatan="tanggal yang sama dengan data per provinsi")
    tambah(metrik="meninggal", periode="kumulatif", tanggal_data="2022-09-30", nilai=kum930[1], satuan="jiwa", sumber=sat, url=url_up,
           label="resmi", catatan="tanggal yang sama dengan data per provinsi")
    # WHO dashboard
    ws ="WHO COVID-19 dashboard (data dilaporkan negara), WHO-COVID-19-global-data.csv"
    nb = lambda r, k: int(r[k] or 0)
    assert int(who[-1]["Cumulative_cases"]) == sum(nb(r, "New_cases") for r in who), "WHO: kumulatif kasus != jumlah mingguan"
    assert int(who[-1]["Cumulative_deaths"]) == sum(nb(r, "New_deaths") for r in who), "WHO: kumulatif kematian != jumlah mingguan"
    terakhir = max((r for r in who if r["New_cases"] or r["New_deaths"]), key=lambda r: r["Date_reported"])
    tambah(metrik="kasus_terkonfirmasi", periode="kumulatif", tanggal_data=who[-1]["Date_reported"], nilai=int(who[-1]["Cumulative_cases"]),
           satuan="kasus", sumber=ws, url=WHO_CSV, label="terverifikasi", catatan=f"laporan mingguan terakhir yang berisi {terakhir['Date_reported']}")
    tambah(metrik="meninggal", periode="kumulatif", tanggal_data=who[-1]["Date_reported"], nilai=int(who[-1]["Cumulative_deaths"]),
           satuan="jiwa", sumber=ws, url=WHO_CSV, label="terverifikasi")
    wy = defaultdict(lambda: [0, 0])
    for r in who:
        wy[r["Date_reported"][:4]][0] += nb(r, "New_cases")
        wy[r["Date_reported"][:4]][1] += nb(r, "New_deaths")
    for y in sorted(wy):
        if wy[y][0] or wy[y][1]:
            tambah(metrik="kasus_baru_per_tahun", periode=y, nilai=wy[y][0], satuan="kasus", sumber=ws, url=WHO_CSV, label="terverifikasi",
                   metode="jumlah mingguan menurut tanggal laporan")
            tambah(metrik="meninggal_per_tahun", periode=y, nilai=wy[y][1], satuan="jiwa", sumber=ws, url=WHO_CSV, label="terverifikasi",
                   metode="jumlah mingguan menurut tanggal laporan")
    pk = max(who, key=lambda r: nb(r, "New_deaths"))
    pk_akhir = dt.date.fromisoformat(pk["Date_reported"])
    pk_awal = pk_akhir - dt.timedelta(days=6)
    # tanggal laporan WHO = hari terakhir pekan; cocokkan dengan jumlah harian covid19.go.id pekan yang sama
    harian = {h["key_as_string"][:10]: h["jumlah_meninggal"]["value"] for h in u["harian"]}
    assert sum(harian[(pk_awal + dt.timedelta(days=i)).isoformat()] for i in range(7)) == nb(pk, "New_deaths"), "WHO minggu puncak != jumlah harian covid19.go.id"
    tambah(metrik="meninggal_minggu_puncak", periode=f"pekan {pk_awal} s.d. {pk_akhir}", tanggal_data=pk["Date_reported"], nilai=nb(pk, "New_deaths"),
           satuan="jiwa/minggu", sumber=ws, url=WHO_CSV, label="terverifikasi",
           catatan=f"gelombang Delta; tanggal laporan WHO {pk_akhir} = hari terakhir pekan; jumlah harian covid19.go.id {pk_awal} s.d. {pk_akhir} sama persis")
    # WHO excess mortality
    ex = baca("who_excess_idn.json")
    nilai_ex = {}
    for r in ex["baris"]:
        nilai_ex[r["C"]] = [float(r[c]) for c in "DEF"]
        for c, nm in zip("DEF", ("rerata", "batas_bawah_95", "batas_atas_95")):
            tambah(metrik=f"kematian_berlebih_{nm}", periode=r["C"], nilai=round(float(r[c])), satuan="jiwa",
                   sumber="WHO, Estimates of excess mortality associated with COVID-19 pandemic (as of 5 April 2023), rilis 19 Mei 2023",
                   url=WHO_GEM, label="estimasi-model", metode=EXCESS_METODE, catatan=EXCESS_CATATAN)
    assert abs(nilai_ex["2020"][0] + nilai_ex["2021"][0] - nilai_ex["2020-2021"][0]) < 1, "WHO excess: 2020+2021 != 2020-2021"
    # durasi status bencana nasional nonalam
    reg = {r["regulasi"].split()[0] + " " + r["regulasi"].split()[1]: r for r in rj["regulasi"]}
    a, b = reg["Keppres 12/2020"]["tanggal_penetapan"], reg["Keppres 17/2023"]["tanggal_berlaku"]
    tambah(metrik="durasi_status_bencana_nasional", periode=f"{a} s.d. {b}", nilai=hari(a, b), satuan="hari",
           sumber="Keppres 12/2020 (ditetapkan 13 Apr 2020) dan Keppres 17/2023 (berlaku 21 Jun 2023)", url=reg["Keppres 17/2023"]["url"],
           label="resmi", metode=HARI_METODE,
           catatan=f"tanggal akhir = tanggal berlaku Keppres 17/2023; bila hari berlakunya tidak dihitung sebagai hari berstatus: {hari(a, b) - 1}")
    # per provinsi (34 provinsi lama, data 30 Sep 2022)
    pv = baca("covid19goid_prov.json")
    pen = defaultdict(int)
    for r in krb_kab:
        pen[PAPUA_LAMA.get(r["kode_prov"], r["kode_prov"])] += r["penduduk"] or 0   # kab tanpa unit KRB: penduduknya ada di baris tetangga provinsi yang sama
    prov = []
    for x in pv["isi"]["list_data"]:
        k = prov_kode(x["key"])
        prov.append({"kode_prov_2022": k, "provinsi": PROVINSI[k], "nama_sumber": x["key"], "pulau": PULAU_PROV[k], "kasus": x["jumlah_kasus"],
                     "sembuh": x["jumlah_sembuh"], "meninggal": x["jumlah_meninggal"], "dirawat": x["jumlah_dirawat"],
                     "cfr_persen": round(100 * x["jumlah_meninggal"] / x["jumlah_kasus"], 2), "penduduk_krb": pen[k],
                     "meninggal_per_100rb": round(1e5 * x["jumlah_meninggal"] / pen[k], 1), "tanggal_data": pv["isi"]["last_date"],
                     "sumber": "Satgas Penanganan COVID-19, data.covid19.go.id prov.json (arsip Wayback 29 Nov 2022); penduduk: InaRISK KRB 2022-2026",
                     "url": pv["sumber"], "label": "resmi",
                     "metode": "cfr = meninggal/kasus; per 100 rb = meninggal / penduduk KRB (kab baru Papua dijumlah ke batas 2022)"})
    prov.sort(key=lambda r: r["kode_prov_2022"])
    assert len(prov) == 34 and len({r["kode_prov_2022"] for r in prov}) == 34, "COVID provinsi: harus 34 provinsi batas 2022"
    sk, sm = sum(r["kasus"] for r in prov), sum(r["meninggal"] for r in prov)
    assert abs(sk - kum930[0]) / kum930[0] < 1e-3 and abs(sm - kum930[1]) / kum930[1] < 1e-3, \
        f"COVID provinsi: jumlah {sk}/{sm} beda > 0,1% dari nasional {kum930} per 30 Sep 2022"
    assert all(0 < r["cfr_persen"] < 10 for r in prov)
    return out, prov, {"prov_kasus": sk, "prov_meninggal": sm, "nas_kasus_20220930": kum930[0], "nas_meninggal_20220930": kum930[1],
                       "tanpa_provinsi": pv["isi"].get("tanpa_provinsi")}


# ---------------------------------------------------------------- indikator (IHR, layanan kesehatan, TPA, konflik nasional)
JEE_BEDA = {"P3.3", "P8.3", "R4.1"}   # PDF JEE 2023 tidak konsisten: tabel ringkasan 3/5/3, bagian rinci 4/4/4


def jee_sebaran(kunci):
    c = Counter(r[kunci] for r in baca("who_jee2023_idn.json")["indikator"])
    return {f"skor_{s}": c.get(s, 0) for s in range(5, 0, -1)}


def indikator_tabel(rj):
    out = []
    j = baca("who_jee2023_idn.json")
    assert len(j["indikator"]) == 56 and len({r["area"] for r in j["indikator"]}) == 19, "JEE 2023: harus 56 indikator di 19 area"
    assert all(1 <= r["skor"] <= 5 and 1 <= r["skor_tabel_ringkasan"] <= 5 for r in j["indikator"])
    beda = {r["kode"] for r in j["indikator"] if r["skor"] != r["skor_tabel_ringkasan"]}
    assert beda == JEE_BEDA, f"JEE 2023: indikator yang beda antara bagian rinci dan tabel ringkasan {sorted(beda)} != {sorted(JEE_BEDA)}"
    for r in j["indikator"]:
        cat = ["skor dari bagian rinci 'Indicators and scores' (skor berdampingan dengan dasar penilaiannya)",
               "tidak boleh dibandingkan dengan JEE 2017 (edisi 1) menurut WHO"]
        if r["kode"] in JEE_BEDA:
            cat.insert(1, f"tabel ringkasan 'Indonesia: scores and priority actions' di PDF yang sama memberi {r['skor_tabel_ringkasan']} (lihat rekonsiliasi)")
        if r.get("catatan_who"):
            cat.insert(1, r["catatan_who"])
        out.append({"tema": "pandemi_kesiapsiagaan", "indikator": f"JEE {r['kode']} {r['area_nama']}: {r['indikator']}", "kode": r["kode"],
                    "tahun": 2023, "nilai": r["skor"], "satuan": "skor 1-5", "sumber": "WHO, JEE IHR Indonesia 16-20 Okt 2023 (terbit 8 Nov 2024), alat edisi 3",
                    "url": "https://www.who.int/publications/i/item/9789240095151", "label": "terverifikasi", "catatan": "; ".join(cat)})
    g = baca("who_gho_idn.json")
    gho_url = "https://ghoapi.azureedge.net/api/{}?$filter=SpatialDim eq 'IDN'"
    for kode, ed in (("SDGIHR2018", "edisi 1"), ("SDGIHR2021", "edisi 2")):
        for x in sorted(g["data"][kode], key=lambda x: x["TimeDim"]):
            if kode == "SDGIHR2018" or x["Dim1"] == "IHRSPARCAPACITYLEVEL_TOTL":
                assert 0 <= x["NumericValue"] <= 100
                out.append({"tema": "pandemi_kesiapsiagaan", "indikator": f"SPAR IHR skor kapasitas inti rata-rata ({ed})", "kode": kode,
                            "tahun": x["TimeDim"], "nilai": angka(x["NumericValue"]), "satuan": "%", "sumber": "WHO GHO, State Party self-assessment Annual Reporting (SPAR)",
                            "url": gho_url.format(kode), "label": "terverifikasi",
                            "catatan": "penilaian mandiri Pemerintah RI yang dilaporkan ke WHO; edisi 1 (2018-2020) dan 2 (2021-) tidak sebanding"})
    for kode in ("WHS4_100", "WHS8_110"):
        for x in sorted(g["data"][kode], key=lambda x: x["TimeDim"]):
            out.append({"tema": "pandemi_dampak_layanan", "indikator": GHO_IND[kode], "kode": kode, "tahun": x["TimeDim"],
                        "nilai": angka(x["NumericValue"]), "satuan": "%", "sumber": "WHO/UNICEF Estimates of National Immunization Coverage (WUENIC), via WHO GHO",
                        "url": gho_url.format(kode), "label": "terverifikasi", "catatan": ""})
    for x in sorted(g["data"]["TB_notif_num"], key=lambda x: x["TimeDim"]):
        if x["Dim1"] == "TB_CASETYPE_TB_CASETYPE_ALL":
            out.append({"tema": "pandemi_dampak_layanan", "indikator": GHO_IND["TB_notif_num"], "kode": "TB_notif_num", "tahun": x["TimeDim"],
                        "nilai": angka(x["NumericValue"]), "satuan": "orang", "sumber": "WHO Global TB Programme, via WHO GHO",
                        "url": gho_url.format("TB_notif_num"), "label": "terverifikasi", "catatan": "semua tipe kasus"})
    tpa = {r["indikator"]: r["nilai"] for r in rj["tpa_open_dumping"]}
    assert tpa["tpa_wajib_hentikan_open_dumping"] + tpa["tpa_dihentikan_operasionalnya"] + tpa["kewajiban_memiliki_tpa"] \
        == tpa["tpa_disanksi_2025"] + tpa["tpa_disanksi_jan2026"] == tpa["tpa_disanksi_administratif"], "TPA: jenis sanksi tidak menjumlah ke 273"
    for r in rj["tpa_open_dumping"]:
        out.append({"tema": "tpa_open_dumping", "indikator": r["indikator"], "kode": "", "tahun": r["tahun"], "nilai": r["nilai"],
                    "satuan": r["satuan"], "sumber": r["sumber"], "url": r["url"], "label": r["label"],
                    "catatan": (r.get("nilai_teks", "") + " " + r["catatan"]).strip()})
    return out


# ---------------------------------------------------------------- konflik: BPS Podes
def podes_tabel():
    pd_, lp = baca("bps_podes2024_gangguan_keamanan.json"), baca("bps_kriminal2025_lampiran26.json")
    rows = pd_["baris"]
    prov, nas = rows[:-1], rows[-1]
    assert len(prov) == 38 and {r["kode"] for r in prov} == set(PROV_KODE) and nas["provinsi"] == "INDONESIA"
    for t, n in (("1.1", 3), ("18.1", 7), ("18.2", 3)):
        assert [sum(r[t][c] for r in prov) for c in range(n)] == nas[t], f"Podes tabel {t}: jumlah provinsi != INDONESIA"
    assert nas["1.1"] == [514, 7281, 84276], "Podes 2024: harus 514 kab/kota dan 84.276 desa/kelurahan"
    l26 = {kunci_nama(r["provinsi"]): r for r in lp["baris"]}
    l26_nas = l26.pop("INDONESIA")
    assert l26_nas["desa_2021"] == sum(r["desa_2021"] or 0 for r in l26.values()) == 1553, "Lampiran 26: jumlah 2021 != 1.553"
    assert l26_nas["desa_2024"] == nas["18.2"][0] == 2031, "Lampiran 26 2024 != Podes 2024 tabel 18.2"
    alias26 = {"KEPBANGKABELITUNG": "19"}
    k26 = {(alias26.get(k) or prov_kode(k)): r for k, r in l26.items()}
    assert set(k26) == set(PROV_KODE)
    jenis = pd_["tabel"]["18.1"]["kolom"]
    out = []
    for r in prov + [nas]:
        k = r["kode"]
        lr = l26_nas if k == "00" else k26[k]
        persen = round(100 * r["18.2"][0] / r["1.1"][2], 2)
        assert abs(persen - lr["persen_2024"]) <= 0.011, f"Podes {r['provinsi']}: persen dihitung {persen} vs BPS {lr['persen_2024']}"
        assert lr["desa_2024"] == r["18.2"][0], f"Podes {r['provinsi']}: tabel 18.2 vs Lampiran 26"
        out.append({"kode_prov": k, "provinsi": r["provinsi"], "pulau": "" if k == "00" else PULAU_PROV[k], "kab_kota": r["1.1"][0],
                    "desa_kelurahan_2024": r["1.1"][2], "desa_perkelahian_massal_2024": r["18.2"][0], "persen_2024": lr["persen_2024"],
                    "desa_perkelahian_massal_2021": lr["desa_2021"], "persen_2021": lr["persen_2021"],
                    "desa_korban_meninggal_2024": r["18.2"][1], "desa_korban_luka_2024": r["18.2"][2],
                    **{f"jenis_{j}": v for j, v in zip(jenis, r["18.1"])},
                    "sumber": "BPS: Statistik Potensi Desa Indonesia 2024 (Tabel 1.1, 18.1, 18.2) dan Statistik Kriminal 2024/2025 (Lampiran 26)",
                    "url": "https://www.bps.go.id/id/publication/2024/12/10/2f5217e2d6a695a0830290a7/statistik-potensi-desa-indonesia-2024.html",
                    "label": "resmi", "catatan": "2021 kosong = provinsi belum dimekarkan (batas lama)" if lr["desa_2021"] is None else ""})
    return out, nas


# ---------------------------------------------------------------- peristiwa (gagal teknologi, TPA, konflik, epidemi)
DIBI_PERISTIWA = [("meninggal", "jiwa"), ("hilang", "jiwa"), ("luka_sakit", "jiwa"), ("mengungsi", "jiwa"), ("menderita", "jiwa"),
                  ("rumah_rusak_berat", "unit")]


# KERANGKA M01 dan §10: kerusuhan sosial = konflik antarkelompok (UU 24/2007 Pasal 1 angka 4; UU 7/2012 Pasal 1 angka 1). Baris di bawah
# tetap disimpan sebagai catatan, ditandai luar_lingkup, dan tidak boleh dipakai di kartu skenario (dicek skenario_tabel).
LUAR_LINGKUP = {"mei1998": "kerusuhan berhadapan dengan aparat/negara dan dugaan pelanggaran HAM (Komnas HAM), bukan konflik antarkelompok (KERANGKA M01)",
                "kerusuhan2025": "unjuk rasa berhadapan dengan aparat (urusan keamanan dan ketertiban, UU 2/2002 Pasal 13); hanya celah pencatatan DIBI (KERANGKA M01)"}
METRIK_TIDAK_DIPAKAI = {"korban_perkosaan_terverifikasi": "metrik perkosaan tidak dipakai kajian (KERANGKA M01)"}


def peristiwa_tabel(rj, dibi):
    out = []
    kol = ["jenis", "kode", "nama", "tanggal", "prov", "lokasi", "metrik", "nilai", "nilai_teks", "satuan", "sumber", "url", "diakses",
           "label", "asal", "lingkup", "catatan"]
    for r in rj["peristiwa"]:
        if r["metrik"] in METRIK_TIDAK_DIPAKAI:
            continue
        base = {k: r.get(k, "") for k in kol}
        base.update({"diakses": TGL_TARIK, "asal": "rujukan", "nilai_teks": r.get("nilai_teks", ""),
                     "lingkup": "luar_lingkup" if r["kode"] in LUAR_LINGKUP else "dalam"})
        if r["kode"] in LUAR_LINGKUP:
            base["catatan"] = "; ".join(x for x in (LUAR_LINGKUP[r["kode"]], base["catatan"]) if x)
        if r["metrik"] == "dibi":
            p = r["dibi"]
            cocok = [x for x in dibi if x["id_kab_bps"] == p["id_kab_bps"] and x["tanggal"] == p["tanggal"] and x["id_tipe_bencana"] in p["id_tipe"]]
            assert len(cocok) == 1, f"peristiwa {r['kode']}: penunjuk DIBI cocok {len(cocok)} baris (harus 1)"
            x = cocok[0]
            for m, sat in DIBI_PERISTIWA:
                if x[m]:
                    out.append({**base, "metrik": m, "nilai": angka(x[m]), "satuan": sat, "url": DIBI_URL, "asal": "DIBI",
                                "sumber": f"{DIBI_SUMBER}; baris {x['tanggal']} {x['kabupaten']}, jenis '{x['jenis_bencana']}', cakupan {x['cakupan']}"})
            continue
        if r.get("hitung"):
            assert r["satuan"] == "hari" and "nilai" not in r, f"peristiwa {r['kode']} {r['metrik']}: durasi dihitung skrip, jangan diketik"
            base["nilai"] = hari(*r["hitung"])
            base["catatan"] = "; ".join(x for x in (f"durasi {r['hitung'][0]} s.d. {r['hitung'][1]}, {HARI_METODE}", r.get("catatan", "")) if x)
        out.append(base)
    for o in out:
        assert o["label"] in LABEL | {"narasi"}, f"label tidak sah: {o}"
        assert (o["nilai"] in (None, "")) == (o["label"] == "narasi"), f"baris narasi harus tanpa angka dan sebaliknya: {o['kode']} {o['metrik']}"
        assert o["sumber"], o
        assert o["metrik"] not in METRIK_TIDAK_DIPAKAI, o
    assert {o["kode"] for o in out if o["lingkup"] == "luar_lingkup"} == set(LUAR_LINGKUP), "kode LUAR_LINGKUP tidak cocok dengan rujukan"
    return kol, out


# ---------------------------------------------------------------- regulasi
def regulasi_tabel(rj):
    kol = ["regulasi", "pasal", "pokok", "relevansi_bnpb", "tanggal_penetapan", "tanggal_berlaku", "tanggal_berakhir", "status", "sumber", "url",
           "diakses", "label", "catatan"]
    out = []
    for r in rj["regulasi"]:
        if r.get("cek_korpus"):
            cek_korpus(*r["cek_korpus"])
        for k in ("tanggal_penetapan", "tanggal_berlaku", "tanggal_berakhir"):
            if r.get(k):
                dt.date.fromisoformat(r[k])
        out.append({**{k: r.get(k, "") for k in kol}, "diakses": TGL_TARIK})
    return kol, out


# ---------------------------------------------------------------- skenario terburuk yang masuk akal
def skenario_tabel(rj, covid, krbn, ind, podes_nas, rekap, peristiwa):
    out = [{**{k: r.get(k, "") for k in ("jenis", "komponen", "nilai", "satuan", "nilai_teks", "sumber", "url", "label")}, "dasar": "rujukan"}
           for r in rj["skenario"]]

    def ambil(rows, **f):
        x = [r for r in rows if all(r.get(k) == v for k, v in f.items())]
        assert len(x) == 1, f"skenario: {f} cocok {len(x)}"
        assert x[0].get("lingkup") != "luar_lingkup", f"skenario: baris luar lingkup dipakai di kartu: {f} ({LUAR_LINGKUP.get(x[0].get('kode'))})"
        return x[0]

    def dari(jenis, komponen, r, nilai_key="nilai", teks="", dasar="analog"):
        out.append({"jenis": jenis, "komponen": komponen, "nilai": r[nilai_key], "satuan": r.get("satuan", ""), "nilai_teks": teks,
                    "sumber": r["sumber"], "url": r.get("url", ""), "label": r["label"], "dasar": dasar})

    c = lambda **f: ambil(covid, **f)
    per = rj["covid_versi"][0]["periode"]
    dari("epidemi_pandemi", "korban_jiwa_resmi_analog_covid19", c(metrik="meninggal", periode=per))
    dari("epidemi_pandemi", "korban_jiwa_berlebih_analog_covid19_rerata", c(metrik="kematian_berlebih_rerata", periode="2020-2021"),
         teks="estimasi model WHO 2020-2021, tanpa kematian akibat konflik/bencana alam; selalu tulis sebagai rentang (selang 95% di dua baris berikut)")
    dari("epidemi_pandemi", "korban_jiwa_berlebih_analog_covid19_batas_bawah", c(metrik="kematian_berlebih_batas_bawah_95", periode="2020-2021"))
    dari("epidemi_pandemi", "korban_jiwa_berlebih_analog_covid19_batas_atas", c(metrik="kematian_berlebih_batas_atas_95", periode="2020-2021"))
    dari("epidemi_pandemi", "kasus_analog_covid19", c(metrik="kasus_terkonfirmasi", periode=per))
    dari("epidemi_pandemi", "kematian_minggu_puncak", c(metrik="meninggal_minggu_puncak"))
    dari("epidemi_pandemi", "durasi_status_bencana_nasional", c(metrik="durasi_status_bencana_nasional"))
    k = lambda b, m: ambil(krbn, bahaya=b, metrik=m)
    dari("epidemi_pandemi", "penduduk_terpapar_krb", k("COVID-19", "penduduk_terpapar"), dasar="KRB 2022-2026",
         teks="tulis 'praktis seluruh penduduk', bukan angka presisi: terpapar KRB melebihi penduduk KRB (271.680.290) karena terpapar 5 kab Sulbar terhitung ganda")
    dari("epidemi_pandemi", "luas_bahaya_tinggi_krb", k("COVID-19", "luas_bahaya_tinggi"), dasar="KRB 2022-2026")
    dari("epidemi_pandemi", "luas_bahaya_sedang_krb", k("COVID-19", "luas_bahaya_sedang"), dasar="KRB 2022-2026")
    i = lambda **f: ambil(ind, **f)
    for kode, t in (("WHS4_100", 2019), ("WHS4_100", 2021), ("WHS8_110", 2019), ("WHS8_110", 2021), ("TB_notif_num", 2019), ("TB_notif_num", 2020)):
        r = i(kode=kode, tahun=t)
        dari("epidemi_pandemi", f"imateriil_layanan_{kode}_{t}", r, teks=r["indikator"])
    for kom, m in (("luas_bahaya_total_krb", "luas_bahaya_total"), ("luas_bahaya_tinggi_krb", "luas_bahaya_tinggi"),
                   ("penduduk_terpapar_krb", "penduduk_terpapar"), ("potensi_kerugian_fisik_krb", "potensi_kerugian_fisik")):
        dari("gagal_teknologi", kom, k("Kegagalan teknologi", m), dasar="KRB 2022-2026")
    p = lambda **f: ambil(peristiwa, **f)
    dari("gagal_teknologi", "analog_plumpang2023_meninggal_hari2", p(kode="plumpang2023", metrik="meninggal", nilai=17))
    dari("gagal_teknologi", "analog_plumpang2023_meninggal_18mar", p(kode="plumpang2023", metrik="meninggal", nilai=29))
    dari("gagal_teknologi", "analog_plumpang2023_pengungsi", p(kode="plumpang2023", metrik="mengungsi", nilai=1085))
    dari("gagal_teknologi", "analog_morowali2023_meninggal", p(kode="morowali2023", metrik="meninggal", nilai=20))
    dari("kebakaran_tpa", "analog_2023_tpa_terbakar_serentak", p(kode="tpa2023nasional", metrik="tpa_terbakar_hebat"))
    dari("kebakaran_tpa", "analog_sarimukti_kk_terdampak_asap", p(kode="sarimukti2023", metrik="kk_terdampak_asap"))
    dari("kebakaran_tpa", "analog_sarimukti_status_kab_hari", p(kode="sarimukti2023", metrik="status_tanggap_darurat_kab"))
    dari("kebakaran_tpa", "analog_bandung_darurat_sampah_hari", p(kode="sarimukti2023", metrik="status_tanggap_darurat_sampah_kota_bandung"))
    dari("kebakaran_tpa", "analog_suwung_luas_ha", p(kode="suwung2023", metrik="luas_terbakar"))
    dari("kebakaran_tpa", "kerentanan_tpa_belum_berhenti_open_dumping", i(indikator="tpa_belum_berhenti_open_dumping"))
    dari("kebakaran_tpa", "kerentanan_jumlah_tpa_nasional", i(indikator="jumlah_tpa_nasional"))
    for kode, kom in (("maluku1999", "analog_maluku_meninggal_bawah"), ("poso1998", "analog_poso_meninggal"), ("sampit2001", "analog_sampit_meninggal")):
        dari("konflik_sosial", kom, p(kode=kode, metrik="meninggal"))
    dari("konflik_sosial", "analog_maluku_meninggal_atas", p(kode="maluku1999", metrik="meninggal_batas_atas"))
    dari("konflik_sosial", "analog_maluku_pengungsi", p(kode="maluku1999", metrik="mengungsi"))
    dari("konflik_sosial", "analog_pengungsi_nasional_2001", p(kode="pengungsi2001", metrik="mengungsi_tercatat_resmi"))
    out.append({"jenis": "konflik_sosial", "komponen": "peringatan_dini_desa_perkelahian_2024", "nilai": podes_nas["18.2"][0], "satuan": "desa",
                "nilai_teks": "2,41% dari 84.276 desa/kelurahan; 2021: 1.553 (1,85%)", "sumber": "BPS Podes 2024; Statistik Kriminal 2024/2025",
                "url": "https://www.bps.go.id/id/publication/2025/12/12/2edc8ea4c35b19ba912fc7e4/statistik-kriminal-2024-2025.html",
                "label": "resmi", "dasar": "tren"})
    k26 = [r for r in rekap if r["tingkat"] == "nasional" and r["kode_jenis_juklak"] == 301 and r["cakupan"] == "bencana" and r["tahun"] == 2026]
    if k26:
        for m, sat in (("meninggal", "jiwa"), ("mengungsi", "jiwa")):
            out.append({"jenis": "konflik_sosial", "komponen": f"dibi_2026_{m}", "nilai": k26[0][m], "satuan": sat,
                        "nilai_teks": f"konflik sosial 2026 (sementara, {angka(k26[0]['jumlah_kejadian'])} kejadian); memuat baris Jayawijaya 7 Mei 2026 yang bertanggal hari jembatan Wouma putus (kemungkinan memuat korban jembatan) dan dugaan entri ganda Maluku Tengah 3 Apr 2026 (4 meninggal)",
                        "sumber": DIBI_SUMBER, "url": DIBI_URL, "label": "resmi", "dasar": "tren"})
    for o in out:
        assert o["label"] in LABEL | {"narasi"} and o["sumber"], o
        assert (o["nilai"] in (None, "")) == (o["label"] == "narasi"), o
        assert "cfr" not in o["komponen"] or o["label"] == "narasi", f"skenario: CFR berangka di samping penduduk terpapar mengundang perkalian: {o}"
    kom = {o["komponen"] for o in out}
    for o in out:   # estimasi kematian berlebih tidak boleh tampil tanpa selangnya
        if "berlebih" in o["komponen"]:
            akar = re.sub(r"_(rerata|batas_bawah|batas_atas)$", "", o["komponen"])
            assert o["label"] == "estimasi-model" and {f"{akar}_{b}" for b in ("rerata", "batas_bawah", "batas_atas")} <= kom, o
    return out


# ---------------------------------------------------------------- rekonsiliasi
def rekonsiliasi_tabel(covid, prov_cek, peristiwa, ind, dibi, krb_w, kab):
    out = []
    tambah = lambda topik, versi, nilai, satuan, sumber, label, penjelasan: out.append(
        {"topik": topik, "versi": versi, "nilai": nilai, "satuan": satuan, "sumber": sumber, "label": label, "penjelasan": penjelasan})
    for m in ("meninggal", "kasus_terkonfirmasi"):
        for r in covid:
            if r["metrik"] == m and r["periode"].startswith("kumulatif"):
                tambah(f"COVID-19 {m} kumulatif", r["tanggal_data"] or r["periode"], r["nilai"], r["satuan"], r["sumber"], r["label"],
                       "beda tanggal potong dan pemutakhiran; angka utama = Kemenkes 2024 (Renstra)")
    for r in covid:
        if r["metrik"].startswith("kematian_berlebih_rerata"):
            tambah("COVID-19 meninggal: terkonfirmasi lawan kematian berlebih", r["periode"], r["nilai"], r["satuan"], r["sumber"], r["label"],
                   "estimasi model WHO (selang 95% di covid19_nasional.csv; selalu tulis sebagai rentang): kematian berlebih semua sebab dikurangi kematian "
                   "akibat konflik/bencana alam; mencakup kematian tak terdiagnosis dan dampak tidak langsung; bukan statistik resmi")
    tambah("COVID-19 per provinsi lawan nasional (30 Sep 2022)", "jumlah 34 provinsi: kasus", prov_cek["prov_kasus"], "kasus",
           "data.covid19.go.id prov.json", "resmi", f"nasional {prov_cek['nas_kasus_20220930']}; 'tanpa_provinsi' = {prov_cek['tanpa_provinsi']}")
    tambah("COVID-19 per provinsi lawan nasional (30 Sep 2022)", "jumlah 34 provinsi: meninggal", prov_cek["prov_meninggal"], "jiwa",
           "data.covid19.go.id prov.json", "resmi", f"nasional {prov_cek['nas_meninggal_20220930']}; selisih tidak dijelaskan sumber")
    g = defaultdict(list)
    for r in peristiwa:
        if r["nilai"] not in (None, ""):
            g[(r["kode"], r["lokasi"], r["metrik"])].append(r)
    for (kode, lokasi, m), rs in sorted(g.items()):
        if len({r["nilai"] for r in rs}) > 1:
            for r in rs:
                tambah(f"{r['nama']} ({lokasi}): {m}", r["asal"], r["nilai"], r["satuan"], r["sumber"], r["label"],
                       "angka bergerak menurut tanggal laporan dan instansi pencatat; dahulukan versi resmi/DIBI, versi berita hanya pembanding")
    # versi lintas metrik yang setara (meninggal_tenggelam vs DIBI meninggal, dst.) dicatat manual
    tambah("Wamena Mei 2026", "DIBI 'Konflik Sosial' 7 Mei 2026", next(r["nilai"] for r in peristiwa if r["kode"] == "wamena2026" and r["metrik"] == "meninggal"),
           "jiwa", DIBI_SUMBER, "resmi", "tanggal = hari jembatan gantung Wouma putus (24 jenazah tenggelam menurut Polres); korban jembatan kemungkinan terhitung sebagai korban konflik. Kerusuhan Agt 2025: DIBI hanya mencatat Manokwari (1), Komnas HAM 11")
    tambah("Kebakaran TPA Sarimukti: luas", "BNPB: 80% lahan / Media Indonesia: 16,5 ha", None, "", "lihat peristiwa.csv", "narasi",
           "satuan berbeda (persen lahan TPST lawan hektare); luas TPST tidak disebut di sumber")
    o = {r["indikator"]: r for r in ind if r["tema"] == "tpa_open_dumping"}
    for key in ("tpa_diawasi_awal_2025", "tpa_diawasi_2025_feb2026", "jumlah_tpa_nasional", "tpa_belum_berhenti_open_dumping"):
        tambah("Jumlah TPA open dumping", key, o[key]["nilai"], o[key]["satuan"], o[key]["sumber"], o[key]["label"],
               "basis berbeda (diawasi, disanksi, total); rilis 17 Apr 2026: 30% dari 485 berhenti tetapi 369 belum (= 24% berhenti)")
    for r in dibi:
        if r["catatan_penyusun"]:
            tambah(f"DIBI {r['jenis_bencana']} {r['kabupaten']} {r['tanggal']}", f"id_tipe {r['id_tipe_bencana']}", angka(r["meninggal"]), "jiwa meninggal",
                   DIBI_SUMBER, "resmi", r["catatan_penyusun"])
    tambah("Klasifikasi DIBI 'gagal teknologi'", "isi baris 2025-2026", None, "", "peristiwa.csv; dibi_nonalam_sosial_baris.csv", "narasi",
           "memuat runtuhnya bangunan ponpes (Sidoarjo), dugaan tabrakan KA (Kota Bekasi, 'Kecelakaan Industri'), dugaan kejadian pantai (Gunungkidul); "
           "kebakaran kilang/depo (Balongan 2021, Plumpang 2023) dan smelter Morowali 2023 tidak ada barisnya; kebakaran TPA tidak punya jenis tersendiri")
    nas_api = next(r for r in krb_w if r["tingkat"] == "nasional_api")
    nas_kab = next(r for r in krb_w if r["tingkat"] == "nasional_jumlah_kab")
    ff = next(r for r in kab if r["kode"] in KRB_ALIAS)
    gabung = ", ".join(f"{r['nama']} -> {next(x['nama'] for x in kab if x['kode'] == KRB_TANPA_UNIT[r['kode']])}" for r in kab if r["kode"] in KRB_TANPA_UNIT)
    for m, sat in (("penduduk", "jiwa"), ("bahaya_luas_rendah", "ha"), ("bahaya_luas_tinggi", "ha"), ("kab_kapasitas_rendah", "kab")):
        tambah(f"KRB COVID-19 {m}: API nasional lawan jumlah 514 kab", "API ALL", nas_api[m], sat, KRB_SUMBER, "resmi",
               f"jumlah 514 kab = {nas_kab[m]} (selisih {nas_api[m] - nas_kab[m]}; luas berselisih <= 5 ha karena pembulatan per kab). "
               f"Tanpa alias kode, selisihnya sama dengan baris {ff['nama']} (kode InaRISK {KRB_ALIAS[ff['kode']]}): {ff['penduduk']} jiwa, "
               f"{ff['bahaya_luas_rendah']} ha bahaya rendah (luas +-1 ha pembulatan), 1 kab kapasitas {ff['kapasitas_kab']}. "
               f"6 kab lama tanpa unit KRB terhitung di baris lain: {gabung}")
    sul = [r for r in kab if r.get("penduduk") and r["terpapar"] == 2 * r["penduduk"]]
    assert {r["kode_prov"] for r in sul} == {"76"} and len(sul) == 5, "KRB COVID: pola terpapar 2x harus tepat 5 kab Sulbar yang punya unit"
    tambah("KRB COVID-19 terpapar lawan penduduk", "API ALL: terpapar", nas_api["terpapar"], "jiwa", KRB_SUMBER, "resmi",
           f"penduduk API {nas_api['penduduk']}; terpapar 5 kab Sulbar persis 2x penduduk (kelebihan {sum(r['penduduk'] for r in sul)} jiwa) dan 20 kab lain "
           f"selisih kecil, sehingga terpapar nasional (= Renas Tabel 2.5) melebihi penduduk. Di naskah: 'praktis seluruh penduduk', bukan 272,6 juta sebagai angka presisi")
    js = {r["kode"]: r for r in baca("who_jee2023_idn.json")["indikator"]}
    for kd in sorted(JEE_BEDA):
        for versi, kunci in (("bagian rinci 'Indicators and scores' (dipakai)", "skor"), ("tabel ringkasan 'Indonesia: scores and priority actions'", "skor_tabel_ringkasan")):
            tambah(f"JEE 2023 {kd}: tabel ringkasan lawan bagian rinci", versi, js[kd][kunci], "skor 1-5", "WHO 2024, JEE IHR Indonesia (PDF sha256 39d3ceca...)",
                   "terverifikasi", "PDF tidak konsisten di dalam dirinya, WHO tidak menjelaskan; paket memakai bagian rinci karena skornya berdampingan dengan dasar penilaian")
    for versi, kunci in (("bagian rinci (dipakai)", "skor"), ("tabel ringkasan", "skor_tabel_ringkasan")):
        sb = jee_sebaran(kunci)
        tambah("JEE 2023 sebaran skor 56 indikator", versi, None, "", "WHO 2024, JEE IHR Indonesia", "narasi",
               ", ".join(f"{n} {k.replace('_', ' ')}" for k, n in sb.items() if n))
    tambah("JEE 2017 lawan JEE 2023", "edisi alat 1 lawan 3", None, "", "WHO 2024", "narasi", "WHO: membandingkan skor kedua JEE 'invalid and contraindicated'")
    return out


# ---------------------------------------------------------------- utama
def cek_tergabung(kab):
    """Bukti KRB_TANPA_UNIT: penduduk API baris tetangga ~ penduduk_2026 (paket irbi) tetangga + kab yang tergabung, dan jauh di atas tetangga sendiri."""
    jalur = P("data/kajian-bnpb/data/irbi/irbi_kab_2025.csv")
    if not os.path.exists(jalur):
        print("  lewati cek kab tergabung: irbi_kab_2025.csv tidak ada", file=sys.stderr)
        return 0
    pen = {r["kode"]: float(r["penduduk_2026"]) for r in csv.DictReader(open(jalur, encoding="utf-8"))}
    api = {r["kode"]: r["penduduk"] for r in kab}
    for a, b in KRB_TANPA_UNIT.items():
        gab, sendiri = api[b] / (pen[a] + pen[b]), api[b] / pen[b]
        assert 0.85 <= gab <= 1.1 and sendiri >= 1.3, f"KRB {b} memuat {a}? rasio gabungan {gab:.2f}, sendiri {sendiri:.2f}"
    return len(KRB_TANPA_UNIT)


def cek_baris(nama, kolom, baris, wajib_angka=()):
    for b in baris:
        for k in kolom:
            v = b.get(k)
            assert not (isinstance(v, float) and (v != v or v in (float("inf"), float("-inf")))), f"{nama}: NaN/inf di {k}: {b}"
        for k in wajib_angka:
            assert isinstance(b.get(k), (int, float)), f"{nama}: {k} kosong/bukan angka: {b}"
        if "label" in kolom:
            assert b["label"] in LABEL | {"narasi"}, f"{nama}: label tidak sah {b['label']}"
        if "sumber" in kolom:
            assert b.get("sumber"), f"{nama}: sumber kosong: {b}"
        u = b.get("url") or ""
        if u.startswith("http"):   # URL harus menunjuk halaman yang bisa dibuka, bukan akar domain
            p = urllib.parse.urlparse(u)
            assert p.path.strip("/") or p.query, f"{nama}: url hanya akar domain: {u}"


def bangun():
    os.makedirs(OUT, exist_ok=True)
    rj = json.load(open(RUJUKAN, encoding="utf-8"))
    tabel, kolom = {}, {}

    def simpan_tabel(nama, kol, baris, wajib=()):
        cek_baris(nama, kol, baris, wajib)
        tulis(nama, kol, baris)
        tabel[nama], kolom[nama] = baris, kol

    krbn = krb_nonalam()
    kab, nas = krb_covid()
    assert len(kab) == 514 and sum(r["kode_prov"] in PULAU["Jawa"] for r in kab) == 119, "KRB COVID: harus 514 kab, 119 di Jawa"
    podes, podes_nas = podes_tabel()
    kab_per_prov = defaultdict(int)
    for r in kab:
        kab_per_prov[r["kode_prov"]] += 1
    assert all(kab_per_prov[r["kode_prov"]] == r["kab_kota"] for r in podes if r["kode_prov"] != "00"), "jumlah kab per provinsi: kota.json != BPS Podes 2024"
    krbw = krb_wilayah(kab, nas)
    na, nk = krbw[0], krbw[1]
    for m in KRB_JUMLAH + ["kab_kapasitas_rendah", "kab_kapasitas_sedang", "kab_kapasitas_tinggi"]:   # jumlah 514 kab (dengan alias) = API ALL
        toleransi = 5 if "luas" in m else 0   # luas: pembulatan ha per kab (selisih terukur 1-4 ha)
        assert abs(nk[m] - na[m]) <= toleransi, f"KRB COVID {m}: jumlah 514 kab {nk[m]} != API nasional {na[m]} (selisih {na[m] - nk[m]})"
    n_tergabung = cek_tergabung(kab)
    for m_api, m_renas in (("terpapar", "penduduk_terpapar"), ("bahaya_luas_rendah", "luas_bahaya_rendah"),
                           ("bahaya_luas_sedang", "luas_bahaya_sedang"), ("bahaya_luas_tinggi", "luas_bahaya_tinggi")):
        rv = next(r["nilai"] for r in krbn if r["bahaya"] == "COVID-19" and r["metrik"] == m_renas)
        assert na[m_api] == rv, f"KRB COVID {m_api}: API {na[m_api]} != Renas {rv}"
    dibi = dibi_baris()
    rekap = dibi_rekap(dibi)
    n_cek = cek_dibi_paket(rekap)
    covid, cprov, cprov_cek = covid_tabel(rj, kab)
    ind = indikator_tabel(rj)
    kp, pr = peristiwa_tabel(rj, dibi)
    kr, reg = regulasi_tabel(rj)

    simpan_tabel("covid19_nasional", list(covid[0]), covid, ["nilai"])
    simpan_tabel("covid19_provinsi", list(cprov[0]), cprov, ["kasus", "meninggal", "cfr_persen", "meninggal_per_100rb"])
    simpan_tabel("indikator", list(ind[0]), ind)
    cek_baris("krb_covid19_kab", list(kab[0]), [r for r in kab if r["kode"] not in KRB_TANPA_UNIT], ["penduduk", "bahaya_luas_tinggi", "risiko_luas_tinggi"])
    simpan_tabel("krb_covid19_kab", list(kab[0]), kab)
    simpan_tabel("krb_covid19_wilayah", list(krbw[1]), krbw, ["penduduk", "terpapar"])
    simpan_tabel("krb_nonalam_nasional", list(krbn[0]), krbn, ["nilai"])
    dibi_tulis = [{**r, **{k: angka(r[k]) for k in DIBI_ANGKA}} for r in dibi]
    simpan_tabel("dibi_nonalam_sosial_baris", list(dibi[0]), dibi_tulis, ["meninggal", "jumlah_kejadian"])
    simpan_tabel("dibi_nonalam_sosial_rekap", list(rekap[0]), rekap, ["meninggal", "jumlah_kejadian", "n_baris"])
    simpan_tabel("peristiwa", kp, pr)
    simpan_tabel("konflik_podes_provinsi", list(podes[0]), podes, ["desa_perkelahian_massal_2024", "persen_2024"])
    simpan_tabel("regulasi", kr, reg)
    sk = skenario_tabel(rj, covid, krbn, ind, podes_nas, rekap, pr)
    simpan_tabel("skenario_terburuk", ["jenis", "komponen", "nilai", "satuan", "nilai_teks", "dasar", "sumber", "url", "label"], sk)
    rk = rekonsiliasi_tabel(covid, cprov_cek, pr, ind, dibi, krbw, kab)
    simpan_tabel("rekonsiliasi", list(rk[0]), rk)

    meta = {"paket": "nonalam-sosial", "tarik": TGL_TARIK,   # tanpa jam bangun: keluaran deterministik, uji ulang tidak mengotori tree
            "skrip": "data/kajian-bnpb/bangun/nonalam-sosial.py", "rujukan": "data/kajian-bnpb/bangun/nonalam-sosial_rujukan.json",
            "label": {"resmi": "instansi pemerintah RI", "terverifikasi": "sumber primer non-pemerintah RI yang dibuka (WHO, ICG, HRW, Brookings)",
                      "estimasi-model": "estimasi model statistik yang belum diuji balik di paket ini: kematian berlebih WHO 2020-2021 (galat = selang 95%)",
                      "asumsi-kebijakan": "tidak dipakai",
                      "sekunder": "berita yang mengutip pejabat; bukan angka utama", "narasi": "baris tanpa angka"},
            "cek_silang_dibi_kunci": n_cek, "covid_provinsi_lawan_nasional": cprov_cek, "krb_kab_tergabung_dicek_irbi": n_tergabung,
            "jee2023_sebaran": {"bagian_rinci_dipakai": jee_sebaran("skor"), "tabel_ringkasan": jee_sebaran("skor_tabel_ringkasan")},
            "jumlah_baris": {k: len(v) for k, v in tabel.items()}}
    with open(os.path.join(OUT, "nonalam_sosial.json"), "w", encoding="utf-8") as f:
        json.dump({"meta": meta, "kolom": kolom, "tabel": tabel}, f, ensure_ascii=False, indent=1)
    # JSON = CSV (satu sumber): baca ulang keduanya dari disk dan bandingkan per sel
    js = json.load(open(os.path.join(OUT, "nonalam_sosial.json"), encoding="utf-8"))
    sel = lambda v: "" if v is None else str(v)
    for nama, rows in js["tabel"].items():
        with open(os.path.join(OUT, nama + ".csv"), encoding="utf-8") as f:
            cs = list(csv.DictReader(f))
        assert len(cs) == len(rows) and list(cs[0]) == js["kolom"][nama], f"{nama}: CSV != JSON (baris/kolom)"
        for i, (c, j) in enumerate(zip(cs, rows)):
            for k in js["kolom"][nama]:
                assert c[k] == sel(j.get(k)), f"{nama} baris {i} kolom {k}: CSV {c[k]!r} != JSON {j.get(k)!r}"
    print(json.dumps(meta["jumlah_baris"], ensure_ascii=False), file=sys.stderr)
    print("self-check hijau", file=sys.stderr)


if __name__ == "__main__":
    if sys.argv[1:2] == ["tarik"]:
        tarik(ulang=True)
    bangun()
