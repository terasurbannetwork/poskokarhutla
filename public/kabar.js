/* Kabar api per kabupaten (/kabar): satu tautan yang Pusdalops teruskan ke grup WhatsApp BPBD, tanpa akun.
   Data: /data/kabar/index.json dan /data/kabar/<prov>-<slug>.json (scripts/data/kabar_kab.py). Kartu tiap api digambar oleh KartuApi
   (instansi_kartu.js) yang sama dengan /instansi, jadi isi dan teks WhatsApp-nya tidak bisa berbeda.
   INP: kartu digambar saat butirnya dibuka, bukan semua sekaligus. */
(() => {
  "use strict";
  const $ = id => document.getElementById(id);
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c]));
  const ang = x => Number(x).toLocaleString("id-ID");
  const W = window.Wilayah, K = window.KartuApi;
  const SIMPAN = "pk-kabar-kab";
  const waktu = s => { const d = new Date(s); return isNaN(d) ? "" : d.toLocaleString("id-ID", {timeZone: "Asia/Jakarta", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit"}).replace(",", "") + " WIB"; };
  const navUrl = (lat, lon) => `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}`;
  const tujuan = b => { const m = b.kartu.masuk, f = b.kartu.front; return m?.lat != null ? m : f?.lat != null ? f : b.t; };
  const ambil = jalur => fetch(jalur, {cache: "no-cache"}).then(r => { if (!r.ok) throw new Error(r.status); return r.json(); });

  function judul(b) {
    const t = b.t, tr = b.kartu.tren;
    return [`Level ${t.level}`, t.kec ? `Kec. ${W.kab(t.kec)}` : null, t.n24 ? `${ang(t.n24)} titik panas 24 jam` : null, tr?.arah === "tumbuh" ? "tumbuh" : null].filter(Boolean).join(", ");
  }

  function teksRingkas(d) {
    const baris = d.butir.slice(0, 10).map((b, i) => { const p = tujuan(b); return `${i + 1}. ${judul(b)}\n   Arah: ${navUrl(p.lat, p.lon)}`; });
    const lebih = d.total > 10 ? `\n...dan ${ang(d.total - 10)} api lain.` : "";
    return `Api prioritas di ${W.kab(d.kab)}, ${W.prov(d.prov)} (data ${waktu(d.dibuat)}):\n\n${baris.join("\n")}${lebih}\n\nKartu lengkap: ${location.origin}/kabar?kab=${encodeURIComponent(d.f)}\nSumber: deteksi satelit, belum divalidasi lapangan.`;
  }

  function gambar(d) {
    const r = $("ringkas"), l3 = d.l3 ?? d.butir.filter(b => b.t.level === 3).length;
    r.hidden = false;
    r.innerHTML = `<p class="kb-angka">${ang(d.total)} api prioritas</p><p class="kb-redup">${l3 ? `${ang(l3)} di level 3. ` : ""}Data ${esc(waktu(d.dibuat))}${d.total > d.butir.length ? `, tampil ${ang(d.butir.length)} teratas` : ""}.</p>
      <div class="kp-aksi"><a class="kp-tombol utama" target="_blank" rel="noopener noreferrer" href="https://wa.me/?text=${encodeURIComponent(teksRingkas(d))}">Teruskan ke WhatsApp</a><button type="button" class="kp-tombol" id="salin">Salin teks</button></div><p class="kp-pesan" role="status" aria-live="polite"></p>`;
    $("salin").addEventListener("click", async () => {
      const p = r.querySelector(".kp-pesan");
      try { await navigator.clipboard.writeText(teksRingkas(d)); p.textContent = "Teks disalin."; } catch (e) { p.textContent = "Tidak bisa menyalin otomatis. Pakai tombol WhatsApp."; }
    });
    $("daftar").innerHTML = d.butir.map((b, i) => `<li><details data-i="${i}"><summary><span class="kb-lv l${b.t.level}">${b.t.level}</span>${esc(judul(b))}</summary><div class="kb-kartu"></div></details></li>`).join("");
    $("daftar").querySelectorAll("details").forEach(el => el.addEventListener("toggle", () => {
      const w = el.querySelector(".kb-kartu"); if (!el.open || w.firstChild) return;
      const b = d.butir[+el.dataset.i]; K.pasang(w, b.t, b.kartu);
    }));
  }

  async function buka(f) {
    $("daftar").innerHTML = ""; $("ringkas").hidden = true;
    if (!f) return;
    try { localStorage.setItem(SIMPAN, f); } catch (e) {}
    history.replaceState(null, "", `?kab=${encodeURIComponent(f)}`);
    try { const d = await ambil(`/data/kabar/${encodeURIComponent(f)}.json`); d.f = f; gambar(d); }
    catch (e) { $("ringkas").hidden = false; $("ringkas").innerHTML = `<p class="kb-redup">Tidak ada api prioritas di kabupaten ini pada data terakhir.</p>`; }
  }

  (async () => {
    const pilih = $("kab");
    let idx;
    try { idx = await ambil("/data/kabar/index.json"); } catch (e) { pilih.innerHTML = `<option value="">Data belum tersedia</option>`; return; }
    const perProv = {};
    for (const k of idx.kab) (perProv[k.prov] ||= []).push(k);
    pilih.innerHTML = `<option value="">Pilih kabupaten (${ang(idx.kab.length)} dengan api prioritas)</option>` + Object.keys(perProv).sort((a, b) => W.prov(a).localeCompare(W.prov(b))).map(p =>
      `<optgroup label="${esc(W.prov(p))}">${perProv[p].sort((a, b) => a.kab.localeCompare(b.kab)).map(k => `<option value="${esc(k.f)}">${esc(W.kab(k.kab))} (${ang(k.n)})</option>`).join("")}</optgroup>`).join("");
    let awal = new URLSearchParams(location.search).get("kab");
    if (!awal) try { awal = localStorage.getItem(SIMPAN); } catch (e) {}
    if (awal && idx.kab.some(k => k.f === awal)) { pilih.value = awal; buka(awal); }
    pilih.addEventListener("change", () => buka(pilih.value));
  })();
})();
