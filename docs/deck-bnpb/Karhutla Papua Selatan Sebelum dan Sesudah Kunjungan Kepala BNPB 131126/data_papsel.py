#!/usr/bin/env python3
"""Data deck Karhutla Papua Selatan sebelum dan sesudah kunjungan Kepala BNPB (31 Okt 2026).

Masukan (data/papsel/sumber, salinan centurisk97.id/data 13 Nov 2026 10.31 WIB dan arsip satelit repo 21 Okt-12 Nov):
peta_karhutla.json, peta_karhutla_kab.json (luas, belum padam, padam per hari), kluster93.json (cluster Papua Selatan
digabung per lokasi ~1 km, awal dan akhir), titik93.json (hotspot unik per hari). Keluaran: data/papsel/*.csv dan
ANGKA (dipakai bangun_spek_papsel.py). Jalankan dari akar proyek-merauke.
"""
import csv
import datetime as dt
import json
import statistics as st
from collections import defaultdict
from pathlib import Path

AKAR = Path(__file__).resolve().parents[1]
SB = AKAR / 'data/papsel/sumber'
OUT = AKAR / 'data/papsel'
SEB = ('2026-10-21', '2026-10-30')       # sepuluh hari sebelum hari kunjungan
SES = ('2026-11-01', '2026-11-10')       # sepuluh hari sesudah hari kunjungan
KL_SEB = ('2026-10-26', '2026-10-31')    # cluster mulai 26-30 Okt: lima hari, setara jendela sesudah
KL_SES = ('2026-11-01', '2026-11-06')    # cluster mulai 1-5 Nov: tiap cluster teramati paling sedikit 6 hari
BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']


def tgl(s):
    d = dt.date.fromisoformat(s)
    return f'{d.day} {BULAN[d.month - 1]}'


def tulis(nama, kepala, baris):
    with (OUT / nama).open('w', encoding='utf-8', newline='') as f:
        w = csv.writer(f)
        w.writerow(kepala)
        w.writerows(baris)


