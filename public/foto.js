/* foto.js — Foto & video lapangan warga: kirim dari lokasi (GPS perangkat), galeri per wilayah (tab "Foto Lapangan"),
   kartu thumbnail di peta (dikelompokkan provinsi / kab-kota / kecamatan mengikuti zoom), rincian dengan suka, komentar, bagikan.
   API: /api/foto* (src/foto.js). Skrip klasik dimuat SETELAH skrip utama index.html. Global: S, peta, $, esc, fmt, namaProv,
   jamWIB, bukaTab, toast. Tidak ada angka karangan: semua dari /api/foto. Foto antrean (belum disetujui admin) tidak pernah tampil. */
(() => {
  const API = "/api/foto", JAM = 36e5;
  const KAT = {api: ["Api", "#d9603b"], asap: ["Asap", "#6b7489"], padam: ["Pemadaman", "#2f7fb8"], dampak: ["Dampak", "#c49a1c"], lainnya: ["Lainnya", "#3d9461"]};
  const TINGKAT = [["prov", "Provinsi"], ["kab", "Kab/Kota"], ["kec", "Kecamatan"]];
  const bacaL = (k, d) => { try { return localStorage.getItem(k) ?? d; } catch (e) { return d; } };
  const tulisL = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };
  const admin = bacaL("pb_admin", "") === "1";   // dipasang /admin/foto: admin melihat data dummy di halaman publik
  const lalu = t => { const m = Math.max(0, (Date.now() - t) / 6e4); return m < 1 ? "baru saja" : m < 60 ? `${Math.floor(m)} mnt lalu` : m < 1440 ? `${Math.floor(m / 60)} jam lalu` : `${Math.floor(m / 1440)} hari lalu`; };
  const durasi = d => d ? `${Math.floor(d / 60)}:${String(Math.round(d % 60)).padStart(2, "0")}` : "";
  const namaWil = (f, t) => t === "prov" ? namaProv(f.prov) : t === "kab" ? f.kab : `Kec. ${f.kec}`;
  const kunciWil = (f, t) => t === "prov" ? f.prov : t === "kab" ? `${f.prov}|${f.kab}` : `${f.prov}|${f.kab}|${f.kec}`;
  const IK = {
    kamera: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg>',
    hati: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/></svg>',
    kom: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M4 5h16v11H9l-5 4z"/></svg>',
    bagi: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="m8.2 10.8 7.6-4.6M8.2 13.2l7.6 4.6"/></svg>',
    pin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M12 21s-6.5-6-6.5-11a6.5 6.5 0 0 1 13 0C18.5 15 12 21 12 21z"/><circle cx="12" cy="10" r="2.2"/></svg>',
    main: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>',
    cek: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 4.5 4.5L19 7"/></svg>',
  };

  /* ------------------------------------------------------------ data */
  const D = {foto: [], muat: null, konfig: null, no: new Map()};
  async function muat(paksa) {
    if (D.muat && !paksa) return D.muat;
    return D.muat = fetch(API + (admin ? "?dummy=1" : ""), {credentials: "same-origin"}).then(r => r.ok ? r.json() : {foto: []}).then(j => {
      D.foto = j.foto || [];
      [...D.foto].sort((a, b) => a.dibuat - b.dibuat).forEach((f, i) => D.no.set(f.id, "#" + String(i + 1).padStart(3, "0")));
      return D.foto;
    }).catch(() => (D.foto = []));
  }
  const konfig = () => D.konfig ||= fetch(API + "/konfig").then(r => r.json()).catch(() => ({media: false}));

  /* ------------------------------------------------------------ kartu (gaya kartu koleksi: bingkai putih, latar pastel per kategori) */
  const kartu = (f, kecil = false) => { const [k, w] = KAT[f.kategori] || KAT.lainnya;
    return `<button type="button" class="fl-kartu${kecil ? " kecil" : ""}" style="--k:${w}" data-fid="${f.id}" aria-label="${esc(`${k} di ${f.kec}, ${f.kab}`)}">
      <span class="fl-gbr"><span class="fl-no">${D.no.get(f.id) || ""}</span><img loading="lazy" decoding="async" alt="" src="${API}/thumb/${f.id}">
        ${f.jenis === "video" ? `<span class="fl-vid">${IK.main}${durasi(f.durasi)}</span>` : ""}${f.contoh ? '<span class="fl-contoh">contoh</span>' : ""}</span>
      <b>${esc(f.kec ? "Kec. " + f.kec : f.kab)}</b><small>${k} · ${lalu(f.diambil)}</small></button>`; };

  /* ------------------------------------------------------------ tab galeri */
  const G = {tingkat: bacaL("fl-tingkat", "kab"), kat: "", wil: ""};
  async function render() {
    const el = $("#foto"); if (!el) return;
    if (!el.dataset.siap) {
      el.dataset.siap = 1;
      el.innerHTML = `<div class="fl-wrap"><header class="fl-kepala"><div><h2>Foto lapangan</h2><p>Foto dan video dari warga di lokasi, diperiksa admin sebelum tayang.</p></div>
        <button class="fl-pri" data-kirim>${IK.kamera}Kirim foto</button></header>
        <div class="fl-alat"><div class="fl-seg" role="group" aria-label="Kelompokkan per">${TINGKAT.map(([k, n]) => `<button data-t="${k}" aria-pressed="${k === G.tingkat}">${n}</button>`).join("")}</div>
        <div class="fl-chip" role="group" aria-label="Kategori"><button data-k="" aria-pressed="true">Semua</button>${Object.entries(KAT).map(([k, [n, w]]) => `<button data-k="${k}" style="--k:${w}" aria-pressed="false">${n}</button>`).join("")}</div></div>
        <div id="flIsi" class="fl-isi"><div class="fl-skel"></div><div class="fl-skel"></div><div class="fl-skel"></div></div></div>`;
      el.addEventListener("click", e => {
        const t = e.target.closest("[data-t]"); if (t) { G.tingkat = t.dataset.t; G.wil = ""; tulisL("fl-tingkat", G.tingkat); el.querySelectorAll("[data-t]").forEach(b => b.setAttribute("aria-pressed", b === t)); return isiGaleri(); }
        const k = e.target.closest("[data-k]"); if (k) { G.kat = k.dataset.k; el.querySelectorAll("[data-k]").forEach(b => b.setAttribute("aria-pressed", b === k)); return isiGaleri(); }
        if (e.target.closest("[data-kirim]")) return Kirim.buka();
        const w = e.target.closest("[data-wil-hapus]"); if (w) { G.wil = ""; return isiGaleri(); }
        const c = e.target.closest("[data-fid]"); if (c) return Rinci.buka(c.dataset.fid);
      });
    }
    await muat(); isiGaleri();
  }
  function isiGaleri() {
    const isi = $("#flIsi"); if (!isi) return;
    const xs = D.foto.filter(f => (!G.kat || f.kategori === G.kat) && (!G.wil || kunciWil(f, G.tingkat).startsWith(G.wil)));
    if (!xs.length) { isi.innerHTML = `<div class="fl-kosong">${IK.kamera}<b>${D.foto.length ? "Tidak ada foto untuk saringan ini" : "Belum ada foto lapangan"}</b>
      <p>${D.foto.length ? "Coba kategori atau wilayah lain." : "Jadilah yang pertama mengirim foto dari lokasimu."}</p>${D.foto.length ? "" : '<button class="fl-pri" data-kirim>Kirim foto</button>'}</div>`; return; }
    const grup = new Map();
    for (const f of xs) { const k = kunciWil(f, G.tingkat); (grup.get(k) || grup.set(k, []).get(k)).push(f); }
    const urut = [...grup.values()].sort((a, b) => b.length - a.length || b[0].dibuat - a[0].dibuat);
    isi.innerHTML = (G.wil ? `<p class="fl-saring">Wilayah: <b>${esc(namaWil(xs[0], G.tingkat))}</b> <button data-wil-hapus>Semua wilayah ×</button></p>` : "") +
      urut.map(g => `<section class="fl-grup"><h3>${esc(namaWil(g[0], G.tingkat))}<small>${G.tingkat !== "prov" ? esc(G.tingkat === "kec" ? g[0].kab + " · " : "") + esc(namaProv(g[0].prov)) + " · " : ""}${g.length} ${g.length > 1 ? "kiriman" : "kiriman"}</small></h3>
        <div class="fl-grid">${g.map(f => kartu(f)).join("")}</div></section>`).join("");
  }

  /* ------------------------------------------------------------ lapisan peta: kartu HTML, dikelompokkan menurut zoom */
  const P = {nyala: bacaL("fl-lapis", "1") === "1", penanda: [], pasang: false};
  const tingkatZoom = z => z < 6.2 ? "prov" : z < 8.6 ? "kab" : z < 11.2 ? "kec" : null;
  function gambarPeta() {
    if (typeof peta === "undefined" || !peta) return;
    P.penanda.forEach(m => m.remove()); P.penanda = [];
    if (!P.nyala || !D.foto.length) return;
    const t = tingkatZoom(peta.getZoom()), b = peta.getBounds().pad?.(.2) || peta.getBounds(), grup = new Map();
    for (const f of D.foto) { if (!b.contains([f.lon, f.lat])) continue; const k = t ? kunciWil(f, t) : f.id; (grup.get(k) || grup.set(k, []).get(k)).push(f); }
    for (const g of [...grup.values()].slice(0, 160)) {
      const lat = g.reduce((s, f) => s + f.lat, 0) / g.length, lon = g.reduce((s, f) => s + f.lon, 0) / g.length, el = document.createElement("div");
      if (g.length === 1) { el.className = "fl-pn satu"; el.innerHTML = kartu(g[0], true); }
      else { el.className = "fl-pn tumpuk"; el.innerHTML = `<span class="fl-kipas">${g.slice(0, 3).map((f, i) => `<img alt="" loading="lazy" src="${API}/thumb/${f.id}" style="--i:${i - Math.min(2, g.length - 1) / 2};--k:${KAT[f.kategori]?.[1]}">`).join("")}</span>
        <span class="fl-lbl"><b>${esc(namaWil(g[0], t))}</b><em>${g.length}</em></span>`;
        el.setAttribute("role", "button"); el.tabIndex = 0; el.setAttribute("aria-label", `${g.length} foto di ${namaWil(g[0], t)}`); }
      el.addEventListener("click", e => { e.stopPropagation();
        if (g.length === 1) return Rinci.buka(g[0].id);
        const lo = g.map(f => f.lon), la = g.map(f => f.lat);
        if (Math.max(...lo) - Math.min(...lo) < .002 && Math.max(...la) - Math.min(...la) < .002) { G.wil = kunciWil(g[0], "kec"); G.tingkat = "kec"; return bukaTab("foto"); }
        peta.fitBounds([[Math.min(...lo), Math.min(...la)], [Math.max(...lo), Math.max(...la)]], {padding: 80, maxZoom: 13}); });
      el.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); el.click(); } });
      P.penanda.push(new maplibregl.Marker({element: el, anchor: "bottom"}).setLngLat([lon, lat]).addTo(peta));
    }
  }
  let tunda = 0; const nanti2 = () => { clearTimeout(tunda); tunda = setTimeout(gambarPeta, 120); };
  async function pasangPeta() {
    /* peta.loaded() bisa false lama selama ubin satelit dimuat; penanda HTML cukup butuh petanya ada */
    for (let i = 0; i < 400 && !(typeof peta !== "undefined" && peta?.getCanvas && peta.getSource?.("kluster")); i++) await new Promise(r => setTimeout(r, 200));
    if (typeof peta === "undefined" || !peta || P.pasang) return; P.pasang = true;
    await muat(); peta.on("moveend", nanti2); gambarPeta();
    const i = document.querySelector('#lapis input[data-l="foto"]'); if (i) i.checked = P.nyala;
  }
  function lapis(on) { P.nyala = on; tulisL("fl-lapis", on ? "1" : "0"); gambarPeta(); }

  /* ------------------------------------------------------------ rincian: media, suka, komentar, bagikan, aduan */
  const Rinci = {
    async buka(id) {
      let d = document.querySelector("#flRinci");
      if (!d) { d = document.createElement("dialog"); d.id = "flRinci"; d.className = "dlg fl-dlg"; d.setAttribute("aria-label", "Rincian foto lapangan"); document.body.appendChild(d);
        d.addEventListener("close", () => { d.querySelector("video")?.pause(); if (/^\/f\//.test(location.pathname)) history.replaceState(null, "", this.asal || "/foto"); });
        d.addEventListener("click", e => this.klik(e, d)); d.addEventListener("submit", e => this.kirimKomentar(e, d)); }
      if (!/^\/f\//.test(location.pathname)) this.asal = location.pathname + location.search;
      history.replaceState(null, "", "/f/" + id);
      d.innerHTML = `<div class="fl-r-isi"><div class="fl-skel tinggi"></div></div>`; if (!d.open) d.showModal();
      const r = await fetch(`${API}/${id}`, {credentials: "same-origin"});
      if (!r.ok) { d.innerHTML = `<div class="fl-r-isi"><button class="fl-x" data-tutup aria-label="Tutup">×</button><div class="fl-kosong"><b>Foto tidak ditemukan</b><p>Mungkin sudah dihapus atau belum disetujui.</p></div></div>`; return; }
      const f = await r.json(); this.f = f; d.innerHTML = this.html(f);
    },
    html(f) {
      const [k, w] = KAT[f.kategori] || KAT.lainnya, v = f.terverifikasi || {};
      const lencana = [[true, `${IK.pin}Lokasi dari GPS perangkat`], [v.kamera, `${IK.kamera}Diambil langsung dari kamera`], [v.waktu, `${IK.cek}Waktu pengambilan tercatat`], [v.gps, `${IK.cek}GPS foto cocok dengan lokasi`]].filter(x => x[0]);
      return `<div class="fl-r" style="--k:${w}">
        <div class="fl-r-media">${f.jenis === "video" ? `<video controls playsinline preload="metadata" poster="${API}/thumb/${f.id}" src="${API}/media/${f.id}"></video>` : `<img alt="${esc(f.keterangan || k)}" src="${API}/media/${f.id}">`}
          <button class="fl-x" data-tutup aria-label="Tutup">×</button></div>
        <div class="fl-r-isi">
          <div class="fl-r-atas"><span class="fl-pil">${k}</span><span class="fl-no2">${D.no.get(f.id) || ""}</span>${f.contoh ? '<span class="fl-pil abu">data contoh</span>' : ""}</div>
          ${f.keterangan ? `<p class="fl-ket">${esc(f.keterangan)}</p>` : ""}
          <dl class="fl-info"><div><dt>Lokasi</dt><dd>Kec. ${esc(f.kec)}, ${esc(f.kab)}, ${esc(namaProv(f.prov))}</dd></div>
            <div><dt>Diambil</dt><dd>${jamWIB(f.diambil)} <small>(${lalu(f.diambil)})</small></dd></div>
            <div><dt>Kredit</dt><dd>${f.kredit ? esc(f.kredit) : "Warga (anonim)"}</dd></div></dl>
          <ul class="fl-lencana">${lencana.map(x => `<li>${x[1]}</li>`).join("")}</ul>
          <div class="fl-aksi"><button data-suka aria-pressed="${!!f.suka_saya}">${IK.hati}<span>${fmt(f.suka)}</span></button>
            <button data-fokus-kom>${IK.kom}<span>${fmt(f.komentar)}</span></button>
            <button data-bagi>${IK.bagi}Bagikan</button><button data-peta>${IK.pin}Peta</button></div>
          <div class="fl-bagi" hidden>${[["wa", "WhatsApp"], ["x", "X"], ["fb", "Facebook"], ["tg", "Telegram"], ["salin", "Salin tautan"]].map(([k2, n]) => `<button data-ke="${k2}">${n}</button>`).join("")}</div>
          <section class="fl-kom"><h4>Komentar</h4>
            <form class="fl-kom-form"><input name="nama" maxlength="60" placeholder="Nama (opsional)" autocomplete="name"><textarea name="teks" maxlength="280" rows="2" required placeholder="Tulis komentar…"></textarea><button class="fl-pri kecil">Kirim</button></form>
            <ul class="fl-kom-daftar">${f.komentar_daftar.map(this.komentar).join("") || '<li class="fl-redup">Belum ada komentar.</li>'}</ul></section>
          <button class="fl-adu" data-adu>Laporkan foto ini</button></div></div>`;
    },
    komentar: c => `<li><b>${esc(c.nama || "Warga")}</b><span>${lalu(c.dibuat)}</span><p>${esc(c.teks)}</p><button class="fl-adu" data-adu-k="${c.id}">Laporkan</button></li>`,
    async klik(e, d) {
      const f = this.f, b = e.target;
      if (b === d || b.closest("[data-tutup]")) return d.close();
      if (!f) return;
      if (b.closest("[data-suka]")) { const t = b.closest("[data-suka]"); t.disabled = true;
        const r = await fetch(`${API}/suka/${f.id}`, {method: "POST"}); t.disabled = false;
        if (!r.ok) return toast((await r.json().catch(() => ({}))).galat || "Gagal menyukai");
        const j = await r.json(); t.setAttribute("aria-pressed", j.suka_saya); t.querySelector("span").textContent = fmt(j.suka);
        const x = D.foto.find(y => y.id === f.id); if (x) x.suka = j.suka; return; }
      if (b.closest("[data-fokus-kom]")) return d.querySelector(".fl-kom textarea").focus();
      if (b.closest("[data-bagi]")) { const url = location.origin + "/f/" + f.id, judul = `${KAT[f.kategori][0]} di ${f.kec}, ${f.kab}`;
        if (navigator.share && matchMedia("(pointer:coarse)").matches) return navigator.share({title: judul, text: f.keterangan || judul, url}).catch(() => {});
        d.querySelector(".fl-bagi").hidden = !d.querySelector(".fl-bagi").hidden; return; }
      const ke = b.closest("[data-ke]")?.dataset.ke;
      if (ke) { const url = location.origin + "/f/" + f.id, teks = `${KAT[f.kategori][0]} di ${f.kec}, ${f.kab}: ${f.keterangan || "foto lapangan"}`, u = encodeURIComponent;
        if (ke === "salin") return navigator.clipboard?.writeText(url).then(() => toast("Tautan foto disalin"));
        open({wa: `https://wa.me/?text=${u(teks + " " + url)}`, x: `https://x.com/intent/post?text=${u(teks)}&url=${u(url)}`, fb: `https://www.facebook.com/sharer/sharer.php?u=${u(url)}`,
          tg: `https://t.me/share/url?url=${u(url)}&text=${u(teks)}`}[ke], "_blank", "noopener"); return; }
      if (b.closest("[data-peta]")) { d.close(); bukaTab("peta"); P.nyala || lapis(true); setTimeout(() => peta.flyTo({center: [f.lon, f.lat], zoom: 13}), 300); return; }
      const adu = b.closest("[data-adu],[data-adu-k]");
      if (adu) { const alasan = await pilihAlasan(); if (!alasan) return;
        const kid = adu.dataset.aduK, r = await fetch(`${API}/aduan/${kid || f.id}`, {method: "POST", headers: {"content-type": "application/json"}, body: JSON.stringify({jenis: kid ? "komentar" : "foto", alasan})});
        toast(r.ok ? "Terima kasih, laporan diterima admin" : (await r.json().catch(() => ({}))).galat || "Gagal melapor"); adu.disabled = true; }
    },
    async kirimKomentar(e, d) {
      e.preventDefault(); const fm = e.target, btn = fm.querySelector("button"); btn.disabled = true;
      const r = await fetch(`${API}/komentar/${this.f.id}`, {method: "POST", headers: {"content-type": "application/json"}, body: JSON.stringify({nama: fm.nama.value, teks: fm.teks.value})});
      btn.disabled = false; const j = await r.json().catch(() => ({}));
      if (!r.ok) return toast(j.galat || "Komentar gagal dikirim");
      fm.teks.value = ""; const ul = d.querySelector(".fl-kom-daftar"); ul.querySelector(".fl-redup")?.remove(); ul.insertAdjacentHTML("afterbegin", this.komentar(j));
      const n = d.querySelector("[data-fokus-kom] span"); n.textContent = fmt(+n.textContent.replace(/\D/g, "") + 1);
    },
  };
  function pilihAlasan() {
    return new Promise(ok => { const d = document.createElement("dialog"); d.className = "dlg fl-alasan";
      d.innerHTML = `<form method="dialog"><h3>Kenapa dilaporkan?</h3>${[["tidak_relevan", "Tidak relevan / bukan kejadian"], ["palsu", "Palsu atau bukan di lokasi ini"], ["kasar", "Kasar atau tidak pantas"], ["pribadi", "Memuat data pribadi / wajah"], ["lainnya", "Lainnya"]]
        .map(([k, n]) => `<button value="${k}">${n}</button>`).join("")}<button value="" class="batal">Batal</button></form>`;
      document.body.appendChild(d); d.addEventListener("close", () => { ok(d.returnValue); d.remove(); }); d.showModal(); });
  }

  /* ------------------------------------------------------------ kirim: kamera/galeri -> EXIF -> kompres -> GPS -> unggah */
  /* EXIF JPEG: DateTimeOriginal (+ OffsetTimeOriginal) dan GPS. null bila tidak ada (iOS sering membuang GPS saat unggah). */
  function bacaExif(buf) {
    const v = new DataView(buf); if (v.getUint16(0) !== 0xffd8) return null;
    let o = 2;
    while (o < v.byteLength - 4) { const m = v.getUint16(o), n = v.getUint16(o + 2);
      if (m === 0xffe1 && v.getUint32(o + 4) === 0x45786966) { const t = o + 10, le = v.getUint16(t) === 0x4949;
        const u16 = p => v.getUint16(t + p, le), u32 = p => v.getUint32(t + p, le), ifd = p => { const out = {}, k = u16(p); for (let i = 0; i < k; i++) { const e = p + 2 + i * 12; out[u16(e)] = {tipe: u16(e + 2), n: u32(e + 4), nilai: e + 8}; } return out; };
        const str = e => { const p = e.n > 4 ? u32(e.nilai) : e.nilai; let s = ""; for (let i = 0; i < e.n - 1; i++) s += String.fromCharCode(v.getUint8(t + p + i)); return s; };
        const rat = e => { const p = u32(e.nilai); return [0, 1, 2].map(i => u32(p + i * 8) / (u32(p + i * 8 + 4) || 1)); };
        const ifd0 = ifd(u32(4)), hasil = {};
        if (ifd0[0x8769]) { const ex = ifd(u32(ifd0[0x8769].nilai)), dt = ex[0x9003] && str(ex[0x9003]), off = ex[0x9011] && str(ex[0x9011]);
          const m2 = dt && dt.match(/^(\d{4}):(\d\d):(\d\d) (\d\d):(\d\d):(\d\d)/);
          if (m2) { const lok = `${m2[1]}-${m2[2]}-${m2[3]}T${m2[4]}:${m2[5]}:${m2[6]}`, w = Date.parse(lok + (off && /^[+-]\d\d:\d\d$/.test(off) ? off : "")); if (Number.isFinite(w)) hasil.waktu = w; } }
        if (ifd0[0x8825]) { const g = ifd(u32(ifd0[0x8825].nilai));
          if (g[2] && g[4]) { const dms = a => a[0] + a[1] / 60 + a[2] / 3600, la = dms(rat(g[2])), lo = dms(rat(g[4]));
            const sLa = g[1] ? String.fromCharCode(v.getUint8(g[1].nilai + t)) : "N", sLo = g[3] ? String.fromCharCode(v.getUint8(g[3].nilai + t)) : "E";
            if (la || lo) { hasil.lat = sLa === "S" ? -la : la; hasil.lon = sLo === "W" ? -lo : lo; } } }
        return hasil; }
      if (m === 0xffda) break; o += 2 + n; }
    return null;
  }
  const keBlob = (c, tipe, q) => new Promise(r => c.toBlob(r, tipe, q));
  async function kompres(src, sisi, q) {   // WebP bila peramban bisa, selain itu JPEG
    const s = Math.min(1, sisi / Math.max(src.width, src.height)), c = document.createElement("canvas");
    c.width = Math.round(src.width * s); c.height = Math.round(src.height * s); c.getContext("2d").drawImage(src, 0, 0, c.width, c.height);
    const w = await keBlob(c, "image/webp", q); return w?.type === "image/webp" ? w : keBlob(c, "image/jpeg", q);
  }
  function bingkaiVideo(file) {
    return new Promise((ok, no) => { const v = document.createElement("video"), u = URL.createObjectURL(file); v.muted = true; v.playsInline = true; v.preload = "auto"; v.src = u;
      v.onloadedmetadata = () => { v.currentTime = Math.min(.8, (v.duration || 1) / 2); };
      v.onseeked = () => { ok({bingkai: v, durasi: v.duration, lepas: () => URL.revokeObjectURL(u)}); };
      v.onerror = () => { URL.revokeObjectURL(u); no(new Error("Video tidak bisa dibaca peramban ini")); }; });
  }
  function ambilGPS() {
    return new Promise((ok, no) => {
      if (!navigator.geolocation) return no(new Error("Peramban ini tidak bisa membaca lokasi"));
      navigator.geolocation.getCurrentPosition(p => ok({lat: p.coords.latitude, lon: p.coords.longitude, akurasi: p.coords.accuracy, waktu: Date.now()}),
        e => no(new Error(e.code === 1 ? "Izin lokasi ditolak. Foto lapangan hanya bisa dikirim dari lokasimu, jadi izinkan akses lokasi lalu coba lagi." : "Lokasi belum terbaca. Coba di tempat terbuka.")),
        {enableHighAccuracy: true, timeout: 20000, maximumAge: 0});
    });
  }

  const Kirim = {
    async buka() {
      const k = await konfig(); this.k = k;
      let d = document.querySelector("#flKirim");
      if (!d) { d = document.createElement("dialog"); d.id = "flKirim"; d.className = "fl-sheet"; d.setAttribute("aria-labelledby", "flKJudul"); document.body.appendChild(d);
        d.addEventListener("click", e => this.klik(e, d)); d.addEventListener("change", e => this.ubah(e, d)); d.addEventListener("submit", e => this.kirim(e, d)); d.addEventListener("close", () => this.reset()); }
      this.d = d; this.reset();
      d.innerHTML = `<div class="fl-pegang"></div><header><h2 id="flKJudul">Kirim foto lapangan</h2><button type="button" class="fl-x" data-tutup aria-label="Tutup">×</button></header>
        ${k.media === false ? `<div class="fl-kosong"><b>Unggah foto belum dibuka</b><p>Penyimpanan foto sedang disiapkan. Coba lagi nanti.</p></div>` : `<form novalidate>
        <div class="fl-bidik" data-bidik><span class="fl-sudut"></span><div class="fl-bidik-kosong">${IK.kamera}<b>Ambil foto atau video</b><small>Video maks ${k.batas?.durasi || 60} detik · ${(k.batas?.video || 31457280) / 1048576} MB</small>
          <div class="fl-dua"><label class="fl-pri">Kamera<input type="file" name="kamera" accept="image/*,video/*" capture="environment" hidden></label><label class="fl-sek">Galeri<input type="file" name="galeri" accept="image/jpeg,image/png,image/webp,image/heic,video/mp4,video/quicktime,video/webm" hidden></label></div></div></div>
        <div class="fl-panel"><div><span>Lokasi</span><b data-lok>Membaca GPS…</b></div><div><span>Waktu</span><b data-wkt>–</b></div><div><span>Berkas</span><b data-uk>–</b></div></div>
        <fieldset class="fl-kat"><legend>Kategori</legend>${Object.entries(KAT).map(([kk, [n, w]], i) => `<label style="--k:${w}"><input type="radio" name="kategori" value="${kk}" ${i ? "" : "checked"}>${n}</label>`).join("")}</fieldset>
        <label class="fl-f">Keterangan <small>(opsional)</small><textarea name="keterangan" maxlength="280" rows="2" placeholder="Apa yang terlihat? Mis. api di lahan gambut, asap tebal sejak pagi"></textarea></label>
        <div class="fl-dua2"><label class="fl-f">Nama <small>(opsional)</small><input name="nama" maxlength="60" autocomplete="name"></label>
          <label class="fl-f">Email <small>(opsional, tidak ditampilkan)</small><input name="email" type="email" maxlength="254" autocomplete="email"></label></div>
        <label class="fl-tog"><input type="checkbox" name="tampil_nama" value="1"><span><b>Tampilkan nama saya sebagai kredit</b><small>Bila tidak dicentang, foto tampil sebagai "Warga (anonim)".</small></span></label>
        <label class="fl-tog"><input type="checkbox" name="setuju" value="1" required><span><b>Saya mengambil foto/video ini sendiri di lokasi ini</b><small>Tidak memuat wajah orang dengan jelas atau data pribadi. Boleh ditampilkan publik setelah diperiksa admin.</small></span></label>
        <div data-ts></div><p class="fl-galat" role="alert" hidden></p><div class="fl-prog" hidden><i></i></div>
        <button class="fl-pri besar" disabled>Kirim</button></form>`}`;
      if (!d.open) d.showModal();
      if (k.media !== false) { this.gps().catch(() => {}); this.turnstile(d); }
    },
    reset() { this.berkas = null; this.exif = null; this.kamera = false; this.loc = null; this.prev && URL.revokeObjectURL(this.prev); this.prev = null; },
    galat(t) { const p = this.d.querySelector(".fl-galat"); if (!p) return; p.hidden = !t; p.textContent = t || ""; },
    async gps() {
      const el = this.d.querySelector("[data-lok]");
      try { this.loc = await ambilGPS(); el.textContent = `±${Math.round(this.loc.akurasi)} m · ${this.loc.lat.toFixed(4)}, ${this.loc.lon.toFixed(4)}`;
        if (this.loc.akurasi > (this.k.batas?.akurasi || 1000)) { el.textContent += " (terlalu lemah)"; this.galat("Sinyal GPS lemah. Pindah ke tempat terbuka lalu ketuk Lokasi untuk mencoba lagi."); } else this.galat(""); }
      catch (e) { el.textContent = "Ketuk untuk coba lagi"; this.galat(e.message); }
      this.siap();
    },
    siap() { const b = this.d.querySelector("button.besar"); if (b) b.disabled = !(this.berkas && this.loc && this.loc.akurasi <= (this.k.batas?.akurasi || 1000)); },
    async ubah(e, d) {
      const inp = e.target; if (inp.type !== "file" || !inp.files[0]) return;
      const f = inp.files[0], video = f.type.startsWith("video/"); this.kamera = inp.name === "kamera"; this.galat("");
      const b = this.k.batas || {}, bidik = d.querySelector("[data-bidik]");
      try {
        if (video) {
          if (f.size > (b.video || 31457280)) throw new Error(`Video ${(f.size / 1048576).toFixed(1)} MB, maksimal ${(b.video || 31457280) / 1048576} MB`);
          const v = await bingkaiVideo(f);
          if (v.durasi > (b.durasi || 60) + .5) { v.lepas(); throw new Error(`Video ${Math.round(v.durasi)} detik, maksimal ${b.durasi || 60} detik. Potong dulu videonya.`); }
          this.berkas = {media: f, thumb: await kompres(v.bingkai, 480, .72), durasi: v.durasi, jenis: "video"}; v.lepas(); this.exif = null;
        } else {
          this.exif = /jpe?g$/i.test(f.type) ? bacaExif(await f.slice(0, 256 * 1024).arrayBuffer()) : null;
          if (this.exif?.waktu && Date.now() - this.exif.waktu > 48 * JAM) throw new Error(`Foto ini diambil ${Math.round((Date.now() - this.exif.waktu) / 864e5)} hari lalu. Hanya foto 48 jam terakhir.`);
          const bmp = await createImageBitmap(f).catch(() => { throw new Error("Format foto tidak terbaca. Pakai JPEG/PNG, atau ambil langsung dari kamera."); });
          this.berkas = {media: await kompres(bmp, 1600, .8), thumb: await kompres(bmp, 480, .72), jenis: "foto"}; bmp.close?.();
        }
      } catch (er) { this.berkas = null; this.galat(er.message); this.siap(); inp.value = ""; return; }
      this.prev && URL.revokeObjectURL(this.prev); this.prev = URL.createObjectURL(video ? f : this.berkas.media);
      bidik.classList.add("ada"); bidik.querySelector(".fl-pratinjau")?.remove();
      bidik.insertAdjacentHTML("beforeend", `<div class="fl-pratinjau">${video ? `<video src="${this.prev}" muted playsinline controls></video>` : `<img alt="Pratinjau" src="${this.prev}">`}<button type="button" class="fl-ganti" data-ganti>Ganti</button></div>`);
      d.querySelector("[data-wkt]").textContent = this.exif?.waktu ? jamWIB(this.exif.waktu) : "Saat dikirim";
      const asli = f.size, jadi = this.berkas.media.size;
      d.querySelector("[data-uk]").textContent = video ? `Video ${durasi(this.berkas.durasi)} · ${(jadi / 1048576).toFixed(1)} MB` : `${Math.round(jadi / 1024)} KB${asli > jadi * 1.2 ? ` (dari ${(asli / 1048576).toFixed(1)} MB)` : ""}`;
      this.siap();
    },
    klik(e, d) {
      if (e.target === d || e.target.closest("[data-tutup]")) return d.close();
      if (e.target.closest("[data-ganti]")) { const p = d.querySelector(".fl-pratinjau"); p?.remove(); d.querySelector("[data-bidik]").classList.remove("ada"); this.berkas = null; this.siap(); return; }
      if (e.target.closest("[data-lok]")) { d.querySelector("[data-lok]").textContent = "Membaca GPS…"; this.gps(); }
    },
    turnstile(d) {
      const kunci = this.k.turnstile; if (!kunci) return;
      const pasang = () => { this.tsId = window.turnstile.render(d.querySelector("[data-ts]"), {sitekey: kunci, size: "flexible"}); };
      if (window.turnstile) return pasang();
      const s = document.createElement("script"); s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"; s.async = true; s.onload = pasang; document.head.appendChild(s);
    },
    async kirim(e, d) {
      e.preventDefault(); const fm = e.target;
      if (!fm.setuju.checked) return this.galat("Centang pernyataan bahwa foto ini kamu ambil sendiri di lokasi ini.");
      if (!this.berkas) return this.galat("Pilih foto atau video dulu.");
      try { if (!this.loc || Date.now() - this.loc.waktu > 5 * 60e3) this.loc = await ambilGPS(); } catch (er) { return this.galat(er.message); }
      const x = new FormData(), set = (k, v) => v != null && v !== "" && x.append(k, v);
      set("kategori", fm.kategori.value); set("keterangan", fm.keterangan.value); set("nama", fm.nama.value); set("email", fm.email.value);
      set("tampil_nama", fm.tampil_nama.checked ? "1" : "0"); set("setuju", "1"); set("kamera", this.kamera ? "1" : "0");
      set("lat", this.loc.lat); set("lon", this.loc.lon); set("akurasi", this.loc.akurasi); set("waktu_gps", this.loc.waktu);
      if (this.exif?.waktu) set("exif_waktu", this.exif.waktu);
      if (this.exif?.lat != null) { set("exif_lat", this.exif.lat); set("exif_lon", this.exif.lon); }
      if (this.berkas.durasi) set("durasi", this.berkas.durasi);
      if (this.tsId != null) set("turnstile", window.turnstile.getResponse(this.tsId));
      x.append("media", this.berkas.media, this.berkas.jenis === "video" ? "video" : "foto"); x.append("thumb", this.berkas.thumb, "thumb");
      const btn = fm.querySelector("button.besar"), prog = d.querySelector(".fl-prog"); btn.disabled = true; btn.textContent = "Mengirim…"; prog.hidden = false; this.galat("");
      const r = await new Promise(ok => { const q = new XMLHttpRequest(); q.open("POST", API); q.upload.onprogress = ev => { if (ev.lengthComputable) prog.firstChild.style.width = (ev.loaded / ev.total * 100) + "%"; };
        q.onload = () => { let j = {}; try { j = JSON.parse(q.responseText); } catch (er) {} ok({s: q.status, j}); }; q.onerror = () => ok({s: 0, j: {galat: "Koneksi terputus. Coba lagi."}}); q.send(x); });
      prog.hidden = true; btn.textContent = "Kirim";
      if (r.s !== 201) { btn.disabled = false; if (this.tsId != null) window.turnstile.reset(this.tsId); return this.galat(r.j.galat || `Gagal mengirim (${r.s})`); }
      d.innerHTML = `<div class="fl-pegang"></div><div class="fl-selesai">${IK.cek}<h2>Terkirim, terima kasih!</h2><p>Foto dari <b>Kec. ${esc(r.j.wilayah.kec)}, ${esc(r.j.wilayah.kab)}</b> sedang diperiksa admin. Setelah disetujui, foto tampil di peta dan galeri.</p>
        <button class="fl-pri besar" data-tutup>Selesai</button></div>`;
    },
  };

  /* ------------------------------------------------------------ pasang */
  window.Foto = {render, lapis, buka: id => Rinci.buka(id), kirim: () => Kirim.buka()};
  /* fitur yang belum bisa dipakai disembunyikan, bukan dinonaktifkan: tanpa R2 (MEDIA) tab & lapisan tidak tampil */
  konfig().then(k => { if (k.media) return pasangPeta();
    document.querySelector('#tabs button[data-t="foto"]')?.setAttribute("hidden", "");
    document.querySelector('#lapis input[data-l="foto"]')?.closest("label")?.setAttribute("hidden", ""); });
  const fid = location.pathname.match(/^\/f\/([0-9a-f]{16})\/?$/)?.[1];
  if (fid) muat().then(() => Rinci.buka(fid));
})();
