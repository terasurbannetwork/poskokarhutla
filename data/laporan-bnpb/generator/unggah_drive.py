"""Unggah laporan harian ke Google Drive Tim IT, ke folder pekan dan hari yang benar.

Pakai:
    py -3 unggah_drive.py [--tanggal YYYY-MM-DD] [--jenis bencana|karhutla] [--coba] <berkas> ...

- Tanggal diambil dari --tanggal, atau dari 6 angka DDMMYY di nama berkas.
- Jenis: nama berkas memuat "karhutla" -> folder Karhutla, selain itu -> folder Bencana.
- Pola folder (sama dengan yang dibuat manual di Drive):
    <akar>/2026/11. November 2026/1. 02 November - 08 November 2026/2. Selasa, 03 November 2026/
  Pekan Senin-Minggu, ikut bulan hari Seninnya; nomor pekan = urutan Senin dalam bulan; nomor hari Senin=1.
- Folder yang belum ada dibuat. Berkas bernama sama: isi sama dilewati, isi beda ditimpa (ID berkas tetap).
- --coba: hanya tampilkan rencana, tanpa jaringan dan tanpa kredensial.

Kredensial: env GDRIVE_CLIENT_ID, GDRIVE_CLIENT_SECRET, GDRIVE_REFRESH_TOKEN, GDRIVE_FOLDER_BENCANA,
GDRIVE_FOLDER_KARHUTLA (GitHub Actions), atau ~/.config/poskokarhutla/gdrive.json dari drive_login.py.
"""
import argparse
import datetime as dt
import hashlib
import json
import os
import re
import sys
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

BULAN = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus",
         "September", "Oktober", "November", "Desember"]
HARI = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"]
FOLDER = "application/vnd.google-apps.folder"
MIME = {".pdf": "application/pdf",
        ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        ".json": "application/json", ".txt": "text/plain", ".png": "image/png", ".jpg": "image/jpeg"}
KONFIG = Path.home() / ".config" / "poskokarhutla" / "gdrive.json"
API = "https://www.googleapis.com/drive/v3"
UNGGAH = "https://www.googleapis.com/upload/drive/v3"


def tgl(d):
    return f"{d.day:02d} {BULAN[d.month - 1]}"


def jalur_folder(d):
    """Daftar nama folder dari akar jenis sampai folder hari, untuk tanggal d."""
    senin = d - dt.timedelta(days=d.weekday())
    minggu = senin + dt.timedelta(days=6)
    return [
        str(senin.year),
        f"{senin.month}. {BULAN[senin.month - 1]} {senin.year}",
        f"{(senin.day - 1) // 7 + 1}. {tgl(senin)} - {tgl(minggu)} {minggu.year}",
        f"{d.weekday() + 1}. {HARI[d.weekday()]}, {tgl(d)} {d.year}",
    ]


def tanggal_dari_nama(nama):
    m = re.search(r"(?<!\d)(\d{2})(\d{2})(\d{2})(?!\d)", nama)
    if not m:
        return None
    return dt.date(2000 + int(m.group(3)), int(m.group(2)), int(m.group(1)))


def jenis_dari_nama(nama):
    return "karhutla" if "karhutla" in nama.lower() else "bencana"


def muat_konfig():
    env = {k: os.environ.get("GDRIVE_" + k.upper(), "") for k in
           ("client_id", "client_secret", "refresh_token", "folder_bencana", "folder_karhutla")}
    if all(env.values()):
        return env
    if KONFIG.exists():
        konf = json.loads(KONFIG.read_text(encoding="utf-8"))
        konf.update({k: v for k, v in env.items() if v})
        return konf
    sys.exit("Kredensial Drive belum ada. Jalankan drive_login.py dulu, atau setel env GDRIVE_*.")


