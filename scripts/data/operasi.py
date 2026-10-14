"""Rencana operasi & kebutuhan sumber daya -> public/data/operasi.json

Per kompleks aktif (kluster.json) dihitung BEBAN KERJA yang tidak bergantung target hari:
  regu-hari garis kendali (front aktif), regu-hari mop-up bara gambut, titik bor, heli-hari water bombing.
Halaman (operasi.js) membagi beban itu dengan target T hari (slider 1-14) memakai rumus yang SAMA dengan
fungsi kebutuhan() di bawah; `uji` memeriksa keduanya sama lewat node bila tersedia.
Semua koefisien ada di KOEF (lo/mid/hi + sumber + arti) dan ikut ditulis ke JSON supaya halaman mengutip tabel yang sama.

Pakai:  python3 scripts/data/operasi.py        # tulis public/data/operasi.json (jalan setelah harian.py, posko.py, akses.py)
        python3 scripts/data/operasi.py uji    # uji invarian (tanpa jaringan)
"""
import datetime as dt, json, math, os, shutil, subprocess, sys

sys.path.insert(0, os.path.dirname(__file__))
from wilayah import AKAR, Poligon  # noqa: E402

DATA = os.path.join(AKAR, "public/data")
WIB = dt.timezone(dt.timedelta(hours=7))
PX_KM2 = 0.375 * 0.375  # piksel VIIRS 375 m = 0,1406 km2 = 14 ha (sama dengan harian.py / ringkasan.js)
S = {"optimis": 0, "tengah": 1, "pesimis": 2}

