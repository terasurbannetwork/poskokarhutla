#!/usr/bin/env python3
"""Lembar bukti kontrak: token tema.json (warna, skala, tipografi) dan contoh NASKAH-SPEK.md yang diurai
naskah.py, ditulis sebagai HTML A4 bermargin tema. Bukan desain dokumen final; hanya bukti bahwa kedua
kontrak terbaca utuh. Pakai: python3 lembar.py keluaran/lembar.html && node pdf.mjs keluaran/lembar.html
"""
import html
import os
from itertools import combinations
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import naskah as N  # noqa: E402
from tema import de, kontras, muat, warna  # noqa: E402

T = muat()
W, TY = T['warna'], T['tipografi_docx']
e = html.escape


def runs(rs):
    out = []
    for r in rs:
        s = e(r['s'])
        if r['j'] == 'catatan':
            s = f'<sup>{s}</sup>'
        if r.get('tebal'):
            s = f'<b>{s}</b>'
        if r.get('miring'):
            s = f'<i>{s}</i>'
        out.append(s)
    return ''.join(out)


def gaya(nama):
    g = TY[nama]
    w = g.get('warna', 'teks')
    return (f"font-size:{g['ukuran_pt']}pt;font-weight:{700 if g.get('bobot') == 'bold' else 400};"
            f"color:{warna(T, w)};{'font-style:italic;' if g.get('miring') else ''}"
            f"{'letter-spacing:%spt;' % g['spasi_huruf_pt'] if 'spasi_huruf_pt' in g else ''}")


def tabel(tb, kunci_lampiran=False):
    kep = ''.join(f'<th>{e(h)}</th>' for h in tb['kepala'])
    badan = ''.join('<tr>' + ''.join(f'<td class="{tb["rata"][i] if i < len(tb["rata"]) else ""}">{runs(c)}</td>'
                                     for i, c in enumerate(row)) + '</tr>' for row in tb['baris'])
    if tb.get('total'):
        badan += '<tr class="total">' + ''.join(f'<td>{e(x)}</td>' for x in tb['total']) + '</tr>'
    return f'<table><thead><tr>{kep}</tr></thead><tbody>{badan}</tbody></table>'


def blok(bs):
    out = []
    for b in bs:
        j = b['jenis']
        if j == 'judul':
            if b['tingkat'] == 1:
                out.append(f'<div class="aksen"></div><div style="{gaya("label_bab")}">BAB {e(str(b["nomor"]))}</div>'
                           f'<h1 style="{gaya("judul_bab")}">{e(b["teks"].upper())}</h1>'
                           f'<p style="{gaya("pertanyaan_bab")}">{e(meta["pertanyaan"])}</p>')
            else:
                g = {2: 'subbab', 3: 'subsubbab', 4: 'tingkat4'}[b['tingkat']]
                nomor = f'{b["nomor"]} ' if b.get('nomor') and b['tingkat'] < 4 else ''
                out.append(f'<h{b["tingkat"]} style="{gaya(g)};margin-top:{TY[g].get("sebelum_pt", 6)}pt">{e(nomor + b["teks"])}</h{b["tingkat"]}>')
        elif j == 'paragraf':
            lab = f'<b>{e(b["label"])}:</b> ' if b['label'] else ''
            out.append(f'<p class="isi">{lab}{runs(b["isi"])}</p>')
        elif j == 'daftar':
            tag = 'ol' if b.get('nomor') else 'ul'
            out.append(f'<{tag}>' + ''.join(f'<li>{runs(x["isi"])}{blok([x["anak"]]) if "anak" in x else ""}</li>'
                                            for x in b['butir']) + f'</{tag}>')
        elif j == 'tabel':
            out.append(tabel(b))
        elif j == 'halaman-baru':
            out.append('<div class="pisah">{{halaman-baru}}</div>')
        elif j == 'direktif':
            out.append(direktif(b))
    return ''.join(out)


