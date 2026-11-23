#!/usr/bin/env python3
"""Paparan kebencanaan satu provinsi, fokus banjir (pola deck Bali dan NTT), 16 Nov 2026: Aceh dan Sumatera Utara.
Jalankan dengan venv mesin (python-pptx untuk menyiapkan slide impor):
  ../../.venv/bin/python spek/bangun_spek_banjir_prov.py
  deck.py spek/banjir-aceh.json ...; deck.py spek/banjir-sumut.json ...
Slide situasi banjir diimpor dari generator data/laporan-bnpb/generator/situasi_banjir.py --lengkap (salinan di data/sumut-aceh/impor)."""
import collections as C, csv, json, re
from pathlib import Path
AKAR = Path(__file__).resolve().parents[1]
D = AKAR / 'data/sumut-aceh'; HID = AKAR / 'data/skenario-hidromet'
ANGKA = {}
P_D, P_R = 'bnpb-dibi-2026-11-01', 'usgs-risiko-gempa-2026'
TGL = '2026-11-23'   # tanggal data terbaru (pemilik 22 Nov 2026: "pake data terbaru yg dimiliki sampai skrg")
P_K, P_G = f'sistem-karhutla-{TGL}', f'magma-{TGL}'
S_D = 'DIBI BNPB, Nov 2026'; S_K = 'NASA FIRMS, diolah BNPB, 23 Nov 2026'; S_G = 'MAGMA Indonesia, PVMBG, 21 Nov 2026'; S_U = 'USGS, diolah BNPB, 2025'
ALIAS = {'Kota Tanjungbalai': 'Kota Tanjung Balai', 'Kota Padangsidimpuan': 'Kota Padang Sidempuan'}   # ejaan DIBI ke ejaan geo
bersih = lambda n: ALIAS.get(n.replace('Kab. ', ''), n.replace('Kab. ', ''))
i0 = lambda v: int(round(v))
def a(k, nilai, satuan, pustaka, sumber, kk='resmi', catatan=None):
    ANGKA[k] = {'nilai': nilai, 'satuan': satuan, 'pustaka': pustaka, 'sumber': sumber, 'keyakinan': kk}
    if catatan: ANGKA[k]['catatan'] = catatan
def t(k, o=''): return '{{angka:%s%s}}' % (k, o)
def tulis(n, kol, bar):
    with open(D / n, 'w', newline='', encoding='utf-8') as f:
        w = csv.writer(f); w.writerow(kol); w.writerows(bar)
KB = {'nama': 'kab', 'kepala': 'Kabupaten'}
def F(n, kp, **kw): return {'nama': n, 'kepala': kp, 'fmt': '0', **kw}


def bersihkan_impor():
    """Salinan deck Situasi Banjir disiapkan untuk impor: pita tab 01..05 generator dibuang (deck ini punya penanda bagian
    sendiri), gaya bawaan <p:style> (schemeClr) dibuang, dan hex grafik di luar palet tema diganti warna palet terdekat (D-9)."""
    from pptx import Presentation
    w_ = dict(json.load(open(AKAR / 'tema.json', encoding='utf-8'))['warna']); w_.pop('terlarang', None)
    pal = sorted({h[1:].upper() for h in re.findall(r'#[0-9A-Fa-f]{6}', json.dumps(w_))})
    def dekat(hx):
        r, g, b = (int(hx[i:i + 2], 16) for i in (0, 2, 4))
        return min(pal, key=lambda p_: 2 * (r - int(p_[0:2], 16)) ** 2 + 4 * (g - int(p_[2:4], 16)) ** 2 + 3 * (b - int(p_[4:6], 16)) ** 2)
    for f in (D / 'impor').glob('*.pptx'):
        P = Presentation(str(f))
        for sl in P.slides:
            judul_y = min(sh.top for sh in sl.shapes if sh.has_text_frame and sh.text_frame.text.strip() and sh.top > 250000)
            for sh in list(sl.shapes):
                if sh.top is not None and sh.top < judul_y - 50000:
                    sh._element.getparent().remove(sh._element)
            for st in sl.shapes._spTree.findall('.//{http://schemas.openxmlformats.org/presentationml/2006/main}style'):
                st.getparent().remove(st)
            for gf in sl.shapes:
                if gf.has_chart:
                    for el in gf.chart._chartSpace.iter('{http://schemas.openxmlformats.org/drawingml/2006/main}srgbClr'):
                        if el.get('val', '').upper() not in pal:
                            el.set('val', dekat(el.get('val').upper()))
        P.save(str(f))


