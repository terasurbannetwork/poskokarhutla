"""Laporan Berkala BNPB: fungsi murni hitung angka (data/kajian-bnpb/laporan-berkala/ALGORITMA.md bagian 1 sampai 9).

Stdlib saja. Tidak membaca jaringan; rakit.py (LB-03) yang membaca berkas produksi dan R2, lalu memanggil `berkas_angka()`.
Pembulatan hanya di sini, setengah ke atas (decimal.ROUND_HALF_UP). Kosong tidak pernah jadi 0: sumber atau periode
yang tidak tercakup bernilai None dan berstatus `belum_ada` / `sebagian`.

  python3 -I scripts/berkala/hitung.py uji                 # uji murni H1-H18, H21 (tanpa jaringan)
  python3 -I scripts/berkala/hitung.py cetak <masukan.json | harian | mingguan | bulanan>  # berkas angka ke stdout (uji kontrak)
  python3 -I scripts/berkala/hitung.py fixture             # tulis ulang tests/berkala/fixtures/angka_{harian,mingguan,bulanan}.json

Bentuk masukan `berkas_angka(periode, kode, m, hari_ini)`, m = dict:
  dibi:       {"tarik", "dari", "sampai", "kejadian": [baris dibi_kejadian.json]}            (wajib)
  dibi_lalu:  {"tarik", "asal", "dari", "sampai", "kejadian": [...]}                       (opsional, Q3)
  karhutla:   {"tarik", "asal", "hari": {"YYYY-MM-DD": {prov_kode: {hot, luas, belum, padam, nama?}}}}
  surut:      {"tarik", "asal", "hari": {"YYYY-MM-DD": {kab_kode: {"surut": bool, "kondisi": str}}}}
  gunungapi:  {"tanggal", "level": {nama: 1..4}}
  gempa:      {"tarik", "peristiwa": [{"id", "tanggal", "prov_kode", "mag"?}]}
  erupsi:     {"tarik", "peristiwa": [{"id", "gunung", "tanggal", "prov_kode"}]}
  riwayat:    isi public/data/logbook_riwayat.json (opsional; Bab 7.1 peluang, ALGORITMA 8)
  iklim:      isi public/data/iklim_outlook.json (opsional; Bab 4.4 hujan dan indeks ENSO Bab 7.1, ALGORITMA 6 dan 8)
  peluang:    {"kab_tinggi": n}, enso: {"nilai", "golongan", "musim"}  (opsional; menimpa turunan riwayat/iklim untuk T6, T7)
  perubahan_level: [{"gunung", "tanggal", "dari", "ke"}]  (opsional; harian dan mingguan, ALGORITMA 12 geologi)
  prediksi:   isi public/prediksi/data/prediksi.json (opsional; harian, prakiraan besok tenggang +1, dibaca apa adanya)
  tangga:     isi public/prediksi/data/tangga.json (opsional; mingguan, prakiraan sepekan; tanpa berkas = belum_tersedia)
"""
import datetime as dt
import importlib.util
import json
import os
import re
import sys
from decimal import ROUND_HALF_UP, Decimal

AKAR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
FIX = os.path.join(AKAR, "tests/berkala/fixtures")
PERIODE = ("harian", "mingguan", "bulanan", "tahunan")
def _muat(nama, rel):
    sp = importlib.util.spec_from_file_location(nama, os.path.join(AKAR, rel))
    md = importlib.util.module_from_spec(sp)
    sp.loader.exec_module(md)
    return md


try:   # nama provinsi untuk kode tanpa baris DIBI (mis. provinsi hotspot tanpa laporan karhutla)
    PROVINSI = _muat("wilayah", "scripts/data/wilayah.py").PROVINSI
except Exception:
    PROVINSI = {}
BULAN = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"]


# ------------------------------------------------------------------ periode (D11, H15, H16)
class KodeSalah(ValueError):
    pass


def rentang(periode, kode):
    """(awal, akhir) sebagai date; KodeSalah bila periode atau kode tidak sah (tanggal tak ada, minggu ISO tak ada di tahun itu)."""
    k = str(kode)
    try:
        if periode == "harian" and re.fullmatch(r"\d{4}-\d{2}-\d{2}", k):
            d = dt.date.fromisoformat(k)
            return d, d
        if periode == "mingguan" and (m := re.fullmatch(r"(\d{4})-W(\d{2})", k)):
            a = dt.date.fromisocalendar(int(m[1]), int(m[2]), 1)
            return a, a + dt.timedelta(days=6)
        if periode == "bulanan" and (m := re.fullmatch(r"(\d{4})-(\d{2})", k)):
            a = dt.date(int(m[1]), int(m[2]), 1)
            return a, _geser_bulan(a, 1) - dt.timedelta(days=1)
        if periode == "tahunan" and re.fullmatch(r"\d{4}", k):
            return dt.date(int(k), 1, 1), dt.date(int(k), 12, 31)
    except ValueError:
        pass
    raise KodeSalah(f"kode {periode} tidak sah: {kode!r}")


def kode_sah(periode, kode):
    try:
        rentang(periode, kode)
        return True
    except KodeSalah:
        return False


def periksa_selesai(periode, kode, hari_ini):
    """Periode berjalan atau masa depan ditolak (H13): akhir rentang harus sebelum hari_ini."""
    _, akhir = rentang(periode, kode)
    if akhir >= hari_ini:
        raise KodeSalah(f"periode {periode} {kode} belum selesai (berakhir {akhir}, hari ini {hari_ini})")


