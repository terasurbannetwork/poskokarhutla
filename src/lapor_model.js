/* Gerbang model Lapor Bencana BNPB (DESAIN-TEKNIS bagian Model; KEPUTUSAN Q2).
   Raw fetch ke Claude Messages API, karena modul ini dipakai Worker (tanpa paket npm di bundel) dan server lokal Node yang sama.
   Keluaran dibatasi skema lewat structured outputs (output_config.format); forced tool_choice ditolak model Sonnet 5.5.
   buatModel({kunci, model, fetch}) -> null bila tanpa kunci (mesin jatuh ke pertanyaan templat), atau async ({sistem, skema, teks}) -> objek | null. */
export const MODEL_BAWAAN = "claude-sonnet-5-5";

/* dasar: alamat router API (mis. 9router, harus https publik) di depan akun Anthropic; kosong = api.anthropic.com langsung.
   Lewat router: header x-app: cli (router meneruskan apa adanya, tanpa itu output_config.format dibuang) dan TANPA beta/fallbacks (router bisa menolaknya). */
export function buatModel({kunci, model = MODEL_BAWAAN, fetch: f = globalThis.fetch, batasMs = 15000, catat = () => {}, dasar = ""} = {}) {
  if (!kunci) return null;
  return async ({sistem, skema, teks}) => {
    const router = String(dasar || "").replace(/\/+$/, "");
    const r = await f(`${router || "https://api.anthropic.com"}/v1/messages`, {
      method: "POST",
      signal: AbortSignal.timeout(batasMs),
      headers: {
        "x-api-key": kunci, "anthropic-version": "2026-10-21", "content-type": "application/json",
        ...(router ? {"x-app": "cli"} : {"anthropic-beta": "server-side-fallback-2026-07-01"}),
      },
      body: JSON.stringify({
        model, max_tokens: 2048,
        system: [{type: "text", text: sistem, cache_control: {type: "ephemeral"}}],
        messages: [{role: "user", content: teks}],
        output_config: {effort: "low", format: {type: "json_schema", schema: skema}},
        ...(router ? {} : {fallbacks: "default"}), // penolakan pengaman dialihkan server ke model cadangan, bukan berhenti
      }),
    });
    if (!r.ok) throw new Error(`model ${r.status}: ${(await r.text()).slice(0, 200)}`);
    const j = JSON.parse((await r.text()).replace(/\s*data:\s*\[DONE\]\s*$/, ""));   // 9router menempelkan "data: [DONE]" di balasan non-streaming
    catat({model: j.model, masuk: j.usage?.input_tokens, keluar: j.usage?.output_tokens, cache: j.usage?.cache_read_input_tokens, henti: j.stop_reason});
    if (j.stop_reason === "refusal" || j.stop_reason === "max_tokens") return null;
    const teksBlok = (j.content || []).find(b => b.type === "text");
    return teksBlok ? JSON.parse(teksBlok.text) : null;
  };
}
