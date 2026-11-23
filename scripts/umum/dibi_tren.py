"""Tren kejadian dan dampak bencana sejak 2008 (DIBI BNPB, Superset publik) -> public/data/dibi_tren.json

Bahan tab Tren, Sebaran, dan Tabel di /bnpb/data-bencana. Meniru dasbor DIBI (dibi.bnpb.go.id dashboard 2) dengan
saringan yang sama: HANYA is_bencana = TRUE (ambang Juklak BNPB 7/2023). Angka 2024 cocok dengan infografis
"Bencana Indonesia 2024" BNPB (banjir 1.420, karhutla 973, cuaca ekstrem 733, longsor 207).

Dua tabel padat (baris = larik angka, nol diisi 0):
  tahun_kab : [tahun, i_kategori, i_kab, <ANGKA...>]   per tahun x kategori x kab/kota
  bulan_prov: [yyyymm, i_kategori, prov, <ANGKA_BULAN...>]   per bulan x kategori x provinsi
Kab/kota dicocokkan ke public/data/bnpb/wilayah.json lewat kode BPS, lalu lewat nama (DIBI memakai kode Papua lama).
estimasi kerugian rumah = rumus DIBI dalam juta rupiah: 60 x rusak berat + 30 x sedang + 15 x ringan + 1 x terendam.

Pakai:  python3 scripts/umum/dibi_tren.py   |   python3 scripts/umum/dibi_tren.py uji
"""
import datetime as dt, glob, importlib.util, json, os, re, sys

AKAR = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "../.."))
KELUAR = os.path.join(AKAR, "public/data/dibi_tren.json")
WILAYAH = os.path.join(AKAR, "public/data/bnpb/wilayah.json")

# kunci keluaran -> ekspresi SQL DIBI
ANGKA = [("kejadian", "SUM(jumlah_kejadian)"), ("meninggal", "SUM(meninggal)"), ("hilang", "SUM(hilang)"), ("luka", "SUM(luka_sakit)"),
         ("terdampak", "SUM(menderita_mengungsi)"), ("rr_berat", "SUM(rumah_rusak_berat)"), ("rr_sedang", "SUM(rumah_rusak_sedang)"),
         ("rr_ringan", "SUM(rumah_rusak_ringan)"), ("terendam", "SUM(rumah_terendam)"), ("rugi_rumah", "SUM(estimasi_kerugian_rumah)"),
         ("f_pendidikan", "SUM(pendidikan_rusak)"), ("f_ibadah", "SUM(rumah_ibadat_rusak)"), ("f_kesehatan", "SUM(fasyankes_rusak)"),
         ("f_kantor", "SUM(kantor_rusak)"), ("jembatan", "SUM(jembatan_rusak)"), ("lahan_ha", "SUM(lahan_hektar)")]
ANGKA_BULAN = [("kejadian", "SUM(jumlah_kejadian)"), ("mdh", "SUM(meninggal) + SUM(hilang)"), ("luka", "SUM(luka_sakit)"),
               ("terdampak", "SUM(menderita_mengungsi)"), ("rumah", "SUM(rumah_rusak_berat) + SUM(rumah_rusak_sedang) + SUM(rumah_rusak_ringan)"),
               ("rugi_rumah", "SUM(estimasi_kerugian_rumah)")]
SARING = [{"col": "is_bencana", "op": "==", "val": True}]
# jumlah_kejadian DIBI pecahan bila satu kejadian dibagi ke beberapa kab (gempa 2024 di 18 kab Jawa Barat = 1/18 per kab):
# dibulatkan per baris, 6 dari 15 gempa 2024 hilang. Simpan 3 desimal; layar membulatkan jumlahnya.
DESIMAL = {"kejadian": 3, "lahan_ha": 1}
PROV_NAMA = {"aceh": "11", "sumaterautara": "12", "sumaterabarat": "13", "riau": "14", "jambi": "15", "sumateraselatan": "16", "bengkulu": "17",
             "lampung": "18", "kepulauanbangkabelitung": "19", "bangkabelitung": "19", "kepulauanriau": "21", "dkijakarta": "31", "jawabarat": "32",
             "jawatengah": "33", "diyogyakarta": "34", "daerahistimewayogyakarta": "34", "jawatimur": "35", "banten": "36", "bali": "51",
             "nusatenggarabarat": "52", "nusatenggaratimur": "53", "kalimantanbarat": "61", "kalimantantengah": "62", "kalimantanselatan": "63",
             "kalimantantimur": "64", "kalimantanutara": "65", "sulawesiutara": "71", "sulawesitengah": "72", "sulawesiselatan": "73",
             "sulawesitenggara": "74", "gorontalo": "75", "sulawesibarat": "76", "maluku": "81", "malukuutara": "82", "papua": "91",
             "papuabarat": "92", "papuaselatan": "93", "papuatengah": "94", "papuapegunungan": "95", "papuabaratdaya": "96"}


