# Standar INP — berlaku di SEMUA proyek

Aturan pemilik, 26 Agustus 2026. Berlaku untuk proyek yang sudah ada maupun
yang baru dibangun.

## Aturannya

**Klik tidak boleh membekukan layar.** Tiap interaksi wajib menghasilkan cat
berikutnya dalam hitungan puluhan milidetik, bukan menunggu subtree beratnya
selesai. Yang diukur INP (Interaction to Next Paint) bukan lamanya handler dan
bukan lamanya fetch, melainkan **waktu sampai ada piksel yang berubah karena
interaksi itu**. Handler kosong pun tetap merah kalau tidak ada apa pun yang
bisa dicat.

**Membungkus SELURUH setState dalam transition BUKAN obatnya.** Kalau semua
update non-urgent, browser tidak punya apa pun untuk dicat sampai transitionnya
commit — angkanya tidak bergerak. Obatnya selalu bentuk yang sama:

> Pisahkan **chrome** dari **isi**. Chrome kontrolnya (pil aktif, chevron,
> panah sort, cincin sel, `aria-expanded`) di-set URGENT. Subtree beratnya
> menyusul di pass deferred.

**Empat kelas, dan yang menentukan kelasnya adalah DI MANA state-nya tinggal:**

| State-nya di                        | Bentuknya                                   | Obatnya                            |
| ----------------------------------- | ------------------------------------------- | ---------------------------------- |
| tidak menggambar chrome apa pun     | tombol yang memindahkan tabel di tempat lain | bungkus callback-nya di transition |
| kontrol itu sendiri, `children` di dalamnya | akordeon, kategori lipat             | `useDeferredValue` untuk isi       |
| parent, isi berat juga di parent    | tab, paginasi, segmen, kotak cari           | echo lokal urgent + parent deferred |
| `usePathname()`, bukan state mana pun | pill nav & mini-tab ber-`href`            | echo jalur + `router.push` deferred |

**Kelas kelima, dan ia tidak kelihatan dari kode sama sekali: catnya tidak
pernah datang.** Diukur langsung di produksi 31 Agt 2026 pada pill sub-tab yang
SUDAH memakai echo urgent — handler + render urgentnya 1–8 ms, long task
sesudahnya 130–260 ms, overlay tetap melaporkan 202 ms. Sebabnya `startTransition`
menjadwalkan render deferred lewat MessageChannel, dan tugas itu jalan sebelum
browser sempat memproduksi frame; React menyerah pada input yang tertunda
(`isInputPending`), bukan pada frame yang tertunda. Obatnya satu tempat: serahkan
kerja deferred SESUDAH satu frame tercat (dua `requestAnimationFrame`, dengan
`setTimeout` sebagai jaring untuk tab tersembunyi), di rumah perkakas transisinya,
bukan di tiap pemanggil.

Kelas keempat yang paling sering terlewat: kontrolnya tidak memegang state apa
pun, jadi tidak ada `setX()` untuk dicurigai, dan tiap pemindai yang mencari
`set…(` akan meloloskannya.

**Aturan tanpa gerbang mekanis dianggap belum jadi.** Standar ini wajib punya
gerbangnya di tiap repo yang memakainya: sebuah test biasa (tanpa browser) yang
menolak kontrol berchrome baru yang belum memisahkan urgent dari deferred.

## Cara memasangnya di repo baru

Rujukannya `mbg-kdmp`: `components/ui/transisi.ts`,
`tests/unit/gerbang-inp-transisi.test.ts`, dan skill `inp-sweep`. Salin
polanya, jangan rancang ulang.

Empat hal yang tidak boleh hilang saat menyalin, dan urutannya bukan selera:

1. **Satu rumah perkakas transisi**, dibuat sebelum halaman kedua lahir.
   Dibikin belakangan, pola urgent/deferred ditulis ulang berbeda-beda di tiap
   halaman dan tidak ada satu tempat pun yang bisa membenahinya sekaligus.
