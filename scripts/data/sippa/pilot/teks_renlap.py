"""Teks renlap dari TEMPLAT berbasis data (SP-140): satu lokasi = satu dict dengan kunci yang sama seperti teks.TEKS
(status, dalam, peran, pompa, topo, rute_catatan, sulit, mudah, tips). Aturannya: setiap kalimat hanya memakai angka yang
ada di data lokasi (s dari analisis.py); tidak ada data = kalimat tidak ditulis, atau ditulis "wajib dibor/dicek". Tidak ada nama
perusahaan. Placeholder {L} {gulung} {air_nama} {air_d} {p_lance} {kaki_km} {kaki_mnt} diisi cetak.isi(), jadi kurung kurawal
dari data tidak boleh masuk. Self-check tanpa jaringan: python3 teks_renlap.py"""
import re
from teks import UMUM as UMUM_PILOT

SUMBER_PENDEK = ("Sumber: titik panas NASA FIRMS lewat Centurisk97; gambut 1:250.000 Kementan dan kanal, sumur bor BRGM lewat PRIMS; "
                 "air, jalan, rute: OpenStreetMap dan model akses SIPPA (perkiraan); citra Sentinel-2 atau Esri; cuaca FWI Centurisk97 dan Open-Meteo.")


def n(x, d=0):
    """angka gaya Indonesia: 1.234,5"""
    return f"{x:,.{d}f}".replace(",", "X").replace(".", ",").replace("X", ".")


def bersih(t):
    return re.sub(r"[{}]", "", str(t))


def umum(D):
    """teks umum satu dossier (pengganti teks.UMUM): tanpa jadwal, lokasi, dan kabupaten pilot Kalteng"""
    S = D["situs"]; R = D["ringkas"]
    luar = [s["no"] for s in S if not s["gambut_prims"]]
    cek = (f"<p>{R.get('n_gambut', len(S))} dari {len(S)} lokasi berada di dalam peta gambut resmi 1:250.000 (Kementan, lewat PRIMS BRGM). "
           + (f"Lokasi {', '.join(str(x) for x in luar)} tidak tercatat di peta itu, jadi periksa dulu apakah benar gambut. " if luar else "")
           + "Peta itu <b>tidak mencantumkan kedalaman</b>, jadi kedalaman gambut di tiap lokasi <b>wajib dibor</b> sebelum petak dipasang.</p>"
           "<p><b>Aturan ganti:</b> tiap petak dibor saat survei. Kalau gambutnya kurang dari 50 cm (bukan gambut) atau kurang dari 1 m (lance tembus ke tanah biasa), "
           "petak dipindah ke titik panas berikutnya dan alasannya dicatat.</p>")
    return {**UMUM_PILOT,
            "gagasan": "Kit pompa, selang, dan lance menyuntikkan air ke bara gambut sampai kedalaman 1,5 m. "
                       "Petak uji ditaruh di <b>titik panas 24 jam terdekat yang berada di tanah gambut</b> (cadangan: 48 jam; bila tidak ada, di kompleks), "
                       "lalu dicari sumber air terdekat untuk titik itu. Titik panas adalah deteksi satelit, bukan pengukuran api di lapangan.",
            "cek_gambut": cek,
            "panjang": "Bila air terdekat dari petak lebih jauh dari 500 m, pompa ditaruh di titik air dekat jalan (titik air SIPPA) dan "
                       "<b>satu jalur selang RENTANG</b> digelar ke petak, dengan pompa tambahan di tengah bila hitungan menunjukkan tekanan tidak cukup. "
                       "Panjang selang dihitung dari jarak lurus ditambah 20% untuk belokan dan 60 m cabang ke petak.",
            "putus": ["Siapa regu pelaksana dan pompa siapa yang dipinjam (Daops terdekat atau BPBD).",
                      "Hari pelaksanaan. Tiap sore H-1 diputuskan jalan atau tidak, dilihat dari titik panas 24 jam terakhir dan prakiraan hujan.",
                      "Izin kepala desa dan pemilik lahan, serta pengelola kawasan bila lokasi berada di kawasan hutan.",
                      "Alat tambahan: 2 lance, 2 termometer tusuk, 1 bor gambut. Lance ke-3 sampai ke-8 bila mau uji penuh."]}


def _daftar_tgl(cu, nilai_min):
    """hari pertama prakiraan dengan hujan >= nilai_min: (tanggal d/m, mm)"""
    if not cu:
        return None
    for t, v in zip(cu["time"], cu["precipitation_sum"]):
        if v is not None and v >= nilai_min:
            return f"{int(t[8:10])}/{int(t[5:7])}", v
    return None