def bangun():
    A = {}
    pk = json.loads((SB / 'peta_karhutla.json').read_text(encoding='utf-8'))
    H = pk['hari']
    p = pk['prov']['93']

    def jml(k, a, b):
        return sum(p[k][H.index(a):H.index(b) + 1])

    n = 10
    for k in ('luas', 'belum', 'padam', 'hot'):
        A[f'seb.{k}'] = jml(k, *SEB)
        A[f'ses.{k}'] = jml(k, *SES)
        A[f'seb.{k}.hari'] = round(A[f'seb.{k}'] / n)
        A[f'ses.{k}.hari'] = round(A[f'ses.{k}'] / n)
        A[f'ubah.{k}'] = round((A[f'ses.{k}'] / A[f'seb.{k}'] - 1) * 100)
    i0 = H.index('2026-10-01')
    okt = list(zip(H[i0:], p['luas'][i0:]))
    puncak = max(okt[:31], key=lambda r: r[1])
    A['puncak.luas'], A['puncak.hari'] = puncak[1], puncak[0]
    A['okt.luas'] = sum(v for h, v in okt if h.startswith('2026-10'))
    A['nov.luas'] = sum(v for h, v in okt if h.startswith('2026-11'))
    A['nov.sampai'] = H[-1]
    A['th.luas'] = sum(p['luas'])
    # dasarian: rata-rata harian
    das = [('Awal Okt', '2026-10-01', '2026-10-10'), ('Tengah Okt', '2026-10-11', '2026-10-20'),
           ('Akhir Okt', '2026-10-21', '2026-10-30'), ('Awal Nov', '2026-11-01', '2026-11-10')]
    tulis('dasarian.csv', ['periode', 'luas', 'belum', 'hot'],
          [[nm, round(jml('luas', a, b) / 10), round(jml('belum', a, b) / 10), round(jml('hot', a, b) / 10)] for nm, a, b in das])
    A['das1.luas'] = round(jml('luas', '2026-10-01', '2026-10-10') / 10)
    tulis('ringkas_luas.csv', ['periode', 'Luas terbakar per hari'],
          [[nm, round(jml('luas', a, b) / 10)] for nm, (_, a, b) in zip(['Awal Okt', 'Tengah Okt', 'Sebelum kunjungan', 'Sesudah kunjungan'], das)])
    # harian 1 Okt sampai hari terakhir
    tulis('harian.csv', ['hari', 'Luas terbakar', 'Belum padam'],
          [[tgl(h), p['luas'][H.index(h)], p['belum'][H.index(h)]] for h in H[i0:]])
    # nasional November per provinsi
    import sys
    sys.path.insert(0, str(Path(__file__).resolve().parents[3] / 'scripts' / 'visual'))
    j0 = H.index('2026-11-01')
    nas = sorted(((sum(v['luas'][j0:]), k) for k, v in pk['prov'].items()), reverse=True)
    PROV = {'11': 'Aceh', '12': 'Sumatera Utara', '13': 'Sumatera Barat', '14': 'Riau', '15': 'Jambi', '16': 'Sumatera Selatan',
            '17': 'Bengkulu', '18': 'Lampung', '19': 'Kep. Bangka Belitung', '21': 'Kepulauan Riau', '31': 'DKI Jakarta',
            '32': 'Jawa Barat', '33': 'Jawa Tengah', '34': 'DI Yogyakarta', '35': 'Jawa Timur', '36': 'Banten', '51': 'Bali',
            '52': 'Nusa Tenggara Barat', '53': 'Nusa Tenggara Timur', '61': 'Kalimantan Barat', '62': 'Kalimantan Tengah',
            '63': 'Kalimantan Selatan', '64': 'Kalimantan Timur', '65': 'Kalimantan Utara', '71': 'Sulawesi Utara',
            '72': 'Sulawesi Tengah', '73': 'Sulawesi Selatan', '74': 'Sulawesi Tenggara', '75': 'Gorontalo', '76': 'Sulawesi Barat',
            '81': 'Maluku', '82': 'Maluku Utara', '91': 'Papua', '92': 'Papua Barat', '93': 'Papua Selatan', '94': 'Papua Tengah',
            '95': 'Papua Pegunungan', '96': 'Papua Barat Daya'}
    tulis('nasional_nov.csv', ['provinsi', 'luas'], [[PROV[k], v] for v, k in nas if k in PROV])
    A['nas.total'] = sum(v for v, _ in nas)
    A['nas.porsi'] = round(nas[0][0] / A['nas.total'] * 100) if nas[0][1] == '93' else None
    A['nas.kedua'] = nas[1][0]
    A['nas.kedua.nama'] = PROV[nas[1][1]]
    # okt nasional peringkat
    jo, jn = H.index('2026-10-01'), H.index('2026-10-31') + 1
    oktn = sorted(((sum(v['luas'][jo:jn]), k) for k, v in pk['prov'].items()), reverse=True)
    A['okt.peringkat'] = [k for _, k in oktn].index('93') + 1

    # per kabupaten
    kk = json.loads((SB / 'peta_karhutla_kab.json').read_text(encoding='utf-8'))
    HK = kk['hari']
    a0, a1, b0, b1 = (HK.index(x) for x in (SEB[0], SEB[1], SES[0], SES[1]))
    kab = []
    for key, v in kk['kab'].items():
        if not key.startswith('93|'):
            continue
        d = {r[0]: r for r in v['d']}
        s = sum(d[i][1] for i in range(a0, a1 + 1) if i in d)
        t = sum(d[i][1] for i in range(b0, b1 + 1) if i in d)
        sb = sum(d[i][2] for i in range(a0, a1 + 1) if i in d)
        tb = sum(d[i][2] for i in range(b0, b1 + 1) if i in d)
        kab.append([v['nama'], s, t, round((t / s - 1) * 100, 1) if s else 0, sb, tb])
    kab.sort(key=lambda r: -r[1])
    tulis('kab.csv', ['kab', 'sebelum', 'sesudah', 'ubah', 'belum_seb', 'belum_ses'], kab)
    tulis('kab_turun.csv', ['kab', 'turun'], [[r[0], round((1 - r[2] / r[1]) * 100, 1)] for r in kab])
    mk = next(r for r in kab if r[0] == 'Merauke')
    A['mk.seb'], A['mk.ses'] = mk[1], mk[2]
    A['mk.porsi.ses'] = round(mk[2] / sum(r[2] for r in kab) * 100)
    A['mk.ubah'] = round((mk[2] / mk[1] - 1) * 100)
    turun = sum(r[1] - r[2] for r in kab)
    A['luar.porsi'] = round(sum(r[1] - r[2] for r in kab if r[0] != 'Merauke') / turun * 100)

    # cluster: umur dari hotspot pertama sampai hotspot terakhir; padam = tanpa hotspot 48 jam sebelum akhir data
    kl = json.loads((SB / 'kluster93.json').read_text(encoding='utf-8'))
    P = dt.datetime.fromisoformat
    akhir = max(P(v['akhir']) for v in kl)
    W = dt.timezone(dt.timedelta(hours=7))
    rows = []
    for nm, (a, b) in (('Sebelum', KL_SEB), ('Sesudah', KL_SES)):
        lo, hi = (dt.datetime.fromisoformat(x).replace(tzinfo=W) for x in (a, b))
        R = [v for v in kl if lo <= P(v['awal']) < hi]
        # semua cluster ikut; yang masih menyala dihitung sampai akhir data (pemeriksa 13 Nov: jangan buang yang masih aktif)
        dur = [(min(P(v['akhir']), akhir) - P(v['awal'])).total_seconds() / 86400 for v in R]
        c1, c3, c9 = sum(x <= 1 for x in dur), sum(1 < x <= 3 for x in dur), sum(x > 3 for x in dur)
        k = nm.lower()[:3]
        A[f'kl.{k}.n'] = len(R)
        A[f'kl.{k}.aktif'] = sum((akhir - P(v['akhir'])).total_seconds() <= 48 * 3600 for v in R)
        A[f'kl.{k}.p1'] = round(c1 / len(dur) * 100)
        A[f'kl.{k}.p3'] = round(c3 / len(dur) * 100)
        A[f'kl.{k}.p9'] = round(c9 / len(dur) * 100)
        A[f'kl.{k}.lama'] = c9
        rows.append([f'{nm} kunjungan', c1, c3, c9])
    tulis('umur_cluster.csv', ['periode', 'Sehari atau kurang', 'Dua sampai tiga hari', 'Lebih dari tiga hari'], rows)
    A['kl.akhir'] = akhir.astimezone(W).strftime('%Y-%m-%d %H.%M')

    # ---- rev2 (13 Nov 2026): ukuran apple to apple
    # cluster berbobot luas: porsi luas cluster menurut lama menyala
    rows_l = []
    for nm, (a_, b_) in (('Sebelum', KL_SEB), ('Sesudah', KL_SES)):
        lo, hi = (dt.datetime.fromisoformat(x).replace(tzinfo=W) for x in (a_, b_))
        R_ = [v for v in kl if lo <= P(v['awal']) < hi]
        du = [((min(P(v['akhir']), akhir) - P(v['awal'])).total_seconds() / 86400, v.get('luas6') or 0) for v in R_]   # luas pada enam hari pertama: bobot setara antarperiode
        L = sum(w for _, w in du)
        k = nm.lower()[:3]
        g = [round(sum(w for x, w in du if x <= 1)), round(sum(w for x, w in du if 1 < x <= 3)), round(sum(w for x, w in du if x > 3))]
        A[f'klw.{k}.p9'] = round(g[2] / L * 100)
        A[f'klw.{k}.p1'] = round(g[0] / L * 100)
        rows_l.append([f'{nm} kunjungan'] + g)
    tulis('umur_cluster_luas.csv', ['periode', 'Sehari atau kurang', 'Dua sampai tiga hari', 'Lebih dari tiga hari'], rows_l)
    # laju turun antarperiode sepuluh hari
    rata = lambda k, a_, b_: jml(k, a_, b_) / 10
    for k in ('luas', 'belum', 'hot'):
        v0, v1, v2 = rata(k, '2026-10-11', '2026-10-20'), rata(k, *SEB), rata(k, *SES)
        A[f'laju.seb.{k}'] = round((v1 / v0 - 1) * 100)
        A[f'laju.ses.{k}'] = round((v2 / v1 - 1) * 100)
    # rasio harian belum padam terhadap hari sebelumnya (atasan) dan porsi padam 48 jam; biasa dan berbobot
    kena = set(pk['celah_turunan'])
    for c in pk['celah']:
        c0 = dt.date.fromisoformat(c)
        kena |= {(c0 + dt.timedelta(i)).isoformat() for i in range(3)}
    I = H.index
    def ukur(a_, b_, buang=False):
        hs = H[I(a_):I(b_) + 1]
        rb = [(p['belum'][I(h)], p['belum'][I(h) - 1]) for h in hs if not (buang and (h in kena or H[I(h) - 1] in kena))]
        rp = [(p['padam'][I(h)], p['luas'][I(h) - 2]) for h in hs if not (buang and (h in kena or H[I(h) - 2] in kena))]
        return {'rb.biasa': round(st.mean(x / y for x, y in rb) * 100), 'rb.bobot': round(sum(x for x, _ in rb) / sum(y for _, y in rb) * 100),
                'rb.median': round(st.median(x / y for x, y in rb) * 100),
                'rp.biasa': round(st.mean(x / y for x, y in rp) * 100), 'rp.bobot': round(sum(x for x, _ in rp) / sum(y for _, y in rp) * 100),
                'n': len(rb)}
    for k, (a_, b_) in (('seb', SEB), ('ses', SES)):
        for kk, vv in ukur(a_, b_).items():
            A[f'{kk}.{k}'] = vv
        for kk, vv in ukur(a_, b_, True).items():
            A[f'{kk}.{k}.bersih'] = vv
    A['celah.seb'] = sorted(h for h in kena if SEB[0] <= h <= SEB[1])
    tulis('ukuran.csv', ['ukuran', 'sebelum', 'sesudah', 'arti'], [
        ['Luas terbakar, rata-rata per hari (ha)', A['seb.luas.hari'], A['ses.luas.hari'], 'Lebih kecil, belum setara'],
        ['Perubahan luas per sepuluh hari (%)', A['laju.seb.luas'], A['laju.ses.luas'], 'Penurunan melambat'],
        ['Perubahan belum padam per sepuluh hari (%)', A['laju.seb.belum'], A['laju.ses.belum'], 'Penurunan melambat'],
        ['Perubahan hotspot per sepuluh hari (%)', A['laju.seb.hot'], A['laju.ses.hot'], 'Penurunan melambat'],
        ['Belum padam dibanding kemarin, nilai tengah (%)', A['rb.median.seb'], A['rb.median.ses'], 'Setara'],
        ['Belum padam dibanding kemarin, rata-rata biasa (%)', A['rb.biasa.seb'], A['rb.biasa.ses'], 'Terdistorsi hari lonjakan'],
        ['Luas yang padam dalam dua hari, berbobot (%)', A['rp.bobot.seb'], A['rp.bobot.ses'], 'Hampir sama'],
        ['Belum padam dibanding luas terbakar (%)', round(A['seb.belum'] / A['seb.luas'] * 100), round(A['ses.belum'] / A['ses.luas'] * 100), 'Sisa api sedikit lebih kecil'],
        ['Luas api yang menyala lebih dari tiga hari (%)', A['klw.seb.p9'], A['klw.ses.p9'], 'Api besar lebih cepat padam'],
        ['Luas api yang padam dalam sehari (%)', A['klw.seb.p1'], A['klw.ses.p1'], 'Api besar lebih cepat padam'],
        ['Jumlah api yang menyala lebih dari tiga hari (%)', A['kl.seb.p9'], A['kl.ses.p9'], 'Lebih sedikit api lama'],
    ])
    tulis('rasio_harian.csv', ['hari', 'Belum padam dibanding kemarin'],
          [[tgl(h), round(p['belum'][I(h)] / p['belum'][I(h) - 1] * 100)] for h in H[I('2026-10-19'):I(SES[1]) + 1]])

    # hotspot per kecamatan per periode (titik unik, sumber hitung)
    tt = json.loads((SB / 'titik93.json').read_text(encoding='utf-8'))
    for nm, (a, b) in (('seb', SEB), ('ses', SES)):
        g = defaultdict(list)
        for la, lo, h, w, frp, yak, hit in tt:
            hh = '2026-' + h
            if a <= hh <= b and hit:
                g[w.split('|')[2] if w.count('|') == 2 else w].append((la, lo))
        baris = sorted(([k, len(v), round(sum(x[1] for x in v) / len(v), 4), round(sum(x[0] for x in v) / len(v), 4)]
                        for k, v in g.items()), key=lambda r: -r[1])
        tulis(f'kec_{nm}.csv', ['kecamatan', 'hotspot', 'lon', 'lat'], baris)
        A[f'kec.{nm}.total'] = sum(r[1] for r in baris)
        A[f'kec.{nm}.n'] = len(baris)
        A[f'kec.{nm}.top'] = baris[:3]
        A[f'kec.{nm}.semua'] = {r[0]: r[1] for r in baris}
    sb, ss = A['kec.seb.semua'], A['kec.ses.semua']
    top = sorted(set(sb) | set(ss), key=lambda k: -(sb.get(k, 0) + ss.get(k, 0)))[:12]
    tulis('kec_banding.csv', ['kecamatan', 'sebelum', 'sesudah', 'ubah'],
          [[k, sb.get(k, 0), ss.get(k, 0), round((ss.get(k, 0) / sb[k] - 1) * 100, 1) if sb.get(k) else 0] for k in top])
    return A


if __name__ == '__main__':
    OUT.mkdir(parents=True, exist_ok=True)
    for k, v in bangun().items():
        print(k, v)
