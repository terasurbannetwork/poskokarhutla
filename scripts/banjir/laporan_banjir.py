"""Laporan harian banjir -> public/banjir/data/laporan.json (kontrak v1: docs/multi-bencana/LAPORAN-HARIAN.md), tanpa jaringan.

Disusun lewat scripts/umum/laporan.py (susun/tulis/periksa). Berkas masukan: status.json, seri_status.json, dampak.json (jalankan
dampak.py lebih dulu), rob.json, sungai.json, kejadian_aktif_awal.json, peringatan.json, meta.json, dan laporan.json sebelumnya.

Metrik (semua agregat "maks": angka keadaan harian, bukan jumlah kejadian):
  banjir_sa   kecamatan Siaga + Awas banjir (utama)       seri: seri_status.json; hari ini: status.json hari ke-0
  longsor_sa  kecamatan Siaga + Awas longsor              sama
  rob_siaga   titik pantai berstatus Siaga/Awas rob       rob.json per hari (lv >= 2); provinsi/kab lewat nama
  penduduk    penduduk di kecamatan Siaga/Awas banjir     dampak.json; HANYA hari ini, hari lampau dibawa dari laporan.json lama
Jendela 14 hari berakhir di tanggal hari ke-0 status.json. Hari tanpa catatan = null (tidak mengarang mundur). Tingkat kab/kota
hanya diketahui untuk hari ini (seri_status.json hanya per provinsi); hari lampau kab dibawa dari laporan.json sebelumnya, jadi
tabel kab terisi bertahap tiap hari. Kode kab: 2 digit prov + urutan kab di public/geo/kabupaten/<prov>.json (BUKAN kode Kemendagri).

Pakai:  python3 scripts/banjir/laporan_banjir.py   |   python3 scripts/banjir/laporan_banjir.py uji
"""
import copy, datetime as dt, importlib.util, json, os, sys

sys.path.insert(0, os.path.dirname(__file__))
from umum import AKAR, KELUAR, WIB, baca
from wilayah import PROVINSI

_s = importlib.util.spec_from_file_location("umum_laporan", os.path.join(AKAR, "scripts/umum/laporan.py"))
LAP = importlib.util.module_from_spec(_s)
_s.loader.exec_module(LAP)

N = 14
SIAGA = 2
METRIK = [
    {"k": "banjir_sa", "label": "Siaga atau awas banjir", "satuan": "kecamatan", "utama": True, "agregat": "maks", "arah": "naik_buruk", "desimal": 0},
    {"k": "longsor_sa", "label": "Siaga atau awas longsor", "satuan": "kecamatan", "agregat": "maks", "arah": "naik_buruk", "desimal": 0},
    {"k": "rob_siaga", "label": "Rob siaga", "satuan": "titik", "agregat": "maks", "arah": "naik_buruk", "desimal": 0},
    {"k": "penduduk", "label": "Terpapar banjir", "satuan": "jiwa", "agregat": "maks", "arah": "naik_buruk", "desimal": 0},
]
KUNCI = [m["k"] for m in METRIK]
NAMA_PROV = {v.lower(): k for k, v in PROVINSI.items()}
LEVEL = {2: "Siaga", 3: "Awas"}


def kab_indeks():
    """{(prov, nama kab): kode 4 digit} dari urutan kab di public/geo/kabupaten/<prov>.json."""
    out = {}
    for kp in PROVINSI:
        try:
            fs = json.load(open(os.path.join(AKAR, "public/geo/kabupaten", f"{kp}.json")))["features"]
        except OSError:
            continue
        for i, f in enumerate(fs, 1):
            out[(kp, f["properties"]["kab"])] = f"{kp}{i:02d}"
    return out


def _kosong():
    return {k: [None] * N for k in KUNCI}


def seri_hari(akhir):
    a = dt.date.fromisoformat(akhir)
    return [(a - dt.timedelta(days=N - 1 - i)).isoformat() for i in range(N)]


