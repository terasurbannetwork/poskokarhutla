"""Riwayat kejadian dari arsip Laporan Harian (laphar) Pusdalops / Dit. Koordalops BNPB -> public/data/laphar_riwayat.json

Tahap 2 dari 2. Tahap 1 (pdftotext + LaporanUrai.urai, satu JSON per hari di data/raw/laphar/hari) = laphar_arsip.mjs.
Jalan lokal saja: arsipnya 1,5 GB di luar repo, tidak ada workflow.

Pakai:  node scripts/umum/laphar_arsip.mjs && python3 scripts/umum/laphar_arsip.py [--masuk DIR] [--keluar FILE]
        python3 scripts/umum/laphar_arsip.py uji          self-check luring

Aturan (tertulis, diuji di `uji`):
  * Satu entri laphar = satu kemunculan kejadian pada satu hari. Kunci kejadian = (jenis, prov, kab | tempat | "-").
    Entri dengan kunci sama pada hari yang sama digabung (nilai terbesar per medan).
  * Episode = kemunculan berurutan dengan jeda <= SELA hari. Jeda lebih panjang = episode baru, id baru.
  * ANGKA: laphar mengulang angka KUMULATIF tiap hari dan sering menulis total lalu rinciannya. Maka angka satu entri =
    nilai TERBESAR yang tertulis untuk medan itu (bukan jumlah), dan angka episode = nilai terbesar sepanjang episode.
    Hasilnya bisa lebih rendah dari kenyataan (dua kalimat terpisah tidak dijumlah), tidak pernah lebih tinggi dari yang tertulis.
  * Nilai di atas BATAS_WAJAR dibuang dan dicatat (salah ketik dari daerah, mis. PM2.5 35.566 di laphar 27 Okt).
  * PRIVASI: tidak ada teks bebas (kronologi, upaya, korban, sumber) di berkas terbit; laphar memuat nama korban dan petugas.
    Yang terbit hanya nama wilayah, jenis, tanggal, angka, dan ringkasan status SK.
  * Baris tabel SK darurat yang bocor ke bagian A (judulnya memuat "SK ... TMT/s.d") dibuang dan dihitung di `dibuang`.

Keluaran: {"dibuat","sumber","catatan","cakupan":{mulai,sampai,hari,tanpa_pdf},"medan":{...},"dibuang":{...},
           "harian":{"YYYY-MM-DD":{"n":int,"jenis":{jenis:int}}},
           "episode":[{id,jenis,prov,kab|null,tempat,tingkat,mulai,terakhir,hari,status,status_penetapan,puncak:{medan:int}}]}
"""
import argparse, datetime as dt, importlib.util, json, os, re, sys

AKAR = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "../.."))
MASUK = os.path.join(AKAR, "data/raw/laphar")
KELUAR = os.path.join(AKAR, "public/data/laphar_riwayat.json")
SELA = 7       # laphar sering tidak memuat kejadian besar beberapa hari lalu memuatnya lagi; jeda 4-7 hari = 563 sambungan pada arsip 2026
BATAS_WAJAR = {"md": 5000, "hilang": 5000, "luka": 50000, "mengungsi_jiwa": 2_000_000, "terdampak_kk": 2_000_000,
               "terdampak_jiwa": 5_000_000, "rumah_rb": 500_000, "rumah_rs": 500_000, "rumah_rr": 500_000,
               "rumah_terdampak": 1_000_000, "luas_ha": 3_000_000}
MEDAN = {"md": "jiwa meninggal (MD)", "hilang": "jiwa hilang", "luka": "jiwa luka (LR/LB/luka-luka, nilai terbesar)",
         "mengungsi_jiwa": "jiwa mengungsi", "terdampak_kk": "KK terdampak", "terdampak_jiwa": "jiwa terdampak",
         "rumah_rb": "rumah rusak berat", "rumah_rs": "rumah rusak sedang", "rumah_rr": "rumah rusak ringan",
         "rumah_terdampak": "rumah terdampak/terendam", "luas_ha": "luas lahan terbakar (ha; karhutla provinsi = kumulatif sejak 1 Jan)"}


