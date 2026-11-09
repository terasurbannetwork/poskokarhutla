"""Baris KRIS (Kolaborasi, Responsif, Integratif, Sinkronisasi) di sampul laporan hasil mesin deck (2 Nov 2026, atasan pemilik:
"tambahin depan atau belakang terkait KRIS, kayak jadi icon gitu").

Dipasang sesudah lewat_deck.bingkai(): slide pertama (sampul) mendapat empat butir ikon berlingkar navy + label, huruf depan oranye
supaya singkatannya terbaca. Letak: di ruang kosong antara pil tanggal dan kaki "(c) 2026 ..." sampul, rata kiri dengan teks sampul.
Ikon dari generator/harian_ikon.mjs (<kerja>/ik/<nama>-putih.png).
"""
import os, re, zipfile

KRIS = (('Kolaborasi', 'kolaborasi'), ('Responsif', 'responsif'), ('Integratif', 'integratif'), ('Sinkronisasi', 'sinkronisasi'))
NAVY, ORG, INK = '051C2C', 'D9600B', '1A1A1A'
X0, Y0, D, LANGKAH = 548640, 5641848, 292608, 1417320   # EMU: kiri teks sampul, di bawah pil tanggal; lingkaran 0,32 in; jarak butir


def _rpr(sz, b, c):
    return (f'<a:rPr lang="id-ID" sz="{sz}"{" b=\"1\"" if b else ""} dirty="0"><a:solidFill><a:srgbClr val="{c}"/></a:solidFill>'
            '<a:latin typeface="Roboto"/><a:ea typeface="Roboto"/><a:cs typeface="Roboto"/></a:rPr>')


def pasang(pptx, ik_dir):
    z = zipfile.ZipFile(pptx); F = {n: z.read(n) for n in z.namelist()}; z.close()
    pres, rel = F['ppt/presentation.xml'].decode(), F['ppt/_rels/presentation.xml.rels'].decode()
    rid = re.search(r'<p:sldId [^>]*r:id="([^"]+)"', pres)[1]
    tgt = re.search(rf'<Relationship [^>]*Id="{rid}"[^>]*Target="([^"]+)"', rel) or re.search(rf'<Relationship [^>]*Target="([^"]+)"[^>]*Id="{rid}"', rel)
    sl = 'ppt/' + tgt[1].lstrip('/').removeprefix('ppt/'); slr = sl.replace('slides/', 'slides/_rels/') + '.rels'
    x, r = F[sl].decode(), F[slr].decode()
    if 'name="KRIS"' in x: return pptx   # sudah terpasang
    nid = 9000; o = ''
    for i, (lab, ik) in enumerate(KRIS):
        xi = X0 + i * LANGKAH; rid_ = f'rIdKris{i}'; media = f'kris-{ik}.png'
        F[f'ppt/media/{media}'] = open(os.path.join(ik_dir, f'{ik}-putih.png'), 'rb').read()
        r = r.replace('</Relationships>', f'<Relationship Id="{rid_}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/{media}"/></Relationships>')
        o += (f'<p:sp><p:nvSpPr><p:cNvPr id="{nid}" name="KRIS"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm><a:off x="{xi}" y="{Y0}"/><a:ext cx="{D}" cy="{D}"/></a:xfrm>'
              f'<a:prstGeom prst="ellipse"><a:avLst/></a:prstGeom><a:solidFill><a:srgbClr val="{NAVY}"/></a:solidFill><a:ln><a:noFill/></a:ln></p:spPr></p:sp>')
        g = int(D * .56)
        o += (f'<p:pic><p:nvPicPr><p:cNvPr id="{nid + 1}" name="KRIS"/><p:cNvPicPr><a:picLocks noChangeAspect="1"/></p:cNvPicPr><p:nvPr/></p:nvPicPr>'
              f'<p:blipFill><a:blip r:embed="{rid_}"/><a:stretch><a:fillRect/></a:stretch></p:blipFill><p:spPr><a:xfrm><a:off x="{xi + (D - g) // 2}" y="{Y0 + (D - g) // 2}"/>'
              f'<a:ext cx="{g}" cy="{g}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></p:spPr></p:pic>')
        o += (f'<p:sp><p:nvSpPr><p:cNvPr id="{nid + 2}" name="KRIS"/><p:cNvSpPr txBox="1"/><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm><a:off x="{xi + D + 73152}" y="{Y0}"/>'
              f'<a:ext cx="{LANGKAH - D - 109728}" cy="{D}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/></p:spPr>'
              f'<p:txBody><a:bodyPr wrap="none" lIns="0" tIns="0" rIns="0" bIns="0" anchor="ctr"/><a:lstStyle/><a:p><a:pPr algn="l"/>'
              f'<a:r>{_rpr(1100, True, ORG)}<a:t>{lab[0]}</a:t></a:r><a:r>{_rpr(1100, True, INK)}<a:t>{lab[1:]}</a:t></a:r></a:p></p:txBody></p:sp>')
        nid += 3
    F[sl] = x.replace('</p:spTree>', o + '</p:spTree>', 1).encode(); F[slr] = r.encode()
    ct = F['[Content_Types].xml']
    if b'Extension="png"' not in ct:
        F['[Content_Types].xml'] = ct.replace(b'<Default ', b'<Default Extension="png" ContentType="image/png"/><Default ', 1)
    t = pptx + '.tmp'
    with zipfile.ZipFile(t, 'w', zipfile.ZIP_DEFLATED) as zo:
        for n in ['[Content_Types].xml'] + [n for n in F if n != '[Content_Types].xml']: zo.writestr(n, F[n])
    os.replace(t, pptx)
    return pptx


