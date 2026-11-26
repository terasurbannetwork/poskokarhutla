"""Leksikon berita pemulihan (RRP-2): angka huntara, huntap, DTH, stimulan dari judul/cuplikan berita.

Pakai:  python3 scripts/berita/pemulihan.py --cek     presisi + recall per medan pada tests/bnpb/fixtures/pemulihan_30.json
Pustaka: usulan(artikel) -> daftar baris usulan, tiap baris berlabel "sekunder" dengan url dan tanggal.

Arti medan: ANGKA YANG DISEBUT BERITA, bukan kemajuan pembangunan dan bukan angka resmi. Baris usulan WAJIB
tampil bersama `kutipan` (potongan teks sumber), `url`, `tgl`; staf yang memutuskan. Kolom `basis` untuk rupiah:
per_penerima ("per KK"), total ("senilai/total/sebesar"), tak_jelas; untuk unit: jumlah.

Aturan: angka hanya bila ada kutipan teks sumber; kosong tidak pernah 0; nilai tak pasti -> None, tidak dikeluarkan
(rupiah tanpa satuan dan di bawah 10.000, "1,500" yang bisa berarti dua hal, dll.); kata bilangan ("tiga"), tahun
(1990-2100 tanpa pemisah ribuan), rentang ("100 s.d. 200"), nomor telepon ditolak; satu medan dengan dua angka berbeda
dalam satu artikel dibuang (ambigu); satu "Rp" hanya untuk satu medan, ke kata kunci terdekat (seri = dibuang).

Ambang --cek: PRESISI_MIN = 1.0 per medan yang punya prediksi (gagal bila turun): usulan masuk antrean staf sebagai
angka sekunder, angka salah lebih mahal daripada angka terlewat. Hitungan per KEJADIAN unik (duplikat berita lintas
media dikelompokkan lewat `kejadian` di fixture). Medan dengan positif < MIN_POSITIF (5) kejadian dicetak "tidak
terukur (n=..)" dan usulannya berstatus "hipotesis", bukan "teruji"; TERUJI sengaja kosong sampai fixture memuat
>= 5 kejadian positif per medan. Recall < 0,8 hanya peringatan. Python 3.12 stdlib saja.
"""
import html
import json
import os
import re
import sys
from fractions import Fraction

_AKAR = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "../.."))
FIXTURE = os.path.join(_AKAR, "tests/bnpb/fixtures/pemulihan_30.json")
PRESISI_MIN = 1.0
RECALL_MIN = 0.8
MIN_POSITIF = 5
TERUJI = frozenset()   # medan yang lulus >= MIN_POSITIF kejadian; diisi manual hanya sesudah --cek membuktikannya

_ANGKA = r"(?<![\d.,])(\d{1,3}(?:\.\d{3})+|\d+)"
_TAG = re.compile(r"<[^>]*>")
_TELP = re.compile(r"(?<![\d.,])(?:\+62|62|0)8\d{1,3}[\s.-]?\d{3,4}[\s.-]?\d{3,5}(?!\d)"
                   r"|\(0\d{2,3}\)\s?\d{5,8}|(?<![\d.,])0\d{2,3}[\s-]\d{3,}(?:[\s-]\d{2,})*")
_UNIT = re.compile(_ANGKA + r"\s+(?:unit\s+|buah\s+)?(?:rumah\s+)?(huntara|huntap|hunian\s+sementara|hunian\s+tetap)\b", re.I)
_RENTANG = re.compile(r"(?:-|–|s\.?\s?d\.?|sampai|hingga)\s*$", re.I)
_KUNCI = {"stimulan_rp": re.compile(r"stimulan", re.I), "dth_nilai": re.compile(r"dana\s+tunggu\s+hunian|\bDTH\b", re.I)}
_RP = re.compile(r"Rp\.?\s?(\d+(?:[.,]\d+)*)(?:\s*(ribu|rb|juta|jt|miliar|milyar|triliun|(?-i:M|T))(?![A-Za-z]))?", re.I)
_SKALA = {"ribu": 10**3, "rb": 10**3, "juta": 10**6, "jt": 10**6, "miliar": 10**9, "milyar": 10**9, "m": 10**9,
          "triliun": 10**12, "t": 10**12}
_JARAK = 40   # huruf maksimum antara kata kunci dan "Rp"
_PER = re.compile(r"\s*(?:per|/)\s*(?:kk|kepala\s+keluarga|rumah|unit|keluarga|jiwa|orang|penerima)\b", re.I)
_TOTAL = re.compile(r"(?:senilai|total|sebesar|sejumlah)\s*$", re.I)
_PER_DEPAN = re.compile(r"per\s+(?:kk|kepala\s+keluarga|rumah|unit|keluarga|jiwa|orang|penerima)\W*$", re.I)


