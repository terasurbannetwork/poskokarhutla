"""Urai teks WA laporan harian untuk deck Laporan Kejadian Bencana Harian.

koordalops(teks) -> {'mulai': 'YYYY-MM-DD HH.MM', 'sampai': ..., 'laporan': int, 'menonjol': int, 'kejadian': [...]}
    kejadian: {'jenis', 'prov', 'lokasi', 'status', 'perhatian', 'angka': {...}, 'teks': {'dampak', 'status_darurat', 'kondisi'}}
    jenis: karhutla | kekeringan | gempabumi | banjir | longsor | angin | cuaca (cuaca ekstrem) | gelombang_pasang (gelombang pasang, abrasi, rob) | kebakaran_permukiman | lainnya (kebakaran TPA); status: belum | berjalan | selesai (aturan di status_dari()).
    Pakai laporan 07.00 s.d. 07.00 (bukan laporan 19.00 yang hanya setengah hari).
bmkg(teks) -> {'jam': 'Sabtu, 24 Oktober 2026 pukul 06.00 WIB', 'pm': [(kota, nilai, kategori)], 'hujan': [prov], 'angin': [prov], 'periode': '23 – 25 Oktober 2026'}
Uji: python3 wa_harian.py --uji  (teks 24 Okt di contoh/ harus sama dengan isian ../harian-2026-10-24.json)"""
import json, os, re

DI = os.path.dirname(os.path.abspath(__file__))
AKAR = os.path.abspath(os.path.join(DI, '..', '..', '..'))
_PROV = {v['nama'].lower(): k for k, v in json.load(open(os.path.join(AKAR, 'public', 'data', 'laporan.json')))['prov'].items()}
KOREKSI = {'Kota. ': 'Kota ', 'Supit Urung': 'Supit Urang', 'Kota Parepare': 'Kota Pare Pare'}   # salah ketik nama di WA yang berulang; 2 Nov: data website mengeja "Kota Pare Pare"


def kode_prov(nama):
    n = re.sub(r'\s+', ' ', nama.replace('Prov.', '').strip()).lower()
    n = {'kepulauan bangka belitung': 'kep. bangka belitung', 'bangka belitung': 'kep. bangka belitung', 'ntt': 'nusa tenggara timur', 'ntb': 'nusa tenggara barat', 'diy': 'di yogyakarta', 'daerah istimewa yogyakarta': 'di yogyakarta', 'd.i yogyakarta': 'di yogyakarta', 'd.i. yogyakarta': 'di yogyakarta', 'dki jakarta': 'dki jakarta'}.get(n, n)
    if n not in _PROV:
        raise ValueError(f'provinsi tidak dikenal: {nama!r}')
    return _PROV[n]


def angka(s):
    """'±11.202' / '20.709,78' / '29,8' -> float (format Indonesia). 3 Nov: '8.5' (titik desimal, 1-2 digit) = 8,5 bukan 85."""
    if re.fullmatch(r'\d+\.\d{1,2}', s): return float(s)
    return float(s.replace('.', '').replace(',', '.'))


def status_dari(kondisi, prov_level):
    """BPBD: belum = api/kejadian belum tertangani; berjalan = penanganan berjalan; selesai = padam/surut.
    Urutan: kata 'masih/belum dapat/pendinginan' -> belum; ada sisa belum padam > 0 ha -> belum (kabupaten) atau berjalan (provinsi, sisa
    tersebar di banyak lokasi); 'berhasil dipadamkan/sudah padam/surut' -> selesai; selain itu berjalan."""
    k = kondisi.lower()
    if re.search(r'masih dilakukan|masih pemadaman|belum dapat|belum sepenuhnya|belum berhasil|pendinginan|muncul kembali|masih terlihat|masih terpantau|masih berlangsung|masih menggenang|belum surut|berangsur surut|perlahan surut|rumah warga tergenang', k):   # 4 Nov Aceh Selatan: "air perlahan surut ... rumah warga tergenang 10-60 cm"
        return 'belum'
    m = re.search(r'sisa[^,.]*?(?:padam\s*)?(?:luas\s*)?±?\s*(\d[\d.,]*)\s*ha', k)
    if m and angka(m.group(1).rstrip('.,')) > 0:
        return 'berjalan' if prov_level else 'belum'
    if re.search(r'berhasil dipadamkan|berhasil di dipadamkan|sudah padam|telah padam|surut', k):
        return 'selesai'
    return 'berjalan'


