"""Laporan Bencana Bulanan Oktober 2026, format A4 (HTML untuk dicetak Chromium ke PDF).

python laporan_a4.py   -> a4/laporan.html (lalu: node cetak.mjs)
Angka dibaca dari data/lb/nilai.json dan CSV proyek deck (satu sumber dengan deck ppt-konsultan); tidak ada angka diketik.
Gaya mengikuti token deck BNPB (tema.json): navy, oranye, kategori bencana, Roboto, logo BNPB dan KRIS.
"""
import csv, json, os, html, base64, mimetypes
from pathlib import Path

HOME = os.path.expanduser('~').replace(chr(92), '/') + '/'
SK = HOME + '.claude/skills/ppt-konsultan/bnpb/assets/'
P = SK + 'proyek-bulanan/'
LB = P + 'data/lb/'
SINI = Path(__file__).resolve().parent
KERJA = SINI.parent
V = json.load(open(LB + 'nilai.json', encoding='utf-8'))
AKSI = json.load(open(KERJA / 'aksi.json', encoding='utf-8'))
KG = json.load(open(KERJA / 'kegiatan.json', encoding='utf-8'))

C = dict(navy='#051C2C', oranye='#D9600B', biru='#2F86D1', merah='#C8102E', api='#D9600B', basah='#2F86D1', kering='#B08A3E',
         geologi='#8A4B2A', teks='#1A1A1A', teks2='#2E3440', teks3='#6B7280', garis='#BFC5CC', tint='#F1F3F6', tintapi='#FBE7D6',
         tintair='#DCEBF8', tintbahaya='#FBE3E6', slate='#5B7A99', abu='#DCE1E7', emas='#A07A32')
BL = {'Jan': 'Januari', 'Feb': 'Februari', 'Mar': 'Maret', 'Apr': 'April', 'Mei': 'Mei', 'Jun': 'Juni', 'Jul': 'Juli', 'Agu': 'Agustus',
      'Sep': 'September', 'Okt': 'Oktober', 'Nov': 'November', 'Des': 'Desember'}


def f(x, d=0):
    """format angka Indonesia"""
    if isinstance(x, str):
        return x
    s = f'{x:,.{d}f}'
    return s.replace(',', '#').replace('.', ',').replace('#', '.')


def n(k, d=0):
    return f(V[k], d)


def B(k, d=0):
    return f'<b>{n(k, d)}</b>'


def baca(nama):
    return list(csv.DictReader(open(LB + nama, encoding='utf-8')))


def gambar(p):
    p = Path(p)
    return 'data:' + (mimetypes.guess_type(p.name)[0] or 'image/png') + ';base64,' + base64.b64encode(p.read_bytes()).decode()


def it(t):
    """istilah asing miring"""
    for w in ('hotspot', 'action plan', 'water bombing', 'geobag', 'dry ice'):
        t = t.replace(w, f'<i>{w}</i>')
    return t


def tok(t):
    """ganti token {{angka:k|fmt=1}} di aksi.json"""
    import re
    def r(m):
        k, _, o = m.group(1).partition('|')
        d = int(o.split('fmt=')[1][0]) if 'fmt=' in o else 0
        return f'<b>{n(k.strip(), d)}</b>'
    return it(re.sub(r'\{\{angka:([^}]+)\}\}', r, t))


# ---------------- ikon (glif deck: Lucide, deck, khusus; viewBox 24) ----------------
GLIF = json.load(open(SINI / 'ikon.json', encoding='utf-8'))
IK = {'api': 'deck:api', 'banjir': 'deck:banjir', 'gempa': 'deck:gempa', 'rumah': 'deck:rumah', 'orang': 'deck:orang', 'tenda': 'deck:tenda',
      'kalender': 'deck:kalender', 'cuaca': 'lucide:cloud-lightning', 'kering': 'lucide:sun', 'longsor': 'khusus:longsor', 'gunung': 'lucide:mountain',
      'peta': 'lucide:map-pin', 'lembaga': 'lucide:landmark', 'data': 'lucide:database', 'daftar': 'lucide:list-checks', 'awas': 'lucide:triangle-alert',
      'sekolah': 'lucide:school', 'jembatan': 'lucide:construction', 'perisai': 'lucide:shield-check', 'sirene': 'lucide:siren', 'air': 'lucide:droplet',
      'luas': 'lucide:land-plot', 'hukum': 'lucide:scale', 'uang': 'lucide:banknote', 'palu': 'lucide:hammer', 'pabrik': 'lucide:factory'}


def ikon(k, warna='#051C2C', uk=20, bulat=True, isi=None):
    """ikon garis dalam lingkaran bertint (gaya deck)"""
    gl = GLIF[IK.get(k, k)]
    latar = isi or (warna + '22')
    if not bulat:
        return f'<svg class="ik" width="{uk}" height="{uk}" viewBox="0 0 24 24" fill="none" stroke="{warna}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">{gl}</svg>'
    return (f'<svg class="ik" width="{uk}" height="{uk}" viewBox="-6 -6 36 36"><circle cx="12" cy="12" r="17.5" fill="{latar}"/>'
            f'<g fill="none" stroke="{warna}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">{gl}</g></svg>')


KATA_IKON = [('hotspot', 'api'), ('kebakaran', 'api'), ('karhutla', 'api'), ('terendam', 'banjir'), ('banjir', 'banjir'), ('mengungsi', 'tenda'),
             ('rumah', 'rumah'), ('cuaca', 'cuaca'), ('longsor', 'longsor'), ('kekeringan', 'kering'), ('gempa', 'gempa'), ('Level', 'gunung'),
             ('gunung', 'gunung'), ('kabupaten', 'peta'), ('provinsi', 'peta'), ('fasilitas', 'sekolah'), ('jembatan', 'jembatan'), ('personel', 'orang'),
             ('armada', 'sirene'), ('sorti', 'cuaca'), ('garam', 'air'), ('warga', 'orang'), ('jiwa', 'orang'), ('kejadian', 'daftar')]


def ikon_kata(t):
    tl = t.lower()
    return next((k for w, k in KATA_IKON if w.lower() in tl), 'daftar')


# ---------------- grafik SVG ----------------
def svg_open(w, h):
    return f'<svg viewBox="0 0 {w} {h}" width="100%" xmlns="http://www.w3.org/2000/svg" font-family="Roboto" font-size="11">'


def kolom_tumpuk(rows, kunci, warna, nama, w=640, h=250):
    tot = [sum(int(r[k]) for k in kunci) for r in rows]
    mx = max(tot) * 1.12
    x0, y0, ph = 10, 22, h - 70
    bw = (w - 20) / len(rows)
    s = [svg_open(w, h)]
    for i, r in enumerate(rows):
        x = x0 + i * bw + bw * 0.18
        y = y0 + ph
        for k, c in zip(kunci, warna):
            v = int(r[k])
            hh = v / mx * ph
            if v:
                s.append(f'<rect x="{x:.1f}" y="{y - hh:.1f}" width="{bw * 0.64:.1f}" height="{hh:.1f}" fill="{c}"/>')
                if hh > 14:
                    s.append(f'<text x="{x + bw * .32:.1f}" y="{y - hh / 2 + 4:.1f}" text-anchor="middle" fill="#fff" font-size="9.5">{f(v)}</text>')
            y -= hh
        s.append(f'<text x="{x + bw * .32:.1f}" y="{y - 5:.1f}" text-anchor="middle" font-weight="700" fill="{C["navy"]}">{f(tot[i])}</text>')
        s.append(f'<text x="{x + bw * .32:.1f}" y="{y0 + ph + 15:.1f}" text-anchor="middle" fill="{C["teks2"]}" font-size="10">{r["bulan"]}</text>')
    lx = 12
    for c, nm in zip(warna, nama):
        s.append(f'<rect x="{lx}" y="{h - 22}" width="10" height="10" fill="{c}"/><text x="{lx + 14}" y="{h - 13}" fill="{C["teks2"]}" font-size="10">{nm}</text>')
        lx += 18 + len(nm) * 5.6
    s.append('</svg>')
    return ''.join(s)


