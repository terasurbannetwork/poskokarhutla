/* Ruas jalan rusak yang disebut pelapor, dicari di OpenStreetMap (Overpass) dari server untuk peta meja (pemilik 21 Nov 2026: "jalan mana rusak, langsung ditandai").
   Lewat server supaya IP staf tidak terkirim ke cermin pihak ketiga dan CSP browser tidak dilebarkan (security-reviewer 21 Nov 2026).
   Yang dikirim ke Overpass atau Nominatim hanya koordinat laporan dan nama jalan; nama dan nomor pelapor tidak. */
const CERMIN = ["https://overpass-api.de/api/interpreter", "https://maps.mail.ru/osm/tools/overpass/api/interpreter", "https://overpass.private.coffee/api/interpreter"];
export const polaJalan = nama => nama.map(x => String(x).slice(0, 80).replace(/["\\\n\r]/g, "").replace(/[.*+?^${}()|[\]]/g, "\\$&")).filter(Boolean).join("|");
export async function jalanOsm(lat, lon, nama) {
  if (!Number.isFinite(Number(lat)) || !Number.isFinite(Number(lon)) || !nama?.length) return {fitur: [], ketemu: []};
  const q = `[out:json][timeout:10];way(around:3000,${Number(lat)},${Number(lon)})["highway"]["name"~"^(${polaJalan(nama.slice(0, 10))})$",i];out geom;`;
  for (const u of CERMIN) {
    try { const r = await fetch(u, {method: "POST", body: new URLSearchParams({data: q}), headers: {"user-agent": "pantau-bencana-bnpb/0.1"}, signal: AbortSignal.timeout(10000)});
      if (!r.ok || !/json/.test(r.headers.get("content-type") || "")) continue;
      const J = await r.json(), el = (J.elements || []).filter(e => e.geometry?.length > 1);
      return {fitur: el.map(e => ({type: "Feature", properties: {nama: e.tags?.name || null}, geometry: {type: "LineString", coordinates: e.geometry.map(g => [g.lon, g.lat])}})),
        ketemu: [...new Set(el.map(e => e.tags?.name).filter(Boolean))]};
    } catch {}
  }
  return await nominatim(Number(lat), Number(lon), nama.slice(0, 10));
}
/* cadangan saat semua cermin Overpass penuh: Nominatim OSM per nama jalan, dibatasi kotak sekitar 3 km dari laporan.
   Satu permintaan per nama, berurutan (kebijakan pemakaian Nominatim: paling banyak 1 per detik, ber-user-agent). */
async function nominatim(lat, lon, nama) {
  const d = 0.03, kotak = `${lon - d},${lat + d},${lon + d},${lat - d}`, fitur = [], ketemu = [];
  for (const n of nama) {
    try { const u = `https://nominatim.openstreetmap.org/search?${new URLSearchParams({q: String(n).slice(0, 80), format: "geojson", polygon_geojson: "1", limit: "8", viewbox: kotak, bounded: "1"})}`;
      const r = await fetch(u, {headers: {"user-agent": "pantau-bencana-bnpb/0.1"}, signal: AbortSignal.timeout(8000)}); if (!r.ok) continue;
      const g = ((await r.json()).features || []).filter(f => f.properties?.category === "highway" && /LineString/.test(f.geometry?.type || ""));
      for (const f of g) fitur.push({type: "Feature", properties: {nama: f.properties.name || null}, geometry: f.geometry});
      if (g.length) ketemu.push(g[0].properties.name || n);
    } catch {}
    if (nama.length > 1) await new Promise(r => setTimeout(r, 1100));
  }
  return {fitur, ketemu, gagal: !fitur.length || undefined};
}
if (typeof process !== "undefined" && import.meta.url === `file://${process.argv?.[1]}`) {   // uji diri: pelolosan tidak bisa keluar dari string atau regex
  const p = polaJalan(['Jl. A"]; out;', "B\\C", "Jalan (X)|Y"]);
  console.assert(!p.includes('"') && !p.includes("\n") && p.includes("Jl\\. A") && p.includes("Jalan \\(X\\)\\|Y"), p);
  console.log("lapor_jalan.js lolos:", p);
}
