#!/usr/bin/env python3
"""Mesin renlap lintas bencana (PB-13, DESAIN-TEKNIS 8.1). Penilai target per jenis `SKOR[bencana]`, bobot di
scripts/operasi/bobot_renlap.json bagian `per_bencana` (HIPOTESIS untuk jenis tanpa uji balik, KEPUTUSAN-PARITAS D6).
Karhutla tetap dinilai oleh scripts/operasi/renlap.py (`kandidat`); di sini hanya dibungkus. Keluaran KML/GPX/teks/PDF: renlap_keluaran.py.
Python stdlib saja. Usulan lokasi untuk dilihat, bukan perintah terbang.

  python3 -I scripts/umum/renlap.py uji
  python3 -I scripts/umum/renlap.py buat --masukan BERKAS.json --keluar DIR
  python3 -I scripts/umum/renlap.py kirim --id H16 --bencana B --prov PP [--kab PPKK] --tanggal YYYY-MM-DD --versi N   (PB-14; env RENLAP_KUNCI, PB_URL)
masukan: {"bencana","tanggal","versi","base":[{id,nama,lat,lon}],"kandidat":[{lat,lon,tempat,fitur:{tingkat,baru,terdampak,fasilitas,belum_ditangani}}]}
  fitur 0..1 (atau null bila datanya tidak ada: tidak dihitung dan dicatat di alasan.tanpa_data, bukan dianggap 0).
Keluaran: renlap_<tanggal>_<versi>.json, .kml, .gpx.
"""
import argparse
import hashlib
import hmac
import importlib.util
import json
import os
import re
import sys
import time
import urllib.parse
import urllib.request
from datetime import datetime as dt_, timedelta
from pathlib import Path

AKAR = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(AKAR / "scripts/umum"))
import renlap_keluaran as K  # noqa: E402

BOBOT = AKAR / "scripts/operasi/bobot_renlap.json"
FITUR = ("tingkat", "baru", "terdampak", "fasilitas", "belum_ditangani")
_OP = None


def operasi():
    """scripts/operasi/renlap.py (geometri, pilih_cakupan, kandidat karhutla), dimuat dengan nama unik karena namanya sama dengan berkas ini."""
    global _OP
    if _OP is None:
        sp = importlib.util.spec_from_file_location("operasi_renlap", AKAR / "scripts/operasi/renlap.py")
        _OP = importlib.util.module_from_spec(sp)
        sys.modules["operasi_renlap"] = _OP
        sp.loader.exec_module(_OP)
    return _OP


def muat_bobot(jalur=BOBOT):
    return json.loads(Path(jalur).read_text(encoding="utf-8"))


def skor_generik(bencana, c, B):
    """sum(bobot[f] x fitur[f]) atas fitur yang ada. -> (skor, alasan). Fitur null/hilang masuk alasan.tanpa_data."""
    b = B["per_bencana"][bencana]["bobot"]
    ada = {f: c["fitur"][f] for f in FITUR if isinstance(c.get("fitur", {}).get(f), (int, float)) and not isinstance(c["fitur"][f], bool)}
    for f, v in ada.items():
        assert 0 <= v <= 1, (bencana, f, v)
    alasan = dict(ada, tanpa_data=[f for f in FITUR if f not in ada], hipotesis=True)
    return round(sum(b[f] * v for f, v in ada.items()), 2), alasan


def skor_karhutla(titik, temuan, B, **kw):
    """Karhutla tidak berubah: kandidat() milik operasi/renlap.py (titik panas, gambut, FFMC, permukiman)."""
    return operasi().kandidat(titik, temuan, B, **kw)


# ---- banjir (PB-15): dipindah dari scripts/operasi/renlap_banjir.py tanpa mengubah logikanya. Kandidat = kecamatan yang dilaporkan banjir
# belum surut (Koordalops, logbook Pusdalops, status banjir sistem); TIDAK ada skor ambang di logika lama: semua kecamatan itu jadi target,
# diberi ke base bandara terdekat, urut tetangga terdekat. Skor di bawah hanya tingkat tertinggi prakiraan (0..3), bukan penyaring. ----
# bandara publik (ICAO, koordinat aerodrome); tanpa VOR tercatat -> kolom radial dikosongkan
BASE = [
    {'id': 'BTJ', 'nama': 'Sultan Iskandar Muda', 'icao': 'WITT', 'lat': 5.5236, 'lon': 95.4206},
    {'id': 'MEQ', 'nama': 'Cut Nyak Dhien', 'icao': 'WITC', 'lat': 4.0500, 'lon': 96.2490},
    {'id': 'KNO', 'nama': 'Kualanamu', 'icao': 'WIMM', 'lat': 3.6422, 'lon': 98.8853},
]
LEVEL = {0: 'Normal', 1: 'Waspada', 2: 'Siaga', 3: 'Awas'}


def _jalur_banjir():
    for j in (AKAR / "data/laporan-bnpb/generator", AKAR / "scripts/banjir"):
        if str(j) not in sys.path:
            sys.path.insert(0, str(j))


def norm(s):
    return re.sub(r'\s+', ' ', (s or '').strip()).lower()


def kecamatan_kab(kode, kab, geo):
    """{nama_kecil: nama} kecamatan satu kab/kota dari batas kecamatan."""
    return {norm(f['properties']['kec']): f['properties']['kec'] for f in geo if f['properties']['kab'] == kab}


def nama_kecamatan(o, kode, kec_kab, kej):
    """-> (daftar nama kecamatan, sumber). Hanya nama yang benar-benar kecamatan kab/kota ini (logbook kadang mencampur kab tetangga)."""
    teks = ' '.join((o.get('butir') or {}).values()) + ' ' + (o.get('kondisi') or '')
    wa = [nm for k, nm in kec_kab.items() if re.search(r'\b' + re.escape(k) + r'\b', teks.lower())]
    if wa:
        return sorted(wa), 'WA Koordalops'
    # logbook: semua kejadian provinsi ini (logbook pernah mencatat kecamatan Gayo Lues di bawah Aceh Tenggara); nama dicocokkan
    # ke kecamatan kab/kota ini saja, toleran salah ketik kecil ("Deleng Pokhkison" = "Deleng Pokhkisen")
    from difflib import get_close_matches
    lb = {norm(c) for e in kej if any(k.startswith(f'{kode}|') for k in e.get('kab_kode', [])) for c in (e.get('kec') or [])}
    cocok = {(get_close_matches(k, list(kec_kab), 1, .85) or [None])[0] for k in lb}
    lb = sorted(kec_kab[k] for k in cocok if k)
    return (lb, 'logbook Pusdalops') if lb else ([], '')


def target(prov_list, tanggal, n_hari=6):
    _jalur_banjir()
    import situasi_banjir as S
    from bahaya import kecamatan
    from wilayah import PROVINSI
    st, dibuat = S.status_n_hari(n_hari)
    if st['hari'][0] < tanggal <= st['hari'][-1]:
        i = st['hari'].index(tanggal); st['hari'] = st['hari'][i:]
        for v in st['kec'].values(): v['b'], v['h3d'] = v['b'][i:], v['h3d'][i:]
    K = kecamatan()
    lb_path = AKAR / 'data/raw/dalops/banjir.json'
    kej = json.loads(lb_path.read_text())['kejadian'] if lb_path.exists() else []
    kode_dari = {v.lower(): k for k, v in PROVINSI.items()}
    out, wa_akhir = [], []
    for prov in prov_list:
        kode = kode_dari[prov.lower()]
        geo = json.loads((AKAR / f'public/geo/kecamatan/{kode}.json').read_text())['features']
        lap, wa0, wa1 = S.sudah_banjir(kode, tanggal)
        wa_akhir.append(wa1)
        for o in lap:
            if o['status'] != 'Belum surut':
                continue
            kec_kab = kecamatan_kab(kode, o['kab'], geo)
            nama, sumber = nama_kecamatan(o, kode, kec_kab, kej)
            if not nama:   # cadangan: kecamatan berstatus tertinggi di kab/kota ini
                cal = sorted(((max(v['b']), max(v['h3d']), k.split('|')[2]) for k, v in st['kec'].items() if k.startswith(f'{kode}|{o["kab"]}|')), reverse=True)
                nama, sumber = [c[2] for c in cal[:2]], 'prakiraan sistem'
            for nm in nama:
                k = f'{kode}|{o["kab"]}|{nm}'
                if k not in K:
                    continue
                v = st['kec'].get(k, {'b': [0] * len(st['hari']), 'h3d': [0] * len(st['hari'])})
                cincin = [f['geometry'] for f in geo if f['properties']['kab'] == o['kab'] and f['properties']['kec'] == nm]
                out.append(dict(prov=PROVINSI[kode], kode_prov=kode, kab=o['kab'], kec=nm, lat=K[k]['lat'], lon=K[k]['lon'], sumber_nama=sumber,
                                kondisi=S.rapi(o.get('kondisi')), akhir=o['akhir'], kk=o.get('kk'), ungsi=o.get('ungsi'),
                                darurat=S.status_darurat((o.get('butir') or {}).get('Penetapan status')), hari=st['hari'], lv=v['b'],
                                h3=max(v['h3d']) if v['h3d'] else 0, geom=cincin))
    return out, dibuat, max(w for w in wa_akhir if w)


