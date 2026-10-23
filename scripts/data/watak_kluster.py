"""Pola lokasi per cluster aktif dari public/data/riwayat_sel/ -> kunci `wt` di kluster.json + kluster_awal.json dan `watak` (kunci saudara insiden/front, dibawa Worker ke kartu tugas) di tugas_kompleks.json.

Jalan di CI SESUDAH harian.py, taktik.py, dan insiden.py (yang menulis ulang kedua berkas). Hanya membaca ubin riwayat_sel yang sudah di-commit,
tidak butuh arsip FIRMS. Rumus sama dengan public/riwayat_sel.js `analisa` (laci): ubah keduanya bersamaan.
  a   tahun terbakar dari n tahun penuh: seri MODIS 2003-... (>= 3 titik) bila ada, selain itu VIIRS 2012-... (>= 10 titik)
  rt  rata-rata titik VIIRS S-NPP (keyakinan sedang/tinggi) per tahun penuh di jendela ~16 km
  n7  titik S-NPP keyakinan sedang/tinggi 7 hari terakhir (hotspot.json) di jendela 3x3 yang SAMA: sebanding dengan rt
      (cluster `n` memuat 4 sensor semua keyakinan, ~2,5x lebih banyak: tidak boleh dibagi rt; temuan validasi-model 23 Okt 2026).
      Penyaring api vegetasi arsip (sel industri) tidak tersedia untuk NRT; diukur 23 Okt 2026 n7 justru ~0,9x arsip (median per jendela 1,00).
  rs  n7 / rt: > 1 berarti seminggu ini sudah melebihi setahun biasa (api di luar kebiasaan)
  md  median lama episode lalu (hari; episode yang masih menyala tidak ikut)
  sisa  median episode lalu yang sudah bertahan >= umur api, dikurangi umur; HANYA bila uji balik (riwayat_sel_uji.json `lama_unggul`)
      membuktikan ramalan lokasi lebih tepat dari median nasional, selain itu null
  akhir  median akhir musim, tanggal di tahun berjalan; k = episode per tahun terbakar (kekambuhan); lg = a >= sepertiga n; x = median jangkauan km

Pakai:  python3 scripts/data/watak_kluster.py        # tulis ulang kluster.json + tugas_kompleks.json
        python3 scripts/data/watak_kluster.py uji    # self-check
"""
import datetime as dt, json, math, os, statistics as st, sys

sys.path.insert(0, os.path.dirname(__file__))
from wilayah import AKAR  # noqa: E402

DATA = os.path.join(AKAR, "public/data")
X0, Y1, SEL, TAHUN_AKTIF, AKTIF_MODIS = 94.5, 6.5, 0.05, 10, 3


def kunci(lat, lon):
    ix, iy = int((lon - X0) / SEL), int((Y1 - lat) / SEL)
    return f"{int(ix * SEL)}_{int(iy * SEL)}", f"{ix}_{iy}"


def bulat(x):
    """pembulatan setengah ke atas, sama dengan Math.round di layar (round() Python = ke genap)"""
    return math.floor(x + .5)


