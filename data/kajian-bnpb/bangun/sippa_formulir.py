#!/usr/bin/env python3
"""Formulir kertas G3-lite (sesi gelar) dan lembar probe SIPPA untuk pilot 28 Okt sampai 1 Nov 2026 (SP-009).

Medan DIBACA SEBAGAI TEKS dari public/pipa/formulir.js (MEDAN), jadi kertas = layar = server.
Keluaran: pipa/formulir/G3-lite.pdf dan pipa/formulir/probe.pdf (A4, Roboto, kepala BNPB) lewat
bangun/kontrak/pdf.mjs (Chromium headless, pola lembar.py). Python 3.12 stdlib; PyMuPDF dipakai
hanya bila ada (pemeriksa PDF opsional).

  python3 sippa_formulir.py          bangun kedua PDF lalu periksa
  python3 sippa_formulir.py uji      self-check tanpa menulis PDF (HTML + PDF yang sudah ada)
"""
import html
import re
import subprocess
import sys
import tempfile
from pathlib import Path

BANGUN = Path(__file__).resolve().parent
KAJIAN = BANGUN.parent
REPO = KAJIAN.parent.parent
FORMULIR_JS = REPO / 'public/pipa/formulir.js'
LOGO = REPO / 'public/img/lembaga/sumber-bnpb.png'
FONT = {400: REPO / 'public/vendor/roboto/Roboto-Regular.ttf', 700: REPO / 'public/vendor/roboto/Roboto-Bold.ttf'}
KELUAR = KAJIAN / 'pipa/formulir'
SALIN_G3, SALIN_PROBE = 4, 6   # 4 lembar sesi (2 petak, 2 cadangan); probe: 2 petak x 3 tahap
TAHAP_PILOT = ['sebelum', 'sesudah', '24j']
e = html.escape


# ---------------------------------------------------------------- baca formulir.js sebagai teks
def _bagi(s):
    """Pisahkan argumen tingkat atas (hormati kurung dan tanda kutip)."""
    out, dalam, kur, kutip = [], 0, '', None
    for ch in s:
        if kutip:
            kur += ch
            if ch == kutip:
                kutip = None
        elif ch in '"\'':
            kutip = ch
            kur += ch
        elif ch in '([{':
            dalam += 1
            kur += ch
        elif ch in ')]}':
            dalam -= 1
            kur += ch
        elif ch == ',' and dalam == 0:
            out.append(kur.strip())
            kur = ''
        else:
            kur += ch
    if kur.strip():
        out.append(kur.strip())
    return out