def bagi_base(cp, base=None):
    base = base or BASE
    rute = {b['id']: dict(b, patroli=[]) for b in base}
    for c in cp:
        b = min(base, key=lambda b: operasi().jarak_nm(b['lat'], b['lon'], c['lat'], c['lon']))
        rute[b['id']]['patroli'].append(c)
    for b in rute.values():   # urut tetangga terdekat dari base
        sisa, pos, urut = list(b['patroli']), (b['lat'], b['lon']), []
        while sisa:
            n = min(sisa, key=lambda c: operasi().jarak_nm(pos[0], pos[1], c['lat'], c['lon']))
            sisa.remove(n); urut.append(n); pos = (n['lat'], n['lon'])
        for i, c in enumerate(urut, 1):
            c.update(urut=i, tempat=f"Kec. {c['kec']}, {c['kab']}")
        b['patroli'] = urut
    return [b for b in rute.values() if b['patroli']]



def skor_banjir(c, B=None):
    """-> (tingkat tertinggi 0..3, alasan). Bukan penyaring: bagi_base memakai semua kandidat (perilaku renlap_banjir.py lama)."""
    t = max(c.get("lv") or [0])
    return float(t), {"tingkat": t, "sumber_nama": c.get("sumber_nama")}


SKOR = {  # satu penilai per id di public/bencana.json; jenis tanpa uji balik = bobot sama rata berlabel HIPOTESIS
    "karhutla": skor_karhutla,
    "banjir": skor_banjir,
    **{i: (lambda c, B, _i=i: skor_generik(_i, c, B)) for i in
       ("pesisir", "cuaca", "gempa", "udara", "gunungapi", "kekeringan")},
}


def susun(bencana, kandidat, base, B, patroli_maks=None, r_km=None):
    """Nilai kandidat jenis `bencana`, pilih per base menurut cakupan (pilih_cakupan karhutla), urut tetangga terdekat."""
    assert bencana in SKOR and bencana != "karhutla", "karhutla lewat scripts/operasi/renlap.py"
    O = operasi()
    nilai = []
    for c in kandidat:
        s, al = SKOR[bencana](c, B)
        if s >= B["ambang"]["skor_minimum"]:
            nilai.append(dict(c, skor=s, alasan=al, n=1))
    patroli_maks = patroli_maks or B["batas"]["patroli_maks"]
    r_km = r_km or B["ambang"]["radius_pandang_km"]
    milik = {b["id"]: [] for b in base}
    for c in nilai:
        milik[min(base, key=lambda b: O.jarak_nm(b["lat"], b["lon"], c["lat"], c["lon"]))["id"]].append(c)
    out = []
    for b in base:
        pilih, sisa = O.pilih_cakupan(milik[b["id"]], patroli_maks, r_km)
        rute = O.urut_tetangga((b["lat"], b["lon"]), pilih)
        out.append(dict(b, patroli=[dict(c, urut=i + 1) for i, c in enumerate(rute)], wb=[],
                        di_luar_rute={"sel": len(sisa), "titik": len(sisa)} if rute else None))
    return {"bencana": bencana, "status": "draf", "bobot_label": B["per_bencana"][bencana]["label"],
            "catatan": "USULAN lokasi untuk dilihat, bukan perintah terbang.", "base": out}


def buat(a):
    m = json.loads(Path(a.masukan).read_text(encoding="utf-8"))
    r = susun(m["bencana"], m["kandidat"], m["base"], muat_bobot())
    r.update(tanggal=m["tanggal"], versi=m.get("versi", "pagi"))
    k = Path(a.keluar)
    k.mkdir(parents=True, exist_ok=True)
    n = "renlap_%s_%s" % (r["tanggal"], r["versi"])
    (k / (n + ".json")).write_text(json.dumps(r, ensure_ascii=False, indent=1), encoding="utf-8")
    (k / (n + ".kml")).write_text(K.kml(r["base"], n), encoding="utf-8")
    (k / (n + ".gpx")).write_text(K.gpx(r["base"], n), encoding="utf-8")
    print("ditulis %s.{json,kml,gpx}; base: %s" % (k / n, ", ".join("%s p%d" % (b["id"], len(b["patroli"])) for b in r["base"])))


# ---- PB-14: subperintah kirim (dipanggil workflow renlap-pb.yml). Berkas dikirim di badan callback; Worker menulis R2. ----
def ringkas(isi):
    """persis ringkasBerkas di src/pb_isian.js: fmt:sha256(utf-8) urut abjad, dipisah koma"""
    return ",".join("%s:%s" % (f, hashlib.sha256(isi[f].encode("utf-8")).hexdigest()) for f in sorted(isi))


def tanda(kunci, pesan):
    return hmac.new(kunci.encode("utf-8"), pesan.encode("utf-8"), hashlib.sha256).hexdigest()


def cek_argumen(a, reg):
    """validasi ulang tegas (workflow sudah memvalidasi; ini sabuk kedua). ValueError bila jahat."""
    ok = (re.fullmatch(r"[0-9a-f]{16}", a.id or "") and a.bencana in reg and re.fullmatch(r"\d{2}", a.prov or "")
          and re.fullmatch(r"(\d{4})?", a.kab or "") and (a.kab or a.prov).startswith(a.prov)
          and re.fullmatch(r"\d{4}-\d{2}-\d{2}", a.tanggal or "") and re.fullmatch(r"\d{1,2}", a.versi or ""))
    if not ok:
        raise ValueError("argumen tidak sah")


def _http(metode, url, kunci, pesan, badan=None, waktu=None):
    w = str(waktu or int(time.time()))
    kep = {"x-renlap-waktu": w, "x-renlap-kunci": tanda(kunci, w and pesan.replace("{w}", w)), "User-Agent": "renlap-pb/1"}
    if badan is not None:
        kep["Content-Type"] = "application/json"
    rq = urllib.request.Request(url, data=badan, headers=kep, method=metode)
    with urllib.request.urlopen(rq, timeout=30) as r:
        return json.loads(r.read().decode("utf-8"))


def lapor(base_url, kunci, rid, status, isi=None, jml=None, galat=None):
    """POST callback selesai; ringkas diikat ke HMAC. Tanpa berkas bila gagal."""
    isi = isi or {}
    o = {"id": rid, "status": status, "berkas": isi}
    if jml is not None:
        o["jml_target"] = jml
    if galat:
        o["galat"] = galat[:200]
    _http("POST", base_url + "/api/pb/renlap/selesai", kunci, "%s|{w}|%s|%s" % (rid, status, ringkas(isi)), json.dumps(o, ensure_ascii=False).encode("utf-8"))


def ambil_titik(base_url, kunci, a):
    q = urllib.parse.urlencode({"bencana": a.bencana, "prov": a.prov, "kab": a.kab})
    return _http("GET", base_url + "/api/pb/titik/mesin?" + q, kunci, "titik|{w}|%s|%s|%s" % (a.bencana, a.prov, a.kab)).get("titik") or []


def rakit_banjir(a, titik, B, ambil=None):
    """banjir: kandidat = kecamatan banjir belum surut dari data repo (`target`); base = titik sarana bila ada, selain itu bandara BASE.
    Sumber gagal dibaca -> RuntimeError, sehingga `kirim` melapor status gagal (bukan draf kosong yang tampak sah)."""
    base = [{"id": str(t.get("id", ""))[:12] or "B%d" % (i + 1), "nama": t.get("nama") or "Sarana", "icao": "", "lat": t["lat"], "lon": t["lon"]}
            for i, t in enumerate(titik) if t.get("golongan") == "sarana" and isinstance(t.get("lat"), (int, float)) and isinstance(t.get("lon"), (int, float))] or None
    try:
        _jalur_banjir()
        from wilayah import PROVINSI
        cp = (ambil or target)([PROVINSI[a.prov]], a.tanggal)[0]
    except Exception as e:
        raise RuntimeError("sumber target banjir gagal dibaca: %s" % type(e).__name__) from e
    rute = bagi_base(cp, base) if cp else []
    nama = "renlap_%s_%s" % (a.tanggal, a.versi)
    jml = sum(len(b["patroli"]) for b in rute)
    r = {"bencana": "banjir", "status": "draf", "bobot_label": B["per_bencana"]["banjir"]["label"],
         "catatan": "USULAN lokasi untuk dilihat, bukan perintah terbang.", "tanggal": a.tanggal, "versi": a.versi, "jml_target": jml,
         "base": [{k: v for k, v in b.items() if k != "geom"} | {"patroli": [{k: v for k, v in c.items() if k != "geom"} for c in b["patroli"]]} for b in rute]}
    if not jml:
        r["alasan_kosong"] = "tidak ada kecamatan banjir belum surut"
    isi = {"json": json.dumps(r, ensure_ascii=False, indent=1, default=str), "kml": K.kml_banjir(rute, nama), "gpx": K.gpx_banjir(rute, nama),
           "txt": K.teks_banjir(rute, a.tanggal) if rute else "USULAN TARGET banjir, %s (versi %s)\nTidak ada target: %s.\n" % (a.tanggal, a.versi, r["alasan_kosong"])}
    return r, isi