def direktif(d):
    n, a, t = d['nama'], d['atribut'], d['teks']
    isi = blok(d['isi'])
    kep = f'<div class="ket"><b>{e(d["label"])}</b> {runs(t["judul"])}</div>' if d.get('label') else ''
    sumber = ''
    if 'sumber' in t:
        sumber = f'<div class="sumber"><b>Sumber:</b> {runs(t["sumber"])}' + (
            f'; data per {runs(t["data_per"])}' if 'data_per' in t else '') + (
            f'; {e(T["kosakata"]["keyakinan"][a["keyakinan"].split(";")[0]]["label"])}' if a.get('keyakinan', '').split(';')[0]
            in T['kosakata']['keyakinan'] else '') + '</div>' + (
            f'<div class="sumber"><b>Catatan:</b> {runs(t["catatan"])}</div>' if 'catatan' in t else '')
    lain = {k_: v for k_, v in t.items() if k_ not in ('judul', 'sumber', 'data_per', 'catatan', 'dasar', 'lembaga', 'pil')}
    if lain and n not in ('rek',):
        isi = ''.join(f'<div class="kecil"><b>{e(k_)}:</b> {runs(v)}</div>' for k_, v in lain.items()) + isi
    if n == 'gambar':
        isi = f'<div class="gbr">{e(a["jenis"])}: {e(a["berkas"])} (belum dirender)</div>' + isi
    elif n == 'kartu-angka':
        tb = next(b for b in d['isi'] if b['jenis'] == 'tabel')
        kartu = ''.join(f'<div class="kartu"><div class="nilai" style="color:{warna(T, N.polos(w) or "navy")}">{runs(v)}'
                        f' <small>{runs(s)}</small></div><div class="lab">{runs(lb)}</div><div class="ikon">{e(N.polos(ik))}</div></div>'
                        for v, s, lb, ik, w in tb['baris'])
        pil = T['kosakata']['nada_pil'][a.get('nada', 'data')]
        isi = (f'<span class="pil" style="background:{warna(T, pil.get("pil_isi", "kertas"))}">{e(a["pil"])}</span>'
               f'<div class="kisi">{kartu}</div>')
        return f'<div class="grup">{isi}{sumber}</div>'
    elif n == 'skenario':
        kel = W['kategori'][d['keluarga']]
        anak = ''.join(f'<div class="anak"><span class="nm">{x["nama"]}</span>{blok(x["isi"])}</div>'
                       for x in d['isi'] if x['jenis'] == 'direktif')
        isi = (f'<div class="pita" style="background:{W["tint"][kel["tint"]]["pita"]}">{e(T["kosakata"]["jenis_bencana"][a["jenis"]])}'
               f', varian {d["varian"]}, kemungkinan kelas {e(a.get("kemungkinan", ""))}</div>'
               f'<p class="kecil"><b>Dasar:</b> {runs(t["dasar"])}</p>{anak}<p class="kecil"><b>Lembaga:</b> {runs(t["lembaga"])}</p>')
    elif n == 'matriks-rekomendasi':
        isi = ''.join(f'<div class="rek"><span class="no">{x["nomor"]}</span> <b>{runs(x["teks"]["langkah"])}</b> '
                      f'<span class="pilg">{e(T["kosakata"]["status_usulan"][x["atribut"]["status"]]["label"])}</span> '
                      f'<span class="pilg">{e(T["kosakata"]["horizon"].get(x["atribut"]["waktu"], x["atribut"]["waktu"]))}</span>'
                      f'<br><span class="kecil">{runs(x["teks"]["unit"])}; {runs(x["teks"]["kl"])}</span>{blok(x["isi"])}'
                      f'<div class="kecil"><b>Indikator selesai:</b> {runs(x["teks"]["indikator"])}. '
                      f'<b>Dasar:</b> {runs(x["teks"]["dasar"])}</div></div>'
                      for x in d['isi'])
    kotak = T['kotak'].get(n, {})
    st = ''
    if 'warna_latar' in kotak:
        st += f'background:{warna(T, kotak["warna_latar"])};'
    if 'warna_garis_kiri' in kotak:
        st += f'border-left:3pt solid {warna(T, kotak["warna_garis_kiri"])};'
    judul_kotak = f'<div class="jk">{runs(t["judul"])}</div>' if 'judul' in t and not d.get('label') else ''
    return f'<div class="d" style="{st}"><span class="nm">{n}</span>{kep}{judul_kotak}{isi}{sumber}</div>'