def sumber_impor(f, n):
    from pptx import Presentation
    t_ = [sh.text_frame.text for sh in Presentation(str(D / 'impor' / f'{f}.pptx')).slides[n - 1].shapes if sh.has_text_frame and sh.text_frame.text.startswith('Sumber')]
    return t_[0].replace('Sumber: ', '') if t_ else None


R_ = list(csv.DictReader(open(HID / 'dibi_kab.csv', encoding='utf-8')))
G_ = list(csv.DictReader(open(HID / 'dibi_geologi_kab_tahun.csv', encoding='utf-8')))
T_ = list(csv.DictReader(open(HID / 'dibi_kab_tahun.csv', encoding='utf-8')))
RG = json.load(open(D / 'risiko.json', encoding='utf-8'))['kab']
PV = json.load(open(D / 'peta_karhutla.json', encoding='utf-8')); URUT_K = sorted(PV['prov'], key=lambda p: -sum(PV['prov'][p]['luas']))
PK = json.load(open(D / 'peta_karhutla_kab.json', encoding='utf-8')); WL = json.load(open(D / 'peta_karhutla_wil.json', encoding='utf-8'))['d']
GA = json.load(open(D / 'gunungapi_status.json', encoding='utf-8'))['gunung']
BJ = ('banjir', 'banjir_bandang', 'banjir_longsor', 'longsor')