ABRASI = AKAR / "public/pesisir/data/abrasi.json"


def target_pesisir(jalur=ABRASI):
    """-> (dibuat, kandidat). Kandidat = transek abrasi.json berkelas 'abrasi' (laju mundur nyata menurut selang 95%), keyakinan bukan rendah,
    tanpa 'gangguan'/'tinjau' (kriteria sama dengan ringkasan abrasi.py). TANPA ambang kritis: abrasi.py dan dokumen tidak menulis angka
    m/tahun kritis, jadi semua yang lolos disusun menurut urutan laju. Fitur `tingkat` = |laju| / |laju| terbesar di antara kandidat (0..1);
    ini peringkat relatif, bukan ukuran bahaya, dan skornya HIPOTESIS (bobot sama rata, skor_generik). Fitur lain tanpa data."""
    d = json.loads(Path(jalur).read_text(encoding="utf-8"))
    ok = [t for t in d["transek"] if t.get("kelas") == "abrasi" and t.get("keyakinan") in ("sedang", "tinggi")
          and not t.get("gangguan") and not t.get("tinjau") and isinstance(t.get("laju"), (int, float)) and t["laju"] < 0
          and isinstance(t.get("lat"), (int, float)) and isinstance(t.get("lon"), (int, float))]
    mk = max((-t["laju"] for t in ok), default=1) or 1
    th = (d.get("dibuat") or "")[:10]
    kand = []
    for t in ok:
        a = t.get("periode") or [None, None]
        kand.append({"id": t["id"], "lat": t["lat"], "lon": t["lon"], "fitur": {"tingkat": round(-t["laju"] / mk, 3)}, "laju": t["laju"],
                     "tempat": "Transek %s, %s: laju %s m/th (%s, keyakinan %s), periode garis pantai %s sampai %s, berkas dibuat %s"
                               % (t["id"], t.get("desa") or "desa tidak tercatat", str(t["laju"]).replace(".", ","), t["kelas"], t["keyakinan"], a[0], a[1], th)})
    return d.get("dibuat"), kand


def rakit_pesisir(a, titik, B, ambil=None):
    """pesisir: kandidat = transek abrasi kritis (`target_pesisir`); base = titik sarana bila ada, selain itu SATU base semu 'Tanpa base'
    di koordinat target teratas (target tetap ditulis). prov/kab tidak menyaring: abrasi.json hanya memuat situs tetap yang dipantau.
    Sumber gagal dibaca -> RuntimeError (kirim melapor gagal)."""
    base = [{"id": str(t.get("id", ""))[:12] or "B%d" % (i + 1), "nama": t.get("nama") or "Sarana", "lat": t["lat"], "lon": t["lon"]}
            for i, t in enumerate(titik) if t.get("golongan") == "sarana" and isinstance(t.get("lat"), (int, float)) and isinstance(t.get("lon"), (int, float))]
    try:
        dibuat, kand = (ambil or target_pesisir)()
    except Exception as e:
        raise RuntimeError("sumber target pesisir gagal dibaca: %s" % type(e).__name__) from e
    kand = sorted(kand, key=lambda c: (-c["fitur"]["tingkat"], c["id"]))
    if not base and kand:
        base = [{"id": "tanpa-base", "nama": "Tanpa base (titik awal = target teratas)", "lat": kand[0]["lat"], "lon": kand[0]["lon"]}]
    Bs = dict(B, ambang=dict(B["ambang"], skor_minimum=0))   # tanpa penyaring ambang: urutan laju saja
    r = susun("pesisir", kand, base, Bs) if base else {"bencana": "pesisir", "status": "draf", "bobot_label": B["per_bencana"]["pesisir"]["label"],
                                                      "catatan": "USULAN lokasi untuk dilihat, bukan perintah terbang.", "base": []}
    for b in r["base"]:
        for c in b["patroli"]:
            c["alasan"]["laju_m_per_th"] = c["laju"]
    jml = sum(len(b["patroli"]) for b in r["base"])
    r.update(tanggal=a.tanggal, versi=a.versi, jml_target=jml, bobot_label=r["bobot_label"].lower(),
             catatan="Usulan lokasi untuk dilihat, bukan perintah terbang.",
             sumber_data={"berkas": "abrasi.json", "dibuat": dibuat, "catatan": "abrasi tahunan: laju dari deret garis pantai; hanya situs yang dipantau; tanpa ambang laju dari sumber; skor relatif terhadap transek terburuk yang lolos saringan"})
    if not jml:
        r["alasan_kosong"] = "tidak ada transek abrasi nyata berkeyakinan sedang atau tinggi"
    nama = "renlap_%s_%s" % (a.tanggal, a.versi)
    t = ["Usulan target pesisir (abrasi), %s (versi %s)" % (a.tanggal, a.versi),
         "Usulan lokasi untuk dilihat, bukan perintah terbang. Skor hipotesis, urutan laju mundur, tanpa ambang laju dari sumber.",
         "Skor relatif terhadap transek terburuk yang lolos saringan (laju mundur terbesar = 1,00); laju mentah di samping skor.",
         "Data abrasi tahunan, berkas dibuat %s (bukan kondisi hari ini)." % (str(dibuat)[:10] or "tanggal tidak tercatat")]
    for b in r["base"]:
        t.append("\nBase %s" % b["nama"])
        t += ["%d. %s\n   laju %s m/th, skor %s\n   %.5f, %.5f" % (c["urut"], c["tempat"], str(c["laju"]).replace(".", ","), str(c["skor"]).replace(".", ","), c["lat"], c["lon"])
              for c in b["patroli"]]
    if not jml:
        t.append("Tidak ada target: %s." % r["alasan_kosong"])
    tb = [dict(b, id="tanpa base") if b["id"] == "tanpa-base" else b for b in r["base"]]   # nama titik kml/gpx: "tanpa base CP1"
    isi = {"json": json.dumps(r, ensure_ascii=False, indent=1, default=str), "kml": K.kml(tb, nama), "gpx": K.gpx(tb, nama), "txt": "\n".join(t) + "\n"}
    return r, isi


# ---- PB-37/39/41/43/45: udara, kekeringan, cuaca, gempa, gunung api. Sumber target = keluaran yang ADA di repo (nama berkas di docstring tiap
# fungsi); tanpa ambang karangan; skor skor_generik sama rata berlabel hipotesis; fitur 0..1 = nilai relatif terhadap yang terbesar di antara
# kandidat (rumus ditulis di docstring dan di keluaran). Level resmi (pvmbg) hanya dicatat dan menyaring, tidak masuk skor. Keluaran yang
# dibutuhkan tidak ada atau tidak bertanggal cocok -> 0 target dengan `alasan_kosong` jujur, bukan karangan. Sumber gagal dibaca -> RuntimeError.
PUSAT_KEC = AKAR / "public/banjir/data/pusat_kec.json"
ASAP = AKAR / "public/data/asap.json"
KEKERINGAN = AKAR / "public/data/kekeringan_wilayah.json"
KEKERINGAN_META = AKAR / "public/data/kekeringan_meta.json"
CUACA_KEC = AKAR / "public/banjir/data/cuaca_kec.json"
GEMPA_M5 = AKAR / "public/gempa/data/riwayat_m5.json"
GUNUNG_STATUS = AKAR / "public/banjir/data/gunungapi_status.json"


def _js(jalur):
    return json.loads(Path(jalur).read_text(encoding="utf-8"))


def _koma(x):
    return str(x).replace(".", ",")


def _rel_tetap(kand, pembagi, kunci):
    """fitur `kunci` = nilai mentah (`_n`) / pembagi, 0..1."""
    for c in kand:
        c["fitur"] = {kunci: round(c.pop("_n") / pembagi, 3)}
    return kand


def _rel(kand, kunci):
    """pembagi = nilai mentah terbesar di antara kandidat: peringkat relatif, bukan ukuran bahaya."""
    return _rel_tetap(kand, max((c["_n"] for c in kand), default=1) or 1, kunci)


