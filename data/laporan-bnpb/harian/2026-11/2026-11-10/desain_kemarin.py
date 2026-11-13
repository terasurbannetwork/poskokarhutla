"""Desain laporan 9 Nov 2026 untuk data 10 Nov (pemilik 10 Nov: "versi awal tuh maksudnya yang kayak kemaren dlu aja desainnya").
Empat metode slide ringkasan diambil dari commit 2a66f743 (generator sebelum revisi 10 Nov), ditambah dua hal yang dipakai deck 9 Nov tetapi belum ter-commit
(lebar kolom CD_PIL dan pil dampak_pil). Generator di folder generator tetap memakai desain baru."""
import re, subprocess, textwrap
import harian

KOMIT = '2a66f743'
NAMA = ('judul', 'peta_blok', 's2', 'info_bencana')


def kartu_alt(s, T):
    """Revisi 5 alt 2 (pemilik 10 Nov): kartu laporan kejadian lama dihapus, kejadian menonjol jadi laporan kejadian, angin kencang dan cuaca ekstrem disatukan."""
    if not getattr(s, 'KARTU_ALT', False): return T
    hasil, angin = [], [t for t in T if t[3] in ('angin kencang', 'cuaca ekstrem')]
    for t in T:
        if t[3] == 'laporan kejadian': continue
        if t[3] == 'kejadian menonjol': t = ('papan_n', t[1], t[2], 'laporan kejadian', t[4])
        if t in angin and len(angin) == 2:
            if t is not angin[0] and t != angin[0]: continue
            t = (t[0], t[1], harian.f0(sum(int(a[2].replace('.', '')) for a in angin)), 'angin kencang dan cuaca ekstrem', t[4])
        hasil.append(t)
    return hasil


def pasang(nama=NAMA):
    """nama = metode yang dikembalikan ke desain 9 Nov; Revisi 5 alt 2 hanya judul dan s2 (kartu), peta dan tabel memakai generator terbaru."""
    src = subprocess.run(['git', 'show', f'{KOMIT}:data/laporan-bnpb/generator/harian.py'], capture_output=True, check=True, cwd=harian.AKAR).stdout.decode('utf-8')
    for n in nama:
        m = re.search(rf'^    def {n}\(.*?(?=^    def |^    # -{{10}}|^def |\Z)', src, re.S | re.M)
        assert m, n
        kode = textwrap.dedent(m[0])
        if n == 'info_bencana':
            for x, y in (("CD = 700000 if PIL_ else", "CD = getattr(s, 'CD_PIL', 700000) if PIL_ else"),
                         ("        def dampak(x):\n".replace('        ', '    ', 1), "    def dampak(x):\n        if x.get('dampak_pil'): return x['dampak_pil']\n")):
                assert x in kode, x
                kode = kode.replace(x, y)
        if n == 's2':
            x = 'if PIL_: PX = 7040880'
            assert x in kode, x
            kode = kode.replace(x, "if PIL_: PX = 7955280 if getattr(s, 'TANPA_KONDISI', False) else 7040880")
            for x, y in (("o = s.kotak(548640, 1280160, 11094415 if V3 else 8579267,", "LBR_K = 7315200 if getattr(s, 'INFO_Y', None) else 11094415\n    o = s.kotak(548640, 1280160, LBR_K if V3 else 8579267,"),
                         ("kw = ((11094415 - 2 * 109728) if V3 else 8359811)", "kw = ((LBR_K - 2 * 109728) if V3 else 8359811)")):   # pemilik 10 Nov: lebar kartu sama dengan peta
                assert x in kode, x
                kode = kode.replace(x, y)
            x = '    kw = (('
            assert x in kode, x
            kode = kode.replace(x, '    T = kartu_alt(s, T)\n' + x, 1)
            harian.__dict__['kartu_alt'] = kartu_alt
        ruang = harian.__dict__
        exec(compile(kode, f'{KOMIT}:{n}', 'exec'), ruang)
        setattr(harian.Deck, n, ruang.pop(n))
