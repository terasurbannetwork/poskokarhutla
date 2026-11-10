"""Satu kunci kejadian lintas sumber: (jenis bersama, kabupaten, tanggal) + pemasangan dalam jendela hari.

Dipakai rekonsiliasi_dalops_dibi.py dan inarisk_vs_kejadian.py. Sumber baru (MAGMA, PVMBG, dst) cukup memanggil
`daftarkan_jenis("magma", {...})` lalu memberi daftar rekaman; kode inti tidak diubah.

Rekaman = dict {"id", "jenis" (nama sumber), "kab" (kunci 'PP|nama di peta' dari kab_kunci), "tgl" (date), "nilai": {...}}.
Satuan banding = (jenis, kab, hari): rekaman kembar sehari digabung (`satuan`), sebab DIBI menggabung baris kembar dan
membagi satu kejadian lintas kabupaten (jumlah_kejadian 0,5), jadi menghitung "kejadian" langsung tidak sebanding.

Pemasangan SATU-SATU: pasangan kandidat (jenis sama, kab sama, selisih hari <= jendela) diurut dari selisih terkecil,
ditarik rakus; tiap rekaman paling banyak satu pasangan. Selisih hari = tgl kanan - tgl kiri.

Pakai: python3 scripts/bnpb/kunci_kejadian.py --cek
"""
import datetime as dt, importlib.util, os, sys
from collections import defaultdict

AB = os.path.dirname(os.path.abspath(__file__))
AKAR = os.path.normpath(os.path.join(AB, "../.."))


def _muat(nama, rel):
    s = importlib.util.spec_from_file_location(nama, os.path.join(AKAR, rel))
    m = importlib.util.module_from_spec(s)
    s.loader.exec_module(m)
    return m


K = _muat("umum_kejadian", "scripts/umum/kejadian.py")      # cari_kab, kab_geo (satu pengode wilayah dengan logbook_bersih)
LB = _muat("logbook_bersih", "scripts/data/logbook_bersih.py")  # ALIAS_KAB (salah ketik/nama lama), nama_unik

# ---------------------------------------------------------------- jenis: nama sumber -> kunci bersama (tuple; >1 = ikut dua jenis)
JENIS = {
    "dibi": {
        "Banjir": ("banjir",), "Banjir Bandang": ("banjir",), "Banjir Rob": ("banjir",), "Banjir Genangan": ("banjir",),
        "Banjir Lahar (Lahar)": ("banjir",), "Banjir dan Tanah Longsor": ("banjir", "longsor"),
        "Tanah Longsor": ("longsor",), "Gerakan Tanah": ("longsor",),
        "Cuaca Ekstrem": ("cuaca",), "Puting Beliung": ("cuaca",), "Angin Kencang": ("cuaca",), "Angin Topan": ("cuaca",),
        "Kekeringan": ("kekeringan",), "Kekeringan Pertanian": ("kekeringan",),
        "Kebakaran Hutan dan Lahan": ("karhutla",), "Kebakaran Lahan": ("karhutla",), "Kebakaran Hutan": ("karhutla",),
        "Kebakaran Lahan Gambut": ("karhutla",),
        "Gempabumi": ("gempa",), "Gempa Bumi dan Tsunami": ("gempa",), "Gempabumi Reruntuhan": ("gempa",),
        "Erupsi Gunung Api": ("gunungapi",), "Tsunami": ("tsunami",),
        "Gelombang Pasang / Abrasi": ("gelombang",), "Gelombang Pasang": ("gelombang",), "Abrasi Pantai": ("gelombang",),
        "Kebakaran Gedung dan Permukiman": ("kebakaran_permukiman",),
    },
    "dalops": {
        "banjir": ("banjir",), "longsor": ("longsor",), "cuaca": ("cuaca",), "kekeringan": ("kekeringan",),
        "karhutla": ("karhutla",), "gempabumi": ("gempa",), "gunungapi": ("gunungapi",), "tsunami": ("tsunami",),
        "gelombang_pasang": ("gelombang",), "kebakaran_permukiman": ("kebakaran_permukiman",),
    },
}


def daftarkan_jenis(sumber, peta):
    """Sumber baru: {nama jenis di sumber: (kunci bersama, ...)}. Kunci bersama yang belum dikenal diterima apa adanya."""
    JENIS.setdefault(sumber, {}).update({k: tuple(v) for k, v in peta.items()})


def kunci_jenis(sumber, nama):
    """-> tuple kunci bersama; () bila jenis tak dibandingkan (lainnya, kecelakaan, omc, wabah, ...)."""
    return JENIS.get(sumber, {}).get((nama or "").strip(), ())


# ---------------------------------------------------------------- kabupaten
def _bersih(s):
    s = s.strip()
    s = s[4:] if s.startswith("Kab.") else s
    return "".join(c for c in s.lower() if c.isalnum())


ALIAS_DIBI = {"Pangkajene Dan Kepulauan": "Pangkajene Kepulauan", "Kab. Kepulauan Seribu": "Administrasi Kepulauan Seribu",
              "Kab. Pangkajene": "Pangkajene Kepulauan"}   # ejaan DIBI yang bukan singkatan; tambah di sini bila nama baru gagal


