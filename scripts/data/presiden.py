"""Panel karhutla untuk dashboard presiden -> public/data/presiden/{semua,indeks,<id>}.json

Kontrak: docs/presiden/KONTRAK.md. Semua dihitung dari JSON yang sudah ada di public/data, TANPA jaringan.
Tiap widget dibangun satu fungsi w_<id>(c) yang dibungkus try/except di rakit(): widget gagal menjadi status "kosong"
dengan catatan alasannya, tidak menjatuhkan skrip. "basi" = ada sumber yang umurnya melewati ambang di WAKTU.
Persen di kolom jenis "persen" dan di angka[].ubah ditulis sebagai angka persen biasa (159 = 159%).

Pakai:  python3 scripts/data/presiden.py          # tulis public/data/presiden/*
        python3 scripts/data/presiden.py --uji    # self-check (direktori sementara)
Dipanggil juga di akhir laporan.py (titik.yml, 3 jam).
"""
import datetime as dt, json, math, os, re, sys, tempfile

sys.path.insert(0, os.path.dirname(__file__))
from laporan import baca, DATA, WIB, BULAN  # noqa: E402  (pembaca JSON + zona waktu yang sama dengan laporan harian)

KELUAR = os.path.join(DATA, "presiden")
VERSI = "presiden/1"
IDS = ["situasi", "provinsi", "kejadian", "konsesi", "gambut", "cuaca", "asap", "penerbangan", "sumberdaya", "dampak",
       "luas", "berulang", "pencegahan", "peringatan", "kesegaran"]
BARIS_MAKS, ANGKA_MAKS = 10, 4
# kecamatan "langganan": terbakar (>= TITIK_TAHUN titik di setahun) pada >= MIN_ULANG tahun lalu, dan >= MIN_INI titik tahun ini
TITIK_TAHUN, MIN_ULANG, MIN_INI = 20, 5, 50
T_OPERASI = 3   # hari target penanganan untuk kebutuhan regu (sama dengan ringkas_T3 di operasi.json)


# ---------------------------------------------------------------- format & waktu
def fid(n, d=0):
    """format angka Indonesia: 1.227.970 / 4,3"""
    s = f"{abs(n):,.{d}f}".replace(",", "X").replace(".", ",").replace("X", ".")
    return ("-" if n < 0 else "") + s


def K(x):
    return f"[[{x}]]"


def iso(t):
    return t.astimezone(WIB).strftime("%Y-%m-%dT%H:%M+07:00")


def waktu(s):
    """teks tanggal/waktu -> datetime sadar zona. Tanggal saja = akhir hari WIB (data 'sampai' hari itu); 'YYYY-MM' = akhir bulan."""
    s = str(s).replace("Z", "+00:00")
    if re.fullmatch(r"\d{4}-\d{2}", s):
        a = dt.date(int(s[:4]), int(s[5:]), 28) + dt.timedelta(days=4)
        return dt.datetime.combine(a.replace(day=1) - dt.timedelta(days=1), dt.time(23, 59), WIB)
    if re.fullmatch(r"\d{4}-\d{2}-\d{2}", s):
        return dt.datetime.combine(dt.date.fromisoformat(s), dt.time(23, 59), WIB)
    t = dt.datetime.fromisoformat(s)
    return t if t.tzinfo else t.replace(tzinfo=WIB)


def tgl(d):
    return f"{d.day} {BULAN[d.month - 1]} {d.year}"


def ubah(a, b):
    return None if not b else round((a - b) / b * 100, 1)


BULAN_PENUH = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"]


def bulat(x, sig=2):
    """pembulatan jujur untuk perkiraan model: `sig` angka penting; judul dan angka[] memakai hasil yang SAMA"""
    if not x:
        return 0
    r = round(x, sig - 1 - int(math.floor(math.log10(abs(x)))))
    return int(r) if abs(r) >= 100 else r


def tg(c, nama):
    """tanggal (WIB) data sumber `nama`, dari tabel WAKTU"""
    return c.umur(nama)[0].astimezone(WIB).date()


def idx_kabisat(d):
    """indeks hari kalender kabisat (0 = 1 Jan, 59 = 29 Feb), cara latar di musim_harian.json"""
    return (dt.date(2000, d.month, d.day) - dt.date(2000, 1, 1)).days


# (label, ambang umur dalam jam, penarik waktu data dari isi berkas)
WAKTU = {
    "titik24": ("Titik panas 24 jam", 12, lambda j, c: j["acuan"]),
    "meta": ("Ringkasan harian", 30, lambda j, c: j["data_terakhir"]),
    "laporan": ("Laporan harian", 12, lambda j, c: j["dibuat"]),
    "musim_harian": ("Kurva musim", 60, lambda j, c: j["sd"]),
    "kumulatif": ("Titik panas kumulatif", 60, lambda j, c: j["sd"]),
    "kluster": ("Kejadian api", 30, lambda j, c: c.diam("meta")["data_terakhir"]),
    "kompleks_konsesi": ("Titik di areal izin", 30, lambda j, c: j["acuan"]),
    "kendala": ("Kendala akses", 72, lambda j, c: j["per"]),
    "khg_prioritas": ("Kawasan hidrologis gambut", 72, lambda j, c: j["per"]),
    "operasi": ("Rencana operasi", 30, lambda j, c: j["data_terakhir"]),
    "peluang": ("Peluang cuaca api", 36, lambda j, c: j["dibuat"]),
    "iklim_outlook": ("Prakiraan iklim", 240, lambda j, c: j["dibuat"]),
    "udara_dampak": ("Paparan asap", 36, lambda j, c: j["dibuat"]),
    "penerbangan": ("Gangguan bandara", 36, lambda j, c: j["dibuat"]),
    "dampak": ("Dampak musim", 36, lambda j, c: j["dibuat"]),
    "luas_resmi": ("Luas terbakar SiPongi", 24 * 100, lambda j, c: j["sampai"][max(j["sampai"])]),
    "sejarah": ("Riwayat titik panas", 24 * 60, lambda j, c: j["dibuat"]),
    "preventif": ("Paket pencegahan", 24 * 60, lambda j, c: j["dibuat"]),
    "peringatan": ("Peringatan BMKG", 12, lambda j, c: j["dibuat"]),
    "aktor_karhutla": ("Perusahaan dan titik panas", 240, lambda j, c: j["periode"]["terkini"]["acuan"]),
}


class Kosong(Exception):
    """alasan widget dikosongkan dengan sengaja"""


class Ctx:
    def __init__(s, dasar, sekarang):
        s.dasar, s.sekarang, s.cache, s.dipakai = dasar, sekarang, {}, set()

    def diam(s, nama):
        """baca tanpa dihitung sebagai sumber widget (untuk nama provinsi dan sejenisnya)"""
        if nama not in s.cache:
            s.cache[nama] = baca(nama + ".json", s.dasar)
        if s.cache[nama] is None:
            raise Kosong(f"{nama}.json tidak ada atau rusak")
        return s.cache[nama]

    def j(s, nama):
        r = s.diam(nama)
        s.dipakai.add(nama)
        return r

    def prov(s, kode):
        try:
            return s.diam("meta")["provinsi"].get(str(kode), str(kode))
        except Kosong:
            return str(kode)

    def umur(s, nama):
        """-> (waktu data, umur jam) atau None bila berkas tanpa cap waktu"""
        if nama not in WAKTU:
            return None
        t = waktu(WAKTU[nama][2](s.diam(nama), s))
        return t, (s.sekarang - t).total_seconds() / 3600


def tindak(*pasang):
    return [{"siapa": a, "apa": b} for a, b in pasang]


def kol(k, label, jenis="teks"):
    return {"k": k, "label": label, "jenis": jenis}


def angka(label, nilai, satuan, ub=None):
    return {"label": label, "nilai": nilai, "satuan": satuan, "ubah": ub}


# ---------------------------------------------------------------- bahan bersama
def prov_7hari(c):
    """-> (sd, [(kode, 7 hari terakhir, 7 hari sebelumnya)] urut turun) dari musim_harian.json"""
    m = c.j("musim_harian")
    sd = dt.date.fromisoformat(m["sd"])
    out = []
    for kode, d in m["prov"].items():
        s = d[str(sd.year)]
        out.append((kode, sum(s[-7:]), sum(s[-14:-7])))
    out.sort(key=lambda x: -x[1])
    return sd, out


def cuaca_prov(c):
    """-> ({kode: (maks bagian sel FWI>=7, maks bagian sel FWI>=14, maks FWI median)}, jumlah hari, tanggal hari pertama) dari peluang.json; hanya tingkat provinsi"""
    p = c.j("peluang")
    w0 = next(iter(p["wilayah"].values()))["hari"]
    return {k: (max(h["p"][0] for h in w["hari"]), max(h["p"][1] for h in w["hari"]), max(h["p50"] for h in w["hari"]))
            for k, w in p["wilayah"].items() if w.get("tingkat") == "provinsi"}, len(w0), dt.date.fromisoformat(w0[0]["t"])


def label_cuaca(pt, ps):
    if ps >= 0.25:
        return "Sangat tinggi"
    if pt >= 0.25:
        return "Tinggi"
    return "Di bawah ambang"


