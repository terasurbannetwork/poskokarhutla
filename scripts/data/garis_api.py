"""Garis luar kompleks api yang mengikuti deteksi, bukan lambung cembung.

Lambung cembung sebuah garis api 8 km memuat lahan yang tidak terbakar di kedua sisinya dan menggambar
satu bidang lurus panjang. Di sini tiap deteksi VIIRS dirasterkan ke kisi 375 m sesuai jejak pikselnya
(scan x track FIRMS, melebar ke tepi sapuan), celah satu sel ditutup (dilatasi lalu erosi satu sel =
closing morfologi: deteksi yang bertetangga menyatu tanpa menggembungkan tepinya), lalu tiap komponen
terhubung ditelusuri dengan marching squares (simpul di titik tengah sisi sel isi/kosong), dihaluskan
Chaikin 2 kali dan disederhanakan ringan. Hasilnya Polygon atau MultiPolygon (komponen terpisah) dengan
lubang bila ada lahan tak terbakar yang dikelilingi api.

Kenapa closing, bukan dilatasi saja: dilatasi satu sel menebalkan setiap tepi 375 m, jadi kompleks satu
piksel tergambar 9 sel (127 ha) dan luasnya ikut melonjak. Closing menyambung celah satu sel yang sama
tetapi tepi luarnya tetap tepi piksel.

Pakai: python3 scripts/data/garis_api.py uji
"""
import math, random, sys, time

SEL_KM = 0.375
PIKSEL_HA = SEL_KM * SEL_KM * 100  # 14,0625 ha
KY = 110.57
TOL_SEL = .15  # penyederhanaan sesudah Chaikin: 0,15 sel = 56 m, < 1,5 piksel layar sampai zoom 12


def _sel(pts, lat0):
    """Titik -> himpunan sel (i, j) pada kisi lokal 375 m; jejak piksel = scan x track km (bawaan 0,375)."""
    kx = 111.32 * math.cos(math.radians(lat0))
    isi = set()
    for p in pts:
        x, y = p["lon"] * kx / SEL_KM, p["lat"] * KY / SEL_KM
        hx = max(SEL_KM, p.get("scan") or SEL_KM) / SEL_KM / 2  # setengah lebar jejak, satuan sel
        hy = max(SEL_KM, p.get("track") or SEL_KM) / SEL_KM / 2
        i0, j0 = math.floor(x + .5), math.floor(y + .5)  # sel tempat titik jatuh selalu ikut
        isi.add((i0, j0))
        for i in range(math.floor(x - hx + .5), math.floor(x + hx + .5) + 1):
            for j in range(math.floor(y - hy + .5), math.floor(y + hy + .5) + 1):
                if abs(i - x) <= hx and abs(j - y) <= hy:  # pusat sel di dalam jejak
                    isi.add((i, j))
    return isi, kx


def _tutup(isi):
    """Closing 3x3: dilatasi lalu erosi. Tidak pernah membuang sel asli."""
    D = {(i + a, j + b) for i, j in isi for a in (-1, 0, 1) for b in (-1, 0, 1)}
    return {c for c in D if all((c[0] + a, c[1] + b) in D for a in (-1, 0, 1) for b in (-1, 0, 1))}