def batang_h(rows, label, nilai, warna, w=640, rowh=22, fmt=0, sorot=None, satuan=''):
    mx = max(float(r[nilai]) for r in rows)
    lw = 200
    h = rowh * len(rows) + 8
    s = [svg_open(w, h)]
    for i, r in enumerate(rows):
        y = 4 + i * rowh
        v = float(r[nilai])
        bw = v / mx * (w - lw - 90)
        c = warna if (sorot is None or r[label] in sorot) else C['abu']
        s.append(f'<text x="{lw - 8}" y="{y + rowh * .62:.1f}" text-anchor="end" fill="{C["teks"]}" font-size="10.5">{html.escape(r[label])}</text>')
        s.append(f'<rect x="{lw}" y="{y + 3}" width="{bw:.1f}" height="{rowh - 7}" fill="{c}"/>')
        s.append(f'<text x="{lw + bw + 6:.1f}" y="{y + rowh * .62:.1f}" fill="{C["navy"]}" font-weight="700" font-size="10.5">{f(v, fmt)}{satuan}</text>')
    s.append('</svg>')
    return ''.join(s)


def garis(rows, x, seri, warna, nama, w=640, h=230, label_akhir=True):
    vals = [float(r[k]) for r in rows for k in seri]
    mx = max(vals) * 1.15 or 1
    x0, x1, y0, y1 = 40, w - 90, 14, h - 40
    sx = lambda i: x0 + i * (x1 - x0) / (len(rows) - 1)
    sy = lambda v: y1 - v / mx * (y1 - y0)
    s = [svg_open(w, h)]
    for t in range(0, 5):
        yv = mx / 1.15 * t / 4
        yy = sy(yv)
        s.append(f'<line x1="{x0}" x2="{x1}" y1="{yy:.1f}" y2="{yy:.1f}" stroke="{C["tint"]}"/>')
        s.append(f'<text x="{x0 - 6}" y="{yy + 3:.1f}" text-anchor="end" fill="{C["teks3"]}" font-size="9">{f(yv)}</text>')
    for k, c, nm in zip(seri, warna, nama):
        pts = ' '.join(f'{sx(i):.1f},{sy(float(r[k])):.1f}' for i, r in enumerate(rows))
        s.append(f'<polyline points="{pts}" fill="none" stroke="{c}" stroke-width="2.4"/>')
        for i, r in enumerate(rows):
            s.append(f'<circle cx="{sx(i):.1f}" cy="{sy(float(r[k])):.1f}" r="2.6" fill="{c}"/>')
        last = float(rows[-1][k])
        s.append(f'<text x="{sx(len(rows) - 1) + 8:.1f}" y="{sy(last) + 4:.1f}" fill="{c}" font-weight="700" font-size="10.5">{nm} {f(last)}</text>')
    for i, r in enumerate(rows):
        s.append(f'<text x="{sx(i):.1f}" y="{y1 + 16}" text-anchor="middle" fill="{C["teks2"]}" font-size="9.5">{r[x]}</text>')
    s.append('</svg>')
    return ''.join(s)


def banding_hotspot(rows, w=640):
    """hotspot satelit (batang) lawan laporan kejadian daerah (angka di kanan)"""
    mx = max(int(r['titik']) for r in rows)
    lw, rowh = 150, 24
    h = rowh * len(rows) + 30
    s = [svg_open(w, h),
         f'<text x="{lw}" y="12" fill="{C["teks3"]}" font-size="9.5">Hotspot Oktober</text>',
         f'<text x="{w - 10}" y="12" text-anchor="end" fill="{C["teks3"]}" font-size="9.5">Laporan kejadian karhutla ke BNPB</text>']
    for i, r in enumerate(rows):
        y = 20 + i * rowh
        bw = int(r['titik']) / mx * (w - lw - 170)
        lap = int(r['laporan'])
        s.append(f'<text x="{lw - 8}" y="{y + 15}" text-anchor="end" font-size="10.5" fill="{C["teks"]}">{r["provinsi"]}</text>')
        s.append(f'<rect x="{lw}" y="{y + 4}" width="{bw:.1f}" height="15" fill="{C["api"]}"/>')
        s.append(f'<text x="{lw + bw + 6:.1f}" y="{y + 15}" font-size="10.5" font-weight="700" fill="{C["navy"]}">{f(int(r["titik"]))}</text>')
        s.append(f'<circle cx="{w - 40}" cy="{y + 11}" r="10" fill="{C["merah"] if lap == 0 else C["navy"]}"/>'
                 f'<text x="{w - 40}" y="{y + 15}" text-anchor="middle" fill="#fff" font-weight="700" font-size="10.5">{lap}</text>')
    s.append('</svg>')
    return ''.join(s)


# ---------------- komponen HTML ----------------
def kartu(item, kolom=4):
    return f'<div class="kartu k{kolom}">' + ''.join(
        f'<div class="kt" style="border-top-color:{w}"><div class="kti">{ikon(ikon_kata(l), w, 22)}<div class="kn" style="color:{w}">{v}</div></div><div class="kl">{l}</div></div>' for v, l, w in item) + '</div>'


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


def aksi_tabel(kunci):
    L = AKSI[kunci]['langkah']
    kol = ''.join(f'<div class="ak {"akan" if i == 2 else ""}"><div class="akh">{ikon(["perisai", "sirene", "kalender"][i], "#FFFFFF", 16, False)} {l["judul"]}</div><ul>' +
                  ''.join(f'<li>{tok(b)}</li>' for b in l['butir']) + '</ul></div>' for i, l in enumerate(L))
    return f'<div class="aksi">{kol}</div>'


def foto(berkas, ket, kredit):
    return f'<div class="ft"><img src="{gambar(P + berkas)}"><div class="fk">{ket}<span>Foto: {kredit}</span></div></div>'


DIBI = 'Logbook harian Pusdalops BNPB, 1 sampai 29 Oktober 2026 (bencana alam)'
GIS = 'GIS BNPB, hotspot NASA FIRMS (MODIS dan VIIRS), 1 sampai 31 Oktober 2026'
SR = 'Siaran pers dan laporan situasi harian BNPB, Oktober 2026'

IKON_BAB = {'Ringkasan Eksekutif': 'daftar', 'BAB 1': 'data', 'BAB 2': 'api', 'BAB 3': 'banjir', 'BAB 4': 'cuaca', 'BAB 5': 'gempa', 'BAB 6': 'lembaga', 'BAB 7': 'kalender', 'LAMPIRAN': 'daftar'}
DAFTAR = [('Ringkasan Eksekutif', 'Ringkasan Eksekutif'), ('BAB 1', 'Bab 1. Gambaran Umum Bencana Oktober 2026'), ('BAB 2', 'Bab 2. Kebakaran Hutan dan Lahan'),
          ('BAB 3', 'Bab 3. Banjir dan Tanah Longsor'), ('BAB 4', 'Bab 4. Cuaca Ekstrem dan Kekeringan'), ('BAB 5', 'Bab 5. Geologi dan Vulkanologi'),
          ('BAB 6', 'Bab 6. Program Kerja BNPB Oktober 2026'), ('BAB 7', 'Bab 7. Prediksi, Dukungan yang Dimohon, dan Temuan Utama'),
          ('LAMPIRAN', 'Lampiran. Sumber Data dan Catatan Metode')]