def bangun(masuk, kab_kode, dibuat=None, hari_ini=None):
    """masuk: dict {status, seri, dampak, rob, sungai, aktif, peringatan, meta, lama}. -> dict laporan v1 (belum diperiksa)."""
    hari_ini = hari_ini or dt.datetime.now(WIB).date().isoformat()
    st, seri = masuk["status"], masuk.get("seri") or {"hari": [], "prov": {}, "nas": {}}
    hari = seri_hari(st["hari"][0])
    ix = {h: i for i, h in enumerate(hari)}
    E = {}  # ("n",) | ("p", kode) | ("k", prov, kode) -> {metrik: [N]}

    def ent(kunci):
        return E.setdefault(kunci, _kosong())

    ent(("n",))
    for h, row in seri["nas"].items():
        if h in ix:
            e = ent(("n",))
            e["banjir_sa"][ix[h]], e["longsor_sa"][ix[h]] = row[1] + row[2], row[4] + row[5]
    for kp, por in seri["prov"].items():
        for h, row in por.items():
            if h in ix:
                e = ent(("p", kp))
                e["banjir_sa"][ix[h]], e["longsor_sa"][ix[h]] = row[1] + row[2], row[4] + row[5]
    # hari ini langsung dari status.json (lebih otoritatif daripada seri yang bisa belum tercatat)
    t = N - 1
    kab_nama = {}
    ent(("n",))["banjir_sa"][t] = ent(("n",))["longsor_sa"][t] = 0
    for k in list(E):
        if k[0] == "p":
            E[k]["banjir_sa"][t] = E[k]["longsor_sa"][t] = 0
    for kunci, v in st["kec"].items():
        kp, kab, _ = kunci.split("|")
        for m, lv in (("banjir_sa", v["b"][0]), ("longsor_sa", v["l"][0])):
            if lv >= SIAGA:
                for kk in (("n",), ("p", kp)):
                    e = ent(kk)
                    e[m][t] = (e[m][t] or 0) + 1
                kode = kab_kode.get((kp, kab))
                if kode:
                    kab_nama[kode] = kab
                    e = ent(("k", kp, kode))
                    e[m][t] = (e[m][t] or 0) + 1
    for kk in list(E):  # prov/kab yang hari ini tidak berstatus: nol terukur, bukan kosong
        if kk[0] in ("p", "k"):
            for m in ("banjir_sa", "longsor_sa"):
                if E[kk][m][t] is None:
                    E[kk][m][t] = 0
    # rob per hari
    rob = masuk.get("rob")
    if rob:
        for j, h in enumerate(rob["hari"]):
            if h not in ix:
                continue
            i = ix[h]
            ent(("n",))["rob_siaga"][i] = 0
            for tt in rob["titik"]:
                lv = tt.get("lv") or []
                if j < len(lv) and (lv[j] or 0) >= SIAGA:
                    kp = NAMA_PROV.get(str(tt.get("prov")).lower())
                    kode = kab_kode.get((kp, tt.get("kab")))
                    for kk in (("n",), ("p", kp) if kp else None, ("k", kp, kode) if kode else None):
                        if kk:
                            e = ent(kk)
                            e["rob_siaga"][i] = (e["rob_siaga"][i] or 0) + 1
                            if kk[0] == "k":
                                kab_nama[kode] = tt["kab"]
    # penduduk terpapar hari ini
    dm = masuk.get("dampak")
    if dm and dm.get("hari") == hari[t]:
        tp = dm.get("terpapar") or {}
        ent(("n",))["penduduk"][t] = tp.get("penduduk", 0)
        for kk in [k for k in E if k[0] == "p"]:
            E[kk]["penduduk"][t] = (tp.get("prov") or {}).get(kk[1], {}).get("penduduk", 0)
    # bawa nilai hari lampau dari laporan sebelumnya (hanya yang kosong di sini)
    lama = masuk.get("lama")
    if lama and lama.get("hari"):
        li = {h: i for i, h in enumerate(lama["hari"])}
        ada = [(h, i) for h, i in ix.items() if h in li]
        def isi(e, o):
            for m in KUNCI:
                for h, i in ada:
                    if e[m][i] is None and isinstance(o.get(m), list) and o[m][li[h]] is not None:
                        e[m][i] = o[m][li[h]]
        isi(ent(("n",)), lama.get("nasional", {}))
        for kp, o in lama.get("prov", {}).items():
            isi(ent(("p", kp)), o)
        for o in lama.get("kab", []):
            isi(ent(("k", o["prov"], o["kode"])), o)
            kab_nama.setdefault(o["kode"], o["nama"])
    # pangkas: hanya yang pernah > 0 di jendela
    def positif(e):
        return any(x for m in KUNCI for x in e[m] if x)
    kab = {k: e for k, e in E.items() if k[0] == "k" and positif(e)}
    prov = {k[1]: e for k, e in E.items() if k[0] == "p" and positif(e)}
    for k in kab:
        prov.setdefault(k[1], E.get(("p", k[1])) or _kosong())
    nas = E[("n",)]
    d = LAP.susun("banjir", "Laporan Harian Banjir, Longsor dan Rob", hari, METRIK, nas,
                  {kp: dict(e, nama=PROVINSI[kp]) for kp, e in sorted(prov.items())},
                  [dict(e, prov=k[1], kode=k[2], nama=kab_nama.get(k[2], k[2])) for k, e in sorted(kab.items())],
                  cutoff=(masuk.get("meta") or {}).get("dibuat") or dibuat or dt.datetime.now(WIB).strftime("%Y-%m-%dT%H:%M+07:00"),
                  hari_lengkap=hari[t], dibuat=dibuat,
                  sorot=sorot(masuk, kab_kode), prakiraan=prakiraan(st, hari_ini), tambahan=tambahan(masuk),
                  sumber=[{"nama": "Open-Meteo dan ECMWF", "url": "https://open-meteo.com/", "catatan": "hujan, prakiraan 7 hari, status per kecamatan"},
                          {"nama": "GloFAS (Copernicus)", "url": "https://www.globalfloods.eu/", "catatan": "debit sungai"},
                          {"nama": "InaRISK BNPB", "url": "https://inarisk.bnpb.go.id/", "catatan": "indeks bahaya"},
                          {"nama": "BMKG", "url": "https://www.bmkg.go.id/", "catatan": "peringatan dini, pasang laut"},
                          {"nama": "WorldPop", "url": "https://www.worldpop.org/", "catatan": "penduduk"}])
    return d


