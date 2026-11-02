#!/usr/bin/env python3
"""Masalah otomatis Kemitraan Kampus (ALGORITMA.md §3, KM-B03). Murni: profil 514 kab (dict) -> blok `masalah` dan `masalah_skor`.
Komponen H F T D P K per (kab, bahaya) -> persentil nasional (rank-min, seri terendah) -> S_auto (bobot konst.py) -> kelas -> aturan aspek.
Aturan isi: komponen tanpa data = null (bukan 0) dan dikeluarkan dari skor; < KOMP_MIN komponen = tanpa skor dan tanpa masalah.
Vonis uji balik model BUKAN pembentuk masalah (keputusan pemilik 2 Nov 2026): hanya bukti tambahan.
Dipanggil profil_daerah.py (bangun/validasi). Pakai: python3 -I scripts/kemitraan/masalah.py --cek"""
import bisect, json, os, re, sys, glob

AKAR = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".."))
sys.path.insert(0, os.path.join(AKAR, "scripts", "kemitraan"))
from konst import KONST  # noqa: E402

BOBOT, M, KL, AT = KONST["BOBOT"]["auto"], KONST["MASALAH"], KONST["KELAS"], KONST["ATURAN"]
BAHAYA_HITUNG = ("banjir", "longsor", "gempa", "tsunami", "gunungapi", "kekeringan", "karhutla", "cuaca_ekstrem", "abrasi_rob")  # udara, multi: tanpa skor otomatis
KOMP = ("H", "F", "T", "D", "P", "K")
NAMA = {"banjir": "banjir", "longsor": "longsor", "gempa": "gempa bumi", "tsunami": "tsunami", "gunungapi": "gunung api",
        "kekeringan": "kekeringan", "karhutla": "karhutla", "cuaca_ekstrem": "cuaca ekstrem", "abrasi_rob": "abrasi dan rob"}
YAKIN = ("resmi", "terverifikasi", "estimasi-model", "asumsi-kebijakan")  # terkuat -> terlemah
JENIS_F = {"banjir": ("banjir",), "longsor": ("longsor",), "cuaca_ekstrem": ("cuaca",), "kekeringan": ("kering",), "abrasi_rob": ("rob", "gelombang")}
JENIS_T = {"banjir": "banjir", "longsor": "longsor", "cuaca_ekstrem": "cuaca", "kekeringan": "kering"}  # abrasi_rob: dua jenis, tak ada tren gabungan -> T null
UJI_BAHAYA = {"banjir": ("banjir_longsor",), "longsor": ("longsor",), "gempa": ("gempa",), "kekeringan": ("kekeringan",),
              "karhutla": ("karhutla_sebaran_sel", "karhutla_sebaran_luas", "karhutla_jejak_api", "karhutla_peluang")}
A2_BAHAYA = ("banjir", "longsor", "cuaca_ekstrem", "karhutla")
JUDUL = {"A5": "{B} berisiko tinggi, belum tercatat dokumen rencana", "A1": "Kejadian {b} meningkat, penyebab lokal belum dipetakan",
         "A2": "{B} berulang, peringatan dini lokal belum teruji", "A9": "Dampak {b} besar dalam 12 bulan, pemulihan perlu dikawal",
         "A7": "Kelompok rentan banyak di wilayah {b}", "A3k": "Karhutla di lahan gambut, pembasahan belum efektif",
         "A3g": "Bangunan di zona {b} perlu dinilai ketahanannya"}
VONIS_AWAL = "Vonis NASIONAL"
RE_ANGKA = re.compile(r"\d")
MASALAH_ARTI = ("komponen H F T D P K = persentil nasional 0-1 (peringkat terendah untuk nilai kembar, per komponen dan bahaya), K = 1 - tercatat/5 langsung; "
                "bobot dan ambang = asumsi-kebijakan (konst.py), belum dikalibrasi; skor null bila < 4 komponen tersedia; masalah dibentuk hanya bila skor >= 0,40; "
                "komponen yang nilai mentahnya sama untuk semua kab pada bahaya itu (varians nol, tak informatif) dikeluarkan dari skor dan komponen_n, dicatat di tak_informatif; "
                "vonis uji balik model = bukti tambahan nasional, bukan pembentuk masalah")


def b4(x):
    """4 desimal, setengah ke atas."""
    return int(x * 10000 + 0.5) / 10000


def persentil(xs, x):
    """Persentil nasional rank-min: bisect_left/(n-1) atas xs non-null; n < 2 atau x null -> None."""
    xs = sorted(v for v in xs if v is not None)
    if len(xs) < 2 or x is None:
        return None
    return b4(bisect.bisect_left(xs, x) / (len(xs) - 1))


