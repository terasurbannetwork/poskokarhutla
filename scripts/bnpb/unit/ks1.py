"""KS-1 Pemantau dokumen kesiapsiagaan daerah: renkon, RPKB, rencana aksi (DESAIN-TEKNIS sec 6.8; tiket RU-074).

Langkah jalan.py (mingguan, mengikuti MB-3). Masukan: jdih_daerah.jalan() (cache MB-3) jenis renkon, rpkb, rencana_aksi;
public/data/status_darurat.json (SK status darurat, untuk RPKB perlu mutakhir); public/data/bnpb/risiko_hvc.json (bahaya utama kab).
Status renkon per (daerah, bahaya), tenggat dari Jam Aturan (Perban 2/2023 Pasal 21), urutan didahulukan:
  kedaluwarsa   hari ini >= tenggat(renkon_berlaku, tgl_tetap)              (3 tahun)
  segera_habis  sisa <= renkon_segera_hari (90 hari, asumsi internal)
  perlu_reviu   hari ini > tenggat(renkon_reviu, tgl_tetap) (6 bulan; reviu tidak terlihat di JDIH)
  berlaku       selain itu
Tanggal penetapan tidak terbaca (hanya tahun): status dinilai hanya bila pasti untuk semua tanggal di tahun itu; selain itu
tanggal_tidak_terbaca. RPKB perlu_mutakhir bila sesudah penetapan ada SK status darurat di daerah itu. Rencana aksi tanpa
aturan masa di Jam Aturan: ditemukan. Semua hitungan = batas bawah: renkon lewat SK tidak terbit di JDIH.
Usulan koreksi ke unit_ketuk berkas usulan_dokumen_siaga (gabung menunggu RU-034). Tautan "Salin ke Meja Kerja" membuka
isian meja renkon terisi (/bnpb/meja#salin=, public/bnpb/meja.js).

  python3 -I scripts/bnpb/unit/ks1.py --cek
"""
import json
import os
import re
import sys
import urllib.parse
from datetime import date, datetime, timedelta, timezone

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))  # -I tidak menaruh folder skrip
import aturan as jam  # noqa: E402
import jdih_daerah as J  # noqa: E402
import pspb1  # noqa: E402
import rapor  # noqa: E402

AKAR = rapor.AKAR
LABEL_BAWAH = "batas bawah: renkon yang ditetapkan lewat SK tidak terbit di JDIH"
BAHAYA = [("banjir bandang", "banjir"), ("banjir", "banjir"), ("tanah longsor", "longsor"), ("longsor", "longsor"), ("tsunami", "tsunami"),
          ("gempa", "gempa"), ("erupsi", "gunungapi"), ("gunung", "gunungapi"), ("kebakaran hutan", "karhutla"), ("karhutla", "karhutla"),
          ("kekeringan", "kekeringan"), ("cuaca ekstrem", "cuaca_ekstrem"), ("cuaca ekstrim", "cuaca_ekstrem"), ("angin", "cuaca_ekstrem"),
          ("rob", "rob")]   # nilai = BENCANA meja renkon (src/meja_spek.js)
NAMA_ST = {"kedaluwarsa": "kedaluwarsa", "segera_habis": "segera habis", "perlu_reviu": "perlu reviu", "berlaku": "berlaku",
           "tanggal_tidak_terbaca": "tanggal penetapan tidak terbaca", "perlu_mutakhir": "perlu mutakhir", "ditemukan": "ditemukan"}
JENIS = {"renkon": "Renkon", "rpkb": "RPKB", "rencana_aksi": "Rencana aksi"}


def bahaya(judul):
    j = (judul or "").lower()
    return next((b for kata, b in BAHAYA if re.search(r"\b" + kata + r"\b", j)), None)


def _sampai(kunci, mulai):
    r = jam.tenggat(kunci, mulai)
    return date.fromisoformat(r["hasil"]) if r["hasil"] else None


def status_renkon(tgl_tetap, tahun, hari):
    """hari = date. -> (status, berlaku_sampai ISO | None)."""
    segera = jam.nilai("renkon_segera_hari")

    def satu(t):
        habis, reviu = _sampai("renkon_berlaku", t), _sampai("renkon_reviu", t)
        if hari >= habis:
            return "kedaluwarsa"
        if (habis - hari).days <= segera:
            return "segera_habis"
        return "perlu_reviu" if hari > reviu else "berlaku"
    if tgl_tetap:
        return satu(tgl_tetap), _sampai("renkon_berlaku", tgl_tetap).isoformat()
    if not tahun:
        return "tanggal_tidak_terbaca", None
    a, b = satu(f"{tahun}-01-01"), satu(f"{tahun}-12-31")   # status pasti hanya bila awal dan akhir tahun sepakat
    return (a if a == b else "tanggal_tidak_terbaca"), None