2. **Kontrol bersama yang sudah memikul polanya sendiri** — tab, paginasi,
   sort, periode, akordeon, kotak cari. Halaman tidak menulis kontrolnya
   sendiri; yang ditulis sendiri selalu jadi kelas berchrome yang tak pernah
   ditanyai siapa pun.
3. **Gerbangnya sejak awal**, walau daftarnya masih kosong. Gerbang yang
   dipasang sesudah insiden selalu dipasang setelah satu layar terlanjur beku
   berminggu-minggu.
4. **Sapuan menyeluruh saat halamannya lewat sepuluh**, bukan saat overlay
   pertama muncul. Yang pertama muncul bukan yang terparah, cuma yang kebetulan
   sedang dibuka.

## Sapuan menyeluruh: skill `inp-sweep`

Overlay INP tidak pernah muncul sendirian — ia gejala sebuah KELAS yang hidup
di puluhan kontrol sekaligus. Menambalnya satu per satu saat ketahuan berarti
membayar ongkos penemuan berkali-kali untuk penyakit yang sama.

Alurnya: bagi permukaan jadi wilayah menurut **siapa yang mengkliknya dan
seberapa sering** (bukan menurut ukuran folder) → satu agent peninjau per
wilayah, semuanya paralel → terapkan fixnya sambil sisanya masih jalan →
tutup celah gerbangnya → sebut yang TIDAK dikerjakan.

**Halaman tanpa login selalu wilayah sendiri.** Halaman bertoken dibuka orang
luar dari HP kelas menengah-bawah di jaringan seluler: subtree yang sama
memblokir jauh lebih lama di sana, dan penggunanya tidak mengeluh ke siapa pun,
mereka cuma berhenti mengisi. Anggarannya paling ketat justru di tempat yang
paling jarang dilihat pemilik.

## Ranjau yang berulang tiap sapuan

**Hook sesudah early return.** Nilai deferred yang disisipkan di dekat tempat
pakainya sering mendarat di bawah `if (loading) return`. Itu melanggar urutan
hook; jalankan linter tertarget tiap habis menyunting, jangan tunggu push.

**Echo atas nilai non-primitif.** Pembanding echo memakai kesamaan referensi.
Diberi `Date`/objek/`Set` baru tiap render induk, ia mengira ada perubahan dari
luar di SETIAP render dan menimpa echonya sendiri — persis membatalkan pass
urgent yang jadi alasan ia dipakai. Echo string, bukan objek.

**Gerbang yang mendaftar PER BERKAS, bukan per handler.** Begitu satu handler
di sebuah berkas dikecualikan, semua handler lain di berkas yang sama ikut
lolos tanpa pernah diperiksa — dan berkasnya terlihat "sudah terdaftar". Ini
kegagalan paling sunyi dari semuanya.

**Pemindai `transisi()` yang menuntut atribut sebaris.** Aturan "transition
tidak boleh menelan chrome" biasanya dimesinkan dengan mencari
`onClick={transisi(` literal di satu baris. Dua bentuk tersering lolos darinya:
handler BERNAMA (`const gantiBuka = useMemo(() => transisi(...))`) dan atribut
bersyarat yang membuat `transisi(` jatuh di baris berikutnya. Pindai tiap
PEMANGGILAN `transisi(`, lalu tanya apakah state yang ditundanya ikut muncul di
sebuah `aria-expanded/pressed/current` — termasuk lewat turunan satu tingkat
(`const terbuka = buka === id`).

**Pemindai yang cuma mengenali satu bentuk penulisan.** Handler yang dipanggil
lewat fungsi bernama, nama state berbahasa Inggris di daftar kosakata
Indonesia, dan handler yang dioper sebagai prop ke komponen berhuruf besar:
ketiganya lolos dari regex yang cuma mencari `set…(` di baris klik.

## Yang TIDAK berubah

Bungkus-callback-di-transition tetap sah dan tetap yang paling murah untuk
kontrol yang memang tidak menggambar chrome apa pun. Yang dilarang cuma satu:
memakainya sebagai obat untuk kontrol yang chrome-nya ikut tertelan, lalu
menyimpulkan INP-nya sudah beres karena kodenya "sudah ada transition"-nya.
