#!/usr/bin/env python3
"""Gambar pratinjau tautan (Open Graph 1200x630) + meta per halaman, dari data yang sama dengan situs.

  python3 scripts/og/buat.py            hitung angka -> public/data/og/meta.json, render PNG, cap meta HTML
  python3 scripts/og/buat.py --stempel  hanya cap blok <!-- og --> di HTML dari meta.json yang sudah ada (tanpa Chrome)

PNG: public/data/og/{ringkasan,peta,banjir,prov-<kode>}.png, dirender Chrome headless dari public/og/template.html.
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
        P[k] = {"nama": nama[k], "judul": f"{nama[k]} · Pantau Bencana", "gambar": "prov-" + k,
                "desk": f"{nama[k]}, {tp}: {angka(p3.get(k, 0))} kompleks api prioritas, {angka(titik.get(k))} titik panas" + (f", {jiwa(jw[k])} jiwa terpapar asap" if jw.get(k) else "") + ". Peta langsung dan rekomendasi pemadaman."}
    K = {p["id"]: [f"{p.get('kab', '')}, {nama.get(p['prov'], p['prov'])}: {m['status'][3].lower()}, {angka(p.get('n24'))} titik panas 24 jam ({tp})", p["prov"]]
         for p in (f["properties"] for f in kl) if p.get("level") == 3}
    H = {"/": {"judul": "Pantau Bencana · Karhutla: titik panas, kompleks api & asap hari ini", "gambar": "ringkasan",
               "desk": f"{tp}: {angka(nt)} titik panas, {angka(n3)} kompleks api prioritas, {jiwa(nj)} jiwa terpapar asap. Peta langsung, bahaya cuaca kebakaran, dan simulasi penjalaran api 72 jam untuk 38 provinsi."},
         "/peta": {"judul": "Peta karhutla langsung · Pantau Bencana", "gambar": "peta",
                   "desk": f"{tp}: {angka(len(kl))} kompleks api aktif dan {angka(nt)} titik panas di peta Indonesia; klik provinsi atau kompleks untuk rincian."}}
    # banjir
    try:
        bm, st = baca("banjir/data/meta.json"), baca("banjir/data/status.json")["kec"]
        nb, ns, lvb, h3, nkp, nm = [0] * 4, 0, {}, 0, {}, bm.get("provinsi") or nama
        for kk, v in st.items():
            l = (v.get("b") or [0])[0] or 0; nb[l] += 1; pv = kk.split("|")[0]; lvb[pv] = max(lvb.get(pv, 0), l); nkp[pv] = nkp.get(pv, 0) + (l > 0); h3 = max(h3, v.get("h3") or 0)
        ns, tb = nb[1] + nb[2] + nb[3], tgl_pendek(bm["hari_wib"])
        G["banjir"] = {"sub": "Banjir, longsor & rob", "tgl": f"{tgl_panjang(bm['hari_wib'])} · data {bm.get('dibuat', '')[11:16].replace(':', '.')} WIB", "lv": max(lvb.values(), default=0), "eyebrow": f"Prakiraan banjir · {tb}", "judul": f"{angka(ns)} kecamatan berstatus banjir hari ini",
                       "angka": [[angka(ns), "kecamatan waspada ke atas", LV[2]], [angka(nb[2] + nb[3]), "kecamatan siaga/awas", LV[3]], [angka(h3) + " mm", "hujan 3 hari maksimum", "#4f8fc4"]],
                       "lvProv": lvb, "titik": False, "daftarJudul": "Kecamatan berstatus per provinsi",
                       "daftar": [[nm.get(k, k), v, angka(v) + " kec.", lvb.get(k, 0)] for k, v in sorted(nkp.items(), key=lambda x: -x[1])[:5]], "legenda": [[LV[3], "Awas"], [LV[2], "Siaga"], [LV[1], "Waspada"]]}
        H["/banjir/"] = {"judul": "Pantau Bencana · Banjir, longsor & rob hari ini", "gambar": "banjir",
                         "desk": f"{tb}: {angka(ns)} kecamatan berstatus banjir ({angka(nb[3])} awas, {angka(nb[2])} siaga), hujan 3 hari hingga {angka(h3)} mm. Prakiraan per kecamatan untuk 38 provinsi."}
    except Exception as e:
        print("og: data banjir dilewati:", e)
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
HALAMAN = {"index.html": "/", "banjir/index.html": "/banjir/", "privasi.html": None}


def blok(jalur, judul, desk, gambar, M):
    img = f"{SITUS}/data/og/{gambar}.png?v={M['v']}"
    e = lambda s: html.escape(s, quote=True)
    return "\n".join(["<!-- og -->", f'<link rel="canonical" href="{e(SITUS + jalur)}">', '<meta name="theme-color" content="#0b2545">',
        '<meta property="og:type" content="website">', '<meta property="og:site_name" content="Pantau Bencana">', '<meta property="og:locale" content="id_ID">',
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
            jalur = "/" + re.sub(r"\.html$", "", re.sub(r"(^|/)index\.html$", r"\1", rel));   # /privasi.html -> /privasi (HTML_RUTE) judul = html.unescape(t.group(1).strip()) if t else "Pantau Bencana"
            desk, gbr = html.unescape(d.group(1)) if d else M["halaman"]["/"]["desk"], "ringkasan"
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