# ---------------------------------------------------------------- widget
def w_situasi(c):
    m, k = c.j("musim_harian"), c.j("kumulatif")
    sd = dt.date.fromisoformat(m["sd"])
    seri = m["nasional"][str(sd.year)]
    latar = m["latar"]["nasional"]
    biasa = latar[idx_kabisat(sd)]
    n = k["nasional"]
    rer, ini = n["banding"]["rerata"], n["ini"]
    p15 = k["setara_2015"]["nasional"]["banding"]["2015"]
    rasio = ini / rer["titik"]
    sd_k = dt.date.fromisoformat(k["sd"])
    hari = [sd - dt.timedelta(days=i) for i in range(29, -1, -1)]
    mulai = len(seri) - 30
    top = prov_7hari(c)[1][0][0]
    return dict(
        judul=f"Sampai {tgl(sd_k)}, titik panas {sd_k.year} sudah {K(fid(rasio, 1) + ' kali')} rata-rata {k['rerata_tahun'][0]} sampai {k['rerata_tahun'][1]} "
              f"pada waktu yang sama; dihitung dengan sensor yang sama seperti 2015 (MODIS dan S-NPP), sudah {K(str(p15['persen']) + '%')} dari tahun kebakaran besar 2015",
        angka=[angka(f"Titik panas {tgl(sd)}, dibanding median hari yang sama", seri[-1], "titik", ubah(seri[-1], biasa)),
               angka(f"Total {sd_k.year} sampai {tgl(sd_k)}, dibanding rata-rata", ini, "titik", round(rasio * 100 - 100, 1)),
               angka("2026 dibanding 2015 (MODIS dan S-NPP)", p15["persen"], "persen dari 2015")],
        grafik={"jenis": "garis", "label": [f"{d.day} {BULAN[d.month - 1]}" for d in hari],
                "seri": [{"nama": str(sd.year), "nilai": seri[mulai:]},
                         {"nama": f"Median {m['latar']['tahun'][0]} sampai {m['latar']['tahun'][-1]}",
                          "nilai": [latar[idx_kabisat(d)] for d in hari]}], "satuan": "titik per hari"},
        kolom=[kol("tahun", "Tahun pembanding"), kol("titik", "Titik panas sampai tanggal yang sama", "angka"),
               kol("persen", f"{sd_k.year} dibanding tahun itu", "persen")],
        baris=[{"tahun": t, "titik": v["titik"], "persen": v["persen"]} for t, v in n["banding"].items() if t != "rerata"]
              + [{"tahun": f"Rata-rata {k['rerata_tahun'][0]} sampai {k['rerata_tahun'][1]}", "titik": rer["titik"], "persen": rer["persen"]},
                 {"tahun": "2015 (hanya MODIS dan S-NPP)", "titik": p15["titik"], "persen": p15["persen"]}],
        tindak_lanjut=tindak(("BNPB", f"Siagakan posko dan armada udara di {c.prov(top)}, provinsi dengan titik panas terbanyak pekan ini."),
                             ("KLHK", "Perkuat patroli Manggala Agni dan penegakan hukum di areal izin yang masih menyala.")),
        sumber="NASA FIRMS (MODIS, VIIRS S-NPP, VIIRS NOAA-20)",
        catatan="Titik panas bukan luas terbakar. Pembanding 2015 hanya memakai MODIS dan VIIRS S-NPP; pembanding lain memakai semua satelit.")


def w_provinsi(c):
    sd, urut = prov_7hari(c)
    cu, hh, _ = cuaca_prov(c)
    baris = []
    for kode, t7, tp in urut[:BARIS_MAKS]:
        pt, ps, _ = cu.get(kode, (None, None, None))
        baris.append({"prov": c.prov(kode), "t7": t7, "ubah": ubah(t7, tp),
                      "cuaca": "Tidak dicakup" if pt is None else label_cuaca(pt, ps)})
    kode, t7, tp = urut[0]
    ub = ubah(t7, tp)
    arah = "" if ub is None else f", {'naik' if ub >= 0 else 'turun'} {fid(abs(ub), 1)}% dari 7 hari sebelumnya"
    naik = sum(1 for _, a, b in urut if b and a > b)
    tot7, tot_p = sum(a for _, a, _ in urut), sum(b for _, _, b in urut)
    return dict(
        judul=f"{K(c.prov(kode))} paling mendesak, {K(fid(t7))} titik panas tercatat dalam 7 hari sampai {tgl(sd)}{arah}",
        angka=[angka(f"Titik panas 7 hari, {c.prov(kode)}", t7, "titik", ub),
               angka("Titik panas 7 hari, seluruh Indonesia", tot7, "titik", ubah(tot7, tot_p)),
               angka("Provinsi dengan titik panas naik", naik, "provinsi")],
        kolom=[kol("prov", "Provinsi"), kol("t7", "Titik panas 7 hari", "angka"), kol("ubah", "Dibanding 7 hari sebelumnya", "persen"),
               kol("cuaca", f"Cuaca api {hh} hari ke depan", "pill")],
        baris=baris,
        tindak_lanjut=tindak((f"Gubernur {c.prov(urut[0][0])}", "Tetapkan atau pertahankan status siaga darurat karhutla dan aktifkan posko provinsi."),
                             ("BNPB", f"Kirim dukungan ke {c.prov(urut[1][0])} dan {c.prov(urut[2][0])}, dua provinsi berikutnya.")),
        sumber="NASA FIRMS (titik panas harian per provinsi), ECMWF ansambel lewat Open-Meteo dan sistem FWI Kanada (cuaca api)",
        catatan="Cuaca api hanya tersedia untuk provinsi yang sering mengalami karhutla; 'Sangat tinggi' bila seperempat wilayah atau lebih diperkirakan FWI 14 ke atas, 'Tinggi' bila FWI 7 ke atas.")


def gambut_kejadian(c, p, kk, op):
    g = kk.get(p["id"], {}).get("gambut")
    if g is not None:
        return g >= 0.5
    return op.get(p["id"]) == "gambut"


def w_kejadian(c):
    kl, kk, kend = c.j("kluster"), c.j("kompleks_konsesi")["kompleks"], c.j("kendala")["kompleks"]
    op = {x["id"]: x["jenis"] for x in c.j("operasi")["kompleks"]}
    aktif = [f["properties"] for f in kl["features"] if f["properties"].get("n24", 0) > 0]
    aktif.sort(key=lambda p: -p["luas"])
    if not aktif:
        raise Kosong("tidak ada kejadian api dengan titik 24 jam terakhir")
    ngambut = sum(1 for p in aktif if gambut_kejadian(c, p, kk, op))
    nsulit = sum(1 for p in aktif if kend.get(p["id"], {}).get("label"))
    baris, sulit = [], []
    for p in aktif[:BARIS_MAKS]:
        lab = kend.get(p["id"], {}).get("label")
        if lab:
            sulit.append(p)
        baris.append({"kejadian": f"{p['kec']}, {p['kab']}", "prov": c.prov(p["prov"]), "luas": round(p["luas"]), "titik24": p["n24"],
                      "gambut": "Gambut" if gambut_kejadian(c, p, kk, op) else "Bukan gambut",
                      "akses": ", ".join(lab) if lab else "Tanpa kendala tercatat"})
    t = aktif[0]
    d = tg(c, "kluster")
    return dict(
        judul=f"{K(fid(len(aktif)))} kejadian api tercatat sampai {tgl(d)}, terbesar di {t['kec']}, {t['kab']} dengan sebaran titik sekitar {K(fid(bulat(t['luas'])) + ' ha')}",
        angka=[angka("Kejadian api tercatat", len(aktif), "kejadian"), angka("Di lahan gambut", ngambut, "kejadian"),
               angka("Dengan kendala akses", nsulit, "kejadian")],
        kolom=[kol("kejadian", "Kecamatan"), kol("prov", "Provinsi"), kol("luas", "Sebaran titik (ha)", "angka"),
               kol("titik24", f"Titik panas 24 jam sampai {tgl(d)}", "angka"), kol("gambut", "Lahan", "pill"), kol("akses", "Akses")],
        baris=baris,
        tindak_lanjut=tindak(("BNPB", f"Kirim water bombing lebih dulu ke {len(sulit)} dari {len(baris)} kejadian terbesar yang sulit dijangkau darat."
                                      if sulit else "Pantau 10 kejadian terbesar; semuanya tanpa kendala akses tercatat, cukup andalkan regu darat."),
                             ("Manggala Agni", f"Kirim regu darat ke {len(baris) - len(sulit)} kejadian terbesar yang jalannya terjangkau." if len(baris) > len(sulit)
                              else f"Buka jalur akses dan bangun pos lanjutan dekat {t['kec']} sebelum regu darat masuk.")),
        sumber="NASA FIRMS (kejadian api dari titik panas berdekatan), peta gambut dan izin, OpenStreetMap (akses)",
        catatan="Kejadian api = titik panas berdekatan 7 hari. Luas adalah sebaran titik, bukan luas terbakar. Kendala akses perkiraan dari peta OpenStreetMap.")


def w_konsesi(c):
    a = c.j("aktor_karhutla")
    kk = c.j("kompleks_konsesi")
    terkini = lambda p: (p.get("cek") or {}).get("titik_terkini") or 0
    # urut menurut pengukuran kita (titik VIIRS 7 hari di dalam batas izin); yang 0 titik hanya mengisi bila baris kurang
    ps = sorted(a["perusahaan"], key=lambda p: (-terkini(p), -(p.get("peringkat") or 0)))
    if not ps or not terkini(ps[0]):
        raise Kosong("tidak ada perusahaan dengan titik 7 hari di dalam batas izin")
    JENIS = {"sawit": "Sawit", "pbph": "Hutan tanaman atau alam"}
    baris = [{"nama": p["nama"], "terkini": terkini(p), "jenis": JENIS.get(p["jenis"], p["jenis"]),
              "wilayah": ", ".join(x for x in (p.get("kab"), p.get("prov")) if x)} for p in ps[:BARIS_MAKS]]
    t = ps[0]
    jn = {x["jenis"]: x["n"] for x in kk["jenis"]}
    tot = kk["total"]["konsesi"]
    return dict(
        judul=f"Indikasi: {K(fid(tot))} titik panas berada di dalam batas izin dalam 7 hari sampai {tgl(tg(c, 'kompleks_konsesi'))}, terbanyak di areal {K(t['nama'])} ({K(fid(terkini(t)) + ' titik')})",
        angka=[angka("Titik di dalam batas izin (7 hari)", tot, "titik"),
               angka("Di areal sawit", jn.get("sawit", 0), "titik"), angka("Di areal hutan tanaman", jn.get("hti", 0), "titik")],
        kolom=[kol("nama", "Perusahaan"), kol("terkini", "Titik 7 hari terakhir di dalam batas izin", "angka"),
               kol("jenis", "Jenis izin", "pill"), kol("wilayah", "Wilayah")],
        baris=baris,
        tindak_lanjut=tindak(("KLHK Gakkum", f"Verifikasi lapangan ke areal {t['nama']} dan {ps[1]['nama'] if len(ps) > 1 else 'perusahaan berikutnya'}."),
                             ("ATR/BPN", "Cocokkan batas izin terbaru dengan titik panas sebelum langkah hukum.")),
        sumber="Batas izin Kemenhut via GFW dan Trase, titik panas NASA FIRMS VIIRS",
        catatan="Indikasi titik panas di dalam batas izin, bukan penetapan pelaku. Batas izin berumur (sawit dan HPH sekitar 2014) dan bisa sudah berubah.")


