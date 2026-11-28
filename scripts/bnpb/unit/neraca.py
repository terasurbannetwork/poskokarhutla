"""MB-5 Neraca kebutuhan (ALGORITMA sec 6; DESAIN-TEKNIS sec 4.5; tiket RU-028).

Pustaka murni, tidak menulis berkas, bukan langkah jalan.py. Standar hanya dari
Jam Aturan lewat aturan.py (kunci std_* dan stok_*); tidak ada takaran tertanam.
Kosong bukan nol: stok yang tidak dilaporkan memberi belum_dilaporkan, celah None.
Hitungan presisi penuh; pembulatan hanya di tampilan (ALGORITMA sec 0.7).

  neraca(butuh, ada)                       -> {butuh, ada, celah, status}  status cukup|kurang|belum_dilaporkan
  neraca_barang(kebutuhan, tersedia)       -> {barang: neraca(...)}
  kebutuhan(jiwa, hari_sejak_buka, kk)     -> WIL-2 per tempat pengungsian per hari
  rekap(tempat, tanggal)                   -> WIL-2 rekap kab; tempat basi tidak dijumlah
  selisih(pusat, daerah)                   -> panel pusat lawan daerah
  stok_penyangga(jp, pr, balita=None)      -> PLP-1 (Perka 23/2014), pr dalam persen
  pr_risiko(terpapar_tinggi, jp)           -> PLP-1 skenario ketiga, dijepit pr_risiko_rentang
  rumah(lapor, verif)                      -> RRP-1 bagian neraca
  estimasi_rb(lapor_rb, rasio_pembanding)  -> RRP-1 estimasi RB tanpa verifikasi

  python3 -I scripts/bnpb/unit/neraca.py --cek
  python3 -I scripts/bnpb/unit/neraca.py --kembar <id kasus acuan.json>
"""
import json
import math
import os
import statistics
import sys
from datetime import date

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))  # -I tidak menaruh folder skrip
import aturan  # noqa: E402

AMBANG_SELISIH = 0.25  # asumsi (riset/3 W2): panel pusat lawan daerah merah bila selisih di atas ini
MIN_PEMBANDING = 3     # riset/5 P1: estimasi RB butuh paling sedikit 3 kab pembanding
LABEL_SELISIH = "Asumsi: ambang selisih 25%"
LABEL_PR_RISIKO = "asumsi platform"


def _angka(x, nama, bulat=False):
    """Angka hingga >= 0; bool, None, NaN, negatif ditolak."""
    if isinstance(x, bool) or not isinstance(x, (int, float)) or not math.isfinite(x) or x < 0:
        raise ValueError(f"{nama}={x!r} harus angka hingga >= 0")
    if bulat and x != int(x):
        raise ValueError(f"{nama}={x!r} harus bilangan bulat")
    return x


def neraca(butuh, ada):
    butuh = _angka(butuh, "butuh")
    if ada is None:
        return {"butuh": butuh, "ada": None, "celah": None, "status": "belum_dilaporkan"}
    ada = _angka(ada, "ada")
    if ada >= butuh:  # batas inklusif (RU S8)
        return {"butuh": butuh, "ada": ada, "celah": 0, "status": "cukup"}
    return {"butuh": butuh, "ada": ada, "celah": butuh - ada, "status": "kurang"}


def neraca_barang(kebutuhan_, tersedia):
    """Barang yang tidak ada di `tersedia` = belum dilaporkan, bukan nol."""
    return {b: neraca(v, tersedia.get(b)) for b, v in kebutuhan_.items()}


def _std(kunci):
    return aturan.standar(kunci)["nilai"]


def kebutuhan(jiwa, hari_sejak_buka, kk):
    """WIL-2 per tempat per hari. hari_ke = hari_sejak_buka + 1 (hari buka = hari ke-1)."""
    jiwa = _angka(jiwa, "jiwa", bulat=True)
    hari_sejak_buka = _angka(hari_sejak_buka, "hari_sejak_buka", bulat=True)
    kk = _angka(kk, "kk", bulat=True)
    if kk == 0 and jiwa > 0:
        raise ValueError("kk 0 dengan jiwa > 0 tidak sah (pengungsi tanpa KK)")
    air = aturan.standar("std_air_bersih_l")
    takaran_air = air["awal"]["nilai"] if hari_sejak_buka + 1 <= air["awal"]["hari"] else air["nilai"]
    return {
        "beras_kg": _std("std_beras_kg") * jiwa,
        "air_bersih_l": takaran_air * jiwa,
        "air_minum_l": _std("std_air_minum_l") * jiwa,
        "jamban": math.ceil(jiwa / _std("std_jamban_jiwa")),
        "hunian_m2": _std("std_hunian_m2") * jiwa,
        "kantong_sampah": math.ceil(kk / _std("std_sampah_kk")),  # per 3 hari
        "sabun_kg": _std("std_sabun_kg") * jiwa,  # per bulan
    }


