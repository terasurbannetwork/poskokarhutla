"""Versi publik genangan radar per kejadian (GS-14, KEPUTUSAN-GENANGAN K4): susun JSON dan aset untuk /banjir.

Pakai:  python3 scripts/banjir/genangan_terbit.py terbit [--sumber DIR] [--keluar DIR] [--izinkan-uji]
            sumber = folder `saji` keluaran scripts/siklus/genangan_kaji.py (isi: kaji/<KJ>_banjir_gfm_v<n>.json, kaji_berkas/<KJ>/banjir_gfm/v<n>/*)
                     bawaan data/raw/siklus/kaji/siklus/saji; hanya versi terbaru tiap kejadian dibaca, tidak disunting
            --izinkan-uji: kejadian KJ-UJI-* (contoh uji) ditolak tanpa flag ini; hasilnya tidak boleh di-commit (public/.assetsignore menolak aset KJ-UJI-*)
            keluar = bawaan public/banjir/data  -> genangan_kejadian.json + genangan_kejadian/<KJ>/v<n>/<kab4>_*.{png,geojson}
        python3 scripts/banjir/genangan_terbit.py uji     (self-check sintetis, tanpa jaringan)

Daftar putih, bukan salin-lalu-buang: yang tidak disebut di sini tidak pernah keluar (kecamatan, id adegan, sidik, jiwa_kab_sah, akun).
Kab tak sah tidak membawa luas, lahan, penduduk, atau sel: alasan saja, tidak pernah 0 (ALGORITMA 2).
Penduduk hanya sebagai rentang dua ujung per sumber. Sel = pusat sel dan ha, tanpa bangunan (KEAMANAN-PRIVASI versi publik).
Anggaran K5: PNG <= 120 KB, GeoJSON <= 300 KB, total aset <= 12 MB per kejadian; kab sah didahulukan, yang tak muat ditulis "dilewati".
"""
import argparse, json, math, os, re, shutil, sys, tempfile

AKAR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SUMBER = os.path.join(AKAR, "data", "raw", "siklus", "kaji", "siklus", "saji")
KELUAR = os.path.join(AKAR, "public", "banjir", "data")
BATAS_PNG, BATAS_SEL, BATAS_TOTAL = 120_000, 300_000, 12_000_000
RE_KJ = re.compile(r"KJ-[A-Z0-9-]{3,60}")
RE_BERKAS = re.compile(r"\d{4}_(sel\.geojson|(radar|asli|swir)_(pra|pasca)\.png)")
RE_TGL = re.compile(r"\d{4}-\d\d-\d\d(T\d\d:\d\d(:\d\d(\.\d{1,6})?)?(Z|[+-]\d\d:\d\d)?)?")
RE_STATUS = re.compile(r"[a-z_]{1,40}")
VONIS = {"menunggu", "lulus", "gagal", "tak_dapat_dinilai"}
STATUS_MODEL = {"hipotesis", "teruji"}
JENIS = [f"{j}_{w}" for j in ("radar", "asli", "swir") for w in ("pra", "pasca")]
SUMBER_JIWA = ("worldpop", "dukcapil", "ghsl")
TERLARANG = {"total", "jumlah_gabungan", "rata", "nik", "hp", "email", "akun", "bangunan", "kec", "sidik_masukan", "jiwa_kab_sah"}
CATATAN = "Penduduk di area genangan, bukan korban. Radar satu lintasan, buta di permukiman padat: angka bisa jauh di bawah kenyataan."


def tgl(x):
    """Tanggal ISO atau None: teks bebas dari berkas sumber tidak pernah diteruskan ke publik."""
    return x if isinstance(x, str) and RE_TGL.fullmatch(x) else None


def bersih_atribusi(a):
    """Nama produk internal tidak tampil di publik (pemilik): frasa \"ringkasan oleh Pantau Bencana\" dibuang, atribusi Copernicus tetap."""
    return re.sub(r"[;,]?\s*ringkasan oleh Pantau Bencana", "", a).strip()


