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
export function maskot(pose = "sapa", judul = "") {
  const i = `sg${++n}`, u = x => `url(#${i}${x})`;
  return `<svg class="mk sg" data-pose="${pose}" viewBox="0 0 240 280" ${judul ? `role="img" aria-label="${judul}"` : 'aria-hidden="true"'}>
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
    <path d="M62 212c0-4 4-7 9-7h8c5 0 8 3 8 8v6c0 6-5 10-11 10h-4c-6 0-10-4-10-10Z" fill="${u("kulit")}" class="sg-o"/>
    <path d="M66 214h16" class="sg-ruas" stroke-width="2" stroke-linecap="round"/>
    <!-- tangan kanan melambai: telapak terbuka empat jari dan jempol -->
    <g class="mk-lambai">
      <path d="M162 178c18-4 30-20 34-42" class="sg-lengan" stroke-width="20" stroke-linecap="round" fill="none"/>
      <path d="M185 145l22 4" class="sg-manset" stroke-width="9" stroke-linecap="round"/>
      <path d="M187 141c-3-7-3-17 0-26 1-4 7-4 7 0v-9c0-4 7-4 7 0v-3c0-4 7-4 7 0v4c0-4 6-4 6 0v14c3-4 9-2 7 3l-5 11c-3 6-8 9-14 9h-4c-4 0-8-1-11-3Z" fill="${u("kulit")}" class="sg-o"/>
      <path d="M194 116v8M201 113v10M208 114v9" class="sg-ruas" stroke-width="2" stroke-linecap="round"/>
    </g>
    <!-- kepala -->
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
