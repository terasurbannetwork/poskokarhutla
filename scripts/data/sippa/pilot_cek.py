#!/usr/bin/env python3
"""SIPPA: pemeriksa kelengkapan data pilot dan vonis "dapat dipakai" (RENCANA-UJI §6.1 PL1-PL9, keputusan 53, SP-019). Stdlib saja.

Pakai:
  pilot_cek.py log.csv probe.csv [--komponen komponen.csv] [--mulai 2026-10-26] [--akhir 2026-11-01]
      log.csv   = GET /api/sippa/log.csv     probe.csv = GET /api/sippa/probe.csv  (kolom: src/sippa.js KOLOM_LOG, KOLOM_PROBE)
      komponen.csv (opsional; ekspor belum ada rute) = kolom `kondisi` [+ `musim_awal`]: keadaan komponen sesudah gerak `kembali` terakhir
  pilot_cek.py uji
Keluar 0 bila PL1-PL9 lulus, 1 bila ada yang gagal, 2 salah pakai. Vonis keputusan 53 dicetak terpisah; tidak memengaruhi kode keluar.
"""
import csv
import io
import json
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

sys.path.append(str(Path(__file__).resolve().parent))  # append: `python3 -I` tidak memuat folder skrip
import bersama  # noqa: E402

WIB = timezone(timedelta(hours=7))
JENIS_GELAR = ("karhutla", "latihan")
ANGKA = {"panjang_m", "n_orang", "t_tiba", "t_mulai_gelar", "t_air_mengalir", "t_mulai_injeksi", "t_selesai", "t_bongkar_selesai",
         "jam_pompa", "bbm_l", "air_m3", "banjir_m3", "lat", "lon", "air_sampai_lance", "p_ujung_bar", "p_ujung_menit", "kecelakaan",
         "bocor_henti_menit", "jam_klien_meleset", "dummy", "kedalaman_cm", "suhu_c", "musim_awal"}
INTI = ["t_tiba", "t_mulai_gelar", "t_air_mengalir", "t_bongkar_selesai"]
ANGKA_SESI = ["kelas_medan", "panjang_m", "n_orang", "jam_pompa", "bbm_l"]
MEDAN_VONIS = ["petak_id", "air_sampai_lance", "p_ujung_bar", "p_ujung_menit", "p_ujung_sumber", "kecelakaan", "bocor_henti_menit"]


def sel(kolom, v):
    """Balikkan ekspor: '' = None; awalan ' pengaman (= + - @ tab CR) dibuang; kolom angka jadi int/float."""
    if v is None or v == "":
        return None
    if len(v) > 1 and v[0] == "'" and v[1] in "=+-@\t\r":
        v = v[1:]
    if kolom in ANGKA:
        try:
            f = float(v)
        except ValueError:
            return v
        return int(f) if f.is_integer() else f
    return v


def baca_csv(teks):
    return [{k: sel(k, v) for k, v in r.items()} for r in csv.DictReader(io.StringIO(teks, newline=""))]


def konfigurasi(l):
    k = l.get("konfigurasi")
    if isinstance(k, str):
        try:
            k = json.loads(k)
        except json.JSONDecodeError:
            return None
    return k if isinstance(k, dict) else None


