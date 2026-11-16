#!/usr/bin/env python3
"""Data deck karhutla sebelum dan sesudah kunjungan Kepala BNPB, berlaku untuk wilayah mana pun (13 Nov 2026).

Masukan: data/papsel/sumber/peta_karhutla.json dan peta_karhutla_kab.json (salinan centurisk97.id/data 13 Nov 2026 10.31 WIB):
luas terbakar, belum padam, padam, dan hotspot per hari per provinsi dan kabupaten sejak 1 Jan 2026.
Jendela: sebelum = sepuluh hari sebelum hari kunjungan, sesudah = sepuluh hari sesudahnya, pra = sepuluh hari sebelum jendela sebelum.
Hari kunjungan tidak dihitung. Ukuran apple to apple: laju turun per sepuluh hari, nilai tengah rasio harian belum padam terhadap
hari sebelumnya, porsi luas yang padam dalam dua hari (berbobot), belum padam dibanding luas terbakar.
Keluaran: data/<kode>/*.csv dan kamus angka. Jalankan: python spek/data_wilayah.py <kode>
"""
import csv
import datetime as dt
import json
import statistics as st
import sys
from pathlib import Path

AKAR = Path(__file__).resolve().parents[1]
SB = AKAR / 'data/papsel/sumber'
BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']

WILAYAH = {
    'papsel': dict(nama='Papua Selatan', prov=['93'], kunjungan='2026-10-31', lokasi='Merauke', kab='Merauke',
                   kegiatan='meninjau karhutla Merauke dari udara bersama KASAD',
                   sumber_kunjungan='Renlap rute udara BNPB 30 Okt 2026; RCTI+ 31 Okt 2026'),
    'sumsel': dict(nama='Sumatera Selatan', prov=['16'], kunjungan='2026-10-18', lokasi='Ogan Komering Ilir', kab='Ogan Komering Ilir',
                   kegiatan='memimpin rapat koordinasi karhutla dan meninjau Ogan Komering Ilir',
                   sumber_kunjungan='InfoPublik 18 Okt 2026'),
    'kalteng-kaltim': dict(nama='Kalimantan Tengah dan Kalimantan Timur', nama_judul='Kalimantan Tengah dan Timur', prov=['62', '64'], kunjungan='2026-10-19', lokasi='Pulang Pisau',
                           kab='Pulang Pisau', kegiatan='meninjau penanganan karhutla Pulang Pisau bersama KASAD',
                           sumber_kunjungan='InfoPublik 20 Okt 2026',
                           catatan='Tanggal kunjungan Kalimantan Timur disamakan dengan Kalimantan Tengah (arahan pemilik 13 Nov 2026).'),
    'jatim': dict(nama='Jawa Timur', prov=['35'], kunjungan='2026-10-23', lokasi='Kota Batu', kab='Kota Batu',
                  kegiatan='memimpin rapat koordinasi karhutla bersama KASAD di Kota Batu',
                  sumber_kunjungan='Metro TV 23 Okt 2026'),
    'lampung': dict(nama='Lampung', prov=['18'], kunjungan='2026-10-24', lokasi='Way Kambas, Lampung Timur', kab='Lampung Timur',
                    kegiatan='meninjau karhutla Taman Nasional Way Kambas dari udara',
                    sumber_kunjungan='RCTI+ 24 Okt 2026'),
}


def tgl(s, tahun=False):
    d = dt.date.fromisoformat(s) if isinstance(s, str) else s
    return f'{d.day} {BULAN[d.month - 1]}' + (f' {d.year}' if tahun else '')


def tgl_panjang(s):
    d = dt.date.fromisoformat(s)
    return f'{d.day} {["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"][d.month - 1]} {d.year}'


def rentang(a, b):
    a, b = dt.date.fromisoformat(a), dt.date.fromisoformat(b)
    return f'{a.day}-{tgl(b)}' if a.month == b.month else f'{tgl(a)}-{tgl(b)}'


def tulis(folder, nama, kepala, baris):
    with (folder / nama).open('w', encoding='utf-8', newline='') as f:
        w = csv.writer(f)
        w.writerow(kepala)
        w.writerows(baris)


