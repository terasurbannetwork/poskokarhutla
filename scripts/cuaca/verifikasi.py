"""Arsip peringatan BMKG dan verifikasi terhadap kejadian DIBI -> cuaca_arsip_bmkg.json, cuaca_verifikasi.json (folder public/banjir/data)

arsip_bmkg   append-only: tiap nowcast CAP BMKG (diunduh langsung; gagal = peringatan.json) dan peringatan gelombang tinggi+ yang pernah terlihat.
             Satu pengambilan per hari menangkap hanya yang masih hidup saat itu (nowcast 2-3 jam), jadi arsip tidak lengkap.
bmkg         peringatan (provinsi, tanggal mulai) vs kejadian DIBI "cuaca" + "gelombang" (provinsi, tanggal), sejak arsip dimulai sampai kejadian terakhir.
kita         UJI BALIK prakiraan hujan: Open-Meteo Previous Runs API (previous-runs-api.open-meteo.com, precipitation_previous_day1..3 = prakiraan
             yang dikeluarkan 1-3 hari sebelumnya; previous_day0 = analisis model hari itu), pada ~349 titik (satu per kotak 1 derajat, sama dengan
             titik ansambel banjir), hujan harian WIB per titik, alarm = maks titik per provinsi >= 50 mm. Dua acuan, ditulis di keluaran:
               lead     vs kejadian DIBI cuaca/banjir/longsor/bandang (hanya yang dilaporkan, provinsi yang punya titik)
               analisis vs analisis model hari itu (previous_day0), bukan alat ukur
             kita.seri {tanggal: {"0".."3": [provinsi alarm]}} append-only; `--isi [hari]` mengisi ulang (mahal, tangan), harian menambah hari yang kurang.
             kita.arsip / kita.prospektif: prakiraan yang terbit sungguhan (hujan.json) disimpan sendiri dan dinilai begitu DIBI memuat tanggalnya.
Kuota Previous Runs (API terpisah dari forecast): tiap titik x 3 variabel/10 x hari/14 (min 1) per pecahan 93 hari = ~2 bobot per titik per 93 hari;
`--isi 365` = ~349 x 8 = ~2.800 bobot sekali; harian 1 hari = ~349.
Satuan: pasangan (provinsi, tanggal). a = tepat, b = alarm palsu, c = meleset; pod = a/(a+c), far = b/(a+b), csi = a/(a+b+c); null bila penyebut 0.
DIBI mencatat hanya kejadian yang dilaporkan: far dan csi adalah batas yang pesimis, pod batas yang optimis terhadap kejadian tanpa laporan.
Pakai: python3 scripts/cuaca/verifikasi.py   |   python3 scripts/cuaca/verifikasi.py uji
"""
import datetime as dt, importlib.util, os, sys, urllib.parse

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from dasar import AKAR, KELUAR, MASUKAN, ambil, baca, hari_wib, sekarang, simpan

KOLOM = ["id", "event", "severity", "onset", "expires", "prov", "kab"]
JENIS_BMKG = ("cuaca", "gelombang")
JENIS_KITA = ("cuaca", "banjir", "longsor", "banjir_longsor", "bandang")
AMBANG_MM = 50
MAKS_ARSIP = 30000
SIMPAN_SASARAN = 120
SERI_MAKS = 400
LAG_DIBI_HARI = 14   # DIBI mencatat telat: hari yang lebih baru dari (tanggal DIBI terakhir - LAG) belum dinilai
N_MIN = 30           # a+b+c di bawah ini = terlalu sedikit; layar menyembunyikan persen


def skor(a, b, c):
    r = lambda x, y: None if y == 0 else round(x / y, 3)
    return {"a": a, "b": b, "c": c, "n": a + b + c, "pod": r(a, a + c), "far": r(b, a + b), "csi": r(a, a + b + c)}


