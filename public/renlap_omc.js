/* Renlap OMC per zona semai (/renlap-omc?zona=YYYYMMDDHH-C), terpisah dari renlap patroli dan water bombing (pemilik 14 Nov 2026).
   Data: GET /api/operasi/semai/berkas/arsip/<putaran>.json (semai.py, rute ALGORITMA §7c dan ketinggian/bahan/jumlah §7b).
   Halaman 1: peta rute di atas citra Esri, sasaran, ketinggian, bahan, jumlah. Halaman 2: tabel leg dan check point untuk pilot.
   Layar tidak menghitung ulang rute; KML dan GPX dibangun dari titik yang sama. Usulan model, bukan perintah terbang (KEPUTUSAN D8). */
(() => {
  "use strict";
  const {gpx, bingkai} = window.CitraUbin;
  const $ = s => document.querySelector(s), esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"})[c]);
  const BULAN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
  const ang = (x, d = 0) => Number(x).toLocaleString("id-ID", {minimumFractionDigits: d, maximumFractionDigits: d});
  const hal3 = x => String(Math.round(x) % 360 || 360).padStart(3, "0") + "°";
  const gmaps = (la, lo) => `https://www.google.com/maps/search/?api=1&query=${la.toFixed(5)},${lo.toFixed(5)}`;
  const rad = d => d * Math.PI / 180;
  const tglPanjang = iso => { const w = new Date(Date.parse(iso) + 7 * 36e5); return `${w.getUTCDate()} ${BULAN[w.getUTCMonth()]} ${w.getUTCFullYear()}`; };
  const putaranTeks = id => `${+id.slice(6, 8)} ${BULAN[+id.slice(4, 6) - 1]} ${id.slice(8, 10)}z`;

  /* fokus: hanya titik masuk sampai kaki tabur dan titik hujan (peta sisipan pola tabur) */
  function peta(z, fokus = false, W = 1100, H = 1060) {
    const r = z.rute, t = r.cp, semua = [...(fokus ? t.slice(1, -1) : t), z.hujan, z].filter(x => x?.lat != null);
    const la = semua.map(x => x.lat), lo = semua.map(x => x.lon);
    let zm = 13; while (zm > 4) { const [ax, ay] = gpx(Math.max(...la), Math.min(...lo), zm), [bx, by] = gpx(Math.min(...la), Math.max(...lo), zm); if ((bx - ax) * 1.3 <= W && (by - ay) * 1.3 <= H) break; zm--; }
    const {P, img} = bingkai((Math.min(...la) + Math.max(...la)) / 2, (Math.min(...lo) + Math.max(...lo)) / 2, zm, W, H);
    const xy = p => P(p.lat, p.lon).map(v => v.toFixed(1));
    const garis = r.leg.map((g, i) => { const [x1, y1] = xy(t[i]), [x2, y2] = xy(t[i + 1]);
      return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${g.tabur ? "#f97316" : "#38bdf8"}" stroke-width="${g.tabur ? 7 : 4}" stroke-linecap="round"/>`; }).join("");
    const cp = t.slice(0, -1).map((c, i) => { const [x, y] = xy(c), base = i === 0;
      return `<a href="${gmaps(c.lat, c.lon)}" target="_blank"><title>${esc(c.kode)} ${esc(c.nama)}: buka Google Maps</title><circle cx="${x}" cy="${y}" r="${base ? 16 : 13}" fill="${base ? "#0b2545" : "#e8590c"}" stroke="#fff" stroke-width="3"/><text x="${x}" y="${(+y + 5).toFixed(1)}" text-anchor="middle" font-size="${base ? 14 : 13}" font-weight="800" fill="#fff">${base ? "B" : i}</text></a>`; }).join("");
    const [hx, hy] = z.hujan ? xy(z.hujan) : [null, null], [zx, zy] = xy(z);
    const hujan = z.hujan ? `<rect x="${hx - 10}" y="${hy - 10}" width="20" height="20" transform="rotate(45 ${hx} ${hy})" fill="#0284c7" stroke="#fff" stroke-width="3"><title>Titik hujan perkiraan ${z.hujan.tau_menit} menit sesudah semai</title></rect>` : "";
    return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice">${img}<circle cx="${zx}" cy="${zy}" r="46" fill="none" stroke="#fff" stroke-width="3" stroke-dasharray="8 6"/>${garis}${hujan}${cp}</svg>`;
  }

  function halaman(d, z) {
    const r = z.rute, ey = `BNPB, rencana operasi modifikasi cuaca, zona semai ${z.huruf}, putaran ECMWF ${putaranTeks(z.id)}`;
    const kepala = judul => `<div class="kepala"><div><div class="ey">${esc(ey)}</div><h1>${esc(judul)}</h1></div><div class="per">Jendela terbang<b>${esc(tglPanjang(z.jendela[0]))}, ${esc(z.jendela_teks)}</b></div></div>`;
    const j = z.jumlah || {}, bh = z.bahan || {}, base = z.base || {};
    const kpi = `<div class="kpi"><div class="o"><b>${esc(z.ketinggian?.kaki ? `${ang(z.ketinggian.kaki)} kaki` : "–")}</b><span>ketinggian semai, ${esc(z.ketinggian?.kaki ? "dasar awan perkiraan" : z.ketinggian?.teks || "belum tersedia")}</span></div>`
      + `<div><b>${esc(bh.usul || "–")}</b><span>bahan usulan${bh.inversi ? ", ada inversi berasap" : ""}</span></div>`
      + `<div><b>${ang(r.nm, 1)} NM</b><span>satu sortie pulang pergi, sekitar ${ang(r.menit)} menit pada ${ang(r.jelajah_kt)} knot</span></div>`
      + `<div><b>${ang(j.sortie ?? 1)} sortie</b><span>${esc(j.muatan || "muatan per sortie dari armada")}; ${esc(j.armada_label || "")}</span></div></div>`;
    const sasaran = [
      ["Tempat semai", `<a href="${gmaps(z.lat, z.lon)}">${z.lat.toFixed(4)}, ${z.lon.toFixed(4)}</a>`],
      ["Target daerah", esc([z.kota, z.prov].filter(Boolean).join(", ")) + (z.cluster ? `, cluster api ${esc(z.cluster)}` : "")],
      ["Titik hujan", z.hujan ? `<a href="${gmaps(z.hujan.lat, z.hujan.lon)}">${z.hujan.lat.toFixed(2)}, ${z.hujan.lon.toFixed(2)}</a>, sekitar ${ang(z.hujan.tau_menit)} menit sesudah semai, tergeser angin pengarah` : "–"],
      ["Base", `${esc(base.nama || "–")}${base.icao ? ` (${esc(base.icao)})` : ""}, ${ang(base.km || 0)} km${base.terdaftar ? "" : ", bandara terdekat, belum terdaftar sebagai base"}`],
      ["Angin pengarah", z.masukan ? `dari ${esc(z.masukan.angin_dari)}, ${ang(z.masukan.angin_kmj)} km/j; kaki tabur melintang angin` : "–"],
      ["Awan", z.masukan ? `tutupan awan rendah ${ang(z.masukan.lcc * 100)}%, MUCAPE ${ang(z.masukan.mucape)} J/kg, cairan awan ${ang(z.masukan.tclw, 2)} kg/m², suhu dasar awan ${ang(z.masukan.tdasar, 1)} °C` : "–"],
      ["Skor zona", `${ang(z.skor, 2)} (awan ${ang(z.Q, 2)}, api ${ang(z.D, 2)}, jarak kota ${ang(z.T, 2)})`],
    ].map(([k, v]) => `<dt>${esc(k)}</dt><dd>${v}</dd>`).join("");
    const h1 = `<section class="hal">${kepala(`Rute OMC zona ${z.huruf}: ${[z.kota, z.prov].filter(Boolean).join(", ")}`)}${kpi}<div class="dua"><div><div class="peta tinggi">${peta(z)}</div>`
      + `<div class="leg"><span><i class="n"></i>Base</span><span><i class="o"></i>Check point</span><span style="color:#f97316">━ kaki tabur</span><span class="biru">━ jalur terbang</span><span class="biru">◆ titik hujan perkiraan</span><span>◌ zona semai</span></div></div>`
      + `<div class="tumpuk"><div class="kartu"><h3>Sasaran dan muatan</h3><dl class="sasaran">${sasaran}</dl></div>`
      + `<div class="kartu"><h3>Pola tabur di tempat semai</h3><div class="peta sisip">${peta(z, true, 1100, 520)}</div></div>`
      + `</div></div>`
      + `<div class="kaki">Data ECMWF IFS Open Data, CC BY 4.0. Rute dan haluan dihitung otomatis (scripts/operasi/semai.py); deklinasi magnet perkiraan ${ang(r.deklinasi_timur, 1)}° timur.</div></section>`;
    const tCp = r.cp.map((c, i) => `<tr><td><span class="bul${i === 0 || i === r.cp.length - 1 ? " b" : ""}">${i === 0 || i === r.cp.length - 1 ? "B" : i}</span></td><td><b>${esc(c.kode)}</b> ${esc(c.nama)}</td><td class="mono">${esc(c.dms)}</td><td class="n"><a href="${gmaps(c.lat, c.lon)}">${c.lat.toFixed(4)}, ${c.lon.toFixed(4)}</a></td><td class="mono">${c.vor ? `VOR ${esc(c.vor)} ${String(c.radial).padStart(3, "0")}/${ang(c.jarak_vor_nm, 1)} NM` : "–"}</td></tr>`).join("");
    let kum = 0;
    const tLeg = r.leg.map((g, i) => { kum += g.menit; return `<tr class="${g.tabur ? "tabur" : ""}"><td>${i + 1}</td><td class="nw"><b>${esc(g.dari)}</b> ke <b>${esc(g.ke)}</b></td><td>${g.tabur ? "tabur bahan" : i === 0 ? "berangkat" : i === r.leg.length - 1 ? "kembali" : "pindah"}</td><td class="n"><b>${hal3(g.haluan_benar)}</b></td><td class="n">${hal3(g.haluan_magnet)}</td><td class="n">${ang(g.nm, 1)}</td><td class="n">${ang(g.menit)} mnt</td><td class="n">+${ang(kum)} mnt</td><td class="n">${g.kaki ? `${ang(g.kaki)} kaki` : "–"}</td></tr>`; }).join("")
      + `<tr><td></td><td><b>Total</b></td><td></td><td></td><td></td><td class="n"><b>${ang(r.nm, 1)}</b></td><td class="n"><b>${ang(r.menit)} mnt</b></td><td></td><td></td></tr>`;
    const h2 = `<section class="hal">${kepala(`Flight plan OMC zona ${z.huruf}: leg, haluan, dan jarak`)}<div class="tumpuk"><div class="kartu"><h3>Tabel leg untuk pilot</h3><table><thead><tr><th>Leg</th><th>Dari ke</th><th>Kegiatan</th><th>Haluan sejati</th><th>Haluan magnet</th><th>NM</th><th>Waktu</th><th>Kumulatif</th><th>Ketinggian</th></tr></thead><tbody>${tLeg}</tbody></table></div>`
      + `<div class="kartu"><h3>Check point</h3><table><thead><tr><th></th><th>Check point</th><th>Koordinat (DMS)</th><th>Google Maps</th><th>Radial/jarak VOR</th></tr></thead><tbody>${tCp}</tbody></table></div><div class="kartu"><h3>Catatan</h3><ul><li>Usulan dari model prakiraan ECMWF IFS 0,1 derajat, bukan perintah terbang; keputusan pada posko TMC dan BMKG.</li>`
      + `<li>Semai higroskopis di dasar awan dekat arus naik. Peluang hujan bergantung pada awan nyata saat terbang; periksa citra Himawari sebelum berangkat.</li>`
      + `<li>Pola tabur dua kaki ${ang(r.leg[2].nm)} NM berjarak ${ang(r.leg[3].nm)} NM adalah bawaan sementara sampai BMKG memberi pola baku.</li></ul></div></div>`
      + `<div class="kaki">Waktu tempuh pada kecepatan jelajah ${ang(r.jelajah_kt)} knot tanpa angin; menit tabur di dalam jendela ${esc(z.jendela_teks)}. Ketinggian leg berangkat dan kembali ditentukan pilot.</div></section>`;
    return h1 + h2;
  }

  function unduh(z, f) {
    const t = z.rute.cp, nama = `Renlap OMC zona ${z.huruf} ${z.id.slice(0, 10)}`, x = s => esc(s);
    const isi = f === "gpx"
      ? `<?xml version="1.0" encoding="UTF-8"?>\n<gpx version="1.1" creator="Centurisk97" xmlns="http://www.topografix.com/GPX/1/1"><metadata><name>${x(nama)}</name></metadata>\n${t.slice(0, -1).map(c => `<wpt lat="${c.lat}" lon="${c.lon}"><name>${x(c.kode)} ${x(c.nama)}</name></wpt>`).join("\n")}\n<rte><name>${x(nama)}</name>${t.map(c => `<rtept lat="${c.lat}" lon="${c.lon}"><name>${x(c.kode)}</name></rtept>`).join("")}</rte></gpx>`
      : `<?xml version="1.0" encoding="UTF-8"?>\n<kml xmlns="http://www.opengis.net/kml/2.2"><Document><name>${x(nama)}</name>\n${t.slice(0, -1).map(c => `<Placemark><name>${x(c.kode)} ${x(c.nama)}</name><Point><coordinates>${c.lon},${c.lat},0</coordinates></Point></Placemark>`).join("\n")}\n<Placemark><name>Rute</name><LineString><coordinates>${t.map(c => `${c.lon},${c.lat},0`).join(" ")}</coordinates></LineString></Placemark></Document></kml>`;
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([isi], {type: f === "gpx" ? "application/gpx+xml" : "application/vnd.google-earth.kml+xml"}));
    a.download = `${nama.replace(/\s+/g, "_")}.${f}`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  async function mulai() {
    const q = new URLSearchParams(location.search), minta = q.get("zona") || "";
    const putaran = /^\d{10}-[A-E]$/.test(minta) ? minta.slice(0, 10) : null;
    let d = null;
    for (const u of [putaran && `/api/operasi/semai/berkas/arsip/${putaran}.json`, "/api/operasi/semai/berkas/semai.json"].filter(Boolean)) {
      const r = await fetch(u, {credentials: "same-origin", cache: "no-cache"}).catch(() => null);
      if (r?.ok) { d = await r.json(); break; }
      if (r?.status === 403) { $("#pesan").textContent = "Renlap OMC hanya untuk akun Centurisk97, staf berperan, atau moderator. Masuk dulu lewat /admin/masuk."; return; }
    }
    const zs = (d?.zona || []).filter(z => z.rute);
    if (!zs.length) { $("#pesan").textContent = "Belum ada zona semai dengan rute pada putaran ini."; return; }
    const sel = $("#zona");
    sel.innerHTML = zs.map(z => `<option value="${esc(z.id)}">${esc(z.huruf)}, ${esc(z.prov || "")}, skor ${ang(z.skor, 2)}</option>`).join("");
    const tampil = id => { const z = zs.find(x => x.id === id) || zs[0]; sel.value = z.id; history.replaceState(null, "", `?zona=${encodeURIComponent(z.id)}`);
      $("#info").textContent = `${putaranTeks(z.id)}, ${z.jendela_teks}`; $("#isi").innerHTML = halaman(d, z); $("#pesan").hidden = true; document.title = `Renlap OMC zona ${z.huruf}, Centurisk97`; return z; };
    let z = tampil(minta);
    sel.addEventListener("change", () => { z = tampil(sel.value); });
    $("#kml").addEventListener("click", () => unduh(z, "kml"));
    $("#gpx").addEventListener("click", () => unduh(z, "gpx"));
    $("#cetak").addEventListener("click", () => window.print());
  }
  mulai().catch(e => { $("#pesan").textContent = "Renlap OMC gagal dimuat: " + e.message; });
})();