def target_udara(prov, tanggal, jalur=ASAP):
    """-> (meta, kandidat). Sumber: public/data/asap.json (prakiraan cams 1 derajat, 4 hari) + public/banjir/data/pusat_kec.json. Saringan sama dengan
    scripts/udara/dampak_udara.py: kecamatan provinsi `prov` yang pm2,5 rata-rata 24 jam sel cams-nya di atas batas baik+sedang (kec_tidak_sehat,
    55,4 ug/m3). Kandidat = satu per sel cams (pusat = rata-rata pusat kecamatan di sel itu); fitur `tingkat` = pm2,5 sel / pm2,5 sel terbesar.
    `tanggal` harus ada di asap.json["hari"], kalau tidak 0 target (prakiraan tak mencakup tanggalnya)."""
    sp = importlib.util.spec_from_file_location("pb_dampak_udara", AKAR / "scripts/udara/dampak_udara.py")
    du = importlib.util.module_from_spec(sp)
    sys.modules["pb_dampak_udara"] = du
    sp.loader.exec_module(du)
    asap = _js(jalur)
    meta = {"berkas": "asap.json, pusat_kec.json", "dibuat": asap.get("dibuat"),
            "data": "prakiraan cams per sel 1 derajat untuk %s, berkas dibuat %s" % (tanggal, str(asap.get("dibuat"))[:10]),
            "catatan": "perkiraan model kasar (kisi sekitar 40 km, belum dikoreksi ke alat ukur); batas pm2,5 55,4 ug/m3 sama dengan dampak_udara.py; skor relatif terhadap sel terburuk"}
    if tanggal not in asap["hari"]:
        meta["alasan_kosong"] = "prakiraan asap hanya mencakup %s sampai %s, tidak mencakup %s" % (asap["hari"][0], asap["hari"][-1], tanggal)
        return meta, []
    d = asap["hari"].index(tanggal)
    i = asap["kolom"].index("pm25_rata") - 2
    pm = {du.kualitas.kunci_sel(r[0], r[1]): r[2:][i][d] for r in asap["grid"]}
    pusat = {k: v for k, v in _js(PUSAT_KEC).items() if k.startswith(prov + "|")}
    sel = {}
    for k in du.kec_tidak_sehat(asap, pusat, d):
        sel.setdefault(du.kualitas.kunci_sel(*pusat[k]), []).append(pusat[k])
    kand = [{"id": "sel-%s,%s" % s, "lat": round(sum(p[0] for p in v) / len(v), 4), "lon": round(sum(p[1] for p in v) / len(v), 4), "_n": pm[s],
             "pm25": pm[s], "n_kec": len(v),
             "tempat": "Sel cams %s, %s: pm2,5 rata-rata 24 jam %s ug/m3 (batas %s), %d kecamatan, prakiraan %s"
                       % (_koma(s[0]), _koma(s[1]), _koma(pm[s]), _koma(du.BATAS), len(v), tanggal)} for s, v in sorted(sel.items()) if pm[s] is not None]
    return meta, _rel(kand, "tingkat")


def target_kekeringan(prov, tanggal, jalur=KEKERINGAN):
    """-> (meta, kandidat). Sumber: public/data/kekeringan_wilayah.json (tingkat kabupaten hasil scripts/kekeringan/status.py) + kekeringan_meta.json
    (hari_ini) + pusat_kec.json (pusat kabupaten = rata-rata pusat kecamatannya). Saringan sama dengan dampak.py (Siaga dan Awas): kabupaten provinsi `prov`
    bertingkat 2 atau 3. Fitur `tingkat` = tingkat / 3 (tingkat model sendiri, hipotesis; ambang spi3 belum lolos uji balik). `tanggal` tidak menyaring:
    berkas ini keadaan harian terakhir, tanggalnya dibedakan di `data`."""
    w, m = _js(jalur), _js(KEKERINGAN_META)
    pus = _js(PUSAT_KEC)
    meta = {"berkas": "kekeringan_wilayah.json, kekeringan_meta.json, pusat_kec.json", "dibuat": m.get("hari_ini"),
            "data": "keadaan kekeringan hari %s (bukan kondisi tanggal usulan bila berbeda)" % m.get("hari_ini"),
            "catatan": "tingkat model sendiri (hipotesis, ambang belum lolos uji balik); skor relatif: tingkat dibagi 3"}
    kand, tanpa = [], 0
    for k, v in sorted(w["kab"].items()):
        if not k.startswith(prov + "|") or v["lv"] < 2:
            continue
        ps = [p for kk, p in pus.items() if kk.startswith(k + "|")]
        if not ps:
            tanpa += 1
            continue
        kand.append({"id": k, "lat": round(sum(p[0] for p in ps) / len(ps), 4), "lon": round(sum(p[1] for p in ps) / len(ps), 4), "_n": v["lv"], "tingkat_model": v["lv"],
                     "spi3": v.get("spi3"), "jiwa_tingkat2_ke_atas": v["jiwa"][1],
                     "tempat": "%s: tingkat %d dari 3 (model, hipotesis), spi3 %s, hujan 3 bulan %s mm, penduduk di kecamatan bertingkat 2 ke atas %d jiwa, keadaan hari %s"
                               % (k.split("|", 1)[1], v["lv"], _koma(v.get("spi3")), v.get("mm3"), v["jiwa"][1], m.get("hari_ini"))})
    if tanpa:
        meta["catatan"] += "; %d kabupaten tanpa koordinat pusat dilewati" % tanpa
    return meta, _rel_tetap(kand, 3, "tingkat")


def target_cuaca(prov, tanggal, jalur=CUACA_KEC):
    """-> (meta, kandidat). Sumber: public/banjir/data/cuaca_kec.json (scripts/cuaca/prakiraan_kec.py, indeks baris = urutan pusat_kec.json). Saringan sama
    dengan dampak_cuaca.py (zona): kecamatan provinsi `prov` bertingkat >= 2 pada `tanggal` (harus ada di berkas, kalau tidak 0 target). Fitur `tingkat` =
    tingkat / 3 (tingkat model dari hujan 50/100/150 mm, embusan 54/72/90 km/jam, gelombang; ambang hipotesis). Peringatan nowcast bmkg di
    public/data/peringatan.json hanya bersumber resmi dan berumur jam: tidak masuk skor."""
    c = _js(jalur)
    meta = {"berkas": "cuaca_kec.json, pusat_kec.json", "dibuat": c.get("dibuat"),
            "data": "prakiraan tingkat kecamatan untuk %s, berkas dibuat %s" % (tanggal, str(c.get("dibuat"))[:10]),
            "catatan": "tingkat model sendiri (ambang hipotesis, uji balik hujan 50 mm belum lolos); peringatan resmi bmkg tidak masuk skor; skor relatif: tingkat dibagi 3"}
    if tanggal not in c["hari"]:
        meta["alasan_kosong"] = "prakiraan kecamatan hanya mencakup %s sampai %s, tidak mencakup %s" % (c["hari"][0], c["hari"][-1], tanggal)
        return meta, []
    n = c["hari"].index(tanggal)
    kunci = list(_js(PUSAT_KEC).items())
    kand = []
    for r in c["kec"]:
        k, (la, lo) = kunci[r[0]]
        t = r[1][n]
        if not k.startswith(prov + "|") or t is None or t < 2:
            continue
        pp, kb, kc = k.split("|")
        mm, g = r[4][n], r[5][n]
        kand.append({"id": k, "lat": la, "lon": lo, "_n": t, "tingkat_model": t, "hujan_mm": mm, "embusan_kmj": g,
                     "tempat": "Kec. %s, %s: tingkat %d dari 3 (model, hipotesis), hujan %s, embusan %s, prakiraan %s"
                               % (kc, kb, t, "%d mm" % mm if mm is not None else "tanpa data", "%d km/jam" % g if g is not None else "tanpa data", tanggal)})
    return meta, _rel_tetap(kand, 3, "tingkat")


def target_gempa(prov, tanggal, jalur=GEMPA_M5):
    """-> (meta, kandidat). Sumber: public/gempa/data/riwayat_m5.json (katalog usgs, kolom waktu_utc, lat, lon, dalam_km, m, prov). Saringan sama dengan
    scripts/umum/paparan_bangunan.py gempa(): magnitudo >= 5 dalam 30 hari terakhir katalog (dihitung dari kejadian terakhir di berkas), provinsi `prov`.
    Fitur `tingkat` = magnitudo / magnitudo terbesar di antara kandidat (peringkat relatif; kedalaman dan jarak ke permukiman tidak dihitung). Paparan bangunan
    (data/terkunci, di luar repo) dan mmi tidak dipakai. Katalog usgs tertinggal beberapa hari: umurnya tampil di `data`, `tanggal` tidak menyaring."""
    r = _js(jalur)
    ev = [dict(zip(r["kolom"], b)) for b in r["baris"]]
    meta = {"berkas": "riwayat_m5.json", "dibuat": None, "catatan": "peringkat relatif magnitudo; tanpa mmi, tanpa paparan bangunan (berkasnya terkunci di luar repo); gempa laut ikut bila provinsinya tercatat"}
    if not ev:
        meta.update(data="katalog kosong", alasan_kosong="riwayat_m5.json kosong")
        return meta, []
    akhir = max(e["waktu_utc"] for e in ev)
    batas = (dt_.fromisoformat(akhir) - timedelta(days=30)).isoformat(timespec="minutes")
    meta.update(dibuat=akhir, data="katalog usgs, gempa magnitudo 5 ke atas 30 hari sampai %s utc (kejadian terakhir di berkas)" % akhir.replace("T", " "))
    kand = [{"id": "%s_%s" % (e["waktu_utc"], e["prov"]), "lat": e["lat"], "lon": e["lon"], "_n": e["m"], "magnitudo": e["m"], "dalam_km": e["dalam_km"],
             "tempat": "Gempa m%s, %s utc, kedalaman %s km, provinsi %s" % (_koma(e["m"]), e["waktu_utc"].replace("T", " "), _koma(e["dalam_km"]), e["prov"])}
            for e in ev if e["waktu_utc"] >= batas and e["m"] >= 5 and e["prov"] == prov]
    return meta, _rel(kand, "tingkat")


