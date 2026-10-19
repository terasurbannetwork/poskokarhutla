"""Laporan kejadian otomatis (pola "Makalah" emisi.app): satu halaman ringkas per kab/kota yang menembus Siaga di sebuah modul.

Pakai:  python3 scripts/umum/laporan_kejadian.py <modul...>   modul: banjir, cuaca, udara (bawaan: semua yang laporannya ada)
        python3 scripts/umum/laporan_kejadian.py uji          self-check luring

Mesinnya mesin laporan harian (scripts/umum/laporan.py, kontrak v1) dengan medan `fokus` = kode kab: halaman /kejadian.html
menggambar dengan public/inti/laporan.js yang sama. Tidak ada angka baru: semua diambil dari berkas modul yang sudah terbit.

Pemicu: kab/kota dengan metrik pemicu modul > 0 pada hari lengkap atau hari berjalan sesudahnya
(banjir: kecamatan Siaga/Awas banjir atau longsor; cuaca: kecamatan Siaga/Awas; udara: PM2,5 rata-rata 24 jam sangat tidak sehat ke atas).
Isi: kronologi (seri kab dari laporan modul), asal (banjir: hulu.json per sub-DAS; udara: asal.json lintasan mundur),
model vs alat ukur (uji balik yang sudah ada), dampak jiwa (metrik jiwa modul), dan bagian Batasan.
Modul tanpa status Siaga per kab/kota (gempa, gunung api, kekeringan, karhutla) belum memicu laporan; lihat BATASAN_MODUL.

Keluaran: <dir>/kejadian/<modul>-<kode>.json + <dir>/kejadian/index-<modul>.json. Laporan yang pemicunya berhenti tetap disimpan
SIMPAN_HARI hari sesudah hari terakhir Siaga (arsip), lalu dihapus.
"""
import datetime as dt
import importlib.util
import json
import os
import re
import sys

AKAR = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "../.."))
_s = importlib.util.spec_from_file_location("umum_laporan", os.path.join(AKAR, "scripts/umum/laporan.py"))
LAP = importlib.util.module_from_spec(_s)
_s.loader.exec_module(LAP)

SIMPAN_HARI = 14
MAKS_KRONOLOGI = 14
BLN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"]
MODUL = {
    "banjir": {"nama": "Banjir dan Longsor", "laporan": "public/banjir/data/laporan.json", "dir": "public/banjir/data", "pemicu": ["banjir_sa", "longsor_sa"],
               "jiwa": "penduduk", "jiwa_ket": "Penduduk kecamatan berstatus Siaga/Awas (WorldPop), bukan jumlah yang tergenang.",
               "sumber": [{"nama": "HydroBASINS v1c", "url": "https://www.hydrosheds.org/products/hydrobasins", "catatan": "batas sub-DAS hulu"},
                          {"nama": "Hansen Global Forest Change v1.13", "url": "https://glad.earthengine.app/view/global-forest-change", "catatan": "hutan hilang 2001 s.d. 2025"},
                          {"nama": "DIBI BNPB", "url": "https://dibi.bnpb.go.id", "catatan": "kejadian untuk uji balik status"}]},
    "cuaca": {"nama": "Cuaca Ekstrem", "laporan": "public/banjir/data/cuaca_laporan.json", "dir": "public/banjir/data", "pemicu": ["kec"],
              "jiwa": None, "jiwa_ket": "Modul cuaca belum menghitung jiwa terpapar per kab/kota.", "sumber": []},
    "udara": {"nama": "Kualitas Udara", "laporan": "public/udara/data/laporan.json", "dir": "public/udara/data", "pemicu": ["kota_siaga"],
              "jiwa": "jiwa_tidak_sehat", "jiwa_judul": "Penduduk kab/kota pada hari udara tidak sehat", "jiwa_ket": "Penduduk kab/kota (WorldPop) pada hari PM2,5 rata-rata 24 jam di atas batas tidak sehat.",
              "sumber": []},   # laporan udara sudah menyebut CAMS, FIRMS, METAR, WorldPop
}
# kalimat pemicu per modul (kab, indeks hari) -> teks; angka dari seri kab laporan modul
_kec = lambda kab, i, k: (kab.get(k) or [None] * (i + 1))[i] or 0
MODUL["banjir"]["kata"] = lambda kab, i: "; ".join(f"{_kec(kab, i, k):g} kecamatan Siaga/Awas {j}" for k, j in (("banjir_sa", "banjir"), ("longsor_sa", "longsor")) if _kec(kab, i, k))
MODUL["cuaca"]["kata"] = lambda kab, i: f"{_kec(kab, i, 'kec'):g} kecamatan Siaga/Awas cuaca ekstrem"
MODUL["udara"]["kata"] = lambda kab, i: (f"PM2,5 rata-rata 24 jam {kab['pm_jiwa'][i]:g} µg/m³ (model CAMS di titik kota), sangat tidak sehat ke atas" if (kab.get("pm_jiwa") or [None] * (i + 1))[i] is not None
                                         else "PM2,5 sangat tidak sehat ke atas")
