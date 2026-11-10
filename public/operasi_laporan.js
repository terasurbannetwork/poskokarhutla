/* operasi_laporan.js — menu Operasi (/operasi) = laporan tanpa peta (pemilik 4 Nov 2026), dua bagian berikon: Operasi Udara | Operasi Darat.
   Skrip klasik sesudah operasi_peta.js; memakai global index.html ($, esc, fmt, S, lengkapiKluster, Kartu) dan window.OpsUdara (helper operasi_peta.js).
   Tiap bagian = kartu standar .ex-std tanpa kaki (AGENTS.md §3.5). Pemilih tanggal mengganti seluruh laporan.
   Data udara: /api/operasi/peta?tanggal, /api/operasi/monitor (30 hari s.d. tanggal), /api/operasi/nilai (7 hari), /api/operasi/jejak (ADS-B),
   /api/omc/sortie + /udara/data/omc_hasil.json, /data/harian30.json (titik panas), /data/operasi/rekap_udara.json.
   Data darat: /api/laporan-karhutla/snapshot/:tanggal (laporan terkunci); belum dikunci = angka rekap BNPB terakhir (/data/bnpb.json, /data/operasi_resmi.json)
   dengan tanggalnya; /api/ops/patroli (patroli regu).
   INP: ganti tab, tanggal, atau armada mengecat kontrolnya dulu; laporan berat dirender sesudah frame berikut. */
