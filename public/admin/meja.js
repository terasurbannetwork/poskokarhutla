/* Admin Meja Kerja (/admin/meja): tab per meja (tabel standar, filter, tanda bahaya, ubah status, CSV), Petugas berkode, Rapor kinerja BPBD, dan 🧪/🧹 dummy.
   CSP admin: tanpa skrip/gaya inline; semua teks dari data lewat esc(). Data dari /api/meja/* (sesi admin). */
(() => {
  const app = document.getElementById("app"), aksiJudul = document.getElementById("aksiJudul"), API = "/api/meja", HAL = 20;
  const {esc} = Admin;   // public/admin/bersama.js
  const ID = new Intl.NumberFormat("id-ID", {maximumFractionDigits: 2});
  const svg = d => `<svg viewBox="0 0 24 24" aria-hidden="true">${d}</svg>`;
  const IK = {ok: svg('<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>'), tunggu: svg('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'), bahaya: svg('<path d="M12 3 2 20h20z"/><path d="M12 10v5M12 18v.5"/>'),
    info: svg('<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>'), maju: svg('<path d="M5 12h14M13 6l6 6-6 6"/>'), riwayat: svg('<path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5M12 8v5l3 2"/>'),
    unduh: svg('<path d="M12 4v11M7 11l5 5 5-5M5 20h14"/>'), orang: svg('<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/>'), rapor: svg('<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>'), tambah: svg('<path d="M12 5v14M5 12h14"/>')};
  const TON = {dilaporkan: "tunggu", diverifikasi: "info", masuk_jitupasna: "ok", diminta: "tunggu", disetujui: "info", dikirim: "info", diterima: "ok", diajukan: "tunggu", cair: "info", spj: "info", selesai: "ok", ditolak: "bahaya",
    tercatat: "info", berlaku: "ok", segera_habis: "tunggu", kedaluwarsa: "bahaya", belum_diuji: "tunggu", aktif: "ok", pasif: "bahaya"};
  const label = s => { const t = String(s).replace(/_/g, " "); return t[0].toUpperCase() + t.slice(1); };
  const pil = (s, teks, ton) => { const t = ton || TON[s] || "info"; return `<span class="mj-pil t-${t}">${IK[t] || ""}${esc(teks ?? label(s))}</span>`; };
  const tglF = t => t ? new Date(t + "T00:00:00Z").toLocaleDateString("id-ID", {timeZone: "UTC", day: "numeric", month: "short", year: "numeric"}) : "";
  const waktuF = t => t ? new Date(t).toLocaleString("id-ID", {timeZone: "Asia/Jakarta", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit"}).replace(",", "") + " WIB" : "–";
  const angkaF = (k, v) => k.rupiah ? "Rp" + ID.format(v) : ID.format(v);
  const umur = t => { const h = Math.floor((Date.now() - t) / 864e5); return h < 1 ? "hari ini" : `${ID.format(h)} hari lalu`; };

  let S = null, tab = "kaji_cepat", F = {prov: "", kab: "", status: "", bahaya: false}, daftar = [], rekapD = null, urut = "diubah", arah = -1, hal = 0, form = null, buka = new Map(), kodeBaru = null, dummyIkut = false, gudangOps = [], E = {dari: "", sampai: ""};

  const kirim = async (u, b) => { const r = await Admin.kirim(u, b); return {...r, s: r.status}; };
  const ambilJ = async u => { const r = await fetch(u); if (r.status === 403) await Admin.keMasuk(); return {ok: r.ok, s: r.status, j: await r.json().catch(() => ({}))}; };
  const catat = (t, ok) => { const p = document.getElementById("mjPesan"); if (p) { p.textContent = t; p.className = "mj-pesan " + (ok ? "ok" : "galat"); } };
  const M = () => S.meja.find(m => m.id === tab);

  /* ---------- nilai & formulir ---------- */
  const nilaiF = (k, v) => {
    if (v == null || v === "") return "";
    if (k.tipe === "angka") return angkaF(k, v);
    if (k.tipe === "gudang") return "gudang terpilih";
    if (k.tipe === "tanggal") return esc(tglF(v));
    if (k.tipe === "pilih") return esc(label(v));
    if (k.tipe === "multi") return esc(v.map(label).join(", "));
    if (k.tipe === "ya") return v ? "Ya" : "Tidak";
    if (k.tipe === "tautan") return /^https?:\/\//i.test(v) ? `<a href="${esc(v)}" target="_blank" rel="noopener noreferrer">${esc(v.replace(/^https?:\/\//i, "").slice(0, 40))}</a>` : esc(v);
    return esc(v);
  };
  const angkaId = v => { const n = Number(v.includes(",") ? v.replace(/\./g, "").replace(",", ".") : /^\d{1,3}(\.\d{3})+$/.test(v) ? v.replace(/\./g, "") : v); return Number.isNaN(n) ? v : n; };
  const isian = k => {
    const n = esc(k.nama), l = esc(k.label) + (k.wajib ? " *" : "");
    if (k.tipe === "pilih") return `<label>${l}<select name="${n}"><option value="">Pilih…</option>${k.nilai.map(o => `<option value="${esc(o)}">${esc(label(o))}</option>`).join("")}</select></label>`;
    if (k.tipe === "gudang") return `<label>${l}<select name="${n}"><option value="">Tanpa gudang (stok tidak berubah)</option>${gudangOps.map(g => `<option value="${esc(g.id)}">${esc(g.gudang)}: ${esc(label(g.barang))}, stok ${ID.format(g.stok)} ${esc(g.satuan)}</option>`).join("")}</select></label>`;
    if (k.tipe === "tanggal") return `<label>${l}<input type="date" name="${n}"></label>`;
    if (k.tipe === "tautan") return `<label>${l}<input type="url" name="${n}" maxlength="300" placeholder="https://"></label>`;
    if (k.tipe === "angka") return `<label>${l}<input name="${n}" inputmode="${k.desimal ? "decimal" : "numeric"}" autocomplete="off"></label>`;
    return `<label>${l}<input name="${n}" maxlength="${k.maks || 120}" autocomplete="off"></label>`;
  };

  /* ---------- tab meja ---------- */
  const ringkasIsi = r => M().kolom.filter(k => r.data[k.nama] != null && r.data[k.nama] !== "").slice(0, 4).map(k => `<span>${esc(k.label)}: <b>${nilaiF(k, r.data[k.nama])}</b></span>`).join(" · ");
  const urutan = {wilayah: r => `${r.prov} ${r.kab} ${r.desa || ""}`.toLowerCase(), status: r => r.status_efektif, diubah: r => r.diubah};
  const barisT = r => {
    const m = M(), tanda = r.tanda.map(t => pil(t, m.bahaya[t] || label(t), "bahaya")).join("");
    const aksi = r.aksi.map(a => `<button class="mj-btn kecil utama" data-status="${esc(a.ke)}">${IK.maju}${esc(label(a.ke))}</button>`).join("");
    const stokAksi = (r.aksi_stok || []).filter(a => a.boleh).map(a => `<button class="mj-btn kecil" data-stok="${esc(a.jenis)}">${IK.tambah}${esc(label(a.jenis))}</button>`).join("");
    const rin = buka.get(r.id);
    return `<tr class="${r.tanda.length ? "mj-bahaya" : ""}" data-id="${esc(r.id)}"><td><b>${esc(r.kab)}</b> <span class="mj-redup">prov ${esc(r.prov)}</span>${r.desa || r.kec ? `<br><span class="mj-redup">${esc([r.desa, r.kec].filter(Boolean).join(", "))}</span>` : ""}</td>
      <td>${ringkasIsi(r) || "–"}</td><td>${pil(r.status_efektif)}${r.status_efektif !== r.status ? " " + pil(r.status) : ""}${r.dummy ? " " + pil("dummy", "DUMMY", "dummy") : ""}${tanda ? `<div class="mj-tanda">${tanda}</div>` : ""}</td>
      <td>${esc(waktuF(r.diubah))}<br><span class="mj-redup">${esc(umur(r.diubah))}</span></td>
      <td><div class="mj-aksi">${aksi}${stokAksi}<button class="mj-btn kecil" data-rinci="1">${IK.riwayat}Riwayat</button></div></td></tr>${rin ? rincian(r, rin) : ""}`;
  };
  const rincian = (r, d) => `<tr class="mj-rincian"><td colspan="5">${M().kolom.filter(k => r.data[k.nama] != null && r.data[k.nama] !== "").map(k => `${esc(k.label)}: <b>${k.tipe === "gudang" ? esc(r.gudang_asal_nama || "gudang") : nilaiF(k, r.data[k.nama])}</b>`).join(" · ")}${r.kaji_id ? ` · Kaji cepat induk: <b>${esc(r.kaji_id)}</b>` : ""}
    ${d.transaksi ? `<ol>${d.transaksi.map(t => `<li>${esc(label(t.jenis))} ${ID.format(t.delta)} · saldo ${ID.format(t.saldo)} · ${esc(waktuF(t.waktu))} · ${esc(t.oleh || "")}${t.catatan ? ` · ${esc(t.catatan)}` : ""}</li>`).join("")}</ol>` : ""}
    <ol>${d.jejak.map(j => `<li>${esc(label(j.ke))}${j.dari ? ` (dari ${esc(label(j.dari))})` : ""} · ${esc(waktuF(j.waktu))} · ${esc(j.oleh || "")}${j.catatan ? ` · ${esc(j.catatan)}` : ""}</li>`).join("")}</ol></td></tr>`;
  function rekapHtml() {
    const m = M(), per = (rekapD?.per_kab?.[m.id]) || {}, ent = Object.entries(per);
    const cols = m.rekap.map(c => m.kolom.find(k => k.nama === c));
    const sts = m.turunan || m.status;
    const kab = ent.length ? `<div class="mj-wadah"><table class="mj-tabel"><thead><tr><th>Kabupaten</th><th>Catatan</th>${sts.map(s => `<th>${esc(label(s))}</th>`).join("")}<th>Tanda bahaya</th>${cols.map(c => `<th>${esc(c.label)}</th>`).join("")}<th>Umur data</th></tr></thead><tbody>${
      ent.map(([k, a]) => `<tr><td><b>${esc(k.split("|")[1])}</b> <span class="mj-redup">prov ${esc(k.split("|")[0])}</span></td><td class="mj-angka">${ID.format(a.n)}</td>${sts.map(s => `<td class="mj-angka">${ID.format(a.status[s] || 0)}</td>`).join("")}
        <td class="mj-angka">${a.bahaya ? pil("b", ID.format(a.bahaya), "bahaya") : "0"}</td>${cols.map(c => `<td class="mj-angka">${angkaF(c, a.jumlah[c.nama] || 0)}</td>`).join("")}<td>${esc(umur(a.terbaru))}</td></tr>`).join("")}</tbody></table></div>` : "";
    const tr = m.id === "renkon" ? Object.entries(rekapD?.tanpa_renkon || {}).map(([b, l]) => `<tr><td>${esc(label(b))}</td><td class="mj-angka">${ID.format(l.length)}</td><td>${l.length ? esc(l.map(x => x.split("|")[1]).join(", ")) : pil("ok", "Semua punya", "ok")}</td></tr>`).join("") : "";
    return kab + (tr ? `<div class="mj-wadah"><table class="mj-tabel"><thead><tr><th>Bencana</th><th>Kab tanpa renkon berlaku</th><th>Daftar</th></tr></thead><tbody>${tr}</tbody></table></div>` : "");
  }
  function panelStok() {
    const r = form.baris;
    return `<form class="ad-kartu mj-form" id="mjStok" autocomplete="off" novalidate><h3>${esc(r.data.gudang)}: stok ${esc(label(r.data.barang).toLowerCase())}, ${esc(form.stok)}</h3>
      <div class="mj-grid"><label>Jumlah${form.stok === "koreksi" ? " (boleh negatif)" : ""} *<input name="jumlah" inputmode="numeric" autocomplete="off"></label><label>Catatan (opsional)<input name="_catatan" maxlength="200"></label></div>
      <div class="mj-aksi"><button class="mj-btn utama" type="submit">Simpan</button><button class="mj-btn" type="button" data-batal="1">Batal</button></div></form>`;
  }
  function panelStatus() {
    if (form.stok) return panelStok();
    const m = M(), kolom = m.kolom.filter(k => k.tahap === form.ke), r = form.baris;
    return `<form class="ad-kartu mj-form" id="mjForm" autocomplete="off" novalidate><h3>${esc(r.kab)}: pindah ke ${esc(label(form.ke).toLowerCase())}</h3>
      <div class="mj-grid">${kolom.map(isian).join("")}<label>Catatan (opsional)<input name="_catatan" maxlength="200"></label></div>
      <div class="mj-aksi"><button class="mj-btn utama" type="submit">Simpan</button><button class="mj-btn" type="button" data-batal="1">Batal</button></div></form>`;
  }
  async function tampilMeja() {
    const m = M(), q = new URLSearchParams({meja: m.id}); if (/^\d{2}$/.test(F.prov)) q.set("prov", F.prov); if (F.kab.trim()) q.set("kab", F.kab.trim());
    const [d, rk] = await Promise.all([ambilJ(`${API}/catatan?${q}`), ambilJ(`${API}/rekap${dummyIkut ? "?dummy=1" : ""}`)]);
    if (!d.ok) return `<p class="mj-kosong">${esc(d.j.galat || "Gagal memuat")}</p>`;
    rekapD = rk.j; daftar = d.j.catatan;
    return tabelMeja();
  }
  function tabelMeja() {
    const m = M(), sts = m.turunan || m.status;
    const rows = daftar.filter(r => (!F.status || r.status_efektif === F.status || r.status === F.status) && (!F.bahaya || r.tanda.length));
    const f = urutan[urut], b = [...rows].sort((x, y) => (f(x) > f(y) ? 1 : f(x) < f(y) ? -1 : 0) * arah), n = b.length, h = Math.min(hal, Math.max(0, Math.ceil(n / HAL) - 1));
    const th = (k, t) => `<th data-urut="${k}" ${urut === k ? `aria-sort="${arah > 0 ? "ascending" : "descending"}"` : ""}>${t}</th>`;
    return `<div class="mj-bar"><label>Provinsi<input id="fProv" maxlength="2" inputmode="numeric" size="3" value="${esc(F.prov)}" placeholder="62"></label><label>Kabupaten<input id="fKab" maxlength="60" value="${esc(F.kab)}"></label>
      <label>Status<select id="fStatus"><option value="">Semua</option>${sts.map(s => `<option value="${esc(s)}" ${F.status === s ? "selected" : ""}>${esc(label(s))}</option>`).join("")}</select></label>
      <label class="mj-cek"><input type="checkbox" id="fBahaya" ${F.bahaya ? "checked" : ""}>Tanda bahaya saja</label><span class="mj-redup">${n} dari ${daftar.length} catatan</span>
      <button class="mj-btn mj-ruang" data-csv="1">${IK.unduh}Ekspor CSV</button></div>
      ${m.id === "kaji_cepat" ? `<div class="mj-bar"><label>Ekspor DIBI dari<input type="date" id="eDari" value="${esc(E.dari)}"></label><label>Sampai<input type="date" id="eSampai" value="${esc(E.sampai)}"></label>
        <button class="mj-btn" data-dibi="csv">${IK.unduh}DIBI CSV</button><button class="mj-btn" data-dibi="json">${IK.unduh}DIBI JSON</button><span class="mj-redup">Kolom bergaya DIBI; kosongkan tanggal untuk semua.</span></div>` : ""}
      ${form ? panelStatus() : ""}
      <div class="mj-wadah"><table class="mj-tabel"><thead><tr>${th("wilayah", "Wilayah")}<th>Isi</th>${th("status", "Status")}${th("diubah", "Diubah")}<th>Aksi</th></tr></thead>
      <tbody>${n ? b.slice(h * HAL, h * HAL + HAL).map(barisT).join("") : `<tr><td colspan="5" class="mj-kosong">Belum ada catatan${daftar.length ? " yang cocok dengan filter" : ""}.</td></tr>`}</tbody></table></div>
      ${n > HAL ? `<div class="mj-hal"><button class="mj-btn kecil" data-hal="-1" ${h ? "" : "disabled"}>Sebelumnya</button>Halaman ${h + 1} dari ${Math.ceil(n / HAL)}<button class="mj-btn kecil" data-hal="1" ${(h + 1) * HAL < n ? "" : "disabled"}>Berikutnya</button></div>` : ""}
      ${rekapHtml()}`;
  }
  const gambarTabel = () => { document.getElementById("mjIsi").innerHTML = tabelMeja(); };
  /* CSV: tiap sel dikutip; awalan = + - @ diberi apostrof supaya tidak dijalankan sebagai rumus di lembar kerja */
  function csv() {
    const m = M(), kolom = m.kolom, kepala = ["id", "prov", "kab", "kec", "desa", "status", "status_efektif", "tanda_bahaya", "dibuat", "diubah", ...kolom.map(k => k.nama)];
    const sel = v => { let t = Array.isArray(v) ? v.join("|") : String(v ?? ""); if (/^[=+\-@\t\r]/.test(t)) t = "'" + t; return '"' + t.replace(/"/g, '""') + '"'; };
    const rows = daftar.filter(r => (!F.status || r.status_efektif === F.status || r.status === F.status) && (!F.bahaya || r.tanda.length));
    const isi = [kepala.map(sel).join(","), ...rows.map(r => [r.id, r.prov, r.kab, r.kec, r.desa, r.status, r.status_efektif, r.tanda.join("|"), new Date(r.dibuat).toISOString(), new Date(r.diubah).toISOString(), ...kolom.map(k => r.data[k.nama])].map(sel).join(","))].join("\r\n");
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob(["﻿" + isi], {type: "text/csv;charset=utf-8"})); a.download = `meja-${m.id}-${new Date().toISOString().slice(0, 10)}.csv`; document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }

  /* ekspor DIBI dari server (sesi admin): unduh sebagai berkas */
  async function dibi(fmt) {
    const q = new URLSearchParams({meja: "kaji_cepat", format: fmt}); if (E.dari) q.set("dari", E.dari); if (E.sampai) q.set("sampai", E.sampai);
    const res = await fetch(`${API}/ekspor?${q}`); if (!res.ok) { const j = await res.json().catch(() => ({})); return catat(j.galat || `Gagal (${res.status})`, false); }
    const a = document.createElement("a"); a.href = URL.createObjectURL(await res.blob()); a.download = `dibi-kaji_cepat-${new Date().toISOString().slice(0, 10)}.${fmt}`; document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000); catat(res.headers.get("x-ekspor-dipotong") ? "Diunduh, tetapi dipotong di 20.000 baris: persempit rentang tanggal." : "Diunduh.", true);
  }

  /* ---------- petugas ---------- */
  async function tampilPetugas() {
    const d = await ambilJ(`${API}/petugas`); if (!d.ok) return `<p class="mj-kosong">${esc(d.j.galat || "Gagal memuat")}</p>`;
    return `${kodeBaru ? `<div class="ad-kartu mj-kode mj-form"><h3>Kode untuk ${esc(kodeBaru.nama)}: hanya tampil SEKALI</h3><p class="mj-redup">Kirim tautan ini lewat WhatsApp. Server hanya menyimpan sidik jarinya, jadi tidak bisa ditampilkan lagi.</p>
        <input id="mjTautan" readonly value="${esc(kodeBaru.tautan)}"><div class="mj-aksi"><button class="mj-btn utama" data-salin="1">Salin tautan</button>
        <a class="mj-btn" target="_blank" rel="noopener noreferrer" href="https://wa.me/?text=${encodeURIComponent("Tautan Meja Kerja untuk " + kodeBaru.nama + ": " + kodeBaru.tautan)}">Bagikan lewat WhatsApp</a></div></div>` : ""}
      <form class="ad-kartu mj-form" id="mjPetugas" autocomplete="off"><h3>Buat kode petugas BPBD</h3><div class="mj-grid"><label>Nama petugas<input name="nama" required minlength="2" maxlength="80"></label>
        <label>Provinsi (kode 2 digit)<input name="prov" required maxlength="2" inputmode="numeric" placeholder="62"></label><label>Kabupaten / kota<input name="kab" required minlength="2" maxlength="60"></label></div>
        <div class="mj-aksi">${d.j.meja.map(id => `<label class="mj-cek"><input type="checkbox" name="meja" value="${esc(id)}" ${id === "kaji_cepat" ? "checked" : ""}>${esc(S.meja.find(m => m.id === id).nama)}</label>`).join("")}</div>
        <div><button class="mj-btn utama" type="submit">${IK.tambah}Buat kode</button></div></form>
      <div class="mj-wadah"><table class="mj-tabel"><thead><tr><th>Petugas</th><th>Wilayah</th><th>Meja</th><th>Catatan</th><th>Status</th><th></th></tr></thead><tbody>${d.j.petugas.length ? d.j.petugas.map(p => `<tr data-id="${esc(p.id)}">
        <td><b>${esc(p.nama)}</b>${p.dummy ? " " + pil("dummy", "DUMMY", "dummy") : ""}</td><td>${esc(p.kab)} <span class="mj-redup">prov ${esc(p.prov)}</span></td><td>${p.meja.map(x => esc(S.meja.find(m => m.id === x)?.nama || x)).join(", ")}</td>
        <td class="mj-angka">${ID.format(p.catatan)}</td><td>${p.dicabut ? pil("b", "Dicabut " + waktuF(p.dicabut), "bahaya") : pil("a", "Aktif", "ok")}</td>
        <td>${p.dicabut ? "" : `<button class="mj-btn kecil bahaya" data-cabut="1">Cabut kode</button>`}</td></tr>`).join("") : '<tr><td colspan="6" class="mj-kosong">Belum ada petugas.</td></tr>'}</tbody></table></div>`;
  }

  /* ---------- rapor ---------- */
  const skorSel = (v, ket) => v == null ? pil("x", ket || "Belum ada data", "tunggu") : `<span class="mj-skor">${ID.format(v)}</span><meter class="mj-meter" min="0" max="100" value="${v}"></meter>`;
  async function tampilRapor() {
    const d = await ambilJ(`${API}/rapor${dummyIkut ? "?dummy=1" : ""}`); if (!d.ok) return `<p class="mj-kosong">${esc(d.j.galat || "Gagal memuat")}</p>`;
    const r = d.j, b = r.bobot;
    return `<div class="mj-bar"><span class="mj-pil t-tunggu">${IK.tunggu}Indeks komposit, bobot sementara</span><span class="mj-redup">Bobot: waktu respons ${b.respons}, keaktifan regu ${b.keaktifan}, kelengkapan meja ${b.kelengkapan}. Komponen tanpa data dilewati.</span>
      <label class="mj-cek mj-ruang"><input type="checkbox" id="rDummy" ${dummyIkut ? "checked" : ""}>Sertakan data dummy</label></div>
      <p class="mj-redup">Lapor Warga: ${esc(r.lapor_warga)}.</p>
      <div class="mj-wadah"><table class="mj-tabel"><thead><tr><th>Provinsi</th><th>Kabupaten berskor</th><th>Skor</th></tr></thead><tbody>${r.prov.length ? r.prov.map(p => `<tr><td><b>${esc(p.prov)}</b></td><td class="mj-angka">${ID.format(p.n_dengan_skor)} dari ${ID.format(p.n_kab)} punya skor</td><td>${skorSel(p.skor)}</td></tr>`).join("") : '<tr><td colspan="3" class="mj-kosong">Belum ada data.</td></tr>'}</tbody></table></div>
      <div class="mj-wadah"><table class="mj-tabel"><thead><tr><th>Kabupaten</th><th>Median respons</th><th>Panggilan direspons</th><th>Laporan regu 7 hari</th><th>Regu aktif</th><th>Kelengkapan meja</th><th>Petugas</th><th>Skor</th></tr></thead><tbody>${r.kab.length ? r.kab.map(k => `<tr>
        <td><b>${esc(k.kab)}</b> <span class="mj-redup">prov ${esc(k.prov)}</span></td>
        <td class="mj-angka">${k.respons.median_menit == null ? pil("x", "Belum ada data", "tunggu") : ID.format(k.respons.median_menit) + " menit"}</td>
        <td class="mj-angka">${k.respons.dipanggil ? `${ID.format(k.respons.direspons)} dari ${ID.format(k.respons.dipanggil)}` : "–"}</td>
        <td class="mj-angka">${ID.format(k.regu.laporan_7h)}</td><td class="mj-angka">${k.regu.terdaftar ? `${ID.format(k.regu.aktif)} dari ${ID.format(k.regu.terdaftar)}` : pil("x", "Belum ada data", "tunggu")}</td>
        <td>${Object.entries(k.kelengkapan.meja).map(([id, v]) => pil(id, `${S.meja.find(m => m.id === id)?.nama}: ${ID.format(v.skor)}`, v.bahaya ? "tunggu" : "ok")).join(" ") || pil("x", "Belum ada data", "tunggu")}</td>
        <td>${esc((k.petugas || []).join(", ")) || "–"}</td><td>${skorSel(k.skor)}</td></tr>`).join("") : '<tr><td colspan="8" class="mj-kosong">Belum ada kabupaten dengan data.</td></tr>'}</tbody></table></div>`;
  }

  /* ---------- kerangka ---------- */
  const TABS = () => [...S.meja.map(m => [m.id, svg(m.ikon) + esc(m.nama)]), ["petugas", IK.orang + "Petugas"], ["rapor", IK.rapor + "Rapor BPBD"]];
  function kerangka() {
    app.innerHTML = `<nav class="ad-tabs" aria-label="Meja Kerja">${TABS().map(([k, l]) => `<button data-tab="${k}" aria-pressed="${k === tab}">${l}</button>`).join("")}</nav>
      <p id="mjPesan" class="mj-pesan" role="status"></p><div id="mjIsi" class="mj-isi"><p class="ad-redup">Memuat…</p></div>`;
  }
  async function muat() {
    const isi = document.getElementById("mjIsi");
    try { isi.innerHTML = await (tab === "petugas" ? tampilPetugas : tab === "rapor" ? tampilRapor : tampilMeja)(); } catch (e) { if (e.message !== "perlu masuk") isi.innerHTML = `<p class="mj-kosong">Gagal memuat: ${esc(e.message)}</p>`; }
  }

  /* ---------- peristiwa ---------- */
  aksiJudul.innerHTML = '<button class="ad-tombol ad-bulat" data-dummy="isi" title="Isi data dummy untuk halaman ini" aria-label="Isi data dummy">🧪</button><button class="ad-tombol ad-bulat" data-dummy="hapus" title="Hapus semua data dummy Meja Kerja" aria-label="Hapus data dummy">🧹</button>';
  aksiJudul.addEventListener("click", async e => {
    const d = e.target.closest("[data-dummy]"); if (!d) return;
    if (d.dataset.dummy === "hapus" && !confirm("Hapus SEMUA data dummy Meja Kerja (catatan, petugas, dan bahan rapor contoh)? Data asli tidak tersentuh.")) return;
    d.disabled = true;
    const r = await kirim(`${API}/dummy`, {aksi: d.dataset.dummy});
    alert(r.ok ? (d.dataset.dummy === "isi" ? `Dummy dibuat: ${r.j.catatan} catatan, ${r.j.petugas} petugas, ${r.j.regu} regu, ${r.j.lapangan} laporan regu, ${r.j.panggilan} panggilan.` : `Dummy dihapus: ${r.j.catatan} catatan, ${r.j.petugas} petugas, ${r.j.regu} regu, ${r.j.lapangan} laporan regu, ${r.j.panggilan} panggilan.`) : (r.j.galat || `Gagal (${r.s})`));
    location.reload();   // muat ulang penuh (DUMMY.md)
  });
  app.addEventListener("click", async e => {
    const t = e.target.closest("button"); if (!t) return;
    const tr = t.closest("tr"), r = tr && daftar.find(x => x.id === tr.dataset.id);
    if (t.dataset.tab) { tab = t.dataset.tab; form = null; hal = 0; F.status = ""; kerangka(); return muat(); }
    if (t.dataset.urut) { arah = urut === t.dataset.urut ? -arah : 1; urut = t.dataset.urut; return gambarTabel(); }
    if (t.dataset.hal) { hal += +t.dataset.hal; return gambarTabel(); }
    if (t.dataset.csv) return csv();
    if (t.dataset.dibi) return dibi(t.dataset.dibi);
    if (t.dataset.stok && r) { form = {baris: r, stok: t.dataset.stok}; return gambarTabel(); }
    if (t.dataset.batal) { form = null; return gambarTabel(); }
    if (t.dataset.status && r) {
      form = {baris: r, ke: t.dataset.status};
      if (r.meja === "logistik" && form.ke === "dikirim") {   // pemilih gudang asal: gudang kabupaten yang sama dan barang yang sama
        const g = await ambilJ(`${API}/catatan?meja=gudang&prov=${encodeURIComponent(r.prov)}&kab=${encodeURIComponent(r.kab)}`);
        gudangOps = (g.j.catatan || []).filter(x => x.data.barang === r.data.barang).map(x => ({id: x.id, ...x.data}));
      }
      if (!M().kolom.some(k => k.tahap === form.ke)) { const x = await kirim(`${API}/catatan/${r.id}`, {aksi: "status", ke: form.ke}); form = null; catat(x.ok ? "Status diubah." : (x.j.galat || `Gagal (${x.s})`), x.ok); return muat(); }   // tahap tanpa isian: langsung
      return gambarTabel();
    }
    if (t.dataset.rinci && r) {
      if (buka.has(r.id)) buka.delete(r.id); else { const d = await ambilJ(`${API}/catatan/${r.id}`); if (!d.ok) return catat(d.j.galat || "Gagal memuat riwayat", false); buka.set(r.id, d.j); }
      return gambarTabel();
    }
    if (t.dataset.salin) { const i = document.getElementById("mjTautan"); i.select(); try { await navigator.clipboard.writeText(i.value); catat("Tautan disalin.", true); } catch (x) { catat("Salin manual: tekan Ctrl+C.", false); } return; }
    if (t.dataset.cabut && tr) {
      if (!confirm("Cabut kode petugas ini? Ia tidak bisa lagi membuka Meja Kerja.")) return;
      const x = await kirim(`${API}/petugas/${tr.dataset.id}`, {aksi: "cabut"}); catat(x.ok ? "Kode dicabut." : (x.j.galat || `Gagal (${x.s})`), x.ok); return muat();
    }
  });
  app.addEventListener("change", e => {
    const i = e.target;
    if (i.id === "fProv" || i.id === "fKab") { F.prov = document.getElementById("fProv").value.trim(); F.kab = document.getElementById("fKab").value; hal = 0; return muat(); }
    if (i.id === "eDari" || i.id === "eSampai") { E[i.id === "eDari" ? "dari" : "sampai"] = i.value; return; }
    if (i.id === "fStatus") { F.status = i.value; hal = 0; return gambarTabel(); }
    if (i.id === "fBahaya") { F.bahaya = i.checked; hal = 0; return gambarTabel(); }
    if (i.id === "rDummy") { dummyIkut = i.checked; return muat(); }
  });
  app.addEventListener("submit", async e => {
    e.preventDefault(); const f = e.target, tombol = f.querySelector('button[type="submit"]'); tombol.disabled = true; let r;
    if (f.id === "mjStok") {
      const j = angkaId(f.elements.jumlah.value.trim()), cat = f.elements._catatan.value.trim();
      r = await kirim(`${API}/catatan/${form.baris.id}`, {aksi: "stok", jenis: form.stok, jumlah: j, ...(cat ? {catatan: cat} : {})});
      if (r.ok) form = null;
    } else if (f.id === "mjForm") {
      const data = {}; for (const k of M().kolom.filter(k => k.tahap === form.ke)) { const v = f.elements[k.nama].value.trim(); if (v !== "") data[k.nama] = k.tipe === "angka" ? angkaId(v) : v; }
      const cat = f.elements._catatan.value.trim();
      r = await kirim(`${API}/catatan/${form.baris.id}`, {aksi: "status", ke: form.ke, data, ...(cat ? {catatan: cat} : {})});
      if (r.ok) form = null;
    } else if (f.id === "mjPetugas") {
      r = await kirim(`${API}/petugas`, {nama: f.elements.nama.value.trim(), prov: f.elements.prov.value.trim(), kab: f.elements.kab.value.trim(), meja: [...f.querySelectorAll('input[name="meja"]:checked')].map(x => x.value)});
      if (r.ok) kodeBaru = {nama: r.j.petugas.nama, tautan: r.j.tautan};
    }
    tombol.disabled = false; catat(r.ok ? "Tersimpan." : (r.j.galat || `Gagal (${r.s})`), r.ok); if (r.ok) muat();
  });

  (async () => {
    const sp = await fetch(`${API}/spek`); S = await sp.json(); kerangka(); muat();
  })().catch(() => { app.innerHTML = '<p class="mj-kosong">Gagal memuat spesifikasi meja.</p>'; });
})();
