"""Isian apa saja yang ditulis Pusdalops untuk setiap jenis bencana, dari laphar dan logbook 2026.

  py data/kajian-bnpb/standar-data-bencana/04-landasan-formulir/urai_isian.py --logbook <folder keluaran logbook_pusdalops.py>

Masukan:
  data/raw/laphar/hari/*.json         laphar 2026 yang sudah diurai (scripts/umum/laphar_arsip.mjs dan .py)
  <logbook>/baris.jsonl               logbook 2026 hasil scripts/data/logbook_pusdalops.py (di luar repo; isinya internal)
  scripts/wa/panduan_resmi.json       ringkasan Panduan Penyusunan Logbook, Laphar, Lapjol Pusdalops 2025
Keluaran: formulir/isian.json (hitungan per kejadian, tanpa nama orang), dibaca buat_excel.py.

Satuan hitung adalah KEJADIAN, bukan baris harian: satu isian dihitung ada bila pernah ditulis pada salah
satu laporan kejadian itu. Laphar dikelompokkan menurut jenis dan judul entri; logbook memakai id_kejadian.
"""
import argparse
import collections
import glob
import json
import os
import re

DI = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(DI, '../../../..'))

JENIS = [  # kunci, nama resmi, kode
    ('banjir', 'Banjir', '101'), ('longsor', 'Tanah longsor', '102'), ('gelombang_pasang', 'Gelombang pasang dan abrasi', '103'),
    ('cuaca', 'Cuaca ekstrem', '104'), ('kekeringan', 'Kekeringan', '105'), ('karhutla', 'Kebakaran hutan dan lahan', '106'),
    ('gempabumi', 'Gempa bumi', '107'), ('tsunami', 'Tsunami', '108'), ('gunungapi', 'Erupsi gunung api', '109'),
    ('kebakaran_permukiman', 'Kebakaran gedung dan permukiman', '202'), ('kegagalan_teknologi', 'Gagal teknologi', '203'),
    ('konflik_sosial', 'Konflik sosial', '301'),
]
KUNCI = [j[0] for j in JENIS]

def fas(x):
    """Benda yang sering muncul sebagai nama tempat (SD X, Pasar Y): dihitung hanya bila didahului angka
    atau diikuti kata kerusakan."""
    return (r'(\d+\s*(unit|buah|bh)?\s*(' + x + r'))|((' + x + r')[^.;•\n]{0,30}'
            r'(rusak|terdampak|terendam|terbakar|roboh|ambruk|hanyut|tertimbun|putus|\bRB\b|\bRS\b|\bRR\b))')


