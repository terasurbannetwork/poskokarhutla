"""Laporan Kejadian Bencana Harian format pemilik sejak 6 Nov 2026: 2 slide (ringkasan, status siaga), tanpa karhutla, hanya Kejadian Baru 24 jam.
Versi otomatis dari data/laporan-bnpb/harian-2026-11-0*/jalan_rev4.py untuk bot WA (scripts/wa/otomatis.mjs). Pil kondisi disusun aturan
dari Kondisi Mutakhir WA, tidak lagi diketik tangan. Uji: python3 harian_ringkas.py --uji"""
import argparse, datetime as dt, json, os, re, shutil, subprocess, sys, zipfile

G = os.path.dirname(os.path.abspath(__file__))
AKAR = os.path.abspath(os.path.join(G, '..', '..', '..'))
sys.path.insert(0, G)
TANPA_KEPADA = 'pemilik 2 Nov 2026: pil Disampaikan kepada dihapus, laporan harian dipresentasikan Kepala BNPB sendiri'

# Urutan penting: yang lebih khusus dulu. ponytail: kata kunci, kalimat baru jatuh ke tanpa pil; tambah baris bila pemilik minta label lain.
ATURAN_PIL = [
    (r'berangsur surut', 'Berangsur surut', 'surut'),
    (r'surut.*pembersihan', 'Surut, pembersihan', 'tangani'),
    (r'surut', 'Sudah surut', 'selesai'),
    (r'perbaikan rumah', 'Perbaikan rumah', 'tangani'),
    (r'pohon.*dievakuasi', 'Pohon tumbang dievakuasi', 'selesai'),
    (r'kondusif', 'Sudah kondusif', 'selesai'),
    (r'penanganan oleh bpbd', 'Ditangani BPBD', 'tangani'),
    (r'(?<!belum )padam', 'Sudah padam', 'selesai'),
    (r'pencarian', 'Pencarian korban', 'tangani'),
    (r'pembersihan', 'Proses pembersihan', 'tangani'),
    (r'pendataan', 'Dalam pendataan', 'tangani'),
    (r'penanganan', 'Dalam penanganan', 'tangani'),
]


def pil_kondisi(teks):
    t = (teks or '').lower()
    return next(((label, jenis) for pola, label, jenis in ATURAN_PIL if re.search(pola, t)), None)


def uji():
    for teks, harap in [('Sedang dalam penanganan oleh BPBD Kab. Serdang Bedagai', 'Ditangani BPBD'), ('Sedang dalam penanganan', 'Dalam penanganan'),
                        ('Pohon-pohon yang tumbang telah selesai dievakuasi, sementara kerusakan', 'Pohon tumbang dievakuasi'), ('Kondisi sudah kondusif', 'Sudah kondusif'),
                        ('Air sudah surut, masih dalam proses pembersihan', 'Surut, pembersihan'), ('Air berangsur surut, TMA 5 - 10 cm', 'Berangsur surut'),
                        ('Sebagian warga melakukan perbaikan rumah secara mandiri', 'Perbaikan rumah')]:
        assert pil_kondisi(teks)[0] == harap, (teks, pil_kondisi(teks))
    assert pil_kondisi('') is None and pil_kondisi('Total distribusi air 378.000 liter') is None
    print('ok pil kondisi')


