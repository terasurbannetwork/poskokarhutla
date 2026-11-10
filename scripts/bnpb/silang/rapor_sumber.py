#!/usr/bin/env python3
"""F1 Rapor Sumber -> public/data/bnpb/rapor_sumber.json (+ rapor_sumber_arsip/YYYY-MM.jsonl, append-only).

Menilai tiap sumber prakiraan lawan kejadian: tabel a b c d, POD, FAR, CSI, ETS per sumber x bahaya x tenggang (nasional;
provinsi hanya bila sudah lolos gerbang). Aturan: data/kajian-bnpb/silang-sumber/ALGORITMA.md bagian 1 dan KEPUTUSAN K3 K5 K6.
  - Prakiraan harus beku: tanggal beku < tanggal target. Yang melanggar dibuang (dihitung di `dibuang`), arsip tidak diisi mundur.
  - Hari dinilai < 30 -> "belum_cukup" (tanpa angka). n_efektif (hari kalender berbeda yang berkejadian) < 30 -> "n_kurang" (a b c d dan n, tanpa persen). Selebihnya "angka" + Wilson.
  - Kejadian DIBI dan Logbook hanya dinilai sampai (tanggal terakhir - 14 hari): DIBI telat lapor.
Sumber dinilai: BMKG sepekan (resmi, Siaga/Awas = hujan menyala, Angin Kencang = angin menyala) dan prospektif Centurisk97
(ambang yang tertulis di arsipnya). Sumber lain dicatat di `dilewati` dengan alasan.
Pakai: python3 scripts/bnpb/silang/rapor_sumber.py   |   python3 -I scripts/bnpb/silang/rapor_sumber.py uji
Python 3.9 stdlib."""
import datetime as dt, glob, os, sys, tempfile

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from dasar import AKAR, baca, hari_wib, simpan, tambah_arsip, wilson  # noqa: E402

BD = os.path.join(AKAR, "public/banjir/data")
KELUAR = os.path.join(AKAR, "public/data/bnpb/rapor_sumber.json")
ARSIP = os.path.join(AKAR, "public/data/bnpb/rapor_sumber_arsip")
LAG, HARI_MIN, N_MIN = 14, 30, 30
# Bahaya -> jenis kejadian lawan. Pemetaan awal (KEPUTUSAN Q4: belum diperiksa); "Cuaca Ekstrem" ada di keduanya karena DIBI tidak memisahkan.
DIBI = {"hujan": {"Banjir", "Banjir dan Tanah Longsor", "Banjir Bandang", "Banjir Genangan", "Tanah Longsor", "Gerakan Tanah", "Cuaca Ekstrem"},
        "angin": {"Angin Kencang", "Angin Topan", "Puting Beliung", "Cuaca Ekstrem"}}
LOGB = {"hujan": {"banjir", "longsor", "banjir_longsor", "banjir_bandang", "cuaca"}, "angin": {"cuaca"}}
ANGIN_KMJ = 54   # embusan km/jam, kelas angin kencang BMKG (scripts/cuaca/dasar.py ANGIN[0]); bukan ambang_catat
# DIBI memberi prov_kode runtuh untuk Papua (Pegunungan, Tengah, Selatan jadi 94, Barat Daya jadi 91): kode diambil dari NAMA provinsi (kode BMKG/BPS 2022).
PAPUA = {"Papua": "91", "Papua Barat": "92", "Papua Selatan": "93", "Papua Tengah": "94", "Papua Pegunungan": "95", "Papua Barat Daya": "96"}
LEMBAGA = {"BMKG sepekan": "BMKG", "Centurisk97 prospektif": "Centurisk97"}


def skor(a, b, c, d):
    r = lambda x, y: None if y == 0 else round(x / y, 3)
    n = a + b + c + d
    ar = (a + b) * (a + c) / n if n else 0
    ets = (a - ar) / (a + b + c - ar) if a + b + c - ar else None
    return {"pod": r(a, a + c), "far": r(b, a + b), "csi": r(a, a + b + c), "ets": None if ets is None else round(ets, 3)}


