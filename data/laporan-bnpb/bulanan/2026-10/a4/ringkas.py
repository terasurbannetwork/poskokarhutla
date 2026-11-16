"""Laporan Bencana Oktober 2026, versi ringkas 3 lembar A4 untuk Presiden.

python ringkas.py -> ringkas.html ; node cetak_ringkas.mjs -> 'Laporan Bencana Oktober 2026 Ringkas.pdf'
Fungsi bantu (angka, ikon, grafik, kartu) diambil dari laporan_a4.py bagian sebelum ISI, jadi angka dan gaya satu sumber.
"""
from pathlib import Path
SINI = Path(__file__).resolve().parent
_src = (SINI / 'laporan_a4.py').read_text(encoding='utf-8')
exec(compile(_src.split('# ================= ISI =================')[0].replace('SINI = Path(__file__).resolve().parent', f'SINI = Path(r"{SINI}")'), 'laporan_a4', 'exec'))

LOGO_KRIS = 'D:/Project/Work/BNPB/poskokarhutla/data/laporan-bnpb/generator/sampul/media/kris-logo.png'


def kepala(nomor, judul_kecil):
    return f'''<div class="kop"><div><div class="kop-j">Laporan Bencana Oktober 2026</div><div class="kop-s">{judul_kecil}</div></div>
<div class="kop-l"><img src="{gambar(LOGO_KRIS)}" class="lk"><img src="{gambar(SK + 'proyek-bnpb/logo/sumber-bnpb.png')}" class="lb"></div></div>'''


def kaki(nomor):
    return f'<div class="kaki"><span>Graha BNPB, Jl. Pramuka Kav. 38, Jakarta Timur 13120. Call Center 117, www.bnpb.go.id</span><b>{nomor} dari 3</b></div>'


def judul(ik, t, w=None):
    return f'<h3 class="hj">{ikon(ik, w or C["navy"], 22)} {t}</h3>'


def angka(v, label, ik, w):
    return f'<div class="ang">{ikon(ik, w, 26)}<div><div class="av" style="color:{w}">{v}</div><div class="al">{label}</div></div></div>'


def blok(ik, w, nama, peta, angka_, sudah, akan, sisi=False):
    a = ''.join(angka(*x) for x in angka_)
    gp = f'<img class="pt" src="{gambar(P + "petanya/" + peta)}">' if peta else ''
    isi = (f'<div class="bl-dua"><div>{gp}</div><div class="bl-ang v">{a}</div></div>' if sisi else f'{gp}<div class="bl-ang">{a}</div>')
    return f'''<div class="blok" style="--w:{w}"><div class="bl-h">{ikon(ik, "#FFFFFF", 22, True, w)} {nama}</div>{isi}
<div class="bl-ak"><div><b class="sd">{ikon("perisai", C["navy"], 14, False)} Sudah dan sedang</b><p>{sudah}</p></div>
<div><b class="ak2">{ikon("kalender", C["oranye"], 14, False)} Akan dilakukan</b><p>{akan}</p></div></div></div>'''


