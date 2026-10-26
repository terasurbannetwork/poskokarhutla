#!/usr/bin/env python3
"""Gambar pratinjau tautan (Open Graph 1200x630) + meta per halaman, dari data yang sama dengan situs.

  python3 scripts/og/buat.py            hitung angka -> public/data/og/meta.json, render PNG, cap meta HTML
  python3 scripts/og/buat.py --stempel  hanya cap blok <!-- og --> di HTML dari meta.json yang sudah ada (tanpa Chrome)

PNG: public/data/og/{ringkasan,peta,banjir,gempa,gunungapi,kekeringan,cuaca,udara,umum,prov-<kode>}.png, dirender Chrome headless dari public/og/template.html.
Sengaja di public/data/og/ (bukan public/og/): public/data ikut cache Actions "data-", jadi semua workflow yang menerbitkan
(data, banjir, terbit) ikut membawa gambar terbaru walau hanya titik.yml yang merender.
Cap: blok <!-- og --> ... <!-- /og --> di HTML berisi og:*, twitter:*, canonical, theme-color; og:image diberi ?v=<tanggal>
supaya platform sosial mengambil gambar baru tiap hari. Halaman tanpa blok: disisipkan setelah <meta name="description">
(hanya untuk HALAMAN di bawah; halaman lain cukup menambah <!-- og --><!-- /og --> sendiri). Stdlib saja.
"""
import functools, html, time, http.server, json, os, re, shutil, subprocess, sys, tempfile, threading
from datetime import datetime, timedelta, timezone
from pathlib import Path

AKAR = Path(__file__).resolve().parents[2]
PUB = AKAR / "public"
OG = PUB / "data" / "og"
SITUS = os.environ.get("SITUS", "https://pantau.terasurban.com")
LV = ["#5a9e74", "#e3b94e", "#e58a45", "#c9503a"]
BULAN = "Januari Februari Maret April Mei Juni Juli Agustus September Oktober November Desember".split()
HARI = "Senin Selasa Rabu Kamis Jumat Sabtu Minggu".split()
MAKS_KB = 300
HANYA = [x for x in os.environ.get("OG_HANYA", "").split(",") if x]   # uji lokal: OG_HANYA=peta,banjir
LEG_API = [[LV[3], "Prioritas"], [LV[2], "Siaga"], [LV[1], "Patroli"]]

baca = lambda p: json.loads((PUB / p).read_text("utf-8"))
angka = lambda n: f"{int(round(n or 0)):,}".replace(",", ".")


def jiwa(v):
    if v >= 1e6: return f"{v / 1e6:.1f}".replace(".", ",") + " jt"
    if v >= 1e3: return angka(v / 1e3) + " rb"
    return angka(v)


def tgl_pendek(t): d = datetime.fromisoformat(t); return f"{d.day} {BULAN[d.month - 1][:3]}"
def tgl_panjang(t): d = datetime.fromisoformat(t); return f"{HARI[d.weekday()]}, {d.day} {BULAN[d.month - 1]} {d.year}"


# deskripsi per subrute banjir (kunci = tab di public/bencana.json); tab tanpa entri memakai desk halaman utama
TAB_BANJIR = {
    "peta": ("Peta banjir langsung", "Peta status banjir, longsor, dan rob per kecamatan untuk 38 provinsi; klik kecamatan untuk rincian."),
    "prakiraan": ("Prakiraan banjir", "Prakiraan hujan dan status banjir per kecamatan untuk beberapa hari ke depan."),
    "rob": ("Rob dan pasang laut", "Prakiraan banjir rob dan pasang laut di pesisir Indonesia."),
    "sungai": ("Debit sungai", "Prakiraan debit sungai dan potensi luapan di daerah aliran sungai."),
    "posko": ("Posko banjir", "Rekomendasi lokasi posko banjir dan sarana terdekat dari kecamatan terdampak."),
    "daftar": ("Daftar kecamatan", "Daftar kecamatan berstatus banjir, urut dari yang paling rawan."),
    "provinsi": ("Banjir per provinsi", "Ringkasan status banjir, longsor, dan rob per provinsi."),
    "tren": ("Tren banjir", "Tren status banjir dan curah hujan dari hari ke hari."),
    "insight": ("Insight banjir", "Pembacaan angka banjir hari ini: yang naik, yang turun, dan yang perlu dipantau."),
    "keputusan": ("Keputusan banjir", "Bahan keputusan siaga banjir: wilayah, waktu, dan sarana."),
    "simulasi": ("Simulasi banjir", "Simulasi genangan dan kesiapan evakuasi untuk kecamatan pilihan."),
    "sarana": ("Sarana banjir", "Sarana di sekitar kecamatan terdampak: posko, puskesmas, jalur evakuasi."),
    "metode": ("Metode banjir", "Cara status banjir dihitung, sumber data, dan batasnya."),
    "informasi": ("Informasi banjir", "Panduan sebelum, saat, dan sesudah banjir, longsor, dan rob."),
}