class Drive:
    def __init__(self, konf):
        body = urllib.parse.urlencode({
            "client_id": konf["client_id"], "client_secret": konf["client_secret"],
            "refresh_token": konf["refresh_token"], "grant_type": "refresh_token"}).encode()
        try:
            with urllib.request.urlopen("https://oauth2.googleapis.com/token", body) as r:
                self.token = json.load(r)["access_token"]
        except urllib.error.HTTPError as e:
            sys.exit(f"Refresh token ditolak Google ({e.code}). Ulangi drive_login.py. {e.read()[:200]!r}")

    def minta(self, metode, url, data=None, header=None, json_body=None):
        h = {"Authorization": "Bearer " + self.token}
        if json_body is not None:
            data = json.dumps(json_body).encode()
            h["Content-Type"] = "application/json; charset=UTF-8"
        h.update(header or {})
        req = urllib.request.Request(url, data=data, headers=h, method=metode)
        try:
            with urllib.request.urlopen(req) as r:
                isi = r.read()
                return r, (json.loads(isi) if isi else {})
        except urllib.error.HTTPError as e:
            sys.exit(f"Drive API {metode} gagal ({e.code}): {e.read()[:300].decode(errors='replace')}")

    def cari(self, induk, nama, folder):
        esc = nama.replace("\\", "\\\\").replace("'", "\\'")
        q = f"'{induk}' in parents and name = '{esc}' and trashed = false and mimeType "
        q += f"= '{FOLDER}'" if folder else f"!= '{FOLDER}'"
        url = API + "/files?" + urllib.parse.urlencode({
            "q": q, "fields": "files(id,name,md5Checksum)", "pageSize": 10,
            "supportsAllDrives": "true", "includeItemsFromAllDrives": "true"})
        return self.minta("GET", url)[1].get("files", [])

    def folder(self, induk, nama):
        ada = self.cari(induk, nama, folder=True)
        if ada:
            return ada[0]["id"], False
        _, f = self.minta("POST", API + "/files?supportsAllDrives=true&fields=id",
                          json_body={"name": nama, "mimeType": FOLDER, "parents": [induk]})
        return f["id"], True

    def unggah(self, induk, path):
        isi = path.read_bytes()
        md5 = hashlib.md5(isi).hexdigest()
        mime = MIME.get(path.suffix.lower(), "application/octet-stream")
        ada = self.cari(induk, path.name, folder=False)
        if ada and ada[0].get("md5Checksum") == md5:
            return "sama, dilewati", ada[0]["id"]
        if ada:
            metode, url, meta, aksi = "PATCH", f"{UNGGAH}/files/{ada[0]['id']}", {}, "ditimpa"
        else:
            metode, url, meta, aksi = "POST", f"{UNGGAH}/files", {"name": path.name, "parents": [induk]}, "diunggah"
        r, _ = self.minta(metode, url + "?uploadType=resumable&supportsAllDrives=true", json_body=meta,
                          header={"X-Upload-Content-Type": mime, "X-Upload-Content-Length": str(len(isi))})
        lokasi = r.headers["Location"]
        _, f = self.minta("PUT", lokasi, data=isi, header={"Content-Type": mime})
        return aksi, f.get("id", "")


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("berkas", nargs="+")
    ap.add_argument("--tanggal", help="YYYY-MM-DD; bawaan dari nama berkas")
    ap.add_argument("--jenis", choices=["bencana", "karhutla"], help="bawaan dari nama berkas")
    ap.add_argument("--coba", action="store_true", help="tampilkan rencana saja")
    a = ap.parse_args()

    rencana = []
    for b in a.berkas:
        p = Path(b)
        if not p.is_file():
            sys.exit(f"Berkas tidak ada: {p}")
        d = dt.date.fromisoformat(a.tanggal) if a.tanggal else tanggal_dari_nama(p.name)
        if not d:
            sys.exit(f"Tanggal tidak terbaca dari nama '{p.name}'. Pakai --tanggal YYYY-MM-DD.")
        rencana.append((p, a.jenis or jenis_dari_nama(p.name), jalur_folder(d)))

    if a.coba:
        for p, jenis, jalur in rencana:
            print(f"[coba] {p.name}\n       -> <{jenis}>/" + "/".join(jalur))
        return

    konf = muat_konfig()
    drv = Drive(konf)
    cache = {}
    for p, jenis, jalur in rencana:
        induk = konf["folder_" + jenis]
        for i, nama in enumerate(jalur):
            kunci = (jenis,) + tuple(jalur[: i + 1])
            if kunci not in cache:
                cache[kunci], baru = drv.folder(induk, nama)
                if baru:
                    print("  folder dibuat:", "/".join(jalur[: i + 1]))
            induk = cache[kunci]
        aksi, fid = drv.unggah(induk, p)
        print(f"{p.name}: {aksi}  https://drive.google.com/file/d/{fid}/view")


if __name__ == "__main__":
    main()