def baca_formulir(teks=None):
    """-> (versi, kedalaman, medan{jenis: [dict]}); dict: nama,label,tipe,min,maks,pilihan,wajib,panjang,eksklusif."""
    t = FORMULIR_JS.read_text(encoding='utf-8') if teks is None else teks
    versi = int(re.search(r'FORMULIR_VERSI\s*=\s*(\d+)', t).group(1))
    kd = {}
    for k, v in re.findall(r'(biasa|lengan_dalam):\s*\[([^\]]*)\]', t):
        kd[k] = [int(x) for x in v.split(',')]
    blok = t[t.index('export const MEDAN'):t.index('export const DIISI_SERVER')]
    konst = {'ID': [16, 36]}
    ms = re.search(r'const STATUS_KIT\s*=\s*\[([^\]]*)\]', t)
    konst['STATUS_KIT'] = re.findall(r'"([^"]+)"', ms.group(1))

    def lit(x):
        x = x.strip()
        if x == 'null':
            return None
        if x in konst:
            return konst[x]
        if x.startswith('['):
            if '...' in x:
                return kd['biasa'] + kd['lengan_dalam']
            return [lit(y) for y in _bagi(x[1:-1])]
        if x.startswith('"'):
            return x[1:-1]
        return float(x) if '.' in x else int(x)

    medan, jenis = {}, None
    for baris in blok.splitlines():
        m = re.match(r'^  (log|probe|bbm|gerak): daftar\(', baris)
        if m:
            jenis = m.group(1)
            medan[jenis] = []
            continue
        m = re.match(r'^    (teks|angka|bulat|waktu|pilih|bool|medan)\((.*)\),?\s*$', baris)
        if not (m and jenis):
            continue
        fn, a = m.group(1), _bagi(m.group(2))
        nama, label = lit(a[0]), lit(a[1])
        d = dict(nama=nama, label=label, tipe=None, min=None, maks=None, pilihan=None, wajib=False, panjang=None, eksklusif=False)
        opsi = ''
        if fn in ('teks', 'angka', 'bulat'):
            d['tipe'] = {'teks': 'teks', 'angka': 'angka', 'bulat': 'bulat'}[fn]
            d['min'], d['maks'] = lit(a[2]), lit(a[3])
            opsi = a[4] if len(a) > 4 else ''
        elif fn == 'waktu':
            d['tipe'] = 'waktu'
            opsi = a[2] if len(a) > 2 else ''
        elif fn == 'pilih':
            d['tipe'], d['pilihan'] = 'pilihan', lit(a[2])
            opsi = a[3] if len(a) > 3 else ''
        elif fn == 'bool':
            d['tipe'], d['pilihan'] = 'bool', [0, 1]
            opsi = a[2] if len(a) > 2 else ''
        else:  # medan(nama, label, tipe, {maks})
            d['tipe'] = lit(a[2])
            opsi = a[3] if len(a) > 3 else ''
            mm = re.search(r'maks:\s*(\d+)', opsi)
            d['maks'] = int(mm.group(1)) if mm else None
        if re.search(r'wajib:\s*true', opsi) or opsi.startswith('ya('):
            d['wajib'] = True
        mp = re.search(r'panjang:\s*(ID|\[[^\]]*\])', opsi)
        if mp:
            d['panjang'] = lit(mp.group(1))
        d['eksklusif'] = 'minEksklusif' in opsi
        medan[jenis].append(d)
    # invarian pembaca: jumlah medan terurai = jumlah baris konstruktor mentah per jenis
    for j, daftar in medan.items():
        mentah = len(re.findall(r'^    (?:teks|angka|bulat|waktu|pilih|bool|medan)\(', _bagian(blok, j), re.M))
        assert mentah == len(daftar), f'pembaca formulir.js: {j} terurai {len(daftar)} dari {mentah} baris'
    return versi, kd, medan


def _bagian(blok, jenis):
    mulai = blok.index(f'  {jenis}: daftar(')
    sisa = blok[mulai + 5:]
    akhir = re.search(r'^  \),', sisa, re.M)
    return sisa[:akhir.start()] if akhir else sisa


# ---------------------------------------------------------------- bentuk teks
def fmt(v):
    """Angka id-ID: titik ribuan, koma desimal."""
    if isinstance(v, float) and not v.is_integer():
        s = f'{v:,.4f}'.rstrip('0').rstrip('.')
        return s.replace(',', '#').replace('.', ',').replace('#', '.')
    return f'{int(v):,}'.replace(',', '.')


def batas(d):
    t, lo, hi = d['tipe'], d['min'], d['maks']
    if d['panjang']:
        return 'panjang ' + ' atau '.join(fmt(x) for x in d['panjang']) + ' karakter'
    if t in ('teks', 'json'):
        a = []
        if lo is not None:
            a.append(f'minimal {fmt(lo)}')
        if hi is not None:
            a.append(f'maksimal {fmt(hi)}')
        return (' dan '.join(a) + ' karakter') if a else ''
    if t in ('angka', 'bulat'):
        if lo is not None and hi is not None:
            return f'{"lebih dari" if d["eksklusif"] else "dari"} {fmt(lo)} sampai {fmt(hi)}' + (', bilangan bulat' if t == 'bulat' else '')
    return ''