# lo = nilai skenario OPTIMIS (kebutuhan terkecil), mid = tengah, hi = nilai skenario PESIMIS (kebutuhan terbesar).
# Jadi untuk laju kerja "lo" adalah laju tercepat, untuk luas bara "lo" adalah luas terkecil.
KOEF = {
    "orang_regu": dict(lo=15, mid=15, hi=15, satuan="orang/regu",
        sumber="Permen LHK P.32/2016 (struktur Brigdalkarhutla; regu inti 15 orang, dipakai juga di tab Sarana)",
        url="https://peraturan.bpk.go.id/Details/298069",
        arti="Satu regu pemadam = 15 orang: 1 ketua, 2-3 operator pompa, sisanya penyemprot, pembuat sekat, logistik."),
    "garis_mineral": dict(lo=1.8, mid=1.2, hi=0.6, satuan="km garis/regu/hari",
        sumber="Ringkasan & Simulasi platform (150 m/jam x 8 jam); NWCG Fireline Production Tables, regu 20 orang Type II 450-630 ft/jam di semak/serasah",
        url="https://www.nwcg.gov/publications/pms410-1",
        arti="Berapa km sekat/garis api yang bisa dibuat dan dijaga satu regu dalam satu hari kerja 8 jam di tanah mineral atau semak."),
    "garis_savana": dict(lo=3.0, mid=2.0, hi=1.2, satuan="km garis/regu/hari",
        sumber="NWCG Fireline Production Tables: rumput pendek (fuel model 1) Type II 627 ft/jam serangan langsung; contoh NWCG 900 ft/jam regu 15 orang",
        url="https://www.nwcg.gov/publications/pms410-1",
        arti="Rumput savana terbakar cepat tetapi mudah dipukul dengan kepyok dan sekat sempit; satu regu bisa mengurung lebih panjang."),
    "garis_gambut": dict(lo=1.0, mid=0.6, hi=0.3, satuan="km garis/regu/hari",
        sumber="Asumsi platform: separuh laju tanah mineral karena garis di gambut harus dibasahi (selang dan injeksi), bukan sekadar dikeruk; laporan Manggala Agni 2026 memakai pola satu jalur selang",
        url="https://www.metrotvnews.com/read/kBVCM3e4-kebakaran-lahan-gambut-di-air-hitam-pekanbaru-padam-total",
        arti="Di gambut garis api harus dibasahi sampai ke bawah permukaan, jadi satu regu hanya mengurung sekitar separuh panjang dibanding di tanah mineral."),
    "isi_ambang": dict(lo=10, mid=8, hi=6, satuan="ISI",
        sumber="Canadian FWI System (Van Wagner 1987): ISI = laju sebar awal; di atas ± 8-10 serangan langsung regu tangan makin sering gagal (Alexander & De Groot 1988, panduan CIFFC)",
        url="https://cwfis.cfs.nrcan.gc.ca/background/summary/fwi",
        arti="Bila angin dan bahan bakar kering membuat api menjalar cepat (ISI tinggi), produksi garis per regu dikurangi: tiap 8 poin ISI di atas ambang memotong produksi setengahnya."),
    "tumbuh_maks": dict(lo=1.25, mid=1.5, hi=2.0, satuan="kali",
        sumber="Asumsi platform: rasio deteksi hari ini / kemarin (kluster.json: ini/kmrn), dibatasi",
        url="",
        arti="Kompleks yang deteksinya bertambah dari kemarin diberi cadangan panjang front (maksimal 1,5 kali) karena api masih membesar selama regu dalam perjalanan."),
    "ha_bara_piksel": dict(lo=1, mid=2, hi=4, satuan="ha/piksel aktif",
        sumber="Asumsi platform: piksel VIIRS 14 ha hanya sebagian kecil yang benar-benar membara; dicocokkan dengan rekap BNPB (lihat kotak rekonsiliasi)",
        url="https://www.earthdata.nasa.gov/data/tools/firms",
        arti="Satu titik panas VIIRS mewakili kotak 375 x 375 m (14 ha), tetapi bara di dalamnya biasanya hanya 1-4 ha. Angka ini mengubah piksel menjadi luas yang harus di-mop-up."),
    "bara_regu": dict(lo=2.8, mid=1.0, hi=0.5, satuan="ha/regu/hari",
        sumber="Kasus Manggala Agni 2026: Aceh Selatan 28 ha gambut oleh 1 regu dalam 10 hari (2,8 ha/hari); Air Hitam Pekanbaru 1 ha dalam 2 hari (0,5); Nagan Raya 10 ha dalam 9 hari",
        url="https://www.metrotvnews.com/read/bD2CwzLL-kebakaran-28-hektare-lahan-gambut-di-aceh-selatan-padam",
        arti="Luas gambut membara yang bisa dipadamkan tuntas (disiram, disuntik, dicek suhunya) oleh satu regu dalam sehari."),
    "air_bara": dict(lo=72000, mid=200000, hi=500000, satuan="L/ha",
        sumber="Santoso dkk. 2021 (Int. J. Wildland Fire 30(5), uji lapangan Palangka Raya 7,2 L/m2); uji lab 16-24 L/m2; Prof. Yulianto (UI) 200 rb-1 jt L/ha",
        url="https://www.publish.csiro.au/wf/Fulltext/WF20117",
        arti="Air yang dibutuhkan untuk mematikan bara per hektare gambut. Uji lapangan terbaik 72 rb L/ha; di gambut tebal dan kering bisa jauh lebih banyak."),
    "ha_per_bor": dict(lo=12.5, mid=4, hi=3, satuan="ha/titik bor",
        sumber="Laporan lapangan Kalteng (LPDS): 1 sumur bor menjangkau 3-4 ha dengan sambungan selang; BMKG Sep 2026: radius ± 200 m (± 12,5 ha) dari titik bor",
        url="https://lpds.or.id/climatereporter/bor-sumur-sekat-kanal/",
        arti="Satu titik bor air (sumur bor dangkal 16-30 m, pipa 2,5 inci) melayani gambut di sekitarnya lewat selang. Dibuat ± 3 jam per titik (BRG)."),
    "kanal_dekat": dict(lo=0.5, mid=0.5, hi=0.5, satuan="km",
        sumber="Asumsi platform: jarak pusat kompleks ke sel kanal OSM (kanal.json) yang masih terjangkau selang 10-15 gulung",
        url="https://www.openstreetmap.org",
        arti="Bila kanal/parit berada <= 0,5 km, separuh kebutuhan titik bor dianggap tertutup air kanal."),
    "pompa_regu_gambut": dict(lo=2, mid=2, hi=2, satuan="pompa/regu",
        sumber="Permentan 5/2018 Lampiran IV & P.32/2016 (pompa induk + pompa jinjing per regu); praktik Manggala Agni (Mark-3 + Mini Striker)",
        url="https://www.rri.co.id/jakarta/nasional/2599388/tim-manggala-agni-kemenhut-padamkan-kebakaran-hutan-dan-lahan-di-aceh",
        arti="Regu gambut membawa dua pompa: satu menyedot dari kanal/sumur bor, satu mendorong ke nozel atau injektor."),
    "selang_pompa": dict(lo=200, mid=300, hi=500, satuan="m/pompa",
        sumber="Kalteng: jarak antarsumur mengikuti panjang selang 50 m per sambungan; jangkauan semprot 100 m lebih (LPDS)",
        url="https://lpds.or.id/climatereporter/menghalau-api-di-bumi-tambun-bungai/",
        arti="Panjang selang per pompa: dari sumber air ke front ditambah cadangan. Rawa sulit dijangkau memakai batas atas."),
    "cadangan_pompa": dict(lo=1.1, mid=1.2, hi=1.3, satuan="kali",
        sumber="Asumsi platform (pompa rusak/servis; STATUS_AKSI: uji pompa berkala)",
        url="", arti="Tambahan pompa cadangan karena pompa sering macet oleh lumpur gambut."),
    "hari_mopup": dict(lo=4, mid=4, hi=4, satuan="hari setelah target kurung",
        sumber="Asumsi platform; selaras laci Ringkasan (heli & OMC 7 hari untuk target kurung 3 hari)",
        url="", arti="Mop-up bara gambut diberi waktu T + 4 hari: setelah front terkurung, bara masih harus dimatikan sampai dingin."),
    "rotasi": dict(lo=1.25, mid=1.5, hi=2.0, satuan="kali",
        sumber="Asumsi platform: tiga giliran (2 regu bekerja, 1 istirahat); operasi gambut siang-malam memakai 2,0",
        url="", arti="Regu tidak bisa bekerja terus-menerus; untuk tiap dua regu di garis, satu regu beristirahat dan siap menggantikan."),
    "dukungan": dict(lo=0.05, mid=0.10, hi=0.15, satuan="porsi personel",
        sumber="Asumsi platform: komando lapangan, logistik, kesehatan, pengemudi/perahu",
        url="", arti="Tambahan orang di belakang garis: komandan, dapur umum, medis, pengemudi dan motoris perahu."),
    "jam_tiba": dict(lo=6, mid=6, hi=6, satuan="jam",
        sumber="ATURAN.jamTiba di ringkasan.js; waktu tempuh dari akses.json (jalan & sungai OSM)",
        url="", arti="Kompleks yang tidak bisa dicapai regu darat dalam 6 jam dianggap butuh dukungan water bombing untuk menahan front."),
    "jarak_air_heli": dict(lo=2, mid=5, hi=15, satuan="km",
        sumber="Asumsi platform; jarak ke danau/sungai untuk isi ember",
        url="", arti="Jarak bolak-balik heli ke sumber air menentukan berapa kali bisa menjatuhkan air per jam."),
    "heli_jam_hari": dict(lo=6, mid=6, hi=6, satuan="jam terbang/heli/hari",
        sumber="ASUMSI.heliJamHari di halaman Posko", url="",
        arti="Jam terbang efektif water bombing per helikopter per hari (siang, jarak pandang cukup)."),
    "m_per_drop": dict(lo=80, mid=50, hi=30, satuan="m garis basah/jatuhan",
        sumber="Mi-8/Kamov ± 4.000 L per jatuhan (BNPB 2020); 1 Mi-8 46 jatuhan/hari di Muara Enim 2024 (detik.com)",
        url="https://www.detik.com/sumbagsel/berita/d-7533814/5-helikopter-water-bombing-atasi-karhutla-di-muara-enim/amp",
        arti="Satu jatuhan 4.000 L membasahi pita ± 50 m di depan api. Water bombing MENAHAN dan MENDINGINKAN; tidak memadamkan bara di dalam gambut."),
    "omc_ph": dict(lo=0.15, mid=0.15, hi=0.15, satuan="peluang hujan",
        sumber="fwi_ansambel.json (ECMWF 51 anggota): ph = peluang hujan >= 5 mm/24 jam; BMKG: OMC butuh awan potensial hujan",
        url="https://katadata.co.id/berita/nasional/6a68baaa58ca1/bmkg-sasar-modifikasi-cuaca-di-6-provinsi-riau-hingga-kalimantan-jadi-priori",
        arti="Hari layak OMC = peluang hujan rata-rata provinsi 15-60%: awan ada tetapi hujan belum pasti. < 15% tidak ada awan untuk disemai; > 60% hujan alami sudah mungkin."),
    "air_minum": dict(lo=4, mid=5, hi=8, satuan="L/orang/hari",
        sumber="Sphere Handbook 2018: 2,5-3 L/orang/hari untuk bertahan hidup, lebih tinggi untuk kerja berat di udara panas",
        url="https://spherestandards.org/handbook/editions/",
        arti="Air minum per personel per hari di lapangan berasap dan panas, belum termasuk air untuk memasak."),
    "biaya_bor": dict(lo=1.5e6, mid=3e6, hi=6e6, satuan="Rp/titik bor",
        sumber="preventif.json sumber_biaya: sumur bor gambut ± Rp1,5 jt (LPDS 2016); paket dengan pompa ± Rp6 jt (Mongabay 2015); harga 2026 di tengah",
        url="https://lpds.or.id/climatereporter/bor-sumur-sekat-kanal/",
        arti="Biaya membuat satu titik bor air dangkal (tanpa pompa; pompa dihitung terpisah)."),
    "polhut_ha_hari": dict(lo=4000, mid=2500, hi=1500, satuan="ha/regu patroli/hari",
        sumber="Asumsi platform: rute 25 km bermotor/jalan kaki x pandangan 1 km; Kemenhut 2026: rasio sekarang 1 polhut per 26.000 ha",
        url="https://finansial.bisnis.com/read/20261006/11/2010287/polisi-hutan-bakal-ditambah-dari-4500-jadi-70000-personel",
        arti="Luas yang bisa diawasi satu regu patroli (3 orang) dalam sehari."),
    "polhut_siklus": dict(lo=5, mid=3, hi=2, satuan="hari",
        sumber="Asumsi platform; P.32/2016 patroli rutin & terpadu saat siaga",
        url="", arti="Tiap petak rawan didatangi ulang paling lambat tiap 3 hari pada musim kemarau."),
    "polhut_regu": dict(lo=3, mid=3, hi=3, satuan="orang",
        sumber="Asumsi platform (2 polhut + 1 MPA / pemandu desa)", url="",
        arti="Satu regu patroli pencegahan."),
    "polhut_kerja": dict(lo=1.3, mid=1.4, hi=1.6, satuan="kali",
        sumber="Asumsi platform: 5 hari kerja dari 7, cuti dan pelatihan", url="",
        arti="Faktor agar patroli tetap jalan tiap hari walau personel libur bergantian."),
}


