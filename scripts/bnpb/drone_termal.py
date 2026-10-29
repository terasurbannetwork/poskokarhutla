"""Foto termal drone (R-JPEG DJI) -> CSV titik bara siap unggah ke tab Drone di tugas (lat,lon,suhu_c,waktu). Pemilik 28 Okt 2026.

Panduan: docs/bnpb/PANDUAN-DRONE-GAMBUT.md bagian 5. Python 3 stdlib saja; suhu per piksel dibaca lewat DJI Thermal SDK (program `dji_irp`,
unduh gratis dari situs DJI, dukungan Mavic 3T, M30T, M3TD, M4T/M4TD; pasang lalu taruh di PATH atau beri --sdk).

Alur tiap foto:
  1. Metadata XMP DJI di dalam JPEG: GpsLatitude/GpsLongitude, RelativeAltitude, GimbalPitchDegree, GimbalYawDegree; waktu dari EXIF DateTimeOriginal.
  2. Suhu: `dji_irp -s foto.jpg -a measure -o foto.raw --measurefmt float32 --emissivity 0.95 --distance D --humidity H --reflection R`
     -> float32 per piksel (lebar x tinggi, bawaan 640 x 512). Distance dibatasi 1-25 m oleh SDK, jadi dipotong ke 25.
  3. Deteksi: piksel >= max(--min-suhu, median foto + --delta) = calon bara. Piksel bersebelahan (4 arah) digabung jadi satu titik;
     titik lebih kecil dari --min-piksel dibuang (derau). Suhu titik = maksimum, posisi = pusat bobot suhu.
  4. Koordinat: kamera dianggap tegak lurus (pitch -90 +- 15 derajat). Geser piksel dari tengah foto -> meter (tapak = 2 h tan(fov/2)),
     diputar menurut arah gimbal (yaw, searah jarum jam dari utara), ditambah ke posisi drone. Foto miring (> 15 derajat dari tegak) dilewati.
  5. Titik dari foto yang tumpang tindih digabung bila < --gabung-m meter (yang terpanas menang). Paling banyak 2.000 baris (batas server).

Pakai:
  python3 scripts/bnpb/drone_termal.py FOLDER_FOTO -o titik_bara.csv                     # semua *.jpg di folder (rekursif)
  python3 scripts/bnpb/drone_termal.py FOLDER_FOTO -o titik_bara.csv --delta 8 --min-suhu 40 --fov 49 --suhu-udara 32 --kelembapan 60
  python3 scripts/bnpb/drone_termal.py FOLDER_FOTO --raw                                  # pakai foto.raw yang sudah ada di sebelah foto (tanpa SDK)
  python3 scripts/bnpb/drone_termal.py --uji                                              # self-check tanpa SDK dan tanpa foto
Keluaran: CSV lat,lon,suhu_c,waktu + ringkasan pesan WhatsApp (format SOP lapangan) di layar.

ponytail: kamera dianggap tegak lurus dan tanah datar (gambut); di lereng atau foto miring, koordinat meleset. Ambang bawaan (median + 10 derajat C,
minimal 40 derajat C) belum divalidasi untuk gambut Indonesia: setel dari pengalaman regu. Format XMP/EXIF DJI dan opsi dji_irp perlu dicek
sekali dengan foto dan versi SDK sungguhan (lihat panduan, "Yang belum diuji").
"""
import argparse, array, datetime as dt, math, os, re, shutil, statistics, subprocess, sys, tempfile

BATAS_BARIS = 2000
XMP = {k: re.compile(rb'drone-dji:' + k.encode() + rb'="([^"]+)"') for k in
       ("GpsLatitude", "GpsLongitude", "RelativeAltitude", "GimbalPitchDegree", "GimbalYawDegree", "FlightYawDegree")}
WAKTU = re.compile(rb"(\d{4}):(\d\d):(\d\d) (\d\d):(\d\d):(\d\d)")


def baca_meta(b):
    """bytes JPEG -> {lat, lon, h, pitch, yaw, waktu (naif, jam lokal kamera)} atau None bila bukan foto DJI berposisi."""
    m = {}
    for k, re_ in XMP.items():
        x = re_.search(b)
        if x:
            m[k] = float(x.group(1).decode().replace("+", ""))
    if "GpsLatitude" not in m or "GpsLongitude" not in m or "RelativeAltitude" not in m:
        return None
    w = WAKTU.search(b[:200000])
    return {"lat": m["GpsLatitude"], "lon": m["GpsLongitude"], "h": m["RelativeAltitude"], "pitch": m.get("GimbalPitchDegree", -90.0),
            "yaw": m.get("GimbalYawDegree", m.get("FlightYawDegree", 0.0)), "waktu": dt.datetime(*map(int, w.groups())) if w else None}