def target_gunungapi(prov, tanggal, jalur=GUNUNG_STATUS):
    """-> (meta, kandidat). Sumber: public/banjir/data/gunungapi_status.json (magma pvmbg; penduduk_radius dari cincin paparan worldpop 1 km, scripts/gunungapi/
    magma.py dan pop_grid.py). Saringan sama dengan scripts/gunungapi/dampak.py terpapar() (radius rekomendasi dan penduduk dalam radius > 0), ditambah level resmi 2 ke atas (terpapar() tidak menyaring level);
    provinsi `prov` dicocokkan per token nama (dipecah koma dan ' dan ', awalan daerah istimewa/di dibuang; gunung lintas provinsi masuk bila salah satunya). Level resmi pvmbg hanya dicatat dan menyaring, TIDAK masuk skor.
    Fitur `terdampak` = penduduk dalam radius / penduduk terbanyak di antara kandidat (peringkat relatif)."""
    s = _js(jalur)
    _jalur_banjir()
    from wilayah import PROVINSI
    def token(x):
        x = x.strip().lower()
        for aw in ("daerah istimewa ", "di "):
            x = x[len(aw):] if x.startswith(aw) else x
        return x
    nama = token(PROVINSI[prov])
    lv = {2: "waspada", 3: "siaga", 4: "awas"}
    meta = {"berkas": "gunungapi_status.json", "dibuat": s.get("dibuat"),
            "data": "status resmi pvmbg, berkas dibuat %s (bukan kondisi tanggal usulan bila berbeda)" % str(s.get("dibuat"))[:10],
            "catatan": "level resmi pvmbg hanya menyaring (level 2 ke atas) dan dicatat, tidak dihitung dalam skor; skor relatif: penduduk dalam radius dibagi penduduk terbanyak"}
    kand = [{"id": g["nama"], "lat": g["lat"], "lon": g["lon"], "_n": g["penduduk_radius"], "level_resmi": g["level"], "radius_km": g["radius_km"], "penduduk_radius": g["penduduk_radius"],
             "tempat": "G. %s, %s: status resmi level %d (%s), radius rekomendasi %s km, penduduk dalam radius sekitar %d jiwa (worldpop 1 km), periode laporan %s"
                       % (g["nama"], g["prov"], g["level"], lv.get(g["level"], "?"), _koma(g["radius_km"]), g["penduduk_radius"], (g.get("periode") or "tidak tercatat").replace("WIB", "wib"))}
            for g in s["gunung"] if g.get("level", 1) >= 2 and g.get("radius_km") and (g.get("penduduk_radius") or 0) > 0 and nama in [token(t) for t in re.split(r",| dan ", g.get("prov") or "")]]
    return meta, _rel(kand, "terdampak")


def _rakit_jenis(bencana, a, titik, B, ambil, default):
    """satu rakit untuk jenis tanpa uji balik: base = titik sarana bila ada, selain itu SATU base semu 'tanpa-base' di target teratas.
    ambil(prov, tanggal) -> (meta, kandidat); gagal -> RuntimeError (kirim melapor gagal)."""
    base = [{"id": str(t.get("id", ""))[:12] or "B%d" % (i + 1), "nama": t.get("nama") or "Sarana", "lat": t["lat"], "lon": t["lon"]}
            for i, t in enumerate(titik) if t.get("golongan") == "sarana" and isinstance(t.get("lat"), (int, float)) and isinstance(t.get("lon"), (int, float))]
    try:
        meta, kand = (ambil or default)(a.prov, a.tanggal)
    except Exception as e:
        raise RuntimeError("sumber target %s gagal dibaca: %s" % (bencana, type(e).__name__)) from e
    kand = sorted(kand, key=lambda c: (-sum(c["fitur"].values()), c["id"]))
    if not base and kand:
        base = [{"id": "tanpa-base", "nama": "Tanpa base (titik awal = target teratas)", "lat": kand[0]["lat"], "lon": kand[0]["lon"]}]
    Bs = dict(B, ambang=dict(B["ambang"], skor_minimum=0))
    r = susun(bencana, kand, base, Bs) if base else {"bencana": bencana, "status": "draf", "bobot_label": B["per_bencana"][bencana]["label"],
                                                       "catatan": "", "base": []}
    ekstra = ("id", "lat", "lon", "fitur", "tempat", "urut", "skor", "alasan", "n")
    for b in r["base"]:
        for c in b["patroli"]:
            c["alasan"].update({k: v for k, v in c.items() if k not in ekstra})
            for k in [k for k in c if k not in ekstra]:
                del c[k]
    jml = sum(len(b["patroli"]) for b in r["base"])
    r.update(tanggal=a.tanggal, versi=a.versi, jml_target=jml, bobot_label=r["bobot_label"].lower(),
             catatan="Usulan lokasi untuk dilihat, bukan perintah terbang.",
             sumber_data={"berkas": meta["berkas"], "dibuat": meta["dibuat"], "data": meta["data"], "catatan": meta["catatan"]})
    if not jml:
        r["alasan_kosong"] = meta.get("alasan_kosong") or "tidak ada target %s di provinsi ini dari %s" % (bencana, meta["berkas"])
    nama = "renlap_%s_%s" % (a.tanggal, a.versi)
    t = ["Usulan target %s, %s (versi %s)" % (bencana, a.tanggal, a.versi),
         "Usulan lokasi untuk dilihat, bukan perintah terbang. Skor hipotesis, bobot sama rata, tanpa ambang karangan.",
         "Skor: %s." % meta["catatan"], "Data: %s." % meta["data"]]
    for b in r["base"]:
        t.append("\nBase %s" % b["nama"])
        t += ["%d. %s\n   skor %s\n   %.5f, %.5f" % (c["urut"], c["tempat"], _koma(c["skor"]), c["lat"], c["lon"]) for c in b["patroli"]]
    if not jml:
        t.append("Tidak ada target: %s." % r["alasan_kosong"])
    tb = [dict(b, id="tanpa base") if b["id"] == "tanpa-base" else b for b in r["base"]]
    isi = {"json": json.dumps(r, ensure_ascii=False, indent=1, default=str), "kml": K.kml(tb, nama), "gpx": K.gpx(tb, nama), "txt": "\n".join(t) + "\n"}
    return r, isi


def rakit_udara(a, titik, B, ambil=None):
    return _rakit_jenis("udara", a, titik, B, ambil, target_udara)


def rakit_kekeringan(a, titik, B, ambil=None):
    return _rakit_jenis("kekeringan", a, titik, B, ambil, target_kekeringan)


def rakit_cuaca(a, titik, B, ambil=None):
    return _rakit_jenis("cuaca", a, titik, B, ambil, target_cuaca)


def rakit_gempa(a, titik, B, ambil=None):
    return _rakit_jenis("gempa", a, titik, B, ambil, target_gempa)


def rakit_gunungapi(a, titik, B, ambil=None):
    return _rakit_jenis("gunungapi", a, titik, B, ambil, target_gunungapi)


RAKIT = {"udara": rakit_udara, "kekeringan": rakit_kekeringan, "cuaca": rakit_cuaca, "gempa": rakit_gempa, "gunungapi": rakit_gunungapi}


def rakit(a, titik, B, ambil=None):
    if a.bencana == "banjir":
        return rakit_banjir(a, titik, B, ambil)
    if a.bencana == "pesisir":
        return rakit_pesisir(a, titik, B, ambil)
    if a.bencana in RAKIT:
        return RAKIT[a.bencana](a, titik, B, ambil)
    """base = titik golongan sarana; kandidat target: KOSONG (belum ada sumber target per bencana dengan skema terjamin di repo, tidak dikarang)."""
    base = [{"id": str(t.get("id", ""))[:12] or "B%d" % (i + 1), "nama": t.get("nama") or "Sarana", "lat": t["lat"], "lon": t["lon"]}
            for i, t in enumerate(titik) if t.get("golongan") == "sarana" and isinstance(t.get("lat"), (int, float)) and isinstance(t.get("lon"), (int, float))]
    r = {"bencana": a.bencana, "status": "draf", "bobot_label": B["per_bencana"][a.bencana]["label"],
         "catatan": "USULAN lokasi untuk dilihat, bukan perintah terbang.", "base": [dict(b, patroli=[], wb=[], di_luar_rute=None) for b in base],
         "tanggal": a.tanggal, "versi": a.versi, "alasan_kosong": "belum ada sumber target", "jml_target": 0}
    n = "renlap_%s_%s" % (a.tanggal, a.versi)
    return r, {"json": json.dumps(r, ensure_ascii=False, indent=1), "kml": K.kml(r["base"], n), "gpx": K.gpx(r["base"], n),
               "txt": "USULAN TARGET %s, %s (versi %s)\nUsulan lokasi untuk dilihat, bukan perintah terbang.\nTidak ada target: belum ada sumber target.\n" % (a.bencana, a.tanggal, a.versi)}


