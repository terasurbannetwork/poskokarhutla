"""REN-3 Kalender monev dan tenggat pelaporan (DESAIN-TEKNIS sec 5.12; tiket RU-049).

Langkah jalan.py (bulanan). Masukan satu: Jam Aturan (MB-2, public/inti/jam_aturan.json lewat aturan.py). Angka tenggat
hanya dari berkas itu; hitung tanggal hanya lewat aturan.tenggat() (hari kerja, pangkas akhir bulan, WIB).

Dua jenis kewajiban:
  berulang   siklus sejak kegiatan terakhir (evaluasi EWS 4 bulan, Destana 1 tahun, ...). Tanggal kegiatan terakhir
             belum ada di sistem kita, jadi tenggat berikut = None (menunggu data), bukan tanggal karangan.
             kali_12 = kali minimal dalam 12 bulan menurut siklusnya.
  peristiwa  dipicu peristiwa (TLHP 60 hari sejak LHP diterima): tampil sebagai aturan, bukan tanggal.
Kolom contoh menunjukkan hitungan aturan.tenggat() bila pemicunya hari ini, berlabel contoh.

  python3 -I scripts/bnpb/unit/ren3.py --cek
"""
import json
import os
import re
import sys
from datetime import date, datetime, timedelta, timezone

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))  # -I tidak menaruh folder skrip
import aturan as jam  # noqa: E402
import rapor  # noqa: E402

# kunci Jam Aturan -> (kewajiban, unit pemilik, jenis). Unit dari sistem pemakai kunci (DT 4.2 kolom Dipakai) dan tusi
# dokumen acuannya; None bila tidak tertulis di dokumen Ruang Unit.
KEWAJIBAN = {
    "ews_evaluasi": ("Evaluasi sistem peringatan dini", "Dit. Peringatan Dini", "berulang"),
    "ews_rapat_platform": ("Rapat platform peringatan dini", "Dit. Peringatan Dini", "berulang"),
    "destana_evaluasi": ("Evaluasi Desa dan Kelurahan Tangguh Bencana", "Dit. Kesiapsiagaan", "berulang"),
    "rpbd_monev": ("Pemantauan dan evaluasi RPBD", "Dit. PSPB", "berulang"),
    "klaster_logistik_mutakhir": ("Laporan Klaster Logistik", "Dit. OJL", "berulang"),
    "hibah_rr_lapor": ("Laporan pelaksanaan hibah RR", "Lintas Deputi RR", "berulang"),
    "tlhp": ("Tindak lanjut hasil pemeriksaan", "Inspektorat", "peristiwa"),
    "laporan_pelatihan": ("Laporan penyelenggaraan pelatihan", "Pusdiklat PB", "peristiwa"),
    "pengaduan_berkadar": ("Penyelesaian pengaduan berkadar pengawasan", None, "peristiwa"),
    "pengaduan_tak_berkadar": ("Penyelesaian pengaduan tidak berkadar pengawasan", None, "peristiwa"),
}
SATUAN = {"hari": "hari", "hari_kerja": "hari kerja", "bulan": "bulan", "tahun": "tahun", "hari_kalender": "hari"}
BLN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"]


def tgl(iso):
    t = date.fromisoformat(iso[:10])
    return f"{t.day} {BLN[t.month - 1]} {t.year}"


def kali_12(e):
    """Kali minimal dalam 12 bulan dari siklus berulang; None bila satuan bukan bulan/tahun."""
    if e["satuan"] == "bulan":
        return 12 // e["nilai"]
    if e["satuan"] == "tahun":
        return 1 if e["nilai"] == 1 else None
    return None


