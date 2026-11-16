"""Revisi 1 Paparan Kebencanaan Sumatera Utara dan Aceh 161126, catatan pemeriksaan Bang Ghozi (16 Nov 2026).

Deck dibangun di luar repo (tidak ada generatornya), jadi disunting di berkasnya (aturan pemilik).
Asli di <folder>/sumber/, hasil di <folder>/Revisi 1/ (PPTX + PDF lewat PowerPoint).

  python perbaiki.py sumut|aceh

Butir:
 1. Slide 4: rerata korban tahunan banjir + longsor 2008-2024 dari DIBI
    (data/kajian-bnpb/data/dibi/rekap_provinsi_tahunan.csv, meninggal + hilang, cakupan bencana)
    Sumut 417 jiwa / 17 th = 24,5; Aceh 141 / 17 = 8,3. Kartu dan subjudul dibuat cocok.
 2+5. Slide 13: tabel Data Karhutla ditambah baris "Lainnya (N kab/kota)" (luas = judul - 12 teratas) dan Jumlah.
    N = kab/kota berluas > 0 di public/data/peta_karhutla_kab.json dikurangi 12. Hotspot per kab di luar 12 teratas
    tidak tersedia di repo, jadi kolomnya "–".
 3. Slide 6: status darurat yang sudah lewat tanggal berakhirnya tanpa laporan baru di WA Koordalops
    (data/laporan-bnpb/harian/2026-11/*/wa-koordalops.txt) diberi keterangan "belum ada pembaruan".
 4. Slide 7: angka kecamatan dihapus dari judul (kolom KEC. tidak lengkap); total KEC. jadi batas bawah.
"""
import copy, os, subprocess, sys
from pptx import Presentation
from pptx.util import Emu

DIR = os.path.dirname(os.path.abspath(__file__))
PAP = os.path.dirname(DIR)

KONF = {
    'sumut': dict(
        folder=DIR, nama='Paparan Kebencanaan Sumatera Utara 161126',
        rerata_lama='25', rerata_baru='24,5', kali_lama='sekitar 18', kali_baru='lebih dari 17',
        status=[('9 Nov 2026', 'belum ada pembaruan')],
        kec_total='≥1', luas_total=6564, lainnya_n=17),
    'aceh': dict(
        folder=os.path.join(PAP, 'kebencanaan-aceh-2026-11-16'), nama='Paparan Kebencanaan Aceh 161126',
        rerata_lama='8', rerata_baru='8,3', kali_lama='sekitar 72', kali_baru='sekitar 72',
        status=[('12 Nov 2026', 'belum ada pembaruan')],
        kec_total='≥21', luas_total=11914, lainnya_n=11),
}


def ribu(n):
    return f'{n:,}'.replace(',', '.')


def teks(sh):
    return sh.text_frame.text.strip() if sh.has_text_frame else None


def ganti_teks(sh, baru):
    """Ganti isi kotak satu-run tanpa mengubah format run pertama."""
    p = sh.text_frame.paragraphs[0]
    p.runs[0].text = baru
    for r in p.runs[1:]:
        r._r.getparent().remove(r._r)


def butir1(s, k):
    shapes = list(s.shapes)
    for sh in shapes:
        if sh.has_text_frame:
            for r in (r for p in sh.text_frame.paragraphs for r in p.runs):
                if r.text == k['kali_lama']:
                    r.text = k['kali_baru']
    i = next(i for i, sh in enumerate(shapes) if teks(sh) == 'Rerata tahunan')
    nilai = next(sh for sh in shapes[i:] if teks(sh) == k['rerata_lama'])
    lama, baru = k['rerata_lama'], k['rerata_baru']
    ganti_teks(nilai, baru)
    # kotak selebar teks (wrap none): lebarkan ke kiri supaya tidak menimpa satuan "jiwa"
    kanan = nilai.left + nilai.width
    lebar = int(nilai.width / len(lama) * (len(baru) - 0.5 * baru.count(',')))
    nilai.left, nilai.width = kanan - lebar, lebar
    from pptx.enum.text import PP_ALIGN
    nilai.text_frame.paragraphs[0].alignment = PP_ALIGN.RIGHT


def butir3(s, k):
    for lama, catat in k['status']:
        sh = next(x for x in s.shapes if teks(x) == lama)
        p0 = sh.text_frame.paragraphs[0]
        r0 = p0.runs[0]
        r0.font.size = Emu(int(r0.font.size * 0.92))
        p1 = copy.deepcopy(p0._p)
        p0._p.addnext(p1)
        p = sh.text_frame.paragraphs[1]
        r = p.runs[0]
        r.text = catat
        r.font.size = Emu(int(r0.font.size * 0.85))
        r.font.italic = True
        from pptx.dml.color import RGBColor
        r.font.color.rgb = RGBColor(0xC8, 0x10, 0x2E)
        sh.text_frame.paragraphs[0].line_spacing = 0.9
        p.line_spacing = 0.9


