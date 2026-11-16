"""Pemeriksa gaya bahasa kajian BNPB (lihat GAYA-BAHASA-KAJIAN.md).

  py periksa_bahasa.py naskah.md [naskah2.md ...]   # daftar temuan per baris, keluar 1 bila ada temuan K (kaidah)
  py periksa_bahasa.py --banding lama.md baru.md    # angka yang hilang atau bertambah setelah disunting

Frasa lazim surat dan laporan dinas (dalam rangka, guna, hal ini, selain itu, oleh karena itu, adapun) TIDAK
ditandai: pemilik 13 Nov 2026 menyatakan itu bahasa Indonesia yang lazim.
Label: K kaidah (wajib diperbaiki), G gaya, AI klise. Hasilnya petunjuk, bukan putusan.
Ditulis sendiri; aturan diadaptasi dari skill naskah-id, indonesia-eyd-writing-skill, dan humanizer-bahasa-indonesia (MIT).
"""
import re
import sys
from collections import Counter
from pathlib import Path

ATURAN = [
    # (kode, label, pola, saran)
    ('SUBJEK', 'K', r'^(Dari|Dalam|Pada|Bagi|Berdasarkan) [^,.]{3,60}? (menunjukkan|membahas|memperlihatkan|menyimpulkan|menjelaskan|mengatakan)\b',
     'subjek hilang karena kata depan; buang kata depannya atau pasifkan verbanya'),
    ('MENURUT', 'K', r'\bMenurut [^,.]{2,40}? (mengatakan|menyatakan)\b', 'Menurut X, ... (tanpa "mengatakan")'),
    ('KARENA-MAKA', 'K', r'\b(Karena|Oleh karena|Berdasarkan|Jika|Apabila)\b[^.]{3,120}?,\s*maka\b', '"maka" mubazir setelah anak kalimat'),
    ('MESKI-TETAPI', 'K', r'\b(Meskipun|Walaupun|Meski)\b[^.]{3,120}?,\s*(tetapi|namun)\b', 'Meskipun ..., (tanpa "tetapi")'),
    ('ANTARA-DENGAN', 'K', r'\bantara \w+(?: \w+){0,3} dengan\b', 'antara A dan B'),
    ('DARI-DARIPADA', 'K', r'\b(lebih|kurang) \w+ dari\b(?! \d)', 'perbandingan memakai "daripada"'),
    ('AWAL-SEHINGGA', 'K', r'(?:^|[.!?]\s+)(Sehingga|Sedangkan)\b', 'jangan membuka kalimat dengan "Sehingga"/"Sedangkan"'),
    ('PLEONASME', 'K', r'\b(adalah merupakan|agar supaya|demi untuk|sejak dari|berbagai macam|naik ke atas|turun ke bawah|para \w+-\w+)\b', 'pilih salah satu kata'),
    ('BERDASARKAN-PADA', 'K', r'\bberdasarkan pada\b', 'berdasarkan'),
    ('DI-MANA', 'G', r'(?<![?])\b\w+ di mana\b(?![^.]*\?)', '"di mana" sebagai penghubung; pakai yang, tempat, saat'),
    ('YANG-MANA', 'G', r'\byang mana\b', 'pakai "yang" atau pecah kalimat'),
    ('KALKE', 'AI', r'\b(memainkan peran|mengambil tempat|adalah penting untuk|membuat keputusan)\b', 'verba langsung: berperan, berlangsung, memutuskan'),
    ('NOMINAL', 'G', r'\b(melakukan (analisis|pengukuran|perbandingan|penghitungan|pengujian|pencatatan|evaluasi|verifikasi)|mengalami (peningkatan|penurunan|kenaikan)|memberikan (pengaruh|kontribusi))\b',
     'pakai verbanya langsung (menganalisis, naik, memengaruhi)'),
    ('PEMBUKA', 'AI', r'\b(Di era|Seiring (dengan )?perkembangan|Tidak dapat dipungkiri|Perlu diketahui bahwa|Perlu diingat bahwa|Penting untuk (dicatat|dipahami)|Seperti yang kita ketahui)\b', 'pembuka kosong; langsung ke isi'),
    ('GELEMBUNG', 'AI', r'\b(sangat (krusial|signifikan|vital)|inovatif|komprehensif|holistik|transformatif|revolusioner|tak terbantahkan)\b', 'klaim tanpa angka; ganti dengan bukti atau buang'),
    ('PENUTUP', 'AI', r'\b(Secara keseluruhan|Dengan demikian dapat disimpulkan)\b', 'penutup yang mengulang; buang bila paragraf sudah memuat temuannya'),
    ('TANDA', 'K', r'[—·!]', 'em dash, titik tengah, atau tanda seru'),
    ('ISTILAH-BUATAN', 'K', r'\b(KJN|RBS|CK|L[123]|M[1-6]|K[1-6]|opsi [abc]\b|v2(\.1)?|v1)\b', 'kode atau singkatan buatan; tulis maksudnya'),
    ('KAKU', 'G', r'\b(delineasi|agregasi|operasionalisasi|kalibrasi|proksi|peladen|disagregasi)\b', 'padanan kaku; pakai istilah yang lazim'),
]
HAL_INI_MAKS = 3      # "hal ini" lebih dari ini per berkas ditandai
KATA_MAKS = 35


