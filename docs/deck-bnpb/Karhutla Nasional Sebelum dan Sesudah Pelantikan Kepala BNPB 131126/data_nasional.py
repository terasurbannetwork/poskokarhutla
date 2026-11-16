#!/usr/bin/env python3
"""Data deck karhutla nasional empat minggu sebelum dan sesudah pelantikan Kepala BNPB (15 Okt 2026).

Arahan atasan pemilik (13 Nov 2026): info nasional, per provinsi, provinsi top (yang sedang karhutla), non-top, dan metode berbobot per daerah.
Jendela 28 hari: pra 20 Agu-16 Sep, sebelum 17 Sep-14 Okt, sesudah 16 Okt-12 Nov; 15 Okt tidak dihitung.
Provinsi top = enam provinsi dengan luas terbakar terbesar pada jendela sebelum. Metode berbobot: perubahan nasional = jumlah
(bobot provinsi x perubahan provinsi), bobot = porsi luas provinsi pada jendela sebelum; dibandingkan dengan rata-rata biasa.
Masukan data/papsel/sumber/peta_karhutla.json. Keluaran data/nasional/*.csv dan kamus angka.
"""
import csv
import datetime as dt
import json
import statistics as st
from pathlib import Path

AKAR = Path(__file__).resolve().parents[1]
SB = AKAR / 'data/papsel/sumber'
OUT = AKAR / 'data/nasional'
BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
D = dt.date(2026, 10, 15)
N = 28
DIKUNJUNGI = {'93', '16', '62', '64', '35', '18'}


def tgl(s):
    d = dt.date.fromisoformat(s)
    return f'{d.day} {BULAN[d.month - 1]}'


def rentang(a, b):
    return f'{tgl(a)}-{tgl(b)}'


def tulis(nama, kepala, baris):
    with (OUT / nama).open('w', encoding='utf-8', newline='') as f:
        w = csv.writer(f)
        w.writerow(kepala)
        w.writerows(baris)