def og_banjir(nama):
    """Gambar + halaman OG untuk /banjir/ dan tiap subrute (/banjir/<tab>). Subrute memakai gambar banjir, bukan gambar karhutla."""
    bm, st = baca("banjir/data/meta.json"), baca("banjir/data/status.json")["kec"]
    nb, ns, lvb, h3, nkp, nm = [0] * 4, 0, {}, 0, {}, bm.get("provinsi") or nama
    for kk, v in st.items():
        l = (v.get("b") or [0])[0] or 0; nb[l] += 1; pv = kk.split("|")[0]; lvb[pv] = max(lvb.get(pv, 0), l); nkp[pv] = nkp.get(pv, 0) + (l > 0); h3 = max(h3, v.get("h3") or 0)
    ns, tb = nb[1] + nb[2] + nb[3], tgl_pendek(bm["hari_wib"])
    gb = {"sub": "Banjir, longsor & rob", "tgl": f"{tgl_panjang(bm['hari_wib'])} · data {bm.get('dibuat', '')[11:16].replace(':', '.')} WIB", "lv": max(lvb.values(), default=0), "eyebrow": f"Prakiraan banjir · {tb}", "judul": f"{angka(ns)} kecamatan berstatus banjir hari ini",
                   "angka": [[angka(ns), "kecamatan waspada ke atas", LV[2]], [angka(nb[2] + nb[3]), "kecamatan siaga/awas", LV[3]], [angka(h3) + " mm", "hujan 3 hari maksimum", "#4f8fc4"]],
                   "lvProv": lvb, "titik": False, "daftarJudul": "Kecamatan berstatus per provinsi",
                   "daftar": [[nm.get(k, k), v, angka(v) + " kec.", lvb.get(k, 0)] for k, v in sorted(nkp.items(), key=lambda x: -x[1])[:5]], "legenda": [[LV[3], "Awas"], [LV[2], "Siaga"], [LV[1], "Waspada"]]}
    hb = {"judul": "Centurisk97 · Banjir, longsor & rob hari ini", "gambar": "banjir",
                     "desk": f"{tb}: {angka(ns)} kecamatan berstatus banjir ({angka(nb[3])} awas, {angka(nb[2])} siaga), hujan 3 hari hingga {angka(h3)} mm. Prakiraan per kecamatan untuk 38 provinsi."}
    tabs = next((b["tab"] for b in baca("bencana.json")["bencana"] if b["id"] == "banjir"), [])
    halaman = {"/banjir/": hb}
    for tb_ in tabs:
        j, d = TAB_BANJIR.get(tb_, (tb_.capitalize(), hb["desk"]))
        halaman["/banjir/" + tb_] = {"judul": f"{j} · Centurisk97 Banjir, Longsor & Rob", "gambar": "banjir", "desk": f"{tb}: {d}"}
    return {"gambar": {"banjir": gb}, "halaman": halaman}


UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"
BIRU = "#4f8fc4"
wib = lambda: datetime.now(timezone(timedelta(hours=7)))


def _og(id_, gb, judul, desk):
    """Bentuk keluaran sama dengan og_banjir: satu gambar + satu baris halaman '/<id>/' (tab ikut lewat profil() di src/og_meta.js)."""
    return {"gambar": {id_: gb}, "halaman": {f"/{id_}/": {"judul": judul, "gambar": id_, "desk": desk}}}


