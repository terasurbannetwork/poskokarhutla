"""Mesin "Laporan Penanganan <bencana> DDMMYY" untuk bencana selain karhutla dan banjir (PB-58, F-11 paritas bencana): gempa dan kekeringan.

Tata letak, templat, dan pemeriksa sama dengan deck banjir (penanganan_banjir.py): slide peta (provinsi + kotak nasional + 10 teratas) dan slide
tabel 6 provinsi x 4 kelompok x D-2, D-1, D. Yang khas per bencana ada di PROFIL penanganan/kisi.py (env BENCANA). Angka hanya dari laporan
harian yang TAYANG (laporan.json bencana itu, sumber yang sama dengan layar dan laporan harian), tidak ada angka tambahan:
  gempa       public/gempa/data/laporan.json        M 4+, M 5+, dirasakan (kejadian), M terbesar
  kekeringan  /data/kekeringan_laporan.json         penduduk di HTH 31+ hari (ribu jiwa), HTH terpanjang (hari), kabupaten HTH 31+, hujan rerata
Pil kiri dan kanan tabel (bekas pil PM2,5 dan cuaca templat) dihitung dari laporan yang sama: gempa = M terbesar dan jumlah gempa M 4+ dalam
7 hari; kekeringan = kelas HTH BMKG (scripts/kekeringan/hth.py: 1-5 sangat pendek ... > 60 ekstrem) dan hujan 7 hari.
Hasil lewat mesin deck (lewat_deck.bingkai, format penanganan), PDF (pdf.ke_pdf), lalu folder revisi (lewat_deck.serah_revisi, AGENTS.md 3.6).

    python penanganan_gempa.py [--tanggal 2026-11-15] [--out DIR] [--laporan BERKAS_ATAU_URL]
    python penanganan_gempa.py uji
Bawaan tanggal = hari lengkap terakhir di laporan (hari_lengkap). Bawaan DIR = data/laporan-bnpb/penanganan-<jenis>/<YYYY-MM>/<YYYY-MM-DD>.
Butuh python dengan Pillow (venv mesin deck), node + playwright (peta), PowerPoint atau soffice (PDF)."""
import datetime as dt, json, os, re, shutil, subprocess, sys, urllib.request, zipfile

SINI = os.path.dirname(os.path.abspath(__file__))
AKAR = os.path.abspath(os.path.join(SINI, '..', '..', '..'))
sys.path.insert(0, SINI); sys.path.insert(0, os.path.join(SINI, 'penanganan'))
GRUP = ('hot', 'fs', 'luas', 'belum')
BULAN = ('Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember')
KELAS_HTH = ((60, 'EKSTREM'), (30, 'SGT PANJANG'), (20, 'PANJANG'), (10, 'MENENGAH'), (5, 'PENDEK'), (0, 'SGT PENDEK'))   # hth.py: batas bawah eksklusif; SGT seperti pil templat (SGT TDK SEHAT) supaya muat tanpa huruf di bawah 6 pt


def koma(v, d=1): return f'{v:.{d}f}'.replace('.', ',')


def kelas_hth(h):
    """Kelas HTH BMKG (scripts/kekeringan/hth.py NAMA_KELAS): 1-5 sangat pendek, 6-10 pendek, 11-20 menengah, 21-30 panjang, 31-60 sangat panjang,
    > 60 ekstrem. 0 atau None = masih hujan (bukan kelas BMKG)."""
    if not h: return None
    return next(n for b, n in KELAS_HTH if h > b)


def tujuh(seri, i):
    """Nilai 7 hari terakhir s.d. indeks i (D), tanpa None."""
    return [v for v in seri[max(0, i - 6):i + 1] if v is not None]


def pil_gempa(o, i):
    """(kiri, kanan) = ((jenis pustaka, teks, ikon), ...). Kiri: M terbesar 7 hari, warna dari M (6+ merah tua, 5+ oranye, lainnya abu).
    Kanan: jumlah gempa M 4+ 7 hari (pil biru)."""
    m = tujuh(o['mmaks'], i); n = sum(tujuh(o['kejadian'], i))
    mx = max(m) if m else None
    kiri = (('berbahaya', 'rIdP1') if mx >= 6 else ('tidak sehat', 'rIdP1') if mx >= 5 else ('rendah', 'rIdP2')) if mx else ('rendah', 'rIdP2')
    return (kiri[0], f'M {koma(mx)}' if mx else 'TANPA M 4+', kiri[1]), ('hujan', f'{n} GEMPA', 'rIdP3')