TOC = json.load(open(SINI / 'toc.json', encoding='utf-8')) if (SINI / 'toc.json').exists() else {}
# ================= ISI =================
H = []
# ---------- sampul ----------
H.append(f'''<section class="sampul">
<div class="sp-kiri">
 <div class="logo-baris"><img src="{gambar(SK + 'proyek-bnpb/logo/sumber-bnpb.png')}" class="lg-bnpb"></div>
 <div class="sp-jenis">LAPORAN BULANAN KEPALA BNPB</div>
 <h1 class="sp-judul">Laporan Bencana<br>Oktober 2026</h1>
 <div class="sp-sub">Kejadian, dampak, penanganan bencana alam, dan program kerja BNPB selama Oktober 2026</div>
 <div class="sp-garis"></div>
 <div class="sp-kepada">Disampaikan kepada<br><b>Presiden Republik Indonesia</b></div>
 <div class="sp-oleh">Disusun oleh<br><b>Letnan Jenderal TNI Kristomei Sianturi, S.Sos., M.Si. (Han)</b><br>Kepala Badan Nasional Penanggulangan Bencana</div>
 <div class="pil-tgl">Jakarta, 12 November 2026</div>
 <div class="sp-kaki">© 2026 Badan Nasional Penanggulangan Bencana<br><i>Ketangguhan Bangsa dalam Menghadapi Bencana</i></div>
</div>
<div class="sp-kanan" style="background-image:url('{gambar(P + 'foto/web/pk-personel.jpg')}')">
 <div class="sp-logo2"><img src="{gambar('D:/Project/Work/BNPB/poskokarhutla/data/laporan-bnpb/generator/sampul/media/kris-logo.png')}"></div>
 <div class="sp-kredit">Foto: BNPB, personel darat memadamkan api gambut, Oktober 2026</div>
</div></section>''')

# ---------- daftar isi + ringkasan ----------
H.append(f'''<section class="hal">
<h2 class="judul-bagian">Daftar Isi</h2>
<ol class="toc">{''.join(f'<li><span>{ikon(IKON_BAB[k], C["navy"], 22)} {t}</span><em>{TOC.get(k, "")}</em></li>' for k, t in DAFTAR)}</ol>
<div class="kotak-info"><b>Tentang laporan ini.</b> Laporan ini menyajikan bencana alam yang terjadi di Indonesia selama Oktober 2026,
dampaknya terhadap warga, langkah penanganan yang sudah berjalan beserta rencana berikutnya, serta kegiatan BNPB pada bulan yang sama.
Angka kejadian dan dampak dihimpun dari logbook harian Pusdalops BNPB, satu berkas per hari, untuk 1 sampai 29 Oktober 2026.
Logbook 30 dan 31 Oktober belum tersedia di arsip, sehingga kejadian pada dua hari itu belum terhitung. Status surut dan padam diambil dari laporan harian Dit. Koordalops BNPB.
Data hotspot dan perkiraan luas terbakar berasal dari sistem GIS BNPB.</div>
</section>''')

H.append(f'''<section class="hal">
<h2 class="judul-bagian">Ringkasan Eksekutif</h2>
<p class="tesis">Kemarau panjang saat El Nino kuat membuat kebakaran hutan dan lahan meluas pada awal Oktober sebelum <i>hotspot</i> turun tajam,
sementara musim hujan sudah membawa banjir ke Sumatera bagian utara.</p>
{kartu([(n('n.kej'), 'kejadian bencana alam', C['navy']), (n('karhutla.persen', 1) + '%', 'di antaranya kebakaran hutan dan lahan', C['api']),
        (n('n.tdm'), 'warga terdampak dan mengungsi', C['basah']), (n('n.md_hilang'), 'jiwa meninggal dan hilang', C['merah'])])}
<p>Selama Oktober 2026 terjadi {B('n.kej')} bencana alam di {B('n.prov')} provinsi dan {B('n.kab')} kabupaten dan kota.
Kebakaran hutan dan lahan mendominasi dengan {B('karhutla.kej')} kejadian, disusul banjir sebanyak {B('banjir.kej')} kejadian.
Bencana tersebut berdampak pada {B('n.tdm')} warga, merusak {B('n.rumah')} rumah, dan merendam {B('n.terendam')} rumah.
Dibanding September 2026, korban meninggal dan hilang turun dari {B('sep.md_hilang')} menjadi {B('c26.md_hilang')} jiwa,
dan warga terdampak turun {B('ch.tdm.abs', 1)} persen.</p>
<h3>Empat temuan utama</h3>
<div class="temuan">
<div class="tm"><div class="tmk">{ikon('api', C['api'], 30)}</div><div><b>Hotspot masih sangat tinggi.</b> Sistem mencatat {B('kh.hot')} <i>hotspot</i> pada Oktober, dan {B('kh.top6.persen', 1)} persen di antaranya berada di enam provinsi.
Kalimantan Tengah dan Papua Selatan menjadi yang terbanyak, sedangkan <i>hotspot</i> harian turun {B('kh.turun.p.abs', 1)} persen dari puncak 6 Oktober sampai 31 Oktober.</div></div>
<div class="tm"><div class="tmk">{ikon('awas', C['merah'], 30)}</div><div><b>Laporan karhutla daerah tidak sejalan dengan satelit.</b> Enam provinsi dengan <i>hotspot</i> terbanyak hanya melaporkan {B('kh.lapor.top6')} kejadian karhutla ke BNPB.
Sebaliknya, tiga provinsi di Jawa dan Sulawesi melaporkan {B('kh.lapor.jawa_sulsel')} kejadian.</div></div>
<div class="tm"><div class="tmk">{ikon('banjir', C['basah'], 30)}</div><div><b>Banjir sudah datang di Sumatera bagian utara.</b> Terjadi {B('banjir.kej')} banjir yang berdampak pada {B('banjir.tdm')} warga.
Sebanyak {B('banjir.st.belum')} kabupaten masih dilaporkan belum surut pada akhir Oktober.</div></div>
<div class="tm"><div class="tmk">{ikon('gempa', C['geologi'], 30)}</div><div><b>Gempa merusak rumah warga.</b> Gempa di Sumba Barat Daya dan Jawa Barat merusak {B('gempa.rumah')} rumah,
sedangkan {B('ga.siaga')} gunung api berstatus Siaga per 1 November, termasuk Merapi dan Semeru.</div></div>
</div>
<h3>Dukungan yang dimohon</h3>
<p>BNPB memohon dukungan Bapak Presiden untuk lima langkah: dana siap pakai musim hujan, penegakan hukum pembakar lahan,
kewajiban laporan karhutla dari daerah rawan, normalisasi sungai di Sumatera bagian utara, dan armada udara siaga selama peralihan musim.
Rinciannya ada di Bab 7.</p>
</section>''')

# ---------- BAB 1 ----------
prov = baca('prov_top.csv')
hm = ''.join('<tr><td>' + r['provinsi'] + '</td>' + ''.join(
    f'<td class="r hm" style="background:rgba(5,28,44,{min(1, int(r[k]) / 70) * .85 + .04:.2f});color:{"#fff" if int(r[k]) > 20 else C["teks"]}">{f(int(r[k]))}</td>'
    for k in ('kering', 'basah', 'geologi')) + f'<td class="r"><b>{f(int(r["total"]))}</b></td></tr>' for r in prov)
