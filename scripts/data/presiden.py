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
       "luas", "berulang", "pencegahan", "rob", "kesegaran"]   # peringatan BMKG dibuang 22 Okt 2026: umpan harian, nowcast berlaku 3 jam, selalu basi
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
    "../banjir/data/rob_presiden": ("Prakiraan laut untuk rob", 36, lambda j, c: j["model_sampai"] or j["dibuat"]),   # dibuat harian oleh scripts/banjir/rob_presiden.py
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
        t = min(waktu(WAKTU[nama][2](s.diam(nama), s)), s.sekarang)   # tanggal tanpa jam = akhir hari; yang belum terjadi dipotong ke sekarang
        return t, (s.sekarang - t).total_seconds() / 3600


def tindak(*pasang):
    return [{"siapa": a, "apa": b} for a, b in pasang]


def kol(k, label, jenis="teks"):
    return {"k": k, "label": label, "jenis": jenis}


def angka(label, nilai, satuan, ub=None, tampil=None):
    """tampil (opsional) = teks jadi yang menggantikan nilai+satuan di layar; wajib untuk perkiraan model (bulat, 'sekitar ...')"""
    a = {"label": label, "nilai": nilai, "satuan": satuan, "ubah": ub}
    if tampil:
        a["tampil"] = tampil
    return a


def juta(x):
    """perkiraan besar -> '1,1 juta' / '430 ribu' / '820'; dua angka penting"""
    x = bulat(x)
    return f"{fid(x / 1e6, 1).removesuffix(',0')} juta" if x >= 1e6 else f"{fid(x / 1e3)} ribu" if x >= 1e4 else fid(x)


def banding(teks, ub, pembanding):
    """teks angka + arah perubahan + pembandingnya, satu kalimat ('15.486 titik, naik 1.309% dari median ...'); layar tidak menambah ubah lagi"""
    if ub is None:
        return teks
    return f"{teks}, {'naik' if ub >= 0 else 'turun'} {fid(abs(ub), 0 if abs(ub) >= 100 else 1)}% dari {pembanding}"


