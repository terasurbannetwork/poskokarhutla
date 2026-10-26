/* Layar Pimpinan (/admin/pimpinan): satu layar lintas sistem, dirakit di peramban dari API admin dan JSON yang SUDAH ada (tanpa rute data baru).
   Tiap kartu dimuat sendiri-sendiri: kartu yang gagal menjadi "belum ada data", kartu lain tetap tampil. Angka pipeline tidak dihitung ulang di sini;
   kejadian dan tingkat per bencana dibaca lewat /bnpb/ringkas_bencana.js (dipakai juga oleh /sitrep). CSP admin: tanpa skrip/gaya inline, semua teks lewat esc(). */
(() => {
  const {esc} = Admin;   // public/admin/bersama.js
  const app = document.getElementById("app"), aksiJudul = document.getElementById("aksiJudul");
  const ID = new Intl.NumberFormat("id-ID", {maximumFractionDigits: 1}), N0 = new Intl.NumberFormat("id-ID", {maximumFractionDigits: 0});
  const svg = d => `<svg viewBox="0 0 24 24" aria-hidden="true">${d}</svg>`;
  const IK = {
    api: svg('<path d="M12 3c1 3 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-5 1-9z"/>'), peta: svg('<path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/>'),
    rapor: svg('<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>'), bahaya: svg('<path d="M12 3 2 20h20z"/><path d="M12 10v5M12 18v.5"/>'), orang: svg('<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/>'),
    pesan: svg('<path d="M21 12a8 8 0 0 1-11.5 7.2L4 20l1-4.5A8 8 0 1 1 21 12z"/>'), uang: svg('<circle cx="12" cy="12" r="9"/><path d="M9 9.5c0-1.2 1.3-2 3-2s3 .8 3 2-1.3 1.8-3 2-3 .8-3 2 1.3 2 3 2 3-.8 3-2"/>'),
    lonceng: svg('<path d="M6 9a6 6 0 0 1 12 0c0 6 2 7 2 7H4s2-1 2-7z"/><path d="M10 20a2 2 0 0 0 4 0"/>'), perisai: svg('<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/>'),
    naik: svg('<path d="M12 19V5M5 12l7-7 7 7"/>'), turun: svg('<path d="M12 5v14M19 12l-7 7-7-7"/>'), tetap: svg('<path d="M5 12h14"/>'), ok: svg('<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>'),
    waktu: svg('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'), buka: svg('<path d="M7 17 17 7M9 7h8v8"/>'), cetak: svg('<path d="M6 9V3h12v6M6 18H4v-7h16v7h-2M7 14h10v7H7z"/>'), info: svg('<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>'),
  };
  const WARNA = {ok: "var(--c4)", bahaya: "var(--c1)", tunggu: "var(--c3)", info: "var(--c5)"};
  const pil = (teks, ikon, ton, warna) => `<span class="pm-pil" data-w="${esc(warna || WARNA[ton || "info"])}">${ikon ? IK[ikon] : ""}${esc(teks)}</span>`;
  const sumber = t => `<p class="pm-sumber">Sumber: ${esc(t)}</p>`;
  const kosong = (t = "Belum ada data.") => `<p class="pm-kosong">${IK.info}${esc(t)}</p>`;
  const ukur = (nilai, label, ton) => `<div class="pm-ukur${ton ? " t-" + ton : ""}"><b>${esc(nilai)}</b><span>${esc(label)}</span></div>`;
  /* angka perkiraan dibulatkan agar tidak berpresisi palsu: 8.528.782 -> "8,5 juta", 260.002 -> "260 ribu" */
  const kira = n => n >= 1e6 ? ID.format(Math.round(n / 1e5) / 10) + " juta" : n >= 1e5 ? N0.format(Math.round(n / 1e3)) + " ribu" : n >= 1e3 ? ID.format(Math.round(n / 100) / 10) + " ribu" : N0.format(n);
  const rp = n => n >= 1e12 ? "Rp" + ID.format(Math.round(n / 1e11) / 10) + " triliun" : n >= 1e9 ? "Rp" + (n >= 1e11 ? N0.format(Math.round(n / 1e9)) : ID.format(Math.round(n / 1e8) / 10)) + " miliar" : "Rp" + N0.format(Math.round(n / 1e6)) + " juta";
  const jam = ms => { const j = Math.floor(ms / 36e5); return j < 48 ? `${N0.format(j)} jam` : `${N0.format(Math.floor(j / 24))} hari`; };
  const wib = t => new Date(t).toLocaleTimeString("id-ID", {timeZone: "Asia/Jakarta", hour: "2-digit", minute: "2-digit", hour12: false}).replace(".", ":") + " WIB";
  const dummy = () => localStorage.getItem("pm_dummy") === "1", dq = () => dummy() ? "?dummy=1" : "";

  /* ---------- pengambilan: kegagalan jadi {g}, tidak melempar ---------- */
  const api = async (u, nama) => { try { return {j: await Admin.ambil(u, nama)}; } catch (e) { return {g: e.message}; } };
  const statis = u => fetch(u, {cache: "no-cache"}).then(r => r.ok ? r.json() : null).catch(() => null);
  const muatSkrip = u => new Promise(ok => { const s = document.createElement("script"); s.src = u; s.onload = s.onerror = ok; document.head.append(s); });

  /* ---------- kerangka kartu ---------- */
  const KARTU = [
    ["sit", "Situasi per bencana", "api", "/bnpb/sitrep", "pm-penuh"], ["pri", "Prioritas dampak hari ini", "peta", "/bnpb/risiko", "pm-4"], ["rap", "Rapor BPBD: skor terendah", "rapor", "/admin/meja", "pm-5"],
    ["bhy", "Tanda bahaya lintas meja", "bahaya", "/admin/meja", "pm-3"], ["rel", "Relawan", "orang", "/admin/relawan", "pm-b3"], ["aln", "Alun-alun: butuh bantuan", "pesan", "/admin/alun", "pm-b3"],
    ["keb", "Kebutuhan 30 hari", "uang", "/bnpb/kebutuhan", "pm-b3"], ["png", "Pengingat terbuka", "lonceng", "/admin/pengingat", "pm-b3"]];
  const kartuHtml = ([id, judul, ik, href, kls]) => `<section class="pm-k ${kls}" id="k_${id}"><h2>${IK[ik]}<span>${esc(judul)}</span><a class="pm-buka" href="${esc(href)}" aria-label="Buka ${esc(judul)}">Rincian${IK.buka}</a></h2><div class="pm-isi"><p class="pm-kosong">Memuat…</p></div></section>`;
  const isi = (id, html) => { const e = document.querySelector(`#k_${id} .pm-isi`); if (!e) return; e.innerHTML = html; e.querySelectorAll("[data-w]").forEach(x => x.style.setProperty("--w", x.dataset.w)); };
  const tabel = (kolom, baris) => `<div class="ad-tabel-wadah"><table class="ad-tabel"><thead><tr>${kolom.map(k => `<th>${esc(k)}</th>`).join("")}</tr></thead><tbody>${baris.join("")}</tbody></table></div>`;

  /* ---------- 1. situasi ---------- */
  async function situasi() {
    const [reg, gunung] = await Promise.all([statis("/bencana.json"), statis("/banjir/data/gunungapi_status.json")]);
    if (!reg) return isi("sit", kosong("Daftar bencana belum bisa dimuat."));
    const K = RingkasBencana.KONFIG, lap = {};
    await Promise.all((reg.bencana || []).filter(b => K[b.id] && K[b.id].t !== "gunung").map(async b => { lap[b.id] = await statis(K[b.id].u); }));
    const baris = RingkasBencana.kejadian(reg, lap, gunung, "");
    isi("sit", `<div class="pm-sit">${baris.map(r => {
      const titik = `<i class="pm-titik" data-w="${esc(r.b.warna || "#4f8fc4")}"></i>`;
      if (r.belum) return `<div class="pm-bc muda"><h3>${titik}${esc(r.b.nama)}</h3><p class="pm-kosong">${esc(r.belum)}</p></div>`;
      const tren = r.ubah.ikon ? `<span class="pm-tren ${r.ubah.kelas || ""}">${IK[r.ubah.ikon]}${esc(r.ubah.t)}</span>` : "";
      return `<div class="pm-bc"><h3>${titik}${esc(r.b.nama)}</h3><div class="pm-angka"><b>${esc(RingkasBencana.F(r.angka, r.utama?.desimal | 0))}</b><small>${esc(r.satuan || "")}</small></div>
        <div class="pm-bc-baris">${r.tingkat ? pil(r.tingkat.nama, "perisai", null, r.tingkat.warna) : `<span class="pm-redup">tanpa tingkat</span>`}${tren}</div></div>`;
    }).join("")}</div>${sumber("laporan harian tiap bencana (hari lengkap terakhir), registry tingkat Centurisk97")}`);
  }

  /* ---------- 2. prioritas dampak ---------- */
  async function prioritas() {
    const d = await statis("/banjir/data/risiko_prioritas.json");
    if (!d?.ringkas) return isi("pri", kosong());
    const r = d.ringkas, atas = (d.kec || []).slice(0, 5);
    isi("pri", `<div class="pm-ukurbaris">${ukur(N0.format(r.kecamatan), "kecamatan")}${ukur("±" + kira(r.jiwa), "jiwa")}</div>
      <div class="pm-pils">${pil(d.label || "indeks komposit, belum diuji balik", "info", "tunggu")}${d.usang ? pil("data lama", "waktu", "bahaya") : ""}</div>
      ${atas.length ? tabel(["Kecamatan", "Bahaya", "Jiwa"], atas.map(k => `<tr><td data-label="Kecamatan"><b>${esc(k.kec)}</b><small>${esc(k.kab)}</small></td><td data-label="Bahaya">${esc(k.utama_nama)}</td><td data-label="Jiwa" class="n">±${esc(kira(k.dampak ?? k.pend))}</td></tr>`)) : kosong("Tidak ada kecamatan yang memenuhi syarat hari ini.")}
      ${sumber("indeks risiko kecamatan × penduduk WorldPop, " + (d.hari || "hari ini"))}`);
  }

  /* ---------- 3. rapor BPBD ---------- */
  async function rapor() {
    const {j, g} = await api("/api/meja/rapor" + dq(), "Rapor BPBD");
    if (g || !j) return isi("rap", kosong(g?.includes("belum diaktifkan") ? "Meja Kerja belum diaktifkan." : "Belum ada data."));
    const PV = RingkasBencana.PROV, ada = (j.kab || []).filter(k => k.skor != null), rendah = [...ada].sort((a, b) => a.skor - b.skor || a.kab.localeCompare(b.kab)).slice(0, 10);
    if (!rendah.length) return isi("rap", kosong("Belum ada kabupaten yang punya skor."));
    isi("rap", `<div class="pm-pils">${pil(`${N0.format(ada.length)} kabupaten bernilai`, "rapor", "info")}${pil("indeks komposit, bobot sementara, belum diuji balik", "info", "tunggu")}</div>
      ${tabel(["Kabupaten", "Skor", "Respons median", "Regu aktif"], rendah.map(k => `<tr><td data-label="Kabupaten"><b>${esc(k.kab)}</b><small>${esc(PV[k.prov] || k.prov)}</small></td><td data-label="Skor" class="n">${N0.format(k.skor)}</td>
        <td data-label="Respons median" class="n">${k.respons?.median_menit != null ? ID.format(k.respons.median_menit) + " menit" : "–"}</td><td data-label="Regu aktif" class="n">${k.regu?.terdaftar ? N0.format(k.regu.aktif) + " dari " + N0.format(k.regu.terdaftar) : "–"}</td></tr>`))}
      ${sumber("Meja Kerja BPBD dan Ruang Posko, 30 hari terakhir")}`);
  }

  /* ---------- 4. tanda bahaya lintas meja ---------- */
  async function bahaya() {
    const [rk, sp] = await Promise.all([api("/api/meja/rekap" + dq(), "Meja Kerja"), api("/api/meja/spek", "Meja Kerja")]);
    if (rk.g || !rk.j?.per_kab) return isi("bhy", kosong(rk.g?.includes("belum diaktifkan") ? "Meja Kerja belum diaktifkan." : "Belum ada data."));
    const nama = Object.fromEntries((sp.j?.meja || []).map(m => [m.id, m])), baris = [];
    for (const [meja, per] of Object.entries(rk.j.per_kab)) {
      const e = Object.entries(per).filter(([, v]) => v.bahaya > 0).sort((a, b) => b[1].bahaya - a[1].bahaya), n = e.reduce((a, [, v]) => a + v.bahaya, 0);
      if (n) baris.push({meja, n, kab: e.slice(0, 2).map(([k]) => k.split("|")[1]).join(", "), arti: Object.values(nama[meja]?.bahaya || {}).join("; ")});
    }
    baris.sort((a, b) => b.n - a.n);
    const tr = new Set(Object.values(rk.j.tanpa_renkon || {}).flat()).size;
    const total = baris.reduce((a, r) => a + r.n, 0);
    isi("bhy", `<div class="pm-ukurbaris">${ukur(N0.format(total), "catatan bertanda", total ? "bahaya" : "ok")}</div>
      ${baris.length ? `<ul class="pm-daftar">${baris.slice(0, 5).map(r => `<li class="sebaris"><div>${pil(N0.format(r.n), "bahaya", "bahaya")}<b>${esc(nama[r.meja]?.nama || r.meja)}</b></div><small>${esc(r.kab)}</small></li>`).join("")}</ul>` : `<p class="pm-pils">${pil("Tidak ada tanda bahaya", "ok", "ok")}</p>`}
      ${tr ? `<p class="pm-catat">${IK.info}${N0.format(tr)} kabupaten belum punya rencana kontinjensi berlaku.</p>` : ""}
      ${sumber("Meja Kerja BPBD: logistik lebih dari 24 jam, DSP tanpa SPJ, rehab macet, stok rendah, renkon")}`);
  }

  /* ---------- 5. relawan ---------- */
  async function relawan() {
    const [rg, pm] = await Promise.all([api("/api/relawan/ringkas" + dq(), "Relawan"), api("/api/relawan/admin/permintaan", "Relawan")]);
    if (rg.g && pm.g) return isi("rel", kosong(rg.g.includes("belum diaktifkan") ? "Relawan belum diaktifkan." : "Belum ada data."));
    const R = rg.j, buka = (pm.j?.permintaan || []).filter(p => p.status === "buka" && (dummy() || !p.dummy));
    const kurang = buka.reduce((a, p) => a + Math.max(0, (p.dibutuhkan || 0) - (p.ditugaskan || 0)), 0);
    isi("rel", `<div class="pm-ukurbaris">${R ? ukur(N0.format(R.siap_tugas), "siap tugas") + ukur(N0.format(R.bertugas), "bertugas") : ""}${pm.j ? ukur(N0.format(buka.length), "permintaan terbuka", buka.length ? "tunggu" : "") : ""}</div>
      ${pm.j && buka.length ? `<p class="pm-catat">${IK.info}Masih kurang ${N0.format(kurang)} orang dari kebutuhan permintaan terbuka.</p><ul class="pm-daftar">${buka.slice(0, 2).map(p => `<li><b>${esc(p.judul)}</b><small>${esc(p.kab)}</small></li>`).join("")}</ul>` : ""}
      ${sumber("Relawan Centurisk97 (siap tugas dan bertugas dari ringkasan, permintaan dari admin)")}`);
  }

  /* ---------- 6. alun-alun ---------- */
  async function alun() {
    const {j, g} = await api("/api/alun/admin" + dq(), "Alun-alun");
    if (g || !j) return isi("aln", kosong(g?.includes("belum diaktifkan") ? "Alun-alun belum diaktifkan." : "Belum ada data."));
    const t = (j.bantuan || []).filter(u => u.bantuan === "terbuka"), lama = j.stat?.bantuan_terbuka_24j ?? 0, kini = Date.now();
    isi("aln", `<div class="pm-ukurbaris">${ukur(N0.format(t.length), "terbuka")}${ukur(N0.format(lama), "lebih dari 24 jam", lama ? "bahaya" : "ok")}</div>
      ${t.length ? `<ul class="pm-daftar">${t.slice(0, 2).map(u => `<li><b>${esc(u.judul)}</b><small>${esc([u.kab, u.prov_nama].filter(Boolean).join(", "))} · ${esc(jam(kini - u.dibuat))} lalu</small></li>`).join("")}</ul>` : `<p class="pm-pils">${pil("Tidak ada yang menunggu", "ok", "ok")}</p>`}
      ${sumber("Alun-alun, utas butuh bantuan berstatus terbuka")}`);
  }

  /* ---------- 7. kebutuhan 30 hari ---------- */
  async function kebutuhan() {
    const d = await statis("/banjir/data/kebutuhan_musim.json"), a = d?.nasional?.["rata|30"];
    if (!a || a.rp_rendah == null) return isi("keb", kosong());
    const el = d.nasional["analog|30"];
    isi("keb", `<p class="pm-rentang"><b>${esc(rp(a.rp_rendah))}</b> sampai <b>${esc(rp(a.rp_tinggi))}</b></p>
      <div class="pm-pils">${pil(d.label || "perkiraan, belum diuji balik", "info", "tunggu")}</div>
      <ul class="pm-daftar"><li><b>Penduduk terdampak asap</b><small>±${esc(kira(a.terdampak))} jiwa</small></li>
      ${el?.rp_rendah != null ? `<li><b>Bila mirip tahun El Nino</b><small>${esc(rp(el.rp_rendah))} sampai ${esc(rp(el.rp_tinggi))}</small></li>` : ""}</ul>
      ${sumber(`titik panas 2019 sampai 2025, tarif asumsi kerja, ${N0.format(a.prov_berangka)} provinsi berangka (rentang rupiah bukan selang kepercayaan)`)}`);
  }

  /* ---------- 8. pengingat (endpoint dibuat agen lain: 404/503 = sembunyikan kartu) ---------- */
  async function pengingat() {
    const {j, g} = await api("/api/pengingat/admin" + dq(), "Pengingat");
    if (g) { if (/404|belum diaktifkan/.test(g)) return document.getElementById("k_png")?.remove(); return isi("png", kosong()); }
    const semua = Array.isArray(j) ? j : j.antrean || j.pengingat || j.daftar || [], tutup = ["terkirim", "dikirim", "selesai", "ditolak", "dilewati", "dibatalkan"];
    const t = semua.filter(x => !tutup.includes(x.status) && (dummy() || !x.dummy));
    isi("png", `<div class="pm-ukurbaris">${ukur(N0.format(t.length), "menunggu kamu", t.length ? "tunggu" : "ok")}</div>
      ${t.length ? `<ul class="pm-daftar">${t.slice(0, 2).map(x => `<li><b>${esc(x.judul || x.pesan || x.jenis || "Pengingat")}</b><small>${esc([x.kab, x.jenis].filter(Boolean).join(" · "))}</small></li>`).join("")}</ul>` : `<p class="pm-pils">${pil("Tidak ada yang menunggu", "ok", "ok")}</p>`}
      ${sumber("antrean pengingat (admin yang menekan kirim)")}`);
  }

  /* ---------- dummy (DUMMY.md): 🧪 isi semua modul berurutan, 🧹 hapus; lalu muat ulang penuh ---------- */
  /* meja sebelum alun: dummy alun-alun (rantai Teruskan) menulis catatan logistik dummy, dan dummy meja menolak (409) bila sudah ada catatan dummy */
  const MODUL = ["relawan", "meja", "alun", "riset"];
  aksiJudul.innerHTML = `<button class="ad-tombol" data-cetak="1" title="Cetak satu halaman A4 lanskap" aria-label="Cetak">${IK.cetak}Cetak</button>
    <button class="ad-tombol ad-bulat" data-dummy="isi" title="Isi data dummy semua modul (relawan, alun-alun, riset, meja)" aria-label="Isi data dummy">🧪</button>
    <button class="ad-tombol ad-bulat" data-dummy="hapus" title="Hapus semua data dummy" aria-label="Hapus data dummy">🧹</button>`;
  aksiJudul.addEventListener("click", async e => {
    if (e.target.closest("[data-cetak]")) return window.print();
    const b = e.target.closest("[data-dummy]"); if (!b) return;
    const aksi = b.dataset.dummy, ps = document.getElementById("pmPesan");
    if (aksi === "hapus" && !confirm("Hapus SEMUA data dummy relawan, alun-alun, riset, dan meja kerja? Data asli tidak tersentuh.")) return;
    aksiJudul.querySelectorAll("button").forEach(x => { x.disabled = true; });
    const gagal = [];
    for (const m of MODUL) {
      ps.textContent = `${aksi === "isi" ? "Mengisi" : "Menghapus"} dummy ${m}…`; ps.className = "pm-pesan";
      try { const r = await Admin.kirim(`/api/${m}/dummy`, {aksi}); if (!r.ok && !(aksi === "isi" && r.status === 409)) gagal.push(`${m}: ${r.j.galat || r.status}`); } catch (er) { gagal.push(`${m}: ${er.message}`); }
    }
    if (gagal.length) { ps.textContent = "Sebagian gagal. " + gagal.join("; "); ps.className = "pm-pesan galat"; aksiJudul.querySelectorAll("button").forEach(x => { x.disabled = false; }); return; }
    if (aksi === "isi") localStorage.setItem("pm_dummy", "1"); else localStorage.removeItem("pm_dummy");
    location.reload();
  });

  /* ---------- mulai ---------- */
  app.className = "ad-isi pm";
  app.innerHTML = `<p class="pm-kop-cetak">Layar Pimpinan · Centurisk97 · Ruang Koordinasi</p>
    <div class="pm-grid">${KARTU.slice(0, 4).map(kartuHtml).join("")}<div class="pm-baris3">${KARTU.slice(4).map(kartuHtml).join("")}</div></div>
    <div class="pm-bar"><p id="pmWaktu" class="pm-redup"></p>${dummy() ? pil("memuat data dummy", "info", "tunggu") : ""}<p id="pmPesan" class="pm-pesan" role="status"></p></div>`;
  document.getElementById("pmWaktu").textContent = "Diperbarui " + wib(Date.now());
  Promise.all([muatSkrip("/bnpb/ringkas_bencana.js?v=1"), muatSkrip("/inti/nanti.js")]).then(() => {
    const kerja = {sit: situasi, pri: prioritas, rap: rapor, bhy: bahaya, rel: relawan, aln: alun, keb: kebutuhan, png: pengingat};
    for (const [id, f] of Object.entries(kerja)) { const jalan = () => f().catch(() => isi(id, kosong())); window.nanti ? window.nanti(jalan) : jalan(); }   // kartu bermunculan satu per satu; klik tidak menunggu
  });
})();
