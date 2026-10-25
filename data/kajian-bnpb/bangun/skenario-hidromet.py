"""Paket data skenario-hidromet (kajian BNPB Okt 2026): skenario terburuk yang masuk akal untuk bencana hidrometeorologi.

Keluaran: data/kajian-bnpb/data/skenario-hidromet/ (CSV UTF-8 koma + JSON), silsilah di README.md folder itu.

  python3 data/kajian-bnpb/bangun/skenario-hidromet.py          bangun dari cache mentah (tarik yang belum ada)
  python3 data/kajian-bnpb/bangun/skenario-hidromet.py --tarik  tarik ulang semua sumber jaringan (InaRISK KRB, DIBI, SiPongi, ONI)
  python3 data/kajian-bnpb/bangun/skenario-hidromet.py uji      self-check fungsi murni tanpa jaringan

Cache mentah (dibekukan per tanggal tarik, dibaca ulang tanpa jaringan). Tanggal tarik dibaca dari cache, bukan ditulis mati:
  riset/mentah/krb_kab/<bahaya>.json      InaRISK apiv4/kajian-summary/<bahaya>/<kode>?level=kabupaten, 514 kab; kunci "tarik"
  riset/mentah/dibi_hidromet.json         DIBI Superset (dasbor publik 1), baris per kab-tanggal-jenis, SUM dampak; kunci "tarik",
                                          daftar jenis DIBI (nama, n baris) di kunci "jenis" + "jenis_tarik"
  riset/mentah/sipongi_luas_2015_2026.json Kementerian Kehutanan (SiPongi; sebelum Okt 2024 KLHK) luas kebakaran per provinsi; tarik = mtime berkas
  riset/mentah/oni_cpc.txt                NOAA CPC oni.ascii.txt; tarik = mtime berkas
Stdlib saja. Mesin simulasi kekeringan (public/kekeringan/simulasi.js) dijalankan lewat `node` (sudah dipakai uji neraca.py).
"""
import csv, datetime as dt, json, math, os, statistics, subprocess, sys, time, urllib.request
from concurrent.futures import ThreadPoolExecutor

AKAR = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "../../.."))
KAJ = os.path.join(AKAR, "data/kajian-bnpb")
MENTAH = os.path.join(KAJ, "riset/mentah")
KELUAR = os.path.join(KAJ, "data/skenario-hidromet")
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36"

# ---------------------------------------------------------------- jaringan (hanya untuk mengisi cache)
KRB_BAHAYA = {"banjir": "banjir", "banjir_bandang": "banjir-bandang", "longsor": "tanah-longsor", "cuaca_ekstrem": "cuaca-ekstrim",
              "gelombang_abrasi": "gelombang-ekstrim-dan-abrasi", "kekeringan": "kekeringan"}
# karhutla: kajian-summary karhutla / kebakaran-hutan-dan-lahan membalas nol untuk semua wilayah (dicek 23 Okt 2026, nasional dan 6201)
DIBI_URL = "https://dibi.bnpb.go.id/api/v1/chart/data"
DIBI_JENIS = {  # nama DIBI (strip) -> kunci paket. "Banjir dan Tanah Longsor" berdiri sendiri (banjir_longsor), TIDAK dihitung ke banjir maupun longsor (beda dengan scripts/banjir/kejadian.py)
    "Banjir": "banjir", "Banjir Genangan": "banjir", "Banjir dan Tanah Longsor": "banjir_longsor", "Banjir Bandang": "banjir_bandang",
    "Tanah Longsor": "longsor", "Gerakan Tanah": "longsor", "Cuaca Ekstrem": "cuaca_ekstrem", "Puting Beliung": "cuaca_ekstrem",
    "Angin Kencang": "cuaca_ekstrem", "Angin Topan": "cuaca_ekstrem", "Kekeringan": "kekeringan", "Kekeringan Pertanian": "kekeringan",
    "Gelombang Pasang / Abrasi": "gelombang_abrasi", "Gelombang Pasang": "gelombang_abrasi", "Abrasi Pantai": "gelombang_abrasi",
    "Banjir Rob": "rob", "Kebakaran Hutan dan Lahan": "karhutla", "Kebakaran Lahan": "karhutla", "Kebakaran Hutan": "karhutla",
    "Kebakaran Lahan Gambut": "karhutla"}
# DIBI geologi per kab (turunan KERANGKA §10 "DIBI gempa per kab", daftar perhatian geologi Kajian 2): cache terpisah riset/mentah/dibi_geologi.json
DIBI_JENIS_GEO = {"Gempabumi": "gempa", "Gempabumi Reruntuhan": "gempa", "Gempa Bumi dan Tsunami": "gempa_tsunami", "Tsunami": "tsunami",
                  "Erupsi Gunung Api": "gunungapi", "Banjir Lahar (Lahar)": "gunungapi"}
DIBI_ANGKA = ["jumlah_kejadian", "meninggal", "hilang", "menderita", "mengungsi", "rumah_rusak_berat", "rumah_rusak_sedang", "rumah_rusak_ringan"]
SIPONGI = "https://opsroom.sipongidata.my.id/api/list/luas-kebakaran/provinsi?tahunAwal=2015&tahunAkhir=2026"
ONI_URL = "https://www.cpc.ncep.noaa.gov/data/indices/oni.ascii.txt"


def ambil(url, data=None, coba=4, batas=300):
    for i in range(coba):
        try:
            req = urllib.request.Request(url, data=data, headers={"User-Agent": UA, **({"Content-Type": "application/json"} if data else {})})
            with urllib.request.urlopen(req, timeout=batas) as r:
                return r.read().decode("utf-8")
        except Exception:
            if i == coba - 1:
                raise
            time.sleep(2 * (i + 1))


def tarik_krb(kota, ulang=False):
    """Satu berkas per bahaya {kode: summary}; kab yang sudah ada dilewati kecuali ulang."""
    os.makedirs(os.path.join(MENTAH, "krb_kab"), exist_ok=True)
    for kunci, slug in KRB_BAHAYA.items():
        jalur = os.path.join(MENTAH, "krb_kab", f"{kunci}.json")
        ada = {} if ulang or not os.path.exists(jalur) else json.load(open(jalur))["kab"]
        kurang = [k for k in sorted(kota) if k not in ada]
        if not kurang:
            continue

        def satu(k):
            try:
                o = json.loads(ambil(f"https://inarisk.bnpb.go.id/apiv4/kajian-summary/{slug}/{k}?level=kabupaten", batas=90))
                return k, o.get("summary") if isinstance(o, dict) else None
            except Exception as e:
                print(f"  krb {slug} {k}: {e}", file=sys.stderr)
                return k, None
        with ThreadPoolExecutor(4) as ex:   # ponytail: 4 jalur; turunkan bila server membalas 429
            for k, s in ex.map(satu, kurang):
                if isinstance(s, dict) and "wilayah_penduduk" in s:
                    ada[k] = s
        json.dump({"sumber": f"https://inarisk.bnpb.go.id/apiv4/kajian-summary/{slug}/<kode>?level=kabupaten", "tarik": dt.date.today().isoformat(), "kab": ada},
                  open(jalur, "w"), ensure_ascii=False, separators=(",", ":"))
        print(f"krb {kunci}: {len(ada)}/{len(kota)} kab", file=sys.stderr)


def dibi_kueri(kolom, metrik, saring, batas=50000):
    badan = {"datasource": {"id": 1, "type": "table"}, "form_data": {"slice_id": 1, "dashboardId": 1},
             "queries": [{"columns": kolom, "metrics": [{"expressionType": "SQL", "sqlExpression": e, "label": l} for l, e in metrik],
                          "filters": saring, "row_limit": batas, "orderby": []}], "result_format": "json", "result_type": "full"}
    return json.loads(ambil(DIBI_URL, json.dumps(badan).encode()))["result"][0]["data"]


def dibi_jenis():
    """[[nama DIBI, n baris mentah, kunci paket | None]] semua jenis DIBI; None = dikecualikan dari paket."""
    return sorted([[r["jenis_bencana"], r["n"], DIBI_JENIS.get(str(r["jenis_bencana"]).strip())]
                   for r in dibi_kueri(["jenis_bencana"], [("n", "COUNT(*)")], [], 1000)], key=lambda x: str(x[0]))


def tarik_dibi():
    jenis = dibi_jenis()
    baris = []
    for j, _, kunci in jenis:
        if kunci is None:
            continue
        b = dibi_kueri(["dt", "tahun", "provinsi", "kabupaten", "id_kab_bps", "jenis_bencana"], [(k, f"SUM({k})") for k in DIBI_ANGKA],
                       [{"col": "jenis_bencana", "op": "==", "val": j}])
        if len(b) >= 50000:
            raise RuntimeError(f"DIBI {j}: batas baris Superset tercapai")
        baris += b
        time.sleep(1)
    simpan_dibi(baris, jenis)
    print(f"dibi: {len(baris)} baris", file=sys.stderr)


DIBI_KOLOM = ["dt", "tahun", "provinsi", "kabupaten", "id_kab_bps", "jenis_bencana"] + DIBI_ANGKA


def simpan_dibi(baris, jenis, berkas="dibi_hidromet.json"):
    """Baris dict Superset -> berkas kolom (sepertiga ukuran JSON baris)."""
    hari = dt.date.today().isoformat()
    json.dump({"sumber": DIBI_URL + " (form_data slice_id 1, dashboardId 1; dikelompokkan dt/tahun/provinsi/kabupaten/id_kab_bps/jenis, SUM)",
               "tarik": hari, "jenis": jenis, "jenis_tarik": hari, "kolom": DIBI_KOLOM, "baris": [[r.get(k) for k in DIBI_KOLOM] for r in baris]},
              open(os.path.join(MENTAH, berkas), "w"), ensure_ascii=False, separators=(",", ":"))


def tarik_dibi_geologi():
    """Jenis geologi DIBI (DIBI_JENIS_GEO) per kab-tanggal, kueri sama dengan tarik_dibi, ke riset/mentah/dibi_geologi.json."""
    jenis = [[n, c, DIBI_JENIS_GEO.get(str(n).strip())] for n, c, _ in dibi_jenis()]
    baris = []
    for j, _, kunci in jenis:
        if kunci is None:
            continue
        b = dibi_kueri(["dt", "tahun", "provinsi", "kabupaten", "id_kab_bps", "jenis_bencana"], [(k, f"SUM({k})") for k in DIBI_ANGKA],
                       [{"col": "jenis_bencana", "op": "==", "val": j}])
        assert len(b) < 50000, f"DIBI {j}: batas baris Superset tercapai"
        baris += b
        time.sleep(1)
    simpan_dibi(baris, jenis, "dibi_geologi.json")
    print(f"dibi geologi: {len(baris)} baris", file=sys.stderr)


def tarik_sipongi():
    open(os.path.join(MENTAH, "sipongi_luas_2015_2026.json"), "w").write(ambil(SIPONGI, batas=120))


def tarik_oni():
    teks = ambil(ONI_URL, batas=60)
    assert teks.split()[:4] == ["SEAS", "YR", "TOTAL", "ANOM"], "format oni.ascii.txt berubah"
    open(os.path.join(MENTAH, "oni_cpc.txt"), "w").write(teks)


def tarik(ulang=False):
    kota = {r[0]: r for r in json.load(open(os.path.join(AKAR, "scripts/udara/kota.json")))["baris"]}
    if ulang or not os.path.exists(os.path.join(MENTAH, "sipongi_luas_2015_2026.json")):
        tarik_sipongi()
    if ulang or not os.path.exists(os.path.join(MENTAH, "oni_cpc.txt")):
        tarik_oni()
    jalur = os.path.join(MENTAH, "dibi_hidromet.json")
    if ulang or not os.path.exists(jalur):
        tarik_dibi()
    else:
        d = json.load(open(jalur))
        if "jenis" not in d:   # cache lama tanpa daftar jenis: tambahkan saja daftar itu, baris tidak ditarik ulang
            d["jenis"], d["jenis_tarik"] = dibi_jenis(), dt.date.today().isoformat()
            json.dump(d, open(jalur, "w"), ensure_ascii=False, separators=(",", ":"))
    if ulang or not os.path.exists(os.path.join(MENTAH, "dibi_geologi.json")):
        tarik_dibi_geologi()
    tarik_krb(kota, ulang)


def tanggal_tarik():
    """{sumber: tanggal tarik} dari cache: kunci "tarik" (KRB, DIBI) atau mtime berkas (SiPongi, ONI: respons mentah)."""
    mt = lambda f: dt.date.fromtimestamp(os.path.getmtime(os.path.join(MENTAH, f))).isoformat()
    krb = sorted({json.load(open(os.path.join(MENTAH, "krb_kab", f"{h}.json")))["tarik"] for h in KRB_BAHAYA})
    d = json.load(open(os.path.join(MENTAH, "dibi_hidromet.json")))
    return {"krb": krb[0] if len(krb) == 1 else f"{krb[0]}..{krb[-1]}", "dibi": d["tarik"], "dibi_jenis": d.get("jenis_tarik"),
            "sipongi": mt("sipongi_luas_2015_2026.json"), "oni": mt("oni_cpc.txt")}


# ---------------------------------------------------------------- konstanta analisis
sys.path.insert(0, os.path.join(AKAR, "scripts/banjir"))
from kejadian import Pencocok, kunci_nama   # pencocok nama kab DIBI -> nama peta (dipakai pipeline banjir)
from wilayah import PROVINSI

JAWA = ("31", "32", "33", "34", "35", "36")
PULAU = {"Sumatera": ("11", "12", "13", "14", "15", "16", "17", "18", "19", "21"), "Jawa": JAWA, "Bali-Nusa Tenggara": ("51", "52", "53"),
         "Kalimantan": ("61", "62", "63", "64", "65"), "Sulawesi": ("71", "72", "73", "74", "75", "76"), "Maluku": ("81", "82"),
         "Papua": ("91", "92", "93", "94", "95", "96")}
PULAU_DARI = {p: n for n, ps in PULAU.items() for p in ps}
OVERLAY = {"banjir": "banjir", "banjir_bandang": "bandang", "longsor": "longsor", "kekeringan": "kering", "gelombang_abrasi": "gelombang"}
AMBANG_TINGGI = 2 / 3          # kelas tinggi indeks 0-1 = tiga sama lebar, sama dengan scripts/gempa/dampak.py (pilihan, bukan ambang resmi InaRISK)
ALIAS_KAB = {("75", "Pahuwato"): ("75", "Pohuwato")}   # satu kecamatan (Lemito) di penduduk.json dan geo memakai ejaan salah
PROV_ALIAS = {"DAERAHISTIMEWAYOGYAKARTA": "34"}
JENIS = ["banjir", "banjir_bandang", "longsor", "banjir_longsor", "cuaca_ekstrem", "gelombang_abrasi", "rob", "kekeringan", "karhutla"]
JENIS_MH = ("banjir", "banjir_bandang", "longsor", "banjir_longsor", "cuaca_ekstrem")
M = ("kejadian", "meninggal", "hilang", "menderita", "mengungsi", "rb", "rs", "rr")   # urutan vektor dampak DIBI
TAHUN_RASIO = range(2010, 2026)     # tahun lengkap; 2026 berjalan, 2008-2009 di luar seri resmi CKAN 2010-2024
# DIBI 2024 tidak lengkap untuk jenis ini (docstring scripts/banjir/kejadian.py; Tanah Longsor 219 kejadian lawan 584-1.251 tahun lain,
# Banjir Bandang, Banjir dan Tanah Longsor, Banjir Rob, Puting Beliung 0): tahun itu tidak dipakai untuk rasio (seri tetap ditulis, ber-dipakai=false)
TAHUN_TAK_LENGKAP = {2024: ("longsor", "banjir_bandang", "banjir_longsor", "rob", "cuaca_ekstrem")}
MIN_KEJADIAN = 5                    # tahun dengan < 5 kejadian tidak dipakai untuk rasio (derau sampel kecil)
JABODETABEK = {"31": None, "32": ("Bogor", "Kota Bogor", "Kota Depok", "Bekasi", "Kota Bekasi"), "36": ("Tangerang", "Kota Tangerang", "Kota Tangerang Selatan")}
WMO_R = 8.0                         # mortalitas negara ber-EWS terbatas / komprehensif (WMO 13 Okt 2022)
# pasangan utama = Renas 2025 -> Renas 2029 (indikator 1.c yang sama, penyebut sama). Renstra 6% lintas indikator: hanya ilustrasi.
# Angka Renstra/Renas dikutip dari riset/A-dokumen-bnpb.md §2.2-2.3, PDF Perban tidak dibuka ulang di paket ini.
CAKUPAN = {"renas_2025": (0.1106, "Perban BNPB 1/2025 (Renas PB 2025-2029) Tabel 2.8 indikator 1.c: 11.060 per 100.000 penduduk di daerah berisiko tercakup peringatan dini (2025); via riset/A-dokumen-bnpb.md §2.2"),
           "renstra_2025": (0.06, "Perban BNPB 5/2025 (Renstra BNPB 2025-2029) hlm. 70 (kutipan isu RPJMN): keterpenuhan peringatan dini 6% masyarakat terpapar di kawasan risiko tinggi; via riset/A-dokumen-bnpb.md §2.3. "
                                  "LINTAS INDIKATOR: penyebut berbeda dengan target Renas 1.c, hanya ilustrasi")}