def w_gambut(c):
    j = c.j("khg_prioritas")
    ks = sorted((k for k in j["khg"] if k["titik_7h"] > 0), key=lambda k: -k["titik_7h"])
    if not ks:
        raise Kosong("tidak ada KHG dengan titik panas 7 hari")
    tot = sum(k["titik_7h"] for k in j["khg"])
    t = ks[0]
    return dict(
        judul=f"{K(t['nama'])} paling banyak titik panas, {K(fid(t['titik_7h']) + ' titik')} dalam 7 hari sampai {tgl(dt.date.fromisoformat(j['jendela_7h'][1]))}",
        angka=[angka("Titik panas 7 hari di semua KHG", tot, "titik"), angka("KHG yang bertitik panas", len(ks), "KHG"),
               angka("Titik panas 7 hari di KHG teratas", t["titik_7h"], "titik")],
        kolom=[kol("nama", "KHG"), kol("prov", "Provinsi"), kol("t7", "Titik 7 hari", "angka"), kol("t30", "Titik 30 hari", "angka"),
               kol("aktif", "Kejadian api tercatat", "angka"), kol("kanal", "Kanal (km)", "angka")],
        baris=[{"nama": k["nama"], "prov": k["prov_nama"], "t7": k["titik_7h"], "t30": k["titik_30h"], "aktif": k["kompleks_aktif"],
                "kanal": round(k["kanal_km"])} for k in ks[:BARIS_MAKS]],
        tindak_lanjut=tindak(("BRGM", f"Basahi gambut dan pasang sekat kanal di {t['nama']} lebih dulu ({fid(t['kanal_km'])} km kanal)."),
                             (f"Gubernur {t['prov_nama']}", "Larang pembukaan lahan dengan api di KHG ini sampai hujan turun.")),
        sumber="BRGM PRIMS (poligon KHG), NASA FIRMS (titik panas), OpenStreetMap (kanal)",
        catatan="Poligon KHG disederhanakan untuk tampilan, titik dekat tepi bisa masuk atau keluar secara keliru.")


def w_cuaca(c):
    cu, hh, d0 = cuaca_prov(c)
    io = c.j("iklim_outlook")
    ks = sorted(cu, key=lambda k: -(cu[k][1] * 10 + cu[k][0]))
    if not ks:
        raise Kosong("peluang.json tanpa provinsi")
    sangat = [k for k in ks if cu[k][1] >= 0.5]
    roni, dmi = io["keadaan_sekarang"]["roni"]["nilai"], io["keadaan_sekarang"]["dmi"]
    bln = c.sekarang.strftime("%Y-%m")
    pk = next((p for p in io["prakiraan"] if p["bulan_tengah"] == bln), io["prakiraan"][0])
    w = pk["wilayah"].get("kalbar_kalteng", {}).get("anom_pct")
    enso = "El Niño" if roni >= 0.5 else "La Niña" if roni <= -0.5 else "ENSO netral"
    iod = "IOD positif" if dmi >= 0.4 else "IOD negatif" if dmi <= -0.4 else "IOD netral"
    nama = lambda k: c.prov(k)
    ang = [angka("Provinsi dengan separuh wilayah lebih FWI sangat tinggi", len(sangat), "provinsi"),
           angka("RONI (Pasifik)", roni, f"°C, {enso}"), angka("DMI (Samudra Hindia)", dmi, f"°C, {iod}")]
    if w is not None:
        ang.append(angka(f"Perkiraan hujan {pk['label'].replace(' - ', ' sampai ')}, Kalimantan Barat dan Tengah", abs(w),
                         "persen di bawah normal" if w < 0 else "persen di atas normal"))
    return dict(
        judul=f"{K(str(len(sangat)) + ' provinsi')} diperkirakan separuh wilayahnya berbahaya api sangat tinggi dalam {hh} hari dari {tgl(d0)}, "
              f"dan {enso} dengan {iod} diperkirakan membuat musim lebih kering",
        angka=ang[:ANGKA_MAKS],
        kolom=[kol("prov", "Provinsi"), kol("sangat", "Wilayah FWI 14 ke atas", "persen"), kol("tinggi", "Wilayah FWI 7 ke atas", "persen"),
               kol("fwi", "FWI tengah puncak", "angka")],
        baris=[{"prov": nama(k), "sangat": round(cu[k][1] * 100), "tinggi": round(cu[k][0] * 100), "fwi": round(cu[k][2], 1)} for k in ks[:BARIS_MAKS]],
        tindak_lanjut=tindak(("BMKG", f"Semai awan (modifikasi cuaca) di {nama(ks[0])} dan {nama(ks[1]) if len(ks) > 1 else 'wilayah rawan'} bila awan hujan tersedia."),
                             ("BNPB", f"Siapkan pasokan air dan helikopter di {', '.join(nama(k) for k in ks[:3])}.")),
        sumber="ECMWF IFS ansambel 51 anggota lewat Open-Meteo dan sistem FWI Kanada; CHIRPS (UCSB) dan NOAA (RONI, DMI)",
        catatan="Peluang dihitung sebagai bagian wilayah yang melewati ambang FWI, bukan peluang adanya api. Keandalannya belum diuji terhadap kejadian titik panas.")


def w_asap(c):
    u = c.j("udara_dampak")
    hari = u["hari"]
    ref = c.sekarang.date()
    h = min(hari, key=lambda x: abs((dt.date.fromisoformat(x) - ref).days))
    i = hari.index(h)
    t = u["terpapar"][h]
    sebelum = u["terpapar"][hari[i - 1]] if i else None
    pr = sorted(t["prov"].items(), key=lambda kv: -kv[1]["penduduk"])[:BARIS_MAKS]
    d = dt.date.fromisoformat(h)
    ke_depan = d > waktu(u["dibuat"]).date()
    pend = bulat(t["penduduk"])
    kata = f"perkiraan {tgl(d)}" if ke_depan else tgl(d)
    pembanding = f", perubahan dibanding {tgl(dt.date.fromisoformat(hari[i - 1]))}" if i else ""
    return dict(
        judul=f"Sekitar {K(fid(pend / 1e6) + ' juta')} penduduk tinggal di kecamatan dengan PM2,5 tidak sehat ({kata}, perkiraan model)",
        angka=[angka(f"Penduduk terpapar (perkiraan){pembanding}", pend, "orang", ubah(t["penduduk"], sebelum and sebelum["penduduk"])),
               angka(f"Siswa terpapar (perkiraan){pembanding}", bulat(t["siswa"]), "siswa", ubah(t["siswa"], sebelum and sebelum["siswa"])),
               angka(f"Fasilitas kesehatan terpapar (perkiraan){pembanding}", bulat(t["faskes"]), "fasilitas", ubah(t["faskes"], sebelum and sebelum["faskes"]))],
        kolom=[kol("prov", "Provinsi"), kol("penduduk", "Penduduk", "angka"), kol("siswa", "Siswa", "angka"), kol("faskes", "Fasilitas kesehatan", "angka")],
        baris=[{"prov": c.prov(k), "penduduk": v["penduduk"], "siswa": v.get("siswa"), "faskes": v.get("faskes")} for k, v in pr],
        tindak_lanjut=tindak(("Kemenkes", f"Bagikan masker dan siagakan layanan ISPA di {c.prov(pr[0][0])} dan provinsi terpapar lain."),
                             ("Kemendikdasmen", "Izinkan belajar dari rumah di sekolah pada kecamatan terpapar sampai udara membaik.")),
        sumber="CAMS (Copernicus) lewat Open-Meteo, WorldPop 2026, Dapodik dan EMIS (sekolah), OpenStreetMap (fasilitas kesehatan)",
        catatan=f"Perkiraan model, belum dikoreksi stasiun{'; tanggal ini perkiraan ke depan, bukan pengukuran' if ke_depan else ''}. Batas tidak sehat {fid(u['batas'], 1)} mikrogram per meter kubik. "
                f"Sekolah dan fasilitas kesehatan hanya terpetakan di {t['kec_tercakup_sekolah']} dari {t['kec']} kecamatan terpapar, jadi angkanya batas bawah.")


def per_bandara(ks):
    """{kode bandara: {n, j: {jenis: n}, akhir}}; berita tanpa bandara jelas tetap masuk total di pemanggil, tidak masuk sini"""
    per = {}
    for k in ks:
        if not k["bandara"]:
            continue
        q = per.setdefault(k["bandara"], {"n": 0, "j": {}, "akhir": ""})
        q["n"] += 1
        q["akhir"] = max(q["akhir"], k["tgl"])
        for jn in k["jenis"]:
            q["j"][jn] = q["j"].get(jn, 0) + 1
    return per


def w_penerbangan(c):
    p = c.j("penerbangan")
    ks = p["kejadian"]
    if not ks:
        raise Kosong("tidak ada kejadian tercatat")
    ref = max(dt.date.fromisoformat(k["tgl"]) for k in ks)
    dalam = lambda k, a, b: a <= (ref - dt.date.fromisoformat(k["tgl"])).days <= b
    n7, n14 = sum(1 for k in ks if dalam(k, 0, 6)), sum(1 for k in ks if dalam(k, 7, 13))
    per = per_bandara(ks)
    urut = sorted(per.items(), key=lambda kv: -kv[1]["n"])
    nj = p["nama_jenis"]
    nama = lambda kode: p["bandara"].get(kode, {}).get("nama", kode)
    mulai = dt.date.fromisoformat(p["mulai_musim"])
    return dict(
        judul=f"Berita mencatat {K(fid(len(ks)))} gangguan penerbangan yang dikaitkan dengan asap sejak {tgl(mulai)} sampai {tgl(ref)}, terbanyak di {nama(urut[0][0])}",
        angka=[angka("Gangguan musim ini", len(ks), "kejadian"), angka(f"Gangguan 7 hari sampai {tgl(ref)}", n7, "kejadian", ubah(n7, n14)),
               angka("Bandara terdampak", len(per), "bandara"), angka("Penerbangan dibatalkan", sum(1 for k in ks if "batal" in k["jenis"]), "kejadian")],
        kolom=[kol("bandara", "Bandara"), kol("n", "Gangguan", "angka"), kol("jenis", "Jenis terbanyak", "pill"), kol("akhir", "Terakhir")],
        baris=[{"bandara": f"{nama(k)} ({k})", "n": v["n"], "jenis": nj.get(max(v["j"], key=v["j"].get), "Terganggu"), "akhir": tgl(dt.date.fromisoformat(v["akhir"]))}
               for k, v in urut[:BARIS_MAKS]],
        tindak_lanjut=tindak(("Kemenhub", f"Siapkan bandara alternatif dan prosedur jarak pandang rendah di {nama(urut[0][0])}."),
                             ("BMKG", "Kirim prakiraan jarak pandang tiap 6 jam ke otoritas bandara yang paling sering terganggu.")),
        sumber="Judul berita Google News, METAR lewat Iowa Environmental Mesonet",
        catatan="Disusun dari judul berita, bukan data resmi bandara atau maskapai, jadi angkanya batas bawah.")


