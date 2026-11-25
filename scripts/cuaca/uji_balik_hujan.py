"""PB-50 (F-24): uji balik peringatan hujan >= 50 mm/hari, model lawan persistensi dan klimatologi pada JUMLAH ALARM SAMA.

Masukan: public/banjir/data/cuaca_verifikasi.json (kita.seri = alarm lead 1 hari per provinsi, dari verifikasi.py) dan kejadian.json (DIBI).
Satuan: pasangan (provinsi bertitik, tanggal). Kejadian y = DIBI cuaca/banjir/longsor/bandang (hanya yang dilaporkan: far pesimis, pod optimis).
Pembagian KRONOLOGIS: 60% hari pertama seri = latih, sisanya = uji; tanpa acak. Hari sesudah (DIBI terakhir - 14 hari) tidak dinilai.
Ambang 50 mm = definisi kelas BMKG, TIDAK disetel; seri hanya menyimpan alarm (bukan mm), jadi memang tak ada ambang yang bisa dipilih ulang, dan
periode latih hanya dipakai melatih klimatologi (laju provinsi x bulan dari DIBI sejak 2023 sampai hari sebelum batas). Tidak ada keluaran periode uji
yang masuk ke pelatihan.
Pembanding: persistensi (ada kejadian DIBI kemarin di provinsi itu) dan klimatologi, keduanya disamakan jumlah alarmnya dengan model lewat
scripts/umum/pembanding.py (imbang dipecah deterministik, wajib dilaporkan). Selang 95% bootstrap blok per hari atas selisih POD.
Vonis: lolos hanya bila selisih POD terhadap pembanding TERKUAT > 0 dan batas bawah selang > 0 (gerbang inti). Selain itu hipotesis tetap.
Keluaran: public/data/gerbang/cuaca.json (format gerbang inti, dibaca public/inti/gerbang.js).

Pakai: python3 -I scripts/cuaca/uji_balik_hujan.py   |   python3 -I scripts/cuaca/uji_balik_hujan.py uji
"""
import datetime as dt, importlib.util, json, os, sys, zlib

AKAR = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".."))
KELUAR = os.path.join(AKAR, "public", "banjir", "data")
JENIS = ("cuaca", "banjir", "longsor", "banjir_longsor", "bandang")
LAG_DIBI = 14
FRAKSI_LATIH = 0.6
N_MIN = 30   # kejadian di periode uji di bawah ini: selang tak dipercaya, vonis belum_cukup_data


def _muat(nama, jalur):
    sp = importlib.util.spec_from_file_location(nama, os.path.join(AKAR, *jalur))
    m = importlib.util.module_from_spec(sp)
    sys.modules[nama] = m
    sp.loader.exec_module(m)
    return m


P = _muat("umum_pembanding", ("scripts", "umum", "pembanding.py"))
G = _muat("umum_gerbang", ("scripts", "umum", "gerbang.py"))


def hari_antara(a, b):
    d = dt.date.fromisoformat(a)
    while d.isoformat() < b:
        yield d.isoformat()
        d += dt.timedelta(days=1)


