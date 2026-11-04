"""NA-28 Deret bulanan neraca air per kab Jawa (fitur khusus-wilayah untuk model banjir kab-hari).

Per sel iklim 0,1 derajat: bak Thornthwaite-Mather yang sama dengan neraca.py (bak_dipanaskan, TANPA routing/waduk/kebutuhan),
dijalankan MENERUS dari 1991-01 sampai bulan terakhir (iklim.json 1991-2025 + iklim_ekstensi.json tahun berjalan), lalu
dirata-ratakan berbobot luas ke kab. Keluaran public/data/neraca_air/deret_bulanan.json, 2010-01..bulan terakhir:
  P, ETa, R (limpasan = alpha*surplus + keluar tampungan), S (simpanan akhir bulan = lengas tanah + tampungan linear), semua mm
  rerata kab. Kontinuitas per sel: S_t - S_(t-1) = P - ETa - R (S dihitung dari kumulatif, lalu dicocokkan dgn keadaan akhir bak).
  Anomali S terhadap klimatologi bulan-kalender dihitung PEMANGGIL lewat anomali(deret, tahun_acuan) (fungsi murni), supaya acuan
  = tahun latih model, bukan 1991-2020 baku. Nilai bulan b baru ada sesudah ERA5/CHIRPS/POWER terbit (lihat meta.latensi).

Pakai:  python3 scripts/air/neraca/deret.py tarik [tahun]  (jaringan: CHIRPS IRI + POWER 88 titik, tahun berjalan -> iklim_ekstensi.json)
        python3 scripts/air/neraca/deret.py               (hitung deret_bulanan.json)
        python3 scripts/air/neraca/deret.py uji           (tanpa jaringan)
"""
import calendar, collections, json, os, subprocess, sys, time

DIR = os.path.dirname(os.path.abspath(__file__))
AKAR = os.path.abspath(os.path.join(DIR, "../../.."))
sys.path.insert(0, DIR)
import neraca as N  # noqa: E402  (bak_dipanaskan, ASUMSI_*)

IKLIM, EKST, TOPO = (os.path.join(DIR, f) for f in ("iklim.json", "iklim_ekstensi.json", "topologi.json"))
KAB = os.path.join(AKAR, "public/data/neraca_air/kab.json")
KELUAR = os.path.join(AKAR, "public/data/neraca_air/deret_bulanan.json")
MENTAH = os.path.join(AKAR, "data/kajian-bnpb/neraca-air/mentah")
MULAI = "2010-01"
PRAKIRAAN = 4   # ponytail: batas aman jeda tersedia (bulan) dihitung di meta.latensi dari tanggal tarik


def anomali(deret, tahun_acuan):
    """deret {'YYYY-MM': nilai|None} -> {'YYYY-MM': nilai - rerata bulan-kalender yg sama atas tahun_acuan}.
    Bulan kalender tanpa satu pun nilai di tahun_acuan -> ValueError (bukan diam-diam 0)."""
    acuan = set(int(y) for y in tahun_acuan)
    if not acuan:
        raise ValueError("tahun_acuan kosong")
    jml, n = collections.defaultdict(float), collections.defaultdict(int)
    for k, v in deret.items():
        if v is not None and int(k[:4]) in acuan:
            jml[k[5:]] += v
            n[k[5:]] += 1
    out = {}
    for k, v in deret.items():
        if v is None:
            out[k] = None
        elif not n[k[5:]]:
            raise ValueError(f"bulan {k[5:]} tak punya data di tahun_acuan {sorted(acuan)}")
        else:
            out[k] = v - jml[k[5:]] / n[k[5:]]
    return out


def seri_bulan(awal, n):
    y, m = int(awal[:4]), int(awal[5:])
    return [f"{y + (m - 1 + t) // 12}-{(m - 1 + t) % 12 + 1:02d}" for t in range(n)]