def sk_sesudah(sk, kode, sejak):
    """Jumlah SK status darurat di daerah kode (prov 2 digit atau kab 4 digit) yang mulai sesudah tanggal sejak (ISO)."""
    n = 0
    for s in sk:
        k = (s.get("kab_kode") or "").replace(".", "") if s.get("skala") == "kabupaten" else (s.get("prov_kode") or "")
        if k == kode and (s.get("mulai") or "") > sejak:
            n += 1
    return n


def salin(d, b):
    """Jalur /bnpb/meja#salin=<JSON> berisi kolom meja renkon (bencana, judul, tgl_sah, tautan)."""
    isi = {"bencana": b or "lainnya", "judul": d["judul"][:150], **({"tgl_sah": d["tgl_tetap"]} if d.get("tgl_tetap") else {}),
           **({"tautan": d["url"]} if d.get("url") else {})}
    return "/bnpb/meja#salin=" + urllib.parse.quote(json.dumps(isi, ensure_ascii=False, separators=(",", ":")), safe="").replace("~", "%7E")


def bangun(jdih, sk, hvc, nama, hari):
    situs = {s["kode"]: s["status"] for s in jdih["situs"]}
    baris = []
    dok = [d for d in jdih["dok"] if d["jenis_dok"] in JENIS]
    # renkon: hanya yang terbaru per (daerah, bahaya); yang lama sudah digantikan dan tidak dihitung kedaluwarsa
    baru = {}
    for d in dok:
        if d["jenis_dok"] == "renkon":
            k = (d["kode"], bahaya(d["judul"]))
            if k not in baru or (d["tgl_tetap"] or f"{d['tahun'] or 0}-12-31", d["url"]) > (baru[k]["tgl_tetap"] or f"{baru[k]['tahun'] or 0}-12-31", baru[k]["url"]):
                baru[k] = d
    lama = sum(1 for d in dok if d["jenis_dok"] == "renkon") - len(baru)
    dok = [d for d in dok if d["jenis_dok"] != "renkon"] + list(baru.values())
    for d in sorted(dok, key=lambda d: (d["kode"], d["jenis_dok"], d["url"])):
        b = bahaya(d["judul"])
        sejak = d["tgl_tetap"] or (f"{d['tahun']}-12-31" if d["tahun"] else None)
        if d["jenis_dok"] == "renkon":
            st, sampai = status_renkon(d["tgl_tetap"], d["tahun"], hari)
        elif d["jenis_dok"] == "rpkb":
            n = sk_sesudah(sk, d["kode"], sejak) if sejak else 0
            st, sampai = ("perlu_mutakhir" if n else "ditemukan"), None
        else:
            st, sampai = "ditemukan", None
        baris.append({"kode": d["kode"], "nama": nama.get(d["kode"], d["kode"]), "jenis": d["jenis_dok"], "bahaya": b,
                      "bahaya_utama": ((hvc.get(d["kode"]) or {}).get("utama")), "status": st, "tgl_tetap": d["tgl_tetap"], "tahun": d["tahun"],
                      "berlaku_sampai": sampai, "judul": d["judul"], "url": d["url"], "salin": salin(d, b) if d["jenis_dok"] == "renkon" else None})
    n = lambda j, st=None: sum(1 for r in baris if r["jenis"] == j and (st is None or r["status"] in st))  # noqa: E731
    daerah_berlaku = len({r["kode"] for r in baris if r["jenis"] == "renkon" and r["status"] in ("berlaku", "perlu_reviu", "segera_habis")})
    k1 = rapor.kartu(
        id="ks1-dokumen", sistem="KS-1", pil="Dokumen siaga", ikon="resmi", judul="Renkon, RPKB, dan rencana aksi menurut JDIH",
        angka=[{"k": "renkon_daerah", "label": "Daerah punya renkon berlaku menurut JDIH, batas bawah", "nilai": daerah_berlaku, "title": LABEL_BAWAH},
               {"k": "renkon", "label": "Renkon terbaru per daerah dan bahaya", "nilai": n("renkon"), "title": f"{lama} renkon lebih lama untuk daerah dan bahaya yang sama tidak dihitung"},
               {"k": "kedaluwarsa", "label": "Renkon kedaluwarsa", "nilai": n("renkon", ("kedaluwarsa",))},
               {"k": "reviu", "label": "Renkon perlu reviu", "nilai": n("renkon", ("perlu_reviu",)), "title": "lebih dari 6 bulan sejak penetapan; reviu tidak terlihat di JDIH"},
               {"k": "rpkb", "label": "RPKB perlu mutakhir", "nilai": n("rpkb", ("perlu_mutakhir",)), "title": "ada SK status darurat sesudah penetapan"},
               {"k": "situs", "label": f"Situs JDIH provinsi terbaca, dari {len(situs)}", "nilai": sum(s == "terbaca" for s in situs.values())}],
        kolom=[{"k": "daerah", "label": "Daerah"}, {"k": "jenis", "label": "Dokumen"}, {"k": "bahaya", "label": "Bahaya", "title": "dari judul; kosong = tidak tertulis di judul"},
               {"k": "utama", "label": "Bahaya utama kab", "title": "risiko_hvc.json utama (indeks belum lulus uji balik), pembanding cakupan"},
               {"k": "status", "label": "Status", "title": "Perban 2/2023 Pasal 21: berlaku 3 tahun, reviu 6 bulan; segera habis 90 hari (asumsi internal)"},
               {"k": "sampai", "label": "Berlaku sampai"}, {"k": "judul", "label": "Judul JDIH"},
               {"k": "aksi", "label": "Meja Kerja", "tautan": "salin", "title": "membuka isian meja renkon terisi; disimpan hanya bila petugas menekan Simpan"}],
        baris=[{"daerah": r["nama"], "jenis": JENIS[r["jenis"]], "bahaya": r["bahaya"], "utama": r["bahaya_utama"], "status": NAMA_ST[r["status"]],
                "sampai": r["berlaku_sampai"], "judul": r["judul"], "aksi": "Salin ke Meja Kerja" if r["salin"] else None,
                **({"salin": r["salin"]} if r["salin"] else {})} for r in baris],
        rumus=None, sumber=["jdih_daerah", "status_darurat", "risiko_hvc"], label=["sekunder"],
        aturan=["renkon_berlaku", "renkon_reviu", "renkon_segera_hari"], unduh="dokumen_siaga.csv")
    src = [{"nama": "JDIH provinsi (jdih_daerah.py, MB-3)", "url": "repo:scripts/bnpb/unit/jdih_situs.json", "diambil": hari.isoformat(), "lisensi": "metadata peraturan daerah, informasi publik"},
           {"nama": "SK status darurat (status_darurat.json)", "url": "repo:public/data/status_darurat.json", "diambil": hari.isoformat(), "lisensi": "data BNPB, agregat"}]
    b = rapor.berkas([k1], src)
    b["data"] = {"label": LABEL_BAWAH, "hari": hari.isoformat(), "dokumen": baris, "renkon_lama_tidak_dihitung": lama, "koreksi": "menunggu RU-034 (terima.py gabung dari unit_ketuk)"}
    us = {"berkas": "dokumen_siaga", "baris": [{"id": pspb1.usulan_id(r["jenis"], r["url"], r["kode"]),
                                                 "sumber": {"jenis": "jdih", "nama": r["judul"][:200], "url": r["url"]}, "label": "sekunder",
                                                 "isi": {"kode": r["kode"], "jenis": r["jenis"], "bahaya": r["bahaya"], "status": r["status"], "tgl_tetap": r["tgl_tetap"]},
                                                 "keyakinan": "pola_longgar", "keputusan": "menunggu"} for r in baris]}
    return b, us


