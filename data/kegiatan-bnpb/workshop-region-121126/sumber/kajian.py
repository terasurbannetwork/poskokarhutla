"""Kajian Rancangan Workshop Region BNPB, BPBD Provinsi, dan PTN (BNPB, 12 Nov 2026), format A4 kajian BNPB.

Isi dari "Rancangan Workshop Region BNPB BPBD PTN 121126.docx" (draf 11 Nov) dan perbandingan skema dari
"Analisis Skema Workshop Per Provinsi atau Region 121126.docx", disusun ulang ke format kajian Tinggi Banjir
(data/laporan-bnpb/kajian-tinggi-banjir-2026-11): sampul, daftar isi, ringkasan eksekutif, bab bernomor, lampiran.

Urutan (dari folder ini):  py kajian.py -> node cetak.mjs -> py gabung.py  (ulang ketiganya sekali lagi supaya nomor
halaman daftar isi terisi) -> node tangkap.mjs -> py word.py
"""
import json, os, html, base64, mimetypes
from pathlib import Path

SINI = Path(__file__).resolve().parent
AKAR = SINI.parents[3]
HOME = os.path.expanduser('~').replace(chr(92), '/') + '/'
SK = HOME + '.claude/skills/ppt-konsultan/bnpb/'
LOGO_BNPB = SK + 'assets/proyek-bnpb/logo/sumber-bnpb.png'
LOGO_KRIS = str(AKAR / 'data/laporan-bnpb/generator/sampul/media/kris-logo.png')
FONT = AKAR / 'data/laporan-bnpb/generator/font'
META = json.load(open(SINI / 'meta.json', encoding='utf-8'))

C = dict(navy='#051C2C', oranye='#D9600B', biru='#2F86D1', merah='#C8102E', teks='#1A1A1A', teks2='#2E3440', teks3='#6B7280',
         garis='#BFC5CC', tint='#F1F3F6', tintair='#DCEBF8', hijau='#2E7D5B', slate='#5B7A99', abu='#DCE1E7')
BIRU = C['biru']


def f(x, d=0):
    if isinstance(x, str):
        return x
    s = f'{x:,.{d}f}'
    return s.replace(',', '#').replace('.', ',').replace('#', '.')


def gambar(p):
    p = Path(p)
    return 'data:' + (mimetypes.guess_type(p.name)[0] or 'image/png') + ';base64,' + base64.b64encode(p.read_bytes()).decode()


# ---------------- data acara ----------------
# (region, kota, lama, [(provinsi, [PTN], tuan_rumah)])
REGION = [
    ('Sumatera bagian utara', 'Medan', '2 hari 1 malam', [
        ('Aceh', ['Universitas Syiah Kuala (K)', 'Universitas Malikussaleh', 'UIN Ar-Raniry Banda Aceh'], 0),
        ('Sumatera Utara', ['Universitas Sumatera Utara', 'Universitas Negeri Medan', 'Politeknik Negeri Medan'], 1),
        ('Sumatera Barat', ['Universitas Andalas (K)', 'Universitas Negeri Padang', 'Politeknik Negeri Padang'], 0),
        ('Riau', ['Universitas Riau', 'UIN Sultan Syarif Kasim Riau', 'Politeknik Negeri Bengkalis'], 0),
        ('Kepulauan Riau', ['Universitas Maritim Raja Ali Haji', 'Politeknik Negeri Batam', 'STAIN Sultan Abdurrahman Kepulauan Riau'], 0)]),
    ('Sumatera bagian selatan', 'Palembang', '2 hari 1 malam', [
        ('Jambi', ['Universitas Jambi', 'UIN Sulthan Thaha Saifuddin Jambi', 'IAIN Kerinci'], 0),
        ('Sumatera Selatan', ['Universitas Sriwijaya', 'Politeknik Negeri Sriwijaya', 'UIN Raden Fatah Palembang'], 1),
        ('Bengkulu', ['Universitas Bengkulu', 'UIN Fatmawati Sukarno Bengkulu', 'IAIN Curup'], 0),
        ('Lampung', ['Universitas Lampung', 'Institut Teknologi Sumatera', 'Politeknik Negeri Lampung'], 0),
        ('Kepulauan Bangka Belitung', ['Universitas Bangka Belitung', 'Politeknik Manufaktur Negeri Bangka Belitung', 'IAIN Syaikh Abdurrahman Siddik Bangka Belitung'], 0)]),
    ('Banten, DKI Jakarta, Jawa Barat', 'Jakarta', '1 hari', [
        ('Banten', ['Universitas Sultan Ageng Tirtayasa', 'UIN Sultan Maulana Hasanuddin Banten', 'UIN Syarif Hidayatullah Jakarta (kampus utama di Ciputat, Tangerang Selatan)'], 0),
        ('DKI Jakarta', ['Universitas Indonesia (K)', 'Universitas Negeri Jakarta', 'UPN Veteran Jakarta'], 1),
        ('Jawa Barat', ['Institut Teknologi Bandung (K)', 'Institut Pertanian Bogor (K)', 'Universitas Padjadjaran'], 0)]),
    ('Jawa Tengah, DIY, Jawa Timur', 'Yogyakarta', '1 hari', [
        ('Jawa Tengah', ['Universitas Diponegoro', 'Universitas Sebelas Maret', 'Universitas Jenderal Soedirman'], 0),
        ('DI Yogyakarta', ['Universitas Gadjah Mada (K)', 'Universitas Negeri Yogyakarta', 'UPN Veteran Yogyakarta'], 1),
        ('Jawa Timur', ['Institut Teknologi Sepuluh Nopember (K)', 'Universitas Airlangga', 'Universitas Brawijaya'], 0)]),
    ('Bali dan Nusa Tenggara', 'Denpasar', '2 hari 1 malam', [
        ('Bali', ['Universitas Udayana', 'Universitas Pendidikan Ganesha', 'Politeknik Negeri Bali'], 1),
        ('Nusa Tenggara Barat', ['Universitas Mataram (K)', 'UIN Mataram', 'IAHN Gde Pudja Mataram'], 0),
        ('Nusa Tenggara Timur', ['Universitas Nusa Cendana', 'Politeknik Negeri Kupang', 'Universitas Timor'], 0)]),
    ('Kalimantan', 'Balikpapan', '2 hari 1 malam', [
        ('Kalimantan Barat', ['Universitas Tanjungpura', 'Politeknik Negeri Pontianak', 'IAIN Pontianak'], 0),
        ('Kalimantan Tengah', ['Universitas Palangka Raya', 'UIN Palangka Raya', 'IAHN Tampung Penyang Palangka Raya'], 0),
        ('Kalimantan Selatan', ['Universitas Lambung Mangkurat (K)', 'Politeknik Negeri Banjarmasin', 'UIN Antasari Banjarmasin'], 0),
        ('Kalimantan Timur', ['Universitas Mulawarman', 'Institut Teknologi Kalimantan', 'Politeknik Negeri Samarinda'], 1),
        ('Kalimantan Utara', ['Universitas Borneo Tarakan', 'Politeknik Negeri Nunukan'], 0)]),
    ('Sulawesi', 'Makassar', '2 hari 1 malam', [
        ('Sulawesi Utara', ['Universitas Sam Ratulangi', 'Universitas Negeri Manado', 'Politeknik Negeri Manado'], 0),
        ('Gorontalo', ['Universitas Negeri Gorontalo', 'UIN Sultan Amai Gorontalo'], 0),
        ('Sulawesi Barat', ['Universitas Sulawesi Barat', 'STAIN Majene'], 0),
        ('Sulawesi Selatan', ['Universitas Hasanuddin (K)', 'Universitas Negeri Makassar', 'Politeknik Negeri Ujung Pandang'], 1),
        ('Sulawesi Tengah', ['Universitas Tadulako', 'UIN Datokarama Palu'], 0),
        ('Sulawesi Tenggara', ['Universitas Halu Oleo', 'Universitas Sembilanbelas November Kolaka', 'UIN Kendari'], 0)]),
    ('Maluku dan Papua', 'Ambon', '2 hari 1 malam', [
        ('Maluku', ['Universitas Pattimura (K)', 'Politeknik Negeri Ambon', 'UIN Abdul Muthalib Sangadji Ambon'], 1),
        ('Maluku Utara', ['Universitas Khairun', 'IAIN Ternate'], 0),
        ('Papua', ['Universitas Cenderawasih', 'Institut Seni Budaya Indonesia Tanah Papua', 'IAIN Fattahul Muluk Papua'], 0),
        ('Papua Barat', ['Universitas Papua', 'Politeknik Negeri Fakfak'], 0),
        ('Papua Barat Daya', ['IAIN Sorong'], 0),
        ('Papua Tengah', [], 0),
        ('Papua Selatan', ['Universitas Musamus Merauke'], 0),
        ('Papua Pegunungan', [], 0)]),
]
TIM = 10
# biaya per region, Rp juta: (BNPB menanggung semua perjalanan, peserta menanggung perjalanannya sendiri)
BIAYA = {'Maluku dan Papua': (437, 164), 'Sumatera bagian utara': (385, 143), 'Sulawesi': (375, 135), 'Kalimantan': (351, 133),
         'Sumatera bagian selatan': (299, 128), 'Bali dan Nusa Tenggara': (222, 125), 'Jawa Tengah, DIY, Jawa Timur': (96, 70),
         'Banten, DKI Jakarta, Jawa Barat': (49, 23)}

R = []
for nama, kota, lama, prov in REGION:
    nptn = sum(len(p[1]) for p in prov)
    R.append(dict(nama=nama, kota=kota, lama=lama, prov=prov, nprov=len(prov), nptn=nptn, bpbd=3 * len(prov), ptn_o=3 * nptn,
                  luar=3 * len(prov) + 3 * nptn, total=3 * len(prov) + 3 * nptn + TIM))
A = dict(prov=sum(r['nprov'] for r in R), ptn=sum(r['nptn'] for r in R), bpbd_o=sum(r['bpbd'] for r in R), ptn_o=sum(r['ptn_o'] for r in R),
         luar=sum(r['luar'] for r in R), total=sum(r['total'] for r in R), biaya_a=sum(v[0] for v in BIAYA.values()),
         biaya_b=sum(v[1] for v in BIAYA.values()), kurang3=sum(1 for r in R for p in r['prov'] if len(p[1]) < 3),
         k=sum(1 for r in R for p in r['prov'] for u in p[1] if '(K)' in u))
assert (A['prov'], A['ptn'], A['luar'], A['total'], A['biaya_a'], A['biaya_b']) == (38, 98, 408, 488, 2214, 921), A
assert all(r['nama'] in BIAYA for r in R)
MILIAR = lambda jt: f(jt / 1000, 2)

