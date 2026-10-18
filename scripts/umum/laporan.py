"""Penulis + validator public/<id>/data/laporan.json (kontrak v1: docs/multi-bencana/LAPORAN-HARIAN.md).

Pakai:  python3 scripts/umum/laporan.py uji            self-check (tanpa menyentuh berkas)
        python3 scripts/umum/laporan.py periksa <berkas>  cetak galat, keluar 1 bila ada
"""
import datetime as dt
import importlib.util
import json
import math
import os
import sys

AKAR = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "../.."))
BATAS_BYTE = 400 * 1024
AGREGAT = ("jumlah", "maks", "rerata")
ARAH = ("naik_buruk", "naik_baik", "netral")
TINGKAT = ("awas", "siaga", "waspada", "info")


def _muat(nama, *jalur):
    """Muat modul dari jalur pertama yang ada, dengan nama unik (hindari tabrakan nama berkas)."""
    for j in jalur:
        p = os.path.join(AKAR, j)
        if os.path.exists(p):
            s = importlib.util.spec_from_file_location("umum_laporan_" + nama, p)
            m = importlib.util.module_from_spec(s)
            s.loader.exec_module(m)
            return m
    return None


# ponytail: wilayah.py/simpan.py bersama belum lahir di scripts/umum (FASE-0 B); sementara jatuh ke
# salinan scripts/data/wilayah.py dan penulis atomik lokal. Hapus fallback ini saat modul bersama ada.
_w = _muat("wilayah", "scripts/umum/wilayah.py", "scripts/data/wilayah.py")
PROVINSI = _w.PROVINSI
_simpan = _muat("simpan", "scripts/umum/simpan.py")


def _angka(x):
    return isinstance(x, (int, float)) and not isinstance(x, bool) and math.isfinite(x)


def _iso(s):
    try:
        return dt.date.fromisoformat(s) if isinstance(s, str) and len(s) == 10 else None
    except ValueError:
        return None


def _hari_naik(h, lo, hi, nama):
    g = []
    if not isinstance(h, list) or not lo <= len(h) <= hi:
        return [f"{nama} panjang {len(h) if isinstance(h, list) else '?'}, harus {lo}..{hi}"]
    t = [_iso(x) for x in h]
    if None in t:
        return [f"{nama} berisi tanggal bukan ISO: {[x for x, y in zip(h, t) if y is None][:3]}"]
    for a, b in zip(h, h[1:]):
        if not a < b:
            g.append(f"{nama} tidak naik: {a} lalu {b}")
    return g


