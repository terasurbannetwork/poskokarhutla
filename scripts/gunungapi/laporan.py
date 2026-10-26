"""Laporan harian gunung api -> public/banjir/data/laporan_gunungapi.json (kontrak: docs/multi-bencana/LAPORAN-HARIAN.md).

Masukan : public/banjir/data/gunungapi_status.json (MAGMA/PVMBG: level, letusan, perubahan, riwayat)
          public/banjir/data/abu_gunungapi.json (opsional; hanya dipakai bila dibuat hari ini WIB)
Hari    : riwayat yang ada + isi laporan sebelumnya (hari yang sudah terekam tidak hilang). Hari tanpa data = null, bukan 0.
Kab     : dilewati. Batas kabupaten di public/geo/kabupaten/*.json hanya bernama, tanpa kode Kemendagri 4 digit.
Pakai   : python3 scripts/gunungapi/laporan.py [uji]
"""
import copy, datetime as dt, importlib.util, json, os, re, sys

AKAR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
STATUS = os.path.join(AKAR, "public/banjir/data/gunungapi_status.json")
ABU = os.path.join(AKAR, "public/banjir/data/abu_gunungapi.json")
KELUAR = os.path.join(AKAR, "public/banjir/data/laporan_gunungapi.json")
WIB = dt.timezone(dt.timedelta(hours=7))
BLN = "Jan Feb Mar Apr Mei Jun Jul Agu Sep Okt Nov Des".split()
LV = {1: "I (Normal)", 2: "II (Waspada)", 3: "III (Siaga)", 4: "IV (Awas)"}
URUT = {"awas": 0, "siaga": 1, "waspada": 2, "info": 3}

METRIK = [
    {"k": "siaga_awas", "label": "Gunung Siaga + Awas", "satuan": "gunung", "agregat": "maks", "arah": "naik_buruk", "desimal": 0},
    {"k": "waspada_ke_atas", "label": "Gunung Waspada ke atas", "satuan": "gunung", "agregat": "maks", "arah": "naik_buruk", "desimal": 0},
    {"k": "erupsi", "label": "Erupsi tercatat", "satuan": "erupsi", "utama": True, "agregat": "jumlah", "arah": "naik_buruk", "desimal": 0},
    {"k": "kenaikan", "label": "Kenaikan level", "satuan": "gunung", "agregat": "jumlah", "arah": "naik_buruk", "desimal": 0},
    {"k": "bandara_abu", "label": "Bandara di jalur abu 72 jam", "satuan": "bandara", "agregat": "maks", "arah": "naik_buruk", "desimal": 0},
]


def _muat(nama, jalur):
    s = importlib.util.spec_from_file_location(nama, os.path.join(AKAR, jalur))
    m = importlib.util.module_from_spec(s)
    s.loader.exec_module(m)
    return m


U = _muat("umum_laporan_gunungapi", "scripts/umum/laporan.py")
PROVINSI = U.PROVINSI


def baca(jalur, bawaan=None):
    try:
        return json.load(open(jalur, encoding="utf-8"))
    except (OSError, ValueError):
        return bawaan


SEL_MIN = 5   # jejak berambang dengan sel_n < 5 dianggap derau = di bawah ambang penerbangan (selaras abu.py)
# slug SATU aturan dengan abu.id_gunung (Lewotobi Laki-laki = lewotobi-laki-laki), supaya cocok dengan id di abu_gunungapi.json dan paparan.json
slug = _muat("abu_gunungapi_laporan", "scripts/gunungapi/abu.py").id_gunung


def potong_kalimat(t, maks):
    """potong di batas kalimat terakhir yang muat; tanpa batas kalimat: di kata terakhir, dengan elipsis"""
    t = t.strip()
    if len(t) <= maks:
        return t
    kep = t[:maks]
    i = max(kep.rfind(". "), kep.rfind("! "), kep.rfind("? "))
    if i >= maks // 3:
        return kep[:i + 1].strip()
    return kep.rsplit(" ", 1)[0].rstrip(",;:") + "…"


def waktu(iso):
    t = dt.datetime.fromisoformat(iso).astimezone(WIB)
    return f"{t.day} {BLN[t.month - 1]} {t:%H.%M}"


def arah(ket):
    m = re.search(r"ke arah ([a-z ]+?)(?:\.|,|;| dengan| dan|$)", ket or "")
    return m.group(1) if m else "-"


