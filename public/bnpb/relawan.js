/* /relawan: ringkasan publik (angka agregat) + formulir pendaftaran relawan. Tanpa NIK/KTP. CSP: tanpa skrip/gaya inline;
   teks dari server lewat esc()/textContent. Data: GET /api/relawan/ringkas, POST /api/relawan/daftar. */
(() => {
  "use strict";
  const $ = id => document.getElementById(id), f = $("f");
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c]));
  const angka = n => Number(n || 0).toLocaleString("id-ID", {maximumFractionDigits: 1});
  const I = (d) => `<svg viewBox="0 0 24 24" aria-hidden="true">${d}</svg>`;
  const IKON = {orang: I('<circle cx="12" cy="8" r="3.5"/><path d="M5 20c1-4 4-6 7-6s6 2 7 6"/>'), bolt: I('<path d="M13 3 5 14h6l-1 7 8-11h-6z"/>'), pin: I('<path d="M12 21s7-6.2 7-11a7 7 0 0 0-14 0c0 4.8 7 11 7 11z"/><circle cx="12" cy="10" r="2.5"/>'),
    jam: I('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'), kampus: I('<path d="m3 9 9-5 9 5-9 5z"/><path d="M7 12v4c2 2 8 2 10 0v-4"/>'), centang: I('<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>')};
  const pil = (k, ikon, t) => `<span class="bn-pil ${k}">${IKON[ikon] || ""}${esc(t)}</span>`;
  const pesan = (t, ok) => { const p = $("pesan"); p.textContent = t || ""; p.className = "bn-pesan " + (t ? (ok ? "ok" : "galat") : ""); };
  const JALUR = [["umum", "Umum"], ["kampus", "Mahasiswa kampus mitra"], ["organisasi", "Organisasi atau komunitas"]];
  let konfig = null, token = null, kampus = [];

  /* ---- ringkasan ---- */
  const kartu = (ikon, nilai, label, warna) => `<article class="bn-kartu"><div class="bn-angka">${angka(nilai)}</div><div class="bn-label">${pil(warna, ikon, label)}</div></article>`;
  function gambarRingkas(d) {
    $("ringkas").innerHTML = kartu("bolt", d.siap_tugas, "Relawan siap tugas", "p-hijau") + kartu("pin", d.bertugas, "Sedang bertugas", "p-ungu") + kartu("jam", d.jam_kerja_jam, "Jam kerja tervalidasi", "p-biru") +
      kartu("kampus", d.kampus.length, "Kampus mitra aktif", "p-kuning") +
      `<article class="bn-kartu"><h2>${pil("p-biru", "orang", "Keahlian yang siap")}</h2><div class="rl-pilgrup">${d.per_keahlian.length ? d.per_keahlian.map(k => `<span class="bn-pil p-abu">${esc(k.nama)} ${angka(k.n)}</span>`).join("") : '<span class="rl-kecil">Keahlian dengan kurang dari 3 orang tidak ditampilkan.</span>'}</div></article>` +
      `<article class="bn-kartu"><h2>${pil("p-biru", "pin", "Aktif per provinsi")}</h2><div class="rl-pilgrup">${d.per_provinsi.length ? d.per_provinsi.slice(0, 12).map(p => `<span class="bn-pil p-abu">${esc(p.nama)} ${angka(p.n)}</span>`).join("") : '<span class="rl-kecil">Belum ada provinsi dengan 5 relawan aktif atau lebih.</span>'}</div></article>`;
    kampus = d.kampus;
    $("kampusBlok").hidden = !d.kampus.length;
    $("kampusJudul").innerHTML = pil("p-kuning", "kampus", "Kampus mitra");
    $("kampusDaftar").innerHTML = d.kampus.map(k => `<span class="bn-pil p-abu">${esc(k.singkatan ? k.singkatan + " · " : "")}${esc(k.nama)} · ${angka(k.relawan)} relawan</span>`).join("");
  }

  /* ---- formulir ---- */
  function isiPilihan() {
    $("fProv").innerHTML = `<option value="">Pilih provinsi</option>` + Object.entries(konfig.provinsi).sort((a, b) => a[1].localeCompare(b[1], "id")).map(([k, n]) => `<option value="${k}">${esc(n)}</option>`).join("");
    $("fGol").innerHTML = `<option value="">Tidak diisi</option>` + konfig.golongan_darah.map(g => `<option>${esc(g)}</option>`).join("");
    $("fJalur").innerHTML = JALUR.map(([k, l], i) => `<label><input type="radio" name="jalur" value="${k}" ${i ? "" : "checked"}> ${esc(l)}</label>`).join("");
    $("fAhli").innerHTML = Object.entries(konfig.keahlian).map(([k, l]) => `<label><input type="checkbox" name="keahlian" value="${k}"> ${esc(l)}</label>`).join("");
    $("fKampus").innerHTML = `<option value="">Pilih kampus</option>` + kampus.map(k => `<option value="${esc(k.id)}">${esc(k.nama)}</option>`).join("");
    aturJalur();
  }
  const jalur = () => f.querySelector('[name="jalur"]:checked')?.value || "umum";
  function aturJalur() { const j = jalur(); $("bKampus").hidden = j !== "kampus"; $("bOrg").hidden = j !== "organisasi"; }
  f.addEventListener("change", e => { if (e.target.name === "jalur") aturJalur(); if (e.target.id === "fProv") isiKab(e.target.value); });
  let daftarKab = null;
  async function isiKab(prov) {
    try { daftarKab ||= await (await fetch("/lambang/kabkota.json")).json(); } catch (e) { daftarKab = {}; }
    $("dKab").innerHTML = Object.keys(daftarKab).filter(k => k.startsWith(prov + "|")).map(k => `<option value="${esc(k.slice(3))}">`).join("");
  }

  /* ---- Turnstile (hanya bila server mengaktifkannya) ---- */
  function pasangTurnstile() {
    if (!konfig.turnstile) return;
    const s = document.createElement("script"); s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"; s.async = true;
    s.onload = () => window.turnstile?.render("#ts", {sitekey: konfig.turnstile, callback: t => { token = t; }, "expired-callback": () => { token = null; }});
    document.head.appendChild(s);
  }

  function badan() {
    const v = Object.fromEntries(new FormData(f)), j = jalur();
    return {nama: v.nama, wa: v.wa, email: v.email, prov: v.prov, kab: v.kab, jalur: j, kampus_id: j === "kampus" ? v.kampus_id : undefined, organisasi: j === "organisasi" ? v.organisasi : undefined,
      keahlian: [...f.querySelectorAll('[name="keahlian"]:checked')].map(i => i.value), sertifikat: v.sertifikat || undefined, hari_per_minggu: Number(v.hari_per_minggu), maks_hari: Number(v.maks_hari),
      luar_provinsi: v.luar_provinsi === "ya", gol_darah: v.gol_darah || undefined, darurat_nama: v.darurat_nama, darurat_wa: v.darurat_wa, setuju: $("fSetuju").checked, turnstile: token || undefined};
  }
  f.addEventListener("submit", async e => {
    e.preventDefault(); const t = $("kirim"); t.disabled = true; pesan("");
    try {
      const r = await fetch("/api/relawan/daftar", {method: "POST", headers: {"content-type": "application/json"}, body: JSON.stringify(badan())}), j = await r.json().catch(() => ({}));
      if (!r.ok) { pesan(j.galat || `Pendaftaran gagal (${r.status}). Coba lagi sebentar lagi.`); window.turnstile?.reset(); token = null; return; }
      const sk = $("sukses"), tautan = j.tautan;
      sk.hidden = false; f.hidden = true;
      sk.innerHTML = `<h2>${pil("p-hijau", "centang", "Pendaftaran masuk")}</h2><p>Simpan tautan pribadimu sekarang. Tautan ini hanya tampil sekali dan jadi satu-satunya cara masuk ke halamanmu, tanpa kata sandi.</p>
        <input class="rl-kode" id="tautan" readonly value="${esc(tautan)}"><div class="rl-aksi"><button class="bn-tombol" id="salin" type="button">Salin tautan</button><a class="bn-tombol sekunder rl-tautan" href="${esc(tautan)}">Buka halamanku</a></div>
        <p class="rl-kecil">Admin atau koordinator kampusmu akan memverifikasi datamu. Pantau statusnya di halamanmu.</p><p id="salinPesan" class="bn-pesan" role="status"></p>`;
      $("salin").onclick = async () => { const i = $("tautan"); i.select(); try { await navigator.clipboard.writeText(i.value); $("salinPesan").textContent = "Tautan disalin."; $("salinPesan").className = "bn-pesan ok"; } catch (x) { $("salinPesan").textContent = "Salin manual dengan Ctrl+C."; $("salinPesan").className = "bn-pesan galat"; } };
      sk.scrollIntoView({behavior: "smooth"});
    } catch (x) { pesan("Tidak ada sambungan. Coba lagi saat online."); } finally { t.disabled = false; }
  });

  (async () => {
    try {
      const d = await (await fetch("/api/relawan/ringkas")).json();
      if (!d.konfig) throw new Error(d.galat || "gagal");
      konfig = d.konfig; gambarRingkas(d); isiPilihan(); pasangTurnstile();
    } catch (e) { pesan("Data pendaftaran belum bisa dimuat. Muat ulang halaman ini sebentar lagi."); $("kirim").disabled = true; }
  })();
})();