def deck(kode, nama, s, impor, kota, foto):
    """s: awalan token (wb.ac / wb.su); impor: nama berkas di data/sumut-aceh/impor."""
    sub = D / s.split('.')[1]; sub.mkdir(exist_ok=True)
    dd = f'data/sumut-aceh/{s.split(".")[1]}'
    def c(n, kol, sumber=S_D, **kw): return {'csv': f'{dd}/{n}', 'kolom': kol, 'keyakinan': 'resmi', 'sumber': sumber, **kw}
    def tl(n, kol, bar):
        with open(sub / n, 'w', newline='', encoding='utf-8') as f:
            w = csv.writer(f); w.writerow(kol); w.writerows(bar)
    K = C.defaultdict(lambda: C.defaultdict(float))
    for r in R_:
        if r['prov'] == kode:
            x = K[bersih(r['nama'])]
            if r['jenis'] in BJ: x['bj_m'] += float(r['meninggal']) + float(r['hilang'])
    for r in G_:
        if r['prov'] == kode and r['jenis'] in ('gempa', 'gempa_tsunami', 'tsunami'):
            x = K[bersih(r['nama'])]; x['gp_k'] += float(r['kejadian']); x['gp_m'] += float(r['meninggal']) + float(r['hilang'])
        if r['prov'] == kode and r['jenis'] == 'gunungapi':
            K[bersih(r['nama'])]['ga_u'] += float(r['mengungsi'])

    # halaman 1: banjir dan longsor 2025
    Y = C.defaultdict(lambda: [0.0, 0.0, 0.0])
    for r in T_:
        if r['prov'] == kode and r['jenis'] in BJ and r['tahun'] == '2025':
            y = Y[bersih(r['nama'])]; y[0] += float(r['meninggal']) + float(r['hilang']); y[1] += float(r['mengungsi']); y[2] += float(r['rumah_rusak'])
    uy = sorted(Y, key=lambda k: (-Y[k][0], -Y[k][1])); top, sisa = uy[:11], uy[11:]
    tl('banjir25.csv', ['kab', 'korban', 'mengungsi', 'rumah'], [[k, i0(Y[k][0]), i0(Y[k][1]), i0(Y[k][2])] for k in top] + ([[f'Lainnya ({len(sisa)} kabupaten dan kota)', i0(sum(Y[k][0] for k in sisa)), i0(sum(Y[k][1] for k in sisa)), i0(sum(Y[k][2] for k in sisa))]] if sisa else []))
    m25 = sum(v[0] for v in Y.values())
    lalu = sum(float(r['meninggal']) + float(r['hilang']) for r in T_ if r['prov'] == kode and r['jenis'] in BJ and '2008' <= r['tahun'] <= '2024')
    a(f'{s}.25.m', i0(m25), 'jiwa', P_D, S_D); a(f'{s}.25.u', i0(sum(v[1] for v in Y.values())), 'jiwa', P_D, S_D)
    a(f'{s}.25.r', i0(sum(v[2] for v in Y.values())), 'rumah', P_D, S_D); a(f'{s}.25.kab', sum(1 for v in Y.values() if v[0] >= .5), 'kabupaten dan kota', P_D, S_D)
    a(f'{s}.25.top', i0(Y[uy[0]][0]), 'jiwa', P_D, S_D, catatan=uy[0]); a(f'{s}.25.topu', i0(max(v[1] for v in Y.values())), 'jiwa', P_D, S_D)
    a(f'{s}.25.kali', round(m25 / (lalu / 17)), 'kali', P_D, S_D, 'estimasi-model', 'korban 2025 dibanding rerata tahunan 2008 sampai 2024')
    a(f'{s}.25.lalu', i0(lalu / 17), 'jiwa per tahun', P_D, S_D, 'resmi', 'rerata korban banjir dan longsor 2008 sampai 2024')
    utu = max(Y, key=lambda k: Y[k][1]); utr = max(Y, key=lambda k: Y[k][2])
    a(f'{s}.25.topr', i0(Y[utr][2]), 'rumah', P_D, S_D, catatan=utr)
    H1 = {'jenis': 'tabel-peringkat', 'jenis_slide': 'tabel', 'judul_bentuk': 'deskriptif', 'judul_ikon': 'banjir', 'rasio': .62, 'cut_off': False, 'pesan': 'Banjir dan longsor 2025', 'sumber': S_D,
          'ulang_angka_boleh': 'sorotan mengutip puncak tabel rincian di sebelahnya',
          'judul': f'Banjir dan Longsor 2025: {t(f"{s}.25.m", "|satuan")} Meninggal dan Hilang di {t(f"{s}.25.kab", "|satuan")} {nama}',
          'tabel': {'judul_panel': 'Dampak per kabupaten dan kota, 2025, urut korban', 'ikon': 'banjir', 'baris_maks_pt': 34, 'total': True, 'peringkat': False,
                    'data': c('banjir25.csv', [{'nama': 'kab', 'kepala': 'Kabupaten', 'bobot': 1.6}, F('korban', 'Meninggal dan hilang'), F('mengungsi', 'Mengungsi'), F('rumah', 'Rumah rusak')])},
          'panel': {'judul': 'Sorotan dampak', 'ikon': 'ringkasan', 'daftar_ikon': {'mode': 'baris', 'baris': [
              {'ikon': 'jiwa', 'judul': uy[0], 'isi': 'Korban terbanyak', 'angka': t(f'{s}.25.top'), 'satuan': 'jiwa'},
              {'ikon': 'pengungsi', 'judul': utu, 'isi': 'Pengungsi terbanyak', 'angka': t(f'{s}.25.topu'), 'satuan': 'jiwa'},
              {'ikon': 'rumah', 'judul': utr, 'isi': 'Rumah rusak terbanyak', 'angka': t(f'{s}.25.topr'), 'satuan': 'rumah'},
              {'ikon': 'pengungsi', 'judul': 'Mengungsi', 'isi': 'Seluruh provinsi', 'angka': t(f'{s}.25.u'), 'satuan': 'jiwa'},
              {'ikon': 'rumah', 'judul': 'Rumah rusak', 'isi': 'Seluruh provinsi', 'angka': t(f'{s}.25.r'), 'satuan': 'rumah'}]}}}   # rerata tahunan dihapus pemilik 22 Nov 2026

    # halaman 7: gempa dan tsunami
    rg = {bersih(k.split('|')[1]): v for k, v in RG.items() if k.split('|')[0] == kode}
    ug = sorted(rg, key=lambda k: -rg[k][0])
    tl('gempa_kab.csv', ['kab', 'skor'], [[k, rg[k][0]] for k in ug[:12]])
    tl('gempa_tabel.csv', ['kab', 'mmaks', 'n', 'korban'], [[k, rg[k][4], rg[k][5], i0(K[k]['gp_m'])] for k in ug[:12]])
    a(f'{s}.g.top', rg[ug[0]][0], 'skor', P_R, S_U, catatan=ug[0]); a(f'{s}.g.k', i0(sum(v['gp_k'] for v in K.values())), 'kejadian', P_D, S_D)
    a(f'{s}.g.m', i0(sum(v['gp_m'] for v in K.values())), 'jiwa', P_D, S_D); a(f'{s}.g.mmaks', max(rg[k][4] for k in rg), 'M', P_R, S_U)
    kg = max(K, key=lambda k: K[k]['gp_m']); a(f'{s}.g.km', i0(K[kg]['gp_m']), 'jiwa', P_D, S_D, catatan=kg)
    H7 = {'jenis': 'temuan-grafik', 'jenis_slide': 'grafik', 'judul_bentuk': 'temuan', 'judul_ikon': 'gempa', 'rasio': .52, 'cut_off': False, 'pesan': 'Gempa dan tsunami', 'sumber': f'{S_U}; {S_D}',
          'judul': f'Gempa dan Tsunami: Skor risiko tertinggi {t(f"{s}.g.top")} di {ug[0]}; korban {t(f"{s}.g.m", "|satuan")} sejak 2008',
          'grafik': {'judul_panel': 'Skor risiko gempa, dua belas tertinggi', 'ikon': 'gempa', 'judul': '**Skor risiko gempa**, indeks', 'keluarga': 'netral', 'arah': 'horizontal', 'sorot': 'tertinggi', 'ubah': False, 'persen_batang': False, 'data': c('gempa_kab.csv', [KB, F('skor', 'Skor')], S_U)},
          'panel': {'judul': 'Gempa dan korban', 'ikon': 'tsunami', 'peringkat': False, 'data': c('gempa_tabel.csv', [KB, {'nama': 'mmaks', 'kepala': 'M terbesar', 'fmt': '1'}, F('n', 'Jumlah gempa'), F('korban', 'Korban')], f'{S_U}; {S_D}'), 'baris_maks_pt': 30}}

    # halaman 8: karhutla dan gunung api
    LS = {bersih(v['nama']): sum(x[1] for x in v['d']) for v in PK['kab'].values() if v['prov'] == kode}
    HS = {bersih(k.split('|')[1]): sum(arr[i + 1] for i in range(0, len(arr), 5)) for k, arr in WL.items() if k.split('|')[0] == kode and k.count('|') == 1}
    assert set(LS) <= set(K) and set(rg) <= set(K), (set(LS) - set(K), set(rg) - set(K))
    uk = sorted(LS, key=lambda k: -LS[k])
    tl('luas_kab.csv', ['kab', 'luas'], [[k, i0(LS.get(k, 0))] for k in K])
    tl('karhutla.csv', ['kab', 'hotspot', 'luas'], [[k, i0(HS.get(k, 0)), i0(LS[k])] for k in uk[:12]])
    a(f'{s}.k.luas', sum(PV['prov'][kode]['luas']), 'ha', P_K, S_K); a(f'{s}.k.rank', URUT_K.index(kode) + 1, 'nasional', P_K, S_K)
    a(f'{s}.k.hot', sum(PV['prov'][kode]['hot']), 'titik', P_K, S_K)
    ga = sorted([g for g in GA if nama in [x.strip() for x in g['prov'].split(',')]], key=lambda g: -g['level'])   # Kerinci: "Jambi, Sumatera Barat"
    a(f'{s}.ga.u', i0(sum(v['ga_u'] for v in K.values())), 'jiwa', P_D, S_D)
    LEV = {1: 'Normal', 2: 'Waspada', 3: 'Siaga', 4: 'Awas'}
    WARNA_GA = {2: 'skala.emas.3', 3: 'oranye', 4: 'merah'}   # pemilik 22 Nov 2026: "Kasih icon ya. Bagusin." ikon ikut warna status
    NAMA_GA = lambda g: g['nama'].replace('Sorikmarapi', 'Sorik Marapi').replace('Bur Ni Telong', 'Burni Telong')
    kol_ga = []
    for g in [g for g in ga if g['level'] >= 2][:3] or ga[:2]:
        if g.get('radius_km'):
            a(f'{s}.ga.{len(kol_ga)}.r', g['radius_km'], 'km', P_G, S_G)
            isi = f'{LEV[g["level"]]}, radius {t(f"{s}.ga.{len(kol_ga)}.r", "|satuan")}'
        else:
            isi = LEV[g['level']]
        kol = {'ikon': 'gunungapi', 'judul': NAMA_GA(g), 'isi': isi}
        if g['level'] in WARNA_GA:   # pil status berikon + radius berikon (pemilik 22 Nov 2026)
            kol.update(warna=WARNA_GA[g['level']], pil={'teks': LEV[g['level']], 'warna': WARNA_GA[g['level']], 'ikon': 'peringatan'})
            if g.get('radius_km'):
                kol['ket'] = {'ikon': 'wilayah', 'teks': f'Radius {t(f"{s}.ga.{len(kol_ga)}.r", "|satuan")}'}
        kol_ga.append(kol)
    nor = [NAMA_GA(g) for g in ga if g['level'] == 1]
    if nor and len(kol_ga) < 3 and len(nor) < len(ga):
        kol_ga.append({'ikon': 'gunungapi', 'judul': ' dan '.join(nor), 'isi': 'Normal', 'pil': {'teks': 'Normal', 'warna': 'tint.netral.pita', 'warna_teks': 'navy', 'ikon': 'prabencana'}})
    if ANGKA[f'{s}.ga.u']['nilai']:
        kol_ga.append({'ikon': 'pengungsi', 'judul': 'Pengungsi erupsi sejak 2008', 'isi': t(f'{s}.ga.u', '|satuan')})
    else:
        kol_ga.append({'ikon': 'pengungsi', 'judul': 'Riwayat erupsi sejak 2008', 'isi': 'Tidak ada pengungsi tercatat'})
    l2 = [g['nama'].replace('Sorikmarapi', 'Sorik Marapi') for g in ga if g['level'] >= 2]
    ga_judul = (' dan '.join(l2) + ' berstatus Waspada') if l2 else 'tidak ada gunung api di atas Normal'
    H8 = {'ulang_angka_boleh': 'label peta dan Data Karhutla berbagi kabupaten yang sama', 'jenis': 'temuan-visual', 'jenis_slide': 'peta', 'judul_bentuk': 'temuan', 'judul_ikon': 'karhutla', 'rasio': .62, 'cut_off': False, 'pesan': 'Karhutla dan gunung api', 'sumber': f'{S_K}; {S_G}; {S_D}',
          'judul': f'Karhutla dan Gunung Api: Seluas {t(f"{s}.k.luas", "|satuan")} lahan terbakar sepanjang 2026; {ga_judul}',
          'utama': {'judul': 'Perkiraan luas terbakar per kabupaten dan kota, 2026', 'ikon': 'karhutla', 'peta': {'mode': 'koroplet', 'tingkat': 'kabupaten', 'wilayah': [kode], 'ambang': [100, 300, 600, 1000], 'skala': 'api', 'satuan': 'Perkiraan luas terbakar dari citra satelit, hektare, 2026',
                    'penanda': [{'nama': NAMA_GA(g), 'lon': g['lon'], 'lat': g['lat'], 'ikon': 'gunungapi', 'warna': WARNA_GA.get(g['level'], 'navy')} for g in ga], 'label': 8, 'label_gaya': 'samping', 'label_ikon': 'karhutla', 'unsur_tampil': False, 'data': c('luas_kab.csv', [{'nama': 'kab'}, F('luas', 'Luas')], S_K)}},
          'panel': {'judul': 'Data Karhutla', 'ikon': 'karhutla', 'total': False, 'peringkat': True, 'baris_maks_pt': 30, 'data': c('karhutla.csv', [KB, F('hotspot', 'Hotspot'), F('luas', 'Luas, ha')], S_K)},
          'pita': {'label': 'Gunung api', 'kolom': kol_ga}}

    # halaman logistik: rencana distribusi bantuan logistik dan peralatan 2026 (pesan ke Kepala BNPB, pemilik 23 Nov 2026 "masukan ke paparan")
    HL = None
    if s == 'wb.sb':
        K_, B_ = (80, 90, 30, 60, 80, 30), (120, 120, 45, 80, 100, 60)
        # gaya halaman logistik deck Bali dan NTT (pemilik 23 Nov 2026): alat 2026 lalu bantuan 2025 bertanda (2025); diserahkan 23 Nov 2026
        # pemilik 23 Nov 2026 "bagusin": alat 2026 dan bantuan 2025 dua kolom terpisah, tanpa tanda (2025) dan titik koma
        LG = [('Provinsi Sumatera Barat', 'Motor Trail; 9 Tenda; 24 Lampu Solar Cell', 'Truk; 126 Lentera; 120 Terpal', (240, 240, 90, 160, 200, 120)),
              ('Kota Padang', 'Mobil Rescue', 'Mobil Pick Up', B_), ('Agam', 'Mobil Rescue', '–', B_),
              ('Solok', 'Mobil Rescue', 'Mobil Pick Up', B_), ('Lima Puluh Kota', 'Mobil Rescue', 'Mobil Pick Up', B_),
              ('Tanah Datar', 'Perahu dan Mesin Perahu', 'Mobil Rescue', B_), ('Kepulauan Mentawai', 'Perahu dan Mesin Perahu', 'Mobil Pick Up', B_),
              ('Pasaman Barat', 'Motor Trail', 'Mobil Pick Up', B_), ('Pasaman', 'Motor Trail', 'Mobil Pick Up', B_),
              ('Kota Pariaman', 'Mobil Rescue', 'Mobil Pick Up', K_), ('Pesisir Selatan', 'Mobil Rescue', 'Mobil Pick Up', K_),
              ('Kota Payakumbuh', 'Perahu dan Mesin Perahu', 'Mobil Pick Up', K_), ('Solok Selatan', 'Perahu dan Mesin Perahu', 'Mobil Tangki Air', K_),
              ('Sijunjung', 'Perahu dan Mesin Perahu', 'Mobil Pick Up', K_), ('Padang Pariaman', '4 Tenda Pengungsi; 24 Lampu Solar Cell', 'Mobil Rescue', K_),
              ('Dharmasraya', '4 Tenda Pengungsi; 24 Lampu Solar Cell', 'Mobil Pick Up', K_), ('Kota Solok', '–', 'Mobil Truk Serbaguna', K_),
              ('Kota Sawahlunto', '–', 'Mobil Pick Up', K_), ('Kota Padang Panjang', '–', 'Mobil Pick Up', K_), ('Kota Bukittinggi', '–', 'Mobil Pick Up', K_)]
        assert len(LG) == 20
        # gaya Bali (pemilik 23 Nov 2026 "balik lagi ke versi awal"): satu kolom, alat 2026 lalu bantuan 2025 bertanda (2025)
        gab = lambda al, ll: '; '.join([x for x in al.split('; ') if al != '–'] + [f'{x} (2025)' for x in ll.split('; ') if ll != '–']) or '–'
        tl('logistik.csv', ['kab', 'alat', 'selimut', 'matras', 'kasur', 'terpal', 'makanan', 'family'], [[n, gab(al, ll), *v] for n, al, ll, v in LG])
        S_L = 'Direktorat Logistik BNPB, 23 Nov 2026'
        P_L = 'bnpb-logpal-sumbar-2026'
        a(f'{s}.lg.n', len(LG), 'BPBD', P_L, S_L)
        HL = {'jenis': 'tabel-peringkat', 'jenis_slide': 'matriks', 'judul_bentuk': 'temuan', 'rasio': .99, 'cut_off': False, 'pesan': 'Bantuan logistik', 'sumber': S_L,
              'judul': f'Bantuan Peralatan dan Logistik 2026 Diserahkan 23 November 2026 kepada {t(f"{s}.lg.n", "|satuan")} di {nama}',
              'tabel': {'judul_panel': 'Bantuan per BPBD', 'ikon': 'tanggap-darurat', 'peringkat': False, 'sel_dua_baris': True, 'baris_maks_pt': 40, 'total': True,   # kepala cukup ini (pemilik 23 Nov 2026)
                        'data': c('logistik.csv', [{'nama': 'kab', 'kepala': 'BPBD', 'bobot': 1.3}, {'nama': 'alat', 'kepala': 'Kendaraan dan peralatan', 'rata': 'l', 'bobot': 5.2,
                                                    'pil_daftar': {'gaya': ['tint.basah.pita', None, 'navy'], 'gaya_lama': ['tint.netral.muda', 'garis', 'teks-3'], 'lama': '(2025)',
                                                                   'ikon': {'rescue': 'tanggap-darurat', 'perahu': 'banjir', 'trail': 'wilayah', 'tenda': 'pengungsi', 'lampu': 'prabencana',
                                                                            'lentera': 'prabencana', 'terpal': 'rumah', 'pick up': 'infrastruktur', 'truk': 'infrastruktur', 'tangki': 'air-baku'}}},
                                                   F('selimut', 'Selimut'), F('matras', 'Matras'), F('kasur', 'Kasur Lipat'), F('terpal', 'Terpal'), F('makanan', 'Makanan'), F('family', 'Family Kit')], S_L)}}

    IMP = lambda n: {'jenis': 'impor', 'pptx': f'data/sumut-aceh/impor/{impor}.pptx', 'halaman': n, 'sumber': sumber_impor(impor, n)}
    SUB = 'Fokus Banjir'
    SAMPUL = {'jenis': 'sampul', 'tanpa_tanggal': 'pemilik 22 Nov 2026: "pill jakarta 22nov hapus"', 'layout': 'putih', 'judul_penuh': True, 'skala_subjudul': 0.9, 'foto': foto, 'kota': kota, 'tanpa_kepada': True, 'tanpa_subjudul': True, 'judul_turun': 28, 'subjudul': SUB,
              'penyaji': {'nama': 'Letnan Jenderal TNI Kristomei Sianturi, S.Sos., M.Si. (Han)', 'jabatan': 'Kepala Badan Nasional Penanggulangan Bencana'}}
    SEK = lambda n: {'jenis': 'pembatas-seksi', 'bagian': n}
    BAG = [{'judul': 'Banjir 2025', 'label': 'Banjir 2025'}, {'judul': 'Situasi Banjir Terkini', 'label': 'Situasi banjir terkini'}, {'judul': 'Bencana Lain', 'label': 'Bencana lain'}]
    if HL: BAG.append({'judul': 'Dukungan Logistik', 'label': 'Dukungan logistik'})
    return {'_catatan': f'Paparan {nama}, fokus banjir. Dibangun dari spek/bangun_spek_banjir_prov.py.',
            'pesan_kunci': f'Banjir dan longsor 2025 menelan korban terbesar di {nama}; di awal musim hujan 2026 banjir kembali melanda dan kecamatan berstatus banjir perlu disiapkan.',
            'judul_dokumen': f'Paparan Kebencanaan {nama}', 'subjek_dokumen': SUB, 'kajian': f'banjir-{s.split(".")[1]}', 'format': 'kajian',
            'tanpa_alur': 'pemilik 9 Nov 2026 menghapus halaman ringkasan', 'judul_sampul_maks_baris': 2, 'bagian': BAG, 'tanggal': TGL, 'cut_off': '23 Nov 2026',
            'slide': [SAMPUL, {'jenis': 'daftar-isi'}, SEK(1), H1, SEK(2), IMP(1), IMP(2), IMP(3), IMP(4), SEK(3), H7, H8, *([SEK(4), HL] if HL else []),
                      {'jenis': 'penutup', 'foto': foto, 'teks': 'Terima Kasih', 'laporan': SUB}]}