def skor_auto(komp):
    """Rata-rata berbobot komponen non-null (bobot dinormalkan ulang); < KOMP_MIN komponen -> None. Tidak dibulatkan."""
    ada = [c for c in KOMP if komp.get(c) is not None]
    if len(ada) < M["KOMP_MIN"]:
        return None
    return sum(BOBOT[c] * komp[c] for c in ada) / sum(BOBOT[c] for c in ada)


def kelas_dari(S, H, K):
    if S is None:
        return None
    if S >= KL["P1_S"] or (H is not None and K is not None and H >= KL["P1_H"] and K >= KL["P1_K"]):
        return "P1"
    return "P2" if S >= KL["P2_S"] else "P3"


def aturan_aspek(b, komp, skor, rpb=None, renkon=None, tren=None, gambut_pct=None):
    """Aspek (A) yang terbentuk untuk pasangan (kab, bahaya) bila skor >= S_MIN (ALG §3.3). Kunci kapasitas None = tak diketahui: aturan tak jalan."""
    if skor is None or skor < M["S_MIN"]:
        return []
    H, F, T, D, P = (komp.get(c) for c in ("H", "F", "T", "D", "P"))
    out = []
    if H is not None and H >= AT["H_DOK"] and rpb is False and renkon is False:
        out.append("A5")
    if F is not None and T is not None and F >= AT["F"] and T >= AT["T"] and tren == "naik":
        out.append("A1")
    if b in A2_BAHAYA and F is not None and F >= AT["F"]:
        out.append("A2")
    if D is not None and D >= AT["D"]:
        out.append("A9")
    if P is not None and H is not None and P >= AT["P"] and H >= AT["H_P"]:
        out.append("A7")
    if (b == "karhutla" and gambut_pct is not None and gambut_pct > AT["GAMBUT_PCT"]) or (b in ("gempa", "tsunami") and H is not None and H >= AT["H_GEMPA"]):
        out.append("A3")
    return sorted(out, key=lambda a: int(a[1:]))


def judul(b, a):
    k = "A3k" if (a == "A3" and b == "karhutla") else "A3g" if a == "A3" else a
    return JUDUL[k].format(B=NAMA[b][0].upper() + NAMA[b][1:], b=NAMA[b])


def idn(x, d=1):
    s = f"{x:,.{d}f}".replace(",", "#").replace(".", ",").replace("#", ".")
    return s


# ---------------------------------------------------------------- bahan mentah per profil
def _kap(p):
    k = p.get("kapasitas")
    if not k:
        return None
    bp = k.get("bpbd")
    fl = (k.get("perda_pb"), k.get("perda_bpbd"), k.get("rpb"), k.get("renkon"))
    if bp is None or any(f is None for f in fl):
        return None
    return sum(1 for f in fl if f is True) + (1 if bp.get("status") == "Terbentuk" else 0)


def _tren(p, b):
    kj = p.get("kejadian")
    if b in JENIS_T:
        return ((kj or {}).get("tren") or {}).get(JENIS_T[b])
    return (p.get("karhutla") or {}).get("tren_viirs") if b == "karhutla" else None


def mentah(p, b, ada_dibi):
    """Nilai mentah satu (profil, bahaya): dict H F T D (angka/None) + 'ket' (rincian untuk bukti)."""
    ir, kj, pd, kh, gm = (p.get(x) for x in ("irbi", "kejadian", "penduduk", "karhutla", "gempa"))
    jiwa = (pd or {}).get("total") or None
    ket, F, T, D = {}, None, None, None
    H = ((ir or {}).get("bahaya") or {}).get(b)
    n = None
    if b in JENIS_F:
        tot = (kj or {}).get("total_2015_2025") or {}
        ada = [j for j in JENIS_F[b] if j in tot]
        n = sum(tot[j] for j in ada) if ada else None
        ket["F"] = (n, tuple(ada))
    elif b == "karhutla":
        ty = [v for y, v in ((kh or {}).get("titik_tahun") or []) if 2015 <= y <= 2025]
        n = sum(ty) if ty else None
        ket["F"] = (n, ("viirs",))
    elif b == "gempa":
        n = ((gm or {}).get("risiko") or {}).get("n_2000_2025_100km")
        ket["F"] = (n, ("gempa100",))
    if n is not None and jiwa:
        F = n / jiwa * 100000
    if b in JENIS_T:
        j = JENIS_T[b]
        kata, ls = ((kj or {}).get("tren") or {}).get(j), ((kj or {}).get("tren_lereng") or {}).get(j)
    elif b == "karhutla":
        kata, ls = (kh or {}).get("tren_viirs"), (kh or {}).get("tren_viirs_lereng")
    else:
        kata = ls = None
    if kata in ("naik", "datar", "turun") and ls is not None:
        T = ls
    ket["T"] = (kata, ls)
    if kj is not None and ada_dibi.get(b):
        d = ((kj.get("dampak_12bln_bahaya") or {}).get(b)) or {"meninggal": 0, "mengungsi": 0, "rr_berat": 0}
        ket["D"] = d
        D = d["meninggal"] * 10 + d["mengungsi"] / 100 + d["rr_berat"]
    pa = pb = None
    if pd and pd.get("balita") is not None and pd.get("lansia") is not None:
        pa = pd["balita"] + pd["lansia"]
    if pd and pd.get("bangunan"):
        pb = pd["bangunan"]["n"]
    return {"H": H, "F": F, "T": T, "D": D, "Pa": pa, "Pb": pb, "ket": ket}