def _muat(nama, rel):
    s = importlib.util.spec_from_file_location(nama, os.path.join(AKAR, rel))
    m = importlib.util.module_from_spec(s)
    s.loader.exec_module(m)
    return m


# ---------------------------------------------------------------- angka
N = r"(\d{1,3}(?:\.\d{3})+(?:,\d+)?|\d+(?:[.,]\d+)?)"
TERBILANG = r"(?:\s*\([^)]{0,40}\))?"


def angka(s):
    """'1.629' -> 1629, '19.418,04' -> 19418.04, '430.4' -> 430.4, '12' -> 12."""
    s = s.strip()
    if "," in s:
        return float(s.replace(".", "").replace(",", "."))
    if re.fullmatch(r"\d{1,3}(\.\d{3})+", s):
        return int(s.replace(".", ""))
    return float(s) if "." in s else int(s)


POLA = {
    "md": rf"{N}{TERBILANG}\s*(?:jiwa|orang)\s*(?:MD\b|meninggal)",
    "hilang": rf"{N}{TERBILANG}\s*(?:jiwa|orang)\s*(?:hilang|(?:masih\s+)?dalam pencarian)",
    "luka": rf"{N}{TERBILANG}\s*(?:jiwa|orang)\s*(?:LR\b|LB\b|luka)",
    "mengungsi_jiwa": rf"{N}\s*(?:jiwa|orang)\s*(?:\([^)]*\)\s*)?mengungsi",
    "terdampak_kk": rf"{N}\s*KK\b(?=[^•]{{0,30}}?terdampak)",
    "terdampak_jiwa": rf"{N}\s*jiwa\s*terdampak",
    "rumah_rb": rf"{N}\s*(?:unit\s*)?rumah\s*(?:RB\b|rusak berat)",
    "rumah_rs": rf"{N}\s*(?:unit\s*)?rumah\s*(?:RS\b|rusak sedang)",
    "rumah_rr": rf"{N}\s*(?:unit\s*)?rumah\s*(?:RR\b|rusak ringan)",
    "rumah_terdampak": rf"{N}\s*(?:unit\s*)?rumah\s*(?:terdampak|terendam|tergenang)",
    "luas_ha": rf"{N}\s*(?:ha|hektar)\b",
}
POLA = {k: re.compile(v, re.I) for k, v in POLA.items()}
# label di depan angka: "Total MD: 11 (sebelas) jiwa", "Luka-luka: ± 1.620 jiwa", "Pengungsi: ± 5.666 KK / 20.000 jiwa"
_DEPAN = lambda label: re.compile(rf"(?:{label})\s*:\s*[±~\s]*(?:{N}\s*KK\s*/\s*[±~\s]*)?{N}{TERBILANG}\s*(?:jiwa|orang)", re.I)
POLA_DEPAN = {"md": _DEPAN(r"\bMD\b|meninggal(?:\s+dunia)?"), "hilang": _DEPAN(r"hilang"),
              "luka": _DEPAN(r"luka(?:-luka)?|\bLR\b|\bLB\b"), "mengungsi_jiwa": _DEPAN(r"pengungsi|mengungsi")}
RE_PROV_SEG = re.compile(r"\b(Prov\.|Provinsi)\s*([A-Z][A-Za-z.]*(?:\s+[A-Z][A-Za-z.]*){0,3})")
RE_LUAS_KAL = re.compile(r"terbakar|lahan terdampak", re.I)


def _bagian_sendiri(teks, prov_entri, prov):
    """buang potongan '•' yang menyebut provinsi LAIN (rincian 'Prov. NTB - Kota Bima' di entri gempa NTT)."""
    if not (prov and prov_entri):
        return teks
    out, di_lain = [], False
    for s in teks.split("•"):
        ps = [prov_dari_judul(m.group(0), prov) for m in RE_PROV_SEG.finditer(s)]
        ps = [p for p in ps if p]
        if ps:                       # judul provinsi berlaku untuk potongan sesudahnya sampai provinsi entri disebut lagi
            di_lain = any(p != prov_entri for p in ps)
        if not di_lain:
            out.append(s)
    return "•".join(out)