PUS = [{'id': P_R, 'type': 'dataset', 'author': [{'literal': 'sistem BNPB, olahan katalog USGS'}], 'issued': {'date-parts': [[2026, 10, 28]]}, 'title': 'Indeks risiko gempa per kabupaten', 'URL': 'https://centurisk97.id/gempa/data/risiko.json', 'verifikasi': 'primer'},
       {'id': P_K, 'type': 'dataset', 'author': [{'literal': 'sistem BNPB, olahan NASA FIRMS'}], 'issued': {'date-parts': [[2026, 11, 16]]}, 'title': 'Hotspot dan luas terbakar per kabupaten 2026', 'URL': 'https://centurisk97.id/data/peta_karhutla_kab.json', 'verifikasi': 'primer'},
       {'id': 'bnpb-logpal-sumbar-2026', 'type': 'report', 'author': [{'literal': 'Badan Nasional Penanggulangan Bencana', 'singkatan': 'BNPB'}], 'issued': {'date-parts': [[2026, 11, 23]]}, 'title': 'Rencana distribusi bantuan logistik dan peralatan 2026 untuk BPBD Provinsi Sumatera Barat dan 19 BPBD kabupaten/kota', 'verifikasi': 'primer'},
       {'id': P_G, 'type': 'dataset', 'author': [{'literal': 'Pusat Vulkanologi dan Mitigasi Bencana Geologi', 'singkatan': 'PVMBG'}], 'issued': {'date-parts': [[2026, 11, 16]]}, 'title': 'Tingkat aktivitas gunung api', 'URL': 'https://magma.esdm.go.id/v1/gunung-api/tingkat-aktivitas', 'verifikasi': 'primer'}]

