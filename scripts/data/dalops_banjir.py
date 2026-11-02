"""Bahan layar staf Pantau Banjir Dalops (/bnpb/dalops): kejadian banjir dari logbook harian Pusdalops, PRIVAT.

Masukan : data/raw/logbook/arsip/<tahun>/kejadian.jsonl (keluaran logbook_pusdalops.py, tidak di-git; ada nama petugas)
Keluaran: data/raw/dalops/banjir.json (ikut .gitignore). Dengan --unggah: R2 poskokarhutla-foto/dalops/banjir.json,
          disajikan src/dalops.js hanya untuk sesi staf Pusdalops/Koordalops/Pimpinan.

Pilihan kejadian (jenis "banjir"; bandang tercatat di jenis ini, rob di gelombang_pasang tidak ikut):
  - mulai dalam 30 hari terakhir, DAN
  - kabar terakhir dalam 7 hari logbook terakhir (bahan "laporan sepekan") ATAU belum dilaporkan surut
    (yang lama senyap justru harus dikejar Dalops; layar menaruhnya di "Perlu ditanya", bukan di tabel sepekan).
Layar mengelompokkan per kab/kota dan status surut, sama dengan deck "Situasi Banjir Sepekan" 2 Nov 2026.
Surut dibaca dari teks kondisi terakhir (lihat `surut()`); "mulai/berangsur surut" dihitung BELUM surut.
Angka tak diketahui = null, bukan 0.

Pakai: python3 scripts/data/dalops_banjir.py [--hari YYYY-MM-DD] [--unggah]
Uji  : python3 scripts/data/dalops_banjir.py --uji
"""
import argparse
import datetime as dt
import glob
import importlib.util
import json
import os
import re
import subprocess

AKAR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
KELUAR = os.path.join(AKAR, "data/raw/dalops/banjir.json")
KUNCI_R2 = "poskokarhutla-foto/dalops/banjir.json"
SEPEKAN, BUKA_MAKS = 6, 30   # hari sebelum hari logbook terakhir


def _muat(nama, rel):
    s = importlib.util.spec_from_file_location(nama, os.path.join(AKAR, rel))
    m = importlib.util.module_from_spec(s)
    s.loader.exec_module(m)
    return m


# --------------------------------------------------------------- pembaca teks kondisi (murni, diuji --uji)
SUDAH = re.compile(r"\b(sudah|telah|sdh|sudh)\s+(mulai\s+)?(surut|kering)|\bsurut\s+(total|seluruhnya|sepenuhnya)|\bkembali\s+normal|\bsudah\s+tidak\s+(ada\s+)?(tergenang|genangan)")
BELUM = re.compile(r"\bbelum\s+(sepenuhnya\s+)?surut|\bmasih\s+(ter)?genang|\bmenggenangi|\bmasih\s+terendam|\bair\s+(kembali\s+)?naik|\bkenaikan")
RE_TGL_AWAL = re.compile(r"^\s*(senin|selasa|rabu|kamis|jumat|jum'at|sabtu|minggu)?,?\s*\d{1,2}\s+\w+\s+\d{4}\s*", re.I)


def surut(teks):
    """True bila kondisi terakhir menyatakan sudah surut tanpa sisa genangan; 'mulai/berangsur/perlahan surut' = belum."""
    t = (teks or "").lower()
    if BELUM.search(t):
        # "sudah surut di sebagian besar wilayah" dengan sisa genangan tetap belum; kecuali kalimat surutnya tegas tanpa sisa
        return False
    return bool(SUDAH.search(t))


RE_TINGGI = re.compile(r"(\d+(?:[.,]\d+)?)\s*(?:(?:s/d|s\.d\.?|sd|-|–|hingga|sampai|sampai dengan)\s*(\d+(?:[.,]\d+)?)\s*)?(cm|centimeter|sentimeter|m|meter)\b", re.I)
KATA_AIR = re.compile(r"ketinggian|tinggi|tma|genangan|air|banjir|terendam", re.I)


