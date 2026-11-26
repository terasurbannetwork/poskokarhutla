"""MT-1 Katalog Dana Bersama prabencana dan komponen biaya (DESAIN-TEKNIS sec 6.10, ALGORITMA sec 10.14; tiket RU-092 dan RU-093).

Bahan tahap pertama alat penyusun usulan di peramban (public/bnpb/unit/mt1.js): bukan kanal pengajuan, tidak menyimpan apa pun di server.
  RU-092 katalog: kode kegiatan 02.01.01 sampai 02.01.11 dan klasifikasi risiko lingkungan dan sosial (ESMS, Environmental and Social Management System,
          GLOSARIUM) dari Lampiran I Juklak 4/2025 (data/hukum/teks/juklak-nomor-4-tahun-2025.txt.gz, diurai langsung; halaman 20).
          Klasifikasi ditulis persis seperti di Lampiran: ada yang rentang ("rendah - menengah", "rendah ke tinggi"); kelas pasti per usulan ditentukan telaah,
          bukan ditebak di sini. Aturan satu usulan satu keluaran (Juklak 4/2025 Bab III huruf C): periksa_usulan().
  RU-093 komponen: Lampiran II Juklak 2/2026 (PDF 278 halaman, tidak ikut git) diekstrak LOKAL oleh `ekstrak` ke standar_biaya_2026.json (ikut git):
          per kegiatan 02.01.xx dan pemohon, baris komponen {uraian, variabel, kuantitas, volume, catatan, sifat Pokok atau Opsional, halaman, batas}.
          Juklak 2/2026 TIDAK memuat harga satuan (harga mengikuti SBK Kemenkeu dan daerah, Bab III huruf A), jadi "di atas standar" hanya berarti jumlah di atas
          batas tertulis "Maksimal N" di kolom Catatan; harga satuan diisi pemohon. Batas tanpa peran (kuantitas atau volume) yang jelas tidak dipakai menandai otomatis.

  python3 -I scripts/bnpb/unit/mt1.py --cek
  python3 -I scripts/bnpb/unit/mt1.py ekstrak <juklak-2-2026.pdf>      (lokal; menulis standar_biaya_2026.json)
"""
import gzip
import html
import json
import os
import re
import subprocess
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))  # -I tidak menaruh folder skrip
import rapor  # noqa: E402

SINI = os.path.dirname(os.path.abspath(__file__))
AKAR = os.path.dirname(os.path.dirname(os.path.dirname(SINI)))
J4 = os.path.join(AKAR, "data", "hukum", "teks", "juklak-nomor-4-tahun-2025.txt.gz")
STANDAR = os.path.join(SINI, "standar_biaya_2026.json")
KODE = re.compile(r"^02\.01\.(0[1-9]|1[01])$")
PEMOHON = {"KEMENTERIAN/LEMBAGA": "kl", "PEMERINTAH DAERAH PROVINSI": "provinsi", "PEMERINTAH DAERAH KABUPATEN/KOTA": "kabkota"}
NAMA_PEMOHON = {"kl": "Kementerian/Lembaga", "provinsi": "Pemerintah daerah provinsi", "kabkota": "Pemerintah daerah kabupaten/kota"}
SIFAT = ("Pokok", "Opsional")
# tepi kiri sel kolom Lampiran II (titik PDF, terukur dari 266 halaman); kolom = indeks terakhir yang tepinya <= x + 2
TEPI = [("uraian", 70), ("variabel", 184), ("kuantitas", 304), ("volume", 424), ("besaran", 544), ("catatan", 664), ("sifat", 800)]
PERAN = {"orang": "kuantitas", "bulan": "volume", "hari": "volume", "kali": "volume", "jam": "volume", "eksemplar": "volume"}  # satuan yang jelas perannya


def _norm(s):
    return re.sub(r"[^a-z0-9]+", " ", s.lower()).strip()


