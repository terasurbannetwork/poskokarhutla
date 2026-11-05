/* Layar staf /ai langkah 1 (docs/ai-internal/PETA-FITUR.md §2.1, §2.3, §4): riwayat percakapan, daftar agen, ruang obrol, kelola agen, formulir agen.
   Semua data dari /api/ai/* dengan sesi staf; 401 dialihkan ke halaman masuk SEKALI per sesi tab, sesudahnya (atau 403) hanya pesan. Teks dari API dan model tidak pernah masuk innerHTML mentah:
   isi jawaban di-escape dulu lalu markdown sederhana (tebal, daftar, tabel) dibangun di atas teks yang sudah aman (mdKeHtml).
   Fungsi murni diekspor untuk tests/ai; kode DOM hanya jalan di peramban. */

export const AVATAR = {klasik: "Bot klasik", otak: "Otak cerdas", asisten: "Asisten"};
export const VISIBILITAS = {
  pribadi: ["Pribadi", "Hanya kamu yang bisa memakai dan melihat agen ini."],
  unit: ["Unit", "Semua staf di unitmu bisa memakai agen ini."],
  semua: ["Semua staf", "Semua staf BNPB dan BPBD bisa memakai agen ini."],
};
export const SUHU_BAWAAN = 0.3, MIN_KATA = 10, UKURAN_HALAMAN = 10;
const BLN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

export const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c]));
/* satu formatter per presisi di level modul (membuat Intl.NumberFormat tiap ketikan mahal) */
const NF = [new Intl.NumberFormat("id-ID", {maximumFractionDigits: 0}), new Intl.NumberFormat("id-ID", {maximumFractionDigits: 1})];
export const fmtAngka = (n, d = 1) => NF[d ? 1 : 0].format(Number(n));
/* kunci sah = milik objek itu sendiri, bukan warisan prototipe ("toString", "__proto__") */
export const avatarSah = v => typeof v === "string" && Object.hasOwn(AVATAR, v);
export const visibilitasSah = v => typeof v === "string" && Object.hasOwn(VISIBILITAS, v);
export const hitungKata = s => (String(s ?? "").trim().match(/\S+/g) || []).length;
export const labelSuhu = v => (v = Number(v)) < 0.7 ? "Fokus" : v < 1.4 ? "Seimbang" : "Kreatif";

/* "2026-11-04" -> "4 Nov 2026"; ISO berjam -> "4 Nov 2026 13.05 WIB"; selain itu teks apa adanya */
export function fmtTanggal(t) {
  if (t == null || t === "") return "";
  const s = String(t), m = /^(\d{4})-(\d\d)-(\d\d)$/.exec(s);
  if (m) return `${Number(m[3])} ${BLN[Number(m[2]) - 1]} ${m[1]}`;
  const d = new Date(/^\d+$/.test(s) ? Number(s) : s);
  if (isNaN(d)) return s;
  const w = new Date(d.getTime() + 7 * 36e5), p = n => String(n).padStart(2, "0");
  return `${w.getUTCDate()} ${BLN[w.getUTCMonth()]} ${w.getUTCFullYear()} ${p(w.getUTCHours())}.${p(w.getUTCMinutes())} WIB`;
}

/* nama alat mesin ("titik_panas") jadi label ("Titik panas") */
export const namaAlat = n => (s => s.charAt(0).toUpperCase() + s.slice(1))(String(n ?? "").replace(/[_-]+/g, " ").trim());

/* satu sumber: "Titik panas: 412 titik, 4 Nov 2026"; kutipan berkas pengetahuan: "Berkas Panduan: ringkas, 4 Nov 2026" */
export function formatSumber(s = {}) {
  if (s.berkas && !s.alat) {
    const k = "Berkas " + s.berkas + (s.ringkas ? `: ${s.ringkas}` : ""), t = fmtTanggal(s.tanggal);
    return t ? `${k}, ${t}` : k;
  }
  const kepala = namaAlat(s.alat) + (s.ringkas ? `: ${s.ringkas}` : "");
  const tgl = fmtTanggal(s.tanggal);
  return tgl ? `${kepala}, ${tgl}` : `${kepala}, tanggal data tidak disebut`;
}

/* inline: teks SUDAH di-escape; hanya **tebal** dan `kode` */
const inline = t => t.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>").replace(/`([^`]+)`/g, "<code>$1</code>");
const selTabel = baris => baris.trim().replace(/^\||\|$/g, "").split("|").map(x => x.trim());

/* Markdown sederhana -> HTML aman. Escape dulu SELURUH teks, baru pola ditandai; tidak ada atribut, tautan, atau gambar. */
export function mdKeHtml(teks) {
  const baris = esc(teks).replace(/\r\n?/g, "\n").split("\n"), out = [];
  let para = [];
  const tutupPara = () => { if (para.length) out.push(`<p>${para.map(inline).join("<br>")}</p>`); para = []; };
  for (let i = 0; i < baris.length; i++) {
    const b = baris[i];
    if (!b.trim()) { tutupPara(); continue; }
    if (/^\s*\|.*\|\s*$/.test(b) && /^\s*\|?\s*:?-{2,}/.test(baris[i + 1] || "")) {
      tutupPara();
      const kepala = selTabel(b); i += 2;
      const isi = [];
      while (i < baris.length && /^\s*\|.*\|\s*$/.test(baris[i])) isi.push(selTabel(baris[i++]));
      i--;
      out.push(`<div class="ai-tabel"><table><thead><tr>${kepala.map(k => `<th>${inline(k)}</th>`).join("")}</tr></thead><tbody>${isi.map(r => `<tr>${r.map(k => `<td>${inline(k)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`);
      continue;
    }
    const daftar = /^\s*([-*]|\d+[.)])\s+/.exec(b);
    if (daftar) {
      tutupPara();
      const urut = /\d/.test(daftar[1]), pola = urut ? /^\s*\d+[.)]\s+/ : /^\s*[-*]\s+/, butir = [];
      while (i < baris.length && pola.test(baris[i])) butir.push(baris[i++].replace(pola, ""));
      i--;
      out.push(`<${urut ? "ol" : "ul"}>${butir.map(x => `<li>${inline(x)}</li>`).join("")}</${urut ? "ol" : "ul"}>`);
      continue;
    }
    const judul = /^#{1,4}\s+(.*)$/.exec(b);
    if (judul) { tutupPara(); out.push(`<p class="ai-subjudul"><strong>${inline(judul[1])}</strong></p>`); continue; }
    para.push(b);
  }
  tutupPara();
  return out.join("");
}

