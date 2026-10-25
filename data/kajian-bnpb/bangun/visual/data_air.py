#!/usr/bin/env python3
"""Tabel turunan untuk gambar Kajian Ketahanan Air (spek bangun/visual/spek-air/*.json) -> data/turunan/gambar-air/*.csv.

Semua angka dihitung dari paket data dan berkas mentah yang sudah ada; tidak ada angka diketik. Jalankan dari mana saja:
    .venv/bin/python bangun/visual/data_air.py
"""
import csv, importlib.util, json, sys
from collections import defaultdict
from pathlib import Path

AKAR = Path(__file__).resolve().parents[2]
D, KE = AKAR / 'data', AKAR / 'data' / 'turunan' / 'gambar-air'
JAWA = {'31', '32', '33', '34', '35', '36'}
PROV = {'31': 'DKI Jakarta', '32': 'Jawa Barat', '33': 'Jawa Tengah', '34': 'DI Yogyakarta', '35': 'Jawa Timur', '36': 'Banten'}


def baca(p):
    return list(csv.DictReader(open(p, encoding='utf-8')))


def tulis(nama, kolom, baris):
    KE.mkdir(parents=True, exist_ok=True)
    with open(KE / nama, 'w', newline='', encoding='utf-8') as f:
        w = csv.DictWriter(f, kolom)
        w.writeheader()
        w.writerows(baris)
    print(f'{nama}: {len(baris)} baris')


def angka_id(s):
    return float(str(s).replace('.', '').replace(',', '.'))


def oni():
    out = []
    for ln in (AKAR / 'riset/mentah/oni_cpc.txt').read_text().splitlines()[1:]:
        p = ln.split()
        if len(p) == 4 and (2008 <= int(p[1]) <= 2026):
            out.append({'musim': f'{p[0]} {p[1]}', 'oni': p[3]})
    tulis('oni_musiman.csv', ['musim', 'oni'], out)
    mh = [r for r in baca(D / 'skenario-hidromet/musim_hujan.csv') if r['wilayah'] == 'jawa']
    nd = [{'musim': f"{r['musim'][:4]}/{r['musim'][7:]}", 'oni': r['oni_ndj']} for r in mh]
    jas = next(r for r in out if r['musim'] == 'JAS 2026')
    nd.append({'musim': 'JAS 2026', 'oni': jas['oni']})
    tulis('oni_ndj_musim.csv', ['musim', 'oni'], nd)


def dibi():
    rows = [r for r in baca(D / 'air-jawa/dibi_kab_tahun.csv') if r['is_bencana'] == '1' and float(r['jumlah_kejadian'] or 0) > 0]
    kab = baca(D / 'air-jawa/kab_jawa.csv')
    # kab/kota berkejadian kekeringan per tahun 2008-2026
    per = defaultdict(set)
    for r in rows:
        if r['kelompok'] == 'kekeringan':
            per[int(r['tahun'])].add(r['kode'])
    tulis('kekeringan_kab_tahun.csv', ['tahun', 'n_kab'], [{'tahun': t, 'n_kab': len(per[t])} for t in range(2008, 2027)])
    # jumlah tahun berkejadian 2015-2025 per kab/kota
    for kel, nama in (('kekeringan', 'tahun_kekeringan_kab.csv'), ('longsor', 'tahun_longsor_kab.csv')):
        n = defaultdict(set)
        for r in rows:
            if r['kelompok'] == kel and 2015 <= int(r['tahun']) <= 2025:
                n[r['kode']].add(r['tahun'])
        tulis(nama, ['kode', 'nama', 'n_tahun'], [{'kode': k['kode'], 'nama': k['nama'], 'n_tahun': len(n[k['kode']])} for k in kab])
    assert len(kab) == 119, len(kab)


def karhutla():
    d = json.load(open(AKAR / 'riset/mentah/sipongi_luas_2015_2026.json'))
    out = []
    for p in d['data']:
        if p['id_mendagri'] in JAWA:
            for x in p['data_luas']:
                grup = p['nama_provinsi'] if p['id_mendagri'] in ('35', '32', '33') else 'Provinsi lain'
                out.append({'tahun': str(x['tahun']), 'provinsi': PROV[p['id_mendagri']], 'grup': grup, 'luas': round(angka_id(x.get('luas', x.get('total'))), 2)})
    tot = defaultdict(float)
    for r in out:
        tot[r['tahun']] += r['luas']
    assert round(tot['2023']) == 71110, tot['2023']   # T4.7 bukti bab-05
    tulis('karhutla_provinsi_tahun.csv', ['tahun', 'provinsi', 'grup', 'luas'], out)
    t23 = [r for r in out if r['tahun'] == '2023']
    tulis('karhutla_provinsi_2023.csv', ['provinsi', 'luas'], [{'provinsi': r['provinsi'], 'luas': r['luas']} for r in t23])


