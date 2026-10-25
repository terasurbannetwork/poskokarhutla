"""Jumlah firespot per provinsi pada hari WIB tertentu, jam cut-off deck, dihitung ulang dengan mesin website.

Firespot = cluster kebakaran (ST-DBSCAN) yang polanya masuk harian.POLA_YA, metode Kemenhut SIPANTAU (lihat harian.py).
Angka ini SAMA dengan kolom FS tabel wilayah layar (harian.ringkas_kluster: cluster dengan firespot == "ya"), bukan jumlah titik;
label deck "(titik)" diwarisi dari templat BNPB.

Mesin hitungnya mesin website scripts/data/harian.py: dbscan yang sama, saringan aktif 72 jam (168 jam bila gambut dan DC > 350),
pembuangan cluster kecil tak berbahaya (< 3 titik, level 0, baru teramati), lalu harian.firespot() per cluster. Tiga hal diganti
supaya hari lampau bisa dihitung ulang tanpa menyentuh keadaan live:
  1. jam "sekarang" dibekukan pada cut-off (hari D, jam WIB) -- jendela 7 hari dan umur cluster diukur dari situ;
  2. titik FIRMS dari cache CSV generator (satelit.csv_hari) per hari UTC, bukan jendela 5-hari pipeline;
  3. FWI dari cuaca_riwayat (pemanasan 92 hari), bukan public/data/fwi_state.json yang hanya menyimpan satu titik waktu.
Gerbangnya arsip public/data/kluster_hari/<hari>.json: uji() menagih angka yang sama pada 23.59 WIB.

API:
    hitung(hari, jam='17:00', cuaca=None, kunci=None) -> {kode_prov: jumlah firespot}
    seri(hari_akhir, n, jam='17:00') -> ({kode_prov: [n angka]}, [hari])
CLI:
    python3 firespot_hari.py --tanggal 2026-10-25 [--jam 17:00] [--hari 3] [--keluar fs.json]
    python3 firespot_hari.py --uji      # banding dengan arsip kluster_hari pada 23.59 WIB
"""
import csv, datetime as dt, io, json, os, sys

SINI = os.path.dirname(os.path.abspath(__file__))
AKAR = os.path.abspath(os.path.join(SINI, '..', '..', '..'))
sys.path.insert(0, SINI)
sys.path.insert(0, os.path.join(AKAR, 'scripts', 'data'))
import aturan as A        # noqa: E402
import harian as H        # noqa: E402
import titik_palsu as TP  # noqa: E402
import cuaca_riwayat as CR  # noqa: E402
import satelit as S       # noqa: E402
from wilayah import Poligon, Wilayah   # noqa: E402

WIB = H.WIB
UTC = dt.timezone.utc
VIIRS = ('VIIRS_SNPP_NRT', 'VIIRS_NOAA20_NRT', 'VIIRS_NOAA21_NRT')
KODE = {'VIIRS_SNPP_NRT': 'N', 'VIIRS_NOAA20_NRT': 'N20', 'VIIRS_NOAA21_NRT': 'N21'}
LAT0, LON0, SEL = -11.25, 94.75, 0.5   # kisi grid_darat


_HARI_UTC = {}   # (src, hari UTC) -> titik terpakai hari itu; 14 deck memakai hari UTC yang sama berulang kali


def titik_utc(src, u, kini, kunci, sel_ind, w):
    """Titik VIIRS satu berkas FIRMS (satu sumber, satu hari UTC) yang lolos saringan harian.hotspot():
    keyakinan >= nominal, bukan sel industri, bukan gunung api, dan jatuh di wilayah Indonesia."""
    if (src, u) in _HARI_UTC:
        return _HARI_UTC[(src, u)]
    out, lihat = [], set()
    for r in csv.DictReader(io.StringIO(S.csv_hari(src, u, kini, kunci))):
        kc = {'l': 0, 'n': 1, 'h': 2}.get(r.get('confidence', ''), 1)
        if kc < 1:
            continue
        jam = r['acq_time'].zfill(4)
        t = dt.datetime.fromisoformat(f"{r['acq_date']}T{jam[:2]}:{jam[2:]}:00+00:00")
        lat, lon = round(float(r['latitude']), 4), round(float(r['longitude']), 4)
        if (lat, lon, t) in lihat:
            continue
        lihat.add((lat, lon, t))
        if TP.palsu(lat, lon, sel_ind) or A.gunung_api(lat, lon):
            continue
        adm = w.cari(lon, lat)
        if not adm:
            continue
        out.append({'lat': lat, 'lon': lon, 't': t, 's': KODE[src], 'c': kc, 'adm': adm,
                    'px': max(float(r.get('scan') or .4), float(r.get('track') or .4))})
    _HARI_UTC[(src, u)] = out
    return out


