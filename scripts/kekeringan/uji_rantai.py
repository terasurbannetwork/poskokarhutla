"""Uji rantai kekeringan tanpa jaringan: hth -> prakiraan -> padi -> ujibalik -> laporan dari fixture kecil di direktori sementara (bukan public/).

Yang diperiksa adalah invarian lintas-keluaran (bukan potret angka): kode kabupaten sama di semua berkas, peluang 0..100, jiwa provinsi <= nasional,
hari laporan = hari HTH, laporan lolos `periksa`, tanpa NaN/em dash, dan tak satu pun soket dibuka.

Pakai:  python3 scripts/kekeringan/uji_rantai.py
"""
import datetime as dt, json, math, os, socket, sys, tempfile

AB = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, AB)
sys.path.insert(1, os.path.join(AB, "..", "banjir"))
import hth as H
import padi as PD
import prakiraan as PK
import ujibalik as UB
from umum import simpan
import importlib.util as _iu   # nama "laporan" bentrok dengan scripts/data/laporan.py (karhutla) yang sudah ada di sys.modules lewat status.py
_sp = _iu.spec_from_file_location("kekeringan_laporan", os.path.join(AB, "laporan.py"))
LP = _iu.module_from_spec(_sp)
_sp.loader.exec_module(LP)


def _tanpa_jaringan(*a, **k):
    raise AssertionError("uji_rantai tidak boleh membuka jaringan")


def cek_angka(x, jalur="$"):
    """Tak ada NaN/inf di mana pun dalam struktur JSON."""
    if isinstance(x, float):
        assert math.isfinite(x), f"{jalur} tidak hingga"
    elif isinstance(x, dict):
        for k, v in x.items():
            cek_angka(v, f"{jalur}.{k}")
    elif isinstance(x, list):
        for i, v in enumerate(x):
            cek_angka(v, f"{jalur}[{i}]")