UTAMA = ("renas_2025", "renas_2029")
TARGET = {"renas_2029": (0.52, "Renas PB 2025-2029 Tabel 2.8 indikator 1.c target 2029: 52.000 per 100.000"),
          "penuh": (1.0, "cakupan penuh (sasaran Early Warnings for All PBB 2027); batas atas ilustratif")}
# Dua lintasan berdampingan, rumus sama, penyebut beda (KERANGKA prinsip 10, P06; menggantikan cakupan_awal=renstra_2025 di naskah):
# Renas 1.c 11.060 -> 52.000 per 100.000 dan Renstra IKP "Persentase cakupan layanan peringatan dini di daerah berisiko bencana"
# 6,10% -> 6,32% (dibaca dari paket program-terbukti, satu sumber dengan tabel silang Renstra).
RENSTRA_IKP = "Persentase cakupan layanan peringatan dini di daerah berisiko bencana"
LINTASAN = {UTAMA: "renas", ("renstra_ikp_2025", "renstra_ikp_2029"): "renstra"}


def ikp_renstra():
    """(c0 2025, c1 2029, sumber) IKP Renstra dari data/program-terbukti/renstra_bnpb_2025_2029.csv; satu baris persis."""
    f = os.path.join(KAJ, "data/program-terbukti/renstra_bnpb_2025_2029.csv")
    b = [r for r in csv.DictReader(open(f, encoding="utf-8")) if r["tingkat"] == "program" and r["indikator"] == RENSTRA_IKP]
    assert len(b) == 1, f"IKP Renstra '{RENSTRA_IKP}' {len(b)} baris di {f}"
    pct = lambda s: float(s.rstrip("%").replace(",", ".")) / 100
    return pct(b[0]["t2025"]), pct(b[0]["t2029"]), f"Perban BNPB 5/2025 (Renstra BNPB 2025-2029) Tabel 4.6 hlm. {b[0]['halaman']}: IKP {b[0]['kode']} {RENSTRA_IKP}"


ELNINO_KUAT = 1.5   # ONI NDJ >= 1,5: musim hujan berjalan saat El Nino kuat; analog musim 2026/2027 setelah El Nino kuat 2026 (KERANGKA Kartu 6.2, 7.2)
# Rekaman DIBI Kota Bekasi 1 Jan 2020 (366.274 mengungsi, 84,5% pengungsi Jabodetabek, status tidak terbukti; dibi/rekonsiliasi.csv):
# uji kepekaan pemilihan musim terberat dengan dan tanpa rekaman ini (KERANGKA §7 celah 15, Kartu 6.1)
BEKASI_2020 = ("Kota Bekasi", dt.date(2020, 1, 1), 366274)

SRC = {  # sumber yang dipakai berulang; {tarik} diisi isi_tanggal() dari cache
    "dibi": "DIBI BNPB dibi.bnpb.go.id (Superset dasbor publik 1), ditarik {tarik} -> riset/mentah/dibi_hidromet.json",
    "krb": "InaRISK BNPB apiv4/kajian-summary/<bahaya>/<kode>?level=kabupaten (Kajian Risiko Bencana 2022-2026), ditarik {tarik} -> riset/mentah/krb_kab/",
    "overlay": "public/banjir/data/bahaya.json (InaRISK raster 100 m, maks pusat+kisi 3x3 per kecamatan) x public/data/penduduk.json kec (WorldPop R2025A 2026)",
    "oni": "NOAA CPC oni.ascii.txt https://www.cpc.ncep.noaa.gov/data/indices/oni.ascii.txt, ditarik {tarik} -> riset/mentah/oni_cpc.txt",
    "param": "public/banjir/data/param_banjir.json kunci param.",
    "sipongi": "Kementerian Kehutanan (SiPongi; sebelum Okt 2024 KLHK) opsroom.sipongidata.my.id/api/list/luas-kebakaran/provinsi?tahunAwal=2015&tahunAkhir=2026, ditarik {tarik} -> riset/mentah/sipongi_luas_2015_2026.json",
    "wb2015": "World Bank (Feb 2016) The Cost of Fire: An Economic Analysis of Indonesia's 2015 Fire Crisis, Indonesia Sustainable Landscapes Knowledge Note 1, hlm. 3-5, https://documents1.worldbank.org/curated/en/776101467990969768/txt/103668-BRI-Cost-of-Fires-Knowledge-Note-PUBLIC-ADD-NEW-SERIES-Indonesia-Sustainable-Landscapes-Knowledge-Note.txt (diakses 2026-10-23)",
    "wb2019": "World Bank (Des 2019) Indonesia Economic Quarterly: Investing in People, Box A.1 hlm. 7-8, https://documents.worldbank.org/curated/en/622281575920970133/text/Indonesia-Economic-Quarterly-Investing-in-People.txt (diakses 2026-10-23)",
    "ispa2015": "BNPB (Sutopo Purwo Nugroho, Kapusdatinmas) 22 Okt 2015 via JawaPos 23 Okt 2015 https://www.jawapos.com/humaniora/1510230082/ihh-ngeri-450431-warga-sumatera-kalimantan-kena-ispa (diakses 2026-10-23)",
    "ispa2019": "BNPB (Agus Wibowo, Plt Kapusdatinmas, data Kemenkes) jumpa pers 23 Sep 2019 via CNN Indonesia https://www.cnnindonesia.com/nasional/20190923160933-20-433052/penderita-ispa-akibat-karhutla-tembus-919-ribu-orang (diakses 2026-10-23); dikutip juga WB IEQ Des 2019 catatan 3",
    "wmo": "WMO siaran pers 13 Okt 2022 'UN warns that half the world is not prepared for disasters' (laporan UNDRR-WMO Global Status of Multi-Hazard Early Warning Systems: Target G) https://wmo.int/media/news/un-warns-half-world-not-prepared-disasters (diakses 2026-10-23): mortalitas bencana negara ber-cakupan peringatan dini terbatas 8 kali negara ber-cakupan substansial-komprehensif",
    "dala2007": "Bappenas (Feb 2007) Laporan Perkiraan Kerusakan dan Kerugian Pasca Bencana Banjir Awal Februari 2007 di Wilayah JABODETABEK, salinan https://www.locjkt.or.id/application/docliblcjkt/upload/Laporan%20penilaian%20Kerusakan%20dan%20kerugian%20JABODETABEK.pdf (diakses 2026-10-23)",
    "renas_krb": "Perban BNPB 1/2025 (Renas PB 2025-2029) Tabel 2.1-2.7 hlm. 20-25 (sumber asli Kajian Risiko Bencana 2022-2026), via riset/A-dokumen-bnpb.md §1.4",
    "haque": "Haque U. dkk. (2012) Reduced death rates from cyclones in Bangladesh: what more needs to be done? Bull WHO 90(2):150-156, https://pmc.ncbi.nlm.nih.gov/articles/PMC3302549/ (diakses 2026-10-23)",
    "neraca": "public/data/kekeringan_neraca.json (skenario normal_k, mulai 1 Jun) + public/kekeringan/data/hindcast.json (2015, NASA POWER bulanan) + public/kekeringan/data/tutupan.json, dijalankan lewat public/kekeringan/simulasi.js (jalankan, dampak)",
    "ujibalik": "public/data/kekeringan_ujibalik.json",
    "replay": "public/banjir/data/replay/maret2025.json",
    "abrasi": "public/pesisir/data/abrasi.json (Landsat MNDWI+Otsu, transek 1 km, 1988-2025)",
}


def vek():
    return [0.0] * len(M)


def tambah(a, b):
    for i, x in enumerate(b):
        a[i] += x


def mh(v):
    return v[1] + v[2]


def p90(x):
    """Persentil 90 peringkat terdekat, dibatasi nilai terbesar kedua: tahun terburuk tercatat selalu disisihkan bila n >= 2 (pola RWCS).
    n 2-19 -> nilai terbesar kedua; n >= 20 -> peringkat ceil(0,9 n)."""
    s = sorted(x)
    return s[0] if len(s) == 1 else s[min(math.ceil(0.9 * len(s)), len(s) - 1) - 1]


def materiil(v, par):
    """Batas bawah biaya rehab rumah (Rp): (rendah = skema stimulan lama, tinggi = skema 2022 ke atas)."""
    rb, rs, rr = par["stimulan_rumah_rb"], par["stimulan_rumah_rs"], par["stimulan_rumah_rr"]
    return v[5] * rb[1] + v[6] * rs[1] + v[7] * rr[1], v[5] * rb[0] + v[6] * rs[0] + v[7] * rr[0]


def faktor_ews(c0, c1, r=WMO_R):
    """Pengali korban bila cakupan peringatan dini naik c0 -> c1: penduduk tercakup bermortalitas 1/r penduduk tak tercakup."""
    return ((1 - c1) + c1 / r) / ((1 - c0) + c0 / r)


def episode_lanina(oni):
    """{(musim, tahun)} yang termasuk episode La Nina CPC: >= 5 musim tumpang berturut-turut ONI <= -0,5."""
    urut = sorted(oni, key=lambda k: (k[1], ["DJF", "JFM", "FMA", "MAM", "AMJ", "MJJ", "JJA", "JAS", "ASO", "SON", "OND", "NDJ"].index(k[0])))
    keluar, run = set(), []
    for k in urut + [None]:
        if k is not None and oni[k] <= -0.5:
            run.append(k)
            continue
        if len(run) >= 5:
            keluar.update(run)
        run = []
    return keluar


def baca_oni():
    oni = {}
    for ln in open(os.path.join(MENTAH, "oni_cpc.txt")).read().splitlines()[1:]:
        p = ln.split()
        if len(p) == 4:
            oni[(p[0], int(p[1]))] = float(p[3])
    return oni


def musim_dari(tgl):
    """Musim hujan Y/Y+1 = 1 Okt Y sampai 30 Apr Y+1 -> Y; di luar itu None."""
    return tgl.year if tgl.month >= 10 else tgl.year - 1 if tgl.month <= 4 else None


def peringkat_gabung(kandidat, nilai):
    """Kunci dengan jumlah peringkat terkecil atas lima metrik (kejadian, meninggal+hilang, menderita, mengungsi, rumah rusak)."""
    f = [lambda v: v[0], mh, lambda v: v[3], lambda v: v[4], lambda v: v[5] + v[6] + v[7]]
    skor = {k: 0 for k in kandidat}
    for g in f:
        for i, k in enumerate(sorted(kandidat, key=lambda k: -g(nilai[k]))):
            skor[k] += i
    return min(kandidat, key=lambda k: (skor[k], -nilai[k][0]))


# ---------------------------------------------------------------- bahan
def muat_kota():
    kota = {}
    for kode, nama, prov, lat, lon, jiwa, kab in json.load(open(os.path.join(AKAR, "scripts/udara/kota.json")))["baris"]:
        kota[kode] = {"nama": nama.strip(), "prov": prov, "kab_peta": kab, "pulau": PULAU_DARI[prov]}
    return kota


def penduduk_kab(kota):
    pen = json.load(open(os.path.join(AKAR, "public/data/penduduk.json")))["kec"]
    kunci = {(v["prov"], v["kab_peta"]): k for k, v in kota.items()}
    kec_kab, jiwa = {}, {k: 0 for k in kota}
    for kk, n in pen.items():
        p, kb, _ = kk.split("|")
        k = kunci[ALIAS_KAB.get((p, kb), (p, kb))]
        kec_kab[kk] = k
        jiwa[k] += n
    return pen, kec_kab, jiwa


def paparan_overlay(pen, kec_kab):
    bah = json.load(open(os.path.join(AKAR, "public/banjir/data/bahaya.json")))["kec"]
    out = {}
    for kk, n in pen.items():
        b = bah[kk]
        for h, kol in OVERLAY.items():
            o = out.setdefault((kec_kab[kk], h), [0, 0, 0])   # jiwa tinggi, kec tinggi, kec
            o[2] += 1
            if b[kol] >= AMBANG_TINGGI:
                o[0] += n
                o[1] += 1
    return out


def muat_krb():
    return {h: json.load(open(os.path.join(MENTAH, "krb_kab", f"{h}.json")))["kab"] for h in KRB_BAHAYA}


def muat_dibi(kota, berkas="dibi_hidromet.json", peta_jenis=None):
    """-> (baris [(kode, jenis, tanggal, tahun, vektor)], tak_cocok {nama: n_baris}, total nasional per (jenis, tahun) termasuk tak cocok,
    n baris, vektor tak cocok per jenis, daftar jenis DIBI di cache). berkas/peta_jenis lain: cache geologi (DIBI_JENIS_GEO)."""
    DIBI_JENIS = peta_jenis or globals()["DIBI_JENIS"]
    d = json.load(open(os.path.join(MENTAH, berkas)))
    ix = {k: i for i, k in enumerate(d["kolom"])}
    cocok = Pencocok()
    peta = {(v["prov"], v["kab_peta"]): k for k, v in kota.items()}
    prov_nama = {kunci_nama(n): k for k, n in PROVINSI.items()} | PROV_ALIAS
    wib = dt.timezone(dt.timedelta(hours=7))
    out, tak, nas, tak_v = [], {}, {}, {j: vek() for j in set(DIBI_JENIS.values())}
    for r in d["baris"]:
        j = DIBI_JENIS[r[ix["jenis_bencana"]].strip()]
        v = [float(r[ix[c]] or 0) for c in ("jumlah_kejadian", "meninggal", "hilang", "menderita", "mengungsi", "rumah_rusak_berat", "rumah_rusak_sedang", "rumah_rusak_ringan")]
        th = int(r[ix["tahun"]])
        tambah(nas.setdefault((j, th), vek()), v)
        tgl = dt.datetime.fromtimestamp(r[ix["dt"]] / 1000, wib).date() if r[ix["dt"]] else None
        pk = prov_nama.get(kunci_nama(r[ix["provinsi"]])) or (str(int(r[ix["id_kab_bps"]]))[:2] if r[ix["id_kab_bps"]] else "")
        p, n = cocok.cari(str(r[ix["kabupaten"]] or ""), pk)
        k = peta.get(ALIAS_KAB.get((p, n), (p, n)))
        if k is None:
            nm = f"{r[ix['provinsi']]}|{r[ix['kabupaten']]}"
            tak[nm] = tak.get(nm, 0) + 1
            tambah(tak_v[j], v)
            continue
        out.append((k, j, tgl, th, v))
    return out, tak, nas, len(d["baris"]), tak_v, d.get("jenis")


def muat_param():
    return json.load(open(os.path.join(AKAR, "public/banjir/data/param_banjir.json")))["param"]


# ---------------------------------------------------------------- mesin kekeringan (simulasi.js lewat node)
JS_KERING = r"""
/* package.json repo bertipe module: .js klasik dimuat lewat new Function, sama dengan uji scripts/kekeringan/neraca.py */
const fs = require("fs"), m = {exports: {}}; new Function("module", fs.readFileSync(process.argv[2], "utf8"))(m);
const S = m.exports, a = JSON.parse(fs.readFileSync(process.argv[3]));
const raw = JSON.parse(fs.readFileSync(a.neraca)), hc = JSON.parse(fs.readFileSync(a.hindcast)), tut = JSON.parse(fs.readFileSync(a.tutupan));
const c = raw.sel_data, n = c.lat.length;
if (tut.lat.length !== n || hc.lat.length !== n) throw new Error("urutan sel tutupan/hindcast beda dengan neraca");
/* sama dengan kalibrasi() di simulasi.js pada mode Awal kemarau (tanam hari ke-30; bawaan layar Hari ini = hari ke-10): Dr 0, tanpa SPI, porsi rentan 1 (batas atas) */
const D = {...raw, n, lat: c.lat, lon: c.lon, taw: c.taw, gb: c.gb, jiwa: c.jiwa, dr0: c.lat.map(() => 0), spi: null, rentan: c.lat.map(() => 1),
  nKering: a.hari_kering, sawah: tut.sawah, kebun: tut.sawit.map((v, i) => v + tut.hti[i]), km2: c.lat.map(la => 3098 * Math.cos(la * Math.PI / 180))};
const nk = raw.skenario.normal_k, norm = {sk: nk, hj: S.hujanHarian(D, nk)}, cfg = {tanam: a.tanam, laju: 0, kap: 0, omc: 0};
const satu = {...D, jiwa: c.lat.map(() => 1)}, semua = [...Array(n).keys()], out = {lat: c.lat, lon: c.lon, jiwa_sel: c.jiwa, sawah: tut.sawah};
for (const [nama, sk] of [["y2015", {int: 15, ...hc.tahun["2015"]}], ["normal", nk]]) {
  const hj = S.hujanHarian(D, sk), R = S.jalankan(D, sk, hj, cfg, undefined, norm), hari = [];
  for (let i = 0; i < n; i++) { const r = S.jalankan(satu, sk, hj, cfg, [i], norm); let h = 0; for (let t = 0; t < S.H; t++) if (r.jiwa[t] > 0) h++; hari.push(h); }
  out[nama] = {loss: Array.from(R.loss), hari_krisis: hari, jiwa_puncak: Math.max(...R.jiwa), luas_stres_puncak_km2: Math.max(...R.luas), dampak: S.dampak(D, R, semua)};
}
process.stdout.write(JSON.stringify(out));
"""


