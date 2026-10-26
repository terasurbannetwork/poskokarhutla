#!/usr/bin/env python3
"""Pembaca rujukan dialek naskah kajian BNPB (bangun/NASKAH-SPEK.md). Stdlib saja.

    from naskah import Konteks, baca, nomori
    k = Konteks()                          # tema.json, data/angka.json, pustaka.json
    n = baca('naskah/air/bab-06.md', k)    # dict: meta, blok, catatan_kaki
    label = nomori([n, ...])               # id rujukan -> 'Gambar 6.1', 'Tabel A.2', '03'
    k.manifest                             # tiap angka yang disuntik (gerbang D-22)
    k.daftar_pustaka()                     # entri APA 7 yang dikutip, urut abjad

Galat sintaks atau kontrak -> NaskahGalat('berkas:baris: pesan'); berhenti di galat pertama.
`python3 naskah.py` menjalankan uji diri atas contoh di NASKAH-SPEK.md.
"""
import csv
import json
import re
import sys
from decimal import ROUND_HALF_UP, Decimal
from math import floor, log10
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from tema import AKAR, SKILL, warna  # noqa: E402  AKAR = akar proyek (DECK_AKAR)
BULAN = 'Januari Februari Maret April Mei Juni Juli Agustus September Oktober November Desember'.split()
DILARANG = {'\u2014': 'em dash', '\u00b7': 'titik tengah', '\u25b2': 'segitiga (bukan glif Roboto)',
            '\u25bc': 'segitiga (bukan glif Roboto)', '\u2192': 'panah (bukan glif Roboto)',
            '\u25e6': 'butir bukan Roboto', '\u25aa': 'butir bukan Roboto', '\u2713': 'centang bukan Roboto'}
RE_EMOJI = re.compile('[\U0001F300-\U0001FAFF\u2600-\u27bf]')

RE_BUKA = re.compile(r'^(:{3,})\s*([a-z][a-z-]*)\s*(?:\{#([a-z]+:[a-z0-9-]+)\})?\s*$')
RE_TUTUP = re.compile(r'^:{3,}\s*$')
RE_JUDUL = re.compile(r'^(#{1,4})\s+(.+?)\s*(?:\{#([a-z]+:[a-z0-9-]+)\})?\s*$')
RE_BUTIR = re.compile(r'^( *)(-|\d+\.)\s+(.*)$')
RE_ATR = re.compile(r'^([a-z_]+):\s?(.*)$')
RE_KAKI_DEF = re.compile(r'^\[\^([a-z0-9-]+)\]:\s*(.+)$')
RE_LABEL = re.compile(r'^\*\*([^*]+):\*\*\s*')
RE_INLINE = re.compile(
    r'\{\{angka:(?P<kunci>[a-z0-9_.-]+)(?P<opsi>(?:\|[^}]*)?)\}\}'
    r'|\{\{(?P<asing>[^}]*)\}\}'
    r'|\[\^(?P<kaki>[a-z0-9-]+)\]'
    r'|\[(?P<kutip>-?@[^\]]+)\]'
    r'|(?<![\w@.])@(?P<pref>bab|sub|gbr|tbl|lamp|rek):(?P<rid>[a-z0-9-]+)'
    r'|(?<![\w@.])@(?P<naratif>[a-z0-9][a-z0-9-]*)')
ESC = {'\\*': '\ue001', '\\[': '\ue002', '\\]': '\ue003', '\\{': '\ue004', '\\}': '\ue005', '\\@': '\ue006', '\\|': '\ue007'}
UNESC = {v: k[1] for k, v in ESC.items()}

NOMOR = {'gambar': 'Gambar', 'tabel': 'Tabel', 'skenario': 'Tabel', 'garis-waktu': 'Tabel',
         'matriks-rekomendasi': 'Tabel', 'matriks-lembaga': 'Tabel', 'matriks-jenis': 'Tabel'}
# nama: (atribut wajib, atribut opsional)
DIREKTIF = {
    'gambar': ('berkas judul jenis', 'sumber keyakinan lebar data_per catatan pengarang lisensi url potong'),
    'tabel': ('judul sumber keyakinan', 'csv kolom saring urut batas angka total peringkat sorot data_per catatan grup'),
    'kartu-angka': ('pil sumber keyakinan', 'nada'),
    'temuan': ('judul sifat', ''),
    'keputusan': ('', 'judul'),
    'koreksi': ('', ''),
    'catatan': ('', ''),
    'ringkasan-bab': ('', ''),
    'program': ('nama lokasi lembaga periode dampak sumber keyakinan', 'status jenis'),
    'skenario': ('jenis judul dasar sumber lembaga', 'kemungkinan peta analog kaki data_per keyakinan'),
    'kerusakan': ('', ''), 'kebijakan': ('', ''), 'kepekaan': ('', ''), 'respons': ('', ''),
    'pemulihan': ('', ''), 'pemicu': ('', ''), 'mandat': ('', ''),
    'garis-waktu': ('judul sumber', 'musim keyakinan'),
    'matriks-rekomendasi': ('judul kelompok sumber', 'keyakinan'),
    'rek': ('langkah jenis status unit kl waktu indikator dasar', 'program butuh membuka'),
    'matriks-lembaga': ('judul sumber', 'keyakinan'),
    'matriks-jenis': ('judul sumber', 'keyakinan'),
}
INDUK = {'rek': 'matriks-rekomendasi', **{a: 'skenario' for a in
         ('kerusakan', 'kebijakan', 'kepekaan', 'respons', 'pemulihan', 'pemicu', 'mandat')}}
ID_PREFIKS = {'gambar': 'gbr', 'rek': 'rek', **{n: 'tbl' for n, v in NOMOR.items() if v == 'Tabel'}}
KODE = set('berkas jenis keyakinan lebar sifat status kelompok waktu nada csv kolom saring urut batas angka grup '
           'total peringkat sorot musim peta lisensi url butuh membuka kemungkinan'.split())
KOLOM = {
    'kartu-angka': ['nilai', 'satuan', 'label', 'ikon', 'warna'],
    'garis-waktu': ['fase', 'aksi', 'rek', 'lembaga'],
    'matriks-lembaga': ['lembaga', 'prabencana', 'tanggap darurat', 'pascabencana'],
    'matriks-jenis': ['jenis', 'prabencana', 'tanggap darurat', 'pascabencana'],
    'kerusakan/a': ['besaran', 'rendah', 'tinggi', 'keyakinan', 'sumber'],
    'kerusakan/b': ['indikator', 'nilai', 'keyakinan', 'sumber'],
    'kepekaan': ['tuas', 'nilai dasar', 'nilai digeser', 'korban jiwa', 'kerugian materiil'],
}
# varian c (sosial) = kartu analog berangka seperti b, ditambah batas mandat dan kemungkinan "tidak dinilai" (KERANGKA prinsip 9)
ANAK_SKENARIO = {'a': ('kerusakan kebijakan kepekaan respons pemulihan', 'kemungkinan peta kaki'),
                 'b': ('kerusakan respons pemulihan', 'analog'),
                 'c': ('kerusakan mandat respons pemulihan', 'analog kemungkinan')}
LABEL_WAJIB = {'temuan': ['Bukti', 'Dampak', 'Pembuka'], 'ringkasan-bab': ['Temuan', 'Angka kunci', 'Rekomendasi']}


class NaskahGalat(Exception):
    pass


# ---------------------------------------------------------------- format angka id-ID (PEDOMAN C4)

def fmt_id(x, d=None):
    """Titik ribuan, koma desimal, setengah ke atas; tidak pernah -0."""
    x = float(x)
    if d is None:
        d = 0 if x == int(x) else 1
    v = Decimal(repr(x)).quantize(Decimal(1).scaleb(-d), rounding=ROUND_HALF_UP)
    if v == 0:
        v = abs(v)
    return f'{v:,.{d}f}'.translate(str.maketrans(',.', '.,'))


def dua_bermakna(x):
    """(nilai dibulatkan ke 2 angka bermakna, jumlah desimal yang perlu)."""
    if x == 0:
        return 0.0, 0
    e = floor(log10(abs(x))) - 1
    v = Decimal(repr(float(x))).scaleb(-e).quantize(Decimal(1), rounding=ROUND_HALF_UP).scaleb(e)
    return float(v), max(0, -e)


def _skala(x):
    for b, kata in ((10 ** 12, 'triliun'), (10 ** 9, 'miliar'), (10 ** 6, 'juta')):
        if abs(x) >= b:
            return b, kata
    return 1, ''