def w_sumberdaya(c):
    import operasi
    op, po = c.j("operasi"), c.j("posko")
    for nm, v in op["koef"].items():   # pakai koefisien yang sudah terkalibrasi di berkas, bukan bawaan modul
        if nm in operasi.KOEF:
            operasi.KOEF[nm].update(v)
    per = {}
    for x in op["kompleks"]:
        per.setdefault(x["prov"], []).append(x)
    if not per:
        raise Kosong("operasi.json tanpa kejadian api aktif")
    hit = {k: operasi.total(v, T_OPERASI, 1) for k, v in per.items()}
    semua = operasi.total(op["kompleks"], T_OPERASI, 1)
    nposko = {}
    for x in po["posko"]:
        nposko[x["prov"]] = nposko.get(x["prov"], 0) + 1
    urut = sorted(hit, key=lambda k: -hit[k]["personel"])
    baris, kurang = [], []
    for k in urut[:BARIS_MAKS]:
        ada = op["prov"].get(k, {}).get("ada", {}).get("personel")
        st = "Rekap belum ada" if ada is None else "Kurang" if ada < hit[k]["personel"] else "Cukup"
        if st == "Kurang":
            kurang.append(c.prov(k))
        baris.append({"prov": c.prov(k), "regu": hit[k]["regu"], "butuh": hit[k]["personel"], "ada": ada, "posko": nposko.get(k, 0), "status": st})
    return dict(
        judul=f"Menangani semua kejadian api tercatat sampai {tgl(tg(c, 'operasi'))} dalam {T_OPERASI} hari butuh sekitar {K(fid(bulat(semua['personel'])) + ' personel')} (perkiraan), terbesar di {c.prov(urut[0])}",
        angka=[angka("Regu dibutuhkan (perkiraan)", bulat(semua["regu"], 3), "regu"), angka("Personel dibutuhkan (perkiraan)", bulat(semua["personel"]), "orang"),
               angka("Helikopter water bombing dibutuhkan (perkiraan)", semua["heli"], "unit"), angka("Posko lapangan terdata", len(po["posko"]), "posko")],
        kolom=[kol("prov", "Provinsi"), kol("regu", "Regu dibutuhkan (perkiraan)", "angka"), kol("butuh", "Personel dibutuhkan (perkiraan)", "angka"),
               kol("ada", "Personel tercatat BNPB", "angka"), kol("posko", "Posko", "angka"), kol("status", "Status", "pill")],
        baris=baris,
        tindak_lanjut=tindak(("BNPB", f"Rotasikan regu ke {c.prov(urut[0])} dan {c.prov(urut[1]) if len(urut) > 1 else 'provinsi berikutnya'}, kebutuhan terbesar."),
                             ("TNI dan Polri", f"Tambah personel pendukung di {', '.join(kurang[:3])}, tercatat kurang dari kebutuhan." if kurang
                              else "Pastikan personel yang tercatat BNPB benar-benar siaga di lapangan; rekap belum ada di sebagian provinsi.")),
        sumber="Perkiraan platform dari citra NASA FIRMS dan koefisien terbuka (Permen LHK P.32/2016, NWCG), rekap personel BNPB, data posko",
        catatan=f"Kebutuhan adalah perkiraan model perencanaan skenario tengah untuk target {T_OPERASI} hari, bukan perintah operasi. "
                "Personel tercatat dari rekap BNPB yang belum diverifikasi dan hanya ada untuk sebagian provinsi.")


def w_dampak(c):
    d = c.j("dampak")
    kg, em, mu = d["kerugian"], d["emisi"], d["musim"]
    NAMA = {"pertanian": "Pertanian", "lingkungan_hayati": "Keanekaragaman hayati", "lingkungan_karbon": "Karbon",
            "kehutanan": "Kehutanan", "industri_tambang": "Industri dan tambang", "perdagangan": "Perdagangan",
            "transportasi": "Transportasi", "pariwisata": "Pariwisata", "kesehatan": "Kesehatan", "pendidikan": "Pendidikan",
            "pemadaman": "Biaya pemadaman"}
    T = 1e12
    sek = sorted(kg["sektor"].items(), key=lambda kv: -kv[1][1])[:BARIS_MAKS]
    mulai = dt.date.fromisoformat(d["mulai_musim"])
    rugi, co2 = bulat(kg["total"][1] / T), bulat(em["mt_co2e"][1], 1)
    return dict(
        judul=f"Perkiraan model: kebakaran sejak {tgl(mulai)} sampai {tgl(tg(c, 'dampak'))} merugikan sekitar {K('Rp' + fid(rugi) + ' triliun')} "
              f"(rentang Rp{fid(kg['total'][0] / T)} sampai Rp{fid(kg['total'][2] / T)} triliun) dan melepas sekitar {K(fid(co2) + ' juta ton')} CO2e",
        angka=[angka(f"Luas terbakar perkiraan sejak {tgl(mulai)} (model, beda dengan angka resmi KLHK)", bulat(mu["ha"][1]), "ha"),
               angka("Kerugian ekonomi perkiraan (tengah)", rugi, "triliun rupiah"),
               angka("Emisi perkiraan (tengah)", co2, "juta ton CO2e"),
               angka("Kerugian kesehatan perkiraan (tengah)", bulat(kg["sektor"]["kesehatan"][1] / T), "triliun rupiah")],
        kolom=[kol("sektor", "Sektor"), kol("rendah", "Rendah (triliun Rp)", "angka"), kol("tengah", "Tengah (triliun Rp)", "angka"), kol("tinggi", "Tinggi (triliun Rp)", "angka")],
        baris=[{"sektor": NAMA.get(k, k), "rendah": round(v[0] / T, 1), "tengah": round(v[1] / T, 1), "tinggi": round(v[2] / T, 1)} for k, v in sek],
        tindak_lanjut=tindak(("Bappenas", "Masukkan kerugian karhutla tahun ini ke dasar perencanaan anggaran pencegahan tahun depan."),
                             ("Kemenkeu", "Siapkan dana siap pakai untuk pemulihan di provinsi dengan kerugian terbesar.")),
        sumber="Perkiraan platform dari NASA FIRMS dan regresi KLHK SiPongi; nilai satuan Bank Dunia 2016 dan 2019; emisi gambut Rodriguez Vasquez dkk. 2021",
        catatan="Perkiraan model dengan tiga skenario, bukan kerugian yang sudah dibayar atau dicatat resmi. Luas dihitung dari titik panas MODIS sejak "
                f"{tgl(mulai)} dikali rasio hektare per titik historis (sebagian provinsi diselaraskan dengan regresi luas resmi), jadi definisinya beda dengan "
                "luas resmi KLHK dan perkiraan satelit tahun penuh. Tabel menampilkan 10 sektor terbesar.")


def w_luas(c):
    j = c.j("luas_resmi")
    th = j["tahun"]
    tot = [sum(v[i] for v in j["ha"].values()) for i in range(len(th))]
    i, ia = len(th) - 1, len(th) - 2
    sampai = waktu(j["sampai"][th[i]])
    bl = f"{BULAN[sampai.month - 1]}"
    terburuk = max(range(ia + 1), key=lambda x: tot[x])
    lap = c.j("laporan")["tahun_berjalan"]
    sd = dt.date.fromisoformat(lap["sd"])
    urut = sorted(j["ha"].items(), key=lambda kv: -kv[1][i])[:BARIS_MAKS]
    return dict(
        judul=f"KLHK mencatat {K(fid(tot[i]) + ' ha')} terbakar sampai {BULAN_PENUH[sampai.month - 1]} {sampai.year}, belum termasuk puncak kemarau; "
              f"setahun penuh {th[terburuk]} mencapai {K(fid(tot[terburuk] / 1e6, 1) + ' juta ha')}, tertinggi sejak {th[0]}",
        angka=[angka(f"{th[i]} sampai {bl} (resmi)", round(tot[i]), "ha"), angka(f"{th[ia]} setahun (resmi)", round(tot[ia]), "ha"),
               angka(f"{th[terburuk]} setahun (resmi)", round(tot[terburuk]), "ha"),
               angka(f"Perkiraan satelit {th[i]} sampai {tgl(sd)}, bukan angka resmi", bulat(lap["ha"]), "ha")],
        grafik={"jenis": "batang", "label": th[:i] + [f"{th[i]} (s.d. {bl})"], "seri": [{"nama": "Luas terbakar resmi", "nilai": [round(x) for x in tot]}], "satuan": "ha"},
        kolom=[kol("prov", "Provinsi"), kol("ini", f"{th[i]} sampai {bl}", "angka"), kol("lalu", f"{th[ia]} setahun", "angka")],
        baris=[{"prov": c.prov(k), "ini": round(v[i]), "lalu": round(v[ia])} for k, v in urut],
        tindak_lanjut=tindak(("KLHK", f"Perbarui data SiPongi {th[i]} sampai akhir kemarau; angka resmi baru sampai {BULAN_PENUH[sampai.month - 1]}."),
                             ("BNPB", "Samakan angka luas terbakar dengan KLHK sebelum dipakai untuk status darurat.")),
        sumber="KLHK SiPongi (luas resmi), perkiraan platform dari NASA FIRMS (VIIRS S-NPP)",
        catatan=f"Angka resmi {th[i]} baru sampai {BULAN_PENUH[sampai.month - 1]} dan belum mencakup puncak kemarau. Perkiraan satelit memakai titik VIIRS dikali 4,3 ha per titik dan bukan angka resmi.")


def langganan(c):
    """-> (sejarah, indeks tahun ini, [(kunci 'prov|kab|kec', titik tahun ini, tahun bertitik, rata-rata tahun lalu)] urut turun)"""
    s = c.j("sejarah")
    ini = len(s["tahun"]) - 1
    lg = []
    for kunci, v in s["kec"].items():
        ulang = sum(1 for x in v[:ini] if x >= TITIK_TAHUN)
        if v[ini] >= MIN_INI and ulang >= MIN_ULANG:
            lg.append((kunci, v[ini], ulang, sum(v[:ini]) / ini))
    lg.sort(key=lambda x: -x[1])
    return s, ini, lg