def nilai(alarm, kejadian, semesta=None):
    """alarm, kejadian = himpunan (prov, tanggal); semesta = provinsi yang dinilai (None = semua) -> (a, b, c)."""
    if semesta is not None:
        alarm = {x for x in alarm if x[0] in semesta}
        kejadian = {x for x in kejadian if x[0] in semesta}
    return len(alarm & kejadian), len(alarm - kejadian), len(kejadian - alarm)


def per_prov(alarm, kejadian, semesta=None):
    ps = sorted({x[0] for x in alarm | kejadian})
    return {p: skor(*nilai({x for x in alarm if x[0] == p}, {x for x in kejadian if x[0] == p}, semesta)) for p in ps}


def baris_peringatan(per):
    """peringatan.json (atau hasil unduhan langsung) -> baris arsip [id, event, severity, onset, expires, [prov], kab]."""
    out = []
    for n in per.get("nowcast", []):
        out.append([n["id"], n["event"], n.get("severity"), n["mulai"], n["selesai"], n.get("prov") or [], n.get("wilayah") or ""])
    for g in per.get("gelombang", []):
        for k, label in (("ekstrem", "Gelombang Ekstrem"), ("sangat_tinggi", "Gelombang Sangat Tinggi"), ("tinggi", "Gelombang Tinggi")):
            if g.get(k) and g.get("dari") and g.get("sampai"):
                out.append([f"gel|{g.get('prov') or 'ID'}|{g['dari']}", label, k, g["dari"], g["sampai"], [g["prov"]] if g.get("prov") else [], ", ".join(g[k])[:200]])
                break
    return out


def tambah_arsip(arsip, baris):
    ada = {r[0] for r in arsip["baris"]}
    for r in baris:
        if r[0] not in ada:
            arsip["baris"].append(r)
            ada.add(r[0])
    arsip["baris"] = arsip["baris"][-MAKS_ARSIP:]
    return arsip


def peringatan_terbaru():
    """Unduh langsung (nowcast hidup beberapa jam); gagal -> berkas peringatan.json terakhir. -> (dict, catatan galat | None)"""
    lama = baca(os.path.join(KELUAR, "peringatan.json")) or {"nowcast": [], "gelombang": []}
    sp = importlib.util.spec_from_file_location("banjir_peringatan", os.path.join(AKAR, "scripts/banjir/peringatan.py"))
    m = importlib.util.module_from_spec(sp)
    sp.loader.exec_module(m)
    out, galat = dict(lama), []
    for k, fn in (("nowcast", lambda: m.nowcast(__import__("wilayah").Wilayah())), ("gelombang", m.gelombang)):
        try:
            out[k] = fn()
        except Exception as e:
            galat.append(f"{k}: {e}")
    return out, ("unduhan langsung gagal, memakai peringatan.json: " + "; ".join(galat)) if galat else None


def tgl(iso):
    return iso[:10]


def akhir_dibi(dibi):
    """Tanggal terakhir yang boleh dinilai: tanggal DIBI terbaru dikurangi LAG_DIBI_HARI (ISO) | None."""
    t = max((k["tanggal"] for k in dibi), default=None)
    return (dt.date.fromisoformat(t) - dt.timedelta(days=LAG_DIBI_HARI)).isoformat() if t else None