def bawah(x, sig=2):
    """batas bawah: dibulatkan KE BAWAH ke `sig` angka penting (angka yang memang paling sedikit)"""
    if not x:
        return 0
    e = 10 ** (int(math.floor(math.log10(abs(x)))) - sig + 1)
    return int(x // e * e) if e >= 1 else x


def wib(t):
    return f"{tgl(t.astimezone(WIB))} {jam(t)} WIB"


def jam(t):
    return t.astimezone(WIB).strftime("%H.%M")


def lengkap(c, nama="musim_harian"):
    """tanggal terakhir yang harinya SUDAH selesai di berkas `nama` (hari kalender WIB): hari berjalan dibuang"""
    m = c.j(nama)
    sd = dt.date.fromisoformat(m["sd"])
    return sd if waktu(m["dibuat"]).astimezone(WIB).date() > sd else sd - dt.timedelta(days=1)


# ---------------------------------------------------------------- bahan bersama
def prov_7hari(c):
    """-> (akhir jendela, [(kode, 7 hari terakhir, 7 hari sebelumnya)] urut turun) dari musim_harian.json; hanya hari lengkap"""
    m = c.j("musim_harian")
    sd_file, sd = dt.date.fromisoformat(m["sd"]), lengkap(c)
    buang = (sd_file - sd).days
    out = []
    for kode, d in m["prov"].items():
        s = d[str(sd.year)]
        s = s[:len(s) - buang] if buang else s
        out.append((kode, sum(s[-7:]), sum(s[-14:-7])))
    out.sort(key=lambda x: -x[1])
    return sd, out


def cuaca_prov(c):
    """-> ({kode: (maks bagian sel FWI>=7, maks bagian sel FWI>=14, maks FWI median)}, jumlah hari, tanggal hari pertama) dari peluang.json; hanya tingkat provinsi"""
    p = c.j("peluang")
    w0 = next(iter(p["wilayah"].values()))["hari"]
    return {k: (max(h["p"][0] for h in w["hari"]), max(h["p"][1] for h in w["hari"]), max(h["p50"] for h in w["hari"]))
            for k, w in p["wilayah"].items() if w.get("tingkat") == "provinsi"}, len(w0), dt.date.fromisoformat(w0[0]["t"])


def vonis_pendek(v):
    """vonis peluang.json ('bahaya api Sangat Tinggi diperkirakan meliputi sebagian besar X ...') -> pill pendek; tanpa menghitung ulang"""
    m = re.search(r"bahaya api (Sangat Tinggi|Tinggi) (tidak diperkirakan|diperkirakan meliputi (hampir seluruh|sebagian besar|sebagian|seluruh))", v or "")
    if not m:
        return "Lihat peluang cuaca api"
    return "Tidak diperkirakan" if m.group(2) == "tidak diperkirakan" else f"{m.group(1).capitalize()}, {m.group(3)} wilayah"


def vonis_prov(c):
    return {k: vonis_pendek(w.get("vonis")) for k, w in c.j("peluang")["wilayah"].items() if w.get("tingkat") == "provinsi"}


def rawan(c):
    """kode provinsi yang sering mengalami karhutla (cakupan peluang.json)"""
    return {k for k, w in c.diam("peluang")["wilayah"].items() if w.get("tingkat") == "provinsi"}


# ---------------------------------------------------------------- widget
def w_situasi(c):
    m, k = c.j("musim_harian"), c.j("kumulatif")
    sd_file, sd_k = dt.date.fromisoformat(m["sd"]), dt.date.fromisoformat(k["sd"])
    sd = min(lengkap(c), sd_k)   # satu tanggal untuk judul, angka, grafik, dan per: hari lengkap terakhir
    seri = m["nasional"][str(sd.year)][:len(m["nasional"][str(sd.year)]) - (sd_file - sd).days]
    latar = m["latar"]["nasional"]
    biasa = latar[idx_kabisat(sd)]
    n = k["nasional"]
    rer, ini = n["banding"]["rerata"], n["ini"]
    s15 = k["setara_2015"]
    p15 = s15["nasional"]["banding"]["2015"]
    sd15 = dt.date.fromisoformat(s15["sd"])
    rasio = ini / rer["titik"]
    hari = [sd - dt.timedelta(days=i) for i in range(29, -1, -1)]
    top = prov_7hari(c)[1][0][0]
    ra, rb = k["rerata_tahun"]
    return dict(
        per=iso(waktu(sd.isoformat())),
        judul=f"Sampai {tgl(sd)}, titik panas sudah {K(fid(rasio, 1) + ' kali')} rata-rata {ra} sampai {rb} pada waktu yang sama; "
              f"dengan sensor yang sama seperti 2015 baru {K(str(p15['persen']) + '%')} dari 2015 (sampai {sd15.day} {BULAN[sd15.month - 1]})",
        angka=[angka(f"Titik panas {tgl(sd)}", seri[-1], "titik", tampil=banding(f"{fid(seri[-1])} titik", ubah(seri[-1], biasa), f"median hari yang sama {m['latar']['tahun'][0]} sampai {m['latar']['tahun'][-1]}")),
               angka(f"Total sampai {tgl(sd)} (semua sensor)", ini, "titik", tampil=banding(f"{fid(ini)} titik", round(rasio * 100 - 100, 1), f"rata-rata {ra} sampai {rb} sampai tanggal yang sama")),
               angka(f"Dengan sensor yang sama seperti 2015 (MODIS dan S-NPP), sampai {tgl(sd15)}", s15["nasional"]["ini"], "titik",
                     tampil=f"{fid(s15['nasional']['ini'])} titik, {p15['persen']}% dari 2015 ({fid(p15['titik'])})")],
        grafik={"jenis": "garis", "label": [f"{d.day} {BULAN[d.month - 1]}" for d in hari],
                "seri": [{"nama": str(sd.year), "nilai": seri[-30:]},
                         {"nama": f"Median {m['latar']['tahun'][0]} sampai {m['latar']['tahun'][-1]}",
                          "nilai": [latar[idx_kabisat(d)] for d in hari]}], "satuan": "titik per hari"},
        kolom=[kol("tahun", "Tahun pembanding"), kol("titik", "Titik panas sampai tanggal yang sama", "angka"),
               kol("persen", f"{sd.year} sebagai persen dari tahun itu", "persen")],
        baris=[{"tahun": t, "titik": v["titik"], "persen": v["persen"]} for t, v in n["banding"].items() if t != "rerata"]
              + [{"tahun": f"Rata-rata {ra} sampai {rb}", "titik": rer["titik"], "persen": rer["persen"]}],
        tindak_lanjut=tindak(("BNPB", f"Siagakan posko dan armada udara di {c.prov(top)}, provinsi dengan titik panas terbanyak pekan ini."),
                             ("Kementerian Kehutanan", "Perkuat patroli Manggala Agni dan penegakan hukum (Gakkum Kehutanan) di areal izin yang masih menyala.")),
        sumber="NASA FIRMS (MODIS, VIIRS S-NPP, VIIRS NOAA-20)",
        catatan=f"Titik panas bukan luas terbakar. Hari yang belum selesai tidak dihitung. Perbandingan dengan 2015 terpisah karena hanya memakai MODIS dan VIIRS S-NPP "
                f"({tgl(sd15)} untuk kedua tahun); perbandingan lain memakai semua satelit termasuk NOAA-20.")


def w_provinsi(c):
    sd, urut = prov_7hari(c)
    cu, hh, _ = cuaca_prov(c)
    vn = vonis_prov(c)
    baris = [{"prov": c.prov(kode), "t7": t7, "ubah": ubah(t7, tp), "cuaca": vn.get(kode, "Tidak dicakup")} for kode, t7, tp in urut[:BARIS_MAKS]]
    kode, t7, tp = urut[0]
    ub = ubah(t7, tp)
    arah = "" if ub is None else f", {'naik' if ub >= 0 else 'turun'} {fid(abs(ub), 1)}% dari 7 hari sebelumnya"
    naik = sum(1 for _, a, b in urut if b and a > b)
    tot7, tot_p = sum(a for _, a, _ in urut), sum(b for _, _, b in urut)
    kepala = f"{K(c.prov(kode))} paling mendesak" if ub is None or ub >= 0 else f"{K(c.prov(kode))} tertinggi"
    return dict(
        per=iso(waktu(sd.isoformat())),
        judul=f"{kepala}, {K(fid(t7))} titik panas tercatat dalam 7 hari sampai {tgl(sd)}{arah}",
        angka=[angka(f"Titik panas 7 hari, {c.prov(kode)}", t7, "titik", tampil=banding(f"{fid(t7)} titik", ub, "7 hari sebelumnya")),
               angka("Titik panas 7 hari, seluruh Indonesia", tot7, "titik", tampil=banding(f"{fid(tot7)} titik", ubah(tot7, tot_p), "7 hari sebelumnya")),
               angka("Dengan titik panas naik", naik, "provinsi")],
        kolom=[kol("prov", "Provinsi"), kol("t7", "Titik panas 7 hari", "angka"), kol("ubah", "Dibanding 7 hari sebelumnya", "persen"),
               kol("cuaca", f"Cuaca api {hh} hari ke depan", "pill")],
        baris=baris,
        tindak_lanjut=tindak((f"Gubernur {c.prov(urut[0][0])}", "Tetapkan atau pertahankan status siaga darurat karhutla dan aktifkan posko provinsi."),
                             ("BNPB", f"Kirim dukungan ke {c.prov(urut[1][0])} dan {c.prov(urut[2][0])}, dua provinsi berikutnya.")),
        sumber="NASA FIRMS (titik panas harian per provinsi), ECMWF ansambel lewat Open-Meteo dan sistem FWI Kanada (cuaca api)",
        catatan="Jendela 7 hari hanya memakai hari yang sudah selesai. Kolom cuaca api memakai vonis peluang cuaca api tiap provinsi: 'Sangat tinggi' = FWI (indeks cuaca api Kanada) 14 ke atas, "
                "'Tinggi' = FWI 7 ke atas, disertai cakupan wilayah pada puncaknya; hanya tersedia untuk provinsi yang sering mengalami karhutla.")


def gambut_kejadian(c, p, kk, op):
    """gambut = porsi gambut 50 persen atau lebih"""
    g = kk.get(p["id"], {}).get("gambut")
    if g is not None:
        return g >= 0.5
    return op.get(p["id"]) == "gambut"


def akses_kejadian(kend, p):
    """-> (status, teks): 'belum' (tidak ada di kendala.json), 'bebas' (dinilai, tanpa kendala), 'kendala'"""
    k = kend.get(p["id"])
    if k is None:
        return "belum", "Belum dinilai"
    lab = k.get("label")
    if not lab:
        return "bebas", "Tanpa kendala tercatat"
    jauh = [x for x, kunci in (("sungai atau kanal besar", "Sungai/kanal besar > 2 km"), ("jalan utama", "Jalan utama > 2 km")) if kunci in lab]
    lain = [x.replace(">", "lebih dari") for x in lab if x not in ("Sungai/kanal besar > 2 km", "Jalan utama > 2 km")]
    return "kendala", ", ".join(([f"Jauh dari {' dan '.join(jauh)} (lebih dari 2 km)"] if jauh else []) + lain)


def kejadian_aktif(c):
    """kejadian api dengan titik panas 24 jam, terbesar dulu -> (daftar properti, kk, kend, op)"""
    kl, kk, kend = c.j("kluster"), c.j("kompleks_konsesi")["kompleks"], c.j("kendala")["kompleks"]
    op = {x["id"]: x["jenis"] for x in c.j("operasi")["kompleks"]}
    aktif = sorted((f["properties"] for f in kl["features"] if f["properties"].get("n24", 0) > 0), key=lambda p: -p["luas"])
    return aktif, kk, kend, op


def nama_kejadian(semua, tampil):
    """'Kecamatan, Kabupaten'; nama kembar di antara yang `tampil` diberi urutan ukuran ('kejadian ke-2', dihitung dari SEMUA kejadian aktif, terbesar dulu)"""
    urut, n, ke = {}, {}, {}
    for p in semua:
        k = (p["kec"], p["kab"])
        urut[k] = urut.get(k, 0) + 1
        ke[p["id"]] = urut[k]
    for p in tampil:
        n[(p["kec"], p["kab"])] = n.get((p["kec"], p["kab"]), 0) + 1
    return lambda p: f"{p['kec']}, {p['kab']}" + (f", kejadian ke-{ke[p['id']]}" if n.get((p["kec"], p["kab"]), 0) > 1 else "")


def w_kejadian(c):
    semua, kk, kend, op = kejadian_aktif(c)
    if not semua:
        raise Kosong("tidak ada kejadian api dengan titik 24 jam terakhir")
    ngambut = sum(1 for p in semua if gambut_kejadian(c, p, kk, op))
    st = [akses_kejadian(kend, p)[0] for p in semua]
    ndin, nsulit = st.count("bebas") + st.count("kendala"), st.count("kendala")
    aktif = semua[:BARIS_MAKS]
    nm = nama_kejadian(semua, aktif)
    baris = [{"kejadian": nm(p), "prov": c.prov(p["prov"]), "luas": round(p["luas"]), "titik24": p["n24"],
              "gambut": "Gambut" if gambut_kejadian(c, p, kk, op) else "Bukan gambut", "akses": akses_kejadian(kend, p)[1]} for p in aktif]
    sa = [akses_kejadian(kend, p)[0] for p in aktif]
    sulit, bebas, belum = sa.count("kendala"), sa.count("bebas"), sa.count("belum")
    nama_belum = ", ".join(list(dict.fromkeys(p["kec"] for p, x in zip(aktif, sa) if x == "belum"))[:3])
    t = aktif[0]
    d = waktu(c.diam("meta")["data_terakhir"])
    tl = [("BNPB", f"Kirim water bombing lebih dulu ke {sulit} dari {len(baris)} kejadian terbesar yang jauh dari jalan utama atau sungai besar." if sulit
           else f"Pantau {len(baris)} kejadian terbesar; tidak ada yang tercatat berkendala akses."),
          ("Manggala Agni", f"Kirim regu darat ke {bebas} kejadian terbesar yang dinilai tanpa kendala akses." if bebas
           else f"Bangun pos lanjutan dekat {t['kec']} sebelum regu darat masuk.")]
    if belum:
        tl.append(("BNPB dan BPBD", f"Nilai akses {belum} kejadian terbesar yang belum dinilai ({nama_belum}) sebelum regu darat dikirim."))
    return dict(
        judul=f"{K(fid(len(semua)))} kejadian api aktif (ada titik panas 24 jam) tercatat sampai {wib(d)}, terbesar di {nm(t)} dengan sebaran titik sekitar {K(fid(bulat(t['luas'])) + ' ha')}",
        angka=[angka("Kejadian api aktif (ada titik panas 24 jam)", len(semua), ""),
               angka("Di lahan gambut (porsi gambut 50 persen atau lebih)", ngambut, "kejadian"),
               angka("Dengan kendala akses", nsulit, "kejadian", tampil=f"{fid(nsulit)} dari {fid(ndin)} kejadian yang dinilai")],
        kolom=[kol("kejadian", "Kecamatan"), kol("prov", "Provinsi"), kol("luas", "Sebaran titik (ha, dibulatkan)", "angka"),
               kol("titik24", f"Titik panas 24 jam sampai {tgl(d)}", "angka"), kol("gambut", "Lahan", "pill"), kol("akses", "Akses")],
        baris=baris,
        tindak_lanjut=tindak(*tl),
        sumber="NASA FIRMS (kejadian api dari titik panas berdekatan), peta gambut dan izin, OpenStreetMap (akses)",
        catatan=f"Kejadian api = titik panas berdekatan dalam 7 x 24 jam terakhir (sampai {wib(d)}); aktif = ada titik panas dalam 24 jam terakhir. Luas adalah sebaran titik, bukan luas terbakar. "
                f"Lahan gambut = porsi gambut 50 persen atau lebih. Akses baru dinilai untuk {fid(ndin)} dari {fid(len(semua))} kejadian (provinsi yang sering mengalami karhutla); "
                "sisanya belum dinilai, bukan berarti terjangkau. 'Jauh dari jalan utama' = lebih dari 2 km ke jalan utama menurut OpenStreetMap, jalan desa belum terdata; perkiraan, bukan survei lapangan.")


JENIS_IZIN = {"sawit": "Sawit", "pbph": "Hutan tanaman atau alam"}


def titik_perusahaan(p):
    return (p.get("cek") or {}).get("titik_terkini") or 0


def w_konsesi(c):
    a = c.j("aktor_karhutla")
    kk = c.j("kompleks_konsesi")
    # urut menurut pengukuran kita (titik VIIRS 7 hari di dalam batas izin); yang 0 titik hanya mengisi bila baris kurang
    ps = sorted(a["perusahaan"], key=lambda p: (-titik_perusahaan(p), -(p.get("peringkat") or 0)))
    if not ps or not titik_perusahaan(ps[0]):
        raise Kosong("tidak ada perusahaan dengan titik 7 hari di dalam batas izin")
    baris = [{"nama": p["nama"], "terkini": titik_perusahaan(p), "jenis": JENIS_IZIN.get(p["jenis"], p["jenis"]),
              "wilayah": ", ".join(x for x in (p.get("kab"), p.get("prov")) if x)} for p in ps[:BARIS_MAKS]]
    t = ps[0]
    jn = {x["jenis"]: x["n"] for x in kk["jenis"]}
    lain = sum(n for j, n in jn.items() if j not in ("sawit", "hti"))
    tot = kk["total"]["konsesi"]
    ac = wib(waktu(kk["acuan"]))
    bernama = sum(titik_perusahaan(p) for p in ps)
    pct = round(bernama / tot * 100) if tot else 0
    return dict(
        judul=f"Indikasi: {K(fid(tot))} titik panas berada di dalam batas izin dalam 7 x 24 jam sampai {ac}; di antara perusahaan yang namanya terdata, "
              f"terbanyak di areal {K(t['nama'])} ({K(fid(titik_perusahaan(t)) + ' titik')})",
        angka=[angka("Titik di dalam batas izin (7 x 24 jam)", tot, "titik"),
               angka("Di areal sawit", jn.get("sawit", 0), "titik"), angka("Di areal hutan tanaman", jn.get("hti", 0), "titik"),
               angka("Di jenis izin lain (hutan produksi, tambang)", lain, "titik")],
        kolom=[kol("nama", "Perusahaan"), kol("terkini", "Titik 7 x 24 jam terakhir di dalam batas izin", "angka"),
               kol("jenis", "Jenis izin", "pill"), kol("wilayah", "Wilayah")],
        baris=baris,
        tindak_lanjut=tindak(("Gakkum Kehutanan dan Kementerian Lingkungan Hidup", f"Verifikasi lapangan ke areal {t['nama']} dan {ps[1]['nama'] if len(ps) > 1 else 'perusahaan berikutnya'}."),
                             ("ATR/BPN", "Cocokkan batas izin terbaru dengan titik panas sebelum langkah hukum.")),
        sumber="Batas izin Kementerian Kehutanan via GFW dan Trase, titik panas NASA FIRMS VIIRS",
        catatan=f"Indikasi titik panas di dalam batas izin, bukan penetapan pelaku. Jendela 7 x 24 jam bergulir sampai {ac}, bukan hari kalender. Nama perusahaan hanya terdata untuk sebagian izin: {fid(bernama)} dari {fid(tot)} titik ({pct}%) "
                "berada di izin yang perusahaannya terdata, jadi peringkat hanya berlaku di antara perusahaan itu. Satu titik bisa masuk lebih dari satu jenis izin, "
                "maka jumlah per jenis tidak sama dengan total. Batas izin berumur (sawit dan HPH sekitar 2014) dan bisa sudah berubah.")


def ratusan(x):
    """panjang kanal perkiraan kasar -> ratusan km terdekat"""
    return int(round(x / 100.0)) * 100


def tgl_aktif_khg(j):
    """tanggal data 'kejadian api tercatat' di khg_prioritas.json (operasi.json per tanggal itu), beda dengan akhir jendela titik"""
    m = re.search(r"kompleks operasi\.json \(per (\d{4}-\d\d-\d\d)", j.get("catatan") or "")
    d = dt.date.fromisoformat(m.group(1) if m else j["per"])
    return f"{d.day} {BULAN[d.month - 1]}"


def w_gambut(c):
    j = c.j("khg_prioritas")
    ks = sorted((k for k in j["khg"] if k["titik_7h"] > 0), key=lambda k: -k["titik_7h"])
    if not ks:
        raise Kosong("tidak ada KHG dengan titik panas 7 hari")
    tot = sum(k["titik_7h"] for k in j["khg"])
    t = ks[0]
    akhir = dt.date.fromisoformat(j["jendela_7h"][1])
    return dict(
        per=iso(waktu(akhir.isoformat())),
        judul=f"{K(t['nama'])} paling banyak titik panas, {K(fid(t['titik_7h']) + ' titik')} dalam 7 hari sampai {tgl(akhir)}",
        angka=[angka("Titik panas 7 hari di semua kawasan hidrologis gambut (KHG)", tot, "titik"), angka("Kawasan yang bertitik panas", len(ks), "KHG"),
               angka("Titik panas 7 hari di KHG teratas", t["titik_7h"], "titik")],
        kolom=[kol("nama", "KHG"), kol("prov", "Provinsi"), kol("t7", f"Titik 7 hari (sampai {akhir.day} {BULAN[akhir.month - 1]})", "angka"), kol("t30", "Titik 30 hari", "angka"),
               kol("aktif", f"Kejadian api aktif ({tgl_aktif_khg(j)})", "angka"), kol("kanal", "Kanal (km, perkiraan)", "angka")],
        baris=[{"nama": k["nama"], "prov": k["prov_nama"], "t7": k["titik_7h"], "t30": k["titik_30h"], "aktif": k["kompleks_aktif"],
                "kanal": ratusan(k["kanal_km"])} for k in ks[:BARIS_MAKS]],
        tindak_lanjut=tindak(("BRGM", f"Basahi gambut dan pasang sekat kanal di {t['nama']} lebih dulu (sekitar {fid(ratusan(t['kanal_km']))} km kanal)."),
                             (f"Gubernur {t['prov_nama']}", "Larang pembukaan lahan dengan api di KHG ini sampai hujan turun.")),
        sumber="BRGM PRIMS (poligon KHG), NASA FIRMS (titik panas), OpenStreetMap (kanal)",
        catatan="Titik panas = deteksi semua sensor (MODIS, S-NPP, NOAA-20), jendela 7 hari sampai hari terakhir yang lengkap. Panjang kanal perkiraan kasar dari OpenStreetMap, belum lengkap, "
                "dibulatkan ke ratusan km. Poligon KHG disederhanakan untuk tampilan, titik dekat tepi bisa masuk atau keluar secara keliru.")


def rentang_persen(p10, p90):
    """-> (arah, teks rentang) dari rentang anomali hujan p10..p90 (persen terhadap normal)"""
    if p90 <= 0:
        return "di bawah", f"{fid(round(-p90))} sampai {fid(round(-p10))} persen"
    if p10 >= 0:
        return "di atas", f"{fid(round(p10))} sampai {fid(round(p90))} persen"
    return "di bawah", f"dari {fid(round(-p10))} persen di bawah sampai {fid(round(p90))} persen di atas normal"


def w_cuaca(c):
    cu, hh, d0 = cuaca_prov(c)
    p = c.j("peluang")
    io = c.j("iklim_outlook")
    ks = sorted(cu, key=lambda k: (-round(cu[k][1] * 100), -round(cu[k][0] * 100)))   # porsi sangat tinggi dulu, lalu tinggi, sesuai angka di tabel
    if not ks:
        raise Kosong("peluang.json tanpa provinsi")
    sangat = [k for k in ks if cu[k][1] >= 0.5]
    roni, dmi = io["keadaan_sekarang"]["roni"]["nilai"], io["keadaan_sekarang"]["dmi"]
    bln = c.sekarang.strftime("%Y-%m")
    pk = next((x for x in io["prakiraan"] if x["bulan_tengah"] == bln), io["prakiraan"][0])
    wl = pk["wilayah"].get("kalbar_kalteng") or {}
    w = wl.get("anom_pct")
    enso = "El Niño" if roni >= 0.5 else "La Niña" if roni <= -0.5 else "ENSO netral"
    iod = "IOD positif" if dmi >= 0.4 else "IOD negatif" if dmi <= -0.4 else "IOD netral"
    nama = lambda k: c.prov(k)

    def puncak(k):   # tanggal hari dengan porsi FWI 14 ke atas tertinggi di provinsi k
        h = max(p["wilayah"][k]["hari"], key=lambda x: x["p"][1])
        d = dt.date.fromisoformat(h["t"])
        return f"{d.day} {BULAN[d.month - 1]}"
    r_ = io["keadaan_sekarang"]["roni"]
    md = re.search(r"sampai (\d{4}-\d\d-\d\d)", io["keadaan_sekarang"].get("dmi_asal") or "")
    dmi_per = f", rata-rata 4 minggu sampai {tgl(dt.date.fromisoformat(md.group(1)))}" if md else ""
    ang = [angka(f"Provinsi dengan separuh wilayah atau lebih FWI sangat tinggi pada puncaknya, dari {len(cu)} yang dipantau", len(sangat), "provinsi"),
           angka(f"RONI (Pasifik), musim {r_['musim']} {r_['tahun']}", roni, f"°C, {enso}", tampil=f"{fid(roni, 2)} °C, {enso}"),
           angka(f"DMI (Samudra Hindia){dmi_per}", dmi, f"°C, {iod}", tampil=f"{fid(dmi, 2)} °C, {iod}")]
    if w is not None:
        arah, rg = rentang_persen(wl["p10"], wl["p90"]) if wl.get("p10") is not None else ("di bawah" if w < 0 else "di atas", None)
        ang.append(angka(f"Perkiraan hujan {pk['label'].replace(' - ', ' sampai ')}, Kalimantan Barat dan Tengah", abs(w),
                         f"persen {arah} normal", tampil=f"sekitar {fid(bulat(abs(w), 1))} persen {arah} normal" + (f" (rentang {rg})" if rg else "")))
    return dict(
        per=iso(waktu(p["dibuat"])),
        judul=f"{K(str(len(sangat)) + ' dari ' + str(len(cu)) + ' provinsi')} yang dipantau diperkirakan separuh wilayahnya berbahaya api sangat tinggi pada puncaknya dalam {hh} hari dari {tgl(d0)}, "
              f"dan {enso} dengan {iod} diperkirakan membuat musim lebih kering",
        angka=ang[:ANGKA_MAKS],
        kolom=[kol("prov", "Provinsi"), kol("sangat", "Wilayah FWI 14 ke atas pada puncaknya", "persen"), kol("hari", "Hari puncaknya"),
               kol("tinggi", "Wilayah FWI 7 ke atas pada puncaknya", "persen"), kol("fwi", "FWI tengah pada puncaknya", "angka")],
        baris=[{"prov": nama(k), "sangat": round(cu[k][1] * 100), "hari": puncak(k), "tinggi": round(cu[k][0] * 100), "fwi": round(cu[k][2], 1)} for k in ks[:BARIS_MAKS]],
        tindak_lanjut=tindak(("BMKG", f"Semai awan (modifikasi cuaca) di {nama(ks[0])} dan {nama(ks[1]) if len(ks) > 1 else 'wilayah rawan'} bila awan hujan tersedia."),
                             ("BNPB", f"Siapkan pasokan air dan helikopter di {', '.join(nama(k) for k in ks[:3])}.")),
        sumber="ECMWF IFS ansambel 51 anggota lewat Open-Meteo dan sistem FWI Kanada; CHIRPS (UCSB) dan NOAA (RONI, DMI)",
        catatan="FWI = indeks cuaca api Kanada. Angka tabel adalah puncak harian dalam jendela waktu itu, hari puncaknya bisa berbeda tiap provinsi. Peluang dihitung sebagai bagian wilayah yang melewati ambang FWI, "
                "bukan peluang adanya api. Keandalannya belum diuji terhadap kejadian titik panas.")


def kualitas_mod():
    sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "udara"))
    import kualitas   # ambang ISPU PM2,5 yang sama dengan modul udara (Permen LHK P.14/2020)
    return kualitas