def _jenis_lokasi(judul):
    j = judul.lower()
    # 11 Nov: gelombang pasang/abrasi/rob dan kebakaran permukiman punya jenis sendiri (sama dengan arsip logbook); sebelumnya jatuh ke banjir/'lainnya' (= "Kebakaran TPA" di deck)
    # angin/cuaca didahulukan: "Cuaca Ekstrem (Gelombang Tinggi)" tetap cuaca; "Banjir Rob" ke gelombang_pasang (sama dengan logbook)
    jenis = ('angin' if 'angin kencang' in j or 'puting beliung' in j else 'cuaca' if 'cuaca ekstrem' in j
             else 'gelombang_pasang' if re.search(r'gelombang\s+pasang|gelombang\s+tinggi|abrasi|\brob\b', j) else 'kebakaran_permukiman' if re.search(r'kebakaran\s+(?:pe?mukiman|permukiman|rumah|bangunan|gedung|pasar|ruko|kios)', j)
             else 'lainnya' if 'tpa' in j else 'karhutla' if 'hutan dan lahan' in j or 'karhutla' in j or 'kebakaran lahan' in j or 'kebakaran hutan' in j else 'kekeringan' if 'kekeringan' in j
             else 'gempabumi' if 'gempa' in j else 'banjir' if 'banjir' in j else 'longsor' if 'longsor' in j or 'logsor' in j else 'lainnya')   # 3 Nov: salah ketik "Tanah Logsor"   # 1 Nov: tanah longsor Simalungun sempat jadi 'Kebakaran TPA'
    di = re.split(r'\s+di\s+', judul, maxsplit=1)[1] if ' di ' in judul else ''
    if not di: di = (lambda m: m.group(1) if m else '')(re.search(r'\b((?:Kab\.|Kabupaten|Kota)\s.*)', judul))   # 3 Nov: "Tanah Logsor Kab. Simalungun Prov. Sumatera Utara" tanpa "di"
    if not di.startswith(('Prov.', 'Provinsi')): di = re.sub(r',?\s+Prov(?:\.|insi)\s.*$', '', di)   # WA 28 Okt: "di Kota Subulussalam, Prov. Aceh"; 29 Okt tanpa koma: "Kab. Klaten Prov. Jawa Tengah"
    tn = re.search(r'\(Taman Nasional\s+([^)]+)\)', judul)   # WA 30 Okt: "Karhutla (Taman Nasional Way Kambas) di Kab. Lampung Timur"
    if tn:
        lok = f'TN {tn.group(1).strip()}'
    elif jenis == 'lainnya' and 'TPA' in judul:
        lok = re.search(r'(TPA\s+[A-Z][\w ]*?)\)?\s+di\s', judul).group(1)
    elif di.startswith(('Prov.', 'Provinsi')):
        g = re.search(r'\((?:Gn\.|Gunung)\s+([^)]+)\)', judul)   # WA 26 Okt: "(Gn. Argopuro) di Prov. Jawa Timur" = kawasan, bukan seluruh provinsi
        lok = f'Gunung {g.group(1).strip()}' if g else ''
    else:
        # 30 Okt: "Kota" dipertahankan; data kita menamai kota "Kota Sorong", beda dengan kabupaten "Sorong" (angka Kab. Sorong sempat terpakai)
        lok = re.sub(r'^(Kab\.|Kabupaten|Kawasan)\s+', '', di.strip())
        lok = re.sub(r'^Taman Nasional\s+([^,]+),.*$', r'TN \1', lok)   # "Taman Nasional Way Kambas, Kab. Lampung Timur" -> kawasan TN Way Kambas
    if lok.lower() in _PROV: lok = ''   # WA 30 Okt: "di Kalimantan Barat" tanpa "Prov." = kejadian tingkat provinsi
    for a, b in KOREKSI.items():
        lok = lok.replace(a, b)
    return jenis, lok