# ---------------- ikon ----------------
GLIF = json.load(open(SK + 'scripts/glif.json', encoding='utf-8'))
GLIF.update({
    'x:grafik': '<path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/>',
    'x:jam': '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
    'x:rute': '<circle cx="6" cy="19" r="3"/><path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15"/><circle cx="18" cy="5" r="3"/>',
    'x:meja': '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M7 20h10"/><path d="M12 16v4"/>',
    'x:puzzle': '<path d="M19.4 14.4c.6-.6 1.6-.6 2.2 0 .6.6.6 1.6 0 2.2L17 21H3V7l4.4-4.6c.6-.6 1.6-.6 2.2 0 .6.6.6 1.6 0 2.2L8 6.2V9h3l1.6-1.6c.6-.6 1.6-.6 2.2 0 .6.6.6 1.6 0 2.2L13 11.2V14h3.2z"/>',
})
IK = {'kalender': 'deck:kalender', 'orang': 'deck:orang', 'data': 'lucide:database', 'daftar': 'lucide:list-checks', 'awas': 'lucide:triangle-alert',
      'peta': 'lucide:map-pin', 'lembaga': 'lucide:landmark', 'perisai': 'lucide:shield-check', 'hukum': 'lucide:scale', 'buku': 'lucide:book-open',
      'dokumen': 'lucide:file-text', 'periksa': 'lucide:clipboard-check', 'target': 'lucide:target', 'jaringan': 'lucide:network',
      'ide': 'lucide:lightbulb', 'tangan': 'lucide:handshake', 'warga': 'lucide:users', 'bagi': 'lucide:share-2', 'kampus': 'lucide:graduation-cap',
      'sekolah': 'lucide:school', 'uang': 'lucide:banknote', 'paparan': 'lucide:presentation', 'cek': 'lucide:user-check', 'sirene': 'lucide:siren',
      'mikroskop': 'lucide:microscope', 'grafik': 'x:grafik', 'jam': 'x:jam', 'rute': 'x:rute', 'meja': 'x:meja', 'puzzle': 'x:puzzle',
      'penghargaan': 'lucide:award'}


def ikon(k, warna=C['navy'], uk=20, bulat=True, isi=None):
    gl = GLIF[IK.get(k, k)]
    if not bulat:
        return f'<svg class="ik" width="{uk}" height="{uk}" viewBox="0 0 24 24" fill="none" stroke="{warna}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">{gl}</svg>'
    latar = isi or (warna + '22')
    return (f'<svg class="ik" width="{uk}" height="{uk}" viewBox="-6 -6 36 36"><circle cx="12" cy="12" r="17.5" fill="{latar}"/>'
            f'<g fill="none" stroke="{warna}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">{gl}</g></svg>')


# ---------------- komponen ----------------
def kartu(item, kolom=4):
    return f'<div class="kartu k{kolom}">' + ''.join(
        f'<div class="kt" style="border-top-color:{w}"><div class="kti">{ikon(ik, w, 22)}<div class="kn" style="color:{w}">{v}</div></div><div class="kl">{l}</div></div>'
        for v, l, w, ik in item) + '</div>'


def tabel(kolom, baris, kanan=(), lebar=None, kelas=''):
    cg = ''.join(f'<col style="width:{x}%">' for x in lebar) if lebar else ''
    th = ''.join(f'<th class="{"r" if i in kanan else ""}">{k}</th>' for i, k in enumerate(kolom))
    tr = ''.join('<tr>' + ''.join(f'<td class="{"r" if i in kanan else ""}">{c}</td>' for i, c in enumerate(b)) + '</tr>' for b in baris)
    return f'<table class="tb {kelas}"><colgroup>{cg}</colgroup><thead><tr>{th}</tr></thead><tbody>{tr}</tbody></table>'


NOMOR = {'gambar': 0, 'tabel': 0}


def fig(isi, judul, sumber, jenis='gambar'):
    NOMOR[jenis] += 1
    lab = ('Gambar ' if jenis == 'gambar' else 'Tabel ') + str(NOMOR[jenis])
    return f'<figure><figcaption><span class="lab">{lab}.</span> {judul}</figcaption><div class="gbr">{isi}</div><div class="sb"><b>Sumber:</b> {sumber}</div></figure>'


def temuan(item):
    return '<div class="temuan">' + ''.join(f'<div class="tm"><div class="tmk">{ikon(ik, w, 30)}</div><div>{t}</div></div>' for ik, w, t in item) + '</div>'


def aksi(kolom):
    ik = ['sirene', 'kalender', 'target']
    return '<div class="aksi">' + ''.join(
        f'<div class="ak {"akan" if i == 2 else ""}"><div class="akh">{ikon(ik[i], "#FFFFFF", 16, False)} {j}</div><ul>' + ''.join(f'<li>{b}</li>' for b in bt) + '</ul></div>'
        for i, (j, bt) in enumerate(kolom)) + '</div>'


def svg_open(w, h):
    return f'<svg viewBox="0 0 {w} {h}" width="100%" xmlns="http://www.w3.org/2000/svg" font-family="Roboto" font-size="11">'


def teks(x, y, t, uk=10.5, w=C['teks2'], tebal=False, anchor='start'):
    return f'<text x="{x}" y="{y}" font-size="{uk}" fill="{w}" text-anchor="{anchor}"{" font-weight=\"700\"" if tebal else ""}>{html.escape(t)}</text>'


def ul(item):
    return '<ul>' + ''.join(f'<li>{x}</li>' for x in item) + '</ul>'


# ---------------- gambar ----------------
def peserta_region():
    """batang bertumpuk per region: BPBD, PTN, tim BNPB."""
    w, rowh, lw = 690, 30, 210
    urut = sorted(R, key=lambda r: -r['total'])
    mx = max(r['total'] for r in urut)
    skala = (w - lw - 70) / mx
    s = [svg_open(w, rowh * len(urut) + 40)]
    for i, r in enumerate(urut):
        y = 6 + i * rowh
        s.append(teks(lw - 8, y + 13, r['nama'], 10.3, C['teks'], anchor='end'))
        s.append(teks(lw - 8, y + 24, f'{r["kota"]}, {r["nprov"]} provinsi, {r["lama"]}', 8.2, C['teks3'], anchor='end'))
        x = lw
        for v, c in ((r['bpbd'], C['navy']), (r['ptn_o'], BIRU), (TIM, C['oranye'])):
            s.append(f'<rect x="{x:.1f}" y="{y + 4}" width="{v * skala:.1f}" height="{rowh - 10}" fill="{c}"/>')
            if v * skala > 18:
                s.append(f'<text x="{x + v * skala / 2:.1f}" y="{y + 18}" fill="#fff" font-size="9" font-weight="700" text-anchor="middle">{v}</text>')
            x += v * skala
        s.append(f'<text x="{x + 6:.1f}" y="{y + 18}" fill="{C["navy"]}" font-weight="700" font-size="10.5">{r["total"]} orang</text>')
    yl = 6 + len(urut) * rowh + 14
    for j, (lab, c) in enumerate((('BPBD provinsi, 3 orang per provinsi', C['navy']), ('PTN, 3 orang per kampus', BIRU), ('Tim BNPB, 10 orang', C['oranye']))):
        x = lw + j * 160
        s.append(f'<rect x="{x}" y="{yl - 9}" width="10" height="10" fill="{c}"/>')
        s.append(teks(x + 15, yl, lab, 9, C['teks2']))
    s.append('</svg>')
    return ''.join(s)


def anggaran_region():
    """dua batang per region: BNPB menanggung semua perjalanan, dan peserta menanggung sendiri."""
    w, rowh, lw = 690, 34, 210
    urut = sorted(R, key=lambda r: -BIAYA[r['nama']][0])
    mx = max(v[0] for v in BIAYA.values())
    skala = (w - lw - 60) / mx
    s = [svg_open(w, rowh * len(urut) + 34)]
    for i, r in enumerate(urut):
        a, b = BIAYA[r['nama']]
        y = 6 + i * rowh
        s.append(teks(lw - 8, y + 13, r['nama'], 10.3, C['teks'], anchor='end'))
        s.append(teks(lw - 8, y + 25, f'{r["kota"]}, {r["total"]} orang', 8.2, C['teks3'], anchor='end'))
        s.append(f'<rect x="{lw}" y="{y + 3}" width="{a * skala:.1f}" height="12" fill="{C["navy"]}"/>')
        s.append(f'<text x="{lw + a * skala + 5:.1f}" y="{y + 13}" fill="{C["navy"]}" font-weight="700" font-size="9.5">{f(a)}</text>')
        s.append(f'<rect x="{lw}" y="{y + 17}" width="{b * skala:.1f}" height="12" fill="{C["oranye"]}"/>')
        s.append(f'<text x="{lw + b * skala + 5:.1f}" y="{y + 27}" fill="{C["oranye"]}" font-weight="700" font-size="9.5">{f(b)}</text>')
    yl = 6 + len(urut) * rowh + 14
    for j, (lab, c) in enumerate((('BNPB menanggung semua perjalanan', C['navy']), ('Peserta menanggung perjalanannya sendiri', C['oranye']))):
        x = lw + j * 220
        s.append(f'<rect x="{x}" y="{yl - 9}" width="10" height="10" fill="{c}"/>')
        s.append(teks(x + 15, yl, lab, 9, C['teks2']))
    s.append('</svg>')
    return ''.join(s)


def kotak_alur(s, x, y, bw, bh, judul, b1, b2, warna, sorot=False):
    s.append(f'<rect x="{x}" y="{y}" width="{bw}" height="{bh}" rx="6" fill="{C["tintair"] if sorot else "#fff"}" stroke="{warna}" stroke-width="{2 if sorot else 1.3}"/>')
    s.append(f'<rect x="{x}" y="{y}" width="{bw}" height="5" fill="{warna}"/>')
    s.append(teks(x + bw / 2, y + 24, judul, 11, C['navy'], True, 'middle'))
    s.append(teks(x + bw / 2, y + 40, b1, 9.3, C['teks2'], anchor='middle'))
    s.append(teks(x + bw / 2, y + 53, b2, 9.3, C['teks2'], anchor='middle'))


def panah_ke(s, x1, y1, x2, y2, w=C['teks3']):
    if x1 == x2:
        s.append(f'<path d="M{x1},{y1} L{x2},{y2 - 6}" stroke="{w}" stroke-width="1.5"/><path d="M{x2 - 4},{y2 - 7} L{x2},{y2} L{x2 + 4},{y2 - 7}Z" fill="{w}"/>')
    else:
        s.append(f'<path d="M{x1},{y1} L{x2 - 6},{y2}" stroke="{w}" stroke-width="1.5"/><path d="M{x2 - 7},{y2 - 4} L{x2},{y2} L{x2 - 7},{y2 + 4}Z" fill="{w}"/>')