def k(nama, s):
    """nilai koefisien untuk skenario s (0 optimis, 1 tengah, 2 pesimis)."""
    return KOEF[nama][("lo", "mid", "hi")[s]]


def kebutuhan(c, T, s=1):
    """Satu-satunya rumus T-bergantung (pecahan; dibulatkan ke atas hanya saat dijumlah di total()).
    operasi.js:OperasiHitung.kebutuhan HARUS sama (diuji di `uji`). Kompleks kecil berdekatan berbagi regu, jadi 0,3 regu sah."""
    T = max(1, min(14, int(T)))
    rg = c["wl"][s] / T
    rb = c["wb"][s] / (T + k("hari_mopup", s))
    pg = k("pompa_regu_gambut", s)
    pompa = (rb * pg + rg * (pg if c["ps"] >= 0.5 else 1)) * k("cadangan_pompa", s)
    return {"regu_kerja": rg + rb, "regu_garis": rg, "regu_bara": rb, "pompa": pompa, "bor": c["bor"][s], "heli": c["wh"][s] / T}


def total(kompleks, T, s=1):
    """agregat: jumlah pecahan dulu, lalu dibulatkan ke atas; rotasi & dukungan dikenakan pada jumlah regu kerja."""
    t = {"regu_kerja": 0, "regu_garis": 0, "regu_bara": 0, "pompa": 0, "bor": 0, "heli": 0}
    for c in kompleks:
        b = kebutuhan(c, T, s)
        for x in t:
            t[x] += b[x]
    t["regu_kerja"] = math.ceil(t["regu_kerja"] - 1e-9)
    t["regu_garis"] = math.ceil(t["regu_garis"] - 1e-9)
    t["regu_bara"] = math.ceil(t["regu_bara"] - 1e-9)
    t["pompa"] = math.ceil(t["pompa"] - 1e-9)
    t["heli"] = math.ceil(t["heli"] - 1e-9)
    t["selang"] = t["pompa"] * k("selang_pompa", s)
    t["regu"] = math.ceil(t["regu_kerja"] * k("rotasi", s) - 1e-9)
    t["personel"] = math.floor(t["regu"] * k("orang_regu", s) * (1 + k("dukungan", s)) + 0.5)
    return t


