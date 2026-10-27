#!/usr/bin/env python3
"""SIPPA: statistik, finansial, vonis pilot (DESAIN-TEKNIS §5.5, §5.5.2, §5.6, keputusan 53, SP-019). Stdlib saja.
Kembar hitung.js; `vonis_pilot` memakai hidraulika.hidraulika untuk butir 4.
Pakai: python3 scripts/data/sippa/bersama.py uji"""
import json
import math
import os
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

sys.path.append(str(Path(__file__).resolve().parent))  # append, bukan insert: `python3 -I` tidak memuat folder skrip
import hidraulika as hid  # noqa: E402

JAM_MS = 3600e3
N_KECIL = 5
T_KRITIS95 = [12.706, 4.303, 3.182, 2.776, 2.571, 2.447, 2.365, 2.306, 2.262, 2.228, 2.201, 2.179, 2.160, 2.145, 2.131,
              2.120, 2.110, 2.101, 2.093, 2.086, 2.080, 2.074, 2.069, 2.064, 2.060, 2.056, 2.052, 2.048, 2.045, 2.042]
TAHAP_PROBE = ["sebelum", "sesudah", "24j"]
DALAM_PROBE = [10, 30, 50, 100]
LIMA_WAKTU = ["t_tiba", "t_mulai_gelar", "t_air_mengalir", "t_selesai", "t_bongkar_selesai"]


# ---------- statistik ----------
def kuantil(xs, p):
    """Tipe 7 (sama dengan numpy.percentile bawaan); n = 0 -> None."""
    if not xs:
        return None
    s = sorted(xs)
    h = (len(s) - 1) * p
    i = math.floor(h)
    return s[i] + (h - i) * (s[i + 1] - s[i]) if i + 1 < len(s) else s[i]


def n_kecil(n):
    return n < N_KECIL


def durasi_log(l):
    """Durasi dalam JAM; None bila salah satu ujung None."""
    def jam(a, b):
        return None if l.get(a) is None or l.get(b) is None else (l[b] - l[a]) / JAM_MS
    gelar = jam("t_mulai_gelar", "t_air_mengalir")
    panjang, n_orang = l.get("panjang_m"), l.get("n_orang")
    return {"tiba_air": jam("t_tiba", "t_air_mengalir"), "gelar": gelar, "bongkar": jam("t_selesai", "t_bongkar_selesai"),
            "laju_m_jam": panjang / gelar if gelar is not None and gelar > 0 and panjang is not None else None,
            "orang_jam_100m": n_orang * gelar / (panjang / 100) if gelar is not None and n_orang is not None and panjang is not None and panjang > 0 else None}


def _rerata_var(x):
    m = sum(x) / len(x)
    return m, sum((v - m) ** 2 for v in x) / (len(x) - 1)


N_MIN_PUTUS = 8
R_BAWAAN, H_BAWAAN = 0.08, 5


def banding_rerata(a, b):
    """Welch; n_a < 2 atau n_b < 2 -> None; n < 8 = CI tetap dihitung tetapi belum_bisa_diputus (kembar JS)."""
    a, b = [x for x in a if hid.ada_angka(x)], [x for x in b if hid.ada_angka(x)]
    na, nb = len(a), len(b)
    if na < 2 or nb < 2:
        return None
    ma, va = _rerata_var(a)
    mb, vb = _rerata_var(b)
    ta, tb = va / na, vb / nb
    se, d = math.sqrt(ta + tb), ma - mb
    ekor = {"n_a": na, "n_b": nb, "rerata_a": ma, "rerata_b": mb, "belum_bisa_diputus": na < N_MIN_PUTUS or nb < N_MIN_PUTUS}
    if se == 0:
        return {"selisih": d, "se": se, "df": None, "t": None, "ci": [d, d], **ekor}
    df = (ta + tb) ** 2 / (ta ** 2 / (na - 1) + tb ** 2 / (nb - 1))
    t = T_KRITIS95[math.floor(df) - 1] if df < 31 else 1.96
    return {"selisih": d, "se": se, "df": df, "t": t, "ci": [d - t * se, d + t * se], **ekor}


def banding_proporsi(xa, na, xb, nb):
    """Agresti-Caffo: selisih proporsi a minus b."""
    for x, n in ((xa, na), (xb, nb)):
        if not all(isinstance(v, int) and not isinstance(v, bool) for v in (x, n)) or n < 1 or x < 0 or x > n:
            raise ValueError(f"proporsi {x}/{n} mustahil: x bilangan bulat 0 sampai n, n 1 atau lebih")
    pa, pb = (xa + 1) / (na + 2), (xb + 1) / (nb + 2)
    d = pa - pb
    se = math.sqrt(pa * (1 - pa) / (na + 2) + pb * (1 - pb) / (nb + 2))
    return {"selisih": d, "se": se, "ci": [d - 1.96 * se, d + 1.96 * se], "p_a": pa, "p_b": pb}


