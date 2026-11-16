"""Spek deck Laporan Bencana Oktober 2026 untuk Presiden (mesin ppt-konsultan deck.py).
python spek.py -> <proyek>/spek/laporan-oktober.json. Aksi dan program kerja dibaca dari aksi.json dan program.json di folder ini.
"""
import json, os, csv

HOME = os.path.expanduser('~').replace(chr(92), '/') + '/'
P = HOME + '.claude/skills/ppt-konsultan/bnpb/assets/proyek-bulanan/'
SINI = os.path.dirname(os.path.abspath(__file__)).replace(chr(92), '/') + '/'
A = lambda k, o='': '{{angka:' + k + (('|' + o) if o else '') + '}}'
KRIS = 'foto/kris-header.png'
DIBI = 'Logbook harian Pusdalops BNPB, 1 s.d. 29 Okt 2026 (bencana alam)'
GIS = 'GIS BNPB, hotspot NASA FIRMS (MODIS, VIIRS), 1 s.d. 31 Okt 2026'
LOG = 'Laporan harian Dit. Koordalops BNPB, Oktober 2026'
AKSI = json.load(open(SINI + 'aksi.json', encoding='utf-8')) if os.path.exists(SINI + 'aksi.json') else {}
PROG = json.load(open(SINI + 'program.json', encoding='utf-8')) if os.path.exists(SINI + 'program.json') else {}


def kol(nama, kepala=None, fmt=None, **kw):
    c = {'nama': nama}
    if kepala:
        c['kepala'] = kepala
    if fmt:
        c['fmt'] = fmt
    c.update(kw)
    return c


def data(csv_, kolom, sumber, keyakinan='resmi', **kw):
    d = {'csv': 'data/lb/' + csv_, 'kolom': kolom, 'keyakinan': keyakinan, 'sumber': sumber}
    d.update(kw)
    return d


def isi(s, **kw):
    """medan bersama slide isi"""
    base = {'cut_off': False}   # logo KRIS dipasang mesin (deck.py pasang_kris); jangan dobel
    base.update(s)
    base.update(kw)
    return base


def alur_aksi(kunci, judul, pesan, sumber, ikon='karhutla'):
    a = AKSI[kunci]
    return isi({'jenis': 'temuan-visual', 'jenis_slide': 'panel', 'judul_bentuk': 'deskriptif', 'pesan': pesan, 'judul': judul,
                'rasio': 0.7 if a.get('foto') else 1.0, 'seri': kunci, 'bagian': 2,
                'utama': {'tanpa_kepala': True, 'alur': dict({'gradasi': True, 'sorot': 2, 'sumber': sumber, 'langkah': a['langkah']}, **({'skala_huruf': a['skala']} if a.get('skala') else {}))},
                **({'panel': {'judul': 'Dokumentasi', 'ikon': 'wilayah', 'kolom_foto': 1, 'foto': a['foto']}} if a.get('foto') else {}),
                'sumber': sumber})


def galeri(judul, pesan, panel, seri=None):
    return isi({'jenis': 'galeri', 'jenis_slide': 'panel', 'judul_bentuk': 'deskriptif', 'pesan': pesan, 'judul': judul, 'seri': seri, 'bagian': 2,
                'sumber': 'Lampiran surat Kepala BNPB kepada Presiden, 2 Nov 2026',
                'kolom_panel': len(panel), 'panel': panel})


S = []
# ---------------- sampul, daftar isi ----------------
S.append({'jenis': 'sampul', 'layout': 'putih', 'judul_penuh': True, 'skala_subjudul': 0.9, 'foto': 'foto/web/pk-personel.jpg',
          'kota': 'Jakarta', 'kredit': 'Foto: BNPB, personel darat memadamkan api gambut, Oktober 2026', 'logo_kanan': 'foto/berakhlak-hd.png',
          'kepada': 'Disampaikan kepada Presiden Republik Indonesia',
          'subjudul': 'Dampak dan penanganan bencana alam di Indonesia',
          'penyaji': {'nama': 'Letnan Jenderal TNI Kristomei Sianturi, S.Sos., M.Si. (Han)', 'jabatan': 'Kepala Badan Nasional Penanggulangan Bencana'}})
S.append({'jenis': 'daftar-isi'})

