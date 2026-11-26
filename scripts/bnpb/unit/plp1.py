"""PLP-1 Neraca stok penyangga 514 kab/kota (DESAIN-TEKNIS sec 5.7; ALGORITMA sec 6.2; tiket RU-042).

Langkah jalan.py (bulanan). Rumus tunggal di neraca.py (stok_penyangga, pr_risiko, neraca); skrip ini hanya merakit
per kab dari terpapar.json, menjalankan uji balik asumsi PR atas dibi_kab_tahun.json, dan membuat kartu lewat rapor.kartu().
Versi S tanpa stok: stok INALOGPAL gudang_sumbar menyusul (RU-036), jadi tiap kab berstatus belum_dilaporkan, celah None.

Uji balik (ALGORITMA sec 6.2, RU sec 2.3) adalah uji asumsi pasal, bukan klaim prediksi; tidak menggerbangi kartu.
  rasio_kt = mengungsi_kt / n_k, DIBI 2015-2025, penduduk 2026 untuk semua tahun (berlabel).
  Dua penyebut berdampingan: kab-tahun "0 bila tidak tercatat DIBI" dan kab-tahun berdata; kab tanpa kode DIBI cocok
  (35 kab, Papua pemekaran) keluar dari keduanya. Penyebut riset/4 (514 kab x 11 tahun) hanya pembanding sidik beku.
  Rasio dipangkas di persentil 99 kab-tahun berdata (inklusif, interpolasi linear ALGORITMA sec 0.6) sebelum rasio_maks per kab.
  Masukan beku: sha256 dibi_kab_tahun.json dicatat; --cek mencocokkan reproduksi riset/4 hanya bila sha sama,
  selain itu mencetak "masukan berubah" (tidak merah diam-diam).

  python3 -I scripts/bnpb/unit/plp1.py --cek
"""
import hashlib
import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))  # -I tidak menaruh folder skrip
import aturan  # noqa: E402
import neraca  # noqa: E402
import rapor  # noqa: E402

AKAR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
DATA = os.path.join(AKAR, "public", "data", "bnpb")
TAHUN = range(2015, 2026)
# reproduksi riset/4 P1 atas masukan beku ini (DT sec 5.7 uji_balik_nasional); data baru -> "masukan berubah"
BEKU = {"sha256": "6c2a50bd5e28ed67d39b5b3bbac2ecd64c1fdd0e65343bb3c92a6d0d2fbd0d1f",
        "kab_tahun": 5654, "lewat_1pct": 209, "lewat_4pct": 85, "p95": 0.0058, "p99": 0.071}
SKENARIO = ("pr1", "pr4", "pr_risiko")
BARANG = ("pangan_orang_hari", "beras_kg", "air_minum_l", "sandang_harfiah", "sandang_keluarga", "balita_orang_hari")


def _muat(nama):
    p = os.path.join(DATA, nama + ".json")
    with open(p, "rb") as f:
        mentah = f.read()
    return json.loads(mentah), hashlib.sha256(mentah).hexdigest()


def _persentil(urut, q):
    """Interpolasi linear atas daftar terurut (statistics.quantiles inclusive), q di [0, 1]."""
    if not urut:
        return None
    i = q * (len(urut) - 1)
    lo = int(i)
    hi = min(lo + 1, len(urut) - 1)
    return urut[lo] + (urut[hi] - urut[lo]) * (i - lo)


def _statistik(rasio):
    urut = sorted(rasio)
    n = len(urut)
    l1, l4 = sum(r > 0.01 for r in urut), sum(r > 0.04 for r in urut)
    return {"kab_tahun": n, "lewat_1pct": l1, "lewat_4pct": l4, "persen_lewat_1pct": 100 * l1 / n if n else None,
            "p95": _persentil(urut, 0.95), "p99": _persentil(urut, 0.99)}


