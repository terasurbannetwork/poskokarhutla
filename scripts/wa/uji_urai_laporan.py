#!/usr/bin/env python3
"""Bangun set latih/uji pengurai laporan WA dan ukur akurasinya.

    python3 scripts/wa/uji_urai_laporan.py uji      # self-check fixture sintetis (CI)
    python3 scripts/wa/uji_urai_laporan.py bangun   # arsip logbook -> data/raw/logbook/turunan/latih/ (di luar git)
    python3 scripts/wa/uji_urai_laporan.py eval     # akurasi per medan pada uji.jsonl (2024-2026)

Catatan jujur: target kendala/kebutuhan berasal dari pemetaan kata kunci yang SAMA dengan pengurai
(label lemah), jadi F1-nya mengukur konsistensi, bukan kebenaran. Medan lain berasal dari
pengurai arsip pada sel docx asli, sedangkan masukan di sini DIRAKIT ULANG dari medan terurai.
"""
from __future__ import annotations

import collections
import datetime
import json
import os
import re
import sys

AKAR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import urai_laporan as ul  # noqa: E402

lb = ul.lb
ARSIP = os.path.join(AKAR, "data", "raw", "logbook", "arsip")
KELUAR = os.path.join(AKAR, "data", "raw", "logbook", "turunan", "latih")
BLN = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"]
HARI = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"]
ANGKA = ["md", "hilang", "luka", "mengungsi_jiwa", "mengungsi_kk", "rumah_rb", "rumah_rs", "rumah_rr", "rumah_terendam", "luas_ha"]


def tgl_id(iso: str) -> str:
    y, m, d = (int(x) for x in iso.split("-"))
    try:
        hari = HARI[datetime.date(y, m, d).weekday()] + ", "
    except ValueError:  # tanggal tak sah di arsip (mis. 30 Februari): tetap ditulis apa adanya
        hari = ""
    return f"{hari}{d:02d} {BLN[m - 1]} {y}"


def masukan_dari(r: dict) -> str:
    """Rakit teks mirip pesan WA dari medan arsip. Dua tata letak bergantian agar pengurai tak hafal satu bentuk."""
    k = r.get("no", 0) + len(r.get("tgl_logbook", ""))
    p = [r.get("jenis_teks") or ""]
    if r.get("tgl_kejadian"):
        jam = (r.get("jam_kejadian") or "").replace(":", ".")
        p.append(tgl_id(r["tgl_kejadian"]) + (f" pukul {jam} {r.get('zona') or 'WIB'}" if jam else ""))
    lok = []
    if r.get("prov"):
        lok.append("Prov. " + r["prov"][0])
    lok += list(r.get("kabkota") or [])[:1]
    lok += ["Kec. " + x for x in (r.get("kecamatan") or [])[:1]]
    lok += ["Desa " + x for x in (r.get("desa") or [])[:1]]
    if k % 2:
        p.append("\n".join(lok))
    else:
        p.append(", ".join(reversed(lok)))
    if r.get("dampak_teks"):
        p.append(r["dampak_teks"])
    for lab, f in (("Kronologi", "kronologi"), ("Upaya", "upaya"), ("Kendala", "kendala"), ("Kebutuhan", "kebutuhan")):
        if r.get(f):
            p.append(f"{lab}:\n{r[f]}")
    if r.get("sumber_instansi"):
        p.append("Sumber: " + r["sumber_instansi"][0])
    return lb.bersih("\n".join(x for x in p if x))


def target_dari(r: dict) -> dict:
    mulai = r.get("tgl_kejadian")
    if mulai and r.get("jam_kejadian"):
        mulai += "T" + r["jam_kejadian"]
    return {
        "jenis": r["jenis"] if r["jenis"] != "lainnya" else None,
        "prov": (r.get("prov") or [None])[0], "kab": (r.get("kabkota") or [None])[0],
        "kec": (r.get("kecamatan") or [None])[0], "desa": (r.get("desa") or [None])[0],
        "mulai": mulai,
        "md": r["md"], "hilang": r["hilang"], "luka": r["luka"],
        "mengungsi_jiwa": r["mengungsi"], "mengungsi_kk": r["kk"],
        "rumah_rb": r["rumah_rb"], "rumah_rs": r["rumah_rs"], "rumah_rr": r["rumah_rr"],
        "rumah_terendam": r["rumah_terendam"], "luas_ha": r["ha"],
        "kendala": ul.kode(r.get("kendala"), ul.KENDALA), "kebutuhan": ul.kode(r.get("kebutuhan"), ul.KEBUTUHAN),
        "catatan": "\n".join(x for x in (r.get("kronologi"), r.get("upaya"), r.get("kondisi")) if x),
        "sumber_instansi": (r.get("sumber_instansi") or [None])[0],
    }