def angka_entri(k, buang=None, prov=None, tingkat_kab=False):
    """{medan: nilai terbesar yang tertulis}. luas_ha hanya untuk karhutla dan hanya dari kalimat 'terbakar'/'lahan terdampak';
    pada entri kabupaten, kalimat luas yang menyebut provinsi (indikatif SiPongi se-provinsi) dilewati."""
    teks = _bagian_sendiri(" • ".join(k.get(m) or "" for m in ("korban", "pengungsi", "kerugian")), k.get("prov"), prov)
    out = {}
    for m, re_ in POLA.items():
        if m == "luas_ha":
            if k.get("jenis") != "karhutla":
                continue
            kal = " • ".join(s for s in re.split(r"•", (k.get("kerugian") or "") + " • " + (k.get("kondisi") or ""))
                             if RE_LUAS_KAL.search(s) and not (tingkat_kab and RE_PROV_SEG.search(s)))
            vs = [angka(x) for x in re_.findall(kal)]
        else:
            vs = [angka(x) for x in re_.findall(teks)]
            if m in POLA_DEPAN:
                vs += [angka(g[-1]) for g in POLA_DEPAN[m].findall(teks)]
            if m == "mengungsi_jiwa":    # medan "Pengungsi:" sendiri: tiap "N jiwa" di dalamnya adalah pengungsi
                vs += [angka(x) for x in re.findall(rf"{N}\s*(?:jiwa|orang)\b", _bagian_sendiri(k.get("pengungsi") or "", k.get("prov"), prov), re.I)]
        vs = [v for v in vs if v is not None]
        if not vs:
            continue
        v = max(vs)
        if v > BATAS_WAJAR[m]:
            if buang is not None:
                buang.append(f"{m}={v}")
            vs = [x for x in vs if x <= BATAS_WAJAR[m]]
            if not vs:
                continue
            v = max(vs)
        out[m] = round(v, 2) if isinstance(v, float) else v
    return out


# ---------------------------------------------------------------- wilayah
def _baku(s):
    return re.sub(r"\s+", " ", re.sub(r"[^a-z0-9 ]", " ", s.lower())).strip()


def prov_dari_judul(judul, prov):
    """cadangan bila pengurai tidak menemukan provinsi: nama provinsi terpanjang yang muncul di judul."""
    j = " " + _baku(judul) + " "
    calon = [(k, _baku(v)) for k, v in prov.items()]
    calon += [("31", "jakarta"), ("34", "yogyakarta"), ("52", "ntb"), ("53", "ntt"), ("34", "diy"), ("12", "sumut"), ("13", "sumbar"),
              ("16", "sumsel"), ("61", "kalbar"), ("62", "kalteng"), ("63", "kalsel"), ("64", "kaltim"), ("32", "jabar"), ("33", "jateng"), ("35", "jatim")]
    pilih = [(len(v), k) for k, v in calon if f" {v} " in j]
    return max(pilih)[1] if pilih else ""


def nama_kab(tempat):
    """'kab. Sragen Prov. Jawa Tengah' / 'Kab Sragen' / 'Kabupaten Sragen' -> 'Kab. Sragen'; 'Kota. Pasuruan' -> 'Kota Pasuruan'."""
    t = re.sub(r"^(Kab|Kota)\s*,\s*", r"\1. ", tempat.strip(), flags=re.I)    # "Kab, Batang"
    t = re.sub(r",.*$", "", t)                                                # nama kab tak pernah berkoma
    t = re.sub(r"\s+(Prov\.?|Provinsi)\b.*$", "", t, flags=re.I).strip(" ,.")
    t = re.sub(r"^((Kabupaten|Kab\.?)\s*)+", "Kab. ", t, flags=re.I)          # "Kab. Kab. Jepara"
    t = re.sub(r"^Kota\.?\s+((Adm\.?|Administrasi)\s+)?", "Kota ", t, flags=re.I)
    return re.sub(r"\bKep\.\s*", "Kepulauan ", t)


