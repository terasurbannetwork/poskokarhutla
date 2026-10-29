"""Rapor belajar: satu buku yang menghitung seberapa banyak tiap model sudah dinilai terhadap kejadian nyata.
-> public/data/rapor_belajar.json

Pemilik 29 Okt 2026: "setiap data yang ditarik semakin membuat sistemnya belajar". Tiap model ramalan di repo ini sudah
mencatat ramalannya lalu menilainya sendiri esok hari (prospektif). Rapor ini cuma MEMBACA hasil penilaian itu, tidak
menyetel ambang apa pun: kriteria banjir dan sebaran dikunci hash (PRAREG-PROSPEKTIF.md, prospektif.py KRITERIA_SHA256),
jadi ambang yang diubah otomatis justru membuat penilaiannya menolak jalan. Belajarnya lewat jalur jujur:
  dicatat -> dinilai -> vonis; model berstatus "siap_kalibrasi" (vonis gagal dengan n cukup) diusulkan
  untuk pra-registrasi ulang oleh pengerja pemiliknya, lalu validasi-model.
Status per model: macet (berkas basi > MAKS_BASI hari atau hilang), menunggu (belum ada yang dinilai), belajar (dinilai,
vonis belum final), lolos, siap_kalibrasi. `riwayat` menyimpan satu potret per tanggal WIB supaya kurva "makin banyak
dinilai" kelihatan dan macet yang diam-diam ketahuan.

Pakai:  python3 scripts/umum/rapor_belajar.py [--akar DIR]
        python3 scripts/umum/rapor_belajar.py uji
"""
import argparse, datetime as dt, json, os, sys, tempfile

AKAR = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".."))
KELUAR = "public/data/rapor_belajar.json"
MAKS_BASI = 2        # hari; penilai di bawah jalan harian
BASI_KHUSUS = {"kekeringan": 35, "banjir_logbook": 8, "longsor_logbook": 8}   # SEAS5 bulanan; uji logbook ERA5 mingguan (kuota)
N_KALIBRASI = 30     # vonis gagal di bawah n ini = belum cukup bukti untuk merancang ulang
RIWAYAT_MAKS = 400
WIB = dt.timezone(dt.timedelta(hours=7))


def _n(x):
    return x if isinstance(x, (int, float)) else 0


def _vonis(v):
    if isinstance(v, dict):   # vonis_akhir sebaran: {"nilai": "gagal", "tanggal", "n", ...}
        v = v.get("nilai", v.get("lulus"))
    if v is None:
        return None
    if isinstance(v, bool):
        return "lolos" if v else "gagal"
    s = str(v).lower()
    if "lolos" in s or "lulus" in s:
        return "gagal" if ("tidak" in s or "gagal" in s) else "lolos"
    if "gagal" in s:
        return "gagal"
    return None   # "belum cukup data" dan sejenisnya


def _banjir_logbook(d):
    """Uji 2026 status.py vs label logbook Pusdalops (hari aktif, >= Waspada, kab berlabel); kriteria tertulis di berkasnya."""
    w = ((((d.get("label") or {}).get("lb_aktif") or {}).get("hanya_kab_berlabel") or {}).get("waspada") or {})
    n, ci = w.get("n") or {}, (w.get("ci") or {}).get("ets")
    batas = (d.get("kriteria") or {}).get("ets_lulus_batas_bawah_ci")
    vonis = None if not ci or batas is None else ("lolos" if ci[0] > batas else "gagal")
    return (d.get("dibuat"), None, _n(n.get("a")) + _n(n.get("c")), vonis, w.get("ets"), "ETS Waspada")


def _longsor_logbook(d):
    r = (d.get("riwayat") or [{}])[-1]
    return (d.get("dibuat"), None, _n(r.get("n_label")), _vonis(d.get("vonis")), r.get("auc_kab"), "AUC kab")