# ---------------------------------------------------------------- RU-092 katalog
def urai_katalog(teks):
    """Baris Lampiran I Juklak 4/2025 kode 02.01.xx -> [{kode, nama, klasifikasi, rentang}]. Teks = isi gz (satu berkas, penanda '=== hal N')."""
    hal = teks.split("=== hal 20\n", 1)
    if len(hal) < 2:
        raise ValueError("halaman 20 Juklak 4/2025 tidak ditemukan")
    blok = hal[1].split("=== hal 21", 1)[0]
    baris, kini = [], None
    for b in blok.splitlines():
        if not b.strip() or re.match(r"^\s*-\s*\d+\s*-\s*$", b):
            continue
        m = re.match(r"^\s*\d+\.\s+(\d{2}(?:\.\d{2}){0,2})\s*(.*)$", b)
        if m:
            kode, sisa = m.group(1), m.group(2)
            kini = {"kode": kode, "nama": [], "klas": []}
            baris.append(kini)
            bagian = [x for x in re.split(r"\s{2,}", sisa.strip()) if x]
            if len(bagian) >= 2:
                kini["nama"].append(bagian[0]); kini["klas"].append(" ".join(bagian[1:]))
            elif bagian:
                kini["nama"].append(bagian[0]) if len(b) - len(b.lstrip()) < 50 else kini["klas"].append(bagian[0])
            continue
        if kini is None:
            continue
        indent = len(b) - len(b.lstrip())
        bagian = [x for x in re.split(r"\s{2,}", b.strip()) if x]
        if len(bagian) >= 2:
            kini["nama"].append(bagian[0]); kini["klas"].append(" ".join(bagian[1:]))
        elif bagian:
            (kini["klas"] if indent > 60 else kini["nama"]).append(bagian[0])
    out = []
    for r in baris:
        if KODE.match(r["kode"]):
            kl = " ".join(r["klas"]).strip()
            out.append({"kode": r["kode"], "nama": " ".join(" ".join(r["nama"]).split()), "klasifikasi": kl, "rentang": bool(re.search(r"\bke\b|-", kl))})
    return out


def muat_katalog(jalur=J4):
    with gzip.open(jalur, "rt", encoding="utf-8") as f:
        k = urai_katalog(f.read())
    periksa_katalog(k)
    return k


def periksa_katalog(k):
    kode = [x["kode"] for x in k]
    if kode != [f"02.01.{i:02d}" for i in range(1, 12)]:
        raise ValueError(f"katalog harus tepat 02.01.01 sampai 02.01.11 berurutan, dapat {kode}")
    for x in k:
        if not x["nama"] or not re.fullmatch(r"(rendah|menengah|substansial|tinggi)( (ke|-) (rendah|menengah|substansial|tinggi))?", x["klasifikasi"]):
            raise ValueError(f"{x['kode']}: nama atau klasifikasi tak terbaca: {x!r}")  # satu klasifikasi tertulis per kode
    return k


def periksa_usulan(kegiatan, keluaran):
    """Juklak 4/2025 Bab III huruf C: satu usulan membiayai SATU keluaran dan satu kode kegiatan. -> daftar alasan tolak (kosong = lolos)."""
    alasan = []
    kode = [kegiatan] if isinstance(kegiatan, str) else list(kegiatan or [])
    keluaran = [x for x in (keluaran or []) if str(x).strip()]
    if len(set(kode)) != 1 or not KODE.match(str(kode[0]) if kode else ""):
        alasan.append("usulan harus memilih tepat satu kode kegiatan 02.01.01 sampai 02.01.11")
    if len(keluaran) != 1:
        alasan.append("usulan hanya untuk satu keluaran (Juklak 4/2025 Bab III huruf C)" if keluaran else "usulan belum menyebut keluarannya")
    return alasan


# ---------------------------------------------------------------- RU-093 komponen biaya
def batas_dari(catatan):
    """'Maksimal 7 (tujuh) orang (42 OB)' -> [{nilai, teks, peran}]. peran None bila satuannya tak jelas (tidak dipakai menandai otomatis)."""
    out = []
    for m in re.finditer(r"[Mm]aksimal\s+(\d+)\s*\([^)]*\)\s*([^.;]*)", catatan or ""):
        teks = " ".join(m.group(0).split())
        satuan = re.findall(r"[a-z]+", m.group(2).lower())
        peran = next((PERAN[s] for s in satuan[:2] if s in PERAN), None)
        out.append({"nilai": int(m.group(1)), "teks": teks, "peran": peran})
    return out


def kata_halaman(bbox):
    """XHTML pdftotext -bbox -> [(nomor halaman urut, [(x, y, teks)])]; teks sudah di-unescape."""
    out = []
    for i, pg in enumerate(bbox.split("<page ")[1:]):
        out.append((i, [(float(m.group(1)), float(m.group(2)), html.unescape(m.group(3)))
                        for m in re.finditer(r'<word xMin="([\d.]+)" yMin="([\d.]+)" xMax="[\d.]+" yMax="[\d.]+">(.*?)</word>', pg)]))
    return out