def lembar_tema():
    sw = lambda h, nm: (f'<div class="sw"><span style="background:{h}"></span>{e(nm)}<br><code>{h}</code></div>')
    inti = ''.join(sw(v['hex'], k) for g in ('inti', 'aksen') for k, v in W[g].items())
    tint = ''.join(sw(v[x], f'{k}.{x}') for k, v in W['tint'].items() if isinstance(v, dict) for x in v)
    kat = {k: v for k, v in W['kategori'].items() if isinstance(v, dict)}
    kats = ''.join(sw(v['hex'], v['label']) for v in kat.values())
    ramps = ''.join(f'<div class="ramp"><b>{k}</b>' + ''.join(f'<span style="background:{h}"></span>' for h in v['kelas'])
                    + '</div>' for k, v in W['skala'].items() if isinstance(v, dict) and 'kelas' in v and k != 'irbi')
    irbi = W['skala']['irbi']
    irbi_h = ''.join(f'<div class="sw"><span style="background:{W["skala"][irbi["ramp"]]["kelas"][i - 1]}"></span>{lb}</div>'
                     for i, lb in zip(irbi['kelas'], irbi['label']))
    tipo = ''.join(f'<div style="{gaya(k)};{"background:" + warna(T, "navy") + ";" if TY[k].get("warna") == "kertas" else ""}">'
                   f'{k} {TY[k]["ukuran_pt"]} pt</div>' for k in ('judul_bab', 'subbab', 'subsubbab', 'isi', 'keterangan',
                                                               'sumber', 'kepala_tabel', 'catatan_kaki'))
    k_min = min(de(a['hex'], b['hex']) for a, b in combinations(kat.values(), 2))
    return (f'<h1 style="{gaya("judul_bab")}">LEMBAR KONTRAK TEMA</h1>'
            f'<p class="isi">Dibaca dari tema.json versi {T["versi"]}. CIEDE2000 terkecil antar enam kategori {N.fmt_id(k_min, 1)}; '
            f'kontras teks-3 di putih {N.fmt_id(kontras(warna(T, "teks-3"), "#FFFFFF"), 1)}:1.</p>'
            f'<h3>Inti dan aksen</h3><div class="sws">{inti}</div><h3>Tint</h3><div class="sws">{tint}</div>'
            f'<h3>Kategori bencana</h3><div class="sws">{kats}</div><h3>Skala lima kelas</h3>{ramps}'
            f'<h3>Kelas IRBI (KEPUTUSAN T8)</h3><div class="sws">{irbi_h}</div><h3>Tipografi DOCX</h3>{tipo}')