def jalankan_kering():
    raw = json.load(open(os.path.join(AKAR, "public/data/kekeringan_neraca.json")))
    arg = {"neraca": os.path.join(AKAR, "public/data/kekeringan_neraca.json"), "hindcast": os.path.join(AKAR, "public/kekeringan/data/hindcast.json"),
           "tutupan": os.path.join(AKAR, "public/kekeringan/data/tutupan.json"), "tanam": raw["mulai"]["kemarau"]["tanam"], "hari_kering": 14}
    # hari_kering 14 = Tanggap.ASUMSI.hari_kering (public/kekeringan/sim_tanggap.js); tanam = mulai.kemarau.tanam (30), sama dengan kalibrasi() hanya pada mode Awal kemarau
    import tempfile
    with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False) as f:
        json.dump(arg, f)
    with tempfile.NamedTemporaryFile("w", suffix=".js", delete=False) as g:
        g.write(JS_KERING)
    hasil = subprocess.run(["node", g.name, os.path.join(AKAR, "public/kekeringan/simulasi.js"), f.name], capture_output=True, text=True, check=True)
    os.unlink(f.name); os.unlink(g.name)
    o = json.loads(hasil.stdout)
    o["arg"] = {k: v for k, v in arg.items() if k in ("tanam", "hari_kering")}
    o["dibuat_neraca"] = raw["dibuat"]
    return o


def kering_per_kab(o, pen, kec_kab):
    """Sel 0,5 derajat -> kab lewat kecamatan (titik tengah pusat_kec.json, sel terdekat; pola hth.peta_kec). Bobot = penduduk kecamatan."""
    sys.path.insert(0, os.path.join(AKAR, "scripts/kekeringan"))
    import hth as H
    pusat = json.load(open(os.path.join(AKAR, "public/banjir/data/pusat_kec.json")))
    idx = {(round(la, 2), round(lo, 2)): i for i, (la, lo) in enumerate(zip(o["lat"], o["lon"]))}
    kab, tanpa = {}, {}
    for kk, n in pen.items():
        a = pusat.get(kk)
        c = H.sel_terdekat(idx, a[0], a[1]) if a else None   # sama dengan hth.peta_kec
        k = kec_kab[kk]
        if c is None:
            tanpa[k] = tanpa.get(k, 0) + n
            continue
        i = idx[c]
        s = kab.setdefault(k, {"w": 0, "l15": 0.0, "ln": 0.0, "krisis": 0, "hari": 0, "sel": set()})
        s["w"] += n
        s["l15"] += n * o["y2015"]["loss"][i]
        s["ln"] += n * o["normal"]["loss"][i]
        s["krisis"] += n if o["y2015"]["hari_krisis"][i] > 0 else 0
        s["hari"] = max(s["hari"], o["y2015"]["hari_krisis"][i])
        s["sel"].add(i)
    return kab, tanpa


# ---------------------------------------------------------------- kamus kolom per kab (label keyakinan + arti); periksa() menolak kolom tanpa entri
KOLOM = {
    "penduduk": ("estimasi-model", "WorldPop R2025A 2026 dijumlah dari kecamatan public/data/penduduk.json"),
    "analog_mh_kejadian": ("resmi", "DIBI: kejadian musim hidromet (banjir, bandang, longsor, banjir+longsor, cuaca ekstrem) pada musim analog La Nina nasional"),
    "analog_mh_meninggal_hilang": ("resmi", "DIBI: meninggal + hilang tercatat, musim analog"),
    "analog_mh_menderita": ("resmi", "DIBI: menderita (terdampak), musim analog"),
    "analog_mh_mengungsi": ("resmi", "DIBI: mengungsi, musim analog"),
    "analog_mh_korban_rendah": ("estimasi-model", "kejadian musim analog per jenis x median rasio (meninggal+hilang)/kejadian 2010-2025: kab Jawa rasio Jawa, kab lain rasio nasional "
                                "(jumlah 119 kab Jawa = kartu Jawa; jumlah 514 kab BUKAN kartu nasional, yang memakai rasio nasional untuk semua kab)"),
    "analog_mh_korban_tinggi": ("estimasi-model", "idem dengan persentil 90 rasio (tahun terburuk disisihkan)"),
    "analog_mh_materiil_rendah_rp": ("asumsi-kebijakan", "rumah RB/RS/RR musim analog x stimulan 50/25/10 jt (batas bawah rehab rumah)"),
    "analog_mh_materiil_tinggi_rp": ("asumsi-kebijakan", "idem x stimulan 60/30/15 jt"),
    "selubung_lanina_musim_korban": ("estimasi-model", "tahun awal musim La Nina yang memberi korban_tinggi (estimasi) terbesar di kab ini (kosong bila tak ada kejadian)"),
    "selubung_lanina_korban_rendah": ("estimasi-model", "korban rendah pada musim selubung; SELUBUNG: tiap kab memakai musim terburuknya sendiri, jangan dijumlah jadi angka nasional"),
    "selubung_lanina_korban_tinggi": ("estimasi-model", "korban tinggi terbesar di antara musim La Nina 2008/09-2022/23"),
    "selubung_lanina_kejadian_maks": ("resmi", "DIBI: kejadian musim hidromet terbanyak di antara musim La Nina (bisa dari musim berbeda dengan kolom lain)"),
    "selubung_lanina_menderita_maks": ("resmi", "DIBI: menderita terbesar di antara musim La Nina"),
    "selubung_lanina_mengungsi_maks": ("resmi", "DIBI: mengungsi terbesar di antara musim La Nina"),
    "selubung_lanina_hari_mengungsi_maks": ("asumsi-kebijakan", "mengungsi maks x 7 hari (param hari_mengungsi; rentang 3-30)"),
    "selubung_lanina_materiil_tinggi_rp_maks": ("asumsi-kebijakan", "rumah rusak musim La Nina terburuk x stimulan 60/30/15 jt"),
    "kering2015_padi_turun_pct": ("estimasi-model", "penurunan hasil padi tadah hujan tanam 1 Jul 2015 tanpa irigasi (FAO-56/FAO-33, simulasi.js), rerata berbobot penduduk kecamatan; BUKAN puso. "
                                  "Mesin neraca/padi belum pernah diuji balik terhadap data puso/produksi"),
    "kering_normal_padi_turun_pct": ("estimasi-model", "idem dengan iklim normal 1991-2020 (normal_k)"),
    "kering2015_selisih_pct": ("estimasi-model", "selisih 2015 - normal (poin persen): sinyal anomali yang bermakna"),
    "kering2015_jiwa_sel_krisis": ("estimasi-model", "TIDAK UNTUK DIKUTIP sebagai jiwa terdampak: seluruh penduduk kecamatan yang selnya >= 1 hari krisis air 2015 (porsi rentan 1, batas atas tanpa daya beda; "
                                   "layar memakai porsi rentan 0,2 Tanggap.ASUMSI atau hasil kalibrasi). Mesin belum diuji balik"),
    "kering2015_hari_krisis_maks": ("estimasi-model", "hari krisis air terbanyak di antara sel kab ini (krisis dihitung sesudah 14 hari stres berturut)"),
    "kering_penduduk_tanpa_sel": ("estimasi-model", "penduduk kecamatan tanpa sel neraca dalam jarak ~0,7 derajat (tidak masuk kolom kering)"),
    "karhutla2015_dibi_kejadian": ("resmi", "DIBI: kejadian karhutla 2015"),
    "karhutla2015_dibi_meninggal_hilang": ("resmi", "DIBI: meninggal+hilang karhutla 2015; di Jawa = kebakaran hutan/gunung (mis. Magetan 7 jiwa 18 Okt 2015), bukan korban asap"),
    "karhutla2019_dibi_kejadian": ("resmi", "DIBI: kejadian karhutla 2019"),
    "karhutla2019_dibi_meninggal_hilang": ("resmi", "DIBI: meninggal+hilang karhutla 2019; 9 dari 10 di Jawa (kebakaran hutan/lahan setempat, bukan asap)"),
    "overlay_jiwa_tinggi": ("estimasi-model", "penduduk kecamatan dengan indeks bahaya InaRISK maks >= 2/3 (bahaya.json x penduduk.json); batas atas, belum diuji balik"),
    "overlay_kec_tinggi": ("estimasi-model", "jumlah kecamatan berindeks >= 2/3"), "overlay_kec": ("estimasi-model", "jumlah kecamatan kab di penduduk.json"),
    "krb_luas_tinggi_ha": ("resmi", "KRB 2022-2026 InaRISK: luas kelas bahaya tinggi"), "krb_luas_sedang_ha": ("resmi", "KRB: luas kelas sedang"),
    "krb_luas_rendah_ha": ("resmi", "KRB: luas kelas rendah"),
    "krb_terpapar_jiwa": ("resmi", "KRB kolom 'terpapar' (angka yang dikutip Renas PB Tabel 2.1-2.7); tafsiran 'zona sedang+tinggi' adalah inferensi dari total_luas API = sedang+tinggi. "
                          "Kolom API jiwa_terpapar (lebih kecil) tidak dipakai karena tidak dikutip dokumen resmi"),
    "krb_penduduk_wilayah": ("resmi", "KRB: penduduk wilayah (dasar InaRISK, beda dengan WorldPop)"),
    "krb_kerugian_potensi_juta_rp": ("resmi", "KRB: potensi kerugian fisik + ekonomi (juta Rp)"), "krb_kerugian_tinggi_juta_rp": ("resmi", "KRB: potensi kerugian kelas tinggi (juta Rp)"),
    "krb_lingkungan_ha": ("resmi", "KRB: potensi kerusakan lingkungan (ha)"),
}


# ---------------------------------------------------------------- data rujukan yang disalin tangan dari sumber terbuka (diperiksa jumlahnya di periksa())
WB2015_PROV_RIBU_HA = {"16": 608, "62": 429, "64": 388, "63": 292, "91": 268, "61": 178, "14": 139, "15": 123, "lainnya": 186}   # tabel hlm. 3; Papua 2015 = Papua sebelum pemekaran 2022
WB2015_TOTAL_RIBU_HA = 2611
ISPA2015 = {"14": 65232, "15": 90747, "16": 101332, "61": 43477, "62": 52213, "63": 97430}            # Juli-22 Okt 2015, laporan puskesmas dan RS
ISPA2015_TOTAL = 450431
ISPA2019 = {"14": 275793, "16": 291807, "15": 63554, "61": 180695, "63": 40374, "62": 67293}           # data Kemenkes per 23 Sep 2019
ISPA2019_TOTAL = 919516
PROV_ASAP = ("14", "15", "16", "61", "62", "63", "64", "91", "93")   # provinsi krisis asap 2015/2019 (tabel Bank Dunia 2015; Papua 2015 sebelum pemekaran: Merauke kini 93)
# DaLA Bappenas 2007 Tabel III.1 hlm. 33 (PDF hlm. 42), miliar Rp: kerusakan, kerugian, total, pemerintah, swasta/masyarakat
DALA2007 = {"kerusakan": 1765.89, "kerugian": 3418.70, "total": 5184.43, "pemerintah": 649.43, "swasta": 4535.00}
DALA2007_APINDO_RP = 3.6e12        # Ringkasan PDF hlm. 8: APINDO + AAUI US$400 juta (sekitar Rp3,6 triliun), dikutip laporan; bisa tumpang tindih dengan Tabel III.1
# Renas PB 2025-2029 Tabel 2.1-2.7 (via riset A §1.4): penduduk terpapar nasional per bahaya, dan karhutla (API KRB karhutla membalas nol)
RENAS_TERPAPAR = {"banjir": 113829496, "banjir_bandang": 15391846, "longsor": 25252687, "cuaca_ekstrem": 255437799, "gelombang_abrasi": 4129597, "kekeringan": 272564439}
RENAS_KARHUTLA = {"luas_total_ha": 128283490, "luas_tinggi_ha": 25457756, "kerugian_juta_rp": 709049963, "lingkungan_ha": 6284991}
WB = {"2015": {"usd": 16.1e9, "idr": 221e12, "pdb_pct": 1.9, "meninggal": 19, "ispa_teks": "lebih dari 500.000 kasus ISPA (Bank Dunia mengutip The Guardian 28 Okt 2015)"},
      "2019": {"usd": 5.2e9, "usd_kerusakan": 157e6, "usd_kerugian": 5.0e9, "pdb_pct": 0.5}}


def idn(x, d=0):
    """Angka -> teks gaya Indonesia (titik ribuan, koma desimal) untuk kolom catatan."""
    return f"{x:,.{d}f}".replace(",", "_").replace(".", ",").replace("_", ".")


def angka_id(v):
    """'1.234,56' -> 1234.56; angka biasa apa adanya."""
    return float(v.replace(".", "").replace(",", ".")) if isinstance(v, str) else float(v or 0)


def sipongi():
    s = json.load(open(os.path.join(MENTAH, "sipongi_luas_2015_2026.json")))
    out = {}
    for p in s["data"]:
        for x in p["data_luas"]:
            out[(p["id_mendagri"], str(x["tahun"]))] = angka_id(x.get("luas", x.get("total")))
    return out


def wilayah_kab(k, kota):
    return ["nasional"] + (["jawa"] if kota[k]["prov"] in JAWA else [])


def agregasi(rows, kota):
    kab_total, tahunan, kab_tahun, musim_kab, musim_wil, tanpa_tgl = {}, {}, {}, {}, {}, 0
    for k, j, tgl, th, v in rows:
        tambah(kab_total.setdefault((k, j), vek()), v)
        tambah(kab_tahun.setdefault((k, j, th), vek()), v)
        for w in wilayah_kab(k, kota):
            tambah(tahunan.setdefault((w, j, th), vek()), v)
        if j in JENIS_MH:
            if tgl is None:
                tanpa_tgl += 1
                continue
            y = musim_dari(tgl)
            if y is None or not 2008 <= y <= 2025:   # musim lengkap 2008/09-2025/26
                continue
            tambah(musim_kab.setdefault((k, y, j), vek()), v)
            for w in wilayah_kab(k, kota):
                tambah(musim_wil.setdefault((w, y, j), vek()), v)
    return kab_total, tahunan, kab_tahun, musim_kab, musim_wil, tanpa_tgl


def jendela(rows, kode, dari, sampai, jenis=JENIS_MH):
    v = vek()
    for k, j, tgl, th, x in rows:
        if k in kode and j in jenis and tgl and dari <= tgl <= sampai:
            tambah(v, x)
    return v


def rasio(tahunan, w, j):
    """Ringkasan dari tahun >= MIN_KEJADIAN, tanpa tahun tak lengkap (TAHUN_TAK_LENGKAP); versi dengan tahun itu di kunci 'semua_tahun'."""
    seri = []
    for th in TAHUN_RASIO:
        v = tahunan.get((w, j, th))
        if v and v[0] >= MIN_KEJADIAN:
            seri.append({"tahun": th, "v": v, "kej": mh(v) / v[0], "ter": mh(v) / v[3] * 1e5 if v[3] > 0 else None,
                         "dipakai": j not in TAHUN_TAK_LENGKAP.get(th, ())})

    def ring(ss):
        rk = [s["kej"] for s in ss]
        rt = [s["ter"] for s in ss if s["ter"] is not None]
        return {"n": len(ss), "kej_median": statistics.median(rk) if rk else None, "kej_p90": p90(rk) if rk else None,
                "ter_median": statistics.median(rt) if rt else None, "ter_p90": p90(rt) if rt else None}
    return {**ring([s for s in seri if s["dipakai"]]), "seri": seri, "semua_tahun": ring(seri)}