def uji_balik(kab, baris):
    """kab {kode: {n}}; baris DIBI [kab, tahun, jenis, kejadian, mh, luka, terdampak, mengungsi, rb].
    Dua penyebut berdampingan (RU sec 2.3):
      nol_isi  kab-tahun kab yang punya kode DIBI cocok; tahun tanpa baris = 0 (tidak tercatat DIBI)
      berdata  kab-tahun yang punya baris DIBI; p99 penyebut ini memangkas rasio per kab
    Kab tanpa satu pun baris DIBI (kode wilayah tak cocok, mis. Papua pemekaran) keluar dari kedua penyebut, sampai padanan
    kode lama ke baru ada di pembuat dibi_kab_tahun.json. riset4 = 514 kab x 11 tahun, hanya pembanding sidik beku."""
    ungsi, berdata, asing = {}, set(), set()
    for b in baris:
        k, th, meng = b[0], b[1], b[7]
        if th not in TAHUN:
            continue
        if k not in kab:
            asing.add(k)
            continue
        berdata.add((k, th))
        if meng is not None:
            ungsi[(k, th)] = ungsi.get((k, th), 0) + neraca._angka(meng, f"mengungsi {k} {th}")
    dikenal = {k for k, _ in berdata}
    tanpa_kode = sorted(set(kab) - dikenal)
    rasio = {(k, th): ungsi.get((k, th), 0) / kab[k]["n"] for k in kab for th in TAHUN}
    nol_isi = _statistik([v for (k, _), v in rasio.items() if k in dikenal])
    ada = _statistik([rasio[x] for x in berdata])
    p99 = ada["p99"]
    per_kab = {}
    for k in kab:
        isi = [(min(rasio[(k, th)], p99), th) for th in TAHUN if (k, th) in berdata]
        if not isi:
            per_kab[k] = {"rasio_maks": None, "tahun": None, "lewat_1pct": None}
            continue
        r, th = max(isi, key=lambda x: (x[0], -x[1]))
        per_kab[k] = {"rasio_maks": r, "tahun": th, "lewat_1pct": r > 0.01}
    return per_kab, {"nol_isi": nol_isi, "berdata": ada, "riset4": _statistik(list(rasio.values())),
                     "kab_tanpa_kode_dibi": len(tanpa_kode), "kab_tanpa_kode_dibi_daftar": tanpa_kode,
                     "kode_dibi_tak_dikenal": len(asing),
                     "catatan": "nol_isi: tahun tanpa baris DIBI = 0 bila kode kab tercatat DIBI; berdata: hanya kab-tahun berbaris DIBI; "
                                "kab tanpa kode DIBI cocok dikeluarkan; penduduk 2026 untuk semua tahun"}


def hitung(terpapar, dibi):
    kab = terpapar["kab"]
    for k, v in kab.items():
        neraca._angka(v.get("n"), f"jp {k}")
    pr1, pr4 = aturan.nilai("stok_pr_umum"), aturan.nilai("stok_pr_khusus")
    per_kab, nasional = uji_balik(kab, dibi["baris"])
    out = []
    for k in sorted(kab):
        v = kab[k]
        tinggi = [h[2] for h in v["h"].values() if h and h[2] is not None]
        prr = neraca.pr_risiko(max(tinggi), v["n"]) if tinggi else None
        sken = {"pr1": neraca.stok_penyangga(v["n"], pr1, v.get("b")),
                "pr4": neraca.stok_penyangga(v["n"], pr4, v.get("b")),
                "pr_risiko": None if prr is None else {**neraca.stok_penyangga(v["n"], prr["pr"], v.get("b")),
                                                       "mentah": prr["mentah"], "dipangkas": prr["dipangkas"]}}
        stok = neraca.neraca(sken["pr1"]["beras_kg"], None)  # stok belum ada sumber (RU-036)
        out.append({"kode": k, "jp": v["n"], "balita": v.get("b"), "skenario": sken, "stok": None,
                    "status": stok["status"], "celah_beras_kg": stok["celah"], "uji_balik": per_kab[k]})
    return out, nasional


NAMA_SK = {"pr1": "PR 1%", "pr4": "PR 4%", "pr_risiko": "PR menurut risiko"}
ATURAN_SK = {"pr1": ["stok_pr_umum"], "pr4": ["stok_pr_khusus"], "pr_risiko": ["pr_risiko_rentang"]}
STATUS = {"belum_dilaporkan": "stok belum dilaporkan", "kurang": "kurang", "cukup": "cukup"}