def w_berulang(c):
    s, ini, lg = langganan(c)
    th = s["tahun"]
    if not lg:
        raise Kosong("tidak ada kecamatan yang memenuhi syarat langganan")
    kd, n, ul, rata = lg[0]
    pr, kab, kec = kd.split("|")
    return dict(
        judul=f"{K(fid(len(lg)) + ' kecamatan')} langganan karhutla kembali tercatat titik panas tahun ini sampai {tgl(tg(c, 'sejarah'))}, terbesar {kec}, {kab} dengan {K(fid(n) + ' titik')} (tercatat di {ul} dari {ini} tahun)",
        angka=[angka("Kecamatan langganan kembali bertitik panas", len(lg), "kecamatan"),
               angka("Titik panas di kecamatan itu tahun ini", sum(x[1] for x in lg), "titik")],
        kolom=[kol("kec", "Kecamatan"), kol("prov", "Provinsi"), kol("ini", f"Titik {th[ini]}", "angka"),
               kol("ulang", f"Tahun bertitik panas dari {ini}", "angka"), kol("rata", "Rata-rata titik per tahun lalu", "angka")],
        baris=[{"kec": f"{k.split('|')[2]}, {k.split('|')[1]}", "prov": c.prov(k.split("|")[0]), "ini": a, "ulang": u, "rata": round(r)} for k, a, u, r in lg[:BARIS_MAKS]],
        tindak_lanjut=tindak((f"Pemda {kab}", f"Jadikan {kec} lokasi program pencegahan permanen: sekat kanal, patroli desa, dan Masyarakat Peduli Api."),
                             (f"BPBD {c.prov(pr)}", "Dirikan posko permanen di kecamatan langganan sebelum musim kemarau tahun depan.")),
        sumber="NASA FIRMS (VIIRS S-NPP) per kecamatan, batas wilayah BIG",
        catatan=f"Langganan = tercatat titik panas (paling sedikit {TITIK_TAHUN} titik setahun) pada {MIN_ULANG} tahun lalu atau lebih, dan {MIN_INI} titik atau lebih tahun ini. Titik panas bukan luas terbakar.")


def w_pencegahan(c):
    p = c.j("preventif")
    ps = sorted(p["prov"].items(), key=lambda kv: -kv[1]["biaya"][1])
    if not ps:
        raise Kosong("preventif.json tanpa provinsi")
    M = 1e9
    lo, hi = (round(sum(v["biaya"][i] for _, v in ps) / 1e12, 1) for i in (0, 1))   # satu nilai untuk judul dan angka[]
    k0, v0 = ps[0]
    return dict(
        judul=f"Pencegahan permanen di {K(str(len(ps)) + ' provinsi')} yang sering mengalami karhutla diperkirakan butuh {K('Rp' + fid(lo, 1) + ' sampai Rp' + fid(hi, 1) + ' triliun')} (data per {tgl(tg(c, 'preventif'))})",
        angka=[angka("Biaya batas bawah (perkiraan)", lo, "triliun rupiah"), angka("Biaya batas atas (perkiraan)", hi, "triliun rupiah"),
               angka("Kecamatan sasaran", sum(v["n"] for _, v in ps), "kecamatan")],
        kolom=[kol("prov", "Provinsi"), kol("n", "Kecamatan sasaran", "angka"), kol("pola", "Pola utama", "pill"),
               kol("lo", "Biaya bawah (miliar Rp)", "angka"), kol("hi", "Biaya atas (miliar Rp)", "angka"), kol("siap", "Siap sebelum")],
        baris=[{"prov": v.get("nama", c.prov(k)), "n": v["n"], "pola": max(v["pola"], key=lambda x: x[1])[0] if v["pola"] else "-",
                "lo": round(v["biaya"][0] / M), "hi": round(v["biaya"][1] / M),
                "siap": BULAN[v["tenggat"]] if v.get("tenggat") is not None else "-"} for k, v in ps[:BARIS_MAKS]],
        tindak_lanjut=tindak(("Bappenas", f"Masukkan paket pencegahan {v0.get('nama', c.prov(k0))} ke anggaran tahun depan, biaya terbesar."),
                             ("Kemendagri", f"Dorong pemda menyelesaikan '{v0['aksi'][0] if v0.get('aksi') else 'aksi prioritas'}' sebelum {BULAN[v0['tenggat']] if v0.get('tenggat') is not None else 'musim kemarau'}.")),
        sumber="NASA FIRMS MODIS 2002 sampai sekarang, peta gambut dan izin, OpenStreetMap, WorldPop, biaya satuan terbuka (BRGM, LPDS, Mongabay)",
        catatan="Perkiraan perencanaan, bukan rencana anggaran biaya. Biaya satuan dan sumbernya tertulis di dokumen paket pencegahan platform.")


SEV = {"Extreme": (4, "Luar biasa"), "Severe": (3, "Berat"), "Moderate": (2, "Sedang"), "Minor": (1, "Ringan")}


def w_peringatan(c):
    p = c.j("peringatan")
    aktif = [x for x in p["nowcast"] if waktu(x["selesai"]) >= c.sekarang and waktu(x["mulai"]) <= c.sekarang]
    aktif.sort(key=lambda x: -SEV.get(x["severity"], (0,))[0])
    kw = dict(kolom=[kol("event", "Peringatan"), kol("wilayah", "Wilayah"), kol("tingkat", "Tingkat", "pill"), kol("selesai", "Berlaku sampai")],
              sumber="BMKG (peringatan dini cuaca nowcast)",
              catatan="Peringatan dini cuaca BMKG secara umum, tidak khusus karhutla. Hujan lebat di daerah rawan api membantu pemadaman tetapi dapat memicu banjir.")
    if not aktif:
        return dict(judul=f"Sampai {tgl(tg(c, 'peringatan'))} tidak tercatat peringatan dini cuaca BMKG yang berlaku ({K('0')})", angka=[angka("Peringatan aktif", 0, "peringatan")],
                    baris=[], tindak_lanjut=tindak(("BNPB", "Pantau peringatan BMKG tiap 3 jam selama musim kemarau.")), **kw)
    t = aktif[0]
    return dict(
        judul=f"{K(str(len(aktif)) + ' peringatan dini')} cuaca BMKG berlaku pada {tgl(tg(c, 'peringatan'))}, tertinggi tingkat {SEV[t['severity']][1].lower()}: {t['event']} di {t['wilayah'].title()}",
        angka=[angka("Peringatan aktif", len(aktif), "peringatan"),
               angka("Tingkat berat atau lebih", sum(1 for x in aktif if SEV.get(x["severity"], (0,))[0] >= 3), "peringatan")],
        baris=[{"event": x["event"], "wilayah": x["wilayah"].title(), "tingkat": SEV.get(x["severity"], (0, x["severity"]))[1],
                "selesai": iso(waktu(x["selesai"]))} for x in aktif[:BARIS_MAKS]],
        tindak_lanjut=tindak(("BNPB", f"Teruskan peringatan {t['event'].lower()} ke BPBD {', '.join(c.prov(k) for k in t['prov'][:2])}.")), **kw)


def umur_kata(jam):
    return f"sekitar {round(jam / 24)} hari" if jam >= 48 else f"{round(jam)} jam"


def w_kesegaran(c):
    rows = []
    for nama, (lab, amb, _) in WAKTU.items():
        try:
            t, um = c.umur(nama)
        except Kosong:
            rows.append({"sumber": lab, "umur": None, "ambang": amb, "status": "Tidak ada", "_r": 1e9})
            continue
        rows.append({"sumber": lab, "umur": round(um), "ambang": amb, "status": "Basi" if um > amb else "Segar", "_r": um / amb})
    rows.sort(key=lambda r: -r["_r"])
    basi = [r for r in rows if r["status"] != "Segar"]
    tua = next((r for r in rows if r["umur"] is not None), None)   # rows sudah urut umur/ambang: paling terlambat dulu
    for r in rows:
        r.pop("_r")
    c.dipakai.update(n for n in WAKTU if n in c.cache and c.cache[n] is not None)
    hari = tua is not None and tua["umur"] >= 48
    return dict(
        judul=f"Per {tgl(c.sekarang)}, {K(str(len(basi)) + ' dari ' + str(len(rows)))} sumber data melewati batas kesegarannya"
              + (f", paling terlambat {tua['sumber'][:1].lower() + tua['sumber'][1:]} ({umur_kata(tua['umur'])})" if tua else ""),
        angka=[angka("Sumber basi atau hilang", len(basi), "sumber"), angka("Sumber segar", len(rows) - len(basi), "sumber"),
               angka("Umur sumber paling terlambat", round(tua["umur"] / 24) if hari else (tua["umur"] if tua else 0), "hari" if hari else "jam")],
        kolom=[kol("sumber", "Sumber"), kol("umur", "Umur (jam)", "angka"), kol("ambang", "Batas (jam)", "angka"), kol("status", "Status", "pill")],
        baris=rows[:BARIS_MAKS],
        tindak_lanjut=tindak(("Pengelola platform", f"Periksa pembaruan {basi[0]['sumber']}." if basi else "Tidak ada tindakan; semua sumber segar.")),
        sumber="Catatan waktu pembaruan tiap sumber data",
        catatan="Batas kesegaran mengikuti jadwal tiap sumber (3 jam, harian, mingguan, atau tahunan), ditambah toleransi.")


WIDGET = {  # id -> (label pill, fungsi)
    "situasi": ("Situasi", w_situasi), "provinsi": ("Provinsi", w_provinsi), "kejadian": ("Kejadian api", w_kejadian),
    "konsesi": ("Areal izin", w_konsesi), "gambut": ("Gambut", w_gambut), "cuaca": ("Cuaca", w_cuaca), "asap": ("Asap", w_asap),
    "penerbangan": ("Penerbangan", w_penerbangan), "sumberdaya": ("Sumber daya", w_sumberdaya), "dampak": ("Dampak", w_dampak),
    "luas": ("Luas terbakar", w_luas), "berulang": ("Langganan", w_berulang), "pencegahan": ("Pencegahan", w_pencegahan),
    "peringatan": ("Peringatan", w_peringatan), "kesegaran": ("Kesegaran data", w_kesegaran),
}


# ---------------------------------------------------------------- peta
# lapisan peta.json (kontrak bagian Peta). Tiap p_<id>(c) -> bagian lapisan; id, widget, per ditambah rakit_peta().
MAKS_FITUR = 300
BOX = (-11.0, 6.5, 94.0, 141.5)   # lat min, lat maks, lon min, lon maks


def r3(x):
    return round(x, 3)


def titik_poligon(geom):
    """titik di DALAM poligon (lubang dihormati) -> (lat, lon): bagian terbesar, garis mendatar di beberapa tinggi, tengah selang terlebar
    (geo/batas.py titik_dalam mengabaikan lubang, jadi dipakai untuk bahan bagian terbesar saja)"""
    sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "geo"))
    from batas import bagian, luas_derajat
    part = max(bagian(geom), key=lambda p: luas_derajat(p[0]))
    ys = [q[1] for q in part[0]]
    y0, y1 = min(ys), max(ys)
    terbaik = (-1, None, None)
    for fr in (.5, .4, .6, .3, .7, .2, .8):
        y = y0 + (y1 - y0) * fr
        xs = sorted(r[k - 1][0] + (y - r[k - 1][1]) * (r[k][0] - r[k - 1][0]) / (r[k][1] - r[k - 1][1])
                    for r in part for k in range(len(r)) if (r[k - 1][1] > y) != (r[k][1] > y))
        for a, b in zip(xs[::2], xs[1::2]):
            if b - a > terbaik[0]:
                terbaik = (b - a, (a + b) / 2, y)
    return r3(terbaik[2]), r3(terbaik[1])