# ---------- finansial ----------
def _cek_rh(r, H, batasi_h=True):
    if not hid.ada_angka(r) or r < 0:
        raise ValueError("r wajib angka 0 atau lebih")
    if not hid.ada_angka(H) or H <= 0 or (batasi_h and (H < 1 or H > 15)):
        raise ValueError("H wajib 1 sampai 15 tahun" if batasi_h else "umur wajib angka positif")


def af(r, H):
    _cek_rh(r, H)
    return H if r == 0 else (1 - (1 + r) ** -H) / r


def crf(r, n):
    _cek_rh(r, n, False)
    return 1 / n if r == 0 else r / (1 - (1 + r) ** -n)


def _uang(capex, opex, manfaat, r, H):
    for n, x in (("capex", capex), ("opex", opex), ("manfaat", manfaat)):
        if not hid.ada_angka(x) or x < 0:
            raise ValueError(f"{n} wajib angka 0 atau lebih")
    return af(r, H)


def npv(capex, opex, manfaat, r, H):
    return (manfaat - opex) * _uang(capex, opex, manfaat, r, H) - capex


def bcr(capex, opex, manfaat, r, H):
    a = _uang(capex, opex, manfaat, r, H)
    penyebut = capex + opex * a
    return None if penyebut == 0 else manfaat * a / penyebut


def impas(capex, opex, r, H):
    return opex + capex / _uang(capex, opex, 0, r, H)


def keuangan(m):
    """Semua ukuran finansial sekaligus (fungsi acuan `keuangan`); manfaat bawaan 0, r 8%, H 5."""
    c, o, mf = m["capex"], m["opex"], m.get("manfaat", 0)
    r, H = m.get("r", R_BAWAAN), m.get("H", H_BAWAAN)
    return {"af": af(r, H), "npv": npv(c, o, mf, r, H), "bcr": bcr(c, o, mf, r, H), "impas": impas(c, o, r, H), "crf": crf(r, H)}


def biaya_per_ha(capex, umur, r, opex, regu, ha):
    if not hid.ada_angka(ha) or ha < 0:
        raise ValueError("ha wajib angka 0 atau lebih")
    return None if ha == 0 else (capex * crf(r, umur) + opex + regu) / ha


# ---------- vonis pilot "dapat dipakai" (keputusan 53) ----------
def _ge(x, batas):
    return x is not None and x >= batas  # JS: null >= 2 salah untuk batas > 0


