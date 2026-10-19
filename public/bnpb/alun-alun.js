/* Alun-alun (publik). Semua teks dari server masuk lewat textContent; tidak ada innerHTML dari data. Skrip tunggal, tanpa build.
   API: GET /api/alun, GET /api/alun/:id, POST /api/alun[/balas|upvote|lapor|terjawab/:id]. Kode pemilik utas disimpan di localStorage. */
(() => {
  const $ = id => document.getElementById(id), NS = "http://www.w3.org/2000/svg";
  const IKON = {
    tanya: "M12 21a9 9 0 1 1 9-9 9 9 0 0 1-9 9z|M9.5 9.5a2.5 2.5 0 1 1 3.6 2.2c-.7.4-1.1 1-1.1 1.8|M12 17h.01",
    butuh_bantuan: "M12 3l9 16H3z|M12 10v4|M12 17h.01",
    info_lapangan: "M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z|M12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z",
    pengumuman: "M3 11v3a1 1 0 0 0 1 1h3l6 4V6L7 10H4a1 1 0 0 0-1 1z|M16 9a4 4 0 0 1 0 6",
    semua: "M4 6h16|M4 12h16|M4 18h16",
    balas: "M21 12a8 8 0 0 1-11.5 7.2L4 20l1-4.5A8 8 0 1 1 21 12z",
    naik: "M12 19V5|M5 12l7-7 7 7",
    bendera: "M5 21V4|M5 4h11l-2 4 2 4H5",
    bagikan: "M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7|M16 6l-4-4-4 4|M12 2v13",
    centang: "M5 12l5 5 9-10",
    kembali: "M15 6l-6 6 6 6",
    resmi: "M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z|M9 12l2 2 4-4",
    jam: "M12 21a9 9 0 1 1 0-18 9 9 0 0 1 0 18z|M12 7v5l3 2",
    teruskan: "M5 12h14|M13 6l6 6-6 6",
  };
  const svg = n => { const s = document.createElementNS(NS, "svg"); s.setAttribute("viewBox", "0 0 24 24"); s.setAttribute("class", "al-ikon"); s.setAttribute("aria-hidden", "true");
    for (const d of IKON[n].split("|")) { const p = document.createElementNS(NS, "path"); p.setAttribute("d", d); s.appendChild(p); } return s; };
  const h = (tag, att, ...anak) => { const e = document.createElement(tag);
    for (const [k, v] of Object.entries(att || {})) { if (v == null || v === false) continue; if (k === "class") e.className = v; else if (k === "teks") e.textContent = v; else e.setAttribute(k, v === true ? "" : v); }
    for (const a of anak) if (a != null) e.append(a); return e; };
  const JENIS = {tanya: "Tanya", butuh_bantuan: "Butuh bantuan", info_lapangan: "Info lapangan", pengumuman: "Pengumuman resmi"};
  const BANTUAN = {terbuka: "Terbuka", ditangani: "Ditangani", selesai: "Selesai"}, TERUSKAN = {relawan: "Diteruskan ke relawan", logistik: "Diteruskan ke logistik"};
  const ALASAN = {spam: "Spam atau iklan", kasar: "Kata kasar", hoaks: "Kabar bohong (hoaks)", data_pribadi: "Memuat data pribadi", lainnya: "Lainnya"};
  const PROV = {"11": "Aceh", "12": "Sumatera Utara", "13": "Sumatera Barat", "14": "Riau", "15": "Jambi", "16": "Sumatera Selatan", "17": "Bengkulu", "18": "Lampung", "19": "Kepulauan Bangka Belitung", "21": "Kepulauan Riau",
    "31": "DKI Jakarta", "32": "Jawa Barat", "33": "Jawa Tengah", "34": "DI Yogyakarta", "35": "Jawa Timur", "36": "Banten", "51": "Bali", "52": "Nusa Tenggara Barat", "53": "Nusa Tenggara Timur", "61": "Kalimantan Barat",
    "62": "Kalimantan Tengah", "63": "Kalimantan Selatan", "64": "Kalimantan Timur", "65": "Kalimantan Utara", "71": "Sulawesi Utara", "72": "Sulawesi Tengah", "73": "Sulawesi Selatan", "74": "Sulawesi Tenggara",
    "75": "Gorontalo", "76": "Sulawesi Barat", "81": "Maluku", "82": "Maluku Utara", "91": "Papua", "92": "Papua Barat", "93": "Papua Selatan", "94": "Papua Tengah", "95": "Papua Pegunungan", "96": "Papua Barat Daya"};
  const BENCANA = {umum: "Umum (semua bencana)"};
  const angka = n => Number(n || 0).toLocaleString("id-ID");
  const relatif = t => { const s = Math.max(0, (Date.now() - t) / 1000); if (s < 60) return "baru saja"; if (s < 3600) return `${angka(Math.floor(s / 60))} menit lalu`;
    if (s < 86400) return `${angka(Math.floor(s / 3600))} jam lalu`; if (s < 30 * 86400) return `${angka(Math.floor(s / 86400))} hari lalu`;
    return new Date(t).toLocaleDateString("id-ID", {day: "numeric", month: "short", year: "numeric"}); };
  const simpan = {
    ambil: k => { try { return localStorage.getItem(k); } catch (e) { return null; } },
    taruh: (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} },
  };
  const sudahUp = () => new Set(JSON.parse(simpan.ambil("alun.up") || "[]"));
  const catatUp = id => { const s = sudahUp(); s.add(id); simpan.taruh("alun.up", JSON.stringify([...s].slice(-500))); };
  const kodeUtas = id => simpan.ambil("alun.kode." + id);

  async function api(metode, jalur, body, kode) {
    /* tulis, balas, lapor: token Turnstile bila server mengaktifkannya (/bnpb/turnstile.js); upvote dan terjawab tanpa */
    if (body && metode === "POST" && /^\/api\/alun(\/balas\/|\/lapor\/|$)/.test(jalur)) { const t = await window.tokenTurnstile?.(); if (t) body = {...body, turnstile: t}; }
    const r = await fetch(jalur, {method: metode, headers: {...(body ? {"content-type": "application/json"} : {}), ...(kode ? {"x-kode": kode} : {})}, body: body ? JSON.stringify(body) : undefined});
    return {ok: r.ok, s: r.status, j: await r.json().catch(() => ({}))};
  }
  const pesan = (el, t, ok) => { el.textContent = t || ""; el.className = "bn-pesan" + (t ? (ok ? " ok" : " galat") : ""); };

  /* ---------- pil ---------- */
  const pilJenis = j => h("span", {class: "bn-pil " + j}, svg(j), JENIS[j]);
  const pilTeks = (kls, t, ik) => h("span", {class: "bn-pil " + kls}, ik ? svg(ik) : null, t);
  const wilayah = u => [u.kab, u.prov_nama || PROV[u.prov]].filter(Boolean).join(", ");

  /* ---------- filter ---------- */
  const S = {jenis: "", bencana: "", prov: "", urut: "terbaru", berikut: null, aktif: null, no: 0};
  function isiPilihan(sel, peta, semua) {
    sel.replaceChildren(...(semua ? [h("option", {value: "", teks: semua})] : []), ...Object.entries(peta).map(([k, v]) => h("option", {value: k, teks: v})));
  }
  function bangunFilter() {
    const w = $("fJenis"), semua = h("button", {type: "button", "aria-pressed": "true", "data-jenis": ""}, svg("semua"), "Semua");
    w.append(semua, ...Object.entries(JENIS).map(([k, v]) => h("button", {type: "button", "aria-pressed": "false", "data-jenis": k}, svg(k), v)));
    w.addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return; S.jenis = b.dataset.jenis; for (const x of w.children) x.setAttribute("aria-pressed", String(x === b)); muatDaftar(true); });
    isiPilihan($("fBencana"), BENCANA, "Semua bencana"); isiPilihan($("fProv"), PROV, "Semua provinsi");
    $("fBencana").addEventListener("change", e => { S.bencana = e.target.value; muatDaftar(true); });
    $("fProv").addEventListener("change", e => { S.prov = e.target.value; muatDaftar(true); });
    $("fUrut").addEventListener("change", e => { S.urut = e.target.value; muatDaftar(true); });
    $("tJenis").append(...["tanya", "butuh_bantuan", "info_lapangan"].map((k, i) => h("label", null, h("input", {type: "radio", name: "jenis", value: k, checked: i === 0}), svg(k), JENIS[k])));
    isiPilihan($("tBencana"), BENCANA); isiPilihan($("tProv"), PROV);
    $("laporAlasan").append(...Object.entries(ALASAN).map(([k, v], i) => h("label", null, h("input", {type: "radio", name: "alasan", value: k, checked: i === 0}), v)));
  }

  /* ---------- daftar (render bertahap supaya klik tidak membeku) ---------- */
  function baris(u) {
    const kanan = h("span", {class: "al-kanan"});
    if (u.resmi) kanan.append(pilTeks("resmi", "Resmi", "resmi"));
    if (u.terjawab) kanan.append(pilTeks("terjawab", "Terjawab", "centang"));
    if (u.bantuan) kanan.append(pilTeks(u.bantuan, BANTUAN[u.bantuan], "jam"));
    const b = h("button", {class: "al-baris" + (u.sematan ? " al-sematan" : ""), type: "button", "data-id": u.id, "aria-current": String(u.id === S.aktif)},
      h("span", {class: "al-judul", teks: u.judul}), kanan,
      h("span", {class: "al-meta"}, pilJenis(u.jenis), h("span", {teks: wilayah(u) || "Wilayah belum disebut"}), h("span", {teks: relatif(u.dibuat)}),
        h("span", {class: "al-angka", title: "Balasan"}, svg("balas"), angka(u.balasan)), h("span", {class: "al-angka", title: "Upvote"}, svg("naik"), angka(u.upvote))));
    return h("li", null, b);
  }
  function tambahBertahap(daftar, utas, awal) {
    let i = 0;
    const langkah = () => { const f = document.createDocumentFragment(); for (const u of utas.slice(i, i + 8)) f.append(baris(u)); daftar.append(f); i += 8; if (i < utas.length && daftar.dataset.no === String(awal)) requestAnimationFrame(langkah); };
    langkah();
  }
  async function muatDaftar(ulang) {
    const no = ++S.no, daftar = $("daftar"), q = new URLSearchParams();
    for (const k of ["jenis", "bencana", "prov"]) if (S[k]) q.set(k, S[k]);
    q.set("urut", S.urut); if (!ulang && S.berikut) q.set("kursor", S.berikut);
    if (ulang) { daftar.replaceChildren(h("li", {class: "al-kosong", teks: "Memuat..."})); $("lagi").hidden = true; }
    const r = await api("GET", "/api/alun?" + q);
    if (no !== S.no) return;
    if (!r.ok) { daftar.replaceChildren(); pesan($("daftarPesan"), r.s === 503 ? "Alun-alun belum diaktifkan." : r.j.galat || "Gagal memuat utas.", false); return; }
    pesan($("daftarPesan"), "");
    daftar.dataset.no = String(no); if (ulang) daftar.replaceChildren();
    const utas = [...(ulang ? r.j.sematan : []), ...r.j.utas];
    if (ulang && !utas.length) daftar.append(h("li", {class: "al-kosong", teks: "Belum ada utas di sini. Jadilah yang pertama menulis."}));
    tambahBertahap(daftar, utas, no); S.berikut = r.j.berikut; $("lagi").hidden = !r.j.berikut;
  }
  $("lagi")?.addEventListener("click", () => muatDaftar(false));

  /* ---------- rincian ---------- */
  const kotak = () => $("rincian");
  function tutupRincian() { S.aktif = null; kotak().hidden = true; history.replaceState(null, "", location.pathname + location.search); for (const b of document.querySelectorAll(".al-baris[aria-current=true]")) b.setAttribute("aria-current", "false"); }
  async function bukaRincian(id) {
    S.aktif = id; kotak().hidden = false;
    for (const b of document.querySelectorAll(".al-baris")) b.setAttribute("aria-current", String(b.dataset.id === id));
    history.replaceState(null, "", "#u=" + id);
    kotak().replaceChildren(h("p", {class: "al-kosong", teks: "Memuat..."}));
    const r = await api("GET", "/api/alun/" + id);
    if (S.aktif !== id) return;
    if (!r.ok) { kotak().replaceChildren(h("button", {class: "bn-tombol sekunder al-kembali", type: "button", "data-aksi": "tutup"}, svg("kembali"), "Kembali"), h("p", {class: "al-kosong", teks: r.s === 404 ? "Utas ini tidak ada atau sudah disembunyikan." : r.j.galat || "Gagal memuat."})); return; }
    gambarRincian(r.j);
  }
  function tombolUp(id, n, kls) {
    const b = h("button", {class: "al-ikonbtn", type: "button", "data-aksi": "upvote", "data-id": id, "aria-pressed": String(sudahUp().has(id)), title: "Upvote"}, svg("naik"), h("span", {teks: angka(n)}));
    return b;
  }
  function gambarRincian(u) {
    const pemilik = !!kodeUtas(u.id), root = kotak();
    const kepala = h("div", {class: "al-kepala"}, pilJenis(u.jenis));
    if (u.resmi) kepala.append(pilTeks("resmi", "Resmi", "resmi"));
    if (u.bantuan) kepala.append(pilTeks(u.bantuan, BANTUAN[u.bantuan], "jam"));
    if (u.teruskan_ke) kepala.append(pilTeks(u.teruskan_ke, TERUSKAN[u.teruskan_ke], "teruskan"));
    if (u.terjawab) kepala.append(pilTeks("terjawab", "Terjawab", "centang"));
    const meta = h("div", {class: "al-meta"}, h("span", {teks: u.nama || "Warga"}), h("span", {teks: wilayah(u)}), h("span", {teks: relatif(u.dibuat)}));
    const aksi = h("div", {class: "al-bar"}, tombolUp(u.id, u.upvote),
      h("button", {class: "al-ikonbtn", type: "button", "data-aksi": "lapor", "data-id": u.id, title: "Laporkan"}, svg("bendera"), "Laporkan"),
      h("button", {class: "al-ikonbtn", type: "button", "data-aksi": "bagikan", title: "Salin tautan", "aria-label": "Salin tautan"}, svg("bagikan")));
    const daftar = h("ul", {class: "al-balasan"}, ...u.balasan_daftar.map(b => {
      const ya = b.id === u.terjawab_id;
      const tombol = h("div", {class: "al-bar"}, tombolUp(b.id, b.upvote), h("button", {class: "al-ikonbtn", type: "button", "data-aksi": "lapor", "data-id": b.id, title: "Laporkan", "aria-label": "Laporkan balasan"}, svg("bendera")));
      if (pemilik && u.jenis !== "pengumuman") tombol.append(h("button", {class: "al-ikonbtn", type: "button", "data-aksi": "terjawab", "data-id": ya ? "" : b.id}, svg("centang"), ya ? "Cabut tanda terjawab" : "Tandai terjawab"));
      return h("li", {class: "al-balas" + (b.petugas ? " petugas" : "") + (ya ? " jawaban" : "")},
        h("div", {class: "al-meta"}, b.petugas ? pilTeks("resmi", "Petugas", "resmi") : h("strong", {teks: b.nama || "Warga"}), ya ? pilTeks("terjawab", "Jawaban", "centang") : null, h("span", {teks: relatif(b.dibuat)})),
        h("p", {teks: b.teks}), tombol);
    }));
    const form = h("form", {class: "al-formbalas", id: "formBalas", autocomplete: "off"},
      h("label", {class: "bn-isian"}, `Balasanmu (${angka(u.balasan)} balasan)`, h("textarea", {name: "teks", maxlength: "280", required: true})),
      h("label", {class: "bn-isian"}, "Nama tampil (opsional)", h("input", {name: "nama", maxlength: "40"})),
      h("p", {class: "bn-pesan", id: "balasPesan", role: "status"}), h("div", null, h("button", {class: "bn-tombol", type: "submit"}, "Kirim balasan")));
    root.replaceChildren(h("button", {class: "bn-tombol sekunder al-kembali", type: "button", "data-aksi": "tutup"}, svg("kembali"), "Kembali"), kepala, h("h2", {teks: u.judul}), meta,
      h("div", {class: "al-teks", teks: u.teks}), aksi, daftar, form);
    root.dataset.id = u.id;
  }
  kotak().addEventListener("click", async e => {
    const b = e.target.closest("button[data-aksi]"); if (!b) return;
    const id = kotak().dataset.id, a = b.dataset.aksi;
    if (a === "tutup") return tutupRincian();
    if (a === "bagikan") { const u = location.origin + "/alun-alun#u=" + id; try { await navigator.clipboard.writeText(u); b.title = "Tautan disalin"; } catch (x) { prompt("Salin tautan:", u); } return; }
    if (a === "lapor") { $("dlgLapor").dataset.id = b.dataset.id; pesan($("laporPesan"), ""); $("dlgLapor").showModal(); return; }
    if (a === "upvote") {
      const pos = b.dataset.id, r = await api("POST", "/api/alun/upvote/" + pos, {});
      if (r.ok) { catatUp(pos); b.setAttribute("aria-pressed", "true"); b.lastChild.textContent = angka(r.j.upvote); } else alert(r.j.galat || "Gagal");
    }
    if (a === "terjawab") {
      const r = await api("POST", "/api/alun/terjawab/" + id, {balasan_id: b.dataset.id || null}, kodeUtas(id));
      if (r.ok) bukaRincian(id); else alert(r.j.galat || "Gagal");
    }
  });
  kotak().addEventListener("submit", async e => {
    if (e.target.id !== "formBalas") return; e.preventDefault();
    const f = e.target, id = kotak().dataset.id, tombol = f.querySelector("button"), p = $("balasPesan");
    tombol.disabled = true; pesan(p, "");
    const r = await api("POST", "/api/alun/balas/" + id, {teks: f.teks.value, nama: f.nama.value || null});
    tombol.disabled = false;
    if (r.ok) { await bukaRincian(id); muatDaftar(true); } else pesan(p, r.j.galat || `Gagal (${r.s})`, false);
  });
  $("daftar").addEventListener("click", e => { const b = e.target.closest(".al-baris"); if (b) bukaRincian(b.dataset.id); });

  /* ---------- lapor ---------- */
  $("laporBatal").addEventListener("click", () => $("dlgLapor").close());
  $("formLapor").addEventListener("submit", async e => {
    e.preventDefault();
    const id = $("dlgLapor").dataset.id, alasan = new FormData(e.target).get("alasan");
    const r = await api("POST", "/api/alun/lapor/" + id, {alasan});
    if (r.ok) { $("dlgLapor").close(); if (r.j.tersembunyi) { tutupRincian(); muatDaftar(true); } } else pesan($("laporPesan"), r.j.galat || `Gagal (${r.s})`, false);
  });

  /* ---------- tulis utas ---------- */
  let lokasi = null;
  $("tulisBuka").addEventListener("click", () => { pesan($("tulisPesan"), ""); $("dlgTulis").showModal(); });
  $("tulisBatal").addEventListener("click", () => $("dlgTulis").close());
  $("lokasiPakai").addEventListener("click", () => {
    if (!navigator.geolocation) { $("lokasiInfo").textContent = "Peramban ini tidak bisa membaca lokasi."; return; }
    $("lokasiInfo").textContent = "Mencari lokasi...";
    navigator.geolocation.getCurrentPosition(p => { lokasi = {lat: +p.coords.latitude.toFixed(2), lon: +p.coords.longitude.toFixed(2)}; $("lokasiInfo").textContent = `Lokasi kira-kira, dibulatkan sekitar 1 km, tampil publik: ${lokasi.lat.toLocaleString("id-ID")}, ${lokasi.lon.toLocaleString("id-ID")}`; },
      () => { lokasi = null; $("lokasiInfo").textContent = "Lokasi tidak bisa dibaca."; }, {timeout: 8000});
  });
  $("formTulis").addEventListener("submit", async e => {
    e.preventDefault();
    const f = e.target, d = Object.fromEntries(new FormData(f)), tombol = $("tulisKirim");
    tombol.disabled = true; pesan($("tulisPesan"), "");
    const r = await api("POST", "/api/alun", {jenis: d.jenis, judul: d.judul, teks: d.teks, bencana: d.bencana, prov: d.prov, kab: d.kab || null, nama: d.nama || null, ...(lokasi || {})});
    tombol.disabled = false;
    if (!r.ok) return pesan($("tulisPesan"), r.j.galat || `Gagal (${r.s})`, false);
    simpan.taruh("alun.kode." + r.j.id, r.j.kode);   // hanya di peramban ini; dipakai untuk menandai balasan terjawab
    f.reset(); lokasi = null; $("lokasiInfo").textContent = ""; $("dlgTulis").close();
    await muatDaftar(true); bukaRincian(r.j.id);
  });

  /* ---------- mulai ---------- */
  async function mulai() {
    bangunFilter();
    try { const b = await (await fetch("/bencana.json")).json(); for (const x of b.bencana) if (x.status !== "mati") BENCANA[x.id] = x.nama; } catch (e) {}
    isiPilihan($("fBencana"), BENCANA, "Semua bencana"); isiPilihan($("tBencana"), BENCANA);
    await muatDaftar(true);
    const m = location.hash.match(/^#u=([0-9a-f]{16})$/); if (m) bukaRincian(m[1]);
  }
  mulai();
})();