def fitur(lat, lon, nama, nilai, *teks, pill=None):
    f = {"lat": r3(lat), "lon": r3(lon), "nama": nama, "nilai": nilai, "teks": list(teks)}
    if pill:
        f["pill"] = pill
    return f


def p_provinsi(c):
    return dict(label="Titik panas 7 hari", jenis="provinsi", satuan="titik", nilai={k: t7 for k, t7, _ in prov_7hari(c)[1]})


def p_cuaca(c):
    cu, hh, _ = cuaca_prov(c)
    return dict(label=f"Wilayah berbahaya api sangat tinggi, {hh} hari ke depan", jenis="provinsi", satuan="persen wilayah", pill="perkiraan {nilai} persen wilayah",
                catatan="Perkiraan model ECMWF dan FWI, bukan peluang adanya api.",
                nilai={k: round(v[1] * 100) for k, v in cu.items()})


def p_kejadian(c):
    kl, kk, kend = c.j("kluster"), c.j("kompleks_konsesi")["kompleks"], c.j("kendala")["kompleks"]
    op = {x["id"]: x["jenis"] for x in c.j("operasi")["kompleks"]}
    aktif = sorted((f["properties"] for f in kl["features"] if f["properties"].get("n24", 0) > 0), key=lambda p: -p["luas"])
    fs = []
    for p in aktif[:MAKS_FITUR]:
        lab = kend.get(p["id"], {}).get("label")
        fs.append(fitur(p["lat"], p["lon"], f"{p['kec']}, {p['kab']}", round(p["luas"]),
                        f"Titik panas 24 jam {fid(p['n24'])}", "Gambut" if gambut_kejadian(c, p, kk, op) else "Bukan gambut",
                        ", ".join(lab) if lab else "Tanpa kendala akses tercatat", pill=f"sekitar {fid(bulat(p['luas']))} ha"))
    return dict(label="Kejadian api", jenis="titik", satuan="ha, perkiraan sebaran titik", fitur=fs)


def p_konsesi(c):
    a = c.j("aktor_karhutla")
    nm = lambda x: re.sub(r"[^a-z0-9]", "", (x or "").lower())
    izin = {}   # nama -> fitur izin terluas; titik wakil di dalam poligon izin itu sendiri
    for f in json.load(open(os.path.join(c.dasar, "lahan", "konsesi.geojson")))["features"]:
        p = f["properties"]
        if nm(p.get("nama")) and p["luas_peta_ha"] > (izin.get(nm(p["nama"]), {"properties": {"luas_peta_ha": -1}})["properties"]["luas_peta_ha"]):
            izin[nm(p["nama"])] = f
    JENIS = {"sawit": "Sawit", "pbph": "Hutan tanaman atau alam"}
    fs = []
    for p in a["perusahaan"]:
        n = (p.get("cek") or {}).get("titik_terkini") or 0
        f = izin.get(nm(p["nama"]))
        if not n or not f:
            continue
        lat, lon = titik_poligon(f["geometry"])
        fs.append(fitur(lat, lon, p["nama"], n, f"Titik panas 7 hari di dalam batas izin {fid(n)}", f"Jenis izin {JENIS.get(p['jenis'], p['jenis']).lower()}",
                        f"{f['properties']['kab']}, {c.prov(f['properties']['prov'])}", "Indikasi, bukan penetapan pelaku"))
    fs.sort(key=lambda x: -x["nilai"])
    return dict(label="Areal izin bertitik panas 7 hari", jenis="titik", satuan="titik", catatan="Indikasi, bukan penetapan pelaku.", fitur=fs[:MAKS_FITUR])


def p_gambut(c):
    kh = [k for k in c.j("khg_prioritas")["khg"] if k["titik_7h"] > 0]
    geo = {f["properties"]["kode"]: f["geometry"] for f in json.load(open(os.path.join(c.dasar, "lahan", "khg.geojson")))["features"]}
    fs = []
    for k in sorted(kh, key=lambda k: -k["titik_7h"])[:MAKS_FITUR]:
        if k["kode"] in geo:
            lat, lon = titik_poligon(geo[k["kode"]])
            fs.append(fitur(lat, lon, k["nama"], k["titik_7h"], f"Titik panas 7 hari {fid(k['titik_7h'])}", f"Titik panas 30 hari {fid(k['titik_30h'])}",
                            f"Kejadian api tercatat {fid(k['kompleks_aktif'])}", f"{k['prov_nama']}, kanal {fid(k['kanal_km'])} km"))
    if not fs:
        raise Kosong("tidak ada KHG bertitik yang poligonnya ditemukan")
    return dict(label="Kawasan hidrologis gambut bertitik panas", jenis="titik", satuan="titik", per=iso(waktu(c.j("khg_prioritas")["jendela_7h"][1])), fitur=fs)


def p_asap(c):
    sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "udara"))
    import kualitas   # ambang ISPU PM2,5 yang sama dengan modul udara (Permen LHK P.14/2020)
    u, a = c.j("udara_dampak"), c.j("asap")
    h = min(u["hari"], key=lambda x: abs((dt.date.fromisoformat(x) - c.sekarang.date()).days))   # hari yang sama dengan widget asap
    if h not in a["hari"]:
        raise Kosong(f"asap.json tidak memuat {h}")
    i, kol_ = a["hari"].index(h), a["kolom"].index("pm25_rata")   # rata-rata 24 jam, sama dengan dasar widget asap
    B = kualitas.BATAS
    nama_k = ["Baik", "Sedang", "Tidak sehat", "Sangat tidak sehat", "Berbahaya"]
    pil = {2: f"Tidak sehat, {fid(round(B[1]))} sampai {fid(round(B[2]))} µg/m³", 3: f"Sangat tidak sehat, {fid(round(B[2]))} sampai {fid(round(B[3]))} µg/m³",
           4: f"Berbahaya, di atas {fid(round(B[3]))} µg/m³"}
    sel = sorted(((g[kol_][i], g[0], g[1]) for g in a["grid"] if g[kol_][i] is not None and g[kol_][i] > u["batas"]), reverse=True)[:MAKS_FITUR]
    d = tgl(dt.date.fromisoformat(h))
    fs = [fitur(la, lo, f"Sel model sekitar {fid(abs(la), 1)}° {'LS' if la < 0 else 'LU'}, {fid(lo, 1)}° BT", v, f"Perkiraan model CAMS pada {d}",
                f"Batas tidak sehat {fid(u['batas'], 1)} µg/m³", pill=pil[kualitas.kategori(v)]) for v, la, lo in sel]
    return dict(label="PM2,5 tidak sehat (perkiraan model)", jenis="titik", satuan="µg/m³", per=iso(waktu(h)),
                kelas=[{"dari": r3(B[k - 1] + 0.1), "label": nama_k[k]} for k in (2, 3, 4)],
                catatan="Perkiraan model CAMS, rata-rata 24 jam, belum dikoreksi stasiun.", fitur=fs)


def p_penerbangan(c):
    p = c.j("penerbangan")
    per, nj = per_bandara(p["kejadian"]), p["nama_jenis"]
    fs = []
    for kode, v in sorted(per.items(), key=lambda kv: -kv[1]["n"])[:MAKS_FITUR]:
        b = p["bandara"].get(kode)
        if b and b.get("lat") is not None and b.get("lon") is not None:
            jn = nj.get(max(v["j"], key=v["j"].get)) if v["j"] else None
            fs.append(fitur(b["lat"], b["lon"], f"{b['nama']} ({kode})", v["n"], f"Gangguan musim ini {fid(v['n'])}",
                            *([f"Jenis terbanyak {jn.lower()}"] if jn and jn != nj.get("lain") else []), f"Terakhir {tgl(dt.date.fromisoformat(v['akhir']))}"))
    return dict(label="Bandara terdampak asap", jenis="titik", satuan="gangguan", fitur=fs)


def p_posko(c):
    po = c.j("posko")
    fs = [fitur(x["lat"], x["lon"], x["nama"], len(x["kompleks"]), f"{x['kab']}, {c.prov(x['prov'])}", f"Posko {x['jenis_posko']}",
                f"Dalam radius {fid(po['radius_km'])} km")
          for x in sorted(po["posko"], key=lambda x: -len(x["kompleks"]))[:MAKS_FITUR]]
    return dict(label="Posko terdata", jenis="titik", satuan="kejadian api dalam jangkauan", fitur=fs)


def p_berulang(c):
    s, ini, lg = langganan(c)
    th = s["tahun"][ini]
    dasar_kec, fs = {}, []
    for kunci, n, ul, rata in lg:
        pr, kab, kec = kunci.split("|")
        if pr not in dasar_kec:
            dasar_kec[pr] = {(f["properties"]["kab"], f["properties"]["kec"]): f["geometry"]
                             for f in json.load(open(os.path.join(c.dasar, "..", "geo", "kecamatan", pr + ".json")))["features"]}
        g = dasar_kec[pr].get((kab, kec))
        if g and len(fs) < MAKS_FITUR:
            lat, lon = titik_poligon(g)
            fs.append(fitur(lat, lon, f"{kec}, {kab}", n, f"Titik panas {th} {fid(n)}", f"Rata-rata {fid(round(rata))} titik per tahun pada {s['tahun'][0]} sampai {s['tahun'][ini - 1]}",
                            f"Tercatat ada titik panas di {ul} dari {ini} tahun ({s['tahun'][0]} sampai {s['tahun'][ini - 1]})", c.prov(pr)))
    if not fs:
        raise Kosong("tidak ada kecamatan langganan yang batasnya ditemukan")
    return dict(label="Kecamatan langganan kembali bertitik panas", jenis="titik", satuan="titik", fitur=fs)


# id lapisan -> (widget terkait yang `per`-nya dipakai, fungsi); urutan = urutan chip di layar
LAPISAN = {"provinsi": ("provinsi", p_provinsi), "cuaca": ("cuaca", p_cuaca), "kejadian": ("kejadian", p_kejadian), "konsesi": ("konsesi", p_konsesi),
           "gambut": ("gambut", p_gambut), "asap": ("asap", p_asap), "penerbangan": ("penerbangan", p_penerbangan),
           "posko": ("sumberdaya", p_posko), "berulang": ("berulang", p_berulang)}


def rakit_peta(ws, c, dibuat):
    """lapisan yang gagal atau yang widgetnya kosong dibuang dengan peringatan; peta.json tetap terbit"""
    per = {w["id"]: w for w in ws}
    out = []
    for lid, (wid, fn) in LAPISAN.items():
        try:
            if per[wid]["status"] == "kosong":
                raise Kosong(f"widget {wid} kosong")
            l = fn(c)
            out.append({"id": lid, "widget": wid, "label": l.pop("label"), "jenis": l.pop("jenis"), "satuan": l.pop("satuan"), "per": l.pop("per", per[wid]["per"]),
                        "sumber": per[wid]["sumber"], **l})
        except Exception as e:
            print(f"presiden: lapisan peta {lid} dibuang: {type(e).__name__}: {e}", file=sys.stderr)
    return {"versi": "presiden-peta/1", "dibuat": dibuat, "lapisan": out}