def angka(x):
    return isinstance(x, (int, float)) and not isinstance(x, bool) and math.isfinite(x)


def baca(jalur):
    with open(jalur, encoding="utf-8") as f:
        return json.load(f)


def versi_terbaru(dir_kaji):
    """{kj: (n, jalur)} dari <KJ>_banjir_gfm_v<n>.json; nama di luar pola diabaikan."""
    out = {}
    for nama in sorted(os.listdir(dir_kaji)):
        m = re.fullmatch(r"(KJ-[A-Z0-9-]{3,60})_banjir_gfm_v(\d{1,4})\.json", nama)
        if m and (m[1] not in out or int(m[2]) > out[m[1]][0]):
            out[m[1]] = (int(m[2]), os.path.join(dir_kaji, nama))
    return out


def sel_sah(jalur):
    """GeoJSON sel: hanya Point dengan properti {ha}; selain itu ditolak (tidak boleh membawa data bangunan atau orang)."""
    with open(jalur, encoding="utf-8") as f:
        g = json.load(f)
    if g.get("type") != "FeatureCollection" or not isinstance(g.get("features"), list):
        return False
    for ft in g["features"]:
        c = (ft.get("geometry") or {}).get("coordinates")
        if (ft.get("geometry") or {}).get("type") != "Point" or not (isinstance(c, list) and len(c) == 2 and all(angka(v) for v in c)):
            return False
        if set(ft.get("properties") or {}) - {"ha"}:
            return False
    return True


def rentang(o):
    return {"bawah": o["bawah"], "atas": o["atas"]} if isinstance(o, dict) and o.get("tersedia") is True and angka(o.get("bawah")) and angka(o.get("atas")) and o["bawah"] <= o["atas"] else None


def kab_publik(k, dir_berkas, dir_tujuan, anggaran):
    """Satu kab: daftar putih. anggaran = [byte_terpakai]; berkas disalin hanya bila lolos nama, ukuran, isi, dan sisa anggaran."""
    luas = k.get("luas") or {}
    sah = k.get("sah") is True and angka(luas.get("baru_ha"))
    o = {"kab": str(k.get("kab") or k["kab4"]), "kab4": str(k["kab4"]), "sah": sah, "status": k["status"] if isinstance(k.get("status"), str) and RE_STATUS.fullmatch(k["status"]) else "",
         "lintasan": tgl(k.get("lintasan")), "pra": tgl(k.get("pra"))}
    if angka(k.get("cakupan_pct")):
        o["cakupan_pct"] = k["cakupan_pct"]
    if not sah:
        o["alasan"] = str(k.get("alasan") or "tidak teramati cukup")[:120]
    else:
        o["luas"] = {n: luas[n] for n in ("baru_ha", "teramati_ha", "persen_teramati", "luas_kab_ha", "persen_kab") if angka(luas.get(n))}
        if k.get("kisi_kasar") is True:
            o["kisi_kasar"] = True
        lahan = {str(c): {"ha": v["ha"], "nama": str(v.get("nama") or c)} for c, v in (k.get("lahan") or {}).items() if isinstance(v, dict) and angka(v.get("ha")) and v["ha"] > 0}
        if lahan:
            o["lahan"] = lahan
        pend = {s: r for s in SUMBER_JIWA if (r := rentang((k.get("penduduk") or {}).get(s)))}
        if pend:
            o["penduduk"] = pend
    skip = []

    def salin(nama, batas):
        src = os.path.join(dir_berkas, nama)
        if not RE_BERKAS.fullmatch(nama) or not os.path.isfile(src):
            return False
        n = os.path.getsize(src)
        if n > batas or anggaran[0] + n > BATAS_TOTAL:
            skip.append(nama)
            return False
        if nama.endswith(".geojson") and not sel_sah(src):
            skip.append(nama)
            return False
        os.makedirs(dir_tujuan, exist_ok=True)
        shutil.copyfile(src, os.path.join(dir_tujuan, nama))
        anggaran[0] += n
        return True

    if sah and salin(f"{k['kab4']}_sel.geojson", BATAS_SEL):
        o["sel"] = f"{k['kab4']}_sel.geojson"
    cit = {}
    for j in JENIS:
        c = (k.get("citra") or {}).get(j) or {}
        if c.get("berkas") and salin(str(c["berkas"]), BATAS_PNG):
            cit[j] = {"berkas": c["berkas"], "tanggal": tgl(c.get("tanggal"))}
            if angka(c.get("awan_pct")):
                cit[j]["awan_pct"] = c["awan_pct"]
        else:
            cit[j] = {"status": "dilewati: melebihi anggaran" if c.get("berkas") else str(c.get("status") or "tidak ada")[:80]}
    o["citra"] = cit
    return o, skip