def _angka_kejadian(jenis, dampak, kondisi, status_darurat):
    a, t = {}, f'{dampak} {kondisi}'
    cari = lambda pola, s=t: (lambda m: angka(m.group(1)) if m else None)(re.search(pola, s, re.I))
    if jenis == 'kekeringan':
        a.update(kk=cari(r'([\d.]+)\s*KK'), jiwa=cari(r'([\d.]+)\s*jiwa'), tangki=cari(r'(\d+)\s*Tangki'), liter=cari(r'([\d.]+)\s*Liter'))
    elif jenis in ('angin', 'cuaca'):
        # rumah rusak = RB + RS + RR (Jombang 30 Okt: "1 unit rumah RB"); "unit rumah terdampak" (Tapin) bukan rusak
        rusak = [angka(m) for m in re.findall(r'(\d[\d.]*)\s*unit\s*(?:rumah\s*)?R[BSR]\b', dampak)]   # 12 Nov Gayo Lues: "76 unit RS"
        a.update(meninggal=cari(r'(\d[\d.]*)\s*(?:\([^)]*\)\s*)?jiwa\s*MD'), kk=cari(r'([\d.]+)\s*KK'), kios=cari(r'(\d[\d.]*)\s*unit\s*kios'),
                 rumah=sum(rusak) if rusak else cari(r'(\d[\d.]*)\s*unit\s*rumah(?!\s*terdampak)'), rumah_dampak=cari(r'(\d[\d.]*)\s*unit\s*rumah\s*terdampak'))
    elif jenis in ('gempabumi', 'banjir', 'longsor'):
        # 29 Okt Langkat: "± 691 KK berpotensi terdampak" bukan KK terdampak; disimpan terpisah sebagai potensi_kk
        # 1 Nov Langkat: "694 jiwa mengungsi (sudah kembali ke rumah masing-masing)" bukan pengungsi
        a.update(meninggal=cari(r'(\d[\d.]*)\s*(?:\([^)]*\)\s*)?jiwa\s*MD'), kk=cari(r'([\d.]+)\s*KK(?!\s*berpotensi)'), potensi_kk=cari(r'([\d.]+)\s*KK\s*berpotensi'), mengungsi=cari(r'([\d.]+)\s*jiwa\s*mengungsi(?!\s*\(?sudah kembali)'),
                 huntara=cari(r'(\d[\d.]*)\s*unit\s*huntara'), hilang=cari(r'(\d[\d.]*)\s*(?:\([^)]*\)\s*)?(?:org|orang|jiwa)\s*hilang'))   # 3 Nov Badung: "2 org hilang"
        # rumah rusak = RB + RS + RR (Solok 26 Okt: 19 + 9 + 33); tanpa rincian kerusakan, angka "rumah terdampak" (Tapanuli Tengah) dipisah
        rusak = [angka(m) for m in re.findall(r'(\d[\d.]*)\s*unit\s*(?:rumah\s*)?R[BSR]\b', dampak)]   # 12 Nov Gayo Lues: "76 unit RS"
        if rusak: a['rumah'] = sum(rusak)
        else: a.update(rumah=cari(r'([\d.]+)\s*(?:unit\s*)?rumah\s*rusak'), rumah_dampak=cari(r'([\d.]+)\s*(?:unit\s*)?rumah\s*terdampak'))
        m = re.search(r'(Transisi[^T]*?)TMT.*?s\.d\.?\s*(\d\d)/(\d\d)/(\d{4})', status_darurat)
        if m:
            a['transisi_sd'] = f'{m.group(4)}-{m.group(3)}-{m.group(2)}'
    else:
        a['ha'] = cari(r'±?\s*([\d.,]+)\s*ha', dampak)   # luas laporan BPBD; untuk karhutla TIDAK dipakai di deck (angka luas = data kita)
    return {k: v for k, v in a.items() if v is not None}


