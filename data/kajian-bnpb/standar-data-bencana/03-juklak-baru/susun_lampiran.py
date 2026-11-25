"""Susun Lampiran I dan Lampiran III rancangan Juklak dari kamus data dan lembar khusus Kajian Penentuan Kejadian Bencana.

  py data/kajian-bnpb/standar-data-bencana/03-juklak-baru/susun_lampiran.py

Sumber: ../01-kajian-penentuan-kejadian/lampiran/lampiran-b.md (kamus data umum) dan lampiran-c.md (lembar khusus).
Keluaran: naskah/02-lampiran-1.md dan naskah/04-lampiran-3.md. Jangan menyunting kedua keluaran itu dengan tangan;
ubah sumbernya atau aturan di skrip ini, lalu jalankan ulang.
"""
import re
from pathlib import Path

DI = Path(__file__).resolve().parent
SUMBER = DI.parent / '01-kajian-penentuan-kejadian' / 'lampiran'
HURUF = 'ABCDEFGHIJ'
TAHAP = {'1': 'Laporan awal', '2': '*Rapid assessment*', '4': 'Penutupan'}


def bagian(teks):
    """Pecah naskah lampiran per subjudul '## X.n Judul'; kembalikan [(judul, isi)]."""
    hasil = []
    for blok in re.split(r'^## ', teks, flags=re.M)[1:]:
        judul, _, isi = blok.partition('\n')
        hasil.append((re.sub(r'^[A-Z]\.\d+\s+', '', judul).strip(), isi))
    return hasil


def bersihkan(isi, awalan):
    isi = re.sub(r'^Sumber:.*$\n?', '', isi, flags=re.M)
    isi = re.sub(r'^Tabel [A-Z]\.(\d+)\.', lambda m: f'Tabel {awalan}.{m.group(1)}.', isi, flags=re.M)
    return isi.strip() + '\n'