# ================= BAGIAN 1: GAMBARAN UMUM =================
S.append({'jenis': 'pembatas-seksi', 'bagian': 1})
# 1a Bencana
S.append(isi({
    'jenis': 'temuan-visual', 'jenis_slide': 'grafik', 'judul_bentuk': 'temuan', 'bagian': 1,
    'pesan': 'Bencana Oktober didominasi karhutla dan tersebar di 27 provinsi',
    'judul': f'Terjadi {A("n.kej")} bencana alam pada Oktober 2026, dan {A("karhutla.persen", "fmt=1")} persen di antaranya kebakaran hutan dan lahan',
    'rasio': 0.56,
    'grup': [{'pil': 'Sebaran kejadian', 'nada': 'data', 'ikon': 'ringkasan', 'kartu': [
        {'nilai': A('karhutla.kej'), 'label': 'Kebakaran hutan dan lahan', 'ikon': 'karhutla', 'warna': 'kategori.api'},
        {'nilai': A('banjir.kej'), 'label': 'Banjir', 'ikon': 'banjir', 'warna': 'kategori.basah'},
        {'nilai': A('n.prov'), 'label': 'Provinsi terdampak', 'ikon': 'wilayah', 'warna': 'navy'},
        {'nilai': A('n.kab'), 'label': 'Kabupaten dan kota terdampak', 'ikon': 'wilayah', 'warna': 'navy'}]}],
    'utama': {'judul': 'Sepuluh provinsi dengan kejadian terbanyak', 'ikon': 'wilayah',
              'catatan': ['Kolom kering memuat karhutla dan kekeringan. Kolom basah memuat banjir dan tanah longsor beserta cuaca ekstrem.'],
              'heatmap': {'ramp': 'netral', 'satuan': 'kejadian', 'skala_huruf': 1.2,
                          'data': data('prov_top.csv', [kol('provinsi', 'Provinsi'), kol('kering', 'Kering', '0'), kol('basah', 'Basah', '0'),
                                                        kol('geologi', 'Geologi', '0'), kol('total', 'Jumlah', '0')], DIBI)}},
    'panel': {'judul': 'Kejadian per bulan, Jan s.d. Okt 2026', 'ikon': 'kalender',
              'catatan': ['Logbook dua hari terakhir Oktober belum tersedia di arsip Pusdalops, sehingga kejadian pada dua hari itu belum terhitung.'],
              'kolom_tumpuk': {'warna': ['kategori.api', 'kategori.basah', 'kategori.geologi'], 'data': data('riwayat_bulan.csv', [kol('bulan'), kol('kering', 'Hidrometeorologi kering', '0'), kol('basah', 'Hidrometeorologi basah', '0'),
                                                                   kol('geologi', 'Geologi', '0')], DIBI)}},
    'sumber': DIBI}))
# 1b Dampak
S.append(isi({
    'jenis': 'tabel-peringkat', 'jenis_slide': 'tabel', 'judul_bentuk': 'temuan', 'bagian': 1,
    'pesan': 'Dampak Oktober 2026 lebih ringan dari September 2026',
    'judul': f'Korban meninggal dan hilang turun dari {A("sep.md_hilang")} menjadi {A("c26.md_hilang")} jiwa dibanding September 2026',
    'rasio': 0.55,
    'tabel': {'judul_panel': 'September dibanding Oktober 2026', 'ikon': 'kalender', 'peringkat': False, 'baris_maks_pt': 64, 'skala_huruf': 1.35,
              'data': data('banding.csv', [kol('indikator', 'Indikator'), kol('y2025', 'Sep 2026', '0'), kol('y2026', 'Okt 2026', '0'),
                                           kol('ubah', 'Perubahan, persen', '1|arah')], 'Logbook harian Pusdalops BNPB, September dan Oktober 2026')},
    'panel': {'judul': 'Kerusakan Oktober 2026', 'ikon': 'rumah',
              'angka_besar': {'mode': 'kartu', 'tata': 'kisi', 'kolom': 2, 'kartu': [
                  {'label': 'Rumah rusak berat', 'nilai': A('n.rr_berat'), 'satuan': 'unit', 'ikon': 'rumah'},
                  {'label': 'Rumah rusak sedang', 'nilai': A('n.rr_sedang'), 'satuan': 'unit', 'ikon': 'rumah'},
                  {'label': 'Rumah rusak ringan', 'nilai': A('n.rr_ringan'), 'satuan': 'unit', 'ikon': 'rumah'},
                  {'label': 'Rumah terendam', 'nilai': A('n.terendam'), 'satuan': 'unit', 'ikon': 'banjir'},
                  {'label': 'Kepala keluarga terdampak', 'nilai': A('n.kk'), 'satuan': 'KK', 'ikon': 'jiwa'},
                  {'label': 'Warga mengungsi', 'nilai': A('n.mengungsi'), 'satuan': 'jiwa', 'ikon': 'pengungsi'}]}},
    'sumber': 'Logbook harian Pusdalops BNPB, September dan 1 s.d. 29 Oktober 2026'}))
# 1c Temuan (ringkasan, navigasi)
S.append(isi({
    'jenis': 'kartu-angka', 'jenis_slide': 'navigasi', 'judul_bentuk': 'deskriptif', 'bagian': 1,
    'pesan': 'Empat temuan utama Oktober 2026', 'judul': 'Temuan utama Oktober 2026',
    'judul_panel': 'Temuan utama', 'kolom': 2, 'skala_huruf': 1.32,
    'tesis': 'Kemarau panjang saat El Nino kuat membuat karhutla meluas pada awal Oktober sebelum hotspot turun tajam, sementara musim hujan sudah membawa banjir ke Sumatera bagian utara.',
    'temuan': [
        {'kode': 'Temuan A.1', 'keyakinan': 'terverifikasi', 'ikon': 'karhutla',
         'teks': f'**Hotspot masih sangat tinggi.** Sistem mencatat {A("kh.hot")} hotspot pada Oktober, dan {A("kh.top6.persen", "fmt=1")} persen di antaranya berada di enam provinsi, terbanyak di Kalimantan Tengah dan Papua Selatan.'},
        {'kode': 'Temuan A.2', 'keyakinan': 'resmi',
         'ikon': 'peringatan',
         'teks': f'**Laporan karhutla daerah tidak sejalan dengan satelit.** Enam provinsi dengan hotspot terbanyak hanya melaporkan {A("kh.lapor.top6")} kejadian, sedangkan tiga provinsi di Jawa dan Sulawesi melaporkan {A("kh.lapor.jawa_sulsel")} kejadian.'},
        {'kode': 'Temuan A.3', 'keyakinan': 'resmi', 'ikon': 'banjir',
         'teks': f'**Banjir mulai datang di Sumatera bagian utara.** Terjadi {A("banjir.kej")} banjir yang berdampak pada {A("banjir.tdm")} warga, dan {A("banjir.st.belum")} kabupaten masih dilaporkan belum surut pada akhir Oktober.'},
        {'kode': 'Temuan A.4', 'keyakinan': 'resmi', 'ikon': 'gempa',
         'teks': f'**Gempa merusak rumah warga.** Gempa di Sumba Barat Daya dan Jawa Barat merusak {A("gempa.rumah")} rumah, sedangkan {A("ga.siaga")} gunung api berstatus Siaga per 1 November, termasuk Merapi dan Semeru.'}],
    'pita': {'label': 'Perlu diantisipasi', 'nada': 'aksi', 'kolom': [
        {'ikon': 'banjir', 'judul': 'Banjir Desember', 'isi': f'Sebanyak {A("pr.banjir.des")} kabupaten berpeluang tinggi dilanda banjir.'},
        {'ikon': 'longsor', 'judul': 'Longsor Desember', 'isi': f'Sebanyak {A("pr.longsor.des")} kabupaten berpeluang tinggi dilanda longsor.'},
        {'ikon': 'kekeringan', 'judul': 'Hujan di Jawa', 'isi': f'Hujan Oktober sampai Desember diperkirakan {A("iklim.jawa.kurang", "fmt=1")} persen di bawah normal.'}]},
    'sumber': 'Logbook harian Pusdalops BNPB; GIS BNPB; laporan harian Dit. Koordalops BNPB; PVMBG Badan Geologi'}))