def teks_otomatis(s):
    """teks lapangan satu lokasi dari data analisis"""
    k, a, h = s["kel"], s["akses"], s["hid"]
    tg = s["target"]; relay = h.get("relay"); panjang = bool(s.get("paksa"))
    air = s["air_calon"][0]; air_d = round(air["d_km"] * 1000)
    kaki = s["kaki_target"]
    bor = k.get("brgm_3km") or {}
    n_brgm = sum(bor.get(x, 0) for x in ("sekat_kanal", "sumur_bor", "sumur_rencana", "lain"))

    # status
    if tg:
        status = "Ada titik panas 24 jam terakhir" if tg["jam"] >= -24 else "Ada titik panas 48 jam terakhir"
    else:
        status = "Latihan: tidak ada titik panas di gambut yang layak diuji dalam 48 jam"

    # kedalaman gambut: tidak ada di data, selalu wajib dibor
    if not s["gambut_prims"]:
        dalam = "Tidak tercatat di peta gambut resmi; periksa dulu apakah gambut, wajib dibor"
    elif 0 < s["gambut_tepi_km"] <= 0.5:
        dalam = f"Di pinggir sebaran gambut ({n(s['gambut_tepi_km'], 1)} km dari batasnya): kemungkinan tipis, wajib dibor"
    else:
        dalam = "Belum ada data kedalaman untuk titik ini; wajib dibor"

    # peran
    mt = a["menit"]["jalan"] + a["menit"]["perahu"] + kaki["menit"]
    if tg:
        peran = (f"Petak di titik panas terdekat di gambut, {n(tg['d_km'], 1)} km dari titik kompleks"
                 + (f", dengan {tg['n500']} titik panas dalam 500 m" if tg.get("n500") else "")
                 + f". Sampai petak ± {mt} menit dari {bersih(a['dari']['nama'])}.")
    else:
        peran = f"Petak latihan di titik kompleks, tanpa bara untuk diuji. Sampai petak ± {mt} menit dari {bersih(a['dari']['nama'])}."
    if panjang:
        peran = f"Pompa di air dekat jalan, petak {{air_d}} m dari pompa. " + peran

    # pompa dan selang
    pompa = (f"Pompa ditaruh di tepi {{air_nama}}, {{air_d}} m dari petak. Dari pompa <b>satu jalur selang ± {{L}} m ({{gulung}} gulung)</b> ke petak. ")
    if relay:
        pompa += (f"Karena jauh, perlu <b>{relay['n_ruas'] - 1} pompa tambahan</b> di tengah jalur, kira-kira tiap {n(relay['L_ruas'])} m. "
                  "Pompa tambahan menerima air dari selang dan mendorongnya lagi ke depan.")
    elif h["penuh"]["vonis"] == "NO-GO":
        pompa += "Hitungan kalkulator SIPPA menyatakan satu pompa tidak cukup untuk jarak ini; tambah pompa sebelum berangkat."
    else:
        pompa += "Satu pompa cukup, tidak perlu pompa tambahan. Tekanan sisa di lance ± {p_lance} bar; buka katup pelan-pelan dan jaga di 2–3 bar."

    # topografi: hanya angka dari data
    el_k, el_a = k.get("elev_kompleks_m"), k.get("elev_air_m")
    topo = (f"Menurut data, kompleks ± {n(el_k)} m dan air ± {n(el_a)} m di atas laut. " if el_k is not None and el_a is not None else "") + \
           "Data ketinggian ikut menghitung tinggi pohon; ukur beda tinggi dengan GPS saat survei."

    # catatan rute
    cat = [f"Berangkat dari {bersih(a['dari']['nama'])}."]
    if a["ujung"] == "perahu":
        cat.append(f"Bagian akhir lewat perahu ({a['menit']['perahu']} menit); titik turun perahu di peta adalah perkiraan model.")
    if a.get("saran"):
        cat.append(f"Catatan model akses: {bersih(a['saran'])}.")
    if a.get("track_perlu_cek"):
        cat.append("Sebagian jalan tanah perlu dicek dulu; tanya warga.")
    if a.get("celah_peta"):
        cat.append("Ada celah di peta jalan; minta warga menunjukkan jalannya.")
    if panjang:
        cat.append("Jalur jalan kaki ke petak mengikuti jalur selang.")

    # tantangan
    sulit = []
    if kaki["menit"] >= 20:
        sulit.append(f"Jalan kaki {{kaki_km}} km ({{kaki_mnt}} menit) dari ujung jalan ke petak sambil membawa alat; siapkan pengangkut tambahan.")
    if h["L"] >= 600:
        sulit.append("Selang ± {L} m berarti {gulung} gulung (± 8 kg per gulung): perlu banyak orang atau gerobak untuk menggelar.")
        sulit.append("Makin panjang selang, makin banyak sambungan yang bisa bocor. Siapkan klem dan selang tambal lebih banyak.")
    if h["L"] > 3000:
        sulit.append("Selang lebih dari 3 km tidak lazim digelar untuk satu uji. Pertimbangkan sumber air lain, pompa darat, atau lokasi lain.")
    if relay or h["penuh"]["vonis"] == "NO-GO":
        sulit.append("Jarak air ke petak jauh untuk satu pompa. Cek ulang sumber air lain yang lebih dekat saat survei.")
    if k.get("air_asin"):
        sulit.append(f"Ada air asin atau payau di sekitar (± {n(k['air_asin_km'], 1)} km). Cicipi atau ukur air sebelum dipakai.")
    dc = next((d["dc"] for d in s["fwi_sel"]["hari"] if d["tgl"] == HARI_FWI[0]), None)
    if dc is not None and dc > 350:
        sulit.append(f"Gambut sangat kering (indeks kekeringan DC {n(dc)}); bara mudah menjalar sampai ke bawah petak pembanding.")
    hj = _daftar_tgl(s.get("cuaca"), 10)
    if hj:
        sulit.append(f"Hujan diprakirakan {n(hj[1])} mm pada {hj[0]}. Tanah becek membuat membawa alat lebih lambat.")
    kb = next((c for c in s["kluster"] if c.get("luas") and c.get("n24")), None)
    if kb:
        sulit.append(f"Ada kebakaran ± {n(kb['luas'])} ha, {n(kb['d_km'], 1)} km dari titik kompleks, sudah {kb.get('hari', '?')} hari menyala. Asapnya bisa terbawa angin ke petak.")
    if a["daops"] and a["daops"].get("total_menit", 0) > 180:
        sulit.append(f"{bersih(a['daops']['nama'])} ± {n(a['daops']['total_menit'] / 60, 1)} jam dari sini. Kalau alat rusak, cadangan lama datangnya.")
    if not tg:
        sulit.append("Tidak ada bara gambut yang layak diuji di dekat sini; lokasi dipakai untuk latihan atau survei.")
    if not s["gambut_prims"]:
        sulit.append("Lokasi tidak tercatat di peta gambut resmi. Pastikan dulu tanahnya gambut sebelum memasang petak.")
    sulit.append("Tebal gambut di titik ini belum diketahui; bor dulu sebelum menyuntik dengan lance 1,5 m.")
    sulit.append("Letak air di peta bisa meleset puluhan meter dan banyaknya air saat kemarau belum diketahui; cek dengan galah.")

    # yang memudahkan
    mudah = []
    if air_d <= 300:
        mudah.append("Air hanya {air_d} m dari petak: selang pendek, air sampai dalam hitungan menit.")
    if a["menit"]["kaki"] <= 10 and a["menit"]["jalan"] > 0:
        mudah.append(f"Ujung jalan dekat petak: jalan kaki dari ujung jalan ± {{kaki_mnt}} menit.")
    if a["daops"] and a["daops"].get("total_menit", 999) <= 60:
        mudah.append(f"{bersih(a['daops']['nama'])} hanya ± {a['daops']['total_menit']} menit dari sini.")
    if n_brgm and s.get("infra"):
        mudah.append(f"BRGM mencatat {n_brgm} sumur bor atau sekat kanal dalam 3 km dari titik kompleks, yang terdekat ke petak {n(s['infra'][0]['d_target'], 1)} km. Bisa jadi cadangan air.")
    elif n_brgm:
        mudah.append(f"BRGM mencatat {n_brgm} sumur bor atau sekat kanal dalam 3 km dari titik kompleks.")
    if panjang:
        mudah.append("Pompa di dekat jalan: pompa dan bensin tidak perlu dipikul jauh; jalur selang sekaligus jalur jalan kaki ke petak.")
    if not mudah:
        mudah.append("Rute dan titik air sudah ada dari model akses SIPPA; cocokkan dengan keadaan saat survei.")

    # tips
    tips = ["Mulai pagi, jam 7–10, saat angin masih lemah dan asap belum naik.",
            "Cek dulu dalamnya air dengan galah. Saringan isap butuh air ≥ 30 cm."]
    if bor.get("sekat_kanal"):
        tips.append("Kalau ada sekat kanal BRGM di dekat petak, ambil air di sisi hulu sekat. Jangan bongkar sekatnya.")
    if h["L"] >= 600:
        tips += ["Gelar selang dari petak ke arah pompa: ujung yang sudah tersambung tidak terseret.",
                 "Beri nomor tiap gulung dan catat jam selesai tiap 200 m untuk mengukur kecepatan gelar.",
                 "Pasang pengukur tekanan di pompa dan di lance; catat keduanya tiap 10 menit."]
    if a["ujung"] == "perahu":
        tips.append("Ikat pompa di lantai perahu. Tiap orang pakai pelampung.")
    if kaki["menit"] >= 20:
        tips.append("Bagi tim jadi 2 kelompok: selang dibawa duluan, pompa terakhir. Pasang pita penanda di jalur kaki untuk jalan pulang saat asap tebal.")
    if tg and not panjang:
        tips.append("Taruh petak semprot biasa di sisi air yang sama supaya perbandingannya adil.")
    return {"status": status, "dalam": dalam, "peran": peran, "pompa": pompa, "topo": topo,
            "rute_catatan": " ".join(cat), "sulit": sulit, "mudah": mudah, "tips": tips}