def muat_iklim(jalur_utama=IKLIM, jalur_ekst=EKST):
    """-> (bulan[list 'YYYY-MM'], sel{c: {p, et0}}) 1991-01.. bulan terakhir; ekstensi harus menyambung tanpa celah."""
    u = json.load(open(jalur_utama))
    bulan = seri_bulan(u["meta"]["bulan_awal"], len(next(iter(u["sel"].values()))["p"]))
    sel = {c: {"p": list(d["p"]), "et0": list(d["et0"])} for c, d in u["sel"].items()}
    if os.path.exists(jalur_ekst):
        e = json.load(open(jalur_ekst))
        be = e["meta"]["bulan"]
        if be and be[0] != seri_bulan(bulan[-1], 2)[1]:
            raise ValueError(f"ekstensi mulai {be[0]} tidak menyambung ke {bulan[-1]}")
        for c in sel:
            if c not in e["sel"]:
                raise ValueError(f"sel {c} tak ada di ekstensi")
            sel[c]["p"] += e["sel"][c]["p"]
            sel[c]["et0"] += e["sel"][c]["et0"]
        bulan += be
    return bulan, sel


def hitung(bulan, sel, topo_sub, kab_ada, mulai=MULAI):
    """-> {kode: {bln: [P, ETa, R, S]}} untuk bulan >= mulai; cek kontinuitas per sel (galat mutlak <1e-6 mm... lihat TOL)."""
    n = len(bulan)
    per_sel = {}
    for c, d in sel.items():
        if len(d["p"]) != n or len(d["et0"]) != n:
            raise ValueError(f"sel {c}: panjang seri {len(d['p'])}/{len(d['et0'])} != {n} bulan")
        eta, r, sm, g, sm0, g0 = N.bak_dipanaskan(d["p"], d["et0"], taw=N.ASUMSI_TAW, kc=N.ASUMSI_KC, alpha=N.ASUMSI_ALPHA, k=N.ASUMSI_K)
        s, S = sm0 + g0, []
        for t in range(n):
            s += d["p"][t] - eta[t] - r[t]
            S.append(s)
        if abs(S[-1] - (sm + g)) > 1e-6 * max(1.0, n):
            raise ValueError(f"sel {c}: kontinuitas gagal, S kumulatif {S[-1]:.6f} != keadaan akhir bak {sm + g:.6f}")
        if min(S) < -1e-9:
            raise ValueError(f"sel {c}: simpanan negatif {min(S):.4f}")
        per_sel[c] = (eta, r, S)
    t0 = bulan.index(mulai)
    bobot = collections.defaultdict(lambda: collections.defaultdict(float))
    for s in topo_sub.values():
        for k, kb in s["kab"].items():
            if k in kab_ada:
                for c, a in kb.items():
                    bobot[k][c] += a
    out = {}
    for k, w in bobot.items():
        tot = sum(w.values())
        seri = {}
        for t in range(t0, n):
            P = sum(a * sel[c]["p"][t] for c, a in w.items()) / tot
            E = sum(a * per_sel[c][0][t] for c, a in w.items()) / tot
            R = sum(a * per_sel[c][1][t] for c, a in w.items()) / tot
            S = sum(a * per_sel[c][2][t] for c, a in w.items()) / tot
            seri[bulan[t]] = [round(P, 2), round(E, 2), round(R, 2), round(S, 2)]
        out[k] = seri
    return out


def tarik(th=None):
    """CHIRPS IRI + NASA POWER tahun berjalan -> iklim_ekstensi.json (memakai gabung() iklim_global dgn jalur dialihkan)."""
    import iklim_global as G
    th = int(th or time.strftime("%Y"))
    nc = os.path.join(MENTAH, f"chirps_{th}.nc")
    url = G.CHIRPS_URL.replace("(Jan%201991)/(Dec%202025)", f"(Jan%20{th})/(Dec%20{th})")
    for coba in range(3):
        r = subprocess.run(["curl", "-s", "--max-time", "900", "-f", "-o", nc, url])
        if r.returncode == 0:
            break
    else:
        raise SystemExit("CHIRPS gagal")
    nt = G.baca_chirps_nc(nc)[2]
    G.SERI = [f"{th}{m:02d}" for m in range(1, nt + 1)]
    G.AWAL = G.AKHIR = th
    G.P_POWER, G.P_CHIRPS, G.KELUAR = (os.path.join(MENTAH, f"power_{th}.json"), os.path.join(MENTAH, f"chirps_{th}.json"), EKST)
    if os.path.exists(G.P_POWER):
        os.remove(G.P_POWER)   # cache lama kedaluwarsa (bulan baru terbit)
    G.power()
    G.chirps(nc)
    while True:   # POWER terbit lebih lambat dari CHIRPS: potong ke bulan yang kedua sumber punya
        try:
            G.gabung()
            break
        except ValueError as e:
            if "POWER" not in str(e) or len(G.SERI) <= 1:
                raise
            G.SERI = G.SERI[:-1]
            print(f"  POWER belum lengkap, potong ke {G.SERI[-1]}", file=sys.stderr)
    e = json.load(open(EKST))
    e["meta"].update({"bulan": [f"{s[:4]}-{s[4:]}" for s in G.SERI], "bulan_awal": f"{th}-01", "bulan_akhir": f"{G.SERI[-1][:4]}-{G.SERI[-1][4:]}"})
    json.dump(e, open(EKST, "w"), separators=(",", ":"))
    print(f"ekstensi {th}: {len(G.SERI)} bulan", file=sys.stderr)