def format_angka(nilai, rendah, tinggi, satuan, keyakinan, opsi):
    """Satu angka atau rentang menjadi teks tampil. opsi = {'fmt': '1', 'flag': {...}}."""
    flag, f = opsi['flag'], opsi.get('fmt')
    if 'teks' in flag:
        return str(nilai)
    if 'tahun' in flag:
        return str(int(nilai))
    batas = 'rendah' if 'rendah' in flag else 'tinggi' if 'tinggi' in flag else None
    rentang = ('rentang' in flag or nilai is None) and not batas
    vals = [rendah if batas == 'rendah' else tinggi] if batas else [rendah, tinggi] if rentang else [nilai]
    if any(v is None for v in vals):
        raise ValueError('rentang atau batas diminta tetapi registri tidak punya rendah dan tinggi')
    kata_arah = ''
    if 'arah' in flag:
        if vals[-1] == 0:
            return 'tetap'
        kata_arah = 'naik ' if vals[-1] > 0 else 'turun '
        vals = [abs(v) for v in vals]
    est = keyakinan == 'estimasi-model'
    d = int(f) if f and f.isdigit() else None
    if est:
        pas = [dua_bermakna(v) for v in vals]
        vals, d = [p[0] for p in pas], max(p[1] for p in pas)
    jenis = 'rupiah' if 'rupiah' in flag else 'ringkas' if 'ringkas' in flag else None
    b, kata = _skala(max(abs(v) for v in vals)) if jenis else (1, '')
    if b > 1:
        d = 0 if all(fmt_id(v / b, 1).endswith(',0') for v in vals) else 1
    s = '\u2013'.join(fmt_id(v / b, d) for v in vals) + (' ' + kata if kata else '')
    if jenis == 'rupiah':
        s = 'Rp' + s
    if 'persen' in flag or ('satuan' in flag and satuan == '%'):
        s += '%'
    elif 'satuan' in flag and satuan and jenis != 'rupiah':
        s += ' ' + satuan
    s = kata_arah + s
    return 'sekitar ' + s if est and not rentang and not batas else s


# ---------------------------------------------------------------- registri angka dan jalur JSON

RE_SEG = re.compile(r'\[([^\]]*)\]|([^.\[\]]+)')


def ikuti(data, jalur):
    """kunci.kunci, [kunci.bertitik], [3], [kolom=nilai,kolom2=nilai2] (tepat satu baris)."""
    o = induk = data
    for m in RE_SEG.finditer(jalur):
        br, kunci = m.groups()
        if kunci is not None:
            induk, o = o, o[kunci]
        elif br.isdigit():
            induk, o = o, o[int(br)]
        elif '=' in br:
            syarat = dict(p.split('=', 1) for p in br.split(','))
            if isinstance(o, dict) and 'kolom' in o and 'baris' in o:
                baris = [dict(zip(o['kolom'], r)) for r in o['baris']]
            elif isinstance(o, list) and o and isinstance(o[0], list) and isinstance(induk, dict) and 'kolom' in induk:
                baris = [dict(zip(induk['kolom'], r)) for r in o]  # tabel {kolom, baris}: ...baris[k=v]
            elif isinstance(o, list):
                baris = o
            else:
                raise KeyError(f'[{br}] dipakai pada objek yang bukan tabel')
            cocok = [r for r in baris if all(str(r.get(k)) == v for k, v in syarat.items())]
            if len(cocok) != 1:
                raise KeyError(f'[{br}] cocok {len(cocok)} baris, harus tepat 1')
            induk, o = o, cocok[0]
        else:
            induk, o = o, o[br]
    if isinstance(o, str):
        try:
            return float(o)
        except ValueError:
            return o
    return o


