"""Rencana pencegahan per kecamatan langganan api -> public/data/preventif.json

Dua tahap, supaya aman dijalankan tiap hari di CI (yang tidak punya arsip MODIS 144 MB):
  profil  (berat, lokal): arsip data/raw/firms/modis.csv + lapisan statis -> ciri api tiap kecamatan
          (bulan, gambut, konsesi, kawasan, kanal, desa, penduduk, titik berulang di petak yang sama)
  rencana (ringan, harian): jarak ke Daops/posko (posko.json berubah tiap hari) + aturan -> tindakan, biaya
Tanpa modis.csv, profil diambil dari preventif.json yang sudah di-commit. Tanpa keduanya: keluar 0, tidak menulis apa-apa.

Pilihan kecamatan (sama dengan skorRiwayat di index.html, dihitung atas semua kecamatan se-Indonesia):
  150 skor tertinggi di 9 provinsi prioritas + 25 teratas tiap provinsi prioritas + semua di 9 provinsi itu yang terbakar >= 15 dari 25 tahun.

Pakai:  python3 scripts/data/preventif.py          (profil kalau arsip ada, lalu rencana)
        python3 scripts/data/preventif.py ringan   (paksa pakai profil lama; dipakai CI)
        python3 scripts/data/preventif.py uji      (uji invarian aturan tanpa data; < 1 detik)
Aturan, ambang dan sumber biaya: lihat ATURAN di bawah dan PREVENTIF.md.
"""
import csv, datetime as dt, json, math, os, sys

sys.path.insert(0, os.path.dirname(__file__))
from wilayah import AKAR, PRIORITAS, PROVINSI, Poligon, Wilayah, _cincin

DATA = os.path.join(AKAR, "public/data")
KELUAR = os.path.join(DATA, "preventif.json")
MODIS = os.path.join(AKAR, "data/raw/firms/modis.csv")
AMBANG, TOP, PER_PROV, MIN_TAHUN = 10, 150, 25, 15
KELOK, LAJU = 1.4, 40  # sama dengan jamDarat() di index.html: jarak lurus x 1,4 / 40 km/jam
BULAN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"]
WIB = dt.timedelta(hours=7)


def km(a1, o1, a2, o2):
    r = math.pi / 180
    h = math.sin((a2 - a1) * r / 2) ** 2 + math.cos(a1 * r) * math.cos(a2 * r) * math.sin((o2 - o1) * r / 2) ** 2
    return 12742 * math.asin(math.sqrt(h))


# ---------------------------------------------------------------- pilihan kecamatan
def skor(D):
    """Skor riwayat persis seperti skorRiwayat() di index.html (jenis kec)."""
    th, kec = D["tahun"], D["kec"]
    iB = th.index("2023")
    maks = max(sum(v) for v in kec.values())
    out = {}
    for k, v in kec.items():
        tot = sum(v)
        rasio = (sum(v[iB:]) / (len(th) - iB) + 1) / (sum(v[:iB]) / iB + 1)
        tahun = sum(1 for x in v if x >= AMBANG)
        fT = min(1, max(0, (math.log2(rasio) + 1) / 2))
        out[k] = {"skor": round(100 * (.5 * tahun / len(th) + .3 * math.log1p(tot) / math.log1p(maks) + .2 * fT)), "tahun": tahun, "total": tot, "v": v}
    return out


def pilih(sk):
    prio = sorted((k for k in sk if k.split("|")[0] in PRIORITAS), key=lambda k: (-sk[k]["skor"], -sk[k]["total"]))
    pil = set(prio[:TOP])
    for p in PRIORITAS:
        pil |= set([k for k in prio if k.startswith(p + "|")][:PER_PROV])
    pil |= {k for k in prio if sk[k]["tahun"] >= MIN_TAHUN}
    return pil


# ---------------------------------------------------------------- tahap profil (butuh arsip MODIS)
def luas_km2(geom):
    """Luas cincin luar (km2), proyeksi ekuirektangular lokal; cukup untuk kepadatan kanal."""
    tot = 0
    for r in _cincin(geom):
        la = sum(c[1] for c in r) / len(r)
        kx, ky = 111.32 * math.cos(math.radians(la)), 110.57
        tot += abs(sum(r[i][0] * kx * r[i + 1][1] * ky - r[i + 1][0] * kx * r[i][1] * ky for i in range(len(r) - 1))) / 2
    return tot