def ambang_pm():
    """batas bawah kelas tidak sehat, sangat tidak sehat, berbahaya (55,5 / 150,5 / 250,5) dari BATAS modul udara (batas ATAS kelas 55,4 / 150,4 / 250,4)"""
    B = kualitas_mod().BATAS
    return [round(B[i] + 0.1, 1) for i in (1, 2, 3)]


def hari_asap(c, u):
    """hari data yang ditampilkan: yang terdekat dengan hari ini"""
    return min(u["hari"], key=lambda x: abs((dt.date.fromisoformat(x) - c.sekarang.date()).days))


def agregat_rawan(t, rw):
    """jumlahkan kecamatan terpapar hanya di provinsi yang sering mengalami karhutla; semua PM2,5 CAMS dari semua sumber"""
    ps = {k: v for k, v in t["prov"].items() if k in rw}
    S = lambda f: sum(v.get(f) or 0 for v in ps.values())
    return dict(prov=ps, penduduk=S("penduduk"), siswa=S("siswa"), faskes=S("faskes"), kec=S("kec"),
                kec_sekolah=sum(v.get("kec_tercakup_sekolah", v["kec"]) for v in ps.values()),   # kunci hilang bila cakupan penuh (banjir/dampak.py)
                kec_faskes=sum(v.get("kec_tercakup_faskes", v["kec"]) for v in ps.values()))


def w_asap(c):
    u = c.j("udara_dampak")
    rw = rawan(c)
    hari = u["hari"]
    h = hari_asap(c, u)
    i = hari.index(h)
    t = agregat_rawan(u["terpapar"][h], rw)
    sb = agregat_rawan(u["terpapar"][hari[i - 1]], rw) if i else None
    luar = u["terpapar"][h]["penduduk"] - t["penduduk"]
    jawa = sum(v["penduduk"] for k, v in u["terpapar"][h]["prov"].items() if k in ("31", "32", "33", "34", "35", "36"))
    pr = sorted(t["prov"].items(), key=lambda kv: -kv[1]["penduduk"])[:BARIS_MAKS]
    if not pr or not t["penduduk"]:
        raise Kosong("tidak ada penduduk terpapar di provinsi yang sering mengalami karhutla")
    d = dt.date.fromisoformat(h)
    ke_depan = d > waktu(u["dibuat"]).date()
    pend = bulat(t["penduduk"])
    kata = f"perkiraan model untuk {tgl(d)}" if ke_depan else f"perkiraan model, {tgl(d)}"
    lalu = lambda f: (sb and sb[f])
    pb = f"perkiraan {tgl(dt.date.fromisoformat(hari[i - 1]))}" if i else ""
    am = ambang_pm()
    sis, fas = bawah(t["siswa"]), bawah(t["faskes"])
    return dict(
        per=iso(waktu(u["dibuat"])),
        judul=f"Sekitar {K(juta(pend))} penduduk di provinsi yang sering mengalami karhutla tinggal di kecamatan dengan PM2,5 tidak sehat ({kata})",
        angka=[angka("Penduduk terpapar (perkiraan)", pend, "orang", tampil=banding(f"sekitar {juta(pend)} orang", ubah(t["penduduk"], lalu("penduduk")), pb)),
               angka("Siswa terpapar (batas bawah)", sis, "siswa", tampil=banding(f"paling sedikit {juta(sis)} siswa", ubah(t["siswa"], lalu("siswa")), pb)),
               angka("Fasilitas kesehatan terpapar (batas bawah)", fas, "fasilitas", tampil=banding(f"paling sedikit {juta(fas)} fasilitas", ubah(t["faskes"], lalu("faskes")), pb))],
        kolom=[kol("prov", "Provinsi"), kol("penduduk", "Penduduk", "angka"), kol("siswa", "Siswa", "angka"), kol("faskes", "Fasilitas kesehatan", "angka")],
        baris=[{"prov": c.prov(k), "penduduk": v["penduduk"], "siswa": v.get("siswa"), "faskes": v.get("faskes")} for k, v in pr],
        tindak_lanjut=tindak(("Kemenkes", f"Bagikan masker dan siagakan layanan ISPA di {c.prov(pr[0][0])} dan provinsi terpapar lain yang sering mengalami karhutla."),
                             ("Kemendikdasmen", "Izinkan belajar dari rumah di sekolah pada kecamatan terpapar sampai udara membaik.")),
        sumber="CAMS (Copernicus) lewat Open-Meteo, WorldPop 2026, Dapodik dan EMIS (sekolah), OpenStreetMap (fasilitas kesehatan)",
        catatan=f"Perkiraan model, belum dikoreksi stasiun{'; tanggal ini perkiraan ke depan, bukan pengukuran' if ke_depan else ''}. PM2,5 dari semua sumber (CAMS), bukan hanya kebakaran, "
                f"jadi angka dibatasi ke provinsi yang sering mengalami karhutla; provinsi lain dikeluarkan karena PM2,5-nya sebagian besar bukan dari kebakaran "
                f"({juta(luar)} penduduk terpapar di provinsi lain, {juta(jawa)} di antaranya di Jawa). Tidak sehat = rata-rata 24 jam {fid(am[0], 1)} mikrogram per meter kubik atau lebih "
                f"(Permen LHK P.14/2020: tidak sehat {fid(am[0], 1)} sampai {fid(am[1] - .1, 1)}, sangat tidak sehat {fid(am[1], 1)} sampai {fid(am[2] - .1, 1)}, berbahaya mulai {fid(am[2], 1)}). "
                f"Model beresolusi kasar (sel 1 derajat, sekitar 110 km), jadi angka kecamatan terpapar hanya perkiraan kasar. Tanda – berarti belum terpetakan. "
                f"Sekolah baru terpetakan di {fid(t['kec_sekolah'])} dan fasilitas kesehatan di {fid(t['kec_faskes'])} dari {fid(t['kec'])} kecamatan terpapar, jadi angkanya batas bawah."
                )


