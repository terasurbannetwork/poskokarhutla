// Hook PreToolUse (Bash): sesi Claude tidak boleh melewati uji pre-push. Baca JSON hook dari stdin; exit 2 = tolak.
// Escape hatch LEWATI_UJI / --no-verify tetap ada untuk pemilik manusia di terminalnya sendiri.
// Hanya perintah yang MENGUBAH jalur hook atau mendorong tanpa uji yang ditolak; membaca setelan (git config --get) dan grep bebas.
let s = "";
for await (const c of process.stdin) s += c;
let cmd = "";
try { cmd = JSON.parse(s)?.tool_input?.command ?? ""; } catch {}

function tolak(cmd) {
  const potong = cmd.split(/&&|\|\||;|\||\n/);
  const dorongAda = potong.some((p) => /\bgit\b.*\bpush\b/.test(p));
  for (const p of potong) {
    const dorong = /\bgit\b.*\bpush\b/.test(p);
    if (dorong && /\s--no-verify\b/.test(p)) return true;
    if (dorong && /\s-[a-zA-Z]*n[a-zA-Z]*(\s|$)/.test(p.replace(/^.*\bpush\b/, " "))) return true;
    if (/\bgit\s+(-[^\s]+\s+)*-c\s+core\.hooksPath\s*=/.test(p)) return true;
    // git config [--local|--global|...] core.hooksPath <nilai> atau --unset: nilai selain .githooks ditolak
    const m = p.match(/\bgit\s+config\b(.*)\bcore\.hooksPath\b\s*(\S*)/i);
    if (m) {
      const nilai = m[2].replace(/^["']|["']$/g, "");
      if (/--unset/.test(m[1])) return true;
      if (nilai && !nilai.startsWith("-") && nilai !== ".githooks") return true;
    }
    if (/\bLEWATI_UJI\s*=/.test(p) && (dorong || dorongAda || /\bexport\b/.test(p))) return true;
  }
  return false;
}

if (tolak(cmd)) {
  console.error("Push wajib lewat uji pre-push; betulkan ujinya dulu.");
  process.exit(2);
}
