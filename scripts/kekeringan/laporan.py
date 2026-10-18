"""Laporan harian kekeringan -> public/data/kekeringan_laporan.json (kontrak v1: docs/multi-bencana/LAPORAN-HARIAN.md)

Dibangun dari cache data/raw/kekeringan/harian.json (30 hari terakhir dihitung ulang, jadi tidak perlu riwayat sendiri) lewat scripts/umum/laporan.py
`susun` + `periksa`. Berkas ditulis ke public/data (bukan public/kekeringan/data) supaya ikut cache Actions ke semua workflow yang deploy; layar memakai
Laporan.pasang({id: 'kekeringan', url: '/data/kekeringan_laporan.json'}). `tulis()` tidak dipanggil karena jalurnya terkunci ke public/<id>/data.

Metrik (hari = 30 hari yang berakhir kemarin WIB; kemarin = hari_lengkap):
  jiwa31   UTAMA. Penduduk di sel dengan HTH >= 31 hari (jumlah). Dipilih karena HTH maks naik 1 tiap hari kering di mana-mana dan tidak membedakan wilayah.
  hth_maks HTH terpanjang di wilayah itu (maks).
  kab31    kabupaten dengan >= 30% penduduk di HTH >= 31 (jumlah; di kabupaten bernilai 0 atau 1).
  hujan    hujan rerata berbobot penduduk, mm/hari (rerata; lebih tinggi = lebih baik).
Kabupaten dimuat hanya yang pernah HTH >= 31 dalam 30 hari (menjaga berkas < 400 KB); provinsi dan nasional menghitung semua kabupaten.
Kode kabupaten di sini INTERNAL (kode provinsi + urutan abjad, hth.kode_kab), bukan kode Kemendagri.

Pakai:  python3 scripts/kekeringan/laporan.py      |  python3 scripts/kekeringan/laporan.py uji
"""
import datetime as dt, importlib.util, json, os, sys, time

AB = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, AB)
sys.path.insert(1, os.path.join(AB, "..", "banjir"))
from umum import baca, simpan
import hth as H

_s = importlib.util.spec_from_file_location("umum_laporan_induk", os.path.join(H.AKAR, "scripts/umum/laporan.py"))
L = importlib.util.module_from_spec(_s)
_s.loader.exec_module(L)

METRIK = [
    {"k": "jiwa31", "label": "Penduduk di HTH 31 hari atau lebih", "satuan": "jiwa", "utama": True, "agregat": "jumlah", "arah": "naik_buruk", "desimal": 0},
    {"k": "hth_maks", "label": "HTH terpanjang", "satuan": "hari", "agregat": "maks", "arah": "naik_buruk", "desimal": 0},
    {"k": "kab31", "label": "Kabupaten dengan 30% penduduk di HTH 31 hari atau lebih", "satuan": "kabupaten", "agregat": "jumlah", "arah": "naik_buruk", "desimal": 0},
    {"k": "hujan", "label": "Hujan rerata", "satuan": "mm/hari", "agregat": "rerata", "arah": "naik_baik", "desimal": 1},
]
PROV_NAMA = H._st.PROVINSI
SUMBER = [
    {"nama": "Open-Meteo", "url": "https://open-meteo.com/en/docs", "catatan": "hujan dan ET0 harian model gabungan; HTH = hari berturut-turut dengan hujan < 1 mm, dihitung Pantau Bencana"},
    {"nama": "ECMWF SEAS5 via Open-Meteo", "url": "https://open-meteo.com/en/docs/seasonal-forecast-api", "catatan": "ensemble musiman 51 anggota untuk peluang SPI-3 dan cekaman air padi"},
    {"nama": "NASA POWER", "url": "https://power.larc.nasa.gov/", "catatan": "hujan bulanan 1991-2020 untuk SPI"},
    {"nama": "Kelas HTH BMKG", "url": "https://www.bmkg.go.id/iklim/", "catatan": "kelas sangat pendek sampai ekstrem; angka di sini deteksi Pantau Bencana, bukan peta BMKG"},
]


def nama_kab(k):
    return k.split("|", 1)[1]


def juta(n):
    return f"{n / 1e6:.1f}".replace(".", ",") + " juta" if n >= 1e6 else f"{n:,}".replace(",", ".")