def _ejaan(n):
    """Singkatan DIBI: 'Kota Adm. Jakarta Timur', 'Adm. Kep. Seribu', 'Kep. Siau ...' -> ejaan peta."""
    n = ALIAS_DIBI.get(n, n)
    return " ".join({"Adm.": "Administrasi", "Kep.": "Kepulauan"}.get(w, w) for w in n.split())


def kab_kunci(nama, prov):
    """Nama bebas ('Kab. Aceh Selatan', 'Kota Bogor', 'Bogor') + kode provinsi 2 digit -> 'PP|nama di peta' atau None.
    Urutan: alias salah ketik -> cocok di provinsinya -> nama yang tunggal se-Indonesia (kode provinsi lama/pemekaran Papua).
    'Kab. X' dan 'Kota X' TIDAK disamakan; nama ganda antar provinsi tanpa provinsi yang cocok = None (tidak ditebak)."""
    if not nama or not nama.strip():
        return None
    for n in dict.fromkeys((nama.strip(), _ejaan(nama.strip()))):
        n = LB.ALIAS_KAB.get(n, n)
        k = (K.cari_kab(AKAR, n, str(prov)) if prov else None) or LB.nama_unik(n)
        if k:
            return k
    return None


# ---------------------------------------------------------------- satuan banding
def tgl_iso(s):
    return s if isinstance(s, dt.date) else dt.date.fromisoformat(s[:10])


def satuan(rekaman):
    """Gabung rekaman kembar (jenis, kab, hari sama) -> daftar; nilai dijumlah, id digabung, n_asal = jumlah rekaman asal."""
    g = {}
    for r in rekaman:
        k = (r["jenis"], r["kab"], r["tgl"])
        if k not in g:
            g[k] = {"id": [r["id"]], "jenis": r["jenis"], "kab": r["kab"], "tgl": r["tgl"], "nilai": dict(r.get("nilai") or {}), "n_asal": 1}
        else:
            e = g[k]
            e["id"].append(r["id"])
            e["n_asal"] += 1
            for m, v in (r.get("nilai") or {}).items():
                e["nilai"][m] = (e["nilai"].get(m) or 0) + (v or 0)
    return list(g.values())


def pasangkan(kiri, kanan, jendela=3):
    """-> (pasangan [(i, j, selisih_hari)], tunggal_kiri [i], tunggal_kanan [j]). 'jenis' rekaman: tuple kunci bersama (atau str)."""
    kunci = lambda r: (r["jenis"],) if isinstance(r["jenis"], str) else tuple(r["jenis"])
    peta = defaultdict(list)  # (jenis, kab) -> [j]
    for j, r in enumerate(kanan):
        if r["kab"]:
            for jn in kunci(r):
                peta[(jn, r["kab"])].append(j)
    cand = set()
    for i, r in enumerate(kiri):
        if not r["kab"]:
            continue
        for jn in kunci(r):
            for j in peta.get((jn, r["kab"]), ()):
                d = (tgl_iso(kanan[j]["tgl"]) - tgl_iso(r["tgl"])).days
                if abs(d) <= jendela:
                    cand.add((abs(d), i, j, d))
    pakai_i, pakai_j, pas = set(), set(), []
    for _, i, j, d in sorted(cand):
        if i not in pakai_i and j not in pakai_j:
            pakai_i.add(i)
            pakai_j.add(j)
            pas.append((i, j, d))
    return pas, [i for i in range(len(kiri)) if i not in pakai_i], [j for j in range(len(kanan)) if j not in pakai_j]


def gabung(sumber, jendela=3):
    """Banyak sumber {nama: [rekaman]} (urutan = prioritas jangkar) -> gugus [{nama: rekaman}], tiap gugus paling banyak satu rekaman per sumber.
    Sumber berikut dipasangkan ke jangkar gugus (rekaman pertama gugus); sumber baru tidak mengubah kode ini."""
    gugus = []
    for nama, recs in sumber.items():
        jangkar = [next(iter(g.values())) for g in gugus]
        pas, _, tunggal = pasangkan(jangkar, recs, jendela)
        for i, j, _ in pas:
            gugus[i][nama] = recs[j]
        gugus += [{nama: recs[j]} for j in tunggal]
    return gugus