def rentang(dari, sampai):
    x, y = dt.date.fromisoformat(dari), dt.date.fromisoformat(sampai)
    return [(x + dt.timedelta(days=i)).isoformat() for i in range((y - x).days + 1)]


def kejadian(dibi, logb):
    """-> (E {(kejadian, bahaya): {(prov, tanggal)}}, akhir {kejadian: ISO}, provinsi {kode}, tanpa_prov)."""
    E, akhir, provs, tanpa = {}, {}, set(), 0
    for k in (dibi or {}).get("kejadian", []):
        kode = PAPUA.get(k.get("prov"), k["prov_kode"])
        provs.add(kode)
        for b, js in DIBI.items():
            if k["jenis"] in js:
                E.setdefault(("DIBI", b), set()).add((kode, k["tanggal"]))
    for k in (logb or {}).get("kejadian", []):
        tgl = k.get("mulai") or (k.get("terlihat") or [None])[0]
        kode = PAPUA.get(k.get("prov")) or (k.get("kab_kode") or "")[:2]   # nama Papua menang atas kab_kode yang tidak konsisten
        if not tgl or not kode:
            tanpa += 1
            continue
        provs.add(kode)
        for b, js in LOGB.items():
            if k["jenis"] in js:
                E.setdefault(("Logbook", b), set()).add((kode, tgl[:10]))
    for kej, d in (("DIBI", [k["tanggal"] for k in (dibi or {}).get("kejadian", [])]),
                   ("Logbook", [t for (kj, _), s in E.items() if kj == "Logbook" for (_, t) in s])):
        if d:
            akhir[kej] = (dt.date.fromisoformat(max(d)) - dt.timedelta(days=LAG)).isoformat()
    return E, akhir, provs, tanpa


def baca_sepekan(d):
    """-> ([(target, beku, bahaya, {prov})], periode_tanpa_tingkat). Artikel urut terbit supaya yang terbaru menimpa pada hari beku sama."""
    out, kosong = [], 0
    for _, a in sorted(((d or {}).get("artikel") or {}).items(), key=lambda x: x[1].get("terbit", "")):
        beku = a["terbit"][:10]
        for p in a.get("prakiraan", []):
            if not p.get("tingkat") and not p.get("sedang_kode_prov"):
                kosong += 1
                continue
            h, w = set(p.get("sedang_kode_prov") or []), set()   # sedang dibaca Waspada (ALGORITMA: Waspada atau lebih)
            for t in p["tingkat"]:
                (h if t["tingkat"] in ("Awas", "Siaga") else w if t["tingkat"] == "Angin" else set()).update(t["kode_prov"])
            for tgl in rentang(p["periode"]["dari"], p["periode"]["sampai"]):
                out += [(tgl, beku, "hujan", h), (tgl, beku, "angin", w)]
    return out, kosong


def baca_prospektif(berkas):
    """Arsip bulanan cuaca_prospektif_*.json. Hujan menyala = ada kecamatan Siaga atau Awas (kolom siaga, awas) di kabupaten provinsi itu;
    angin menyala = embusan >= ANGIN_KMJ. Kabupaten yang tidak tertulis = di bawah ambang catat arsipnya, jadi tidak menyala. Terbit yang hitungan
    kecamatannya kosong (None) tidak dinilai untuk hujan. -> (baris, jumlah terbit-hari hujan yang dilewati)."""
    out, lewat = [], 0
    for d in berkas:
        for beku, e in sorted((d.get("terbit") or {}).items()):
            for i, tgl in enumerate(e["hari"]):
                w = {k.split("|")[0] for k, v in e["kab"].items() if v[i][1] >= ANGIN_KMJ}
                out.append((tgl, beku, "angin", w))
                if any(v[i][3] is None or v[i][4] is None for v in e["kab"].values()):
                    lewat += 1
                    continue
                out.append((tgl, beku, "hujan", {k.split("|")[0] for k, v in e["kab"].items() if v[i][3] + v[i][4] > 0}))
    return out, lewat