def pil_kekeringan(o, i):
    """Kiri: kelas HTH BMKG dari HTH terpanjang hari D (ekstrem merah tua, sangat panjang oranye, lainnya abu). Kanan: hujan rerata 7 hari
    dijumlah (mm); 1 mm atau lebih = pil hujan, kurang = tidak hujan (ikon templat)."""
    k = kelas_hth(o['hth_maks'][i])
    kiri = ('berbahaya', 'rIdP1') if k == 'EKSTREM' else ('tidak sehat', 'rIdP1') if k == 'SGT PANJANG' else ('rendah', 'rIdP2')
    h = sum(tujuh(o['hujan'], i))
    kanan = ('hujan', f'HUJAN {koma(h) if h < 10 else round(h)} MM', None) if h >= 1 else ('cerah', 'TIDAK HUJAN', None)
    return (kiri[0], k or 'MASIH HUJAN', kiri[1]), kanan


JENIS = {
    'gempa': dict(nama='Gempa Bumi', berkas='Laporan Penanganan Gempa Bumi', url='https://centurisk97.id/gempa/data/laporan.json',
                  kunci={'hot': 'kejadian', 'fs': 'm5', 'luas': 'dirasakan', 'belum': 'mmaks'}, bagi={}, pil=pil_gempa,
                  legenda=('M 6 atau lebih (7 hari)', 'M 5 sampai 5,9 (7 hari)', 'gempa M 4+ 7 hari s.d. {tgl}'),
                  sumber='Katalog gempa BMKG dan USGS, laporan harian gempa Centurisk97 {tgl}'),
    'kekeringan': dict(nama='Kekeringan', berkas='Laporan Penanganan Kekeringan', url='https://centurisk97.id/data/kekeringan_laporan.json',
                       kunci={'hot': 'jiwa31', 'fs': 'hth_maks', 'luas': 'kab31', 'belum': 'hujan'}, bagi={'hot': 1000}, pil=pil_kekeringan,
                       legenda=('HTH lebih dari 60 hari', 'HTH 31 sampai 60 hari', 'hujan 7 hari s.d. {tgl}'),
                       sumber='Hujan harian Open-Meteo, hitungan HTH Centurisk97 (bukan peta BMKG), {tgl}'),
}


def tarik(sumber):
    if not re.match(r'https?://', sumber):
        return json.load(open(sumber, encoding='utf-8'))
    with urllib.request.urlopen(urllib.request.Request(sumber, headers={'User-Agent': 'penanganan-jenis'}), timeout=60) as r:
        return json.load(r)


def angka(J, L, D):
    """-> (i, prov) dengan prov[kode][grup] = 4 nilai D-3..D (urut kelompok utama lalu kedua, turun), atau sys.exit bila hari tak ada."""
    if D.isoformat() not in L['hari']:
        sys.exit(f'{D} tidak ada di laporan (hari {L["hari"][0]} s.d. {L["hari"][-1]}, dibuat {L["dibuat"]})')
    i = L['hari'].index(D.isoformat())
    if i < 3:
        sys.exit(f'laporan baru punya {i + 1} hari sampai {D}; tabel butuh D-3 sampai D')
    prov, tj = {}, {}
    for k, o in L['prov'].items():
        prov[k] = {g: [None if v is None else v / J['bagi'].get(g, 1) for v in o[m][i - 3:i + 1]] for g, m in J['kunci'].items()}
        tj[k] = sum(tujuh(o[J['kunci']['hot']], i))
    # urutan: kelompok utama hari D, seri dipecah jumlah 7 hari kelompok utama (gempa per hari sering 0), lalu kelompok kedua hari D.
    # ganti.py dan tambah_peta.py mengurutkan stabil menurut kelompok utama hari D, jadi urutan ini yang memecah seri di sana.
    prov = dict(sorted(prov.items(), key=lambda kv: (-(kv[1]['hot'][3] or 0), -tj[kv[0]], -(kv[1]['fs'][3] or 0))))
    return i, prov


