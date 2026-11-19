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
    <radialGradient id="${i}kulit" cx=".4" cy=".35" r=".75"><stop offset="0" class="sg-g-kulit-a"/><stop offset="1" class="sg-g-kulit-b"/></radialGradient>
    <linearGradient id="${i}helm" x1="0" y1="0" x2=".5" y2="1"><stop offset="0" class="sg-g-helm-a"/><stop offset="1" class="sg-g-helm-b"/></linearGradient>
    <linearGradient id="${i}baju" x1="0" y1="0" x2="0" y2="1"><stop offset="0" class="sg-g-baju-a"/><stop offset="1" class="sg-g-baju-b"/></linearGradient>
    <radialGradient id="${i}bayang" cx=".5" cy=".5" r=".5"><stop offset="0" class="sg-g-bayang-a"/><stop offset="1" class="sg-g-bayang-b"/></radialGradient>
  </defs>
  <ellipse cx="120" cy="268" rx="70" ry="9" fill="${u("bayang")}" class="mk-bayang"/>
  <g class="mk-tubuh">
    <!-- kaki dan sepatu -->
    <rect x="95" y="222" width="20" height="34" rx="7" class="sg-celana"/><rect x="125" y="222" width="20" height="34" rx="7" class="sg-celana"/>
    <path d="M95 240h20M125 240h20" class="sg-celana-garis" stroke-width="2"/>
    <path d="M86 264c0-9 7-14 16-14h14v16H88c-1 0-2-1-2-2Zm68 0c0-9-7-14-16-14h-14v16h28c1 0 2-1 2-2Z" class="sg-sepatu"/>
    <path d="M87 265h29M124 265h29" class="sg-sol" stroke-width="3" stroke-linecap="round"/>
    <!-- lengan kiri menggantung di samping badan, tangan di pinggang -->
    <path d="M84 172c-10 10-12 26-8 40" class="sg-lengan" stroke-width="18" stroke-linecap="round" fill="none"/>
    <!-- badan: seragam navy + rompi oranye reflektif -->
    <path d="M76 186c0-18 18-30 44-30s44 12 44 30v34c0 10-8 16-18 16H94c-10 0-18-6-18-16Z" fill="${u("baju")}"/>
    <path d="M86 168c8-6 20-10 34-10s26 4 34 10l-4 66H90Z" class="sg-rompi"/>
    <path d="M90 200h60M89 214h62" class="sg-reflektor" stroke-width="5"/>
    <image href="/lapor/lambang-bnpb.png" x="128" y="176" width="17" height="17" class="sg-lambang-dada"/>
    <path d="M104 158l16 14 16-14" class="sg-kerah" stroke-width="5" stroke-linejoin="round" stroke-linecap="round" fill="none"/>
    <!-- HT (radio genggam) petugas siaga di tangan kiri -->
    <g class="sg-ht" transform="rotate(-8 74 200)">
      <path d="M68 186V160" class="sg-ht-antena" stroke-width="4" stroke-linecap="round"/>
      <rect x="62" y="184" width="24" height="40" rx="6" class="sg-o sg-ht-badan"/>
      <rect x="66" y="190" width="16" height="10" rx="2" class="sg-ht-layar"/>
      <path d="M67 206h14M67 211h14M67 216h14" class="sg-ht-kisi" stroke-width="2" stroke-linecap="round"/>
      <circle cx="80" cy="183" r="3" class="sg-ht-tombol"/>
    </g>
    <rect x="61" y="208" width="24" height="20" rx="9" fill="${u("kulit")}" class="sg-o"/>
    <!-- tangan kanan melambai -->
    <g class="mk-lambai">
      <path d="M162 178c18-4 30-20 34-42" class="sg-lengan" stroke-width="20" stroke-linecap="round" fill="none"/>
      <path d="M186 144l20 4" class="sg-manset" stroke-width="9" stroke-linecap="round"/>
      <path d="M188 116v-12M194 114v-16M200 114v-15M206 117v-11" class="sg-jari" stroke-width="5.5" stroke-linecap="round"/>
      <path d="M186 126l-8-6" class="sg-jari" stroke-width="5.5" stroke-linecap="round"/>
      <rect x="184" y="112" width="26" height="28" rx="11" fill="${u("kulit")}" class="sg-o"/>
    </g>
    <!-- kepala -->
    <g class="mk-kepala">
      <circle cx="68" cy="104" r="10" fill="${u("kulit")}"/><circle cx="172" cy="104" r="10" fill="${u("kulit")}"/>
      <ellipse cx="120" cy="100" rx="54" ry="56" fill="${u("kulit")}"/>
      <!-- mata -->
      <g class="mk-mata">
        <ellipse cx="98" cy="108" rx="10" ry="13" class="sg-mata"/><ellipse cx="142" cy="108" rx="10" ry="13" class="sg-mata"/>
        <circle cx="101" cy="103" r="4" class="sg-binar"/><circle cx="145" cy="103" r="4" class="sg-binar"/>
        <circle cx="95" cy="114" r="2" class="sg-binar"/><circle cx="139" cy="114" r="2" class="sg-binar"/>
      </g>
      <path d="${ALIS[pose] || ALIS.sapa}" class="sg-alis" stroke-width="4" stroke-linecap="round" fill="none"/>
      <ellipse cx="80" cy="128" rx="9" ry="5.5" class="sg-pipi"/><ellipse cx="160" cy="128" rx="9" ry="5.5" class="sg-pipi"/>
      ${MULUT[pose] || MULUT.sapa}
      <!-- helm pengaman BNPB -->
      <path d="M62 82c0-36 26-60 58-60s58 24 58 60Z" fill="${u("helm")}"/>
      <path d="M54 82c0-4 3-6 7-6h118c4 0 7 2 7 6s-3 7-7 7H61c-4 0-7-3-7-7Z" class="sg-helm-tepi"/>
      <path d="M90 40c8-8 18-12 28-13" class="sg-helm-kilau" stroke-width="5" stroke-linecap="round" fill="none"/>
      <image href="/lapor/lambang-bnpb.png" x="104" y="39" width="32" height="32" class="sg-lambang"/>
    </g>
  </g>
</svg>`;
}