def periksa(log_mentah, probe, komponen=None, mulai=None, akhir=None):
    """Mengembalikan (daftar PL, vonis). PL = {no, nama, lulus: True|False|None, ringkas, rincian[]}; None = tidak gagal (ditunda/info)."""
    mulai = mulai or datetime(2026, 10, 26, tzinfo=WIB)
    akhir = akhir or datetime(2026, 11, 2, tzinfo=WIB)  # eksklusif: 1 Nov 23.59 WIB masuk
    diganti = {l.get("koreksi_dari") for l in log_mentah if l.get("koreksi_dari")}
    dummy = [l for l in log_mentah if l.get("dummy") == 1]
    log = [{**l, "konfigurasi": konfigurasi(l)} for l in log_mentah
           if l.get("dummy") != 1 and l.get("jenis") in JENIS_GELAR and l.get("id") not in diganti]
    tak_sah = []
    for l in log:  # konfigurasi yang ditolak hidraulika() (mis. kedalaman > 5 m) dilaporkan, bukan membuat pemeriksa mati
        try:
            if l["konfigurasi"]:
                bersama.hid.hidraulika(l["konfigurasi"])
        except ValueError as e:
            tak_sah.append(f"{l.get('id')}: konfigurasi tidak sah ({e})")
            l["konfigurasi"] = None
    pl = []

    def tambah(no, nama, lulus, ringkas, rincian=()):
        pl.append({"no": no, "nama": nama, "lulus": lulus, "ringkas": ringkas, "rincian": list(rincian)})
    ms = lambda d: d.timestamp() * 1000
    dalam = [l for l in log if l.get("t_tiba") is not None and ms(mulai) <= l["t_tiba"] < ms(akhir)]
    tambah("PL1", "jumlah sesi gelar", len(dalam) >= 2, f"{len(dalam)} sesi karhutla/latihan di {mulai:%d %b}–{(akhir - timedelta(days=1)):%d %b %Y} (perlu ≥ 2)",
           [f"{l.get('id')}: t_tiba di luar rentang pilot" for l in log if l not in dalam])
    gal = [f"{l.get('id')}: {k} kosong" for l in log for k in INTI if l.get(k) is None]
    gal += [f"{l.get('id')}: {a} > {b}" for l in log for a, b in zip(INTI, INTI[1:])
            if l.get(a) is not None and l.get(b) is not None and l[a] > l[b]]
    tambah("PL2", "stempel waktu inti", not gal, f"{len(log)} sesi diperiksa", gal)
    gal = [f"{l.get('id')}: {k} kosong" for l in log for k in ANGKA_SESI if l.get(k) is None]
    gal += [f"{l.get('id')}: air_m3 kosong tanpa catatan 'tanpa totalizer'" for l in log
            if l.get("air_m3") is None and "tanpa totalizer" not in (l.get("catatan") or "").lower()]
    tambah("PL3", "angka sesi", not gal, f"{len(log)} sesi diperiksa", gal)
    # PL4 dan vonis hanya memakai sesi sah (non-dummy, jenis gelar, tidak digantikan koreksi, dalam rentang) dan probe petak sesi itu
    petak_sah = {l["petak_id"] for l in dalam if l.get("petak_id") is not None}
    probe_sah = [r for r in probe if r.get("petak_id") in petak_sah]
    luar = [r for r in probe if r.get("petak_id") not in petak_sah]
    b5 = next(b for b in bersama.vonis_pilot({"log": dalam, "probe": probe_sah})["butir"] if b["no"] == 5)
    ada = {(r.get("petak_id"), r.get("titik"), r.get("tahap"), r.get("kedalaman_cm")) for r in probe_sah}
    gal = [f"petak {p} titik {t}: tidak ada {th} {k} cm" for p, t in sorted({(r.get("petak_id"), r.get("titik")) for r in probe_sah}, key=str)
           for th in bersama.TAHAP_PROBE for k in bersama.DALAM_PROBE if (p, t, th, k) not in ada]
    tanpa = sorted(petak_sah - {r.get("petak_id") for r in probe_sah})
    gal += [f"petak {p}: tidak ada probe sama sekali" for p in tanpa]
    if luar:
        gal.append(f"probe di luar sesi pilot: {len(luar)} baris (petak {', '.join(sorted({str(r.get('petak_id')) for r in luar}))}), tidak dihitung")
    pct = "belum ada probe" if b5["nilai"] is None else f"{b5['nilai'] * 100:.0f}%".replace(".", ",")
    tambah("PL4", "probe", b5["lulus"] is True, f"kelengkapan {pct} (perlu ≥ 90% dan tiap petak punya probe; tahap sebelum/sesudah/24j x 10/30/50/100 cm)", gal)
    gal = [f"{l.get('id')}: oleh '{l.get('oleh')}' bukan tugas:/staf:" for l in log + probe_sah
           if not str(l.get("oleh") or "").startswith(("tugas:", "staf:"))]
    gal += [f"{l.get('id')}: isian kertas tanpa foto_id maupun catatan" for l in log
            if str(l.get("oleh") or "").startswith("staf:") and l.get("foto_id") is None and not l.get("catatan")]
    tambah("PL5", "sumber isian", not gal, f"{len(log)} sesi + {len(probe_sah)} baris probe", gal)
    tambah("PL6", "bukan dummy", not dummy, f"{len(dummy)} baris dummy di ekspor", [f"{l.get('id')}: dummy = 1" for l in dummy])
    meleset = [l for l in log if l.get("jam_klien_meleset") == 1]
    tambah("PL7", "jam klien", None, f"{len(meleset)} sesi jam_klien_meleset = 1 (dihitung terpisah, tidak dibuang)", [f"{l.get('id')}" for l in meleset])
    tambah("PL8", "pasangan A/B", None, "vonis lebih baik ditunda: ekspor log.csv tidak memuat pasangan_id/lengan; periksa di D1 bila ada api aktif")
    gal = [f"{l.get('id')}: {k} kosong" for l in log for k in MEDAN_VONIS if l.get(k) is None] + tak_sah
    if komponen is None:
        ket = "cek komponen sesudah gerak kembali tidak ikut diperiksa (tanpa --komponen)"
    else:
        ket = f"{len(komponen)} komponen kit"
        if not komponen:
            gal.append("kit pilot: tidak ada cek komponen sesudah gerak kembali terakhir")
    tambah("PL9", "medan vonis", not gal, f"{len(log)} sesi; {ket}", gal)
    kit = [c for c in (komponen or []) if c.get("musim_awal") in (None, 1)]
    vonis = bersama.vonis_pilot({"log": dalam, "probe": probe_sah, "komponen_kembali": kit})
    return pl, vonis