def bangun(kode):
    c = WILAYAH[kode]
    out = AKAR / 'data' / kode
    out.mkdir(parents=True, exist_ok=True)
    pk = json.loads((SB / 'peta_karhutla.json').read_text(encoding='utf-8'))
    H = pk['hari']
    I = H.index
    D = dt.date.fromisoformat(c['kunjungan'])
    hari = lambda n: (D + dt.timedelta(days=n)).isoformat()
    W = {'pra': (hari(-20), hari(-11)), 'seb': (hari(-10), hari(-1)), 'ses': (hari(1), hari(10))}
    if W['ses'][1] > H[-1]:
        raise SystemExit(f'{kode}: data baru sampai {H[-1]}, jendela sesudah butuh sampai {W["ses"][1]}')
    ser = {k: [sum(pk['prov'][p][k][i] for p in c['prov']) for i in range(len(H))] for k in ('luas', 'belum', 'padam', 'hot')}
    A = {'nama': c['nama'], 'kunjungan': c['kunjungan'], 'akhir_data': H[-1]}
    for nm, (a, b) in W.items():
        A[f'jendela.{nm}'] = rentang(a, b)
    jml = lambda k, a, b: sum(ser[k][I(a):I(b) + 1])
    for k in ('luas', 'belum', 'padam', 'hot'):
        for nm, (a, b) in W.items():
            A[f'{nm}.{k}.hari'] = round(jml(k, a, b) / 10)
        A[f'laju.seb.{k}'] = round((A[f'seb.{k}.hari'] / A[f'pra.{k}.hari'] - 1) * 100) if A[f'pra.{k}.hari'] else None
        A[f'laju.ses.{k}'] = round((A[f'ses.{k}.hari'] / A[f'seb.{k}.hari'] - 1) * 100) if A[f'seb.{k}.hari'] else None
    # hari terkena celah lintasan satelit (hari itu dan dua hari sesudahnya)
    kena = set(pk['celah_turunan'])
    for x in pk['celah']:
        x0 = dt.date.fromisoformat(x)
        kena |= {(x0 + dt.timedelta(i)).isoformat() for i in range(3)}
    for nm, (a, b) in W.items():
        A[f'celah.{nm}'] = len([h for h in H[I(a):I(b) + 1] if h in kena])
    # pembanding: provinsi yang tidak dikunjungi Kepala BNPB, jendela tanggal yang sama (musim berlaku sama)
    dikunjungi = {p for w in WILAYAH.values() for p in w['prov']}
    lain = [p for p in pk['prov'] if p not in dikunjungi]
    serl = [sum(pk['prov'][p]['luas'][i] for p in lain) for i in range(len(H))]
    jl = lambda a, b: sum(serl[I(a):I(b) + 1])
    A['lain.seb.luas'] = round((jl(*W['seb']) / jl(*W['pra']) - 1) * 100)
    A['lain.ses.luas'] = round((jl(*W['ses']) / jl(*W['seb']) - 1) * 100)
    A['lain.n'] = len(lain)
    def bersih_lain(a, b):
        v = [serl[I(h)] for h in H[I(a):I(b) + 1] if h not in kena]
        return sum(v) / len(v) if v else None
    bl_ = {nm: bersih_lain(*W[nm]) for nm in W}
    A['lain.bersih.seb.luas'] = round((bl_['seb'] / bl_['pra'] - 1) * 100)
    A['lain.bersih.ses.luas'] = round((bl_['ses'] / bl_['seb'] - 1) * 100)
    # laju tanpa hari celah: rata-rata harian dari hari yang bersih saja
    def bersih(k, a, b):
        v = [ser[k][I(h)] for h in H[I(a):I(b) + 1] if h not in kena]
        return sum(v) / len(v) if v else None
    for nm, (a, b) in W.items():
        A[f'bersih.n.{nm}'] = len([h for h in H[I(a):I(b) + 1] if h not in kena])
    for k in ('luas', 'hot'):
        r = {nm: bersih(k, *W[nm]) for nm in W}
        A[f'bersih.seb.{k}'] = round((r['seb'] / r['pra'] - 1) * 100) if r['pra'] and r['seb'] else None
        A[f'bersih.ses.{k}'] = round((r['ses'] / r['seb'] - 1) * 100) if r['seb'] and r['ses'] else None

    def ukur(a, b):
        hs = H[I(a):I(b) + 1]
        rb = [(ser['belum'][I(h)], ser['belum'][I(h) - 1]) for h in hs if ser['belum'][I(h) - 1] >= 20]   # hari kemarin di bawah 20 ha tidak bermakna
        rp = [(ser['padam'][I(h)], ser['luas'][I(h) - 2]) for h in hs]
        r = {'rb.n': len(rb), 'rb.median': round(st.median(x / y for x, y in rb) * 100) if rb else None,
             'rb.biasa': round(st.mean(x / y for x, y in rb) * 100) if rb else None,
             'rp.bobot': round(sum(x for x, _ in rp) / sum(y for _, y in rp) * 100) if sum(y for _, y in rp) else None,
             'bl': round(jml('belum', a, b) / jml('luas', a, b) * 100) if jml('luas', a, b) else None}
        return r
    for nm in ('seb', 'ses'):
        for k, v in ukur(*W[nm]).items():
            A[f'{k}.{nm}'] = v
    # grafik ringkas tiga periode, label bertanggal
    tulis(out, 'periode.csv', ['periode', 'Luas terbakar per hari'],
          [[rentang(*W['pra']), A['pra.luas.hari']], [f'{rentang(*W["seb"])}, sebelum', A['seb.luas.hari']],
           [f'{rentang(*W["ses"])}, sesudah', A['ses.luas.hari']]])
    tulis(out, 'periode_tabel.csv', ['periode', 'luas', 'belum', 'hot'],
          [[n, A[f'{k}.luas.hari'], A[f'{k}.belum.hari'], A[f'{k}.hot.hari']]
           for n, k in (('Lebih awal', 'pra'), ('Sebelum', 'seb'), ('Sesudah', 'ses'))])
    i0 = I('2026-10-01')
    tulis(out, 'harian.csv', ['hari', 'Luas terbakar', 'Belum padam'], [[tgl(h), ser['luas'][I(h)], ser['belum'][I(h)]] for h in H[i0:]])
    A['zona_dari'] = tgl(hari(1))
    A['zona_sampai'] = tgl(hari(10))
    ip = max(range(I(W['seb'][0]), I(W['ses'][1]) + 1), key=lambda i: ser['luas'][i])
    A['puncak.hari'] = H[ip]
    A['puncak.sebelum'] = H[ip] < c['kunjungan']
    A['akhir7.luas'] = round(sum(ser['luas'][-7:]) / 7)
    A['akhir7.porsi'] = round(A['akhir7.luas'] / A['seb.luas.hari'] * 100) if A['seb.luas.hari'] else None
    A['zona_kunjungan'] = tgl(D)
    tulis(out, 'rasio_harian.csv', ['hari', 'Belum padam dibanding kemarin'],
          [[tgl(h), round(ser['belum'][I(h)] / ser['belum'][I(h) - 1] * 100)] for h in H[I(W['seb'][0]):I(W['ses'][1]) + 1]
           if ser['belum'][I(h) - 1] > 0])
    # per kabupaten
    kk = json.loads((SB / 'peta_karhutla_kab.json').read_text(encoding='utf-8'))
    HK = kk['hari']
    a0, a1, b0, b1 = (HK.index(x) for x in (W['seb'][0], W['seb'][1], W['ses'][0], W['ses'][1]))
    kab = []
    for key, v in kk['kab'].items():
        if key.split('|')[0] not in c['prov']:
            continue
        d_ = {r[0]: r for r in v['d']}
        s = sum(d_[i][1] for i in range(a0, a1 + 1) if i in d_)
        t = sum(d_[i][1] for i in range(b0, b1 + 1) if i in d_)
        kab.append([v['nama'], s, t, round((t / s - 1) * 100, 1) if s else None])
    kab.sort(key=lambda r: -(r[1] + r[2]))
    kab_t = [r for r in kab if r[1] or r[2]][:12]
    if c['kab'] not in [r[0] for r in kab_t]:
        kab_t = kab_t[:11] + [r for r in kab if r[0] == c['kab']]
    tulis(out, 'kab.csv', ['kab', 'sebelum', 'sesudah', 'ubah'], kab_t)
    tulis(out, 'kab_seb.csv', ['kab', 'luas'], [[r[0], r[1]] for r in kab])
    tulis(out, 'kab_ses.csv', ['kab', 'luas'], [[r[0], r[2]] for r in kab])
    fk = next((r for r in kab if r[0] == c['kab']), None)
    tot_s, tot_t = sum(r[1] for r in kab), sum(r[2] for r in kab)
    A['kab.fokus'] = c['kab']
    A['kab.seb'], A['kab.ses'] = (fk[1], fk[2]) if fk else (0, 0)
    A['kab.ubah'] = round((fk[2] / fk[1] - 1) * 100) if fk and fk[1] else None
    A['kab.porsi.seb'] = round(fk[1] / tot_s * 100) if fk and tot_s else None
    A['kab.top.seb'] = max(kab, key=lambda r: r[1])[0]
    berapi = [r for r in kab if r[1] >= 10]
    A['kab.n.berapi'] = len(berapi)
    A['kab.n.turun'] = sum(r[2] < r[1] for r in berapi)
    A['kab.top.ses'] = max(kab, key=lambda r: r[2])[0]
    A['kab.top.ses.porsi'] = round(max(r[2] for r in kab) / tot_t * 100) if tot_t else None
    maks = max(max(r[1] for r in kab), max(r[2] for r in kab))
    A['ambang'] = ambang(maks)
    # tabel ukuran apple to apple
    rows = [
        ['Luas terbakar, rata-rata per hari (ha)', A['seb.luas.hari'], A['ses.luas.hari'], arti_level(A['seb.luas.hari'], A['ses.luas.hari'])],
        ['Perubahan luas per sepuluh hari (%)', A['laju.seb.luas'], A['laju.ses.luas'], arti_laju(A['laju.seb.luas'], A['laju.ses.luas'])],
        ['Perubahan belum padam per sepuluh hari (%)', A['laju.seb.belum'], A['laju.ses.belum'], arti_laju(A['laju.seb.belum'], A['laju.ses.belum'])],
        ['Perubahan hotspot per sepuluh hari (%)', A['laju.seb.hot'], A['laju.ses.hot'], arti_laju(A['laju.seb.hot'], A['laju.ses.hot'])],
        ['Pembanding: perubahan luas provinsi yang tidak dikunjungi (%)', A['lain.seb.luas'], A['lain.ses.luas'], arti_laju(A['lain.seb.luas'], A['lain.ses.luas'])],
        ['Pembanding tanpa hari celah satelit (%)', A['lain.bersih.seb.luas'], A['lain.bersih.ses.luas'], arti_laju(A['lain.bersih.seb.luas'], A['lain.bersih.ses.luas'])],
        ['Perubahan luas, tanpa hari celah satelit (%)', A['bersih.seb.luas'], A['bersih.ses.luas'], arti_laju(A['bersih.seb.luas'], A['bersih.ses.luas'])],
        ['Belum padam dibanding kemarin, nilai tengah (%)', A['rb.median.seb'], A['rb.median.ses'], arti_rasio(A['rb.median.seb'], A['rb.median.ses'], True)],
        ['Belum padam dibanding kemarin, rata-rata biasa (%)', A['rb.biasa.seb'], A['rb.biasa.ses'], 'Terdistorsi hari lonjakan'],
        ['Luas yang padam dalam dua hari, berbobot (%)', A['rp.bobot.seb'], A['rp.bobot.ses'], arti_rasio(A['rp.bobot.seb'], A['rp.bobot.ses'], False)],
        ['Belum padam dibanding luas terbakar (%)', A['bl.seb'], A['bl.ses'], arti_rasio(A['bl.seb'], A['bl.ses'], True)],
    ]
    tulis(out, 'ukuran.csv', ['ukuran', 'sebelum', 'sesudah', 'arti'], rows)
    A['vonis'] = {r[0]: r[3] for r in rows}
    return A


