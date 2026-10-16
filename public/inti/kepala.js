/* Menu pilihan bencana di kepala, digambar dari /bencana.json (registry).
   Pasang: <details class="bencana" data-bencana="<id halaman>" [data-tentang] [data-tanpa-segera]> dengan markup cadangan statis di dalamnya.
   Bila registry gagal dimuat, markup cadangan dibiarkan apa adanya. Bencana tanpa ikon di IKON tidak ditampilkan. */
export const IKON = {
  karhutla: '<path fill="#f08a3c" d="M12 2.5c1.8 4 6.5 6.4 6.5 11.5a6.5 6.5 0 0 1-13 0c0-2.5 1.2-4.3 2.8-5.8.3 2.1 1.4 3.3 2.7 3.8C10.6 9 11.1 5.8 12 2.5Z"/><path fill="#ffd36b" d="M12 20.5a3.5 3.5 0 0 1-3.5-3.5c0-2 1.7-3.1 3.5-5.8 1.8 2.7 3.5 3.8 3.5 5.8a3.5 3.5 0 0 1-3.5 3.5Z"/>',
  banjir: '<path fill="#4f9be0" d="M12 2.5s-6 6.7-6 11a6 6 0 0 0 12 0c0-4.3-6-11-6-11Z"/><path fill="none" stroke="#fff" stroke-width="1.6" stroke-linecap="round" d="M9 14.5a3 3 0 0 0 3 3"/>',
  gempa: '<path fill="#8a6d4e" d="M2 13h4l2-5 3 10 3-12 2 7h6v2h-7l-1-3-3 11-3-10-1 3H2z"/>',
  cuaca: '<path fill="#7d8ca3" d="M7 18a5 5 0 1 1 1.2-9.9A6 6 0 0 1 19.5 10 4 4 0 0 1 18 18z"/><path fill="#e3b94e" d="m12 13-2 5h2.5l-1 4 4-6h-2.5l1.5-3z"/>',
  udara: '<path fill="none" stroke="#4a9d9c" stroke-width="2" stroke-linecap="round" d="M3 8h11a3 3 0 1 0-3-3M3 12h16a3 3 0 1 1-3 3M3 16h8"/>',
  kekeringan: '<circle cx="12" cy="12" r="4.5" fill="#d9a441"/><path fill="none" stroke="#d9a441" stroke-width="1.8" stroke-linecap="round" d="M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M5.3 18.7l1.8-1.8M16.9 7.1l1.8-1.8"/>',
  gunungapi: '<path fill="#b5523b" d="M3 21 9 10h6l6 11z"/><path fill="#e58a45" d="M10 10l1-3h2l1 3z"/><path fill="none" stroke="#9aa3ad" stroke-width="1.6" stroke-linecap="round" d="M12 6c-1-1.5 0-3 1.5-3.5M14 5c1-1 2.5-1 3.5 0"/>',
};
const svg = (isi, atr = "") => `<svg class="bc-ik" viewBox="0 0 24 24" aria-hidden="true"${atr}>${isi}</svg>`;
const TENTANG = svg('<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>', ' fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"');
const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const rata = p => p.replace(/\.html$/, "").replace(/(.)\/$/, "$1");

async function gambar(d) {
  const r = await fetch("/bencana.json");
  if (!r.ok) throw new Error(r.status);
  const daftar = (await r.json()).bencana.filter(b => IKON[b.ikon]);
  const semua = d.dataset.bencana === "semua";   /* beranda semua bencana: judul ringkasan tetap, tiap bencana hidup jadi tautan */
  const ini = semua ? {} : daftar.find(b => b.id === d.dataset.bencana) || daftar[0];
  if (!ini) return;
  const lokasi = rata(location.pathname);
  const tanpaSegera = "tanpaSegera" in d.dataset;
  const butir = daftar.map(b => {
    if (b.status === "aktif" || b.id === ini.id || (semua && b.status !== "mati")) return `<a href="${esc(b.rute)}"${rata(b.rute) === lokasi ? ' aria-current="page"' : ""}>${svg(IKON[b.ikon])}${esc(b.nama)}</a>`;
    return tanpaSegera ? "" : `<a class="segera" aria-disabled="true" tabindex="-1" title="Segera hadir">${svg(IKON[b.ikon])}${esc(b.nama)}<em class="bc-segera">Segera</em></a>`;
  }).join("");
  const tentang = "tentang" in d.dataset
    ? `<hr><a href="/tentang"${lokasi === "/tentang" ? ' aria-current="page"' : ""}>${TENTANG}Tentang kami</a>` : "";
  const sr = d.querySelector("summary .sr")?.outerHTML || "";
  if (!semua) d.querySelector("summary").innerHTML = svg(IKON[ini.ikon]) + sr + esc(ini.nama);
  d.querySelector(".menu").innerHTML = butir + tentang;
  d.classList.toggle("ada-segera", !tanpaSegera && daftar.some(b => b.status !== "aktif"));
}

document.querySelectorAll("details.bencana").forEach(d => gambar(d).catch(() => {}));