def bangun(hari):
    rows = []
    for kunci, (nama, unit, jenis) in KEWAJIBAN.items():
        e = jam.aturan(kunci)
        if e["jenis"] != "tenggat" or e.get("asumsi") or not e.get("acuan"):
            raise ValueError(f"{kunci}: harus tenggat berpasal (jenis {e['jenis']}, asumsi {e.get('asumsi')})")
        t = jam.tenggat(kunci, hari.isoformat())
        if t["hasil"] is None:
            raise ValueError(f"{kunci}: tenggat() gagal: {t['alasan']}")
        rows.append({"kunci": kunci, "kewajiban": nama, "unit": unit, "jenis": jenis, "nilai": e["nilai"], "satuan": e["satuan"],
                     "sejak": e["sejak"], "acuan": e["acuan"], "letak": e.get("letak"), "kali_12": kali_12(e) if jenis == "berulang" else None,
                     "tenggat_berikut": None, "contoh_mulai": hari.isoformat(), "contoh_tenggat": t["hasil"][:10], "contoh_asumsi": t["asumsi"]})
    berulang = [r for r in rows if r["jenis"] == "berulang"]
    asumsi = ["Asumsi: hari kerja tanpa libur nasional"] if any(r["contoh_asumsi"] for r in rows) else []

    def siklus(r):
        n = f"{r['nilai']} {SATUAN.get(r['satuan'], r['satuan'])}"
        return f"tiap {n}" if r["jenis"] == "berulang" else f"{n} sejak {r['sejak']}"

    k1 = rapor.kartu(
        id="ren3-kalender", sistem="REN-3", pil="Kalender monev", ikon="kalender", judul="Tenggat pelaporan berulang",
        angka=[{"k": "kewajiban", "label": "Kewajiban lapor berpasal", "nilai": len(rows)},
               {"k": "berulang", "label": "Berulang, menunggu tanggal kegiatan terakhir", "nilai": len(berulang),
                "title": "tenggat berikut dihitung begitu tanggal kegiatan terakhir tercatat"},
               {"k": "peristiwa", "label": "Dipicu peristiwa, tampil sebagai aturan", "nilai": len(rows) - len(berulang)}],
        kolom=[{"k": "kewajiban", "label": "Kewajiban"},
               {"k": "unit", "label": "Unit pemilik", "title": "unit sistem pemakai kunci Jam Aturan (DESAIN-TEKNIS 4.2)"},
               {"k": "siklus", "label": "Aturan", "title": "nilai dan pemicu dari Jam Aturan"},
               {"k": "kali", "label": "Dalam 12 bulan", "title": "kali minimal menurut siklus; kewajiban berpemicu mengikuti peristiwanya"},
               {"k": "berikut", "label": "Tenggat berikut"},
               {"k": "contoh", "label": "Contoh hitung", "title": "tenggat bila pemicunya terjadi hari ini, dihitung aturan.tenggat()"},
               {"k": "pasal", "label": "Pasal", "tautan": "pasal_url"}],
        baris=[{"kewajiban": r["kewajiban"], "unit": r["unit"] or "belum tertulis", "siklus": siklus(r),
                "kali": f"{r['kali_12']} kali" if r["kali_12"] else "sesuai peristiwa",
                "berikut": "menunggu tanggal kegiatan terakhir" if r["jenis"] == "berulang" else "dihitung saat peristiwa tercatat",
                "contoh": f"mulai {tgl(r['contoh_mulai'])}: {tgl(r['contoh_tenggat'])}",
                "pasal": ", ".join(x for x in (r["acuan"], r["letak"]) if x), "pasal_url": "/bnpb/hukum#d=" + r["acuan"]} for r in rows],
        rumus="tenggat = aturan.tenggat(kunci, tanggal pemicu): N hari, N hari kerja (Senin sampai Jumat), N bulan dipangkas ke akhir bulan, WIB",
        sumber=["jam_aturan"], label=["resmi", "hitungan_kita"], aturan=list(KEWAJIBAN), asumsi=asumsi)
    sumber = [{"nama": "Jam Aturan Ruang Unit (pasal dari katalog JDIH BNPB)", "url": "repo:public/inti/jam_aturan.json",
               "diambil": hari.isoformat(), "lisensi": "dokumen publik JDIH BNPB"}]
    b = rapor.berkas([k1], sumber)
    b["data"] = {"kewajiban": rows, "hari": hari.isoformat()}
    return b