def sorot(masuk, kab_kode):
    st = masuk["status"]
    per = {}
    for kunci, v in st["kec"].items():
        kp, kab, kec = kunci.split("|")
        if v["b"][0] >= SIAGA:
            o = per.setdefault(kp, {"awas": 0, "siaga": 0, "top": (0, 0, "")})
            o["awas" if v["b"][0] == 3 else "siaga"] += 1
            o["top"] = max(o["top"], (v["b"][0], v.get("h3") or 0, f"{kec}, {kab}"))
    out = []
    for kp, o in sorted(per.items(), key=lambda x: (-x[1]["awas"], -x[1]["siaga"]))[:3]:
        n = o["awas"] + o["siaga"]
        out.append({"tingkat": "awas" if o["awas"] else "siaga", "prov": kp, "tautan": "/banjir/peta",
                    "judul": f"{PROVINSI[kp]}: {n} kecamatan {'awas' if o['awas'] else 'siaga'} banjir",
                    "teks": f"Tertinggi di {o['top'][2]}, hujan 3 hari {round(o['top'][1])} mm."})
    ls = [(k, v) for k, v in st["kec"].items() if v["l"][0] >= SIAGA]
    if ls:
        awas = any(v["l"][0] == 3 for _, v in ls)
        out.append({"tingkat": "awas" if awas else "siaga", "judul": f"{len(ls)} kecamatan siaga atau awas longsor",
                    "teks": f"Terbanyak di {PROVINSI[max(set(k.split('|')[0] for k, _ in ls), key=lambda p: sum(k.startswith(p + '|') for k, _ in ls))]}.",
                    "tautan": "/banjir/peta"})
    sg = [t for t in (masuk.get("sungai") or {}).get("titik", []) if (t.get("kelas") or 0) >= SIAGA]
    if sg:
        out.append({"tingkat": "waspada", "judul": f"{len(sg)} titik sungai melewati debit banjir 5 tahunan",
                    "teks": "Cek tabel sungai di bagian tambahan.", "tautan": "/banjir/peta"})
    rob = masuk.get("rob")
    if rob and st["hari"][0] in rob["hari"]:
        j = rob["hari"].index(st["hari"][0])
        n = sum(1 for t in rob["titik"] if ((t.get("lv") or [0] * 99)[j] or 0) >= SIAGA)
        if n:
            out.append({"tingkat": "waspada", "judul": f"{n} titik pantai siaga rob", "teks": "Pasang laut di atas persentil 99.", "tautan": "/banjir/rob"})
    nc = [x for x in (masuk.get("peringatan") or {}).get("nowcast", []) if x.get("aktif")]
    if nc:
        out.append({"tingkat": "info", "judul": f"{len(nc)} peringatan dini cuaca BMKG aktif", "teks": str(nc[0].get("headline") or nc[0].get("event"))[:140]})
    ka = masuk.get("aktif") or {}
    if ka.get("hari") == st["hari"][0] and ka.get("kejadian"):
        e = max(ka["kejadian"], key=lambda e: e.get("skor") or 0)
        out.append({"tingkat": "info", "judul": f"{len(ka['kejadian'])} kejadian banjir aktif", "teks": f"Terbesar {e['kode']}: {e['n_kec']} kecamatan.",
                    "tautan": f"/banjir/?k={e['kode']}"})
    if not out:
        out.append({"tingkat": "info", "judul": "Tidak ada kecamatan siaga atau awas", "teks": "Tidak ada kecamatan berstatus banjir atau longsor tertinggi pada tanggal data."})
    return out[:8]