def alur():
    w, bw, bh, gap, x0 = 690, 192, 64, 40, 30
    xs = [x0, x0 + bw + gap, x0 + 2 * (bw + gap)]
    ys = [10, 120, 240]
    s = [svg_open(w, 408)]
    for y, lab in zip(ys, ('SEBELUM', 'WORKSHOP', 'PENYELESAIAN')):
        s.append(f'<text transform="translate(16,{y + bh / 2}) rotate(-90)" font-size="7.6" font-weight="700" fill="{C["oranye"]}" text-anchor="middle" letter-spacing="1">{lab}</text>')
    baris = [[('Bahan awal BNPB', 'profil risiko dan masalah', 'kandidat, H-30'), ('Tugas Pendahuluan', 'Lembar Masalah BPBD dan', 'Ajuan Riset PTN, H-14'),
              ('Telaah BNPB', 'gabung masalah yang sama,', 'pasangan awal, H-10')],
             [('Paparan', 'profil risiko region dan', 'masalah tiap provinsi'), ('Meja kerja per klaster', 'BPBD, PTN, dan BNPB', 'membedah tiap masalah'),
              ('Klinik pencocokan', '20 menit per pasangan,', 'kartu rencana bertanggal')],
             [('A. Selesai di tempat', 'saran, data, rujukan pakar,', 'paling lambat H+14'), ('B. Program BNPB', 'agenda riset, magang, KKN', 'tematik, paling lambat H+30'),
              ('C. Kerja sama', 'perjanjian atau proposal', 'bersama, paling lambat H+60')]]
    warna = [C['slate'], C['navy'], C['hijau']]
    for r, (y, isi) in enumerate(zip(ys, baris)):
        for c, (x, (j, a, b)) in enumerate(zip(xs, isi)):
            kotak_alur(s, x, y, bw, bh, j, a, b, C['oranye'] if (r, c) == (1, 2) else warna[r], sorot=(r, c) == (1, 2))
            if c < 2 and r < 2:
                panah_ke(s, x + bw, y + bh / 2, x + bw + gap, y + bh / 2)
    # baris 1 ke baris 2
    s.append(f'<path d="M{xs[2] + bw / 2},{ys[0] + bh} L{xs[2] + bw / 2},{ys[0] + bh + 20} L{xs[0] + bw / 2},{ys[0] + bh + 20}" fill="none" stroke="{C["teks3"]}" stroke-width="1.5"/>')
    panah_ke(s, xs[0] + bw / 2, ys[0] + bh + 20, xs[0] + bw / 2, ys[1])
    # klinik ke tiga jalur
    yb = ys[1] + bh + 22
    s.append(f'<path d="M{xs[2] + bw / 2},{ys[1] + bh} L{xs[2] + bw / 2},{yb} M{xs[0] + bw / 2},{yb} L{xs[2] + bw / 2},{yb}" fill="none" stroke="{C["oranye"]}" stroke-width="1.5"/>')
    for x in xs:
        panah_ke(s, x + bw / 2, yb, x + bw / 2, ys[2], C['oranye'])
    # pemantauan
    yp = ys[2] + bh + 26
    for x in xs:
        panah_ke(s, x + bw / 2, ys[2] + bh, x + bw / 2, yp)
    s.append(f'<rect x="{x0}" y="{yp}" width="{3 * bw + 2 * gap}" height="52" rx="6" fill="{C["tint"]}" stroke="{C["garis"]}"/>')
    s.append(teks(x0 + (3 * bw + 2 * gap) / 2, yp + 22, 'Pemantauan H+30, H+60, H+90 dan basis data nasional', 11, C['navy'], True, 'middle'))
    s.append(teks(x0 + (3 * bw + 2 * gap) / 2, yp + 39, 'Status pasangan diperbarui; masalah tanpa pasangan ditawarkan ke kampus di region lain', 9.3, C['teks2'], anchor='middle'))
    s.append('</svg>')
    return ''.join(s)


LANGKAH = [('H-45', 'Tetapkan region,', 'tanggal, kota, PTN'), ('H-40', 'Surat undangan', 'dan formulir'), ('H-30', 'Bahan awal BNPB', 'ke tiap provinsi'),
           ('H-21', 'Sesi daring', 'cara mengisi'), ('H-17', 'Pengingat', 'pertama'), ('H-14', 'Tenggat Tugas', 'Pendahuluan'),
           ('H-10', 'Telaah dan', 'pasangan awal'), ('H-7', 'Meja, urutan,', 'jadwal klinik'), ('H-3', 'Pengingat ketiga,', 'konfirmasi hadir'),
           ('H', 'Workshop', 'region'), ('H+7', 'Rekap dan daftar', 'pasangan'), ('H+30', 'Pemeriksaan', 'pertama'), ('H+90', 'Pemeriksaan', 'ketiga')]


def linimasa():
    w, h = 690, 170
    n = len(LANGKAH)
    x0, x1, y = 30, w - 30, 86
    s = [svg_open(w, h)]
    s.append(f'<line x1="{x0}" x2="{x1}" y1="{y}" y2="{y}" stroke="{C["garis"]}" stroke-width="3"/>')
    for i, (hari, a, b) in enumerate(LANGKAH):
        x = x0 + i * (x1 - x0) / (n - 1)
        warna = C['oranye'] if hari == 'H' else C['hijau'] if hari.startswith('H+') else C['navy']
        s.append(f'<circle cx="{x:.1f}" cy="{y}" r="{9 if hari == "H" else 6}" fill="{warna}"/>')
        atas = i % 2 == 0
        ty = y - 18 if atas else y + 26
        s.append(f'<line x1="{x:.1f}" x2="{x:.1f}" y1="{y + (-7 if atas else 7)}" y2="{ty + (6 if atas else -14)}" stroke="{warna}" stroke-width="1"/>')
        s.append(teks(round(x, 1), ty - (28 if atas else 0), hari, 10, warna, True, 'middle'))
        s.append(teks(round(x, 1), ty - (14 if atas else -14), a, 8.4, C['teks2'], anchor='middle'))
        s.append(teks(round(x, 1), ty - (0 if atas else -27), b, 8.4, C['teks2'], anchor='middle'))
    s.append('</svg>')
    return ''.join(s)


# ================= ISI =================
DAFTAR = [('Ringkasan Eksekutif', 'Ringkasan Eksekutif', 'daftar'),
          ('Bab 1', 'Bab 1. Latar Belakang dan Tujuan', 'ide'),
          ('Bab 2', 'Bab 2. Konsep Acara dan Pembagian Region', 'peta'),
          ('Bab 3', 'Bab 3. Peserta', 'warga'),
          ('Bab 4', 'Bab 4. Tugas Pendahuluan', 'dokumen'),
          ('Bab 5', 'Bab 5. Susunan Acara', 'jam'),
          ('Bab 6', 'Bab 6. Keluaran: Basis Data Masalah dan Ajuan Riset', 'data'),
          ('Bab 7', 'Bab 7. Tindak Lanjut sesudah Workshop', 'tangan'),
          ('Bab 8', 'Bab 8. Logistik, Administrasi, dan Anggaran', 'uang'),
          ('Bab 9', 'Bab 9. Jadwal, Ukuran Keberhasilan, dan Keputusan Pimpinan', 'target'),
          ('Lampiran', 'Lampiran. Daftar PTN per Region dan Sumber', 'kampus')]
TOC = json.load(open(SINI / 'toc.json', encoding='utf-8')) if (SINI / 'toc.json').exists() else {}


def bab(label, judul, ik, warna=BIRU):
    return (f'<div class="bab" style="--w:{warna}"><div class="babi">{ikon(ik, "#FFFFFF", 44, True, warna)}</div>'
            f'<span>{label.upper()}</span>{judul}</div>')


def h3(t, ik):
    return f'<h3>{ikon(ik, C["navy"], 20)} {t}</h3>'


H = []
m = META
H.append(f'''<section class="sampul">
<div class="sp-kiri">
 <div class="logo-baris"><img src="{gambar(LOGO_BNPB)}" class="lg-bnpb"></div>
 <div class="sp-jenis">{m["jenis"]}</div>
 <h1 class="sp-judul">{m["judul_sampul"]}</h1>
 <div class="sp-sub">{m["sub"]}</div>
 <div class="sp-garis"></div>
 <div class="sp-kepada">Disampaikan kepada<br><b>{m["kepada"]}</b><br>{m["kepada_jabatan"]}</div>
 <div class="sp-oleh">Disusun oleh<br><b>{m["oleh"]}</b><br>{m["oleh_jabatan"]}</div>
 <div class="pil-tgl">{m["tanggal"]}</div>
 <div class="sp-kaki">© 2026 Badan Nasional Penanggulangan Bencana<br><i>Ketangguhan Bangsa dalam Menghadapi Bencana</i></div>
</div>
<div class="sp-kanan" style="background-image:url('{gambar(SINI / 'sampul.jpg')}')">
 <div class="sp-logo2"><img src="{gambar(LOGO_KRIS)}"></div>
 <div class="sp-kredit">{m["kredit_foto"]}</div>
</div></section>''')

H.append(f'''<section class="hal">
<h2 class="judul-bagian">Daftar Isi</h2>
<ol class="toc">{''.join(f'<li><span>{ikon(ik, C["navy"], 22)} {t}</span><em>{TOC.get(k, "")}</em></li>' for k, t, ik in DAFTAR)}</ol>
<div class="kotak-info"><b>Tentang kajian ini.</b> Kajian ini merancang delapan workshop region yang mempertemukan BNPB, Badan Penanggulangan Bencana
Daerah (BPBD) provinsi, dan perguruan tinggi negeri (PTN) teratas di tiap provinsi, sebagai pengganti kunjungan BNPB ke kampus satu per satu.
Rancangan ini menjawab lima pertanyaan: siapa yang diundang, apa yang dibawa peserta, bagaimana acara berjalan, apa keluarannya, dan berapa biayanya.
Pembagian region dan perbandingan biaya bersumber dari Analisis Skema Workshop: Per Provinsi atau Per Region (11 November 2026). Nama dan status
{A["ptn"]} PTN diperiksa pada 11 November 2026. Angka biaya memakai tarif tertinggi Standar Biaya Masukan (SBM) 2026. Seluruh isi masih berupa
rancangan untuk dibahas; pertanyaan yang belum diputuskan pimpinan ditulis bersama bawaan sementaranya di Bab 9.</div>
</section>''')

H.append(f'''<section class="hal">
<h2 class="judul-bagian">Ringkasan Eksekutif</h2>
<p class="tesis">Delapan workshop region dapat mempertemukan {A["prov"]} BPBD provinsi dan {A["ptn"]} PTN dalam sekitar empat bulan.
Setiap masalah daerah keluar dari acara dengan kampus pasangan, jalur penyelesaian, dan tanggal langkah pertama.</p>
{kartu([('8 acara', 'workshop region, menggantikan 38 acara bila dibuat per provinsi', C['navy'], 'peta'),
        (f(A["luar"]) + ' orang', f'peserta dari luar BNPB: {A["bpbd_o"]} orang BPBD provinsi dan {A["ptn_o"]} orang dari {A["ptn"]} PTN', BIRU, 'warga'),
        ('Rp' + MILIAR(A["biaya_a"]) + ' M', 'biaya bila BNPB menanggung perjalanan semua peserta', C['oranye'], 'uang'),
        ('Rp' + MILIAR(A["biaya_b"]) + ' M', 'biaya bila BPBD dan PTN menanggung perjalanannya sendiri', C['slate'], 'uang')])}
<p>Selama ini BNPB mendatangi kampus satu per satu. Cara ini mahal dalam biaya dan waktu tim, dan kampus tidak bertemu langsung dengan BPBD yang memegang
masalah lapangan. Kajian ini mengusulkan delapan workshop region di kota simpul penerbangan. Enam region di luar Jawa berlangsung dua hari satu malam,
sedangkan dua region di Jawa cukup sehari. Setiap BPBD provinsi mengirim tiga orang, dan setiap PTN teratas mengirim tiga orang. Semua lembaga datang membawa
Tugas Pendahuluan dalam format baku, sehingga isiannya langsung menjadi basis data masalah dan ajuan riset daerah.</p>
<h3>{ikon('awas', C['navy'], 20)} Empat kelemahan kunjungan satu per satu</h3>
{temuan([('rute', C['oranye'], '<b>Biaya dan waktu berulang.</b> Perjalanan dan waktu tim BNPB terpakai ulang untuk setiap kampus. Bila dibuat per provinsi, tim harus menggelar 38 acara dengan 474 orang-hari perjalanan.'),
         ('tangan', BIRU, '<b>Kampus tidak bertemu pemilik masalah.</b> Kampus mendengar paparan BNPB, tetapi tidak bertemu langsung dengan BPBD di daerahnya, padahal BPBD yang memegang masalah lapangan.'),
         ('data', C['slate'], '<b>Catatan tidak bisa dibandingkan.</b> Masalah daerah dan minat riset kampus tercatat dalam bentuk yang berbeda-beda, sehingga sulit dibandingkan dan dipasangkan.'),
         ('jaringan', C['hijau'], '<b>Peluang konsorsium terlewat.</b> Kampus tidak melihat kekuatan kampus lain, sehingga riset bersama lintas kampus dan lintas provinsi jarang terbentuk.')])}
<h3>{ikon('target', C['navy'], 20)} Usulan utama</h3>
<p>Workshop dirancang agar sebagian besar waktu dipakai di meja kerja dan klinik pencocokan, bukan di panggung. Di klinik, setiap masalah tervalidasi
mendapat satu dari tiga jalur: <b>selesai di tempat</b>, <b>masuk program BNPB</b>, atau <b>kerja sama</b> antara BPBD dan kampus. Setiap pasangan dipantau
pada hari ke-30, ke-60, dan ke-90 sesudah acara. Keberhasilan dinilai dari pasangan yang benar-benar berjalan pada hari ke-90, bukan dari jumlah peserta yang hadir.
Region Jawa Tengah, DIY, Jawa Timur dan region Bali dan Nusa Tenggara diusulkan menjadi uji coba pada bulan pertama.</p>
<div class="kotak-info"><b>Keputusan pertama yang dibutuhkan.</b> Siapa yang menanggung perjalanan peserta paling menentukan anggaran: Rp{MILIAR(A["biaya_a"])} miliar bila
BNPB menanggung semua, atau Rp{MILIAR(A["biaya_b"])} miliar bila setiap instansi menanggung perjalanannya sendiri. Keputusan ini perlu diambil sebelum surat
undangan dikirim, karena surat undangan wajib menyebut siapa yang menanggung perjalanan. Sembilan keputusan lainnya tercantum di Bab 9.</div>
</section>''')