def periksa(d):
    """Daftar galat (list of str); kosong berarti sah."""
    if not isinstance(d, dict):
        return ["laporan bukan objek"]
    g = []
    if d.get("v") != 1:
        g.append(f"v={d.get('v')!r}, harus 1")
    for k in ("bencana", "judul", "dibuat", "cutoff"):
        if not isinstance(d.get(k), str) or not d[k]:
            g.append(f"{k} harus string tak kosong")
    hari = d.get("hari")
    gh = _hari_naik(hari, 7, 120, "hari")
    g += gh
    n = len(hari) if not gh else None
    if n and d.get("hari_lengkap") not in hari:
        g.append(f"hari_lengkap {d.get('hari_lengkap')!r} tidak ada di hari")

    # metrik
    mt = d.get("metrik")
    kunci, spec = [], {}
    if not isinstance(mt, list) or not 1 <= len(mt) <= 6:
        g.append(f"metrik panjang {len(mt) if isinstance(mt, list) else '?'}, harus 1..6")
        mt = []
    for m in mt:
        k = m.get("k") if isinstance(m, dict) else None
        if not isinstance(k, str) or not k or k in spec:
            g.append(f"metrik k={k!r} kosong atau ganda")
            continue
        spec[k] = m
        kunci.append(k)
        for f in ("label", "satuan"):
            if not isinstance(m.get(f), str):
                g.append(f"metrik {k}: {f} harus string")
        if m.get("agregat") not in AGREGAT:
            g.append(f"metrik {k}: agregat {m.get('agregat')!r} bukan {AGREGAT}")
        if m.get("arah") not in ARAH:
            g.append(f"metrik {k}: arah {m.get('arah')!r} bukan {ARAH}")
        if not isinstance(m.get("desimal"), int) or isinstance(m.get("desimal"), bool) or not 0 <= m["desimal"] <= 6:
            g.append(f"metrik {k}: desimal {m.get('desimal')!r} harus bilangan bulat 0..6")
    nu = sum(1 for m in spec.values() if m.get("utama") is True)
    if spec and nu != 1:
        g.append(f"metrik utama ada {nu}, harus tepat 1")

    def seri(ket, o, ada_nama=False):
        if not isinstance(o, dict):
            g.append(f"{ket} bukan objek")
            return
        for k in kunci:
            a = o.get(k)
            if not isinstance(a, list):
                g.append(f"{ket} metrik {k} hilang atau bukan array")
                continue
            if n is not None and len(a) != n:
                g.append(f"{ket} metrik {k} panjang {len(a)}, harus {n}")
            for i, x in enumerate(a):
                if x is None:
                    continue
                if not _angka(x):
                    g.append(f"{ket} metrik {k}[{i}]={x!r} bukan angka")
                    break
                if x < 0 and spec[k].get("arah") != "netral":
                    g.append(f"{ket} metrik {k}[{i}]={x} negatif padahal arah bukan netral")
                    break

    seri("nasional", d.get("nasional"))
    prov = d.get("prov")
    if not isinstance(prov, dict):
        g.append("prov bukan objek")
        prov = {}
    for kp, o in prov.items():
        if kp not in PROVINSI:
            g.append(f"prov {kp!r} tidak dikenal di batas Kemendagri")
        seri(f"prov {kp}", o)
        if isinstance(o, dict) and not isinstance(o.get("nama"), str):
            g.append(f"prov {kp} tanpa nama")

    kab = d.get("kab")
    if not isinstance(kab, list):
        g.append("kab bukan array")
        kab = []
    jml = {}
    for i, o in enumerate(kab):
        if not isinstance(o, dict):
            g.append(f"kab[{i}] bukan objek")
            continue
        ket = f"kab {o.get('kode')}"
        if o.get("prov") not in prov:
            g.append(f"{ket}: prov {o.get('prov')!r} tidak ada di prov")
        kode = o.get("kode")
        if not (isinstance(kode, str) and len(kode) == 4 and kode.isdigit() and kode[:2] == o.get("prov")):
            g.append(f"{ket}: kode harus 4 digit berawalan kode prov {o.get('prov')!r}")
        if not isinstance(o.get("nama"), str):
            g.append(f"{ket}: nama harus string")
        seri(ket, o)
        for k in kunci:
            a = o.get(k)
            if spec[k].get("agregat") == "jumlah" and isinstance(a, list) and o.get("prov") in prov:
                s = jml.setdefault((o["prov"], k), [0.0] * len(a))
                for j, x in enumerate(a[:len(s)]):
                    s[j] += x if _angka(x) else 0
    for (kp, k), s in jml.items():
        a = prov[kp].get(k) if isinstance(prov.get(kp), dict) else None
        if not isinstance(a, list):
            continue
        for j, v in enumerate(s):
            pv = a[j] if j < len(a) and _angka(a[j]) else 0
            if v > pv + 1e-6:
                g.append(f"prov {kp} metrik {k} hari ke-{j}: jumlah kab {v:g} melebihi nilai prov {pv:g}")
                break

    # sorot
    so = d.get("sorot", [])
    if not isinstance(so, list) or len(so) > 8:
        g.append(f"sorot panjang {len(so) if isinstance(so, list) else '?'}, maks 8")
    else:
        for i, s in enumerate(so):
            if not isinstance(s, dict) or s.get("tingkat") not in TINGKAT:
                g.append(f"sorot[{i}] tingkat {s.get('tingkat') if isinstance(s, dict) else s!r} bukan {TINGKAT}")
            elif not isinstance(s.get("judul"), str) or not isinstance(s.get("teks"), str):
                g.append(f"sorot[{i}] judul dan teks harus string")
            elif s.get("prov") is not None and s["prov"] not in PROVINSI:
                g.append(f"sorot[{i}] prov {s['prov']!r} tidak dikenal")

    # prakiraan
    p = d.get("prakiraan")
    if p is not None:
        gp = _hari_naik(p.get("hari") if isinstance(p, dict) else None, 1, 7, "prakiraan.hari")
        g += gp
        if isinstance(p, dict) and not gp:
            for i, b in enumerate(p.get("baris", [])):
                v = b.get("nilai") if isinstance(b, dict) else None
                if not isinstance(v, list) or len(v) != len(p["hari"]):
                    g.append(f"prakiraan.baris[{i}] nilai panjang {len(v) if isinstance(v, list) else '?'}, harus {len(p['hari'])}")
                elif any(x is not None and (not _angka(x) or x < 0) for x in v):
                    g.append(f"prakiraan.baris[{i}] nilai harus angka >= 0 atau null")

    # tambahan, sumber
    for i, t in enumerate(d.get("tambahan", [])):
        kol, bar = t.get("kolom"), t.get("baris")
        if not isinstance(kol, list) or not isinstance(bar, list):
            g.append(f"tambahan[{i}] kolom/baris harus array")
        else:
            for r in bar:
                if not isinstance(r, list) or len(r) != len(kol):
                    g.append(f"tambahan[{i}] baris panjang {len(r) if isinstance(r, list) else '?'}, harus {len(kol)} (jumlah kolom)")
                    break
    for i, s in enumerate(d.get("sumber", [])):
        if not isinstance(s, dict) or not isinstance(s.get("nama"), str):
            g.append(f"sumber[{i}] harus objek dengan nama")

    nb = len(json.dumps(d, ensure_ascii=False, separators=(",", ":")).encode())
    if nb > BATAS_BYTE:
        g.append(f"ukuran {nb} byte melebihi {BATAS_BYTE}")
    return g