def cetak(pl, vonis):
    for p in pl:
        tanda = {True: "LULUS", False: "GAGAL", None: "INFO "}[p["lulus"]]
        print(f"{p['no']} {tanda} {p['nama']}: {p['ringkas']}")
        for r in p["rincian"][:20]:
            print(f"      - {r}")
        if len(p["rincian"]) > 20:
            print(f"      - ... {len(p['rincian']) - 20} lagi")
    print("VONIS PILOT (keputusan 53, asumsi-kebijakan):", vonis["vonis"])
    for b in vonis["butir"]:
        s = {True: "lulus", False: "GAGAL", None: "data belum lengkap"}[b["lulus"]]
        print(f"  butir {b['no']}: {s} - {b['alasan']}")
    print("  butir tidak lulus:", vonis["gagal"] or "tidak ada")


def jalankan(log_teks, probe_teks, komponen_teks=None, mulai=None, akhir=None):
    pl, vonis = periksa(baca_csv(log_teks), baca_csv(probe_teks), None if komponen_teks is None else baca_csv(komponen_teks), mulai, akhir)
    cetak(pl, vonis)
    gagal = [p["no"] for p in pl if p["lulus"] is False]
    print("HASIL:", "semua syarat PL1-PL9 lulus" if not gagal else "GAGAL: " + ", ".join(gagal))
    return 1 if gagal else 0


def tgl(s):
    return datetime.strptime(s, "%Y-%m-%d").replace(tzinfo=WIB)


def main(argv):
    if argv == ["uji"]:
        return uji()
    pos, opsi, i = [], {}, 0
    while i < len(argv):
        if argv[i] in ("--komponen", "--mulai", "--akhir") and i + 1 < len(argv):
            opsi[argv[i][2:]] = argv[i + 1]
            i += 2
        elif argv[i].startswith("--"):
            sys.exit(f"opsi tidak dikenal: {argv[i]}\n{__doc__}")
        else:
            pos.append(argv[i])
            i += 1
    if len(pos) != 2:
        sys.exit(__doc__)
    baca = lambda p: Path(p).read_text(encoding="utf-8")
    try:
        return jalankan(baca(pos[0]), baca(pos[1]), baca(opsi["komponen"]) if "komponen" in opsi else None,
                        tgl(opsi["mulai"]) if "mulai" in opsi else None,
                        tgl(opsi["akhir"]) + timedelta(days=1) if "akhir" in opsi else None)
    except (OSError, ValueError) as e:
        print(f"galat: {e}", file=sys.stderr)
        return 2