def ambang(maks):
    """Empat ambang kelas peta dari nilai kabupaten terbesar (angka bulat yang mudah dibaca)."""
    for a in ([10, 50, 200, 1000], [50, 200, 1000, 5000], [100, 1000, 5000, 20000], [500, 5000, 20000, 60000]):
        if maks < a[3] * 3:
            return a
    return [1000, 10000, 40000, 100000]


def arti_level(s, t):
    return 'Lebih kecil, belum setara' if t < s else 'Lebih besar'


def arti_laju(s, t):
    if s is None or t is None:
        return 'Tidak dapat dihitung'
    if t < 0 and s < 0:
        return 'Penurunan melambat' if t > s + 5 else ('Penurunan makin cepat' if t < s - 5 else 'Laju turun setara')
    if s >= 0 and t < 0:
        return 'Berbalik turun'
    if s < 0 and t >= 0:
        return 'Berbalik naik'
    return 'Naik melambat' if t < s else 'Naik makin cepat'


def arti_rasio(s, t, kecil_baik):
    if s is None or t is None:
        return 'Tidak dapat dihitung'
    if abs(t - s) <= 5:
        return 'Setara'
    baik = (t < s) if kecil_baik else (t > s)
    return 'Membaik' if baik else 'Memburuk'


if __name__ == '__main__':
    for k in (sys.argv[1:] or list(WILAYAH)):
        A = bangun(k)
        print(k, {x: A[x] for x in A if x.startswith(('laju', 'bersih', 'rb.', 'rp.', 'bl.', 'seb.luas', 'ses.luas', 'kab.', 'celah', 'jendela'))})
