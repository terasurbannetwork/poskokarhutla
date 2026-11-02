/* Panel Lapangan, tahap A: bagian Data induk (impor CSV pegawai, tabel orang, kirim tautan pribadi). Masuk = sesi staf (cookie), seperti halaman admin lain. */
import {$, esc, angka, api, pasangTema, pasangDummy, nanti, adalahSuper} from "./umum.js";
import {statusWajah, labelJenis, pesanGalat, cekCsv, tautanLapangan, potong} from "./murni.js";
import {ik} from "./ikon.js";
import {opsKerangka, pasangOps} from "./panel_ops.js";
import {panggilKerangka, pasangPanggil, deretKeahlian, kelolaBaris, ubahKeahlian} from "./panel_panggil.js";
import {daftarKeahlian, queryOrang, barisOrang, keahlianOrang, keahlianItem} from "./panggil_murni.js";

const akar = $("lpPanel");
let csvAman = null;            // teks CSV yang sudah dipratinjau tanpa galat; Simpan hanya untuk teks ini
let punyaSuper = false, keahlianPilih = "";
let q = "", jenis = "", hal = 1, ukuran = 0, tunda = 0, tokenMuat = 0;

const kerangka = () => `
<section class="lp-kartu"><h2>Data induk: impor pegawai</h2>
  <p class="lp-kecil">Kolom: nama, nip, unit, jabatan, wa, email, prov, kab. Baris pertama berisi judul kolom. Pratinjau dulu, baru simpan.</p>
  <div class="lp-form">
    <label class="lp-kecil" for="lpBerkas">Pilih berkas CSV</label><input id="lpBerkas" type="file" accept=".csv,text/csv,text/plain">
    <label class="lp-kecil" for="lpCsv">Atau tempel isi CSV</label><textarea id="lpCsv" spellcheck="false" placeholder="nama,nip,unit,jabatan,wa,email,prov,kab"></textarea>
    <div class="lp-dua"><button class="lp-tbl" id="lpPratinjau" type="button">Pratinjau</button><button class="lp-tbl utama" id="lpSimpan" type="button" disabled>Simpan</button></div>
  </div>
  <div id="lpHasil" aria-live="polite"></div>
</section>
<section class="lp-kartu"><h2>Daftar orang</h2>
  <div class="lp-alat lp-form">
    <input id="lpCari" type="search" placeholder="Cari nama, NIP, atau unit" aria-label="Cari orang" autocomplete="off">
    <select id="lpJenis" aria-label="Saring jenis"><option value="">Semua jenis</option><option value="pegawai">Pegawai</option><option value="relawan">Relawan BNPB</option></select>
  </div>
  <fieldset class="lp-chips lp-saring" id="lpSaringKeahlian"><legend>Saring keahlian</legend>${deretKeahlian("skeahlian", "radio", daftarKeahlian(), `<label class="lp-chip"><input type="radio" name="skeahlian" value="" checked><span>${ik("orang", 20)}Semua</span></label>`)}</fieldset>
  <div id="lpOrang" aria-live="polite"></div>
</section>`;

/* ---------- impor ---------- */
const hasilImpor = (r, simpan) => {
  const d = r.data, tolak = d.ditolak || [], {tampil: tolakTampil, sisa: tolakSisa} = potong(tolak), contoh = d.contoh || [];
  const kolom = contoh[0] ? Object.keys(contoh[0]) : [];
  return `<div class="lp-angka lp-atas" ><div><b>${angka(d.baru)}</b>baru</div><div><b>${angka(d.berubah)}</b>berubah</div><div><b>${angka(d.sama)}</b>sama</div></div>
  ${simpan ? `<p class="lp-pil hijau lp-atas" role="status">Tersimpan</p>` : ""}
  ${tolak.length ? `<h3 class="lp-atas">Baris ditolak, ${angka(tolak.length)}</h3><div class="lp-gulir"><table class="lp-tabel"><thead><tr><th>Baris</th><th>Alasan</th></tr></thead><tbody>${tolakTampil.map(t => `<tr><td class="num lp-tengah">${esc(t.baris)}</td><td>${esc(t.alasan)}</td></tr>`).join("")}${tolakSisa ? `<tr><td colspan="2" class="lp-kecil lp-tengah">dan ${angka(tolakSisa)} lainnya</td></tr>` : ""}</tbody></table></div>` : ""}
  ${contoh.length ? `<h3 class="lp-atas">Contoh baris</h3><div class="lp-gulir"><table class="lp-tabel"><thead><tr>${kolom.map(k => `<th>${esc(k)}</th>`).join("")}</tr></thead><tbody>${contoh.map(c => `<tr>${kolom.map(k => `<td>${esc(c[k])}</td>`).join("")}</tr>`).join("")}</tbody></table></div>` : ""}`;
};