tabel_hm = f'<table class="tb rapat"><colgroup><col style="width:32%"><col><col><col><col></colgroup><thead><tr><th>Provinsi</th><th class="r">Kering</th><th class="r">Basah</th><th class="r">Geologi</th><th class="r">Jumlah</th></tr></thead><tbody>{hm}</tbody></table>'
rb = baca('riwayat_bulan.csv')
band = baca('banding.csv')
H.append(f'''<section class="hal">
<div class="bab"><span>BAB 1</span>Gambaran Umum Bencana Oktober 2026</div>
<h3>1.1 Kejadian bencana</h3>
<p>Selama Oktober 2026 terjadi {B('n.kej')} kejadian bencana alam menurut logbook harian Pusdalops BNPB. Bencana hidrometeorologi kering, yaitu kebakaran hutan dan lahan
serta kekeringan, berjumlah {B('n.kering')} kejadian atau {B('n.kering.p', 1)} persen. Bencana hidrometeorologi basah berjumlah {B('n.basah')} kejadian,
dan bencana geologi berjumlah {B('n.geologi')} kejadian. Kebakaran permukiman dan tempat pemrosesan akhir sampah sebanyak {B('n.gedung')} kejadian tidak dihitung karena bukan bencana alam.</p>
{kartu([(n('karhutla.kej'), 'kebakaran hutan dan lahan', C['api']), (n('banjir.kej'), 'banjir', C['basah']), (n('cuaca.kej'), 'cuaca ekstrem', C['emas']),
        (n('longsor.kej'), 'tanah longsor', C['geologi']), (n('kekeringan.kej'), 'kekeringan', C['kering']), (n('gempa.ev'), 'gempa bumi', C['slate'])], 6)}
<p>Jawa Tengah mencatat kejadian terbanyak dengan {B('prov1.n')} kejadian, hampir seluruhnya kebakaran lahan. Aceh dan Sumatera Utara didominasi banjir,
sehingga pola bencana bulan ini terbagi dua: kebakaran di Jawa dan Sulawesi, serta banjir di ujung utara Sumatera.</p>
{fig(tabel_hm, 'Sepuluh provinsi dengan kejadian terbanyak menurut kelompok bencana', DIBI, 'tabel')}
{fig(kolom_tumpuk(rb, ['kering', 'basah', 'geologi'], [C['api'], C['basah'], C['geologi']], ['Hidrometeorologi kering', 'Hidrometeorologi basah', 'Geologi'], w=680, h=240),
     'Kejadian per bulan, Januari sampai Oktober 2026', 'Logbook harian Pusdalops BNPB 2026')}
<p class="catatan">Kolom kering memuat karhutla dan kekeringan. Kolom basah memuat banjir dan tanah longsor beserta cuaca ekstrem.
Grafik riwayat menunjukkan pergeseran musim: banjir mendominasi Desember sampai Mei, lalu karhutla naik tajam sejak Juli.</p>
</section>''')

H.append(f'''<section class="lanjut">
<h3>1.2 Dampak bencana</h3>
<p>Bencana Oktober 2026 berdampak pada {B('n.terdampak')} warga dan memaksa {B('n.mengungsi')} warga mengungsi. Sebanyak {B('n.meninggal')} jiwa meninggal,
{B('n.hilang')} jiwa hilang, dan {B('n.luka')} jiwa luka-luka. Banjir menjadi penyumbang dampak terbesar karena merendam {B('banjir.terendam')} rumah
dan membuat {B('banjir.mengungsi')} warga mengungsi.</p>
{fig(tabel(['Indikator', 'September 2026', 'Oktober 2026', 'Perubahan'],
           [[r['indikator'], f(int(r['y2025'])), f(int(r['y2026'])), (f'<span class="turun">turun {f(abs(float(r["ubah"])), 1)}%</span>' if float(r["ubah"]) < 0 else f'<span class="naik">naik {f(float(r["ubah"]), 1)}%</span>')] for r in band],
           kanan=(1, 2, 3), lebar=[40, 20, 20, 20]), 'Perbandingan kejadian dan dampak September dan Oktober 2026',
     'Logbook harian Pusdalops BNPB, September dan 1 sampai 29 Oktober 2026', 'tabel')}
{kartu([(n('n.rr_berat'), 'rumah rusak berat', C['merah']), (n('n.rr_sedang'), 'rumah rusak sedang', C['oranye']), (n('n.rr_ringan'), 'rumah rusak ringan', C['emas']),
        (n('n.terendam'), 'rumah terendam', C['basah']), (n('n.kk'), 'kepala keluarga terdampak', C['navy']), (n('n.mengungsi'), 'warga mengungsi', C['slate'])], 6)}
{fig(tabel(['Jenis bencana', 'Kejadian', 'Meninggal dan hilang', 'Terdampak dan mengungsi', 'Rumah rusak', 'Rumah terendam'],
           [[r['jenis'], f(int(r['kejadian'])), f(int(r['md_hilang'])), f(int(r['tdm'])), f(int(r['rumah'])), f(int(r['terendam']))] for r in baca('dampak_jenis.csv')],
           kanan=(1, 2, 3, 4, 5), lebar=[28, 12, 15, 17, 14, 14], kelas='total'), 'Kejadian dan dampak menurut jenis bencana, Oktober 2026', DIBI, 'tabel')}
<p>Kejadian Oktober lebih sedikit dibanding September karena musim kemarau mulai berakhir. Angka Oktober belum memuat 30 dan 31 Oktober,
karena logbook kedua hari itu belum tersedia di arsip Pusdalops.</p>
<h3>1.3 <i>Action plan</i> umum</h3>
<div class="aksi">
<div class="ak"><div class="akh">{ikon("perisai", "#FFFFFF", 16, False)} Sudah dilakukan</div><p>Kepala BNPB memimpin rapat koordinasi karhutla di Sumatera Selatan dan Jawa Timur, lalu menambah armada udara.
Kepala BNPB juga meninjau Way Kambas dan Merauke dari udara. BPBD menangani banjir di Sumatera Utara dan Aceh serta menyalurkan air bersih ke daerah kekeringan.</p></div>
<div class="ak"><div class="akh">{ikon("sirene", "#FFFFFF", 16, False)} Sedang berjalan</div><p>Sebanyak {B('rs.armada')} armada udara dan operasi modifikasi cuaca (OMC) terus bekerja di provinsi dengan <i>hotspot</i> terbanyak.
Pendataan rumah rusak gempa besar NTT bulan Agustus berlanjut, dan beberapa kabupaten di Sumatera bagian utara dan barat belum dilaporkan surut.</p></div>
<div class="ak akan"><div class="akh">{ikon("kalender", "#FFFFFF", 16, False)} Akan dilakukan</div><p>Kesiapsiagaan musim hujan dijalankan menurut delapan langkah surat edaran Kepala BNPB. {B('rs.rawan.banjir')} kabupaten rawan banjir
disiapkan sebelum puncak hujan, sementara operasi karhutla diakhiri bertahap bila <i>hotspot</i> terus menurun.</p></div>
</div>
</section>''')

