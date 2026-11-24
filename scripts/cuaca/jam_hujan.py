"""Jam rawan hujan per kabupaten (H13, ALGORITMA A3) dari IMERG per jam hasil panen_lab.py skema 2 (stdlib).
Masukan: folder berisi imerg_kab_YYYY-MM.json.gz; kab.<kode>.j = {hari WIB: [24 int 0,1 mm, indeks = jam UTC]}.
Keluaran public/cuaca/data/jam_hujan.json: kab.<kode>.{semua, DJF, MAM, JJA, SON} masing-masing
 {n_hari, pangsa[24], jam_puncak, jendela_70:{mulai,panjang}, amplitudo, merata, peluang_jam[24]}, semuanya JAM LOKAL (WIB +7, WITA +8, WIT +9 menurut kode provinsi).
Hari yang dihitung = hari lengkap (n_slot == 48); hari tanpa entri j = tanpa hujan (nol). Musim menurut bulan hari WIB. Hari dengan slot hilang dibuang, bukan ditebak.
peluang_jam[h] = bagian hari dengan rerata-kab jam itu >= 1 mm/jam; pangsa = jumlah jam h / jumlah semua jam. Rerata-kab ADALAH perataan sel, jadi hujan lokal deras tampak kecil: pakai "±".
Pakai: python3 scripts/cuaca/jam_hujan.py [--masuk DIR] [--keluar FILE]   |   ... uji
Keluar 3 bila tak ada berkas bersekema 2 (panen ulang H90 dulu); keluaran lama tak disentuh.
"""
import argparse, glob, gzip, json, os, sys

AKAR = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".."))
MASUK = os.path.join(AKAR, "..", "lab-bencana", "banjir2", "hujan_jam")
KELUAR = os.path.join(AKAR, "public/cuaca/data/jam_hujan.json")
WITA = {"51", "52", "53", "63", "64", "65", "71", "72", "73", "74", "75", "76"}
WIT = {"81", "82", "91", "92", "93", "94", "95", "96"}
MUSIM = {12: "DJF", 1: "DJF", 2: "DJF", 3: "MAM", 4: "MAM", 5: "MAM", 6: "JJA", 7: "JJA", 8: "JJA", 9: "SON", 10: "SON", 11: "SON"}
MIN_HARI = 20          # di bawah ini satu irisan ditulis null, bukan angka dari sampel kecil
AMBANG_70, AMBANG_BASAH = 0.7, 10      # 70% hujan; 1 mm/jam = 10 satuan 0,1 mm
AMBANG_MERATA = 1.0    # HIPOTESIS sementara (A3 tak menyebut angka): amplitudo < 1,0 = "merata"; kalibrasi saat data lengkap ada


def geser(prov):
    return 9 if prov in WIT else 8 if prov in WITA else 7


def jendela(p, bagian=AMBANG_70):
    """Jendela bersambung terpendek (melingkar 24 jam) dengan jumlah >= bagian; seri: jumlah terbesar, lalu mulai terkecil."""
    best = None
    for L in range(1, 25):
        for m in range(24):
            s = sum(p[(m + i) % 24] for i in range(L))
            if s >= bagian - 1e-12 and (best is None or s > best[2] + 1e-12):
                best = (m, L, s)
        if best:
            return {"mulai": best[0], "panjang": best[1]}
    return None


def ringkas(jum, basah, n):
    """jum[24] = jumlah satuan 0,1 mm per jam LOKAL, basah[24] = cacah hari >= 1 mm/jam, n = hari lengkap."""
    tot = sum(jum)
    if n < MIN_HARI or tot <= 0:
        return None
    p = [x / tot for x in jum]
    amp = (max(p) - min(p)) * 24
    return {"n_hari": n, "pangsa": [round(x, 4) for x in p], "jam_puncak": p.index(max(p)), "jendela_70": jendela(p),
            "amplitudo": round(amp, 2), "merata": amp < AMBANG_MERATA, "peluang_jam": [round(b / n, 4) for b in basah]}


def hitung(bulanan, prov_kab):
    """bulanan: [isi imerg_kab skema 2]; prov_kab: {kode: kode_prov}. -> {kode: {semua|DJF|..: ringkas}}."""
    acc = {}
    for isi in bulanan:
        for k, v in isi["kab"].items():
            sh = geser(prov_kab.get(k, k[:2]))
            a = acc.setdefault(k, {m: [[0] * 24, [0] * 24, 0] for m in ("semua", "DJF", "MAM", "JJA", "SON")})
            for hari, r in v["d"].items():
                if r[0] != 48 or not hari.startswith(isi["meta"]["bulan"]):
                    continue
                j = v.get("j", {}).get(hari)
                for m in ("semua", MUSIM[int(hari[5:7])]):
                    A = a[m]; A[2] += 1
                    if j:
                        for u in range(24):
                            h = (u + sh) % 24
                            A[0][h] += j[u]
                            if j[u] >= AMBANG_BASAH:
                                A[1][h] += 1
    return {k: {m: ringkas(*A) for m, A in a.items()} for k, a in sorted(acc.items())}