def _kolom(x):
    k = TEPI[0][0]
    for nama, tepi in TEPI:
        if x + 2 >= tepi:
            k = nama
    return k


def _baris_teks(kata):
    """Kata -> baris menurut y (toleransi 3 titik), tiap baris urut x."""
    baris = []
    for x, y, t in sorted(kata, key=lambda w: (w[1], w[0])):
        if baris and abs(baris[-1][0] - y) <= 3:
            baris[-1][1].append((x, t))
        else:
            baris.append([y, [(x, t)]])
    return [(y, sorted(ws)) for y, ws in baris]


def urai_standar(halaman, katalog):
    """halaman = [(nomor halaman PDF, kata)]; -> {kode: {pemohon: [komponen]}} hanya untuk kegiatan di katalog (02.01.xx).
    Baris komponen dimulai di baris yang kolom Sifat-nya Pokok atau Opsional (semua sel rata atas); baris sesudahnya tanpa Sifat melanjutkan baris itu.
    Uraian bersel gabung: satu uraian dipakai semua baris sampai uraian berikutnya."""
    nama_ke_kode = {_norm(k["nama"]): k["kode"] for k in katalog}
    hasil, kode, pem, baris, grup, judul, tabel = {}, None, None, None, None, None, False
    mentah = []
    for nomor, kata in halaman:
        for y, ws in _baris_teks(kata):
            if y < 60:
                continue  # nomor halaman
            teks = " ".join(t for _, t in ws)
            if judul is not None:
                if ws[0][0] < 80 and not re.match(r"^(SUB KATEGORI|PEMOHON)", teks):
                    judul += " " + teks
                    continue
                kode, judul = nama_ke_kode.get(_norm(judul)), None
            m = re.match(r"^KEGIATAN\s*:\s*(.*)$", teks)
            if m:
                judul, kode, pem, baris, grup, tabel = m.group(1), None, None, None, None, False
                continue
            m = re.match(r"^PEMOHON:\s*(.*)$", teks)
            if m:
                pem, baris, grup, tabel = PEMOHON.get(m.group(1).strip()), None, None, False
                if kode and pem:
                    hasil.setdefault(kode, {}).setdefault(pem, [])
                continue
            if re.match(r"^Uraian\s+Variabel", teks):
                tabel = True
                continue
            if not (kode and pem and tabel) or teks.startswith("Komponen Pembiayaan"):
                continue
            sel = {}
            for x, t in ws:
                sel.setdefault(_kolom(x), []).append(t)
            if " ".join(sel.get("sifat", [])) in SIFAT:
                if "uraian" in sel:
                    grup = {"uraian": list(sel["uraian"])}
                baris = {"grup": grup, "sifat": " ".join(sel["sifat"]), "halaman": nomor, **{k: list(sel.get(k, [])) for k in ("variabel", "kuantitas", "volume", "besaran", "catatan")}}
                hasil[kode][pem].append(baris)
            elif baris is not None:
                for k in ("variabel", "kuantitas", "volume", "besaran", "catatan"):
                    baris[k] += sel.get(k, [])
                if "uraian" in sel and grup is not None:
                    grup["uraian"] += sel["uraian"]
    ra = lambda l: " ".join(" ".join(l).split())  # noqa: E731
    return {k: {p: [{"uraian": ra(b["grup"]["uraian"]) if b["grup"] else "", "variabel": ra(b["variabel"]), "kuantitas": ra(b["kuantitas"]), "volume": ra(b["volume"]),
                     "rumus": ra(b["besaran"]), "catatan": ra(b["catatan"]), "sifat": b["sifat"], "halaman": b["halaman"], "batas": batas_dari(ra(b["catatan"]))} for b in bs]
                for p, bs in ps.items()} for k, ps in hasil.items()}


