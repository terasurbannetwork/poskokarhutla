/* Perender Markdown kecil untuk pratinjau katalog dokumen: menghasilkan node DOM, tidak pernah innerHTML, jadi HTML di dalam Markdown tampil sebagai teks.
   Tautan hanya http/https; tautan relatif dan gambar repo tampil sebagai teks karena berkasnya tidak terbit di situs. */
"use strict";
window.KatalogMd = (() => {
  const el = (tag, kelas, ...anak) => { const e = document.createElement(tag); if (kelas) e.className = kelas; e.append(...anak.flat()); return e; };
  const INLINE = /(`[^`]+`)|(\*\*.+?\*\*)|(\*[^*\s][^*]*\*)|(!?\[[^\]]*\]\([^)\s]*(?:\s+"[^"]*")?\))|(https?:\/\/[^\s<>)]+)/g;

  function tautan(teks, url) {
    if (!/^https?:\/\//i.test(url)) return teks;
    const a = el("a", "", teks); a.href = url; a.target = "_blank"; a.rel = "noopener noreferrer"; return a;
  }
  function inline(s) {
    const hasil = []; let akhir = 0;
    for (const m of s.matchAll(INLINE)) {
      if (m.index > akhir) hasil.push(s.slice(akhir, m.index));
      const t = m[0];
      if (m[1]) hasil.push(el("code", "", t.slice(1, -1)));
      else if (m[2]) hasil.push(el("strong", "", inline(t.slice(2, -2))));
      else if (m[3]) hasil.push(el("em", "", inline(t.slice(1, -1))));
      else if (m[4]) { const [, teks, url] = t.match(/^!?\[([^\]]*)\]\(([^)\s]*)/); hasil.push(t[0] === "!" ? (teks || "gambar") : tautan(teks, url)); }
      else hasil.push(tautan(t, t));
      akhir = m.index + t.length;
    }
    if (akhir < s.length) hasil.push(s.slice(akhir));
    return hasil;
  }

  const sel = b => b.trim().replace(/^\||\|$/g, "").split(/(?<!\\)\|/).map(x => x.trim().replace(/\\\|/g, "|"));
  const RE_DAFTAR = /^(\s*)([-*+]|\d+[.)])\s+(.*)$/, RE_GARIS = /^\s*([-*_])(\s*\1){2,}\s*$/, RE_PISAH = /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/;
  const awalBlok = (b, n) => /^\s*(#{1,6}\s|```|>)/.test(b) || RE_DAFTAR.test(b) || RE_GARIS.test(b) || (b.includes("|") && n !== undefined && RE_PISAH.test(n));

  function bangun(teks) {
    const B = teks.replace(/\r\n?/g, "\n").split("\n"), wadah = el("article", "kd-md");
    let i = 0;
    if (B[0]?.trim() === "---") { const j = B.indexOf("---", 1); if (j > 0) i = j + 1; }
    wadah.append(...blok(B.slice(i)));
    return wadah;
  }
  function blok(B) {
    const hasil = []; let i = 0;
    while (i < B.length) {
      const b = B[i];
      if (!b.trim()) { i++; continue; }
      if (/^\s*```/.test(b)) {
        const isi = []; i++;
        while (i < B.length && !/^\s*```/.test(B[i])) isi.push(B[i++]);
        i++; hasil.push(el("pre", "", el("code", "", isi.join("\n")))); continue;
      }
      const judul = b.match(/^\s*(#{1,6})\s+(.*?)\s*#*\s*$/);
      if (judul) { hasil.push(el("h" + judul[1].length, "", inline(judul[2]))); i++; continue; }
      if (RE_GARIS.test(b)) { hasil.push(el("hr")); i++; continue; }
      if (/^\s*>/.test(b)) {
        const isi = [];
        while (i < B.length && /^\s*>/.test(B[i])) isi.push(B[i++].replace(/^\s*>\s?/, ""));
        hasil.push(el("blockquote", "", blok(isi))); continue;
      }
      if (b.includes("|") && i + 1 < B.length && RE_PISAH.test(B[i + 1])) {
        const kepala = sel(b); i += 2; const baris = [];
        while (i < B.length && B[i].includes("|") && B[i].trim()) baris.push(sel(B[i++]));
        hasil.push(el("div", "kd-md-tabel", el("table", "", el("thead", "", el("tr", "", kepala.map(k => el("th", "", inline(k))))), el("tbody", "", baris.map(r => el("tr", "", r.map(k => el("td", "", inline(k)))))))));
        continue;
      }
      if (RE_DAFTAR.test(b)) { const [d, lanjut] = daftar(B, i); hasil.push(d); i = lanjut; continue; }
      const para = [];
      while (i < B.length && B[i].trim() && !awalBlok(B[i], B[i + 1])) para.push(B[i++].trim());
      if (!para.length) { para.push(b.trim()); i++; }
      hasil.push(el("p", "", inline(para.join(" "))));
    }
    return hasil;
  }
  function daftar(B, i) {
    const urut = m => /\d/.test(m[2]), m0 = B[i].match(RE_DAFTAR), akar = el(urut(m0) ? "ol" : "ul"), tumpuk = [{ind: m0[1].length, el: akar}];
    let li = null;
    while (i < B.length) {
      const b = B[i], m = b.match(RE_DAFTAR);
      if (m) {
        const ind = m[1].length;
        while (tumpuk.length > 1 && ind < tumpuk[tumpuk.length - 1].ind) tumpuk.pop();
        if (ind > tumpuk[tumpuk.length - 1].ind + 1 && li) { const sub = el(urut(m) ? "ol" : "ul"); li.append(sub); tumpuk.push({ind, el: sub}); }
        li = el("li", "", inline(m[3])); tumpuk[tumpuk.length - 1].el.append(li); i++;
      } else if (!b.trim()) {
        if (i + 1 < B.length && RE_DAFTAR.test(B[i + 1])) i++; else break;
      } else if (/^\s+\S/.test(b) && li) { li.append(" ", ...inline(b.trim())); i++; }
      else break;
    }
    return [akar, i];
  }
  return {bangun};
})();