def _bulat(a, des):
    return [None if x is None else (round(x, des) if des else int(round(x))) for x in a]


def susun(id, judul, hari, metrik, nasional, prov, kab, *, cutoff, hari_lengkap, sorot=(), prakiraan=None, tambahan=(), sumber=(), dibuat=None):
    """Bangun dict v1. Nama provinsi diisi dari Kemendagri bila kosong; angka dibulatkan sesuai `desimal`."""
    des = {m["k"]: m.get("desimal", 0) for m in metrik}

    def bulat(o):
        o = dict(o)
        for k, dk in des.items():
            if k in o:
                o[k] = _bulat(o[k], dk)
        return o

    if dibuat is None:
        dibuat = dt.datetime.now(dt.timezone(dt.timedelta(hours=7))).strftime("%Y-%m-%dT%H:%M+07:00")
    d = {"v": 1, "bencana": id, "judul": judul, "dibuat": dibuat, "cutoff": cutoff, "hari": list(hari),
         "hari_lengkap": hari_lengkap, "metrik": list(metrik), "nasional": bulat(nasional)}
    d["prov"] = {}
    for kp in sorted(prov):
        o = bulat(prov[kp])
        o["nama"] = o.get("nama") or PROVINSI.get(kp, kp)
        d["prov"][kp] = {"nama": o.pop("nama"), **o}
    d["kab"] = [bulat(o) for o in sorted(kab, key=lambda o: (o["prov"], o["kode"]))]
    d["sorot"] = list(sorot)
    if prakiraan is not None:
        d["prakiraan"] = prakiraan
    if tambahan:
        d["tambahan"] = list(tambahan)
    d["sumber"] = list(sumber)
    return d