def suhu_sdk(foto, sdk, lebar, tinggi, jarak, emis, rh, pantul):
    """dji_irp measure -> array float32 lebar x tinggi (baris dari atas). Galat SDK dilempar sebagai RuntimeError."""
    with tempfile.TemporaryDirectory() as d:
        keluar = os.path.join(d, "t.raw")
        cmd = [sdk, "-s", foto, "-a", "measure", "-o", keluar, "--measurefmt", "float32", "--emissivity", f"{emis:.2f}",
               "--distance", f"{min(max(jarak, 1.0), 25.0):.1f}", "--humidity", f"{min(max(rh, 20.0), 100.0):.0f}", "--reflection", f"{pantul:.1f}"]
        r = subprocess.run(cmd, capture_output=True, text=True)
        if r.returncode or not os.path.exists(keluar):
            raise RuntimeError(f"dji_irp gagal ({r.returncode}): {(r.stderr or r.stdout).strip()[:200]}")
        return baca_raw(keluar, lebar, tinggi)


def baca_raw(jalur, lebar, tinggi):
    a = array.array("f")
    with open(jalur, "rb") as f:
        a.frombytes(f.read())
    if len(a) != lebar * tinggi:
        raise ValueError(f"{jalur}: {len(a)} piksel, harusnya {lebar} x {tinggi}; cek --lebar/--tinggi (mode resolusi super = 1280 x 1024)")
    return a


def deteksi(t, lebar, tinggi, delta, min_suhu, min_px):
    """array suhu -> [(cx, cy, suhu_maks, n_piksel)] titik bara dalam koordinat piksel; ambang = max(min_suhu, median + delta)."""
    latar = statistics.median(t[::7]) if len(t) > 7 else statistics.median(t)
    ambang = max(min_suhu, latar + delta)
    panas = bytearray(1 if v >= ambang else 0 for v in t)
    out = []
    for awal in range(len(t)):
        if not panas[awal]:
            continue
        panas[awal], tumpuk, n, sx, sy, sw, mx = 0, [awal], 0, 0.0, 0.0, 0.0, -1e9
        while tumpuk:
            i = tumpuk.pop()
            x, y, v = i % lebar, i // lebar, t[i]
            w = v - latar
            n, sx, sy, sw, mx = n + 1, sx + x * w, sy + y * w, sw + w, max(mx, v)
            for j in ((i - 1) if x > 0 else -1, (i + 1) if x < lebar - 1 else -1, i - lebar, i + lebar):
                if 0 <= j < len(t) and panas[j]:
                    panas[j] = 0
                    tumpuk.append(j)
        if n >= min_px:
            out.append((sx / sw + .5, sy / sw + .5, mx, n))
    return out, latar, ambang


def ke_peta(meta, cx, cy, lebar, tinggi, fov):
    """piksel (cx, cy) -> (lat, lon). Tegak lurus: kanan foto = x, atas foto = arah yaw. Tapak lebar = 2 h tan(fov/2)."""
    gsd = 2 * meta["h"] * math.tan(math.radians(fov) / 2) / lebar
    x, y = (cx - lebar / 2) * gsd, (tinggi / 2 - cy) * gsd
    a = math.radians(meta["yaw"])
    timur, utara = x * math.cos(a) + y * math.sin(a), -x * math.sin(a) + y * math.cos(a)
    return meta["lat"] + utara / 110540, meta["lon"] + timur / (111320 * math.cos(math.radians(meta["lat"])))


def jarak_m(a, b):
    return math.hypot((a[0] - b[0]) * 110540, (a[1] - b[1]) * 111320 * math.cos(math.radians(a[0])))


def gabung(titik, m):
    """[(lat, lon, suhu, waktu, foto)] -> titik dari foto tumpang tindih yang < m meter digabung, yang terpanas menang."""
    out = []
    for p in sorted(titik, key=lambda p: -p[2]):
        if all(jarak_m(p, q) >= m for q in out):
            out.append(p)
    return out


def proses(foto, o, ambil_suhu):
    """satu foto -> ([titik], catatan atau None)"""
    with open(foto, "rb") as f:
        meta = baca_meta(f.read())
    if not meta:
        return [], "tanpa metadata posisi DJI (bukan R-JPEG drone?)"
    if abs(meta["pitch"] + 90) > 15:
        return [], f"kamera miring (pitch {meta['pitch']:.0f} derajat), dilewati"
    t = ambil_suhu(foto, meta)
    hasil, latar, ambang = deteksi(t, o.lebar, o.tinggi, o.delta, o.min_suhu, o.min_piksel)
    w = meta["waktu"].strftime("%Y-%m-%dT%H:%M:%S") + o.zona if meta["waktu"] else ""
    return [(*ke_peta(meta, cx, cy, o.lebar, o.tinggi, o.fov), round(mx, 1), w, os.path.basename(foto)) for cx, cy, mx, _ in hasil], None