def kejadian_publik(kj, n, jalur, sumber, keluar):
    d = baca(jalur)
    if d.get("kejadian") != kj or d.get("model") != "banjir_gfm":
        raise ValueError(f"{jalur}: kejadian atau model tidak cocok")
    dir_berkas = os.path.join(sumber, "kaji_berkas", kj, "banjir_gfm", f"v{n}")
    tujuan = os.path.join(keluar, "genangan_kejadian", kj, f"v{n}")
    if os.path.isdir(os.path.join(keluar, "genangan_kejadian", kj)):
        shutil.rmtree(os.path.join(keluar, "genangan_kejadian", kj))   # hanya versi terbaru tinggal; tidak ada berkas yatim
    kab, dilewati, anggaran = [], [], [0]
    for k in sorted(d.get("kab") or [], key=lambda x: (x.get("sah") is not True, str(x.get("kab4")))):   # kab sah dahulu: anggaran habis, yang tak sah yang terpotong
        if re.fullmatch(r"\d{4}", str(k.get("kab4"))) and not isinstance(k.get("kab4"), bool):
            o, s = kab_publik(k, dir_berkas, tujuan, anggaran)
            kab.append(o)
            dilewati += s
    kab.sort(key=lambda x: x["kab4"])
    sah = [x for x in kab if x["sah"]]
    r = d.get("ringkas") or {}
    sumber_r = r.get("sumber_rentang") if r.get("sumber_rentang") in SUMBER_JIWA else None
    rg = r.get("rentang")
    rg = rg if sumber_r and isinstance(rg, list) and len(rg) == 2 and all(angka(v) for v in rg) and rg[0] <= rg[1] else None
    ringkas = {"kab_sah": len(sah), "kab_semua": len(kab), "luas_baru_ha": round(sum(x["luas"]["baru_ha"] for x in sah), 1),
               "lintasan_terakhir": tgl(r.get("lintasan_terakhir")), "rentang": rg, "sumber_rentang": sumber_r if rg else None,
               "kab_rentang": sum(1 for x in sah if sumber_r in x.get("penduduk", {})) if rg else 0,
               "satuan": "jiwa", "metrik": "penduduk di area genangan", "vonis": r.get("vonis") if r.get("vonis") in VONIS else "menunggu",
               "status_model": d.get("status_model") if d.get("status_model") in STATUS_MODEL else "hipotesis", "pil": "Hipotesis: belum lulus uji balik" if (d.get("status_model") not in STATUS_MODEL or d.get("status_model") == "hipotesis") else "Teruji", "sumber": "Copernicus GFM"}
    ada_jiwa = any("penduduk" in x for x in sah)
    atribusi = [bersih_atribusi(a) for a in (d.get("atribusi") or []) if isinstance(a, str) and (ada_jiwa or "Open Buildings" not in a)]
    am = d.get("ambang") or {}
    ambang = {x: am[x] for x in ("cakupan_pct_min", "zona_bawah") if angka(am.get(x))}
    return {"kj": kj, "mulai": tgl(d.get("mulai")), "versi": n, "ambang": ambang, "dibuat": tgl(d.get("dibuat")), "ringkas": ringkas, "catatan": CATATAN, "atribusi": atribusi, "kab": kab}, dilewati


