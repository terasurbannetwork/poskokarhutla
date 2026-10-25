"""Firespot per provinsi pada hari WIB tertentu, jam cut-off deck, dihitung ulang dengan mesin website.

FIRESPOT DIHITUNG DALAM TITIK, satuan yang sama dengan hotspot (keputusan pemilik 25 Okt 2026): jumlah lokasi unik
~375 m pada hari itu yang berada di dalam cluster yang lolos syarat firespot Kemenhut SIPANTAU (ada titik keyakinan
tinggi, atau >= AMBANG_MEDIUM_PX piksel medium, atau medium tiga hari berturut; lihat harian.firespot). Jadi
firespot <= hotspot selalu, dan selisihnya adalah titik yang belum terkonfirmasi api. Jumlah CLUSTER-nya menjawab
pertanyaan lain ("ada berapa kejadian api terpisah") dan tidak dipakai di deck ini.

Angkanya sama dengan kolom FS tabel wilayah layar: harian.ringkas_kluster indeks 4, yaitu sel HS hari itu yang
disentuh cluster firespot "ya" (fs_ini), dijumlah ke wilayah TITIKNYA, bukan wilayah pusat cluster, supaya firespot <=
hotspot tetap berlaku walau cluster melintasi batas. Arsip public/data/kluster_hari/<hari>.json adalah gerbangnya.

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
import titik_unik as TU   # noqa: E402
import cuaca_riwayat as CR  # noqa: E402
import satelit as S       # noqa: E402
from wilayah import Poligon, Wilayah   # noqa: E402

WIB = H.WIB
UTC = dt.timezone.utc
SUMBER = ('MODIS_NRT', 'VIIRS_SNPP_NRT', 'VIIRS_NOAA20_NRT', 'VIIRS_NOAA21_NRT')   # MODIS ikut: dipakai himpunan HS, bukan cluster
KODE = {'MODIS_NRT': 'M', 'VIIRS_SNPP_NRT': 'N', 'VIIRS_NOAA20_NRT': 'N20', 'VIIRS_NOAA21_NRT': 'N21'}
LAT0, LON0, SEL = -11.25, 94.75, 0.5   # kisi grid_darat
KOL_FS = 4           # indeks "titik firespot hari itu" di baris harian.ringkas_kluster
KOL_PERSIS = (2, 3, 5, 6)   # kolom yang harus sama persis dengan arsip: level maks, bertitik hari itu, < 24 jam, 24-72 jam
KOL_LONGGAR = (0, 1)        # cluster aktif dan firespot aktif: memuat cluster s.d. 7 hari, peka revisi FIRMS (lihat uji())


_HARI_UTC = {}   # (src, hari UTC) -> titik terpakai hari itu; 14 deck memakai hari UTC yang sama berulang kali


def titik_utc(src, u, kini, kunci, sel_ind, w):
    """Titik satu berkas FIRMS (satu sumber, satu hari UTC) yang lolos saringan harian.hotspot(): keyakinan sedang/tinggi,
    bukan sel industri, dan jatuh di wilayah Indonesia. Gunung api TIDAK dibuang di sini -- harian.hotspot juga tidak
    membuangnya dari himpunan titik; yang membuangnya hanya daftar titik untuk cluster."""
    if (src, u) in _HARI_UTC:
        return _HARI_UTC[(src, u)]
    out, lihat = [], set()
    for r in csv.DictReader(io.StringIO(S.csv_hari(src, u, kini, kunci))):
        conf = r.get('confidence', '')
        if src.startswith('MODIS'):   # BRIN: rendah 0-29, sedang 30-79, tinggi 80-100
            kc = 0 if not conf.isdigit() or int(conf) < 30 else 1 if int(conf) < 80 else 2
        else:
            kc = {'l': 0, 'n': 1, 'h': 2}.get(conf, 1)
        if kc < 1:
            continue
        jam = r['acq_time'].zfill(4)
        t = dt.datetime.fromisoformat(f"{r['acq_date']}T{jam[:2]}:{jam[2:]}:00+00:00")
        lat, lon = round(float(r['latitude']), 4), round(float(r['longitude']), 4)
        if (lat, lon, t) in lihat:
            continue
        lihat.add((lat, lon, t))
        if TP.palsu(lat, lon, sel_ind):
            continue
        adm = w.cari(lon, lat)
        if not adm:
            continue
        out.append({'lat': lat, 'lon': lon, 't': t, 's': KODE[src], 'c': kc, 'adm': adm,
                    'px': max(float(r.get('scan') or .4), float(r.get('track') or .4))})
    _HARI_UTC[(src, u)] = out
    return out


def titik(kini, kunci, sel_ind, w):
    """Titik 4 satelit dalam jendela harian.JENDELA_HARI sebelum `kini`, bentuk sama dengan harian.hotspot()."""
    batas = kini - dt.timedelta(days=H.JENDELA_HARI)
    out = []
    u = batas.astimezone(UTC).date() - dt.timedelta(days=1)
    akhir_u = kini.astimezone(UTC).date()
    while u <= akhir_u:
        for src in SUMBER:
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
    """{kode_prov: baris harian.ringkas_kluster} pada `hari` (WIB) s.d. jam `jam`.
    Barisnya [aktif, firespot aktif, level maks, cluster bertitik hari itu, TITIK FIRESPOT hari itu, < 24 jam, 24-72 jam];
    deck memakai indeks KOL_FS. Agregasinya tidak ditulis ulang di sini: cluster dirakit seperti harian.main lalu
    diserahkan ke harian.ringkas_kluster, jadi definisi kolomnya selalu ikut website."""
    hari = dt.date.fromisoformat(str(hari))
    kini = dt.datetime.combine(hari, dt.time.fromisoformat(jam), WIB)
    jam_hari = (kini - dt.datetime.combine(hari, dt.time(), WIB)).total_seconds() / 3600   # jam sejak 00.00 WIB hari itu
    w = w or Wilayah()
    gambut = gambut if gambut is not None else Poligon(os.path.join(AKAR, 'public/data/lahan/gambut.geojson'))
    ada_gambut = bool(gambut.indeks)
    sel = (cuaca or CR.hitung(hari, hari))[hari.isoformat()]
    pts_semua = titik(kini, S.kunci_firms(kunci), TP.sel_industri()[0], w)
    hari_akhir = H.tgl(kini)
    # himpunan HS hari itu: sel ~375 m lokasi unik dari 4 satelit -> wilayah titiknya (harian.main baris sel_hs)
    sel_hs = {H.pix(p): '|'.join(p['adm']) for p in TU.unik(pts_semua, lambda p: H.tgl(p['t'])) if H.tgl(p['t']) == hari_akhir}
    viirs = [p for p in pts_semua if p['s'] != 'M' and not A.gunung_api(p['lat'], p['lon'])]
    label, _ = H.dbscan(viirs)
    kluster = {}
    for p, l in zip(viirs, label):
        kluster.setdefault(l, []).append(p)
    t24 = kini - dt.timedelta(hours=24)
    fitur = []
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
        adm = w.cari(lon0, lat0) or max((p['adm'] for p in pts), key=[p['adm'] for p in pts].count)
        # titik firespot hari ini: sel HS yang disentuh cluster firespot, dihitung di wilayah TITIKNYA (harian.main fs_ini)
        fs_ini = {}
        if H.firespot(pts)[1] == 'ya':
            for x in {H.pix(p) for p in pts if H.tgl(p['t']) == hari_akhir} & sel_hs.keys():
                fs_ini[sel_hs[x]] = fs_ini.get(sel_hs[x], 0) + 1
        fitur.append({'properties': {
            'prov': adm[0], 'kab': adm[1], 'kec': adm[2], 'level': lv, 'jam_sejak': jam_sejak,
            'teramati': jam_sejak <= 24, 'px24': px24, 'fwi': h['fwi'], 'firespot': H.firespot(pts)[1],
            'fs_ini': fs_ini}})
    for f in fitur:   # dua langkah terakhir harian.main: naik ke level 3 bila memenuhi ambang prioritas, lalu gerbang firespot
        q = f['properties']
        if q['level'] == 2 and q['teramati'] and A.prioritas(q['px24'], q['fwi']):
            q['level'], q['status'] = 3, A.STATUS[3]
        H.gerbang_firespot(q)
    return {k: v for k, v in H.ringkas_kluster(fitur, jam_hari).items() if '|' not in k}


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
            print('firespot', d, 'titik nasional', sum(v[KOL_FS] for v in simpan[d.isoformat()].values()), flush=True)
    kolom = [simpan[d.isoformat()] for d in hari]
    kunci_semua = sorted({k for c in kolom for k in c})
    return {k: [c.get(k, [0] * 7)[KOL_FS] for c in kolom] for k in kunci_semua}, [d.isoformat() for d in hari]


def cuaca_dari_fwi(jalur, hari):
    """{hari: {(lat, lon): {'prov','fwi','dc'}}} langsung dari sebuah fwi.json pipeline, untuk menguji ALGORITMA
    firespot tanpa dicampuri selisih cuaca hasil rekonstruksi."""
    P = json.load(open(jalur))
    sel = {}
    for g in P['grid']:
        h = next((x for x in g['hari'] if x['tgl'] == hari), None)
        if h and 'dc' in h:
            sel[(g['lat'], g['lon'])] = {'prov': g['prov'], 'fwi': h['fwi'], 'dc': h['dc']}
    return {hari: sel}


def uji():
    """Dua hal diuji terpisah, supaya selisih cuaca tidak menyamarkan selisih algoritma:

    1. ALGORITMA (di sini): FWI DIKUNCI ke nilai fwi.json pipeline itu sendiri, lalu dibandingkan dengan arsip
       public/data/kluster_hari/<hari>.json yang dibangun pipeline pada 23.59 WIB. Kolom KOL_PERSIS harus sama persis;
       kolom KOL_LONGGAR (cluster aktif dan firespot aktif) diberi batas 2 persen nasional dan 10 persen per provinsi
       karena keduanya menghitung cluster sampai tujuh hari ke belakang, jadi ikut berubah bila FIRMS merevisi deteksi
       lama di antara dua jalan. Diukur 24 Okt 2026: 4 sel meleset dari 228 (Kaltim dan Papua Selatan, kolom 0 dan 1,
       paling jauh +8 persen), sedangkan kolom 3 "cluster bertitik hari itu" yang dipakai firespot cocok di 38 dari
       38 provinsi.
    2. CUACA: cuaca_riwayat.uji(), yang mengukur seberapa dekat FWI rekonstruksi dengan live pada dua keputusan yang
       dipakai di sini (ambang bara gambut dc > 350 dan kelas FWI). Diukur 25 Okt 2026: 99,7 dan 96,4 persen.
       Sisa selisih itulah yang membuat deck hari lampau bisa meleset beberapa persen di provinsi dengan banyak
       cluster kecil (Papua Selatan +6 sampai +7 persen pada 22 dan 23 Okt); cluster kecil (< 3 titik, level 0)
       dibuang atau tidak tergantung kelas FWI-nya.

    KOLOM 4 TIDAK IKUT DIBANDINGKAN. Arsip yang ter-commit 25 Okt 2026 masih memuat definisi lama di kolom itu
    (jumlah CLUSTER firespot yang bertitik hari itu), sementara harian.ringkas_kluster sudah menghitung TITIK (fs_ini);
    arsipnya belum dibangun ulang. Diperiksa pada 24 Okt, Kalteng: kolom 0-3, 5, 6 kita = arsip (2503, 860, 3, 586,
    586, 1270) sementara kolom 4 arsip 402 = jumlah cluster firespot bertitik, dan titiknya 5.922. Karena angka kolom 4
    di sini DIHASILKAN oleh harian.ringkas_kluster sendiri dari cluster yang keenam kolom lainnya sudah membuktikan
    sama, ia ikut benar begitu arsipnya dibangun ulang; sementara itu penanganan.py menjaga invarian firespot <= hotspot.
    Begitu arsip baru masuk, cukup ganti KOL_BANDING jadi semua kolom.

    Jam 23.59 dipakai, bukan 17.00, karena hanya pada jam itu ada arsip untuk dibandingkan."""
    folder = os.path.join(AKAR, 'public/data/kluster_hari')
    arsip_ada = sorted(n[:10] for n in os.listdir(folder) if n.endswith('.json'))
    jalur = sorted((os.path.join(SINI, 'cache', 'cuaca', n) for n in os.listdir(os.path.join(SINI, 'cache', 'cuaca'))
                    if n.startswith('fwi-live-')), reverse=True)
    jalur = jalur[0] if jalur else os.path.join(AKAR, 'public/data/fwi.json')
    P = json.load(open(jalur))
    punya = {x['tgl'] for g in P['grid'] for x in g['hari'] if x['tgl'] <= P['hari_ini']}
    sama = sorted(set(arsip_ada) & punya)
    assert sama, (f'tidak ada hari yang sama antara arsip kluster_hari {arsip_ada[0]}..{arsip_ada[-1]} dan {os.path.basename(jalur)} '
                  f'{min(punya)}..{max(punya)}; tarik fwi.json situs live dulu (cuaca_riwayat.uji)')
    hari = sama[-1]
    w = json.load(open(os.path.join(folder, f'{hari}.json')))['w']
    lebar = len(next(iter(w.values())))
    assert lebar >= 5, f'arsip {hari} cuma {lebar} kolom: belum memuat titik firespot (indeks 4); bangun ulang arsipnya'
    a = {k: v for k, v in w.items() if '|' not in k}
    kita = hitung(hari, '23:59', cuaca_dari_fwi(jalur, hari))
    assert sum(r[0] for r in a.values()) > 100, f'arsip {hari} cuma {sum(r[0] for r in a.values())} cluster: arsipnya yang salah?'
    nol = [0] * 7
    beda = [(k, i, kita.get(k, nol)[i], a.get(k, nol)[i])
            for k in sorted(set(kita) | set(a)) for i in KOL_PERSIS
            if kita.get(k, nol)[i] != a.get(k, nol)[i]]
    assert not beda, (f'{hari} 23.59 dengan FWI {os.path.basename(jalur)}: {len(beda)} sel kolom {KOL_PERSIS} beda '
                      f'(prov, kolom, kita, arsip) {beda[:10]}')
    longgar = []
    for i in KOL_LONGGAR:
        nk, na = sum(r[i] for r in kita.values()), sum(r[i] for r in a.values())
        assert abs(nk - na) <= 0.02 * na, f'kolom {i} nasional {nk} vs arsip {na} ({(nk - na) / na:+.1%}), lebih dari 2 persen'
        jauh = [(k, kita.get(k, nol)[i], a.get(k, nol)[i]) for k in set(kita) | set(a)
                if abs(kita.get(k, nol)[i] - a.get(k, nol)[i]) > 0.10 * max(a.get(k, nol)[i], 1)]
        assert not jauh, f'kolom {i}: provinsi beda lebih dari 10 persen (kode, kita, arsip) {sorted(jauh)}'
        longgar.append(f'kolom {i} {nk} vs {na} ({(nk - na) / na:+.1%})')
    nas_fs = sum(r[KOL_FS] for r in kita.values())
    print(f'uji lolos: {hari} 23.59 WIB, FWI dikunci ke {os.path.basename(jalur)}; {len(a)} provinsi x kolom '
          f'{KOL_PERSIS} sama persis dengan arsip kluster_hari; ' + ', '.join(longgar) +
          f'. Titik firespot nasional {nas_fs} (kolom 4 arsip masih definisi lama, lihat docstring)')


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