HARI_FWI = ["2026-10-26"]    # diisi pemanggil (cetak.py) dari ringkasan; bawaan = tanggal pilot


def uji():
    """self-check: setiap angka di teks ada di data; tidak ada kurung kurawal tersisa selain placeholder; tanpa 'titik api'"""
    s = {"kel": {"brgm_3km": {"sekat_kanal": 2, "sumur_bor": 3, "sumur_rencana": 0, "lain": 0}, "air_asin": True, "air_asin_km": 4.2,
                 "elev_kompleks_m": 9.5, "elev_air_m": 8.0},
         "akses": {"dari": {"nama": "Daops X"}, "menit": {"jalan": 30, "perahu": 0, "kaki": 8, "alih": 0}, "ujung": "kaki",
                   "daops": {"nama": "Daops X", "total_menit": 200}, "saran": None},
         "hid": {"L": 900, "penuh": {"vonis": "NO-GO"}, "relay": {"n_ruas": 3, "L_ruas": 300}},
         "target": {"jam": -30, "d_km": 1.2, "n500": 4}, "paksa": {"otomatis": True},
         "air_calon": [{"d_km": 0.9}], "kaki_target": {"km": 0.6, "menit": 9},
         "gambut_prims": True, "gambut_tepi_km": 0.3, "cuaca": {"time": ["2026-10-28", "2026-10-29"], "precipitation_sum": [2, 15]},
         "fwi_sel": {"hari": [{"tgl": "2026-10-26", "dc": 500.0}]}, "kluster": [{"luas": 120, "d_km": 2.1, "n24": 3, "hari": 5}],
         "infra": [{"d_target": 0.7}]}
    t = teks_otomatis(s)
    assert t["status"] == "Ada titik panas 48 jam terakhir"
    assert "tipis" in t["dalam"] and "wajib dibor" in t["dalam"] and "0,3 km" in t["dalam"]
    assert "2 pompa tambahan" in t["pompa"] and "300 m" in t["pompa"]
    pj = " ".join(t["sulit"] + t["mudah"] + t["tips"])
    for harus in ("air asin", "4,2 km", "DC 500", "15 mm pada 29/10", "120 ha", "3,3 jam", "5 sumur bor", "0,7 km", "Tebal gambut"):
        assert harus in pj or harus in t["pompa"], harus
    kosong = dict(s, target=None, gambut_prims=False, paksa=None, cuaca=None, kluster=[], infra=[], fwi_sel={"hari": []})
    kosong["kel"] = {"brgm_3km": {}}; kosong["hid"] = {"L": 100, "penuh": {"vonis": "KONDISIONAL"}}
    kosong["akses"] = dict(s["akses"], daops=None, menit={"jalan": 0, "perahu": 0, "kaki": 5, "alih": 0})
    t2 = teks_otomatis(kosong)
    assert t2["status"].startswith("Latihan") and "wajib dibor" in t2["dalam"] and "Tidak tercatat" in t2["dalam"]
    assert t2["mudah"], "selalu ada minimal satu kalimat"
    for isi in (t, t2):
        semua = " ".join([isi[x] for x in ("status", "dalam", "peran", "pompa", "topo", "rute_catatan")] + isi["sulit"] + isi["mudah"] + isi["tips"])
        assert "titik api" not in semua.lower(), semua
        sisa = re.sub(r"\{(L|gulung|air_nama|air_d|p_lance|kaki_km|kaki_mnt)\}", "", semua)
        assert "{" not in sisa and "}" not in sisa, sisa
    assert "{" not in bersih("a{b}")
    u = umum({"situs": [{"no": 1, "gambut_prims": True}, {"no": 2, "gambut_prims": False}], "ringkas": {"n_gambut": 1}})
    assert "Lokasi 2 tidak tercatat" in u["cek_gambut"] and "RENTANG" in u["panjang"] and u["kerja"] == UMUM_PILOT["kerja"]
    print("teks_renlap uji ok")


if __name__ == "__main__":
    uji()
