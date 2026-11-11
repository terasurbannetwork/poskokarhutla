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
  const IK_EY = {"Rencana tindakan": '<path d="M9 11l3 3 8-8"/><path d="M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9"/>', "Data belum lengkap": '<path d="M9 4h6v3H9z"/><path d="M15 5h2a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2"/><path d="M9 12h6M9 16h4"/>', "Papan base": '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
    "Peta operasi": '<path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2z"/><path d="M9 4v14M15 6v14"/>', "Operasi udara": IK.udara, "Operasi darat": IK.darat, Base: '<path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/>',
    Renlap: '<path d="M4 19c4-1 6-5 8-9s5-6 8-6"/><circle cx="4" cy="19" r="1.6"/><circle cx="20" cy="4" r="1.6"/>', "Aksi armada": '<path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z"/>',
    "Tren 30 hari": '<path d="M3 3v18h18"/><path d="m7 15 4-4 3 3 5-6"/>', "Histori armada": '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    Operator: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>', "Jejak ADS-B": '<circle cx="12" cy="12" r="2"/><path d="M16.2 7.8a6 6 0 0 1 0 8.4M7.8 16.2a6 6 0 0 1 0-8.4M19 5a10 10 0 0 1 0 14M5 19A10 10 0 0 1 5 5"/>',
    "Temuan pilot": '<path d="M12 3c1 4 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3.5 2-4.5.3 2 1.5 3 3 3-1-3 0-6 0-8.5z"/>', "OMC resmi BMKG aktif": '<path d="M7 18a4 4 0 0 1-.6-7.96A6 6 0 0 1 18 9a4.5 4.5 0 0 1-.5 9z"/>',
    "Modifikasi cuaca": '<path d="M7 16a4 4 0 0 1-.6-7.96A6 6 0 0 1 18 7a4.5 4.5 0 0 1-.5 9z"/><path d="M8 19v2M12 19v2M16 19v2"/>', Dokumentasi: '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
    Efektivitas: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>', "Kontrak 2026": '<path d="M6 3h9l3 3v15H6z"/><path d="M9 11h6M9 15h6"/>'};
  const eyebrow = ey => { const t = String(ey).replace(/<[^>]+>/g, "").trim(), svg = IK_EY[t];
    return svg ? `<span class="ex-ey ops-ey-ik" title="${esc(t)}" aria-label="${esc(t)}" role="img"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${svg}</svg></span>` : `<span class="ex-ey">${ey}</span>`; };
  /* semua kartu bisa dilipat (pemilik 11 Nov 2026 "semua agar dibuat collapsible", pola pangantara): <details> dengan kepala navy
     sebagai <summary>; bawaan terbuka hanya Base, pilihan buka/tutup diingat per peramban (kenyamanan, bukan data) */
  const BUKA_AWAL = new Set(["papan-base", "peta-operasi"]), CHEV = '<svg class="ops-chev ops-kartu-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>';
  let ingatKartu = {}; try { ingatKartu = JSON.parse(localStorage.getItem("ops_kartu2") || "{}") || {}; } catch (e) {}   // model A: kunci baru, kartu bawaan terbuka
  const idKartu = ey => String(ey).replace(/<[^>]+>/g, "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  /* kepala kartu = NAMA SEKSI, bukan kalimat kesimpulan (pemilik 11 Nov 2026 "ini semuanya bukan kesimpulan kesimpulan ya");
     kalimat temuan (judul) pindah ke baris pertama isi supaya infonya tetap ada */
  const NAMA_SEKSI = {"rencana-tindakan": "Rencana tindakan", "data-belum-lengkap": "Data belum lengkap", "papan-base": "Papan base", "peta-operasi": "Peta operasi", base: "Tabel base dan armada", renlap: "Renlap", "aksi-armada": "Aksi armada", "tren-30-hari": "Tren 30 hari", "histori-armada": "Histori armada", operator: "Operator",
    "jejak-ads-b": "Jejak ADS-B", "temuan-pilot": "Temuan pilot", "omc-resmi-bmkg-aktif": "OMC resmi BMKG", "modifikasi-cuaca": "Modifikasi cuaca", dokumentasi: "Dokumentasi", efektivitas: "Efektivitas", "kontrak-2026": "Kontrak 2026",
    personel: "Personel per unsur", "penanganan-lahan": "Penanganan lahan", "dipadamkan-2026": "Dipadamkan 2026", "patroli-regu": "Patroli regu"};
  /* kategori informasi (pemilik 11 Nov 2026: pil di bawah Ringkasan untuk memilih kategori, pola pangantara; KEPUTUSAN K11, Q14) */
  /* tiga kategori (pemilik 11 Nov 2026, usulan 4): Hari ini, Tren, Kontrak dan OMC */
  const KATEGORI_MODE = {udara: [["hariini", "Hari ini", "kalender", ["papan-base", "peta-operasi", "base", "renlap", "aksi-armada", "temuan-pilot"]],
    ["tren", "Tren", "tren", ["tren-30-hari", "efektivitas", "histori-armada", "dokumentasi", "jejak-ads-b"]],
    ["kontrak", "Kontrak dan OMC", "op", ["operator", "kontrak-2026", "omc-resmi-bmkg-aktif", "modifikasi-cuaca"]]],
    darat: [["personel", "Personel", "peran", ["personel"]], ["lahan", "Lahan", "api", ["penanganan-lahan", "dipadamkan-2026"]], ["patroli", "Patroli", "vis", ["patroli-regu"]]]};
  const KATEGORI_SEMUA = Object.values(KATEGORI_MODE).flat();
  const katKartu = id => (KATEGORI_SEMUA.find(k => k[3].includes(id)) || [""])[0];
  const katPilih = {udara: "hariini", darat: "personel"};
  for (const m of Object.keys(katPilih)) try { const k = localStorage.getItem("ops_kat_" + m); if (KATEGORI_MODE[m].some(x => x[0] === k)) katPilih[m] = k; } catch (e) {}
  /* model A (pemilik 11 Nov 2026, DESIGN-SYSTEM §7): panel seksi kiri; satu seksi = satu tampilan, kartu di dalamnya terbuka.
     [kunci, nama, ikon, kartu-kartu]; seksi "ringkasan" = Perlu tindakan + Ringkasan + kartu yang disebut */
  const SEKSI = {udara: [["Hari ini", [["ringkasan", "Ringkasan", "tren", ["papan-base"]], ["tindak", "Tindak lanjut", "catat", ["rencana-tindakan", "data-belum-lengkap"]], ["base", "Base dan armada", "base", ["base", "histori-armada"]], ["peta", "Peta operasi", "api", ["peta-operasi"]], ["renlap", "Renlap dan sortie", "sortie", ["renlap", "aksi-armada", "temuan-pilot"]]]],
      ["Kinerja", [["tren", "Tren 30 hari", "tren", ["tren-30-hari"]], ["efektivitas", "Efektivitas", "padam", ["efektivitas"]], ["operator", "Operator", "op", ["operator"]], ["dok", "Foto dan jejak terbang", "catat", ["dokumentasi", "jejak-ads-b"]]]],
      ["Kontrak", [["kontrak", "Kontrak 2026", "jam", ["kontrak-2026"]], ["omc", "Modifikasi cuaca", "awan", ["omc-resmi-bmkg-aktif", "modifikasi-cuaca"]]]]],
    darat: [["Hari ini", [["ringkasan", "Ringkasan", "tren", []], ["personel", "Personel", "peran", ["personel"]], ["lahan", "Penanganan lahan", "api", ["penanganan-lahan", "dipadamkan-2026"]], ["patroli", "Patroli regu", "vis", ["patroli-regu"]]]]]};
  const IK_GRUP = {"Hari ini": "kalender", Kinerja: "tren", Kontrak: "op"};
  const seksiDaftar = m => SEKSI[m].flatMap(g => g[1]);
  const seksiPilih = {udara: "ringkasan", darat: "ringkasan"};
  for (const m of Object.keys(seksiPilih)) try { const k = localStorage.getItem("ops_seksi_" + m); if (seksiDaftar(m).some(x => x[0] === k)) seksiPilih[m] = k; } catch (e) {}
  const seksiKartu = (m, id) => seksiDaftar(m).find(x => x[3].includes(id))?.[0];
  function navSeksi(D) {
    const m = st.mode, u = U(), hit = {};
    if (D && m === "udara") { const ar = D.peta.armada || [], bs = (D.peta.base || []).map(b => infoBase(D, b)), tg = bs.reduce((t, x) => t + x.tg.length, 0);
      hit.base = fmt(ar.length); if (tg) hit.renlap = `${fmt(bs.reduce((t, x) => t + x.datang, 0))}/${fmt(tg)}`; const p3 = (S.kluster?.features || []).filter(f => f.properties.level >= 3).length; if (p3) hit.peta = fmt(p3);
      if (D.omc?.length) hit.omc = fmt(D.omc.length); const tk = $("#opsRingkas .ops-tindak li")?.parentElement?.children.length; if (tk) hit.ringkasan = fmt(tk);
      const ap = rencanaAksi(D).length, kd = kurangData(D).reduce((t, x) => t + x.n.length, 0); if (ap + kd) hit.tindak = fmt(ap + kd); }
    const kaki = D && m === "udara" ? kakiSegar(D) : "";
    return kaki + SEKSI[m].map(([g, xs]) => `<p class="ops-nav-g">${lbl(IK_GRUP[g] || "kalender", g)}</p>${xs.map(([k, t, ik]) => `<button type="button" data-seksi="${k}" aria-current="${k === seksiPilih[m] ? "page" : "false"}"><i>${lbl(ik, "")}</i><span>${t}</span>${hit[k] ? `<b${k === "ringkasan" ? ' class="merah"' : k === "tindak" ? ' class="oranye"' : ""}>${hit[k]}</b>` : ""}</button>`).join("")}`).join("");
  }
  /* kesegaran data per sumber (riset dashboard 11 Nov 2026): jam dari datanya sendiri; kuning/merah bila basi */
  function kakiSegar(D) {
    const u = U(), ar = D.peta.armada || [], lapor = ar.filter(a => a.status).length, kini = hariWIB() === D.t, jam = (Date.now() / 36e5 + 7) % 24;
    const mt = [...(u.OP.vis?.stasiun || []).flatMap(x => (x.jam || []).map(j => j.t)), ...(u.OP.metar || []).map(x => x.waktu)].filter(Boolean).map(Date.parse).filter(Number.isFinite), mtMax = mt.length ? Math.max(...mt) : null;
    const umur = mtMax ? (Date.now() - mtMax) / 36e5 : null, ak = D.aksi[0];
    const pil = (k, ik, t, v) => `<span class="ops-segar ${k}">${lbl(ik, t)}<b>${v}</b></span>`;
    return `<div class="ops-nav-kaki"><p class="ops-nav-g">${lbl("respons", "Pembaruan data")}</p>
      ${pil(!kini ? "" : lapor === ar.length ? "ok" : jam >= 7.5 ? "basi" : "tunggu", "jam", "Gelar armada", `${fmt(lapor)}/${fmt(ar.length)}`)}
      ${pil(umur == null ? "basi" : umur <= 1.5 ? "ok" : umur <= 3 ? "tunggu" : "basi", "vis", "METAR", mtMax ? `${u.jamWIB(mtMax)} WIB` : "–")}
      ${pil(ak ? "ok" : "", "sortie", "Sortie terakhir", ak ? `${u.jamWIB(ak.jam_utc)} WIB` : "–")}</div>`;
  }
  /* hanya atribut hidden (INP): kartu di luar seksi disembunyikan, ringkasan hanya di seksi Ringkasan */
  function terapSeksi() {
    const m = st.mode, k = seksiPilih[m], x = seksiDaftar(m).find(z => z[0] === k) || seksiDaftar(m)[0];
    $("#opsIsi")?.querySelectorAll("details.ops-kartu[data-kartu]").forEach(el => { el.hidden = !x[3].includes(el.dataset.kartu); if (!el.hidden && !(el.dataset.kartu in ingatKartu)) el.open = true; });
    const r = $("#opsRingkas"); if (r) r.hidden = x[0] !== "ringkasan";
    const j = $("#opsJudul"); if (j) j.innerHTML = `${lbl(x[2], "")}${x[1]}`;
    $("#opsLaporan .ops-nav-isi")?.querySelectorAll("[data-seksi]").forEach(b => b.setAttribute("aria-current", b.dataset.seksi === x[0] ? "page" : "false"));
    requestAnimationFrame(pasangPeta);
  }
  const pindahSeksi = k => { seksiPilih[st.mode] = k; try { localStorage.setItem("ops_seksi_" + st.mode, k); } catch (e) {} terapSeksi(); const u = $("#opsLaporan .ops-utama"); if (u) { u.scrollTop = 0; u.scrollIntoView({block: "nearest"}); } };
  const pilKategori = m => `<div class="seg ops-kat" role="group" aria-label="Kategori informasi">${KATEGORI_MODE[m].map(([k, t, ik]) => `<button type="button" data-kat="${k}" aria-pressed="${k === katPilih[m]}">${lbl(ik, t)}</button>`).join("")}</div>`;
  /* hanya atribut hidden, tanpa render ulang (INP) */
  const terapKat = root => root?.querySelectorAll("details.ops-kartu[data-kat], [data-kat-bungkus]").forEach(el => { el.hidden = (el.dataset.kat || el.dataset.katBungkus) !== katPilih[st.mode]; });
  /* ringkasan lipat bersama Udara dan Darat: kepala navy + sel berheader */
  const ringkasLipat = (D, sel) => `<section class="ops-pa-sek ops-rk" open><summary><i>${lbl("tren", "")}</i><b>Angka utama</b><small>${lbl("kalender", esc(D.label || tglPendek(D.t)))}</small>${D.vs ? `<small class="vs">${lbl("tren", `dibanding ${esc(D.vs.label)}`)}</small>` : ""}<svg class="ops-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg></summary>
      <div class="ops-lap-angka" style="--n:${sel.length}">${sel.join("")}</div></section>`;
  const selDarat = (ik, n, t, sub, redup) => `<div class="${redup ? "redup" : ""}"><header><i>${lbl(ik, "")}</i><span>${t}</span></header><div class="ops-ub-isi"><b>${n}</b>${sub ? `<em>${sub}</em>` : ""}</div></div>`;
  /* tanpa bingkai: seksi yang isinya sudah kartu (kartu di dalam kartu dihindari, pemilik 11 Nov 2026) */
  const POLOS = new Set();   // pemilik 11 Nov 2026: Papan base dan Dokumentasi juga berbingkai L2
  const bagian = (ey, judul, isi, kanan = "") => { const id = idKartu(ey), buka = id in ingatKartu ? ingatKartu[id] : true, nama = NAMA_SEKSI[id];
    if (!nama) return `<article class="ex ex-std"><header class="ex-hd">${eyebrow(ey)}<div class="ex-jd"><h3>${judul}</h3>${kanan}</div></header><div class="ex-bd">${isi}</div></article>`;
    return `<details class="ex ex-std ops-kartu${POLOS.has(id) ? " ops-polos" : ""}" data-kartu="${id}" data-kat="${katKartu(id)}" open><summary class="ex-hd">${eyebrow(ey)}<div class="ex-jd"><h3>${nama}</h3>${kanan}</div>${CHEV}</summary><div class="ex-bd">${isi}</div></details>`; };   // tanpa kalimat kesimpulan (pemilik 11 Nov 2026 "gausah ada kesimpulan ini")
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

  const st = {mode: "udara", pm: "hari", rDari: "", rSampai: "", tanggal: hariWIB(), reg: "", cache: {}, statis: null};
  try { const m = localStorage.getItem("ops_mode"); if (m === "darat" || m === "udara") st.mode = m; } catch (e) {}

  /* ---------------- data per tanggal ---------------- */
  /* periode (pemilik 11 Nov 2026, K9/UD-18): hari, minggu, bulan, rentang, 12 bulan. Kartu keadaan memakai hari terakhir periode,
     kartu kegiatan dijumlah sepanjang periode (Q13 bawaan). /api/operasi/monitor dibatasi 31 hari, jadi rentang panjang ditarik per
     potongan 31 hari dari belakang; potongan pertama = 31 hari terakhir, KPI 30 hari diambil dari situ. */
  const akhirBulan = t => { const [y, m] = t.split("-").map(Number); return new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10); };
  const geserBulan = (t, n) => { const [y, m] = t.split("-").map(Number); return new Date(Date.UTC(y, m - 1 + n, 1)).toISOString().slice(0, 10); };
  const BLN_P = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
  const rentang = () => { const t = st.tanggal, kini = hariWIB(), cap = x => x > kini ? kini : x;
    if (st.pm === "minggu") { const a = geser(t, -((dow(t) + 6) % 7)); return [a, cap(geser(a, 6))]; }
    if (st.pm === "bulan") return [t.slice(0, 8) + "01", cap(akhirBulan(t))];
    if (st.pm === "12bulan") return [geserBulan(t.slice(0, 8) + "01", -11), cap(akhirBulan(t))];
    if (st.pm === "rentang") { const a = st.rDari || geser(t, -6), b = st.rSampai || t; return a <= b ? [a, b] : [b, a]; }
    return [t, t]; };
  const labelPeriode = ([a, b]) => st.pm === "hari" ? tglPendek(b) : st.pm === "bulan" ? `${BLN_P[+a.slice(5, 7) - 1]} ${a.slice(0, 4)}` : a.slice(0, 4) !== b.slice(0, 4) ? `${tglPendek(a)} ${a.slice(0, 4)} – ${tglPendek(b)} ${b.slice(0, 4)}` : `${tglPendek(a)} – ${tglPendek(b)}`;
  /* periode pembanding (pemilik 11 Nov 2026 "perlu dibuat versus"): hari = kemarin, minggu/rentang = rentang sepanjang sebelumnya,
     bulan = bulan lalu pada tanggal yang sama (1-11 Nov lawan 1-11 Okt); 12 bulan tanpa pembanding (datanya terlalu berat ditarik dua kali) */
  const rentangBanding = ([a, b]) => { if (st.pm === "12bulan") return null;
    if (st.pm === "bulan") { const a0 = geserBulan(a, -1), b0 = geser(a0, Math.round((Date.parse(b) - Date.parse(a)) / 864e5)), z = akhirBulan(a0); return [a0, b0 > z ? z : b0]; }
    const n = Math.round((Date.parse(b) - Date.parse(a)) / 864e5) + 1; return [geser(a, -n), geser(b, -n)]; };
  const muatBanding = ([a, b]) => st.cache["vs_" + a + "_" + b] ||= (async () => {
    const potongan = []; for (let z = b; z >= a; z = geser(z, -31)) { const x = geser(z, -30); potongan.push([x < a ? a : x, z]); }
    const [peta, mons] = await Promise.all([ambil(`/api/operasi/peta?tanggal=${b}`), Promise.all(potongan.map(([x, y]) => ambil(`/api/operasi/monitor?dari=${x}&sampai=${y}`)))]);
    return {peta, aksi: mons.flatMap(m => m?.aksi || []).filter(x => x.tanggal >= a && x.tanggal <= b), ada: !!peta || mons.some(Boolean)};
  })();
  const muatPeriode = (dariP, t) => st.cache[dariP + "_" + t] ||= (async () => {
    const dari = geser(t, -29), awal = dariP < dari ? dariP : dari, potongan = [];
    for (let b = t; b >= awal; b = geser(b, -31)) { const a = geser(b, -30); potongan.push([a < awal ? awal : a, b]); }
    const [peta, mons, nilai, jejak, omc, snap, patroli] = await Promise.all([
      ambil(`/api/operasi/peta?tanggal=${t}`), Promise.all(potongan.map(([a, b]) => ambil(`/api/operasi/monitor?dari=${a}&sampai=${b}`))), ambil(`/api/operasi/nilai?dari=${geser(t, -6)}&sampai=${t}`),
      ambil(`/api/operasi/jejak?tanggal=${t}`), ambil(`/api/omc/sortie?sejak=${dari}`), ambil(`/api/laporan-karhutla/snapshot/${t}`), ambil("/api/ops/patroli")]);
    const mon = mons.some(Boolean) ? {...mons[0], aksi: mons.flatMap(m => m?.aksi || [])} : null;
    return {t, dari, dariP, peta, mon, nilai, jejak, omc: (omc?.sortie || []).filter(x => (x.mulai || "").slice(0, 10) <= t || !x.mulai), snap, patroli: patroli?.patroli || null};
  })();
  const muatStatis = () => st.statis ||= Promise.all([ambil("/data/harian30.json"), ambil("/udara/data/omc_hasil.json"), ambil("/data/bnpb.json"), ambil("/data/operasi_resmi.json"), ambil("/udara/data/omc_bmkg.json")])
    .then(([h30, omcHasil, bnpb, resmi, omcBmkg]) => ({h30, omcHasil, bnpb, resmi, omcBmkg}));

  /* ---------------- kerangka: tab Udara/Darat, tanggal, salin teks ---------------- */
  /* panel seksi bisa ditarik lebarnya (aturan pemilik: semua panel samping bisa ditarik), lebar diingat */
  function pasangTarikNav(box) {
    const a = box.querySelector(".ops-a"), tk = box.querySelector(".ops-nav-tarik"); if (!a || !tk) return;
    const set = w => { w = Math.max(184, Math.min(320, w)); a.style.setProperty("--nav-w", w + "px"); return w; };
    try { const w = +localStorage.getItem("ops_nav_lebar"); if (w) set(w); } catch (e) {}
    let x0 = 0, w0 = 0, w = 0; const nav = box.querySelector(".ops-nav");
    const gerak = e => { w = set(w0 + e.clientX - x0); }, lepas = () => { tk.classList.remove("aktif"); removeEventListener("pointermove", gerak); removeEventListener("pointerup", lepas); try { localStorage.setItem("ops_nav_lebar", String(w)); } catch (e) {} petaOps?.resize(); };
    tk.addEventListener("pointerdown", e => { e.preventDefault(); x0 = e.clientX; w0 = w = nav.offsetWidth; tk.classList.add("aktif"); addEventListener("pointermove", gerak); addEventListener("pointerup", lepas); });
    tk.addEventListener("keydown", e => { if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return; e.preventDefault(); w = set(nav.offsetWidth + (e.key === "ArrowRight" ? 16 : -16)); try { localStorage.setItem("ops_nav_lebar", String(w)); } catch (x) {} });
  }
  function kerangka(box) {
    box.innerHTML = `<div class="ops-a"><aside class="ops-nav" aria-label="Seksi operasi">
      <div class="seg ops-mode" role="group" aria-label="Bagian operasi">${[["udara", "Udara"], ["darat", "Darat"]].map(([k, t]) => `<button type="button" data-mode="${k}" aria-pressed="${st.mode === k}">${ik(k)}${t}</button>`).join("")}</div>
      <nav class="ops-nav-isi">${navSeksi(null)}</nav><span class="ops-nav-tarik" tabindex="0" role="separator" aria-orientation="vertical" aria-label="Tarik lebar panel"></span></aside>
      <div class="ops-kanan"><h2 id="opsJudul" class="ops-judul"></h2><div class="ops-utama" role="region" aria-label="Isi seksi"><div class="ops-alat" role="toolbar" aria-label="Laporan operasi">

      ${""/* tombol Salin teks WA (data-aksi="salin") dan Cetak / PDF (data-aksi="cetak") disembunyikan pemilik 11 Nov 2026; handler dan salin() tetap */}
      <span class="ops-status" role="status"></span></div><div class="ops-periode" role="group" aria-label="Periode laporan">${periode()}</div><div id="opsRingkas" class="ops-ringkas-slot"></div><div id="opsIsi"></div></div></div></div>`;
    pasangTarikNav(box);
    box.addEventListener("toggle", e => { const k = e.target.dataset?.kartu; if (!k) return; if (k === "peta-operasi" && e.target.open) requestAnimationFrame(pasangPeta); ingatKartu[k] = e.target.open; try { localStorage.setItem("ops_kartu2", JSON.stringify(ingatKartu)); } catch (x) {} }, true);
    { const tip = document.createElement("div"); tip.className = "ops-tip"; tip.hidden = true; box.append(tip);   // tooltip grafik di halaman (data-otip sudah di-escape saat dibuat)
      box.addEventListener("pointermove", e => { const el = e.target.closest?.("[data-otip]"); if (!el || el.closest("dialog")) { tip.hidden = true; return; }
        if (tip.dataset.dari !== el.dataset.otip) { tip.innerHTML = el.dataset.otip; tip.dataset.dari = el.dataset.otip; }
        tip.hidden = false; const w = tip.offsetWidth, h = tip.offsetHeight; tip.style.left = Math.min(innerWidth - w - 8, e.clientX + 14) + "px"; tip.style.top = Math.max(8, e.clientY - h - 12) + "px"; });
      box.addEventListener("pointerleave", () => { tip.hidden = true; }); }
    box.addEventListener("click", e => {
      box.querySelectorAll(".ops-pop[open]").forEach(d => { if (!d.contains(e.target)) d.open = false; });   // popover kalender tutup bila klik di luar
      /* model A: kartu utama dan Ringkasan selalu terbuka, kepala tidak melipat (pemilik 11 Nov 2026); tautan tetap jalan */
      if (e.target.closest("details.ops-kartu>summary, .ops-rk>summary") && !e.target.closest("a, input, select, label")) e.preventDefault();
      const m = e.target.closest("[data-mode]");
      if (m) { st.mode = m.dataset.mode; try { localStorage.setItem("ops_mode", st.mode); } catch (x) {} box.querySelectorAll("[data-mode]").forEach(b => b.setAttribute("aria-pressed", String(b === m))); const nv = $("#opsLaporan .ops-nav-isi"); if (nv) nv.innerHTML = navSeksi(null); return sesudahFrame(isi); }
      const sk = e.target.closest("[data-seksi]"); if (sk) return pindahSeksi(sk.dataset.seksi);
      const lp = e.target.closest("[data-lapis]"); if (lp) { const on = lp.getAttribute("aria-pressed") !== "true"; lp.setAttribute("aria-pressed", String(on)); for (const id of lp.dataset.lapis.split(",")) if (petaOps?.getLayer(id)) petaOps.setLayoutProperty(id, "visibility", on ? "visible" : "none"); return; }
      const ap = e.target.closest("[data-ap]"); if (ap) { const [j, v] = ap.dataset.ap.split(":"); return j === "pb" ? bukaBasePop(v) : j === "ar" ? bukaArmada(v) : pindahSeksi(v); }
      const rp = e.target.closest("[data-reg-pk]"); if (rp) return bukaArmada(rp.dataset.regPk);
      const th = e.target.closest(".ops-tw thead th"); if (th && !th.closest("table").querySelector("tr.ops-grup")) return urutTabel(th);
      const op = e.target.closest("tr[data-op]"); if (op) return bukaOperator(op.dataset.op);
      const ro = e.target.closest("tr[data-reg-omc]"); if (ro) return bukaArmada(ro.dataset.regOmc);
      const pb = e.target.closest("[data-pb]"); if (pb) return bukaBasePop(pb.dataset.pb);
      const nl = e.target.closest("[data-nilai]"); if (nl) return bukaNilai(nl.dataset.nilai);
      const ti = e.target.closest("[data-tindak]"); if (ti) { const [j, v] = ti.dataset.tindak.split(":");
        if (j === "pb") return bukaBasePop(v); if (j === "rk") return bukaRingkas(v); if (j === "seksi") return pindahSeksi(v);
        const id = j === "peta" ? "peta-operasi" : v, sk2 = seksiKartu(st.mode, id); if (!sk2) return; pindahSeksi(sk2);
        const kartu = $(`details[data-kartu="${id}"]`); if (kartu) kartu.open = true; return; }
      const ka = e.target.closest(".ops-akt[data-reg]"); if (ka) return bukaArmada(ka.dataset.reg);
      const rk = e.target.closest(".ops-lap-angka [data-rk]"); if (rk) return bukaRingkas(rk.dataset.rk);
      const kt = e.target.closest(".ops-kat [data-kat]"); if (kt) { katPilih[st.mode] = kt.dataset.kat; try { localStorage.setItem("ops_kat_" + st.mode, kt.dataset.kat); } catch (x) {}
        kt.parentElement.querySelectorAll("[data-kat]").forEach(b => b.setAttribute("aria-pressed", String(b === kt))); terapKat($("#opsIsi")); return requestAnimationFrame(pasangPeta); }
      const ud = e.target.closest("[data-unduh]"); if (ud) { e.preventDefault(); return st._d && unduhRute(st._d, ud.dataset.base, ud.dataset.unduh); }   // tombol di dalam <summary>: jangan ikut melipat
      const fp = e.target.closest("[data-fpulau], [data-ftanda]"); if (fp) return saringBase(fp);
      const fo = e.target.closest("[data-fop]"); if (fo) return saringOp(fo);
      const gr = e.target.closest("tr.ops-grup"); if (gr) return lipatGrup(gr);
      const bb = e.target.closest("tr.ops-bb"); if (bb) return bukaBase(bb);
      const rpe = e.target.closest("[data-rpre]"); if (rpe) { const [x, y] = rentangPreset(rpe.dataset.rpre); st.rDari = x; st.rSampai = y; st.tanggal = y; const p = $("#opsLaporan .ops-periode"); if (p) p.innerHTML = periode(); return sesudahFrame(isi); }
      const pm = e.target.closest("[data-pm]"); if (pm) { if (st.pm === pm.dataset.pm) return; st.pm = pm.dataset.pm; const p = $("#opsLaporan .ops-periode"); if (p) p.innerHTML = periode(); return sesudahFrame(isi); }
      const tg = e.target.closest("[data-tgl]"); if (tg) return pilihTanggal(tg.dataset.tgl);
      const lb = e.target.closest(".ops-tgl"); if (lb) { const i = lb.querySelector("input"); try { i.showPicker(); e.preventDefault(); } catch (x) {} return; }
      const a = e.target.closest("[data-aksi]"); if (!a) return;
      if (a.dataset.aksi === "cetak") return window.print();
      if (a.dataset.aksi === "salin") salin(a);
    });
    box.addEventListener("keydown", e => { if (e.key === "Enter" && e.target.matches?.("[data-ap]")) return e.target.click(); const k = (e.key === "Enter" || e.key === " ") && e.target.closest?.("[data-rk], [data-pb], .ops-akt[data-reg], tr.ops-bb, tr.ops-grup, tr[data-op]"); if (k) { e.preventDefault(); k.dataset.op ? bukaOperator(k.dataset.op) : k.dataset.pb ? bukaBasePop(k.dataset.pb) : k.dataset.rk ? bukaRingkas(k.dataset.rk) : k.dataset.reg ? bukaArmada(k.dataset.reg) : k.classList.contains("ops-grup") ? lipatGrup(k) : bukaBase(k); } });
    box.addEventListener("change", e => {
      if (e.target.matches("[data-rentang]")) { if (!e.target.value) return; st[e.target.dataset.rentang === "dari" ? "rDari" : "rSampai"] = e.target.value; st.tanggal = rentang()[1]; return sesudahFrame(isi); }
      if (e.target.matches(".ops-tgl input")) return pilihTanggal(e.target.value);
      if (e.target.matches("[data-hbase]")) { st.reg = e.target.value; return sesudahFrame(() => { const k = $("#opsHistori"); if (k) k.outerHTML = kartuHistori(st._d); }); }
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
  /* pemilih periode: deret mode di atas, lalu navigasi per mode (pola pangantara, K9) */
  const MODE_P = [["hari", "Hari", "kalender"], ["minggu", "Minggu", "kalender"], ["bulan", "Bulan", "kalender"], ["rentang", "Rentang", "tren"], ["12bulan", "12 Bulan", "tren"]];
  function periode() {
    const seg = `<div class="seg ops-pm" role="group" aria-label="Jenis periode">${MODE_P.map(([k, t, ik]) => `<button type="button" data-pm="${k}" aria-pressed="${st.pm === k}">${lbl(ik, t)}</button>`).join("")}</div>`;
    return seg + (st.pm === "hari" ? periodeHari() : periodeLain());
  }
  function periodeLain() {
    const t = st.tanggal, kini = hariWIB(), [a, b] = rentang(), mulaiLalu = x => x <= kini ? (x > kini ? kini : x) : null;
    const nav = (arah, x, teks, lab) => { const sah = x && x <= kini && x >= TGL_MIN; return `<button type="button" class="ops-lgk" ${sah ? `data-tgl="${x}"` : "disabled"}>${arah < 0 ? `<b>‹ ${teks}</b><span class="ops-lnc">${lab}</span>` : `<span class="ops-lnc">${lab}</span><b>${teks} ›</b>`}</button>`; };
    let kiri = "", kanan = "", strip = "", tengah = esc(labelPeriode([a, b]));
    if (st.pm === "minggu") { const s0 = geser(a, -7), s1 = geser(a, 7);
      kiri = nav(-1, s0, "Minggu lalu", `${tglPendek(s0)} – ${tglPendek(geser(s0, 6))}`); kanan = nav(1, mulaiLalu(s1), "Minggu depan", `${tglPendek(s1)} – ${tglPendek(geser(s1, 6))}`);
      const awalB = t.slice(0, 8) + "01", senin1 = geser(awalB, -((dow(awalB) + 6) % 7)), mg = [];
      for (let x = senin1; x <= akhirBulan(t); x = geser(x, 7)) mg.push(x);
      strip = mg.map((x, i) => `<button type="button" class="ops-hr${x === a ? " on" : ""}" ${x <= kini ? `data-tgl="${x}"` : "disabled"}><b>Minggu ${i + 1}</b><span>${tglPendek(x)} – ${tglPendek(geser(x, 6))}</span></button>`).join(""); }
    else if (st.pm === "bulan" || st.pm === "12bulan") { const b0 = geserBulan(a.slice(0, 8) + "01", st.pm === "bulan" ? -1 : 0), b1 = geserBulan(t.slice(0, 8) + "01", 1), bl = x => `${BLN[+x.slice(5, 7) - 1]} ${x.slice(0, 4)}`;
      const lalu = st.pm === "bulan" ? b0 : geserBulan(t.slice(0, 8) + "01", -1);
      kiri = nav(-1, lalu, "Bulan lalu", bl(lalu)); kanan = nav(1, b1, "Bulan depan", bl(b1));
      const th = t.slice(0, 4); strip = Array.from({length: 12}, (_, i) => `${th}-${String(i + 1).padStart(2, "0")}-01`).map(x => `<button type="button" class="ops-hr${x.slice(0, 7) === t.slice(0, 7) ? " on" : ""}" ${x <= kini && x >= TGL_MIN.slice(0, 8) + "01" ? `data-tgl="${x}"` : "disabled"}><b>${BLN[+x.slice(5, 7) - 1]}</b><span>${th}</span></button>`).join(""); }
    else if (st.pm === "rentang") { const pre = [["7", "7 hari terakhir"], ["14", "14 hari terakhir"], ["31", "31 hari terakhir"], ["bi", "Bulan ini"], ["bl", "Bulan lalu"]];
      strip = pre.map(([k, t]) => { const [x, y] = rentangPreset(k); return `<button type="button" class="ops-hr${x === a && y === b ? " on" : ""}" data-rpre="${k}"><b>${t}</b><span>${tglPendek(x)} – ${tglPendek(y)}</span></button>`; }).join(""); }
    if (st.pm === "rentang") tengah = `<label class="ops-tgl ops-rg">${lbl("kalender", "")}<input type="date" data-rentang="dari" value="${a}" max="${kini}" min="${TGL_MIN}" aria-label="Dari tanggal"></label><span>sampai</span><label class="ops-tgl ops-rg">${lbl("kalender", "")}<input type="date" data-rentang="sampai" value="${b}" max="${kini}" min="${TGL_MIN}" aria-label="Sampai tanggal"></label>`;
    const hr = Math.round((Date.parse(b) - Date.parse(a)) / 864e5) + 1;
    return `<div class="ops-p1${st.pm === "rentang" ? " rg" : ""}">${kiri}<div class="ops-ptg"><span>Periode</span><b class="ops-pl">${tengah}</b><em class="ops-kini">${fmt(hr)} hari</em></div>${kanan}</div>${strip ? popStrip(st.pm === "minggu" ? "Pilih minggu" : "Pilih bulan", `<div class="ops-p2"><div class="ops-strip" style="grid-template-columns:repeat(${st.pm === "minggu" ? 6 : st.pm === "rentang" ? 5 : 12},minmax(0,1fr))">${strip}</div></div>`) : ""}`;
  }
  function periodeHari() {
    const t = st.tanggal, kini = hariWIB(), senin = geser(t, -((dow(t) + 6) % 7)), kmr = geser(t, -1), bsk = geser(t, 1), mL = geser(t, -7), mD = geser(t, 7);
    return `<div class="ops-p1">${tb(kmr, "ops-lgk", `<b>‹ Kemarin</b><span class="ops-lnc">${hariLabel(kmr)}</span>`)}
      <div class="ops-ptg"><span>Periode</span><label class="ops-tgl"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg><span>${hariLabel(t)}</span><input type="date" value="${t}" max="${kini}" min="${TGL_MIN}" aria-label="Pilih tanggal"></label>${t === kini
        ? `<em class="ops-kini">Hari ini</em>` : `<button type="button" class="ops-kembali" data-tgl="${kini}">↺ Hari ini</button>`}</div>
      ${tb(bsk, "ops-lgk", `<span class="ops-lnc">${hariLabel(bsk)}</span><b>Besok ›</b>`)}</div>
      ${popStrip("Pilih hari", `<div class="ops-p2">${tb(mL, "ops-ujung", `‹ ${mingguLabel(mL)}`, mingguLabel(mL))}<div class="ops-strip">${Array.from({length: 7}, (_, i) => { const d = geser(senin, i);
        return tb(d, `ops-hr${d === t ? " on" : ""}${d === kini ? " kini" : ""}`, `<b data-p="${HARI[dow(d)]}">${HARI_P[dow(d)]}</b><span>${tglPendek(d)}</span>`); }).join("")}</div>${tb(mD, "ops-ujung", `${mingguLabel(mD)} ›`, mingguLabel(mD))}</div>`)}`;
  }
  /* strip hari/minggu/bulan di popover kalender supaya pemilih periode satu baris (riset dashboard 11 Nov 2026) */
  const popStrip = (t, isi) => isi;
  /* rentang siap pakai: maks 31 hari (batas /api/operasi/monitor per panggilan dipecah per 31 hari) */
  const rentangPreset = k => { const kini = hariWIB(); if (k === "bi") return [kini.slice(0, 8) + "01", kini];
    if (k === "bl") { const a = geserBulan(kini.slice(0, 8) + "01", -1); return [a, akhirBulan(a)]; } return [geser(kini, -(+k - 1)), kini]; };   // pemilik 11 Nov 2026: pakai pemilih periode yang lama (strip tetap tampil), popover dicabut
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
    for (let r = tr.nextElementSibling; r && !r.classList.contains("ops-grup"); r = r.nextElementSibling) { const bb = r.classList.contains("ops-rinci") ? r.previousElementSibling : r;
      r.hidden = !buka || bb.dataset.lolos === "" || (r !== bb && bb.getAttribute("aria-expanded") !== "true"); } };
  /* saring tabel operator: pulau + "siap belum terbang" (pemilik 11 Nov 2026 "agar ada filternya") */
  const saringOp = btn => { const kartu = btn.closest("details, .ex"); if (!kartu) return; const [j, v] = btn.dataset.fop.split(":");
    if (j === "p") kartu.querySelectorAll('[data-fop^="p:"]').forEach(b => b.setAttribute("aria-pressed", String(b === btn))); else btn.setAttribute("aria-pressed", String(btn.getAttribute("aria-pressed") !== "true"));
    const p = kartu.querySelector('[data-fop^="p:"][aria-pressed="true"]')?.dataset.fop.slice(2) || "", ng = kartu.querySelector('[data-fop="n:"]')?.getAttribute("aria-pressed") === "true";
    for (const g of kartu.querySelectorAll("tr.ops-grup")) { let ada = 0; const buka = g.getAttribute("aria-expanded") === "true";
      for (let r = g.nextElementSibling; r && !r.classList.contains("ops-grup"); r = r.nextElementSibling) { const ok = (!p || r.dataset.pulau === p) && (!ng || r.classList.contains("ops-nganggur"));
        if (ok) { delete r.dataset.lolos; ada++; } else r.dataset.lolos = ""; r.hidden = !ok || !buka; }
      g.hidden = !ada; } };
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
    const rg = rentang(), rb = rentangBanding(rg), [d, s, vs] = await Promise.all([muatPeriode(rg[0], rg[1]), muatStatis(), rb ? muatBanding(rb) : null]);
    if (n !== nomor) return;
    const D = st._d = {...siapkan(d), ...s, pm: st.pm, label: labelPeriode(rg)};
    D.vs = vs?.ada ? {...vs, label: labelPeriode(rb), hari: D.hitung(vs.aksi)} : null;
    el.innerHTML = st.mode === "udara" ? udara(D) : darat(D);
    /* Ringkasan tinggal di wadah yang sama dengan tab dan pemilih periode (pemilik 11 Nov 2026 "disatuin dalam satu container") */
    const rk = [...el.querySelectorAll(":scope > .ops-tindak, :scope > .ops-rk")], slot = $("#opsRingkas"); if (slot) slot.replaceChildren(...rk);
    const nv = $("#opsLaporan .ops-nav-isi"); if (nv) nv.innerHTML = navSeksi(D);
    terapSeksi();
  }

  /* ---------------- turunan udara ---------------- */
  function siapkan(d) {
    const t = d.t, peta = d.peta || {base: [], armada: [], temuan: [], renlap: [], gerak: []}, aksi30 = d.mon?.aksi || [];
    const aksi = aksi30.filter(a => a.tanggal >= (d.dariP || t) && a.tanggal <= t).sort((x, y) => (y.jam_utc || 0) - (x.jam_utc || 0));
    const reg2base = Object.fromEntries((peta.armada || []).map(a => [a.registrasi, a.base_id]));
    const hitung = xs => { const p = xs.filter(a => a.hasil === "padam").length, m = xs.filter(a => a.hasil === "masih_api").length;
      return {sortie: xs.length, wb: xs.filter(a => a.guna === "wb").length, drop: xs.reduce((s, a) => s + (a.drop || 0), 0), padam: p, dinilai: p + m, persen: p + m ? p / (p + m) : null, foto: xs.reduce((s, a) => s + (a.foto || []).length, 0)}; };
    const perHari = Array.from({length: 30}, (_, i) => { const tg = geser(d.dari, i); return {t: tg, ...hitung(aksi30.filter(a => a.tanggal === tg))}; });
    return {...d, peta, aksi, aksi30, reg2base, hari: hitung(aksi), perHari, hitung, baseAksi: id => aksi.filter(a => (a.base_id || reg2base[a.registrasi]) === id)};
  }
  /* kolom Kelayakan terbang (pemilik 11 Nov 2026): tanpa kode ICAO, jarak pandang/angin/jam jadi label berikon; kalimat lengkap tetap di title pil */
  const IK_LBL = {catat: '<path d="M9 4h6v3H9z"/><path d="M15 5h2a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2"/><path d="M9 12h6M9 16h4"/>', vis: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>', angin: '<path d="M3 8h10a3 3 0 1 0-3-3M3 12h15a3 3 0 1 1-3 3M3 16h7"/>',
    es: '<path d="M12 2v20M4.9 6l14.2 12M4.9 18 19.1 6"/><path d="m9 4 3 2 3-2M9 20l3-2 3 2"/>', garam: '<path d="M12 3 20 7.5v9L12 21 4 16.5v-9z"/><path d="M12 12 20 7.5M12 12v9M12 12 4 7.5"/>',
    jam: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>', silang: '<circle cx="12" cy="12" r="9"/><path d="m9 9 6 6M15 9l-6 6"/>', tren: '<path d="M3 3v18h18"/><path d="m7 15 4-4 3 3 5-6"/>', siap: '<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>', sortie: '<path d="M4 19c4-1 6-5 8-9s5-6 8-6"/><circle cx="4" cy="19" r="1.6"/>', temuan: '<path d="M12 3c1 4 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3.5 2-4.5.3 2 1.5 3 3 3-1-3 0-6 0-8.5z"/>', awan: '<path d="M7 18a4 4 0 0 1-.6-7.96A6 6 0 0 1 18 9a4.5 4.5 0 0 1-.5 9z"/>', air: '<path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z"/>', padam: '<path d="M12 3c1 4 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3.5 2-4.5.3 2 1.5 3 3 3-1-3 0-6 0-8.5z"/><path d="M4 4l16 16"/>',
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
    tulisRute(pts, judul, `renlap_${nm.replace(/[^\w]+/g, "_")}_${D.t}${r.versi ? `_${String(r.versi).replace(/[^\w]+/g, "")}` : ""}`, f);
  }
  function tulisRute(pts, judul, berkas, f) {
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
    a.download = `${berkas}.${f}`; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
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
      const peran = PERAN[a.peran] || a.peran || "", milik = a.pemilik ? PEMILIK[a.pemilik] || a.pemilik : "", op = a.operator && a.operator !== milik ? a.operator : "";
      const ul = `<li class="ops-ar-baris1"><span class="ops-ar-st ${s[1]}"><i></i>${s[0]}</span><span class="ops-ar-tipe${/belum tercatat/.test(tipe) ? " nihil" : ""}">${lbl("peran", esc(tipe))}</span></li>` + baris("op", esc(op)) + baris("ember", a.bucket_liter ? `Bucket ${fmt(a.bucket_liter)} L` : "") + (aksi.length ? baris("sortie", `${fmt(aksi.length)} sortie${wb ? `, ${fmt(wb)} WB` : ""}`) : "");
      const isi = (ul ? `<ul>${ul}</ul>` : "") + (a.alasan ? `<p class="ops-pa-alasan">${esc(a.alasan)}</p>` : "");
      return `<article class="ops-akt" data-reg="${esc(a.registrasi)}" tabindex="0" role="button" aria-label="Histori ${esc(a.registrasi)}"><figure>${f ? u.imgAr(a, "", `${a.registrasi} ${tipe}`) : `<span class="ops-ar-kosong">${lbl("peran", "")}</span>`}${peran ? `<span class="ops-ar-tag atas" data-warna="${esc(a.peran)}">${lbl("peran", esc(peran))}</span>` : ""}${milik ? `<span class="ops-ar-tag bawah" data-warna="${esc(a.pemilik)}">${lbl("milik", esc(milik))}</span>` : ""}<figcaption><b>${esc(a.registrasi)}</b></figcaption></figure>
        ${isi ? `<div class="ops-ar-isi">${isi}</div>` : ""}</article>`; }).join("")}</div>`;
  }
  const namaBase = (D, id) => ((D.peta.base || []).find(b => b.id === id)?.nama || id || "–").split(" / ")[0];

  /* ---------- papan base (usulan 1): satu kartu per base menjawab "base ini perlu apa" ---------- */
  const ZONA_BASE = {BDJ: 1};   // ALGORITMA §1: selisih jam dari WIB; base lain WIB
  const LVK = ["Aman", "Patroli", "Siaga", "Prioritas"];
  function infoBase(D, b) {
    const u = U(), a = (D.peta.armada || []).filter(x => x.base_id === b.id), lapor = a.some(x => x.status), siap = a.filter(x => SIAP.includes(x.status)).length;
    const dk = S.kluster?.features?.length ? u.apiDekat(b) : [], p3 = dk.filter(c => c.level >= 3).length, lv = p3 ? 3 : dk.some(c => c.level === 2) ? 2 : dk.length ? 1 : 0;
    const r = renlapBase(D, b.id), tg = r?.target || [], aksiB = D.aksi.filter(x => (x.base_id || D.reg2base[x.registrasi]) === b.id);
    const datang = tg.filter(g => aksiB.some(x => x.lat != null && km(g.lat, g.lon, x.lat, x.lon) <= RENLAP_KM)).length;
    return {b, a, lapor, siap, dk, p3, lv, r, tg, datang, aksi: aksiB, k: D.hitung(aksiB), lay: u.kelayakan(b)};
  }
  function kartuPapan(D) {
    const u = U(), bs = (D.peta.base || []).map(b => infoBase(D, b)).sort((x, y) => y.lv - x.lv || y.p3 - x.p3 || y.a.length - x.a.length);
    if (!bs.length) return bagian("Papan base", "", `<p class="ops-kosong">Belum ada base tercatat.</p>`);
    /* nilai kartu base jadi label seragam (pemilik 11 Nov 2026 "ini semua dibuat label"): hijau baik, oranye perlu perhatian, merah prioritas, abu netral kosong */
    const pv = (k, t) => `<span class="pill ops-pbv ${k}">${esc(t)}</span>`;
    const kartu = x => { const bar = (n, d, kelas = "") => `<i class="ops-pb-bar ${kelas}" style="--p:${d ? Math.round(n / d * 100) : 0}%"></i>`;
      return `<article class="ops-pb lv${x.lv}" data-pb="${esc(x.b.id)}" tabindex="0" role="button" aria-label="Rincian base ${esc(x.b.nama)}">
        <header><div><p class="ops-pb-nm"><b>${esc(x.b.nama.split(" / ")[0])}</b><em class="ops-pb-icao">${esc(x.b.icao || x.b.id)}</em></p><span class="ops-pb-sub"><small class="ops-pb-prov">${lbl("base", esc(u.PROV_PDK[x.b.prov] || x.b.prov || ""))}</small><small class="ops-pb-prov">${lbl("peran", `${fmt(x.a.length)} armada`)}</small><span class="ops-pb-lv">${lbl("api", LVK[x.lv])}</span></span></div></header>
        <ul>
          <li><span>${lbl("siap", "Siap")}</span><b>${x.lapor ? pv(x.siap === x.a.length ? "ok" : "awas", `${fmt(x.siap)}/${fmt(x.a.length)} siap`) : pv("awas", "Belum lapor")}</b>${x.lapor ? bar(x.siap, x.a.length, "ok") : ""}</li>
          <li><span>${lbl("vis", "Cuaca terbang")}</span><b>${u.pilLayak(x.lay)}</b></li>
          <li><span>${lbl("api", "Api terjangkau")}</span><b>${x.dk.length ? (x.p3 ? pv("bahaya", `${fmt(x.p3)} prioritas dari ${fmt(x.dk.length)}`) : pv("awas", `${fmt(x.dk.length)} cluster`)) : pv("ok", "Tidak ada")}</b></li>
          <li><span>${lbl("sortie", "Renlap")}</span><b>${x.tg.length ? pv(x.datang === x.tg.length ? "ok" : "awas", `${fmt(x.datang)}/${fmt(x.tg.length)} didatangi`) : pv("netral", "Belum ada")}</b>${x.tg.length && x.datang ? bar(x.datang, x.tg.length, "renlap") : ""}</li>
          <li><span>${lbl("air", D.pm === "hari" ? "Sortie hari ini" : "Sortie periode")}</span><b>${x.k.sortie ? pv("ok", `${fmt(x.k.sortie)} sortie${x.k.wb ? `, ${fmt(x.k.wb)} WB` : ""}`) : pv("netral", "Belum ada")}</b></li>
        </ul></article>`; };   // tanpa kaki "Rincian ›": kartu sendiri bisa diklik (pemilik 11 Nov 2026)
    /* dikelompokkan per pulau (pemilik 11 Nov 2026), urutan dalam pulau tetap: api paling genting dulu */
    const grup = {}; for (const x of bs) (grup[PULAU[String(x.b.prov || "")[0]] || "Lainnya"] ||= []).push(x);
    return bagian("Papan base", "", `<div class="ops-pb-pulau">${URUT_PULAU.filter(g => grup[g]).map(g => `<section><h4>${lbl("base", esc(g))}<span class="kn"><small>${lbl("base", `${fmt(grup[g].length)} base`)}</small><small>${lbl("peran", `${fmt(grup[g].reduce((t, x) => t + x.a.length, 0))} armada`)}</small></span></h4>
      <div class="ops-pb-grid" style="--n:${Math.min(grup[g].length, 6)};--nb:${grup[g].length <= 3 ? grup[g].length : Math.ceil(grup[g].length / 2)}">${grup[g].map(kartu).join("")}</div></section>`).join("")}</div>`);
  }
  function bukaBasePop(id) {
    const D = st._d, b = (D?.peta.base || []).find(x => x.id === id); if (!b) return;
    const u = U(), x = infoBase(D, b);
    const api = x.dk.length ? `<ul class="ops-rp-base">${x.dk.slice(0, 30).map(c => `<li><div><b>${esc(c.kec || c.desa || c.kab || "Cluster")}</b><small>${lbl("base", `${fmt(Math.round(c.jarak))} km dari base`)}</small>${c.px24 != null ? `<small>${lbl("api", `${fmt(c.px24)} titik 24 jam`)}</small>` : ""}</div><span class="pill l${c.level}">${LVK[c.level] || ""}</span><a href="${u.gmaps(c.lat, c.lon)}" target="_blank" rel="noopener noreferrer">${lbl("base", "Peta")}</a></li>`).join("")}</ul>`
      : `<p class="ops-kosong">Tidak ada cluster titik panas aktif dalam jangkauan ${fmt(Math.round(u.radiusBase(b)))} km.</p>`;
    const renlap = x.tg.length ? `<ol class="ops-rl-grid">${x.tg.map((g, i) => { const d = x.aksi.some(a => a.lat != null && km(g.lat, g.lon, a.lat, a.lon) <= RENLAP_KM);
        return `<li class="${d ? "datang" : ""}"><span class="ops-rl-no">${fmt(g.urut ?? i + 1)}</span><div><p><b>${esc(g.lokasi || g.nama || "Target")}</b><a href="${u.gmaps(g.lat, g.lon)}" target="_blank" rel="noopener noreferrer">${lbl("base", "Peta")}</a></p><footer>${d ? `<span class="pill l0">Didatangi</span>` : `<span class="ops-rl-belum">Belum didatangi</span>`}</footer></div></li>`; }).join("")}</ol>
        <p class="ops-rp-unduh">${["kml", "gpx"].map(f => `<button type="button" class="ops-kml" data-unduh="${f}" data-base="${esc(b.id)}">${lbl("unduh", f.toUpperCase())}</button>`).join("")}</p>` : `<p class="ops-kosong">Belum ada renlap untuk base ini.</p>`;
    const aksi = x.aksi.length ? `<ul class="ops-rp-base">${x.aksi.map(a => { const h = a.guna === "wb" ? (u.HASIL[a.hasil] || u.HASIL.tak_dinilai) : null;
        return `<li><div><b>${esc(a.lokasi || "Lokasi tidak tercatat")}</b><small>${esc(a.registrasi)}, ${esc(tglPendek(a.tanggal))} ${u.jamWIB(a.jam_utc)} WIB${a.drop ? `, ${fmt(a.drop)} jatuhan` : ""}</small></div><span class="ops-lm-misi" data-g="${esc(a.guna || "")}">${esc(MISI[a.guna] || a.jenis || "Misi")}</span>${h ? `<span class="pill ${h[1]}">${h[0]}</span>` : ""}</li>`; }).join("")}</ul>` : `<p class="ops-kosong">Belum ada sortie pada periode ini.</p>`;
    bukaDialog(`<article class="ex ex-std ops-pa ops-rp"><header class="ops-rp-hd"><i>${lbl("base", "")}</i><div><h3>${esc(b.nama.split(" / ")[0])}</h3><small>${lbl("base", `${esc(u.PROV_PDK[b.prov] || b.prov || "")}, ${esc(b.icao || b.id)}`)}</small><small>${lbl("api", LVK[x.lv])}</small></div>
      <span class="ops-rp-angka ops-bp-angka">${(() => { const g = u.hitungGuna(x.a);
        return `<span class="ops-bp-peran"><small class="tot">${lbl("peran", `${fmt(x.a.length)} armada`)}</small>${[["wb", "air", "WB", g.wbSaja], ["patroli", "vis", "Patroli", g.ptrSaja], ["patroli_wb", "peran", "Patroli + WB", g.ganda], ["omc", "awan", "OMC", g.omc]].filter(z => z[3]).map(([w, ik, t, n]) => `<small data-warna="${w}" title="${t}">${lbl(ik, `${t} ${fmt(n)}`)}</small>`).join("")}</span>`; })()}</span><button type="button" class="ops-dlg-x" data-tutup aria-label="Tutup"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg></button></header>
      <div class="ops-pa-badan">
        <div class="ops-bp-strip"><span class="k">${lbl("siap", "Siap")}${x.lapor ? `<b>${fmt(x.siap)}/${fmt(x.a.length)}</b>` : `<span class="pill ops-pbv awas">Belum lapor</span>`}</span><span class="k">${lbl("vis", "Cuaca terbang")}<span class="ops-layak">${u.pilLayak(x.lay)}${labelLayak(x.lay)}</span></span></div>
        ${sek("Armada", [["peran", `${fmt(x.a.length)} armada`]], rinciArmada(D, x.a), "peran")}
        ${sek("Api dalam jangkauan", [["api", `${fmt(x.dk.length)} cluster`]], api, "api")}
        ${sek("Renlap", [["sortie", `${fmt(x.datang)}/${fmt(x.tg.length)} didatangi`]], renlap, "sortie", !!x.tg.length)}
        ${sek(D.pm === "hari" ? "Sortie hari ini" : "Sortie periode ini", [["air", `${fmt(x.k.sortie)} sortie`]], aksi, "air", !!x.aksi.length)}</div></article>`);
  }
  /* ---------- pita "Perlu tindakan" (usulan 2): hanya yang butuh keputusan; kosong = tidak tampil ---------- */
  function pitaTindakan(D) {
    if (D.pm !== "hari") return "";
    const u = U(), kini = hariWIB() === D.t, jamWibNow = (Date.now() / 36e5 + 7) % 24, bs = (D.peta.base || []).map(b => infoBase(D, b)), it = [], nb = x => x.b.nama.split(" / ")[0];
    /* butir: [ikon, kelas, angka, judul, nama-nama (pil), ket tambahan, aksi] */
    if (kini) { const telat = bs.filter(x => x.a.length && !x.lapor && jamWibNow + (ZONA_BASE[x.b.id] || 0) >= 7.5);
      if (telat.length) it.push(["jam", "telat", telat.length, "base belum lapor gelar armada", telat.map(nb), "batas 07.30 waktu setempat", `pb:${telat[0].b.id}`]); }
    const prio = (S.kluster?.features || []).map(f => f.properties).filter(p => p.level >= 3 && p.lat != null);
    const celah = prio.filter(c => !bs.some(x => (x.lapor ? x.siap : x.a.length) && km(x.b.lat, x.b.lon, c.lat, c.lon) <= u.radiusBase(x.b)));
    if (celah.length) it.push(["api", "celah", celah.length, "cluster prioritas di luar jangkauan armada", [...new Set(celah.map(c => c.kec || c.kab || "").filter(Boolean))], "", "peta"]);
    const tdk = bs.filter(x => x.p3 && x.lay && x.lay.kelas !== "layak" && x.lay.kelas !== "?");
    if (tdk.length) it.push(["ts", "cuaca", tdk.length, "base berapi prioritas, cuaca belum layak terbang", tdk.map(nb), "", `pb:${tdk[0].b.id}`]);
    const ts = (D.peta.armada || []).filter(a => a.status === "tidak_siap");
    if (ts.length) it.push(["silang", "rusak", ts.length, "armada tidak siap", ts.map(a => a.registrasi), "", "rk:siap"]);
    const belumR = bs.reduce((t, x) => t + (x.tg.length - x.datang), 0), totR = bs.reduce((t, x) => t + x.tg.length, 0);
    if (kini && totR && belumR && jamWibNow >= 12) it.push(["sortie", "renlap", belumR, `target renlap belum didatangi`, bs.filter(x => x.tg.length > x.datang).map(nb), `dari ${fmt(totR)} target, lewat 12.00 WIB`, "kartu:renlap"]);
    /* pengkinian data (pemilik 11 Nov 2026): catatan yang belum lengkap, satu butir; pil = jenis kekurangan */
    const ar = D.peta.armada || [], kur = [[D.aksi.filter(a => a.guna === "wb" && !a.hasil).length, "sortie WB tanpa laporan hasil"],
      [ar.filter(a => !a.tipe || /tidak diketahui/i.test(a.tipe)).length, "armada tanpa tipe"], [ar.filter(a => !a.base_id).length, "armada tanpa base"],
      [(D.peta.temuan || []).filter(x => !x.kab_kode).length, "temuan tanpa kabupaten"]].filter(x => x[0]);
    if (kur.length) it.push(["catat", "data", kur.reduce((t, x) => t + x[0], 0), "data belum lengkap", kur.map(([n, t]) => `${fmt(n)} ${t}`), "", "seksi:tindak"]);
    if (!it.length) return "";
    const pil = xs => { const u0 = [...new Set(xs)]; return u0.slice(0, 2).map(x => `<small>${esc(x)}</small>`).join("") + (u0.length > 2 ? `<small class="lagi">+${fmt(u0.length - 2)}</small>` : ""); };
    return `<section class="ops-tindak" aria-label="Perlu tindakan"><header>${lbl("ts", "")}<b>Perlu tindakan</b><small>${fmt(it.length)}</small></header>
      <ul>${it.map(([ik, c, n, t, nama, ket, aksi]) => `<li class="${c}"><button type="button" data-tindak="${esc(aksi)}" title="${esc([...new Set(nama)].join(", "))}"><span class="ops-tk-blok">${lbl(ik, "")}<b>${fmt(n)}</b></span><i>${lbl(ik, "")}</i>
        <div><p><b>${fmt(n)}</b><span>${t}</span></p>${ket ? `<em class="ket">${esc(ket)}</em>` : ""}<span class="ops-tindak-pil">${pil(nama)}</span>${(() => { const u0 = [...new Set(nama)]; return u0.length ? `<span class="ops-tindak-ring"><span>${esc(u0.slice(0, 2).join(", "))}</span>${u0.length > 2 ? `<b>+${fmt(u0.length - 2)}</b>` : ""}</span>` : ""; })()}</div><em class="ke">›</em></button></li>`).join("")}</ul></section>`;
  }
  /* ---------- pengkinian data dan action plan (pemilik 11 Nov 2026): dihitung dari data, tanpa simpanan baru.
     Butir hilang sendiri begitu datanya masuk; status "telat" bila tenggatnya lewat. ---------- */
  function kurangData(D) {
    const ar = D.peta.armada || [], tm = D.peta.temuan || [], bs = (D.peta.base || []);
    return [
      {k: "tipe", t: "Armada tanpa tipe pesawat", sumber: "Data induk armada", n: ar.filter(a => !a.tipe || /tidak diketahui/i.test(a.tipe)).map(a => ({teks: a.registrasi, reg: a.registrasi}))},
      {k: "base", t: "Armada tanpa base", sumber: "Data induk armada", n: ar.filter(a => !a.base_id).map(a => ({teks: a.registrasi, reg: a.registrasi}))},
      {k: "operator", t: "Armada tanpa operator", sumber: "Data induk armada", n: ar.filter(a => !a.operator).map(a => ({teks: a.registrasi, reg: a.registrasi}))},
      {k: "hasil", t: "Sortie water bombing tanpa laporan hasil", sumber: "Laporan WA satgas", n: D.aksi.filter(a => a.guna === "wb" && !a.hasil).map(a => ({teks: `${a.registrasi} ${U().jamWIB(a.jam_utc)}`, reg: a.registrasi}))},
      {k: "kab", t: "Temuan pilot tanpa kabupaten", sumber: "Laporan WA satgas", n: tm.filter(x => !x.kab_kode).map(x => ({teks: `${x.registrasi || "Temuan"}${x.tanggal ? `, ${tglPendek(x.tanggal)}` : ""}`, reg: x.registrasi}))},   // tanpa teks lokasi mentah: bisa memuat isi pesan WA
      {k: "koord", t: "Base tanpa koordinat", sumber: "Data induk base", n: bs.filter(b => b.lat == null).map(b => ({teks: b.nama.split(" / ")[0]}))}].filter(x => x.n.length);
  }
  function rencanaAksi(D) {
    if (D.pm !== "hari") return [];
    const u = U(), kini = hariWIB() === D.t, jam = (Date.now() / 36e5 + 7) % 24, bs = (D.peta.base || []).map(b => infoBase(D, b)), nb = x => x.b.nama.split(" / ")[0], it = [];
    /* [ikon, tindakan, untuk, rincian, tenggat, telat, buka] */
    if (kini) for (const x of bs.filter(x => x.a.length && !x.lapor)) { const z = jam + (ZONA_BASE[x.b.id] || 0); const lewat = z - 7.5, tl = lewat >= 1 ? `lewat ${fmt(Math.floor(lewat))} jam` : `lewat ${fmt(Math.round(lewat * 60))} menit`;
      it.push(["jam", "Minta laporan gelar armada", `Base ${nb(x)}`, `${fmt(x.a.length)} armada belum berstatus${z >= 7.5 ? `, ${tl}` : ""}`, "07.30 waktu setempat", z >= 7.5, `pb:${x.b.id}`]); }
    for (const a of (D.peta.armada || []).filter(a => a.status === "tidak_siap")) it.push(["silang", "Tanyakan kapan armada siap kembali", a.operator || "Operator belum tercatat", `${a.registrasi}${a.alasan ? `, ${a.alasan}` : ""}`, "Hari ini", false, `ar:${a.registrasi}`]);
    const prio = (S.kluster?.features || []).map(f => f.properties).filter(p => p.level >= 3 && p.lat != null);
    for (const c of prio) { const dk = bs.filter(x => x.b.lat != null).map(x => ({x, d: km(x.b.lat, x.b.lon, c.lat, c.lon)})).sort((p, q) => p.d - q.d)[0];
      if (dk && dk.d > u.radiusBase(dk.x.b)) it.push(["api", "Pertimbangkan geser armada atau patroli darat", "Posko pusat", `${c.kec || c.kab || "Cluster"}, ${fmt(Math.round(dk.d))} km dari ${nb(dk.x)}`, "Segera", false, "seksi:peta"]); }
    for (const x of bs.filter(x => x.tg.length > x.datang)) it.push(["sortie", "Jadwalkan sortie ke target renlap", `Base ${nb(x)}`, `${fmt(x.tg.length - x.datang)} dari ${fmt(x.tg.length)} target belum didatangi`, "12.00 WIB", kini && jam >= 12, `pb:${x.b.id}`]);
    for (const k of kurangData(D)) it.push(["catat", `Lengkapi ${k.t.toLowerCase()}`, k.sumber, `${fmt(k.n.length)} catatan`, "Hari ini", false, "seksi:tindak"]);
    return it.sort((p, q) => q[5] - p[5]);
  }
  /* jumlah kolom simetris (pemilik 11 Nov 2026): <=5 sebaris, 6 = 3x2, 8 = 4x2, lainnya separuh */
  /* lambang provinsi dari /lambang/provinsi/<kode BPS>.png (sama dengan /bnpb/dalops); gagal muat = disembunyikan */
  const lambangProv = k => k ? `<img class="ops-lambang" src="/lambang/provinsi/${esc(String(k).slice(0, 2))}.png" alt="" loading="lazy" onerror="this.hidden=true">` : "";
  const kolomSim = n => n <= 5 ? Math.max(n, 1) : n % 3 === 0 ? 3 : n % 4 === 0 ? 4 : Math.min(4, Math.ceil(n / 2));
  function kartuRencana(D) {
    const it = rencanaAksi(D), GRUP = [["jam", "Laporan gelar armada"], ["silang", "Armada tidak siap"], ["api", "Api di luar jangkauan"], ["sortie", "Renlap"], ["catat", "Kelengkapan data"]];
    /* susunan rapi (pemilik 11 Nov 2026 "ga mau white space dan acak-acakan"): matriks base x tindakan, lalu kartu ringkas sama tinggi */
    const KOL = [["jam", "Laporan gelar armada", "jam"], ["sortie", "Target renlap", "sortie"]];
    const perBase = it.filter(x => /^Base /.test(x[2]) && KOL.some(k => k[0] === x[0])), lain = it.filter(x => !perBase.includes(x));
    const namaB = [...new Set(perBase.map(x => x[2].replace(/^Base /, "")))];
    const sel = (k, nb) => { const x = perBase.find(y => y[0] === k && y[2] === `Base ${nb}`); if (!x) return `<td class="n"><span class="pill ops-pbv ok">Beres</span></td>`;
      const ang = (x[3].match(/^[\d.]+/) || [""])[0]; return `<td class="n"><button type="button" class="pill ops-pbv ${x[5] ? "bahaya" : "awas"}" data-ap="${esc(x[6])}" title="${esc(x[3])}">${esc(ang ? `${ang} ${k === "jam" ? "armada" : "target"}` : "Belum")}</button></td>`; };
    const tenggatK = k => perBase.find(y => y[0] === k)?.[4] || "";
    const matriks = namaB.length ? `<div class="ops-tw ex-tabel"><table class="ops-apm"><thead><tr><th>Base</th>${KOL.map(([k, t]) => `<th class="n">${t}${tenggatK(k) ? `<small>tenggat ${esc(tenggatK(k))}</small>` : ""}</th>`).join("")}</tr></thead>
      <tbody>${namaB.map(nb => `<tr><td class="ops-kiri"><b>${esc(nb)}</b></td>${KOL.map(([k]) => sel(k, nb)).join("")}</tr>`).join("")}</tbody></table></div>` : "";
    const IKG = {silang: "Armada tidak siap", api: "Api di luar jangkauan", catat: "Kelengkapan data", jam: "Laporan gelar armada", sortie: "Renlap"};
    const kartuL = ([ik, t, untuk, rinci, tenggat, telat, buka]) => `<button type="button" class="ops-apr k-${ik}${telat ? " telat" : ""}" data-ap="${esc(buka)}">
      <i>${lbl(ik, "")}</i><span class="t"><small>${esc(IKG[ik] || "")}</small><b>${esc(t)}</b><em>${esc(rinci)}</em></span>
      <span class="m">${lbl(/^Data|^Laporan/.test(untuk) ? "catat" : /^Posko|^Base/.test(untuk) ? "base" : "op", esc(untuk))}<span class="ops-ap-st${telat ? " telat" : ""}">${lbl(telat ? "ts" : "jam", telat ? "Lewat tenggat" : esc(tenggat))}</span></span></button>`;
    /* tindakan berjudul sama digabung: rincian jadi daftar nama, jumlah di depan */
    const lainG = [...lain.reduce((m, x) => { const k = x[0] + "|" + x[1]; const g = m.get(k); if (!g) m.set(k, [...x]); else { g._n = (g._n || 1) + 1; g[3] = [...new Set([g[3].split(",")[0], x[3].split(",")[0], ...(g._daf || [])])].join(", "); g[5] = g[5] || x[5]; } return m; }, new Map()).values()]
      .map(x => x._n ? (x[3] = `${fmt(x._n)} ${x[0] === "api" ? "cluster" : "butir"}: ${x[3]}`, x) : x);
    const isi = it.length ? `<div class="ops-apx">${matriks ? `<section><h4>${lbl("base", "Per base")}</h4>${matriks}</section>` : ""}${lainG.length ? `<section><h4>${lbl("catat", "Tindakan lain")}</h4><div class="ops-apr-grid" style="--k:${kolomSim(lainG.length)}">${lainG.map(kartuL).join("")}</div></section>` : ""}</div>`
      : `<p class="ops-kosong">${D.pm === "hari" ? "Tidak ada tindakan tertunda untuk tanggal ini." : "Rencana tindakan tersedia di mode Hari."}</p>`;
    return bagian("Rencana tindakan", "", isi);
  }
  function kartuPengkinian(D) {
    const ks = kurangData(D), IKK = {tipe: "peran", base: "base", operator: "op", hasil: "air", kab: "temuan", koord: "base"};
    /* kartu sebaris simetris (pemilik 11 Nov 2026 "jelek maksimal" untuk tabel); catatan kembar digabung dengan jumlahnya */
    const kartu = k => { const m = new Map(); for (const x of k.n) { const v = m.get(x.teks) || {x, n: 0}; v.n++; m.set(x.teks, v); } const ps = [...m.values()];
      return `<article class="ops-dk"><header><i>${lbl(IKK[k.k] || "catat", "")}</i><b>${fmt(k.n.length)}</b></header><h5>${esc(k.t)}</h5><small>${lbl("catat", `Dilengkapi lewat ${esc(k.sumber)}`)}</small>
        <p>${ps.slice(0, 6).map(v => `<${v.x.reg ? `button type="button" data-reg-pk="${esc(v.x.reg)}"` : "span"}>${esc(v.x.teks)}${v.n > 1 ? `<b>${fmt(v.n)}×</b>` : ""}</${v.x.reg ? "button" : "span"}>`).join("")}${ps.length > 6 ? `<span class="lagi">+${fmt(ps.length - 6)}</span>` : ""}</p></article>`; };
    return bagian("Data belum lengkap", "", ks.length ? `<div class="ops-dk-grid" style="--k:${kolomSim(ks.length)}">${ks.map(kartu).join("")}</div>` : `<p class="ops-kosong">Semua catatan yang diperiksa sudah lengkap.</p>`);
  }


  /* ---------- peta operasi (usulan 3, K8): base + jangkauan, cluster api, target renlap, aksi; MapLibre seperti Pantau Dalops ---------- */
  function kartuPeta(D) {
    return bagian("Peta operasi", "", `<div class="ops-peta-wadah"><div id="opsPeta" class="ops-peta" role="region" aria-label="Peta operasi udara"></div><aside class="ops-laci ops-laci-r" id="opsLaciR" hidden aria-label="Rincian titik di peta"><div class="ops-laci-isi"></div></aside><aside class="ops-laci" id="opsLaci" aria-label="Daftar base dan rincian di peta"><span class="ops-laci-tarik" tabindex="0" role="separator" aria-orientation="vertical" aria-label="Tarik lebar panel"></span><div class="ops-laci-isi"></div></aside>
      <div class="ops-peta-leg"><span class="k-b">Base</span>${[["k-j", "jangkau,jangkau-g", "Jangkauan", true], ["k-3", "kl", "Cluster api", true], ["k-t", "tg", "Target renlap", true], ["k-a", "ak", "Aksi armada", false]].map(([c, l, t, on]) => `<button type="button" class="${c}" data-lapis="${l}" aria-pressed="${on}" title="Nyalakan atau matikan lapisan">${t}</button>`).join("")}</div></div>`);
  }
  /* laci kanan peta (pemilik 11 Nov 2026 "ketika di klik keluar side bar di kanan", "ada list base, gaya panel Lapisan"):
     bawaan = daftar base per pulau, baris pil; base terpilih terbuka dengan rinciannya. Klik cluster, target, aksi di peta = rincian titik itu. */
  let laciSel = null;
  function bukaLaci(jenis, p) { laciSel = jenis ? {jenis, p} : null; renderLaci(); if (jenis === "base") { const b = (st._d?.peta.base || []).find(x => x.id === p.id); if (b && petaOps) petaOps.easeTo({center: [b.lon, b.lat], duration: 500}); } }
  function renderLaci() {
    const laci = $("#opsLaci"), D = st._d, u = U(); if (!laci || !D) return;
    const baris = xs => `<dl>${xs.filter(x => x[2] !== "" && x[2] != null).map(([ik, t, v]) => `<div><dt>${lbl(ik, t)}</dt><dd>${v}</dd></div>`).join("")}</dl>`;
    const unduhTombol = (atr, ket) => `<div class="ops-laci-wp"><span>${lbl("unduh", ket)}</span><p>${["kml", "gpx"].map(f => `<button type="button" class="ops-kml" ${atr} data-unduh${atr.includes("data-base") ? "" : "-titik"}="${f}">${lbl("unduh", f.toUpperCase())}</button>`).join("")}</p></div>`;
    const lokasi = (lat, lon, nama) => lat != null ? `<p class="ops-laci-kord">${lbl("base", `${(+lat).toFixed(5)}, ${(+lon).toFixed(5)}`)}</p>${unduhTombol(`data-nama="${esc(nama || "Titik")}" data-lat="${+lat}" data-lon="${+lon}"`, "Waypoint titik ini").replace("</p></div>", `<a class="ops-kml" href="${u.gmaps(lat, lon)}" target="_blank" rel="noopener noreferrer">${lbl("base", "Google Maps")}</a></p></div>`)}` : "";
    const terdekat = (lat, lon) => (D.peta.base || []).filter(b => b.lat != null).map(b => ({b, d: km(b.lat, b.lon, lat, lon)})).sort((x, y) => x.d - y.d)[0];
    const rinciBase = x => `<div class="ops-laci-rinci">${baris([["peran", "Armada", fmt(x.a.length)], ["siap", "Siap", x.lapor ? `${fmt(x.siap)}/${fmt(x.a.length)}` : "Belum lapor"], ["vis", "Kelayakan terbang", u.pilLayak(x.lay)],
        ["api", "Api dalam jangkauan", `${fmt(x.dk.length)} cluster${x.p3 ? `, ${fmt(x.p3)} prioritas` : ""}`], ["sortie", "Target renlap", x.tg.length ? `${fmt(x.datang)}/${fmt(x.tg.length)} didatangi` : "–"], ["air", "Sortie", fmt(x.k.sortie)]])}
        ${x.a.length ? `<div class="ops-laci-pil">${x.a.map(a => `<button type="button" data-reg-laci="${esc(a.registrasi)}">${esc(a.registrasi)}</button>`).join("")}</div>` : ""}
        ${x.tg.length ? unduhTombol(`data-base="${esc(x.b.id)}"`, `Waypoint renlap, ${fmt(x.tg.length)} target`) : ""}<button type="button" class="ops-laci-aksi" data-pb="${esc(x.b.id)}">${lbl("base", "Rincian base")}</button></div>`;
    const sel = laciSel, bs = (D.peta.base || []).map(b => infoBase(D, b));
    let badan;
    const R = $("#opsLaciR"); let rinciR = "";
    { const ps = sel && sel.jenis !== "base" ? sel : null;
      if (ps) { const p = ps.p; let ik, judul, sub, isi;
        if (ps.jenis === "kl") { const t = terdekat(+p.lat, +p.lon); ik = "api"; judul = p.nama; sub = p.kab && p.kab !== p.nama ? p.kab : "Cluster titik panas";
          isi = baris([["api", "Status", LVK[+p.lv] || "Patroli"], ["temuan", "Titik 24 jam", fmt(+p.px)], ["base", "Base terdekat", t ? `${esc(t.b.nama.split(" / ")[0])}, ${fmt(Math.round(t.d))} km` : "–"],
            ["peran", "Dalam jangkauan", t ? (t.d <= u.radiusBase(t.b) ? "Ya" : "Tidak") : "–"]]) + lokasi(p.lat, p.lon, `Cluster ${p.nama}`); }
        else if (ps.jenis === "tg") { ik = "sortie"; judul = `Target ${p.n}`; sub = p.nama;
          isi = baris([["base", "Renlap", esc(p.base)], ["ts", "Alasan", esc(p.alasan || "")], ["sortie", "Didatangi", D.aksi.some(a => a.lat != null && km(+p.lat, +p.lon, a.lat, a.lon) <= RENLAP_KM) ? "Sudah" : "Belum"]])
            + lokasi(p.lat, p.lon, `Target ${p.n} ${p.nama}`) + (p.bid ? unduhTombol(`data-base="${esc(p.bid)}"`, `Rute renlap ${p.base}, semua target`) : ""); }
        else { const h = p.guna === "wb" ? (u.HASIL[p.hasil] || u.HASIL.tak_dinilai) : null; ik = "air"; judul = p.reg; sub = p.misi;
          isi = baris([["jam", "Jam", `${esc(p.jam)} WIB`], ["base", "Lokasi", esc(p.lok) || "–"], ["ember", "Jatuhan", +p.drop ? fmt(+p.drop) : ""], ["padam", "Hasil", h ? `<span class="pill ${h[1]}">${h[0]}</span>` : ""]])
            + `<button type="button" class="ops-laci-aksi" data-reg-laci="${esc(p.reg)}">${lbl("peran", "Histori armada")}</button>` + lokasi(p.lat, p.lon, `${p.reg} ${p.misi}`); }
        rinciR = `<header><i>${lbl(ik, "")}</i><h4>${esc(judul)}</h4>${sub ? `<small>${esc(sub)}</small>` : ""}<button type="button" class="ops-laci-x" data-tutup-r aria-label="Tutup rincian"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg></button></header><div class="ops-laci-badan"><div class="ops-laci-rinci">${isi}</div></div>`; } }
    if (R) { R.querySelector(".ops-laci-isi").innerHTML = rinciR; R.hidden = !rinciR; }
    {
      const grup = {}; for (const x of bs) (grup[PULAU[String(x.b.prov || "")[0]] || "Lainnya"] ||= []).push(x);
      badan = URUT_PULAU.filter(g => grup[g]).map(g => `<p class="ops-laci-grup">${lbl("base", g)}<small>${fmt(grup[g].length)} base</small><small>${fmt(grup[g].reduce((t, x) => t + x.a.length, 0))} armada</small></p>` + grup[g].sort((x, y) => y.lv - x.lv || y.a.length - x.a.length).map(x => { const on = sel?.jenis === "base" && sel.p.id === x.b.id;
        return `<button type="button" class="ops-laci-b lv${x.lv}${on ? " on" : ""}" data-laci-base="${esc(x.b.id)}" aria-expanded="${on}"><i>${lbl("peran", "")}</i><span>${esc(x.b.nama.split(" / ")[0])}<small>${esc(u.PROV_PDK[x.b.prov] || x.b.prov || "")}</small></span><b>${lbl("peran", fmt(x.a.length))}</b></button>${on ? rinciBase(x) : ""}`; }).join("")).join("");
    }
    laci.querySelector(".ops-laci-isi").innerHTML = `<header><i>${lbl("base", "")}</i><h4>Base operasi</h4><small>${fmt(bs.length)} base</small>
      <button type="button" class="ops-laci-x" data-lipat-laci aria-expanded="${!laci.classList.contains("lipat")}" aria-label="Lipat panel"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 15 6-6 6 6"/></svg></button></header><div class="ops-laci-badan">${badan}</div>`;
  }
  function pasangLaciR() {
    const R = $("#opsLaciR"); if (!R || R.dataset.siap) return; R.dataset.siap = "1";
    R.addEventListener("click", e => { if (e.target.closest("[data-tutup-r]")) { laciSel = null; return renderLaci(); }
      const ut = e.target.closest("[data-unduh-titik]"); if (ut) { const d = ut.dataset; return tulisRute([{nama: d.nama, ket: "", lat: +d.lat, lon: +d.lon}], d.nama, `waypoint_${d.nama.replace(/[^\w]+/g, "_")}_${st._d.t}`, d.unduhTitik); }
      const r = e.target.closest("[data-reg-laci]"); if (r) return bukaArmada(r.dataset.regLaci); });
  }
  function pasangLaci() {
    const laci = $("#opsLaci"); if (!laci || laci.dataset.siap) return; laci.dataset.siap = "1";
    const set = w => { w = Math.max(260, Math.min(560, w)); laci.style.width = w + "px"; return w; };
    try { const w = +localStorage.getItem("ops_laci_lebar"); if (w) set(w); } catch (e) {}
    const tk = laci.querySelector(".ops-laci-tarik"); let x0 = 0, w0 = 0, w = 0;
    const gerak = e => { w = set(w0 + (e.clientX - x0)); }, lepas = () => { tk.classList.remove("aktif"); removeEventListener("pointermove", gerak); removeEventListener("pointerup", lepas); try { localStorage.setItem("ops_laci_lebar", String(w)); } catch (e) {} };
    tk.addEventListener("pointerdown", e => { e.preventDefault(); x0 = e.clientX; w0 = w = laci.offsetWidth; tk.classList.add("aktif"); addEventListener("pointermove", gerak); addEventListener("pointerup", lepas); });
    tk.addEventListener("keydown", e => { if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return; e.preventDefault(); w = set(laci.offsetWidth + (e.key === "ArrowRight" ? 24 : -24)); try { localStorage.setItem("ops_laci_lebar", String(w)); } catch (x) {} });
    laci.addEventListener("click", e => { if (e.target.closest("[data-lipat-laci]")) { laci.classList.toggle("lipat"); return renderLaci(); }
      const ut = e.target.closest("[data-unduh-titik]"); if (ut) { const d = ut.dataset; return tulisRute([{nama: d.nama, ket: "", lat: +d.lat, lon: +d.lon}], d.nama, `waypoint_${d.nama.replace(/[^\w]+/g, "_")}_${st._d.t}`, d.unduhTitik); }
      const r = e.target.closest("[data-reg-laci]"); if (r) return bukaArmada(r.dataset.regLaci);
      const lb = e.target.closest("[data-laci-base]"); if (lb) { const id = lb.dataset.laciBase; return bukaLaci(id && laciSel?.p.id !== id ? "base" : null, {id}); } });
  }
  let petaOps = null;
  function pasangPeta() {
    const el = $("#opsPeta"), D = st._d; if (!el || !D || !window.maplibregl || el.closest("[hidden]") || !el.closest("details")?.open) return;
    if (petaOps && petaOps.getContainer() === el) { petaOps.resize(); return; }
    petaOps?.remove(); pasangLaci(); pasangLaciR(); renderLaci(); const u = U(), bs = (D.peta.base || []).filter(b => b.lat != null);
    const ling = (b, r) => { const pts = []; for (let i = 0; i <= 64; i++) { const a = i / 64 * 2 * Math.PI; pts.push([b.lon + r / (111.32 * Math.cos(b.lat * Math.PI / 180)) * Math.cos(a), b.lat + r / 110.57 * Math.sin(a)]); } return pts; };
    const fc = f => ({type: "FeatureCollection", features: f});
    const kl = (S.kluster?.features || []).map(f => f.properties).filter(p => p.lat != null && (p.px24 || 0) > 0);
    const tgt = (D.peta.renlap || []).flatMap(r => (r.target || []).map(g => ({...g, base_id: r.base_id}))).filter(g => g.lat != null);
    const peta = petaOps = new maplibregl.Map({container: el, style: "https://tiles.openfreemap.org/styles/positron", bounds: bs.length ? [[Math.min(...bs.map(b => b.lon)) - 2.5, Math.min(...bs.map(b => b.lat)) - 2], [Math.max(...bs.map(b => b.lon)) + 2.5, Math.max(...bs.map(b => b.lat)) + 2]] : [[94.8, -11.2], [141.2, 6.2]],
      fitBoundsOptions: {padding: 20}, minZoom: 3, maxZoom: 13, dragRotate: false, pitchWithRotate: false, attributionControl: {compact: true}});
    peta.addControl(new maplibregl.NavigationControl({showCompass: false}), "top-right"); peta.touchZoomRotate.disableRotation();
    const pop = new maplibregl.Popup({closeButton: false, closeOnClick: false, offset: 10, className: "ops-peta-pop"});
    const hover = (id, isi) => { peta.on("mousemove", id, e => { peta.getCanvas().style.cursor = "pointer"; pop.setLngLat(e.lngLat).setHTML(isi(e.features[0].properties)).addTo(peta); }); peta.on("mouseleave", id, () => { peta.getCanvas().style.cursor = ""; pop.remove(); }); };
    peta.on("load", () => {
      peta.addSource("jangkau", {type: "geojson", data: fc(bs.map(b => ({type: "Feature", properties: {}, geometry: {type: "Polygon", coordinates: [ling(b, u.radiusBase(b))]}})))});
      peta.addLayer({id: "jangkau", type: "fill", source: "jangkau", paint: {"fill-color": "#2f6fd6", "fill-opacity": .06}});
      peta.addLayer({id: "jangkau-g", type: "line", source: "jangkau", paint: {"line-color": "#2f6fd6", "line-width": 1, "line-dasharray": [3, 2], "line-opacity": .5}});
      peta.addSource("kl", {type: "geojson", data: fc(kl.map(c => ({type: "Feature", properties: {lv: c.level || 0, px: c.px24 || 0, nama: c.kec || c.kab || "Cluster", kab: c.kab || "", lat: c.lat, lon: c.lon}, geometry: {type: "Point", coordinates: [c.lon, c.lat]}})))});
      peta.addLayer({id: "kl", type: "circle", source: "kl", paint: {"circle-color": ["match", ["get", "lv"], 3, "#c9503a", 2, "#e3b94e", "#4f8fc4"], "circle-radius": ["interpolate", ["linear"], ["get", "px"], 1, 4, 20, 9, 60, 14], "circle-opacity": .85, "circle-stroke-color": "#fff", "circle-stroke-width": 1}});
      peta.addSource("tg", {type: "geojson", data: fc(tgt.map(g => ({type: "Feature", properties: {n: g.urut ?? "", nama: g.lokasi || g.nama || "Target", base: namaBase(D, g.base_id), bid: g.base_id || "", lat: g.lat, lon: g.lon, alasan: alasanRenlap(g.alasan).join(", ")}, geometry: {type: "Point", coordinates: [g.lon, g.lat]}})))});
      peta.addLayer({id: "tg", type: "circle", source: "tg", paint: {"circle-color": "#e08a3a", "circle-radius": 5, "circle-stroke-color": "#fff", "circle-stroke-width": 1.5}});
      peta.addSource("ak", {type: "geojson", data: fc(D.aksi.filter(a => a.lat != null).map(a => ({type: "Feature", properties: {reg: a.registrasi, misi: MISI[a.guna] || a.jenis || "", jam: u.jamWIB(a.jam_utc), lok: a.lokasi || "", hasil: a.hasil || "", drop: a.drop || 0, guna: a.guna || "", lat: a.lat, lon: a.lon}, geometry: {type: "Point", coordinates: [a.lon, a.lat]}})))});
      peta.addLayer({id: "ak", type: "circle", source: "ak", paint: {"circle-color": "#0f9488", "circle-radius": 4.5, "circle-stroke-color": "#fff", "circle-stroke-width": 1.5}});
      const kord = p => `${(+p.lat).toFixed(4)}, ${(+p.lon).toFixed(4)}`;
      const tip = (k, j, rows) => `<div class="ops-ptip"><header>${lbl(k, esc(j))}</header><dl>${rows.filter(r => r[2]).map(([ik, t, v]) => `<div><dt>${lbl(ik, t)}</dt><dd>${v}</dd></div>`).join("")}</dl><p class="k">Klik untuk rincian dan waypoint</p></div>`;
      const pil = t => String(t || "").split(/,\s*/).filter(Boolean).map(x => `<small>${esc(x)}</small>`).join("");
      hover("kl", p => tip("api", p.nama, [["ts", "Status", esc(LVK[p.lv] || "Patroli")], ["temuan", "Titik 24 jam", fmt(p.px)], ["base", "Kabupaten", p.kab && p.kab !== p.nama ? esc(p.kab) : ""], ["base", "Koordinat", kord(p)]]));
      hover("tg", p => tip("sortie", `Target ${p.n}${p.nama && p.nama !== "Target" ? `: ${p.nama}` : ""}`, [["base", "Renlap", esc(p.base)], ["catat", "Alasan", p.alasan ? `<span class="pl">${pil(p.alasan)}</span>` : ""], ["base", "Koordinat", kord(p)]]));
      hover("ak", p => tip("air", `${p.reg} ${p.misi}`, [["jam", "Jam", `${esc(p.jam)} WIB`], ["base", "Lokasi", esc(p.lok)], ["base", "Koordinat", kord(p)]]));
      if (peta.getLayer("ak")) peta.setLayoutProperty("ak", "visibility", "none");   // sortie mati bawaan (riset dashboard: jangan semua lapisan sekaligus)
      for (const id of ["kl", "tg", "ak"]) peta.on("click", id, e => bukaLaci(id, e.features[0].properties, e.lngLat));
      for (const b of bs) { const x = infoBase(D, b), e = document.createElement("button"); e.type = "button"; e.className = `ops-peta-base lv${x.lv}`; e.addEventListener("click", ev => { ev.stopPropagation(); bukaLaci("base", {id: b.id}); }); e.title = `${b.nama}: ${x.a.length} armada`;
        e.innerHTML = `<i>${fmt(x.a.length)}</i><span>${esc(b.nama.split(" / ")[0])}</span>`;
        new maplibregl.Marker({element: e, anchor: "left"}).setLngLat([b.lon, b.lat]).addTo(peta); }
    });
  }

  /* metrik ringkasan: nilai periode ini dan pembanding. baik = +1 bila naik itu baik, -1 bila naik itu buruk, 0 netral */
  function metrikRingkas(D) {
    const u = U(), P = D.peta, base = P.base || [], ar = P.armada || [], g = u.hitungGuna(ar), lapor = ar.filter(a => a.status).length, siap = ar.filter(a => SIAP.includes(a.status)).length, H = D.hari;
    const V = D.vs, VP = V?.peta || {}, varr = VP.armada || [], vlapor = varr.filter(a => a.status).length, vsiap = varr.filter(a => SIAP.includes(a.status)).length, HB = V?.hari;
    const tm = P.temuan || [], temApi = tm.filter(x => x.status !== "clear").length, vtm = VP.temuan || [], vApi = vtm.filter(x => x.status !== "clear").length;
    const m = (k, t, now, prev, tampil, tampilLalu, sub, redup, baik = 0, persen = false, spark = null) => ({k, t, now, prev: V ? prev : null, tampil, tampilLalu, sub, redup, baik, persen, spark});
    const p7 = (D.perHari || []).slice(-7);
    return [
      m("base", "Base operasi udara", base.length, (VP.base || []).length, fmt(base.length), fmt((VP.base || []).length), [["netral", `${fmt(new Set(base.map(b => b.prov)).size)} provinsi`]], false, 0),
      m("armada", "Armada", ar.length, varr.length, fmt(ar.length), fmt(varr.length), [["wb", `WB ${fmt(g.wbSaja)}`, g.wbSaja], ["ptr", `Patroli ${fmt(g.ptrSaja)}`, g.ptrSaja], ["ganda", `Patroli + WB ${fmt(g.ganda)}`, g.ganda], ["omc", `OMC ${fmt(g.omc)}`, g.omc]].filter(x => x[2]), false, 0),
      m("siap", "Armada siap", lapor ? siap : null, vlapor ? vsiap : null, `${lapor ? fmt(siap) : "–"}<small>/${fmt(ar.length)}</small>`, `${vlapor ? fmt(vsiap) : "–"}<small>/${fmt(varr.length)}</small>`,
        lapor ? [["ok", `Siap ${fmt(siap)}`], ...(lapor - siap ? [["tdk", `Tidak siap ${fmt(lapor - siap)}`]] : []), ...(ar.length - lapor ? [["belum", `Belum lapor ${fmt(ar.length - lapor)}`]] : [])] : [["belum", "Gelar armada belum masuk"]], !lapor, 1),
      m("sortie", D.pm === "hari" ? "Sortie hari ini" : "Sortie periode ini", H.sortie, HB?.sortie ?? null, H.sortie ? fmt(H.sortie) : "–", HB?.sortie ? fmt(HB.sortie) : "–",
        H.sortie ? [...(H.wb ? [["wb", `WB ${fmt(H.wb)}`]] : []), ...(H.sortie - H.wb ? [["ptr", `Lainnya ${fmt(H.sortie - H.wb)}`]] : []), ...(H.drop ? [["jatuh", `${fmt(H.drop)} jatuhan`]] : [])] : [["belum", "Belum ada sortie"]], !H.sortie, 1, false, p7.map(x => [x.t, x.sortie, `${fmt(x.sortie)} sortie`])),
      m("padam", "Padam ≥ 24 jam", H.dinilai ? H.persen : null, HB?.dinilai ? HB.persen : null, H.dinilai ? u.persen(H.persen) : "–", HB?.dinilai ? u.persen(HB.persen) : "–",
        H.dinilai ? [["ok", `Padam ${fmt(H.padam)}`], ...(H.dinilai - H.padam ? [["api", `Masih api ${fmt(H.dinilai - H.padam)}`]] : []), ["netral", `${fmt(H.dinilai)} dinilai`]] : [["belum", "Belum ada aksi dinilai"]], !H.dinilai, 1, true,
        p7.map(x => [x.t, x.dinilai ? Math.round(x.persen * 100) : null, x.dinilai ? `padam ${u.persen(x.persen)}` : "belum dinilai"])),
      m("temuan", "Temuan api pilot", tm.length ? temApi : null, vtm.length ? vApi : null, tm.length ? fmt(temApi) : "–", vtm.length ? fmt(vApi) : "–",
        tm.length ? [["api", `Titik api ${fmt(temApi)}`], ["netral", `${fmt(tm.length)} temuan`]] : [["belum", "Belum ada laporan pilot"]], !tm.length, -1)];
  }
  /* grafik kecil 7 hari (usulan 5): batang mini, hari terakhir disorot, tooltip per hari */
  const sparkHtml = sp => { if (!sp?.length || sp.filter(x => x[1]).length < 2) return ""; const mx = Math.max(1, ...sp.map(x => x[1] || 0));
    return `<span class="ops-spark" title="7 hari terakhir">${sp.map(([t, v, ket], i) => `<span title="${esc(tglPendek(t))}: ${esc(ket)}" class="${i === sp.length - 1 ? "akhir" : ""}${v == null ? " kosong" : ""}" style="height:${v == null ? 12 : Math.max(12, Math.round(v / mx * 100))}%"></span>`).join("")}</span>`; };
  /* perubahan: persen untuk jumlah, poin untuk persentase; warna menurut arah baik */
  const deltaHtml = m => { if (m.now == null || m.prev == null || (!m.now && st._d?.t === hariWIB())) return "";   // hari berjalan masih nol: data belum masuk, bukan turun 100%
    const d = m.persen ? (m.now - m.prev) * 100 : m.prev ? (m.now - m.prev) / m.prev * 100 : null; if (d == null) return "";
    if (Math.abs(d) < 0.05) return "";
    const naik = d > 0, kelas = !m.baik ? "netral" : (naik === (m.baik > 0)) ? "baik" : "buruk";
    return `<em class="ops-vs-d ${kelas}">${naik ? "▲" : "▼"} ${Math.abs(d).toLocaleString("id-ID", {maximumFractionDigits: 1})}${m.persen ? " poin" : "%"}</em>`; };
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
    const pilHtml = sub => sub ? `<em${Array.isArray(sub) && sub.length > 1 ? ' class="tegak"' : ""}>${Array.isArray(sub) ? sub.map(([c, x]) => { const ik = {wb: "air", ptr: "vis", ganda: "peran", omc: "awan", belum: "jam", ok: "siap", tdk: "silang", api: "api", jatuh: "ember", netral: "base"}[c] || "jam";
        /* pil ringkas sebaris (pemilik 11 Nov 2026): ikon + angka, nama lengkap di tooltip; pil tanpa angka tampil utuh */
        const m = /^(.*\D)\s([\d.,%]+)$/.exec(x) || /^([\d.,%]+)\s(.+)$/.exec(x), n = m ? (/^[\d.,%]+$/.test(m[2]) ? m[2] : m[1]) : null;
        return n ? `<small class="${c}" title="${esc(x)}">${lbl(ik, n)}</small>` : `<small class="${c}">${lbl(ik, x)}</small>`; }).join("") : sub}</em>` : "";
    /* sel ringkasan dengan pembanding (pemilik 11 Nov 2026, pola pangantara): kiri periode ini + perubahan, kanan periode pembanding */
    /* sel Angka utama (pemilik 11 Nov 2026 "bagusin"): nilai besar sendiri; bila belum ada data, teks status menggantikan strip "–";
       pembanding jadi pil kecil supaya tidak bersaing dengan angka hari ini */
    const ubin = m => { const st0 = m.redup && Array.isArray(m.sub) ? (m.sub.find(x => x[0] === "belum") || m.sub[0])?.[1] : null;
      return `<div class="${m.redup ? "redup" : ""}" data-rk="${m.k}" tabindex="0" role="button" aria-label="Rincian ${esc(m.t)}"><header><i><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${IKR[m.k]}</svg></i><span>${m.t}</span></header>
      <div class="ops-cmp${D.vs ? "" : " tunggal"}"><div><small class="pl">${esc(D.label || tglPendek(D.t))}</small>${m.redup ? `<p class="nol">${lbl("jam", esc(st0 || "Belum ada data"))}</p>` : `<p><b>${m.tampil}</b>${D.vs ? deltaHtml(m) : ""}</p>`}</div>
      ${D.vs ? `<div class="lalu"><small class="pl">${esc(D.vs.label)}</small><p><b>${m.tampilLalu}</b></p></div>` : ""}</div>
      ${m.k === "siap" && !m.redup ? (() => { const n0 = (D.peta.armada || []).length; return n0 ? `<span class="ops-bullet" title="${fmt(m.now)} dari ${fmt(n0)} armada siap"><i style="width:${Math.round(m.now / n0 * 100)}%"></i></span>` : ""; })() : ""}
      ${m.redup ? "" : `<div class="ops-ub-kaki">${pilHtml(m.sub)}</div>`}</div>`; };
    const tiles = metrikRingkas(D).map(ubin);
    /* kartu pertama = ringkasan itu sendiri; kepala kartu gelap dihapus (pemilik 11 Nov 2026 "Ringkasan 11 Nov itu yang jadi header") */
    const ringkas = pitaTindakan(D) + `<section class="ops-pa-sek ops-rk" open><summary><i>${lbl("tren", "")}</i><b>Angka utama</b><small>${lbl("kalender", esc(D.label || tglPendek(D.t)))}</small>${D.vs ? `<small class="vs">${lbl("tren", `dibanding ${esc(D.vs.label)}`)}</small>` : ""}<svg class="ops-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg></summary>
      <div class="ops-lap-angka" style="--n:${tiles.length}">${tiles.join("")}</div></section>`;
    return [
      ringkas, `<section class="ops-wadah">${[
      kartuRencana(D), kartuPengkinian(D), kartuPapan(D), kartuPeta(D), kartuBase(D), kartuRenlap(D), kartuAksi(D), kartuTemuan(D),
      kartuTren(D), kartuNilai(D), kartuHistori(D), kartuGaleri(D), kartuJejak(D),
      kartuOperator(D), kartuKontrak(D), kartuOmcResmi(D), kartuOmc(D)].join("")}</section>`].join("");
  }

  function kartuBase(D) {
    const u = U(), adaKl = !!S.kluster?.features?.length;
    const baris = (D.peta.base || []).map(b => { const a = (D.peta.armada || []).filter(x => x.base_id === b.id), gg = u.hitungGuna(a), k = D.hitung(D.baseAksi(b.id)), lay = u.kelayakan(b);
      const dk = adaKl ? u.apiDekat(b) : null, p3 = dk ? dk.filter(c => c.level >= 3).length : null, lv = dk ? (p3 ? 3 : dk.some(c => c.level === 2) ? 2 : dk.length ? 1 : 0) : null;
      const lapor = a.some(x => x.status);
      const tanda = [p3 && "prioritas", lay.kelas !== "layak" && "layak", renlapBase(D, b.id) && "renlap", !lapor && a.length && "lapor"].filter(Boolean).join(" ");
      return {p3: p3 || 0, lv, id: b.id, tanda, pulau: PULAU[String(b.prov || "")[0]] || "Lainnya", nAr: a.length, rinci: rinciArmada(D, a), sel: [kiri(`<span class="ops-bb-nama"><svg class="ops-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg><b>${esc(b.nama.split(" / ")[0])}</b></span>`), `<td>${b.icao ? `<span class="ops-kode-l">${esc(b.icao)}</span>` : "–"}</td>`, `<td>${esc(u.PROV_PDK[b.prov] || b.prov || "–")}</td>`,
        sel(nol(gg.wb)), sel(nol(gg.patroli)), sel(nol(gg.omc)), sel(`${lapor ? fmt(a.filter(x => SIAP.includes(x.status)).length) : "–"}/${fmt(a.length)}`), sel(k.sortie ? `<span class="ops-keg"><b>${fmt(k.sortie)}</b><small>${[k.wb && `${fmt(k.wb)} WB`, k.dinilai && `padam ${u.persen(k.persen)}`].filter(Boolean).join(", ") || "patroli"}</small></span>` : "–"),
        sel(p3 == null ? "–" : `<b>${nol(p3)}</b>`), `<td>${lv == null ? "–" : lv ? `<span class="pill l${lv}">${u.LV[lv]}</span>` : `<span class="pill l0">Aman</span>`}</td>`, `<td><span class="ops-layak">${u.pilLayak(lay)}${labelLayak(lay)}</span></td>`, (() => { const r = renlapBase(D, b.id), n = r?.target?.length || 0;
          return `<td>${n ? `<span class="ops-rl" title="${fmt(n)} target renlap"><b>${fmt(n)}</b>${["kml", "gpx"].map(f => `<button type="button" class="ops-kml" data-unduh="${f}" data-base="${esc(b.id)}" title="Unduh waypoint renlap ${esc(r.versi || "")} (${f.toUpperCase()}) untuk GPS">${lbl("unduh", f.toUpperCase())}</button>`).join("")}</span>` : `<span class="ops-redup-t">Belum ada</span>`}</td>`; })()]}; }).sort((x, y) => y.p3 - x.p3);
    const kepala = ["Base", "Kode|Kode ICAO bandara base", "Prov", "#WB|Armada berkemampuan water bombing (armada Patroli + WB ikut dihitung di sini dan di PTR)", "#PTR|Armada berkemampuan patroli (armada Patroli + WB ikut dihitung di sini dan di WB)", "#OMC", "#Siap|Armada siap dari laporan gelar armada WA; – = belum lapor", "#Kegiatan|Sortie hari itu; di bawahnya aksi water bombing dan persen padam (tidak ada titik panas satelit dalam 1 km selama 24 jam sesudah WB)",
      `#Cluster prioritas|Cluster prioritas aktif dalam jangkauan jelajah armada (bawaan ${fmt(u.RADIUS_KM)} km), kondisi kini`,
      `Status api|Level cluster tertinggi dalam jangkauan jelajah armada: ${u.LV.slice(1).join(", ")}; Aman = tidak ada cluster aktif`, "Kelayakan terbang|METAR terdekat ≤ 60 km, kondisi kini; basi bila lebih dari 3 jam", "Renlap|Rencana lapangan terbaru base ini; KML = waypoint target berurutan dari base, untuk GPS"];
    /* kolom kegiatan (sortie, aksi WB, padam, cluster) yang kosong di semua base dilipat */
    const lipat = new Set([7, 8].filter(i => baris.every(x => />–(<\/b>)?<\/td>$/.test(x.sel[i]))));
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
    void blok;
    /* kartu per base, renlap terbaru saja, dikelompokkan per pulau seperti papan base (pemilik 11 Nov 2026 "jelek banget" untuk daftar baris) */
    const perBase = new Map(); for (const r of rl) { const xs = perBase.get(r.base_id) || []; xs.push(r); perBase.set(r.base_id, xs); }
    const kartuB = ([id, rs]) => { const r = rs[rs.length - 1], b = (D.peta.base || []).find(x => x.id === id) || {id, nama: id}, tg = r.target.slice().sort((x, y) => (x.urut ?? 0) - (y.urut ?? 0));
      const aksiB = D.aksi.filter(x => x.lat != null && (x.base_id || D.reg2base[x.registrasi]) === id), dt = g => aksiB.some(x => km(g.lat, g.lon, x.lat, x.lon) <= RENLAP_KM), n = tg.filter(dt).length;
      return `<article class="ops-pb ops-rlk" data-pb="${esc(id)}" tabindex="0" role="button" aria-label="Renlap ${esc(b.nama)}">
        <header><div><p class="ops-pb-nm"><b>${esc(String(b.nama).split(" / ")[0])}</b><em class="ops-pb-icao">${esc(b.icao || id)}</em></p></div></header>
        <div class="ops-rlk-prog"><p><b>${fmt(n)}</b><span>dari ${fmt(tg.length)} target didatangi</span></p><i class="ops-pb-bar renlap" style="--p:${tg.length ? Math.round(n / tg.length * 100) : 0}%"></i></div>
        <ol class="ops-rlk-tg" style="--nt:${Math.min(tg.length, 8)}">${tg.slice(0, 4).map((g, i) => `<li class="${dt(g) ? "datang" : ""}"><span>${fmt(g.urut ?? i + 1)}</span><b>${esc(alasanRenlap(g.alasan)[0] || g.lokasi || g.nama || "Target")}</b></li>`).join("")}${tg.length > 4 ? `<li class="lagi"><span>+${fmt(tg.length - 4)}</span><b>target lain di rincian base</b></li>` : ""}</ol>
        <footer>${rs.map(x => `<small class="ops-pb-prov${x === r ? " kini" : ""}" title="Renlap ${esc(x.versi || "")}">${lbl("jam", esc(kalimat(x.versi || "Renlap")))}</small>`).join("")}<span class="ops-rlk-ud"></span>${["kml", "gpx"].map(f => `<button type="button" class="ops-kml" data-unduh="${f}" data-base="${esc(id)}" title="Unduh waypoint renlap (${f.toUpperCase()})">${lbl("unduh", f.toUpperCase())}</button>`).join("")}</footer></article>`; };
    const grup = {}; for (const e of perBase) { const b = (D.peta.base || []).find(x => x.id === e[0]); (grup[PULAU[String(b?.prov || "")[0]] || "Lainnya"] ||= []).push(e); }
    return bagian("Renlap", "", total ? `<div class="ops-pb-pulau">${URUT_PULAU.filter(g => grup[g]).map(g => `<section><h4>${lbl("base", esc(g))}<span class="kn"><small>${lbl("base", `${fmt(grup[g].length)} base`)}</small><small>${lbl("sortie", `${fmt(grup[g].reduce((t, e) => t + (e[1][e[1].length - 1].target || []).length, 0))} target`)}</small></span></h4>
      <div class="ops-pb-grid" style="--n:${Math.min(grup[g].length, 6)};--nb:${grup[g].length <= 3 ? grup[g].length : Math.ceil(grup[g].length / 2)}">${grup[g].map(kartuB).join("")}</div></section>`).join("")}</div>`
      : `<p class="ops-kosong">Renlap disusun otomatis pukul 20.00 dan 07.00 WIB oleh mesin Pusdalops, lalu muncul di sini.</p>`);
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
  function batang(nilai, label, warna, ik, fmtV = fmt) {
    const ph = st._d.perHari, n = nilai.length, m = Math.max(1, ...nilai.map(v => v || 0)), tot = nilai.reduce((t, v) => t + (v || 0), 0), ip = nilai.indexOf(m), ada = nilai.some(v => v);
    const atas = Math.max(1, Math.ceil(m / (m > 50 ? 10 : 1)) * (m > 50 ? 10 : 1)), garis = [atas, Math.round(atas / 2), 0];
    return `<div class="ops-tren2" style="--w:${warna}"><header><i>${lbl(ik, "")}</i><b>${label}</b><span class="tot"><strong>${fmtV(tot)}</strong><small>30 hari</small></span></header>
      ${ada ? `<div class="ops-tren2-plot"><div class="ops-tren2-y">${garis.map(g => `<span>${fmtV(g)}</span>`).join("")}</div>
      <div class="ops-tren2-bar" role="img" aria-label="${esc(label)} 30 hari">${(() => { const ma = nilai.map((_, i) => { const w = nilai.slice(Math.max(0, i - 6), i + 1).filter(v => v != null); return w.length >= 3 ? w.reduce((a, b) => a + b, 0) / w.length : null; });
        const pt = ma.map((v, i) => v == null ? null : `${((i + .5) / n * 100).toFixed(2)},${(100 - v / atas * 100).toFixed(2)}`); const seg = pt.join(" ").split(/\s*null\s*/).filter(x => x.trim());
        return `<svg class="ops-tren2-ma" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">${seg.map(z => `<polyline points="${z.trim()}"/>`).join("")}</svg>`; })()}${nilai.map((v, i) => `<span data-tgl="${ph[i].t}" class="${ph[i].t === st._d.t ? "on" : ""}${v == null ? " nihil" : ""}" style="--h:${v ? Math.max(3, Math.round(v / atas * 100)) : 0}%"
        data-otip="${esc(`<b>${esc(tglPanjang(ph[i].t))}</b><span>${esc(label)}: ${v == null ? "belum ada data" : fmtV(v)}</span><em>Klik untuk melihat tanggal ini</em>`)}"></span>`).join("")}</div></div>
      <div class="ops-tren2-kaki"><span>${esc(tglPendek(ph[0].t))}</span><span>${esc(tglPendek(ph[n - 1].t))}</span></div>
      <p class="ops-tren2-ket">${lbl("ts", `Puncak ${fmtV(m)} pada ${esc(tglPendek(ph[ip].t))}`)}<span class="ma">rata-rata 7 hari</span></p>`
      : `<p class="ops-kosong">Belum ada data ${esc(label.toLowerCase())} dalam 30 hari terakhir.</p>`}</div>`;
  }
  function kartuTren(D) {
    const ph = D.perHari, h30 = D.h30, idx = h30 ? Object.fromEntries(h30.hari.map((t, i) => [t, i])) : {};
    const titik = ph.map(p => idx[p.t] == null ? null : Object.values(h30.prov).reduce((s, arr) => s + (arr[idx[p.t]] || 0), 0));
    const aktif = ph.filter(p => p.sortie).length, tot = ph.reduce((s, p) => s + p.sortie, 0);
    return bagian("Tren 30 hari", aktif ? `${hl(fmt(tot))} sortie dalam ${hl(fmt(aktif))} hari beroperasi, ${esc(tglPendek(D.dari))} sampai ${esc(tglPendek(D.t))}` : "Belum ada sortie tercatat dalam 30 hari terakhir",
      `<div class="ops-tren-grid">${batang(ph.map(p => p.sortie), "Sortie", "#1d4e89", "peran")}${batang(ph.map(p => p.wb), "Aksi water bombing", "#4f8fc4", "air")}
        ${batang(ph.map(p => p.padam), "Aksi padam ≥ 24 jam", "#3f8a5d", "padam")}${batang(titik, "Titik panas nasional", "#c9503a", "api")}</div>`);
  }

  /* fitur 2: histori satu armada 30 hari */
  function kartuHistori(D) {
    const u = U(), ar = (D.peta.armada || []).slice().sort((x, y) => x.registrasi.localeCompare(y.registrasi)), aktif = new Set(D.aksi30.map(a => a.registrasi));
    /* pilihan pengguna dipertahankan antar-tanggal; tanpa pilihan = armada pertama yang beraksi dalam 30 hari */
    const reg = st.reg && ar.some(a => a.registrasi === st.reg) ? st.reg : (ar.find(a => aktif.has(a.registrasi)) || ar[0])?.registrasi || "";
    /* saring base dulu, lalu armada di base itu (pemilik 11 Nov 2026 "agar ada filter base juga") */
    const kb = kelompokBase(ar, D.peta.base), gAktif = kb.find(g => g.regs.includes(reg));
    const pilihB = `<select data-hbase aria-label="Pilih base">${kb.map(g => `<option value="${esc(g.regs[0] || "")}"${g === gAktif ? " selected" : ""}>${esc(g.nama)} (${fmt(g.regs.length)})</option>`).join("")}</select>`;
    const a = ar.find(x => x.registrasi === reg), pilih = pilihB + `<select data-reg aria-label="Pilih armada">${kb.filter(g => g === gAktif).map(g => `<optgroup label="${esc(g.nama)}">${g.regs.map(r => `<option value="${esc(r)}"${r === reg ? " selected" : ""}>${esc(r)}${aktif.has(r) ? " ●" : ""}</option>`).join("")}</optgroup>`).join("")}</select>`;
    if (!a) return `<div id="opsHistori" data-kat-bungkus="tren">${bagian("Histori armada", "Belum ada armada tercatat", "")}</div>`;
    /* isi kartu = tampilan pop-up armada (pemilik 11 Nov 2026: tabel dan kotak angka lama "jelek banget"), tanpa tombol tutup */
    const isi = popupArmada(D, a).replace(/<button type="button" class="ops-dlg-x"[\s\S]*?<\/button>/, "");
    return `<div id="opsHistori" data-kat-bungkus="tren">${bagian("Histori armada", "", isi, `<span class="ops-pilih2">${pilih}</span>`)}</div>`;
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
  /* wadah lipat bersama pop-up: kepala ikon + judul + pil berikon, isi bisa dilipat */
  const sek = (judul, sub, isi, ik = "jam") => `<details class="ops-pa-sek"><summary><i>${lbl(ik, "")}</i><b>${judul}</b>${(sub || []).map(([k, t]) => `<small>${lbl(k, t)}</small>`).join("")}<svg class="ops-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg></summary><div>${isi}</div></details>`;
  /* satu <dialog> untuk semua pop-up layar ini; Esc, tombol tutup, dan klik latar menutup */
  function bukaDialog(html) {
    let d = document.getElementById("opsDlgAr");
    if (!d) { d = document.createElement("dialog"); d.id = "opsDlgAr"; d.className = "ops-dlg"; ($("#opsLaporan") || document.body).append(d);   // di dalam #opsLaporan supaya gaya layar ikut
      d.addEventListener("click", e => { if (e.target === d || e.target.closest("[data-tutup]")) return d.close();
        const tg = e.target.closest(".ops-rp-tren [data-tgl]"); if (tg) { d.close(); pilihTanggal(tg.dataset.tgl); } });
      /* tooltip grafik pop-up: isi dari data-otip (HTML yang sudah di-escape saat dibuat), mengikuti kursor */
      const tip = document.createElement("div"); tip.className = "ops-tip"; tip.hidden = true; d.append(tip);
      d.addEventListener("pointermove", e => { const el = e.target.closest?.("[data-otip]"); if (!el) { tip.hidden = true; return; }
        if (tip.dataset.dari !== el.dataset.otip) { tip.innerHTML = el.dataset.otip; tip.dataset.dari = el.dataset.otip; }
        tip.hidden = false; const w = tip.offsetWidth, h = tip.offsetHeight; tip.style.left = Math.min(innerWidth - w - 8, e.clientX + 14) + "px"; tip.style.top = Math.max(8, e.clientY - h - 12) + "px"; });
      d.addEventListener("pointerleave", () => { tip.hidden = true; }); }
    d.querySelector(".ops-dlg-isi")?.remove(); d.insertAdjacentHTML("afterbegin", `<div class="ops-dlg-isi">${html}</div>`);
    if (!d.open) d.showModal();
  }
  function bukaArmada(reg) {
    const D = st._d, a = (D?.peta.armada || []).find(x => x.registrasi === reg); if (!a) return;
    bukaDialog(popupArmada(D, a));
  }

  /* pop-up rincian ubin ringkasan (pemilik 11 Nov 2026: "bisa diklik gini, keluar pop up", tiru pangantara) */
  /* baris bilah: nomor urut, nama, bilah relatif terhadap yang terbesar, nilai, persen dari total */
  const bilah = (t, n, maks, kelas = "", total = 0, no = 0, ket = "") => `<li class="${kelas}">${no ? `<em>${fmt(no)}</em>` : ""}<span>${t}</span><i style="--p:${maks ? Math.round(n / maks * 100) : 0}%"></i><b>${fmt(n)}${ket ? `<small>${ket}</small>` : total ? `<small>${U().persen(n / total)}</small>` : ""}</b></li>`;
  function bukaRingkas(k) {
    const D = st._d; if (!D) return;
    const u = U(), P = D.peta, base = P.base || [], ar = P.armada || [], g = u.hitungGuna(ar), lapor = ar.filter(a => a.status).length, siap = ar.filter(a => SIAP.includes(a.status)).length, H = D.hari;
    const SATUAN = {base: "base", peran: "armada", siap: "siap", sortie: "sortie", temuan: "titik api", padam: "padam"};
    const kepala = (ik, judul, sub, angka) => `<header class="ops-rp-hd"><i>${lbl(ik, "")}</i><div><h3>${judul}</h3>${sub ? `<small>${lbl(/\d{4}|hari ini/.test(sub) ? "kalender" : "tren", sub)}</small>` : ""}</div><span class="ops-rp-angka"><b>${angka}</b><small>${SATUAN[ik] || ""}</small></span>
      <button type="button" class="ops-dlg-x" data-tutup aria-label="Tutup"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg></button></header>`;
    const perBase = base.map(b => ({b, a: ar.filter(x => x.base_id === b.id)}));
    let isi = "";
    if (k === "base") isi = kepala("base", "Base operasi udara", esc(tglPanjang(D.t)), fmt(base.length)) + `<div class="ops-pa-badan">${sek("Daftar base", [["peran", `${fmt(ar.length)} armada`]],
      `<div class="ops-rp-bgrid">${perBase.slice().sort((x, y) => y.a.length - x.a.length).map(({b, a}) => { const lay = u.kelayakan(b), sp = a.filter(x => SIAP.includes(x.status)).length, lp = a.some(x => x.status), gg = u.hitungGuna(a);
        return `<article><header><div><b>${esc(b.nama.split(" / ")[0])}</b><span class="ops-rp-hpil"><small>${lbl("base", esc(u.PROV_PDK[b.prov] || b.prov || ""))}</small><small class="kode">${esc(b.icao || b.id)}</small></span></div></header>
          <div class="ops-rp-bisi"><b>${fmt(a.length)}</b><span>armada</span><em>${[["wb", "air", gg.wbSaja, "WB"], ["ptr", "vis", gg.ptrSaja, "Patroli"], ["ganda", "peran", gg.ganda, "Patroli + WB"], ["omc", "awan", gg.omc, "OMC"]].filter(x => x[2]).map(([c, ik, n, t]) => `<small class="${c}">${lbl(ik, `${t} ${fmt(n)}`)}</small>`).join("")}</em></div>
          <div class="ops-rp-siapb"><span>${lbl("siap", "Siap")}<b>${lp ? `${u.persen(a.length ? sp / a.length : 0)}` : "–"}</b></span><i class="ops-rp-siap" style="--p:${a.length && lp ? Math.round(sp / a.length * 100) : 0}%"></i></div>
          <footer><span class="${lp ? "ok" : "belum"}">${lbl(lp ? "siap" : "jam", lp ? `${fmt(sp)} dari ${fmt(a.length)} siap` : "Belum lapor")}</span>${u.pilLayak(lay)}</footer></article>`; }).join("")}</div>`, "base")}</div>`;
    else if (k === "armada") { const op = Object.entries(ar.reduce((m, a) => (m[a.operator || "Operator belum tercatat"] = (m[a.operator || "Operator belum tercatat"] || 0) + 1, m), {})).sort((x, y) => y[1] - x[1]);
      const mOp = op[0]?.[1] || 1, mB = Math.max(1, ...perBase.map(x => x.a.length));
      const ubinPeran = [["wb", "air", "Water bombing", g.wbSaja], ["ptr", "vis", "Patroli", g.ptrSaja], ...(g.ganda ? [["ganda", "peran", "Patroli + WB", g.ganda]] : []), ["omc", "awan", "OMC", g.omc]].map(([c, ik, t, n]) =>
        `<div class="${c}"><i>${lbl(ik, "")}</i><span>${t}</span><b>${fmt(n)}</b><small>${u.persen(ar.length ? n / ar.length : 0)} armada</small><em style="--p:${ar.length ? Math.round(n / ar.length * 100) : 0}%"></em></div>`).join("");
      isi = kepala("peran", "Armada", "komposisi armada udara", fmt(ar.length)) + `<div class="ops-pa-badan">
        ${sek("Per peran", [], `<div class="ops-rp-peran">${ubinPeran}</div>`, "peran")}
        ${sek("Per base", [["base", `${fmt(base.length)} base`]], `<ul class="ops-rp-bilah">${perBase.slice().sort((x, y) => y.a.length - x.a.length).map((x, i) => bilah(esc(x.b.nama.split(" / ")[0]), x.a.length, mB, "", ar.length, i + 1)).join("")}</ul>`, "base")}
        ${sek("Per operator", [["op", `${fmt(op.length)} operator`]], `<ul class="ops-rp-bilah">${op.map(([o, n], i) => bilah(esc(o), n, mOp, o === "Operator belum tercatat" ? "redup" : "", ar.length, i + 1)).join("")}</ul>`, "op", false)}</div>`; }
    else if (k === "siap") { const ST = [["siap", "Siap"], ["operasi", "Beroperasi"], ["siaga", "Siaga"], ["tidak_siap", "Tidak siap"], [null, "Belum lapor"]];
      const leg = `<div class="ops-rp-leg2">${ST.map(([v, t]) => `<span><i class="${u.stAr(v)[1]}"></i>${t}</span>`).join("")}</div>`;
      const isiSt = lapor ? `${leg}<ul class="ops-rp-st">${perBase.map(({b, a}) => { const n = v => a.filter(x => (x.status || null) === v).length;
          return `<li><b>${esc(b.nama.split(" / ")[0])}</b><span class="ops-rp-tumpuk">${ST.map(([v, t]) => n(v) ? `<i class="${u.stAr(v)[1]}" style="flex:${n(v)}" title="${t}: ${fmt(n(v))}">${fmt(n(v))}</i>` : "").join("")}</span><small>${fmt(a.filter(x => SIAP.includes(x.status)).length)} dari ${fmt(a.length)} siap</small></li>`; }).join("")}</ul>`
        : `<div class="ops-rp-kosong">${lbl("jam", "")}<div><b>Belum ada laporan gelar armada untuk ${esc(tglPanjang(D.t))}</b><p>Status siap tiap pesawat masuk dari laporan WA satgas base. Batas laporan sementara 07.30 waktu setempat (Q1).</p></div></div>
          <div class="ops-rp-bgrid kecil">${perBase.map(({b, a}) => `<article><header><div><b>${esc(b.nama.split(" / ")[0])}</b><small>${esc(b.icao || b.id)}</small></div></header><footer><span class="belum">${lbl("jam", "Belum lapor")}</span><span>${lbl("peran", `${fmt(a.length)} armada`)}</span></footer></article>`).join("")}</div>`;
      isi = kepala("siap", "Armada siap", lapor ? `${fmt(lapor)} dari ${fmt(ar.length)} armada melapor` : "gelar armada WA belum masuk", lapor ? `${fmt(siap)}/${fmt(ar.length)}` : `–/${fmt(ar.length)}`) + `<div class="ops-pa-badan">
        ${sek("Status per base", [["jam", esc(tglPendek(D.t))]], isiSt, "siap")}</div>`; }
    else if (k === "sortie") { const maks = Math.max(1, ...D.perHari.map(x => x.sortie)), atas = Math.max(2, Math.ceil(maks / 2) * 2), tot30 = D.perHari.reduce((t, x) => t + x.sortie, 0);
      const perB = perBase.map(({b}) => { const ak = D.aksi30.filter(a => (a.base_id || D.reg2base[a.registrasi]) === b.id); return {b, n: ak.length, hari: ak.filter(a => a.tanggal === D.t).length}; }).sort((x, y) => y.n - x.n), mB = Math.max(1, ...perB.map(x => x.n));
      const grafik = `<div class="ops-rp-graf"><div class="ops-rp-sumbu"><span>${fmt(atas)}</span><span>${fmt(atas / 2)}</span><span>0</span></div>
        <div class="ops-rp-tren">${D.perHari.map((x, i) => `<span data-tgl="${x.t}" data-otip="${esc(`<b>${tglPanjang(x.t)}</b><span>${fmt(x.sortie)} sortie</span><span class="wb">WB ${fmt(x.wb)}</span><span class="ptr">Lainnya ${fmt(x.sortie - x.wb)}</span><em>Klik untuk melihat tanggal ini</em>`)}" tabindex="0"${x.t === D.t ? ' class="kini"' : ""}><i class="wb" style="height:${x.wb / atas * 100}%"></i><i style="height:${(x.sortie - x.wb) / atas * 100}%"></i>${(i % 7 === 0 && i < 26) || i === 29 ? `<u${i === 29 ? ' class="akhir"' : ""}>${esc(tglPendek(x.t))}</u>` : ""}</span>`).join("")}</div></div>
        <div class="ops-rp-tren-kaki"><span class="ops-rp-leg"><small class="wb">${lbl("air", "Water bombing")}</small><small>${lbl("vis", "Patroli dan lainnya")}</small></span><span>rata-rata ${fmt(Math.round(tot30 / 30 * 10) / 10)} sortie per hari</span></div>`;
      isi = kepala("sortie", "Sortie", `hari ini ${esc(tglPendek(D.t))}, ${fmt(tot30)} dalam 30 hari`, fmt(H.sortie)) + `<div class="ops-pa-badan">
        ${sek("Tren 30 hari", [["peran", `${fmt(tot30)} sortie`]], grafik, "sortie")}
        ${sek("Per base, 30 hari", [["base", `${fmt(base.length)} base`]], `<ul class="ops-rp-bilah">${perB.map((x, i) => bilah(esc(x.b.nama.split(" / ")[0]), x.n, mB, "", 0, i + 1, `hari ini ${fmt(x.hari)}`)).join("")}</ul>`, "base")}</div>`; }
    else if (k === "temuan") { const tm = (P.temuan || []).slice().sort((x, y) => (y.jam_utc || 0) - (x.jam_utc || 0)), NT = {fs: ["Titik api", "l3"], berasap: ["Berasap", "l2"], berasap_tipis: ["Berasap tipis", "l1"], clear: ["Bersih", "l0"]};
      isi = kepala("temuan", "Temuan api pilot", esc(tglPanjang(D.t)), fmt(tm.filter(x => x.status !== "clear").length)) + `<div class="ops-pa-badan">${sek("Daftar temuan", [["temuan", `${fmt(tm.length)} temuan`]],
        tm.length ? `<ul class="ops-rp-base">${tm.map(t => `<li><div><b>${esc(t.lokasi || "Lokasi tidak tercatat")}</b><small>${esc(t.registrasi || "")}${t.jam_utc ? `, ${u.jamWIB(t.jam_utc)} WIB` : ""}</small></div><span class="pill ${(NT[t.status] || ["", "ops-abu"])[1]}">${(NT[t.status] || [t.status])[0]}</span>${t.lat != null ? `<a href="${u.gmaps(t.lat, t.lon)}" target="_blank" rel="noopener noreferrer">${lbl("base", "Peta")}</a>` : ""}</li>`).join("")}</ul>` : `<div class="ops-rp-kosong">${lbl("temuan", "")}<div><b>Belum ada temuan pilot untuk ${esc(tglPanjang(D.t))}</b><p>Temuan masuk dari laporan WA satgas udara: titik api, berasap, berasap tipis, atau bersih, lengkap dengan koordinat. Begitu pilot melapor, daftarnya muncul di sini.</p></div></div>`, "temuan")}</div>`; }
    else if (k === "padam") isi = kepala("padam", "Padam ≥ 24 jam", `${fmt(H.padam)} dari ${fmt(H.dinilai)} aksi dinilai`, u.persen(H.persen)) + `<div class="ops-pa-badan">${sek("Aksi water bombing hari ini", [], `<ul class="ops-rp-base">${D.aksi.filter(a => a.guna === "wb").map(a => { const h = u.HASIL[a.hasil] || u.HASIL.tak_dinilai;
      return `<li><div><b>${esc(a.lokasi || "Lokasi tidak tercatat")}</b><small>${esc(a.registrasi)}, ${u.jamWIB(a.jam_utc)} WIB</small></div><span class="pill ${h[1]}">${h[0]}</span></li>`; }).join("")}</ul>`, "air")}</div>`;
    /* pita pembanding di kepala pop-up (pola pangantara): periode ini lawan pembanding, perubahan di bawah */
    const mt = metrikRingkas(D).find(x => x.k === ({armada: "armada", base: "base", siap: "siap", sortie: "sortie", temuan: "temuan", padam: "padam"})[k]);
    if (isi && mt && D.vs) isi = isi.replace('<div class="ops-pa-badan">', `<div class="ops-pa-badan"><div class="ops-rp-vs"><div><small>${esc(D.label)}</small><b>${mt.tampil}</b></div><div class="lalu"><small>${esc(D.vs.label)}</small><b>${mt.tampilLalu}</b></div><p>${deltaHtml(mt) || `<em class="ops-vs-d sama">belum bisa dibandingkan</em>`}</p></div>`);
    if (isi) bukaDialog(`<article class="ex ex-std ops-pa ops-rp">${isi}</article>`);
  }

  /* isi pop-up armada (pemilik 11 Nov 2026 "masih jelek"): kepala foto besar + identitas, deret angka tanpa kotak,
     linimasa kegiatan per tanggal (hasil hanya untuk water bombing), kontrak sebagai kartu kecil, teks tanpa kapital semua */
  /* ikon bahan semai: kepingan es untuk dry ice, kristal garam untuk NaCl (pemilik 11 Nov 2026) */
  const ikBahan = k => /dry|ice|es$|co2/i.test(String(k)) ? "es" : "garam";
  const kalimat = t => String(t || "").toLowerCase().replace(/(^|[\s-])([a-z])/g, (m, a, b) => a + b.toUpperCase()).replace(/ - /g, " – ");
  function popupArmada(D, a) {
    const u = U(), ak = D.aksi30.filter(x => x.registrasi === a.registrasi).sort((x, y) => (y.jam_utc || 0) - (x.jam_utc || 0)), hh = D.hitung(ak);
    const k = D.mon?.kpi?.armada?.[a.registrasi], kt = u.kontrak(a.registrasi), s = u.stAr(a.status), jam = kt.reduce((t, x) => t + (x.jam_operasi_menit || 0), 0);
    const tipe = /tidak diketahui/i.test(a.tipe || "") ? "Tipe belum tercatat" : a.tipe || "Tipe belum tercatat", f = u.fotoAr(a);
    const angka = (n, t, ik) => `<div${n === "–" ? ' class="redup"' : ""}><i>${lbl(ik, "")}</i><b>${n}</b><span>${t}</span></div>`;
    const hari = [...new Set(ak.map(x => x.tanggal))], NH = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
    /* strip 30 hari: satu kotak per hari, gelap = banyak sortie */
    const per = ak.reduce((m, x) => (m[x.tanggal] = (m[x.tanggal] || 0) + 1, m), {}), maks = Math.max(1, ...Object.values(per));
    /* kegiatan 30 hari: batang per hari bertumpuk per misi, angka di atas, tanggal di bawah, akhir pekan diarsir (pemilik 11 Nov 2026 "jelek banget") */
    const G = ["wb", "patroli", "omc"], perG = ak.reduce((m, x) => { const g = G.includes(x.guna) ? x.guna : "patroli"; (m[x.tanggal] ||= {})[g] = (m[x.tanggal][g] || 0) + 1; return m; }, {});
    const jmlG = g => ak.filter(x => (G.includes(x.guna) ? x.guna : "patroli") === g).length;
    const strip = `<div class="ops-ks"><div class="ops-ks-bar" role="img" aria-label="Sortie per hari, 30 hari">${Array.from({length: 30}, (_, i) => { const t = geser(D.dari, i), n = per[t] || 0, d = new Date(Date.parse(t)), hr = d.getUTCDate(), wk = [0, 6].includes(d.getUTCDay());
        return `<div class="ops-ks-h${n ? " isi" : ""}${wk ? " libur" : ""}${i === 29 ? " kini" : ""}" title="${esc(tglPendek(t))}: ${n ? `${fmt(n)} sortie` : "tanpa sortie"}"><em>${n ? fmt(n) : ""}</em><span style="--h:${n ? Math.max(18, Math.round(n / maks * 100)) : 0}%">${G.filter(g => perG[t]?.[g]).map(g => `<i data-g="${g}" style="flex:${perG[t][g]}"></i>`).join("")}</span><small>${hr === 1 || i === 0 ? esc(tglPendek(t)) : fmt(hr)}</small></div>`; }).join("")}</div>
      <div class="ops-ks-kaki">${G.map(g => `<span data-g="${g}"><i></i>${esc(MISI[g])} <b>${fmt(jmlG(g))}</b></span>`).join("")}<span class="hr">${lbl("kalender", `${fmt(hari.length)} dari 30 hari terbang`)}</span></div></div>`;
    const linimasa = hari.length ? hari.map(t => `<li><time><b>${esc(tglPendek(t))}</b><small>${NH[new Date(Date.parse(t)).getUTCDay()]}</small></time><ol>${ak.filter(x => x.tanggal === t).map(x => { const h = x.guna === "wb" ? (u.HASIL[x.hasil] || u.HASIL.tak_dinilai) : null;
        return `<li><span class="ops-lm-jam">${lbl("jam", `${u.jamWIB(x.jam_utc)} WIB`)}</span><span class="ops-lm-misi" data-g="${esc(x.guna || "")}">${esc(MISI[x.guna] || x.jenis || "Misi")}</span>
          <span class="ops-lm-lok${x.lokasi ? "" : " nihil"}">${lbl("base", esc((x.lokasi || "Lokasi tidak tercatat").replace(/\(BMKG\/Sipongi\)/g, "").trim()))}</span><span class="ops-lm-ujung">${x.drop ? lbl("ember", `${fmt(x.drop)} jatuhan`) : ""}${h ? `<span class="pill ${h[1]}">${h[0]}</span>` : ""}</span></li>`; }).join("")}</ol></li>`).join("")
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
        <span class="ops-ktl-st${x.berjalan ? " jalan" : ""}">${x.berjalan ? lbl("jam", "Berjalan") : lbl("siap", "Selesai")}</span></li>`; };
    return `<article class="ex ex-std ops-pa"><button type="button" class="ops-dlg-x" data-tutup aria-label="Tutup"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg></button>
      <header class="ops-pa-hd"><figure>${f ? u.imgAr(a, "", `${a.registrasi} ${tipe}`) : `<span class="ops-ar-kosong">${lbl("peran", "")}</span>`}</figure>
        <div><div class="ops-pa-id"><h3>${esc(a.registrasi)}</h3><p>${esc(tipe)}</p><span class="ops-ar-st ${s[1]}"><i></i>${s[0]} ${esc(tglPendek(D.t))}</span></div>
        <ul>${[[a.peran, lbl("peran", esc(PERAN[a.peran] || a.peran || ""))], ["", lbl("base", `Base ${esc(namaBase(D, a.base_id))}`)], ["", a.operator && a.operator !== (PEMILIK[a.pemilik] || a.pemilik) && lbl("op", esc(a.operator))], [a.pemilik, a.pemilik && lbl("milik", PEMILIK[a.pemilik] || esc(a.pemilik))], ["", a.bucket_liter && lbl("ember", `Bucket ${fmt(a.bucket_liter)} L`)]].filter(x => x[1]).map(([w, x]) => `<li${w ? ` data-warna="${esc(w)}"` : ""}>${x}</li>`).join("")}</ul>
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
    const ut = x => x.siap ? x.siapTerbang / x.siap : Infinity;   // urut bawaan: utilisasi terendah dulu, masalah tampil duluan (riset dashboard)
    const daf = Object.entries(grup).sort((a, b) => ut(a[1]) - ut(b[1]) || b[1].sortie - a[1].sortie || a[0].localeCompare(b[0]));
    const nganggur = daf.filter(([, x]) => x.siap && !x.terbang).length;
    /* lokasi armada per operator, terbanyak dulu (pemilik 9 Nov 2026) */
    const teksBase = b => `<span class="ops-op-base">${Object.entries(b).sort((p, q) => q[1] - p[1] || p[0].localeCompare(q[0])).map(([n, j]) => `<em>${esc(n)}<b>${fmt(j)}</b></em>`).join("")}</span>`;
    const jml = k => daf.reduce((t, [, x]) => t + x[k], 0), semuaBase = new Set(daf.flatMap(([, x]) => Object.keys(x.base).filter(n => n !== "Base belum tercatat")));
    /* utilisasi dengan bilah kecil; base pindah ke bawah nama operator supaya tabel muat tanpa geser (pemilik 11 Nov 2026) */
    const util = (n, d) => d ? `<span class="ops-util"><b>${u.persen(n / d)}</b><i style="--p:${Math.min(100, Math.round(n / d * 100))}%"></i></span>` : "–";
    const total = `<tr class="ops-total">${kiri(`<b>Total</b><small>${fmt(semuaBase.size)} base</small>`)}${sel(fmt(jml("n")))}${sel(nol(jml("siap")))}${sel(nol(jml("terbang")))}${sel(util(jml("siapTerbang"), jml("siap")))}${sel(nol(jml("sortie")))}${sel(nol(jml("wb")))}${sel(jml("dinilai") ? u.persen(jml("padam") / jml("dinilai")) : "–")}${sel(jml("jam") ? fmt(Math.round(jml("jam") / 60)) : "–")}</tr>`;
    /* grup per bandara, bisa dilipat; angka per operator di bandara itu (pemilik 11 Nov 2026 "collapsible per bandara") */
    const pb = {};
    for (const a of D.peta.armada || []) { const o = a.operator || "Operator belum tercatat", bid = a.base_id || "", key = bid + "|" + o, x = pb[key] ||= {bid, o, n: 0, siap: 0, terbang: 0, siapTerbang: 0, sortie: 0, wb: 0, padam: 0, dinilai: 0, jam: 0};
      const k = kp[a.registrasi]; x.n++; if (k) { x.siap += k.hari_siap || 0; x.terbang += k.hari_terbang || 0; x.siapTerbang += siapTerbang(k); x.sortie += k.sortie || 0; x.wb += k.aksi_wb || 0; x.padam += k.padam || 0; x.dinilai += k.dinilai || 0; }
      x.jam += u.kontrak(a.registrasi).reduce((t, c) => t + (c.jam_operasi_menit || 0), 0); }
    const perBase = {}; for (const x of Object.values(pb)) (perBase[x.bid] ||= []).push(x);
    const pulauB = bid => { const b = (D.peta.base || []).find(z => z.id === bid); return PULAU[String(b?.prov || "")[0]] || "Lainnya"; };
    const urutB = Object.keys(perBase).sort((p, q) => (p ? 0 : 1) - (q ? 0 : 1) || URUT_PULAU.indexOf(pulauB(p)) - URUT_PULAU.indexOf(pulauB(q)) || perBase[q].reduce((t, x) => t + x.n, 0) - perBase[p].reduce((t, x) => t + x.n, 0));
    const KOL = 9, chev = `<svg class="ops-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>`;
    const baris = urutB.flatMap(bid => { const xs = perBase[bid].sort((p, q) => ut(p) - ut(q) || q.sortie - p.sortie || p.o.localeCompare(q.o)), pl = pulauB(bid), nm = bid ? namaBase(D, bid) : "Base belum tercatat";
      return [`<tr class="ops-grup" tabindex="0" aria-expanded="true" data-pulau="${esc(pl)}"><td colspan="${KOL}"><span>${chev}<b>${esc(nm)}</b><span class="ops-grup-chip"><em>${lbl("base", esc(pl))}</em><em>${lbl("op", `${fmt(xs.length)} operator`)}</em><em>${lbl("peran", `${fmt(xs.reduce((t, x) => t + x.n, 0))} armada`)}</em></span></span></td></tr>`,
        ...xs.map(x => `<tr class="ops-klik${x.siap && !x.terbang ? " ops-nganggur" : ""}" data-op="${esc(x.o)}" data-pulau="${esc(pl)}" tabindex="0" title="Klik untuk armada ${esc(x.o)}">${kiri(`<b>${esc(x.o)}</b>`)}${sel(fmt(x.n))}${sel(nol(x.siap))}${sel(nol(x.terbang))}${sel(util(x.siapTerbang, x.siap))}${sel(nol(x.sortie))}${sel(nol(x.wb))}${sel(x.dinilai ? u.persen(x.padam / x.dinilai) : "–")}${sel(x.jam ? fmt(Math.round(x.jam / 60)) : "–")}</tr>`)]; });
    const pls = URUT_PULAU.filter(g => urutB.some(b => pulauB(b) === g));
    const saring = `<div class="ops-saring">${pls.length > 1 ? `<div class="seg" role="group" aria-label="Saring pulau">${["", ...pls].map(g => `<button type="button" data-fop="p:${esc(g)}" aria-pressed="${!g}">${g ? esc(g) : "Semua"}</button>`).join("")}</div>` : ""}
      <div class="ops-tanda" role="group" aria-label="Saring kondisi"><button type="button" data-fop="n:" aria-pressed="false"${nganggur ? "" : " disabled"}>${lbl("jam", `Siap belum terbang <b>${fmt(Object.values(pb).filter(x => x.siap && !x.terbang).length)}</b>`)}</button></div></div>`;
    void teksBase;
    return bagian("Operator", "", tabelH(["Operator|Nama operator di bandara itu", "#Armada", "#Hari siap", "#Hari terbang", "#Utilisasi|Hari siap yang benar-benar terbang dibagi hari siap, maksimal 100%", "#Sortie", "#Aksi WB", "#Padam", "#Jam 2026"], daf.length ? [total, ...baris] : [], "Belum ada armada tercatat."), saring);
  }

  /* urut tabel dengan klik kepala kolom (pemilik 11 Nov 2026); baris Total tetap di atas. Nilai: data-sort, lalu angka gaya Indonesia, lalu teks */
  function urutTabel(th) {
    const tb = th.closest("table").tBodies[0], i = [...th.parentElement.children].indexOf(th), turun = th.getAttribute("aria-sort") !== "descending";
    th.parentElement.querySelectorAll("th").forEach(x => x.removeAttribute("aria-sort")); th.setAttribute("aria-sort", turun ? "descending" : "ascending");
    const nilai = tr => { const td = tr.children[i]; if (!td) return null; const ds = td.dataset.sort ?? td.querySelector("[data-sort]")?.dataset.sort; if (ds != null) return +ds;
      const t = (td.querySelector("b")?.textContent || td.textContent).trim(); if (!t || t === "–") return null;
      const n = t.replace(/\./g, "").replace(",", ".").match(/^-?\d+(\.\d+)?/); return n ? +n[0] : t.toLowerCase(); };
    const tetap = [...tb.rows].filter(r => r.classList.contains("ops-total")), lain = [...tb.rows].filter(r => !r.classList.contains("ops-total"));
    lain.sort((a, b) => { const x = nilai(a), y = nilai(b); if (x == null) return y == null ? 0 : 1; if (y == null) return -1;
      const c = typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y), "id"); return turun ? -c : c; });
    tb.append(...tetap, ...lain);
  }
  function bukaOperator(o) {
    const D = st._d, ar = (D?.peta.armada || []).filter(a => (a.operator || "Operator belum tercatat") === o); if (!ar.length) return;
    const g = U().hitungGuna(ar);
    bukaDialog(`<article class="ex ex-std ops-pa ops-rp"><header class="ops-rp-hd"><i>${lbl("op", "")}</i><div><h3>${esc(o)}</h3><small>${lbl("base", `${fmt(new Set(ar.map(a => a.base_id)).size)} base`)}</small></div>
      <span class="ops-rp-angka ops-bp-angka"><span class="ops-bp-peran"><small class="tot">${lbl("peran", `${fmt(ar.length)} armada`)}</small>${[["wb", "air", "WB", g.wbSaja], ["patroli", "vis", "Patroli", g.ptrSaja], ["patroli_wb", "peran", "Patroli + WB", g.ganda], ["omc", "awan", "OMC", g.omc]].filter(z => z[3]).map(([w, ik, t, n]) => `<small data-warna="${w}">${lbl(ik, `${t} ${fmt(n)}`)}</small>`).join("")}</span></span>
      <button type="button" class="ops-dlg-x" data-tutup aria-label="Tutup"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg></button></header>
      <div class="ops-pa-badan">${rinciArmada(D, ar)}</div></article>`);
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

  /* lokasi temuan dibersihkan dari sisa teks WA (jam ATA, Eng.Off, kode z/LT); yang tersisa nama tempat (pemilik 11 Nov 2026 "jelek banget") */
  const lokasiBersih = t => { const xs = String(t || "").split(/\s*,\s*/).map(x => x.trim()).filter(x => x && !/[:]|\d{2}[.:]\d{2}|\bz\b|\bLT\b|eng\.?\s*off|^ata\b/i.test(x));
    return xs.map(x => x.replace(/^(muba)$/i, "Musi Banyuasin")).join(", ") || "Lokasi belum tercatat"; };
  function kartuTemuan(D) {
    const u = U(), NAMA = {fs: "FS berasap", berasap: "Berasap", berasap_tipis: "Berasap tipis", clear: "Clear"}, tm = D.peta.temuan || [];
    const adaLuas = tm.some(x => x.luas_ha != null);
    const baris = tm.slice().sort((x, y) => (x.status === "clear") - (y.status === "clear") || (y.jam_utc || 0) - (x.jam_utc || 0)).map(x => `<tr>${sel(`<b>${u.jamWIB(x.jam_utc)}</b>`)}${sel(`<span class="ops-omc-reg">${lbl("peran", esc(x.registrasi || "–"))}</span>`)}
      ${sel(`<span class="pill ${{clear: "l0", berasap_tipis: "l2"}[x.status] || "l3"}">${esc(NAMA[x.status] || x.status)}</span>`)}${kiri(`<span class="ops-tm-lok">${esc(lokasiBersih(x.lokasi))}</span>`)}
      ${sel(x.lat != null ? `<a class="ops-tm-peta" href="${u.gmaps(x.lat, x.lon)}" target="_blank" rel="noopener noreferrer" title="${(+x.lat).toFixed(4)}, ${(+x.lon).toFixed(4)}">${lbl("base", "Peta")}</a>` : "–")}${adaLuas ? sel(x.luas_ha != null ? fmt(x.luas_ha) + " ha" : "–") : ""}</tr>`);
    return bagian("Temuan pilot", "", tabelH(["#Jam WIB", "#Armada", "#Status", "Lokasi", "#Peta", ...(adaLuas ? ["#Luas"] : [])], baris, "Pilot patroli belum melaporkan temuan."));
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
    const u = U(), s = D.omc, kg = s.reduce((t, x) => t + (x.kg || 0), 0), hasil = D.omcHasil?.ringkas || {};
    const NAMA = {dry_ice: "Dry ice", nacl: "NaCl", cacl2: "CaCl2"}, jam = x => x ? new Date(Date.parse(x) + 7 * 36e5).toISOString().slice(11, 16) : "–";
    const durasi = x => x.mulai && x.selesai ? u.jamMenit((Date.parse(x.selesai) - Date.parse(x.mulai)) / 6e4) : "";
    /* sasaran "16|Musi Banyuasin": kode provinsi + kabupaten; tampil sebagai pil kabupaten berlabel provinsi */
    const PV = {11: "Aceh", 12: "Sumut", 13: "Sumbar", 14: "Riau", 15: "Jambi", 16: "Sumsel", 17: "Bengkulu", 18: "Lampung", 19: "Babel", 21: "Kepri", 31: "DKI Jakarta", 32: "Jabar", 33: "Jateng", 34: "DIY", 35: "Jatim", 36: "Banten",
      51: "Bali", 52: "NTB", 53: "NTT", 61: "Kalbar", 62: "Kalteng", 63: "Kalsel", 64: "Kaltim", 65: "Kaltara", 71: "Sulut", 72: "Sulteng", 73: "Sulsel", 74: "Sultra", 75: "Gorontalo", 76: "Sulbar", 81: "Maluku", 82: "Malut", 91: "Papua Barat", 94: "Papua"};
    const kab = k => { const t = String(k?.nama || k || ""), [pv, nm] = t.includes("|") ? t.split("|") : ["", t]; return {pv: u.PROV_PDK[pv] || PV[pv] || pv, nm}; };
    const reg = new Set((D.peta.armada || []).map(a => a.registrasi));
    const perBahan = Object.entries(s.reduce((m, x) => { const k = x.bahan || "lain"; (m[k] ||= {n: 0, kg: 0}); m[k].n++; m[k].kg += x.kg || 0; return m; }, {}));
    const ringkas = perBahan.length ? `<div class="ops-omc-ringkas">${perBahan.map(([k, v]) => `<div data-bahan="${esc(k)}"${hasil[k]?.kalimat ? ` data-otip="${esc(`<b>${esc(NAMA[k] || k)}</b><span>${esc(hasil[k].kalimat)}</span>`)}"` : ""}><i>${lbl(ikBahan(k), "")}</i><span><b>${esc(NAMA[k] || k)}</b><small>${lbl("peran", `${fmt(v.n)} sortie`)}</small><small>${lbl("ember", `${fmt(Math.round(v.kg))} kg`)}</small></span></div>`).join("")}</div>` : "";
    const baris = s.slice().sort((a, b) => (b.mulai || "").localeCompare(a.mulai || "")).slice(0, 40).map(x => { const ks = (x.sasaran_kab || []).map(kab), pv = [...new Set(ks.map(k => k.pv).filter(Boolean))];
      return `<tr${reg.has(x.pesawat) ? ` class="ops-klik" data-reg-omc="${esc(x.pesawat)}" title="Klik untuk histori ${esc(x.pesawat)}"` : ""}><td data-sort="${Date.parse(x.mulai || 0) || 0}"><b>${x.mulai ? esc(tglPendek(x.mulai.slice(0, 10))) : "–"}</b></td>
        <td class="n" data-sort="${Date.parse(x.mulai || 0) % 864e5 || 0}"><span class="ops-jamr"><b>${jam(x.mulai)}</b><i>–</i><b>${jam(x.selesai)}</b></span></td><td class="n" data-sort="${x.mulai && x.selesai ? Date.parse(x.selesai) - Date.parse(x.mulai) : 0}">${durasi(x) ? `<span class="ops-omc-dur">${lbl("jam", durasi(x))}</span>` : "–"}</td>
        <td class="n"><span class="ops-omc-reg">${lbl("peran", esc(x.pesawat || "–"))}</span></td>${(() => { const bid = x.base_id || st._d.reg2base?.[x.pesawat] || (st._d.peta.armada || []).find(a => a.registrasi === x.pesawat)?.base_id; return `<td class="ops-kiri">${bid ? `<span class="ops-omc-sas"><small>${lbl("base", esc(namaBase(st._d, bid)))}</small></span>` : "–"}</td>`; })()}<td class="n"><span class="ops-omc-bahan" data-bahan="${esc(x.bahan || "")}">${x.bahan ? lbl(ikBahan(x.bahan), esc(NAMA[x.bahan] || x.bahan)) : "–"}</span></td>
        ${sel(x.kg != null ? `<span class="ops-kg"><b>${fmt(x.kg)}</b> kg</span>` : "–")}<td class="ops-kiri"><span class="ops-omc-sas">${pv.length ? pv.map(p => `<small class="pv">${lbl("base", esc(p))}</small>`).join("") : "–"}</span></td><td class="ops-kiri"><span class="ops-omc-sas">${ks.map(k => `<small>${esc(k.nm)}</small>`).join("") || "–"}</span></td></tr>`; });
    return bagian("Modifikasi cuaca", "", `${ringkas}${tabelH(["Tanggal", "#Jam WIB", "#Durasi|Lama terbang mulai sampai selesai", "#Pesawat", "Base|Base asal pesawat", "#Bahan semai", "#Berat", "Provinsi|Provinsi sasaran penyemaian", "Kab/kota sasaran"], baris, "Belum ada sortie OMC tercatat dalam 30 hari.")}`);
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
    return `<div id="opsGaleri" data-kat-bungkus="tren">${bagian("Dokumentasi", semua.length ? `${hl(fmt(semua.length))} foto dokumentasi dari ${fmt(regs.length)} armada dalam 30 hari` : "Belum ada foto dokumentasi dalam 30 hari",
      foto.length ? kelompokFoto(foto, D.peta.base).map(h => { const pra = h.base.flatMap(b => b.foto).slice(0, 24);   // strip mengisi lebar baris (pemilik 11 Nov 2026), sisanya tersembunyi
        return `<details class="ops-gl-hari"><summary><span class="ops-gl-tgl"><b>${esc(tglPendek(h.tanggal))}</b><span class="ops-gl-pil"><small class="n">${lbl("kalender", `${fmt(h.n)} foto`)}</small>${h.base.map(b => `<small>${lbl("base", esc(b.nama))}</small>`).join("")}</span></span>
          <span class="ops-gl-pra">${pra.map(f => `<img src="${esc(f.url)}" alt="" loading="lazy">`).join("")}</span><svg class="ops-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg></summary><div class="ops-gl-isi">${h.base.map(b => `<h4 class="ops-gl-base">${lbl("base", esc(b.nama))}<small>${lbl("kalender", `${fmt(b.foto.length)} foto`)}</small></h4><div class="ops-galeri">${b.foto.map(f => `<a href="${esc(f.url)}" target="_blank" rel="noopener noreferrer"${f.lokasi ? ` title="${esc(f.lokasi)}"` : ""}><img src="${esc(f.url)}" alt="Dokumentasi ${esc(f.reg)} ${esc(f.tanggal)}" loading="lazy"><span><b>${esc(f.reg)}</b> ${u.jamWIB(f.jam_utc)} WIB${f.lokasi ? `<br>${esc(f.lokasi)}` : ""}</span></a>`).join("")}</div>`).join("")}</div></details>`; }).join("")
        : `<p class="ops-kosong">Foto dari grup WA satgas udara muncul di sini begitu ditempel ke aksi armada.</p>`, saring)}</div>`;
  }

  const IK_NILAI = {M1: "base", M2: "sortie", M3: "temuan", M4: "padam", M5: "air", M6: "peran", M7: "respons", M8: "catat", M9: "awan", M10: "ember", M11: "jam"};
  function kartuNilai(D) {
    const O = window.OperasiLapangan, v = D.nilai;
    if (!O || !v) return bagian("Efektivitas", "Nilai efektivitas belum tersedia", "");
    const ada = [], kosong = [];
    for (const k of O.KODE_NILAI) { const m = O.METRIK[k], raw = (v.semua || {})[k], t = O.tampilMetrik(k, raw); (t.kosong ? kosong : ada).push({k, m, t, raw}); }
    const arah = m => m.baik === "tinggi" ? lbl("tren", "Makin tinggi makin baik") : m.baik === "rendah" ? lbl("tren", "Makin rendah makin baik") : "";
    const ubin = ({k, m, t, raw}) => { const f = raw?.nilai, pct = k !== "M7" && f != null ? Math.max(0, Math.min(100, f * 100)) : null;
      return `<button type="button" class="ops-nl2" data-nilai="${k}" data-baik="${m.baik || ""}" data-otip="${esc(`<b>${esc(m.nama)}</b><span>${esc(t.rincian || "")}</span>${m.baik ? `<span>${m.baik === "tinggi" ? "Makin tinggi makin baik" : "Makin rendah makin baik"}</span>` : ""}<em>Klik untuk rincian per base</em>`)}">
        <header><i>${lbl(IK_NILAI[k] || "tren", "")}</i><h4>${esc(m.nama)}</h4><span class="ops-kode">${k}</span></header>
        <b>${esc(t.angka)}</b>${pct != null ? `<span class="ops-nl2-bar"><i style="width:${pct}%"></i></span>` : ""}
        <span class="ops-nl2-pil">${t.rincian ? t.rincian.split(", ").map(x => `<small>${lbl("catat", esc(x))}</small>`).join("") : ""}</span></button>`; };
    const TEMA = [["Ketepatan sasaran", "base", ["M1", "M2", "M3"]], ["Hasil pemadaman", "padam", ["M4", "M5"]], ["Kesiapan dan respons", "peran", ["M6", "M7", "M11"]], ["Mutu data dan kendala", "catat", ["M8", "M9", "M10"]]];
    const grupTema = TEMA.map(([t, ik, ks]) => [t, ik, ada.filter(x => ks.includes(x.k))]).filter(x => x[2].length);
    return bagian("Efektivitas", "", `<div class="ops-nl2-tema">${grupTema.map(([t, ik, xs]) => `<section><h4>${lbl(ik, esc(t))}</h4><div class="ops-nl2-grid" style="--n:${xs.length}">${xs.map(ubin).join("")}</div></section>`).join("")}</div>
      ${kosong.length ? `<div class="ops-nl2-kosong"><span>${lbl("catat", "Belum ada data")}</span>${kosong.map(({k, m, t}) => `<small title="${esc(t.pesan)}"><b>${k}</b>${esc(m.nama)}</small>`).join("")}</div>` : ""}`);
  }
  function bukaNilai(k) {
    const O = window.OperasiLapangan, D = st._d, v = D?.nilai; if (!O || !v) return; const m = O.METRIK[k], t = O.tampilMetrik(k, (v.semua || {})[k]);
    const rows = Object.entries(v.base || {}).map(([id, ms]) => ({id, raw: ms[k], t: O.tampilMetrik(k, ms[k])})).filter(x => !x.t.kosong).sort((x, y) => (m.baik === "rendah" ? -1 : 1) * ((x.raw.nilai ?? 0) - (y.raw.nilai ?? 0)));   // terburuk dulu (riset dashboard)
    const mx = Math.max(1e-9, ...rows.map(x => x.raw.nilai || 0));
    const isi = rows.length ? `<ol class="ops-nl2-daftar">${rows.map(x => `<li><span>${lbl("base", esc(namaBase(D, x.id)))}</span><i><em style="width:${Math.round((x.raw.nilai || 0) / mx * 100)}%"></em></i><b>${esc(x.t.angka)}</b><small>${esc(x.t.rincian || "")}</small></li>`).join("")}</ol>`
      : `<p class="ops-kosong">Belum ada nilai per base untuk metrik ini.</p>`;
    bukaDialog(`<article class="ex ex-std ops-pa ops-rp"><header class="ops-rp-hd"><i>${lbl(IK_NILAI[k] || "tren", "")}</i><div><h3>${esc(m.nama)}</h3><small>${lbl("kalender", `${esc(O.tanggalIndo(v.dari))} sampai ${esc(O.tanggalIndo(v.sampai))}`)}</small>${m.baik ? `<small>${lbl("tren", m.baik === "tinggi" ? "Makin tinggi makin baik" : "Makin rendah makin baik")}</small>` : ""}</div>
      <span class="ops-rp-angka"><b>${esc(t.kosong ? "–" : t.angka)}</b><small>nasional</small></span><button type="button" class="ops-dlg-x" data-tutup aria-label="Tutup"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg></button></header>
      <div class="ops-pa-badan">${t.rincian ? `<p class="ops-nl2-pil">${t.rincian.split(", ").map(x => `<small>${lbl("catat", esc(x))}</small>`).join("")}</p>` : ""}${sek("Per base", [["base", `${fmt(rows.length)} base`]], isi, "base")}</div></article>`);
  }

  /* kontrak 2026 per provinsi (pemilik 11 Nov 2026 "bagusin"): kartu provinsi berisi total jam + bilah bagian nasional,
     lalu baris Patroli dan Water bombing berdampingan; jam ditulis bulat "1.141 jam", liter dalam juta */
  function kartuKontrak(D) {
    const u = U(), R = u.OP.rekap, rows = R?.total || [];
    const tot = rows.reduce((a, x) => ({jam: a.jam + (x.jam_operasi_menit || 0), sortie: a.sortie + (x.sortie || 0), wb: a.wb + (x.wb_drop || 0), n: a.n + (x.kontrak || 0)}), {jam: 0, sortie: 0, wb: 0, n: 0});
    if (!rows.length) return bagian("Kontrak 2026", "Rekap kontrak belum termuat", `<p class="ops-kosong">Rekap kontrak belum termuat.</p>`);
    const jamB = m => `${fmt(Math.round((m || 0) / 60))} jam`, prov = [...new Set(rows.map(x => x.prov))].map(p => ({p, r: rows.filter(x => x.prov === p)}))
      .map(g => ({...g, jam: g.r.reduce((t, x) => t + (x.jam_operasi_menit || 0), 0)})).sort((x, y) => y.jam - x.jam);
    /* tiap provinsi: tabel mini, baris = jenis, kolom angka tetap; tidak bisa meluber (pemilik 11 Nov 2026 "keluar-keluar", "bagusin semua") */
    const jt = v => v ? (v / 1e6).toLocaleString("id-ID", {maximumFractionDigits: 1}) : "–";
    const baris = x => `<tr data-j="${esc(x.jenis)}"><th scope="row"><span class="ops-kp-jenis">${lbl(x.jenis === "wb" ? "air" : "vis", esc(x.jenis === "wb" ? "WB" : PERAN[x.jenis] || x.jenis))}</span></th><td>${fmt(x.kontrak)}</td><td>${fmt(Math.round((x.jam_operasi_menit || 0) / 60))}</td><td>${fmt(x.sortie || 0)}</td><td>${x.jenis === "wb" && x.wb_drop ? fmt(x.wb_drop) : "–"}</td><td>${x.jenis === "wb" ? jt(x.liter) : "–"}</td></tr>`;
    const kepT = `<thead><tr><th></th>${[["op", "Kontrak"], ["jam", "Jam"], ["peran", "Sortie"], ["ember", "Jatuhan"], ["air", "Jt liter"]].map(([i, t]) => `<th scope="col">${lbl(i, t)}</th>`).join("")}</tr></thead>`;
    const kartu = prov.map(g => `<article class="ops-kp"><header><b class="ops-kp-prov">${lambangProv(g.p)}${esc(u.PROV_PDK[g.p] || g.p)}</b><span><b>${jamB(g.jam)}</b><small>${u.persen(g.jam / tot.jam)} dari total</small></span></header>
      <i class="ops-kp-bar" style="--p:${Math.round(g.jam / tot.jam * 100)}%"></i>
      <table class="ops-kp-t">${kepT}<tbody>${g.r.slice().sort((x, y) => (x.jenis === "wb") - (y.jenis === "wb")).map(baris).join("")}</tbody></table></article>`).join("");
    return bagian("Kontrak 2026", `${hl(jamB(tot.jam))} operasi udara dari ${fmt(tot.n)} kontrak 2026, ${hl(fmt(tot.sortie))} sortie`, `<div class="ops-kp-grid" style="--k:${kolomSim(prov.length)}">${kartu}</div>`);
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
    const bp = resmi ? (resmi.belum_padam_ha?.prioritas_6_prov || 0) + (resmi.belum_padam_ha?.lainnya || 0) : null, ph = D.patroli ? patroliHari(D).length : null;
    const ringkas = ringkasLipat(D, [selDarat("peran", nol(totP || resmi?.personel_darat), "Personel darat", sumber, !(totP || resmi?.personel_darat)),
      selDarat("api", resmi ? fmt(resmi.dipadamkan_total_ha) + "<small> ha</small>" : "–", "Lahan dipadamkan", resmi ? `kumulatif s.d. ${tglPendek(resmi.per)}` : "", !resmi),
      selDarat("ts", resmi ? fmt(bp) + "<small> ha</small>" : "–", "Belum padam", resmi ? `per ${tglPendek(resmi.per)}` : "", !resmi),
      selDarat("padam", resmi?.padam_hari_sama_pct != null ? fmt(resmi.padam_hari_sama_pct) + "%" : "–", "Padam hari yang sama", resmi ? `per ${tglPendek(resmi.per)}` : "", resmi?.padam_hari_sama_pct == null),
      selDarat("base", fmt(prov.length), "Provinsi melapor", "", !prov.length), selDarat("vis", ph != null ? fmt(ph) : "–", "Patroli regu terjadwal", tglPendek(D.t), !ph)]);
    const barisLuas = prov.filter(p => p.ditangani != null || p.sisa != null).sort((a, b) => (b.ditangani || 0) - (a.ditangani || 0)).map(p => `<tr>${kiri(`<b>${esc(p.nama)}</b>`)}${sel(p.ditangani == null ? "–" : fmt(p.ditangani) + " ha")}${sel(p.sisa == null ? "–" : fmt(p.sisa) + " ha")}${kiri(esc(p.upaya || p.hambatan || "–"))}</tr>`);
    const dipadamkan = resmi ? Object.entries(resmi.dipadamkan_ha).sort((a, b) => b[1] - a[1]).map(([k, v]) => `<tr>${kiri(`<b>${esc(k === "lainnya" ? "Lainnya" : (window.Wilayah?.PROV?.[k] || namaProvSah(k)))}</b>`)}${sel(fmt(v) + " ha")}${sel(fmt(Math.round(v / resmi.dipadamkan_total_ha * 1000) / 10) + "%")}</tr>`) : [];
    return [
      ringkas, `<section class="ops-wadah">${[
      bagian("Personel", snap ? `Kekuatan personel per unsur pada ${esc(tglPanjang(D.t))}` : `Kekuatan personel per unsur, ${hl(esc(sumber))}`, tabelH(kepalaUnsur, barisP, "Laporan provinsi belum dikunci untuk tanggal ini.")),
      bagian("Penanganan lahan", barisLuas.length ? `${hl(fmt(Math.round(barisLuas.length)))} provinsi melaporkan luas penanganan darat` : "Luas penanganan darat belum dilaporkan",
        tabelH(["Provinsi", "#Ditangani darat", "#Akan dipadamkan", "Upaya dan rekomendasi"], barisLuas, "Belum ada angka luas penanganan darat.")),
      resmi ? bagian("Dipadamkan 2026", `${hl(fmt(resmi.dipadamkan_total_ha) + " ha")} lahan dipadamkan s.d. ${esc(tglPanjang(resmi.per))}`, tabelH(["Provinsi", "#Luas", "#Porsi"], dipadamkan, "")) : "",
      kartuPatroli(D)].join("")}</section>`].join("");
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