def _json(p):
    with open(p, encoding="utf-8") as f:
        return json.load(f)


def jalan(jaringan=True):
    nama = {k: n for k, n, _ in pspb1.pemda()}
    hari = (datetime.now(timezone.utc) + timedelta(hours=7)).date()
    b, us = bangun(pspb1.jdih(jaringan), _json(os.path.join(AKAR, "public", "data", "status_darurat.json"))["sk"],
                   _json(os.path.join(AKAR, "public", "data", "bnpb", "risiko_hvc.json"))["kab"], nama, hari)
    return {"dokumen_siaga": b, "usulan_dokumen_siaga": us}


def cek():
    h = date(2026, 11, 26)
    # Perban 2/2023 Pasal 21: 3 tahun, reviu 6 bulan; segera habis 90 hari
    assert status_renkon("2023-11-20", 2023, h) == ("kedaluwarsa", "2026-11-20")
    assert status_renkon("2024-01-10", 2024, h)[0] == "segera_habis"       # habis 2027-01-10, sisa 45 hari
    assert status_renkon("2025-01-10", 2025, h)[0] == "perlu_reviu"        # > 6 bulan, sisa > 90 hari
    assert status_renkon("2026-08-01", 2026, h)[0] == "berlaku"            # reviu jatuh 2027-02-01
    assert status_renkon(None, 2022, h)[0] == "kedaluwarsa"                # 2022 akhir tahun + 3 = 2025-12-31 < hari ini: pasti
    assert status_renkon(None, 2024, h)[0] == "tanggal_tidak_terbaca"      # 2024-01-01 segera habis, 2024-12-31 perlu reviu
    assert status_renkon(None, None, h) == ("tanggal_tidak_terbaca", None)
    assert bahaya("Rencana Kontinjensi Banjir Bandang Kabupaten X") == "banjir" and bahaya("Renkon Erupsi Gunung Semeru") == "gunungapi"
    assert bahaya("Rencana Kontinjensi Kabupaten X") is None
    sk = [{"skala": "kabupaten", "kab_kode": "33.01", "prov_kode": "33", "mulai": "2025-02-01"},
          {"skala": "provinsi", "kab_kode": "", "prov_kode": "33", "mulai": "2024-01-01"}]
    assert sk_sesudah(sk, "3301", "2024-06-01") == 1 and sk_sesudah(sk, "33", "2024-06-01") == 0 and sk_sesudah(sk, "3301", "2025-03-01") == 0
    dok = lambda kode, jenis, judul, tgl=None, tahun=2024: {"kode": kode, "jenis_dok": jenis, "judul": judul, "nomor": "1", "tahun": tahun,  # noqa: E731
                                                             "tgl_tetap": tgl, "periode": None, "periode_diduga": False, "berlaku_sampai": None, "perubahan": False,
                                                             "url": f"https://jdih.contoh/{kode}/{jenis}"}
    jdih = {"situs": [{"kode": "33", "status": "terbaca"}],
            "dok": [dok("3301", "renkon", "Rencana Kontinjensi Banjir Kabupaten Cilacap", "2025-01-10"),
                    dict(dok("3301", "renkon", "Rencana Kontinjensi Banjir Kab. Cilacap", "2021-03-01", 2021), url="https://jdih.contoh/3301/lama"),
                    dok("3301", "rpkb", "Rencana Penanggulangan Kedaruratan Bencana Banjir", "2024-06-01"),
                    dok("33", "rpkb", "RPKB Provinsi", "2024-06-01"), dok("3302", "rencana_aksi", "Rencana Aksi PRB"),
                    dok("3302", "rpbd", "RPBD 2024-2028")]}
    b, us = bangun(jdih, sk, {"3301": {"utama": "banjir"}}, {"3301": "Kab. Cilacap", "33": "Jawa Tengah", "3302": "Kab. Banyumas"}, h)
    st = {(r["kode"], r["jenis"]): r["status"] for r in b["data"]["dokumen"]}
    assert st == {("3301", "renkon"): "perlu_reviu", ("3301", "rpkb"): "perlu_mutakhir", ("33", "rpkb"): "ditemukan", ("3302", "rencana_aksi"): "ditemukan"}, st
    k = b["kartu"][0]
    a = {x["k"]: x for x in k["angka"]}
    assert a["renkon_daerah"]["nilai"] == 1 and "batas bawah" in a["renkon_daerah"]["label"] and a["rpkb"]["nilai"] == 1
    assert all("batas bawah" in x["label"] for x in k["angka"] if x["k"] == "renkon_daerah"), "angka berlabel selain batas bawah"
    r0 = next(r for r in k["baris"] if r.get("salin"))
    isi = json.loads(urllib.parse.unquote(r0["salin"].split("#salin=", 1)[1]))
    assert isi == {"bencana": "banjir", "judul": "Rencana Kontinjensi Banjir Kabupaten Cilacap", "tgl_sah": "2025-01-10", "tautan": "https://jdih.contoh/3301/renkon"}, isi
    assert rapor.JALUR.fullmatch(r0["salin"]), r0["salin"]
    assert [p["kunci"] for p in k["aturan"]] == ["renkon_berlaku", "renkon_reviu", "renkon_segera_hari"]
    assert len(us["baris"]) == 4 and len({x["id"] for x in us["baris"]}) == 4
    assert b["data"]["renkon_lama_tidak_dihitung"] == 1 and a["kedaluwarsa"]["nilai"] == 0, "renkon lama yang sudah diganti dihitung kedaluwarsa"
    assert a["situs"]["label"].endswith("dari 1"), a["situs"]
    rapor.periksa_berkas({"dibuat": "2026-11-26T00:00:00Z", "basi_jam": 240, **b})
    nyata = jalan(jaringan=False)
    rapor.periksa_berkas({"dibuat": "2026-11-26T00:00:00Z", "basi_jam": 240, **nyata["dokumen_siaga"]})
    s = json.dumps(nyata, ensure_ascii=False)
    assert "·" not in s and not re.search(r"\baman\b", s, re.I)
    a = {x["k"]: x["nilai"] for x in nyata["dokumen_siaga"]["kartu"][0]["angka"]}
    print(f"ks1.py --cek: lulus ({a['renkon']} renkon ditemukan, {a['renkon_daerah']} daerah renkon berlaku (batas bawah), "
          f"{a['kedaluwarsa']} kedaluwarsa, {a['rpkb']} RPKB perlu mutakhir; {a['situs']} situs terbaca)")


if __name__ == "__main__":
    if "--cek" in sys.argv:
        cek()
    else:
        print(__doc__)