def titik(kini, kunci, sel_ind, w):
    """Titik VIIRS dalam jendela harian.JENDELA_HARI sebelum `kini`, bentuk sama dengan harian.hotspot()."""
    batas = kini - dt.timedelta(days=H.JENDELA_HARI)
    out = []
    u = batas.astimezone(UTC).date() - dt.timedelta(days=1)
    akhir_u = kini.astimezone(UTC).date()
    while u <= akhir_u:
        for src in VIIRS:
            out += [p for p in titik_utc(src, u, kini, kunci, sel_ind, w) if batas <= p['t'] < kini]
        u += dt.timedelta(days=1)
    out.sort(key=lambda p: p['t'])
    return out


def sel_cuaca(sel, lat, lon):
    """Sel cuaca terdekat; sel kisi yang membulatkan dulu, kalau laut (tak ada di grid) baru sapuan penuh."""
    k = (round(LAT0 + round((lat - LAT0) / SEL) * SEL, 2), round(LON0 + round((lon - LON0) / SEL) * SEL, 2))
    if k in sel:
        return sel[k]
    return sel[min(sel, key=lambda c: (c[0] - lat) ** 2 + (c[1] - lon) ** 2)]


def hitung(hari, jam='17:00', cuaca=None, kunci=None, gambut=None, w=None):
    """{kode_prov: jumlah cluster firespot == "ya"} pada `hari` (WIB) jam `jam`."""
    hari = dt.date.fromisoformat(str(hari))
    kini = dt.datetime.combine(hari, dt.time.fromisoformat(jam), WIB)
    w = w or Wilayah()
    gambut = gambut if gambut is not None else Poligon(os.path.join(AKAR, 'public/data/lahan/gambut.geojson'))
    ada_gambut = bool(gambut.indeks)
    sel = (cuaca or CR.hitung(hari, hari))[hari.isoformat()]
    pts_semua = titik(kini, S.kunci_firms(kunci), TP.sel_industri()[0], w)
    label, _ = H.dbscan(pts_semua)
    kluster = {}
    for p, l in zip(pts_semua, label):
        kluster.setdefault(l, []).append(p)
    hari_akhir = H.tgl(kini)
    t24 = kini - dt.timedelta(hours=24)
    fs = {k: 0 for k in H.PROVINSI}
    for pts in kluster.values():
        terakhir = max(p['t'] for p in pts)
        lat0 = sum(p['lat'] for p in pts) / len(pts)
        lon0 = sum(p['lon'] for p in pts) / len(pts)
        h = sel_cuaca(sel, lat0, lon0)
        di_gambut = gambut.cari(lon0, lat0) is not None or any(gambut.cari(p['lon'], p['lat']) for p in pts[:20])
        kering = h['dc'] > 350 and (di_gambut or not ada_gambut)
        if terakhir < kini - dt.timedelta(hours=H.AKTIF_GAMBUT_JAM if kering else H.AKTIF_JAM):
            continue
        jam_sejak = (kini - terakhir).total_seconds() / 3600
        hari_set = {H.tgl(p['t']) for p in pts}
        p24 = [p for p in pts if p['t'] >= t24]
        px24 = len({H.pix(p) for p in p24})
        sev = A.keparahan(len(pts), len(hari_set), sum(1 for p in pts if H.tgl(p['t']) == hari_akhir),
                          sum(1 for p in pts if H.tgl(p['t']) == hari_akhir - dt.timedelta(days=1)), px24)
        lv = A.status(A.kelas_fwi(h['fwi']), sev)
        if len(pts) < 3 and lv == 0 and jam_sejak <= 24:
            continue
        if H.firespot(pts)[1] != 'ya':
            continue
        adm = w.cari(lon0, lat0) or max((p['adm'] for p in pts), key=[p['adm'] for p in pts].count)
        if adm[0] in fs:
            fs[adm[0]] += 1
    return fs