def _hari_wib():
    return (datetime.now(timezone.utc) + timedelta(hours=7)).date()


def jalan():
    return {"kalender_monev": bangun(_hari_wib())}


def cek():
    b = bangun(date(2026, 11, 6))   # Jumat
    r = {x["kunci"]: x for x in b["data"]["kewajiban"]}
    # RU sec 2.1: 7 hari kerja dari Jumat 6 Nov 2026 = Selasa 17 Nov 2026, berlabel asumsi tanpa libur nasional
    assert r["laporan_pelatihan"]["contoh_tenggat"] == "2026-11-17" and r["laporan_pelatihan"]["contoh_asumsi"] is True, r["laporan_pelatihan"]
    assert r["pengaduan_tak_berkadar"]["contoh_tenggat"] == "2026-11-27", r["pengaduan_tak_berkadar"]   # 15 hari kerja
    assert b["kartu"][0]["asumsi"] == ["Asumsi: hari kerja tanpa libur nasional"]
    # TLHP berpemicu peristiwa: aturan, bukan tanggal
    assert r["tlhp"]["jenis"] == "peristiwa" and r["tlhp"]["tenggat_berikut"] is None and r["tlhp"]["kali_12"] is None
    baris = {x["kewajiban"]: x for x in b["kartu"][0]["baris"]}
    assert baris["Tindak lanjut hasil pemeriksaan"]["siklus"] == "60 hari sejak laporan hasil pemeriksaan diterima", baris
    assert baris["Tindak lanjut hasil pemeriksaan"]["berikut"] == "dihitung saat peristiwa tercatat"
    # berulang: tanpa tanggal kegiatan terakhir tidak ada tanggal karangan; kali dari siklus
    assert all(x["tenggat_berikut"] is None for x in b["data"]["kewajiban"])
    assert r["ews_evaluasi"]["kali_12"] == 3 and r["klaster_logistik_mutakhir"]["kali_12"] == 4 and r["rpbd_monev"]["kali_12"] == 1
    assert r["ews_evaluasi"]["contoh_tenggat"] == "2027-03-06" and jam.tenggat("ews_evaluasi", "2026-07-01")["hasil"] == "2026-11-01"
    assert r["hibah_rr_lapor"]["contoh_tenggat"] == "2027-02-06"
    # tiap tenggat berpasal dan bertaut
    assert all(x["pasal_url"].startswith("/bnpb/hukum#d=") for x in b["kartu"][0]["baris"])
    assert [p["kunci"] for p in b["kartu"][0]["aturan"]] == list(KEWAJIBAN)
    # kunci asumsi atau bukan tenggat ditolak
    asli = dict(KEWAJIBAN)
    for k in ("masa_status_kab", "std_beras_kg"):
        KEWAJIBAN.clear()
        KEWAJIBAN[k] = ("x", None, "berulang")
        try:
            bangun(date(2026, 11, 6))
            raise AssertionError(f"{k} tidak ditolak")
        except ValueError:
            pass
        finally:
            KEWAJIBAN.clear()
            KEWAJIBAN.update(asli)
    rapor.periksa_berkas({"dibuat": "2026-11-26T00:00:00Z", "basi_jam": 1080, **b})
    s = json.dumps(b, ensure_ascii=False)
    assert "·" not in s and not re.search(r"\baman\b", s, re.I)
    print(f"ren3.py --cek: lulus ({len(r)} kewajiban, {sum(x['jenis'] == 'berulang' for x in r.values())} berulang menunggu tanggal kegiatan terakhir)")


if __name__ == "__main__":
    if "--cek" in sys.argv:
        cek()
    else:
        print(__doc__)
