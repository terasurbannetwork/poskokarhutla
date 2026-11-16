// Render gambar naskah jadi PNG (3x) dengan Chromium (playwright), palet navy/oranye.
//   node gambar.mjs            -> semua mesin/gambar/*.json  ->  mesin/gbr/<nama>.png
//   node gambar.mjs nama ...   -> hanya yang disebut
// *.pohon.json = pohon keputusan (diagram alir); *.json lain = grafik (batang, batang-mendatar, tumpuk, garis).
// Skema: lihat mesin/README.md bagian "Gambar".
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const DI = path.dirname(fileURLToPath(import.meta.url));
const SUMBER = path.join(DI, 'gambar');
const KELUAR = path.join(DI, 'gbr');
const GEN = path.resolve(DI, '../../../laporan-bnpb/generator') + '/';
const { luncur } = await import(pathToFileURL(GEN + 'pw.mjs').href);
const HOME = process.env.USERPROFILE.replace(/\\/g, '/');
const FONT = HOME + '/.claude/skills/ppt-konsultan/bnpb/assets/fonts/';
fs.mkdirSync(KELUAR, { recursive: true });

const pilih = process.argv.slice(2);
const berkas = fs.readdirSync(SUMBER).filter(f => f.endsWith('.json')).filter(f => !pilih.length || pilih.some(p => f.startsWith(p)));
if (!berkas.length) { console.log('gambar: tidak ada spesifikasi'); process.exit(0); }

const HTML = `<!doctype html><meta charset="utf-8"><style>
@font-face{font-family:Roboto;src:url(file:///${FONT}Roboto-Regular.ttf);font-weight:400}
@font-face{font-family:Roboto;src:url(file:///${FONT}Roboto-Medium.ttf);font-weight:500}
@font-face{font-family:Roboto;src:url(file:///${FONT}Roboto-Bold.ttf);font-weight:700}
body{margin:0;background:#fff;font-family:Roboto}</style><body><div id="w"></div></body>`;

