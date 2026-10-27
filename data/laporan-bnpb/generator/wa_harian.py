"""Urai teks WA laporan harian untuk deck Laporan Kejadian Bencana Harian.

koordalops(teks) -> {'mulai': 'YYYY-MM-DD HH.MM', 'sampai': ..., 'laporan': int, 'menonjol': int, 'kejadian': [...]}
    kejadian: {'jenis', 'prov', 'lokasi', 'status', 'perhatian', 'angka': {...}, 'teks': {'dampak', 'status_darurat', 'kondisi'}}
    jenis: karhutla | kekeringan | gempabumi | banjir | lainnya (kebakaran TPA); status: belum | berjalan | selesai (aturan di status_dari()).
    Pakai laporan 07.00 s.d. 07.00 (bukan laporan 19.00 yang hanya setengah hari).
bmkg(teks) -> {'jam': 'Sabtu, 24 Oktober 2026 pukul 06.00 WIB', 'pm': [(kota, nilai, kategori)], 'hujan': [prov], 'angin': [prov], 'periode': '23 – 25 Oktober 2026'}
Uji: python3 wa_harian.py --uji  (teks 24 Okt di contoh/ harus sama dengan isian ../harian-2026-10-24.json)"""
import json, os, re

DI = os.path.dirname(os.path.abspath(__file__))
AKAR = os.path.abspath(os.path.join(DI, '..', '..', '..'))
_PROV = {v['nama'].lower(): k for k, v in json.load(open(os.path.join(AKAR, 'public', 'data', 'laporan.json')))['prov'].items()}
KOREKSI = {'Supit Urung': 'Supit Urang'}   # salah ketik nama di WA yang berulang


def kode_prov(nama):
    n = re.sub(r'\s+', ' ', nama.replace('Prov.', '').strip()).lower()
    n = {'kep. bangka belitung': 'kepulauan bangka belitung', 'diy': 'di yogyakarta', 'daerah istimewa yogyakarta': 'di yogyakarta', 'd.i yogyakarta': 'di yogyakarta', 'd.i. yogyakarta': 'di yogyakarta', 'dki jakarta': 'dki jakarta'}.get(n, n)
    if n not in _PROV:
        raise ValueError(f'provinsi tidak dikenal: {nama!r}')
    return _PROV[n]


def angka(s):
    """'±11.202' / '20.709,78' / '29,8' -> float (format Indonesia)."""
    return float(s.replace('.', '').replace(',', '.'))


def status_dari(kondisi, prov_level):
    """BPBD: belum = api/kejadian belum tertangani; berjalan = penanganan berjalan; selesai = padam/surut.
    Urutan: kata 'masih/belum dapat/pendinginan' -> belum; ada sisa belum padam > 0 ha -> belum (kabupaten) atau berjalan (provinsi, sisa
    tersebar di banyak lokasi); 'berhasil dipadamkan/sudah padam/surut' -> selesai; selain itu berjalan."""
    k = kondisi.lower()
    if re.search(r'masih dilakukan|masih pemadaman|belum dapat|pendinginan|muncul kembali|masih terlihat|masih terpantau|masih berlangsung', k):
        return 'belum'
    m = re.search(r'sisa[^,.]*?(?:padam\s*)?(?:luas\s*)?±?\s*(\d[\d.,]*)\s*ha', k)
    if m and angka(m.group(1).rstrip('.,')) > 0:
        return 'berjalan' if prov_level else 'belum'
    if re.search(r'berhasil dipadamkan|berhasil di dipadamkan|sudah padam|telah padam|surut', k):
        return 'selesai'
    return 'berjalan'


def _jenis_lokasi(judul):
    j = judul.lower()
    jenis = ('angin' if 'angin kencang' in j else 'lainnya' if 'tpa' in j else 'karhutla' if 'hutan dan lahan' in j or 'karhutla' in j else 'kekeringan' if 'kekeringan' in j
             else 'gempabumi' if 'gempa' in j else 'banjir' if 'banjir' in j else 'lainnya')
    di = re.split(r'\s+di\s+', judul, maxsplit=1)[1] if ' di ' in judul else ''
    if jenis == 'lainnya' and 'TPA' in judul:
        lok = re.search(r'(TPA\s+[A-Z][\w ]*?)\s+di\s', judul).group(1)
    elif di.startswith(('Prov.', 'Provinsi')):
        g = re.search(r'\((?:Gn\.|Gunung)\s+([^)]+)\)', judul)   # WA 26 Okt: "(Gn. Argopuro) di Prov. Jawa Timur" = kawasan, bukan seluruh provinsi
        lok = f'Gunung {g.group(1).strip()}' if g else ''
    else:
        lok = re.sub(r'^(Kab\.|Kabupaten|Kota|Kawasan)\s+', '', di.strip())
        lok = re.sub(r'^Taman Nasional\s+([^,]+),.*$', r'TN \1', lok)   # "Taman Nasional Way Kambas, Kab. Lampung Timur" -> kawasan TN Way Kambas
    for a, b in KOREKSI.items():
        lok = lok.replace(a, b)
    return jenis, lok


