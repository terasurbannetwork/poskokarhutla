/* /kampus: halaman koordinator kampus (kode dari tautan #k=…). Hanya relawan kampusnya sendiri: verifikasi/tolak, validasi jam kerja
   (untuk konversi SKS atau KKN tematik), unduh rekap CSV. Tanpa WA/email: data pribadi hanya untuk admin. CSP: tanpa inline. */
(() => {
  "use strict";
  const $ = id => document.getElementById(id), K = "pb_kode_kampus";   // kode di sessionStorage (hilang saat tab ditutup); tombol Keluar menghapusnya
  try { localStorage.removeItem(K); } catch (e) {}   // sisa versi lama
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c]));
  const angka = n => Number(n || 0).toLocaleString("id-ID", {maximumFractionDigits: 1});
  const wkt = t => t ? new Date(t).toLocaleString("id-ID", {timeZone: "Asia/Jakarta", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit"}).replace(",", "") + " WIB" : "–";
  const tgl = s => s ? new Date(s + "T00:00:00Z").toLocaleDateString("id-ID", {timeZone: "UTC", day: "numeric", month: "short", year: "numeric"}) : "–";
  const jam = m => m == null ? "–" : `${angka(m / 60)} jam`;
  const I = d => `<svg viewBox="0 0 24 24" aria-hidden="true">${d}</svg>`;
  const IKON = {jam: I('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'), centang: I('<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>'), bolt: I('<path d="M13 3 5 14h6l-1 7 8-11h-6z"/>'), x: I('<circle cx="12" cy="12" r="9"/><path d="m9 9 6 6m0-6-6 6"/>'),
    kampus: I('<path d="m3 9 9-5 9 5-9 5z"/><path d="M7 12v4c2 2 8 2 10 0v-4"/>'), orang: I('<circle cx="12" cy="8" r="3.5"/><path d="M5 20c1-4 4-6 7-6s6 2 7 6"/>'), pin: I('<path d="M12 21s7-6.2 7-11a7 7 0 0 0-14 0c0 4.8 7 11 7 11z"/><circle cx="12" cy="10" r="2.5"/>'),
    api: I('<path d="M12 3c1 4 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-5 1-9z"/>'), larang: I('<circle cx="12" cy="12" r="9"/><path d="m6 6 12 12"/>'), bendera: I('<path d="M5 21V4m0 0h11l-2 4 2 4H5"/>'), jeda: I('<circle cx="12" cy="12" r="9"/><path d="M10 9v6m4-6v6"/>')};
  const pil = (k, i, t) => `<span class="bn-pil ${k}">${IKON[i] || ""}${esc(t)}</span>`;
  const STATUS = {terdaftar: ["p-kuning", "jam", "Perlu diverifikasi"], diverifikasi: ["p-biru", "centang", "Terverifikasi"], siap_tugas: ["p-hijau", "bolt", "Siap tugas"], ditugaskan: ["p-ungu", "pin", "Ditugaskan"], bertugas: ["p-hijau", "api", "Bertugas"],
    selesai: ["p-hijau", "bendera", "Selesai"], ditolak: ["p-merah", "x", "Ditolak"], nonaktif: ["p-abu", "jeda", "Nonaktif"], daftar_hitam: ["p-merah", "larang", "Dibatasi"]};
  const MOU = {aktif: ["p-hijau", "centang", "MoU aktif"], segera_habis: ["p-oranye", "jam", "MoU segera habis"], habis: ["p-merah", "x", "MoU habis"], belum: ["p-kuning", "jam", "MoU belum berlaku"]};
  const SAH = {0: ["p-kuning", "jam", "Menunggu validasi"], 1: ["p-hijau", "centang", "Sah"], 2: ["p-merah", "x", "Ditolak"]};
  const sp = ([k, i, t]) => pil(k, i, t);
  const pesan = (t, ok) => { const p = $("pesan"); p.textContent = t || ""; p.className = "bn-pesan " + (t ? (ok ? "ok" : "galat") : ""); };
  let kode = (location.hash.match(/^#k=([0-9a-fA-F]{26})$/) || [])[1]?.toLowerCase() || null, nama = {};
  if (kode) { try { sessionStorage.setItem(K, kode); } catch (e) {} try { history.replaceState(null, "", location.pathname); } catch (e) {} }
  else { try { const b = sessionStorage.getItem(K); if (b && /^[0-9a-f]{26}$/.test(b)) kode = b; } catch (e) {} }
  const api = async (metode, j, body) => { const r = await fetch(j, {method: metode, headers: {"x-kode": kode, ...(body ? {"content-type": "application/json"} : {})}, body: body ? JSON.stringify(body) : undefined}); return {ok: r.ok, s: r.status, r, j: r.headers.get("content-type")?.includes("json") ? await r.json().catch(() => ({})) : {}}; };

  function Tabel(el, kolom, rows, kosong, ukuran = 10) {
    let urut = -1, arah = 1, hal = 0;
    const nil = (b, k) => k.v ? k.v(b) : b[k.k];
    const gambar = () => {
      const x = rows.slice();
      if (urut >= 0) { const k = kolom[urut]; x.sort((a, b) => { const p = nil(a, k), q = nil(b, k); return arah * (typeof p === "number" && typeof q === "number" ? p - q : String(p ?? "").localeCompare(String(q ?? ""), "id")); }); }
      const total = Math.max(1, Math.ceil(x.length / ukuran)); hal = Math.min(hal, total - 1);
      const isi = x.slice(hal * ukuran, (hal + 1) * ukuran);
      el.innerHTML = `<div class="ad-tabel-wadah"><table class="ad-tabel"><thead><tr>${kolom.map((k, i) => `<th aria-sort="${urut === i ? (arah > 0 ? "ascending" : "descending") : "none"}">${k.u === false ? esc(k.l) : `<button type="button" class="rl-urut" data-u="${i}">${esc(k.l)}${urut === i ? (arah > 0 ? " ▲" : " ▼") : ""}</button>`}</th>`).join("")}</tr></thead><tbody>${
        isi.length ? isi.map(b => `<tr>${kolom.map(k => `<td>${k.h ? k.h(b) : esc(nil(b, k))}</td>`).join("")}</tr>`).join("") : `<tr><td colspan="${kolom.length}" class="rl-kosong">${esc(kosong)}</td></tr>`}</tbody></table></div>${
        total > 1 ? `<div class="rl-hal"><button type="button" class="ad-tombol kecil" data-h="-1" ${hal === 0 ? "disabled" : ""}>Sebelumnya</button><span>Halaman ${hal + 1} dari ${total} (${angka(x.length)} baris)</span><button type="button" class="ad-tombol kecil" data-h="1" ${hal >= total - 1 ? "disabled" : ""}>Berikutnya</button></div>` : ""}`;
    };
    el.onclick = e => { const u = e.target.closest("[data-u]"), h = e.target.closest("[data-h]"); if (u) { const i = +u.dataset.u; arah = urut === i ? -arah : 1; urut = i; hal = 0; gambar(); } else if (h && !h.disabled) { hal += +h.dataset.h; gambar(); } };
    gambar();
  }
  const kartu = (i, n, l, w) => `<article class="bn-kartu"><div class="bn-angka">${n}</div><div class="bn-label">${pil(w, i, l)}</div></article>`;

  function gambar(x) {
    const k = x.kampus, rel = x.relawan, jum = k => rel.every(r => r[k] == null) ? null : rel.reduce((a, r) => a + (r[k] || 0), 0), sahMenit = jum("jam_sah_menit"), menunggu = jum("jam_menunggu_menit");
    nama = Object.fromEntries(rel.map(r => [r.id, r.nama]));
    $("isi").hidden = false;
    $("isi").innerHTML = `<div class="bn-judul"><h1>${esc(k.nama)}</h1><div class="bn-aksi">${sp(MOU[k.status])}<button class="bn-tombol sekunder" id="unduh" type="button">Unduh rekap CSV</button><button class="bn-tombol sekunder" type="button" data-keluar>Keluar</button></div></div>
      <p class="rl-kecil">${esc(k.no_mou)} · ${tgl(k.mulai)} sampai ${tgl(k.berakhir)}${k.status === "segera_habis" ? ` · berakhir ${angka(k.sisa_hari)} hari lagi` : ""}${k.status === "habis" ? ". Kampus tidak menerima pendaftar baru; relawan yang sudah ada tetap bisa kamu kelola." : ""}</p>
      <section class="bn-grid">${kartu("orang", `${angka(k.terisi)} / ${angka(k.kuota)}`, "Kuota terisi", "p-biru")}${kartu("jam", angka(rel.filter(r => r.status === "terdaftar").length), "Perlu diverifikasi", "p-kuning")}
        ${kartu("centang", jam(sahMenit), "Jam kerja tervalidasi", "p-hijau")}${kartu("jam", jam(menunggu), "Jam menunggu validasi", "p-oranye")}</section>
      <h2>${pil("p-biru", "orang", "Relawan kampusmu")}</h2><div id="tRel"></div>
      <h2>${pil("p-hijau", "jam", "Sesi jam kerja")}</h2><div id="tJam"></div>`;
    Tabel($("tRel"), [{l: "Nama", k: "nama"}, {l: "Wilayah", v: r => `${r.kab} ${r.prov}`, h: r => `${esc(r.kab)} (${esc(r.prov)})`}, {l: "Keahlian", v: r => r.keahlian.join(","), h: r => r.keahlian.map(a => `<span class="bn-pil p-abu">${esc(x.keahlianNama[a] || a)}</span>`).join(" ")},
      {l: "Status", v: r => r.status, h: r => sp(STATUS[r.status])}, {l: "Jam sah", k: "jam_sah_menit", h: r => jam(r.jam_sah_menit)}, {l: "Menunggu", k: "jam_menunggu_menit", h: r => jam(r.jam_menunggu_menit)}, {l: "Sesi", k: "sesi"},
      {l: "Aksi", u: false, h: r => r.status === "terdaftar" ? `<div class="rl-aksi"><button class="ad-tombol kecil utama" data-v="verifikasi" data-id="${esc(r.id)}">Verifikasi</button><button class="ad-tombol kecil bahaya" data-v="tolak" data-id="${esc(r.id)}">Tolak</button></div>` : ""}], rel, "Belum ada relawan dari kampusmu.");
    Tabel($("tJam"), [{l: "Relawan", k: "nama"}, {l: "Masuk", k: "masuk", h: j => wkt(j.masuk)}, {l: "Keluar", k: "keluar", h: j => wkt(j.keluar)}, {l: "Durasi", k: "menit", h: j => jam(j.menit)}, {l: "Validasi", v: j => j.sah, h: j => sp(SAH[j.sah])},
      {l: "Aksi", u: false, h: j => j.sah === 1 ? "" : `<div class="rl-aksi"><button class="ad-tombol kecil utama" data-j="sah" data-id="${esc(j.id)}">Sahkan</button>${j.sah === 2 ? "" : `<button class="ad-tombol kecil bahaya" data-j="tolak" data-id="${esc(j.id)}">Tolak</button>`}</div>`}], x.jam, "Belum ada sesi jam kerja yang selesai.");
  }
  async function muat() {
    const r = await api("GET", "/api/relawan/kampus/saya");
    if (!r.ok) { $("isi").hidden = true; if (r.s === 403) { $("tanpaKode").hidden = false; pesan("Tautan koordinatormu tidak berlaku (salah atau sudah dicabut). Minta tautan baru dari admin."); try { sessionStorage.removeItem(K); } catch (e) {} } else pesan(r.j.galat || "Halaman belum bisa dimuat."); return; }
    const kf = await (await fetch("/api/relawan/ringkas")).json().catch(() => ({}));
    $("tanpaKode").hidden = true; gambar({...r.j, keahlianNama: kf.konfig?.keahlian || {}});
  }
  $("isi").addEventListener("click", async e => {
    if (e.target.closest("[data-keluar]")) { try { sessionStorage.removeItem(K); } catch (x) {} kode = null; $("isi").hidden = true; $("tanpaKode").hidden = false; return pesan("Kamu sudah keluar. Buka lagi tautan koordinator untuk masuk.", true); }
    if (e.target.closest("#unduh")) {
      const r = await api("GET", "/api/relawan/kampus/csv"); if (!r.ok) return pesan(r.j.galat || "Rekap gagal diunduh.");
      const b = await r.r.blob(), a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = (r.r.headers.get("content-disposition") || "").match(/filename="([^"]+)"/)?.[1] || "rekap-relawan.csv"; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); return;
    }
    const t = e.target.closest("button[data-v], button[data-j]"); if (!t) return;
    t.disabled = true; pesan("");
    let r;
    if (t.dataset.v) {
      const alasan = t.dataset.v === "tolak" ? prompt(`Alasan menolak ${nama[t.dataset.id] || "relawan ini"} (boleh dikosongkan):`) : "";
      if (alasan === null) { t.disabled = false; return; }
      r = await api("POST", `/api/relawan/kampus/relawan/${t.dataset.id}`, {aksi: t.dataset.v, alasan: alasan || undefined});
    } else r = await api("POST", `/api/relawan/kampus/jam/${t.dataset.id}`, {aksi: t.dataset.j});
    if (!r.ok) { t.disabled = false; return pesan(r.j.galat || `Gagal (${r.s})`); }
    await muat(); pesan("Tersimpan.", true);
  });
  if (!kode) $("tanpaKode").hidden = false; else muat();
})();