def korban(vj, R):
    """vj {jenis: vektor}, R {jenis: rasio} -> (rendah, tinggi) = sum kejadian x [median, p90] rasio (meninggal+hilang)/kejadian."""
    lo = sum(v[0] * R[j]["kej_median"] for j, v in vj.items() if R[j]["n"])
    hi = sum(v[0] * R[j]["kej_p90"] for j, v in vj.items() if R[j]["n"])
    return lo, hi


class Kartu:
    def __init__(self):
        self.b = []

    def __call__(self, skenario, wilayah, metrik, nilai=None, rendah=None, tinggi=None, satuan="", label="", sumber="", catatan=""):
        assert label in ("resmi", "terverifikasi", "estimasi-model", "asumsi-kebijakan"), label
        self.b.append({"skenario": skenario, "wilayah": wilayah, "metrik": metrik, "nilai": nilai, "rendah": rendah, "tinggi": tinggi,
                       "satuan": satuan, "label": label, "sumber": sumber, "catatan": catatan})


def kartu_dampak(K, sk, w, vj, R, par, sumber, catatan, per_jenis=True):
    """Baris dampak baku satu skenario dari vektor DIBI per jenis. R=None (kasus nyata): tanpa rentang korban, yang tercatat sudah angkanya."""
    tot = vek()
    for v in vj.values():
        tambah(tot, v)
    rasio_txt = "; ".join(f"{j}: median {R[j]['kej_median']:.4f}, p90 {R[j]['kej_p90']:.4f} (n={R[j]['n']} th)" for j in vj if R[j]["n"]) if R else ""
    dasar = (f"korban = kejadian analog x rasio (meninggal+hilang)/kejadian DIBI {TAHUN_RASIO.start}-{TAHUN_RASIO.stop - 1} per jenis, tahun >= {MIN_KEJADIAN} kejadian, "
             f"tanpa 2024 untuk longsor, banjir bandang, banjir+longsor, rob, cuaca ekstrem (DIBI 2024 tidak lengkap); rendah = median tahunan, "
             f"tinggi = persentil 90 peringkat terdekat dibatasi nilai terbesar kedua (tahun terburuk tercatat selalu disisihkan, pola RWCS; untuk n < 20 = nilai terbesar kedua). "
             f"Belum diuji balik. {rasio_txt}")
    if per_jenis and len(vj) > 1:
        for j, v in vj.items():
            K(sk, w, f"kejadian_{j}", v[0], satuan="kejadian", label="resmi", sumber=sumber, catatan=catatan)
            K(sk, w, f"meninggal_hilang_tercatat_{j}", mh(v), satuan="jiwa", label="resmi", sumber=sumber, catatan=catatan)
            if R:
                lo, hi = korban({j: v}, R)
                K(sk, w, f"korban_jiwa_{j}", None, lo, hi, "jiwa", "estimasi-model", SRC["dibi"], dasar + banding(mh(v), hi))
    K(sk, w, "kejadian", tot[0], satuan="kejadian", label="resmi", sumber=sumber, catatan=catatan + "; kejadian lintas kab dibagi pecahan oleh DIBI (jumlahnya 1); korban dan rumah dicatat per kab")
    K(sk, w, "meninggal_tercatat", tot[1], satuan="jiwa", label="resmi", sumber=sumber, catatan=catatan)
    K(sk, w, "hilang_tercatat", tot[2], satuan="jiwa", label="resmi", sumber=sumber, catatan=catatan)
    if R:
        lo, hi = korban(vj, R)
        K(sk, w, "korban_jiwa", None, lo, hi, "jiwa", "estimasi-model", SRC["dibi"], dasar + banding(mh(tot), hi))
    K(sk, w, "terdampak_menderita", tot[3], satuan="jiwa", label="resmi", sumber=sumber, catatan="kolom DIBI 'menderita'")
    K(sk, w, "mengungsi", tot[4], satuan="jiwa", label="resmi", sumber=sumber, catatan="jumlah pengungsi tercatat DIBI, bukan pengungsi hari ke-7")
    hm = par["hari_mengungsi"]
    K(sk, w, "hari_mengungsi", tot[4] * hm[0], tot[4] * hm[1], tot[4] * hm[2], "jiwa-hari", "asumsi-kebijakan", SRC["param"] + "hari_mengungsi",
      f"mengungsi x {hm[0]} hari (rendah {hm[1]}, tinggi {hm[2]}); {hm[4]}")
    for i, nm in ((5, "rumah_rusak_berat"), (6, "rumah_rusak_sedang"), (7, "rumah_rusak_ringan")):
        K(sk, w, nm, tot[i], satuan="unit", label="resmi", sumber=sumber, catatan=catatan)
    lo, hi = materiil(tot, par)
    K(sk, w, "materiil_batas_bawah", None, lo, hi, "Rp", "asumsi-kebijakan", SRC["param"] + "stimulan_rumah_rb/rs/rr",
      "rumah RB/RS/RR tercatat x stimulan BNPB: rendah skema lama 50/25/10 jt, tinggi skema 2022+ 60/30/15 jt. Batas bawah biaya rehab rumah, BUKAN kerugian ekonomi penuh")
    return tot


def banding(tercatat, tinggi):
    t = f". Tercatat di musim/tahun analog: {tercatat:.0f} jiwa meninggal+hilang"
    return t + (" (DI ATAS batas tinggi: periode analog memuat kejadian ekstrem yang tidak tertangkap rasio rata-rata tahunan; pakai angka tercatat sebagai batas bawah skenario)"
                if tercatat > tinggi else "")


def kartu_paparan(K, sk, w, bahaya, kab_w, ov, krb):
    for h in bahaya:
        if h in krb:
            s = lambda f: sum(krb[h][k].get(f) or 0 for k in kab_w)
            K(sk, w, f"luas_bahaya_tinggi_{h}", s("tinggi_luas"), satuan="ha", label="resmi", sumber=SRC["krb"], catatan="kelas tinggi KRB 2022-2026; batas atas luas terdampak, bukan jejak satu kejadian")
            K(sk, w, f"luas_bahaya_sedang_{h}", s("sedang_luas"), satuan="ha", label="resmi", sumber=SRC["krb"])
            ren = (f"; jumlah 514 kab = {idn(100 * s('terpapar') / RENAS_TERPAPAR[h], 2)}% angka nasional {idn(RENAS_TERPAPAR[h])} jiwa (selisih {idn(RENAS_TERPAPAR[h] - s('terpapar'))} jiwa) "
                   f"di {SRC['renas_krb']}" + ("; API KRB nasional gelombang 4.104.943, juga beda dengan Renas" if h == "gelombang_abrasi" else "")) if w == "nasional" else ""
            K(sk, w, f"terpapar_krb_{h}", s("terpapar"), satuan="jiwa", label="resmi", sumber=SRC["krb"],
              catatan="kolom API 'terpapar'; tafsiran 'penduduk zona sedang+tinggi' adalah inferensi (total_luas API = sedang+tinggi). Kolom API jiwa_terpapar (lebih kecil) "
                      "tidak dipakai karena tidak dikutip dokumen resmi" + ren)
            K(sk, w, f"kerugian_potensi_krb_{h}", (s("fisik_rp") + s("ekonomi_rp")) * 1e6, satuan="Rp", label="resmi", sumber=SRC["krb"],
              catatan="potensi kerugian fisik + ekonomi KRB (API dalam juta Rp) seluruh kelas; pembanding, bukan kerugian satu skenario")
        if h in OVERLAY:
            K(sk, w, f"jiwa_kec_bahaya_tinggi_{h}", sum(ov[(k, h)][0] for k in kab_w), satuan="jiwa", label="estimasi-model", sumber=SRC["overlay"],
              catatan=f"seluruh penduduk kecamatan yang indeks maks InaRISK >= {AMBANG_TINGGI:.3f}; batas atas (tidak semua penghuni di piksel berbahaya); overlay belum diuji balik")


PEMBANDING = "pembanding musim berat tipikal, bukan skenario terburuk: batas tinggi di bawah lantai tercatat"


def lantai_musim(musim_tot, w, tahun=range(2008, 2026)):
    """(tahun awal, meninggal+hilang) musim hujan tercatat terbesar wilayah w dalam periode acuan (KERANGKA prinsip 9)."""
    ada = [y for y in tahun if (w, y) in musim_tot]
    y = max(ada, key=lambda y: (mh(musim_tot[(w, y)]), y))
    return y, mh(musim_tot[(w, y)])


def kartu_lantai(K, kab_w, musim_tot, oni, lanina, rows, kota):
    """Kartu lantai, kartu musim setelah El Nino kuat, dan uji kepekaan rekaman Bekasi 2020 (KERANGKA §10 paket skenario-hidromet).
    Kembalikan {wilayah: lantai meninggal+hilang} untuk penanda pembanding dan gerbang cek_lantai."""
    src, out = SRC["dibi"], {}
    for w in kab_w:
        y, n = lantai_musim(musim_tot, w)
        y10, n10 = lantai_musim(musim_tot, w, range(2016, 2026))
        out[w] = n
        cat = (f"meninggal+hilang tercatat terbesar di antara 18 musim hujan 2008/09-2025/26 (1 Okt-30 Apr): musim {y}/{y + 1}, "
               f"{musim_tot[(w, y)][1]:.0f} meninggal + {musim_tot[(w, y)][2]:.0f} hilang. Lantai: skenario terburuk tidak boleh lebih ringan (KERANGKA prinsip 9)")
        K("musim_hujan_lantai", w, "lantai_meninggal_hilang", n, satuan="jiwa", label="resmi", sumber=src, catatan=cat)
        K("musim_hujan_lantai", w, "musim_lantai_tahun_awal", y, satuan="tahun", label="resmi", sumber=src, catatan=cat)
        K("musim_hujan_lantai", w, "korban_jiwa", None, n, n, "jiwa", "resmi", src,
          cat + "; skenario terburuk musim hujan = lantai tercatat, rendah = tinggi (bukan keluaran model)")
        c10 = f"terbesar dalam 10 musim terakhir 2016/17-2025/26: musim {y10}/{y10 + 1}"
        K("musim_hujan_lantai", w, "lantai_10_musim_meninggal_hilang", n10, satuan="jiwa", label="resmi", sumber=src, catatan=c10)
        K("musim_hujan_lantai", w, "musim_lantai_10_tahun_awal", y10, satuan="tahun", label="resmi", sumber=src, catatan=c10)
        K("musim_hujan_lantai", w, "musim_lanina_n", sum(1 for y_ in range(2008, 2026) if y_ in lanina), satuan="musim", label="resmi",
          sumber=SRC["oni"], catatan="musim 2008/09-2025/26 yang NDJ-nya bagian episode La Nina CPC; baris kepekaan fase ENSO 2027-2030, bukan judul")
        # musim hujan setelah El Nino kuat (analog 2026/2027): ONI NDJ musim itu >= ELNINO_KUAT
        el = [y_ for y_ in range(2008, 2026) if (w, y_) in musim_tot and oni[("NDJ", y_)] >= ELNINO_KUAT]
        ce = f"musim hujan dengan ONI NDJ >= {idn(ELNINO_KUAT, 1)} (El Nino kuat) 2008/09-2025/26; analog operasional musim 2026/2027"
        K("musim_hujan_pasca_elnino", w, "musim_analog_n", len(el), satuan="musim", label="resmi", sumber=SRC["oni"] + "; " + src, catatan=ce)
        for y_ in el:
            v = musim_tot[(w, y_)]
            for m_, x, s_ in ((f"meninggal_hilang_{y_}", mh(v), "jiwa"), (f"mengungsi_{y_}", v[4], "jiwa"), (f"kejadian_{y_}", v[0], "kejadian"),
                              (f"oni_ndj_{y_}", oni[("NDJ", y_)], "ONI")):
                K("musim_hujan_pasca_elnino", w, m_, x, satuan=s_, label="resmi", sumber=SRC["oni"] if s_ == "ONI" else src,
                  catatan=f"musim {y_}/{y_ + 1}; " + ce)
    # uji kepekaan rekaman Kota Bekasi 1 Jan 2020: pilihan "musim terberat" gabungan lima metrik dengan dan tanpa rekaman itu
    nama, tgl, ungsi = BEKASI_2020
    kb = [k for k, v in kota.items() if v["nama"] == nama and v["prov"] == "32"]
    rek = [r for r in rows if r[0] in kb and r[2] == tgl and r[4][4] == ungsi]
    assert len(rek) == 1, f"rekaman {nama} {tgl} {ungsi} mengungsi: {len(rek)} baris (DIBI berubah? perbarui BEKASI_2020)"
    y_r = musim_dari(tgl)
    for w in kab_w:
        semua = [y for y in range(2008, 2026) if (w, y) in musim_tot]
        tanpa = {y: list(musim_tot[(w, y)]) for y in semua}
        tanpa[y_r] = [a - b for a, b in zip(tanpa[y_r], rek[0][4])]
        dengan_y, tanpa_y = peringkat_gabung(semua, {y: musim_tot[(w, y)] for y in semua}), peringkat_gabung(semua, tanpa)
        cb = (f"rekaman DIBI {nama} {tgl.isoformat()} {idn(ungsi)} mengungsi (status tidak terbukti, dibi/rekonsiliasi.csv); peringkat gabungan "
              "kejadian, meninggal+hilang, menderita, mengungsi, rumah rusak 2008/09-2025/26. Aturan pemilihan buatan paket")
        K("uji_kepekaan_bekasi", w, "musim_terberat_dengan_rekaman", dengan_y, satuan="tahun", label="asumsi-kebijakan", sumber=src, catatan=cb)
        K("uji_kepekaan_bekasi", w, "musim_terberat_tanpa_rekaman", tanpa_y, satuan="tahun", label="asumsi-kebijakan", sumber=src, catatan=cb)
        K("uji_kepekaan_bekasi", w, f"mengungsi_{y_r}_dengan_rekaman", musim_tot[(w, y_r)][4], satuan="jiwa", label="resmi", sumber=src, catatan=cb)
        K("uji_kepekaan_bekasi", w, f"mengungsi_{y_r}_tanpa_rekaman", tanpa[y_r][4], satuan="jiwa", label="resmi", sumber=src, catatan=cb)
    return out


def tandai_pembanding(kartu, lantai):
    """Baris korban_jiwa model musim hujan yang batas tingginya di bawah lantai tercatat diberi penanda pembanding (KERANGKA B01)."""
    for b in kartu:
        if b["skenario"].startswith("musim_hujan_") and b["metrik"] == "korban_jiwa" and b["tinggi"] is not None \
                and b["tinggi"] < lantai[b["wilayah"]] and PEMBANDING not in b["catatan"]:
            b["catatan"] = f"{PEMBANDING} ({lantai[b['wilayah']]:.0f} jiwa); " + b["catatan"]


def cek_lantai(kartu, musim_tot):
    """Gerbang KERANGKA §10: skenario tinggi >= tercatat terbesar dalam periode acuan. Kartu lantai tiap wilayah sama dengan
    meninggal+hilang musim tercatat terbesar; baris korban_jiwa musim hujan lain yang di bawahnya wajib berpenanda pembanding."""
    wil = {b["wilayah"] for b in kartu if b["skenario"] == "musim_hujan_lantai"}
    assert wil, "kartu musim_hujan_lantai tidak ada"
    for w in wil:
        _, n = lantai_musim(musim_tot, w)
        kj = [b for b in kartu if b["skenario"] == "musim_hujan_lantai" and b["wilayah"] == w and b["metrik"] == "korban_jiwa"]
        assert len(kj) == 1 and kj[0]["tinggi"] >= n - 1e-9, f"lantai {w}: kartu {kj[0]['tinggi'] if kj else None} < tercatat terbesar {n}"
        for b in kartu:
            if b["skenario"].startswith("musim_hujan_") and b["wilayah"] == w and b["metrik"] == "korban_jiwa" and b["tinggi"] is not None:
                assert b["tinggi"] >= n - 1e-9 or PEMBANDING in b["catatan"], \
                    f"{b['skenario']} {w}: korban tinggi {b['tinggi']:.0f} < lantai tercatat {n:.0f} tanpa penanda pembanding"