def bangun():
    OUT.mkdir(parents=True, exist_ok=True)
    pk = json.loads((SB / 'peta_karhutla.json').read_text(encoding='utf-8'))
    H = pk['hari']
    I = H.index
    h = lambda n: (D + dt.timedelta(days=n)).isoformat()
    W = {'pra': (h(-2 * N), h(-N - 1)), 'seb': (h(-N), h(-1)), 'ses': (h(1), h(N))}
    assert W['ses'][1] <= H[-1], 'data belum cukup'
    A = {'akhir_data': H[-1]}
    for nm, (a, b) in W.items():
        A[f'jendela.{nm}'] = rentang(a, b)
    J = lambda s, a, b: sum(s[I(a):I(b) + 1])
    P = pk['prov']
    nas = {k: [sum(p[k][i] for p in P.values()) for i in range(len(H))] for k in ('luas', 'belum', 'padam', 'hot')}
    for k in ('luas', 'belum', 'hot'):
        for nm in W:
            A[f'{nm}.{k}'] = round(J(nas[k], *W[nm]) / N)
        A[f'laju.seb.{k}'] = round((A[f'seb.{k}'] / A[f'pra.{k}'] - 1) * 100)
        A[f'laju.ses.{k}'] = round((A[f'ses.{k}'] / A[f'seb.{k}'] - 1) * 100)
    kena = set(pk['celah_turunan'])
    for x in pk['celah']:
        x0 = dt.date.fromisoformat(x)
        kena |= {(x0 + dt.timedelta(i)).isoformat() for i in range(3)}
    for nm, (a, b) in W.items():
        A[f'celah.{nm}'] = len([x for x in H[I(a):I(b) + 1] if x in kena])
    def bersih(k, a, b):
        v = [nas[k][I(x)] for x in H[I(a):I(b) + 1] if x not in kena]
        return sum(v) / len(v)
    rb = {nm: bersih('luas', *W[nm]) for nm in W}
    A['bersih.seb.luas'] = round((rb['seb'] / rb['pra'] - 1) * 100)
    for nm, (a, b) in W.items():
        A[f'bersih.n.{nm}'] = len([x for x in H[I(a):I(b) + 1] if x not in kena])
    ip = max(range(I(W['seb'][0]), I(W['ses'][1]) + 1), key=lambda i: nas['luas'][i])
    A['puncak.hari'] = H[ip]
    A['bersih.ses.luas'] = round((rb['ses'] / rb['seb'] - 1) * 100)
    def ukur(a, b):
        hs = H[I(a):I(b) + 1]
        r1 = [nas['belum'][I(x)] / nas['belum'][I(x) - 1] for x in hs]
        rp = [(nas['padam'][I(x)], nas['luas'][I(x) - 2]) for x in hs]
        return {'rb.median': round(st.median(r1) * 100), 'rb.biasa': round(st.mean(r1) * 100),
                'rp.bobot': round(sum(a_ for a_, _ in rp) / sum(b_ for _, b_ in rp) * 100),
                'bl': round(J(nas['belum'], a, b) / J(nas['luas'], a, b) * 100)}
    for nm in ('seb', 'ses'):
        for k, v in ukur(*W[nm]).items():
            A[f'{k}.{nm}'] = v
    # per provinsi (rata-rata per hari)
    rows = []
    for c, p in P.items():
        r, s, t = (J(p['luas'], *W[n]) / N for n in ('pra', 'seb', 'ses'))
        rows.append(dict(kode=c, nama=p['nama'], pra=r, seb=s, ses=t))
    rows.sort(key=lambda r: -r['seb'])
    tot_s, tot_t = sum(r['seb'] for r in rows), sum(r['ses'] for r in rows)
    for r in rows:
        r['ubah'] = (r['ses'] / r['seb'] - 1) * 100 if r['seb'] else None
        r['bobot'] = r['seb'] / tot_s * 100
        r['kontrib'] = (r['ses'] - r['seb']) / (tot_t - tot_s) * 100   # bagian dari penurunan nasional, persen
    top = rows[:6]
    A['top'] = [r['nama'] for r in top]
    tulis('provinsi.csv', ['provinsi', 'sebelum', 'sesudah', 'ubah', 'bobot', 'kontrib'],
          [[r['nama'], round(r['seb']), round(r['ses']), round(r['ubah'], 1) if r['ubah'] is not None else '', round(r['bobot'], 1), round(r['kontrib'], 1)]
           for r in rows[:12]])
    def kata_ubah(r):   # lampiran: kata naik atau turun, provinsi di bawah 1 ha per hari tidak diberi persen
        if r['seb'] < 1:
            return '-'
        u = r['ubah']
        return ('turun ' if u < 0 else 'naik ') + f'{abs(u):.1f}'.replace('.', ',') + '%'
    tulis('provinsi_semua.csv', ['provinsi', 'sebelum', 'sesudah', 'ubah', 'bobot', 'kontrib'],
          [[r['nama'], round(r['seb']), round(r['ses']), kata_ubah(r), round(r['bobot'], 1), round(r['kontrib'], 1)]
           for r in rows])
    tulis('provinsi_bar.csv', ['provinsi', 'Sesudah pelantikan', 'Sebelum pelantikan'],
          [[r['nama'].replace('Kalimantan ', 'Kal. ').replace('Sumatera ', 'Sum. '), round(r['ses']), round(r['seb'])] for r in rows[:6]])
    tulis('prov_seb.csv', ['provinsi', 'luas'], [[r['nama'], round(r['seb'])] for r in rows])
    tulis('prov_ses.csv', ['provinsi', 'luas'], [[r['nama'], round(r['ses'])] for r in rows])
    # top lawan non-top
    def grp(g):
        a, b, c = (sum(r[k] for r in g) for k in ('pra', 'seb', 'ses'))
        return a, b, c
    gt, gn = grp(top), grp(rows[6:])
    A['top.porsi.turun'] = round((gt[1] - gt[2]) / (tot_s - tot_t) * 100)
    for nm, g in (('top', gt), ('non', gn)):
        A[f'{nm}.laju.seb'] = round((g[1] / g[0] - 1) * 100)
        A[f'{nm}.laju.ses'] = round((g[2] / g[1] - 1) * 100)
        A[f'{nm}.porsi'] = round(g[1] / tot_s * 100)
        A[f'{nm}.porsi.ses'] = round(g[2] / tot_t * 100)
    tulis('top_non.csv', ['periode', 'Enam provinsi dengan api terbesar', 'Provinsi lainnya'],
          [[f'{rentang(*W["pra"])}', round(gt[0]), round(gn[0])], [f'{rentang(*W["seb"])}, sebelum', round(gt[1]), round(gn[1])],
           [f'{rentang(*W["ses"])}, sesudah', round(gt[2]), round(gn[2])]])
    # rata-rata biasa lawan berbobot
    sig = [r for r in rows if r['seb'] * N >= 100]
    A['biasa.ubah'] = round(st.mean(r['ubah'] for r in sig))
    A['biasa.n'] = len(sig)
    A['median.ubah'] = round(st.median(r['ubah'] for r in sig))
    A['top1.porsi.ses'] = round(rows[0]['ses'] / tot_t * 100)
    akhir7 = {c: sum(p['luas'][-7:]) / 7 for c, p in P.items()}
    for c, nm in (('93', 'ps'), ('74', 'sultra'), ('64', 'kaltim')):
        A[f'akhir7.{nm}'] = round(akhir7[c])
    A['akhir7.ps.terbesar'] = max(akhir7, key=akhir7.get) == '93'
    A['bobot.ubah'] = round((tot_t / tot_s - 1) * 100)
    A['top1'] = rows[0]['nama']
    A['top1.kontrib'] = round(rows[0]['kontrib'])
    A['top1.seb'] = round(rows[0]['seb'])
    A['top1.ses'] = round(rows[0]['ses'])
    A['top1.turun.ha'] = round(rows[0]['seb'] - rows[0]['ses'])
    A['nas.turun.ha'] = round(tot_s - tot_t)
    A['top1.bobot'] = round(rows[0]['bobot'])
    # waterfall kontribusi per provinsi (ha per hari)
    wf = [[f'Sebelum, {rentang(*W["seb"])}', round(tot_s)]]
    for r in rows[:6]:
        wf.append([r['nama'], round(r['ses'] - r['seb'])])
    lain_d = round(tot_t) - round(tot_s) - sum(x[1] for x in wf[1:])
    wf.append(['Provinsi lain', lain_d])
    wf[0][0] = f'Sebelum, {rentang(*W["seb"])}'
    A['wf.akhir.label'] = f'Sesudah, {rentang(*W["ses"])}'
    tulis('waterfall.csv', ['bagian', 'luas'], wf)
    A['wf.akhir'] = round(tot_t)
    # dikunjungi lawan tidak
    gv = grp([r for r in rows if r['kode'] in DIKUNJUNGI]); gl = grp([r for r in rows if r['kode'] not in DIKUNJUNGI])
    A['kunjung.laju.ses'] = round((gv[2] / gv[1] - 1) * 100)
    A['lain.laju.ses'] = round((gl[2] / gl[1] - 1) * 100)
    A['kunjung.laju.seb'] = round((gv[1] / gv[0] - 1) * 100)
    A['lain.laju.seb'] = round((gl[1] / gl[0] - 1) * 100)
    # harian nasional
    i0 = I('2026-08-20')
    tulis('harian.csv', ['hari', 'Luas terbakar', 'Belum padam'], [[tgl(x), nas['luas'][I(x)], nas['belum'][I(x)]] for x in H[i0:]])
    tulis('periode.csv', ['periode', 'Luas terbakar per hari'],
          [[rentang(*W['pra']), A['pra.luas']], [f'{rentang(*W["seb"])}, sebelum', A['seb.luas']], [f'{rentang(*W["ses"])}, sesudah', A['ses.luas']]])
    tulis('periode_tabel.csv', ['periode', 'masa', 'luas', 'belum', 'hot'],
          [[rentang(*W[k]), m, A[f'{k}.luas'], A[f'{k}.belum'], A[f'{k}.hot']] for k, m in (('pra', 'Pembanding'), ('seb', 'Sebelum'), ('ses', 'Sesudah'))])
    tulis('periode.csv', ['periode', 'Luas terbakar per hari'],
          [[rentang(*W['pra']), A['pra.luas']], [f'{rentang(*W["seb"])}, sebelum', A['seb.luas']], [f'{rentang(*W["ses"])}, sesudah', A['ses.luas']]])
    # pola musim: luas terbakar bulanan GWIS (MODIS MCD64A1) 2012-2024, jendela didekati setengah bulan
    gw = json.loads((SB / 'luas_satelit.json').read_text(encoding='utf-8'))
    T, Bl = gw['tahun'], gw['bulanan']
    nat = [sum(v[i] for v in Bl.values()) for i in range(len(T) * 12)]
    musim = []
    for ti, y in enumerate(T):
        if not 2012 <= int(y) <= 2024:
            continue
        m = lambda mm: nat[ti * 12 + mm - 1]
        sb_, ss_ = m(9) / 2 + m(10) / 2, m(10) / 2 + m(11) / 2
        musim.append([y, round((1 - ss_ / sb_) * 100)])
    A['musim.median'] = round(st.median(r[1] for r in musim))
    A['musim.min'] = min(r[1] for r in musim)
    A['musim.maks'] = max(r[1] for r in musim)
    musim.append(['2026', -A['laju.ses.luas']])
    tulis('musim.csv', ['tahun', 'turun'], musim)
    from data_wilayah import arti_laju, arti_rasio, WILAYAH, bangun as bangun_w
    rk = []
    for kode, c in sorted(WILAYAH.items(), key=lambda kv: kv[1]['kunjungan']):
        w = bangun_w(kode)
        d1 = w['laju.ses.luas'] - w['lain.ses.luas']
        d2 = w['bersih.ses.luas'] - w['lain.bersih.ses.luas']
        if d1 < -5 and d2 < -5:
            put = 'Lebih cepat'
        elif d1 > 5 and d2 > 5:
            put = 'Lebih lambat'
        elif d1 > 5 or d2 > 5:
            put = 'Tidak lebih cepat'
        elif d1 < -5 or d2 < -5:
            put = 'Setara atau sedikit lebih cepat'
        else:
            put = 'Setara'
        nm = {'kalteng-kaltim': 'Kalimantan Tengah dan Timur'}.get(kode, c['nama'])
        rk.append([f'{nm}, {tgl(c["kunjungan"])}', w['laju.seb.luas'], w['laju.ses.luas'], w['lain.ses.luas'],
                   w['bersih.ses.luas'], w['lain.bersih.ses.luas'], put])
        A[f'rk.{kode}'] = put
    tulis('kunjungan.csv', ['wilayah', 'sebelum', 'sesudah', 'lain', 'bersih', 'lain_bersih', 'putusan'], rk)
    tulis('kunjungan_db.csv', ['wilayah', 'Provinsi lain', 'Wilayah dikunjungi'], [[r[0], -r[3], -r[2]] for r in rk])
    tulis('kunjungan_bar.csv', ['wilayah', 'Wilayah yang dikunjungi', 'Provinsi lain'],
          [[r[0].split(',')[0].replace('Kalimantan Tengah dan Timur', 'Kalimantan'), -r[2], -r[3]] for r in rk])
    tulis('kunjungan_tgl.csv', ['wilayah', 'tanggal', 'putusan'],
          [[r[0].split(',')[0].replace('Kalimantan Tengah dan Timur', 'Kalimantan'), r[0].split(', ')[1], r[6]] for r in rk])
    tulis('kunjungan_put.csv', ['wilayah', 'putusan'], [[r[0].split(',')[0].replace('Kalimantan Tengah dan Timur', 'Kalimantan Tengah-Timur'), r[6]] for r in rk])
    A['rk.cepat'] = sum(r[6] == 'Lebih cepat' for r in rk)
    # ---- bahan kunjungan dari deck daerah (pemilik 13 Nov 2026: "semua")
    import datetime as _dt
    geo_dir = AKAR / 'geo' / 'kabupaten'
    def pusat_kab(prov, nama):
        g = json.loads((geo_dir / f'{prov}.json').read_text(encoding='utf-8'))
        f = next(f for f in g['features'] if f['properties']['kab'] == nama)
        pol = f['geometry']['coordinates'] if f['geometry']['type'] == 'Polygon' else max(f['geometry']['coordinates'], key=lambda q: len(q[0]))
        r = pol[0]
        return round(sum(x for x, _ in r) / len(r), 4), round(sum(y for _, y in r) / len(r), 4)
    peta_k, tren, lokasi, kini = [], [], [], []
    for kode, c in sorted(WILAYAH.items(), key=lambda kv: kv[1]['kunjungan']):
        w = bangun_w(kode)
        nm = {'kalteng-kaltim': 'Kalimantan'}.get(kode, c['nama'])
        lon, lat = pusat_kab(c['prov'][0], c['kab'])
        peta_k.append([f'{c["kab"]}, {tgl(c["kunjungan"])}', 1, lon, lat])
        D0 = _dt.date.fromisoformat(c['kunjungan'])
        ser = [sum(P[pv]['luas'][i] for pv in c['prov']) for i in range(len(H))]
        i0 = I(c['kunjungan'])
        dasar = sum(ser[i0 - 10:i0]) / 10
        for k in range(-10, 11):
            v = sum(ser[i0 + k - 1:i0 + k + 2]) / 3   # rata-rata tiga hari
            tren.append([nm, f'H{k:+d}' if k else 'H0', round(v / dasar * 100)])
        lokasi.append([c['kab'], nm, w['kab.seb'], w['kab.ses'], w['kab.ubah'] if w['kab.ubah'] is not None else 0])
        kini.append([nm, w['akhir7.porsi']])
        A[f'kj.idx.{kode}'] = round(w['ses.luas.hari'] / w['seb.luas.hari'] * 100)
        A[f'kj.kab.{kode}'] = w['kab.ubah']
        A[f'kj.kini.{kode}'] = w['akhir7.porsi']
    tulis('kunjungan_peta.csv', ['lokasi', 'tanda', 'lon', 'lat'], peta_k)
    tulis('kunjungan_tren.csv', ['wilayah', 'hari', 'indeks'], tren)
    tulis('kunjungan_lokasi.csv', ['kabupaten', 'wilayah', 'sebelum', 'sesudah', 'ubah'], lokasi)
    tulis('kunjungan_kini.csv', ['wilayah', 'kini'], kini)
    A['kj.n'] = len(peta_k)
    A['kj.semua_turun'] = all(A[f'kj.idx.{k}'] < 100 for k in WILAYAH)
    A['rk.n'] = len(rk)
    # tabel perubahan (persen, berpanah) dan tabel kecepatan padam (berpenilaian); bahasa umum (pemilik 13 Nov 2026)
    tulis('ukuran_laju.csv', ['ukuran', 'sebelum', 'sesudah'], [
        ['Luas lahan terbakar', A['laju.seb.luas'], A['laju.ses.luas']],
        ['Luas lahan terbakar, hanya hari dengan data satelit lengkap', A['bersih.seb.luas'], A['bersih.ses.luas']],
        ['Luas yang belum padam', A['laju.seb.belum'], A['laju.ses.belum']],
        ['Jumlah hotspot', A['laju.seb.hot'], A['laju.ses.hot']],
        ['Enam provinsi dengan api terbesar', A['top.laju.seb'], A['top.laju.ses']],
        ['Provinsi lainnya', A['non.laju.seb'], A['non.laju.ses']],
        *[[r['nama'], round((r['seb'] / r['pra'] - 1) * 100), round((r['ses'] / r['seb'] - 1) * 100)] for r in rows[:3]],
        ['Provinsi yang dikunjungi Kepala BNPB', A['kunjung.laju.seb'], A['kunjung.laju.ses']],
        ['Provinsi yang tidak dikunjungi', A['lain.laju.seb'], A['lain.laju.ses']],
    ])
    nilai = {'Setara': 'Hampir sama', 'Membaik': 'Membaik', 'Memburuk': 'Memburuk'}
    tulis('ukuran_padam.csv', ['ukuran', 'sebelum', 'sesudah', 'nilai'], [
        ['Lahan terbakar yang sudah padam dua hari kemudian (%)', A['rp.bobot.seb'], A['rp.bobot.ses'], nilai[arti_rasio(A['rp.bobot.seb'], A['rp.bobot.ses'], False)]],
        ['Api yang masih menyala dari hari sebelumnya (%)', A['rb.median.seb'], A['rb.median.ses'], nilai[arti_rasio(A['rb.median.seb'], A['rb.median.ses'], True)]],
        ['Bagian luas terbakar yang belum padam (%)', A['bl.seb'], A['bl.ses'], nilai[arti_rasio(A['bl.seb'], A['bl.ses'], True)]],
    ])
    return A


if __name__ == '__main__':
    import sys
    sys.path.insert(0, str(Path(__file__).resolve().parent))
    for k, v in bangun().items():
        print(k, v)
