"""Laporan Khusus Gempa untuk bot WA: susun KONFIG otomatis lalu bangun lewat insidental/gempa_khusus.py (gaya baku pemilik 20 Nov 2026).

Pemilik 20 Nov 2026: "kalau saya minta bot wa bikin laporan gempa, kayak gini" (Laporan Khusus Gempa M5,4 Nias Barat 191126).
Semua angka dari sistem, tidak dari WA atau Claude (KEPUTUSAN-BOT-LAPORAN K4):
- Gempa: arsip BMKG InaTEWS repo (public/gempa/data/inatews_detail_YYYY-MM.json) ditambah feed BMKG langsung
  (data.bmkg.go.id gempaterkini, gempadirasakan, autogempa). --lokasi dicocokkan ke teks wilayah BMKG, nama kab/kota di sekitar
  pusat gempa, dan nama provinsinya; tanpa --lokasi dipilih gempa M5 ke atas terbaru. Hanya gempa sampai --tanggal, paling lama 7 hari.
- Dirasakan: daftar MMI BMKG ("III Saumlaki, II Nabire") dipetakan ke kab/kota lewat nama kab atau kecamatan; nama tak dikenal dibuang.
- BPBD: laphar terurai terbaru (data/laporan-bnpb/harian/*/*/kerja-*/data.json, jenis gempabumi) sejak tanggal gempa.
- Batas peta, cincin jarak, label kab/kota (penempatan otomatis gempa_khusus.tata_label), judul, dan tabel dihitung di sini.

    python gempa_bot.py --tanggal 2026-11-20 --out DIR --berkas "Laporan Khusus Gempa 201126" [--lokasi nias]
    python gempa_bot.py --tanggal 2026-11-20 --lokasi nias --konfig   # cetak KONFIG saja, tanpa membangun
Keluaran: DIR/<berkas>.pptx dan .pdf (nama dari bot, otomatis.mjs LAPORAN_PROYEK 'gempa').
"""
import argparse, datetime as dt, glob, json, math, os, re, sys, urllib.request

SINI = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(SINI, '..', '..', '..'))
sys.path.insert(0, os.path.join(REPO, 'data', 'laporan-bnpb', 'insidental'))
sys.path.insert(0, os.path.join(REPO, 'scripts', 'gempa'))
import guncangan as G   # noqa: E402

WIB = dt.timezone(dt.timedelta(hours=7))
BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
ROMAWI = {'I': 1, 'II': 2, 'III': 3, 'IV': 4, 'V': 5, 'VI': 6, 'VII': 7, 'VIII': 8, 'IX': 9, 'X': 10}
BMKG = 'https://data.bmkg.go.id/DataMKG/TEWS/{}.json'
ARAH = {'utara': 'utara', 'selatan': 'selatan', 'barat': 'barat', 'timur': 'timur', 'baratdaya': 'barat daya', 'baratlaut': 'barat laut',
        'tenggara': 'tenggara', 'timurlaut': 'timur laut'}
band = lambda m: int(m + 0.5)
norm = lambda t: re.sub(r'[^a-z0-9]', '', (t or '').lower())


def prov_nama():
    teks = open(os.path.join(REPO, 'scripts', 'umum', 'status_darurat.py'), encoding='utf-8').read()
    return dict(re.findall(r'"(\d{2})": "([^"]+)"', re.search(r'PROV_NAMA = \{(.+?)\}', teks, re.S).group(1)))


# ---------------------------------------------------------------- gempa dari BMKG
def _bmkg(nama):
    try:
        minta = urllib.request.Request(BMKG.format(nama), headers={'User-Agent': 'Mozilla/5.0 (laporan-gempa)'})
        with urllib.request.urlopen(minta, timeout=20) as r:
            g = json.load(r)['Infogempa']['gempa']
        return g if isinstance(g, list) else [g]
    except Exception as e:
        print(f'BMKG {nama} gagal: {e}', file=sys.stderr)
        return []