# ---------------------------------------------------------------- self-check
def cek():
    R = lambda i, jn, kab, t, **n: {"id": i, "jenis": jn, "kab": kab, "tgl": t, "nilai": n}
    # sama: jenis, kab, tanggal sama -> satu pasangan selisih 0
    p, tk, tn = pasangkan([R("a", ("banjir",), "32|Bogor", "2020-01-01")], [R("b", ("banjir",), "32|Bogor", "2020-01-01")])
    assert p == [(0, 0, 0)] and not tk and not tn
    # beda kabupaten (Kab. Bogor vs Kota Bogor): TIDAK cocok
    p, tk, tn = pasangkan([R("a", ("banjir",), "32|Bogor", "2020-01-01")], [R("b", ("banjir",), "32|Kota Bogor", "2020-01-01")])
    assert p == [] and tk == [0] and tn == [0]
    # beda jenis tidak cocok; jendela 3 hari masuk, 4 hari keluar
    assert pasangkan([R("a", ("longsor",), "k", "2020-01-01")], [R("b", ("banjir",), "k", "2020-01-01")])[0] == []
    assert pasangkan([R("a", ("banjir",), "k", "2020-01-01")], [R("b", ("banjir",), "k", "2020-01-04")])[0] == [(0, 0, 3)]
    assert pasangkan([R("a", ("banjir",), "k", "2020-01-01")], [R("b", ("banjir",), "k", "2020-01-05")])[0] == []
    # satu-satu: dua kiri, satu kanan -> yang selisihnya terkecil menang, satunya tunggal
    p, tk, tn = pasangkan([R("a1", ("banjir",), "k", "2020-01-01"), R("a2", ("banjir",), "k", "2020-01-03")], [R("b", ("banjir",), "k", "2020-01-04")])
    assert p == [(1, 0, 1)] and tk == [0]
    # banjir dan longsor sekaligus: cocok dengan longsor kiri, dan hanya sekali
    p, _, _ = pasangkan([R("a", ("longsor",), "k", "2020-01-01")], [R("b", ("banjir", "longsor"), "k", "2020-01-02")])
    assert p == [(0, 0, 1)]
    # kab kosong tidak pernah cocok dengan kab kosong
    assert pasangkan([R("a", ("banjir",), None, "2020-01-01")], [R("b", ("banjir",), None, "2020-01-01")])[0] == []
    # satuan: kembar sehari digabung
    s = satuan([R("a", ("banjir",), "k", "2020-01-01", md=1), R("b", ("banjir",), "k", "2020-01-01", md=2), R("c", ("banjir",), "k", "2020-01-02", md=5)])
    assert len(s) == 2 and s[0]["nilai"]["md"] == 3 and s[0]["n_asal"] == 2
    # tiga sumber: sumber baru ikut tanpa ubah kode
    daftarkan_jenis("magma", {"Erupsi": ("gunungapi",)})
    assert kunci_jenis("magma", "Erupsi") == ("gunungapi",) and kunci_jenis("dibi", "Banjir dan Tanah Longsor") == ("banjir", "longsor")
    assert kunci_jenis("dalops", "kecelakaan") == () and kunci_jenis("dibi", " Gempabumi ") == ("gempa",)
    g = gabung({"dalops": [R("d", ("gunungapi",), "k", "2020-01-01")], "dibi": [R("b", ("gunungapi",), "k", "2020-01-02")],
                "magma": [R("m", ("gunungapi",), "k", "2020-01-03"), R("m2", ("gunungapi",), "z", "2020-01-03")]})
    assert len(g) == 2 and set(g[0]) == {"dalops", "dibi", "magma"} and set(g[1]) == {"magma"}
    # nama kabupaten: ejaan sama dengan peta, alias, Kab./Kota dibedakan, nama ganda antar provinsi tidak ditebak
    assert kab_kunci("Kab. Aceh Selatan", "11") == "11|Aceh Selatan"
    assert kab_kunci("Aceh Selatan", "11") == "11|Aceh Selatan"
    assert kab_kunci("Kab. Bireun", "11") == "11|Bireuen"          # alias salah ketik
    assert kab_kunci("Kota Bogor", "32") == "32|Kota Bogor" and kab_kunci("Kab. Bogor", "32") == "32|Bogor"
    assert kab_kunci("Kab. Bogor", "32") != kab_kunci("Kota Bogor", "32")
    assert kab_kunci("Kota Adm. Jakarta Timur", "31") == "31|Kota Administrasi Jakarta Timur"   # singkatan DIBI
    assert kab_kunci("Adm. Kep. Seribu", "31") == "31|Administrasi Kepulauan Seribu" and kab_kunci("Pangkajene Dan Kepulauan", "73") == "73|Pangkajene Kepulauan"
    assert kab_kunci("Kep. Siau Tagulandang Biaro", "71") == "71|Kepulauan Siau Tagulandang Biaro"
    assert kab_kunci("", "32") is None and kab_kunci("Negeri Antah Berantah", "32") is None
    ganda = defaultdict(list)
    for k in K.kab_geo(AKAR):
        ganda[_bersih(k[3:])].append(k)
    dua = next((v for v in ganda.values() if len(v) > 1 and not v[0][3:].startswith("Kota")), None)
    if dua:  # nama sama di dua provinsi: tanpa provinsi yang cocok = None, dengan provinsi = tepat satu
        nm = dua[0][3:]
        assert kab_kunci(nm, "") is None and kab_kunci(nm, dua[0][:2]) == dua[0] and kab_kunci(nm, dua[1][:2]) == dua[1]
    print("kunci_kejadian.py --cek hijau")


if __name__ == "__main__":
    cek() if "--cek" in sys.argv else print(__doc__)
