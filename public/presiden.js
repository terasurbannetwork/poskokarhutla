"use strict";
/* /presiden: satu fetch ke /data/presiden/semua.json, kartu Insight dari skema widget (docs/presiden/KONTRAK.md).
   ?w=<id> = satu widget tanpa kepala untuk iframe; tinggi dilaporkan ke induk lewat postMessage. */
const ID = new URLSearchParams(location.search).get("w");
const WARNA = ["var(--f3)", "var(--f2)", "var(--brand2)", "var(--info)"];
const tgl = iso => { const d = new Date(iso); if (/T23:59/.test(iso)) return isNaN(d) ? "" : d.toLocaleDateString("id-ID", {timeZone: "Asia/Jakarta", day: "numeric", month: "short", year: "numeric"}); return isNaN(d) ? "" : d.toLocaleString("id-ID", {timeZone: "Asia/Jakarta", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit"}).replace(",", "").replace(/(\d\d):(\d\d)$/, "$1.$2") + " WIB"; };
const lab = v => fmt(v);
const pl = (t, w = "var(--brand2)") => `<span class="pl" style="--w:${w}">${esc(t)}</span>`;
const sorot = s => esc(s).replace(/\[\[(.+?)\]\]/g, (_, x) => Kartu.hl(x));
const kunci = a => {
  const u = a.ubah == null ? "" : `, ${a.ubah > 0 ? "naik" : a.ubah < 0 ? "turun" : "tetap"}${a.ubah ? " " + fmt(Math.abs(a.ubah)) + "%" : ""}`;
  return pl(`${a.label} ${fmt(a.nilai)}${a.satuan ? (a.satuan.startsWith("%") ? "" : " ") + a.satuan : ""}${u}`, a.ubah > 0 ? "var(--bad)" : a.ubah < 0 ? "var(--ok)" : "var(--brand2)");
};

/* grafik batang (tegak bila label pendek dan sedikit, selain itu mendatar) dan garis; angka di ujung batang, total di atasnya */
function grafik(g, W) {
  const n = g.label.length, S = g.seri, tot = g.label.map((_, i) => S.reduce((a, s) => a + (s.nilai[i] || 0), 0));
  const m = Math.max(1, ...(g.jenis === "garis" ? S.flatMap(s => s.nilai.map(v => v || 0)) : tot)), t = (x, y, s, a = "middle", ekstra = "") => `<text x="${x}" y="${y}" text-anchor="${a}" font-size="11" ${ekstra}>${esc(s)}</text>`;
  const gris = (c, i, y, h, x, w) => `<rect x="${x}" y="${y}" width="${w}" height="${Math.max(0, h)}" rx="3" style="fill:${c}"/>`;
  let h, isi = "";
  if (g.jenis === "garis") {
    h = 170; const P = 22, B = 26, X = i => 14 + (n < 2 ? (W - 28) / 2 : i / (n - 1) * (W - 28)), Y = v => h - B - (v || 0) / m * (h - B - P), skip = Math.ceil(n / Math.max(2, Math.min(6, Math.floor(W / 70))));
    S.forEach((s, k) => { const c = WARNA[k % 4], pts = s.nilai.map((v, i) => `${X(i)},${Y(v)}`).join(" "), mx = Math.max(...s.nilai.map(v => v || 0));
      isi += `<polyline points="${pts}" fill="none" stroke-width="2.2" stroke-linejoin="round" style="stroke:${c}"/>` + s.nilai.map((v, i) => `<circle cx="${X(i)}" cy="${Y(v)}" r="3" style="fill:${c}"/>` + (n <= 8 || i === n - 1 || v === mx ? t(Math.min(W - 14, Math.max(14, X(i))), Y(v) - 8, lab(v), "middle", 'font-weight="700"') : "")).join(""); });
    isi += g.label.map((l, i) => (i % skip === 0 && n - 1 - i >= skip) || i === n - 1 ? t(X(i), h - 8, l, i === 0 ? "start" : i === n - 1 ? "end" : "middle", 'style="fill:var(--ink2)"') : "").join("");
  } else if (n <= 12 && Math.max(...g.label.map(l => String(l).length)) <= 7) {
    h = 190; const P = 22, B = 26, bw = W / n, w = Math.min(52, bw * .62);
    g.label.forEach((l, i) => { let y = h - B; const x = i * bw + (bw - w) / 2;
      S.forEach((s, k) => { const v = s.nilai[i] || 0, hh = v / m * (h - B - P); y -= hh; isi += gris(WARNA[k % 4], k, y, hh, x, w) + (S.length > 1 && hh >= 15 ? t(x + w / 2, y + hh / 2 + 4, lab(v), "middle", 'font-weight="700" style="fill:#fff"') : ""); });
      isi += t(x + w / 2, y - 6, lab(tot[i]), "middle", 'font-weight="700"') + t(x + w / 2, h - 8, l, "middle", 'style="fill:var(--ink2)"'); });
  } else {
    const rh = 26, L = Math.min(150, W * .38), R = 54; h = n * rh;
    g.label.forEach((l, i) => { let x = L; const y = i * rh, mx = Math.floor(L / 6.4);
      isi += t(L - 8, y + 17, String(l).length > mx ? String(l).slice(0, mx - 1) + "…" : l, "end", 'font-weight="600"');
      S.forEach((s, k) => { const ww = (s.nilai[i] || 0) / m * (W - L - R); isi += gris(WARNA[k % 4], k, y + 5, rh - 10, x, ww); x += ww; });
      isi += t(x + 6, y + 17, lab(tot[i]), "start", 'font-weight="700"'); });
  }
  return `<svg viewBox="0 0 ${W} ${h}" width="${W}" height="${h}" role="img" aria-label="${esc(g.satuan || "")}">${isi}</svg>`;
}

const sel = (k, v) => v == null ? "–" : k.jenis === "angka" ? fmt(v) : k.jenis === "persen" ? fmt(v) + "%" : k.jenis === "pill" ? pl(v) : esc(v);
function tabel(w) {
  const K = w.kolom, num = k => k.jenis === "angka" || k.jenis === "persen";
  return `<div class="tw"><table><thead><tr>${K.map(k => `<th${num(k) ? ' class="n"' : ""}>${esc(k.label)}</th>`).join("")}</tr></thead><tbody>${w.baris.map(b =>
    `<tr>${K.map(k => `<td class="${num(k) ? "n" : "t"}"${k.jenis === "teks" && b[k.k] != null ? ` title="${esc(b[k.k])}"` : ""}>${sel(k, b[k.k])}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
}

function kartu(w) {
  const kosong = w.status === "kosong", umur = w.status === "basi" && w.per ? Date.now() - new Date(w.per) : 0;
  const tl = w.tindak_lanjut?.length ? `<div class="pr-tl"><span class="lbl">Tindak lanjut</span>${w.tindak_lanjut.map(x => `<div>${pl(x.siapa, "var(--brand2)")}<span>${esc(x.apa)}</span></div>`).join("")}</div>` : "";
  const g = !kosong && w.grafik?.label?.length ? w.grafik : null;
  if (g && g.seri.length > 1) Kartu.leg(g.seri.map((s, i) => [WARNA[i % 4], esc(s.nama)]));
  const isi = (kosong ? `<div class="pr-kosong">Belum ada data</div>` : "") + (g ? `<div class="pr-gr"><div class="pr-sat">${esc(g.satuan || "")}</div><div data-g="${esc(w.id)}"></div></div>` : "")
    + (!kosong && w.baris?.length ? tabel(w) : "") + tl + (w.catatan ? `<p class="pr-cat">${esc(w.catatan)}</p>` : "");
  const angka = !kosong && w.angka?.length ? `<div class="pr-angka">${w.angka.map(kunci).join("")}</div>` : "";
  return Kartu.ex(sorot(w.judul) + "", "", "", isi, "Sumber: " + esc(w.sumber || "–"))
    .replace('<span class="ex-ey"></span>', () => `<div class="pr-ey"><span class="ex-ey">${esc(w.label)}</span>${umur ? pl("Data berumur " + fmt.durasi(umur), "var(--warn)") : ""}</div>`)
    .replace("</header>", () => angka + "</header>")
    .replace("</footer>", () => w.per ? `<span class="per">Per ${tgl(w.per)}</span></footer>` : "</footer>")
    .replace("<article", () => `<article data-w="${esc(w.id)}"`);
}

let W = [];
function grafikSemua() {
  document.querySelectorAll("[data-g]").forEach(e => { const w = W.find(x => x.id === e.dataset.g), lebar = Math.floor(e.clientWidth); if (w && lebar > 0) e.innerHTML = grafik(w.grafik, lebar); });
}
function tampil(j) {
  W = Array.isArray(j) ? j : j.widget || j.widgets || Object.values(j).filter(x => x && x.id);
  const pilih = ID ? W.filter(w => w.id === ID) : W;
  $("#insight").innerHTML = pilih.length ? pilih.map(kartu).join("") : `<div class="kosong">${ID ? "Widget tidak ditemukan." : "Belum ada data."}</div>`;
  const dibuat = j.dibuat || j.per || W.map(w => w.per).filter(Boolean).sort().pop();
  $("#upd").textContent = dibuat ? "Diperbarui " + tgl(dibuat) : "";
  grafikSemua();
}
let lastW = 0;
async function muat() {
  try { const r = await fetch("/data/presiden/semua.json"); if (!r.ok) throw 0; tampil(await r.json()); }
  catch (e) { if (!W.length) $("#insight").innerHTML = `<div class="kosong">Data belum bisa dimuat.</div>`; }
}
muat();
setInterval(() => { if (!document.hidden) muat(); }, 10 * 60 * 1000);
/* grafik digambar ulang hanya saat lebar berubah; tinggi dilaporkan ke iframe induk */
new ResizeObserver(() => {
  if (innerWidth !== lastW) { lastW = innerWidth; requestAnimationFrame(grafikSemua); }
  if (top !== window) parent.postMessage({presiden: "tinggi", w: ID, tinggi: document.documentElement.scrollHeight}, "*");
}).observe(document.body);