# ---------- BAB 1 ----------
skema = tabel(['Aspek', 'Per provinsi', 'Region (diusulkan)'], [
    ['<b>Jumlah acara</b>', '38 acara sehari', '8 acara; dua hari satu malam di luar Jawa, sehari di Jawa'],
    ['<b>Kerja tim BNPB</b>', '222 perjalanan dinas perorangan, 474 orang-hari', '70 perjalanan dinas perorangan, sekitar 210 orang-hari'],
    ['<b>Lama program, dua acara per bulan</b>', 'Sekitar 19 bulan', 'Sekitar 4 bulan'],
    ['<b>Kehadiran pimpinan BNPB</b>', 'Sulit hadir di 38 acara', 'Bisa hadir di 8 acara'],
    ['<b>Kedalaman bahasan per provinsi</b>', 'Sehari penuh untuk satu provinsi', 'Waktu dibagi 3 sampai 8 provinsi; meja kerja berjalan paralel'],
    ['<b>Jejaring</b>', 'Hanya di dalam provinsi', 'BPBD dan PTN lintas provinsi bertemu; masalah serupa dapat dijawab konsorsium kampus'],
    ['<b>Beban peserta</b>', 'Tidak bepergian', 'Satu sampai dua hari perjalanan; perlu surat tugas dan anggaran instansi bila tidak ditanggung BNPB'],
    ['<b>Risiko jadwal</b>', 'Satu acara batal hanya mengenai satu provinsi', 'Bencana di kota tuan rumah membatalkan acara untuk seluruh region'],
    ['<b>Biaya, BNPB menanggung perjalanan</b>', 'Rp2,02 miliar', 'Rp2,53 miliar'],
    ['<b>Biaya, peserta menanggung perjalanan</b>', 'Rp1,94 miliar', 'Rp0,96 miliar'],
], lebar=[26, 30, 44], kelas='rapat')
H.append(f'''<section class="hal">
{bab('Bab 1', 'Latar Belakang dan Tujuan', 'ide')}
{h3('1.1 Mengapa kunjungan satu per satu diganti', 'rute')}
<p>Kemitraan BNPB dengan perguruan tinggi selama ini dijalankan lewat kunjungan ke kampus satu per satu. Setiap kunjungan menghabiskan biaya perjalanan
dan waktu tim BNPB, tetapi hanya menjangkau satu kampus. Di dalam kunjungan itu, kampus mendengar paparan BNPB tanpa bertemu BPBD di daerahnya, padahal
BPBD yang paling mengetahui masalah lapangan. Masalah daerah dan minat riset kampus juga tercatat dalam bentuk yang berbeda-beda, sehingga sulit dipasangkan,
dan kampus tidak melihat kekuatan kampus lain yang dapat diajak bekerja sama.</p>
<p>Workshop region menjawab keempat kelemahan itu sekaligus. Satu acara mempertemukan BNPB, BPBD provinsi, dan tiga PTN teratas dari setiap provinsi di region itu.
Semua peserta datang membawa Tugas Pendahuluan dan pulang dengan daftar masalah daerah yang sudah dipasangkan dengan kampus, beserta rencana tindak lanjut yang bertanggal.</p>
{h3('1.2 Pilihan skema: per provinsi atau per region', 'hukum')}
<p>Skema region dipilih setelah dibandingkan dengan skema satu workshop per provinsi. Skema region memangkas kerja tim BNPB dari 38 acara menjadi 8 acara,
memperpendek program dari sekitar 19 bulan menjadi sekitar 4 bulan, dan membuka jejaring antarprovinsi. Biayanya bergantung pada siapa yang menanggung perjalanan peserta.
Bila BNPB menanggung semua perjalanan, skema region lebih mahal sekitar Rp0,5 miliar karena 12 orang dari setiap provinsi ikut terbang. Bila setiap instansi
menanggung perjalanannya sendiri, skema region menjadi sekitar separuh biaya skema per provinsi.</p>
{fig(skema, 'Perbandingan skema per provinsi dan skema region', 'Analisis Skema Workshop: Per Provinsi atau Per Region, 11 November 2026, dengan asumsi tiga PTN di setiap provinsi dan tarif tertinggi SBM 2026 (PMK 32/2025). Hitungan dengan daftar PTN terverifikasi ada di Bab 8.', 'tabel')}
{h3('1.3 Tujuan workshop', 'target')}
{ul(['Mengenal PTN teratas di tiap provinsi beserta pusat studi, pakar, fasilitas, dan wilayah binaannya.',
     'Mengumpulkan masalah kebencanaan daerah dari BPBD provinsi dalam format baku: fenomena bahaya, manajemen, kendala operasional, dan hambatan.',
     'Mengumpulkan ajuan riset kampus dalam format baku yang sama.',
     'Memasangkan masalah dengan kampus dan pakar, termasuk konsorsium lintas provinsi, lalu menyepakati jalur penyelesaiannya: selesai di tempat, masuk program BNPB, atau menjadi kerja sama.',
     'Mengisi basis data masalah dan ajuan riset daerah yang menjadi bahan kerja kemitraan BNPB dan perguruan tinggi berikutnya.'])}
{h3('1.4 Kedudukan dalam Grand Design Kemitraan', 'lembaga')}
<p>Workshop ini adalah pintu masuk dua pilar Grand Design Kemitraan BNPB dan Perguruan Tinggi 2027–2029, yaitu Belanja Masalah Daerah (pilar P1) dan Riset
dan Inovasi Bersama (pilar P2). Sesuai keputusan Grand Design, daerah tidak datang dengan tangan kosong. BNPB membawa profil risiko setiap provinsi dan daftar
masalah kandidat yang disusun dari data sebelum acara, sehingga BPBD cukup mengonfirmasi, mengoreksi, atau menambah masalahnya.</p>
</section>''')

# ---------- BAB 2 ----------
reg = tabel(['Region', 'Provinsi', 'Kota tuan rumah', 'Lama', 'Peserta'], [
    [f'<b>{r["nama"]}</b>', ', '.join(p[0] for p in r['prov']), r['kota'], r['lama'], f(r['total'])] for r in R
] + [['<b>Jumlah</b>', f'{A["prov"]} provinsi', '8 kota', '', f(A['total'])]], kanan=(4,), lebar=[21, 44, 13, 12, 10], kelas='rapat total')
H.append(f'''<section class="hal">
{bab('Bab 2', 'Konsep Acara dan Pembagian Region', 'peta')}
{h3('2.1 Format acara', 'kalender')}
<p>Delapan workshop region diadakan di kota simpul penerbangan. Enam region di luar Jawa berlangsung dua hari satu malam. Hari pertama dimulai pukul 13.00 dan
hari kedua selesai pukul 15.00, sehingga peserta dapat terbang pagi pada hari pertama dan pulang sore pada hari kedua. Dua region di Jawa berlangsung sehari,
karena peserta dapat pulang pada hari yang sama dengan kereta.</p>
<p>Nama kerja yang diusulkan adalah <b>Temu Masalah dan Riset Kebencanaan Region (nama region): BNPB, BPBD, dan Perguruan Tinggi</b>. BPBD provinsi di kota
tuan rumah bertindak sebagai tuan rumah daerah, dan satu PTN di kota itu menjadi mitra tempat. Panitia inti tetap berada di BNPB.</p>
{h3('2.2 Pembagian region dan kota tuan rumah', 'peta')}
<p>Delapan region mengikuti usulan pembagian wilayah, dengan Bali dimasukkan ke region Nusa Tenggara. Kota tuan rumah dipilih dari simpul penerbangan region,
bukan dari kota yang hitungannya paling murah, karena kota termurah umumnya tidak memiliki penerbangan langsung dari semua ibu kota provinsi di regionnya.</p>
{fig(reg, 'Delapan region, kota tuan rumah, dan jumlah peserta per acara', 'Rancangan workshop region, 11 November 2026. Peserta termasuk 10 orang tim BNPB per acara.', 'tabel')}
{fig(peserta_region(), 'Susunan peserta per acara menurut unsur', f'Rancangan workshop region, 11 November 2026; daftar {A["ptn"]} PTN terverifikasi 11 November 2026 (Lampiran A).')}
{h3('2.3 Tugas Pendahuluan wajib, tetapi tidak menggugurkan', 'periksa')}
<p>Semua lembaga yang diundang tetap boleh hadir walaupun belum mengumpulkan Tugas Pendahuluan. Namun, jadwal paparan, susunan meja kerja, dan slot klinik
pencocokan disusun dari isian yang masuk sampai H-14, sehingga lembaga yang mengumpulkan tepat waktu mendapat tempat lebih dulu. Lembaga yang belum mengumpulkan
diingatkan pada H-17, H-10, dan H-3. Lembaga itu lalu mengisi formulir yang sama di meja registrasi atau selama sesi pembukaan, dan masalah atau ajuannya
dicocokkan di klinik bila slot masih tersedia, atau sesudah acara.</p>
</section>''')