def _yakin_lemah(ys):
    return max(ys, key=YAKIN.index)


def bk(teks, nilai, blk):
    return {"teks": teks, "nilai": nilai, "sumber": blk["sumber"], "tanggal": blk["tanggal"], "yakin": blk["yakin"]}


def bukti_komp(p, b, mt, c):
    """Bukti angka ASLI (bukan persentil) untuk komponen c; [] bila tak ada."""
    nm = NAMA[b]
    if c == "H" and mt["H"] is not None:
        return [bk(f"Skor bahaya IRBI 2025 {nm}", mt["H"], p["irbi"])]
    if c == "F" and mt["F"] is not None:
        n, js = mt["ket"]["F"]
        r = round(mt["F"], 2)
        if js == ("viirs",):
            return [bk(f"Titik panas VIIRS 2015-2025 di wilayah kab: {idn(n, 0)} titik, {idn(mt['F'])} per 100 rb penduduk", r, p["karhutla"])]
        if js == ("gempa100",):
            return [bk(f"Gempa utama M>=5 radius 100 km, 2000-2025, per 100 rb penduduk: {idn(n, 0)} gempa, {idn(mt['F'])} per 100 rb penduduk", r, p["gempa"])]
        return [bk(f"Kejadian {nm} 2015-2025 (jenis DIBI {'+'.join(js)}, tanpa 2024, DIBI tak lengkap): {idn(n, 0)} kejadian, {idn(mt['F'])} per 100 rb penduduk", r, p["kejadian"])]
    if c == "T" and mt["T"] is not None:
        kata, ls = mt["ket"]["T"]
        blk = p["karhutla"] if b == "karhutla" else p["kejadian"]
        return [bk(f"Tren kejadian {nm} 2015-2025 (Theil-Sen): {kata}, lereng {idn(ls, 3)} per tahun", ls, blk)]
    if c == "D" and "D" in mt["ket"]:
        d = mt["ket"]["D"]
        kj = p["kejadian"]
        return [bk(f"Dampak {nm} 12 bulan terakhir (DIBI): meninggal", d["meninggal"], kj), bk(f"Dampak {nm} 12 bulan terakhir (DIBI): mengungsi", d["mengungsi"], kj),
                bk(f"Dampak {nm} 12 bulan terakhir (DIBI): rumah rusak berat", d["rr_berat"], kj)]
    if c == "P":
        pd = p["penduduk"]
        out = []
        if mt["Pa"] is not None:
            out.append(bk("Balita dan lansia (jiwa)", mt["Pa"], pd))
        if mt["Pb"] is not None:
            out.append(bk("Bangunan (unit, estimasi model)", mt["Pb"], pd))
        return out
    return []


def bukti_aspek(p, b, mt, a):
    kp = p["kapasitas"]
    if a == "A5":
        return bukti_komp(p, b, mt, "H") + [bk("RPB tercatat di basis regulasi: tidak", kp["rpb"], kp), bk("Rencana kontinjensi tercatat di basis regulasi: tidak", kp["renkon"], kp)]
    if a == "A1":
        return bukti_komp(p, b, mt, "F") + bukti_komp(p, b, mt, "T")
    if a == "A2":
        return bukti_komp(p, b, mt, "F") + bukti_komp(p, b, mt, "T") + bukti_komp(p, b, mt, "H")
    if a == "A9":
        return bukti_komp(p, b, mt, "D")
    if a == "A7":
        return bukti_komp(p, b, mt, "P") + bukti_komp(p, b, mt, "H")
    kh = p["karhutla"]
    if b == "karhutla":
        return [bk("Gambut dalam wilayah kab (persen luas, estimasi grid)", kh["gambut_pct"], kh), bk("Gambut dalam wilayah kab (hektare, dibulatkan ribuan)", kh["gambut_ha"], kh)]
    gm = p["gempa"]
    return bukti_komp(p, b, mt, "H") + ([bk("Gempa utama M>=5 radius 100 km, 2000-2025", gm["risiko"]["n_2000_2025_100km"], gm)] if gm and gm.get("risiko") else [])