LOGO = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'sampul', 'media', 'kris-logo.png')


def _slide(F, posisi):
    """(jalur slide, jalur rels) untuk slide ke-posisi dalam urutan presentasi (0 = sampul, -1 = penutup)."""
    pres, rel = F['ppt/presentation.xml'].decode(), F['ppt/_rels/presentation.xml.rels'].decode()
    rid = re.findall(r'<p:sldId [^>]*r:id="([^"]+)"', pres)[posisi]
    tgt = re.search(rf'<Relationship [^>]*Id="{rid}"[^>]*Target="([^"]+)"', rel) or re.search(rf'<Relationship [^>]*Target="([^"]+)"[^>]*Id="{rid}"', rel)
    sl = 'ppt/' + tgt[1].lstrip('/').removeprefix('ppt/')
    return sl, sl.replace('slides/', 'slides/_rels/') + '.rels'


def _tulis(pptx, F):
    t = pptx + '.tmp'
    with zipfile.ZipFile(t, 'w', zipfile.ZIP_DEFLATED) as zo:
        for n in ['[Content_Types].xml'] + [n for n in F if n != '[Content_Types].xml']: zo.writestr(n, F[n])
    os.replace(t, pptx)


def besar_logo_bnpb(pptx, faktor=1.3, posisi=(0, -1)):
    """2 Nov 2026 (pemilik): logo BNPB kiri atas sampul dan penutup "agak gedein". Gambar pertama di pojok kiri atas
    (x < 1,6 juta, y < 1,2 juta EMU) diperbesar, sudut kiri atasnya tetap supaya rata kiri dengan teks."""
    z = zipfile.ZipFile(pptx); F = {n: z.read(n) for n in z.namelist()}; z.close()
    for ps in posisi:
        sl, _ = _slide(F, ps); x_ = F[sl].decode()
        if 'name="BNPB besar"' in x_: continue
        for m in re.finditer(r'<p:pic>.*?</p:pic>', x_, re.S):
            g = re.search(r'<a:off x="(\d+)" y="(\d+)"/>(\s*)<a:ext cx="(\d+)" cy="(\d+)"/>', m[0])
            if g and int(g[1]) < 1600000 and int(g[2]) < 1200000 and 'KRIS' not in m[0]:
                b = m[0].replace(g[0], f'<a:off x="{g[1]}" y="{g[2]}"/>{g[3]}<a:ext cx="{int(int(g[4]) * faktor)}" cy="{int(int(g[5]) * faktor)}"/>', 1)
                b = re.sub(r'(<p:cNvPr [^>]*name=")[^"]*"', r'\1BNPB besar"', b, count=1)
                x_ = x_.replace(m[0], b, 1); break
        F[sl] = x_.encode()
    _tulis(pptx, F)
    return pptx


def pasang_logo_semua(pptx):
    """Logo KRIS di sampul dan penutup (2 Nov pemilik: "buat untuk di cover penutup juga")."""
    for ps in (0, -1): pasang_logo(pptx, posisi=ps)
    return pptx


