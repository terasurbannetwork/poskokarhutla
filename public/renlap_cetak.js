/* Renlap rute udara siap cetak per base (/renlap-cetak?base=PNK&tgl=YYYY-MM-DD&versi=pagi|malam), pola "Renlap Rute Udara Check Point"
   Merauke 30 Okt 2026 dan mesin scripts/operasi/renlap_pdf.py (port ke peramban, angka dan rumus sama):
   halaman 1 peta rute di atas citra Esri + urutan check point, halaman 2 tabel leg pilot, lalu satu halaman per CP (kotak 14 x 14 km, radius 6 km).
   Data: /data/operasi/renlap_<tgl>_<versi>.json (scripts/operasi/renlap.py) dan titik panas /api/titik. Cetak = simpan PDF dari peramban.
   Usulan lokasi untuk dilihat, bukan perintah terbang. Semua teks data lewat esc(). */
(() => {
  "use strict";
  const $ = s => document.querySelector(s), esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"})[c]);
  const TILE = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
  const ORBIT = 2, RADIUS = 6, KOTAK = 14, NM_KM = 1.852, V = 200;
  const SAT = {M: "MODIS", N: "S-NPP", N20: "NOAA-20", N21: "NOAA-21"}, BULAN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
  const ang = (x, d = 0) => Number(x).toLocaleString("id-ID", {minimumFractionDigits: d, maximumFractionDigits: d});
  const wib = t => new Date(t.getTime() + 7 * 36e5);
  const jamWib = t => { const w = wib(t); return `${w.getUTCDate()}/${w.getUTCMonth() + 1} ${String(w.getUTCHours()).padStart(2, "0")}.${String(w.getUTCMinutes()).padStart(2, "0")}`; };
  const tglPanjang = t => { const w = wib(t); return `${w.getUTCDate()} ${BULAN[w.getUTCMonth()]} ${w.getUTCFullYear()}, ${String(w.getUTCHours()).padStart(2, "0")}.${String(w.getUTCMinutes()).padStart(2, "0")} WIB`; };
  const gmaps = (la, lo) => `https://www.google.com/maps/search/?api=1&query=${la.toFixed(5)},${lo.toFixed(5)}`;
  const rad = d => d * Math.PI / 180;
  const km = (a, b) => { const p1 = rad(a[0]), p2 = rad(b[0]), h = Math.sin((p2 - p1) / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(rad(b[1] - a[1]) / 2) ** 2; return 2 * 6371.0088 * Math.asin(Math.sqrt(h)); };
  const baringan = (a, b, c, d) => { const p1 = rad(a), p2 = rad(c), dl = rad(d - b); return (Math.atan2(Math.sin(dl) * Math.cos(p2), Math.cos(p1) * Math.sin(p2) - Math.sin(p1) * Math.cos(p2) * Math.cos(dl)) * 180 / Math.PI + 360) % 360; };
  const hal3 = x => String(Math.round(x) % 360 || 360).padStart(3, "0") + "°";
  const dms1 = x => { x = Math.abs(x); let d = Math.trunc(x), m = Math.trunc((x - d) * 60), s = Math.round(((x - d) * 60 - m) * 60); if (s === 60) { s = 0; m++; } if (m === 60) { m = 0; d++; } return [d, m, s]; };
  const dms = (la, lo) => { const a = dms1(la), b = dms1(lo), p = (n, l) => String(n).padStart(l, "0"); return `${la < 0 ? "S" : "N"} ${p(a[0], 2)}° ${p(a[1], 2)}' ${p(a[2], 2)}"  ${lo < 0 ? "W" : "E"} ${p(b[0], 3)}° ${p(b[1], 2)}' ${p(b[2], 2)}"`; };
  /* Web Mercator piksel global, sama dengan renlap_pdf.gpx */
  const gpx = (la, lo, z) => { const n = 256 * 2 ** z, s = Math.sin(rad(Math.max(-85, Math.min(85, la)))); return [(lo + 180) / 360 * n, (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * n]; };
  const mpp = (la, z) => 156543.034 * Math.cos(rad(la)) / 2 ** z;
  /* bingkai citra w x h berpusat (la, lo): ubin Esri sebagai <image> di dalam SVG + fungsi proyeksi */
  function bingkai(la, lo, z, w, h) {
    const [cx, cy] = gpx(la, lo, z), x0 = cx - w / 2, y0 = cy - h / 2, img = [];
    for (let x = Math.floor(x0 / 256); x <= Math.floor((x0 + w) / 256); x++) for (let y = Math.floor(y0 / 256); y <= Math.floor((y0 + h) / 256); y++)
      img.push(`<image href="${TILE.replace("{z}", z).replace("{y}", y).replace("{x}", x)}" x="${(x * 256 - x0).toFixed(1)}" y="${(y * 256 - y0).toFixed(1)}" width="256.6" height="256.6"/>`);
    return {P: (a, b) => { const [px, py] = gpx(a, b, z); return [px - x0, py - y0]; }, img: img.join("")};
  }
  const PANAH = '<defs><marker id="p" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0,0 10,5 0,10z" fill="#38bdf8"/></marker></defs>';
  const rute = (P, t, tebal = 4) => t.slice(1).map((c, i) => { const [x1, y1] = P(t[i].lat, t[i].lon), [x2, y2] = P(c.lat, c.lon);
    return `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="#38bdf8" stroke-width="${tebal}"/><line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${((x1 + x2) / 2).toFixed(1)}" y2="${((y1 + y2) / 2).toFixed(1)}" stroke="none" marker-end="url(#p)" stroke-width="${tebal}"/>`; }).join("");
  const titikSvg = (P, d, r) => d.slice().sort((a, b) => b.umur - a.umur).map(t => { const [x, y] = P(t.lat, t.lon);
    return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r}" fill="${t.umur <= 24 ? "#ef4444" : "#facc15"}" stroke="#fff" stroke-width="${(r / 5).toFixed(1)}"/>`; }).join("");
  const penanda = (P, t, r, base, label) => { const [x, y] = P(t.lat, t.lon);
    return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r}" fill="${base ? "#0b2545" : "#e8590c"}" stroke="#fff" stroke-width="${(r / 4).toFixed(1)}"/><text x="${x.toFixed(1)}" y="${(y + r * .38).toFixed(1)}" text-anchor="middle" font-size="${Math.round(r * 1.05)}" font-weight="800" fill="#fff" font-family="Inter,Arial">${base ? "B" : t.urut}</text>`
      + (label ? `<text x="${(x + r + 6).toFixed(1)}" y="${(y + 7).toFixed(1)}" font-size="22" font-weight="700" fill="#fff" stroke="#0b2545" stroke-width="5" paint-order="stroke" font-family="Inter,Arial">${esc(label)}</text>` : ""); };
  const skala = (w, h, m, kmBar) => { const px = kmBar * 1000 / m, x = w - px - 40, y = h - 36;
    return `<rect x="${x - 14}" y="${y - 30}" width="${px + 28}" height="46" rx="6" fill="#fff" opacity=".9"/><line x1="${x}" y1="${y}" x2="${x + px}" y2="${y}" stroke="#0b2545" stroke-width="5"/><text x="${x}" y="${y - 9}" font-size="20" fill="#0b2545" font-family="Inter,Arial">0</text><text x="${x + px}" y="${y - 9}" font-size="20" text-anchor="end" fill="#0b2545" font-family="Inter,Arial">${ang(kmBar)} km</text>`; };
  const utara = w => `<circle cx="${w - 50}" cy="54" r="32" fill="#fff" opacity=".92"/><path d="M${w - 50},30 l14,36 -14,-9 -14,9z" fill="#0b2545"/><text x="${w - 50}" y="22" text-anchor="middle" font-size="20" font-weight="800" fill="#fff" stroke="#0b2545" stroke-width="4" paint-order="stroke">U</text>`;
  const sekitar = (panas, la, lo, r, jam) => panas.filter(t => t.umur <= jam).map(t => ({...t, d: km([la, lo], [t.lat, t.lon])})).filter(t => t.d <= r);
  const kaki = m => `<div class="kaki">Sumber: titik panas NASA FIRMS (VIIRS S-NPP, NOAA-20, NOAA-21, MODIS) lewat sistem Centurisk97, kondisi per ${m.per} (deteksi satelit terakhir ${m.acuan}), keyakinan sedang dan tinggi. Target dari renlap usulan Centurisk97 versi ${esc(m.versi)} (skor hipotesis). Citra Esri World Imagery. Waktu tempuh = jarak garis lurus pada ${ang(V)} km/jam tanpa angin, ditambah orbit ${ORBIT} menit tiap CP. Haluan sejati (true), belum dikoreksi variasi magnet. Titik panas adalah deteksi satelit, bukan pengukuran api di lapangan. Usulan lokasi untuk dilihat, bukan perintah terbang: keputusan terbang pada PIC dan komando.</div>`;
  const kepala = (ey, judul, m, kanan) => `<div class="kepala"><div><div class="ey">${esc(ey)}</div><h1>${esc(judul)}</h1></div><div class="per">${kanan || `Kondisi per<b>${m.per}</b>`}</div></div>`;

  function susun(b, jenis) {
    const cp = (b[jenis] || []).map(c => ({...c, kode: `${jenis === "wb" ? "WB" : "CP"}${c.urut}`}));
    const base = {kode: b.id, lat: b.lat, lon: b.lon, tempat: `Base ${b.nama}`};
    const t = [base, ...cp, {...base, tempat: `kembali ke Base ${b.nama}`}], leg = [];
    let kk = 0, km2 = 0; t[0] = {...t[0], kum_km: 0, kum_mnt: 0};
    for (let i = 1; i < t.length; i++) {
      const a = t[i - 1], c = t[i], j = km([a.lat, a.lon], [c.lat, c.lon]), mnt = j / V * 60;
      kk += j; km2 += mnt + (i > 1 ? ORBIT : 0);
      leg.push({no: i, dari: a.kode, ke: c.kode, lat: c.lat, lon: c.lon, km: j, nm: j / NM_KM, mnt, haluan: baringan(a.lat, a.lon, c.lat, c.lon), rd: c.rd});
      t[i] = {...c, kum_km: kk, kum_mnt: km2};
    }
    return {t, leg};
  }
  const LEG = (cp) => `<div class="leg"><span><i class="m"></i>Titik panas 24 jam</span><span><i class="k"></i>24–48 jam</span><span><i class="o"></i>${cp ? "Check point" : "Check point"}</span>${cp ? "" : '<span><i class="n"></i>Base</span>'}<span class="biru">— Rute dan arah terbang</span>${cp ? `<span>Kotak ${KOTAK} × ${KOTAK} km.</span>` : ""}</div>`;

  function halBase(b, {t, leg}, panas, m, jenis) {
    const misi = jenis === "wb" ? "water bombing" : "patroli", ey = `BNPB, rencana lapangan udara, base ${b.nama} (${b.id})`, cp = t.slice(1, -1);
    const la = t.map(x => x.lat), lo = t.map(x => x.lon), W = 1100, H = 1060;
    let z = 12; while (z > 4) { const [ax, ay] = gpx(Math.max(...la), Math.min(...lo), z), [bx, by] = gpx(Math.min(...la), Math.max(...lo), z); if ((bx - ax) * 1.25 <= W && (by - ay) * 1.25 <= H) break; z--; }
    const cla = (Math.min(...la) + Math.max(...la)) / 2, clo = (Math.min(...lo) + Math.max(...lo)) / 2, {P, img} = bingkai(cla, clo, z, W, H);
    const dalam = panas.filter(x => { const [px, py] = P(x.lat, x.lon); return px >= 0 && px <= W && py >= 0 && py <= H; });
    const m1 = mpp(cla, z), bar = [5, 10, 20, 25, 50, 100].find(k => k * 1000 / m1 >= W * .12) || 100;
    const svg = `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice">${PANAH}${img}${rute(P, t)}${titikSvg(P, dalam, 6)}${penanda(P, t[0], 15, true, `Base ${b.nama}`)}${cp.map(c => penanda(P, c, 13)).join("")}${skala(W, H, m1, bar)}${utara(W)}</svg>`;
    const n24 = cp.map(c => sekitar(panas, c.lat, c.lon, RADIUS, 24).length), tot = t[t.length - 1];
    const baris = t.map(x => { const isb = x.kode === b.id, n = isb ? "–" : ang(sekitar(panas, x.lat, x.lon, RADIUS, 24).length);
      return `<tr><td><span class="bul${isb ? " b" : ""}">${isb ? "B" : x.urut}</span></td><td><b>${esc(x.kode)}</b> ${esc(x.tempat || "")}</td><td class="n"><a href="${gmaps(x.lat, x.lon)}">${x.lat.toFixed(4)}, ${x.lon.toFixed(4)}</a></td><td class="n jingga">${n}</td><td class="n">${ang(x.kum_km)} km</td><td class="n">+${ang(x.kum_mnt)} mnt</td></tr>`; }).join("");
    const kpi = `<div class="kpi"><div class="o"><b>${ang(n24.reduce((a, c) => a + c, 0))}</b><span>titik panas 24 jam dalam ${RADIUS} km dari check point</span></div><div><b>${ang(cp.length)} ${jenis === "wb" ? "target" : "check point"}</b><span>${jenis === "wb" ? "sortie water bombing ke temuan lapangan terkonfirmasi" : "sortie patroli, urut tetangga terdekat dari base"}</span></div><div><b>± ${ang(tot.kum_km)} km</b><span>loop base, semua CP, kembali ke base (${ang(tot.kum_km / NM_KM)} NM)</span></div><div class="o"><b>± ${ang(tot.kum_mnt)} menit</b><span>pada ${ang(V)} km/jam, termasuk orbit ${ORBIT} menit tiap CP</span></div></div>`;
    const h1 = `<section class="hal">${kepala(ey, `Rencana rute udara ${misi} karhutla dari ${b.nama}`, m)}${kpi}<div class="dua"><div><div class="peta tinggi">${svg}</div>${LEG(false)}</div><div class="kartu"><h3>Urutan check point, klik koordinat untuk Google Maps</h3><table><thead><tr><th></th><th>Titik</th><th class="n">Koordinat</th><th class="n">Titik panas</th><th class="n">Jarak tempuh</th><th class="n">Waktu</th></tr></thead><tbody>${baris}</tbody></table><p class="fnd">Titik panas = deteksi 24 jam dalam radius ${RADIUS} km dari CP. Jarak dan waktu kumulatif sejak lepas landas.</p></div></div>${kaki(m)}</section>`;
    const lb = leg.map(x => `<tr><td>${x.no}</td><td class="nw"><b>${esc(x.dari)}</b> ke <b>${esc(x.ke)}</b></td><td class="mono">${dms(x.lat, x.lon)}</td><td class="mono bebas">${esc(x.rd || "–")}</td><td class="n"><a href="${gmaps(x.lat, x.lon)}">${x.lat.toFixed(4)}, ${x.lon.toFixed(4)}</a></td><td class="n"><b>${hal3(x.haluan)}</b></td><td class="n">${ang(x.km, 1)} km</td><td class="n">${ang(x.nm, 1)} NM</td><td class="n">${x.mnt < 1 ? "&lt; 1" : ang(x.mnt)} mnt</td></tr>`).join("")
      + `<tr><td></td><td><b>Total</b></td><td></td><td></td><td></td><td></td><td class="n"><b>${ang(leg.reduce((a, x) => a + x.km, 0))} km</b></td><td class="n"><b>${ang(leg.reduce((a, x) => a + x.nm, 0))} NM</b></td><td class="n"><b>${ang(leg.reduce((a, x) => a + x.mnt, 0))} mnt</b></td></tr>`;
    const alasan = cp.map(c => { const a = c.alasan || {}, bag = [];
      if (a.titik_baru) bag.push(`${ang(a.titik_baru)} titik baru lintasan terakhir`); if ((a.menahun_hari || 0) > 1) bag.push(`api ${ang(a.menahun_hari)} hari`);
      if (a.permukiman_km != null) bag.push(`permukiman ${ang(a.permukiman_km, 1)} km`); if (a.gambut) bag.push("di gambut");
      if (c.jenis === "wb") bag.unshift(`water bombing: temuan lapangan ${esc(a.temuan || "")} oleh ${esc(a.oleh || "")}${a.luas_klaim_ha ? `, klaim ${ang(a.luas_klaim_ha)} ha` : ""}`);
      return `<li><b>${esc(c.kode)}</b> ${esc(c.tempat || "")}: ${bag.join(", ") || "titik panas 24–48 jam, belum ada temuan lapangan"}.</li>`; }).join("");
    const pm = cp.filter(c => c.udara?.pm25_maks != null).map(c => [c.udara.pm25_maks, c.kode]).sort((a, b) => b[0] - a[0])[0];
    const h2 = `<section class="hal">${kepala(ey, `Flight plan ${misi}: leg, haluan, dan jarak`, m)}<div class="dua lebar"><div class="kartu"><h3>Tabel leg untuk pilot</h3><table><thead><tr><th>Leg</th><th>Dari ke</th><th>Koordinat tujuan (DMS)</th><th>Radial/jarak VOR</th><th class="n">Google Maps</th><th class="n">Haluan sejati</th><th class="n">Jarak</th><th class="n">NM</th><th class="n">Waktu</th></tr></thead><tbody>${lb}</tbody></table><p class="fnd">Waktu leg pada ${ang(V)} km/jam tanpa angin, belum termasuk orbit ${ORBIT} menit di tiap CP. Radial/jarak dari VOR ${esc(b.vor || b.id)}, deklinasi ${ang(b.deklinasi_timur || 0, 1)}° timur (perkiraan tetap). Berkas KML dan GPX tersedia di layar Operasi.</p></div><div class="tumpuk"><div class="kartu"><h3>Kenapa check point ini</h3><ul>${alasan}</ul></div><div class="kartu"><h3>Yang perlu diputuskan</h3><ol><li>Jenis pesawat dan kecepatan jelajah: hitungan memakai ${ang(V)} km/jam; pilot menyesuaikan.</li><li>Urutan CP boleh diubah komando; jarak dan waktu dihitung ulang.</li><li>Udara pagi (06–10 WIB): ${pm ? `PM2,5 prakiraan tertinggi ${ang(pm[0])} µg/m³ di ${esc(pm[1])}` : "data PM2,5 tidak tersedia"}.</li><li>Ketinggian orbit dan izin wilayah udara (NOTAM) ditetapkan pilot dan Baseops.</li></ol></div></div></div>${kaki(m)}</section>`;
    return h1 + h2;
  }

  function halCp(b, t, i, panas, m) {
    const c = t[i], seb = t[i - 1], ses = t[i + 1], z = 13, m1 = mpp(c.lat, z), W = Math.round(KOTAK * 1000 / m1), {P, img} = bingkai(c.lat, c.lon, z, W, W), r = RADIUS * 1000 / m1;
    const dalam = panas.filter(x => { const [px, py] = P(x.lat, x.lon); return px >= 0 && px <= W && py >= 0 && py <= W; });
    const svg = `<svg viewBox="0 0 ${W} ${W}" preserveAspectRatio="xMidYMid slice">${PANAH}${img}${rute(P, t)}<circle cx="${W / 2}" cy="${W / 2}" r="${r.toFixed(1)}" fill="none" stroke="#fff" stroke-width="2.5" stroke-dasharray="9 7"/><text x="${W / 2}" y="${(W / 2 - r - 10).toFixed(1)}" text-anchor="middle" font-size="20" fill="#fff" stroke="#0b2545" stroke-width="4" paint-order="stroke" font-family="Inter,Arial">radius pandang ${RADIUS} km</text>${titikSvg(P, dalam, 6)}${t.slice(1, -1).map(x => penanda(P, x, x === c ? 17 : 13)).join("")}${skala(W, W, m1, 2)}${utara(W)}</svg>`;
    const dekat = sekitar(panas, c.lat, c.lon, RADIUS, 24).sort((a, b) => (b.frp || 0) - (a.frp || 0) || a.d - b.d), d48 = sekitar(panas, c.lat, c.lon, RADIUS, 48).length - dekat.length;
    const malam = dekat.filter(x => { const h = wib(x.t).getUTCHours(); return h < 6 || h >= 18; }).length;
    const tb = dekat.slice(0, 12).map(x => `<tr><td class="n"><a href="${gmaps(x.lat, x.lon)}">${x.lat.toFixed(4)}, ${x.lon.toFixed(4)}</a></td><td>${jamWib(x.t)}</td><td>${esc(x.sat)}</td><td class="n">${x.frp != null ? ang(x.frp, 1) : "–"}</td><td class="n">${ang(x.d, 1)} km</td></tr>`).join("")
      || '<tr><td colspan="5">Tidak ada titik panas 24 jam dalam radius ini; target dari titik 24–48 jam atau api menahun.</td></tr>';
    const al = c.alasan || {}, wb = c.jenis === "wb";
    const kanan = (wb ? `<span class="pil biru">Water bombing: ${esc(al.temuan || "")} oleh ${esc(al.oleh || "")}${al.luas_klaim_ha ? `, ${ang(al.luas_klaim_ha)} ha` : ""}</span>` : "") + `<span class="pil">${ang(dekat.length)} titik panas 24 jam</span><span class="pil abu">+${ang(c.kum_mnt)} menit dari base</span>`;
    return `<section class="hal"><div class="kepala"><div class="nocp"><span class="bul">${c.urut}</span><div><div class="ey">${c.kode.startsWith("WB") ? "Target water bombing" : "Check point"} ${c.urut} dari ${t.length - 2}, rute udara base ${esc(b.nama)}</div><h1>${esc(c.tempat || c.kode)}</h1></div></div><div class="per">${kanan}</div></div>
      <div class="dua cp"><div><div class="peta kotak">${svg}</div>${LEG(true)}</div><div><div class="kartu"><h3>Koordinat check point, klik untuk Google Maps</h3><div class="besar"><a href="${gmaps(c.lat, c.lon)}">${c.lat.toFixed(4)}, ${c.lon.toFixed(4)}</a></div><span class="mono b">${dms(c.lat, c.lon)}</span>${c.rd ? `<span class="mono b">${esc(c.rd)}</span>` : ""}<a class="tbl" href="${gmaps(c.lat, c.lon)}">Buka di Google Maps</a></div>
      <div class="mini"><div>Masuk dari ${esc(seb.kode)}<br><b>${hal3(baringan(seb.lat, seb.lon, c.lat, c.lon))}</b>, ${ang(km([seb.lat, seb.lon], [c.lat, c.lon]), 1)} km</div><div>Lanjut ke ${esc(ses.kode)}<br><b>${hal3(baringan(c.lat, c.lon, ses.lat, ses.lon))}</b>, ${ang(km([c.lat, c.lon], [ses.lat, ses.lon]), 1)} km</div></div>
      <div class="kartu"><h3>Titik panas di sekitar CP (${RADIUS} km), FRP terbesar dulu</h3><table><thead><tr><th class="n">Koordinat</th><th>WIB</th><th>Satelit</th><th class="n">FRP, MW</th><th class="n">Dari CP</th></tr></thead><tbody>${tb}</tbody></table><p class="fnd">${ang(malam)} dari ${ang(dekat.length)} titik terdeteksi malam hari. Titik panas 24–48 jam di sekitar CP: ${ang(d48)}. Titik panas terakhir di target: ${esc(c.terakhir?.jam_wib || "–")} WIB.</p></div></div></div>${kaki(m)}</section>`;
  }

  async function json(u) { const r = await fetch(u, {cache: "no-cache"}); if (!r.ok) throw new Error(u + " " + r.status); return r.json(); }
  async function renlap(tgl, versi) {
    if (tgl && versi) return [await json(`/data/operasi/renlap_${tgl}_${versi}.json`), tgl, versi];
    const hari = Date.now() + 7 * 36e5;
    for (let i = 0; i < 3; i++) { const d = new Date(hari - i * 864e5).toISOString().slice(0, 10);
      for (const v of i ? ["malam", "pagi"] : ["pagi", "malam"]) { try { return [await json(`/data/operasi/renlap_${d}_${v}.json`), d, v]; } catch {} } }
    throw new Error("renlap 3 hari terakhir tidak ditemukan");
  }
  async function titik(kini) {
    let d; try { d = await json("/api/titik"); } catch { d = await json("/data/hotspot72.json"); }
    const ac = new Date(d.acuan), k = Object.fromEntries(d.kolom.map((n, i) => [n, i]));
    return d.baris.map(b => { const t = new Date(ac.getTime() + b[k.jam] * 36e5); return {lat: b[k.lat], lon: b[k.lon], t, umur: (kini - t) / 36e5, sat: SAT[b[k.sensor]] || b[k.sensor], frp: "frp" in k ? b[k.frp] : null, yk: b[k.keyakinan]}; })
      .filter(x => x.umur >= 0 && x.umur <= 48 && x.yk >= 1);
  }

  async function mulai() {
    const q = new URLSearchParams(location.search), isi = $("#isi"), pesan = $("#pesan");
    try {
      const [d, tgl, versi] = await renlap(q.get("tgl"), q.get("versi"));
      const kini = new Date(d.dibuat), panas = await titik(kini);
      const acuan = panas.length ? new Date(Math.max(...panas.map(x => x.t))) : kini;
      const m = {per: tglPanjang(kini), acuan: tglPanjang(acuan), versi};
      const bases = d.base.filter(b => (b.patroli || []).length || (b.wb || []).length);
      const pilih = q.get("base") && bases.some(b => b.id === q.get("base")) ? q.get("base") : bases[0]?.id;
      $("#base").innerHTML = bases.map(b => `<option value="${esc(b.id)}"${b.id === pilih ? " selected" : ""}>${esc(b.nama)} (${esc(b.icao || b.id)})</option>`).join("");
      $("#info").textContent = `Renlap ${versi} ${tgl}`;
      const b = bases.find(x => x.id === pilih);
      if (!b) { pesan.textContent = "Tidak ada base bertarget pada renlap ini."; return; }
      document.title = `Renlap ${b.nama} ${tgl} ${versi}`;
      let h = "";
      for (const jenis of ["patroli", "wb"]) { if (!(b[jenis] || []).length) continue; const r = susun(b, jenis);
        h += halBase(b, r, panas, m, jenis) + r.t.slice(1, -1).map((_, i) => halCp(b, r.t, i + 1, panas, m)).join(""); }
      isi.innerHTML = h; pesan.hidden = true;
    } catch (e) { pesan.textContent = "Renlap belum bisa dimuat: " + e.message; }
  }
  $("#base").addEventListener("change", e => { const q = new URLSearchParams(location.search); q.set("base", e.target.value); location.search = q.toString(); });
  $("#cetak").addEventListener("click", () => window.print());
  mulai();
})();
