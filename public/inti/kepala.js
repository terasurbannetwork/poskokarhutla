/* Menu pilihan bencana di kepala, digambar dari /bencana.json (registry) plus nama "Semua bencana" dari /inti/peta_situs_publik.json.
   Pasang: <details class="bencana" data-bencana="<id halaman>" [data-tanpa-segera]> dengan markup cadangan statis di dalamnya.
   Bila registry gagal dimuat, markup cadangan dibiarkan apa adanya. Bencana tanpa ikon di IKON tidak ditampilkan. */
export const IKON = {
  karhutla: '<path fill="#f08a3c" d="M12 2.5c1.8 4 6.5 6.4 6.5 11.5a6.5 6.5 0 0 1-13 0c0-2.5 1.2-4.3 2.8-5.8.3 2.1 1.4 3.3 2.7 3.8C10.6 9 11.1 5.8 12 2.5Z"/><path fill="#ffd36b" d="M12 20.5a3.5 3.5 0 0 1-3.5-3.5c0-2 1.7-3.1 3.5-5.8 1.8 2.7 3.5 3.8 3.5 5.8a3.5 3.5 0 0 1-3.5 3.5Z"/>',
  banjir: '<path fill="#4f9be0" d="M12 2.5s-6 6.7-6 11a6 6 0 0 0 12 0c0-4.3-6-11-6-11Z"/><path fill="none" stroke="#fff" stroke-width="1.6" stroke-linecap="round" d="M9 14.5a3 3 0 0 0 3 3"/>',
  gempa: '<path fill="#8a6d4e" d="M2 13h4l2-5 3 10 3-12 2 7h6v2h-7l-1-3-3 11-3-10-1 3H2z"/>',
  cuaca: '<path fill="#7d8ca3" d="M7 18a5 5 0 1 1 1.2-9.9A6 6 0 0 1 19.5 10 4 4 0 0 1 18 18z"/><path fill="#e3b94e" d="m12 13-2 5h2.5l-1 4 4-6h-2.5l1.5-3z"/>',
  pesisir: '<path fill="none" stroke="#2f7fb8" stroke-width="2" stroke-linecap="round" d="M2.5 9c2.2-2.4 4.3-2.4 6.5 0s4.3 2.4 6.5 0 4.3-2.4 6 0M2.5 14c2.2-2.4 4.3-2.4 6.5 0s4.3 2.4 6.5 0 4.3-2.4 6 0M2.5 19c2.2-2.4 4.3-2.4 6.5 0s4.3 2.4 6.5 0 4.3-2.4 6 0"/>',
  udara: '<path fill="none" stroke="#4a9d9c" stroke-width="2" stroke-linecap="round" d="M3 8h11a3 3 0 1 0-3-3M3 12h16a3 3 0 1 1-3 3M3 16h8"/>',
  kekeringan: '<circle cx="12" cy="12" r="4.5" fill="#d9a441"/><path fill="none" stroke="#d9a441" stroke-width="1.8" stroke-linecap="round" d="M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M5.3 18.7l1.8-1.8M16.9 7.1l1.8-1.8"/>',
  gunungapi: '<path fill="#b5523b" d="M3 21 9 10h6l6 11z"/><path fill="#e58a45" d="M10 10l1-3h2l1 3z"/><path fill="none" stroke="#9aa3ad" stroke-width="1.6" stroke-linecap="round" d="M12 6c-1-1.5 0-3 1.5-3.5M14 5c1-1 2.5-1 3.5 0"/>',
};
const svg = (isi, atr = "") => `<svg class="bc-ik" viewBox="0 0 24 24" aria-hidden="true"${atr}>${isi}</svg>`;
const SEMUA = svg('<rect x="3.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.5"/>', ' fill="none" stroke="currentColor" stroke-width="2"');
const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const rata = p => p.replace(/\.html$/, "").replace(/(.)\/$/, "$1");

const kini = (rute, lokasi) => rata(rute) === lokasi ? ' aria-current="page"' : "";

/* Tombol kepala sesudah menu bencana: Prediksi, Lapor, Masuk (D6 peta-situs). Tautan polos, tanpa JS klik; dipasang tanpa menunggu fetch. */
const TOMBOL = [
  ["/prediksi", "Prediksi", '<path d="M3 17l5-6 4 3 8-9M15 5h5v5"/>'],
  ["/lapor", "Lapor", '<path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z"/><path d="M12 7v4M12 13.5v.01"/>'],
  ["/masuk", "Masuk", '<path d="M14 4h5v16h-5M10 8l4 4-4 4M14 12H3"/>'],
];
function tombol(d) {
  if (d.nextElementSibling?.classList.contains("bc-pred")) return;
  const p = location.pathname;
  d.insertAdjacentHTML("afterend", TOMBOL.map(([r, n, ik]) =>
    `<a class="bc-pred" href="${r}"${p === r || (p.startsWith(r + "/") && !p.startsWith("/lapor/meja")) ? ' aria-current="page"' : ""}>${svg(ik, ' fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"')}<span>${n}</span></a>`).join(""));
}