def verifikasi(arsip, dibi, snapshot):
    """-> (bmkg, kita). arsip = {baris}; dibi = kejadian_dibi; snapshot = kita.arsip."""
    akhir = akhir_dibi(dibi)
    tgl_arsip = [tgl(r[3]) for r in arsip["baris"]]
    mulai = min(tgl_arsip, default=None)
    ev = lambda jenis: {(k["prov"], k["tanggal"]) for k in dibi if k["jenis"] in jenis and k.get("prov")}
    # --- bmkg
    P = {(p, tgl(r[3])) for r in arsip["baris"] for p in r[5]}
    if mulai and akhir and mulai <= akhir:
        P = {x for x in P if mulai <= x[1] <= akhir}
        K = {x for x in ev(JENIS_BMKG) if mulai <= x[1] <= akhir}
    else:
        P, K = set(), set()
    bmkg = {"mulai": mulai, "n_peringatan": len(arsip["baris"]), "kejadian": "DIBI BNPB cuaca+gelombang", "nasional": skor(*nilai(P, K)), "prov": per_prov(P, K),
            "n_min": N_MIN, "dinilai_sampai": akhir,
            "catatan": "Peringatan dihitung per provinsi dan tanggal mulai. Arsip dimulai " + (mulai or "belum ada") + f"; hanya hari sampai {LAG_DIBI_HARI} hari sebelum kejadian DIBI terakhir yang dinilai. "
                       "DIBI melapor telat dan hanya memuat yang dilaporkan: kejadian yang belum tercatat membuat alarm palsu (b) terlalu besar dan meleset (c) terlalu kecil. "
                       "Arsip hanya memuat nowcast yang masih hidup saat diambil (satu pengambilan per hari), sehingga peringatan yang terlewat membuat meleset (c) terlalu besar; keduanya belum bisa dipisahkan."}
    # --- kita
    Kk = ev(JENIS_KITA)
    lead, tot, evaluasi = {}, [set(), set()], []
    for L in ("1", "2", "3"):
        al, ke = set(), set()
        for d, per in sorted(snapshot.items()):
            if akhir and d <= akhir and L in per:
                evaluasi.append(d)
                al |= {(p, d) for p, mm in per[L].items() if mm >= AMBANG_MM}
                ke |= {(p, d) for (p, t) in Kk if t == d and p in per[L]}
        lead[L] = skor(*nilai(al, ke))
    return bmkg, {"periode": [min(evaluasi), max(evaluasi)] if evaluasi else None, "lead": lead}


def uji_balik(seri, semesta, dibi):
    """seri {tanggal: {"0".."3": [prov]}}, semesta = provinsi bertitik -> dict kita (lead vs DIBI, analisis vs lead 0, prov)."""
    akhir = akhir_dibi(dibi)
    hari = sorted(d for d in seri if akhir and d <= akhir and all(L in seri[d] for L in ("1", "2", "3")))   # hari tanpa kunci lead = tak ada data, bukan "tanpa alarm"
    hari0 = [d for d in hari if "0" in seri[d]]
    ev = {(k["prov"], k["tanggal"]) for k in dibi if k["jenis"] in JENIS_KITA and k.get("prov") in semesta and k["tanggal"] in set(hari)}
    al = lambda L, hh=hari: {(p, d) for d in hh for p in seri[d][L]}
    a0 = al("0", hari0)
    lead = {L: skor(*nilai(al(L), ev)) for L in ("1", "2", "3")}
    ana = {L: skor(*nilai(al(L, hari0), a0)) for L in ("1", "2", "3")}
    prov = {}
    for L in ("1", "2", "3"):
        for p in {x[0] for x in al(L) | ev}:
            prov.setdefault(p, {})[L] = skor(*nilai({x for x in al(L) if x[0] == p}, {x for x in ev if x[0] == p}))
    prov = {p: {L: v.get(L, skor(0, 0, 0)) for L in ("1", "2", "3")} for p, v in sorted(prov.items())}
    return {"periode": [hari[0], hari[-1]] if hari else None, "n_hari": len(hari), "ambang_mm": AMBANG_MM,
            "acuan": "DIBI BNPB: " + ", ".join(JENIS_KITA).replace("_", " ") + " (hanya kejadian yang dilaporkan), pasangan provinsi-hari",
            "lead": lead, "prov": prov, "n_kejadian_hari": len(ev), "n_min": N_MIN, "dinilai_sampai": akhir,
            "analisis": {"acuan": "analisis model Open-Meteo hari itu (previous_day0): hujan >= 50 mm di sedikitnya satu titik provinsi; bukan alat ukur", "lead": ana, "n_hari_kejadian": len(a0)},
            "catatan": "Titik sampel (satu per kotak 1 derajat) jauh lebih jarang daripada kecamatan: kejadian lokal sering luput dari titik (c besar, POD rendah). "
                       "DIBI melapor telat dan hanya memuat yang dilaporkan: alarm palsu (b) terlalu besar dan meleset (c) terlalu kecil, jadi far terlalu buruk. "
                       f"Hari sesudah {akhir} (DIBI terakhir - {LAG_DIBI_HARI} hari) tidak dinilai. Ambang 50 mm tidak disetel."}