def kirim(a):
    kunci = os.environ.get("RENLAP_KUNCI", "")
    if not kunci:
        print("RENLAP_KUNCI wajib", file=sys.stderr)
        return 2
    url = os.environ.get("PB_URL", "https://centurisk97.id").rstrip("/")
    try:
        reg = [b["id"] for b in json.loads((AKAR / "public/bencana.json").read_text(encoding="utf-8"))["bencana"]]
        cek_argumen(a, reg)
    except Exception as e:
        print("argumen: %s" % e, file=sys.stderr)
        return 2
    try:
        r, isi = rakit(a, ambil_titik(url, kunci, a), muat_bobot())
        lapor(url, kunci, a.id, "draf", isi, r["jml_target"])
        print("terkirim %s: %d base, %d target" % (a.id, len(r["base"]), r["jml_target"]))
        return 0
    except Exception as e:
        try:
            lapor(url, kunci, a.id, "gagal", galat="%s: %s" % (type(e).__name__, e))
        except Exception:
            pass
        print("gagal: %s" % e, file=sys.stderr)
        return 1


# SHA-256 teks karhutla dari kode SEBELUM ekstraksi (operasi/renlap.py teks(), 15 Nov 2026) atas masukan sintetis di bawah.
EMAS_TEKS = "3df952cd5d04837a00a5335696596653f965eb24e79c5784d61a00fae994fd1e"


def contoh_karhutla():
    c = {"lat": -0.2, "lon": 109.5, "skor": 5.5, "n": 3, "urut": 1, "tempat": "Desa A, Kec. B, Kab. C", "dms": "S 00° 12' 00\"  E 109° 30' 00\"",
         "rd": "R 095 D 13 Nm Fr VOR PNK", "udara": {"pm25_maks": 40, "kab": "Kubu Raya"},
         "terakhir": {"jam_wib": "02 Nov 07:00", "satelit": "NOAA-20"},
         "alasan": {"titik_baru": 2, "menahun_hari": 3, "gambut": True, "ffmc": 91.2, "permukiman_km": 1.5, "belum_ditangani": True, "clear_lalu_titik_baru": True}}
    w = {"lat": -0.4, "lon": 109.4, "skor": 3.0, "urut": 1, "tempat": None, "dms": "S 00° 24' 00\"  E 109° 24' 00\"", "rd": "R 180 D 22 Nm Fr VOR PNK",
         "udara": "tidak tersedia", "alasan": {"temuan": "fs", "oleh": "H-1", "lokasi_laporan": "Desa X", "luas_klaim_ha": 4}}
    return {"tanggal": "2026-11-02", "versi": "pagi", "sumber": {"titik_panas": "t", "ffmc": "f"},
            "base": [{"id": "PNK", "nama": "Supadio", "deklinasi_timur": 0.5, "radius_nm": 120, "patroli": [c], "wb": [w],
                      "di_luar_rute": {"sel": 2, "titik": 5}}]}


# SHA-256 keluaran banjir dari renlap_banjir.py LAMA (15 Nov 2026, sebelum dipindah) atas kecamatan sintetis di bawah.
EMAS_BANJIR = {"json": "7c0313f59aa8c372ec625812c6cddf9cee140eb0a299fc1a606e7680cf1d9d9b", "kml": "f2d14c92cc2a73e3de4a80674da3477867e60edcaa1abcab02dd5b70d4a5bf03",
               "gpx": "29c645fce3b560304b04e2cd521300b481b05d6e14eaa46fcba94fab4cea74a5", "txt": "2177a3794a08acb5f41c28b3b2fb4d19781a20ff3afbed103dd3bc507147090e"}


def contoh_banjir():
    def c(prov, kp, kab, kec, lat, lon, sn, kond, kk, ungsi, darurat, lv, h3, akhir="2026-11-14"):
        return dict(prov=prov, kode_prov=kp, kab=kab, kec=kec, lat=lat, lon=lon, sumber_nama=sn, kondisi=kond, akhir=akhir, kk=kk, ungsi=ungsi,
                    darurat=darurat, hari=["a"], lv=lv, h3=h3, geom=[])
    return [c("Aceh", "11", "Pidie Jaya", "Meureudu", 5.2, 96.2, "WA Koordalops", "Banjir <60 cm> & lumpur", 100, 50, "x", [1, 3], 40.5),
            c("Aceh", "11", "Aceh Tengah", "Bebesen", 4.6, 96.8, "logbook Pusdalops", "Genangan", None, None, "y", [0, 2], 10),
            c("Sumatera Utara", "12", "Deli Serdang", "Labuhan Deli", 3.7, 98.7, "prakiraan sistem", "Banjir", 5, 2, "z", [2, 2], 5, "2026-11-13"),
            c("Sumatera Utara", "12", "Langkat", "Stabat", 3.8, 98.4, "WA Koordalops", "Banjir", 5, 2, "z", [1], 5, "2026-11-13"),
            c("Aceh", "11", "Bireuen", "Jeumpa", 5.1, 96.7, "WA Koordalops", "Banjir", 5, 2, "z", [0], 5)]


def uji_banjir():
    """keluaran banjir (json, kml, gpx, txt) identik dengan renlap_banjir.py lama; kecamatan yang masuk tidak disaring skor"""
    r = bagi_base(contoh_banjir())
    nama = "Renlap Udara Pantau Banjir 151126"
    o = {"json": json.dumps([{k: v for k, v in b.items()} | {"patroli": [{k: v for k, v in c.items() if k != "geom"} for c in b["patroli"]]} for b in r],
                            ensure_ascii=False, indent=1, default=str),
         "kml": K.kml_banjir(r, nama), "gpx": K.gpx_banjir(r, nama), "txt": K.teks_banjir(r, "2026-11-15")}
    for k, v in o.items():
        assert hashlib.sha256(v.encode("utf-8")).hexdigest() == EMAS_BANJIR[k], k
    assert sum(len(b["patroli"]) for b in r) == 5 and SKOR["banjir"](contoh_banjir()[0])[0] == 3.0
    # rakit (jalur kirim): sumber diinjeksi, tanpa jaringan; sumber gagal -> kosong dengan alasan, bukan karangan
    import types
    a = types.SimpleNamespace(bencana="banjir", prov="11", kab="", tanggal="2026-11-15", versi="1")
    rb, isi = rakit_banjir(a, [], muat_bobot(), lambda p, t: (contoh_banjir()[:2], None, None))
    assert rb["jml_target"] == 2 and "Meureudu" in isi["txt"] and set(isi) == {"json", "kml", "gpx", "txt"}
    def gagal(p, t):
        raise OSError("x")
    try:
        rakit_banjir(a, [], muat_bobot(), gagal)
        raise AssertionError("sumber gagal harus melempar")
    except RuntimeError as e:
        assert "OSError" in str(e)


def uji_pesisir(B, ok):
    tr = lambda i, la, lo, lj, k="abrasi", y="tinggi", **x: dict(id=i, lat=la, lon=lo, laju=lj, kelas=k, keyakinan=y, desa="D", periode=[1988, 2025], **x)
    # jarak antartransek > 6 km supaya pilih_cakupan tak membuang
    d = {"dibuat": "2026-11-15T10:00:00+00:00", "transek": [tr("a-1", -6.9, 110.4, -10.0), tr("a-2", -7.0, 110.4, -5.0), tr("a-3", -7.1, 110.4, -20.0, y="sedang"),
         tr("x-1", 1, 1, -50.0, y="rendah"), tr("x-2", 1, 1, 3.0, k="akresi"), tr("x-3", 1, 1, -30.0, tinjau=[2008]), tr("x-4", 1, 1, -30.0, gangguan=True)]}
    import tempfile, types
    with tempfile.TemporaryDirectory() as td:
        j = Path(td) / "a.json"
        j.write_text(json.dumps(d))
        dibuat, kand = target_pesisir(j)
        assert sorted(c["id"] for c in kand) == ["a-1", "a-2", "a-3"], kand
        assert {c["id"]: c["fitur"]["tingkat"] for c in kand} == {"a-1": 0.5, "a-2": 0.25, "a-3": 1.0}, kand
        A = types.SimpleNamespace(**dict(ok, bencana="pesisir"))
        r, isi = rakit_pesisir(A, [], B, lambda: target_pesisir(j))   # tanpa base: target tetap ditulis
        assert r["jml_target"] == 3 and r["base"][0]["id"] == "tanpa-base" and "hipotesis" in r["bobot_label"], r
        assert r["base"][0]["patroli"][0]["skor"] == 1.0 and r["base"][0]["patroli"][0]["alasan"]["laju_m_per_th"] == -20.0
        import re
        for k in ("json", "txt"):   # tanpa huruf kapital semua, tanpa kata "kritis"
            assert not re.search(r"\b[A-Z]{2,}\b", isi[k]) and not re.search(r"kritis|\baman\b", isi[k].lower()), k
        assert "tanpa base CP1" in isi["kml"] and "tanpa base-CP1" in isi["gpx"] and "tanpa-base" not in isi["kml"]
        assert "laju -20,0 m/th, skor 1,0" in isi["txt"] and "relatif terhadap transek terburuk yang lolos saringan" in isi["txt"]
        assert "periode garis pantai 1988 sampai 2025, berkas dibuat 2026-11-15" in isi["txt"]
        r2, _ = rakit_pesisir(A, [{"id": "b" * 16, "golongan": "sarana", "nama": "S", "lat": -7.0, "lon": 110.4}], B, lambda: target_pesisir(j))
        assert r2["jml_target"] == 3 and r2["base"][0]["nama"] == "S"
    r3, _ = rakit_pesisir(A, [], B, lambda: (None, []))
    assert r3["jml_target"] == 0 and r3["alasan_kosong"]
    try:
        rakit_pesisir(A, [], B, lambda: 1 / 0)
        raise SystemExit("sumber gagal harus RuntimeError")
    except RuntimeError:
        pass
    r4, _ = rakit_pesisir(A, [], B)   # berkas nyata
    assert r4["jml_target"] > 0 and r4["sumber_data"]["dibuat"]