def _cincin(isi):
    """Kontur sel isi lewat sisi batas berarah (isi di kiri), simpul hanya di sudut yang berbelok. Satu putaran Chaikin
    (potong 1/4) atas kontur ini sama persis dengan marching squares pada kisi 2 x 2 per sel (simpul di tengah sisi
    sub-sel isi/kosong), tanpa membayar empat kali sel. Di sudut pelana dipilih belok kanan, jadi sel yang hanya
    bersentuhan diagonal tetap satu cincin (8-tetangga). Cincin luar berlawanan jarum jam, lubang searah jarum jam.
    Koordinat sudut sel (i, j) = (i - .5, j - .5) dalam satuan sel."""
    keluar = {}
    for i, j in isi:
        if (i, j - 1) not in isi:
            keluar.setdefault((i, j), []).append((i + 1, j))
        if (i + 1, j) not in isi:
            keluar.setdefault((i + 1, j), []).append((i + 1, j + 1))
        if (i, j + 1) not in isi:
            keluar.setdefault((i + 1, j + 1), []).append((i, j + 1))
        if (i - 1, j) not in isi:
            keluar.setdefault((i, j + 1), []).append((i, j))
    hasil = []
    awal = [v for v, q in keluar.items() if len(q) == 1]  # mulai dari sudut biasa, jangan dari pelana
    while keluar:
        while awal and awal[-1] not in keluar:
            awal.pop()
        a = awal.pop() if awal else next(iter(keluar))
        b = keluar[a].pop()
        if not keluar[a]:
            del keluar[a]
        mulai, ring = (a, b), []
        while True:
            pil = keluar.get(b)
            dx, dy = b[0] - a[0], b[1] - a[1]
            if not pil:  # kembali ke awal: sisi pertama sudah diambil
                if b == mulai[0] and (mulai[1][0] - b[0], mulai[1][1] - b[1]) != (dx, dy):
                    ring.append((b[0] - .5, b[1] - .5))
                break
            if len(pil) > 1:  # pelana: belok kanan = arah (dy, -dx)
                c = next((q for q in pil if (q[0] - b[0], q[1] - b[1]) == (dy, -dx)), pil[0])
            else:
                c = pil[0]
            pil.remove(c)
            if not pil:
                del keluar[b]
            if (c[0] - b[0], c[1] - b[1]) != (dx, dy):
                ring.append((b[0] - .5, b[1] - .5))  # sudut berbelok
            a, b = b, c
            if (a, b) == mulai:
                break
        if len(ring) >= 4:
            hasil.append(ring)
    return hasil


def _chaikin(r, n=2):
    for _ in range(n):
        q = []
        for k in range(len(r)):
            (x1, y1), (x2, y2) = r[k], r[(k + 1) % len(r)]
            q += [(.75 * x1 + .25 * x2, .75 * y1 + .25 * y2), (.25 * x1 + .75 * x2, .25 * y1 + .75 * y2)]
        r = q
    return r


def _ringan(r, tol=TOL_SEL):
    """Douglas-Peucker cincin tertutup (dipotong di simpul 0 dan simpul terjauh darinya), toleransi dalam satuan sel."""
    n = len(r)
    if n <= 8:
        return r
    jauh = max(range(n), key=lambda k: (r[k][0] - r[0][0]) ** 2 + (r[k][1] - r[0][1]) ** 2)
    simpan = [False] * n
    simpan[0] = simpan[jauh] = True
    t2 = tol * tol
    tumpuk = [(0, jauh), (jauh, n)]
    while tumpuk:
        a, b = tumpuk.pop()
        (ax, ay), (bx, by) = r[a], r[b % n]
        dx, dy = bx - ax, by - ay
        L = dx * dx + dy * dy or 1e-12
        dmaks, kmaks = t2, -1
        for k in range(a + 1, b):
            px, py = r[k][0] - ax, r[k][1] - ay
            d = (px * dy - py * dx) ** 2 / L
            if d > dmaks:
                dmaks, kmaks = d, k
        if kmaks > 0:
            simpan[kmaks] = True
            tumpuk += [(a, kmaks), (kmaks, b)]
    q = [r[k] for k in range(n) if simpan[k]]
    return q if len(q) >= 4 else r


def _luas(r):
    return sum(r[k - 1][0] * r[k][1] - r[k][0] * r[k - 1][1] for k in range(len(r))) / 2


def _di_dalam(x, y, r):
    c, j = False, len(r) - 1
    for i in range(len(r)):
        if (r[i][1] > y) != (r[j][1] > y) and x < (r[j][0] - r[i][0]) * (y - r[i][1]) / (r[j][1] - r[i][1]) + r[i][0]:
            c = not c
        j = i
    return c