def kode_prov(g, cari):
    """Kode Kemendagri dari koordinat gunung; cadangan: nama provinsi MAGMA."""
    r = cari(g["lon"], g["lat"]) if cari else None
    if r:
        return r[0]
    n = g.get("prov", "").lower()
    c = [(len(v), k) for k, v in PROVINSI.items() if v.lower() in n or n in v.lower()]
    return max(c)[1] if c else None  # nama terpanjang menang ("Maluku Utara", bukan "Maluku")


def bangun(st, abu, lama, cari):
    now = dt.datetime.fromisoformat(st["dibuat"]).astimezone(WIB)
    hr = now.date()
    iso = lambda d: d.isoformat()
    ri = {r["tgl"]: r for r in st.get("riwayat", [])}
    lama = lama or {}
    awal = min([hr - dt.timedelta(days=6)] + [dt.date.fromisoformat(x) for x in list(ri) + lama.get("hari", [])])
    awal = max(awal, hr - dt.timedelta(days=119))
    hari = [iso(awal + dt.timedelta(days=i)) for i in range((hr - awal).days + 1)]
    n, idx = len(hari), {h: i for i, h in enumerate(hari)}
    today = idx[iso(hr)]
    gun = st["gunung"]
    for g in gun:
        g["_p"] = kode_prov(g, cari)
    ada_abu = bool(abu and abu.get("dibuat", "")[:10] == iso(hr))
    ks = [m["k"] for m in METRIK if m["k"] != "bandara_abu" or ada_abu]
    metrik = [m for m in METRIK if m["k"] in ks]

    let = st.get("letusan", [])
    tl = [dt.datetime.fromisoformat(x["waktu"]) for x in let]
    cak = st.get("letusan_cakupan")   # rentang yang terbukti terbaca dari MAGMA; tanpa itu tak ada hari yang boleh bernilai 0
    c0, c1 = (dt.datetime.fromisoformat(cak["dari"]), dt.datetime.fromisoformat(cak["sampai"])) if cak else (None, None)

    def tutup(i):
        """hari tercakup bila halaman terbaca sejak awal hari itu dan sampai akhir hari itu (atau sampai sekarang untuk hari ini)"""
        if not cak:
            return False
        a = dt.datetime.combine(awal + dt.timedelta(days=i), dt.time(), WIB)
        return c0 <= a and (c1 >= a + dt.timedelta(days=1) or (i == today and c1.astimezone(WIB).date() == hr))
    hit = [0] * n
    for x, t in zip(let, tl):
        j = idx.get(iso(t.astimezone(WIB).date()))
        if j is not None:
            hit[j] += 1
    naik = [p for p in st.get("perubahan", []) if p["ke"] > p["dari"]]

    def hitung(nas, kode):
        ok = (lambda g: True) if nas else (lambda g: g["_p"] == kode)
        s = {k: [None] * n for k in ks}
        if nas:  # riwayat hanya menyimpan jumlah per level nasional
            for h, i in idx.items():
                if h in ri:
                    lv = {int(a): b for a, b in ri[h]["level"].items()}
                    s["siaga_awas"][i] = lv.get(3, 0) + lv.get(4, 0)
                    s["waspada_ke_atas"][i] = lv.get(2, 0) + lv.get(3, 0) + lv.get(4, 0)
        gs = [g for g in gun if ok(g)]
        s["siaga_awas"][today] = sum(g["level"] >= 3 for g in gs)
        s["waspada_ke_atas"][today] = sum(g["level"] >= 2 for g in gs)
        nm = {g["nama"] for g in gs}
        for i in range(n):
            if tutup(i):
                s["erupsi"][i] = sum(1 for x, t in zip(let, tl) if x["gunung"] in nm and iso(t.astimezone(WIB).date()) == hari[i])
            if hari[i] in ri or i == today:
                s["kenaikan"][i] = sum(1 for p in naik if p["tgl"] == hari[i] and p["nama"] in nm)
        if ada_abu:
            ids = {slug(g["nama"]) for g in gs}
            s["bandara_abu"][today] = len({b["icao"] for b in abu.get("bandara_terdampak", []) if b["gunung"] in ids})
        return s

    def gabung(baru, tua):
        """hari yang sudah terekam di laporan lama dan kosong sekarang dipertahankan"""
        if not tua:
            return baru
        for k in ks:
            for j, h in enumerate(lama.get("hari", [])):
                i = idx.get(h)
                v = tua.get(k, [None] * (j + 1))[j]
                if k == "erupsi" and v is not None:   # nol lama hanya sah bila laporan lama membuktikan cakupannya; tanpa itu hanya hitungan positif
                    c = lama.get("erupsi_cakupan")
                    v = v if (v > 0 and not c) or (c and dt.datetime.fromisoformat(c["dari"]) <= dt.datetime.combine(dt.date.fromisoformat(h), dt.time(), WIB) and dt.datetime.fromisoformat(c["sampai"]) >= dt.datetime.combine(dt.date.fromisoformat(h) + dt.timedelta(days=1), dt.time(), WIB)) else None
                if i is not None and baru[k][i] is None and v is not None:
                    baru[k][i] = v
        return baru

    nasional = gabung(hitung(True, None), lama.get("nasional"))
    kodes = sorted({g["_p"] for g in gun if g["_p"]} | {k for k in lama.get("prov", {}) if k in PROVINSI})
    prov = {k: gabung(hitung(False, k), lama.get("prov", {}).get(k)) for k in kodes}
    for k in kodes:
        prov[k]["nama"] = PROVINSI[k]

    # sorot
    sorot = []
    for g in sorted(gun, key=lambda g: (-g["level"], g["nama"])):
        if g["level"] >= 3:
            rk = re.split(r"\s2\.\s", g.get("rekomendasi") or "")[0].replace("1. ", "", 1).strip()
            rad = f" Radius larangan {str(g['radius_km']).replace('.', ',').rstrip('0').rstrip(',')} km dari pusat erupsi." if g.get("radius_km") else ""
            sorot.append({"tingkat": "awas" if g["level"] == 4 else "siaga", "judul": f"G. {g['nama']} berstatus Level {LV[g['level']]}",
                          "teks": potong_kalimat(f"Status resmi PVMBG, periode {g.get('periode', 'terbaru')}.{rad} {rk}", 520),
                          "prov": g["_p"], "tautan": "/gunungapi/"})
    for p in [p for p in naik if p["tgl"] == iso(hr)][:3]:
        g = next((g for g in gun if g["nama"] == p["nama"]), None)
        sorot.append({"tingkat": "siaga" if p["ke"] >= 3 else "waspada", "judul": f"G. {p['nama']} naik ke Level {LV[p['ke']]}",
                      "teks": f"Sebelumnya Level {LV[p['dari']]}. Status resmi PVMBG.", "prov": g and g["_p"], "tautan": "/gunungapi/"})
    r24 = [x for x, t in zip(let, tl) if t >= now - dt.timedelta(hours=24)]
    per = {}
    for x in r24:
        per[x["gunung"]] = per.get(x["gunung"], 0) + 1
    if per:
        nm, c = max(per.items(), key=lambda a: a[1])
        g = next((g for g in gun if g["nama"] == nm), None)
        tg = max((x.get("tinggi_m") or 0 for x in r24 if x["gunung"] == nm), default=0)
        sorot.append({"tingkat": "waspada", "judul": f"G. {nm}: {c} erupsi dalam 24 jam",
                      "teks": f"Gunung dengan erupsi terbanyak. Kolom abu tertinggi {tg} m di atas puncak." if tg else "Gunung dengan erupsi terbanyak.",
                      "prov": g and g["_p"], "tautan": "/gunungapi/"})
    if ada_abu:
        for b in [x for x in abu.get("bandara_terdampak", []) if x.get("jam_tiba") is not None][:3]:
            g = next((g for g in gun if slug(g["nama"]) == b["gunung"]), None)
            jam = f"sekitar {b['jam_tiba']} jam lagi"
            sorot.append({"tingkat": "waspada", "judul": f"Skenario: abu G. {g['nama'] if g else b['gunung']} bisa tiba di {b.get('iata') or b['icao']}",
                          "teks": f"{b['nama']}: pada skenario bila gunung meletus sekarang, abu di atas ambang penerbangan 2 mg/m³ tiba {jam}. Skenario Centurisk97, bukan prakiraan letusan dan bukan VAAC.", "prov": g and g["_p"], "tautan": "/gunungapi/"})
    sorot.sort(key=lambda s: URUT[s["tingkat"]])
    sorot = sorot[:8]

    # prakiraan jangkauan abu
    prak = None
    if ada_abu:
        baris = []
        for a in abu.get("gunung", []):
            # jejak dengan sel_n < SEL_MIN dianggap derau = di bawah ambang penerbangan: null, bukan 0
            jk = {j["jam"]: (j.get("jangkau_km") if j.get("jangkau_km") and j.get("sel_n", SEL_MIN) >= SEL_MIN else None) for j in a.get("jejak", [])}
            nilai = [jk.get(24), jk.get(48), jk.get(72)]
            g = next((g for g in gun if slug(g["nama"]) == a["id"]), None)
            if any(v is not None for v in nilai):
                baris.append({"label": f"G. {a['nama']}", "prov": g and g["_p"], "nilai": [None if v is None else round(v) for v in nilai], "satuan": "km"})
        if baris:
            prak = {"judul": "Skenario jangkauan abu pada jam ke-24, 48, dan 72 (km dari puncak, bukan VAAC)",
                    "label_kolom": ["jam ke-24", "jam ke-48", "jam ke-72"],
                    "hari": [iso(hr + dt.timedelta(days=d)) for d in (1, 2, 3)], "baris": sorted(baris, key=lambda b: -(b["nilai"][2] or 0))[:12]}

    tambahan = []
    if r24:
        tambahan.append({"id": "letusan", "judul": "Erupsi 24 jam terakhir", "kolom": ["Waktu (WIB)", "Gunung", "Tinggi kolom (m)", "Arah"],
                         "baris": [[waktu(x["waktu"]), x["gunung"], x.get("tinggi_m", "tidak teramati"), arah(x.get("ket"))] for x in r24[:60]],
                         "catatan": "Tinggi kolom di atas puncak, dari laporan erupsi PVMBG."})
    pl = [p for p in st.get("perubahan", []) if p["tgl"] >= iso(hr - dt.timedelta(days=30))]
    if pl:
        tambahan.append({"id": "perubahan", "judul": "Perubahan level 30 hari", "kolom": ["Tanggal", "Gunung", "Dari", "Ke"],
                         "baris": [[p["tgl"], p["nama"], LV[p["dari"]], LV[p["ke"]]] for p in sorted(pl, key=lambda p: p["tgl"], reverse=True)]})

    sumber = [{"nama": "MAGMA Indonesia, PVMBG (Badan Geologi)", "url": "https://magma.esdm.go.id/", "catatan": "level, radius rekomendasi, erupsi"}]
    if ada_abu:
        sumber.append({"nama": "Open-Meteo", "url": "https://open-meteo.com/", "catatan": "angin untuk skenario jangkauan abu (Centurisk97, bukan VAAC)"})
    for g in gun:
        g.pop("_p", None)
    d = U.susun("gunungapi", "Laporan Harian Gunung Api", hari, metrik, nasional, prov, [], cutoff=now.strftime("%Y-%m-%dT%H:%M+07:00"),
                   hari_lengkap=hari[today - 1], sorot=sorot, prakiraan=prak, tambahan=tambahan, sumber=sumber, dibuat=dt.datetime.now(WIB).strftime("%Y-%m-%dT%H:%M+07:00"))
    if cak:
        d["erupsi_cakupan"] = cak   # bukti cakupan: laporan berikutnya boleh mewarisi nol hanya di dalamnya
    return d