def _kartu_skenario(sk, baris, nama):
    kolom = [{"k": "kab", "label": "Kab/kota"},
             {"k": "jp", "label": "Penduduk", "title": "JP, jiwa Dukcapil (terpapar.json n)", "angka": True},
             {"k": "pr", "label": "PR (%)", "title": "Persentase penduduk sasaran", "angka": True, "desimal": 2},
             {"k": "pangan", "label": "Paket pangan (orang-hari)", "title": "JP x PR x H, H = 72 jam / 24 (Perka 23/2014 Pasal 11 huruf a)", "angka": True},
             {"k": "beras_kg", "label": "Beras (kg)", "title": "paket pangan x 0,4 kg (Perka 7/2008)", "angka": True},
             {"k": "air_minum_l", "label": "Air minum (liter)", "title": "paket pangan x 2,5 liter (Perka 7/2008)", "angka": True},
             {"k": "sandang_harfiah", "label": "Sandang/papan, bacaan harfiah", "title": "JP x PR x H / 4 jiwa (bacaan harfiah Pasal 11 huruf b, c); papan sama dengan sandang", "angka": True},
             {"k": "sandang_keluarga", "label": "Sandang/papan, bacaan per keluarga", "title": "JP x PR / 4 jiwa tanpa hari (tafsir riset/4 Q3, tampil berdampingan sampai Q3 dijawab)", "angka": True},
             {"k": "balita", "label": "Tambahan balita (orang-hari)", "title": "PR x balita 0-4 x H", "angka": True},
             {"k": "status", "label": "Neraca stok", "title": "Stok INALOGPAL belum tersambung (RU-036): kosong, bukan 0"},
             {"k": "uji_balik", "label": "Uji balik DIBI", "title": "Rasio maksimum pengungsi per penduduk 2015-2025, dipangkas persentil 99"}]
    isi = []
    for b in baris:
        s = b["skenario"][sk]
        ub = b["uji_balik"]
        isi.append({"kab": nama.get(b["kode"], b["kode"]), "jp": b["jp"], "pr": None if s is None else s["pr"],
                    "pangan": None if s is None else s["pangan_orang_hari"],
                    "beras_kg": None if s is None else s["beras_kg"], "air_minum_l": None if s is None else s["air_minum_l"],
                    "sandang_harfiah": None if s is None else s["sandang_harfiah"],
                    "sandang_keluarga": None if s is None else s["sandang_keluarga"],
                    "balita": None if s is None else s["balita_orang_hari"], "status": STATUS[b["status"]],
                    "uji_balik": "belum ada data DIBI (kode wilayah)" if ub["lewat_1pct"] is None else
                    ("pernah di atas 1%, calon PR 4%" if ub["lewat_1pct"] else "tidak pernah di atas 1%")})
    belum = sum(b["status"] == "belum_dilaporkan" for b in baris)
    return rapor.kartu(
        id=f"plp1-{sk.replace('_', '-')}", sistem="PLP-1", pil="Stok penyangga", ikon="gudang",
        judul=f"Stok penyangga 72 jam, {NAMA_SK[sk]}",
        angka=[{"k": "kab", "label": "Kab/kota dihitung", "nilai": len(baris)},
               {"k": "belum", "label": "Kab/kota tanpa data stok", "nilai": belum, "title": "stok belum dilaporkan, bukan 0"},
               {"k": "beras_kg", "label": "Beras 72 jam nasional (kg)",
                "nilai": None if any(b["skenario"][sk] is None for b in baris) else sum(b["skenario"][sk]["beras_kg"] for b in baris)}],
        kolom=kolom, baris=isi, rumus="paket_pangan = JP x PR x H; sandang = papan = JP x PR x H / 4",
        sumber=["terpapar", "dibi_kab_tahun"], label="hitungan_kita",
        aturan=ATURAN_SK[sk] + ["stok_minimal_jam", "stok_jiwa_per_paket", "std_beras_kg", "std_air_minum_l"])


def _kartu_uji(nas, sha):
    pc = lambda x: None if x is None else 100 * x  # noqa: E731
    baris = [{"penyebut": nama, "kab_tahun": st["kab_tahun"], "lewat_1pct": st["lewat_1pct"], "persen": st["persen_lewat_1pct"],
              "lewat_4pct": st["lewat_4pct"], "p95": pc(st["p95"]), "p99": pc(st["p99"])}
             for nama, st in (("0 bila tidak tercatat DIBI", nas["nol_isi"]), ("Kab-tahun berdata DIBI", nas["berdata"]))]
    return rapor.kartu(
        id="plp1-uji-balik", sistem="PLP-1", pil="Stok penyangga", ikon="timbang", judul="Uji balik PR 1% dengan DIBI",
        angka=[{"k": "tanpa_kode", "label": "Kab/kota tanpa kode DIBI cocok, dikeluarkan", "nilai": nas["kab_tanpa_kode_dibi"],
                "title": "kode wilayah DIBI lama (Papua pemekaran) belum dipadankan; kab-tahunnya tidak dihitung, bukan 0"},
               {"k": "kode_asing", "label": "Kode DIBI tak dikenal", "nilai": nas["kode_dibi_tak_dikenal"]}],
        kolom=[{"k": "penyebut", "label": "Penyebut", "title": nas["catatan"]},
               {"k": "kab_tahun", "label": "Kab-tahun", "angka": True},
               {"k": "lewat_1pct", "label": "Di atas 1%", "title": "kab-tahun dengan pengungsi di atas 1% penduduk", "angka": True},
               {"k": "persen", "label": "Persen di atas 1%", "angka": True},
               {"k": "lewat_4pct", "label": "Di atas 4%", "angka": True},
               {"k": "p95", "label": "Persentil 95 (%)", "title": "pengungsi per penduduk", "angka": True, "desimal": 2},
               {"k": "p99", "label": "Persentil 99 (%)", "title": f"pengungsi per penduduk; masukan sha256 {sha[:12]}", "angka": True, "desimal": 2}],
        baris=baris, rumus="rasio = mengungsi / penduduk per kab-tahun; rasio per kab dipangkas di persentil 99 kab-tahun berdata",
        sumber=["dibi_kab_tahun", "terpapar"], label=["resmi", "hitungan_kita"], aturan=["stok_pr_umum", "stok_pr_khusus"])


