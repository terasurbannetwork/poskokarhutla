/* Peramban nyata untuk uji layar: Chrome headless lewat Chrome DevTools Protocol (WebSocket bawaan Node), tanpa dependensi.
   Profil Chrome di os.tmpdir(), dibersihkan di tutup(). cariChrome() null = tidak ada Chrome: pemanggil MELEWATI uji dengan pesan jelas. */
import {spawn} from "node:child_process";
import {existsSync, mkdtempSync, readFileSync, rmSync} from "node:fs";
import {tmpdir} from "node:os";
import path from "node:path";

export function cariChrome() {
  const kandidat = [process.env.CHROME_BIN, "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/usr/bin/google-chrome", "/usr/bin/google-chrome-stable", "/usr/bin/chromium", "/usr/bin/chromium-browser"];
  return kandidat.find(f => f && existsSync(f)) || null;
}
const tidur = ms => new Promise(r => setTimeout(r, ms));

export async function bukaPeramban(bin = cariChrome()) {
  const profil = mkdtempSync(path.join(tmpdir(), "uji-layar-"));
  const proses = spawn(bin, ["--headless=new", "--remote-debugging-port=0", `--user-data-dir=${profil}`, "--no-first-run", "--no-default-browser-check",
    "--disable-gpu", "--disable-extensions", "--hide-scrollbars", "about:blank"], {stdio: "ignore"});
  let port = null;
  for (let i = 0; i < 100 && !port; i++) {
    await tidur(100);
    try { port = readFileSync(path.join(profil, "DevToolsActivePort"), "utf8").split("\n")[0]; } catch (e) {}
  }
  const tutup = async () => { proses.kill("SIGKILL"); await tidur(100); rmSync(profil, {recursive: true, force: true}); };
  if (!port) { await tutup(); throw new Error("Chrome tidak membuka port DevTools dalam 10 detik"); }
  return {tutup, port, tab: () => bukaTab(port)};
}

