"""Lampiran peralatan: ilustrasi teknik (SVG gambar sendiri) dan spesifikasi kelas kinerja dari PRD SIPPA §6.1 dan §6.5.
Spesifikasi ditulis sebagai kelas "atau setara", tanpa merek (PRD baris larangan nama pihak lain)."""

G = 'stroke="#334155" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"'
F = 'fill="#f1f5f9"'
O = 'fill="#fed7aa"'
B = 'fill="#bfdbfe"'


def svg(isi):
    return f'<svg viewBox="0 0 220 130" class="alat">{isi}</svg>'


GAMBAR = {
    "pompa": svg(f'''<rect x="40" y="30" width="140" height="70" rx="6" fill="none" {G}/>
<rect x="55" y="40" width="62" height="44" rx="4" {F} {G}/><path d="M62 50 h48 M62 58 h48 M62 66 h48 M62 74 h48" {G}/>
<circle cx="145" cy="64" r="22" {O} {G}/><circle cx="145" cy="64" r="7" fill="#fff" {G}/>
<path d="M167 64 h28 v-8 h8 v20 h-8 v-8" fill="#fff" {G}/><path d="M145 42 v-14 h-10 v-8 h20 v8 h-10" fill="#fff" {G}/>
<path d="M40 100 l-6 14 M180 100 l6 14 M28 114 h164" {G}/><text x="196" y="52" class="tk">keluar</text><text x="128" y="16" class="tk">isap</text>'''),
    "isap": svg(f'''<path d="M20 30 C70 30 80 90 140 92" fill="none" stroke="#334155" stroke-width="16" stroke-linecap="round"/>
<path d="M20 30 C70 30 80 90 140 92" fill="none" stroke="#e2e8f0" stroke-width="11" stroke-dasharray="3 3"/>
<rect x="140" y="76" width="56" height="32" rx="4" {F} {G}/><path d="M150 82 v20 M160 82 v20 M170 82 v20 M180 82 v20 M190 82 v20" stroke="#64748b" stroke-width="1.6"/>
<path d="M200 84 l10 8 l-10 8 z" {O} {G}/><text x="150" y="124" class="tk">saringan + katup kaki</text><text x="10" y="18" class="tk">ke pompa</text>'''),
    "layflat": svg(f'''<circle cx="60" cy="65" r="44" {B} {G}/><circle cx="60" cy="65" r="34" fill="none" {G}/><circle cx="60" cy="65" r="24" fill="none" {G}/><circle cx="60" cy="65" r="12" fill="#fff" {G}/>
<path d="M60 109 L150 109 L150 97 L60 97" {B} {G}/><rect x="150" y="90" width="22" height="26" rx="3" {O} {G}/><path d="M172 95 h10 v16 h-10 M182 99 h8 M182 107 h8" {G}/>
<text x="118" y="84" class="tk">kopling Storz</text><text x="2" y="14" class="tk">20 m per gulung</text>'''),
    "ypembagi": svg(f'''<path d="M20 60 h60 l40 -26 h40 M80 70 l40 26 h40" fill="none" stroke="#334155" stroke-width="16" stroke-linecap="round"/>
<path d="M20 60 h60 l40 -26 h40 M80 70 l40 26 h40" fill="none" stroke="#bfdbfe" stroke-width="11" stroke-linecap="round"/>
<rect x="128" y="22" width="14" height="24" rx="2" {O} {G}/><rect x="128" y="84" width="14" height="24" rx="2" {O} {G}/><path d="M135 22 v-10 h14 M135 108 v10 h14" {G}/>
<text x="6" y="88" class="tk">masuk 2,5 in</text><text x="164" y="30" class="tk">ke lance</text><text x="164" y="112" class="tk">ke nozzle</text>'''),
    "lance": svg(f'''<path d="M30 20 h40 M50 20 v8" {G}/><rect x="44" y="28" width="12" height="12" rx="2" {O} {G}/><circle cx="72" cy="34" r="9" fill="#fff" {G}/><path d="M72 34 l5 -4" {G}/>
<rect x="46" y="40" width="8" height="74" {F} {G}/><path d="M46 114 l4 12 l4 -12" {O} {G}/>
<path d="M54 100 l6 -2 M54 106 l6 -2 M46 100 l-6 -2 M46 106 l-6 -2" stroke="#0369a1" stroke-width="1.8"/>
<path d="M60 60 h6 M60 80 h6 M60 96 h6" {G}/><text x="70" y="63" class="tk">30 cm</text><text x="70" y="83" class="tk">60 cm</text><text x="70" y="99" class="tk">100 cm</text>
<text x="86" y="38" class="tk">katup dan pengukur tekanan</text><text x="96" y="122" class="tk">ujung berlubang, 1,5 m</text>'''),
    "nozzle": svg(f'''<path d="M20 50 h50 v30 h-50 z" {F} {G}/><path d="M70 46 h24 l50 12 v14 l-50 12 h-24 z" {O} {G}/><path d="M90 46 v38" {G}/>
<path d="M150 58 l40 -18 M150 65 l46 0 M150 72 l40 18" stroke="#0369a1" stroke-width="2" stroke-dasharray="4 4"/><text x="40" y="108" class="tk">ring putar: pancar lurus atau kabut</text>'''),
    "manometer": svg(f'''<circle cx="110" cy="58" r="42" {F} {G}/><circle cx="110" cy="58" r="34" fill="#fff" {G}/>
<path d="M84 76 A34 34 0 1 1 136 76" fill="none" stroke="#94a3b8" stroke-width="2"/><path d="M110 58 L130 40" stroke="#ea580c" stroke-width="3"/><circle cx="110" cy="58" r="4" fill="#334155"/>
<text x="80" y="88" class="tk">0</text><text x="134" y="88" class="tk">10</text><text x="102" y="34" class="tk">bar</text><rect x="102" y="100" width="16" height="20" {F} {G}/>'''),
    "termometer": svg(f'''<rect x="20" y="30" width="56" height="70" rx="8" {F} {G}/><rect x="28" y="40" width="40" height="22" rx="2" fill="#fff" {G}/><text x="33" y="56" class="tk b">42,5°</text>
<circle cx="38" cy="78" r="5" {O} {G}/><circle cx="58" cy="78" r="5" fill="#fff" {G}/><path d="M76 65 h18" {G}/><rect x="94" y="62" width="120" height="6" {F} {G}/>
<path d="M106 62 v-6 M130 62 v-6 M154 62 v-6 M202 62 v-6" {G}/><text x="98" y="52" class="tk">10</text><text x="122" y="52" class="tk">30</text><text x="146" y="52" class="tk">50</text><text x="192" y="52" class="tk">100 cm</text>
<text x="94" y="92" class="tk">batang tusuk baja tahan karat</text>'''),
    "bor": svg(f'''<path d="M60 18 h100 M110 18 v12" {G}/><rect x="104" y="30" width="12" height="54" {F} {G}/>
<path d="M98 84 h24 v34 a12 6 0 0 1 -24 0 z" {O} {G}/><path d="M110 84 v40" stroke="#334155" stroke-width="1.4" stroke-dasharray="3 3"/>
<text x="130" y="100" class="tk">tabung setengah</text><text x="130" y="112" class="tk">pengambil contoh</text><text x="124" y="52" class="tk">batang sambung 1 m</text>'''),
    "meteran": svg(f'''<circle cx="50" cy="60" r="32" {O} {G}/><circle cx="50" cy="60" r="10" fill="#fff" {G}/><path d="M78 74 h60" stroke="#facc15" stroke-width="7"/><path d="M78 74 h60" {G} fill="none"/>
<path d="M150 40 v74 M176 40 v74 M202 40 v74" stroke="#92400e" stroke-width="5"/><path d="M150 50 h52 M150 96 h52" stroke="#16a34a" stroke-width="1.8"/>
<text x="146" y="128" class="tk">patok dan tali</text>'''),
    "hp": svg(f'''<rect x="40" y="20" width="56" height="96" rx="8" {F} {G}/><rect x="47" y="32" width="42" height="68" rx="2" fill="#fff" {G}/>
<path d="M53 44 h30 M53 54 h30 M53 64 h20" stroke="#94a3b8" stroke-width="3"/><rect x="128" y="40" width="44" height="76" rx="6" {F} {G}/>
<path d="M140 40 v-24" stroke="#334155" stroke-width="4"/><rect x="136" y="52" width="28" height="18" rx="2" fill="#fff" {G}/><circle cx="150" cy="92" r="9" {O} {G}/>
<text x="38" y="128" class="tk">HP /pipa</text><text x="122" y="128" class="tk">radio genggam</text>'''),
    "jerigen": svg(f'''<path d="M70 30 h70 l20 18 v66 h-90 z" fill="#fecaca" {G}/><rect x="84" y="36" width="34" height="12" rx="4" fill="#fff" {G}/>
<path d="M140 30 l12 -12 h12 v10" {G}/><path d="M84 66 l42 34 M126 66 l-42 34" stroke="#b91c1c" stroke-width="1.6" opacity=".5"/><text x="88" y="124" class="tk">20 liter</text>'''),
    "servis": svg(f'''<path d="M30 100 l60 -60" stroke="#334155" stroke-width="9" stroke-linecap="round"/><circle cx="96" cy="34" r="14" {F} {G}/><path d="M92 26 l12 12" stroke="#fff" stroke-width="7"/>
<rect x="128" y="30" width="14" height="40" rx="2" {F} {G}/><path d="M135 70 v18 M130 88 h10 v10 h-10 z" {G}/><circle cx="182" cy="86" r="22" fill="none" {G}/><rect x="176" y="58" width="12" height="10" {O} {G}/>
<text x="114" y="122" class="tk">busi, klem, kunci</text>'''),
    "apd": svg(f'''<path d="M20 60 q30 -26 60 0 q-4 26 -30 28 q-26 -2 -30 -28 z" {F} {G}/><path d="M20 60 l-10 -6 M80 60 l10 -6" {G}/>
<rect x="104" y="44" width="72" height="22" rx="10" fill="#e0f2fe" {G}/><path d="M140 44 v22" {G}/>
<path d="M120 84 h26 v26 h24 v14 h-50 z" fill="#475569" {G}/><path d="M182 80 h20 v34 h-26 v-18 z" {O} {G}/><text x="22" y="104" class="tk">masker</text><text x="110" y="38" class="tk">kacamata</text>'''),
    "p3k": svg(f'''<rect x="30" y="40" width="80" height="60" rx="6" fill="#fff" {G}/><path d="M60 50 h20 v12 h12 v20 h-12 v12 h-20 v-12 h-12 v-20 h12 z" fill="#ef4444"/>
<path d="M150 30 h20 v10 l8 10 v66 h-36 v-66 l8 -10 z" {B} {G}/><text x="146" y="126" class="tk">air minum</text>'''),
    "pelampung": svg(f'''<path d="M70 20 h24 l10 16 l10 -16 h24 l18 30 v64 h-104 v-64 z" fill="#fb923c" {G}/><path d="M104 36 v78" {G}/>
<path d="M60 66 h92 M60 86 h92" stroke="#334155" stroke-width="4"/><rect x="98" y="62" width="12" height="8" fill="#fff" {G}/><rect x="98" y="82" width="12" height="8" fill="#fff" {G}/>'''),
}

