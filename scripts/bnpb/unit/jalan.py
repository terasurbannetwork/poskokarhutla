"""Pelari pipeline Ruang Unit BNPB (DESAIN-TEKNIS sec 2.3, 9.4; tiket RU-021).

Satu-satunya pemanggil langkah sistem. Tiap langkah dibungkus try: satu gagal tidak
menghentikan yang lain, langkah gagal tidak menulis berkas (R2 mempertahankan versi
kemarin), keluaran atomik (.tmp lalu os.replace), dan indeks.json mencatat ok/galat.

Kontrak modul langkah: `unit.<modul>.jalan()` mengembalikan {nama_berkas: dict}
(nama tanpa .json). Modul boleh punya `cek()`; --cek menjalankannya lebih dulu.

  python3 -I scripts/bnpb/unit/jalan.py --cek
  python3 -I scripts/bnpb/unit/jalan.py harian [--mingguan] [--bulanan] [--keluar /tmp/unit]
"""
import importlib
import json
import os
import re
import sys
import tempfile
from datetime import datetime, timezone

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))  # -I tidak menaruh folder skrip

# (nama, modul, frekuensi); didaftarkan tiket sistem. Mula-mula kosong.
LANGKAH = []

BASI_JAM = {"harian": 48, "mingguan": 240, "bulanan": 1080}  # DT sec 9.4
KELUAR = "/tmp/unit"
NAMA_SAH = re.compile(r"^[a-z0-9_]+$")
RESERVED = {"indeks"}
# J3 (dicatat): dua proses jalan.py bersamaan ke folder yang sama tidak dilindungi kunci; di Actions satu proses per run.


def _satu_baris(e):
    return " ".join(f"{type(e).__name__}: {e}".split())[:300]


def _tulis_teks(path, teks):
    tmp = path + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        f.write(teks)
    os.replace(tmp, path)


def _tulis(path, data):
    _tulis_teks(path, json.dumps(data, ensure_ascii=False, separators=(",", ":")))


def _tulis_semua(keluar, teks_per_nama):
    """Tulis semua berkas langkah; gagal di tengah -> buang semua .tmp, lempar ulang."""
    try:
        for n, t in teks_per_nama.items():
            _tulis_teks(os.path.join(keluar, n + ".json"), t)
    except BaseException:
        for n in teks_per_nama:
            try:
                os.remove(os.path.join(keluar, n + ".json.tmp"))
            except OSError:
                pass
        raise


def jalankan(langkah, frekuensi_aktif, keluar=KELUAR, pemuat=None, sekarang=None):
    """Jalankan langkah yang frekuensinya aktif. Mengembalikan isi indeks.json (sudah ditulis)."""
    pemuat = pemuat or (lambda modul: importlib.import_module("unit." + modul))
    dibuat = (sekarang or datetime.now(timezone.utc)).strftime("%Y-%m-%dT%H:%M:%SZ")
    os.makedirs(keluar, exist_ok=True)
    berkas, terpakai = [], set()
    for nama, modul, frek in langkah:
        if frek not in frekuensi_aktif:
            continue
        try:
            hasil = pemuat(modul).jalan()
            if not isinstance(hasil, dict) or not hasil:
                raise ValueError("jalan() harus mengembalikan {nama_berkas: dict} tak kosong")
            for n, d in hasil.items():
                if not isinstance(n, str) or not NAMA_SAH.match(n) or n in RESERVED:
                    raise ValueError(f"nama berkas {n!r} tidak sah (harus ^[a-z0-9_]+$ dan bukan {sorted(RESERVED)})")
                if n in terpakai:
                    raise ValueError(f"nama berkas {n!r} sudah dipakai langkah lain pada putaran ini")
                if not isinstance(d, dict):
                    raise ValueError(f"keluaran {n!r} bukan dict")
            basi = BASI_JAM.get(frek)
            # serialisasi SEMUA dulu: nilai yang tak bisa di-JSON-kan menggagalkan langkah sebelum ada berkas ditulis
            teks = {n: json.dumps({"dibuat": dibuat, "basi_jam": basi, **d}, ensure_ascii=False, separators=(",", ":"))
                    for n, d in hasil.items()}
            _tulis_semua(keluar, teks)
            terpakai.update(hasil)
            for n in hasil:  # ok dicatat sesudah semua tulis selesai
                berkas.append({"nama": n, "sistem": nama, "dibuat": dibuat, "basi_jam": basi, "ok": True, "galat": None})
        except Exception as e:  # noqa: BLE001 - tahan gagal per langkah adalah tujuannya
            berkas.append({"nama": nama, "sistem": nama, "dibuat": dibuat, "basi_jam": BASI_JAM.get(frek),
                           "ok": False, "galat": _satu_baris(e)})
    indeks = {"dibuat": dibuat, "berkas": berkas}
    _tulis(os.path.join(keluar, "indeks.json"), indeks)
    return indeks