// Dijalankan di dalam halaman.
function gambarkan(jenisBerkas, spec) {
  const NAVY = '#051C2C', ORANYE = '#D9600B', BIRU = '#2F86D1', TEKS2 = '#2E3440', TEKS3 = '#6B7280', GARIS = '#BFC5CC', TINT = '#F1F3F6';
  const PAL = { navy: NAVY, oranye: ORANYE, biru: BIRU, emas: '#A07A32', slate: '#5B7A99', merah: '#C8102E', abu: '#9AA5B1' };
  const SERI = [NAVY, ORANYE, BIRU, '#A07A32', '#5B7A99', '#C8102E'];
  const warna = (w, i) => (w && (PAL[w] || w)) || SERI[i % SERI.length];
  const cv = document.createElement('canvas').getContext('2d');
  const ukur = (t, px, bold) => { cv.font = `${bold ? 700 : 400} ${px}px Roboto`; return cv.measureText(t).width; };
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const fmt = v => (Math.round(v * 100) / 100).toLocaleString('id-ID', { maximumFractionDigits: 2 });
  const bungkus = (t, lebar, px, bold) => {
    const kata = String(t).split(/\s+/); const baris = []; let cur = '';
    for (const k of kata) {
      const coba = cur ? cur + ' ' + k : k;
      if (ukur(coba, px, bold) <= lebar || !cur) cur = coba; else { baris.push(cur); cur = k; }
    }
    if (cur) baris.push(cur);
    return baris;
  };
  const teks = (x, y, baris, px, o = {}) => {
    const lh = o.lh || px * 1.3;
    const y0 = y - ((baris.length - 1) * lh) / 2;
    return `<text x="${x}" y="${y0}" font-size="${px}" fill="${o.fill || TEKS2}" text-anchor="${o.anchor || 'middle'}" font-weight="${o.bold ? 700 : 400}" dominant-baseline="central">` +
      baris.map((b, i) => `<tspan x="${x}" dy="${i ? lh : 0}">${esc(b)}</tspan>`).join('') + '</text>';
  };

  // ---------------- pohon keputusan ----------------
  if (jenisBerkas === 'pohon') {
    const WQ = spec.lebar_tanya || 215, WU = spec.lebar_ujung || 172, JARAK = 34, VGAP = 56, PADX = 14, PX = 11.5;
    const N = {};
    for (const s of spec.simpul) N[s.id] = { id: s.id, tipe: 'q', teks: s.tanya, ya: s.ya, tidak: s.tidak };
    let wi = 0;
    const ujungWarna = [ORANYE, NAVY, BIRU, '#A07A32', '#5B7A99', '#C8102E'];
    for (const [id, v] of Object.entries(spec.ujung || {})) {
      const o = typeof v === 'string' ? { teks: v } : v;
      N[id] = { id, tipe: 'u', teks: o.teks, warna: o.warna ? (PAL[o.warna] || o.warna) : ujungWarna[wi++ % ujungWarna.length] };
    }
    const akar = spec.akar || spec.simpul[0].id;
    for (const n of Object.values(N)) {
      const w = n.tipe === 'q' ? WQ : WU;
      n.w = w; n.baris = bungkus(n.teks, w - 2 * PADX - (n.tipe === 'q' ? 6 : 0), PX, n.tipe === 'u');
      n.h = n.baris.length * PX * 1.35 + 20; n.kid = [];
    }
    for (const n of Object.values(N)) if (n.tipe === 'q') {
      if (n.ya) n.kid.push({ ke: n.ya, label: 'Ya' });
      if (n.tidak) n.kid.push({ ke: n.tidak, label: 'Tidak' });
    }
    // kedalaman = jalur terpanjang dari akar
    const dalam = { [akar]: 0 };
    const telusur = (id, d, jejak) => {
      if (jejak.has(id)) return;
      jejak.add(id);
      for (const k of N[id].kid) { if (!N[k.ke]) continue; if ((dalam[k.ke] ?? -1) < d + 1) { dalam[k.ke] = d + 1; telusur(k.ke, d + 1, jejak); } }
      jejak.delete(id);
    };
    telusur(akar, 0, new Set());
    const ids = Object.keys(dalam);
    const maxD = Math.max(...Object.values(dalam));
    const lap = Array.from({ length: maxD + 1 }, () => []);
    const urut = []; const lihat = new Set();
    const dfs = id => { if (lihat.has(id)) return; lihat.add(id); urut.push(id); for (const k of N[id].kid) if (N[k.ke]) dfs(k.ke); };
    dfs(akar);
    for (const id of urut) lap[dalam[id]].push(id);
    const induk = {}; for (const id of ids) induk[id] = [];
    for (const id of ids) for (const k of N[id].kid) if (N[k.ke]) induk[k.ke].push(id);
    // x awal: tiap lapis rata tengah
    const lebarLap = l => l.reduce((a, id) => a + N[id].w, 0) + JARAK * (l.length - 1);
    const maxL = Math.max(...lap.map(lebarLap));
    for (const l of lap) { let x = (maxL - lebarLap(l)) / 2; for (const id of l) { N[id].x = x + N[id].w / 2; x += N[id].w + JARAK; } }
    for (let it = 0; it < 8; it++) {
      for (let d = 1; d <= maxD; d++) {
        const l = lap[d];
        for (const id of l) { const p = induk[id]; N[id].ing = p.length ? p.reduce((a, q) => a + N[q].x, 0) / p.length : N[id].x; }
        l.sort((a, b) => N[a].ing - N[b].ing || urut.indexOf(a) - urut.indexOf(b));
        let prev = -1e9;
        for (const id of l) { N[id].x = Math.max(N[id].ing, prev + (prev > -1e8 ? JARAK + (N[id].w + N[l[l.indexOf(id) - 1]].w) / 2 : 0)); prev = N[id].x; }
        const geser = l.reduce((a, id) => a + (N[id].ing - N[id].x), 0) / l.length;
        for (const id of l) N[id].x += geser;
        // rapatkan lagi bila geser menimbulkan tumpang tindih
        for (let k = 1; k < l.length; k++) { const a = N[l[k - 1]], b = N[l[k]]; const min = a.x + (a.w + b.w) / 2 + JARAK; if (b.x < min) b.x = min; }
      }
    }
    const minX = Math.min(...ids.map(id => N[id].x - N[id].w / 2)), margin = 30;
    for (const id of ids) N[id].x += margin - minX;
    const lebar = Math.max(...ids.map(id => N[id].x + N[id].w / 2)) + margin + 30;
    let y = margin; const barisH = [];
    for (let d = 0; d <= maxD; d++) { const h = Math.max(...lap[d].map(id => N[id].h)); barisH.push([y, h]); y += h + VGAP; }
    const tinggi = y - VGAP + margin;
    for (let d = 0; d <= maxD; d++) for (const id of lap[d]) N[id].y = barisH[d][0] + barisH[d][1] / 2;
    let s = `<svg xmlns="http://www.w3.org/2000/svg" width="${lebar}" height="${tinggi}" viewBox="0 0 ${lebar} ${tinggi}" font-family="Roboto"><rect width="100%" height="100%" fill="#fff"/>` +
      `<defs><marker id="pk" viewBox="0 0 10 10" refX="9" refY="5" markerUnits="userSpaceOnUse" markerWidth="10" markerHeight="10" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="${NAVY}"/></marker></defs>`;
    let lab = '';
    for (const id of ids) for (const k of N[id].kid) {
      const a = N[id], b = N[k.ke]; if (!b) continue;
      const x1 = a.x, y1 = a.y + a.h / 2, x2 = b.x, y2 = b.y - b.h / 2 - 1;
      const sama = Math.abs(b.y - a.y) < 1;
      const tengah = y1 + (y2 - y1) / 2;
      const warnaG = k.label === 'Ya' ? BIRU : ORANYE;
      const panjang = dalam[k.ke] - dalam[id] > 1;
      let d, lx, ly;
      if (panjang) {
        // lompat lapis: keluar dari sisi node, turun di tepi luar lapis perantara, masuk ke target dari atas
        const lp = lap[dalam[id]], pos = lp.indexOf(id);
        let kanan = x2 >= x1;
        if (kanan && pos < lp.length - 1 && pos === 0) kanan = false;          // tetangga di kanan: keluar lewat kiri
        else if (!kanan && pos > 0 && pos === lp.length - 1) kanan = true;     // tetangga di kiri: keluar lewat kanan
        else if (kanan && pos < lp.length - 1) kanan = false;
        else if (!kanan && pos > 0) kanan = true;
        const antara = []; for (let q = dalam[id] + 1; q < dalam[k.ke]; q++) antara.push(...lap[q]);
        const xs = kanan ? Math.max(a.x + a.w / 2, ...antara.map(q => N[q].x + N[q].w / 2)) + 16 : Math.min(a.x - a.w / 2, ...antara.map(q => N[q].x - N[q].w / 2)) - 16;
        const xe = kanan ? a.x + a.w / 2 : a.x - a.w / 2;
        const ym = b.y - b.h / 2 - 22;
        d = `M${xe},${a.y} H${xs} V${ym} H${x2} V${y2}`;
        lx = xe + (kanan ? 24 : -24); ly = a.y - 13;
      } else {
        d = Math.abs(x1 - x2) < 2 ? `M${x1},${y1} V${y2}` : `M${x1},${y1} V${tengah} H${x2} V${y2}`;
        lx = x1 + (x2 > x1 + 2 ? 26 : x2 < x1 - 2 ? -26 : 20); ly = y1 + 13;
      }
      s += `<path d="${d}" fill="none" stroke="${warnaG}" stroke-width="1.8" marker-end="url(#pk)"/>`;
      const lw = ukur(k.label, 10, true) + 14;
      lab += `<rect x="${lx - lw / 2}" y="${ly - 9}" width="${lw}" height="18" rx="9" fill="${k.label === 'Ya' ? '#DCEBF8' : '#FBE7D6'}" stroke="${warnaG}" stroke-width="1"/>` +
        teks(lx, ly, [k.label], 10, { bold: true, fill: k.label === 'Ya' ? '#1B5A93' : '#9A4306' });
    }
    for (const id of ids) {
      const n = N[id], x = n.x - n.w / 2, yy = n.y - n.h / 2;
      if (n.tipe === 'q') {
        s += `<rect x="${x}" y="${yy}" width="${n.w}" height="${n.h}" rx="5" fill="${TINT}" stroke="${NAVY}" stroke-width="1.6"/><rect x="${x}" y="${yy}" width="6" height="${n.h}" rx="3" fill="${NAVY}"/>` +
          teks(n.x + 3, n.y, n.baris, PX, { fill: NAVY, bold: false, lh: PX * 1.35 });
      } else {
        s += `<rect x="${x}" y="${yy}" width="${n.w}" height="${n.h}" rx="${Math.min(n.h / 2, 18)}" fill="${n.warna}"/>` + teks(n.x, n.y, n.baris, PX, { fill: '#fff', bold: true, lh: PX * 1.35 });
      }
    }
    return s + lab + '</svg>';
  }

  // ---------------- grafik ----------------
  const W = spec.lebar || 760, jenis = ({ bertumpuk: 'tumpuk', 'batang-tumpuk': 'tumpuk', mendatar: 'batang-mendatar' })[spec.jenis] || spec.jenis || 'batang';
  const kat = spec.kategori || spec.sumbu_x, seri = spec.seri.map((x, i) => ({ nama: x.nama, nilai: x.nilai, warna: warna(x.warna, i) }));
  const nilaiOn = spec.tampilkan_nilai !== false;
  const sat0 = spec.satuan || '';
  const satuan = sat0.length <= 2 ? sat0 : '';              // satuan pendek (%, x) menempel di nilai; yang panjang jadi judul sumbu
  const judulY = spec.sumbu_y || (sat0.length > 2 ? sat0 : '');
  const nice = mx => { const raw = mx / 5, p = Math.pow(10, Math.floor(Math.log10(raw))), f = raw / p; const st = (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * p; return Math.ceil(mx / st - 1e-9) * st; };
  const tampilNilai = v => fmt(v) + satuan;
  const legendaH = seri.length > 1 ? 30 : 0;
  const pen = spec.penanda || [];
  let catH = 0, catSvg = '';
  if (pen.length) {
    let yy = 0;
    pen.forEach((p, i) => { const bs = bungkus(p.teks, W - 50, 10); yy += bs.length * 13 + 6; });
    catH = yy + 8;
  }
  const cat = spec.catatan ? bungkus(spec.catatan, W - 28, 9.5) : [];
  const catN = cat.length ? cat.length * 12.5 + 10 : 0;
  const bentuk = (inner, H) => {
    let ex = '';
    if (pen.length) {
      let yy = H + 6;
      pen.forEach((p, i) => {
        const bs = bungkus(p.teks, W - 50, 10);
        ex += `<circle cx="${L0 + 8}" cy="${yy + 6}" r="7.5" fill="${ORANYE}"/>` + teks(L0 + 8, yy + 6, [String(i + 1)], 9, { bold: true, fill: '#fff' }) + teks(L0 + 24, yy + 6, bs, 10, { anchor: 'start', lh: 13 });
        yy += bs.length * 13 + 6;
      });
    }
    if (cat.length) ex += teks(L0, H + catH + 8 + (cat.length - 1) * 6.25, cat, 9.5, { anchor: 'start', lh: 12.5, fill: TEKS3 });
    const TT = H + catH + catN;
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${TT}" viewBox="0 0 ${W} ${TT}" font-family="Roboto"><rect width="100%" height="100%" fill="#fff"/>${inner}${ex}</svg>`;
  };
  const L0 = 14;
  const tandaX = (cx, T, ph) => {
    let r = '';
    pen.forEach((p, i) => { const k = kat.indexOf(String(p.x)); if (k < 0) return; const x = cx(k);
      r += `<line x1="${x}" y1="${T - 4}" x2="${x}" y2="${T + ph}" stroke="${ORANYE}" stroke-dasharray="4 3" stroke-width="1.4"/><circle cx="${x}" cy="${T - 10}" r="7.5" fill="${ORANYE}"/>` + teks(x, T - 10, [String(i + 1)], 9, { bold: true, fill: '#fff' }); });
    return r;
  };
  const legenda = H => {
    if (seri.length < 2) return '';
    let tot = seri.reduce((a, x) => a + 22 + ukur(x.nama, 11) + 18, 0), x = (W - tot) / 2, o = '';
    for (const sx of seri) { o += `<rect x="${x}" y="${H - 20}" width="12" height="12" rx="2" fill="${sx.warna}"/>` + teks(x + 18, H - 14, [sx.nama], 11, { anchor: 'start' }); x += 22 + ukur(sx.nama, 11) + 18; }
    return o;
  };

  if (jenis === 'batang-mendatar') {
    const labW = Math.min(240, Math.max(...kat.map(k => ukur(k, 11))) + 12);
    const L = labW + 10, R = 70, T = 14, tump = seri.length;
    const mx = nice(Math.max(...seri.flatMap(x => x.nilai)) * 1.05 || 1);
    const bandH = Math.max(26, tump * 16 + 10), H = T + kat.length * bandH + 24 + legendaH;
    const pw = W - L - R; let o = '';
    for (let t = 0; t <= 5; t++) { const v = mx * t / 5, x = L + pw * t / 5; o += `<line x1="${x}" y1="${T}" x2="${x}" y2="${T + kat.length * bandH}" stroke="${t ? '#E3E7EC' : GARIS}"/>` + teks(x, T + kat.length * bandH + 12, [fmt(v)], 9.5, { fill: TEKS3 }); }
    kat.forEach((k, i) => {
      const y0 = T + i * bandH;
      o += teks(L - 8, y0 + bandH / 2, bungkus(k, labW, 11), 11, { anchor: 'end' });
      seri.forEach((sx, j) => {
        const bh = tump > 1 ? 13 : Math.min(18, bandH - 10), by = y0 + (bandH - tump * bh - (tump - 1) * 3) / 2 + j * (bh + 3), bw = pw * sx.nilai[i] / mx;
        o += `<rect x="${L}" y="${by}" width="${bw}" height="${bh}" fill="${sx.warna}"/>`;
        if (nilaiOn) o += teks(L + bw + 5, by + bh / 2, [tampilNilai(sx.nilai[i])], 10, { anchor: 'start', bold: true, fill: NAVY });
      });
    });
    return bentuk(o + legenda(H), H);
  }

  // batang tegak, tumpuk, garis
  const L = judulY ? 62 : 52, R = 16, T = pen.length ? 30 : 22, B0 = 38, H = spec.tinggi || 360;
  const totals = jenis === 'tumpuk' ? kat.map((_, i) => seri.reduce((a, x) => a + (x.nilai[i] || 0), 0)) : null;
  const dataMax = jenis === 'tumpuk' ? Math.max(...totals) : Math.max(...seri.flatMap(x => x.nilai));
  const mx = nice(dataMax * 1.12 || 1);
  const ph = H - T - B0 - legendaH - (spec.sumbu_y ? 0 : 0), pw = W - L - R;
  const y = v => T + ph - ph * v / mx;
  let o = '';
  for (let t = 0; t <= 5; t++) { const v = mx * t / 5; o += `<line x1="${L}" y1="${y(v)}" x2="${W - R}" y2="${y(v)}" stroke="${t ? '#E3E7EC' : GARIS}"/>` + teks(L - 6, y(v), [fmt(v)], 9.5, { anchor: 'end', fill: TEKS3 }); }
  if (judulY) o += `<text transform="translate(12,${T + ph / 2}) rotate(-90)" font-size="10" fill="${TEKS3}" text-anchor="middle">${esc(judulY)}</text>`;
  const band = pw / kat.length;
  kat.forEach((k, i) => {
    const cx = L + band * i + band / 2;
    o += teks(cx, T + ph + 16, bungkus(k, band - 4, 10), 10, { fill: TEKS2 });
  });
  if (jenis === 'batang') {
    const n = seri.length, bw = Math.min(46, (band * 0.72) / n);
    kat.forEach((k, i) => seri.forEach((sx, j) => {
      const x = L + band * i + band / 2 - (n * bw) / 2 + j * bw, v = sx.nilai[i];
      o += `<rect x="${x}" y="${y(v)}" width="${bw - 2}" height="${T + ph - y(v)}" fill="${sx.warna}"/>`;
      if (nilaiOn) o += teks(x + (bw - 2) / 2, y(v) - 8, [tampilNilai(v)], n > 2 ? 8.5 : 10, { bold: true, fill: NAVY });
    }));
  } else if (jenis === 'tumpuk') {
    const bw = Math.min(60, band * 0.62);
    kat.forEach((k, i) => {
      let acc = 0; const x = L + band * i + band / 2 - bw / 2;
      seri.forEach(sx => {
        const v = sx.nilai[i] || 0, top = y(acc + v), h = y(acc) - top;
        o += `<rect x="${x}" y="${top}" width="${bw}" height="${h}" fill="${sx.warna}" stroke="#fff" stroke-width="1"/>`;
        if (nilaiOn && h > 14) o += teks(x + bw / 2, top + h / 2, [fmt(v)], 9, { bold: true, fill: '#fff' });
        acc += v;
      });
      if (nilaiOn) o += teks(x + bw / 2, y(acc) - 8, [tampilNilai(acc)], 10, { bold: true, fill: NAVY });
    });
  } else if (jenis === 'garis') {
    seri.forEach(sx => {
      const pts = sx.nilai.map((v, i) => [L + band * i + band / 2, y(v)]);
      o += `<polyline points="${pts.map(p => p.join(',')).join(' ')}" fill="none" stroke="${sx.warna}" stroke-width="2.4" stroke-linejoin="round"/>`;
      pts.forEach(([px, py], i) => {
        o += `<circle cx="${px}" cy="${py}" r="3.6" fill="#fff" stroke="${sx.warna}" stroke-width="2"/>`;
        if (nilaiOn && (kat.length <= 12 || i === pts.length - 1)) o += teks(px, py - 12, [tampilNilai(sx.nilai[i])], 9.5, { bold: true, fill: sx.warna });
      });
    });
  } else throw new Error('jenis grafik tidak dikenal: ' + jenis);
  o += tandaX(i => L + band * i + band / 2, T, ph);
  if (spec.garis_acuan) {
    const g = spec.garis_acuan;
    o += `<line x1="${L}" y1="${y(g.nilai)}" x2="${W - R}" y2="${y(g.nilai)}" stroke="${ORANYE}" stroke-dasharray="5 4" stroke-width="1.5"/>` + teks(W - R - 4, y(g.nilai) - 9, [g.label || fmt(g.nilai)], 9.5, { anchor: 'end', fill: ORANYE, bold: true });
  }
  return bentuk(o + legenda(H), H);
}

const b = await luncur();
const p = await b.newPage({ viewport: { width: 900, height: 700 }, deviceScaleFactor: 3 });
const TMP = path.join(DI, '_kerja'); fs.mkdirSync(TMP, { recursive: true });
fs.writeFileSync(path.join(TMP, 'gambar.html'), HTML);
await p.goto(pathToFileURL(path.join(TMP, 'gambar.html')).href, { waitUntil: 'load' });
await p.evaluate(() => Promise.all([400, 500, 700].map(w => document.fonts.load(`${w} 12px Roboto`))));
let n = 0;
for (const f of berkas) {
  const spec = JSON.parse(fs.readFileSync(path.join(SUMBER, f), 'utf-8'));
  const pohon = f.endsWith('.pohon.json');
  const nama = f.replace(/\.pohon\.json$|\.json$/, '');
  try {
    const svg = await p.evaluate(`(${gambarkan.toString()})(${JSON.stringify(pohon ? 'pohon' : 'grafik')}, ${JSON.stringify(spec)})`);
    await p.evaluate(s => { document.getElementById('w').innerHTML = s; }, svg);
    await (await p.$('#w svg')).screenshot({ path: path.join(KELUAR, nama + '.png') });
    n++;
  } catch (err) { console.error('GAGAL', f, err.message); process.exitCode = 1; }
}
await b.close();
console.log('gambar', n, 'dari', berkas.length);
