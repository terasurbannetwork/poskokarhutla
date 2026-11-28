// Nama, versi, dan changelog Bot Laporan BNPB (pemilik 19 Nov 2026: "Nama Bot: Bot Laporan BNPB, tampilin versi berapa, bisa liat changelog
// versi"; "buat versioning, kamu yang urus setelahnya ya"). Penomoran pemilik: v0 = bot terjadwal awal, v1 = bot proyek (18 Nov),
// v2 = agen Claude Code (19 Nov), v2.1 = kecerdasan percakapan, v2.2 = vision.
// ATURAN (gerbang tests/wa/versi.test.mjs): tiap perubahan perilaku bot di scripts/wa menaikkan VERSI dan menambah entri CHANGELOG paling
// atas dengan versi yang sama. Patch (x.y.Z) = perbaikan; minor (x.Y) = kemampuan baru; mayor (X) = cara kerja baru.
// Isi changelog ditulis untuk pemakai: kalimat biasa, tanpa nama berkas atau istilah teknis.
// Hanya Bot Laporan BNPB. Lapor AI (Lapor Bencana) produk lain: perubahannya tidak dicatat di sini dan tidak menaikkan VERSI;
// kodenya di gateway ditandai `// >>> lapor-ai` ... `// <<< lapor-ai` supaya tidak ikut sidik versi bot.

export const NAMA_BOT = 'Bot Laporan BNPB'
export const VERSI = '2.9'

