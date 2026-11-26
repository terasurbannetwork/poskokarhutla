"""KPOD-1 Rapor intervensi status darurat, IKU Program 3 dihitung dari data (DESAIN-TEKNIS sec 6.13; ALGORITMA sec 7.3; tiket RU-077).

Langkah jalan.py (harian). Masukan (berkas repo, tanpa jaringan): public/data/status_darurat.json (SK), public/data/laphar_riwayat.json
(episode dengan medan `pendampingan` {isi, kelas} dari laphar_arsip.py), public/data/bnpb/dit_wilayah.json, tests/bnpb/fixtures/pendampingan_50.json.
Per SK kabupaten s (mulai t0) di dalam cakupan laporan harian:
  terpantau   = ada episode laporan harian di kab yang sama (cocok menurut nama dalam provinsi) dengan |mulai episode - t0| paling lama 3 hari
  didampingi  = terpantau dan ada episode berpasangan yang medan pendampingannya terisi (bukan kosong, bukan kata tolak)
  IKU         = SK didampingi / SK, per bulan, per direktorat wilayah, per jenis; berdampingan dengan angka resmi LAKIP, tidak menggantikannya
Gerbang tampil (kartu IKU disembunyikan, diganti syarat yang belum terpenuhi):
  1 medan pendampingan harus sudah ada di arsip; kosong tidak dihitung nol
  2 presisi dan recall kata kunci pendampingan paling sedikit 0,8 pada 50 entri berlabel tangan (fungsi yang sama dengan laphar_arsip.py)
  3 SK yang berpasangan dengan episode paling sedikit 80 persen, kalau tidak "penjodohan wilayah belum cukup"
Ambang 0,8 dan jarak 3 hari adalah asumsi. Ketepatan waktu intervensi (3 hari) butuh tanggal intervensi pertama dari meja DSP (D1): belum ada data.

  python3 -I scripts/bnpb/unit/kpod1.py --cek
"""
import importlib.util
import json
import os
import re
import sys
from datetime import date, datetime, timedelta, timezone

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))  # -I tidak menaruh folder skrip
import rapor  # noqa: E402
import wil1  # noqa: E402

AKAR = rapor.AKAR
FIXTURE = os.path.join(AKAR, "tests", "bnpb", "fixtures", "pendampingan_50.json")
LAPHAR_ARSIP = os.path.join(AKAR, "scripts", "umum", "laphar_arsip.py")
JARAK_HARI = 3
MIN_TERPANTAU = 0.8
MIN_PRESISI = 0.8
MIN_RECALL = 0.8
KELAS = ("dsp", "logistik", "personel", "udara")
JENIS_SK = [("karhutla", r"kebakaran|karhutla|asap"), ("banjir", r"banjir"), ("longsor", r"longsor|gerakan tanah"), ("kekeringan", r"kekeringan"),
            ("cuaca", r"cuaca|angin|puting|gelombang"), ("gempa", r"gempa|tsunami"), ("gunung api", r"gunung|erupsi")]
NAMA_JENIS = {"karhutla": "Kebakaran hutan dan lahan", "banjir": "Banjir", "longsor": "Tanah longsor", "kekeringan": "Kekeringan",
              "cuaca": "Cuaca ekstrem", "gempa": "Gempa bumi dan tsunami", "gunung api": "Gunung api", "lainnya": "Jenis lain"}
LAKIP = {"nilai": 100, "tahun": 2025, "sumber": "data/kajian-bnpb/pustaka/5-lakip.md, Bab 3 hal. 44"}


def _muat_klasifikasi():
    s = importlib.util.spec_from_file_location("laphar_arsip_kpod1", LAPHAR_ARSIP)
    m = importlib.util.module_from_spec(s)
    s.loader.exec_module(m)
    return m.pendampingan