def pasang_logo(pptx, logo=LOGO, x=1737360, y=566928, tinggi=777240, posisi=0):   # x, y, tinggi = cadangan bila kotak BerAKHLAK tidak ketemu
    """2 Nov 2026 (pemilik): logo KRIS resmi (gambar kiriman atasan, latar dibuat transparan) di sampul, menggantikan baris ikon
    buatan sendiri. Letak: rata kiri dengan teks sampul, di antara pil tanggal dan kaki "(c) 2026 ...", tinggi ~0,51 in."""
    from PIL import Image
    w0, h0 = Image.open(logo).size; lebar = int(tinggi * w0 / h0)
    z = zipfile.ZipFile(pptx); F = {n: z.read(n) for n in z.namelist()}; z.close()
    sl, slr = _slide(F, posisi)
    x_, r = F[sl].decode(), F[slr].decode()
    if 'name="KRIS logo"' in x_: return pptx
    F['ppt/media/kris-logo.png'] = open(logo, 'rb').read()
    r = r.replace('</Relationships>', '<Relationship Id="rIdKrisLogo" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/kris-logo.png"/></Relationships>')
    # 2 Nov pemilik: dalam kotak putih bersudut membulat, tepat di kiri kotak BerAKHLAK (tinggi dan posisi vertikal sama).
    # Kotak BerAKHLAK = bentuk roundRect di kanan atas sampul hasil mesin; bila tidak ketemu, logo tetap di kiri atas.
    kotak_ = ''
    for m in re.finditer(r'<p:sp>(?:(?!</p:sp>).)*?<a:off x="(\d+)" y="(\d+)"/>\s*<a:ext cx="(\d+)" cy="(\d+)"/>(?:(?!</p:sp>).)*?prst="roundRect".*?</p:sp>', x_, re.S):
        bx, by, bw, bh = map(int, m.groups()[:4])
        if bx > 8000000 and by < 1000000:
            pad = int(bh * .2); tinggi = bh - 2 * pad; lebar = int(tinggi * w0 / h0); kw = lebar + 2 * int(bh * .28)
            kx = bx - 91440 - kw; x, y = kx + (kw - lebar) // 2, by + pad
            kotak_ = (f'<p:sp><p:nvSpPr><p:cNvPr id="9101" name="KRIS kotak"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm><a:off x="{kx}" y="{by}"/>'
                      f'<a:ext cx="{kw}" cy="{bh}"/></a:xfrm><a:prstGeom prst="roundRect"><a:avLst><a:gd name="adj" fmla="val 16000"/></a:avLst></a:prstGeom>'
                      '<a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill><a:ln><a:noFill/></a:ln></p:spPr></p:sp>')
            break
    pic = (f'<p:pic><p:nvPicPr><p:cNvPr id="9100" name="KRIS logo" descr="KRIS: Kolaborasi, Responsif, Integratif, Sinkronisasi"/><p:cNvPicPr><a:picLocks noChangeAspect="1"/></p:cNvPicPr><p:nvPr/></p:nvPicPr>'
           f'<p:blipFill><a:blip r:embed="rIdKrisLogo"/><a:stretch><a:fillRect/></a:stretch></p:blipFill><p:spPr><a:xfrm><a:off x="{x}" y="{y}"/><a:ext cx="{lebar}" cy="{tinggi}"/></a:xfrm>'
           '<a:prstGeom prst="rect"><a:avLst/></a:prstGeom></p:spPr></p:pic>')
    F[sl] = x_.replace('</p:spTree>', kotak_ + pic + '</p:spTree>', 1).encode(); F[slr] = r.encode()
    ct = F['[Content_Types].xml']
    if b'Extension="png"' not in ct:
        F['[Content_Types].xml'] = ct.replace(b'<Default ', b'<Default Extension="png" ContentType="image/png"/><Default ', 1)
    t = pptx + '.tmp'
    with zipfile.ZipFile(t, 'w', zipfile.ZIP_DEFLATED) as zo:
        for n in ['[Content_Types].xml'] + [n for n in F if n != '[Content_Types].xml']: zo.writestr(n, F[n])
    os.replace(t, pptx)
    return pptx


# ---- Logo KRIS di tiap slide deck Penanganan (pemilik 8 Nov 2026: "biasakan pakai logo kris"; deck ini tanpa sampul dan penutup, 3 Nov).
X_BNPB, TENGAH_LOGO, T_KRIS, X_JUDUL, Y_JUDUL, SZ_JUDUL = 11295583, 585216, 320040, 548640, 274320, 2200   # EMU; logo BNPB hasil deck.py format penanganan