BATASAN_UMUM = ["Laporan ini dirakit otomatis dari data modul yang sudah terbit; tidak ada angka yang ditambahkan tangan.",
                "Status Siaga adalah keluaran model Pantau Bencana, bukan penetapan status darurat oleh BNPB/BPBD."]


def _baca(rel):
    p = os.path.join(AKAR, rel)
    try:
        return json.load(open(p, encoding="utf-8"))
    except (OSError, ValueError):
        return None


def tgl(h):
    d = dt.date.fromisoformat(h)
    return f"{d.day} {BLN[d.month - 1]}"


def norm(n):
    return re.sub(r"^(kab\.?|kabupaten|kota)\s+", "", str(n).lower()).strip()


def pemicu_aktif(L, kab, spec):
    """indeks hari terakhir dengan pemicu > 0 di jendela [hari_lengkap .. akhir], atau None"""
    i0 = L["hari"].index(L["hari_lengkap"]) if L.get("hari_lengkap") in L["hari"] else len(L["hari"]) - 1
    for i in range(len(L["hari"]) - 1, i0 - 1, -1):
        if any((kab.get(k) or [None] * len(L["hari"]))[i] or 0 for k in spec["pemicu"]):
            return i
    return None


def runtun(L, kab, spec, i):
    """indeks awal runtun Siaga yang berakhir di i (hari tanpa data memutus runtun)"""
    a = i
    while a > 0 and any((kab.get(k) or [])[a - 1] or 0 for k in spec["pemicu"]):
        a -= 1
    return a


def kronologi(L, kab, spec, a, i):
    ms = L["metrik"]
    dari = max(0, min(a - 2, i - MAKS_KRONOLOGI + 1))
    baris = []
    for j in range(dari, len(L["hari"])):
        v = [kab.get(m["k"], [None] * len(L["hari"]))[j] for m in ms]
        if all(x is None for x in v):
            continue
        sg = any((kab.get(k) or [])[j] or 0 for k in spec["pemicu"])
        ket = "Siaga atau lebih" if sg else "Di bawah Siaga"
        if j == a:
            ket = "Mulai Siaga"
        if L.get("hari_lengkap") and L["hari"][j] > L["hari_lengkap"]:
            ket += " (berjalan)"
        baris.append([tgl(L["hari"][j])] + v + [ket])
    return {"id": "kronologi", "judul": f"Kronologi {kab['nama']}", "kolom": ["Tanggal"] + [m["label"] for m in ms] + ["Keadaan"], "baris": baris,
            "catatan": f"Seri harian kab/kota dari laporan harian modul; hari sesudah {tgl(L['hari_lengkap'])} masih berjalan." if L.get("hari_lengkap") else None}


