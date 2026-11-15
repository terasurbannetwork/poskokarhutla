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


def rakit(a, titik, B, ambil=None):
    if a.bencana == "banjir":
        return rakit_banjir(a, titik, B, ambil)
    if a.bencana == "pesisir":
        return rakit_pesisir(a, titik, B, ambil)
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
            assert not re.search(r"\b[A-Z]{2,}\b", isi[k]) and "kritis" not in isi[k].lower(), k
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
    r, isi = rakit(types.SimpleNamespace(**dict(ok, bencana="gempa")), [{"id": "a" * 16, "golongan": "sarana", "nama": "H", "lat": 1.0, "lon": 2.0}, {"golongan": "fasilitas", "lat": 1, "lon": 2}], B)
    assert r["jml_target"] == 0 and len(r["base"]) == 1 and set(isi) == {"json", "kml", "gpx", "txt"}
    uji_pesisir(B, ok)
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
