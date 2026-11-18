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
TAHAP = {'1': 'Laporan awal', '2': 'Kaji cepat', '4': 'Penutupan'}


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
              'Setiap isian angka memiliki salah satu dari tiga keadaan, yaitu ada nilai, nihil, atau belum didata.', '',
              '## A. ISIAN DATA UMUM', '']
    for i, (judul, isi) in enumerate(bagian(teks)):
        isi = bersihkan(isi, 'I')
        # kolom Tahap: angka diganti nama tahap
        isi = re.sub(r'\| (\d) \|\s*$', lambda m: f'| {TAHAP.get(m.group(1), m.group(1))} |', isi, flags=re.M)
        isi = isi.replace('| ---: |\n', '| --- |\n')
        isi = re.sub(r'(\| No \| Isian \| Isi dan format \| Tahap \|\n\| ---: \| --- \| --- \|) ---: \|', r'\1 --- |', isi)
        keluar += [f'{i + 1}. {judul}', '', isi]
    keluar += [
        '## B. PETUNJUK PENGISIAN ANGKA', '',
        'Aturan dalam Tabel I.5 berlaku sama untuk data dinamis dan data statis.', '',
        'Tabel I.5. Angka yang dipakai untuk setiap data', '',
        '| Data | Angka yang dipakai |',
        '| --- | --- |',
        '| Korban meninggal | Angka terakhir |',
        '| Korban hilang | Angka terakhir |',
        '| Korban luka berat dan luka ringan | Angka terbanyak selama kejadian |',
        '| Terdampak | Angka terbanyak selama kejadian |',
        '| Pengungsi | Angka terbanyak selama kejadian |',
        '| Kerusakan rumah, fasilitas, prasarana, dan lahan | Angka terakhir |',
        '| Nilai kerusakan dan nilai kerugian | Hasil pengkajian kebutuhan pascabencana; tidak diisi selama kejadian berlangsung |', '',
        '## C. TINGKAT KERUSAKAN DAN KEADAAN TERENDAM BANGUNAN', '',
        '1. Rusak berat adalah kerusakan yang mengakibatkan bangunan roboh atau sebagian besar komponen strukturnya rusak, misalnya bangunan roboh total, sebagian besar struktur utama rusak, atau sebagian besar dinding dan lantai rusak. Pada bangunan pengairan, contohnya bendung atau dam patah, sebagian besar tanggul jebol atau putus, atau saluran tidak dapat berfungsi.',
        '2. Rusak sedang adalah kerusakan yang mengakibatkan sebagian kecil komponen struktur rusak dan komponen penunjang rusak, tetapi bangunan masih berdiri, misalnya sebagian kecil struktur utama rusak atau sebagian besar pintu air dan komponen penunjang lainnya rusak.',
        '3. Rusak ringan adalah kerusakan yang mengakibatkan sebagian komponen struktur retak, tetapi struktur masih dapat digunakan dan bangunan masih berdiri, misalnya retak-retak pada dinding plesteran atau sebagian kecil pintu air rusak.',
        '4. Terendam adalah keadaan bangunan yang tergenang air tanpa kerusakan pada komponen struktur.', '', '::: ttd', '']
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
