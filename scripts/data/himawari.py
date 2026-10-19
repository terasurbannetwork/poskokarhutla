"""Titik panas Himawari-9 (JAXA P-Tree L2 WLF v010, per 10 menit, latensi ~1 jam) -> public/data/himawari.json

Pakai:  python3 scripts/data/himawari.py          # butuh env PTREE_USER, PTREE_PASS
        python3 scripts/data/himawari.py --uji    # self-check parser
Env: HIMAWARI_JAM (jendela jam terhadap pindaian terbaru, bawaan 3).
Level 1 dingin/2 membara/3 menyala; Reliability 1 rendah (sering = industri, dibuang) 3 normal 5 tinggi;
QF 0 normal/1 jenuh/2 FRP kurang yakin. FRP MW = FRP(W/m2) x Area(km2). Grid 0.02 derajat.
"""
import datetime as dt, ftplib, io, json, os, re, sys

HOST = "ftp.ptree.jaxa.jp"
KELUAR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "../../public/data/himawari.json")
SUMBER = "Himawari-9 L2 WLF v010 · P-Tree System, JAXA"
NAMA = re.compile(r"H09_(\d{8})_(\d{4})_L2WLF010_FLDK")


def parse(teks):
    """-> {(lat,lon): (waktu, frp_mw, level, rel, qf)} grid dalam bbox Indonesia, terbaru per grid."""
    out = {}
    for b in teks.splitlines():
        if not b.strip() or b.startswith("#"):
            continue
        k = b.split(",")
        try:
            th, bl, tg, hm = int(k[1]), int(k[2]), int(k[3]), int(k[4])
            lat, lon, luas, gunung = float(k[5]), float(k[6]), float(k[7]), int(float(k[8]))
            lv, rel, frp, qf = int(k[9]), int(k[10]), float(k[11]), int(k[12])
        except (ValueError, IndexError):
            continue
        if not (-11.5 <= lat <= 6.5 and 94.5 <= lon <= 141.5) or rel == 1 or gunung > 0:
            continue
        w = dt.datetime(th, bl, tg, hm // 100, hm % 100)
        if (lat, lon) not in out or w > out[(lat, lon)][0]:
            out[(lat, lon)] = (w, round(frp * luas, 1), lv, rel, qf)
    return out


def gabung(per_berkas):
    """per_berkas: daftar hasil parse(); -> (acuan, baris) dengan dedupe terbaru per grid."""
    semua = {}
    for d in per_berkas:
        for g, v in d.items():
            if g not in semua or v[0] > semua[g][0]:
                semua[g] = v
    return semua


def uji():
    s = ("# a\n# b\n"
         "1,2026,10,19,600,-2.0,110.0,4.0,0,3,3,10.0,0\n"      # frp 40.0
         "2,2026,10,19,610,-2.0,110.0,4.0,0,2,5,12.5,1\n"      # grid sama, lebih baru -> menang, 50.0
         "3,2026,10,19,610,-2.02,110.0,4.0,0,3,1,10.0,0\n"     # rel 1 -> buang
         "4,2026,10,19,610,20.0,110.0,4.0,0,3,3,10.0,0\n"      # luar bbox
         "5,2026,10,19,610,-3.0,110.0,4.0,1,3,3,10.0,0\n")     # gunung api
    d = parse(s)
    assert list(d) == [(-2.0, 110.0)], d
    w, frp, lv, rel, qf = d[(-2.0, 110.0)]
    assert (w.minute, frp, lv, rel, qf) == (10, 50.0, 2, 5, 1), d
    print("uji OK")


def main():
    jam = int(os.environ.get("HIMAWARI_JAM", "3"))
    f = ftplib.FTP(HOST, timeout=60)
    f.login(os.environ["PTREE_USER"], os.environ["PTREE_PASS"])  # gagal -> exception -> exit != 0
    f.set_pasv(True)
    now = dt.datetime.now(dt.timezone.utc).replace(tzinfo=None, minute=0, second=0, microsecond=0)
    berkas = []  # (waktu_pindai, path)
    for i in range(jam + 4):  # mundur dari sekarang; latensi ~1 jam jadi beri kelonggaran
        h = now - dt.timedelta(hours=i)
        d = f"/pub/himawari/L2/WLF/010/{h:%Y%m}/{h:%d}/{h:%H}"
        try:
            for n in f.nlst(d):
                m = NAMA.search(n)
                if m and n.endswith(".csv"):
                    berkas.append((dt.datetime.strptime(m[1] + m[2], "%Y%m%d%H%M"), n if n.startswith("/") else d + "/" + n))
        except (ftplib.error_perm, ftplib.error_temp):
            pass  # folder belum ada
    if not berkas:
        sys.exit("tidak ada CSV Himawari ditemukan")
    acuan = max(w for w, _ in berkas)
    pilih = sorted(b for b in berkas if b[0] > acuan - dt.timedelta(hours=jam))
    hasil = []
    for _, p in pilih:
        buf = io.BytesIO()
        f.retrbinary("RETR " + p, buf.write)
        hasil.append(parse(buf.getvalue().decode("utf-8", "replace")))
    f.quit()
    baris = [[lat, lon, max(0, int((acuan - w).total_seconds() // 60)), frp, lv, rel, qf]
             for (lat, lon), (w, frp, lv, rel, qf) in sorted(gabung(hasil).items())]
    out = {"acuan": acuan.strftime("%Y-%m-%dT%H:%M:00Z"), "jam": jam, "sumber": SUMBER, "baris": baris}
    with open(KELUAR, "w") as fh:
        json.dump(out, fh, separators=(",", ":"), ensure_ascii=False)
    print(f"himawari: {len(pilih)} CSV, {len(baris)} baris, acuan {out['acuan']}")


if __name__ == "__main__":
    uji() if "--uji" in sys.argv else main()