# singkatan yang dipakai petugas di judul laphar -> nama di public/geo/kabupaten
SINGKATAN_KAB = {"oku": "Ogan Komering Ulu", "oku timur": "Ogan Komering Ulu Timur", "oku selatan": "Ogan Komering Ulu Selatan",
                 "oki": "Ogan Komering Ilir", "pali": "Penukal Abab Lematang Ilir", "muba": "Musi Banyuasin", "mura": "Musi Rawas",
                 "muratara": "Musi Rawas Utara", "inhil": "Indragiri Hilir", "inhu": "Indragiri Hulu", "kuansing": "Kuantan Singingi",
                 "kukar": "Kutai Kartanegara", "kutim": "Kutai Timur", "kubar": "Kutai Barat", "kotim": "Kotawaringin Timur",
                 "kobar": "Kotawaringin Barat", "tanjabtim": "Tanjung Jabung Timur", "tanjabbar": "Tanjung Jabung Barat",
                 "kepulauan sitaro": "Kepulauan Siau Tagulandang Biaro", "sitaro": "Kepulauan Siau Tagulandang Biaro",
                 "pangkep": "Pangkajene Kepulauan", "sidrap": "Sidenreng Rappang", "sindrang rappang": "Sidenreng Rappang"}


def kab_dari(cari_kab, tempat, prov):
    """kunci kab di geo. Laphar kadang menyingkat ('Kab. OKU Timur'), salah awalan ('Kab. Lhokseumawe'),
    atau tanpa 'Administrasi' (Jakarta): semuanya dicoba berurutan."""
    n = nama_kab(tempat)
    if n.startswith("Kab. ") and n[5:].lower() in SINGKATAN_KAB:
        n = "Kab. " + SINGKATAN_KAB[n[5:].lower()]
    k = cari_kab(n, prov)
    if not k and prov == "31" and n.startswith("Kota "):
        k = cari_kab("Kota Administrasi " + n[5:], prov)
    if not k and n.startswith(("Kab. ", "Kota ")):
        inti = n.split(" ", 1)[1]
        k = cari_kab(("Kota " if n.startswith("Kab. ") else "Kab. ") + inti, prov)
    return k


# urutan sama dengan POLA_JENIS di public/laporan_urai.js
POLA_JENIS = [(r"\bTPA\b", "lainnya"), (r"kebakaran (permukiman|pemukiman|rumah)", "kebakaran_permukiman"),
              (r"karhutla|hutan dan lahan|kebakaran hutan|kebakaran lahan", "karhutla"), (r"kekeringan", "kekeringan"),
              (r"gempa|tsunami", "gempabumi"), (r"banjir", "banjir"), (r"longsor", "longsor"), (r"erupsi|gunung ?api|vulkan", "gunungapi"),
              (r"cuaca ekstr|angin kencang|puting beliung|gelombang|abrasi", "cuaca")]


def jenis_entri(k):
    """judul berupa wilayah saja ('Kab. Aceh Tamiang, Prov. Aceh') -> jenis dari kalimat kronologi."""
    j = k.get("jenis") or "lainnya"
    if j != "lainnya" or not re.match(r"(Kab\.|Kabupaten|Kota)\s", k.get("judul") or "", re.I):
        return j
    kr = k.get("kronologi") or ""
    return next((v for p, v in POLA_JENIS if re.search(p, kr, re.I)), "lainnya")


RE_BOCOR_SK = re.compile(r"\bSK\b.*(TMT|s\.?d|s/d)|\bTMT\b", re.I)