def _sumber(*berkas):
    return [{"nama": d.get("sumber", n)[:200], "url": f"repo:public/data/bnpb/{n}.json", "diambil": d["dibuat"][:10],
             "lisensi": d.get("lisensi", "tidak tertulis")[:200]} for n, d in berkas]


def bangun(terpapar, dibi, sha_dibi, nama):
    baris, nas = hitung(terpapar, dibi)
    kartu = [_kartu_skenario(sk, baris, nama) for sk in SKENARIO] + [_kartu_uji(nas, sha_dibi)]
    b = rapor.berkas(kartu, _sumber(("terpapar", terpapar), ("dibi_kab_tahun", dibi)))
    b["data"] = {"kab": [{**r, "nama_kab": nama.get(r["kode"])} for r in baris],
                 "uji_balik_nasional": {**nas, "masukan_sha256": sha_dibi,
                                        "reproduksi_riset4": "cocok" if sha_dibi == BEKU["sha256"] else "masukan berubah"}}
    return b


def _nama():
    with open(os.path.join(AKAR, "public", "data", "kemitraan", "kode.json"), encoding="utf-8") as f:
        return {k: v["nama"] for k, v in json.load(f).items()}


def jalan():
    t, _ = _muat("terpapar")
    d, sha = _muat("dibi_kab_tahun")
    return {"stok_penyangga": bangun(t, d, sha, _nama())}


