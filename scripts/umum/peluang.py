"""Mesin peluang bersama lintas bencana: anggota ansambel/skenario -> peluang lewat ambang + rentang + kalimat vonis.

Pola dari prakiraan asap emisi.app: bukan satu angka, tapi "peluang X% hari Rabu melewati ambang", rentang
"8 dari 10 skenario" (p10..p90), satu kalimat jawaban di atas angka, dan bobot skenario yang dicocokkan ke alat ukur.

Kontrak berkas public/<id>/data/peluang.json (karhutla: public/data/peluang.json), versi "peluang/1":
  {"versi": "peluang/1", "bencana": id, "dibuat": ISO, "sumber": str, "anggota": n,
   "besaran": {"label": str, "satuan": str, "desimal": int},
   "ambang": [{"k": str, "label": str, "nilai": float}, ...]          urut naik keparahan
   "wilayah": {kode: {"nama": str, "tingkat": "nasional"|"provinsi"|"kabupaten"|"titik",
                      "hari": [{"t": "YYYY-MM-DD", "p": [peluang per ambang 0..1], "p10", "p50", "p90"}],
                      "vonis": str}},
   "batasan": [str, ...]                                            wajib, minimal satu kalimat jujur
   "uji_balik": {...} opsional (Brier, keandalan) bila modul punya}
Peluang = pecahan anggota (bobot sama) atau jumlah bobot (bila bobot_obs dipakai). Anggota None dibuang, tidak dikarang.

Pakai:  python3 scripts/umum/peluang.py uji               self-check
        python3 scripts/umum/peluang.py periksa <berkas>  validasi kontrak, keluar 1 bila galat
"""
import datetime as dt
import json
import math
import re
import sys

VERSI = "peluang/1"
HARI = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"]
BULAN = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"]
# Kata peluang untuk kalimat vonis. Batas kata, bukan model: dipilih supaya "kecil" tidak dipakai di atas 1 dari 10.
KATA = [(0.10, "kemungkinan kecil"), (0.40, "mungkin"), (0.70, "cukup mungkin"), (1.01, "kemungkinan besar")]


def _bersih(xs, w=None):
    """Pasangan (nilai, bobot) tanpa None/NaN; bobot dinormalkan ke jumlah 1."""
    if w is None:
        w = [1.0] * len(xs)
    ps = [(x, b) for x, b in zip(xs, w) if x is not None and isinstance(x, (int, float)) and math.isfinite(x) and b > 0]
    s = sum(b for _, b in ps)
    return [(x, b / s) for x, b in ps] if s > 0 else []


def lewat(xs, ambang, w=None):
    """P(x >= ambang). None bila tidak ada anggota sah."""
    ps = _bersih(xs, w)
    return round(sum(b for x, b in ps if x >= ambang), 4) if ps else None


def persentil(xs, q, w=None):
    """Persentil berbobot (q 0..100), interpolasi linier pada titik tengah bobot kumulatif."""
    ps = sorted(_bersih(xs, w))
    if not ps:
        return None
    if len(ps) == 1:
        return ps[0][0]
    c, tengah = 0.0, []
    for x, b in ps:
        tengah.append((c + b / 2, x))
        c += b
    t = q / 100
    if t <= tengah[0][0]:
        return tengah[0][1]
    for (c0, x0), (c1, x1) in zip(tengah, tengah[1:]):
        if t <= c1:
            return x0 + (x1 - x0) * (t - c0) / (c1 - c0) if c1 > c0 else x1
    return tengah[-1][1]


def hari(t, xs, ambang, w=None, desimal=1):
    """Satu entri hari: peluang per ambang + p10/p50/p90."""
    r = lambda v: None if v is None else round(v, desimal)
    return {"t": t, "p": [lewat(xs, a, w) for a in ambang],
            "p10": r(persentil(xs, 10, w)), "p50": r(persentil(xs, 50, w)), "p90": r(persentil(xs, 90, w))}


def bobot_obs(pred, obs, sigma=0.35):
    """Bobot tiap skenario dari kecocokannya dengan satu bacaan alat ukur (galat lognormal, sigma dalam ln).
    Mengembalikan (bobot ternormal, ESS). Skenario tanpa prediksi berbobot 0. ESS kecil = alat ukur menolak
    hampir semua skenario; pemanggil wajib jatuh ke bobot sama bila ESS < ambang minimalnya."""
    lw = []
    for p in pred:
        if p is None or obs is None or p <= 0 or obs <= 0:
            lw.append(None)
        else:
            lw.append(-0.5 * ((math.log(p) - math.log(obs)) / sigma) ** 2)
    sah = [x for x in lw if x is not None]
    if not sah:
        return [1.0 / len(pred)] * len(pred), float(len(pred))
    m = max(sah)
    w = [0.0 if x is None else math.exp(x - m) for x in lw]
    s = sum(w)
    w = [x / s for x in w]
    return w, round(1.0 / sum(x * x for x in w), 1)