def susun(baris_per_sumber):
    """{sumber: [(target, beku, bahaya, menyala)]} -> (F {(sumber, bahaya, tenggang): {target: (beku, menyala)}}, dibuang)."""
    F, dibuang = {}, 0
    for s, baris in baris_per_sumber.items():
        for tgl, beku, b, men in baris:
            if beku >= tgl:   # K6: beku harus lebih awal dari awal tanggal target
                dibuang += 1
                continue
            F.setdefault((s, b, (dt.date.fromisoformat(tgl) - dt.date.fromisoformat(beku)).days), {})[tgl] = (beku, men)
    return F, dibuang


def _sel(s, b, daerah, tg, kej, abcd, hari, pers, n_min, n_eff):
    a, bb, c, d = abcd
    st = "belum_cukup" if hari < HARI_MIN else "n_kurang" if n_eff < n_min else "angka"
    o = {"sumber": s, "lembaga": LEMBAGA.get(s, s), "bahaya": b, "daerah": daerah, "tenggang": tg, "kejadian": kej, "hari_dinilai": hari, "status": st, "n_efektif": None,
         "a": None, "b": None, "c": None, "d": None, "n_kejadian": None, "pod": None, "far": None, "csi": None, "ets": None, "pod_ci": None, "far_ci": None,
         "pembanding": {"persistensi": None, "klimatologi": None}}
    if st == "belum_cukup":
        return o
    o.update(a=a, b=bb, c=c, d=d, n_kejadian=a + c, n_efektif=n_eff)
    pa, pb, pc, pd = pers
    o["pembanding"]["persistensi"] = {"a": pa, "b": pb, "c": pc, "d": pd, **(skor(pa, pb, pc, pd) if st == "angka" else {})}
    if st == "angka":
        o.update(skor(a, bb, c, d), pod_ci=wilson(a, a + c), far_ci=wilson(bb, a + bb))
    return o


def hitung(F, E, akhir, provs, hari_min=HARI_MIN, n_min=N_MIN):
    """Tabel a b c d per sel. Satuan hitung = hari x provinsi (nasional = jumlah provinsi). Persistensi = ada kejadian di provinsi itu pada hari beku."""
    sel = []
    for (s, b, tg), per in sorted(F.items()):
        for kej in ("DIBI", "Logbook"):
            ev, sampai = E.get((kej, b), set()), akhir.get(kej)
            hari = sorted(d for d in per if sampai and d <= sampai)
            c = {p: [0, 0, 0, 0] for p in provs}
            ps = {p: [0, 0, 0, 0] for p in provs}
            for d in hari:
                beku, men = per[d]
                for p in provs:
                    e = (p, d) in ev
                    for tab, m in ((c, p in men), (ps, (p, beku) in ev)):
                        tab[p][(0 if e else 1) if m else (2 if e else 3)] += 1
            jml = lambda t: [sum(v[i] for v in t.values()) for i in range(4)]
            ehari = {d for d in hari if any((p, d) in ev for p in provs)}   # hari kalender berbeda yang berkejadian di mana saja
            nas = _sel(s, b, {"tingkat": "nas", "kode": "ID"}, tg, kej, jml(c), len(hari), jml(ps), n_min, len(ehari))
            sel.append(nas)
            if nas["status"] != "belum_cukup":
                sel += [_sel(s, b, {"tingkat": "prov", "kode": p}, tg, kej, c[p], len(hari), ps[p], n_min, c[p][0] + c[p][2]) for p in sorted(provs)]
    return sel