def cek():
    # kasus acuan RU sec 2.3 S1 sampai S10 dan Purbalingga S11 lewat neraca.py (satu rumus, tanpa salinan)
    kasus = [k for k in neraca._kasus() if k["id"].startswith("S")]
    assert len(kasus) >= 11, [k["id"] for k in kasus]
    for k in kasus:
        neraca._sama(neraca.kembar(k["id"]), k["harap"], k["id"])
    t, _ = _muat("terpapar")
    d, sha = _muat("dibi_kab_tahun")
    b = bangun(t, d, sha, _nama())
    kab = b["data"]["kab"]
    assert len(kab) == 514 and len({r["kode"] for r in kab}) == 514, len(kab)
    # Purbalingga DT sec 5.7 dari data nyata
    p = next(r for r in kab if r["kode"] == "3303")
    s = p["skenario"]["pr1"]
    assert p["jp"] == 1057750 and p["balita"] == 70551, p
    assert abs(s["pangan_orang_hari"] - 31732.5) < 1e-9 and round(s["beras_kg"]) == 12693 and round(s["air_minum_l"]) == 79331
    assert round(s["sandang_harfiah"]) == 7933 and round(s["sandang_keluarga"]) == 2644 and round(s["balita_orang_hari"]) == 2117, s
    for r in kab:
        a, c = r["skenario"]["pr1"], r["skenario"]["pr4"]
        for x in BARANG:
            assert abs(c[x] - 4 * a[x]) <= 1e-9 * max(1, c[x]), (r["kode"], x)
        assert r["stok"] is None and r["status"] == "belum_dilaporkan" and r["celah_beras_kg"] is None, r["kode"]
        pr = r["skenario"]["pr_risiko"]
        assert pr is None or 1 <= pr["pr"] <= 4, (r["kode"], pr)
    # kartu: label hitungan_kita, kab tanpa stok tidak pernah 0, sel stok berkata belum dilaporkan
    for k in b["kartu"][:3]:
        assert k["label"] == ["hitungan_kita"] and k["angka"][1]["nilai"] == 514
        assert all(x["status"] == "stok belum dilaporkan" for x in k["baris"]), k["id"]
        assert "bacaan harfiah" in json.dumps(k["kolom"]) and "bacaan per keluarga" in json.dumps(k["kolom"])
    assert b["kartu"][2]["aturan"][0]["asumsi"] is True, "PR risiko harus berpil asumsi"
    rapor.periksa_berkas({"dibuat": "2026-11-26T00:00:00Z", "basi_jam": 1080, **b})
    # uji balik: reproduksi riset/4 hanya atas masukan beku
    nas = b["data"]["uji_balik_nasional"]
    assert nas["masukan_sha256"] == sha
    r4 = nas["riset4"]
    if sha == BEKU["sha256"]:
        assert r4["kab_tahun"] == BEKU["kab_tahun"] and r4["lewat_1pct"] == BEKU["lewat_1pct"], r4
        assert r4["lewat_4pct"] == BEKU["lewat_4pct"], r4
        assert abs(r4["p95"] - BEKU["p95"]) < 5e-5 and abs(r4["p99"] - BEKU["p99"]) < 5e-4, r4
        assert nas["berdata"]["kab_tahun"] == 4434 and nas["kab_tanpa_kode_dibi"] == 35, nas
        assert nas["nol_isi"]["kab_tahun"] == (514 - 35) * 11, nas["nol_isi"]
    else:
        print(f"plp1.py: masukan berubah (sha {sha[:12]} bukan {BEKU['sha256'][:12]}); reproduksi riset/4 dilewati")
    assert nas["berdata"]["kab_tahun"] <= nas["nol_isi"]["kab_tahun"] <= r4["kab_tahun"]
    # kab tanpa kode DIBI: tidak ada di penyebut, uji balik per kab None
    keluar = set(nas["kab_tanpa_kode_dibi_daftar"])
    assert all(r["uji_balik"]["lewat_1pct"] is None for r in kab if r["kode"] in keluar)
    k4 = b["kartu"][3]
    assert k4["angka"][0]["nilai"] == nas["kab_tanpa_kode_dibi"] and [x["kab_tahun"] for x in k4["baris"]] == [
        nas["nol_isi"]["kab_tahun"], nas["berdata"]["kab_tahun"]]
    # pemangkasan p99 berdata bekerja: rasio_maks tidak pernah di atas p99
    assert all(r["uji_balik"]["rasio_maks"] is None or r["uji_balik"]["rasio_maks"] <= nas["berdata"]["p99"] + 1e-15 for r in kab)
    # uji balik tiruan: kab B tanpa baris DIBI keluar dari penyebut (bukan 0); kode asing dihitung terpisah
    kt = {"A": {"n": 1000}, "B": {"n": 1000}}
    pk, nn = uji_balik(kt, [["A", 2020, "banjir", 1, 0, 0, 0, 50, 0], ["ZZ", 2020, "banjir", 1, 0, 0, 0, 9, 0]])
    assert pk["B"] == {"rasio_maks": None, "tahun": None, "lewat_1pct": None} and pk["A"]["lewat_1pct"] is True, pk
    assert nn["kode_dibi_tak_dikenal"] == 1 and nn["kab_tanpa_kode_dibi_daftar"] == ["B"], nn
    assert nn["nol_isi"]["kab_tahun"] == 11 and nn["berdata"]["kab_tahun"] == 1 and nn["riset4"]["kab_tahun"] == 22, nn
    assert nn["nol_isi"]["lewat_1pct"] == 1 and nn["berdata"]["persen_lewat_1pct"] == 100, nn
    # jp salah ditolak
    for salah in (-1, None, "10", 0):
        try:
            hitung({"kab": {"X": {"n": salah, "b": 1, "h": {"banjir": [0, 0, 1, 0]}}}}, {"baris": []})
        except (ValueError, ZeroDivisionError):
            continue
        raise AssertionError(f"jp {salah!r} tidak ditolak")
    assert not re.search(r"\baman\b", json.dumps(b), re.I)
    print(f"plp1.py --cek: lulus (514 kab; di atas 1%: {nas['nol_isi']['lewat_1pct']} dari {nas['nol_isi']['kab_tahun']} kab-tahun "
          f"bernilai 0 bila tidak tercatat, {nas['berdata']['lewat_1pct']} dari {nas['berdata']['kab_tahun']} berdata; "
          f"{nas['kab_tanpa_kode_dibi']} kab tanpa kode DIBI dikeluarkan)")


if __name__ == "__main__":
    if "--cek" in sys.argv:
        cek()
    else:
        print(__doc__)