# (kunci gambar, nama, fungsi, [spesifikasi], jumlah per lokasi)
ALAT = [
    ("pompa", "Pompa portabel", "Mengisap air dari parit, kanal, atau sungai dan mendorongnya lewat selang ke petak.",
     ["1.000–1.300 liter/menit pada 6–8 bar (yang ada di Daops, BPBD)",
      "Kit SIPPA berikutnya: 1.500 liter/menit pada 10 bar, atau setara",
      "Bensin RON 91 atau lebih, ± 2–5 liter per jam",
      "Isap 3 inci, keluar 2,5 inci; dipikul 2–4 orang"],
     "1; selang panjang tambah 1–2 pompa"),
    ("isap", "Selang isap dengan saringan", "Menghubungkan pompa ke air tanpa menyedot lumpur dan sampah.",
     ["Selang isap 3 inci, dinding kaku tidak kempis, panjang 3 m",
      "Saringan kasar lubang ± 5 mm",
      "Katup kaki satu arah supaya air tidak turun saat pompa berhenti",
      "Pompa paling tinggi 3,5 m di atas permukaan air"],
     "1 set per pompa"),
    ("layflat", "Selang layflat 2,5 inci", "Mengalirkan air dari pompa ke petak; satu jalur saja.",
     ["Diameter dalam 65 mm (2,5 inci), lapis karet atau nitril",
      "Tekanan kerja 16 bar atau lebih, diuji 1,5 kali tekanan kerja",
      "20 m per gulung, ± 8 kg per gulung",
      "Kopling Storz 65 dengan karet perapat, pasang tanpa baut"],
     "Sesuai panjang jalur, termasuk 2 gulung cadangan (lihat tabel tiap lokasi)"),
    ("ypembagi", "Y-pembagi berkatup", "Membagi satu selang menjadi dua cabang: ke lance dan ke nozzle.",
     ["Masuk 2,5 inci Storz, keluar 2 × 1,5 inci",
      "Katup di tiap cabang untuk membuka dan menutup sendiri-sendiri",
      "Tekanan kerja 16 bar atau lebih",
      "Dipasang ± 15 m sebelum petak"],
     "1"),
    ("lance", "Lance injeksi", "Ditusukkan ke gambut untuk menyuntik air langsung ke bara di bawah permukaan.",
     ["Pipa baja tahan karat SS316 atau galvanis, 1,5 inci, panjang 1,5 m",
      "Ujung runcing berlubang; ukuran lubang final dari uji bengkel (contoh 8 lubang 2–2,5 mm)",
      "Katup bola dan pengukur tekanan di kepala lance",
      "Debit 15–40 liter/menit pada 2–4 bar"],
     "2 untuk pilot, boleh sampai 8"),
    ("nozzle", "Nozzle semprot", "Menyemprot permukaan di petak pembanding (cara biasa).",
     ["Nozzle 1,5 inci, bisa diatur pancar lurus atau kabut",
      "Debit bisa diatur; catat menit dan setelan selama menyemprot",
      "Tekanan kerja sama dengan selang cabang"],
     "1"),
    ("manometer", "Pengukur tekanan (manometer)", "Membaca tekanan air di pompa dan di kepala lance.",
     ["Rentang 0–10 bar, jarum berisi gliserin (tahan getar)",
      "Ulir 1/4 inci, dipasang di keluaran pompa dan di kepala lance",
      "Dibaca dan dicatat tiap 10 menit"],
     "1 di pompa, 1 di tiap lance"),
    ("termometer", "Termometer tusuk gambut", "Mengukur suhu tanah gambut untuk tahu bara masih menyala atau sudah padam.",
     ["Sensor termokopel tipe K, layar digital",
      "Batang tusuk baja tahan karat, panjang 1 m atau lebih, bertanda 10, 30, 50, 100 cm",
      "Rentang sampai 400 °C atau lebih, ketelitian ± 2 °C",
      "Padam bila semua titik di bawah 40 °C"],
     "2"),
    ("bor", "Bor gambut", "Mengambil contoh tanah untuk mengukur tebal gambut di tiap petak.",
     ["Tabung setengah silinder untuk contoh gambut tidak teraduk",
      "Batang sambung 1 m, bisa disambung sampai 5–6 m",
      "Gagang T untuk diputar dengan tangan"],
     "1"),
    ("meteran", "Meteran, patok, dan tali", "Memasang 4 petak 10 × 10 m dan menandai titik ukur suhu.",
     ["Meteran gulung 50 m bahan fiberglass",
      "16 patok kayu atau PVC ± 1 m, diberi nomor",
      "Tali rafia untuk batas petak"],
     "1 meteran, 16 patok, 1 gulung tali"),
    ("hp", "HP dan radio", "Mencatat data di aplikasi /pipa dan berkomunikasi antar regu.",
     ["HP Android dengan aplikasi /pipa (bisa tanpa sinyal) dan GPS",
      "Power bank 20.000 mAh",
      "Radio genggam untuk pompa, pompa tambahan, dan petak",
      "Formulir kertas cadangan"],
     "1 set per regu, radio 1 per pos"),
    ("jerigen", "Bensin dan jerigen", "Bahan bakar pompa selama uji.",
     ["Jerigen 20 liter khusus BBM, tertutup rapat",
      "Bensin RON 91 atau lebih",
      "Corong dan saringan; disimpan 10 m atau lebih dari bara"],
     "20 liter per pompa per hari"),
    ("servis", "Alat servis", "Perbaikan kecil di lokasi supaya uji tidak berhenti.",
     ["Kunci pompa dan kunci busi, busi cadangan, oli",
      "Klem selang, selang tambal, sealtape, karet perapat kopling cadangan",
      "Kain lap dan sarung tangan kerja"],
     "1 set"),
    ("apd", "Alat pelindung diri", "Melindungi regu dari asap, panas, dan lubang bara.",
     ["Masker N95 atau P100",
      "Kacamata pelindung, helm, baju lengan panjang",
      "Sarung tangan kulit, sepatu bot karet"],
     "1 set per orang"),
    ("p3k", "P3K dan air minum", "Pertolongan pertama dan mencegah kepanasan.",
     ["Kotak P3K dengan obat luka bakar dan cairan pencuci mata",
      "Air minum 3 liter per orang per hari"],
     "1 kotak per regu"),
    ("pelampung", "Pelampung", "Wajib saat bekerja di tepi kanal, sungai, atau di perahu.",
     ["Rompi pelampung berwarna terang dengan tali pengikat",
      "Dipakai sejak naik perahu sampai turun"],
     "1 per orang bila ada kanal, sungai, atau perahu"),
]