def main():
    socket.socket = _tanpa_jaringan
    socket.create_connection = _tanpa_jaringan
    sekarang = dt.datetime(2026, 10, 18, 7, 0, tzinfo=H.WIB)
    with tempfile.TemporaryDirectory() as tmp:
        H.DIR_DATA = os.path.join(tmp, "data")
        H.DIR_MENTAH = os.path.join(tmp, "raw")
        for d in (H.DIR_DATA, H.DIR_MENTAH):
            os.makedirs(d)
        penduduk = {"kec": {"11|Alfa|b": 3000, "11|Zeta|a": 1000, "72|Beta|c": 10}}
        pusat = {"11|Alfa|b": [.3, .3], "11|Zeta|a": [.3, 1.2], "72|Beta|c": [.3, .3]}
        harian = H.fixture()
        harian["dibuat"] = sekarang.isoformat(timespec="minutes")
        simpan(os.path.join(H.DIR_MENTAH, "harian.json"), harian)
        # musiman: separuh anggota kering total, separuh hujan 10 mm per hari
        tgl = [(dt.date(2026, 10, 18) + dt.timedelta(days=i)).isoformat() for i in range(150)]
        p = [[0.0 if j < 25 else 10.0 for j in range(51)] for _ in range(150)]
        musiman = {"dibuat": sekarang.isoformat(timespec="minutes"), "terbit": tgl[0], "tgl": tgl, "lengkap": True,
                   "titik": {"0.25,0.25": {"p": p, "et0": [4.0] * 150}}, "anak": {"0.25,0.25": "0.25,0.25", "0.25,1.25": "0.25,0.25"}}
        simpan(os.path.join(H.DIR_MENTAH, "musiman.json"), musiman)
        pow_sel = {"0.25,0.25": PK.fixture_pow(), "0.25,1.25": PK.fixture_pow(1.2)}
        kunci = list(harian["sel"])

        # 1. HTH
        h = H.muat_harian(kunci, sekarang)
        hth, _ = H.hitung(h, penduduk, pusat)
        simpan(os.path.join(H.DIR_DATA, "kekeringan_hth.json"), hth)
        # 2. prakiraan
        mus = PK.muat_musiman(kunci, sekarang)
        assert mus["lengkap"], "cache musiman lengkap harus dipakai apa adanya"
        iklim = {"status": "El Niño", "oni_terakhir": {"musim": "JAS", "nilai": 2.0}}
        pra = PK.bangun(pow_sel, h, mus, iklim, {}, penduduk, pusat, sekarang)
        simpan(os.path.join(H.DIR_DATA, "kekeringan_prakiraan.json"), pra)
        # 3. padi
        padi = PD.bangun(mus, penduduk, pusat, sekarang)
        simpan(os.path.join(H.DIR_DATA, "kekeringan_padi.json"), padi)
        # 4. uji balik (butuh banyak sel dan ONI 25+ tahun)
        pw3 = {**pow_sel, "0.25,2.25": PK.fixture_pow(0.9)}
        oni = {(m, y): (1.0 if y in (2015, 1997) else 0.0) for y in range(1991, 2027) for m in ("MAM", "JAS")}
        ujib = UB.bangun(pw3, oni, penduduk, pusat, sekarang)
        simpan(os.path.join(H.DIR_DATA, "kekeringan_ujibalik.json"), ujib)
        # 5. laporan
        lap = LP.bangun(h, penduduk, pusat, {"kab": {}}, pra, padi, sekarang)
        jalur = LP.tulis(lap)
        assert jalur == os.path.join(H.DIR_DATA, "kekeringan_laporan.json") and os.path.exists(jalur)

        # invarian
        semua = {n: json.load(open(os.path.join(H.DIR_DATA, f"kekeringan_{n}.json"))) for n in ("hth", "prakiraan", "padi", "ujibalik", "laporan")}
        for n, d in semua.items():
            cek_angka(d, n)
            assert "—" not in json.dumps(d, ensure_ascii=False), f"{n}: em dash"
        kode = H.kode_kab(penduduk)
        for berkas, kabs in (("hth", semua["hth"]["kab"]), ("prakiraan", semua["prakiraan"]["kab"]), ("padi", semua["padi"]["kab"])):
            for k, v in kabs.items():
                assert v["kode"] == kode[k], f"{berkas}: kode {k} {v['kode']} != {kode[k]}"
        assert {o["kode"] for o in semua["laporan"]["kab"]} <= set(kode.values())
        assert semua["laporan"]["hari"] == semua["hth"]["tgl30"] and semua["laporan"]["hari_lengkap"] == semua["hth"]["hari"]
        assert LP.L.periksa(semua["laporan"]) == []
        nas = semua["hth"]["nasional"]
        assert sum(v["j31"] for v in semua["hth"]["prov"].values()) <= nas["total"] and nas["j31"] == sum(v["j31"] for v in semua["hth"]["prov"].values())
        assert all(v["j61"] <= v["j31"] <= v["total"] for v in semua["hth"]["kab"].values())
        assert all(0 <= s[2] <= 93 and 0 <= s[3] <= 5 and len(s[4]) == 30 for s in semua["hth"]["sel"])
        for k, v in semua["prakiraan"]["kab"].items():
            for l in v["lead"]:
                assert 0 <= l["pk2"] <= l["pk15"] <= l["pk1"] <= 100, (k, l)       # peluang <= -2 tak mungkin lebih besar dari <= -1
            assert 0 <= v["p61"] <= v["p31"] <= 100
        assert all(0 <= v["gagal"] <= v["turun25"] <= 100 for v in semua["padi"]["kab"].values()), "peluang turun >= 50% harus <= peluang turun >= 25%"
        assert semua["padi"]["kab"]["11|Alfa"]["data_sawah"] is False and "BUKAN data puso" in semua["padi"]["catatan"]
        assert semua["ujibalik"]["prospek"]["semua"]["n"] > 0 and semua["ujibalik"]["bnpb"]["ada"] is False
        # satu berkas lain pun tidak muncul di public/ (kita hanya menulis ke direktori sementara)
        assert not H.DIR_DATA.startswith(os.path.join(H.AKAR, "public"))
        # penjaga main(): keluaran publik segar+lengkap -> dilewati tanpa menyentuh jaringan/masukan; basi -> mencoba (gagal di tanah.json yang sengaja tak ada)
        os.remove(os.path.join(H.DIR_MENTAH, "musiman.json"))          # meniru CI: data/raw tidak dibawa
        skrg = dt.datetime.now(H.WIB)
        for modul, nama, maks in ((PK, "prakiraan", 7), (PD, "padi", 7), (UB, "ujibalik", 30)):
            jalur = os.path.join(H.DIR_DATA, f"kekeringan_{nama}.json")
            isi = json.load(open(jalur))
            segar = {**isi, "dibuat": skrg.isoformat(timespec="minutes"), "lengkap": True}
            simpan(jalur, segar)
            modul.main()                                                # tidak boleh melempar: dilewati
            assert json.load(open(jalur)) == segar, f"{nama}: berkas segar tidak boleh disentuh"
            simpan(jalur, {**segar, "dibuat": (skrg - dt.timedelta(days=maks + 1)).isoformat(timespec="minutes")})
            try:
                modul.main()
                raise SystemExit(f"{nama}: berkas basi harus mencoba jalan")
            except FileNotFoundError:
                pass                                                    # tanah.json/penduduk.json tak ada di direktori sementara = ia mencoba
        # masukan rusak membuat rantai gagal keras, bukan menghasilkan keluaran separuh
        rusak = json.loads(json.dumps(h))
        rusak["sel"]["0.25,0.25"]["p"].pop()
        for f in (lambda: H.hitung(rusak, penduduk, pusat), lambda: PD.bangun({"titik": {}}, penduduk, pusat, sekarang)):
            try:
                f()
                raise SystemExit("rantai harus menolak masukan rusak")
            except ValueError:
                pass
    print("ok uji_rantai")


if __name__ == "__main__":
    main()