def utama():
    ap = argparse.ArgumentParser()
    ap.add_argument('--uji', action='store_true'); ap.add_argument('--tanggal'); ap.add_argument('--koordalops'); ap.add_argument('--bmkg'); ap.add_argument('--pvmbg')
    ap.add_argument('--jam'); ap.add_argument('--out', default='.')   # --jam diterima supaya pemanggil sama dengan harian.py; cut-off format ini selalu 07.00
    g = ap.parse_args()
    if g.uji:
        return uji()
    os.chdir(G)
    import harian, lewat_deck, pdf, wa_harian
    T = dt.date.fromisoformat(g.tanggal)
    tpl = os.path.join(G, 'cache', 'templat', 'harian-221026.pptx')
    if not os.path.exists(tpl):
        sys.exit(f'templat tidak ada: {tpl}')
    baca = lambda p: open(p, encoding='utf-8').read()
    wa, w, ga = wa_harian.koordalops(baca(g.koordalops)), wa_harian.bmkg(baca(g.bmkg)), wa_harian.pvmbg(baca(g.pvmbg))
    if wa['sampai'][:10] != g.tanggal:
        sys.exit(f"WA Koordalops s.d. {wa['sampai']} bukan hari laporan {g.tanggal}")
    # 6 Nov pemilik: slide tanpa karhutla; jumlah laporan dikurangi laporan karhutla. 7 Nov: hanya kejadian baru 24 jam, jumlah laporan WA tetap.
    wa['laporan'] -= sum(x['jenis'] == 'karhutla' for x in wa['kejadian'])
    wa['kejadian'] = [x for x in wa['kejadian'] if x['jenis'] != 'karhutla' and x.get('baru')]
    harian.angka_karhutla = lambda kej, web, tanggal, jam: (T, '07:00', set(), lambda k: {})   # format ini tanpa karhutla: tidak perlu hitung satelit
    out = os.path.abspath(g.out); ke = os.path.join(out, f'kerja-{T:%d%m%y}'); os.makedirs(ke, exist_ok=True)
    web = harian.ambil_web(os.path.join(ke, 'web'))
    D = harian.susun(wa, web, T, None)
    for x in D['kejadian']:
        pil = pil_kondisi(x['teks']['kondisi'])
        if pil: x['kondisi_pil'] = pil
        else: print('tanpa pil kondisi:', x['jenis'], x['lokasi'], '|', x['teks']['kondisi'][:80])
    json.dump({**D, 'kejadian': [{**x, 'perhatian': False} for x in D['kejadian']]}, open(os.path.join(ke, 'data.json'), 'w'), ensure_ascii=False, indent=1)   # 6 Nov: peta tanpa perlu perhatian
    if os.path.isdir(os.path.join(ke, 'tpl')): shutil.rmtree(os.path.join(ke, 'tpl'))
    zipfile.ZipFile(tpl).extractall(os.path.join(ke, 'tpl'))
    for js in ('harian_peta.mjs', 'harian_ikon.mjs'):
        subprocess.run(['node', os.path.join(G, js), ke], check=True, stdout=subprocess.DEVNULL)

    nama = os.path.join(out, f'Laporan Kejadian Bencana Harian {T:%d%m%y}.pptx')
    P = web['peta_karhutla.json']; H_DATA = min((T - dt.timedelta(days=1)).isoformat(), P['hari'][-1])
    HL = f"{int(H_DATA[8:])} {harian.BULAN[int(H_DATA[5:7]) - 1][:3].upper()}"
    dk = harian.Deck(ke, D, wa, w, T, None); dk.BJ = None; dk.TANPA_BARU = False; dk.V3 = dk.KRIS_ISI = True; dk.ALT_RINCI = False
    dk.CD_PIL = 880000; dk.INFO_PIL = True; dk.LAMPIRAN = True; dk.SIAGA = True; dk.GA_GAYAS = ['lingkaran']; dk.GA = ga; dk.LAMP_TAMBAH = []
    dk.lbl_kolom, dk.lbl_hot, dk.lbl_kum = f'FIRESPOT DAN SISA {HL}', 'firespot', f'TERBAKAR 1 JAN–{HL}'
    dk.bangun(tpl, nama)

    bl = lambda t: f"{t.day} {harian.BULAN[t.month - 1][:3]} {t.year}"
    mulai, sampai = (dt.datetime.strptime(wa[k], '%Y-%m-%d %H.%M') for k in ('mulai', 'sampai'))
    jam_ga = (re.search(r'(\d\d[.:]\d\d)\s*WIB', ga.get('jam') or '') or [None, '06.00'])[1].replace(':', '.')
    sk = f'Laporan Harian Dit. Koordalops BNPB, {bl(mulai)} {mulai:%H.%M} s.d. {bl(sampai)} {sampai:%H.%M} WIB; GIS BNPB, {HL.title()} {H_DATA[:4]}'
    sv = f'PVMBG Badan Geologi, {bl(T)} {jam_ga} WIB; definisi status Permen ESDM 15/2011'
    hal = dict(lewat_deck.urutan_slide(nama))   # 7 Nov: nomor halaman bergeser bila slide Pengkinian tidak ada, jadi dicari dari judulnya
    h_ring = next(i for i, t in hal.items() if t.startswith('Laporan ') or 'kejadian menonjol' in t)
    h_siaga = next(i for i, t in hal.items() if 'Status siaga bencana' in t)
    bagian = [{'judul': 'Ringkasan Situasi', 'label': 'Ringkasan', 'halaman_tetap': [1]}, {'judul': 'Status Siaga Bencana', 'label': 'Status siaga', 'halaman_tetap': [2]}]
    susun = [{'sumber': sk, 'halaman': h_ring, 'bagian': 1}, {'sumber': sv, 'halaman': h_siaga, 'bagian': 2}]
    lewat_deck.bingkai(nama, 'harian', 'Laporan Kejadian Bencana Harian', f'Periode {bl(mulai)}, {mulai:%H.%M} sampai {bl(sampai)}, {sampai:%H.%M} WIB', T, pdf=False,
                       tanpa_kepada=TANPA_KEPADA, bagian=bagian, spek_tambah={'panel_sisi': 'gelap'}, susun=susun)
    sementara = nama + '.tmp'   # 2 Nov: ejaan resmi "Kota Parepare"
    with zipfile.ZipFile(nama) as zi, zipfile.ZipFile(sementara, 'w', zipfile.ZIP_DEFLATED) as zo:
        for it in zi.infolist():
            b = zi.read(it.filename)
            zo.writestr(it, b.replace(b'Pare Pare', b'Parepare') if it.filename.endswith('.xml') else b)
    os.replace(sementara, nama)
    # 5 Nov pemilik: banjir WA ikut Pantau Banjir, sesudah deck jadi; gagal unggah tidak menghentikan laporan; WA_KERING = uji tanpa kirim
    if not os.environ.get('WA_KERING') and any(x['jenis'] == 'banjir' for x in D['kejadian']):
        subprocess.run([sys.executable, 'scripts/data/dalops_banjir.py', '--unggah'], cwd=AKAR)
    print('ok', nama, '| pdf', pdf.ke_pdf(nama), '| laporan', wa['laporan'], '| kejadian baru', len(D['kejadian']))


if __name__ == '__main__':
    utama()