# katalog isian: (kelompok, isian, satuan yang lazim, pola)
K = [
    # korban dan pengungsian
    ('Korban', 'Meninggal', 'orang', r'meninggal|\bMD\b|tewas|wafat'),
    ('Korban', 'Hilang', 'orang', r'\bhilang\b|dalam pencarian|belum ditemukan'),
    ('Korban', 'Luka-luka', 'orang', r'luka|\bLB\b|\bLR\b|dirawat|cedera'),
    ('Korban', 'Terdampak (KK)', 'KK', r'\bKK\b[^.;•\n]{0,25}(terdampak|menderita)|(terdampak|menderita)[^.;•\n]{0,15}\bKK\b'),
    ('Korban', 'Terdampak (jiwa)', 'jiwa', r'(jiwa|orang)[^.;•\n]{0,20}(terdampak|menderita)|(terdampak|menderita)[^.;•\n]{0,15}(jiwa|orang)'),
    ('Korban', 'Mengungsi', 'KK, jiwa', r'mengungsi|pengungsi|dievakuasi|evakuasi warga'),
    ('Korban', 'Terancam', 'KK, jiwa, unit', r'terancam'),
    ('Korban', 'Kelompok rentan (balita, lansia, ibu hamil, disabilitas)', 'jiwa', r'balita|lansia|ibu hamil|disabilitas|bayi|difabel'),
    ('Korban', 'Gangguan kesehatan (ISPA, diare)', 'orang', r'\bISPA\b|diare|sesak napas|gangguan pernapasan|gatal'),
    # rumah
    ('Rumah', 'Rumah rusak berat', 'unit', r'rusak berat|\bRB\b|roboh|rata dengan tanah|hancur'),
    ('Rumah', 'Rumah rusak sedang', 'unit', r'rusak sedang|\bRS\b'),
    ('Rumah', 'Rumah rusak ringan', 'unit', r'rusak ringan|\bRR\b'),
    ('Rumah', 'Rumah terendam', 'unit', r'terendam|tergenang'),
    ('Rumah', 'Rumah terdampak (tanpa tingkat kerusakan)', 'unit', r'rumah[^.;•\n]{0,20}terdampak|unit rumah'),
    ('Rumah', 'Rumah hanyut atau tertimbun', 'unit', r'hanyut|tertimbun|terseret'),
    ('Rumah', 'Rumah terbakar', 'unit', r'rumah[^.;•\n]{0,25}terbakar|terbakar[^.;•\n]{0,15}rumah'),
    # fasilitas dan prasarana
    ('Fasilitas', 'Satuan pendidikan (sekolah)', 'unit', fas(r'sekolah|\bSD\b|\bSMP\b|\bSMA\b|madrasah|pesantren|satuan pendidikan|sarana pendidikan|PAUD')),
    ('Fasilitas', 'Rumah ibadah', 'unit', fas(r'masjid|musholla|mushola|musala|gereja|vihara|rumah ibadah|tempat ibadah|sarana ibadah|langgar|surau')),
    ('Fasilitas', 'Fasilitas kesehatan', 'unit', fas(r'puskesmas|rumah sakit|\bRSUD\b|posyandu|pustu|polindes|fasilitas kesehatan|fasyankes')),
    ('Fasilitas', 'Kantor', 'unit', fas(r'kantor|balai desa|gedung|perkantoran')),
    ('Fasilitas', 'Pasar, kios, toko', 'unit', fas(r'pasar|kios|toko|warung|ruko')),
    ('Prasarana', 'Jalan', 'meter, km, titik', fas(r'\bjalan\b|akses jalan|ruas jalan')),
    ('Prasarana', 'Jembatan', 'unit', r'jembatan'),
    ('Prasarana', 'Tanggul, talud, irigasi', 'meter, titik', r'tanggul|talud|plengsengan|irigasi|bronjong|bendung'),
    ('Prasarana', 'Listrik', 'tiang, pelanggan', r'listrik|\bPLN\b|tiang listrik|gardu'),
    ('Prasarana', 'Air bersih', 'liter, sumber', r'air bersih|\bPDAM\b|\bPAM\b|sumur|droping air|dropping air|krisis air|mata air'),
    ('Prasarana', 'Telekomunikasi', 'unit', r'telekomunikasi|sinyal|\bBTS\b|jaringan komunikasi'),
    # ekonomi dan lahan
    ('Lahan dan ekonomi', 'Sawah', 'ha', r'sawah|padi|tanaman pangan'),
    ('Lahan dan ekonomi', 'Puso (gagal panen)', 'ha', r'\bpuso\b|gagal panen'),
    ('Lahan dan ekonomi', 'Kebun, ladang', 'ha', r'kebun|ladang|perkebunan|tegalan|sawit|karet'),
    ('Lahan dan ekonomi', 'Luas hutan atau lahan', 'ha', r'\d+[.,]?\d*\s?(ha|hektar)[^.;•\n]{0,25}(hutan|lahan)|(hutan|lahan)[^.;•\n]{0,25}\d+[.,]?\d*\s?(ha|hektar)'),
    ('Lahan dan ekonomi', 'Tambak, kolam', 'ha, unit', r'tambak|kolam|keramba'),
    ('Lahan dan ekonomi', 'Ternak', 'ekor', r'ternak|sapi|kambing|ayam|ekor'),
    ('Lahan dan ekonomi', 'Perahu, kapal', 'unit', fas(r'perahu|kapal|longboat|speedboat')),
    ('Lahan dan ekonomi', 'Kendaraan', 'unit', fas(r'kendaraan|mobil|sepeda motor|truk')),
    ('Lahan dan ekonomi', 'Taksiran kerugian (rupiah)', 'Rp', r'\bRp\.?\s?\d|rupiah|kerugian ditaksir|taksiran kerugian'),
    # ancaman: ukuran fisik
    ('Ancaman', 'Tinggi muka air atau genangan', 'cm, m', r'\bTMA\b|ketinggian air|tinggi air|genangan[^.;•\n]{0,30}\d+\s?(cm|m\b|meter)|\d+\s?-\s?\d+\s?cm'),
    ('Ancaman', 'Debit atau status sungai, pintu air', 'm3/detik, status', r'debit|meluap|luapan|pos duga|pintu air|status siaga (1|2|3|4|i{1,3}|iv)\b'),
    ('Ancaman', 'Curah hujan atau intensitas hujan', 'mm, kategori', r'hujan (dengan )?intensitas|curah hujan|hujan (lebat|deras|sedang|ringan)'),
    ('Ancaman', 'Luas genangan atau sebaran', 'ha, desa', r'luas genangan|sebaran genangan'),
    ('Ancaman', 'Dimensi (panjang, lebar, tinggi, volume)', 'm, m3', r'(panjang|lebar|tinggi|kedalaman)\s*(±|\+/-|:|sekitar)?\s*\d+[.,]?\d*\s?(m|meter)\b|volume|kubik|\bm3\b|m³'),
    ('Ancaman', 'Material atau tanah bergerak, retakan', 'teks', r'material|retakan|pergerakan tanah|gerakan tanah|amblas|ambles'),
    ('Ancaman', 'Kecepatan angin', 'km/jam, knot', r'kecepatan angin|knot|km/jam'),
    ('Ancaman', 'Pohon tumbang', 'batang, titik', r'pohon[^.;•\n]{0,20}tumbang|tumbang[^.;•\n]{0,10}pohon'),
    ('Ancaman', 'Atap rusak atau terbang', 'unit', r'atap'),
    ('Ancaman', 'Tinggi gelombang', 'm', r'tinggi gelombang|gelombang (setinggi|tinggi)\s*±?\s*\d|gelombang[^.;•\n]{0,15}\d+([.,]\d+)?\s?-?\s?\d*\s?(m\b|meter)'),
    ('Ancaman', 'Pasang atau rob, abrasi garis pantai', 'm, teks', r'\brob\b|air pasang|pasang (laut|tinggi|naik|surut)|abrasi|garis pantai'),
    ('Ancaman', 'Magnitudo', 'M', r'magnitudo|\bM\s?=?\s?\d[.,]\d|\b\d[.,]\d\s?SR\b'),
    ('Ancaman', 'Kedalaman dan pusat gempa', 'km, koordinat', r'kedalaman \d+\s?km|pusat gempa|episenter|\d+[.,]\d+\s?(LU|LS)\b'),
    ('Ancaman', 'Intensitas guncangan (MMI) atau dirasakan', 'skala', r'\bMMI\b|skala (intensitas|mmi)|dirasakan|guncangan'),
    ('Ancaman', 'Gempa susulan', 'kali', r'gempa (bumi )?susulan|gempabumi susulan'),
    ('Ancaman', 'Hari tanpa hujan, kemarau', 'hari', r'hari tanpa hujan|\bHTH\b|kemarau|musim kering'),
    ('Ancaman', 'Krisis air bersih dan distribusi air', 'liter, desa, KK', r'krisis air|kekurangan air|droping air|dropping air|distribusi air bersih|bantuan air bersih|air bersih[^.;•\n]{0,20}liter'),
    ('Ancaman', 'Luas terbakar', 'ha', r'luas[^.;•\n]{0,25}(terbakar|kebakaran)|terbakar[^.;•\n]{0,20}\d+[.,]?\d*\s?(ha|hektar)|\d+[.,]?\d*\s?(ha|hektar)[^.;•\n]{0,20}terbakar'),
    ('Ancaman', 'Hotspot atau titik api', 'titik', r'hotspot|hot spot|titik panas|titik api|firespot'),
    ('Ancaman', 'Jenis lahan atau gambut', 'teks', r'gambut|tanah mineral|semak|belukar|ilalang|alang-alang'),
    ('Ancaman', 'Status api (padam, dikendalikan, aktif)', 'pilihan', r'api[^.;•\n]{0,30}(padam|menyala|dikendalikan|terkendali)|dipadamkan|pemadaman|pendinginan'),
    ('Ancaman', 'Asap, kualitas udara, jarak pandang', 'ISPU, PM2,5, m', r'asap|\bISPU\b|PM ?2[.,]5|jarak pandang|kualitas udara'),
    ('Ancaman', 'Level atau status gunung api', 'level', r'level (i|ii|iii|iv|1|2|3|4)\b|status gunung|gunung[^.;•\n]{0,30}(normal|waspada|siaga|awas)'),
    ('Ancaman', 'Kolom abu, hujan abu', 'm, mm', r'kolom abu|abu vulkanik|hujan abu|tinggi kolom'),
    ('Ancaman', 'Awan panas, lahar, radius bahaya', 'km', r'awan panas|lahar|guguran lava|radius (bahaya|aman|\d+\s?km)'),
    ('Ancaman', 'Penyebab kebakaran atau ledakan', 'teks', r'korsleting|arus pendek|kompor|lilin|tabung gas|ledakan|meledak|bocor'),
    # penanganan
    ('Penanganan', 'Status keadaan darurat (SK)', 'nomor, TMT', r'status (siaga|tanggap|transisi)|keputusan (bupati|gubernur|wali|walikota)|\bSK\b|\bTMT\b'),
    ('Penanganan', 'Pos komando, posko', 'lokasi', r'posko|pos komando|poskotis|posko utama'),
    ('Penanganan', 'Dapur umum', 'unit', r'dapur umum'),
    ('Penanganan', 'Distribusi logistik', 'paket, jenis', r'logistik|sembako|paket|makanan siap saji|bantuan'),
    ('Penanganan', 'Alat berat', 'unit', r'alat berat|ekskavator|excavator|backhoe|loader|dozer'),
    ('Penanganan', 'Pompa air', 'unit', r'pompa'),
    ('Penanganan', 'Operasi udara (bom air, patroli udara, OMC)', 'sorti, unit', r'water bomb|bom air|helikopter|heli\b|sorti|patroli udara|\bOMC\b|modifikasi cuaca'),
    ('Penanganan', 'Personel dan unsur yang terlibat', 'orang, instansi', r'personel|personil|unsur|\bTNI\b|POLRI|Basarnas|relawan|Manggala|Damkar|PMI'),
    ('Penanganan', 'Pencarian dan pertolongan', 'teks', r'pencarian|\bSAR\b|pertolongan'),
    ('Kebutuhan', 'Kebutuhan mendesak', 'jenis, jumlah', r'kebutuhan|dibutuhkan|membutuhkan'),
    ('Kebutuhan', 'Kendala lapangan', 'teks', r'kendala|hambatan|terkendala|sulit dijangkau|akses terputus'),
]
POLA = [(a, b, c, re.compile(p, re.I)) for a, b, c, p in K]