# ---------- self-check ----------
def uji():
    import contextlib
    import tempfile
    import kembar_cli
    acuan = {k["id"]: k for k in json.loads(kembar_cli.ACUAN.read_text(encoding="utf-8"))}
    kolom_log = ["id", "tugas_id", "kit_id", "kompleks_id", "prov", "jenis", "kelas_medan", "panjang_m", "n_orang", "t_tiba", "t_mulai_gelar",
                 "t_air_mengalir", "t_mulai_injeksi", "t_selesai", "t_bongkar_selesai", "jam_pompa", "bbm_l", "air_m3", "banjir_m3", "lat", "lon",
                 "catatan", "foto_id", "petak_id", "air_sampai_lance", "p_ujung_bar", "p_ujung_menit", "p_ujung_sumber", "kecelakaan",
                 "bocor_henti_menit", "konfigurasi", "koreksi_dari", "jam_klien_meleset", "waktu_klien", "diterima", "oleh", "dummy"]
    kolom_probe = ["id", "log_id", "tugas_id", "petak_id", "titik", "tahap", "kedalaman_cm", "suhu_c", "waktu", "oleh"]

    def tulis(kolom, baris):
        o = io.StringIO()
        w = csv.DictWriter(o, kolom, lineterminator="\r\n")
        w.writeheader()
        w.writerows(baris)
        return o.getvalue()

    def ekspor(vid, buang_tahap=None, ubah=None, buang_petak=None, asing=None):
        m = acuan[vid]["masukan"]
        log = [{"jenis": "latihan", "kelas_medan": "gambut", "panjang_m": 1000, "n_orang": 6, "jam_pompa": 3, "bbm_l": 60, "air_m3": "",
                "catatan": "tanpa totalizer", "oleh": "tugas:T1", "dummy": 0, "jam_klien_meleset": 0, **l,
                "konfigurasi": json.dumps(l["konfigurasi"])} for l in m["log"]]
        for l in log:
            (ubah or (lambda x: None))(l)
        probe = [{"id": f"P{i}", "oleh": "tugas:T1", **r} for i, r in enumerate(m["probe"]) if r["tahap"] != buang_tahap and r["petak_id"] != buang_petak]
        probe += [{"id": f"A{i}", "oleh": "tugas:T1", **r, "petak_id": asing} for i, r in enumerate(m["probe"]) if asing and r["petak_id"] == "P-01"]
        komp = [{"kondisi": c["kondisi"], "musim_awal": c["musim_awal"]} for c in m["komponen_kembali"]]
        return tulis(kolom_log, log), tulis(kolom_probe, probe), tulis(["kondisi", "musim_awal"], komp)

    def lari(log, probe, komp=None):
        o = io.StringIO()
        with contextlib.redirect_stdout(o):
            kode = jalankan(log, probe, komp)
        return kode, o.getvalue()

    def vonis_dari(teks):
        return next(b[len("VONIS PILOT (keputusan 53, asumsi-kebijakan): "):] for b in teks.splitlines() if b.startswith("VONIS PILOT"))
    # V1: semua lulus, keluar 0, vonis DAPAT DIPAKAI
    kode, teks = lari(*ekspor("V1"))
    assert kode == 0 and vonis_dari(teks) == acuan["V1"]["harap"]["vonis"], teks
    # tanpa --komponen: PL tetap lulus (info), vonis turun ke bersyarat karena butir 7 belum ada datanya
    kode, teks = lari(*ekspor("V1")[:2])
    assert kode == 0 and vonis_dari(teks) == "DAPAT DIPAKAI BERSYARAT" and "data belum lengkap" in teks, teks
    # fixture tanpa probe `sesudah` ditolak (PL4) dan kode keluar bukan 0
    kode, teks = lari(*ekspor("V1", buang_tahap="sesudah"))
    assert kode == 1 and "PL4 GAGAL" in teks and "tidak ada sesudah 10 cm" in teks, teks
    # V2 (probe 20/24): PL4 gagal, vonis sama dengan fixture
    kode, teks = lari(*ekspor("V2"))
    assert kode == 1 and "PL4 GAGAL" in teks and vonis_dari(teks) == acuan["V2"]["harap"]["vonis"], teks
    # V3 (henti bocor 45 menit): PL lulus, vonis BELUM DAPAT DIPAKAI; fixture V3 memuat butir 6
    kode, teks = lari(*ekspor("V3"))
    assert vonis_dari(teks) == acuan["V3"]["harap"]["vonis"] and "butir tidak lulus: [6]" in teks, teks
    # V4 = V1 tanpa semua probe petak pertama: butir 5 gagal (di semua petak), vonis BERSYARAT
    kode, teks = lari(*ekspor("V1", buang_petak="P-01"))
    assert kode == 1 and "PL4 GAGAL" in teks and "petak P-01: tidak ada probe sama sekali" in teks, teks
    assert vonis_dari(teks) == "DAPAT DIPAKAI BERSYARAT" and "butir tidak lulus: [5]" in teks, teks
    # probe lengkap petak asing tidak boleh menutupi petak pilot yang kosong
    kode, teks = lari(*ekspor("V1", buang_petak="P-01", asing="P-99"))
    assert kode == 1 and "PL4 GAGAL" in teks and "probe di luar sesi pilot: 12 baris (petak P-99)" in teks, teks
    assert "butir tidak lulus: [5]" in teks, teks
    # vonis hanya dari sesi dalam rentang: L1 (petak P-02) di luar rentang -> butir 1 gagal (satu petak), BELUM
    kode, teks = lari(*ekspor("V1", ubah=lambda l: l.update(t_tiba=l["t_tiba"] + 40 * 86400e3) if l["id"] == "L1" else None))
    assert "L1: t_tiba di luar rentang pilot" in teks and vonis_dari(teks) == "BELUM DAPAT DIPAKAI" and "probe di luar sesi pilot: 12" in teks, teks
    # satu sesi saja: PL1 gagal
    kode, teks = lari(*ekspor("V1", ubah=lambda l: l.update(jenis="uji") if l["id"] != "L0" else None))
    assert kode == 1 and "PL1 GAGAL" in teks, teks
    # luar rentang pilot: PL1 gagal
    kode, teks = lari(*ekspor("V1", ubah=lambda l: l.update(t_tiba=l["t_tiba"] + 40 * 86400e3)))
    assert kode == 1 and "PL1 GAGAL" in teks, teks
    # dummy: PL6 gagal; medan vonis kosong: PL9 gagal dan menyebut sesi + medan; kertas tanpa pindaian: PL5 gagal
    kode, teks = lari(*ekspor("V1", ubah=lambda l: l.update(dummy=1) if l["id"] == "L1" else None))
    assert kode == 1 and "PL6 GAGAL" in teks and "L1: dummy = 1" in teks, teks
    kode, teks = lari(*ekspor("V1", ubah=lambda l: l.update(p_ujung_sumber="") if l["id"] == "L2" else None))
    assert kode == 1 and "PL9 GAGAL" in teks and "L2: p_ujung_sumber kosong" in teks, teks
    kode, teks = lari(*ekspor("V1", ubah=lambda l: l.update(oleh="staf:budi", catatan="") if l["id"] == "L0" else None))
    assert kode == 1 and "PL5 GAGAL" in teks and "L0: isian kertas" in teks, teks
    # koreksi: baris yang digantikan tidak dihitung; sel ber-awalan ' dibalikkan
    assert baca_csv("catatan,t_tiba,foto_id\r\n'=1+1,5,\r\n")[0] == {"catatan": "=1+1", "t_tiba": 5, "foto_id": None}
    asli, ganti = {"id": "A", "jenis": "latihan", "t_tiba": 1793149200000}, {"id": "B", "jenis": "latihan", "t_tiba": 1793149200000, "koreksi_dari": "A"}
    assert next(p for p in periksa([asli, ganti], [])[0] if p["no"] == "PL1")["ringkas"].startswith("1 sesi"), "baris yang dikoreksi harus keluar"
    # lewat berkas dan argumen, seperti dipakai staf
    with tempfile.TemporaryDirectory() as d:
        l, p, k = ekspor("V1")
        for nama, isi in (("log.csv", l), ("probe.csv", p), ("komp.csv", k)):
            Path(d, nama).write_text(isi, encoding="utf-8")
        with contextlib.redirect_stdout(io.StringIO()):
            assert main([f"{d}/log.csv", f"{d}/probe.csv", "--komponen", f"{d}/komp.csv"]) == 0
            assert main([f"{d}/log.csv", f"{d}/probe.csv", "--mulai", "2026-10-30", "--akhir", "2026-11-01"]) == 1  # hanya 1 sesi (30 Okt) di rentang itu
            assert main([f"{d}/hilang.csv", f"{d}/probe.csv"]) == 2
    print("pilot_cek.py uji: OK (V1 lulus keluar 0; tanpa probe sesudah, V2, dummy, medan kosong, di luar rentang ditolak; V1-V3 vonis = fixture)")


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