class Konteks:
    """Tema, registri angka, pustaka, dan keadaan lintas berkas satu dokumen."""

    def __init__(self, akar=AKAR, angka=None):
        self.akar = Path(akar)
        self.tema = json.loads((self.akar / 'tema.json').read_text(encoding='utf-8'))
        self.angka = angka if angka is not None else json.loads(
            (self.akar / 'data/angka.json').read_text(encoding='utf-8'))['angka']
        self.pustaka = {p['id']: p for p in json.loads((self.akar / 'pustaka.json').read_text(encoding='utf-8'))}
        self.manifest, self.dikutip, self._kenal, self._berkas = [], [], set(), {}
        self._akhiran = self._akhiran_tahun()

    # -- angka
    def _muat(self, rel):
        if rel not in self._berkas:
            p = self.akar / 'data' / rel
            if p.suffix == '.csv':
                with p.open(encoding='utf-8') as f:
                    self._berkas[rel] = list(csv.DictReader(f))
            else:
                self._berkas[rel] = json.loads(p.read_text(encoding='utf-8'))
        return self._berkas[rel]

    def nilai(self, kunci):
        """(nilai, rendah, tinggi, entri) dari registri."""
        e = self.angka.get(kunci)
        if e is None:
            raise KeyError(f'kunci angka "{kunci}" tidak ada di data/angka.json')
        for w in ('keyakinan', 'sumber', 'satuan'):
            if w not in e:
                raise KeyError(f'entri "{kunci}" tanpa {w}')
        if 'berkas' in e:
            data = self._muat(e['berkas'])
            got = [ikuti(data, e[j]) if j in e else None for j in ('jalur', 'jalur_rendah', 'jalur_tinggi')]
        elif 'pustaka' in e:
            if e['pustaka'].split(',')[0] not in self.pustaka:
                raise KeyError(f'entri "{kunci}": pustaka "{e["pustaka"]}" tidak ada di pustaka.json')
            got = [e.get('nilai'), e.get('rendah'), e.get('tinggi')]
        else:
            raise KeyError(f'entri "{kunci}" tanpa berkas+jalur atau nilai+pustaka')
        if got[0] is None and None in got[1:]:
            raise KeyError(f'entri "{kunci}" tanpa nilai maupun rentang')
        kali = e.get('kali', 1)
        got = [round(v * kali, 10) if isinstance(v, (int, float)) and kali != 1 else v for v in got]
        return (*got, e)

    def suntik(self, kunci, opsi_teks, asal, kedalaman=0):
        nilai, rendah, tinggi, e = self.nilai(kunci)
        opsi = {'flag': set()}
        for o in filter(None, opsi_teks.split('|')):
            k, sep, v = o.partition('=')
            if sep:
                opsi[k.strip()] = v.strip()
            else:
                opsi['flag'].add(k.strip())
        tak_dikenal = opsi['flag'] - {'teks', 'tahun', 'rentang', 'rendah', 'tinggi', 'arah', 'persen', 'ringkas',
                                      'rupiah', 'satuan'}
        if tak_dikenal or set(opsi) - {'flag', 'fmt'}:
            raise KeyError(f'opsi token tidak dikenal: {sorted(tak_dikenal) or sorted(set(opsi) - {"flag", "fmt"})}')
        kyk = e['keyakinan'].split(';')[0].strip()
        if kyk not in self.tema['kosakata']['keyakinan']:
            raise KeyError(f'entri "{kunci}": keyakinan "{kyk}" bukan salah satu dari lima label (tema.json kosakata.keyakinan)')
        tampil = format_angka(nilai, rendah, tinggi, e['satuan'], kyk, opsi)
        if 'teks' in opsi['flag'] and '{{angka:' in tampil and kedalaman == 0:
            tampil = RE_INLINE.sub(lambda m: self.suntik(m['kunci'], m['opsi'], asal, 1) if m['kunci'] else m[0], tampil)
        self.manifest.append({'kunci': kunci, 'opsi': opsi_teks, 'tampil': tampil, 'nilai': nilai,
                              'rendah': rendah, 'tinggi': tinggi, 'keyakinan': e['keyakinan'],
                              'sumber': e['sumber'], 'naskah': asal})
        return tampil

    # -- pustaka APA 7
    def _nama(self, item):
        a = item.get('author') or [{'literal': item.get('publisher', '')}]
        if all('literal' in x for x in a):  # lembaga; penulis bernama tunggal (Radhika, Surono) masuk daftar perorangan
            return a[0]['literal'], a[0].get('singkatan')
        fam = [x.get('family') or x['literal'] for x in a]
        return (fam[0] if len(fam) == 1 else f'{fam[0]} & {fam[1]}' if len(fam) == 2 else f'{fam[0]} dkk.'), None

    def _akhiran_tahun(self):
        grup = {}
        for k, it in self.pustaka.items():
            grup.setdefault((self._nama(it)[0], self._tahun_dasar(it)), []).append(k)
        akh = {}
        for ks in grup.values():
            if len(ks) > 1:
                for i, k in enumerate(sorted(ks, key=lambda k: self.pustaka[k]['title'])):
                    akh[k] = 'abcdefghijklmnopqrstuvwxyz'[i]
        return akh

    @staticmethod
    def _tahun_dasar(it):
        dp = it.get('issued', {}).get('date-parts')
        return str(dp[0][0]) if dp else 't.t.'

    def tahun(self, kunci):
        dasar, akh = self._tahun_dasar(self.pustaka[kunci]), self._akhiran.get(kunci, '')
        return f'{dasar}-{akh}' if akh and dasar == 't.t.' else dasar + akh

    def kutip(self, bagian, naratif=False, status='draf'):
        """bagian = [(kunci, lokasi, hanya_tahun)]. Kembalikan teks kutipan dalam teks."""
        potong = []
        for kunci, lokasi, hanya_tahun in bagian:
            it = self.pustaka.get(kunci)
            if it is None:
                raise KeyError(f'kunci pustaka "{kunci}" tidak ada di pustaka.json')
            if status == 'final' and it.get('verifikasi') == 'sekunder':
                raise KeyError(f'pustaka "{kunci}" bersumber sekunder; tidak boleh di naskah final (PEDOMAN C6.1)')
            if kunci not in self.dikutip:
                self.dikutip.append(kunci)
            nama, singkat = self._nama(it)
            kenal = nama in self._kenal  # APA 7: singkatan lembaga dikenalkan sekali, lalu dipakai
            if singkat and not hanya_tahun:  # [-@kunci] tidak menampilkan nama, jadi belum memperkenalkan singkatan
                self._kenal.add(nama)
            th = self.tahun(kunci) + (f', {lokasi}' if lokasi else '')
            potong.append((nama, singkat, kenal, th, hanya_tahun))
        if naratif:
            nama, singkat, kenal, th, _ = potong[0]
            if singkat and not kenal:
                return f'{nama} ({singkat}, {th})'
            return f'{singkat or nama.replace(" & ", " dan ")} ({th})'
        out = []
        for nama, singkat, kenal, th, hanya in potong:
            t = (singkat if kenal else f'{nama} [{singkat}]') if singkat else nama
            if out and out[-1][2] == (singkat or nama) and not hanya:
                out[-1][1].append(th)
            else:
                out.append((t, [th], singkat or nama, hanya))
        return '(' + '; '.join(', '.join(ths) if hanya else f'{t}, ' + ', '.join(ths)
                               for t, ths, _, hanya in out) + ')'

    def apa(self, kunci):
        """Entri daftar pustaka APA 7 sebagai run [{'j':'teks','s':..,'miring':bool}]."""
        it = self.pustaka[kunci]
        runs = []
        t = lambda s, m=False: runs.append({'j': 'teks', 's': s, 'miring': m})
        titik = lambda s: '' if s.rstrip()[-1:] in '.?!' else '.'
        a = it.get('author') or []
        if a and all('literal' in x for x in a):
            pen = a[0]['literal']
        else:
            nm = [f"{x['family']}, " + ' '.join(p[0] + '.' for p in x['given'].replace('.', ' ').split())
                  if x.get('given') else x.get('family') or x['literal'] for x in a]
            pen = nm[0] if len(nm) == 1 else ', '.join(nm[:-1]) + ', & ' + nm[-1]
        t(f'{pen}{titik(pen)} ({self.tahun(kunci)}). ')
        jenis = it.get('type')
        if jenis == 'article-journal':
            t(it['title'] + titik(it['title']) + ' ')
            t(it['container-title'], True)
            if it.get('volume'):
                t(', ')
                t(it['volume'], True)
                t(f"({it['issue']})" if it.get('issue') else '')
            t(f", {it['page']}. " if it.get('page') else '. ')
        else:
            t(it['title'], True)
            t(f" [{it['genre']}]. " if it.get('genre') else titik(it['title']) + ' ')
            for k in ('container-title', 'publisher'):
                if it.get(k):
                    t(it[k] + '. ')
        url = f"https://doi.org/{it['DOI']}" if it.get('DOI') else it.get('URL', '')
        if it.get('accessed') and url:
            y, m, d = it['accessed']['date-parts'][0]
            t(f'Diakses {d} {BULAN[m - 1]} {y}, dari {url}')
        elif url:
            t(url)
        runs[-1]['s'] = runs[-1]['s'].rstrip()
        return runs

    def daftar_pustaka(self):
        urut = sorted(self.dikutip, key=lambda k: (self._nama(self.pustaka[k])[0], self.tahun(k)))
        return [(k, self.apa(k)) for k in urut]


# ---------------------------------------------------------------- pengurai

def _norm(s):
    return re.sub(r'\s+', ' ', re.sub(r'\([^)]*\)', '', s)).strip().lower()


def polos(runs):
    return ''.join(r['s'] for r in runs)