LAPHAR_MEDAN = [('update', 'Waktu pengkinian'), ('kronologi', 'Kronologi'), ('lokasi_rinci', 'Lokasi rinci (kecamatan, desa)'),
                ('korban', 'Korban jiwa'), ('pengungsi', 'Pengungsi (medan terpisah)'), ('kerugian', 'Kerugian materiil'),
                ('upaya', 'Upaya penanganan'), ('kebutuhan', 'Kebutuhan mendesak'), ('kendala', 'Kendala atau hambatan'),
                ('terlibat', 'Unsur yang terlibat'), ('peralatan', 'Peralatan'), ('status_sk', 'Status keadaan darurat (SK)'),
                ('rekomendasi', 'Rekomendasi atau saran'), ('kondisi', 'Kondisi mutakhir'), ('dokumentasi', 'Dokumentasi'),
                ('sumber', 'Sumber laporan')]
LOGBOOK_MEDAN = [('tgl_kejadian', 'Tanggal kejadian'), ('jam_kejadian', 'Jam kejadian'), ('kecamatan', 'Kecamatan'), ('desa', 'Desa'),
                 ('dampak_teks', 'Dampak (teks)'), ('kronologi', 'Kronologi'), ('upaya', 'Upaya'), ('status_sk', 'Status keadaan darurat (SK)'),
                 ('kondisi', 'Kondisi mutakhir'), ('terlibat', 'Unsur yang terlibat'), ('kebutuhan', 'Kebutuhan'), ('kendala', 'Kendala'),
                 ('peralatan', 'Peralatan'), ('rekomendasi', 'Rekomendasi'), ('sumber_instansi', 'Sumber (instansi)')]