def ekstrak(pdf, keluar=STANDAR):
    """Lokal: PDF Juklak 2/2026 -> standar_biaya_2026.json (halaman Lampiran II mulai 13). PDF tidak ikut git (data/raw/hukum diabaikan)."""
    katalog = muat_katalog()
    xml = subprocess.run(["pdftotext", "-bbox", "-f", "13", pdf, "-"], check=True, capture_output=True, text=True).stdout
    hal = [(i + 13, k) for i, k in kata_halaman(xml)]
    d = urai_standar(hal, katalog)
    periksa_standar(d, katalog)
    with open(keluar, "w", encoding="utf-8") as f:
        json.dump({"_tentang": "Komponen biaya Lampiran II Juklak 2/2026 untuk kegiatan 02.01.01-02.01.11, diekstrak python3 -I scripts/bnpb/unit/mt1.py ekstrak <pdf> (RU-093). Tanpa harga satuan: Juklak menyerahkannya ke SBK Kemenkeu dan daerah.",
                   "sumber": "Juklak BNPB Nomor 2 Tahun 2026 Lampiran II", "standar": d}, f, ensure_ascii=False, indent=1)
    return d


def periksa_standar(d, katalog=None):
    """Tiap kode di katalog punya standar untuk tiga pemohon yang terbaca; tiap komponen bersifat Pokok atau Opsional dan berhalaman; batas berbentuk angka."""
    katalog = katalog or muat_katalog()
    kode = {k["kode"] for k in katalog}
    if not d or set(d) - kode:
        raise ValueError(f"standar memuat kode di luar katalog atau kosong: {sorted(set(d) - kode)}")
    for k, ps in d.items():
        for p, bs in ps.items():
            if p not in NAMA_PEMOHON:
                raise ValueError(f"{k}: pemohon {p!r} tak dikenal")
            for i, b in enumerate(bs):
                if b["sifat"] not in SIFAT or not isinstance(b["halaman"], int) or not b["uraian"] or not b["variabel"]:
                    raise ValueError(f"{k} {p} baris {i}: komponen tak lengkap {b!r}")
                for x in b["batas"]:
                    if not isinstance(x["nilai"], int) or x["nilai"] <= 0 or x["peran"] not in (None, "kuantitas", "volume"):
                        raise ValueError(f"{k} {p} baris {i}: batas tak sah {x!r}")
    return d


def muat_standar(jalur=STANDAR):
    with open(jalur, encoding="utf-8") as f:
        return periksa_standar(json.load(f)["standar"])


def tandai(komponen, kuantitas, volume):
    """RAB satu komponen: di atas batas tertulis? -> [teks batas yang dilampaui]. Batas tanpa peran jelas tidak dipakai; jumlah kosong tidak dihitung 0."""
    lampau = []
    for b in komponen.get("batas", []):
        n = {"kuantitas": kuantitas, "volume": volume}.get(b["peran"])
        if isinstance(n, (int, float)) and not isinstance(n, bool) and n > b["nilai"]:
            lampau.append(b["teks"])
    return lampau


# ---------------------------------------------------------------- berkas R2
SUMBER = [{"nama": "Juklak BNPB 4/2025 Lampiran I (kode kegiatan, klasifikasi risiko lingkungan dan sosial)", "url": "repo:data/hukum/teks/juklak-nomor-4-tahun-2025.txt.gz", "diambil": "2026-11-10", "lisensi": "peraturan BNPB, dokumen publik"},
          {"nama": "Juklak BNPB 2/2026 Lampiran II (komponen biaya)", "url": "repo:scripts/bnpb/unit/standar_biaya_2026.json", "diambil": "2026-11-26", "lisensi": "peraturan BNPB, dokumen publik"}]