class _Pengurai:
    def __init__(self, teks, k, nama):
        self.k, self.nama = k, nama
        self.b = teks.split('\n')
        self.kaki_def, self.kaki_urut, self.id = {}, [], {}
        self.meta, mulai = self._front()
        self.status = self.meta.get('status', 'draf')
        for i, s in enumerate(self.b):
            for c, apa in DILARANG.items():
                if c in s:
                    self.galat(i, f'{apa} (U+{ord(c):04X}) dilarang di naskah')
            if RE_EMOJI.search(s):
                self.galat(i, 'emoji dilarang')
            m = RE_KAKI_DEF.match(s)
            if m and i >= mulai:
                if m[1] in self.kaki_def:
                    self.galat(i, f'catatan kaki [^{m[1]}] didefinisikan dua kali')
                self.kaki_def[m[1]] = (m[2], i)
                self.b[i] = ''
        self.blok = self.urai(mulai, len(self.b), None)
        self._cek_dokumen()

    def galat(self, i, pesan):
        raise NaskahGalat(f'{self.nama}:{i + 1}: {pesan}')

    def _front(self):
        if not self.b or self.b[0].strip() != '---':
            self.galat(0, 'front matter --- harus di baris pertama')
        meta = {}
        for i in range(1, len(self.b)):
            s = self.b[i].strip()
            if s == '---':
                break
            if not s or s.startswith('#'):
                continue
            k, sep, v = s.partition(':')
            if not sep:
                self.galat(i, f'baris front matter bukan "kunci: nilai": {s}')
            meta[k.strip()] = v.strip().strip('"')
        else:
            self.galat(0, 'front matter tidak ditutup ---')
        kos, kaj = self.k.tema['kosakata'], self.k.tema['kajian']
        if meta.get('kajian') not in ('air', 'mitigasi', 'rehab'):
            self.galat(0, f'kajian harus air, mitigasi, atau rehab, bukan "{meta.get("kajian")}"')
        jenis = [x for x in ('bab', 'lampiran', 'bagian') if x in meta]
        if len(jenis) != 1:
            self.galat(0, 'front matter wajib tepat satu dari bab, lampiran, bagian')
        if 'bab' in meta and not meta['bab'].isdigit():
            self.galat(0, f'bab harus angka, bukan "{meta["bab"]}"')
        if 'lampiran' in meta and (len(meta['lampiran']) != 1 or meta['lampiran'] not in kaj[meta['kajian']]['lampiran']):
            self.galat(0, f'lampiran "{meta["lampiran"]}" bukan kode lampiran kajian {meta["kajian"]}')
        if 'bagian' in meta and meta['bagian'] not in kos['bagian_depan']:
            self.galat(0, f'bagian "{meta["bagian"]}" tidak dikenal: {sorted(kos["bagian_depan"])}')
        if not meta.get('judul'):
            self.galat(0, 'judul wajib di front matter')
        if 'bab' in meta and not meta.get('pertanyaan'):
            self.galat(0, 'pertanyaan (satu kalimat yang dijawab bab) wajib untuk bab')
        if meta.get('status', 'draf') not in ('draf', 'final'):
            self.galat(0, 'status harus draf atau final')
        return meta, i + 1

    # -- blok
    def _awal_struktur(self, s):
        return (RE_BUKA.match(s) or RE_TUTUP.match(s) or RE_JUDUL.match(s) or s.lstrip().startswith('|')
                or RE_BUTIR.match(s) or s.strip() == '{{halaman-baru}}')

    def urai(self, i, j, induk):
        out = []
        while i < j:
            s = self.b[i]
            if not s.strip():
                i += 1
            elif s.strip() == '{{halaman-baru}}':
                out.append({'jenis': 'halaman-baru', 'baris': i + 1})
                i += 1
            elif RE_BUKA.match(s):
                t = self._tutup(i, j)
                out.append(self.direktif(RE_BUKA.match(s), i, t, induk))
                i = t + 1
            elif RE_TUTUP.match(s):
                self.galat(i, 'penutup ::: tanpa pembuka')
            elif RE_JUDUL.match(s):
                if induk:
                    self.galat(i, f'judul # tidak boleh di dalam direktif {induk}')
                out.append(self.judul(RE_JUDUL.match(s), i))
                i += 1
            elif s.lstrip().startswith('|'):
                t = i
                while t < j and self.b[t].lstrip().startswith('|'):
                    t += 1
                out.append(self.tabel(i, t))
                i = t
            elif RE_BUTIR.match(s):
                t = i
                while t < j and (RE_BUTIR.match(self.b[t]) or (self.b[t].startswith('  ') and self.b[t].strip())):
                    t += 1
                out.append(self.daftar(i, t))
                i = t
            else:
                t = i
                while t < j and self.b[t].strip() and not self._awal_struktur(self.b[t]):
                    t += 1
                out.append(self.paragraf(i, t))
                i = t
        return out

    def _tutup(self, i, j):
        dalam = 0
        for t in range(i, j):
            if RE_BUKA.match(self.b[t]):
                dalam += 1
            elif RE_TUTUP.match(self.b[t]):
                dalam -= 1
                if dalam == 0:
                    return t
        self.galat(i, 'direktif ::: tidak ditutup')

    def judul(self, m, i):
        tingkat, teks, rid = len(m[1]), m[2], m[3]
        if re.match(r'^\d+(\.\d+)*\.?\s', teks):
            self.galat(i, 'nomor judul jangan diketik; diturunkan dari penomoran otomatis')
        if '{{' in teks or '@' in teks:
            self.galat(i, 'judul tidak boleh memuat token angka, kutipan, atau rujukan (judul harus stabil)')
        if tingkat == 1:
            if teks != self.meta['judul']:
                self.galat(i, f'judul # "{teks}" harus sama dengan judul front matter "{self.meta["judul"]}"')
            pref = 'lamp' if 'lampiran' in self.meta else 'bab'
        else:
            pref = 'sub'
        if rid:
            self._daftar_id(rid, i, pref)
        return {'jenis': 'judul', 'tingkat': tingkat, 'teks': teks, 'id': rid, 'baris': i + 1}

    def _daftar_id(self, rid, i, pref):
        if rid.split(':')[0] != pref:
            self.galat(i, f'id {rid} harus berawalan {pref}:')
        if rid in self.id:
            self.galat(i, f'id {rid} dipakai dua kali')
        self.id[rid] = i

    def paragraf(self, i, t):
        s = ' '.join(self.b[x].strip() for x in range(i, t))
        m = RE_LABEL.match(s)
        label = m[1] if m else None
        return {'jenis': 'paragraf', 'label': label, 'isi': self.inline(s[m.end():] if m else s, i), 'baris': i + 1}

    def daftar(self, i, t):
        akar, tumpuk = {'jenis': 'daftar', 'butir': [], 'baris': i + 1}, []
        for x in range(i, t):
            m = RE_BUTIR.match(self.b[x])
            if not m:  # baris lanjutan butir
                tumpuk[-1][1]['butir'][-1]['_s'] += ' ' + self.b[x].strip()
                continue
            lv = 0 if len(m[1]) < 2 else 1
            wadah = akar if lv == 0 else (akar['butir'][-1].setdefault('anak', {'jenis': 'daftar', 'butir': [], 'baris': x + 1})
                                          if akar['butir'] else self.galat(x, 'butir tingkat 2 tanpa induk'))
            wadah['nomor'] = m[2] != '-'
            wadah['butir'].append({'_s': m[3], '_i': x})
            tumpuk = [(lv, wadah)]
        maks = self.k.tema['objek']['maks_butir_daftar']

        def selesai(d):
            if len(d['butir']) > maks:
                self.galat(d['baris'] - 1, f'daftar {len(d["butir"])} butir > {maks}; jadikan tabel (PEDOMAN B3)')
            for b in d['butir']:
                b['isi'] = self.inline(b.pop('_s'), b.pop('_i'))
                if 'anak' in b:
                    selesai(b['anak'])
        selesai(akar)
        return akar

    @staticmethod
    def _sel(s):
        """Pecah baris tabel pipa; | di dalam {{...}} dan \\| tidak memisah sel."""
        s = s.strip()
        s = s[1:] if s.startswith('|') else s
        s = s[:-1] if s.endswith('|') and not s.endswith('\\|') else s
        out, buf, dalam, i = [], '', 0, 0
        while i < len(s):
            if s.startswith('{{', i) or (s.startswith('}}', i) and dalam):
                dalam += 1 if s[i] == '{' else -1
                buf, i = buf + s[i:i + 2], i + 2
            elif s.startswith('\\|', i):
                buf, i = buf + '\\|', i + 2
            elif s[i] == '|' and not dalam:
                out.append(buf.strip())
                buf, i = '', i + 1
            else:
                buf, i = buf + s[i], i + 1
        return out + [buf.strip()]

    def tabel(self, i, t):
        sel = self._sel
        if t - i < 2 or not re.match(r'^\s*\|?\s*:?-{3,}', self.b[i + 1]):
            self.galat(i, 'tabel pipa butuh baris kepala dan baris pemisah |---|')
        kepala = sel(self.b[i])
        rata = ['kanan' if c.endswith(':') and not c.startswith(':') else 'tengah' if c.startswith(':') and c.endswith(':')
                else 'kiri' for c in sel(self.b[i + 1])]
        baris = []
        for x in range(i + 2, t):
            c = sel(self.b[x])
            if len(c) != len(kepala):
                self.galat(x, f'baris tabel {len(c)} sel, kepala {len(kepala)} sel')
            if _norm(c[0]) in ('jumlah', 'total'):
                self.galat(x, 'baris Jumlah jangan diketik; pakai atribut total: ya (dihitung dari baris tampil)')
            baris.append([self.inline(s, x) for s in c])
        return {'jenis': 'tabel', 'kepala': kepala, 'kunci': [_norm(h) for h in kepala], 'rata': rata,
                'baris': baris, 'baris_naskah': i + 1}

    # -- inline
    def inline(self, s, i):
        for a, b in ESC.items():
            s = s.replace(a, b)
        if s.count('**') % 2:
            self.galat(i, 'penanda tebal ** tidak berpasangan')
        runs = []
        for n, ruas in enumerate(s.split('**')):
            if ruas.count('*') % 2:
                self.galat(i, 'penanda miring * tidak berpasangan')
            for m_, bag in enumerate(ruas.split('*')):
                self._token(bag, i, runs, tebal=n % 2 == 1, miring=m_ % 2 == 1)
        for r in runs:
            r['s'] = ''.join(UNESC.get(c, c) for c in r['s'])
        return runs

    def _token(self, s, i, runs, tebal, miring):
        gaya = {'tebal': tebal, 'miring': miring}
        pos = 0
        for m in RE_INLINE.finditer(s):
            if m.start() > pos:
                runs.append({'j': 'teks', 's': s[pos:m.start()], **gaya})
            pos = m.end()
            try:
                if m['kunci']:
                    runs.append({'j': 'angka', 's': self.k.suntik(m['kunci'], m['opsi'], f'{self.nama}:{i + 1}'),
                                 'kunci': m['kunci'], **gaya})
                elif m['asing'] is not None:
                    self.galat(i, f'token {{{{{m["asing"]}}}}} tidak dikenal; yang ada {{{{angka:...}}}} dan {{{{halaman-baru}}}}')
                elif m['kaki']:
                    if m['kaki'] not in self.kaki_def:
                        self.galat(i, f'catatan kaki [^{m["kaki"]}] tidak punya definisi')
                    if m['kaki'] not in self.kaki_urut:
                        self.kaki_urut.append(m['kaki'])
                    runs.append({'j': 'catatan', 's': str(self.kaki_urut.index(m['kaki']) + 1), 'label': m['kaki'], **gaya})
                elif m['kutip']:
                    bag = []
                    for p in m['kutip'].split(';'):
                        p = p.strip()
                        mm = re.match(r'^(-?)@([a-z0-9][a-z0-9-]*)\s*(?:,\s*(.+))?$', p)
                        if not mm:
                            self.galat(i, f'kutipan "[{m["kutip"]}]" tidak sah; bentuk [@kunci], [@kunci, hlm. 5], [@a; @b], [-@kunci]')
                        bag.append((mm[2], mm[3], mm[1] == '-'))
                    runs.append({'j': 'pustaka', 's': self.k.kutip(bag, status=self.status),
                                 'kunci': [b[0] for b in bag], **gaya})
                elif m['pref']:
                    runs.append({'j': 'rujuk', 's': f'{m["pref"]}:{m["rid"]}', 'id': f'{m["pref"]}:{m["rid"]}', **gaya})
                else:
                    runs.append({'j': 'pustaka', 's': self.k.kutip([(m['naratif'], None, False)], True, self.status),
                                 'kunci': [m['naratif']], **gaya})
            except (KeyError, ValueError) as e:
                self.galat(i, str(e).strip('"\''))
        if pos < len(s):
            runs.append({'j': 'teks', 's': s[pos:], **gaya})

    # -- direktif
    def direktif(self, m, i, t, induk):
        nama, rid = m[2], m[3]
        if nama not in DIREKTIF:
            self.galat(i, f'direktif "{nama}" tidak dikenal: {", ".join(sorted(DIREKTIF))}')
        butuh = INDUK.get(nama)
        if butuh != induk:
            self.galat(i, f'direktif {nama} hanya boleh di dalam {butuh}' if butuh
                       else f'direktif {nama} tidak boleh di dalam {induk}')
        if rid:
            if nama not in ID_PREFIKS:
                self.galat(i, f'direktif {nama} tidak bernomor dan tidak bisa dirujuk')
            self._daftar_id(rid, i, ID_PREFIKS[nama])
        atr, a = {}, i + 1
        while a < t and (mm := RE_ATR.match(self.b[a])):
            if mm[1] in atr:
                self.galat(a, f'atribut {mm[1]} ditulis dua kali')
            atr[mm[1]] = (mm[2].strip(), a)
            a += 1
        wajib, opsi = (x.split() for x in DIREKTIF[nama])
        for w in wajib:
            if not atr.get(w, ('',))[0]:
                self.galat(i, f'direktif {nama}: atribut wajib "{w}" tidak ada')
        for k_, (v, x) in atr.items():
            if k_ not in wajib and k_ not in opsi:
                self.galat(x, f'direktif {nama}: atribut "{k_}" tidak dikenal; yang sah: {" ".join(wajib + opsi)}')
        d = {'jenis': 'direktif', 'nama': nama, 'id': rid, 'baris': i + 1,
             'atribut': {k_: v for k_, (v, _) in atr.items()},
             'teks': {k_: self.inline(v, x) for k_, (v, x) in atr.items() if k_ not in KODE}}
        d['isi'] = self.urai(a, t, nama)
        self._cek(d, i)
        return d

    def _kode(self, i, nilai, sah, apa):
        if nilai not in sah:
            self.galat(i, f'{apa} "{nilai}" tidak dikenal; yang sah: {", ".join(sorted(sah))}')

    def _keyakinan(self, i, v, campuran=False):
        bag = [x.strip() for x in v.split(';')]
        kos = self.k.tema['kosakata']['keyakinan']
        if campuran and bag[0] == 'campuran':
            return
        self._kode(i, bag[0], kos, 'keyakinan')
        for x in bag[1:]:
            self._kode(i, x, kos[bag[0]].get('tambahan', []), f'tambahan keyakinan {bag[0]}')

    def _tabel_isi(self, d, i, kunci=None):
        tb = [b for b in d['isi'] if b['jenis'] == 'tabel']
        if len(tb) != 1:
            self.galat(i, f'direktif {d["nama"]} butuh tepat satu tabel pipa di isinya')
        if kunci and tb[0]['kunci'] != kunci:
            self.galat(tb[0]['baris_naskah'] - 1, f'kolom {d["nama"]} harus {kunci}, tertulis {tb[0]["kunci"]}')
        return tb[0]

    def _anak(self, d):
        return {b['nama']: b for b in d['isi'] if b['jenis'] == 'direktif'}

    def _label(self, d):
        return {b['label'] for b in d['isi'] if b['jenis'] == 'paragraf' and b['label']}

    def _cek(self, d, i):
        n, a, tema = d['nama'], d['atribut'], self.k.tema
        kos = tema['kosakata']
        if 'keyakinan' in a:
            self._keyakinan(i, a['keyakinan'], campuran=n == 'tabel')
        if n in LABEL_WAJIB:
            kurang = [x for x in LABEL_WAJIB[n] if x not in self._label(d)]
            if kurang:
                self.galat(i, f'{n}: paragraf berlabel **{kurang[0]}:** wajib ada')
        if n == 'gambar':
            self._kode(i, a['jenis'], kos['jenis_gambar'], 'jenis gambar')
            self._kode(i, a.get('lebar', 'penuh'), tema['objek']['lebar_cm'], 'lebar')
            if a['jenis'] == 'foto':
                for w in ('pengarang', 'lisensi', 'url'):
                    if not a.get(w):
                        self.galat(i, f'foto wajib atribut {w} (atribusi Wikimedia Commons, PEDOMAN B5.15)')
                lis = a['lisensi']
                if not any(lis.startswith(x) for x in kos['lisensi_foto']) or re.search(r'\b(NC|ND)\b', lis):
                    self.galat(i, f'lisensi foto "{lis}" tidak sah; hanya CC BY, CC BY-SA, CC0, PD tanpa NC/ND')
            elif not (a.get('sumber') and a.get('keyakinan')):
                self.galat(i, f'gambar {a["jenis"]} wajib atribut sumber dan keyakinan')
        elif n == 'tabel':
            ada_pipa = any(b['jenis'] == 'tabel' for b in d['isi'])
            if bool(a.get('csv')) == ada_pipa:
                self.galat(i, 'tabel: pilih salah satu, atribut csv atau tabel pipa di isi')
            if a.get('csv'):
                self._csv(d, i)
            if a['keyakinan'] == 'campuran' and 'keyakinan' not in self._tabel_isi(d, i)['kunci']:
                self.galat(i, 'keyakinan: campuran butuh kolom KEYAKINAN per baris')
        elif n == 'kartu-angka':
            self._kode(i, a.get('nada', 'data'), kos['nada_pil'], 'nada pil')
            tb = self._tabel_isi(d, i, KOLOM[n])
            for x, (nil, _, lab, ikon, w) in enumerate(tb['baris']):
                baris = tb['baris_naskah'] + 1 + x
                if not any(r['j'] == 'angka' for r in nil):
                    self.galat(baris, 'nilai kartu angka wajib token {{angka:...}}')
                self._kode(baris, polos(ikon), tema['ikon'], 'ikon')
                if len(polos(lab)) > tema['objek']['label_kartu_maks_huruf']:
                    self.galat(baris, f'label kartu "{polos(lab)}" {len(polos(lab))} huruf > {tema["objek"]["label_kartu_maks_huruf"]}')
                if polos(w):
                    try:
                        warna(tema, polos(w))
                    except KeyError as e:
                        self.galat(baris, str(e))
        elif n == 'temuan':
            self._kode(i, a['sifat'], kos['sifat_temuan'], 'sifat temuan')
        elif n == 'program':
            self._kode(i, a['keyakinan'].split(';')[0], ('resmi', 'terverifikasi'), 'keyakinan program terbukti')
            self._kode(i, a.get('jenis', 'program'), ('program', 'uji-coba'), 'jenis program')
            if 'status' in a:
                self._kode(i, a['status'], kos['status_usulan'], 'status usulan')
            if not any(r['j'] == 'pustaka' for r in d['teks']['sumber']):
                self.galat(i, 'program: sumber wajib memuat kutipan [@kunci] (P6 dampak terukur dan sumbernya)')
        elif n == 'skenario':
            self._skenario(d, i)
        elif n == 'garis-waktu':
            if 'musim' in a:
                self._kode(i, a['musim'], kos['musim'], 'musim')
            tb = self._tabel_isi(d, i, KOLOM[n])
            hit = {}
            for x, (fase, _, rek, _) in enumerate(tb['baris']):
                baris = tb['baris_naskah'] + 1 + x
                self._kode(baris, polos(fase), [f for f in kos['fase'] if not f.startswith('_')], 'fase')
                if not any(r['j'] == 'rujuk' and r['id'].startswith('rek:') for r in rek):
                    self.galat(baris, 'kolom REK wajib rujukan @rek:<id> ke matriks rekomendasi')
                hit[polos(fase)] = hit.get(polos(fase), 0) + 1
            for f in kos['fase']:
                if not f.startswith('_') and f not in hit:
                    self.galat(i, f'garis waktu tanpa fase {f}; ketiga fase wajib (PEDOMAN B5.12)')
            for f, c in hit.items():
                if not 3 <= c <= 5:
                    self.galat(i, f'garis waktu fase {f}: {c} aksi, harus 3 sampai 5 (PEDOMAN B5.12)')
        elif n == 'matriks-rekomendasi':
            self._kode(i, a['kelompok'], kos['kelompok_rekomendasi'], 'kelompok')
            if not self._anak(d) or any(b['jenis'] != 'direktif' for b in d['isi']):
                self.galat(i, 'matriks-rekomendasi hanya berisi blok ::: rek')
        elif n == 'rek':
            if not d['id']:
                self.galat(i, 'rek wajib id {#rek:<nama>}')
            self._kode(i, a['jenis'], kos['jenis_aksi'], 'jenis aksi')
            self._kode(i, a['status'], kos['status_usulan'], 'status usulan')
            if a['status'] != 'baru' and not a.get('program'):
                self.galat(i, 'rek berstatus sudah-ada atau dikembangkan wajib atribut program (sebut programnya, KERANGKA prinsip 8)')
            hz = kos['horizon']
            if a['waktu'] not in hz and a['waktu'] not in hz.values():
                self.galat(i, f'waktu "{a["waktu"]}" bukan horizon peta jalan: {", ".join(hz)}')
            for w in ('butuh', 'membuka'):
                if w in a and not re.fullmatch(r'@rek:[a-z0-9-]+(\s*;\s*@rek:[a-z0-9-]+)*', a[w]):
                    self.galat(i, f'{w} hanya berisi rujukan @rek:<id> dipisah titik koma')
            if not any(b['jenis'] == 'paragraf' and not b['label'] for b in d['isi']):
                self.galat(i, 'rek wajib satu kalimat rincian di isinya')
        elif n in ('matriks-lembaga', 'matriks-jenis'):
            tb = self._tabel_isi(d, i, KOLOM[n])
            for x, row in enumerate(tb['baris']):
                baris = tb['baris_naskah'] + 1 + x
                if n == 'matriks-jenis':
                    self._kode(baris, polos(row[0]), kos['jenis_bencana'], 'jenis bencana')
                for c in row[1:]:
                    s = polos(c)
                    if n == 'matriks-lembaga' and not re.match(r'^(pemimpin|pendukung|tidak berlaku):', s):
                        self.galat(baris, f'sel matriks lembaga harus diawali pemimpin:, pendukung:, atau tidak berlaku: ("{s[:40]}")')
                    if n == 'matriks-jenis' and not (s.startswith('tidak berlaku:') or any(r['j'] == 'rujuk' for r in c)):
                        self.galat(baris, 'sel matriks jenis berisi aksi dengan @rek:<id> atau "tidak berlaku: alasan"; sel kosong dilarang')

    def _skenario(self, d, i):
        a, kos, tema = d['atribut'], self.k.tema['kosakata'], self.k.tema
        self._kode(i, a['jenis'], kos['jenis_bencana'], 'jenis bencana')
        kel = next(k for k, v in tema['warna']['kategori'].items() if isinstance(v, dict) and a['jenis'] in v['jenis'])
        var = tema['warna']['kategori'][kel]['varian_skenario']
        d['varian'], d['keluarga'] = var, kel
        anak_wajib, atr_wajib = (x.split() for x in ANAK_SKENARIO[var])
        anak = self._anak(d)
        for w in anak_wajib:
            if w not in anak:
                self.galat(i, f'kartu skenario varian {var} ({a["jenis"]}) wajib blok ::: {w}')
        for w in anak:
            if w not in anak_wajib:
                self.galat(anak[w]['baris'] - 1, f'blok ::: {w} tidak dipakai di kartu skenario varian {var}')
        for w in atr_wajib:
            if not a.get(w):
                self.galat(i, f'kartu skenario varian {var} wajib atribut {w}')
        if var == 'a':
            k = a['kemungkinan']
            # KERANGKA D18: jenis tanpa dasar peluang ditulis "tidak dinilai: <alasan>", tanpa kelas
            if k not in kos['kemungkinan_5_tahun'] and not k.startswith(('periode ulang', 'tidak dinilai:')):
                self.galat(i, 'kemungkinan varian a: kelas 1 sampai 5 (pita peluang 5 tahun), "periode ulang <n> tahun", '
                              'atau "tidak dinilai: <alasan>"')
            tb = self._tabel_isi(anak['kerusakan'], i, KOLOM['kerusakan/a'])
            for x, r in enumerate(tb['baris']):
                if polos(r[3]) != '\u2013':
                    self._keyakinan(tb['baris_naskah'] + 1 + x, polos(r[3]))
            ada = [polos(r[0]).lower() for r in tb['baris']]
            for besar in kos['besaran_skenario_alam']:
                if not any(x.startswith(besar.lower()) for x in ada):
                    self.galat(tb['baris_naskah'] - 1, f'tabel kerusakan wajib baris aspek "{besar}" (Perban 2/2023 Pasal 7 ayat (5); '
                               'isi "\u2013" beralasan bila tidak terhitung)')
            for x in ada:  # luka, pengungsi hari ke-7, dan DALY tidak ada di DIBI (KERANGKA prinsip 9)
                for besar in kos['besaran_skenario_terlarang']:
                    if besar.lower() in x:
                        self.galat(tb['baris_naskah'] - 1, f'tabel kerusakan memuat besaran terlarang "{besar}" (KERANGKA prinsip 9)')
            self._tabel_isi(anak['kepekaan'], i, KOLOM['kepekaan'])
        else:
            tb = self._tabel_isi(anak['kerusakan'], i, KOLOM['kerusakan/b'])
            ada = [polos(r[0]).lower() for r in tb['baris']]
            for besar in kos['indikator_skenario_nonalam'][a['jenis']]:
                if not any(x.startswith(besar.lower()) for x in ada):
                    self.galat(tb['baris_naskah'] - 1, f'kartu analog {a["jenis"]} wajib besaran "{besar}" (tanpa perkalian; "\u2013" beralasan bila tidak ada)')
            if var == 'c' and not a['kemungkinan'].startswith('tidak dinilai'):
                self.galat(i, 'kartu skenario sosial: kemungkinan ditulis "tidak dinilai: <alasan>" (KERANGKA prinsip 9, PEDOMAN B5.11 varian c)')

    def _csv(self, d, i):
        """Bangun tabel dari CSV: kolom, saring, urut, batas, total. Angka masuk manifest injeksi."""
        a = d['atribut']
        p = self.k.akar / a['csv']
        if not p.exists():
            self.galat(i, f'csv {a["csv"]} tidak ada (jalur relatif ke akar proyek)')
        with p.open(encoding='utf-8') as f:
            rows = list(csv.DictReader(f))
        for syarat in filter(None, (s.strip() for s in a.get('saring', '').split(';'))):
            k_, _, v = syarat.partition('=')
            rows = [r for r in rows if r.get(k_.strip()) == v.strip()]
        if a.get('urut'):
            u = a['urut'].lstrip('-')
            rows.sort(key=lambda r: float(r[u]) if r[u] != '' else float('-inf'), reverse=a['urut'].startswith('-'))
        if a.get('batas'):
            rows = rows[:int(a['batas'])]
        spek = []
        for bag in filter(None, (s.strip() for s in a.get('kolom', '').split(';'))):
            mm = re.match(r'^([A-Za-z0-9_]+)\s*=\s*"([^"]+)"\s*(?:fmt=(\S+))?$', bag)
            if not mm:
                self.galat(i, f'kolom "{bag}" tidak sah; bentuk nama_kolom="KEPALA" fmt=1')
            if rows and mm[1] not in rows[0]:
                self.galat(i, f'kolom "{mm[1]}" tidak ada di {a["csv"]}')
            spek.append(mm.groups())
        if not spek:
            self.galat(i, 'tabel csv wajib atribut kolom')
        baris, jumlah = [], [0.0] * len(spek)
        for r in rows:
            sel = []
            for c, (kol, _, f) in enumerate(spek):
                v = r[kol]
                if f and f != 'teks' and v != '':
                    opsi = {'flag': {f}} if not f.isdigit() else {'fmt': f, 'flag': set()}
                    s = format_angka(float(v), None, None, '', 'resmi', opsi)
                    jumlah[c] += float(v)
                    self.k.manifest.append({'kunci': f'csv:{a["csv"]}#{kol}', 'tampil': s, 'nilai': float(v),
                                            'naskah': f'{self.nama}:{i + 1}', 'keyakinan': a['keyakinan'],
                                            'sumber': polos(d['teks']['sumber'])})
                else:
                    s = v if v != '' else '\u2013'
                sel.append([{'j': 'teks', 's': s, 'tebal': False, 'miring': False}])
            baris.append(sel)
        tb = {'jenis': 'tabel', 'kepala': [s[1] for s in spek], 'kunci': [_norm(s[1]) for s in spek],
              'rata': ['kanan' if s[2] and s[2] != 'teks' else 'kiri' for s in spek], 'baris': baris,
              'baris_naskah': i + 1, 'dari_csv': True}
        if a.get('total') == 'ya':
            tb['total'] = [fmt_id(jumlah[c]) if spek[c][2] and spek[c][2] != 'teks' else ('Jumlah' if c == 0 else '')
                           for c in range(len(spek))]
        d['isi'].append(tb)

    def _cek_dokumen(self):
        bab1 = [b for b in self.blok if b['jenis'] == 'judul' and b['tingkat'] == 1]
        if len(bab1) != 1:
            self.galat(0, f'naskah wajib tepat satu judul # ({len(bab1)} ditemukan)')
        sisa = set(self.kaki_def) - set(self.kaki_urut)
        if sisa:
            self.galat(self.kaki_def[min(sisa)][1], f'catatan kaki [^{min(sisa)}] didefinisikan tetapi tidak dirujuk')
        self.kaki = [{'nomor': n + 1, 'label': lb, 'isi': self.inline(*self.kaki_def[lb])}
                     for n, lb in enumerate(self.kaki_urut)]


