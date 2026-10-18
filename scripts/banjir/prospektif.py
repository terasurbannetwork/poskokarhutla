"""Catatan prospektif prakiraan harian, append-only -> public/banjir/data/prospektif.json

Tiap hari, sesudah status.py, satu entri "tanggal terbit": untuk 4 hari ke depan (waktu-tunda 0..3) level banjir dan longsor
tertinggi per kabupaten (satuan yang sama dengan DIBI dan uji_balik.py) plus peluang Siaga jalur hujan tertinggi di kabupaten itu:
  {"versi": 1, "n_kab": 514, "terbit": {"2026-10-18": {"hari": [4 tanggal], "kab": {"prov|kab": [[lb, ll, psb, psl] x 4]}}}}
  lb/ll = level 0..3; psb/psl = peluang % mencapai >= Siaga (None bila ansambel tak ada). Kabupaten yang tak tertulis = Normal
  dan peluang Siaga < 10% (berkas hanya memuat kabupaten yang bernilai).
Ini satu-satunya cara mengukur ketepatan prakiraan NYATA per waktu-tunda: uji_balik.py memakai hujan ERA5 sempurna, jadi semua
waktu-tunda identik di sana. Saat DIBI terbit, `python3 scripts/banjir/prospektif.py nilai` menilai entri yang tanggal targetnya
sudah tercakup DIBI (POD/FAR/CSI >= Siaga per waktu-tunda); belum ada entri yang tercakup = n 0, bukan angka karangan.
Aturan: berkas tidak pernah menyusut dan entri TIDAK PERNAH diubah: jalan ulang di hari yang sama tidak menimpa (prakiraan pertama
hari itu yang dinilai, bukan yang paling mujur). Berkas rusak = berhenti. Berkas hilang padahal tercatat di git = berhenti
(tidak memulai log baru diam-diam). `periksa` menolak tulisan yang menghilangkan/mengubah entri lama.
Catatan hanya memuat kabupaten berstatus atau berpeluang Siaga >= 10%, jadi peluang kabupaten lain tidak tercatat: kalibrasi
peluang (apakah 30% berarti 30%) BELUM bisa dinilai dari berkas ini; yang bisa dinilai hanya status deterministik per waktu-tunda.
DIBI terlambat terbit/terisi: `nilai` hanya memakai tanggal sasaran sampai (tanggal DIBI terakhir - MARGIN_DIBI hari).
Pakai:  python3 scripts/banjir/prospektif.py   |   ... nilai   |   ... uji
"""
import datetime as dt, json, os, subprocess, sys
from collections import defaultdict

sys.path.insert(0, os.path.dirname(__file__))
from umum import KELUAR, MENTAH, baca, simpan

JALUR = os.path.join(KELUAR, "prospektif.json")
SIAGA = 2
MIN_P = 10  # kabupaten dengan peluang Siaga di bawah ini dan level 0 tidak dicatat
MARGIN_DIBI = 14  # hari: kejadian DIBI dilaporkan menyusul; tanggal terakhir DIBI belum lengkap, jadi tidak dinilai


def entri(st, pra, n_kab):
    """status.json + prakiraan72.json -> entri satu tanggal terbit."""
    kab = defaultdict(lambda: [[0, 0, None, None] for _ in st["hari"]])
    for k, v in st["kec"].items():
        kb = kab["|".join(k.split("|")[:2])]
        for d in range(len(st["hari"])):
            kb[d][0], kb[d][1] = max(kb[d][0], v["b"][d]), max(kb[d][1], v["l"][d])
    for k, v in pra.get("kec", {}).items():
        if "pb" not in v:
            continue
        kb = kab["|".join(k.split("|")[:2])]
        for d in range(len(st["hari"])):
            for i, q in ((2, "pb"), (3, "pl")):
                kb[d][i] = max(kb[d][i] or 0, v[q][d][1])
    ada = pra.get("anggota") is not None
    keep = {k: [[a, b, c if ada else None, e if ada else None] for a, b, c, e in v] for k, v in kab.items()
            if any(a or b or (c or 0) >= MIN_P or (e or 0) >= MIN_P for a, b, c, e in v)}
    return {"hari": st["hari"], "kab": keep}