def bangun():
    os.makedirs(KELUAR, exist_ok=True)
    n = collections.Counter()
    f = {s: open(os.path.join(KELUAR, s + ".jsonl"), "w", encoding="utf8") for s in ("latih", "uji")}
    for sub in sorted(os.listdir(ARSIP)):
        p = os.path.join(ARSIP, sub, "baris.jsonl")
        if not os.path.isfile(p):
            continue
        for l in open(p, encoding="utf8"):
            r = json.loads(l)
            th = int(r["tgl_logbook"][:4])
            s = "latih" if th <= 2023 else "uji"
            f[s].write(json.dumps({"id": r.get("id_kejadian"), "tahun": th, "masukan": masukan_dari(r), "target": target_dari(r)},
                                  ensure_ascii=False) + "\n")
            n[s, th] += 1
    for x in f.values():
        x.close()
    open(os.path.join(KELUAR, "README.md"), "w", encoding="utf8").write(
        "# Set latih/uji pengurai laporan WA (INTERNAL, jangan commit)\n\n"
        "Dibangun `python3 scripts/wa/uji_urai_laporan.py bangun` dari `data/raw/logbook/arsip/*/baris.jsonl`.\n"
        "- `latih.jsonl`: tahun <= 2023. `uji.jsonl`: 2024-2026.\n"
        "- Baris = `{id, tahun, masukan, target}`. `masukan` dirakit ulang dari medan terurai (sudah disamarkan oleh\n"
        "  `lb.bersih`, tanpa nama/telepon), bukan pesan WA asli. `target` = medan kontrak POST /api/logbook/kejadian.\n"
        "- Target angka/lokasi/waktu dari pengurai arsip (label lemah, bukan pelabelan manusia).\n"
        "  Target kendala/kebutuhan = pemetaan kata kunci yang sama dengan pengurai, jadi F1-nya hanya konsistensi.\n"
        "- Ukur: `python3 scripts/wa/uji_urai_laporan.py eval`.\n")
    for k in sorted(n):
        print(k, n[k])
    print("jumlah:", {s: sum(v for (a, _), v in n.items() if a == s) for s in ("latih", "uji")})


def f1(tp, fp, fn):
    return 2 * tp / (2 * tp + fp + fn) if (2 * tp + fp + fn) else 1.0