def main():
    bulan, sel = muat_iklim()
    topo = json.load(open(TOPO))
    kab = json.load(open(KAB))["kab"]
    h = hitung(bulan, sel, topo["subdas"], set(kab))
    if set(h) != set(kab):
        raise SystemExit(f"kab tanpa irisan sel: {sorted(set(kab) - set(h))}")
    rentang = [b for b in bulan if b >= MULAI]
    hilang = sorted({b for k in h for b in rentang if b not in h[k]})
    e = json.load(open(EKST)) if os.path.exists(EKST) else None
    out = {"meta": {
        "label": "estimasi-model", "satuan": "mm per bulan rerata kab (P, ETa, R); S = simpanan akhir bulan (lengas tanah + tampungan linear), mm",
        "kolom": ["P", "ETa", "R", "S"], "rentang": [rentang[0], rentang[-1]], "n_bulan": len(rentang), "n_kab": len(h), "bulan_hilang": hilang,
        "kunci": "kode Kemendagri 4 digit (= kode BPS kab/kota Jawa, sama dengan kunci kab.json); nama & prov di kab",
        "metode": "bak Thornthwaite-Mather neraca.py (TAW 130 mm, alpha 0,6, k 2 bln) per sel 0,1 derajat, dijalankan menerus 1991-01..bulan terakhir, rerata berbobot luas ke kab; tanpa routing/waduk/kebutuhan",
        "anomali": "tidak disimpan: hitung dgn deret.anomali(deret, tahun_acuan) = nilai - rerata bulan-kalender yg sama di tahun_acuan (mis. tahun latih saja)",
        "sumber_iklim": {"p": "CHIRPS v2.0 via IRI", "et0": "FAO-56 PM dari NASA POWER MERRA-2",
                         "ekstensi_ditarik": (e or {}).get("meta", {}).get("ditarik")},
        "latensi": "diukur 3 Nov 2026: CHIRPS final s/d 2026-09 (jeda ~1 bln, Okt belum terbit); NASA POWER radiasi ALLSKY_SFC_SW_DWN s/d 2026-07 (jeda ~3 bln; suhu/RH/angin s/d 2026-09), sehingga ET0 lengkap & deret ini s/d 2026-07. Bulan b baru ada di deret ~3 bln sesudah akhir b: untuk prediksi di bulan m pakai S(m-4) atau lebih lama kecuali ET0 bulan akhir diisi klimatologi.",
        "ditulis": time.strftime("%Y-%m-%d")},
        "kab": {k: {"nama": kab[k]["nama"], "prov": kab[k]["prov"], "bulan": rentang, "P": [h[k][b][0] for b in rentang],
                    "ETa": [h[k][b][1] for b in rentang], "R": [h[k][b][2] for b in rentang], "S": [h[k][b][3] for b in rentang]}
                for k in sorted(h)}}
    json.dump(out, open(KELUAR + ".tmp", "w"), separators=(",", ":"))
    os.replace(KELUAR + ".tmp", KELUAR)
    print(f"deret_bulanan.json: {len(h)} kab, {rentang[0]}..{rentang[-1]} ({len(rentang)} bulan), hilang={hilang}", file=sys.stderr)