def periksa(lama, baru):
    """Menolak tulisan yang menyusutkan/mengubah catatan. lama/baru = isi berkas."""
    if lama is None:
        return
    for t, e in lama["terbit"].items():
        if t not in baru["terbit"]:
            raise ValueError(f"entri {t} hilang: berkas prospektif tidak boleh menyusut")
        if baru["terbit"][t] != e:
            raise ValueError(f"entri {t} berubah: catatan prospektif tidak pernah diubah")
    if baru["n_kab"] < 1:
        raise ValueError("n_kab kosong")


def tambah(log, tgl, e, n_kab):
    baru = json.loads(json.dumps(log))
    if tgl in baru["terbit"] or (baru["terbit"] and tgl < max(baru["terbit"])):
        return None  # sudah tercatat atau mundur: tidak dicatat, tidak ditimpa
    baru["terbit"][tgl], baru["n_kab"] = e, n_kab
    periksa(log, baru)
    return baru


def nilai(log, baris):
    """Penilaian >= Siaga banjir per waktu-tunda terhadap DIBI. baris = dibi_tanggal.json [jenis, prov, kab, tanggal, n].
    Hanya target <= (tanggal DIBI terakhir - MARGIN_DIBI hari) yang dinilai. -> {tunda: {n_hari, a, b, c, d, pod, far, csi}}"""
    ev = {(f"{p}|{kb}", tgl) for jenis, p, kb, tgl, n in baris if n >= 1 and {"banjir", "bandang"} & set(jenis)}
    akhir = str(dt.date.fromisoformat(max(r[3] for r in baris)) - dt.timedelta(days=MARGIN_DIBI)) if baris else ""
    out = {}
    for tunda in range(4):
        a = b = c = d = hari = 0
        for t, e in log["terbit"].items():
            if len(e["hari"]) <= tunda or e["hari"][tunda] > akhir:
                continue
            tgt, hari = e["hari"][tunda], hari + 1
            ramal = {k for k, v in e["kab"].items() if v[tunda][0] >= SIAGA}
            kena = {k for k, x in ev if x == tgt}
            a, b, c = a + len(ramal & kena), b + len(ramal - kena), c + len(kena - ramal)
            d += log["n_kab"] - len(ramal | kena)
        bagi = lambda x, y: round(x / y, 3) if y else None
        out[tunda] = {"n_hari": hari, "a": a, "b": b, "c": c, "d": d, "pod": bagi(a, a + c), "far": bagi(b, a + b), "csi": bagi(a, a + b + c)}
    return out


def tercatat_git():
    """True bila prospektif.json dilacak git (sudah pernah di-commit). Tanpa git/di luar repo: False."""
    try:
        return subprocess.run(["git", "ls-files", "--error-unmatch", JALUR], cwd=os.path.dirname(JALUR), capture_output=True).returncode == 0
    except OSError:
        return False


def main():
    st, pra = baca(os.path.join(KELUAR, "status.json")), baca(os.path.join(KELUAR, "prakiraan72.json"))
    hujan = baca(os.path.join(KELUAR, "hujan.json"))
    if not st or not pra or not hujan:
        sys.exit("status.json/prakiraan72.json/hujan.json belum ada")
    if st["hari"][0] != hujan["hari_ini"]:
        print(f"prospektif: status.json hari ke-0 {st['hari'][0]} bukan hari ini {hujan['hari_ini']}; tidak dicatat", file=sys.stderr)
        return
    try:
        lama = baca(JALUR)
    except ValueError as e:  # JSON rusak: jangan menimpa
        sys.exit(f"prospektif.json tidak terbaca ({e}); tidak ditimpa")
    if lama is None and tercatat_git():
        sys.exit("prospektif.json hilang padahal tercatat di git: pulihkan berkas (cache/checkout), tidak memulai log baru diam-diam")
    from bahaya import kecamatan
    n_kab = len({"|".join(k.split("|")[:2]) for k in kecamatan()})
    baru = tambah(lama or {"versi": 1, "n_kab": n_kab, "terbit": {}}, st["hari"][0], entri(st, pra, n_kab), n_kab)
    if baru is None:
        print(f"prospektif: {st['hari'][0]} sudah tercatat (atau mundur); tidak ditimpa", file=sys.stderr)
        return
    simpan(JALUR, baru)
    print(f"prospektif: {len(baru['terbit'])} tanggal terbit, {len(baru['terbit'][st['hari'][0]]['kab'])} kab dicatat hari ini", file=sys.stderr)