def _geser_bulan(d, n):
    i = d.year * 12 + d.month - 1 + n
    return dt.date(i // 12, i % 12 + 1, 1)


def geser(periode, kode, n):
    """kode periode ke-n sesudah (n negatif = sebelum)."""
    a, _ = rentang(periode, kode)
    if periode == "harian":
        return (a + dt.timedelta(days=n)).isoformat()
    if periode == "mingguan":   # Senin + n minggu, lalu kode ISO (lintas tahun aman: 2026-W01 - 1 = 2025-W52)
        y, w, _ = (a + dt.timedelta(weeks=n)).isocalendar()
        return f"{y}-W{w:02d}"
    if periode == "bulanan":
        return _geser_bulan(a, n).isoformat()[:7]
    return str(a.year + n)


def tahun_lalu(periode, kode):
    if periode in ("bulanan", "tahunan"):
        return geser(periode, kode, -12 if periode == "bulanan" else -1)
    if periode == "harian":
        a, _ = rentang(periode, kode)
        return (a.replace(year=a.year - 1, day=28) if (a.month, a.day) == (2, 29) else a.replace(year=a.year - 1)).isoformat()
    y, w = int(kode[:4]) - 1, int(kode[6:])
    return f"{y}-W{min(w, dt.date(y, 12, 28).isocalendar()[1]):02d}"


def tgl(s):
    """'2026-10-06' -> '6 Oktober 2026'."""
    d = dt.date.fromisoformat(s)
    return f"{d.day} {BULAN[d.month - 1]} {d.year}"


def nama_periode(periode, kode):
    a, _ = rentang(periode, kode)
    return {"harian": f"{a.day} {BULAN[a.month - 1]} {a.year}", "mingguan": f"minggu {kode[6:]} {kode[:4]}",
            "bulanan": f"{BULAN[a.month - 1]} {a.year}", "tahunan": str(a.year)}[periode]


# ------------------------------------------------------------------ angka (bagian 3)
def bulat(x, n=1):
    """setengah ke atas, menjauhi nol; masukan int/float/Decimal."""
    d = Decimal(str(x)) if not isinstance(x, Decimal) else x
    q = Decimal(1).scaleb(-n)
    r = abs(d).quantize(q, rounding=ROUND_HALF_UP)
    r = -r if d < 0 else r
    return int(r) if n == 0 else float(r)


def persen(a, b):
    return None if a is None or not b else bulat(Decimal(a) * 100 / Decimal(b))


def banding(kini, lalu):
    """bagian 3: arah naik/turun/baru/tetap 0/tetap, persen satu desimal; None bila salah satu tidak ada (bukan 0)."""
    if kini is None or lalu is None:
        return {"kini": kini, "lalu": lalu, "arah": None, "persen": None}
    if lalu == 0:
        return {"kini": kini, "lalu": 0, "arah": "tetap 0" if kini == 0 else "baru", "persen": None}
    p = bulat(abs(Decimal(str(kini)) - Decimal(str(lalu))) * 100 / Decimal(str(lalu)))   # str: rerata 7 hari (H21) bisa pecahan
    return {"kini": kini, "lalu": lalu, "arah": "naik" if kini > lalu else "turun" if kini < lalu else "tetap", "persen": p}


def fmt(x):
    """format Indonesia untuk kalimat usulan: 183316 -> 183.316, 68.5 -> 68,5, 1.97 -> 1,97. Tidak membulatkan ulang:
    desimal yang tampil = desimal hasil bulat() (pembulatan hanya sekali, di bulat())."""
    d = Decimal(str(x))
    a, _, b = format(abs(d), "f").partition(".")
    b = b.rstrip("0")
    return ("-" if d < 0 else "") + f"{int(a):,}".replace(",", ".") + ("," + b if b else "")


# ------------------------------------------------------------------ DIBI (bagian 2)
JENIS = {  # jenis laporan -> nama mentah DIBI (ALGORITMA 2.2)
    "karhutla": ["Kebakaran Hutan dan Lahan", "Kebakaran Lahan", "Kebakaran Hutan", "Kebakaran Lahan Gambut"],
    "banjir": ["Banjir", "Banjir Bandang", "Banjir Genangan", "Banjir Rob", "Banjir Lahar (Lahar)", "Banjir dan Tanah Longsor"],
    "longsor": ["Tanah Longsor", "Gerakan Tanah"],
    "cuaca_ekstrem": ["Cuaca Ekstrem", "Angin Kencang", "Angin Topan", "Puting Beliung"],
    "kekeringan": ["Kekeringan", "Kekeringan Pertanian"],
    "gelombang": ["Gelombang Pasang / Abrasi", "Gelombang Pasang", "Abrasi Pantai"],
    "gempa": ["Gempabumi", "Gempabumi Reruntuhan", "Gempa Bumi dan Tsunami"],
    "erupsi": ["Erupsi Gunung Api"],
}
BUKAN_ALAM = {  # bagian sendiri (Bab 1.4, K5); tidak pernah dijumlah ke angka bencana alam (D5)
    "kebakaran_permukiman": "Kebakaran Gedung dan Permukiman", "konflik_sosial": "Konflik Sosial", "gagal_teknologi": "Gagal Teknologi",
    "kecelakaan_industri": "Kecelakaan Industri", "epidemi": "Epidemi dan Wabah Penyakit", "lainnya": "Lainnya",
}
LABEL = {"karhutla": "Kebakaran hutan dan lahan", "banjir": "Banjir", "longsor": "Tanah longsor", "cuaca_ekstrem": "Cuaca ekstrem",
         "kekeringan": "Kekeringan", "gelombang": "Gelombang pasang dan abrasi", "gempa": "Gempa bumi", "erupsi": "Erupsi gunung api",
         **{k: v[0] + v[1:].lower() for k, v in BUKAN_ALAM.items()}}
KELOMPOK = {"kering": ["karhutla", "kekeringan"], "basah": ["banjir", "longsor", "cuaca_ekstrem", "gelombang"], "geologi": ["gempa", "erupsi"]}
ALIAS = {"Tsunami": "gempa", "Epidemi": "epidemi", "Wabah Penyakit": "epidemi"}   # nama lama riwayat penuh DIBI (lapis Siklus 2011-2025)
PETA = {n: j for j, ns in JENIS.items() for n in ns} | {n: j for j, n in BUKAN_ALAM.items()} | ALIAS
GABUNG = "Banjir dan Tanah Longsor"
DAMPAK = ["meninggal", "hilang", "luka", "terdampak", "mengungsi", "rr_berat", "rr_sedang", "rr_ringan", "terendam",
          "f_pendidikan", "f_kantor", "jembatan", "f_umum"]
TURUNAN = {"meninggal_hilang": ("meninggal", "hilang"), "terdampak_mengungsi": ("terdampak", "mengungsi"),
           "rumah_rusak": ("rr_berat", "rr_sedang", "rr_ringan"), "fasum_rusak": ("f_pendidikan", "f_kantor", "f_umum")}


class JenisBaru(ValueError):
    pass


def jenis(r):
    try:
        return PETA[r["jenis"]]
    except KeyError:
        raise JenisBaru(f"jenis DIBI baru, tambahkan ke peta jenis: {r['jenis']}") from None


def periksa_jenis(baris):
    """H3c: semua nama mentah baru sekaligus, supaya rakit.py gagal dengan daftar lengkap."""
    baru = sorted({r["jenis"] for r in baris if r["jenis"] not in PETA})
    if baru:
        raise JenisBaru("jenis DIBI baru, tambahkan ke peta jenis: " + ", ".join(baru))


def bawah_ambang(r):
    """dibi_kejadian.json menandai baris di bawah ambang bencana DIBI dengan bencana = 0 (kunci tak ada = resmi). Q28 [BAWAAN
    SEMENTARA]: angka utama tampil DUA, berlabel: total termasuk di bawah ambang (praktik contoh Oktober 2026, 324) dan resmi DIBI
    tanpa baris itu (262). Baris dengan bencana = None (riwayat penuh lapis Siklus tidak membawa tanda) membuat angka resmi None."""
    return r.get("bencana", 1) == 0


def _kej(r):
    """kolom kejadian sebagai Decimal: riwayat penuh DIBI memecah satu kejadian lintas kab jadi pecahan (0,5 + 0,5)."""
    return Decimal(str(r.get("kejadian") or 0))


def jml(baris):
    return bulat(sum((_kej(r) for r in baris), Decimal(0)), 0)


def _nil(r, k):
    """kunci tak ada = 0 (aturan dibi_kejadian.json); kunci ada bernilai None = tidak diketahui (lapis Siklus), tetap None."""
    if k not in r:
        return 0
    return None if r[k] is None else int(r[k])


def _n0(x):
    return x or 0


def pilih(baris, awal, akhir):
    a, b = awal.isoformat(), akhir.isoformat()
    return [r for r in baris if a <= r["tanggal"] <= b]


DUP_MIN_KOLOM = 2   # Q20 [BAWAAN SEMENTARA]: kembar hanya bila paling sedikit 2 kolom dampak > 0 dan di provinsi yang sama


def bersih_dampak(baris):
    """bagian 2.4 (Q20): baris yang dampaknya identik (paling sedikit DUP_MIN_KOLOM kolom > 0) dengan baris kab lain di PROVINSI
    yang sama pada (tanggal, jenis laporan) sama: dampak dihitung sekali, kejadian tetap per kab. Kebetulan satu kolom (mis.
    meninggal 1) atau lintas provinsi tidak dianggap kembar. Mengembalikan (baris dengan '_d' = dampak terpakai, banyak baris kena)."""
    lihat, kena, out = {}, 0, []
    for r in sorted(baris, key=lambda r: (r["tanggal"], r["jenis"], str(r.get("kab_kode")))):
        d = tuple(_nil(r, k) for k in DAMPAK)
        r = dict(r, _j=jenis(r), _d=d)
        if sum(1 for x in d if x) >= DUP_MIN_KOLOM:
            kunci = (r["tanggal"], r["_j"], r.get("prov_kode"), d)
            kab = lihat.setdefault(kunci, r.get("kab_kode"))
            if kab != r.get("kab_kode"):
                r["_d"] = tuple(None if x is None else 0 for x in d)
                kena += 1
        out.append(r)
    return out, kena


def ringkas(baris):
    """jumlah kejadian (kolom 'kejadian', bukan banyak baris), provinsi, kab, dampak dan dampak turunan. Baris sudah lewat bersih_dampak."""
    d = [0] * len(DAMPAK)
    prov, kab = set(), set()
    for r in baris:
        if _kej(r) > 0:
            prov.add(r["prov_kode"])
            kab.add(r["kab_kode"])
        d = [None if a is None or b is None else a + b for a, b in zip(d, r["_d"])]   # satu baris tak diketahui = jumlah tak diketahui
    dampak = dict(zip(DAMPAK, d))
    dampak |= {t: None if any(dampak[x] is None for x in xs) else sum(dampak[x] for x in xs) for t, xs in TURUNAN.items()}
    return {"kejadian": jml(baris), "prov": len(prov), "kab": len(kab), "dampak": dampak}


def _per(baris, kunci):
    g = {}
    for r in baris:
        g.setdefault(kunci(r), []).append(r)
    return g


def agregat(baris):
    """bagian 2.3 sampai 2.6 untuk satu rentang. baris = hasil bersih_dampak dari baris resmi."""
    alam = [r for r in baris if r["_j"] in JENIS]
    nalam = [r for r in baris if r["_j"] in BUKAN_ALAM]
    pj = _per(alam, lambda r: r["_j"])
    jen = {j: ringkas(pj.get(j, [])) for j in JENIS}
    kel = {g: ringkas([r for j in js for r in pj.get(j, [])]) for g, js in KELOMPOK.items()}
    nama = {r["prov_kode"]: r["prov"] for r in baris}
    prov = []
    for p, rs in _per(alam, lambda r: r["prov_kode"]).items():
        x = ringkas(rs)
        prov.append({"kode": p, "nama": nama[p], "kejadian": x["kejadian"], "dampak": x["dampak"],
                     "kelompok": {g: jml(r for r in rs if r["_j"] in js) for g, js in KELOMPOK.items()},
                     "jenis": {j: n for j in JENIS if (n := jml(r for r in rs if r["_j"] == j))}})
    prov.sort(key=lambda x: (-x["kejadian"], x["kode"]))
    kab = []
    for (k, j), rs in _per(baris, lambda r: (r["kab_kode"], r["_j"])).items():
        x = ringkas(rs)
        kab.append({"kode": k, "nama": rs[0]["kab"], "prov_kode": rs[0]["prov_kode"], "prov": rs[0]["prov"], "jenis": j,
                    "kejadian": x["kejadian"], "dampak": x["dampak"]})
    kab.sort(key=lambda x: (x["jenis"], -_n0(x["dampak"]["meninggal_hilang"]), -_n0(x["dampak"]["terdampak_mengungsi"]), -x["kejadian"], str(x["kode"])))
    pn = _per(nalam, lambda r: r["_j"])
    # Q28: resmi DIBI (tanpa baris bencana = 0) dan banyak baris di bawah ambang per jenis; None bila tanda tidak diketahui
    tahu = not any(r.get("bencana", 1) is None for r in baris)
    res = [r for r in baris if not bawah_ambang(r)] if tahu else None
    bawah = [r for r in baris if bawah_ambang(r)] if tahu else None
    semua_j = list(JENIS) + list(BUKAN_ALAM)
    resmi = None if res is None else {"alam": ringkas([r for r in res if r["_j"] in JENIS]),
                                      "jenis": {j: jml(r for r in res if r["_j"] == j) for j in semua_j}}
    if resmi:
        resmi["prov"] = resmi["alam"]["prov"]
    dba = None if bawah is None else {"alam": jml(r for r in bawah if r["_j"] in JENIS), "bukan_alam": jml(r for r in bawah if r["_j"] in BUKAN_ALAM),
                                      "jenis": {j: jml(r for r in bawah if r["_j"] == j) for j in semua_j}}
    return {"alam": ringkas(alam), "kelompok": kel, "jenis": jen, "prov": prov, "kab": kab,
            "bukan_alam": {j: ringkas(pn.get(j, [])) for j in BUKAN_ALAM},
            "resmi": resmi, "di_bawah_ambang": dba,
            "gabung_banjir_longsor": jml(r for r in alam if r["jenis"] == GABUNG)}


def tercakup(sumber, awal, akhir):
    return bool(sumber) and sumber.get("dari", "0000") <= awal.isoformat() and akhir.isoformat() <= sumber.get("sampai", "9999")


def agregat_kode(sumber, periode, kode):
    """agregat satu periode, atau None bila rentang tidak tercakup penuh oleh sumber (kosong bukan 0)."""
    a, b = rentang(periode, kode)
    if not tercakup(sumber, a, b):
        return None
    return agregat(bersih_dampak(pilih(sumber["kejadian"], a, b))[0])


def kejadian_jenis(g):
    return None if g is None else {"alam": g["alam"]["kejadian"], "alam_resmi": g["resmi"]["alam"]["kejadian"] if g["resmi"] else None,
                                   **{j: g["jenis"][j]["kejadian"] for j in JENIS}, **{j: g["bukan_alam"][j]["kejadian"] for j in BUKAN_ALAM}}


LABEL_ANGKA = {   # Q28 [BAWAAN SEMENTARA]: dua angka kejadian, selalu berlabel
    "alam": "Semua laporan DIBI, termasuk di bawah ambang bencana (cara laporan Oktober 2026 kepada Presiden)",
    "resmi": "Resmi DIBI, tanpa laporan di bawah ambang bencana (Juklak BNPB 7/2023)",
}
CATATAN_METODE = [
    "Satu peristiwa gempa dicocokkan per provinsi; gempa yang dirasakan dan dilaporkan di beberapa provinsi terhitung lebih dari satu peristiwa.",
    "Dampak baris kembar dihitung sekali hanya bila paling sedikit dua kolom dampak sama dan lebih dari 0 di provinsi yang sama (Q20).",
    "Dampak yang tidak tercatat di sumber ditulis tidak diketahui, bukan 0.",
]
RIWAYAT = {"harian": 14, "mingguan": 8, "bulanan": 11, "tahunan": 12}


def bab1(periode, kode, m):
    dibi = m["dibi"]
    a, b = rentang(periode, kode)
    if not tercakup(dibi, a, b):
        raise ValueError(f"DIBI ({dibi.get('dari')} sampai {dibi.get('sampai')}) tidak mencakup {kode}")
    periksa_jenis(dibi["kejadian"])
    resmi_b = pilih(dibi["kejadian"], a, b)
    baris, kena = bersih_dampak(resmi_b)
    g = agregat(baris)
    # riwayat (2.7): tahunan memakai 12 bulan di dalam tahun itu; lainnya n periode berakhir di kode
    if periode == "tahunan":
        kode_r = [f"{kode}-{i:02d}" for i in range(1, 13)]
        per_r = "bulanan"
    else:
        kode_r = [geser(periode, kode, -i) for i in range(RIWAYAT[periode] - 1, -1, -1)]
        per_r = periode
    riw = [{"kode": k, "kejadian": kejadian_jenis(agregat_kode(dibi, per_r, k))} for k in kode_r]
    seb_k = geser(periode, kode, -1)
    seb = agregat_kode(dibi, periode, seb_k)
    # tahun lalu (bagian 3, Q3): tarikan sekarang bila masih tercakup, kalau tidak lapis Siklus (dibi_lalu) dari rakit.py
    tl_k = tahun_lalu(periode, kode)
    tl, asal = agregat_kode(dibi, periode, tl_k), "dibi_kejadian"
    if tl is None and m.get("dibi_lalu"):
        tl, asal = agregat_kode(m["dibi_lalu"], periode, tl_k), m["dibi_lalu"].get("asal", "siklus_bersih")
    bandingan = None
    if tl is not None:
        bandingan = {"kejadian": banding(g["alam"]["kejadian"], tl["alam"]["kejadian"]),
                     "kejadian_resmi": banding(g["resmi"]["alam"]["kejadian"] if g["resmi"] else None, tl["resmi"]["alam"]["kejadian"] if tl["resmi"] else None),
                     **{t: banding(g["alam"]["dampak"][t], tl["alam"]["dampak"][t]) for t in ("meninggal_hilang", "luka", "terdampak_mengungsi", "rumah_rusak")},
                     "jenis": {j: banding(g["jenis"][j]["kejadian"], tl["jenis"][j]["kejadian"]) for j in JENIS}}
    tambahan = {}
    if periode == "harian":
        tambahan["rerata_7"] = rerata_7(dibi, a, g)
        tambahan["menonjol"] = menonjol(g)
        tambahan["kab"] = g["kab"]   # PRD 2: tabel kejadian hari itu per kab dengan dampak; non-alam dan sosial ikut sebagai baris
        tambahan["rerata_7"]["banding"]["status"] = "sementara"   # Q26: DIBI hari itu masih bertambah saat dirakit pagi berikutnya
    kab_na = sorted([k for k in g["kab"] if k["jenis"] in BUKAN_ALAM], key=lambda k: (-k["kejadian"], -_n0(k["dampak"]["meninggal_hilang"]), str(k["kode"])))[:10]
    out = {
        "alam": g["alam"], "resmi": g["resmi"], "di_bawah_ambang": g["di_bawah_ambang"], "label_angka": LABEL_ANGKA, "kelompok": g["kelompok"], "jenis": g["jenis"], "prov": g["prov"], "prov_teratas": [p["kode"] for p in g["prov"][:10]],
        "riwayat": riw, "sebelumnya": {"kode": seb_k, "kejadian": kejadian_jenis(seb),
                                       "banding": banding(g["alam"]["kejadian"], seb["alam"]["kejadian"] if seb else None) | ({"status": "sementara"} if periode == "harian" else {})}, **tambahan,
        "tahun_lalu": {"kode": tl_k, "asal": asal if tl else None, "kejadian": kejadian_jenis(tl),
                       "dampak": tl["alam"]["dampak"] if tl else None, "banding": bandingan},
        "bukan_alam": {"jenis": g["bukan_alam"], "kab_teratas": kab_na,
                       "tahun_lalu": {j: banding(g["bukan_alam"][j]["kejadian"], tl["bukan_alam"][j]["kejadian"] if tl else None) for j in BUKAN_ALAM},
                       "catatan_lainnya": "DIBI tidak merinci jenis kejadian Lainnya"},
    }
    sumber = {"tarik": dibi.get("tarik"), "kejadian": g["alam"]["kejadian"],
              "bukan_alam": {BUKAN_ALAM[j]: x["kejadian"] for j, x in g["bukan_alam"].items() if x["kejadian"]},
              "kejadian_resmi": g["resmi"]["alam"]["kejadian"] if g["resmi"] else None,
              "duplikat_dampak": kena, "di_bawah_ambang": g["di_bawah_ambang"], "status": "ok"}
    return out, g, sumber


N_MENONJOL = 5   # ALGORITMA 12: harian tanpa usulan temuan; kejadian menonjol = 5 terbesar


def rerata_7(dibi, a, g):
    """H21: rerata 7 hari SEBELUM tanggal laporan (a-7 .. a-1, hari itu tidak ikut); None bila DIBI tidak mencakup ketujuhnya."""
    d0, d1 = a - dt.timedelta(days=7), a - dt.timedelta(days=1)
    w = agregat(bersih_dampak(pilih(dibi["kejadian"], d0, d1))[0]) if tercakup(dibi, d0, d1) else None
    bagi = lambda x: None if x is None else bulat(Decimal(x) / 7)
    alam = bagi(w["alam"]["kejadian"]) if w else None
    resmi = bagi(w["resmi"]["alam"]["kejadian"]) if w and w["resmi"] else None
    return {"dari": d0.isoformat(), "sampai": d1.isoformat(), "hari": 7, "alam": alam, "alam_resmi": resmi,
            "jenis": {j: bagi(w["jenis"][j]["kejadian"]) if w else None for j in JENIS},
            "banding": banding(g["alam"]["kejadian"], alam)}


def menonjol(g):
    """kejadian bencana alam terbesar hari itu: meninggal dan hilang, lalu terdampak dan mengungsi, lalu banyak kejadian."""
    ks = [k for k in g["kab"] if k["jenis"] in JENIS]
    ks.sort(key=lambda k: (-_n0(k["dampak"]["meninggal_hilang"]), -_n0(k["dampak"]["terdampak_mengungsi"]), -k["kejadian"], str(k["kode"])))
    return ks[:N_MENONJOL]


def lampiran(g, sumber_dibi):
    """Tabel kejadian per provinsi dan jenis (bencana alam), dan angka catatan metode."""
    return {"prov_jenis": sorted(({"kode": p["kode"], "nama": p["nama"], "jenis": p["jenis"], "kejadian": p["kejadian"]} for p in g["prov"]), key=lambda p: p["kode"]),
            "metode": {"duplikat_dampak": sumber_dibi["duplikat_dampak"], "di_bawah_ambang": sumber_dibi["di_bawah_ambang"],
                       "gabung_banjir_longsor": g["gabung_banjir_longsor"], "catatan": list(CATATAN_METODE)}}


# ------------------------------------------------------------------ karhutla (bagian 4)
KELAS_HOT = [2000, 8000, 20000, 60000]   # [BAWAAN SEMENTARA, Q21] batas bawah kelas 1..4
N_LABEL, N_KALIMAT, N_SATELIT = 8, 6, 8   # [BAWAAN SEMENTARA, Q21]


def kelas_hot(n):
    return sum(n >= x for x in KELAS_HOT)


def _hari(a, b):
    return [(a + dt.timedelta(days=i)).isoformat() for i in range((b - a).days + 1)]


def jumlah_hot(harian, a, b):
    """jumlah hotspot nasional dalam rentang dengan cakupannya; hot None bila ada hari tanpa data (sebagian bukan angka penuh)."""
    hs = _hari(a, b)
    v = [None if any("hot" in x and x["hot"] is None for x in harian[d].values()) else sum(int(x.get("hot") or 0) for x in harian[d].values())
         for d in hs if d in harian]   # hot None di satu provinsi = hari itu tidak diketahui, bukan 0
    return {"hot": sum(v) if len(v) == len(hs) and None not in v else None, "hari": len(v), "hari_rentang": len(hs)}


def bab2(periode, kode, m, g):
    k = m.get("karhutla") or {}
    harian = k.get("hari") or {}
    a, b = rentang(periode, kode)
    hari = _hari(a, b)
    ada = [d for d in hari if d in harian]
    status = "ok" if len(ada) == len(hari) else "sebagian" if ada else "belum_ada"
    sumber = {"tarik": k.get("tarik"), "asal": k.get("asal"), "hari": len(ada), "hari_rentang": len(hari),
              "hari_kosong": [d for d in hari if d not in harian], "status": status}
    if not ada:
        return {"status": "belum_ada"}, sumber
    nama = {p["kode"]: p["nama"] for p in g["prov"]}
    prov = {}
    for d in ada:
        for p, x in harian[d].items():
            e = prov.setdefault(p, {"kode": p, "nama": x.get("nama") or nama.get(p) or PROVINSI.get(p) or p, "hot": 0, "luas": Decimal(0), "belum": None})
            e["hot"] += int(x.get("hot") or 0)
            e["luas"] += Decimal(str(x.get("luas") or 0))
    akhir = harian.get(b.isoformat())
    for p, e in prov.items():
        e["luas"] = bulat(e["luas"])
        e["belum"] = bulat((akhir.get(p) or {}).get("belum") or 0) if akhir is not None else None
    nas = {d: sum(int(x.get("hot") or 0) for x in harian[d].values()) for d in ada}
    total = sum(nas.values())
    pd_ = min(ada, key=lambda d: (-nas[d], d))   # hari pertama dengan nilai terbanyak
    urut = sorted(prov.values(), key=lambda e: (-e["hot"], e["kode"]))
    dibi_kh = {p["kode"]: p["jenis"].get("karhutla", 0) for p in g["prov"]}
    for e in urut:
        e["kelas"] = kelas_hot(e["hot"])
        e["dibi_karhutla"] = dibi_kh.get(e["kode"], 0)
    teratas = urut[:N_KALIMAT]
    akhir_n = nas.get(b.isoformat())
    out = {
        "hot": total, "luas": bulat(sum(Decimal(str(e["luas"])) for e in urut)),
        "belum": bulat(sum(Decimal(str(e["belum"])) for e in urut)) if akhir is not None else None,
        "puncak": {"tanggal": pd_, "hot": nas[pd_]} if periode != "harian" else None, "akhir": {"tanggal": b.isoformat(), "hot": akhir_n},
        "turun_dari_puncak": persen(nas[pd_] - akhir_n, nas[pd_]) if akhir_n is not None and periode != "harian" else None,
        "harian": [{"tanggal": d, "hot": nas.get(d)} for d in hari],
        "prov": urut, "label": [e["kode"] for e in urut[:N_LABEL]], "kelas_batas": KELAS_HOT,
        "teratas": {"n": len(teratas), "kode": [e["kode"] for e in teratas], "hot": sum(e["hot"] for e in teratas), "persen": persen(sum(e["hot"] for e in teratas), total)},
        "satelit_lawan_dibi": [{"kode": e["kode"], "nama": e["nama"], "hot": e["hot"], "dibi_karhutla": e["dibi_karhutla"]} for e in urut[:N_SATELIT]],
        "sebelumnya": {"kode": (sk := geser(periode, kode, -1)), **jumlah_hot(harian, *rentang(periode, sk))},
        "cakupan": {"hari": len(ada), "hari_rentang": len(hari)}, "status": status,
    }
    if periode == "bulanan":   # hotspot per bulan sejak Januari
        out["per_bulan"] = [{"kode": f"{a.year}-{i:02d}", **jumlah_hot(harian, *rentang("bulanan", f"{a.year}-{i:02d}"))} for i in range(1, a.month + 1)]
    out["sebelumnya"]["banding"] = banding(total if status == "ok" else None, out["sebelumnya"]["hot"])   # banding hanya cakupan penuh
    if periode == "harian":   # H21: rerata 7 hari sebelum tanggal laporan, tidak termasuk hari itu; hanya bila ketujuh hari ada
        r = jumlah_hot(harian, a - dt.timedelta(days=7), a - dt.timedelta(days=1))
        rr = bulat(Decimal(r["hot"]) / 7) if r["hot"] is not None else None
        out["rerata_7"] = {"dari": (a - dt.timedelta(days=7)).isoformat(), "sampai": (a - dt.timedelta(days=1)).isoformat(), "hot": rr,
                           "hari": r["hari"], "hari_rentang": r["hari_rentang"], "banding": banding(total if status == "ok" else None, rr)}
    return out, sumber


# ------------------------------------------------------------------ banjir dan longsor (bagian 5)
N_TABEL_BANJIR = 14   # [BAWAAN SEMENTARA, Q21]


def norm_kab(k):
    """kode kab ke bentuk DIBI PP.KK: '14.71', '1471', '14|1471', '14.71.01' -> '14.71'; None bila tak terbaca."""
    s = str(k or "").split("|")[-1].strip()
    if "." in s:
        p = s.split(".")
        if len(p) >= 2 and p[0].isdigit() and p[1].isdigit():
            return f"{int(p[0]):02d}.{int(p[1]):02d}"
        return None
    d = re.sub(r"\D", "", s)
    return f"{d[:2]}.{d[2:4]}" if len(d) >= 4 else None


def status_surut(kab_kode, surut_harian, a, b):
    """bagian 5.3: entri dalops terakhir dalam rentang (sampai hari terakhir) untuk kab itu."""
    for d in reversed(_hari(a, b)):
        x = (surut_harian.get(d) or {}).get(kab_kode)
        if x is not None:
            return ("sudah" if x.get("surut") is True else "belum"), d
    return "belum_dilaporkan", None


def bab3(periode, kode, m, g):
    s = m.get("surut") or {}
    a, b = rentang(periode, kode)
    sh = {d: {norm_kab(k): v for k, v in (x or {}).items() if norm_kab(k)} for d, x in (s.get("hari") or {}).items()}
    ada = [d for d in _hari(a, b) if d in sh]
    sumber = {"tarik": s.get("tarik"), "asal": s.get("asal"), "hari": len(ada), "hari_rentang": (b - a).days + 1,
              "status": "ok" if len(ada) == (b - a).days + 1 else "sebagian" if ada else "belum_ada"}
    banjir = [dict(k) for k in g["kab"] if k["jenis"] == "banjir"]
    hit = {"sudah": 0, "belum": 0, "belum_dilaporkan": 0}
    for k in banjir:
        k["surut"], k["surut_tgl"] = status_surut(norm_kab(k["kode"]), sh, a, b) if ada else (None, None)
        if k["surut"]:
            hit[k["surut"]] += 1
    tprov = {}
    for k in banjir:
        tprov[k["prov_kode"]] = tprov.get(k["prov_kode"], 0) + _n0(k["dampak"]["terdampak_mengungsi"])
    banjir.sort(key=lambda k: (-tprov[k["prov_kode"]], k["prov_kode"], -_n0(k["dampak"]["terdampak_mengungsi"]), k["kode"]))
    nprov = {}
    for k in banjir:
        nprov[k["prov_kode"]] = nprov.get(k["prov_kode"], 0) + 1
    seb = geser(periode, kode, -1)
    sg = agregat_kode(m["dibi"], periode, seb)
    out = {
        "banjir": {"kab": banjir, "tabel": [k["kode"] for k in banjir[:N_TABEL_BANJIR]], "kab_n": len(banjir),
                   "status": hit if ada else None, "prov_terbanyak": max(nprov, key=lambda p: (nprov[p], p)) if nprov else None,
                   "ringkas": g["jenis"]["banjir"], "gabung_banjir_longsor": g["gabung_banjir_longsor"]},
        "longsor": {"kab": [k for k in g["kab"] if k["jenis"] == "longsor"], "ringkas": g["jenis"]["longsor"]},
        "sebelumnya": {"kode": seb, "banjir": banding(g["jenis"]["banjir"]["kejadian"], sg["jenis"]["banjir"]["kejadian"] if sg else None),
                       "longsor": banding(g["jenis"]["longsor"]["kejadian"], sg["jenis"]["longsor"]["kejadian"] if sg else None)},
    }
    return out, sumber


# ------------------------------------------------------------------ cuaca ekstrem dan kekeringan (bagian 6)
N_TABEL_CUACA = 12   # [BAWAAN SEMENTARA, Q21]


def bab4(periode, kode, m, g):
    kab = [k for k in g["kab"] if k["jenis"] in ("cuaca_ekstrem", "kekeringan")]
    besar = sorted(kab, key=lambda k: (-_n0(k["dampak"]["meninggal_hilang"]), -_n0(k["dampak"]["terdampak_mengungsi"]), -_n0(k["dampak"]["rumah_rusak"]), -k["kejadian"], k["kode"]))
    seb = geser(periode, kode, -1)
    sg = agregat_kode(m["dibi"], periode, seb)
    return {"cuaca_ekstrem": {"kab": [k for k in kab if k["jenis"] == "cuaca_ekstrem"], "ringkas": g["jenis"]["cuaca_ekstrem"]},
            "kekeringan": {"kab": [k for k in kab if k["jenis"] == "kekeringan"], "ringkas": g["jenis"]["kekeringan"]},
            "tabel": [{"kode": k["kode"], "jenis": k["jenis"]} for k in besar[:N_TABEL_CUACA]],
            "sebelumnya": {"kode": seb, **{j: banding(g["jenis"][j]["kejadian"], sg["jenis"][j]["kejadian"] if sg else None) for j in ("cuaca_ekstrem", "kekeringan")}}}


# ------------------------------------------------------------------ prakiraan (ALGORITMA 6 dan 8, LB-04)
# Hanya membaca keluaran yang sudah terbit (D8, K6): tidak ada model baru di sini, tidak memakai /prediksi (+1..+3 hari).
JENIS_PELUANG = ("banjir", "longsor")
AMBANG_ENSO = 0.5   # NOAA CPC: indeks >= +0,5 kondisi El Nino, <= -0,5 La Nina (ambang ONI, dipakai juga untuk RONI)
SUMBER_HUJAN = "Model statistik GIS BNPB (CHIRPS, NOAA RONI, DMI)"
BUKAN_BMKG = "Angka ini bukan prakiraan resmi BMKG."


def _tarik(berkas):
    return str(berkas.get("dibuat"))[:10] if berkas.get("dibuat") else None


def hujan_depan(kode, ik):
    """ALGORITMA 6: butir prakiraan ber-bulan_tengah B+1, hanya wilayah ber-tampil; wilayah yang fit-nya tidak lulus uji balik
    leave-one-out berlabel hipotesis. Tanpa berkas atau tanpa butir itu = belum_ada, tidak pernah 0."""
    bt = geser("bulanan", kode, 1)
    s = {"tarik": _tarik(ik or {}), "terbit": _tarik(ik or {}), "status": "belum_ada"}
    p = next((x for x in (ik or {}).get("prakiraan") or [] if x.get("bulan_tengah") == bt), None)
    if not p:
        return {"status": "belum_ada", "bulan_tengah": bt}, s
    fit = ((ik.get("fit") or {}).get(p.get("musim")) or {})
    nama = ik.get("wilayah") or {}
    wil, tak = [], []
    for w, x in (p.get("wilayah") or {}).items():
        if not x.get("tampil") or x.get("anom_pct") is None:
            tak.append(w)
            continue
        wil.append({"kode": w, "nama": (nama.get(w) or {}).get("nama", w), "anom_pct": x["anom_pct"], "p10": x.get("p10"), "p90": x.get("p90"),
                    "mutu": "uji_balik_lulus" if (fit.get(w) or {}).get("lulus") else "hipotesis"})
    s["status"] = "ok" if wil else "belum_ada"
    pd = p.get("pendorong") or {}
    return {"status": s["status"], "bulan_tengah": bt, "musim": p.get("musim"), "tahun": p.get("tahun"), "label": p.get("label"),
            "horizon_bulan": p.get("horizon_bulan"), "ekstrapolasi": bool(p.get("ekstrapolasi")), "di_luar_rentang": bool(p.get("di_luar_rentang")),
            "jenis_pendorong": p.get("jenis_pendorong"), "pendorong": {"roni": pd.get("roni"), "dmi": pd.get("dmi")},
            "wilayah": wil, "tidak_tampil": sorted(tak), "sumber": SUMBER_HUJAN, "dibuat": ik.get("dibuat"), "catatan": BUKAN_BMKG}, s


def peluang_bulan(rw, bulan):
    """ALGORITMA 8: kab berpeluang tinggi jenis j di bulan itu = tercatat >= 1 kejadian j di bulan itu pada paling sedikit
    separuh tahun penuh logbook (H14: 5 dari 9 masuk, 4 dari 9 tidak)."""
    n, i = len(rw["tahun_penuh"]), int(bulan[5:7]) - 1
    out, semua = {"bulan": bulan}, set()
    for j in JENIS_PELUANG:
        ks = [(k, v["tahun_ada"][j][i]) for k, v in sorted(rw["kab"].items()) if (v.get("tahun_ada") or {}).get(j) and 2 * v["tahun_ada"][j][i] >= n]
        semua.update(k for k, _ in ks)
        out[j] = {"kab_n": len(ks), "kab": [{"prov_kode": k.split("|")[0], "nama": k.split("|", 1)[-1], "tahun": t} for k, t in ks]}
    out["gabung_n"] = len(semua)
    return out


def enso(ik):
    r = (((ik or {}).get("keadaan_sekarang") or {}).get("roni")) or {}
    if r.get("nilai") is None:
        return {"status": "belum_ada"}
    v = float(r["nilai"])
    gol = "di atas ambang El Niño" if v >= AMBANG_ENSO else "di bawah ambang La Niña" if v <= -AMBANG_ENSO else "netral"
    return {"status": "ok", "nilai": v, "musim": r.get("musim"), "tahun": r.get("tahun"), "golongan": gol, "ambang": AMBANG_ENSO,
            "sumber": "NOAA CPC (RONI)", "dibuat": ik.get("dibuat")}


def bab7(periode, kode, m):
    """Bab 7.1: peluang banjir dan longsor B+1 dan B+2 dari riwayat logbook (belum diuji balik: hipotesis), indeks ENSO."""
    rw = m.get("riwayat")
    s = {"asal": "logbook_riwayat", "tarik": _tarik(rw or {}), "status": "belum_ada"}
    pel = {"status": "belum_ada"}
    if rw and rw.get("tahun_penuh") and rw.get("kab"):
        s.update(status="ok", tahun_penuh=[int(t) for t in rw["tahun_penuh"]])
        pel = {"status": "ok", "asal": "logbook_riwayat", "tahun_penuh": s["tahun_penuh"], "mutu": "hipotesis",
               "aturan": f"paling sedikit separuh dari {len(rw['tahun_penuh'])} tahun penuh logbook Pusdalops mencatat kejadian di bulan itu",
               "bulan": [peluang_bulan(rw, geser("bulanan", kode, k)) for k in (1, 2)]}
    return {"peluang": pel, "enso": enso(m.get("iklim")), "catatan": BUKAN_BMKG}, s


# ------------------------------------------------------------------ prakiraan harian dan mingguan (ALGORITMA 12)
# Hanya membaca keluaran modul prediksi apa adanya (AGENTS.md 2.7): tanpa hitung ulang, BMKG dan prediksi kita terpisah, tanpa "aman".
LABEL_KITA = "Prediksi model Centurisk97 (/prediksi), bukan pernyataan BMKG"


def _wib(s):
    return str(s or "")[:10] or None


def prakiraan_besok(kode, pr):
    """harian: prediksi.json waspada tenggang +1, ditegakkan pada TANGGAL TARGET hari[0]: ok hanya bila hari[0] = a+1 atau a+2
    (rakit 10.10 WIB hari a+1 memakai prediksi terbit pagi itu, jadi targetnya a+2; rakit ulang hari a memakai a+1). Tiap rakit
    harian membaca prediksi.json terbaru, jadi laporan a+1 dirakit dengan berkas lebih baru dan targetnya bergeser. Di luar itu = basi.
    Kosong = belum_tersedia, tidak pernah 0."""
    a, _ = rentang("harian", kode)
    if not pr:
        return {"status": "belum_tersedia"}, {"tarik": None, "status": "belum_ada"}
    terbit = _wib(pr.get("dibuat"))
    hari = next((x.get("hari") for x in (pr.get("kode") or {}).values() if x.get("hari")), None) or []
    untuk = hari[0] if hari else None
    s = {"tarik": terbit, "terbit": terbit, "status": "ok"}
    if untuk not in ((a + dt.timedelta(days=1)).isoformat(), (a + dt.timedelta(days=2)).isoformat()):
        s["status"] = "basi"
        return {"status": "basi", "terbit": terbit, "untuk": untuk, "catatan": f"prediksi.json untuk {untuk}, bukan sehari atau dua hari sesudah {a.isoformat()}"}, s
    kab = {k.get("id"): k for k in pr.get("kab") or []}
    per = {}
    for w in pr.get("waspada") or []:
        if w.get("tenggang") != 1:
            continue
        k = kab.get(w.get("kab")) or {}
        e = per.setdefault(w.get("aturan"), {"aturan": w.get("aturan"), "maka": w.get("maka"), "kab": []})
        e["kab"].append({"kode": w.get("kab"), "nama": k.get("nama"), "prov_kode": k.get("prov"), "prov": k.get("pn"),
                         "jiwa": (w.get("dampak") or {}).get("jiwa")})
    for e in per.values():
        e["kab"].sort(key=lambda x: str(x["kode"]))
        e["kab_n"] = len(e["kab"])
    return {"status": "ok", "terbit": terbit, "untuk": untuk, "tenggang": 1, "asal": "prediksi.json",
            "aturan": sorted(per.values(), key=lambda e: (-e["kab_n"], str(e["aturan"]))), "batasan": list(pr.get("batasan") or []),
            "label": LABEL_KITA}, s


def prakiraan_sepekan(kode, tg):
    """mingguan: tangga.json anak tangga sepekan. Tanpa berkas = belum_tersedia (H18); berkas yang tidak terbit Senin sampai Rabu
    sesudah minggu itu = basi. Pernyataan BMKG (resmi) dan prediksi kita dipisah per sumber, dibaca apa adanya."""
    _, b = rentang("mingguan", kode)
    if not tg:
        return {"status": "belum_tersedia"}, {"tarik": None, "status": "belum_ada"}
    hari = _wib(tg.get("hari") or tg.get("dibuat"))
    s = {"tarik": hari, "terbit": hari, "status": "ok"}
    if not hari or not (b + dt.timedelta(days=1)).isoformat() <= hari <= (b + dt.timedelta(days=3)).isoformat():
        s["status"] = "basi"
        return {"status": "basi", "terbit": hari, "catatan": f"tangga.json untuk {hari}, bukan Senin sampai Rabu sesudah {b.isoformat()}"}, s
    sumber = tg.get("sumber") or {}
    meta = lambda k: {x: (sumber.get(k) or {}).get(x) for x in ("lembaga", "nama", "terbit", "cakupan")}
    resmi, kita = {}, {}   # resmi: dikelompokkan per sumber (sepekan, karhutla, ...) dengan meta masing-masing; kita: hanya jenis "kita"
    for lvl, isi in (("prov", tg.get("prov") or {}), ("kab", tg.get("kab") or {})):
        for kd, x in sorted(isi.items()):
            for p in (x or {}).get("sepekan") or []:
                sk, jn = p.get("s"), (sumber.get(p.get("s")) or {}).get("jenis")
                if jn == "resmi":
                    resmi.setdefault(sk, {"sumber": sk, **meta(sk), "pernyataan": []})["pernyataan"].append(
                        {"wilayah": lvl, "kode": kd, "nama": PROVINSI.get(kd) if lvl == "prov" else None, "tingkat": p.get("tk"), "label": p.get("t"), "kalimat": p.get("x"), "masa": p.get("p")})
                elif jn == "kita":
                    e = kita.setdefault((sk, p.get("t")), {"sumber": sk, "nama_sumber": (sumber.get(sk) or {}).get("nama"), "label": p.get("t"), "mutu": p.get("u"), "kab_n": 0})
                    e["kab_n"] += lvl == "kab"
    return {"status": "ok", "terbit": hari, "asal": "tangga.json", "bmkg": sorted(resmi.values(), key=lambda e: str(e["sumber"])),
            "kita": {"label": LABEL_KITA, "ringkas": sorted(kita.values(), key=lambda e: (-e["kab_n"], str(e["label"])))},
            "catatan": list(tg.get("catatan") or [])}, s


# ------------------------------------------------------------------ geologi (bagian 7)
def peristiwa(baris, daftar, jenis_):
    """7.2: satu peristiwa = satu kejadian data gempa/gunung api yang punya baris DIBI pada tanggal sama atau sehari sesudahnya
    di provinsi yang sama; baris DIBI tak cocok = satu peristiwa per baris."""
    rs = [r for r in baris if r["_j"] == jenis_]
    pakai, out = set(), []
    for e in sorted(daftar or [], key=lambda e: (e["tanggal"], str(e.get("id")))):
        t0 = dt.date.fromisoformat(e["tanggal"])
        cocok = [i for i, r in enumerate(rs) if i not in pakai and r["prov_kode"] == str(e["prov_kode"])
                 and 0 <= (dt.date.fromisoformat(r["tanggal"]) - t0).days <= 1]
        if cocok:
            pakai.update(cocok)
            x = ringkas([rs[i] for i in cocok])
            out.append({"asal": "data", "id": e.get("id"), "tanggal": e["tanggal"], "prov_kode": str(e["prov_kode"]),
                        **({"mag": e["mag"]} if "mag" in e else {}), **({"gunung": e["gunung"]} if "gunung" in e else {}),
                        "laporan": x["kejadian"], "kab": sorted({rs[i]["kab_kode"] for i in cocok}), "dampak": x["dampak"]})
    nol = ringkas([])["dampak"]
    for i, r in enumerate(rs):
        if i not in pakai:
            x = ringkas([r])
            # baris kejadian = k: k peristiwa, dampak baris hanya di peristiwa pertama (tidak disalin k kali)
            out.extend({"asal": "dibi", "id": None, "tanggal": r["tanggal"], "prov_kode": r["prov_kode"], "laporan": 1,
                        "kab": [r["kab_kode"]], "dampak": x["dampak"] if n == 0 else dict(nol)} for n in range(max(1, jml([r]))))
    return sorted(out, key=lambda e: (e["tanggal"], e["prov_kode"]))


def status_gunung(ga):
    if not ga or not ga.get("level"):
        return None
    lv = {n: int(v) for n, v in ga["level"].items()}
    return {"tanggal": ga.get("tanggal"), "per_level": {str(i): sum(1 for v in lv.values() if v == i) for i in (1, 2, 3, 4)},
            "level_3": sorted(n for n, v in lv.items() if v == 3), "level_4": sorted(n for n, v in lv.items() if v == 4)}


def bab5(periode, kode, m, baris, g):
    gp = peristiwa(baris, (m.get("gempa") or {}).get("peristiwa"), "gempa")
    ep = peristiwa(baris, (m.get("erupsi") or {}).get("peristiwa"), "erupsi")
    lap = {"gempa": g["jenis"]["gempa"]["kejadian"], "erupsi": g["jenis"]["erupsi"]["kejadian"]}
    st = status_gunung(m.get("gunungapi"))
    out = {"laporan": lap, "gempa": gp, "erupsi": ep, "peristiwa": {"gempa": len(gp), "erupsi": len(ep)},
           "selisih": {"gempa": lap["gempa"] - len(gp), "erupsi": lap["erupsi"] - len(ep)},
           "dampak": {"gempa": g["jenis"]["gempa"]["dampak"], "erupsi": g["jenis"]["erupsi"]["dampak"]}, "gunungapi": st}
    if periode in ("harian", "mingguan"):   # ALGORITMA 12: perubahan level gunung api hari itu atau selama minggu itu
        a, b = rentang(periode, kode)
        pl = m.get("perubahan_level")
        out["perubahan_level"] = None if pl is None else sorted(
            ({k: x.get(k) for k in ("gunung", "tanggal", "dari", "ke")} for x in pl if a.isoformat() <= str(x.get("tanggal")) <= b.isoformat()),
            key=lambda x: (x["tanggal"], str(x["gunung"])))
    sumber = {"gempa": {"tarik": (m.get("gempa") or {}).get("tarik"), "status": "ok" if m.get("gempa") else "belum_ada"},
              "gunungapi": {"tanggal": (m.get("gunungapi") or {}).get("tanggal"), "tarik": (m.get("gunungapi") or {}).get("tanggal"),
                            "status": "ok" if st else "belum_ada"}}
    return out, sumber


# ------------------------------------------------------------------ usulan temuan (bagian 9)
T1_HOT = {"mingguan": 12500, "bulanan": 50000, "tahunan": 600000}   # [BAWAAN SEMENTARA, Q18]: bulanan 50.000, mingguan /4, tahunan x12


def usulan(periode, kode, b1, b2, b3, b5, m):
    """Kalimat fakta berangka saja, tanpa saran dan tanpa kata 'aman'. Harian tidak punya usulan (ALGORITMA 12)."""
    if periode == "harian":
        return []
    nm = nama_periode(periode, kode)
    out = []
    ck = b2.get("cakupan") or {}
    sisip = "" if b2.get("status") == "ok" else f" (data {ck.get('hari', 0)} dari {ck.get('hari_rentang', 0)} hari)"
    if b2.get("hot") is not None and b2["hot"] > T1_HOT[periode]:
        t = b2["teratas"]
        k = f"Selama {nm}{sisip} tercatat {fmt(b2['hot'])} hotspot; {fmt(t['persen'])}% di {t['n']} provinsi teratas"
        if b2.get("turun_dari_puncak") is not None:
            k += f", dan hari terakhir {fmt(b2['turun_dari_puncak'])}% di bawah puncak {fmt(b2['puncak']['hot'])} pada {tgl(b2['puncak']['tanggal'])}"
        out.append({"kode": "T1", "pil": "karhutla", "kalimat": k + ".", "sumber": "Sistem karhutla Centurisk97 (FIRMS)",
                    "angka": {"hot": b2["hot"], "persen_teratas": t["persen"], "n_teratas": t["n"], "turun_dari_puncak": b2.get("turun_dari_puncak")}})
    nol = [p for p in b2.get("satelit_lawan_dibi", []) if p["dibi_karhutla"] == 0]
    if nol:
        out.append({"kode": "T2", "pil": "data", "sumber": "Sistem karhutla Centurisk97 dan DIBI",
                    "kalimat": f"{len(nol)} dari {len(b2['satelit_lawan_dibi'])} provinsi dengan hotspot terbanyak tidak punya laporan karhutla di DIBI selama {nm}{sisip}: "
                               + ", ".join(f"{p['nama']} ({fmt(p['hot'])} hotspot)" for p in nol) + ".",
                    "angka": {"provinsi": len(nol), "kode": [p["kode"] for p in nol], "dibi_karhutla": 0}})
    st = b3["banjir"]["status"]
    if st and (st["belum"] or st["belum_dilaporkan"]):
        bag = [f"{v} {t}" for v, t in ((st["belum"], "belum surut"), (st["belum_dilaporkan"], "belum dilaporkan statusnya")) if v]
        out.append({"kode": "T3", "pil": "banjir", "sumber": "DIBI dan logbook Pusdalops", "angka": dict(st),
                    "kalimat": f"Dari {b3['banjir']['kab_n']} kab/kota banjir selama {nm}, pada hari terakhir periode " + " dan ".join(bag) + "."})
    rr = _n0(b1["jenis"]["gempa"]["dampak"]["rumah_rusak"])
    ga = b5.get("gunungapi") or {}
    tinggi = (ga.get("level_4") or []) + (ga.get("level_3") or [])
    if rr > 0 or tinggi:
        bag = []
        if rr > 0:
            bag.append(f"gempa bumi merusak {fmt(rr)} rumah selama {nm}")
        if tinggi:
            per = f" per {tgl(ga['tanggal'])}" if ga.get("tanggal") else ""
            bag.append(f"{len(tinggi)} gunung api berstatus Level III atau IV{per}: " + ", ".join(tinggi))
        k = "; ".join(bag)
        out.append({"kode": "T4", "pil": "vulkanologi", "kalimat": k[0].upper() + k[1:] + ".", "sumber": "DIBI dan PVMBG",
                    "angka": {"rumah_rusak_gempa": rr, "gunung": tinggi}})
    if b2.get("belum"):
        out.append({"kode": "T5", "pil": "karhutla", "sumber": "Sistem karhutla Centurisk97", "angka": {"belum": b2["belum"]},
                    "kalimat": f"Pada {tgl(b2['akhir']['tanggal'])} perkiraan luas belum padam {fmt(b2['belum'])} ha."})
    pel = (m.get("peluang") or {}).get("kab_tinggi")
    if pel:
        bl = (m.get("peluang") or {}).get("bulan")
        pada = f"pada {nama_periode('bulanan', bl)}" if bl else "pada periode berikutnya"
        out.append({"kode": "T6", "pil": "prediksi", "sumber": "Riwayat logbook Pusdalops", "angka": {"kab": pel}, "mutu": "hipotesis",
                    "kalimat": f"{fmt(pel)} kab/kota berpeluang tinggi banjir atau longsor {pada} menurut riwayat kejadian (hipotesis, belum diuji balik). {BUKAN_BMKG}"})
    en = m.get("enso")
    if en and en.get("nilai") is not None:
        out.append({"kode": "T7", "pil": "iklim", "sumber": "NOAA CPC (RONI)", "angka": dict(en),
                    "kalimat": " ".join(f"Indeks Pasifik (RONI) {en.get('musim') or ''} {en.get('tahun') or ''} bernilai {fmt(bulat(float(en['nilai']), 2))}, {en.get('golongan')}.".split())})
    return out


# ------------------------------------------------------------------ berkas angka
WAJIB_RINGKAS = {"bab1": ["alam", "kelompok", "jenis", "prov", "riwayat", "sebelumnya", "tahun_lalu", "bukan_alam"],
                 "bab2": ["status"], "bab3": ["banjir", "longsor", "sebelumnya"], "bab4": ["cuaca_ekstrem", "kekeringan", "tabel", "sebelumnya"],
                 "bab5": ["laporan", "gempa", "erupsi", "peristiwa", "gunungapi", "perubahan_level"], "prakiraan": ["status"], "lampiran": ["prov_jenis", "metode"]}
WAJIB = {"harian": {**WAJIB_RINGKAS, "bab1": WAJIB_RINGKAS["bab1"] + ["rerata_7", "menonjol", "kab"]}, "mingguan": WAJIB_RINGKAS,
         "bulanan": {"bab1": ["alam", "kelompok", "jenis", "prov", "prov_teratas", "riwayat", "sebelumnya", "tahun_lalu", "bukan_alam"],
                     "bab2": ["status"], "bab3": ["banjir", "longsor", "sebelumnya"], "bab4": ["cuaca_ekstrem", "kekeringan", "tabel", "sebelumnya", "hujan"],
                     "bab5": ["laporan", "gempa", "erupsi", "peristiwa", "selisih", "gunungapi"], "bab7": ["peluang", "enso", "catatan"],
                     "lampiran": ["prov_jenis", "metode"]}}


def berkas_angka(periode, kode, m, hari_ini=None, dirakit=None):
    """Berkas angka satu periode (DESAIN-TEKNIS 2). Bulanan menambah Bab 4.4 hujan dan Bab 7.1 (LB-04)."""
    hari_ini = hari_ini or dt.date.today()
    periksa_selesai(periode, kode, hari_ini)
    a, b = rentang(periode, kode)
    b1, g, s_dibi = bab1(periode, kode, m)
    baris = bersih_dampak(pilih(m["dibi"]["kejadian"], a, b))[0]
    b2, s_kh = bab2(periode, kode, m, g)
    b2.setdefault("status", s_kh["status"])
    b3, s_su = bab3(periode, kode, m, g)
    b4 = bab4(periode, kode, m, g)
    b5, s_geo = bab5(periode, kode, m, baris, g)
    tl = b1["tahun_lalu"]
    turunan, s_pr = {}, {}
    if periode == "bulanan":
        b4["hujan"], s_pr["prakiraan_hujan"] = hujan_depan(kode, m.get("iklim"))
        b7, s_pr["peluang"] = bab7(periode, kode, m)
        if b7["peluang"]["status"] == "ok":
            p1 = b7["peluang"]["bulan"][0]
            turunan["peluang"] = {"kab_tinggi": p1["gabung_n"], "bulan": p1["bulan"]}
        if b7["enso"]["status"] == "ok":
            turunan["enso"] = {k: b7["enso"][k] for k in ("nilai", "golongan", "musim", "tahun")}
    elif periode == "harian":
        pk, s_pr["prakiraan_besok"] = prakiraan_besok(kode, m.get("prediksi"))
    elif periode == "mingguan":
        pk, s_pr["prakiraan_sepekan"] = prakiraan_sepekan(kode, m.get("tangga"))
    out = {
        "v": 1, "periode": periode, "kode": kode, "nama": nama_periode(periode, kode), "rentang": [a.isoformat(), b.isoformat()],
        "dirakit": dirakit or dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "label_jenis": LABEL,
        "sumber": {"dibi": s_dibi,
                   "dibi_tahun_lalu": {"asal": tl["asal"], "tarik": (m.get("dibi_lalu") or {}).get("tarik") if tl["asal"] not in (None, "dibi_kejadian") else s_dibi["tarik"],
                                       "status": "ok" if tl["kejadian"] else "belum_ada"},
                   "karhutla": s_kh, "dalops_banjir": s_su, **s_geo, **s_pr},
        "bab1": b1, "bab2": b2, "bab3": b3, "bab4": b4, "bab5": b5, "lampiran": lampiran(g, s_dibi),
    }
    if periode == "bulanan":
        out["bab7"] = b7
    elif periode in ("harian", "mingguan"):
        out["prakiraan"] = pk
    out["usulan_temuan"] = usulan(periode, kode, b1, b2, b3, b5, {**turunan, **m})
    return out


# ------------------------------------------------------------------ uji (RENCANA-UJI 1)
def _r(tgl, jenis_, kab, n=1, prov=None, **d):
    p = prov or kab[:2]
    return {"tanggal": tgl, "jenis": jenis_, "prov_kode": p, "prov": f"Prov {p}", "kab_kode": kab, "kab": f"Kab {kab}", "kejadian": n, **d}


def _dibi(baris, dari="2025-01-01", sampai="2026-11-20"):
    return {"tarik": "2026-11-21", "dari": dari, "sampai": sampai, "kejadian": baris}


def uji():
    n = 0

    def ok(c, pesan):
        nonlocal n
        assert c, pesan
        n += 1

    # H15 validasi kode, fixture bersama modul JS
    fx = json.load(open(os.path.join(FIX, "kode_periode.json")))
    for c in fx["kasus"]:
        ok(kode_sah(c["periode"], c["kode"]) == c["sah"], f"H15 {c}")
        if c["sah"] and c.get("rentang"):
            ok([d.isoformat() for d in rentang(c["periode"], c["kode"])] == c["rentang"], f"H16 {c}")
    ok(not kode_sah("semesteran", "2026-1"), "periode asing")
    # H16 minggu ISO lintas tahun
    ok(rentang("mingguan", "2026-W01") == (dt.date(2025, 12, 29), dt.date(2026, 1, 4)), "H16 W01")
    ok(rentang("mingguan", "2026-W53") == (dt.date(2026, 12, 28), dt.date(2027, 1, 3)), "H16 W53")
    a, b = rentang("mingguan", "2026-W01")
    ok(len(pilih([_r("2025-12-31", "Banjir", "14.71")], a, b)) == 1, "H16 31 Des 2025 di 2026-W01")
    ok(geser("mingguan", "2026-W01", -1) == "2025-W52" and geser("bulanan", "2026-01", -1) == "2025-12" and tahun_lalu("bulanan", "2026-10") == "2025-10", "geser")
    # H13 periode berjalan ditolak
    hi = dt.date(2026, 11, 25)
    for p, k in (("harian", "2026-11-25"), ("mingguan", "2026-W48"), ("bulanan", "2026-11"), ("tahunan", "2026")):
        try:
            periksa_selesai(p, k, hi)
            ok(False, f"H13 {p}")
        except KodeSalah:
            ok(True, "H13")
    periksa_selesai("bulanan", "2026-10", hi)
    periksa_selesai("harian", "2026-11-24", hi)

    # H1, H3d permukiman dan konflik tidak masuk alam
    rs = [_r("2026-10-02", "Kebakaran Hutan dan Lahan", "14.71"), _r("2026-10-03", "Banjir", "11.08", terdampak=10),
          _r("2026-10-04", "Kebakaran Gedung dan Permukiman", "31.71", 2, meninggal=1), _r("2026-10-05", "Konflik Sosial", "94.01", luka=3)]
    g = agregat(bersih_dampak(rs)[0])
    ok(g["alam"]["kejadian"] == 2, "H1 alam")
    ok(g["bukan_alam"]["kebakaran_permukiman"]["kejadian"] == 2 and g["bukan_alam"]["kebakaran_permukiman"]["dampak"]["meninggal"] == 1, "H1/H3d permukiman")
    ok(g["bukan_alam"]["konflik_sosial"]["dampak"]["luka"] == 3 and g["alam"]["dampak"]["luka"] == 0, "H3d konflik")
    # H2 duplikat antarkab
    rs = [_r("2026-10-07", "Banjir", "12.01", meninggal=2, terdampak=50), _r("2026-10-07", "Banjir", "12.02", meninggal=2, terdampak=50),
          _r("2026-10-07", "Kebakaran Hutan dan Lahan", "14.01"), _r("2026-10-07", "Kebakaran Hutan dan Lahan", "14.02")]
    bs, kena = bersih_dampak(rs)
    g = agregat(bs)
    ok(kena == 1 and g["jenis"]["banjir"]["kejadian"] == 2 and g["jenis"]["banjir"]["dampak"]["meninggal"] == 2
       and g["jenis"]["banjir"]["dampak"]["terdampak"] == 50 and g["jenis"]["karhutla"]["kejadian"] == 2, "H2")
    # Q20: lintas provinsi, atau kebetulan satu kolom, bukan kembar
    rs = [_r("2026-10-07", "Banjir", "12.01", meninggal=2, terdampak=50), _r("2026-10-07", "Banjir", "13.01", meninggal=2, terdampak=50),
          _r("2026-10-08", "Banjir", "12.01", meninggal=1), _r("2026-10-08", "Banjir", "12.02", meninggal=1)]
    bs, kena = bersih_dampak(rs)
    g = agregat(bs)
    ok(kena == 0 and g["jenis"]["banjir"]["dampak"]["meninggal"] == 6 and g["jenis"]["banjir"]["dampak"]["terdampak"] == 100, "Q20 lintas prov dan satu kolom")
    # dampak None (lapis Siklus) tetap None, bukan 0; banding tidak pernah "baru" dari None; kejadian pecahan dijumlah
    rs = [_r("2025-10-01", "Banjir", "12.01", 0.5, bencana=None, meninggal=1, terdampak=None), _r("2025-10-01", "Banjir", "12.02", 0.5, bencana=None, meninggal=0, terdampak=None)]
    g = agregat(bersih_dampak(rs)[0])
    ok(g["jenis"]["banjir"]["kejadian"] == 1 and g["alam"]["dampak"]["terdampak"] is None and g["alam"]["dampak"]["terdampak_mengungsi"] is None
       and g["alam"]["dampak"]["meninggal"] == 1 and g["resmi"] is None and g["di_bawah_ambang"] is None, "None tetap None")
    ok(banding(5, g["alam"]["dampak"]["terdampak"])["arah"] is None, "banding dari None")
    # Q28 resmi dan di bawah ambang per jenis
    rs = [_r("2026-10-01", "Banjir", "12.01"), _r("2026-10-02", "Banjir", "12.02", bencana=0), _r("2026-10-03", "Kebakaran Gedung dan Permukiman", "31.71", bencana=0)]
    g = agregat(bersih_dampak(rs)[0])
    ok(g["alam"]["kejadian"] == 2 and g["resmi"]["alam"]["kejadian"] == 1 and g["di_bawah_ambang"]["alam"] == 1
       and g["di_bawah_ambang"]["bukan_alam"] == 1 and g["di_bawah_ambang"]["jenis"]["kebakaran_permukiman"] == 1, "Q28")
    ok(PETA["Wabah Penyakit"] == "epidemi" and PETA["Tsunami"] == "gempa", "alias nama lama")
    # H3 batas bulan, H3b kolom kejadian, baris bencana=0 tetap dihitung (contoh Oktober)
    rs = [_r("2026-10-31", "Banjir", "12.01"), _r("2026-11-01", "Banjir", "12.01"), _r("2026-10-10", "Tanah Longsor", "12.03", 3),
          _r("2026-10-11", "Banjir", "12.04", bencana=0)]
    g = agregat(bersih_dampak(pilih(rs, *rentang("bulanan", "2026-10")))[0])
    ok(g["jenis"]["banjir"]["kejadian"] == 2 and g["jenis"]["longsor"]["kejadian"] == 3, "H3/H3b")
    # H3c jenis baru
    try:
        periksa_jenis([_r("2026-10-01", "Hujan Es", "12.01"), _r("2026-10-01", "Likuifaksi", "12.01")])
        ok(False, "H3c")
    except JenisBaru as e:
        ok("Hujan Es" in str(e) and "Likuifaksi" in str(e), "H3c")
    # H12 Banjir dan Tanah Longsor masuk banjir, tercatat sendiri
    g = agregat(bersih_dampak([_r("2026-10-01", "Banjir dan Tanah Longsor", "12.01", 2), _r("2026-10-01", "Banjir", "12.02")])[0])
    ok(g["jenis"]["banjir"]["kejadian"] == 3 and g["gabung_banjir_longsor"] == 2, "H12")
    # H4 kelompok
    rs = [_r("2026-10-01", n, "12.0" + str(i % 9 + 1)) for i, n in enumerate(PETA) if PETA[n] in JENIS]
    g = agregat(bersih_dampak(rs)[0])
    ok(sum(g["kelompok"][k]["kejadian"] for k in KELOMPOK) == g["alam"]["kejadian"] == len(rs), "H4")
    # H5, H6 perbandingan dan pembulatan
    ok(banding(3, 0) == {"kini": 3, "lalu": 0, "arah": "baru", "persen": None} and banding(0, 0)["arah"] == "tetap 0", "H5")
    x = banding(324, 386)
    ok(x["arah"] == "turun" and x["persen"] == 16.1 and fmt(x["persen"]) == "16,1", "H6")
    ok(bulat(Decimal("0.05")) == 0.1 and bulat(Decimal("16.05")) == 16.1 and bulat(Decimal("-2.25")) == -2.3 and bulat(2.5, 0) == 3, "H6 setengah ke atas")
    ok(banding(None, 5)["arah"] is None, "kosong bukan 0")
    ok([fmt(x) for x in (183316, 68.5, 1.97, 854069.0, 16.1, 0.05)] == ["183.316", "68,5", "1,97", "854.069", "16,1", "0,05"], "fmt tanpa bulat ulang")

    # H7 puncak; H3 karhutla Desember lintas tahun dari potongan
    harian = {f"2026-12-{d:02d}": {"14": {"hot": 10 * d, "luas": 1.5, "belum": 0}} for d in range(1, 32)}
    harian["2026-12-06"]["14"]["hot"] = 1000
    harian["2026-12-31"]["14"]["belum"] = 3.25
    harian["2027-01-01"] = {"14": {"hot": 999, "luas": 1, "belum": 0}}
    harian["2026-11-30"] = {"14": {"hot": 7, "luas": 0, "belum": 0}}
    gk = {"prov": [{"kode": "14", "nama": "Riau", "jenis": {}}]}
    b2, s2 = bab2("bulanan", "2026-12", {"karhutla": {"hari": harian}}, gk)
    tot = sum(10 * d for d in range(1, 32)) - 60 + 1000
    ok(b2["hot"] == tot and s2["status"] == "ok" and b2["puncak"] == {"tanggal": "2026-12-06", "hot": 1000}, "H3 Desember utuh")
    ok(b2["turun_dari_puncak"] == bulat(Decimal(1000 - 310) * 100 / 1000) == 69.0, "H7")
    ok(b2["luas"] == 46.5 and b2["belum"] == 3.3, "luas, belum padam")
    ok(b2["sebelumnya"]["hot"] is None and b2["sebelumnya"]["hari"] == 1 and b2["sebelumnya"]["banding"]["arah"] is None, "bulan sebelumnya sebagian = None")
    del harian["2026-12-31"]
    b2, s2 = bab2("bulanan", "2026-12", {"karhutla": {"hari": harian}}, gk)
    ok(s2["status"] == "sebagian" and b2["belum"] is None and b2["turun_dari_puncak"] is None and s2["hari_kosong"] == ["2026-12-31"], "hari kosong bukan 0")
    b2["hot"], b2["teratas"] = 60000, {"n": 1, "persen": 100.0}
    u = usulan("bulanan", "2026-12", {"jenis": {"gempa": {"dampak": {"rumah_rusak": None}}}}, b2, {"banjir": {"status": None}}, {}, {})
    ok("(data 30 dari 31 hari)" in u[0]["kalimat"], "T1 sebagian bersisipan")
    b2, s2 = bab2("bulanan", "2026-12", {}, gk)
    ok(b2 == {"status": "belum_ada"} and s2["status"] == "belum_ada", "karhutla tanpa data")
    ok([kelas_hot(x) for x in (1999, 2000, 7999, 8000, 20000, 60000)] == [0, 1, 1, 2, 3, 4], "kelas hotspot")

    # H8 status surut dan normalisasi kode
    ok(norm_kab("1471") == norm_kab("14|1471") == norm_kab("14.71.02") == norm_kab("14.71") == "14.71" and norm_kab("") is None, "H8 norm")
    rs = [_r("2026-10-03", "Banjir", "11.08", terdampak=5), _r("2026-10-04", "Banjir", "11.09", terdampak=9), _r("2026-10-05", "Banjir", "11.10")]
    g = agregat(bersih_dampak(rs)[0])
    su = {"hari": {"2026-10-20": {"1108": {"surut": False, "kondisi": "berangsur surut"}, "11|1109": {"surut": False}},
                   "2026-10-30": {"1108": {"surut": True}}}}
    b3, _ = bab3("bulanan", "2026-10", {"dibi": _dibi(rs), "surut": su}, g)
    st = {k["kode"]: k["surut"] for k in b3["banjir"]["kab"]}
    ok(st == {"11.08": "sudah", "11.09": "belum", "11.10": "belum_dilaporkan"}, f"H8 {st}")
    ok(sum(b3["banjir"]["status"].values()) == b3["banjir"]["kab_n"] == 3, "H8 jumlah")
    ok(b3["banjir"]["tabel"][0] == "11.09", "urut terdampak")

    # H9 geologi per peristiwa
    rs = [_r("2026-10-08", "Gempabumi", "53.01", rr_berat=2), _r("2026-10-09", "Gempabumi", "53.02"), _r("2026-10-20", "Gempabumi", "72.01")]
    bs = bersih_dampak(rs)[0]
    g = agregat(bs)
    b5, _ = bab5("bulanan", "2026-10", {"gempa": {"peristiwa": [{"id": "e1", "tanggal": "2026-10-08", "prov_kode": "53", "mag": 5.6}]}}, bs, g)
    ok(b5["laporan"]["gempa"] == 3 and b5["peristiwa"]["gempa"] == 2 and b5["selisih"]["gempa"] == 1 and b5["gempa"][0]["laporan"] == 2, "H9")
    bs = bersih_dampak([_r("2026-10-20", "Gempabumi", "72.01", 3, rr_berat=4)])[0]
    ep = peristiwa(bs, [], "gempa")
    ok(len(ep) == 3 and sum(e["dampak"]["rr_berat"] for e in ep) == 4, "baris kejadian 3: dampak sekali")
    ok(status_gunung({"level": {"Ibu": 3}})["level_3"] == ["Ibu"], "gunung tanpa tanggal")
    u = usulan("bulanan", "2026-10", {"jenis": {"gempa": {"dampak": {"rumah_rusak": 0}}}}, {"status": "ok"}, {"banjir": {"status": None}},
               {"gunungapi": status_gunung({"level": {"Ibu": 3}})}, {"enso": {"nilai": 1.9749, "golongan": "di atas ambang El Niño", "musim": "ASO"}})
    ok(any(x["kode"] == "T4" and " per " not in x["kalimat"] for x in u) and any(x["kode"] == "T7" and "1,97" in x["kalimat"] for x in u), "T4 tanpa tanggal, T7 dua desimal")
    # H10 gunung api 0/3/24/42
    lv = {f"G{i}": 1 for i in range(42)} | {f"W{i}": 2 for i in range(24)} | {"Lewotobi Laki-laki": 3, "Semeru": 3, "Ibu": 3}
    s = status_gunung({"tanggal": "2026-11-01", "level": lv})
    ok(s["per_level"] == {"1": 42, "2": 24, "3": 3, "4": 0} and s["level_3"] == ["Ibu", "Lewotobi Laki-laki", "Semeru"], "H10")
    ok(status_gunung(None) is None, "gunung tanpa data")

    # H14 peluang tinggi: 5 dari 9 tahun penuh masuk, 4 dari 9 tidak; B+1 dan B+2 lintas tahun
    ada = lambda nov, des: [0] * 10 + [nov, des]
    rw = {"dibuat": "2026-11-01T11:44:52+00:00", "tahun_penuh": [str(t) for t in (2014, 2015, 2016, 2017, 2018, 2019, 2020, 2024, 2025)],
          "kab": {"11|Aceh Barat": {"tahun_ada": {"banjir": ada(5, 4), "longsor": ada(5, 0)}}, "12|Nias": {"tahun_ada": {"banjir": ada(4, 9)}},
                  "13|Agam": {"tahun_ada": {"karhutla": ada(9, 9)}}}}
    b7, s7 = bab7("bulanan", "2026-10", {"riwayat": rw})
    nov, des = b7["peluang"]["bulan"]
    ok(nov["bulan"] == "2026-11" and nov["banjir"]["kab_n"] == 1 and nov["banjir"]["kab"][0] == {"prov_kode": "11", "nama": "Aceh Barat", "tahun": 5}
       and nov["longsor"]["kab_n"] == 1 and nov["gabung_n"] == 1, f"H14 {nov}")
    ok(des["bulan"] == "2026-12" and des["banjir"]["kab_n"] == 1 and des["banjir"]["kab"][0]["nama"] == "Nias" and des["longsor"]["kab_n"] == 0, "H14 Desember")
    ok(peluang_bulan(rw, "2027-01")["gabung_n"] == 0 and bab7("bulanan", "2026-12", {"riwayat": rw})[0]["peluang"]["bulan"][0]["bulan"] == "2027-01", "B+1 lintas tahun")
    ok(b7["peluang"]["mutu"] == "hipotesis" and s7["status"] == "ok" and s7["tahun_penuh"][0] == 2014 and s7["tarik"] == "2026-11-01", "peluang hipotesis")
    b7, s7 = bab7("bulanan", "2026-10", {})
    ok(b7["peluang"] == {"status": "belum_ada"} and b7["enso"] == {"status": "belum_ada"} and s7["status"] == "belum_ada" and BUKAN_BMKG in b7["catatan"], "tanpa riwayat bukan 0")
    # ALGORITMA 6 hujan B+1: hanya tampil, fit tidak lulus = hipotesis; tanpa butir = belum_ada
    ik = {"dibuat": "2026-11-09T07:10+07:00", "wilayah": {"jawa": {"nama": "Jawa"}, "papua": {"nama": "Papua"}, "maluku": {"nama": "Maluku"}},
          "keadaan_sekarang": {"roni": {"musim": "ASO", "tahun": 2026, "nilai": 1.97}},
          "fit": {"OND": {"jawa": {"lulus": True}, "papua": {"lulus": False}}},
          "prakiraan": [{"musim": "OND", "tahun": 2026, "bulan_tengah": "2026-11", "label": "Okt 2026 - Des 2026", "horizon_bulan": 1, "ekstrapolasi": False,
                         "di_luar_rentang": False, "jenis_pendorong": "persistensi", "pendorong": {"roni": 1.97, "dmi": 0.6},
                         "wilayah": {"jawa": {"anom_pct": -49.3, "p10": -80.0, "p90": -18.0, "tampil": True}, "papua": {"anom_pct": -30.0, "p10": -50.0, "p90": -10.0, "tampil": True},
                                     "maluku": {"anom_pct": -43.3, "p10": -70.0, "p90": -16.0, "tampil": False}}}]}
    h, sh = hujan_depan("2026-10", ik)
    ok(h["status"] == "ok" and [w["kode"] for w in h["wilayah"]] == ["jawa", "papua"] and h["tidak_tampil"] == ["maluku"]
       and h["wilayah"][0]["mutu"] == "uji_balik_lulus" and h["wilayah"][1]["mutu"] == "hipotesis" and sh == {"tarik": "2026-11-09", "terbit": "2026-11-09", "status": "ok"}, f"hujan {h}")
    ok(hujan_depan("2026-11", ik)[0] == {"status": "belum_ada", "bulan_tengah": "2026-12"} and hujan_depan("2026-10", None)[1]["status"] == "belum_ada", "hujan tanpa butir")
    e = enso(ik)
    ok(e["nilai"] == 1.97 and e["golongan"] == "di atas ambang El Niño" and enso({"keadaan_sekarang": {"roni": {"nilai": -0.5}}})["golongan"] == "di bawah ambang La Niña"
       and enso({"keadaan_sekarang": {"roni": {"nilai": 0.49}}})["golongan"] == "netral", "ENSO ambang CPC")
    u = usulan("bulanan", "2026-10", {"jenis": {"gempa": {"dampak": {"rumah_rusak": 0}}}}, {"status": "ok"}, {"banjir": {"status": None}}, {},
               {"peluang": {"kab_tinggi": 57, "bulan": "2026-11"}, "enso": {k: e[k] for k in ("nilai", "golongan", "musim", "tahun")}})
    t6, t7 = (next(x for x in u if x["kode"] == k) for k in ("T6", "T7"))
    ok("57 kab/kota" in t6["kalimat"] and "November 2026" in t6["kalimat"] and "hipotesis" in t6["kalimat"] and BUKAN_BMKG in t6["kalimat"], t6["kalimat"])
    ok(t7["kalimat"] == "Indeks Pasifik (RONI) ASO 2026 bernilai 1,97, di atas ambang El Niño.", t7["kalimat"])

    # H11 usulan T2, dan berkas angka utuh dari fixture
    m = json.load(open(os.path.join(FIX, "masukan_bulanan.json")))
    ba = berkas_angka("bulanan", "2026-10", m, hari_ini=hi, dirakit=m["dirakit"])
    kode_u = [u["kode"] for u in ba["usulan_temuan"]]
    t2 = next(u for u in ba["usulan_temuan"] if u["kode"] == "T2")
    ok("T2" in kode_u and t2["angka"]["provinsi"] >= 1 and t2["sumber"], f"H11 {kode_u}")
    ok(all("aman" not in u["kalimat"].lower() for u in ba["usulan_temuan"]), "tanpa kata aman")
    for bab, ks in WAJIB["bulanan"].items():
        ok(all(k in ba[bab] for k in ks), f"kunci wajib {bab}")
    ok(ba["bab1"]["tahun_lalu"]["asal"] == "siklus_bersih" and ba["bab1"]["tahun_lalu"]["banding"]["kejadian"]["arah"] is not None, "Q3 tahun lalu dari lapis Siklus")
    ok(ba["bab1"]["riwayat"][0]["kejadian"] is None, "riwayat di luar cakupan DIBI = None")
    ok(ba["bab4"]["hujan"]["status"] == "ok" and ba["bab7"]["peluang"]["status"] == "ok" and {"T6", "T7"} <= set(kode_u), f"LB-04 dari fixture {kode_u}")
    try:
        berkas_angka("bulanan", "2026-11", m, hari_ini=hi)
        ok(False, "H13 berkas_angka")
    except KodeSalah:
        ok(True, "H13")

    # LB-11 harian dan mingguan dari fixture yang sama (D11: satu mesin, hanya varian periode)
    for per in ("harian", "mingguan"):
        mx = masukan(per)
        ba = berkas_angka(per, mx["kode"], mx, hari_ini=hi, dirakit=mx["dirakit"])
        for bab, ks in WAJIB[per].items():
            ok(all(k in ba[bab] for k in ks), f"kunci wajib {per} {bab}: {[k for k in ks if k not in ba[bab]]}")
        ok("bab7" not in ba and "hujan" not in ba["bab4"], f"{per}: tanpa Bab 7 dan hujan tiga bulan (bulanan saja)")
        ok(ba["prakiraan"]["status"] == "ok", f"{per} prakiraan {ba['prakiraan']}")
        ok(len(ba["bab1"]["riwayat"]) == RIWAYAT[per] and ba["bab1"]["riwayat"][-1]["kode"] == mx["kode"], f"{per} riwayat")
        teks = json.dumps(ba, ensure_ascii=False).lower()
        ok(not re.search(r"\baman\b", teks), f"{per}: tanpa kata aman")
    # harian: puncak tidak dihitung, tanpa usulan, kejadian menonjol, perubahan level hari itu saja
    mx = masukan("harian")
    ba = berkas_angka("harian", "2026-10-31", mx, hari_ini=hi, dirakit=mx["dirakit"])
    ok(ba["bab2"]["puncak"] is None and ba["bab2"]["turun_dari_puncak"] is None and ba["usulan_temuan"] == [], "harian tanpa puncak dan usulan")
    ok([x["gunung"] for x in ba["bab5"]["perubahan_level"]] == ["Dieng"], f"perubahan level hari itu {ba['bab5']['perubahan_level']}")
    ok(len(ba["bab1"]["menonjol"]) <= N_MENONJOL and all(k["jenis"] in JENIS for k in ba["bab1"]["menonjol"]), "menonjol bencana alam")
    # H17 prediksi.json +1 apa adanya: label dan jiwa sama dengan masukan, tenggang 2 tidak ikut, tanpa kata aman
    pk = ba["prakiraan"]
    asap = next(e for e in pk["aturan"] if e["aturan"] == "asap")
    ok(pk["untuk"] == "2026-11-02" and pk["terbit"] == "2026-11-01" and asap["maka"] == "Imbauan masker; sekolah kurangi kegiatan luar ruang"
       and asap["kab_n"] == 2 and [k["jiwa"] for k in asap["kab"]] == [1123348, 692793] and pk["aturan"][0]["aturan"] == "asap", f"H17 {pk}")
    ok(not any(e["aturan"] == "longsor" for e in pk["aturan"]) and ba["sumber"]["prakiraan_besok"]["status"] == "ok" and pk["label"] == LABEL_KITA, "H17 tenggang +1 saja")
    ok(prakiraan_besok("2026-10-20", mx["prediksi"])[0]["status"] == "basi" and prakiraan_besok("2026-10-31", None)[0] == {"status": "belum_tersedia"}, "H17 basi, tanpa berkas")
    # H17 tanggal target: hari[0] = a+1 atau a+2 ok; a+3 dan a basi (berkas yang sama untuk 2026-11-02)
    ok([prakiraan_besok(k, mx["prediksi"])[0]["status"] for k in ("2026-10-30", "2026-10-31", "2026-11-01", "2026-11-02")] == ["basi", "ok", "ok", "basi"], "H17 tanggal target")
    ok(prakiraan_besok("2026-11-01", mx["prediksi"])[0]["untuk"] == "2026-11-02", "H17 untuk = hari[0]")
    # H18 tangga.json tidak ada: belum_tersedia, rakit tidak gagal; ada: BMKG dan kita terpisah
    mw = masukan("mingguan")
    ba = berkas_angka("mingguan", "2026-W43", {k: v for k, v in mw.items() if k != "tangga"}, hari_ini=hi, dirakit=mw["dirakit"])
    ok(ba["prakiraan"] == {"status": "belum_tersedia"} and ba["sumber"]["prakiraan_sepekan"]["status"] == "belum_ada", "H18")
    ba = berkas_angka("mingguan", "2026-W43", mw, hari_ini=hi, dirakit=mw["dirakit"])
    sp = ba["prakiraan"]
    bm = {e["sumber"]: e for e in sp["bmkg"]}
    ok(set(bm) == {"karhutla", "sepekan"} and bm["sepekan"]["pernyataan"][0]["label"] == "Siaga (hujan lebat)" and bm["sepekan"]["lembaga"] == "BMKG"
       and bm["karhutla"]["nama"] == "Factsheet monitoring dan potensi karhutla" and bm["karhutla"]["terbit"] == "2026-10-26"
       and bm["sepekan"]["pernyataan"][0]["masa"] == "26 Okt sampai 1 Nov" and bm["karhutla"]["pernyataan"][0]["kode"] == "14", f"BMKG per sumber {sp['bmkg']}")
    ok({e["label"]: e["kab_n"] for e in sp["kita"]["ringkas"]} == {"Ada hari hujan": 2, "2 hari tanpa hujan": 1}, f"kita hanya jenis kita {sp['kita']}")
    ok(prakiraan_sepekan("2026-W42", mw["tangga"])[0]["status"] == "basi", "sepekan basi")
    ok([x["gunung"] for x in ba["bab5"]["perubahan_level"]] == ["Lewotobi Laki-laki"], "perubahan level selama minggu")
    ok(ba["bab2"]["puncak"] is not None and ba["bab1"]["sebelumnya"]["kode"] == "2026-W42", "mingguan: puncak harian, minggu sebelumnya")
    # H21 rerata 7 hari sebelum kode, tidak termasuk hari itu
    rs = [_r(f"2026-10-{d:02d}", "Banjir", "12.01", d) for d in range(1, 11)]
    a1 = rentang("harian", "2026-10-10")[0]
    g10 = agregat(bersih_dampak(pilih(rs, a1, a1))[0])
    r7 = rerata_7(_dibi(rs), a1, g10)
    ok(r7["dari"] == "2026-10-03" and r7["sampai"] == "2026-10-09" and r7["alam"] == bulat(Decimal(sum(range(3, 10))) / 7) == 6.0
       and r7["banding"]["arah"] == "naik" and r7["banding"]["persen"] == 66.7, f"H21 {r7}")
    ok(rerata_7(_dibi(rs, dari="2026-10-05"), a1, g10)["alam"] is None, "H21 tanpa 7 hari penuh = None")
    bh = berkas_angka("harian", "2026-10-31", masukan("harian"), hari_ini=hi, dirakit="x")["bab1"]
    ok(bh["sebelumnya"]["banding"]["status"] == bh["rerata_7"]["banding"]["status"] == "sementara", "Q26 banding harian sementara")
    hk = {f"2026-10-{d:02d}": {"14": {"hot": d}} for d in range(1, 11)}
    b2, _ = bab2("harian", "2026-10-10", {"karhutla": {"hari": hk}}, {"prov": []})
    ok(b2["rerata_7"]["hot"] == 6.0 and b2["sebelumnya"]["hot"] == 9 and b2["hot"] == 10, f"H21 hotspot {b2['rerata_7']}")
    hk["2026-10-05"]["15"] = {"hot": None}
    b2, _ = bab2("harian", "2026-10-10", {"karhutla": {"hari": hk}}, {"prov": []})
    ok(b2["rerata_7"]["hot"] is None and b2["rerata_7"]["banding"]["arah"] is None, "hot None di satu hari: rerata None, bukan 0")
    print(f"hitung.py uji: {n} pemeriksaan lulus")


def masukan(periode):
    """masukan fixture: bulanan apa adanya, harian dan mingguan = bulanan + masukan_ringkas.json (satu sumber fixture, D11)."""
    m = json.load(open(os.path.join(FIX, "masukan_bulanan.json")))
    if periode != "bulanan":
        r = json.load(open(os.path.join(FIX, "masukan_ringkas.json")))
        m |= {"periode": periode, **r[periode], **{k: r[k] for k in ("perubahan_level", "prediksi", "tangga")}}
    return m


def main(a):
    if a[:1] == ["uji"]:
        return uji()
    if a[:1] == ["cetak"] and len(a) == 2:
        m = masukan(a[1]) if a[1] in PERIODE else json.load(open(a[1]))
        json.dump(berkas_angka(m.get("periode", "bulanan"), m["kode"], m, hari_ini=dt.date.fromisoformat(m["hari_ini"]), dirakit=m.get("dirakit")),
                  sys.stdout, ensure_ascii=False, sort_keys=True)
        return
    if a[:1] == ["fixture"]:
        for per in ("harian", "mingguan", "bulanan"):
            m = masukan(per)
            ba = berkas_angka(per, m["kode"], m, hari_ini=dt.date.fromisoformat(m["hari_ini"]), dirakit=m["dirakit"])
            with open(os.path.join(FIX, f"angka_{per}.json"), "w") as f:
                json.dump(ba, f, ensure_ascii=False, sort_keys=True, indent=1)
                f.write("\n")
        return
    sys.exit(__doc__)


if __name__ == "__main__":
    main(sys.argv[1:])