def seri(hari_akhir, n, jam='17:00', kunci=None):
    """({kode_prov: [n angka, paling lama dulu]}, [hari]) -- satu tarikan cuaca dan satu Wilayah untuk semua hari.
    Hari yang sudah pernah dihitung diambil dari cache/firespot-<jam>.json: 14 deck berurutan memakai hari yang sama
    berulang kali, dan satu hari butuh satu DBSCAN atas tujuh hari titik."""
    hari_akhir = dt.date.fromisoformat(str(hari_akhir))
    hari = [hari_akhir - dt.timedelta(days=n - 1 - i) for i in range(n)]
    jalur = os.path.join(SINI, 'cache', f'firespot-{jam.replace(":", ".")}.json')
    simpan = json.load(open(jalur)) if os.path.exists(jalur) else {}
    perlu = [d for d in hari if d.isoformat() not in simpan]
    if perlu:
        cuaca = CR.hitung(min(perlu), max(perlu))
        w, gambut = Wilayah(), Poligon(os.path.join(AKAR, 'public/data/lahan/gambut.geojson'))
        for d in perlu:
            simpan[d.isoformat()] = hitung(d, jam, cuaca, kunci, gambut, w)
            os.makedirs(os.path.dirname(jalur), exist_ok=True)
            json.dump(simpan, open(jalur, 'w'))
            print('firespot', d, 'nasional', sum(simpan[d.isoformat()].values()), flush=True)
    kolom = [simpan[d.isoformat()] for d in hari]
    return {k: [c.get(k, 0) for c in kolom] for k in kolom[0]}, [d.isoformat() for d in hari]


def uji():
    """Pada 23.59 WIB hitungan ini harus sama dengan arsip kluster_hari (jalan 3-jam terakhir hari itu): nasional dalam 2 persen
    dan tiap provinsi berangka >= 50 dalam 5 persen. Tidak dituntut sama persis: arsip memakai FWI keadaan bersambung dan
    jendela titik pipeline, hitungan ini FWI pemanasan 92 hari dan cache CSV per hari UTC."""
    folder = os.path.join(AKAR, 'public/data/kluster_hari')
    ada = sorted(n[:10] for n in os.listdir(folder) if n.endswith('.json'))
    hari = ada[-2]   # hari lengkap terbaru (hari terakhir arsip bisa jalan sebelum tengah malam)
    arsip = json.load(open(os.path.join(folder, f'{hari}.json')))['w']
    kita = hitung(hari, '23:59')
    nas_a = sum(v[1] for k, v in arsip.items() if '|' not in k)
    nas_k = sum(kita.values())
    assert nas_a > 100, f'arsip {hari} cuma {nas_a} firespot: arsipnya yang salah?'
    assert abs(nas_k - nas_a) / nas_a <= 0.02, f'nasional {hari}: hitung ulang {nas_k} vs arsip {nas_a}'
    beda = [(k, kita[k], arsip[k][1]) for k in kita
            if max(kita[k], arsip.get(k, [0, 0])[1]) >= 50
            and abs(kita[k] - arsip.get(k, [0, 0])[1]) / max(arsip.get(k, [0, 1])[1], 1) > 0.05]
    assert not beda, f'provinsi besar beda > 5 persen pada {hari}: {beda}'
    print(f'uji lolos: {hari} 23.59 WIB nasional {nas_k} vs arsip {nas_a}; '
          f'{sum(1 for k in kita if kita[k] >= 50)} provinsi >= 50 firespot semuanya dalam 5 persen')


if __name__ == '__main__':
    arg = sys.argv[1:]
    if '--uji' in arg:
        uji()
    else:
        nilai = lambda o, b=None: arg[arg.index(o) + 1] if o in arg else b
        fs, hari = seri(nilai('--tanggal', ''), int(nilai('--hari', '3')), nilai('--jam', '17:00'))
        if nilai('--keluar'):
            json.dump({'hari': hari, 'jam': nilai('--jam', '17:00'), 'fs': fs}, open(nilai('--keluar'), 'w'))
        print('hari', hari, 'nasional', [sum(v[i] for v in fs.values()) for i in range(len(hari))])
        for k in sorted(fs, key=lambda k: -fs[k][-1])[:10]:
            print(' ', k, fs[k])
