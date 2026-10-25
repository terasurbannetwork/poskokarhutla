"""Pil PM2,5 dan cuaca slide tabel deck Penanganan, dari data sendiri, untuk hari lampau.

Kenapa tidak dari WA BMKG: pil aslinya diisi dari pesan WhatsApp BMKG hari itu (wa_operasi.bmkg). Pesan itu tidak diarsipkan,
jadi untuk deck hari lampau sumbernya tidak ada. Dua penggantinya memakai AMBANG RESMI, bukan ambang karangan:
  PM2,5 : rata-rata provinsi harian model CAMS (public/udara/data/riwayat.json, kolom rata_pm25), kategori P.14/2020
          lewat scripts/udara/alat.BATAS (55,4 / 150,4 / 250,4 ug/m3). Perkiraan model, bukan ISPU resmi KLHK, dan
          rata-rata provinsi, bukan stasiun tertinggi seperti pesan BMKG; katakan itu di catatan kaki deck.
  cuaca : hujan 24 jam dan angin jam 12 dari sel cuaca provinsi (cuaca_riwayat, Open-Meteo), dikelaskan dengan kelas
          intensitas hujan harian BMKG (ringan < 20, sedang 20-50, lebat 50-100, sangat lebat > 100 mm/hari) dan
          ambang peringatan angin kencang BMKG 25 knot (46 km/jam).

Keluarannya berbentuk sama dengan wa_operasi.bmkg supaya bnpb.ganti_tabel tidak perlu tahu sumbernya:
    {'pm': {kode: (nilai, kategori, None)}, 'pm_ke10': float, 'hujan': set, 'lebat': set, 'angin': set, 'periode': str}
API: bahan(hari, cuaca) -> dict seperti di atas   # cuaca = satu hari dari cuaca_riwayat.hitung
"""
import datetime as dt, json, os, sys

SINI = os.path.dirname(os.path.abspath(__file__))
AKAR = os.path.abspath(os.path.join(SINI, '..', '..', '..'))
sys.path.insert(0, os.path.join(AKAR, 'scripts', 'udara'))
from alat import BATAS   # noqa: E402  P.14/2020: batas atas Sedang, Tidak sehat, Sangat tidak sehat

RIWAYAT = os.path.join(AKAR, 'public/udara/data/riwayat.json')
HUJAN_BMKG = (20.0, 50.0, 100.0)   # mm/hari: batas atas ringan, sedang, lebat (BMKG)
ANGIN_KENCANG = 46.0               # km/jam, setara 25 knot (ambang peringatan BMKG)
BULAN = ('Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember')


def kategori(v):
    return 'baik' if v <= 15.5 else 'sedang' if v <= BATAS[0] else 'tidak sehat' if v <= BATAS[1] \
        else 'sangat tidak sehat' if v <= BATAS[2] else 'berbahaya'


def pm25(hari):
    """{kode_prov: rata-rata PM2,5 provinsi hari itu}; provinsi tanpa angka hari itu tidak ada kuncinya."""
    R = json.load(open(RIWAYAT))
    i = R['kolom'].index('rata_pm25') - 1   # nilai per hari = [jiwa_di_atas_baik, rata_pm25]
    return {k: v[hari][i] for k, v in R['prov'].items() if hari in v and v[hari][i] is not None}


def bahan(hari, cuaca):
    hari = str(hari)
    pm = pm25(hari)
    nilai = sorted(pm.values(), reverse=True)
    per = {}
    for s in cuaca.values():
        per.setdefault(s['prov'], []).append(s)
    hujan, lebat, angin = set(), set(), set()
    for k, sel in per.items():
        hj = [s['hujan'] for s in sel if s['hujan'] is not None]
        rata = sum(hj) / len(hj) if hj else 0.0
        ws = sum(s['ws'] for s in sel) / len(sel)
        if rata >= HUJAN_BMKG[1]:
            lebat.add(k)
        elif rata >= 1.0:
            hujan.add(k)
        if ws >= ANGIN_KENCANG:
            angin.add(k)
    d = dt.date.fromisoformat(hari)
    return {'pm': {k: (v, kategori(v), None) for k, v in pm.items()},
            'pm_ke10': nilai[9] if len(nilai) >= 10 else (nilai[-1] if nilai else 0.0),
            'hujan': hujan, 'lebat': lebat, 'angin': angin,
            'periode': f'{d.day} {BULAN[d.month - 1][:3]}'}


def uji():
    """Kategori harus persis di titik potong P.14/2020, dan hari yang ada di riwayat.json harus memberi >= 30 provinsi."""
    assert [kategori(v) for v in (0, 15.5, 15.6, 55.4, 55.5, 150.4, 150.5, 250.4, 250.5)] == \
        ['baik', 'baik', 'sedang', 'sedang', 'tidak sehat', 'tidak sehat', 'sangat tidak sehat', 'sangat tidak sehat', 'berbahaya'], \
        'titik potong P.14/2020 bergeser'
    R = json.load(open(RIWAYAT))
    h = sorted({t for v in R['prov'].values() for t in v})[-2]
    p = pm25(h)
    assert len(p) >= 30, f'{h} cuma {len(p)} provinsi di riwayat.json'
    print(f'uji lolos: {h} {len(p)} provinsi, PM2,5 tertinggi {max(p.values()):.1f} ({kategori(max(p.values()))})')


if __name__ == '__main__':
    uji()