def vonis_pilot(d):
    log, probe, komp = d.get("log") or [], d.get("probe") or [], d.get("komponen_kembali") or []
    butir = []

    def b(no, lulus, nilai, alasan):
        butir.append({"no": no, "lulus": lulus, "nilai": nilai, "alasan": alasan})
    # 1: sesi berair sampai lance, minimal dua, di minimal dua petak
    air = [l for l in log if l.get("air_sampai_lance") == 1]
    petak = {l.get("petak_id") for l in air if l.get("petak_id") is not None}
    b(1, (len(air) >= 2 and len(petak) >= 2) if log else None, {"sesi": len(air), "petak": len(petak)},
      "sesi dengan air sampai lance, paling sedikit 2 sesi di 2 petak")
    # 2: tiba sampai air terbaik <= 4 jam dan lima waktu lengkap tiap sesi
    t_air = [x for x in (durasi_log(l)["tiba_air"] for l in log) if x is not None]
    b(2, (bool(t_air) and min(t_air) <= 4 and all(l.get(k) is not None for l in log for k in LIMA_WAKTU)) if log else None,
      min(t_air) if t_air else None, "tiba sampai air mengalir terbaik paling lama 4 jam, lima waktu lengkap di tiap sesi")
    # 3: tekanan ujung >= 2 bar selama >= 30 menit
    tekan = [l for l in log if _ge(l.get("p_ujung_bar"), hid.KONST["sisa_syarat"]) and _ge(l.get("p_ujung_menit"), 30)]
    b(3, bool(tekan) if log else None,
      {"bar": tekan[0]["p_ujung_bar"], "menit": tekan[0]["p_ujung_menit"], "sumber": tekan[0].get("p_ujung_sumber")} if tekan else None,
      "tekanan ujung 2 bar atau lebih selama 30 menit atau lebih")
    # 4: gerbang hidraulika tanpa tingkat keras untuk konfigurasi tiap sesi (tanpa konfigurasi = null)
    gagal4, tanpa = False, not log
    for l in log:
        if not l.get("konfigurasi"):
            tanpa = True
            continue
        if any(g["tingkat"] == "keras" for g in hid.hidraulika(l["konfigurasi"])["gerbang"]):
            gagal4 = True
    b(4, False if gagal4 else None if tanpa else True, None, "konfigurasi tiap sesi lolos gerbang hidraulika tanpa hambatan keras")
    # 5: kelengkapan probe >= 90%
    titik = {(r.get("petak_id"), r.get("titik")) for r in probe}
    ada = {(r.get("petak_id"), r.get("titik"), r.get("tahap"), r.get("kedalaman_cm")) for r in probe}
    harap = len(titik) * len(TAHAP_PROBE) * len(DALAM_PROBE)
    kena = sum(1 for t in titik for th in TAHAP_PROBE for k in DALAM_PROBE if (t[0], t[1], th, k) in ada)
    lengkap = kena / harap if harap else None
    tanpa_probe = {l.get("petak_id") for l in log if l.get("petak_id") is not None} - {r.get("petak_id") for r in probe}  # "di semua petak"
    tanpa_probe = sorted(tanpa_probe, key=str)
    b(5, False if tanpa_probe else None if lengkap is None else lengkap >= 0.9, lengkap,
      "kelengkapan probe 90% atau lebih dari tahap sebelum, sesudah, 24 jam di empat kedalaman, dan tiap petak di log punya probe")
    butir[-1]["petak_tanpa_probe"] = tanpa_probe
    # 6: tanpa kecelakaan, tanpa henti bocor lebih dari 30 menit
    celaka = sum(l.get("kecelakaan") or 0 for l in log)
    henti = any(l.get("bocor_henti_menit") is not None and l["bocor_henti_menit"] > 30 for l in log)
    b(6, (celaka == 0 and not henti) if log else None, {"kecelakaan": celaka, "henti_lebih_30": henti},
      "tanpa kecelakaan dan tanpa henti karena bocor lebih dari 30 menit")
    # 7: komponen kembali berfungsi >= 95%
    baik = sum(1 for c in komp if c.get("kondisi") in ("baik", "rusak_ringan"))
    rasio = baik / len(komp) if komp else None
    b(7, None if rasio is None else rasio >= 0.95, rasio, "komponen kembali berfungsi 95% atau lebih")
    gagal = [x["no"] for x in butir if x["lulus"] is not True]
    akhir = "DAPAT DIPAKAI" if not gagal else "BELUM DAPAT DIPAKAI" if (1 in gagal or 6 in gagal) else "DAPAT DIPAKAI BERSYARAT"
    return {"butir": butir, "gagal": gagal, "vonis": akhir}


# ---------- keluaran data/sippa/keluaran/*.json (RENCANA-UJI §4.1, DT §7.1) ----------
MAKS_BYTE = 8 * 1024 * 1024
KUNCI_KEPALA = ["dibuat", "per", "ambang", "sumber", "catatan"]


def kepala(per, ambang, sumber, catatan, versi=None):
    """Kepala berkas: `dibuat` kunci pertama (syarat /api/status), lalu per, ambang, sumber, catatan."""
    wib = datetime.now(timezone(timedelta(hours=7))).strftime("%Y-%m-%dT%H:%M+07:00")
    k = {"dibuat": wib, "per": per, "ambang": ambang, "sumber": sumber, "catatan": catatan}
    return {**k, "versi": versi} if versi else k


def cek_keluaran(doc, nama="keluaran"):
    """Pemeriksaan umum: kepala berurutan, tanpa NaN/Infinity, <= 8 MB. Mengembalikan teks JSON padat."""
    assert list(doc)[:5] == KUNCI_KEPALA, f"{nama}: lima kunci pertama {list(doc)[:5]}, wajib {KUNCI_KEPALA}"
    assert doc["sumber"] and all(s.get("nama") and s.get("lisensi") and s.get("tarik") for s in doc["sumber"]), f"{nama}: sumber wajib nama, lisensi, tarik"
    teks = json.dumps(doc, ensure_ascii=False, separators=(",", ":"), allow_nan=False)  # NaN/Infinity melempar ValueError
    assert len(teks.encode()) <= MAKS_BYTE, f"{nama}: {len(teks.encode())} byte melewati 8 MB"
    return teks