def tulis_csv(titik, jalur):
    with open(jalur, "w") as f:
        f.write("lat,lon,suhu_c,waktu\n")
        for la, lo, s, w, _ in titik:
            f.write(f"{la:.6f},{lo:.6f},{s:.1f},{w}\n")


def ringkasan(titik, n_foto, n_lewat):
    if not titik:
        return f"Tidak ada titik bara di atas ambang dari {n_foto} foto ({n_lewat} dilewati)."
    p = titik[0]
    return "\n".join([
        "LAPOR DRONE GAMBUT",
        "Cluster: (isi id cluster, kabupaten)",
        f"Foto termal: {n_foto} foto, {n_lewat} dilewati",
        f"Bara ditemukan: {len(titik)} titik, suhu maks {p[2]:.0f} °C".replace(".", ","),
        f"Titik terpanas: {p[0]:.5f}, {p[1]:.5f} (foto {p[4]})",
        "Saran: (isi tindakan)",
        "Pilot: (nama, instansi, nomor HP)"])


def main(argv=None):
    a = argparse.ArgumentParser(description="Foto termal drone (R-JPEG DJI) -> CSV titik bara (lat,lon,suhu_c,waktu)")
    a.add_argument("folder", nargs="?"); a.add_argument("-o", "--keluar", default="titik_bara.csv")
    a.add_argument("--sdk", default=shutil.which("dji_irp") or "dji_irp", help="jalur program dji_irp dari DJI Thermal SDK")
    a.add_argument("--raw", action="store_true", help="pakai <foto>.raw float32 yang sudah ada (hasil dji_irp sebelumnya), tanpa memanggil SDK")
    a.add_argument("--lebar", type=int, default=640); a.add_argument("--tinggi", type=int, default=512)
    a.add_argument("--fov", type=float, default=49.0, help="sudut pandang horizontal kamera termal, derajat (sama dengan halaman drone)")
    a.add_argument("--delta", type=float, default=10.0, help="calon bara = median foto + delta derajat C")
    a.add_argument("--min-suhu", type=float, default=40.0, help="ambang suhu mutlak minimum, derajat C")
    a.add_argument("--min-piksel", type=int, default=3, help="titik lebih kecil dari ini dianggap derau")
    a.add_argument("--gabung-m", type=float, default=10.0, help="titik dari foto tumpang tindih yang lebih dekat dari ini digabung")
    a.add_argument("--emisivitas", type=float, default=0.95); a.add_argument("--kelembapan", type=float, default=70.0)
    a.add_argument("--suhu-udara", type=float, default=30.0, help="dipakai sebagai suhu pantul (reflection) di SDK")
    a.add_argument("--zona", default="+07:00", help="zona waktu jam kamera (WIB +07:00, WITA +08:00, WIT +09:00)")
    a.add_argument("--uji", action="store_true")
    o = a.parse_args(argv)
    if o.uji:
        return uji()
    if not o.folder or not os.path.isdir(o.folder):
        a.error("beri folder foto")
    if not o.raw and not shutil.which(o.sdk) and not os.path.exists(o.sdk):
        sys.exit("dji_irp tidak ditemukan. Pasang DJI Thermal SDK lalu beri --sdk /jalur/ke/dji_irp, atau pakai --raw.")
    foto = sorted(os.path.join(d, f) for d, _, fs in os.walk(o.folder) for f in fs if f.lower().endswith((".jpg", ".jpeg")))
    ambil = (lambda f, m: baca_raw(os.path.splitext(f)[0] + ".raw", o.lebar, o.tinggi)) if o.raw else \
        (lambda f, m: suhu_sdk(f, o.sdk, o.lebar, o.tinggi, m["h"], o.emisivitas, o.kelembapan, o.suhu_udara))
    semua, lewat = [], 0
    for i, f in enumerate(foto, 1):
        try:
            t, cat = proses(f, o, ambil)
        except (RuntimeError, ValueError, OSError) as e:
            t, cat = [], str(e)
        if cat:
            lewat += 1
            print(f"  lewati {os.path.basename(f)}: {cat}", file=sys.stderr)
        semua += t
        if i % 50 == 0:
            print(f"  {i}/{len(foto)} foto, {len(semua)} calon titik", file=sys.stderr)
    titik = gabung(semua, o.gabung_m)
    if len(titik) > BATAS_BARIS:
        print(f"  {len(titik)} titik, dipotong ke {BATAS_BARIS} terpanas (batas server per tugas)", file=sys.stderr)
        titik = titik[:BATAS_BARIS]
    tulis_csv(titik, o.keluar)
    print(f"{o.keluar}: {len(titik)} titik bara dari {len(foto)} foto\n")
    print(ringkasan(titik, len(foto), lewat))