# ---------------------------------------------------------------- susun semua keluaran
def bangun(ulang=False):
    t0 = time.time()
    tarik(ulang)
    tgl = tanggal_tarik()
    for k in ("dibi", "krb", "oni", "sipongi"):
        SRC[k] = SRC[k].replace("{tarik}", tgl[k])
    par, kota = muat_param(), muat_kota()
    pen, kec_kab, jiwa = penduduk_kab(kota)
    ov, krb = paparan_overlay(pen, kec_kab), muat_krb()
    rows, tak, nas_dibi, n_baris, tak_v, jenis_dibi = muat_dibi(kota)
    kab_total, tahunan, kab_tahun, musim_kab, musim_wil, tanpa_tgl = agregasi(rows, kota)
    oni = baca_oni()
    ln = episode_lanina(oni)
    ker = jalankan_kering()
    kab_ker, tanpa_ker = kering_per_kab(ker, pen, kec_kab)
    sip = sipongi()
    uj = json.load(open(os.path.join(AKAR, "public/data/kekeringan_ujibalik.json")))
    rep = json.load(open(os.path.join(AKAR, "public/banjir/data/replay/maret2025.json")))
    abr = json.load(open(os.path.join(AKAR, "public/pesisir/data/abrasi.json")))
    kab_w = {"nasional": sorted(kota), "jawa": sorted(k for k in kota if kota[k]["prov"] in JAWA)}
    R = {w: {j: rasio(tahunan, w, j) for j in JENIS} for w in kab_w}
    for j in JENIS:   # wilayah Jawa dengan < 5 tahun ber->= 5 kejadian memakai rasio nasional (dicatat di rasio_korban.csv)
        if R["jawa"][j]["n"] < 5:
            R["jawa"][j] = {**R["nasional"][j], "pinjam_nasional": True}
    K = Kartu()

    # ---- musim hujan: La Nina dan terberat tercatat
    musim_tot = {}
    for (w, y, j), v in musim_wil.items():
        tambah(musim_tot.setdefault((w, y), vek()), v)
    lanina = {y for y in range(2008, 2026) if ("NDJ", y) in ln}
    analog = {}
    for w in kab_w:
        semua = [y for y in range(2008, 2026) if (w, y) in musim_tot]
        analog[w] = {"lanina": peringkat_gabung([y for y in semua if y in lanina], {y: musim_tot[(w, y)] for y in semua}),
                     "terberat": peringkat_gabung(semua, {y: musim_tot[(w, y)] for y in semua})}
        for var, y in analog[w].items():
            sk = f"musim_hujan_{'lanina' if var == 'lanina' else 'terberat_tercatat'}"
            o = oni[("NDJ", y)]
            st = " (episode La Nina CPC)" if y in lanina else " (netral/El Nino, bukan La Nina)" if o > -0.5 else " (bukan episode La Nina CPC: <5 musim ONI <= -0,5)"
            cat = (f"musim hujan {y}/{y + 1} (1 Okt {y} - 30 Apr {y + 1}), ONI NDJ {o:+.2f}{st}; dipilih dengan peringkat gabungan "
                   f"kejadian, meninggal+hilang, menderita, mengungsi, rumah rusak di antara {'musim La Nina' if var == 'lanina' else 'semua musim'} 2008/09-2025/26")
            K(sk, w, "musim_analog_tahun_awal", y, satuan="tahun", label="asumsi-kebijakan", sumber=SRC["dibi"] + "; " + SRC["oni"],
              catatan=cat + ". Aturan pemilihan buatan paket (asumsi-kebijakan); angka DIBI musim itu resmi di baris lain")
            kartu_dampak(K, sk, w, {j: musim_wil.get((w, y, j), vek()) for j in JENIS_MH}, R[w], par, SRC["dibi"], cat)
            kartu_paparan(K, sk, w, ("banjir", "banjir_bandang", "longsor", "cuaca_ekstrem"), kab_w[w], ov, krb)
    lantai = kartu_lantai(K, kab_w, musim_tot, oni, lanina, rows, kota)
    K("musim_hujan_lanina", "nasional", "pembanding_rugi_banjir_jabodetabek_2007", DALA2007["total"] * 1e9, satuan="Rp per kejadian", label="resmi",
      sumber=SRC["dala2007"] + ", Tabel III.1 hlm. 33 (PDF hlm. 42)",
      catatan=f"banjir 31 Jan-9 Feb 2007, status 14 Feb 2007: kerusakan Rp{idn(DALA2007['kerusakan'], 2)} M + kerugian Rp{idn(DALA2007['kerugian'], 2)} M; "
              f"pemerintah Rp{idn(DALA2007['pemerintah'], 2)} M, swasta/masyarakat Rp{idn(DALA2007['swasta'], 2)} M (ringkasan PDF hlm. 8: 'Rp5,16 triliun'). param_banjir.json mencatat Rp5,2-8,8 T")
    K("musim_hujan_lanina", "nasional", "pembanding_rugi_ekonomi_apindo_aaui_jabodetabek_2007", DALA2007_APINDO_RP, satuan="Rp per kejadian", label="terverifikasi",
      sumber=SRC["dala2007"] + ", ringkasan PDF hlm. 8",
      catatan="perkiraan APINDO dan AAUI US$400 juta (sekitar Rp3,6 T) sepekan banjir, dikutip laporan Bappenas dan Menteri Perindustrian 13 Feb 2007; bukan hitungan DaLA, "
              "mencakup kerusakan perumahan/kendaraan sehingga bisa tumpang tindih dengan Tabel III.1 (jangan dijumlah begitu saja: 5,2 + 3,6 = 8,8 T di param_banjir.json)")
    p = par["rugi_banjir_bandang_garut_2016"]
    K("musim_hujan_lanina", "nasional", "pembanding_rugi_banjir_bandang_garut_2016", p[0], p[1], p[2], "Rp per kejadian", "estimasi-model",
      SRC["param"] + "rugi_banjir_bandang_garut_2016 -- " + p[4], "estimasi akademik (skripsi, exposure tata guna lahan), bukan Jitupasna resmi; sumber primer belum dibuka di paket ini. " + p[5])

    # ---- kasus nyata Jawa
    jabo = {k for k, v in kota.items() if v["prov"] == "31" or (v["prov"] in JABODETABEK and v["kab_peta"] in JABODETABEK[v["prov"]])}
    v20 = jendela(rows, jabo, dt.date(2019, 12, 31), dt.date(2020, 1, 8))
    cat20 = f"DIBI 31 Des 2019 - 8 Jan 2020, {len(jabo)} kab/kota Jabodetabek, jenis musim hujan"
    kartu_dampak(K, "kasus_jabodetabek_2020", "jawa", {"semua_hidromet": v20}, None, par, SRC["dibi"], cat20, per_jenis=False)
    lebak = {k for k, v in kota.items() if v["prov"] == "36" and v["kab_peta"] == "Lebak"}
    assert len(lebak) == 1, lebak
    vjl = jendela(rows, jabo | lebak, dt.date(2019, 12, 31), dt.date(2020, 1, 8))
    catl = (f"DIBI 31 Des 2019 - 8 Jan 2020, Jabodetabek {len(jabo)} kab/kota + Lebak, jenis musim hujan. Meninggal cocok dengan Renstra bila Lebak dihitung "
            f"({v20[1]:.0f} + {vjl[1] - v20[1]:.0f} = {vjl[1]:.0f}); pengungsi tetap berbeda jauh. riset/A-dokumen-bnpb.md §4.4 menulis DIBI 60 meninggal, 2 hilang, "
            "450.717 mengungsi: di cache ini 450.717 = Jabodetabek + Lebak + Karawang (926 mengungsi, 0 meninggal), sedangkan meninggal set itu 61; selisih 1 jiwa tidak tereproduksi "
            "(kemungkinan revisi DIBI antartarik)")
    for m_, i, s_ in (("meninggal_tercatat_jabodetabek_lebak", 1, "jiwa"), ("hilang_tercatat_jabodetabek_lebak", 2, "jiwa"), ("mengungsi_jabodetabek_lebak", 4, "jiwa")):
        K("kasus_jabodetabek_2020", "jawa", m_, vjl[i], satuan=s_, label="resmi", sumber=SRC["dibi"], catatan=catl)
    for m_, x, s_ in (("meninggal_renstra", 61, "jiwa"), ("pengungsi_renstra", 11569, "jiwa"), ("rumah_rusak_renstra", 3245, "unit")):
        K("kasus_jabodetabek_2020", "jawa", m_, x, satuan=s_, label="resmi", sumber="Perban BNPB 5/2025 (Renstra BNPB 2025-2029) hlm. 11, via riset/A-dokumen-bnpb.md §4.4 (PDF tidak dibuka ulang)",
          catatan="versi Renstra (cakupan wilayah tidak disebut). Meninggal cocok dengan DIBI bila Lebak dihitung (lihat baris *_jabodetabek_lebak); pengungsi DIBI jauh lebih besar, keduanya disimpan")
    v25 = jendela(rows, jabo, dt.date(2025, 3, 2), dt.date(2025, 3, 8))
    cat25 = f"DIBI 2-8 Mar 2025, {len(jabo)} kab/kota Jabodetabek, jenis musim hujan"
    kartu_dampak(K, "kasus_replay_maret2025", "jawa", {"semua_hidromet": v25}, None, par, SRC["dibi"], cat25, per_jenis=False)
    rs, vr = rep["ringkasan"], rep["validasi"]["ringkas"]
    galat = (f"galat tercatat: luas tergenang >=10 cm Kota Bekasi model {vr['luas_kota_bekasi']['tergenang_ge10cm_hmaks_ha']} ha lawan survei ITB {vr['luas_kota_bekasi']['itb']['survei_ha']} ha; "
             f"POD 10 cm {vr['pod_10cm']} (sel) / {vr['pod_10cm_3x3']} (3x3) dari {vr['n_utama']} laporan; bias kedalaman {vr['selisih_sel']['bias_cm']} cm (MAE {vr['selisih_sel']['mae_cm']} cm, n={vr['selisih_sel']['n']}). "
             + rep["batas"][0])
    for m_, x, s in (("model_luas_puncak", rs["luas_puncak_km2"], "km2"), ("model_gedung_tergenang_puncak", rs["gedung_puncak"], "gedung"), ("model_kedalaman_maks", rs["hmaks_cm"], "cm")):
        K("kasus_replay_maret2025", "jawa", m_, x, satuan=s, label="estimasi-model", sumber=SRC["replay"] + " ringkasan", catatan=f"kisi 24 km Jabodetabek timur, ambang tergenang {rs['tergenang_ambang_cm']} cm; {galat}")
    sum25 = {k for k, v in kota.items() if v["prov"] in ("11", "12", "13")}
    vs = jendela(rows, sum25, dt.date(2025, 11, 15), dt.date(2025, 12, 31))
    kartu_dampak(K, "kasus_sumatra_nov2025", "sumatra_aceh_sumut_sumbar", {"semua_hidromet": vs}, None, par, SRC["dibi"],
                 "DIBI 15 Nov - 31 Des 2025, Aceh+Sumut+Sumbar, jenis musim hujan; kejadian hidromet tunggal terburuk dalam DIBI", per_jenis=False)

    # ---- gelombang ekstrem, abrasi, rob
    for w in kab_w:
        vj, cat = {}, []
        for j in ("gelombang_abrasi", "rob"):
            th = max(TAHUN_RASIO, key=lambda t: ((tahunan.get((w, j, t)) or vek())[0], mh(tahunan.get((w, j, t)) or vek())))
            vj[j] = tahunan.get((w, j, th)) or vek()
            cat.append(f"{j}: tahun analog {th} (kejadian terbanyak {TAHUN_RASIO.start}-{TAHUN_RASIO.stop - 1})")
            K("gelombang_abrasi_rob", w, f"tahun_analog_{j}", th, satuan="tahun", label="asumsi-kebijakan", sumber=SRC["dibi"],
              catatan=cat[-1] + "; aturan pemilihan buatan paket, angka DIBI tahun itu resmi di baris lain")
        kartu_dampak(K, "gelombang_abrasi_rob", w, vj, R[w], par, SRC["dibi"], "; ".join(cat) + "; DIBI rob baru ada sejak 2018, kosong 2019 dan 2024")
        kartu_paparan(K, "gelombang_abrasi_rob", w, ("gelombang_abrasi",), kab_w[w], ov, krb)
    p = par["rugi_rob_semarang"]
    K("gelombang_abrasi_rob", "jawa", "pembanding_rugi_rob_semarang", p[0], p[1], p[2], "Rp (periode tidak jelas)", "estimasi-model", SRC["param"] + "rugi_rob_semarang -- " + p[4],
      "estimasi akademik (Undip/UGM per skenario genangan), sumber primer belum dibuka di paket ini. " + p[5])
    for s in abr["situs"]:
        K("gelombang_abrasi_rob", "jawa", f"laju_garis_pantai_{s['id']}", s["laju_median"], satuan="m/tahun", label="estimasi-model", sumber=SRC["abrasi"],
          catatan=f"{s['nama']}, {s['kab']}; negatif = mundur; {s['abrasi_nyata']} transek abrasi nyata dari {s['transek']}; belum dikoreksi pasang surut, tanpa uji lapangan")

    # ---- kekeringan analog 2015 (mesin neraca + padi) dan pembanding DIBI
    ujw = uj["kejadian"]["aturan"]["waspada"]["2023-10..2024-12"]
    cat_mod = (f"simulasi.js jalankan(): mulai 1 Jun 2015 simpanan penuh, tanam hari ke-{ker['arg']['tanam']} (1 Jul), hujan+ET0 NASA POWER 2015 (hindcast.json); "
               f"krisis air = tanah acuan stres berat >= {ker['arg']['hari_kering']} hari berturut dan >= 0,2 TAW lebih kering dari Normal; porsi rentan 1 (batas atas). "
               f"Mesin neraca/padi belum pernah diuji balik terhadap data puso/produksi; uji balik yang ada ({SRC['ujibalik']} kejadian.aturan) menguji aturan peringatan "
               f"SPI-3 <= -1 (POD {idn(ujw['pod'], 2)}, FAR {idn(ujw['far'], 2)}, layak={str(uj['kejadian']['vonis']['layak']).lower()}, 2023-10..2024-12), bukan mesin ini. "
               "Padi = tadah hujan tanpa irigasi, BUKAN data puso; sawah dari tutupan.json (bukan pengamatan)")
    LAMPIRAN = Kartu()   # angka mesin kekeringan yang belum diuji balik: lampiran, bukan kartu utama
    for w in kab_w:
        kk = [k for k in kab_w[w] if k in kab_ker]
        W = sum(kab_ker[k]["w"] for k in kk)
        L = LAMPIRAN
        L("kekeringan_2015", w, "padi_turun_hasil_2015", 100 * sum(kab_ker[k]["l15"] for k in kk) / W, satuan="% hasil", label="estimasi-model", sumber=SRC["neraca"],
          catatan="rerata berbobot penduduk kecamatan (pola scripts/kekeringan/padi.py); " + cat_mod)
        L("kekeringan_2015", w, "padi_turun_hasil_normal", 100 * sum(kab_ker[k]["ln"] for k in kk) / W, satuan="% hasil", label="estimasi-model", sumber=SRC["neraca"],
          catatan="skenario normal_k (klimatologi 1991-2020) dengan tanggal sama; selisih terhadap angka 2015 adalah sinyal anomali; " + cat_mod)
        # jiwa sel krisis air (porsi rentan 1) sengaja tidak ditulis ke kartu maupun lampiran: batas atas tanpa daya beda; ada di kab.json kolom kering2015_jiwa_sel_krisis
        sel = set().union(*(kab_ker[k]["sel"] for k in kk))
        for nm, run in (("2015", "y2015"), ("normal", "normal")):
            saw = sum(ker["sawah"][i] for i in sel)
            L("kekeringan_2015", w, f"sawah_model_padi_hilang_{nm}", sum(ker["sawah"][i] * ker[run]["loss"][i] for i in sel), satuan="ha setara", label="estimasi-model", sumber=SRC["neraca"],
              catatan=f"sum sawah sel x penurunan hasil (dampak() simulasi.js); sawah model sel terkait {saw:.0f} ha; " + cat_mod)
            L("kekeringan_2015", w, f"sawah_model_puso_{nm}", sum(ker["sawah"][i] for i in sel if ker[run]["loss"][i] >= 0.5), satuan="ha", label="estimasi-model", sumber=SRC["neraca"],
              catatan="sawah sel dengan penurunan hasil >= 50% (ambang GAGAL simulasi.js); bukan definisi puso Kementan dan bukan data puso; " + cat_mod)
        for th in (2015, max(TAHUN_RASIO, key=lambda t: (tahunan.get((w, "kekeringan", t)) or vek())[3])):
            v = tahunan.get((w, "kekeringan", th)) or vek()
            K("kekeringan_2015", w, f"dibi_kejadian_{th}", v[0], satuan="kejadian", label="resmi", sumber=SRC["dibi"], catatan="kekeringan DIBI tahun " + str(th) + (" (tahun analog)" if th == 2015 else " (menderita terbesar 2010-2025)"))
            K("kekeringan_2015", w, f"dibi_terdampak_{th}", v[3], satuan="jiwa", label="resmi", sumber=SRC["dibi"], catatan="kolom 'menderita'; pencatatan antartahun tidak seragam")
            lo, hi = korban({"kekeringan": v}, R[w])
            K("kekeringan_2015", w, f"korban_jiwa_{th}", None, lo, hi, "jiwa", "estimasi-model", SRC["dibi"],
              "kejadian x rasio DIBI kekeringan (median, p90); kematian langsung kekeringan hampir tidak tercatat" + banding(mh(v), hi))
        kartu_paparan(K, "kekeringan_2015", w, ("kekeringan",), kab_w[w], ov, krb)
    b15 = uj["aturan"]["tahun"]["2015"]["bulan"]["10"]
    for i, amb in enumerate(("-1", "-1,5", "-2")):
        K("kekeringan_2015", "nasional", f"pct_kab_spi3_le{amb.replace(',', '')}_okt2015", b15["kab"][i], satuan="% kab", label="estimasi-model", sumber=SRC["ujibalik"] + " aturan.tahun.2015.bulan.10.kab",
          catatan=f"SPI-3 tinggal-satu-tahun NASA POWER; tahun netral maks {uj['aturan']['netral']['bulan']['10']['kab_waspada']['maks']}% (SPI <= -1); A: tidak layak sebagai status, boleh sebagai analog besaran")
    # model_jiwa_puncak (porsi rentan 1) tidak ditulis ke kartu: batas atas tanpa daya beda; tetap di kab.json meta.kering.mesin_dampak_2015

    # ---- karhutla analog 2015 dan 2019
    # korban jiwa berbasis rasio TIDAK dibuat untuk karhutla: kematian DIBI karhutla didominasi kebakaran hutan/gunung di Jawa, tidak bermakna untuk skenario asap
    def mati(kk, th):   # "Magetan 7, Ponorogo 5" dari DIBI, terbesar dulu
        x = sorted(((mh(kab_tahun.get((k, "karhutla", th)) or vek()), kota[k]["kab_peta"]) for k in kk), reverse=True)
        return ", ".join(f"{n} {int(m)}" for m, n in x if m > 0) or "tidak ada"
    jawa_kab = kab_w["jawa"]
    cat_jawa = {"2015": "kematian DIBI di Jawa = kebakaran hutan/gunung setempat (mis. Magetan 18 Okt 2015), bukan korban asap",
                "2019": "kematian DIBI di Jawa = kebakaran hutan/lahan setempat, bukan asap; baris DIBI Sumedang 12 Sep 2019 mencatat 62.665 menderita (pencilan)"}
    for th in ("2015", "2019"):
        sk = f"karhutla_{th}"
        for w in kab_w:
            provs = sorted({kota[k]["prov"] for k in kab_w[w]})
            K(sk, w, "luas_terbakar_sipongi", sum(sip.get((p, th), 0) for p in provs), satuan="ha", label="resmi", sumber=SRC["sipongi"],
              catatan="indikasi luas kebakaran Kementerian Kehutanan (SiPongi; sebelum Okt 2024 KLHK) per provinsi")
            v = tahunan.get((w, "karhutla", int(th))) or vek()
            asap, lain = vek(), vek()
            for k in kab_w[w]:
                tambah(asap if kota[k]["prov"] in PROV_ASAP else lain, kab_tahun.get((k, "karhutla", int(th))) or vek())
            K(sk, w, "dibi_kejadian", v[0], satuan="kejadian", label="resmi", sumber=SRC["dibi"])
            K(sk, w, "dibi_meninggal_hilang", mh(v), satuan="jiwa", label="resmi", sumber=SRC["dibi"],
              catatan=f"semua provinsi; BUKAN korban asap (lihat baris _prov_asap dan _prov_lain). Jawa: {mati(jawa_kab, int(th))}; " + cat_jawa[th])
            kk_asap = [k for k in kab_w[w] if kota[k]["prov"] in PROV_ASAP]
            K(sk, w, "dibi_meninggal_hilang_prov_asap", mh(asap), satuan="jiwa", label="resmi", sumber=SRC["dibi"],
              catatan="provinsi asap " + "/".join(PROV_ASAP) + f" ({mati(kk_asap, int(th))})" + ("; Banyuasin 4 Jan 2019 di luar musim asap Jun-Okt" if th == "2019" and mh(asap) else "")
                      + "; pembanding setara angka Bank Dunia/pers, bukan angka semua provinsi")
            K(sk, w, "dibi_meninggal_hilang_prov_lain", mh(lain), satuan="jiwa", label="resmi", sumber=SRC["dibi"],
              catatan=f"provinsi selain asap ({mati([k for k in kab_w[w] if kota[k]['prov'] not in PROV_ASAP], int(th))}); " + cat_jawa[th])
            K(sk, w, "dibi_mengungsi", v[4], satuan="jiwa", label="resmi", sumber=SRC["dibi"])
        for m_, x, sat in (("luas_bahaya_total_krb_karhutla", RENAS_KARHUTLA["luas_total_ha"], "ha"), ("luas_bahaya_tinggi_krb_karhutla", RENAS_KARHUTLA["luas_tinggi_ha"], "ha"),
                           ("kerugian_potensi_krb_karhutla", RENAS_KARHUTLA["kerugian_juta_rp"] * 1e6, "Rp"), ("kerusakan_lingkungan_krb_karhutla", RENAS_KARHUTLA["lingkungan_ha"], "ha")):
            K(sk, "nasional", m_, x, satuan=sat, label="resmi", sumber=SRC["renas_krb"],
              catatan="paparan nasional karhutla KRB 2022-2026 (penduduk terpapar tidak disajikan); per kab tidak tersedia (API KRB karhutla membalas nol); pembanding, bukan jejak satu musim")
        if th == "2015":
            K(sk, "nasional", "luas_terbakar_bank_dunia", WB2015_TOTAL_RIBU_HA * 1000, satuan="ha", label="terverifikasi", sumber=SRC["wb2015"], catatan="Juni-Okt 2015, sumber tabel BPPT/KLHK/Bank Dunia")
            K(sk, "nasional", "kerugian_bank_dunia", WB["2015"]["usd"], satuan="USD", label="terverifikasi", sumber=SRC["wb2015"], catatan="kerusakan + kerugian 8 provinsi, setara 1,9% PDB 2015; biaya regional/global tidak termasuk")
            K(sk, "nasional", "kerugian_bank_dunia_idr", WB["2015"]["idr"], satuan="Rp", label="terverifikasi", sumber=SRC["wb2015"])
            K(sk, "nasional", "kerugian_bank_dunia_pct_pdb", WB["2015"]["pdb_pct"], satuan="% PDB", label="terverifikasi", sumber=SRC["wb2015"])
            K(sk, "nasional", "meninggal_bank_dunia", WB["2015"]["meninggal"], satuan="jiwa", label="terverifikasi", sumber=SRC["wb2015"],
              catatan="'haze contributed to the death of 19 people' (Bank Dunia mengutip The Guardian); pembanding setaranya DIBI provinsi asap (12), bukan DIBI semua provinsi (24)")
            K(sk, "nasional", "ispa", ISPA2015_TOTAL, satuan="kasus", label="terverifikasi", sumber=SRC["ispa2015"],
              catatan="angka BNPB via pers; rilis asli belum dibuka. Juli-22 Okt 2015, 6 provinsi, laporan puskesmas dan RS; BNPB: angka riil jauh lebih besar. Bank Dunia: " + WB["2015"]["ispa_teks"])
        else:
            K(sk, "nasional", "luas_terbakar_bank_dunia_jan_sep", 620201, satuan="ha", label="terverifikasi", sumber=SRC["wb2019"], catatan="'Official estimates suggest that 620,201 hectares ... burned in eight affected provinces between January-September 2019' (data KLHK)")
            K(sk, "nasional", "kerugian_bank_dunia", WB["2019"]["usd"], satuan="USD", label="terverifikasi", sumber=SRC["wb2019"], catatan="8 provinsi Jun-Okt 2019: kerusakan aset USD 157 juta + kerugian ekonomi USD 5,0 miliar; dampak kesehatan dan pendidikan tidak termasuk")
            K(sk, "nasional", "kerugian_bank_dunia_pct_pdb", WB["2019"]["pdb_pct"], satuan="% PDB", label="terverifikasi", sumber=SRC["wb2019"])
            K(sk, "nasional", "ispa", ISPA2019_TOTAL, satuan="kasus", label="terverifikasi", sumber=SRC["ispa2019"],
              catatan="angka BNPB/Kemenkes via pers; rilis asli belum dibuka. 6 provinsi, data Kemenkes per 23 Sep 2019 (sementara)")

    tandai_pembanding(K.b, lantai)

    # ---- kepekaan peringatan dini (hanya korban jiwa): pasangan lama (CAKUPAN x TARGET) + lintasan Renstra IKP (KERANGKA P06)
    c0r, c1r, sr = ikp_renstra()
    awal, tuju = {**CAKUPAN, "renstra_ikp_2025": (c0r, sr + " (2025)")}, {**TARGET, "renstra_ikp_2029": (c1r, sr + " (target 2029)")}
    pasangan = [(ck, tk) for ck in CAKUPAN for tk in TARGET] + [("renstra_ikp_2025", "renstra_ikp_2029")]
    kep = []
    for b in K.b:
        if b["metrik"] != "korban_jiwa":
            continue
        for ck, tk in pasangan:
            (c0, s0), (c1, s1) = awal[ck], tuju[tk]
            f = faktor_ews(c0, c1)
            lin = LINTASAN.get((ck, tk), "")
            kep.append({"skenario": b["skenario"], "wilayah": b["wilayah"], "cakupan_awal": ck, "c0": c0, "cakupan_target": tk, "c1": c1, "utama": (ck, tk) == UTAMA,
                        "lintasan": lin, "R": WMO_R, "faktor": f,
                        "korban_rendah_dasar": b["rendah"], "korban_tinggi_dasar": b["tinggi"], "korban_rendah": b["rendah"] * f, "korban_tinggi": b["tinggi"] * f,
                        "label": "asumsi-kebijakan", "sumber": f"R: {SRC['wmo']}; c0: {s0}; c1: {s1}",
                        "catatan": ("LINTAS INDIKATOR, hanya ilustrasi: c0 Renstra (masyarakat terpapar di kawasan risiko tinggi) beda penyebut dengan c1 Renas 1.c. " if ck == "renstra_2025" else
                                    "lintasan Renstra IKP (penyebut layanan peringatan dini di daerah berisiko, beda dengan Renas 1.c; disajikan berdampingan, KERANGKA P06). " if lin == "renstra" else
                                    "pasangan utama, lintasan Renas 1.c (indikator yang sama). " if (ck, tk) == UTAMA else "") +
                                   "faktor = ((1-c1)+c1/R)/((1-c0)+c0/R): penduduk tercakup peringatan dini bermortalitas 1/R. R adalah asosiasi lintas negara, bukan efek kausal; "
                                   "untuk banjir bandang/longsor berwaktu-tunggu pendek manfaatnya lebih kecil. Peringatan dini tidak mengurangi rumah rusak (struktur tak terselamatkan). "
                                   "Pembanding: Bangladesh, kematian siklon turun >100 kali 1970-2007 lewat peringatan dini + shelter + tanggul + CPP (" + SRC["haque"] + "); itu paket 40 tahun, tidak dipakai sebagai koefisien"})

    # ---- per kab
    yA = analog["nasional"]["lanina"]
    kab_out = {}
    for k in sorted(kota):
        v = kota[k]
        vjA = {j: musim_kab.get((k, yA, j), vek()) for j in JENIS_MH}
        totA = vek()
        for x in vjA.values():
            tambah(totA, x)
        Rk = R["jawa" if v["prov"] in JAWA else "nasional"]   # sama dengan kartu wilayahnya: jumlah kab Jawa = kartu Jawa
        loA, hiA = korban(vjA, Rk)
        best = None
        for y in sorted(lanina):
            vj = {j: musim_kab.get((k, y, j), vek()) for j in JENIS_MH}
            lo, hi = korban(vj, Rk)
            if best is None or hi > best[2]:
                best = (y, lo, hi)
        env = {}
        for y in lanina:
            t = vek()
            for j in JENIS_MH:
                tambah(t, musim_kab.get((k, y, j), vek()))
            for i, nm in ((0, "kejadian"), (3, "menderita"), (4, "mengungsi")):
                env[nm] = max(env.get(nm, 0), t[i])
            env["materiil"] = max(env.get("materiil", 0), materiil(t, par)[1])
        kr = kab_ker.get(k)
        sc = {"analog_mh_kejadian": totA[0], "analog_mh_meninggal_hilang": mh(totA), "analog_mh_menderita": totA[3], "analog_mh_mengungsi": totA[4],
              "analog_mh_korban_rendah": loA, "analog_mh_korban_tinggi": hiA, "analog_mh_materiil_rendah_rp": materiil(totA, par)[0], "analog_mh_materiil_tinggi_rp": materiil(totA, par)[1],
              "selubung_lanina_musim_korban": best[0] if best[2] > 0 else None, "selubung_lanina_korban_rendah": best[1], "selubung_lanina_korban_tinggi": best[2],
              "selubung_lanina_kejadian_maks": env["kejadian"], "selubung_lanina_menderita_maks": env["menderita"], "selubung_lanina_mengungsi_maks": env["mengungsi"],
              "selubung_lanina_hari_mengungsi_maks": env["mengungsi"] * par["hari_mengungsi"][0], "selubung_lanina_materiil_tinggi_rp_maks": env["materiil"],
              "kering2015_padi_turun_pct": 100 * kr["l15"] / kr["w"] if kr else None, "kering_normal_padi_turun_pct": 100 * kr["ln"] / kr["w"] if kr else None,
              "kering2015_selisih_pct": 100 * (kr["l15"] - kr["ln"]) / kr["w"] if kr else None, "kering2015_jiwa_sel_krisis": kr["krisis"] if kr else None,
              "kering2015_hari_krisis_maks": kr["hari"] if kr else None, "kering_penduduk_tanpa_sel": tanpa_ker.get(k, 0)}
        for th in (2015, 2019):
            x = kab_tahun.get((k, "karhutla", th)) or vek()
            sc[f"karhutla{th}_dibi_kejadian"] = x[0]
            sc[f"karhutla{th}_dibi_meninggal_hilang"] = mh(x)
        pap = {}
        for h in KRB_BAHAYA:
            s = krb[h][k]
            pap[h] = {"krb_luas_tinggi_ha": s["tinggi_luas"], "krb_luas_sedang_ha": s["sedang_luas"], "krb_luas_rendah_ha": s["rendah_luas"], "krb_terpapar_jiwa": s["terpapar"],
                      "krb_penduduk_wilayah": s["wilayah_penduduk"], "krb_kerugian_potensi_juta_rp": (s.get("fisik_rp") or 0) + (s.get("ekonomi_rp") or 0),
                      "krb_kerugian_tinggi_juta_rp": s.get("tinggi_rp") or 0, "krb_lingkungan_ha": s.get("lingkungan_ha") or 0}
            if h in OVERLAY:
                o = ov[(k, h)]
                pap[h].update({"overlay_jiwa_tinggi": o[0], "overlay_kec_tinggi": o[1], "overlay_kec": o[2]})
        dib = {j: dict(zip(M, kab_total.get((k, j), vek()))) for j in JENIS}
        kab_out[k] = {"nama": v["nama"], "prov": v["prov"], "pulau": v["pulau"], "jawa": v["prov"] in JAWA, "penduduk": jiwa[k], "paparan": pap, "dibi": dib, "skenario": sc}

    tgl_maks = max(t for _, _, t, _, _ in rows if t).isoformat()
    meta = {"dibuat": max(x.split("..")[-1] for x in tgl.values() if x), "tarik": tgl, "skrip": "data/kajian-bnpb/bangun/skenario-hidromet.py",
            "periode_dibi": f"2008-01-01 s.d. {tgl_maks}", "analog": analog, "lanina_musim": sorted(lanina), "dibi_baris": n_baris, "dibi_tak_cocok": tak,
            "dibi_musim_tanpa_tanggal": tanpa_tgl, "dibi_jenis": [{"nama": n, "n_baris": c, "kunci": kk} for n, c, kk in (jenis_dibi or [])],
            "kering": {"tanam_hari": ker["arg"]["tanam"], "hari_kering": ker["arg"]["hari_kering"], "neraca_dibuat": ker["dibuat_neraca"], "kab_tanpa_sel": len(tanpa_ker),
                       "penduduk_tanpa_sel": sum(tanpa_ker.values()), "mesin_dampak_2015": ker["y2015"]["dampak"], "mesin_dampak_normal": ker["normal"]["dampak"]},
            "kolom": {k: {"label": l, "arti": t} for k, (l, t) in KOLOM.items()}, "sumber": SRC}
    tulis(kab_out, K.b, LAMPIRAN.b, kep, R, musim_tot, lanina, analog, oni, tahunan, kota, jiwa, ov, krb, kab_total, sip, kab_tahun, meta)
    periksa(kab_out, K.b, LAMPIRAN.b, kep, R, kota, jiwa, pen, krb, ov, rows, nas_dibi, tak, tak_v, ker, sip, musim_tot, musim_kab, musim_wil, analog, kab_tahun, jenis_dibi)
    turunan_dibi(rows, kota, kab_tahun)
    print(f"skenario-hidromet: {len(kab_out)} kab, {len(K.b)} baris kartu, {len(LAMPIRAN.b)} baris lampiran, {len(kep)} baris kepekaan; {time.time() - t0:.0f} dtk", file=sys.stderr)