def og_gempa(nama):
    """Gempa M5+ terbaru dari BMKG (gempaterkini.json, 15 kejadian terakhir; butuh UA peramban). Sumber disebut di gambar dan deskripsi."""
    import urllib.request
    req = urllib.request.Request("https://data.bmkg.go.id/DataMKG/TEWS/gempaterkini.json", headers={"User-Agent": UA})
    L = json.load(urllib.request.urlopen(req, timeout=30))["Infogempa"]["gempa"]
    E = []
    for g in L:
        la, lo = (float(x) for x in g["Coordinates"].split(","))
        E.append({"t": datetime.fromisoformat(g["DateTime"]), "m": float(g["Magnitude"]), "d": g["Kedalaman"], "w": re.sub(r"^\d+ km \S+ ", "", g["Wilayah"]).title(), "la": la, "lo": lo})
    if not E: raise ValueError("gempaterkini kosong")
    now = datetime.now(timezone.utc); mulai = now - timedelta(days=7)
    if len(E) >= 15 and min(e["t"] for e in E) > mulai: mulai = min(e["t"] for e in E)   # daftar BMKG terpotong 15: hitung sejak kejadian tertuanya
    E = sorted((e for e in E if e["t"] >= mulai), key=lambda e: -e["m"])
    if not E: raise ValueError("tak ada gempa M5+ dalam 7 hari")
    mk, dr = lambda v: f"{v:.1f}".replace(".", ","), lambda e: e["t"] + timedelta(hours=7)
    lv = lambda v: 3 if v >= 6.5 else 2 if v >= 6 else 1 if v >= 5.5 else 0
    n6, t0, top = sum(e["m"] >= 6 for e in E), tgl_pendek((mulai + timedelta(hours=7)).strftime("%Y-%m-%d")), E[0]
    gb = {"sub": "Gempa bumi · M 5+ · data BMKG", "tgl": f"{tgl_panjang(wib().strftime('%Y-%m-%d'))} · sumber BMKG (gempaterkini)", "lv": lv(top["m"]),
          "eyebrow": f"Gempa M 5+ · sejak {t0}", "judul": f"{angka(len(E))} gempa M 5+ tercatat BMKG sejak {t0}, terkuat M {mk(top['m'])}",
          "angka": [[angka(len(E)), f"gempa M 5+ sejak {t0}", LV[2]], ["M " + mk(top["m"]), "gempa terkuat", LV[3]], [angka(n6), "gempa M 6+", BIRU]],
          "titik": False, "pts": [[e["lo"], e["la"], lv(e["m"])] for e in reversed(E)], "legenda": [[LV[3], "M 6,5+"], [LV[2], "M 6+"], [LV[1], "M 5,5+"], [LV[0], "M 5+"]],
          "daftarJudul": "Gempa terkuat (BMKG)", "daftar": [[e["w"], e["m"] - 4, "M " + mk(e["m"]), lv(e["m"])] for e in E[:5]]}
    ws = f"{top['w']}, {dr(top).day} {BULAN[dr(top).month - 1][:3]}"
    return _og("gempa", gb, "Centurisk97 · Gempa bumi M 5+ terbaru",
               f"{t0}: {angka(len(E))} gempa M 5+ tercatat BMKG, terkuat M {mk(top['m'])} ({ws}, kedalaman {top['d']}). Peta, riwayat sejak 1900, dan guncangan per wilayah. Sumber: BMKG.")