def bertingkat(H, rec, p, h):
    """Sama persis dengan public/riwayat_sel.js `bertingkat`: unit wilayah terdalam dari riwayat_hierarki.json, lalu jendela ~16 km disusut
    B = (n*mentah + k*B_induk)/(n + k) (lama dalam log hari, akhir musim dalam hari-dalam-tahun). -> {tingkat, sisa, akhir} atau None."""
    if not H or not H.get("nasional"):
        return None
    for lv, u, nama in (("Kec.", (H.get("kec") or {}).get(f"{p.get('prov')}|{p.get('kab')}|{p.get('kec')}"), p.get("kec")),
                        ("Kab.", (H.get("kab") or {}).get(f"{p.get('prov')}|{p.get('kab')}"), p.get("kab")),
                        ("Prov.", (H.get("prov") or {}).get(p.get("prov")), None)):
        if u:
            break
    else:
        lv, u, nama = "nasional", H["nasional"], None
    hh = max(1, bulat(h or 1))
    # label = tingkat terdalam yang berbobot (n/(n+k) >= 0,3), sama dengan layar (audit validasi-model 23 Okt 2026)
    kh, i = (H.get("k") or {}).get(str(min(hh, 14))) or {}, min(hh, 14) - 1
    bobot = lambda x, kk: ((x or {}).get("n") or [0] * 14)[i] / (((x or {}).get("n") or [0] * 14)[i] + (kk if kk is not None else 1e9))
    lab = next((f"{l} {n_}".strip() for l, x, n_, kk in (
        ("Kec.", (H.get("kec") or {}).get(f"{p.get('prov')}|{p.get('kab')}|{p.get('kec')}"), p.get("kec"), kh.get("c")),
        ("Kab.", (H.get("kab") or {}).get(f"{p.get('prov')}|{p.get('kab')}"), p.get("kab"), kh.get("a")),
        ("Prov.", (H.get("prov") or {}).get(p.get("prov")), p.get("prov"), kh.get("p"))) if x and bobot(x, kk) >= 0.3), "nasional")
    out = {"tingkat": lab}
    if hh <= 14:
        d = (u.get("d") or [None] * 14)[hh - 1] or H["nasional"]["d"][hh - 1]
        kw = (H.get("k", {}).get(str(hh)) or {}).get("w", 1e9)
        rw = [v for v in rec.get("r") or [] if v >= hh]
        B = (len(rw) * math.log(st.median(rw)) + kw * math.log(d)) / (len(rw) + kw) if rw else math.log(d)
        out["sisa"] = max(0, bulat(math.exp(B) - hh))
    s_ = u.get("s") or H["nasional"]["s"]
    km = (H.get("k", {}).get("musim") or {}).get("w", 1e9)
    nw = sum(1 for v in rec.get("y", [])[:-1] if v >= TAHUN_AKTIF) if rec.get("s") else 0
    out["akhir"] = bulat((nw * rec["s"][1] + km * s_) / (nw + km)) if nw else bulat(s_)
    return out


def watak(rec, th0, sd, n7, hari, thm0=None, lama_unggul=True, hier=None):
    """hier = hasil bertingkat() bila model bertingkat lolos uji (main memeriksa riwayat_sel_uji.json hierarki), selain itu None."""
    """rec = rekaman riwayat_sel; sd = tanggal arsip (ISO); n7 = titik S-NPP sedang/tinggi 7 hari di jendela; hari = umur api;
    lama_unggul = hasil uji balik (main membacanya dari riwayat_sel_uji.json)."""
    th1 = int(sd[:4])
    penuh = [(th0 + i, v) for i, v in enumerate(rec["y"]) if th0 + i < th1]
    rt = bulat(st.mean(v for _, v in penuh)) if penuh else 0   # S-NPP sedang/tinggi: sebanding dengan n7
    if rec.get("ym") and thm0:   # kekerapan dari seri panjang MODIS (2003-...), ambang 3 titik/tahun = riwayat_grid
        penuh = [(thm0 + i, v) for i, v in enumerate(rec["ym"]) if thm0 + i < th1]
        a = sum(1 for _, v in penuh if v >= AKTIF_MODIS)
    else:
        a = sum(1 for _, v in penuh if v >= TAHUN_AKTIF)
    r, h = rec.get("r") or [], max(1, hari or 1)
    lanjut = [v for v in r if v >= h]
    w = {"a": a, "n": len(penuh), "rt": rt, "n7": n7, "rs": bulat(n7 / rt * 10) / 10 if rt >= 1 and n7 else None,
         "md": bulat(st.median(r)) if len(r) >= 3 else None,
         "sisa": max(0, bulat(st.median(lanjut) - h)) if lama_unggul and len(lanjut) >= 3 else None,
         "akhir": (dt.date(th1, 1, 1) + dt.timedelta(days=(hier["akhir"] if hier and hier.get("akhir_ok") else rec["s"][1]) - 1)).isoformat() if rec.get("s") or (hier and hier.get("akhir_ok")) else None,
         "k": rec.get("k"), "lg": a >= math.ceil(len(penuh) / 3) if penuh else False,
         "x": rec["x"][0] if rec.get("x") else None}
    if hier and hier.get("sisa_ok") and hier.get("sisa") is not None:
        w["sisa"], w["tk"] = hier["sisa"], hier["tingkat"]
    return w


