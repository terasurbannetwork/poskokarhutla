/* exif.js: baca EXIF JPEG (DateTimeOriginal + OffsetTimeOriginal, GPS) dari berkas ASLI sebelum dikompres; canvas membuang EXIF dari berkas yang diunggah.
   Dipakai form /instansi (public/instansi.js) dan /lacak (public/lacak_lapor.js). buf = ArrayBuffer awal berkas (256 KB cukup). null = bukan JPEG atau tanpa EXIF. */
window.bacaExif = buf => {
  try {
    const v = new DataView(buf); if (v.getUint16(0) !== 0xffd8) return null;
    let o = 2;
    while (o < v.byteLength - 4) { const m = v.getUint16(o), n = v.getUint16(o + 2);
      if (m === 0xffe1 && v.getUint32(o + 4) === 0x45786966) { const t = o + 10, le = v.getUint16(t) === 0x4949;
        const u16 = p => v.getUint16(t + p, le), u32 = p => v.getUint32(t + p, le), ifd = p => { const out = {}, k = u16(p); for (let i = 0; i < k; i++) { const e = p + 2 + i * 12; out[u16(e)] = {n: u32(e + 4), nilai: e + 8}; } return out; };
        const str = e => { const p = e.n > 4 ? u32(e.nilai) : e.nilai; let s = ""; for (let i = 0; i < e.n - 1; i++) s += String.fromCharCode(v.getUint8(t + p + i)); return s; };
        const rat = e => { const p = u32(e.nilai); return [0, 1, 2].map(i => u32(p + i * 8) / (u32(p + i * 8 + 4) || 1)); };
        const ifd0 = ifd(u32(4)), hasil = {};
        if (ifd0[0x8769]) { const ex = ifd(u32(ifd0[0x8769].nilai)), dt = ex[0x9003] && str(ex[0x9003]), off = ex[0x9011] && str(ex[0x9011]), m2 = dt && dt.match(/^(\d{4}):(\d\d):(\d\d) (\d\d):(\d\d):(\d\d)/);
          if (m2) { const w = Date.parse(`${m2[1]}-${m2[2]}-${m2[3]}T${m2[4]}:${m2[5]}:${m2[6]}` + (off && /^[+-]\d\d:\d\d$/.test(off) ? off : "")); if (Number.isFinite(w)) hasil.waktu = w; } }
        if (ifd0[0x8825]) { const g = ifd(u32(ifd0[0x8825].nilai));
          if (g[2] && g[4]) { const dms = a => a[0] + a[1] / 60 + a[2] / 3600, la = dms(rat(g[2])), lo = dms(rat(g[4]));
            const sLa = g[1] ? String.fromCharCode(v.getUint8(g[1].nilai + t)) : "N", sLo = g[3] ? String.fromCharCode(v.getUint8(g[3].nilai + t)) : "E";
            if (la || lo) { hasil.lat = sLa === "S" ? -la : la; hasil.lon = sLo === "W" ? -lo : lo; } } }
        return hasil; }
      if (m === 0xffda) break; o += 2 + n; }
  } catch (e) {}
  return null;
};