GAYA = '''
@font-face{font-family:Roboto;font-weight:400;src:url("file://%s")}
@font-face{font-family:Roboto;font-weight:700;src:url("file://%s")}
@page{size:A4;margin:11mm 12mm 10mm 12mm}
*{box-sizing:border-box}
body{font-family:Roboto;color:#1A1A1A;font-size:8.6pt;line-height:1.25;margin:0}
.lembar{page-break-after:always;position:relative}
.lembar:last-child{page-break-after:auto}
.kop{display:flex;align-items:center;gap:8pt;border-bottom:1.5pt solid #051C2C;padding-bottom:4pt;margin-bottom:5pt}
.kop img{height:34pt}.kop .l{flex:1}
.kop .b{font-size:8pt;color:#6B7280}.kop h1{font-size:13pt;margin:0;color:#051C2C}
.kop .v{font-size:7.5pt;color:#6B7280;text-align:right}
.aksen{width:12mm;border-top:2pt solid #D9600B;margin:0 0 3pt}
h2{font-size:9.4pt;color:#051C2C;margin:6pt 0 2pt;padding:2pt 4pt;background:#E6EAF0;border-left:3pt solid #D9600B}
h2 small{font-weight:400;color:#2E3440;font-size:7.6pt}
.grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:3pt 6pt}
.grid.dua{grid-template-columns:1fr 1fr}
.f{border:.75pt solid #BFC5CC;padding:2pt 3pt;min-height:25pt}
.f.lebar{grid-column:1/-1}
.f b{display:block;font-size:8.2pt}
.f i{display:block;font-style:normal;color:#6B7280;font-size:6.6pt}
.f .isi{display:block;height:11pt}
.f.sistem{background:#F1F3F6;color:#6B7280}
.f.vonis{border-left:3pt solid #D9600B}
.cb{display:inline-block;width:8pt;height:8pt;border:.9pt solid #1A1A1A;margin:0 2pt -1pt 0}
.cb.t{background:#051C2C}
.pil{display:inline-block;margin-right:6pt;font-size:8pt}
.petunjuk{border:.75pt solid #5B7A99;border-left:3pt solid #5B7A99;padding:3pt 5pt;font-size:7.2pt;margin-top:6pt;background:#F3F5F8}
.petunjuk p{margin:1pt 0}
table{border-collapse:collapse;width:100%%}
th,td{border:.75pt solid #BFC5CC;padding:2pt 3pt;text-align:left}
th{background:#051C2C;color:#fff;font-size:7.6pt}
td.n{height:19pt}
.ket{font-size:7pt;color:#6B7280}
''' % (FONT[400], FONT[700])


def kop(judul, sub, versi):
    return (f'<div class="kop"><img src="file://{LOGO}"><div class="l"><div class="b">Badan Nasional Penanggulangan Bencana</div>'
            f'<h1>{e(judul)}</h1><div class="b">{e(sub)}</div></div>'
            f'<div class="v">Pilot 28 Okt sampai 1 Nov 2026<br>Palangka Raya<br>Versi medan {versi}</div></div>')


def kotak_pilihan(d, tanda=None):
    out = []
    for p in d['pilihan']:
        teks = {1: 'Ya (1)', 0: 'Tidak (0)'}[p] if d['tipe'] == 'bool' else f'{p}'
        t = ' t' if tanda is not None and p == tanda else ''
        out.append(f'<span class="pil"><span class="cb{t}"></span>{e(teks)}</span>')
    return ''.join(out)


def medan_html(d, kelas='', sistem=None, tanda=None, butir=None):
    """Satu kotak isian: label persis formulir.js, nama medan kecil, batas dan satuan."""
    k = 'f ' + kelas + (' sistem' if sistem else '') + (' vonis' if butir else '')
    if d['tipe'] in ('pilihan', 'bool'):
        isi = kotak_pilihan(d, tanda)
    elif sistem:
        isi = f'<span class="isi">{e(sistem)}</span>'
    elif d['tipe'] == 'waktu':
        isi = '<span class="isi">tgl ____ / ____ jam ____ : ____ WIB</span>'
    else:
        isi = '<span class="isi"></span>'
    wajib = ' (wajib)' if d['wajib'] else ''
    b = batas(d)
    cat = f'{e(d["nama"])}{wajib}' + (f' | {e(b)}' if b else '') + (f' | butir vonis {butir}' if butir else '')
    return f'<div class="{k.strip()}"><b>{e(d["label"])}</b>{isi}<i>{cat}</i></div>'


PETUNJUK_G3 = (
    '<div class="petunjuk"><p><b>Cara memasukkan ke sistem (staf pusdalops atau koordalops).</b> Satu lembar = satu butir sesi gelar. '
    'Masuk ke /pipa dengan akun staf, lalu kirim <b>POST /api/sippa/log</b> dengan badan JSON: nama medan persis tulisan kecil di bawah tiap label, '
    'nilai pilihan persis kode di sebelah kotak centang (Ya = 1, Tidak = 0).</p>'
    '<p>Waktu dikirim sebagai milidetik epoch UTC (jam WIB dikurangi 7 jam). Medan berlatar abu-abu tidak diisi tangan: id dan waktu perangkat diberikan server. '
    'Kosongkan medan yang tidak diukur, jangan menulis 0. Tulis nama regu dan nomor lembar di Catatan. '
    'Sertakan kit_id (16 heks) bila sesi memakai kit terdaftar; tanpa kit_id, sertakan prov (2 digit).</p>'
    '<p>Foto lembar yang sudah diisi diunggah dan disimpan sebagai berkas bukti. Bila ada salah ketik, kirim butir baru dengan koreksi_dari berisi id butir lama; jangan menimpa.</p></div>')