# ---------- BAB 2 Karhutla ----------
khb = baca('kh_bulan.csv')
khp = baca('kh_prov.csv')
H.append(f'''<section class="hal">
<div class="bab" style="--w:{C['api']}"><span>BAB 2</span>Kebakaran Hutan dan Lahan</div>
<h3>2.1 Sebaran dan riwayat</h3>
<p>Selama Oktober 2026 terdapat {B('kh.hot')} <i>hotspot</i> menurut sistem GIS BNPB, hampir sama dengan September yang mencatat {B('kh.hot.sep')} <i>hotspot</i>.
Puncaknya terjadi pada 6 Oktober dengan {B('kh.hot.puncak')} <i>hotspot</i> dalam sehari, lalu turun menjadi {B('kh.hot.akhir')} <i>hotspot</i> pada 31 Oktober.
Kalimantan Tengah menjadi provinsi dengan <i>hotspot</i> terbanyak, dan Papua Selatan berada di urutan kedua.</p>
{fig(f'<img class="peta" src="{gambar(P + "petanya/karhutla.png")}">' + '<div class="leg">' + ''.join(
    f'<span><i style="background:{c}"></i>{l}</span>' for c, l in [('#FBE7D6', f'di bawah {n("kh.amb1")}'), ('#F4C3A0', f'{n("kh.amb1")} sampai {n("kh.amb2")}'),
                                                                   ('#E8894A', f'{n("kh.amb2")} sampai {n("kh.amb3")}'), ('#D9600B', f'{n("kh.amb3")} sampai {n("kh.amb4")}'), ('#8F3F07', f'di atas {n("kh.amb4")}')]) + '</div>',
     'Sebaran hotspot Oktober 2026 per provinsi; delapan provinsi teratas diberi label', GIS)}
<div class="dua">
<div>{fig(garis(khb, 'bulan', ['titik'], [C['api']], ['Hotspot'], w=360, h=210), 'Hotspot per bulan, Januari sampai Oktober 2026', 'GIS BNPB, NASA FIRMS')}</div>
<div><p>Jumlah <i>hotspot</i> melonjak sejak Agustus. Kenaikan ini sejalan dengan kemarau panjang saat El Nino kuat, ketika curah hujan di sebagian besar Indonesia
jauh di bawah normal. Penurunan pada akhir Oktober terjadi setelah hujan mulai turun dan operasi modifikasi cuaca diperluas.</p>
<p class="catatan">Hotspot dihitung sebagai lokasi unik per hari dari satelit MODIS dan VIIRS pada semua tingkat keyakinan. Angka ini berbeda dari SiPongi
karena lokasi yang sama tidak dihitung dua kali.</p></div>
</div>
</section>''')

H.append(f'''<section class="lanjut">
<h3>2.2 Dampak</h3>
<p>Perhitungan satelit memperkirakan kebakaran Oktober menghanguskan sekitar {B('kh.luas')} hektare, dan sekitar {B('kh.belum31')} hektare
diperkirakan belum padam pada 31 Oktober. Laporan daerah mencatat {B('karhutla.kej')} kejadian karhutla dengan {B('karhutla.kk')} kepala keluarga terdampak,
{B('karhutla.md_hilang')} korban meninggal dan hilang, serta {B('karhutla.tdm')} warga terdampak dan mengungsi.</p>
{fig(tabel(['Provinsi', 'Hotspot', 'Perkiraan luas terbakar (ha)', 'Belum padam 31 Okt (ha)'],
           [[r['provinsi'], f(int(r['titik'])), f(int(r['luas'])), f(int(r['belum']))] for r in khp], kanan=(1, 2, 3), lebar=[34, 18, 26, 22]),
     'Sepuluh provinsi dengan hotspot terbanyak, Oktober 2026', GIS + '; luas dan belum padam adalah perhitungan sistem', 'tabel')}
<p class="catatan">Luas terbakar dihitung dari jumlah hotspot satelit VIIRS (NASA FIRMS) dikali luas rata-rata per titik dari data resmi BNPB tahun sebelumnya.
Angka ini menunggu verifikasi lapangan.</p>
<h3>2.3 Laporan daerah dibanding satelit</h3>
<p>Enam provinsi dengan {B('kh.top6.persen', 1)} persen <i>hotspot</i> nasional hanya mengirim {B('kh.lapor.top6')} laporan kejadian karhutla ke Pusdalops BNPB.
Kalimantan Tengah dan Sumatera Selatan tidak mengirim satu pun laporan. Akibatnya, dampak kebakaran terhadap warga di provinsi itu belum tercatat
dan bantuan sulit diarahkan secara tepat.</p>
{fig(banding_hotspot(baca('kh_banding.csv')), 'Hotspot satelit dan laporan kejadian karhutla per provinsi, Oktober 2026',
     GIS + '; ' + DIBI)}
</section>''')

H.append(f'''<section class="lanjut">
<h3>2.4 <i>Action plan</i></h3>
{aksi_tabel('karhutla')}
<div class="kartu-satu">{kartu([(n('rs.personel'), 'personel darat di empat provinsi', C['navy']), (n('rs.armada'), 'armada udara bertugas', C['navy']),
                               (n('omc.sortie'), 'sorti OMC, 16 sampai 27 Oktober', C['api']), (n('omc.nacl'), 'kg garam untuk OMC', C['api'])])}</div>
<p class="sb"><b>Sumber:</b> Surat Kepala BNPB 2 November 2026; {SR}; Posko OMC BNPB</p>
<h3>2.5 Dokumentasi</h3>
<div class="galeri g3">
{foto('foto/surat-6.jpg', 'Rapat koordinasi karhutla Sumatera Selatan', 'BNPB')}
{foto('foto/surat-4.jpg', 'Kepala BNPB meninjau pemadaman', 'BNPB')}
{foto('foto/surat-8.jpg', 'Pompa air dari kolam penampung', 'BNPB')}
{foto('foto/surat-9.jpg', 'Tim gabungan di lahan gambut terbakar', 'BNPB')}
{foto('foto/web/pk-omc.jpg', 'Pemadaman dari udara di Kayong Utara', 'BNPB')}
{foto('foto/surat-10.jpg', 'Prajurit TNI memadamkan api', 'BNPB')}
</div>
</section>''')

# ---------- BAB 3 Banjir ----------
bk = baca('banjir_kab.csv')
pil = lambda st: {'Belum surut': f'<span class="pil merah">Belum surut</span>', 'Sudah surut': f'<span class="pil biru">Sudah surut</span>'}.get(st, f'<span class="pil abu">Belum dilaporkan</span>')
H.append(f'''<section class="hal">
<div class="bab" style="--w:{C['basah']}"><span>BAB 3</span>Banjir dan Tanah Longsor</div>
<h3>3.1 Sebaran dan status</h3>
<p>Terjadi {B('banjir.kej')} banjir di {B('banjir.kab')} kabupaten dan kota pada Oktober 2026, dengan kejadian terbanyak di Aceh dan Sumatera Utara.
Sampai akhir Oktober, {B('banjir.st.selesai')} kabupaten sudah dilaporkan surut, {B('banjir.st.belum')} kabupaten masih belum surut,
dan {B('banjir.st.tanpa')} kabupaten belum pernah melaporkan status surut ke Pusdalops.</p>
<div class="dua dua-peta">
<div>{fig(f'<img class="peta" src="{gambar(P + "petanya/banjir.png")}">' + '<div class="leg"><span><i style="background:#C8102E"></i>Belum surut</span><span><i style="background:#2F86D1"></i>Sudah surut</span><span><i style="background:#9FB0C4"></i>Status belum dilaporkan</span></div>',
          'Kabupaten terdampak banjir dan statusnya, Sumatera bagian utara', DIBI + '; status dari laporan harian Dit. Koordalops BNPB')}</div>
<div>{fig(tabel(['Kab/Kota', 'Kejadian', 'Terdampak', 'Kondisi'], [[r['kab'] + f'<small>{r["prov"]}</small>', r['kej'], f(int(r['tdm'])), pil(r['st'])] for r in bk],
                kanan=(1, 2), lebar=[38, 14, 20, 28], kelas='rapat'), 'Kabupaten terdampak banjir terbesar per provinsi', DIBI, 'tabel')}</div>
</div>
</section>''')