def _muat(nama, rel):
    s = importlib.util.spec_from_file_location(nama, os.path.join(AKAR, rel))
    m = importlib.util.module_from_spec(s)
    s.loader.exec_module(m)
    return m


def angka(v, desimal=0):
    try:
        x = round(float(v), desimal)
    except (TypeError, ValueError):
        return 0
    return int(x) if desimal == 0 or x == int(x) else x


def norm(s):
    """Nama wilayah -> kunci banding (sama dengan norm() di public/bnpb/data_bencana.js)."""
    n = re.sub(r"kep\.", "kepulauan ", str(s or "").lower())
    n = re.sub(r"administrasi|adm\.|kab\.|kabupaten", "", n)
    n = re.sub(r"\bdan\b", "", n)
    n = re.sub(r"[^a-z]", "", n)
    return {"kotapadangsidempuan": "kotapadangsidimpuan"}.get(n, n)


class Kab:
    """Pencocok kab/kota DIBI -> indeks di daftar `kab` keluaran ([kode, prov, nama])."""

    def __init__(self, wilayah):
        self.daftar = [[x["kode"], x["prov"], x["nama"]] for x in wilayah]
        self.kode = {x[0]: i for i, x in enumerate(self.daftar)}
        self.nama = {}
        for i, x in enumerate(self.daftar):
            self.nama.setdefault(norm(x[2]), []).append(i)

    def cari(self, id_bps, nama, prov_nama):
        k = str(angka(id_bps)) if id_bps else ""
        if k in self.kode:
            return self.kode[k]
        cal = self.nama.get(norm(nama), [])
        prov = (k[:2] if k else "") or PROV_NAMA.get(norm(prov_nama), "")
        if len(cal) > 1:
            cal = [i for i in cal if self.daftar[i][1] == prov] or cal[:1]
        if cal:
            return cal[0]
        if not nama:   # kejadian tanpa kab/kota (gempa laut, satu provinsi): tetap dihitung di baris "Tanpa kab/kota" provinsinya
            if not prov:
                return None
            nama, k = "Tanpa kab/kota", ""
            kunci = "_tanpa_" + prov
            if kunci in self.nama:
                return self.nama[kunci][0]
            self.daftar.append(["", prov, nama])
            self.nama[kunci] = [len(self.daftar) - 1]
            return len(self.daftar) - 1
        self.daftar.append([k or "", prov, str(nama).strip()])   # tak dikenal: tetap dihitung, tanpa batas peta
        i = len(self.daftar) - 1
        self.nama[norm(nama)] = [i]
        if k:
            self.kode[k] = i
        return i


def susun_tahun(baris, kab, kat):
    out = {}
    for r in baris:
        if r.get("tahun") is None:
            continue
        i = kab.cari(r.get("id_kab_bps"), r.get("kabupaten"), r.get("provinsi"))
        if i is None:
            continue
        kunci = (int(r["tahun"]), kat.setdefault(str(r.get("kategori_bencana") or "Lainnya").strip(), len(kat)), i)
        lama = out.get(kunci, [0] * len(ANGKA))
        out[kunci] = [a + angka(r.get(n), DESIMAL.get(n, 0)) for a, (n, _) in zip(lama, ANGKA)]
    return [[*k, *(round(x, 3) if isinstance(x, float) else x for x in v)] for k, v in sorted(out.items()) if any(v)]


def susun_bulan(baris, kat):
    out = {}
    for r in baris:
        if r.get("tahun") is None or r.get("bulan") is None:
            continue
        prov = PROV_NAMA.get(norm(r.get("provinsi")), "")
        kunci = (int(r["tahun"]) * 100 + int(r["bulan"]), kat.setdefault(str(r.get("kategori_bencana") or "Lainnya").strip(), len(kat)), prov)
        lama = out.get(kunci, [0] * len(ANGKA_BULAN))
        out[kunci] = [a + angka(r.get(n), DESIMAL.get(n, 0)) for a, (n, _) in zip(lama, ANGKA_BULAN)]
    return [[*k, *v] for k, v in sorted(out.items()) if any(v)]


