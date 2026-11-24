"""A7 (tiket H23): faktor "banjir belum surut" per kab per hari D, bersih bocoran. stdlib. PRAREG: scripts/banjir/PRAREG-SURUT.md.

Sumber: laporan harian Koordalops (data/laporan-bnpb/harian/<bulan>/<tgl>/wa-koordalops.txt, terlacak git). Berkas bertanggal H DITERIMA pada H
(jam 07 WIB), jadi "waktu catat" laporan = H. Untuk hari target D hanya berkas H <= D-1 (tercatat sebelum 00:00 WIB D) yang dibaca.
Keadaan yang dilaporkan berumur H-1; dipakai terhadap D tetap sah (lebih tua dari waktu catat).

Faktor per (D, kab) bila kab punya laporan banjir dalam CAP hari sebelum D:
  aktif_3h    1 bila ada laporan banjir yang dicatat pada D-3..D-1
  hari_sejak  D - tanggal catat laporan terakhir (>= 1), dipotong CAP; None bila tak ada laporan DAN liputan arsip < CAP hari (bukan "tak banjir")
  belum_surut True bila laporan terakhir menyatakan belum surut (teks kondisi, ada di sumber), False bila "sudah surut", None bila teks tak menyatakan;
              juga None bila laporan terakhir > AMBANG_BELUM hari (aturan terdampak.py: lewat dua pekan tak lagi bisa diklaim)
Kolom surut HANYA ada di sumber ini (26 hari, 27 Okt 2026 dst) dan logbook dalops/banjir.json; logbook_kejadian.csv, DIBI, label v2 TIDAK punya.
Arsip append-only (JSONL): satu baris per (D, kab), tidak pernah ditimpa; `hitung` = waktu komputasi WIB; `tepat_waktu` = hitung < 00:00 WIB D.
Hanya baris tepat_waktu yang boleh dipakai sebagai bukti prospektif; --hari mundur menulis tepat_waktu=false.

Pakai:  python3 scripts/banjir/faktor_surut.py [--hari D] [--wa DIR] [--arsip BERKAS]   (default D = besok WIB)   |   ... uji
"""
import argparse, datetime as dt, glob, importlib.util, json, os, re, sys

AKAR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
WIB = dt.timezone(dt.timedelta(hours=7))
ARSIP = os.path.join(AKAR, "public/banjir/data/faktor_surut_arsip.jsonl")
CAP, AMBANG_BELUM, JENDELA = 30, 14, 3
FIX = os.path.join(AKAR, "scripts/banjir/fixture/surut")


def _muat(nama, rel):
    s = importlib.util.spec_from_file_location(nama, os.path.join(AKAR, rel))
    m = importlib.util.module_from_spec(s)
    s.loader.exec_module(m)
    return m


def keadaan(teks, DB):
    """'sudah' | 'belum' | None dari teks kondisi. Pembaca surut milik dalops_banjir (satu aturan baca untuk seluruh sistem)."""
    t = (teks or "").lower()
    if DB.surut(t):
        return "sudah"
    return "belum" if DB.BELUM.search(t) or "surut" in t else None   # "mulai/berangsur surut" = belum (aturan dalops_banjir)


def baca_laporan(akar_wa, WH, DB, TD, kamus):
    """([(H, kode kab, keadaan)], liputan_awal, [berkas gagal]). H = tanggal berkas = waktu catat."""
    out, awal, gagal = [], None, []
    for f in sorted(glob.glob(os.path.join(akar_wa, "**", "wa-koordalops.txt"), recursive=True)):
        H = os.path.basename(os.path.dirname(f))
        try:
            kej = WH.koordalops(open(f, encoding="utf-8").read())["kejadian"]
        except ValueError as e:
            gagal.append((H, str(e)))
            continue
        awal = awal or H
        for k in kej:
            if k.get("jenis") != "banjir" or not k.get("lokasi") or not k.get("prov"):
                continue
            nama = kamus.get((k["prov"], TD.nama_kab(k["lokasi"]).lower()))
            if nama:
                out.append((H, f"{k['prov']}|{nama}", keadaan((k.get("teks") or {}).get("kondisi"), DB)))
    return out, awal, gagal


def faktor(laporan, awal, D):
    """{kab: {...}} untuk hari D, hanya dari laporan dengan H < D. Murni (diuji)."""
    d = dt.date.fromisoformat(D)
    pakai = {}
    for H, kode, kead in sorted(laporan):
        if H < D:                                   # tercatat sebelum 00:00 WIB D; H == D atau sesudahnya TIDAK dibaca
            pakai.setdefault(kode, []).append((H, kead))
    liputan = (d - dt.date.fromisoformat(awal)).days if awal else 0
    out = {}
    for kode, L in pakai.items():
        akhir, kead = L[-1]
        sejak = (d - dt.date.fromisoformat(akhir)).days
        if sejak > CAP and liputan >= CAP:
            continue
        aktif = int(any(1 <= (d - dt.date.fromisoformat(H)).days <= JENDELA for H, _ in L))
        belum = None if (kead is None or sejak > AMBANG_BELUM) else kead == "belum"
        out[kode] = {"aktif_3h": aktif, "hari_sejak": min(sejak, CAP), "belum_surut": belum, "laporan_terakhir": akhir}
    return out