def bangun(hari, dibi, logb, sepekan, prospektif, ada):
    """`ada` = {nama berkas: bool} untuk catatan `dilewati`. -> dict keluaran (deterministik untuk hari yang sama)."""
    E, akhir, provs, tanpa = kejadian(dibi, logb)
    sp, kosong = baca_sepekan(sepekan)
    pr, pr_lewat = baca_prospektif(prospektif)
    F, dibuang = susun({"BMKG sepekan": sp, "Centurisk97 prospektif": pr})
    for (s, b, tg), per in F.items():
        for _, men in per.values():
            provs |= men
    sel = hitung(F, E, akhir, sorted(provs))
    hari_arsip = {s: len({t for (ss, _, _), per in F.items() if ss == s for t in per}) for s in LEMBAGA}
    lewat = [{"sumber": "BMKG peringatan dini nowcast (cuaca_arsip_bmkg.json)", "alasan": "arsip tidak mencatat jam ambil, sehingga tanggal beku tidak bisa dibuktikan lebih awal dari target; sudah dinilai terpisah di cuaca_verifikasi.json"},
             {"sumber": "BMKG prakiraan adm4 (cuaca_bmkg_arsip_*.json)", "alasan": "arsip hanya memuat angka mm dan kmj tanpa ambang tertulis; sumber tanpa ambang tertulis tidak dinilai"},
             {"sumber": "BMKG teks 10 hari per kabupaten (cuaca_bmkg_kab10.json)", "alasan": "bukan sinyal bahaya: tidak memuat hujan lebat dari 5.150 baris (RISET B3)"},
             {"sumber": "BMKG peringatan dini kekeringan dasarian (peringatan_bmkg_arsip.json)", "alasan": "bahaya kekeringan belum dipetakan ke kejadian (Q4)"},
             {"sumber": "SYNOP hujan (cuaca_synop_arsip.json)", "alasan": "pemetaan stasiun ke provinsi belum ada; SYNOP punya rapor sendiri di cuaca_verif_synop.json"}]
    if kosong:
        lewat.append({"sumber": "BMKG sepekan", "alasan": "tak terbaca: %d periode artikel tanpa tingkat dan tanpa sedang dilewati, bukan dihitung sebagai hari tenang" % kosong})
    if pr_lewat:
        lewat.append({"sumber": "Centurisk97 prospektif", "alasan": "tak terbaca: %d terbit-hari tanpa hitungan kecamatan Siaga/Awas dilewati untuk hujan" % pr_lewat})
    lewat += [{"sumber": n, "alasan": "berkas tidak ada"} for n, v in sorted(ada.items()) if not v]
    return {"versi": 1, "dibuat": hari, "hari_arsip": hari_arsip, "n_min": N_MIN, "hari_min": HARI_MIN, "dinilai_sampai": akhir.get("DIBI"),
            "dinilai_sampai_per_kejadian": akhir, "sel": sel, "dilewati": lewat, "dibuang": dibuang,
            "catatan": ["Prakiraan beku sebelum hari target; tidak ada yang diisi mundur. Prakiraan hari yang sama dengan hari beku dibuang.",
                        "Sel dengan hari dinilai kurang dari 30 tertulis data belum cukup dan tidak membawa angka. Jumlah kejadian (a + c) kurang dari 30: a, b, c, d dan n saja, tanpa persen.",
                        "DIBI melapor telat dan hanya memuat yang dilaporkan: alarm palsu (b) tampak terlalu besar dan meleset (c) terlalu kecil. Hanya hari sampai 14 hari sebelum kejadian terakhir yang dinilai.",
                        "Satuan hitung hari x provinsi; nasional adalah jumlah provinsi. Pemetaan jenis kejadian ke bahaya hujan dan angin masih awal (Q4). Tingkat kabupaten belum dihitung: arsip tidak memuat semua kabupaten (D6 mensyaratkan a + c kabupaten minimal 30).",
                        "BMKG sepekan: Siaga, Awas, dan provinsi bertanda sedang (dibaca Waspada) = hujan menyala; label Angin Kencang = angin menyala. Periode tanpa tingkat dan tanpa sedang tak terbaca: dilewati, bukan hari tenang.",
                        "Centurisk97: hujan menyala bila ada kecamatan Siaga atau Awas (setara Siaga/Awas BMKG); tingkat kecamatan itu dihitung dari hujan, embusan, gelombang, dan peluang ansambel sekaligus. Angin menyala bila embusan minimal 54 km/jam. Ambang catat arsip tidak dipakai.",
                        "Agregasi provinsi: provinsi menyala bila paling sedikit satu kabupaten di dalamnya menyala (Centurisk97) atau BMKG menyebut provinsi itu; kabupaten yang tidak tertulis berarti di bawah ambang catat arsip, jadi tidak menyala.",
                        "Gerbang n memakai n_efektif: hari kalender berbeda yang berkejadian. Hari-provinsi pada hari yang sama saling terkait, jadi a + c membesar-besarkan sampel. Selang Wilson mengandaikan pengamatan bebas, padahal hari berurutan dan provinsi bertetangga saling bergantung; selang sebenarnya lebih lebar.",
                        "Kode provinsi Papua diambil dari nama provinsi (91 sampai 96), karena prov_kode DIBI merobohkan Papua Pegunungan, Tengah, Selatan, dan Barat Daya.",
                        "Pembanding persistensi memakai kejadian pada hari beku. Pembanding klimatologi belum ada: arsip kejadian hanya satu tahun, sehingga klimatologi bulan itu memuat hari yang dinilai.",
                        "%d kejadian Logbook tanpa tanggal atau provinsi tidak ikut." % tanpa]}