PRIBADI = re.compile(r'\b(Bpk|Bapak|Ibu|Sdr|Sdri|An\.|a\.n\.)\b|\(\s*\d{1,2}\s*(th|thn|tahun)\s*\)|\+?62\d|08\d{8,}|@', re.I)


def jenis_laphar(k):
    j = k.get('jenis') or 'lainnya'
    t = (k.get('judul') or '').lower()
    if 'tsunami' in t:
        return 'tsunami'
    if j in ('cuaca', 'lainnya') and re.search(r'gelombang|rob\b|abrasi', t):
        return 'gelombang_pasang'
    if j == 'lainnya' and 'kebakaran' in t and 'hutan' not in t:
        return 'kebakaran_permukiman'
    return j


def cuplik(teks, m):
    a = max(0, teks.rfind('•', 0, m.start()) + 1, teks.rfind('\n', 0, m.start()) + 1)
    b = min([x for x in (teks.find('•', m.end()), teks.find('\n', m.end()), len(teks)) if x >= 0])
    s = ' '.join(teks[a:b].split()).strip(' -;,')
    if len(s) > 110:
        s = s[:107].rsplit(' ', 1)[0] + '…'
    return s


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--logbook', required=True, nargs='+', help='satu atau lebih folder keluaran logbook_pusdalops.py (per tahun)')
    ap.add_argument('--laphar', nargs='+', default=[os.path.join(REPO, 'data/raw/laphar')],
                    help='satu atau lebih folder keluaran laphar_arsip.mjs (berisi hari/*.json)')
    a = ap.parse_args()

    # laphar: kelompokkan per (tahun, jenis, judul); judul yang sama pada tahun berbeda adalah kejadian berbeda
    lap = collections.defaultdict(list)
    medan_lap = collections.defaultdict(collections.Counter)
    n_entri_lap = collections.Counter()
    berkas_lap = sorted(f for d in a.laphar for f in glob.glob(os.path.join(d, 'hari', '*.json')))
    hasil_periode = {'laphar': [os.path.basename(berkas_lap[0])[:10], os.path.basename(berkas_lap[-1])[:10], len(berkas_lap)] if berkas_lap else None}
    for f in berkas_lap:
        tahun = os.path.basename(f)[:4]
        for k in json.load(open(f, encoding='utf-8'))['kejadian']:
            j = jenis_laphar(k)
            n_entri_lap[j] += 1
            for m, _ in LAPHAR_MEDAN:
                if (k.get(m) or '').strip() and k.get(m).strip() not in ('-', '–'):
                    medan_lap[j][m] += 1
            judul = re.sub(r'\s+', ' ', (k.get('judul') or '').lower())
            lap[(j, tahun + ' ' + judul)].append(' • '.join(str(k.get(x) or '') for x in ('korban', 'pengungsi', 'kerugian', 'kronologi', 'kondisi', 'upaya', 'kebutuhan', 'kendala', 'terlibat', 'peralatan', 'dampak')) + ' §SK§ ' + str(k.get('status_sk') or ''))
    # logbook: kelompokkan per id_kejadian
    lb = collections.defaultdict(list)
    medan_lb = collections.defaultdict(collections.Counter)
    n_entri_lb = collections.Counter()
    tgl_lb = []
    for l in (baris for d in a.logbook for baris in open(os.path.join(d, 'baris.jsonl'), encoding='utf-8')):
        r = json.loads(l)
        tgl_lb.append(r.get('tgl_logbook') or '')
        j = r.get('jenis') or 'lainnya'
        n_entri_lb[j] += 1
        for m, _ in LOGBOOK_MEDAN:
            v = r.get(m)
            if v and v != '-' and v != []:
                medan_lb[j][m] += 1
        lb[(j, r.get('id_kejadian') or f"{r['tgl_logbook']}-{r['no']}")].append(' • '.join(str(r.get(x) or '') for x in ('dampak_teks', 'kronologi', 'kondisi', 'upaya', 'kebutuhan', 'kendala', 'terlibat', 'peralatan', 'catatan')) + ' §SK§ ' + str(r.get('status_sk') or ''))

    tgl_lb = sorted(t for t in tgl_lb if t)
    hasil_periode['logbook'] = [tgl_lb[0], tgl_lb[-1], len(set(tgl_lb))] if tgl_lb else None
    hasil = {'jenis': JENIS, 'katalog': [k[:3] for k in K], 'sumber': {}, 'medan': {}, 'periode': hasil_periode}
    for nama, kel, medan, n_entri, daftar_medan in (('laphar', lap, medan_lap, n_entri_lap, LAPHAR_MEDAN), ('logbook', lb, medan_lb, n_entri_lb, LOGBOOK_MEDAN)):
        n_kej = collections.Counter(j for j, _ in kel)
        ada = {j: collections.Counter() for j in KUNCI}
        contoh = {j: {} for j in KUNCI}
        for (j, _), teks_list in kel.items():
            if j not in ada:
                continue
            # teks SK hanya untuk isian status darurat: nama SK menyebut banyak jenis ("Banjir, Longsor ... dan Rob")
            biasa = ' • '.join(t.split(' §SK§ ')[0] for t in teks_list)
            semua = ' • '.join(t.replace(' §SK§ ', ' • ') for t in teks_list)
            for kelompok, isian, satuan, p in POLA:
                teks = semua if isian == 'Status keadaan darurat (SK)' else biasa
                m = p.search(teks)
                if m:
                    ada[j][isian] += 1
                    c = cuplik(teks, m)
                    if nama == 'laphar' and c and not PRIBADI.search(c) and re.search(r'\d', c):   # logbook internal: tanpa contoh
                        lama = contoh[j].get(isian)
                        if not lama or (len(c) < len(lama) and len(c) > 25):
                            contoh[j][isian] = c
        hasil['sumber'][nama] = {'n_kejadian': {j: n_kej[j] for j in KUNCI}, 'n_entri': {j: n_entri[j] for j in KUNCI},
                                  'ada': {j: dict(ada[j]) for j in KUNCI}, 'contoh': contoh}
        hasil['medan'][nama] = {'daftar': daftar_medan, 'isi': {j: dict(medan[j]) for j in KUNCI}}
    json.dump(hasil, open(os.path.join(DI, 'isian.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    for nama in ('laphar', 'logbook'):
        print(nama, hasil['sumber'][nama]['n_kejadian'])


if __name__ == '__main__':
    main()