def penduduk_kab(kab):
    """Larik sejajar kab.daftar: penduduk kab/kota (IRBI BNPB, lewat profil daerah kemitraan) atau None. Cocok lewat (prov, nama):
    kode IRBI berbeda dari kode BPS, jadi kode tidak dipakai."""
    peta = {}
    for f in sorted(glob.glob(os.path.join(AKAR, "public/data/kemitraan/daerah/*.json"))):
        d = json.load(open(f, encoding="utf-8"))
        t = (d.get("penduduk") or {}).get("total")
        if t:
            peta[(str(d.get("prov") or os.path.basename(f)[:2]), norm(d.get("nama")))] = int(t)
    return [peta.get((str(x[1]), norm(x[2]))) for x in kab.daftar]


def susun_musim(baris, kab, kat):
    """[i_kab, i_kategori, m1..m12]: jumlah kejadian per bulan kalender; hanya baris berjumlah > 0."""
    out = {}
    for r in baris:
        b = angka(r.get("bulan"))
        if not 1 <= b <= 12:
            continue
        i = kab.cari(r.get("id_kab_bps"), r.get("kabupaten"), r.get("provinsi"))
        if i is None:
            continue
        v = out.setdefault((i, kat.setdefault(str(r.get("kategori_bencana") or "Lainnya").strip(), len(kat))), [0] * 12)
        v[b - 1] += angka(r.get("kejadian"), 3)
    return [[*k, *(round(x, 3) for x in v)] for k, v in sorted(out.items()) if sum(v)]


def jalan():
    K = _muat("banjir_kejadian", "scripts/banjir/kejadian.py")
    simpan = _muat("umum_kejadian", "scripts/umum/kejadian.py").simpan
    kab = Kab(json.load(open(WILAYAH, encoding="utf-8"))["kab"])
    tanya = lambda kol, daftar: K.superset(kol, daftar, SARING, 50000)
    a = tanya(["tahun", "kategori_bencana", "id_kab_bps", "provinsi", "kabupaten"], ANGKA)
    b = tanya(["tahun", "bulan", "kategori_bencana", "provinsi"], ANGKA_BULAN)
    if len(a) >= 50000 or len(b) >= 50000:
        raise RuntimeError("DIBI: batas 50.000 baris tercapai, data terpotong")
    kat = {}
    th, bl = susun_tahun(a, kab, kat), susun_bulan(b, kat)
    tahun_ini = dt.date.today().year
    final = list(range(2008, tahun_ini))                       # tahun sementara dikecualikan
    sar = SARING + [{"col": "tahun", "op": "IN", "val": final}]
    m = K.superset(["bulan", "kategori_bencana", "id_kab_bps", "provinsi", "kabupaten"], [("kejadian", "SUM(jumlah_kejadian)")], sar, 50000)
    if len(m) >= 50000:                                        # terpotong: pecah per kategori
        m = []
        for k in list(kat):
            m += K.superset(["bulan", "kategori_bencana", "id_kab_bps", "provinsi", "kabupaten"], [("kejadian", "SUM(jumlah_kejadian)")],
                            sar + [{"col": "kategori_bencana", "op": "==", "val": k}], 50000)
    mk = susun_musim(m, kab, kat)
    if not th or min(x[0] for x in th) > 2010:
        raise RuntimeError(f"DIBI tren: data tidak wajar ({len(th)} baris)")
    simpan(KELUAR, {
        "sumber": "DIBI BNPB (dibi.bnpb.go.id, Superset dasbor publik, is_bencana = TRUE)",
        "catatan": "Hanya kejadian yang memenuhi ambang bencana Juklak BNPB 7/2023 (kolom is_bencana DIBI). "
                   f"Data {tahun_ini} masih sementara; DIBI menetapkan data final sekitar Februari tahun berikutnya. "
                   "terdampak = menderita dan mengungsi; rugi_rumah = estimasi kerugian rumah DIBI dalam juta rupiah "
                   "(60 x rusak berat + 30 x sedang + 15 x ringan + 1 x terendam); lahan_ha = lahan rusak dalam hektar. "
                   "Data sebelum 2008 tidak dimuat (sumber kompilasi, akurasi lebih rendah).",
        "sementara": tahun_ini, "kategori": list(kat), "kab": kab.daftar,
        "kolom_tahun": ["tahun", "kategori", "kab"] + [n for n, _ in ANGKA], "tahun_kab": th,
        "kolom_bulan": ["bulan", "kategori", "prov"] + [n for n, _ in ANGKA_BULAN], "bulan_prov": bl,
        "penduduk": penduduk_kab(kab), "penduduk_tahun": None,   # tahun data penduduk IRBI tidak tercatat di sumber; jangan ditebak (pemilik 23 Nov 2026)
        "penduduk_sumber": "IRBI BNPB (paparan penduduk per kab/kota, snapshot 2026-10-28) lewat profil daerah kemitraan; cocok per provinsi dan nama, null = tidak cocok. Tahun data penduduk tidak tercatat di sumber",
        "kolom_musim": ["kab", "kategori"] + [f"m{i}" for i in range(1, 13)], "musim_tahun": [2008, final[-1]], "musim_kab": mk})
    print(f"dibi_tren: {len(th)} baris tahun x kab, {len(bl)} baris bulan x prov, {len(mk)} baris musim, penduduk null {sum(x is None for x in penduduk_kab(kab))}/{len(kab.daftar)}, kategori {list(kat)}")