def seri_laporan(ag, n):
    """Agregat harian (hth.agregat_harian) -> (nasional, prov, kab) berformat susun()."""
    flag = lambda w: [1 if w["total"] and w["j31"][d] / w["total"] >= H.BATAS_WIL else 0 for d in range(n)]
    kab_semua = {k: flag(w) for k, w in ag["kab"].items()}
    ambil = lambda w, f: {"jiwa31": w["j31"], "hth_maks": w["maks"], "hujan": w["hujan"], "kab31": f}
    prov = {}
    for p, w in ag["prov"].items():
        f = [sum(kab_semua[k][d] for k in kab_semua if k.split("|")[0] == p) for d in range(n)]
        prov[p] = ambil(w, f)
    nas = ambil(ag["nas"], [sum(v[d] for v in kab_semua.values()) for d in range(n)])
    kode = ag["_kode"]
    kab = [{"prov": k.split("|")[0], "kode": kode[k], "nama": nama_kab(k), **ambil(w, kab_semua[k])}
           for k, w in ag["kab"].items() if k in kode and any(m is not None and m >= 31 for m in w["maks"])]
    return nas, prov, kab


def sorot(ag, kab_seri, wilayah, n):
    """Maks 8 butir: Awas, Siaga, HTH terpanjang, perubahan pekan ini."""
    out = []
    kab = wilayah.get("kab", {}) if wilayah else {}
    for lv, tingkat, nama in ((3, "awas", "Awas"), (2, "siaga", "Siaga")):
        ks = sorted(((v["jiwa"][lv - 1], k) for k, v in kab.items() if v.get("lv") == lv), reverse=True)
        if ks:
            top = ", ".join(nama_kab(k) for _, k in ks[:3])
            out.append({"tingkat": tingkat, "judul": f"{len(ks)} kabupaten berstatus {nama}",
                        "teks": f"Terbanyak penduduknya: {top}. Status gabungan SPI-3 dan kelembapan tanah, deteksi Pantau Bencana.", "prov": ks[0][1].split("|")[0]})
    maks = sorted(((w["maks"][-1], k) for k, w in ag["kab"].items() if w["maks"][-1] is not None), reverse=True)[:3]
    if maks and maks[0][0] >= 1:
        out.append({"tingkat": "waspada" if maks[0][0] >= 31 else "info", "judul": f"HTH terpanjang {maks[0][0]} hari di {nama_kab(maks[0][1])}",
                    "teks": "Berikutnya: " + ", ".join(f"{nama_kab(k)} {h} hari" for h, k in maks[1:]) + "." if len(maks) > 1 else "Hujan di bawah 1 mm per hari tanpa putus.",
                    "prov": maks[0][1].split("|")[0]})
    nas = ag["nas"]["j31"]
    if n >= 8 and nas[-1] is not None and nas[-8] is not None:
        d = nas[-1] - nas[-8]
        if d == 0:
            judul, tingkat = "Penduduk di HTH 31 hari atau lebih tidak berubah sepekan ini", "info"
        else:
            judul = f"Penduduk di HTH 31 hari atau lebih {'bertambah' if d > 0 else 'berkurang'} {juta(abs(d))} jiwa sepekan ini"
            tingkat = "waspada" if d > 0 else "info"
        out.append({"tingkat": tingkat, "judul": judul, "teks": f"Sekarang {juta(nas[-1])} jiwa, pekan lalu {juta(nas[-8])} jiwa.", "prov": None})
    return out[:8]


def prakiraan_hujan(harian, penduduk, pusat, prov_urut, t_ref):
    """Hujan 7 hari ke depan (Open-Meteo) untuk 5 provinsi dengan penduduk HTH >= 31 terbanyak. Maks tersedia: 16 hari ke depan."""
    n = 7
    if t_ref + n >= len(harian["tgl"]):
        return None
    peta = H.peta_kec(penduduk, pusat, harian["sel"])
    sp = {k: s["p"][t_ref + 1:t_ref + 1 + n] for k, s in harian["sel"].items()}
    sh = {k: [H.hth(s["p"], t) for t in range(t_ref + 1, t_ref + 1 + n)] for k, s in harian["sel"].items()}
    ag = H.agregat_harian(sp, sh, peta, n)
    baris = [{"label": PROV_NAMA.get(p, p), "prov": p, "nilai": ag["prov"][p]["hujan"], "satuan": "mm/hari"} for p in prov_urut if p in ag["prov"]][:5]
    if not baris:
        return None
    return {"judul": "Prakiraan hujan 7 hari, provinsi dengan penduduk HTH 31 hari atau lebih terbanyak", "hari": harian["tgl"][t_ref + 1:t_ref + 1 + n], "baris": baris}