def unduh_hari(titik, mulai, akhir, per_panggil=20, ambil_fn=None):
    """Previous Runs API -> seri {tanggal: {"0".."3": [prov]}} untuk mulai..akhir (ISO, <= 93 hari per pecahan). titik = [(lat, lon, prov)]."""
    ambil_fn = ambil_fn or ambil
    mx = {}
    d0, d1 = dt.date.fromisoformat(mulai), dt.date.fromisoformat(akhir)
    while d0 <= d1:
        d2 = min(d0 + dt.timedelta(days=92), d1)
        for a in range(0, len(titik), per_panggil):
            b = titik[a:a + per_panggil]
            q = {"latitude": ",".join(str(t[0]) for t in b), "longitude": ",".join(str(t[1]) for t in b), "timezone": "Asia/Jakarta",
                 "hourly": "precipitation,precipitation_previous_day1,precipitation_previous_day2,precipitation_previous_day3",
                 "start_date": d0.isoformat(), "end_date": d2.isoformat()}
            r = ambil_fn("https://previous-runs-api.open-meteo.com/v1/forecast?" + urllib.parse.urlencode(q, safe=","))
            r = r if isinstance(r, list) else [r]
            for t, x in zip(b, r):
                h = x["hourly"]
                for L, k in (("0", "precipitation"), ("1", "precipitation_previous_day1"), ("2", "precipitation_previous_day2"), ("3", "precipitation_previous_day3")):
                    jum, n = {}, {}
                    for w, v in zip(h["time"], h[k]):
                        if v is not None:
                            jum[w[:10]] = jum.get(w[:10], 0) + v
                            n[w[:10]] = n.get(w[:10], 0) + 1
                    for d, v in jum.items():
                        if n[d] == 24:   # hari harus lengkap 24 jam; sebagian dibuang, tidak dihitung
                            m = mx.setdefault(d, {}).setdefault(L, {})
                            m[t[2]] = max(m.get(t[2], 0), v)
        d0 = d2 + dt.timedelta(days=1)
    return {d: {L: sorted(p for p, v in m.items() if v >= AMBANG_MM) for L, m in per.items()} for d, per in sorted(mx.items())}


def catat_prakiraan(snapshot, hujan):
    """Simpan maks mm per provinsi untuk lead 1-3 dari hujan.json yang terbit hari ini."""
    h0, hh = hujan["hari_ini"], hujan["hari"]
    for L, d in zip((1, 2, 3), hari_wib(4, dt.date.fromisoformat(h0))[1:]):
        if d not in hh:
            continue
        i, m = hh.index(d), {}
        for g in hujan["grid"]:
            if g.get("prov") and g["h"][i] is not None:
                m[g["prov"]] = max(m.get(g["prov"], 0), int(round(g["h"][i])))
        snapshot.setdefault(d, {})[str(L)] = m
    for d in sorted(snapshot)[:-SIMPAN_SASARAN]:
        del snapshot[d]
    return snapshot