def dari_kejadian(baris, hari, metrik_spec):
    """Kejadian -> (nasional, prov, kab).

    baris: [{hari, prov, kab_kode, kab_nama, <nilai>...}]; prov/kab_kode boleh kosong (laut: hanya nasional).
    metrik_spec: [{k, agregat, dari?}]; `dari` = nama medan nilai; tanpa `dari` pada agregat jumlah = hitung kejadian.
    Hari tanpa kejadian: jumlah = 0, maks/rerata = None. prov/kab hanya memuat yang punya kejadian.
    prov: {kode: {k: [...]}}; kab: [{prov, kode, nama, k: [...]}] (nama prov diisi susun).
    """
    idx = {h: i for i, h in enumerate(hari)}
    # kunci grup -> {k: [list nilai per hari]}
    grup = {}

    def sel(kunci):
        return grup.setdefault(kunci, {m["k"]: [[] for _ in hari] for m in metrik_spec})

    nama_kab = {}
    for r in baris:
        i = idx.get(r.get("hari"))
        if i is None:
            continue
        kunci = [("n",)]
        if r.get("prov"):
            kunci.append(("p", r["prov"]))
            if r.get("kab_kode"):
                kunci.append(("k", r["prov"], r["kab_kode"]))
                nama_kab[r["kab_kode"]] = r.get("kab_nama") or r["kab_kode"]
        for m in metrik_spec:
            f = m.get("dari")
            v = 1 if f is None and m["agregat"] == "jumlah" else r.get(f or m["k"])
            if v is None:
                continue
            for kk in kunci:
                sel(kk)[m["k"]][i].append(v)

    def kurangi(lst, agregat):
        if agregat == "jumlah":
            return sum(lst)
        if not lst:
            return None
        return max(lst) if agregat == "maks" else sum(lst) / len(lst)

    def seri(kk):
        s = sel(kk)
        return {m["k"]: [kurangi(x, m["agregat"]) for x in s[m["k"]]] for m in metrik_spec}

    nas = seri(("n",))
    prov = {kk[1]: seri(kk) for kk in sorted(grup) if kk[0] == "p"}
    kab = [{"prov": kk[1], "kode": kk[2], "nama": nama_kab[kk[2]], **seri(kk)} for kk in sorted(grup) if kk[0] == "k"]
    return nas, prov, kab


def tulis(id, d):
    """periksa dulu; galat -> ValueError berisi semuanya. Simpan ke public/<id>/data/laporan.json."""
    g = periksa(d)
    if g:
        raise ValueError(f"laporan {id} ditolak ({len(g)} galat):\n- " + "\n- ".join(g))
    jalur = os.path.join(AKAR, "public", id, "data", "laporan.json")
    if _simpan is not None:
        _simpan.simpan_json(jalur, d)
    else:
        os.makedirs(os.path.dirname(jalur), exist_ok=True)
        with open(jalur + ".tmp", "w", encoding="utf-8") as f:  # dict `dibuat` sudah kunci pertama
            json.dump(d, f, ensure_ascii=False, separators=(",", ":"))
        os.replace(jalur + ".tmp", jalur)
    return jalur


def _contoh():
    hari = [(dt.date(2026, 10, 5) + dt.timedelta(days=i)).isoformat() for i in range(14)]
    ms = [{"k": "kejadian", "label": "Gempa M>=3", "satuan": "kejadian", "utama": True, "agregat": "jumlah", "arah": "naik_buruk", "desimal": 0},
          {"k": "mag", "label": "M maks", "satuan": "M", "agregat": "maks", "arah": "naik_buruk", "desimal": 1}]
    baris = [{"hari": hari[13], "prov": "72", "kab_kode": "7203", "kab_nama": "Kab. Donggala", "mag": 5.14},
             {"hari": hari[13], "prov": "72", "kab_kode": "7203", "kab_nama": "Kab. Donggala", "mag": 3.2},
             {"hari": hari[12], "prov": "72", "mag": 4.0},
             {"hari": hari[12], "prov": None, "mag": 3.1}]
    n, p, k = dari_kejadian(baris, hari, ms)
    return susun("gempa", "Laporan Harian Gempa Bumi", hari, ms, n, p, k, cutoff="2026-10-18T14:03+07:00",
                 hari_lengkap=hari[12], dibuat="2026-10-18T17:03+07:00",
                 sorot=[{"tingkat": "info", "judul": "j", "teks": "t", "prov": "72"}],
                 sumber=[{"nama": "BMKG", "url": "https://x", "catatan": "c"}])