PETUNJUK_PROBE = (
    '<div class="petunjuk"><p><b>Cara memasukkan ke sistem.</b> Probe tidak diterima <b>POST /api/sippa/log</b> (rute itu hanya untuk butir sesi gelar). '
    'Masukkan lewat layar /pipa/lapangan dengan kode penugasan regu (<b>POST /api/sippa/lapangan/kirim</b>, daftar probe). '
    'Satu sel suhu = satu butir probe: titik, tahap, kedalaman_cm, suhu_c, waktu.</p>'
    '<p>Ukur tiga tahap di titik yang sama: sebelum injeksi, sesudah injeksi, dan 24 jam kemudian. Kedalaman 150 sampai 500 cm hanya untuk tugas lengan uji; '
    'pada tugas biasa kolom itu dibiarkan kosong. Satu titik tanpa angka dihitung belum lengkap (butir 5 vonis pilot, ambang 90%).</p></div>')


# ---------------------------------------------------------------- lembar G3-lite
VONIS = {'petak_id': '1', 'air_sampai_lance': '1', 't_tiba': '2', 't_mulai_gelar': '2', 't_air_mengalir': '2', 't_selesai': '2',
         't_bongkar_selesai': '2', 'p_ujung_bar': '3', 'p_ujung_menit': '3', 'p_ujung_sumber': '3', 'konfigurasi': '4',
         'kecelakaan': '6', 'bocor_henti_menit': '6'}
SISTEM_LOG = {'id': 'diisi server', 'waktu_klien': 'diisi server'}


def lembar_g3(versi, log):
    d = {x['nama']: x for x in log}
    pakai = set()

    def m(n, kelas='', **kw):
        pakai.add(n)
        return medan_html(d[n], kelas, butir=VONIS.get(n), **kw)

    def kel(n, kelas='', **kw):
        return m(n, kelas, **kw)

    h = [f'<div class="lembar">', kop('Formulir G3-lite: sesi gelar', 'Cadangan kertas bila layar lapangan belum dapat dipakai', versi)]
    h.append('<h2>A. Sesi <small>jenis, medan, petak, regu</small></h2><div class="grid">')
    h += [kel('jenis'), kel('kelas_medan'), kel('petak_id'), kel('n_orang'), kel('panjang_m'), kel('lat'), kel('lon')]
    h.append('</div><h2>B. Enam waktu <small>jam lokal WIB, urutan harus menaik</small></h2><div class="grid dua">')
    h += [kel(n) for n in ('t_tiba', 't_mulai_gelar', 't_air_mengalir', 't_mulai_injeksi', 't_selesai', 't_bongkar_selesai')]
    h.append('</div><h2>C. Angka sesi</h2><div class="grid">')
    h += [kel('jam_pompa'), kel('bbm_l'), kel('air_m3'), kel('banjir_m3')]
    h.append('</div><h2>D. Vonis pilot <small>keputusan 53: tujuh butir, label asumsi-kebijakan</small></h2><div class="grid">')
    h += [kel('air_sampai_lance'), kel('p_ujung_bar'), kel('p_ujung_menit'), kel('p_ujung_sumber'), kel('kecelakaan'), kel('bocor_henti_menit')]
    h.append('</div><h2>E. Konfigurasi dan catatan</h2><div class="grid dua">')
    h += [kel('konfigurasi', sistem=None), kel('koreksi_dari'), kel('catatan', 'lebar')]
    h.append('</div><h2>F. Diisi sistem <small>jangan ditulis tangan</small></h2><div class="grid dua">')
    h += [kel('id', sistem=SISTEM_LOG['id']), kel('waktu_klien', sistem=SISTEM_LOG['waktu_klien'])]
    h.append('</div>' + PETUNJUK_G3 + '</div>')
    sisa = set(d) - pakai
    assert not sisa, f'medan log belum ada di lembar G3-lite: {sorted(sisa)}'
    return ''.join(h)