def og_gunungapi(nama):
    """Status gunung api harian dari MAGMA Indonesia (PVMBG) lewat public/banjir/data/gunungapi_status.json."""
    g = baca("banjir/data/gunungapi_status.json"); jl = g["jumlah_level"]; tb = tgl_pendek(g["dibuat"][:10])
    n4, n3, n2 = jl.get("4", 0), jl.get("3", 0), jl.get("2", 0)
    kuat = sorted((x for x in g["gunung"] if x["level"] >= 3), key=lambda x: (-x["level"], -(x.get("penduduk_radius") or 0)))
    gb = {"sub": "Gunung api · status PVMBG", "tgl": f"{tgl_panjang(g['dibuat'][:10])} · data {g['dibuat'][11:16].replace(':', '.')} WIB · MAGMA Indonesia", "lv": 3 if n4 else 2 if n3 else 1 if n2 else 0,
          "eyebrow": f"Status gunung api · {tb}", "judul": f"{angka(n3 + n4)} gunung api berstatus siaga atau awas hari ini",
          "angka": [[angka(n4), "gunung api awas (level IV)", LV[3]], [angka(n3), "gunung api siaga (level III)", LV[2]], [angka(n2), "gunung api waspada (level II)", LV[1]]],
          "titik": False, "pts": [[x["lon"], x["lat"], x["level"] - 1] for x in sorted(g["gunung"], key=lambda x: x["level"]) if x["level"] >= 2],
          "legenda": [[LV[3], "Awas"], [LV[2], "Siaga"], [LV[1], "Waspada"]], "daftarJudul": "Siaga/awas, jiwa dalam radius bahaya",
          "daftar": [[x["nama"], x.get("penduduk_radius") or 0, (jiwa(x["penduduk_radius"]) if x.get("penduduk_radius") else "Siaga" if x["level"] == 3 else "Awas"), x["level"] - 1] for x in kuat[:5]]}
    return _og("gunungapi", gb, "Centurisk97 · Status gunung api hari ini",
               f"{tb}: {angka(n4)} gunung api awas, {angka(n3)} siaga, {angka(n2)} waspada" + (f" ({', '.join(x['nama'] for x in kuat[:3])})" if kuat else "") + ". Sumber: MAGMA Indonesia, PVMBG (Badan Geologi).")


def og_kekeringan(nama):
    """Kekeringan dari public/data/kekeringan_meta.json + kekeringan_wilayah.json (kab_n kumulatif: >= waspada, >= siaga, >= awas)."""
    m, w = baca("data/kekeringan_meta.json"), baca("data/kekeringan_wilayah.json")["prov"]; nas = m["nasional"]; k = nas["kab_n"]
    awas, siaga, waspada, ja, tb = k[2], k[1] - k[2], k[0] - k[1], nas["jiwa"][2], tgl_pendek(m["hari_ini"])
    gb = {"sub": "Kekeringan · hujan, tanah & indeks kekeringan", "tgl": f"{tgl_panjang(m['hari_ini'])} · data {m['dibuat'][11:16].replace(':', '.')} WIB", "lv": 3 if awas else 2 if siaga else 1,
          "eyebrow": f"Status kekeringan · {tb}", "judul": f"{angka(awas)} kabupaten/kota berstatus awas kekeringan, {jiwa(ja)} jiwa di kecamatan awas",
          "angka": [[angka(awas), "kabupaten/kota awas", LV[3]], [angka(siaga), "kabupaten/kota siaga", LV[2]], [jiwa(ja), "jiwa di kecamatan awas", "#5f6fb0"]],
          "lvProv": {p: v.get("lv") or 0 for p, v in w.items()}, "titik": False, "legenda": [[LV[3], "Awas"], [LV[2], "Siaga"], [LV[1], "Waspada"]], "daftarJudul": "Jiwa di kecamatan awas per provinsi",
          "daftar": [[m["provinsi"].get(p, p), v["jiwa"][2], jiwa(v["jiwa"][2]), v.get("lv") or 0] for p, v in sorted(w.items(), key=lambda x: -x[1]["jiwa"][2])[:5] if v["jiwa"][2] > 0]}
    return _og("kekeringan", gb, "Centurisk97 · Kekeringan hari ini",
               f"{tb}: {angka(awas)} kabupaten/kota awas, {angka(siaga)} siaga, {angka(waspada)} waspada kekeringan; sekitar {jiwa(ja)} jiwa tinggal di kecamatan awas. Sumber: Deteksi Centurisk97 dari hujan (SPI), tanah, dan indeks kekeringan.")