def garis(pts, desimal=4):
    """Titik deteksi (dict lat, lon, opsional scan/track km) -> (geometri GeoJSON atau None, luas_ha).
    luas_ha = luas garis luar (lubang dikurangi), bukan jumlah sel."""
    if not pts:
        return None, 0.0
    lat0 = sum(p["lat"] for p in pts) / len(pts)
    isi, kx = _sel(pts, lat0)
    luar, lubang = [], []
    # marching squares kisi 2x (= Chaikin pertama) lalu Chaikin 2 kali; sel tunggal jadi bulatan +- 0,84 sel
    for r in _cincin(_tutup(isi)):
        r = _ringan(_chaikin(r, 3))
        (luar if _luas(r) > 0 else lubang).append(r)
    poli = [[r] for r in luar]
    for h in lubang:
        for p in poli:
            if _di_dalam(h[0][0], h[0][1], p[0]):
                p.append(h)
                break
    luas_sel = sum(_luas(r) for p in poli for r in p)
    ke = lambda r: _tutup_cincin([[round(x * SEL_KM / kx, desimal), round(y * SEL_KM / KY, desimal)] for x, y in r])
    poli = [[c for c in (ke(r) for r in p) if c] for p in poli]
    poli = [p for p in poli if p]
    if not poli:
        return None, 0.0
    g = {"type": "Polygon", "coordinates": poli[0]} if len(poli) == 1 else {"type": "MultiPolygon", "coordinates": poli}
    return g, round(luas_sel * PIKSEL_HA, 1)


def _tutup_cincin(r):
    q = [c for k, c in enumerate(r) if k == 0 or c != r[k - 1]]
    if len(q) > 1 and q[-1] == q[0]:
        q.pop()
    return q + q[:1] if len(q) >= 3 else None


# ---------------------------------------------------------------- invarian
def _potong(a, b, c, d):
    s = lambda o, p, q: (p[0] - o[0]) * (q[1] - o[1]) - (p[1] - o[1]) * (q[0] - o[0])
    return s(a, b, c) * s(a, b, d) < 0 and s(c, d, a) * s(c, d, b) < 0


def periksa(g, pts, luas_ha):
    """Daftar pelanggaran (kosong = lolos): cincin sah, tak berpotongan diri/antar-cincin, tiap deteksi di dalam atau
    <= 1 sel dari garis, luas >= 0,4 x sel deteksi berbeda x 14,06 ha."""
    salah = []
    P = [g["coordinates"]] if g["type"] == "Polygon" else g["coordinates"]
    seg = []
    for p in P:
        for r in p:
            if len(r) < 4 or r[0] != r[-1]:
                salah.append(f"cincin tidak tertutup / < 4 simpul ({len(r)})")
            seg += [(r[k], r[k + 1]) for k in range(len(r) - 1)]
    urut = sorted(seg, key=lambda e: min(e[0][0], e[1][0]))  # sapuan x: hanya segmen yang rentang x-nya bertumpuk
    for a in range(len(urut)):
        xa = max(urut[a][0][0], urut[a][1][0])
        for b in range(a + 1, len(urut)):
            if min(urut[b][0][0], urut[b][1][0]) > xa:
                break
            if _potong(*urut[a], *urut[b]):
                salah.append(f"segmen {urut[a]} dan {urut[b]} berpotongan")
    lat0 = sum(p["lat"] for p in pts) / len(pts)
    kx = 111.32 * math.cos(math.radians(lat0))
    for p in pts:
        x, y = p["lon"], p["lat"]
        dalam = any(_di_dalam(x, y, q[0]) and not any(_di_dalam(x, y, h) for h in q[1:]) for q in P)
        if not dalam:
            dmin = min(_jarak_km(x, y, s0, s1, kx) for s0, s1 in seg)
            if dmin > SEL_KM:
                salah.append(f"deteksi {x},{y} {dmin:.2f} km di luar garis (> 1 sel)")
    sel = {(round(p["lon"] * kx / SEL_KM), round(p["lat"] * KY / SEL_KM)) for p in pts}
    if luas_ha < .4 * len(sel) * PIKSEL_HA:
        salah.append(f"luas {luas_ha} ha < 0,4 x {len(sel)} sel x {PIKSEL_HA} ha")
    return salah