def susun(hari, prov, cari_kab, tanpa_pdf=()):
    """hari: [{tanggal, kejadian:[...]}] urut tanggal -> isi berkas terbit."""
    dibuang = {"bocor_tabel_sk": 0, "tanpa_provinsi": 0, "angka_tak_wajar": []}
    harian, muncul = {}, {}        # muncul[kunci][tanggal] = rekaman hari itu
    kab_cache = {}
    for h in hari:
        t = h["tanggal"]
        hj = harian.setdefault(t, {"n": 0, "jenis": {}})
        for k in h["kejadian"]:
            judul = k.get("judul") or ""
            if RE_BOCOR_SK.search(judul):
                dibuang["bocor_tabel_sk"] += 1
                continue
            p = k.get("prov") or prov_dari_judul(judul, prov)
            if not p:
                dibuang["tanpa_provinsi"] += 1
                continue
            tempat = (k.get("tempat") or "").strip()
            if re.match(r"M\s*\d", tempat):          # "M 6,4 Prov. Jawa Timur": magnitudo gempa, bukan wilayah
                tempat = ""
            kab = None
            if re.match(r"(Kab|Kabupaten|Kota)\b", tempat, re.I):
                if (tempat, p) not in kab_cache:
                    kk = kab_dari(cari_kab, tempat, p)
                    if not kk:                         # provinsi di judul salah tulis: pakai kab yang namanya unik se-Indonesia
                        lain = {x for x in (kab_dari(cari_kab, tempat, q) for q in prov if q != p) if x}
                        kk = lain.pop() if len(lain) == 1 else None
                    kab_cache[(tempat, p)] = kk
                kab = kab_cache[(tempat, p)]
                if kab and kab[:2] != p:
                    dibuang["prov_dibetulkan"] = dibuang.get("prov_dibetulkan", 0) + 1
                    p = kab[:2]
            tingkat = "kab" if kab else ("prov" if not tempat else "lain")
            kunci = (jenis_entri(k), p, kab or (_baku(nama_kab(tempat)) or "prov"))
            buang = []
            a = angka_entri({**k, "prov": p}, buang, prov, tingkat == "kab")
            dibuang["angka_tak_wajar"] += [f"{t} {judul[:60]}: {b}" for b in buang]
            hj["n"] += 1
            hj["jenis"][kunci[0]] = hj["jenis"].get(kunci[0], 0) + 1
            r = muncul.setdefault(kunci, {}).get(t)
            if r is None:
                muncul[kunci][t] = {"tempat": tempat, "tingkat": tingkat, "angka": a,
                                    "status": k.get("status") or "", "status_penetapan": (k.get("status_penetapan") or "")[:160]}
            else:                   # dua entri satu kunci satu hari: nilai terbesar per medan
                for m, v in a.items():
                    r["angka"][m] = max(v, r["angka"].get(m, 0))
    episode = []
    for kunci, per in muncul.items():
        tgl = sorted(per)
        mulai = tgl[0]
        for i, t in enumerate(tgl):
            akhir = i == len(tgl) - 1 or (dt.date.fromisoformat(tgl[i + 1]) - dt.date.fromisoformat(t)).days > SELA
            if not akhir:
                continue
            isi = [x for x in tgl if mulai <= x <= t]
            puncak = {}
            for x in isi:
                for m, v in per[x]["angka"].items():
                    puncak[m] = max(v, puncak.get(m, 0))
            akhir_r = per[t]
            jenis, p, kab = kunci
            episode.append({"id": f"{jenis}-{p}-{(kab or kunci[2]).replace('|', '-').replace(' ', '_')}-{mulai}",
                            "jenis": jenis, "prov": p, "kab": kab if "|" in kab else None,
                            "tempat": akhir_r["tempat"], "tingkat": akhir_r["tingkat"],
                            "mulai": mulai, "terakhir": t, "hari": len(isi),
                            "status": akhir_r["status"], "status_penetapan": akhir_r["status_penetapan"], "puncak": puncak})
            if i + 1 < len(tgl):
                mulai = tgl[i + 1]
    episode.sort(key=lambda e: (e["mulai"], e["id"]))
    ts = sorted(harian)
    return {"cakupan": {"mulai": ts[0] if ts else None, "sampai": ts[-1] if ts else None, "hari": len(ts), "tanpa_pdf": list(tanpa_pdf)},
            "medan": MEDAN, "dibuang": dibuang, "harian": harian, "episode": episode}


