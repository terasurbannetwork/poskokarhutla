"""Pelacak peristiwa kebakaran dari deteksi VIIRS -> data/raw/sebaran/peristiwa.jsonl

Dua deteksi DIHUBUNGKAN bila jaraknya <= 750 m DAN selisih waktunya <= 24 jam (pola GlobFire/FEDS, dikencangkan).
Peristiwa = komponen terhubung (union-find), jadi api yang menyala berminggu-minggu tetap satu peristiwa selama tiap
celah antar-deteksinya <= 24 jam; dua api yang bertemu menyatu.

Arsip FIRMS di repo ini hanya S-NPP (NOAA-20/21 tidak ada): ~2 lintasan per hari, ~13:30 dan ~01:30 waktu setempat.
Resolusi waktu tertinggi yang jujur = per lintasan (siang/malam), bukan per jam.

Per peristiwa (JSON per baris):
  id, prov, t0 (ISO UTC), lon0, lat0 (pusat deteksi lintasan pertama), n (deteksi), sel (sel 375 m unik), ha (= sel x 14,06),
  jam (durasi deteksi pertama-terakhir), h0 (hari kebakaran pertama, jendela 06-06 waktu setempat),
  det: [[menit, kunci_sel, frp], ...] urut waktu,
  hari: [[h, [sel baru...], arah_deg|null, jauh_m, laju_m_per_jam], ...]  sel yang pertama kali terdeteksi hari itu,
        arah = dari pusat sel terbakar sebelumnya ke pusat sel baru, jauh = maks jarak sel baru ke sel lama terdekat.

Pakai:  python3 scripts/sebaran/lacak.py       |  python3 scripts/sebaran/lacak.py uji
"""
import json, math, os, sys
from array import array

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from umum import (MENTAH, HA_SEL, Prov, arah, hari_lokal, jarak_m, muat_viirs, pusat, sel, waktu)

JARAK = 750.0
JEDA = 24 * 60  # menit
HASH = 0.0075   # derajat, > 750 m, jadi tetangga cukup 3 x 3 kotak


def hubungkan(t, lat, lon, jarak=JARAK, jeda=JEDA):
    """Union-find atas deteksi urut waktu. -> (akar per deteksi, jumlah sambungan, jeda sambungan terbesar)."""
    n = len(t)
    induk = array("l", range(n))

    def akar(a):
        while induk[a] != a:
            induk[a] = induk[induk[a]]
            a = induk[a]
        return a

    kotak = {}
    sambung, jeda_maks = 0, 0
    kx_cache = {}
    for a in range(n):
        ta, la, lo = t[a], lat[a], lon[a]
        gx, gy = math.floor(lo / HASH), math.floor(la / HASH)
        kx = kx_cache.get(gy)
        if kx is None:
            kx = kx_cache[gy] = 111320 * math.cos(math.radians(la))
        for dx in (-1, 0, 1):
            for dy in (-1, 0, 1):
                daf = kotak.get((gx + dx, gy + dy))
                if not daf:
                    continue
                # buang yang sudah lewat jeda (daftar urut waktu)
                s = 0
                while s < len(daf) and ta - t[daf[s]] > jeda:
                    s += 1
                if s:
                    del daf[:s]
                for b in daf:
                    if math.hypot((lon[b] - lo) * kx, (lat[b] - la) * 110574) <= jarak:
                        ra, rb = akar(a), akar(b)
                        if ra != rb:
                            induk[max(ra, rb)] = min(ra, rb)
                        sambung += 1
                        jeda_maks = max(jeda_maks, ta - t[b])
        kotak.setdefault((gx, gy), []).append(a)
    return [akar(a) for a in range(n)], sambung, jeda_maks


def harian(det, lon0):
    """det urut waktu [(menit, sel, frp)] -> [[h, sel_baru, arah, jauh_m, laju]]"""
    per = {}
    terlihat = set()
    for m, k, _ in det:
        if k in terlihat:
            continue
        terlihat.add(k)
        per.setdefault(hari_lokal(m, lon0), []).append(k)
    out, lama = [], []
    hash_lama = {}
    for h in sorted(per):
        baru = per[h]
        a = jauh = None
        if lama:
            cx = sum(pusat(k)[0] for k in lama) / len(lama)
            cy = sum(pusat(k)[1] for k in lama) / len(lama)
            bx = sum(pusat(k)[0] for k in baru) / len(baru)
            by = sum(pusat(k)[1] for k in baru) / len(baru)
            a = round(arah(cx, cy, bx, by)) if jarak_m(cx, cy, bx, by) > 50 else None
            jauh = 0
            for k in baru:
                x, y = pusat(k)
                gx, gy = math.floor(x / .02), math.floor(y / .02)
                best = None
                for r in range(0, 40):  # cincin kotak 0,02 derajat makin lebar sampai ketemu
                    for dx in range(-r, r + 1):
                        for dy in range(-r, r + 1):
                            if max(abs(dx), abs(dy)) != r:
                                continue
                            for q in hash_lama.get((gx + dx, gy + dy), ()):
                                d = jarak_m(x, y, *pusat(q))
                                if best is None or d < best:
                                    best = d
                    if best is not None and best <= r * 2000:
                        break
                jauh = max(jauh, best or 0)
            jauh = round(jauh)
        out.append([h, baru, a, jauh, None if jauh is None else round(jauh / 24, 1)])
        for k in baru:
            x, y = pusat(k)
            hash_lama.setdefault((math.floor(x / .02), math.floor(y / .02)), []).append(k)
        lama += baru
    return out