async function bukaTab(port) {
  const r = await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, {method: "PUT"});
  const info = await r.json(), ws = new WebSocket(info.webSocketDebuggerUrl);
  await new Promise((ok, gagal) => { ws.onopen = ok; ws.onerror = () => gagal(new Error("WebSocket CDP gagal")); });
  let id = 0; const tunggu = new Map(), pendengar = [];
  ws.onmessage = e => {
    const m = JSON.parse(e.data);
    if (m.id && tunggu.has(m.id)) { const [ok, gagal] = tunggu.get(m.id); tunggu.delete(m.id); m.error ? gagal(new Error(m.error.message)) : ok(m.result); }
    else pendengar.forEach(f => f(m));
  };
  const kirim = (method, params = {}) => new Promise((ok, gagal) => { const n = ++id; tunggu.set(n, [ok, gagal]); ws.send(JSON.stringify({id: n, method, params})); });
  /* galat yang dikumpulkan sejak navigasi terakhir: konsol error, pengecualian JS, pelanggaran CSP/keamanan, permintaan lokal gagal */
  let galat = [];
  pendengar.push(m => {
    const p = m.params;
    if (m.method === "Runtime.consoleAPICalled" && p.type === "error") galat.push("konsol: " + p.args.map(a => a.value ?? a.description ?? "").join(" ").slice(0, 300));
    if (m.method === "Runtime.exceptionThrown") galat.push("pengecualian: " + (p.exceptionDetails.exception?.description || p.exceptionDetails.text).slice(0, 300));
    if (m.method === "Log.entryAdded" && p.entry.level === "error") galat.push(`log(${p.entry.source}): ${p.entry.text} ${p.entry.url || ""}`.slice(0, 300));
    if (m.method === "Audits.issueAdded" && p.issue.code === "ContentSecurityPolicyIssue") galat.push("CSP: " + (p.issue.details.contentSecurityPolicyIssueDetails?.violatedDirective || "?") + " " + (p.issue.details.contentSecurityPolicyIssueDetails?.blockedURL || ""));
  });
  for (const d of ["Runtime", "Log", "Page", "Network", "Audits"]) await kirim(d + ".enable");
  const T = {
    kirim, tutup: () => { ws.close(); },
    galat: () => galat.slice(), kosongkanGalat: () => { galat = []; },
    async ukuran(w, h) { await kirim("Emulation.setDeviceMetricsOverride", {width: w, height: h, deviceScaleFactor: 1, mobile: w < 600}); },
    async cookie(url, name, value) { await kirim("Network.setCookie", {url, name, value, path: "/"}); },
    async eval(ekspresi) {
      const r = await kirim("Runtime.evaluate", {expression: ekspresi, awaitPromise: true, returnByValue: true});
      if (r.exceptionDetails) throw new Error("eval: " + (r.exceptionDetails.exception?.description || r.exceptionDetails.text));
      return r.result.value;
    },
    /* navigasi dua langkah (about:blank dulu): URL sama / beda fragmen saja tidak memicu load, dan itu menggantung uji */
    async buka(url, {tunggu: selektor, ms = 15000} = {}) {
      const ke = async u => {
        const muat = new Promise(ok => { const f = m => { if (m.method === "Page.loadEventFired") { pendengar.splice(pendengar.indexOf(f), 1); ok(); } }; pendengar.push(f); });
        await kirim("Page.navigate", {url: u});
        await Promise.race([muat, tidur(ms).then(() => { throw new Error(`halaman ${u} tidak selesai dimuat dalam ${ms} ms`); })]);
      };
      await ke("about:blank"); galat = []; await ke(url);
      if (selektor) await T.tunggu(selektor, ms);
      await tidur(300);   // beri ruang bagi fetch awal & render
    },
    async tunggu(selektor, ms = 15000) {
      const s = JSON.stringify(selektor), t0 = Date.now();
      while (Date.now() - t0 < ms) { if (await T.eval(`!!document.querySelector(${s})`)) return; await tidur(100); }
      throw new Error(`elemen "${selektor}" tidak muncul dalam ${ms} ms`);
    },
    async tungguFungsi(js, ms = 8000) {
      const t0 = Date.now();
      while (Date.now() - t0 < ms) { if (await T.eval(js)) return; await tidur(100); }
      throw new Error(`kondisi tidak terpenuhi dalam ${ms} ms: ${js.slice(0, 120)}`);
    },
    async klik(selektor) { if (!await T.eval(`(() => { const e = document.querySelector(${JSON.stringify(selektor)}); if (!e) return false; e.click(); return true; })()`)) throw new Error(`klik: "${selektor}" tidak ada`); },
    /* klik elemen pertama (selektor) yang teksnya cocok regex; galat bila tidak ada */
    async klikTeks(selektor, regex) {
      if (!await T.eval(`(() => { const e = [...document.querySelectorAll(${JSON.stringify(selektor)})].find(x => new RegExp(${JSON.stringify(regex)}, "i").test(x.innerText)); if (!e) return false; e.click(); return true; })()`))
        throw new Error(`klik: tidak ada ${selektor} bertuliskan /${regex}/`);
    },
    async pilih(selektor, nilai) {
      if (!await T.eval(`(() => { const e = document.querySelector(${JSON.stringify(selektor)}); if (!e) return false; e.value = ${JSON.stringify(nilai)}; e.dispatchEvent(new Event("change", {bubbles: true})); return true; })()`)) throw new Error(`pilih: "${selektor}" tidak ada`);
    },
    async teks() { return T.eval("document.body.innerText"); },
    async lebihLebar() { return T.eval("({sw: document.documentElement.scrollWidth, iw: innerWidth})"); },
  };
  T.tutup = async () => { try { await fetch(`http://127.0.0.1:${port}/json/close/${info.id}`); } catch (e) {} ws.close(); };
  return T;
}
