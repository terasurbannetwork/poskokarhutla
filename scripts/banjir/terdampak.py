"""Kejadian banjir yang SUDAH terjadi, ringkas per kab/kota -> public/banjir/data/terdampak.json (PUBLIK).

Keputusan pemilik 9 Nov 2026: tampil publik, ringkas per kab/kota. Karena publik, tiap baris HANYA berisi
{kode, prov_kode, provinsi, kab, status, tanggal, sumber}. DILARANG: nama petugas, nomor telepon, isi laporan,
angka KK, jiwa, pengungsi. Pembacaan teks laporan hanya untuk menentukan status; teksnya tidak disimpan.
Gerbang: `uji` gagal bila kunci lain muncul (BOLEH), dan tests/banjir/terdampak.test.mjs memeriksa berkas tayang.

Sumber:
 1. data/laporan-bnpb/harian/<YYYY-MM>/<tanggal>/wa-koordalops.txt (terlacak git, jadi ada di CI), diurai pakai wa_harian.koordalops
    dan surut() milik scripts/data/dalops_banjir.py (satu aturan baca "surut" untuk seluruh sistem).
 2. data/raw/dalops/banjir.json bila ada (logbook lokal, tidak di CI): hanya kab, tanggal terakhir, flag surut.
Tanggal keadaan = hari laphar (H-1 dari tanggal laporan WA), sama dengan dalops_banjir.wa_entri.

Status: "Belum surut", "Sudah surut", "Belum diketahui".
Ambang basi (dihitung terhadap hari WIB saat skrip jalan):
  - Belum surut tanpa kabar lanjutan > 14 hari -> "Belum diketahui". Alasan: Koordalops melaporkan kejadian lama berselang
    beberapa hari (Serdang Bedagai senyap 10 hari padahal pemilik menandainya belum surut pada 8 Nov), jadi 7 hari terlalu ketat;
    lewat dua pekan tanpa kabar tak lagi bisa diklaim masih banjir. Berlaku juga untuk tetapan pemilik.
  - Sudah surut lebih tua dari 14 hari -> baris dibuang (peta ini kejadian dua pekan terakhir, bukan arsip).
  - Selain itu tampil dengan tanggalnya (layar menulis umur datanya).
Tetapan pemilik 8 Nov 2026 (TETAPAN) menang atas pembaca untuk keadaan sampai 8 Nov; kab di luar daftar dengan keadaan
terakhir <= 8 Nov dibuang. Laporan sesudah 8 Nov membaca ulang dari teks (tetapan hanya menimpa kab bertanggal <= 8 Nov).

Pakai: python3 scripts/banjir/terdampak.py   |   python3 scripts/banjir/terdampak.py uji
"""
import datetime as dt
import glob
import importlib.util
import json
import os
import re
import sys

AKAR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
KELUAR = os.path.join(AKAR, "public/banjir/data/terdampak.json")
LOGBOOK = os.path.join(AKAR, "data/raw/dalops/banjir.json")
KUNCI = {"kode", "prov_kode", "provinsi", "kab", "status", "tanggal", "sumber"}
KUNCI_ATAS = {"dibuat", "hari", "ambang", "baris"}
BELUM, SUDAH, TAK = "Belum surut", "Sudah surut", "Belum diketahui"
AMBANG_BELUM, AMBANG_SUDAH = 14, 14
SUMBER_WA, SUMBER_LOG = "Laporan harian Koordalops", "Laporan Pusdalops"
TGL_TETAPAN = "2026-11-08"
TETAPAN = {BELUM: ["Pidie Jaya", "Deli Serdang", "Langkat", "Serdang Bedagai", "Lumajang"],
           SUDAH: ["Aceh Barat", "Gayo Lues", "Aceh Selatan", "Kota Subulussalam", "Mandailing Natal", "Kota Binjai", "Padang Pariaman"]}


def _muat(nama, rel):
    s = importlib.util.spec_from_file_location(nama, os.path.join(AKAR, rel))
    m = importlib.util.module_from_spec(s)
    s.loader.exec_module(m)
    return m


def nama_kab(t):
    return re.sub(r"^(Kab\.|Kabupaten)\s+", "", (t or "").strip(), flags=re.I)