def profil(pil):
    from sejarah import bukan_vegetasi, vegetasi
    w = Wilayah()
    # indeks hanya poligon kecamatan terpilih: titik di luar semuanya -> None (titik-dalam-poligon tetap persis)
    w.indeks = {s: [e for e in daf if "|".join(x or "" for x in e[2]) in pil] for s, daf in w.indeks.items()}
    gam, kon, kaw = (Poligon(os.path.join(DATA, "lahan", f)) for f in ("gambut.geojson", "konsesi.geojson", "kawasan.geojson"))
    lengkap = os.path.join(AKAR, "data/raw/konsesi/konsesi_lengkap.geojson")  # bernama (lokal, tidak diterbitkan): n_pemegang tepat
    if os.path.exists(lengkap):
        kon = Poligon(lengkap)
    P = {k: {"n": 0, "bulan": [0] * 12, "th": {}, "gambut": 0, "konsesi": {}, "pemegang": {}, "kawasan": {}, "sel": {}, "lat": 0., "lon": 0.} for k in pil}
    nonveg = bukan_vegetasi(MODIS)
    for r in csv.DictReader(open(MODIS)):
        c = r.get("confidence", "")
        if not c.isdigit() or int(c) < 30 or not vegetasi(r, nonveg):
            continue
        jam = r["acq_time"].zfill(4)
        t = dt.datetime.fromisoformat(f"{r['acq_date']}T{jam[:2]}:{jam[2:]}") + WIB
        if t.year < 2002:
            continue
        lon, lat = float(r["longitude"]), float(r["latitude"])
        adm = w.cari(lon, lat)
        if not adm:
            continue
        p = P["|".join(adm)]
        p["n"] += 1; p["bulan"][t.month - 1] += 1; p["lat"] += lat; p["lon"] += lon
        p["th"][t.year] = p["th"].get(t.year, 0) + 1
        if gam.cari(lon, lat):
            p["gambut"] += 1
        k = kon.cari(lon, lat)
        if k:
            p["konsesi"][k["jenis"]] = p["konsesi"].get(k["jenis"], 0) + 1
            nm = k.get("pemegang") or k.get("nama") or k.get("id") or id(k)  # hanya untuk HITUNG pemegang; nama tidak diterbitkan
            p["pemegang"][nm] = p["pemegang"].get(nm, 0) + 1
        a = kaw.cari(lon, lat)
        if a:
            p["kawasan"][a["fungsi"]] = p["kawasan"].get(a["fungsi"], 0) + 1
        # petak 0,0025 derajat (~280 m): tahun-tahun yang pernah ada titik di petak itu
        p["sel"].setdefault((round(lat / .0025), round(lon / .0025)), []).append(t.year)
    # luas kecamatan
    luas = {}
    for kode in {k.split("|")[0] for k in pil}:
        for f in json.load(open(os.path.join(AKAR, "public/geo/kecamatan", f"{kode}.json")))["features"]:
            k = f"{kode}|{f['properties']['kab']}|{f['properties']['kec']}"
            if k in pil:
                luas[k] = luas.get(k, 0) + luas_km2(f["geometry"])
    # kanal (sel 0,02 derajat, km) dan desa: pusat sel / titik desa ke kecamatan
    kanal = {}
    for la, lo, panjang in json.load(open(os.path.join(DATA, "kanal.json")))["grid"]:
        adm = w.cari(lo, la)
        if adm:
            kanal["|".join(adm)] = kanal.get("|".join(adm), 0) + panjang
    desa = {}
    for pv, daf in json.load(open(os.path.join(DATA, "osm/desa.json"))).items():
        for la, lo, *_ in daf:
            adm = w.cari(lo, la)
            if adm:
                desa.setdefault("|".join(adm), []).append((la, lo))
    pend = json.load(open(os.path.join(DATA, "penduduk.json"))).get("kec", {})
    # petak dalam radius 1 km (offset petak 280 m)
    R = [(i, j) for i in range(-4, 5) for j in range(-4, 5) if math.hypot(i, j) * .0025 * 111.2 <= 1.0]
    out = {}
    for k, p in P.items():
        n = p["n"]
        if n < 30:
            continue
        sel = {s: min(v) for s, v in p["sel"].items()}
        # titik berulang: ada titik tahun SEBELUMNYA dalam 1 km. Penyebut = titik setelah tahun pertama arsip.
        ulang = basis = 0
        for (i, j), ths in p["sel"].items():
            for y in ths:
                if y == 2002:
                    continue
                basis += 1
                if any(sel.get((i + a, j + b), 9999) < y for a, b in R):
                    ulang += 1
        # petak ~1 km yang terbakar >= 3 tahun berbeda: "petak langganan" (sasaran sumur bor, pemetaan pemilik)
        km1 = {}
        for (i, j), ths in p["sel"].items():
            km1.setdefault((i // 4, j // 4), set()).update(ths)
        petak = [(a * 4 * .0025 + .005, b * 4 * .0025 + .005) for (a, b), s in km1.items() if len(s) >= 3]
        dsa = desa.get(k)
        sasaran = None if dsa is None else sum(1 for la, lo in dsa if any(km(la, lo, x, y) <= 3 for x, y in petak))
        out[k] = {
            "n": n, "bulan": p["bulan"], "pusat": [round(p["lat"] / n, 4), round(p["lon"] / n, 4)],
            "gambut": round(p["gambut"] / n, 3),
            "konsesi": {j: round(v / n, 3) for j, v in p["konsesi"].items()},
            "n_pemegang": len(p["pemegang"]),
            "kawasan": {j: round(v / n, 3) for j, v in p["kawasan"].items()},
            "ulang": round(ulang / basis, 3) if basis else 0,
            "petak": len(petak),
            "luas": round(luas.get(k, 0), 1),
            "kanal_km": round(kanal.get(k, 0), 1),
            "desa": None if dsa is None else len(dsa), "desa_sasaran": sasaran,
            "penduduk": pend.get(k),
        }
    return out


# ---------------------------------------------------------------- aturan
def fid(x):
    """Angka gaya Indonesia: 3465.3 -> '3.465,3'."""
    return f"{x:,}".replace(",", "_").replace(".", ",").replace("_", ".")


def geser(b, d):
    return (b + d) % 12


def musim(bulan):
    """Puncak = bulan terbanyak. Awal musim = mundur dari puncak selama bulan itu >= 15% puncak (melingkar).
    Bulan aksi = awal musim - 2 (tenggat persiapan)."""
    pk = max(range(12), key=lambda i: bulan[i])
    awal = pk
    for _ in range(11):
        sb = geser(awal, -1)
        if bulan[sb] < .15 * bulan[pk]:
            break
        awal = sb
    akhir = pk
    for _ in range(11):
        sd = geser(akhir, 1)
        if bulan[sd] < .15 * bulan[pk] or sd == awal:
            break
        akhir = sd
    return {"puncak": pk, "awal": awal, "akhir": akhir, "tenggat": geser(awal, -2)}


# sumber biaya satuan (rupiah); "perkiraan" = belum ada standar biaya resmi yang terbuka, angka dari komponen
SUMBER = {
    "sekat": "BRGM 2021, Riau: 15 sekat Rp309,6 jt dan 54 sekat Rp1,115 M (± Rp20,6 jt/unit), Mongabay 20 Agu 2021",
    "sumur": "Sumur bor gambut ± Rp1,5 jt + pompa Rp4-5 jt (LPDS 2016); paket lengkap ± Rp6 jt (Mongabay 1 Des 2015); batas atas memberi ruang harga 2026 dan sumur lebih dalam",
    "restorasi": "BRG: restorasi hidrologi ± Rp12 jt/ha untuk 5 tahun (Antara 2016)",
    "mpa": "Perkiraan komponen: 2 pompa portabel Rp4-5 jt/unit (LPDS 2016) + selang dan APD + insentif patroli 10 orang x 90 hari x Rp75-150 rb/hari",
    "ffvp": "Program Desa Bebas Api (APRIL, Riau): hadiah infrastruktur Rp100 jt/desa bebas api, separuh bila luas terbakar < 2 ha (APRIL 2016)",
    "patroli": "Pola patroli terpadu KLHK 2017: 300 posko desa melayani ± 1.200 desa (≈ 4 desa/posko); biaya = 9-12 personel x 90 hari x Rp75-150 rb (perkiraan)",
    "audit": "Perkiraan: tim 3-4 orang x 5-10 hari lapangan per perusahaan; belum ada standar biaya terbuka",
    "pemetaan": "Perkiraan: foto drone + verifikasi lapangan dan data ATR/BPN Rp1-3 jt per petak 1 km",
    "posko": "Perkiraan paket posko permanen (pompa bertekanan, tangki, kendaraan gardan ganda, gudang) Rp300-750 jt",
    "sekat_bakar": "Perkiraan: jalur sekat bakar 10 m dibuat manual ± 15-40 HOK/km x Rp100-200 rb",
    "embung": "DIPA Distan NTT 2024: 31 embung pertanian Rp3,72 M (± Rp120 jt/unit)",
    "paludikultur": "Perkiraan paket revitalisasi ekonomi per desa (bibit tanaman gambut basah, pendampingan) Rp100-250 jt",
    "kawasan": "Perkiraan patroli musim kebakaran bersama Balai TN/BKSDA/KPH Rp100-300 jt per kawasan",
}
JT = 1e6
SUMBER["rutin"] = "biaya rutin BPBD/BMKG; tidak dihitung"
# "berulang" hampir selalu tinggi untuk kecamatan langganan (median 0,8): ambang di kuartil atas supaya membedakan
ULANG = .85


def aturan(k, p, akses):
    """Daftar tindakan (urut bobot) untuk satu kecamatan. p = profil, akses = {daops_jam, ...}. Fungsi murni: diuji di uji()."""
    pv = k.split("|")[0]
    M = musim(p["bulan"])
    b = lambda d: BULAN[geser(M["awal"], d)]
    kon = sum(p["konsesi"].values())
    hutan = p["kawasan"].get("HK", 0) + p["kawasan"].get("HL", 0)
    padat = p["kanal_km"] / p["luas"] if p["luas"] else 0
    savana = pv == "53" and p["gambut"] < .1
    desa = p["desa_sasaran"] if p["desa_sasaran"] is not None else None
    nd = desa if desa else (p["desa"] or 0)
    asumsi_desa = desa is None
    if asumsi_desa:  # provinsi tanpa data desa OSM (Riau, Jambi, NTT): pakai 1 desa per 2 petak langganan, minimal 3, maksimal 15
        nd = min(15, max(3, p["petak"] // 2))
    T = []

    def tambah(kode, bobot, tindakan, alasan, kapan, pj, indikator, unit, lo, hi, sumber, satuan):
        T.append({"kode": kode, "bobot": round(bobot, 3), "tindakan": tindakan, "alasan": alasan, "kapan": kapan, "pj": pj,
                  "indikator": indikator, "unit": unit, "satuan": satuan, "biaya": [round(unit * lo), round(unit * hi)], "sumber": sumber})

    pct = lambda x: f"{round(x * 100)}%"
    if not savana and p["gambut"] >= .3:
        if p["kanal_km"] >= 5 and padat >= .3:
            # 1 sekat per km kanal di bagian gambut, dibatasi 2 sekat per petak langganan di gambut: anggaran publik
            # diarahkan ke kanal di sekitar petak yang berulang terbakar (kanal di dalam konsesi kewajiban pemegang izin, PP 57/2016)
            u = max(1, min(math.ceil(p["kanal_km"] * p["gambut"]), math.ceil(p["petak"] * p["gambut"] * 2)))
            tambah("sekat", p["gambut"] * min(1, padat), "Sekat kanal dan pembasahan gambut",
                   f"{pct(p['gambut'])} titik panas di gambut; kanal {fid(p['kanal_km'])} km ({fid(round(padat, 2))} km/km², termasuk parit kebun OSM) mengeringkan gambut",
                   f"bangun di luar musim api, selesai paling lambat {b(-3)}; periksa ulang tiap {b(-2)}",
                   "BRGM, Dinas LHK provinsi, pemegang konsesi di kanal miliknya", "muka air gambut ≤ 40 cm di titik pantau (PP 57/2016); sekat utuh ≥ 90% saat diperiksa",
                   u, 15 * JT, 30 * JT, "sekat", "sekat")
        u = max(5, math.ceil(p["petak"] * p["gambut"] * 3))  # 3 sumur per petak langganan 1 km di gambut
        tambah("sumur", p["gambut"] * .9, "Sumur bor di petak gambut yang berulang terbakar",
               f"{fid(p['petak'])} petak ±1 km terbakar ≥ 3 tahun; {pct(p['gambut'])} titik di gambut",
               f"bor selesai {b(-2)}, uji pompa {b(-1)}", "BRGM, BPBD kabupaten, Desa/MPA (perawatan)",
               "sumur berfungsi ≥ 80% saat uji pompa; titik panas di petak sasaran turun dibanding rata-rata 5 tahun",
               u, 6 * JT, 15 * JT, "sumur", "sumur")
        if (p["penduduk"] or 0) >= 5000:
            tambah("paludi", p["gambut"] * .5, "Paludikultur dan mata pencaharian tanpa membakar di gambut",
                   f"{pct(p['gambut'])} titik di gambut, {fid(round((p['penduduk'] or 0) / 1000))} rb penduduk bergantung pada lahan",
                   f"tanam awal musim hujan; pendampingan sepanjang tahun", "BRGM, Dinas Pertanian/Perkebunan, Pemdes",
                   "luas lahan gambut dikelola basah bertambah; tidak ada titik panas di lahan peserta", nd, 100 * JT, 250 * JT, "paludikultur", "desa")
    if kon >= .2:
        jenis = ", ".join(f"{j} {pct(v)}" for j, v in sorted(p["konsesi"].items(), key=lambda x: -x[1]))
        aturan_ = "Permentan 5/2018 (kebun sawit)" if p["konsesi"].get("sawit", 0) >= p["konsesi"].get("hph", 0) else "Permen LHK P.32/2016 (PBPH/HPH)"
        tambah("audit", kon, "Audit kepatuhan sarana pengendalian kebakaran di konsesi, sanksi bagi yang lalai",
               f"{pct(kon)} titik panas di dalam konsesi ({jenis}); {p['n_pemegang']} pemegang izin tercatat terbakar. Dasar: {aturan_}, PP 4/2001",
               f"audit {b(-4)}–{b(-3)}; tindak lanjut sebelum {b(-1)}", "Kementerian Kehutanan / Kementan / Dinas Perkebunan, Gakkum KLH",
               "seluruh pemegang izin punya regu, menara, embung sesuai aturan; titik panas di konsesi turun", max(1, p["n_pemegang"]), 50 * JT, 150 * JT, "audit", "perusahaan")
        tambah("patroli_kon", kon * .6, "Patroli bersama perusahaan di batas konsesi dan desa",
               f"{pct(kon)} titik di konsesi; api sering masuk dari batas", f"{b(-1)} sampai {BULAN[M['akhir']]}",
               "Pemegang konsesi, Manggala Agni, MPA", "laporan patroli harian; api di batas konsesi padam < 6 jam", max(1, math.ceil(p["n_pemegang"] / 3)), 60 * JT, 160 * JT, "patroli", "posko")
    if p["ulang"] >= ULANG and not savana:  # savana: bakar padang berulang itu pola musiman, ditangani lewat sekat bakar dan aturan desa
        tambah("hukum", (p["ulang"] - .6) / .4, "Penegakan hukum dan pemetaan pemilik di petak yang terbakar berulang",
               f"{pct(p['ulang'])} titik panas jatuh ≤ 1 km dari titik tahun sebelumnya; {fid(p['petak'])} petak langganan",
               f"pemetaan selesai {b(-2)}; peringatan tertulis ke pemilik {b(-1)}; penindakan bila terbakar lagi",
               "Polri/Polda, Gakkum KLH, Kantor Pertanahan (ATR/BPN), Pemda", "pemilik tiap petak langganan teridentifikasi; petak yang terbakar lagi turun",
               max(1, p["petak"]), 1 * JT, 3 * JT, "pemetaan", "petak")
    if hutan >= .2:
        tambah("kawasan", hutan * .8, "Patroli kawasan konservasi dan hutan lindung",
               f"{pct(hutan)} titik panas di hutan konservasi/lindung", f"{b(-1)} sampai {BULAN[M['akhir']]}",
               "Balai TN/BKSDA, KPH, Manggala Agni", "titik panas di kawasan turun; pelanggar tertangkap tangan ditindak", 1, 100 * JT, 300 * JT, "kawasan", "kawasan")
    if savana:
        u = max(5, p["petak"])
        tambah("sekat_bakar", .9, "Sekat bakar dan pengelolaan padang rumput (bukan sekat kanal)",
               f"savana NTT: {pct(1 - p['gambut'])} titik di tanah mineral; {fid(p['petak'])} petak langganan",
               f"sekat bakar dan bakar terkendali {b(-3)}–{b(-2)} saat rumput masih lembap; aturan desa/adat soal waktu bakar", "BPBD, Dinas Peternakan, Desa/lembaga adat, KPH",
               "jalur sekat bakar terpelihara; luas padang terbakar turun", u, 3 * JT, 8 * JT, "sekat_bakar", "km")
        tambah("embung", .5, "Embung air untuk ternak dan pemadaman", "savana kering, sumber air jauh dari petak langganan",
               f"selesai sebelum {b(-2)}", "Dinas Pertanian/PUPR, Desa", "embung berisi air saat puncak musim", min(10, max(1, math.ceil(p["petak"] / 20))), 100 * JT, 150 * JT, "embung", "embung")
    jam = akses.get("daops_jam")
    if jam is not None and jam > 3:
        tambah("posko", min(.7, .35 + jam / 30), "Posko permanen dan penempatan regu sebelum musim",
               f"Daops terdekat ({akses.get('daops')}) ± {fid(round(jam, 1))} jam perjalanan dari pusat titik panas",
               f"regu dan peralatan tiba {b(-1)}, siaga sampai {BULAN[M['akhir']]}", "BPBD provinsi/kabupaten, Manggala Agni, TNI",
               "waktu tiba di api < 2 jam; api padam < 24 jam", 1, 300 * JT, 750 * JT, "posko", "posko")
    if nd >= 3:
        tambah("mpa", min(1, nd / 15) * .8, "Bentuk/kuatkan MPA (Masyarakat Peduli Api) dan Desa Mandiri Peduli Api",
               f"{nd} desa {'(perkiraan; data desa belum ada)' if asumsi_desa else 'dalam 3 km dari petak langganan'}",
               f"pelatihan {b(-3)}, peralatan tiba {b(-2)}, patroli {b(-1)}–{BULAN[M['akhir']]}", "Pemdes, BPBD, Manggala Agni, BRGM (desa gambut)",
               "tiap desa sasaran punya regu terlatih dan pompa; api desa padam sebelum meluas", nd, 80 * JT, 150 * JT, "mpa", "desa")
        if not savana and p["gambut"] < .5 and kon < .5:
            tambah("pltb", .55 * (1 - p["gambut"]), "Insentif pembukaan lahan tanpa bakar (PLTB) dan hadiah desa bebas api",
                   f"api banyak di lahan pertanian/rakyat ({pct(1 - p['gambut'] - kon if 1 - p['gambut'] - kon > 0 else 0)} titik di luar gambut dan konsesi)",
                   f"sosialisasi {b(-3)}; alat mesin pembuka lahan tersedia {b(-2)}; hadiah dinilai akhir musim", "Dinas Pertanian, Pemda, Desa, perusahaan (CSR)",
                   "desa peserta tanpa api; luas terbakar < 2 ha per desa", nd, 50 * JT, 100 * JT, "ffvp", "desa")
    # selalu: peringatan dini harian (FWI/FDRS) dan siaga sebelum awal musim -> biaya rutin
    T.append({"kode": "dini", "bobot": .3, "tindakan": "Peringatan dini harian (FWI) dan penetapan siaga sebelum musim",
              "alasan": f"musim api {BULAN[M['awal']]}–{BULAN[M['akhir']]}, puncak {BULAN[M['puncak']]}",
              "kapan": f"status siaga ditetapkan {b(-1)}; pantau FWI harian sampai {BULAN[M['akhir']]}", "pj": "BPBD, BMKG, Pemda (SK siaga darurat)",
              "indikator": "SK siaga terbit sebelum awal musim; regu bergerak saat FWI tinggi", "unit": 0, "satuan": "", "biaya": [0, 0],
              "sumber": "rutin"})
    T.sort(key=lambda x: -x["bobot"])
    pola = ("Savana" if savana else "Gambut berkanal" if p["gambut"] >= .4 and padat >= .3 else "Gambut" if p["gambut"] >= .4
            else "Konsesi" if kon >= .35 else "Kawasan hutan" if hutan >= .3 else "Lahan pertanian/rakyat")
    return {"musim": M, "pola": pola, "kanal_padat": round(padat, 2), "asumsi_desa": asumsi_desa, "tindakan": T,
            "biaya": [sum(t["biaya"][0] for t in T), sum(t["biaya"][1] for t in T)]}


# ---------------------------------------------------------------- tahap rencana (harian)
def akses_kec(p, daops, posko):
    la, lo = p["pusat"]
    out = {}
    if daops:
        d = min(daops, key=lambda x: km(la, lo, x["lat"], x["lon"]))
        j = km(la, lo, d["lat"], d["lon"])
        out.update(daops=d["nama"], daops_km=round(j * KELOK), daops_jam=round(j * KELOK / LAJU, 1))
    if posko:
        d = min(posko, key=lambda x: km(la, lo, x["lat"], x["lon"]))
        j = km(la, lo, d["lat"], d["lon"])
        out.update(posko=d["nama"], posko_km=round(j * KELOK), posko_jam=round(j * KELOK / LAJU, 1))
    return out


def rencana(prof, sk):
    daops = [d for d in json.load(open(os.path.join(DATA, "daops.json"))) if d.get("lat") is not None]
    try:
        posko = json.load(open(os.path.join(DATA, "posko.json"))).get("posko", [])
    except (OSError, ValueError):
        posko = []
    kec, prov = {}, {}
    for k, p in prof.items():
        ak = akses_kec(p, daops, posko)
        r = aturan(k, p, ak)
        s = sk.get(k, {})
        v = s.get("v", [])
        tren = round((sum(v[-5:]) / 5 + 1) / (sum(v[:-5]) / max(1, len(v) - 5) + 1), 2) if len(v) > 5 else None
        kec[k] = {"skor": s.get("skor"), "tahun": s.get("tahun"), "total": s.get("total"), "tren5": tren,
                  "rata": round(s.get("total", 0) / max(1, len(v)), 1), **{x: p[x] for x in p if x != "pusat"}, "pusat": p["pusat"], "akses": ak, **r}
        q = prov.setdefault(k.split("|")[0], {"n": 0, "pola": {}, "aksi": {}, "biaya": [0, 0], "awal": [], "tenggat": None})
        q["n"] += 1
        q["pola"][r["pola"]] = q["pola"].get(r["pola"], 0) + 1
        for t in r["tindakan"][:3]:
            q["aksi"][t["tindakan"]] = q["aksi"].get(t["tindakan"], 0) + 1
        q["biaya"] = [q["biaya"][0] + r["biaya"][0], q["biaya"][1] + r["biaya"][1]]
        q["awal"].append(r["musim"]["awal"])
    for pv, q in prov.items():
        # awal musim paling umum (modus) lalu yang paling dini; tenggat = awal paling dini - 2
        dini = min(q["awal"])
        q["awal_dini"] = dini
        q["awal_dini_n"] = q["awal"].count(dini)
        q["awal_umum"] = max(set(q["awal"]), key=q["awal"].count)
        q["tenggat"] = geser(dini, -2)
        q["tenggat_tahun_lalu"] = dini < 2
        q["pola"] = sorted(q["pola"].items(), key=lambda x: -x[1])
        q["aksi"] = [a for a, _ in sorted(q["aksi"].items(), key=lambda x: -x[1])[:3]]
        q["nama"] = PROVINSI.get(pv, pv)
        del q["awal"]
    return kec, prov


def main(paksa_ringan=False):
    D = json.load(open(os.path.join(DATA, "sejarah_modis.json")))
    sk = skor(D)
    if os.path.exists(MODIS) and not paksa_ringan:
        prof = profil(pilih(sk))
    elif os.path.exists(KELUAR):
        lama = json.load(open(KELUAR))
        prof = {k: {x: v[x] for x in ("n", "bulan", "pusat", "gambut", "konsesi", "n_pemegang", "kawasan", "ulang", "petak",
                                     "luas", "kanal_km", "desa", "desa_sasaran", "penduduk")} for k, v in lama["kec"].items()}
        print("arsip MODIS tidak ada: profil dari preventif.json lama, jarak dan aturan dihitung ulang", file=sys.stderr)
    else:
        print("arsip MODIS dan preventif.json tidak ada: dilewati", file=sys.stderr)
        return
    kec, prov = rencana(prof, sk)
    out = {"dibuat": dt.date.today().isoformat(), "tahun": D["tahun"],
           "sumber": "NASA FIRMS MODIS 2002-sekarang (keyakinan >= 30, api vegetasi); gambut/konsesi/kawasan public/data/lahan; kanal & desa OpenStreetMap; penduduk WorldPop 2026; Daops SiPongi",
           "catatan": "Perkiraan untuk perencanaan, bukan RAB. Biaya satuan dan sumbernya tertulis di tiap tindakan. Titik panas MODIS ±1 km; 'berulang' = ada titik tahun sebelumnya dalam 1 km.",
           "bulan": BULAN, "sumber_biaya": SUMBER, "kec": kec, "prov": prov}
    json.dump(out, open(KELUAR, "w"), ensure_ascii=False, separators=(",", ":"))
    print(f"{len(kec)} kecamatan, {len(prov)} provinsi -> {KELUAR}", file=sys.stderr)


# ---------------------------------------------------------------- uji invarian
def uji():
    dasar = {"n": 500, "bulan": [5, 5, 5, 5, 10, 20, 60, 120, 200, 150, 20, 5], "pusat": [-2.0, 114.0], "gambut": 0, "konsesi": {},
             "n_pemegang": 0, "kawasan": {}, "ulang": 0, "petak": 10, "luas": 500, "kanal_km": 0, "desa": 10, "desa_sasaran": 8, "penduduk": 20000}
    kode = lambda r: [t["kode"] for t in r["tindakan"]]
    # musim: puncak Sep, awal mundur selama >= 15% puncak -> Jul (60 >= 30, Jun 20 < 30); tenggat = Mei
    M = musim(dasar["bulan"])
    assert (M["puncak"], M["awal"], M["akhir"], M["tenggat"]) == (8, 6, 9, 4), M
    # musim melingkar (Riau: puncak Feb) -> tenggat jatuh tahun sebelumnya
    M2 = musim([80, 100, 40, 5, 5, 5, 5, 5, 5, 5, 10, 30])
    assert M2["puncak"] == 1 and M2["awal"] == 11 and M2["tenggat"] == 9, M2
    # gambut + kanal padat -> sekat & sumur; tanpa kanal -> sumur saja
    g = aturan("62|X|Y", {**dasar, "gambut": .8, "kanal_km": 400}, {})
    assert {"sekat", "sumur"} <= set(kode(g)) and g["pola"] == "Gambut berkanal", kode(g)
    g2 = aturan("62|X|Y", {**dasar, "gambut": .8}, {})
    assert "sekat" not in kode(g2) and "sumur" in kode(g2), kode(g2)
    # savana NTT: tidak boleh ada tindakan gambut, harus ada sekat bakar
    s = aturan("53|X|Y", {**dasar, "gambut": .05, "kanal_km": 400}, {})
    assert not {"sekat", "sumur", "paludi"} & set(kode(s)) and "sekat_bakar" in kode(s) and s["pola"] == "Savana", kode(s)
    assert "hukum" not in kode(aturan("53|X|Y", {**dasar, "ulang": .95}, {})), "savana tidak memakai penegakan petak"
    # sekat kanal dibatasi 2 per petak langganan di gambut (10 petak x 0,8 x 2 = 16), bukan 1 per km kanal (320)
    assert next(t for t in g["tindakan"] if t["kode"] == "sekat")["unit"] == 16
    # konsesi tinggi -> audit, satuan = jumlah pemegang; konsesi nol -> tidak ada audit
    c = aturan("16|X|Y", {**dasar, "konsesi": {"sawit": .6}, "n_pemegang": 7}, {})
    a = next(t for t in c["tindakan"] if t["kode"] == "audit")
    assert a["unit"] == 7 and "Permentan 5/2018" in a["alasan"], a
    assert "audit" not in kode(aturan("16|X|Y", dasar, {}))
    # titik berulang tinggi -> penegakan hukum; rendah -> tidak
    assert "hukum" in kode(aturan("14|X|Y", {**dasar, "ulang": .9}, {})) and "hukum" not in kode(aturan("14|X|Y", {**dasar, "ulang": .8}, {}))
    # jauh dari Daops (> 3 jam) -> posko permanen; dekat -> tidak
    assert "posko" in kode(aturan("61|X|Y", dasar, {"daops_jam": 5, "daops": "D"})) and "posko" not in kode(aturan("61|X|Y", dasar, {"daops_jam": 1}))
    # desa: tanpa data desa dipakai asumsi dan ditandai
    t = aturan("14|X|Y", {**dasar, "desa": None, "desa_sasaran": None, "petak": 40}, {})
    assert t["asumsi_desa"] and next(x for x in t["tindakan"] if x["kode"] == "mpa")["unit"] == 15
    # biaya: rentang rendah <= tinggi, total = jumlah tindakan, urutan bobot menurun, peringatan dini selalu ada
    for r in (g, g2, s, c, t):
        assert all(0 <= x["biaya"][0] <= x["biaya"][1] for x in r["tindakan"])
        assert r["biaya"] == [sum(x["biaya"][0] for x in r["tindakan"]), sum(x["biaya"][1] for x in r["tindakan"])]
        assert [x["bobot"] for x in r["tindakan"]] == sorted((x["bobot"] for x in r["tindakan"]), reverse=True)
        assert "dini" in kode(r) and all(x["sumber"] in SUMBER for x in r["tindakan"])
    # skor sama dengan skorRiwayat: kecamatan terbakar tiap tahun dengan total terbesar dan tren datar -> 50 + 30 + 10
    th = [str(y) for y in range(2002, 2027)]
    S = skor({"tahun": th, "kec": {"a|b|c": [100] * 25, "a|b|d": [0] * 25}})
    assert S["a|b|c"]["skor"] == 90 and S["a|b|c"]["tahun"] == 25 and S["a|b|d"]["skor"] == 10, S
    assert fid(3465.3) == "3.465,3" and fid(2.41) == "2,41" and fid(12) == "12"
    print("uji preventif: ok")


if __name__ == "__main__":
    a = sys.argv[1] if len(sys.argv) > 1 else ""
    uji() if a == "uji" else main(a == "ringan")