def uji():
    L, T = 64, 48
    # (1) deteksi: latar 30 derajat, satu bercak 3x3 bersuhu 60 di (20, 10), satu piksel tunggal 55 (derau), satu bercak 2x2 di 38 (di bawah 40)
    t = array.array("f", [30.0] * (L * T))
    for y in range(9, 12):
        for x in range(19, 22):
            t[y * L + x] = 60.0
    t[40 * L + 50] = 55.0
    for y in (30, 31):
        for x in (5, 6):
            t[y * L + x] = 38.0
    h, latar, ambang = deteksi(t, L, T, 10, 40, 3)
    assert latar == 30 and ambang == 40, (latar, ambang)
    assert len(h) == 1 and abs(h[0][0] - 20.5) < 1e-9 and abs(h[0][1] - 10.5) < 1e-9 and h[0][2] == 60 and h[0][3] == 9, h
    # (2) koordinat: drone di (-2.7, 114.2), 100 m, yaw 0. Pusat foto = posisi drone; piksel paling kanan = timur sejauh setengah tapak
    m = {"lat": -2.7, "lon": 114.2, "h": 100.0, "yaw": 0.0}
    la, lo = ke_peta(m, L / 2, T / 2, L, T, 49)
    assert abs(la + 2.7) < 1e-12 and abs(lo - 114.2) < 1e-12
    setengah = 100 * math.tan(math.radians(24.5))
    la, lo = ke_peta(m, L, T / 2, L, T, 49)
    assert abs(jarak_m((la, lo), (-2.7, 114.2)) - setengah) < 0.05 and lo > 114.2
    # yaw 90 (drone menghadap timur): atas foto = timur
    la, lo = ke_peta({**m, "yaw": 90.0}, L / 2, 0, L, T, 49)
    assert lo > 114.2 and abs(la + 2.7) < 1e-9
    # (3) metadata DJI dari bytes rekaan (XMP + EXIF ASCII)
    b = (b"\xff\xd8 ... 2026:10:29 07:12:05 ... <x:xmpmeta drone-dji:GpsLatitude=\"-2.73512\" drone-dji:GpsLongitude=\"+114.20177\" "
         b"drone-dji:RelativeAltitude=\"+100.20\" drone-dji:GimbalPitchDegree=\"-89.90\" drone-dji:GimbalYawDegree=\"+12.30\"/>")
    md = baca_meta(b)
    assert md == {"lat": -2.73512, "lon": 114.20177, "h": 100.2, "pitch": -89.9, "yaw": 12.3, "waktu": dt.datetime(2026, 10, 29, 7, 12, 5)}, md
    assert baca_meta(b"\xff\xd8 tanpa xmp") is None
    # (4) gabung: dua titik 5 m berjauhan dari foto tumpang tindih -> satu (yang terpanas), titik 50 m tetap
    d5 = 5 / 110540
    g = gabung([(-2.7, 114.2, 50.0, "", "a"), (-2.7 + d5, 114.2, 62.0, "", "b"), (-2.7 + 10 * d5, 114.2, 45.0, "", "c")], 10)
    assert [p[4] for p in g] == ["b", "c"], g
    # (5) ujung ke ujung tanpa SDK: foto rekaan + .raw di folder sementara -> CSV dengan header server
    with tempfile.TemporaryDirectory() as d:
        open(os.path.join(d, "DJI_0001_T.JPG"), "wb").write(b)
        raw = array.array("f", [30.0] * (640 * 512))
        for y in range(250, 256):
            for x in range(400, 406):
                raw[y * 640 + x] = 71.5
        with open(os.path.join(d, "DJI_0001_T.raw"), "wb") as f:
            raw.tofile(f)
        open(os.path.join(d, "miring.jpg"), "wb").write(b.replace(b'-89.90', b'-45.00'))
        csv_ = os.path.join(d, "o.csv")
        main([d, "--raw", "-o", csv_])
        baris = open(csv_).read().splitlines()
        assert baris[0] == "lat,lon,suhu_c,waktu" and len(baris) == 2, baris
        la, lo, s, w = baris[1].split(",")
        assert float(s) == 71.5 and w == "2026-10-29T07:12:05+07:00" and abs(float(la) + 2.735) < 0.001 and abs(float(lo) - 114.202) < 0.001, baris[1]
    print("drone_termal: uji lolos")


if __name__ == "__main__":
    main()