def baris_arsip(out):
    return {"dibuat": out["dibuat"], "sel": [[x["sumber"], x["bahaya"], x["kejadian"], x["tenggang"], x["status"], x["hari_dinilai"], x["a"], x["b"], x["c"], x["d"]]
                                              for x in out["sel"] if x["daerah"]["tingkat"] == "nas"]}


def main():
    hari = hari_wib()
    nama = {"cuaca_sepekan_arsip.json": os.path.join(BD, "cuaca_sepekan_arsip.json"), "dibi_kejadian.json": os.path.join(AKAR, "public/data/dibi_kejadian.json"),
            "logbook_kejadian.json": os.path.join(AKAR, "public/data/logbook_kejadian.json")}
    isi = {k: baca(v) for k, v in nama.items()}
    pr = [x for x in (baca(f) for f in sorted(glob.glob(os.path.join(BD, "cuaca_prospektif_*.json")))) if x]
    ada = {k: v is not None for k, v in isi.items()}
    ada["cuaca_prospektif_*.json"] = bool(pr)
    out = bangun(hari, isi["dibi_kejadian.json"], isi["logbook_kejadian.json"], isi["cuaca_sepekan_arsip.json"], pr, ada)
    simpan(KELUAR, out)
    baru = tambah_arsip(os.path.join(ARSIP, hari[:7] + ".jsonl"), hari, baris_arsip(out))
    st = {}
    for x in out["sel"]:
        st[x["status"]] = st.get(x["status"], 0) + 1
    print("rapor_sumber: %d sel %s, %d dibuang, arsip hari %s %s" % (len(out["sel"]), st, out["dibuang"], hari, "ditambah" if baru else "sudah ada"), file=sys.stderr)


