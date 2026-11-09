// Hook PreToolUse (Bash, Agent, EnterWorktree): repo ini hanya punya main (pemilik 16 Okt, 17 Okt, 27 Okt, 2 Nov, 4 Nov, 9 Nov 2026: "gw ga pernah mau ada branch").
// Menolak MEMBUAT branch atau worktree dan push ke selain main. Menghapus branch tetap boleh. exit 2 = tolak.
// ponytail: pola teks; `bash -c "git checkout -b x"` dan worktree yang dibuat aplikasi desktop lolos, penyapu Stop (sapu-branch.sh) yang menangkap sisanya.
const GIT = "\\bgit(?:\\s+-[cC]\\s+\\S+|\\s+--?[\\w-]+(?:=\\S+)?)*\\s+";
const BOLEH_BRANCH = /^(-d|-D|--delete|-l|--list|--show-current|-a|--all|-r|--remotes|-v|-vv|--verbose|--merged|--no-merged|--contains|--no-contains|--format.*|--sort.*|--color.*|--no-color|--points-at|-u|--set-upstream-to.*|--unset-upstream)$/;

// isi heredoc dan teks berkutip bukan perintah (pesan commit, pola grep)
const bersih = cmd => cmd.replace(/<<-?\s*['"]?(\w+)['"]?[\s\S]*?\n\s*\1\b/g, " ").replace(/"(?:\\.|[^"\\])*"|'[^']*'/g, '""').replace(/(?:\d|&)?>>?(?:&\d|\s*\S+)/g, " ");   // pengalihan keluaran (2>&1, >/dev/null) bukan nama branch

function tolakPerintah(cmd) {
  for (const p of bersih(cmd).split(/&&|\|\||;|\||\n/)) {
    if (new RegExp(GIT + "checkout\\b.*\\s-[bB]\\b").test(p)) return true;
    if (new RegExp(GIT + "switch\\b.*\\s(-[cC]\\b|--(force-)?create\\b)").test(p)) return true;
    if (new RegExp(GIT + "worktree\\s+add\\b").test(p)) return true;
    const b = p.match(new RegExp(GIT + "branch\\b(.*)$"));
    if (b) { const t = b[1].trim().split(/\s+/).filter(Boolean); if (t.some(x => !x.startsWith("-") && !x.startsWith(">")) && !t.some(x => BOLEH_BRANCH.test(x))) return true; }
    const d = p.match(new RegExp(GIT + "push\\b(.*)$"));
    if (d) {
      const t = d[1].trim().split(/\s+/).filter(Boolean);
      if (t.includes("-d") || t.includes("--delete")) continue;
      for (const r of t.filter(x => !x.startsWith("-")).slice(1)) {   // token pertama = nama remote
        const tuju = r.replace(/^\+/, "").split(":").pop().replace(/^refs\/heads\//, "");
        if (r.replace(/^\+/, "").startsWith(":") || tuju.startsWith("refs/tags/")) continue;   // ":x" = hapus
        if (tuju !== "main" && tuju !== "HEAD") return true;
      }
    }
  }
  return false;
}

let s = "";
for await (const c of process.stdin) s += c;
let j = {};
try { j = JSON.parse(s); } catch {}
const alat = j.tool_name ?? "", masuk = j.tool_input ?? {};
if (alat === "EnterWorktree" || masuk.isolation === "worktree" || tolakPerintah(masuk.command ?? "")) {
  console.error("Repo ini hanya main: pemilik tidak mau ada branch atau worktree. Kerjakan langsung di main dan commit dengan path spesifik; agent penulis jalan satu per satu atau dengan berkas yang tidak beririsan.");
  process.exit(2);
}