def tabel_spi(pra):
    """Peluang SPI-3 <= -1 per provinsi, urut kode provinsi (BUKAN dari peluang tertinggi), tiap bulan dengan baseline klimatologinya sendiri.
    Provinsi yang hanya diwakili satu titik SEAS5 dan yang tak punya baseline tidak ditampilkan."""
    if not pra or not pra.get("prov"):
        return None
    ps = [(p, v) for p, v in sorted(pra["prov"].items()) if not v.get("satu_titik") and all(l["pk1"] is not None and l.get("b1") is not None for l in v["lead"])]
    if not ps:
        return None
    kol = ["Provinsi"]
    for m in pra["bulan"]:
        kol += [f"Peluang {m} (%)", f"Baseline {m} (%)"]
    baris = [[PROV_NAMA.get(p, p)] + [x for l in v["lead"] for x in (round(l["pk1"]), round(l["b1"]))] for p, v in ps]
    return {"id": "peluang_spi", "judul": "Peluang kekeringan 3 bulan (SPI-3 di bawah atau sama dengan -1) dibanding baseline klimatologi",
            "kolom": kol, "baris": baris,
            "catatan": f"Urut kode provinsi. Baseline = peluang klimatologi 1991-2020 (sekitar 16%); yang berarti selisihnya. {(pra.get('bias') or {}).get('label', 'belum diuji balik')}. "
                       "SPI bulan +1 mencampur hujan Open-Meteo dan POWER. Provinsi yang hanya diwakili satu titik tidak ditampilkan."}


def tabel_padi(padi):
    if not padi or not padi.get("kab"):
        return None
    ks = sorted(padi["kab"].items(), key=lambda x: (-x[1]["gagal"], -x[1]["turun_med"]))[:10]
    return {"id": "padi", "judul": "Cekaman air padi tadah hujan, kabupaten teratas",
            "kolom": ["Kabupaten", "Peluang hasil turun 50% atau lebih (%)", "Penurunan hasil median (%)", "Fase terberat"],
            "baris": [[nama_kab(k), v["gagal"], v["turun_med"], v["fase_terberat"]] for k, v in ks],
            "catatan": f"Indikator cekaman air, bukan data puso. Tanam {padi['tanam']}, tanpa irigasi, tanpa data luas sawah."}


def bangun(harian, penduduk, pusat, wilayah, prakiraan, padi, sekarang):
    H.validasi_harian(harian)
    isi, ag = H.hitung(harian, penduduk, pusat)
    n = len(isi["tgl30"])
    ag["_kode"] = H.kode_kab(penduduk)
    nas, prov, kab = seri_laporan(ag, n)
    prov_urut = [p for _, p in sorted(((w["j31"][-1], p) for p, w in ag["prov"].items()), reverse=True)]
    t_ref = harian["tgl"].index(harian["hari_ini"]) - 1
    tambahan = [t for t in (tabel_spi(prakiraan), tabel_padi(padi)) if t]
    d = L.susun("kekeringan", "Laporan Harian Kekeringan", isi["tgl30"], METRIK, nas, prov, kab, cutoff=harian["dibuat"], hari_lengkap=isi["tgl30"][-1],
                sorot=sorot(ag, kab, wilayah, n), prakiraan=prakiraan_hujan(harian, penduduk, pusat, prov_urut, t_ref), tambahan=tambahan, sumber=SUMBER,
                dibuat=sekarang.strftime("%Y-%m-%dT%H:%M+07:00"))
    return d


def tulis(d):
    """Periksa dulu (galat -> ValueError), lalu simpan atomik ke public/data/kekeringan_laporan.json."""
    g = L.periksa(d)
    if g:
        raise ValueError(f"laporan kekeringan ditolak ({len(g)} galat):\n- " + "\n- ".join(g))
    jalur = os.path.join(H.DIR_DATA, "kekeringan_laporan.json")
    simpan(jalur, d)
    return jalur


def main():
    t0 = time.time()
    r = lambda f: json.load(open(os.path.join(H.DIR_DATA, f)))
    penduduk = r("penduduk.json")
    pusat = json.load(open(os.path.join(H.AKAR, "public/banjir/data/pusat_kec.json")))
    harian = baca(os.path.join(H.DIR_MENTAH, "harian.json"))
    if not harian:
        raise SystemExit("harian.json belum ada; jalankan hth.py dulu")
    d = bangun(harian, penduduk, pusat, baca(os.path.join(H.DIR_DATA, "kekeringan_wilayah.json")), baca(os.path.join(H.DIR_DATA, "kekeringan_prakiraan.json")),
               baca(os.path.join(H.DIR_DATA, "kekeringan_padi.json")), dt.datetime.now(H.WIB))
    j = tulis(d)
    print(f"laporan kekeringan: {len(d['kab'])} kab, {len(d['sorot'])} sorotan, {os.path.getsize(j) // 1024} KB; {time.time() - t0:.0f} dtk", file=sys.stderr)