def muat(masuk):
    out = []
    for f in sorted(glob.glob(os.path.join(masuk, "imerg_kab_*.json.gz"))):
        d = json.load(gzip.open(f, "rt"))
        if d.get("meta", {}).get("skema", 1) >= 2:
            out.append(d)
    return out


def utama(a):
    B = muat(a.masuk)
    if not B:
        print("jam_hujan: tak ada berkas skema 2 (j) di", a.masuk, "; panen ulang lewat panen-lab-banjir dulu", file=sys.stderr); return 3
    W = json.load(open(os.path.join(AKAR, "public/data/bnpb/wilayah.json")))["kab"]
    hasil = hitung(B, {w["kode"]: w["prov"] for w in W})
    isi = {"meta": {"bulan": [b["meta"]["bulan"] for b in B], "jam": "lokal; WIB+7 WITA+8 WIT+9 menurut provinsi", "ambang_basah_mm_jam": 1,
                    "ambang_merata_sementara": AMBANG_MERATA, "min_hari": MIN_HARI, "sumber": "IMERG HH per kab (panen_lab.py skema 2)"}, "kab": hasil}
    os.makedirs(os.path.dirname(a.keluar), exist_ok=True)
    json.dump(isi, open(a.keluar + ".tmp", "w"), ensure_ascii=False, separators=(",", ":")); os.replace(a.keluar + ".tmp", a.keluar)
    print("jam_hujan: tertulis", a.keluar, len(hasil), "kab,", len(B), "bulan"); return 0


def uji(masuk=MASUK):
    # --- cek hitung dengan jawaban diketahui (data BUATAN, bukan IMERG nyata) ---
    assert jendela([1 / 24] * 24)["panjang"] == 17            # merata: 17 jam = 70,8%
    p = [0.0] * 24; p[22] = p[23] = p[0] = 0.25; p[12] = 0.25   # puncak melingkar lewat tengah malam
    assert jendela(p) == {"mulai": 22, "panjang": 3} or jendela(p)["panjang"] <= 3, jendela(p)
    assert geser("15") == 7 and geser("73") == 8 and geser("91") == 9
    # kab "7371" (WITA) hujan 3 mm di jam UTC 8 (= 16 lokal) tiap hari Jan 2026; 31 hari lengkap; kab "3171" (WIB) 1 mm di UTC 8 (= 15 lokal)
    hari = [f"2026-01-{i:02d}" for i in range(1, 32)]
    def kab(mm10): return {"t": False, "d": {h: [48, 0, 0, 0, 0, 0, 0, 0, 0] for h in hari}, "j": {h: [mm10 if u == 8 else 0 for u in range(24)] for h in hari}}
    isi = {"meta": {"bulan": "2026-01", "skema": 2}, "kab": {"7371": kab(30), "3171": kab(10)}}
    r = hitung([isi], {"7371": "73", "3171": "31"})
    m, w = r["7371"]["semua"], r["3171"]["semua"]
    assert m["jam_puncak"] == 16 and w["jam_puncak"] == 15 and m["pangsa"][16] == 1.0 and m["n_hari"] == 31 == r["7371"]["DJF"]["n_hari"], m
    assert m["jendela_70"] == {"mulai": 16, "panjang": 1} and m["peluang_jam"][16] == 1.0 and w["peluang_jam"][15] == 1.0 and not m["merata"] and m["amplitudo"] == 24
    assert r["7371"]["MAM"] is None                             # irisan kosong -> null, bukan angka
    isi["kab"]["3171"]["d"]["2026-01-05"][0] = 40               # hari tak lengkap dibuang
    assert hitung([isi], {})["3171"]["semua"]["n_hari"] == 30
    # --- data nyata ---
    B = muat(masuk)
    if not B:
        print("jam_hujan uji: cek buatan OK; data nyata TIDAK diuji (belum ada imerg_kab skema 2 di", masuk + ")"); return 0
    W = json.load(open(os.path.join(AKAR, "public/data/bnpb/wilayah.json")))["kab"]
    r = hitung(B, {w["kode"]: w["prov"] for w in W})
    for k, v in r.items():
        s = v["semua"]
        if s:
            assert abs(sum(s["pangsa"]) - 1) < 1e-2 and 0 <= s["jam_puncak"] < 24 and all(0 <= x <= 1 for x in s["peluang_jam"]), k
    print("jam_hujan uji OK, data nyata", len(B), "bulan,", len(r), "kab"); return 0


if __name__ == "__main__":
    p = argparse.ArgumentParser(); p.add_argument("cmd", nargs="?", default="jalan", choices=("jalan", "uji"))
    p.add_argument("--masuk", default=MASUK); p.add_argument("--keluar", default=KELUAR)
    a = p.parse_args(); sys.exit(uji(a.masuk) if a.cmd == "uji" else utama(a))