def vonis(p, b):
    """('gagal', bukti) bila SEMUA sub-uji bahaya b berstatus gagal; selain itu None. Vonis NASIONAL."""
    md = p.get("model")
    sub = UJI_BAHAYA.get(b)
    if not md or not sub:
        return None
    u = md.get("uji") or {}
    if not all(u.get(s) == "gagal" for s in sub):
        return None
    return bk(f"{VONIS_AWAL} uji balik model {NAMA[b]}: gagal ({', '.join(sub)}); bukan hasil uji per kabupaten", "gagal", md)


# ---------------------------------------------------------------- nasional
def kumpulkan(profil):
    """-> (mentah[kab][b], ada_dibi[b]); ada_dibi = ada kab lain yang punya baris DIBI bahaya itu di jendela 12 bulan."""
    ada = dict.fromkeys(BAHAYA_HITUNG, False)
    for p in profil.values():
        for b in ((p.get("kejadian") or {}).get("dampak_12bln_bahaya") or {}):
            ada[b] = True
    return {k: {b: mentah(p, b, ada) for b in BAHAYA_HITUNG} for k, p in profil.items()}, ada


def tak_informatif(vals):
    """True bila >= 2 nilai non-null dan semuanya sama (varians nol): komponen tak membedakan kab, dikeluarkan dari skor."""
    v = [x for x in vals if x is not None]
    return len(v) >= 2 and len(set(v)) == 1


def pct_nasional(mt):
    """-> (pct, tak): pct[kab][b] = {H,F,T,D,P} persentil nasional; tak[b] = komponen bervarians nol (nilainya None di pct).
    Pool per (komponen, bahaya); P tak bergantung bahaya."""
    pool = {(c, b): [m[b][c] for m in mt.values() if m[b][c] is not None] for c in "HFTD" for b in BAHAYA_HITUNG}
    pa = [m[BAHAYA_HITUNG[0]]["Pa"] for m in mt.values() if m[BAHAYA_HITUNG[0]]["Pa"] is not None]
    pb = [m[BAHAYA_HITUNG[0]]["Pb"] for m in mt.values() if m[BAHAYA_HITUNG[0]]["Pb"] is not None]
    tak = {b: {c for c in "HFTD" if tak_informatif(pool[(c, b)])} | ({"P"} if tak_informatif(pa) and tak_informatif(pb) else set()) for b in BAHAYA_HITUNG}
    out = {}
    for k, m in mt.items():
        out[k] = {}
        for b in BAHAYA_HITUNG:
            x = m[b]
            ps = [persentil(pa, x["Pa"]), persentil(pb, x["Pb"])]
            r = {**{c: persentil(pool[(c, b)], x[c]) for c in "HFTD"}, "P": b4(sum(ps) / 2) if None not in ps else None}
            out[k][b] = {c: (None if c in tak[b] else v) for c, v in r.items()}
    return out, tak


def hitung(profil):
    """profil: {kab: profil}. -> {kab: (masalah[], masalah_skor{})}. Persentil nasional dihitung atas SEMUA kab yang diberikan."""
    mt, ada = kumpulkan(profil)
    pc, tak = pct_nasional(mt)
    nks = {k: _kap(p) for k, p in profil.items()}
    k_tak = tak_informatif(list(nks.values()))
    hasil = {}
    for k in sorted(profil):
        p = profil[k]
        nk = nks[k]
        K = b4(1 - nk / 5) if nk is not None and not k_tak else None
        kp = p.get("kapasitas") or {}
        ms, lst = {}, []
        for b in BAHAYA_HITUNG:
            km = {**pc[k][b], "K": K}
            S = skor_auto(km)
            Sr = b4(S) if S is not None else None
            kl = kelas_dari(Sr, km["H"], K)
            n = sum(1 for c in KOMP if km[c] is not None)
            ms[b] = {"skor": Sr, "kelas": kl, "komponen_n": n, **km, "tak_informatif": sorted(tak[b] | ({"K"} if k_tak else set()))}
            if Sr is None:
                continue
            rpb, ren = kp.get("rpb"), kp.get("renkon")
            gp = (p.get("karhutla") or {}).get("gambut_pct")
            aspek = aturan_aspek(b, km, Sr, rpb, ren, mt[k][b]["ket"]["T"][0], gp)
            v = vonis(p, b)
            for a in aspek:
                bu = bukti_aspek(p, b, mt[k][b], a)
                if len(bu) < 2:
                    continue  # tanpa >= 2 bukti bersumber masalah tidak dibuat
                lst.append({"auto_id": f"auto-{k}-{b}-{a}", "B": b, "A": a, "judul": judul(b, a), "skor": Sr, "kelas": kl, "komponen_n": n, "bukti": bu})
            pair = [m for m in lst if m["B"] == b]
            if pair and v:
                pair[0]["bukti"].append(v)  # vonis nasional: bukti tambahan pada masalah pertama pasangan
            for m in pair:
                m["yakin"] = _yakin_lemah([x["yakin"] for x in m["bukti"]])
        hasil[k] = (lst, ms)
    return hasil