def ukur(klasifikasi, entri):
    """Presisi dan recall `didampingi` serta presisi dan recall kelas (jumlah mikro) atas entri berlabel tangan."""
    tp = fp = fn = 0
    ktp = kfp = kfn = 0
    for e in entri:
        isi, kelas = klasifikasi(e["teks"])
        tp += bool(isi) and e["didampingi"]
        fp += bool(isi) and not e["didampingi"]
        fn += not isi and e["didampingi"]
        a, b = set(kelas), set(e["kelas"])
        ktp, kfp, kfn = ktp + len(a & b), kfp + len(a - b), kfn + len(b - a)
    r = lambda x, y: x / y if y else None  # noqa: E731
    return {"n": len(entri), "presisi": r(tp, tp + fp), "recall": r(tp, tp + fn), "presisi_kelas": r(ktp, ktp + kfp), "recall_kelas": r(ktp, ktp + kfn),
            "tp": tp, "fp": fp, "fn": fn}


def jenis_sk(teks):
    t = (teks or "").lower()
    return next((k for k, p in JENIS_SK if re.search(p, t)), "lainnya")


def pasangkan(sk, episode, hari=JARAK_HARI):
    """SK kabupaten -> episode berpasangan: kab sama (nama dalam provinsi), selisih mulai paling lama `hari`. Satu daftar episode per SK."""
    per = {}
    for e in episode:
        if e.get("kab") and e.get("mulai"):
            p, n = e["kab"].split("|", 1)
            per.setdefault((p, wil1.kunci_nama(n)), []).append(e)
    t0 = date.fromisoformat(sk["mulai"][:10])
    return [e for e in per.get((sk.get("prov_kode"), wil1.kunci_nama(sk.get("kab"))), []) if abs((date.fromisoformat(e["mulai"][:10]) - t0).days) <= hari]


def hitung(sk_json, laphar, dit, hari_pasang=JARAK_HARI):
    """-> dict hitungan; fungsi murni (tanpa gerbang tampil)."""
    c = laphar.get("cakupan") or {}
    awal, akhir = c.get("mulai"), c.get("sampai")
    eps = laphar.get("episode") or []
    ada_medan = [e for e in eps if "pendampingan" in e]
    pdit = wil1.peta_dit(dit)
    daftar, luar, prov_skala = [], 0, 0
    for x in sk_json.get("sk") or []:
        if x.get("skala") != "kabupaten":
            prov_skala += 1
            continue
        m = (x.get("mulai") or "")[:10]
        if not (awal and akhir and awal <= m <= akhir):
            luar += 1
            continue
        pas = pasangkan(x, eps, hari_pasang)
        didampingi = None if not ada_medan else bool(pas) and any((e.get("pendampingan") or {}).get("isi") is True for e in pas)
        daftar.append({"bulan": m[:7], "dit": pdit.get(x.get("prov_kode")), "jenis": jenis_sk(x.get("jenis")), "terpantau": bool(pas), "didampingi": didampingi})
    n = len(daftar)
    return {"sk": n, "luar_cakupan": luar, "skala_provinsi": prov_skala, "terpantau": sum(d["terpantau"] for d in daftar),
            "didampingi": None if not ada_medan or not n else sum(bool(d["didampingi"]) for d in daftar), "ada_medan": bool(ada_medan),
            "n_episode": len(eps), "n_episode_medan": len(ada_medan), "baris": daftar}


def _grup(baris, kunci):
    out = {}
    for d in baris:
        g = out.setdefault(d[kunci], {"sk": 0, "terpantau": 0, "didampingi": 0})
        g["sk"] += 1
        g["terpantau"] += d["terpantau"]
        g["didampingi"] += bool(d["didampingi"])
    return out


def _persen(a, b):
    return round(100 * a / b, 1) if b else None


