"""Login Google Drive SEKALI di laptop, untuk unggah_drive.py.

Pakai:
    py -3 drive_login.py <client_secret.json> --folder-bencana <id> --folder-karhutla <id> [--github]

- <client_secret.json>: berkas OAuth client tipe "Desktop app" dari Google Cloud Console.
- Browser terbuka, login dengan akun Drive tujuan, lalu izinkan akses.
- Hasilnya disimpan di luar repo: ~/.config/poskokarhutla/gdrive.json (repo ini publik).
- --github: sekalian isi secret repo lewat `gh secret set` (token tidak ditampilkan di layar).
"""
import argparse
import base64
import hashlib
import http.server
import json
import os
import re
import secrets
import subprocess
import sys
import urllib.parse
import urllib.request
import webbrowser
from pathlib import Path

SCOPE = "https://www.googleapis.com/auth/drive"
KONFIG = Path.home() / ".config" / "poskokarhutla" / "gdrive.json"


def baca_client(path):
    data = json.loads(Path(path).read_text(encoding="utf-8"))
    c = data.get("installed") or data.get("web")
    if not c:
        sys.exit("Berkas client tidak dikenali. Pilih tipe 'Desktop app' saat membuat OAuth client.")
    return c["client_id"], c["client_secret"]


def minta_kode(client_id):
    verifier = secrets.token_urlsafe(64)
    challenge = base64.urlsafe_b64encode(hashlib.sha256(verifier.encode()).digest()).rstrip(b"=").decode()
    state = secrets.token_urlsafe(16)
    hasil = {}

    class Penangkap(http.server.BaseHTTPRequestHandler):
        def do_GET(self):
            q = urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query)
            if q.get("state", [""])[0] != state:
                self.send_response(400); self.end_headers(); return
            hasil.update({k: v[0] for k, v in q.items()})
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.end_headers()
            pesan = "Login berhasil. Jendela ini boleh ditutup." if "code" in hasil else "Login gagal: " + hasil.get("error", "?")
            self.wfile.write(f"<p style='font:16px sans-serif'>{pesan}</p>".encode())

        def log_message(self, *a):
            pass

    srv = http.server.HTTPServer(("127.0.0.1", 0), Penangkap)
    redirect = f"http://127.0.0.1:{srv.server_port}"
    url = "https://accounts.google.com/o/oauth2/v2/auth?" + urllib.parse.urlencode({
        "client_id": client_id, "redirect_uri": redirect, "response_type": "code", "scope": SCOPE,
        "access_type": "offline", "prompt": "consent", "state": state,
        "code_challenge": challenge, "code_challenge_method": "S256",
    })
    print("Membuka browser untuk login Google. Kalau tidak terbuka, salin alamat ini ke browser:\n" + url + "\n")
    webbrowser.open(url)
    while "code" not in hasil and "error" not in hasil:
        srv.handle_request()
    if "error" in hasil:
        sys.exit("Login dibatalkan atau ditolak: " + hasil["error"])
    return hasil["code"], verifier, redirect


def tukar_token(client_id, client_secret, code, verifier, redirect):
    body = urllib.parse.urlencode({
        "code": code, "client_id": client_id, "client_secret": client_secret,
        "redirect_uri": redirect, "grant_type": "authorization_code", "code_verifier": verifier,
    }).encode()
    with urllib.request.urlopen("https://oauth2.googleapis.com/token", body) as r:
        tok = json.load(r)
    if "refresh_token" not in tok:
        sys.exit("Google tidak memberi refresh token. Cabut akses lama di myaccount.google.com/permissions lalu ulangi.")
    return tok


def akun(access_token):
    req = urllib.request.Request("https://www.googleapis.com/drive/v3/about?fields=user(emailAddress)",
                                 headers={"Authorization": "Bearer " + access_token})
    with urllib.request.urlopen(req) as r:
        return json.load(r)["user"]["emailAddress"]


def isi_github(konf):
    pasangan = {
        "GDRIVE_CLIENT_ID": konf["client_id"],
        "GDRIVE_CLIENT_SECRET": konf["client_secret"],
        "GDRIVE_REFRESH_TOKEN": konf["refresh_token"],
        "GDRIVE_FOLDER_BENCANA": konf["folder_bencana"],
        "GDRIVE_FOLDER_KARHUTLA": konf["folder_karhutla"],
    }
    akar = Path(__file__).resolve().parents[3]  # akar repo, supaya gh tahu repo tujuan dari mana pun dijalankan
    url = subprocess.run(["git", "-C", str(akar), "remote", "get-url", "origin"],
                         capture_output=True, text=True, check=True).stdout.strip()
    repo = re.sub(r"(\.git)?$", "", url.split("github.com")[-1].lstrip("/:"))
    for nama, nilai in pasangan.items():
        subprocess.run(["gh", "secret", "set", nama, "--repo", repo], input=nilai.encode(), check=True, cwd=akar)
        print(f"  secret terisi: {nama} ({repo})")


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("client_json", nargs="?")
    ap.add_argument("--folder-bencana", help="ID folder '1. Laporan Harian Bencana'")
    ap.add_argument("--folder-karhutla", help="ID folder '2. Laporan Harian Karhutla'")
    ap.add_argument("--github", action="store_true", help="isi secret repo lewat gh CLI")
    ap.add_argument("--hanya-github", action="store_true",
                    help="tanpa login ulang: isi secret dari kredensial yang sudah tersimpan")
    a = ap.parse_args()
    if not a.hanya_github and not (a.client_json and a.folder_bencana and a.folder_karhutla):
        ap.error("butuh client_json, --folder-bencana, dan --folder-karhutla (atau --hanya-github)")

    if a.hanya_github:
        if not KONFIG.exists():
            sys.exit(f"{KONFIG} belum ada. Jalankan login dulu.")
        isi_github(json.loads(KONFIG.read_text(encoding="utf-8")))
        return

    client_id, client_secret = baca_client(a.client_json)
    code, verifier, redirect = minta_kode(client_id)
    tok = tukar_token(client_id, client_secret, code, verifier, redirect)
    konf = {"client_id": client_id, "client_secret": client_secret, "refresh_token": tok["refresh_token"],
            "folder_bencana": a.folder_bencana, "folder_karhutla": a.folder_karhutla}
    KONFIG.parent.mkdir(parents=True, exist_ok=True)
    KONFIG.write_text(json.dumps(konf, indent=2), encoding="utf-8")
    try:
        os.chmod(KONFIG, 0o600)
    except OSError:
        pass
    print("Login sebagai:", akun(tok["access_token"]))
    print("Kredensial tersimpan di", KONFIG, "(di luar repo).")
    if a.github:
        isi_github(konf)
    print("Selesai. Coba: py -3 unggah_drive.py --coba <berkas.pdf>")


if __name__ == "__main__":
    main()
