/* Ilustrasi datar untuk topik edukasi yang tidak punya foto bencana (pemilik 19 Nov 2026: "kasih gambar dong").
   Satu adegan per topik, viewBox 160x100, warna lewat kelas .il-* di lapor.css (token tema). Pakai: ilustrasi("kekeringan") -> string SVG atau "". */
const A = {
  kekeringan: `<circle cx="122" cy="26" r="14" class="il-matahari"/><path d="M122 4v6M122 42v6M100 26h6M138 26h6M106 10l4 4M134 38l4 4M106 42l4-4M134 14l4-4" class="il-garis-matahari"/>
    <path d="M0 70h160v30H0Z" class="il-tanah"/><path d="M20 78l10 6-4 8M60 74l-6 10 8 6M96 80l12 4 4 10M130 76l-8 8 6 8" class="il-retak"/>
    <path d="M38 70c0-10 2-18 6-22M44 48c-6 0-10 4-10 8M44 52c5-2 9 0 10 4" class="il-batang-kering"/>`,
  "kebakaran-permukiman": `<path d="M40 50l26-20 26 20v38H40Z" class="il-rumah"/><path d="M34 52l32-26 32 26" class="il-atap"/><rect x="58" y="66" width="14" height="22" class="il-pintu"/>
    <path d="M92 40c-4-10 4-16 2-24 10 8 14 16 10 24 6-4 6-10 6-10 6 8 4 20-6 24-10 2-16-6-12-14Z" class="il-api"/><path d="M98 54c-2-6 2-8 2-12 5 4 6 9 3 12Z" class="il-api-dalam"/>
    <rect x="116" y="58" width="16" height="30" rx="6" class="il-tabung"/><rect x="120" y="52" width="8" height="8" rx="2" class="il-tabung-kepala"/><path d="M0 88h160v12H0Z" class="il-tanah-hijau"/>`,
  "tas-siaga": `<rect x="50" y="30" width="60" height="62" rx="14" class="il-tas"/><path d="M64 30v-6a16 16 0 0 1 32 0v6" class="il-tali"/><rect x="60" y="56" width="40" height="26" rx="6" class="il-saku"/>
    <path d="M80 62v14M73 69h14" class="il-palang"/><rect x="118" y="54" width="12" height="38" rx="4" class="il-botol"/><rect x="120" y="48" width="8" height="8" rx="2" class="il-tutup"/><rect x="26" y="66" width="20" height="26" rx="3" class="il-senter"/><path d="M26 66l-4-8h28l-4 8" class="il-senter-kepala"/>`,
  "rencana-keluarga": `<path d="M0 86h160v14H0Z" class="il-tanah-hijau"/><circle cx="52" cy="40" r="10" class="il-kulit"/><path d="M38 86V64a14 14 0 0 1 28 0v22" class="il-baju-a"/>
    <circle cx="86" cy="44" r="9" class="il-kulit"/><path d="M74 86V67a12 12 0 0 1 24 0v19" class="il-baju-b"/><circle cx="114" cy="56" r="7" class="il-kulit"/><path d="M105 86V73a9 9 0 0 1 18 0v13" class="il-baju-c"/>
    <path d="M128 20h20v14h-20zM128 20v40" class="il-bendera"/><circle cx="138" cy="27" r="3" class="il-titik-kumpul"/>`,
  "nomor-darurat": `<rect x="58" y="10" width="44" height="82" rx="10" class="il-hp"/><rect x="63" y="20" width="34" height="58" rx="4" class="il-layar"/>
    <text x="80" y="56" text-anchor="middle" class="il-teks">117</text><path d="M30 40c6-6 12-6 16 0M24 32c10-10 22-10 30 0M114 40c6-6 12-6 16 0M108 32c10-10 22-10 30 0" class="il-gelombang"/>`,
  "peringatan-resmi": `<path d="M44 46h18l30-20v56L62 62H44Z" class="il-toa"/><rect x="46" y="62" width="12" height="22" rx="3" class="il-toa-gagang"/>
    <path d="M104 40c6 6 6 18 0 24M114 32c12 12 12 28 0 40M124 24c18 18 18 38 0 56" class="il-gelombang"/>`,
  "kelompok-rentan": `<path d="M0 88h160v12H0Z" class="il-tanah-hijau"/>
    <circle cx="34" cy="34" r="9" class="il-kulit"/><path d="M28 30c2-6 10-8 14-2" class="il-uban"/><rect x="24" y="45" width="20" height="34" rx="9" class="il-baju-c"/><path d="M50 52v36" class="il-tongkat"/><path d="M44 54l6-2" class="il-tongkat"/><rect x="26" y="76" width="7" height="12" rx="3" class="il-baju-c"/><rect x="35" y="76" width="7" height="12" rx="3" class="il-baju-c"/>
    <circle cx="80" cy="30" r="9" class="il-kulit"/><path d="M71 28c0-8 18-8 18 0v4h-18Z" class="il-rambut"/><path d="M68 46c0-4 6-6 12-6s12 2 12 6v28c0 4-4 6-12 6s-12-2-12-6Z" class="il-baju-b"/><ellipse cx="80" cy="56" rx="8" ry="6" class="il-selimut"/><circle cx="76" cy="54" r="3.5" class="il-kulit"/>
    <rect x="72" y="78" width="7" height="10" rx="3" class="il-baju-b"/><rect x="81" y="78" width="7" height="10" rx="3" class="il-baju-b"/>
    <circle cx="124" cy="40" r="8" class="il-kulit"/><rect x="116" y="50" width="16" height="22" rx="7" class="il-baju-a"/><circle cx="114" cy="76" r="11" class="il-roda"/><path d="M112 64h22v10M134 74l6 14" class="il-kursi"/>
    <path d="M140 14a6 6 0 0 1 10 0c0 6-5 9-5 9s-5-3-5-9Z" class="il-hati"/>`,
  "kesehatan-pengungsian": `<path d="M0 86h160v14H0Z" class="il-tanah-hijau"/><path d="M20 86l36-50 36 50Z" class="il-tenda"/><path d="M56 36v50M48 86l8-20 8 20" class="il-tenda-pintu"/>
    <path d="M118 30c10 14 16 22 16 32a16 16 0 0 1-32 0c0-10 6-18 16-32Z" class="il-tetes"/><path d="M118 52v14M111 59h14" class="il-palang-putih"/>`,
  hoaks: `<rect x="22" y="22" width="56" height="40" rx="8" class="il-gelembung-a"/><path d="M34 62l-6 12 16-12" class="il-gelembung-a"/><path d="M38 36l24 12M62 36L38 48" class="il-silang"/>
    <rect x="84" y="38" width="56" height="40" rx="8" class="il-gelembung-b"/><path d="M128 78l6 12-16-12" class="il-gelembung-b"/><path d="M100 58l8 8 16-16" class="il-centang"/>`,
  "cara-lapor": `<rect x="56" y="10" width="48" height="84" rx="10" class="il-hp"/><rect x="61" y="20" width="38" height="60" rx="4" class="il-layar"/>
    <rect x="66" y="28" width="22" height="9" rx="4" class="il-gelembung-a"/><rect x="72" y="42" width="22" height="9" rx="4" class="il-gelembung-b"/><circle cx="80" cy="66" r="7" class="il-pin"/>
    <rect x="114" y="36" width="34" height="26" rx="5" class="il-kamera"/><circle cx="131" cy="49" r="7" class="il-lensa"/><path d="M14 52h30M34 42l10 10-10 10" class="il-panah"/>`,
};
export const adaIlustrasi = id => id in A;
export function ilustrasi(id) {
  return A[id] ? `<svg class="il" viewBox="0 0 160 100" aria-hidden="true" preserveAspectRatio="xMidYMid meet">${A[id]}</svg>` : "";
}
