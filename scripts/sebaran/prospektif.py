"""Uji PROSPEKTIF model "akan membesar": catat ramalan untuk tiap titik api baru saat ia muncul, nilai 72 jam kemudian.

Tidak ada data masa depan yang bisa bocor: ramalan ditulis sekali (append-only) dengan waktu terbit, lalu dinilai setelah
FIRMS memuat 72 jam berikutnya. Dijalankan di CI tiap 3 jam (.github/workflows/titik.yml, langkah boleh gagal), stdlib saja.

Sumber: public/data/hotspot.json dari harian.py (7 hari, VIIRS S-NPP 'N' & NOAA-20 'N20', keyakinan nominal/tinggi) — tanpa
panggilan FIRMS tambahan. Deteksi digabung ke gudang bergulir 12 hari (titik.json.gz) supaya fitur 7 hari & label 72 jam lengkap.
Titik api baru = komponen S-NPP (<= 750 m & <= 24 jam, lacak.hubungkan) yang deteksi pertamanya berumur 6-24 jam, di
9 provinsi prioritas. Cuaca = Open-Meteo forecast (33 hari lalu + 3 hari ke depan) per sel 0,5 derajat, di-cache per hari,
anggaran bobot per jalan MAKS_BOBOT (kuota 10.000/hari). Model & ambang = model_sebaran.json "lolos" dan "lolos_ulang"
(ramal ulang 14 jam setelah deteksi pertama). Label = sel 375 m S-NPP yang terhubung dengan titik itu dalam 72 jam >= 10.

Catatan: data/raw/sebaran/prospektif/ramalan.jsonl, nilai.jsonl (append-only); ringkasan: public/data/prospektif.json.
Pakai:  python3 scripts/sebaran/prospektif.py  |  ... uji
"""
import datetime as dt, gzip, json, math, os, sys, time, urllib.parse

DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, DIR)
import lolos as LL  # noqa: E402
from lacak import hubungkan  # noqa: E402
from umum import MENTAH, PUBLIK, PRIORITAS, T0, pusat, sel  # noqa: E402

RIWAYAT_HARI = float(os.environ.get("PROSPEKTIF_RIWAYAT_HARI", "7"))  # < 7 hanya uji alur (fitur 7 hari terpotong): folder & ringkasan terpisah
FOLDER = os.path.join(MENTAH, "prospektif" if RIWAYAT_HARI >= 7 else "prospektif_uji_alur")
GUDANG = os.path.join(FOLDER, "titik.json.gz")
RAMALAN = os.path.join(FOLDER, "ramalan.jsonl")
NILAI = os.path.join(FOLDER, "nilai.jsonl")
CUACA = os.path.join(FOLDER, "cuaca")
RINGKAS = os.path.join(PUBLIK, "prospektif.json") if RIWAYAT_HARI >= 7 else os.path.join(FOLDER, "ringkasan.json")
SIMPAN_HARI = 12
UMUR_MIN, UMUR_MAKS = 6 * 60, 24 * 60  # menit sesudah deteksi pertama: jendela NOAA-20 +-3 jam tertutup & sudah masuk NRT
JEDA_NILAI = 72 * 60 + 6 * 60  # 72 jam + keterlambatan NRT
MAKS_BOBOT = float(os.environ.get("PROSPEKTIF_BOBOT", "400"))
URL = "https://api.open-meteo.com/v1/forecast"


def log(*a):
    print(time.strftime("%H:%M:%S"), *a, file=sys.stderr, flush=True)


def menit_dari(t):
    return (t - T0).total_seconds() / 60


# ---------------- gudang deteksi ----------------
def muat_gudang():
    if os.path.exists(GUDANG):
        with gzip.open(GUDANG, "rt") as f:
            return json.load(f)
    return []