# 1d Action plan umum
S.append(isi({
    'jenis': 'temuan-visual', 'jenis_slide': 'panel', 'judul_bentuk': 'deskriptif', 'bagian': 1,
    'pesan': 'Action plan umum', 'judul': 'Action plan BNPB pada Oktober dan rencana bulan berikutnya', 'rasio': 0.66,
    'panel': {'judul': 'Dokumentasi', 'ikon': 'wilayah', 'kolom_foto': 1, 'foto': [
        {'berkas': 'foto/web/h-1425.jpg', 'keterangan': 'Petugas memadamkan api, laporan 25 Oktober'}]},
    'utama': {'tanpa_kepala': True, 'daftar_ikon': {'mode': 'baris', 'baris': [
        {'ikon': 'prabencana', 'judul': 'Sudah dilakukan', 'isi': 'Kepala BNPB memimpin rapat koordinasi karhutla di Sumatera Selatan dan Jawa Timur, lalu menambah armada udara. Kepala BNPB juga meninjau Way Kambas dan Merauke dari udara. BPBD menangani banjir di Sumatera Utara dan Aceh serta menyalurkan air bersih ke daerah kekeringan.',
         'angka': A('rs.personel'), 'satuan': 'personel darat'},
        {'ikon': 'tanggap-darurat', 'judul': 'Sedang berjalan', 'isi': 'Armada udara dan operasi modifikasi cuaca (OMC) terus bekerja di provinsi dengan hotspot terbanyak. Pendataan rumah rusak gempa besar NTT bulan Agustus berlanjut, dan beberapa kabupaten di Sumatera bagian utara dan barat belum dilaporkan surut.',
         'angka': A('rs.armada'), 'satuan': 'armada udara'},
        {'ikon': 'kalender', 'judul': 'Akan dilakukan', 'isi': 'Kesiapsiagaan musim hujan dijalankan menurut delapan langkah surat edaran Kepala BNPB. Daerah rawan disiapkan sebelum puncak hujan, sementara operasi karhutla diakhiri bertahap bila hotspot terus menurun.',
         'angka': A('rs.rawan.banjir'), 'satuan': 'kabupaten rawan banjir'}]}},
    'sumber': 'Siaran pers dan laporan situasi harian BNPB, Oktober 2026'}))

# ================= BAGIAN 2: PER JENIS BENCANA =================
S.append({'jenis': 'pembatas-seksi', 'bagian': 2})
# ---- Karhutla ----
S.append(isi({
    'jenis': 'temuan-peta', 'jenis_slide': 'peta', 'judul_bentuk': 'temuan', 'bagian': 2, 'seri': 'karhutla',
    'pesan': 'Sebaran hotspot Oktober per provinsi dan riwayatnya',
    'judul': f'Karhutla: hotspot Oktober mencapai {A("kh.hot")}, terbanyak di {{{{tempat:Kalimantan Tengah}}}} dan {{{{tempat:Papua Selatan}}}}',
    'rasio': 0.66,
    'peta': {'png': 'petanya/karhutla.png', 'keyakinan': 'terverifikasi', 'sumber': GIS, 'unsur_tampil': False,
             'legenda': {'judul': 'Hotspot', 'item': [
                 {'warna': 'skala.api.1', 'label': '< ' + A('kh.amb1')}, {'warna': 'skala.api.2', 'label': A('kh.amb1') + '-' + A('kh.amb2')},
                 {'warna': 'skala.api.3', 'label': A('kh.amb2') + '-' + A('kh.amb3')}, {'warna': 'skala.api.4', 'label': A('kh.amb3') + '-' + A('kh.amb4')},
                 {'warna': 'skala.api.5', 'label': '> ' + A('kh.amb4')}]}},
    'panel': {'judul': 'Hotspot per bulan, Jan s.d. Okt 2026', 'ikon': 'kalender',
              'garis': {'sorot': 'Hotspot', 'data': data('kh_bulan.csv', [kol('bulan'), kol('titik', 'Hotspot', '0')], GIS.replace('1 s.d. 31 Okt 2026', 'Jan s.d. Okt 2026'), 'terverifikasi')}},
    'sumber': GIS}))