def _angka_kejadian(jenis, dampak, kondisi, status_darurat):
    a, t = {}, f'{dampak} {kondisi}'
    cari = lambda pola, s=t: (lambda m: angka(m.group(1)) if m else None)(re.search(pola, s, re.I))
    if jenis == 'kekeringan':
        a.update(kk=cari(r'([\d.]+)\s*KK'), jiwa=cari(r'([\d.]+)\s*jiwa'), tangki=cari(r'(\d+)\s*Tangki'), liter=cari(r'([\d.]+)\s*Liter'))
    elif jenis == 'angin':
        a.update(kios=cari(r'(\d[\d.]*)\s*unit\s*kios'), rumah=cari(r'(\d[\d.]*)\s*unit\s*rumah'))
    elif jenis in ('gempabumi', 'banjir'):
        a.update(meninggal=cari(r'(\d[\d.]*)\s*(?:\([^)]*\)\s*)?jiwa\s*MD'), kk=cari(r'([\d.]+)\s*KK'), mengungsi=cari(r'([\d.]+)\s*jiwa\s*mengungsi'),
                 huntara=cari(r'(\d[\d.]*)\s*unit\s*huntara'))
        # rumah rusak = RB + RS + RR (Solok 26 Okt: 19 + 9 + 33); tanpa rincian kerusakan, angka "rumah terdampak" (Tapanuli Tengah) dipisah
        rusak = [angka(m) for m in re.findall(r'(\d[\d.]*)\s*unit\s*rumah\s*R[BSR]\b', dampak)]
        if rusak: a['rumah'] = sum(rusak)
        else: a.update(rumah=cari(r'([\d.]+)\s*(?:unit\s*)?rumah\s*rusak'), rumah_dampak=cari(r'([\d.]+)\s*(?:unit\s*)?rumah\s*terdampak'))
        m = re.search(r'(Transisi[^T]*?)TMT.*?s\.d\.?\s*(\d\d)/(\d\d)/(\d{4})', status_darurat)
        if m:
            a['transisi_sd'] = f'{m.group(4)}-{m.group(3)}-{m.group(2)}'
    else:
        a['ha'] = cari(r'±?\s*([\d.,]+)\s*ha', dampak)   # luas laporan BPBD; untuk karhutla TIDAK dipakai di deck (angka luas = data kita)
    return {k: v for k, v in a.items() if v is not None}


def koordalops(teks, pagi=True):
    t = teks.replace('⁠', '').replace('\xa0', ' ')
    m = re.search(r'tanggal\s+(\d\d)/(\d\d)/(\d{4})\s+pkl\s+(\d\d\.\d\d)\s*WIB\s+s\.d\.?\s+(\d\d)/(\d\d)/(\d{4})\s+pkl\s+(\d\d\.\d\d)', t)
    if not m:
        raise ValueError('kepala laporan Koordalops tidak ditemukan')
    mulai, sampai = f'{m[3]}-{m[2]}-{m[1]} {m[4]}', f'{m[7]}-{m[6]}-{m[5]} {m[8]}'
    if pagi and not sampai.endswith('07.00'):   # pagi=False: laporan sela 19.00 (pemilik 27 Okt memakainya untuk harian 271026)
        raise ValueError(f'pakai laporan pagi (s.d. 07.00), bukan {sampai}')
    out = {'mulai': mulai, 'sampai': sampai, 'laporan': int(re.search(r'Laporan kejadian bencana sejumlah\s+(\d+)', t, re.I)[1]),
           'menonjol': int(re.search(r'berdampak signifikan sejumlah\s+(\d+)', t, re.I)[1]), 'kejadian': []}
    for blok in re.split(r'\n\*[A-Z]\.\s*', t)[1:]:
        prov = kode_prov(blok.split('*', 1)[0])
        for e in re.split(r'\n\d+\.(?:\s+|(?=[A-Z]))', '\n' + blok.split('*', 1)[1])[1:]:   # WA 26 Okt: "1.Bencana" tanpa spasi
            judul = re.sub(r'\*?\((?:Pengkinian Data|Kejadian Baru)\)\*?', '', e.split('\n', 1)[0]).replace('Bencana Alam', '').strip()
            if not judul:
                continue
            ambil = lambda kunci: (lambda m: m.group(1).strip() if m else '')(re.search(rf'-\s*{kunci}\s*:\s*(.*)', e, re.I))
            dampak, sd, kondisi = ambil('Dampak'), ambil('Penetapan status'), ambil('Kondisi mutakhir')
            jenis, lok = _jenis_lokasi(judul)
            out['kejadian'].append({'jenis': jenis, 'prov': prov, 'lokasi': lok, 'status': status_dari(kondisi, not lok),
                                    'angka': _angka_kejadian(jenis, dampak, kondisi, sd), 'teks': {'dampak': dampak, 'status_darurat': sd, 'kondisi': kondisi}})
    if len(out['kejadian']) != out['menonjol']:
        raise ValueError(f"terurai {len(out['kejadian'])} kejadian, laporan menyebut {out['menonjol']} menonjol")
    return out