/* validasi formulir agen; kunci galat = nama isian */
export function validasiAgen(d = {}) {
  const galat = {};
  const nama = String(d.nama ?? "").trim();
  if (!nama) galat.nama = "Nama agen wajib diisi.";
  else if (nama.length > 80) galat.nama = "Nama agen paling panjang 80 karakter.";
  if (!avatarSah(d.avatar)) galat.avatar = "Pilih salah satu avatar.";
  const suhu = Number(d.suhu);
  if (d.suhu === "" || d.suhu == null || isNaN(suhu) || suhu < 0 || suhu > 2) galat.suhu = "Suhu harus di antara 0 dan 2.";
  const kata = hitungKata(d.instruksi);
  if (!kata) galat.instruksi = "Instruksi sistem wajib diisi.";
  else if (kata < MIN_KATA) galat.instruksi = `Instruksi minimal ${MIN_KATA} kata, sekarang ${kata} kata.`;
  if (!visibilitasSah(d.visibilitas)) galat.visibilitas = "Pilih siapa yang boleh memakai agen ini.";
  if (!Array.isArray(d.alat)) galat.alat = "Daftar alat tidak sah.";
  return {ok: !Object.keys(galat).length, galat};
}

/* ringkasan perilaku dari isian formulir, tanpa memanggil model */
export function pratinjau(d = {}) {
  const ins = String(d.instruksi ?? "").trim().replace(/\s+/g, " ");
  if (!ins) return "Tulis instruksi sistem untuk melihat ringkasan perilaku agen.";
  const kalimat = (ins.match(/^.*?[.!?](\s|$)/) || [ins])[0].trim();
  const pendek = kalimat.length > 160 ? kalimat.slice(0, 157).trimEnd() + "…" : kalimat;
  const n = Array.isArray(d.alat) ? d.alat.length : 0;
  const bagian = [`${String(d.nama ?? "").trim() || "Agen ini"} akan bekerja dengan arahan: ${pendek}`,
    n ? `Ia boleh memakai ${fmtAngka(n)} alat, dan tiap angka di jawaban disebut sumber dan tanggalnya.` : "Ia tidak memakai alat, jadi tidak menjawab dengan angka dari data kita.",
    `Gaya jawaban: ${labelSuhu(d.suhu ?? SUHU_BAWAAN).toLowerCase()}.`];
  if (d.alih_manusia) bagian.push("Bila pengguna minta bicara dengan petugas, percakapan dialihkan ke operator.");
  return bagian.join(" ");
}

/* ---------- pengetahuan (PETA-FITUR §2.2) ---------- */
export const STATUS_SUMBER = {antre: "Antre", diproses: "Diproses", selesai: "Selesai", gagal: "Gagal"};
export const labelStatus = v => (typeof v === "string" && Object.hasOwn(STATUS_SUMBER, v)) ? STATUS_SUMBER[v] : "Tidak diketahui";
export const statusAkhir = v => v === "selesai" || v === "gagal";
export const JENIS_BAWAAN = ["txt", "md", "csv", "json", "docx", "pptx", "xlsx"], MAKS_BERKAS_BAWAAN = 2 * 1024 * 1024;
export const ekstensi = nama => { const m = /\.([A-Za-z0-9]+)$/.exec(String(nama ?? "").trim()); return m ? m[1].toLowerCase() : ""; };
export function fmtUkuran(b) {
  b = Number(b);
  if (!(b >= 0)) return "";
  return b < 1024 ? `${fmtAngka(b, 0)} B` : b < 1048576 ? `${fmtAngka(b / 1024)} KB` : `${fmtAngka(b / 1048576)} MB`;
}
/* langkah 1: berkas (d.berkas = nama, d.ukuran = byte); langkah 2: nama, deskripsi, visibilitas. Pesan menyebut angka batasnya, sama dengan server. */
export function validasiUnggah(d = {}, {jenis = JENIS_BAWAAN, maks = MAKS_BERKAS_BAWAAN} = {}) {
  const galat = {}, ext = ekstensi(d.berkas);
  if (!String(d.berkas ?? "").trim()) galat.berkas = "Pilih satu berkas dulu.";
  else if (!jenis.includes(ext)) galat.berkas = `Jenis berkas tidak didukung. Pakai salah satu: ${jenis.join(", ")}.`;
  else if (!(Number(d.ukuran) > 0)) galat.berkas = "Berkas kosong.";
  else if (Number(d.ukuran) > maks) galat.berkas = `Berkas ${fmtUkuran(d.ukuran)} melebihi batas ${fmtUkuran(maks)}.`;
  if (d.nama !== undefined) {
    const n = [...String(d.nama).trim()].length;
    if (n < 3 || n > 120) galat.nama = `Nama harus 3 sampai 120 karakter, sekarang ${n} karakter.`;
    if (String(d.deskripsi ?? "").trim().length > 500) galat.deskripsi = "Deskripsi paling panjang 500 karakter.";
    if (!visibilitasSah(d.visibilitas)) galat.visibilitas = "Pilih siapa yang boleh melihat berkas ini.";
  }
  return {ok: !Object.keys(galat).length, galat};
}
/* alamat unggah: metadata di query, badan = byte berkas */
export const alamatUnggah = d => "/api/ai/pengetahuan?" + new URLSearchParams({berkas: d.berkas, nama: String(d.nama).trim(), deskripsi: String(d.deskripsi || "").trim(), visibilitas: d.visibilitas}).toString();
/* status dari server -> teks untuk pengguna; berkas gagal menampilkan alasannya */
export const teksStatus = x => x?.status === "gagal" ? `Gagal: ${x.galat || "alasan tidak disebut"}` : labelStatus(x?.status) + (x?.status === "selesai" && x.potongan != null ? `, ${fmtAngka(x.potongan, 0)} potongan` : "");

/* Penjaga angkatan: maju() mengembalikan nomor baru; sah(g) benar hanya bila g masih yang terakhir. Dipakai membatalkan polling/muat basi. */
export function penjaga() { let n = 0; return {maju: () => ++n, sah: g => g === n}; }
/* Poll status sampai selesai/gagal. Berhenti (null) bila angkatan basi atau lewat batas; galat dilempar setelah gagalMaks gagal BERUNTUN. */
export async function tungguStatus(ambil, {sah = () => true, jeda = 2000, maks = 60, gagalMaks = 3, tidur = ms => new Promise(r => setTimeout(r, ms)), tampilkan} = {}) {
  let gagal = 0;
  for (let i = 0; i < maks; i++) {
    if (!sah()) return null;
    let x;
    try { x = await ambil(); gagal = 0; }
    catch (e) { if (++gagal >= gagalMaks) throw e; await tidur(jeda); continue; }
    if (!sah()) return null;
    tampilkan?.(x);
    if (statusAkhir(x.status)) return x;
    await tidur(jeda);
  }
  return null;
}

export const saring = (daftar, q, kunci) => {
  const t = String(q ?? "").trim().toLowerCase();
  return t ? daftar.filter(x => kunci.some(k => String(x[k] ?? "").toLowerCase().includes(t))) : daftar;
};

