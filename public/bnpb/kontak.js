/* Registrasi kontak pemangku kepentingan (/daftar-kontak): kirim ke POST /api/kontak/daftar (src/kontak.js), masuk sebagai menunggu persetujuan admin.
   Kab/kota dari kunci public/banjir/data/pusat_kec.json (ejaan data dikirim, ejaan resmi ditampilkan lewat Wilayah.kab). CSP: tanpa skrip/gaya inline. */
(() => {
  const $ = id => document.getElementById(id), f = $("f");
  let konfig = null, token = null, KAB = {};
  const pesan = (t, ok) => { $("pesan").textContent = t; $("pesan").className = "bn-pesan" + (t ? (ok ? " ok" : " galat") : ""); };
  const opsi = (sel, pasangan, kosong) => { sel.replaceChildren(...(kosong ? [[ "", kosong]] : []).concat(pasangan).map(([v, t]) => { const o = document.createElement("option"); o.value = v; o.textContent = t; return o; })); };
  const isiKab = () => opsi($("fKab"), (KAB[$("fProv").value] || []).map(a => [a, Wilayah.kab(a)]), $("fProv").value ? "Tingkat provinsi" : "–");
  $("fProv").addEventListener("change", isiKab);

  f.addEventListener("submit", async e => {
    e.preventDefault(); const t = $("kirim"), v = Object.fromEntries(new FormData(f));
    if (!v.wa && !v.email) return pesan("Isi minimal satu: nomor WhatsApp atau email.");
    t.disabled = true; pesan("");
    try {
      const r = await fetch("/api/kontak/daftar", {method: "POST", headers: {"content-type": "application/json"},
        body: JSON.stringify({...v, setuju: $("fSetuju").checked, turnstile: token || undefined})}), j = await r.json().catch(() => ({}));
      if (!r.ok) { pesan(j.galat || `Registrasi gagal (${r.status}). Coba lagi sebentar lagi.`); window.turnstile?.reset(); token = null; return; }
      f.remove(); $("sukses").hidden = false; $("sukses").className = "bn-blok";   // .bn-blok/.bn-form menimpa [hidden], jadi kelas dipasang di sini dan formulir dibuang $("sukses").scrollIntoView({behavior: "smooth"});
    } catch (x) { pesan("Tidak ada sambungan. Coba lagi saat online."); } finally { t.disabled = false; }
  });

  (async () => {
    try {
      const [k, kec] = await Promise.all([fetch("/api/kontak/konfig").then(r => r.json()), fetch("/banjir/data/pusat_kec.json").then(r => r.json())]);
      konfig = k;
      for (const key of Object.keys(kec)) { const [p, a] = key.split("|"); if (a && a !== "None") (KAB[p] ||= new Set()).add(a); }
      for (const p in KAB) KAB[p] = [...KAB[p]].sort((a, b) => a.localeCompare(b, "id"));
      opsi($("fKat"), Object.entries(konfig.kategori));
      opsi($("fProv"), Object.entries(konfig.provinsi).sort((a, b) => a[1].localeCompare(b[1], "id")), "Nasional (tanpa provinsi)");
      opsi($("fAmbang"), [["semua", "Semua kejadian"], ["siaga", "Siaga ke atas"], ["awas", "Awas saja"]]); $("fAmbang").value = "siaga";
      isiKab();
      if (konfig.turnstile) {
        const s = document.createElement("script"); s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"; s.async = true;
        s.onload = () => window.turnstile?.render("#ts", {sitekey: konfig.turnstile, callback: x => { token = x; }, "expired-callback": () => { token = null; }});
        document.head.appendChild(s);
      }
    } catch (e) { pesan("Formulir belum bisa dimuat. Muat ulang halaman ini sebentar lagi."); $("kirim").disabled = true; }
  })();
})();