(() => {
  "use strict";
  const U = () => window.OpsUdara;
  const ambil = u => fetch(u, {credentials: "same-origin"}).then(r => r.ok ? r.json() : null).catch(() => null);
  const muatSkrip = src => new Promise(ok => { const s = document.createElement("script"); s.src = src; s.onload = ok; s.onerror = ok; document.head.append(s); });
  const sesudahFrame = fn => requestAnimationFrame(() => setTimeout(fn, 0));
  const hariWIB = () => new Date(Date.now() + 7 * 36e5).toISOString().slice(0, 10);
  const geser = (t, n) => new Date(Date.parse(t) + n * 864e5).toISOString().slice(0, 10);
  const BLN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
  const tglPendek = t => { const [, m, d] = t.split("-").map(Number); return `${d} ${BLN[m - 1]}`; };
  const tglPanjang = t => window.OperasiLapangan ? window.OperasiLapangan.tanggalIndo(t) : t;
  const nol = v => v ? fmt(v) : "–";
  const hl = t => `<span class="hl">${t}</span>`;
  const IK = {udara: '<path d="M10 14 3 12l1-2 7 1 4-6h2l-2 7 5 1 1-2h2l-1 4 1 4h-2l-1-2-5 1 2 7h-2l-4-6-7 1-1-2z"/>',
    darat: '<circle cx="9" cy="7" r="3"/><path d="M3 21v-1a6 6 0 0 1 12 0v1"/><circle cx="17" cy="9" r="2.4"/><path d="M15.5 21v-.5a4.5 4.5 0 0 1 6.5-4"/>'};
  const ik = k => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${IK[k]}</svg>`;
  const bagian = (ey, judul, isi, kanan = "") => `<article class="ex ex-std"><header class="ex-hd"><span class="ex-ey">${ey}</span><div class="ex-jd"><h3>${judul}</h3>${kanan}</div></header><div class="ex-bd">${isi}</div></article>`;
  const tabelH = (kepala, baris, kosong) => baris.length ? `<div class="tw ops-tw ex-tabel"><table><thead><tr>${kepala.map(k => { const [t, tip] = k.split("|");
      return `<th${t.startsWith("#") ? ' class="n"' : ""}${tip ? ` title="${esc(tip)}"` : ""}>${t.replace(/^#/, "")}</th>`; }).join("")}</tr></thead><tbody>${baris.join("")}</tbody></table></div>`
    : `<p class="ops-kosong">${kosong}</p>`;
  const sel = (v, kelas = "n num") => `<td class="${kelas}">${v}</td>`;
  const kiri = v => `<td class="ops-kiri">${v}</td>`;
  const km = (a, b, c, d) => { const R = 6371, r = Math.PI / 180, x = Math.sin((c - a) * r / 2) ** 2 + Math.cos(a * r) * Math.cos(c * r) * Math.sin((d - b) * r / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(x)); };
  const PERAN = {wb: "Water bombing", patroli: "Patroli", patroli_wb: "Patroli + WB", omc: "Modifikasi cuaca"};
  const MISI = {wb: "Water bombing", patroli: "Patroli", omc: "OMC"};
  const SIAP = ["siap", "operasi", "siaga"];
  const RENLAP_KM = 10;   // ponytail: target renlap dianggap didatangi bila ada aksi armada base itu <= 10 km; ganti ke jejak ADS-B bila posisi rapat tersedia

  const st = {mode: "udara", tanggal: hariWIB(), reg: "", cache: {}, statis: null};
  try { const m = localStorage.getItem("ops_mode"); if (m === "darat" || m === "udara") st.mode = m; } catch (e) {}

  /* ---------------- data per tanggal ---------------- */
  const muatTanggal = t => st.cache[t] ||= (async () => {
    const dari = geser(t, -29), [peta, mon, nilai, jejak, omc, snap, patroli] = await Promise.all([
      ambil(`/api/operasi/peta?tanggal=${t}`), ambil(`/api/operasi/monitor?dari=${dari}&sampai=${t}`), ambil(`/api/operasi/nilai?dari=${geser(t, -6)}&sampai=${t}`),
      ambil(`/api/operasi/jejak?tanggal=${t}`), ambil(`/api/omc/sortie?sejak=${dari}`), ambil(`/api/laporan-karhutla/snapshot/${t}`), ambil("/api/ops/patroli")]);
    return {t, dari, peta, mon, nilai, jejak, omc: (omc?.sortie || []).filter(x => (x.mulai || "").slice(0, 10) <= t || !x.mulai), snap, patroli: patroli?.patroli || null};
  })();
  const muatStatis = () => st.statis ||= Promise.all([ambil("/data/harian30.json"), ambil("/udara/data/omc_hasil.json"), ambil("/data/bnpb.json"), ambil("/data/operasi_resmi.json")])
    .then(([h30, omcHasil, bnpb, resmi]) => ({h30, omcHasil, bnpb, resmi}));

  /* ---------------- kerangka: tab Udara/Darat, tanggal, salin teks ---------------- */
  function kerangka(box) {
    box.innerHTML = `<div class="ops-alat" role="toolbar" aria-label="Laporan operasi">
      <div class="seg ops-mode" role="group" aria-label="Bagian operasi">${[["udara", "Operasi Udara"], ["darat", "Operasi Darat"]].map(([k, t]) => `<button type="button" data-mode="${k}" aria-pressed="${st.mode === k}">${ik(k)}${t}</button>`).join("")}</div>
      <label class="ops-tgl">Tanggal <input type="date" value="${st.tanggal}" max="${hariWIB()}" min="2026-07-01"></label>
      <button type="button" class="ops-tbl" data-aksi="salin" title="Salin ringkasan laporan hari ini untuk WhatsApp">Salin teks WA</button>
      <button type="button" class="ops-tbl" data-aksi="cetak" title="Cetak atau simpan PDF">Cetak / PDF</button>
      <span class="ops-status" role="status"></span></div><div id="opsIsi"></div>`;
    box.addEventListener("click", e => {
      const m = e.target.closest("[data-mode]");
      if (m) { st.mode = m.dataset.mode; try { localStorage.setItem("ops_mode", st.mode); } catch (x) {} box.querySelectorAll("[data-mode]").forEach(b => b.setAttribute("aria-pressed", String(b === m))); return sesudahFrame(isi); }
      const a = e.target.closest("[data-aksi]"); if (!a) return;
      if (a.dataset.aksi === "cetak") return window.print();
      if (a.dataset.aksi === "salin") salin(a);
    });
    box.addEventListener("change", e => {
      if (e.target.matches(".ops-tgl input") && e.target.value) { st.tanggal = e.target.value; return sesudahFrame(isi); }
      if (e.target.matches("[data-reg]")) { st.reg = e.target.value; return sesudahFrame(() => { const k = $("#opsHistori"); if (k) k.outerHTML = kartuHistori(st._d); }); }
      if (e.target.matches("[data-galeri]")) { st.galeri = e.target.value; return sesudahFrame(() => { const k = $("#opsGaleri"); if (k) k.outerHTML = kartuGaleri(st._d); }); }
    });
  }
  const status = t => { const s = $("#opsLaporan .ops-status"); if (s) s.textContent = t; };

  async function render() {
    const box = $("#opsLaporan"); if (!box) return;
    if (!U()) return setTimeout(render, 300);
    if (!box.querySelector(".ops-alat")) box.innerHTML = `<div class="kosong"><div class="spin"></div>Memuat laporan operasi…</div>`;
    const ok = await U().muatSemua();
    if (!ok) { box.innerHTML = bagian("Operasi", "Laporan operasi hanya untuk akun staf berperan atau moderator", `<p class="ops-kosong">Masuk dulu untuk melihatnya.</p>`); return; }
    if (!box.querySelector(".ops-alat")) kerangka(box);
    isi();
  }
  let nomor = 0;
  async function isi() {
    const el = $("#opsIsi"); if (!el) return; const n = ++nomor;
    el.innerHTML = `<div class="kosong"><div class="spin"></div>Memuat ${st.mode === "udara" ? "operasi udara" : "operasi darat"} ${esc(tglPanjang(st.tanggal))}…</div>`;
    if (typeof lengkapiKluster === "function") await lengkapiKluster().catch(() => {});
    if (!window.OperasiLapangan) await muatSkrip("/bnpb/operasi_lapangan_hitung.js");
    const [d, s] = await Promise.all([muatTanggal(st.tanggal), muatStatis()]);
    if (n !== nomor) return;
    const D = st._d = {...siapkan(d), ...s};
    el.innerHTML = st.mode === "udara" ? udara(D) : darat(D);
  }

  /* ---------------- turunan udara ---------------- */
  function siapkan(d) {
    const t = d.t, peta = d.peta || {base: [], armada: [], temuan: [], renlap: [], gerak: []}, aksi30 = d.mon?.aksi || [];
    const aksi = aksi30.filter(a => a.tanggal === t).sort((x, y) => (y.jam_utc || 0) - (x.jam_utc || 0));
    const reg2base = Object.fromEntries((peta.armada || []).map(a => [a.registrasi, a.base_id]));
    const hitung = xs => { const p = xs.filter(a => a.hasil === "padam").length, m = xs.filter(a => a.hasil === "masih_api").length;
      return {sortie: xs.length, wb: xs.filter(a => a.guna === "wb").length, drop: xs.reduce((s, a) => s + (a.drop || 0), 0), padam: p, dinilai: p + m, persen: p + m ? p / (p + m) : null, foto: xs.reduce((s, a) => s + (a.foto || []).length, 0)}; };
    const perHari = Array.from({length: 30}, (_, i) => { const tg = geser(d.dari, i); return {t: tg, ...hitung(aksi30.filter(a => a.tanggal === tg))}; });
    return {...d, peta, aksi, aksi30, reg2base, hari: hitung(aksi), perHari, hitung, baseAksi: id => aksi.filter(a => (a.base_id || reg2base[a.registrasi]) === id)};
  }
  const namaBase = (D, id) => ((D.peta.base || []).find(b => b.id === id)?.nama || id || "–").split(" / ")[0];

  function udara(D) {
    const u = U(), P = D.peta, base = P.base || [], ar = P.armada || [], g = u.hitungGuna(ar), lapor = ar.filter(a => a.status).length, siap = ar.filter(a => SIAP.includes(a.status)).length;
    const H = D.hari, temApi = (P.temuan || []).filter(x => x.status !== "clear").length, tgl = esc(tglPanjang(D.t));
    const angka = (n, t, k) => `<div><b>${n}</b><span>${t}${k ? `<em>${k}</em>` : ""}</span></div>`;
    /* belum lapor != nol siap: tanpa laporan gelar armada, siap ditulis "–"; kotak tanpa isi diganti satu baris keterangan */
    const kegiatan = [H.sortie && angka(fmt(H.sortie), "sortie"), H.wb && angka(fmt(H.wb), "aksi water bombing", H.drop ? `${fmt(H.drop)} kali jatuhan` : ""),
      H.dinilai && angka(u.persen(H.persen), "padam ≥ 24 jam", `${fmt(H.padam)} dari ${fmt(H.dinilai)} dinilai`),
      (P.temuan || []).length && angka(nol(temApi), "temuan api pilot", `${fmt(P.temuan.length)} temuan total`)].filter(Boolean);
    const kosong = [!lapor && "status armada (laporan gelar armada WA)", !H.sortie && "sortie", !(P.temuan || []).length && "temuan api pilot"].filter(Boolean);
    const ringkas = `<div class="ops-lap-angka" style="--n:${Math.max(4, 2 + kegiatan.length)}">${[angka(fmt(base.length), "base operasi udara"),
      angka(`${lapor ? fmt(siap) : "–"}<small>/${fmt(ar.length)}</small>`, "armada siap", lapor ? `WB ${fmt(g.wb)}, PTR ${fmt(g.patroli)}, OMC ${fmt(g.omc)}` : `belum lapor; WB ${fmt(g.wb)}, PTR ${fmt(g.patroli)}, OMC ${fmt(g.omc)}`),
      ...kegiatan].join("")}</div>${kosong.length ? `<p class="ops-kosong">Belum ada ${kosong.join(", ")} untuk ${tgl}.</p>` : ""}`;
    return [
      bagian(`${ik("udara")} Operasi udara`, lapor ? `${hl(`${fmt(siap)} dari ${fmt(ar.length)}`)} armada siap di ${fmt(base.length)} base, ${H.sortie ? `${hl(fmt(H.sortie))} sortie` : "belum ada sortie"} pada ${tgl}`
        : `${hl(fmt(ar.length))} armada di ${fmt(base.length)} base; status harian ${tgl} belum dilaporkan`, ringkas),
      kartuBase(D), kartuRenlap(D), kartuAksi(D), kartuTren(D), kartuHistori(D), kartuOperator(D), kartuJejak(D), kartuTemuan(D), kartuOmc(D), kartuGaleri(D), kartuNilai(D), kartuKontrak(D)].join("");
  }

  function kartuBase(D) {
    const u = U(), adaKl = !!S.kluster?.features?.length;
    const baris = (D.peta.base || []).map(b => { const a = (D.peta.armada || []).filter(x => x.base_id === b.id), gg = u.hitungGuna(a), k = D.hitung(D.baseAksi(b.id)), lay = u.kelayakan(b);
      const dk = adaKl ? u.apiDekat(b) : null, p3 = dk ? dk.filter(c => c.level >= 3).length : null, lv = dk ? (p3 ? 3 : dk.some(c => c.level === 2) ? 2 : dk.length ? 1 : 0) : null;
      const lapor = a.some(x => x.status);
      return {p3: p3 || 0, lv, sel: [kiri(`<b>${esc(b.nama.split(" / ")[0])}</b><small>${esc(b.icao || b.id)}</small>`), `<td>${esc(u.PROV_PDK[b.prov] || b.prov || "–")}</td>`,
        sel(nol(gg.wb)), sel(nol(gg.patroli)), sel(nol(gg.omc)), sel(`${lapor ? fmt(a.filter(x => SIAP.includes(x.status)).length) : "–"}/${fmt(a.length)}`), sel(nol(k.sortie)), sel(nol(k.wb)), sel(u.persen(k.persen)),
        sel(p3 == null ? "–" : `<b>${nol(p3)}</b>`), `<td>${lv == null ? "–" : lv ? `<span class="pill l${lv}">${u.LV[lv]}</span>` : `<span class="pill l0">Aman</span>`}</td>`, `<td>${u.pilLayak(lay)}<small>${esc(lay.ket)}</small></td>`]}; }).sort((x, y) => y.p3 - x.p3);
    const kepala = ["Base", "Prov", "#WB", "#PTR", "#OMC", "#Siap|Armada siap dari laporan gelar armada WA; – = belum lapor", "#Sortie", "#Aksi WB", "#Padam|Tidak ada titik panas satelit dalam 1 km selama 24 jam sesudah water bombing",
      `#Cluster prioritas|Cluster prioritas aktif dalam jangkauan jelajah armada (bawaan ${fmt(u.RADIUS_KM)} km), kondisi kini`,
      `Status api|Level cluster tertinggi dalam jangkauan jelajah armada: ${u.LV.slice(1).join(", ")}; Aman = tidak ada cluster aktif`, "Kelayakan terbang|METAR terdekat ≤ 60 km, kondisi kini; basi bila lebih dari 3 jam"];
    /* kolom kegiatan (sortie, aksi WB, padam, cluster) yang kosong di semua base dilipat */
    const lipat = new Set([6, 7, 8, 9].filter(i => baris.every(x => />–(<\/b>)?<\/td>$/.test(x.sel[i]))));
    const nP = baris.filter(x => x.p3).length;
    const perLv = [2, 1].map(l => [l, baris.filter(x => x.lv === l).length]).filter(([, n]) => n).map(([l, n]) => `${hl(fmt(n))} base ${u.LV[l]}`);
    const judul = nP ? `${hl(fmt(nP))} dari ${fmt(baris.length)} base punya cluster prioritas dalam jangkauan`
      : perLv.length ? `${perLv.join(", ")}; belum ada cluster prioritas dalam jangkauan` : "Belum ada cluster prioritas dalam jangkauan base";
    return bagian("Base", judul, tabelH(kepala.filter((_, i) => !lipat.has(i)), baris.map(x => `<tr>${x.sel.filter((_, i) => !lipat.has(i)).join("")}</tr>`), "Belum ada base tercatat."));
  }

  /* fitur 4 + 5: renlap lawan realisasi, dengan alasan tiap target */
  function kartuRenlap(D) {
    const rl = D.peta.renlap || [], baris = [];
    let datang = 0, total = 0;
    for (const r of rl) for (const g of r.target || []) {
      total++;
      const kandidat = D.aksi.filter(a => a.lat != null && (a.base_id || D.reg2base[a.registrasi]) === r.base_id).map(a => ({...a, jarak: km(g.lat, g.lon, a.lat, a.lon)})).filter(a => a.jarak <= RENLAP_KM).sort((x, y) => x.jarak - y.jarak);
      const a = kandidat[0], h = a ? (U().HASIL[a.hasil] || U().HASIL.tak_dinilai) : null; if (a) datang++;
      const alasan = Array.isArray(g.alasan) ? g.alasan.map(x => typeof x === "string" ? x : x?.teks || x?.ket || "").filter(Boolean).join("; ") : typeof g.alasan === "string" ? g.alasan : g.alasan ? Object.entries(g.alasan).map(([k, v]) => `${k} ${v}`).join(", ") : "";
      baris.push(`<tr><td>${esc(namaBase(D, r.base_id))}<small>${esc(r.versi || "")}</small></td>${sel(fmt(g.urut ?? baris.length + 1))}
        ${kiri(`${esc(g.lokasi || g.nama || g.jenis || "Target")} <a href="${U().gmaps(g.lat, g.lon)}" target="_blank" rel="noopener noreferrer">koordinat</a>${alasan ? `<small>${esc(alasan)}</small>` : ""}`)}
        <td>${a ? `<span class="pill l0">Didatangi</span><small>${esc(a.registrasi)} ${U().jamWIB(a.jam_utc)} WIB, ${fmt(Math.round(a.jarak * 10) / 10)} km</small>` : `<span class="pill l3">Belum didatangi</span>`}</td>
        <td>${h ? `<span class="pill ${h[1]}">${h[0]}</span>` : "–"}</td></tr>`);
    }
    const judul = total ? `${hl(`${fmt(datang)} dari ${fmt(total)}`)} target renlap didatangi armada` : `Belum ada renlap untuk ${esc(tglPanjang(D.t))}`;
    return bagian("Renlap", judul, tabelH(["Base", "#Urut", "Target dan alasan", `Realisasi|Ada aksi armada base itu ≤ ${RENLAP_KM} km dari target pada hari yang sama`, "Hasil"], baris,
      "Renlap disusun otomatis pukul 20.00 dan 07.00 WIB oleh mesin Pusdalops, lalu muncul di sini."));
  }

  function kartuAksi(D) {
    const u = U(), baris = D.aksi.map(x => { const h = u.HASIL[x.hasil] || u.HASIL.tak_dinilai;
      return `<tr>${sel(u.jamWIB(x.jam_utc))}<td><b>${esc(x.registrasi)}</b></td><td>${esc(namaBase(D, x.base_id))}</td><td>${esc(MISI[x.guna] || x.jenis)}</td>
        ${kiri(`${esc(x.lokasi || "Lokasi belum tercatat")}${x.lat != null ? ` <a href="${u.gmaps(x.lat, x.lon)}" target="_blank" rel="noopener noreferrer">koordinat</a>` : ""}`)}
        ${sel(nol(x.drop))}${sel(x.titik_dekat == null ? "–" : fmt(x.titik_dekat))}<td><span class="pill ${h[1]}">${h[0]}</span></td>${sel(nol((x.foto || []).length))}</tr>`; });
    return bagian("Aksi armada", D.aksi.length ? `${hl(fmt(D.aksi.length))} aksi armada${D.hari.dinilai ? `, ${hl(u.persen(D.hari.persen))} padam ≥ 24 jam` : ""}` : `Belum ada aksi armada tercatat pada ${esc(tglPanjang(D.t))}`,
      tabelH(["#Jam WIB", "Armada", "Base", "Misi", "Lokasi", "#Jatuhan", "#Titik ≤ 1 km|Titik panas satelit dalam 1 km sesudah aksi", "Hasil|Padam = tanpa titik panas 1 km selama 24 jam; patroli dan OMC tidak dinilai", "#Foto"], baris,
        D.mon ? "Laporan WA satgas belum memuat aksi pada tanggal ini." : "Data monitoring belum tersedia."));
  }

  /* fitur 3: tren 30 hari, batang kecil sejajar */
  function batang(nilai, label, warna, fmtV = fmt) {
    const W = 600, Hh = 74, n = nilai.length, w = W / n, m = Math.max(1, ...nilai.map(v => v || 0));
    return `<div class="ops-tren"><b>${label}</b><svg viewBox="0 0 ${W} ${Hh + 16}" preserveAspectRatio="none" role="img" aria-label="${esc(label)} 30 hari">
      ${nilai.map((v, i) => { const h = (v || 0) / m * Hh; return `<rect x="${i * w + 1}" y="${Hh - h}" width="${Math.max(1, w - 2)}" height="${Math.max(v ? 1.5 : 0, h)}" rx="1.5" fill="${warna}"><title>${esc(tglPendek(st._d.perHari[i].t))}: ${v == null ? "–" : fmtV(v)}</title></rect>`; }).join("")}
      <text x="0" y="${Hh + 13}" font-size="10" fill="currentColor" opacity=".6">${esc(tglPendek(st._d.perHari[0].t))}</text><text x="${W}" y="${Hh + 13}" font-size="10" text-anchor="end" fill="currentColor" opacity=".6">${esc(tglPendek(st._d.perHari[n - 1].t))}</text></svg>
      <span>${fmtV(nilai.reduce((s, v) => s + (v || 0), 0))} total, puncak ${fmtV(m)}</span></div>`;
  }
  function kartuTren(D) {
    const ph = D.perHari, h30 = D.h30, idx = h30 ? Object.fromEntries(h30.hari.map((t, i) => [t, i])) : {};
    const titik = ph.map(p => idx[p.t] == null ? null : Object.values(h30.prov).reduce((s, arr) => s + (arr[idx[p.t]] || 0), 0));
    const aktif = ph.filter(p => p.sortie).length, tot = ph.reduce((s, p) => s + p.sortie, 0);
    return bagian("Tren 30 hari", aktif ? `${hl(fmt(tot))} sortie dalam ${hl(fmt(aktif))} hari beroperasi, ${esc(tglPendek(D.dari))} sampai ${esc(tglPendek(D.t))}` : "Belum ada sortie tercatat dalam 30 hari terakhir",
      `<div class="ops-tren-grid">${batang(ph.map(p => p.sortie), "Sortie", "#1d4e89")}${batang(ph.map(p => p.wb), "Aksi water bombing", "#4f8fc4")}
        ${batang(ph.map(p => p.padam), "Aksi padam ≥ 24 jam", "#5a9e74")}${batang(titik, "Titik panas nasional", "#c9503a")}</div>`);
  }

  /* fitur 2: histori satu armada 30 hari */
  function kartuHistori(D) {
    const u = U(), ar = (D.peta.armada || []).slice().sort((x, y) => x.registrasi.localeCompare(y.registrasi)), aktif = new Set(D.aksi30.map(a => a.registrasi));
    /* pilihan pengguna dipertahankan antar-tanggal; tanpa pilihan = armada pertama yang beraksi dalam 30 hari */
    const reg = st.reg && ar.some(a => a.registrasi === st.reg) ? st.reg : (ar.find(a => aktif.has(a.registrasi)) || ar[0])?.registrasi || "";
    const a = ar.find(x => x.registrasi === reg), pilih = `<select data-reg aria-label="Pilih armada">${kelompokBase(ar, D.peta.base).map(g => `<optgroup label="${esc(g.nama)}">${g.regs.map(r => `<option value="${esc(r)}"${r === reg ? " selected" : ""}>${esc(r)}${aktif.has(r) ? " ●" : ""}</option>`).join("")}</optgroup>`).join("")}</select>`;
    if (!a) return `<div id="opsHistori">${bagian("Histori armada", "Belum ada armada tercatat", "")}</div>`;
    const ak = D.aksi30.filter(x => x.registrasi === a.registrasi).sort((x, y) => (y.jam_utc || 0) - (x.jam_utc || 0)), k = D.mon?.kpi?.armada?.[a.registrasi], kt = u.kontrak(a.registrasi), s = u.stAr(a.status);
    const jam = kt.reduce((t, x) => t + (x.jam_operasi_menit || 0), 0), hh = D.hitung(ak);
    const angka = (n, t) => `<div><b>${n}</b><span>${t}</span></div>`;
    const isi = `<div class="ops-hist-atas">${u.fotoAr(a) ? u.imgAr(a, "", a.registrasi) : ""}
        <div><p><b>${esc(/tidak diketahui/i.test(a.tipe || "") ? "Tipe belum tercatat" : a.tipe || "")}</b>, ${esc(PERAN[a.peran] || a.peran || "")}, base ${esc(namaBase(D, a.base_id))}</p>
        <p class="ops-red">${esc(a.operator || "Operator belum tercatat")}${a.bucket_liter ? `, bucket ${fmt(a.bucket_liter)} L` : ""}. Status ${esc(tglPendek(D.t))}: <span class="ops-st ${s[1]}">${s[0]}</span>${a.alasan ? ` ${esc(a.alasan)}` : ""}</p></div></div>
      <div class="ops-lap-angka ops-6">${[angka(nol(hh.sortie), "sortie 30 hari"), angka(nol(hh.wb), "aksi WB"), angka(u.persen(hh.persen), "padam ≥ 24 jam"),
        angka(k ? `${fmt(siapTerbang(k))}/${fmt(k.hari_siap)}` : "–", "hari siap yang terbang / siap"), angka(k?.respons_median_menit != null ? fmt(Math.round(k.respons_median_menit)) + " mnt" : "–", "respons median"),
        angka(kt.length ? fmt(Math.round(jam / 60)) + " jam" : "–", `operasi 2026, ${fmt(kt.length)} kontrak`)].join("")}</div>
      ${tabelH(["Tanggal", "#Jam WIB", "Misi", "Lokasi", "#Jatuhan", "Hasil"], ak.slice(0, 15).map(x => { const h = u.HASIL[x.hasil] || u.HASIL.tak_dinilai;
        return `<tr><td>${esc(tglPendek(x.tanggal))}</td>${sel(u.jamWIB(x.jam_utc))}<td>${esc(MISI[x.guna] || x.jenis)}</td>${kiri(esc(x.lokasi || "–"))}${sel(nol(x.drop))}<td><span class="pill ${h[1]}">${h[0]}</span></td></tr>`; }), "Belum ada aksi tercatat untuk armada ini dalam 30 hari.")}
      ${kt.length ? tabelH(["#Kontrak", "Periode", "Jenis", "#Jam operasi", "#Sortie", "#Jatuhan WB"], kt.map(x => `<tr>${sel(fmt(x.kontrak_ke))}<td>${esc(x.periode_teks || "–")}${x.berjalan ? ` <span class="pill l0">berjalan</span>` : ""}</td><td>${esc(PERAN[x.jenis] || x.jenis)}</td>${sel(u.jamMenit(x.jam_operasi_menit))}${sel(nol(x.sortie))}${sel(nol(x.wb_drop))}</tr>`), "") : ""}`;
    return `<div id="opsHistori">${bagian("Histori armada", `${hl(esc(a.registrasi))}: ${hh.sortie ? `${hl(fmt(hh.sortie))} sortie dalam 30 hari` : "belum ada sortie dalam 30 hari"}`, isi, pilih)}</div>`;
  }

  /* Hari terbang bisa jatuh di hari tanpa laporan status, jadi terbang/siap bisa di atas 100%. Pembilang utilisasi = hari siap yang juga terbang;
     API mengirim rasionya (3 desimal), hari_siap maksimal 31 per pesawat, jadi pembulatan mengembalikan bilangan bulatnya persis. */
  function siapTerbang(k) { return Math.round((k.utilisasi || 0) * (k.hari_siap || 0)); }

  /* fitur 10: utilisasi dan rapor operator (30 hari) */
  function kartuOperator(D) {
    const u = U(), kp = D.mon?.kpi?.armada || {}, grup = {};
    for (const a of D.peta.armada || []) { const o = a.operator || "Operator belum tercatat", x = grup[o] ||= {n: 0, siap: 0, terbang: 0, siapTerbang: 0, sortie: 0, wb: 0, padam: 0, dinilai: 0, jam: 0, base: {}};
      const k = kp[a.registrasi], nb = a.base_id ? namaBase(D, a.base_id) : "Base belum tercatat"; x.base[nb] = (x.base[nb] || 0) + 1; x.n++; if (k) { x.siap += k.hari_siap || 0; x.terbang += k.hari_terbang || 0; x.siapTerbang += siapTerbang(k); x.sortie += k.sortie || 0; x.wb += k.aksi_wb || 0; x.padam += k.padam || 0; x.dinilai += k.dinilai || 0; }
      x.jam += u.kontrak(a.registrasi).reduce((t, c) => t + (c.jam_operasi_menit || 0), 0); }
    const daf = Object.entries(grup).sort((a, b) => b[1].sortie - a[1].sortie || b[1].jam - a[1].jam || a[0].localeCompare(b[0]));
    const nganggur = daf.filter(([, x]) => x.siap && !x.terbang).length;
    /* lokasi armada per operator, terbanyak dulu (pemilik 9 Nov 2026) */
    const teksBase = b => Object.entries(b).sort((p, q) => q[1] - p[1] || p[0].localeCompare(q[0])).map(([n, j]) => `${esc(n)} (${fmt(j)})`).join(", ");
    const jml = k => daf.reduce((t, [, x]) => t + x[k], 0), semuaBase = new Set(daf.flatMap(([, x]) => Object.keys(x.base).filter(n => n !== "Base belum tercatat")));
    const total = `<tr class="ops-total">${kiri("<b>Grand total</b>")}${kiri(`${fmt(semuaBase.size)} base`)}${sel(fmt(jml("n")))}${sel(nol(jml("siap")))}${sel(nol(jml("terbang")))}${sel(jml("siap") ? u.persen(jml("siapTerbang") / jml("siap")) : "–")}${sel(nol(jml("sortie")))}${sel(nol(jml("wb")))}${sel(jml("dinilai") ? u.persen(jml("padam") / jml("dinilai")) : "–")}${sel(jml("jam") ? fmt(Math.round(jml("jam") / 60)) : "–")}</tr>`;
    return bagian("Operator", daf.some(([, x]) => x.siap) ? `${hl(fmt(daf.length))} operator; ${nganggur ? `${hl(fmt(nganggur))} siap tapi belum terbang dalam 30 hari` : "semua yang siap sudah terbang"}` : `${hl(fmt(daf.length))} operator armada udara; status harian belum dilaporkan`,
      tabelH(["Operator", "Base (jumlah armada)", "#Armada", "#Hari siap", "#Hari terbang", "#Utilisasi|Hari siap yang benar-benar terbang dibagi hari siap, maksimal 100%", "#Sortie", "#Aksi WB", "#Padam", "#Jam 2026"], daf.length ? [total, ...daf.map(([o, x]) => `<tr>${kiri(`<b>${esc(o)}</b>`)}${kiri(teksBase(x.base))}${sel(fmt(x.n))}${sel(nol(x.siap))}${sel(nol(x.terbang))}${sel(x.siap ? u.persen(x.siapTerbang / x.siap) : "–")}${sel(nol(x.sortie))}${sel(nol(x.wb))}${sel(x.dinilai ? u.persen(x.padam / x.dinilai) : "–")}${sel(x.jam ? fmt(Math.round(x.jam / 60)) : "–")}</tr>`)] : [], "Belum ada armada tercatat."));
  }

  /* fitur 6: jejak terbang ADS-B (adsb.fi, posisi tiap jam) */
  function kartuJejak(D) {
    const j = D.jejak, u = U();
    if (!j) return bagian("Jejak ADS-B", "Jejak ADS-B belum tersedia", `<p class="ops-kosong">Rute /api/operasi/jejak belum aktif di server ini.</p>`);
    const baris = (j.jejak || []).map(x => { const p = x.titik || [], akhir = p[p.length - 1] || {};
      return `<tr><td><b>${esc(x.registrasi)}</b><small>${esc(x.hex || "")}</small></td>${sel(fmt(p.length))}${sel(p.length ? `${u.jamWIB(p[0].t)}–${u.jamWIB(akhir.t)}` : "–")}
        ${sel(p.some(q => q.alt != null) ? fmt(Math.max(...p.map(q => q.alt || 0))) + " ft" : "–")}${sel(p.some(q => q.gs != null) ? fmt(Math.round(Math.max(...p.map(q => q.gs || 0)))) + " kt" : "–")}
        <td>${akhir.lat != null ? `<a href="${u.gmaps(akhir.lat, akhir.lon)}" target="_blank" rel="noopener noreferrer">${(+akhir.lat).toFixed(3)}, ${(+akhir.lon).toFixed(3)}</a>` : "–"}</td></tr>`; });
    const judul = !j.aktif ? "Panen ADS-B belum aktif" : baris.length ? `${hl(fmt(baris.length))} armada tertangkap ADS-B pada ${esc(tglPendek(D.t))}`
      : `ADS-B menangkap ${hl(fmt(j.posisi_hari_ini || 0))} posisi pesawat, belum satu pun armada operasi`;
    return bagian("Jejak ADS-B", judul, tabelH(["Armada", "#Posisi|Posisi tiap jam dari adsb.fi", "#Jam WIB", "#Ketinggian maks", "#Kecepatan maks", "Posisi terakhir"], baris,
      "Armada tanpa transponder ADS-B (umumnya TNI AU dan pesawat OMC) tidak terlacak dari sini."));
  }

  function kartuTemuan(D) {
    const u = U(), NAMA = {fs: "FS berasap", berasap: "Berasap", berasap_tipis: "Berasap tipis", clear: "Clear"}, tm = D.peta.temuan || [], api = tm.filter(x => x.status !== "clear").length;
    const baris = tm.slice().sort((x, y) => (x.status === "clear") - (y.status === "clear") || (x.registrasi || "").localeCompare(y.registrasi || "")).map(x => `<tr>${sel(u.jamWIB(x.jam_utc))}<td><b>${esc(x.registrasi)}</b></td>
      <td><span class="pill ${{clear: "l0", berasap_tipis: "l2"}[x.status] || "l3"}">${esc(NAMA[x.status] || x.status)}</span></td>${kiri(`${esc(x.lokasi || "–")}${x.lat != null ? ` <a href="${u.gmaps(x.lat, x.lon)}" target="_blank" rel="noopener noreferrer">koordinat</a>` : ""}`)}${sel(x.luas_ha != null ? fmt(x.luas_ha) + " ha" : "–")}</tr>`);
    return bagian("Temuan pilot", tm.length ? `${hl(fmt(api))} titik api dilaporkan pilot dari ${fmt(tm.length)} temuan` : `Belum ada temuan pilot pada ${esc(tglPanjang(D.t))}`,
      tabelH(["#Jam WIB", "Armada", "Status", "Lokasi", "#Luas"], baris, "Pilot patroli belum melaporkan temuan."));
  }

  /* fitur 13: modifikasi cuaca (sortie OMC + penilaian efek) */
  function kartuOmc(D) {
    const s = D.omc, kg = s.reduce((t, x) => t + (x.kg || 0), 0), hasil = D.omcHasil?.ringkas || {};
    const NAMA = {dry_ice: "Dry ice", nacl: "NaCl", cacl2: "CaCl2"}, jam = x => x ? new Date(Date.parse(x) + 7 * 36e5).toISOString().slice(11, 16) : "–";
    const baris = s.slice().sort((a, b) => (b.mulai || "").localeCompare(a.mulai || "")).slice(0, 40).map(x => `<tr><td>${x.mulai ? esc(tglPendek(x.mulai.slice(0, 10))) : "–"}</td>${sel(`${jam(x.mulai)}–${jam(x.selesai)}`)}<td>${esc(x.pesawat || "–")}</td>
      <td>${esc(NAMA[x.bahan] || x.bahan || "–")}</td>${sel(x.kg != null ? fmt(x.kg) + " kg" : "–")}${kiri(esc((x.sasaran_kab || []).map(k => k.nama || k).join(", ") || "–"))}</tr>`);
    const efek = Object.entries(hasil).map(([k, v]) => `<p class="ops-efek"><span class="pill ops-abu">${esc(NAMA[k] || k)}</span> ${esc(v.kalimat || "")}</p>`).join("");
    return bagian("Modifikasi cuaca", s.length ? `${hl(fmt(s.length))} sortie OMC dalam 30 hari, ${hl(fmt(Math.round(kg)) + " kg")} bahan semai` : "Belum ada sortie OMC tercatat dalam 30 hari",
      `${efek}${tabelH(["Tanggal", "#Jam WIB", "Pesawat", "Bahan", "#Bahan", "Sasaran"], baris, "")}`);
  }

  /* armada dikelompokkan per base (pemilik 5 Nov 2026); base dari peta.armada[].base_id + peta.base[].nama, tanpa data = "Base belum tercatat" paling akhir */
  function kelompokBase(armada, base) {
    const nama = id => ((base || []).find(b => b.id === id)?.nama || "").split(" / ")[0], g = new Map();
    for (const a of armada || []) { const n = nama(a.base_id), k = n ? a.base_id : ""; if (!g.has(k)) g.set(k, {id: k, nama: n || "Base belum tercatat", regs: []}); g.get(k).regs.push(a.registrasi); }
    return [...g.values()].map(x => ({...x, regs: x.regs.sort()})).sort((x, y) => (!x.id) - (!y.id) || x.nama.localeCompare(y.nama));
  }

  /* foto dokumentasi per tanggal (terbaru dulu), di dalamnya per base (pemilik 9 Nov 2026); tanpa base = "Base belum tercatat" paling akhir */
  function kelompokFoto(foto, base) {
    const nama = id => ((base || []).find(b => b.id === id)?.nama || "").split(" / ")[0], T = new Map();
    for (const f of foto) { if (!T.has(f.tanggal)) T.set(f.tanggal, new Map()); const B = T.get(f.tanggal), n = nama(f.base), k = n ? f.base : ""; if (!B.has(k)) B.set(k, {id: k, nama: n || "Base belum tercatat", foto: []}); B.get(k).foto.push(f); }
    return [...T].sort(([a], [b]) => String(b).localeCompare(String(a))).map(([tanggal, B]) => { const base = [...B.values()].sort((x, y) => (!x.id) - (!y.id) || x.nama.localeCompare(y.nama)); return {tanggal, n: base.reduce((t, b) => t + b.foto.length, 0), base}; });
  }

  /* fitur 15: galeri foto dokumentasi dari laporan WA satgas (30 hari) */
  function kartuGaleri(D) {
    const u = U(), semua = D.aksi30.flatMap(a => (a.foto || []).map(f => ({...f, reg: a.registrasi, base: a.base_id || D.reg2base[a.registrasi], tanggal: a.tanggal, lokasi: a.lokasi, guna: a.guna, hasil: a.hasil}))).sort((x, y) => (y.jam_utc || 0) - (x.jam_utc || 0));
    const regs = [...new Set(semua.map(f => f.reg))].sort(), grup = kelompokBase(regs.map(r => ({registrasi: r, base_id: D.reg2base[r]})), D.peta.base);
    const ok = new Set([...regs, ...grup.map(g => "base:" + g.id)]), pilih = st.galeri && ok.has(st.galeri) ? st.galeri : "";
    const boleh = pilih.startsWith("base:") ? new Set(grup.find(g => "base:" + g.id === pilih).regs) : pilih ? new Set([pilih]) : null, foto = boleh ? semua.filter(f => boleh.has(f.reg)) : semua;
    const opsi = (v, t) => `<option value="${esc(v)}"${v === pilih ? " selected" : ""}>${esc(t)}</option>`;
    const saring = regs.length > 1 ? `<select data-galeri aria-label="Saring armada atau base"><option value="">Semua armada</option>${grup.map(g => `<optgroup label="${esc(g.nama)}">${g.regs.length > 1 ? opsi("base:" + g.id, "Semua armada di " + g.nama) : ""}${g.regs.map(r => opsi(r, r)).join("")}</optgroup>`).join("")}</select>` : "";
    return `<div id="opsGaleri">${bagian("Dokumentasi", semua.length ? `${hl(fmt(semua.length))} foto dokumentasi dari ${fmt(regs.length)} armada dalam 30 hari` : "Belum ada foto dokumentasi dalam 30 hari",
      foto.length ? kelompokFoto(foto, D.peta.base).map((h, i) => `<details class="ops-gl-hari"${i ? "" : " open"}><summary>${esc(tglPendek(h.tanggal))}<small>${fmt(h.n)} foto, ${fmt(h.base.length)} base</small></summary>${h.base.map(b => `<h4 class="ops-gl-base">${esc(b.nama)}<small>${fmt(b.foto.length)} foto</small></h4><div class="ops-galeri">${b.foto.map(f => `<a href="${esc(f.url)}" target="_blank" rel="noopener noreferrer"><img src="${esc(f.url)}" alt="Dokumentasi ${esc(f.reg)} ${esc(f.tanggal)}" loading="lazy"><span><b>${esc(f.reg)}</b> ${u.jamWIB(f.jam_utc)} WIB${f.lokasi ? `<br>${esc(f.lokasi)}` : ""}</span></a>`).join("")}</div>`).join("")}</details>`).join("")
        : `<p class="ops-kosong">Foto dari grup WA satgas udara muncul di sini begitu ditempel ke aksi armada.</p>`, saring)}</div>`;
  }

  function kartuNilai(D) {
    const O = window.OperasiLapangan, v = D.nilai;
    if (!O || !v) return bagian("Efektivitas", "Nilai efektivitas belum tersedia", "");
    return bagian("Efektivitas", `Nilai efektivitas ${esc(O.tanggalIndo(v.dari))} sampai ${esc(O.tanggalIndo(v.sampai))}`,
      `<div class="ops-lap-nilai">${O.KODE_NILAI.map(k => { const m = O.METRIK[k], t = O.tampilMetrik(k, (v.semua || {})[k]);
        return `<div class="ops-nl${t.kosong ? " ops-redup" : ""}"><span class="ops-kode">${k}</span><h3>${esc(m.nama)}</h3><b>${esc(t.kosong ? t.pesan : t.angka)}</b><small>${esc(t.rincian || "")}</small></div>`; }).join("")}</div>`);
  }

  function kartuKontrak(D) {
    const u = U(), R = u.OP.rekap, tot = (R?.total || []).reduce((a, x) => ({jam: a.jam + (x.jam_operasi_menit || 0), sortie: a.sortie + (x.sortie || 0), wb: a.wb + (x.wb_drop || 0), n: a.n + (x.kontrak || 0)}), {jam: 0, sortie: 0, wb: 0, n: 0});
    const baris = (R?.total || []).slice().sort((x, y) => (x.prov + x.jenis).localeCompare(y.prov + y.jenis)).map(x => `<tr><td>${esc(u.PROV_PDK[x.prov] || x.prov)}</td><td>${esc(PERAN[x.jenis] || x.jenis)}</td>${sel(fmt(x.kontrak))}${sel(u.jamMenit(x.jam_operasi_menit))}${sel(nol(x.sortie))}${sel(nol(x.wb_drop))}${sel(x.liter ? fmt(Math.round(x.liter / 1e5) / 10) + " jt" : "–")}</tr>`);
    return bagian("Kontrak 2026", `${hl(fmt(Math.round(tot.jam / 60)) + " jam")} operasi udara dari ${fmt(tot.n)} kontrak 2026, ${hl(fmt(tot.sortie))} sortie`,
      tabelH(["Provinsi", "Jenis", "#Kontrak", "#Jam operasi", "#Sortie", "#Jatuhan WB", "#Liter"], baris, "Rekap kontrak belum termuat."));
  }

  /* ---------------- operasi darat ---------------- */
  const UNSUR = [["TNI", "TNI"], ["Polri", "Polri"], ["Manggala Agni", "Manggala Agni"], ["personil BPBD", "BPBD"], ["Pemda", "Pemda"], ["Polisi Hutan", "Polisi Hutan"], ["MPA", "MPA"], ["Relawan", "Relawan"], ["Satpol PP", "Satpol PP"], ["Perusahaan", "Perusahaan"], ["personil pemerintah pusat", "Pusat"]];
  const angkaSah = v => typeof v === "number" ? v : Number.isFinite(+v) && v !== "" && v !== "-" ? +v : null;
  function darat(D) {
    const snap = D.snap?.snapshot, b = D.bnpb, resmi = D.resmi, tglB = b?.updatedAt ? b.updatedAt.slice(0, 10) : null;
    const sumber = snap ? `laporan karhutla terkunci ${tglPendek(D.t)}` : tglB ? `rekap BNPB terakhir ${tglPendek(tglB)}` : "";
    /* personel per provinsi: snapshot bila ada, selain itu rekap BNPB per provinsi */
    const prov = snap ? (snap.provinsi || []).map(p => ({nama: p.nama || u0(p.kode), total: p.personel?.total ?? null, unsur: p.personel?.unsur || {}, ditangani: p.total?.padam_ha ?? null, sisa: p.total?.sisa_ha ?? null, peralatan: p.peralatan || [], hambatan: p.hambatan?.teks || (p.hambatan?.pilihan || []).join(", "), upaya: p.upaya?.teks || (p.upaya?.pilihan || []).join(", ")}))
      : (b?.rows || []).map(r => ({nama: r.Provinsi, total: angkaSah(r["Total Personel"]), unsur: Object.fromEntries(UNSUR.map(([k, n]) => [n, angkaSah(r[k])])), ditangani: angkaSah(r["luas lahan ditangani darat"]), sisa: angkaSah(r["luas lahan yang akan dipadamkan"]), peralatan: [], hambatan: "", upaya: r.rekomendasi || ""}));
    const totP = prov.reduce((s, p) => s + (p.total || 0), 0), unsurNama = snap ? [...new Set(prov.flatMap(p => Object.keys(p.unsur)))] : UNSUR.map(([, n]) => n);
    const hapusKosong = unsurNama.filter(n => prov.some(p => p.unsur[n]));
    const kepalaUnsur = ["Provinsi", "#Total", ...hapusKosong.map(n => "#" + n)];
    const barisP = prov.slice().sort((a, b) => (b.total || 0) - (a.total || 0)).map(p => `<tr>${kiri(`<b>${esc(p.nama)}</b>`)}${sel(`<b>${nol(p.total)}</b>`)}${hapusKosong.map(n => sel(nol(p.unsur[n]))).join("")}</tr>`);
    const angka = (n, t, k) => `<div><b>${n}</b><span>${t}${k ? `<em>${k}</em>` : ""}</span></div>`;
    const ringkas = `<div class="ops-lap-angka">${[angka(nol(totP || resmi?.personel_darat), "personel darat", sumber),
      angka(resmi ? fmt(resmi.dipadamkan_total_ha) + "<small> ha</small>" : "–", "lahan dipadamkan", resmi ? `kumulatif s.d. ${tglPendek(resmi.per)}` : ""),
      angka(resmi ? fmt((resmi.belum_padam_ha?.prioritas_6_prov || 0) + (resmi.belum_padam_ha?.lainnya || 0)) + "<small> ha</small>" : "–", "belum padam", resmi ? `per ${tglPendek(resmi.per)}` : ""),
      angka(resmi?.padam_hari_sama_pct != null ? fmt(resmi.padam_hari_sama_pct) + "%" : "–", "padam di hari yang sama", resmi ? `per ${tglPendek(resmi.per)}` : ""),
      angka(fmt(prov.length), "provinsi melapor"), angka(D.patroli ? fmt(patroliHari(D).length) : "–", "patroli regu terjadwal", tglPendek(D.t))].join("")}</div>`;
    const barisLuas = prov.filter(p => p.ditangani != null || p.sisa != null).sort((a, b) => (b.ditangani || 0) - (a.ditangani || 0)).map(p => `<tr>${kiri(`<b>${esc(p.nama)}</b>`)}${sel(p.ditangani == null ? "–" : fmt(p.ditangani) + " ha")}${sel(p.sisa == null ? "–" : fmt(p.sisa) + " ha")}${kiri(esc(p.upaya || p.hambatan || "–"))}</tr>`);
    const dipadamkan = resmi ? Object.entries(resmi.dipadamkan_ha).sort((a, b) => b[1] - a[1]).map(([k, v]) => `<tr>${kiri(`<b>${esc(k === "lainnya" ? "Lainnya" : (window.Wilayah?.PROV?.[k] || namaProvSah(k)))}</b>`)}${sel(fmt(v) + " ha")}${sel(fmt(Math.round(v / resmi.dipadamkan_total_ha * 1000) / 10) + "%")}</tr>`) : [];
    return [
      bagian(`${ik("darat")} Operasi darat`, totP || resmi?.personel_darat ? `${hl(fmt(totP || resmi.personel_darat) + " personel")} darat di ${fmt(prov.length)} provinsi${snap ? "" : `, angka ${esc(sumber)}`}` : "Personel darat belum dilaporkan", ringkas),
      bagian("Personel", snap ? `Kekuatan personel per unsur pada ${esc(tglPanjang(D.t))}` : `Kekuatan personel per unsur, ${hl(esc(sumber))}`, tabelH(kepalaUnsur, barisP, "Laporan provinsi belum dikunci untuk tanggal ini.")),
      bagian("Penanganan lahan", barisLuas.length ? `${hl(fmt(Math.round(barisLuas.length)))} provinsi melaporkan luas penanganan darat` : "Luas penanganan darat belum dilaporkan",
        tabelH(["Provinsi", "#Ditangani darat", "#Akan dipadamkan", "Upaya dan rekomendasi"], barisLuas, "Belum ada angka luas penanganan darat.")),
      resmi ? bagian("Dipadamkan 2026", `${hl(fmt(resmi.dipadamkan_total_ha) + " ha")} lahan dipadamkan s.d. ${esc(tglPanjang(resmi.per))}`, tabelH(["Provinsi", "#Luas", "#Porsi"], dipadamkan, "")) : "",
      kartuPatroli(D)].join("");
  }
  const namaProvSah = k => typeof namaProv === "function" ? namaProv(k) : k;
  const u0 = k => namaProvSah(k);
  const patroliHari = D => (D.patroli || []).filter(p => new Date(p.jadwal + 7 * 36e5).toISOString().slice(0, 10) === D.t);
  /* fitur 7: patroli dan kunjungan regu darat (titik GPS kunjungan dari /petugas dan aplikasi regu) */
  function kartuPatroli(D) {
    const u = U(), ph = patroliHari(D), ST = {terjadwal: ["Terjadwal", "l1"], dikunjungi: ["Dikunjungi", "l0"], terlewat: ["Terlewat", "l3"]};
    const baris = ph.map(p => { const k = (p.kunjungan || [])[0], s = ST[p.status] || [p.status, "ops-abu"];
      return `<tr>${sel(u.jamWIB(p.jadwal))}${kiri(`<b>${esc([p.desa, p.kec].filter(Boolean).join(", "))}</b><small>${esc(p.kab)}</small>`)}<td>${esc({risiko: "Risiko tinggi", khg: "KHG", lainnya: "Lainnya"}[p.alasan] || p.alasan)}</td>
        <td><span class="pill ${s[1]}">${s[0]}</span></td><td>${k ? `<a href="${u.gmaps(k.lat, k.lon)}" target="_blank" rel="noopener noreferrer">${u.jamWIB(k.pada)} WIB</a>${k.akurasi != null ? `<small>akurasi ${fmt(Math.round(k.akurasi))} m</small>` : ""}` : "–"}</td></tr>`; });
    const datang = ph.filter(p => p.status === "dikunjungi").length;
    return bagian("Patroli regu", D.patroli == null ? "Data patroli regu belum bisa dibaca" : ph.length ? `${hl(`${fmt(datang)} dari ${fmt(ph.length)}`)} patroli regu dikunjungi, titik GPS tercatat` : `Belum ada patroli regu terjadwal pada ${esc(tglPanjang(D.t))}`,
      tabelH(["#Jadwal", "Lokasi", "Alasan", "Status", "Kunjungan GPS"], baris, "Patroli dijadwalkan dari layar Operasi Lapangan; kunjungan dicatat regu dari ponsel dengan titik GPS."));
  }

  /* ---------------- fitur 1: teks WA laporan harian ---------------- */
  async function salin(tb) {
    const D = st._d; if (!D) return;
    const u = U(), P = D.peta, ar = P.armada || [], siap = ar.filter(a => SIAP.includes(a.status)).length, H = D.hari, tm = P.temuan || [];
    const baris = [`*LAPORAN OPERASI UDARA KARHUTLA*`, `_${tglPanjang(D.t)}_`, "",
      `Armada: ${fmt(ar.length)} unit di ${fmt((P.base || []).length)} base${ar.some(a => a.status) ? `, ${fmt(siap)} siap` : " (status harian belum dilaporkan)"}.`,
      `Sortie: ${fmt(H.sortie)}; water bombing ${fmt(H.wb)} aksi${H.drop ? `, ${fmt(H.drop)} jatuhan` : ""}${H.dinilai ? `; padam ≥ 24 jam ${u.persen(H.persen)} (${fmt(H.padam)} dari ${fmt(H.dinilai)})` : ""}.`,
      `Temuan pilot: ${fmt(tm.filter(x => x.status !== "clear").length)} titik api dari ${fmt(tm.length)} temuan.`, ""];
    for (const b of P.base || []) { const k = D.hitung(D.baseAksi(b.id)); if (k.sortie) baris.push(`- ${b.nama.split(" / ")[0]}: ${fmt(k.sortie)} sortie, ${fmt(k.wb)} WB${k.dinilai ? `, padam ${u.persen(k.persen)}` : ""}`); }
    const rl = (P.renlap || []).reduce((s, r) => s + (r.target || []).length, 0); if (rl) baris.push("", `Renlap: ${fmt(rl)} target.`);
    try { await navigator.clipboard.writeText(baris.join("\n")); status("Teks WA disalin."); } catch (e) { status("Gagal menyalin; izinkan papan klip di peramban."); }
    setTimeout(() => status(""), 3000);
  }

  window.OperasiLaporan = {render, kelompokBase, kelompokFoto, kartuOperator};
  if (document.querySelector("#p-operasi.on")) render();
})();
