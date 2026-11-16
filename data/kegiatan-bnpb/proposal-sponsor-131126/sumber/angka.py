"""Satu sumber angka sasaran dan anggaran perkiraan dua proposal (dipakai word.py dan spek deck).

Semua anggaran adalah PERKIRAAN AWAL dengan asumsi harga satuan tertulis; disepakati ulang bersama mitra sebelum PKS.
"""

# ---------- Paragon: Pengungsian Bermartabat ----------
P_KIT = 10000            # kit martabat siaga
P_KIT_HARGA = 0.3        # juta rupiah per kit (asumsi; isi produk higiene dinilai harga pokok)
P_AIR = 20               # unit pengolah air ultrafiltrasi
P_AIR_HARGA = 50         # juta rupiah per unit (asumsi; dikonfirmasi ke tim ITB)
P_BILIK = 40             # bilik higiene perempuan
P_BILIK_HARGA = 15       # juta rupiah per bilik (asumsi)
P_RISET = 750            # juta rupiah riset formulasi dan uji lapangan ITB
P_KADER = 400            # juta rupiah pelatihan kader perempuan
P_KADER_N = 200          # kader perempuan dilatih
P_GUDANG = 4             # titik stok siaga
P_FORMULA = 3            # formulasi higiene hemat air diuji
P_BULAN = 12

P_RINCI = [  # (komponen, volume, satuan, harga juta, jumlah juta, bentuk dukungan)
    ('Kit martabat siaga (keluarga, lansia, bayi)', P_KIT, 'kit', P_KIT_HARGA, P_KIT * P_KIT_HARGA, 'Barang dan dana'),
    ('Unit pengolah air ultrafiltrasi ITB', P_AIR, 'unit', P_AIR_HARGA, P_AIR * P_AIR_HARGA, 'Dana'),
    ('Bilik mandi dan cuci terpisah', P_BILIK, 'bilik', P_BILIK_HARGA, P_BILIK * P_BILIK_HARGA, 'Dana'),
    ('Riset formulasi hemat air dan uji lapangan', 1, 'paket', P_RISET, P_RISET, 'Dana dan riset bersama'),
    ('Pelatihan kader siaga pengungsian', P_KADER_N, 'kader', P_KADER / P_KADER_N, P_KADER, 'Dana dan relawan karyawan'),
]
P_SUB = sum(r[4] for r in P_RINCI)
P_MONEV = round(P_SUB * 0.1)
P_TOTAL = P_SUB + P_MONEV

# ---------- Telkom: Sekolah Siaga Imersif ----------
T_SEKOLAH = 100          # sekolah dikunjungi
T_SISWA_PER = 300        # siswa per sekolah ikut sesi VR
T_SISWA = T_SEKOLAH * T_SISWA_PER
T_KAMPUS = 10            # kampus dikunjungi (BNPB Goes to Campus)
T_MHS = 3000             # mahasiswa ikut sesi kampus
T_GURU = 400             # guru dilatih
T_KIT = 10               # paket kit VR keliling
T_HEADSET_PER = 20       # headset per paket
T_HEADSET = T_KIT * T_HEADSET_PER
T_HEADSET_HARGA = 6      # juta rupiah per headset termasuk lisensi pengelolaan (asumsi)
T_MODUL = 4              # modul skenario (gempa, tsunami, banjir, kebakaran)
T_KONTEN = 1500          # juta rupiah produksi empat modul VR dan AR
T_AR = 300               # juta rupiah aplikasi AR peta jalur evakuasi sekolah
T_KELILING = 1200        # juta rupiah operasional keliling 100 sekolah dan 10 kampus
T_GURU_BIAYA = 400       # juta rupiah pelatihan guru
T_PROV = 5               # provinsi uji coba
T_BULAN = 12

T_RINCI = [
    ('Produksi empat modul simulasi VR', T_MODUL, 'modul', T_KONTEN / T_MODUL, T_KONTEN, 'Dana dan tenaga Tel-U'),
    ('Paket VR keliling (headset, tas, pengisi daya)', T_HEADSET, 'headset', T_HEADSET_HARGA, T_HEADSET * T_HEADSET_HARGA, 'Barang atau dana'),
    ('Aplikasi AR jalur evakuasi sekolah', 1, 'aplikasi', T_AR, T_AR, 'Dana dan platform Telkom'),
    ('Operasional keliling sekolah dan kampus', T_SEKOLAH + T_KAMPUS, 'kunjungan', T_KELILING / (T_SEKOLAH + T_KAMPUS), T_KELILING, 'Dana'),
    ('Pelatihan guru penggerak siaga', T_GURU, 'guru', T_GURU_BIAYA / T_GURU, T_GURU_BIAYA, 'Dana'),
]
T_SUB = sum(r[4] for r in T_RINCI)
T_MONEV = round(T_SUB * 0.1)
T_TOTAL = T_SUB + T_MONEV


def rp(juta, d=1):
    """juta rupiah -> 'Rp6,3 miliar' atau 'Rp750 juta'."""
    if juta >= 1000:
        s = f'{juta / 1000:,.{d}f}'.replace(',', '#').replace('.', ',').replace('#', '.')
        return f'Rp{s} miliar'
    return f'Rp{angka(juta)} juta'


def angka(x, d=0):
    if isinstance(x, float) and x.is_integer():
        x = int(x)
    if isinstance(x, float):
        s = f'{x:,.{d or 1}f}'
    else:
        s = f'{x:,}'
    return s.replace(',', '#').replace('.', ',').replace('#', '.')