def uji_jenis(B, ok):
    """udara, kekeringan, cuaca, gempa, gunung api: masukan sintetis (berkas sementara) + berkas nyata repo bila ada."""
    import tempfile, types
    from datetime import date
    def tanpa_kapital(r, isi):
        for k in ("json", "txt"):
            assert not re.search(r"\b[A-Z]{2,}\b", isi[k]) and not re.search(r"kritis|\baman\b", isi[k].lower()), (k, re.findall(r"\b[A-Z]{2,}\b", isi[k]))
    A = lambda b, **x: types.SimpleNamespace(**dict(ok, bencana=b, **dict({"prov": "11"}, **x)))
    with tempfile.TemporaryDirectory() as td:
        T = Path(td)
        def tulis(n, o):
            (T / n).write_text(json.dumps(o))
            return T / n
        # udara: dua sel di atas batas (provinsi 11), satu di bawah, satu kecamatan provinsi lain
        asap = {"dibuat": "2026-11-15T08:00+07:00", "hari": ["2026-11-15", "2026-11-16"], "kolom": ["lat", "lon", "pm25_maks", "co_rata", "co_maks", "aod_maks", "pm25_rata", "pm10_maks"],
                "grid": [[5.5, 95.5, [0, 0]] + [[0, 0]] * 3 + [[100, 20]] + [[0, 0]], [4.5, 96.5, [0, 0]] + [[0, 0]] * 3 + [[60, 10]] + [[0, 0]],
                         [3.5, 97.5, [0, 0]] + [[0, 0]] * 3 + [[30, 90]] + [[0, 0]], [-6.5, 106.5, [0, 0]] + [[0, 0]] * 3 + [[200, 200]] + [[0, 0]]]}
        pusat = {"11|A|X": [5.4, 95.4], "11|A|Y": [5.6, 95.6], "11|B|Z": [4.4, 96.4], "11|C|W": [3.4, 97.4], "32|D|V": [-6.4, 106.4]}
        pj = tulis("pusat.json", pusat)
        global PUSAT_KEC
        asli, PUSAT_KEC = PUSAT_KEC, pj
        try:
            meta, kd = target_udara("11", "2026-11-15", tulis("asap.json", asap))
            assert len(kd) == 2 and {c["fitur"]["tingkat"] for c in kd} == {1.0, 0.6} and {c["n_kec"] for c in kd} == {2, 1}, kd
            m0, k0 = target_udara("11", "2026-12-01", T / "asap.json")
            assert k0 == [] and "tidak mencakup 2026-12-01" in m0["alasan_kosong"]
            r, isi = rakit_udara(A("udara"), [], B, lambda p, t: target_udara(p, t, T / "asap.json"))
            assert r["jml_target"] == 2 and r["base"][0]["id"] == "tanpa-base" and "hipotesis" in r["bobot_label"], r
            tanpa_kapital(r, isi)
        finally:
            PUSAT_KEC = asli
        # kekeringan: tingkat >= 2 saja, kabupaten tanpa kecamatan dilewati dan dicatat
        wil = {"kab": {"11|A": {"lv": 3, "jiwa": [9, 8, 7], "spi3": -2.5, "mm3": 100}, "11|B": {"lv": 2, "jiwa": [5, 4, 0], "spi3": -1.6, "mm3": 150},
                       "11|C": {"lv": 1, "jiwa": [5, 0, 0], "spi3": -1.1, "mm3": 200}, "11|D": {"lv": 3, "jiwa": [1, 1, 1], "spi3": -3, "mm3": 1}, "12|A": {"lv": 3, "jiwa": [1, 1, 1], "spi3": -3, "mm3": 1}}}
        PUSAT_KEC = tulis("pusat2.json", {"11|A|X": [5.0, 95.0], "11|A|Y": [6.0, 96.0], "11|B|Z": [4.0, 97.0], "11|C|W": [3.0, 98.0], "12|A|V": [2.0, 99.0]})
        global KEKERINGAN_META
        asli_m, KEKERINGAN_META = KEKERINGAN_META, tulis("meta.json", {"hari_ini": "2026-11-14"})
        try:
            meta, kd = target_kekeringan("11", "2026-11-15", tulis("wil.json", wil))
            assert [c["id"] for c in kd] == ["11|A", "11|B"] and [c["fitur"]["tingkat"] for c in kd] == [1.0, 0.667] and kd[0]["lat"] == 5.5 and "1 kabupaten tanpa koordinat" in meta["catatan"], (kd, meta)
            r, isi = rakit_kekeringan(A("kekeringan"), [], B, lambda p, t: target_kekeringan(p, t, T / "wil.json"))
            assert r["jml_target"] == 2 and "keadaan hari 2026-11-14" in isi["txt"]
            tanpa_kapital(r, isi)
        finally:
            KEKERINGAN_META = asli_m
        # cuaca: tingkat 2 dan 3 pada tanggal; hari yang tak tercakup = kosong beralasan
        PUSAT_KEC = tulis("pusat3.json", {"11|A|X": [5.0, 95.0], "11|A|Y": [6.0, 96.0], "32|B|Z": [-6.0, 107.0]})
        ck = {"dibuat": "2026-11-15T07:00+07:00", "hari": ["2026-11-15", "2026-11-16", "2026-11-17"],
              "kec": [[0, [3, 1, 0], [0] * 3, [0] * 3, [120, 10, 0], [80, 20, 10], None], [1, [1, 2, 0], [0] * 3, [0] * 3, [None, 60, 0], [10, 70, None], None],
                      [2, [3, 3, 3], [0] * 3, [0] * 3, [200, 200, 200], [90, 90, 90], None]]}
        try:
            meta, kd = target_cuaca("11", "2026-11-15", tulis("ck.json", ck))
            assert [c["id"] for c in kd] == ["11|A|X"] and kd[0]["fitur"]["tingkat"] == 1.0 and "hujan 120 mm, embusan 80 km/jam" in kd[0]["tempat"], kd
            meta, kd = target_cuaca("11", "2026-11-16", T / "ck.json")
            assert [c["fitur"]["tingkat"] for c in kd] == [0.667] and "hujan 60 mm, embusan 70 km/jam" in kd[0]["tempat"], kd
            assert "embusan tanpa data" in target_cuaca("11", "2026-11-17", tulis("ck2.json", dict(ck, kec=[[0, [0, 0, 2], [0] * 3, [0] * 3, [0, 0, 5], [0, 0, None], None]])))[1][0]["tempat"]
            assert target_cuaca("11", "2026-11-20", T / "ck.json")[1] == []
            r, isi = rakit_cuaca(A("cuaca", tanggal="2026-11-15"), [], B, lambda p, t: target_cuaca(p, t, T / "ck.json"))
            assert r["jml_target"] == 1
            tanpa_kapital(r, isi)
        finally:
            PUSAT_KEC = asli
        # gempa: m5 ke atas, 30 hari dari kejadian terakhir, provinsi cocok
        kol = ["waktu_utc", "lat", "lon", "dalam_km", "m", "prov"]
        gm = {"kolom": kol, "baris": [["2026-09-01T00:00", 1, 1, 10, 7.0, "11"], ["2026-10-20T00:00", 1, 2, 10, 5.0, "11"], ["2026-11-10T12:00", 2, 3, 20.5, 6.0, "11"],
                                      ["2026-11-10T13:00", 3, 4, 10, 4.9, "11"], ["2026-11-10T14:00", 4, 5, 10, 6.5, "12"]]}
        meta, kd = target_gempa("11", "2026-11-15", tulis("gm.json", gm))
        assert sorted(c["magnitudo"] for c in kd) == [5.0, 6.0] and {c["fitur"]["tingkat"] for c in kd} == {1.0, 0.833}, kd
        r, isi = rakit_gempa(A("gempa"), [], B, lambda p, t: target_gempa(p, t, T / "gm.json"))
        assert r["jml_target"] == 2 and "2026-11-10 12:00 utc" in isi["txt"]
        tanpa_kapital(r, isi)
        assert target_gempa("11", "x", tulis("kosong.json", {"kolom": kol, "baris": []}))[0]["alasan_kosong"]
        # gunung api: level 2 ke atas dengan radius dan penduduk; level resmi dicatat, tidak masuk skor
        gs = {"dibuat": "2026-11-10T15:47:44+07:00", "gunung": [
            {"nama": "Satu", "prov": "Daerah Istimewa Aceh", "lat": 4, "lon": 96, "level": 3, "radius_km": 5.0, "penduduk_radius": 1000, "periode": "10 November 2026"},
            {"nama": "Dua", "prov": "Aceh", "lat": 5, "lon": 97, "level": 2, "radius_km": 2.0, "penduduk_radius": 250},
            {"nama": "Tiga", "prov": "Aceh", "lat": 5, "lon": 98, "level": 1, "radius_km": 2.0, "penduduk_radius": 999},
            {"nama": "Empat", "prov": "Aceh", "lat": 6, "lon": 98, "level": 3, "radius_km": 2.0, "penduduk_radius": 0},
            {"nama": "Ternate", "prov": "Maluku Utara", "lat": 1, "lon": 127, "level": 3, "radius_km": 2.0, "penduduk_radius": 70},
            {"nama": "Lima", "prov": "Jawa Timur", "lat": -7, "lon": 112, "level": 3, "radius_km": 2.0, "penduduk_radius": 500}]}
        meta, kd = target_gunungapi("11", "2026-11-15", tulis("gs.json", gs))
        assert [c["id"] for c in kd] == ["Satu", "Dua"] and [c["fitur"] for c in kd] == [{"terdampak": 1.0}, {"terdampak": 0.25}], kd
        r, isi = rakit_gunungapi(A("gunungapi"), [{"id": "s" * 16, "golongan": "sarana", "nama": "Gudang", "lat": 4.1, "lon": 96.1}], B, lambda p, t: target_gunungapi(p, t, T / "gs.json"))
        assert r["jml_target"] == 2 and r["base"][0]["nama"] == "Gudang" and "level 3 (siaga)" in isi["txt"] and r["base"][0]["patroli"][0]["alasan"]["level_resmi"] == 3
        tanpa_kapital(r, isi)
        assert [c["id"] for c in target_gunungapi("81", "x", T / "gs.json")[1]] == [] and [c["id"] for c in target_gunungapi("82", "x", T / "gs.json")[1]] == ["Ternate"]
        # sumber gagal -> RuntimeError
        for f in (rakit_udara, rakit_kekeringan, rakit_cuaca, rakit_gempa, rakit_gunungapi):
            try:
                f(A("udara"), [], B, lambda p, t: 1 / 0)
                raise SystemExit("sumber gagal harus RuntimeError")
            except RuntimeError:
                pass
    # berkas nyata repo: tanggal diambil dari berkasnya sendiri; hasil bisa 0 target beralasan, tak boleh melempar
    nyata = {"udara": ("2026-10-15", "11"), "kekeringan": ("2026-11-15", "11"), "cuaca": ("2026-10-18", "11"), "gempa": ("2026-11-15", "82"), "gunungapi": ("2026-11-15", "35")}
    for b, (tg, pv) in nyata.items():
        r, isi = RAKIT[b](A(b, prov=pv, tanggal=tg), [], B)
        assert r["jml_target"] > 0 or r["alasan_kosong"], b
        tanpa_kapital(r, isi)
        print("  %s %s: %d target nyata%s" % (b, pv, r["jml_target"], "" if r["jml_target"] else " (kosong: %s)" % r["alasan_kosong"]))