def asal_banjir(kab):
    H = _baca("public/banjir/data/hulu.json")
    # nama persis (bukan norm): "Kota Bogor" tidak boleh menarik hulu Kab. Bogor
    d = next((x for x in (H or {}).get("daerah", []) if x["prov"] == kab["prov"] and x["kab"] == kab["nama"]), None)
    if not d:
        return None, f"Batas DAS hulu belum dihitung untuk {kab['nama']} (baru {len((H or {}).get('daerah', []))} daerah langganan banjir); telusur hulu belum tersedia."
    j = H["jendela"]
    rows = [[o["label"] + (", keluaran" if o["keluaran"] else ""),
             o["lalu_persen"], o["lalu_mm"], o["depan_persen"], o["km2"], o["konsesi_ha"] or None] for o in d["subdas"][:10]]
    jd = lambda w: f"{tgl(w[0])} s.d. {tgl(w[1])}" if w else "–"
    return ({"id": "asal", "judul": f"Asal hujan per sub-DAS hulu {d['kab']}",
             "kolom": ["Sub-DAS", f"Porsi hujan {jd(j['lalu'])} (%)", "Hujan (mm)", f"Porsi prakiraan {jd(j['depan'])} (%)", "Luas (km²)", "Konsesi (ha)"],
             "baris": rows,
             "catatan": d["vonis"] + f" DAS {d['das_km2']:,} km², {d['n_subdas']} sub-DAS; hutan hilang 2001 s.d. 2025 {d['hutan']['hilang_ha']:,} ha.".replace(",", ".")
                        + " Jendela hujan adalah jendela terbaru saat laporan dibuat, bukan tanggal mulai Siaga. Konsesi per sub-DAS perkiraan scanline."},
            None)


def asal_udara(kab):
    A = _baca("public/udara/data/asal.json")
    k = (A or {}).get("kota", {}).get(kab["kode"])
    if not k:
        return None, f"Lintasan mundur asap belum tersedia untuk {kab['nama']}."
    pv = LAP.PROVINSI
    rows = [[f"Provinsi {pv.get(p, p)}", p_, "–"] for p, p_ in k.get("prov_asal", [])]   # porsi di kolom kedua: tetap terlihat di layar sempit
    rows += [[f"Kompleks api {o['id']}", o["persen"], f"{o['kab']}, {pv.get(o['prov'], o['prov'])}" + (" (gambut)" if o.get("gambut") else "")] for o in k.get("kompleks", [])]
    return {"id": "asal", "judul": f"Asal asap yang sampai di {kab['nama']}", "kolom": ["Asal", "Porsi (%)", "Lokasi"], "baris": rows,
            "catatan": k.get("kalimat")}, None


def ukur(modul):
    """model vs alat ukur: uji balik yang sudah terbit, apa adanya (termasuk yang buruk)"""
    if modul in ("banjir",):
        V = _baca("public/banjir/data/validasi.json")
        if not V:
            return None
        rows = []
        for j in ("banjir", "longsor"):
            r = (V.get(j) or {}).get("siaga")
            if r:
                ci = r.get("ci", {})
                f = lambda m: f"{round(r[m] * 100)}%" + (f" ({round(ci[m][0] * 100)}–{round(ci[m][1] * 100)}%)" if ci.get(m) else "")
                rows.append([f"Status Siaga {j}", f("pod"), f("far"), f("csi")])
        return {"id": "ukur", "judul": "Model vs catatan kejadian: ketepatan status Siaga", "kolom": ["Uji", "Kejadian tertangkap", "Peringatan tanpa kejadian", "Ketepatan gabungan"],
                "baris": rows, "catatan": f"Uji balik {V.get('periode_uji')} terhadap kejadian DIBI BNPB per kabupaten-hari; hujan ERA5 sebagai prakiraan sempurna, jadi ini batas atas. Belum ada pos duga air yang terhubung."}
    if modul == "cuaca":
        V = _baca("public/banjir/data/cuaca_verifikasi.json")
        r = ((V or {}).get("kita") or {}).get("lead", {}).get("1")
        if not r:
            return None
        p = lambda x: "–" if x is None else f"{round(x * 100)}%"
        return {"id": "ukur", "judul": "Model vs catatan kejadian: hujan lebat 1 hari ke depan", "kolom": ["Uji", "Kejadian tertangkap", "Peringatan tanpa kejadian", "Ketepatan gabungan"],
                "baris": [[f"Hujan ≥ {V['kita'].get('ambang_mm')} mm/hari", p(r.get("pod")), p(r.get("far")), p(r.get("csi"))]],
                "catatan": f"Pasangan provinsi-hari {tgl(V['kita']['periode'][0])} s.d. {tgl(V['kita']['periode'][1])} terhadap kejadian DIBI BNPB."}
    if modul == "udara":
        P = _baca("public/udara/data/prakiraan.json")
        m = ((P or {}).get("galat") or {}).get("metar")
        if not m:
            return None
        sl = m.get("selang", {})
        f = lambda k: f"{round(m[k] * 100)}%" + (f" ({round(sl[k][0] * 100)}–{round(sl[k][1] * 100)}%)" if sl.get(k) else "")
        kor = P.get("koreksi") or {}
        return {"id": "ukur", "judul": "Model CAMS vs alat ukur: jarak pandang METAR bandara", "kolom": ["Uji", "Kejadian tertangkap", "Peringatan tanpa kejadian", "Ketepatan gabungan"],
                "baris": [[f"Asap tebal di {m.get('n_bandara')} bandara, {m.get('n')} hari-bandara", f("hit"), f("far"), f("csi")]],
                "catatan": f"{m.get('definisi') or 'Analisis CAMS dibandingkan dengan jarak pandang METAR'}. Ambang uji lebih rendah dari ambang Siaga laporan ini. "
                           f"Rentang 95% bootstrap. Koreksi stasiun PM2,5: {kor.get('metode') or kor.get('status') or 'belum ada'}."}
    return None