async function gambar(d) {
  /* registri bencana wajib (urutan, ikon, status); peta situs publik boleh gagal: menu tetap jalan dengan nama bawaan */
  const peta = fetch("/inti/peta_situs_publik.json").then(r => r.ok ? r.json() : null).catch(() => null);
  const r = await fetch("/bencana.json");
  if (!r.ok) throw new Error(r.status);
  /* TAMPIL berisi id = hanya itu yang bisa dibuka dari menu, sisanya berlabel "Soon". Kosong = semua bencana berstatus aktif
     terbuka. Pemilik menutup lagi bencana selain karhutla jadi "Soon" (21 Okt 2026), lalu membuka banjir (27 Okt 2026), gunung api (10 Nov 2026), serta gempa dan kekeringan (11 Nov 2026: "semua coming soon dibuka aja"). */
  const TAMPIL = new Set(["karhutla", "banjir", "pesisir", "cuaca", "gunungapi", "gempa", "kekeringan"]);
  const reg = (await r.json()).bencana;
  /* urutan menu (pemilik, 1 Nov 2026, dikonfirmasi ulang): Karhutla, Banjir, Cuaca Ekstrem tepat di bawah Banjir, lalu Pesisir,
     Gempa, Gunung api, Kekeringan; sisanya (udara) di belakang */
  const URUT = ["karhutla", "banjir", "cuaca", "pesisir", "gempa", "gunungapi", "kekeringan"];
  const nomor = b => (n => n < 0 ? URUT.length : n)(URUT.indexOf(b.id));
  const lengkap = reg.slice().sort((x, y) => nomor(x) - nomor(y)).filter(b => IKON[b.ikon]);
  const daftar = lengkap.filter(b => b.menu !== false);   /* menu:false = halaman hidup tapi bukan jenis bencana BNPB (udara) */
  const buka = b => !TAMPIL.size ? b.status === "aktif" : TAMPIL.has(b.id);
  const semua = d.dataset.bencana === "semua";   /* beranda semua bencana: judul ringkasan tetap, tiap bencana hidup jadi tautan */
  const ini = semua ? {} : lengkap.find(b => b.id === d.dataset.bencana) || daftar[0];
  if (!ini) return;
  const lokasi = rata(location.pathname);
  const tanpaSegera = "tanpaSegera" in d.dataset;
  /* "Semua bencana" (nama dari peta situs publik) lalu daftar bencana. Halaman turunan (Desa waspada, laporan, simulasi) tidak
     ikut di menu ini (pemilik, 26 Nov 2026: "jangan disini"). Gambar pertama segera dari registri saja, nama menyusul tanpa saling tunggu */
  const menu = hal => {
    const atas = hal.find(h => h.rute === "/semua");
    const butirSemua = `<a href="/semua"${kini("/semua", lokasi)}>${SEMUA}${esc(atas?.nama || "Semua bencana")}</a>`;
    const butir = butirSemua + daftar.map(b => {
      if (buka(b) || b.id === ini.id) return `<a href="${esc(b.rute)}"${kini(b.rute, lokasi)}>${svg(IKON[b.ikon])}${esc(b.nama)}</a>`;
      return tanpaSegera && !TAMPIL.size ? "" : `<a class="segera" aria-disabled="true" tabindex="-1" title="Segera hadir">${svg(IKON[b.ikon])}${esc(b.nama)}<em class="bc-segera">${TAMPIL.size ? "Soon" : "Segera"}</em></a>`;
    }).join("");
    d.querySelector(".menu").innerHTML = butir;
  };
  menu([]);
  peta.then(p => { const hal = (p?.halaman || []).filter(h => h.pintu === "publik" && h.rute === "/semua"); if (hal.length) menu(hal); });
  const sr = d.querySelector("summary .sr")?.outerHTML || "";
  if (!semua) d.querySelector("summary").innerHTML = svg(IKON[ini.ikon]) + sr + esc(ini.nama);
  /* Kemitraan pindah ke kaki situs (PS-05); "Tentang kami" dicabut dari menu (pemilik, 20 Okt 2026) */
  d.classList.toggle("ada-segera", (!tanpaSegera || TAMPIL.size > 0) && daftar.some(b => !buka(b)));
}

document.querySelectorAll("details.bencana").forEach(d => { tombol(d); gambar(d).catch(() => {}); });
/* PS-05c: di <= 640 px isi .stat (ID/EN, jam data, tombol ikon kanan) jadi satu menu "Lainnya" di balik tombol titik tiga, supaya kepala
   tidak meluber. Elemen tidak dipindah (id, pendengar, selektor tur dan pemirsa tetap); CSS di kepala.css menjadikan .stat lembar turun. */
function lebih(h) {
  const st = h?.querySelector(":scope > .stat");
  if (!st || h.querySelector(".kp-lebih")) return;
  st.id ||= "kepalaLain";
  h.insertAdjacentHTML("beforeend", `<button type="button" class="kp-lebih" aria-label="Menu lainnya" title="Menu lainnya" aria-expanded="false" aria-controls="${st.id}">${svg('<circle cx="12" cy="5" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="12" cy="19" r="1.6"/>', ' fill="currentColor"')}</button>`);
  const b = h.lastElementChild;
  const atur = buka => { h.classList.toggle("lebih-buka", buka); b.setAttribute("aria-expanded", String(buka));
    document[buka ? "addEventListener" : "removeEventListener"]("click", luar, true); document[buka ? "addEventListener" : "removeEventListener"]("keydown", esc_); };
  const luar = e => { if (!b.contains(e.target) && (!st.contains(e.target) || e.target.closest("a,button:not(.bhs button)"))) atur(false); };
  const esc_ = e => { if (e.key === "Escape") { atur(false); b.focus(); } };
  b.addEventListener("click", () => atur(!h.classList.contains("lebih-buka")));
}
lebih(document.querySelector("header.top"));
/* deretan tab kepala: tab yang tidak muat masuk menu "Lainnya" (inti/tab_lainnya.js), semua laman bencana */
import("./tab_lainnya.js").then(m => m.pasangLainnya(document.querySelector("nav.tabs"))).catch(() => {});