H.append(f'''<section class="lanjut">
<h3>3.2 Riwayat dan dampak</h3>
<p>Banjir Oktober berdampak pada {B('banjir.tdm')} warga, membuat {B('banjir.mengungsi')} warga mengungsi, dan merendam {B('banjir.terendam')} rumah.
Tanah longsor terjadi {B('longsor.kej')} kali dan menelan {B('longsor.md_hilang')} korban jiwa. Jumlah banjir naik dari {B('riwayat.banjir.sep')} kejadian
pada September, menandai awal musim hujan, meski masih jauh di bawah puncak musim hujan awal tahun.</p>
<div class="dua">
<div>{fig(garis(baca('riwayat_banjir.csv'), 'bulan', ['kejadian'], [C['basah']], ['Banjir'], w=360, h=220), 'Kejadian banjir per bulan, Januari sampai Oktober 2026', 'Logbook harian Pusdalops BNPB')}</div>
<div>{kartu([(n('banjir.mengungsi'), 'warga mengungsi karena banjir', C['basah']), (n('banjir.rumah'), 'rumah rusak karena banjir', C['navy']),
             (n('longsor.kej'), 'kejadian tanah longsor', C['geologi']), (n('longsor.rumah'), 'rumah rusak karena longsor', C['geologi'])], 2)}</div>
</div>
<h3>3.3 <i>Action plan</i></h3>
{aksi_tabel('banjir')}
<p class="sb"><b>Sumber:</b> {SR}</p>
<h3>3.4 Dokumentasi</h3>
<div class="galeri g2">
{foto('foto/web/h-1417.jpg', 'Banjir merendam permukiman, laporan 17 Oktober', 'BNPB')}
{foto('foto/web/h-1229.jpg', 'Warga mengungsi, laporan 29 Oktober', 'BNPB')}
</div>
</section>''')

# ---------- BAB 4 Cuaca & kekeringan ----------
ck = baca('cuaca_kab.csv')
H.append(f'''<section class="hal">
<div class="bab" style="--w:{C['emas']}"><span>BAB 4</span>Cuaca Ekstrem dan Kekeringan</div>
<h3>4.1 Sebaran</h3>
<p>Cuaca ekstrem terjadi {B('cuaca.kej')} kali di {B('cuaca.kab')} kabupaten, sebagian besar berupa angin kencang di Jawa Timur dan Kalimantan Selatan.
Kekeringan terjadi {B('kekeringan.kej')} kali di {B('kekeringan.kab')} kabupaten dan berdampak pada {B('kekeringan.tdm')} warga. Cuaca ekstrem merusak
{B('cuaca.rumah')} rumah, termasuk {B('cuaca.rr_berat')} rumah rusak berat.</p>
{fig(f'<img class="peta" src="{gambar(P + "petanya/cuaca.png")}">' + '<div class="leg"><span><i style="background:#A07A32"></i>Cuaca ekstrem</span><span><i style="background:#D9600B"></i>Kekeringan</span></div>',
     'Kabupaten terdampak cuaca ekstrem dan kekeringan, Oktober 2026', DIBI)}
<div class="dua">
<div>{fig(tabel(['Kab/Kota', 'Jenis', 'Terdampak', 'Rumah rusak'], [[r['kab'], r['jenis'], f(int(r['tdm'])), f(int(r['rumah']))] for r in ck],
                kanan=(2, 3), lebar=[30, 30, 20, 20], kelas='rapat'), 'Dua belas kabupaten dengan dampak terbesar', DIBI, 'tabel')}</div>
<div>{fig(garis(baca('riwayat_ck.csv'), 'bulan', ['cuaca', 'kekeringan'], [C['emas'], C['oranye']], ['Cuaca ekstrem', 'Kekeringan'], w=360, h=220),
          'Kejadian per bulan, Januari sampai Oktober 2026', 'Logbook harian Pusdalops BNPB')}</div>
</div>
</section>''')

H.append(f'''<section class="lanjut">
<h3>4.2 <i>Action plan</i></h3>
{aksi_tabel('cuaca')}
<p class="sb"><b>Sumber:</b> {SR}</p>
<div class="dua">
<div><h3>4.3 Dokumentasi</h3><div class="galeri g1">{foto('foto/web/h-1230.jpg', 'Rumah rusak, laporan 30 Oktober', 'BNPB')}</div></div>
<div><h3>4.4 Hujan tiga bulan ke depan</h3>
<p>Model statistik GIS BNPB memperkirakan hujan Oktober sampai Desember 2026 berada di bawah normal di hampir seluruh wilayah, terutama di Jawa
dengan kekurangan sekitar {B('iklim.jawa.kurang', 1)} persen. Karena itu, distribusi air bersih perlu tetap disiapkan walaupun musim hujan sudah mulai.</p>
{fig(batang_h(sorted(baca('iklim_ond_tampil.csv'), key=lambda r: -float(r['kurang'])), 'wilayah', 'kurang', C['oranye'], w=420, rowh=21, fmt=1, sorot=['Jawa'], satuan='%'),
     'Perkiraan hujan di bawah normal, Oktober sampai Desember 2026', 'Model statistik GIS BNPB (CHIRPS, NOAA RONI, DMI), 9 November 2026')}</div>
</div>
</section>''')

# ---------- BAB 5 Geologi ----------
H.append(f'''<section class="hal">
<div class="bab" style="--w:{C['geologi']}"><span>BAB 5</span>Geologi dan Vulkanologi</div>
<h3>5.1 Kejadian</h3>
<p>Sepanjang Oktober terjadi {B('gempa.ev')} gempa bumi yang merusak rumah atau dirasakan warga dan {B('erupsi.ev')} erupsi Anak Krakatau.
Gempa merusak {B('gempa.rumah')} rumah warga. Gempa awal Oktober di Sumba Barat Daya merusak {B('g.sbd.rumah')} rumah
di sebelas kecamatan, sedangkan gempa pertengahan Oktober merusak {B('g.bogor.rumah')} rumah di Leuwiliang dan Pamijahan, Kabupaten Bogor.</p>
{fig(f'<img class="peta" src="{gambar(P + "petanya/geologi.png")}">' + '<div class="leg"><span><i style="background:#8A4B2A"></i>Gempa bumi</span><span><i style="background:#C8102E"></i>Erupsi</span><span><i style="background:#D9600B"></i>Gunung api Siaga</span></div>',
     'Lokasi gempa bumi dan erupsi beserta gunung api berstatus Siaga', DIBI + '; PVMBG Badan Geologi, 1 November 2026')}
<div class="dua">
<div>{fig(garis(baca('riwayat_geo.csv'), 'bulan', ['gempa', 'erupsi'], [C['geologi'], C['merah']], ['Gempa bumi', 'Erupsi'], w=360, h=210),
          'Laporan gempa bumi dan erupsi per bulan', 'Logbook harian Pusdalops BNPB 2026')}</div>
<div><h3 class="mt0">Status gunung api per 1 November</h3>
{kartu([(n('ga.awas'), 'Level IV Awas', C['merah']), (n('ga.siaga'), 'Level III Siaga', C['oranye']), (n('ga.waspada'), 'Level II Waspada', C['emas']), (n('ga.normal'), 'Level I Normal', C['slate'])], 2)}
<p>Tiga gunung api berstatus Siaga adalah Anak Krakatau, Merapi, dan Semeru. Warga dilarang memasuki radius bahaya yang ditetapkan PVMBG.</p></div>
</div>
</section>''')

H.append(f'''<section class="lanjut">
<h3>5.2 <i>Action plan</i></h3>
{aksi_tabel('geologi')}
<p class="sb"><b>Sumber:</b> {SR}; PVMBG Badan Geologi</p>
<p class="catatan">Pendataan rumah rusak yang disebut di kolom sedang berjalan adalah dampak gempa besar NTT pada Agustus 2026, sehingga tidak termasuk angka Oktober.</p>
<h3>5.3 Dokumentasi</h3>
<div class="galeri g1 kecil">{foto('foto/web/pk-waykambas2.jpg', 'Pos pendamping nasional penanganan gempa NTT', 'ANTARA melalui Metro TV')}</div>
</section>''')

