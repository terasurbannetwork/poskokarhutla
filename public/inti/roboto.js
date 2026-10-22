/* inti/roboto.js: Roboto (Apache 2.0, subset Latin, public/vendor/roboto) ditanam ke jsPDF; dipakai paparan.js dan dokumen.js (skrip biasa, global). */
"use strict";
let robotoB64 = null;
async function muatRoboto() {
  if (robotoB64) return robotoB64;
  const b64 = async u => { const a = new Uint8Array(await (await fetch(u)).arrayBuffer()); let s = ""; for (let i = 0; i < a.length; i += 8192) s += String.fromCharCode(...a.subarray(i, i + 8192)); return btoa(s); };
  try { robotoB64 = {n: await b64("/vendor/roboto/Roboto-Regular.ttf"), b: await b64("/vendor/roboto/Roboto-Bold.ttf")}; } catch (e) { console.warn("Roboto gagal dimuat, PDF memakai Helvetica"); robotoB64 = {}; }
  return robotoB64;
}
function pasangRoboto(doc, r) {
  if (!r.n) return; doc.addFileToVFS("Roboto-Regular.ttf", r.n); doc.addFont("Roboto-Regular.ttf", "Roboto", "normal"); doc.addFileToVFS("Roboto-Bold.ttf", r.b); doc.addFont("Roboto-Bold.ttf", "Roboto", "bold"); doc.__roboto = true;
}