def ringkasan(indeks):
    gagal = [b for b in indeks["berkas"] if not b["ok"]]
    baris = [f"### Ruang Unit: {len(indeks['berkas']) - len(gagal)} berkas ok, {len(gagal)} langkah gagal"]
    baris += [f"- GAGAL {b['sistem']}: {b['galat']}" for b in gagal]
    return "\n".join(baris) + "\n"


def cek():
    # modul terdaftar menjalankan cek-nya sendiri dulu
    for nama, modul, frek in LANGKAH:
        assert frek in BASI_JAM, f"{nama}: frekuensi {frek!r} bukan harian/mingguan/bulanan"
        m = importlib.import_module("unit." + modul)
        if hasattr(m, "cek"):
            m.cek()

    class Tiruan:
        def __init__(self, fn):
            self.jalan = fn

    def bagus():
        return {"a": {"x": 1}, "b": {"y": 2}}

    def meledak():
        raise RuntimeError("sumber\nmati  total")

    def setengah():  # keluaran kedua tidak sah: berkas pertama pun tidak boleh tertulis
        return {"c": {"z": 1}, "d": [1]}

    modul = {"bagus": Tiruan(bagus), "meledak": Tiruan(meledak), "setengah": Tiruan(setengah),
             "lain": Tiruan(lambda: {"e": {"k": 1}}), "akhir": Tiruan(lambda: {"f": {"k": 1}})}
    langkah = [("S1", "meledak", "harian"), ("S2", "bagus", "harian"), ("S3", "setengah", "harian"),
               ("S4", "lain", "mingguan"), ("S5", "akhir", "harian")]
    with tempfile.TemporaryDirectory() as d:
        # berkas lama dari hari kemarin harus selamat bila langkahnya gagal
        os.makedirs(d, exist_ok=True)
        _tulis(os.path.join(d, "c.json"), {"lama": True})
        idx = jalankan(langkah, {"harian"}, d, modul.__getitem__)
        ada = sorted(os.listdir(d))
        assert ada == ["a.json", "b.json", "c.json", "f.json", "indeks.json"], f"berkas tertulis: {ada}"
        assert json.load(open(os.path.join(d, "c.json"))) == {"lama": True}, "langkah gagal menimpa berkas lama"
        assert not any(n.endswith(".tmp") for n in ada), ada
        s = {b["sistem"]: b for b in idx["berkas"] if b["sistem"] in ("S1", "S3")}
        assert s["S1"]["ok"] is False and "\n" not in s["S1"]["galat"] and "sumber mati total" in s["S1"]["galat"], s["S1"]
        assert s["S3"]["ok"] is False
        ok = [b["nama"] for b in idx["berkas"] if b["ok"]]
        assert ok == ["a", "b", "f"], f"langkah sesudah yang gagal tidak jalan: {ok}"  # S5 jalan walau S1/S3 gagal
        assert all(b["basi_jam"] == 48 for b in idx["berkas"]), idx
        assert json.load(open(os.path.join(d, "indeks.json"))) == idx
        a = json.load(open(os.path.join(d, "a.json")))
        assert a["x"] == 1 and a["basi_jam"] == 48 and a["dibuat"] == idx["dibuat"], a
        assert "S1" in ringkasan(idx) and "2 langkah gagal" in ringkasan(idx)
        # mingguan hanya bila diminta
        idx2 = jalankan(langkah, {"harian", "mingguan"}, d, modul.__getitem__)
        assert any(b["nama"] == "e" and b["basi_jam"] == 240 for b in idx2["berkas"]), idx2
    # W1: nilai tak bisa di-JSON-kan di berkas kedua -> tak ada berkas, tak ada .tmp, tak dicatat ok
    with tempfile.TemporaryDirectory() as d:
        m = {"p": Tiruan(lambda: {"a": {"k": 1}, "b": {"k": {1, 2}}})}
        idx = jalankan([("P", "p", "harian")], {"harian"}, d, m.__getitem__)
        assert os.listdir(d) == ["indeks.json"], f"sisa berkas: {sorted(os.listdir(d))}"
        assert [b["ok"] for b in idx["berkas"]] == [False], idx
    # W1b/J1: crash antara tulis .tmp dan replace -> berkas lama utuh, .tmp bersih
    with tempfile.TemporaryDirectory() as d:
        _tulis(os.path.join(d, "a.json"), {"lama": 1})
        asli = os.replace
        def rusak(src, dst):
            if dst.endswith("a.json"):
                raise OSError("disk penuh")
            asli(src, dst)
        os.replace = rusak
        try:
            idx = jalankan([("A", "ba", "harian")], {"harian"}, d, {"ba": Tiruan(lambda: {"a": {"baru": 1}})}.__getitem__)
        finally:
            os.replace = asli
        assert json.load(open(os.path.join(d, "a.json"))) == {"lama": 1}, "berkas lama rusak: tulis tidak atomik"
        assert not [n for n in os.listdir(d) if n.endswith(".tmp")], os.listdir(d)
        assert idx["berkas"][0]["ok"] is False
    # W2: nama 'indeks', nama tak sah, nama duplikat antar-langkah
    with tempfile.TemporaryDirectory() as d:
        m = {"i": Tiruan(lambda: {"indeks": {"x": 1}}), "n1": Tiruan(lambda: {"../x": {"x": 1}}),
             "n2": Tiruan(lambda: {"Besar": {"x": 1}}), "u": Tiruan(lambda: {"dup": {"v": 1}}),
             "v": Tiruan(lambda: {"dup": {"v": 2}, "lain": {"v": 3}})}
        idx = jalankan([("I", "i", "harian"), ("N1", "n1", "harian"), ("N2", "n2", "harian"),
                        ("U", "u", "harian"), ("V", "v", "harian")], {"harian"}, d, m.__getitem__)
        st = {b["sistem"]: b["ok"] for b in idx["berkas"]}
        assert st == {"I": False, "N1": False, "N2": False, "U": True, "V": False}, st
        assert json.load(open(os.path.join(d, "dup.json")))["v"] == 1, "duplikat menimpa"
        ij = json.load(open(os.path.join(d, "indeks.json")))
        assert "berkas" in ij and "x" not in ij, "indeks.json tertimpa langkah"
        assert not os.path.exists(os.path.join(d, "lain.json")), "langkah bentrok menulis sebagian"
    with tempfile.TemporaryDirectory() as d:  # tanpa langkah: indeks kosong tetap tertulis
        assert jalankan([], {"harian"}, d)["berkas"] == []
        assert os.listdir(d) == ["indeks.json"]
    print("jalan.py --cek: lulus")


def main(argv):
    if "--cek" in argv:
        cek()
        return 0
    if argv[:1] != ["harian"]:
        print(__doc__)
        return 2
    aktif = {"harian"} | ({"mingguan"} if "--mingguan" in argv else set()) | ({"bulanan"} if "--bulanan" in argv else set())
    keluar = KELUAR
    if "--keluar" in argv:
        i = argv.index("--keluar")
        if i + 1 >= len(argv) or argv[i + 1].startswith("--"):
            print("--keluar butuh nilai (folder)\n" + __doc__)
            return 2
        keluar = argv[i + 1]
    indeks = jalankan(LANGKAH, aktif, keluar)
    teks = ringkasan(indeks)
    print(teks)
    if os.environ.get("GITHUB_STEP_SUMMARY"):
        with open(os.environ["GITHUB_STEP_SUMMARY"], "a", encoding="utf-8") as f:
            f.write(teks)
    return 0  # kegagalan langkah ada di indeks.json; jangan menggagalkan unggah berkas yang ok


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