def og_cuaca(nama):
    """Cuaca ekstrem: prakiraan hujan/angin per provinsi (cuaca_prakiraan.json, ambang di cuaca_meta.json) + peringatan nowcast BMKG yang belum berakhir (peringatan.json)."""
    m, pr, pg = baca("banjir/data/cuaca_meta.json"), baca("banjir/data/cuaca_prakiraan.json"), baca("data/peringatan.json")
    hari_ini = wib().strftime("%Y-%m-%d"); i = m["hari"].index(hari_ini) if hari_ini in m["hari"] else m["i0"]; tb = tgl_pendek(m["hari"][i])
    ah = m["ambang"]["hujan"]; lvh = lambda v: sum(v >= t for t in ah)
    P = {}
    for r in pr["sel"]:
        p = P.setdefault(r[2], [0, 0]); p[0] = max(p[0], r[3][i] or 0); p[1] = max(p[1], r[4][i] or 0)
    now = datetime.now(timezone.utc); nc = sum(1 for x in pg.get("nowcast", []) if datetime.fromisoformat(x["selesai"]) > now)
    nh, ang = sum(p[0] >= ah[0] for p in P.values()), max((p[1] for p in P.values()), default=0)
    gb = {"sub": "Cuaca ekstrem · prakiraan model & peringatan BMKG", "tgl": f"{tgl_panjang(m['hari'][i])} · data {m.get('dibuat', '')[11:16].replace(':', '.')} WIB", "lv": max((lvh(p[0]) for p in P.values()), default=0),
          "eyebrow": f"Prakiraan cuaca · {tb}", "judul": f"{angka(nh)} provinsi berpotensi hujan lebat, {angka(nc)} peringatan nowcast BMKG aktif",
          "angka": [[angka(nh), f"provinsi hujan lebat (≥ {ah[0]} mm)", LV[2]], [angka(nc), "peringatan nowcast BMKG aktif", LV[3]], [angka(ang) + " km/j", "embusan angin terkuat", BIRU]],
          "lvProv": {k: lvh(p[0]) for k, p in P.items()}, "titik": False, "legenda": [[LV[3], f"≥ {ah[2]} mm"], [LV[2], f"≥ {ah[1]} mm"], [LV[1], f"≥ {ah[0]} mm"]], "daftarJudul": "Hujan terderas per provinsi (mm/hari)",
          "daftar": [[m["prov"].get(k, k), p[0], angka(p[0]) + " mm", lvh(p[0])] for k, p in sorted(P.items(), key=lambda x: -x[1][0])[:5]]}
    return _og("cuaca", gb, "Centurisk97 · Cuaca ekstrem hari ini",
               f"{tb}: {angka(nh)} provinsi berpotensi hujan lebat (≥ {ah[0]} mm), embusan angin hingga {angka(ang)} km/jam, {angka(nc)} peringatan nowcast BMKG aktif. Sumber: prakiraan model Open-Meteo, peringatan BMKG.")


def og_udara(nama):
    """Kualitas udara: perkiraan model CAMS (Copernicus) per hari di public/data/udara_kualitas.json, belum dikoreksi stasiun."""
    u = baca("data/udara_kualitas.json"); hari_ini = wib().strftime("%Y-%m-%d")
    if hari_ini not in u["hari"]: raise ValueError(f"udara_kualitas.json tak memuat {hari_ini}")
    i = u["hari"].index(hari_ini); n = u["nasional"][i]; tb = tgl_pendek(hari_ini)
    nj, nb, rata = sum(n["jiwa"][2:5]), sum(n["jiwa"][3:5]), n["rata"]
    lvu = lambda r: 3 if r[4] else 2 if r[3] else 1 if r[2] else 0
    R = {k: v[i] for k, v in u["prov"].items()}
    gb = {"sub": "Kualitas udara · perkiraan model CAMS", "tgl": f"{tgl_panjang(hari_ini)} · data {u['dibuat'][11:16].replace(':', '.')} WIB · belum dikoreksi stasiun", "lv": max((lvu(r) for r in R.values()), default=0),
          "eyebrow": f"Perkiraan udara · {tb}", "judul": f"Perkiraan model: {jiwa(nj)} jiwa menghirup udara tidak sehat hari ini",
          "angka": [[jiwa(nj), "jiwa udara tidak sehat (perkiraan)", LV[2]], [jiwa(nb), "jiwa sangat tidak sehat/berbahaya", LV[3]], [angka(rata) + " µg/m³", "PM2,5 rata-rata (model)", BIRU]],
          "lvProv": {k: lvu(r) for k, r in R.items()}, "titik": False, "legenda": [[LV[3], "Berbahaya"], [LV[2], "Sangat tidak sehat"], [LV[1], "Tidak sehat"]], "daftarJudul": "Jiwa udara tidak sehat per provinsi (perkiraan)",
          "daftar": [[u["nama_prov"].get(k, k), sum(r[2:5]), jiwa(sum(r[2:5])), lvu(r)] for k, r in sorted(R.items(), key=lambda x: -sum(x[1][2:5]))[:5]]}
    return _og("udara", gb, "Centurisk97 · Perkiraan kualitas udara hari ini",
               f"{tb}: perkiraan model, sekitar {jiwa(nj)} jiwa menghirup udara tidak sehat (PM2,5 rata-rata {angka(rata)} µg/m³). Sumber: model CAMS (Copernicus) lewat Open-Meteo, belum dikoreksi stasiun.")