S.append(isi({
    'jenis': 'tabel-peringkat', 'jenis_slide': 'tabel', 'judul_bentuk': 'temuan', 'bagian': 2, 'seri': 'karhutla',
    'pesan': 'Dampak karhutla: luas terbakar dan kerusakan',
    'judul': f'Perhitungan satelit memperkirakan karhutla menghanguskan {A("kh.luas")} ha pada Oktober, dan laporan daerah mencatat {A("karhutla.kej")} kejadian karhutla',
    'rasio': 0.6,
    'tabel': {'judul_panel': 'Sepuluh provinsi dengan hotspot terbanyak', 'ikon': 'karhutla', 'peringkat': True,
              'data': data('kh_prov.csv', [kol('provinsi', 'Provinsi'), kol('titik', 'Hotspot', '0'), kol('luas', 'Perkiraan luas terbakar, ha', '0'),
                                           kol('belum', 'Belum padam 31 Okt, ha', '0')], GIS + '; luas dan belum padam adalah perkiraan sistem', 'terverifikasi')},
    'panel': {'judul': 'Dampak yang dilaporkan daerah', 'ikon': 'jiwa',
              'catatan': ['Luas terbakar dihitung dari jumlah hotspot satelit VIIRS (NASA FIRMS) dikali luas rata-rata per titik dari data resmi BNPB tahun sebelumnya.'],
              'angka_besar': {'mode': 'kartu', 'kolom': 1, 'kartu': [
                  {'label': 'Kepala keluarga terdampak karhutla', 'nilai': A('karhutla.kk'), 'satuan': 'KK', 'ikon': 'karhutla'},
                  {'label': 'Korban meninggal dan hilang', 'nilai': A('karhutla.md_hilang'), 'satuan': 'jiwa', 'ikon': 'jiwa'},
                  {'label': 'Warga terdampak dan mengungsi', 'nilai': A('karhutla.tdm'), 'satuan': 'jiwa', 'ikon': 'pengungsi'}]}},
    'sumber': 'GIS BNPB (NASA FIRMS) dan logbook harian Pusdalops BNPB, 1 s.d. 29 Okt 2026'}))
if 'karhutla' in AKSI:
    S.append(alur_aksi('karhutla', 'Karhutla: action plan penanganan Oktober', 'Action plan karhutla', AKSI['karhutla']['sumber']))
S.append(galeri('Karhutla: dokumentasi penanganan di lapangan, Oktober 2026', 'Dokumentasi karhutla', [
    {'judul': 'Koordinasi', 'ikon': 'lembaga', 'kolom_foto': 2, 'bobot': 1, 'foto': [
        {'berkas': 'foto/surat-6.jpg', 'keterangan': 'Rapat koordinasi karhutla Sumatera Selatan'},
        {'berkas': 'foto/surat-2.jpg', 'keterangan': 'Kepala BNPB memimpin rapat penanganan'},
        {'berkas': 'foto/surat-7.jpg', 'keterangan': 'Rapat koordinasi lintas instansi'},
        {'berkas': 'foto/surat-5.jpg', 'keterangan': 'Rapat bersama Pemerintah Kabupaten Pulang Pisau'}]},
    {'judul': 'Pemadaman', 'ikon': 'karhutla', 'kolom_foto': 2, 'bobot': 1, 'foto': [
        {'berkas': 'foto/surat-4.jpg', 'keterangan': 'Kepala BNPB meninjau pemadaman'},
        {'berkas': 'foto/surat-10.jpg', 'keterangan': 'Prajurit TNI memadamkan api'},
        {'berkas': 'foto/surat-8.jpg', 'keterangan': 'Pompa air dari kolam penampung'},
        {'berkas': 'foto/surat-9.jpg', 'keterangan': 'Tim gabungan di lahan gambut terbakar'}]}], 'karhutla'))

# ---- Banjir dan tanah longsor ----
S.append(isi({
    'jenis': 'temuan-peta', 'jenis_slide': 'peta', 'judul_bentuk': 'temuan', 'bagian': 2, 'seri': 'banjir',
    'pesan': 'Sebaran banjir dan statusnya',
    'judul': f'Banjir dan longsor: {A("banjir.kej")} banjir melanda {A("banjir.kab")} kabupaten dengan kejadian terbanyak di {{{{tempat:Aceh}}}} dan {{{{tempat:Sumatera Utara}}}}',
    'rasio': 0.42,
    'peta': {'png': 'petanya/banjir.png', 'keyakinan': 'resmi', 'sumber': LOG, 'unsur_tampil': False,
             'legenda': {'kartu': True, 'judul': 'Status banjir per 31 Okt', 'item': [
                 {'warna': 'merah', 'label': 'Belum surut', 'nilai': A('banjir.st.belum'), 'ikon': 'peringatan', 'tint': 'tint.bahaya.pita'},
                 {'warna': 'skala.air.4', 'label': 'Sudah surut', 'nilai': A('banjir.st.selesai'), 'ikon': 'rumah', 'tint': 'tint.basah.pita'},
                 {'warna': 'skala.netral.3', 'label': 'Status belum dilaporkan', 'nilai': A('banjir.st.tanpa'), 'ikon': 'data', 'tint': 'tint.netral.pita'}]}},
    'panel': {'tanpa_kepala': True, 'pita_kelompok': True, 'pita_tinggi_pt': 16, 'peringkat': True,
              'data': data('banjir_kab.csv', [kol('prov', 'Provinsi'), kol('kab', 'Kab/Kota'), kol('kej', 'Kejadian', '0'), kol('tdm', 'Terdampak, jiwa', '0'),
                                              kol('st', 'Kondisi', pil={'Belum surut': ['tint.bahaya.pita', 'tint.bahaya.pita', 'teks', 'merah', 'peringatan', 'kertas'],
                                                                        'Sudah surut': ['tint.basah.pita', 'tint.basah.pita', 'teks', 'skala.air.3', 'rumah', 'kertas'],
                                                                        'Belum dilaporkan': ['tint.netral.pita', 'tint.netral.pita', 'teks', 'skala.netral.3', 'data', 'kertas']})],
                           DIBI + '; status dari ' + LOG)},
    'sumber': DIBI + '; status dari ' + LOG}))
