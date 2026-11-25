/* Maskot Lapor Bencana: "Sigap", petugas BNPB versi chibi (pemilik 19 Nov 2026: telur bulat "jelek banget sumpah").
   Prinsip karakter yang dipakai: siluet terbaca dari jauh (helm + seragam = petugas), proporsi chibi kepala hampir sebesar badan,
   palet sempit (navy, oranye, kulit, putih), wajah ekspresif (mata besar dua titik cahaya, alis, mulut terbuka), logo BNPB sekali di helm,
   satu gestur jelas (melambai) dan satu properti (HP = melapor). Volume lewat gradien lembut, bukan garis tepi.
   Warna lewat kelas .sg-* di lapor.css (token tema). Gerak lewat CSS (.mk): apung, kedip, lambai; mati saat prefers-reduced-motion.
   Pakai: maskot("sapa") -> string SVG. */
let n = 0;
/* ekspresi per pose (pemilik 19 Nov 2026: maskot interaktif, "sedikit lagi ayo", "terima kasih banyak", ikut prihatin bila kejadiannya berat) */
const ALIS = {sapa: "M86 88c5-4 12-5 18-3M136 85c6-2 13-1 18 3", semangat: "M85 84c6-5 13-6 19-3M136 81c6-3 13-2 19 3", senang: "M86 86c5-5 12-6 18-3M136 83c6-3 13-2 18 3",
  sedih: "M86 84c6 2 12 4 18 8M154 84c-6 2-12 4-18 8"};
const MULUT = {
  sapa: '<path d="M106 128c4 12 24 12 28 0Z" class="sg-mulut"/><path d="M112 134c4 4 12 4 16 0" class="sg-lidah" stroke-width="4" stroke-linecap="round" fill="none"/>',
  semangat: '<path d="M104 126c4 15 28 15 32 0Z" class="sg-mulut"/><path d="M111 134c5 5 13 5 18 0" class="sg-lidah" stroke-width="4" stroke-linecap="round" fill="none"/>',
  senang: '<path d="M102 125c5 18 31 18 36 0Z" class="sg-mulut"/><path d="M110 135c6 6 14 6 20 0" class="sg-lidah" stroke-width="4" stroke-linecap="round" fill="none"/>',
  sedih: '<path d="M108 136c6-7 18-7 24 0" class="sg-alis" stroke-width="4" stroke-linecap="round" fill="none"/>'};
/* aksi: maskot memegang papan berikon sesuai yang sedang dijelaskan, geraknya beda per aksi (pemilik 25 Nov 2026: "kalo lapor kejadian tindakannya mungkin berbeda").
   Ikon dari sprite halaman (#i-*), jadi hanya dipakai di halaman yang memuat sprite itu. */
const AKSI = {darurat: "i-sirene", lapor: "i-kirim", status: "i-status", pasang: "i-unduh", peringatan: "i-sirene", hilang: "i-cari",
  info: "i-lokasi", edukasi: "i-daftar", penting: "i-telepon", bahasa: "i-bahasa", laporan: "i-pesan"};

/* lengan kanan per aksi (pemilik 25 Nov 2026: "jangan cuma menghadap ke depan, ngapain kek dia"): tiap aksi punya gestur dan benda sendiri.
   Bahu kanan di (162,178). k = isian kulit. */
const TANGAN = (x, y, k, r = 10) => `<ellipse cx="${x}" cy="${y}" rx="${r}" ry="${r * .9}" fill="${k}" class="sg-o"/>`;
const DEPAN = (k, benda) => `<g class="mk-aksi">
      <path d="M162 178c12 8 10 24-8 28" class="sg-lengan" stroke-width="20" stroke-linecap="round" fill="none"/>${benda}${TANGAN(150, 206, k)}</g>`;
