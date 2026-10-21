/* Turnstile untuk form publik Ruang Koordinasi (alun-alun). Aktif hanya bila server memantulkan TURNSTILE_SITEKEY lewat /api/warga/konfig;
   tanpa itu window.tokenTurnstile() langsung null dan server juga tidak memeriksa (src/worker.js turnstileOK).
   Widget tak terlihat kecuali Cloudflare meminta interaksi; satu token per kiriman, lalu widget direset. */
(() => {
  let siap = null, el = null;
  const muat = () => siap ||= fetch("/api/warga/konfig").then(r => r.ok ? r.json() : {}).catch(() => ({})).then(k => {
    const kunci = k.turnstile || null;
    if (!kunci) return null;
    return new Promise(selesai => {
      const s = document.createElement("script"); s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"; s.async = true;
      s.onload = () => { el = document.createElement("div"); el.className = "bn-ts"; document.body.append(el); selesai(kunci); };
      s.onerror = () => selesai(null);
      document.head.append(s);
    });
  });
  window.tokenTurnstile = async () => {
    const kunci = await muat(); if (!kunci || !window.turnstile) return null;
    return new Promise(sel => {
      let beres = false, id;
      const selesai = t => { if (beres) return; beres = true; clearTimeout(henti); sel(t); };   // satu penyelesaian; timer pengaman supaya tombol kirim tidak menggantung
      const henti = setTimeout(() => { selesai(null); try { window.turnstile.remove(id); } catch (e) {} }, 30000);
      id = window.turnstile.render(el, {sitekey: kunci, appearance: "interaction-only", callback: t => { selesai(t); setTimeout(() => window.turnstile.remove(id), 0); },
        "error-callback": () => { selesai(null); window.turnstile.remove(id); },
        "timeout-callback": () => { selesai(null); window.turnstile.remove(id); }, "expired-callback": () => { selesai(null); window.turnstile.remove(id); }});
    });
  };
})();