# id, nama, berkas, pemilik, fungsi(d) -> (diperbarui, dicatat, dinilai, vonis_final, skor, nama_skor)
MODEL = [
    ("sebaran", "Api akan membesar (72 jam)", "public/data/prospektif.json", "model-sebaran",
     lambda d: (d.get("diperbarui"), None, _n((d.get("metrik_vonis") or {}).get("n_dinilai")),
                _vonis(d.get("vonis_akhir")), (d.get("metrik_vonis") or {}).get("auc"), "AUC")),
    ("banjir", "Banjir dan longsor per kab (0-3 hari)", "public/banjir/data/prospektif_skor.json", "banjir",
     lambda d: (d.get("diperbarui"), d.get("n_terbit"), _n(((d.get("tunda") or {}).get("0") or {}).get("n_hari")),
                _vonis(d.get("vonis_akhir")), None, None)),
    ("abu", "Arah abu gunung api", "public/banjir/data/prospektif_abu.json", "gunungapi-kering",
     lambda d: (d.get("diperbarui"), d.get("dicatat"), _n((d.get("ringkasan") or {}).get("n")),
                None, (d.get("ringkasan") or {}).get("persen"), "% cocok VONA")),
    ("cuaca", "Hujan ekstrem per provinsi", "public/banjir/data/cuaca_verifikasi.json", "cuaca-udara",
     lambda d: (d.get("dibuat"), None,
                sum(_n(v.get("n")) for v in (((d.get("kita") or {}).get("prospektif") or {}).get("lead") or {}).values()),
                None, ((((d.get("kita") or {}).get("prospektif") or {}).get("lead") or {}).get("1") or {}).get("csi"), "CSI hari+1")),
    ("risiko", "Indeks risiko kecamatan BNPB", "public/banjir/data/risiko_ujibalik.json", "ruang-bnpb",
     lambda d: (d.get("dibuat"), len(d.get("arsip") or []),
                sum(_n(k.get("potret_layak")) for k in (((d.get("prospektif") or {}).get("kelompok")) or {}).values()),
                None, None, None)),
    ("kekeringan", "Kekeringan SEAS5 (1-3 bulan)", "public/data/kekeringan_prospektif.json", "gunungapi-kering",
     lambda d: (max(d.get("terbit") or {"": 0}) or None, len(d.get("terbit") or {}), len(d.get("hasil") or {}),
                None, None, None)),
    ("susulan", "Gempa susulan", "public/gempa/data/prospektif_susulan.json", "gempa",
     lambda d: (d.get("diperbarui"), d.get("dicatat"), _n(d.get("dinilai")),
                None, ((d.get("metrik") or {}).get("m5") or {}).get("brier"), "Brier M5")),
    # label logbook Laporan Harian Pusdalops BNPB (scripts/umum/logbook_bnpb.py): label bertambah tiap hari, penilaian ulang
    ("banjir_logbook", "Banjir 2026 vs logbook Pusdalops", "public/data/validasi_logbook_banjir.json", "banjir", _banjir_logbook),
    ("longsor_logbook", "Longsor 2026 vs logbook Pusdalops", "public/data/validasi_logbook_longsor.json", "longsor", _longsor_logbook),
    ("karhutla_logbook", "Titik panas vs karhutla logbook Pusdalops", "public/data/validasi_logbook_karhutla.json", "pipa-data",
     lambda d: (d.get("dibuat"), d.get("jumlah_kejadian_karhutla_logbook"), _n(d.get("jumlah_kejadian_dipakai")), None,
                *(((d.get("riwayat") or [{}])[-1].get("ketat_lift_B"), "lift deteksi +-1 hari vs kab acak")
                  if (d.get("riwayat") or [{}])[-1].get("ketat_lift_B") else ((d.get("deteksi") or {}).get("laju"), "laju deteksi")))),
]


def _umur(diperbarui, hari):
    try:
        return (hari - dt.date.fromisoformat(str(diperbarui)[:10])).days
    except ValueError:
        return None


def nilai(akar, hari):
    hasil = []
    for mid, nama, berkas, pemilik, ambil in MODEL:
        r = {"id": mid, "nama": nama, "berkas": berkas, "pemilik": pemilik}
        f = os.path.join(akar, berkas)
        try:
            with open(f, encoding="utf-8") as fh:
                diperbarui, dicatat, dinilai, vonis, skor, nama_skor = ambil(json.load(fh))
        except (OSError, ValueError, AttributeError, TypeError) as e:
            r.update(status="macet", catatan="tidak terbaca: %s" % type(e).__name__)
            hasil.append(r)
            continue
        umur = _umur(diperbarui, hari)
        r.update(diperbarui=diperbarui, umur_hari=umur, dicatat=dicatat, dinilai=dinilai, vonis=vonis)
        if skor is not None:
            r.update(skor=skor, nama_skor=nama_skor)
        if umur is None or umur > BASI_KHUSUS.get(mid, MAKS_BASI):
            r["status"] = "macet"
        elif vonis == "lolos":
            r["status"] = "lolos"
        elif vonis == "gagal":
            r["status"] = "siap_kalibrasi" if dinilai >= N_KALIBRASI else "belajar"
        else:
            r["status"] = "belajar" if dinilai > 0 else "menunggu"
        hasil.append(r)
    return hasil


def tulis(akar, hari):
    model = nilai(akar, hari)
    f = os.path.join(akar, KELUAR)
    try:
        with open(f, encoding="utf-8") as fh:
            riwayat = json.load(fh).get("riwayat") or []
    except (OSError, ValueError):
        riwayat = []
    tgl = hari.isoformat()
    riwayat = [p for p in riwayat if p.get("tanggal") != tgl]
    riwayat.append({"tanggal": tgl, "model": {m["id"]: [m.get("dinilai"), m["status"]] for m in model}})
    riwayat = riwayat[-RIWAYAT_MAKS:]
    keluar = {
        "dibuat": dt.datetime.now(WIB).strftime("%Y-%m-%dT%H:%M+07:00"),
        "arti": "dinilai = ramalan yang sudah dicocokkan dengan kejadian nyata; macet = berkas penilai basi > %d hari; "
                "siap_kalibrasi = vonis gagal dengan dinilai >= %d, usulkan pra-registrasi ulang" % (MAKS_BASI, N_KALIBRASI),
        "ringkas": {s: sum(1 for m in model if m["status"] == s)
                    for s in ("macet", "menunggu", "belajar", "lolos", "siap_kalibrasi")},
        "model": model,
        "riwayat": riwayat,
    }
    os.makedirs(os.path.dirname(f), exist_ok=True)
    tmp = f + ".tmp"
    with open(tmp, "w", encoding="utf-8") as fh:
        json.dump(keluar, fh, ensure_ascii=False, indent=1)
    os.replace(tmp, f)
    return keluar