S.append(isi({
    'jenis': 'temuan-visual', 'jenis_slide': 'grafik', 'judul_bentuk': 'temuan', 'bagian': 2, 'seri': 'banjir',
    'pesan': 'Riwayat dan dampak banjir',
    'judul': f'Banjir Oktober berdampak pada {A("banjir.tdm")} warga dan merendam {A("banjir.terendam")} rumah, sedangkan longsor menelan {A("longsor.md_hilang")} korban jiwa',
    'rasio': 0.55,
    'utama': {'judul': 'Riwayat banjir Januari sampai Oktober 2026', 'ikon': 'banjir',
              'garis': {'sorot': 'Banjir', 'data': data('riwayat_banjir.csv', [kol('bulan'), kol('kejadian', 'Banjir', '0')], DIBI.replace('1 s.d. 29 Okt 2026', 'Jan s.d. 29 Okt 2026'))}},
    'panel': {'judul': 'Dampak banjir dan longsor Oktober', 'ikon': 'jiwa',
              'angka_besar': {'mode': 'kartu', 'kolom': 2, 'kartu': [
                  {'label': 'Warga mengungsi karena banjir', 'nilai': A('banjir.mengungsi'), 'satuan': 'jiwa', 'ikon': 'pengungsi'},
                  {'label': 'Rumah rusak karena banjir', 'nilai': A('banjir.rumah'), 'satuan': 'unit', 'ikon': 'rumah'},
                  {'label': 'Kejadian tanah longsor', 'nilai': A('longsor.kej'), 'satuan': 'kejadian', 'ikon': 'longsor'},
                  {'label': 'Rumah rusak karena longsor', 'nilai': A('longsor.rumah'), 'satuan': 'unit', 'ikon': 'rumah'}]}},
    'sumber': DIBI}))
if 'banjir' in AKSI:
    S.append(alur_aksi('banjir', 'Banjir dan longsor: action plan penanganan Oktober', 'Action plan banjir', AKSI['banjir']['sumber']))

# ---- Cuaca ekstrem dan kekeringan ----
S.append(isi({
    'jenis': 'temuan-peta', 'jenis_slide': 'peta', 'judul_bentuk': 'temuan', 'bagian': 2, 'seri': 'cuaca',
    'pesan': 'Sebaran cuaca ekstrem dan kekeringan',
    'judul': f'Cuaca ekstrem dan kekeringan: {A("cuaca.kej")} cuaca ekstrem dan {A("kekeringan.kej")} kekeringan terjadi di {A("cuaca.kab")} dan {A("kekeringan.kab")} kabupaten',
    'rasio': 0.64,
    'peta': {'png': 'petanya/cuaca.png', 'keyakinan': 'resmi', 'sumber': DIBI, 'unsur_tampil': False,
             'legenda': {'kartu': True, 'judul': 'Jenis bencana', 'item': [
                 {'warna': 'skala.emas.4', 'label': 'Cuaca ekstrem', 'nilai': A('cuaca.kab'), 'ikon': 'cuaca-ekstrem', 'tint': 'tint.netral.pita'},
                 {'warna': 'oranye', 'label': 'Kekeringan', 'nilai': A('kekeringan.kab'), 'ikon': 'kekeringan', 'tint': 'tint.api.pita'}]}},
    'panel': {'tanpa_kepala': True, 'peringkat': True,
              'data': data('cuaca_kab.csv', [kol('kab', 'Kab/Kota', ganti={'Kota Lhokseumawe': 'Lhokseumawe'}), kol('jenis', 'Jenis'), kol('tdm', 'Terdampak, jiwa', '0'), kol('rumah', 'Rumah rusak', '0')], DIBI)},
    'sumber': DIBI}))
S.append(isi({
    'jenis': 'temuan-visual', 'jenis_slide': 'grafik', 'judul_bentuk': 'temuan', 'bagian': 2, 'seri': 'cuaca',
    'pesan': 'Dampak cuaca ekstrem dan kekeringan, prakiraan hujan',
    'judul': f'Kekeringan berdampak pada {A("kekeringan.tdm")} warga, dan cuaca ekstrem merusak {A("cuaca.rumah")} rumah pada Oktober',
    'rasio': 0.5,
    'utama': {'judul': 'Riwayat Januari sampai Oktober 2026', 'ikon': 'kalender',
              'garis': {'data': data('riwayat_ck.csv', [kol('bulan'), kol('cuaca', 'Cuaca ekstrem', '0'), kol('kekeringan', 'Kekeringan', '0')],
                                     DIBI.replace('1 s.d. 29 Okt 2026', 'Jan s.d. 29 Okt 2026'))}},
    'panel': {'judul': 'Dampak Oktober', 'ikon': 'jiwa',
              'angka_besar': {'mode': 'kartu', 'kolom': 2, 'kartu': [
                  {'label': 'Warga terdampak cuaca ekstrem', 'nilai': A('cuaca.tdm'), 'satuan': 'jiwa', 'ikon': 'cuaca-ekstrem'},
                  {'label': 'Rumah rusak berat karena cuaca ekstrem', 'nilai': A('cuaca.rr_berat'), 'satuan': 'unit', 'ikon': 'rumah'},
                  {'label': 'Kepala keluarga terdampak cuaca ekstrem', 'nilai': A('cuaca.kk'), 'satuan': 'KK', 'ikon': 'jiwa'},
                  {'label': 'Provinsi yang melaporkan kekeringan', 'nilai': A('kekeringan.prov'), 'satuan': 'provinsi', 'ikon': 'kekeringan'}]}},
    'sumber': DIBI}))
