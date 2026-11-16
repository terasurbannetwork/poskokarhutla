"""Blok naskah -> HTML (sampul terpisah dan isi) untuk dicetak Chromium menjadi PDF A4."""
import html as _h
import re
from pathlib import Path
import naskah as N
import konst as K
import catatan as C

KARTU_WARNA = [K.NAVY, K.ORANYE, K.BIRU, 'A07A32', K.MERAH, '5B7A99']


def e(t):
    return _h.escape(t, quote=True)


BAB = 0   # indeks berkas naskah yang sedang disajikan (untuk id catatan akhir bab)


def ih(t):
    """Markdown sebaris -> HTML."""
    out = []
    for tx, f in N.inline(t):
        if 'n' in f:
            tautan = ',​'.join(f'<a class="cr" id="cr-{BAB}-{n}" href="#cn-{BAB}-{n}">{n}</a>' for n in tx.split(','))
            out.append(f'<sup class="cr">{tautan}</sup>')
            continue
        s = e(tx)
        if 'c' in f:
            s = f'<code>{s}</code>'
        if 'b' in f:
            s = f'<b>{s}</b>'
        if 'i' in f:
            s = f'<i>{s}</i>'
        out.append(s)
    return ''.join(out)


def uri(p):
    return Path(p).resolve().as_uri()