def uji():
    import copy
    d = _contoh()
    assert periksa(d) == [], periksa(d)
    assert d["prov"]["72"]["nama"] == "Sulawesi Tengah"
    assert list(d)[:3] == ["v", "bencana", "judul"]

    def tolak(ubah, potong):
        x = copy.deepcopy(d)
        ubah(x)
        g = periksa(x)
        assert any(potong in e for e in g), (potong, g)

    tolak(lambda x: x["nasional"]["kejadian"].pop(), "panjang 13, harus 14")
    tolak(lambda x: x["prov"]["72"]["mag"].append(1), "panjang 15, harus 14")
    tolak(lambda x: x["metrik"][1].update(utama=True), "utama ada 2")
    tolak(lambda x: x["metrik"][0].update(utama=False), "utama ada 0")
    tolak(lambda x: x["prov"].update({"99": copy.deepcopy(x["prov"]["72"])}), "prov '99' tidak dikenal")
    tolak(lambda x: x["kab"][0].update(prov="14"), "tidak ada di prov")
    tolak(lambda x: x["kab"][0]["kejadian"].__setitem__(13, 50), "melebihi nilai prov")
    tolak(lambda x: x["nasional"]["kejadian"].__setitem__(0, -1), "negatif")
    tolak(lambda x: x["sorot"][0].update(tingkat="gawat"), "bukan")
    tolak(lambda x: x["hari"].__setitem__(5, x["hari"][3]), "tidak naik")
    tolak(lambda x: x.update(hari_lengkap="2020-01-01"), "hari_lengkap")
    tolak(lambda x: x.update(sorot=[x["sorot"][0]] * 9), "maks 8")
    tolak(lambda x: x.update(tambahan=[{"id": "a", "judul": "j", "kolom": ["a", "b"], "baris": [[1]]}]), "jumlah kolom")
    tolak(lambda x: x["sumber"].append("polos"), "sumber[1]")
    x = copy.deepcopy(d)  # netral boleh negatif
    x["metrik"][1]["arah"] = "netral"
    x["nasional"]["mag"][0] = -2
    assert periksa(x) == []
    try:
        tulis("gempa", {"v": 2})
        raise SystemExit("tulis harus menolak")
    except ValueError as e:
        assert "ditolak" in str(e)

    # dari_kejadian: jumlah/maks/rerata, hari kosong
    hari = ["2026-10-01", "2026-10-02", "2026-10-03"]
    ms = [{"k": "n", "agregat": "jumlah"}, {"k": "mx", "agregat": "maks", "dari": "m"},
          {"k": "rt", "agregat": "rerata", "dari": "m"}, {"k": "kor", "agregat": "jumlah", "dari": "korban"}]
    b = [{"hari": hari[0], "prov": "72", "kab_kode": "7203", "kab_nama": "A", "m": 4, "korban": 2},
         {"hari": hari[0], "prov": "72", "kab_kode": "7204", "kab_nama": "B", "m": 6, "korban": 3},
         {"hari": hari[2], "prov": "72", "m": 5, "korban": 1},
         {"hari": "2099-01-01", "prov": "72", "m": 9}]
    n, p, k = dari_kejadian(b, hari, ms)
    assert n == {"n": [2, 0, 1], "mx": [6, None, 5], "rt": [5, None, 5], "kor": [5, 0, 1]}, n
    assert p["72"]["n"] == [2, 0, 1] and set(p) == {"72"}
    assert [(o["kode"], o["n"]) for o in k] == [("7203", [1, 0, 0]), ("7204", [1, 0, 0])], k
    print("laporan.py uji: lulus")


if __name__ == "__main__":
    if sys.argv[1:2] == ["periksa"] and len(sys.argv) > 2:
        gal = periksa(json.load(open(sys.argv[2], encoding="utf-8")))
        print("\n".join(gal) or "sah")
        sys.exit(1 if gal else 0)
    uji()
