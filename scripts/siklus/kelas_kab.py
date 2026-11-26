"""Tabel kelas bahaya nasional K per kabupaten (DP-02b, KEPUTUSAN-DAMPAK D34): banjir dan longsor, 514 kab.

Sampel bangunan per kab (sistematis menurut kumulatif jumlah bangunan sel halus, jadi tiap titik mewakili bangunan sama banyak)
dikelaskan lewat bahaya_kelas.sampel (jeda 2 dtk per panggilan, registri). K = kelas tertinggi yang memuat >= 10 persen sampel
terliput (BAWAAN SEMENTARA, ALGORITMA 5); tak terliput > 50 persen atau tanpa sampel = null "belum terukur", tidak pernah rendah.
Bisa dilanjutkan: satu berkas cache per kab di data/raw/siklus/kelas_kab (gitignored); jalankan --bangun lagi sampai selesai.
Pakai: python3 -I scripts/siklus/kelas_kab.py --cek | --bangun [PROV]
"""
import importlib.util, json, os, sys, time

AB = os.path.dirname(os.path.abspath(__file__))
AKAR = os.path.abspath(os.path.join(AB, "../.."))
KELUAR = os.path.join(AKAR, "public/data/kelas_bahaya_kab.json")
CACHE = os.path.join(AKAR, "data/raw/siklus/kelas_kab")
BAHAYA = ("banjir", "longsor")
N_SAMPEL = 200          # titik per kab per bahaya = satu panggilan getSamples
PORSI_MIN = 0.10        # BAWAAN SEMENTARA (ALGORITMA 5)
TAK_TERLIPUT_MAKS = 0.5


def _muat(nama, rel):
    s = importlib.util.spec_from_file_location(nama, os.path.join(AKAR, rel))
    m = importlib.util.module_from_spec(s)
    s.loader.exec_module(m)
    return m


def pilih(sel, n=N_SAMPEL):
    """sel [(i, j, n_bangunan, ..., lon, lat)] -> titik [(lon, lat)] sistematis menurut kumulatif bangunan (deterministik)."""
    sel = sorted(sel, key=lambda c: (c[0], c[1]))
    tot = sum(c[2] for c in sel)
    if not tot:
        return []
    out, kum, k = [], 0, 0
    for c in sel:
        kum += c[2]
        while k < n and (k + .5) * tot / n < kum:
            out.append((c[5], c[6]))
            k += 1
    return out


def ringkas(h):
    """h [H|None] -> {sampel, terliput, kelas{rendah,sedang,tinggi,tak_terliput: jumlah titik}, K}. K null bila belum terukur."""
    HK = _muat("sk_bahaya_kelas", "scripts/siklus/bahaya_kelas.py")
    k = {c: 0 for c in HK.KELAS + ("tak_terliput",)}
    for v in h:
        k[HK.kelas(v) or "tak_terliput"] += 1
    n, ter = len(h), len(h) - k["tak_terliput"]
    K = None
    if n and ter and k["tak_terliput"] / n <= TAK_TERLIPUT_MAKS:
        K = next((c for c in reversed(HK.KELAS) if k[c] / ter >= PORSI_MIN), None)
    return {"sampel": n, "terliput": ter, "kelas": k, "K": K}


def satu_kab(prov, kab4, P, HK):
    sel = P.sel_kab(prov, kab4)[0]
    titik = pilih(sel)
    return {b: ringkas(HK.sampel(b, titik)) if titik else None for b in BAHAYA}