import json, os
FOTO = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "foto/pilihan.json")))


def gambar(k):
    f = FOTO.get(k)
    if not f:
        return f'<div class="gb">{GAMBAR[k]}</div><p class="kredit">Gambar teknik SIPPA</p>'
    artis = f["artis"] if not f["artis"].startswith("No machine") else "lihat halaman Commons"
    return (f'<div class="gb foto"><img src="{f["file"]}" alt="{nama_alt(k)}"></div>'
            f'<p class="kredit">Foto: <a href="{f["halaman"]}">{artis[:40]}</a>, {f["lisensi"]}, Wikimedia Commons</p>')


def nama_alt(k):
    return next(a[1] for a in ALAT if a[0] == k)


def kartu(k, nama, fungsi, spek, jumlah):
    li = "".join(f"<li>{x}</li>" for x in spek)
    return (f'<div class="kartu alatk"><div class="kj">{nama}</div>{gambar(k)}'
            f'<p class="fungsi">{fungsi}</p><ul>{li}</ul><p class="jml"><b>Jumlah:</b> {jumlah}</p></div>')


def halaman_lampiran(ACUAN):
    per = 8
    hal = []
    for i in range(0, len(ALAT), per):
        isi = "".join(kartu(*a) for a in ALAT[i:i + per])
        no = i // per + 1
        hal.append(f'<section class="hal lanskap"><header class="kepala"><div class="pil abu">L</div><div class="kj1">'
                   f'<div class="sup">LAMPIRAN, HALAMAN {no} DARI {(len(ALAT) + per - 1) // per}</div><h1>Peralatan: gambar dan spesifikasi</h1></div>'
                   f'<div class="kanan">BNPB SIPPA<br><span>Spesifikasi kelas kinerja, atau setara. Foto hanya contoh bentuk, bukan merek yang diwajibkan.</span></div></header>'
                   f'<div class="isi-alat">{isi}</div></section>')
    return "".join(hal)