def og_umum():
    """Gambar netral (tanpa angka bahaya mana pun) untuk bencana yang belum punya gambar sendiri; dipakai src/og_meta.js sebagai cadangan."""
    gb = {"sub": "Peta, peringatan & data bencana Indonesia", "tgl": "Sumber resmi dicantumkan di tiap halaman", "lv": 0, "eyebrow": "Karhutla · banjir · gempa · gunung api · cuaca", "judul": "Centurisk97 di seluruh Indonesia, langsung dari data resmi",
          "angka": [["38", "provinsi dipantau", BIRU], ["Peta", "dan peringatan langsung", LV[2]], ["Resmi", "BMKG, PVMBG, BNPB", LV[0]]], "titik": False, "legenda": []}
    return gb


def hitung():
    m, w, kl = baca("data/meta.json"), baca("data/wilayah.json"), baca("data/kluster_awal.json")["features"]
    hari, nama = m["hari_wib"], m["provinsi"]
    try: ud = baca("data/dampak.json")["udara"]["prov"]
    except Exception: ud = {}
    jw = {k: sum((v.get("jiwa") or [[0] * 5])[0][2:5]) for k, v in ud.items()}
    titik = {k: (v.get("harian") or {}).get(hari, 0) for k, v in w.items()}
    lvp = {k: v.get("level") or 0 for k, v in w.items()}
    p3 = {}
    for f in kl:
        p = f["properties"]
        if p.get("level") == 3: p3[p["prov"]] = p3.get(p["prov"], 0) + 1
    n3, nt, nj, tp = sum(p3.values()), sum(titik.values()), sum(jw.values()), tgl_pendek(hari)
    nprov3 = sum(1 for v in lvp.values() if v == 3)
    sub = "Karhutla · titik panas, kompleks api & asap"
    G = {
        "ringkasan": {"sub": sub, "lv": 3 if nprov3 else max(lvp.values(), default=0), "eyebrow": f"{nprov3} provinsi prioritas pemadaman",
                      "judul": f"Indonesia: {angka(n3)} kompleks api prioritas, {jiwa(nj)} jiwa terpapar asap",
                      "angka": [[angka(nt), f"titik panas {tp}", LV[3]], [angka(n3), "kompleks api prioritas", LV[2]], [jiwa(nj), "jiwa terpapar asap tidak sehat", "#5f6fb0"]],
                      "lvProv": lvp, "titik": True, "legenda": LEG_API, "daftarJudul": "Kompleks api prioritas per provinsi",
                      "daftar": [[nama[k], v, angka(v), lvp.get(k, 0)] for k, v in sorted(p3.items(), key=lambda x: -x[1])[:5]]},
        "peta": {"sub": sub, "lv": 2, "eyebrow": "Peta langsung · 38 provinsi", "judul": f"Peta karhutla: {angka(len(kl))} kompleks api aktif, {angka(nt)} titik panas",
                 "angka": [[angka(nt), f"titik panas {tp}", LV[3]], [angka(len(kl)), "kompleks api aktif 72 jam", LV[2]], [angka(n3), "prioritas pemadaman", LV[3]]],
                 "lvProv": lvp, "titik": True, "legenda": LEG_API},
    }
    P = {}
    for k in m.get("prioritas", []):
        lv = lvp.get(k, 0)
        G["prov-" + k] = {"sub": sub, "lv": lv, "prov": k, "eyebrow": f"{nama[k]} · {m['status'][lv].lower()}",
                          "judul": f"{nama[k]}: {angka(p3.get(k, 0))} kompleks api prioritas" + (f", {jiwa(jw[k])} jiwa terpapar asap" if jw.get(k) else ""),
                          "angka": [[angka(titik.get(k)), f"titik panas {tp}", LV[3]], [angka(p3.get(k, 0)), "kompleks api prioritas", LV[2]], [jiwa(jw.get(k, 0)), "jiwa terpapar asap", "#5f6fb0"]],
                          "titik": True, "legenda": LEG_API}
        P[k] = {"nama": nama[k], "judul": f"{nama[k]} · Centurisk97", "gambar": "prov-" + k,
                "desk": f"{nama[k]}, {tp}: {angka(p3.get(k, 0))} kompleks api prioritas, {angka(titik.get(k))} titik panas" + (f", {jiwa(jw[k])} jiwa terpapar asap" if jw.get(k) else "") + ". Peta langsung dan rekomendasi pemadaman."}
    K = {p["id"]: [f"{p.get('kab', '')}, {nama.get(p['prov'], p['prov'])}: {m['status'][3].lower()}, {angka(p.get('n24'))} titik panas 24 jam ({tp})", p["prov"]]
         for p in (f["properties"] for f in kl) if p.get("level") == 3}
    H = {"/": {"judul": "Centurisk97 · Karhutla: titik panas, kompleks api & asap hari ini", "gambar": "ringkasan",
               "desk": f"{tp}: {angka(nt)} titik panas, {angka(n3)} kompleks api prioritas, {jiwa(nj)} jiwa terpapar asap. Peta langsung, bahaya cuaca kebakaran, dan simulasi penjalaran api 72 jam untuk 38 provinsi."},
         "/peta": {"judul": "Peta karhutla langsung · Centurisk97", "gambar": "peta",
                   "desk": f"{tp}: {angka(len(kl))} kompleks api aktif dan {angka(nt)} titik panas di peta Indonesia; klik provinsi atau kompleks untuk rincian."}}
    try:
        ob = og_banjir(nama)
        G.update(ob["gambar"]); H.update(ob["halaman"])
    except Exception as e:
        print("og: data banjir dilewati:", e)
    for fn in (og_gempa, og_gunungapi, og_kekeringan, og_cuaca, og_udara):   # tiap bencana berdiri sendiri: gagal satu tidak menggagalkan yang lain
        try:
            o = fn(nama); G.update(o["gambar"]); H.update(o["halaman"])
        except Exception as e:
            print(f"og: {fn.__name__} dilewati:", e)
    G["umum"] = og_umum()
    v = datetime.now(timezone(timedelta(hours=7))).strftime("%Y-%m-%d")
    return {"dibuat": datetime.now(timezone.utc).isoformat(timespec="minutes"), "tgl": hari, "v": v, "situs": SITUS,
            "tgl_panjang": f"{tgl_panjang(hari)} · data {m.get('dibuat', '')[11:16].replace(':', '.')} WIB",
            "gambar": G, "halaman": H, "prov": P, "kompleks": K, "nama": nama}