export const CHANGELOG = [
  { versi: '2.9', tanggal: '2026-11-27', isi: [
    'Laporan Operasi Modifikasi Cuaca dari posko yang masuk sebagai bahan (sorti, bahan semai, kumulatif) kini ikut disimpan ke sistem untuk papan operasi semai. Bot tidak membalas apa pun untuk itu dan tidak ada yang berubah di laporan.',
  ] },
  { versi: '2.8', tanggal: '2026-11-25', isi: [
    'Bot terjadwal bisa mengirim Laporan Penanganan Gempa Bumi dan Laporan Penanganan Kekeringan sesudah 17.00 WIB, seperti laporan banjir: angkanya dari laporan harian yang sudah tayang, tanpa bahan WA, dikirim sekali sehari ke penerima tetap.',
    'Keduanya mati bawaan dan dinyalakan sendiri-sendiri oleh pengelola mesin. Bila data hari itu belum ada, hanya pemilik yang diberi tahu.',
  ] },
  { versi: '2.7', tanggal: '2026-11-24', isi: [
    'Infografis bencana: ketik *infografis 2025* (tahun), *infografis 2026-10* (bulan), atau *infografis 2026-T3* (triwulan). Bot membuatnya dari data DIBI dan mengirim PPTX dan PDF hanya ke Anda.',
    'Periode yang belum genap (bulan atau triwulan berjalan) ditolak dengan penjelasan. Tidak ada jadwal otomatis dan tidak ada kiriman ke grup atau nomor lain.',
    'Bot Laporan BNPB bisa berjalan di nomor WhatsApp sendiri, terpisah dari Lapor Bencana. Sesudah dipindah, bahan, perintah *buat*, revisi, dan *final* dikirim ke nomor baru; nomor lama hanya untuk Lapor Bencana.',
    'Jatah kiriman kedua bot tidak lagi dipakai bersama, jadi percakapan Lapor Bencana yang ramai tidak menahan draf atau berkas final.',
    'Nomor yang diberi izin Lapor Bencana tetap bisa membuat laporan di nomor bot laporan.',
  ] },
  { versi: '2.6.1', tanggal: '2026-11-21', isi: [
    'Bahan yang kalimat pembukanya berubah tetap dikenali: bila bot tidak mengenali kiriman dari bentuk teksnya, Claude membaca isinya dan menentukan jenis bahan (misalnya rekap Koordalops, BMKG, PVMBG) beserta tanggal laporannya. Tiap kiriman cukup dibaca sekali.',
    'Rekap Koordalops dengan kalimat pembuka baru ("rekapitulasi kejadian bencana ... dihimpun oleh Direktorat Koordinasi Pengendalian Operasi Darurat BNPB") terbaca, termasuk jumlah kejadiannya.',
    'Bila rekap Koordalops belum ada lalu diketik *lanjut*, bot menyebut rekap itu yang kurang, bukan galat berkas tidak ditemukan.',
  ] },
  { versi: '2.6', tanggal: '2026-11-20', isi: [
    'Laporan khusus gempa: ketik *buat gempa nias* (atau tulis biasa, misalnya "buatkan laporan gempa nias"). Bot mencari gempa terbaru di tempat itu dari BMKG, lalu langsung membuat laporan dua halaman: peta guncangan per kab/kota, kondisi menurut BPBD dan BMKG, penduduk dalam jangkauan guncangan, peluang gempa susulan, penanganan, langkah yang disarankan, dan riwayat gempa di sekitarnya.',
    'Tanpa nama tempat (*buat gempa*), bot memakai gempa M5 ke atas terbaru. Tanggal boleh ditambah di ujung, misalnya *buat gempa nias 19 nov*.',
  ] },
  { versi: '2.5.1', tanggal: '2026-11-20', isi: [
    'Laporan penanganan karhutla: bila lintasan satelit siang belum masuk FIRMS, bot tidak langsung membuat laporan. Pilih *sekarang* untuk membuat dengan data yang ada (draf diberi catatan), atau *tunggu* supaya laporan dibuat otomatis begitu lintasan siang masuk FIRMS dan situs memuatnya.',
  ] },
  { versi: '2.5', tanggal: '2026-11-20', isi: [
    'Laporan harian dengan kejadian banyak: sesudah *lanjut*, bot menyebut jumlah kejadian di WA Koordalops, yang masuk laporan, dan yang tidak dimuat, lalu menawarkan slide rincian kejadian. Balas *1* untuk menambah, *2* tanpa rincian.',
    'Slide rincian kejadian: peta kab/kota per zona bernomor dan tabel per kab/kota dengan dampak KK dan kerusakan (rumah, sekolah, jalan, jembatan, dan lainnya).',
    'Tabel slide 1 tidak lagi bertumpuk saat kejadian banyak: kab/kota digabung per provinsi, kejadian baru dan yang masih berlangsung tetap dipisah.',
    'Warna jenis bencana lebih mudah dibedakan: banjir biru, cuaca ekstrem hijau tua, tanah longsor emas, gempa bumi abu gelap.',
    'Perbaikan: gunung api Siaga kembali tampil di laporan harian dengan format WA PVMBG terbaru; peringatan hujan sangat lebat (Awas) tertulis benar; kartu cuaca ekstrem tidak tergeser.',
  ] },
  { versi: '2.4.4', tanggal: '2026-11-20', isi: [
    'Pemakaian Claude per kegiatan dan per laporan dikirim ke halaman pemantau biaya admin tiap 10 menit.',
  ] },
  { versi: '2.4.3', tanggal: '2026-11-20', isi: [
    'Laporan besar: batas langkah Claude dinaikkan, dan bila langkah atau anggaran habis sebelum deck selesai, draf pertama juga memakai deck sistem dengan catatan, bukan gagal.',
  ] },
  { versi: '2.4.2', tanggal: '2026-11-20', isi: [
    'Laporan besar (misalnya 39 kejadian) tidak lagi gagal karena waktu habis: Claude diberi waktu sampai 25 menit, dan bila tetap habis di draf pertama, draf memakai deck sistem apa adanya dengan catatan, bukan gagal.',
  ] },
  { versi: '2.4.1', tanggal: '2026-11-20', isi: [
    'Paparan banjir sepekan: peta slide 1 jadi multipeta, satu panel per pulau dengan skala sama, label tidak saling tumpuk.',
  ] },
  { versi: '2.4', tanggal: '2026-11-19', isi: [
    'Laporan baru: Paparan Situasi Banjir Sepekan dengan periode bebas. Ketik *buat banjir sepekan 16-19 nov* (atau *buat banjir sepekan* untuk 7 hari terakhir); bot langsung membuat drafnya dari WA Koordalops tiap hari periode itu.',
  ] },
  { versi: '2.3.2', tanggal: '2026-11-19', isi: [
    'Tiap draf mengirim gambar semua slide (paling banyak 15), bukan hanya satu; di revisi, slide yang berubah ditandai.',
  ] },
  { versi: '2.3.1', tanggal: '2026-11-19', isi: [
    'PPTX dan PDF final dikirim tanpa keterangan; rincian laporan ada di pesan Laporan selesai.',
  ] },
  { versi: '2.3', tanggal: '2026-11-19', isi: [
    'Bot V2 (Claude Code) dipakai semua nomor terdaftar, bukan uji coba lagi.',
    'Tidak ada lagi batas biaya per laporan; revisi berulang tidak tertahan "Batas biaya laporan tercapai".',
    'Panduan PDF (*panduan*) diperbarui: menu 1 Revisi sampai 5 Batal, revisi beberapa pesan dan screenshot, tanya draf, kalimat biasa.',
  ] },
  { versi: '2.2.5', tanggal: '2026-11-19', isi: [
    'Pembuatan laporan dipercepat: agen bekerja dengan tingkat ketelitian sedang (medium) dan tinjau visual dimatikan.',
  ] },
  { versi: '2.2.4', tanggal: '2026-11-19', isi: [
    'Rincian *biaya*: pemakaian sebelum rincian ada digabung ke Membuat dan merevisi laporan, tanpa baris terpisah.',
  ] },
  { versi: '2.2.3', tanggal: '2026-11-19', isi: [
    'Perintah pemilik *biaya* merinci pemakaian per kegiatan: membuat dan merevisi laporan, tinjau visual, tanya draf, rapikan bahan, kalimat bebas.',
  ] },
  { versi: '2.2.2', tanggal: '2026-11-19', isi: [
    'Perbaikan: tebak maksud pesan dan tanya draf kini jalan lewat router API (9router).',
  ] },
  { versi: '2.2', tanggal: '2026-11-19', isi: [
    'Bot bisa melihat gambar: sesudah menyusun draf, bot melihat tiap slide dan membetulkan sendiri teks yang meluber, label bertumpuk, atau panel kosong.',
    'Revisi pakai screenshot: balas *1*, kirim screenshot (boleh dicoret, boleh berketerangan) dan teks, lalu *selesai*.',
    'Tanya pakai screenshot: kirim gambar dengan keterangan pertanyaan, bot menjawab sambil melihat gambarnya.',
    'Bahan berupa gambar (infografis, tabel, foto) dibaca langsung dari gambarnya, bukan hanya dari teks hasil pindaian.',
  ] },
  { versi: '2.1.8', tanggal: '2026-11-19', isi: [
    'Bot bisa memakai router API (misalnya 9router) di depan beberapa akun Anthropic; diatur pemilik di mesin bot.',
  ] },
  { versi: '2.1.7', tanggal: '2026-11-19', isi: [
    'Menu draf: *1* Revisi, *2* Final, *3* Minta PPTX, *4* Lihat versi, *5* Batal.',
    'Perintah ditulis dengan format kode supaya jelas bisa diketik; keterangan biaya dan lama pembuatan miring.',
    'Spasi ganda di deck dirapikan otomatis sebelum PDF; temuan pemeriksaan lain masuk Perlu dicek dengan tanda belum dibetulkan.',
  ] },
  { versi: '2.1.6', tanggal: '2026-11-19', isi: [
    'Sesudah PDF draf, bot mengirim pesan terpisah "Ada revisi?" berisi biaya, lama pembuatan, cara revisi, dan menu angka.',
    'Kumpul revisi ditutup dengan *selesai* (atau "udah", "beres", "sudah semua"); *lanjut* tetap bisa.',
    'Catatan draf dikelompokkan (Perlu keputusan, Perlu dicek, Tidak dimuat, Catatan), paling banyak 4 butir per kelompok; catatan teknis tidak ditampilkan.',
  ] },
  { versi: '2.1.5', tanggal: '2026-11-19', isi: [
    'Perintah *terima kurang* bisa dipakai semua nomor terdaftar, tidak hanya pemilik.',
  ] },
  { versi: '2.1.4', tanggal: '2026-11-19', isi: [
    'Laporan penanganan V2 tidak lagi selalu ditolak pagar angka (hotspot dan firespot berlabel sama dulu saling dianggap salinan).',
    'Deck yang sudah jadi tidak dibuang: hapus slide cara biasa, angka dari teks revisi, format hasil agen yang meleset, atau agen terhenti sesudah selesai.',
    'Jatah biaya per laporan tidak lagi menolak percobaan ulang terlalu cepat.',
    'Draf dan final tidak lagi tertahan pembatas kiriman WA saat mode pemanasan atau sesudah pembuatan yang lama.',
    'Laporan harian yang WA-nya merinci lebih sedikit dari jumlah di kepalanya: pemilik bisa ketik *terima kurang*; Claude tidak pernah mengubah jumlah itu sendiri.',
    'Perbaikan alur: lanjut saat revisi dikumpulkan, ulangi sesudah kumpul revisi gagal, pesan "sedang dikerjakan" tidak muncul sebelum pertanyaan, pemegang draf harian bisa minta laporan penanganan dengan kalimat biasa.',
  ] },
  { versi: '2.1.3', tanggal: '2026-11-19', isi: [
    'Draf V2 tidak lagi gagal hanya karena ringkasan perubahannya terlalu panjang; ringkasannya dirapikan, deck tetap dipakai.',
  ] },
  { versi: '2.1.2', tanggal: '2026-11-19', isi: [
    'Begitu laporan atau revisi mulai dibuat, bot mengirim satu pesan konfirmasi berisi estimasi waktu dan perkiraan jam selesai.',
    'Estimasi makin tepat seiring pemakaian: dihitung dari lama pembuatan laporan sebelumnya.',
  ] },
  { versi: '2.1.1', tanggal: '2026-11-19', isi: [
    'Biaya Claude laporan tampil di tiap draf (sejauh ini) dan di pesan final (total).',
    'Perintah pemilik *biaya*: pemakaian bot bulan ini dan hari ini, plus biaya laporan terakhir.',
    'Sisa saldo kredit tidak ditampilkan lagi dan perintah *saldo* dicabut, karena saldo Console tidak realtime.',
  ] },
  { versi: '2.1', tanggal: '2026-11-19', isi: [
    'Bot paham kalimat biasa: misalnya "bikinin laporan harian kemarin", "udah oke finalkan", atau "laporanku gimana". Final dan batal tetap ditanya dulu.',
    'Bisa bertanya tentang isi draf ("slide 3 isinya apa") tanpa mengubah draf.',
    'Revisi panjang: ketik *revisi*, kirim revisinya dalam beberapa pesan (boleh diteruskan), lalu *lanjut*; semuanya dikerjakan sekaligus.',
    'Bahan WA yang formatnya berantakan dirapikan Claude bila tidak terbaca, tanpa mengubah angka, lalu laporan dibangun ulang.',
  ] },
  { versi: '2.0.2', tanggal: '2026-11-19', isi: [
    'Pemakaian bulan ini dihitung dari catatan harian lengkap, tidak lagi hanya sejak fitur biaya dipasang.',
    'Perintah pemilik *saldo* (misalnya *saldo 192,54*): bot menghitung sisa kredit Console.',
    'Nama bot, nomor versi, dan perintah *changelog*.',
    'Satu ikon di depan judul pesan supaya lebih mudah dibaca.',
  ] },
  { versi: '2.0.1', tanggal: '2026-11-19', isi: [
    'Sesudah *final*, bot menyebut biaya Claude laporan itu; perintah pemilik *biaya*.',
    'Kalau gagal, penyebabnya langsung tertulis di chat.',
    '*batal* menghapus semua bahan laporan itu, jadi *buat* berikutnya mulai dari awal.',
    'Kabar galat ke pemilik tidak lagi hilang diam-diam.',
    'Laporan harian tetap terbaca walau format WA Koordalops berubah (penomoran "1 .Bencana", label salah tulis, "Kota.").',
    'Laporan kejadian bencana harian tidak lagi menulis keterangan cut-off.',
  ] },
  { versi: '2.0', tanggal: '2026-11-19', isi: [
    'Bot V2 untuk nomor pemilik: Claude Code menyusun laporan di mesin bot, mengikuti laporan final kemarin dan pedoman dari kerja laporan sepekan terakhir.',
    'Revisi bebas, termasuk tata letak (hapus atau lebarkan panel), dalam satu percakapan per laporan.',
    'Angka hotspot, firespot, luas terbakar, dan belum padam dijaga mesin; draf yang mengubahnya ditolak.',
  ] },
  { versi: '1.1', tanggal: '2026-11-18', isi: [
    'Jawaban singkat atas pertanyaan revisi bot (misalnya "ya") dipahami.',
    'Balasan lebih cepat (2 sampai 4 detik); tanpa pesan kemajuan, cukup "sedang mengetik".',
    'Perintah *panduan* mengirim PDF; draf tersimpan dengan benar; revisi lewat WA bisa dipakai.',
  ] },
  { versi: '1.0', tanggal: '2026-11-18', isi: [
    'Bot proyek: *buat harian* atau *buat penanganan*, kirim bahan, *lanjut*, revisi dengan kalimat biasa, *final* ke Drive Tim IT.',
    'Menu angka di draf, riwayat *versi*, *balik v2*, *pptx*, *ulangi*, *batal*, status data satelit untuk laporan karhutla.',
    'Hanya nomor terdaftar yang bisa memakai bot.',
  ] },
  { versi: '0', tanggal: '2026-10-29', isi: [
    'Bot terjadwal: laporan harian dan laporan penanganan karhutla dibuat otomatis pada jam tetap dari bahan WA, tanpa revisi lewat chat.',
  ] },
]

const NAMA_BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
const tgl = (iso) => `${Number(iso.slice(8, 10))} ${NAMA_BULAN[Number(iso.slice(5, 7)) - 1]} ${iso.slice(0, 4)}`
export const labelVersi = (mode = null) => `${NAMA_BOT} v${VERSI}${mode ? ` (mode ${mode})` : ''}`

// Pesan *changelog*: n entri terbaru (bawaan 3), tiap entri versi, tanggal, dan butir perubahannya.
export function tChangelog(n = 3) {
  const blok = CHANGELOG.slice(0, n).map((c) => [`*v${c.versi}* (${tgl(c.tanggal)})`, ...c.isi.map((x) => `- ${x}`)].join('\n'))
  return [`*Changelog ${NAMA_BOT}*`, '', `Versi sekarang: v${VERSI}.`, '', ...blok.flatMap((b) => [b, '']),
    CHANGELOG.length > n ? `Ketik *changelog semua* untuk ${CHANGELOG.length} versi.` : ''].join('\n').trim()
}