def main_nilai():
    log, baris = baca(JALUR), baca(os.path.join(MENTAH, "dibi_tanggal.json"))
    if not log or not baris:
        sys.exit("prospektif.json atau dibi_tanggal.json belum ada")
    for tunda, s in nilai(log, baris).items():
        print(f"tunda {tunda}: {s}")


def uji():
    st = {"hari": ["2026-01-01", "2026-01-02"], "kec": {"32|A|x": {"b": [2, 0], "l": [0, 1]}, "32|A|y": {"b": [3, 0], "l": [0, 0]}, "32|B|z": {"b": [0, 0], "l": [0, 0]}}}
    pra = {"anggota": 51, "kec": {"32|A|x": {"pb": [[50, 20, 0], [10, 5, 0]], "pl": [[0, 0, 0], [30, 12, 0]]}, "32|C|q": {"pb": [[60, 4, 0], [0, 0, 0]], "pl": [[0, 0, 0]] * 2}}}
    e = entri(st, pra, 3)
    assert e["kab"]["32|A"] == [[3, 0, 20, 0], [0, 1, 5, 12]] and "32|B" not in e["kab"] and "32|C" not in e["kab"], e  # C: peluang Siaga 4% < 10
    assert entri(st, {**pra, "anggota": None}, 3)["kab"]["32|A"][0][2] is None  # tanpa ansambel peluang tidak dikarang
    log = tambah({"versi": 1, "n_kab": 3, "terbit": {}}, "2026-01-01", e, 3)
    log2 = tambah(log, "2026-01-02", e, 3)
    assert list(log2["terbit"]) == ["2026-01-01", "2026-01-02"]
    assert tambah(log2, "2026-01-02", {"hari": [], "kab": {}}, 3) is None                                   # hari yang sama tidak ditimpa
    assert tambah(log2, "2026-01-01", e, 3) is None                                                         # mundur ditolak
    for rusak in ({**log2, "terbit": {"2026-01-02": log2["terbit"]["2026-01-02"]}},                         # menyusut
                  {**log2, "terbit": {**log2["terbit"], "2026-01-01": {"hari": [], "kab": {}}}}):           # lampau berubah
        try:
            periksa(log2, rusak)
            raise AssertionError("periksa menerima tulisan yang menyusutkan/mengubah catatan")
        except ValueError:
            pass
    # nilai: terbit 01-01, target 01-01 (tunda 0) dan 01-02 (tunda 1). DIBI terakhir 02-01 -> batas nilai 01-18: keduanya dinilai
    dibi = [[["banjir"], "32", "A", "2026-01-01", 1], [["longsor"], "32", "B", "2026-01-01", 5], [["banjir"], "32", "B", "2026-01-01", 1],
            [["banjir"], "32", "C", "2026-02-01", 1]]
    s = nilai(log, dibi)
    assert s[0]["a"] == 1 and s[0]["c"] == 1 and s[0]["b"] == 0 and s[0]["d"] == 1 and s[0]["pod"] == .5, s[0]
    assert s[1]["n_hari"] == 1 and s[1]["pod"] is None and s[1]["a"] == 0, s[1]
    # margin: DIBI hanya sampai 01-10 -> batas 12-27 tahun lalu, tak satu pun target dinilai (DIBI belum lengkap)
    assert all(x["n_hari"] == 0 for x in nilai(log, [[["banjir"], "32", "A", "2026-01-10", 1]]).values())
    assert MARGIN_DIBI == 14
    print("ok prospektif")


if __name__ == "__main__":
    {"uji": uji, "nilai": main_nilai}.get(sys.argv[1] if sys.argv[1:] else "", main)()