def bangun(katalog, standar):
    jumlah = lambda k, p: len((standar.get(k["kode"]) or {}).get(p, [])) if standar.get(k["kode"]) else None  # noqa: E731
    baris = [{"kode": k["kode"], "nama": k["nama"], "klasifikasi": k["klasifikasi"] + (" (rentang tertulis)" if k["rentang"] else ""),
              "kl": jumlah(k, "kl"), "provinsi": jumlah(k, "provinsi"), "kabkota": jumlah(k, "kabkota")} for k in katalog]
    ada = sum(1 for k in katalog if standar.get(k["kode"]))
    kt = rapor.kartu(
        id="mt1-katalog", sistem="MT-1", pil="Dana Bersama prabencana", ikon="timbang", judul="Katalog kegiatan mitigasi",
        angka=[{"k": "kegiatan", "label": "Kegiatan mitigasi berkode 02.01.xx", "nilai": len(katalog)}, {"k": "berstandar", "label": "Kegiatan dengan komponen biaya terbaca", "nilai": ada}],
        kolom=[{"k": "kode", "label": "Kode"}, {"k": "nama", "label": "Kegiatan"},
               {"k": "klasifikasi", "label": "Risiko lingkungan dan sosial", "title": "klasifikasi sistem pengelolaan lingkungan dan sosial (ESMS) persis seperti Lampiran I Juklak 4/2025; kelas pasti ditentukan telaah"},
               {"k": "kl", "label": "Komponen kementerian/lembaga", "angka": True, "title": "jumlah baris komponen biaya Lampiran II Juklak 2/2026; kosong = standar belum terbaca"},
               {"k": "provinsi", "label": "Komponen provinsi", "angka": True}, {"k": "kabkota", "label": "Komponen kab/kota", "angka": True}],
        baris=baris, rumus=None, sumber=["Juklak BNPB 4/2025 Lampiran I", "Juklak BNPB 2/2026 Lampiran II"], label=["resmi"])
    b = rapor.berkas([kt], SUMBER)
    b["data"] = {"katalog": katalog, "standar": standar, "pemohon": NAMA_PEMOHON,
                 "catatan": "Juklak 2/2026 tidak memuat harga satuan; harga mengikuti SBK Kemenkeu dan daerah. Alat bantu, bukan kanal pengajuan."}
    return b


def jalan():
    return {"dana_bersama_katalog": bangun(muat_katalog(), muat_standar())}


def _tolak(f, *a):
    try:
        f(*a)
    except ValueError:
        return
    raise AssertionError(f"masukan salah tidak ditolak: {a!r}")


