"""Dasar bersama pipeline R = H x V / C (#28-#34): unduh sopan, kode kabupaten, simpan dengan plafon ukuran, pemecah kode wilayah.

  ambil(url, ...)      GET/POST dengan User-Agent, coba ulang, jeda antarpanggilan (ramah ke server pemerintah)
  simpan_plafon(...)   simpan JSON ringkas atomik (kunci `dibuat` pertama) dan MENOLAK berkas > 2 MB (aturan panen data)
  kab_kode()           {"prov|nama peta": kode BPS 4 digit} dari scripts/udara/kota.json (Kepmendagri 300.2.2-2138/2025)
  kode_dukcapil(p, k)  no_prop + no_kab Dukcapil -> kode 4 digit
Pakai:  python3 scripts/bnpb/hvc_dasar.py --cek
"""
import json, os, sys, time, urllib.error, urllib.parse, urllib.request

AB = os.path.dirname(os.path.abspath(__file__))
AKAR = os.path.normpath(os.path.join(AB, "../.."))
sys.path.insert(0, os.path.join(AKAR, "scripts/umum"))
import kejadian as _kej   # simpan atomik dengan `dibuat`, baca, kab_di (titik -> kabupaten), km

KELUAR = os.path.join(AKAR, "public/data/bnpb")
MENTAH = os.path.join(AKAR, "data/raw/bnpb")     # cache unduhan (data/raw ada di .gitignore)
UA = "poskokarhutla-ruang-bnpb/1.0 (riset kebencanaan; kontak lewat repo)"
PLAFON = 2_000_000
JEDA = 1.0   # detik antarpanggilan ke satu host


def ambil(url, data=None, kepala=None, coba=3, batas_waktu=120, mentah=False, jeda=JEDA):
    """GET (POST bila data) -> JSON (atau bytes bila mentah). 4xx selain 429 tidak diulang. Jeda `jeda` dtk SEBELUM tiap panggilan."""
    if isinstance(data, dict):
        data = urllib.parse.urlencode(data).encode()
    for i in range(coba):
        time.sleep(jeda)
        try:
            req = urllib.request.Request(url, data=data, headers={"User-Agent": UA, **(kepala or {})})
            with urllib.request.urlopen(req, timeout=batas_waktu) as r:
                isi = r.read()
            return isi if mentah else json.loads(isi)
        except urllib.error.HTTPError as e:
            if i == coba - 1 or (400 <= e.code < 500 and e.code != 429):
                raise RuntimeError(f"{url.split('?')[0]}: HTTP {e.code} {e.read().decode(errors='replace')[:200]}")
            time.sleep(10 * (i + 1))
        except Exception as e:
            if i == coba - 1:
                raise RuntimeError(f"{url.split('?')[0]}: {e}")
            time.sleep(10 * (i + 1))


def simpan_plafon(nama, isi, plafon=PLAFON):
    """-> jalur. Tulis public/data/bnpb/<nama>; gagal keras bila hasil > plafon (aturan: <= 2 MB per berkas)."""
    jalur = os.path.join(KELUAR, nama)
    _kej.simpan(jalur, isi)
    ukuran = os.path.getsize(jalur)
    if ukuran > plafon:
        os.remove(jalur)
        raise RuntimeError(f"{nama}: {ukuran} B melewati plafon {plafon} B; ringkas lagi")
    return jalur


def kab_kode():
    d = json.load(open(os.path.join(AKAR, "scripts/udara/kota.json"), encoding="utf-8"))
    i = {k: n for n, k in enumerate(d["kolom"])}
    return {f"{r[i['prov']]}|{r[i['kab']]}": r[i["kode"]] for r in d["baris"]}


def kab_info():
    d = json.load(open(os.path.join(AKAR, "scripts/udara/kota.json"), encoding="utf-8"))
    i = {k: n for n, k in enumerate(d["kolom"])}
    return {r[i["kode"]]: {"nama": r[i["nama"]], "prov": r[i["prov"]], "jiwa": r[i["jiwa"]]} for r in d["baris"]}


def kode_dukcapil(prop, kab):
    """no_prop 33 + no_kab 1 -> '3301'."""
    return f"{int(prop):02d}{int(kab):02d}"


def _cek():
    kk = kab_kode()
    assert len(kk) > 500 and kk["33|Cilacap"] == "3301", len(kk)
    assert kode_dukcapil(33, 1) == "3301" and kode_dukcapil(11, 71) == "1171"
    assert len(kab_info()) == len(set(kk.values()))
    import tempfile
    global KELUAR
    asli, KELUAR = KELUAR, tempfile.mkdtemp()
    try:
        simpan_plafon("kecil.json", {"a": 1})
        try:
            simpan_plafon("besar.json", {"a": "x" * 100}, plafon=50)
            raise AssertionError("berkas di atas plafon harus ditolak")
        except RuntimeError:
            assert not os.path.exists(os.path.join(KELUAR, "besar.json"))
    finally:
        KELUAR = asli
    print("hvc_dasar: --cek hijau")


if __name__ == "__main__":
    _cek() if sys.argv[1:] == ["--cek"] else print(__doc__)