# ---------------------------------------------------------------- geometri & beban
def hav(lat1, lon1, lat2, lon2):
    p = math.pi / 180
    a = math.sin((lat2 - lat1) * p / 2) ** 2 + math.cos(lat1 * p) * math.cos(lat2 * p) * math.sin((lon2 - lon1) * p / 2) ** 2
    return 2 * 6371.0088 * math.asin(math.sqrt(a))


def keliling(geom, luas_ha):
    if geom and geom["type"] in ("Polygon", "MultiPolygon"):  # garis luar kompleks bisa terpecah (harian.py/garis_api.py)
        P = [geom["coordinates"]] if geom["type"] == "Polygon" else geom["coordinates"]
        return sum(hav(r[i][1], r[i][0], r[i + 1][1], r[i + 1][0]) for p in P for r in p[:1] for i in range(len(r) - 1))
    return 2 * math.sqrt(math.pi * luas_ha / 100)  # titik: lingkaran seluas kompleks


def beban(p, kel, ps, jam, kanal_km, jam_dihitung=True):
    """beban kerja satu kompleks untuk 3 skenario. p = properti kluster."""
    px = p.get("px24") or 0
    gambut = ps >= 0.5
    sav = not gambut and p["prov"] in ("52", "53", "93")
    jenis = "gambut" if gambut else "savana" if sav else "mineral"
    kmrn, ini = p.get("kmrn") or 0, p.get("ini") or 0
    wl, wb, bor, wh, front, bara = [], [], [], [], [], []
    for s in range(3):
        g = min(k("tumbuh_maks", s), max(1.0, ini / kmrn)) if kmrn else 1.0
        L = min(kel, 2 * math.sqrt(math.pi * px * PX_KM2)) * g if px else 0.0
        f_isi = 1 + max(0.0, (p.get("isi") or 0) - k("isi_ambang", s)) / 8
        wl.append(round(L * f_isi / k("garis_" + jenis, s), 3))
        # bara: gambut yang masih teramati (<= 168 jam) dihitung minimal 1 piksel walau 24 jam terakhir tertutup awan/asap
        pxb = max(px, 1) if ps > 0 and p.get("teramati") else 0
        A = min(p["luas"] * ps, pxb * k("ha_bara_piksel", s)) if pxb else 0.0
        wb.append(round(A / k("bara_regu", s), 3))
        nb = math.ceil(A / k("ha_per_bor", s)) if A else 0
        bor.append(math.ceil(nb * 0.5) if kanal_km is not None and kanal_km <= k("kanal_dekat", s) else nb)
        siklus = 2 * k("jarak_air_heli", s) / 150 * 60 + 3  # menit: terbang 150 km/jam + 3 menit isi & jatuhkan
        km_heli = k("heli_jam_hari", s) * 60 / siklus * k("m_per_drop", s) / 1000
        wh.append(round(L / km_heli, 3) if L and jam_dihitung and (jam is None or jam > k("jam_tiba", s)) else 0)
        front.append(round(L, 2)); bara.append(round(A, 1))
    return jenis, {"wl": wl, "wb": wb, "bor": bor, "wh": wh, "front": front, "bara": bara}