# ================= LEMBAR 1 =================
band = baca('banding.csv')
L1 = f'''<div class="lembar">
<div class="kop1"><img src="{gambar(SK + 'proyek-bnpb/logo/sumber-bnpb.png')}" class="lb1">
<div class="k1t"><div class="k1j">LAPORAN BULANAN KEPALA BNPB</div><h1>Laporan Bencana Oktober 2026</h1>
<div class="k1s">Disampaikan kepada Presiden Republik Indonesia, Jakarta, 12 November 2026</div></div>
<img src="{gambar(LOGO_KRIS)}" class="lk1"></div>
<p class="tesis">Kemarau panjang saat El Nino kuat membuat kebakaran hutan dan lahan meluas pada awal Oktober sebelum <i>hotspot</i> turun tajam,
sementara musim hujan sudah membawa banjir ke Sumatera bagian utara.</p>
{kartu([(n('n.kej'), 'kejadian bencana alam di ' + n('n.prov') + ' provinsi', C['navy']), (n('karhutla.persen', 1) + '%', 'di antaranya kebakaran hutan dan lahan', C['api']),
        (n('n.tdm'), 'warga terdampak dan mengungsi', C['basah']), (n('n.md_hilang'), 'jiwa meninggal dan hilang', C['merah'])])}
{judul('data', 'Gambaran umum')}
<p>Selama Oktober 2026 terjadi {B('n.kej')} bencana alam di {B('n.kab')} kabupaten dan kota. Kebakaran hutan dan lahan mendominasi dengan {B('karhutla.kej')} kejadian,
disusul banjir sebanyak {B('banjir.kej')} kejadian. Bencana tersebut merusak {B('n.rumah')} rumah dan merendam {B('n.terendam')} rumah.
Dibanding September 2026, korban meninggal dan hilang turun dari {B('sep.md_hilang')} menjadi {B('c26.md_hilang')} jiwa, dan warga terdampak turun {B('ch.tdm.abs', 1)} persen.</p>
<div class="dua">
<div>{fig(kolom_tumpuk(baca('riwayat_bulan.csv'), ['kering', 'basah', 'geologi'], [C['api'], C['basah'], C['geologi']], ['Kering', 'Basah', 'Geologi'], w=380, h=215),
          'Kejadian per bulan, Januari sampai Oktober 2026', 'Logbook harian Pusdalops BNPB 2026')}</div>
<div>{fig(tabel(['Indikator', 'Sep 2026', 'Okt 2026', 'Perubahan'],
                [[r['indikator'], f(int(r['y2025'])), f(int(r['y2026'])), (f'<span class="turun">turun {f(abs(float(r["ubah"])), 1)}%</span>' if float(r["ubah"]) < 0 else f'<span class="naik">naik {f(float(r["ubah"]), 1)}%</span>')] for r in band],
                kanan=(1, 2, 3), lebar=[40, 19, 19, 22], kelas='rapat'), 'Oktober dibanding September 2026', 'Logbook harian Pusdalops BNPB, September dan 1 sampai 29 Oktober 2026', 'tabel')}</div>
</div>
{judul('daftar', 'Empat temuan utama')}
<div class="temuan">
<div class="tm"><div class="tmk">{ikon('api', C['api'], 30)}</div><div><b>Hotspot masih sangat tinggi.</b> Sistem GIS BNPB menghitung {B('kh.hot')} <i>hotspot</i> pada Oktober,
{B('kh.top6.persen', 1)} persen di antaranya di enam provinsi. <i>Hotspot</i> harian turun {B('kh.turun.p.abs', 1)} persen dari puncak 6 Oktober sampai 31 Oktober.</div></div>
<div class="tm"><div class="tmk">{ikon('awas', C['merah'], 30)}</div><div><b>Laporan karhutla daerah tidak sejalan dengan satelit.</b> Enam provinsi dengan <i>hotspot</i> terbanyak
hanya melaporkan {B('kh.lapor.top6')} kejadian karhutla, sedangkan tiga provinsi di Jawa dan Sulawesi melaporkan {B('kh.lapor.jawa_sulsel')} kejadian.</div></div>
<div class="tm"><div class="tmk">{ikon('banjir', C['basah'], 30)}</div><div><b>Banjir sudah datang di Sumatera bagian utara.</b> Terjadi {B('banjir.kej')} banjir yang berdampak
pada {B('banjir.tdm')} warga, dan {B('banjir.st.belum')} kabupaten masih dilaporkan belum surut pada akhir Oktober.</div></div>
<div class="tm"><div class="tmk">{ikon('gempa', C['geologi'], 30)}</div><div><b>Gempa merusak rumah warga.</b> Gempa di Sumba Barat Daya dan Jawa Barat merusak {B('gempa.rumah')} rumah,
sedangkan {B('ga.siaga')} gunung api berstatus Siaga per 1 November, termasuk Merapi dan Semeru.</div></div>
</div>
{judul('cuaca', 'Prediksi November dan Desember 2026')}
<p>Hujan Oktober sampai Desember diperkirakan di bawah normal karena El Nino masih kuat, terutama di Jawa dengan kekurangan sekitar {B('iklim.jawa.kurang', 1)} persen.
Namun, riwayat laporan Pusdalops menunjukkan banjir dan longsor tetap berpeluang tinggi di banyak kabupaten.</p>
{kartu([(n('pr.banjir.nov'), 'kabupaten berpeluang banjir, November', C['basah']), (n('pr.banjir.des'), 'kabupaten berpeluang banjir, Desember', C['basah']),
        (n('pr.longsor.nov'), 'kabupaten berpeluang longsor, November', C['geologi']), (n('pr.longsor.des'), 'kabupaten berpeluang longsor, Desember', C['geologi'])])}
{kaki(1)}</div>'''