def uji():
    hari = dt.date(2026, 10, 29)
    with tempfile.TemporaryDirectory() as d:
        def taruh(berkas, isi):
            p = os.path.join(d, berkas)
            os.makedirs(os.path.dirname(p), exist_ok=True)
            with open(p, "w") as fh:
                json.dump(isi, fh)
        taruh("public/data/prospektif.json",
              {"diperbarui": "2026-10-29T05:00", "vonis_akhir": {"nilai": "gagal", "n": 40}, "metrik_vonis": {"n_dinilai": 40, "auc": 0.6}})
        taruh("public/banjir/data/prospektif_skor.json",
              {"diperbarui": "2026-10-20", "n_terbit": 9, "tunda": {"0": {"n_hari": 5}}, "vonis_akhir": None})
        taruh("public/banjir/data/prospektif_abu.json",
              {"diperbarui": "2026-10-29T02:59Z", "dicatat": 270, "ringkasan": {"n": 5, "persen": 80}})
        taruh("public/gempa/data/prospektif_susulan.json", {"diperbarui": "2026-10-28T02:05Z", "dicatat": 4, "dinilai": 0})
        taruh("public/banjir/data/risiko_ujibalik.json",
              {"dibuat": "2026-10-29T00:54+07:00", "vonis": {"lulus": True}, "arsip": [1, 2],
               "prospektif": {"kelompok": {"a": {"potret_layak": 3}}}})
        taruh("public/data/kekeringan_prospektif.json", {"terbit": {"2026-09-18": {}}, "hasil": {}})
        k = tulis(d, hari)
        st = {m["id"]: m["status"] for m in k["model"]}
        assert st == {"sebaran": "siap_kalibrasi", "banjir": "macet", "abu": "belajar", "cuaca": "macet",
                      "risiko": "belajar", "kekeringan": "macet", "susulan": "menunggu",
                      "banjir_logbook": "macet", "longsor_logbook": "macet", "karhutla_logbook": "macet"}, st
        # logbook: vonis dari kriteria berkasnya sendiri (batas bawah CI ETS), basi mingguan masih segar
        taruh("public/data/validasi_logbook_banjir.json", {"dibuat": "2026-10-24T23:11+07:00", "kriteria": {"ets_lulus_batas_bawah_ci": 0.1},
              "label": {"lb_aktif": {"hanya_kab_berlabel": {"waspada": {"ets": 0.085, "ci": {"ets": [0.063, 0.108]}, "n": {"a": 459, "c": 381}}}}}})
        taruh("public/data/validasi_logbook_karhutla.json", {"dibuat": "2026-10-29", "jumlah_kejadian_dipakai": 625, "deteksi": {"laju": 0.944}})
        m = {x["id"]: x for x in tulis(d, hari)["model"]}
        assert m["banjir_logbook"]["status"] == "siap_kalibrasi" and m["banjir_logbook"]["dinilai"] == 840, m["banjir_logbook"]
        assert m["karhutla_logbook"]["status"] == "belajar" and m["karhutla_logbook"]["skor"] == 0.944, m["karhutla_logbook"]
        # vonis retrospektif risiko ("lulus": True) bukan vonis prospektif: tidak boleh jadi "lolos"
        assert st["risiko"] != "lolos"
        assert next(m for m in k["model"] if m["id"] == "cuaca")["catatan"].startswith("tidak terbaca")
        # gagal dengan n kecil = masih belajar, bukan alasan merancang ulang
        taruh("public/data/prospektif.json",
              {"diperbarui": "2026-10-29", "vonis_akhir": "gagal", "metrik_vonis": {"n_dinilai": 3}})
        k = tulis(d, hari)
        assert k["model"][0]["status"] == "belajar", k["model"][0]
        assert len(k["riwayat"]) == 1, "jalan dua kali sehari harus menimpa potret tanggal yang sama"
        k = tulis(d, hari + dt.timedelta(days=1))
        assert [p["tanggal"] for p in k["riwayat"]] == ["2026-10-29", "2026-10-30"], k["riwayat"]
        assert k["ringkas"]["macet"] >= 3
    print("uji rapor_belajar: lolos")


if __name__ == "__main__":
    if sys.argv[1:2] == ["uji"]:
        uji()
        sys.exit(0)
    ap = argparse.ArgumentParser()
    ap.add_argument("--akar", default=AKAR)
    a = ap.parse_args()
    k = tulis(a.akar, dt.datetime.now(WIB).date())
    for m in k["model"]:
        print("%-11s %-15s dinilai=%s umur=%s" % (m["id"], m["status"], m.get("dinilai"), m.get("umur_hari")))