def bersih(t):
    """Buang tag HTML dan nomor telepon; rapikan spasi."""
    t = html.unescape(_TAG.sub(" ", t or ""))
    return re.sub(r"\s+", " ", _TELP.sub(" ", t)).strip()


def _int(s):
    return int(s.replace(".", "")) if re.fullmatch(r"\d{1,3}(?:\.\d{3})+|\d+", s) else None


def _desimal(s):
    """'2.5' '2,5' '1.500.000' '1.200,5' -> Fraction; pemisah tak pasti -> None."""
    d, c = "." in s, "," in s
    if d and c:
        dec = "." if s.rfind(".") > s.rfind(",") else ","
        th = "," if dec == "." else "."
        ip, fp = s.rsplit(dec, 1)
        if dec in ip or not re.fullmatch(r"\d{1,3}(?:%s\d{3})*" % re.escape(th), ip):
            return None
        return Fraction(ip.replace(th, "") + "." + fp)
    sep = "." if d else "," if c else None
    if sep is None:
        return Fraction(s)
    p = s.split(sep)
    if len(p) > 2:   # beberapa pemisah sama: ribuan, kelompok tepat 3 digit
        return Fraction("".join(p)) if 1 <= len(p[0]) <= 3 and all(len(x) == 3 for x in p[1:]) else None
    a, b = p
    if len(b) == 3:  # "2.500" = ribuan (id); "2,500" ambigu
        return Fraction(a + b) if sep == "." and 1 <= len(a) <= 3 else None
    return Fraction(a + "." + b)


def _rupiah(m):
    v = _desimal(m.group(1))
    u = m.group(2)
    if v is None:
        return None
    if u is None:
        if v < 10000 and not re.search(r"[.,]", m.group(1)):   # "Rp 5" tanpa satuan: tak masuk akal, tak pasti
            return None
        return int(v) if v.denominator == 1 else None
    r = v * _SKALA[u.lower()]
    return int(r) if r.denominator == 1 else None


def _basis(t, m):
    if _PER.match(t[m.end():m.end() + 25]) or _PER_DEPAN.search(t[max(0, m.start() - 25):m.start()]):
        return "per_penerima"
    return "total" if _TOTAL.search(t[max(0, m.start() - 20):m.start()]) else "tak_jelas"


def _jarak(a0, a1, b0, b1):
    return max(0, a0 - b1, b0 - a1)


def ekstrak(teks):
    """{medan: (nilai, kutipan, basis)}; medan tanpa bukti atau ambigu tidak muncul."""
    t = bersih(teks)
    kand = {}   # medan -> [(nilai, kutipan, basis)]
    for m in _UNIT.finditer(t):
        v = _int(m.group(1))
        if not v or (1990 <= v <= 2100 and "." not in m.group(1)) or _RENTANG.search(t[:m.start()]):
            continue
        k = m.group(2).lower()
        md = "huntara_unit" if k.startswith(("huntara", "hunian sementara")) else "huntap_unit"
        kand.setdefault(md, []).append((v, m.group(0), "jumlah"))
    kws = [(md, k.start(), k.end()) for md, r in _KUNCI.items() for k in r.finditer(t)]
    for rp in _RP.finditer(t):
        d = sorted((_jarak(s, e, rp.start(), rp.end()), md, s, e) for md, s, e in kws)
        d = [x for x in d if x[0] <= _JARAK]
        if not d or (len(d) > 1 and d[0][0] == d[1][0] and d[0][1] != d[1][1]):
            continue   # tak ada kata kunci, atau seri antar-medan: ambigu
        v = _rupiah(rp)
        if v:
            _, md, s, e = d[0]
            kand.setdefault(md, []).append((v, t[min(s, rp.start()):max(e, rp.end())], _basis(t, rp)))
    return {md: c[0] for md, c in kand.items() if len({x[0] for x in c}) == 1}


def usulan(a):
    """Satu artikel {judul, ringkas, url, tgl} -> baris usulan (kosong bila tak ada angka berkutipan)."""
    if not a.get("url") or not a.get("tgl"):
        return []
    return [{"medan": k, "nilai": v, "kutipan": q, "basis": b, "label": "sekunder", "url": a["url"], "tgl": a["tgl"],
             "status": "teruji" if k in TERUJI else "hipotesis"}
            for k, (v, q, b) in ekstrak(f"{a.get('judul', '')}. {a.get('ringkas', '')}").items()]