def _tgl(s, nama):
    try:
        return date.fromisoformat(s)
    except (TypeError, ValueError):
        raise ValueError(f"{nama}={s!r} bukan tanggal ISO") from None


def rekap(tempat, tanggal):
    """Rekap kab pada `tanggal`: jumlah atas tempat berumur data <= 2 x pengungsi_mutakhir.
    Tempat basi ditandai, tidak dijumlah. Tanpa tempat segar: jumlah None (bukan 0)."""
    d = _tgl(tanggal, "tanggal")
    batas = 2 * aturan.nilai("pengungsi_mutakhir")
    jumlah, dijumlah, basi = None, [], []
    for t in tempat:
        umur = (d - _tgl(t["data_tgl"], "data_tgl")).days
        if umur > batas:
            basi.append(t["id"])
            continue
        k = kebutuhan(t["jiwa"], (d - _tgl(t["buka"], "buka")).days, t["kk"])
        jumlah = k if jumlah is None else {b: jumlah[b] + v for b, v in k.items()}
        dijumlah.append(t["id"])
    return {"jumlah": jumlah, "dijumlah": dijumlah, "basi": basi}


def selisih(pusat, daerah):
    """|P - D| / maks(P, D); P = D = 0 memberi 0; salah satu None: panel tidak dihitung."""
    if pusat is None or daerah is None:
        return {"selisih": None, "merah": None, "label": LABEL_SELISIH}
    p, dd = _angka(pusat, "pusat"), _angka(daerah, "daerah")
    s = 0 if p == dd == 0 else abs(p - dd) / max(p, dd)
    return {"selisih": s, "merah": s > AMBANG_SELISIH, "label": LABEL_SELISIH}


def stok_penyangga(jp, pr, balita=None):
    """PLP-1 Perka 23/2014 Pasal 11. jp jiwa > 0; pr persen (1 = 1%); balita None = tidak dihitung."""
    if _angka(jp, "jp") == 0:
        raise ValueError("jp harus > 0")
    pr = _angka(pr, "pr")
    h = aturan.standar("stok_minimal_jam")["nilai"] / 24  # 72 jam = 3 hari
    j = _std("stok_jiwa_per_paket")
    pangan = jp * pr * h / 100
    return {
        "pr": pr, "hari": h,
        "pangan_orang_hari": pangan,
        "sandang_harfiah": pangan / j, "papan_harfiah": pangan / j,          # bacaan harfiah Pasal 11 huruf b, c
        "sandang_keluarga": jp * pr / 100 / j, "papan_keluarga": jp * pr / 100 / j,  # bacaan per keluarga (Q3 terbuka)
        "beras_kg": pangan * _std("std_beras_kg"),
        "air_minum_l": pangan * _std("std_air_minum_l"),
        "balita_orang_hari": None if balita is None else _angka(balita, "balita") * pr * h / 100,
    }


def pr_risiko(terpapar_tinggi, jp):
    """PR skenario ketiga = terpapar tinggi / JP, dijepit ke pr_risiko_rentang (asumsi)."""
    if _angka(jp, "jp") == 0:
        raise ValueError("jp harus > 0")
    lo, hi = aturan.nilai("pr_risiko_rentang")
    mentah = _angka(terpapar_tinggi, "terpapar_tinggi") / jp * 100
    pr = min(max(mentah, lo), hi)
    return {"pr": pr, "mentah": mentah, "dipangkas": pr != mentah, "label": LABEL_PR_RISIKO}


TINGKAT = ("RB", "RS", "RR")


def _total(x):
    if x.get("total") is not None:
        return _angka(x["total"], "total")
    if all(x.get(t) is not None for t in TINGKAT):
        return sum(_angka(x[t], t) for t in TINGKAT)
    return None


def _beban(x, tarif):
    if not all(x.get(t) is not None for t in TINGKAT):
        return None
    return sum(_angka(x[t], t) * tarif[t] for t in TINGKAT)


def rumah(lapor, verif):
    """RRP-1: kemajuan verifikasi (boleh > 1), rasio susut RB, beban stimulan (juta, estimasi kita, tarif asumsi).
    Tingkat yang tidak ada memberi None, tidak dianggap nol."""
    tarif = aturan.nilai("tarif_stimulan_juta")
    tl, tv = _total(lapor), _total(verif)
    l_rb, v_rb = lapor.get("RB"), verif.get("RB")
    return {
        "kemajuan": tv / tl if tl and tv is not None else None,
        "susut_rb": _angka(v_rb, "verif RB") / l_rb if l_rb and v_rb is not None else None,
        "beban_lapor_juta": _beban(lapor, tarif),
        "beban_verif_juta": _beban(verif, tarif),
        "label": "estimasi kita",
    }


