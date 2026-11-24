"use strict";
/* Tabel bersama (public/inti): paginasi dan pengurut kepala kolom. Butuh format.js (fmt). */
/* paginasi bergaya pangantara: "Menampilkan a–b dari n", Sebelumnya, nomor (dengan jeda …), Berikutnya; tombol membawa data-h (0-basis) */
function paginasi(hal, total, per, satuan = "baris") {
  const jml = Math.max(1, Math.ceil(total / per)); if (jml <= 1) return `<nav class="pgn"><p>${fmt(total)} ${satuan}</p></nav>`;
  const a = Math.min(Math.max(0, hal), jml - 1) + 1, dari = (a - 1) * per + 1, sampai = Math.min(a * per, total);
  const nomor = new Set([1, jml, a - 1, a, a + 1]); if (a <= 3) [2, 3, 4].forEach(n => nomor.add(n)); if (a >= jml - 2) [jml - 1, jml - 2, jml - 3].forEach(n => nomor.add(n));
  let prev = 0, deret = ""; [...nomor].filter(n => n >= 1 && n <= jml).sort((x, y) => x - y).forEach(n => { if (prev && n - prev > 1) deret += `<span class="pgn-j">…</span>`;
    deret += `<button type="button" class="pgn-b${n === a ? " on" : ""}" data-h="${n - 1}"${n === a ? ' aria-current="page"' : ""}>${n}</button>`; prev = n; });
  return `<nav class="pgn" aria-label="Paginasi"><p>Menampilkan ${fmt(dari)}–${fmt(sampai)} dari ${fmt(total)} ${satuan}</p><div>
    <button type="button" class="pgn-b" data-h="${a - 2}" ${a <= 1 ? "disabled" : ""}>‹ Sebelumnya</button>${deret}<button type="button" class="pgn-b" data-h="${a}" ${a >= jml ? "disabled" : ""}>Berikutnya ›</button></div></nav>`;
}
/* kepala kolom yang bisa diurut: <th><button data-k="kolom"><i></i></button></th>; st = {urut, turun, hal}; ulang() menggambar ulang */
function pengurutKepala(st, th, ulang) {
  th.addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return; const k = b.dataset.k;
        st.turun = st.urut === k ? !st.turun : true; st.urut = k; st.hal = 0;
        th.querySelectorAll("button").forEach(x => x.querySelector("i").textContent = x === b ? (st.turun ? "↓" : "↑") : "");
    ulang(); });
}
/* tabel standar siap pakai: o = {kolom:[[kunci,judul,kanan?]], sel(r,kunci)->html, nilai(r,kunci)->nilai urut, urut, turun, per=10, satuan, pilih?(r), kosong?}
   Menggambar ke el; baris klik (pilih) membawa kelas .on. Pengurut & paginasi: chrome urgent, isi lewat nanti(). Mengembalikan {set(baris)}. */
