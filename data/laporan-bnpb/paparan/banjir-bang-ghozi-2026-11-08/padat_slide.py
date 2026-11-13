    # --- tiga slide padat (pemilik 8 Nov malam): banjir + kebutuhan + mitigasi; stok BNPB; banjir + bencana lain + mitigasi
    P_ = 12700; PX0, PW0, PY0, PYB = 548640, 11094415, 1325880, 6355080
    BIRU_PITA, GARIS_P = 'DCE9F5', 'D5DBE3'

    def p_sek(s, x, y, w, ikon, judul):
        d = 16 * s.P_
        return (s.kotak(x, y, d, d, NAVY, 'ellipse') + s.gambar(x + d * .2, y + d * .2, d * .6, d * .6, ikon)
                + s.tx(x + d + 5 * s.P_, y, w - d, d, [judul], sz=950, b=True, an='ctr', wrap='none') + s.kotak(x, y + d + 2 * s.P_, w, 9525, INK))

    def p_tabel(s, x, y, w, kol, baris, rh, hk=None, sz=720):
        """kol = [(judul, bobot, rata)]; baris = daftar sel, atau {'pita': teks, 'sel': [...]}; sel = teks atau (teks, warna, tebal)."""
        P = s.P_; hk = hk or 15 * P; tb = sum(k[1] for k in kol); L = [w * k[1] / tb for k in kol]
        o = s.kotak(x, y, w, hk, NAVY, 'roundRect', adj=14000); cx = x
        for k, lw in zip(kol, L):
            o += s.tx(cx + 3 * P, y, lw - 6 * P, hk, [k[0]], sz=700, b=True, c='FFFFFF', al='ctr', an='ctr', wrap='none'); cx += lw
        yy = y + hk
        for b in baris:
            pita = isinstance(b, dict) and 'pita' in b; tot = isinstance(b, dict) and 'total' in b
            sel = b.get('sel', []) if isinstance(b, dict) else b
            if pita: o += s.kotak(x, yy, w, rh, s.BIRU_PITA)
            if tot: o += s.kotak(x, yy, w, rh, NAVY, 'roundRect', adj=14000)
            if pita: o += s.tx(x + 5 * P, yy, w * .6, rh, [b['pita']], sz=sz, b=True, an='ctr', wrap='none')
            cx = x
            for i, (k, lw) in enumerate(zip(kol, L)):
                if i < len(sel) and sel[i] not in ('', None):
                    v = sel[i]; t_, c_, b_ = v if isinstance(v, tuple) else (v, 'FFFFFF' if tot else INK, tot or (i == 0 and not pita))
                    o += s.tx(cx + 4 * P, yy, lw - 7 * P, rh, [t_], sz=sz, b=b_, c=c_, al=k[2], an='ctr')
                cx += lw
            yy += rh
            if not pita and not tot: o += s.kotak(x, yy - 3175, w, 6350, s.GARIS_P)
        return o, yy

    def p_kartu(s, x, y, w, h, tint, warna, ikon, nilai, lab):
        d = 24 * s.P_
        return (s.kotak(x, y, w, h, tint, 'roundRect', adj=9000) + s.kotak(x + 7 * s.P_, y + (h - d) / 2, d, d, warna, 'ellipse') + s.gambar(x + 7 * s.P_ + d * .2, y + (h - d) / 2 + d * .2, d * .6, d * .6, ikon)
                + s.tx(x + d + 13 * s.P_, y + 4 * s.P_, w - d - 16 * s.P_, h * .55, [nilai], sz=1250, b=True, an='ctr', wrap='none')
                + s.tx(x + d + 13 * s.P_, y + h * .58, w - d - 16 * s.P_, h * .36, [lab], sz=720, c=TEKS, an='ctr', wrap='none'))

    def p_video(s, x, y, w, h):
        return s.kotak(x, y, w, h, 'E6EAF0', 'roundRect', adj=2500)

    def padat_1(s):
        d = s.PD; P = s.P_; wA, wB = 270 * P, 300 * P; gp = 12 * P; xA = s.PX0; xB = xA + wA + gp; xC = xB + wB + gp; wC = s.PX0 + s.PW0 - xC; y0 = s.PY0; o = ''
        # A: peta, kartu, video
        o += s.p_sek(xA, y0, wA, 'wilayah_putih' if 'wilayah_putih' in s.I else 'banjir_putih', 'Peta daerah terdampak dan prakiraan')
        mh = 166 * P; mw = mh * 1.42; o += s.gambar(xA + (wA - mw) / 2, y0 + 23 * P, mw, mh, 'peta_padat1')
        yk = y0 + 192 * P; kw = (wA - 2 * 6 * P) / 3; kk = [('DCEBF8', '1B5A93', 'rumah_putih', sum(1 for r in d['lp'] if r['st'] != 'Surut'), 'Terdampak'), ('F8DDE0', '8F3F07', 'awas_putih', sum(1 for r in s.Q4 if r['a'] and r['k'] not in s.BS), 'Awas'), ('FBE7D6', 'E8894A', 'banjir_putih', sum(1 for r in s.Q4 if not r['a'] and r['k'] not in s.BS), 'Siaga')]
        for i, (t, c, ik, n, l) in enumerate(kk): o += s.p_kartu(xA + i * (kw + 6 * P), yk, kw, 34 * P, t, c, ik, str(n), l + ' (kab/kota)')
        yv = y0 + 233 * P; o += s.p_sek(xA, yv, wA, 'mata_putih', 'Rekaman layar pemantauan banjir'); o += s.p_video(xA, yv + 23 * P, wA, s.PYB - yv - 23 * P)
        # B: terdampak
        o += s.p_sek(xB, y0, wB, 'rumah_putih', 'Kab/kota terdampak banjir, laporan 1-8 November')
        baris = []; pv = None
        for r in d['lp']:
            if r['prov'] != pv: pv = r['prov']; baris.append({'pita': pv})
            bs = r['st'] != 'Surut'
            baris.append([r['kab'], r['kec'] or '–', r['mulai'], r['selesai'], s.pf(r['kk']), s.pf(r['ungsi']), ('Belum surut', 'B3261E', True) if bs else ('Surut', '1B5A93', True)])
        x_, yb = s.p_tabel(xB, y0 + 22 * P, wB, [('Kab/Kota', 92, 'l'), ('Kec.', 24, 'ctr'), ('Mulai', 36, 'ctr'), ('Selesai', 36, 'ctr'), ('KK', 34, 'ctr'), ('Ungsi', 30, 'ctr'), ('Kondisi', 48, 'ctr')], baris, 11.3 * P); o += x_
        # B bawah: kebutuhan
        yk2 = y0 + 229 * P; o += s.p_sek(xB, yk2, wB, 'tenda_putih', 'Kebutuhan daerah dan kekurangannya')
        baris = []; pv = None
        for r in d['keb']:
            if r['prov'] != pv: pv = r['prov']; baris.append({'pita': pv})
            baris.append([r['jenis'], r['jml'], r['stok2'], (r['kurang'], 'B3261E', True) if r['kurang'] != '–' else '–'])
        x_, ye = s.p_tabel(xB, yk2 + 22 * P, wB, [('Kebutuhan', 128, 'l'), ('Diajukan', 52, 'ctr'), ('Stok Kualanamu', 62, 'ctr'), ('Kekurangan', 58, 'ctr')], baris, 12.3 * P); o += x_
        o += s.tx(xB, ye + 3 * P, wB, s.PYB - ye - 3 * P, [[('Alur: ', NAVY, True), ('Aceh dan Sumut dipenuhi dari Poslog Kualanamu; Sumbar dari gudang logpal Sumbar. Kekurangan harus disiapkan. Rincian per kab/kota belum tersedia.', TEKS, False)]], sz=720, an='ctr')
        # C: prakiraan
        o += s.p_sek(xC, y0, wC, 'kalender_putih', f"Prakiraan kecamatan Awas dan Siaga, {s.TG}")
        baris = [[r['prov'], r['n'], (r['a'], 'B3261E', True) if r['a'] else '–', r['s'], (r['mm'], 'B3261E', True)] for r in d['prov']]
        baris.append({'total': 1, 'sel': ['Jumlah', str(d['n_kab']), str(d['a']), str(d['s']), '']})
        x_, yp = s.p_tabel(xC, y0 + 22 * P, wC, [('Provinsi', 100, 'l'), ('Kab/Kota', 42, 'ctr'), ('Kec. Awas', 44, 'ctr'), ('Kec. Siaga', 44, 'ctr'), ('Puncak, mm', 49, 'ctr')], baris, 14 * P); o += x_
        pw = (wC - 2 * 5 * P) / 3; yq = yp + 5 * P
        for i, r in enumerate(d['puncak']):
            xq = xC + i * (pw + 5 * P); o += s.kotak(xq, yq, pw, 34 * P, 'FBE7D6', 'roundRect', adj=9000) + s.tx(xq + 5 * P, yq + 3 * P, pw - 8 * P, 16 * P, [[(f"{r['mm']} mm", 'B3261E', True)]], sz=1100, an='ctr', wrap='none') + s.tx(xq + 5 * P, yq + 19 * P, pw - 8 * P, 12 * P, [f"{r['kab']}, {r['tgl']}"], sz=700, c=TEKS, an='ctr', wrap='none')
        # C bawah: mitigasi
        ym = y0 + 193 * P; o += s.p_sek(xC, ym, wC, 'cek_putih', 'Usulan mitigasi per kab/kota')
        M = [('Deli Serdang', 'Bupati putuskan perpanjangan Tanggap Darurat sebelum 9 Nov'), ('Pidie Jaya', 'Tambal tanggul jebol; siapkan evakuasi Trienggadeng, Meureudu'), ('Serdang Bedagai', 'Tuntaskan pendataan; bersihkan rumah terdampak'), ('Langkat', 'Konfirmasi status surut ke BPBD, laporan terakhir 1 Nov'), ('Lumajang', 'Buka akses jalan dan listrik; siaga lahar Besuk Kobokan'),
             ('Aceh Barat Daya', 'Siapkan evakuasi Kuala Batee, Babah Rot, Manggeng'), ('Aceh Barat', 'Posko Sungai Mas, Pante Ceureumen; perahu di Meureubo'), ('Nagan Raya', 'Posko Seunagan, Kuala; pantau lereng Darul Makmur'), ('Kab/kota Siaga', 'Buka posko kecamatan; periksa tanggul; siapkan jalur evakuasi')]
        x_, _ = s.p_tabel(xC, ym + 22 * P, wC, [('Kab/Kota', 68, 'l'), ('Langkah BPBD bersama BNPB', 211, 'l')], M, (s.PYB - ym - 37 * P) / len(M)); o += x_
        return o

    def padat_2(s):
        d = s.PD; P = s.P_; x0 = s.PX0; W = s.PW0; y0 = s.PY0; o = ''
        K = [('DCEBF8', '1B5A93', 'tenda_putih', '138,5 ton', 'Gudang UPT Padang'), ('DCEBF8', '1B5A93', 'tenda_putih', '130,8 ton', 'Poslog Kualanamu, buffer'), ('E6EAF0', NAVY, 'truk_putih', '1.914,8 ton', 'Kualanamu masuk sejak Nov 2025'), ('E6EAF0', NAVY, 'truk_putih', '1.784,1 ton', 'Kualanamu sudah keluar'), ('FBE7D6', 'E8894A', 'kalender_putih', f"{d['jam1']} jam", f"Pengiriman terlama, {d['n_jl']} kab/kota")]
        kw = (W - 4 * 8 * P) / 5
        for i, (t, c, ik, n, l) in enumerate(K): o += s.p_kartu(x0 + i * (kw + 8 * P), y0, kw, 44 * P, t, c, ik, n, l)
        y2 = y0 + 52 * P; wA, wB = 290 * P, 262 * P; gp = 11 * P; xB = x0 + wA + gp; xC = xB + wB + gp; wC = x0 + W - xC
        o += s.p_sek(x0, y2, wA, 'tenda_putih', 'Stok utama dua gudang BNPB')
        B = [('Perahu', '26 unit', '11 unit'), ('Mesin perahu', '18 unit', '–'), ('Pompa', '51 unit', '2 unit'), ('Genset', '6 unit', '5 unit'), ('Air bersih portabel', '12 unit', '–'), ('Alat berat', '–', '–'), ('Tenda keluarga', '315 set', '144 unit'), ('Tenda pengungsi', '1 set', '8 set'), ('Velbed', '876 unit', '–'), ('Kasur', '7.326 lembar', '5.261 pcs'), ('Matras', '5.847 lembar', '1.276 lembar'), ('Selimut', '28 lembar', '307 lembar'), ('Terpal', '180 lembar', '–'), ('Geobag', '820 pcs', '1.400 pcs'), ('Chainsaw', '6 unit', '–'), ('Obat', '800 paket', '93 koli'), ('Masker', '10.000 box', '5.640 box'), ('Hygiene kit', '58 paket', '–'), ('Pakaian', '9.672 pcs', '740 pcs'), ('Handuk', '2.410 pcs', '776 pcs')]
        x_, _ = s.p_tabel(x0, y2 + 22 * P, wA, [('Jenis', 120, 'l'), ('UPT Padang', 85, 'ctr'), ('Poslog Kualanamu', 85, 'ctr')], [list(b) for b in B], (s.PYB - y2 - 37 * P) / len(B)); o += x_
        o += s.p_sek(xB, y2, wB, 'truk_putih', 'Alur distribusi dari dua gudang')
        mh = 200 * P; mw = mh * 1600 / 1834; o += s.gambar(xB + (wB - mw) / 2, y2 + 22 * P, mw, mh, 'peta_padat2')
        yj = y2 + 226 * P; baris = [[r['prov'], r['asal'], r['n'], r['darat'], r['laut'], r['jam']] for r in d['jl']]
        x_, _ = s.p_tabel(xB, yj, wB, [('Provinsi', 82, 'l'), ('Gudang', 54, 'ctr'), ('Kab', 24, 'ctr'), ('Darat', 28, 'ctr'), ('Laut', 26, 'ctr'), ('Waktu', 48, 'ctr')], baris, (s.PYB - yj - 15 * P - 19 * P) / max(len(baris), 1)); o += x_
        o += s.tx(xB, s.PYB - 18 * P, wB, 18 * P, ['Waktu perkiraan dari jarak dan kecepatan rata-rata; belum dikonfirmasi operator angkutan.'], sz=700, c=TEKS, an='ctr')
        o += s.p_sek(xC, y2, wC, 'orang_putih', 'Persediaan BPBD di daerah')
        L = [r for r in d['lg'] if r['prov'] not in ('Sumatera Barat',) and 'Kualanamu' not in r['prov']]
        v = lambda x: s.pf(x)
        x_, yl = s.p_tabel(xC, y2 + 22 * P, wC, [('Provinsi', 88, 'l'), ('Perahu', 30, 'ctr'), ('Pompa', 30, 'ctr'), ('Genset', 30, 'ctr'), ('Tenda', 30, 'ctr'), ('Kasur', 34, 'ctr'), ('Selimut', 36, 'ctr')], [[r['prov'], v(r['perahu']), v(r['pompa']), v(r['genset']), v(r['tenda']), v(r['matras']), v(r['selimut'])] for r in L], 14 * P); o += x_
        yc = yl + 8 * P; o += s.p_sek(xC, yc, wC, 'mata_putih', 'Provinsi tanpa rincian jumlah')
        C = [('Aceh', 'Stok lama cukup; usul selimut, family kit'), ('Riau', 'Peralatan ada; logistik minim'), ('Jawa Timur', 'Apel 12 kab/kota; siaga darurat 38 kab/kota'), ('Bengkulu', 'Apel Agustus; belum ada status darurat'), ('Belum melapor', 'Kepri, Sulteng, Papua Selatan, Kalbar, Kalsel, Sulsel, Maluku, NTT, Papua Pegunungan, Sulbar, Papua Barat Daya')]
        ya = yc + 22 * P; hs = s.PYB - ya - 15 * P
        x_, _ = s.p_tabel(xC, ya, wC, [('Provinsi', 72, 'l'), ('Kondisi', 206, 'l')], [list(c) for c in C], hs / len(C)); o += x_
        return o

    def padat_3(s):
        d = s.PD; P = s.P_; x0 = s.PX0; W = s.PW0; y0 = s.PY0; o = ''
        n5 = sum(1 for r in d['lp'] if r['st'] != 'Surut')
        K = [('DCEBF8', '1B5A93', 'banjir_putih', f'{n5} kab/kota', 'Banjir belum surut'), ('F8DDE0', '8F3F07', 'longsor_putih', f"{d['la']} + {d['ls']} kec.", 'Longsor Awas + Siaga'), ('E6EAF0', NAVY, 'angin_putih', '4 kejadian', 'Cuaca ekstrem'), ('FBE7D6', 'B84E08', 'tetes_putih', '2 kejadian', 'Kekeringan'), ('E6EAF0', NAVY, 'gempa_putih', '27.040 jiwa', 'Mengungsi, gempa NTT'), ('FBE7D6', 'B84E08', 'gunung_putih', '3 gunung', 'Status Siaga')]
        kw = (W - 5 * 7 * P) / 6
        for i, (t, c, ik, n, l) in enumerate(K): o += s.p_kartu(x0 + i * (kw + 7 * P), y0, kw, 44 * P, t, c, ik, n, l)
        y2 = y0 + 52 * P; wA, wB = 312 * P, 262 * P; gp = 11 * P; xB = x0 + wA + gp; xC = xB + wB + gp; wC = x0 + W - xC
        o += s.p_sek(x0, y2, wA, 'awas_putih', 'Kejadian bencana lain yang masih dilaporkan')
        E = [('Gempa bumi', 'Nusa Tenggara Timur', '15 Agu', '156 meninggal; 17.707 KK'), ('Cuaca ekstrem', 'Serdang Bedagai, Sumut', '7 Nov', '10 KK'), ('Cuaca ekstrem', 'Ciamis, Jabar', '7 Nov', '61 KK'), ('Cuaca ekstrem', 'Bogor, Jabar', '7 Nov', '31 KK'), ('Cuaca ekstrem', 'Kendal, Jateng (selesai)', '7 Nov', '1 meninggal'), ('Longsor', 'Badung, Bali', '2 Nov', '2 hilang'), ('Kekeringan', 'Subang, Jabar', '24 Okt', '10.378 KK; 378.000 liter air'), ('Kekeringan', 'Banggai Kepulauan, Sulteng', '23 Sep', '1.868 KK; 520.000 liter air')]
        x_, ye = s.p_tabel(x0, y2 + 22 * P, wA, [('Jenis', 62, 'l'), ('Lokasi', 108, 'l'), ('Mulai', 34, 'ctr'), ('Dampak', 108, 'l')], [list(e) for e in E], 16 * P); o += x_
        yg = ye + 8 * P; o += s.p_sek(x0, yg, wA, 'gunung_putih', 'Gunung api Siaga')
        G_ = [('Anak Krakatau', '5 km dari puncak', 'Lava, abu, lontaran batu pijar'), ('Merapi', '3 km; 7 km selatan-barat daya', 'Awan panas, lahar di Boyong, Gendol'), ('Semeru', '5 km; 13 km tenggara', 'Awan panas, lahar Besuk Kobokan')]
        x_, yh = s.p_tabel(x0, yg + 22 * P, wA, [('Gunung', 66, 'l'), ('Zona bahaya', 112, 'l'), ('Ancaman', 134, 'l')], [list(g) for g in G_], 17 * P); o += x_
        o += s.tx(x0, yh + 3 * P, wA, s.PYB - yh - 3 * P, [[('Status gunung api: ', NAVY, True), ('Awas 0; Siaga 3; Waspada 24; Normal 42.', TEKS, False)]], sz=760, an='ctr')
        o += s.p_sek(xB, y2, wB, 'kalender_putih', f"Prakiraan banjir dan longsor, {s.TG}")
        bl = d['bl']; ta = lambda i: sum(r[i] for r in bl); f_ = lambda v: ('–' if not v else str(v))
        baris = [[r[0], (f_(r[1]), 'B3261E', True) if r[1] else '–', f_(r[2]), (f_(r[3]), 'B3261E', True) if r[3] else '–', f_(r[4])] for r in bl]
        baris.append({'total': 1, 'sel': ['Jumlah', str(ta(1)), str(ta(2)), str(ta(3)), str(ta(4))]})
        rh = min(15 * P, (s.PYB - y2 - 37 * P - 42 * P) / len(baris))
        x_, yb = s.p_tabel(xB, y2 + 22 * P, wB, [('Provinsi', 98, 'l'), ('Banjir Awas', 42, 'ctr'), ('Banjir Siaga', 42, 'ctr'), ('Longsor Awas', 40, 'ctr'), ('Longsor Siaga', 40, 'ctr')], baris, rh, hk=15 * P, sz=720); o += x_
        ya = yb + 6 * P; hw = (wB - 6 * P) / 2; hh = s.PYB - ya
        for i, (t, a, b) in enumerate((('Ambang banjir, hujan 3 hari', 'Awas ≥ 120 mm', 'Siaga ≥ 80 mm'), ('Ambang longsor, hujan 3 hari', 'Awas ≥ 90 mm', 'Siaga ≥ 60 mm'))):
            xq = xB + i * (hw + 6 * P); o += s.kotak(xq, ya, hw, hh, 'E6EAF0', 'roundRect', adj=7000) + s.tx(xq + 6 * P, ya + 3 * P, hw - 10 * P, hh * .42, [t], sz=720, b=True, an='ctr', wrap='none') + s.tx(xq + 6 * P, ya + hh * .48, hw - 10 * P, hh * .45, [[(a, '8F3F07', True), ('; ', TEKS, False), (b, 'B84E08', True)]], sz=760, an='ctr', wrap='none')
        o += s.p_sek(xC, y2, wC, 'longsor_putih', 'Rekaman layar pemantauan longsor')
        o += s.p_video(xC, y2 + 22 * P, wC, 112 * P)
        ym = y2 + 142 * P; o += s.p_sek(xC, ym, wC, 'cek_putih', 'Usulan mitigasi per jenis bencana')
        M = [('Banjir', 'Buka posko di kecamatan Awas dan Siaga; periksa tanggul; kirim perahu lebih dulu ke Aceh Barat'), ('Longsor', 'Tutup sementara ruas lereng rawan saat hujan lebat; ungsikan warga bawah tebing di kecamatan Awas'), ('Cuaca ekstrem', 'Pangkas pohon rawan; siagakan tim cepat BPBD'), ('Kekeringan', 'Lanjutkan pasokan air bersih ke Subang dan Banggai Kepulauan'), ('Gempa NTT', 'Tuntaskan hunian sementara bagi pengungsi'), ('Gunung api', 'Larang aktivitas di zona bahaya; siaga lahar Merapi dan Semeru saat hujan')]
        x_, _ = s.p_tabel(xC, ym + 22 * P, wC, [('Bencana', 58, 'l'), ('Langkah BPBD bersama BNPB', 221, 'l')], M, (s.PYB - ym - 37 * P) / len(M)); o += x_
        return o

    @staticmethod
    def pf(v):
        if v in ('', None): return '–'
        try: return f'{int(float(v)):,}'.replace(',', '.')
        except Exception: return str(v)