def koordalops(teks, pagi=True, terima_kurang=False):
    t = teks.replace('⁠', '').replace('\xa0', ' ').replace('unit tumah', 'unit rumah')   # 12 Nov NTT: "15.812 unit tumah RS"
    m = re.search(r'tanggal\s+(\d\d)/(\d\d)/(\d{4})\s+(?:pkl|pukul)\.?\s+(\d\d\.\d\d)\s*WIB\s+s\.d\.?\s+(\d\d)/(\d\d)/(\d{4})\s+(?:pkl|pukul)\.?\s+(\d\d\.\d\d)', t)   # WA 9 Nov: "pukul 07.00 WIB s.d ... pkl 07.00"
    if not m:
        raise ValueError('kepala laporan Koordalops tidak ditemukan')
    mulai, sampai = f'{m[3]}-{m[2]}-{m[1]} {m[4]}', f'{m[7]}-{m[6]}-{m[5]} {m[8]}'
    if pagi and not sampai.endswith('07.00'):   # pagi=False: laporan sela 19.00 (pemilik 27 Okt memakainya untuk harian 271026)
        raise ValueError(f'pakai laporan pagi (s.d. 07.00), bukan {sampai}')
    out = {'mulai': mulai, 'sampai': sampai, 'laporan': int(re.search(r'Laporan kejadian bencana sejumlah\s+(?:kejadian\s+)?(\d+)', t, re.I)[1]),   # 4 Nov: "sejumlah kejadian 31"
           'menonjol': int(re.search(r'berdampak signifikan sejumlah\s+(?:kejadian\s+)?(\d+)', t, re.I)[1]), 'kejadian': []}
    for blok in re.split(r'\n\*[A-Z]\.\s*', t)[1:]:
        prov = kode_prov(blok.split('*', 1)[0])
        for e in re.split(r'\n\d+\.(?:\s+|(?=[A-Z]))', '\n' + blok.split('*', 1)[1])[1:]:   # WA 26 Okt: "1.Bencana" tanpa spasi
            kepala = e.split('\n', 1)[0]
            baru = bool(re.search(r'\(Kejadian Baru\)', kepala, re.I))   # 30 Okt manager: halaman utama hanya merinci kejadian baru
            judul = re.sub(r'\*?\((?:Pengkinian Data|Kejadian Baru)\)\*?', '', kepala, flags=re.I).replace('Bencana Alam', '').replace('Bencana Non Alam', '').strip()
            if not judul:
                continue
            ambil = lambda kunci: (lambda m: m.group(1).strip() if m else '')(re.search(rf'(?:^|[-*•])[ \t]*{kunci}\s*:\s*(.*)', e, re.I | re.M))   # 12 Nov: butir "* Dampak:", sebelumnya "- Dampak:"
            dampak, sd, kondisi = ambil('Dampak'), ambil('Penetapan status'), ambil('Kondisi mutakhir')
            # 12 Nov: pengungsi dan kerusakan pindah ke butir sendiri; angka dihitung dari ketiganya
            semua = ' '.join(x for x in (dampak, ambil('Pengungsi'), ambil('Kerusakan')) if x)
            jenis, lok = _jenis_lokasi(judul)
            out['kejadian'].append({'jenis': jenis, 'prov': prov, 'lokasi': lok, 'status': status_dari(kondisi, not lok), 'baru': baru,
                                    'label': re.split(r'\s+di\s+', judul, maxsplit=1)[0].strip(),
                                    'angka': _angka_kejadian(jenis, semua, kondisi, sd), 'teks': {'dampak': dampak, 'status_darurat': sd, 'kondisi': kondisi,
                                    # 4 Nov: butir "* Pengungsi ; ..." di bawah Dampak (dampak hanya menangkap butir pertama, Korban Jiwa)
                                    'pengungsi': (lambda m: m.group(1).strip() if m else '')(re.search(r'\*\s*Pengungsi\s*[;:]\s*(.*)', e, re.I))}})
    # terima_kurang: hanya atas perintah pemilik per laporan (12 Nov: WA Koordalops menyebut 20, merinci 15); lebih banyak dari kepala tetap ditolak
    if len(out['kejadian']) != out['menonjol'] and not (terima_kurang and len(out['kejadian']) < out['menonjol']):
        raise ValueError(f"terurai {len(out['kejadian'])} kejadian, laporan menyebut {out['menonjol']} menonjol")
    return out