def daftar_gempa():
    """-> [{t (datetime WIB), lat, lon, m, dalam, area, potensi, felt}] dari arsip repo dan feed BMKG, digabung per waktu dan posisi."""
    ev = []
    for f in sorted(glob.glob(os.path.join(REPO, 'public', 'gempa', 'data', 'inatews_detail_*.json')))[-2:]:
        for k in json.load(open(f, encoding='utf-8')).get('kejadian', {}).values():
            for b in k.get('buletin', []):
                if b.get('m') is None or b.get('t') is None:
                    continue
                ev.append({'t': dt.datetime.fromtimestamp(b['t'], WIB), 'lat': b['lat'], 'lon': b['lon'], 'm': b['m'], 'dalam': b.get('dalam'),
                           'area': b.get('area') or '', 'potensi': b.get('potensi') or '', 'felt': b.get('felt') or ''})
    for nama in ('gempaterkini', 'gempadirasakan', 'autogempa'):
        for b in _bmkg(nama):
            la, lo = map(float, b['Coordinates'].split(','))
            ev.append({'t': dt.datetime.fromisoformat(b['DateTime'].replace('Z', '+00:00')).astimezone(WIB), 'lat': la, 'lon': lo,
                       'm': float(b['Magnitude']), 'dalam': float(b['Kedalaman'].split()[0]), 'area': b.get('Wilayah', ''),
                       'potensi': b.get('Potensi', ''), 'felt': b.get('Dirasakan', '')})
    gabung = []   # satu gempa = waktu selisih <= 2 menit dan jarak <= 50 km; teks yang lebih lengkap menang
    for e in sorted(ev, key=lambda e: e['t']):
        for x in gabung:
            if abs((x['t'] - e['t']).total_seconds()) <= 120 and G.jarak_km(x['lat'], x['lon'], e['lat'], e['lon']) <= 50:
                for kunci in ('area', 'potensi', 'felt'):
                    if len(e[kunci]) > len(x[kunci]) or ('Pusat gempa' in e[kunci] and 'Pusat gempa' not in x[kunci]):
                        x[kunci] = e[kunci]
                x['m'] = e['m']   # magnitudo pemutakhiran terakhir
                break
        else:
            gabung.append(dict(e))
    return gabung


def pilih_gempa(daftar, lokasi, tanggal, kab_dekat, nama_prov):
    akhir = dt.datetime.combine(tanggal, dt.time(23, 59, 59), WIB)
    calon = [e for e in daftar if e['t'] <= akhir and e['t'] >= akhir - dt.timedelta(days=7) and e['m'] >= 4]
    if lokasi:
        kunci = [norm(w) for w in re.split(r'[\s,]+', lokasi) if len(norm(w)) >= 3]

        def cocok(e):
            teks = norm(e['area']) + norm(e['felt']) + ''.join(norm(k) for k in kab_dekat(e)) + ''.join(norm(nama_prov.get(p, '')) for p in prov_dekat(e))
            return all(k in teks for k in kunci)
        calon = [e for e in calon if cocok(e)]
    else:
        calon = [e for e in calon if e['m'] >= 5]
    if not calon:
        return None
    return max(calon, key=lambda e: (e['m'] >= 5, e['t']))


_PK = None


def pusat_kec():
    global _PK
    if _PK is None:
        _PK = json.load(open(os.path.join(REPO, 'public', 'banjir', 'data', 'pusat_kec.json'), encoding='utf-8'))
    return _PK


def kab_dekat(e, r=150):
    return sorted({k.split('|')[1] for k, (la, lo) in pusat_kec().items() if G.jarak_km(e['lat'], e['lon'], la, lo) <= r and k.split('|')[1] != 'None'})


def prov_dekat(e, r=200):
    return sorted({k.split('|')[0] for k, (la, lo) in pusat_kec().items() if G.jarak_km(e['lat'], e['lon'], la, lo) <= r})


# ---------------------------------------------------------------- teks BMKG
def urai_wilayah(area, kab_semua):
    """'Pusat gempa berada di laut 114 km Barat Daya Nias Barat' atau '114 km BaratDaya NIASBARAT-SUMUT' -> (laut|darat|None, km, arah, acuan)."""
    letak = 'laut' if 'di laut' in area.lower() else 'darat' if 'di darat' in area.lower() else None
    m = re.search(r'(\d+)\s*km\s+([A-Za-z]+(?:\s+(?:Daya|Laut))?)\s+(.+)$', area.strip())
    if not m:
        return letak, None, None, area.strip()
    km, arah, acuan = int(m.group(1)), ARAH.get(norm(m.group(2)), m.group(2).lower()), m.group(3).strip()
    if acuan.isupper() or '-' in acuan:   # 'NIASBARAT-SUMUT' -> nama kab baku
        inti = norm(acuan.split('-')[0])
        cocok = [k for k in kab_semua if norm(k) == inti or norm(k.replace('Kota ', '')) == inti]
        acuan = cocok[0] if cocok else acuan.split('-')[0].title()
    return letak, km, arah, acuan