def butir4(s, k):
    for sh in s.shapes:
        if sh.has_text_frame and 'kecamatan, ' in sh.text_frame.text:
            runs = sh.text_frame.paragraphs[0].runs
            j = next(i for i, r in enumerate(runs) if r.text == ' kecamatan, ')
            runs[j - 1]._r.getparent().remove(runs[j - 1]._r)
            runs[j]._r.getparent().remove(runs[j]._r)
    tot = next(sh for sh in s.shapes if (teks(sh) or '').startswith('Total '))
    kec = min((x for x in s.shapes if x.has_text_frame and abs(x.top - tot.top) < 50000 and x.left > tot.left + 1000000),
              key=lambda x: x.left)
    ganti_teks(kec, k['kec_total'])


def butir5(s, k):
    shapes = list(s.shapes)
    kepala = next(sh for sh in shapes if sh.name == 'Pita kepala tabel' and sh.left > 7000000)
    x0, top0 = kepala.left, kepala.top + kepala.height
    pita = next(sh for sh in shapes if sh.name == 'Pita kolom utama' and sh.left > 7000000)
    lama = 261514
    nb = 14
    batas = next(sh for sh in shapes if sh.shape_type == 9 and sh.left < 1000000 and 5300000 < sh.top < 5600000).top
    pitch = int((batas - 60000 - top0) / nb)
    f = pitch / lama
    tabel = [sh for sh in shapes if sh.left >= x0 and top0 - 1000 <= sh.top <= top0 + 12 * lama + 1000 and sh is not pita]
    for sh in tabel:
        if sh.shape_type == 9:
            sh.top = top0 + round((sh.top - top0) / lama) * pitch
        else:
            rel = sh.top - top0
            row = rel // lama
            sh.top = top0 + row * pitch + int((rel - row * lama) * f)
            sh.height = int(sh.height * f) if sh.height >= lama - 1000 else sh.height
    # baris 12 sebagai cetakan
    b12 = [sh for sh in tabel if top0 + 11 * pitch - 1000 <= sh.top < top0 + 12 * pitch - 1000]
    teks12 = sorted([sh for sh in b12 if sh.has_text_frame and sh.shape_type == 17], key=lambda x: x.left)
    garis12 = [sh for sh in b12 if sh.shape_type == 9]
    luas12 = sum(int(teks(x).replace('.', '')) for x in tabel
                 if x.has_text_frame and x.shape_type == 17 and x.left == teks12[2].left)
    lain = k['luas_total'] - luas12
    tree = s.shapes._spTree

    def salin(sh, dy):
        el = copy.deepcopy(sh._element)
        tree.append(el)
        baru = s.shapes[-1]
        baru.top = sh.top + dy
        return baru

    # baris 13: Lainnya
    for g in garis12:
        salin(g, pitch)
    isi13 = [f'Lainnya ({k["lainnya_n"]} kab/kota)', '–', ribu(lain)]
    for sh, t in zip(teks12, isi13):
        b = salin(sh, pitch)
        ganti_teks(b, t)
        if t.startswith('Lainnya'):
            b.text_frame.paragraphs[0].runs[0].font.bold = False
    # baris 14: Jumlah, latar navy seperti kepala tabel
    bg = salin(kepala, 0)
    bg.top = top0 + 13 * pitch
    bg.height = pitch
    isi14 = ['Jumlah', '–', ribu(k['luas_total'])]
    from pptx.dml.color import RGBColor
    for sh, t in zip(teks12, isi14):
        b = salin(sh, 2 * pitch)
        ganti_teks(b, t)
        r = b.text_frame.paragraphs[0].runs[0]
        r.font.bold = True
        r.font.color.rgb = RGBColor(0xFF, 0xFF, 0xFF)
    pita.top = top0
    pita.height = 13 * pitch
    # garis bawah lama (di bawah baris 12) dipindah ke bawah tabel
    for sh in tabel:
        if sh.shape_type == 9 and sh.top == top0 + 12 * pitch:
            sh.top = top0 + 14 * pitch
    return luas12, lain


def pdf(pptx, out):
    ps = (f"$p = New-Object -ComObject PowerPoint.Application; "
          f"$d = $p.Presentations.Open('{pptx}', $true, $false, $false); "
          f"$d.SaveAs('{out}', 32); $d.Close(); $p.Quit()")
    subprocess.run(['powershell', '-NoProfile', '-Command', ps], check=True)


def main(kunci):
    k = KONF[kunci]
    src = os.path.join(k['folder'], 'sumber', k['nama'] + '.pptx')
    od = os.path.join(k['folder'], 'Revisi 1')
    os.makedirs(od, exist_ok=True)
    prs = Presentation(src)
    sl = prs.slides
    butir1(sl[3], k)
    butir3(sl[5], k)
    butir4(sl[6], k)
    l12, lain = butir5(sl[12], k)
    out = os.path.join(od, k['nama'] + '.pptx')
    prs.save(out)
    pdf(out, out[:-5] + '.pdf')
    print(kunci, 'luas 12 teratas', l12, 'lainnya', lain, '->', out)


if __name__ == '__main__':
    for a in sys.argv[1:] or ['sumut', 'aceh']:
        main(a)