def tulis_json(jalur, doc):
    """Atomik: tulis ke .tmp lalu os.replace."""
    teks = cek_keluaran(doc, os.path.basename(jalur))
    os.makedirs(os.path.dirname(jalur), exist_ok=True)
    with open(jalur + ".tmp", "w", encoding="utf-8") as h:
        h.write(teks)
    os.replace(jalur + ".tmp", jalur)
    return len(teks.encode())


def uji():
    import kembar_cli
    n = kembar_cli.uji_fixture({"kuantil", "vonisPilot", "bandingRerata", "bandingProporsi", "keuangan"})
    # W1 (DT §5.8)
    w = banding_rerata([0.42, 0.55, 0.61, 0.48, 0.70, 0.66, 0.52, 0.59, 0.63, 0.57], [0.35, 0.41, 0.38, 0.44, 0.30, 0.47, 0.39, 0.36])
    assert abs(w["selisih"] - 0.1855) < 1e-4 and abs(w["df"] - 15.33) < 0.01 and w["t"] == 2.131, w
    assert abs(w["ci"][0] - 0.1159) < 1e-3 and abs(w["ci"][1] - 0.2551) < 1e-3, w
    assert banding_rerata([1], [1, 2]) is None
    # P1
    p = banding_proporsi(2, 10, 5, 8)
    assert abs(p["selisih"] + 0.35) < 1e-9 and abs(p["ci"][0] + 0.7402) < 1e-3 and abs(p["ci"][1] - 0.0402) < 1e-3, p
    # N1
    c, o, m = 1e9, 1e8, 3e8
    assert abs(af(0.08, 5) - 3.99271) < 1e-5 and abs(crf(0.08, 5) - 0.250456) < 1e-6
    assert abs(npv(c, o, m, 0.08, 5) + 201457993) < 2e3, npv(c, o, m, 0.08, 5)
    assert abs(bcr(c, o, m, 0.08, 5) - 0.8560) < 1e-4 and abs(impas(c, o, 0.08, 5) - 350456455) < 2e3
    assert biaya_per_ha(1e9, 5, 0.08, 1e8, 0, 0) is None
    for f, a in ((banding_proporsi, (11, 10, 1, 2)), (banding_proporsi, (1.5, 10, 1, 2)), (af, (0.08, 16)), (af, (-1, 5)), (npv, (-1, 0, 0, 0.08, 5))):
        try:
            f(*a)
            raise AssertionError(f"{f.__name__}{a} harus ditolak")
        except ValueError:
            pass
    assert af(0, 5) == 5 and abs(crf(0, 4) - 0.25) < 1e-12 and bcr(0, 0, 1, 0.08, 5) is None
    rb = banding_rerata([1, 2, 3], [2, 3, 4])
    assert rb["belum_bisa_diputus"] is True and rb["n_a"] == 3 and banding_rerata([1, 1], [1, 1])["df"] is None
    # impas Studio (DT §5.6): 768.489.352 + 9.688.192.331 / 3,99271
    assert abs(impas(9688192331, 768489352, 0.08, 5) - 3194959655) < 5e3
    assert n_kecil(4) and not n_kecil(5)
    dl = durasi_log({"t_tiba": 0, "t_mulai_gelar": 3600e3, "t_air_mengalir": 3 * 3600e3, "panjang_m": 1000, "n_orang": 4})
    assert dl["tiba_air"] == 3 and dl["gelar"] == 2 and dl["laju_m_jam"] == 500 and dl["orang_jam_100m"] == 0.8 and dl["bongkar"] is None, dl
    # V4 = V1 tanpa semua probe petak pertama (belum di acuan.json): butir 5 gagal, vonis BERSYARAT (butir 7 ada)
    import json
    v1 = next(k for k in json.loads(kembar_cli.ACUAN.read_text(encoding="utf-8")) if k["id"] == "V1")["masukan"]
    pertama = v1["log"][0]["petak_id"]
    v4 = vonis_pilot({**v1, "probe": [r for r in v1["probe"] if r["petak_id"] != pertama]})
    assert v4["gagal"] == [5] and v4["vonis"] == "DAPAT DIPAKAI BERSYARAT", v4
    assert vonis_pilot(v1)["vonis"] == "DAPAT DIPAKAI"
    # data kosong: butir null dihitung gagal, vonis tidak pernah DAPAT DIPAKAI
    k = vonis_pilot({})
    assert k["vonis"] == "BELUM DAPAT DIPAKAI" and all(x["lulus"] is None for x in k["butir"]), k
    print(f"bersama.py uji: OK ({n} kasus acuan + W1 + P1 + N1 + durasi + kosong)")


if __name__ == "__main__":
    if sys.argv[1:] == ["uji"]:
        uji()
    else:
        sys.exit("pakai: bersama.py uji")
