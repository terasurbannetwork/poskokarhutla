/* Layar operasi lapangan per tugas api (docs/bnpb/RENCANA-OPERASI-LAPANGAN.md L4-L13), dibuka dari panel tugas (instansi_tugaskan.js) di /instansi dan /admin/instansi.
   window.InstansiOps.buka(t, {admin, pembuka}): t = tugas {id, lat, lon, kab, kec, status}; admin = moderator/staf (boleh menyetujui permintaan, unggah TMAT).
   API: /api/ops/* (src/operasi_lapangan.js), dibaca apa adanya. Peta = SVG sendiri tanpa ubin dan tanpa pustaka (CSP halaman ini tidak mengizinkan CDN peta di admin, dan jejak regu sudah digambar begitu).
   CSP: tanpa gaya/skrip inline; semua teks data lewat esc(). INP: ketukan tab menandai chrome dulu, isi digambar sesudah frame (nanti).
   ponytail: peta tanpa zoom/geser (muat semua objek dalam satu bingkai, tugas puluhan km paling jauh); tambah zoom bila ada keluhan lapangan. */
(() => {
  "use strict";
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c]));
  const MENIT = 60e3, JAM = 36e5;
  const ang = (n, d = 0) => Number.isFinite(Number(n)) && n !== null ? Number(n).toLocaleString("id-ID", {maximumFractionDigits: d}) : "-";
  const kmF = n => ang(n, 1) + " km", haF = n => ang(n, n < 10 ? 1 : 0) + " ha";
  const tgl = ms => ms == null ? "-" : new Date(ms).toLocaleString("id-ID", {day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta"}).replace(",", "") + " WIB";
  const lamaF = m => m == null ? "belum ada" : m < 120 ? `${ang(m)} menit` : `${ang(Math.floor(m / 60))} jam${m % 60 ? ` ${ang(m % 60)} menit` : ""}`;
  const wibLokal = ms => new Date(ms + 7 * JAM).toISOString().slice(0, 16), dariWib = v => Date.parse(v + ":00+07:00");
  const nanti = fn => window.nanti ? window.nanti(fn) : (() => { let ok = false; const go = () => { if (!ok) { ok = true; fn(); } }; requestAnimationFrame(() => requestAnimationFrame(go)); setTimeout(go, 120); })();
  const angkaIn = v => { const s = String(v ?? "").trim().replace(",", "."), x = Number(s); return s === "" || !Number.isFinite(x) ? null : x; };
  const kapital = s => String(s).replace(/_/g, " ").replace(/^./, c => c.toUpperCase());

  const IK = {
    air: "M12 3c3 4 6 7 6 11a6 6 0 0 1-12 0c0-4 3-7 6-11z", sungai: "M3 8c3-2 6 2 9 0s6 2 9 0M3 13c3-2 6 2 9 0s6 2 9 0M3 18c3-2 6 2 9 0s6 2 9 0",
    kanal: "M6 4v16M18 4v16M9 9c2-1 4 1 6 0M9 15c2-1 4 1 6 0", embung: "M3 15c0-4 4-7 9-7s9 3 9 7-4 5-9 5-9-1-9-5z", sumur_bor: "M12 3v12M8 21l4-6 4 6M9 7h6",
    sekat_kanal: "M5 5v14M12 5v14M19 5v14M3 12h18", hidran: "M9 20V9a3 3 0 0 1 6 0v11M7 20h10M6 12H4M20 12h-2M10 5V3h4v2", lainnya: "M8 12a4 4 0 1 0 8 0 4 4 0 1 0-8 0",
    rencana: "M9 4h6v3H9zM6 5h12v16H6zM9 12h6M9 16h6", heli: "M4 6h16M12 6v4M7 10h8a4 4 0 0 1 4 4v2H8a3 3 0 0 1-3-3zM6 19h12", linimasa: "M12 3v18M8 7h4M12 12h4M8 17h4",
    drone: "M5 5l4 4M19 5l-4 4M5 19l4-4M19 19l-4-4M10 10h4v4h-4z", patroli: "M12 21s7-6 7-11a7 7 0 0 0-14 0c0 5 7 11 7 11zM10 10a2 2 0 1 0 4 0 2 2 0 1 0-4 0", tmat: "M3 19h18M7 19V9M12 19V5M17 19v-7",
    tutup: "M6 6l12 12M18 6L6 18", segar: "M20 12a8 8 0 1 1-2.3-5.7M20 4v5h-5", cetak: "M7 9V4h10v5M7 17H5v-6h14v6h-2M8 14h8v6H8z", cek: "M5 12.5l4.5 4.5L19 7.5", sedia: "M12 3v9m0 0l-3-3m3 3l3-3M5 21h14", lokasi: "M12 3v4M12 17v4M3 12h4M17 12h4M9 12a3 3 0 1 0 6 0 3 3 0 1 0-6 0",
    awas: "M12 4l9 16H3zM12 10v4M12 17h.01", log: "M5 4h14v16H5zM8 9h8M8 13h8M8 17h5", angin: "M3 9h11a3 3 0 1 0-3-3M3 15h15a3 3 0 1 1-3 3M3 12h8"};
  const ik = (k, kls = "") => `<svg class="op-ik ${kls}" viewBox="0 0 24 24" aria-hidden="true"><path d="${IK[k] || IK.lainnya}"/></svg>`;
  const pil = (t, k = "", i = "") => `<span class="op-pil ${k}">${i ? ik(i) : ""}${esc(t)}</span>`;
  const JENIS = {sungai: "Sungai", kanal: "Kanal", embung: "Embung", sumur_bor: "Sumur bor", sekat_kanal: "Sekat kanal", hidran: "Hidran", lainnya: "Lainnya"};
  const KONDISI = {ada_air: ["Ada air", "hijau", "#1b5fa8"], kering: ["Kering", "merah", "#8a93a8"], tidak_tahu: ["Belum diketahui", "emas", "#d08a1a"]};
  const GARIS = {garis_api: ["Garis api", "#c9503a", 5], padam: ["Garis padam", "#2f7d52", 5], sektor_aktif: ["Sektor aktif", "#e8743b", 3], sektor_dingin: ["Sektor dingin", "#1b5fa8", 3]};
  const POMPA = {tekanan_tinggi: "Tekanan tinggi (Waterax Mark-3)", jinjing_ringan: "Jinjing ringan (Mini-Striker)", debit_besar: "Debit besar (Honda WB30)", portabel_besar: "Portabel besar (Tohatsu VC52AS)"};
  const SELANG = {"1_5": "Selang 1,5 inci", "2_5": "Selang 2,5 inci"};
  const STATUS = {diminta: ["Diminta", "emas"], disetujui: ["Disetujui", "biru"], dijadwalkan: ["Dijadwalkan", "biru"], selesai: ["Selesai", "hijau"], ditolak: ["Ditolak", "merah"], dikirim: ["Dikirim", "biru"], diterima: ["Diterima", "hijau"]};
  const AKSI = {disetujui: "Setujui", ditolak: "Tolak", dijadwalkan: "Jadwalkan", selesai: "Tandai selesai", dikirim: "Tandai dikirim", diterima: "Tandai diterima"};
  const PRIO = {rendah: "", sedang: "", tinggi: "emas", darurat: "merah"};
  const HASIL = {ada_titik: ["Masih ada titik panas", "merah", "#c9503a"], tanpa_titik: ["Tidak ada titik baru", "hijau", "#2f7d52"], menunggu: ["Menunggu data satelit", "", "#8a93a8"], tak_dinilai: ["Tidak bisa dinilai", "", "#8a93a8"]};
  const PERISTIWA = {deteksi: ["Terdeteksi", "merah"], konfirmasi: ["Konfirmasi", "biru"], isian_konfirmasi: ["Isian", "biru"], isian_kabar: ["Kabar", "biru"], penugasan: ["Penugasan", ""], berangkat: ["Berangkat", "emas"], tiba: ["Tiba", "hijau"], selesai_tugas: ["Selesai bertugas", ""],
    garis: ["Garis", "biru"], permintaan: ["Permintaan", "emas"], permintaan_status: ["Status permintaan", ""], drop: ["Drop air", "biru"], periode: ["Rencana aksi", ""], periode_status: ["Status rencana", ""], serah: ["Serah terima", ""],
    padam: ["Padam", "hijau"], muncul_lagi: ["Muncul lagi", "merah"], terverifikasi: ["Terverifikasi", "hijau"], cek_ulang: ["Cek ulang", "hijau"]};
  const ALASAN = {risiko: "Risiko harian", khg: "KHG prioritas", lainnya: "Lainnya"};
  const BARANG = ["beras", "air_mineral", "makanan_siap_saji", "selimut", "tenda", "terpal", "family_kit", "hygiene_kit", "obat", "popok_bayi", "susu_bayi", "pembalut", "masker", "genset", "lainnya"];
  const SUHU = s => s < 100 ? "#f2c14e" : s < 200 ? "#e8743b" : s < 300 ? "#c9503a" : "#7a1d12";
  const MSG503 = "Fitur operasi lapangan belum diaktifkan di server: migrasi database belum diterapkan. Hubungi admin.";

  const api = (...a) => window.Tugaskan.api(...a);   // satu pembungkus fetch, milik instansi_tugaskan.js (dimuat lebih dulu di instansi.html)
  const ket = (r, cad) => r.status === 503 ? MSG503 : r.status === 401 ? "Sesimu berakhir. Masuk lagi lalu ulangi." : r.status === 0 ? r.j.galat : r.j.galat || `${cad} (kode ${r.status}).`;
  const posisiSaya = () => new Promise((ok, no) => navigator.geolocation ? navigator.geolocation.getCurrentPosition(p => ok({lat: p.coords.latitude, lon: p.coords.longitude, akurasi: Math.round(p.coords.accuracy)}), () => no(new Error("Posisi perangkat tidak bisa dibaca. Ketuk peta untuk memilih titik.")), {enableHighAccuracy: true, timeout: 8000}) : no(new Error("Perangkat ini tidak punya GPS. Ketuk peta untuk memilih titik.")));

  let S = null;   // satu layar pada satu waktu

  /* ================= peta SVG ================= */
  const cincin = g => !g ? [] : g.type === "Polygon" ? g.coordinates : g.type === "MultiPolygon" ? g.coordinates.flat() : [];
  function titikPeta() {
    const d = S.data, t = d.tugas, P = [[t.lat, t.lon]];
    for (const c of cincin(d.kluster?.poligon)) for (const p of c) P.push([p[1], p[0]]);
    for (const p of d.penugasan) { if (p.posisi) P.push([p.posisi.lat, p.posisi.lon]); for (const j of p.jejak) P.push([j[0], j[1]]); }
    for (const g of [...d.garis, ...d.sektor]) for (const c of g.koordinat || []) P.push([c[1], c[0]]);
    for (const s of d.sumber_air) P.push([s.lat, s.lon]);
    for (const p of d.permintaan) { if (p.jenis === "heli") P.push([p.lat, p.lon]); }
    for (const x of d.drop) P.push([x.lat, x.lon]);
    for (const x of d.drone.titik) P.push([x[0], x[1]]);
    if (S.pick) P.push([S.pick.lat, S.pick.lon]);
    if (S.tmatOn) for (const s of S.tmat || []) P.push([s.lat, s.lon]);
    return P.filter(p => Number.isFinite(p[0]) && Number.isFinite(p[1]));
  }
  function proyeksi(P, W, H) {
    const pad = 40, la = P.map(p => p[0]), lo = P.map(p => p[1]), la0 = Math.min(...la), la1 = Math.max(...la), lo0 = Math.min(...lo), lo1 = Math.max(...lo);
    const k = Math.cos((la0 + la1) / 2 * Math.PI / 180), dx = Math.max((lo1 - lo0) * k, 0.006), dy = Math.max(la1 - la0, 0.006), s = Math.min((W - 2 * pad) / dx, (H - 2 * pad) / dy);
    const ox = (W - dx * s) / 2 + (dx - (lo1 - lo0) * k) * s / 2, oy = (H - dy * s) / 2 + (dy - (la1 - la0)) * s / 2;
    return {W, H, s, X: lon => ox + (lon - lo0) * k * s, Y: lat => H - (oy + (lat - la0) * s), balik: (x, y) => ({lon: lo0 + (x - ox) / (k * s), lat: la0 + (H - y - oy) / s})};
  }
  const f1 = n => n.toFixed(1);
  function gambarPeta() {
    const el = S.wadah.querySelector("#opPeta"); if (!el || !S.data) return;
    const W = Math.max(280, el.clientWidth), H = Math.max(260, el.clientHeight), d = S.data, t = d.tugas, pr = S.proj = proyeksi(titikPeta(), W, H), {X, Y} = pr;
    const xy = p => `${f1(X(p[0]))},${f1(Y(p[1]))}`, g = [];
    for (const c of cincin(d.kluster?.poligon)) g.push(`<polygon points="${c.map(xy).join(" ")}" fill="#e8743b" fill-opacity=".14" stroke="#e8743b" stroke-width="2" stroke-dasharray="6 4"><title>Poligon kluster titik panas</title></polygon>`);
    for (const x of [...d.sektor, ...d.garis]) {
      const [nama, w, tebal] = GARIS[x.jenis] || ["Garis", "#14213d", 3], ps = (x.koordinat || []).map(xy).join(" "), info = `${nama}, ${kmF(x.panjang_km)}${x.luas_ha != null ? `, ${haF(x.luas_ha)}` : ""}`;
      g.push(x.tertutup ? `<polygon points="${ps}" fill="${w}" fill-opacity=".2" stroke="${w}" stroke-width="${tebal}" stroke-linejoin="round"><title>${esc(info)}</title></polygon>`
        : `<polyline points="${ps}" fill="none" stroke="${w}" stroke-width="${tebal}" stroke-linecap="round" stroke-linejoin="round"><title>${esc(info)}</title></polyline>`);
    }
    if (S.selang) {   // selang dari sumber ke titik api, pompa tiap panjang satu segmen
      const a = S.selang.sumber, h = S.selang.hasil, n = h.pompa, fr = h.jarak_selang_m > 0 ? h.panjang_segmen_m / h.jarak_selang_m : 1;
      g.push(`<line x1="${f1(X(a.lon))}" y1="${f1(Y(a.lat))}" x2="${f1(X(t.lon))}" y2="${f1(Y(t.lat))}" stroke="#1b5fa8" stroke-width="3" stroke-dasharray="8 5"><title>Rencana selang ${ang(h.jarak_selang_m)} m</title></line>`);
      for (let i = 0; i < n; i++) { const q = Math.min(1, i * fr); g.push(`<rect x="${f1(X(a.lon + (t.lon - a.lon) * q) - 6)}" y="${f1(Y(a.lat + (t.lat - a.lat) * q) - 6)}" width="12" height="12" rx="3" fill="#0b2545" stroke="#fff" stroke-width="2"><title>Pompa ${i + 1}</title></rect>`); }
    }
    if (S.tmatOn) for (const s of S.tmat || []) g.push(`<g transform="translate(${f1(X(s.lon))},${f1(Y(s.lat))})"><rect x="-13" y="-8" width="26" height="16" rx="4" fill="#0f766e" stroke="#fff" stroke-width="1.5"/><text y="4" text-anchor="middle" font-size="10" font-weight="700" fill="#fff" font-family="system-ui,sans-serif">${esc(ang(s.tmat_cm))}</text><title>${esc(`TMAT ${s.stasiun}: ${ang(s.tmat_cm)} cm`)}</title></g>`);
    for (const x of d.drone.titik) g.push(`<circle cx="${f1(X(x[1]))}" cy="${f1(Y(x[0]))}" r="3.5" fill="${SUHU(x[2])}" fill-opacity=".9"><title>${esc(`Drone ${ang(x[2])} derajat C`)}</title></circle>`);
    for (const p of d.penugasan) {
      if (p.jejak.length > 1) g.push(`<polyline points="${p.jejak.map(j => `${f1(X(j[1]))},${f1(Y(j[0]))}`).join(" ")}" fill="none" stroke="#1b5fa8" stroke-width="2.5" stroke-linejoin="round" opacity=".8"/>`);
      if (p.posisi) g.push(`<g transform="translate(${f1(X(p.posisi.lon))},${f1(Y(p.posisi.lat))})"><circle r="11" fill="#1b5fa8" stroke="#fff" stroke-width="2"/><text y="4" text-anchor="middle" font-size="11" font-weight="800" fill="#fff" font-family="system-ui,sans-serif">${esc(String(p.nama).replace(/^\[DUMMY\]\s*/, "").slice(0, 1).toUpperCase())}</text><title>${esc(`${p.nama}, posisi terakhir ${tgl(p.posisi.pada)}`)}</title></g>`);
    }
    for (const s of d.sumber_air) {
      const c = KONDISI[s.kondisi]?.[2] || "#8a93a8", pilih = s.id === S.sel;
      g.push(`<g transform="translate(${f1(X(s.lon))},${f1(Y(s.lat))})"><circle r="${pilih ? 16 : 13}" fill="${c}" stroke="${pilih ? "#0b2545" : "#fff"}" stroke-width="${pilih ? 3 : 2}"/><g transform="translate(-9,-9) scale(.75)" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="${IK[s.jenis] || IK.lainnya}"/></g><title>${esc(`${JENIS[s.jenis] || s.jenis}, ${KONDISI[s.kondisi]?.[0] || ""}, ${kmF(s.jarak_km)}`)}</title></g>`);
    }
    for (const p of d.permintaan) if (p.jenis === "heli") {
      const mati = p.status === "ditolak";
      if (p.sumber) g.push(`<line x1="${f1(X(p.lon))}" y1="${f1(Y(p.lat))}" x2="${f1(X(p.sumber.lon))}" y2="${f1(Y(p.sumber.lat))}" stroke="#7a3fb0" stroke-width="2" stroke-dasharray="4 4" opacity=".8"/>`);
      g.push(`<g transform="translate(${f1(X(p.lon))},${f1(Y(p.lat))})"><path d="M0-14L14 0 0 14-14 0z" fill="${mati ? "#8a93a8" : "#7a3fb0"}" stroke="#fff" stroke-width="2"/><g transform="translate(-8,-8) scale(.66)" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="${IK.heli}"/></g><title>${esc(`Permintaan heli ${STATUS[p.status]?.[0] || p.status}`)}</title></g>`);
    }
    for (const x of d.drop) { const [nm, , c] = HASIL[x.hasil] || HASIL.menunggu; g.push(`<g transform="translate(${f1(X(x.lon))},${f1(Y(x.lat))})"><path d="M0-12C7-3 9 2 9 5a9 9 0 0 1-18 0c0-3 2-8 9-17z" fill="${c}" stroke="#fff" stroke-width="2"/><title>${esc(`Drop ${ang(x.liter)} L, ${nm}`)}</title></g>`); }
    g.push(`<g transform="translate(${f1(X(t.lon))},${f1(Y(t.lat))})"><circle r="26" fill="#c9503a" fill-opacity=".12"/><circle r="10" fill="#c9503a" stroke="#fff" stroke-width="3"/><title>${esc(`Titik tugas: ${[t.kec, t.kab].filter(Boolean).join(", ")}`)}</title></g>`);
    if (S.pick) g.push(`<g transform="translate(${f1(X(S.pick.lon))},${f1(Y(S.pick.lat))})" stroke="#0b2545" stroke-width="2.5" fill="none"><circle r="9"/><path d="M-16 0H-5M5 0H16M0-16V-5M0 5V16"/></g>`);
    const mpp = 111320 / pr.s, bar = [100, 200, 500, 1000, 2000, 5000, 10000, 20000, 50000].find(m => m / mpp >= 70) || 50000;
    g.push(`<g transform="translate(16,${H - 22})"><path d="M0 0h${f1(bar / mpp)}" stroke="#0b2545" stroke-width="3"/><text y="-6" font-size="12" font-weight="700" fill="#0b2545" font-family="system-ui,sans-serif">${bar >= 1000 ? ang(bar / 1000) + " km" : ang(bar) + " m"}</text></g>`);
    if (d.angin?.wd_derajat != null) g.push(`<g transform="translate(${W - 40},44)"><circle r="26" fill="#fff" fill-opacity=".9" stroke="#0b2545" stroke-opacity=".3"/><g transform="rotate(${((d.angin.wd_derajat + 180) % 360).toFixed(0)})"><path d="M0-17L7 4H2v13h-4V4h-5z" fill="#0b2545"/></g><title>${esc(`Angin bertiup ke arah panah, datang dari ${d.angin.dari}`)}</title></g>`);
    el.innerHTML = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Peta operasi: titik tugas, garis api, sumber air, permintaan heli, titik drone, dan posisi regu. Ketuk peta untuk memilih titik."><rect width="${W}" height="${H}" fill="#eef2f7"/>${g.join("")}</svg>`;
  }
  function legenda() {
    const d = S.data, a = d.angin, per = (jenis, arr) => arr.filter(x => x.jenis === jenis), sum = (arr, k) => arr.reduce((s, x) => s + (x[k] || 0), 0);
    const b = [];
    for (const j of ["garis_api", "padam"]) { const v = per(j, d.garis); if (v.length) b.push(pil(`${GARIS[j][0]} ${kmF(sum(v, "panjang_km"))}`, "", "log")); }
    for (const j of ["sektor_aktif", "sektor_dingin"]) { const v = per(j, d.sektor); if (v.length) b.push(pil(`${GARIS[j][0]} ${haF(sum(v, "luas_ha"))}`, "", "log")); }
    b.push(pil(`${ang(d.sumber_air.length)} sumber air`, "", "air"), pil(`${ang(d.permintaan.filter(p => p.jenis === "heli").length)} permintaan heli`, "", "heli"), pil(`${ang(d.drop.length)} drop`, "", "air"),
      pil(`${ang(d.drone.titik.length)} titik drone`, "", "drone"), pil(`${ang(d.penugasan.filter(p => p.posisi).length)} regu berposisi`, "", "lokasi"));
    if (a) b.push(pil(`Angin ${a.ws_kmj != null ? ang(a.ws_kmj, 1) + " km/jam " : ""}dari ${a.dari || "arah tak diketahui"}`, "", "angin"));
    if (d.kluster) b.push(pil(`Cluster ${d.kluster.id}, ${kmF(d.kluster.jarak_km)} dari titik tugas`, "", "lokasi"));
    return b.join("") + `<p class="op-kecil">Drone: <span class="op-t" data-w="1"></span>di bawah 100 <span class="op-t" data-w="2"></span>100 sampai 200 <span class="op-t" data-w="3"></span>200 sampai 300 <span class="op-t" data-w="4"></span>di atas 300 derajat C. Drop: merah masih ada titik panas, hijau tidak ada titik baru, abu menunggu.</p>`;
  }

  /* ================= kerangka ================= */
  const TAB = [["sumber", "Sumber air", "air"], ["rencana", "Rencana aksi", "rencana"], ["permintaan", "Permintaan", "heli"], ["drop", "Log drop", "air"], ["linimasa", "Linimasa", "linimasa"], ["drone", "Drone", "drone"], ["patroli", "Patroli", "patroli"], ["tmat", "TMAT", "tmat"]];
  function pesan(teks, ok) { const p = S?.wadah.querySelector("#opPesan"); if (p) { p.textContent = teks || ""; p.className = "op-pesan " + (teks ? (ok ? "ok" : "galat") : ""); if (teks && ok === false) p.scrollIntoView?.({block: "nearest"}); } }
  function buka(t, o = {}) {
    tutup();
    const w = document.createElement("div");
    w.className = "op-layar"; w.setAttribute("role", "dialog"); w.setAttribute("aria-modal", "true"); w.setAttribute("aria-labelledby", "opJudul");
    w.innerHTML = `<header class="op-kepala"><div><h2 id="opJudul">Operasi lapangan</h2><p class="op-kecil">${esc([t.kec, t.kab].filter(Boolean).join(", "))}</p></div>
      <div class="op-kepala-aksi" id="opStatus"></div><div class="op-kepala-aksi"><button type="button" class="op-tombol" data-op="segar">${ik("segar")}Segarkan</button><button type="button" class="op-tombol utama" data-op="tutup">${ik("tutup")}Tutup</button></div></header>
      <p id="opPesan" class="op-pesan" role="status" aria-live="polite"></p>
      <div class="op-badan"><section class="op-kol-peta" aria-label="Peta operasi"><div class="op-peta" id="opPeta"></div><div class="op-legenda" id="opLegenda"></div></section>
        <section class="op-kol-panel"><nav class="op-tab" aria-label="Bagian operasi">${TAB.map(([k, n, i]) => `<button type="button" class="op-tombol" data-tab="${k}" aria-pressed="${k === "sumber"}">${ik(i)}${n}</button>`).join("")}</nav><div id="opIsi" class="op-isi" aria-live="polite"><p class="op-kecil">Memuat…</p></div></section></div>`;
    S = {t, admin: !!o.admin, wadah: w, pembuka: o.pembuka || document.activeElement, tab: "sumber", data: null, pick: null, sel: null, selang: null, tmat: null, tmatOn: false, gen: 0};
    document.body.append(w); document.documentElement.classList.add("op-buka");
    w.addEventListener("click", klik); w.addEventListener("submit", kirim); w.addEventListener("change", ubah);
    S.esc = e => { if (e.key === "Escape" && S) tutup(); };
    S.ukur = () => { clearTimeout(S.tm); S.tm = setTimeout(() => S && gambarPeta(), 150); };
    document.addEventListener("keydown", S.esc); window.addEventListener("resize", S.ukur);
    w.querySelector('[data-op="tutup"]').focus();
    muat();
  }
  function tutup() {
    if (!S) return;
    document.removeEventListener("keydown", S.esc); window.removeEventListener("resize", S.ukur); clearTimeout(S.tm);
    document.documentElement.classList.remove("op-buka"); S.wadah.remove(); document.querySelector(".op-cetak-doc")?.remove();
    const p = S.pembuka; S = null; p?.focus?.();
  }
  async function muat() {
    const s = S, r = await api("GET", `/api/ops/tugas/${s.t.id}`); if (S !== s) return;
    if (!r.ok) { s.wadah.querySelector("#opIsi").innerHTML = `<p class="op-pesan galat">${esc(r.status === 404 ? "Tugas ini tidak ada atau di luar wilayahmu." : ket(r, "Peta operasi belum bisa dimuat"))}</p>`; s.wadah.querySelector("#opPeta").innerHTML = ""; return; }
    s.data = r.j; const t = r.j.tugas;
    s.wadah.querySelector("#opStatus").innerHTML = pil(t.status === "buka" ? "Tugas aktif" : kapital(t.status), t.status === "buka" ? "emas" : "hijau") + (t.dummy ? pil("Contoh") : "") + (t.luas_ha != null ? pil(`Luas sekitar ${haF(t.luas_ha)}`) : "");
    s.wadah.querySelector("#opLegenda").innerHTML = legenda();
    gambarPeta(); gambarTab();
  }
  async function segarkan() { const s = S, r = await api("GET", `/api/ops/tugas/${s.t.id}`); if (S !== s) return; if (r.ok) { s.data = r.j; s.wadah.querySelector("#opLegenda").innerHTML = legenda(); gambarPeta(); } }

  /* ================= tab ================= */
  const pickBar = () => `<div class="op-pick"><span data-pick="1">${pickTeks()}</span><button type="button" class="op-tombol" data-op="gps">${ik("lokasi")}Pakai posisi saya</button></div>`;
  const pickTeks = () => S.pick ? `Titik dipilih: lintang ${ang(S.pick.lat, 5)}, bujur ${ang(S.pick.lon, 5)}${S.pick.akurasi ? `, akurasi sekitar ${ang(S.pick.akurasi)} m` : ""}` : "Ketuk peta untuk memilih titik";
  const opsi = (obj, pilih) => Object.entries(obj).map(([k, v]) => `<option value="${esc(k)}"${k === pilih ? " selected" : ""}>${esc(Array.isArray(v) ? v[0] : v)}</option>`).join("");
  const kondisiPil = k => pil(KONDISI[k]?.[0] || k, KONDISI[k]?.[1] || "");
  let nGambar = 0;
  function gambarTab() {
    const s = S, tab = s.tab, id = ++nGambar; s.wadah.querySelectorAll("[data-tab]").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.tab === tab)));
    const isi = s.wadah.querySelector("#opIsi"); isi.setAttribute("aria-busy", "true");
    nanti(async () => {
      if (S !== s || id !== nGambar) return;
      let h; try { h = await TAMPIL[tab](); } catch (e) { h = `<p class="op-pesan galat">${esc(e.message || "Bagian ini belum bisa dimuat.")}</p>`; }
      if (S !== s || id !== nGambar) return;
      isi.innerHTML = h; isi.setAttribute("aria-busy", "false");
    });
  }
  async function ambil(url, cad) { const r = await api("GET", url); if (!r.ok) throw new Error(ket(r, cad)); return r.j; }

  function tampilSumber() {
    const d = S.data, L = d.sumber_air, dekat = L.find(x => x.kondisi !== "kering");
    if (!S.sel || !L.some(x => x.id === S.sel)) S.sel = dekat?.id || L[0]?.id || null;
    return `<section class="op-bagian"><h3>Sumber air dalam 5 km</h3>
      <p class="op-kecil">${L.length ? `${ang(L.length)} titik, terdekat ${kmF(L[0].jarak_km)}.` : "Belum ada titik sumber air tercatat di sekitar tugas ini. Tambahkan dari lapangan."}</p>
      <ul class="op-daftar">${L.map(x => `<li class="op-baris" data-id="${esc(x.id)}"><div class="op-baris-k">${ik(x.jenis, "op-ik-b")}<b>${esc(JENIS[x.jenis] || x.jenis)}</b>${kondisiPil(x.kondisi)}${x.dummy ? pil("Contoh") : ""}<span class="op-jarak">${kmF(x.jarak_km)}</span></div>
        ${x.catatan ? `<p class="op-kecil">${esc(x.catatan)}</p>` : ""}<div class="op-aksi"><button type="button" class="op-tombol" data-op="pilih-sumber" data-id="${esc(x.id)}" aria-pressed="${x.id === S.sel}">${ik("cek")}${x.id === S.sel ? "Dipilih untuk selang" : "Pilih untuk selang"}</button>
        <label class="op-kecil">Kondisi<select data-op-kondisi="${esc(x.id)}">${opsi({ada_air: "Ada air", kering: "Kering", tidak_tahu: "Belum diketahui"}, x.kondisi)}</select></label></div></li>`).join("")}</ul></section>
      <form class="op-bagian" data-f="sumber" novalidate><h3>Tambah titik sumber air</h3>
        <div class="op-grid"><label>Jenis<select name="jenis">${opsi(JENIS, "sungai")}</select></label><label>Kondisi<select name="kondisi">${opsi({ada_air: "Ada air", kering: "Kering", tidak_tahu: "Belum diketahui"}, "ada_air")}</select></label></div>
        <label>Catatan (boleh kosong)<input name="catatan" maxlength="300" autocomplete="off"></label>${pickBar()}<button type="submit" class="op-tombol utama">${ik("air")}Simpan titik sumber air</button></form>
      <form class="op-bagian" data-f="selang" novalidate><h3>Hitung selang dan pompa estafet</h3>
        <label>Sumber air<select name="sumber">${L.map(x => `<option value="${esc(x.id)}"${x.id === S.sel ? " selected" : ""}>${esc(`${JENIS[x.jenis] || x.jenis}, ${kmF(x.jarak_km)}, ${KONDISI[x.kondisi]?.[0] || ""}`)}</option>`).join("") || `<option value="">Belum ada sumber</option>`}</select></label>
        <div class="op-grid"><label>Kelas pompa<select name="pompa">${opsi(POMPA, "tekanan_tinggi")}</select></label><label>Selang<select name="selang">${opsi(SELANG, "1_5")}</select></label>
          <label>Beda tinggi, meter (boleh kosong)<input name="beda" inputmode="decimal" autocomplete="off" placeholder="mis. 3"></label></div>
        <button type="submit" class="op-tombol utama"${L.length ? "" : " disabled"}>${ik("sedia")}Hitung</button><div id="opSelang" aria-live="polite">${S.selang ? selangHtml(S.selang.hasil) : ""}</div></form>`;
  }
  function selangHtml(h) {
    const k = h.sumber_konstanta || {}, s = S.data.sumber_air.find(x => x.id === h.sumber?.id), pb = h.pembanding_lapangan;
    return `<div class="op-hasil"><p class="op-besar"><b>${ang(h.pompa)}</b> pompa estafet</p>
      <p>Jarak selang sekitar <b>${ang(h.jarak_selang_m)} m</b> dari ${esc(JENIS[h.sumber?.jenis] || "sumber air")}${s ? ` (${kmF(s.jarak_km)} garis lurus)` : ""} ke titik api. Satu segmen menjangkau sekitar ${ang(h.panjang_segmen_m)} m selang pada debit ${ang(h.debit_lpm)} L/menit.</p>
      <div class="op-pils">${pil(`Jarak selang: garis lurus x ${ang(k.faktor_jarak_selang?.nilai, 1)}`)}${pil(`Tekanan sisa ${ang(k.sisa_bar?.nilai, 1)} bar`)}${pil(`Tekanan kerja pompa ${ang(h.kerja_bar, 1)} bar`)}${pil(`Gesek selang C ${ang(k.gesek_c?.nilai)}`)}${pil(`Susut ${ang(h.susut_bar_per_100m, 1)} bar per 100 m`)}
        ${pil(h.beda_tinggi?.m ? `Beda tinggi ${ang(h.beda_tinggi.m, 1)} m` : "Beda tinggi dianggap 0 m", h.beda_tinggi?.m ? "" : "emas")}${h.peringatan ? pil(h.peringatan, "merah", "awas") : ""}</div>
      ${pb ? `<p class="op-kecil">Pembanding lapangan: ${ang(pb.pompa)} pompa bila satu pompa menjangkau ${ang(pb.per_pompa_m)} m selang.</p>` : ""}
      <details class="op-rinci"><summary>Rumus dan sumber asumsi</summary><p class="op-kecil">${esc(h.rumus)}</p><ul class="op-kecil">${Object.entries(k).map(([n, v]) => `<li><b>${esc(kapital(n))}</b>: ${esc(typeof v.nilai === "number" ? ang(v.nilai, 3) : v.nilai ?? "")} (${esc(v.sumber)})</li>`).join("")}</ul>
        <p class="op-kecil">Hasil ini perkiraan hitungan meja, bukan pengganti ukuran lapangan.</p></details></div>`;
  }

  /* rencana aksi periode */
  async function tampilRencana() {
    const j = await ambil(`/api/ops/periode?tugas_id=${S.t.id}`, "Rencana aksi belum bisa dimuat"), a = j.awal || {}, serah = {};
    await Promise.all(j.periode.slice(0, 20).map(async p => { const r = await api("GET", `/api/ops/periode/${p.id}`); serah[p.id] = r.ok ? r.j.serah : []; }));
    S.periode = j.periode; S.serah = serah;
    const kini = Date.now(), mulai = Math.floor(kini / (30 * MENIT)) * 30 * MENIT;
    return `<form class="op-bagian" data-f="periode" novalidate><h3>Rencana aksi periode baru</h3><p class="op-kecil">Nilai awal diisi otomatis dari rekomendasi tugas, penugasan, dan angin. Sunting sebelum disimpan.</p>
      <div class="op-grid"><label>Mulai (WIB)<input name="mulai" type="datetime-local" value="${wibLokal(mulai)}"></label><label>Lama periode<select name="jam"><option value="12">12 jam</option><option value="24">24 jam</option></select></label></div>
      <label>Sasaran<textarea name="sasaran" maxlength="500" rows="2">${esc(a.sasaran || "")}</textarea></label><label>Penanggung jawab<input name="pj" maxlength="80" value="${esc(a.pj || "")}" autocomplete="off"></label>
      <div class="op-grid"><label>Sektor (satu per baris)<textarea name="sektor" rows="3">${esc((a.sektor || []).join("\n"))}</textarea></label><label>Regu (satu per baris)<textarea name="regu" rows="3">${esc((a.regu || []).join("\n"))}</textarea></label></div>
      <label>Alat<input name="alat" maxlength="400" value="${esc(a.alat || "")}" autocomplete="off"></label><label>Cuaca<input name="cuaca" maxlength="300" value="${esc(a.cuaca || "")}" autocomplete="off"></label>
      <label>Komunikasi<input name="komunikasi" maxlength="200" placeholder="mis. radio kanal 3, grup WhatsApp regu" autocomplete="off"></label><label>Keselamatan<textarea name="keselamatan" maxlength="600" rows="3">${esc(a.keselamatan || "")}</textarea></label>
      <button type="submit" class="op-tombol utama">${ik("rencana")}Simpan sebagai draf</button></form>
      <section class="op-bagian"><h3>Periode tersimpan</h3>${j.periode.length ? j.periode.map(p => kartuPeriode(p, serah[p.id] || [])).join("") : `<p class="op-kecil">Belum ada rencana aksi untuk tugas ini.</p>`}</section>`;
  }
  const baris = (k, v) => `<div class="op-dl"><dt>${k}</dt><dd>${v ? esc(v) : "Belum diisi"}</dd></div>`;
  function kartuPeriode(p, serah) {
    const [sn, sk] = [kapital(p.status), p.status === "terbit" ? "biru" : p.status === "selesai" ? "hijau" : "emas"];
    return `<article class="op-kartu" data-pid="${esc(p.id)}"><div class="op-baris-k"><b>${esc(tgl(p.mulai))} sampai ${esc(tgl(p.selesai))}</b>${pil(sn, sk)}${p.dummy ? pil("Contoh") : ""}</div>
      <dl class="op-dls">${baris("Sasaran", p.sasaran)}${baris("Penanggung jawab", p.pj)}${baris("Sektor", p.sektor.join(", "))}${baris("Regu", p.regu.join(", "))}${baris("Alat", p.alat)}${baris("Cuaca", p.cuaca)}${baris("Komunikasi", p.komunikasi)}${baris("Keselamatan", p.keselamatan)}</dl>
      ${serah.length ? `<div><b class="op-kecil">Serah terima</b><ul class="op-kecil">${serah.map(x => `<li>${esc(tgl(x.waktu))}: dari ${esc(x.dari)} ke ${esc(x.ke)}${x.catatan ? `, ${esc(x.catatan)}` : ""}</li>`).join("")}</ul></div>` : ""}
      <div class="op-aksi">${p.status === "draf" ? `<button type="button" class="op-tombol utama" data-op="periode" data-aksi="terbit" data-id="${esc(p.id)}">${ik("cek")}Terbitkan</button>` : ""}
        ${p.status === "terbit" ? `<button type="button" class="op-tombol" data-op="serah-buka" data-id="${esc(p.id)}">Serah terima</button><button type="button" class="op-tombol" data-op="periode" data-aksi="selesai" data-id="${esc(p.id)}">Selesaikan periode</button>` : ""}
        <button type="button" class="op-tombol" data-op="cetak" data-id="${esc(p.id)}">${ik("cetak")}Cetak A4</button></div>
      ${p.status === "terbit" ? `<form class="op-serah" data-f="serah" data-id="${esc(p.id)}" hidden novalidate><div class="op-grid"><label>Dari<input name="dari" maxlength="80" autocomplete="off"></label><label>Ke<input name="ke" maxlength="80" autocomplete="off"></label></div>
        <label>Catatan (boleh kosong)<input name="catatan" maxlength="500" autocomplete="off"></label><button type="submit" class="op-tombol utama">Catat serah terima</button></form>` : ""}</article>`;
  }
  function cetak(id) {
    const p = S.periode.find(x => x.id === id); if (!p) return;
    const t = S.data.tugas, serah = S.serah[id] || [], r = (k, v) => `<tr><th>${k}</th><td>${v ? esc(v) : "-"}</td></tr>`;
    document.querySelector(".op-cetak-doc")?.remove();
    const d = document.createElement("div"); d.className = "op-cetak-doc";
    d.innerHTML = `<h1>Rencana aksi periode operasi</h1><p>${esc([t.kec, t.kab].filter(Boolean).join(", "))}, lintang ${ang(t.lat, 4)}, bujur ${ang(t.lon, 4)}. Status periode: ${esc(kapital(p.status))}.</p>
      <table><tbody>${r("Periode", `${tgl(p.mulai)} sampai ${tgl(p.selesai)}`)}${r("Sasaran", p.sasaran)}${r("Penanggung jawab", p.pj)}${r("Sektor", p.sektor.join(", "))}${r("Regu", p.regu.join(", "))}${r("Alat", p.alat)}${r("Cuaca", p.cuaca)}${r("Komunikasi", p.komunikasi)}${r("Keselamatan", p.keselamatan)}</tbody></table>
      <h2>Serah terima</h2>${serah.length ? `<table><tbody>${serah.map(x => `<tr><td>${esc(tgl(x.waktu))}</td><td>Dari ${esc(x.dari)} ke ${esc(x.ke)}</td><td>${esc(x.catatan || "")}</td></tr>`).join("")}</tbody></table>` : `<p>Belum ada serah terima.</p>`}
      <div class="op-ttd"><div>Disusun oleh<br><br><br>(.......................)</div><div>Disetujui oleh<br><br><br>(.......................)</div></div><p class="op-kecil">Dicetak ${esc(tgl(Date.now()))} dari Pantau Bencana. Isi mengikuti data saat dicetak.</p>`;
    document.body.append(d); window.addEventListener("afterprint", () => d.remove(), {once: true}); window.print();
  }

  /* permintaan heli dan logistik */
  async function muatPermintaan() { const j = await ambil(`/api/ops/permintaan?tugas_id=${S.t.id}`, "Permintaan belum bisa dimuat"); S.perm = j.permintaan; S.transisi = j.transisi; return j; }
  function kartuPerm(p) {
    const [sn, sk] = STATUS[p.status] || [p.status, ""], heli = p.jenis === "heli", T = S.transisi[p.jenis][p.status] || {}, boleh = Object.entries(T).filter(([, peran]) => peran === "tulis" || S.admin), perlu = Object.values(T).includes("adm") && !S.admin;
    return `<article class="op-kartu" data-pid="${esc(p.id)}"><div class="op-baris-k">${ik(heli ? "heli" : "log", "op-ik-b")}<b>${heli ? "Helikopter water bombing" : `Logistik, ${esc(kapital(p.barang))}`}</b>${pil(sn, sk)}${pil("Prioritas " + p.prioritas, PRIO[p.prioritas])}${p.dummy ? pil("Contoh") : ""}</div>
      <p class="op-kecil">${heli ? `Sasaran di lintang ${ang(p.lat, 4)}, bujur ${ang(p.lon, 4)}${p.luas_ha != null ? `, luas sekitar ${haF(p.luas_ha)}` : ""}.${p.sumber ? ` Sumber air terdekat ${p.sumber.dari === "kanal" ? "kanal" : "titik tercatat"} ${kmF(p.sumber.jarak_km)}.` : " Belum ada sumber air terdekat tercatat."}` : `${ang(p.jumlah)} ${esc(p.satuan)}${p.barang_ket ? `, ${esc(p.barang_ket)}` : ""}.`} Diminta ${esc(tgl(p.dibuat))}.${p.catatan ? ` ${esc(p.catatan)}` : ""}</p>
      ${p.drop.length ? `<p class="op-kecil">${ang(p.drop.length)} drop tercatat, ${ang(p.drop.reduce((s, x) => s + x.liter, 0))} L.</p>` : ""}
      ${boleh.length ? `<div class="op-aksi"><label class="op-kecil">Catatan (wajib bila menolak)<input data-cat="${esc(p.id)}" maxlength="200" autocomplete="off"></label>${boleh.map(([ke]) => `<button type="button" class="op-tombol${ke === "ditolak" ? " bahaya" : " utama"}" data-op="status" data-id="${esc(p.id)}" data-ke="${ke}">${esc(AKSI[ke] || ke)}</button>`).join("")}</div>` : ""}
      ${perlu ? `<p class="op-kecil">${pil("Menunggu persetujuan moderator atau staf", "emas", "awas")}</p>` : ""}
      ${!heli && S.admin && p.status !== "ditolak" ? (p.meja_id ? `<p>${pil("Sudah di Meja logistik", "hijau", "cek")}</p>` : `<button type="button" class="op-tombol" data-op="teruskan" data-id="${esc(p.id)}">${ik("sedia")}Teruskan ke Meja logistik</button>`) : ""}</article>`;
  }
  async function tampilPermintaan() {
    await muatPermintaan();
    const adm = p => S.admin && Object.values(S.transisi[p.jenis][p.status] || {}).includes("adm"), antre = S.perm.filter(adm), sisa = S.perm.filter(p => !adm(p));
    return `${S.admin ? `<section class="op-bagian"><h3>Antrean persetujuan</h3>${antre.length ? antre.map(kartuPerm).join("") : `<p class="op-kecil">Tidak ada permintaan yang menunggu keputusanmu.</p>`}</section>` : ""}
      <section class="op-bagian"><h3>${S.admin ? "Permintaan lain" : "Permintaan"}</h3>${(S.admin ? sisa : S.perm).length ? (S.admin ? sisa : S.perm).map(kartuPerm).join("") : `<p class="op-kecil">Belum ada permintaan untuk tugas ini.</p>`}</section>
      <details class="op-bagian op-rinci"><summary>${ik("heli")}Minta helikopter water bombing</summary><form data-f="heli" novalidate><p class="op-kecil">Sasaran memakai titik yang kamu ketuk di peta. Tanpa ketukan, sasaran adalah titik tugas. Sumber air terdekat dicari otomatis.</p>${pickBar()}
        <div class="op-grid"><label>Perkiraan luas, hektare (boleh kosong)<input name="luas" inputmode="decimal" autocomplete="off"></label><label>Prioritas<select name="prioritas">${opsi({rendah: "Rendah", sedang: "Sedang", tinggi: "Tinggi", darurat: "Darurat"}, "sedang")}</select></label></div>
        <label>Catatan (boleh kosong)<input name="catatan" maxlength="500" autocomplete="off"></label><button type="submit" class="op-tombol utama">Kirim permintaan heli</button></form></details>
      <details class="op-bagian op-rinci"><summary>${ik("log")}Minta logistik</summary><form data-f="logistik" novalidate><div class="op-grid"><label>Barang<select name="barang">${BARANG.map(b => `<option value="${b}">${esc(kapital(b))}</option>`).join("")}</select></label><label>Keterangan barang (wajib bila lainnya)<input name="barang_ket" maxlength="100" autocomplete="off"></label>
        <label>Jumlah<input name="jumlah" inputmode="decimal" autocomplete="off"></label><label>Satuan<input name="satuan" maxlength="20" placeholder="mis. dus, liter" autocomplete="off"></label>
        <label>Prioritas<select name="prioritas">${opsi({rendah: "Rendah", sedang: "Sedang", tinggi: "Tinggi", darurat: "Darurat"}, "sedang")}</select></label></div>
        <label>Catatan (boleh kosong)<input name="catatan" maxlength="500" autocomplete="off"></label><button type="submit" class="op-tombol utama">Kirim permintaan logistik</button></form></details>`;
  }

  async function tampilDrop() {
    await muatPermintaan();
    const heli = S.perm.filter(p => p.jenis === "heli"), siap = heli.filter(p => p.status === "dijadwalkan" || p.status === "selesai"), semua = heli.flatMap(p => p.drop.map(x => ({...x, p})));
    return `<section class="op-bagian"><h3>Catat drop air</h3>${siap.length ? `<form data-f="drop" novalidate><label>Permintaan heli<select name="permintaan">${siap.map(p => `<option value="${esc(p.id)}">${esc(`${STATUS[p.status][0]}, prioritas ${p.prioritas}, ${tgl(p.dibuat)}`)}</option>`).join("")}</select></label>
        <p class="op-kecil">Titik drop memakai ketukan di peta. Tanpa ketukan, titik drop adalah sasaran permintaan.</p>${pickBar()}<label>Volume, liter<input name="liter" inputmode="numeric" autocomplete="off" placeholder="mis. 5000"></label>
        <button type="submit" class="op-tombol utama">${ik("air")}Catat drop</button></form>` : `<p class="op-kecil">Drop dicatat setelah permintaan heli dijadwalkan. Belum ada permintaan heli yang dijadwalkan.</p>`}</section>
      <section class="op-bagian"><h3>Hasil drop</h3><p class="op-kecil">Hasil dinilai otomatis dari titik panas NASA dalam 1 km dan Himawari dalam 2 km, selama 6 jam sesudah drop.</p>
        ${semua.length ? `<ul class="op-daftar">${semua.map(x => { const h = HASIL[x.hasil] || HASIL.menunggu; return `<li class="op-baris"><div class="op-baris-k">${ik("air", "op-ik-b")}<b>${ang(x.liter)} L</b>${pil(h[0], h[1])}<span class="op-jarak">${esc(tgl(x.pada))}</span></div>${x.hasil_n ? `<p class="op-kecil">${ang(x.hasil_n)} titik panas terdeteksi sesudah drop.</p>` : ""}</li>`; }).join("")}</ul>` : `<p class="op-kecil">Belum ada drop tercatat.</p>`}</section>`;
  }

  async function tampilLinimasa() {
    const j = await ambil(`/api/ops/linimasa/${S.t.id}`, "Linimasa belum bisa dimuat"), r = j.respons || {};
    return `<section class="op-bagian"><h3>Waktu respons sejak terdeteksi</h3><div class="op-pils">${pil(`Konfirmasi ${lamaF(r.konfirmasi_menit)}`, "", "cek")}${pil(`Regu tiba ${lamaF(r.tiba_menit)}`, "", "lokasi")}${pil(`Padam ${lamaF(r.padam_menit)}`, "", "air")}${pil(`Terverifikasi satelit ${lamaF(r.terverifikasi_menit)}`, "", "cek")}</div></section>
      <section class="op-bagian"><h3>Linimasa</h3><ol class="op-linimasa">${j.linimasa.map(e => { const [n, k] = PERISTIWA[e.jenis] || [kapital(e.jenis), ""]; return `<li><span class="op-jam">${esc(tgl(e.waktu))}</span>${pil(n, k)}<span>${esc(e.ket)}</span></li>`; }).join("") || `<li class="op-kecil">Belum ada kejadian.</li>`}</ol></section>
      <section class="op-bagian"><h3>Catatan pelajaran</h3>${j.pelajaran.length ? `<ul class="op-daftar">${j.pelajaran.map(x => `<li class="op-baris"><p>${esc(x.catatan)}</p><p class="op-kecil">${esc(tgl(x.dibuat))}</p></li>`).join("")}</ul>` : `<p class="op-kecil">Belum ada catatan pelajaran.</p>`}
        <form data-f="pelajaran" novalidate><label>Apa yang perlu diingat dari tugas ini?<textarea name="catatan" maxlength="1000" rows="3"></textarea></label><button type="submit" class="op-tombol utama">Simpan catatan pelajaran</button></form></section>`;
  }

  function tampilDrone() {
    const D = S.data.drone, maks = D.titik.reduce((m, x) => Math.max(m, x[2]), -Infinity);
    return `<section class="op-bagian"><h3>Titik bara dari drone termal</h3><p class="op-kecil">${D.titik.length ? `${ang(D.titik.length)} titik tampil di peta, suhu tertinggi ${ang(maks)} derajat C.` : "Belum ada titik drone."}</p>
      ${D.unggah.length ? `<ul class="op-daftar">${D.unggah.map(u => `<li class="op-baris"><div class="op-baris-k">${ik("drone", "op-ik-b")}<b>${esc(u.alat)}</b>${pil(`${ang(u.n)} titik`)}<span class="op-jarak">${esc(tgl(u.dibuat))}</span></div>${u.catatan ? `<p class="op-kecil">${esc(u.catatan)}</p>` : ""}</li>`).join("")}</ul>` : ""}</section>
      <form class="op-bagian" data-f="drone" novalidate><h3>Unggah CSV drone</h3><p class="op-kecil">Kolom persis: lat,lon,suhu_c,waktu. Waktu berformat ISO dengan zona, mis. 2026-10-22T09:30:00+07:00. Titik paling jauh 5 km dari tugas.</p>
        <label>Alat<input name="alat" maxlength="80" placeholder="mis. DJI Mavic 3T" autocomplete="off"></label><label>Catatan (boleh kosong)<input name="catatan" maxlength="300" autocomplete="off"></label>
        <label>Berkas CSV<input name="berkas" type="file" accept=".csv,text/csv,text/plain"></label><label>Atau tempel isi CSV<textarea name="csv" rows="5" spellcheck="false" placeholder="lat,lon,suhu_c,waktu"></textarea></label>
        <button type="submit" class="op-tombol utama">${ik("sedia")}Unggah titik drone</button></form>`;
  }

  async function tampilPatroli() {
    const j = await ambil("/api/ops/patroli", "Patroli belum bisa dimuat"), t = S.data.tugas, L = j.patroli.filter(p => p.prov === t.prov && String(p.kab).toLowerCase() === String(t.kab).toLowerCase());
    const kartu = p => `<li class="op-baris" data-pid="${esc(p.id)}"><div class="op-baris-k">${ik("patroli", "op-ik-b")}<b>${esc([p.desa, p.kec].filter(Boolean).join(", "))}</b>${pil(kapital(p.status), p.status === "dikunjungi" ? "hijau" : p.status === "terlewat" ? "merah" : "emas")}${pil(ALASAN[p.alasan] || p.alasan)}${p.dummy ? pil("Contoh") : ""}<span class="op-jarak">${esc(tgl(p.jadwal))}</span></div>
      ${p.alasan_ket ? `<p class="op-kecil">${esc(p.alasan_ket)}</p>` : ""}${p.kunjungan.map(k => `<p class="op-kecil">Kunjungan ${esc(tgl(k.pada))}${k.akurasi != null ? `, akurasi sekitar ${ang(k.akurasi)} m` : ""}${k.catatan ? `: ${esc(k.catatan)}` : ""}</p>`).join("")}
      ${p.status !== "dikunjungi" ? `<form data-f="kunjungan" data-id="${esc(p.id)}" novalidate><label class="op-kecil">Catatan kunjungan<input name="catatan" maxlength="500" autocomplete="off" placeholder="mis. tidak ada api, kanal terisi"></label><button type="submit" class="op-tombol">${ik("lokasi")}Catat kunjungan di posisi saya</button></form>` : ""}</li>`;
    return ["terjadwal", "dikunjungi", "terlewat"].map(st => { const v = L.filter(p => p.status === st); return `<section class="op-bagian"><h3>${kapital(st)} (${ang(v.length)})</h3>${v.length ? `<ul class="op-daftar">${v.map(kartu).join("")}</ul>` : `<p class="op-kecil">Tidak ada patroli ${st}.</p>`}</section>`; }).join("");
  }

  async function tampilTmat() {
    const t = S.t, j = await ambil(`/api/ops/tmat?bbox=${[t.lon - 1.5, t.lat - 1.5, t.lon + 1.5, t.lat + 1.5].map(x => x.toFixed(3)).join(",")}`, "TMAT belum bisa dimuat"); S.tmat = j.stasiun;
    return `<section class="op-bagian"><h3>Muka air gambut (TMAT) dalam radius sekitar 150 km</h3><p class="op-kecil">${esc(j.keterangan)} ${esc(j.satuan)}.</p>
      <label class="op-cek"><input type="checkbox" data-op-tmat="1"${S.tmatOn ? " checked" : ""}>Tampilkan stasiun TMAT di peta</label>
      ${j.stasiun.length ? `<table class="op-tabel"><thead><tr><th>Stasiun</th><th>TMAT</th><th>Waktu</th><th>Sumber</th></tr></thead><tbody>${j.stasiun.map(x => `<tr><td>${esc(x.stasiun)}${x.dummy ? " " + pil("Contoh") : ""}</td><td>${ang(x.tmat_cm)} cm</td><td>${esc(tgl(x.waktu))}</td><td>${esc(x.sumber)}</td></tr>`).join("")}</tbody></table>` : `<p class="op-kecil">Belum ada data TMAT di sekitar tugas ini.</p>`}</section>
      ${S.admin ? `<form class="op-bagian" data-f="tmat" novalidate><h3>Unggah CSV TMAT</h3><p class="op-kecil">Khusus moderator. Kolom persis: id,lat,lon,tmat_cm,waktu,sumber. Stasiun yang sama ditimpa oleh pengukuran terbaru.</p>
        <label>Berkas CSV<input name="berkas" type="file" accept=".csv,text/csv,text/plain"></label><label>Atau tempel isi CSV<textarea name="csv" rows="5" spellcheck="false" placeholder="id,lat,lon,tmat_cm,waktu,sumber"></textarea></label>
        <button type="submit" class="op-tombol utama">${ik("sedia")}Unggah TMAT</button></form>` : `<p class="op-kecil">Unggah TMAT hanya untuk moderator.</p>`}`;
  }
  const TAMPIL = {sumber: tampilSumber, rencana: tampilRencana, permintaan: tampilPermintaan, drop: tampilDrop, linimasa: tampilLinimasa, drone: tampilDrone, patroli: tampilPatroli, tmat: tampilTmat};

  /* ================= aksi ================= */
  async function selesaiAksi(r, oke, cad) {   // satu pola: pesan hasil, lalu segarkan peta dan tab hanya bila berhasil
    if (!r.ok) return pesan(ket(r, cad), false);
    pesan(oke, true); await segarkan(); gambarTab();
  }
  function segarPick() { for (const e of S.wadah.querySelectorAll("[data-pick]")) e.textContent = pickTeks(); gambarPeta(); }
  async function klik(e) {
    const s = S, b = e.target.closest("button[data-op], button[data-tab]"), svg = e.target.closest?.("#opPeta svg");
    if (svg && s.proj) { const r = svg.getBoundingClientRect(), p = s.proj.balik((e.clientX - r.left) * s.proj.W / r.width, (e.clientY - r.top) * s.proj.H / r.height); s.pick = {lat: p.lat, lon: p.lon}; return segarPick(); }
    if (!b) return;
    if (b.dataset.tab) { s.tab = b.dataset.tab; pesan(""); return gambarTab(); }
    const a = b.dataset.op, id = b.dataset.id;
    if (a === "tutup") return tutup();
    if (a === "segar") { pesan("Memuat ulang…", true); await segarkan(); gambarTab(); return pesan("Data diperbarui.", true); }
    if (a === "gps") { b.disabled = true; try { s.pick = await posisiSaya(); segarPick(); } catch (x) { pesan(x.message, false); } b.disabled = false; return; }
    if (a === "pilih-sumber") { s.sel = id; s.selang = null; gambarPeta(); return gambarTab(); }
    if (a === "serah-buka") { const f = b.closest("[data-pid]").querySelector('form[data-f="serah"]'); f.hidden = !f.hidden; if (!f.hidden) f.elements.dari.focus(); return; }
    if (a === "cetak") return cetak(id);
    b.disabled = true;
    try {
      if (a === "periode") await selesaiAksi(await api("POST", `/api/ops/periode/${id}`, {aksi: b.dataset.aksi}), b.dataset.aksi === "terbit" ? "Periode diterbitkan." : "Periode diselesaikan.", "Periode belum bisa diubah");
      else if (a === "status") { const cat = s.wadah.querySelector(`[data-cat="${id}"]`)?.value.trim(); await selesaiAksi(await api("POST", `/api/ops/permintaan/${id}`, {aksi: "status", ke: b.dataset.ke, ...(cat ? {catatan: cat} : {})}), "Status permintaan diperbarui.", "Status belum bisa diubah"); }
      else if (a === "teruskan") await selesaiAksi(await api("POST", `/api/ops/permintaan/${id}`, {aksi: "teruskan"}), "Permintaan diteruskan ke Meja logistik.", "Belum bisa diteruskan");
    } finally { b.disabled = false; }
  }
  async function ubah(e) {
    const c = e.target;
    if (c.dataset.opKondisi) { const r = await api("POST", `/api/ops/sumber_air/${c.dataset.opKondisi}`, {kondisi: c.value}); return selesaiAksi(r, "Kondisi sumber air diperbarui.", "Kondisi belum bisa diubah"); }
    if (c.dataset.opTmat) { S.tmatOn = c.checked; return gambarPeta(); }
    if (c.name === "berkas" && c.files?.[0]) { const f = c.form; if (c.files[0].size > 400000) return pesan("Berkas lebih dari 400 KB. Pecah menjadi beberapa unggahan.", false); f.elements.csv.value = await c.files[0].text(); }
    if (c.name === "sumber" && c.form?.dataset.f === "selang") { S.sel = c.value; S.selang = null; gambarPeta(); }
  }
  async function kirim(e) {
    e.preventDefault(); const f = e.target, n = f.dataset.f, el = f.elements, tombol = f.querySelector('button[type="submit"]'), s = S, t = s.t;
    const nilai = k => el[k]?.value.trim(), baca = k => nilai(k).split("\n").map(x => x.trim()).filter(Boolean), salah = m => pesan(m, false);
    tombol.disabled = true;
    try {
      if (n === "sumber") { if (!s.pick) return salah("Ketuk peta atau pakai posisi saya untuk memilih titik dulu."); await selesaiAksi(await api("POST", "/api/ops/sumber_air", {tugas_id: t.id, jenis: nilai("jenis"), kondisi: nilai("kondisi"), lat: s.pick.lat, lon: s.pick.lon, catatan: nilai("catatan") || null}), "Titik sumber air disimpan.", "Titik belum bisa disimpan"); }
      else if (n === "selang") {
        if (!nilai("sumber")) return salah("Belum ada sumber air untuk dihitung. Tambahkan titik sumber air dulu.");
        const beda = angkaIn(nilai("beda")), q = new URLSearchParams({tugas_id: t.id, sumber_id: nilai("sumber"), pompa: nilai("pompa"), selang: nilai("selang"), ...(beda != null ? {beda_tinggi_m: beda} : {})}), r = await api("GET", `/api/ops/selang?${q}`);
        if (!r.ok) return salah(ket(r, "Hitungan belum bisa dibuat")); s.sel = nilai("sumber"); s.selang = {sumber: s.data.sumber_air.find(x => x.id === s.sel) || r.j.sumber, hasil: r.j};
        s.wadah.querySelector("#opSelang").innerHTML = selangHtml(r.j); pesan("Hitungan selesai.", true); gambarPeta();
      } else if (n === "periode") {
        const mulai = dariWib(nilai("mulai")); if (!Number.isFinite(mulai)) return salah("Isi waktu mulai dulu.");
        const b = {tugas_id: t.id, mulai, selesai: mulai + Number(nilai("jam")) * JAM, sektor: baca("sektor"), regu: baca("regu")};
        for (const k of ["sasaran", "pj", "alat", "cuaca", "komunikasi", "keselamatan"]) if (nilai(k)) b[k] = nilai(k);
        await selesaiAksi(await api("POST", "/api/ops/periode", b), "Rencana aksi disimpan sebagai draf. Terbitkan bila sudah siap.", "Rencana belum bisa disimpan");
      } else if (n === "serah") await selesaiAksi(await api("POST", `/api/ops/periode/${f.dataset.id}`, {aksi: "serah", dari: nilai("dari"), ke: nilai("ke"), catatan: nilai("catatan") || ""}), "Serah terima dicatat.", "Serah terima belum bisa dicatat");
      else if (n === "heli") {
        const p = s.pick || {lat: t.lat, lon: t.lon}, luas = angkaIn(nilai("luas")), b = {tugas_id: t.id, jenis: "heli", lat: p.lat, lon: p.lon, prioritas: nilai("prioritas"), ...(nilai("catatan") ? {catatan: nilai("catatan")} : {}), ...(luas != null ? {luas_ha: luas} : {})};
        await selesaiAksi(await api("POST", "/api/ops/permintaan", b), "Permintaan heli terkirim. Moderator atau staf akan memutuskan.", "Permintaan belum bisa dikirim");
      } else if (n === "logistik") {
        const jml = angkaIn(nilai("jumlah")); if (jml == null) return salah("Isi jumlah barang dengan angka.");
        await selesaiAksi(await api("POST", "/api/ops/permintaan", {tugas_id: t.id, jenis: "logistik", barang: nilai("barang"), barang_ket: nilai("barang_ket") || null, jumlah: jml, satuan: nilai("satuan"), prioritas: nilai("prioritas"), ...(nilai("catatan") ? {catatan: nilai("catatan")} : {})}), "Permintaan logistik terkirim.", "Permintaan belum bisa dikirim");
      } else if (n === "drop") {
        const p = s.perm.find(x => x.id === nilai("permintaan")), at = s.pick || {lat: p?.lat, lon: p?.lon}, liter = angkaIn(nilai("liter"));
        if (!p || liter == null) return salah("Pilih permintaan dan isi volume dalam liter.");
        const r = await api("POST", "/api/ops/drop", {permintaan_id: p.id, lat: at.lat, lon: at.lon, liter});
        await selesaiAksi(r, `Drop dicatat. Hasil: ${(HASIL[r.j?.drop?.hasil] || HASIL.menunggu)[0].toLowerCase()}.`, "Drop belum bisa dicatat");
      } else if (n === "pelajaran") await selesaiAksi(await api("POST", "/api/ops/pelajaran", {tugas_id: t.id, catatan: nilai("catatan")}), "Catatan pelajaran disimpan.", "Catatan belum bisa disimpan");
      else if (n === "drone") await selesaiAksi(await api("POST", "/api/ops/drone", {tugas_id: t.id, alat: nilai("alat"), catatan: nilai("catatan") || null, csv: el.csv.value}), "Titik drone diunggah dan tampil di peta.", "Unggahan belum bisa diproses");
      else if (n === "tmat") { const r = await api("POST", "/api/ops/tmat", {csv: el.csv.value}); await selesaiAksi(r, `TMAT diunggah: ${ang(r.j?.n)} baris dari ${ang(r.j?.stasiun)} stasiun.`, "Unggahan belum bisa diproses"); }
      else if (n === "kunjungan") {
        let p; try { p = await posisiSaya(); } catch (x) { p = s.pick; if (!p || !nilai("catatan")) return salah(x.message + " Tanpa GPS, kunjungan butuh titik di peta dan catatan."); }
        await selesaiAksi(await api("POST", `/api/ops/patroli/${f.dataset.id}`, {aksi: "kunjungan", lat: p.lat, lon: p.lon, ...(p.akurasi != null ? {akurasi: p.akurasi} : {}), ...(nilai("catatan") ? {catatan: nilai("catatan")} : {})}), "Kunjungan dicatat.", "Kunjungan belum bisa dicatat");
      }
    } finally { tombol.disabled = false; }
  }

  window.InstansiOps = {buka, tutup};
})();