def prakiraan(st, hari_ini):
    """Hari 1-3 status.json, hanya yang tanggalnya belum lewat (data basi: prakiraan lampau tidak ditampilkan)."""
    idx = [i for i in (1, 2, 3) if i < len(st["hari"]) and st["hari"][i] >= hari_ini]
    if not idx:
        return None
    per = {}
    for kunci, v in st["kec"].items():
        kp = kunci.split("|")[0]
        for j, i in enumerate(idx):
            if v["b"][i] >= SIAGA:
                per.setdefault(kp, [0] * len(idx))[j] += 1
    nas = [sum(p[j] for p in per.values()) for j in range(len(idx))]
    baris = [{"label": "Total nasional", "nilai": nas, "satuan": "kecamatan"}]
    for kp, n in sorted(per.items(), key=lambda x: -max(x[1]))[:6]:
        baris.append({"label": PROVINSI[kp], "prov": kp, "nilai": n, "satuan": "kecamatan"})
    lama = f" (prakiraan dari data {st['hari'][0]})" if st["hari"][0] < hari_ini else ""
    return {"judul": f"Kecamatan siaga atau awas banjir: total nasional dan 6 provinsi terbanyak{lama}", "hari": [st["hari"][i] for i in idx], "baris": baris}


def tambahan(masuk):
    out, st = [], masuk["status"]
    sg = sorted((t for t in (masuk.get("sungai") or {}).get("titik", []) if (t.get("kelas") or 0) >= SIAGA),
                key=lambda t: -(t.get("puncak") or 0) / (t.get("q5") or 1))[:10]
    if sg:
        out.append({"id": "sungai", "judul": "Sungai di atas debit banjir 5 tahunan", "kolom": ["Lokasi", "Provinsi", "Debit puncak (m³/dtk)", "Ambang 5 tahunan (m³/dtk)"],
                    "baris": [[f"{t['kec']}, {t['kab']}", PROVINSI.get(t["prov"], t["prov"]), round(t["puncak"]), round(t["q5"])] for t in sg],
                    "catatan": "Debit prakiraan GloFAS, bukan pengukuran pos duga air."})
    rob = masuk.get("rob")
    if rob and st["hari"][0] in rob["hari"]:
        j = rob["hari"].index(st["hari"][0])
        rb = [t for t in rob["titik"] if ((t.get("lv") or [0] * 99)[j] or 0) >= SIAGA]
        if rb:
            out.append({"id": "rob", "judul": "Titik pantai siaga rob pada tanggal data", "kolom": ["Lokasi", "Provinsi", "Pasang puncak (m)"],
                        "baris": [[f"{t['kec']}, {t['kab']}", t["prov"], t["h"][j]] for t in sorted(rb, key=lambda t: -t["h"][j])[:10]],
                        "catatan": "Tinggi muka laut model Open-Meteo Marine, acuan persentil 99 tiap titik."})
    ka = masuk.get("aktif") or {}
    if ka.get("hari") == st["hari"][0] and ka.get("kejadian"):
        out.append({"id": "kejadian", "judul": "Kejadian banjir aktif", "kolom": ["Kode", "Jumlah kecamatan", "Penduduk (jiwa)", "Skor (0-100)"],
                    "baris": [[e["kode"], e["n_kec"], e.get("penduduk"), None if e.get("skor") is None else round(e["skor"])] for e in sorted(ka["kejadian"], key=lambda e: -(e.get("skor") or 0))[:10]],
                    "catatan": "Gugus kecamatan bersebelahan berstatus siaga atau lebih."})
    return out