def lampiran_1():
    teks = (SUMBER / 'lampiran-b.md').read_text(encoding='utf-8')
    keluar = ['::: lampiran I', '', '# FORMAT DATA KEJADIAN DAN DAMPAK BENCANA', '',
              'Lampiran ini memuat isian data umum yang berlaku untuk semua jenis bencana, petunjuk pengisian angka, '
              'dan uraian tingkat kerusakan. Kolom "Tahap" menunjukkan tahap paling lambat isian tersebut diisi. '
              'Setiap isian angka memiliki salah satu dari tiga keadaan, yaitu ada nilai, nihil, atau belum didata. '
              'Angka dampak yang sudah diketahui sebelum batas tahapnya diisi sejak laporan awal sebagai angka sementara.', '',
              '## A. ISIAN DATA UMUM', '']
    for i, (judul, isi) in enumerate(bagian(teks)):
        isi = bersihkan(isi, 'I')
        # kolom Tahap: angka diganti nama tahap
        isi = re.sub(r'\| (\d) \|\s*$', lambda m: f'| {TAHAP.get(m.group(1), m.group(1))} |', isi, flags=re.M)
        isi = isi.replace('| ---: |\n', '| --- |\n')
        isi = re.sub(r'(\| No \| Isian \| Isi dan format \| Tahap \|\n\| ---: \| --- \| --- \|) ---: \|', r'\1 --- |', isi)
        keluar += [isi]
    keluar += [
        '## B. PETUNJUK PENGISIAN ANGKA', '',
        'Aturan dalam Tabel I.5 berlaku sama untuk data dinamis dan data statis.', '',
        'Tabel I.5. Angka yang dipakai untuk setiap data', '',
        '| Data | Angka yang dipakai |',
        '| --- | --- |',
        '| Korban meninggal | Angka terakhir |',
        '| Korban hilang | Angka terakhir |',
        '| Korban luka berat dan luka ringan | Angka terbanyak selama kejadian dari laporan terverifikasi |',
        '| Terdampak | Angka terbanyak selama kejadian dari laporan terverifikasi |',
        '| Pengungsi | Angka terbanyak selama kejadian dari laporan terverifikasi |',
        '| Kerusakan rumah, fasilitas, prasarana, dan lahan | Angka terakhir |',
        '| Nilai kerusakan dan nilai kerugian | Hasil pengkajian kebutuhan pascabencana; tidak diisi selama kejadian berlangsung |', '',
        'Angka terbanyak dapat diturunkan melalui koreksi apabila angka sebelumnya ternyata keliru, dan alasan koreksi dicatat dalam riwayat perubahan.', '',
        '## C. TINGKAT KERUSAKAN DAN KEADAAN TERENDAM BANGUNAN', '',
        '1. Rusak berat adalah kerusakan yang mengakibatkan bangunan roboh atau sebagian besar komponen strukturnya rusak, misalnya bangunan roboh total, sebagian besar struktur utama rusak, atau sebagian besar dinding dan lantai rusak. Untuk rumah, rusak berat adalah tingkat kerusakan fisik lebih dari 70 persen, atau rumah roboh, hanyut, terbakar habis, atau tertimbun material setinggi 1 meter atau lebih di atas lantai. Pada bangunan pengairan, contohnya bendung atau dam patah, sebagian besar tanggul jebol atau putus, atau saluran tidak dapat berfungsi.',
        '2. Rusak sedang adalah kerusakan yang mengakibatkan sebagian kecil komponen struktur rusak dan komponen penunjang rusak, tetapi bangunan masih berdiri, misalnya sebagian kecil struktur utama rusak atau sebagian besar pintu air dan komponen penunjang lainnya rusak. Untuk rumah, rusak sedang adalah tingkat kerusakan fisik 30 sampai 70 persen.',
        '3. Rusak ringan adalah kerusakan yang mengakibatkan sebagian komponen struktur retak, tetapi struktur masih dapat digunakan dan bangunan masih berdiri, misalnya retak-retak pada dinding plesteran atau sebagian kecil pintu air rusak. Untuk rumah, rusak ringan adalah tingkat kerusakan fisik kurang dari 30 persen.',
        '4. Tidak dapat dihuni sementara adalah keadaan rumah yang tidak rusak berat maupun rusak sedang, tetapi tergenang air paling sedikit 10 sentimeter di atas lantai atau tertutup lumpur dan material sehingga untuk sementara tidak dapat dihuni, termasuk rumah rusak ringan yang berada dalam keadaan tersebut.',
        '5. Terendam adalah keadaan bangunan yang tergenang air tanpa kerusakan pada komponen struktur dan masih dapat dihuni, termasuk genangan di bawah lantai, dan tidak termasuk rumah tidak dapat dihuni sementara.',
        '6. Setiap rumah hanya dicatat pada satu tingkat, yang diperiksa berurutan dari rusak berat, rusak sedang, tidak dapat dihuni sementara, rusak ringan, lalu terendam. Tingkat kerusakan fisik rumah dihitung dengan menjumlahkan persentase kerusakan setiap komponen bangunan yang dikalikan dengan bobot komponennya. Tabel I.6 memuat contoh bobot komponen yang dapat dipakai, yang bersumber dari Peraturan Gubernur Nusa Tenggara Barat Nomor 32 Tahun 2022 Lampiran IV.',
        '7. Tingkat kerusakan fasilitas publik dan jembatan memakai rusak berat, rusak sedang, dan rusak ringan sebagaimana dimaksud pada angka 1 sampai angka 3. Fasilitas yang hanya tergenang dicatat sebagai terendam dan tidak dihitung dalam kriteria kejadian bencana.', '',
        'Tabel I.6. Contoh bobot komponen bangunan rumah', '',
        '| Komponen | Bobot (persen) |',
        '| --- | ---: |',
        '| Fondasi | 7 |',
        '| Kolom, balok, dan ring balok | 25 |',
        '| Rangka atap | 10 |',
        '| Penutup atap | 2 |',
        '| Rangka langit-langit | 4 |',
        '| Penutup langit-langit | 4 |',
        '| Dinding bata atau partisi | 7 |',
        '| Plesteran | 2 |',
        '| Kaca | 1 |',
        '| Pintu | 1 |',
        '| Kusen | 2 |',
        '| Penutup lantai | 12 |',
        '| Instalasi listrik | 5 |',
        '| Instalasi air | 1,5 |',
        '| Drainase limbah | 1,5 |',
        '| Penyelesaian struktur | 1 |',
        '| Penyelesaian langit-langit | 4 |',
        '| Penyelesaian dinding | 6 |',
        '| Penyelesaian pintu dan kusen | 4 |',
        '| Jumlah | 100 |', '',
        '::: ttd', '']
    (DI / 'naskah' / '02-lampiran-1.md').write_text('\n'.join(keluar), encoding='utf-8')


def lampiran_3():
    teks = (SUMBER / 'lampiran-c.md').read_text(encoding='utf-8')
    keluar = ['::: lampiran III', '', '# LEMBAR DATA KHUSUS UNTUK SETIAP JENIS BENCANA ALAM', '',
              'Lembar data khusus diisi bersama data umum dalam Lampiran I. Kolom "Sumber isian" menunjukkan apakah '
              'isian ditarik dari lembaga resmi atau diukur oleh petugas di lapangan. Isian yang ditarik dari lembaga '
              'resmi tetap diperiksa oleh petugas.', '']
    for i, (judul, isi) in enumerate(bagian(teks)):
        keluar += [f'## {HURUF[i]}. {judul.upper()}', '', bersihkan(isi, 'III')]
    keluar += ['::: ttd', '']
    (DI / 'naskah' / '04-lampiran-3.md').write_text('\n'.join(keluar), encoding='utf-8')


if __name__ == '__main__':
    lampiran_1()
    lampiran_3()
    print('Lampiran I dan III disusun')
