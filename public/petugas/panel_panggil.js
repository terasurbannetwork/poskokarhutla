/* Panel pimpinan, tahap C: kartu "Panggil relawan" (LP-041/046), saringan keahlian di daftar orang, kelola keahlian Super Admin.
   Bentuk API: KONTRAK-TAHAP-C.md. Daftar tugas datang dari panel_ops lewat peristiwa "lp:tugas" (satu permintaan, tanpa baca ulang). */
import {$, esc, angka, api, nanti} from "./umum.js";
import {pesanGalat} from "./murni.js";
import {teksJam, tanggalLokal} from "./stempel.js";
import {ik} from "./ikon.js";
import {daftarKeahlian, keahlianItem, rapikanPanggil, ringkasPanggil, urlDaftarPanggil, badanKeahlian} from "./panggil_murni.js";

const kerangkaMuat = `<div class="lp-rangka" aria-busy="true"><i></i><i></i><i></i></div>`;
const off = () => -new Date().getTimezoneOffset();
export const deretKeahlian = (nama, jenis, daftar, awal = "") => `${awal}${daftar.map(o => `<label class="lp-chip"><input type="${jenis}" name="${nama}" value="${esc(o.k)}"><span>${ik(o.ikon, 20)}${esc(o.label)}</span></label>`).join("")}`;

export const panggilKerangka = () => `
<section class="lp-kartu"><h2>Panggil relawan</h2>
  <p class="lp-kecil">Pesan WA dikirim ke Relawan BNPB terverifikasi yang cocok dengan keahlian, wilayah, dan pelatihan. Yang membalas SIAP sampai kuota otomatis masuk tugas.</p>
  <form class="lp-form lp-tugas-form" id="lpPForm" novalidate>
    <div class="lp-penuh"><label class="lp-bidang" for="lpPTugas">Tugas</label><select id="lpPTugas"><option value="">Memuat tugas...</option></select><p class="lp-galat" data-g="tugas_id" role="alert" hidden></p></div>
    <fieldset class="lp-chips lp-penuh" id="lpPKeahlian"><legend>Keahlian yang dibutuhkan</legend>${deretKeahlian("pkeahlian", "checkbox", daftarKeahlian())}<p class="lp-galat" data-g="keahlian" role="alert" hidden></p></fieldset>
    <div><label class="lp-bidang" for="lpPProv">Provinsi</label><input id="lpPProv" maxlength="80" autocomplete="off" placeholder="Kalimantan Timur"><p class="lp-galat" data-g="prov" role="alert" hidden></p></div>
    <div><label class="lp-bidang" for="lpPKab">Kabupaten atau kota (opsional)</label><input id="lpPKab" maxlength="80" autocomplete="off"></div>
    <div><label class="lp-bidang" for="lpPKuota">Kuota (orang)</label><input id="lpPKuota" inputmode="numeric" autocomplete="off" value="5"><p class="lp-galat" data-g="kuota" role="alert" hidden></p></div>
    <div><label class="lp-bidang" for="lpPJam">Batas jawab (jam dari sekarang)</label><input id="lpPJam" inputmode="numeric" autocomplete="off" value="12"><p class="lp-galat" data-g="batas_jam" role="alert" hidden></p></div>
    <div class="lp-penuh"><label class="lp-bidang" for="lpPPesan">Pesan untuk relawan</label><textarea id="lpPPesan" class="lp-teks" maxlength="300" rows="3" placeholder="Butuh operator drone untuk pemetaan lahan, berangkat besok pagi"></textarea><p class="lp-galat" data-g="pesan" role="alert" hidden></p></div>
    <div class="lp-penuh"><button class="lp-tbl utama besar" id="lpPKirim" type="submit">${ik("bicara")}Kirim panggilan</button><p class="lp-kecil" id="lpPInfo" role="status"></p></div>
  </form>
  <h3 class="lp-atas">Panggilan untuk tugas ini</h3>
  <div id="lpPDaftar" aria-live="polite"><p class="lp-kecil lp-tengah">Pilih tugas untuk melihat panggilannya.</p></div>
</section>`;

let tandaTugas = null;
function pilihanTugas(baris) {
  const s = $("lpPTugas"), lama = s.value;
  s.innerHTML = baris.length ? `<option value="">Pilih tugas</option>${baris.map(t => `<option value="${esc(t.id)}">${esc(t.judul || "Tugas")}</option>`).join("")}` : `<option value="">Belum ada tugas</option>`;
  if (baris.some(t => String(t.id) === lama)) s.value = lama;
}