def pasang(profil):
    """Isi profil['masalah'] dan ['masalah_skor'] untuk tiap kab (mengubah profil di tempat)."""
    for k, (lst, ms) in hitung(profil).items():
        profil[k]["masalah"], profil[k]["masalah_skor"] = lst, ms
        profil[k]["_masalah_arti"] = MASALAH_ARTI
    return profil


# ---------------------------------------------------------------- validasi per profil
def periksa(p):
    """Tolak masalah/masalah_skor yang melanggar aturan (pesan menyebut angka dan sebab)."""
    k = p["kode"]
    assert isinstance(p.get("masalah"), list) and isinstance(p.get("masalah_skor"), dict), f"{k}: masalah/masalah_skor tak ada"
    ms = p["masalah_skor"]
    assert set(ms) == set(BAHAYA_HITUNG), f"{k}: masalah_skor kunci {sorted(ms)}"
    for b, e in ms.items():
        n = sum(1 for c in KOMP if e[c] is not None)
        assert set(e["tak_informatif"]) <= set(KOMP) and all(e[c] is None for c in e["tak_informatif"]), f"{k}.{b}: komponen tak_informatif {e['tak_informatif']} masih bernilai"
        assert e["komponen_n"] == n, f"{k}.{b}: komponen_n {e['komponen_n']} != {n} komponen non-null"
        S = skor_auto({c: e[c] for c in KOMP})
        if S is None:
            assert e["skor"] is None and e["kelas"] is None and n < M["KOMP_MIN"], f"{k}.{b}: {n} komponen (< {M['KOMP_MIN']}) tapi skor {e['skor']}"
        else:
            assert e["skor"] == b4(S), f"{k}.{b}: skor {e['skor']} != hitung ulang {b4(S)}"
            assert e["kelas"] == kelas_dari(e["skor"], e["H"], e["K"]), f"{k}.{b}: kelas {e['kelas']} != {kelas_dari(e['skor'], e['H'], e['K'])}"
        for c in KOMP:
            assert e[c] is None or (isinstance(e[c], (int, float)) and 0 <= e[c] <= 1), f"{k}.{b}.{c}: {e[c]!r} di luar 0-1"
        kj = p.get("kejadian")
        if kj is None:
            assert e["D"] is None, f"{k}.{b}: blok kejadian null tapi D {e['D']}"
        j = JENIS_T.get(b)
        if j and kj and (kj.get("tren") or {}).get(j) in ("jarang", None):
            assert e["T"] is None, f"{k}.{b}: tren '{(kj.get('tren') or {}).get(j)}' tapi T {e['T']} (jarang/null bukan T)"
        if b == "karhutla" and (p.get("karhutla") or {}).get("tren_viirs") in ("jarang", None):
            assert e["T"] is None, f"{k}.karhutla: tren_viirs jarang/null tapi T {e['T']}"
        if (p.get("irbi") or {}).get("bahaya", {}).get(b) is None:
            assert e["H"] is None, f"{k}.{b}: H {e['H']} tanpa skor IRBI (null bukan 0)"
    ids = [m["auto_id"] for m in p["masalah"]]
    assert len(ids) == len(set(ids)), f"{k}: auto_id ganda {sorted(i for i in set(ids) if ids.count(i) > 1)}"
    for m in p["masalah"]:
        i = m["auto_id"]
        assert i == f"auto-{k}-{m['B']}-{m['A']}" and m["B"] in BAHAYA_HITUNG and m["A"] in KONST["ASPEK"], f"{k}: auto_id {i} salah bentuk"
        assert not RE_ANGKA.search(m["judul"].replace("12 bulan", "")), f"{i}: judul memuat angka '{m['judul']}'"
        assert not m["judul"].startswith("Model"), f"{i}: judul '{m['judul']}' berupa masalah model (vonis hanya bukti)"
        e = ms[m["B"]]
        kp = p.get("kapasitas") or {}
        harap = aturan_aspek(m["B"], e, e["skor"], kp.get("rpb"), kp.get("renkon"), _tren(p, m["B"]), (p.get("karhutla") or {}).get("gambut_pct"))
        assert m["A"] in harap, f"{i}: aturan aspek {m['A']} tidak terpenuhi (aturan_aspek memberi {harap})"
        for x in m["bukti"]:
            if x["teks"].startswith("Skor bahaya IRBI"):
                assert x["nilai"] == ((p.get("irbi") or {}).get("bahaya") or {}).get(m["B"]), f"{i}: bukti H {x['nilai']} != irbi.bahaya {((p.get('irbi') or {}).get('bahaya') or {}).get(m['B'])}"
        assert judul(m["B"], m["A"]) == m["judul"], f"{i}: judul bukan judul baku aspek"
        assert (m["skor"], m["kelas"], m["komponen_n"]) == (e["skor"], e["kelas"], e["komponen_n"]), f"{i}: skor/kelas/komponen_n beda dari masalah_skor"
        assert m["skor"] is not None and m["skor"] >= M["S_MIN"] and m["komponen_n"] >= M["KOMP_MIN"], f"{i}: skor {m['skor']} / {m['komponen_n']} komponen tak layak jadi masalah"
        assert len(m["bukti"]) >= 2 and all(x.get("sumber") and re.fullmatch(r"\d{4}-\d{2}-\d{2}", x.get("tanggal") or "") and x.get("nilai") is not None for x in m["bukti"]), f"{i}: < 2 bukti bersumber/bertanggal bernilai"
    for b in BAHAYA_HITUNG:
        pair = [m for m in p["masalah"] if m["B"] == b]
        nv = [sum(1 for x in m["bukti"] if x["teks"].startswith(VONIS_AWAL)) for m in pair]
        v = vonis(p, b)
        assert nv == ([1] + [0] * (len(pair) - 1) if (pair and v) else [0] * len(pair)), f"{k}.{b}: bukti vonis per masalah {nv}, vonis gagal={bool(v)} (harus tepat 1 di masalah pertama)"
        for m in pair:
            for x in m["bukti"]:
                if x["teks"].startswith(VONIS_AWAL):
                    assert "bukan hasil uji per kabupaten" in x["teks"], f"{m['auto_id']}: vonis tanpa label nasional"
    for m in p["masalah"]:
        assert m["yakin"] == _yakin_lemah([x["yakin"] for x in m["bukti"]]), f"{m['auto_id']}: yakin bukan terlemah bukti"