def urai_dirasakan(felt, e, kab_semua):
    """-> {kab: mmi maks BMKG}; nama kota/kecamatan dicocokkan ke kab dalam 600 km dari pusat gempa."""
    peta = {}
    for kunci, (la, lo) in pusat_kec().items():
        kp, kab, kec = (kunci.split('|') + [''])[:3]
        if kab == 'None' or G.jarak_km(e['lat'], e['lon'], la, lo) > 600:
            continue
        peta.setdefault(norm(kab), kab); peta.setdefault(norm(kab.replace('Kota ', '')), kab); peta.setdefault(norm(kec), kab)
    dekat = {norm(k) for k in set(peta.values())} | {norm(k.replace('Kota ', '')) for k in set(peta.values())}
    desa = json.load(open(os.path.join(REPO, 'public', 'data', 'desa_cari.json'), encoding='utf-8'))
    for kode, nm, _ in desa['baris']:   # desa/kelurahan hanya di kab sekitar pusat gempa (nama desa kembar di daerah lain diabaikan)
        kab_d = desa['kab'].get(kode[:5], '')
        if norm(kab_d) in dekat:
            kab = next((v for v in set(peta.values()) if norm(v) == norm(kab_d) or norm(v.replace('Kota ', '')) == norm(kab_d)), None)
            if kab:
                peta.setdefault(norm(nm), kab)
    hasil, tempat = {}, {}
    for item in (felt or '').split(','):
        m = re.match(r'\s*([IVX]+)(?:\s*-\s*([IVX]+))?\s+(.+)$', item.strip())
        if not m:
            continue
        mmi = ROMAWI.get(m.group(2) or m.group(1))
        nama = re.sub(r'^(Kab\.|Kabupaten|Kota)\s+', '', m.group(3).strip())
        kab = peta.get(norm(nama)) or peta.get(norm('Kota ' + nama))
        if kab and mmi:
            if mmi > hasil.get(kab, 0):
                hasil[kab], tempat[kab] = mmi, nama   # nama tempat persis seperti di daftar BMKG ("Saumlaki")
        else:
            print(f'dirasakan tidak dikenali: {item.strip()}', file=sys.stderr)
    return hasil, tempat


# ---------------------------------------------------------------- laporan BPBD (laphar terurai)
def laporan_bpbd(e, provs):
    """Laporan BPBD gempa dari semua laphar terurai sejak tanggal gempa sampai 7 hari sesudahnya; per kab dipakai yang terbaru."""
    tgl = e['t'].date()
    berkas = []
    for f in glob.glob(os.path.join(REPO, 'data', 'laporan-bnpb', 'harian', '*', '*', 'kerja-*', 'data.json')):
        hari = os.path.basename(os.path.dirname(os.path.dirname(f)))
        try:
            h = dt.date.fromisoformat(hari)
        except ValueError:
            continue
        if tgl <= h <= tgl + dt.timedelta(days=7):
            berkas.append((h, os.path.getmtime(f), f))
    hasil = {}
    for _, _, f in sorted(berkas, reverse=True):   # terbaru dulu
        for k in json.load(open(f, encoding='utf-8')).get('kejadian', []):
            if k.get('jenis') != 'gempabumi' or k.get('prov') not in provs:
                continue
            if k.get('mulai') and k['mulai'] < (tgl - dt.timedelta(days=1)).isoformat():
                continue
            kab = re.sub(r'^Kab\.\s+', '', k.get('lokasi', ''))
            if kab in hasil:
                continue
            teks = k.get('teks', {})
            hasil[kab] = {'kab': kab, 'kondisi': (teks.get('kondisi') or '').strip(), 'dampak': (teks.get('dampak') or '').strip(),
                          'angka': k.get('angka') or {}, 'laphar': os.path.relpath(f, REPO)}
    print('laphar:', len(berkas), 'berkas,', len(hasil), 'kab dengan laporan gempa', file=sys.stderr)
    return list(hasil.values())