# ---------------------------------------------------------------- rakit
def rakit(wid, c):
    label, fn = WIDGET[wid]
    c.dipakai = set()
    dasar = dict(id=wid, label=label, per=None, status="kosong", angka=[], grafik=None, kolom=[], baris=[], tindak_lanjut=[], sumber="", catatan=None)
    try:
        w = {**dasar, **fn(c)}
    except Kosong as e:
        return {**dasar, "judul": f"{label}: data belum tersedia", "catatan": str(e)}
    except Exception as e:   # satu widget jangan menjatuhkan yang lain
        print(f"presiden: widget {wid} gagal: {type(e).__name__}: {e}", file=sys.stderr)
        return {**dasar, "judul": f"{label}: data belum tersedia", "catatan": f"gagal dibangun: {type(e).__name__}: {e}"}
    waktus, basi = [], []
    for nama in sorted(c.dipakai):
        u = c.umur(nama) if nama in WAKTU else None
        if u:
            waktus.append(u[0])
            if u[1] > WAKTU[nama][1] and wid != "kesegaran":
                basi.append(f"{WAKTU[nama][0]} terakhir {tgl(u[0])}")
    w["per"] = iso(min(waktus)) if waktus else iso(c.sekarang)
    w["status"] = "basi" if basi else "ok"
    if basi:
        w["catatan"] = " ".join(x for x in ["Data terlambat: " + ", ".join(basi) + ".", w["catatan"]] if x)
    return w


def bangun(dasar, keluar, sekarang=None):
    sekarang = sekarang or dt.datetime.now(WIB)
    c = Ctx(dasar, sekarang)
    ws = [rakit(i, c) for i in IDS]
    dibuat = iso(sekarang)
    os.makedirs(keluar, exist_ok=True)

    def tulis(nama, isi):
        jalur = os.path.join(keluar, nama)
        with open(jalur + ".tmp", "w") as f:
            json.dump(isi, f, ensure_ascii=False, separators=(",", ":"))
        os.replace(jalur + ".tmp", jalur)

    semua = {"versi": VERSI, "dibuat": dibuat, "widget": ws}
    tulis("semua.json", semua)
    tulis("peta.json", rakit_peta(ws, c, dibuat))
    for w in ws:
        tulis(w["id"] + ".json", w)
    indeks = {"versi": VERSI, "dibuat": dibuat,
              "widget": [{"id": w["id"], "label": w["label"], "judul": w["judul"], "per": w["per"], "status": w["status"],
                          "url": f"/data/presiden/{w['id']}.json"} for w in ws]}
    tulis("indeks.json", indeks)
    return semua, indeks


def main():
    semua, _ = bangun(DATA, KELUAR)
    for w in semua["widget"]:
        print(f"presiden/{w['id']}: {w['status']}")
    print(f"presiden/semua.json: {os.path.getsize(os.path.join(KELUAR, 'semua.json'))} byte")
    pt = json.load(open(os.path.join(KELUAR, "peta.json")))
    print(f"presiden/peta.json: {os.path.getsize(os.path.join(KELUAR, 'peta.json'))} byte,",
          ", ".join(f"{l['id']}={len(l['fitur']) if 'fitur' in l else len(l['nilai'])}" for l in pt["lapisan"]))


# ---------------------------------------------------------------- uji
def _teks(x):
    if isinstance(x, str):
        yield x
    elif isinstance(x, dict):
        for k, v in x.items():
            yield from _teks(k)
            yield from _teks(v)
    elif isinstance(x, list):
        for v in x:
            yield from _teks(v)


def _kunci(x):
    if isinstance(x, dict):
        for k, v in x.items():
            yield k
            yield from _kunci(v)
    elif isinstance(x, list):
        for v in x:
            yield from _kunci(v)


def uji_peta(tmp, ws, dasar):
    """peta.json: bentuk kontrak, batas, kode provinsi, ukuran, tanpa data pribadi, dan angka dicek ulang dari sumber"""
    ukuran = os.path.getsize(os.path.join(tmp, "peta.json"))
    assert ukuran < 400_000, ukuran
    pt = json.load(open(os.path.join(tmp, "peta.json")))
    assert pt["versi"] == "presiden-peta/1" and re.fullmatch(r"\d{4}-\d\d-\d\dT\d\d:\d\d\+07:00", pt["dibuat"]) and pt["lapisan"]
    kode_ada = {f["properties"]["kode"] for f in json.load(open(os.path.join(dasar, "..", "geo", "provinsi.json")))["features"]}
    ids = [l["id"] for l in pt["lapisan"]]
    assert ids == [i for i in LAPISAN if i in ids], ids   # urutan chip sesuai kontrak
    S = lambda n: json.load(open(os.path.join(dasar, n + ".json")))
    for l in pt["lapisan"]:
        lid = l["id"]
        assert l["widget"] == LAPISAN[lid][0] and l["sumber"] == ws[l["widget"]]["sumber"] and l["sumber"], lid
        assert re.fullmatch(r"\d{4}-\d\d-\d\dT\d\d:\d\d\+07:00", l["per"]), lid
        if lid not in ("gambut", "asap"):   # dua lapisan ini memakai tanggal akhir data sebenarnya, bukan per widget
            assert l["per"] == ws[l["widget"]]["per"], lid
        assert l["label"] and l["satuan"] and l["jenis"] in ("provinsi", "titik"), lid
        if l["jenis"] == "provinsi":
            assert set(l) <= {"id", "widget", "label", "jenis", "satuan", "per", "sumber", "catatan", "pill", "nilai"} and l["nilai"], lid
            assert set(l["nilai"]) <= kode_ada, (lid, set(l["nilai"]) - kode_ada)
            assert all(isinstance(v, (int, float)) for v in l["nilai"].values()), lid
            continue
        assert set(l) <= {"id", "widget", "label", "jenis", "satuan", "per", "sumber", "catatan", "kelas", "fitur"} and 0 < len(l["fitur"]) <= MAKS_FITUR, lid
        for f in l["fitur"]:
            assert set(f) <= {"lat", "lon", "nama", "nilai", "teks", "pill"} and {"lat", "lon", "nama", "nilai", "teks"} <= set(f) and isinstance(f["nilai"], (int, float)), (lid, f)
            assert BOX[0] <= f["lat"] <= BOX[1] and BOX[2] <= f["lon"] <= BOX[3], (lid, f)
            assert f["lat"] == round(f["lat"], 3) and f["lon"] == round(f["lon"], 3), (lid, f)
            assert f["nama"] and 1 <= len(f["teks"]) <= 4 and all(isinstance(t, str) and t for t in f["teks"]), (lid, f)
            if lid == "konsesi":
                assert "Indikasi, bukan penetapan pelaku" in f["teks"], f
            if lid == "asap":   # kategori, bukan angka persis
                assert re.fullmatch(r"(Tidak sehat|Sangat tidak sehat), \d+ sampai \d+ µg/m³|Berbahaya, di atas \d+ µg/m³", f["pill"]), f["pill"]
            if lid == "kejadian":   # dibulatkan 2 angka penting seperti judul
                m_ = re.fullmatch(r"sekitar ([\d.]+) ha", f["pill"])
                assert m_ and int(m_.group(1).replace(".", "")) == bulat(int(m_.group(1).replace(".", ""))), f["pill"]
    teks = list(_teks(pt))
    assert not any(" · " in t or "—" in t or "kompleks" in t.lower() or re.search(r"terbakar", t) for t in teks), "pemisah/istilah terlarang di peta"
    assert not any(re.search(r"[\w.+-]+@[\w-]+\.\w+|\+62\d|\b08\d{8,}", t) for t in teks), "email/telepon di peta"
    assert not (set(_kunci(pt)) & {"pelapor", "nama_pelapor", "telepon", "hp", "phone", "email", "nomor_hp", "wa", "foto", "regu_nama", "tokoh"})
    L = {l["id"]: l for l in pt["lapisan"]}
    assert L["konsesi"]["catatan"].count("bukan penetapan pelaku") == 1 if "konsesi" in L else True
    if "asap" in L:
        assert L["asap"]["satuan"] == "µg/m³" and L["asap"]["kelas"] and "perkiraan" in L["asap"]["catatan"].lower() and not any("prakiraan" in t for t in teks)
    if "konsesi" in L:   # titik wakil harus di dalam poligon izin perusahaan itu, dan provinsi di teks = provinsi titik
        sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "geo"))
        from batas import di_dalam, bagian
        ada = lambda g, x, y: any(di_dalam(x, y, p[0]) and not any(di_dalam(x, y, h) for h in p[1:]) for p in bagian(g))
        izin = {}
        for g in json.load(open(os.path.join(dasar, "lahan", "konsesi.geojson")))["features"]:
            izin.setdefault(re.sub(r"[^a-z0-9]", "", (g["properties"].get("nama") or "").lower()), []).append(g["geometry"])
        pv = json.load(open(os.path.join(dasar, "..", "geo", "provinsi.json")))["features"]
        nama_prov = S("meta")["provinsi"]
        for f in L["konsesi"]["fitur"]:
            assert any(ada(g, f["lon"], f["lat"]) for g in izin[re.sub(r"[^a-z0-9]", "", f["nama"].lower())]), ("titik di luar izin", f["nama"])
            kd = next(p["properties"]["kode"] for p in pv if ada(p["geometry"], f["lon"], f["lat"]))
            assert f["teks"][2].endswith(", " + nama_prov[kd]), (f["nama"], f["teks"][2], nama_prov[kd])
    # angka satu lapisan dicek ulang dari sumber: provinsi = total 7 hari widget, kejadian/gambut/posko = hitung langsung
    if "provinsi" in L and ws["provinsi"]["status"] != "kosong":
        m = S("musim_harian")
        th = str(dt.date.fromisoformat(m["sd"]).year)
        assert L["provinsi"]["nilai"] == {k: sum(v[th][-7:]) for k, v in m["prov"].items()}
        assert sum(L["provinsi"]["nilai"].values()) == ws["provinsi"]["angka"][1]["nilai"]
    if "kejadian" in L:
        luas = sorted((f["properties"]["luas"] for f in S("kluster")["features"] if f["properties"].get("n24", 0) > 0), reverse=True)[:MAKS_FITUR]
        assert [f["nilai"] for f in L["kejadian"]["fitur"]] == [round(x) for x in luas]
    if "gambut" in L:
        kh = S("khg_prioritas")["khg"]
        assert max(f["nilai"] for f in L["gambut"]["fitur"]) == max(k["titik_7h"] for k in kh)
        assert len(L["gambut"]["fitur"]) <= sum(1 for k in kh if k["titik_7h"] > 0)
    if "posko" in L:
        assert len(L["posko"]["fitur"]) == min(MAKS_FITUR, len(S("posko")["posko"]))
    if "konsesi" in L:
        assert sum(1 for f in L["konsesi"]["fitur"]) <= sum(1 for p in S("aktor_karhutla")["perusahaan"] if (p.get("cek") or {}).get("titik_terkini"))
    # semua sumber hilang: peta.json tetap terbit, tanpa lapisan
    with tempfile.TemporaryDirectory() as k0:
        bangun(k0, os.path.join(k0, "k"))
        assert json.load(open(os.path.join(k0, "k", "peta.json")))["lapisan"] == []
    print(f"peta.json {ukuran} byte,", ", ".join(f"{i}={len(l['fitur']) if 'fitur' in l else len(l['nilai'])}" for i, l in L.items()))


