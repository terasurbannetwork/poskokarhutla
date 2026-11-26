/* Tab Rekomendasi (staf; PH-13, potensi-hidromet K1, D11, D18, D21): butir per pihak dari /api/potensi/rekomendasi, apa adanya dari katalog bersumber.
   Bukan instruksi resmi. Pihak tanpa butir bersumber tertulis kosong, tidak diisi karangan. ctx: lihat app.js. */
import { esc, NAMA, IKON, ikon, ambil, pakaiGaya, bahan } from "/potensi/analisis.js";

const STATUS = ["Normal", "Waspada", "Siaga", "Awas"];
const FASE = { respon: "Respons", siaga: "Kesiapsiagaan", mitigasi: "Mitigasi" };
const PIHAK = [["pusat", "Pemerintah Pusat"], ["prov", "Pemerintah Provinsi"], ["kab", "Pemerintah Kab/Kota"], ["masy", "Masyarakat"]];
const KODE = Object.keys(IKON).filter((k) => NAMA[k]);

export function butir(x) {
  return `<li>${esc(x.teks)}<small class="rk-rj">${esc(x.rujukan || "")}${x.generik ? ' <span class="bc-st">generik, bukan instruksi resmi</span>' : ""}</small></li>`;
}

export function kartuPihak(judul, daftar) {
  const isi = daftar?.length ? `<ul class="bc-ul">${daftar.map(butir).join("")}</ul>` : '<p class="bc-kosong">Belum ada butir bersumber</p>';
  return `<section class="ex ex-std"><header class="ex-hd"><h3>${esc(judul)}</h3></header><div class="ex-bd" style="padding:14px 22px">${isi}</div></section>`;
}

export function pasang(ctx) {
  pakaiGaya();
  if (!document.getElementById("rk-gaya")) document.head.insertAdjacentHTML("beforeend", '<style id="rk-gaya">.rk-rj{display:block;margin-top:2px;font:400 var(--fs-2)/1.4 var(--font);color:var(--ink2)}.rk-pil{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 14px}.rk-pil button{display:inline-flex;align-items:center;gap:6px;min-height:36px;padding:0 12px;border:1px solid var(--line);border-radius:var(--r-pill);background:var(--card);color:var(--ink);font:600 var(--fs-3)/1 var(--font);cursor:pointer}.rk-pil button[aria-pressed="true"]{border-color:var(--accent);background:color-mix(in srgb,var(--accent) 14%,var(--card))}.rk-pil button:focus-visible{outline:2px solid var(--accent);outline-offset:2px}.rk-fase{margin:0 0 14px}</style>');
  const { panel, state } = ctx;
  const p = { b: KODE.includes(String(state.b).toUpperCase()) ? String(state.b).toUpperCase() : "BNJ", s: 2 };
  panel.innerHTML = '<h2 class="po-sek">Rekomendasi</h2><div class="rk-pil" id="rk-b" role="group" aria-label="Bahaya"></div><div class="rk-pil" id="rk-s" role="group" aria-label="Status"></div><p class="bc-cat" id="rk-f"></p><div class="bc-kolom" id="rk-isi"></div>';
  const $ = (i) => panel.querySelector("#" + i);
  let nomor = 0;
  const gambarPil = () => {
    $("rk-b").innerHTML = KODE.map((k) => `<button type="button" data-b="${k}" aria-pressed="${k === p.b}">${ikon(k)}<span>${esc(NAMA[k])}</span></button>`).join("");
    $("rk-s").innerHTML = STATUS.map((n, i) => `<button type="button" data-s="${i}" aria-pressed="${i === p.s}">${n}</button>`).join("");
  };
  async function muat() {
    const n = ++nomor;
    gambarPil();
    $("rk-isi").innerHTML = '<p class="bc-info" role="status">Memuat rekomendasi</p>';
    const d = await ambil(`/api/potensi/rekomendasi?bahaya=${p.b}&status=${p.s}`);
    if (n !== nomor) return;
    if (!d?.pihak) { $("rk-f").innerHTML = ""; $("rk-isi").innerHTML = '<p class="bc-info" role="status">Belum terukur. Rekomendasi tidak bisa dimuat.</p>'; return; }
    $("rk-f").innerHTML = `Fase <span class="bc-st">${esc(FASE[d.fase] || d.fase)}</span> untuk ${esc(NAMA[p.b].toLowerCase())} berstatus ${STATUS[p.s].toLowerCase()}. Butir bersumber peraturan, bukan instruksi resmi.`;
    $("rk-isi").innerHTML = PIHAK.map(([k, j]) => kartuPihak(j, d.pihak[k])).join("");
  }
  panel.addEventListener("click", (e) => {
    const t = e.target.closest("button"); if (!t) return;
    if (t.dataset.b) p.b = t.dataset.b; else if (t.dataset.s) p.s = +t.dataset.s; else return;
    gambarPil(); // chrome langsung, muat ditunda
    requestAnimationFrame(muat);
  });
  gambarPil();
  muat();
  // status awal dari kab terpilih bila ada; tanpa itu tetap Siaga
  if (state.kab && state.b) bahan().then(({ st }) => {
    const DP = globalThis.DampakPeringatan, k = String(state.b).toUpperCase();
    const s = DP && st ? DP.statusHari(DP.entriStatus(st, state.kab, k), "ringkas") : null;
    if (Number.isInteger(s) && s >= 0 && s <= 3 && s !== p.s && k === p.b) { p.s = s; muat(); }
  }).catch(() => {});
}