# ---------------------------------------------------------------- lembar probe
def lembar_probe(versi, probe, kd, tahap):
    d = {x['nama']: x for x in probe}
    biasa, dalam = kd['biasa'], kd['lengan_dalam']
    h = [f'<div class="lembar">', kop('Lembar probe suhu gambut', f'Tahap {tahap}: satu lembar per petak', versi)]
    h.append('<div class="grid dua">')
    h.append(medan_html(d['log_id'], sistem=None))
    h.append(medan_html(d['petak_id']))
    h.append(f'<div class="f lebar"><b>{e(d["tahap"]["label"])}</b>{kotak_pilihan(d["tahap"], tahap)}<i>{e("tahap")} (wajib) | tahap sudah dicetak pada lembar ini</i></div>')
    h.append('</div>')
    kol = lambda n: f'<th>{n}</th>'
    h.append(f'<h2>{e(d["suhu_c"]["label"])} <small>tiap kedalaman; satuan derajat Celsius</small></h2>')
    h.append('<table><thead><tr>' + f'<th>{e(d["titik"]["label"])}</th><th>{e(d["waktu"]["label"])}</th>'
             + ''.join(f'<th>{x} cm</th>' for x in biasa) + ''.join(f'<th>{x} cm*</th>' for x in dalam) + '</tr></thead><tbody>')
    for _ in range(10):
        h.append('<tr><td class="n"></td><td class="n">jam ___:___</td>' + '<td class="n"></td>' * (len(biasa) + len(dalam)) + '</tr>')
    h.append('</tbody></table>')
    h.append(f'<p class="ket">{e(d["kedalaman_cm"]["label"])}: kolom bertanda * (150 sampai 500 cm) hanya untuk tugas lengan uji; batas '
             f'{e(d["suhu_c"]["label"])} dari {fmt(d["suhu_c"]["min"])} sampai {fmt(d["suhu_c"]["maks"])}. '
             f'Nama medan: {e(d["kedalaman_cm"]["nama"])}, {e(d["suhu_c"]["nama"])}, {e(d["titik"]["nama"])}, {e(d["waktu"]["nama"])}. '
             f'{e(d["id"]["label"])} ({e(d["id"]["nama"])}) diisi sistem saat entri.</p>')
    h.append(PETUNJUK_PROBE + '</div>')
    return ''.join(h)