class Penyaji:
    def __init__(self, toc=None):
        self.toc = toc or {}     # {"ZQ0003": 12}
        self.entri = []          # [(kode, tingkat, teks)]
        self.n = 0

    def penanda(self, tingkat, teks):
        self.n += 1
        kode = f'ZQ{self.n:04d}'
        self.entri.append((kode, tingkat, teks))
        return f'<span class="mk">{kode}</span>'

    # ---------- blok ----------
    def blok(self, b, dlm_pd=False):
        k = b[0]
        return getattr(self, 'b_' + k)(b)

    def blok_semua(self, daftar, **kw):
        return ''.join(self.blok(b, **kw) for b in daftar)

    def b_h(self, b):
        tg, t = b[1], b[2]
        if tg == 1:
            lb, jd = N.pecah_h1(N.polos(t))
            pm = self.penanda(1, N.teks_toc(t))
            lab = f'<span class="lb">{e(lb)}</span>' if lb else ''
            return f'</section><section class="hal"><div class="bab" id="h-{self.entri[-1][0]}">{lab}{e(jd) if lb else ih(t)}{pm}</div>'
        if tg == 2:
            pm = self.penanda(2, N.polos(t))
            return f'<h2 id="h-{self.entri[-1][0]}">{ih(t)}{pm}</h2>'
        return f'<h{tg}>{ih(t)}</h{tg}>'

    def b_p(self, b):
        return f'<p>{ih(b[1])}</p>'

    def b_singkatan(self, b):
        return ''   # kotak "Singkatan dan istilah" tidak dicetak (catatan.buang_singkatan menyaring lebih dulu)

    def catatan_akhir(self, nama):
        """Daftar catatan akhir bab untuk berkas naskah `nama` (penomoran 1.. per berkas)."""
        daftar = C.DAFTAR.get(nama) or []
        if not daftar:
            return ''
        li = ''.join(
            f'<div class="cn-i"><a class="cn-n" id="cn-{BAB}-{i}" href="#cr-{BAB}-{i}" title="Kembali ke teks">{i}</a>'
            f'<span class="cn-t">{"; ".join(e(x).replace("/", "/<wbr>") for x in it)}</span></div>'
            for i, it in enumerate(daftar, start=1))
        return f'<div class="cn"><div class="cn-j">Catatan</div>{li}</div>'

    def b_list(self, b):
        out = []
        for it in b[1]:
            out.append(self._butir(it, 0))
            for s in it['sub']:
                out.append(self._butir(s, 1))
        return '<div class="ls">' + ''.join(out) + '</div>'

    def _butir(self, it, tingkat):
        pen = f'<span class="no">{e(it["no"])}.</span>' if it['jenis'] == 'ol' else '<span class="bt">&bull;</span>'
        return f'<div class="li s{tingkat}">{pen}<div>{ih(it["teks"])}</div></div>'

    def b_tabel(self, b):
        d = b[1]
        ncol = len(d['kepala'])
        lebar = N.bobot_kolom(d['kepala'], d['baris'])
        cg = ''.join(f'<col style="width:{w}%">' for w in lebar)
        th = ''.join(f'<th>{ih(c)}</th>' for c in d['kepala'])
        rt = {'r': ' class="r"', 'c': ' class="c"', 'l': ''}
        tr = ''.join('<tr>' + ''.join(f'<td{rt[d["rata"][i]]}>{ih(c)}</td>' for i, c in enumerate(r)) + '</tr>' for r in d['baris'])
        kls = 'tb' + (' n6' if ncol == 6 else ' n7' if ncol >= 7 else '')
        cap = f'<figcaption><span class="lab">Tabel {e(d["no"])}.</span> {ih(d["judul"])}</figcaption>' if d['no'] else ''
        sb = f'<div class="sb"><b>Sumber:</b> {ih(d["sumber"])}</div>' if d['sumber'] else ''
        return f'<figure>{cap}<table class="{kls}"><colgroup>{cg}</colgroup><thead><tr>{th}</tr></thead><tbody>{tr}</tbody></table>{sb}</figure>'

    def b_gambar(self, b):
        d = b[1]
        p = K.GBR / Path(d['berkas']).name
        cap = f'<figcaption><span class="lab">Gambar {e(d["no"])}.</span> {ih(d["judul"])}</figcaption>' if d['no'] else ''
        sb = f'<div class="sb"><b>Sumber:</b> {ih(d["sumber"])}</div>' if d['sumber'] else ''
        if p.exists():
            return f'<figure class="fg">{cap}<img class="gbr" src="{uri(p)}">{sb}</figure>'
        return f'<figure class="fg">{cap}<p class="catatan">[gambar belum tersedia: {e(d["berkas"])}]</p>{sb}</figure>'

    def b_kutip(self, b):
        return f'<blockquote><p>{ih(b[1])}</p></blockquote>'

    def b_kode(self, b):
        return f'<pre>{e(b[1])}</pre>'

    def b_kalimat(self, b):
        return f'<p class="tesis">{ih(b[1])}</p>'

    def b_kartu(self, b):
        n = len(b[1])
        kol = 3 if n in (3, 5, 6) else min(n, 4) or 1
        isi = ''.join(
            f'<div class="kt" style="border-top-color:#{KARTU_WARNA[i % 6]}"><div class="kn" style="color:#{KARTU_WARNA[i % 6]}">{ih(v)}</div><div class="kl">{ih(l)}</div></div>'
            for i, (v, l) in enumerate(b[1]))
        return f'<div class="kartu k{kol}">{isi}</div>'

    def b_temuan(self, b):
        isi = ''.join(
            f'<div class="tm"><div class="tmk" style="background:#{KARTU_WARNA[i % 6]}">{i + 1}</div><div><b class="th">{ih(j)}</b>{self.blok_semua(bl)}</div></div>'
            for i, (j, bl) in enumerate(b[1]))
        return f'<div class="temuan">{isi}</div>'

    def b_keputusan(self, b):
        return ''.join(f'<div class="kep"><div class="kh">{ih(j)}</div>{self.blok_semua(bl)}</div>' for j, bl in b[1])

    def b_metode(self, b):
        return f'<div class="catatan"><span class="cl">Catatan metode</span>{self.blok_semua(b[1])}</div>'

    def b_tentang(self, b):
        return f'<div class="kotak-info"><b>Tentang kajian ini.</b>{self.blok_semua(b[1])}</div>'

    def b_aksi(self, b):
        n = len(b[1])
        kol = f'a{n if n <= 3 else 2}'
        isi = ''
        for i, (j, bl) in enumerate(b[1]):
            akan = ' akan' if i == n - 1 and n == 3 else ''
            isi += f'<div class="ak{akan}"><div class="akh">{ih(j)}</div><div class="isi">{self._aksi_isi(bl)}</div></div>'
        return f'<div class="aksi {kol}">{isi}</div>'

    def _aksi_isi(self, bl):
        out = ''
        for x in bl:
            if x[0] == 'list':
                out += '<ul>' + ''.join(f'<li>{ih(it["teks"])}</li>' for it in x[1]) + '</ul>'
            else:
                out += self.blok(x)
        return out

    def b_paradoks(self, b):
        d = b[1]
        meta = f'<div class="pd-m">{ih(d["meta"])}</div>' if d['meta'] else ''
        return (f'<div class="pd"><div class="pd-h"><span class="pd-k">{e(d["kode"])}</span><span class="pd-n">{ih(d["nama"])}</span></div>'
                f'{meta}<div class="pd-b">{self.blok_semua(d["blok"])}</div></div>')

    # ---------- dokumen ----------
    def sampul(self, tanggal):
        return f'''<section class="sampul">
<div class="sp-foto" style="background-image:url('{uri(K.FOTO_SAMPUL)}')">
 <div class="sp-lg"><img src="{uri(K.LOGO_BNPB)}"></div>
 <div class="sp-lg2"><img src="{uri(K.LOGO_KRIS)}"></div>
 <div class="sp-kredit">{e(K.FOTO_KREDIT)}</div>
</div>
<div class="sp-teks">
 <div class="sp-jenis">{e(K.LABEL)}</div>
 <h1 class="sp-judul">{e(K.JUDUL)}</h1>
 <div class="sp-sub">{e(K.ANAK)}</div>
 <div class="sp-garis"></div>
 <div class="sp-baris">
  <div class="sp-oleh">Disusun oleh<b>{e(K.OLEH)}</b></div>
 </div>
 <div class="pil-tgl">Jakarta, {e(tanggal)}</div>
 <div class="sp-kaki">&copy; {tanggal[-4:]} Badan Nasional Penanggulangan Bencana<br><i>Ketangguhan Bangsa dalam Menghadapi Bencana</i></div>
</div></section>'''

    def daftar_isi(self, entri):
        li = ''
        for kode, tg, teks in entri:
            if tg > K.TATA.get('toc_tingkat', 2):
                continue
            pg = self.toc.get(kode, '')
            li += f'<li class="t{tg}"><a href="#h-{kode}"><span class="tt">{e(teks)}</span><span class="dt"></span><em>{pg}</em></a></li>'
        return f'<section class="hal daftar"><div class="judul-daftar">Daftar Isi</div><ul class="toc">{li}</ul></section>'