def css():
    m = T['halaman']['margin_cm']
    fonts = ''.join(f'@font-face{{font-family:Roboto;font-weight:{w};src:url("file://{os.path.expanduser(p)}")}}'
                    for w, p in ((400, T['font']['berkas']['regular']), (500, T['font']['berkas']['medium']),
                                 (700, T['font']['berkas']['bold'])))
    c = lambda k: warna(T, k)
    return fonts + f'''
@page{{size:A4;margin:{m['atas']}cm {m['kanan']}cm {m['bawah']}cm {m['kiri']}cm}}
body{{font-family:Roboto;color:{c('teks')};font-size:{TY['isi']['ukuran_pt']}pt;line-height:{TY['isi']['spasi_baris']};margin:0}}
.isi{{text-align:justify;margin:0 0 {TY['isi']['sesudah_pt']}pt}} h1,h2,h3,h4{{margin:6pt 0}}
h3{{font-size:11.5pt;color:{c('teks-2')}}}
.aksen{{width:12mm;border-top:2pt solid {c('oranye')};margin-bottom:4pt}}
table{{border-collapse:collapse;width:100%;font-size:{TY['isi_tabel']['ukuran_pt']}pt;margin:4pt 0}}
th{{background:{c('navy')};color:#FFFFFF;font-size:{TY['kepala_tabel']['ukuran_pt']}pt;letter-spacing:0.8pt;padding:3pt;text-align:center}}
td{{border-bottom:0.5pt solid {c('garis')};padding:2pt 3pt;vertical-align:top}} td.kanan{{text-align:right}}
tr.total td{{background:{c('navy')};color:#FFFFFF;font-weight:700}}
.ket{{font-size:9pt;text-align:center;margin:12pt 0 4pt}} .ket b{{color:{c('navy')}}}
.sumber{{font-size:8.5pt;color:{c('teks-3')};margin:3pt 0 0}} .kecil{{font-size:9pt;margin:2pt 0}}
.d{{border:0.75pt solid {c('garis')};padding:7pt;margin:8pt 0;position:relative;break-inside:avoid-page}}
.nm{{position:absolute;right:4pt;top:2pt;font-size:7pt;color:{c('teks-3')};letter-spacing:0.8pt}}
.anak{{position:relative;border-top:0.5pt solid {c('garis')};padding-top:8pt;margin-top:4pt}}
.jk{{font-weight:700;margin-bottom:4pt}} .gbr{{background:{c('tanpa-data')};border:0.75pt dashed {c('batas')};height:28mm;
display:flex;align-items:center;justify-content:center;font-size:8.5pt;color:{c('teks-3')}}}
.grup{{background:{c('tint.netral.muda')};padding:7pt;margin:8pt 0}} .kisi{{display:flex;gap:6pt;margin-top:6pt}}
.kartu{{background:#FFFFFF;border:0.75pt solid {c('garis')};padding:5pt;flex:1}} .nilai{{font-size:18pt;font-weight:700}}
.nilai small{{font-size:9pt;font-weight:400}} .lab{{font-size:8.5pt;color:{c('teks-3')}}} .ikon{{font-size:7pt;color:{c('teks-3')}}}
.pil{{color:#FFFFFF;font-size:8pt;font-weight:700;letter-spacing:0.8pt;padding:1pt 6pt;border-radius:7pt}}
.pilg{{border:0.75pt solid {c('navy')};font-size:8pt;padding:0 5pt;border-radius:7pt}}
.pita{{padding:4pt 6pt;font-weight:700;margin:12pt -7pt 4pt}} .rek{{border-bottom:0.5pt solid {c('garis')};padding:4pt 0}}
.no{{display:inline-block;background:{c('navy')};color:#FFFFFF;border-radius:50%;width:16pt;text-align:center;font-weight:700}}
.pisah{{break-after:page;font-size:7pt;color:{c('teks-3')}}} .baru{{break-before:page}}
.sws{{display:flex;flex-wrap:wrap;gap:3pt}} .sw{{width:19mm;font-size:6.5pt;line-height:1.15}}
ul ul{{list-style:lower-alpha}} code{{font-family:Roboto}} .sw span{{display:block;height:5mm;border:0.5pt solid {c('garis')}}} .ramp span{{display:inline-block;width:14mm;height:6mm}}
.ramp b{{display:inline-block;width:16mm;font-size:8pt}} sup{{font-size:7pt}} .kaki{{font-size:8pt;border-top:0.5pt solid {c('garis')};margin-top:10pt}}
'''


if __name__ == '__main__':
    k = N.Konteks()
    lengkap, _ = N.contoh_spek()
    n = N.baca_teks(lengkap, k, 'NASKAH-SPEK.md#contoh')
    N.nomori([n])
    meta = n['meta']
    kaki = ''.join(f'<div><sup>{c["nomor"]}</sup> {runs(c["isi"])}</div>' for c in n['catatan_kaki'])
    pus = ''.join(f'<p class="isi" style="padding-left:1.25cm;text-indent:-1.25cm">{runs(r)}</p>' for _, r in k.daftar_pustaka())
    keluar = Path(sys.argv[1] if len(sys.argv) > 1 else Path(__file__).parent / 'keluaran/lembar.html')
    keluar.parent.mkdir(parents=True, exist_ok=True)
    keluar.write_text(f'<!doctype html><html lang="id"><head><meta charset="utf-8"><title>Lembar kontrak</title>'
                      f'<style>{css()}</style></head><body>{lembar_tema()}<div class="baru">{blok(n["blok"])}</div>'
                      f'<div class="kaki">{kaki}</div><h3>Daftar Pustaka (APA 7)</h3>{pus}'
                      f'<p class="sumber">{len(k.manifest)} angka disuntik dari data/angka.json dan CSV.</p></body></html>',
                      encoding='utf-8')
    print(keluar)