def dampak(L, kab, spec, a, i):
    k = spec.get("jiwa")
    if not k or k not in kab:
        return None
    m = next(x for x in L["metrik"] if x["k"] == k)
    rows = [[tgl(L["hari"][j]), kab[k][j]] for j in range(a, len(L["hari"])) if kab[k][j] is not None]
    if not rows:
        return None
    return {"id": "dampak", "judul": spec.get("jiwa_judul", m["label"]) + f" di {kab['nama']}", "kolom": ["Tanggal", f"{m['label']} ({m['satuan']})"], "baris": rows, "catatan": spec["jiwa_ket"]}


def satu(modul, L, kab, i, dibuat):
    spec = MODUL[modul]
    a = runtun(L, kab, spec, i)
    kp = kab["prov"]
    ms = {m["k"]: m for m in L["metrik"]}
    nilai = spec["kata"](kab, i)
    pv = LAP.PROVINSI.get(kp, kp)
    # a == 0: runtun sudah berjalan sejak awal seri laporan modul, awal sebenarnya tidak diketahui
    sejak = ("sedikitnya sejak " if a == 0 else "sejak ") + tgl(L["hari"][a])
    sorot = [{"tingkat": "siaga", "prov": kp, "judul": f"{kab['nama']}: Siaga {sejak}",
              "teks": f"{nilai} pada {tgl(L['hari'][i])}."}]
    tb = [kronologi(L, kab, spec, a, i)]
    if modul == "banjir":
        t, ket = asal_banjir(kab)
    elif modul == "udara":
        t, ket = asal_udara(kab)
    else:
        t, ket = None, None
    if t:
        tb.append(t)
    if ket:
        sorot.append({"tingkat": "info", "prov": kp, "judul": "Asal belum tersedia", "teks": ket})
    dm = dampak(L, kab, spec, a, i)
    for f in (ukur(modul), dm):
        if f:
            tb.append(f)
    if not dm:
        sorot.append({"tingkat": "info", "prov": kp, "judul": "Dampak jiwa belum dihitung",
                      "teks": spec["jiwa_ket"] if not spec.get("jiwa") else "Laporan modul belum memuat jiwa terpapar untuk kab/kota ini pada hari Siaga."})
    sorot += [s for s in L.get("sorot", []) if s.get("prov") == kp and s.get("tingkat") in ("awas", "siaga")][:3]
    sorot.append({"tingkat": "info", "judul": "Batasan", "teks": " ".join(BATASAN_UMUM)})
    for x in tb:
        if x.get("catatan") is None:
            x.pop("catatan", None)
    d = LAP.susun(modul, f"Laporan Kejadian {spec['nama']}: {kab['nama']}, {pv}", L["hari"], L["metrik"], L["nasional"], {kp: L["prov"][kp]}, [kab],
                  cutoff=L["cutoff"], hari_lengkap=L["hari_lengkap"], sorot=sorot[:8], tambahan=tb, sumber=L.get("sumber", []) + [x for x in spec["sumber"] if x["nama"] not in {y.get("nama") for y in L.get("sumber", [])}], dibuat=dibuat)
    d["fokus"] = kab["kode"]
    entri = {"modul": modul, "kode": kab["kode"], "prov": kp, "prov_nama": pv, "kab": kab["nama"], "judul": d["judul"], "mulai": L["hari"][a], "terakhir": L["hari"][i],
             "nilai": nilai, "url": f"/kejadian.html?b={modul}&k={kab['kode']}"}
    return d, entri