const LENGAN = {
  // mengetik laporan di HP, pesawat kertas terbang dari layar
  lapor: k => DEPAN(k, `<g class="mk-benda"><rect x="128" y="168" width="30" height="46" rx="6" class="sg-hp"/><rect x="132" y="174" width="22" height="32" rx="2" class="sg-hp-layar"/>
      <path d="M136 182h14M136 188h10M136 194h12" class="sg-hp-teks" stroke-width="2" stroke-linecap="round"/></g>
      <path d="M176 150l18-9-6 19-4-6Z" class="sg-pesawat mk-terbang"/>`),
  // memeriksa papan klip, centang tergambar
  status: k => DEPAN(k, `<g class="mk-benda"><rect x="122" y="166" width="40" height="50" rx="5" class="sg-klip"/><rect x="127" y="172" width="30" height="40" rx="2" class="sg-kertas"/>
      <rect x="134" y="162" width="16" height="8" rx="2" class="sg-klip-jepit"/><path d="M131 182h10M131 192h16M131 202h12" class="sg-hp-teks" stroke-width="2" stroke-linecap="round"/>
      <path d="M144 182l3 3 6-7" class="sg-centang mk-gores" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" fill="none"/></g>`),
  // membaca buku panduan, halaman bergerak
  edukasi: k => DEPAN(k, `<g class="mk-benda"><path d="M118 176q16-6 26 2v40q-10-8-26-2Z" class="sg-buku"/><path d="M170 176q-16-6-26 2v40q10-8 26-2Z" class="sg-buku"/>
      <path d="M144 178v40" class="sg-buku-tengah" stroke-width="2"/><path d="M123 186q9-3 16 1M123 194q9-3 16 1M149 187q8-4 16-1M149 195q8-4 16-1" class="sg-hp-teks" stroke-width="1.8" fill="none"/>
      <path d="M144 178q12-8 24-2v40q-12-6-24 2Z" class="sg-buku-halaman mk-balik"/></g>`),
  // memegang HP, panah unduh masuk ke layar
  pasang: k => DEPAN(k, `<g class="mk-benda"><rect x="128" y="168" width="30" height="46" rx="6" class="sg-hp"/><rect x="132" y="174" width="22" height="32" rx="2" class="sg-hp-layar"/>
      <path d="M143 178v14M137 186l6 6 6-6M137 198h12" class="sg-unduh mk-turun" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" fill="none"/></g>`),
  // menelepon: gagang di telinga, gelombang suara
  penting: k => `<g class="mk-aksi"><path d="M162 178c16-6 20-30 12-58" class="sg-lengan" stroke-width="20" stroke-linecap="round" fill="none"/>
      <rect x="166" y="92" width="14" height="34" rx="6" class="sg-hp" transform="rotate(14 173 109)"/>${TANGAN(175, 118, k)}
      <path d="M190 96q6 6 0 14M198 90q10 12 0 26" class="sg-gelombang mk-denyar" stroke-width="3" stroke-linecap="round" fill="none"/></g>`,
  // mencari: kaca pembesar di depan mata, menyapu kiri kanan
  hilang: k => `<g class="mk-aksi mk-sapu"><path d="M162 178c18-4 26-24 26-46" class="sg-lengan" stroke-width="20" stroke-linecap="round" fill="none"/>
      <path d="M186 128l-8-16" class="sg-gagang" stroke-width="7" stroke-linecap="round"/><circle cx="172" cy="100" r="17" class="sg-lensa"/><circle cx="172" cy="100" r="17" class="sg-lensa-tepi" stroke-width="5" fill="none"/>
      ${TANGAN(188, 132, k)}</g>`,
  // menunjuk ke atas: pin lokasi memantul
  info: k => `<g class="mk-aksi"><path d="M162 178c18-4 28-22 30-48" class="sg-lengan" stroke-width="20" stroke-linecap="round" fill="none"/>${TANGAN(192, 128, k)}
      <path d="M192 120v-18" class="sg-telunjuk" stroke="${k}" stroke-width="7" stroke-linecap="round"/>
      <g class="mk-pantul"><path d="M206 56c-9 0-15 7-15 15 0 10 15 23 15 23s15-13 15-23c0-8-6-15-15-15Z" class="sg-pin"/><circle cx="206" cy="71" r="5" class="sg-kertas"/></g></g>`,
  // membunyikan lonceng peringatan
  peringatan: k => `<g class="mk-aksi"><path d="M162 178c18-4 30-22 32-46" class="sg-lengan" stroke-width="20" stroke-linecap="round" fill="none"/>
      <g class="mk-goyang"><path d="M194 92c-11 0-17 9-17 19v10l-5 7h44l-5-7v-10c0-10-6-19-17-19Z" class="sg-lonceng"/><circle cx="194" cy="132" r="4" class="sg-lonceng"/>
      <path d="M170 92q-6 8 0 16M218 92q6 8 0 16" class="sg-gelombang mk-denyar" stroke-width="3" stroke-linecap="round" fill="none"/></g>${TANGAN(194, 134, k)}</g>`,
  // darurat: HT diangkat, lampu sirene berkedip di tangan
  darurat: k => `<g class="mk-aksi"><path d="M162 178c18-4 30-22 32-46" class="sg-lengan" stroke-width="20" stroke-linecap="round" fill="none"/>
      <path d="M180 120h28v10h-28Z" class="sg-sirene-alas"/><path d="M184 120c0-14 20-14 20 0Z" class="sg-sirene mk-kedip"/>
      <path d="M176 104l-6-6M194 96v-8M212 104l6-6" class="sg-sirene-sinar mk-kedip" stroke-width="3" stroke-linecap="round"/>${TANGAN(194, 134, k)}</g>`,
  // bahasa: gelembung bicara bergantian
  bahasa: k => `<g class="mk-aksi"><path d="M162 178c18-4 28-20 30-40" class="sg-lengan" stroke-width="20" stroke-linecap="round" fill="none"/>${TANGAN(192, 136, k)}
      <g class="mk-ucap1"><rect x="176" y="70" width="40" height="26" rx="10" class="sg-gelembung"/><path d="M184 80h24M184 87h14" class="sg-hp-teks" stroke-width="2.4" stroke-linecap="round"/></g>
      <g class="mk-ucap2"><rect x="186" y="96" width="34" height="22" rx="9" class="sg-gelembung dua"/><path d="M193 105h20" class="sg-hp-teks" stroke-width="2.4" stroke-linecap="round"/></g></g>`,
};
LENGAN.laporan = LENGAN.status;
export function maskot(pose = "sapa", judul = "", aksi = "") {
  const ik = AKSI[aksi], i0 = `sg${n + 1}`, lengan = LENGAN[aksi]?.(`url(#${i0}kulit)`) || "";
  const i = `sg${++n}`, u = x => `url(#${i}${x})`;
  return `<svg class="mk sg" data-pose="${pose}"${ik ? ` data-aksi="${aksi}"` : ""} viewBox="0 0 240 280" ${judul ? `role="img" aria-label="${judul}"` : 'aria-hidden="true"'}>
  <defs>
    <radialGradient id="${i}kulit" cx=".4" cy=".35" r=".75"><stop offset="0" class="sg-g-kulit-a" stop-color="#fde4cf"/><stop offset="1" class="sg-g-kulit-b" stop-color="#f6c79f"/></radialGradient>
    <linearGradient id="${i}helm" x1="0" y1="0" x2=".5" y2="1"><stop offset="0" class="sg-g-helm-a" stop-color="#f39a4e"/><stop offset="1" class="sg-g-helm-b" stop-color="#e0662f"/></linearGradient>
    <linearGradient id="${i}baju" x1="0" y1="0" x2="0" y2="1"><stop offset="0" class="sg-g-baju-a" stop-color="#2c4a7a"/><stop offset="1" class="sg-g-baju-b" stop-color="#13254a"/></linearGradient>
    <radialGradient id="${i}bayang" cx=".5" cy=".5" r=".5"><stop offset="0" class="sg-g-bayang-a" stop-color="#13254a" stop-opacity=".35"/><stop offset="1" class="sg-g-bayang-b" stop-color="#13254a" stop-opacity="0"/></radialGradient>
  </defs>
  <ellipse cx="120" cy="268" rx="70" ry="9" fill="${u("bayang")}" class="mk-bayang"/>
  <g class="mk-tubuh">
    <!-- kaki: celana navy, sepatu bot dengan ujung bulat dan sol terang -->
    <rect x="96" y="226" width="20" height="30" rx="7" class="sg-celana"/><rect x="124" y="226" width="20" height="30" rx="7" class="sg-celana"/>
    <path d="M96 242h20M124 242h20" class="sg-celana-garis" stroke-width="2.5"/>
    <path d="M88 266c0-10 7-15 16-15h13v17H90c-1 0-2-1-2-2Zm64 0c0-10-7-15-16-15h-13v17h27c1 0 2-1 2-2Z" class="sg-sepatu"/>
    <path d="M89 266h28M123 266h28" class="sg-sol" stroke-width="3" stroke-linecap="round"/>
    <!-- lengan kiri ke depan memegang HT -->
    <path d="M84 172c-10 10-12 26-8 40" class="sg-lengan" stroke-width="18" stroke-linecap="round" fill="none"/>
    <!-- badan: seragam navy, rompi oranye reflektif bersaku, sabuk -->
    <path d="M76 186c0-18 18-30 44-30s44 12 44 30v34c0 10-8 16-18 16H94c-10 0-18-6-18-16Z" fill="${u("baju")}"/>
    <path d="M86 168c8-6 20-10 34-10s26 4 34 10l-3 62H89Z" class="sg-rompi"/>
    <path d="M120 162v66" class="sg-ritsleting" stroke-width="2.5" stroke-linecap="round"/>
    <path d="M89 196h62M88 216h64" class="sg-reflektor" stroke-width="5"/>
    <rect x="94" y="202" width="17" height="11" rx="3" class="sg-saku"/><rect x="129" y="202" width="17" height="11" rx="3" class="sg-saku"/>
    <rect x="87" y="226" width="66" height="7" rx="3" class="sg-sabuk"/><rect x="115" y="225" width="10" height="9" rx="2" class="sg-gesper"/>
    <circle cx="137" cy="181" r="9.5" class="sg-lencana"/>
    <image href="/lapor/lambang-bnpb.png" x="129" y="173" width="16" height="16" class="sg-lambang-dada"/>
    <path d="M104 158l16 14 16-14" class="sg-kerah" stroke-width="5" stroke-linejoin="round" stroke-linecap="round" fill="none"/>
    <!-- HT (radio genggam) petugas siaga -->
    <g class="sg-ht" transform="rotate(-8 74 200)">
      <path d="M68 186V160" class="sg-ht-antena" stroke-width="4" stroke-linecap="round"/>
      <rect x="62" y="184" width="24" height="40" rx="6" class="sg-o sg-ht-badan"/>
      <rect x="66" y="190" width="16" height="10" rx="2" class="sg-ht-layar"/>
      <path d="M67 206h14M67 211h14M67 216h14" class="sg-ht-kisi" stroke-width="2" stroke-linecap="round"/>
      <circle cx="80" cy="183" r="3" class="sg-ht-tombol"/>
    </g>
    <!-- kepalan tangan menggenggam HT: empat ruas jari melingkar di depan, jempol di atas (pemilik 21 Nov 2026: "tangan benerin") -->
    <rect x="62" y="206" width="22" height="18" rx="8" fill="${u("kulit")}" class="sg-o"/>
    <path d="M66 212h14M66 218h14" class="sg-ruas" stroke-width="1.8" stroke-linecap="round"/>
    <ellipse cx="82" cy="207" rx="4" ry="3.5" fill="${u("kulit")}" class="sg-o"/>
${lengan || `    <!-- tangan kanan melambai: telapak terbuka empat jari dan jempol -->
    <g class="mk-lambai">
      <path d="M162 178c18-4 30-20 34-42" class="sg-lengan" stroke-width="20" stroke-linecap="round" fill="none"/>
      <path d="M185 145l22 4" class="sg-manset" stroke-width="9" stroke-linecap="round"/>
      <!-- telapak lebar dengan jempol: terbaca juga saat maskot kecil -->
      <!-- tangan kartun terbuka: empat jari dan jempol; lapis tepi digambar dulu lalu lapis kulit, jadi siluetnya satu tanpa garis di dalam
           (pemilik 21 Nov 2026: "tangannya ga natural sebagai animasi") -->
      <g class="sg-tangan-tepi"><path d="M189.5 126Q187 119 185.5 112M194.5 123Q193.5 115 193 107M199.5 123Q200.5 115 201.5 108M204 126Q206 120 208 114M187.5 135Q183 131 180 127" stroke-width="9" stroke-linecap="round"/><ellipse cx="196.5" cy="133" rx="10.5" ry="11.5" stroke-width="3.5"/></g>
      <path d="M189.5 126Q187 119 185.5 112M194.5 123Q193.5 115 193 107M199.5 123Q200.5 115 201.5 108M204 126Q206 120 208 114M187.5 135Q183 131 180 127" stroke="${u("kulit")}" stroke-width="5.6" stroke-linecap="round" fill="none"/>
      <ellipse cx="196.5" cy="133" rx="10.5" ry="11.5" fill="${u("kulit")}"/>
    </g>
`}    <!-- kepala -->
    <g class="mk-kepala">
      <circle cx="69" cy="106" r="10" fill="${u("kulit")}" class="sg-o"/><circle cx="171" cy="106" r="10" fill="${u("kulit")}" class="sg-o"/>
      <path d="M66 106h5M169 106h5" class="sg-ruas" stroke-width="2" stroke-linecap="round"/>
      <ellipse cx="120" cy="102" rx="53" ry="54" fill="${u("kulit")}"/>
      <!-- poni rambut di bawah helm -->
      <path d="M68 104c3-6 9-9 15-8 2 5 7 7 12 5 4-6 12-8 18-4 4 4 10 5 14 1 6-5 15-4 19 2 5 2 10 1 14-3 6 0 10 3 12 7l-2-14H70Z" class="sg-rambut"/>
      <!-- mata beriris dengan dua titik cahaya -->
      <g class="mk-mata">
        <ellipse cx="98" cy="110" rx="10.5" ry="13" class="sg-mata"/><ellipse cx="142" cy="110" rx="10.5" ry="13" class="sg-mata"/>
        <ellipse cx="98" cy="114" rx="7" ry="7.5" class="sg-iris"/><ellipse cx="142" cy="114" rx="7" ry="7.5" class="sg-iris"/>
        <circle cx="102" cy="104" r="4.2" class="sg-binar"/><circle cx="146" cy="104" r="4.2" class="sg-binar"/>
        <circle cx="94.5" cy="117" r="2" class="sg-binar"/><circle cx="138.5" cy="117" r="2" class="sg-binar"/>
      </g>
      <path d="${ALIS[pose] || ALIS.sapa}" class="sg-alis" stroke-width="4" stroke-linecap="round" fill="none"/>
      <path d="M117 121c2 2.5 4 2.5 6 0" class="sg-hidung" stroke-width="2.5" stroke-linecap="round" fill="none"/>
      <ellipse cx="80" cy="130" rx="9" ry="5.5" class="sg-pipi"/><ellipse cx="160" cy="130" rx="9" ry="5.5" class="sg-pipi"/>
      ${MULUT[pose] || MULUT.sapa}
      <!-- helm pengaman BNPB: kubah, gigir tengah, piringan lencana, tepi -->
      <path d="M63 86c0-37 25-63 57-63s57 26 57 63Z" fill="${u("helm")}"/>
      <path d="M111 25c4-2 14-2 18 0l2 60h-22Z" class="sg-helm-gigir"/>
      <circle cx="120" cy="58" r="17" class="sg-lencana"/>
      <image href="/lapor/lambang-bnpb.png" x="105" y="43" width="30" height="30" class="sg-lambang"/>
      <path d="M53 86c0-5 4-8 9-8h116c5 0 9 3 9 8s-4 8-9 8H62c-5 0-9-3-9-8Z" class="sg-helm-tepi"/>
      <path d="M78 50c6-11 15-18 26-21" class="sg-helm-kilau" stroke-width="5" stroke-linecap="round" fill="none"/>
    </g>
  </g>
</svg>`;
}