def main():
    v = muat_viirs()
    t, lat, lon, frp = v["t"], v["lat"], v["lon"], v["frp"]
    print(f"{len(t)} deteksi vegetasi n/h", file=sys.stderr)
    akar, sambung, jeda_maks = hubungkan(t, lat, lon)
    assert jeda_maks <= JEDA, jeda_maks
    grup = {}
    for a, r in enumerate(akar):
        grup.setdefault(r, []).append(a)
    print(f"{len(grup)} peristiwa, {sambung} sambungan, jeda sambungan maks {jeda_maks} menit", file=sys.stderr)
    prov = Prov()
    n_tulis = 0
    with open(os.path.join(MENTAH, "peristiwa.jsonl"), "w") as f:
        for no, (r, idx) in enumerate(sorted(grup.items(), key=lambda g: t[g[0]])):
            m0 = t[idx[0]]
            pertama = [a for a in idx if t[a] - m0 <= 30]
            lo0 = sum(lon[a] for a in pertama) / len(pertama)
            la0 = sum(lat[a] for a in pertama) / len(pertama)
            det = [(t[a], sel(lon[a], lat[a]), round(frp[a], 1)) for a in idx]
            sel_unik = {d[1] for d in det}
            e = {"id": f"E{no:07d}", "prov": prov(lo0, la0), "t0": waktu(m0).isoformat()[:16], "lon0": round(lo0, 5), "lat0": round(la0, 5),
                 "n": len(idx), "sel": len(sel_unik), "ha": round(len(sel_unik) * HA_SEL), "jam": round((t[idx[-1]] - m0) / 60, 1),
                 "h0": hari_lokal(m0, lo0), "det": det}
            e["hari"] = harian(det, lo0) if len(sel_unik) > 1 else [[e["h0"], list(sel_unik), None, None, None]]
            f.write(json.dumps(e, separators=(",", ":")) + "\n")
            n_tulis += 1
    print(f"ditulis {n_tulis} peristiwa", file=sys.stderr)


def uji():
    km = 1 / 111.32
    # (menit, lat, lon): A dan B 23 jam di titik sama -> satu; C 25 jam setelah B -> baru; D 800 m dari A -> terpisah
    t = [0, 23 * 60, 48 * 60, 48 * 60 + 10]
    la = [0.0, 0.0, 0.0, 0.0]
    lo = [110.0, 110.0, 110.0, 110.0 + 0.8 * km]
    a, _, jm = hubungkan(t, la, lo)
    assert a[0] == a[1] and a[2] != a[1] and a[3] != a[2], a
    assert jm <= JEDA
    # rantai: tiap langkah 500 m dan 12 jam -> satu peristiwa panjang, tak ada sambungan > 24 jam
    t = [i * 720 for i in range(10)]
    a, s, jm = hubungkan(t, [0.0] * 10, [110 + i * .5 * km for i in range(10)])
    assert len(set(a)) == 1 and jm <= JEDA and s >= 9
    # penggabungan: dua api terpisah 3 km lalu bertemu lewat deteksi di tengah
    t = [0, 0, 60, 60, 120]
    lo = [110.0, 110 + 1.4 * km, 110 + 0.7 * km, 110 + 0.7 * km, 110 + 0.7 * km]
    a, _, _ = hubungkan(t, [0.0] * 5, lo)
    assert len(set(a)) == 1
    # sel baru per hari dan arah ke timur
    k0, k1 = sel(110.0, 0.0), sel(110.0 + 1 * km, 0.0)
    h = harian([(0, k0, 1), (24 * 60, k1, 1), (24 * 60 + 5, k1, 1)], 110.0)
    assert len(h) == 2 and h[1][1] == [k1] and abs(h[1][2] - 90) <= 1 and 700 < h[1][3] < 1500, h  # sel 375 m: galat kuantisasi
    print("ok")


if __name__ == "__main__":
    uji() if sys.argv[1:] == ["uji"] else main()
