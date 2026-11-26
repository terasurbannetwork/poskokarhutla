"""Padanan kode kab DIBI (kode BPS, kolom id_kab_bps) -> kode Kemendagri daftar wilayah kita (scripts/udara/kota.json, 514 kab).

Kenapa: DIBI menulis kode BPS. Kode BPS dan Kemendagri berbeda di banyak provinsi, bukan hanya Papua: BPS 1110 = Bireuen,
Kemendagri 1110 = Aceh Singkil; BPS 9412 = Mimika (Papua lama), Kemendagri 9404 = Mimika (Papua Tengah, UU 15/2022).
Mencocokkan kode apa adanya menaruh data satu kab di kab lain tanpa galat, dan membuang kab Papua baru.

Bukti per baris: DIBI sendiri memberi nama kab dan nama provinsi (sudah memakai provinsi baru Papua) untuk tiap id_kab_bps.
Nama itu dicocokkan ke kota.json lewat kunci_nama (scripts/banjir/kejadian.py) di dalam provinsi yang sama; tanpa fuzzy.
Alias hanya dari daftar ALIAS di bawah, masing-masing dengan alasan. Pemekaran 2022 (UU 14, 15, 16/2022; UU 29/2022) memindahkan
kab utuh ke provinsi baru, tidak memecah kab, jadi semua padanan satu ke satu. Kab yang tak cocok masuk "tidak_terpetakan"
berikut alasannya, tidak dibagi rata dan tidak ditebak.

Pakai:  python3 -I scripts/data/padanan_kab_dibi.py bangun   (tarik nama dari Superset DIBI, tulis padanan_kab_dibi.json)
        python3 -I scripts/data/padanan_kab_dibi.py --cek    (tanpa jaringan: uji berkas padanan + ukur pada dibi_kab_tahun.json)
Pemakai:  petakan(kode_bps) -> kode Kemendagri atau None (None = tidak terpetakan; jangan jadikan 0).
"""
import datetime as dt, importlib.util, json, os, sys

AKAR = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "../.."))
BERKAS = os.path.join(AKAR, "scripts/data/padanan_kab_dibi.json")
KOTA = os.path.join(AKAR, "scripts/udara/kota.json")

# nama DIBI -> nama di kota.json, hanya untuk ejaan yang beda; tiap entri wajib beralasan
ALIAS_PROV = {"Daerah Istimewa Yogyakarta": ("34", "nama panjang DIY; kota.json/wilayah.py memakai 'DI Yogyakarta'")}
ALIAS_KAB = {("12", "Kota Padang Sidempuan"): ("Kota Padangsidimpuan", "ejaan baku Kemendagri satu kata, 'i' bukan 'e'")}


def _banjir(nama):
    sys.path.insert(0, os.path.join(AKAR, "scripts/banjir"))
    s = importlib.util.spec_from_file_location(f"banjir_{nama}", os.path.join(AKAR, f"scripts/banjir/{nama}.py"))
    m = importlib.util.module_from_spec(s)
    s.loader.exec_module(m)
    return m


def _kota():
    d = json.load(open(KOTA, encoding="utf-8"))
    i = {k: n for n, k in enumerate(d["kolom"])}
    return {r[i["kode"]]: (r[i["nama"]], r[i["prov"]]) for r in d["baris"]}


def susun(baris_dibi, kota, kunci_nama, provinsi):
    """baris_dibi [{id_kab_bps, kabupaten, provinsi}] -> (padanan {bps: {...}}, tidak_terpetakan {bps: {...}})."""
    idx = {}
    for kode, (nama, prov) in kota.items():
        idx.setdefault((prov, kunci_nama(nama)), []).append(kode)
    pn = {kunci_nama(v): k for k, v in provinsi.items()}
    pad, tak = {}, {}
    for r in sorted(baris_dibi, key=lambda r: int(r["id_kab_bps"])):
        bps, nk, np_ = f"{int(r['id_kab_bps']):04d}", str(r["kabupaten"]).strip(), str(r["provinsi"]).strip()
        dasar = {"nama_dibi": nk, "prov_dibi": np_}
        if bps in pad or bps in tak:
            if (pad.get(bps) or tak[bps])["nama_dibi"] != nk:
                pad.pop(bps, None)
                tak[bps] = {**dasar, "alasan": "satu id_kab_bps DIBI membawa lebih dari satu nama kab"}
            continue
        prov, cat = pn.get(kunci_nama(np_)), []
        if prov is None and np_ in ALIAS_PROV:
            prov = ALIAS_PROV[np_][0]
            cat.append("alias provinsi: " + ALIAS_PROV[np_][1])
        if prov is None:
            tak[bps] = {**dasar, "alasan": "nama provinsi DIBI tak dikenal"}
            continue
        nama = nk
        if (prov, nk) in ALIAS_KAB:
            nama, why = ALIAS_KAB[(prov, nk)]
            cat.append("alias kab: " + why)
        cocok = idx.get((prov, kunci_nama(nama)), [])
        if len(cocok) != 1:
            tak[bps] = {**dasar, "alasan": f"{len(cocok)} kab bernama sama di provinsi {prov} kota.json"}
            continue
        k = cocok[0]
        pad[bps] = {**dasar, "kode": k, "nama_kita": kota[k][0],
                    "cara": "; ".join(["kode sama" if k == bps else "kode beda"] + cat)}
    kembar = {}
    for b, v in pad.items():
        kembar.setdefault(v["kode"], []).append(b)
    for k, bs in kembar.items():
        if len(bs) > 1:   # dua kode DIBI ke satu kab: jangan dijumlah diam-diam
            for b in bs:
                tak[b] = {**{x: pad[b][x] for x in ("nama_dibi", "prov_dibi")}, "alasan": f"bersama {bs} jatuh ke {k}"}
                del pad[b]
    return pad, tak