def tinggi_cm(teks):
    """[min, max] tinggi air dalam cm dari teks bebas, hanya bila dekat kata air/genangan/ketinggian. Tidak ada = None."""
    hasil = []
    for m in RE_TINGGI.finditer(teks or ""):
        depan = (teks or "")[max(0, m.start() - 40):m.start()]
        if not KATA_AIR.search(depan):
            continue
        kali = 100 if m.group(3).lower() in ("m", "meter") else 1
        a = float(m.group(1).replace(",", ".")) * kali
        b = float(m.group(2).replace(",", ".")) * kali if m.group(2) else a
        if 0 < a <= b <= 1000:
            hasil += [a, b]
    return [round(min(hasil)), round(max(hasil))] if hasil else None


def bersih_kondisi(teks):
    t = RE_TGL_AWAL.sub("", (teks or "").strip())
    t = re.sub(r"\s+", " ", t).strip()
    return t[:240].rstrip() + ("…" if len(t) > 240 else "")


# --------------------------------------------------------------- rakit
def angka(*v):
    for x in v:
        if isinstance(x, (int, float)) and x > 0:
            return int(x)
    return None


def baris(k, kode_kab, bersih):
    teks = bersih(k.get("kondisi_terakhir") or "")
    return {"id": k["id_kejadian"], "prov": (k["prov"] or [""])[0], "prov_kode": (k["prov_kode"] or [""])[0], "kab": k["kabkota"], "kab_kode": kode_kab(k),
            "mulai": k["tgl_kejadian"] or k["pertama_dicatat"], "pertama": k["pertama_dicatat"], "terakhir": k["terakhir_dicatat"], "n_laporan": k["n_laporan"],
            "kk": angka(k.get("kk_terdampak"), k.get("kk")), "jiwa": angka(k.get("orang_terdampak"), k.get("jiwa")),
            "mengungsi": angka(k.get("orang_mengungsi"), k.get("mengungsi")), "rumah_terendam": angka(k.get("rumah_terendam")),
            "tinggi_cm": tinggi_cm(teks + " " + (k.get("dampak_teks_terakhir") or "")), "surut": surut(teks), "kondisi": bersih_kondisi(teks)}


def rakit(kejadian, hari, kode_kab, bersih=lambda t: t):
    awal_pekan = (dt.date.fromisoformat(hari) - dt.timedelta(days=SEPEKAN)).isoformat()
    awal_buka = (dt.date.fromisoformat(hari) - dt.timedelta(days=BUKA_MAKS)).isoformat()
    out = []
    for k in kejadian:
        if k.get("jenis") != "banjir" or not k.get("kabkota") or not k.get("terakhir_dicatat") or k["terakhir_dicatat"] > hari:
            continue
        b = baris(k, kode_kab, bersih)
        # mulai > 30 hari lalu dibuang: entri status tanggap/transisi panjang (mis. Solok sejak 21 Sep berisi catatan rapat) bukan genangan
        if (b["mulai"] or "") >= awal_buka and (b["terakhir"] >= awal_pekan or not b["surut"]):
            out.append(b)
    return sorted(out, key=lambda b: (b["prov_kode"], b["terakhir"]))


def main():
    a = argparse.ArgumentParser()
    a.add_argument("--hari", help="hari logbook terakhir yang dipakai (bawaan: paling akhir di arsip)")
    a.add_argument("--unggah", action="store_true", help="unggah ke R2 (wrangler, --remote)")
    a.add_argument("--uji", action="store_true")
    o = a.parse_args()
    if o.uji:
        return uji()
    LB = _muat("logbook_bersih", "scripts/data/logbook_bersih.py")
    LP = _muat("logbook_pusdalops", "scripts/data/logbook_pusdalops.py")
    th = sorted(glob.glob(os.path.join(AKAR, "data/raw/logbook/arsip/20??/kejadian.jsonl")))[-2:]   # tahun ini + lalu (awal Januari)
    kejadian = [json.loads(l) for f in th for l in open(f, encoding="utf-8")]
    hari = o.hari or max(k["terakhir_dicatat"] for k in kejadian if k.get("terakhir_dicatat"))
    rows = rakit(kejadian, hari, LB.kode_kab, LP.bersih)
    kini = dt.datetime.now(dt.timezone(dt.timedelta(hours=7))).isoformat(timespec="minutes")
    os.makedirs(os.path.dirname(KELUAR), exist_ok=True)
    with open(KELUAR, "w", encoding="utf-8") as f:
        json.dump({"v": 1, "dibuat": kini, "hari": hari, "sumber": "Logbook Pusdalops BNPB", "kejadian": rows}, f, ensure_ascii=False, separators=(",", ":"))
    awal = (dt.date.fromisoformat(hari) - dt.timedelta(days=SEPEKAN)).isoformat()
    pekan = [r for r in rows if r["terakhir"] >= awal]
    print(f"hari {hari}: {len(pekan)} laporan sepekan, {sum(not r['surut'] for r in rows)} belum surut, "
          f"{sum(r['surut'] for r in pekan)} sudah surut -> {os.path.relpath(KELUAR, AKAR)}")
    if o.unggah:
        subprocess.run(["npx", "--yes", "wrangler@4.42.0", "r2", "object", "put", KUNCI_R2, "--file", KELUAR,
                        "--content-type", "application/json", "--remote"], cwd=AKAR, check=True)