def css():
    c = (K.MESIN / 'gaya.css').read_text(encoding='utf-8')
    if not K.TATA.get('bab_baru', True):
        c += ' .hal{page-break-before:auto;margin-top:18pt}.daftar{page-break-after:always;margin-top:0}'
    if K.TATA.get('tinggi_gambar_cm'):
        c += ' img.gbr{max-height:%smm}' % int(K.TATA['tinggi_gambar_cm'] * 10)
    return c.replace('{FONT_R}', uri(K.FONT['R'])).replace('{FONT_M}', uri(K.FONT['M'])).replace('{FONT_B}', uri(K.FONT['B']))


def bungkus(isi, judul=None):
    judul = judul or K.JUDUL
    return f'<!doctype html><html lang="id"><head><meta charset="utf-8"><title>{e(judul)}</title><style>{css()}</style></head><body>{isi}</body></html>'


def bangun(dokumen, toc, tanggal):
    """dokumen = [(nama, [blok])]; -> (html_sampul, html_isi, entri)"""
    p = Penyaji(toc)
    isi = ''
    global BAB
    for i, (nama, blok) in enumerate(dokumen, start=1):
        BAB = i
        # nomor penanda berurutan sesuai kemunculan
        isi += p.blok_semua(blok) + p.catatan_akhir(nama)
    if not K.TATA.get('bab_baru', True):
        # bab tidak memaksa halaman baru: kepala bab dan blok pertamanya tidak boleh terpisah halaman
        isi = re.sub(r'(<div class="bab"[^>]*>.*?</div>)(\s*<(p|div|figure)[ >].*?</\3>)',
                     r'<div style="break-inside:avoid">\1\2</div>', isi, flags=re.S)
    daftar = p.daftar_isi(p.entri) if K.TATA.get('daftar_isi', True) else ''
    isi = daftar + isi.replace('</section>', '', 1) + '</section>'
    # bagian pertama: isi diawali '</section><section class="hal">' sehingga buang penutup pertama
    return bungkus(p.sampul(tanggal)), bungkus(isi), p.entri