def jalan(masuk, keluar):
    K = _muat("umum_kejadian", "scripts/umum/kejadian.py")
    prov = {k: v["nama"] for k, v in json.load(open(os.path.join(AKAR, "public/data/laporan.json"), encoding="utf-8"))["prov"].items()}
    d = os.path.join(masuk, "hari")
    if not os.path.isdir(d):
        sys.exit(f"tidak ada {d}: jalankan dulu node scripts/umum/laphar_arsip.mjs")
    hari = [json.load(open(os.path.join(d, f), encoding="utf-8")) for f in sorted(os.listdir(d)) if f.endswith(".json")]
    try:
        tanpa_pdf = json.load(open(os.path.join(masuk, "indeks.json"), encoding="utf-8")).get("tanpa_pdf", [])
    except OSError:
        tanpa_pdf = []
    isi = susun(hari, prov, lambda n, p: K.cari_kab(AKAR, n, p), tanpa_pdf)
    out = {"dibuat": dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds"),
           "sumber": "Laporan Harian Pusdalops BNPB (Jan-Feb 2026) dan Dit. Koordalops BNPB (Mar 2026-), arsip PDF harian",
           "catatan": "Angka = nilai terbesar yang tertulis di laporan, bukan jumlah; angka daerah disalin apa adanya. "
                      "Hari tanpa PDF belum diurai (lihat cakupan.tanpa_pdf). Tabel SK darurat tidak diambil (lihat status_darurat.json).",
           **isi}
    os.makedirs(os.path.dirname(keluar), exist_ok=True)
    tmp = keluar + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, separators=(",", ":"))
    os.replace(tmp, keluar)
    e = isi["episode"]
    print(f"{isi['cakupan']['hari']} hari, {sum(h['n'] for h in isi['harian'].values())} kemunculan, {len(e)} episode "
          f"({sum(1 for x in e if x['kab'])} berkode kab); dibuang: bocor SK {isi['dibuang']['bocor_tabel_sk']}, "
          f"tanpa prov {isi['dibuang']['tanpa_provinsi']}, angka tak wajar {len(isi['dibuang']['angka_tak_wajar'])}; "
          f"{os.path.getsize(keluar) // 1024} KB -> {os.path.relpath(keluar, AKAR)}")