def main():
    j = lambda n: baca(os.path.join(KELUAR, n))
    st = j("status.json")
    if not st:
        sys.exit("status.json belum ada")
    masuk = {"status": st, "seri": j("seri_status.json"), "dampak": j("dampak.json"), "rob": j("rob.json"), "sungai": j("sungai.json"),
             "aktif": j("kejadian_aktif_awal.json"), "peringatan": j("peringatan.json"), "meta": j("meta.json"), "lama": j("laporan.json")}
    d = bangun(masuk, kab_indeks())
    jalur = LAP.tulis("banjir", d)
    n = d["nasional"]
    print(f"laporan_banjir: {d['hari'][-1]} banjir_sa {n['banjir_sa'][-1]} longsor_sa {n['longsor_sa'][-1]} rob {n['rob_siaga'][-1]} "
          f"penduduk {n['penduduk'][-1]}; {len(d['prov'])} prov, {len(d['kab'])} kab -> {jalur}", file=sys.stderr)


def _st(h0="2026-10-18"):
    h = [(dt.date.fromisoformat(h0) + dt.timedelta(days=i)).isoformat() for i in range(4)]
    return {"hari": h, "kec": {"62|Kapuas|A": {"b": [3, 2, 0, 0], "l": [2, 0, 0, 0], "h3": 120},
                              "62|Kapuas|B": {"b": [2, 2, 2, 0], "l": [0, 0, 0, 0], "h3": 90},
                              "11|Aceh Barat|C": {"b": [1, 2, 0, 0], "l": [0, 0, 0, 0], "h3": 30}}}