def bangun():
    K, W = _banjir("kejadian"), _banjir("wilayah")
    r = K.superset(["id_kab_bps", "kabupaten", "provinsi"], [("n", "COUNT(*)")], [], 20000)
    r = [x for x in r if x.get("id_kab_bps")]
    pad, tak = susun(r, _kota(), K.kunci_nama, W.PROVINSI)
    json.dump({"dibuat": dt.date.today().isoformat(),
               "sumber": "DIBI BNPB Superset dasbor publik (id_kab_bps, kabupaten, provinsi; semua tahun) dicocokkan nama ke "
                         "scripts/udara/kota.json (kode Kemendagri); pembuat scripts/data/padanan_kab_dibi.py",
               "catatan": "tiap padanan: nama kab dan provinsi DIBI sama (kunci_nama) dengan satu baris kota.json; satu ke satu; "
                          "pemekaran Papua 2022 memindah kab utuh, tidak memecah kab",
               "padanan": pad, "tidak_terpetakan": tak}, open(BERKAS, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(f"padanan_kab_dibi: {len(pad)} padanan, {sum(v['kode'] != b for b, v in pad.items())} kode beda, "
          f"{len(tak)} tidak terpetakan", file=sys.stderr)


_PETA = None


def petakan(kode_bps):
    """id_kab_bps DIBI (int atau str) -> kode Kemendagri str, atau None bila tidak terpetakan."""
    global _PETA
    if _PETA is None:
        _PETA = {b: v["kode"] for b, v in json.load(open(BERKAS, encoding="utf-8"))["padanan"].items()}
    return _PETA.get(f"{int(kode_bps):04d}") if kode_bps not in (None, "") else None


def ukur(baris, kab, peta=None):
    """baris dibi_kab_tahun ([kab, ...]) + daftar kab kita -> (kode tak dikenal, kab tanpa data)."""
    ke = (lambda k: peta(k)) if peta else (lambda k: k)
    asing = sorted({b[0] for b in baris if ke(b[0]) not in kab})
    kode = {ke(b[0]) for b in baris}
    return asing, sorted(k for k in kab if k not in kode)


def _cek():
    kota = _kota()
    K = _banjir("kejadian")
    # sintetik: alias provinsi, alias kab, kembar, nama ganda
    pv = {"34": "DI Yogyakarta", "12": "Sumatera Utara", "94": "Papua Tengah", "91": "Papua"}
    kt = {"3471": ("Kota Yogyakarta", "34"), "1277": ("Kota Padangsidimpuan", "12"), "9404": ("Kab. Mimika", "94"),
          "9171": ("Kota Jayapura", "91")}
    p, t = susun([{"id_kab_bps": 3471, "kabupaten": "Kota Yogyakarta", "provinsi": "Daerah Istimewa Yogyakarta"},
                  {"id_kab_bps": 1277, "kabupaten": "Kota Padang Sidempuan", "provinsi": "Sumatera Utara"},
                  {"id_kab_bps": 9412, "kabupaten": "Mimika", "provinsi": "Papua Tengah"},
                  {"id_kab_bps": 9471, "kabupaten": "Kota Jayapura", "provinsi": "Papua"},
                  {"id_kab_bps": 9472, "kabupaten": "Jayapura Kota", "provinsi": "Papua"},
                  {"id_kab_bps": 9999, "kabupaten": "Mimika", "provinsi": "Papua"}], kt, K.kunci_nama, pv)
    assert {b: v["kode"] for b, v in p.items()} == {"3471": "3471", "1277": "1277", "9412": "9404", "9471": "9171"}, p
    assert set(t) == {"9472", "9999"}, t      # nama tak ada / provinsi lain: tidak ditebak
    # berkas nyata: kasus Papua dan kode BPS lain yang beda
    d = json.load(open(BERKAS, encoding="utf-8"))
    pad = d["padanan"]
    harap = {"9412": "9404", "9471": "9171", "9101": "9203", "9107": "9601", "9416": "9503", "9419": "9110",
             "1473": "1472", "6404": "6408", "6405": "6403", "7325": "7324", "1110": "1111", "3471": "3471"}
    for b, k in harap.items():
        assert pad[b]["kode"] == k, (b, pad.get(b), k)
    assert all(v["kode"] in kota for v in pad.values())
    assert len({v["kode"] for v in pad.values()}) == len(pad), "dua kode DIBI ke satu kab"
    assert petakan(9412) == "9404" and petakan("9412") == "9404" and petakan(None) is None and petakan(1) is None
    # ukur pada keluaran sekarang (kode BPS mentah) lawan sesudah dipetakan
    t = json.load(open(os.path.join(AKAR, "public/data/bnpb/terpapar.json")))["kab"]
    baris = json.load(open(os.path.join(AKAR, "public/data/bnpb/dibi_kab_tahun.json")))["baris"]
    a0, m0 = ukur(baris, t)
    a1, m1 = ukur(baris, t, petakan)
    salah = sum(1 for b, v in pad.items() if v["kode"] != b and b in t)
    print(f"padanan_kab_dibi --cek: {len(pad)} padanan ({sum(v['kode'] != b for b, v in pad.items())} kode beda, {salah} di antaranya "
          f"bertabrakan dengan kode Kemendagri kab lain), {len(d['tidak_terpetakan'])} tidak terpetakan")
    print(f"  dibi_kab_tahun.json: kode tak dikenal {len(a0)} -> {len(a1)} {a1}"
          f", kab tanpa data {len(m0)} -> {len(m1)} {m1}")
    print("OK")


if __name__ == "__main__":
    if "--cek" in sys.argv:
        _cek()
    elif "bangun" in sys.argv:
        bangun()
    else:
        print(__doc__)