if __name__ == '__main__':
    print('Paragon', P_SUB, P_MONEV, P_TOTAL, rp(P_TOTAL))
    print('Telkom', T_SUB, T_MONEV, T_TOTAL, rp(T_TOTAL))

# paket pilihan Telkom (juta rupiah, termasuk 10% pemantauan)
T_PAKET_MENENGAH = round((T_KONTEN + 100 * T_HEADSET_HARGA + T_AR + 55 * T_KELILING / (T_SEKOLAH + T_KAMPUS) + T_GURU_BIAYA / 2) * 1.1)
T_PAKET_AWAL = round((T_KONTEN / 2 + 20 * T_HEADSET_HARGA + 20 * T_KELILING / (T_SEKOLAH + T_KAMPUS)) * 1.1)
# paket pilihan Paragon
P_PAKET_MENENGAH = round((5000 * P_KIT_HARGA + 10 * P_AIR_HARGA + 20 * P_BILIK_HARGA + P_RISET) * 1.1)
P_PAKET_AWAL = round((2000 * P_KIT_HARGA + P_RISET / 2) * 1.1)

# ---------- ITB pendidikan: Generasi Siaga Bandung Raya ----------
E_S1 = 20                # mahasiswi S1 penerima beasiswa tugas akhir kebencanaan
E_S1_HARGA = 12.5        # juta rupiah per penerima (dua semester x Rp6,25 juta, setara Paragon Scholarship)
E_S2 = 10                # mahasiswi magister penerima hibah tesis kebencanaan
E_S2_HARGA = 30          # juta rupiah per penerima (asumsi)
E_SEKOLAH = 50           # sekolah dampingan di Bandung Raya
E_GURU = 200             # guru siaga (empat per sekolah)
E_GURU_HARGA = 1.5       # juta rupiah per guru (asumsi)
E_DAMPING_HARGA = 8      # juta rupiah pendampingan dan peta evakuasi per sekolah (asumsi)
E_KELAS = 250            # juta rupiah modul ajar dan kelas daring terbuka
E_BULAN = 12
E_RINCI = [
    ('Beasiswa tugas akhir kebencanaan mahasiswa S1', E_S1, 'orang', E_S1_HARGA, E_S1 * E_S1_HARGA, 'Dana'),
    ('Hibah tesis kebencanaan mahasiswa magister', E_S2, 'orang', E_S2_HARGA, E_S2 * E_S2_HARGA, 'Dana'),
    ('Pelatihan guru siaga', E_GURU, 'guru', E_GURU_HARGA, E_GURU * E_GURU_HARGA, 'Dana dan jejaring guru'),
    ('Pendampingan sekolah dan peta evakuasi', E_SEKOLAH, 'sekolah', E_DAMPING_HARGA, E_SEKOLAH * E_DAMPING_HARGA, 'Dana'),
    ('Modul ajar dan kelas daring terbuka', 1, 'paket', E_KELAS, E_KELAS, 'Dana'),
]
E_SUB = sum(r[4] for r in E_RINCI)
E_MONEV = round(E_SUB * 0.1)
E_TOTAL = E_SUB + E_MONEV
E_PAKET_MENENGAH = round((E_S1 * E_S1_HARGA + 25 * 4 * E_GURU_HARGA + 25 * E_DAMPING_HARGA + E_KELAS) * 1.1)
E_PAKET_AWAL = round((10 * E_S1_HARGA + 10 * 4 * E_GURU_HARGA + 10 * E_DAMPING_HARGA) * 1.1)

# ---------- ITB teknologi: Sekolah Siaga Sesar Lembang ----------
L_SEKOLAH = 30           # sekolah di sekitar Sesar Lembang
L_SENSOR_HARGA = 20      # juta rupiah per sensor seismik terpasang (RS4D US$605-1.055 + pemasangan, asumsi)
L_ASES_HARGA = 15        # juta rupiah asesmen cepat struktur per sekolah (asumsi)
L_RETRO = 1500           # juta rupiah retrofit satu sekolah percontohan (asumsi, dikunci setelah asesmen)
L_EVAK_HARGA = 5         # juta rupiah peta evakuasi, rambu, dan simulasi per sekolah (asumsi)
L_DASBOR = 400           # juta rupiah dasbor data dan riset ITB
L_BULAN = 18
L_RINCI = [
    ('Sensor gempa sekolah terpasang', L_SEKOLAH, 'unit', L_SENSOR_HARGA, L_SEKOLAH * L_SENSOR_HARGA, 'Dana'),
    ('Asesmen cepat struktur gedung sekolah', L_SEKOLAH, 'sekolah', L_ASES_HARGA, L_SEKOLAH * L_ASES_HARGA, 'Dana dan tenaga ahli ITB'),
    ('Penguatan struktur satu sekolah percontohan', 1, 'sekolah', L_RETRO, L_RETRO, 'Dana'),
    ('Peta evakuasi, rambu, dan simulasi', L_SEKOLAH, 'sekolah', L_EVAK_HARGA, L_SEKOLAH * L_EVAK_HARGA, 'Dana dan relawan'),
    ('Dasbor data dan riset terapan ITB', 1, 'paket', L_DASBOR, L_DASBOR, 'Dana dan riset bersama'),
]
L_SUB = sum(r[4] for r in L_RINCI)
L_MONEV = round(L_SUB * 0.1)
L_TOTAL = L_SUB + L_MONEV
L_PAKET_MENENGAH = round((L_SUB - L_RETRO) * 1.1)
L_PAKET_AWAL = round((10 * L_SENSOR_HARGA + 10 * L_ASES_HARGA + 10 * L_EVAK_HARGA + L_DASBOR / 2) * 1.1)