def esc(t): return t.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')


def pasang_pil(s, J, L, i, top6, lib, bnpb, tgl):
    """Pil kiri dan kanan tiap baris tabel; ikon pil diganti ikon profil (rIdP*) bila ada; legenda bawah diganti."""
    for n, k in enumerate(top6):
        y = bnpb.T0 + n * bnpb.PB
        for x, (jenis, teks_, ikon) in zip((bnpb.X_PM, bnpb.X_CU), J['pil'](L['prov'][k], i)):
            s = bnpb.pasang(s, lib, x, y, jenis, esc(teks_))
            if ikon:
                a, b = bnpb.blok(s, x, y)
                s = s[:a] + re.sub(r'(<p:pic>.*?r:embed=")\w+', rf'\g<1>{ikon}', s[a:b], count=1, flags=re.S) + s[b:]
    l1, l2, l3 = J['legenda']
    s = bnpb.rep(s, '<a:t>PM2.5 berbahaya</a:t>', f'<a:t>{esc(l1)}</a:t>')
    s = bnpb.rep(s, '<a:t>PM2.5 tidak sehat</a:t>', f'<a:t>{esc(l2)}</a:t>')
    return bnpb.rep(s, '<a:t>prakiraan cuaca 20–22 Okt</a:t>', f'<a:t>{esc(l3.format(tgl=tgl))}</a:t>')