/* paging: halaman mulai 1, dijepit ke rentang sah */
export function halaman(daftar, ke, ukuran = UKURAN_HALAMAN) {
  const total = Math.max(1, Math.ceil(daftar.length / ukuran)), p = Math.min(Math.max(1, Math.floor(Number(ke) || 1)), total);
  return {isi: daftar.slice((p - 1) * ukuran, p * ukuran), halaman: p, total};
}

/* Balasan API -> tindakan. 401 pertama dalam sesi tab = "masuk" (alihkan); 401 berikutnya atau 403 = "tolak" (pesan, tanpa alih),
   supaya akun yang tak berhak tidak terpantul ke halaman masuk tanpa henti. */
export const PESAN_TOLAK = "Akun ini tidak punya akses ke Asisten AI";
export function aksiGalat(status, sudahDialihkan) {
  if (status === 401) return sudahDialihkan ? "tolak" : "masuk";
  if (status === 403) return "tolak";
  return "galat";
}

/* "Dibuat oleh X, Unit" untuk agen buatan staf lain; null untuk agen sendiri */
export function infoPembuat(a) {
  if (!a || a.milik_saya || !(a.pemilik_nama || a.unit)) return null;
  return "Dibuat oleh " + [a.pemilik_nama, a.unit].filter(Boolean).join(", ");
}

/* ================= DOM ================= */
if (typeof document !== "undefined" && document.getElementById("aiApp")) mulai();