def cek():
    k = muat_katalog()
    assert [x["kode"] for x in k][0] == "02.01.01" and k[-1]["kode"] == "02.01.11" and len(k) == 11
    kl = {x["kode"]: x["klasifikasi"] for x in k}
    assert kl["02.01.01"] == "rendah" and kl["02.01.05"] == "rendah - menengah" and kl["02.01.07"] == "rendah ke tinggi" and kl["02.01.10"] == "substansial ke tinggi", kl
    _tolak(periksa_katalog, k[:10])
    _tolak(periksa_katalog, [{**x, "klasifikasi": ""} if i == 3 else x for i, x in enumerate(k)])
    # satu usulan satu kode dan satu keluaran (Juklak 4/2025 Bab III C)
    assert periksa_usulan("02.01.09", ["Normalisasi sungai"]) == []
    assert len(periksa_usulan("02.01.09", ["Normalisasi sungai", "Rambu"])) == 1 and len(periksa_usulan(["02.01.09", "02.01.10"], ["x"])) == 1
    assert len(periksa_usulan("02.02.01", ["x"])) == 1 and len(periksa_usulan("02.01.01", [])) == 1 and len(periksa_usulan("02.01.01", ["  "])) == 1
    # batas tertulis: peran dari satuan; satuan tak jelas tidak dipakai menandai
    b = batas_dari("Maksimal 7 (tujuh) orang (42 OB). Untuk KRB tematik maksimal 3 (tiga) orang (18 OB)")
    assert b[0] == {"nilai": 7, "teks": "Maksimal 7 (tujuh) orang (42 OB)", "peran": "kuantitas"}, b
    assert batas_dari("Maksimal 6 (enam) kali Diskusi Teknis")[0]["peran"] == "volume" and batas_dari("Maksimal 5 (lima) eksemplar penggandaan")[0]["nilai"] == 5
    assert batas_dari("Maksimal 2 (dua) paket")[0]["peran"] is None and batas_dari("") == [] and batas_dari(None) == []
    kom = {"batas": batas_dari("Maksimal 7 (tujuh) bulan")}
    assert tandai(kom, 100, 8) == ["Maksimal 7 (tujuh) bulan"] and tandai(kom, 100, 7) == [] and tandai(kom, 100, None) == [], "kosong tidak dihitung 0"
    assert tandai({"batas": batas_dari("Maksimal 2 (dua) paket")}, 99, 99) == [], "satuan tak jelas tidak menandai"
    # penguraian kolom dari kata ber-koordinat (dunia tiruan, tanpa PDF): satu kegiatan, kab/kota, dua baris, uraian bergabung, lanjutan lintas halaman
    W = lambda x, y, t: (x, y, t)  # noqa: E731
    h1 = [W(70, 100, "KEGIATAN"), W(130, 100, ":"), W(140, 100, "SOSIALISASI"), W(210, 100, "KEBENCANAAN"), W(300, 100, "KEPADA"), W(350, 100, "APARATUR"), W(420, 100, "DAN/ATAU"), W(480, 100, "MASYARAKAT"),
          W(70, 120, "PEMOHON:"), W(130, 120, "PEMERINTAH"), W(200, 120, "DAERAH"), W(250, 120, "KABUPATEN/KOTA"),
          W(76, 140, "Definisi"), W(150, 140, "Segala"), W(76, 150, "Operasional"), W(150, 150, "bentuk"),
          W(106, 170, "Uraian"), W(215, 170, "Variabel"), W(332, 170, "Kuantitas"), W(458, 170, "Volume"), W(577, 170, "Besaran"), W(698, 170, "Catatan"), W(810, 170, "Sifat"),
          W(76, 190, "Tim"), W(184, 190, "Honor"), W(304, 190, "Jumlah"), W(424, 190, "Bulan"), W(664, 190, "Maksimal"), W(700, 190, "7"), W(710, 190, "(tujuh)"), W(740, 190, "bulan"), W(806, 190, "Opsional"),
          W(76, 200, "Teknis"), W(184, 200, "tim"),
          W(184, 220, "Perlengkapan"), W(304, 220, "Sesuai"), W(806, 220, "Pokok")]
    h2 = [W(447, 40, "-"), W(184, 80, "survei"), W(76, 80, "dan"), W(664, 80, "(42"), W(700, 80, "OB)"), W(184, 100, "Cetak"), W(424, 100, "Eksemplar"), W(806, 100, "Opsional")]
    kat = [{"kode": "02.01.01", "nama": "Sosialisasi kebencanaan kepada aparatur dan/atau masyarakat"}]
    d = urai_standar([(112, h1), (113, h2)], kat)
    kb = d["02.01.01"]["kabkota"]
    assert [x["variabel"] for x in kb] == ["Honor tim", "Perlengkapan survei", "Cetak"], kb
    assert kb[0]["uraian"] == "Tim Teknis dan" and kb[1]["uraian"] == "Tim Teknis dan", "uraian sel gabung dipakai baris berikutnya; lanjutan di halaman berikut menempel ke uraian"
    assert kb[0]["sifat"] == "Opsional" and kb[1]["sifat"] == "Pokok" and kb[2]["halaman"] == 113 and kb[0]["halaman"] == 112
    assert kb[0]["batas"] == [{"nilai": 7, "teks": "Maksimal 7 (tujuh) bulan", "peran": "volume"}], kb[0]["batas"]
    assert "Segala" not in json.dumps(d), "blok definisi operasional bukan komponen"
    assert "kl" not in d["02.01.01"] and urai_standar([(1, [W(70, 100, "KEGIATAN"), W(130, 100, ":"), W(140, 100, "KEGIATAN"), W(200, 100, "LAIN")])], kat) == {}
    # berkas nyata di repo: standar terbaca, katalog 11 kode, kartu lolos skema rapor, tanpa kata terlarang
    st = muat_standar()
    assert set(st) == {x["kode"] for x in k} and all(st[x["kode"]].get("kabkota") for x in k), "tiap kegiatan punya komponen kab/kota"
    assert sum(1 for ps in st.values() for bs in ps.values() for c in bs for x in c["batas"] if x["peran"]) > 0
    ber = {"dibuat": "2026-11-26T00:00:00Z", "basi_jam": 1080, **bangun(k, st)}
    rapor.periksa_berkas(ber)
    s = json.dumps(ber, ensure_ascii=False)
    assert "·" not in s and not re.search(r"\baman\b", s, re.I)
    print(f"mt1.py --cek: lulus ({len(k)} kegiatan, {sum(len(bs) for ps in st.values() for bs in ps.values())} baris komponen, {sum(1 for ps in st.values() for bs in ps.values() for c in bs for x in c['batas'] if x['peran'])} batas berperan)")


if __name__ == "__main__":
    if "--cek" in sys.argv:
        cek()
    elif len(sys.argv) == 3 and sys.argv[1] == "ekstrak":
        d = ekstrak(sys.argv[2])
        print({k: {p: len(b) for p, b in ps.items()} for k, ps in sorted(d.items())})
    else:
        print(__doc__)