def main():
    kl = json.load(open(os.path.join(DATA, "kluster.json")))
    ubin, tw = {}, {}
    try:
        unggul = bool(json.load(open(os.path.join(DATA, "riwayat_sel_uji.json"))).get("lama_unggul"))
    except FileNotFoundError:
        unggul = False
    try:
        uji_ = json.load(open(os.path.join(DATA, "riwayat_sel_uji.json"))).get("hierarki") or {}
        H = json.load(open(os.path.join(DATA, "riwayat_hierarki.json")))
    except FileNotFoundError:
        uji_, H = {}, None
    hs = json.load(open(os.path.join(DATA, "hotspot.json")))
    K = {k: i for i, k in enumerate(hs["kolom"])}
    snpp = {}   # (ix, iy) -> titik S-NPP keyakinan sedang/tinggi 7 hari terakhir
    for b in hs["baris"]:
        if b[K["sensor"]] == "N" and b[K["keyakinan"]] >= 1 and b[K["jam"]] >= -168:
            c = (int((b[K["lon"]] - X0) / SEL), int((Y1 - b[K["lat"]]) / SEL))
            snpp[c] = snpp.get(c, 0) + 1
    for f in kl["features"]:
        p = f["properties"]
        u, s = kunci(p["lat"], p["lon"])
        if u not in ubin:
            try:
                ubin[u] = json.load(open(os.path.join(DATA, "riwayat_sel", u + ".json")))
            except FileNotFoundError:
                ubin[u] = None
        d = ubin[u]
        rec = d and d["c"].get(s)
        p.pop("wt", None)
        if rec:
            ix, iy = map(int, s.split("_"))
            n7 = sum(snpp.get((ix + a, iy + b), 0) for a in (-1, 0, 1) for b in (-1, 0, 1))
            hb = bertingkat(H, rec, p, p.get("hari"))
            if hb:
                hb["sisa_ok"], hb["akhir_ok"] = uji_.get("lama_unggul_hierarki") is True, uji_.get("musim_unggul_hierarki") is True
            p["wt"] = tw[p["id"]] = watak(rec, d["th0"], d["sd"], n7, p.get("hari"), d.get("thm0"), unggul, hb)
    json.dump(kl, open(os.path.join(DATA, "kluster.json"), "w"), ensure_ascii=False, separators=(",", ":"))
    jalur = os.path.join(DATA, "kluster_awal.json")   # muatan pertama halaman (harian.pecah_kluster): properti sama, tanpa api24
    if os.path.exists(jalur):
        aw = json.load(open(jalur))
        for f in aw["features"]:
            f["properties"].pop("wt", None)
            if f["properties"].get("id") in tw:
                f["properties"]["wt"] = tw[f["properties"]["id"]]
        json.dump(aw, open(jalur, "w"), ensure_ascii=False, separators=(",", ":"))
    jalur = os.path.join(DATA, "tugas_kompleks.json")
    if os.path.exists(jalur):
        t = json.load(open(jalur))
        for x in t.get("kompleks", []):
            x.pop("watak", None)
            if x.get("id") in tw:
                x["watak"] = tw[x["id"]]
        json.dump(t, open(jalur, "w"), ensure_ascii=False, separators=(",", ":"))
    print(f"wt: {len(tw)} dari {len(kl['features'])} cluster", file=sys.stderr)