# ---------------------------------------------------------------- turunan DIBI per kab per tahun, geologi, kalender (KERANGKA §10)
def per_kab_tahun(rows, kota):
    """{(kode, jenis, tahun): [vektor, n_baris]} dari baris DIBI yang cocok kab."""
    out = {}
    for k, j, tgl, th, v in rows:
        x = out.setdefault((k, j, th), [vek(), 0])
        tambah(x[0], v)
        x[1] += 1
    return out


def tulis_kab_tahun(nama, agr, kota):
    B = [{"kode": k, "nama": kota[k]["nama"], "prov": kota[k]["prov"], "pulau": kota[k]["pulau"], "jenis": j, "tahun": th, "kejadian": v[0],
          "meninggal": v[1], "hilang": v[2], "mengungsi": v[4], "rumah_rusak": v[5] + v[6] + v[7], "n_baris": n}
         for (k, j, th), (v, n) in sorted(agr.items())]
    csv_tulis(nama, ["kode", "nama", "prov", "pulau", "jenis", "tahun", "kejadian", "meninggal", "hilang", "mengungsi", "rumah_rusak", "n_baris"], B)
    return B


def turunan_dibi(rows, kota, kab_tahun):
    """dibi_kab_tahun.csv (hidromet nasional 514 kab), dibi_geologi_kab_tahun.csv (geologi), kalender_bulanan_pulau.csv; label resmi (DIBI),
    kalender = jumlah kejadian per bulan kalender 2008-2025 per pulau dan jenis (pola tercatat, dipengaruhi intensitas pelaporan)."""
    agr = per_kab_tahun(rows, kota)
    for key, (v, _) in agr.items():   # satu sumber dengan kab_tahun agregasi()
        assert all(abs(a - b) <= 1e-9 * max(1, abs(b)) for a, b in zip(v, kab_tahun[key])), key
    tulis_kab_tahun("dibi_kab_tahun.csv", agr, kota)
    grow, gtak, _, gn, _, _ = muat_dibi(kota, "dibi_geologi.json", DIBI_JENIS_GEO)
    assert sum(gtak.values()) <= 0.01 * gn, f"DIBI geologi tak cocok {sum(gtak.values())} dari {gn} baris"
    gagr = per_kab_tahun(grow, kota)
    tulis_kab_tahun("dibi_geologi_kab_tahun.csv", gagr, kota)
    kal = {}
    for k, j, tgl, th, v in rows:
        if tgl and 2008 <= tgl.year <= 2025:
            x = kal.setdefault((kota[k]["pulau"], tgl.month, j), [0.0, 0.0, set()])
            x[0] += v[0]
            x[1] += v[1] + v[2]
            x[2].add(tgl.year)
    B = [{"pulau": p, "bulan": b, "jenis": j, "kejadian": x[0], "meninggal_hilang": x[1], "n_tahun": len(x[2])} for (p, b, j), x in sorted(kal.items())]
    csv_tulis("kalender_bulanan_pulau.csv", ["pulau", "bulan", "jenis", "kejadian", "meninggal_hilang", "n_tahun"], B)
    assert {b["bulan"] for b in B} == set(range(1, 13)) and len({b["pulau"] for b in B}) == len(PULAU), "kalender tidak lengkap 12 bulan x 7 pulau"
    print(f"turunan: {len(agr)} baris kab-jenis-tahun hidromet, {len(gagr)} geologi ({gn} baris DIBI), {len(B)} sel kalender", file=sys.stderr)