def _asersi():
    e = ekstrak
    v = lambda s, k: (e(s).get(k) or (None,))[0]   # noqa: E731
    # satuan rupiah
    assert v("Stimulan Rp 2.5 juta", "stimulan_rp") == 2500000
    assert v("Stimulan Rp 2,5 juta", "stimulan_rp") == 2500000
    assert v("Stimulan Rp60 jt", "stimulan_rp") == 60000000
    assert v("Stimulan Rp 1,2 M", "stimulan_rp") == 1200000000
    assert v("Stimulan Rp 500 rb", "stimulan_rp") == 500000
    assert v("Stimulan Rp 15.000.000", "stimulan_rp") == 15000000
    assert v("Stimulan Rp 2.500 juta", "stimulan_rp") == 2500000000
    assert v("Stimulan Rp 1,500 juta", "stimulan_rp") is None      # ambigu
    assert v("Stimulan Rp 5", "stimulan_rp") is None               # tanpa satuan, tak masuk akal
    # tahun, telepon, rentang
    assert e("tahun 2025 huntap 12 unit") == {}
    assert e("pada 2025 huntap dibangun") == {} and e("Dibangun 2025 huntap") == {}
    assert e("Hub 021 5555 1234 huntap") == {}
    assert e("Hubungi 0274-123456 huntap") == {}
    assert e("Hubungi 0812-3456-7890 huntap") == {}
    assert e("100 s.d. 200 huntap") == {} and e("100-200 huntap") == {}
    assert v("2.025 huntap", "huntap_unit") == 2025               # pemisah ribuan: bukan tahun
    # kata kunci terdekat, satu Rp satu medan
    r = e("Rp 60 juta stimulan; dth rp 500 ribu")
    assert r["stimulan_rp"][0] == 60000000 and r["dth_nilai"][0] == 500000, r
    assert e("stimulan Rp 60 juta DTH") == {}                       # seri antar-medan
    # dua angka beda dalam satu artikel: dibuang
    assert e("10 huntara dan 20 huntara") == {} and v("10 huntara dan 10 huntara", "huntara_unit") == 10
    # basis
    assert e("Stimulan Rp 2 juta per KK")["stimulan_rp"][2] == "per_penerima"
    assert e("Stimulan senilai Rp 278 juta")["stimulan_rp"][2] == "total"
    assert e("Stimulan Rp 278 juta")["stimulan_rp"][2] == "tak_jelas"
    # bersih, tanpa-nol, tanpa tgl
    assert "<b>" not in bersih("<b>x</b>") and "0812" not in bersih("hub 0812-3456-7890 ya")
    assert e("Huntap rusak diperbaiki") == {} and e("Stimulan banjir belum cair") == {}
    assert usulan({"judul": "10 huntara", "url": "u"}) == [] and usulan({"judul": "10 huntara", "tgl": "t"}) == []


def cek():
    _asersi()
    arts = json.load(open(FIXTURE, encoding="utf-8"))["artikel"]
    gagal = []
    for md in ["huntara_unit", "huntap_unit", "dth_nilai", "stimulan_rp"]:
        tp, fp, fn = set(), set(), set()
        for a in arts:
            ev = a.get("kejadian") or a["url"]
            u = {x["medan"]: x for x in usulan(a)}.get(md)
            gold = a["label"].get(md)
            if u and gold == u["nilai"]:
                tp.add(ev)
            elif u:
                fp.add((ev, u["nilai"]))
                gagal.append(f"salah {md}: {a['judul']!r} -> {u['nilai']} (label {gold})")
            elif gold is not None:
                fn.add(ev)
                gagal.append(f"terlewat {md}: {a['judul']!r} (label {gold})")
        fn -= tp
        pos = len(tp | fn)
        ukur = pos >= MIN_POSITIF
        pres = f"{len(tp) / (len(tp) + len(fp)):.2f}" if tp or fp else "-"
        rec = f"{len(tp) / pos:.2f}" if pos else "-"
        ket = "" if ukur else f"  TIDAK TERUKUR (n={pos} kejadian < {MIN_POSITIF}); usulan berstatus hipotesis"
        print(f"{md:14s} presisi {pres:>4s}  recall {rec:>4s}  benar {len(tp)} salah {len(fp)} lewat {len(fn)}{ket}")
        if fp and len(tp) / (len(tp) + len(fp)) < PRESISI_MIN:
            print(f"GAGAL: presisi {md} < {PRESISI_MIN}")
            sys.exit(1)
        if ukur and len(tp) / pos < RECALL_MIN:
            print(f"PERINGATAN: recall {md} < {RECALL_MIN}")
        assert md not in TERUJI or ukur, f"{md} ada di TERUJI tanpa {MIN_POSITIF} kejadian positif"
    for g in gagal:
        print(" ", g)
    print(f"OK ({len(arts)} artikel)")


if __name__ == "__main__":
    if "--cek" in sys.argv:
        cek()
    else:
        print(__doc__)
