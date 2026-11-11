/* operasi_laporan.js — menu Operasi (/operasi) = laporan tanpa peta (pemilik 4 Nov 2026), dua bagian berikon: Operasi Udara | Operasi Darat.
   Skrip klasik sesudah operasi_peta.js; memakai global index.html ($, esc, fmt, S, lengkapiKluster, Kartu) dan window.OpsUdara (helper operasi_peta.js).
   Tiap bagian = kartu standar .ex-std tanpa kaki (AGENTS.md §3.5). Pemilih tanggal mengganti seluruh laporan.
   Data udara: /api/operasi/peta?tanggal, /api/operasi/monitor (30 hari s.d. tanggal), /api/operasi/nilai (7 hari), /api/operasi/jejak (ADS-B),
   /api/omc/sortie + /udara/data/omc_hasil.json, /data/harian30.json (titik panas), /data/operasi/rekap_udara.json.
   Data darat: /api/laporan-karhutla/snapshot/:tanggal (laporan terkunci); belum dikunci = angka rekap BNPB terakhir (/data/bnpb.json, /data/operasi_resmi.json); OMC resmi: /udara/data/omc_bmkg.json
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
  /* pil kategori kartu = ikon saja (pemilik 11 Nov 2026 "label diganti jadi icon aja"); teks tetap di title dan aria-label */
  const IK_EY = {"Operasi udara": IK.udara, "Operasi darat": IK.darat, Base: '<path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/>',
    Renlap: '<path d="M4 19c4-1 6-5 8-9s5-6 8-6"/><circle cx="4" cy="19" r="1.6"/><circle cx="20" cy="4" r="1.6"/>', "Aksi armada": '<path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z"/>',
    "Tren 30 hari": '<path d="M3 3v18h18"/><path d="m7 15 4-4 3 3 5-6"/>', "Histori armada": '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    Operator: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>', "Jejak ADS-B": '<circle cx="12" cy="12" r="2"/><path d="M16.2 7.8a6 6 0 0 1 0 8.4M7.8 16.2a6 6 0 0 1 0-8.4M19 5a10 10 0 0 1 0 14M5 19A10 10 0 0 1 5 5"/>',
    "Temuan pilot": '<path d="M12 3c1 4 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3.5 2-4.5.3 2 1.5 3 3 3-1-3 0-6 0-8.5z"/>', "OMC resmi BMKG aktif": '<path d="M7 18a4 4 0 0 1-.6-7.96A6 6 0 0 1 18 9a4.5 4.5 0 0 1-.5 9z"/>',
    "Modifikasi cuaca": '<path d="M7 16a4 4 0 0 1-.6-7.96A6 6 0 0 1 18 7a4.5 4.5 0 0 1-.5 9z"/><path d="M8 19v2M12 19v2M16 19v2"/>', Dokumentasi: '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
    Efektivitas: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>', "Kontrak 2026": '<path d="M6 3h9l3 3v15H6z"/><path d="M9 11h6M9 15h6"/>'};
  const eyebrow = ey => { const t = String(ey).replace(/<[^>]+>/g, "").trim(), svg = IK_EY[t];
    return svg ? `<span class="ex-ey ops-ey-ik" title="${esc(t)}" aria-label="${esc(t)}" role="img"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${svg}</svg></span>` : `<span class="ex-ey">${ey}</span>`; };
  const bagian = (ey, judul, isi, kanan = "") => `<article class="ex ex-std"><header class="ex-hd">${eyebrow(ey)}<div class="ex-jd"><h3>${judul}</h3>${kanan}</div></header><div class="ex-bd">${isi}</div></article>`;
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
  const muatStatis = () => st.statis ||= Promise.all([ambil("/data/harian30.json"), ambil("/udara/data/omc_hasil.json"), ambil("/data/bnpb.json"), ambil("/data/operasi_resmi.json"), ambil("/udara/data/omc_bmkg.json")])
    .then(([h30, omcHasil, bnpb, resmi, omcBmkg]) => ({h30, omcHasil, bnpb, resmi, omcBmkg}));

  /* ---------------- kerangka: tab Udara/Darat, tanggal, salin teks ---------------- */
  function kerangka(box) {
    box.innerHTML = `<div class="ops-alat" role="toolbar" aria-label="Laporan operasi">
      <div class="seg ops-mode" role="group" aria-label="Bagian operasi">${[["udara", "Operasi Udara"], ["darat", "Operasi Darat"]].map(([k, t]) => `<button type="button" data-mode="${k}" aria-pressed="${st.mode === k}">${ik(k)}${t}</button>`).join("")}</div>
      <div class="ops-periode" role="group" aria-label="Periode laporan">${periode()}</div>
      ${""/* tombol Salin teks WA (data-aksi="salin") dan Cetak / PDF (data-aksi="cetak") disembunyikan pemilik 11 Nov 2026; handler dan salin() tetap */}
      <span class="ops-status" role="status"></span></div><div id="opsIsi"></div>`;
    box.addEventListener("click", e => {
      const m = e.target.closest("[data-mode]");
      if (m) { st.mode = m.dataset.mode; try { localStorage.setItem("ops_mode", st.mode); } catch (x) {} box.querySelectorAll("[data-mode]").forEach(b => b.setAttribute("aria-pressed", String(b === m))); return sesudahFrame(isi); }
      const ka = e.target.closest(".ops-akt[data-reg]"); if (ka) return bukaArmada(ka.dataset.reg);
      const ud = e.target.closest("[data-unduh]"); if (ud) { e.preventDefault(); return st._d && unduhRute(st._d, ud.dataset.base, ud.dataset.unduh); }   // tombol di dalam <summary>: jangan ikut melipat
      const fp = e.target.closest("[data-fpulau], [data-ftanda]"); if (fp) return saringBase(fp);
      const gr = e.target.closest("tr.ops-grup"); if (gr) return lipatGrup(gr);
      const bb = e.target.closest("tr.ops-bb"); if (bb) return bukaBase(bb);
      const tg = e.target.closest("[data-tgl]"); if (tg) return pilihTanggal(tg.dataset.tgl);
      const lb = e.target.closest(".ops-tgl"); if (lb) { const i = lb.querySelector("input"); try { i.showPicker(); e.preventDefault(); } catch (x) {} return; }
      const a = e.target.closest("[data-aksi]"); if (!a) return;
      if (a.dataset.aksi === "cetak") return window.print();
      if (a.dataset.aksi === "salin") salin(a);
    });
    box.addEventListener("keydown", e => { const k = (e.key === "Enter" || e.key === " ") && e.target.closest?.(".ops-akt[data-reg], tr.ops-bb, tr.ops-grup"); if (k) { e.preventDefault(); k.dataset.reg ? bukaArmada(k.dataset.reg) : k.classList.contains("ops-grup") ? lipatGrup(k) : bukaBase(k); } });
    box.addEventListener("change", e => {
      if (e.target.matches(".ops-tgl input")) return pilihTanggal(e.target.value);
      if (e.target.matches("[data-reg]")) { st.reg = e.target.value; return sesudahFrame(() => { const k = $("#opsHistori"); if (k) k.outerHTML = kartuHistori(st._d); }); }
      if (e.target.matches("[data-galeri]")) { st.galeri = e.target.value; return sesudahFrame(() => { const k = $("#opsGaleri"); if (k) k.outerHTML = kartuGaleri(st._d); }); }
    });
  }
  /* Pemilih periode harian, tiru HariPeriodeBar pangantara (pemilik 11 Nov 2026): baris 1 Kemarin | Periode | Besok,
     baris 2 strip Sen-Min minggu aktif dengan loncat minggu di kedua ujung. Tanggal sesudah hari ini dan sebelum 1 Jul 2026 mati. */
  const HARI = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"], HARI_P = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
  const TGL_MIN = "2026-07-01", dow = t => new Date(Date.parse(t)).getUTCDay();
  const hariLabel = t => `${HARI[dow(t)]}, ${tglPendek(t)} ${t.slice(0, 4)}`;
  const mingguLabel = t => { const s = geser(t, -((dow(t) + 6) % 7)); return `${tglPendek(s)} - ${tglPendek(geser(s, 6))}`; };
  const keluar = t => t > hariWIB() || t < TGL_MIN;
  const tb = (t, kelas, isi, judul = "") => `<button type="button" class="${kelas}" data-tgl="${t}"${keluar(t) ? " disabled" : ""}${judul ? ` title="${judul}"` : ""}>${isi}</button>`;
  function periode() {
    const t = st.tanggal, kini = hariWIB(), senin = geser(t, -((dow(t) + 6) % 7)), kmr = geser(t, -1), bsk = geser(t, 1), mL = geser(t, -7), mD = geser(t, 7);
    return `<div class="ops-p1">${tb(kmr, "ops-lgk", `<b>‹ Kemarin</b><span class="ops-lnc">${hariLabel(kmr)}</span>`)}
      <div class="ops-ptg"><span>Periode</span><label class="ops-tgl"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg><span>${hariLabel(t)}</span><input type="date" value="${t}" max="${kini}" min="${TGL_MIN}" aria-label="Pilih tanggal"></label>${t === kini
        ? `<em class="ops-kini">Hari ini</em>` : `<button type="button" class="ops-kembali" data-tgl="${kini}">↺ Hari ini</button>`}</div>
      ${tb(bsk, "ops-lgk", `<span class="ops-lnc">${hariLabel(bsk)}</span><b>Besok ›</b>`)}</div>
      <div class="ops-p2">${tb(mL, "ops-ujung", `‹ ${mingguLabel(mL)}`, mingguLabel(mL))}<div class="ops-strip">${Array.from({length: 7}, (_, i) => { const d = geser(senin, i);
        return tb(d, `ops-hr${d === t ? " on" : ""}${d === kini ? " kini" : ""}`, `<b data-p="${HARI[dow(d)]}">${HARI_P[dow(d)]}</b><span>${tglPendek(d)}</span>`); }).join("")}</div>${tb(mD, "ops-ujung", `${mingguLabel(mD)} ›`, mingguLabel(mD))}</div>`;
  }
  /* INP: bilah periode dicat ulang dulu (ringan), laporan berat menyusul sesudah frame berikut */
  const pilihTanggal = t => { if (!t || t === st.tanggal || keluar(t)) return; st.tanggal = t; const p = $("#opsLaporan .ops-periode"); if (p) p.innerHTML = periode(); sesudahFrame(isi); };
  /* buka/tutup rincian armada: hanya atribut hidden, tanpa render ulang (INP) */
  const bukaBase = tr => { const r = tr.nextElementSibling, buka = tr.getAttribute("aria-expanded") !== "true"; tr.setAttribute("aria-expanded", String(buka)); if (r?.classList.contains("ops-rinci")) r.hidden = !buka; };
  /* saring base (pulau + saklar kondisi, semua harus cocok): hanya atribut hidden, tanpa render ulang (INP).
     Grup tanpa baris lolos ikut disembunyikan; rincian armada tetap ikut status buka barisnya. */
  const saringBase = btn => { const kartu = btn.closest(".ex");
    if (btn.dataset.fpulau != null) kartu.querySelectorAll("[data-fpulau]").forEach(b => b.setAttribute("aria-pressed", String(b === btn)));
    else btn.setAttribute("aria-pressed", String(btn.getAttribute("aria-pressed") !== "true"));
    const f = kartu.querySelector('[data-fpulau][aria-pressed="true"]')?.dataset.fpulau || "", t = [...kartu.querySelectorAll('[data-ftanda][aria-pressed="true"]')].map(b => b.dataset.ftanda);
    kartu.querySelectorAll("tr.ops-grup").forEach(g => { const buka = g.getAttribute("aria-expanded") === "true"; let ada = false;
      for (let r = g.nextElementSibling; r && !r.classList.contains("ops-grup"); r = r.nextElementSibling) {
        if (r.classList.contains("ops-bb")) { const ok = (!f || g.dataset.grup === f) && t.every(k => (r.dataset.tanda || "").split(" ").includes(k)); r.dataset.lolos = ok ? "1" : ""; ada ||= ok; r.hidden = !ok || !buka; }
        else r.hidden = !r.previousElementSibling.dataset.lolos || !buka || r.previousElementSibling.getAttribute("aria-expanded") !== "true"; }
      g.hidden = !ada; }); };
  const lipatGrup = tr => { const buka = tr.getAttribute("aria-expanded") !== "true"; tr.setAttribute("aria-expanded", String(buka));
    for (let r = tr.nextElementSibling; r && !r.classList.contains("ops-grup"); r = r.nextElementSibling) { const bb = r.classList.contains("ops-bb") ? r : r.previousElementSibling;
      r.hidden = !buka || bb.dataset.lolos === "" || (r !== bb && bb.getAttribute("aria-expanded") !== "true"); } };
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
  /* kolom Kelayakan terbang (pemilik 11 Nov 2026): tanpa kode ICAO, jarak pandang/angin/jam jadi label berikon; kalimat lengkap tetap di title pil */
  const IK_LBL = {vis: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>', angin: '<path d="M3 8h10a3 3 0 1 0-3-3M3 12h15a3 3 0 1 1-3 3M3 16h7"/>',
    jam: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>', awan: '<path d="M7 18a4 4 0 0 1-.6-7.96A6 6 0 0 1 18 9a4.5 4.5 0 0 1-.5 9z"/>', air: '<path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z"/>', padam: '<path d="M12 3c1 4 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3.5 2-4.5.3 2 1.5 3 3 3-1-3 0-6 0-8.5z"/><path d="M4 4l16 16"/>',
    kalender: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>', respons: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2M10 2h4M12 2v3"/>', base: '<path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/>', api: '<path d="M12 3c1 4 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3.5 2-4.5.3 2 1.5 3 3 3-1-3 0-6 0-8.5z"/>', unduh: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>', peran: '<path d="M10 14 3 12l1-2 7 1 4-6h2l-2 7 5 1 1-2h2l-1 4 1 4h-2l-1-2-5 1 2 7h-2l-4-6-7 1-1-2z"/>',
    op: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>', milik: '<path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z"/>', ember: '<path d="M5 7h14l-2 13H7zM5 7a7 3 0 0 1 14 0"/>', asap: '<path d="M4 15a4 4 0 0 1 4-4 5 5 0 0 1 9.6-1A3.5 3.5 0 0 1 18 17H7a3 3 0 0 1-3-2z"/>', ts: '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>'};
  const lbl = (k, t) => `<span class="ops-lbl" data-k="${k}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${IK_LBL[k]}</svg>${t}</span>`;
  /* slot tetap (pemilik 11 Nov 2026 "label lurus ke bawah"): jarak pandang | angin | jam | cuaca; slot kosong tetap ada supaya kolom sejajar */
  const labelLayak = k => [k.vis_km != null ? lbl("vis", `${k.vis_km.toLocaleString("id-ID", {maximumFractionDigits: 1})} km`) : "",
    k.kt != null ? lbl("angin", `${k.kt} kt`) : "", k.jam ? lbl("jam", `${k.jam} WIB`) : "",
    [k.asap && `<span title="Asap">${lbl("asap", "")}</span>`, k.ts && `<span title="Badai petir" class="ops-ts">${lbl("ts", "")}</span>`].filter(Boolean).join("")].map(x => `<span>${x}</span>`).join("");
  /* rincian armada per base (pemilik 11 Nov 2026: "ketika di klik ada rincian armadanya"): kartu per pesawat, status hari itu, peran, operator, bucket, aksi hari itu */
  /* renlap terbaru (versi terakhir) satu base, dan unduhan KML-nya: titik base, target bernomor sesuai urut, garis rute base -> target */
  const renlapBase = (D, id) => (D.peta.renlap || []).filter(r => r.base_id === id && (r.target || []).length).slice(-1)[0] || null;
  const xml = t => String(t ?? "").replace(/[<>&"']/g, c => ({"<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;"})[c]);
  /* KML (Google Earth, Avenza) dan GPX (Garmin, aplikasi GPS penerbangan): titik base, target bernomor sesuai urut, rute base -> target */
  function unduhRute(D, id, f) {
    const b = (D.peta.base || []).find(x => x.id === id), r = renlapBase(D, id); if (!b || !r) return;
    const tg = r.target.filter(g => Number.isFinite(+g.lat) && Number.isFinite(+g.lon)).sort((x, y) => (x.urut ?? 0) - (y.urut ?? 0));
    const nm = namaBase(D, id), judul = `Renlap ${nm} ${D.t}${r.versi ? ` ${r.versi}` : ""}`;
    const pts = [...(b.lat != null ? [{nama: `Base ${nm}`, ket: b.icao || "", lat: +b.lat, lon: +b.lon, base: true}] : []),
      ...tg.map((g, i) => ({nama: `${g.urut ?? i + 1}. ${g.lokasi || g.nama || g.jenis || "Target"}`, ket: alasanRenlap(g.alasan).join("; "), lat: +g.lat, lon: +g.lon}))];
    const isi = f === "gpx" ? `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Centurisk97" xmlns="http://www.topografix.com/GPX/1/1"><metadata><name>${xml(judul)}</name></metadata>
${pts.map(p => `<wpt lat="${p.lat}" lon="${p.lon}"><name>${xml(p.nama)}</name><desc>${xml(p.ket)}</desc><sym>${p.base ? "Airport" : "Flag, Red"}</sym></wpt>`).join("\n")}
<rte><name>${xml(judul)}</name>${pts.map(p => `<rtept lat="${p.lat}" lon="${p.lon}"><name>${xml(p.nama)}</name></rtept>`).join("")}</rte></gpx>`
      : `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2"><Document><name>${xml(judul)}</name>
<Style id="base"><IconStyle><scale>1.2</scale><Icon><href>http://maps.google.com/mapfiles/kml/shapes/airports.png</href></Icon></IconStyle></Style>
<Style id="target"><IconStyle><Icon><href>http://maps.google.com/mapfiles/kml/shapes/firedept.png</href></Icon></IconStyle></Style>
<Style id="rute"><LineStyle><color>ffa3552f</color><width>3</width></LineStyle></Style>
${pts.map(p => `<Placemark><name>${xml(p.nama)}</name><description>${xml(p.ket)}</description><styleUrl>#${p.base ? "base" : "target"}</styleUrl><Point><coordinates>${p.lon},${p.lat},0</coordinates></Point></Placemark>`).join("\n")}
<Placemark><name>Rute</name><styleUrl>#rute</styleUrl><LineString><tessellate>1</tessellate><coordinates>${pts.map(p => `${p.lon},${p.lat},0`).join(" ")}</coordinates></LineString></Placemark>
</Document></kml>`;
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([isi], {type: f === "gpx" ? "application/gpx+xml" : "application/vnd.google-earth.kml+xml"}));
    a.download = `renlap_${nm.replace(/[^\w]+/g, "_")}_${D.t}${r.versi ? `_${String(r.versi).replace(/[^\w]+/g, "")}` : ""}.${f}`; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }
  const PULAU = {1: "Sumatera", 2: "Sumatera", 3: "Jawa", 5: "Bali dan Nusa Tenggara", 6: "Kalimantan", 7: "Sulawesi", 8: "Maluku", 9: "Papua"};
  const URUT_PULAU = ["Sumatera", "Kalimantan", "Jawa", "Bali dan Nusa Tenggara", "Sulawesi", "Maluku", "Papua", "Lainnya"];
  const PEMILIK = {bnpb_sewa: "Sewa BNPB", tni_au: "TNI AU", tni_ad: "TNI AD", lainnya: "Lainnya"};
  function rinciArmada(D, ar) {
    if (!ar.length) return `<p class="ops-kosong">Belum ada armada tercatat di base ini.</p>`;
    const u = U(), baris = (k, t) => t ? `<li>${lbl(k, t)}</li>` : "";
    return `<div class="ops-ar-grid">${ar.slice().sort((x, y) => x.registrasi.localeCompare(y.registrasi)).map(a => {
      const s = u.stAr(a.status), aksi = D.aksi.filter(x => x.registrasi === a.registrasi), wb = aksi.filter(x => x.guna === "wb").length;
      const tipe = /tidak diketahui/i.test(a.tipe || "") ? "Tipe belum tercatat" : a.tipe || "Tipe belum tercatat", f = u.fotoAr(a);
      return `<article class="ops-akt" data-reg="${esc(a.registrasi)}" tabindex="0" role="button" aria-label="Histori ${esc(a.registrasi)}"><figure>${f ? u.imgAr(a, "", `${a.registrasi} ${tipe}`) : `<span class="ops-ar-kosong">${lbl("peran", "")}</span>`}<span class="ops-ar-st ${s[1]}"><i></i>${s[0]}</span><figcaption><b>${esc(a.registrasi)}</b><small>${esc(tipe)}</small></figcaption></figure>
        <div class="ops-ar-isi"><ul>${baris("peran", esc(PERAN[a.peran] || a.peran || ""))}${baris("op", a.operator ? esc(a.operator) : "")}${baris("milik", a.pemilik ? PEMILIK[a.pemilik] || esc(a.pemilik) : "")}${baris("ember", a.bucket_liter ? `Bucket ${fmt(a.bucket_liter)} L` : "")}</ul>
        ${a.alasan ? `<p class="ops-pa-alasan">${esc(a.alasan)}</p>` : ""}<footer><span>${aksi.length ? `<b>${fmt(aksi.length)}</b> sortie hari ini${wb ? `, <b>${fmt(wb)}</b> WB` : ""}` : "Belum ada sortie hari ini"}</span><em>Histori ›</em></footer></div></article>`; }).join("")}</div>`;
  }
  const namaBase = (D, id) => ((D.peta.base || []).find(b => b.id === id)?.nama || id || "–").split(" / ")[0];

  function udara(D) {
    const u = U(), P = D.peta, base = P.base || [], ar = P.armada || [], g = u.hitungGuna(ar), lapor = ar.filter(a => a.status).length, siap = ar.filter(a => SIAP.includes(a.status)).length;
    const H = D.hari, temApi = (P.temuan || []).filter(x => x.status !== "clear").length, tgl = esc(tglPanjang(D.t));
    /* ringkasan (pemilik 11 Nov 2026 "bagusin lagi"): satu deret ubin berikon selebar kartu; yang belum dilaporkan tetap tampil
       sebagai "–" redup dengan keterangannya, bukan kotak keterangan terpisah */
    const IKR = {base: '<path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/>', armada: IK.udara,
      siap: '<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>', sortie: '<path d="M4 19c4-1 6-5 8-9s5-6 8-6"/><circle cx="4" cy="19" r="1.6"/><path d="M17 4h3v3"/>',
      wb: '<path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z"/>', padam: '<path d="M12 3c1 4 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3.5 2-4.5.3 2 1.5 3 3 3-1-3 0-6 0-8.5z"/><path d="M4 4l16 16"/>',
      temuan: '<path d="M12 3c1 4 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3.5 2-4.5.3 2 1.5 3 3 3-1-3 0-6 0-8.5z"/>'};
    /* sub: teks biasa, atau larik pil [kelas, teks]; ubin redup = data belum masuk, ditandai pil oranye bukan kalimat */
    const ubin = (k, n, t, sub, redup) => { const pil = sub ? `<em${Array.isArray(sub) && sub.length > 1 ? ' class="tegak"' : ""}>${Array.isArray(sub) ? sub.map(([c, x]) => `<small class="${c}">${lbl({wb: "air", ptr: "vis", omc: "awan", belum: "jam"}[c] || "jam", x)}</small>`).join("") : sub}</em>` : "";
      return `<div class="${redup ? "redup" : ""}"><header><i><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${IKR[k]}</svg></i><span>${t}</span></header><div class="ops-ub-isi${pil.includes("tegak") ? " samping" : ""}"><b>${n}</b>${pil}</div></div>`; };
    const tiles = [ubin("base", fmt(base.length), "Base operasi udara"),
      ubin("armada", fmt(ar.length), "Armada", [["wb", `WB ${fmt(g.wb)}`], ["ptr", `Patroli ${fmt(g.patroli)}`], ["omc", `OMC ${fmt(g.omc)}`]]),
      ubin("siap", `${lapor ? fmt(siap) : "–"}<small>/${fmt(ar.length)}</small>`, "Armada siap", lapor ? `${fmt(lapor)} armada melapor` : [["belum", "Gelar armada belum masuk"]], !lapor),
      ubin("sortie", H.sortie ? fmt(H.sortie) : "–", "Sortie hari ini", H.sortie ? (H.wb ? `${fmt(H.wb)} water bombing${H.drop ? `, ${fmt(H.drop)} jatuhan` : ""}` : "tanpa water bombing") : [["belum", "Belum ada sortie"]], !H.sortie),
      H.dinilai && ubin("padam", u.persen(H.persen), "Padam ≥ 24 jam", `${fmt(H.padam)} dari ${fmt(H.dinilai)} dinilai`),
      ubin("temuan", (P.temuan || []).length ? fmt(temApi) : "–", "Temuan api pilot", (P.temuan || []).length ? `${fmt(P.temuan.length)} temuan total` : [["belum", "Belum ada laporan pilot"]], !(P.temuan || []).length)].filter(Boolean);
    const ringkas = `<div class="ops-lap-angka" style="--n:${tiles.length}">${tiles.join("")}</div>`;
    return [
      bagian(`${ik("udara")} Operasi udara`, lapor ? `${hl(`${fmt(siap)} dari ${fmt(ar.length)}`)} armada siap di ${fmt(base.length)} base, ${H.sortie ? `${hl(fmt(H.sortie))} sortie` : "belum ada sortie"} pada ${tgl}`
        : `${hl(fmt(ar.length))} armada di ${fmt(base.length)} base; status harian ${tgl} belum dilaporkan`, ringkas),
      kartuBase(D), kartuRenlap(D), kartuAksi(D), kartuTren(D), kartuHistori(D), kartuOperator(D), kartuJejak(D), kartuTemuan(D), kartuOmcResmi(D), kartuOmc(D), kartuGaleri(D), kartuNilai(D), kartuKontrak(D)].join("");
  }

  function kartuBase(D) {
    const u = U(), adaKl = !!S.kluster?.features?.length;
    const baris = (D.peta.base || []).map(b => { const a = (D.peta.armada || []).filter(x => x.base_id === b.id), gg = u.hitungGuna(a), k = D.hitung(D.baseAksi(b.id)), lay = u.kelayakan(b);
      const dk = adaKl ? u.apiDekat(b) : null, p3 = dk ? dk.filter(c => c.level >= 3).length : null, lv = dk ? (p3 ? 3 : dk.some(c => c.level === 2) ? 2 : dk.length ? 1 : 0) : null;
      const lapor = a.some(x => x.status);
      const tanda = [p3 && "prioritas", lay.kelas !== "layak" && "layak", renlapBase(D, b.id) && "renlap", !lapor && a.length && "lapor"].filter(Boolean).join(" ");
      return {p3: p3 || 0, lv, id: b.id, tanda, pulau: PULAU[String(b.prov || "")[0]] || "Lainnya", nAr: a.length, rinci: rinciArmada(D, a), sel: [kiri(`<span class="ops-bb-nama"><svg class="ops-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg><b>${esc(b.nama.split(" / ")[0])}</b></span>`), `<td>${b.icao ? `<span class="ops-kode-l">${esc(b.icao)}</span>` : "–"}</td>`, `<td>${esc(u.PROV_PDK[b.prov] || b.prov || "–")}</td>`,
        sel(nol(gg.wb)), sel(nol(gg.patroli)), sel(nol(gg.omc)), sel(`${lapor ? fmt(a.filter(x => SIAP.includes(x.status)).length) : "–"}/${fmt(a.length)}`), sel(nol(k.sortie)), sel(nol(k.wb)), sel(u.persen(k.persen)),
        sel(p3 == null ? "–" : `<b>${nol(p3)}</b>`), `<td>${lv == null ? "–" : lv ? `<span class="pill l${lv}">${u.LV[lv]}</span>` : `<span class="pill l0">Aman</span>`}</td>`, `<td><span class="ops-layak">${u.pilLayak(lay)}${labelLayak(lay)}</span></td>`, (() => { const r = renlapBase(D, b.id), n = r?.target?.length || 0;
          return `<td>${n ? `<span class="ops-rl" title="${fmt(n)} target renlap"><b>${fmt(n)}</b>${["kml", "gpx"].map(f => `<button type="button" class="ops-kml" data-unduh="${f}" data-base="${esc(b.id)}" title="Unduh waypoint renlap ${esc(r.versi || "")} (${f.toUpperCase()}) untuk GPS">${lbl("unduh", f.toUpperCase())}</button>`).join("")}</span>` : `<span class="ops-redup-t">Belum ada</span>`}</td>`; })()]}; }).sort((x, y) => y.p3 - x.p3);
    const kepala = ["Base", "Kode|Kode ICAO bandara base", "Prov", "#WB", "#PTR", "#OMC", "#Siap|Armada siap dari laporan gelar armada WA; – = belum lapor", "#Sortie", "#Aksi WB", "#Padam|Tidak ada titik panas satelit dalam 1 km selama 24 jam sesudah water bombing",
      `#Cluster prioritas|Cluster prioritas aktif dalam jangkauan jelajah armada (bawaan ${fmt(u.RADIUS_KM)} km), kondisi kini`,
      `Status api|Level cluster tertinggi dalam jangkauan jelajah armada: ${u.LV.slice(1).join(", ")}; Aman = tidak ada cluster aktif`, "Kelayakan terbang|METAR terdekat ≤ 60 km, kondisi kini; basi bila lebih dari 3 jam", "Renlap|Rencana lapangan terbaru base ini; KML = waypoint target berurutan dari base, untuk GPS"];
    /* kolom kegiatan (sortie, aksi WB, padam, cluster) yang kosong di semua base dilipat */
    const lipat = new Set([7, 8, 9, 10].filter(i => baris.every(x => />–(<\/b>)?<\/td>$/.test(x.sel[i]))));
    const nP = baris.filter(x => x.p3).length;
    const perLv = [2, 1].map(l => [l, baris.filter(x => x.lv === l).length]).filter(([, n]) => n).map(([l, n]) => `${hl(fmt(n))} base ${u.LV[l]}`);
    const judul = nP ? `${hl(fmt(nP))} dari ${fmt(baris.length)} base punya cluster prioritas dalam jangkauan`
      : perLv.length ? `${perLv.join(", ")}; belum ada cluster prioritas dalam jangkauan` : "Belum ada cluster prioritas dalam jangkauan base";
    /* dikelompokkan per pulau (pemilik 11 Nov 2026), kepala grup bisa dilipat; urutan baris di dalam grup tetap */
    const kol = kepala.length - lipat.size, grup = [...new Set(baris.map(x => x.pulau))].sort((x, y) => URUT_PULAU.indexOf(x) - URUT_PULAU.indexOf(y));
    const isi = grup.flatMap(gp => { const bs = baris.filter(x => x.pulau === gp), g = esc(gp);
      return [`<tr class="ops-grup" data-grup="${g}" tabindex="0" aria-expanded="true"><td colspan="${kol}"><span><svg class="ops-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg><b>${g}</b><span class="ops-grup-chip">${bs.some(x => x.p3) ? `<em class="merah">${lbl("api", `${fmt(bs.filter(x => x.p3).length)} base dengan cluster prioritas`)}</em>` : ""}<em>${lbl("base", `${fmt(bs.length)} base`)}</em><em>${lbl("peran", `${fmt(bs.reduce((n, x) => n + x.nAr, 0))} armada`)}</em></span></span></td></tr>`,
        ...bs.flatMap(x => { const sel = x.sel.filter((_, i) => !lipat.has(i));
          return [`<tr class="ops-bb" data-grup="${g}" data-tanda="${x.tanda}" tabindex="0" aria-expanded="false" title="Klik untuk rincian armada">${sel.join("")}</tr>`, `<tr class="ops-rinci" data-grup="${g}" hidden><td colspan="${sel.length}">${x.rinci}</td></tr>`]; })]; });
    const TANDA = [["prioritas", "api", "Ada api prioritas"], ["layak", "ts", "Belum layak terbang"], ["renlap", "unduh", "Ada renlap"], ["lapor", "jam", "Belum lapor"]];
    const saring = `<div class="ops-saring">${grup.length > 1 ? `<div class="seg" role="group" aria-label="Saring pulau">${["", ...grup].map(g => `<button type="button" data-fpulau="${esc(g)}" aria-pressed="${!g}">${g ? esc(g) : "Semua"}</button>`).join("")}</div>` : ""}
      <div class="ops-tanda" role="group" aria-label="Saring kondisi">${TANDA.map(([k, i, t]) => { const n = baris.filter(x => x.tanda.split(" ").includes(k)).length;
        return `<button type="button" data-ftanda="${k}" aria-pressed="false"${n ? "" : " disabled"}>${lbl(i, `${t} <b>${fmt(n)}</b>`)}</button>`; }).join("")}</div></div>`;
    return bagian("Base", judul, tabelH(kepala.filter((_, i) => !lipat.has(i)), isi, "Belum ada base tercatat."), saring);
  }

  /* alasan target jadi label: hanya teks siap baca dari mesin renlap, medan mentah (ffmc_basi, menahun_hari) tidak pernah tampil */
  const alasanRenlap = a => (Array.isArray(a) ? a.map(x => typeof x === "string" ? x : x?.teks || x?.ket || "") : typeof a === "string" ? [a] : a?.teks ? [a.teks] : [])
    .join(";").split(";").map(x => x.trim().replace(/(\d)\.(\d)/g, "$1,$2")).filter(Boolean).map(x => x[0].toUpperCase() + x.slice(1));

  /* fitur 4 + 5: renlap lawan realisasi, dengan alasan tiap target */
  /* renlap per base (pemilik 11 Nov 2026 "jelek banget"): blok per base yang bisa dilipat, kepala = progres didatangi + unduhan,
     isi = kartu target bernomor; target didatangi bila ada aksi armada base itu <= RENLAP_KM dari target pada hari yang sama */
  function kartuRenlap(D) {
    const u = U(), rl = (D.peta.renlap || []).filter(r => (r.target || []).length);
    let datang = 0, total = 0;
    const blok = rl.map(r => {
      const tg = r.target.slice().sort((x, y) => (x.urut ?? 0) - (y.urut ?? 0)).map((g, i) => {
        const a = D.aksi.filter(x => x.lat != null && (x.base_id || D.reg2base[x.registrasi]) === r.base_id).map(x => ({...x, jarak: km(g.lat, g.lon, x.lat, x.lon)})).filter(x => x.jarak <= RENLAP_KM).sort((x, y) => x.jarak - y.jarak)[0];
        return {g, i, a, h: a?.guna === "wb" ? (u.HASIL[a.hasil] || u.HASIL.tak_dinilai) : null}; });   // hasil padam hanya bermakna untuk water bombing
      const n = tg.filter(x => x.a).length; datang += n; total += tg.length;
      const kartu = tg.map(({g, i, a, h}) => { const nama = g.lokasi || g.nama || g.jenis || "Target", alasan = alasanRenlap(g.alasan);
        return `<li class="${a ? "datang" : ""}"><span class="ops-rl-no">${fmt(g.urut ?? i + 1)}</span><div><p><b>${esc(nama[0].toUpperCase() + nama.slice(1))}</b>
          <a href="${u.gmaps(g.lat, g.lon)}" target="_blank" rel="noopener noreferrer" title="Buka koordinat di Google Maps">${lbl("base", "Peta")}</a></p>
          ${alasan.length ? `<ul>${alasan.map(x => `<li>${esc(x)}</li>`).join("")}</ul>` : ""}
          <footer>${a ? `<span class="pill l0">Didatangi</span><small>${esc(a.registrasi)} ${u.jamWIB(a.jam_utc)} WIB, ${fmt(Math.round(a.jarak * 10) / 10)} km</small>${h ? `<span class="pill ${h[1]}">${h[0]}</span>` : ""}` : `<span class="ops-rl-belum">Belum didatangi</span>`}</footer></div></li>`; }).join("");
      const pct = tg.length ? n / tg.length : 0;
      return `<details class="ops-rl-blok"><summary><svg class="ops-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>
        <span class="ops-rl-nama"><b>${esc(namaBase(D, r.base_id))}</b><small>Renlap ${esc(r.versi || "")}</small></span>
        <span class="ops-rl-prog"><span><b>${fmt(n)}</b> dari ${fmt(tg.length)} didatangi</span><i style="--p:${(pct * 100).toFixed(0)}%"></i></span>
        <span class="ops-rl-ud">${["kml", "gpx"].map(f => `<button type="button" class="ops-kml" data-unduh="${f}" data-base="${esc(r.base_id)}" title="Unduh waypoint renlap (${f.toUpperCase()})">${lbl("unduh", f.toUpperCase())}</button>`).join("")}</span></summary>
        <ol class="ops-rl-grid">${kartu}</ol></details>`; }).join("");
    const judul = total ? `${hl(`${fmt(datang)} dari ${fmt(total)}`)} target renlap didatangi armada` : `Belum ada renlap untuk ${esc(tglPanjang(D.t))}`;
    return bagian("Renlap", judul, total ? `<div class="ops-rl-daftar">${blok}</div>` : `<p class="ops-kosong">Renlap disusun otomatis pukul 20.00 dan 07.00 WIB oleh mesin Pusdalops, lalu muncul di sini.</p>`);
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
    const {judul, isi} = isiHistori(D, a, 15);
    return `<div id="opsHistori">${bagian("Histori armada", judul, isi, pilih)}</div>`;
  }
  /* isi histori satu armada: dipakai kartu Histori (15 aksi terakhir) dan pop-up kartu armada (semua aksi 30 hari) */
  function isiHistori(D, a, batas = Infinity) {
    const u = U(), ak = D.aksi30.filter(x => x.registrasi === a.registrasi).sort((x, y) => (y.jam_utc || 0) - (x.jam_utc || 0)), k = D.mon?.kpi?.armada?.[a.registrasi], kt = u.kontrak(a.registrasi), s = u.stAr(a.status);
    const jam = kt.reduce((t, x) => t + (x.jam_operasi_menit || 0), 0), hh = D.hitung(ak);
    const angka = (n, t) => `<div><b>${n}</b><span>${t}</span></div>`;
    const isi = `<div class="ops-hist-atas">${u.fotoAr(a) ? u.imgAr(a, "", a.registrasi) : ""}
        <div><p><b>${esc(/tidak diketahui/i.test(a.tipe || "") ? "Tipe belum tercatat" : a.tipe || "")}</b>, ${esc(PERAN[a.peran] || a.peran || "")}, base ${esc(namaBase(D, a.base_id))}</p>
        <p class="ops-red">${esc(a.operator || "Operator belum tercatat")}${a.bucket_liter ? `, bucket ${fmt(a.bucket_liter)} L` : ""}. Status ${esc(tglPendek(D.t))}: <span class="ops-st ${s[1]}">${s[0]}</span>${a.alasan ? ` ${esc(a.alasan)}` : ""}</p></div></div>
      <div class="ops-lap-angka ops-6">${[angka(nol(hh.sortie), "sortie 30 hari"), angka(nol(hh.wb), "aksi WB"), angka(u.persen(hh.persen), "padam ≥ 24 jam"),
        angka(k ? `${fmt(siapTerbang(k))}/${fmt(k.hari_siap)}` : "–", "hari siap yang terbang / siap"), angka(k?.respons_median_menit != null ? fmt(Math.round(k.respons_median_menit)) + " mnt" : "–", "respons median"),
        angka(kt.length ? fmt(Math.round(jam / 60)) + " jam" : "–", `operasi 2026, ${fmt(kt.length)} kontrak`)].join("")}</div>
      ${tabelH(["Tanggal", "#Jam WIB", "Misi", "Lokasi", "#Jatuhan", "Hasil"], ak.slice(0, batas).map(x => { const h = u.HASIL[x.hasil] || u.HASIL.tak_dinilai;
        return `<tr><td>${esc(tglPendek(x.tanggal))}</td>${sel(u.jamWIB(x.jam_utc))}<td>${esc(MISI[x.guna] || x.jenis)}</td>${kiri(esc(x.lokasi || "–"))}${sel(nol(x.drop))}<td><span class="pill ${h[1]}">${h[0]}</span></td></tr>`; }), "Belum ada aksi tercatat untuk armada ini dalam 30 hari.")}
      ${kt.length ? tabelH(["#Kontrak", "Periode", "Jenis", "#Jam operasi", "#Sortie", "#Jatuhan WB"], kt.map(x => `<tr>${sel(fmt(x.kontrak_ke))}<td>${esc(x.periode_teks || "–")}${x.berjalan ? ` <span class="pill l0">berjalan</span>` : ""}</td><td>${esc(PERAN[x.jenis] || x.jenis)}</td>${sel(u.jamMenit(x.jam_operasi_menit))}${sel(nol(x.sortie))}${sel(nol(x.wb_drop))}</tr>`), "") : ""}`;
    return {judul: `${hl(esc(a.registrasi))}: ${hh.sortie ? `${hl(fmt(hh.sortie))} sortie dalam 30 hari` : "belum ada sortie dalam 30 hari"}`, isi};
  }
  /* pop-up histori armada (pemilik 11 Nov 2026: klik kartu armada = histori semua kegiatannya). <dialog> bawaan: Esc dan klik latar menutup. */
  function bukaArmada(reg) {
    const D = st._d, a = (D?.peta.armada || []).find(x => x.registrasi === reg); if (!a) return;
    let d = document.getElementById("opsDlgAr");
    if (!d) { d = document.createElement("dialog"); d.id = "opsDlgAr"; d.className = "ops-dlg"; ($("#opsLaporan") || document.body).append(d);   // di dalam #opsLaporan supaya gaya layar ikut
      d.addEventListener("click", e => { if (e.target === d || e.target.closest("[data-tutup]")) d.close(); }); }
    d.innerHTML = `<div class="ops-dlg-isi">${popupArmada(D, a)}</div>`;
    if (!d.open) d.showModal();
  }

  /* isi pop-up armada (pemilik 11 Nov 2026 "masih jelek"): kepala foto besar + identitas, deret angka tanpa kotak,
     linimasa kegiatan per tanggal (hasil hanya untuk water bombing), kontrak sebagai kartu kecil, teks tanpa kapital semua */
  const kalimat = t => String(t || "").toLowerCase().replace(/(^|[\s-])([a-z])/g, (m, a, b) => a + b.toUpperCase()).replace(/ - /g, " – ");
  function popupArmada(D, a) {
    const u = U(), ak = D.aksi30.filter(x => x.registrasi === a.registrasi).sort((x, y) => (y.jam_utc || 0) - (x.jam_utc || 0)), hh = D.hitung(ak);
    const k = D.mon?.kpi?.armada?.[a.registrasi], kt = u.kontrak(a.registrasi), s = u.stAr(a.status), jam = kt.reduce((t, x) => t + (x.jam_operasi_menit || 0), 0);
    const tipe = /tidak diketahui/i.test(a.tipe || "") ? "Tipe belum tercatat" : a.tipe || "Tipe belum tercatat", f = u.fotoAr(a);
    const angka = (n, t, ik) => `<div${n === "–" ? ' class="redup"' : ""}><i>${lbl(ik, "")}</i><b>${n}</b><span>${t}</span></div>`;
    const hari = [...new Set(ak.map(x => x.tanggal))], NH = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
    /* strip 30 hari: satu kotak per hari, gelap = banyak sortie */
    const per = ak.reduce((m, x) => (m[x.tanggal] = (m[x.tanggal] || 0) + 1, m), {}), maks = Math.max(1, ...Object.values(per));
    const strip = `<div class="ops-pa-strip" role="img" aria-label="Sortie per hari, 30 hari">${Array.from({length: 30}, (_, i) => { const t = geser(D.dari, i), n = per[t] || 0;
      return `<i style="--a:${n ? (0.25 + 0.75 * n / maks).toFixed(2) : 0}" title="${esc(tglPendek(t))}: ${n ? `${fmt(n)} sortie` : "tanpa sortie"}"></i>`; }).join("")}</div>
      <div class="ops-pa-strip-kaki"><span>${esc(tglPendek(D.dari))}</span><span>${fmt(hari.length)} hari terbang dari 30</span><span>${esc(tglPendek(D.t))}</span></div>`;
    const linimasa = hari.length ? hari.map(t => `<li><time><b>${esc(tglPendek(t))}</b><small>${NH[new Date(Date.parse(t)).getUTCDay()]}</small></time><ol>${ak.filter(x => x.tanggal === t).map(x => { const h = x.guna === "wb" ? (u.HASIL[x.hasil] || u.HASIL.tak_dinilai) : null;
        return `<li><span class="ops-lm-jam">${u.jamWIB(x.jam_utc)}</span><span class="ops-lm-misi" data-g="${esc(x.guna || "")}">${esc(MISI[x.guna] || x.jenis || "Misi")}</span>
          <span class="ops-lm-lok">${esc((x.lokasi || "Lokasi tidak tercatat").replace(/\(BMKG\/Sipongi\)/g, "").trim())}</span><span class="ops-lm-ujung">${x.drop ? lbl("ember", `${fmt(x.drop)} jatuhan`) : ""}${h ? `<span class="pill ${h[1]}">${h[0]}</span>` : ""}</span></li>`; }).join("")}</ol></li>`).join("")
      : `<p class="ops-kosong">Belum ada kegiatan tercatat dalam 30 hari.</p>`;
    /* kontrak sebagai daftar baris (pemilik 11 Nov 2026: kartu kesempitan bila kontrak banyak, ada yang terpotong):
       nomor, periode + durasi + jam per sortie, bilah jam operasi relatif kontrak terpanjang, tiga angka berikon, status */
    const kini = Date.parse(D.t);
    const barisKt = x => { const m = Date.parse(x.mulai), z = x.selesai ? Date.parse(x.selesai) : kini, hr = m ? Math.round((z - m) / 864e5) + 1 : null;
      const perSortie = x.sortie && x.jam_operasi_menit ? u.jamMenit(x.jam_operasi_menit / x.sortie) : null;
      const ket = [hr && lbl("kalender", x.berjalan ? `hari ke-${fmt(hr)}` : `${fmt(hr)} hari`), perSortie && lbl("jam", `${perSortie} per sortie`)].filter(Boolean).map(x => `<small>${x}</small>`).join("");
      const nilai = (ik, t, n) => `<div><span>${lbl(ik, t)}</span><b>${n}</b></div>`;
      return `<li${x.berjalan ? ' class="jalan"' : ""}><span class="ops-ktl-no">${fmt(x.kontrak_ke)}</span>
        <div class="ops-ktl-per"><b>${esc(kalimat(x.periode_teks) || "–")}</b>${ket ? `<span>${ket}</span>` : ""}</div>
        ${nilai("jam", "Jam operasi", x.jam_operasi_menit ? u.jamMenit(x.jam_operasi_menit) : `<em>belum ada</em>`)}${nilai("peran", "Sortie", fmt(x.sortie || 0))}${nilai("air", "Jatuhan WB", x.wb_drop ? fmt(x.wb_drop) : `<em>tanpa WB</em>`)}
        ${x.berjalan ? `<span class="pill l0">Berjalan</span>` : `<span class="ops-pa-selesai">Selesai</span>`}</li>`; };
    const sek = (judul, sub, isi, ik = "jam") => `<details class="ops-pa-sek" open><summary><i>${lbl(ik, "")}</i><b>${judul}</b>${(sub || []).map(([k, t]) => `<small>${lbl(k, t)}</small>`).join("")}<svg class="ops-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg></summary><div>${isi}</div></details>`;
    return `<article class="ex ex-std ops-pa"><button type="button" class="ops-dlg-x" data-tutup aria-label="Tutup"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg></button>
      <header class="ops-pa-hd"><figure>${f ? u.imgAr(a, "", `${a.registrasi} ${tipe}`) : `<span class="ops-ar-kosong">${lbl("peran", "")}</span>`}</figure>
        <div><div class="ops-pa-id"><h3>${esc(a.registrasi)}</h3><p>${esc(tipe)}</p><span class="ops-ar-st ${s[1]}"><i></i>${s[0]} ${esc(tglPendek(D.t))}</span></div>
        <ul>${[lbl("peran", esc(PERAN[a.peran] || a.peran || "")), lbl("base", `Base ${esc(namaBase(D, a.base_id))}`), a.operator && lbl("op", esc(a.operator)), a.pemilik && lbl("milik", PEMILIK[a.pemilik] || esc(a.pemilik)), a.bucket_liter && lbl("ember", `Bucket ${fmt(a.bucket_liter)} L`)].filter(Boolean).map(x => `<li>${x}</li>`).join("")}</ul>
        ${a.alasan ? `<p class="ops-pa-alasan">${esc(a.alasan)}</p>` : ""}
        <div class="ops-pa-angka">${[angka(nol(hh.sortie), "sortie 30 hari", "peran"), angka(nol(hh.wb), "water bombing", "air"), angka(hh.dinilai ? u.persen(hh.persen) : "–", "padam ≥ 24 jam", "padam"),
          angka(k ? `${fmt(siapTerbang(k))}/${fmt(k.hari_siap)}` : "–", "hari siap terbang", "kalender"), angka(k?.respons_median_menit != null ? `${fmt(Math.round(k.respons_median_menit))} mnt` : "–", "respons median", "respons"),
          angka(kt.length ? `${fmt(Math.round(jam / 60))} jam` : "–", "operasi 2026", "jam")].join("")}</div></div></header>
      <div class="ops-pa-badan">${sek("Kegiatan 30 hari", [["peran", `${fmt(ak.length)} sortie`], ["kalender", `${fmt(hari.length)} hari terbang`]], `${strip}<ol class="ops-lm">${linimasa}</ol>`, "peran")}
      ${kt.length ? sek("Kontrak 2026", [["op", `${fmt(kt.length)} kontrak`], ["jam", `${u.jamMenit(jam)} jam operasi`]], `<ol class="ops-ktl">${kt.map(barisKt).join("")}</ol>`, "op") : ""}</div>
    </article>`;
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
    /* utilisasi dengan bilah kecil; base pindah ke bawah nama operator supaya tabel muat tanpa geser (pemilik 11 Nov 2026) */
    const util = (n, d) => d ? `<span class="ops-util"><b>${u.persen(n / d)}</b><i style="--p:${Math.min(100, Math.round(n / d * 100))}%"></i></span>` : "–";
    const total = `<tr class="ops-total">${kiri(`<b>Total</b><small>${fmt(semuaBase.size)} base</small>`)}${sel(fmt(jml("n")))}${sel(nol(jml("siap")))}${sel(nol(jml("terbang")))}${sel(util(jml("siapTerbang"), jml("siap")))}${sel(nol(jml("sortie")))}${sel(nol(jml("wb")))}${sel(jml("dinilai") ? u.persen(jml("padam") / jml("dinilai")) : "–")}${sel(jml("jam") ? fmt(Math.round(jml("jam") / 60)) : "–")}</tr>`;
    return bagian("Operator", daf.some(([, x]) => x.siap) ? `${hl(fmt(daf.length))} operator; ${nganggur ? `${hl(fmt(nganggur))} siap tapi belum terbang dalam 30 hari` : "semua yang siap sudah terbang"}` : `${hl(fmt(daf.length))} operator armada udara; status harian belum dilaporkan`,
      tabelH(["Operator|Nama operator, di bawahnya base dan jumlah armadanya", "#Armada", "#Hari siap", "#Hari terbang", "#Utilisasi|Hari siap yang benar-benar terbang dibagi hari siap, maksimal 100%", "#Sortie", "#Aksi WB", "#Padam", "#Jam 2026"], daf.length ? [total, ...daf.map(([o, x]) => `<tr${x.siap && !x.terbang ? ' class="ops-nganggur"' : ""}>${kiri(`<b>${esc(o)}</b><small>${teksBase(x.base)}</small>`)}${sel(fmt(x.n))}${sel(nol(x.siap))}${sel(nol(x.terbang))}${sel(util(x.siapTerbang, x.siap))}${sel(nol(x.sortie))}${sel(nol(x.wb))}${sel(x.dinilai ? u.persen(x.padam / x.dinilai) : "–")}${sel(x.jam ? fmt(Math.round(x.jam / 60)) : "–")}</tr>`)] : [], "Belum ada armada tercatat."));
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

  /* OMC resmi BMKG aktif hari ini per provinsi (omc_bmkg.json, 10 Nov 2026). Menggantikan omc_pesawat tangan di operasi_resmi.json;
     jumlah pesawat OMC (tangan, 12 Okt) tidak ada di BMKG dan tetap dibaca operasi.js. Data tak terjangkau = kartu dibuang. */
  function kartuOmcResmi(D) {
    const o = D.omcBmkg; if (!o || !Array.isArray(o.baris)) return "";
    const h = hariWIB(), aktif = o.baris.filter(x => x.periode_awal <= h && h <= x.periode_akhir)
      .sort((a, b) => /karhutla/i.test(b.jenis_kegiatan) - /karhutla/i.test(a.jenis_kegiatan) || (a.provinsi || "").localeCompare(b.provinsi || ""));
    const kar = aktif.filter(x => /karhutla/i.test(x.jenis_kegiatan)), prov = new Set(aktif.map(x => x.provinsi)).size;
    const baris = aktif.map(x => `<tr>${kiri(`<b>${esc(x.provinsi)}</b>`)}${kiri(`${esc(x.jenis_kegiatan)}${/karhutla/i.test(x.jenis_kegiatan) ? ' <span class="pill l3">karhutla</span>' : ""}`)}${kiri(esc(x.user || "–"))}${kiri(esc(x.operator || "–"))}${kiri(esc(x.periode))}</tr>`);
    const judul = aktif.length ? `${hl(fmt(aktif.length))} OMC resmi BMKG aktif di ${fmt(prov)} provinsi, ${kar.length ? `${hl(fmt(kar.length))} untuk karhutla di ${esc([...new Set(kar.map(x => x.provinsi))].join(", "))}` : "tidak ada untuk karhutla"}`
      : "Tidak ada OMC resmi BMKG yang aktif hari ini";
    return bagian("OMC resmi BMKG aktif", judul, tabelH(["Provinsi", "Kegiatan|Jenis kegiatan menurut publikasi BMKG", "Pengguna|Pemohon layanan OMC", "Operator", "Periode"], baris, "Tidak ada OMC resmi BMKG yang aktif hari ini."));
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
      foto.length ? kelompokFoto(foto, D.peta.base).map(h => { const pra = h.base.flatMap(b => b.foto).slice(0, 8);
        return `<details class="ops-gl-hari"><summary><span class="ops-gl-tgl"><b>${esc(tglPendek(h.tanggal))}</b><small>${fmt(h.n)} foto</small><small>${h.base.map(b => esc(b.nama)).join(", ")}</small></span>
          <span class="ops-gl-pra">${pra.map(f => `<img src="${esc(f.url)}" alt="" loading="lazy">`).join("")}${h.n > pra.length ? `<i>+${fmt(h.n - pra.length)}</i>` : ""}</span><svg class="ops-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg></summary><div class="ops-gl-isi">${h.base.map(b => `<h4 class="ops-gl-base">${lbl("base", esc(b.nama))}<small>${lbl("kalender", `${fmt(b.foto.length)} foto`)}</small></h4><div class="ops-galeri">${b.foto.map(f => `<a href="${esc(f.url)}" target="_blank" rel="noopener noreferrer"${f.lokasi ? ` title="${esc(f.lokasi)}"` : ""}><img src="${esc(f.url)}" alt="Dokumentasi ${esc(f.reg)} ${esc(f.tanggal)}" loading="lazy"><span><b>${esc(f.reg)}</b> ${u.jamWIB(f.jam_utc)} WIB${f.lokasi ? `<br>${esc(f.lokasi)}` : ""}</span></a>`).join("")}</div>`).join("")}</div></details>`; }).join("")
        : `<p class="ops-kosong">Foto dari grup WA satgas udara muncul di sini begitu ditempel ke aksi armada.</p>`, saring)}</div>`;
  }

  function kartuNilai(D) {
    const O = window.OperasiLapangan, v = D.nilai;
    if (!O || !v) return bagian("Efektivitas", "Nilai efektivitas belum tersedia", "");
    return bagian("Efektivitas", `Nilai efektivitas ${esc(O.tanggalIndo(v.dari))} sampai ${esc(O.tanggalIndo(v.sampai))}`,
      `<div class="ops-lap-nilai">${O.KODE_NILAI.map(k => { const m = O.METRIK[k], t = O.tampilMetrik(k, (v.semua || {})[k]);
        return `<div class="ops-nl${t.kosong ? " ops-redup" : ""}"><span class="ops-kode">${k}</span><h3>${esc(m.nama)}</h3><b>${esc(t.kosong ? t.pesan : t.angka)}</b><small>${esc(t.rincian || "")}</small></div>`; }).join("")}</div>`);
  }

  /* kontrak 2026 per provinsi (pemilik 11 Nov 2026 "bagusin"): kartu provinsi berisi total jam + bilah bagian nasional,
     lalu baris Patroli dan Water bombing berdampingan; jam ditulis bulat "1.141 jam", liter dalam juta */
  function kartuKontrak(D) {
    const u = U(), R = u.OP.rekap, rows = R?.total || [];
    const tot = rows.reduce((a, x) => ({jam: a.jam + (x.jam_operasi_menit || 0), sortie: a.sortie + (x.sortie || 0), wb: a.wb + (x.wb_drop || 0), n: a.n + (x.kontrak || 0)}), {jam: 0, sortie: 0, wb: 0, n: 0});
    if (!rows.length) return bagian("Kontrak 2026", "Rekap kontrak belum termuat", `<p class="ops-kosong">Rekap kontrak belum termuat.</p>`);
    const jamB = m => `${fmt(Math.round((m || 0) / 60))} jam`, prov = [...new Set(rows.map(x => x.prov))].map(p => ({p, r: rows.filter(x => x.prov === p)}))
      .map(g => ({...g, jam: g.r.reduce((t, x) => t + (x.jam_operasi_menit || 0), 0)})).sort((x, y) => y.jam - x.jam);
    const baris = x => `<li data-j="${esc(x.jenis)}"><span class="ops-kp-jenis">${lbl(x.jenis === "wb" ? "air" : "vis", esc(PERAN[x.jenis] || x.jenis))}</span>
      <span>${lbl("op", `${fmt(x.kontrak)} kontrak`)}</span><span>${lbl("jam", jamB(x.jam_operasi_menit))}</span><span>${lbl("peran", `${fmt(x.sortie || 0)} sortie`)}</span>
      ${x.jenis === "wb" ? `<span>${lbl("ember", x.wb_drop ? `${fmt(x.wb_drop)} jatuhan` : "jatuhan –")}</span><span>${lbl("air", x.liter ? `${(x.liter / 1e6).toLocaleString("id-ID", {maximumFractionDigits: 1})} jt liter` : "liter –")}</span>` : ""}</li>`;
    const kartu = prov.map(g => `<article class="ops-kp"><header><b>${esc(u.PROV_PDK[g.p] || g.p)}</b><span><b>${jamB(g.jam)}</b><small>${u.persen(g.jam / tot.jam)} dari total</small></span></header>
      <i class="ops-kp-bar" style="--p:${Math.round(g.jam / tot.jam * 100)}%"></i>
      <ul>${g.r.slice().sort((x, y) => (x.jenis === "wb") - (y.jenis === "wb")).map(baris).join("")}</ul></article>`).join("");
    return bagian("Kontrak 2026", `${hl(jamB(tot.jam))} operasi udara dari ${fmt(tot.n)} kontrak 2026, ${hl(fmt(tot.sortie))} sortie`, `<div class="ops-kp-grid">${kartu}</div>`);
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

  window.OperasiLaporan = {render, kelompokBase, kelompokFoto, kartuOperator, alasanRenlap, kartuOmcResmi};
  if (document.querySelector("#p-operasi.on")) render();
})();