ORDE_JENIS = ["tutup", "batal", "divert", "rtb", "tunda", "jarak_pandang", "lain"]   # keparahan, terparah dulu: pemutus seri "jenis terbanyak"


def per_bandara(p):
    """{kode bandara: {n, j: {jenis: n}, akhir}} untuk bandara di Indonesia yang punya koordinat; berita tanpa bandara jelas atau di luar negeri (JHB) tidak masuk"""
    per = {}
    for k in p["kejadian"]:
        b = p["bandara"].get(k["bandara"]) if k["bandara"] else None
        if not b or b.get("lat") is None or b.get("lon") is None or not b.get("prov"):
            continue
        q = per.setdefault(k["bandara"], {"n": 0, "j": {}, "akhir": ""})
        q["n"] += 1
        q["akhir"] = max(q["akhir"], k["tgl"])
        for jn in k["jenis"]:
            q["j"][jn] = q["j"].get(jn, 0) + 1
    return per


def nama_bandara(n):
    """nama ringkas: tanpa 'International Airport', 'Airport', dan nama pangkalan udara di belakang ' / '"""
    return re.sub(r"\s*\b(International |Domestic )?Airport\b", "", n.split(" / ")[0]).strip() or n


def jenis_terbanyak(v):
    """jenis gangguan terbanyak; seri dipecah menurut keparahan (ORDE_JENIS)"""
    return max(v["j"], key=lambda j: (v["j"][j], -ORDE_JENIS.index(j) if j in ORDE_JENIS else -99)) if v["j"] else None


def w_penerbangan(c):
    p = c.j("penerbangan")
    ks = p["kejadian"]
    if not ks:
        raise Kosong("tidak ada kejadian tercatat")
    ref = max(dt.date.fromisoformat(k["tgl"]) for k in ks)
    dalam = lambda k, a, b: a <= (ref - dt.date.fromisoformat(k["tgl"])).days <= b
    n7, n14 = sum(1 for k in ks if dalam(k, 0, 6)), sum(1 for k in ks if dalam(k, 7, 13))
    per = per_bandara(p)
    if not per:
        raise Kosong("tidak ada bandara di Indonesia yang tercatat terdampak")
    urut = sorted(per.items(), key=lambda kv: -kv[1]["n"])
    nj = p["nama_jenis"]
    nama = lambda kode: nama_bandara(p["bandara"].get(kode, {}).get("nama", kode))
    mulai = dt.date.fromisoformat(p["mulai_musim"])
    tanpa = len(ks) - sum(v["n"] for v in per.values())
    return dict(
        judul=f"Berita mencatat {K(fid(len(ks)))} gangguan penerbangan yang dikaitkan dengan asap sejak {tgl(mulai)} sampai {tgl(ref)}, terbanyak di {nama(urut[0][0])}",
        angka=[angka("Gangguan musim ini", len(ks), "kejadian"), angka(f"Gangguan 7 hari sampai {tgl(ref)}", n7, "kejadian", tampil=banding(f"{fid(n7)} kejadian", ubah(n7, n14), "7 hari sebelumnya")),
               angka("Terdampak asap (di Indonesia, tercatat di berita)", len(per), "bandara"),
               angka("Berita pembatalan penerbangan", sum(1 for k in ks if "batal" in k["jenis"]), "berita")],
        kolom=[kol("bandara", "Bandara"), kol("n", "Gangguan", "angka"), kol("jenis", "Jenis terbanyak", "pill"), kol("akhir", "Terakhir")],
        baris=[{"bandara": f"{nama(k)} ({k})", "n": v["n"], "jenis": nj.get(jenis_terbanyak(v), "Terganggu"), "akhir": tgl(dt.date.fromisoformat(v["akhir"]))}
               for k, v in urut[:BARIS_MAKS]],
        tindak_lanjut=tindak(("Kemenhub", f"Siapkan bandara alternatif dan prosedur jarak pandang rendah di {nama(urut[0][0])}."),
                             ("BMKG", "Kirim prakiraan jarak pandang tiap 6 jam ke otoritas bandara yang paling sering terganggu.")),
        sumber="Judul berita Google News, METAR lewat Iowa Environmental Mesonet",
        catatan=f"Disusun dari judul berita, bukan data resmi bandara atau maskapai, jadi angkanya batas bawah. Pembatalan dihitung per berita, bukan per penerbangan. "
                f"{fid(tanpa)} gangguan tanpa bandara yang jelas atau di luar Indonesia tidak masuk tabel dan peta. Jenis terbanyak yang seri dipilih yang lebih parah.")


def kira(x):
    """perkiraan model -> dua angka penting, titik ribuan, koma desimal untuk yang kecil ('220.000', '1,2', '0,23')"""
    v = bulat(x)
    return fid(v, 0 if abs(v) >= 10 else 1 if abs(v) >= 1 else 2)


