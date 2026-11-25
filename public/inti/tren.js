/* Grafik tren jangka panjang (F-27, PB-53): deret bulanan + garis regresi dan pita selang 95 persen dari pipeline
   (scripts/umum/selang.py tren_linear lewat iklim_outlook.py dan outlook12.py). Peramban TIDAK menghitung statistik:
   pita dan lereng dibaca apa adanya; garis di tooltip = potong + lereng x bulan (persamaan garis yang sama).
   Deret < 60 bulan (regresi.cukup false): tanpa garis dan tanpa pita, tertulis "deret terlalu pendek".
   Tooltip lewat [data-tip] + pasangTip (inti/tip.js): satu pendengar delegasi per halaman, tanpa kerja berat saat hover.
   Bentuk deret: {nama, satuan, mulai "YYYY-MM", nilai [angka|null], regresi {...}, pengamat_berubah?}. */
const BLN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c]));
const ang = (v, d = 0) => Number(v).toLocaleString("id-ID", {minimumFractionDigits: d, maximumFractionDigits: d}).replace("-", "−");
const tanda = (v, d) => (v > 0 ? "+" : "") + ang(v, d);
const desimal = v => Math.abs(v) >= 100 ? 0 : Math.abs(v) >= 10 ? 1 : 2;
const bulanKe = (mulai, i) => { const [y, m] = mulai.split("-").map(Number), k = y * 12 + m - 1 + i; return [Math.floor(k / 12), k % 12]; };

export function cukup(s) { return !!s?.regresi?.cukup && Array.isArray(s.regresi.pita) && s.regresi.pita.length > 1; }

/* satu baris keterangan di bawah grafik: lereng per 10 tahun + selang, atau alasan tanpa garis */
export function ringkasTren(s) {
  const r = s?.regresi, n = s?.nilai?.length || 0, [y0] = bulanKe(s.mulai, 0), [y1] = bulanKe(s.mulai, Math.max(0, n - 1));
  if (!cukup(s)) return r?.alasan === "deret terlalu pendek"
    ? `Deret terlalu pendek untuk garis tren: ${ang(r.n)} dari ${ang(r.minimum)} bulan yang dibutuhkan.`
    : `Garis tren tidak ditampilkan: ${esc(r?.alasan || "regresi belum tersedia")}.`;
  const [lo, hi] = r.selang_dekade, d = desimal(Math.max(Math.abs(lo), Math.abs(hi)));
  const arah = r.arah === "tidak jelas" ? " Selang memuat nol, jadi arahnya belum jelas." : "";
  return `Lereng ${tanda(r.lereng_dekade, d)} ${esc(s.satuan)} per 10 tahun, selang ${ang((r.tingkat_selang || .95) * 100)}% ${tanda(lo, d)} sampai ${tanda(hi, d)}, dari ${ang(r.n)} bulan ${y0} sampai ${y1}.${arah} Garis menggambarkan masa lalu, bukan prakiraan.`;
}

export function svgTren(s, W = 940) {
  const v = s?.nilai || [], n = v.length; if (!n) return "";
  const ok = cukup(s), P = ok ? s.regresi.pita : [], M = W < 640;
  const H = M ? 210 : 260, L = M ? 44 : 56, R = 10, T = s.pengamat_berubah ? 26 : 12, B = 24;
  const ada = v.filter(x => x != null), semua = ada.concat(P.flatMap(p => [p[2], p[3]]));
  let lo = Math.min(...semua), hi = Math.max(...semua); if (hi === lo) { hi += 1; lo -= 1; }
  const X = i => L + (n > 1 ? i / (n - 1) : .5) * (W - L - R), Y = y => T + (hi - y) / (hi - lo) * (H - T - B);
  /* sumbu: garis bantu pada angka bulat (langkah 1, 2, 5 x 10^k, sekitar 4 garis), tahun tiap 5 atau 10 tahun */
  const kasar = (hi - lo) / 4, p10 = 10 ** Math.floor(Math.log10(kasar)), lk = p10 * ([1, 2, 5, 10].find(f => f * p10 >= kasar));
  let grid = ""; for (let y = Math.ceil(lo / lk) * lk; y <= hi + 1e-9; y += lk)
    grid += `<line class="tr-grid" x1="${L}" x2="${W - R}" y1="${Y(y)}" y2="${Y(y)}"/><text class="tr-sb" x="${L - 6}" y="${Y(y) + 4}" text-anchor="end">${ang(Math.abs(y) < lk / 1e6 ? 0 : y, lk < 1 ? 1 : 0)}</text>`;
  const thn = Math.ceil(n / 12), lompat = thn > 30 ? 10 : thn > 8 ? 5 : 1;
  let sx = ""; for (let i = 0; i < n; i++) { const [y, m] = bulanKe(s.mulai, i); if (m === 0 && y % lompat === 0) sx += `<text class="tr-sb" x="${X(i)}" y="${H - 6}" text-anchor="middle">${y}</text>`; }
  /* deret: bulan kosong memutus garis, tidak diisi */
  let d = "", naik = false; v.forEach((x, i) => { if (x == null) { naik = false; return; } d += `${naik ? "L" : "M"}${X(i).toFixed(1)},${Y(x).toFixed(1)}`; naik = true; });
  const pita = ok ? `<path class="tr-pita" d="M${P.map(p => `${X(p[0]).toFixed(1)},${Y(p[3]).toFixed(1)}`).join("L")}L${P.slice().reverse().map(p => `${X(p[0]).toFixed(1)},${Y(p[2]).toFixed(1)}`).join("L")}Z"/>` : "";
  const garis = ok ? `<path class="tr-garis" d="M${X(P[0][0]).toFixed(1)},${Y(P[0][1]).toFixed(1)}L${X(P.at(-1)[0]).toFixed(1)},${Y(P.at(-1)[1]).toFixed(1)}"/>` : "";
  const cat = s.pengamat_berubah ? `<text class="tr-cat" x="${L}" y="14">${esc(s.pengamat_berubah)}</text>` : "";
  /* kolom hover per bulan: data-tip dibaca tip.js */
  const r = s.regresi || {}, lb = (W - L - R) / Math.max(1, n - 1), dd = desimal(hi - lo);
  const kolom = v.map((x, i) => { const [y, m] = bulanKe(s.mulai, i);
    let t = `<b>${BLN[m]} ${y}</b><br>${esc(s.nama)}: ${x == null ? "tidak ada data" : ang(x, dd) + " " + esc(s.satuan)}`;
    if (ok) t += `<br>Garis tren: ${ang(r.potong + r.lereng_bulan * i, dd)} ${esc(s.satuan)}`;
    return `<rect class="tr-hit" x="${(X(i) - lb / 2).toFixed(1)}" y="${T}" width="${lb.toFixed(2)}" height="${H - T - B}" data-tip="${esc(t)}"/>`; }).join("");
  return `<svg class="tr-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(s.nama)} per bulan${ok ? " dengan garis tren dan selang 95 persen" : ""}">${grid}${sx}${pita}<path class="tr-deret" d="${d}"/>${garis}${cat}${kolom}</svg>`;
}
