"""Aturan pemilik yang berlaku untuk SEMUA PPTX BNPB, termasuk deck hasil sunting langsung yang tidak lewat deck.py:
python aturan_slide.py <deck.pptx> [--tanggal YYYY-MM-DD] [--tanpa-kris "alasan pemilik"]

1. Logo KRIS di tiap slide (pemilik 6 dan 8 Nov 2026: "tiap slide pastikan ada logo kris dan bnpb"; 9 Nov: "dimana pun").
2. Baris Sumber berisi sumber dan tanggal saja, tanpa catatan keraguan (pemilik 9 Nov 2026: "ga suka banget lu ngasih note kaya gini").
3. Laporan Dit. Koordalops di baris Sumber wajib sampai tanggal deck (pemilik 9 Nov 2026: "harusnya hari ini
   tanggal 8 kenapa updatenya sampai tanggal 7 doang"). Tanggal diambil dari --tanggal atau DDMMYY di nama berkas.
"""
import io, re, sys
from datetime import date
from pathlib import Path

from PIL import Image

LOGO = Path(__file__).resolve().parent.parent / 'assets/logo-bersama/kris-logo.png'
KAKI = re.compile(r'^\s*(Sumber|Catatan|Keterangan)\s*:|^\s*\*', re.I)
RAGU = re.compile(r'perkiraan|estimasi|sementara|indikatif|belum (di)?(konfirmasi|verifikasi)|belum terkonfirmasi|yang memuatnya|usulan langkah|kartu\s*=', re.I)
BULAN = {b: i for i, b in enumerate('jan feb mar apr mei jun jul agu sep okt nov des'.split(), 1)}
TGL = re.compile(r'(\d{1,2}) (jan|feb|mar|apr|mei|jun|jul|agu|sep|okt|nov|des)[a-z]* (\d{4})', re.I)


def teks_kaki(sh):
    if sh.shape_type == 6:
        for x in sh.shapes:
            yield from teks_kaki(x)
    elif sh.has_text_frame:
        t = ' '.join(sh.text_frame.text.split())
        if KAKI.search(t):
            yield t


def tanggal_akhir(bagian):
    """Tanggal terakhir yang disebut satu sumber; 'tgl s.d. tgl Nov 2026' terbaca dari tanggal penutupnya."""
    ada = [date(int(y), BULAN[b.lower()[:3]], int(d)) for d, b, y in TGL.findall(bagian)]
    return max(ada) if ada else None


def jejak(blob):
    """Isi gambar tanpa ruang bening di tepinya, skala abu 64x16, beserta rasio sisinya: logo KRIS yang diberi bantalan tetap dikenali."""
    im = Image.open(io.BytesIO(blob)).convert('RGBA')
    alas = Image.new('RGBA', im.size, 'white')
    alas.alpha_composite(im)
    abu = alas.convert('L')
    kotak = abu.point(lambda v: 255 if v < 245 else 0).getbbox() or (0, 0, *im.size)
    isi = abu.crop(kotak)
    return isi.size[0] / isi.size[1], list(isi.resize((64, 16)).tobytes())


def mirip_kris(blob, acuan):
    try:
        r, px = jejak(blob)
    except Exception:
        return False
    return abs(r - acuan[0]) / acuan[0] < 0.1 and sum(abs(a - b) for a, b in zip(px, acuan[1])) / len(px) < 25


def cek(pptx, tanggal=None, tanpa_kris=None):
    from pptx import Presentation
    logo, galat = LOGO.read_bytes(), []
    acuan = jejak(logo)
    for n, sl in enumerate(Presentation(str(pptx)).slides, 1):
        ada = any(r.reltype.endswith('/image') and (r.target_part.blob == logo or mirip_kris(r.target_part.blob, acuan)) for r in sl.part.rels.values())
        if not ada and not tanpa_kris:
            galat.append(f'slide {n}: logo KRIS tidak ada')
        for sh in sl.shapes:
            for t in teks_kaki(sh):
                if m := RAGU.search(t):
                    galat.append(f'slide {n}: catatan "{m[0]}" di baris kaki dilarang: {t[:110]}')
                if tanggal and t.lower().startswith('sumber'):
                    for bag in t.split(';'):
                        if re.search(r'Koordalops', bag) and (a := tanggal_akhir(bag)) and a < tanggal:
                            galat.append(f'slide {n}: sumber berhenti {a:%d-%m-%Y}, deck bertanggal {tanggal:%d-%m-%Y}: {bag.strip()[:90]}')
    return galat


def tanggal_nama(p):
    m = re.search(r'(?<!\d)(\d{2})(\d{2})(\d{2})(?!\d)', Path(p).name)
    try:
        return date(2000 + int(m[3]), int(m[2]), int(m[1])) if m else None
    except ValueError:
        return None


if __name__ == '__main__':
    a = sys.argv[1:]
    def opsi(n):
        return a[a.index(n) + 1] if n in a else None
    tg = date.fromisoformat(opsi('--tanggal')) if opsi('--tanggal') else tanggal_nama(a[0])
    g = cek(a[0], tg, opsi('--tanpa-kris'))
    print('\n'.join(g) or 'aturan slide lolos')
    sys.exit(1 if g else 0)