def uji():
    # anomali: acuan hanya 2 tahun; nilai tahun luar acuan tetap diberi anomali; acuan sendiri berjumlah nol
    d = {f"{y}-{m:02d}": 10.0 * y % 7 + m for y in (2010, 2011, 2012, 2013) for m in (1, 2)}
    a = anomali(d, [2010, 2011])
    for m in ("01", "02"):
        assert abs(a[f"2010-{m}"] + a[f"2011-{m}"]) < 1e-9, "anomali acuan harus berjumlah nol"
    assert abs(a["2012-01"] - (d["2012-01"] - (d["2010-01"] + d["2011-01"]) / 2)) < 1e-9
    assert anomali(d, [2010])["2010-01"] == 0 and anomali(d, [2012, 2013]) != anomali(d, [2010, 2011]), "acuan harus mengubah hasil"
    assert anomali({"2010-01": 1, "2010-02": None}, [2010])["2010-02"] is None
    for jelek, ac in (({"2010-01": 1.0}, []), ({"2010-01": 1.0, "2011-03": 2.0}, [2010])):
        try:
            anomali(jelek, ac)
        except ValueError:
            continue
        raise AssertionError(f"acuan salah {ac} lolos")
    # hitung: 1 sel, kontinuitas dan bobot; kab fiktif 2 sel luas 3:1
    bln = seri_bulan("2009-01", 36)
    p1, p2 = [200.0 if i % 12 < 6 else 20.0 for i in range(36)], [100.0] * 36
    sel = {"a": {"p": p1, "et0": [120.0] * 36}, "b": {"p": p2, "et0": [120.0] * 36}}
    topo = {"s": {"kab": {"9999": {"a": 3.0, "b": 1.0}}}}
    h = hitung(bln, sel, topo, {"9999"}, mulai="2010-01")["9999"]
    assert "2009-12" not in h and len(h) == 24 and list(h)[-1] == "2011-12", "rentang keluaran salah / bulan masa depan"
    assert abs(h["2010-03"][0] - (3 * 200 + 100) / 4) < 0.01, "bobot luas salah"
    for b, (P, E, R, S) in h.items():
        assert S >= 0 and E <= P + N.ASUMSI_TAW + 1e-6
    sebelum = h["2010-12"][3]
    # kontinuitas antarbulan pada kab: S_t - S_(t-1) = P - ETa - R (galat pembulatan 2 desimal)
    ks = list(h)
    for a_, b_ in zip(ks, ks[1:]):
        assert abs((h[b_][3] - h[a_][3]) - (h[b_][0] - h[b_][1] - h[b_][2])) < 0.03, f"kontinuitas {b_} gagal"
    assert sebelum >= 0
    try:
        hitung(bln, {"a": {"p": [1.0] * 35, "et0": [1.0] * 36}}, topo, {"9999"})
    except ValueError:
        pass
    else:
        raise AssertionError("seri beda panjang lolos")
    try:
        hitung(bln, {"a": {"p": [-1.0] * 36, "et0": [1.0] * 36}}, topo, {"9999"})
    except ValueError:
        pass
    else:
        raise AssertionError("hujan negatif lolos")
    # keluaran nyata (bila ada): tanpa bulan masa depan, kunci = kab.json
    if os.path.exists(KELUAR):
        o = json.load(open(KELUAR))
        akhir = time.strftime("%Y-%m")
        assert o["meta"]["rentang"][1] < akhir, f"bulan akhir {o['meta']['rentang'][1]} bukan masa lalu (sekarang {akhir})"
        assert set(o["kab"]) == set(json.load(open(KAB))["kab"]), "kunci kab beda dgn kab.json"
        for k, v in o["kab"].items():
            n = len(v["bulan"])
            assert all(len(v[x]) == n for x in ("P", "ETa", "R", "S")), f"{k}: panjang kolom beda"
            assert all(s >= 0 for s in v["S"]) and all(r >= 0 for r in v["R"]), f"{k}: S/R negatif"
    print("ok deret")


if __name__ == "__main__":
    a = sys.argv[1:]
    if a == ["uji"]:
        uji()
    elif a[:1] == ["tarik"]:
        tarik(*a[1:2])
    elif not a:
        main()
    else:
        sys.exit(__doc__)