# ---------------------------------------------------------------- KONFIG
def susun(lokasi, tanggal, out, berkas):
    nama_prov = prov_nama()
    e = pilih_gempa(daftar_gempa(), lokasi, tanggal, kab_dekat, nama_prov)
    if not e:
        raise SystemExit(f'Tidak ada gempa yang cocok dengan "{lokasi or "M5 ke atas"}" dalam 7 hari sampai {tanggal}.')
    print(f"gempa: {e['t']:%Y-%m-%d %H:%M} WIB M{e['m']} {e['area']}", file=sys.stderr)
    g = {'m': e['m'], 'dalam': e['dalam'], 'lat': e['lat'], 'lon': e['lon']}
    # MMI model semua kecamatan: provinsi terlibat, kab per kelas
    maks, prov_kab = {}, {}
    for kunci, (la, lo) in pusat_kec().items():
        kp, kab = kunci.split('|')[:2]
        if kab == 'None':
            continue
        m = G.mmi_perkiraan(g['m'], G.jarak_km(g['lat'], g['lon'], la, lo), g['dalam'])
        if m > maks.get(kab, 0):
            maks[kab], prov_kab[kab] = m, kp
    provs = sorted({prov_kab[k] for k, m in maks.items() if band(m) >= 2}) or [prov_kab[max(maks, key=maks.get)]]
    kab_semua = list(maks)
    letak, km, arah, acuan = urai_wilayah(e['area'], kab_semua)
    rasa, rasa_tempat = urai_dirasakan(e['felt'], e, kab_semua)
    bpbd = [b for b in laporan_bpbd(e, provs) if b['kab'] in maks or ('Kota ' + b['kab']) in maks]
    for b in bpbd:
        if b['kab'] not in maks:
            b['kab'] = 'Kota ' + b['kab']
    nama_kab = lambda k: k if k.startswith('Kota') else f'Kab. {k}'

    # tabel kondisi lega (desain halaman 1 terbaru, pemilik 20 Nov 2026 di sesi induk): baris BPBD di sini; kab yang hanya
    # dirasakan BMKG ditambahkan mesin dari `dilapor` dengan nama tempat BMKG (`rasa_bmkg`), korban dan kerusakan dari `dampak`
    lapor = []
    for b in bpbd:
        kon = b['kondisi'] or 'Laporan BPBD belum memuat kondisi.'
        lapor.append((b['kab'], nama_kab(b['kab']), {v: k for k, v in ROMAWI.items()}.get(rasa.get(b['kab']), '-'), kon))
    jarak_kab = {}
    for kunci, (la, lo) in pusat_kec().items():
        kb = kunci.split('|')[1]
        jarak_kab[kb] = min(jarak_kab.get(kb, 1e9), G.jarak_km(g['lat'], g['lon'], la, lo))
    # dirasakan BMKG tanpa laporan BPBD: hanya yang <= 400 km, terdekat dulu, tabel paling banyak 6 baris (kota jauh seperti Sorong
    # atau Nabire pada gempa Laut Banda tidak memenuhi tabel)
    rasa_dekat = [kab for kab in sorted(rasa, key=lambda kb: jarak_kab.get(kb, 1e9))
                  if kab not in {b['kab'] for b in bpbd} and jarak_kab.get(kab, 1e9) <= 400][:max(0, 6 - len(lapor))]
    if not lapor and not rasa_dekat:   # tanpa laporan apa pun: kab dengan guncangan model tertinggi
        kab = max(maks, key=maks.get)
        lapor.append((kab, nama_kab(kab), '-', 'Belum ada laporan dari BPBD maupun daftar dirasakan BMKG.'))
    sk = {v: k for k, v in ROMAWI.items()}
    rasa_bmkg = {kab: (sk[rasa[kab]], rasa_tempat.get(kab)) for kab in rasa_dekat}
    dilapor = {b['kab'] for b in bpbd} | set(rasa_dekat)
    dampak = {b['kab']: b['dampak'] for b in bpbd if b['dampak'] not in ('', '-')}

    # batas peta: pusat gempa + kab tabel penduduk + kab dilapor, rasio 418:338, lebar minimal 3 derajat
    ada = sorted({band(m) for m in maks.values() if band(m) >= 2}, reverse=True)[:4]
    ambang = (min(ada) + 1) if len(ada) > 1 else (min(ada) if ada else 3)
    # kab dirasakan yang jauh (mis. Sorong untuk gempa Laut Banda) tidak ikut menentukan batas peta
    utama = {k for k, m in maks.items() if band(m) >= ambang} | {k for k in dilapor & set(maks) if jarak_kab.get(k, 1e9) <= 350}
    titik = [(g['lon'], g['lat'])] + [(lo, la) for kunci, (la, lo) in pusat_kec().items()
                                      if kunci.split('|')[1] in utama and G.jarak_km(g['lat'], g['lon'], la, lo) <= 800]
    lo0, lo1 = min(p[0] for p in titik) - .35, max(p[0] for p in titik) + .35
    la0, la1 = min(p[1] for p in titik) - .35, max(p[1] for p in titik) + .35
    # titik label (pusat poligon terbesar) kab yang diwarnai dan nyaris di tepi peta (<= 0,4 derajat) ikut dimasukkan supaya bisa
    # dilabeli (pemilik 20 Nov 2026: kab MMI II yang terlihat di peta ikut dilabeli; Tapanuli Tengah pada gempa Nias). Yang jauh tidak
    # memperlebar peta (Simeulue pada gempa Nias).
    sys.argv = [sys.argv[0]]
    import gempa_khusus
    a0, a1, b0, b1 = lo0, lo1, la0, la1   # uji terhadap batas awal, supaya pelebaran tidak berantai
    for kab, m in maks.items():
        if band(m) < (min(ada) if ada else 3):
            continue
        try:
            lo_, la_ = gempa_khusus.BL.pusat(prov_kab[kab], kab)
        except Exception:
            continue
        if a0 - .4 <= lo_ <= a1 + .4 and b0 - .4 <= la_ <= b1 + .4:
            lo0, lo1, la0, la1 = min(lo0, lo_ - .2), max(lo1, lo_ + .2), min(la0, la_ - .2), max(la1, la_ + .2)
    lebar = max(lo1 - lo0, (la1 - la0) * 418 / 338, 3.0)
    tinggi = lebar * 338 / 418
    clo, cla = (lo0 + lo1) / 2, (la0 + la1) / 2
    ext = (round(clo - lebar / 2, 3), round(clo + lebar / 2, 3), round(cla + tinggi / 2, 3))
    jari = math.hypot(lebar * 111.32 * math.cos(math.radians(g['lat'])), tinggi * 111.32) / 2
    radius = tuple(range(100, int(min(600, jari) // 100 * 100) + 1, 100)) or (100,)

    # judul dan parameter
    m1 = f"{g['m']:.1f}".replace('.', ',')
    target = max(rasa, key=rasa.get) if rasa else max(maks, key=maks.get)
    # judul memakai nama acuan singkat: kata arah di ujung dibuang ("Nias Barat" -> "Nias", pemilik 20 Nov 2026); panel parameter tetap lengkap
    singkat = re.sub(r'(\s+(Barat|Timur|Utara|Selatan|Tengah|Tenggara|Daya|Laut))+$', '', acuan) or acuan
    if singkat != acuan and singkat not in maks:   # hanya bila bentuk singkatnya sendiri nama kab ("Nias" ya, "Maluku" provinsi: tidak)
        singkat = acuan
    tempat = ' '.join(x for x in (f'di {letak}' if letak else 'di', arah, singkat) if x) if arah else f'di {singkat}'
    j1 = f'Gempa [M{m1}] {tempat} mengguncang {target};' if norm(target) != norm(acuan) else f'Gempa [M{m1}] {tempat};'
    if len(j1) - 2 > 66:   # judul 20 pt di 710 pt muat sekitar 66 huruf per baris (gerbang D-17: judul paling banyak 2 baris)
        j1 = f'Gempa [M{m1}] mengguncang {target};'   # letak pusat gempa tetap ada di panel parameter
    aman_tsunami = 'tidak berpotensi' in e['potensi'].lower() or 'dirasakan' in e['potensi'].lower()
    j2 = 'gempa [tidak berpotensi tsunami]' if aman_tsunami else 'gempa [berpotensi tsunami]; ikuti peringatan BMKG'
    t = e['t']
    par = {'waktu': f"{t.day} {BULAN[t.month - 1]} {t.year}, {t:%H.%M}", 'pusat': f'{km} km {arah} {acuan}' if km else acuan,
           'pusat_label': f'Pusat gempa di {letak}' if letak else 'Pusat gempa', 'tsunami': 'Tidak ada' if aman_tsunami else 'Ada'}
    pemantauan = bpbd and all(re.search(r'monitor|pantau', b['kondisi'], re.I) for b in bpbd)
    judul2 = ('penanganan BPBD saat ini berupa [pemantauan situasi]' if pemantauan else 'penanganan BPBD [sedang berjalan]' if bpbd
              else 'laporan penanganan BPBD [belum diterima]')
    kerusakan = any((b['dampak'] not in ('', '-')) or b['angka'] for b in bpbd)
    kab_baris = ([r[0] for r in lapor] + rasa_dekat)[:3]
    kab_sub = [nama_kab(k).replace('Kab. ', 'Kabupaten ') for k in kab_baris]
    sub = (', '.join(kab_sub[:-1]) + ' dan ' + kab_sub[-1] if len(kab_sub) > 1 else kab_sub[0]) + \
        ', Provinsi ' + ' dan '.join(dict.fromkeys(nama_prov.get(prov_kab[k], '') for k in kab_baris))
    return {
        'sini': os.path.join(out, 'kerja-gempa'), 'keluar': out, 'nama': berkas,
        'gempa': g, 'prov': provs, 'judul': (j1, j2), 'par': par, 'ext': ext, 'radius': radius,
        'dilapor': dilapor, 'lapor': lapor, 'tabel_penduduk': False, 'rasa_bmkg': rasa_bmkg, 'dampak': dampak,
        'waktu_utama': (t.year, t.month, t.day, t.hour, t.minute, t.second), 'judul2': judul2,
        'bpbd': {b['kab'] for b in bpbd}, 'penanganan': [(f"BPBD {nama_kab(b['kab'])}", b['kondisi'] or '-') for b in bpbd],
        'kerusakan': kerusakan,
        'judul_dokumen': f'Laporan Khusus Gempa Bumi M{m1} {acuan}', 'subjudul': sub, 'tanggal': t.date(),
        'sumber': f'BMKG {t.day} {BULAN[t.month - 1]} {t.year}; BPBD lewat Pusdalops BNPB; MMI model; penduduk WorldPop 2026',
    }


def main():
    a = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    a.add_argument('--tanggal', default=dt.datetime.now(WIB).date().isoformat())
    a.add_argument('--lokasi', default='')
    a.add_argument('--out', default=os.path.join(SINI, 'cache', 'gempa-bot'))
    a.add_argument('--berkas', default=None)
    a.add_argument('--konfig', action='store_true', help='cetak KONFIG saja')
    x = a.parse_args()
    tgl = dt.date.fromisoformat(x.tanggal)
    berkas = x.berkas or f'Laporan Khusus Gempa {tgl:%d%m%y}'
    c = susun(x.lokasi.strip(), tgl, os.path.abspath(x.out), berkas)
    if x.konfig:
        print(json.dumps({k: (sorted(v) if isinstance(v, set) else v) for k, v in c.items()}, ensure_ascii=False, indent=1, default=str))
        return
    os.makedirs(c['sini'], exist_ok=True)
    json.dump({k: (sorted(v) if isinstance(v, set) else v) for k, v in c.items()}, open(os.path.join(c['sini'], 'konfig.json'), 'w', encoding='utf-8'),
              ensure_ascii=False, indent=1, default=str)
    sys.argv = [sys.argv[0]]   # gempa_khusus membaca --isi dari argv
    import gempa_khusus
    gempa_khusus.bangun(c)
    # daftar kunci angka sistem untuk pagar angka bot (proyek.mjs jalurKunci); kosong seperti banjir_sepekan: tanpa berkas ini draf V2
    # selalu ditolak. Angka gempa (MMI, peluang, penduduk) dihitung mesin; pedoman agen melarang mengubahnya.
    with open(os.path.join(c['keluar'], berkas + '.kunci.json'), 'w', encoding='utf-8') as f:
        json.dump([], f)
    print(os.path.join(c['keluar'], berkas + '.pptx'))


if __name__ == '__main__':
    main()