if 'cuaca' in AKSI:
    S.append(alur_aksi('cuaca', 'Cuaca ekstrem dan kekeringan: action plan penanganan Oktober', 'Action plan cuaca dan kekeringan', AKSI['cuaca']['sumber']))

# ---- Geologi dan vulkanologi ----
S.append(isi({
    'jenis': 'temuan-peta', 'jenis_slide': 'peta', 'judul_bentuk': 'temuan', 'bagian': 2, 'seri': 'geologi',
    'pesan': 'Sebaran gempa bumi, erupsi, dan gunung api Siaga',
    'judul': f'Geologi dan vulkanologi: {A("gempa.ev")} gempa bumi dan {A("erupsi.ev")} erupsi Anak Krakatau terjadi, dan {A("ga.siaga")} gunung api berstatus Siaga',
    'rasio': 0.64,
    'peta': {'png': 'petanya/geologi.png', 'keyakinan': 'resmi', 'sumber': DIBI + '; PVMBG 1 Nov 2026', 'unsur_tampil': False,
             'legenda': {'kartu': True, 'judul': 'Jenis kejadian', 'item': [
                 {'warna': 'kategori.geologi', 'label': 'Gempa bumi', 'nilai': A('gempa.ev'), 'ikon': 'gempa', 'tint': 'tint.netral.pita'},
                 {'warna': 'merah', 'label': 'Erupsi', 'nilai': A('erupsi.ev'), 'ikon': 'gunungapi', 'tint': 'tint.bahaya.pita'},
                 {'warna': 'oranye', 'label': 'Gunung api Siaga', 'nilai': A('ga.siaga'), 'ikon': 'peringatan', 'tint': 'tint.api.pita'}]}},
    'panel': {'judul': 'Kejadian Oktober', 'ikon': 'gempa', 'daftar': [
        f'Gempa awal Oktober di Sumba Barat Daya merusak {A("g.sbd.rumah")} rumah di sebelas kecamatan.',
        f'Gempa pertengahan Oktober merusak {A("g.bogor.rumah")} rumah di Leuwiliang dan Pamijahan, Kabupaten Bogor.',
        'Gempa di Laut Tanimbar pada akhir Oktober tidak berpotensi tsunami.',
        'Anak Krakatau erupsi dua kali pada Oktober dan tetap berstatus Siaga.',
        'Merapi dan Semeru berstatus Siaga dengan guguran lava dan awan panas.',
        'Anak Krakatau berada di perairan antara Lampung Selatan dan Pandeglang.']},
    'sumber': DIBI + '; PVMBG Badan Geologi, 1 Nov 2026'}))
S.append(isi({
    'jenis': 'temuan-visual', 'jenis_slide': 'grafik', 'judul_bentuk': 'temuan', 'bagian': 2, 'seri': 'geologi',
    'pesan': 'Riwayat gempa dan erupsi serta status gunung api',
    'judul': f'Gempa bumi merusak {A("gempa.rumah")} rumah warga, sedangkan tidak ada gunung api berstatus Awas',
    'rasio': 0.55,
    'utama': {'judul': 'Kejadian gempa bumi dan erupsi per bulan', 'ikon': 'kalender',
              'catatan': ['Satu gempa atau erupsi yang dilaporkan beberapa kabupaten tercatat lebih dari sekali.'],
              'garis': {'data': data('riwayat_geo.csv', [kol('bulan'), kol('gempa', 'Gempa bumi', '0'), kol('erupsi', 'Erupsi', '0')],
                                     DIBI.replace('1 s.d. 29 Okt 2026', 'Jan s.d. 29 Okt 2026'))}},
    'panel': {'judul': 'Status gunung api, PVMBG 1 November', 'ikon': 'gunungapi',
              'angka_besar': {'mode': 'kartu', 'kolom': 2, 'kartu': [
                  {'label': 'Level IV Awas', 'nilai': A('ga.awas'), 'satuan': 'gunung api', 'ikon': 'peringatan'},
                  {'label': 'Level III Siaga', 'nilai': A('ga.siaga'), 'satuan': 'gunung api', 'ikon': 'gunungapi'},
                  {'label': 'Level II Waspada', 'nilai': A('ga.waspada'), 'satuan': 'gunung api', 'ikon': 'gunungapi'},
                  {'label': 'Level I Normal', 'nilai': A('ga.normal'), 'satuan': 'gunung api', 'ikon': 'gunungapi'}]}},
    'sumber': DIBI + '; PVMBG Badan Geologi, 1 Nov 2026 06.00 WIB'}))
if 'geologi' in AKSI:
    S.append(alur_aksi('geologi', 'Geologi dan vulkanologi: action plan penanganan Oktober', 'Action plan geologi', AKSI['geologi']['sumber']))