def irigasi():
    rows = baca(D / 'air-jawa/irigasi_kab.csv')
    kab = {r['kode']: r for r in baca(D / 'air-jawa/kab_jawa.csv')}
    per = defaultdict(float)
    for r in rows:
        if r['jenis'] == 'Permukaan':
            per[r['kode']] += float(r['ha'] or 0)
    tulis('irigasi_permukaan_kab.csv', ['kode', 'nama', 'lon', 'lat', 'ha'],
          [{'kode': k, 'nama': kab[k]['nama'], 'lon': kab[k]['lon_pusat'], 'lat': kab[k]['lat_pusat'], 'ha': round(v)} for k, v in per.items() if v > 0])
    pk = defaultdict(float)
    for r in rows:
        pk[(r['prov_kode'], r['kewenangan'])] += float(r['ha'] or 0)
    out = []
    for p in sorted(JAWA):
        t = sum(v for (pp, _), v in pk.items() if pp == p)
        if not t:
            continue
        for kw, lbl in (('pusat', 'Pusat'), ('provinsi', 'Provinsi'), ('kabkota', 'Kabupaten/kota')):
            out.append({'provinsi': PROV[p], 'kewenangan': lbl, 'persen': round(100 * pk[(p, kw)] / t, 1) if t else 0})
    tulis('irigasi_kewenangan_provinsi.csv', ['provinsi', 'kewenangan', 'persen'], out)


def musim_hujan_jenis():
    spec = importlib.util.spec_from_file_location('sh', AKAR / 'bangun/skenario-hidromet.py')
    sh = importlib.util.module_from_spec(spec)
    sys.argv = ['x']
    spec.loader.exec_module(sh)
    kota = sh.muat_kota()
    rows = sh.muat_dibi(kota)[0]
    musim_wil = sh.agregasi(rows, kota)[4]
    nama = {'banjir': 'banjir', 'banjir_bandang': 'banjir', 'banjir_longsor': 'banjir', 'longsor': 'longsor', 'cuaca_ekstrem': 'cuaca'}
    out = defaultdict(float)
    for (w, y, j), v in musim_wil.items():
        if w == 'jawa':
            out[(y, nama[j])] += sh.mh(v)
    tot = defaultdict(float)
    for (y, _), v in out.items():
        tot[y] += v
    mh = {int(r['tahun_awal']): int(r['meninggal']) + int(r['hilang']) for r in baca(D / 'skenario-hidromet/musim_hujan.csv') if r['wilayah'] == 'jawa'}
    for y in mh:
        assert round(tot[y]) == mh[y], (y, tot[y], mh[y])
    tulis('musim_hujan_total.csv', ['musim', 'pendek', 'meninggal_hilang'],
          [{'musim': f'{y}/{y + 1}', 'pendek': f'{str(y)[2:]}/{str(y + 1)[2:]}', 'meninggal_hilang': mh[y]} for y in sorted(mh)])
    tulis('musim_hujan_jenis.csv', ['musim', 'jenis', 'meninggal_hilang'],
          [{'musim': f'{y}/{str(y + 1)[2:]}', 'jenis': j, 'meninggal_hilang': round(v)} for (y, j), v in sorted(out.items())])