def tulis_arsip(berkas, D, fak, sekarang):
    """Append-only: (D, kab) yang sudah ada TIDAK ditimpa. Kembali jumlah baris baru."""
    ada = set()
    if os.path.exists(berkas):
        for b in open(berkas, encoding="utf-8"):
            r = json.loads(b)
            ada.add((r["D"], r["kode"]))
    tepat = sekarang < dt.datetime.combine(dt.date.fromisoformat(D), dt.time(), tzinfo=WIB)
    baru = [{"hitung": sekarang.isoformat(timespec="seconds"), "D": D, "kode": k, "tepat_waktu": tepat, **v} for k, v in sorted(fak.items()) if (D, k) not in ada]
    os.makedirs(os.path.dirname(berkas), exist_ok=True)
    with open(berkas, "a", encoding="utf-8") as f:
        for r in baru:
            f.write(json.dumps(r, ensure_ascii=False) + "\n")
    return len(baru)


def muat_semua(akar_wa):
    WH = _muat("wa_harian", "data/laporan-bnpb/generator/wa_harian.py")
    DB = _muat("dalops_banjir", "scripts/data/dalops_banjir.py")
    TD = _muat("terdampak", "scripts/banjir/terdampak.py")
    return baca_laporan(akar_wa, WH, DB, TD, TD.kamus_kab()), DB


def uji():
    import tempfile
    (lap, awal, gagal), DB = muat_semua(FIX)
    assert not gagal, gagal
    assert awal == "2026-11-17" and lap, "fixture nyata terbaca"
    assert {k for _, _, k in lap} & {"sudah", "belum"} == {"sudah", "belum"}, "teks kondisi nyata memuat keduanya"
    # pembaca keadaan pada kalimat nyata laporan 23 Nov
    assert keadaan("banjir berangsur surut", DB) == "belum" and keadaan("banjir sudah surut", DB) == "sudah" and keadaan("dalam pendataan", DB) is None
    # kebocoran: laporan bertanggal D (atau sesudahnya) tidak boleh mengubah faktor D
    kab = lap[-1][1]
    sebelum = faktor(lap, awal, "2026-11-23")
    tambah = lap + [("2026-11-23", "99|Fiktif", "belum"), ("2026-11-24", kab, "sudah")]
    assert faktor(tambah, awal, "2026-11-23") == sebelum, "laporan H >= D bocor ke faktor D"
    # aritmetika pada deret sintetis kecil (tanggal catat 20 dan 22 Nov, D = 23)
    s = faktor([("2026-11-20", "11|A", "belum"), ("2026-11-22", "11|A", "sudah"), ("2026-11-10", "11|B", "belum"), ("2026-11-01", "11|C", "belum")], "2026-10-27", "2026-11-23")
    assert s["11|A"] == {"aktif_3h": 1, "hari_sejak": 1, "belum_surut": False, "laporan_terakhir": "2026-11-22"}, s
    assert s["11|B"]["aktif_3h"] == 0 and s["11|B"]["hari_sejak"] == 13 and s["11|B"]["belum_surut"] is True
    assert s["11|C"]["hari_sejak"] == 22 and s["11|C"]["belum_surut"] is None, "lewat 14 hari: tak lagi diklaim belum surut"
    assert faktor([("2026-11-01", "11|C", None)], "2026-10-27", "2026-12-20") == {}, "lewat CAP dengan liputan cukup: tak ada baris"
    # arsip append-only dan penanda tepat_waktu
    with tempfile.TemporaryDirectory() as t:
        b = os.path.join(t, "a.jsonl")
        malam = dt.datetime(2026, 11, 23, 23, 0, tzinfo=WIB)
        assert tulis_arsip(b, "2026-11-24", s, malam) == 3
        asli = open(b).read()
        assert tulis_arsip(b, "2026-11-24", s, malam + dt.timedelta(hours=2)) == 0 and open(b).read() == asli, "arsip tidak boleh ditimpa"
        assert all(json.loads(x)["tepat_waktu"] for x in asli.splitlines())
        assert tulis_arsip(b, "2026-11-23", s, malam) == 3 and not json.loads(open(b).read().splitlines()[-1])["tepat_waktu"], "hitung sesudah 00:00 D bukan bukti prospektif"
    n = len(faktor(lap, awal, "2026-11-23"))
    print(f"ok faktor_surut: {len(lap)} laporan banjir, {n} kab berfaktor pada 2026-11-23 (fixture {awal}..2026-11-23, 2 hari bolong 20-21 Nov apa adanya)")


if __name__ == "__main__":
    if sys.argv[1:] == ["uji"]:
        uji()
        sys.exit(0)
    p = argparse.ArgumentParser()
    p.add_argument("--hari")
    p.add_argument("--wa", default=os.path.join(AKAR, "data/laporan-bnpb/harian"))
    p.add_argument("--arsip", default=ARSIP)
    a = p.parse_args()
    now = dt.datetime.now(WIB)
    D = a.hari or (now.date() + dt.timedelta(days=1)).isoformat()
    (lap, awal, gagal), _ = muat_semua(a.wa)
    for H, e in gagal:
        print("berkas gagal diurai:", H, e, file=sys.stderr)
    fak = faktor(lap, awal, D)
    print(f"faktor_surut D={D}: {len(fak)} kab, {tulis_arsip(a.arsip, D, fak, now)} baris baru -> {a.arsip}")
