"""Gambar 300 dpi untuk kedua dokumen: aset/alur.png (8 tahap) dan aset/linimasa.png (H-30 sampai H+30).

Pakai (dari folder ini): py gambar.py. Huruf Roboto, warna sama dengan bangun_docx.py (navy, oranye, abu).
Lebar 165 mm pada 300 dpi supaya tajam saat dicetak.
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

NAVY, ORANYE, TEKS, ABU, GARIS = "#0B1F33", "#E8792B", "#1D2733", "#5B6673", "#D5DCE4"
BIRU_MUDA, ORANYE_MUDA = "#EAF0F6", "#FDF0E6"
FASE = {"Penjajakan": "#2F6B9A", "Perumusan": "#1F8A70", "Pengesahan": "#E8792B", "Pelaksanaan": "#6B5B95"}
HURUF = Path("C:/Windows/Fonts")
ASET = Path(__file__).parent / "aset"
PX = 300 / 25.4          # piksel per mm
W = round(165 * PX)


HURUF_PENGGUNA = Path.home() / "AppData/Local/Microsoft/Windows/Fonts"


def f(uk, gaya="Regular"):
    nama = f"Roboto-{gaya}.ttf"
    jalur = next(p / nama for p in (HURUF, HURUF_PENGGUNA) if (p / nama).exists())
    return ImageFont.truetype(str(jalur), round(uk * 300 / 72))


def bungkus(d, teks, huruf, lebar):
    baris, kini = [], ""
    for kata in teks.split():
        coba = (kini + " " + kata).strip()
        if d.textlength(coba, font=huruf) <= lebar:
            kini = coba
        else:
            baris.append(kini); kini = kata
    return baris + [kini]


def tulis(d, xy, teks, huruf, warna, lebar, spasi=1.3):
    x, y = xy
    tinggi = huruf.size * spasi
    for b in bungkus(d, teks, huruf, lebar):
        d.text((x, y), b, font=huruf, fill=warna); y += tinggi
    return y


def panah(d, x, y0, y1, warna=GARIS, tebal=5):
    d.line((x, y0, x, y1 - 18), fill=warna, width=tebal)
    d.polygon([(x - 13, y1 - 22), (x + 13, y1 - 22), (x, y1)], fill=warna)


def alur():
    tahap = [
        ("Penjajakan", "Pemetaan dan pemilihan kampus", "Profil kampus dan 2 sampai 3 usulan program", "Ada pakar atau pusat studi yang cocok dengan ancaman di wilayahnya", "Minggu 1-2"),
        ("Penjajakan", "Kunjungan awal", "Notula, daftar minat, nama penghubung", "Pimpinan kampus setuju menunjuk tim kerja", "Minggu 3-4"),
        ("Penjajakan", "Tim kerja bersama", "Surat penunjukan tim, draf NK dikirim", "Biro HOK dan bagian hukum kampus sudah masuk tim", "Minggu 4-5"),
        ("Perumusan", "Lokakarya penyusunan program", "Matriks program, 1 sampai 3 program prioritas", "Unit BNPB pemilik program bersedia menjadi penanggung jawab", "Minggu 6-8"),
        ("Perumusan", "Finalisasi program dan pendanaan", "KAK, RAB, draf PKS, NK diparaf", "Sumber dana tertulis dan draf PKS selesai ditelaah kedua bagian hukum", "Minggu 9-11"),
        ("Pengesahan", "Studium generale dan penandatanganan", "NK bertanda tangan, PKS pertama bila siap", "NK sah", "Minggu 12-14"),
        ("Pengesahan", "Finalisasi PKS (closing)", "PKS bernomor, dicatat di JDIH, dana siap", "Kegiatan pertama dapat dimulai", "≤ 4 minggu sesudah acara"),
        ("Pelaksanaan", "Pelaksanaan dan evaluasi", "Laporan, evaluasi tahunan, PKS lanjutan", "Hasil evaluasi menentukan PKS berikutnya", "Sepanjang masa PKS"),
    ]
    xf, xk, wk, xs = 0, round(30 * PX), round(88 * PX), round(124 * PX)
    hk, jarak, y0 = round(19.5 * PX), round(6 * PX), round(9 * PX)
    H = y0 + len(tahap) * (hk + jarak) + round(2 * PX)
    im = Image.new("RGB", (W, H), "white"); d = ImageDraw.Draw(im)
    kepala = f(8, "Bold")
    d.text((xk, 0), "TAHAP DAN KELUARAN", font=kepala, fill=ABU)
    d.text((xs, 0), "LANJUT BILA", font=kepala, fill=ABU)
    d.text((xf, 0), "FASE", font=kepala, fill=ABU)
    # pita fase
    awal = {}
    for i, t in enumerate(tahap):
        awal.setdefault(t[0], [i, i])[1] = i
    for nama, (a, b) in awal.items():
        ya, yb = y0 + a * (hk + jarak), y0 + b * (hk + jarak) + hk
        d.rounded_rectangle((xf, ya, xf + round(24 * PX), yb), radius=22, fill=FASE[nama])
        hf = f(8.6, "Bold"); lb = d.textlength(nama, font=hf)
        d.text((xf + round(12 * PX) - lb / 2, (ya + yb) / 2 - hf.size / 2), nama, font=hf, fill="white")
    for i, (fase, judul, kel, syarat, minggu) in enumerate(tahap):
        y = y0 + i * (hk + jarak)
        tutup = i == 6
        d.rounded_rectangle((xk, y, xk + wk, y + hk), radius=26,
                            fill=ORANYE_MUDA if tutup else "white",
                            outline=ORANYE if tutup else GARIS, width=7 if tutup else 4)
        d.rectangle((xk + 4, y + 26, xk + 16, y + hk - 26), fill=FASE[fase])
        r = round(4.3 * PX); cx, cy = xk + round(10.5 * PX), y + hk / 2
        d.ellipse((cx - r, cy - r, cx + r, cy + r), fill=ORANYE if tutup else NAVY)
        hn = f(10.5, "Bold"); n = str(i + 1)
        d.text((cx - d.textlength(n, font=hn) / 2, cy - hn.size * 0.62), n, font=hn, fill="white")
        xt = xk + round(18 * PX); lt = wk - round(20 * PX)
        hj, hm, hs = f(9.6, "Bold"), f(7.4, "Medium"), f(8.4)
        d.text((xt, y + round(2.6 * PX)), minggu.upper(), font=hm, fill=ORANYE if tutup else ABU)
        yy = tulis(d, (xt, y + round(6.2 * PX)), judul, hj, NAVY, lt, 1.2)
        tulis(d, (xt, yy + 6), kel, hs, ABU, lt, 1.25)
        if i < len(tahap) - 1:
            panah(d, xk + wk / 2, y + hk + 4, y + hk + jarak - 2)
        # syarat lanjut
        d.line((xk + wk + 14, y + hk / 2, xs - round(4 * PX), y + hk / 2), fill=GARIS, width=4)
        cx2 = xs - round(2 * PX); r2 = round(2 * PX)
        d.ellipse((cx2 - r2, y + hk / 2 - r2, cx2 + r2, y + hk / 2 + r2), fill=ORANYE if tutup else "#1F8A70")
        d.line((cx2 - 12, y + hk / 2, cx2 - 3, y + hk / 2 + 9, cx2 + 12, y + hk / 2 - 9), fill="white", width=6)
        hs2 = f(8.6, "Bold" if tutup else "Regular")
        bar = bungkus(d, syarat, hs2, W - xs - round(6 * PX))
        ty = y + hk / 2 - len(bar) * hs2.size * 1.25 / 2
        tulis(d, (xs + round(2 * PX), ty), syarat, hs2, TEKS, W - xs - round(6 * PX), 1.25)
    im.save(ASET / "alur.png", dpi=(300, 300))


def linimasa():
    titik = [
        ("H-30", "Surat permohonan acara kepada unit kerja sama kampus", "Kampus menjawab kesediaan dan menunjuk ketua pelaksana."),
        ("H-21", "Tanggal, topik, dan draf NK disepakati", "Rapat persiapan pertama secara daring; draf NK dikirim ke bagian hukum kampus."),
        ("H-14", "Naskah NK final dan diparaf kedua pihak", "Undangan dikirim, rapat persiapan kedua, dan poster acara diterbitkan."),
        ("H-7", "Daftar tamu, latar panggung, dan paparan dikunci", "Rapat persiapan ketiga; manifes perjalanan dan pemesanan hotel selesai."),
        ("H-2", "Tim pendahulu tiba di lokasi", "Memeriksa auditorium, meja tanda tangan, peralatan, dan rute hotel ke kampus."),
        ("H-1", "Rombongan tiba dan gladi bersih", "Gladi seremoni penandatanganan dan uji paparan di auditorium."),
        ("Hari H", "Penandatanganan NK dan studium generale", "Disusul pertemuan terbatas pimpinan untuk menetapkan PKS pertama."),
        ("H+3", "Siaran pers bersama dan laporan kegiatan", "NK dicatat di JDIH BNPB; laporan disampaikan kepada Kepala BNPB."),
        ("H+14", "Rapat pertama penyusunan PKS", "Unit BNPB dan fakultas penanggung jawab menyusun kegiatan, keluaran, dan jadwal."),
        ("H+30", "PKS pertama ditandatangani", "Pejabat eselon I atau II BNPB dengan wakil rektor, dekan, atau ketua LPPM."),
    ]
    xp, wp, xg, xt = round(13 * PX), round(19 * PX), round(42 * PX), round(50 * PX)
    tb, y0 = round(15.5 * PX), round(3 * PX)
    H = y0 + len(titik) * tb + round(1 * PX)
    im = Image.new("RGB", (W, H), "white"); d = ImageDraw.Draw(im)
    # label fase di kiri
    hf = f(7.6, "Bold")
    for nama, a, b, w in (("PERSIAPAN", 0, 5, "#2F6B9A"), ("TINDAK LANJUT", 7, 9, "#1F8A70")):
        ya, yb = y0 + a * tb, y0 + b * tb + round(10 * PX)
        d.rounded_rectangle((0, ya, round(4 * PX), yb), radius=14, fill=w)
        lap = Image.new("RGBA", (round(yb - ya), hf.size + 10), (0, 0, 0, 0))
        ImageDraw.Draw(lap).text(((yb - ya) / 2 - d.textlength(nama, font=hf) / 2, 0), nama, font=hf, fill=w)
        lap = lap.rotate(90, expand=True)
        im.paste(lap, (round(5.5 * PX), round(ya)), lap)
    yh = y0 + 6 * tb
    d.rounded_rectangle((xp - round(3 * PX), yh - round(2.2 * PX), W, yh + tb - round(2.6 * PX)), radius=28, fill=ORANYE_MUDA)
    garis_a, garis_b = y0 + round(5 * PX), y0 + (len(titik) - 1) * tb + round(5 * PX)
    d.line((xg, garis_a, xg, garis_b), fill=GARIS, width=6)
    for i, (h, judul, ket) in enumerate(titik):
        y = y0 + i * tb; cy = y + round(5 * PX)
        hari = h == "Hari H"; sesudah = h.startswith("H+")
        warna = ORANYE if hari else ("#1F8A70" if sesudah else "#2F6B9A")
        hl = f(9.4, "Bold")
        d.rounded_rectangle((xp, cy - round(3.4 * PX), xp + wp, cy + round(3.4 * PX)), radius=40, fill=warna)
        d.text((xp + wp / 2 - d.textlength(h, font=hl) / 2, cy - hl.size * 0.6), h, font=hl, fill="white")
        r = round((3 if hari else 2.1) * PX)
        d.ellipse((xg - r, cy - r, xg + r, cy + r), fill="white", outline=warna, width=9)
        if hari:
            d.ellipse((xg - r / 2.4, cy - r / 2.4, xg + r / 2.4, cy + r / 2.4), fill=warna)
        hj, hs = f(9.8, "Bold"), f(8.6)
        yy = tulis(d, (xt, cy - hj.size * 0.65), judul, hj, NAVY, W - xt - 20, 1.2)
        tulis(d, (xt, yy + 4), ket, hs, ABU, W - xt - 20, 1.25)
    im.save(ASET / "linimasa.png", dpi=(300, 300))


if __name__ == "__main__":
    alur(); linimasa(); print("ok")
