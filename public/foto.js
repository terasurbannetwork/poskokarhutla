/* foto.js — Foto & video lapangan warga: kirim dari lokasi (GPS perangkat), galeri per wilayah (tab "Foto Lapangan"),
   kartu thumbnail di peta (dikelompokkan provinsi / kab-kota / kecamatan mengikuti zoom), rincian dengan suka, komentar, bagikan.
   API: /api/foto* (src/foto.js). Skrip klasik dimuat SETELAH skrip utama index.html. Global: S, peta, $, esc, fmt, namaProv,
   jamWIB, bukaTab, toast. Tidak ada angka karangan: semua dari /api/foto. Foto antrean (belum disetujui admin) tidak pernah tampil. */
(() => {
  const API = "/api/foto", JAM = 36e5, BEN = window.FOTO_BENCANA || "karhutla";   // halaman bencana lain (mis. /banjir/foto.js) menyetel window.FOTO_BENCANA sebelum memuat berkas ini; tanpa itu = karhutla
  let NAMA_BEN = BEN;
  const KAT_AWAL = {karhutla: {api: ["Api", "#d9603b"], asap: ["Asap", "#6b7489"], padam: ["Pemadaman", "#2f7fb8"], dampak: ["Dampak", "#c49a1c"], lainnya: ["Lainnya", "#3d9461"]},
    banjir: {genangan: ["Genangan", "#3f7fb8"], arus: ["Arus", "#2b8c86"], longsor: ["Longsor", "#9a7448"], rob: ["Rob", "#5f6fb0"], evakuasi: ["Evakuasi", "#e58a45"], lainnya: ["Lainnya", "#3d9461"]},
    gunungapi: {hujan_abu: ["Hujan abu", "#7d8795"], lahar: ["Lahar", "#9a7448"], pengungsian: ["Pengungsian", "#e58a45"], lainnya: ["Lainnya", "#3d9461"]},
    kekeringan: {sumur: ["Sumur kering", "#c9a24b"], sawah: ["Sawah puso", "#8a6d4e"], antre: ["Antre air", "#4f8fc4"], lainnya: ["Lainnya", "#3d9461"]},
    gempa: {guncangan: ["Kerusakan bangunan", "#c9503a"], retakan: ["Retakan tanah", "#9a7448"], pengungsian: ["Pengungsian", "#e58a45"], tsunami: ["Genangan tsunami", "#3f7fb8"], lainnya: ["Lainnya", "#3d9461"]}};
  /* bencana tanpa entri di atas: kategori dari registry (diisi saat bencana.json termuat), warna dari palet ini; ikon jatuh ke "lainnya" */
  const PALET = ["#c9503a", "#3f7fb8", "#e58a45", "#9a7448", "#2b8c86", "#5f6fb0"];
  const KAT = KAT_AWAL[BEN] || (BEN === "karhutla" ? KAT_AWAL.karhutla : {lainnya: ["Lainnya", "#3d9461"]});
  const CONTOH_KET = {karhutla: "Apa yang terlihat? Mis. api di lahan gambut, asap tebal sejak pagi", banjir: "Apa yang terlihat? Mis. air setinggi lutut di jalan utama, arus deras di sungai", gempa: "Apa yang terlihat? Mis. dinding retak, atap runtuh, warga mengungsi", gunungapi: "Apa yang terlihat? Mis. hujan abu tebal di atap, aliran lahar di sungai", kekeringan: "Apa yang terlihat? Mis. sumur warga kering, sawah retak, antre air bersih", cuaca: "Apa yang terlihat? Mis. pohon tumbang menutup jalan, atap rumah terbang", udara: "Apa yang terlihat? Mis. kabut asap tebal, jarak pandang kurang dari 100 meter"};
  /* nama bencana dan nama kategori dari registry (public/bencana.json: nama, foto_kategori); warna dan ikon tetap milik galeri ini. Gagal dimuat = nilai di atas. */
  fetch("/bencana.json").then(r => r.ok ? r.json() : null).catch(() => null).then(j => { const b = j?.bencana?.find(x => x.id === BEN); if (!b) return;
    NAMA_BEN = b.nama.toLowerCase(); let i = 0; for (const [k, n] of b.foto_kategori || []) if (KAT[k]) KAT[k][0] = n; else KAT[k] = [n, PALET[i++ % PALET.length]]; });
  const TINGKAT = [["prov", "Provinsi"], ["kab", "Kab/Kota"], ["kec", "Kecamatan"]];
  const bacaL = (k, d) => { try { return localStorage.getItem(k) ?? d; } catch (e) { return d; } };
  const tulisL = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };
  const admin = bacaL("pb_admin", "") === "1";   // dipasang /admin/foto: admin melihat data dummy di halaman publik
  const lalu = t => { const m = Math.max(0, (Date.now() - t) / 6e4); return m < 1 ? "baru saja" : m < 60 ? `${Math.floor(m)} mnt lalu` : m < 1440 ? `${Math.floor(m / 60)} jam lalu` : `${Math.floor(m / 1440)} hari lalu`; };
  const durasi = d => d ? `${Math.floor(d / 60)}:${String(Math.round(d % 60)).padStart(2, "0")}` : "";
  const namaWil = (f, t) => t === "prov" ? namaProv(f.prov) : t === "kab" ? f.kab : `Kec. ${f.kec}`;
  const kunciWil = (f, t) => t === "prov" ? f.prov : t === "kab" ? `${f.prov}|${f.kab}` : `${f.prov}|${f.kab}|${f.kec}`;
  /* koordinat & cap lokasi ala kamera bergeotag (pemilik, 15 Okt 2026) */
  const koord = l => `${Math.abs(l.lat).toFixed(5)}° ${l.lat < 0 ? "LS" : "LU"}, ${Math.abs(l.lon).toFixed(5)}° BT`;
  const cap = (wil, l, t) => `<div class="fl-cap"><span><b>${wil ? `Kec. ${esc(wil.kec)}` : "Lokasi"}</b>${wil ? `<small>${esc(wil.kab)}, ${esc(namaProv(wil.prov))}</small>` : ""}<small>${l ? koord(l) : ""}</small><small>${esc(t || "")}</small></span></div>`;
  /* ikon kategori (pemilik, 15 Okt 2026) */
  const IKAT = {api: '<path d="M12 3c1 3 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3.5 2-4.5 0 2 1 3 2 3-1-3 0-6 1-8.5z"/>', asap: '<path d="M4 14h11a3 3 0 1 0-3-3M3 18h14a3 3 0 1 1-3 3M6 10h4"/>',
    padam: '<path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z"/>', dampak: '<path d="M12 4 2.5 20h19z"/><path d="M12 10v4.5M12 17.5v.01"/>', guncangan: '<path d="M4 20V9l5-4 5 4v11M14 12h6v8M7 20v-5h4v5M9 3l1 3-2 2"/>', retakan: '<path d="M3 8h6l2 3-2 3 3 3-1 4M15 3l-1 4 3 2-2 3h6"/>',
    pengungsian: '<path d="M3 20 12 5l9 15zM12 20v-6l-3 6M12 14l3 6"/>', tsunami: '<path d="M2 16c2 0 2-1.5 4-1.5S8 16 10 16s2-1.5 4-1.5S16 16 18 16s2-1.5 4-1.5M2 20c2 0 2-1.5 4-1.5S8 20 10 20s2-1.5 4-1.5S16 20 18 20s2-1.5 4-1.5M4 12c3-1 5-4 6-8 3 2 5 5 5 8"/>',
    lainnya: '<circle cx="6" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="18" cy="12" r="1.3"/>',
    genangan: '<path d="M2 16c2 0 2-1.5 4-1.5S8 16 10 16s2-1.5 4-1.5S16 16 18 16s2-1.5 4-1.5M2 20c2 0 2-1.5 4-1.5S8 20 10 20s2-1.5 4-1.5S16 20 18 20s2-1.5 4-1.5M12 3c2 3 4 5 4 8a4 4 0 0 1-8 0c0-3 2-5 4-8z"/>',
    arus: '<path d="M3 8h11a3 3 0 1 0-3-3M3 13h15a3 3 0 1 1-3 3M3 18h7"/>', longsor: '<path d="M3 20 9 8l4 6 3-4 5 10zM14 4l2 2"/>',
    rob: '<path d="M2 15c2 0 2-1.5 4-1.5S8 15 10 15s2-1.5 4-1.5S16 15 18 15s2-1.5 4-1.5M2 19c2 0 2-1.5 4-1.5S8 19 10 19s2-1.5 4-1.5S16 19 18 19M12 3v6M9 6l3-3 3 3"/>', evakuasi: '<circle cx="12" cy="5" r="2"/><path d="M12 8v6l-3 5M12 14l3 5M8 11h8"/>'};
  const ikat = k => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${IKAT[k] || IKAT.lainnya}</svg>`;
  const MAKS_N = 5, PENGIRIM = "fl-pengirim";   /* 5 = batas unggah per jam di server; data pengirim diingat di perangkat ini */
  const IK = {
    orang: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="3.5"/><path d="M5 20c0-3.9 3.1-7 7-7s7 3.1 7 7"/></svg>',
    galeri: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="16" height="14" rx="2.5"/><circle cx="8.5" cy="10" r="1.6"/><path d="m3 17 4.5-4.5 4 4 3-3 4.5 4.5"/><path d="M7 3h12.5A1.5 1.5 0 0 1 21 4.5V15"/></svg>',
    kamera: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg>',
    naik: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M12 4 4 13h5v7h6v-7h5z"/></svg>',
    bendera: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 21V4h11l-1.5 4L16 12H5"/></svg>',
    kom: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M4 5h16v11H9l-5 4z"/></svg>',
    bagi: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="m8.2 10.8 7.6-4.6M8.2 13.2l7.6 4.6"/></svg>',
    pin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M12 21s-6.5-6-6.5-11a6.5 6.5 0 0 1 13 0C18.5 15 12 21 12 21z"/><circle cx="12" cy="10" r="2.2"/></svg>',
    video: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><rect x="3" y="6" width="13" height="12" rx="2.5"/><path d="m16 10.5 5-3v9l-5-3z"/></svg>',
    main: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>',
    titik: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/></svg>',
    jam: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
    cek: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 4.5 4.5L19 7"/></svg>',
  };

  /* ------------------------------------------------------------ data */
  const D = {foto: [], muat: null, konfig: null};
  async function muat(paksa) {
    if (D.muat && !paksa) return D.muat;
    return D.muat = fetch(`${API}?bencana=${BEN}` + (admin ? "&dummy=1" : ""), {credentials: "same-origin"}).then(r => r.ok ? r.json() : {foto: []}).then(j => {
      D.foto = j.foto || [];
      return D.foto;
    }).catch(() => (D.foto = []));
  }
  const konfig = () => D.konfig ||= fetch(API + "/konfig").then(r => r.json()).catch(() => ({media: false}));

  /* ------------------------------------------------------------ kartu (gaya kartu koleksi: bingkai putih, latar pastel per kategori) */
  const kartu = (f, kecil = false) => { const [k, w] = KAT[f.kategori] || KAT.lainnya;
    return `<button type="button" class="fl-kartu${kecil ? " kecil" : ""}" style="--k:${w}" data-fid="${f.id}" aria-label="${esc(`${k} di ${f.kec}, ${f.kab}`)}">
      <span class="fl-gbr"><img loading="lazy" decoding="async" alt="" src="${API}/thumb/${f.id}">${f.contoh ? '<span class="fl-contoh">contoh</span>' : ""}
        <i class="fl-ik" title="${k}">${f.jenis === "video" ? IK.main : ikat(f.kategori)}</i><span class="fl-ovl">${lalu(f.diambil)}</span></span></button>`; };

  /* ------------------------------------------------------------ tab galeri
     Galeri rata (bukan dikelompokkan wilayah): urutan Terbaru/Paling disukai/dikomentari/dilihat, saring provinsi (banyak),
     kategori & jenis (klik lagi = semua), lalu Galeri atau Peta (pemilik, 15 Okt 2026) */
  const URUT = [["baru", "Terbaru", "jam"], ["suka", "Paling banyak dukungan", "naik"], ["komentar", "Paling dikomentari", "kom"], ["dilihat", "Paling dilihat", "mata"]];
  const G = {urut: bacaL("fl-urut", "baru"), prov: [], kat: "", jenis: "", h: 0}, PER_HAL = 24;
  const stat = (ik, n) => `<span>${ik}${fmt(n || 0)}</span>`;
  const IKS = {mata: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>'};
  const kartuG = f => { const [k, w] = KAT[f.kategori] || KAT.lainnya;
    return `<button type="button" class="fg-k" data-fid="${f.id}" aria-label="${esc(`${k} di ${f.kec}, ${f.kab}`)}"><span class="fg-g"><img loading="lazy" decoding="async" alt="" src="${API}/thumb/${f.id}" onerror="this.style.visibility='hidden'">
      ${f.jenis === "video" ? `<span class="fl-vid">${IK.main}${durasi(f.durasi)}</span>` : ""}${f.contoh ? '<span class="fl-contoh">contoh</span>' : ""}
      <span class="fg-kat" style="--k:${w}">${ikat(f.kategori)}${k}</span>
      <span class="fg-bawah"><span class="fg-t"><b>Kec. ${esc(f.kec)}</b><small>${esc(f.kab)} · ${esc(namaProv(f.prov))} · ${lalu(f.diambil || f.dibuat)}</small></span>
      <span class="fg-st">${stat(IK.naik, f.suka)}${stat(IK.kom, f.komentar)}${stat(IKS.mata, f.dilihat)}</span></span></span></button>`; };
  /* DUMMY.md: 🧪 mengisi foto dummy untuk bencana halaman ini (BEN), 🧹 menghapus SEMUA dummy; muat ulang penuh sesudahnya */
  async function dummy(btn) {
    const aksi = btn.dataset.dummy; if (aksi === "hapus" && !confirm("Hapus SEMUA foto, suka, dan komentar dummy? Data asli tidak tersentuh.")) return;
    btn.disabled = true;
    const r = await fetch(API + "/dummy", {method: "POST", credentials: "same-origin", headers: {"content-type": "application/json"}, body: JSON.stringify({aksi, bencana: BEN})});
    const j = await r.json().catch(() => ({}));
    alert(r.ok ? (aksi === "isi" ? `${j.foto} foto dummy ${NAMA_BEN} dibuat.` : `${j.foto} foto dan ${j.komentar} komentar dummy dihapus.`) : j.galat || "Gagal");
    location.reload();
  }
  async function render() {
    const el = $("#foto"); if (!el) return;
    if (!el.dataset.siap) {
      el.dataset.siap = 1;
      el.innerHTML = `<div class="fl-wrap"><div class="fg-panel"><div class="fg-atas"><div class="fl-seg" role="group" aria-label="Urutkan">${URUT.map(([k, n, i]) => `<button data-u="${k}" aria-pressed="${k === G.urut}">${IK[i] || IKS[i]}${n}</button>`).join("")}</div>${admin ? `<span class="fl-dummy"><button type="button" class="fl-sek" data-dummy="isi" title="Isi data dummy untuk halaman ini" aria-label="Isi data dummy">🧪</button><button type="button" class="fl-sek" data-dummy="hapus" title="Hapus semua data dummy" aria-label="Hapus data dummy">🧹</button></span>` : ""}</div>
        <div class="fg-saring"><div id="fgProv"></div><div class="fl-chip" role="group" aria-label="Kategori">${Object.entries(KAT).map(([k, [n, w]]) => `<button data-k="${k}" style="--k:${w}" aria-pressed="false">${ikat(k)}${n}</button>`).join("")}</div>
          <div class="fl-chip" role="group" aria-label="Jenis"><button data-j="foto" aria-pressed="false">${IK.kamera}Foto</button><button data-j="video" aria-pressed="false">${IK.video}Video</button></div></div></div>
        <button class="fl-pri fg-apung" data-kirim>${IK.kamera}Kirim foto</button>
        <div class="fg-panel fg-isi"><div id="flIsi" class="fl-isi"><div class="fl-skel"></div><div class="fl-skel"></div><div class="fl-skel"></div></div><div class="fg-pg" id="fgPg"></div></div></div>`;
      el.addEventListener("click", e => {
        const u = e.target.closest("[data-u]"); if (u) { G.urut = u.dataset.u; G.h = 0; tulisL("fl-urut", G.urut); el.querySelectorAll("[data-u]").forEach(b => b.setAttribute("aria-pressed", b === u)); return isiGaleri(); }
        const k = e.target.closest("[data-k]"); if (k) { G.kat = G.kat === k.dataset.k ? "" : k.dataset.k; G.h = 0; el.querySelectorAll("[data-k]").forEach(b => b.setAttribute("aria-pressed", b.dataset.k === G.kat)); return isiGaleri(); }
        const j = e.target.closest("[data-j]"); if (j) { G.jenis = G.jenis === j.dataset.j ? "" : j.dataset.j; G.h = 0; el.querySelectorAll("[data-j]").forEach(b => b.setAttribute("aria-pressed", b.dataset.j === G.jenis)); return isiGaleri(); }
        const m = e.target.closest("[data-m]"); if (m && m.dataset.m === "peta") return lihatPeta();
        const h = e.target.closest("[data-h]"); if (h && !h.disabled) { G.h = +h.dataset.h; isiGaleri(); return el.scrollIntoView({block: "start"}); }
        const dm = e.target.closest("[data-dummy]"); if (dm) return dummy(dm);   // 🧪/🧹 hanya dirender untuk admin; server tetap menolak non-admin (403)
        if (e.target.closest("[data-kirim]")) return Kirim.buka();
        const c = e.target.closest("[data-fid]"); if (c) return Rinci.buka(c.dataset.fid);
      });
      el.addEventListener("change", e => { const m = e.target.closest("input[data-fp]"); if (!m) return; const box = m.closest(".pm-menu");
        if (!m.value) box.querySelectorAll("input[value]:not([value=''])").forEach(x => x.checked = false); else box.querySelector("input[value='']").checked = false;
        G.prov = [...box.querySelectorAll("input:checked")].map(x => x.value).filter(Boolean); if (!G.prov.length) box.querySelector("input[value='']").checked = true;
        box.closest("details").querySelector("summary").textContent = !G.prov.length ? "Semua provinsi" : G.prov.length === 1 ? namaProv(G.prov[0]) : G.prov.length + " provinsi"; G.h = 0; isiGaleri(); });
    }
    await muat();
    const pv = [...new Set(D.foto.map(f => f.prov))].sort((a, b) => namaProv(a).localeCompare(namaProv(b)));
    $("#fgProv").innerHTML = pv.length > 1 ? `<details class="pmulti"><summary>Semua provinsi</summary><div class="pm-menu"><label><input type="checkbox" data-fp value="" checked><span>Semua provinsi (${pv.length})</span></label>${pv.map(k => `<label><input type="checkbox" data-fp value="${k}"><span>${esc(namaProv(k))}</span></label>`).join("")}</div></details>` : "";
    isiGaleri();
  }
  const tersaring = () => D.foto.filter(f => (!G.prov.length || G.prov.includes(f.prov)) && (!G.kat || f.kategori === G.kat) && (!G.jenis || f.jenis === G.jenis));
  function isiGaleri() {
    const isi = $("#flIsi"); if (!isi) return;
    if (!D.foto.length) { isi.innerHTML = `<button type="button" class="fl-ajak" data-kirim><span class="fl-bingkai"><span class="fl-lensa">${IK.kamera}</span></span>
      <b>Belum ada foto</b><small>Jadilah yang pertama mengirim foto dari lokasimu.</small><span class="fl-pri">${IK.kamera}Ambil foto</span></button>`; $("#fgPg").innerHTML = ""; return; }
    const kunci = {baru: f => f.diambil || f.dibuat, suka: f => f.suka || 0, komentar: f => f.komentar || 0, dilihat: f => f.dilihat || 0}[G.urut] || (f => f.dibuat);
    const xs = tersaring().sort((a, b) => kunci(b) - kunci(a) || b.dibuat - a.dibuat), nH = Math.max(1, Math.ceil(xs.length / PER_HAL)); G.h = Math.min(G.h, nH - 1);
    isi.innerHTML = xs.length ? `<div class="fg-grid">${xs.slice(G.h * PER_HAL, (G.h + 1) * PER_HAL).map(kartuG).join("")}</div>` : `<div class="fl-kosong">${G.jenis === "video" ? IK.video : IK.kamera}<b>Tidak ada ${G.jenis === "video" ? "video" : "foto"} untuk saringan ini</b><p>Coba provinsi, kategori, atau jenis lain.</p></div>`;
    const ke = (i, isi, lbl) => `<button data-h="${i}"${i < 0 || i >= nH ? " disabled" : ""} aria-label="${lbl}">${isi}</button>`;
    $("#fgPg").innerHTML = nH > 1 ? `<span class="fg-pg-info">${fmt(G.h * PER_HAL + 1)}–${fmt(Math.min((G.h + 1) * PER_HAL, xs.length))} dari ${fmt(xs.length)}</span>
      <nav class="fg-pg-nav" aria-label="Halaman">${ke(G.h - 1, "‹<span> Sebelumnya</span>", "Halaman sebelumnya")}${Array.from({length: nH}, (_, i) => `<button data-h="${i}" aria-pressed="${i === G.h}">${i + 1}</button>`).join("")}${ke(G.h + 1, "<span>Berikutnya </span>›", "Halaman berikutnya")}</nav>` : "";
  }
  /* tampilan Peta: pindah ke tab Peta dengan lapisan foto menyala, dibingkai ke foto hasil saringan */
  function lihatPeta() {
    const xs = tersaring(); P.nyala = true; const i = document.querySelector('#lapis input[data-l="foto"]'); if (i) i.checked = true;
    bukaTab("peta"); setTimeout(() => { if (typeof peta === "undefined" || !peta) return; gambarPeta();
      if (xs.length) { const lo = xs.map(f => f.lon), la = xs.map(f => f.lat); peta.fitBounds([[Math.min(...lo), Math.min(...la)], [Math.max(...lo), Math.max(...la)]], {padding: 90, maxZoom: 11}); } }, 400);
  }

  /* ------------------------------------------------------------ lapisan peta: kartu HTML, dikelompokkan menurut zoom */
  const P = {nyala: false,   /* tiap buka mulai mati, tidak diingat (pemilik, 15 Okt 2026) */ penanda: [], pasang: false};
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
        if (Math.max(...lo) - Math.min(...lo) < .002 && Math.max(...la) - Math.min(...la) < .002) { G.prov = [g[0].prov]; G.h = 0; return bukaTab("foto"); }
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
  function lapis(on) { P.nyala = on; gambarPeta(); }

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
      const [k, w] = KAT[f.kategori] || KAT.lainnya;
      return `<div class="fl-r" style="--k:${w}">
        <div class="fl-r-media"><div class="fl-mw">${f.jenis === "video" ? `<video controls playsinline preload="metadata" poster="${API}/thumb/${f.id}" src="${API}/media/${f.id}"></video>` : `<img alt="${esc(f.keterangan || k)}" src="${API}/media/${f.id}">`}${cap({kec: f.kec, kab: f.kab, prov: f.prov}, f.lat != null ? {lat: f.lat, lon: f.lon} : null, f.diambil ? jamWIB(f.diambil) : "")}</div>
          <div class="fl-r-atas"><span class="fl-pil">${ikat(f.kategori)}${k}</span>${f.contoh ? '<span class="fl-pil abu">data contoh</span>' : ""}</div>
          ${f.keterangan ? `<p class="fl-ket">${esc(f.keterangan)}</p>` : ""}</div>
        <button class="fl-x" data-tutup aria-label="Tutup"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg></button>
        <div class="fl-r-isi">
          <dl class="fl-info"><div><dt>${IK.pin}Lokasi</dt><dd>Kec. ${esc(f.kec)}, ${esc(f.kab)}, ${esc(namaProv(f.prov))}</dd></div>
            ${f.lat != null ? `<div><dt>${IK.titik}Koordinat GPS</dt><dd class="fl-angka">${koord(f)}</dd></div>` : ""}
            <div><dt>${IK.jam}Diambil</dt><dd class="fl-nw">${jamWIB(f.diambil)} <small>(${lalu(f.diambil)})</small></dd></div>
            <div><dt>${IK.orang}Kredit</dt><dd>${f.kredit ? esc(f.kredit) : "Anonim"}</dd></div></dl>
          <div class="fl-aksi"><button data-suka aria-pressed="${!!f.suka_saya}" aria-label="Dukung foto ini" title="Dukung">${IK.naik}<span>${fmt(f.suka)}</span></button>
            <button data-fokus-kom aria-label="Komentar">${IK.kom}<span>${fmt(f.komentar)}</span></button>
            <button data-bagi>${IK.bagi}Bagikan</button>${BEN === "karhutla" ? `<button data-peta>${IK.pin}Peta</button>` : ""}</div>
          <div class="fl-bagi" hidden>${[["wa", "WhatsApp"], ["x", "X"], ["fb", "Facebook"], ["tg", "Telegram"], ["salin", "Salin tautan"]].map(([k2, n]) => `<button data-ke="${k2}">${n}</button>`).join("")}</div>
          <section class="fl-kom"><h4>Komentar</h4>
            <form class="fl-kom-form"><input name="nama" maxlength="60" placeholder="Nama (opsional)" autocomplete="name"><textarea name="teks" maxlength="280" rows="2" required placeholder="Tulis komentar…"></textarea><button class="fl-pri kecil">Kirim</button></form>
            <ul class="fl-kom-daftar">${f.komentar_daftar.map(this.komentar).join("") || '<li class="fl-redup">Belum ada komentar.</li>'}</ul></section>
          <button class="fl-adu" data-adu>${IK.bendera}Laporkan foto ini</button></div></div>`;
    },
    komentar: c => `<li><b>${esc(c.nama || "Warga")}</b><span>${lalu(c.dibuat)}</span><p>${esc(c.teks)}</p><button class="fl-adu" data-adu-k="${c.id}" aria-label="Laporkan komentar">${IK.bendera}Laporkan</button></li>`,
    async klik(e, d) {
      const f = this.f, b = e.target;
      if (b === d || b.closest("[data-tutup]")) return d.close();
      if (!f) return;
      if (b.closest("[data-suka]")) { const t = b.closest("[data-suka]"); t.disabled = true;
        const r = await fetch(`${API}/suka/${f.id}`, {method: "POST"}); t.disabled = false;
        if (!r.ok) return toast((await r.json().catch(() => ({}))).galat || "Gagal memberi dukungan");
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
  /* tiga bacaan GPS segar berurutan: server memeriksa getarannya (GPS asli bergeser sedikit, aplikasi lokasi palsu sering diam sempurna) */
  const bacaGPS = () => new Promise((ok, no) => navigator.geolocation.getCurrentPosition(ok,
    e => no(new Error(e.code === 1 ? "Izin lokasi ditolak. Foto lapangan hanya bisa dikirim dari lokasimu, jadi izinkan akses lokasi lalu coba lagi." : "Lokasi belum terbaca. Coba di tempat terbuka.")),
    {enableHighAccuracy: true, timeout: 20000, maximumAge: 0}));
  async function ambilGPS() {
    if (!navigator.geolocation) throw new Error("Peramban ini tidak bisa membaca lokasi");
    const s = [];
    for (let i = 0; i < 3; i++) {
      if (i) await new Promise(r => setTimeout(r, 1000));
      const p = await bacaGPS(); s.push([p.coords.latitude, p.coords.longitude, p.coords.accuracy, Date.now()]);
    }
    const [lat, lon, akurasi, waktu] = s[2];
    return {lat, lon, akurasi, waktu, sampel: s};
  }

  const Kirim = {
    async buka(lagi) {
      const k = await konfig(); this.k = k;
      let d = document.querySelector("#flKirim");
      if (!d) { d = document.createElement("dialog"); d.id = "flKirim"; d.className = "fl-sheet"; d.setAttribute("aria-labelledby", "flKJudul"); document.body.appendChild(d);
        d.addEventListener("click", e => this.klik(e, d)); d.addEventListener("change", e => this.ubah(e, d)); d.addEventListener("submit", e => this.kirim(e, d)); d.addEventListener("close", () => this.reset()); }
      const lokSegar = lagi && this.loc && Date.now() - this.loc.waktu < 5 * 60e3 && this.wil;
      this.d = d; this.reset(lokSegar);
      d.innerHTML = `<div class="fl-pegang"></div><header><span class="fl-hd-ik">${IK.kamera}</span><div class="fl-hd-tx"><h2 id="flKJudul">Kirim foto</h2><small>Foto lapangan untuk peta ${NAMA_BEN}</small></div><button type="button" class="fl-x" data-tutup aria-label="Tutup">×</button></header>
        ${k.media === false ? `<div class="fl-kosong"><b>Unggah foto belum dibuka</b><p>Penyimpanan foto sedang disiapkan. Coba lagi nanti.</p></div>` : `<div class="fl-lok" aria-live="polite"></div><form novalidate>
        <div class="fl-bidik" data-bidik><div class="fl-bidik-kosong"><label class="fl-bingkai" aria-label="Ambil foto"><span class="fl-lensa">${IK.kamera}</span><input type="file" name="kamera" accept="image/*,video/*" capture="environment" hidden></label></div></div>
        <p class="fl-cat">Foto, atau video maks ${k.batas?.durasi || 60} detik (${(k.batas?.video || 31457280) / 1048576} MB), diambil di lokasimu. Lokasi GPS ikut terkirim, dan admin memeriksa sebelum tayang.</p>
        <div class="fl-bawah"><label class="fl-galeri" aria-label="Pilih dari galeri" title="Pilih dari galeri">${IK.galeri}<input type="file" name="galeri" accept="image/jpeg,image/png,image/webp,image/heic,video/mp4,video/quicktime,video/webm" multiple hidden></label><label class="fl-pri besar">${IK.kamera}Ambil foto<input type="file" name="kamera" accept="image/*,video/*" capture="environment" hidden></label></div>
        <p class="fl-galat" role="alert" hidden></p>
        <div class="fl-lanjut"><div class="fl-panel"><div><span>Lokasi</span><b data-lok>Membaca GPS…</b></div><div><span>Koordinat</span><b data-koord>–</b></div><div><span>Waktu</span><b data-wkt>–</b></div><div><span>Berkas</span><b data-uk>–</b></div></div>
        <section class="fl-wadah"><h4><span class="fl-w-ik" style="--w:#e8743b">${IK.kamera}</span>Tentang foto ini</h4><fieldset class="fl-kat"><legend>Kategori</legend>${Object.entries(KAT).map(([kk, [n, w]], i) => `<label style="--k:${w}"><input type="radio" name="kategori" value="${kk}" ${i ? "" : "checked"}>${ikat(kk)}${n}</label>`).join("")}</fieldset>
        <label class="fl-f">Keterangan <small>(opsional)</small><textarea name="keterangan" maxlength="280" rows="2" placeholder="${CONTOH_KET[BEN] || CONTOH_KET.karhutla}"></textarea></label></section>
        <section class="fl-wadah"><h4><span class="fl-w-ik" style="--w:#4f8fc4">${IK.orang}</span>Pengirim</h4><div class="fl-dua2"><label class="fl-f">Nama <small>(opsional)</small><input name="nama" maxlength="60" autocomplete="name"></label>
          <label class="fl-f">Email <small>(opsional, tidak ditampilkan)</small><input name="email" type="email" maxlength="254" autocomplete="email"></label></div>
        <label class="fl-tog"><input type="checkbox" name="tampil_nama" value="1"><span><b>Tampilkan nama saya sebagai kredit</b><small>Bila tidak aktif, foto tampil sebagai "Anonim".</small></span></label></section>
        <section class="fl-wadah"><h4><span class="fl-w-ik" style="--w:#2f9e6a">${IK.cek}</span>Pernyataan</h4><label class="fl-tog"><input type="checkbox" name="setuju" value="1" required><span><b>Saya mengambil foto/video ini sendiri di lokasi ini</b><small>Tidak memuat wajah orang dengan jelas atau data pribadi.</small></span></label></section>
        <div data-ts></div><div class="fl-prog" hidden><i></i></div><p class="fl-galat fl-galat-b" role="alert" hidden></p>
        <button class="fl-pri besar" data-kirim-ok disabled>Kirim</button></div></form>`}`;
      if (!d.open) d.showModal();
      this.tsId = null; d.classList.remove("tahap-foto");
      if (k.media !== false) { lokSegar ? (d.classList.add("tahap-foto"), this.isiLok()) : this.tahapLok("minta"); this.isiPengirim(); }
    },
    /* langkah 1: minta izin lokasi, lalu tunjukkan wilayah yang terbaca. Kamera baru dibuka setelah warga yakin lokasinya benar. */
    tahapLok(t, v = {}) {
      const el = this.d.querySelector(".fl-lok"); if (!el) return;
      const maks = this.k.batas?.akurasi || 1000, m = n => `±${fmt(Math.round(n))} m`;
      const isi = {
        minta: [IK.pin, "", "Fotomu akan muncul tepat di lokasimu",
          "Izinkan akses lokasi supaya kami tahu kamu ada di kecamatan mana. Lokasi hanya dipakai untuk menandai foto ini.",
          `<button type="button" class="fl-pri besar" data-lok-cari>Izinkan akses lokasi</button><small>Setiap foto dicek admin dulu sebelum tampil di peta.</small>`],
        cari: [IK.pin, "muat", "Mencari lokasimu…", "Biasanya cuma beberapa detik. Di luar ruangan lebih cepat.", ""],
        ketemu: [IK.cek, "ok", "Kamu terdeteksi di", `<b class="fl-lok-wil">Kec. ${esc(v.kec)}</b><span>${esc(v.kab)}, ${esc(namaProv(v.prov))}</span>`,
          `<button type="button" class="fl-pri besar" data-lok-lanjut>${IK.kamera}Lanjut ambil foto</button><button type="button" class="fl-sek besar" data-lok-cari>${IK.pin}Bukan di sini? Cari ulang</button>`],
        lemah: [IK.pin, "awas", "Sinyal GPS masih lemah", `Akurasinya baru ${m(v.akurasi || 0)}, sedangkan yang dibutuhkan paling jauh ${m(maks)}. Coba pindah ke tempat terbuka atau dekat jendela.`,
          `<button type="button" class="fl-pri besar" data-lok-cari>Cari ulang</button>`],
        luar: [IK.pin, "awas", "Lokasimu di luar daratan Indonesia", "Foto lapangan hanya bisa dikirim dari wilayah daratan Indonesia.", `<button type="button" class="fl-pri besar" data-lok-cari>Cari ulang</button>`],
        gagal: [IK.pin, "awas", "Lokasi belum terbaca", esc(v.pesan || ""), `<button type="button" class="fl-pri besar" data-lok-cari>Coba lagi</button>`],
      }[t];
      el.className = "fl-lok " + isi[1]; el.innerHTML = `<span class="fl-lok-ik">${isi[0]}</span><h3>${isi[2]}</h3><div class="fl-lok-tx">${isi[3]}</div><div class="fl-lok-aksi">${isi[4]}</div>`;
    },
    async cariLok() {
      this.tahapLok("cari");
      try { this.loc = await ambilGPS(); }
      catch (e) { return this.tahapLok("gagal", {pesan: /ditolak/.test(e.message) ? "Akses lokasi ditolak. Buka pengaturan peramban, izinkan lokasi untuk situs ini, lalu coba lagi." : e.message}); }
      if (this.loc.akurasi > (this.k.batas?.akurasi || 1000)) return this.tahapLok("lemah", this.loc);
      const w = await fetch(`${API}/lokasi?lat=${this.loc.lat}&lon=${this.loc.lon}`).then(r => r.json()).catch(() => null);
      if (w && !w.ada) return this.tahapLok("luar");
      this.wil = w?.ada ? w : null;
      this.isiLok();
      this.siap();
      if (!this.wil) return this.d.classList.add("tahap-foto");   /* layanan wilayah gagal: jangan menahan warga, server tetap memeriksa saat kirim */
      this.tahapLok("ketemu", {...this.wil, akurasi: this.loc.akurasi});
    },
    reset(simpanLok) { (this.daftar || []).forEach(y => URL.revokeObjectURL(y.prev)); this.daftar = []; this.aktif = 0; if (!simpanLok) { this.loc = null; this.wil = null; } },
    isiLok() { const lok = this.d.querySelector("[data-lok]"); if (lok) lok.textContent = this.wil ? `Kec. ${this.wil.kec}, ${this.wil.kab}, ${namaProv(this.wil.prov)}` : "–";
      const ko = this.d.querySelector("[data-koord]"); if (ko && this.loc) ko.textContent = koord(this.loc); },
    isiPengirim() { let p = {}; try { p = JSON.parse(localStorage.getItem(PENGIRIM) || "{}"); } catch (e) {} const fm = this.d.querySelector("form"); if (!fm) return;
      if (p.nama) fm.nama.value = p.nama; if (p.email) fm.email.value = p.email; if (p.tampil) fm.tampil_nama.checked = true; },
    get berkas() { return this.daftar?.[0] || null; },
    /* pesan salah merah tepat di bawah bagian yang belum benar */
    salah(kunci, el, pesan) { if (!el) return; this.salahHapus(kunci); el.insertAdjacentHTML("afterend", `<p class="fl-err" data-err="${kunci}" role="alert">${esc(pesan)}</p>`); el.classList.add("fl-bermasalah"); },
    salahHapus(kunci) { this.d?.querySelectorAll(kunci ? `[data-err="${kunci}"]` : "[data-err]").forEach(p => { p.previousElementSibling?.classList.remove("fl-bermasalah"); p.remove(); }); },
    galat(t) { const p = this.d.querySelector(".fl-galat"); if (!p) return; p.hidden = !t; p.textContent = t || ""; },
    async gps() {
      const el = this.d.querySelector("[data-lok]");
      try { this.loc = await ambilGPS(); el.textContent = `±${Math.round(this.loc.akurasi)} m · ${this.loc.lat.toFixed(4)}, ${this.loc.lon.toFixed(4)}`;
        if (this.loc.akurasi > (this.k.batas?.akurasi || 1000)) { el.textContent += " (terlalu lemah)"; this.galat("Sinyal GPS lemah. Pindah ke tempat terbuka lalu ketuk Lokasi untuk mencoba lagi."); } else this.galat(""); }
      catch (e) { el.textContent = "Ketuk untuk coba lagi"; this.galat(e.message); }
      this.siap();
    },
    siap() { const b = this.d?.querySelector("[data-kirim-ok]"); if (b) b.disabled = false; },   /* tombol selalu bisa ditekan; yang kurang ditunjukkan saat kirim */
    /* beberapa foto/video sekali kirim (paling banyak 5 = batas unggah per jam di server); tiap berkas punya EXIF & cap sendiri */
    async olah(f, kamera) {
      const b = this.k.batas || {}, video = f.type.startsWith("video/");
      if (video) {
        if (f.size > (b.video || 31457280)) throw new Error(`Video ${(f.size / 1048576).toFixed(1).replace(".", ",")} MB, maksimal ${(b.video || 31457280) / 1048576} MB`);
        const v = await bingkaiVideo(f);
        if (v.durasi > (b.durasi || 60) + .5) { v.lepas(); throw new Error(`Video ${Math.round(v.durasi)} detik, maksimal ${b.durasi || 60} detik. Potong dulu videonya.`); }
        const o = {media: f, thumb: await kompres(v.bingkai, 480, .72), durasi: v.durasi, jenis: "video", exif: null, kamera, asli: f.size}; v.lepas(); o.prev = URL.createObjectURL(f); return o;
      }
      const exif = /jpe?g$/i.test(f.type) ? bacaExif(await f.slice(0, 256 * 1024).arrayBuffer()) : null;
      if (exif?.waktu && Date.now() - exif.waktu > 48 * JAM) throw new Error(`Foto ini diambil ${Math.round((Date.now() - exif.waktu) / 864e5)} hari lalu. Hanya foto 48 jam terakhir.`);
      const bmp = await createImageBitmap(f).catch(() => { throw new Error("Format foto tidak terbaca. Pakai JPEG/PNG, atau ambil langsung dari kamera."); });
      const o = {media: await kompres(bmp, 1600, .8), thumb: await kompres(bmp, 480, .72), jenis: "foto", exif, kamera, asli: f.size}; bmp.close?.(); o.prev = URL.createObjectURL(o.media); return o;
    },
    async ubah(e, d) {
      const inp = e.target; if (inp.type !== "file" || !inp.files.length) return;
      const kamera = inp.name === "kamera", sisa = MAKS_N - this.daftar.length, fs = [...inp.files].slice(0, Math.max(0, sisa)); this.galat("");
      if (inp.files.length > sisa) this.galat(`Paling banyak ${MAKS_N} foto/video sekali kirim.`);
      for (const f of fs) { try { this.daftar.push(await this.olah(f, kamera)); this.aktif = this.daftar.length - 1; } catch (er) { this.galat(er.message); } }
      inp.value = ""; this.gambarDaftar(d);
    },
    gambarDaftar(d) {
      const bidik = d.querySelector("[data-bidik]"), fm = d.querySelector("form"), x = this.daftar[this.aktif = Math.min(this.aktif || 0, this.daftar.length - 1)];
      bidik.querySelector(".fl-pratinjau")?.remove(); d.querySelector(".fl-strip")?.remove();
      bidik.classList.toggle("ada", !!x); fm?.classList.toggle("ada", !!x); if (!x) return;
      if (this.tsId == null) this.turnstile(d);   /* Turnstile dipasang setelah ada berkas: layar pertama cukup bidikan kamera */
      /* cap menempel di dalam bingkai media (bukan di bidang hitam di bawahnya) */
      bidik.insertAdjacentHTML("beforeend", `<div class="fl-pratinjau"><div class="fl-mw">${x.jenis === "video" ? `<video src="${x.prev}" muted playsinline controls></video>` : `<img alt="Pratinjau" src="${x.prev}">`}${cap(this.wil, this.loc, jamWIB(x.exif?.waktu || Date.now()))}<button type="button" class="fl-ganti" data-hapus>Hapus</button></div></div>`);
      const GAL = 'accept="image/jpeg,image/png,image/webp,image/heic,video/mp4,video/quicktime,video/webm" multiple';
      bidik.insertAdjacentHTML("afterend", `<div class="fl-strip">${this.daftar.map((y, i) => `<button type="button" class="fl-th${i === this.aktif ? " on" : ""}" data-pilih="${i}" aria-label="Berkas ${i + 1}"><img alt="" src="${URL.createObjectURL(y.thumb)}">${y.jenis === "video" ? `<i>${IK.main}</i>` : ""}</button>`).join("")}
        ${this.daftar.length < MAKS_N ? `<label class="fl-th fl-tambah" aria-label="Tambah foto atau video">+<small>Tambah</small><input type="file" name="galeri" ${GAL} hidden></label>` : ""}<span class="fl-strip-n">${this.daftar.length} dari ${MAKS_N}</span></div>`);
      d.querySelector("[data-wkt]").textContent = x.exif?.waktu ? jamWIB(x.exif.waktu) : "Saat dikirim";
      const jadi = x.media.size;
      d.querySelector("[data-uk]").textContent = (this.daftar.length > 1 ? `${this.daftar.length} berkas · ` : "") + (x.jenis === "video" ? `Video ${durasi(x.durasi)} · ${(jadi / 1048576).toFixed(1).replace(".", ",")} MB` : `${Math.round(jadi / 1024)} KB${x.asli > jadi * 1.2 ? ` (dari ${(x.asli / 1048576).toFixed(1).replace(".", ",")} MB)` : ""}`);
      this.salahHapus("berkas");
    },
    klik(e, d) {
      if (e.target === d || e.target.closest("[data-tutup]")) return d.close();
      if (e.target.closest("[data-hapus]")) { const y = this.daftar.splice(this.aktif, 1)[0]; y && URL.revokeObjectURL(y.prev); return this.gambarDaftar(d); }
      const pl = e.target.closest("[data-pilih]"); if (pl) { this.aktif = +pl.dataset.pilih; return this.gambarDaftar(d); }
      if (e.target.closest("[data-lok-cari]")) return this.cariLok();
      if (e.target.closest("[data-lok-lanjut]")) { d.classList.add("tahap-foto"); return; }
      if (e.target.closest("[data-lok]")) { d.classList.remove("tahap-foto"); return this.cariLok(); }
      if (e.target.closest("[data-lagi]")) return this.buka(true);
    },
    turnstile(d) {
      const kunci = this.k.turnstile; if (!kunci) return;
      const pasang = () => { this.tsId = window.turnstile.render(d.querySelector("[data-ts]"), {sitekey: kunci, size: "flexible"}); };
      if (window.turnstile) return pasang();
      const s = document.createElement("script"); s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"; s.async = true; s.onload = pasang; document.head.appendChild(s);
    },
    async kirim(e, d) {
      e.preventDefault(); const fm = e.target, gb = d.querySelector(".fl-galat-b"), galatB = t => { gb.hidden = !t; gb.textContent = t || ""; };
      this.salahHapus(); galatB("");
      /* periksa semua dulu, tunjukkan semua yang kurang sekaligus, gulir ke yang pertama */
      if (!this.daftar.length) this.salah("berkas", d.querySelector("[data-bidik]"), "Pilih foto atau video dulu.");
      if (!this.loc) this.salah("lok", d.querySelector(".fl-panel"), "Lokasi belum terbaca. Ketuk baris Lokasi untuk mencari lagi.");
      if (fm.email.value && !fm.email.checkValidity()) this.salah("email", fm.email, "Format email belum benar, mis. nama@contoh.com.");
      if (fm.tampil_nama.checked && !fm.nama.value.trim()) this.salah("nama", fm.nama, "Isi nama dulu, atau matikan kredit nama.");
      if (!fm.setuju.checked) this.salah("setuju", fm.setuju.closest(".fl-tog"), "Aktifkan pernyataan ini supaya foto bisa dikirim.");
      const pertama = d.querySelector(".fl-err"); if (pertama) { pertama.scrollIntoView({behavior: "smooth", block: "center"}); return; }
      try { if (Date.now() - this.loc.waktu > 5 * 60e3) this.loc = await ambilGPS(); } catch (er) { return galatB(er.message); }
      try { localStorage.setItem(PENGIRIM, JSON.stringify({nama: fm.nama.value.trim(), email: fm.email.value.trim(), tampil: fm.tampil_nama.checked})); } catch (er) {}
      const btn = d.querySelector("[data-kirim-ok]"), prog = d.querySelector(".fl-prog"); btn.disabled = true; prog.hidden = false;
      let wil = null, n = 0;
      for (const [i, y] of this.daftar.entries()) {
        btn.textContent = this.daftar.length > 1 ? `Mengirim ${i + 1} dari ${this.daftar.length}…` : "Mengirim…";
        const x = new FormData(), set = (k, v) => v != null && v !== "" && x.append(k, v);
        set("bencana", BEN); set("kategori", fm.kategori.value); set("keterangan", fm.keterangan.value); set("nama", fm.nama.value); set("email", fm.email.value);
        set("tampil_nama", fm.tampil_nama.checked ? "1" : "0"); set("setuju", "1"); set("kamera", y.kamera ? "1" : "0");
        set("lat", this.loc.lat); set("lon", this.loc.lon); set("akurasi", this.loc.akurasi); set("waktu_gps", this.loc.waktu); set("sampel", JSON.stringify(this.loc.sampel));
        if (y.exif?.waktu) set("exif_waktu", y.exif.waktu);
        if (y.exif?.lat != null) { set("exif_lat", y.exif.lat); set("exif_lon", y.exif.lon); }
        if (y.durasi) set("durasi", y.durasi);
        if (this.tsId != null) set("turnstile", window.turnstile.getResponse(this.tsId));
        x.append("media", y.media, y.jenis === "video" ? "video" : "foto"); x.append("thumb", y.thumb, "thumb");
        const r = await new Promise(ok => { const q = new XMLHttpRequest(); q.open("POST", API); q.upload.onprogress = ev => { if (ev.lengthComputable) prog.firstChild.style.width = ((i + ev.loaded / ev.total) / this.daftar.length * 100) + "%"; };
          q.onload = () => { let j = {}; try { j = JSON.parse(q.responseText); } catch (er) {} ok({s: q.status, j}); }; q.onerror = () => ok({s: 0, j: {galat: "Koneksi terputus. Coba lagi."}}); q.send(x); });
        if (r.s !== 201) { prog.hidden = true; btn.disabled = false; btn.textContent = "Kirim"; if (this.tsId != null) window.turnstile.reset(this.tsId);
          this.daftar.splice(0, i); this.aktif = 0; this.gambarDaftar(d);   /* yang sudah terkirim dibuang dari antrean */
          return galatB((n ? `${n} berkas sudah terkirim. ` : "") + (r.j.galat || `Gagal mengirim (${r.s})`)); }
        wil = r.j.wilayah || wil; n++;
        /* token Turnstile sekali pakai: minta baru dan tunggu sampai terisi (paling lama 20 detik) sebelum berkas berikutnya */
        if (i < this.daftar.length - 1 && this.tsId != null) { window.turnstile.reset(this.tsId);
          for (let t = 0; t < 40 && !window.turnstile.getResponse(this.tsId); t++) await new Promise(ok => setTimeout(ok, 500)); }
      }
      d.innerHTML = `<div class="fl-selesai">${IK.cek}<h2>Terima kasih!</h2>
        <p>${n > 1 ? `${n} kiriman` : "Kiriman"} dari <b>Kec. ${esc(wil?.kec || "")}, ${esc(wil?.kab || "")}</b> sedang dicek admin. Begitu lolos, ${n > 1 ? "semuanya" : "fotonya"} tampil di peta dan membantu warga lain melihat kondisi terbaru di tempatmu.</p>
        <div class="fl-selesai-aksi"><button class="fl-pri besar" data-lagi>${IK.kamera}Kirim foto lain</button><button class="fl-sek besar" data-tutup>Selesai</button></div></div>`;
    },
  };

  /* ------------------------------------------------------------ pasang */
  window.Foto = {render, lapis, buka: id => Rinci.buka(id), kirim: () => Kirim.buka()};
  /* fitur yang belum bisa dipakai disembunyikan, bukan dinonaktifkan: tanpa R2 (MEDIA) tab & lapisan tidak tampil */
  konfig().then(k => { if (k.media) return BEN === "karhutla" ? pasangPeta() : null;   /* lapisan foto di peta baru ada di karhutla */
    document.querySelector('#tabs button[data-t="foto"]')?.setAttribute("hidden", "");
    document.querySelector('#lapis input[data-l="foto"]')?.closest("label")?.setAttribute("hidden", ""); });
  const fid = location.pathname.match(/^\/f\/([0-9a-f]{16})\/?$/)?.[1];
  if (fid) muat().then(() => Rinci.buka(fid));
})();