def pvmbg(teks):
    """WA PVMBG pagi -> {'jam', 'level': {'Awas': n, 'Siaga': n, 'Waspada': n, 'Normal': n}, 'gunung': [...]}.
    gunung = laporan khusus Level III/IV: {'nama', 'level', 'visual', 'gempa', 'rekom'} butir apa adanya (tanpa '* '),
    'urai' = [(jumlah, jenis gempa)], 'radius'/'sektor' = jarak km terbesar di rekomendasi ("radius N km", "sejauh (maksimal) N km")."""
    t = teks.replace('\xa0', ' ').replace('\r', '')
    m = re.search(r'pada hari\s+(.+?pukul\s+\d\d[.:]\d\d\s*WIB)', t)
    level = {}
    for lab in ('Awas', 'Siaga', 'Waspada', 'Normal'):
        n = re.search(rf'(\d+)\s*\([^)]*\)\s*gunung api pada Level [IV]+\s*\({lab}\)', t)
        level[lab] = int(n[1]) if n else 0
    gunung, lv = [], None
    for blok in re.split(r'\n(?=\*[^\s*][^\n]*\*[ \t]*\n)', t):   # judul blok = satu baris utuh *...*; butir "* ..." bukan judul
        k = re.match(r'\*Laporan khusus gunung api pada Level [IV]+ \((\w+)\)\*', blok)
        if k:
            lv = k[1]; continue
        g = re.match(r'\*((?:Gn\.|Gunung)[^*]+)\*', blok)
        if not g or not lv: continue
        bag, cur = {'visual': [], 'gempa': [], 'rekom': []}, None
        for baris in blok.split('\n')[1:]:
            b = baris.strip()
            if re.match(r'^Visual\s*:', b): cur = 'visual'; continue
            if re.match(r'^Kegempaan\s*:', b): cur = 'gempa'; continue
            if re.match(r'^Rekomendasi\s*:', b): cur = 'rekom'; continue
            if b.startswith('Demikian'): break
            if cur and re.match(r'^[*\-•]\s*\S', b): bag[cur].append(re.sub(r'^[*\-•]\s*', '', b))
        urai = []
        for b in bag['gempa']:
            q = re.match(r'(\d+)\s*kali\s*(?:gempa\s+)?(.+?)\s+dengan', b, re.I)
            if q: urai.append((int(q[1]), q[2].split('/')[0].strip().lower()))
        km = lambda pola: [float(x.replace(',', '.')) for r in bag['rekom'] for x in re.findall(pola, r, re.I)]
        radius, sektor = km(r'radius\s+(\d+(?:[.,]\d+)?)\s*km'), km(r'sejauh\s+(?:maksimal\s+)?(\d+(?:[.,]\d+)?)\s*km')
        gunung.append({'nama': g[1].strip(), 'level': lv, **bag, 'urai': urai, 'radius': max(radius) if radius else None, 'sektor': max(sektor) if sektor else None})
    if not gunung and not any(level.values()):
        raise ValueError('teks PVMBG tidak dikenali')
    return {'jam': m[1] if m else '', 'level': level, 'gunung': gunung}


KOTA = {'ppangkalanbun': 'Pangkalan Bun', 'pangkalanbun': 'Pangkalan Bun', 'pangkalan bun': 'Pangkalan Bun', 'palangkaraya': 'Palangka Raya',
        'musi 2 palembang': 'Palembang', 'talang betutu palembang': 'Palembang'}


