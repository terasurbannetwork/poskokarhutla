/* Papan peta sistem (/design-system/sistem): galeri papan kecil per grup, lalu tiap papan dalam ukuran penuh.
   Isi dari /design-system-peta.json; papan kecil adalah papan yang sama, dikecilkan dengan zoom. */
const akar = document.documentElement;
const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
try { const t = JSON.parse(localStorage.getItem("pk-tema")); if (t) akar.dataset.theme = t; } catch (e) {}
const gelap = () => (akar.dataset.theme || (matchMedia("(prefers-color-scheme:dark)").matches ? "dark" : "light")) === "dark";

const JENIS = {sumber: "Sumber data", proses: "Proses", simpan: "Simpanan", layar: "Layar atau keluaran", orang: "Orang", inti: "Inti papan"};
const PANAH = '<div class="pt-panah" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12h15M13 6l6 6-6 6"/></svg></div>';
const LEGENDA = '<div class="pt-leg">' + Object.entries(JENIS).map(([j, n]) => `<span class="j-${j}"><i></i>${n}</span>`).join("") + "</div>";

const simpul = s => `<div class="pt-simpul j-${esc(s.j)}${s.j === "inti" ? " inti" : ""}"><b>${esc(s.t)}</b>${s.d ? `<span>${esc(s.d)}</span>` : ""}${s.k ? `<code>${esc(s.k)}</code>` : ""}</div>`;
const papan = (p, id) => `<article class="pt-papan"${id ? ` id="${id}"` : ""}><header><h3><i>${p.no}</i>${esc(p.judul)}</h3><p>${esc(p.ket)}</p>${LEGENDA}</header>` +
  '<div class="pt-alur">' + p.kolom.map(k => `<div class="pt-kol"><span class="lbl">${esc(k.nama)}</span>${k.simpul.map(simpul).join("")}</div>`).join(PANAH) + "</div>" +
  (p.catatan?.length ? `<ul class="pt-cat">${p.catatan.map(c => `<li>${esc(c)}</li>`).join("")}</ul>` : "") + "</article>";

async function mulai() {
  const d = await (await fetch("/design-system-peta.json")).json();
  let n = 0;
  for (const g of d.grup) for (const p of g.papan) p.no = String(++n).padStart(2, "0");
  document.getElementById("pt-jumlah").textContent = n;
  document.getElementById("pt-isi").innerHTML =
    d.grup.map(g => `<h2>${esc(g.nama)}</h2><div class="pt-galeri">` + g.papan.map(p =>
      `<a class="pt-kecil" href="#papan-${p.no}"><b><i>${p.no}</i>${esc(p.judul)}</b><div aria-hidden="true">${papan(p)}</div></a>`).join("") + "</div>").join("") +
    d.grup.map(g => `<h2>${esc(g.nama)}</h2>` + g.papan.map(p => papan(p, "papan-" + p.no)).join("")).join("");
  if (location.hash.length > 1) document.getElementById(location.hash.slice(1))?.scrollIntoView({behavior: "instant"});
  document.getElementById("ds-tema").addEventListener("click", () => {
    akar.dataset.theme = gelap() ? "light" : "dark";
    try { localStorage.setItem("pk-tema", JSON.stringify(akar.dataset.theme)); } catch (e) {}
  });
}
mulai();