function impor(mode) {
  const teks = $("lpCsv").value, kotak = $("lpHasil");
  if (mode === "simpan" && csvAman !== teks) { kotak.innerHTML = `<p class="lp-pil kuning lp-atas" role="alert">Isi CSV berubah. Pratinjau lagi sebelum menyimpan.</p>`; return; }
  const b = $(mode === "simpan" ? "lpSimpan" : "lpPratinjau"), teksTombol = b.textContent;
  $("lpPratinjau").disabled = $("lpSimpan").disabled = true; b.textContent = "Memproses...";
  nanti(async () => {
    const cek = cekCsv(teks);
    if (cek.galat) { b.textContent = teksTombol; $("lpPratinjau").disabled = false; $("lpSimpan").disabled = csvAman !== teks; kotak.innerHTML = `<p class="lp-pil merah lp-atas" role="alert">${esc(cek.galat)}</p>`; return; }
    const r = await api("/api/petugas/panel/impor", {metode: "POST", cookie: true, badan: {mode, csv: teks}});
    b.textContent = teksTombol; $("lpPratinjau").disabled = false;
    if (!r.ok) { csvAman = null; $("lpSimpan").disabled = true; kotak.innerHTML = `<p class="lp-pil merah lp-atas" role="alert">${esc(r.data?.galat || pesanGalat(r.status))}</p>`; return; }
    kotak.innerHTML = hasilImpor(r, mode === "simpan");
    if (mode === "simpan") { csvAman = null; $("lpSimpan").disabled = true; muatOrang(); }
    else { csvAman = teks; $("lpSimpan").disabled = false; }
  });
}

/* ---------- tabel orang ---------- */
async function muatOrang() {
  const token = ++tokenMuat, kotak = $("lpOrang");
  punyaOrang.clear(); kotak.innerHTML = `<div class="lp-rangka" aria-busy="true"><i></i><i></i><i></i></div>`;
  const r = await api(`/api/petugas/panel/orang?${queryOrang({cari: q, jenis, halaman: hal, keahlian: keahlianPilih})}`, {cookie: true});
  if (token !== tokenMuat) return;
  if (!r.ok) { kotak.innerHTML = `<p>${esc(pesanGalat(r.status))}</p><button class="lp-tbl" id="lpUlang" type="button">Ulangi</button>`; $("lpUlang").addEventListener("click", muatOrang); return; }
  const baris = barisOrang(r.data), total = Number(r.data.total) || baris.length; ukuran = Math.max(ukuran, baris.length);
  if (!baris.length) { kotak.innerHTML = `<p class="lp-kecil lp-tengah">${total || q || jenis || keahlianPilih ? "Tidak ada yang cocok dengan pencarianmu." : "Belum ada data induk. Impor CSV pegawai di atas."}</p>`; return; }
  const maju = hal * ukuran < total;
  kotak.innerHTML = `<div class="lp-gulir"><table class="lp-tabel"><thead><tr><th>Nama</th><th>NIP</th><th>Unit</th><th>Jabatan</th><th>Jenis</th><th>Keahlian</th><th>Status wajah</th><th>Aksi</th></tr></thead><tbody>
    ${baris.map(o => { const w = statusWajah(o.wajah_status); return `<tr data-id="${esc(o.id)}"><td><b>${esc(o.nama)}</b></td><td class="num">${esc(o.nip || "-")}</td><td>${esc(o.unit || "-")}</td><td>${esc(o.jabatan || "-")}</td><td>${esc(labelJenis(o.jenis))}</td><td>${keahlianOrang(o).map(k => `<span class="lp-pil" data-k="${esc(k)}">${esc(keahlianItem(k).label)}</span>`).join(" ") || "-"}</td><td class="lp-tengah"><span class="lp-pil ${w.kelas}">${esc(w.label)}</span></td><td><div class="lp-baris"><button class="lp-tbl" type="button" data-kirim="${esc(o.id)}">Kirim tautan</button>${punyaSuper ? `<button class="lp-tbl" type="button" data-kelola="${esc(o.id)}" aria-expanded="false">Kelola keahlian</button>` : ""}</div></td></tr>`; }).join("")}
  </tbody></table></div>
  <div class="lp-halaman"><button class="lp-tbl" id="lpMundur" type="button" ${hal > 1 ? "" : "disabled"}>Sebelumnya</button><span class="lp-kecil num">${angka(total)} orang, halaman ${angka(hal)}</span><button class="lp-tbl" id="lpMaju" type="button" ${maju ? "" : "disabled"}>Berikutnya</button></div>`;
  $("lpMundur").addEventListener("click", () => { hal--; muatOrang(); });
  $("lpMaju").addEventListener("click", () => { hal++; muatOrang(); });
}