def uji():
    s = skor(10, 5, 5, 80)
    assert (s["pod"], s["far"], s["csi"], s["ets"]) == (0.667, 0.333, 0.5, 0.437), s   # ar = 15*15/100 = 2,25
    assert skor(0, 0, 0, 5) == {"pod": None, "far": None, "csi": None, "ets": None}   # bagi nol = null
    assert wilson(5, 10) == [0.237, 0.763]
    # 40 hari berturut-turut, tenggang 1; kejadian tiap hari di provinsi 11 -> a=40 (menyala dan terjadi), provinsi 12 tidak (d)
    hari40 = rentang("2026-01-02", "2026-02-10")
    base = [(t, (dt.date.fromisoformat(t) - dt.timedelta(days=1)).isoformat(), "hujan", {"11"}) for t in hari40]
    E = {("DIBI", "hujan"): {("11", t) for t in hari40}}
    F, buang = susun({"BMKG sepekan": base})
    assert buang == 0 and list(F) == [("BMKG sepekan", "hujan", 1)]
    nas = [x for x in hitung(F, E, {"DIBI": "2026-12-31"}, ["11", "12"]) if x["daerah"]["tingkat"] == "nas" and x["kejadian"] == "DIBI"][0]
    assert (nas["status"], nas["a"], nas["b"], nas["c"], nas["d"], nas["n_kejadian"], nas["pod"], nas["far"], nas["csi"]) == ("angka", 40, 0, 0, 40, 40, 1.0, 0.0, 1.0), nas
    assert nas["pod_ci"][0] > 0.9 and nas["pembanding"]["persistensi"]["a"] == 39   # hari pertama: kejadian hari bekunya tidak ada
    # belum cukup: 29 hari dinilai -> tanpa angka
    F29, _ = susun({"BMKG sepekan": base[:29]})
    x = [y for y in hitung(F29, E, {"DIBI": "2026-12-31"}, ["11", "12"]) if y["daerah"]["tingkat"] == "nas" and y["kejadian"] == "DIBI"][0]
    assert x["status"] == "belum_cukup" and x["a"] is None and x["pod"] is None and x["hari_dinilai"] == 29
    # cukup hari tetapi a + c < 30: a b c d dan n saja, tanpa persen
    E2 = {("DIBI", "hujan"): {("11", t) for t in hari40[:10]}}
    y = [z for z in hitung(F, E2, {"DIBI": "2026-12-31"}, ["11", "12"]) if z["daerah"]["tingkat"] == "nas" and z["kejadian"] == "DIBI"][0]
    assert y["status"] == "n_kurang" and y["n_kejadian"] == 10 and y["pod"] is None and y["csi"] is None and y["a"] == 10 and y["b"] == 30
    # hari di luar dinilai_sampai tidak dinilai (DIBI telat lapor)
    z = [w for w in hitung(F, E, {"DIBI": "2026-01-10"}, ["11"]) if w["daerah"]["tingkat"] == "nas" and w["kejadian"] == "DIBI"][0]
    assert z["hari_dinilai"] == 9, z["hari_dinilai"]
    # beku sama dengan atau sesudah target dibuang
    F2, buang2 = susun({"X": [("2026-03-05", "2026-03-05", "hujan", {"11"}), ("2026-03-05", "2026-03-06", "hujan", set()), ("2026-03-05", "2026-03-04", "hujan", set())]})
    assert buang2 == 2 and list(F2) == [("X", "hujan", 1)]
    # sepekan: periode tanpa tingkat dan tanpa sedang dilewati; sedang = Waspada ikut hujan; Siaga/Awas = hujan; Angin = angin
    art = {"artikel": {"a": {"terbit": "2026-03-01 08:00:00", "prakiraan": [
        {"periode": {"dari": "2026-03-02", "sampai": "2026-03-03"}, "sedang_kode_prov": ["14"], "tingkat": [{"tingkat": "Awas", "kode_prov": ["12"]}, {"tingkat": "Siaga", "kode_prov": ["11"]}, {"tingkat": "Angin", "kode_prov": ["13"]}]},
        {"periode": {"dari": "2026-03-04", "sampai": "2026-03-04"}, "sedang_kode_prov": [], "tingkat": []}]}}}
    rs, ko = baca_sepekan(art)
    assert ko == 1 and len(rs) == 4 and rs[0] == ("2026-03-02", "2026-03-01", "hujan", {"11", "12", "14"}) and rs[1][3] == {"13"}
    # prospektif: hujan dari kolom siaga/awas (bukan ambang catat), angin dari embusan >= 54; hitungan kosong = dilewati
    kab = lambda a, b: {"terbit": {"2026-03-01": {"hari": ["2026-03-01", "2026-03-02"], "kab": {"11|A": [[99, 60, 0, 0, 0], a], "12|B": [[5, 10, 3, 0, 0], b]}}}}
    pj, lw = baca_prospektif([dict(kab([10, 50, 0, 1, 0], [10, 10, 0, 0, 0]))])
    h = {(x[0], x[2]): x[3] for x in pj}
    assert lw == 0 and h[("2026-03-01", "hujan")] == set() and h[("2026-03-02", "hujan")] == {"11"} and h[("2026-03-01", "angin")] == {"11"} and h[("2026-03-02", "angin")] == set()
    pj2, lw2 = baca_prospektif([dict(kab([10, 50, None, None, None], [10, 10, 0, 0, 0]))])
    assert lw2 == 1 and [x for x in pj2 if x[0] == "2026-03-02" and x[2] == "hujan"] == []
    # Papua: DIBI Papua Pegunungan (prov_kode 94) jatuh ke 95; Papua Barat Daya (91) ke 96; logbook memakai nama, tanpa kab_kode pun
    E3, ak, pv, tp = kejadian({"kejadian": [{"tanggal": "2026-03-01", "jenis": "Banjir", "prov": "Papua Pegunungan", "prov_kode": "94"},
                                            {"tanggal": "2026-03-01", "jenis": "Banjir", "prov": "Papua Barat Daya", "prov_kode": "91"},
                                            {"tanggal": "2026-03-01", "jenis": "Banjir", "prov": "Aceh", "prov_kode": "11"}]},
                               {"kejadian": [{"jenis": "banjir", "prov": "Papua Tengah", "kab_kode": "91.01", "mulai": "2026-03-02", "terlihat": []},
                                             {"jenis": "banjir", "prov": "Papua Barat", "kab_kode": None, "mulai": "2026-03-02", "terlihat": []}]})
    assert pv == {"95", "96", "11", "94", "92"} and tp == 0 and ("95", "2026-03-01") in E3[("DIBI", "hujan")] and ("94", "2026-03-02") in E3[("Logbook", "hujan")]
    # n_efektif: 40 kejadian pada hanya 10 hari kalender berbeda (4 provinsi sehari) -> a + c = 40 tetapi n_efektif 10 -> n_kurang
    provs4 = ["11", "12", "13", "14"]
    E4 = {("DIBI", "hujan"): {(p, t) for t in hari40[:10] for p in provs4}}
    F4, _ = susun({"BMKG sepekan": [(t, (dt.date.fromisoformat(t) - dt.timedelta(days=1)).isoformat(), "hujan", set(provs4)) for t in hari40]})
    n4 = [x for x in hitung(F4, E4, {"DIBI": "2026-12-31"}, provs4) if x["daerah"]["tingkat"] == "nas" and x["kejadian"] == "DIBI"][0]
    assert n4["n_kejadian"] == 40 and n4["n_efektif"] == 10 and n4["status"] == "n_kurang" and n4["pod"] is None
    assert nas["n_efektif"] == 40
    # bangun end-to-end, tanpa angka bila arsip pendek, tanpa kata terlarang, deterministik
    dibi = {"kejadian": [{"tanggal": "2026-03-20", "jenis": "Banjir", "prov": "Aceh", "prov_kode": "11"}]}
    o1 = bangun("2026-03-30", dibi, {"kejadian": []}, art, [], {})
    o2 = bangun("2026-03-30", dibi, {"kejadian": []}, art, [], {})
    assert o1 == o2 and all(s["status"] == "belum_cukup" for s in o1["sel"])
    import json
    teks = json.dumps(o1, ensure_ascii=False).lower()
    assert "aman" not in teks.replace("peringatan dini", "") and "pantau bencana" not in teks
    # arsip append-only: jalan ulang hari yang sama tidak menimpa; baris lama utuh
    with tempfile.TemporaryDirectory() as t:
        j = os.path.join(t, "a", "2026-03.jsonl")
        assert tambah_arsip(j, "2026-03-30", {"x": 1}) and not tambah_arsip(j, "2026-03-30", {"x": 2}) and tambah_arsip(j, "2026-03-31", {"x": 3})
        ls = open(j).read().splitlines()
        assert len(ls) == 2 and '"x":1' in ls[0]
        simpan(os.path.join(t, "o.json"), o1)
        assert baca(os.path.join(t, "o.json")) == o1 and not os.path.exists(os.path.join(t, "o.json.tmp"))
    print("rapor_sumber uji: ok", file=sys.stderr)


if __name__ == "__main__":
    uji() if sys.argv[1:] == ["uji"] else main()
