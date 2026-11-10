/* Meja Kerja petugas BPBD (/meja). Masuk dengan kode di fragmen #k= (disimpan di peramban ini, bukan di URL), tanpa akun.
   Formulir dibangun dari GET /api/meja/spek; daftar dan perpindahan status lewat /api/meja/catatan. Tanpa skrip/gaya inline (CSP ketat).
   Semua teks dari data lewat esc(). Modul ES (impor kelengkapan.js dan meja_impor.js).
   Meja "Data kejadian dan dampak" (kolom `bagian` di spek): formulir per bagian yang bisa dilipat, pilihan Nihil per bagian, meter kelengkapan hidup (debounce),
   draf isian tersimpan di perangkat, impor .xlsx per 50 baris. */
import {kelengkapan, butir, BAGIAN} from "/inti/kelengkapan.js";
import {bacaXlsx, barisDariLembar, potong, angkaId} from "/bnpb/meja_impor.js";
{
  const app = document.getElementById("app"), KUNCI = "meja_kode", HAL = 15;
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c]));
  const ID = new Intl.NumberFormat("id-ID", {maximumFractionDigits: 2});
  const svg = d => `<svg viewBox="0 0 24 24" aria-hidden="true">${d}</svg>`;
  const IK = {ok: svg('<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>'), tunggu: svg('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'), bahaya: svg('<path d="M12 3 2 20h20z"/><path d="M12 10v5M12 18v.5"/>'),
    info: svg('<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>'), tambah: svg('<path d="M12 5v14M5 12h14"/>'), riwayat: svg('<path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5M12 8v5l3 2"/>'),
    unduh: svg('<path d="M12 4v11M7 11l5 5 5-5M5 20h14"/>'), berkas: svg('<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v5h5M9 14h6M9 17h4"/>'), meter: svg('<path d="M4 18a8 8 0 1 1 16 0"/><path d="m12 18 4-6"/>'), lipat: svg('<path d="m6 9 6 6 6-6"/>'), tutup: svg('<path d="M6 6l12 12M18 6 6 18"/>'),
    ubah: svg('<path d="M4 20h4L19 9l-4-4L4 16z"/>'), maju: svg('<path d="M5 12h14M13 6l6 6-6 6"/>'), keluar: svg('<path d="M10 4H5v16h5M15 8l4 4-4 4M19 12H9"/>'), kab: svg('<path d="M12 21s7-6 7-11a7 7 0 1 0-14 0c0 5 7 11 7 11z"/><circle cx="12" cy="10" r="2.5"/>')};
  const TON = {dilaporkan: "tunggu", diverifikasi: "info", masuk_jitupasna: "ok", diminta: "tunggu", disetujui: "info", dikirim: "info", diterima: "ok", diajukan: "tunggu", cair: "info", spj: "info", selesai: "ok", ditolak: "bahaya",
    tercatat: "info", berlaku: "ok", segera_habis: "tunggu", kedaluwarsa: "bahaya", perlu_reviu: "tunggu", belum_diuji: "tunggu", aktif: "ok", pasif: "bahaya"};
  const label = s => { const t = String(s).replace(/_/g, " "); return t[0].toUpperCase() + t.slice(1); };
  const pil = (s, teks) => { const t = TON[s] || "info"; return `<span class="mj-pil t-${t}">${IK[t]}${esc(teks ?? label(s))}</span>`; };
  const tglF = t => t ? new Date(t + "T00:00:00Z").toLocaleDateString("id-ID", {timeZone: "UTC", day: "numeric", month: "short", year: "numeric"}) : "";
  const waktuF = t => new Date(t).toLocaleString("id-ID", {timeZone: "Asia/Jakarta", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit"}).replace(",", "") + " WIB";
  /* koordinat dan km tidak dibulatkan 2 desimal: maks desimal mengikuti kolom (desimal: angka = jumlahnya, true = 2) */
  const FMT = new Map();
  const fmt = k => { const n = typeof k.desimal === "number" ? k.desimal : k.desimal ? 2 : 0; if (!FMT.has(n)) FMT.set(n, new Intl.NumberFormat("id-ID", {maximumFractionDigits: n})); return FMT.get(n); };
  const angkaF = (k, v) => k.rupiah ? "Rp" + ID.format(v) : fmt(k).format(v);

  let segarkanPita = () => {}, kode = "", kajiOps = [], S = null, saya = null, meja = null, daftar = [], urut = "diubah", arah = -1, hal = 0, form = null, buka = new Map(), pesanT = "", pesanOk = true, imp = null;
  const api = async (m, u, b) => {
    let r; try { r = await fetch(u, {method: m, headers: {"x-kode": kode, ...(b ? {"content-type": "application/json"} : {})}, body: b ? JSON.stringify(b) : undefined}); }
    catch (e) { return {ok: false, s: 0, j: {galat: "Tidak ada sinyal. Coba lagi."}}; }
    return {ok: r.ok, s: r.status, j: await r.json().catch(() => ({})), tunggu: +r.headers.get("retry-after") || 0};
  };
  /* F6 luring: catatan baru dan perpindahan status/ubah isi masuk antrean perangkat bila tanpa sinyal (antre.js); kode tidak ikut tersimpan */
  const antre = Antre.buat({untuk: "meja", simpan: Antre.penyimpanan("bnpb"), kirimItem: Antre.pengirim(() => kode), kodeAda: () => !!kode});

  /* ---------- nilai & formulir dinamis dari spek ---------- */
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
  /* bantuan privasi: kolom teks bebas di meja dampak (server menolak pola nama/NIK/telepon dan menyebut kolomnya) */
  const BANTU = new Set(["nama_kejadian", "kronologis", "deskripsi", "upaya", "penyebab"]);
  const isian = (k, v) => {
    const n = esc(k.nama), l = esc(k.label) + (k.wajib ? " *" : ""), bantu = k.bagian && BANTU.has(k.nama) ? `<small class="mj-bantu">Tanpa nama orang, alamat rumah, NIK, atau nomor telepon</small>` : "";
    const bila = k.bila ? ` data-bila="${esc(k.bila.join(","))}" hidden` : "";
    const bungkus = isi => k.bila ? `<div class="mj-bila"${bila}>${isi}</div>` : isi;
    if (k.tipe === "wilayah") return `<label class="bn-isian">${l}<input name="_${n}" maxlength="80" autocomplete="off" value="${esc(v ?? "")}"></label>`;
    if (k.tipe === "pilih") return `<label class="bn-isian">${l}<select name="${n}"><option value="">Pilih…</option>${k.nilai.map(o => `<option value="${esc(o)}" ${v === o ? "selected" : ""}>${esc(label(o))}</option>`).join("")}</select></label>`;
    if (k.tipe === "multi") return `<div class="bn-isian">${l}<div class="bn-pilihan">${k.nilai.map(o => `<label><input type="checkbox" name="${n}" value="${esc(o)}" ${(v || []).includes(o) ? "checked" : ""}>${esc(label(o))}</label>`).join("")}</div></div>`;
    if (k.tipe === "ya") return `<label class="bn-pilihan"><label><input type="checkbox" name="${n}" ${v ? "checked" : ""}>${l}</label></label>`;
    if (k.tipe === "gudang") return "";   // dipilih admin saat mengirim
    if (k.tipe === "tanggal") return `<label class="bn-isian">${l}<input type="date" name="${n}" value="${esc(v ?? "")}"></label>`;
    if (k.tipe === "tautan") return `<label class="bn-isian">${l}<input type="url" name="${n}" maxlength="300" inputmode="url" placeholder="https://" value="${esc(v ?? "")}"></label>`;
    if (k.tipe === "angka") return bungkus(`<label class="bn-isian">${l}<input name="${n}" inputmode="${k.desimal ? "decimal" : "numeric"}" autocomplete="off" value="${esc(v == null ? "" : teksAngka(v))}"></label>`);
    if ((k.maks || 0) >= 200) return `<label class="bn-isian">${l}<textarea name="${n}" rows="3" maxlength="${k.maks}" autocomplete="off">${esc(v ?? "")}</textarea>${bantu}</label>`;
    return `<label class="bn-isian">${l}<input name="${n}" maxlength="${k.maks || 120}" autocomplete="off" value="${esc(v ?? "")}">${bantu}</label>`;
  };
  const ambil = (f, kolom) => {
    const o = {}, nihilG = new Set(kolom.filter(k => k.nihil && f.elements[k.nama]?.checked).map(k => k.bagian));   // bagian "tidak ada": isiannya tidak dikirim
    for (const k of kolom) {
      if (k.tipe === "gudang" || k.tipe === "wilayah" || (k.bagian && !k.nihil && nihilG.has(k.bagian))) continue;
      const e = f.elements[k.nama]; if (!e && k.tipe !== "multi") continue;   // bagian yang belum dirender (dampak) dihitung dari form.mentah
      if (k.tipe === "multi") o[k.nama] = [...f.querySelectorAll(`input[name="${k.nama}"]:checked`)].map(x => x.value);
      else if (k.tipe === "ya") { if (e.checked || !k.nihil) o[k.nama] = !!e.checked; }
      else if (e.value.trim() !== "") o[k.nama] = k.tipe === "angka" ? angkaId(e.value.trim()) : e.value.trim();
    }
    return o;
  };

  /* ---------- tampilan ---------- */
  const M = () => S.meja.find(m => m.id === meja);
  const dampakM = () => !!M().bagian;
  const AKSI_DAMPAK = {diverifikasi: "Ajukan verifikasi", dilaporkan: "Tarik kembali"};
  const pilKel = k => !k ? "" : `<span class="mj-pil t-${k.persen >= 100 ? "ok" : k.persen >= 50 ? "tunggu" : "bahaya"}" title="Persen butir yang sudah terjawab">${IK.meter}${ID.format(k.persen)}%</span>`
    + (k.inti_lengkap ? `<span class="mj-pil t-ok">${IK.ok}Inti lengkap</span>` : `<span class="mj-pil t-bahaya" title="Butir inti yang belum terjawab">${IK.bahaya}Inti kurang ${ID.format(k.kurang_inti.length)}</span>`);
  const ringkasIsi = r => {
    const kolom = dampakM() ? ["nama_kejadian", "jenis", "tanggal", "status_darurat"].map(n => M().kolom.find(k => k.nama === n)) : M().kolom.filter(k => !k.tahap || r.data[k.nama] != null);
    const isi = kolom.filter(k => r.data[k.nama] != null && r.data[k.nama] !== "" && !(Array.isArray(r.data[k.nama]) && !r.data[k.nama].length)).slice(0, 4);
    if (dampakM()) { const d = r.data; return `<div class="mj-ringkas"><b>${esc(d.nama_kejadian || "Tanpa nama")}</b><small>${esc([d.jenis && label(d.jenis), d.tanggal && tglF(d.tanggal), d.status_darurat && "darurat " + label(d.status_darurat)].filter(Boolean).join(", "))}</small></div>`; }
        return isi.map(k => `<span>${esc(k.label)}: <b>${nilaiF(k, r.data[k.nama])}</b></span>`).join(", ");
  };
  const wilayahF = r => esc([r.desa, r.kec].filter(Boolean).join(", ") || r.kab);
  const urutan = {wilayah: r => [r.desa, r.kec, r.kab].filter(Boolean).join(" ").toLowerCase(), status: r => r.status_efektif, diubah: r => r.diubah};
  const baris = r => {
    const tanda = r.tanda.map(t => `<span class="mj-pil t-bahaya">${IK.bahaya}${esc(M().bahaya[t] || label(t))}</span>`).join("");
    const aksi = r.aksi.filter(a => a.boleh).map(a => `<button class="mj-btn kecil utama" data-status="${esc(a.ke)}">${IK.maju}${esc(dampakM() && AKSI_DAMPAK[a.ke] || label(a.ke))}</button>`).join("") + (r.bisa_ubah ? `<button class="mj-btn kecil" data-ubah="1">${IK.ubah}Ubah</button>` : "");
    const stokAksi = (r.aksi_stok || []).filter(a => a.boleh).map(a => `<button class="mj-btn kecil" data-stok="${esc(a.jenis)}">${IK.tambah}${esc(label(a.jenis))}</button>`).join("");
    const lain = r.aksi.filter(a => !a.boleh).length ? `<span class="mj-redup">menunggu admin</span>` : "";
    const rin = buka.get(r.id);
    return `<tr data-id="${esc(r.id)}"><td><b>${wilayahF(r)}</b></td><td>${ringkasIsi(r) || "–"}${tanda ? `<div class="mj-tanda">${tanda}</div>` : ""}</td>
      <td>${pil(r.status_efektif)}${r.status_efektif !== r.status ? ` ${pil(r.status)}` : ""}${dampakM() ? `<div class="mj-tanda">${pilKel(r.kelengkapan)}</div>` : ""}</td><td>${esc(waktuF(r.diubah))}</td>
      <td><div class="mj-aksi">${aksi}${stokAksi}<button class="mj-btn kecil" data-rinci="1">${IK.riwayat}Rincian</button>${lain}</div></td></tr>${rin ? rinci(r, rin) : ""}`;
  };
  const kurangRinci = r => {
    const k = r.kelengkapan; if (!dampakM() || !k) return "";
    const li = l => l.map(x => `<li>${esc(x.label)}</li>`).join("");
    return `<div class="mj-kurang-baris">${k.kurang_inti.length ? `<b>Butir inti yang kurang (${ID.format(k.kurang_inti.length)})</b><ul>${li(k.kurang_inti)}</ul>` : `<b>Semua butir inti sudah terjawab.</b>`}
      ${k.kurang_rinci.length ? `<details><summary>Butir rinci yang belum terjawab (${ID.format(k.kurang_rinci.length)})</summary><ul>${li(k.kurang_rinci)}</ul></details>` : ""}</div>`;
  };
  const rinci = (r, d) => `<tr><td colspan="5">${kurangRinci(r)}<div class="mj-rincian">${M().kolom.filter(k => r.data[k.nama] != null && r.data[k.nama] !== "").map(k => `${esc(k.label)}: <b>${nilaiF(k, r.data[k.nama])}</b>`).join(", ")}</div>
    <ol class="mj-jejak">${d.jejak.map(j => `<li>${esc(label(j.ke))}${j.dari ? ` (dari ${esc(label(j.dari))})` : ""}, ${esc(waktuF(j.waktu))}${j.catatan ? `, ${esc(j.catatan)}` : ""}</li>`).join("")}</ol></td></tr>`;
  const opsKaji = () => `<option value="">Tanpa kaji cepat induk</option>${kajiOps.map(x => `<option value="${esc(x.id)}">${esc(x.desa || x.kab)}: ${esc(label(x.data.kejadian))}, ${esc(tglF(x.data.tanggal))}</option>`).join("")}`;
  /* ---------- formulir dampak: bagian lipat, Nihil, meter ----------
     INP: membuka formulir hanya mengecat kerangka (judul, meter, bagian pertama); bagian lain, pemulihan draf, kunci Nihil dan meter menyusul sesudah satu frame.
     Bagian tertutup di HP baru dirender saat pertama dibuka. Isian yang bagiannya belum dirender tinggal di form.mentah (draf atau catatan) dan tetap dihitung. */
  const sesudahFrame = fn => { let jalan = false; const go = () => { if (!jalan) { jalan = true; fn(); } }; requestAnimationFrame(() => requestAnimationFrame(go)); setTimeout(go, 150); };   // jaring untuk tab tersembunyi
  const kunciDraf = () => `meja_draf:${meja}:${form.mode}:${form.baris?.id || "baru"}`;
  const bacaDraf = () => { try { return JSON.parse(localStorage.getItem(kunciDraf()) || "null"); } catch (e) { return null; } };
  const tulisDraf = v => { try { v ? localStorage.setItem(kunciDraf(), JSON.stringify(v)) : localStorage.removeItem(kunciDraf()); } catch (e) {} };
  const teksAngka = v => String(v).replace(".", ",");   // nilai input gaya Indonesia (koma desimal); angkaId menerima koma dan titik
  const mentahDari = r => {   // catatan -> isian mentah (nama -> string | larik)
    const o = {}; if (!r) return o;
    for (const k of M().kolom) {
      const v = k.tipe === "wilayah" ? r[k.nama] : r.data?.[k.nama]; if (v == null || v === "") continue;
      o[k.tipe === "wilayah" ? "_" + k.nama : k.nama] = k.tipe === "ya" ? (v ? ["on"] : []) : k.tipe === "multi" ? v : k.tipe === "angka" ? teksAngka(v) : String(v);
    }
    return o;
  };
  const bagianKolom = g => { const ks = M().kolom.filter(k => k.bagian === g); return {nih: ks.find(k => k.nihil), lain: ks.filter(k => !k.nihil)}; };
  const isiBagianHtml = g => { const {nih, lain} = bagianKolom(g), v0 = k => k.tipe === "wilayah" ? form.baris?.[k.nama] : form.baris?.data?.[k.nama];
    return `${nih ? `<label class="mj-nihil"><input type="checkbox" name="${esc(nih.nama)}" ${v0(nih) ? "checked" : ""}>${IK.ok}${esc(nih.label)}</label>` : ""}
      <fieldset class="mj-fs" data-g="${esc(g)}"><div class="bn-baris">${lain.map(k => isian(k, v0(k))).join("")}</div></fieldset>`; };
  /* isi satu bagian (sekali): HTML, lalu isian mentah (draf menimpa catatan) dan kunci Nihil */
  const isiBagian = d => {
    if (!d || d.dataset.siap) return; d.dataset.siap = "1";
    const bi = d.querySelector(".mj-bi"), f = d.closest("form"); bi.innerHTML = isiBagianHtml(d.dataset.g);
    for (const e of bi.querySelectorAll("[name]")) { const o = form.mentah[e.name]; if (o === undefined) continue; if (e.type === "checkbox") e.checked = (o || []).includes(e.value); else e.value = o; }
    sinkronNihil(f);
  };
  const panelDampak = () => {
    const m = M(), t = form.mode, sempit = matchMedia("(max-width:640px)").matches;
    form.mentah = {...mentahDari(form.baris), ...(bacaDraf() || {})}; form.ada = !!bacaDraf(); form.sempit = sempit; form.token = {};
    const bagianHtml = Object.keys(m.bagian).map((g, i) => `<details class="mj-bagian" data-g="${esc(g)}" ${sempit && i ? "" : "open"}><summary><span class="mj-bt">${esc(m.bagian[g])}</span><span class="mj-bc" data-hitung="${esc(g)}"></span>${IK.lipat}</summary>
        <div class="mj-bi"></div></details>`).join("");
    return `<form class="bn-blok mj-form mj-dampak" id="mjForm" autocomplete="off" novalidate><h2>${IK.tambah}${esc(t === "ubah" ? "Ubah" : "Tambah")} ${esc(m.nama.toLowerCase())}</h2>
      <div class="mj-meter" role="group" aria-label="Kelengkapan isian"><div class="mj-meter-a"><b data-persen>…</b><span data-ket>Menghitung kelengkapan</span></div><progress max="100" value="0" aria-label="Persen kelengkapan"></progress>
        <button type="button" class="mj-btn kecil" data-kurang="1" aria-expanded="false">${IK.info}Butir yang kurang</button></div>
      <div class="mj-kurang" hidden></div>
      <p class="mj-redup mj-nol">Angka 0 berarti memang tidak ada. Kolom kosong berarti belum didata. Bagian tanpa kejadian dipilih Tidak ada.</p>
      ${bagianHtml}<div class="mj-aksi"><button class="mj-btn utama" type="submit">${IK.ok}Simpan</button><button class="mj-btn" type="button" data-batal="1">${IK.tutup}Batal</button></div></form>`;
  };
  /* mentah dari elemen yang sudah ada, ditumpuk di atas form.mentah (bagian yang belum dirender) */
  const ambilMentah = f => {
    const o = {...form.mentah}, lihat = new Set();
    for (const e of f.elements) {
      if (!e.name) continue;
      if (e.type === "checkbox") { if (!lihat.has(e.name)) { lihat.add(e.name); o[e.name] = []; } if (e.checked) o[e.name].push(e.value); } else o[e.name] = e.value;
    }
    return form.mentah = o;
  };
  const ketik = (k, raw) => k.tipe === "angka" ? angkaId(String(raw).trim()) : k.tipe === "ya" ? (raw || []).length > 0 : k.tipe === "multi" ? raw : String(raw).trim();
  const dataForm = f => {   // isian dampak + wilayah (elemen yang ada, lalu mentah untuk bagian yang belum dirender)
    const kolom = M().kolom, d = ambil(f, kolom), belum = g => !f.querySelector(`details[data-g="${g}"]`)?.dataset.siap;
    const nihG = new Set(kolom.filter(k => k.nihil && belum(k.bagian) && (form.mentah[k.nama] || []).length).map(k => k.bagian));
    for (const k of kolom) {
      if (k.tipe === "gudang" || !belum(k.bagian)) continue;
      const raw = form.mentah[k.tipe === "wilayah" ? "_" + k.nama : k.nama]; if (raw == null || raw === "" || (Array.isArray(raw) && !raw.length)) continue;
      if (k.tipe === "wilayah") { if (String(raw).trim()) d[k.nama] = String(raw).trim(); } else if (!(k.bagian && !k.nihil && nihG.has(k.bagian))) d[k.nama] = ketik(k, raw);
    }
    for (const n of ["kec", "desa"]) { const e = f.elements["_" + n]; if (e && e.value.trim()) d[n] = e.value.trim(); }
    return d;
  };
  let tmHitung = 0, tmDraf = 0, terakhir = null;
  const hitungMeter = () => {
    const f = document.getElementById("mjForm"); if (!f || !dampakM()) return;
    const kolom = M().kolom, d = dataForm(f), h = kelengkapan(kolom, d), b = butir(kolom, d); terakhir = {h, d};
    f.querySelector("[data-persen]").textContent = ID.format(h.persen) + "%"; f.querySelector("progress").value = h.persen;
    f.querySelector("[data-ket]").textContent = h.inti_lengkap ? "Data inti lengkap, siap diajukan verifikasi." : `${ID.format(h.kurang_inti.length)} butir inti belum terjawab.`;
    f.querySelector(".mj-meter").dataset.nada = h.persen >= 100 ? "ok" : h.inti_lengkap ? "tunggu" : "bahaya";
    for (const g of Object.keys(M().bagian)) {
      const ada = d[bagianKolom(g).nih?.nama] === true, bg = b.filter(x => x.bagian === g), j = bg.filter(x => x.terjawab).length;
      f.querySelector(`[data-hitung="${g}"]`).textContent = ada ? "Tidak ada" : bg.length ? `${ID.format(j)} dari ${ID.format(bg.length)}` : "";
    }
    for (const w of f.querySelectorAll("[data-bila]")) {   // butir bersyarat tampil bila salah satu kolom induk > 0 atau sudah terisi
      const e = w.querySelector("input"), tampil = w.dataset.bila.split(",").some(n => Number(d[n]) > 0) || !!e.value.trim(); if (w.hidden === tampil) w.hidden = !tampil;
    }
    const kr = f.querySelector(".mj-kurang");
    if (!kr.hidden) isiKurang(kr, h);
  };
  const isiKurang = (kr, h) => {
    kr.replaceChildren(...(h.kurang_inti.length ? [Object.assign(document.createElement("b"), {textContent: "Butir inti yang kurang"}), ...h.kurang_inti.map(x => { const a = document.createElement("button"); a.type = "button"; a.className = "mj-lompat"; a.dataset.ke = x.nama; a.textContent = x.label; return a; })] : [Object.assign(document.createElement("b"), {textContent: "Semua butir inti sudah terjawab."})]));
  };
  const simpanDraf = () => { const f = document.getElementById("mjForm"); if (f && form && dampakM() && f.querySelector("details[data-siap]")) tulisDraf(ambilMentah(f)); };
  const jadwalHitung = () => { clearTimeout(tmHitung); tmHitung = setTimeout(hitungMeter, 180); clearTimeout(tmDraf); tmDraf = setTimeout(simpanDraf, 500); };
  const sinkronNihil = f => { for (const k of M().kolom.filter(x => x.nihil)) { const fs = f.querySelector(`fieldset[data-g="${k.bagian}"]`), c = f.elements[k.nama]; if (fs && c) fs.disabled = !!c.checked; } };
  const bukaBagian = g => { const d = document.querySelector(`#mjForm details[data-g="${g}"]`); if (d) { isiBagian(d); d.open = true; } return d; };
  const renderSemuaBagian = () => { for (const d of document.querySelectorAll("#mjForm details.mj-bagian")) isiBagian(d); };
  /* kerangka sudah tercat: bagian pertama sekarang, sisanya (yang terbuka) sesudah satu frame; sekali per pembukaan formulir */
  const pasangFormDampak = () => {
    const f = document.getElementById("mjForm"); if (!f || !dampakM()) return;
    const token = form.token; isiBagian(f.querySelector("details.mj-bagian"));
    sesudahFrame(() => {
      if (form?.token !== token || document.getElementById("mjForm") !== f) return;
      form.siapToggle = true;
      for (const d of f.querySelectorAll("details.mj-bagian[open]")) isiBagian(d);
      if (form.ada && !pesanT) { lapor("Draf yang belum tersimpan dipulihkan dari perangkat ini.", true); const p = app.querySelector(".mj-pesan"); if (p) { p.className = "mj-pesan ok"; p.textContent = pesanT; } }
      sinkronNihil(f); hitungMeter();
    });
  };
  /* galat server menyebut kolomnya (data pribadi, rentang): pasang pesan di bawah kolom itu dan buka bagiannya */
  const tandaiGalat = (f, teks) => {
    f.querySelectorAll(".mj-galat").forEach(x => x.remove()); const tl = teks.toLowerCase(); let satu = null;
    for (const k of M().kolom) {
      if (k.tipe === "gudang" || k.nihil || !(tl.includes(k.label.toLowerCase()) || new RegExp(`\\b${k.nama}\\b`).test(tl))) continue;
      const e = f.elements[k.tipe === "wilayah" ? "_" + k.nama : k.nama]; const w = e?.closest?.("label,.bn-isian"); if (!w) continue;
      const p = Object.assign(document.createElement("small"), {className: "mj-galat", textContent: teks}); w.append(p); w.closest("details")?.setAttribute("open", ""); satu ||= e;
    }
    if (satu) { satu.scrollIntoView({block: "center"}); satu.focus({preventScroll: true}); }
  };
  const panelForm = () => {
    if (dampakM() && (form.mode === "baru" || form.mode === "ubah")) return panelDampak();
    if (form.mode === "stok") return `<form class="bn-blok mj-form" id="mjForm" autocomplete="off" novalidate><h2>${IK.tambah}${esc(label(form.jenis))}: ${esc(form.baris.data.gudang)}, ${esc(label(form.baris.data.barang).toLowerCase())}</h2>
      <div class="bn-baris"><label class="bn-isian">Jumlah *<input name="_jumlah" inputmode="numeric" autocomplete="off"></label><label class="bn-isian">Catatan (opsional)<input name="_catatan" maxlength="200" autocomplete="off"></label></div>
      <div class="mj-aksi"><button class="mj-btn utama" type="submit">Simpan</button><button class="mj-btn" type="button" data-batal="1">Batal</button></div></form>`;
    const m = M(), t = form.mode;
    const kolom = m.kolom.filter(k => (k.tahap ?? null) === (t === "status" ? form.ke : null)), r = form.baris;
    const wil = t === "status" ? "" : `<div class="bn-baris">${m.wilayah.desa || t === "ubah" && r.desa ? `<label class="bn-isian">Desa${m.wilayah.desa ? " *" : ""}<input name="_desa" maxlength="80" autocomplete="off" value="${esc(r?.desa ?? "")}"></label>` : ""}
      ${m.wilayah.kec ? `<label class="bn-isian">Kecamatan *<input name="_kec" maxlength="60" autocomplete="off" value="${esc(r?.kec ?? "")}"></label>` : ""}</div>`;
    const judul = t === "baru" ? `Tambah ${m.nama.toLowerCase()}` : t === "ubah" ? `Ubah ${m.nama.toLowerCase()}` : `Pindah ke ${label(form.ke).toLowerCase()}`;
    return `<form class="bn-blok mj-form" id="mjForm" autocomplete="off" novalidate><h2>${IK.tambah}${esc(judul)}</h2>${wil}
      ${t === "baru" && m.tautKaji ? `<label class="bn-isian">Kaji cepat induk (opsional, yang sudah masuk JITUPASNA)<select name="_kaji">${opsKaji()}</select></label>` : ""}
      <div class="bn-baris">${kolom.map(k => isian(k, r?.data?.[k.nama])).join("")}</div>
      ${t === "status" ? `<label class="bn-isian">Catatan (opsional)<input name="_catatan" maxlength="200" autocomplete="off"></label>` : ""}
      <div class="mj-aksi"><button class="mj-btn utama" type="submit">Simpan</button><button class="mj-btn" type="button" data-batal="1">Batal</button></div></form>`;
  };
  function htmlTabel() {
    const m = M(), urutF = urutan[urut], b = [...daftar].sort((x, y) => (urutF(x) > urutF(y) ? 1 : urutF(x) < urutF(y) ? -1 : 0) * arah), n = b.length, h = Math.min(hal, Math.max(0, Math.ceil(n / HAL) - 1));
    const th = (k, t) => `<th data-urut="${k}" ${urut === k ? `aria-sort="${arah > 0 ? "ascending" : "descending"}"` : ""}>${t}</th>`;
    return `<div class="mj-wadah"><table class="mj-tabel${dampakM() ? " mj-t-dampak" : ""}"><thead><tr>${th("wilayah", m.wilayah.desa ? "Desa" : "Wilayah")}<th>Isi</th>${th("status", dampakM() ? "Status dan kelengkapan" : "Status")}${th("diubah", "Diubah")}<th>Aksi</th></tr></thead>
      <tbody>${n ? b.slice(h * HAL, h * HAL + HAL).map(baris).join("") : `<tr><td colspan="5" class="mj-kosong">Belum ada catatan. Tekan Tambah untuk mengisi.</td></tr>`}</tbody></table></div>
      ${n > HAL ? `<div class="mj-hal"><button class="mj-btn kecil" data-hal="-1" ${h ? "" : "disabled"}>Sebelumnya</button>Halaman ${h + 1} dari ${Math.ceil(n / HAL)}<button class="mj-btn kecil" data-hal="1" ${(h + 1) * HAL < n ? "" : "disabled"}>Berikutnya</button></div>` : ""}`;
  }
  const segarkanTabel = () => { const w = document.getElementById("mjTabel"); if (w) w.innerHTML = form ? "" : htmlTabel(); const c = document.getElementById("mjJumlah"); if (c) c.textContent = `${daftar.length} catatan di ${saya.petugas.kab}`; };
  /* ---------- impor .xlsx (meja dampak) ---------- */
  const panelImpor = () => {
    if (!imp) return "";
    const tombolTutup = `<button class="mj-btn kecil" data-impor-tutup="1">${IK.tutup}Tutup</button>`;
    if (imp.tahap === "baca") return `<div class="bn-blok mj-impor"><h2>${IK.berkas}Membaca ${esc(imp.nama)}</h2><p class="mj-redup">Berkas dibaca di perangkat ini, belum dikirim ke mana pun.</p></div>`;
    const jml = imp.baris.length, baris = (l, kol) => l.map(x => `<tr>${kol.map(c => `<td>${esc(c(x))}</td>`).join("")}</tr>`).join("");
    if (imp.tahap === "pratinjau") {
      const h = imp.hasil, nGalat = h.galat.length;
      return `<div class="bn-blok mj-impor"><h2>${IK.berkas}Pratinjau impor: ${esc(imp.nama)}</h2>
        <p>${jml ? `<b>${ID.format(jml)}</b> baris siap dikirim` : "Tidak ada baris yang bisa dikirim"}${nGalat ? `, <b>${ID.format(nGalat)}</b> baris bermasalah tidak ikut dikirim` : ""}${h.kosong ? `, ${ID.format(h.kosong)} baris kosong dilewati` : ""}.
        ${ID.format(h.dikenal)} kolom dikenali${h.asing.length ? `; kolom tidak dikenal diabaikan: ${esc(h.asing.slice(0, 6).join(", "))}${h.asing.length > 6 ? " dan lainnya" : ""}` : ""}. Dikirim per ${ID.format(imp.perKirim)} baris dalam ${ID.format(imp.bagian.length)} kiriman; ada batas 5 kiriman per jam.</p>
        ${jml ? `<div class="mj-wadah"><table class="mj-tabel"><thead><tr><th>Baris Excel</th><th>Kecamatan</th><th>Jenis</th><th>Nama kejadian</th><th>Tanggal</th></tr></thead><tbody>${baris(imp.baris.slice(0, 5), [x => x.sumber, x => x.kec || "–", x => label(x.data.jenis || "–"), x => x.data.nama_kejadian || "–", x => x.data.tanggal || "–"])}</tbody></table></div>` : ""}
        ${nGalat ? `<div class="mj-wadah"><table class="mj-tabel"><thead><tr><th>Baris Excel</th><th>Masalah</th></tr></thead><tbody>${baris(h.galat.slice(0, 20), [x => x.sumber, x => x.pesan])}</tbody></table></div>${nGalat > 20 ? `<p class="mj-redup">Dan ${ID.format(nGalat - 20)} baris bermasalah lainnya.</p>` : ""}` : ""}
        <div class="mj-aksi">${jml ? `<button class="mj-btn utama" data-impor-kirim="1">${IK.maju}Kirim ${ID.format(jml)} baris</button>` : ""}${tombolTutup}</div></div>`;
    }
    const tot = imp.total, fin = imp.tahap === "selesai", n = imp.ringkas;
    return `<div class="bn-blok mj-impor"><h2>${IK.berkas}${fin ? "Hasil impor" : "Mengirim"}: ${esc(imp.nama)}</h2>
      ${fin ? "" : `<progress max="${tot}" value="${imp.terkirim}" aria-label="Kemajuan kirim"></progress><p class="mj-redup">${ID.format(imp.terkirim)} dari ${ID.format(tot)} baris sudah diproses.</p>`}
      <p><b>${ID.format(n.masuk)}</b> masuk, <b>${ID.format(n.ganda)}</b> sudah ada sebelumnya, <b>${ID.format(n.galat + imp.hasil.galat.length)}</b> gagal${imp.sisa.length ? `, <b>${ID.format(imp.sisa.reduce((a, c) => a + c.length, 0))}</b> belum terkirim` : ""}.</p>
      ${imp.henti ? `<p class="mj-pesan galat" role="alert">${esc(imp.henti)}</p>` : ""}
      ${imp.gagal.length || imp.hasil.galat.length ? `<div class="mj-wadah"><table class="mj-tabel"><thead><tr><th>Baris Excel</th><th>Alasan</th></tr></thead><tbody>${baris([...imp.hasil.galat, ...imp.gagal].sort((a, c) => a.sumber - c.sumber).slice(0, 100), [x => x.sumber, x => x.pesan])}</tbody></table></div>` : ""}
      <div class="mj-aksi">${imp.sisa.length && fin ? `<button class="mj-btn utama" data-impor-lanjut="1">${IK.maju}Lanjutkan ${ID.format(imp.sisa.reduce((a, c) => a + c.length, 0))} baris</button>` : ""}${fin ? tombolTutup : ""}</div></div>`;
  };
  const segarkanImpor = () => { const w = document.getElementById("mjImpor"); if (w) w.innerHTML = panelImpor(); };
  async function bacaBerkas(file) {
    imp = {tahap: "baca", nama: file.name}; segarkanImpor();
    try {
      if (file.size > 8 * 1024 * 1024) throw new Error("Berkas lebih dari 8 MB. Pecah menjadi beberapa berkas.");
      const info = (a, b) => { const w = document.querySelector("#mjImpor .mj-impor p"); if (w) w.textContent = `Membaca baris ${ID.format(a)} dari ${ID.format(b)}.`; };
      const hasil = await barisDariLembar(await bacaXlsx(await file.arrayBuffer()), M().kolom, info);
      const bagian = await potong(hasil.baris.map(({sumber, ...o}) => ({sumber, o})));   // {sumber, o:{kec, desa, data}} per baris, dipecah 50 baris / 240 KB
      imp = {tahap: "pratinjau", nama: file.name, hasil, baris: hasil.baris, bagian, perKirim: 50};
    } catch (e) { imp = null; lapor(e.message || "Berkas tidak terbaca.", false); gambar(); return; }
    segarkanImpor();
  }
  async function kirimImpor(lanjut) {
    if (!lanjut) { imp = {...imp, tahap: "kirim", total: imp.baris.length, terkirim: 0, ringkas: {masuk: 0, ganda: 0, galat: 0}, gagal: [], sisa: imp.bagian.slice(), henti: ""}; }
    else { imp.tahap = "kirim"; imp.henti = ""; }
    segarkanImpor();
    while (imp.sisa.length) {
      const b = imp.sisa[0], r = await api("POST", "/api/meja/impor", {baris: b.map(x => x.o)});
      if (!r.ok) {
        imp.henti = r.s === 429 ? `Batas kirim tercapai (paling banyak 5 kiriman per jam)${r.tunggu ? `; coba lagi sekitar ${Math.ceil(r.tunggu / 60)} menit lagi` : ""}. Baris yang belum terkirim tetap di sini; tekan Lanjutkan nanti tanpa menutup halaman ini.`
          : r.s === 0 ? "Tidak ada sinyal. Impor berhenti; tekan Lanjutkan saat sinyal kembali." : `Pengiriman berhenti: ${r.j.galat || r.s}`;
        break;
      }
      for (const h of r.j.hasil) {
        const x = b[h.baris - 1]; if (!x) continue;
        if (h.status === "masuk") imp.ringkas.masuk++; else if (h.status === "ganda") { imp.ringkas.ganda++; } else { imp.ringkas.galat++; imp.gagal.push({sumber: x.sumber, pesan: h.galat || "ditolak"}); }
      }
      imp.sisa.shift(); imp.terkirim += b.length; segarkanImpor();
    }
    imp.tahap = "selesai"; segarkanImpor(); await muat(true);
  }
  function gambar() {
    const m = M(), n = daftar.length;
    app.innerHTML = `<div class="mj-kop"><h1>Meja Kerja</h1><span class="mj-pil t-info">${IK.kab}${esc(saya.petugas.kab)}</span><span class="mj-redup">${esc(saya.petugas.nama)}</span>
      <button class="mj-btn kecil mj-ruang" data-keluar="1">${IK.keluar}Keluar</button></div>
      <nav class="mj-meja" aria-label="Pilih meja">${S.meja.filter(x => saya.petugas.meja.includes(x.id)).map(x => `<button data-meja="${x.id}" aria-pressed="${x.id === meja}">${svg(x.ikon)}${esc(x.nama)}</button>`).join("")}</nav>
      <p class="mj-pesan ${pesanOk ? "ok" : "galat"}" role="status">${esc(pesanT)}</p>
      ${form ? panelForm() : `<div class="mj-bar"><button class="mj-btn utama" data-baru="1">${IK.tambah}Tambah ${esc(m.nama.toLowerCase())}</button>
        ${dampakM() ? `<button class="mj-btn" data-impor-pilih="1">${IK.berkas}Impor dari Excel</button><a class="mj-btn" href="/bnpb/templat/data-dampak.xlsx" download>${IK.unduh}Unduh templat</a><input type="file" id="mjBerkas" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" hidden>` : ""}
        <span class="mj-redup" id="mjJumlah">${n} catatan di ${esc(saya.petugas.kab)}</span></div>`}
      <div id="mjImpor">${panelImpor()}</div>
      <div id="mjTabel">${form ? "" : htmlTabel()}</div>`;
    pasangFormDampak();
  }
  const lapor = (t, ok) => { pesanT = t; pesanOk = ok; };
  async function muat(tanpaForm) {
    const r = await api("GET", `/api/meja/catatan?meja=${meja}`);
    if (!r.ok) { lapor(r.j.galat || `Gagal memuat (${r.s})`, false); daftar = []; } else daftar = r.j.catatan;
    if (form && document.getElementById("mjForm") || tanpaForm && document.getElementById("mjTabel")) { segarkanTabel(); return; }   // formulir/impor terbuka: isiannya tidak boleh ikut terhapus
    buka = new Map(); gambar();
  }
  const salah = (r, t) => {   // galat di tempat: isian form tetap
    lapor(r.j.galat || `${t} (${r.s})`, false);
    const p = app.querySelector(".mj-pesan"); if (p) { p.className = "mj-pesan galat"; p.textContent = pesanT; } else gambar();
  };

  /* ---------- peristiwa ---------- */
  app.addEventListener("click", async e => {
    const t = e.target.closest("button"); if (!t) return;
    const tr = t.closest("tr"), r = tr && daftar.find(x => x.id === tr.dataset.id);
    if (t.dataset.meja) {   // chrome urgent: tombol terpilih dan "Memuat" seketika, data menyusul
      meja = t.dataset.meja; form = null; hal = 0; lapor("", true);
      app.querySelectorAll("[data-meja]").forEach(b => b.setAttribute("aria-pressed", String(b === t)));
      const w = document.getElementById("mjTabel"); if (w) w.innerHTML = '<p class="mj-redup" aria-busy="true">Memuat…</p>';
      return muat();
    }
    if (t.dataset.keluar) { sessionStorage.removeItem(KUNCI); location.reload(); return; }
    if (t.dataset.urut) { arah = urut === t.dataset.urut ? -arah : 1; urut = t.dataset.urut; return segarkanTabel(); }
    if (t.dataset.hal) { hal += +t.dataset.hal; return segarkanTabel(); }
    if (t.dataset.imporPilih) return document.getElementById("mjBerkas").click();
    if (t.dataset.imporTutup) { imp = null; return segarkanImpor(); }
    if (t.dataset.imporKirim) { if (!imp || imp.tahap !== "pratinjau") return; return kirimImpor(false); }
    if (t.dataset.imporLanjut) { if (imp?.tahap === "selesai") return kirimImpor(true); return; }
    if (t.dataset.kurang) {   // daftar butir kurang di formulir
      const kr = app.querySelector(".mj-kurang"), buka2 = kr.hidden; kr.hidden = !buka2; t.setAttribute("aria-expanded", String(buka2)); if (buka2 && terakhir) isiKurang(kr, terakhir.h); return;   // pakai hasil hitung terakhir, tanpa hitung ulang
    }
    if (t.dataset.ke) {   // loncat ke butir yang kurang: buka bagiannya (dirender bila belum), gulir sesudah frame
      const f = document.getElementById("mjForm"), nama = t.dataset.ke, g = nama.startsWith("bagian_") ? nama.slice(7) : M().kolom.find(k => k.nama === nama)?.bagian;
      const d = g && bukaBagian(g), e = nama.startsWith("bagian_") ? d : f.elements[nama] || f.elements["_" + nama];
      const w = e?.closest?.(".mj-bila"); if (w) w.hidden = false;
      requestAnimationFrame(() => { e?.scrollIntoView({block: "center"}); if (e?.focus && e.tagName !== "DETAILS") e.focus({preventScroll: true}); }); return;
    }
    if (t.dataset.baru) {
      if (form) return;   // ketuk ganda
      t.disabled = true; form = {mode: "baru"}; kajiOps = []; const f0 = form; gambar();
      if (M().tautKaji) {   // kaji cepat siap rehab yang belum punya catatan rehab; form sudah tampil, hanya <select> diisi menyusul
        const [k, rh] = await Promise.all([api("GET", "/api/meja/catatan?meja=kaji_cepat&status=masuk_jitupasna&untuk=rehab"), api("GET", "/api/meja/catatan?meja=rehab")]);
        const dipakai = new Set((rh.j.catatan || []).map(x => x.kaji_id).filter(Boolean)); kajiOps = (k.j.catatan || []).filter(x => !dipakai.has(x.id));
        const sel = form === f0 && app.querySelector('select[name="_kaji"]'); if (sel) sel.innerHTML = opsKaji();
      }
      return;
    }
    if (t.dataset.stok && r) { form = {mode: "stok", baris: r, jenis: t.dataset.stok}; return gambar(); }
    if (t.dataset.batal) { if (dampakM()) { clearTimeout(tmDraf); tulisDraf(null); } form = null; return gambar(); }
    if (t.dataset.ubah && r) { form = {mode: "ubah", baris: r}; return gambar(); }
    if (t.dataset.status && r && dampakM()) {   // meja dampak: tanpa isian tahap, kirim langsung; server menolak verifikasi yang intinya belum lengkap dan menyebut butirnya
      t.disabled = true;
      const x = await antre.kirim("POST", `/api/meja/catatan/${r.id}`, {aksi: "status", ke: t.dataset.status});
      if (!x.ok) {
        t.disabled = false; lapor(x.j.galat || `Gagal (${x.s})`, false);
        const p = app.querySelector(".mj-pesan"); if (p) { p.className = "mj-pesan galat"; p.textContent = pesanT; p.scrollIntoView({block: "nearest"}); }
        if (!buka.has(r.id)) { const d = await api("GET", `/api/meja/catatan/${r.id}`); if (d.ok) { buka.set(r.id, d.j); segarkanTabel(); } }
        return;
      }
      if (x.antre) { lapor("Disimpan di perangkat. Dikirim otomatis begitu ada sinyal.", true); segarkanPita(); return segarkanTabel(); }
      lapor(t.dataset.status === "diverifikasi" ? "Diajukan. Catatan ini berstatus diverifikasi dan menunggu diterima Pusdalops." : "Tersimpan.", true); return muat();
    }
    if (t.dataset.status && r) { form = {mode: "status", baris: r, ke: t.dataset.status}; return gambar(); }
    if (t.dataset.rinci && r) {
      if (buka.has(r.id)) buka.delete(r.id); else {
        t.disabled = true; t.setAttribute("aria-busy", "true");   // cegah fetch ganda
        const d = await api("GET", `/api/meja/catatan/${r.id}`); if (!d.ok) { t.disabled = false; t.removeAttribute("aria-busy"); return salah(d, "Gagal memuat rincian"); } buka.set(r.id, d.j);
      }
      segarkanTabel();
    }
  });
  app.addEventListener("input", e => { const f = e.target.form; if (f?.id === "mjForm" && dampakM()) jadwalHitung(); });
  app.addEventListener("toggle", e => { if (form?.siapToggle && e.target.matches?.("details.mj-bagian") && e.target.open) isiBagian(e.target); }, true);   // bagian tertutup di HP dirender saat pertama dibuka
  addEventListener("pagehide", simpanDraf); document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") simpanDraf(); });
  app.addEventListener("change", e => {
    const t = e.target, f = t.form;
    if (t.id === "mjBerkas") { const x = t.files[0]; t.value = ""; if (x) bacaBerkas(x); return; }
    if (f?.id === "mjForm" && dampakM()) { if (M().kolom.some(k => k.nihil && k.nama === t.name)) sinkronNihil(f); jadwalHitung(); }   // Nihil: bagian terkunci seketika, hitungan menyusul
  });
  app.addEventListener("submit", async e => {
    e.preventDefault(); const f = e.target, m = M(), tombol = f.querySelector('button[type="submit"]'); tombol.disabled = true;
    f.querySelectorAll(".mj-galat").forEach(x => x.remove()); if (dampakM()) renderSemuaBagian();   // semua bagian harus ada sebelum isian dibaca
    if (form.mode === "stok") {
      const r = await api("POST", `/api/meja/catatan/${form.baris.id}`, {aksi: "stok", jenis: form.jenis, jumlah: angkaId(f.elements._jumlah.value.trim()), ...(f.elements._catatan.value.trim() ? {catatan: f.elements._catatan.value.trim()} : {})});
      if (!r.ok) { tombol.disabled = false; return salah(r, "Gagal menyimpan stok"); }
      form = null; lapor("Stok tersimpan.", true); return muat();
    }
    const kolom = m.kolom.filter(k => (k.tahap ?? null) === (form.mode === "status" ? form.ke : null)), data = ambil(f, kolom);
    const wil = dampakM() ? {kec: f.elements._kec?.value.trim() || undefined, desa: f.elements._desa?.value.trim() || undefined} : {...(f.elements._desa ? {desa: f.elements._desa.value.trim() || undefined} : {}), ...(f.elements._kec ? {kec: f.elements._kec.value.trim() || undefined} : {})};
    const r = form.mode === "baru" ? await antre.kirim("POST", "/api/meja/catatan", {meja, ...wil, ...(m.tautKaji && f.elements._kaji?.value ? {kaji_id: f.elements._kaji.value} : {}), data})
      : form.mode === "ubah" ? await antre.kirim("POST", `/api/meja/catatan/${form.baris.id}`, {aksi: "ubah", ...wil, data})
      : await antre.kirim("POST", `/api/meja/catatan/${form.baris.id}`, {aksi: "status", ke: form.ke, data, ...(f.elements._catatan.value.trim() ? {catatan: f.elements._catatan.value.trim()} : {})});
    if (!r.ok) { tombol.disabled = false; salah(r, "Gagal menyimpan"); if (dampakM()) tandaiGalat(f, r.j.galat || ""); return; }
    if (dampakM()) { clearTimeout(tmDraf); tulisDraf(null); }
    form = null;
    if (r.antre) { lapor("Disimpan di perangkat dengan jam saat ini. Dikirim otomatis begitu ada sinyal.", true); segarkanPita(); return gambar(); }
    lapor("Tersimpan.", true); muat();
  });

  /* ---------- mulai ---------- */
  async function mulai() {
    const dariUrl = location.hash.match(/(?:^|[#&])k=([0-9a-fA-F]{26})(?:&|$)/);
    if (dariUrl) { sessionStorage.setItem(KUNCI, dariUrl[1].toLowerCase()); history.replaceState(null, "", location.pathname); }   // kode tidak tertinggal di bilah alamat
    kode = sessionStorage.getItem(KUNCI) || "";
    if (kode) segarkanPita = Antre.pasang(antre, {wadah: document.body, selesai: () => { if (meja) muat(); }, buang: l => lapor(l.map(x => x.pesan).join("; "), false)});   // kirim ulang segera, tanpa menunggu spek
    if (!kode) { app.innerHTML = '<p class="mj-pesan galat">Halaman ini hanya untuk petugas yang punya tautan dari admin. Buka lagi tautan yang dikirim kepadamu.</p>'; return; }
    const [sp, sy] = await Promise.all([fetch("/api/meja/spek").then(r => r.json()).catch(() => null), api("GET", "/api/meja/saya")]);
    if (sy.s === 0 || !sp) { app.innerHTML = '<p class="mj-pesan galat">Tidak ada sinyal, Meja Kerja belum bisa dibuka. Kiriman yang sudah disimpan di perangkat tetap dikirim otomatis saat sinyal kembali.</p>'; return; }
    if (!sy.ok || sy.j.peran !== "petugas") { sessionStorage.removeItem(KUNCI); app.innerHTML = `<p class="mj-pesan galat">${esc(sy.j.galat || "Kodemu tidak berlaku.")} Minta tautan baru dari admin.</p>`; return; }
    S = sp; saya = sy.j; meja = S.meja.find(m => saya.petugas.meja.includes(m.id))?.id;
    if (!meja) { app.innerHTML = '<p class="mj-pesan galat">Kodemu belum punya meja yang boleh diisi.</p>'; return; }
    muat();
  }
  mulai().catch(() => { app.innerHTML = '<p class="mj-pesan galat">Gagal memuat Meja Kerja. Periksa sambunganmu lalu muat ulang.</p>'; });
}