def uji():
    a = angka_entri({"jenis": "banjir", "korban": "• 101 (seratus satu) jiwa MD (pendataan) • 18 jiwa luka-luka/sakit "
                     "• 18.514 KK / 90.185 jiwa terdampak (Tidak mengungsi) • 22.020 KK / 90.379 jiwa mengungsi, dengan rincian: "
                     "Kec. Rantau: 9.557 KK/38.229 jiwa • 2 (dua) orang hilang",
                     "kerugian": "• ± 37.888 unit rumah rusak • 15.174 unit rumah RR • 9.366 unit rumah RS • 8.509 unit rumah RB "
                     "• 7.529 ha lahan persawahan RB"})
    assert a == {"md": 101, "hilang": 2, "luka": 18, "mengungsi_jiwa": 90379, "terdampak_kk": 18514, "terdampak_jiwa": 90185,
                 "rumah_rb": 8509, "rumah_rs": 9366, "rumah_rr": 15174}, a
    # total lalu rincian: nilai terbesar, bukan jumlah
    assert angka_entri({"korban": "• 3 jiwa MD • Kec. A: 2 jiwa MD • Kec. B: 1 jiwa MD"}) == {"md": 3}
    # luas hanya karhutla dan hanya kalimat "terbakar"; desimal Indonesia
    kh = {"jenis": "karhutla", "kerugian": "• Luas Lahan Terbakar s/d 10 Sep total ± 19.418,04 ha (pendataan) • 7 ha sawah"}
    assert angka_entri(kh) == {"luas_ha": 19418.04}, angka_entri(kh)
    assert angka_entri({**kh, "jenis": "banjir"}) == {}
    assert angka("430.4") == 430.4 and angka("1.629") == 1629 and angka("12") == 12
    b = []
    assert angka_entri({"korban": "• 35566 jiwa MD"}, b) == {} and b == ["md=35566"]
    prov = {"13": "Sumatera Barat", "31": "DKI Jakarta", "34": "DI Yogyakarta", "33": "Jawa Tengah"}
    assert prov_dari_judul("Cuaca Ekstrim di Kab. Sleman, Prov. DI. Yogyakarta", prov) == "34"
    assert prov_dari_judul("Banjir di Kota Adm. Jakarta Selatan, Provinsi Jakarta", prov) == "31"
    assert nama_kab("Kota Adm. Jakarta Selatan") == "Kota Jakarta Selatan" and nama_kab("Kabupaten Pati") == "Kab. Pati"
    assert [nama_kab(x) for x in ("Kab. Bener Meriah Prov. Aceh", "kab. Pekalongan", "Kab Sragen", "Kota. Pasuruan",
                                  "Kab. Malang, Provinsi. Jawa Timur", "Kab. Kep. Sitaro")] == \
        ["Kab. Bener Meriah", "Kab. Pekalongan", "Kab. Sragen", "Kota Pasuruan", "Kab. Malang", "Kab. Kepulauan Sitaro"]
    assert kab_dari(lambda n, p: "11|Kota Lhokseumawe" if n == "Kota Lhokseumawe" else None, "Kab. Lhokseumawe", "11") == "11|Kota Lhokseumawe"
    cari = lambda n, p: {"Kab. Ogan Komering Ulu Timur": "16|Ogan Komering Ulu Timur", "Kota Administrasi Jakarta Selatan": "31|Kota Administrasi Jakarta Selatan"}.get(n)
    assert kab_dari(cari, "Kab. Oku Timur", "16") == "16|Ogan Komering Ulu Timur" and kab_dari(cari, "Kota Adm. Jakarta Selatan", "31") == "31|Kota Administrasi Jakarta Selatan"
    assert jenis_entri({"jenis": "lainnya", "judul": "Kab. Aceh Tamiang, Prov. Aceh", "kronologi": "mengakibatkan banjir bandang"}) == "banjir"
    assert jenis_entri({"jenis": "lainnya", "judul": "Bencana Sosial di Kab. X", "kronologi": "banjir"}) == "lainnya"
    assert angka_entri({"korban": "• Total MD: 11 (sebelas) jiwa, rincian: - Update 1 jiwa MD"}) == {"md": 11}
    # temuan pemeriksa 29 Okt: label di depan angka, medan Pengungsi, "masih dalam pencarian", rumah tanpa "unit"
    assert angka_entri({"korban": "• Luka-luka: ± 1.620 jiwa • 665 jiwa luka-luka • 3 jiwa masih dalam pencarian",
                        "pengungsi": "• Pengungsi: ± 5.666 KK / 20.000 jiwa", "kerugian": "• 19 Rumah Terdampak"}) == \
        {"luka": 1620, "hilang": 3, "mengungsi_jiwa": 20000, "rumah_terdampak": 19}
    # rincian provinsi lain di dalam entri tidak ikut; luas se-provinsi tidak masuk entri kabupaten
    pv = {"52": "Nusa Tenggara Barat", "53": "Nusa Tenggara Timur", "92": "Papua Barat"}
    assert angka_entri({"prov": "53", "korban": "• 12.000 KK terdampak • Prov. NTB - Kota Bima : 1 KK / 6 jiwa terdampak"}, prov=pv) == {"terdampak_kk": 12000}
    assert angka_entri({"prov": "53", "korban": "• Prov. NTT • 40 jiwa terdampak • Prov. NTB • Kota Bima : 1 KK / 6 jiwa terdampak "
                        "• Prov. NTT • 9 KK terdampak"}, prov=pv) == {"terdampak_kk": 9, "terdampak_jiwa": 40}
    assert nama_kab("Kab, Batang Prov. Jawa Tengah") == "Kab. Batang"
    kb = {"jenis": "karhutla", "prov": "92", "kerugian": "• ± 260.37 ha luas lahan terdampak",
          "kondisi": "• Luas indikatif lahan terbakar di Provinsi Papua Barat seluas 2.496,39 ha"}
    assert angka_entri(kb, prov=pv, tingkat_kab=True) == {"luas_ha": 260.37} and angka_entri(kb, prov=pv)["luas_ha"] == 2496.39
    assert [nama_kab(x) for x in ("Kab. Kab. Jepara", "Kab. Lampung Timur, Prov Lampung", "Kab. Penajam Paser Utara, Kalimantan Timur",
                                  "Kab. Sarolangun, Prov, Jambi")] == ["Kab. Jepara", "Kab. Lampung Timur", "Kab. Penajam Paser Utara", "Kab. Sarolangun"]
    # provinsi salah di judul: kab unik se-Indonesia membetulkannya
    geo = {("Kab. Cilacap", "33"): "33|Cilacap"}
    r2 = susun([{"tanggal": "2026-07-01", "kejadian": [{"judul": "Kekeringan di Kab. Cilacap, Provinsi Jawa Barat", "jenis": "kekeringan",
                                                        "prov": "32", "tempat": "Kab. Cilacap"}]}],
               {"32": "Jawa Barat", "33": "Jawa Tengah"}, lambda n, p: geo.get((n, p)))
    assert r2["episode"][0]["prov"] == "33" and r2["episode"][0]["kab"] == "33|Cilacap" and r2["dibuang"]["prov_dibetulkan"] == 1
    # episode: jeda <= SELA hari menyambung, lebih panjang = episode baru; angka episode = puncak; bocoran tabel SK dibuang
    e = lambda t, korban="", judul="Banjir di Kab. Pati, Provinsi Jawa Tengah": {"tanggal": t, "kejadian": [
        {"judul": judul, "jenis": "banjir", "prov": "33", "tempat": "Kab. Pati", "korban": korban, "status": "berjalan"}]}
    hari = [e("2026-01-01", "• 10 KK terdampak"), e("2026-01-08", "• 40 KK terdampak"), e("2026-01-09", "• 25 KK terdampak"),
            e("2026-01-17"), {"tanggal": "2026-01-17", "kejadian": [{"judul": "Hidrometeorologi Prov. Jawa SK Siaga TMT 1 Des", "prov": ""}]}]
    hari = hari[:3] + [{"tanggal": "2026-01-17", "kejadian": hari[3]["kejadian"] + hari[4]["kejadian"]}]
    assert SELA == 7
    r = susun(hari, prov, lambda n, p: "33|Pati" if n == "Kab. Pati" else None)
    ep = r["episode"]
    assert [(x["mulai"], x["terakhir"], x["hari"]) for x in ep] == [("2026-01-01", "2026-01-09", 3), ("2026-01-17", "2026-01-17", 1)], ep
    assert ep[0]["puncak"] == {"terdampak_kk": 40} and ep[0]["kab"] == "33|Pati" and ep[0]["tingkat"] == "kab"
    assert r["dibuang"]["bocor_tabel_sk"] == 1 and r["harian"]["2026-01-17"]["n"] == 1
    # tidak ada teks bebas di keluaran
    assert set(ep[0]) == {"id", "jenis", "prov", "kab", "tempat", "tingkat", "mulai", "terakhir", "hari", "status", "status_penetapan", "puncak"}
    print("uji laphar_arsip.py: lulus")


if __name__ == "__main__":
    if sys.argv[1:2] == ["uji"]:
        uji()
    else:
        ap = argparse.ArgumentParser()
        ap.add_argument("--masuk", default=MASUK)
        ap.add_argument("--keluar", default=KELUAR)
        a = ap.parse_args()
        jalan(a.masuk, a.keluar)