def _jarak_km(x, y, a, b, kx):
    ax, ay, bx, by, px, py = a[0] * kx, a[1] * KY, b[0] * kx, b[1] * KY, x * kx, y * KY
    dx, dy = bx - ax, by - ay
    t = 0 if not (dx or dy) else max(0, min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)))
    return math.hypot(px - ax - t * dx, py - ay - t * dy)


def uji():
    acak = random.Random(7)
    # 1. garis api 8 km miring: lambung cembungnya bidang lurus panjang; garisnya harus tipis (luas << persegi panjang pembungkus)
    garis_lurus = [{"lat": -2.0 + k * .0025, "lon": 113.5 + k * .003, "scan": .39, "track": .36} for k in range(25)]
    g, L = garis(garis_lurus)
    assert g["type"] == "Polygon" and not periksa(g, garis_lurus, L), periksa(g, garis_lurus, L)
    assert L < 25 * 3 * PIKSEL_HA, f"garis api 25 deteksi tidak boleh menggembung: {L} ha"
    # 2. dua kelompok terpisah 3 km -> MultiPolygon
    dua = [{"lat": -2.0 + acak.uniform(0, .006), "lon": 113.5 + acak.uniform(0, .006)} for _ in range(15)] + \
          [{"lat": -2.0 + acak.uniform(0, .006), "lon": 113.53 + acak.uniform(0, .006)} for _ in range(15)]
    g, L = garis(dua)
    assert g["type"] == "MultiPolygon" and len(g["coordinates"]) == 2, g["type"]
    assert not periksa(g, dua, L), periksa(g, dua, L)
    # 3. cincin api mengelilingi lahan tak terbakar 2 km -> ada lubang
    cin = [{"lat": -2 + .012 * math.sin(a / 40 * 2 * math.pi), "lon": 113.5 + .012 * math.cos(a / 40 * 2 * math.pi)} for a in range(40)]
    g, L = garis(cin)
    assert g["type"] == "Polygon" and len(g["coordinates"]) == 2, "lahan di tengah cincin api harus jadi lubang"
    assert not periksa(g, cin, L), periksa(g, cin, L)
    # 4. satu deteksi di tepi sapuan (0,75 x 0,7 km) lebih luas dari satu di nadir
    _, L1 = garis([{"lat": -2, "lon": 113.5}])
    _, L2 = garis([{"lat": -2, "lon": 113.5, "scan": .75, "track": .7}])
    assert 0 < L1 < L2, (L1, L2)
    # 5. acak: 1000 kompleks bentuk bebas lolos invarian, dan cepat
    kompleks = []
    for _ in range(1000):
        n = acak.choice([1, 2, 3, 5, 8, 15, 40, 120])
        la, lo = acak.uniform(-8, 4), acak.uniform(96, 140)
        arah = acak.uniform(0, math.pi)
        kompleks.append([{"lat": la + acak.gauss(0, .004) + k * .002 * math.sin(arah) * (n > 20),
                          "lon": lo + acak.gauss(0, .004) + k * .002 * math.cos(arah) * (n > 20),
                          "scan": acak.uniform(.37, .8), "track": acak.uniform(.36, .75)} for k in range(n)])
    t = time.process_time()  # waktu CPU: mesin CI/lokal yang sibuk tidak membuat uji ini merah palsu
    hasil = [garis(k) for k in kompleks]
    dt = time.process_time() - t
    for k, (g, L) in zip(kompleks, hasil):
        s = periksa(g, k, L)
        assert not s, s
    assert dt < 5, f"1000 kompleks {dt:.1f} dtk CPU (batas 5)"
    print(f"garis_api uji: 5 kasus OK, 1000 kompleks acak {dt:.2f} dtk CPU, "
          f"{sum(g['type'] == 'MultiPolygon' for g, _ in hasil)} MultiPolygon")


if __name__ == "__main__":
    if sys.argv[1:] == ["uji"]:
        uji()