def chrome():
    for c in [os.environ.get("CHROME"), "google-chrome", "google-chrome-stable", "chromium", "chromium-browser",
              "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"]:
        if c and (shutil.which(c) or Path(c).exists()): return shutil.which(c) or c
    sys.exit("og: Chrome/Chromium tidak ditemukan (set CHROME=...)")


def render(M):
    srv = http.server.ThreadingHTTPServer(("127.0.0.1", 0), functools.partial(type("H", (http.server.SimpleHTTPRequestHandler,), {"log_message": lambda *a: None}), directory=str(PUB)))
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    exe, gagal = chrome(), []
    with tempfile.TemporaryDirectory() as prof:
        for k in [k for k in M["gambar"] if not HANYA or k in HANYA]:
            out = OG / f"{k}.png"
            t0 = time.time()
            # Chrome di macOS menggantung saat ditutup ("Teardown watchdog"): tunggu berkasnya tertulis, lalu hentikan prosesnya
            pr = subprocess.Popen([exe, "--headless=new", "--disable-gpu", "--no-sandbox", "--hide-scrollbars", "--no-first-run", f"--user-data-dir={prof}",
                                   "--force-device-scale-factor=1", "--window-size=1200,630", f"--screenshot={out}",
                                   f"http://127.0.0.1:{srv.server_address[1]}/og/template.html?k={k}"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            while time.time() - t0 < 90 and pr.poll() is None and not (out.exists() and out.stat().st_mtime >= t0): time.sleep(.3)
            time.sleep(.5); pr.kill(); pr.wait()
            if not out.exists() or out.stat().st_mtime < t0: gagal.append(f"{k} tidak tertulis"); continue
            kb = out.stat().st_size / 1024
            print(f"og: {out.relative_to(AKAR)} {kb:.0f} KB")
            if kb > MAKS_KB: gagal.append(f"{k} {kb:.0f} KB > {MAKS_KB} KB")
    srv.shutdown()
    if gagal: sys.exit("og: gagal: " + "; ".join(gagal))


# halaman yang dicap walau belum punya blok: berkas -> jalur publik (kunci M["halaman"]); None = pakai <title>/description halaman
# cuaca/ dan udara/ sudah punya og:* tanpa penanda blok; baris meta '/cuaca/', '/udara/' dipakai Worker (src/og_meta.js), jadi tidak distempel di sini
HALAMAN = {"index.html": "/", "privasi.html": None, **{f"{b}/index.html": f"/{b}/" for b in "banjir gempa gunungapi kekeringan".split()}}


def blok(jalur, judul, desk, gambar, M):
    img = f"{SITUS}/data/og/{gambar}.png?v={M['v']}"
    e = lambda s: html.escape(s, quote=True)
    return "\n".join(["<!-- og -->", f'<link rel="canonical" href="{e(SITUS + jalur)}">', '<meta name="theme-color" content="#0b2545">',
        '<meta property="og:type" content="website">', '<meta property="og:site_name" content="Centurisk97">', '<meta property="og:locale" content="id_ID">',
        f'<meta property="og:title" content="{e(judul)}">', f'<meta property="og:description" content="{e(desk)}">', f'<meta property="og:url" content="{e(SITUS + jalur)}">',
        f'<meta property="og:image" content="{e(img)}">', '<meta property="og:image:width" content="1200">', '<meta property="og:image:height" content="630">',
        f'<meta property="og:image:alt" content="{e(desk[:200])}">', '<meta name="twitter:card" content="summary_large_image">',
        f'<meta name="twitter:title" content="{e(judul)}">', f'<meta name="twitter:description" content="{e(desk)}">', f'<meta name="twitter:image" content="{e(img)}">',
        "<!-- /og -->"])


def stempel(M):
    RE_BLOK = re.compile(r"<!-- og -->.*?<!-- /og -->", re.S)
    berkas = {p.relative_to(PUB).as_posix() for p in PUB.rglob("*.html") if "<!-- og -->" in p.read_text("utf-8", "ignore")} | set(HALAMAN)
    for rel in sorted(berkas):
        p = PUB / rel
        if not p.exists(): continue
        s = p.read_text("utf-8")
        kunci = HALAMAN.get(rel, "?")
        if kunci and kunci in M["halaman"]:
            h = M["halaman"][kunci]; jalur, judul, desk, gbr = kunci, h["judul"], h["desk"], h["gambar"]
        else:
            t = re.search(r"<title>(.*?)</title>", s, re.S); d = re.search(r'<meta name="description" content="([^"]*)"', s)
            jalur = "/" + re.sub(r"\.html$", "", re.sub(r"(^|/)index\.html$", r"\1", rel))   # /privasi.html -> /privasi (HTML_RUTE)
            judul = html.unescape(t.group(1).strip()) if t else "Centurisk97"
            desk, gbr = html.unescape(d.group(1)) if d else M["halaman"]["/"]["desk"], "umum" if "umum" in M["gambar"] else "ringkasan"   # bukan gambar karhutla untuk halaman tanpa baris meta
        b = blok(jalur, judul, desk, gbr, M)
        if RE_BLOK.search(s): s2 = RE_BLOK.sub(lambda _: b, s, count=1)
        else:
            a = re.findall(r'^<meta name="description"[^\n]*\n', s, re.M)
            if len(a) != 1: print(f"og: {rel} dilewati (jangkar description {len(a)}x)"); continue
            s2 = s.replace(a[0], a[0] + b + "\n", 1)
        if s2 != s: p.write_text(s2, "utf-8"); print(f"og: cap {rel}")


if __name__ == "__main__":
    if "--stempel" in sys.argv:
        stempel(json.loads((OG / "meta.json").read_text("utf-8"))); sys.exit()
    OG.mkdir(parents=True, exist_ok=True)
    M = hitung()
    (OG / "meta.json").write_text(json.dumps(M, ensure_ascii=False, separators=(",", ":")), "utf-8")
    render(M)
    stempel(M)