def bangun(prov=None):
    P, HK = _muat("sk_paparan", "scripts/siklus/paparan.py"), _muat("sk_bahaya_kelas", "scripts/siklus/bahaya_kelas.py")
    kk = _muat("sk_hvc", "scripts/bnpb/hvc_dasar.py").kab_kode()
    ada = set(P.semua_kab())
    os.makedirs(CACHE, exist_ok=True)
    hasil, belum = {}, 0
    for kunci, kab4 in sorted(kk.items(), key=lambda x: x[1]):
        p, nama = kunci.split("|", 1)
        if prov and p != prov:
            continue
        f = os.path.join(CACHE, f"{kab4}.json")
        if os.path.exists(f):
            r = json.load(open(f))
        elif (p, kab4) not in ada:
            r = {b: None for b in BAHAYA}   # tanpa grid bangunan provinsi: belum terukur, bukan rendah
        else:
            try:
                r = satu_kab(p, kab4, P, HK)
            except (Exception, SystemExit) as e:
                print(f"{kab4} gagal: {str(e)[:120]}", flush=True)
                r = None
            if r and all(r[b] and r[b]["terliput"] for b in BAHAYA):
                json.dump(r, open(f, "w"))   # simpan hanya yang terliput; sisanya dicoba lagi di putaran berikut
                print(f"{kab4} {nama}: " + " ".join(f"{b}={r[b]['K']}" for b in BAHAYA), flush=True)
            else:
                r = r or {b: None for b in BAHAYA}
        hasil[kab4] = {"nama": nama, "prov": p, **{b: r.get(b) for b in BAHAYA}}
        belum += any(hasil[kab4][b] is None for b in BAHAYA)
    tulis(hasil) if not prov else None
    print(json.dumps({"kab": len(hasil), "belum_terukur_sebagian": belum}, ensure_ascii=False))


def tulis(hasil):
    o = {"dibuat": time.strftime("%Y-%m-%dT%H:%M:%S+07:00", time.gmtime(time.time() + 7 * 3600)), "bahaya": list(BAHAYA),
         "yakin": "estimasi-model", "sampel_per_kab": N_SAMPEL,
         "metode": "titik sistematis menurut kumulatif bangunan sel halus 110 m (Google Open Buildings), H InaRISK dibaca di pusat sel",
         "aturan_K": f"kelas tertinggi dengan >= {int(PORSI_MIN*100)} persen sampel terliput (bawaan sementara); tak terliput > {int(TAK_TERLIPUT_MAKS*100)} persen = null",
         "catatan": "null = belum terukur (tanpa grid bangunan, tanpa sampel terliput, atau gagal ambil); tidak pernah rendah.",
         "kab": hasil}
    json.dump(o, open(KELUAR, "w"), ensure_ascii=False, separators=(",", ":"))


def _cek():
    # P26: tak terliput tidak pernah rendah
    assert ringkas([None] * 10)["K"] is None
    assert ringkas([])["K"] is None
    r = ringkas([None] * 6 + [.1] * 4)   # 60 persen tak terliput
    assert r["K"] is None and r["kelas"]["rendah"] == 4
    r = ringkas([None] * 5 + [.1] * 5)   # tepat 50 persen: masih sah, rendah
    assert r["K"] == "rendah" and r["terliput"] == 5
    assert ringkas([.1] * 9 + [.9])["K"] == "tinggi"     # 10 persen tinggi
    assert ringkas([.1] * 19 + [.9])["K"] == "rendah"    # 5 persen tinggi, di bawah porsi
    assert ringkas([.1] * 8 + [.5, .9])["K"] == "tinggi"
    # pilihan titik deterministik, sebanding bangunan, tanpa sel kosong
    sel = [(0, 0, 90, 0, 0, 100.0, -1.0), (0, 1, 10, 0, 0, 100.1, -1.0), (0, 2, 0, 0, 0, 100.2, -1.0)]
    t = pilih(sel, 10)
    assert len(t) == 10 and t.count((100.0, -1.0)) == 9 and (100.2, -1.0) not in t and t == pilih(sel, 10)
    assert pilih([], 5) == [] and pilih([(0, 0, 0, 0, 0, 1, 1)], 5) == []
    # keluaran terbit (bila ada): 514 kab, null tidak pernah rendah, sampel tertulis
    if os.path.exists(KELUAR):
        o = json.load(open(KELUAR))
        assert len(o["kab"]) == 514 and o["sampel_per_kab"] == N_SAMPEL, len(o["kab"])
        for v in o["kab"].values():
            for b in BAHAYA:
                x = v[b]
                assert x is None or x["K"] in (None, "rendah", "sedang", "tinggi")
                if x and x["sampel"] and x["kelas"]["tak_terliput"] / x["sampel"] > TAK_TERLIPUT_MAKS:
                    assert x["K"] is None
                if x and not x["terliput"]:
                    assert x["K"] is None
    print("kelas_kab: cek hijau")


if __name__ == "__main__":
    if "--cek" in sys.argv:
        _cek()
    elif "--bangun" in sys.argv:
        bangun(next((a for a in sys.argv[1:] if not a.startswith("-")), None))
    else:
        sys.exit("pakai: kelas_kab.py --cek | --bangun [PROV]")