def bangun(sk_json, laphar, dit, ukuran, dibuat, hari_ini):
    h = hitung(sk_json, laphar, dit)
    n = h["sk"]
    terpantau_p = h["terpantau"] / n if n else None
    lulus_kata = ukuran["presisi"] is not None and ukuran["recall"] is not None and ukuran["presisi"] >= MIN_PRESISI and ukuran["recall"] >= MIN_RECALL
    lulus_pasang = terpantau_p is not None and terpantau_p >= MIN_TERPANTAU
    tampil = h["ada_medan"] and lulus_kata and lulus_pasang and n > 0
    iku = _persen(h["didampingi"], n) if tampil else None
    syarat = [
        {"syarat": "Medan pendampingan di arsip laporan harian", "nilai": (h["n_episode_medan"] / h["n_episode"]) if h["n_episode"] and h["ada_medan"] else None, "ambang": None,
         "status": "ada" if h["ada_medan"] else "belum ada data: arsip laporan harian belum menyimpan medan pendampingan BNPB"},
        {"syarat": "Presisi kata kunci pendampingan pada 50 entri berlabel tangan", "nilai": ukuran["presisi"], "ambang": MIN_PRESISI,
         "status": "lulus" if ukuran["presisi"] is not None and ukuran["presisi"] >= MIN_PRESISI else "belum lulus, kartu capaian tidak tampil"},
        {"syarat": "Recall kata kunci pendampingan pada 50 entri berlabel tangan", "nilai": ukuran["recall"], "ambang": MIN_RECALL,
         "status": "lulus" if ukuran["recall"] is not None and ukuran["recall"] >= MIN_RECALL else "belum lulus, kartu capaian tidak tampil"},
        {"syarat": "Surat keputusan kabupaten yang berpasangan dengan episode laporan harian", "nilai": terpantau_p, "ambang": MIN_TERPANTAU,
         "status": "lulus" if lulus_pasang else ("penjodohan wilayah belum cukup" if n else "belum ada data: tidak ada surat keputusan di cakupan laporan harian")}]
    k1 = rapor.kartu(
        id="kpod1-iku", sistem="KPOD-1", pil="Intervensi status", ikon="hitung", judul="Intervensi pada status darurat",
        angka=[{"k": "sk", "label": "Surat keputusan kabupaten di cakupan laporan harian", "nilai": n if n else None, "title": f"surat keputusan kabupaten yang mulainya {laphar.get('cakupan', {}).get('mulai')} sampai {laphar.get('cakupan', {}).get('sampai')}; surat keputusan di luar rentang dan tingkat provinsi tidak dihitung"},
               {"k": "terpantau", "label": "Surat keputusan yang berpasangan dengan episode laporan harian", "nilai": h["terpantau"] if n else None,
                "title": f"episode di kab yang sama dengan selisih mulai paling lama {JARAK_HARI} hari"},
               {"k": "iku", "label": "Indikator Kinerja Utama dari data, persen yang didampingi", "nilai": iku, "desimal": 1,
                "title": "surat keputusan didampingi dibagi seluruh surat keputusan; hanya tampil bila semua syarat di tabel terpenuhi"}],
        kolom=[{"k": "syarat", "label": "Syarat tampil"}, {"k": "nilai", "label": "Nilai", "angka": True, "desimal": 2}, {"k": "ambang", "label": "Ambang", "angka": True, "desimal": 2},
               {"k": "status", "label": "Status"}],
        baris=syarat, rumus="Indikator Kinerja Utama = surat keputusan didampingi dibagi seluruh surat keputusan; didampingi = ada episode laporan harian berpasangan yang medan pendampingannya terisi",
        sumber=["status_darurat", "laphar_riwayat", "pendampingan_50"], label=["hitungan_kita"],
        asumsi=["Asumsi: ambang 0,8 dan jarak 3 hari"])
    kartu = [k1]
    if tampil:
        def tabel(id_, judul, kunci, urut, namai):
            g = _grup(h["baris"], kunci)
            baris = [{"grup": namai(k), "sk": v["sk"], "terpantau": v["terpantau"], "didampingi": v["didampingi"], "iku": _persen(v["didampingi"], v["sk"])} for k, v in
                     sorted(g.items(), key=urut)]
            return rapor.kartu(id=id_, sistem="KPOD-1", pil="Intervensi status", ikon="data", judul=judul, angka=[],
                               kolom=[{"k": "grup", "label": "Kelompok"}, {"k": "sk", "label": "Surat keputusan", "angka": True}, {"k": "terpantau", "label": "Berpasangan", "angka": True},
                                      {"k": "didampingi", "label": "Didampingi", "angka": True}, {"k": "iku", "label": "Capaian, persen", "angka": True, "desimal": 1}],
                               baris=baris, rumus="capaian = surat keputusan didampingi dibagi seluruh surat keputusan dalam kelompok", sumber=["status_darurat", "laphar_riwayat"], label=["hitungan_kita"],
                               asumsi=["Asumsi: ambang 0,8 dan jarak 3 hari"])
        nama_dit = {d["id"]: d["direktorat"].replace("Direktorat Penanganan Darurat ", "") for d in dit["direktorat"]}
        kartu += [tabel("kpod1-bulan", "Capaian per bulan", "bulan", lambda kv: kv[0], lambda k: k),
                  tabel("kpod1-direktorat", "Capaian per direktorat wilayah", "dit", lambda kv: str(kv[0]), lambda k: nama_dit.get(k, "Tanpa direktorat")),
                  tabel("kpod1-jenis", "Capaian per jenis bencana", "jenis", lambda kv: kv[0], lambda k: NAMA_JENIS[k])]
    kartu.append(rapor.kartu(
        id="kpod1-lakip", sistem="KPOD-1", pil="Angka resmi", ikon="resmi", judul="Angka resmi laporan kinerja sebagai pembanding",
        angka=[{"k": "lakip", "label": f"Capaian Indikator Kinerja Utama Program 3 menurut laporan kinerja {LAKIP['tahun']}, persen", "nilai": LAKIP["nilai"],
                "title": "dilaporkan tanpa rincian cara hitung yang terbuka; ditampilkan berdampingan, tidak menggantikan hitungan dari data"}],
        kolom=[], baris=[], rumus=None, sumber=["lakip_2025"], label=["resmi"]))
    src = [{"nama": "Daftar surat keputusan status keadaan darurat", "url": "repo:public/data/status_darurat.json", "diambil": hari_ini.isoformat(), "lisensi": "data.bnpb.go.id, Pusdalops BNPB"},
           {"nama": "Laporan harian terurai", "url": "repo:public/data/laphar_riwayat.json", "diambil": hari_ini.isoformat(), "lisensi": "arsip Laporan Harian BNPB"},
           {"nama": "Label tangan 50 entri pendampingan", "url": "repo:tests/bnpb/fixtures/pendampingan_50.json", "diambil": hari_ini.isoformat(), "lisensi": "hitungan Centurisk97"},
           {"nama": "Laporan Akuntabilitas Kinerja Instansi Pemerintah BNPB 2025", "url": "repo:data/kajian-bnpb/pustaka/5-lakip.md", "diambil": "2026-11-02", "lisensi": "dokumen publik BNPB"}]
    b = rapor.berkas(kartu, src)
    b["data"] = {"hari": hari_ini.isoformat(), "dibuat": dibuat, "sk": n, "terpantau": h["terpantau"], "didampingi": h["didampingi"], "sk_luar_cakupan": h["luar_cakupan"],
                 "sk_provinsi_tidak_dihitung": h["skala_provinsi"], "terpantau_persen": None if terpantau_p is None else round(100 * terpantau_p, 1), "iku_persen": iku, "tampil": tampil,
                 "ukuran": {k: (round(v, 3) if isinstance(v, float) else v) for k, v in ukuran.items()},
                 "tepat_waktu": "belum ada data: tanggal intervensi pertama ada di meja Dana Siap Pakai, belum dibaca pipeline"}
    return b