def bmkg(teks):
    t = teks.replace('\xa0', ' ')
    pm = []
    # 6 Nov: WA BMKG tanpa kategori ("* KEMAYORAN 80.5") -> kategori dari ambang ISPU PM2.5 (cocok arsip: 55,3 Sedang, 96,6 Tidak sehat)
    ispu = lambda v: 'Baik' if v <= 15.5 else 'Sedang' if v <= 55.4 else 'Tidak sehat' if v <= 150.4 else 'Sangat tidak sehat' if v <= 250.4 else 'Berbahaya'
    for m in re.finditer(r'^[\s*\-]*([A-Za-z][A-Za-z0-9 .]*?)\s*:?\s*(\d+(?:[.,]\d+)?)\s*(?:µg/m³)?(?:\s*\(([^)]+)\)|[ \t]*$)', t, re.M):
        nama, v = m.group(1).strip(), float(m.group(2).replace(',', '.'))
        pm.append((KOTA.get(nama.lower(), nama.title()), v, (m.group(3) or ispu(v)).strip()))
    daftar = lambda pola: [re.sub(r'^dan\s+', '', p.strip()) for p in re.split(r',|\s+dan\s+', (re.search(pola, t, re.S) or [None, ''])[1]) if p.strip()]   # 3 Nov: "A dan B" = dua provinsi
    jam = re.search(r'Tertinggi pada hari (.+?WIB)', t)
    per = re.search(r'Periode\s+(.+?\d{4})', t)
    return {'jam': jam[1] if jam else '', 'pm': pm, 'periode': per[1] if per else '',
            'hujan': daftar(r'intensitas sedang yang terjadi di (.+?)\.\s*(?:\n|$)'), 'angin': [p for p in daftar(r'Angin Kencang\*?:[ \t]*([^\n]+?)\.?[ \t]*(?:\n|$)') if p.upper() not in ('NIL', 'NIHIL', '-')],   # 6 Nov: "Angin Kencang: NIL."
            'siaga': [p for p in daftar(r'Siaga \(hujan lebat[^)]*\)\*?:[ \t]*([^\n]+?)\.?[ \t]*(?:\n|$)') if p.upper() not in ('NIL', 'NIHIL', '-')],   # 8 Nov: peringatan dini Siaga hujan lebat
            'awas': [p for p in daftar(r'Awas \(hujan[^)]*\)\*?:[ \t]*([^\n]+?)\.?[ \t]*(?:\n|$)') if p.upper() not in ('NIL', 'NIHIL', '-')]}   # 9 Nov: tingkat Awas; baris tanpa titik tidak boleh menelan "b. Imbauan"


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
    w9 = bmkg('- Awas (hujan sangat lebat – ekstrim): Sumatera Utara.\n- Siaga (hujan lebat): Aceh dan Sumatera Barat.\n- Angin Kencang: Papua Selatan\n\nb. Imbauan:\n* Masyarakat diimbau.\n')
    assert (w9['awas'], w9['siaga'], w9['angin']) == (['Sumatera Utara'], ['Aceh', 'Sumatera Barat'], ['Papua Selatan']), w9
    b12 = koordalops('tanggal 11/11/2026 pkl 07.00 WIB s.d 12/11/2026 pkl 07.00 WIB\nLaporan kejadian bencana sejumlah 1 kejadian.\nberdampak signifikan sejumlah 1 kejadian.\n'
                     '*A. Prov. Jawa Tengah*\n1. Bencana Alam Kekeringan di Kab. Boyolali Prov. Jawa Tengah *(Pengkinian Data)*\n* Dampak: 12.022 KK / 57.311 jiwa terdampak\n'
                     '* Penetapan Status: Siaga Darurat\n* Kondisi Mutakhir: distribusi 16 tangki (82.000 liter)\n')['kejadian'][0]   # 12 Nov: butir bintang
    assert b12['angka'] == {'kk': 12022, 'jiwa': 57311, 'tangki': 16, 'liter': 82000} and b12['teks']['status_darurat'] == 'Siaga Darurat', b12
    g12 = koordalops('tanggal 11/11/2026 pkl 07.00 WIB s.d 12/11/2026 pkl 07.00 WIB\nLaporan kejadian bencana sejumlah 1 kejadian.\nberdampak signifikan sejumlah 1 kejadian.\n'
                     '*A. Prov. Aceh*\n1. Bencana Alam Banjir di Kab. Gayo Lues, Prov. Aceh *(Pengkinian Data)*\n* Dampak: 118 KK / 376 jiwa terdampak\n'
                     '* Pengungsi: 26 jiwa mengungsi ke rumah saudara\n* Kerusakan: 13 unit rumah RB, 76 unit RS, 15 unit tumah RR\n* Kondisi Mutakhir: surut\n')['kejadian'][0]   # 12 Nov: butir terpisah
    assert (g12['angka']['mengungsi'], g12['angka']['rumah']) == (26, 104), g12['angka']
    print('uji lolos: 23 laporan, 17 kejadian sama dengan isian 24 Okt; BMKG', len(w['pm']), 'stasiun')
    f3 = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'harian-2026-11-03', 'wa-koordalops.txt')
    if os.path.exists(f3):   # 3 Nov: salah ketik "Logsor", judul tanpa "di", "±8.5 ha", MD pada cuaca ekstrem, "org hilang"
        k = {(x['jenis'], x['lokasi']): x['angka'] for x in koordalops(open(f3, encoding='utf-8').read())['kejadian']}
        assert k[('longsor', 'Simalungun')]['kk'] == 90 and k[('karhutla', 'Kolaka Timur')]['ha'] == 8.5, k
        assert k[('cuaca', 'Dairi')]['meninggal'] == 1 and k[('longsor', 'Badung')]['hilang'] == 2, k
        print('uji lolos: WA Koordalops 3 Nov, 18 kejadian')
    J = lambda t: _jenis_lokasi(t)[0]
    assert (J('Gelombang Pasang di Kab. Rembang'), J('Banjir Rob di Kota Semarang'), J('Abrasi di Kab. Indramayu')) == ('gelombang_pasang',) * 3
    assert (J('Kebakaran Pemukiman di Kab. Deli Serdang'), J('Kebakaran Permukiman di Kota Bogor'), J('Kebakaran Rumah di Kab. Mappi')) == ('kebakaran_permukiman',) * 3
    assert (J('Cuaca Ekstrem (Gelombang Tinggi) di Kab. Sikka'), J('Angin Kencang dan Gelombang Tinggi di Kab. Natuna')) == ('cuaca', 'angin')
    assert (J('Kebakaran TPA Suwung di Kota Denpasar'), J('Kebakaran Hutan dan Lahan di Kab. Ketapang'), J('Banjir di Kab. Bekasi')) == ('lainnya', 'karhutla', 'banjir')


if __name__ == '__main__':
    uji()