def rentang_besar(lo, hi):
    """'0,5 sampai 2,4 juta' bila hi >= 1 juta, selain itu angka biasa"""
    return f"{fid(lo / 1e6, 1)} sampai {fid(hi / 1e6, 1)} juta" if hi >= 1e6 else f"{kira(lo)} sampai {kira(hi)}"


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
    r3_ = op["ringkas_T3"]
    semua, opt, pes = r3_["tengah"], r3_["optimis"], r3_["pesimis"]
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
        baris.append({"prov": c.prov(k), "regu": round(hit[k]["regu"], -1), "butuh": ratusan(hit[k]["personel"]), "ada": ada, "posko": nposko.get(k, 0), "status": st})
    rentang = lambda f, a=None: f"{kira(opt[f])} sampai {kira(pes[f])}"
    return dict(
        judul=f"Menangani {fid(len(op['kompleks']))} kejadian api yang dinilai operasi (teramati dalam 24 jam atau di gambut) sampai {tgl(tg(c, 'operasi'))} dalam {T_OPERASI} hari butuh sekitar {K(kira(semua['personel']) + ' personel')} (perkiraan skenario tengah, "
              f"{rentang('personel')} menurut skenario optimis sampai pesimis), terbesar di {c.prov(urut[0])}",
        angka=[angka("Regu dibutuhkan (perkiraan)", bulat(semua["regu"]), "regu", tampil=f"sekitar {kira(semua['regu'])} regu ({rentang('regu')})"),
               angka("Personel dibutuhkan (perkiraan)", bulat(semua["personel"]), "personel", tampil=f"sekitar {kira(semua['personel'])} personel ({rentang('personel')})"),
               angka("Helikopter water bombing dibutuhkan (perkiraan)", semua["heli"], "unit", tampil=f"sekitar {kira(semua['heli'])} unit ({rentang('heli')})"),
               angka("Lokasi posko usulan", len(po["posko"]), "lokasi")],
        kolom=[kol("prov", "Provinsi"), kol("regu", "Regu dibutuhkan (perkiraan, dibulatkan)", "angka"), kol("butuh", "Personel dibutuhkan (perkiraan, dibulatkan)", "angka"),
               kol("ada", "Personel tercatat BNPB", "angka"), kol("posko", "Lokasi posko usulan", "angka"), kol("status", "Status", "pill")],
        baris=baris,
        tindak_lanjut=tindak(("BNPB", f"Rotasikan regu ke {c.prov(urut[0])} dan {c.prov(urut[1]) if len(urut) > 1 else 'provinsi berikutnya'}, kebutuhan terbesar."),
                             ("TNI dan Polri", f"Tambah personel pendukung di {', '.join(kurang[:3])}, tercatat kurang dari kebutuhan." if kurang
                              else "Pastikan personel yang tercatat BNPB benar-benar siaga di lapangan; rekap belum ada di sebagian provinsi.")),
        sumber="Perkiraan platform dari citra NASA FIRMS dan koefisien terbuka (Permen LHK P.32/2016, NWCG), rekap personel BNPB, rekomendasi lokasi posko platform",
        catatan=f"Kebutuhan adalah perkiraan model perencanaan untuk target {T_OPERASI} hari, bukan perintah operasi; angka utama skenario tengah, rentang dari skenario optimis sampai pesimis. "
                "Lokasi posko usulan adalah rekomendasi algoritma platform (cakupan 30 km), bukan posko yang sudah ada. Tabel provinsi dibulatkan; status membandingkan personel tercatat dengan kebutuhan skenario tengah. "
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
    sh = kg["sektor"]["kesehatan"]
    rp = lambda v: "Rp" + kira(v / T)
    return dict(
        judul=f"Perkiraan model: kebakaran sejak {tgl(mulai)} sampai {tgl(tg(c, 'dampak'))} merugikan sekitar {K('Rp' + fid(rugi) + ' triliun')} "
              f"(rentang {rp(kg['total'][0])} sampai {rp(kg['total'][2])} triliun) dan melepas sekitar {K(fid(co2) + ' juta ton')} CO2e "
              f"(rentang {kira(em['mt_co2e'][0])} sampai {kira(em['mt_co2e'][2])} juta ton)",
        angka=[angka(f"Luas terbakar perkiraan sejak {tgl(mulai)} (model, beda dengan angka resmi SiPongi)", bulat(mu["ha"][1]), "ha",
                     tampil=f"sekitar {juta(mu['ha'][1])} ha ({rentang_besar(mu['ha'][0], mu['ha'][2])})"),
               angka("Kerugian ekonomi perkiraan", rugi, "triliun rupiah", tampil=f"sekitar {rp(kg['total'][1])} triliun ({rp(kg['total'][0])} sampai {rp(kg['total'][2])} triliun)"),
               angka("Emisi perkiraan", co2, "juta ton CO2e", tampil=f"sekitar {fid(co2)} juta ton CO2e ({kira(em['mt_co2e'][0])} sampai {kira(em['mt_co2e'][2])} juta)"),
               angka("Kerugian kesehatan perkiraan", bulat(sh[1] / T), "triliun rupiah", tampil=f"sekitar {rp(sh[1])} triliun ({rp(sh[0])} sampai {rp(sh[2])} triliun)")],
        kolom=[kol("sektor", "Sektor"), kol("rendah", "Rendah (triliun rupiah)", "angka"), kol("tengah", "Tengah (triliun rupiah)", "angka"), kol("tinggi", "Tinggi (triliun rupiah)", "angka")],
        baris=[{"sektor": NAMA.get(k, k), "rendah": round(v[0] / T, 1), "tengah": round(v[1] / T, 1), "tinggi": round(v[2] / T, 1)} for k, v in sek],
        tindak_lanjut=tindak(("Bappenas", "Masukkan kerugian karhutla tahun ini ke dasar perencanaan anggaran pencegahan tahun depan."),
                             ("Kemenkeu", "Siapkan dana siap pakai untuk pemulihan di provinsi dengan kerugian terbesar.")),
        sumber="Perkiraan platform dari NASA FIRMS dan regresi luas resmi SiPongi (Kementerian Kehutanan); nilai satuan Bank Dunia 2016 dan 2019; emisi gambut Rodriguez Vasquez dkk. 2021",
        catatan="Perkiraan model dengan tiga skenario (angka utama = tengah), bukan kerugian yang sudah dibayar atau dicatat resmi. Luas dihitung dari titik panas MODIS sejak "
                f"{tgl(mulai)} dikali rasio hektare per titik historis (sebagian provinsi diselaraskan dengan regresi luas resmi), jadi definisinya beda dengan "
                "angka resmi SiPongi di kartu Luas terbakar. Tabel menampilkan 10 sektor terbesar.")


def w_luas(c):
    j = c.j("luas_resmi")
    th = j["tahun"]
    tot = [sum(v[i] for v in j["ha"].values()) for i in range(len(th))]
    i, ia = len(th) - 1, len(th) - 2
    sampai = waktu(j["sampai"][th[i]])
    bl = f"{BULAN[sampai.month - 1]}"
    terburuk = max(range(ia + 1), key=lambda x: tot[x])
    urut = sorted(j["ha"].items(), key=lambda kv: -kv[1][i])[:BARIS_MAKS]
    return dict(
        judul=f"Kementerian Kehutanan (SiPongi) mencatat {K(fid(tot[i]) + ' ha')} terbakar sampai {BULAN_PENUH[sampai.month - 1]} {sampai.year}, belum termasuk puncak kemarau; "
              f"setahun penuh {th[terburuk]} mencapai {K(fid(tot[terburuk] / 1e6, 1) + ' juta ha')}, tertinggi dalam data {th[0]} sampai {th[i]}",
        angka=[angka(f"{th[i]} sampai {bl} (resmi)", round(tot[i]), "ha"), angka(f"{th[ia]} setahun (resmi)", round(tot[ia]), "ha"),
               angka(f"{th[terburuk]} setahun (resmi)", round(tot[terburuk]), "ha")],
        grafik={"jenis": "batang", "label": th[:i] + [f"{th[i]} (s.d. {bl})"], "seri": [{"nama": "Luas terbakar resmi", "nilai": [round(x) for x in tot]}], "satuan": "ha"},
        kolom=[kol("prov", "Provinsi"), kol("ini", f"{th[i]} sampai {bl} (ha)", "angka"), kol("lalu", f"{th[ia]} setahun (ha)", "angka")],
        baris=[{"prov": c.prov(k), "ini": round(v[i]), "lalu": round(v[ia])} for k, v in urut],
        tindak_lanjut=tindak(("Kementerian Kehutanan", f"Perbarui data SiPongi {th[i]} sampai akhir kemarau; angka resmi baru sampai {BULAN_PENUH[sampai.month - 1]}."),
                             ("BNPB", "Samakan angka luas terbakar dengan Kementerian Kehutanan sebelum dipakai untuk status darurat.")),
        sumber="SiPongi (Kementerian Kehutanan; sebelum Oktober 2024 KLHK), angka resmi luas terbakar",
        catatan=f"Angka resmi {th[i]} baru sampai {BULAN_PENUH[sampai.month - 1]} dan belum mencakup puncak kemarau. Kartu ini hanya memuat angka resmi; perkiraan luas dari satelit "
                "berbeda definisi dan ada di kartu Dampak.")


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
    rata_k = f"Rata-rata titik per tahun, {th[0]} sampai {th[ini - 1]}"
    return dict(
        judul=f"{K(fid(len(lg)) + ' kecamatan')} langganan karhutla kembali tercatat titik panas tahun ini sampai {tgl(tg(c, 'sejarah'))}, terbesar {kec}, {kab} dengan {K(fid(n) + ' titik')} "
              f"(paling sedikit {TITIK_TAHUN} titik di {ul} dari {ini} tahun)",
        angka=[angka("Langganan kembali bertitik panas", len(lg), "kecamatan"),
               angka("Titik panas di kecamatan itu tahun ini", sum(x[1] for x in lg), "titik")],
        kolom=[kol("kec", "Kecamatan"), kol("prov", "Provinsi"), kol("ini", f"Titik {th[ini]}", "angka"),
               kol("ulang", f"Tahun bertitik panas dari {ini}", "angka"), kol("rata", rata_k, "angka")],
        baris=[{"kec": f"{k.split('|')[2]}, {k.split('|')[1]}", "prov": c.prov(k.split("|")[0]), "ini": a, "ulang": u, "rata": round(r)} for k, a, u, r in lg[:BARIS_MAKS]],
        tindak_lanjut=tindak((f"Pemda {kab}", f"Jadikan {kec} lokasi program pencegahan permanen: sekat kanal, patroli desa, dan Masyarakat Peduli Api."),
                             (f"BPBD {c.prov(pr)}", "Dirikan posko permanen di kecamatan langganan sebelum musim kemarau tahun depan.")),
        sumber="NASA FIRMS (VIIRS S-NPP) per kecamatan, batas wilayah BIG",
        catatan=f"Langganan = tercatat titik panas (paling sedikit {TITIK_TAHUN} titik setahun) pada {MIN_ULANG} tahun lalu atau lebih, dan {MIN_INI} titik atau lebih tahun ini. Titik panas bukan luas terbakar.")


def tenggat_teks(bulan, ref):
    """bulan tenggat (0-11) -> 'Nov 2026': kemunculan berikutnya pada atau setelah bulan data `ref`"""
    return f"{BULAN[bulan]} {ref.year if bulan >= ref.month - 1 else ref.year + 1}"


def w_pencegahan(c):
    p = c.j("preventif")
    ps = sorted(p["prov"].items(), key=lambda kv: -kv[1]["biaya"][1])
    if not ps:
        raise Kosong("preventif.json tanpa provinsi")
    M = 1e9
    lo, hi = (round(sum(v["biaya"][i] for _, v in ps) / 1e12, 1) for i in (0, 1))   # satu nilai untuk judul dan angka[]
    kec = sum(v["n"] for _, v in ps)
    k0, v0 = ps[0]
    ref = tg(c, "preventif")
    tg_ = lambda v: tenggat_teks(v["tenggat"], ref) if v.get("tenggat") is not None else "-"
    return dict(
        judul=f"Pencegahan permanen di {K(fid(kec) + ' kecamatan sasaran')} pada {len(ps)} provinsi yang sering mengalami karhutla diperkirakan butuh {K('Rp' + fid(lo, 1) + ' sampai Rp' + fid(hi, 1) + ' triliun')} (data per {tgl(ref)})",
        angka=[angka("Biaya batas bawah (perkiraan)", lo, "triliun rupiah"), angka("Biaya batas atas (perkiraan)", hi, "triliun rupiah"),
               angka("Sasaran pencegahan", kec, "kecamatan")],
        kolom=[kol("prov", "Provinsi"), kol("n", "Kecamatan sasaran", "angka"), kol("pola", "Pola utama", "pill"),
               kol("lo", "Biaya bawah (miliar rupiah)", "angka"), kol("hi", "Biaya atas (miliar rupiah)", "angka"), kol("siap", "Siap sebelum")],
        baris=[{"prov": v.get("nama", c.prov(k)), "n": v["n"], "pola": max(v["pola"], key=lambda x: x[1])[0] if v["pola"] else "-",
                "lo": round(v["biaya"][0] / M), "hi": round(v["biaya"][1] / M), "siap": tg_(v)} for k, v in ps[:BARIS_MAKS]],
        tindak_lanjut=tindak(("Bappenas", f"Masukkan paket pencegahan {v0.get('nama', c.prov(k0))} ke anggaran tahun depan, biaya terbesar."),
                             ("Kemendagri", f"Dorong pemda menyelesaikan '{v0['aksi'][0] if v0.get('aksi') else 'aksi prioritas'}' sebelum {tg_(v0) if v0.get('tenggat') is not None else 'musim kemarau'}.")),
        sumber="NASA FIRMS MODIS 2002 sampai sekarang, peta gambut dan izin, OpenStreetMap, WorldPop, biaya satuan terbuka (BRGM, LPDS, Mongabay)",
        catatan="Perkiraan perencanaan, bukan rencana anggaran biaya. Biaya satuan dan sumbernya tertulis di dokumen paket pencegahan platform. "
                "Tenggat = dua bulan sebelum awal musim api di provinsi itu; tahun dihitung dari tanggal data.")


def umur_kata(jam_):
    return f"sekitar {round(jam_ / 24)} hari" if jam_ >= 48 else f"{round(jam_)} jam"


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
    tua = next((r for r in rows if r["umur"] is not None), None)   # urut umur/ambang: yang rasionya terbesar dulu, BUKAN yang tertua mutlak
    for r in rows:
        r.pop("_r")
    luas_ = next(r for r in rows if r["sumber"] == WAKTU["luas_resmi"][0])
    tabel = rows[:BARIS_MAKS]
    if luas_ not in tabel:   # luas SiPongi tetap tampil di tabel
        tabel[-1] = luas_
    c.dipakai.update(n for n in WAKTU if n in c.cache and c.cache[n] is not None)
    if tua:
        hari = tua["ambang"] >= 48
        sat = "hari" if hari else "jam"
        u_, a_ = (round(tua["umur"] / 24), round(tua["ambang"] / 24)) if hari else (tua["umur"], tua["ambang"])
        rasio = f"{u_} {sat}, batasnya {a_} {sat}" if tua["status"] == "Basi" else f"{u_} dari {a_} {sat}"
        peran = "paling terlambat" if tua["status"] == "Basi" else "paling dekat batasnya"
    return dict(
        per=iso(c.sekarang),   # waktu pemeriksaan, bukan sumber tertua
        judul=f"Per {tgl(c.sekarang)}, {K(str(len(basi)) + ' dari ' + str(len(rows)))} sumber data melewati batas kesegarannya"
              + (f"; {peran}: {tua['sumber'][:1] + tua['sumber'][1:]}, {rasio}" if tua else ""),
        angka=[angka("Sumber basi atau hilang", len(basi), "sumber"), angka("Sumber segar", len(rows) - len(basi), "sumber")]
              + ([angka(f"Sumber {peran}: {tua['sumber']}", tua["umur"], "hari" if hari else "jam", tampil=rasio)] if tua else []),
        kolom=[kol("sumber", "Sumber"), kol("umur", "Umur (jam)", "angka"), kol("ambang", "Batas (jam)", "angka"), kol("status", "Status", "pill")],
        baris=tabel,
        tindak_lanjut=tindak(("Pengelola platform", f"Periksa pembaruan {basi[0]['sumber']}." if basi else "Tidak ada tindakan; semua sumber segar.")),
        sumber="Catatan waktu pembaruan tiap sumber data",
        catatan="Batas kesegaran mengikuti jadwal tiap sumber (3 jam, harian, mingguan, atau tahunan), ditambah toleransi; tabel diurut dari yang paling dekat atau melewati batasnya. "
                "Luas terbakar resmi SiPongi memang lama karena baru dirilis sampai Juli.")


ROB_LV = {1: "Waspada", 2: "Siaga", 3: "Awas"}


def w_rob(c):
    r = c.j("../banjir/data/rob_presiden")
    kab = r["kab"]
    if not kab:
        raise Kosong("tidak ada kabupaten atau kota pesisir berisiko dalam 14 hari")
    mulai = dt.date.fromisoformat(r["mulai"])
    akhir = mulai + dt.timedelta(days=r["hari"] - 1)
    basi = r["model_basi"]

    def puncak(k):
        return next((h for h in k["hari"] if h["puncak"]), k["hari"][0])
    cacah = {}
    for k in kab:
        t = puncak(k)["tgl"]
        cacah[t] = cacah.get(t, 0) + 1
    tp = dt.date.fromisoformat(min(cacah, key=lambda t: (-cacah[t], t)))
    lv = [k for k in kab if (k["lv_maks"] or 0) >= 1]
    tanpa_posko = sum(1 for k in kab if not k["posko"])
    if basi or not lv:
        judul = f"Pasang astronomis tinggi diperkirakan di {K(fid(len(kab)))} kabupaten dan kota pesisir pada {tgl(mulai)} sampai {tgl(akhir)}, puncaknya {tgl(tp)}"
        angka_ = [angka("Kabupaten dan kota pesisir pasang tinggi (astronomis)", len(kab), "kabupaten dan kota")]
    else:
        judul = f"{K(fid(len(lv)))} kabupaten dan kota pesisir berpotensi rob pada {tgl(mulai)} sampai {tgl(akhir)}, {fid(sum(1 for k in kab if k['lv_maks'] >= 2))} di antaranya level Siaga atau Awas"
        angka_ = [angka("Kabupaten dan kota berpotensi rob", len(lv), "kabupaten dan kota"),
                  angka("Level Siaga atau Awas", sum(1 for k in kab if (k["lv_maks"] or 0) >= 2), "kabupaten dan kota")]
    angka_ += [angka("Puncak pasang terbanyak", cacah[tp.isoformat()], "kabupaten dan kota", tampil=f"{tgl(tp)}, {fid(cacah[tp.isoformat()])} kabupaten dan kota"),
               angka(f"Tanpa posko dalam {fid(r['ambang']['posko_km'])} km", tanpa_posko, "kabupaten dan kota")]

    def nama_posko(k):
        if not k["posko"]:
            return f"Belum ada posko dalam {fid(r['ambang']['posko_km'])} km"
        return ", ".join(f"{p['nama']} ({fid(p['km'], 1)} km)" for p in k["posko"][:2])
    baris = [{"kab": k["kab"], "prov": k["prov"], "puncak": tgl(dt.date.fromisoformat(puncak(k)["tgl"])), "hari": len(k["hari"]),
              "level": ROB_LV.get(k["lv_maks"]) or "Pasang tinggi (astronomis)", "posko": nama_posko(k)} for k in kab[:BARIS_MAKS]]
    cat = ("Prakiraan laut belum diperbarui, jadi level rob (Waspada, Siaga, Awas) tidak dinyatakan; daftar ini hanya dari gaya pasang astronomis. " if basi else "") + \
          "Pasang tinggi (astronomis) adalah indeks gaya pasang, bukan tinggi muka air. Muka laut model global tanpa datum lokal, ambang dari iklim model sendiri. Posko adalah lokasi usulan, bukan posko terdata."
    return dict(
        judul=judul, angka=angka_,
        kolom=[kol("kab", "Kabupaten atau kota"), kol("prov", "Provinsi"), kol("puncak", "Puncak"), kol("hari", "Hari berisiko", "angka"),
               kol("level", "Status", "pill"), kol("posko", "Posko terdekat")],
        baris=baris,
        tindak_lanjut=tindak(("BPBD kabupaten dan kota", f"Siagakan posko dan periksa pintu air serta tanggul menjelang {tgl(tp)}."),
                             ("BNPB", "Pantau pasang tinggi di kabupaten dan kota yang belum punya posko dalam jangkauan.")),
        sumber="Open-Meteo Marine SMOC, gaya pasang astronomis, lokasi posko usulan",
        catatan=cat)


WIDGET = {  # id -> (label pill, fungsi)
    "situasi": ("Situasi", w_situasi), "provinsi": ("Provinsi", w_provinsi), "kejadian": ("Kejadian api", w_kejadian),
    "konsesi": ("Areal izin", w_konsesi), "gambut": ("Gambut", w_gambut), "cuaca": ("Cuaca", w_cuaca), "asap": ("Asap", w_asap),
    "penerbangan": ("Penerbangan", w_penerbangan), "sumberdaya": ("Sumber daya", w_sumberdaya), "dampak": ("Dampak", w_dampak),
    "luas": ("Luas terbakar", w_luas), "berulang": ("Langganan", w_berulang), "pencegahan": ("Pencegahan", w_pencegahan),
    "rob": ("Rob pesisir", w_rob), "kesegaran": ("Kesegaran data", w_kesegaran),
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
    return dict(label=f"Wilayah berbahaya api sangat tinggi pada puncaknya, {hh} hari ke depan", jenis="provinsi", satuan="persen wilayah", pill="perkiraan {nilai} persen wilayah",
                catatan="Perkiraan model ECMWF dan FWI, bukan peluang adanya api. Nilai = puncak harian dalam jendela itu.",
                nilai={k: round(v[1] * 100) for k, v in cu.items()})


def p_kejadian(c):
    semua, kk, kend, op = kejadian_aktif(c)
    aktif = semua[:MAKS_FITUR]
    nm = nama_kejadian(semua, aktif)
    fs = [fitur(p["lat"], p["lon"], nm(p), round(p["luas"]), f"{fid(p['n24'])} titik panas dalam 24 jam", "Gambut" if gambut_kejadian(c, p, kk, op) else "Bukan gambut",
                akses_kejadian(kend, p)[1], pill=f"sekitar {fid(bulat(p['luas']))} ha") for p in aktif]
    return dict(label="Kejadian api aktif (ada titik panas 24 jam)", jenis="titik", satuan="ha, perkiraan sebaran titik",
                catatan=f"Menampilkan {fid(len(aktif))} kejadian terbesar dari {fid(len(semua))}. Ukuran lingkaran = sebaran titik, bukan luas kebakaran. Akses hanya dinilai untuk sebagian kejadian.", fitur=fs)


def nm_izin(x):
    """kunci nama perusahaan: tanpa keterangan dalam kurung ('(sk 79)', '(Eks PT GPI)'), huruf kecil, tanpa tanda baca"""
    return re.sub(r"[^a-z0-9]", "", re.sub(r"\([^)]*\)", "", x or "").lower())


def izin_perusahaan(c, a, p, fitur_izin):
    """poligon izin terluas milik perusahaan `p`: dulu lewat id poligon yang dicatat aktor_karhutla.json, lalu lewat nama yang dinormalkan; None bila tak ketemu"""
    cand = [fitur_izin[i] for i, n in a["poligon"].items() if n == p["nama"] and i in fitur_izin]
    cand = cand or [f for f in fitur_izin.values() if nm_izin(f["properties"].get("nama")) == nm_izin(p["nama"])]
    return max(cand, key=lambda f: f["properties"]["luas_peta_ha"], default=None)


def p_konsesi(c):
    a = c.j("aktor_karhutla")
    fitur_izin = {f["properties"]["id"]: f for f in json.load(open(os.path.join(c.dasar, "lahan", "konsesi.geojson")))["features"]}
    fs = []
    for p in a["perusahaan"]:
        n = titik_perusahaan(p)
        if not n:
            continue
        f = izin_perusahaan(c, a, p, fitur_izin)
        if not f:
            print(f"presiden: peringatan, poligon izin {p['nama']} ({n} titik) tidak ditemukan di konsesi.geojson, tidak ada di lapisan peta", file=sys.stderr)
            continue
        lat, lon = titik_poligon(f["geometry"])
        fs.append(fitur(lat, lon, p["nama"], n, f"{fid(n)} titik panas 7 x 24 jam di dalam batas izin", f"Jenis izin {JENIS_IZIN.get(p['jenis'], p['jenis']).lower()}",
                        f"{f['properties']['kab']}, {c.prov(f['properties']['prov'])}", "Indikasi, bukan penetapan pelaku"))
    fs.sort(key=lambda x: -x["nilai"])
    return dict(label="Areal izin bertitik panas 7 x 24 jam", jenis="titik", satuan="titik",
                catatan="Indikasi, bukan penetapan pelaku. Hanya izin yang perusahaannya terdata, sebagian kecil dari seluruh titik di dalam izin.", fitur=fs[:MAKS_FITUR])


def p_gambut(c):
    khj = c.j("khg_prioritas")
    kh = [k for k in khj["khg"] if k["titik_7h"] > 0]
    geo = {f["properties"]["kode"]: f["geometry"] for f in json.load(open(os.path.join(c.dasar, "lahan", "khg.geojson")))["features"]}
    fs = []
    for k in sorted(kh, key=lambda k: -k["titik_7h"])[:MAKS_FITUR]:
        if k["kode"] in geo:
            lat, lon = titik_poligon(geo[k["kode"]])
            fs.append(fitur(lat, lon, k["nama"], k["titik_7h"], f"{fid(k['titik_7h'])} titik panas 7 hari", f"{fid(k['titik_30h'])} titik panas 30 hari",
                            f"{fid(k['kompleks_aktif'])} kejadian api aktif per {tgl_aktif_khg(khj)}", f"{k['prov_nama']}, kanal sekitar {fid(ratusan(k['kanal_km']))} km"))
    if not fs:
        raise Kosong("tidak ada KHG bertitik yang poligonnya ditemukan")
    return dict(label="Kawasan hidrologis gambut (KHG) bertitik panas", jenis="titik", satuan="titik",
                catatan="Titik = deteksi semua sensor. Kanal perkiraan dari OpenStreetMap, belum lengkap.", fitur=fs)


def sel_rawan(c, sel):
    """sel model (v, lat, lon) yang memuat pusat kecamatan di provinsi yang sering mengalami karhutla: cara yang sama dengan penghitung kartu (udara/kualitas.py)"""
    kualitas = kualitas_mod()
    rw = rawan(c)
    pusat = json.load(open(os.path.join(c.dasar, "..", "banjir", "data", "pusat_kec.json")))
    sel_ok = {kualitas.kunci_sel(la, lo) for kk, (la, lo) in pusat.items() if kk.split("|")[0] in rw}
    return [x for x in sel if (x[1], x[2]) in sel_ok]


def p_asap(c):
    kualitas = kualitas_mod()
    u, a = c.j("udara_dampak"), c.j("asap")
    h = hari_asap(c, u)   # hari yang sama dengan widget asap
    if h not in a["hari"]:
        raise Kosong(f"asap.json tidak memuat {h}")
    i, kol_ = a["hari"].index(h), a["kolom"].index("pm25_rata")   # rata-rata 24 jam, sama dengan dasar widget asap
    B, am = kualitas.BATAS, ambang_pm()
    nama_k = ["Baik", "Sedang", "Tidak sehat", "Sangat tidak sehat", "Berbahaya"]
    pil = {2: f"Tidak sehat, {fid(am[0], 1)} sampai {fid(B[2], 1)} µg/m³", 3: f"Sangat tidak sehat, {fid(am[1], 1)} sampai {fid(B[3], 1)} µg/m³",
           4: f"Berbahaya, {fid(am[2], 1)} µg/m³ atau lebih"}
    sel = sorted(((g[kol_][i], g[0], g[1]) for g in a["grid"] if g[kol_][i] is not None and g[kol_][i] > B[1]), reverse=True)
    sel = sel_rawan(c, sel)[:MAKS_FITUR]
    d = tgl(dt.date.fromisoformat(h))
    fs = [fitur(la, lo, f"Sel model sekitar {fid(abs(la), 1)}° {'LS' if la < 0 else 'LU'}, {fid(lo, 1)}° BT", v, f"Perkiraan model CAMS pada {d}",
                f"Sel kasar 1 derajat, sekitar 110 km", pill=pil[kualitas.kategori(v)]) for v, la, lo in sel]
    if not fs:
        raise Kosong("tidak ada sel PM2,5 tidak sehat di provinsi yang sering mengalami karhutla")
    return dict(label="PM2,5 tidak sehat di provinsi yang sering mengalami karhutla (perkiraan model)", jenis="titik", satuan="µg/m³",
                kelas=[{"dari": am[k - 2], "label": nama_k[k]} for k in (2, 3, 4)],
                catatan="Perkiraan model CAMS, rata-rata 24 jam, belum dikoreksi stasiun, resolusi kasar (sel 1 derajat). PM2,5 dari semua sumber; "
                        "hanya sel yang memuat pusat kecamatan di provinsi yang sering mengalami karhutla, karena di provinsi lain PM2,5 sebagian besar bukan dari kebakaran.", fitur=fs)


def p_penerbangan(c):
    p = c.j("penerbangan")
    per, nj = per_bandara(p), p["nama_jenis"]
    fs = []
    for kode, v in sorted(per.items(), key=lambda kv: -kv[1]["n"])[:MAKS_FITUR]:
        b = p["bandara"][kode]
        jn = nj.get(jenis_terbanyak(v))
        fs.append(fitur(b["lat"], b["lon"], f"{nama_bandara(b['nama'])} ({kode})", v["n"], f"{fid(v['n'])} gangguan musim ini",
                        *([f"Jenis terbanyak {jn.lower()}"] if jn and jn != nj.get("lain") else []), f"Terakhir {tgl(dt.date.fromisoformat(v['akhir']))}"))
    return dict(label="Bandara terdampak asap", jenis="titik", satuan="gangguan", catatan="Dari judul berita, bukan data resmi; angka batas bawah.", fitur=fs)


def p_posko(c):
    po = c.j("posko")
    urut = sorted(po["posko"], key=lambda x: -len(x["kompleks"]))
    fs = [fitur(x["lat"], x["lon"], x["nama"], len(x["kompleks"]), f"{x['kab']}, {c.prov(x['prov'])}", f"Usulan posko {x['jenis_posko']}",
                f"Dalam radius {fid(po['radius_km'])} km")
          for x in urut[:MAKS_FITUR]]
    return dict(label="Lokasi posko usulan", jenis="titik", satuan="kejadian api dalam jangkauan",
                catatan=f"Rekomendasi lokasi dari algoritma platform, bukan posko yang sudah ada. Menampilkan {fid(len(fs))} lokasi dengan jangkauan terbanyak dari {fid(len(urut))}.", fitur=fs)


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
            fs.append(fitur(lat, lon, f"{kec}, {kab}", n, f"{fid(n)} titik panas {th}", f"Rata-rata {fid(round(rata))} titik per tahun, {s['tahun'][0]} sampai {s['tahun'][ini - 1]}",
                            f"Paling sedikit {TITIK_TAHUN} titik di {ul} dari {ini} tahun", c.prov(pr)))
    if not fs:
        raise Kosong("tidak ada kecamatan langganan yang batasnya ditemukan")
    return dict(label="Kecamatan langganan kembali bertitik panas", jenis="titik", satuan="titik",
                catatan=f"Langganan = paling sedikit {TITIK_TAHUN} titik setahun pada {MIN_ULANG} tahun lalu atau lebih, dan {MIN_INI} titik atau lebih tahun ini. "
                        f"Peta menampilkan {MAKS_FITUR} kecamatan terbesar dari {fid(len(lg))} yang memenuhi syarat.", fitur=fs)


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
                basi.append(f"{WAKTU[nama][0]} terakhir {tgl(u[0])}" + (f" pukul {jam(u[0])} WIB" if WAKTU[nama][1] < 24 else ""))
    # per: yang ditetapkan widget (tanggal akhir data yang dipakai, sama dengan lapisan petanya), kalau tidak sumber paling tua; tidak pernah di masa depan
    w["per"] = iso(min(waktu(w["per"]), c.sekarang)) if w.get("per") else iso(min(waktus)) if waktus else iso(c.sekarang)
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
    tetap = {w["id"] + ".json" for w in ws} | {"semua.json", "peta.json", "indeks.json"}
    for f in os.listdir(keluar):   # feed widget yang dibuang (mis. peringatan) tidak tertinggal basi dari cache CI
        if f.endswith(".json") and f not in tetap:
            os.remove(os.path.join(keluar, f))
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
        assert l["per"] == ws[l["widget"]]["per"], lid   # kartu dan lapisannya satu tanggal
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
                assert re.fullmatch(r"(Tidak sehat, 55,5 sampai 150,4|Sangat tidak sehat, 150,5 sampai 250,4|Berbahaya, 250,5) µg/m³( atau lebih)?", f["pill"]), f["pill"]
                assert "55 sampai 150" not in f["pill"] and f["lat"] == int(f["lat"]) + (.5 if f["lat"] > 0 else -.5) and f["lon"] == int(f["lon"]) + .5   # sel 1 derajat
            if lid == "kejadian":   # dibulatkan 2 angka penting seperti judul
                m_ = re.fullmatch(r"sekitar ([\d.]+) ha", f["pill"])
                assert m_ and int(m_.group(1).replace(".", "")) == bulat(int(m_.group(1).replace(".", ""))), f["pill"]
    teks = list(_teks(pt))
    assert not any(" · " in t or "—" in t or "kompleks" in t.lower() or re.search(r"terbakar", t) or ">" in t for t in teks), "pemisah/istilah terlarang di peta"
    assert not any("terdata" in l.get("label", "").lower() and l["id"] == "posko" for l in pt["lapisan"])
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
        aktor = S("aktor_karhutla")
        fz = json.load(open(os.path.join(dasar, "lahan", "konsesi.geojson")))["features"]
        pv = json.load(open(os.path.join(dasar, "..", "geo", "provinsi.json")))["features"]
        nama_prov = S("meta")["provinsi"]
        for f in L["konsesi"]["fitur"]:
            geoms = [g["geometry"] for g in fz if (g["properties"]["id"] in aktor["poligon"] and aktor["poligon"][g["properties"]["id"]] == f["nama"]) or nm_izin(g["properties"].get("nama")) == nm_izin(f["nama"])]
            assert any(ada(g, f["lon"], f["lat"]) for g in geoms), ("titik di luar izin", f["nama"])
            kd = next(p["properties"]["kode"] for p in pv if ada(p["geometry"], f["lon"], f["lat"]))
            assert f["teks"][2].endswith(", " + nama_prov[kd]), (f["nama"], f["teks"][2], nama_prov[kd])
        # semua perusahaan di tabel kartu ada di peta (poligonnya ada di konsesi.geojson)
        assert {b["nama"] for b in ws["konsesi"]["baris"]} <= {f["nama"] for f in L["konsesi"]["fitur"]}, "perusahaan kartu hilang dari peta"
    if "asap" in L:   # sel hanya yang memuat pusat kecamatan di provinsi yang sering mengalami karhutla
        sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "udara"))
        import kualitas
        rw = {k for k, w in S("peluang")["wilayah"].items() if w.get("tingkat") == "provinsi"}
        pusat = json.load(open(os.path.join(dasar, "..", "banjir", "data", "pusat_kec.json")))
        sel_ok = {kualitas.kunci_sel(la, lo) for kk, (la, lo) in pusat.items() if kk.split("|")[0] in rw}
        for f in L["asap"]["fitur"]:
            assert (f["lat"], f["lon"]) in sel_ok, ("sel asap tanpa kecamatan rawan", f)
        assert L["asap"]["kelas"] == [{"dari": 55.5, "label": "Tidak sehat"}, {"dari": 150.5, "label": "Sangat tidak sehat"}, {"dari": 250.5, "label": "Berbahaya"}]
    # angka satu lapisan dicek ulang dari sumber: provinsi = total 7 hari widget, kejadian/gambut/posko = hitung langsung
    if "provinsi" in L and ws["provinsi"]["status"] != "kosong":
        m = S("musim_harian")
        th = str(dt.date.fromisoformat(m["sd"]).year)
        buang = (dt.date.fromisoformat(m["sd"]) - dt.date.fromisoformat(L["provinsi"]["per"][:10])).days
        assert L["provinsi"]["nilai"] == {k: sum(v[th][:len(v[th]) - buang][-7:]) for k, v in m["prov"].items()}
        assert sum(L["provinsi"]["nilai"].values()) == ws["provinsi"]["angka"][1]["nilai"]
    if "kejadian" in L:
        luas = sorted((f["properties"]["luas"] for f in S("kluster")["features"] if f["properties"].get("n24", 0) > 0), reverse=True)[:MAKS_FITUR]
        assert [f["nilai"] for f in L["kejadian"]["fitur"]] == [round(x) for x in luas]
    if "gambut" in L:
        kh = S("khg_prioritas")["khg"]
        assert max(f["nilai"] for f in L["gambut"]["fitur"]) == max(k["titik_7h"] for k in kh)
        assert len(L["gambut"]["fitur"]) <= sum(1 for k in kh if k["titik_7h"] > 0)
    if "posko" in L:
        assert len(L["posko"]["fitur"]) == min(MAKS_FITUR, len(S("posko")["posko"])) and L["posko"]["label"] == "Lokasi posko usulan"
        assert all(f["teks"][1].startswith("Usulan posko") for f in L["posko"]["fitur"])
    if "penerbangan" in L:   # peta = kartu: bandara di luar Indonesia (tanpa koordinat/provinsi) tidak ikut
        assert len(L["penerbangan"]["fitur"]) == min(MAKS_FITUR, ws["penerbangan"]["angka"][2]["nilai"])
    if "konsesi" in L:
        assert sum(1 for f in L["konsesi"]["fitur"]) <= sum(1 for p in S("aktor_karhutla")["perusahaan"] if (p.get("cek") or {}).get("titik_terkini"))
    # semua sumber hilang: peta.json tetap terbit, tanpa lapisan
    with tempfile.TemporaryDirectory() as k0:
        bangun(k0, os.path.join(k0, "k"))
        assert json.load(open(os.path.join(k0, "k", "peta.json")))["lapisan"] == []
    print(f"peta.json {ukuran} byte,", ", ".join(f"{i}={len(l['fitur']) if 'fitur' in l else len(l['nilai'])}" for i, l in L.items()))