def baca_teks(teks, k, nama='<naskah>'):
    p = _Pengurai(teks, k, nama)
    return {'nama': nama, 'meta': p.meta, 'blok': p.blok, 'catatan_kaki': p.kaki, 'id': sorted(p.id)}


def baca(path, k):
    path = Path(path)
    return baca_teks(path.read_text(encoding='utf-8'), k, str(path))


# ---------------------------------------------------------------- penomoran lintas berkas

def _jelajah(blok):
    for b in blok:
        yield b
        if b['jenis'] == 'direktif':
            yield from _jelajah(b['isi'])


def nomori(daftar):
    """Beri nomor objek, judul, dan rekomendasi; kembalikan id -> label. Galat bila rujukan tidak terurai."""
    label, rek = {}, 0
    for n in daftar:
        m = n['meta']
        pref = m.get('bab') or m.get('lampiran') or ('RE' if m.get('bagian') == 'ringkasan-eksekutif' else None)
        hit, sub = {}, [0, 0, 0]
        for b in _jelajah(n['blok']):
            if b['jenis'] == 'judul':
                if b['tingkat'] == 1:
                    b['nomor'] = pref
                    if b['id']:
                        label[b['id']] = f'Bab {pref}' if 'bab' in m else f'Lampiran {pref}'
                elif b['tingkat'] <= 3:
                    lv = b['tingkat'] - 2
                    sub[lv] += 1
                    sub[lv + 1:] = [0] * (2 - lv)
                    b['nomor'] = '.'.join([str(pref)] + [str(x) for x in sub[:lv + 1]])
                    if b['id']:
                        label[b['id']] = f'Subbab {b["nomor"]}'
            elif b['jenis'] == 'direktif' and b['nama'] in NOMOR:
                if pref is None:
                    raise NaskahGalat(f'{n["nama"]}:{b["baris"]}: objek bernomor tidak boleh di bagian {m.get("bagian")}')
                kata = NOMOR[b['nama']]
                hit[kata] = hit.get(kata, 0) + 1
                b['nomor'], b['label'] = f'{pref}.{hit[kata]}', f'{kata} {pref}.{hit[kata]}'
                if b['id']:
                    label[b['id']] = b['label']
            elif b['jenis'] == 'direktif' and b['nama'] == 'rek':
                rek += 1
                b['nomor'] = f'{rek:02d}'
                label[b['id']] = b['nomor']
    for n in daftar:
        kaki = [{'jenis': 'paragraf', 'isi': c['isi'], 'baris': '?'} for c in n['catatan_kaki']]
        for b in list(_jelajah(n['blok'])) + kaki:
            for runs in _semua_runs(b):
                for r in runs:
                    if r['j'] == 'rujuk':
                        if r['id'] not in label:
                            raise NaskahGalat(f'{n["nama"]}:{b.get("baris", "?")}: rujukan @{r["id"]} tidak menunjuk id mana pun')
                        r['s'] = label[r['id']]
            for w in ('butuh', 'membuka'):
                for rid in re.findall(r'@(rek:[a-z0-9-]+)', b.get('atribut', {}).get(w, '')):
                    if rid not in label:
                        raise NaskahGalat(f'{n["nama"]}:{b["baris"]}: {w} @{rid} tidak menunjuk rekomendasi mana pun')
    return label