KOTA = {'ppangkalanbun': 'Pangkalan Bun', 'pangkalanbun': 'Pangkalan Bun', 'pangkalan bun': 'Pangkalan Bun', 'palangkaraya': 'Palangka Raya',
        'musi 2 palembang': 'Palembang', 'talang betutu palembang': 'Palembang'}


def bmkg(teks):
    t = teks.replace('\xa0', ' ')
    pm = []
    for m in re.finditer(r'^[\s*\-]*([A-Za-z][A-Za-z0-9 .]*?)\s*:?\s*(\d+(?:[.,]\d+)?)\s*(?:µg/m³)?\s*\(([^)]+)\)', t, re.M):
        nama = m.group(1).strip()
        pm.append((KOTA.get(nama.lower(), nama.title()), float(m.group(2).replace(',', '.')), m.group(3).strip()))
    daftar = lambda pola: [re.sub(r'^dan\s+', '', p.strip()) for p in re.split(r',', (re.search(pola, t, re.S) or [None, ''])[1]) if p.strip()]
    jam = re.search(r'Tertinggi pada hari (.+?WIB)', t)
    per = re.search(r'Periode\s+(.+?\d{4})', t)
    return {'jam': jam[1] if jam else '', 'pm': pm, 'periode': per[1] if per else '',
            'hujan': daftar(r'intensitas sedang yang terjadi di (.+?)\.\s*(?:\n|$)'), 'angin': daftar(r'Angin Kencang\*?:\s*(.+?)\.\s*(?:\n|$)')}


def uji():
    k = koordalops(open(os.path.join(DI, 'contoh', 'koordalops_241026.txt')).read())
    assert (k['laporan'], k['menonjol'], k['mulai'], k['sampai']) == (23, 17, '2026-10-23 07.00', '2026-10-24 07.00'), (k['laporan'], k['menonjol'])
    isi = json.load(open(os.path.join(DI, '..', 'harian-2026-10-24.json')))['isi']['kejadian']
    a = sorted((x['jenis'], x['prov'], x['lokasi'], x['status']) for x in k['kejadian'])
    b = sorted((x['jenis'], x['prov'], x['lokasi'], x['status']) for x in isi)
    assert a == b, f'beda dengan isian 24 Okt:\n  urai  {sorted(set(a) - set(b))}\n  isian {sorted(set(b) - set(a))}'
    kr = next(x for x in k['kejadian'] if x['jenis'] == 'kekeringan')['angka']
    assert kr == {'kk': 11202, 'jiwa': 36144, 'tangki': 17, 'liter': 71000}, kr
    g = next(x for x in k['kejadian'] if x['jenis'] == 'gempabumi')['angka']
    assert (g['mengungsi'], g['meninggal'], g['rumah'], g['huntara'], g['transisi_sd']) == (27563, 156, 118834, 193, '2026-12-27'), g
    assert next(x for x in k['kejadian'] if x['jenis'] == 'lainnya')['angka']['ha'] == 15.5
    w = bmkg(open(os.path.join(DI, 'contoh', 'bmkg_241026.txt')).read())
    assert len(w['pm']) == 10 and w['pm'][0] == ('Pangkalan Bun', 603.0, 'Berbahaya'), w['pm'][:2]
    assert 'Kalimantan Tengah' in w['hujan'] and 'Lampung' in w['angin'], (w['hujan'], w['angin'])
    print('uji lolos: 23 laporan, 17 kejadian sama dengan isian 24 Okt; BMKG', len(w['pm']), 'stasiun')


if __name__ == '__main__':
    uji()