# ================= LEMBAR 2 =================
L2 = f'''<div class="lembar">{kepala(2, 'Rincian per jenis bencana')}
<div class="grid2">
{blok('api', C['api'], 'Kebakaran hutan dan lahan', 'karhutla.png',
      [(n('kh.hot'), 'hotspot, terbanyak di Kalimantan Tengah', 'api', C['api']), ('±' + n('kh.luas'), 'ha perkiraan luas terbakar', 'luas', C['api']),
       (n('karhutla.kej'), 'kejadian dilaporkan daerah', 'daftar', C['navy'])],
      f'Kepala BNPB memimpin rapat koordinasi di Palembang dan Batu. BNPB mengerahkan {B("rs.personel")} personel darat dan {B("rs.armada")} armada udara, serta OMC sebanyak {B("omc.sortie")} sorti.',
      'Pesawat OMC disiapkan di Bandara Kertajati, dan operasi diakhiri bertahap bila <i>hotspot</i> terus menurun.')}
{blok('banjir', C['basah'], 'Banjir dan tanah longsor', 'banjir.png',
      [(n('banjir.kej'), 'banjir di ' + n('banjir.kab') + ' kabupaten', 'banjir', C['basah']), (n('banjir.tdm'), 'warga terdampak banjir', 'orang', C['basah']),
       (n('banjir.st.belum'), 'kabupaten belum surut per 31 Oktober', 'awas', C['merah']), (n('longsor.md_hilang'), 'korban jiwa akibat longsor', 'longsor', C['geologi'])],
      f'BPBD menangani banjir Medan dan Binjai hingga surut, dan ekskavator membuka jalan yang tertutup longsor di Gayo Lues. Aceh Selatan berstatus tanggap darurat sampai 12 November.',
      f'Tanggul Langkat diperbaiki dengan <i>geobag</i>, dan {B("rs.rawan.banjir")} kabupaten rawan banjir disiapkan sebelum puncak hujan.', sisi=True)}
{blok('cuaca', C['emas'], 'Cuaca ekstrem dan kekeringan', 'cuaca.png',
      [(n('cuaca.kej'), 'cuaca ekstrem di ' + n('cuaca.kab') + ' kabupaten', 'cuaca', C['emas']), (n('cuaca.rumah'), 'rumah rusak karena angin', 'rumah', C['emas']),
       (n('kekeringan.tdm'), 'warga terdampak kekeringan', 'kering', C['oranye'])],
      f'BPBD menyalurkan {B("rs.air.liter")} liter air bersih untuk {B("rs.air.kk")} kepala keluarga, dan kerusakan akibat angin kencang sedang diverifikasi.',
      'Daerah mengikuti peringatan dini BMKG, dan warga diimbau menghemat air karena hujan diperkirakan di bawah normal.')}
{blok('gempa', C['geologi'], 'Geologi dan vulkanologi', 'geologi.png',
      [(n('gempa.ev'), 'gempa bumi merusak atau dirasakan', 'gempa', C['geologi']), (n('gempa.rumah'), 'rumah rusak akibat gempa', 'rumah', C['geologi']),
       (n('ga.siaga'), 'gunung api Siaga: Anak Krakatau, Merapi, Semeru', 'gunung', C['oranye'])],
      'Pemerintah daerah Sumba Barat Daya mengaktifkan pos komando, dan pos pendamping nasional melanjutkan pendataan rumah rusak gempa NTT bulan Agustus.',
      'Warga dilarang memasuki radius bahaya gunung api yang ditetapkan PVMBG dan diimbau menyiapkan tas siaga gempa.')}
</div>
<p class="sb"><b>Sumber:</b> {DIBI}; {GIS}; laporan harian Dit. Koordalops BNPB; PVMBG Badan Geologi, 1 November 2026; {SR}.</p>
{kaki(2)}</div>'''