# ---------- BAB 6 Program kerja ----------
mx = baca('pk_matriks.csv')
kp = baca('pk_kepala.csv')
la = baca('pk_lain.csv')
mtx = ''.join(f'<tr><td>{r["jenis"]}</td>' + ''.join(
    f'<td class="r hm" style="background:rgba(5,28,44,{int(r[k]) / 7 * .85 + .04:.2f});color:{"#fff" if int(r[k]) > 3 else C["teks"]}">{r[k]}</td>' for k in ('kepala', 'pusdatin', 'ops'))
              + f'<td class="r"><b>{r["jumlah"]}</b></td></tr>' for r in mx)
lain_baris, jl = [], None
for r in la:
    if r['jenis'] != jl:
        lain_baris.append(f'<tr class="grup"><td colspan="3">{r["jenis"]}</td></tr>')
        jl = r['jenis']
    lain_baris.append(f'<tr><td>{r["tanggal"]}</td><td>{it(r["kegiatan"])}</td><td>{r["lokasi"]}</td></tr>')
H.append(f'''<section class="hal">
<div class="bab" style="--w:{C['navy']}"><span>BAB 6</span>Program Kerja BNPB Oktober 2026</div>
<p>BNPB menjalankan {B('pk.n')} kegiatan utama pada Oktober 2026 yang terekam di siaran pers dan pemberitaan nasional. Sebanyak {B('pk.kepala')} kegiatan
melibatkan Kepala BNPB secara langsung, {B('pk.pusdatin')} kegiatan berupa informasi publik oleh Pusat Data, Informasi, dan Komunikasi Kebencanaan,
dan {B('pk.ops')} kegiatan dijalankan satuan tugas operasi. Selain itu, BNPB menerbitkan {B('rs.siaran')} laporan situasi harian.</p>
<div>
<div>{fig(f'<table class="tb"><colgroup><col style="width:36%"><col><col><col><col></colgroup><thead><tr><th>Jenis kegiatan</th><th class="r">Kepala BNPB</th><th class="r">Pusdatinkom</th><th class="r">Satgas operasi</th><th class="r">Jumlah</th></tr></thead><tbody>{mtx}</tbody></table>',
          'Kegiatan menurut jenis dan pelaksana', 'Siaran pers BNPB dan media nasional, Oktober 2026, diolah', 'tabel')}
<p class="catatan">Satgas operasi adalah satuan tugas pemadaman dan OMC BNPB. Sumber berita tidak menyebut kedeputian pelaksananya.</p></div>
<div>{fig(tabel(['Tanggal', 'Kegiatan Kepala BNPB', 'Lokasi'], [[r['tanggal'], r['kegiatan'], r['lokasi']] for r in kp], lebar=[16, 58, 26], kelas='rapat'),
          'Kegiatan Kepala BNPB sejak dilantik pada 15 Oktober 2026', 'Siaran pers BNPB dan media nasional, Oktober 2026', 'tabel')}</div>
</div>
<p>Kepala BNPB dilantik Presiden pada 15 Oktober 2026 dan dalam dua minggu pertama langsung meninjau empat provinsi yang dilanda karhutla,
yaitu Sumatera Selatan, Jawa Timur, Lampung, dan Papua Selatan. Pada 30 Oktober, Kepala BNPB menerbitkan surat edaran berisi delapan langkah kesiapsiagaan
menghadapi musim hujan 2026/2027.</p>
</section>''')

H.append(f'''<section class="lanjut">
{fig(f'<table class="tb rapat"><colgroup><col style="width:14%"><col style="width:60%"><col style="width:26%"></colgroup><thead><tr><th>Tanggal</th><th>Kegiatan</th><th>Lokasi</th></tr></thead><tbody>{"".join(lain_baris)}</tbody></table>',
     'Kegiatan satuan tugas operasi dan Pusdatinkom menurut jenis', 'Siaran pers BNPB dan media nasional, Oktober 2026', 'tabel')}
<h3>Dokumentasi program kerja</h3>
<div class="galeri g4">
{foto('foto/web/pk-lantik.jpg', 'Pelantikan Kepala BNPB oleh Presiden', 'BNPB')}
{foto('foto/web/pk-palembang.jpg', 'Rapat koordinasi karhutla Sumatera Selatan', 'InfoPublik')}
{foto('foto/web/pk-batu.jpg', 'Rapat koordinasi karhutla Jawa Timur', 'Metro TV')}
{foto('foto/web/pk-waykambas.jpg', 'Pemadaman Taman Nasional Way Kambas', 'Okezone melalui RCTI+')}
{foto('foto/web/pk-papbar.jpg', 'Garam untuk OMC Papua Barat', 'Kompas')}
{foto('foto/web/h-1005.jpg', 'Pemadaman lahan, laporan 5 Oktober', 'BNPB')}
{foto('foto/web/h-1715.jpg', 'Lahan terbakar di lereng, laporan 15 Oktober', 'BNPB')}
{foto('foto/web/h-1425.jpg', 'Petugas memadamkan api, laporan 25 Oktober', 'BNPB')}
</div>
</section>''')

# ---------- BAB 7 Penutup ----------
dk = AKSI['dukungan']['butir']
WK = {'100-hari': '100 hari', '2026-2027': '2026 sampai 2027', '2028-2030': '2028 sampai 2030'}
H.append(f'''<section class="hal">
<div class="bab" style="--w:{C['oranye']}"><span>BAB 7</span>Prediksi, Dukungan yang Dimohon, dan Temuan Utama</div>
<h3>7.1 Prediksi November dan Desember 2026</h3>
<p>Prakiraan hujan dan riwayat kejadian memberi dua pesan yang perlu dibaca bersama. Hujan tiga bulan ke depan diperkirakan di bawah normal karena El Nino
masih kuat, dengan indeks Pasifik bernilai {B('iklim.roni', 2)}. Namun, riwayat laporan Pusdalops 2014 sampai 2025 menunjukkan {B('pr.banjir.nov')} kabupaten
berpeluang tinggi dilanda banjir pada November dan {B('pr.banjir.des')} kabupaten pada Desember. Longsor juga berpeluang tinggi di {B('pr.longsor.des')} kabupaten pada Desember.</p>
{kartu([(n('pr.banjir.nov'), 'kabupaten berpeluang banjir, November', C['basah']), (n('pr.banjir.des'), 'kabupaten berpeluang banjir, Desember', C['basah']),
        (n('pr.longsor.nov'), 'kabupaten berpeluang longsor, November', C['geologi']), (n('pr.longsor.des'), 'kabupaten berpeluang longsor, Desember', C['geologi'])])}
<p class="catatan">Peluang tinggi berarti bulan itu pernah mengalami kejadian pada paling sedikit separuh dari sembilan tahun pengamatan. Angka ini bukan prakiraan resmi BMKG.</p>
<h3>7.2 Dukungan yang dimohon kepada Bapak Presiden</h3>
{tabel(['No', 'Langkah', 'Rincian', 'Penanggung jawab', 'Waktu'],
       [[b['kode'], f'<b>{b["langkah"]}</b>', it(b['rincian']), ', '.join(b['lembaga']), WK.get(b['waktu'], b['waktu'])] for b in dk], lebar=[6, 22, 42, 18, 12], kelas='rapat')}
<p class="sb"><b>Sumber:</b> Pengolahan BNPB atas logbook Pusdalops dan GIS BNPB, 12 November 2026</p>
</section>''')

