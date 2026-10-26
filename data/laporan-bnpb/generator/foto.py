"""Slot foto untuk deck BNPB (Buku Pegangan, Selera presentasi > Komponen > Slot foto; keputusan pemilik 25 Okt 2026, dari skill
ppt-format-meti photo/sectionDivider). Dipakai hanya untuk sisa ruang slide yang isinya tidak penuh. Kotak membulat radius panel (~4,3 pt),
foto dipotong cover lewat srcRect (tidak digepengkan), kredit 7 pt di pojok kanan bawah, keterangan opsional di pita navy 051C2C 20%.
Tanpa foto tidak ada slot: pemanggil wajib punya berkas (deck tidak dikirim dengan placeholder). Stdlib saja."""
import itertools, struct

_id = itertools.count(40000)
RADIUS = 54610   # 4,3 pt


def ukuran(path):
    """(lebar, tinggi) piksel JPEG/PNG dari header."""
    b = open(path, 'rb').read()
    if b[:8] == b'\x89PNG\r\n\x1a\n':
        return struct.unpack('>II', b[16:24])
    i = 2
    while i < len(b):
        if b[i] != 0xFF: i += 1; continue
        m = b[i + 1]; n = struct.unpack('>H', b[i + 2:i + 4])[0]
        if m in (0xC0, 0xC1, 0xC2):
            h, w = struct.unpack('>HH', b[i + 5:i + 9]); return w, h
        i += 2 + n
    raise ValueError(f'ukuran gambar tidak terbaca: {path}')


def potong(wi, hi, w, h):
    """srcRect (l, t, r, b) dalam 1/1000 persen agar foto wi x hi mengisi kotak w x h tanpa gepeng (cover, potong tengah)."""
    rf, rk = wi / hi, w / h
    if rf > rk:
        s = round((1 - rk / rf) / 2 * 100000); return s, 0, s, 0
    s = round((1 - rf / rk) / 2 * 100000); return 0, s, 0, s


def _tx(x, y, w, h, t, sz, warna, tebal=False, al='r'):
    return (f'<p:sp><p:nvSpPr><p:cNvPr id="{next(_id)}" name="T"/><p:cNvSpPr txBox="1"/><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm><a:off x="{int(x)}" y="{int(y)}"/>'
            f'<a:ext cx="{int(w)}" cy="{int(h)}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/></p:spPr><p:txBody>'
            f'<a:bodyPr wrap="none" lIns="0" tIns="0" rIns="0" bIns="0" anchor="ctr"/><a:lstStyle/><a:p><a:pPr algn="{al}"/><a:r>'
            f'<a:rPr lang="id-ID" sz="{sz}" b="{1 if tebal else 0}" dirty="0"><a:solidFill><a:srgbClr val="{warna}"/></a:solidFill>'
            f'<a:latin typeface="Roboto"/><a:ea typeface="Roboto"/><a:cs typeface="Roboto"/></a:rPr><a:t>{t}</a:t></a:r></a:p></p:txBody></p:sp>')


def slot(x, y, w, h, rid, path, kredit, keterangan=None):
    """XML slot foto. rid = relasi gambar yang sudah dipasang pemanggil; kredit wajib (penulis, lisensi)."""
    assert kredit, 'foto tanpa kredit'
    l, t, r, b = potong(*ukuran(path), w, h)
    adj = round(RADIUS / min(w, h) * 100000)
    o = (f'<p:pic><p:nvPicPr><p:cNvPr id="{next(_id)}" name="Foto"/><p:cNvPicPr><a:picLocks noChangeAspect="1"/></p:cNvPicPr><p:nvPr/></p:nvPicPr>'
         f'<p:blipFill><a:blip r:embed="{rid}"/><a:srcRect l="{l}" t="{t}" r="{r}" b="{b}"/><a:stretch><a:fillRect/></a:stretch></p:blipFill>'
         f'<p:spPr><a:xfrm><a:off x="{int(x)}" y="{int(y)}"/><a:ext cx="{int(w)}" cy="{int(h)}"/></a:xfrm>'
         f'<a:prstGeom prst="roundRect"><a:avLst><a:gd name="adj" fmla="val {adj}"/></a:avLst></a:prstGeom></p:spPr></p:pic>')
    pita = 0
    if keterangan:
        pita = 228600   # 18 pt
        o += (f'<p:sp><p:nvSpPr><p:cNvPr id="{next(_id)}" name="Pita foto"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm><a:off x="{int(x)}" y="{int(y + h - pita)}"/>'
              f'<a:ext cx="{int(w)}" cy="{pita}"/></a:xfrm><a:custGeom><a:avLst/><a:gdLst/><a:ahLst/><a:cxnLst/><a:rect l="0" t="0" r="r" b="b"/><a:pathLst>'
              f'<a:path w="{int(w)}" h="{pita}"><a:moveTo><a:pt x="0" y="0"/></a:moveTo><a:lnTo><a:pt x="{int(w)}" y="0"/></a:lnTo>'
              f'<a:lnTo><a:pt x="{int(w)}" y="{pita - RADIUS}"/></a:lnTo><a:arcTo wR="{RADIUS}" hR="{RADIUS}" stAng="0" swAng="5400000"/>'
              f'<a:lnTo><a:pt x="{RADIUS}" y="{pita}"/></a:lnTo><a:arcTo wR="{RADIUS}" hR="{RADIUS}" stAng="5400000" swAng="5400000"/><a:close/></a:path></a:pathLst></a:custGeom>'
              f'<a:solidFill><a:srgbClr val="051C2C"><a:alpha val="80000"/></a:srgbClr></a:solidFill><a:ln><a:noFill/></a:ln></p:spPr></p:sp>')
        o += _tx(x + 76200, y + h - pita, w - 152400, pita, keterangan, 900, 'FFFFFF', True, 'ctr')
    o += _tx(x + 76200, y + 45720, w - 152400, 101600, kredit, 700, 'FFFFFF')
    return o


if __name__ == '__main__':
    assert potong(2000, 1000, 100, 100) == (25000, 0, 25000, 0)      # lebar: potong kiri-kanan
    assert potong(1000, 2000, 200, 100) == (0, 37500, 0, 37500)      # tinggi: potong atas-bawah
    assert potong(1600, 900, 160, 90) == (0, 0, 0, 0)
    print('foto: uji lolos')