# ---------- BAB 3 ----------
unsur = tabel(['Unsur', 'Yang diundang', 'Jumlah', 'Peran di acara', 'Tugas Pendahuluan'], [
    ['<b>BNPB</b>', 'Pimpinan pembuka, unit BNPB yang membidangi masalah prioritas region, tim data, dan tim Kemitraan Kampus', '10 orang per acara',
     'Memaparkan profil risiko region, memimpin meja kerja dan klinik, menjelaskan skema program dan pendanaan BNPB', 'Profil risiko tiap provinsi dan daftar masalah kandidat'],
    ['<b>BPBD provinsi</b>', 'Kepala Pelaksana dan dua kepala bidang', '3 orang per provinsi', 'Memaparkan masalah provinsi dan kabupaten/kota di wilayahnya', 'Lembar Masalah Daerah'],
    ['<b>PTN teratas</b>', 'Tiga PTN per provinsi: wakil rektor atau ketua LPPM bidang riset dan kerja sama, ketua pusat studi bencana, dan satu pakar',
     '3 orang per PTN, 9 orang per provinsi', 'Memperkenalkan kampus, memamerkan ajuan riset, mengambil masalah', 'Profil Kampus dan Ajuan Riset'],
], lebar=[13, 27, 13, 27, 20], kelas='rapat')
jabatan = tabel(['Lembaga', 'Orang', 'Jabatan yang diminta', 'Alasan'], [
    ['<b>BPBD provinsi</b>', '1', 'Kepala Pelaksana', 'Pengambil keputusan dan penanda tangan kerja sama'],
    ['', '1', 'Kepala Bidang Pencegahan dan Kesiapsiagaan', 'Pemegang sebagian besar masalah pengurangan risiko'],
    ['', '1', 'Kepala Bidang yang membidangi masalah yang dipaparkan, yaitu Kedaruratan dan Logistik, atau Rehabilitasi dan Rekonstruksi', 'Pemilik masalah di meja kerja dan klinik'],
    ['<b>PTN</b>', '1', 'Wakil rektor bidang riset dan kerja sama, atau Ketua LPPM', 'Pengambil keputusan kerja sama dari pihak kampus'],
    ['', '1', 'Kepala pusat studi atau pusat riset kebencanaan; bila tidak ada, dosen koordinator kebencanaan', 'Penanggung jawab ajuan riset'],
    ['', '1', 'Satu pakar sesuai bahaya prioritas provinsinya', 'Mengambil masalah di klinik pencocokan'],
], kanan=(1,), lebar=[15, 8, 45, 32], kelas='rapat')
tim = tabel(['Peran tim BNPB', 'Orang', 'Unit asal', 'Tugas'], [
    ['<b>Pimpinan pembuka</b>', '1', 'Kepala BNPB, Sekretaris Utama, atau Deputi', 'Membuka acara dan memimpin pleno'],
    ['<b>Ketua panitia</b>', '1', 'Staf Ahli Kepala BNPB Bidang Riset, Inovasi dan Kerja Sama Perguruan Tinggi', 'Alur acara dan keputusan di lapangan'],
    ['<b>Fasilitator meja</b>', '4', 'Direktorat Pemetaan dan Evaluasi Risiko Bencana; Deputi Bidang Pencegahan (Direktorat Peringatan Dini, Kesiapsiagaan, atau Mitigasi, sesuai klaster); Direktorat Penanganan Darurat Wilayah yang membawahi region itu; Deputi Bidang Rehabilitasi dan Rekonstruksi', 'Memimpin meja kerja dan klinik pencocokan'],
    ['<b>Tim data</b>', '2', 'Pusat Data, Informasi, dan Komunikasi Kebencanaan; tim data platform', 'Profil risiko, basis data, peta pasangan awal'],
    ['<b>Kerja sama dan notula</b>', '1', 'Biro Hukum, Organisasi, dan Kerja Sama', 'Notula, rekap pleno, naskah awal kerja sama'],
    ['<b>Administrasi dan keuangan</b>', '1', 'Satuan kerja penyelenggara', 'Registrasi, daftar hadir, berkas penggantian biaya'],
], kanan=(1,), lebar=[19, 7, 46, 28], kelas='rapat')
H.append(f'''<section class="hal">
{bab('Bab 3', 'Peserta', 'warga')}
<p>Delapan acara mengundang {A["prov"]} BPBD provinsi ({A["bpbd_o"]} orang) dan {A["ptn"]} PTN ({A["ptn_o"]} orang), sehingga ada {A["luar"]} peserta dari luar BNPB,
ditambah 10 orang tim BNPB per acara. Peserta ditulis menurut jabatan. Nama orang diisi setiap instansi lewat surat tugas, sehingga daftar ini tidak memuat data pribadi.</p>
{h3('3.1 Unsur yang diundang', 'lembaga')}
{fig(unsur, 'Unsur peserta, peran, dan Tugas Pendahuluan', 'Rancangan workshop region, 11 November 2026. LPPM: Lembaga Penelitian dan Pengabdian kepada Masyarakat.', 'tabel')}
<p>BPBD kabupaten/kota tidak diundang. Masalah dari kabupaten/kota dihimpun BPBD provinsi lewat Tugas Pendahuluan dan dibawakan oleh BPBD provinsi.
Undangan ditujukan kepada unit kerja yang membidangi kerja sama, bukan kepada rektor secara pribadi.</p>
{h3('3.2 Jabatan yang diminta', 'cek')}
{fig(jabatan, 'Jabatan peserta dari BPBD provinsi dan PTN', 'Rancangan workshop region, 11 November 2026', 'tabel')}
{h3('3.3 Tim BNPB per acara', 'warga')}
{fig(tim, 'Susunan tim BNPB, 10 orang per acara', 'Rancangan workshop region, 11 November 2026', 'tabel')}
<p>Fasilitator dari Deputi Bidang Pencegahan dipilih menurut klaster bahaya dominan region, misalnya Direktorat Mitigasi Bencana untuk region yang didominasi gempa dan longsor.</p>
{h3('3.4 Pemilihan PTN teratas', 'kampus')}
<p>PTN teratas dipilih BNPB sebelum undangan dikirim. Kriteria yang diusulkan adalah jumlah pakar kebencanaan di direktori akademisi BNPB, publikasi kebencanaan lima
tahun terakhir, keberadaan pusat studi bencana, dan kerja sama yang masih berjalan dengan BPBD. Provinsi yang memiliki kurang dari tiga PTN mengundang semua PTN yang ada.</p>
<p>Nama dan status negeri {A["ptn"]} PTN sudah diperiksa pada 11 November 2026 lewat registri satuan pendidikan Kementerian Pendidikan Dasar dan Menengah, situs resmi
kampus, dan peraturan presiden tentang pendirian atau alih status. Empat kampus sudah berganti nama: IAIN Palangka Raya, IAIN Sultan Amai Gorontalo, IAIN Kendari,
dan IAIN Ambon kini menjadi universitas Islam negeri (UIN). Sepuluh provinsi mendapat tambahan PTN yang semula terlewat. Pangkalan Data Pendidikan Tinggi (PDDikti)
belum dapat dibaca otomatis, sehingga pemeriksaan akhir di PDDikti tetap diperlukan sebelum undangan dikirim. Daftar lengkap per region ada di Lampiran A.</p>
<div class="kotak-info"><b>Provinsi dengan kurang dari tiga PTN.</b> Sepuluh provinsi memang tidak memiliki PTN ketiga. Papua Tengah dan Papua Pegunungan belum memiliki
PTN sama sekali, sesuai pernyataan Menteri Pendidikan Tinggi, Sains, dan Teknologi pada Desember 2025. Untuk keduanya ada dua pilihan: mengundang perguruan tinggi
swasta utama setempat, misalnya Universitas Satya Wiyata Mandala di Nabire dan UNAIM Yapis Wamena, atau menambah kursi bagi Universitas Cenderawasih.</div>
</section>''')

# ---------- BAB 4 ----------
lembar = tabel(['Kolom', 'Isian'], [
    ['<b>Wilayah</b>', 'Provinsi atau kabupaten/kota'],
    ['<b>Bahaya</b>', 'Pilih satu: banjir, longsor, gempa, tsunami, gunung api, kekeringan, kebakaran hutan dan lahan, cuaca ekstrem, abrasi dan rob, kualitas udara, atau multibahaya'],
    ['<b>Aspek</b>', 'Pilih satu: pengetahuan bahaya, peringatan dini, mitigasi struktural, tata ruang dan lingkungan, kelembagaan dan dokumen, kesiapsiagaan masyarakat, kelompok rentan dan kesehatan, logistik dan sarana, pemulihan, pendanaan dan ekonomi'],
    ['<b>Jenis masalah</b>', 'Fenomena bahaya, manajemen, kendala operasional, atau hambatan'],
    ['<b>Judul</b>', 'Satu kalimat, paling banyak 120 karakter'],
    ['<b>Uraian</b>', 'Apa yang terjadi, di mana, sejak kapan, dan siapa yang terdampak'],
    ['<b>Bukti</b>', 'Angka, kejadian, dan tahun yang menunjukkan masalah itu nyata'],
    ['<b>Dampak bila tidak ditangani</b>', 'Korban, kerugian, atau layanan yang terganggu'],
    ['<b>Yang sudah dicoba</b>', 'Upaya sebelumnya dan alasan belum berhasil'],
    ['<b>Kebutuhan</b>', 'Kajian, data dan peta, model atau peringatan dini, teknologi tepat guna, pelatihan, pendampingan dokumen, atau tenaga'],
    ['<b>Jalur yang diharapkan</b>', 'Saran langsung, program BNPB, atau kerja sama dengan kampus'],
    ['<b>Data yang bisa dibagikan</b>', 'Data yang dimiliki BPBD dan bersedia dibuka untuk riset'],
    ['<b>Narahubung</b>', 'Nama dan jabatan; nomor telepon hanya untuk panitia dan tidak diterbitkan'],
], lebar=[26, 74], kelas='rapat')
ajuan = tabel(['Kolom Ajuan Riset', 'Isian'], [
    ['<b>Judul</b>', 'Satu kalimat'],
    ['<b>Bahaya dan aspek</b>', 'Daftar pilihan yang sama dengan Lembar Masalah Daerah'],
    ['<b>Wilayah</b>', 'Kabupaten/kota sasaran'],
    ['<b>Masalah yang dijawab</b>', 'Merujuk masalah kandidat dari BNPB atau masalah yang diketahui kampus'],
    ['<b>Metode ringkas</b>', 'Paling banyak 150 kata'],
    ['<b>Keluaran</b>', 'Kajian, peta, model, alat, modul pelatihan, atau rekomendasi kebijakan'],
    ['<b>Kesiapan teknologi</b>', 'Tingkat Kesiapterapan Teknologi (TKT), bila berupa inovasi'],
    ['<b>Durasi dan kebutuhan biaya</b>', 'Perkiraan bulan dan rentang biaya'],
    ['<b>Sumber dana yang dibidik</b>', 'Dana kampus, dana riset nasional, donor, atau BNPB'],
    ['<b>Tim</b>', 'Ketua dan anggota beserta bidangnya'],
], lebar=[26, 74], kelas='rapat')
H.append(f'''<section class="hal">
{bab('Bab 4', 'Tugas Pendahuluan', 'dokumen')}
<p>Tugas Pendahuluan dikumpulkan paling lambat H-14 lewat formulir daring dengan kolom baku, sehingga isiannya langsung menjadi baris basis data tanpa diketik ulang.
Ada tiga paket: satu disiapkan BNPB sebagai bahan awal, satu diisi BPBD provinsi, dan satu diisi kampus.</p>
{h3('4.1 Bahan awal dari BNPB, dikirim H-30', 'data')}
<p>BNPB mengirim profil risiko provinsi dan setiap kabupaten/kota kepada BPBD dan kampus. Isinya Indeks Risiko Bencana Indonesia (IRBI) dan InaRISK, riwayat kejadian,
paparan penduduk dan bangunan, kapasitas daerah, serta daftar masalah kandidat yang disusun otomatis dari data. Dengan bahan ini BPBD tidak mulai dari kertas kosong.
BPBD mengonfirmasi, mengoreksi, atau menolak masalah kandidat, lalu menambah masalah yang tidak terlihat di data.</p>
{h3('4.2 Lembar Masalah Daerah, diisi BPBD provinsi', 'lembaga')}
<p>BPBD provinsi mengisi lima sampai delapan masalah prioritas untuk seluruh provinsinya, termasuk masalah kabupaten/kota. Untuk itu BPBD provinsi meneruskan tautan
formulir kepada BPBD kabupaten/kota pada H-30 dan memilih masalah yang dibawa paling lambat H-14. Satu sampai dua masalah dipilih untuk dipaparkan di acara dengan
templat tiga slide dari panitia. Masalah kabupaten/kota yang tidak terpilih tetap masuk basis data dengan status diajukan, sehingga dapat diambil kampus sesudah acara.</p>
{fig(lembar, 'Kolom Lembar Masalah Daerah', 'Rancangan workshop region, 11 November 2026', 'tabel')}
{h3('4.3 Profil Kampus dan Ajuan Riset, diisi PTN', 'kampus')}
<p>Setiap PTN mengisi satu Profil Kampus dan paling banyak tiga Ajuan Riset. Setiap ajuan juga dibuat sebagai poster satu halaman untuk galeri pada hari pertama.
Profil Kampus memuat pusat studi kebencanaan, program studi terkait, daftar pakar beserta bidang dan tautan profil SINTA atau Google Scholar, laboratorium dan
fasilitas, desa binaan atau Kuliah Kerja Nyata (KKN) tematik, serta perjanjian kerja sama dengan BNPB atau BPBD yang masih berlaku.</p>
{fig(ajuan, 'Kolom Ajuan Riset', 'Rancangan workshop region, 11 November 2026', 'tabel')}
</section>''')