# ---------------------------------------------------------------- cek
def tolak(fn, bagian, *a):
    try:
        fn(*a)
    except AssertionError as e:
        assert bagian in str(e), f"ditolak dengan sebab lain: {e}"
        return
    raise AssertionError(f"input salah LOLOS ({bagian})")


def _acuan():
    return json.load(open(os.path.join(AKAR, "tests", "kemitraan", "fixtures", "acuan.json"), encoding="utf-8"))


def cek():
    import copy
    ac = _acuan()
    for c in ac["persentil"]:
        h = persentil(c["masuk"]["xs"], c["masuk"]["x"])
        assert h == c["keluar"], f"persentil {c['id']}: {h} != {c['keluar']}"
    for c in ac["skor_auto"]:
        h = skor_auto(c["masuk"])
        assert (h is None) if c["keluar"] is None else abs(h - c["keluar"]) <= 1e-9, f"skor_auto {c['id']}: {h} != {c['keluar']}"
    for c in ac["kelas"]:
        h = kelas_dari(c["masuk"]["S"], c["masuk"]["H"], c["masuk"]["K"])
        assert h == c["keluar"], f"kelas {c['id']}: {h} != {c['keluar']}"
    for c in ac["aspek"]:
        h = aturan_aspek(**c["masuk"])
        assert h == c["keluar"], f"aspek {c['id']}: {h} != {c['keluar']}"
    # pembulatan setengah ke atas, dan tolak pembulatan genap
    assert b4(0.12345) == 0.1235 and b4(0.00005) == 0.0001 and b4(1) == 1
    # ---- atas SEMUA 514 kab di disk (hasil profil_daerah.py)
    d = os.path.join(AKAR, "public", "data", "kemitraan", "daerah")
    P = {}
    for f in sorted(glob.glob(os.path.join(d, "[0-9][0-9][0-9][0-9].json"))):
        p = json.load(open(f, encoding="utf-8"))
        P[p["kode"]] = p
    assert len(P) == 514, f"{len(P)} profil di disk != 514: jalankan profil_daerah.py dulu"
    for p in P.values():
        periksa(p)
    # hitung ulang dari profil tanpa masalah == yang tersimpan (disk tidak basi)
    bersih = {k: {x: v for x, v in p.items() if x not in ("masalah", "masalah_skor", "_masalah_arti")} for k, p in P.items()}
    ulang = hitung(bersih)
    for k, p in P.items():
        assert ulang[k][0] == p["masalah"] and ulang[k][1] == p["masalah_skor"], f"{k}: masalah di disk beda dari hitung ulang; jalankan profil_daerah.py"
    # persentil dihitung ulang dengan cara lain (hitung cacah, bukan bisect) untuk H dan D
    mt, ada = kumpulkan(bersih)
    for b in BAHAYA_HITUNG:
        for c in "HD":
            xs = [m[b][c] for m in mt.values() if m[b][c] is not None]
            for k, m in mt.items():
                v = m[b][c]
                harap = None if (v is None or len(xs) < 2 or len(set(xs)) == 1) else b4(sum(1 for x in xs if x < v) / (len(xs) - 1))
                assert P[k]["masalah_skor"][b][c] == harap, f"{k}.{b}.{c}: {P[k]['masalah_skor'][b][c]} != persentil cacah {harap}"
    # R2: D = 0 (ikut persentil) bila DIBI mencakup bahaya itu; null hanya bila blok kejadian null atau DIBI tak mencakup
    # T3: cakupan DIBI per bahaya dihitung ulang dari sumber mentah (bukan dari kumpulkan/ada milik produksi)
    from profil_daerah import JENIS_DIBI_BAHAYA
    mentah_dibi = json.load(open(os.path.join(AKAR, "public", "data", "dibi_kejadian.json"), encoding="utf-8"))["kejadian"]
    cakup = {b: any(b in JENIS_DIBI_BAHAYA.get(r["jenis"], ()) for r in mentah_dibi) for b in BAHAYA_HITUNG}
    assert cakup == ada, f"cakupan DIBI dari sumber mentah {cakup} != cakupan produksi {ada}"
    # T1: komponen bervarians nol dikeluarkan; pasangan tak boleh menghitung komponen_n dari komponen konstan
    n_tak = 0
    for b in BAHAYA_HITUNG:
        for c in "HFTD":
            v = [m[b][c] for m in mt.values() if m[b][c] is not None]
            konstan = len(v) >= 2 and len(set(v)) == 1
            n_tak += konstan
            for k, p in P.items():
                e = p["masalah_skor"][b]
                assert (c in e["tak_informatif"]) == konstan, f"{k}.{b}.{c}: tak_informatif {e['tak_informatif']} tapi varians mentah {'nol' if konstan else '> 0'} ({len(set(v))} nilai berbeda)"
                assert not konstan or e[c] is None, f"{k}.{b}.{c}: komponen varians nol masih dihitung ({e[c]})"
    assert n_tak > 0, "tak ada komponen bervarians nol (tsunami D diharapkan)"
    for k, p in P.items():
        for b, e in p["masalah_skor"].items():
            assert e["komponen_n"] == sum(1 for c in KOMP if e[c] is not None), f"{k}.{b}: komponen_n salah"
    for b in BAHAYA_HITUNG:
        for k, p in P.items():
            e = p["masalah_skor"][b]
            if p["kejadian"] is not None and ada[b] and "D" not in e["tak_informatif"]:
                assert e["D"] is not None, f"{k}.{b}: DIBI mencakup {b} tapi D null (harus 0 ikut persentil)"
            elif "D" not in e["tak_informatif"]:
                assert e["D"] is None, f"{k}.{b}: D {e['D']} padahal {'blok kejadian null' if p['kejadian'] is None else 'DIBI tak mencakup bahaya'}"
    # K: null hanya bila bendera tak diketahui; false = tidak tercatat
    for k, p in P.items():
        nk = _kap(p)
        assert p["masalah_skor"]["banjir"]["K"] == (b4(1 - nk / 5) if nk is not None else None), f"{k}: K salah"
    n_masalah = sum(len(p["masalah"]) for p in P.values())
    assert n_masalah > 0 and any(m["A"] == "A5" for p in P.values() for m in p["masalah"]), "tak ada masalah sama sekali / tak ada A5"
    kelas = {kl: sum(1 for p in P.values() for e in p["masalah_skor"].values() if e["kelas"] == kl) for kl in ("P1", "P2", "P3", None)}
    # vonis: bukti hanya pada pasangan yang gagal
    n_vonis = sum(1 for p in P.values() for m in p["masalah"] for x in m["bukti"] if x["teks"].startswith(VONIS_AWAL))
    # ---- uji bahwa yang salah DITOLAK
    p = P["6211"]
    assert p["masalah"], "D6: 6211 tanpa masalah"
    def ubah(q0, f):
        q = copy.deepcopy(q0); f(q); return q
    m0 = lambda q: q["masalah"][0]
    ms0 = lambda q: q["masalah_skor"][m0(q)["B"]]
    tolak(periksa, "hitung ulang", ubah(p, lambda q: ms0(q).update(skor=0.9999)))
    tolak(periksa, "kelas", ubah(p, lambda q: ms0(q).update(kelas="P3" if ms0(q)["kelas"] != "P3" else "P1")))
    tolak(periksa, "auto_id ganda", ubah(p, lambda q: q["masalah"].append(copy.deepcopy(q["masalah"][0]))))
    tolak(periksa, "memuat angka", ubah(p, lambda q: m0(q).update(judul="Banjir 5 kali berulang")))
    tolak(periksa, "< 2 bukti", ubah(p, lambda q: m0(q).update(bukti=m0(q)["bukti"][:1])))
    tolak(periksa, "< 2 bukti", ubah(p, lambda q: m0(q)["bukti"][0].pop("sumber")))
    tolak(periksa, "masalah model", ubah(p, lambda q: m0(q).update(judul="Model banjir platform belum lolos uji di wilayah ini")))
    tolak(periksa, "komponen_n", ubah(p, lambda q: ms0(q).update(komponen_n=6 if ms0(q)["komponen_n"] != 6 else 5)))
    tolak(periksa, "komponen (< 4)", ubah(p, lambda q: ms0(q).update(H=None, F=None, T=None, D=None, P=None, K=None, komponen_n=0, skor=0.5)))
    tolak(periksa, "bukan terlemah", ubah(p, lambda q: m0(q).update(yakin="resmi" if m0(q)["yakin"] != "resmi" else "asumsi-kebijakan")))
    tolak(periksa, "masalah_skor kunci", ubah(p, lambda q: q["masalah_skor"].pop("banjir")))
    # vonis: bukti pada pasangan tanpa vonis ditolak; pada pasangan bervonis harus tepat satu (hilang / ganda ditolak)
    tanpa = next(q for q in P.values() if q["masalah"] and not vonis(q, q["masalah"][0]["B"]))
    tolak(periksa, "bukti vonis", ubah(tanpa, lambda q: m0(q)["bukti"].append(bk(f"{VONIS_AWAL} palsu; bukan hasil uji per kabupaten", "gagal", q["wilayah"]))))
    dgn = next(q for q in P.values() if any(x["teks"].startswith(VONIS_AWAL) for m in q["masalah"] for x in m["bukti"]))
    bv = next(m for m in dgn["masalah"] if any(x["teks"].startswith(VONIS_AWAL) for x in m["bukti"]))
    tolak(periksa, "bukti vonis", ubah(dgn, lambda q: next(m for m in q["masalah"] if m["auto_id"] == bv["auto_id"]).update(bukti=[x for x in bv["bukti"] if not x["teks"].startswith(VONIS_AWAL)])))
    tolak(periksa, "bukti vonis", ubah(dgn, lambda q: next(m for m in q["masalah"] if m["auto_id"] == bv["auto_id"])["bukti"].append(bv["bukti"][-1])))
    # T4: syarat aspek ditegakkan lewat aturan_aspek
    a5 = next(q for q in P.values() if any(m["A"] == "A5" for m in q["masalah"]))
    tolak(periksa, "aturan aspek", ubah(a5, lambda q: q["kapasitas"].update(rpb=True)))
    h5 = next(q for q in P.values() if any(m["A"] == "A5" for m in q["masalah"]))
    def h_palsu(q):
        m = next(m for m in q["masalah"] if m["A"] == "A5"); x = next(x for x in m["bukti"] if x["teks"].startswith("Skor bahaya IRBI")); x["nilai"] = x["nilai"] + 1
    tolak(periksa, "bukti H", ubah(h5, h_palsu))
    q9 = next(q for q in P.values() if any(m["A"] == "A5" and (q["masalah_skor"][m["B"]]["D"] or 0) < AT["D"] for m in q["masalah"]))
    def a9_ok(q):
        m = next(m for m in q["masalah"] if m["A"] == "A5" and (q["masalah_skor"][m["B"]]["D"] or 0) < AT["D"])
        m["A"] = "A9"; m["auto_id"] = f"auto-{q['kode']}-{m['B']}-A9"; m["judul"] = judul(m["B"], "A9")
    tolak(periksa, "aturan aspek", ubah(q9, a9_ok))
    # null bukan 0: H terisi padahal skor IRBI bahaya itu tak ada
    def h0(q):
        b = m0(q)["B"]; q["irbi"]["bahaya"].pop(b, None)
    tolak(periksa, "null bukan 0", ubah(p, h0))
    # tren 'jarang' bukan T
    bq, jq = next((q, b) for q in P.values() for b in JENIS_T if q["masalah_skor"][b]["T"] is not None)
    tolak(periksa, "jarang", ubah(bq, lambda q: q["kejadian"]["tren"].update({JENIS_T[jq]: "jarang"})))
    print(f"OK masalah.py: acuan {len(ac['persentil'])} persentil + {len(ac['skor_auto'])} skor + {len(ac['kelas'])} kelas + {len(ac['aspek'])} aspek; "
          f"514 kab, {n_masalah} masalah, pasangan per kelas {kelas}, bukti vonis {n_vonis}")


if __name__ == "__main__":
    if "--cek" in sys.argv:
        cek()
    else:
        sys.exit(__doc__)