def bangun(jenis, D=None, out=None, sumber=None):
    os.environ['BENCANA'] = jenis   # sebelum impor kisi (lewat bnpb): profil dibaca saat impor
    from penanganan import TEMPLAT, jalankan
    import bnpb, lewat_deck, pdf
    J = JENIS[jenis]; L = tarik(sumber or J['url'])
    D = D or dt.date.fromisoformat(L.get('hari_lengkap') or L['hari'][-1])
    i, prov = angka(J, L, D); top6 = list(prov)[:6]
    hb = lambda d: f'{d.day} {BULAN[d.month - 1][:3]}'
    kerja = os.path.join(SINI, 'cache', f'penanganan-{jenis}-{D:%d%m%y}')
    shutil.rmtree(kerja, ignore_errors=True); os.makedirs(os.path.join(kerja, 'deck', 'x'))
    shutil.copy(TEMPLAT, os.path.join(kerja, 'deck', 'src.pptx'))
    zipfile.ZipFile(TEMPLAT).extractall(os.path.join(kerja, 'deck', 'x'))
    nas = {g: L['nasional'][m][i] / J['bagi'].get(g, 1) for g, m in J['kunci'].items() if L.get('nasional', {}).get(m) and L['nasional'][m][i] is not None}
    for f in ('angka.json', 'angka_nasional.json'):   # nasional = angka nasional laporan sumber, dipakai kotak slide peta (tambah_peta.py)
        json.dump({'hari': L['hari'][i - 3:i + 1], 'prov': prov, 'nasional': nas, 'metode': f'{sumber or J["url"]} dibuat {L["dibuat"]}'},
                  open(os.path.join(kerja, f), 'w', encoding='utf-8'))
    c = dt.datetime.fromisoformat(L['cutoff'])
    json.dump({'cutoff': f'{hb(c)} {c.year}, {c:%H.%M} WIB', 'kolom': [hb(D - dt.timedelta(days=j)) for j in (2, 1, 0)], 'hari': str(D.day),
               'bulan': BULAN[D.month - 1], 'bln': BULAN[D.month - 1][:3], 'tahun': str(D.year)}, open(os.path.join(kerja, 'param.json'), 'w', encoding='utf-8'))
    P, py = os.path.join(SINI, 'penanganan'), sys.executable
    jalankan('node', os.path.join(P, 'peta.mjs'), cwd=kerja)
    jalankan(py, '-X', 'utf8', '-I', '-W', 'ignore', os.path.join(P, 'ganti.py'), kerja, 't1.pptx', cwd=kerja)
    jalankan(py, '-X', 'utf8', '-I', os.path.join(P, 'tambah_peta.py'), 't1.pptx', 'peta-20okt.png', 'angka_nasional.json', cwd=kerja)
    src = lambda n: open(os.path.join(kerja, 'deck', 'x', 'ppt', 'slides', n), encoding='utf-8').read()
    lib = bnpb.pustaka(src('slide1.xml'), src('slide2.xml'))
    nama = f'{J["berkas"]} {D:%d%m%y}.pptx'
    zi = zipfile.ZipFile(os.path.join(kerja, 't1.pptx')); zo = zipfile.ZipFile(os.path.join(kerja, nama), 'w', zipfile.ZIP_DEFLATED)
    for it in zi.infolist():
        d = zi.read(it.filename)
        if it.filename == 'ppt/slides/slide1.xml': d = pasang_pil(d.decode('utf-8'), J, L, i, top6, lib, bnpb, hb(D)).encode('utf-8')
        zo.writestr(it, d)
    zo.close(); zi.close()
    print(jalankan(py, '-X', 'utf8', '-I', os.path.join(P, 'cek6.py'), nama, cwd=kerja).strip())
    z = zipfile.ZipFile(os.path.join(kerja, nama))
    for n in z.namelist():
        if re.match(r'ppt/slides/slide\d+\.xml$', n):
            t = ''.join(re.findall(r'<a:t>([^<]*)</a:t>', z.read(n).decode('utf-8')))
            assert '·' not in t and '—' not in t, f'titik tengah / em dash di {n}'
            assert not re.search(r'[Kk]arhutla|[Hh]otspot|PM2|[Bb]anjir|[Rr]ob\b', t), f'sisa teks templat lain di {n}'
            assert not re.search(r'\baman\b', t, re.I), f'kata aman di {n}'
    z.close()
    out = out or os.path.join(AKAR, 'data', 'laporan-bnpb', f'penanganan-{jenis}', f'{D:%Y-%m}', f'{D:%Y-%m-%d}')
    os.makedirs(out, exist_ok=True); akhir = os.path.join(out, nama); shutil.copy(os.path.join(kerja, nama), akhir)
    tg = lambda d: f'{d.day} {BULAN[d.month - 1][:3]} {d.year}'
    bagian = [{'judul': f'Situasi {J["nama"]}', 'label': 'Situasi', 'halaman_tetap': [1, 2]}]
    sumber_teks = J['sumber'].format(tgl=tg(D))
    susun = [{'halaman': 1, 'bagian': 1, 'sumber': sumber_teks}, {'halaman': 2, 'bagian': 1, 'sumber': sumber_teks}]
    lewat_deck.bingkai(akhir, 'penanganan', f'Laporan Penanganan {J["nama"]}', f'Cut-off data {json.load(open(os.path.join(kerja, "param.json"), encoding="utf-8"))["cutoff"]}', D,
                       pdf=False, tanpa_kepada='sama dengan Laporan Penanganan Karhutla: laporan dipresentasikan Kepala BNPB sendiri',
                       bagian=bagian, spek_tambah={'panel_sisi': 'gelap', 'skala_logo_bnpb': 1.0}, susun=susun)
    p = pdf.ke_pdf(akhir)
    ke = lewat_deck.serah_revisi(akhir, p)
    print(f'ok {ke} | {D}, cut-off {L["cutoff"]} | 6 teratas {[L["prov"][k]["nama"] for k in top6]}')
    return ke


