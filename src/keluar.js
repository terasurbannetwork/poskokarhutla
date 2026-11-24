/* Rumah tunggal pesan keluar (FITUR.md §9, WEBSITE.md §6d). Email ke Resend hanya lewat kirimEmail di sini;
   gerbang tests/agen/gerbang-keluar.test.mjs menolak api.resend.com di berkas src lain.
   WA tetap lewat antrean wa_antre (penulisnya di hak.js karena D1 hanya di sana). */

/* ke = satu alamat atau larik. m = {subject, html, text|teks}. opsi.balasKe = reply_to; opsi.tautanBerhenti = List-Unsubscribe satu klik.
   Galat tidak membawa isi balasan Resend (bisa memuat alamat atau kunci) ke log atau respons. */
export async function kirimEmail(env, ke, m, opsi = {}) {
  const {balasKe, tautanBerhenti} = typeof opsi === "string" ? {tautanBerhenti: opsi} : opsi;
  const r = await fetch("https://api.resend.com/emails", {method: "POST", signal: AbortSignal.timeout(8000),
    headers: {authorization: `Bearer ${env.EMAIL_API_KEY}`, "content-type": "application/json"},
    body: JSON.stringify({from: env.EMAIL_FROM, to: [].concat(ke), ...(balasKe ? {reply_to: balasKe} : {}),
      subject: m.subject, text: m.text ?? m.teks, ...(m.html ? {html: m.html} : {}),
      ...(tautanBerhenti ? {headers: {"List-Unsubscribe": `<${tautanBerhenti}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click"}} : {})})});
  if (!r.ok) { r.body?.cancel(); throw new Error(`Resend HTTP ${r.status}`); }
  return true;
}