def uji():
    assert fid(1227970) == "1.227.970" and fid(4.26, 1) == "4,3" and fid(-5) == "-5"
    assert waktu("2026-10-17").hour == 23 and waktu("2026-07").day == 31 and waktu("2026-10-14T04:37+00:00").hour == 4
    now = dt.datetime.now(WIB)
    with tempfile.TemporaryDirectory() as kosong, tempfile.TemporaryDirectory() as tmp:
        # semua sumber hilang: tidak jatuh, semua widget kosong dengan alasan
        s0, _ = bangun(kosong, os.path.join(kosong, "k"), now)
        assert [w["id"] for w in s0["widget"]] == IDS and all(w["status"] == "kosong" and w["catatan"] and w["baris"] == [] for w in s0["widget"] if w["id"] != "kesegaran")  # kesegaran melaporkan "Tidak ada" per sumber

        semua, indeks = bangun(DATA, tmp, now)
        ws = {w["id"]: w for w in semua["widget"]}
        assert semua["versi"] == VERSI and re.fullmatch(r"\d{4}-\d\d-\d\dT\d\d:\d\d\+07:00", semua["dibuat"]), semua["dibuat"]
        assert list(ws) == IDS, "urutan/ID widget tidak sesuai kontrak"
        assert indeks["versi"] == VERSI and [x["id"] for x in indeks["widget"]] == IDS
        for x in indeks["widget"]:
            assert set(x) == {"id", "label", "judul", "per", "status", "url"} and x["url"] == f"/data/presiden/{x['id']}.json"
        TIPE = {"teks", "angka", "persen", "pill"}
        for wid, w in ws.items():
            assert set(w) == {"id", "label", "judul", "per", "status", "angka", "grafik", "kolom", "baris", "tindak_lanjut", "sumber", "catatan"}, (wid, set(w))
            assert w["status"] in ("ok", "kosong", "basi"), wid
            assert len(w["angka"]) <= ANGKA_MAKS and len(w["baris"]) <= BARIS_MAKS, wid
            if w["status"] == "kosong":
                assert w["catatan"] and w["baris"] == [], (wid, "kosong tanpa alasan")
                continue
            assert re.fullmatch(r"\d{4}-\d\d-\d\dT\d\d:\d\d\+07:00", w["per"]), (wid, w["per"])
            assert w["judul"].count("[[") == w["judul"].count("]]") >= 1, (wid, w["judul"])
            assert 1 <= len(w["tindak_lanjut"]) <= 3 and all(t["siapa"] and t["apa"] for t in w["tindak_lanjut"]), wid
            assert w["sumber"], wid
            if w["status"] == "basi":
                assert w["catatan"].startswith("Data terlambat"), wid
            for a in w["angka"]:
                assert set(a) == {"label", "nilai", "satuan", "ubah"} and isinstance(a["nilai"], (int, float)), (wid, a)
            ks = {k["k"] for k in w["kolom"]}
            assert all(k["jenis"] in TIPE for k in w["kolom"]), wid
            for b in w["baris"]:
                assert set(b) <= ks, (wid, set(b) - ks)
            if w["grafik"]:
                g = w["grafik"]
                assert g["jenis"] in ("batang", "garis") and all(len(s["nilai"]) == len(g["label"]) for s in g["seri"]), wid
        # teks: tanpa pemisah titik tengah, em dash, istilah lama, dan data pribadi
        semua_teks = list(_teks(semua))
        assert not any(" · " in t or "—" in t or "kompleks" in t.lower().replace("kompleks_konsesi.json", "") for t in semua_teks), "pemisah/istilah terlarang"
        assert not any(re.search(r"[\w.+-]+@[\w-]+\.\w+|\+62\d|\b08\d{8,}", t) for t in semua_teks), "email/telepon"
        terlarang = {"pelapor", "nama_pelapor", "telepon", "hp", "phone", "email", "nomor_hp", "wa", "foto", "regu_nama", "tokoh"}
        assert not (set(_kunci(semua)) & terlarang), set(_kunci(semua)) & terlarang
        TGL = re.compile(r"\b(?:\d{1,2} )?[A-Z][a-z]{2,8} 20\d\d\b")
        for wid, w in ws.items():
            if w["status"] == "kosong":
                continue
            assert ".json" not in w["sumber"], (wid, w["sumber"])
            assert TGL.search(w["judul"]), (wid, "judul tanpa tanggal data", w["judul"])
            assert not re.search(r"saat ini|masih aktif|terkini", w["judul"]), (wid, w["judul"])
        # angka di judul == angka[] terbulatkan (satu nilai mentah, satu pembulatan)
        def ada(wid, teks):
            if ws[wid]["status"] != "kosong":
                assert teks in ws[wid]["judul"], (wid, teks, ws[wid]["judul"])
        for wid, i, tpl in [("dampak", 1, "Rp{} triliun"), ("dampak", 2, "{} juta ton"), ("sumberdaya", 1, "{} personel"), ("asap", 0, None), ("provinsi", 0, None)]:
            w = ws[wid]
            if w["status"] == "kosong":
                continue
            a_ = w["angka"][i]
            if wid == "asap":
                ada(wid, f"[[{fid(a_['nilai'] / 1e6)} juta]]")
            elif wid == "provinsi":
                if a_["ubah"] is not None:
                    ada(wid, f"{fid(abs(a_['ubah']), 1)}%")
                ada(wid, f"[[{fid(a_['nilai'])}]]")
            else:
                ada(wid, tpl.format(fid(a_["nilai"])))
        if ws["pencegahan"]["status"] != "kosong":
            a_ = ws["pencegahan"]["angka"]
            ada("pencegahan", f"Rp{fid(a_[0]['nilai'], 1)} sampai Rp{fid(a_[1]['nilai'], 1)} triliun")
        assert bulat(86266046) == 86000000 and bulat(203.65) == 200 and bulat(706.1, 1) == 700 and bulat(12869, 3) == 12900 and bulat(1.907) == 1.9
        assert fid(0.5, 1) == "0,5" and umur_kata(240) == "sekitar 10 hari" and umur_kata(30) == "30 jam"
        ukuran = os.path.getsize(os.path.join(tmp, "semua.json"))
        assert ukuran < 150_000, ukuran
        for wid in IDS:
            assert json.load(open(os.path.join(tmp, wid + ".json"))) == ws[wid], wid
        assert json.load(open(os.path.join(tmp, "indeks.json"))) == indeks

        # hitung ulang langsung dari berkas sumber
        def src(n):
            return json.load(open(os.path.join(DATA, n + ".json")))
        if ws["situasi"]["status"] != "kosong":
            m, k = src("musim_harian"), src("kumulatif")
            sd = dt.date.fromisoformat(m["sd"])
            a = ws["situasi"]["angka"]
            assert a[0]["nilai"] == m["nasional"][str(sd.year)][-1]
            assert a[1]["nilai"] == k["nasional"]["ini"] == sum(m["nasional"][str(sd.year)]), (a[1], sum(m["nasional"][str(sd.year)]))
            assert a[2]["nilai"] == k["setara_2015"]["nasional"]["banding"]["2015"]["persen"]
        if ws["provinsi"]["status"] != "kosong":
            m = src("musim_harian")
            th = str(dt.date.fromisoformat(m["sd"]).year)
            t7 = {kd: sum(v[th][-7:]) for kd, v in m["prov"].items()}
            best = max(t7, key=t7.get)
            meta = src("meta")["provinsi"]
            r0 = ws["provinsi"]["baris"][0]
            assert r0["prov"] == meta[best] and r0["t7"] == t7[best] == ws["provinsi"]["angka"][0]["nilai"], (r0, best)
            assert ws["provinsi"]["angka"][1]["nilai"] == sum(t7.values())
            assert [b["t7"] for b in ws["provinsi"]["baris"]] == sorted(t7.values(), reverse=True)[:len(ws["provinsi"]["baris"])]
        if ws["konsesi"]["status"] != "kosong":
            kw = ws["konsesi"]
            ps = src("aktor_karhutla")["perusahaan"]
            ter = sorted(((p.get("cek") or {}).get("titik_terkini") or 0 for p in ps), reverse=True)
            tot = src("kompleks_konsesi")["total"]["konsesi"]
            assert kw["angka"][0]["nilai"] == tot and f"[[{fid(tot)}]]" in kw["judul"], kw["judul"]
            assert f"[[{fid(ter[0])} titik]]" in kw["judul"] and kw["judul"].count("[[") == 3
            assert [b["terkini"] for b in kw["baris"]] == ter[:len(kw["baris"])] and ter[0] > 0
            assert [k["k"] for k in kw["kolom"]] == ["nama", "terkini", "jenis", "wilayah"]
            assert kw["catatan"].count("bukan penetapan pelaku") == 1
        if ws["gambut"]["status"] != "kosong":
            kh = src("khg_prioritas")["khg"]
            g = ws["gambut"]
            assert g["angka"][0]["nilai"] == sum(x["titik_7h"] for x in kh)
            assert g["angka"][1]["nilai"] == sum(1 for x in kh if x["titik_7h"] > 0)
            assert g["baris"][0]["t7"] == max(x["titik_7h"] for x in kh)
        uji_peta(tmp, ws, DATA)
        for nm in os.listdir(tmp):   # keputusan pemilik 17 Okt: WALHI tidak tampil di situs
            assert "walhi" not in open(os.path.join(tmp, nm)).read().lower(), nm
    print("presiden --uji: lulus,", ", ".join(f"{i}={ws[i]['status']}" for i in IDS), f"| semua.json {ukuran} byte")


if __name__ == "__main__":
    uji() if "--uji" in sys.argv else main()