def uji():
    kab = Kab([{"kode": "3402", "prov": "34", "nama": "Bantul"}, {"kode": "9104", "prov": "94", "nama": "Nabire"},
               {"kode": "3171", "prov": "31", "nama": "Kota Administrasi Jakarta Barat"}])
    assert kab.cari(3402.0, "Bantul", "DI Yogyakarta") == 0
    assert kab.cari(9199, "Nabire", "Papua") == 1                      # kode Papua lama -> nama
    assert kab.cari(None, "Kota Adm. Jakarta Barat", "DKI Jakarta") == 2
    i = kab.cari(None, "Antah Berantah", "Jawa Barat")
    assert kab.daftar[i] == ["", "32", "Antah Berantah"] and kab.cari(None, "Antah Berantah", "x") == i
    j = kab.cari(None, None, "Bali")
    assert kab.daftar[j] == ["", "51", "Tanpa kab/kota"] and kab.cari(None, "", "Bali") == j and kab.cari(None, None, "Antah") is None
    kat = {}
    r = {"tahun": 2024, "kategori_bencana": "Banjir ", "id_kab_bps": 3402, "provinsi": "DI Yogyakarta", "kabupaten": "Bantul",
         "kejadian": 2.0, "meninggal": 1, "lahan_ha": 1.26, "rugi_rumah": 60}
    th = susun_tahun([r, dict(r, kejadian=1), dict(r, tahun=None)], kab, kat)
    n = {k: j for j, (k, _) in enumerate(ANGKA)}
    assert kat == {"Banjir": 0} and len(th) == 1 and th[0][:3] == [2024, 0, 0]
    assert th[0][3 + n["kejadian"]] == 3 and th[0][3 + n["meninggal"]] == 2 and th[0][3 + n["lahan_ha"]] == 2.6, th
    bl = susun_bulan([{"tahun": 2025, "bulan": 3, "kategori_bencana": "Longsor", "provinsi": "Jawa Barat", "kejadian": 4, "mdh": 1},
                      {"tahun": 2025, "bulan": 3, "kategori_bencana": "Longsor", "provinsi": "Jawa Barat", "kejadian": 0}], kat)
    assert bl == [[202503, 1, "32", 4, 1, 0, 0, 0, 0]], bl
    ms = susun_musim([{"bulan": 3, "kategori_bencana": "Banjir", "id_kab_bps": 3402, "kabupaten": "Bantul", "kejadian": 2},
                      {"bulan": 3, "kategori_bencana": "Banjir", "id_kab_bps": 3402, "kabupaten": "Bantul", "kejadian": 1},
                      {"bulan": 13, "kategori_bencana": "Banjir", "id_kab_bps": 3402, "kejadian": 9},
                      {"bulan": 5, "kategori_bencana": "Longsor", "id_kab_bps": 3402, "kejadian": 0}], kab, kat)
    assert ms == [[0, 0, 0, 0, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0]], ms
    pk = penduduk_kab(Kab([{"kode": "x", "prov": "11", "nama": "Aceh Selatan"}, {"kode": "y", "prov": "11", "nama": "Tak Ada"}]))
    assert len(pk) == 2 and pk[0] > 0 and pk[1] is None, pk
    assert norm("Kab. Kep. Seribu") == norm("Kepulauan Seribu") and PROV_NAMA[norm("DI Yogyakarta")] == "34"
    assert SARING[0] == {"col": "is_bencana", "op": "==", "val": True}
    print("uji dibi_tren: ok")


if __name__ == "__main__":
    uji() if sys.argv[1:] == ["uji"] else jalan()
