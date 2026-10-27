/* SP-055: pemindai statis untuk gerbang-sippa.test.mjs (RU §2.6 INP per handler, §2.8 butir 7). Bukan uji sendiri: hanya fungsi murni, tanpa berkas.
   Pemindai ini sengaja sederhana (tanpa parser JS penuh): ia melompati string, templat, regex sederhana, dan komentar, lalu mencocokkan kurung.
   Batasnya tertulis di tiap fungsi; gerbang yang memakainya wajib punya fixture pelanggaran supaya pemindai yang buta ketahuan. */

/* indeks penutup untuk kurung pada posisi i (teks[i] adalah pembuka), -1 bila tak ketemu. Melompati string, templat (termasuk ${ } bersarang), komentar. */
export function tutupKurung(t, i) {
  const buka = t[i], tutup = {"(": ")", "{": "}", "[": "]"}[buka];
  let d = 0;
  for (let j = i; j < t.length; j++) {
    const c = t[j];
    if (c === '"' || c === "'") { j = lewatString(t, j); continue; }
    if (c === "`") { j = lewatTemplat(t, j); continue; }
    if (c === "/" && t[j + 1] === "/") { j = t.indexOf("\n", j); if (j < 0) return -1; continue; }
    if (c === "/" && t[j + 1] === "*") { j = t.indexOf("*/", j + 2); if (j < 0) return -1; j++; continue; }
    if (c === "/" && regexDiSini(t, j)) { j = lewatRegex(t, j); continue; }
    if (c === buka) d++; else if (c === tutup && --d === 0) return j;
  }
  return -1;
}
function lewatString(t, i) { const q = t[i]; for (let j = i + 1; j < t.length; j++) { if (t[j] === "\\") { j++; continue; } if (t[j] === q || t[j] === "\n") return j; } return t.length; }
function lewatTemplat(t, i) {
  for (let j = i + 1; j < t.length; j++) {
    const c = t[j];
    if (c === "\\") { j++; continue; }
    if (c === "`") return j;
    if (c === "$" && t[j + 1] === "{") { const k = tutupKurung(t, j + 1); if (k < 0) return t.length; j = k; }
  }
  return t.length;
}
/* "/" membuka regex bila token sebelumnya (tanpa spasi) bukan angka, identifier, atau penutup kurung */
function regexDiSini(t, j) { let k = j - 1; while (k >= 0 && /\s/.test(t[k])) k--; return k < 0 || /[(,=:[!&|?{};+\-*%<>~^]/.test(t[k]) || /\b(return|typeof|case)$/.test(t.slice(Math.max(0, k - 6), k + 1)); }
function lewatRegex(t, i) { let kelas = false; for (let j = i + 1; j < t.length; j++) { const c = t[j]; if (c === "\\") { j++; continue; } if (c === "[") kelas = true; else if (c === "]") kelas = false; else if (c === "/" && !kelas) return j; else if (c === "\n") return j; } return t.length; }

/* pecah argumen tingkat atas di dalam kurung panggilan: kembalikan larik teks argumen */
export function pecahArgumen(isi) {
  const hasil = []; let awal = 0, d = 0;
  for (let j = 0; j < isi.length; j++) {
    const c = isi[j];
    if (c === '"' || c === "'") { j = lewatString(isi, j); continue; }
    if (c === "`") { j = lewatTemplat(isi, j); continue; }
    if (c === "/" && isi[j + 1] === "/") { j = isi.indexOf("\n", j); if (j < 0) break; continue; }
    if (c === "/" && isi[j + 1] === "*") { j = isi.indexOf("*/", j + 2); if (j < 0) break; j++; continue; }
    if (c === "/" && regexDiSini(isi, j)) { j = lewatRegex(isi, j); continue; }
    if (c === "(" || c === "{" || c === "[") d++; else if (c === ")" || c === "}" || c === "]") d--;
    else if (c === "," && d === 0) { hasil.push(isi.slice(awal, j)); awal = j + 1; }
  }
  hasil.push(isi.slice(awal)); return hasil.map(s => s.trim());
}

/* buang panggilan bernama beserta argumennya (balanced): dipakai membuang nanti( ... ) dan sejenisnya dari badan handler */
export function buangPanggilan(t, re) {
  let hasil = "", dari = 0; const g = new RegExp(re.source, "g");
  for (let m; (m = g.exec(t));) {
    if (m.index < dari) continue;
    const i = m.index + m[0].length - 1, k = tutupKurung(t, i);
    if (k < 0) break;
    hasil += t.slice(dari, m.index); dari = k + 1; g.lastIndex = dari;
  }
  return hasil + t.slice(dari);
}

/* definisi fungsi bernama di berkas: function nama(...) {...} atau const nama = (...) => {...} / => ekspresi. Kembalikan badan teks. */
export function definisi(t, nama) {
  const esc = nama.replace(/[$]/g, "\\$");
  let m = new RegExp(`(async\\s+)?function\\*?\\s+${esc}\\s*\\(`).exec(t);
  if (m && m[1]) return "";   // fungsi async: kerja sesudah await tidak menahan paint interaksi (INP)
  if (m) { const p = tutupKurung(t, m.index + m[0].length - 1), b = t.indexOf("{", p); return b > 0 ? t.slice(b, tutupKurung(t, b) + 1) : ""; }
  m = new RegExp(`(?:const|let|var)\\s+${esc}\\s*=\\s*(async\\s*)?(?:\\([^)]*\\)|[A-Za-z_$][\\w$]*)\\s*=>\\s*`).exec(t);
  if (m && m[1]) return "";
  if (m) { const i = m.index + m[0].length; if (t[i] === "{") return t.slice(i, tutupKurung(t, i) + 1); const f = t.indexOf(";", i), n = t.indexOf("\n", i); return t.slice(i, Math.min(...[f, n].filter(x => x > 0), t.length)); }
  return "";
}

/* semua addEventListener("click"|"input"|"change"|"keydown", handler): {ev, nama, badan, awal}. Handler berupa identifier dirujuk ke definisinya di berkas yang sama. */
export function ekstrakHandler(t, peristiwa = ["click", "input", "change", "keydown"]) {
  const hasil = [], re = /addEventListener\(\s*["'](\w+)["']\s*,/g;
  for (let m; (m = re.exec(t));) {
    if (!peristiwa.includes(m[1])) continue;
    const buka = t.indexOf("(", m.index), tutup = tutupKurung(t, buka); if (tutup < 0) continue;
    const arg = pecahArgumen(t.slice(buka + 1, tutup)), h = arg[1] ?? "";
    const ident = /^[A-Za-z_$][\w$]*$/.exec(h);
    hasil.push({ev: m[1], nama: ident ? ident[0] : `${m[1]}@${t.slice(0, m.index).split("\n").length}`, badan: ident ? definisi(t, ident[0]) : h, awal: m.index});
  }
  return hasil;
}

export const TUNDA = /\b(?:nanti|jadwalkan\w*|tunda|requestAnimationFrame|setTimeout|queueMicrotask)\s*\(/;
export const BERAT = /\b(?:gambar\w*|render\w*|setData|addSource|addLayer|buatPdf|jalankanMc|hitungMc)\s*\(/;
const CHROME = /aria-(?:pressed|selected|checked|expanded)|\bclassList\b|\.hidden\s*=|\.tabIndex\s*=/;
const BUANG = /\b(?:nanti|jadwalkan\w*|tunda|postMessage|requestAnimationFrame|setTimeout|queueMicrotask)\s*\(/;

/* badan fungsi tanpa pembungkusnya: "e => { ... }" menjadi "..."; fungsi bernama sudah berupa blok { ... } */
function isiBlok(t) {
  const m = /^\s*(?:async\s*)?(?:function\s*\w*\s*\([^)]*\)|\([^)]*\)|[A-Za-z_$][\w$]*)\s*(?:=>\s*)?\{/.exec(t) || /^\s*\{/.exec(t);
  if (!m) return t;
  const i = m.index + m[0].length - 1, k = tutupKurung(t, i); return k < 0 ? t : t.slice(i + 1, k);
}
/* panggilan balik bertubuh blok (konfirmasi(..., () => {...}), addEventListener di dalam handler) tidak berjalan saat handler berjalan: dibuang dari analisis kerja sinkron */
export function hapusPanggilanBalik(t) {
  let hasil = t;
  for (let n = 0; n < 200; n++) {
    const m = /=>\s*\{/.exec(hasil); if (!m) break;
    const i = m.index + m[0].length - 1, k = tutupKurung(hasil, i); if (k < 0) break;
    hasil = hasil.slice(0, m.index) + hasil.slice(k + 1);
  }
  return hasil;
}
const sinkron = t => hapusPanggilanBalik(buangPanggilan(isiBlok(t), BUANG));

/* periksa satu handler. Kembalikan larik pelanggaran. definisiLokal(nama) -> badan, untuk perluasan satu tingkat. */
export function periksaHandler(h, definisiLokal = () => "") {
  const g = [], tanpaTunda = sinkron(h.badan);
  const panggilan = new Set([...tanpaTunda.matchAll(/\b([A-Za-z_$][\w$]*)\s*\(/g)].map(m => m[1]));
  let diperluas = tanpaTunda;
  for (const n of panggilan) if (!BERAT.test(`${n}(`)) diperluas += "\n" + sinkron(definisiLokal(n));
  const berat = diperluas.match(new RegExp(BERAT.source, "g"));
  if (berat) g.push(`${h.nama}: kerja berat dipanggil langsung di handler (${[...new Set(berat.map(x => x.replace(/\s*\($/, "")))].join(", ")}); bungkus dengan nanti( atau pindahkan ke Web Worker (RU §2.6 butir 1)`);
  const ic = h.badan.search(CHROME), it = h.badan.search(TUNDA);
  if (ic >= 0 && it >= 0 && it < ic) g.push(`${h.nama}: nanti( atau jadwalkan dipanggil sebelum chrome (aria-pressed, aria-selected, kelas aktif) diubah (RU §2.6 butir 2)`);
  if (/\.(?:addSource|addLayer)\s*\(/.test(h.badan) || /\.(?:addSource|addLayer)\s*\(/.test(diperluas)) g.push(`${h.nama}: addSource atau addLayer di handler; sakelar peta hanya setLayoutProperty atau setFilter (RU §2.6 butir 3)`);
  return g;
}
export function periksaBerkasInp(nama, t, pengecualian = {}) {
  const g = [];
  for (const h of ekstrakHandler(t)) for (const p of periksaHandler(h, n => definisi(t, n))) {
    const kunci = `${nama}:${p.split(":")[0]}`;
    if (!Object.hasOwn(pengecualian, kunci)) g.push(`${nama}: ${p}`);
  }
  return g;
}

/* ================= butir 7: penyisipan HTML ================= */
const SAFE_PANGGILAN = /\b(?:svg\w*|kartu\w*|tabel\w*|grafik\w*|rincian\w*|saran\w*|barisKit\w*|lolos|tampil|buatQR|Kartu\.\w+|PilihCantik\.\w+|esc|escUrl|fmt(?:\.\w+)?|jamWIB|ikon|rb|paginasi|tglId|tgl\w*|waktuTag|pil\w*|td|sumberBaris|\w+Html|\w+HTML)\s*\(/;
const STRUKTUR = new Set(["map", "filter", "slice", "sort", "flat", "flatMap", "reverse", "entries", "keys", "values", "some", "every", "includes", "length", "size"]);   // hasilnya daftar, boolean, atau angka; isi daftar dianalisis lewat templat di dalam callback
const RECV_AMAN = new Set(["Math", "Number", "KONST", "Object", "JSON", "Date", "Array", "String", "this", "Wilayah", "TEKS", "LABEL", "document", "location", "st", "konteks", "TEKS_JADWAL", "TEKS_STATUS", "NAMA_LENGAN"]);

/* analisis interpolasi satu ${...}: buang panggilan aman, string, dan templat bersarang (dianalisis rekursif), lalu cari akses properti ke data mentah */
export function interpolasiTakAman(e, temuan = []) {
  if (/\/\*\s*aman:\s*[^*]{15,}\*\//.test(e)) return temuan;   // dinyatakan aman beralasan (enum internal, id berpola); mencakup interpolasi bersarang di dalamnya
  let s = buangPanggilan(e, new RegExp(SAFE_PANGGILAN.source));   // panggilan aman (esc, fmt, pembangun *Html) dibuang beserta argumennya
  s = s.replace(/\b[A-Z][A-Z0-9_]*\[[^\]]*\]/g, '""');   // TABEL_KONSTAN[kunci]: pencarian label konstanta
  s = ratakanTemplat(s, temuan);
  s = s.replace(/"(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'/g, '""');
  for (const m of s.matchAll(/([A-Za-z_$][\w$]*)((?:\??\.[A-Za-z_$][\w$]*)+)/g)) {
    const bagian = m[2].split(/\??\./).filter(Boolean), sesudah = s.slice(m.index + m[0].length), sebelum = s.slice(0, m.index);
    if (RECV_AMAN.has(m[1]) || /^[A-Z][A-Z0-9_]*$/.test(m[1])) continue;
    if (STRUKTUR.has(bagian.at(-1))) continue;
    if (/^\s*(?:\?|===|!==|==|!=|>=|<=|>|<|&&|\|\||\*|\/|-|\+\s*\d)/.test(sesudah) && !/^\s*\+/.test(sesudah)) continue;   // dipakai sebagai kondisi, pembanding, atau hitungan
    if (/!\s*$/.test(sebelum)) continue;
    temuan.push(`\${...${m[0]}...}`);
  }
  return temuan;
}
/* ganti tiap templat literal dalam teks dengan "" setelah menganalisis interpolasinya */
function ratakanTemplat(t, temuan) {
  let hasil = "";
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (c === "`") {
      const akhir = lewatTemplat(t, i);
      for (let j = i + 1; j < akhir; j++) { if (t[j] === "\\") { j++; continue; } if (t[j] === "$" && t[j + 1] === "{") { const k = tutupKurung(t, j + 1); interpolasiTakAman(t.slice(j + 2, k), temuan); j = k; } }
      hasil += '""'; i = akhir; continue;
    }
    if (c === '"' || c === "'") { const k = lewatString(t, i); hasil += t.slice(i, k + 1); i = k; continue; }
    hasil += c;
  }
  return hasil;
}
/* tiap pemberian innerHTML, outerHTML, dan insertAdjacentHTML: interpolasi data mentah (akses properti tanpa esc, fmt, atau pembangun *Html) dilaporkan */
export function periksaInnerHtml(nama, t) {
  const g = [], re = /(?:\.(?:innerHTML|outerHTML)\s*(?:=|\+=)\s*|\.insertAdjacentHTML\(\s*[^,]+,\s*)/g;
  for (let m; (m = re.exec(t));) {
    const i = m.index + m[0].length, baris = t.slice(0, m.index).split("\n").length;
    let rhs = "", d = 0;
    for (let j = i; j < t.length; j++) {
      const c = t[j];
      if (c === '"' || c === "'") { const k = lewatString(t, j); rhs += t.slice(j, k + 1); j = k; continue; }
      if (c === "`") { const k = lewatTemplat(t, j); rhs += t.slice(j, k + 1); j = k; continue; }
      if (c === "(" || c === "[" || c === "{") d++; else if (c === ")" || c === "]" || c === "}") { if (d === 0) break; d--; }
      if ((c === ";" || c === "\n") && d === 0 && !/[+?:|&(,]\s*$/.test(rhs) && rhs.trim()) break;
      rhs += c;
    }
    for (const x of interpolasiTakAman(rhs)) g.push(`${nama}:${baris}: penyisipan HTML dengan data mentah ${x}; bungkus dengan esc( atau pakai pembangun *Html (RU §2.8 butir 7)`);
  }
  return g;
}