def bangun_html(jenis):
    versi, kd, medan = baca_formulir()
    if jenis == 'g3':
        isi = ''.join(lembar_g3(versi, medan['log']) for _ in range(SALIN_G3))
    else:
        isi = ''.join(lembar_probe(versi, medan['probe'], kd, t) for _ in range(SALIN_PROBE // 3) for t in TAHAP_PILOT)
    return f'<!doctype html><html lang="id"><head><meta charset="utf-8"><title>SIPPA {jenis}</title><style>{GAYA}</style></head><body>{isi}</body></html>'


# ---------------------------------------------------------------- pemeriksa
def teks_datar(h):
    return re.sub(r'\s+', ' ', html.unescape(re.sub(r'<[^>]+>', ' ', h)))


def cek_teks(daftar, teks):
    """Daftar medan yang label, nama, atau pilihannya tidak ada di teks."""
    hilang = []
    for d in daftar:
        wajib = [d['label'], d['nama']] + ([str(p) for p in d['pilihan'] or []] if d['tipe'] == 'pilihan' else [])
        hilang += [f'{d["nama"]}: {w}' for w in wajib if w not in teks]
    return hilang


def periksa_html(g3, probe, kd, medan):
    tg, tp = teks_datar(g3), teks_datar(probe)
    # probe: 'sesi gelar' ada, kedalaman dicetak sebagai kolom, bukan pilihan teks; periksa tiap angka
    dp = [dict(d, pilihan=[p for p in d['pilihan'] if d['nama'] != 'kedalaman_cm'] if d['pilihan'] else None) for d in medan['probe']]
    hilang = cek_teks(medan['log'], tg) + cek_teks(dp, tp)
    hilang += [f'kedalaman {k} cm' for k in kd['biasa'] + kd['lengan_dalam'] if f'{k} cm' not in tp]
    return hilang


def uji():
    versi, kd, medan = baca_formulir()
    assert versi >= 1 and set(medan) >= {'log', 'probe'}, 'pembaca tidak menemukan MEDAN log/probe'
    assert medan['log'] and medan['probe']
    mx = max(kd['biasa'] + kd['lengan_dalam'])
    assert mx <= 500, f'medan kedalaman {mx} cm melebihi 500 cm'
    for n in ('air_sampai_lance', 'p_ujung_bar', 'p_ujung_menit', 'p_ujung_sumber', 'kecelakaan', 'bocor_henti_menit', 'petak_id'):
        assert any(d['nama'] == n for d in medan['log']), f'medan vonis pilot {n} hilang dari formulir.js'
    g3, probe = bangun_html('g3'), bangun_html('probe')
    hilang = periksa_html(g3, probe, kd, medan)
    assert not hilang, f'medan formulir.js tidak muncul di kertas: {hilang[:6]}'
    # yang salah DITOLAK: medan karangan harus terdeteksi
    palsu = dict(medan['log'][0], nama='zzz_palsu', label='Medan Palsu', tipe='teks', pilihan=None)
    assert cek_teks([palsu], teks_datar(g3)), 'pemeriksa tidak menolak medan yang tidak ada di kertas'
    for nama, h in (('G3', g3), ('probe', probe)):
        for ch in ('·', '—'):
            assert ch not in h, f'{nama}: karakter terlarang U+{ord(ch):04X}'
        fam = set(re.findall(r'font-family:([^;}]+)', h))
        assert fam == {'Roboto'}, f'{nama}: keluarga huruf selain Roboto: {fam}'
        assert 'sumber-bnpb.png' in h and 'Badan Nasional Penanggulangan Bencana' in h, f'{nama}: kop BNPB tidak ada'
    assert g3.count('class="lembar"') == SALIN_G3 and probe.count('class="lembar"') == SALIN_PROBE
    print(f'HTML ok: log {len(medan["log"])} medan, probe {len(medan["probe"])} medan, kedalaman maks {mx} cm')
    periksa_pdf(medan, kd)


def periksa_pdf(medan, kd):
    try:
        import pymupdf as fitz
    except ImportError:
        print('PDF: PyMuPDF tidak ada, pemeriksaan teks PDF dilewati')
        return
    for berkas, daftar, n in (('G3-lite.pdf', medan['log'], SALIN_G3), ('probe.pdf', None, SALIN_PROBE)):
        p = KELUAR / berkas
        if not p.exists():
            print(f'PDF: {berkas} belum ada, dilewati')
            continue
        dok = fitz.open(p)
        assert dok.page_count == n, f'{berkas}: {dok.page_count} halaman, harapan {n}'
        t = re.sub(r'\s+', ' ', ' '.join(pg.get_text() for pg in dok))
        if daftar:
            hilang = cek_teks(daftar, t)
        else:
            hilang = cek_teks([dict(d, pilihan=None) if d['nama'] == 'kedalaman_cm' else d for d in medan['probe']], t)
            hilang += [f'{k} cm' for k in kd['biasa'] + kd['lengan_dalam'] if f'{k} cm' not in t]
        assert not hilang, f'{berkas}: medan tidak muncul di PDF: {hilang[:6]}'
        fonts = {f[3] for pg in dok for f in pg.get_fonts()}
        assert fonts and all('Roboto' in f for f in fonts), f'{berkas}: huruf selain Roboto: {fonts}'
        print(f'PDF ok: {berkas} {dok.page_count} halaman, huruf {sorted(fonts)}')


def bangun():
    KELUAR.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory() as tmp:
        for jenis, nama in (('g3', 'G3-lite'), ('probe', 'probe')):
            h = Path(tmp) / f'{nama}.html'
            h.write_text(bangun_html(jenis), encoding='utf-8')
            r = subprocess.run(['node', str(BANGUN / 'kontrak/pdf.mjs'), str(h), str(KELUAR / f'{nama}.pdf')], capture_output=True, text=True)
            if r.returncode:
                sys.exit(f'pdf.mjs gagal untuk {nama}: {r.stderr.strip()}')
            print(r.stdout.strip())


if __name__ == '__main__':
    if sys.argv[1:] == ['uji']:
        uji()
    else:
        bangun()
        uji()