def uji():
    """Self-check offline: kelas HTH, pil, angka per kelompok, urutan 6 teratas, profil dan ikon kisi.py ada."""
    assert [kelas_hth(h) for h in (0, None, 1, 5, 6, 10, 11, 20, 21, 30, 31, 60, 61)] == [
        None, None, 'SGT PENDEK', 'SGT PENDEK', 'PENDEK', 'PENDEK', 'MENENGAH', 'MENENGAH', 'PANJANG', 'PANJANG', 'SGT PANJANG', 'SGT PANJANG', 'EKSTREM']
    og = {'mmaks': [None] * 3 + [4.2, None, 6.3, None, 5.1, None, 4.8], 'kejadian': [1] * 10}
    assert pil_gempa(og, 9) == (('berbahaya', 'M 6,3', 'rIdP1'), ('hujan', '7 GEMPA', 'rIdP3')), pil_gempa(og, 9)
    assert pil_gempa({'mmaks': [None] * 10, 'kejadian': [0] * 10}, 9)[0] == ('rendah', 'TANPA M 4+', 'rIdP2')
    ok = {'hth_maks': [0] * 9 + [45], 'hujan': [0.1] * 10}
    assert pil_kekeringan(ok, 9) == (('tidak sehat', 'SGT PANJANG', 'rIdP1'), ('cerah', 'TIDAK HUJAN', None)), pil_kekeringan(ok, 9)
    assert pil_kekeringan({'hth_maks': [0] * 10, 'hujan': [3.5] * 10}, 9) == (('rendah', 'MASIH HUJAN', 'rIdP2'), ('hujan', 'HUJAN 24 MM', None))
    L = {'hari': [f'2026-11-{d:02d}' for d in range(1, 6)], 'dibuat': 'x',
         'prov': {'11': {'jiwa31': [0, 1000, 2000, 3000, 5000], 'hth_maks': [1, 2, 3, 4, 5], 'kab31': [0, 0, 1, 1, 1], 'hujan': [1, 1, 1, 1, None]},
                  '12': {'jiwa31': [0, 0, 0, 0, 9000], 'hth_maks': [1] * 5, 'kab31': [0] * 5, 'hujan': [0] * 5}}}
    i, prov = angka(JENIS['kekeringan'], L, dt.date(2026, 11, 5))
    assert i == 4 and list(prov) == ['12', '11'] and prov['11']['hot'] == [1.0, 2.0, 3.0, 5.0] and prov['11']['belum'][3] is None, prov
    # seri hari D dipecah jumlah 7 hari: 21 (0 hari D, 3 dalam 7 hari) di depan 22 (0 hari D, 0 dalam 7 hari)
    G = {'hari': L['hari'], 'dibuat': 'x', 'prov': {'22': {'kejadian': [0] * 5, 'm5': [0] * 5, 'dirasakan': [0] * 5, 'mmaks': [None] * 5},
                                                    '21': {'kejadian': [1, 1, 1, 0, 0], 'm5': [0] * 5, 'dirasakan': [0] * 5, 'mmaks': [4.1] * 3 + [None] * 2}}}
    assert list(angka(JENIS['gempa'], G, dt.date(2026, 11, 5))[1]) == ['21', '22']
    for j in JENIS:
        os.environ['BENCANA'] = j
        sys.modules.pop('kisi', None)
        import kisi
        assert kisi.JENIS == j and kisi.BANJIR and set(kisi.KEPALA) == set(GRUP), j
        for n in kisi.IKON_BANJIR.values():
            assert os.path.exists(os.path.join(SINI, 'penanganan', 'ikon', n + '.png')), n
        for _, d, b in kisi.PRF['sub']:
            assert '·' not in d + b
        assert all(n <= 22 for n in (len(a + b.strip()) for a, b in kisi.KEPALA.values())), kisi.KEPALA
        if j == 'gempa':   # M terbesar: 1 desimal, baris jumlah = maks, tanpa panah persen
            assert kisi.agregat('belum', [4.44, 5.06, None]) == 5.1 and kisi.teks('belum', 5.1) == '5,1' and kisi.TANPA_PANAH == {'belum'}
            assert kisi.agregat('hot', [1, 2, None]) == 3 and kisi.agregat('luas', [None, None]) is None
        else:   # HTH maks = maks, hujan = rerata 1 desimal, ribu jiwa bulat bertitik ribuan
            assert kisi.agregat('fs', [3, 7]) == 7 and kisi.agregat('belum', [1.0, 2.0]) == 1.5 and kisi.teks('belum', 12.84) == '12,8'
            assert kisi.teks('hot', 1234.6) == '1.235' and not kisi.TANPA_PANAH
    sys.modules.pop('kisi', None); os.environ.pop('BENCANA', None)
    print('penanganan_jenis: uji lulus')


def utama(jenis):
    arg = sys.argv[1:]
    if arg == ['uji']:
        return uji()
    nilai = lambda o, b=None: arg[arg.index(o) + 1] if o in arg else b
    if '-h' in arg or '--help' in arg:
        sys.exit(__doc__)
    t = nilai('--tanggal')
    bangun(jenis, dt.date.fromisoformat(t) if t else None, nilai('--out'), nilai('--laporan'))