def kawasan(tg):
    a = (tg or [""])[0]
    if a.startswith("BKSDA"):
        return "konservasi"
    if a == "Perusahaan perkebunan" or a.startswith(("Pemegang PBPH", "Pemegang izin konsesi")):
        return "konsesi"
    return "lain"


def baca(nama):
    try:
        return json.load(open(os.path.join(DATA, nama)))
    except (OSError, ValueError):
        return None


def main():
    meta, kl, ak, kn = baca("meta.json"), baca("kluster.json"), baca("akses.json") or {}, baca("kanal.json")
    bn, ans, dop, prev, res = baca("bnpb.json"), baca("fwi_ansambel.json"), baca("daops.json") or [], baca("preventif.json"), baca("operasi_resmi.json")
    gb = Poligon(os.path.join(DATA, "lahan/gambut.geojson"))
    # kanal: sel 0,02 derajat -> indeks kasar 0,1 derajat untuk cari tetangga terdekat
    kanal = {}
    for la, lo, km in (kn or {}).get("grid", []):
        kanal.setdefault((round(la, 1), round(lo, 1)), []).append((la, lo))

    def jarak_kanal(lat, lon):
        best = None
        for dy in (-0.1, 0, 0.1):
            for dx in (-0.1, 0, 0.1):
                for la, lo in kanal.get((round(lat + dy, 1), round(lon + dx, 1)), ()):
                    d = hav(lat, lon, la, lo)
                    best = d if best is None or d < best else best
        return None if best is None else round(best, 2)

    def tiba(p):
        a = ak.get(p["id"])
        if a and a.get("dari"):
            d = min(a["dari"], key=lambda x: x["jam"])
            return round(d["jam"] + a.get("kaki_km", 0) / 4, 1), d["dari"], "akses"
        if a:  # dihitung akses.py tetapi tidak ada rute jalan/sungai <= 18 jam
            return None, "tidak ada rute jalan/sungai <= 18 jam", "akses"
        if p.get("jarak_daops") is not None:  # perkiraan garis lurus: x1,3 berliku, 30 km/jam, + 1 jam jalan kaki
            return round(p["jarak_daops"] * 1.3 / 30 + 1, 1), "Daops " + (p.get("daops") or "?"), "perkiraan"
        return None, "", "perkiraan"

    out = []
    for f in kl["features"]:
        p = f["properties"]
        if not p.get("teramati") or not (p.get("px24") or p.get("gambut")):
            continue
        pts = p.get("api24") or []
        ps = (sum(1 for x in pts if gb.cari(x[0], x[1]) is not None) / len(pts)) if pts else (1.0 if p.get("gambut") else 0.0)
        if p.get("gambut") and ps == 0:
            ps = 0.5 if gb.cari(p["lon"], p["lat"]) else 0.0
        jam, dari, jsum = tiba(p)
        kkm = jarak_kanal(p["lat"], p["lon"]) if kanal else None
        kel = keliling(f["geometry"], p["luas"])
        jenis, b = beban(p, kel, ps, jam, kkm, jsum == "akses")
        if not any(b["wl"]) and not any(b["wb"]):
            continue
        tnp = p["prov"] == "62" and 111.5 < p["lon"] < 112.45 and -3.8 < p["lat"] < -2.5 and "Taman Nasional" in (p.get("tanggung") or [])
        out.append({"id": p["id"], "prov": p["prov"], "kab": p.get("kab"), "kec": p.get("kec"), "lat": p["lat"], "lon": p["lon"],
                    "jenis": jenis, "kaw": kawasan(p.get("tanggung")), "pj": (p.get("tanggung") or ["", ""])[-1], "ps": round(ps, 2),
                    "dc": p.get("dc"), "isi": p.get("isi"), "ws": p.get("ws"), "px": p.get("px24") or 0, "luas": p["luas"], "kel": round(kel, 1),
                    "ini": p.get("ini"), "kmrn": p.get("kmrn"), "jam": jam, "dari": dari, "jsum": jsum, "kanal": kkm, "lv": p.get("level"),
                    "tnp": tnp, **b})
    out.sort(key=lambda c: -(c["wl"][1] + c["wb"][1]))

    # ---------------- per provinsi: yang ada, OMC, polhut
    prov = {}
    nama_bn = {v: kk for kk, v in (meta.get("bnpb") or {}).items()}
    for r in (bn or {}).get("rows", []):
        kd = nama_bn.get(r["Provinsi"])
        num = lambda v: v if isinstance(v, (int, float)) else 0  # noqa: E731
        if kd:
            prov.setdefault(kd, {})["ada"] = {"personel": num(r.get("Total Personel")), "wb": num(r.get("WB unit")), "omc": num(r.get("OMC unit")),
                "patroli_udara": num(r.get("Patroli unit")), "belum_padam_ha": round(num(r.get("luas lahan yang akan dipadamkan")), 1),
                "rinci": {x: num(r.get(x)) for x in ("Manggala Agni", "MPA", "TNI", "Polri", "personil BPBD", "Perusahaan", "Pemda", "Satpol PP")},
                "sumber": "BNPB harian " + (bn.get("updatedAt") or "")[:10]}
    for d in dop:
        x = prov.setdefault(d["prov"], {}).setdefault("daops", {"n": 0, "regu": 0, "anggota": 0, "nama": []})
        x["n"] += 1; x["regu"] += d.get("regu") or 0; x["anggota"] += d.get("anggota") or 0; x["nama"].append(d["nama"])
    if ans:
        per = {}
        for g in ans.get("grid", []):
            per.setdefault(g["prov"], []).append(g["ph"])
        for kd, L in per.items():
            hari = []
            for i, t in enumerate(ans["hari"]):
                v = [x[i] for x in L if x[i] is not None]
                m = sum(v) / len(v) if v else 0
                if k("omc_ph", 1) <= m <= 0.6:
                    hari.append(t)
            prov.setdefault(kd, {})["omc"] = {"hari": hari, "dari": ans["hari"]}
    if prev:
        rw = {}
        for key, v in prev["kec"].items():
            rw[key.split("|")[0]] = rw.get(key.split("|")[0], 0) + v["petak"] * 100
        for kd, ha in rw.items():
            prov.setdefault(kd, {})["polhut"] = {"rawan_ha": ha, "butuh": [round(ha / (k("polhut_ha_hari", s) * k("polhut_siklus", s)) * k("polhut_regu", s) * k("polhut_kerja", s)) for s in range(3)]}
    for c in out:  # konsesi: regu yang wajib diturunkan perusahaan sendiri
        if c["kaw"] == "konsesi":
            x = prov.setdefault(c["prov"], {}).setdefault("konsesi", {"kompleks": 0, "jenis": {}})  # per jenis areal, tanpa nama pemegang
            x["kompleks"] += 1; x["jenis"][c["pj"]] = x["jenis"].get(c["pj"], 0) + 1
    for x in prov.values():
        if "konsesi" in x:
            x["konsesi"]["jenis"] = sorted(x["konsesi"]["jenis"].items(), key=lambda a: -a[1])

    px_tot = sum(c["px"] for c in out)
    px_gb = sum(c["px"] for c in out if c["ps"] >= 0.5)
    rek = {"kompleks": len(out), "kompleks_front": sum(1 for c in out if c["front"][1] > 0), "kompleks_bara": sum(1 for c in out if c["bara"][1] > 0),
           "px24": px_tot, "px24_gambut": px_gb, "ha_piksel": round(px_tot * PX_KM2 * 100), "bara_ha": [round(sum(c["bara"][s] for c in out)) for s in range(3)],
           "belum_padam_resmi": sum((res or {}).get("belum_padam_ha", {}).values()) if res else None}
    if rek["belum_padam_resmi"] and px_tot:
        rek["ha_per_piksel_setara_resmi"] = round(rek["belum_padam_resmi"] / px_tot, 2)

    hasil = {"dibuat": dt.datetime.now(WIB).strftime("%Y-%m-%dT%H:%M+07:00"), "per": meta.get("hari_wib"), "data_terakhir": meta.get("data_terakhir"),
             "catatan": "Perkiraan perencanaan dari citra satelit dan koefisien terbuka; bukan perintah operasi. Beban kerja dalam regu-hari; halaman membaginya dengan target hari.",
             "koef": KOEF, "rekonsiliasi": rek, "prov": prov, "kompleks": out,
             "ringkas_T3": {s: total(out, 3, i) for s, i in S.items()}}
    json.dump(hasil, open(os.path.join(DATA, "operasi.json"), "w"), ensure_ascii=False, separators=(",", ":"))
    t = hasil["ringkas_T3"]["tengah"]
    print(f"operasi.json: {len(out)} kompleks; T=3 tengah: {t['regu']} regu, {t['personel']} personel, {t['pompa']} pompa, {t['bor']} titik bor, {t['heli']} heli")