def jalan(sekarang=None):
    sek = sekarang or datetime.now(timezone.utc)
    ent = json.load(open(FIXTURE, encoding="utf-8"))["entri"]
    ukuran = ukur(_muat_klasifikasi(), ent)
    s = {k: wil1._json(wil1.BERKAS[k]) for k in ("sk", "laphar", "dit")}
    return {"rapor_darurat": bangun(s["sk"], s["laphar"], s["dit"], ukuran, sek.strftime("%Y-%m-%dT%H:%M:%SZ"), wil1.hari_wib(sek))}


def cek():
    ent = json.load(open(FIXTURE, encoding="utf-8"))["entri"]
    assert len(ent) == 50 and sum(e["didampingi"] for e in ent) == 29 and all(set(e) == {"teks", "didampingi", "kelas", "asal"} for e in ent), "fixture bukan 50 entri berlabel"
    assert all(set(e["kelas"]) <= set(KELAS) and (e["didampingi"] or not e["kelas"]) for e in ent), "label kelas tidak masuk akal"
    # ukur: presisi dan recall dihitung dari label, bukan dari fungsi yang diuji
    sempurna = {e["teks"]: (e["didampingi"], e["kelas"]) for e in ent}
    u = ukur(lambda t: sempurna[t], ent)
    assert u["presisi"] == 1 and u["recall"] == 1 and u["presisi_kelas"] == 1 and u["recall_kelas"] == 1, u
    semua_benar = ukur(lambda t: (True, []), ent)
    assert semua_benar["recall"] == 1 and abs(semua_benar["presisi"] - 29 / 50) < 1e-9, semua_benar
    nyata_u = ukur(_muat_klasifikasi(), ent)
    assert nyata_u["n"] == 50 and nyata_u["presisi"] is not None and nyata_u["recall"] is not None, nyata_u
    # kasus RU 2.7: 10 SK, 7 berpasangan, 5 didampingi -> terpantau 70 persen, IKU 50 persen, tetapi kartu menolak IKU
    dit = {"direktorat": [{"id": "wil1", "direktorat": "Direktorat Penanganan Darurat Wilayah I", "provinsi": [{"kode": "11", "provinsi": "Aceh"}]},
                          {"id": "wil2", "direktorat": "Direktorat Penanganan Darurat Wilayah II", "provinsi": [{"kode": "12", "provinsi": "Sumatera Utara"}]},
                          {"id": "wil3", "direktorat": "Direktorat Penanganan Darurat Wilayah III", "provinsi": [{"kode": "13", "provinsi": "Sumatera Barat"}]}]}
    sk = {"sk": []}
    ep = []
    for i in range(10):
        nama = f"Kab{i}"
        sk["sk"].append({"skala": "kabupaten", "prov_kode": "11", "kab": nama, "status": "Siaga Darurat", "jenis": "Banjir", "mulai": f"2026-03-{10 + i:02d}"})
    for i in range(7):   # 7 berpasangan; indeks 0-4 didampingi
        ep.append({"kab": f"11|Kab{i}", "mulai": f"2026-03-{10 + i:02d}", "jenis": "banjir", "pendampingan": {"isi": i < 5, "kelas": ["personel"] if i < 5 else []}})
    ep.append({"kab": "11|Kab7", "mulai": "2026-03-10", "jenis": "banjir", "pendampingan": {"isi": True, "kelas": []}})   # mulai 3 hari sebelum 2026-03-17 = 7 hari: jarak 7, tidak dipasangkan
    ep.append({"kab": "11|Kab8", "mulai": "2026-03-12", "jenis": "banjir", "pendampingan": {"isi": True, "kelas": []}})   # SK 2026-03-18: jarak 6, tidak dipasangkan
    lap = {"cakupan": {"mulai": "2026-01-01", "sampai": "2026-10-28"}, "episode": ep}
    h = hitung(sk, lap, dit)
    assert (h["sk"], h["terpantau"], h["didampingi"]) == (10, 7, 5), h
    ok = {"n": 50, "presisi": 0.9, "recall": 0.9, "presisi_kelas": 1, "recall_kelas": 1}
    b = bangun(sk, lap, dit, ok, "2026-11-26T00:00:00Z", date(2026, 11, 26))
    assert b["data"]["terpantau_persen"] == 70.0 and b["data"]["tampil"] is False and b["data"]["iku_persen"] is None
    assert b["kartu"][0]["angka"][2]["nilai"] is None and any("penjodohan wilayah belum cukup" in r["status"] for r in b["kartu"][0]["baris"])
    assert [k["id"] for k in b["kartu"]] == ["kpod1-iku", "kpod1-lakip"] and b["kartu"][-1]["angka"][0]["nilai"] == 100 and b["kartu"][-1]["label"] == ["resmi"]
    # episode berjarak 4 hari tidak dipasangkan, 3 hari dipasangkan
    x = {"skala": "kabupaten", "prov_kode": "11", "kab": "Kab0", "mulai": "2026-03-10"}
    assert len(pasangkan(x, [{"kab": "11|Kab0", "mulai": "2026-03-13"}])) == 1 and pasangkan(x, [{"kab": "11|Kab0", "mulai": "2026-03-14"}]) == []
    # penjodohan cukup dan kata kunci lulus: IKU tampil dengan tiga tabel; presisi rendah menyembunyikan lagi
    for i in range(7, 10):
        ep.append({"kab": f"11|Kab{i}", "mulai": f"2026-03-{10 + i:02d}", "jenis": "banjir", "pendampingan": {"isi": False, "kelas": []}})
    b2 = bangun(sk, lap, dit, ok, "2026-11-26T00:00:00Z", date(2026, 11, 26))
    assert b2["data"]["tampil"] and b2["data"]["iku_persen"] == 50.0 and len(b2["kartu"]) == 5, b2["data"]
    assert b2["kartu"][2]["baris"][0]["grup"] == "Wilayah I" and b2["kartu"][3]["baris"][0]["grup"] == "Banjir"
    b3 = bangun(sk, lap, dit, {**ok, "presisi": 0.79}, "2026-11-26T00:00:00Z", date(2026, 11, 26))
    assert not b3["data"]["tampil"] and b3["data"]["iku_persen"] is None and len(b3["kartu"]) == 2
    b4 = bangun(sk, lap, dit, {**ok, "recall": 0.5}, "2026-11-26T00:00:00Z", date(2026, 11, 26))
    assert not b4["data"]["tampil"]
    # medan pendampingan belum ada: tidak dihitung nol
    for e in lap["episode"]:
        e.pop("pendampingan")
    b5 = bangun(sk, lap, dit, ok, "2026-11-26T00:00:00Z", date(2026, 11, 26))
    assert b5["data"]["didampingi"] is None and b5["data"]["iku_persen"] is None and not b5["data"]["tampil"]
    assert b5["kartu"][0]["baris"][0]["nilai"] is None and "belum ada data" in b5["kartu"][0]["baris"][0]["status"]
    # tanpa SK di cakupan: kosong, bukan nol
    b6 = bangun({"sk": []}, lap, dit, ok, "2026-11-26T00:00:00Z", date(2026, 11, 26))
    assert b6["kartu"][0]["angka"][0]["nilai"] is None and b6["data"]["terpantau_persen"] is None
    for bb in (b, b2, b3, b5, b6):
        rapor.periksa_berkas({"dibuat": "2026-11-26T00:00:00Z", "basi_jam": 48, **bb})
    assert jenis_sk("Asap Akibat Kebakaran Hutan Dan Lahan") == "karhutla" and jenis_sk("Banjir Bandang") == "banjir" and jenis_sk("") == "lainnya"
    nyata = jalan(datetime(2026, 11, 26, 3, 0, tzinfo=timezone.utc))["rapor_darurat"]
    rapor.periksa_berkas({"dibuat": "2026-11-26T03:00:00Z", "basi_jam": 48, **nyata})
    s = json.dumps(nyata, ensure_ascii=False)
    assert "·" not in s and not re.search(r"\baman\b", s, re.I)
    d = nyata["data"]
    print(f"kpod1.py --cek: lulus (50 entri: presisi {nyata_u['presisi']:.2f}, recall {nyata_u['recall']:.2f}; data nyata: {d['sk']} SK, "
          f"{d['terpantau_persen']} persen berpasangan, medan pendampingan {'ada' if d['didampingi'] is not None else 'belum ada'}, kartu capaian {'tampil' if d['tampil'] else 'tidak tampil'})")


if __name__ == "__main__":
    if "--cek" in sys.argv:
        cek()
    else:
        print(__doc__)
