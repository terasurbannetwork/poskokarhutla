/* Helper bersama halaman admin Ruang Koordinasi BNPB (/admin/relawan, alun, riset, meja): dimuat SEBELUM skrip halaman oleh halamanBnpb
   (src/admin_halaman.js). Satu salinan supaya perbaikan tidak menyimpang antar halaman (gerbang-inti menolak salinan). */
window.Admin = {
  esc: s => String(s ?? "").replace(/[&<>"']/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c])),
  /* POST JSON -> {ok, status, j}; galat jaringan tidak dilempar ke pemanggil sebagai status palsu */
  async kirim(url, body) {
    const r = await fetch(url, {method: "POST", headers: {"content-type": "application/json"}, body: JSON.stringify(body)});
    return {ok: r.ok, status: r.status, j: await r.json().catch(() => ({}))};
  },
  /* GET JSON; 403 = sesi habis -> halaman masuk; 503 = migrasi modul belum dijalankan */
  async ambil(url, nama = "Fitur ini") {
    const r = await fetch(url);
    if (r.status === 403) { location.href = "/admin/masuk?ke=" + encodeURIComponent(location.pathname); throw new Error("perlu masuk"); }
    if (r.status === 503) throw new Error(`${nama} belum diaktifkan (migrasi D1 belum dijalankan)`);
    if (!r.ok) throw new Error(`galat ${r.status}`);
    return r.json();
  },
};
