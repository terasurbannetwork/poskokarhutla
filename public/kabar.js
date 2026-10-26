/* Kabar api per kabupaten (/kabar): satu tautan yang Pusdalops teruskan ke grup WhatsApp BPBD.
   Data: /data/kabar/index.json dan /data/kabar/<prov>-<slug>.json (scripts/data/kabar_kab.py). Kartu tiap kompleks digambar oleh KartuApi
   (instansi_kartu.js) yang sama dengan /instansi, jadi isi dan teks WhatsApp-nya tidak bisa berbeda.
   Istilah: satu butir = satu KOMPLEKS api (kelompok titik panas); angka titik panas selalu disebut "titik panas". Status: level 3 Prioritas, level 2 Siaga
   (nama sama dengan /instansi dan layar publik). INP: chrome (select, summary, tombol) berubah dulu; kartu digambar saat butirnya dibuka. */
(() => {
  "use strict";
  const $ = id => document.getElementById(id);
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c]));
  const ang = x => Number(x).toLocaleString("id-ID");
  const num = v => typeof v === "number" && Number.isFinite(v);
  const W = window.Wilayah, K = window.KartuApi;
  const SIMPAN = "pk-kabar-kab", STATUS = {3: "Prioritas", 2: "Siaga"};
  const SUMBER = "Sumber: deteksi satelit (VIIRS, MODIS, Himawari) dan hitungan Centurisk97. Belum divalidasi lapangan.";
  const waktu = s => { const d = new Date(s); return isNaN(d) ? "" : d.toLocaleString("id-ID", {timeZone: "Asia/Jakarta", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit"}).replace(",", "") + " WIB"; };
  const navUrl = p => `https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lon}`;
  const titik = o => o && num(o.lat) && num(o.lon) ? o : null;
  const tujuan = b => titik(b.kartu.masuk) || titik(b.kartu.front) || titik(b.t);
  const status = b => STATUS[b.t.level] || `Level ${+b.t.level || 0}`;
  /* deteksi satelit terbaru di antara kompleks yang tampil; tanpa waktu front = null (tidak ditebak) */
  const deteksiTerbaru = d => d.butir.map(b => Date.parse(b.kartu.front?.waktu)).filter(Number.isFinite).reduce((a, b) => Math.max(a, b), -Infinity);
  const ambil = jalur => fetch(jalur).then(r => { if (!r.ok) throw new Error(String(r.status)); return r.json(); });

  /* kalimat tiap kompleks, angka kunci di depan: "1.206 titik panas dalam 24 jam di Kec. Mantangai, naik dari 113 kemarin" */
  function kalimat(b) {
    const t = b.t, tr = b.kartu.tren || {}, n = num(t.n24) ? t.n24 : tr.n24;
    const banding = num(n) && num(tr.n24_kemarin) ? (n > tr.n24_kemarin ? `, naik dari ${ang(tr.n24_kemarin)} kemarin` : n < tr.n24_kemarin ? `, turun dari ${ang(tr.n24_kemarin)} kemarin` : ", sama dengan kemarin") : "";
    return {angka: num(n) ? `${ang(n)} titik panas` : null, sisa: `${num(n) ? " dalam 24 jam" : "Titik panas belum terhitung"}${t.kec ? ` di Kec. ${W.kab(t.kec)}` : ""}${banding}`};
  }
  const kalimatTeks = b => { const k = kalimat(b); return (k.angka || "") + k.sisa; };

  function teksRingkas(d) {
    const baris = d.butir.slice(0, 10).map((b, i) => { const p = tujuan(b); return `${i + 1}. ${status(b)}: ${kalimatTeks(b)}.\n   Arah: ${p ? navUrl(p) : "belum tersedia"}`; });
    const lebih = d.total > 10 ? `\n...dan ${ang(d.total - 10)} kompleks lain.` : "";
    const det = deteksiTerbaru(d);
    return `Kompleks api yang perlu ditangani di ${W.kab(d.kab)}, ${W.prov(d.prov)}: ${ang(d.total)} kompleks${d.l3 ? `, ${ang(d.l3)} berstatus Prioritas` : ""}.\n` +
      `${Number.isFinite(det) ? `Deteksi satelit terbaru ${waktu(det)}, dihitung ${waktu(d.dibuat)}.` : `Dihitung ${waktu(d.dibuat)}.`}\n\n${baris.join("\n")}${lebih}\n\n` +
      `Kartu lengkap: ${location.origin}/kabar?kab=${encodeURIComponent(d.f)}\n${SUMBER}`;
  }

  function gambar(d) {
    const r = $("ringkas"), det = deteksiTerbaru(d);
    r.hidden = false;
    r.innerHTML = `<p class="kb-angka">${ang(d.total)} kompleks api</p><p class="kb-redup">perlu ditangani${d.l3 ? `, ${ang(d.l3)} berstatus Prioritas` : ""}. ${Number.isFinite(det) ? `Deteksi satelit terbaru ${esc(waktu(det))}, dihitung` : "Dihitung"} ${esc(waktu(d.dibuat))}${d.total > d.butir.length ? `. Tampil ${ang(d.butir.length)} teratas` : ""}.</p>
      <div class="kp-aksi"><a class="kp-tombol utama" target="_blank" rel="noopener noreferrer" href="https://wa.me/?text=${encodeURIComponent(teksRingkas(d))}">Teruskan ke WhatsApp</a><button type="button" class="kp-tombol" id="salin">Salin teks</button></div><p class="kp-pesan" role="status" aria-live="polite"></p>`;
    $("salin").addEventListener("click", async () => {
      const p = r.querySelector(".kp-pesan"); p.textContent = "Menyalin…";
      try { await navigator.clipboard.writeText(teksRingkas(d)); p.textContent = "Teks disalin."; } catch (e) { p.textContent = "Tidak bisa menyalin otomatis. Pakai tombol WhatsApp."; }
    });
    $("daftar").innerHTML = d.butir.map((b, i) => { const k = kalimat(b), lv = +b.t.level || 0; return `<li><details data-i="${i}"><summary><span class="kb-lv l${lv}">${esc(status(b))}</span><span>${k.angka ? `<b class="kb-oranye">${esc(k.angka)}</b>` : ""}${esc(k.sisa)}</span></summary><div class="kb-kartu"></div></details></li>`; }).join("");
    $("daftar").querySelectorAll("details").forEach(el => el.addEventListener("toggle", () => {
      const w = el.querySelector(".kb-kartu"); if (!el.open || w.dataset.sudah) return;
      w.dataset.sudah = "1"; const b = d.butir[+el.dataset.i]; K.pasang(w, b.t, b.kartu);
    }));
  }

  async function buka(f) {
    const r = $("ringkas"); $("daftar").innerHTML = "";
    if (!f) { r.hidden = true; return; }
    r.hidden = false; r.innerHTML = `<p class="kb-redup">Memuat…</p>`;
    try { localStorage.setItem(SIMPAN, f); } catch (e) {}
    history.replaceState(null, "", `?kab=${encodeURIComponent(f)}`);
    try { const d = await ambil(`/data/kabar/${encodeURIComponent(f)}.json`); if ($("kab").value !== f) return; d.f = f; gambar(d); }
    catch (e) {
      if ($("kab").value !== f) return;
      r.innerHTML = e.message === "404" ? `<p class="kb-redup">Tidak ada kompleks api yang perlu ditangani di kabupaten ini pada hitungan terakhir.</p>` : `<p class="kb-redup">Data belum bisa dimuat. Periksa sambungan lalu muat ulang halaman.</p>`;
    }
  }

  (async () => {
    const pilih = $("kab");
    let idx;
    try { idx = await ambil("/data/kabar/index.json"); } catch (e) { pilih.innerHTML = `<option value="">Data belum bisa dimuat, muat ulang halaman</option>`; return; }
    const perProv = {};
    for (const k of idx.kab) (perProv[k.prov] ||= []).push(k);
    pilih.innerHTML = `<option value="">Pilih kabupaten (${ang(idx.kab.length)} kabupaten dengan kompleks api)</option>` + Object.keys(perProv).sort((a, b) => W.prov(a).localeCompare(W.prov(b))).map(p =>
      `<optgroup label="${esc(W.prov(p))}">${perProv[p].sort((a, b) => a.kab.localeCompare(b.kab)).map(k => `<option value="${esc(k.f)}">${esc(W.kab(k.kab))} (${ang(k.n)} kompleks)</option>`).join("")}</optgroup>`).join("");
    let awal = new URLSearchParams(location.search).get("kab");
    if (!awal) try { awal = localStorage.getItem(SIMPAN); } catch (e) {}
    if (awal && idx.kab.some(k => k.f === awal)) { pilih.value = awal; buka(awal); }
    pilih.addEventListener("change", () => buka(pilih.value));
  })();
})();