function pasangTabel(el, o) {
  const st = {urut: o.urut, turun: !!o.turun, hal: 0}, per = o.per || 10, tunda = window.nanti || (f => setTimeout(f, 0)); let B = [], F = [], pilih = -1, kotor = true;
  const gambar = () => {
    if (kotor) F = B.map((r, i) => [r, i]).sort((x, y) => { const a = o.nilai(x[0], st.urut), b = o.nilai(y[0], st.urut); return (a < b ? -1 : a > b ? 1 : 0) * (st.turun ? -1 : 1); });
    kotor = false;
    st.hal = Math.min(st.hal, Math.max(0, Math.ceil(F.length / per) - 1));
    const bar = F.slice(st.hal * per, (st.hal + 1) * per).map(([r, i]) => `<tr data-i="${i}"${o.pilih ? ' class="klik' + (i === pilih ? " on" : "") + '" tabindex="0"' : ""}>${o.kolom.map(([k, , n]) => `<td${n ? ' class="n"' : ""}>${o.sel(r, k)}</td>`).join("")}</tr>`).join("");
    el.innerHTML = F.length ? `<div class="tw kj-tw"><table class="kj-tb"><thead><tr>${o.kolom.map(([k, t, n]) => `<th${n ? ' class="n"' : ""}><button data-k="${k}">${t}<i>${st.urut === k ? (st.turun ? "↓" : "↑") : ""}</i></button></th>`).join("")}</tr></thead><tbody>${bar}</tbody></table></div>${paginasi(st.hal, F.length, per, o.satuan)}` : `<p class="kosong">${o.kosong || "Tidak ada data."}</p>`;
    const th = el.querySelector("thead"); if (th) pengurutKepala(st, th, () => { kotor = true; tunda(gambar); });
  };
  el.addEventListener("click", e => {
    const b = e.target.closest(".pgn-b[data-h]"); if (b) { if (!b.disabled) {
      el.querySelectorAll(".pgn-b.on").forEach(x => { x.classList.remove("on"); x.removeAttribute("aria-current"); });
      if (/^\d+$/.test(b.textContent.trim())) { b.classList.add("on"); b.setAttribute("aria-current", "page"); }
      st.hal = +b.dataset.h; tunda(gambar); } return; }
    const tr = e.target.closest("tr.klik"); if (!tr || e.target.closest("a")) return;
    el.querySelectorAll("tr.on").forEach(x => x.classList.remove("on")); tr.classList.add("on"); pilih = +tr.dataset.i; o.pilih(B[pilih]); });
  el.addEventListener("keydown", e => { if (e.key === "Enter" && e.target.matches?.("tr.klik")) e.target.click(); });
  return {set(baris) { B = baris; st.hal = 0; pilih = -1; kotor = true; gambar(); }};
}

/* Segmen ukuran tabel provinsi (PB-76, F-39, D15): SATU mesin; adaptor bencana memasok katalog ukuran dan angkanya dari data halaman.
   Menyala hanya bila /bencana.json mencantumkan slug di kemampuan.layar.ukuran_provinsi untuk id itu (daftar kosong = tanpa segmen).
   katalog = [{slug, label, ...}]; ukuranDiizinkan mengembalikan katalog yang disaring registri, urutan katalog; segmenUkuran menggambar
   segmen (tombol membawa data-ukuran-k); ukuranRegistri memuat /bencana.json sekali (registri gagal = []). Mesin tidak menghitung angka. */
function ukuranDiizinkan(daftar, id, katalog) {
  const z = (daftar || []).find(b => b.id === id)?.kemampuan?.layar?.ukuran_provinsi;
  return Array.isArray(z) ? katalog.filter(k => z.includes(k.slug)) : [];
}
function segmenUkuran(izin, aktif) {
  return izin.length ? `<div class="seg penuh" role="group" aria-label="Ukuran provinsi" data-ukuran>${izin.map(k => `<button type="button" data-ukuran-k="${k.slug}" aria-pressed="${k.slug === aktif}">${k.label}</button>`).join("")}</div>` : "";
}
function ukuranRegistri() {
  return ukuranRegistri.p ||= typeof fetch === "function" ? fetch("/bencana.json").then(r => r.ok ? r.json() : Promise.reject(new Error("registri " + r.status))).then(j => j.bencana || [], () => []) : Promise.resolve([]);
}

/* Rentang waktu tab Kejadian (pola gempa, pemilik 16 dan 23 Nov 2026): "Rentang waktu 7 | 14 | 30 hari" + tombol "Pilih tanggal" (kalender inti,
   hanya tanggal yang punya kejadian, D16). st memakai kunci rentang ("7"/"14"/"30") dan tgl (ISO WIB atau null).
   mulai = k => waktu mulai kejadian (string ISO atau ms). akhir (opsional) = k => waktu akhir (null = masih aktif): bila ada, kejadian
   ikut bila masih berlangsung di rentang atau tanggal itu (cuaca, udara, gunung api); tanpa akhir, kejadian ikut bila MULAI di rentang (gempa). */