def kamus_kab():
    """{(prov_kode, nama kecil): nama kab resmi} dari pusat_kec.json (kunci 'prov|kab|kec'), nama yang sama dengan tabel wilayah."""
    p = os.path.join(AKAR, "public/banjir/data/pusat_kec.json")
    out = {}
    for k in json.load(open(p, encoding="utf-8")):
        a = k.split("|")
        out[(a[0], a[1].lower())] = a[1]
    return out


def dari_wa(WH, DB, kamus):
    """{kode: (tanggal, surut, sumber)} keadaan terakhir tiap kab dari semua wa-koordalops.txt; kab tak dikenal dilaporkan ke stderr."""
    hasil, asing = {}, set()
    for f in sorted(glob.glob(os.path.join(AKAR, "data/laporan-bnpb/harian/*/*/wa-koordalops.txt"))):   # 13 Nov: harian/<YYYY-MM>/<tanggal>
        hari = os.path.basename(os.path.dirname(f))
        tgl = (dt.date.fromisoformat(hari) - dt.timedelta(days=1)).isoformat()
        for k in WH.koordalops(open(f, encoding="utf-8").read())["kejadian"]:
            if k.get("jenis") != "banjir" or not k.get("lokasi") or not k.get("prov"):
                continue
            nama = kamus.get((k["prov"], nama_kab(k["lokasi"]).lower()))
            if not nama:
                asing.add(k["lokasi"])
                continue
            kode = f"{k['prov']}|{nama}"
            if kode not in hasil or tgl >= hasil[kode][0]:
                hasil[kode] = (tgl, DB.surut((k.get("teks") or {}).get("kondisi")), SUMBER_WA)
    if asing:
        print("kab tak dikenal (dilewati):", ", ".join(sorted(asing)), file=sys.stderr)
    return hasil


def dari_logbook(kamus):
    """Logbook lokal bila ada: hanya kab, tanggal terakhir, flag surut. Tidak ada = kosong (CI)."""
    if not os.path.exists(LOGBOOK):
        return {}
    hasil = {}
    for r in json.load(open(LOGBOOK, encoding="utf-8")).get("kejadian", []):
        kab = nama_kab(r["kab"][0] if isinstance(r.get("kab"), list) else r.get("kab"))
        nama = kamus.get((r.get("prov_kode"), kab.lower()))
        if nama and r.get("terakhir"):
            kode = f"{r['prov_kode']}|{nama}"
            if kode not in hasil or r["terakhir"] >= hasil[kode][0]:
                hasil[kode] = (r["terakhir"], bool(r.get("surut")), SUMBER_LOG)
    return hasil


def gabung(wa, log):
    """per kab ambil yang tanggalnya paling baru; seri tanggal sama, WA menang (isinya yang dibaca pemilik)."""
    out = dict(wa)
    for k, v in log.items():
        if k not in out or v[0] > out[k][0]:
            out[k] = v
    return out


def susun(keadaan, hari_ini, provinsi, tetapan=TETAPAN, tgl_tetapan=TGL_TETAPAN):
    """keadaan {kode: (tanggal, surut, sumber)} -> daftar baris publik. Murni (diuji)."""
    pilih = {k: st for k in keadaan for st, ns in tetapan.items() if k.split("|")[1] in ns}
    baris = []
    for kode, (tgl, surut, sumber) in sorted(keadaan.items()):
        if tgl <= tgl_tetapan:
            if kode not in pilih:
                continue                 # di luar daftar pemilik 8 Nov
            status = pilih[kode]
        else:
            status = SUDAH if surut else BELUM
        umur = (dt.date.fromisoformat(hari_ini) - dt.date.fromisoformat(tgl)).days
        if status == SUDAH and umur > AMBANG_SUDAH:
            continue
        if status == BELUM and umur > AMBANG_BELUM:
            status = TAK
        pk = kode.split("|")[0]
        baris.append({"kode": kode, "prov_kode": pk, "provinsi": provinsi.get(pk, pk), "kab": kode.split("|")[1], "status": status, "tanggal": tgl, "sumber": sumber})
    return baris