# ---------------------------------------------------------------- uji
def uji():
    p0 = {"prov": "62", "px24": 50, "kmrn": 40, "ini": 50, "isi": 9, "luas": 2000, "teramati": True}
    kel = 20

    def kom(**ub):
        p = {**p0, **ub}
        _, b = beban(p, kel, ub.get("ps", 1.0), ub.get("jam", 3), 2.0)
        return {"ps": ub.get("ps", 1.0), **b}

    # 1. luas nol => kebutuhan nol
    z = kom(px24=0, luas=0, teramati=False)
    for T in range(1, 15):
        b = kebutuhan(z, T)
        assert all(v == 0 for v in b.values()), f"luas nol tetapi butuh {b}"
    # 2. lebih banyak piksel aktif / luas => tidak pernah lebih sedikit regu
    for s in range(3):
        for T in range(1, 15):
            prev = -1
            for px in (0, 1, 5, 20, 80, 300, 1000):
                r = total([kom(px24=px, luas=max(14, px * 14))], T, s)["regu"]
                assert r >= prev, f"px {px} T {T} s {s}: regu {r} < {prev} (lebih luas tapi lebih sedikit regu)"
                prev = r
    # 3. T lebih panjang => tidak lebih banyak regu; T=14 harus jauh lebih kecil dari T=1 untuk kompleks besar
    c = kom(px24=300, luas=8000)
    seri = [total([c], T)["regu"] for T in range(1, 15)]
    assert all(a >= b for a, b in zip(seri, seri[1:])), f"T lebih panjang menambah regu: {seri}"
    assert seri[-1] < seri[0], f"T=14 tidak lebih sedikit dari T=1: {seri}"
    # 4. skenario: pesimis >= tengah >= optimis
    for T in (1, 3, 7, 14):
        for x in ("regu", "pompa", "bor", "heli"):
            o, m, p = (total([c, kom(px24=300, luas=8000, jam=None)], T, s)[x] for s in range(3))
            assert o <= m <= p, f"urutan skenario {x} salah T={T}: {o} {m} {p}"
    # 5. tanah mineral tidak butuh titik bor; WB hanya bila tak terjangkau
    mn = kom(ps=0.0, jam=2)
    assert kebutuhan(mn, 3)["bor"] == 0 and kebutuhan(mn, 3)["regu_bara"] == 0, "mineral diberi titik bor/mop-up gambut"
    assert kebutuhan(kom(jam=2), 3)["heli"] == 0, "heli diminta padahal regu tiba 2 jam"
    assert total([kom(jam=12)], 3)["heli"] >= 1, "kompleks 12 jam tanpa heli"
    assert total([kom(jam=None)], 3)["heli"] >= 1, "kompleks tanpa rute tanpa heli"
    # 6. koefisien lengkap
    for n, v in KOEF.items():
        assert {"lo", "mid", "hi", "satuan", "sumber", "arti"} <= set(v), f"koefisien {n} tidak lengkap"
    # 7. kesetaraan dengan operasi.js (bila node ada)
    js = os.path.join(AKAR, "public/operasi.js")
    if shutil.which("node") and os.path.exists(js):
        kas = [kom(px24=px, luas=max(14, px * 14), ps=ps, jam=j) for px in (0, 3, 60, 400) for ps in (0.0, 1.0) for j in (2, None)]
        kas = [x for x in kas if any(x["wl"]) or any(x["wb"])]
        harap = [[total(kas, T, s) for s in range(3)] for T in range(1, 15)]
        prog = ("const fs=require('fs'),vm=require('vm'),ctx={console,Math,JSON};vm.createContext(ctx);"
                "vm.runInContext(fs.readFileSync(process.argv[1],'utf8'),ctx);const H=ctx.OperasiHitung,d=JSON.parse(fs.readFileSync(0,'utf8'));"
                "H.koef=d.koef;const r=[];for(let T=1;T<=14;T++)r.push([0,1,2].map(s=>H.total(d.kas,T,s)));console.log(JSON.stringify(r));")
        o = subprocess.run(["node", "-e", prog, js], input=json.dumps({"koef": KOEF, "kas": kas}), capture_output=True, text=True, timeout=60)
        assert o.returncode == 0, "node gagal: " + o.stderr[-400:]
        dapat = json.loads(o.stdout)
        for T in range(14):
            for s in range(3):
                for x in ("regu", "personel", "pompa", "selang", "bor", "heli"):
                    assert dapat[T][s][x] == harap[T][s][x], f"JS != Python T={T + 1} s={s} {x}: {dapat[T][s][x]} vs {harap[T][s][x]}"
        print("kesetaraan operasi.js ok")
    else:
        print("node tidak ada: uji kesetaraan JS dilewati")
    print("uji ok")


if __name__ == "__main__":
    uji() if sys.argv[1:] == ["uji"] else main()