def jalan():
    st = baca(STATUS)
    if not st:
        raise SystemExit("gunungapi_status.json tidak terbaca")
    cari = None
    try:
        cari = U._w.Wilayah().cari
    except Exception as e:  # tanpa pencari titik, jatuh ke nama provinsi MAGMA
        print(f"  Wilayah tak termuat: {e}", file=sys.stderr)
    d = bangun(st, baca(ABU), baca(KELUAR), cari)
    g = U.periksa(d)
    if g:
        raise SystemExit("laporan ditolak:\n- " + "\n- ".join(g))
    with open(KELUAR + ".tmp", "w", encoding="utf-8") as f:
        json.dump(d, f, ensure_ascii=False, separators=(",", ":"))
    os.replace(KELUAR + ".tmp", KELUAR)
    nas = d["nasional"]
    print(f"laporan gunungapi: {len(d['hari'])} hari; erupsi hari ini {nas['erupsi'][-1]}; sorot {len(d['sorot'])}; {os.path.getsize(KELUAR)} byte", file=sys.stderr)


def _contoh():
    st = {"dibuat": "2026-10-18T10:00:00+07:00",
          "gunung": [{"nama": "Semeru", "prov": "Jawa Timur", "level": 3, "lat": -8.108, "lon": 112.92, "radius_km": 5.0, "periode": "Sabtu, 18 Oktober 2026", "rekomendasi": "1. Tidak boleh beraktivitas dalam radius 5 km. 2. Waspada."},
                     {"nama": "Ibu", "prov": "Maluku Utara", "level": 2, "lat": 1.48, "lon": 127.63},
                     {"nama": "Merapi", "prov": "Daerah Istimewa Yogyakarta dan Jawa Tengah", "level": 1, "lat": -7.54, "lon": 110.44}],
          "perubahan": [{"nama": "Ibu", "dari": 1, "ke": 2, "tgl": "2026-10-18"}],
          "letusan_cakupan": {"dari": "2026-10-17T19:00+07:00", "sampai": "2026-10-18T10:00+07:00"},
          "letusan": [{"gunung": "Semeru", "waktu": "2026-10-18T03:12+07:00", "ket": "Kolom abu ke arah barat laut.", "tinggi_m": 500},
                      {"gunung": "Ibu", "waktu": "2026-10-17T20:00+07:00", "ket": "Terjadi erupsi."}],
          "riwayat": [{"tgl": "2026-10-17", "level": {"1": 40, "2": 24, "3": 4, "4": 0}, "erupsi": 1}]}
    abu = {"dibuat": "2026-10-18T09:00:00+07:00", "bandara_terdampak": [{"icao": "WARR", "iata": "SUB", "nama": "Juanda", "gunung": "semeru", "jam_tiba": 14}],
           "gunung": [{"id": "semeru", "nama": "Semeru", "jejak": [{"jam": 24, "jangkau_km": 48.4}, {"jam": 72, "jangkau_km": 120}]}]}
    return st, abu