def tanggal(t):
    d = dt.date.fromisoformat(t)
    return f"{HARI[d.weekday()]}, {d.day} {BULAN[d.month - 1]}"


def persen(p):
    if p is None:
        return "-"
    if 0 < p < 0.005:
        return "<1%"
    if 0.995 <= p < 1 or p == 1:
        return ">99%"
    return f"{round(p * 100)}%"


def vonis(hari_list, ambang, i, kejadian, tempat, n_hari=None):
    """Kalimat jawaban di atas angka, dari ambang ke-i. kejadian: frasa kata benda ("hujan 50 mm atau lebih"),
    tempat: "di Kabupaten X" / "di Indonesia". Contoh keluaran:
    'Dalam 7 hari ke depan, hujan 50 mm atau lebih di Kota Bogor cukup mungkin terjadi: peluang tertinggi 55%, pada Rabu, 21 Oktober.'
    n_hari: horizon yang ditulis di kalimat bila pemanggil sudah membuang hari tak terpercaya dari hari_list."""
    hs = [h for h in hari_list if h["p"][i] is not None]
    if not hs:
        return ""
    n = n_hari or len(hari_list)
    puncak = max(hs, key=lambda h: h["p"][i])
    p = puncak["p"][i]
    kata = next(k for b, k in KATA if p < b)
    if p == 0:
        return f"Dalam {n} hari ke depan, {kejadian} {tempat} tidak muncul di satu skenario pun."
    return (f"Dalam {n} hari ke depan, {kejadian} {tempat} {kata} terjadi: "
            f"peluang tertinggi {persen(p)}, pada {tanggal(puncak['t'])}.")


def berkas(bencana, sumber, anggota, besaran, ambang, wilayah, batasan, uji_balik=None):
    d = {"versi": VERSI, "bencana": bencana, "dibuat": dt.datetime.now(dt.timezone.utc).replace(microsecond=0).isoformat(),
         "sumber": sumber, "anggota": anggota, "besaran": besaran, "ambang": ambang, "wilayah": wilayah, "batasan": batasan}
    if uji_balik:
        d["uji_balik"] = uji_balik
    galat = periksa(d)
    if galat:
        raise ValueError("kontrak peluang/1 dilanggar: " + "; ".join(galat[:5]))
    return d


def periksa(d):
    """Daftar galat kontrak (kosong = sah)."""
    g = []
    if d.get("versi") != VERSI:
        g.append("versi bukan " + VERSI)
    for k in ("bencana", "dibuat", "sumber", "besaran", "ambang", "wilayah", "batasan"):
        if k not in d:
            g.append("tanpa " + k)
    if g:
        return g
    if re.search(r"\.json|\d{4}-\d\d-\d\dT", str(d["sumber"])) or len(str(d["sumber"])) > 90:
        g.append("sumber harus nama lembaga/data singkat untuk layar (tanpa nama berkas, jam ISO, > 90 huruf)")
    if not d["batasan"] or not all(isinstance(s, str) and s.strip() for s in d["batasan"]):
        g.append("batasan kosong")
    na = len(d["ambang"])
    nilai = [a.get("nilai") for a in d["ambang"]]
    if na == 0 or any(not isinstance(v, (int, float)) for v in nilai) or nilai != sorted(nilai):
        g.append("ambang kosong / tidak urut naik")
    if not d["wilayah"]:
        g.append("wilayah kosong")
    for kode, w in d["wilayah"].items():
        if "(" in str(w.get("nama", "")):
            g.append(f"{kode}: nama wilayah berkurung, penjelasan masuk batasan")
        if not w.get("nama") or not w.get("hari"):
            g.append(f"{kode}: tanpa nama/hari")
            continue
        tgl = [h["t"] for h in w["hari"]]
        if tgl != sorted(tgl) or len(set(tgl)) != len(tgl):
            g.append(f"{kode}: tanggal tidak urut/unik")
        for h in w["hari"]:
            ps = h.get("p", [])
            if len(ps) != na:
                g.append(f"{kode} {h.get('t')}: jumlah peluang != jumlah ambang")
                break
            sah = [p for p in ps if p is not None]
            if any(not 0 <= p <= 1 for p in sah):
                g.append(f"{kode} {h['t']}: peluang di luar 0..1")
                break
            # ambang lebih parah tidak boleh lebih mungkin (toleransi pembulatan)
            if any(b > a + 1e-6 for a, b in zip(sah, sah[1:])):
                g.append(f"{kode} {h['t']}: peluang naik di ambang lebih parah")
                break
            q = [h.get(k) for k in ("p10", "p50", "p90")]
            if all(v is not None for v in q) and not q[0] <= q[1] <= q[2]:
                g.append(f"{kode} {h['t']}: p10 <= p50 <= p90 dilanggar")
                break
    return g