def skor(baris):
    """-> {medan: nilai}, daftar kegagalan. baris = iterable {masukan,target,tahun}."""
    ok, tot = collections.Counter(), collections.Counter()
    ok_nn, tot_nn = collections.Counter(), collections.Counter()  # hanya baris yang targetnya terisi
    tp, fp, fn = collections.defaultdict(int), collections.defaultdict(int), collections.defaultdict(int)
    gagal = collections.defaultdict(list)
    yakin = collections.Counter()  # baris tanpa medan wajib kosong
    yakin_benar = collections.Counter()
    n = 0
    for b in baris:
        n += 1
        t = b["target"]
        h = ul.urai(b["masukan"], b.get("tahun"))
        o, kosong = h["isian"], h["kosong"]
        for m in ("jenis", "prov", "kab", "kec", "desa") + tuple(ANGKA):
            a, c = (o[m], t[m])
            if isinstance(a, str):
                a, c = a.lower(), (c or "").lower() or None
            tot[m] += 1
            ok[m] += a == c
            if c is not None:
                tot_nn[m] += 1
                ok_nn[m] += a == c
            if a != c and len(gagal[m]) < 400:
                gagal[m].append((b, o[m], t[m]))
        a, c = (o["mulai"] or "")[:10], (t["mulai"] or "")[:10]
        tot["tgl_mulai"] += 1
        ok["tgl_mulai"] += a == c
        if c:
            tot_nn["tgl_mulai"] += 1
            ok_nn["tgl_mulai"] += a == c
        if a != c and len(gagal["tgl_mulai"]) < 400:
            gagal["tgl_mulai"].append((b, o["mulai"], t["mulai"]))
        for m in ("kendala", "kebutuhan"):
            P, T = set(o[m]), set(t[m])
            tp[m] += len(P & T)
            fp[m] += len(P - T)
            fn[m] += len(T - P)
        if not kosong:
            yakin["n"] += 1
            yakin_benar["n"] += all(
                (o[m] or "").lower() == (t[m] or "").lower() for m in ("jenis", "prov", "kab")) and (o["mulai"] or "")[:10] == (t["mulai"] or "")[:10]
    hasil = {m: (ok[m] / tot[m], (ok_nn[m] / tot_nn[m]) if tot_nn[m] else None, tot_nn[m]) for m in tot}
    for m in ("kendala", "kebutuhan"):
        hasil[m + " F1"] = (f1(tp[m], fp[m], fn[m]), None, tp[m] + fn[m])
    return n, hasil, gagal, (yakin["n"], yakin_benar["n"])


def samar(s):
    return re.sub(r"\b\d{6,}\b", "[no]", (s or "").replace("\n", " ⏎ "))[:160]