def jalankan(seri, semesta, dibi, ambang_mm=50):
    """seri {tgl: {"1": [prov]}}, semesta [prov], dibi = list kejadian -> dict hasil (tanpa menulis berkas)."""
    tgl_dibi = max((k["tanggal"] for k in dibi), default=None)
    akhir = (dt.date.fromisoformat(tgl_dibi) - dt.timedelta(days=LAG_DIBI)).isoformat() if tgl_dibi else None
    hari = sorted(d for d in seri if akhir and d <= akhir and "1" in seri[d])
    if len(hari) < 10 or not semesta:
        return None
    pot = hari[int(len(hari) * FRAKSI_LATIH)]          # hari pertama periode uji
    prov = sorted(semesta)
    ev = {(k["prov"], k["tanggal"]) for k in dibi if k["jenis"] in JENIS and k.get("prov") in set(prov)}
    # latih klimatologi: SEMUA hari DIBI sebelum pot, bukan hanya hari seri
    awal = min(t for _, t in ev) if ev else pot
    latih = [{"unit": p, "bulan": int(t[5:7]), "y": int((p, t) in ev)} for t in hari_antara(awal, pot) for p in prov]
    uji = [(p, t) for t in hari if t >= pot for p in prov]
    kemarin = lambda t: (dt.date.fromisoformat(t) - dt.timedelta(days=1)).isoformat()
    y = [int(x in ev) for x in uji]
    model = [p in seri[t]["1"] for p, t in uji]
    kl = P.klimatologi(latih, [{"unit": p, "bulan": int(t[5:7])} for p, t in uji])
    pers = [1.0 if (p, kemarin(t)) in ev else 0.0 for p, t in uji]
    pecah = [f"{t}|{p}" for p, t in uji]
    sa = lambda s: P.samakan_alarm(model, s, y, pecah=pecah)
    a_kl, a_pe = sa(kl), sa(pers)
    ks = lambda al: {k: (round(v, 4) if isinstance(v, float) else v) for k, v in P.kontingensi(al, y).items()}
    skor = {"model": ks(model), "klimatologi": ks(a_kl["alarm"]), "persistensi": ks(a_pe["alarm"])}
    kuat = max(("klimatologi", "persistensi"), key=lambda k: skor[k]["pod"] or 0)
    ak = {"klimatologi": a_kl, "persistensi": a_pe}[kuat]["alarm"]
    baris = [{"hari": t, "y": o, "m": m, "b": b} for (p, t), o, m, b in zip(uji, y, model, ak)]
    def selisih_pod(rs):
        pm = P.kontingensi([r["m"] for r in rs], [r["y"] for r in rs])["pod"]
        pb = P.kontingensi([r["b"] for r in rs], [r["y"] for r in rs])["pod"]
        return None if pm is None or pb is None else pm - pb
    sel = P.bootstrap_blok(selisih_pod, baris, "hari")
    n_kej = sum(y)
    vonis = "belum_cukup_data" if n_kej < N_MIN else None
    selang = [sel["lo"], sel["hi"]] if sel.get("lo") is not None else None
    e = G.entri_ringkas(f"POD hujan >= {ambang_mm} mm/hari (provinsi-hari)", "tinggi", f"{kuat} pada jumlah alarm sama (pembanding terkuat)", len(uji),
                        skor["model"]["pod"], skor[kuat]["pod"], selang, ["public/banjir/data/cuaca_verifikasi.json", "public/banjir/data/kejadian.json"],
                        vonis=vonis, prospektif=vonis is not None,
                        rincian={"latih_klimatologi_dibi": [awal, pot], "uji": [pot, hari[-1]],
                                 "musim_uji": f"hanya {pot}..{hari[-1]}: satu musim kemarau, tanpa musim hujan; vonis tidak berlaku sepanjang tahun",
                                 "catatan_latih": "jendela latih hanya untuk klimatologi dari kejadian DIBI; model tidak dilatih: alarm datang dari verifikasi.py dengan ambang tetap 50 mm; persistensi dan klimatologi memakai kejadian DIBI, bukan hujan terukur", "n_kejadian_uji": n_kej, "n_alarm": sum(model), "skor": skor,
                                 "imbang_dipecah": {"klimatologi": a_kl["imbang_dipecah"], "persistensi": a_pe["imbang_dipecah"]},
                                 "pod_lebih_tinggi_dari_persistensi": (skor["model"]["pod"] or 0) >= (skor["persistensi"]["pod"] or 0),
                                 "ambang": f"{ambang_mm} mm tetap (definisi BMKG), tidak disetel", "selang_bootstrap": sel},
                        catatan=f"Periode uji {pot}..{hari[-1]} hanya satu musim kemarau tanpa musim hujan, jadi kegagalan ini tidak boleh dibaca berlaku sepanjang tahun. DIBI hanya memuat yang dilaporkan dan titik sampel jarang: pod optimis terhadap kejadian tak terlapor tetapi titik 1 derajat meleset di kejadian lokal.")
    return {"hujan_50mm_lead1": e}


def main():
    d = json.load(open(os.path.join(KELUAR, "cuaca_verifikasi.json"), encoding="utf-8"))["kita"]
    dibi = json.load(open(os.path.join(KELUAR, "kejadian.json"), encoding="utf-8"))["kejadian_dibi"]
    hasil = jalankan(d["seri"], d["semesta"], dibi)
    if hasil is None:
        sys.exit("seri uji balik terlalu pendek: tidak menulis keluaran")
    p = G.tulis("cuaca", hasil)
    e = hasil["hujan_50mm_lead1"]; r = e["rincian"]["skor"]
    print(f"cuaca uji balik hujan 50 mm: n={e['n']} kejadian_uji={e['rincian']['n_kejadian_uji']} alarm={e['rincian']['n_alarm']}\n"
          f"  model POD={r['model']['pod']} FAR={r['model']['far']} | klim POD={r['klimatologi']['pod']} FAR={r['klimatologi']['far']} | pers POD={r['persistensi']['pod']} FAR={r['persistensi']['far']}\n"
          f"  selisih={e['selisih']} selang95={e['selang95']} boleh_tampil={e['boleh_tampil']} ({e['alasan']}) -> {p}")


def uji():
    prov = ["11", "12"]
    hari = [(dt.date(2026, 6, 1) + dt.timedelta(days=i)).isoformat() for i in range(60)]
    dibi = [{"tanggal": t, "jenis": "banjir", "prov": "11"} for t in hari[::3]] + [{"tanggal": "2026-09-30", "jenis": "x", "prov": "11"}]
    # model sempurna: alarm tepat di hari kejadian prov 11
    seri = {t: {"1": ["11"] if i % 3 == 0 else []} for i, t in enumerate(hari)}
    h = jalankan(seri, prov, dibi)["hujan_50mm_lead1"]
    assert h["rincian"]["skor"]["model"]["pod"] == 1.0 and h["rincian"]["skor"]["model"]["far"] == 0.0
    assert h["rincian"]["uji"][0] >= hari[int(60 * .6)] and h["rincian"]["latih_klimatologi_dibi"][1] == h["rincian"]["uji"][0]   # kronologis, tanpa tumpang tindih
    assert h["rincian"]["skor"]["klimatologi"]["tp"] + h["rincian"]["skor"]["klimatologi"]["fp"] == h["rincian"]["n_alarm"]   # alarm sama
    assert h["boleh_tampil"] is False and h["vonis_prospektif"] == "belum_cukup_data"   # n kejadian uji < N_MIN: tak lolos walau sempurna
    # model buruk: alarm di prov salah -> pod 0, tidak boleh tampil
    jelek = {t: {"1": ["12"]} for t in hari}
    assert jalankan(jelek, prov, dibi)["hujan_50mm_lead1"]["boleh_tampil"] is False
    assert jalankan({}, prov, dibi) is None and jalankan(seri, [], dibi) is None
    print("ok uji_balik_hujan")


if __name__ == "__main__":
    uji() if sys.argv[1:] == ["uji"] else main()