def kunci_terlarang(x, jalur=""):
    if isinstance(x, dict):
        for k, v in x.items():
            if k in TERLARANG:
                yield f"{jalur}/{k}"
            yield from kunci_terlarang(v, f"{jalur}/{k}")
    elif isinstance(x, list):
        for i, v in enumerate(x):
            yield from kunci_terlarang(v, f"{jalur}[{i}]")


def terbit(sumber=SUMBER, keluar=KELUAR, izinkan_uji=False):
    dir_kaji = os.path.join(sumber, "kaji")
    pilihan = versi_terbaru(dir_kaji) if os.path.isdir(dir_kaji) else {}
    daftar, lewat = [], []
    for kj, (n, jalur) in pilihan.items():
        if RE_KJ.fullmatch(kj):
            if kj.startswith("KJ-UJI-") and not izinkan_uji:
                print(f"{kj}: kejadian uji tidak diterbitkan (butuh --izinkan-uji)")
                continue
            k, s = kejadian_publik(kj, n, jalur, sumber, keluar)
            daftar.append(k)
            lewat += [f"{kj}/{x}" for x in s]
    daftar.sort(key=lambda k: (str(k["mulai"]), k["kj"]), reverse=True)
    if not daftar:
        print("tidak ada hasil banjir_gfm; tidak ada yang ditulis")
        return None
    out = {"v": 1, "dibuat": max((k["dibuat"] or "" for k in daftar), default="") or None, "bahaya": "banjir", "sumber": "Copernicus GFM", "yakin": "estimasi-model", "kejadian": daftar}
    salah = list(kunci_terlarang(out))
    if salah:
        raise ValueError(f"kunci terlarang di keluaran publik: {salah[:3]}")
    os.makedirs(keluar, exist_ok=True)
    tmp = os.path.join(keluar, "genangan_kejadian.json.tmp")
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, separators=(",", ":"), sort_keys=True)
    os.replace(tmp, os.path.join(keluar, "genangan_kejadian.json"))
    print(f"{len(daftar)} kejadian -> {os.path.join(keluar, 'genangan_kejadian.json')}; {len(lewat)} berkas dilewati {lewat[:5]}")
    return out