# ---------------------------------------------------------------- tulis
def fmt(v):
    if v is None:
        return ""
    if isinstance(v, bool):
        return "true" if v else "false"
    if isinstance(v, float):
        return str(int(round(v))) if abs(v - round(v)) < 1e-9 else f"{v:.4f}".rstrip("0").rstrip(".")
    return str(v)


def csv_tulis(nama, kolom, baris):
    with open(os.path.join(KELUAR, nama), "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(kolom)
        for b in baris:
            w.writerow([fmt(b.get(c)) for c in kolom])


def bulat(o):
    """Bulatkan float untuk JSON (4 desimal; bilangan bulat jadi int)."""
    if isinstance(o, float):
        return int(round(o)) if abs(o - round(o)) < 1e-9 else round(o, 4)
    if isinstance(o, dict):
        return {k: bulat(v) for k, v in o.items()}
    if isinstance(o, (list, tuple)):
        return [bulat(v) for v in o]
    return o


def json_tulis(nama, isi):
    with open(os.path.join(KELUAR, nama), "w", encoding="utf-8") as f:
        json.dump(bulat(isi), f, ensure_ascii=False, separators=(",", ":"))


def tulis(kab_out, kartu, lampiran, kep, R, musim_tot, lanina, analog, oni, tahunan, kota, jiwa, ov, krb, kab_total, sip, kab_tahun, meta):
    os.makedirs(KELUAR, exist_ok=True)
    idk = ("kode", "nama", "prov", "pulau", "jawa")
    # paparan per kab x bahaya
    B = []
    for k, v in kab_out.items():
        for h, p in v["paparan"].items():
            B.append({"kode": k, **{c: v[c] for c in idk[1:]}, "bahaya": h, "penduduk_worldpop": v["penduduk"], **p})
    kp = ["overlay_jiwa_tinggi", "overlay_kec_tinggi", "overlay_kec", "krb_luas_tinggi_ha", "krb_luas_sedang_ha", "krb_luas_rendah_ha", "krb_terpapar_jiwa",
          "krb_penduduk_wilayah", "krb_kerugian_potensi_juta_rp", "krb_kerugian_tinggi_juta_rp", "krb_lingkungan_ha"]
    csv_tulis("paparan_kab.csv", list(idk) + ["bahaya", "penduduk_worldpop"] + kp, B)
    # DIBI per kab x jenis
    B = []
    for k, v in kab_out.items():
        for j in JENIS:
            B.append({"kode": k, **{c: v[c] for c in idk[1:]}, "jenis": j, **v["dibi"][j]})
    csv_tulis("dibi_kab.csv", list(idk) + ["jenis"] + list(M), B)
    # skenario per kab (lebar)
    ks = list(next(iter(kab_out.values()))["skenario"])
    csv_tulis("skenario_kab.csv", list(idk) + ["penduduk"] + ks, [{"kode": k, **{c: v[c] for c in idk[1:]}, "penduduk": v["penduduk"], **v["skenario"]} for k, v in kab_out.items()])
    # rasio korban
    B = []
    for w in R:
        for j in JENIS:
            r = R[w][j]
            pin = r.get("pinjam_nasional", False)
            for s in r["seri"]:
                B.append({"wilayah": w, "jenis": j, "tahun": s["tahun"], "kejadian": s["v"][0], "meninggal_hilang": mh(s["v"]), "menderita": s["v"][3],
                          "rasio_per_kejadian": s["kej"], "rasio_per_100rb_terdampak": s["ter"], "dipakai": s["dipakai"], "pinjam_nasional": pin})
            for st in ("median", "p90"):
                B.append({"wilayah": w, "jenis": j, "tahun": st, "rasio_per_kejadian": r["kej_" + st], "rasio_per_100rb_terdampak": r["ter_" + st],
                          "n_tahun": r["n"], "dipakai": True, "pinjam_nasional": pin})
            if r["semua_tahun"]["n"] != r["n"]:   # pembanding: dengan tahun tak lengkap (2024)
                for st in ("median", "p90"):
                    B.append({"wilayah": w, "jenis": j, "tahun": st + "_dengan_2024", "rasio_per_kejadian": r["semua_tahun"]["kej_" + st],
                              "rasio_per_100rb_terdampak": r["semua_tahun"]["ter_" + st], "n_tahun": r["semua_tahun"]["n"], "dipakai": False, "pinjam_nasional": pin})
    csv_tulis("rasio_korban.csv", ["wilayah", "jenis", "tahun", "kejadian", "meninggal_hilang", "menderita", "rasio_per_kejadian", "rasio_per_100rb_terdampak", "n_tahun",
                                   "dipakai", "pinjam_nasional"], B)
    # musim hujan
    B = []
    for (w, y), v in sorted(musim_tot.items()):
        B.append({"wilayah": w, "musim": f"{y}/{y + 1}", "tahun_awal": y, "oni_ndj": oni[("NDJ", y)], "la_nina": y in lanina, "kejadian": v[0], "meninggal": v[1], "hilang": v[2],
                  "menderita": v[3], "mengungsi": v[4], "rumah_rb": v[5], "rumah_rs": v[6], "rumah_rr": v[7],
                  "analog_lanina": analog[w]["lanina"] == y, "terberat_tercatat": analog[w]["terberat"] == y})
    csv_tulis("musim_hujan.csv", ["wilayah", "musim", "tahun_awal", "oni_ndj", "la_nina", "kejadian", "meninggal", "hilang", "menderita", "mengungsi", "rumah_rb", "rumah_rs", "rumah_rr",
                                  "analog_lanina", "terberat_tercatat"], B)
    # kartu dan kepekaan
    kk = ["skenario", "wilayah", "metrik", "nilai", "rendah", "tinggi", "satuan", "label", "sumber", "catatan"]
    csv_tulis("kartu_skenario.csv", kk, kartu)
    csv_tulis("lampiran_kekeringan_model.csv", kk, lampiran)
    json_tulis("kartu_skenario.json", {"meta": {k: meta[k] for k in ("dibuat", "tarik", "skrip", "periode_dibi", "analog", "lanina_musim")}, "baris": kartu,
                                       "lampiran": lampiran})
    kpk = ["skenario", "wilayah", "cakupan_awal", "c0", "cakupan_target", "c1", "utama", "lintasan", "R", "faktor", "korban_rendah_dasar", "korban_tinggi_dasar", "korban_rendah", "korban_tinggi", "label", "sumber", "catatan"]
    csv_tulis("kepekaan_peringatan_dini.csv", kpk, kep)
    # karhutla per provinsi
    B = []
    nama_khusus = {"91": "Papua (luas: batas sebelum pemekaran 2022)", "92": "Papua Barat (luas: batas sebelum pemekaran 2022)"}
    catatan = {"91": "luas SiPongi dan Bank Dunia 2015/2019 = Papua sebelum pemekaran 2022 (termasuk Merauke, kini 93 Papua Selatan); kolom DIBI dan ISPA memakai batas 2025",
               "92": "luas SiPongi 2015/2019 = Papua Barat sebelum pemekaran 2022 (termasuk Papua Barat Daya, kini 96); kolom DIBI memakai batas 2025",
               "32": "DIBI Sumedang 12 Sep 2019: 62.665 menderita karhutla (pencilan, tidak ada di kolom ini tetapi ikut di dibi_kab.csv dan ringkas_wilayah.csv)"}
    for p in sorted(PROVINSI):
        row = {"prov": p, "nama": nama_khusus.get(p, PROVINSI[p]), "prov_asap": p in PROV_ASAP, "luas_2015_sipongi_ha": sip.get((p, "2015"), 0), "luas_2019_sipongi_ha": sip.get((p, "2019"), 0),
               "luas_2015_bank_dunia_ha": WB2015_PROV_RIBU_HA.get(p, 0) * 1000 if p in WB2015_PROV_RIBU_HA else None,
               "ispa_2015": ISPA2015.get(p), "ispa_2019": ISPA2019.get(p)}
        for th in (2015, 2019):
            v = vek()
            for k in kota:
                if kota[k]["prov"] == p:
                    tambah(v, kab_tahun.get((k, "karhutla", th)) or vek())
            row[f"dibi_kejadian_{th}"], row[f"dibi_meninggal_hilang_{th}"] = v[0], mh(v)
        row["catatan"] = catatan.get(p, "kematian DIBI = kebakaran setempat, bukan korban asap" if p in JAWA and (row["dibi_meninggal_hilang_2015"] or row["dibi_meninggal_hilang_2019"]) else "")
        B.append(row)
    B.append({"prov": "lainnya", "nama": "provinsi lain (tabel Bank Dunia 2015)", "luas_2015_bank_dunia_ha": WB2015_PROV_RIBU_HA["lainnya"] * 1000})
    csv_tulis("karhutla_provinsi.csv", ["prov", "nama", "prov_asap", "luas_2015_sipongi_ha", "luas_2015_bank_dunia_ha", "luas_2019_sipongi_ha", "ispa_2015", "ispa_2019",
                                        "dibi_kejadian_2015", "dibi_meninggal_hilang_2015", "dibi_kejadian_2019", "dibi_meninggal_hilang_2019", "catatan"], B)
    # ringkas wilayah (nasional, pulau, provinsi)
    grup = [("nasional", "ID", "Indonesia", set(kota))] + [("pulau", n, n, {k for k in kota if kota[k]["pulau"] == n}) for n in PULAU] + \
           [("provinsi", p, PROVINSI[p], {k for k in kota if kota[k]["prov"] == p}) for p in sorted(PROVINSI)]
    B = []
    for tk, kd, nm, ks_ in grup:
        for h in JENIS:
            row = {"tingkat": tk, "kode": kd, "nama": nm, "bahaya": h, "jumlah_kab": len(ks_), "penduduk_worldpop": sum(jiwa[k] for k in ks_)}
            if h in OVERLAY:
                row["overlay_jiwa_tinggi"] = sum(ov[(k, h)][0] for k in ks_)
            if h in krb:
                row["krb_luas_tinggi_ha"] = sum(krb[h][k]["tinggi_luas"] for k in ks_)
                row["krb_luas_sedang_ha"] = sum(krb[h][k]["sedang_luas"] for k in ks_)
                row["krb_terpapar_jiwa"] = sum(krb[h][k]["terpapar"] for k in ks_)
            v = vek()
            for k in ks_:
                tambah(v, kab_total.get((k, h), vek()))
            row.update({"dibi_kejadian": v[0], "dibi_meninggal_hilang": mh(v), "dibi_menderita": v[3], "dibi_mengungsi": v[4], "dibi_rumah_rusak": v[5] + v[6] + v[7]})
            B.append(row)
    csv_tulis("ringkas_wilayah.csv", ["tingkat", "kode", "nama", "bahaya", "jumlah_kab", "penduduk_worldpop", "overlay_jiwa_tinggi", "krb_luas_tinggi_ha", "krb_luas_sedang_ha",
                                      "krb_terpapar_jiwa", "dibi_kejadian", "dibi_meninggal_hilang", "dibi_menderita", "dibi_mengungsi", "dibi_rumah_rusak"], B)
    # JSON peta per kab
    json_tulis("kab.json", {"meta": meta, "kab": kab_out})


# ---------------------------------------------------------------- self-check keluaran (gagal = berhenti)
def periksa(kab_out, kartu, lampiran, kep, R, kota, jiwa, pen, krb, ov, rows, nas_dibi, tak, tak_v, ker, sip, musim_tot, musim_kab, musim_wil, analog, kab_tahun, jenis_dibi):
    # wilayah
    assert len(kab_out) == 514, f"jumlah kab {len(kab_out)} != 514"
    assert sum(v["jawa"] for v in kab_out.values()) == 119, "jumlah kab Jawa != 119"
    assert sum(jiwa.values()) == sum(pen.values()), (sum(jiwa.values()), sum(pen.values()))
    # paparan overlay: tak melebihi penduduk kab, tiap kecamatan dihitung sekali per bahaya
    for (k, h), o in ov.items():
        assert 0 <= o[0] <= jiwa[k], f"overlay {k} {h}: {o[0]} > penduduk {jiwa[k]}"
    for h in OVERLAY:
        assert sum(ov[(k, h)][2] for k in kota) == len(pen), f"overlay {h}: kecamatan terhitung {sum(ov[(k, h)][2] for k in kota)} != {len(pen)}"
    # KRB: 514 kab tiap bahaya; jumlah kab dekat angka nasional API (selisih = wilayah di luar 514 kab)
    nas = {"banjir": "ks_banjir.json", "banjir_bandang": "ks_banjir-bandang.json", "longsor": "ks_tanah-longsor.json", "cuaca_ekstrem": "ks_cuaca-ekstrim.json",
           "gelombang_abrasi": "ks_gelombang-ekstrim-dan-abrasi.json", "kekeringan": "ks_kekeringan.json"}
    for h, f in nas.items():
        assert len(krb[h]) == 514 and set(krb[h]) == set(kota), f"KRB {h}: {len(krb[h])} kab"
        N = json.load(open(os.path.join(MENTAH, f)))["summary"]
        for fld in ("tinggi_luas", "terpapar"):
            r = sum(krb[h][k][fld] for k in kota) / N[fld]
            assert 0.97 <= r <= 1.0001, f"KRB {h} {fld}: jumlah kab / nasional = {r:.4f}"
    # DIBI: <= 0,5% baris tak cocok; tiap jenis x 8 metrik: total mentah = jumlah 514 kab + baris tak cocok (tanpa syarat)
    n_tak = sum(tak.values())
    assert n_tak <= 0.005 * (len(rows) + n_tak), f"DIBI tak cocok {n_tak} baris"
    for j in JENIS:
        for i, m in enumerate(M):
            mentah = sum(v[i] for (jj, _), v in nas_dibi.items() if jj == j)
            kab = sum(v["dibi"][j][m] for v in kab_out.values())
            assert abs(mentah - kab - tak_v[j][i]) <= 1e-9 * max(1, mentah), f"DIBI {j} {m}: mentah {mentah} != kab {kab} + tak cocok {tak_v[j][i]}"
    # daftar jenis DIBI di cache: tiap jenis yang dipakai ada di DIBI_JENIS, tak ada jenis hidromet bernama lain yang terlewat
    if jenis_dibi:
        nama = {str(n).strip() for n, _, _ in jenis_dibi}
        hidro = ("banjir", "longsor", "tanah", "cuaca", "angin", "puting", "kering", "gelombang", "abrasi", "rob", "kebakaran hutan", "kebakaran lahan")
        lepas = [n for n in nama if n not in DIBI_JENIS and any(h in n.lower() for h in hidro) and n != "Banjir Lahar (Lahar)"]
        assert not lepas, f"jenis DIBI mirip hidromet tapi tidak dipetakan: {lepas}"
    # tiap kolom per kab punya label di KOLOM
    v0 = next(iter(kab_out.values()))
    kurang = [c for c in list(v0["skenario"]) + list(v0["paparan"]["banjir"]) if c not in KOLOM]
    assert not kurang, f"kolom tanpa label di KOLOM: {kurang}"
    # rasio dan kartu
    for w in R:
        for j, r in R[w].items():
            if r["n"]:
                assert 0 <= r["kej_median"] <= r["kej_p90"], (w, j, r["kej_median"], r["kej_p90"])
                rk = sorted(s["kej"] for s in r["seri"] if s["dipakai"])
                if r["n"] >= 2:   # klaim README: tahun terburuk tercatat selalu disisihkan
                    assert r["kej_p90"] <= rk[-2] + 1e-12, f"rasio {w} {j}: p90 {r['kej_p90']} melebihi nilai terbesar kedua {rk[-2]} (n={r['n']})"
                assert all(s["tahun"] not in TAHUN_TAK_LENGKAP or j not in TAHUN_TAK_LENGKAP[s["tahun"]] or not s["dipakai"] for s in r["seri"]), (w, j)
    for b in kartu + lampiran:
        assert b["label"] and b["sumber"], b
        for c in ("nilai", "rendah", "tinggi"):
            x = b[c]
            assert x is None or (isinstance(x, (int, float)) and math.isfinite(x) and x >= 0 or b["metrik"].startswith("laju_garis_pantai")), (b["metrik"], c, x)
        if b["rendah"] is not None and b["tinggi"] is not None:
            assert b["rendah"] <= b["tinggi"] + 1e-9, (b["skenario"], b["wilayah"], b["metrik"], b["rendah"], b["tinggi"])
    # analog per kab dijumlah = total wilayah musim analog, nasional dan Jawa: 8 metrik DIBI, kolom turunan, dan korban (Jawa)
    yA = analog["nasional"]["lanina"]
    assert analog["jawa"]["lanina"] == yA, f"analog La Nina Jawa {analog['jawa']['lanina']} != nasional {yA}: kolom analog_mh_* kab tidak lagi setara kartu Jawa"
    par = muat_param()
    for w, kk in (("nasional", list(kab_out)), ("jawa", [k for k, v in kab_out.items() if v["jawa"]])):
        tot = musim_tot[(w, yA)]
        for i, m in enumerate(M):
            sk = sum(musim_kab.get((k, yA, j), vek())[i] for k in kk for j in JENIS_MH)
            assert abs(sk - tot[i]) <= 1e-9 * max(1, tot[i]), f"musim {yA} {w} {m}: jumlah kab {sk} != wilayah {tot[i]}"
        harap = {"analog_mh_kejadian": tot[0], "analog_mh_meninggal_hilang": mh(tot), "analog_mh_menderita": tot[3], "analog_mh_mengungsi": tot[4],
                 "analog_mh_materiil_rendah_rp": materiil(tot, par)[0], "analog_mh_materiil_tinggi_rp": materiil(tot, par)[1]}
        for c, x in harap.items():
            sk = sum(kab_out[k]["skenario"][c] for k in kk)
            assert abs(sk - x) <= 1e-9 * max(1, x), f"{c} {w}: jumlah kab {sk} != wilayah {x}"
    kor = {(b["wilayah"]): (b["rendah"], b["tinggi"]) for b in kartu if b["skenario"] == "musim_hujan_lanina" and b["metrik"] == "korban_jiwa"}
    vjJ = {j: musim_wil.get(("jawa", yA, j), vek()) for j in JENIS_MH}
    kJ = [k for k, v in kab_out.items() if v["jawa"]]
    for i, c in enumerate(("analog_mh_korban_rendah", "analog_mh_korban_tinggi")):
        sJ = sum(kab_out[k]["skenario"][c] for k in kJ)
        assert abs(sJ - kor["jawa"][i]) <= 1e-6 * max(1, kor["jawa"][i]), f"{c}: jumlah 119 kab Jawa {sJ} != kartu Jawa {kor['jawa'][i]}"
        sN = sum(v["skenario"][c] for v in kab_out.values())   # nasional kartu = rasio nasional untuk semua kab; kab Jawa memakai rasio Jawa
        harapN = kor["nasional"][i] - korban(vjJ, R["nasional"])[i] + kor["jawa"][i]
        assert abs(sN - harapN) <= 1e-6 * max(1, harapN), f"{c}: jumlah 514 kab {sN} != kartu nasional - Jawa(rasio nasional) + kartu Jawa {harapN}"
    # karhutla: tak ada korban berbasis rasio (tidak bermakna untuk asap); DIBI prov asap + prov lain = semua; jiwa sel krisis tidak di kartu
    assert not [b for b in kartu if b["skenario"].startswith("karhutla") and b["metrik"].startswith("korban_jiwa")], "korban rasio karhutla muncul lagi"
    assert not [b for b in kep if b["skenario"].startswith("karhutla")], "kepekaan karhutla muncul lagi"
    assert not [b for b in kartu + lampiran if "jiwa_sel_krisis" in b["metrik"] or "jiwa_puncak" in b["metrik"]], "jiwa krisis air porsi rentan 1 masuk kartu"
    assert not [b for b in kartu if b["metrik"].startswith(("padi_", "sawah_model_"))], "angka padi/puso model harus di lampiran, bukan kartu utama"
    kh = {(b["skenario"], b["wilayah"], b["metrik"]): b["nilai"] for b in kartu if b["skenario"].startswith("karhutla")}
    for sk_ in ("karhutla_2015", "karhutla_2019"):
        for w in ("nasional", "jawa"):
            a, l_, t = (kh[(sk_, w, "dibi_meninggal_hilang" + x)] for x in ("_prov_asap", "_prov_lain", ""))
            assert abs(a + l_ - t) < 1e-9, f"{sk_} {w}: asap {a} + lain {l_} != semua {t}"
        assert kh[(sk_, "jawa", "dibi_meninggal_hilang_prov_asap")] == 0, "Jawa tidak punya provinsi asap"
    sumedang = [k for k, v in kab_out.items() if v["nama"] == "Kab. Sumedang"]
    assert len(sumedang) == 1 and (kab_tahun.get((sumedang[0], "karhutla", 2019)) or vek())[3] >= 60000, "catatan pencilan Sumedang 2019 tidak lagi sesuai data"
    # kepekaan: tiap baris korban_jiwa punya tepat satu pasangan utama (Renas 1.c -> Renas 1.c)
    assert abs(faktor_ews(0.06, 0.06) - 1) < 1e-12
    for b in kep:
        assert 0 < b["faktor"] <= 1 and b["korban_tinggi"] <= b["korban_tinggi_dasar"] + 1e-9, b
    n_kj = sum(1 for b in kartu if b["metrik"] == "korban_jiwa")
    assert sum(b["utama"] for b in kep) == n_kj > 0, f"pasangan utama kepekaan {sum(b['utama'] for b in kep)} != baris korban_jiwa {n_kj}"
    for lin in ("renas", "renstra"):   # dua lintasan berdampingan, satu per baris korban_jiwa (KERANGKA P06)
        assert sum(b["lintasan"] == lin for b in kep) == n_kj, f"lintasan {lin}: {sum(b['lintasan'] == lin for b in kep)} != {n_kj}"
    fr = {b["lintasan"]: b["faktor"] for b in kep if b["lintasan"]}
    assert fr["renstra"] > fr["renas"], f"faktor Renstra {fr['renstra']} harus lebih dekat 1 daripada Renas {fr['renas']}"
    cek_lantai(kartu, musim_tot)
    # mesin kekeringan: agregasi Python = dampak() simulasi.js
    for run in ("y2015", "normal"):
        hil = sum(s * l for s, l in zip(ker["sawah"], ker[run]["loss"]))
        pus = sum(s for s, l in zip(ker["sawah"], ker[run]["loss"]) if l >= 0.5)
        d = ker[run]["dampak"]
        assert abs(hil - d["hilang"]) <= 1e-6 * max(1, d["hilang"]) and abs(pus - d["puso"]) < 1e-6, (run, hil, d["hilang"], pus, d["puso"])
    for v in kab_out.values():
        x = v["skenario"]["kering2015_padi_turun_pct"]
        assert x is None or 0 <= x <= 100
    # karhutla: luas SiPongi cocok angka resmi lain, data salinan tangan cocok totalnya
    l19 = json.load(open(os.path.join(AKAR, "public/data/luas_resmi.json")))
    s19 = sum(sip.get((p, "2019"), 0) for p in PROVINSI)
    assert abs(s19 - sum(v[1] for v in l19["ha"].values())) < 1, f"SiPongi 2019 {s19} != luas_resmi.json"
    s15 = sum(sip.get((p, "2015"), 0) for p in PROVINSI)
    assert abs(s15 - WB2015_TOTAL_RIBU_HA * 1000) / (WB2015_TOTAL_RIBU_HA * 1000) < 0.001, f"SiPongi 2015 {s15} vs Bank Dunia 2.611 rb ha"
    assert sum(WB2015_PROV_RIBU_HA.values()) == WB2015_TOTAL_RIBU_HA
    assert sum(ISPA2015.values()) == ISPA2015_TOTAL and sum(ISPA2019.values()) == ISPA2019_TOTAL
    assert abs(WB["2019"]["usd_kerusakan"] + WB["2019"]["usd_kerugian"] - WB["2019"]["usd"]) <= 0.05e9
    # tak ada NaN/inf di keluaran
    def cek(o, jalur="kab"):
        if isinstance(o, float):
            assert math.isfinite(o), jalur
        elif isinstance(o, dict):
            for k, v in o.items():
                cek(v, f"{jalur}.{k}")
        elif isinstance(o, (list, tuple)):
            for i, v in enumerate(o):
                cek(v, f"{jalur}[{i}]")
    cek(kab_out); cek(kartu, "kartu"); cek(lampiran, "lampiran"); cek(kep, "kepekaan")
    for f in os.listdir(KELUAR):
        if f.endswith(".csv"):
            teks = open(os.path.join(KELUAR, f), encoding="utf-8").read().lower()
            assert ",nan" not in teks and ",inf" not in teks, f"NaN/inf di {f}"
    print("periksa: semua invarian lolos", file=sys.stderr)


def uji():
    assert p90(list(range(1, 11))) == 9 and p90([5]) == 5 and p90([3, 1, 2]) == 2 and p90([1, 2]) == 1
    assert p90(list(range(1, 21))) == 18 and p90(list(range(1, 7))) == 5   # n=20 -> peringkat 18; n=6 -> terbesar kedua, bukan maks
    for n in range(2, 40):
        assert p90(list(range(n))) < n - 1, n                                 # maks tidak pernah terpilih bila n >= 2
    assert abs(faktor_ews(0.06, 0.06) - 1) < 1e-12 and abs(faktor_ews(0, 1, 8) - 0.125) < 1e-12 and faktor_ews(0.06, 0.52) < 1
    seri = {(s, 2000): -0.6 for s in ("DJF", "JFM", "FMA", "MAM", "AMJ")} | {(s, 2000): 0.0 for s in ("MJJ", "JJA", "JAS", "ASO")} | \
           {(s, 2000): -0.7 for s in ("SON", "OND", "NDJ")} | {(s, 2001): -0.9 for s in ("DJF",)}
    e = episode_lanina(seri)
    assert ("AMJ", 2000) in e and ("NDJ", 2000) not in e and len(e) == 5, e   # 5 berturut = episode; 4 berturut (SON-DJF) bukan
    assert musim_dari(dt.date(2020, 10, 1)) == 2020 and musim_dari(dt.date(2021, 4, 30)) == 2020 and musim_dari(dt.date(2021, 5, 1)) is None
    par = {"stimulan_rumah_rb": [60e6, 50e6], "stimulan_rumah_rs": [30e6, 25e6], "stimulan_rumah_rr": [15e6, 10e6]}
    assert materiil([0, 0, 0, 0, 0, 1, 1, 1], par) == (85e6, 105e6)
    nilai = {1: [10, 1, 0, 5, 5, 1, 0, 0], 2: [20, 2, 1, 50, 50, 5, 5, 5], 3: [5, 0, 0, 1, 1, 0, 0, 0]}
    assert peringkat_gabung([1, 2, 3], nilai) == 2
    Rs = {"a": {"n": 3, "kej_median": 0.1, "kej_p90": 0.5}, "b": {"n": 0, "kej_median": None, "kej_p90": None}}
    assert korban({"a": [10] + [0] * 7, "b": [99] + [0] * 7}, Rs) == (1.0, 5.0)
    tah = {("w", j, th): [10, 9 if th == 2024 else 1] + [0] * 6 for j in ("longsor", "banjir") for th in range(2015, 2025)}
    rl, rb = rasio(tah, "w", "longsor"), rasio(tah, "w", "banjir")
    assert rl["n"] == 9 and rl["semua_tahun"]["n"] == 10 and rl["kej_p90"] == 0.1 and rl["semua_tahun"]["kej_p90"] == 0.1   # 2024 dibuang untuk longsor
    assert rb["n"] == 10 and rb["kej_median"] == 0.1                                                                       # banjir 2024 tetap dipakai
    assert angka_id("1.234,56") == 1234.56 and angka_id(0) == 0.0 and idn(1234567.891, 2) == "1.234.567,89" and idn(5) == "5"
    assert fmt(1.0) == "1" and fmt(0.5) == "0.5" and fmt(None) == "" and fmt(True) == "true" and fmt(2 / 3) == "0.6667"
    assert kunci_nama("Kota Adm. Jakarta Selatan") == kunci_nama("Kota Administrasi Jakarta Selatan")
    # gerbang lantai: kartu lantai = tercatat terbesar; model di bawah lantai tanpa penanda pembanding ditolak
    mt = {("w", 2008): [1, 10, 5, 0, 0, 0, 0, 0], ("w", 2015): [1, 3, 0, 0, 0, 0, 0, 0]}
    assert lantai_musim(mt, "w") == (2008, 15)
    baris = lambda sk, t, cat="": {"skenario": sk, "wilayah": "w", "metrik": "korban_jiwa", "rendah": t, "tinggi": t, "catatan": cat}
    cek_lantai([baris("musim_hujan_lantai", 15), baris("musim_hujan_lanina", 20)], mt)
    for salah in ([baris("musim_hujan_lantai", 14)], [baris("musim_hujan_lantai", 15), baris("musim_hujan_lanina", 9)]):
        try:
            cek_lantai(salah, mt)
        except AssertionError:
            continue
        raise SystemExit(f"cek_lantai meloloskan kartu di bawah lantai: {salah}")
    k2 = [baris("musim_hujan_lantai", 15), baris("musim_hujan_lanina", 9)]
    tandai_pembanding(k2, {"w": 15})
    cek_lantai(k2, mt)
    print("uji skenario-hidromet: ok")


if __name__ == "__main__":
    a = sys.argv[1:]
    if a == ["uji"]:
        uji()
    elif a == ["tarik-saja"]:
        tarik()
    else:
        uji()
        bangun(ulang=a == ["--tarik"])