def baris_teks(t):
    """Lewati tabel, judul, kode, gambar, penanda kotak, dan baris Sumber."""
    pagar = False
    for i, b in enumerate(t.splitlines(), 1):
        s = b.strip()
        if s.startswith('```'):
            pagar = not pagar
            continue
        if pagar or not s or s.startswith(('|', '#', '![', ':::', 'Sumber:', 'Tabel ', 'Status:')):
            continue
        yield i, s


def periksa(p):
    t = Path(p).read_text(encoding='utf-8')
    temuan = []
    hal_ini = 0
    for i, s in baris_teks(t):
        bersih = re.sub(r'`[^`]*`|\[[^\]]*\]\([^)]*\)|\*\*?', '', s)
        for kode, lbl, pola, saran in ATURAN:
            for m in re.finditer(pola, bersih, flags=re.M):
                if kode == 'ISTILAH-BUATAN' and 'Kode lama' in t[:200]:
                    continue
                temuan.append((i, lbl, kode, m.group(0)[:50], saran))
        hal_ini += len(re.findall(r'\b[Hh]al (ini|tersebut)\b', bersih))
        for k in re.split(r'(?<=[.?])\s+(?=[A-Z])', bersih):
            n = len(k.split())
            if n > KATA_MAKS:
                temuan.append((i, 'G', 'PANJANG', f'{n} kata', f'kalimat lebih dari {KATA_MAKS} kata; pecah'))
            if len(re.findall(r'\byang\b', k)) >= 4:
                temuan.append((i, 'G', 'RANTAI-YANG', k[:50], 'empat "yang" atau lebih dalam satu kalimat'))
    pembuka = Counter(t for _, _, k, t, _ in temuan if k == 'PENGHUBUNG')
    return temuan, pembuka


ANGKA = re.compile(r'\d+(?:[.,]\d+)*')


def banding(lama, baru):
    a = Counter(ANGKA.findall(Path(lama).read_text(encoding='utf-8')))
    b = Counter(ANGKA.findall(Path(baru).read_text(encoding='utf-8')))
    hilang = sorted((a - b).elements())
    tambah = sorted((b - a).elements())
    print(f'angka hilang ({len(hilang)}):', ', '.join(hilang[:80]))
    print(f'angka baru ({len(tambah)}):', ', '.join(tambah[:80]))
    print('Tiap angka baru harus berasal dari sumber yang diperiksa; tiap angka hilang harus sengaja.')


def main(arg):
    if not arg:
        print(__doc__)
        return 2
    if arg[0] == '--banding':
        banding(arg[1], arg[2])
        return 0
    ada_k = False
    for p in arg:
        temuan, _ = periksa(p)
        n = Counter(l for _, l, *_ in temuan)
        print(f'== {p}: K {n["K"]}, G {n["G"]}, AI {n["AI"]}')
        for i, lbl, kode, teks, saran in temuan:
            print(f'  {i:>5} {lbl:<2} {kode:<15} "{teks}"  -> {saran}')
        ada_k |= n['K'] > 0
    return 1 if ada_k else 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