def uji():
    st, abu = _contoh()
    cari = lambda lon, lat: ("35", "x", "y") if lat < -8 else None
    d = bangun(copy.deepcopy(st), abu, None, cari)
    assert U.periksa(d) == [], U.periksa(d)
    assert len(d["hari"]) == 7 and d["hari"][-1] == "2026-10-18" and d["hari_lengkap"] == "2026-10-17"
    nas = d["nasional"]
    assert nas["erupsi"][-1] == 1 and nas["erupsi"][0] is None, nas["erupsi"]  # null bukan 0
    assert nas["siaga_awas"][-1] == 1 and nas["siaga_awas"][-2] == 4 and nas["siaga_awas"][0] is None
    assert nas["bandara_abu"][-1] == 1 and nas["bandara_abu"][-2] is None and nas["kenaikan"][-1] == 1
    assert set(d["prov"]) >= {"35", "82"}, set(d["prov"])
    assert all(k in PROVINSI for k in d["prov"]) and d["kab"] == []
    t = [U.TINGKAT.index(s["tingkat"]) for s in d["sorot"]]
    assert t == sorted(t) and d["sorot"][0]["tingkat"] == "siaga", d["sorot"]
    assert d["prakiraan"]["baris"][0]["nilai"] == [48, None, 120]
    assert d["tambahan"][0]["baris"][0] == ["18 Okt 03.12", "Semeru", 500, "barat laut"], d["tambahan"][0]["baris"][0]
    s0 = copy.deepcopy(st)   # tanpa cakupan terbukti: tak ada hari 0, semua null (bukan 0 palsu)
    s0.pop("letusan_cakupan")
    assert bangun(s0, abu, None, cari)["nasional"]["erupsi"] == [None] * 7
    s1 = copy.deepcopy(st)   # cakupan basi (berhenti 17 Okt): hari sesudahnya null, hari penuh di dalamnya 0
    s1["letusan_cakupan"] = {"dari": "2026-10-15T00:00+07:00", "sampai": "2026-10-17T12:00+07:00"}
    e1 = bangun(s1, abu, None, cari)["nasional"]["erupsi"]
    assert e1[-4:] == [0, 0, None, None], e1  # 15,16 tercakup penuh; 17 (sampai tengah hari) dan 18 tidak
    # tanpa abu: metrik bandara dan prakiraan hilang; hari lama dari laporan sebelumnya dipertahankan
    d2 = bangun(copy.deepcopy(st), None, d, cari)
    assert [m["k"] for m in d2["metrik"]] == ["siaga_awas", "waspada_ke_atas", "erupsi", "kenaikan"] and "prakiraan" not in d2
    st2 = copy.deepcopy(st)
    st2["dibuat"] = "2026-10-19T10:00:00+07:00"
    d3 = bangun(st2, None, d, cari)
    assert d3["nasional"]["siaga_awas"][-3] == 4 and len(d3["hari"]) == 8, d3["nasional"]["siaga_awas"]
    d4 = copy.deepcopy(d)   # laporan lama tanpa erupsi_cakupan: nol (bisa palsu) tidak diwarisi, hitungan positif ya
    d4.pop("erupsi_cakupan")
    d4["nasional"]["erupsi"] = [0, 0, 0, 0, 0, 3, 0]
    s5 = copy.deepcopy(st)
    s5.pop("letusan_cakupan")
    assert bangun(s5, None, d4, cari)["nasional"]["erupsi"] == [None, None, None, None, None, 3, None], "nol warisan tanpa bukti harus null"
    print("laporan.py uji: lulus")


if __name__ == "__main__":
    uji() if sys.argv[1:] == ["uji"] else jalan()