if __name__ == '__main__':
    bersihkan_impor()
    SP = {'banjir-aceh': deck('11', 'Aceh', 'wb.ac', 'aceh', 'Jakarta', 'foto/bencana-rob.jpg'),
          'banjir-sumut': deck('12', 'Sumatera Utara', 'wb.su', 'sumut', 'Jakarta', 'foto/bencana-rob.jpg'),
          'banjir-sumbar': deck('13', 'Sumatera Barat', 'wb.sb', 'sumbar', 'Jakarta', 'foto/bencana-rob.jpg')}
    p = AKAR / 'data/angka.json'; r = json.loads(p.read_text(encoding='utf-8')); r['angka'].update(ANGKA); p.write_text(json.dumps(r, ensure_ascii=False, indent=1), encoding='utf-8')
    q = AKAR / 'pustaka.json'; u = [x for x in json.loads(q.read_text(encoding='utf-8')) if x['id'] not in {y['id'] for y in PUS}] + PUS; q.write_text(json.dumps(u, ensure_ascii=False, indent=1), encoding='utf-8')
    tm = json.loads((AKAR / 'tema.json').read_text(encoding='utf-8'))
    for k, nm in (('banjir-ac', 'Aceh'), ('banjir-su', 'Sumatera Utara'), ('banjir-sb', 'Sumatera Barat')):
        tm['kajian'][k] = {'judul': f'Paparan Kebencanaan {nm}', 'subjudul': 'Fokus Banjir', 'judul_pendek': f'Paparan {nm}', 'nama_berkas': f'Paparan Kebencanaan {nm.replace(chr(160), " ")} {{DDMMYY}}', 'batas_halaman_isi': None, 'lampiran': 'ABCDEFGHIJKL', 'kata_kunci': ['BNPB', nm.replace(chr(160), ' '), 'banjir'], 'cakupan_sampul': f'Provinsi {nm.replace(chr(160), " ")}.'}
    tm['kajian'].pop('sumut-aceh', None)
    (AKAR / 'tema.json').write_text(json.dumps(tm, ensure_ascii=False, indent=1), encoding='utf-8')
    for n, sp in SP.items():
        (AKAR / f'spek/{n}.json').write_text(json.dumps(sp, ensure_ascii=False, indent=2), encoding='utf-8')
    print(len(ANGKA), 'angka;', {k: v['nilai'] for k, v in ANGKA.items()})