# ================= BAGIAN 3: PROGRAM KERJA =================
S.append({'jenis': 'pembatas-seksi', 'bagian': 3})
RS = 'Siaran pers BNPB dan media nasional, 1 s.d. 31 Okt 2026, diolah'
S.append(isi({
    'jenis': 'temuan-visual', 'jenis_slide': 'grafik', 'judul_bentuk': 'temuan', 'bagian': 3,
    'pesan': 'Rekap kegiatan per jenis dan pelaksana',
    'judul': f'BNPB menjalankan {A("pk.n")} kegiatan utama pada Oktober, dan {A("pk.kepala")} di antaranya melibatkan Kepala BNPB secara langsung',
    'rasio': 0.6,
    'utama': {'judul': 'Jenis kegiatan menurut pelaksana', 'ikon': 'lembaga',
              'catatan': ['Satgas operasi adalah satuan tugas pemadaman dan OMC BNPB; sumber berita tidak menyebut kedeputian pelaksananya.'],
              'heatmap': {'ramp': 'netral', 'satuan': 'kegiatan', 'skala_huruf': 1.25,
                          'data': data('pk_matriks.csv', [kol('jenis', 'Jenis kegiatan'), kol('kepala', 'Kepala BNPB', '0'), kol('pusdatin', 'Pusdatinkom', '0'),
                                                          kol('ops', 'Satgas operasi', '0'), kol('jumlah', 'Jumlah', '0')], RS, 'terverifikasi')}},
    'panel': {'judul': 'Skala kerja Oktober', 'ikon': 'ringkasan',
              'angka_besar': {'mode': 'kartu', 'kolom': 1, 'kartu': [
                  {'label': 'Laporan situasi harian diterbitkan', 'nilai': A('rs.siaran'), 'satuan': 'laporan', 'ikon': 'data'},
                  {'label': 'Kegiatan operasi pemadaman dan OMC', 'nilai': A('pk.operasi'), 'satuan': 'kegiatan', 'ikon': 'karhutla'},
                  {'label': 'Kegiatan informasi publik oleh Pusdatinkom', 'nilai': A('pk.pusdatin'), 'satuan': 'kegiatan', 'ikon': 'telepon'}]}},
    'sumber': RS}))
S.append(isi({
    'jenis': 'tabel-peringkat', 'jenis_slide': 'tabel', 'judul_bentuk': 'deskriptif', 'bagian': 3, 'seri': 'program',
    'pesan': 'Kegiatan Kepala BNPB', 'judul': 'Kepala BNPB dilantik pada pertengahan Oktober dan langsung meninjau empat provinsi yang dilanda karhutla',
    'rasio': 0.62,
    'tabel': {'judul_panel': 'Kegiatan Kepala BNPB', 'ikon': 'lembaga', 'peringkat': True,
              'data': data('pk_kepala.csv', [kol('tanggal', 'Tanggal'), kol('kegiatan', 'Kegiatan', bobot=2.6), kol('lokasi', 'Lokasi')], RS, 'terverifikasi')},
    'panel': {'judul': 'Dokumentasi', 'ikon': 'wilayah', 'kolom_foto': 1, 'foto': [
        {'berkas': 'foto/web/pk-lantik.jpg', 'keterangan': 'Pelantikan Kepala BNPB oleh Presiden'},
        {'berkas': 'foto/web/pk-batu.jpg', 'keterangan': 'Rapat koordinasi karhutla Jawa Timur di Batu'}]},
    'sumber': RS}))
S.append(isi({
    'jenis': 'tabel-peringkat', 'jenis_slide': 'tabel', 'judul_bentuk': 'deskriptif', 'bagian': 3, 'seri': 'program',
    'pesan': 'Kegiatan operasi, informasi publik, dan bantuan',
    'judul': 'Satuan tugas operasi menjalankan operasi udara, sedangkan Pusdatinkom menyampaikan informasi publik',
    'rasio': 1.0,
    'tabel': {'judul_panel': 'Kegiatan per jenis', 'ikon': 'data', 'peringkat': False, 'pita_kelompok': True, 'pita_hitung': False, 'pita_tinggi_pt': 15,
              'data': data('pk_lain.csv', [kol('jenis', 'Jenis'), kol('tanggal', 'Tanggal'), kol('kegiatan', 'Kegiatan', bobot=3), kol('lokasi', 'Lokasi')], RS, 'terverifikasi')},
    'sumber': RS}))
S.append(isi({'jenis': 'galeri', 'jenis_slide': 'panel', 'judul_bentuk': 'deskriptif', 'bagian': 3, 'seri': 'program',
              'pesan': 'Dokumentasi program kerja', 'judul': 'Dokumentasi program kerja BNPB, Oktober 2026', 'kolom_panel': 2,
              'sumber': 'bnpb.go.id, infopublik.id, dan media nasional, Oktober 2026', 'panel': [
    {'judul': 'Koordinasi dan peninjauan', 'ikon': 'lembaga', 'kolom_foto': 2, 'bobot': 1, 'foto': [
        {'berkas': 'foto/web/pk-palembang.jpg', 'keterangan': 'Rapat koordinasi karhutla Sumatera Selatan'},
        {'berkas': 'foto/web/pk-sikka.jpg', 'keterangan': 'Peninjauan hunian pascabencana NTT'},
        {'berkas': 'foto/web/pk-papbar.jpg', 'keterangan': 'Garam untuk OMC Papua Barat'},
        {'berkas': 'foto/web/pk-waykambas.jpg', 'keterangan': 'Pemadaman Taman Nasional Way Kambas'}]},
    {'judul': 'Operasi darat dan udara', 'ikon': 'karhutla', 'kolom_foto': 2, 'bobot': 1, 'foto': [
        {'berkas': 'foto/web/h-1005.jpg', 'keterangan': 'Pemadaman lahan, laporan 5 Oktober'},
        {'berkas': 'foto/web/h-1715.jpg', 'keterangan': 'Lahan terbakar di lereng, laporan 15 Oktober'},
        {'berkas': 'foto/web/pk-personel.jpg', 'keterangan': 'Personel memadamkan api gambut'},
        {'berkas': 'foto/web/h-1001.jpg', 'keterangan': 'Api di lereng pada malam hari, laporan 1 Oktober'}]}]}))