function mulai() {
  const $ = s => document.querySelector(s);
  /* kerja berat sesudah frame berikutnya tercat (pola nanti() di public/index.html; /inti/nanti.js) */
  const nanti = window.nanti || (fn => { let ok = false; const go = () => { if (!ok) { ok = true; fn(); } }; requestAnimationFrame(() => requestAnimationFrame(go)); setTimeout(go, 120); });
  const IKON = {
    klasik: '<rect x="4" y="7" width="16" height="12" rx="3"/><path d="M12 3v4M9 12h.01M15 12h.01M9 16h6"/>',
    otak: '<path d="M9 4a3 3 0 0 0-3 3 3 3 0 0 0-2 5 3 3 0 0 0 2 5 3 3 0 0 0 6 1V5a2 2 0 0 0-3-1ZM15 4a3 3 0 0 1 3 3 3 3 0 0 1 2 5 3 3 0 0 1-2 5 3 3 0 0 1-6 1"/>',
    asisten: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7M17 3l.7 1.5L19 5l-1.3.6L17 7l-.7-1.4L15 5l1.3-.5z"/>',
    lihat: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
    sunting: '<path d="M4 20h4L19 9l-4-4L4 16zM14 6l4 4"/>',
    hapus: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
    ulang: '<path d="M20 11a8 8 0 1 0-2.3 5.7M20 5v6h-6"/>',
  };
  const svg = k => `<svg viewBox="0 0 24 24" aria-hidden="true">${IKON[k]}</svg>`;
  const ikonAvatar = v => avatarSah(v) ? v : "klasik";
  function el(tag, atr = {}, ...anak) {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(atr)) {
      if (v == null || v === false) continue;
      if (k === "teks") e.textContent = v; else if (k === "html") e.innerHTML = v; else if (k.startsWith("on")) e.addEventListener(k.slice(2), v); else e.setAttribute(k, v === true ? "" : v);
    }
    e.append(...anak.filter(x => x != null && x !== false));
    return e;
  }
  const tombolIkon = (ik, label, on) => el("button", {type: "button", class: "ai-ik", "aria-label": label, title: label, html: svg(ik), onclick: on});
  const tunda = (f, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => f(...a), ms); }; };
  const tandaiAktif = (wadah, id) => wadah.querySelectorAll("[data-id]").forEach(li => li.classList.toggle("aktif", li.dataset.id === String(id)));

  /* konfirmasi lewat <dialog>, bukan dialog konfirmasi bawaan peramban yang memblokir utas utama */
  const D = $("#aiTanya");
  function tanya(teks, ya = "Ya") {
    $("#aiTanyaTeks").textContent = teks; $("#aiTanyaYa").textContent = ya;
    D.returnValue = ""; D.showModal();
    return new Promise(r => D.addEventListener("close", () => r(D.returnValue === "ya"), {once: true}));
  }

  const TANDA = "ai_dialihkan";
  const bacaTanda = () => { try { return sessionStorage.getItem(TANDA) === "1"; } catch (e) { return false; } };
  const tulisTanda = v => { try { v ? sessionStorage.setItem(TANDA, "1") : sessionStorage.removeItem(TANDA); } catch (e) {} };
  async function api(url, body) {
    let r;
    try { r = await fetch(url, body === undefined ? {cache: "no-store"} : {method: "POST", headers: {"content-type": "application/json", "x-pb": "1"}, body: JSON.stringify(body)}); }
    catch (e) { throw new Error("Tidak tersambung ke server. Periksa jaringan lalu coba lagi."); }
    if (r.ok) { if (bacaTanda()) tulisTanda(false); return r.json().catch(() => ({})); }
    throw galatHttp(r.status, await r.json().catch(() => ({})));
  }
  function galatHttp(status, j) {
    const aksi = aksiGalat(status, bacaTanda());
    if (aksi === "masuk") { tulisTanda(true); location.href = "/admin/masuk?ke=" + encodeURIComponent(location.pathname + location.hash); return new Error("Sesi staf habis. Mengalihkan ke halaman masuk."); }
    if (aksi === "tolak") return new Error(PESAN_TOLAK);
    return new Error(j.galat || `Permintaan gagal (kode ${status}).`);
  }
  /* unggah byte berkas: XMLHttpRequest karena fetch belum melaporkan kemajuan unggah */
  function kirimBerkas(url, berkas, kemajuan, pegang) {
    return new Promise((ok, tidak) => {
      const x = new XMLHttpRequest(); pegang?.(x);
      x.onabort = () => tidak(new Error("Unggah dibatalkan."));
      x.open("POST", url); x.setRequestHeader("x-pb", "1"); x.setRequestHeader("content-type", "application/octet-stream");
      x.upload.onprogress = e => e.lengthComputable && kemajuan(Math.round(e.loaded / e.total * 100));
      x.onerror = () => tidak(new Error("Tidak tersambung ke server. Periksa jaringan lalu coba lagi."));
      x.onload = () => { let j = {}; try { j = JSON.parse(x.responseText); } catch (e) {} if (x.status >= 200 && x.status < 300) { if (bacaTanda()) tulisTanda(false); ok(j); } else tidak(galatHttp(x.status, j)); };
      x.send(berkas);
    });
  }

  const S = {model: [], agen: [], percakapan: [], alat: null, agenAktif: null, pid: null, pesan: [], menunggu: false, hal: 1, sumber: [], jenisOk: JENIS_BAWAAN, maks: MAKS_BERKAS_BAWAAN};
  const pesanGalat = t => { const g = $("#aiGalat"); g.textContent = t || ""; g.hidden = !t; };

  /* ---------- panel kiri ---------- */
  function gambarRiwayat() {
    const w = $("#aiRiwayat");
    if (!S.percakapan.length) return w.replaceChildren(el("li", {class: "ai-kosong", teks: "Belum ada percakapan."}));
    w.replaceChildren(...S.percakapan.map(p => el("li", {class: "ai-butir" + (p.id === S.pid ? " aktif" : ""), "data-id": p.id},
      el("button", {type: "button", class: "ai-butir-isi", onclick: () => bukaPercakapan(p.id)},
        el("span", {class: "ai-butir-judul", teks: p.judul || "Tanpa judul"}),
        el("span", {class: "ai-butir-sub", teks: [p.agen_nama, fmtTanggal(p.diubah)].filter(Boolean).join(", ")})),
      tombolIkon("hapus", "Hapus percakapan", () => hapusPercakapan(p)))));
  }
  function gambarDaftarAgen() {
    const w = $("#aiAgen"), d = saring(S.agen, $("#aiCariAgen").value, ["nama", "deskripsi"]);
    if (!d.length) return w.replaceChildren(el("li", {class: "ai-kosong", teks: S.agen.length ? "Tidak ada agen yang cocok." : "Belum ada agen."}));
    w.replaceChildren(...d.map(a => el("li", {class: "ai-butir" + (a.id === S.agenAktif?.id ? " aktif" : ""), "data-id": a.id},
      el("button", {type: "button", class: "ai-butir-isi ai-butir-agen", onclick: () => pilihAgen(a)},
        el("span", {class: "ai-avatar", html: svg(ikonAvatar(a.avatar))}),
        el("span", {}, el("span", {class: "ai-butir-judul", teks: a.nama}), el("span", {class: "ai-butir-sub", teks: a.deskripsi || VISIBILITAS[a.visibilitas]?.[0] || ""}))))));
  }
  const muatRiwayat = async q => { S.percakapan = (await api("/api/ai/percakapan" + (q ? "?q=" + encodeURIComponent(q) : ""))).percakapan || []; gambarRiwayat(); };
  const muatAgen = async () => { S.agen = (await api("/api/ai/agen")).agen || []; gambarDaftarAgen(); gambarTabel(); };

  async function hapusPercakapan(p) {
    if (!await tanya(`Hapus percakapan "${p.judul || "Tanpa judul"}"? Percakapan yang dihapus tidak bisa dikembalikan.`, "Hapus")) return;
    try { await api(`/api/ai/percakapan/${encodeURIComponent(p.id)}/hapus`, {}); }
    catch (e) { return pesanGalat(e.message); }
    S.percakapan = S.percakapan.filter(x => x.id !== p.id);
    $("#aiRiwayat").querySelector(`[data-id="${CSS.escape(String(p.id))}"]`)?.remove();
    if (!S.percakapan.length) gambarRiwayat();
    if (S.pid === p.id) { S.pid = null; S.pesan = []; gambarObrol(); }
  }

  /* ---------- ruang obrol ---------- */
  function balonPesan(m) {
    const saya = m.peran === "user";
    const isi = el("div", {class: "ai-isi"});
    if (saya) isi.textContent = m.isi || "";
    else isi.innerHTML = mdKeHtml(m.isi || "");   /* aman: mdKeHtml meng-escape seluruh teks sebelum menandai pola */
    const b = el("article", {class: "ai-pesan " + (saya ? "saya" : "asisten")}, isi);
    if (!saya && m.sumber?.length) b.append(el("div", {class: "ai-sumber"}, el("span", {class: "ai-sumber-label", teks: "Sumber"}),
      el("ul", {}, ...m.sumber.map(s => el("li", {teks: formatSumber(s)})))));
    /* langkah selalu dirender; CSS menyembunyikannya bila mode penalaran mati (sakelar cukup mengganti kelas) */
    if (!saya && m.langkah?.length) b.append(el("details", {class: "ai-langkah"},
      el("summary", {teks: `Langkah alat (${fmtAngka(m.langkah.length, 0)})`}),
      el("ol", {}, ...m.langkah.map(l => el("li", {}, el("strong", {teks: namaAlat(l.alat)}),
        l.argumen != null ? el("code", {teks: typeof l.argumen === "string" ? l.argumen : JSON.stringify(l.argumen)}) : null,
        l.hasil_ringkas ? el("span", {teks: l.hasil_ringkas}) : null)))));
    return b;
  }
  const sambut = a => el("p", {class: "ai-sambut", teks: !a ? "Pilih agen di panel kiri untuk mulai bertanya." : a.deskripsi || `Tanya apa saja kepada ${a.nama}. Angka di jawaban selalu disertai sumber dan tanggal data.`});
  function kepalaObrol() {
    const a = S.agenAktif, info = infoPembuat(a);
    $("#aiNamaAgen").textContent = a ? a.nama : "Pilih agen";
    $("#aiAvatarAktif").innerHTML = svg(ikonAvatar(a?.avatar));
    $("#aiPembuat").textContent = info || ""; $("#aiPembuat").hidden = !info; $("#aiPilStaf").hidden = !info;
  }
  /* render penuh: hanya saat ganti agen atau buka riwayat. Chrome murah dulu, isi sesudah frame tercat. */
  function gambarObrol() {
    kepalaObrol();
    const w = $("#aiPesan");
    w.setAttribute("aria-busy", "true");
    w.replaceChildren(el("p", {class: "ai-sambut", teks: "Memuat…"}));
    aturKirim();
    nanti(() => {
      w.replaceChildren(...(S.pesan.length ? S.pesan.map(balonPesan) : [sambut(S.agenAktif)]));
      w.removeAttribute("aria-busy");
      w.scrollTop = w.scrollHeight;
    });
  }
  const aturKirim = () => { $("#aiKirim").disabled = S.menunggu || !S.agenAktif || !$("#aiTulis").value.trim(); };

  function pilihAgen(a) {
    S.agenAktif = a; S.pid = null; S.pesan = [];
    tutupPanel(); tandaiAktif($("#aiAgen"), a.id); tandaiAktif($("#aiRiwayat"), null);
    gambarObrol();
    if (location.hash === "#agen") location.hash = "";
    $("#aiTulis").focus();
  }
  async function bukaPercakapan(id) {
    tutupPanel(); tandaiAktif($("#aiRiwayat"), id);
    const w = $("#aiPesan"); w.setAttribute("aria-busy", "true"); w.replaceChildren(el("p", {class: "ai-sambut", teks: "Memuat percakapan…"}));
    try {
      const j = await api(`/api/ai/percakapan/${encodeURIComponent(id)}`);
      const p = j.percakapan || {};
      S.pid = id; S.pesan = j.pesan || [];
      S.agenAktif = S.agen.find(a => a.id === p.agen_id) || {id: p.agen_id, nama: p.agen_nama || "Agen", avatar: "klasik", milik_saya: true};
      tandaiAktif($("#aiAgen"), S.agenAktif.id);
      gambarObrol();
    } catch (e) { pesanGalat(e.message); w.removeAttribute("aria-busy"); w.replaceChildren(sambut(S.agenAktif)); }
  }

  /* kirim: hanya MENAMBAH balon dan indikator, tidak membangun ulang percakapan */
  async function kirim() {
    const t = $("#aiTulis"), teks = t.value.trim();
    if (!teks || S.menunggu || !S.agenAktif) return;
    S.menunggu = true; t.value = ""; aturKirim(); pesanGalat("");
    const w = $("#aiPesan"), mp = {id: "baru", peran: "user", isi: teks};
    w.querySelector(".ai-sambut")?.remove();
    const bSaya = balonPesan(mp), tunggu = el("div", {class: "ai-tunggu", role: "status"}, el("i"), el("i"), el("i"), el("span", {teks: "Agen sedang menyusun jawaban"}));
    w.append(bSaya, tunggu); w.scrollTop = w.scrollHeight;
    S.pesan.push(mp);
    let jawab = null;
    try {
      const body = {agen_id: S.agenAktif.id, pesan: teks, penalaran: $("#aiNalar").checked};
      if (S.pid) body.percakapan_id = S.pid;
      if ($("#aiModel").value) body.model = $("#aiModel").value;
      const j = await api("/api/ai/obrol", body);
      const baru = !S.pid;
      S.pid = j.percakapan_id; jawab = j.pesan; S.pesan.push(jawab);
      if (baru) muatRiwayat($("#aiCariRiwayat").value.trim()).catch(() => {});
    } catch (e) {
      S.pesan.pop(); bSaya.remove(); if (!t.value) t.value = teks; pesanGalat(e.message);
      if (!S.pesan.length) w.append(sambut(S.agenAktif));
    } finally {
      jawab ? tunggu.replaceWith(balonPesan(jawab)) : tunggu.remove();
      S.menunggu = false; aturKirim(); w.scrollTop = w.scrollHeight;
    }
  }
  async function percakapanBaru() {
    if (!S.agenAktif) return;
    if (S.pesan.length && !await tanya("Mulai percakapan baru? Percakapan ini tetap tersimpan di riwayat.", "Mulai baru")) return;
    S.pid = null; S.pesan = []; tandaiAktif($("#aiRiwayat"), null);
    $("#aiPesan").replaceChildren(sambut(S.agenAktif)); $("#aiTulis").focus();
  }

  /* ---------- kelola agen ---------- */
  function gambarTabel() {
    const d = saring(S.agen, $("#aiCariKelola").value, ["nama", "deskripsi", "pemilik_nama"]), p = halaman(d, S.hal);
    S.hal = p.halaman;
    const tb = $("#aiTabel");
    if (!d.length) tb.replaceChildren(el("tr", {}, el("td", {colspan: "7", class: "ai-kosong", teks: S.agen.length ? "Tidak ada agen yang cocok." : "Belum ada agen. Buat yang pertama."})));
    else tb.replaceChildren(...p.isi.map(a => el("tr", {},
      el("td", {"data-label": "Nama"}, el("span", {class: "ai-sel-nama"}, el("span", {class: "ai-avatar", html: svg(ikonAvatar(a.avatar))}), el("span", {teks: a.nama}))),
      el("td", {"data-label": "Visibilitas", teks: VISIBILITAS[a.visibilitas]?.[0] || a.visibilitas || ""}),
      el("td", {"data-label": "Alat", class: "n", teks: fmtAngka((a.alat || []).length, 0)}),
      el("td", {"data-label": "Deskripsi", class: "ai-sel-desk", teks: a.deskripsi || ""}),
      el("td", {"data-label": "Dibuat", class: "w", teks: fmtTanggal(a.dibuat)}),
      el("td", {"data-label": "Pembuat", teks: [a.pemilik_nama, a.unit].filter(Boolean).join(", ")}),
      el("td", {class: "a"}, tombolIkon("lihat", "Lihat agen", () => bukaForm(a, "lihat")),
        a.milik_saya ? tombolIkon("sunting", "Sunting agen", () => bukaForm(a, "sunting")) : null,
        a.milik_saya ? tombolIkon("hapus", "Hapus agen", () => hapusAgen(a)) : null))));
    $("#aiHal").textContent = `Halaman ${fmtAngka(p.halaman, 0)} dari ${fmtAngka(p.total, 0)}, ${fmtAngka(d.length, 0)} agen`;
    $("#aiHalKiri").disabled = p.halaman <= 1; $("#aiHalKanan").disabled = p.halaman >= p.total;
  }
  async function hapusAgen(a) {
    if (!await tanya(`Hapus agen "${a.nama}"? Agen yang dihapus tidak bisa dipakai lagi.`, "Hapus")) return;
    try { await api(`/api/ai/agen/${encodeURIComponent(a.id)}/hapus`, {}); await muatAgen(); if (S.agenAktif?.id === a.id) { S.agenAktif = null; S.pid = null; S.pesan = []; gambarObrol(); } }
    catch (e) { pesanGalat(e.message); }
  }
  const tampil = () => {
    const h = location.hash, kelola = h === "#agen", peng = h === "#pengetahuan";
    $("#aiObrolView").hidden = kelola || peng; $("#aiKelolaView").hidden = !kelola; $("#aiPengView").hidden = !peng;
    document.querySelectorAll(".ad-top nav a").forEach(x => x.toggleAttribute("aria-current", x.getAttribute("href") === (peng ? "#pengetahuan" : kelola ? "#agen" : "#")));
    if (peng) muatSumber().catch(e => pesanGalat(e.message));
  };

  /* ---------- pengetahuan ---------- */
  const urutSumber = penjaga();   /* respons basi (mis. berkas yang baru dihapus) tidak boleh menimpa yang lebih baru */
  async function muatSumber() {
    const g = urutSumber.maju(), j = await api("/api/ai/pengetahuan");
    if (!urutSumber.sah(g)) return;
    S.sumber = j.sumber || []; if (Array.isArray(j.jenis)) S.jenisOk = j.jenis; if (j.maks_ukuran > 0) S.maks = j.maks_ukuran;
    gambarSumber(); gambarPilihSumber();
  }
  function gambarSumber() {
    const d = saring(S.sumber, $("#aiCariPeng").value, ["nama", "berkas", "deskripsi", "pemilik_nama"]), tb = $("#aiPengTabel");
    $("#aiPengInfo").textContent = `Jenis yang didukung: ${S.jenisOk.join(", ")}. Ukuran paling besar ${fmtUkuran(S.maks)} per berkas.`;
    if (!d.length) return tb.replaceChildren(el("tr", {}, el("td", {colspan: "9", class: "ai-kosong", teks: S.sumber.length ? "Tidak ada berkas yang cocok." : "Belum ada pengetahuan. Unggah berkas pertama."})));
    tb.replaceChildren(...d.map(x => el("tr", {"data-id": x.id},
      el("td", {"data-label": "Nama"}, el("span", {teks: x.nama}), x.deskripsi ? el("span", {class: "ai-butir-sub", teks: x.deskripsi}) : null),
      el("td", {"data-label": "Jenis", teks: x.jenis || ""}),
      el("td", {"data-label": "Ukuran", class: "n", teks: fmtUkuran(x.ukuran)}),
      el("td", {"data-label": "Status indeks"}, el("span", {class: "ai-status " + (Object.hasOwn(STATUS_SUMBER, x.status) ? x.status : "gagal"), teks: teksStatus(x)})),
      el("td", {"data-label": "Visibilitas", teks: VISIBILITAS[x.visibilitas]?.[0] || x.visibilitas || ""}),
      el("td", {"data-label": "Agen", class: "n", teks: fmtAngka(x.jumlah_agen || 0, 0)}),
      el("td", {"data-label": "Pemilik", teks: [x.pemilik_nama, x.unit].filter(Boolean).join(", ")}),
      el("td", {"data-label": "Diubah", class: "w", teks: fmtTanggal(x.diubah)}),
      el("td", {class: "a"},
        x.milik_saya ? tombolIkon("ulang", "Indeks ulang", () => indeksUlang(x)) : null,
        x.milik_saya ? tombolIkon("hapus", "Hapus pengetahuan", () => hapusSumber(x)) : null))));
  }
  const tungguIndeks = (id, tampilkan, sah) => tungguStatus(async () => (await api(`/api/ai/pengetahuan/${encodeURIComponent(id)}`)).sumber, {tampilkan, sah});
  const diikuti = new Set();
  async function ikutiBaris(id) {
    if (diikuti.has(id)) return;
    diikuti.add(id);
    try { await tungguIndeks(id, null, () => location.hash === "#pengetahuan"); }
    catch (e) { pesanGalat(e.message); }
    finally { diikuti.delete(id); }
    if (location.hash === "#pengetahuan") muatSumber().catch(() => {});
  }
  async function indeksUlang(x) {
    pesanGalat("");
    try { await api(`/api/ai/pengetahuan/${encodeURIComponent(x.id)}/indeks-ulang`, {}); }
    catch (e) { return pesanGalat(e.message); }
    x.status = "antre"; x.galat = null; gambarSumber();   /* umpan balik langsung, polling menyusul */
    ikutiBaris(x.id);
  }
  async function hapusSumber(x) {
    if (!await tanya(`Hapus pengetahuan "${x.nama}"? ${x.jumlah_agen ? `Berkas ini dilepas dari ${fmtAngka(x.jumlah_agen, 0)} agen. ` : ""}Yang dihapus tidak bisa dikembalikan.`, "Hapus")) return;
    try { await api(`/api/ai/pengetahuan/${encodeURIComponent(x.id)}/hapus`, {}); }
    catch (e) { return pesanGalat(e.message); }
    urutSumber.maju(); S.sumber = S.sumber.filter(y => y.id !== x.id); gambarSumber(); gambarPilihSumber();
  }

  /* dialog unggah dua langkah */
  const U = $("#aiUnggah");
  let langkahU = 1, sibukU = false, xhrU = null;
  const genU = penjaga();
  /* tutup lewat Tutup, Esc, atau program: batalkan unggah dan polling yang masih jalan */
  U.addEventListener("close", () => { genU.maju(); xhrU?.abort(); xhrU = null; sibukU = false; });
  const galatU = g => U.querySelectorAll("[data-ug]").forEach(e => { e.textContent = g[e.dataset.ug] || ""; e.hidden = !g[e.dataset.ug]; });
  const nilaiU = () => { const f = $("#aiBerkas").files[0]; return {berkas: f?.name || "", ukuran: f?.size || 0, nama: $("#aiUgNama").value, deskripsi: $("#aiUgDesk").value, visibilitas: U.querySelector("[name=ug_vis]:checked")?.value}; };
  function aturLangkahU(n) {
    langkahU = n;
    $("#aiLangkah").textContent = n === 1 ? "Langkah 1 dari 2: pilih berkas" : "Langkah 2 dari 2: informasi berkas";
    $("#aiLangkah1").hidden = n !== 1; $("#aiLangkah2").hidden = n !== 2; $("#aiUgKembali").hidden = n !== 2;
    $("#aiUgLanjut").textContent = n === 1 ? "Lanjut" : "Unggah";
  }
  function bukaUnggah() {
    $("#aiBerkas").value = ""; $("#aiUgNama").value = ""; $("#aiUgDesk").value = ""; U.querySelector("[name=ug_vis][value=pribadi]").checked = true;
    galatU({}); $("#aiUgPesan").textContent = ""; $("#aiProgres").hidden = true; sibukU = false; $("#aiUgLanjut").disabled = false;
    $("#aiBerkasBantu").textContent = `Jenis: ${S.jenisOk.join(", ")}. Paling besar ${fmtUkuran(S.maks)}.`;
    genU.maju(); aturLangkahU(1); U.showModal();
  }
  async function lanjutUnggah(e) {
    e.preventDefault();
    if (sibukU) return;
    const opsi = {jenis: S.jenisOk, maks: S.maks};
    if (langkahU === 1) {
      const v = validasiUnggah({...nilaiU(), nama: undefined}, opsi); galatU(v.galat);
      if (!v.ok) return;
      if (!$("#aiUgNama").value) $("#aiUgNama").value = nilaiU().berkas.replace(/\.[^.]+$/, "");
      aturLangkahU(2); return $("#aiUgNama").focus();
    }
    const d = nilaiU(), v = validasiUnggah(d, opsi); galatU(v.galat);
    if (!v.ok) return;
    sibukU = true; $("#aiUgLanjut").disabled = true; $("#aiUgKembali").hidden = true; $("#aiUgPesan").textContent = "";
    const teks = $("#aiProgresTeks"), bar = $("#aiProgresBar"), g = genU.maju();
    $("#aiProgres").hidden = false; bar.value = 0; teks.textContent = "Mengunggah…";   /* cat dulu, kirim sesudah frame berikutnya */
    nanti(async () => {
      if (!genU.sah(g)) return;
      const selesai = (pesan, sembunyi) => {
        if (!genU.sah(g)) return; sibukU = false; $("#aiUgLanjut").disabled = false; $("#aiUgKembali").hidden = false; $("#aiUgPesan").textContent = pesan; if (sembunyi) $("#aiProgres").hidden = true; };
      let id;
      try { id = (await kirimBerkas(alamatUnggah(d), $("#aiBerkas").files[0], p => { if (genU.sah(g)) { bar.value = p; teks.textContent = `Mengunggah, ${fmtAngka(p, 0)}%`; } }, h => { xhrU = h; })).id; }
      catch (er) { return selesai(er.message, true); }
      xhrU = null;
      bar.removeAttribute("value"); teks.textContent = "Berkas diterima. Menunggu pengindeksan…";
      muatSumber().catch(() => {});
      let x;
      try { x = await tungguIndeks(id, r => { teks.textContent = "Pengindeksan: " + teksStatus(r); }, () => genU.sah(g)); }
      catch (er) { return selesai(er.message, false); }
      if (!genU.sah(g)) return;
      if (!x) return selesai("Pengindeksan belum selesai. Tutup dialog ini, statusnya tetap diperbarui di daftar.", false);
      muatSumber().catch(() => {});
      if (x.status === "gagal") return selesai(`Pengindeksan gagal: ${x.galat || "alasan tidak disebut"}. Tutup dialog, lalu pakai Indeks ulang atau hapus dan unggah lagi.`, false);
      U.close();
    });
  }

  /* pemilih pengetahuan di formulir agen */
  let pilihSumber = new Set();
  const hitungSumber = () => { $("#aiSumberHitung").textContent = `${fmtAngka(pilihSumber.size, 0)} dari ${fmtAngka(S.sumber.length, 0)} dipilih`; };
  function gambarPilihSumber() {
    hitungSumber();
    $("#aiSumberDaftar").replaceChildren(...(S.sumber.length ? S.sumber.map(x => el("label", {class: "ai-alat"},
      el("input", {type: "checkbox", value: x.id, checked: pilihSumber.has(x.id), onchange: e => { e.target.checked ? pilihSumber.add(x.id) : pilihSumber.delete(x.id); hitungSumber(); }}),
      el("span", {}, el("strong", {teks: x.nama}), el("span", {class: "ai-butir-sub", teks: [VISIBILITAS[x.visibilitas]?.[0], labelStatus(x.status)].filter(Boolean).join(", ")})))) : [el("p", {class: "ai-kosong", teks: "Belum ada pengetahuan. Unggah dulu di bagian Pengetahuan."})]));
  }
  const galatSumber = t => { const g = $("#aiSumberGalat"); g.textContent = t || ""; g.hidden = !t; };

  /* ---------- formulir agen ---------- */
  const F = $("#aiForm"), fm = F.querySelector("form"), fs = F.querySelector("fieldset");
  let modeForm = "baru", idForm = null, pilihAlat = new Set();
  const nilaiForm = () => ({nama: fm.nama.value.trim(), avatar: fm.avatar.value, suhu: Number(fm.suhu.value), instruksi: fm.instruksi.value.trim(),
    deskripsi: fm.deskripsi.value.trim(), visibilitas: fm.visibilitas.value, alat: [...pilihAlat], alih_manusia: fm.alih_manusia.checked});
  /* langsung (murah): penghitung dan peringatan. Ditunda 150 ms: pratinjau dan label suhu. */
  function hitungInstruksi() {
    const kata = hitungKata(fm.instruksi.value);
    $("#aiHitung").textContent = `${fmtAngka(fm.instruksi.value.length, 0)} karakter, ${fmtAngka(kata, 0)} kata`;   /* NF modul: murah */
    $("#aiKurang").hidden = !kata || kata >= MIN_KATA;
  }
  function segarPratinjau() {
    const d = nilaiForm();
    $("#aiSuhuNilai").textContent = `${fmtAngka(d.suhu)} ${labelSuhu(d.suhu)}`;
    $("#aiPratinjau").textContent = pratinjau(d);
  }
  const segarPratinjauNanti = tunda(segarPratinjau, 150);
  const segarForm = () => { hitungInstruksi(); segarPratinjau(); };
  function gambarAlat() {
    const semua = S.alat || [], d = saring(semua, $("#aiCariAlat").value, ["nama", "deskripsi"]);
    $("#aiAlatDaftar").replaceChildren(...(d.length ? d.map(a => el("label", {class: "ai-alat"},
      el("input", {type: "checkbox", value: a.nama, checked: pilihAlat.has(a.nama), onchange: e => { e.target.checked ? pilihAlat.add(a.nama) : pilihAlat.delete(a.nama); hitungAlat(); }}),
      el("span", {}, el("strong", {teks: namaAlat(a.nama)}), el("span", {class: "ai-butir-sub", teks: a.deskripsi || ""})))) : [el("p", {class: "ai-kosong", teks: semua.length ? "Tidak ada alat yang cocok." : "Belum ada alat."})]));
    hitungAlat();
  }
  const hitungAlat = () => { $("#aiAlatHitung").textContent = `${fmtAngka(pilihAlat.size, 0)} dari ${fmtAngka((S.alat || []).length, 0)} dipilih`; segarPratinjauNanti(); };
  /* Pilih semua / Kosongkan: ubah centang yang sudah tampil (sesuai cari), tanpa membangun ulang daftar */
  function centangSemua(nilai) {
    $("#aiAlatDaftar").querySelectorAll("input[type=checkbox]").forEach(c => { c.checked = nilai; nilai ? pilihAlat.add(c.value) : pilihAlat.delete(c.value); });
    hitungAlat();
  }
  const galatIsian = galat => F.querySelectorAll("[data-galat]").forEach(g => { g.textContent = galat[g.dataset.galat] || ""; g.hidden = !galat[g.dataset.galat]; });

  async function bukaForm(a, mode) {
    modeForm = a ? mode : "baru"; idForm = a?.id || null;
    fm.reset(); galatIsian({}); galatSumber(""); $("#aiFormPesan").textContent = "";
    $("#aiFormJudul").textContent = {baru: "Agen baru", sunting: "Sunting agen", lihat: "Lihat agen"}[modeForm];
    $("#aiSimpan").hidden = modeForm === "lihat";
    fs.disabled = true; $("#aiFormMuat").hidden = false; $("#aiAlatDaftar").replaceChildren(); $("#aiSumberDaftar").replaceChildren(); pilihSumber = new Set();
    F.showModal();   /* chrome dulu; isi menyusul sesudah fetch */
    let d = {nama: "", avatar: "klasik", suhu: SUHU_BAWAAN, instruksi: "", deskripsi: "", visibilitas: "pribadi", alat: [], alih_manusia: false};
    try {
      const [alat, , j] = await Promise.all([S.alat ? null : api("/api/ai/alat"), muatSumber().catch(() => {}), a ? api(`/api/ai/agen/${encodeURIComponent(a.id)}`) : null]);
      if (alat) S.alat = alat.alat || [];
      if (j) d = {...d, ...a, ...(j.agen || j)};
    } catch (e) { $("#aiFormMuat").hidden = true; $("#aiFormPesan").textContent = e.message; return; }
    if (!F.open) return;
    fm.nama.value = d.nama || ""; fm.suhu.value = d.suhu ?? SUHU_BAWAAN; fm.instruksi.value = d.instruksi || ""; fm.deskripsi.value = d.deskripsi || "";
    fm.avatar.value = avatarSah(d.avatar) ? d.avatar : "klasik"; fm.visibilitas.value = visibilitasSah(d.visibilitas) ? d.visibilitas : "pribadi";
    fm.alih_manusia.checked = !!d.alih_manusia; pilihAlat = new Set(d.alat || []);
    pilihSumber = new Set((d.sumber || []).map(x => x.id)); galatSumber(""); gambarPilihSumber();
    $("#aiCariAlat").value = ""; gambarAlat(); segarForm();
    $("#aiFormMuat").hidden = true; fs.disabled = modeForm === "lihat";
    if (modeForm !== "lihat") fm.nama.focus();
  }
  async function simpanForm(e) {
    e.preventDefault();
    if (modeForm === "lihat") return F.close();
    const d = nilaiForm(), v = validasiAgen(d);
    galatIsian(v.galat);
    if (!v.ok) return fm.elements[Object.keys(v.galat)[0]]?.focus?.();
    const t = $("#aiSimpan"); t.disabled = true;
    try {
      const j = await api(idForm ? `/api/ai/agen/${encodeURIComponent(idForm)}` : "/api/ai/agen", d);
      const id = idForm || j.id;
      try { if (id) await api(`/api/ai/agen/${encodeURIComponent(id)}/sumber`, {sumber: [...pilihSumber]}); }
      catch (er) {
        /* agen sudah tersimpan; alasan penolakan (mis. 409 visibilitas berkas lebih sempit) tampil di bagian Pengetahuan, formulir tetap terbuka */
        idForm = id; modeForm = "sunting"; $("#aiFormJudul").textContent = "Sunting agen";
        galatSumber(`Agen tersimpan, tetapi pengetahuan belum terpasang: ${er.message}`); await muatAgen(); return;
      }
      F.close(); await muatAgen();
    } catch (er) { $("#aiFormPesan").textContent = er.message; }
    finally { t.disabled = false; }
  }
  async function tulisInstruksi() {
    const nama = fm.nama.value.trim(), deskripsi = fm.deskripsi.value.trim();
    if (!nama && !deskripsi) return galatIsian({instruksi: "Isi nama atau deskripsi dulu supaya AI tahu agen apa yang dibuat."});
    if (fm.instruksi.value.trim() && !await tanya("Ganti instruksi yang sudah ditulis dengan draf dari AI?", "Ganti")) return;
    const t = $("#aiTulisAI"); t.disabled = true; t.textContent = "Menulis…";
    try { fm.instruksi.value = (await api("/api/ai/agen/tulis-instruksi", {nama, deskripsi})).instruksi || ""; galatIsian({}); segarForm(); }
    catch (e) { galatIsian({instruksi: e.message}); }
    finally { t.disabled = false; t.textContent = "Tulis instruksi dengan AI"; }
  }

  /* ---------- panel kiri di layar sempit ---------- */
  const panel = $("#aiPanel"), burger = $("#aiBurger");
  function tutupPanel() { panel.classList.remove("buka"); burger.setAttribute("aria-expanded", "false"); }
  burger.addEventListener("click", () => { const b = panel.classList.toggle("buka"); burger.setAttribute("aria-expanded", String(b)); });
  document.addEventListener("click", e => { if (panel.classList.contains("buka") && !panel.contains(e.target) && !burger.contains(e.target)) tutupPanel(); });
  document.addEventListener("keydown", e => { if (e.key === "Escape" && panel.classList.contains("buka")) tutupPanel(); });

  /* ---------- pasang ---------- */
  $("#aiTulis").addEventListener("keydown", e => { if (e.key === "Enter" && !e.shiftKey && !e.isComposing) { e.preventDefault(); kirim(); } });
  $("#aiTulis").addEventListener("input", aturKirim);
  $("#aiFormKirim").addEventListener("submit", e => { e.preventDefault(); kirim(); });
  $("#aiBaru").addEventListener("click", percakapanBaru);
  $("#aiNalar").addEventListener("change", e => $("#aiPesan").classList.toggle("nalar", e.target.checked));
  $("#aiCariAgen").addEventListener("input", tunda(gambarDaftarAgen, 150));
  $("#aiCariRiwayat").addEventListener("input", tunda(e => muatRiwayat(e.target.value.trim()).catch(er => pesanGalat(er.message)), 300));
  $("#aiCariKelola").addEventListener("input", tunda(() => { S.hal = 1; gambarTabel(); }, 150));
  $("#aiHalKiri").addEventListener("click", () => { S.hal--; gambarTabel(); });
  $("#aiHalKanan").addEventListener("click", () => { S.hal++; gambarTabel(); });
  document.querySelectorAll("[data-agen-baru]").forEach(b => b.addEventListener("click", () => bukaForm(null)));
  fm.addEventListener("input", e => { if (e.target.name === "cari_alat") return; if (e.target.name === "instruksi") hitungInstruksi(); segarPratinjauNanti(); });
  fm.addEventListener("submit", simpanForm);
  $("#aiBatal").addEventListener("click", () => F.close());
  $("#aiTulisAI").addEventListener("click", tulisInstruksi);
  $("#aiUnggahBuka").addEventListener("click", bukaUnggah);
  $("#aiCariPeng").addEventListener("input", tunda(gambarSumber, 150));
  $("#aiUgTutup").addEventListener("click", () => U.close());
  $("#aiUgKembali").addEventListener("click", () => { galatU({}); aturLangkahU(1); });
  U.querySelector("form").addEventListener("submit", lanjutUnggah);
  $("#aiCariAlat").addEventListener("input", tunda(gambarAlat, 120));
  $("#aiPilihSemua").addEventListener("click", () => centangSemua(true));
  $("#aiKosongkan").addEventListener("click", () => centangSemua(false));
  addEventListener("hashchange", tampil);
  tampil();

  (async () => {
    try {
      const [m, a] = await Promise.all([api("/api/ai/model"), api("/api/ai/agen"), muatRiwayat()]);
      S.model = m.model || []; S.agen = a.agen || [];
      $("#aiModel").replaceChildren(...S.model.map(x => el("option", {value: x.id, teks: x.nama + (x.alat === false ? " (tanpa alat)" : "")})));
      if (S.agen.length) S.agenAktif = S.agen[0];
      gambarDaftarAgen(); gambarTabel(); gambarObrol();
      $("#aiApp").removeAttribute("aria-busy");
    } catch (e) { pesanGalat(e.message); }
  })();
}