function kirimTautan(b) {
  const id = b.dataset.kirim, teks = b.textContent; b.disabled = true; b.textContent = "Menyiapkan...";
  nanti(async () => {
    const r = await api(`/api/petugas/panel/tautan/${encodeURIComponent(id)}`, {metode: "POST", cookie: true, badan: {}});
    if (!b.isConnected) return;
    b.disabled = false; b.textContent = teks;
    const tr = b.closest("tr"); tr.nextElementSibling?.classList.contains("lp-tautan-baris") && tr.nextElementSibling.remove();
    const isiBaris = !r.ok ? `<span class="lp-pil merah">${esc(r.data?.galat || pesanGalat(r.status))}</span>`
      : `${r.data.tautan ? (r.data.antre ? `<p class="lp-kecil">Tautan masuk antrean WA.</p>` : `<p class="lp-kecil">WA kosong, salin tautannya lalu kirim sendiri.</p>`) : `<p class="lp-kecil">Tautan dikirim lewat WA.</p>`}
        ${r.data.tautan ? `<div class="lp-tautan-salin"><input readonly value="${esc(r.data.tautan.startsWith("http") ? r.data.tautan : tautanLapangan(location.origin, r.data.tautan))}" aria-label="Tautan pribadi"><button class="lp-tbl" type="button" data-salin>Salin</button></div>` : ""}`;
    tr.insertAdjacentHTML("afterend", `<tr class="lp-tautan-baris"><td colspan="8">${isiBaris}</td></tr>`);
  });
}

/* kelola keahlian: baris tambahan di bawah baris orang; label keahlian di sel diperbarui dari centang */
const punyaOrang = new Map();   // id -> keahlian[] terkini
function bukaKelola(b) {
  const tr = b.closest("tr"), id = b.dataset.kelola, lama = tr.nextElementSibling?.querySelector("[data-orang]") ? tr.nextElementSibling : null;
  if (lama) { lama.remove(); b.setAttribute("aria-expanded", "false"); return; }
  const punya = punyaOrang.get(id) ?? [...tr.children[5].querySelectorAll(".lp-pil")].map(x => x.dataset.k).filter(Boolean);
  punyaOrang.set(id, punya);
  tr.insertAdjacentHTML("afterend", kelolaBaris({id, nama: tr.querySelector("b").textContent}, punya)); b.setAttribute("aria-expanded", "true");
}
function cacahKeahlian(tr, id, k, ada) {
  const s = new Set(punyaOrang.get(id) ?? []); ada ? s.add(k) : s.delete(k); punyaOrang.set(id, [...s]);
  tr.children[5].innerHTML = [...s].map(x => `<span class="lp-pil" data-k="${esc(x)}">${esc(keahlianItem(x).label)}</span>`).join(" ") || "-";
}

/* ---------- mulai ---------- */
async function mulai() {
  const s = await api("/api/staf/saya", {cookie: true});
  if (s.status === 401) { akar.innerHTML = `<section class="lp-kartu lp-kosong"><h2>Masuk untuk membuka panel</h2><p>Panel ini hanya untuk staf BNPB dan admin.</p><a class="lp-tbl utama" href="/admin">Masuk sebagai staf BNPB</a></section>`; return; }
  if (!s.ok) { akar.innerHTML = `<section class="lp-kartu lp-kosong"><p>${esc(pesanGalat(s.status))}</p><button class="lp-tbl utama" id="lpUlang" type="button">Ulangi</button></section>`; $("lpUlang").addEventListener("click", mulai); return; }
  akar.innerHTML = opsKerangka() + panggilKerangka() + kerangka();
  punyaSuper = await adalahSuper();
  pasangOps(); pasangPanggil();
  $("lpBerkas").addEventListener("change", async e => { const f = e.target.files[0]; if (f) { $("lpCsv").value = await f.text(); csvAman = null; $("lpSimpan").disabled = true; } });
  $("lpCsv").addEventListener("input", () => { csvAman = null; $("lpSimpan").disabled = true; });
  $("lpPratinjau").addEventListener("click", () => impor("pratinjau"));
  $("lpSimpan").addEventListener("click", () => impor("simpan"));
  $("lpCari").addEventListener("input", e => { clearTimeout(tunda); tunda = setTimeout(() => { q = e.target.value.trim(); hal = 1; muatOrang(); }, 300); });
  $("lpJenis").addEventListener("change", e => { jenis = e.target.value; hal = 1; muatOrang(); });
  $("lpSaringKeahlian").addEventListener("change", e => { keahlianPilih = e.target.value; hal = 1; muatOrang(); });
  $("lpOrang").addEventListener("change", e => { const c = e.target.closest('input[name="kk"]'); if (c) ubahKeahlian(c, c.closest("tr"), (id, k, ada) => { const tr = $("lpOrang").querySelector(`tr[data-id="${CSS.escape(id)}"]`); if (tr) cacahKeahlian(tr, id, k, ada); }); });
  $("lpOrang").addEventListener("click", e => {
    const kl = e.target.closest("[data-kelola]"); if (kl) return bukaKelola(kl);
    const k = e.target.closest("[data-kirim]"); if (k) return kirimTautan(k);
    const sl = e.target.closest("[data-salin]"); if (sl) { const i = sl.previousElementSibling; i.select(); (navigator.clipboard?.writeText(i.value) || Promise.reject()).then(() => { sl.textContent = "Tersalin"; }, () => { document.execCommand?.("copy"); sl.textContent = "Tersalin"; }); }
  });
  muatOrang();
}

pasangTema();
mulai();
pasangDummy(false);
