"use strict";
/* Perkakas grafik khas gempa (batang tegak/mendatar berpil, sumbu, ukuran). Kartunya sendiri = Kartu.kartu di public/inti/kartu.js;
   ikon bagikan dipasang mesin Bagikan (public/bagikan.js), bukan di sini. */
const KG = {
  TANAH: "#b07a3c", NAVY: "oklch(25.5% .075 256)", MERAH: "#c9503a", BIRU: "#4f8fc4", UNGU: "#5f6fb0",
  BLN: ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"],
  EJA: ["Tidak ada", "Satu", "Dua", "Tiga", "Empat", "Lima", "Enam", "Tujuh", "Delapan", "Sembilan"],
  /* cacah kecil di awal kalimat dieja; selain itu angka berformat. Satuan ikut disorot. */
  awal: (n, satuan) => Kartu.hl((n < 10 ? KG.EJA[n] : fmt(n)) + " " + satuan),
  /* ukuran grafik batang mendatar: layar sempit merapatkan viewBox supaya huruf tetap terbaca */
  uk() { const M = innerWidth < 640; return M ? {M, W: 520, L: 118, rh: 30, fs: 13} : {M, W: 940, L: 190, rh: 30, fs: 13}; },
  pendek: n => n.replace("Kalimantan", "Kal.").replace("Sumatera", "Sum.").replace("Sulawesi", "Sul.").replace("Nusa Tenggara", "NT").replace("Papua", "Pap."),
  tgl: (t, o = {day: "numeric", month: "short"}) => new Date(t).toLocaleDateString("id-ID", {...WIB, ...o}),
  /* sumbu Y tiga garis */
  sumbu: (L, kanan, Y, mx) => [0, .5, 1].map(f => `<line x1="${L}" x2="${kanan}" y1="${Y(mx * f)}" y2="${Y(mx * f)}" stroke="currentColor" opacity=".08"/><text x="${L - 6}" y="${Y(mx * f) + 4}" text-anchor="end" font-size="11" opacity=".6">${rb(mx * f)}</text>`).join(""),
  /* batang tegak yang menggulir: tampilkan ujung kanan (terbaru) dulu */
  gulir: el => el.querySelectorAll(".tw.sk").forEach(w => { w.scrollLeft = w.scrollWidth; }),
  kosong: t => `<p class="kosong">${t}</p>`,
  /* batang tegak (bertumpuk bila seri > 1): cat = label sumbu, seri = [[nama, warna]], nilai[i] = angka tiap seri pada kategori i, tip(i) = isi tooltip,
     ber = kategori terakhir belum penuh (lebih pudar). Puncak diberi pil merah, selain itu angka total tertulis di atas batang (A8).
     Dibungkus .tw.sk: di layar sempit grafik menggulir ke samping, huruf tidak mengecil. */
  kolom({cat, seri, nilai, tip, ber = false, aria = "Grafik"}) {
    const M = innerWidth < 640, n = cat.length, W = M ? Math.max(350, n * 22 + 60) : 940, L = 44, R = 20, T = 36, B = 236, gap = (W - L - R) / n, bw = gap * .72;
    const tot = nilai.map(v => v.reduce((a, b) => a + b, 0)), mx = Math.max(1, ...tot), Y = v => B - v / mx * (B - T), puncak = tot.indexOf(Math.max(...tot)), fs = n > 40 ? 8.5 : n > 24 ? 9.5 : 10.5, langkah = Math.ceil(n / (M ? 9 : 14));
    let g = KG.sumbu(L, W - R, Y, mx);
    g += cat.map((c, i) => { const x = L + i * gap + (gap - bw) / 2, pudar = ber && i === n - 1; let y0 = B, bar = "";
      nilai[i].forEach((v, k) => { if (!v) return; const h = v / mx * (B - T); y0 -= h;
        bar += `<rect x="${x}" y="${y0}" width="${bw}" height="${Math.max(1, h)}" rx="${seri.length > 1 ? 0 : Math.min(4, bw / 3)}" fill="${seri[k][1]}" opacity="${pudar ? .55 : .93}"/>`; });
      const lbl = fmt(tot[i]), pw = lbl.length * 11 * .6 + 16;
      return `<g class="gy" style="--i:${i}" data-tip="${esc(tip(i))}">${bar}<rect x="${x - (gap - bw) / 2}" y="${T}" width="${gap}" height="${B - T}" fill="transparent"/></g>`
        + (i === puncak && tot[i] ? Kartu.pil(x + bw / 2 - pw / 2, Y(tot[i]) - 26, lbl, KG.MERAH, "#fff", 11)[0] : tot[i] ? `<text x="${x + bw / 2}" y="${Y(tot[i]) - 6}" text-anchor="middle" font-size="${fs}" font-weight="700" opacity=".75" pointer-events="none">${lbl}</text>` : "")
        + (i % langkah === 0 || i === n - 1 && n - 1 - (n - 1) % langkah < langkah / 2 ? `<text x="${x + bw / 2}" y="${B + 16}" text-anchor="middle" font-size="10.5" opacity=".7">${c}</text>` : ""); }).join("");
    return `<div class="tw sk"><svg viewBox="0 0 ${W} ${B + 24}" style="min-width:${M ? W : 0}px" role="img" aria-label="${aria}">${g}</svg></div>`; },
  /* batang mendatar berlabel: rows = [{nama, v, warna, tip, pil: [[teks, warna, fg?]]}], v[] bila bertumpuk (warna per bagian di rows[i].w) */
  mendatar(rows, {akhir = 70} = {}) {
    const U = KG.uk(), {W, L, rh} = U, mx = Math.max(1, ...rows.map(r => [].concat(r.v).reduce((a, b) => a + b, 0))), X = v => v / mx * (W - L - akhir - (U.M ? 40 : 90));
    const g = rows.map((r, i) => { const vs = [].concat(r.v), ws = [].concat(r.warna), tot = vs.reduce((a, b) => a + b, 0), y = i * rh; let x = L, bar = "";
      vs.forEach((v, k) => { if (v) { bar += `<rect class="gx" style="--i:${i}" x="${x}" y="${y + 6}" width="${Math.max(1.5, X(v))}" height="${rh - 12}" rx="${vs.length > 1 ? 0 : 3}" fill="${ws[k]}" data-tip="${esc(r.tip)}"/>`; x += X(v); } });
      let px = x + 8, pils = "";
      for (const [t, w, fg] of [[r.teks ?? fmt(tot), ws[ws.length - 1]], ...(r.pil || [])]) { const [m, pw] = Kartu.pil(px, y + 4, t, w, fg || "#fff"); pils += m; px += pw + 5; }
      return `<g${r.attr || ""}><text x="${L - 10}" y="${y + 19}" text-anchor="end" font-size="${U.fs}" font-weight="600">${r.nama}</text>${bar}<g class="gf" style="--i:${i}">${pils}</g></g>`; }).join("");
    return `<svg viewBox="0 0 ${W} ${rows.length * rh + 4}" role="img" aria-label="Grafik batang">${g}</svg>`; },
};