def registri():
    """Baris grafik yang angkanya sudah di registri data/angka.json (dibaca lewat kontrak naskah, bukan diketik)."""
    sys.path.insert(0, str(AKAR / 'bangun' / 'kontrak'))
    import naskah as N
    k = N.Konteks()

    def rr(kunci):
        v, lo, hi, _ = k.nilai(kunci)
        return (lo, hi) if v is None else (v, v)
    tam = [('Pekalongan, GNSS CPKL', 'airjawa.turun_tanah.pekalongan.tambahan_2026_2030_gnss', 'terverifikasi'),
           ('Pekalongan, patok', 'airjawa.turun_tanah.pekalongan.tambahan_2026_2030_patok', 'terverifikasi'),
           ('Pekalongan, kutipan latar', 'airjawa.turun_tanah.pekalongan.tambahan_2026_2030_latar', 'latar'),
           ('Semarang utara-timur dan Demak', 'airjawa.turun_tanah.semarang_demak.tambahan_2026_2030', 'terverifikasi'),
           ('CAT Jakarta', 'airjawa.turun_tanah.jakarta.tambahan_2026_2030', 'terverifikasi'),
           ('Kab. Bandung, titik tertinggi', 'airjawa.turun_tanah.bandung.tambahan_2026_2030_titik', 'terverifikasi')]
    tulis('tambahan_muka_tanah.csv', ['wilayah', 'rendah', 'tinggi', 'versi'],
          [{'wilayah': n, 'rendah': rr(x)[0], 'tinggi': rr(x)[1], 'versi': v} for n, x, v in tam])
    tok = [('1964', 'bukti.p16.tokyo_ambil_1964'), ('1975', 'bukti.p16.tokyo_ambil_1975')]
    tulis('tokyo_air_tanah.csv', ['tahun', 'm3_hari'], [{'tahun': t, 'm3_hari': rr(x)[0]} for t, x in tok])
    kp = [('2008/2009', 'Tercatat', 'hidromet.jawa.lantai.meninggal_hilang'),
          ('2008/2009', 'Faktor pada semua korban', 'hidromet.jawa.lantai.pd_renas.korban_jiwa'),
          ('2008/2009', 'Longsor tidak dihitung', 'hidromet.jawa.lantai.pd_renas_tanpa_longsor.korban_jiwa'),
          ('2025/2026', 'Tercatat', 'hidromet.jawa.lantai.meninggal_hilang_10_musim'),
          ('2025/2026', 'Faktor pada semua korban', 'hidromet.jawa.musim_2025.pd_renas.korban_jiwa'),
          ('2025/2026', 'Longsor tidak dihitung', 'hidromet.jawa.musim_2025.pd_renas_tanpa_longsor.korban_jiwa')]
    pendek = {'Tercatat': 'Tercatat', 'Faktor pada semua korban': 'Semua korban', 'Longsor tidak dihitung': 'Tanpa longsor'}
    tulis('kepekaan_pd.csv', ['label', 'musim', 'versi', 'pendek', 'jiwa'],
          [{'label': f'{m} {v.lower()}', 'musim': m, 'versi': v, 'pendek': pendek[v], 'jiwa': round(rr(x)[0])} for m, v, x in kp])


def bendungan():
    out = []
    for r in baca(D / 'air-jawa/bendungan.csv'):
        if 'Pemali' in (r['bbws_sumber'] or '') and 'PERAGA' not in (r['koordinat_cek'] or '') and r['kapasitas_desain_juta_m3']:
            out.append({'nama': r['nama'], 'lon': r['lon'], 'lat': r['lat'], 'kapasitas': r['kapasitas_desain_juta_m3'],
                        'kehilangan': r['kehilangan_tampungan_persen'],
                        'label': f"{r['nama']}, hilang {float(r['kehilangan_tampungan_persen']):.1f}%".replace('.', ',')})
    tulis('bendungan_pj.csv', ['nama', 'lon', 'lat', 'kapasitas', 'kehilangan', 'label'], out)


def subsiden():
    out = []
    for r in baca(D / 'air-jawa/subsiden_kota.csv'):
        if r['label'] != 'terverifikasi':
            continue
        lo = r['min_cm_th'] or r['maks_cm_th'] or r['tengah_cm_th']
        hi = r['maks_cm_th'] or r['min_cm_th'] or r['tengah_cm_th']
        if not lo or float(lo) < 0:   # tanpa angka, atau rentang memuat kenaikan muka tanah (tidak digambar di sumbu dari nol)
            continue
        per = r['periode'].split(' ')[0].replace('-', '\u2013') if r['periode'][:2] in ('19', '20') else ''
        m = r['metode'].lower()
        met = 'gabungan metode' if ',' in m else 'InSAR' if 'insar' in m else 'levelling' if 'level' in m else 'GPS'
        out.append({'id': f"{r['wilayah_literatur']} {per}".strip() + f", {met}", 'rendah': lo, 'tinggi': hi})
    ids = [o['id'] for o in out]
    assert len(ids) == len(set(ids)), ids
    tulis('laju_penurunan.csv', ['id', 'rendah', 'tinggi'], out)


def perhatian():
    n = defaultdict(int)
    kab = baca(D / 'air-jawa/kab_jawa.csv')
    for r in baca(D / 'turunan/daftar_perhatian.csv'):
        if r['kajian'] == 'air' and r['bahaya'] in ('banjir', 'longsor') and r['masuk'] == 'True':
            n[r['kode']] += 1
    tulis('perhatian_banjir_longsor.csv', ['kode', 'nama', 'n_bahaya'], [{'kode': k['kode'], 'nama': k['nama'], 'n_bahaya': n[k['kode']]} for k in kab])


if __name__ == '__main__':
    oni(); dibi(); karhutla(); irigasi(); registri(); bendungan(); subsiden(); perhatian(); musim_hujan_jenis()