def uji():
    assert kunci(-3.1201, 112.1635) == ("17_9", "353_192")
    rec = {"y": [0, 0, 0, 400, 0, 0, 0, 50, 0, 0, 0, 30, 0, 0, 900], "r": [2, 5, 9, 12, 20], "s": [200, 305], "k": 2, "x": [6.4, 11]}
    w = watak(rec, 2012, "2026-10-12", 3000, 8)
    assert (w["a"], w["n"], w["rt"]) == (3, 14, 34), w
    assert w["rs"] == round(3000 / 34, 1) and w["md"] == 9 and w["sisa"] == 4 and w["akhir"] == "2026-11-01" and w["lg"] is False, w
    # tanpa riwayat cukup: angka ditolak, bukan dikarang
    w = watak({"y": [0] * 15, "r": [3]}, 2012, "2026-10-12", 50, 2)
    assert w["rs"] is None and w["md"] is None and w["sisa"] is None and w["akhir"] is None and w["a"] == 0, w
    # seri panjang MODIS menggantikan kekerapan; rt tetap VIIRS
    rec["ym"] = [5] * 12 + [0] * 11 + [40]   # 2003..2026: 12 tahun terbakar dari 23
    w = watak(rec, 2012, "2026-10-12", 3000, 8, 2003)
    assert (w["a"], w["n"], w["rt"], w["lg"]) == (12, 23, 34, True), w
    # uji balik tidak unggul: sisa tidak boleh ditulis; pembulatan .5 ke atas seperti layar
    assert watak(rec, 2012, "2026-10-12", 3000, 8, lama_unggul=False)["sisa"] is None
    assert watak({"y": [1, 0] * 7 + [0], "r": []}, 2012, "2026-10-12", 10, 1)["rt"] == 1, "rata 0,5 harus jadi 1 (JS Math.round)"
    # bertingkat: sama dengan uji JS (tests/agen/riwayat-sel.test.mjs)
    H = {"nasional": {"d": [6] * 14, "s": 305}, "prov": {"62": {"d": [8] * 14, "s": 300, "n": [500] * 14}}, "kab": {"62|Seruyan": {"d": [10] * 14, "s": 298, "n": [60] * 14}},
         "kec": {"62|Seruyan|Seruyan Hilir": {"d": [12] * 14, "s": 296, "n": [40] * 14}}, "k": {"3": {"w": 4, "p": 4, "a": 64, "c": 64}, "musim": {"w": 4}}}
    pp = {"prov": "62", "kab": "Seruyan", "kec": "Seruyan Hilir"}
    b = bertingkat(H, {"r": [1, 2], "y": [0, 0]}, pp, 3)
    assert (b["tingkat"], b["sisa"], b["akhir"]) == ("Kec. Seruyan Hilir", 9, 296), b
    assert round(math.exp((4 * math.log(20) + 4 * math.log(12)) / 8), 1) == 15.5
    assert bertingkat(H, {"r": []}, {**pp, "kec": "Lain"}, 3)["tingkat"] == "Kab. Seruyan"
    assert bertingkat(None, {}, pp, 3) is None
    H2 = json.loads(json.dumps(H)); H2["kec"]["62|Seruyan|Seruyan Hilir"]["n"] = [5] * 14; H2["kab"]["62|Seruyan"]["n"] = [5] * 14
    assert bertingkat(H2, {"r": []}, pp, 3)["tingkat"].startswith("Prov."), "kecamatan berbobot kecil tidak boleh jadi label"
    w = watak(rec, 2012, "2026-10-12", 3000, 8, lama_unggul=False, hier={**b, "sisa_ok": False, "akhir_ok": False})
    assert w["sisa"] is None and w["akhir"] == "2026-11-01", "bertingkat yang tidak lolos uji DITOLAK"
    w = watak(rec, 2012, "2026-10-12", 3000, 8, lama_unggul=False, hier={**b, "sisa_ok": True, "akhir_ok": True})
    assert (w["sisa"], w["tk"], w["akhir"]) == (9, "Kec. Seruyan Hilir", "2026-10-23"), w
    print("ok")


if __name__ == "__main__":
    uji() if sys.argv[1:] == ["uji"] else main()