async function muatDaftar() {
  const id = $("lpPTugas").value, kotak = $("lpPDaftar");
  if (!id) { kotak.innerHTML = `<p class="lp-kecil lp-tengah">Pilih tugas untuk melihat panggilannya.</p>`; return; }
  kotak.innerHTML = kerangkaMuat;
  const r = await api(urlDaftarPanggil(id), {cookie: true});
  if ($("lpPTugas").value !== id) return;
  if (!r.ok) { kotak.innerHTML = `<p>${esc(r.status === 403 ? "Kamu belum punya izin untuk bagian ini." : r.data?.galat || pesanGalat(r.status))}</p><button class="lp-tbl" type="button" data-ulang-panggil>Ulangi</button>`; return; }
  const baris = (r.data.panggil || []).map(p => ringkasPanggil(p));
  kotak.innerHTML = baris.length ? `<div class="lp-gulir"><table class="lp-tabel"><thead><tr><th>Status</th><th>Kuota</th><th>Siap</th><th>Tidak</th><th>Antre</th><th>Batas jawab</th></tr></thead><tbody>
    ${baris.map(p => `<tr><td class="lp-tengah"><span class="lp-pil ${p.kelas}">${esc(p.label)}</span></td><td class="num lp-tengah">${angka(p.kuota)}</td><td class="num lp-tengah">${angka(p.siap)}</td><td class="num lp-tengah">${angka(p.tidak)}</td><td class="num lp-tengah">${angka(p.antre)}</td><td>${p.batas ? `${esc(tanggalLokal(p.batas, off()))}, ${esc(teksJam(p.batas, off()))}${p.sisaJam ? `, ${angka(p.sisaJam)} jam lagi` : ", lewat"}` : "-"}</td></tr>`).join("")}</tbody></table></div>`
    : `<p class="lp-kecil lp-tengah">Belum ada panggilan untuk tugas ini.</p>`;
}

const tampilGalat = (form, g) => form.querySelectorAll("[data-g]").forEach(el => { const t = g[el.dataset.g] || ""; el.textContent = t; el.hidden = !t; });

export function pasangPanggil() {
  const form = $("lpPForm");
  document.addEventListener("lp:tugas", e => {
    const d = e.detail || [], tanda = JSON.stringify(d.map(t => [t.id, t.judul]));
    if (tanda === tandaTugas) return;   // daftar sama: jangan bangun ulang select / daftar panggilan
    tandaTugas = tanda; pilihanTugas(d); muatDaftar();
  });
  $("lpPTugas").addEventListener("change", muatDaftar);
  $("lpPDaftar").addEventListener("click", e => { if (e.target.closest("[data-ulang-panggil]")) muatDaftar(); });
  form.addEventListener("submit", e => {
    e.preventDefault();
    const b = $("lpPKirim"); if (b.disabled) return;
    const r = rapikanPanggil({tugas_id: $("lpPTugas").value, keahlian: [...form.querySelectorAll('input[name="pkeahlian"]:checked')].map(x => x.value), prov: $("lpPProv").value, kab: $("lpPKab").value, kuota: $("lpPKuota").value, batas_jam: $("lpPJam").value, pesan: $("lpPPesan").value});
    tampilGalat(form, r.galat);
    if (!r.ok) { form.querySelector("[data-g]:not([hidden])")?.scrollIntoView({block: "center"}); return; }
    b.disabled = true; b.classList.add("kerja"); $("lpPInfo").textContent = "Mengirim panggilan...";
    nanti(async () => {
      const h = await api("/api/petugas/panel/panggil", {metode: "POST", cookie: true, badan: r.badan});
      b.disabled = false; b.classList.remove("kerja");
      if (!h.ok) { $("lpPInfo").textContent = h.data?.galat || pesanGalat(h.status); return; }
      const n = Number(h.data?.penerima) || 0;
      $("lpPInfo").textContent = n ? `Panggilan masuk antrean WA untuk ${angka(n)} relawan.` : "Belum ada relawan terverifikasi yang cocok, panggilan tetap tercatat.";
      $("lpPPesan").value = ""; muatDaftar();
    });
  });
}

/* ---------- kelola keahlian (Super Admin), dipakai panel.js di baris tabel orang ---------- */
export const kelolaBaris = (o, punya) => `<tr class="lp-tautan-baris"><td colspan="8"><fieldset class="lp-chips" data-orang="${esc(o.id)}"><legend>Keahlian ${esc(o.nama)}</legend>${daftarKeahlian(punya).map(d => `<label class="lp-chip"><input type="checkbox" name="kk" value="${esc(d.k)}" ${punya.includes(d.k) ? "checked" : ""}><span>${ik(d.ikon, 20)}${esc(d.label)}</span></label>`).join("")}</fieldset>
  <label class="lp-bidang lp-atas" for="lpBukti-${esc(o.id)}">Bukti untuk keahlian yang baru dicentang (opsional)</label><input id="lpBukti-${esc(o.id)}" data-bukti maxlength="200" autocomplete="off" placeholder="Nomor sertifikat atau sumber">
  <p class="lp-kecil" role="status" data-kelola-info></p></td></tr>`;

/* satu centang = satu panggilan API; gagal -> centang dikembalikan. Mengembalikan fungsi pembaruan label baris (opsional). */
export function ubahKeahlian(input, tr, sesudah) {
  const fs = input.closest("[data-orang]"), info = tr.querySelector("[data-kelola-info]"), pasang = input.checked;
  const badan = badanKeahlian(fs.dataset.orang, input.value, pasang ? tr.querySelector("[data-bukti]").value : "");
  if (!badan) { input.checked = !pasang; return; }
  input.disabled = true; info.textContent = `${pasang ? "Menambah" : "Mencabut"} ${keahlianItem(input.value).label}...`;
  nanti(async () => {
    const r = await api("/api/petugas/panel/keahlian", {metode: pasang ? "POST" : "DELETE", cookie: true, badan});
    if (!input.isConnected) return;
    input.disabled = false;
    if (!r.ok) { input.checked = !pasang; info.textContent = r.data?.galat || pesanGalat(r.status); return; }
    info.textContent = `${keahlianItem(input.value).label} ${pasang ? "ditambahkan" : "dicabut"}.`; sesudah?.(fs.dataset.orang, input.value, pasang);
  });
}