# ---------- BAB 5 ----------
dua = tabel(['Hari dan jam', 'Sesi', 'Isi', 'Pemimpin sesi'], [
    ['H1 13.00–13.45', '<b>Pembukaan</b>', 'Sambutan pimpinan BNPB dan pemerintah provinsi tuan rumah; tujuan dan aturan main', 'BNPB, BPBD tuan rumah'],
    ['H1 13.45–14.30', '<b>Profil risiko region</b>', 'Bahaya utama, riwayat kejadian, paparan, kapasitas, dan masalah kandidat yang sudah dikonfirmasi BPBD, per provinsi', 'Tim data BNPB'],
    ['H1 14.30–16.30', '<b>Paparan masalah provinsi</b>', 'Setiap BPBD provinsi 10 menit dan 5 menit tanya jawab; 3 sampai 8 provinsi', 'BPBD provinsi'],
    ['H1 16.30–17.00', 'Rehat', '', ''],
    ['H1 17.00–18.30', '<b>Meja kerja putaran pertama</b>', 'Meja per klaster bahaya; BPBD, kampus, dan BNPB membedah akar masalah dan data yang tersedia', 'Fasilitator BNPB per meja'],
    ['H1 19.00–21.00', '<b>Makan malam dan galeri kampus</b>', 'Poster Ajuan Riset dipajang; jejaring antarprovinsi dan penjajakan konsorsium', 'PTN'],
    ['H2 08.00–08.30', '<b>Peta pasangan awal</b>', 'Daftar pasangan masalah dan kampus yang disusun panitia semalam', 'Tim Kemitraan Kampus BNPB'],
    ['H2 08.30–10.30', '<b>Meja kerja putaran kedua</b>', 'Perumusan per masalah: apa yang dikerjakan kampus, apa yang diperlukan dari BNPB dan BPBD', 'Fasilitator BNPB per meja'],
    ['H2 10.30–12.30', '<b>Klinik pencocokan</b>', 'Pertemuan terjadwal 20 menit per pasangan BPBD dan kampus, paralel di beberapa meja', 'BNPB'],
    ['H2 12.30–13.30', 'Istirahat', '', ''],
    ['H2 13.30–14.30', '<b>Rencana tindak lanjut</b>', 'Setiap pasangan mengisi kartu rencana: jalur, keluaran, narahubung kedua pihak, tanggal langkah pertama', 'Pasangan, didampingi BNPB'],
    ['H2 14.30–15.00', '<b>Pleno dan penutupan</b>', 'Rekap jumlah masalah, pasangan, dan rencana per jalur; pernyataan minat kerja sama', 'BNPB'],
], lebar=[15, 21, 44, 20], kelas='rapat')
satu = tabel(['Jam', 'Sesi', 'Isi'], [
    ['08.00–08.30', '<b>Pembukaan</b>', 'Sambutan dan aturan main'],
    ['08.30–09.00', '<b>Profil risiko region</b>', 'Tiga provinsi, disusun tim data BNPB'],
    ['09.00–09.45', '<b>Paparan masalah provinsi</b>', 'Tiga BPBD provinsi, masing-masing 10 menit dan 5 menit tanya jawab'],
    ['09.45–12.00', '<b>Meja kerja per klaster bahaya</b>', 'Satu putaran, langsung sampai perumusan per masalah'],
    ['12.00–13.00', '<b>Istirahat dan galeri kampus</b>', 'Poster Ajuan Riset'],
    ['13.00–14.30', '<b>Klinik pencocokan</b>', '20 menit per pasangan'],
    ['14.30–15.30', '<b>Rencana tindak lanjut</b>', 'Kartu rencana per pasangan'],
    ['15.30–16.00', '<b>Pleno dan penutupan</b>', 'Rekap dan pernyataan minat'],
], lebar=[15, 30, 55], kelas='rapat')
H.append(f'''<section class="hal">
{bab('Bab 5', 'Susunan Acara', 'jam')}
<p>Sebagian besar waktu dipakai di meja kerja dan klinik pencocokan, bukan di panggung. Paparan panggung memakai sekitar 4,5 jam dari 13 jam kerja pada format dua hari,
dan sekitar 2 jam dari 7 jam kerja pada format sehari.</p>
{kartu([('13 jam', 'waktu kerja format dua hari satu malam, enam region di luar Jawa', C['navy'], 'jam'),
        ('7 jam', 'waktu kerja format sehari, dua region di Jawa', BIRU, 'jam'),
        ('20 menit', 'per pasangan BPBD dan kampus di klinik pencocokan', C['oranye'], 'tangan'),
        ('4–6 meja', 'meja kerja per klaster bahaya dominan region', C['slate'], 'meja')])}
{h3('5.1 Format dua hari satu malam, enam region di luar Jawa', 'kalender')}
{fig(dua, 'Susunan acara format dua hari satu malam', 'Rancangan workshop region, 11 November 2026', 'tabel')}
{h3('5.2 Format sehari, region Jawa', 'kalender')}
{fig(satu, 'Susunan acara format sehari', 'Rancangan workshop region, 11 November 2026', 'tabel')}
{h3('5.3 Jumlah meja dan aturan sesi', 'meja')}
<p>Meja kerja dibuka sesuai klaster bahaya dominan region, biasanya empat sampai enam meja. Satu meja klinik melayani enam pasangan dalam dua jam, sehingga jumlah
meja klinik sama dengan jumlah masalah tervalidasi dibagi enam. Region Maluku dan Papua, dengan sekitar 48 masalah, membutuhkan delapan meja klinik.</p>
<p>Masalah manajemen yang sensitif dibahas di meja kerja tertutup, tidak di panggung. Pernyataan minat di pleno bukan penandatanganan perjanjian; perjanjian kerja sama
disusun sesudah acara melalui jalur kerja sama pada Bab 7.</p>
</section>''')

# ---------- BAB 6 ----------
basis = tabel(['Tabel', 'Satu baris berisi', 'Kunci penghubung', 'Sumber'], [
    ['<b>Masalah Daerah</b>', 'Satu masalah dari BPBD, atau masalah kandidat dari data yang sudah dikonfirmasi', 'Kode wilayah, bahaya, aspek', 'Lembar Masalah Daerah, bahan awal BNPB, meja kerja'],
    ['<b>Ajuan Riset</b>', 'Satu ajuan dari satu PTN atau konsorsium', 'Kampus, bahaya, aspek, wilayah', 'Profil Kampus dan Ajuan Riset'],
    ['<b>Pasangan</b>', 'Satu masalah yang dipasangkan dengan satu ajuan atau satu kampus, beserta rencana tindak lanjutnya', 'Nomor masalah, nomor ajuan atau kampus', 'Klinik pencocokan dan kartu rencana'],
], lebar=[16, 36, 22, 26], kelas='rapat')
H.append(f'''<section class="hal">
{bab('Bab 6', 'Keluaran: Basis Data Masalah dan Ajuan Riset', 'data')}
<p>Setiap workshop mengisi satu basis data nasional yang terdiri atas tiga tabel: Masalah Daerah, Ajuan Riset, dan Pasangan. Kolomnya sama dengan Tugas Pendahuluan,
sehingga isian formulir langsung menjadi baris tanpa diketik ulang. Basis data ini dimuat ke modul Kemitraan Kampus di sistem data BNPB, yang sudah dirancang untuk
pilar Belanja Masalah Daerah.</p>
{fig(basis, 'Tiga tabel basis data masalah dan ajuan riset daerah', 'Rancangan workshop region, 11 November 2026', 'tabel')}
{h3('6.1 Kategori yang sama untuk masalah dan ajuan', 'puzzle')}
<p>Masalah dan ajuan sama-sama diberi pasangan bahaya dan aspek: 11 bahaya dikali 10 aspek, sehingga ada 110 kategori. Kategori yang sama membuat masalah antarprovinsi
dapat digabung dan dibandingkan, misalnya semua masalah peringatan dini banjir di seluruh provinsi.</p>
{h3('6.2 Status masalah', 'periksa')}
<p>Setiap masalah melewati status diajukan, ditelaah, lalu tervalidasi, digabung, atau ditolak. Masalah tervalidasi kemudian dicocokkan, diambil kampus, berjalan,
dan selesai. Status ini sama dengan alur yang sudah ditetapkan di modul Kemitraan Kampus.</p>
{h3('6.3 Cara pencocokan', 'tangan')}
<p>Kandidat pasangan diambil dari tiga sumber: kesamaan kategori masalah dan ajuan, rekomendasi pakar dari direktori akademisi berdasarkan publikasi dan jarak ke lokasi,
serta hasil diskusi meja kerja. Rekomendasi otomatis diberi label "belum diuji" sampai algoritmanya lolos uji. Keputusan akhir pasangan tetap diambil manusia di klinik pencocokan.</p>
{h3('6.4 Aturan data', 'perisai')}
<p>Nomor telepon dan alamat surel narahubung hanya untuk panitia dan tidak diterbitkan. Masalah manajemen yang sensitif dapat ditandai "internal", sehingga hanya terlihat
oleh BNPB, BPBD terkait, dan kampus pasangannya. Bila modul Kemitraan Kampus belum siap dipakai BPBD saat workshop pertama, formulir sementara memakai kolom yang sama
dan hasilnya diimpor ke modul sesudah modul siap.</p>
</section>''')