# ================= LEMBAR 3 =================
kp = baca('pk_kepala.csv')
dk = AKSI['dukungan']['butir']
WK = {'100-hari': '100 hari', '2026-2027': '2026 sampai 2027', '2028-2030': '2028 sampai 2030'}
IKD = {'pembiayaan': 'uang', 'regulasi': 'hukum', 'data': 'data', 'infrastruktur': 'jembatan', 'kapasitas': 'sirene'}
L3 = f'''<div class="lembar">{kepala(3, 'Program kerja, prediksi, dan dukungan yang dimohon')}
{judul('lembaga', 'Program kerja BNPB Oktober 2026')}
<p>BNPB menjalankan {B('pk.n')} kegiatan utama pada Oktober 2026. Sebanyak {B('pk.kepala')} kegiatan melibatkan Kepala BNPB secara langsung,
{B('pk.ops')} kegiatan berupa operasi pemadaman dan OMC, dan {B('pk.pusdatin')} kegiatan berupa informasi publik. BNPB juga menerbitkan {B('rs.siaran')} laporan situasi harian.</p>
<div class="dua dua-lebar">
<div>{tabel(['Tanggal', 'Kegiatan Kepala BNPB', 'Lokasi'], [[r['tanggal'], r['kegiatan'], r['lokasi']] for r in kp], lebar=[15, 60, 25], kelas='rapat mini2')}</div>
<div class="ft2"><img src="{gambar(P + 'foto/web/pk-lantik.jpg')}"><div class="fk">Pelantikan Kepala BNPB oleh Presiden, 15 Oktober 2026<span>Foto: BNPB</span></div>
<img src="{gambar(P + 'foto/web/pk-batu.jpg')}"><div class="fk">Rapat koordinasi karhutla Jawa Timur di Batu<span>Foto: Metro TV</span></div></div>
</div>
{judul('hukum', 'Dukungan yang dimohon kepada Bapak Presiden')}
<div class="duk">''' + ''.join(f'''<div class="dk">{ikon(IKD.get(b['jenis'], 'daftar'), C['oranye'], 28)}<div><b>{b['langkah']}.</b> {it(b['rincian'])}
<div class="dkm">{', '.join(b['lembaga'])}; {WK.get(b['waktu'], b['waktu'])}</div></div></div>''' for b in dk) + f'''</div>
<div class="arahan"><b>Arahan yang dimohon.</b> {AKSI['kesimpulan']['arahan']['teks']}</div>
<div class="ttd">Kepala Badan Nasional Penanggulangan Bencana<br><br><b>Letnan Jenderal TNI Kristomei Sianturi, S.Sos., M.Si. (Han)</b></div>
{kaki(3)}</div>'''

CSS = (SINI / 'gaya.css').read_text(encoding='utf-8') + (SINI / 'ringkas.css').read_text(encoding='utf-8')
fnt = SK + 'fonts/'
CSS = CSS.replace('{FONT_R}', gambar(fnt + 'Roboto-Regular.ttf')).replace('{FONT_M}', gambar(fnt + 'Roboto-Medium.ttf')).replace('{FONT_B}', gambar(fnt + 'Roboto-Bold.ttf'))
doc = f'<!doctype html><html lang="id"><head><meta charset="utf-8"><title>Laporan Bencana Oktober 2026 Ringkas</title><style>{CSS}</style></head><body class="rk">{L1}{L2}{L3}</body></html>'
(SINI / 'ringkas.html').write_text(doc, encoding='utf-8')
print('ringkas.html', len(doc) // 1024, 'KB')