def uji():
    xs = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
    assert lewat(xs, 5) == 0.5 and lewat(xs, 100) == 0 and lewat([None, None], 1) is None
    assert lewat([1, None, 3], 2) == 0.5, "None dibuang, bukan dihitung nol"
    assert persentil(xs, 50) == 4.5 and persentil([7], 90) == 7 and persentil([], 50) is None
    assert persentil(xs, 0) == 0 and persentil(xs, 100) == 9
    # bobot: semua massa di anggota 9 -> persentil berapa pun = 9, peluang >=5 = 1
    w = [0] * 9 + [1]
    assert persentil(xs, 10, w) == 9 and lewat(xs, 5, w) == 1
    # bobot_obs: skenario yang tepat sama dengan bacaan berbobot terbesar; ESS turun bila skenario menyebar
    b, ess = bobot_obs([10, 50, 51, 200], 50)
    assert b.index(max(b)) == 1 and abs(sum(b) - 1) < 1e-9 and 1 <= ess <= 4
    b2, ess2 = bobot_obs([50, 50, 50, 50], 50)
    assert ess2 == 4.0
    bn, essn = bobot_obs([None, None], 50)
    assert bn == [0.5, 0.5], "tanpa prediksi sah -> bobot sama"
    h = [hari("2026-10-20", [0, 0, 10, 60, 120], [50, 100]), hari("2026-10-21", [0] * 5, [50, 100])]
    assert h[0]["p"] == [0.4, 0.2] and h[0]["p50"] == 10
    v = vonis(h, [50, 100], 0, "hujan 50 mm atau lebih", "di Kota Bogor")
    assert v == "Dalam 2 hari ke depan, hujan 50 mm atau lebih di Kota Bogor cukup mungkin terjadi: peluang tertinggi 40%, pada Selasa, 20 Oktober.", v
    assert vonis(h[:1], [50, 100], 0, "x", "di y", n_hari=3).startswith("Dalam 3 hari")
    assert "tidak muncul" in vonis([h[1]], [50, 100], 0, "hujan lebat", "di sini")
    assert persen(0.004) == "<1%" and persen(0) == "0%" and persen(0.555) == "56%" and persen(1) == ">99%" and persen(0.007) == "1%"
    am = [{"k": "lebat", "label": "Hujan 50 mm atau lebih", "nilai": 50}, {"k": "sl", "label": "Hujan 100 mm atau lebih", "nilai": 100}]
    d = berkas("banjir", "uji", 5, {"label": "Hujan harian", "satuan": "mm", "desimal": 0}, am,
               {"32.71": {"nama": "Kota Bogor", "tingkat": "kabupaten", "hari": h, "vonis": v}}, ["Uji saja."])
    assert periksa(d) == []
    rusak = json.loads(json.dumps(d))
    rusak["wilayah"]["32.71"]["hari"][0]["p"] = [0.1, 0.3]
    assert any("lebih parah" in x for x in periksa(rusak))
    rusak["sumber"] = "ECMWF (hujan_ansambel.json, dibuat 2026-10-19T08:00)"
    assert any("sumber" in x for x in periksa(rusak))
    rusak["batasan"] = []
    assert any("batasan" in x for x in periksa(rusak))
    try:
        berkas("x", "s", 1, {}, [], {}, [])
        assert False, "berkas() harus menolak kontrak kosong"
    except ValueError:
        pass
    print("peluang.py: uji lulus")


if __name__ == "__main__":
    if sys.argv[1:2] == ["uji"]:
        uji()
    elif sys.argv[1:2] == ["periksa"] and len(sys.argv) > 2:
        g = periksa(json.load(open(sys.argv[2])))
        print("\n".join(g) or "sah")
        sys.exit(1 if g else 0)
    else:
        print(__doc__)