def logo_resmi():
    return os.path.join(os.path.dirname(os.path.abspath(__file__)), 'sampul', 'media', 'kris-logo.png')   # salinan repo, identik dengan assets/logo-bersama/kris.png di skill (di sana tidak ada kris-logo.png)


def pasang_isi(pptx, logo=None):
    """Logo KRIS resmi di kiri logo BNPB pada tiap slide isi, tinggi 0,35 inci sejajar tengah logo (sama dengan KRIS_ISI harian). Kotak judul berhenti
    sebelum logo dan huruf judul disamakan supaya judul terpanjang tetap satu baris. Dipanggil lewat_deck.bingkai sebelum deck.py, jadi ikut gerbang QA."""
    from PIL import Image
    logo = logo or logo_resmi()
    if not os.path.exists(logo): raise RuntimeError(f'logo KRIS tidak ditemukan: {logo}; setel DECK_BNPB')
    w0, h0 = Image.open(logo).size; lebar = int(T_KRIS * w0 / h0); kx = X_BNPB - 137160 - lebar; ky = TENGAH_LOGO - T_KRIS // 2
    z = zipfile.ZipFile(pptx); F = {n: z.read(n) for n in z.namelist()}; z.close()
    F['ppt/media/kris-isi.png'] = open(logo, 'rb').read()
    for sl in sorted(n for n in F if re.fullmatch(r'ppt/slides/slide\d+\.xml', n)):
        x = F[sl].decode()
        if 'name="KRIS isi"' in x: continue
        pola = rf'<p:sp>(?:(?!</p:sp>).)*?<a:off x="{X_JUDUL}" y="{Y_JUDUL}"/>(?:(?!</p:sp>).)*?</p:sp>'
        m = re.search(pola, x, re.S)
        if not m: raise RuntimeError(f'kotak judul tidak ditemukan di {sl}: tata letak Penanganan berubah, sesuaikan kris.pasang_isi')
        j = re.sub(r'(<a:off x="\d+" y="\d+"/>\s*<a:ext cx=")\d+', rf'\g<1>{kx - 91440 - X_JUDUL}', m[0], count=1)
        x = x.replace(m[0], re.sub(r'sz="\d+"', f'sz="{SZ_JUDUL}"', j), 1)
        pic = (f'<p:pic><p:nvPicPr><p:cNvPr id="9200" name="KRIS isi" descr="KRIS: Kolaborasi, Responsif, Integratif, Sinkronisasi"/><p:cNvPicPr><a:picLocks noChangeAspect="1"/></p:cNvPicPr><p:nvPr/></p:nvPicPr>'
               f'<p:blipFill><a:blip r:embed="rIdKrisIsi"/><a:stretch><a:fillRect/></a:stretch></p:blipFill><p:spPr><a:xfrm><a:off x="{kx}" y="{ky}"/><a:ext cx="{lebar}" cy="{T_KRIS}"/></a:xfrm>'
               '<a:prstGeom prst="rect"><a:avLst/></a:prstGeom></p:spPr></p:pic>')
        F[sl] = x.replace('</p:spTree>', pic + '</p:spTree>', 1).encode()
        rl = sl.replace('slides/', 'slides/_rels/') + '.rels'
        F[rl] = F[rl].decode().replace('</Relationships>', '<Relationship Id="rIdKrisIsi" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/kris-isi.png"/></Relationships>').encode()
    if b'Extension="png"' not in F['[Content_Types].xml']:
        F['[Content_Types].xml'] = F['[Content_Types].xml'].replace(b'<Default ', b'<Default Extension="png" ContentType="image/png"/><Default ', 1)
    _tulis(pptx, F)
    return pptx


def cek_isi(pptx):
    """Gerbang hasil akhir: tiap slide wajib memuat gambar logo KRIS resmi (dikenali dari byte gambarnya; deck.py boleh mengganti nama bentuk dan berkas media)."""
    z = zipfile.ZipFile(pptx); F = {n: z.read(n) for n in z.namelist()}; z.close()
    resmi = open(logo_resmi(), 'rb').read(); kurang = []
    for sl in sorted(n for n in F if re.fullmatch(r'ppt/slides/slide\d+\.xml', n)):
        rel = F[sl.replace('slides/', 'slides/_rels/') + '.rels'].decode()
        if not any(F.get('ppt/' + t.replace('../', '')) == resmi for t in re.findall(r'Target="(\.\./media/[^"]+)"', rel)): kurang.append(sl)
    if kurang: raise RuntimeError(f'logo KRIS hilang di {kurang}')
    return pptx