def gabung(lama, hs):
    """hotspot.json -> baris [menit, lat, lon, sensor, frp, prov], digabung & dipangkas ke SIMPAN_HARI terakhir."""
    acuan = dt.datetime.fromisoformat(hs["acuan"])
    a0 = menit_dari(acuan)
    baru = []
    for la, lo, jam, s, frp, c, w, _ in hs["baris"]:
        if s in ("N", "N20") and c >= 1:
            baru.append([round(a0 + jam * 60, 1), la, lo, s, frp, hs["wilayah"][w].split("|")[0]])
    out = list({(r[0], r[1], r[2], r[3]): r for r in lama + baru}.values())
    out = [r for r in out if r[0] >= a0 - SIMPAN_HARI * 1440]
    out.sort(key=lambda r: r[0])
    return out, a0


# ---------------- titik api baru ----------------
def komponen(snpp):
    akar, _, _ = hubungkan([r[0] for r in snpp], [r[1] for r in snpp], [r[2] for r in snpp])
    g = {}
    for i, a in enumerate(akar):
        g.setdefault(a, []).append(i)
    return g


def label72(snpp, idx_awal, t0):
    """Sel 375 m berbeda yang terjangkau dari deteksi lintasan pertama lewat sambungan <= 750 m & <= 24 jam di [t0, t0 + 72 jam]."""
    daf = [i for i, r in enumerate(snpp) if t0 <= r[0] <= t0 + 72 * 60]
    kotak = {}
    for i in daf:
        r = snpp[i]
        kotak.setdefault((math.floor(r[2] / .0075), math.floor(r[1] / .0075)), []).append(i)
    lihat, antre = set(idx_awal), list(idx_awal)
    while antre:
        a = antre.pop()
        ra = snpp[a]
        gx, gy = math.floor(ra[2] / .0075), math.floor(ra[1] / .0075)
        kx = 111320 * math.cos(math.radians(ra[1]))
        for dx in (-1, 0, 1):
            for dy in (-1, 0, 1):
                for b in kotak.get((gx + dx, gy + dy), ()):
                    if b in lihat:
                        continue
                    rb = snpp[b]
                    if abs(rb[0] - ra[0]) <= 24 * 60 and math.hypot((rb[2] - ra[2]) * kx, (rb[1] - ra[1]) * 110574) <= 750:
                        lihat.add(b)
                        antre.append(b)
    return len({sel(snpp[i][2], snpp[i][1]) for i in lihat})