def bangun(modul, L, dibuat):
    """-> [(dict laporan, entri index)] untuk semua kab yang pemicunya aktif"""
    spec = MODUL[modul]
    out = []
    for kab in L.get("kab", []):
        i = pemicu_aktif(L, kab, spec)
        if i is not None:
            out.append(satu(modul, L, kab, i, dibuat))
    return out


def jalankan(modul, dibuat=None):
    spec = MODUL[modul]
    L = _baca(spec["laporan"])
    if not L or LAP.periksa(L):
        print(f"laporan_kejadian {modul}: laporan modul tidak ada atau tidak sah, dilewati", file=sys.stderr)
        return 0
    dibuat = dibuat or dt.datetime.now(dt.timezone(dt.timedelta(hours=7))).strftime("%Y-%m-%dT%H:%M+07:00")
    kel = os.path.join(AKAR, spec["dir"], "kejadian")
    os.makedirs(kel, exist_ok=True)
    # satu index per modul: banjir.yml, lintas.yml (cuaca), dan udara.yml terbit dari cache masing-masing, index bersama akan saling menimpa
    jalur_idx = os.path.join(kel, f"index-{modul}.json")
    idx = _baca(os.path.relpath(jalur_idx, AKAR)) or {"versi": "kejadian/1", "laporan": []}
    hasil = bangun(modul, L, dibuat)
    baru = {(e["modul"], e["kode"]) for _, e in hasil}
    batas = (dt.date.fromisoformat(L["hari"][-1]) - dt.timedelta(days=SIMPAN_HARI)).isoformat()
    tetap = []
    for e in idx.get("laporan", []):
        if e["modul"] != modul:
            tetap.append(e)
        elif (e["modul"], e["kode"]) not in baru:
            f = os.path.join(kel, f"{e['modul']}-{e['kode']}.json")
            if e["terakhir"] >= batas and os.path.exists(f):
                tetap.append(dict(e, aktif=False))
            elif os.path.exists(f):
                os.remove(f)
    for d, e in hasil:
        LAP.tulis(modul, d, os.path.join(kel, f"{modul}-{e['kode']}.json"))
        tetap.append(dict(e, aktif=True))
    tetap.sort(key=lambda e: (not e.get("aktif"), e["terakhir"] < L["hari"][-1], e["modul"], e["prov"], e["kab"]))
    LAP._simpan.simpan_json(jalur_idx, {"versi": "kejadian/1", "dibuat": dibuat, "laporan": tetap}) if LAP._simpan else \
        json.dump({"versi": "kejadian/1", "dibuat": dibuat, "laporan": tetap}, open(jalur_idx, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
    print(f"laporan_kejadian {modul}: {len(hasil)} aktif, {sum(1 for e in tetap if e['modul'] == modul and not e.get('aktif'))} arsip", file=sys.stderr)
    return len(hasil)


def uji():
    import copy
    hari = [(dt.date(2026, 10, 1) + dt.timedelta(days=j)).isoformat() for j in range(10)]
    ms = [{"k": "banjir_sa", "label": "Siaga atau awas banjir", "satuan": "kecamatan", "utama": True, "agregat": "maks", "arah": "naik_buruk", "desimal": 0},
          {"k": "longsor_sa", "label": "Siaga atau awas longsor", "satuan": "kecamatan", "agregat": "maks", "arah": "naik_buruk", "desimal": 0},
          {"k": "penduduk", "label": "Penduduk terpapar", "satuan": "jiwa", "agregat": "maks", "arah": "naik_buruk", "desimal": 0}]
    seri = lambda *v: list(v) + [None] * (10 - len(v))
    kA = {"prov": "96", "kode": "9605", "nama": "Maybrat", "banjir_sa": seri(0, 0, 0, 0, 0, 1, 2, 2, 0, 3), "longsor_sa": [0] * 10, "penduduk": seri(0, 0, 0, 0, 0, 900, 1800, 1800, 0, 2500)}
    kB = {"prov": "96", "kode": "9601", "nama": "Sorong", "banjir_sa": [0] * 10, "longsor_sa": [0] * 10, "penduduk": [0] * 10}
    L = LAP.susun("banjir", "Laporan Harian Banjir", hari, ms, {k: [max(a, b) for a, b in zip(kA[k], kB[k])] for k in ("banjir_sa", "longsor_sa")} | {"penduduk": [a + b for a, b in zip(kA["penduduk"], kB["penduduk"])]},
                  {"96": {k: kA[k] for k in ("banjir_sa", "longsor_sa", "penduduk")}}, [kA, kB], cutoff="2026-10-10T02:30+07:00", hari_lengkap=hari[8], dibuat="x")
    kab = lambda X: next(k for k in X["kab"] if k["kode"] == "9605")   # susun mengurutkan kab menurut kode
    assert LAP.periksa(L) == [], LAP.periksa(L)
    h = bangun("banjir", L, "2026-10-10T03:00+07:00")
    assert [e["kode"] for _, e in h] == ["9605"], [e for _, e in h]                     # Sorong tanpa Siaga tidak dilaporkan
    d, e = h[0]
    assert LAP.periksa(d) == [] and d["fokus"] == "9605", LAP.periksa(d)
    assert e["mulai"] == hari[9] and e["terakhir"] == hari[9], e                      # hari 8 = 0 memutus runtun
    kr = next(t for t in d["tambahan"] if t["id"] == "kronologi")
    assert kr["baris"][-1][0] == "10 Okt" and kr["baris"][-1][-1] == "Mulai Siaga (berjalan)", kr["baris"][-1]
    assert all(not re.match(r"\d{4}-\d\d", str(r[0])) for r in kr["baris"]), "tanggal mentah ISO di kronologi"
    dm = next(t for t in d["tambahan"] if t["id"] == "dampak")
    assert dm["baris"] == [["10 Okt", 2500]], dm["baris"]
    assert d["sorot"][0]["tingkat"] == "siaga" and "Siaga sejak 10 Okt" in d["sorot"][0]["judul"]
    assert e["nilai"] == "3 kecamatan Siaga/Awas banjir", e["nilai"]
    assert any(s["judul"] == "Batasan" for s in d["sorot"])
    # runtun tanpa putus
    L2 = copy.deepcopy(L)
    kab(L2)["banjir_sa"][8] = 1
    L2["prov"]["96"]["banjir_sa"][8] = 1
    L2["nasional"]["banjir_sa"][8] = 1
    d2, e2 = bangun("banjir", L2, "x")[0]
    assert e2["mulai"] == hari[5], e2
    # pemicu di luar jendela hari_lengkap.. (Siaga lama) tidak memicu
    L3 = copy.deepcopy(L)
    kab(L3)["banjir_sa"][9] = 0
    assert bangun("banjir", L3, "x") == []
    # laporan rusak ditolak oleh mesin yang sama
    x = copy.deepcopy(d)
    x["fokus"] = "0000"
    assert any("fokus" in g for g in LAP.periksa(x))
    assert norm("Kab. Tanjung Jabung Timur") == "tanjung jabung timur" and norm("Kota Serang") == "serang"
    print("laporan_kejadian.py uji: lulus")


if __name__ == "__main__":
    a = sys.argv[1:]
    if a[:1] == ["uji"]:
        uji()
    else:
        for m in a or [m for m in MODUL if os.path.exists(os.path.join(AKAR, MODUL[m]["laporan"]))]:
            jalankan(m)