def uji_butir(ws, now):
    """butir audit panel presiden: tiap kesalahan yang pernah ditemukan dijaga di sini"""
    S = lambda n: json.load(open(os.path.join(DATA, n + ".json")))
    W = lambda i: ws[i] if ws[i]["status"] != "kosong" else None
    if W("kejadian"):   # kompleks yang tidak ada di kendala.json = "Belum dinilai", bukan "Tanpa kendala tercatat"; nama kembar dibedakan; tanpa "sulit dijangkau"
        w = W("kejadian")
        kend = S("kendala")["kompleks"]
        semua_ = sorted((f["properties"] for f in S("kluster")["features"] if f["properties"].get("n24", 0) > 0), key=lambda p: -p["luas"])
        aktif = semua_[:BARIS_MAKS]
        nm = nama_kejadian(semua_, aktif)
        assert not re.search(r"K\d{4}", json.dumps(w)), "kode internal kejadian tampil"
        assert not any(re.search(r"\), (jauh|sungai)", b["akses"]) for b in w["baris"])
        assert [b["kejadian"] for b in w["baris"]] == [nm(p) for p in aktif] and len({b["kejadian"] for b in w["baris"]}) == len(w["baris"])
        for b, p in zip(w["baris"], aktif):
            assert (b["akses"] == "Belum dinilai") == (p["id"] not in kend), (b, p["id"])
            assert b["akses"] != "Tanpa kendala tercatat" or p["id"] in kend and not kend[p["id"]].get("label")
        assert w["angka"][0]["label"].startswith("Kejadian api aktif (ada titik panas 24 jam)") and re.fullmatch(r"[\d.]+ dari [\d.]+ kejadian yang dinilai", w["angka"][2]["tampil"])
        assert "sulit dijangkau" not in " ".join(_teks(w)).lower() and "50 persen atau lebih" in w["catatan"]
        belum = sum(1 for p in aktif if p["id"] not in kend)
        assert (belum == 0) or not re.search(r"regu darat ke \d+ kejadian terbesar yang jalannya terjangkau", w["tindak_lanjut"][1]["apa"])
    if W("konsesi"):
        w = W("konsesi")
        assert "di antara perusahaan yang namanya terdata" in w["judul"] and "terbanyak di areal" in w["judul"] and re.search(r"\(\d+%\)", w["catatan"])
        assert len(w["angka"]) == 4 and "lain" in w["angka"][3]["label"] and "walhi" not in json.dumps(w).lower()
    if W("kesegaran"):
        w = W("kesegaran")
        assert w["per"][:16] == iso(now)[:16], (w["per"], iso(now))   # waktu pemeriksaan, bukan sumber tertua
        assert re.search(r"; (paling dekat batasnya|paling terlambat): ", w["judul"]) and any(r["sumber"] == "Luas terbakar SiPongi" for r in w["baris"])
    if W("asap"):
        w = W("asap")
        rw = {k for k, v in S("peluang")["wilayah"].items() if v.get("tingkat") == "provinsi"}
        nama_rw = {S("meta")["provinsi"][k] for k in rw}
        assert "provinsi yang sering mengalami karhutla" in w["judul"] and {b["prov"] for b in w["baris"]} <= nama_rw, "asap memuat provinsi di luar daftar rawan"
        assert not ({"DKI Jakarta", "Jawa Barat", "Jawa Tengah", "Jawa Timur", "Banten", "DI Yogyakarta"} & {b["prov"] for b in w["baris"]})
        assert w["angka"][0]["tampil"].startswith("sekitar ") and all(a["tampil"].startswith("paling sedikit ") for a in w["angka"][1:]) and all(a["ubah"] is None and "perubahan" not in a["label"] for a in w["angka"])
        u_ = S("udara_dampak")["terpapar"][hari_asap(Ctx(DATA, now), S("udara_dampak"))]
        kt = sum(v.get("kec_tercakup_sekolah", v["kec"]) for k, v in u_["prov"].items() if k in rw)
        assert f"terpetakan di {fid(kt)} dan" in w["catatan"], "cakupan sekolah salah (kunci hilang = cakupan penuh)"
        assert "bukan hanya kebakaran" in w["catatan"] and re.search(r"terpetakan di [\d.]+ dan fasilitas kesehatan di [\d.]+ dari [\d.]+ kecamatan", w["catatan"])
        assert "55,4" not in w["catatan"] and "55,5" in w["catatan"]
    if W("sumberdaya"):
        w = W("sumberdaya")
        assert w["angka"][3]["label"] == "Lokasi posko usulan" and any(k["label"] == "Lokasi posko usulan" for k in w["kolom"])
        assert w["angka"][1]["satuan"] == "personel" and re.search(r"sekitar [\d.]+ personel \([\d.]+ sampai [\d.]+\)", w["angka"][1]["tampil"]) and "optimis sampai pesimis" in w["judul"]
    if W("luas"):
        w = W("luas")
        assert len(w["angka"]) == 3 and not any("satelit" in a["label"] for a in w["angka"]) and "baru sampai" in w["catatan"]
    if W("dampak"):
        assert all("tampil" in a and a["tampil"].startswith("sekitar ") and "(" in a["tampil"] for a in W("dampak")["angka"])
    if W("penerbangan"):
        p = S("penerbangan")
        assert W("penerbangan")["angka"][3]["label"] == "Berita pembatalan penerbangan" and "JHB" not in " ".join(b["bandara"] for b in W("penerbangan")["baris"])
    if W("pencegahan"):
        assert re.search(r"\d+ kecamatan sasaran", W("pencegahan")["judul"]) and all(re.fullmatch(r"[A-Z][a-z]{2} 20\d\d|-", b["siap"]) for b in W("pencegahan")["baris"])
    if W("gambut"):
        w = W("gambut")
        assert w["per"][:10] == S("khg_prioritas")["jendela_7h"][1] and all(b["kanal"] % 100 == 0 for b in w["baris"])
    assert vonis_pendek("Dalam 7 hari ke depan, bahaya api Tinggi diperkirakan meliputi sebagian Kalimantan Barat pada puncaknya") == "Tinggi, sebagian wilayah"
    assert vonis_pendek("bahaya api Tinggi tidak diperkirakan di Riau pada satu skenario pun") == "Tidak diperkirakan"
    assert tenggat_teks(10, dt.date(2026, 10, 14)) == "Nov 2026" and tenggat_teks(4, dt.date(2026, 10, 14)) == "Mei 2027"
    assert kira(1.22) == "1,2" and kira(223443) == "220.000" and rentang_besar(460493, 2441369) == "0,5 sampai 2,4 juta" and juta(1055914) == "1,1 juta"


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
                assert set(a) in ({"label", "nilai", "satuan", "ubah"}, {"label", "nilai", "satuan", "ubah", "tampil"}) and isinstance(a["nilai"], (int, float)), (wid, a)
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
                ada(wid, f"[[{juta(a_['nilai'])}]]")
            elif wid == "provinsi":
                mm = re.search(r"(naik|turun) ([\d.,]+)%", a_["tampil"])   # pembanding ada di teks, bukan di ubah (layar menempelkan ubah sesudah tampil)
                assert a_["ubah"] is None
                if mm:
                    ada(wid, f"{mm.group(1)} {mm.group(2)}%")
                ada(wid, f"[[{fid(a_['nilai'])}]]")
            else:
                ada(wid, tpl.format(fid(a_["nilai"])))
        if ws["pencegahan"]["status"] != "kosong":
            a_ = ws["pencegahan"]["angka"]
            ada("pencegahan", f"Rp{fid(a_[0]['nilai'], 1)} sampai Rp{fid(a_[1]['nilai'], 1)} triliun")
        assert bulat(86266046) == 86000000 and bulat(203.65) == 200 and bulat(706.1, 1) == 700 and bulat(12869, 3) == 12900 and bulat(1.907) == 1.9
        assert fid(0.5, 1) == "0,5" and umur_kata(240) == "sekitar 10 hari" and umur_kata(30) == "30 jam"
        uji_butir(ws, now)
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
            sd = dt.date.fromisoformat(ws["situasi"]["per"][:10])   # hari lengkap terakhir: sama untuk judul, angka, per
            assert sd < now.date() and tgl(sd) in ws["situasi"]["judul"] and ws["situasi"]["angka"][0]["label"].count(tgl(sd)) == 1
            seri = m["nasional"][str(sd.year)]
            a = ws["situasi"]["angka"]
            assert a[0]["nilai"] == seri[(sd - dt.date.fromisoformat(m["sd"])).days - 1 + len(seri)] and a[1]["nilai"] == k["nasional"]["ini"]
            assert a[2]["nilai"] == k["setara_2015"]["nasional"]["ini"] and "dari 2015" in a[2]["tampil"] and f"{k['setara_2015']['nasional']['banding']['2015']['persen']}%" in ws["situasi"]["judul"]
            assert ws["situasi"]["kolom"][2]["label"].endswith("sebagai persen dari tahun itu") and all(b["tahun"] != "2015" for b in ws["situasi"]["baris"])
        if ws["provinsi"]["status"] != "kosong":
            m = src("musim_harian")
            sd = dt.date.fromisoformat(ws["provinsi"]["per"][:10])
            assert sd < now.date()   # tanpa hari berjalan
            th = str(sd.year)
            buang = (dt.date.fromisoformat(m["sd"]) - sd).days
            t7 = {kd: sum(v[th][:len(v[th]) - buang][-7:]) for kd, v in m["prov"].items()}
            best = max(t7, key=t7.get)
            meta = src("meta")["provinsi"]
            r0 = ws["provinsi"]["baris"][0]
            assert r0["prov"] == meta[best] and r0["t7"] == t7[best] == ws["provinsi"]["angka"][0]["nilai"], (r0, best)
            assert ws["provinsi"]["angka"][1]["nilai"] == sum(t7.values())
            assert [b["t7"] for b in ws["provinsi"]["baris"]] == sorted(t7.values(), reverse=True)[:len(ws["provinsi"]["baris"])]
            wl = src("peluang")["wilayah"]
            for b in ws["provinsi"]["baris"]:   # kolom cuaca = vonis berkas, tanpa ambang buatan
                kd = next(k_ for k_, n_ in meta.items() if n_ == b["prov"])
                assert b["cuaca"] == (vonis_pendek(wl[kd]["vonis"]) if kd in wl else "Tidak dicakup"), b
                assert "Di bawah ambang" not in b["cuaca"]
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
        assert not any(">" in t or "Posko lapangan terdata" in t for t in semua_teks), "'>' atau 'posko terdata' di teks"
        for nm in os.listdir(tmp):   # keputusan pemilik 17 Okt: WALHI tidak tampil di situs
            assert "walhi" not in open(os.path.join(tmp, nm)).read().lower(), nm
    print("presiden --uji: lulus,", ", ".join(f"{i}={ws[i]['status']}" for i in IDS), f"| semua.json {ukuran} byte")


if __name__ == "__main__":
    uji() if "--uji" in sys.argv else main()