def uji():
    penduduk = {"kec": {"11|Alfa|b": 3000, "11|Zeta|a": 1000, "72|Beta|c": 10}}
    pusat = {"11|Alfa|b": [.3, .3], "11|Zeta|a": [.3, 1.2], "72|Beta|c": [.3, .3]}
    h = H.fixture()
    wil = {"kab": {"11|Alfa": {"lv": 3, "jiwa": [3000, 3000, 3000]}, "11|Zeta": {"lv": 2, "jiwa": [1000, 1000, 0]}}, "prov": {}}
    pra = {"bulan": ["2026-11", "2026-12", "2027-01"], "sumber": "ECMWF SEAS5", "bias": {"label": "belum diuji balik; median hujan anggota 1,11 sampai 1,19 kali klimatologi di bulan +2/+3"},
           "prov": {"11": {"satu_titik": False, "lead": [{"pk1": 60, "pk15": 30, "pk2": 10, "spi3": -1, "spi1": -1, "b1": 15.9}] * 3},
                    "72": {"satu_titik": True, "lead": [{"pk1": 99, "pk15": 30, "pk2": 10, "spi3": -1, "spi1": -1, "b1": 15.9}] * 3},
                    "12": {"satu_titik": False, "lead": [{"pk1": 20, "pk15": 30, "pk2": 10, "spi3": -1, "spi1": -1, "b1": 15.9}] * 3}}}
    padi = {"tanam": "2026-11-15", "kab": {"11|Alfa": {"gagal": 40, "turun_med": 30, "fase_terberat": "generatif"}}}
    d = bangun(h, penduduk, pusat, wil, pra, padi, dt.datetime(2026, 10, 18, 7, tzinfo=H.WIB))
    assert L.periksa(d) == [], L.periksa(d)
    assert len(d["hari"]) == 30 and d["hari"][-1] == "2026-10-17" == d["hari_lengkap"] and d["cutoff"] == h["dibuat"]
    assert d["nasional"]["jiwa31"][-1] == 3010 and d["nasional"]["kab31"][-1] == 2 and d["nasional"]["hth_maks"][-1] == 40
    assert [o["kode"] for o in d["kab"]] == ["1101", "7201"] and d["prov"]["11"]["jiwa31"][-1] == 3000          # Zeta (hujan tiap hari) tidak dimuat
    assert [s["tingkat"] for s in d["sorot"]][:2] == ["awas", "siaga"] and d["sorot"][0]["judul"] == "1 kabupaten berstatus Awas"
    assert len(d["prakiraan"]["hari"]) == 7 and d["prakiraan"]["baris"][0]["nilai"][0] is not None and len(d["tambahan"]) == 2
    tb = d["tambahan"][0]
    assert [b[0] for b in tb["baris"]] == ["Aceh", "Sumatera Utara"] and len(tb["kolom"]) == 7 and tb["baris"][0][1:3] == [60, 16]       # urut kode, bukan peluang; satu_titik (72) dibuang
    assert "belum diuji balik" in tb["catatan"] and "mencampur" in tb["catatan"]
    assert not any("—" in json.dumps(d, ensure_ascii=False) for _ in [0])                                       # tanpa em dash
    # jumlah kabupaten tidak boleh melebihi provinsi: periksa() menolak pelanggaran
    import copy
    x = copy.deepcopy(d)
    x["kab"][0]["jiwa31"][29] = 10 ** 9
    assert any("melebihi nilai prov" in e for e in L.periksa(x))
    try:
        tulis(x)
        raise SystemExit("tulis harus menolak laporan tidak sah")
    except ValueError as e:
        assert "ditolak" in str(e)
    # harian terlalu pendek -> galat, bukan laporan separuh
    kurang = H.fixture()
    kurang["hari_ini"] = kurang["tgl"][20]
    try:
        bangun(kurang, penduduk, pusat, wil, None, None, dt.datetime.now(H.WIB))
        raise SystemExit("bangun harus menolak seri pendek")
    except ValueError:
        pass
    print("ok laporan kekeringan")


if __name__ == "__main__":
    uji() if sys.argv[1:] == ["uji"] else main()