# ================= BAGIAN 4: PENUTUP =================
S.append({'jenis': 'pembatas-seksi', 'bagian': 4})
S.append(isi({
    'jenis': 'temuan-visual', 'jenis_slide': 'grafik', 'judul_bentuk': 'temuan', 'bagian': 4,
    'pesan': 'Prediksi November dan Desember',
    'judul': f'Prediksi: hujan diperkirakan di bawah normal, tetapi riwayat kejadian menunjukkan {A("pr.banjir.des")} kabupaten tetap berpeluang tinggi banjir pada Desember',
    'rasio': 0.5,
    'utama': {'judul': 'Hujan Oktober sampai Desember di bawah normal', 'ikon': 'kekeringan',
              'lollipop': {'sorot': 'Jawa', 'satuan': 'persen di bawah normal', 'data': data('iklim_ond_tampil.csv', [kol('wilayah'), kol('kurang', 'Hujan di bawah normal, persen', '1')],
                                        'GIS BNPB, prakiraan musiman dari CHIRPS, RONI NOAA, dan DMI, 9 Nov 2026', 'estimasi-model')}},
    'panel': {'judul': 'Kabupaten berpeluang tinggi menurut riwayat', 'ikon': 'peringatan',
              'angka_besar': {'mode': 'kartu', 'kolom': 2, 'kartu': [
                  {'label': 'Banjir, November', 'nilai': A('pr.banjir.nov'), 'satuan': 'kab/kota', 'ikon': 'banjir'},
                  {'label': 'Banjir, Desember', 'nilai': A('pr.banjir.des'), 'satuan': 'kab/kota', 'ikon': 'banjir'},
                  {'label': 'Longsor, November', 'nilai': A('pr.longsor.nov'), 'satuan': 'kab/kota', 'ikon': 'longsor'},
                  {'label': 'Longsor, Desember', 'nilai': A('pr.longsor.des'), 'satuan': 'kab/kota', 'ikon': 'longsor'}]}},
    'sumber': 'Prakiraan hujan dari model statistik GIS BNPB; kalender ancaman dari laporan Pusdalops 2014 s.d. 2025'}))
if 'dukungan' in AKSI:
    S.append(isi({'jenis': 'rekomendasi', 'jenis_slide': 'rekomendasi', 'judul_bentuk': 'deskriptif', 'bagian': 4, 'pesan': 'Dukungan yang dimohon',
                  'judul': 'Dukungan yang dimohon kepada Bapak Presiden', 'rekomendasi': AKSI['dukungan']['butir'], 'sumber': AKSI['dukungan']['sumber']}))
if 'kesimpulan' in AKSI:
    S.append(isi({'jenis': 'kesimpulan', 'jenis_slide': 'navigasi', 'judul_bentuk': 'deskriptif', 'bagian': 4, 'pesan': 'Temuan utama untuk musim berikutnya',
                  'judul': 'Temuan utama dan persiapan menghadapi musim hujan', 'kartu': AKSI['kesimpulan']['kartu'], 'arahan': AKSI['kesimpulan']['arahan'],
                  'sumber': 'Logbook dan laporan harian Pusdalops BNPB; GIS BNPB; PVMBG; NOAA'}))
S.append({'jenis': 'penutup', 'foto': 'foto/surat-9.jpg', 'logo_kanan': 'foto/berakhlak-hd.png', 'kredit': 'Foto: BNPB, tim gabungan di lahan gambut, Oktober 2026',
          'teks': 'Terima Kasih', 'laporan': 'Laporan Bencana Oktober 2026 kepada Presiden Republik Indonesia'})

spek = {
    '_catatan': 'Laporan Bencana Oktober 2026 untuk Presiden, dibuat ulang dari surat Kepala BNPB 2 Nov 2026 dengan data sistem per 11 Nov 2026 (pemilik 11 Nov 2026).',
    'pesan_kunci': 'Bencana Oktober 2026 lebih sedikit dari September 2026, tetapi karhutla masih mendominasi dan musim hujan sudah membawa banjir ke Sumatera bagian utara.',
    'judul_dokumen': 'Laporan Bencana Oktober 2026', 'subjek_dokumen': 'Laporan Kepala BNPB kepada Presiden Republik Indonesia',
    'kajian': 'bulanan', 'format': 'kajian', 'tanggal': '2026-11-11', 'cut_off': '11 Nov 2026, 11.05 WIB',
    'bagian': [{'judul': 'Gambaran Umum Bencana Oktober 2026', 'label': 'Gambaran umum'},
               {'judul': 'Rincian per Jenis Bencana', 'label': 'Per jenis bencana'},
               {'judul': 'Program Kerja BNPB Oktober 2026', 'label': 'Program kerja'},
               {'judul': 'Penutup', 'label': 'Penutup'}],
    'slide': S}
os.makedirs(P + 'spek', exist_ok=True)
json.dump(spek, open(P + 'spek/laporan-oktober.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print(len(S), 'slide')