def periksa(doc):
    """gerbang kunci: tidak boleh ada kunci di luar daftar putih (nama petugas, telepon, angka dampak, isi laporan)."""
    salah = [set(doc) - KUNCI_ATAS] + [set(b) ^ KUNCI for b in doc["baris"]]
    assert not any(salah), f"kunci terlarang/hilang: {salah}"
    kamus = kamus_kab()
    for b in doc["baris"]:
        assert b["status"] in (BELUM, SUDAH, TAK), b
        assert b["sumber"] in (SUMBER_WA, SUMBER_LOG), b   # teks bebas tidak punya tempat di berkas publik
        assert b["kode"] == f'{b["prov_kode"]}|{b["kab"]}' and kamus.get((b["prov_kode"], b["kab"].lower())) == b["kab"], b
        assert re.fullmatch(r"\d{4}-\d\d-\d\d", b["tanggal"]), b
        assert not re.search(r"\d{6,}|@", json.dumps(b, ensure_ascii=False)), f"mirip nomor telepon/surel: {b}"
    return doc


def bangun(hari_ini=None):
    WH = _muat("wa_harian", "data/laporan-bnpb/generator/wa_harian.py")
    DB = _muat("dalops_banjir", "scripts/data/dalops_banjir.py")
    kamus = kamus_kab()
    hari_ini = hari_ini or (dt.datetime.now(dt.timezone.utc) + dt.timedelta(hours=7)).date().isoformat()
    baris = susun(gabung(dari_wa(WH, DB, kamus), dari_logbook(kamus)), hari_ini, DB.PROVINSI)
    return periksa({"dibuat": hari_ini, "hari": hari_ini, "ambang": {"belum_surut_hari": AMBANG_BELUM, "sudah_surut_hari": AMBANG_SUDAH}, "baris": baris})


def uji():
    prov = {"11": "Aceh"}
    k = {"11|A": ("2026-11-12", True, SUMBER_WA), "11|B": ("2026-11-09", False, SUMBER_WA), "11|C": ("2026-11-20", False, SUMBER_WA), "11|D": ("2026-11-12", True, SUMBER_WA),
         "11|E": ("2026-11-09", True, SUMBER_WA), "11|Pidie Jaya": ("2026-11-08", True, SUMBER_WA), "11|Zzz": ("2026-11-08", False, SUMBER_WA)}
    r = {b["kab"]: b for b in susun(k, "2026-11-25", prov)}
    assert r["A"]["status"] == SUDAH and r["D"]["status"] == SUDAH
    assert r["B"]["status"] == TAK, "belum surut > 14 hari harus Belum diketahui"
    assert r["C"]["status"] == BELUM
    assert "E" not in r, "sudah surut > 14 hari dibuang"
    assert "Zzz" not in r, "di luar daftar pemilik, tanggal <= 8 Nov, dibuang"
    assert r["Pidie Jaya"]["status"] == TAK, "tetapan pemilik Belum surut, tapi 17 hari tanpa kabar = Belum diketahui"
    r = {b["kab"]: b for b in susun(k, "2026-11-09", prov)}
    assert r["Pidie Jaya"]["status"] == BELUM, "tetapan pemilik menang atas pembaca (pembaca: Sudah)"
    ok = {"dibuat": "x", "hari": "x", "ambang": {}, "baris": [r["Pidie Jaya"]]}
    periksa(ok)
    for kotor in ({"petugas": "Budi"}, {"kk": 10}, {"telepon": "0812"}, {"sumber": "pak Andi, korban 3 jiwa"}, {"kab": "Budi lapor 12 KK"}):
        try:
            periksa({**ok, "baris": [{**ok["baris"][0], **kotor}]})
        except AssertionError:
            continue
        raise SystemExit(f"gerbang lolos untuk {kotor}")
    try:
        periksa({**ok, "baris": [{**ok["baris"][0], "kab": "081234567890"}]})
        raise SystemExit("nomor telepon lolos")
    except AssertionError:
        pass
    print("ok terdampak")


if __name__ == "__main__":
    if sys.argv[1:] == ["uji"]:
        uji()
        sys.exit(0)
    d = bangun()
    os.makedirs(os.path.dirname(KELUAR), exist_ok=True)
    with open(KELUAR, "w", encoding="utf-8") as f:
        json.dump(d, f, ensure_ascii=False, indent=1)
        f.write("\n")
    n = {s: sum(b["status"] == s for b in d["baris"]) for s in (BELUM, SUDAH, TAK)}
    print(f"terdampak: {len(d['baris'])} kab/kota {n} -> public/banjir/data/terdampak.json")