def evaluasi():
    p = os.path.join(KELUAR, "uji.jsonl")
    if not os.path.isfile(p):
        sys.exit("jalankan `bangun` dulu")
    n, h, gagal, (ny, nyb) = skor(json.loads(l) for l in open(p, encoding="utf8"))
    print(f"set uji: {n} baris")
    print(f"{'medan':18} {'akurasi semua':>14} {'akurasi bila target ada':>24} {'n target ada':>13}")
    for m, (a, b_, nn) in h.items():
        print(f"{m:18} {a:14.3f} {'' if b_ is None else format(b_, '.3f'):>24} {nn:13d}")
    print(f"baris tanpa medan wajib kosong: {ny} ({ny / n:.1%}); di antaranya jenis+prov+kab+tanggal benar semua: {nyb / ny:.1%}" if ny else "")
    for m in ("kab", "tgl_mulai", "luka"):
        for b, o, t in gagal[m][::max(1, len(gagal[m]) // 3)][:3]:
            print(f"\n[gagal {m}] hasil={o!r} target={t!r}\n  masukan: {samar(b['masukan'])}")


# ---- self-check: fixture sintetis, tanpa data asli
FIX = """Banjir
Kamis, 05 Februari 2026 pukul 07.30 WIB
Prov. Jawa Tengah
Kab. Demak
Kec. Sayung
Desa Bedono
Korban Jiwa:
2 jiwa MD, 3 jiwa hilang
1.200 KK / 4.000 jiwa mengungsi
Kerugian Materil:
15 unit rumah RB
40 unit rumah RR
250 unit rumah terendam
Kronologi:
Hujan lebat sejak malam, tanggul jebol.
Kendala:
Akses jalan terputus dan sinyal lemah, listrik padam.
Kebutuhan:
Tenda, makanan, perahu karet dan obat-obatan.
Sumber: BPBD Kab. Demak"""
FIX2 = "Karhutla\nSelasa, 14 Agustus 2024 pukul 13.10 WITA\nDesa Sebangau, Kec. Kahayan, Kab. Pulang Pisau, Prov. Kalimantan Tengah\nLuas terbakar ±12,5 ha\nKendala: lahan gambut dan air sulit"


def hasil(teks, tahun=2025):
    return ul.urai(teks, tahun)


def uji_panduan():
    """Kasus dari contoh Lapjol h5 dan ambang h2; kode dari Logbook h2."""
    sp = ul.PANDUAN
    assert [j["kode"] for j in sp["jenis"]] == ["101", "102", "103", "104", "105", "106", "107", "108", "109", "201", "202", "203", "301"]
    assert all(j["hal"] and (j["menonjol"] is None or j["menonjol"]["hal"]) for j in sp["jenis"])
    # Lapjol h5 contoh 1: banjir bandang Bantaeng, 1.295 KK + MD/hilang -> menonjol, kode 101, Tanggap Darurat
    a = hasil("Banjir Bandang\nSenin, 07 Juli 2025 pukul 10.00 WITA\nKab. Bantaeng\nProv. Sulawesi Selatan\n"
              "2 (dua) orang MD, 3 orang hilang, 5 orang LB, ±1.295 KK terdampak, 1 unit rumah RB\nTanggap Darurat TMT 7/07/2025 s.d. 20/07/2025")
    assert a["resmi"]["kode_dibi"] == "101" and a["resmi"]["jenis_bencana"] == "Banjir" and a["resmi"]["nama_kejadian"] == "Banjir bandang", a["resmi"]
    assert a["resmi"]["status_darurat"] == {"tingkat": "Tanggap Darurat", "perpanjangan": False}, a["resmi"]
    assert a["menonjol"]["ya"] and any("Lapjol h2 G.2.a" in x for x in a["menonjol"]["alasan"]) and a["masuk_laphar"]["ya"], a
    # contoh 3: karhutla Nias Utara, 10 ha -> menonjol; ambang 2 ha
    b = hasil("Karhutla\nSelasa, 01 Juli 2025 pukul 12.00 WIB\nKab. Nias Utara\nProv. Sumatera Utara\nLuas terbakar ±10 ha\nTanggap Darurat TMT 1/07/2025")
    assert b["resmi"]["kode_dibi"] == "106" and b["menonjol"]["ya"], b
    assert not hasil("Karhutla\nSelasa, 01 Juli 2025 pukul 12.00 WIB\nKab. Nias Utara\nProv. Sumatera Utara\nLuas terbakar 1,5 ha")["menonjol"]["ya"]
    # contoh 2: kekeringan Kendal, 200 KK -> menonjol (ambang 200 KK); perpanjangan terbaca
    c = hasil("Kekeringan\nSenin, 06 Juli 2025\nKab. Kendal\nProv. Jawa Tengah\n±200 KK terdampak\nPerpanjangan kesatu siaga darurat TMT 6/7/2025")
    assert c["resmi"]["kode_dibi"] == "105" and c["menonjol"]["ya"], c
    assert c["resmi"]["status_darurat"] == {"tingkat": "Siaga Darurat", "perpanjangan": True}, c["resmi"]
    # ambang bawah: banjir 40 KK tanpa korban tidak menonjol; dengan 1 hilang menonjol (G.2.a baris 2)
    base = "Banjir\nSenin, 07 Juli 2025\nKab. Bogor\nProv. Jawa Barat\n40 KK terdampak\n"
    assert not hasil(base)["menonjol"]["ya"] and hasil(base + "1 orang hilang")["menonjol"]["ya"]
    # kekeringan: hilang saja bukan kriteria (hanya MD)
    assert not hasil("Kekeringan\nSenin, 07 Juli 2025\nKab. Kendal\nProv. Jawa Tengah\n1 orang hilang")["menonjol"]["ya"]
    # longsor: 10 rumah rusak menonjol walau tanpa korban; gempa dengan dampak menonjol; kebakaran permukiman tidak punya kriteria
    d = hasil("Tanah Longsor\nSenin, 07 Juli 2025\nKab. Bogor\nProv. Jawa Barat\n5 unit rumah RB, 5 unit rumah RR")
    assert d["resmi"]["kode_dibi"] == "102" and d["menonjol"]["ya"], d
    assert hasil("Gempa Bumi\nSenin, 07 Juli 2025\nKab. Bogor\nProv. Jawa Barat\n2 unit rumah RR")["menonjol"]["ya"]
    e = hasil("Kebakaran Pemukiman\nSenin, 07 Juli 2025\nKab. Bogor\nProv. Jawa Barat\n3 orang MD")
    assert e["resmi"]["kode_dibi"] == "202" and not e["menonjol"]["ya"] and e["masuk_laphar"]["ya"], e
    # Laphar h2 G.2: 5 rumah rusak masuk laphar; tanpa dampak tidak
    assert hasil("Angin Kencang\nSenin, 07 Juli 2025\nKab. Bogor\nProv. Jawa Barat\n5 unit rumah RR")["masuk_laphar"]["ya"]
    g = hasil("Angin Puting Beliung\nSenin, 07 Juli 2025\nKab. Bogor\nProv. Jawa Barat\n2 unit rumah RR")
    assert g["resmi"]["kode_dibi"] == "104" and not g["masuk_laphar"]["ya"] and not g["menonjol"]["ya"], g
    assert hasil("Gelombang Pasang\nSenin, 07 Juli 2025\nKab. Bogor\nProv. Jawa Barat\n12 KK terdampak")["resmi"]["kode_dibi"] == "103"
    assert hasil("Hujan Es\nSenin, 07 Juli 2025\nKab. Bogor\nProv. Jawa Barat")["resmi"]["kode_dibi"] == "104"
    assert hasil("Wabah penyakit\nSenin, 07 Juli 2025\nKab. Bogor\nProv. Jawa Barat")["resmi"]["kode_dibi"] == "201"
    # privasi: keluaran tidak membawa nama/telepon pelapor
    p = json.dumps(hasil("Banjir\nSenin, 07 Juli 2025\nKab. Bogor\nProv. Jawa Barat\nPelapor: Budi Santoso 081234567890\n60 KK terdampak"), ensure_ascii=False)
    assert "Budi" not in p and "0812345" not in p, p


def uji():
    h = ul.urai(FIX, 2026)
    i = h["isian"]
    assert h["kosong"] == [], h
    assert (i["jenis"], i["prov"], i["kab"], i["kec"], i["desa"]) == ("banjir", "Jawa Tengah", "Kab. Demak", "Sayung", "Bedono"), i
    assert i["mulai"] == "2026-02-05T07:30", i
    assert (i["md"], i["hilang"], i["mengungsi_kk"], i["rumah_rb"], i["rumah_rr"], i["rumah_terendam"]) == (2, 3, 1200, 15, 40, 250), i
    assert set(i["kendala"]) == {"akses", "sinyal", "listrik"}, i["kendala"]
    assert set(i["kebutuhan"]) == {"tenda", "makanan", "perahu", "obat"}, i["kebutuhan"]
    assert i["sumber_instansi"] == "BPBD Kab. Demak"
    j = ul.urai(FIX2, 2024)["isian"]
    assert (j["jenis"], j["prov"], j["kab"], j["desa"], j["luas_ha"], j["mulai"]) == (
        "karhutla", "Kalimantan Tengah", "Kab. Pulang Pisau", "Sebangau", 12.5, "2024-08-14T13:10"), j
    assert set(j["kendala"]) == {"gambut", "air"}, j["kendala"]
    # perakit masukan <-> target tak saling bertentangan pada baris sintetis
    r = {"no": 1, "tgl_logbook": "2026-02-06", "jenis": "banjir", "jenis_teks": "Banjir", "tgl_kejadian": "2026-02-05",
         "jam_kejadian": "07:30", "zona": "WIB", "prov": ["Jawa Tengah"], "kabkota": ["Kab. Demak"], "kecamatan": ["Sayung"],
         "desa": ["Bedono"], "md": 2, "hilang": None, "luka": None, "mengungsi": None, "kk": None, "rumah": None, "ha": None,
         "rumah_rb": None, "rumah_rs": None, "rumah_rr": None, "rumah_terendam": None,
         "dampak_teks": "Korban Jiwa:\n2 jiwa MD", "kronologi": "Hujan lebat", "upaya": "", "kondisi": "",
         "kendala": "akses jalan terputus", "kebutuhan": "tenda", "sumber_instansi": ["BPBD Kab. Demak"]}
    n, hs, _, _ = skor([{"masukan": masukan_dari(r), "target": target_dari(r), "tahun": 2026}])
    assert n == 1 and hs["jenis"][0] == 1 and hs["kab"][0] == 1 and hs["md"][0] == 1 and hs["tgl_mulai"][0] == 1, hs
    uji_panduan()
    print("uji urai_laporan: OK")


if __name__ == "__main__":
    {"uji": uji, "bangun": bangun, "eval": evaluasi}[sys.argv[1] if len(sys.argv) > 1 else "uji"]()