# ---------- BAB 7 ----------
jalur = tabel(['Jalur', 'Untuk masalah yang', 'Bentuk penyelesaian', 'Pemegang', 'Batas langkah pertama'], [
    ['<b>A. Selesai di tempat</b>', 'Cukup dijawab dengan saran teknis, data, atau kontak pakar', 'Saran tertulis dari meja kerja, berbagi data, rujukan pakar', 'Fasilitator meja dan kampus', 'Selesai di acara atau paling lambat H+14'],
    ['<b>B. Program BNPB</b>', 'Sejalan dengan program yang sudah ada', 'Agenda riset tahunan BNPB, pendampingan penyusunan dokumen, magang mahasiswa di BPBD, KKN tematik kebencanaan, pelatihan', 'Unit BNPB pemilik program', 'Masuk rencana kerja unit paling lambat H+30'],
    ['<b>C. Kerja sama</b>', 'Membutuhkan riset, alat, atau pendampingan lebih dari satu kegiatan', 'Perjanjian kerja sama BPBD dan kampus; proposal bersama BNPB dan kampus untuk dana riset nasional atau donor', 'BPBD dan kampus, didampingi tim Kemitraan Kampus BNPB', 'Draf perjanjian atau kerangka proposal paling lambat H+60'],
], lebar=[15, 20, 29, 18, 18], kelas='rapat')
H.append(f'''<section class="hal">
{bab('Bab 7', 'Tindak Lanjut sesudah Workshop', 'tangan')}
<p>Setiap masalah tervalidasi keluar dari workshop dengan satu dari tiga jalur, satu narahubung di BPBD, satu narahubung di kampus, dan tanggal langkah pertama.
Klinik pencocokan adalah titik penentunya. Masalah yang belum mendapat pasangan tetap tercatat dan ditawarkan kepada kampus di region lain lewat basis data nasional.</p>
{fig(alur(), 'Alur workshop region dari H-30 sampai H+90', 'Rancangan workshop region, 11 November 2026')}
{h3('7.1 Tiga jalur penyelesaian', 'rute')}
{fig(jalur, 'Jalur penyelesaian masalah, pemegang, dan batas langkah pertama', 'Rancangan workshop region, 11 November 2026', 'tabel')}
{h3('7.2 Pemantauan', 'grafik')}
<p>Tim Kemitraan Kampus BNPB memeriksa setiap pasangan pada H+30, H+60, dan H+90. Status pasangan diperbarui di basis data, dan provinsi dengan banyak pasangan macet
mendapat pendampingan tambahan. Rekap per provinsi dilaporkan kepada pimpinan BNPB setiap triwulan.</p>
<div class="kotak-info"><b>Lingkup peran BNPB.</b> BNPB tidak menjanjikan dana untuk setiap ajuan riset. Peran BNPB adalah menyediakan masalah yang nyata, data,
akses ke BPBD, surat dukungan untuk proposal, dan program yang sudah ada. Hal ini disampaikan sejak surat undangan dan diulang pada sesi pembukaan.</div>
</section>''')

# ---------- BAB 8 ----------
ruang = tabel(['Ruang', 'Kapasitas', 'Kegunaan'], [
    ['<b>Ruang pleno</b>', 'Seluruh peserta, 46 sampai 73 orang, meja bundar', 'Pembukaan, profil risiko, paparan masalah, pleno'],
    ['<b>Meja kerja</b>', '4 sampai 6 meja, 10 sampai 15 orang per meja', 'Meja kerja per klaster bahaya; boleh disekat di ruang pleno'],
    ['<b>Meja klinik</b>', 'Jumlah masalah tervalidasi dibagi 6, empat kursi per meja', 'Klinik pencocokan dan pengisian kartu rencana'],
    ['<b>Area galeri</b>', 'Satu papan per ajuan riset, paling banyak 27 sampai 45 poster per region', 'Galeri kampus dan makan malam jejaring'],
    ['<b>Ruang sekretariat</b>', 'Tim data dan administrasi', 'Registrasi, penyusunan peta pasangan semalam, berkas pertanggungjawaban'],
], lebar=[18, 42, 40], kelas='rapat')
urut_b = sorted(R, key=lambda r: -BIAYA[r['nama']][0])
biaya = tabel(['Region', 'Kota', 'Lama', 'Peserta', 'BNPB menanggung semua perjalanan, Rp juta', 'Peserta menanggung perjalanannya sendiri, Rp juta'], [
    [f'<b>{r["nama"]}</b>', r['kota'], r['lama'].replace(' 1 malam', ''), f(r['total']), f(BIAYA[r['nama']][0]), f(BIAYA[r['nama']][1])] for r in urut_b
] + [['<b>Jumlah</b>', '', '', f(A['total']), f(A['biaya_a']), f(A['biaya_b'])]], kanan=(3, 4, 5), lebar=[26, 12, 9, 11, 21, 21], kelas='rapat total')
H.append(f'''<section class="hal">
{bab('Bab 8', 'Logistik, Administrasi, dan Anggaran', 'uang')}
{h3('8.1 Ruang dan perlengkapan', 'meja')}
<p>Setiap acara membutuhkan satu ruang pleno, empat sampai delapan meja kerja dan meja klinik yang dapat berjalan bersamaan, satu area galeri, dan tim BNPB 10 orang
dengan peran tetap. Paket rapat hotel dipilih yang sudah memuat ruang paralel, sehingga tidak ada sewa ruang terpisah.</p>
{fig(ruang, 'Kebutuhan ruang per acara', 'Rancangan workshop region, 11 November 2026', 'tabel')}
<p>Perlengkapan yang dibutuhkan adalah dua proyektor dan layar, pengeras suara dengan empat mikrofon, jaringan internet untuk formulir daring, papan poster, kertas plano
dan spidol per meja, papan nama setiap klaster bahaya, kode QR formulir Tugas Pendahuluan dan kartu rencana, kartu rencana tercetak dua lembar per masalah, serta dua laptop untuk tim data.</p>
{h3('8.2 Administrasi', 'dokumen')}
{ul(['Surat undangan BNPB dikirim pada H-40 kepada BPBD provinsi dan unit kerja sama setiap PTN, dengan format surat dinas BNPB. Surat menyebut dengan jelas siapa yang menanggung perjalanan peserta.',
     'Instansi peserta menerbitkan surat tugas sendiri; tim BNPB berangkat dengan surat tugas BNPB.',
     'Paket rapat dikontrak dengan hotel di kota tuan rumah sesuai SBM provinsi itu: paket fullboard untuk malam pertama dan paket fullday untuk hari kedua.',
     'Bila BNPB menanggung perjalanan peserta, penggantian dibayar sesuai pengeluaran nyata dengan batas SBM. Peserta menyerahkan tiket, pas naik pesawat, dan bukti transport bandara di meja administrasi.',
     'Berkas pertanggungjawaban berisi daftar hadir per sesi, notula, foto, dan rekap keluaran dari basis data.',
     'Nomor telepon dan alamat surel narahubung hanya disimpan panitia dan tidak masuk bahan acara.'])}
{h3('8.3 Anggaran', 'uang')}
<p>Delapan acara dengan {A["luar"]} peserta dari luar BNPB membutuhkan <b>Rp{MILIAR(A["biaya_a"])} miliar</b> bila BNPB menanggung perjalanan semua peserta, atau
<b>Rp{MILIAR(A["biaya_b"])} miliar</b> bila BPBD dan PTN menanggung perjalanannya sendiri. Angka memakai tarif tertinggi SBM 2026 dalam Peraturan Menteri Keuangan (PMK)
Nomor 32 Tahun 2025, sehingga realisasinya umumnya lebih rendah. Hitungan ini memakai {A["ptn"]} PTN pada daftar terverifikasi. Analisis Skema memakai asumsi tiga PTN
di setiap provinsi, sehingga angkanya sedikit berbeda dari Tabel 1, tetapi kesimpulan perbandingan skemanya tetap berlaku.</p>
{fig(biaya, 'Anggaran per region menurut cara pembiayaan perjalanan, Rp juta', 'Model biaya dari tarif PMK 32/2025 (SBM 2026), daftar PTN terverifikasi 11 November 2026', 'tabel')}
{fig(anggaran_region(), 'Anggaran per region, Rp juta', 'Model biaya dari tarif PMK 32/2025 (SBM 2026)')}
<p><b>Yang dihitung.</b> Bila BNPB menanggung semua perjalanan: tiket pulang-pergi peserta dan tim, transport bandara, paket rapat fullboard dan fullday, uang harian rapat
fullboard Rp130.000 per hari di region luar Jawa atau uang harian perjalanan di region Jawa, hotel dan uang harian tim untuk malam sebelum acara, serta transport lokal
peserta dari kota tuan rumah. Bila peserta menanggung perjalanannya sendiri, BNPB hanya membayar paket rapat fullday semua peserta dan seluruh biaya tim BNPB.</p>
<p><b>Yang belum dihitung.</b> Honor narasumber, bahan cetak dan poster, cenderamata, dan selisih tarif hotel untuk pejabat eselon II. Pilihan tengah, yaitu BNPB
hanya menanggung perjalanan BPBD provinsi, juga belum dihitung.</p>
</section>''')