def uji():
    kk = {("62", "Kapuas"): "6201", ("11", "Aceh Barat"): "1101"}
    seri = {"hari": ["2026-10-16", "2026-10-17"], "prov": {"62": {"2026-10-16": [0, 1, 0, 0, 0, 0], "2026-10-17": [0, 1, 1, 0, 0, 0]}},
            "nas": {"2026-10-16": [0, 1, 0, 0, 0, 0], "2026-10-17": [0, 1, 1, 0, 0, 0]}}
    m = {"status": _st(), "seri": seri, "kab_x": 0}
    d = bangun(m, kk, dibuat="2026-10-18T08:00+07:00", hari_ini="2026-10-18")
    assert LAP.periksa(d) == [], LAP.periksa(d)
    n = d["nasional"]["banjir_sa"]
    assert len(d["hari"]) == N and d["hari"][-1] == "2026-10-18" and d["hari_lengkap"] == "2026-10-18"
    assert n[-1] == 2 and n[-2] == 2 and n[-3] == 1 and n[0] is None, n          # hari tanpa catatan = null, tidak diisi mundur
    assert d["nasional"]["longsor_sa"][-1] == 1 and d["nasional"]["penduduk"][-1] is None   # tanpa dampak.json: tidak dikarang
    assert [o["kode"] for o in d["kab"]] == ["6201"] and d["kab"][0]["banjir_sa"][-1] == 2   # hanya kab berstatus Siaga+
    assert d["prov"]["62"]["nama"] == "Kalimantan Tengah" and "11" not in d["prov"]
    assert d["prakiraan"]["hari"] == _st()["hari"][1:] and d["prakiraan"]["baris"][0]["nilai"] == [3, 1, 0], d["prakiraan"]
    assert bangun(m, kk, dibuat="x", hari_ini="2026-10-20")["prakiraan"]["hari"] == ["2026-10-20", "2026-10-21"]    # hari lewat disembunyikan
    assert "prakiraan" not in bangun(m, kk, dibuat="x", hari_ini="2026-10-30")
    assert d["sorot"][0]["tingkat"] == "awas" and not any("di antaranya" in o["teks"] for o in d["sorot"])
    # penduduk hari ini dan dibawa ke laporan berikutnya
    m["dampak"] = {"hari": "2026-10-18", "terpapar": {"penduduk": 500, "prov": {"62": {"penduduk": 500}}}}
    d1 = bangun(m, kk, dibuat="x")
    assert d1["nasional"]["penduduk"][-1] == 500 and d1["prov"]["62"]["penduduk"][-1] == 500
    m2 = {"status": _st("2026-10-19"), "lama": d1}
    d2 = bangun(m2, kk, dibuat="x")
    assert d2["nasional"]["penduduk"][-2] == 500 and d2["nasional"]["penduduk"][-1] is None, d2["nasional"]["penduduk"]
    assert d2["kab"][0]["banjir_sa"][-2] == 2                                          # kab lampau dibawa dari laporan lama
    # tanpa kecamatan berstatus: tetap sah, sorot info
    sepi = {"status": {"hari": _st()["hari"], "kec": {}}}
    ds = bangun(sepi, kk, dibuat="x")
    assert LAP.periksa(ds) == [] and ds["sorot"][0]["tingkat"] == "info" and ds["nasional"]["banjir_sa"][-1] == 0
    # berkas salah ditolak
    for ubah, potong in ((lambda x: x["nasional"]["banjir_sa"].pop(), "panjang 13"),
                         (lambda x: x["metrik"][1].update(utama=True), "utama ada 2"),
                         (lambda x: x["prov"].update({"99": copy.deepcopy(x["prov"]["62"])}), "tidak dikenal"),
                         (lambda x: x["nasional"]["banjir_sa"].__setitem__(0, -3), "negatif")):
        x = copy.deepcopy(d)
        ubah(x)
        g = LAP.periksa(x)
        assert any(potong in e for e in g), (potong, g)
        try:
            LAP.tulis("banjir", x)
            raise SystemExit("tulis harus menolak")
        except ValueError:
            pass
    print("ok laporan_banjir")


if __name__ == "__main__":
    uji() if sys.argv[1:] == ["uji"] else main()
