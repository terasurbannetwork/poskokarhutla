// Glif ikon untuk DOCX dari satu sumber: GLIF di bangun/visual/ikon.mjs (deck, Lucide, khusus), sama dengan peta, grafik,
// dan deck. bangun.py merasterkan glifnya sendiri dengan PyMuPDF, jadi berkas ini tidak butuh peramban.
// Pakai: node ikon.mjs <glif> [<glif> ...]  ->  JSON {glif: isi SVG viewBox 24 | null} di stdout (null = belum digambar)
import {GLIF} from '../visual/ikon.mjs';

console.log(JSON.stringify(Object.fromEntries(process.argv.slice(2).map(g => [g, GLIF[g] ?? null]))));
