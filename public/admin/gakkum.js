/* Admin Berkas Gakkum (/admin/gakkum): daftar konsesi dengan titik api 2026 per provinsi, dan tampilan cetak A4 per konsesi untuk bahan awal penegakan hukum.
   Data statis publik public/data/konsesi2026/ (index.json, <prov>.json, citra_jelas.json, sawit_riwayat.json); tidak ada pengiriman ke siapa pun.
   CSP admin: tanpa skrip/gaya inline; semua teks dari data lewat esc(). Dimuat sesudah /admin/bersama.js (window.Admin.esc). */
(() => {
  const app = document.getElementById("app"), aksiJudul = document.getElementById("aksiJudul"), esc = Admin.esc, D = "/data/konsesi2026/", PER = 15;
  const JENIS = {sawit: "Sawit", hti: "HTI", hph: "HPH", tambang: "Tambang (PPKH)"};
  const KAWASAN = {HP: "Hutan Produksi", HPT: "Hutan Produksi Terbatas", HPK: "Hutan Produksi Konversi", HL: "Hutan Lindung", HK: "Hutan Konservasi", APL: "Areal Penggunaan Lain"};
  const IKON = {
    berkas: "M7 3h7l5 5v13H7zM14 3v5h5M10 13h6M10 17h6",
    cetak: "M6 9V3h12v6M6 18H4v-7h16v7h-2M7 14h10v7H7z",
    tutup: "M6 6l12 12M18 6L6 18",
    api: "M12 3c1 3-1 4-1 6 0 1.5 1 2 2 2 0-1 1-2 1-2 2 1.5 3 3.5 3 6a5 5 0 0 1-10 0c0-3 3-5 5-12z",
    cari: "M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM20 20l-4-4",
  };
  const ikon = k => `<svg class="gk-ikon" viewBox="0 0 24 24" aria-hidden="true"><path d="${IKON[k]}"/></svg>`;
  const fmt = (n, d = 0) => n == null || isNaN(n) ? "–" : Number(n).toLocaleString("id-ID", {maximumFractionDigits: d});
  const pct = v => v == null ? "–" : fmt(v * 100, 1) + "%";
  const tgl = s => s ? new Date(s + "T00:00:00").toLocaleDateString("id-ID", {day: "numeric", month: "short", year: "numeric"}) : "–";
  const wib = s => s ? new Date(s).toLocaleString("id-ID", {timeZone: "Asia/Jakarta", day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit"}).replace(" pukul", ",").replace(".", ":") + " WIB" : "–";
  const ambil = async u => { const r = await fetch(u); if (!r.ok) throw new Error(`${u} galat ${r.status}`); return r.json(); };

  let IDX, IDX_RIW = "", RIW = {}, CITJ = {}, prov = "", daftar = [], jenis = "", cari = "", hal = 0;
  const st = {urut: "luas_bakar_ha", turun: true};
  const KOLOM = [["nama", "Konsesi"], ["jenis", "Jenis"], ["kab", "Kabupaten"], ["luas_ha", "Luas (ha)"], ["titik", "Titik 2026"], ["titik_7h", "Titik 7 hari"], ["luas_bakar_ha", "Terbakar (ha)"], ["persen_bakar", "Terbakar (%)"]];
  const nilai = (r, k) => k === "kab" ? (r.kab || []).join(", ") : r[k];

  /* ---------- daftar ---------- */
  function kerangka() {
    aksiJudul.innerHTML = `<span class="gk-pil">${ikon("api")}Data sampai ${esc(IDX.sampai)}</span>`;
    app.innerHTML = `<section class="gk-kontrol">
        <label class="gk-isian">Provinsi<select id="gkProv">${IDX.prov.slice().sort((a, b) => a.nama.localeCompare(b.nama)).map(p => `<option value="${esc(p.kode)}">${esc(p.nama)} (${fmt(p.perusahaan)} konsesi)</option>`).join("")}</select></label>
        <div class="gk-pilpil" id="gkJenis" role="group" aria-label="Jenis izin"></div>
        <label class="gk-isian gk-cari">${ikon("cari")}<input id="gkCari" type="search" placeholder="Cari nama konsesi" aria-label="Cari nama konsesi" autocomplete="off"></label>
      </section>
      <p id="gkPesan" class="gk-pesan" role="status"></p>
      <div class="ad-tabel-wadah"><table class="ad-tabel gk-tabel"><thead><tr id="gkKepala">${KOLOM.map(([k, l]) => `<th><button type="button" data-k="${k}">${esc(l)}<i></i></button></th>`).join("")}<th>Berkas</th></tr></thead><tbody id="gkIsi"></tbody></table></div>
      <div id="gkPgn" class="gk-pgn"></div>`;
    document.getElementById("gkProv").addEventListener("change", e => pilihProv(e.target.value));
    document.getElementById("gkCari").addEventListener("input", e => { cari = e.target.value.trim().toLowerCase(); hal = 0; isi(); });
    document.getElementById("gkJenis").addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return; jenis = b.dataset.j; hal = 0; pilJenis(); isi(); });
    document.getElementById("gkKepala").addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return; const k = b.dataset.k;
      st.turun = st.urut === k ? !st.turun : true; st.urut = k; hal = 0; isi(); });
    document.getElementById("gkPgn").addEventListener("click", e => { const b = e.target.closest("button[data-h]"); if (b && !b.disabled) { hal = +b.dataset.h; isi(); } });
    document.getElementById("gkIsi").addEventListener("click", e => { const b = e.target.closest("button[data-berkas]"); if (b) berkas(daftar.find(r => r.id === b.dataset.berkas)); });
  }
  function pilJenis() {
    const ada = [...new Set(daftar.map(r => r.jenis))].filter(j => JENIS[j]);
    document.getElementById("gkJenis").innerHTML = ["", ...ada].map(j => `<button type="button" data-j="${j}" aria-pressed="${j === jenis}">${esc(j ? JENIS[j] : "Semua")}</button>`).join("");
  }
  function isi() {
    const k = st.urut, d = st.turun ? -1 : 1;
    const rs = daftar.filter(r => (!jenis || r.jenis === jenis) && (!cari || (r.nama + " " + (r.grup || "")).toLowerCase().includes(cari)))
      .sort((a, b) => { const x = nilai(a, k), y = nilai(b, k); return x == null || y == null ? (x == null) - (y == null) : (x > y ? 1 : x < y ? -1 : 0) * d; });
    const jml = Math.max(1, Math.ceil(rs.length / PER)); hal = Math.min(hal, jml - 1);
    document.querySelectorAll("#gkKepala button").forEach(b => { b.querySelector("i").textContent = b.dataset.k === k ? (st.turun ? "↓" : "↑") : ""; });
    document.getElementById("gkIsi").innerHTML = rs.length ? rs.slice(hal * PER, hal * PER + PER).map(r => `<tr>
      <td data-label="Konsesi"><b>${esc(r.nama)}</b>${r.grup ? `<small>${esc(r.grup)}</small>` : ""}</td>
      <td data-label="Jenis"><span class="gk-pil">${esc(JENIS[r.jenis] || r.jenis)}</span></td>
      <td data-label="Kabupaten">${esc((r.kab || []).join(", ") || "–")}</td>
      <td class="n" data-label="Luas (ha)">${fmt(r.luas_ha)}</td><td class="n" data-label="Titik 2026">${fmt(r.titik)}</td><td class="n" data-label="Titik 7 hari">${fmt(r.titik_7h)}</td>
      <td class="n" data-label="Terbakar (ha)">${fmt(r.luas_bakar_ha)}</td><td class="n" data-label="Terbakar (%)">${pct(r.persen_bakar)}</td>
      <td class="a"><button type="button" class="ad-tombol kecil utama" data-berkas="${esc(r.id)}">${ikon("berkas")}Berkas</button></td></tr>`).join("")
      : `<tr><td colspan="${KOLOM.length + 1}" class="gk-kosong">${daftar.length ? "Tidak ada konsesi yang cocok dengan penyaring." : "Provinsi ini belum punya konsesi dengan titik api 2026."}</td></tr>`;
    document.getElementById("gkPgn").innerHTML = `<p>${rs.length ? `Menampilkan ${fmt(hal * PER + 1)} sampai ${fmt(Math.min(rs.length, hal * PER + PER))} dari ${fmt(rs.length)} konsesi` : "0 konsesi"}</p>
      <div><button type="button" class="gk-pg" data-h="${hal - 1}" ${hal <= 0 ? "disabled" : ""}>‹ Sebelumnya</button><span class="gk-pg-n">Halaman ${fmt(hal + 1)} dari ${fmt(jml)}</span><button type="button" class="gk-pg" data-h="${hal + 1}" ${hal >= jml - 1 ? "disabled" : ""}>Berikutnya ›</button></div>`;
  }
  async function pilihProv(kode) {
    prov = kode; hal = 0; jenis = ""; document.getElementById("gkProv").value = kode;
    const p = document.getElementById("gkPesan"); p.textContent = "Memuat konsesi…"; p.className = "gk-pesan";
    try { daftar = (await ambil(`${D}${kode}.json`)).perusahaan || []; p.textContent = ""; }
    catch (e) { daftar = []; p.textContent = "Data provinsi ini belum bisa dibuka. Coba muat ulang."; p.className = "gk-pesan galat"; }
    pilJenis(); isi();
  }

  /* ---------- berkas A4 ---------- */
  const baris = (k, v) => v == null || v === "" ? "" : `<tr><th>${esc(k)}</th><td>${v}</td></tr>`;
  function figur(c, judul) {
    const src = c?.f ? (/^(\/|https?:)/.test(c.f) ? c.f : "/data/" + c.f) : "";
    return `<figure class="gk-fig">${src ? `<img src="${esc(src)}" alt="${esc(judul)}, ${esc(tgl(c.tgl))}" loading="lazy">` : `<div class="gk-nocitra">Tidak ada citra bersih</div>`}
      <figcaption><b>${esc(judul)}</b>${c?.tgl ? ` ${esc(tgl(c.tgl))}` : ""}${c?.satelit ? ` · ${esc(c.satelit)}` : ""}${c?.awan != null ? ` · awan ${fmt(c.awan)}%` : ""}${c?.bakar_pct != null ? ` · bekas bakar ${fmt(c.bakar_pct, 1)}% area` : ""}</figcaption></figure>`;
  }
  function lembar(r) {
    const e = RIW[r.id], cj = (CITJ[r.id] || []).slice().sort((a, b) => a.tgl.localeCompare(b.tgl)).slice(0, 4);
    const harian = r.harian || [], kej = r.kejadian || [];
    const kaw = Object.entries(r.kawasan || {}).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${esc(KAWASAN[k] || k)} ${pct(v)}`).join(", ");
    const sanksi = (r.sanksi || []).map(s => `${esc(s.jenis)} ${esc(s.tahun || "")}: ${esc(s.status)}`).join("<br>");
    const pemegang = [...new Set([r.grup, ...(r.pemegang || []).map(p => p.nama)].filter(Boolean))].join(", ");
    const sebelum = c => c.tgl < r.pertama ? "Sebelum api" : "Sesudah api mulai";
    const sk = IDX.sumber_konsesi[r.jenis];
    return `<article class="gk-lembar" id="gkLembar">
      <header class="gk-kop"><div><p class="gk-kicker">Berkas indikasi karhutla · bahan awal</p><h2>${esc(r.nama)}</h2><p>${esc(JENIS[r.jenis] || r.jenis)} · ${esc((r.kab || []).join(", "))}, ${esc(IDX.prov.find(p => p.kode === prov)?.nama || "")}</p></div>
        <div class="gk-cap"><b>Dibuat</b> ${esc(wib(new Date().toISOString()))}<br><b>Data titik</b> sampai ${esc(IDX.sampai)}</div></header>
      <p class="gk-catatan"><b>Bahan awal, bukan alat bukti sah tanpa verifikasi lapangan.</b> Tumpang tindih lokasi dan waktu tidak menunjukkan siapa yang membakar.</p>
      <h3>1. Identitas konsesi</h3>
      <table class="gk-kv"><tbody>${baris("Nama", esc(r.nama))}${baris("ID data", esc(r.id))}${baris("Jenis izin", esc(JENIS[r.jenis] || r.jenis))}${baris("Pemegang atau grup (catatan publik)", esc(pemegang))}
        ${baris("Luas konsesi", `${fmt(r.luas_ha)} ha (peta tahun ${esc(r.tahun_data || "–")})`)}${baris("Kabupaten", esc((r.kab || []).join(", ")))}${baris("Kecamatan terdampak", esc((r.kec || []).join("; ")))}
        ${baris("Kawasan hutan", kaw)}${baris("Gambut", r.gambut != null ? `${pct(r.gambut)} luas · ${fmt(r.gambut_ha)} ha` : "")}${baris("Sanksi tercatat", sanksi)}</tbody></table>
      <h3>2. Kronologi titik api 2026</h3>
      <table class="gk-kv"><tbody>${baris("Titik api pertama", esc(tgl(r.pertama)))}${baris("Titik api terakhir", esc(tgl(r.terakhir)))}${baris("Hari aktif", `${fmt(r.hari_aktif)} hari dalam rentang ${fmt(r.rentang_hari)} hari`)}
        ${baris("Total titik panas", `<b>${fmt(r.titik)}</b> titik (${fmt(r.titik_7h)} dalam 7 hari terakhir)`)}${baris("Hari puncak", r.puncak ? `${esc(tgl(r.puncak[0]))}: ${fmt(r.puncak[1])} titik` : "")}
        ${baris("Daya api (FRP)", `maks ${fmt(r.frp_maks, 1)} MW · total ${fmt(r.frp_total)} MW`)}${baris("Keyakinan titik", esc(IDX.sumber_titik))}</tbody></table>
      ${kej.length ? `<table class="gk-tb"><thead><tr><th>Kejadian</th><th>Mulai</th><th>Selesai</th><th>Hari</th><th>Titik</th></tr></thead><tbody>${kej.map((k, i) => `<tr><td>${i + 1}</td><td>${esc(tgl(k[0]))}</td><td>${esc(tgl(k[1]))}</td><td>${fmt(k[2])}</td><td>${fmt(k[3])}</td></tr>`).join("")}</tbody></table>` : ""}
      ${harian.length ? `<p class="gk-sub">Jumlah titik per hari (tanggal: titik)</p><div class="gk-hari">${harian.map(h => `<span>${esc(tgl(h[0]).replace(/ \d{4}$/, ""))}<b>${fmt(h[1])}</b></span>`).join("")}</div>` : ""}
      <h3>3. Luas terbakar indikatif</h3>
      <table class="gk-kv"><tbody>${baris("Luas terbakar indikatif", `<b>${fmt(r.luas_bakar_ha)} ha</b> (${pct(r.persen_bakar)} dari luas konsesi)`)}${baris("Dasar hitung", `${fmt(r.piksel)} piksel VIIRS 375 m berisi titik x ${fmt(IDX.ha_piksel, 2)} ha per piksel`)}
        ${baris("Di lahan gambut", r.gambut_bakar_ha ? `${fmt(r.gambut_bakar_ha)} ha (${fmt(r.gambut_titik)} titik)` : "")}</tbody></table>
      <p class="gk-sub">Luas piksel melebihi luas terbakar nyata; ini angka pembanding, bukan hasil ukur lapangan.</p>
      <h3>4. Citra satelit</h3>
      ${cj.length ? `<div class="gk-citra">${cj.map(c => figur(c, sebelum(c))).join("")}</div><p class="gk-sub">Sentinel-2 dengan awan paling sedikit; persen bekas bakar dari indeks spektral, indikatif.</p>` : `<p class="gk-kosong">Belum ada adegan Sentinel-2 yang cukup jelas untuk konsesi ini.</p>`}
      <h3>5. Riwayat terbakar 2015</h3>
      ${e ? `<table class="gk-kv"><tbody>${baris("Jejak api 2015", `${fmt(e.jejak_ha)} ha, ${fmt(e.titik)} titik${e.api?.pertama ? `, ${esc(tgl(e.api.pertama))} sampai ${esc(tgl(e.api.terakhir))}` : ""}`)}${baris("Bekas api jadi sawit", `${fmt(e.bs_ha)} ha (${pct(e.bs_porsi)} jejak api), sawit tercatat sejak ${esc(e.tahun_sawit ?? "–")}`)}</tbody></table>
        <div class="gk-citra gk-empat">${figur(e.citra?.sebelum, "Sebelum")}${figur(e.citra?.terbakar, "Terbakar")}${figur(e.citra?.kebun1, "Kebun")}${figur(e.citra?.kebun2, "Kebun")}</div>
        <p class="gk-sub">Indikasi dari tumpang tindih lokasi dan waktu (Gaveau dkk. 2022), bukan bukti siapa yang membakar atau menanam.</p>` : `<p class="gk-kosong">Tidak ada riwayat terbakar 2015 tercatat untuk konsesi ini.</p>`}
      <h3>6. Sumber data</h3>
      <ul class="gk-sumber"><li>Titik panas: ${esc(IDX.sumber_titik)}, ${esc(tgl(IDX.dari))} sampai ${esc(IDX.sampai)}. Celah: ${esc(IDX.celah)}.</li>
        <li>Batas konsesi: ${esc(sk || "tidak tercatat")}.</li>${e ? `<li>Riwayat 2015: ${esc(IDX_RIW)}</li>` : ""}
        <li>Citra: Sentinel-2 L2A (Copernicus), Landsat (USGS) bila ada.</li><li>Data diunduh dan dihitung: ${esc(wib(IDX.dibuat))}.</li></ul>
      <p class="gk-catatan"><b>Bahan awal, bukan alat bukti sah tanpa verifikasi lapangan.</b> Batas konsesi bertanggal sekitar 2014 dan bisa sudah berubah. Berkas ini tidak dikirim ke siapa pun; hanya dicetak atau disimpan sebagai PDF oleh petugas.</p>
    </article>`;
  }
  function berkas(r) {
    if (!r) return;
    const m = document.createElement("div"); m.id = "gkPratinjau"; m.className = "gk-pratinjau"; m.setAttribute("role", "dialog"); m.setAttribute("aria-label", "Berkas " + r.nama);
    m.innerHTML = `<div class="gk-bar"><button type="button" class="ad-tombol utama" id="gkCetak">${ikon("cetak")}Cetak atau simpan PDF</button><button type="button" class="ad-tombol" id="gkTutup">${ikon("tutup")}Tutup</button></div>${lembar(r)}`;
    document.body.appendChild(m); document.body.classList.add("gk-buka");
    const tutup = () => { m.remove(); document.body.classList.remove("gk-buka"); document.removeEventListener("keydown", esk); };
    const esk = e => { if (e.key === "Escape") tutup(); };
    document.addEventListener("keydown", esk);
    m.querySelector("#gkTutup").addEventListener("click", tutup);
    m.querySelector("#gkCetak").addEventListener("click", () => window.print());
    m.querySelectorAll("img").forEach(im => im.addEventListener("error", () => { const d = document.createElement("div"); d.className = "gk-nocitra"; d.textContent = "Citra tidak tersedia"; im.replaceWith(d); }));
    m.querySelector("#gkTutup").focus();
  }

  async function mulai() {
    app.innerHTML = `<p class="ad-redup">Memuat…</p>`;
    try {
      [IDX, RIW, CITJ] = await Promise.all([ambil(D + "index.json"),
        ambil(D + "sawit_riwayat.json").then(d => { IDX_RIW = d.sumber?.[0] || ""; return Object.fromEntries((d.perusahaan || []).map(e => [e.id, e])); }).catch(() => ({})),
        ambil(D + "citra_jelas.json").catch(() => ({}))]);
    } catch (e) { app.innerHTML = `<p class="gk-pesan galat">Data konsesi belum bisa dibuka. Coba muat ulang.</p>`; return; }
    kerangka();
    pilihProv([...IDX.prov].sort((a, b) => b.luas_bakar_ha - a.luas_bakar_ha)[0].kode);
  }
  mulai();
})();