def titik_sampel():
    """(lat, lon, prov) satu per kotak 1 derajat: titik ansambel banjir; cadangan sel hujan.json terdekat ke pusat kotak."""
    ans = baca(os.path.join(MASUKAN, "hujan_ansambel.json"))
    if ans and ans.get("grid"):
        return [(g["lat"], g["lon"], g["prov"]) for g in ans["grid"] if g.get("prov")]
    hj = baca(os.path.join(MASUKAN, "hujan.json"))
    kotak = {}
    for g in (hj or {}).get("grid", []):
        kotak.setdefault((int(g["lat"] // 1), int(g["lon"] // 1)), []).append(g)
    return [(g["lat"], g["lon"], g["prov"]) for k, gs in sorted(kotak.items()) for g in [min(gs, key=lambda g: (g["lat"] - k[0] - .5) ** 2 + (g["lon"] - k[1] - .5) ** 2)] if g.get("prov")]


def main(isi=None):
    """isi = jumlah hari mundur untuk mengisi ulang uji balik (tangan, mahal); None = harian: tambah hari yang kurang (maks 7)."""
    arsip = baca(os.path.join(KELUAR, "cuaca_arsip_bmkg.json")) or {"kolom": KOLOM, "baris": []}
    per, galat = peringatan_terbaru()
    tambah_arsip(arsip, baris_peringatan(per))
    simpan(os.path.join(KELUAR, "cuaca_arsip_bmkg.json"), arsip)
    kl = (baca(os.path.join(KELUAR, "cuaca_verifikasi.json")) or {}).get("kita", {})
    seri, semesta, lama = kl.get("seri", {}), kl.get("semesta", []), kl.get("arsip", {})
    hujan = baca(os.path.join(MASUKAN, "hujan.json"))
    snap = catat_prakiraan(lama, hujan) if hujan else lama
    dibi = (baca(os.path.join(KELUAR, "kejadian.json")) or {}).get("kejadian_dibi", [])
    titik, kemarin = titik_sampel(), dt.datetime.now(dt.timezone(dt.timedelta(hours=7))).date() - dt.timedelta(days=1)
    mulai = kemarin - dt.timedelta(days=isi - 1) if isi else (dt.date.fromisoformat(max(seri)) + dt.timedelta(days=1) if seri else None)
    if titik and mulai:
        mulai = max(mulai, kemarin - dt.timedelta(days=max(isi or 7, 7) - 1))
        if mulai <= kemarin:
            try:
                seri.update(unduh_hari(titik, mulai.isoformat(), kemarin.isoformat()))
                semesta = sorted({t[2] for t in titik})
            except Exception as e:
                print(f"::warning title=cuaca uji balik::{e}", file=sys.stderr)
    elif titik and not seri:
        print("::warning title=cuaca uji balik::seri kosong: jalankan `python3 scripts/cuaca/verifikasi.py --isi 365` sekali", file=sys.stderr)
    seri = dict(sorted(seri.items())[-SERI_MAKS:])
    bmkg, pros = verifikasi(arsip, dibi, snap)
    kita = {**uji_balik(seri, semesta, dibi), "prospektif": {**pros, "n_min": N_MIN, "catatan": "Prakiraan yang benar-benar terbit (hujan.json) disimpan dan dinilai setelah DIBI memuat tanggalnya; n masih kecil."},
            "semesta": semesta, "seri": seri, "arsip": snap}
    simpan(os.path.join(KELUAR, "cuaca_verifikasi.json"), {"dibuat": sekarang(), "bmkg": bmkg, "kita": kita})
    print(f"cuaca verifikasi: arsip {len(arsip['baris'])} baris; bmkg {bmkg['nasional']}; uji balik {kita['periode']} n_hari={kita['n_hari']} lead1={kita['lead']['1']}"
          + (f"; {galat}" if galat else ""), file=sys.stderr)


def uji():
    assert skor(2, 1, 1) == {"a": 2, "b": 1, "c": 1, "n": 4, "pod": .667, "far": .333, "csi": .5}
    s0 = skor(0, 0, 0)
    assert s0["pod"] is None and s0["far"] is None and s0["csi"] is None
    assert skor(0, 3, 0)["pod"] is None and skor(0, 3, 0)["far"] == 1 and skor(0, 3, 0)["csi"] == 0
    al = {("11", "d1"), ("11", "d2"), ("12", "d1")}
    ke = {("11", "d1"), ("13", "d1")}
    assert nilai(al, ke) == (1, 2, 1) and nilai(al, ke, {"11"}) == (1, 1, 0)
    assert per_prov(al, ke)["12"] == skor(0, 1, 0)
    ar = {"kolom": KOLOM, "baris": []}
    per = {"nowcast": [{"id": "n1", "event": "Hujan Lebat", "severity": "Moderate", "mulai": "2026-10-10T01:00:00+07:00", "selesai": "x", "prov": ["15"], "wilayah": "W"}],
           "gelombang": [{"prov": "82", "dari": "2026-10-11T09:00", "sampai": "2026-10-13T09:00", "tinggi": ["Perairan A"], "sangat_tinggi": [], "ekstrem": [], "sedang": ["B"]},
                         {"prov": "81", "dari": "2026-10-11T09:00", "sampai": "y", "tinggi": [], "sangat_tinggi": [], "ekstrem": [], "sedang": ["B"]}]}
    b = baris_peringatan(per)
    assert [r[0] for r in b] == ["n1", "gel|82|2026-10-11T09:00"] and b[1][1] == "Gelombang Tinggi"      # 'sedang' bukan peringatan
    tambah_arsip(ar, b)
    tambah_arsip(ar, b)
    assert len(ar["baris"]) == 2                                                                          # append-only tanpa dobel
    dibi = [{"tanggal": "2026-10-10", "jenis": "cuaca", "prov": "15"}, {"tanggal": "2026-10-11", "jenis": "gelombang", "prov": "82"},
            {"tanggal": "2026-10-11", "jenis": "cuaca", "prov": "11"}, {"tanggal": "2026-10-12", "jenis": "banjir", "prov": "12"},
            {"tanggal": "2026-10-26", "jenis": "kering", "prov": "12"}]   # DIBI terakhir 26 Okt -> dinilai sampai 12 Okt (lag 14 hari)
    snap = {"2026-10-11": {"1": {"11": 80, "12": 10}, "2": {"11": 10, "12": 10}}, "2026-10-12": {"1": {"12": 60, "13": 70}}, "2026-10-20": {"1": {"11": 99}}}
    bm, kt = verifikasi(ar, dibi, snap)
    assert bm["mulai"] == "2026-10-10" and bm["n_peringatan"] == 2
    assert (bm["nasional"]["a"], bm["nasional"]["b"], bm["nasional"]["c"]) == (2, 0, 1), bm["nasional"]          # 15@10 dan 82@11 tepat; cuaca 11@11 meleset
    assert kt["lead"]["1"] == skor(2, 1, 0), kt["lead"]["1"]       # 11@11 tepat, 12@12 tepat, 13@12 palsu; 20 Okt melewati DIBI -> belum dinilai
    assert kt["lead"]["2"] == skor(0, 0, 1) and kt["periode"] == ["2026-10-11", "2026-10-12"]
    k0 = verifikasi({"kolom": KOLOM, "baris": []}, [], {})
    assert k0[0]["mulai"] is None and k0[0]["nasional"]["pod"] is None and k0[1]["periode"] is None and k0[1]["lead"]["3"]["csi"] is None
    sn = catat_prakiraan({}, {"hari_ini": "2026-10-18", "hari": ["2026-10-18", "2026-10-19", "2026-10-20"], "grid": [{"prov": "11", "h": [1, 70.4, 5]}, {"prov": "11", "h": [1, 20, 9]}]})
    assert sn == {"2026-10-19": {"1": {"11": 70}}, "2026-10-20": {"2": {"11": 9}}}, sn
    # uji balik: Previous Runs palsu berbentuk respons nyata (hourly, timezone lokal), 2 titik, 2 hari
    def jam(d, nilai):
        return [f"{d}T{h:02d}:00" for h in range(24)], [nilai] + [0] * 23
    def palsu(url):
        assert "previous-runs-api.open-meteo.com" in url and "start_date=2026-10-01" in url and "end_date=2026-10-02" in url, url
        t1, a1 = jam("2026-10-01", 60); t2, a2 = jam("2026-10-02", 10)
        # titik 1 (prov 11): analisis 60 mm tgl 1; lead1 60 mm tgl 1; lead2 20 mm; lead3 kosong sebagian (hari tak lengkap dibuang)
        h1 = {"time": t1 + t2, "precipitation": a1 + a2, "precipitation_previous_day1": a1 + a2,
              "precipitation_previous_day2": [20] + [0] * 47, "precipitation_previous_day3": [None] * 5 + [90] + [0] * 42}
        h2 = {"time": t1 + t2, **{k: [0] * 48 for k in ("precipitation", "precipitation_previous_day1", "precipitation_previous_day2", "precipitation_previous_day3")}}
        return [{"hourly": h1}, {"hourly": h2}]
    sr = unduh_hari([(1.0, 100.0, "11"), (2.0, 101.0, "12")], "2026-10-01", "2026-10-02", ambil_fn=palsu)
    assert sr["2026-10-01"] == {"0": ["11"], "1": ["11"], "2": [], "3": []}, sr           # lead3: tgl 1 hanya 19 jam terisi -> tak ada alarm; tgl 2 sama
    assert sr["2026-10-02"]["0"] == [] and "3" in sr["2026-10-02"]
    dibi2 = [{"tanggal": "2026-10-01", "jenis": "banjir", "prov": "11"}, {"tanggal": "2026-10-01", "jenis": "kering", "prov": "12"},
             {"tanggal": "2026-10-02", "jenis": "cuaca", "prov": "13"}, {"tanggal": "2026-10-09", "jenis": "cuaca", "prov": "11"}, {"tanggal": "2026-10-26", "jenis": "kering", "prov": "12"}]
    ub = uji_balik({"2026-10-01": {"0": ["11"], "1": ["11"], "2": ["12"], "3": []}, "2026-10-03": {"0": [], "1": ["11"], "2": []}, "2026-10-02": {"0": [], "1": [], "2": [], "3": []}, "2026-11-01": {"1": ["11"]}}, ["11", "12"], dibi2)
    assert ub["periode"] == ["2026-10-01", "2026-10-02"] and ub["n_hari"] == 2, ub["periode"]   # hari sesudah DIBI terakhir tak dinilai
    assert ub["lead"]["1"] == skor(1, 0, 0) and ub["lead"]["2"] == skor(0, 1, 1) and ub["lead"]["3"] == skor(0, 0, 1), ub["lead"]   # jenis 'kering' dan prov 13 (tanpa titik) ditolak
    assert ub["analisis"]["lead"]["1"] == skor(1, 0, 0) and ub["analisis"]["lead"]["2"] == skor(0, 1, 1)
    assert ub["n_min"] == N_MIN and ub["dinilai_sampai"] == "2026-10-12" and akhir_dibi([]) is None
    assert set(ub["prov"]["11"]) == {"1", "2", "3"} and ub["prov"]["11"]["1"] == skor(1, 0, 0) and ub["prov"]["12"]["2"] == skor(0, 1, 0), ub["prov"]   # prov per lead
    assert bm["n_min"] == N_MIN and "terlalu kecil" in bm["catatan"]
    e = uji_balik({}, [], [])
    assert e["periode"] is None and e["n_hari"] == 0 and e["lead"]["1"]["pod"] is None
    print("ok verifikasi")


if __name__ == "__main__":
    a = sys.argv[1:]
    if a == ["uji"]:
        uji()
    elif a[:1] == ["--isi"]:
        main(int(a[1]) if len(a) > 1 else 365)
    else:
        main()