def uji():
    with tempfile.TemporaryDirectory() as t:
        sumber, keluar = os.path.join(t, "saji"), os.path.join(t, "keluar")
        kj = "KJ-UJI-A"
        os.makedirs(os.path.join(sumber, "kaji"))
        png = b"\x89PNG" + b"\0" * 100

        def tulis(n, rel, isi):
            p = os.path.join(sumber, "kaji_berkas", kj, "banjir_gfm", f"v{n}", rel)
            os.makedirs(os.path.dirname(p), exist_ok=True)
            with open(p, "wb") as f:
                f.write(isi)

        def fc(prop):
            return json.dumps({"type": "FeatureCollection", "sel_m": 330, "features": [{"type": "Feature", "geometry": {"type": "Point", "coordinates": [97.1, 4.2]}, "properties": prop}]}).encode()
        cit = lambda b: {"berkas": b, "tanggal": "2025-11-28T23:11:47Z", "awan_pct": 3}
        sah = {"kab": "A", "kab4": "1103", "sah": True, "status": "ok", "lintasan": "2025-11-28T23:11:47Z", "pra": "2025-11-10T23:11:03Z", "cakupan_pct": 40.0, "kisi_kasar": False,
               "luas": {"baru_ha": 100.5, "teramati_ha": 900.0, "persen_teramati": 11.2, "luas_kab_ha": 5000.0, "persen_kab": 2.0},
               "lahan": {"40": {"ha": 90.0, "nama": "Pertanian"}, "50": {"ha": 0, "nama": "Terbangun"}},
               "penduduk": {"worldpop": {"tersedia": True, "bawah": 3, "atas": 9}, "dukcapil": {"tersedia": True, "bawah": 5, "atas": 2}, "ghsl": {"tersedia": False, "alasan": "x"}},
               "kec": {"Kec": {"luas_ha": 1}}, "citra": {"radar_pra": cit("1103_radar_pra.png"), "radar_pasca": cit("1103_radar_pasca.png"), "asli_pra": {"status": "tertutup awan"}}}
        lemah = {"kab": "B", "kab4": "1104", "sah": False, "status": "ok", "alasan": "sinyal lemah", "lintasan": "2025-11-27T11:50:35Z", "pra": "2025-11-16T11:41:24Z",
                 "luas": {"baru_ha": 0}, "lahan": {"40": {"ha": 1}}, "penduduk": {"worldpop": {"tersedia": True, "bawah": 0, "atas": 0}}, "citra": {"radar_pra": cit("1104_radar_pra.png")}}
        kaji = {"model": "banjir_gfm", "kejadian": kj, "mulai": "2025-11-26", "dibuat": "2026-11-24T17:15:49Z", "status_model": "hipotesis", "pil": "Hipotesis: belum lulus uji balik",
                "atribusi": ["Copernicus GFM", "Google Open Buildings v3, CC BY 4.0"], "ambang": {"cakupan_pct_min": 10, "zona_bawah": 0.5, "beku": True}, "sidik_masukan": "x", "jiwa_kab_sah": {"worldpop": {"kab_ikut": 1}},
                "ringkas": {"rentang": [3, 9], "sumber_rentang": "worldpop", "vonis": "menunggu", "lintasan_terakhir": "2025-12-04"}, "kab": [lemah, sah]}
        for n in (1, 2):
            with open(os.path.join(sumber, "kaji", f"{kj}_banjir_gfm_v{n}.json"), "w") as f:
                json.dump(dict(kaji, versi=n), f)
        tulis(1, "1103_radar_pra.png", png)       # versi lama tidak ikut
        tulis(2, "1103_radar_pra.png", png)
        tulis(2, "1103_radar_pasca.png", b"\0" * (BATAS_PNG + 1))   # terlalu besar -> dilewati
        tulis(2, "1104_radar_pra.png", png)
        tulis(2, "1103_sel.geojson", fc({"ha": 1.2}))
        os.makedirs(os.path.join(keluar, "genangan_kejadian", kj, "v1"))   # sisa lama harus hilang
        o = terbit(sumber, keluar, True)
        k = o["kejadian"][0]
        assert k["ambang"] == {"cakupan_pct_min": 10, "zona_bawah": 0.5} and k["versi"] == 2 and k["ringkas"]["kab_sah"] == 1 and k["ringkas"]["kab_semua"] == 2 and k["ringkas"]["luas_baru_ha"] == 100.5
        a, b = k["kab"]
        assert a["sah"] and "luas" in a and "kec" not in a and set(a["lahan"]) == {"40"}                      # kelas 0 ha tidak digambar
        assert a["penduduk"] == {"worldpop": {"bawah": 3, "atas": 9}}                                         # dukcapil bawah > atas dan ghsl tak tersedia dibuang
        assert not b["sah"] and not {"luas", "lahan", "penduduk", "sel"} & set(b) and b["alasan"] == "sinyal lemah"   # tak sah: tanpa angka, bukan 0
        assert a["sel"] == "1103_sel.geojson" and a["citra"]["radar_pra"]["berkas"] == "1103_radar_pra.png"
        assert a["citra"]["radar_pasca"]["status"].startswith("dilewati") and a["citra"]["asli_pra"]["status"] == "tertutup awan"
        assert k["ringkas"]["kab_rentang"] == 1 and any("Open Buildings" in x for x in k["atribusi"])
        dirv = os.path.join(keluar, "genangan_kejadian", kj)
        assert os.listdir(dirv) == ["v2"] and "1103_radar_pasca.png" not in os.listdir(os.path.join(dirv, "v2"))
        assert terbit(sumber, keluar, True) == o                                                                    # idempoten
        # sel yang membawa properti lain (mis. bangunan) ditolak
        tulis(2, "1103_sel.geojson", fc({"ha": 1.2, "nama": "x"}))
        assert "sel" not in terbit(sumber, keluar, True)["kejadian"][0]["kab"][0]
        # tanpa penduduk: atribusi Open Buildings tidak ikut
        for p in ("kab",):
            kaji[p][1]["penduduk"] = {}
        with open(os.path.join(sumber, "kaji", f"{kj}_banjir_gfm_v3.json"), "w") as f:
            json.dump(dict(kaji, versi=3), f)
        k3 = terbit(sumber, keluar, True)["kejadian"][0]
        assert k3["versi"] == 3 and k3["ringkas"]["kab_rentang"] == 0 and not any("Open Buildings" in x for x in k3["atribusi"]) and not os.path.exists(dirv)   # v3 tanpa berkas: folder lama hilang, tak ada yatim
        # kejadian uji ditolak tanpa flag; teks bebas di sumber tidak lolos ke publik
        assert terbit(sumber, keluar, False) is None
        assert not RE_KJ.fullmatch("KJ-ABC-1\n") and not RE_BERKAS.fullmatch("1103_sel.geojson\n")
        assert tgl("2025-11-28T23:11:47Z") and tgl("2025-11-28") and tgl("<script>") is None and tgl("2025-11-28\n") is None and tgl(5) is None
        assert bersih_atribusi("Copernicus GFM, EODC; ringkasan oleh Pantau Bencana. Syarat: x") == "Copernicus GFM, EODC. Syarat: x"
        kaji["ringkas"].update({"vonis": "lulus!!", "lintasan_terakhir": "<b>x</b>"})
        kaji["kab"][1]["lintasan"] = "<img>"
        kaji["atribusi"] = ["Copernicus GFM; ringkasan oleh Pantau Bencana", "Google Open Buildings v3"]
        with open(os.path.join(sumber, "kaji", f"{kj}_banjir_gfm_v4.json"), "w") as f:
            json.dump(dict(kaji, versi=4), f)
        k4 = terbit(sumber, keluar, True)["kejadian"][0]
        assert k4["ringkas"]["vonis"] == "menunggu" and k4["ringkas"]["lintasan_terakhir"] is None and k4["kab"][0]["lintasan"] is None
        assert not any("Pantau Bencana" in a for a in k4["atribusi"]) and "Copernicus GFM" in k4["atribusi"]
        # kunci terlarang menggagalkan terbit
        assert list(kunci_terlarang({"a": [{"total": 1}]})) == ["/a[0]/total"]
        # nama berkas di luar daftar izin tidak disalin
        _, s = kab_publik(dict(sah, citra={"radar_pra": {"berkas": "../x.png"}}), t, os.path.join(t, "z"), [0])
        assert not os.path.exists(os.path.join(t, "z"))
        # anggaran total: berkas yang melewatinya dilewati
        _, s = kab_publik(sah, os.path.join(sumber, "kaji_berkas", kj, "banjir_gfm", "v2"), os.path.join(t, "y"), [BATAS_TOTAL - 10])
        assert "1103_radar_pra.png" in s
    print("ok")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("mode", choices=["terbit", "uji"])
    ap.add_argument("--sumber", default=SUMBER)
    ap.add_argument("--keluar", default=KELUAR)
    ap.add_argument("--izinkan-uji", action="store_true")
    a = ap.parse_args()
    uji() if a.mode == "uji" else terbit(a.sumber, a.keluar, a.izinkan_uji)