def _semua_runs(b):
    if b['jenis'] == 'paragraf':
        yield b['isi']
    elif b['jenis'] == 'daftar':
        for x in b['butir']:
            yield x['isi']
            if 'anak' in x:
                yield from _semua_runs(x['anak'])
    elif b['jenis'] == 'tabel':
        for row in b['baris']:
            yield from row
    elif b['jenis'] == 'direktif':
        yield from b['teks'].values()


# ---------------------------------------------------------------- uji diri

def contoh_spek():
    """(contoh lengkap, [potongan]) dari bangun/NASKAH-SPEK.md."""
    s = (SKILL / 'references/NASKAH-SPEK.md').read_text(encoding='utf-8')
    lengkap = re.findall(r'````naskah\n(.*?)\n````', s, re.S)
    potong = re.findall(r'````naskah-potongan\n(.*?)\n````', s, re.S)
    assert len(lengkap) == 1, f'NASKAH-SPEK.md harus memuat tepat satu blok ````naskah ({len(lengkap)})'
    return lengkap[0], potong


FM = '---\nkajian: mitigasi\nbab: 8\njudul: Uji\npertanyaan: Apa?\n---\n# Uji\n\n'


def _uji_diri():
    # format angka
    assert fmt_id(1234567.891, 1) == '1.234.567,9' and fmt_id(-0.04, 1) == '0,0' and fmt_id(168) == '168'
    assert fmt_id(0.25, 1) == '0,3' and fmt_id(2.45, 1) == '2,5'  # setengah ke atas, bukan banker's
    assert dua_bermakna(257.9515) == (260.0, 0) and dua_bermakna(4.2282) == (4.2, 1) and dua_bermakna(1332.56) == (1300.0, 0)
    f = lambda **o: {'fmt': o.pop('fmt', None), 'flag': set(o.pop('flag', ''))}
    assert format_angka(None, 257.95, 593.30, 'jiwa', 'estimasi-model', f(flag=['satuan'])) == '260\u2013590 jiwa'
    assert format_angka(150.2, None, None, 'jiwa', 'estimasi-model', f()) == 'sekitar 150'
    assert format_angka(None, 257355e6, 337785e6, 'Rp', 'asumsi-kebijakan', f(flag=['rupiah'])) == 'Rp257,4\u2013337,8 miliar'
    assert format_angka(-17.8396, None, None, '%', 'resmi', f(fmt='1', flag=['persen', 'arah'])) == 'turun 17,8%'
    assert format_angka(1250340, None, None, 'jiwa-hari', 'asumsi-kebijakan', f(flag=['ringkas'])) == '1,3 juta'

    k = Konteks()
    lengkap, potong = contoh_spek()
    n = baca_teks(lengkap, k, 'NASKAH-SPEK.md#contoh')
    label = nomori([n])
    pakai = {b['nama'] for b in _jelajah(n['blok']) if b['jenis'] == 'direktif'}
    utama = set(DIREKTIF) - {'pemicu', 'mandat'}
    assert utama <= pakai, f'contoh belum memakai direktif: {sorted(utama - pakai)}'
    assert any(b['jenis'] == 'halaman-baru' for b in n['blok']), 'contoh belum memakai {{halaman-baru}}'
    teks = json.dumps(n, ensure_ascii=False)
    ra, rs = k.tahun('bnpb-2025-renas'), k.tahun('bnpb-2025-renstra')  # huruf tahun ikut isi pustaka.json, bukan potret
    for harap in (f'Badan Nasional Penanggulangan Bencana [BNPB], {ra}', f'(BNPB, {ra}, {rs})', 'Haque dkk. (2012)',
                  'Gambar 6.1', 'Tabel 6.1', 'Subbab 6.2'):
        assert harap in teks, f'contoh tidak menghasilkan "{harap}"'
    # invarian, bukan potret data: tiap angka tersuntik tampil apa adanya, rentang ber-en dash, rupiah besar bersatuan
    for m in k.manifest:
        assert m['tampil'] in teks, f'angka {m["kunci"]} tersuntik "{m["tampil"]}" tetapi tidak tampil di contoh'
    opsi = [m.get('opsi', '') for m in k.manifest]
    assert any('rupiah' in o for o in opsi) and any('persen' in o and 'arah' in o for o in opsi), 'contoh wajib memakai opsi rupiah dan persen|arah'
    for m in k.manifest:
        if 'rupiah' in m.get('opsi', ''):
            assert re.fullmatch(r'Rp[0-9.,]+ (juta|miliar|triliun)', m['tampil']), m
        if 'arah' in m.get('opsi', ''):
            assert re.match(r'(naik|turun|tetap) ', m['tampil']), m
    assert n['catatan_kaki'] and n['catatan_kaki'][0]['nomor'] == 1
    assert label['rek:peringatan-dini'] == '01' and label['rek:data-genangan'] == '02'
    tok = len(re.findall(r'\{\{angka:', lengkap))
    assert len([m for m in k.manifest if not m['kunci'].startswith('csv:')]) == tok, 'tiap token angka tercatat di manifest'
    assert any(m['kunci'].startswith('csv:') for m in k.manifest), 'angka dari CSV tercatat di manifest'
    dp = dict(k.daftar_pustaka())
    assert list(dp)[0] == 'bnpb-2025-renas', list(dp)
    assert polos(dp['haque-2012-siklon']) == (
        'Haque, U., Hashizume, M., Kolivras, K. N., Overgaard, H. J., Das, B., & Yamamoto, T. (2012). Reduced death '
        'rates from cyclones in Bangladesh: What more needs to be done? Bulletin of the World Health Organization, '
        '90(2), 150\u2013156. https://doi.org/10.2471/BLT.11.088302'), polos(dp['haque-2012-siklon'])
    for p in potong:
        baca_teks(FM + p, Konteks(), 'NASKAH-SPEK.md#potongan')
    # lampiran: penomoran per kode, tabel CSV dari katalog lengkap (D-18: 119 kab/kota Jawa), baris Jumlah dihitung
    lamp = ('---\nkajian: air\nlampiran: A\njudul: Tabel Indikator Kab/Kota\n---\n# Tabel Indikator Kab/Kota {#lamp:indikator}\n\n'
            '::: tabel {#tbl:a-penduduk}\njudul: Penduduk kab/kota Pulau Jawa 2026\ncsv: data/irbi/irbi_kab_2025.csv\n'
            'saring: pulau=Jawa\nkolom: nama_kepmendagri="KAB/KOTA"; penduduk_2026="PENDUDUK (jiwa)" fmt=0\ntotal: ya\n'
            'sumber: WorldPop 2026\nkeyakinan: asumsi-kebijakan\n:::\n\nLihat @tbl:a-penduduk di @lamp:indikator.')
    nl = baca_teks(lamp, Konteks(), 'lampiran-a')
    lb = nomori([nl])
    assert lb == {'lamp:indikator': 'Lampiran A', 'tbl:a-penduduk': 'Tabel A.1'}, lb
    tb = next(b for b in _jelajah(nl['blok']) if b['jenis'] == 'tabel')
    assert len(tb['baris']) == 119 and tb['total'][0] == 'Jumlah', (len(tb['baris']), tb['total'])

    # fixture negatif: tiap pelanggaran harus ditolak dengan pesannya
    reg_dobel = {**Konteks().angka, 'uji.dobel': {'berkas': 'irbi/irbi.json', 'satuan': '', 'keyakinan': 'resmi',
                                                   'sumber': 'x', 'jalur': 'tabel[irbi_hitung_kelas.csv].baris[tingkat=kab].n_tinggi'}}
    for teks_, harap, reg in (
        (FM + 'IRB {{angka:irbi.tidak.ada}}.', 'tidak ada di data/angka.json', None),
        (FM + 'IRB {{angka:uji.dobel}}.', 'cocok 11 baris', reg_dobel),
        (FM + 'IRB {{angka:irbi.nasional.2024|fmt=1|gaya}}.', 'opsi token tidak dikenal', None),
        (FM + 'Kata \u2014 kata.', 'em dash', None),
        (FM + 'Satu \u00b7 dua.', 'titik tengah', None),
        (FM + '::: kotak\n:::', 'tidak dikenal', None),
        (FM + '::: temuan\nsifat: fakta\n\n**Bukti:** a\n\n**Dampak:** b\n\n**Pembuka:** c\n:::', 'atribut wajib "judul"', None),
        (FM + '::: catatan\nTeks.', 'tidak ditutup', None),
        (FM + 'Teks[^a].', 'tidak punya definisi', None),
        (FM + 'Teks.\n\n[^a]: Isi.', 'tidak dirujuk', None),
        (FM + 'Lihat [@tidak-ada].', 'tidak ada di pustaka.json', None),
        (FM + '- a\n- b\n- c\n- d\n- e\n- f', 'jadikan tabel', None),
        (FM + '## 8.1 Judul', 'jangan diketik', None),
        (FM + '::: tabel\njudul: J\nsumber: S\nkeyakinan: resmi\n\n| A | B |\n|---|---|\n| Jumlah | x |\n:::', 'baris Jumlah', None),
        (FM + '::: matriks-rekomendasi\njudul: J\nkelompok: internal\nsumber: S\n\n::: rek {#rek:a}\nlangkah: L\njenis: data\n'
              'status: sudah-ada\nunit: U\nkl: K\nwaktu: 100-hari\nindikator: I\ndasar: D\n\nRincian.\n:::\n:::', 'wajib atribut program', None),
        (FM + '::: rek {#rek:a}\nlangkah: L\n:::', 'hanya boleh di dalam matriks-rekomendasi', None),
        (FM + '::: gambar\nberkas: g.png\njudul: J\njenis: foto\npengarang: A\nlisensi: CC BY-NC 4.0\nurl: u\n:::', 'lisensi foto', None),
        (FM + '**tebal tanpa tutup', 'tidak berpasangan', None),
        (FM + 'Lihat @gbr:hilang.', 'tidak menunjuk id', None),
    ):
        try:
            nn = baca_teks(teks_, Konteks(angka=reg), 'fixture')
            nomori([nn])
        except NaskahGalat as e:
            assert harap in str(e), f'fixture "{harap}" ditolak dengan pesan lain: {e}'
        else:
            raise AssertionError(f'fixture negatif "{harap}" lolos, pembaca rusak')
    # kartu skenario varian a tanpa kepekaan ditolak
    tanpa = re.sub(r'::: kepekaan\n.*?\n:::\n', '', lengkap, flags=re.S)
    try:
        baca_teks(tanpa, Konteks(), 'fixture')
    except NaskahGalat as e:
        assert 'wajib blok ::: kepekaan' in str(e), e
    else:
        raise AssertionError('kartu skenario tanpa kepekaan lolos')
    return n, label, k


if __name__ == '__main__':
    sys.path.insert(0, str(Path(__file__).parent))
    if len(sys.argv) > 1:
        k = Konteks()
        semua = [baca(p, k) for p in sys.argv[1:]]
        nomori(semua)
        print(f'{len(semua)} naskah lolos; {len(k.manifest)} angka disuntik; {len(k.dikutip)} pustaka dikutip')
    else:
        n, label, k = _uji_diri()
        print(f'uji diri lolos: {len(list(_jelajah(n["blok"])))} blok, {len(label)} rujukan, '
              f'{len(k.manifest)} angka disuntik, {len(k.dikutip)} pustaka dikutip')