kk = AKSI['kesimpulan']['kartu']
WR = {'oranye': C['oranye'], 'navy': C['navy']}
IKK = {'karhutla': 'api', 'data': 'data', 'banjir': 'banjir', 'peringatan': 'awas', 'kekeringan': 'kering', 'longsor': 'longsor', 'gunungapi': 'gunung', 'gempa': 'gempa'}
H.append(f'''<section class="lanjut">
<h3>7.3 Temuan utama untuk musim berikutnya</h3>
<div class="kesimpulan">''' + ''.join(f'<div class="ks" style="border-top-color:{WR.get(k["warna"], C["navy"])}"><span class="ksl">{k["label"]}</span>{ikon(IKK.get(k["ikon"], "daftar"), WR.get(k["warna"], C["navy"]), 24)}<b>{it(k["judul"])}</b><p>{tok(k["isi"])}</p></div>' for k in kk) + f'''</div>
<div class="arahan"><b>Arahan yang dimohon.</b> {AKSI['kesimpulan']['arahan']['teks']}</div>
<p>Demikian laporan ini disampaikan. Atas perhatian dan arahan Bapak Presiden, kami ucapkan terima kasih.</p>
<div class="ttd">Kepala Badan Nasional Penanggulangan Bencana<br><br><br><b>Letnan Jenderal TNI Kristomei Sianturi, S.Sos., M.Si. (Han)</b></div>
</section>''')

# ---------- Lampiran ----------
pj = baca('prov_jenis.csv')
kols = list(pj[0].keys())
H.append(f'''<section class="hal">
<div class="bab" style="--w:{C['slate']}"><span>LAMPIRAN</span>Sumber Data dan Catatan Metode</div>
{fig(tabel(['Provinsi', 'Jumlah', 'Karhutla', 'Banjir', 'Longsor', 'Cuaca', 'Kering', 'Gempa', 'Erupsi'],
           [[r['provinsi'], r['total'], r['Kebakaran hutan dan lahan'], r['Banjir'], r['Tanah longsor'], r['Cuaca ekstrem'], r['Kekeringan'], r['Gempa bumi'], r['Erupsi gunung api']] for r in pj],
           kanan=(1, 2, 3, 4, 5, 6, 7, 8), lebar=[28, 9, 9, 9, 9, 9, 9, 9, 9], kelas='rapat mini'), 'Kejadian bencana alam per provinsi dan jenis, Oktober 2026', DIBI, 'tabel')}
</section>''')
H.append(f'''<section class="lanjut">
<h3>Sumber data</h3>
<ul class="sumber">
<li><b>Logbook harian Pusdalops BNPB</b>, satu berkas per hari, 1 Januari sampai 29 Oktober 2026. Satu kejadian yang ditulis ulang tiap hari
dihitung sekali, dan angka dampaknya memakai nilai terbesar yang tertulis. Kebakaran permukiman dan TPA tidak dihitung.</li>
<li><b>Laporan harian Dit. Koordalops BNPB</b>, Oktober 2026, untuk status surut atau padam per kabupaten.</li>
<li><b>GIS BNPB</b>, hotspot NASA FIRMS (MODIS, VIIRS S-NPP, NOAA-20, NOAA-21) dihitung sebagai lokasi unik per hari tanpa sumber panas tetap.</li>
<li><b>Posko OMC BNPB</b>, rekap harian 16 sampai 27 Oktober 2026.</li>
<li><b>PVMBG Badan Geologi</b>, status gunung api 1 November 2026 pukul 06.00 WIB.</li>
<li><b>Siaran pers dan laporan situasi harian BNPB</b> di bnpb.go.id, serta pemberitaan InfoPublik, Metro TV, Kompas, Katadata, dan RCTI+ untuk kegiatan dan dokumentasi.</li>
<li><b>Surat Kepala BNPB kepada Presiden</b> tertanggal 2 November 2026, untuk foto lapangan dan langkah penanganan karhutla.</li>
</ul>
<h3>Catatan metode</h3>
<ul class="sumber">
<li>Gempa bumi dan erupsi pada Bab 5 dihitung per peristiwa. Tabel nasional memakai jumlah laporan kabupaten, sehingga satu gempa yang dirasakan dua kabupaten tercatat dua kali.</li>
<li>Status banjir diambil dari laporan harian. Kabupaten yang tercatat di logbook tetapi tidak muncul di laporan harian diberi status belum dilaporkan.</li>
<li>Peluang banjir dan longsor dihitung dari laporan Pusdalops tahun penuh 2014 sampai 2020, 2024, dan 2025.</li>
</ul>
<h3>Daftar kegiatan dan tautan sumber</h3>
{tabel(['Tanggal', 'Kegiatan', 'Sumber'], [[k['tgl'][8:] + ' Okt', it(k['kegiatan']), f'<span class="url">{html.escape(k["url"])}</span>'] for k in sorted(KG['kegiatan'], key=lambda k: k['tgl'])],
       lebar=[10, 42, 48], kelas='rapat mini')}
</section>''')

CSS = (SINI / 'gaya.css').read_text(encoding='utf-8')
fnt = SK + 'fonts/'
CSS = CSS.replace('{FONT_R}', gambar(fnt + 'Roboto-Regular.ttf')).replace('{FONT_M}', gambar(fnt + 'Roboto-Medium.ttf')).replace('{FONT_B}', gambar(fnt + 'Roboto-Bold.ttf'))
IKON_H3 = [('Empat temuan', 'daftar'), ('Dukungan', 'lembaga'), ('Kejadian', 'daftar'), ('Dampak', 'rumah'), ('Action plan', 'perisai'), ('Sebaran', 'peta'),
           ('Laporan daerah', 'awas'), ('Dokumentasi', 'peta'), ('Riwayat', 'kalender'), ('Hujan', 'air'), ('Status gunung', 'gunung'), ('Prediksi', 'cuaca'),
           ('Temuan utama', 'daftar'), ('Sumber data', 'data'), ('Catatan metode', 'daftar'), ('Daftar kegiatan', 'kalender')]
import re as _re


def _h3(m):
    t = _re.sub('<[^>]+>', '', m.group(2))
    k = next((v for w, v in IKON_H3 if w.lower() in t.lower()), 'daftar')
    return f'<h3{m.group(1)}>{ikon(k, C["navy"], 20)} {m.group(2)}</h3>'


BAB_IK = {'BAB 1': 'data', 'BAB 2': 'api', 'BAB 3': 'banjir', 'BAB 4': 'cuaca', 'BAB 5': 'gempa', 'BAB 6': 'lembaga', 'BAB 7': 'kalender', 'LAMPIRAN': 'daftar'}
H = [_re.sub(r'<h3([^>]*)>(.*?)</h3>', _h3, x) for x in H]
H = [_re.sub(r'<div class="bab" style="--w:([^"]+)"><span>([^<]+)</span>', lambda m: f'<div class="bab" style="--w:{m.group(1)}"><div class="babi">{ikon(BAB_IK.get(m.group(2), "daftar"), "#FFFFFF", 44, True, m.group(1))}</div><span>{m.group(2)}</span>', x) for x in H]
H = [_re.sub(r'<div class="bab"><span>([^<]+)</span>', lambda m: f'<div class="bab"><div class="babi">{ikon(BAB_IK.get(m.group(1), "daftar"), "#FFFFFF", 44, True, C["navy"])}</div><span>{m.group(1)}</span>', x) for x in H]
bungkus = lambda isi: f'<!doctype html><html lang="id"><head><meta charset="utf-8"><title>Laporan Bencana Oktober 2026</title><style>{CSS}</style></head><body>{isi}</body></html>'
(SINI / 'sampul.html').write_text(bungkus(H[0]), encoding='utf-8')
isi = ''.join(H[1:]).replace('<section class="hal">', '<section class="awal">', 1)
(SINI / 'laporan.html').write_text(bungkus(isi), encoding='utf-8')
doc = isi
print('html', len(doc) // 1024, 'KB', NOMOR)
