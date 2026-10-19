/* Meja Kerja petugas BPBD (/meja). Masuk dengan kode di fragmen #k= (disimpan di peramban ini, bukan di URL), tanpa akun.
   Formulir dibangun dari GET /api/meja/spek; daftar dan perpindahan status lewat /api/meja/catatan. Tanpa skrip/gaya inline (CSP ketat).
   Semua teks dari data lewat esc(). */
(() => {
  const app = document.getElementById("app"), KUNCI = "meja_kode", HAL = 15;
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c]));
  const ID = new Intl.NumberFormat("id-ID", {maximumFractionDigits: 2});
  const svg = d => `<svg viewBox="0 0 24 24" aria-hidden="true">${d}</svg>`;
  const IK = {ok: svg('<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>'), tunggu: svg('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'), bahaya: svg('<path d="M12 3 2 20h20z"/><path d="M12 10v5M12 18v.5"/>'),
    info: svg('<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>'), tambah: svg('<path d="M12 5v14M5 12h14"/>'), riwayat: svg('<path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5M12 8v5l3 2"/>'),
    ubah: svg('<path d="M4 20h4L19 9l-4-4L4 16z"/>'), maju: svg('<path d="M5 12h14M13 6l6 6-6 6"/>'), keluar: svg('<path d="M10 4H5v16h5M15 8l4 4-4 4M19 12H9"/>'), kab: svg('<path d="M12 21s7-6 7-11a7 7 0 1 0-14 0c0 5 7 11 7 11z"/><circle cx="12" cy="10" r="2.5"/>')};
  const TON = {dilaporkan: "tunggu", diverifikasi: "info", masuk_jitupasna: "ok", diminta: "tunggu", disetujui: "info", dikirim: "info", diterima: "ok", diajukan: "tunggu", cair: "info", spj: "info", selesai: "ok", ditolak: "bahaya",
    tercatat: "info", berlaku: "ok", segera_habis: "tunggu", kedaluwarsa: "bahaya", belum_diuji: "tunggu", aktif: "ok", pasif: "bahaya"};
  const label = s => { const t = String(s).replace(/_/g, " "); return t[0].toUpperCase() + t.slice(1); };
  const pil = (s, teks) => { const t = TON[s] || "info"; return `<span class="mj-pil t-${t}">${IK[t]}${esc(teks ?? label(s))}</span>`; };
  const tglF = t => t ? new Date(t + "T00:00:00Z").toLocaleDateString("id-ID", {timeZone: "UTC", day: "numeric", month: "short", year: "numeric"}) : "";
  const waktuF = t => new Date(t).toLocaleString("id-ID", {timeZone: "Asia/Jakarta", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit"}).replace(",", "") + " WIB";
  const angkaF = (k, v) => k.rupiah ? "Rp" + ID.format(v) : ID.format(v);

  let kode = "", S = null, saya = null, meja = null, daftar = [], urut = "diubah", arah = -1, hal = 0, form = null, buka = new Map(), pesanT = "", pesanOk = true;
  const api = async (m, u, b) => {
    const r = await fetch(u, {method: m, headers: {"x-kode": kode, ...(b ? {"content-type": "application/json"} : {})}, body: b ? JSON.stringify(b) : undefined});
    return {ok: r.ok, s: r.status, j: await r.json().catch(() => ({}))};
  };

  /* ---------- nilai & formulir dinamis dari spek ---------- */
  const nilaiF = (k, v) => {
    if (v == null || v === "") return "";
    if (k.tipe === "angka") return angkaF(k, v);
    if (k.tipe === "tanggal") return esc(tglF(v));
    if (k.tipe === "pilih") return esc(label(v));
    if (k.tipe === "multi") return esc(v.map(label).join(", "));
    if (k.tipe === "ya") return v ? "Ya" : "Tidak";
    if (k.tipe === "tautan") return /^https?:\/\//i.test(v) ? `<a href="${esc(v)}" target="_blank" rel="noopener noreferrer">${esc(v.replace(/^https?:\/\//i, "").slice(0, 40))}</a>` : esc(v);
    return esc(v);
  };
  const isian = (k, v) => {
    const n = esc(k.nama), l = esc(k.label) + (k.wajib ? " *" : "");
    if (k.tipe === "pilih") return `<label class="bn-isian">${l}<select name="${n}"><option value="">Pilih…</option>${k.nilai.map(o => `<option value="${esc(o)}" ${v === o ? "selected" : ""}>${esc(label(o))}</option>`).join("")}</select></label>`;
    if (k.tipe === "multi") return `<div class="bn-isian">${l}<div class="bn-pilihan">${k.nilai.map(o => `<label><input type="checkbox" name="${n}" value="${esc(o)}" ${(v || []).includes(o) ? "checked" : ""}>${esc(label(o))}</label>`).join("")}</div></div>`;
    if (k.tipe === "ya") return `<label class="bn-pilihan"><label><input type="checkbox" name="${n}" ${v ? "checked" : ""}>${l}</label></label>`;
    if (k.tipe === "tanggal") return `<label class="bn-isian">${l}<input type="date" name="${n}" value="${esc(v ?? "")}"></label>`;
    if (k.tipe === "tautan") return `<label class="bn-isian">${l}<input type="url" name="${n}" maxlength="300" inputmode="url" placeholder="https://" value="${esc(v ?? "")}"></label>`;
    if (k.tipe === "angka") return `<label class="bn-isian">${l}<input name="${n}" inputmode="${k.desimal ? "decimal" : "numeric"}" autocomplete="off" value="${esc(v ?? "")}"></label>`;
    return `<label class="bn-isian">${l}<input name="${n}" maxlength="${k.maks || 120}" autocomplete="off" value="${esc(v ?? "")}"></label>`;
  };
  /* 1.234,5 / 1.234 (ribuan) / 1.5 (titik desimal) -> angka; yang tak terbaca jadi NaN dan ditolak server */
  const angkaId = v => { const n = Number(v.includes(",") ? v.replace(/\./g, "").replace(",", ".") : /^\d{1,3}(\.\d{3})+$/.test(v) ? v.replace(/\./g, "") : v); return Number.isNaN(n) ? v : n; };
  const ambil = (f, kolom) => {
    const o = {};
    for (const k of kolom) {
      const e = f.elements[k.nama];
      if (k.tipe === "multi") o[k.nama] = [...f.querySelectorAll(`input[name="${k.nama}"]:checked`)].map(x => x.value);
      else if (k.tipe === "ya") o[k.nama] = !!e.checked;
      else if (e.value.trim() !== "") o[k.nama] = k.tipe === "angka" ? angkaId(e.value.trim()) : e.value.trim();
    }
    return o;
  };

  /* ---------- tampilan ---------- */
  const M = () => S.meja.find(m => m.id === meja);
  const ringkasIsi = r => {
    const kolom = M().kolom.filter(k => !k.tahap || r.data[k.nama] != null);
    const isi = kolom.filter(k => r.data[k.nama] != null && r.data[k.nama] !== "" && !(Array.isArray(r.data[k.nama]) && !r.data[k.nama].length)).slice(0, 4);
    return isi.map(k => `<span>${esc(k.label)}: <b>${nilaiF(k, r.data[k.nama])}</b></span>`).join(" · ");
  };
  const wilayahF = r => esc([r.desa, r.kec].filter(Boolean).join(", ") || r.kab);
  const urutan = {wilayah: r => [r.desa, r.kec, r.kab].filter(Boolean).join(" ").toLowerCase(), status: r => r.status_efektif, diubah: r => r.diubah};
  const baris = r => {
    const tanda = r.tanda.map(t => `<span class="mj-pil t-bahaya">${IK.bahaya}${esc(M().bahaya[t] || label(t))}</span>`).join("");
    const aksi = r.aksi.filter(a => a.boleh).map(a => `<button class="mj-btn kecil utama" data-status="${esc(a.ke)}">${IK.maju}${esc(label(a.ke))}</button>`).join("") + (r.bisa_ubah ? `<button class="mj-btn kecil" data-ubah="1">${IK.ubah}Ubah</button>` : "");
    const lain = r.aksi.filter(a => !a.boleh).length ? `<span class="mj-redup">menunggu admin</span>` : "";
    const rin = buka.get(r.id);
    return `<tr data-id="${esc(r.id)}"><td><b>${wilayahF(r)}</b></td><td>${ringkasIsi(r) || "–"}${tanda ? `<div class="mj-tanda">${tanda}</div>` : ""}</td>
      <td>${pil(r.status_efektif)}${r.status_efektif !== r.status ? ` ${pil(r.status)}` : ""}</td><td>${esc(waktuF(r.diubah))}</td>
      <td><div class="mj-aksi">${aksi}<button class="mj-btn kecil" data-rinci="1">${IK.riwayat}Rincian</button>${lain}</div></td></tr>${rin ? rinci(r, rin) : ""}`;
  };
  const rinci = (r, d) => `<tr><td colspan="5"><div class="mj-rincian">${M().kolom.filter(k => r.data[k.nama] != null && r.data[k.nama] !== "").map(k => `${esc(k.label)}: <b>${nilaiF(k, r.data[k.nama])}</b>`).join(" · ")}</div>
    <ol class="mj-jejak">${d.jejak.map(j => `<li>${esc(label(j.ke))}${j.dari ? ` (dari ${esc(label(j.dari))})` : ""} · ${esc(waktuF(j.waktu))}${j.catatan ? ` · ${esc(j.catatan)}` : ""}</li>`).join("")}</ol></td></tr>`;
  const panelForm = () => {
    const m = M(), t = form.mode;
    const kolom = m.kolom.filter(k => (k.tahap ?? null) === (t === "status" ? form.ke : null)), r = form.baris;
    const wil = t === "status" ? "" : `<div class="bn-baris">${m.wilayah.desa || t === "ubah" && r.desa ? `<label class="bn-isian">Desa${m.wilayah.desa ? " *" : ""}<input name="_desa" maxlength="80" autocomplete="off" value="${esc(r?.desa ?? "")}"></label>` : ""}
      ${m.wilayah.kec ? `<label class="bn-isian">Kecamatan *<input name="_kec" maxlength="60" autocomplete="off" value="${esc(r?.kec ?? "")}"></label>` : ""}</div>`;
    const judul = t === "baru" ? `Tambah ${m.nama.toLowerCase()}` : t === "ubah" ? `Ubah ${m.nama.toLowerCase()}` : `Pindah ke ${label(form.ke).toLowerCase()}`;
    return `<form class="bn-blok mj-form" id="mjForm" autocomplete="off" novalidate><h2>${IK.tambah}${esc(judul)}</h2>${wil}
      <div class="bn-baris">${kolom.map(k => isian(k, r?.data?.[k.nama])).join("")}</div>
      ${t === "status" ? `<label class="bn-isian">Catatan (opsional)<input name="_catatan" maxlength="200" autocomplete="off"></label>` : ""}
      <div class="mj-aksi"><button class="mj-btn utama" type="submit">Simpan</button><button class="mj-btn" type="button" data-batal="1">Batal</button></div></form>`;
  };
  function gambar() {
    const m = M(), urutF = urutan[urut], b = [...daftar].sort((x, y) => (urutF(x) > urutF(y) ? 1 : urutF(x) < urutF(y) ? -1 : 0) * arah), n = b.length, h = Math.min(hal, Math.max(0, Math.ceil(n / HAL) - 1));
    const th = (k, t) => `<th data-urut="${k}" ${urut === k ? `aria-sort="${arah > 0 ? "ascending" : "descending"}"` : ""}>${t}</th>`;
    app.innerHTML = `<div class="mj-kop"><h1>Meja Kerja</h1><span class="mj-pil t-info">${IK.kab}${esc(saya.petugas.kab)}</span><span class="mj-redup">${esc(saya.petugas.nama)}</span>
      <button class="mj-btn kecil mj-ruang" data-keluar="1">${IK.keluar}Keluar</button></div>
      <nav class="mj-meja" aria-label="Pilih meja">${S.meja.filter(x => saya.petugas.meja.includes(x.id)).map(x => `<button data-meja="${x.id}" aria-pressed="${x.id === meja}">${svg(x.ikon)}${esc(x.nama)}</button>`).join("")}</nav>
      <p class="mj-pesan ${pesanOk ? "ok" : "galat"}" role="status">${esc(pesanT)}</p>
      ${form ? panelForm() : `<div class="mj-bar"><button class="mj-btn utama" data-baru="1">${IK.tambah}Tambah ${esc(m.nama.toLowerCase())}</button><span class="mj-redup">${n} catatan di ${esc(saya.petugas.kab)}</span></div>`}
      <div class="mj-wadah"><table class="mj-tabel"><thead><tr>${th("wilayah", m.wilayah.desa ? "Desa" : "Wilayah")}<th>Isi</th>${th("status", "Status")}${th("diubah", "Diubah")}<th>Aksi</th></tr></thead>
      <tbody>${n ? b.slice(h * HAL, h * HAL + HAL).map(baris).join("") : `<tr><td colspan="5" class="mj-kosong">Belum ada catatan. Tekan Tambah untuk mengisi.</td></tr>`}</tbody></table></div>
      ${n > HAL ? `<div class="mj-hal"><button class="mj-btn kecil" data-hal="-1" ${h ? "" : "disabled"}>Sebelumnya</button>Halaman ${h + 1} dari ${Math.ceil(n / HAL)}<button class="mj-btn kecil" data-hal="1" ${(h + 1) * HAL < n ? "" : "disabled"}>Berikutnya</button></div>` : ""}`;
  }
  const lapor = (t, ok) => { pesanT = t; pesanOk = ok; };
  async function muat() {
    const r = await api("GET", `/api/meja/catatan?meja=${meja}`);
    if (!r.ok) { lapor(r.j.galat || `Gagal memuat (${r.s})`, false); daftar = []; } else daftar = r.j.catatan;
    buka = new Map(); gambar();
  }
  const salah = (r, t) => { lapor(r.j.galat || `${t} (${r.s})`, false); gambar(); };

  /* ---------- peristiwa ---------- */
  app.addEventListener("click", async e => {
    const t = e.target.closest("button"); if (!t) return;
    const tr = t.closest("tr"), r = tr && daftar.find(x => x.id === tr.dataset.id);
    if (t.dataset.meja) { meja = t.dataset.meja; form = null; hal = 0; lapor("", true); return muat(); }
    if (t.dataset.keluar) { sessionStorage.removeItem(KUNCI); location.reload(); return; }
    if (t.dataset.urut) { arah = urut === t.dataset.urut ? -arah : 1; urut = t.dataset.urut; return gambar(); }
    if (t.dataset.hal) { hal += +t.dataset.hal; return gambar(); }
    if (t.dataset.baru) { form = {mode: "baru"}; return gambar(); }
    if (t.dataset.batal) { form = null; return gambar(); }
    if (t.dataset.ubah && r) { form = {mode: "ubah", baris: r}; return gambar(); }
    if (t.dataset.status && r) { form = {mode: "status", baris: r, ke: t.dataset.status}; return gambar(); }
    if (t.dataset.rinci && r) {
      if (buka.has(r.id)) buka.delete(r.id); else { const d = await api("GET", `/api/meja/catatan/${r.id}`); if (!d.ok) return salah(d, "Gagal memuat rincian"); buka.set(r.id, d.j); }
      gambar();
    }
  });
  app.addEventListener("submit", async e => {
    e.preventDefault(); const f = e.target, m = M(), tombol = f.querySelector('button[type="submit"]'); tombol.disabled = true;
    const kolom = m.kolom.filter(k => (k.tahap ?? null) === (form.mode === "status" ? form.ke : null)), data = ambil(f, kolom);
    const wil = {...(f.elements._desa ? {desa: f.elements._desa.value.trim() || undefined} : {}), ...(f.elements._kec ? {kec: f.elements._kec.value.trim() || undefined} : {})};
    const r = form.mode === "baru" ? await api("POST", "/api/meja/catatan", {meja, ...wil, data})
      : form.mode === "ubah" ? await api("POST", `/api/meja/catatan/${form.baris.id}`, {aksi: "ubah", ...wil, data})
      : await api("POST", `/api/meja/catatan/${form.baris.id}`, {aksi: "status", ke: form.ke, data, ...(f.elements._catatan.value.trim() ? {catatan: f.elements._catatan.value.trim()} : {})});
    if (!r.ok) { tombol.disabled = false; return salah(r, "Gagal menyimpan"); }
    form = null; lapor("Tersimpan.", true); muat();
  });

  /* ---------- mulai ---------- */
  async function mulai() {
    const dariUrl = location.hash.match(/(?:^|[#&])k=([0-9a-fA-F]{26})(?:&|$)/);
    if (dariUrl) { sessionStorage.setItem(KUNCI, dariUrl[1].toLowerCase()); history.replaceState(null, "", location.pathname); }   // kode tidak tertinggal di bilah alamat
    kode = sessionStorage.getItem(KUNCI) || "";
    if (!kode) { app.innerHTML = '<p class="mj-pesan galat">Halaman ini hanya untuk petugas yang punya tautan dari admin. Buka lagi tautan yang dikirim kepadamu.</p>'; return; }
    const [sp, sy] = await Promise.all([fetch("/api/meja/spek").then(r => r.json()), api("GET", "/api/meja/saya")]);
    if (!sy.ok || sy.j.peran !== "petugas") { sessionStorage.removeItem(KUNCI); app.innerHTML = `<p class="mj-pesan galat">${esc(sy.j.galat || "Kodemu tidak berlaku.")} Minta tautan baru dari admin.</p>`; return; }
    S = sp; saya = sy.j; meja = S.meja.find(m => saya.petugas.meja.includes(m.id))?.id;
    if (!meja) { app.innerHTML = '<p class="mj-pesan galat">Kodemu belum punya meja yang boleh diisi.</p>'; return; }
    muat();
  }
  mulai().catch(() => { app.innerHTML = '<p class="mj-pesan galat">Gagal memuat Meja Kerja. Periksa sambunganmu lalu muat ulang.</p>'; });
})();