def uji():
    # surut: kalimat nyata logbook 24 Okt-1 Nov 2026, dicocokkan dengan deck "Situasi Banjir Sepekan" 2 Nov 2026
    assert surut("Banjir sudah surut, namun untuk saat ini cuaca masih hujan sedang dilakukan pembersihan")   # Tapanuli Tengah
    assert surut("Banjir sudah surut")   # Labuhanbatu
    assert surut("Saat ini kondisi banjir sudah surut")   # Asahan
    assert surut("Banjir sudah surut di sebagian besar wilayah. masih dilakukan pendataan")   # Deli Serdang
    assert not surut("Banjir belum surut Dilaporkan 8 KK masih mengungsi di Balai Desa")   # Aceh Tengah
    assert not surut("Hujan Banjir Berangsur surut Beberapa rumah masih masih terendam banjir")   # Aceh Barat
    assert not surut("Air perlahan mulai surut di beberapa titik. Genangan kecil dan lumpur masih ada")   # Pidie Jaya
    assert not surut("Air mulai surut di Jalan Lintas, namun masih ada desa yang tergenang")   # Subulussalam
    assert not surut("Air masih menggenangi pemukiman masyarakat.")   # Nagan Raya
    assert not surut("Air belum surut")   # Aceh Tenggara
    assert not surut("Lokasi terdampak masih dalam penanganan oleh Pemerintah setempat")   # Dairi: tak jelas = belum
    assert not surut("")
    # tinggi air
    assert tinggi_cm("Air terpantau ada kenaikan dengan ketinggian air di badan jalan 10 s/d 15 cm") == [10, 15]
    assert tinggi_cm("ketinggian air 50 cm") == [50, 50]
    assert tinggi_cm("genangan 30-60 cm di permukiman") == [30, 60]
    assert tinggi_cm("tinggi muka air 1,5 meter") == [150, 150]
    assert tinggi_cm("jalan sepanjang 200 m rusak") is None   # bukan tinggi air
    assert tinggi_cm("") is None
    assert bersih_kondisi("Sabtu, 31 Oktober 2026 Air mulai surut") == "Air mulai surut"
    # rakit: jendela sepekan + belum surut 30 hari
    kode = lambda k: ["11|" + k["kabkota"][0]]
    K = lambda i, t, kon, mulai="2026-10-20": {"id_kejadian": i, "jenis": "banjir", "kabkota": ["Kab. X" + i], "prov": ["Aceh"], "prov_kode": ["11"],
                                               "tgl_kejadian": mulai, "pertama_dicatat": mulai, "terakhir_dicatat": t, "n_laporan": 1, "kondisi_terakhir": kon}
    r = rakit([K("a", "2026-11-01", "sudah surut"), K("b", "2026-10-20", "belum surut"), K("c", "2026-10-20", "sudah surut"),
               K("d", "2026-09-01", "belum surut", "2026-09-01"), dict(K("e", "2026-11-01", "x"), jenis="longsor"), K("f", "2026-11-02", "x")], "2026-11-01", kode)
    assert [x["id"] for x in r] == ["b", "a"], r   # c lama dan surut, d mulai >30 hari, e bukan banjir, f sesudah hari
    assert r[1]["surut"] and not r[0]["surut"] and r[0]["kk"] is None
    print("uji dalops_banjir: lulus")


if __name__ == "__main__":
    main()