const RentangKj = {
  OPSI: [["7", "7 hari"], ["14", "14 hari"], ["30", "30 hari"]],
  IKAL: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/></svg>',
  wib: t => new Date((typeof t === "number" ? t : Date.parse(t)) + 7 * 36e5).toISOString().slice(0, 10),
  pendek: iso => new Date(iso + "T12:00:00Z").toLocaleDateString("id-ID", {day: "numeric", month: "short", year: "numeric", timeZone: "UTC"}),
  ms: t => typeof t === "number" ? t : Date.parse(t),
  /* tanggal WIB yang dilalui kejadian (paling banyak 90 hari ke belakang dari akhir) */
  hari(k, mulai, akhir) { const m = mulai(k); if (!m) return []; const a0 = RentangKj.wib(m); if (!akhir) return [a0];
    const z = RentangKj.wib(akhir(k) || Date.now()), out = []; let t = z; while (t >= a0 && out.length < 90) { out.push(t); t = new Date(Date.parse(t + "T00:00:00Z") - 864e5).toISOString().slice(0, 10); } return out; },
  saring(K, st, mulai, akhir) { const batas = Date.now() - +(st.rentang || 30) * 864e5;
    return (K || []).filter(k => { const m = mulai(k); if (!m) return !st.tgl;
      if (st.tgl) return RentangKj.hari(k, mulai, akhir).includes(st.tgl);
      return akhir ? RentangKj.ms(akhir(k) || Date.now()) >= batas : RentangKj.ms(m) >= batas; }); },
  /* kartu tab Kejadian standar semua bencana (rupa gempa, pemilik 23 Nov 2026: "bagus kayak gini, bikin yang lain sebagus gempa"):
     kepala nama seksi berikon, pemilih rentang di kontrol kepala, tabel menempel (.tw.ex-tabel), sumber di title judul tanpa kaki.
     o = {nama, sumber, pil (opsional, HTML pil di sebelah judul), isi} */
  kartu(st, o) { const ik = (typeof Kartu !== "undefined" && Kartu.ikonSeksi?.(o.nama)) || "";
    return `<article class="ex ex-std kj-kartu" data-kp="1"><header class="ex-hd"><div class="ex-jd"><h3${o.sumber ? ` title="${esc(o.sumber)}"` : ""}>${ik}${esc(o.nama)}${o.pil ? " " + o.pil : ""}</h3></div><div class="ctl">${RentangKj.alat(st)}</div></header><div class="ex-bd">${o.isi}</div></article>`; },
  ket: st => st.tgl ? "tanggal " + RentangKj.pendek(st.tgl) : (st.rentang || 30) + " hari terakhir",
  alat(st) { const seg = `<div class="seg" role="group">${RentangKj.OPSI.map(([v, n]) => `<button data-set="rentang" data-v="${v}" aria-pressed="${!st.tgl && String(st.rentang || 30) === v}">${n}</button>`).join("")}</div>`;
    return `<div class="kj-alat"><span class="kj-alat-l">Rentang waktu</span>${seg}<button type="button" class="kj-tgl" data-kj-tgl aria-haspopup="dialog" aria-pressed="${!!st.tgl}">${RentangKj.IKAL}${st.tgl ? esc(RentangKj.pendek(st.tgl)) : "Pilih tanggal"}</button></div>`; },
  /* dipanggil dari penangan klik tab Kejadian; true = klik sudah ditangani. o = {K, mulai, gambar, satuan, ket} */
  klik(e, st, o) {
    if (e.type !== "click") return false;
    const rg = e.target.closest('button[data-set="rentang"]');
    if (rg) { if (rg.dataset.v !== String(st.rentang) || st.tgl) { st.rentang = rg.dataset.v; st.tgl = null; st.hal = 0; nanti(o.gambar); } return true; }
    const kt = e.target.closest("[data-kj-tgl]"); if (!kt) return false;
    if (typeof Kalender === "undefined") return true;
    const j = {}; for (const k of o.K() || []) for (const t of RentangKj.hari(k, o.mulai, o.akhir)) j[t] = (j[t] || 0) + 1;
    const hi = RentangKj.wib(Date.now());
    Kalender.buka({tombol: kt, hariIni: hi, terpilih: st.tgl || hi, judul: "Pilih tanggal kejadian", satuan: o.satuan || "kejadian", ket: o.ket || "Angka = jumlah kejadian yang mulai hari itu.",
      terbanyak: {judul: "Terbanyak", n: 6}, muat: async () => ({jumlah: j}), bisa: t => t in j, pilih: t => { st.tgl = t; st.hal = 0; nanti(o.gambar); }});
    return true; }
};
