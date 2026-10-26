"""Laporan harian kekeringan -> public/data/kekeringan_laporan.json (kontrak v1: docs/multi-bencana/LAPORAN-HARIAN.md)

Dibangun dari cache data/raw/kekeringan/harian.json (30 hari terakhir dihitung ulang, jadi tidak perlu riwayat sendiri) lewat scripts/umum/laporan.py
`susun` + `periksa`. Berkas ditulis ke public/data (bukan public/kekeringan/data) supaya ikut cache Actions ke semua workflow yang deploy; layar memakai
Laporan.pasang({id: 'kekeringan', url: '/data/kekeringan_laporan.json'}). `tulis()` tidak dipanggil karena jalurnya terkunci ke public/<id>/data.

Metrik (hari = 30 hari yang berakhir kemarin WIB; kemarin = hari_lengkap):
  jiwa31   UTAMA. Penduduk di sel dengan HTH >= 31 hari (rerata: ini STOK per hari; menjumlah 7 hari menghitung orang yang sama berulang). Dipilih karena HTH maks naik 1 tiap hari kering di mana-mana dan tidak membedakan wilayah.
  hth_maks HTH terpanjang di wilayah itu (maks).
  kab31    kabupaten dengan >= 30% penduduk di HTH >= 31 (rerata, stok per hari; di kabupaten bernilai 0 atau 1).
  hujan    hujan rerata berbobot penduduk, mm/hari (rerata; lebih tinggi = lebih baik).
Kabupaten dimuat hanya yang pernah HTH >= 31 dalam 30 hari ATAU berstatus Siaga/Awas hari ini (kekeringan_wilayah.json; laporan kejadian
per kab, scripts/umum/laporan_kejadian.py, butuh serinya); provinsi dan nasional menghitung semua kabupaten. Berkas tetap < 400 KB.
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
    {"k": "jiwa31", "label": "Penduduk di HTH 31 hari atau lebih", "satuan": "jiwa", "utama": True, "agregat": "rerata", "arah": "naik_buruk", "desimal": 0},
    {"k": "hth_maks", "label": "HTH terpanjang", "satuan": "hari", "agregat": "maks", "arah": "naik_buruk", "desimal": 0},
    {"k": "kab31", "label": "Kabupaten dengan 30% penduduk di HTH 31 hari atau lebih", "satuan": "kabupaten", "agregat": "rerata", "arah": "naik_buruk", "desimal": 0},
    {"k": "hujan", "label": "Hujan rerata", "satuan": "mm/hari", "agregat": "rerata", "arah": "naik_baik", "desimal": 1},
]
PROV_NAMA = H._st.PROVINSI
SUMBER = [
    {"nama": "Open-Meteo", "url": "https://open-meteo.com/en/docs", "catatan": "hujan dan ET0 harian model gabungan; HTH = hari berturut-turut dengan hujan < 1 mm, dihitung Centurisk97"},
    {"nama": "ECMWF SEAS5 via Open-Meteo", "url": "https://open-meteo.com/en/docs/seasonal-forecast-api", "catatan": "ensemble musiman 51 anggota untuk peluang SPI-3 dan cekaman air padi"},
    {"nama": "NASA POWER", "url": "https://power.larc.nasa.gov/", "catatan": "hujan bulanan 1991\u20132020 untuk SPI"},
    {"nama": "Kelas HTH BMKG", "url": "https://www.bmkg.go.id/iklim/", "catatan": "kelas sangat pendek sampai ekstrem; angka di sini deteksi Centurisk97, bukan peta BMKG"},
]


def nama_kab(k):
    return k.split("|", 1)[1]


def ribu(n):
    """Satu skala untuk jiwa di sorotan: ribu, pembulatan ke ribuan terdekat, titik ribuan Indonesia."""
    return f"{round(n / 1000):,}".replace(",", ".") + " ribu"


def juta2(n):
    return f"{n / 1e6:.2f}".replace(".", ",") + " juta"


def seri_laporan(ag, n, ikut=frozenset()):
    """Agregat harian (hth.agregat_harian) -> (nasional, prov, kab) berformat susun(). `ikut`: kunci 'prov|kab' yang dimuat walau HTH < 31."""
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
           for k, w in ag["kab"].items() if k in kode and (k in ikut or any(m is not None and m >= 31 for m in w["maks"]))]
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
                        "teks": f"Terbanyak penduduknya: {top}. Status gabungan SPI-3 dan kelembapan tanah, deteksi Centurisk97.", "prov": ks[0][1].split("|")[0]})
    maks = [(h, k) for k, h, _ in H.urut_terpanjang([(k, w["maks"][-1], w["total"]) for k, w in ag["kab"].items() if w["maks"][-1] is not None])[:3]]   # aturan seri bersama dengan layar
    if maks and maks[0][0] >= 1:
        out.append({"tingkat": "waspada" if maks[0][0] >= 31 else "info", "judul": f"HTH terpanjang {maks[0][0]} hari di {nama_kab(maks[0][1])}",
                    "teks": "Berikutnya: " + ", ".join(f"{nama_kab(k)} {h} hari" for h, k in maks[1:]) + "." if len(maks) > 1 else "Hujan di bawah 1 mm per hari tanpa putus.",
                    "prov": maks[0][1].split("|")[0]})
    nas = ag["nas"]["j31"]
    if n >= 8 and nas[-1] is not None and nas[-8] is not None:
        d = nas[-1] - nas[-8]
        if round(abs(d) / 1000) == 0:
            judul, tingkat = "Penduduk di HTH 31 hari atau lebih nyaris tidak berubah sepekan ini", "info"
        else:
            judul = f"Penduduk di HTH 31 hari atau lebih {'bertambah' if d > 0 else 'berkurang'} sekitar {ribu(abs(d))} jiwa sepekan ini"
            tingkat = "waspada" if d > 0 else "info"
        out.append({"tingkat": tingkat, "judul": judul, "teks": f"Sekarang {juta2(nas[-1])} jiwa, pekan lalu {juta2(nas[-8])} jiwa.", "prov": None})
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
    rr = [(sum(x for x in b["nilai"] if x is not None) / max(1, sum(1 for x in b["nilai"] if x is not None)), b["label"]) for b in baris]
    kering, nama = min(rr)
    f = lambda x: f"{x:.1f}".replace(".", ",")
    return {"judul": f"Hujan 7 hari ke depan paling sedikit di {nama}: rata-rata {f(kering)} mm per hari", "hari": harian["tgl"][t_ref + 1:t_ref + 1 + n], "baris": baris,
            "catatan": "Open-Meteo, belum diuji balik. Lima provinsi dengan penduduk HTH 31 hari atau lebih terbanyak."}


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
    nb = (pra.get("nasional") or {}).get("lead") or []
    base = " / ".join(f"{l['b1']:.1f}".replace(".", ",") + "%" for l in nb if l.get("b1") is not None) or "tidak tersedia"
    label = (pra.get("bias") or {}).get("label", "belum diuji balik")
    label = label[:1].upper() + label[1:]
    return {"id": "peluang_spi", "judul": "Peluang kekeringan 3 bulan (SPI-3 di bawah atau sama dengan \u22121) dibanding baseline klimatologi",
            "kolom": kol, "baris": baris,
            "catatan": f"Urut kode provinsi. Baseline = peluang klimatologi 1991\u20132020 per bulan (nasional {base}); dibaca sebagai selisih. {label}. "
                       "SPI bulan +1 mencampur hujan Open-Meteo dan POWER. Provinsi yang hanya diwakili satu titik tidak ditampilkan."}


def tabel_padi(padi):
    """Kabupaten dengan SELISIH terbesar terhadap Normal (ansambel hujan klimatologi di wilayah yang sama); bukan peringkat tingkat cekaman mentah."""
    if not padi or not padi.get("kab"):
        return None
    ks = sorted(padi["kab"].items(), key=lambda x: (-x[1]["selisih"], x[0]))[:10]
    return {"id": "padi", "judul": "Cekaman air padi tadah hujan, kabupaten dengan selisih terbesar dari Normal",
            "kolom": ["Kabupaten", "Penurunan hasil skenario (%)", "Normal (%)", "Selisih (poin)", "Peluang turun 25% atau lebih (%)", "Peluang pada Normal (%)"],
            "baris": [[nama_kab(k), v["turun_med"], v["turun_normal"], v["selisih"], v["turun25"], v["turun25_normal"]] for k, v in ks],
            "catatan": "Indikator cekaman air, bukan data puso; tanpa irigasi dan tanpa data luas sawah. Normal = model yang sama dengan 51 deret hujan harian acak "
                       "berklimatologi sama di kabupaten itu; bandingkan selisihnya, bukan antarkabupaten. Tanam mengikuti onset hujan tiap wilayah. "
                       "Hujan prakiraan belum dikoreksi bias."}


def bangun(harian, penduduk, pusat, wilayah, prakiraan, padi, sekarang):
    H.validasi_harian(harian)
    isi, ag = H.hitung(harian, penduduk, pusat)
    n = len(isi["tgl30"])
    ag["_kode"] = H.kode_kab(penduduk)
    nas, prov, kab = seri_laporan(ag, n, frozenset(k for k, v in ((wilayah or {}).get("kab") or {}).items() if (v.get("lv") or 0) >= 2))
    prov_urut = [p for _, p in sorted(((w["j31"][-1], p) for p, w in ag["prov"].items()), reverse=True)]
    t_ref = harian["tgl"].index(harian["hari_ini"]) - 1
    tambahan = [t for t in (tabel_spi(prakiraan), tabel_padi(padi)) if t]
    d = L.susun("kekeringan", "Laporan Harian Kekeringan", isi["tgl30"], METRIK, nas, prov, kab, cutoff=harian["dibuat"], hari_lengkap=isi["tgl30"][-1],
                sorot=sorot(ag, kab, wilayah, n), prakiraan=prakiraan_hujan(harian, penduduk, pusat, prov_urut, t_ref), tambahan=tambahan, sumber=SUMBER,
                dibuat=sekarang.strftime("%Y-%m-%dT%H:%M+07:00"))
    return d


def cek_stok(d):
    """Metrik stok (jiwa31, kab31) tidak boleh agregat 'jumlah'."""
    for m in d["metrik"]:
        if m["k"] in ("jiwa31", "kab31") and m["agregat"] == "jumlah":
            raise ValueError(f"metrik stok {m['k']} tidak boleh agregat jumlah")


def tulis(d):
    """Periksa dulu (galat -> ValueError), lalu simpan atomik ke public/data/kekeringan_laporan.json."""
    cek_stok(d)
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
    try:   # laporan kejadian per kab Siaga/Awas (scripts/umum/laporan_kejadian.py); gagal tidak menggagalkan laporan harian
        sp = importlib.util.spec_from_file_location("laporan_kejadian", os.path.join(H.AKAR, "scripts/umum/laporan_kejadian.py"))
        lk = importlib.util.module_from_spec(sp)
        sp.loader.exec_module(lk)
        lk.uji()
        lk.jalankan("kekeringan")
    except (Exception, SystemExit) as e:
        print(f"::warning title=kekeringan laporan_kejadian::{type(e).__name__}: {str(e)[:300]}", file=sys.stderr)


def uji():
    penduduk = {"kec": {"11|Alfa|b": 3000, "11|Zeta|a": 1000, "72|Beta|c": 10}}
    pusat = {"11|Alfa|b": [.3, .3], "11|Zeta|a": [.3, 1.2], "72|Beta|c": [.3, .3]}
    h = H.fixture()
    wil = {"kab": {"11|Alfa": {"lv": 3, "jiwa": [3000, 3000, 3000]}, "11|Zeta": {"lv": 2, "jiwa": [1000, 1000, 0]}}, "prov": {}}
    pra = {"bulan": ["2026-11", "2026-12", "2027-01"], "sumber": "ECMWF SEAS5", "bias": {"label": "belum diuji balik; bulan 2026-11: median hujan anggota 0,89 kali klimatologi (bias kering, bisa melebihkan peluang kering)"},
           "nasional": {"lead": [{"b1": 15.9}] * 3},
           "prov": {"11": {"satu_titik": False, "lead": [{"pk1": 60, "pk15": 30, "pk2": 10, "spi3": -1, "spi1": -1, "b1": 15.9}] * 3},
                    "72": {"satu_titik": True, "lead": [{"pk1": 99, "pk15": 30, "pk2": 10, "spi3": -1, "spi1": -1, "b1": 15.9}] * 3},
                    "12": {"satu_titik": False, "lead": [{"pk1": 20, "pk15": 30, "pk2": 10, "spi3": -1, "spi1": -1, "b1": 15.9}] * 3}}}
    padi = {"tanam": {"rentang": ["2026-11-15", "2026-11-15"]}, "kab": {"11|Alfa": {"gagal": 40, "turun_med": 30, "turun_normal": 10, "selisih": 20, "turun25": 55, "turun25_normal": 12, "fase_terberat": "tengah"},
                                                               "11|Zeta": {"gagal": 90, "turun_med": 70, "turun_normal": 69, "selisih": 1, "turun25": 99, "turun25_normal": 98, "fase_terberat": "tengah"}}}
    d = bangun(h, penduduk, pusat, wil, pra, padi, dt.datetime(2026, 10, 18, 7, tzinfo=H.WIB))
    assert L.periksa(d) == [], L.periksa(d)
    assert len(d["hari"]) == 30 and d["hari"][-1] == "2026-10-17" == d["hari_lengkap"] and d["cutoff"] == h["dibuat"]
    assert d["nasional"]["jiwa31"][-1] == 3010 and d["nasional"]["kab31"][-1] == 2 and d["nasional"]["hth_maks"][-1] == 40
    assert [o["kode"] for o in d["kab"]] == ["1101", "1102", "7201"] and d["prov"]["11"]["jiwa31"][-1] == 3000   # Zeta (hujan tiap hari) dimuat karena Siaga
    ag0 = dict(H.hitung(h, penduduk, pusat)[1], _kode=H.kode_kab(penduduk))
    assert [o["kode"] for o in seri_laporan(ag0, len(d["hari"]))[2]] == ["1101", "7201"]   # tanpa status: hanya HTH >= 31
    assert [s["tingkat"] for s in d["sorot"]][:2] == ["awas", "siaga"] and d["sorot"][0]["judul"] == "1 kabupaten berstatus Awas"
    assert len(d["prakiraan"]["hari"]) == 7 and d["prakiraan"]["baris"][0]["nilai"][0] is not None and len(d["tambahan"]) == 2
    tb = d["tambahan"][0]
    assert [b[0] for b in tb["baris"]] == ["Aceh", "Sumatera Utara"] and len(tb["kolom"]) == 7 and tb["baris"][0][1:3] == [60, 16]       # urut kode, bukan peluang; satu_titik (72) dibuang
    tp = d["tambahan"][1]
    assert tp["baris"][0][0] == "Alfa" and tp["baris"][0][3] == 20 and len(tp["kolom"]) == 6 and tp["baris"][0][4:] == [55, 12] and "bukan data puso" in tp["catatan"]     # urut selisih: Zeta (gagal 90%) di bawah Alfa
    assert "Belum diuji balik" in tb["catatan"] and "mencampur" in tb["catatan"] and "(nasional 15,9% / 15,9% / 15,9%)" in tb["catatan"] and "dibaca sebagai selisih" in tb["catatan"] and "sekitar 16%" not in tb["catatan"]
    pr = d["prakiraan"]
    assert pr["judul"].startswith("Hujan 7 hari ke depan paling sedikit di ") and "Open-Meteo, belum diuji balik" in pr["catatan"]
    assert ribu(14945552) == "14.946 ribu" and ribu(15124) == "15 ribu" and ribu(499) == "0 ribu"
    seri = {"kab": {"35|Sumenep": {"maks": [62], "total": 1000}, "32|Indramayu": {"maks": [62], "total": 5000}, "35|Bondowoso": {"maks": [62], "total": 800}}, "nas": {"j31": [0]}}
    assert sorot(seri, None, None, 1)[0]["judul"] == "HTH terpanjang 62 hari di Indramayu"        # seri -> penduduk terbanyak (bukan abjad terbalik)
    sj = sorot({"kab": {}, "nas": {"j31": [14960676] * 23 + [14945552] * 7}}, None, None, 30)[0]
    assert sj["judul"] == "Penduduk di HTH 31 hari atau lebih berkurang sekitar 15 ribu jiwa sepekan ini" and sj["teks"] == "Sekarang 14,95 juta jiwa, pekan lalu 14,96 juta jiwa."
    assert "nyaris tidak berubah" in sorot({"kab": {}, "nas": {"j31": [1000] * 30}}, None, None, 30)[0]["judul"]
    teks_semua = json.dumps(d, ensure_ascii=False)
    assert "\u2014" not in teks_semua, "em dash dilarang di teks tampil"
    assert "\u22121" in tb["judul"] and "1991\u20132020" in tb["catatan"] and "-1)" not in tb["judul"]       # minus dan en dash tipografis di teks tampil
    # metrik stok (keadaan per hari) tidak boleh berstatus agregat "jumlah": rentang 7 hari akan menghitung orang/kabupaten yang sama berulang
    assert {m["k"]: m["agregat"] for m in METRIK} == {"jiwa31": "rerata", "hth_maks": "maks", "kab31": "rerata", "hujan": "rerata"}
    assert all(m["agregat"] != "jumlah" for m in d["metrik"])
    import copy as _c
    bad = _c.deepcopy(d)
    bad["metrik"][0]["agregat"] = "jumlah"
    try:
        cek_stok(bad)
        raise SystemExit("cek_stok harus menolak agregat jumlah untuk metrik stok")
    except ValueError:
        pass
    assert not any("—" in json.dumps(d, ensure_ascii=False) for _ in [0])                                       # tanpa em dash
    # periksa() menolak laporan tidak sah
    import copy
    x = copy.deepcopy(d)
    x["hari_lengkap"] = "2020-01-01"
    assert any("hari_lengkap" in e for e in L.periksa(x))
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