def uji():
    B = muat_bobot()
    reg = [b["id"] for b in json.loads((AKAR / "public/bencana.json").read_text(encoding="utf-8"))["bencana"]]
    assert sorted(SKOR) == sorted(reg), (sorted(SKOR), sorted(reg))
    assert "HIPOTESIS" in B["_label"] and "HIPOTESIS" in B["per_bencana"]["_label"]
    for i in reg:  # tiap jenis: label HIPOTESIS; bobot sama rata atau menunjuk bagian bobot karhutla; semua fitur ada
        e = B["per_bencana"][i]
        assert "HIPOTESIS" in e["label"], i
        if i != "karhutla":
            assert set(e["bobot"]) == set(FITUR) and len(set(e["bobot"].values())) == 1, i
    for i in reg:
        if i in ("karhutla", "banjir"):
            continue
        s, al = SKOR[i]({"fitur": {"tingkat": 1, "baru": 0.5, "terdampak": None}}, B)
        assert s == 1.5 and al["tanpa_data"] == ["terdampak", "fasilitas", "belum_ditangani"] and al["hipotesis"], (i, s, al)
        assert SKOR[i]({"fitur": {}}, B)[0] == 0  # tanpa data = 0 dan dicatat, bukan angka karangan
    try:
        SKOR["pesisir"]({"fitur": {"tingkat": 2}}, B)
        raise SystemExit("fitur di luar 0..1 harus ditolak")
    except AssertionError:
        pass
    # karhutla: penilai = kandidat() asli
    from datetime import datetime, timedelta, timezone
    kini = datetime(2026, 11, 2, 12, tzinfo=timezone.utc)
    t = [{"lat": -0.205, "lon": 109.505, "t": kini - timedelta(hours=3), "sat": "N20", "wil": "61|a|b"}]
    assert len(SKOR["karhutla"](t, [], B)) == 1
    # susun jenis non-karhutla: stabil terhadap urutan masukan, tiap kandidat paling banyak sekali
    base = [{"id": "A", "nama": "Bandara A", "lat": 0.0, "lon": 100.0}, {"id": "B", "nama": "Bandara B", "lat": 0.0, "lon": 110.0}]
    kd = [{"lat": 0.1 * i, "lon": 100.0 + 0.05 * i, "tempat": "K%d" % i, "fitur": {"tingkat": i / 5, "baru": 1}} for i in range(1, 6)]
    kd.append({"lat": 0.2, "lon": 110.1, "tempat": "Z", "fitur": {"tingkat": 0, "baru": 1}})
    r1, r2 = susun("pesisir", kd, base, B), susun("pesisir", list(reversed(kd)), base, B)
    assert r1 == r2 and [c["tempat"] for c in r1["base"][1]["patroli"]] == ["Z"] and "HIPOTESIS" in r1["bobot_label"]
    assert sum(len(b["patroli"]) for b in r1["base"]) <= 6
    # keluaran karhutla byte-identik sebelum/sesudah ekstraksi (hash dari kode lama), dan operasi/renlap.teks sama dengan penulis bersama
    h = hashlib.sha256(K.teks(contoh_karhutla()).encode("utf-8")).hexdigest()
    assert h == EMAS_TEKS, h
    assert operasi().teks(contoh_karhutla()) == K.teks(contoh_karhutla())
    # PB-14: ringkas cocok vektor "{}" dan argumen jahat ditolak
    assert ringkas({"json": "{}"}) == "json:" + hashlib.sha256(b"{}").hexdigest()
    assert ringkas({"txt": "b", "json": "a"}).startswith("json:")
    import types
    uji_banjir()
    ok = dict(id="0123456789abcdef", bencana="banjir", prov="31", kab="3171", tanggal="2026-11-15", versi="1")
    cek_argumen(types.SimpleNamespace(**ok), reg)
    cek_argumen(types.SimpleNamespace(**dict(ok, kab="")), reg)
    for k, v in (("id", "XYZ"), ("bencana", "ngawur"), ("prov", "3"), ("kab", "3271"), ("tanggal", "15-11-2026"), ("versi", "1;rm"), ("id", "0123456789abcdef\n")):
        try:
            cek_argumen(types.SimpleNamespace(**dict(ok, **{k: v})), reg)
            raise SystemExit("harus ditolak: %s=%r" % (k, v))
        except ValueError:
            pass
    r, isi = rakit(types.SimpleNamespace(**dict(ok, bencana="gempa", prov="99")), [{"id": "a" * 16, "golongan": "sarana", "nama": "H", "lat": 1.0, "lon": 2.0}, {"golongan": "fasilitas", "lat": 1, "lon": 2}], B)
    assert r["jml_target"] == 0 and len(r["base"]) == 1 and set(isi) == {"json", "kml", "gpx", "txt"}
    uji_pesisir(B, ok)
    uji_jenis(B, ok)
    print("renlap (umum): lulus")


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "uji":
        uji()
    else:
        ap = argparse.ArgumentParser()
        ap.add_argument("perintah", choices=["buat", "kirim"])
        ap.add_argument("--masukan")
        ap.add_argument("--keluar")
        for f in ("id", "bencana", "prov", "tanggal", "versi"):
            ap.add_argument("--" + f)
        ap.add_argument("--kab", default="")
        A = ap.parse_args()
        if A.perintah == "kirim":
            sys.exit(kirim(A))
        buat(A)