# ---------- BAB 9 ----------
bulan = tabel(['Bulan (usulan)', 'Region', 'Alasan'], [
    ['1', 'Jawa Tengah, DIY, Jawa Timur', 'Uji coba format sehari dengan biaya rendah dan banyak PTN'],
    ['1', 'Bali dan Nusa Tenggara', 'Uji coba format dua hari dengan region kecil, tiga provinsi'],
    ['2', 'Sulawesi; Banten, DKI Jakarta, Jawa Barat', 'Format sudah diperbaiki dari dua uji coba'],
    ['3', 'Sumatera bagian utara; Sumatera bagian selatan', 'Dijadwalkan di luar puncak musim kebakaran hutan dan lahan'],
    ['4', 'Kalimantan; Maluku dan Papua', 'Region terbesar dan terjauh, setelah format paling matang'],
], kanan=(0,), lebar=[14, 40, 46], kelas='rapat')
ukuran = tabel(['Ukuran', 'Cara menghitung', 'Sasaran usulan'], [
    ['<b>Tugas Pendahuluan tepat waktu</b>', 'Lembaga yang mengumpulkan sampai H-14 dibagi lembaga yang diundang', '80%'],
    ['<b>Tugas Pendahuluan lengkap</b>', 'Lembaga yang mengumpulkan sampai hari acara dibagi lembaga yang diundang', '100%'],
    ['<b>Masalah tervalidasi</b>', 'Jumlah masalah yang lolos telaah per provinsi', 'Paling sedikit 5'],
    ['<b>Masalah berpasangan</b>', 'Masalah tervalidasi yang memiliki kampus di akhir acara', '60%'],
    ['<b>Konsorsium lintas provinsi</b>', 'Pasangan yang melibatkan PTN dari provinsi lain', 'Paling sedikit 2 per region'],
    ['<b>Rencana bertanggal</b>', 'Pasangan dengan narahubung dua pihak dan tanggal langkah pertama', '100% dari pasangan'],
    ['<b>Pasangan berjalan</b>', 'Pasangan yang langkah pertamanya terlaksana pada H+90', '50%'],
    ['<b>Proposal bersama</b>', 'Proposal BNPB dan kampus yang diajukan ke pemberi dana dalam 6 bulan', 'Paling sedikit 2 per region'],
], lebar=[27, 53, 20], kelas='rapat')
risiko = tabel(['Risiko', 'Pencegahan'], [
    ['Tugas Pendahuluan terlambat karena tidak menggugurkan', 'Tiga kali pengingat, bahan awal BNPB sehingga BPBD tinggal mengonfirmasi, serta slot paparan dan klinik didahulukan bagi yang tepat waktu'],
    ['Tugas Pendahuluan diisi seadanya', 'Contoh isian yang baik dan sesi daring pada H-21'],
    ['BPBD enggan membuka masalah manajemen', 'Masalah sensitif dibahas di meja tertutup dan dapat ditandai "internal" di basis data'],
    ['Peserta tidak hadir karena biaya perjalanan, bila ditanggung instansi sendiri', 'Undangan pada H-40 dengan keterangan pembiayaan yang jelas, sehingga instansi sempat menganggarkan'],
    ['Penerbangan dari Papua dan Maluku terlambat atau batal', 'Acara mulai pukul 13.00; provinsi terjauh mendapat urutan paparan terakhir'],
    ['Region Maluku dan Papua terlalu besar untuk satu acara', 'Delapan meja klinik; pilihan memecah menjadi dua acara'],
    ['Kampus berharap BNPB mendanai semua ajuan', 'Lingkup peran BNPB ditulis di surat undangan dan dijelaskan di pembukaan'],
    ['Bencana di kota tuan rumah menjelang acara', 'Kota cadangan di region yang sama dan tanggal cadangan'],
    ['Tindak lanjut hilang sesudah acara', 'Narahubung dua pihak, tanggal langkah pertama, dan pemeriksaan pada H+30, H+60, H+90'],
], lebar=[38, 62], kelas='rapat')
putus = tabel(['No.', 'Pertanyaan', 'Bawaan sementara di rancangan ini'], [
    ['1', '<b>Siapa menanggung perjalanan BPBD dan PTN: BNPB penuh, BNPB untuk BPBD saja, atau masing-masing instansi?</b>', 'Belum diputuskan; anggaran dihitung untuk dua cara'],
    ['2', 'Nama resmi acara', 'Temu Masalah dan Riset Kebencanaan Region'],
    ['3', 'Bali masuk region mana?', 'Region Bali dan Nusa Tenggara'],
    ['4', 'Region Maluku dan Papua satu acara atau dipecah dua?', 'Satu acara di Ambon'],
    ['5', 'Kota tuan rumah', 'Medan, Palembang, Jakarta, Yogyakarta, Denpasar, Balikpapan, Makassar, Ambon'],
    ['6', 'Daftar PTN teratas per provinsi', f'{A["ptn"]} PTN di Lampiran A, terverifikasi 11 November 2026; pemeriksaan akhir di PDDikti dan peringkat oleh tim Kemitraan Kampus sebelum undangan'],
    ['7', 'Siapa pimpinan BNPB yang membuka acara?', 'Belum ditentukan'],
    ['8', 'Bulan mulai dan urutan region', 'Uji coba Yogyakarta dan Denpasar pada bulan pertama'],
    ['9', 'Formulir Tugas Pendahuluan memakai modul Kemitraan Kampus atau formulir sementara?', 'Formulir sementara dengan kolom yang sama bila modul belum siap'],
    ['10', 'Apakah Bappeda, BMKG, atau dinas teknis provinsi ikut diundang?', 'Tidak pada putaran pertama'],
], kanan=(0,), lebar=[6, 50, 44], kelas='rapat')
H.append(f'''<section class="hal">
{bab('Bab 9', 'Jadwal, Ukuran Keberhasilan, dan Keputusan Pimpinan', 'target')}
{h3('9.1 Persiapan dan jadwal', 'kalender')}
<p>Satu workshop region membutuhkan sekitar 45 hari persiapan dan 90 hari pemantauan sesudahnya. Dengan dua acara per bulan, delapan region selesai dalam sekitar empat bulan.
Langkah per region digambarkan pada Gambar 4.</p>
{fig(linimasa(), 'Langkah persiapan dan pemantauan per region, H-45 sampai H+90', 'Rancangan workshop region, 11 November 2026')}
<p>Pada H-45 BNPB menetapkan region, tanggal, kota, dan hotel bersama BPBD provinsi tuan rumah, lalu menetapkan daftar PTN teratas setiap provinsi. Surat undangan
beserta tautan formulir dan keterangan pembiayaan dikirim pada H-40. Sesi daring 60 menit pada H-21 menjelaskan cara mengisi Tugas Pendahuluan; bila BNPB menanggung
perjalanan, tiket peserta dipesan paling lambat hari itu. Pada H-10 BNPB menelaah isian, menggabungkan masalah yang sama antarprovinsi, dan menyusun pasangan awal.
Rekap workshop dan daftar pasangan dikirim kepada seluruh peserta pada H+7.</p>
{fig(bulan, 'Urutan region yang diusulkan', 'Rancangan workshop region, 11 November 2026', 'tabel')}
<p>Urutan di atas digeser menurut bulan mulai program. Region Sumatera dan Kalimantan menghindari puncak musim kebakaran hutan dan lahan, dan region Jawa menghindari
puncak musim hujan, agar BPBD tidak sedang menjalankan tanggap darurat.</p>
{h3('9.2 Ukuran keberhasilan', 'grafik')}
<p>Workshop dinilai dari pasangan yang berjalan pada H+90, bukan dari jumlah peserta yang hadir. Sasaran di bawah ini adalah usulan awal dan ditetapkan ulang sesudah dua region uji coba.</p>
{fig(ukuran, 'Ukuran keberhasilan dan sasaran usulan', 'Rancangan workshop region, 11 November 2026', 'tabel')}
{h3('9.3 Risiko dan pencegahan', 'awas')}
{fig(risiko, 'Risiko pelaksanaan dan pencegahannya', 'Rancangan workshop region, 11 November 2026', 'tabel')}
{h3('9.4 Keputusan yang perlu diambil pimpinan', 'lembaga')}
<p>Keputusan pertama paling menentukan anggaran, sehingga sebaiknya diambil lebih dulu. Hal lain dalam rancangan ini memakai bawaan sementara sampai ada keputusan.</p>
{fig(putus, 'Keputusan yang perlu diambil dan bawaan sementaranya', 'Rancangan workshop region, 11 November 2026', 'tabel')}
{aksi([('Segera, sebelum undangan', ['Memutuskan siapa yang menanggung perjalanan peserta.',
                                     'Menetapkan nama resmi acara, kota tuan rumah, dan pimpinan pembuka.',
                                     'Menyelesaikan pemeriksaan PDDikti dan peringkat PTN teratas.']),
       ('Bulan pertama', ['Menggelar uji coba di Yogyakarta, format sehari.',
                          'Menggelar uji coba di Denpasar, format dua hari satu malam.',
                          'Memperbaiki format dan menetapkan ulang sasaran keberhasilan.']),
       ('Bulan kedua sampai keempat', ['Menggelar enam region lainnya, dua acara per bulan.',
                                       'Memantau setiap pasangan pada H+30, H+60, dan H+90.',
                                       'Melaporkan rekap per provinsi kepada pimpinan setiap triwulan.'])])}
</section>''')

# ---------- LAMPIRAN ----------
lamp = []
for i, r in enumerate(R, 1):
    t = tabel(['Provinsi', 'PTN yang diundang', 'BPBD + PTN'], [
        [f'<b>{p[0]}</b>' + (' (tuan rumah)' if p[2] else ''), ', '.join(p[1]) if p[1] else 'Tidak ada PTN', f'3 + {3 * len(p[1])} = {3 + 3 * len(p[1])}']
        for p in r['prov']], kanan=(2,), lebar=[24, 62, 14], kelas='rapat')
    lamp.append(f'<p class="lanjut"><b>{i}. {r["nama"]}, {r["kota"]}:</b> {r["luar"]} peserta dan {TIM} orang tim BNPB, {r["total"]} orang.</p>' + t)
H.append(f'''<section class="hal">
{bab('Lampiran', 'Daftar PTN per Region dan Sumber', 'kampus', C['navy'])}
{h3('Lampiran A. Daftar PTN yang diundang per region', 'kampus')}
<p>Setiap BPBD provinsi mengirim tiga orang dan setiap PTN mengirim tiga orang, sesuai jabatan pada Bab 3. Kampus bertanda (K) adalah satu dari 11 kampus koordinator
dalam kajian tarikan kampus BNPB; {A["k"]} di antaranya masuk daftar ini. Universitas Indonesia tetap ditulis di DKI Jakarta karena statutanya menetapkan kedudukan di Jakarta,
walaupun sebagian besar fakultasnya berada di Depok. Institut Pertanian Bogor memakai nama merek IPB University.</p>
{''.join(lamp)}
<div class="kotak-info"><b>Cadangan bila satu PTN berhalangan.</b> IAKN Palangka Raya (Kalimantan Tengah), Universitas Terbuka (Banten), IAKN Ambon dan Politeknik
Perikanan Negeri Tual (Maluku), STAKPN Sentani (Papua), Politeknik Pertanian Negeri Samarinda (Kalimantan Timur), dan Politeknik Negeri Media Kreatif (DKI Jakarta).</div>
{h3('Lampiran B. Sumber dan rujukan', 'buku')}
<ul class="sumber">
<li>Antara. (Mei 2025). Berita alih status 11 perguruan tinggi keagamaan Islam negeri.</li>
<li>Badan Nasional Penanggulangan Bencana. (2026). <i>Grand Design Kemitraan BNPB dan Perguruan Tinggi 2027–2029</i>.</li>
<li>Badan Nasional Penanggulangan Bencana. (11 November 2026). <i>Analisis Skema Workshop: Per Provinsi atau Per Region</i>.</li>
<li>Badan Nasional Penanggulangan Bencana. (11 November 2026). <i>Rancangan Workshop Region BNPB, BPBD Provinsi, dan Perguruan Tinggi Negeri</i>, draf.</li>
<li>Badan Nasional Penanggulangan Bencana. <i>Kajian tarikan kampus koordinator BNPB</i> dan direktori akademisi BNPB.</li>
<li>Kementerian Keuangan. (2025). <i>Peraturan Menteri Keuangan Nomor 32 Tahun 2025 tentang Standar Biaya Masukan Tahun Anggaran 2026</i>.</li>
<li>Kementerian Pendidikan Dasar dan Menengah. Registri satuan pendidikan, diakses 11 November 2026.</li>
<li>Liputan6. Berita provinsi di Papua yang belum memiliki perguruan tinggi negeri.</li>
<li>Radio Republik Indonesia. Berita alih status UIN Sultan Amai Gorontalo dan UIN Kendari.</li>
<li>Situs resmi perguruan tinggi dan peraturan presiden tentang pendirian atau alih status perguruan tinggi negeri, diakses 11 November 2026.</li>
</ul>
</section>''')

CSS = (SINI / 'gaya.css').read_text(encoding='utf-8')
CSS = CSS.replace('{FONT_R}', gambar(FONT / 'Roboto-Regular.ttf')).replace('{FONT_M}', gambar(FONT / 'Roboto-Medium.ttf')).replace('{FONT_B}', gambar(FONT / 'Roboto-Bold.ttf'))
bungkus = lambda isi: f'<!doctype html><html lang="id"><head><meta charset="utf-8"><title>{m["judul"]}</title><style>{CSS}</style></head><body>{isi}</body></html>'
(SINI / 'sampul.html').write_text(bungkus(H[0]), encoding='utf-8')
isi = ''.join(H[1:]).replace('<section class="hal">', '<section class="awal">', 1)
(SINI / 'laporan.html').write_text(bungkus(isi), encoding='utf-8')
print('html', len(isi) // 1024, 'KB', NOMOR, A)