# ---------------- cuaca ----------------
def cuaca_sel(daftar, hari):
    """daftar sel 0,5 (lat, lon) -> {(lat, lon): dict cuaca} untuk 'hari' (YYYY-MM-DD), cache per hari, anggaran MAKS_BOBOT."""
    import cuaca
    os.makedirs(CUACA, exist_ok=True)
    out, perlu = {}, []
    for la, lo in daftar:
        j = os.path.join(CUACA, f"{hari}_{la:.2f}_{lo:.2f}.json")
        if os.path.exists(j):
            out[(la, lo)] = json.load(open(j))
        else:
            perlu.append((la, lo))
    bobot1 = cuaca.bobot(33 + 3)
    perlu = perlu[:int(MAKS_BOBOT // bobot1)]
    for a in range(0, len(perlu), 20):
        g = perlu[a:a + 20]
        q = {"latitude": ",".join(str(x[0]) for x in g), "longitude": ",".join(str(x[1]) for x in g), "hourly": ",".join(cuaca.VAR),
             "past_days": 33, "forecast_days": 3, "timezone": "GMT", "wind_speed_unit": "kmh"}
        try:
            d = cuaca.ambil(URL + "?" + urllib.parse.urlencode(q), coba=2, batas_waktu=120)
        except Exception as e:
            log("cuaca gagal:", e)
            break
        for (la, lo), r in zip(g, d if isinstance(d, list) else [d]):
            h = r["hourly"]
            c = {"lat": la, "lon": lo, "mulai": h["time"][0], **{k: h[v] for k, v in zip(cuaca.KOLOM, cuaca.VAR)}}
            json.dump(c, open(os.path.join(CUACA, f"{hari}_{la:.2f}_{lo:.2f}.json"), "w"))
            out[(la, lo)] = c
    for f in os.listdir(CUACA):  # buang cache > 5 hari
        if f[:10] < (dt.date.fromisoformat(hari) - dt.timedelta(days=5)).isoformat():
            os.remove(os.path.join(CUACA, f))
    return out


# ---------------- ramal ----------------
def fitur_titik(K, M, S, rs, t0, lon0, lat0, prov, snpp_idx, n20_idx, ulang):
    from fitur import terakhir
    w = S.jendela(int(t0))
    pertama = [r for r in rs if r[0] - t0 <= 30]
    sel0 = sorted({sel(r[2], r[1]) for r in pertama})
    s = K.sel(sel(rs[0][2], rs[0][1]), prov)  # sel deteksi pertama (= det[0] di data latih)
    tgl = T0 + dt.timedelta(minutes=t0)
    oni, dmi = terakhir(M["iklim"]["oni"], tgl.year, tgl.month), terakhir(M["iklim"]["dmi"], tgl.year, tgl.month)
    jam_lokal = ((t0 + lon0 * 4) / 60) % 24
    u = None
    if ulang:
        sampai = [r for r in rs if r[0] <= t0 + LL.ULANG_MENIT]
        lagi = [r for r in sampai if r[0] > t0 + 60]
        sel14 = sorted({sel(r[2], r[1]) for r in sampai})
        u = {"n14": len(sel14), "frp14": max([r[4] for r in lagi] or [0.0]), "lagi14": 1 if lagi else 0,
             "n20_14": LL.n20_sekitar(n20_idx, sel14, t0 - 180, t0 + LL.ULANG_MENIT + 1)}
    v = LL.fitur_lolos(w, s, tgl.year, len(sel0), max(r[4] for r in pertama), sum(r[4] for r in pertama), 0 if 6 <= jam_lokal < 18 else 1, oni, dmi,
                       LL.konteks(snpp_idx, t0, lon0, lat0), LL.n20_sekitar(n20_idx, sel0, t0 - 180, t0 + 181), u)
    st = "sabana" if prov in ("53", "93") and not s["gambut"] else "gambut" if s["gambut"] else "mineral"
    return v, st


def baca_jsonl(j):
    return [json.loads(l) for l in open(j)] if os.path.exists(j) else []


def main():
    os.makedirs(FOLDER, exist_ok=True)
    M = json.load(open(os.path.join(PUBLIK, "model_sebaran.json")))
    if "lolos" not in M:
        sys.exit("model_sebaran.json belum memuat 'lolos' (jalankan lolos.py akhir)")
    hs = json.load(open(os.path.join(PUBLIK, "hotspot.json")))
    D, a0 = gabung(muat_gudang(), hs)
    with gzip.open(GUDANG, "wt") as f:
        json.dump(D, f, separators=(",", ":"))
    snpp = [r for r in D if r[3] == "N"]
    n20 = [r for r in D if r[3] == "N20"]
    log(f"gudang {len(D)} deteksi ({len(snpp)} S-NPP), acuan {hs['acuan']}")
    ramalan = baca_jsonl(RAMALAN)
    sudah = {(r["kunci"], r["mode"]) for r in ramalan}
    t_awal = D[0][0] if D else a0
    # titik api baru: komponen yang mulai >= 7 hari sesudah awal gudang (riwayat konteks lengkap) dan berumur 3-24 jam
    calon = []
    for idx in komponen(snpp).values():
        idx.sort(key=lambda i: snpp[i][0])
        t0 = snpp[idx[0]][0]
        pertama = [i for i in idx if snpp[i][0] - t0 <= 30]
        lo0 = sum(snpp[i][2] for i in pertama) / len(pertama)
        la0 = sum(snpp[i][1] for i in pertama) / len(pertama)
        prov = snpp[idx[0]][5]
        if prov not in PRIORITAS or t0 < t_awal + RIWAYAT_HARI * 1440:
            continue
        umur = a0 - t0
        kunci = f"{t0:.0f}_{la0:.4f}_{lo0:.4f}"
        for mode, lo_, hi_ in (("awal", UMUR_MIN, UMUR_MAKS), ("ulang", LL.ULANG_MENIT + 60, LL.ULANG_MENIT + 12 * 60)):
            if lo_ <= umur <= hi_ and (kunci, mode) not in sudah:
                calon.append((mode, kunci, t0, lo0, la0, prov, [snpp[i] for i in idx if snpp[i][0] <= a0]))
    log(f"{len(calon)} ramalan baru untuk dicatat")
    if calon:
        import cuaca
        from fitur import Konteks, Seri
        hari = (T0 + dt.timedelta(minutes=a0)).date().isoformat()
        C = cuaca_sel(sorted({cuaca.sel05(c[4], c[3]) for c in calon}), hari)
        K = Konteks(bekas=False)
        si = LL.Indeks([r[0] for r in snpp], [r[1] for r in snpp], [r[2] for r in snpp])
        ni = LL.Indeks([r[0] for r in n20], [r[1] for r in n20], [r[2] for r in n20]) if n20 else None
        terbit = dt.datetime.now(dt.timezone.utc).isoformat()[:16]
        with open(RAMALAN, "a") as f:
            for mode, kunci, t0, lo0, la0, prov, rs in calon:
                c = C.get(cuaca.sel05(la0, lo0))
                if not c:
                    continue  # dicoba lagi di jalan berikutnya selama masih dalam jendela umur
                S = Seri(c)
                if not S.cukup(int(t0), 24):
                    continue
                v, st = fitur_titik(K, M, S, rs, t0, lo0, la0, prov, si, ni, mode == "ulang")
                mm = M["lolos_ulang" if mode == "ulang" else "lolos"]
                p = LL.prediksi(mm, v)
                f.write(json.dumps({"kunci": kunci, "mode": mode, "terbit": terbit, "acuan_data": hs["acuan"], "t0": (T0 + dt.timedelta(minutes=t0)).isoformat()[:16],
                                    "lat": round(la0, 4), "lon": round(lo0, 4), "prov": prov, "strata": st, "p": round(p, 4), "waspada": p >= mm["ambang"],
                                    "ambang": mm["ambang"], "model": M.get("dibuat"), "awal": [r[:3] for r in rs if r[0] - t0 <= 30],
                                    "fitur": {k: round(x, 3) for k, x in v.items()}}, separators=(",", ":")) + "\n")
    # nilai: ramalan yang 72 jam (+ jeda NRT) sudah lewat
    nilai = baca_jsonl(NILAI)
    dinilai = {(r["kunci"], r["mode"]) for r in nilai}
    with open(NILAI, "a") as f:
        for r in ramalan:
            if (r["kunci"], r["mode"]) in dinilai:
                continue
            t0 = float(r["kunci"].split("_")[0])
            if a0 < t0 + JEDA_NILAI:
                continue
            if t0 < t_awal:
                f.write(json.dumps({"kunci": r["kunci"], "mode": r["mode"], "kedaluwarsa": True}) + "\n")
                continue
            kunci_awal = {tuple(x) for x in r["awal"]}
            awal = [i for i, x in enumerate(snpp) if (x[0], x[1], x[2]) in kunci_awal]
            if not awal:
                continue
            n72 = label72(snpp, awal, t0)
            f.write(json.dumps({"kunci": r["kunci"], "mode": r["mode"], "n72": n72, "lolos": n72 >= LL.LEPAS, "dinilai": hs["acuan"][:16]}) + "\n")
    ringkas()


def ringkas():
    import gbdt as G
    R = baca_jsonl(RAMALAN)
    N = {(r["kunci"], r["mode"]): r for r in baca_jsonl(NILAI) if not r.get("kedaluwarsa")}
    out = {"diperbarui": dt.datetime.now(dt.timezone.utc).isoformat()[:16], "definisi": "lolos = >= 10 sel VIIRS 375 m (~140 ha) dalam 72 jam sejak deteksi pertama",
           "catatan": "ramalan dicatat saat titik api baru muncul (cuaca = prakiraan Open-Meteo), dinilai 72 jam kemudian dengan FIRMS NRT; tidak bisa disetel ulang sesudahnya",
           "mode": {}}
    for mode in ("awal", "ulang"):
        rs = [r for r in R if r["mode"] == mode]
        dn = [(r, N[(r["kunci"], mode)]) for r in rs if (r["kunci"], mode) in N]
        y = [1 if n["lolos"] else 0 for _, n in dn]
        p = [r["p"] for r, _ in dn]
        w = [1 if r["waspada"] else 0 for r, _ in dn]
        tp = sum(a and b for a, b in zip(w, y))
        o = {"dicatat": len(rs), "dinilai": len(dn), "lolos": sum(y), "waspada": sum(w), "tepat": tp,
             "recall": round(tp / sum(y), 3) if sum(y) else None, "presisi": round(tp / sum(w), 3) if sum(w) else None,
             "alarm_palsu_per_tidak_lolos": round((sum(w) - tp) / (len(y) - sum(y)), 3) if len(y) > sum(y) else None,
             "auc": round(G.auc(p, y), 3) if 0 < sum(y) < len(y) else None, "brier": round(G.brier(p, y), 4) if y else None,
             "peluang_rata": round(sum(p) / len(p), 4) if p else None, "laju_teramati": round(sum(y) / len(y), 4) if y else None}
        o["per_bulan"] = {}
        for r, n in dn:
            b = o["per_bulan"].setdefault(r["t0"][:7], {"dinilai": 0, "lolos": 0, "waspada": 0, "tepat": 0})
            b["dinilai"] += 1
            b["lolos"] += n["lolos"]
            b["waspada"] += r["waspada"]
            b["tepat"] += bool(r["waspada"] and n["lolos"])
        o["per_lahan"] = {st: {"dinilai": sum(1 for r, _ in dn if r["strata"] == st), "lolos": sum(1 for r, n in dn if r["strata"] == st and n["lolos"]),
                               "tepat": sum(1 for r, n in dn if r["strata"] == st and n["lolos"] and r["waspada"]),
                               "waspada": sum(1 for r, _ in dn if r["strata"] == st and r["waspada"])} for st in ("gambut", "mineral", "sabana")}
        out["mode"][mode] = o
    out["terbaru"] = [{"t0": r["t0"], "lat": r["lat"], "lon": r["lon"], "prov": r["prov"], "p": r["p"], "waspada": r["waspada"],
                       "n72": N.get((r["kunci"], "awal"), {}).get("n72")} for r in sorted((r for r in R if r["mode"] == "awal"), key=lambda r: r["t0"])[-60:]]
    json.dump(out, open(RINGKAS, "w"), ensure_ascii=False, separators=(",", ":"))
    log("ringkasan", json.dumps(out["mode"].get("awal", {}))[:300])


if __name__ == "__main__":
    if sys.argv[1:] == ["uji"]:
        # label72: rantai 3 sel dalam 72 jam + satu sel sesudah 72 jam + satu sel 2 km jauhnya -> 3
        km = 1 / 111.32
        s = [[0, 0.0, 110.0, "N", 5, "62"], [600, 0.0, 110 + .5 * km, "N", 5, "62"], [2000, 0.0, 110 + 1.0 * km, "N", 5, "62"],
             [72 * 60 + 100, 0.0, 110 + 1.4 * km, "N", 5, "62"], [100, 0.0, 110 + 3 * km, "N", 5, "62"]]
        assert label72(s, [0], 0) == 3, label72(s, [0], 0)
        # gabung: dedup, buang sensor lain & keyakinan rendah, pangkas umur
        hs = {"acuan": "2026-10-12T12:00:00+00:00", "wilayah": ["62|Pulang Pisau|X"],
              "baris": [[-2.0, 114.0, -1.0, "N", 3.0, 1, 0, ""], [-2.0, 114.0, -1.0, "N", 3.0, 1, 0, ""], [-2.0, 114.0, -2.0, "M", 3.0, 2, 0, ""],
                        [-2.0, 114.1, -3.0, "N20", 3.0, 0, 0, ""], [-2.0, 114.2, -400.0, "N", 3.0, 2, 0, ""]]}
        g, a0 = gabung([], hs)
        assert len(g) == 1 and g[0][3] == "N" and g[0][5] == "62" and abs(g[0][0] - (a0 - 60)) < 1e-6, g
        g2, _ = gabung(g, hs)
        assert len(g2) == 1
        print("ok")
    else:
        main()