def estimasi_rb(lapor_rb, rasio_pembanding):
    """L_RB x median rasio susut kab pembanding (jenis kejadian sama); kurang dari 3 pembanding: None."""
    lapor_rb = _angka(lapor_rb, "lapor_rb")
    r = [_angka(x, "rasio") for x in rasio_pembanding if x is not None]
    if len(r) < MIN_PEMBANDING:
        return {"estimasi": None, "alasan": "belum ada pembanding", "pembanding": len(r)}
    return {"estimasi": lapor_rb * statistics.median(r), "alasan": None, "pembanding": len(r), "label": "estimasi"}


FUNGSI = {"neraca": neraca, "kebutuhan": kebutuhan, "rekap": rekap, "selisih": selisih,
          "stok_penyangga": stok_penyangga, "pr_risiko": pr_risiko, "rumah": rumah, "estimasi_rb": estimasi_rb}


def _kasus():
    with open(aturan.ACUAN, encoding="utf-8") as f:
        return json.load(f)["neraca"]


def kembar(id_kasus):
    for k in _kasus():
        if k["id"] == id_kasus:
            return FUNGSI[k["fungsi"]](**k["masukan"])
    raise KeyError(f"kasus {id_kasus} tidak ada di acuan.json neraca")


def _sama(a, b, jalur):
    if isinstance(b, dict):
        for k, v in b.items():
            _sama(a[k], v, f"{jalur}.{k}")
    elif isinstance(b, (int, float)) and not isinstance(b, bool) and a is not None and not isinstance(a, bool):
        assert abs(a - b) <= 1e-5 * max(1, abs(b)), f"{jalur}: {a!r} harap {b!r}"
    else:
        assert a == b, f"{jalur}: {a!r} harap {b!r}"


def _tolak(f, *a):
    try:
        f(*a)
    except ValueError:
        return
    raise AssertionError(f"{f.__name__}{a} tidak ditolak")


def cek():
    kasus = _kasus()
    for k in kasus:
        _sama(kembar(k["id"]), k["harap"], k["id"])
    # S9: stok tidak dilaporkan bukan 0, juga lewat neraca_barang
    s1 = stok_penyangga(500000, 1)
    nb = neraca_barang({b: s1[b] for b in ("beras_kg", "air_minum_l")}, {"beras_kg": 4500})
    assert nb["beras_kg"]["status"] == "kurang" and nb["air_minum_l"]["status"] == "belum_dilaporkan"
    assert nb["air_minum_l"]["celah"] is None
    # invarian PLP-1: PR 4% = 4 x PR 1%
    for jp in (1, 17, 500000, 1057750, 12345678):
        s1, s4 = stok_penyangga(jp, 1, balita=jp // 10), stok_penyangga(jp, 4, balita=jp // 10)
        for b, v in s1.items():
            if b not in ("pr", "hari"):
                assert math.isclose(s4[b], 4 * v, rel_tol=1e-12), f"jp {jp} {b}: {s4[b]} != 4 x {v}"
    # penolakan masukan
    for salah in (-1, "500000", None, float("nan"), True):
        _tolak(stok_penyangga, salah, 1)
    _tolak(stok_penyangga, 0, 1)
    _tolak(neraca, 10, -1)
    _tolak(neraca, 10, "4")
    _tolak(kebutuhan, 10, 0, 0)       # kk 0 dengan jiwa > 0
    _tolak(kebutuhan, 10.5, 0, 3)     # jiwa pecahan
    _tolak(kebutuhan, 10, -1, 3)
    # kasus tepi WIL-2: hari ke-3 masih 7 l, hari ke-4 sudah 15 l
    assert kebutuhan(1, 2, 1)["air_bersih_l"] == 7 and kebutuhan(1, 3, 1)["air_bersih_l"] == 15
    # RRP-1: L_RB 0 atau tingkat hilang memberi None, bukan 0
    r = rumah({"RB": 0, "RS": 5}, {"RB": 0})
    assert r["susut_rb"] is None and r["beban_lapor_juta"] is None and r["kemajuan"] is None
    # tidak ada kata terlarang di status
    for k in kasus:
        assert "aman" not in json.dumps(kembar(k["id"])), k["id"]
    print(f"neraca.py --cek: lulus ({len(kasus)} kasus acuan)")


if __name__ == "__main__":
    if "--cek" in sys.argv:
        cek()
    elif "--kembar" in sys.argv:
        print(json.dumps(kembar(sys.argv[sys.argv.index("--kembar") + 1]), ensure_ascii=False))
    else:
        print(__doc__)
