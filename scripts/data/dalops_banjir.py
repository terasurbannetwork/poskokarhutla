"""Bahan layar staf Pantau Banjir Dalops (/bnpb/dalops): kejadian banjir dari logbook harian Pusdalops, PRIVAT.

Masukan : data/raw/logbook/arsip/<tahun>/kejadian.jsonl (keluaran logbook_pusdalops.py, tidak di-git; ada nama petugas)
Keluaran: data/raw/dalops/banjir.json (ikut .gitignore). Dengan --unggah: R2 poskokarhutla-foto/dalops/banjir.json,
          disajikan src/dalops.js hanya untuk sesi staf Pusdalops/Koordalops/Pimpinan.

Pilihan kejadian (jenis "banjir"; bandang tercatat di jenis ini, rob di gelombang_pasang tidak ikut):
  - mulai dalam 30 hari terakhir, DAN
  - kabar terakhir dalam 7 hari logbook terakhir (bahan "laporan sepekan") ATAU belum dilaporkan surut
    (yang lama senyap justru harus dikejar Dalops; layar menaruhnya di "Perlu ditanya", bukan di tabel sepekan).
Layar mengelompokkan per kab/kota dan status surut, sama dengan deck "Situasi Banjir Sepekan" 2 Nov 2026.
Surut dibaca dari teks kondisi terakhir (lihat `surut()`); "mulai/berangsur surut" dihitung BELUM surut.
Angka tak diketahui = null, bukan 0.

Pakai: python3 scripts/data/dalops_banjir.py [--hari YYYY-MM-DD] [--unggah]
Uji  : python3 scripts/data/dalops_banjir.py --uji
"""
import argparse
import datetime as dt
import glob
import importlib.util
import json
import os
import re
import subprocess

AKAR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
KELUAR = os.path.join(AKAR, "data/raw/dalops/banjir.json")
KUNCI_R2 = "poskokarhutla-foto/dalops/banjir.json"
SEPEKAN, BUKA_MAKS = 6, 30   # hari sebelum hari logbook terakhir


def _muat(nama, rel):
    s = importlib.util.spec_from_file_location(nama, os.path.join(AKAR, rel))
    m = importlib.util.module_from_spec(s)
    s.loader.exec_module(m)
    return m


# --------------------------------------------------------------- pembaca teks kondisi (murni, diuji --uji)
SUDAH = re.compile(r"\b(sudah|telah|sdh|sudh)\s+(mulai\s+)?(surut|kering)|\bsurut\s+(total|seluruhnya|sepenuhnya)|\bkembali\s+normal|\bsudah\s+tidak\s+(ada\s+)?(tergenang|genangan)")
BELUM = re.compile(r"\bbelum\s+(sepenuhnya\s+)?surut|\bmasih\s+(ter)?genang|\bgenangan\b[^.]{0,40}\bmasih\s+ada|\bmasih\s+ada\s+genangan|\bmenggenangi|\bmasih\s+terendam|\bair\s+(kembali\s+)?naik|\bkenaikan")
RE_TGL_AWAL = re.compile(r"^\s*(senin|selasa|rabu|kamis|jumat|jum'at|sabtu|minggu)?,?\s*\d{1,2}\s+\w+\s+\d{4}\s*", re.I)


def surut(teks):
    """True bila kondisi terakhir menyatakan sudah surut tanpa sisa genangan; 'mulai/berangsur/perlahan surut' = belum."""
    t = (teks or "").lower()
    if BELUM.search(t):
        # "sudah surut di sebagian besar wilayah" dengan sisa genangan tetap belum; kecuali kalimat surutnya tegas tanpa sisa
        return False
    return bool(SUDAH.search(t))


RE_TINGGI = re.compile(r"(\d+(?:[.,]\d+)?)\s*(?:(?:s/d|s\.d\.?|sd|-|–|hingga|sampai|sampai dengan)\s*(\d+(?:[.,]\d+)?)\s*)?(cm|centimeter|sentimeter|m|meter)\b", re.I)
KATA_AIR = re.compile(r"ketinggian|tinggi|tma|genangan|air|banjir|terendam", re.I)


def tinggi_cm(teks):
    """[min, max] tinggi air dalam cm dari teks bebas, hanya bila dekat kata air/genangan/ketinggian. Tidak ada = None."""
    hasil = []
    for m in RE_TINGGI.finditer(teks or ""):
        depan = (teks or "")[max(0, m.start() - 40):m.start()]
        if not KATA_AIR.search(depan):
            continue
        kali = 100 if m.group(3).lower() in ("m", "meter") else 1
        a = float(m.group(1).replace(",", ".")) * kali
        b = float(m.group(2).replace(",", ".")) * kali if m.group(2) else a
        if 0 < a <= b <= 1000:
            hasil += [a, b]
    return [round(min(hasil)), round(max(hasil))] if hasil else None


def bersih_kondisi(teks):
    t = RE_TGL_AWAL.sub("", (teks or "").strip())
    t = re.sub(r"\s+", " ", t).strip()
    return t[:240].rstrip() + ("…" if len(t) > 240 else "")


# --------------------------------------------------------------- rincian desa dari teks dampak/kondisi (murni, diuji --uji)
RE_KEC = re.compile(r"^\s*(?:[-•*]\s*)?(?:kecamatan|kec\.?)\s*:?\s*([A-Za-z][\w .'\-]{1,40}?)\s*:?\s*$", re.I)
RE_DESA = re.compile(r"(?:^|[\s,;(])(?i:gp\.|gampong|desa|ds\.|kel\.|kelurahan|dusun|nagari|jorong|kampung|kp\.)\s*:?\s*"
                     r"([A-Z][A-Za-z'\-]*(?:[ \-][A-Z][A-Za-z'\-]*){0,3})", re.M)
RE_KK = re.compile(r"(\d[\d.]*)\s*KK", re.I)
RE_JIWA = re.compile(r"(\d[\d.]*)\s*(?:jiwa|orang)", re.I)
BUKAN_DESA = {"Balai", "Sekitarnya", "Setempat", "Terdampak", "Yang", "Dan", "Di"}


def _bil(t):
    try:
        n = int(t.replace(".", ""))
        return n if n > 0 else None
    except ValueError:
        return None


def rincian_desa(*teks):
    """Desa/kelurahan yang disebut di teks laporan: [{nama, kec, kk, jiwa, tinggi_cm}]. Kecamatan dari baris judul
    'Kec. X' / 'Kecamatan X' terdekat di atasnya (None bila tak ada). Angka hanya dari baris desa itu sendiri."""
    out = {}
    for t in teks:
        kec = None
        for baris_ in (t or "").splitlines():
            m = RE_KEC.match(baris_)
            if m:
                kec = m.group(1).strip()
                continue
            for d in RE_DESA.finditer(baris_):
                nama = re.sub(r"\s+Kec(amatan)?\.?$", "", d.group(1).strip(" -"))
                kec_di = re.match(r"\s*\.?,?\s*(?:Kec(?:amatan)?\.?)\s*([A-Z][A-Za-z\-]+(?: [A-Z][A-Za-z\-]+)?)", baris_[d.start(1) + len(nama):])
                if len(nama) < 3 or nama.split()[0] in BUKAN_DESA:
                    continue
                sisa = baris_[d.end():]
                lanjut = RE_DESA.search(sisa)   # berhenti di desa berikutnya pada baris yang sama
                sisa = sisa[:lanjut.start()] if lanjut and lanjut.group(1).split()[0] not in BUKAN_DESA else sisa
                kk, jw = (None, None) if re.search(r"ngungsi", baris_, re.I) else (RE_KK.search(sisa), RE_JIWA.search(sisa))
                x = out.setdefault(re.sub(r"[\s\-]", "", nama.lower()), {"nama": nama, "kec": None, "kk": None, "jiwa": None, "tinggi_cm": None})   # Namo Buaya = Namobuaya
                x["kec"] = x["kec"] or (kec_di.group(1) if kec_di else None) or kec
                if kk and _bil(kk.group(1)): x["kk"] = _bil(kk.group(1))
                if jw and _bil(jw.group(1)): x["jiwa"] = _bil(jw.group(1))
                x["tinggi_cm"] = tinggi_cm("air " + sisa) or x["tinggi_cm"]
    return list(out.values())


# --------------------------------------------------------------- laporan harian PDF (Dit. Koordalops), murni kecuali baca_pdf
BULAN = {b: i + 1 for i, b in enumerate(["januari", "februari", "maret", "april", "mei", "juni", "juli", "agustus", "september", "oktober", "november", "desember"])}
RE_TGL = re.compile(r"(\d{1,2})\s+(" + "|".join(BULAN) + r")\s+(\d{4})", re.I)
RE_KEPALA = re.compile(r"^\s*\d+\.\s*Bencana Alam ([^\n]*?Banjir[^\n]*?) di ((?:Kab\.|Kota)\s*[^,\n]+),\s*Provinsi\s+([^\n]+?)\s*$", re.M)
RE_BAGIAN = re.compile(r"^\s*➢\s*([A-Za-z ]+?):", re.M)


def tgl_iso(t):
    m = RE_TGL.search(t or "")
    return f"{int(m.group(3)):04d}-{BULAN[m.group(2).lower()]:02d}-{int(m.group(1)):02d}" if m else None


def rapikan_pdf(t):
    """teks pdftotext: buang zero-width, bullet jadi '- ', spasi depan dibuang."""
    t = t.replace("\u200b", "").replace("\u200e", "").replace("\f", "\n")
    return "\n".join(re.sub(r"^\s*[●•◦▪-]\s*", "- ", l).rstrip() if not l.strip().startswith("➢") else l.strip() for l in t.splitlines())


def laphar_banjir(teks):
    """Kejadian banjir dari teks Laporan Harian Dit. Koordalops: [{tgl_logbook, jenis_teks, kab, prov, mulai, kecamatan, desa_teks,
    kk_terdampak, orang_terdampak, kk_mengungsi, orang_mengungsi, kondisi}]. Hanya entri berjudul '... Banjir ... di Kab./Kota X, Provinsi Y'."""
    t = rapikan_pdf(teks)
    hari = tgl_iso(t[:600])
    kepala = list(RE_KEPALA.finditer(t))
    akhir_semua = [m.start() for m in re.finditer(r"^\s*\d+\.\s*Bencana", t, re.M)] + [len(t)]
    out = []
    for m in kepala:
        ujung = min(x for x in akhir_semua if x > m.start())
        isi = t[m.end():ujung]
        bag, pos = {}, list(RE_BAGIAN.finditer(isi)) + [None]
        for a, b in zip(pos, pos[1:]):
            bag[a.group(1).strip().lower()] = isi[a.end():b.start() if b else len(isi)].strip()
        lok, kor, kon = bag.get("lokasi", ""), bag.get("korban jiwa", ""), bag.get("kondisi mutakhir", "")
        kec = [re.sub(r"^-\s*(?:kec\.|kecamatan)\s*", "", l, flags=re.I).strip() for l in lok.splitlines() if re.match(r"^-\s*(?:kec\.|kecamatan)\s", l, re.I)]
        ter = re.search(r"(\d[\d.]*)\s*KK(?:\s*/\s*(\d[\d.]*)\s*jiwa)?[^\n]*terdampak", kor, re.I)
        ung = re.search(r"(\d[\d.]*)\s*KK(?:\s*/\s*(\d[\d.]*)\s*jiwa)?[^\n]*mengungsi", kor, re.I) or re.search(r"()(\d[\d.]*)\s*jiwa[^\n]*mengungsi", kor, re.I)
        # judul kecamatan di Lokasi berbentuk '- Kec. X': jadikan baris judul supaya rincian_desa mengenalinya
        lok_desa = re.sub(r"^-\s*((?:kec\.|kecamatan)\s)", r"\1", lok, flags=re.I | re.M)
        kor_desa = re.sub(r"^-\s*((?:kec\.|kecamatan)\s)", r"\1", kor, flags=re.I | re.M)
        kon_desa = re.sub(r"^-\s*((?:kec\.|kecamatan)\s)", r"\1", kon, flags=re.I | re.M)
        out.append({"tgl_logbook": hari, "jenis_teks": m.group(1).strip(), "kab": re.sub(r"\s+", " ", m.group(2).strip()), "prov": m.group(3).strip(),
                    "mulai": tgl_iso(bag.get("kronologis", "")), "kecamatan": kec, "desa_teks": [lok_desa, kor_desa, kon_desa],
                    "kk_terdampak": _bil(ter.group(1)) if ter else None, "orang_terdampak": _bil(ter.group(2)) if ter and ter.group(2) else None,
                    "kk_mengungsi": _bil(ung.group(1)) if ung and ung.group(1) else None, "orang_mengungsi": _bil(ung.group(2)) if ung and ung.group(2) else None,
                    "kondisi": re.sub(r"^-\s*", "", kon, flags=re.M),
                    **{f: bag.get(f, "") for f in ("upaya", "kebutuhan", "kendala")}})
    return out


def baca_pdf(path):
    return subprocess.run(["pdftotext", "-layout", path, "-"], capture_output=True, text=True, check=True).stdout


def satukan_laphar(kejadian, laporan, entri, kode_kab):
    """Entri laporan harian masuk ke kejadian logbook yang cocok (kab sama, mulai berselisih <= 3 hari, atau kejadian kab itu
    yang masih belum surut dan berkabar <= 7 hari), atau jadi kejadian baru LH-. Mengubah kejadian dan laporan di tempat."""
    kode_prov = {}
    for k in kejadian:
        for n, c in zip(k.get("prov") or [], k.get("prov_kode") or []):
            kode_prov.setdefault(n.lower(), c)
    for i, e in enumerate(entri):
        pk = kode_prov.get(e["prov"].lower())
        kode = (kode_kab({"kabkota": [e["kab"]], "prov_kode": [pk] if pk else []}) or [""])[0]
        if not kode:
            continue
        hari = dt.date.fromisoformat(e["tgl_logbook"])
        calon = [k for k in kejadian if k.get("jenis") == "banjir" and kode in (k.get("kab_kode") or kode_kab(k))]
        def dekat(k):
            a = k.get("tgl_kejadian") or k.get("pertama_dicatat")
            return a and e["mulai"] and abs((dt.date.fromisoformat(a) - dt.date.fromisoformat(e["mulai"])).days) <= 3
        def hidup(k):
            return k.get("terakhir_dicatat") and (hari - dt.date.fromisoformat(k["terakhir_dicatat"])).days <= 7 and not surut(k.get("kondisi_terakhir"))
        k = next((k for k in calon if dekat(k)), None) or next((k for k in sorted(calon, key=lambda k: k["terakhir_dicatat"], reverse=True) if hidup(k)), None)
        pk = kode[:2]   # provinsi dari kode kab: judul laporan kadang salah ketik ("Provinsi Timur")
        nama_prov = next((n for k_ in kejadian for n, c in zip(k_.get("prov") or [], k_.get("prov_kode") or []) if c == pk), e["prov"])
        if not k:
            k = {"id_kejadian": f"LH{e['tgl_logbook'][2:4]}-{e['tgl_logbook'][5:7]}{e['tgl_logbook'][8:]}{i:02d}", "jenis": "banjir", "kabkota": [e["kab"]],
                 "prov": [nama_prov], "prov_kode": [pk], "tgl_kejadian": e["mulai"], "pertama_dicatat": e["tgl_logbook"], "n_laporan": 0}
            kejadian.append(k)
        k["kab_kode"] = k.get("kab_kode") or [kode]
        if e["tgl_logbook"] >= (k.get("terakhir_dicatat") or ""):
            k.update({"terakhir_dicatat": e["tgl_logbook"], "kondisi_terakhir": e["kondisi"], "dampak_teks_terakhir": e["desa_teks"][1],
                      "kk_terdampak": e["kk_terdampak"], "orang_terdampak": e["orang_terdampak"], "kk_mengungsi": e["kk_mengungsi"],
                      "orang_mengungsi": e["orang_mengungsi"], "n_kec_total": len(e["kecamatan"]) or k.get("n_kec_total")})
        k["n_laporan"] = (k.get("n_laporan") or 0) + 1
        laporan.setdefault(k["id_kejadian"], []).append({"tgl_logbook": e["tgl_logbook"], "id_kejadian": k["id_kejadian"], "jenis": "banjir", "kecamatan": e["kecamatan"],
            "n_kec": len(e["kecamatan"]) or None, "kk_terdampak": e["kk_terdampak"], "orang_terdampak": e["orang_terdampak"], "kk_mengungsi": e["kk_mengungsi"],
            "orang_mengungsi": e["orang_mengungsi"], "dampak_teks": "\n".join(e["desa_teks"][:2]), "kondisi": e["kondisi"], "_desa_kondisi": e["desa_teks"][2],
            **{f: e.get(f, "") for f in ("upaya", "kebutuhan", "kendala")}})


def butir(t, maks=8, panjang=240):
    """Teks bebas logbook (upaya, pihak, kebutuhan, kendala) -> daftar baris bersih: tanpa penanda butir, tanpa ganda, dibatasi jumlah dan panjangnya."""
    out = []
    for l in str(t or "").splitlines():
        l = re.sub(r"^\s*(?:[-•●◦▪➢*]|\d+[.)])\s*", "", l).strip(" .;")
        if len(l) > 2 and l.lower() not in (x.lower() for x in out) and l.lower() not in ("-", "nihil", "tidak ada", "belum ada"):
            out.append(l if len(l) <= panjang else l[:panjang - 1].rstrip() + "…")
    return out[:maks]


def riwayat(laporan, bersih=lambda t: t):
    """Satu entri per hari logbook (laporan terakhir hari itu): angka terdampak dan mengungsi, kecamatan, tinggi, surut, kondisi."""
    hari = {}
    for r in sorted(laporan, key=lambda r: (r.get("tgl_logbook") or "", r.get("tgl_update") or "", r.get("jam_update") or "")):
        hari[r["tgl_logbook"]] = r
    out = []
    for tgl, r in sorted(hari.items()):
        kon = bersih(r.get("kondisi") or "")
        out.append({"tgl": tgl, "kk": angka(_n(r.get("kk_terdampak")), _n(r.get("kk"))), "jiwa": angka(_n(r.get("orang_terdampak")), _n(r.get("jiwa"))),
                    "kk_u": angka(_n(r.get("kk_mengungsi"))), "jiwa_u": angka(_n(r.get("orang_mengungsi")), _n(r.get("mengungsi"))),
                    "n_kec": _n(r.get("n_kec")), "n_desa": _n(r.get("n_desa")), "tinggi_cm": tinggi_cm(kon + " " + (r.get("dampak_teks") or "")),
                    "surut": surut(kon), "kondisi": bersih_kondisi(kon),
                    # desa hari itu, untuk histori per kecamatan di layar
                    "desa": rincian_desa(bersih((r.get("dampak_teks") or "") + "\n" + (r.get("_desa_kondisi") or r.get("kondisi") or ""))),
                    # tindakan hari itu: upaya penanganan, pihak terlibat, kebutuhan, kendala (layar Upaya penanganan dan Histori)
                    **{f: butir(bersih(r.get(f) or ""), 12 if f == "terlibat" else 8) for f in ("upaya", "terlibat", "kebutuhan", "kendala")}})
    return out


def _n(v):
    if isinstance(v, (int, float)):
        return v
    try:
        return float(str(v).replace(",", "."))
    except (TypeError, ValueError):
        return None


def daftar(v):
    if isinstance(v, list):
        return v
    try:
        return json.loads(str(v).replace("'", '"')) if v else []
    except ValueError:
        return []


# --------------------------------------------------------------- rakit
def angka(*v):
    for x in v:
        if isinstance(x, (int, float)) and x > 0:
            return int(x)
    return None


def baris(k, kode_kab, bersih):
    teks = bersih(k.get("kondisi_terakhir") or "")
    return {"id": k["id_kejadian"], "prov": (k["prov"] or [""])[0], "prov_kode": (k["prov_kode"] or [""])[0], "kab": k["kabkota"], "kab_kode": k.get("kab_kode") or kode_kab(k),
            "mulai": k["tgl_kejadian"] or k["pertama_dicatat"], "pertama": k["pertama_dicatat"], "terakhir": k["terakhir_dicatat"], "n_laporan": k["n_laporan"],
            "kk": angka(k.get("kk_terdampak"), k.get("kk")), "jiwa": angka(k.get("orang_terdampak"), k.get("jiwa")),
            "mengungsi": angka(k.get("orang_mengungsi"), k.get("mengungsi")), "kk_u": angka(k.get("kk_mengungsi")), "rumah_terendam": angka(k.get("rumah_terendam")),
            "n_kec": k.get("n_kec_total") or k.get("n_kec"), "n_desa": k.get("n_desa_total") or k.get("n_desa"),
            "tinggi_cm": tinggi_cm(teks + " " + (k.get("dampak_teks_terakhir") or "")), "surut": surut(teks), "kondisi": bersih_kondisi(teks)}


def rakit(kejadian, hari, kode_kab, bersih=lambda t: t, laporan=None):
    """laporan: {id_kejadian: [baris logbook harian]} untuk riwayat, kecamatan, dan desa (opsional)."""
    laporan = laporan or {}
    awal_pekan = (dt.date.fromisoformat(hari) - dt.timedelta(days=SEPEKAN)).isoformat()
    awal_buka = (dt.date.fromisoformat(hari) - dt.timedelta(days=BUKA_MAKS)).isoformat()
    out = []
    for k in kejadian:
        if k.get("jenis") != "banjir" or not k.get("kabkota") or not k.get("terakhir_dicatat") or k["terakhir_dicatat"] > hari:
            continue
        b = baris(k, kode_kab, bersih)
        # mulai > 30 hari lalu dibuang: entri status tanggap/transisi panjang (mis. Solok sejak 21 Sep berisi catatan rapat) bukan genangan
        if (b["mulai"] or "") >= awal_buka and (b["terakhir"] >= awal_pekan or not b["surut"]):
            lp = laporan.get(b["id"], [])
            kec = []
            for r in lp:
                for x in daftar(r.get("kecamatan")):
                    if x and x not in kec:
                        kec.append(x)
            b["kec"] = kec
            b["desa"] = rincian_desa(*[bersih((r.get("dampak_teks") or "") + "\n" + (r.get("_desa_kondisi") or r.get("kondisi") or "")) for r in sorted(lp, key=lambda r: r.get("tgl_logbook") or "")])
            b["riwayat"] = riwayat(lp, bersih)
            # desa harian yang teks hari itu tidak menyebut kecamatannya: ambil dari rincian gabungan
            kec_desa = {d["nama"].lower(): d["kec"] for d in b["desa"] if d["kec"]}
            for r in b["riwayat"]:
                for d in r["desa"]:
                    d["kec"] = d["kec"] or kec_desa.get(d["nama"].lower())
            # tindakan: tiap kolom dari laporan terakhir yang mengisinya (laporan harian PDF tidak memuat pihak terlibat); tanggal = upaya terakhir
            for f in ("upaya", "terlibat", "kebutuhan", "kendala"):
                b[f] = next((r[f] for r in reversed(b["riwayat"]) if r[f]), [])
            b["upaya_tgl"] = next((r["tgl"] for r in reversed(b["riwayat"]) if r["upaya"]), None)
            # angka baris = laporan harian terakhir yang mengisinya (rekap kejadian kadang tertinggal satu-dua hari)
            for f, g in (("kk", "kk"), ("jiwa", "jiwa"), ("kk_u", "kk_u"), ("mengungsi", "jiwa_u"), ("tinggi_cm", "tinggi_cm")):
                for r in reversed(b["riwayat"]):
                    if r[g] is not None:
                        b[f] = r[g]
                        break
            out.append(b)
    return sorted(out, key=lambda b: (b["prov_kode"], b["terakhir"]))


# --------------------------------------------------------------- bahan WA laporan harian (data/laporan-bnpb/harian-*/kerja-*/data.json)
# Laporan Kejadian Bencana Harian dibuat dari WA Koordalops (cut-off 07.00 WIB hari H, isinya laphar hari H-1). wa_harian.py
# sudah mengurainya ke data.json di git; pemilik 5 Nov 2026: tiap laporan harian dibuat, kondisi banjirnya ikut memperbarui
# Pantau Banjir. Dipakai dua jalur: sesudah rakit logbook (main) dan langsung di atas berkas R2 (--wa, mesin tanpa arsip logbook).
WA_GLOB = "data/laporan-bnpb/harian-*/kerja-*/data.json"
RE_KK_JIWA = re.compile(r"(\d[\d.]*)\s*KK(?:\s*/\s*(\d[\d.]*)\s*jiwa)?", re.I)


def wa_entri(d, kode_kab):
    """data.json satu laporan harian -> [{tgl, kab, kab_kode, prov_kode, baru, kk, jiwa, kk_u, jiwa_u, kondisi}] untuk kejadian berjenis banjir.
    tgl = hari laphar (H-1 dari tanggal laporan). Angka dari teks dampak/pengungsi; pengungsi yang 'sudah kembali' = tidak ada."""
    tgl = (dt.date.fromisoformat(d["hari"]) - dt.timedelta(days=1)).isoformat()
    out = []
    for k in d.get("kejadian", []):
        if k.get("jenis") != "banjir" or not k.get("lokasi"):
            continue
        kode = (kode_kab({"kabkota": [k["lokasi"]], "prov_kode": [k["prov"]]}) or [""])[0]
        if not kode:
            continue
        t = k.get("teks") or {}
        ter = RE_KK_JIWA.search(t.get("dampak") or "")
        pg = t.get("pengungsi") or ""
        pulang = bool(re.search(r"kembali|nihil", pg, re.I))
        ung = None if pulang else RE_KK_JIWA.search(pg)
        nama = k["lokasi"] if re.match(r"(Kab\.|Kota)\s", k["lokasi"]) else "Kab. " + k["lokasi"]
        out.append({"tgl": tgl, "kab": nama, "kab_kode": kode, "prov_kode": k["prov"], "baru": bool(k.get("baru")), "pulang": pulang,
                    "kk": _bil(ter.group(1)) if ter else None, "jiwa": _bil(ter.group(2)) if ter and ter.group(2) else None,
                    "kk_u": _bil(ung.group(1)) if ung else None, "jiwa_u": _bil(ung.group(2)) if ung and ung.group(2) else None,
                    "kondisi": (t.get("kondisi") or "").strip()})
    return out


def perbarui_wa(rows, entri, nama_prov=lambda kode: kode):
    """Entri WA masuk ke baris kab yang sama (kabar terakhir <= 14 hari sebelumnya, bukan kejadian baru) atau jadi baris baru WA-.
    Satu entri riwayat per tanggal: menjalankan ulang hari yang sama menimpa, bukan menambah. Mengubah rows di tempat."""
    for i, e in enumerate(entri):
        tgl, hari = e["tgl"], dt.date.fromisoformat(e["tgl"])
        tgls = lambda r: [x["tgl"] for x in r.get("riwayat", [])]
        calon = [r for r in rows if e["kab_kode"] in (r.get("kab_kode") or [])
                 and (tgl in tgls(r) or abs((hari - dt.date.fromisoformat(r["terakhir"])).days) <= 14)]
        sudah = [r for r in calon if tgl in tgls(r) and r["id"].startswith("WA")]   # jalan ulang: baris WA yang sudah memuat tanggal ini
        # kejadian baru: hanya baris yang mulainya berselisih <= 3 hari (logbook bisa sudah mencatatnya); pengkinian: baris kab itu yang masih hidup
        dekat = [r for r in calon if r.get("mulai") and abs((hari - dt.date.fromisoformat(r["mulai"])).days) <= 3] if e["baru"] else calon
        r = sudah[0] if sudah else max(dekat, key=lambda r: (not r.get("surut"), r["terakhir"]), default=None)
        if r is None and not e["baru"]:
            continue   # pengkinian kejadian lama di luar jendela layar (mis. status transisi Solok sejak Sep berisi rapat): tidak dibuka lagi
        if r is None:
            r = {"id": f"WA{tgl[2:4]}-{tgl[5:7]}{tgl[8:]}{i:02d}", "prov": nama_prov(e["prov_kode"]), "prov_kode": e["prov_kode"], "kab": [e["kab"]],
                 "kab_kode": [e["kab_kode"]], "mulai": tgl, "pertama": tgl, "terakhir": tgl, "n_laporan": 0, "rumah_terendam": None, "n_kec": None,
                 "n_desa": None, "kec": [], "desa": [], "riwayat": [], "upaya": [], "terlibat": [], "kebutuhan": [], "kendala": [], "upaya_tgl": None}
            rows.append(r)
        kon = e["kondisi"]
        h = {"tgl": tgl, "kk": e["kk"], "jiwa": e["jiwa"], "kk_u": e["kk_u"], "jiwa_u": e["jiwa_u"], "n_kec": None, "n_desa": None,
             "tinggi_cm": tinggi_cm(kon), "surut": surut(kon), "kondisi": bersih_kondisi(kon), "desa": rincian_desa(kon),
             "upaya": [], "terlibat": [], "kebutuhan": [], "kendala": []}
        lama = [x for x in r["riwayat"] if x["tgl"] != tgl]
        r["n_laporan"] = (r.get("n_laporan") or 0) + (len(lama) == len(r["riwayat"]))
        r["riwayat"] = sorted(lama + [h], key=lambda x: x["tgl"])
        if tgl >= r["terakhir"]:
            # angka kosong di WA tidak menghapus angka logbook yang sudah ada
            r.update({"terakhir": tgl, "surut": h["surut"], "kondisi": h["kondisi"], "tinggi_cm": h["tinggi_cm"] or r.get("tinggi_cm"),
                      **{f: h[g] for f, g in (("kk", "kk"), ("jiwa", "jiwa"), ("kk_u", "kk_u"), ("mengungsi", "jiwa_u")) if h[g] is not None}})
            # pengungsi sudah kembali / nihil: angka pengungsi lama tidak lagi berlaku (teks kosong atau "-" = tidak tahu, angka lama tetap)
            if e.get("pulang"):
                r["kk_u"] = r["mengungsi"] = None
        r.setdefault("kk_u", None); r.setdefault("mengungsi", None); r.setdefault("kk", None); r.setdefault("jiwa", None)
    return rows


def saring(rows, hari):
    """jendela layar yang sama dengan rakit(): mulai <= 30 hari, dan berkabar sepekan terakhir atau belum surut."""
    awal_pekan = (dt.date.fromisoformat(hari) - dt.timedelta(days=SEPEKAN)).isoformat()
    awal_buka = (dt.date.fromisoformat(hari) - dt.timedelta(days=BUKA_MAKS)).isoformat()
    return sorted([b for b in rows if (b["mulai"] or "") >= awal_buka and b["terakhir"] <= hari and (b["terakhir"] >= awal_pekan or not b["surut"])],
                  key=lambda b: (b["prov_kode"], b["terakhir"]))


def entri_wa_semua(kode_kab, sesudah=""):
    """semua entri banjir dari data.json laporan harian di git yang hari laphar-nya > sesudah, urut tanggal."""
    out = []
    for f in sorted(glob.glob(os.path.join(AKAR, WA_GLOB))):
        out += [e for e in wa_entri(json.load(open(f, encoding="utf-8")), kode_kab) if e["tgl"] > sesudah]
    return sorted(out, key=lambda e: e["tgl"])


def tulis(isi, unggah):
    os.makedirs(os.path.dirname(KELUAR), exist_ok=True)
    with open(KELUAR, "w", encoding="utf-8") as f:
        json.dump(isi, f, ensure_ascii=False, separators=(",", ":"))
    if unggah:
        subprocess.run(["npx", "--yes", "wrangler@4.42.0", "r2", "object", "put", KUNCI_R2, "--file", KELUAR,
                        "--content-type", "application/json", "--remote"], cwd=AKAR, check=True)


def main_wa(o, LB):
    """Mesin tanpa arsip logbook: ambil berkas R2 yang tayang, tempel bahan WA laporan harian, tulis (dan unggah) lagi."""
    r = subprocess.run(["npx", "--yes", "wrangler@4.42.0", "r2", "object", "get", KUNCI_R2, "--remote", "--pipe"], cwd=AKAR, capture_output=True, text=True, check=True)
    d = json.loads(r.stdout)
    rows, prov = d["kejadian"], {x["prov_kode"]: x["prov"] for x in d["kejadian"]}
    entri = entri_wa_semua(LB.kode_kab, (dt.date.fromisoformat(d["hari"]) - dt.timedelta(days=BUKA_MAKS)).isoformat())
    perbarui_wa(rows, entri, lambda k: prov.get(k, k))
    hari = max([d["hari"]] + [e["tgl"] for e in entri])
    rows = saring(rows, hari)
    kini = dt.datetime.now(dt.timezone(dt.timedelta(hours=7))).isoformat(timespec="minutes")
    tulis({**d, "dibuat": kini, "hari": hari, "sumber": "Logbook Pusdalops BNPB + WA Koordalops", "kejadian": rows}, o.unggah)
    print(f"WA: {len(entri)} entri banjir, hari {hari}: {sum(not r['surut'] for r in rows)} belum surut dari {len(rows)} -> {os.path.relpath(KELUAR, AKAR)}")


def main():
    a = argparse.ArgumentParser()
    a.add_argument("--wa", action="store_true", help="tanpa arsip logbook: perbarui berkas R2 dengan bahan WA laporan harian di git")
    a.add_argument("--hari", help="hari logbook terakhir yang dipakai (bawaan: paling akhir di arsip)")
    a.add_argument("--unggah", action="store_true", help="unggah ke R2 (wrangler, --remote)")
    a.add_argument("--uji", action="store_true")
    o = a.parse_args()
    if o.uji:
        return uji()
    LB = _muat("logbook_bersih", "scripts/data/logbook_bersih.py")
    LP = _muat("logbook_pusdalops", "scripts/data/logbook_pusdalops.py")
    th = sorted(glob.glob(os.path.join(AKAR, "data/raw/logbook/arsip/20??/kejadian.jsonl")))[-2:]   # tahun ini + lalu (awal Januari)
    if o.wa or not th:   # arsip logbook tidak ada di mesin ini: perbarui berkas yang tayang dengan bahan WA saja
        return main_wa(o, LB)
    kejadian = [json.loads(l) for f in th for l in open(f, encoding="utf-8")]
    laporan = {}
    for f in [os.path.join(os.path.dirname(x), "baris.jsonl") for x in th]:
        if os.path.exists(f):
            for l in open(f, encoding="utf-8"):
                r = json.loads(l)
                if r.get("jenis") == "banjir" and r.get("id_kejadian"):
                    laporan.setdefault(r["id_kejadian"], []).append(r)

    # laporan harian PDF Dit. Koordalops yang lebih baru dari logbook .docx: data/raw/dalops/laphar/*.pdf (ikut .gitignore)
    for f in sorted(glob.glob(os.path.join(os.path.dirname(KELUAR), "laphar", "*.pdf"))):
        e = laphar_banjir(baca_pdf(f))
        satukan_laphar(kejadian, laporan, e, LB.kode_kab)
        print(f"laporan harian {os.path.basename(f)}: {len(e)} entri banjir")
    hari = o.hari or max(k["terakhir_dicatat"] for k in kejadian if k.get("terakhir_dicatat"))
    rows = rakit(kejadian, hari, LB.kode_kab, LP.bersih, laporan)
    # bahan WA laporan harian yang lebih baru dari logbook (data.json di git) menimpa kondisi kab yang sama
    entri = [e for e in entri_wa_semua(LB.kode_kab, hari) if not o.hari]
    prov = {x["prov_kode"]: x["prov"] for x in rows}
    perbarui_wa(rows, entri, lambda k: prov.get(k, k))
    hari = max([hari] + [e["tgl"] for e in entri])
    rows = saring(rows, hari)
    kini = dt.datetime.now(dt.timezone(dt.timedelta(hours=7))).isoformat(timespec="minutes")
    tulis({"v": 1, "dibuat": kini, "hari": hari, "sumber": "Logbook Pusdalops BNPB" + (" + WA Koordalops" if entri else ""), "kejadian": rows}, o.unggah)
    awal = (dt.date.fromisoformat(hari) - dt.timedelta(days=SEPEKAN)).isoformat()
    pekan = [r for r in rows if r["terakhir"] >= awal]
    print(f"hari {hari}: {len(pekan)} laporan sepekan ({len(entri)} entri WA), {sum(not r['surut'] for r in rows)} belum surut, "
          f"{sum(r['surut'] for r in pekan)} sudah surut -> {os.path.relpath(KELUAR, AKAR)}")


def uji():
    # surut: kalimat nyata logbook 24 Okt-1 Nov 2026, dicocokkan dengan deck "Situasi Banjir Sepekan" 2 Nov 2026
    assert surut("Banjir sudah surut, namun untuk saat ini cuaca masih hujan sedang dilakukan pembersihan")   # Tapanuli Tengah
    assert surut("Banjir sudah surut")   # Labuhanbatu
    assert surut("Saat ini kondisi banjir sudah surut")   # Asahan
    assert surut("Banjir sudah surut di sebagian besar wilayah. masih dilakukan pendataan")   # Deli Serdang
    assert not surut("Banjir belum surut Dilaporkan 8 KK masih mengungsi di Balai Desa")   # Aceh Tengah
    assert not surut("Hujan Banjir Berangsur surut Beberapa rumah masih masih terendam banjir")   # Aceh Barat
    assert not surut("Air perlahan mulai surut di beberapa titik. Genangan kecil dan lumpur masih ada")   # Pidie Jaya
    assert not surut("Air mulai surut di Jalan Lintas, namun masih ada desa yang tergenang")   # Subulussalam
    assert not surut("Air masih menggenangi pemukiman masyarakat.")   # Nagan Raya
    assert not surut("Air belum surut")   # Aceh Tenggara
    assert not surut("Lokasi terdampak masih dalam penanganan oleh Pemerintah setempat")   # Dairi: tak jelas = belum
    assert not surut("")
    # tinggi air
    assert tinggi_cm("Air terpantau ada kenaikan dengan ketinggian air di badan jalan 10 s/d 15 cm") == [10, 15]
    assert tinggi_cm("ketinggian air 50 cm") == [50, 50]
    assert tinggi_cm("genangan 30-60 cm di permukiman") == [30, 60]
    assert tinggi_cm("tinggi muka air 1,5 meter") == [150, 150]
    assert tinggi_cm("jalan sepanjang 200 m rusak") is None   # bukan tinggi air
    assert tinggi_cm("") is None
    assert bersih_kondisi("Sabtu, 31 Oktober 2026 Air mulai surut") == "Air mulai surut"
    # rakit: jendela sepekan + belum surut 30 hari
    kode = lambda k: ["11|" + k["kabkota"][0]]
    K = lambda i, t, kon, mulai="2026-10-20": {"id_kejadian": i, "jenis": "banjir", "kabkota": ["Kab. X" + i], "prov": ["Aceh"], "prov_kode": ["11"],
                                               "tgl_kejadian": mulai, "pertama_dicatat": mulai, "terakhir_dicatat": t, "n_laporan": 1, "kondisi_terakhir": kon}
    r = rakit([K("a", "2026-11-01", "sudah surut"), K("b", "2026-10-20", "belum surut"), K("c", "2026-10-20", "sudah surut"),
               K("d", "2026-09-01", "belum surut", "2026-09-01"), dict(K("e", "2026-11-01", "x"), jenis="longsor"), K("f", "2026-11-02", "x")], "2026-11-01", kode)
    assert [x["id"] for x in r] == ["b", "a"], r   # c lama dan surut, d mulai >30 hari, e bukan banjir, f sesudah hari
    assert r[1]["surut"] and not r[0]["surut"] and r[0]["kk"] is None
    # rincian desa: kalimat nyata logbook Okt 2026
    d = rincian_desa("Korban Jiwa:\n± 60 KK / 232 jiwa terdampak, dengan rincian:\nGp. Lhok Raya: 30 KK / 112 jiwa\nGp. Cot Bayu: 30 KK / 120 jiwa",
                     "Gampong Lhok Raya: Air terpantau sudah mulai surut dengan ketinggian air di jalan lintas Gampong 30 s/d 40 cm.")
    assert [(x["nama"], x["kk"], x["jiwa"], x["tinggi_cm"]) for x in d] == [("Lhok Raya", 30, 112, [30, 40]), ("Cot Bayu", 30, 120, None)], d
    d = rincian_desa("dengan rincian:\nKecamatan Sultan Daulat\nGampong : Jabi-Jabi (292 KK / Jiwa dalam pendataan)\nKec. Rundeng\nGampong : Suak Jampak (102 KK / jiwa dalam pendataan)")
    assert [(x["nama"], x["kec"], x["kk"], x["jiwa"]) for x in d] == [("Jabi-Jabi", "Sultan Daulat", 292, None), ("Suak Jampak", "Rundeng", 102, None)], d
    assert rincian_desa("8 KK mengungsi ke Balai Desa") == []
    assert [(x["nama"], x["kec"]) for x in rincian_desa("akses Jalan Menuju Gp. Sikundo masih sulit, Gp. Napai Kec. Woyla Barat dan sekitarnya sudah mulai surut")] == [("Sikundo", None), ("Napai", "Woyla Barat")]
    assert [x["nama"] for x in rincian_desa("Jalan nasional (Desa Kuning) dan rumah warga masih tergenang air.")] == ["Kuning"]
    rw = riwayat([{"tgl_logbook": "2026-10-29", "kk_terdampak": "60", "orang_terdampak": "232", "kk_mengungsi": "75", "orang_mengungsi": "264", "n_kec": "2", "kondisi": "air 30 s/d 40 cm, belum surut"},
                  {"tgl_logbook": "2026-10-28", "kk_terdampak": "30", "kondisi": "masih tergenang"}])
    assert [(x["tgl"], x["kk"], x["jiwa_u"], x["tinggi_cm"]) for x in rw] == [("2026-10-28", 30, None, None), ("2026-10-29", 60, 264, [30, 40])], rw
    assert butir("- TRC melakukan asesmen\n● Pendataan.\n- TRC melakukan asesmen\nNihil") == ["TRC melakukan asesmen", "Pendataan"]
    rw = riwayat([{"tgl_logbook": "2026-10-29", "dampak_teks": "Kec. Trumon\nGp. Padang Harapan: 25 KK / 120 jiwa", "kondisi": "belum surut"}])
    assert [(x["nama"], x["kec"], x["kk"]) for x in rw[0]["desa"]] == [("Padang Harapan", "Trumon", 25)], rw
    # laporan harian PDF: potongan nyata 2 Nov 2026 (Aceh Selatan), bentuk keluaran pdftotext -layout
    lh = laphar_banjir("""LAPORAN HARIAN
                     Senin, 02 November 2026
7.\u200b Bencana Alam Banjir di Kab. Aceh Selatan, Provinsi Aceh
   \u27a2\u200b Update: Senin, 02 November 2026 pukul 19.30 WIB
   \u27a2\u200b Kronologis: banjir luapan di beberapa Gampong pada hari Rabu 28 Oktober 2026 pukul 10.45 WIB
   \u27a2\u200b Lokasi: (2 Kecamatan / 3 Gampong)
       \u25cf\u200b Kec. Trumon Tengah
          -\u200b Gp. Lhok Raya
       \u25cf\u200b Kec. Trumon
          -\u200b Gp. Padang Harapan
   \u27a2\u200b Korban Jiwa:
       \u25cf\u200b \u00b1 222 KK / 794 jiwa terdampak (pendataan), dengan rincian:
           -\u200b Gp. Lhok Raya: 159 KK / 560 jiwa
       \u25cf\u200b 58 KK / 205 Jiwa mengungsi (pendataan), dengan rincian:
           -\u200b Gp. Lhok Raya di Kompi Brimob 40 KK / 133 jiwa pengungsi
   \u27a2\u200b Kondisi Mutakhir:
     Senin, 02 November 2026
     \u25cf\u200b Kecamatan Trumon
         -\u200b Gampong Padang Harapan: Air mengalami kenaikan menjadi \u00b1 30-60 cm, rumah warga tergenang air \u00b1 45-50 cm.
   \u27a2\u200b Dokumentasi: Link
8.\u200b Bencana Alam Tanah longsor di Kab. Lumajang, Provinsi Jawa Timur
""")
    assert len(lh) == 1 and lh[0]["tgl_logbook"] == "2026-11-02" and lh[0]["mulai"] == "2026-10-28", lh
    assert (lh[0]["kab"], lh[0]["kecamatan"], lh[0]["kk_terdampak"], lh[0]["orang_terdampak"], lh[0]["kk_mengungsi"], lh[0]["orang_mengungsi"]) == \
        ("Kab. Aceh Selatan", ["Trumon Tengah", "Trumon"], 222, 794, 58, 205), lh[0]
    d = {x["nama"]: (x["kec"], x["kk"], x["jiwa"], x["tinggi_cm"]) for x in rincian_desa(*lh[0]["desa_teks"])}
    assert d == {"Lhok Raya": ("Trumon Tengah", 159, 560, None), "Padang Harapan": ("Trumon", None, None, [30, 60])}, d
    # bahan WA laporan harian 051126 (data.json, kalimat nyata) -> baris layar
    kk = lambda k: [f"{k['prov_kode'][0]}|{k['kabkota'][0]}"]
    wa = wa_entri({"hari": "2026-11-05", "kejadian": [
        {"jenis": "banjir", "prov": "11", "lokasi": "Aceh Selatan", "baru": False, "teks": {"dampak": "* Korban Jiwa ; ± 222 KK / 794 jiwa terdampak (pendataan)",
         "kondisi": "Air perlahan surut menjadi ± 10-35 cm. Di Gampong Cot Bayu air perlahan surut, rumah warga tergenang air ± 10 s/d 15 cm.", "pengungsi": "56 KK / 196 Jiwa mengungsi (pendataan)"}},
        {"jenis": "banjir", "prov": "11", "lokasi": "Kota Subulussalam", "baru": False, "teks": {"dampak": "* Korban Jiwa ; ± 2.255  KK  terdampak (pendataan)",
         "kondisi": "Banjir sudah surut", "pengungsi": "32 KK mengungsi (sudah kembali kerumah masing-masing)"}},
        {"jenis": "banjir", "prov": "35", "lokasi": "Lumajang", "baru": True, "teks": {"dampak": "* Korban Jiwa ; ± 1.417 KK terdampak", "kondisi": "masih dalam penanganan", "pengungsi": "nihil"}},
        {"jenis": "longsor", "prov": "11", "lokasi": "Gayo Lues", "teks": {}}]}, kk)
    assert [(e["tgl"], e["kab"], e["kk"], e["jiwa"], e["kk_u"], e["jiwa_u"], e["pulang"]) for e in wa] == [
        ("2026-11-04", "Kab. Aceh Selatan", 222, 794, 56, 196, False), ("2026-11-04", "Kota Subulussalam", 2255, None, None, None, True),
        ("2026-11-04", "Kab. Lumajang", 1417, None, None, None, True)], wa
    B = lambda i, kab, t, srt, **x: {"id": i, "prov": "Aceh", "prov_kode": kab[:2], "kab": ["Kab. X"], "kab_kode": [kab], "mulai": "2026-10-28", "pertama": "2026-10-28",
                                     "terakhir": t, "n_laporan": 3, "kk": 100, "jiwa": 300, "kk_u": 40, "mengungsi": 120, "surut": srt, "kondisi": "x", "riwayat": [], **x}
    rows = [B("LB1", "11|Aceh Selatan", "2026-11-02", False), B("LB2", "11|Kota Subulussalam", "2026-11-02", False), B("LB3", "35|Lumajang", "2026-11-02", False)]
    perbarui_wa(rows, wa)
    sel, sub = rows[0], rows[1]
    assert (sel["terakhir"], sel["surut"], sel["kk"], sel["mengungsi"], sel["tinggi_cm"], sel["n_laporan"]) == ("2026-11-04", False, 222, 196, [10, 35], 4), sel
    assert sub["surut"] and sub["kk"] == 2255 and sub["jiwa"] == 300 and sub["mengungsi"] is None, sub   # jiwa tak disebut WA: angka lama tetap; pengungsi pulang: kosong
    assert len(rows) == 4 and rows[3]["id"].startswith("WA26-1104") and rows[2]["terakhir"] == "2026-11-02", rows   # kejadian baru Lumajang = baris baru
    perbarui_wa(rows, wa)   # jalan ulang hari yang sama tidak menambah riwayat atau baris
    assert len(rows) == 4 and len(sel["riwayat"]) == 1 and sel["n_laporan"] == 4 and len(rows[3]["riwayat"]) == 1, rows
    assert [r["id"] for r in saring(rows + [B("LB9", "11|Aceh Utara", "2026-10-20", True)], "2026-11-04")] == ["LB1", "LB2", "LB3", "WA26-110402"]
    # pengkinian kab yang tak punya baris hidup (Solok: status transisi sejak Sep, isinya rapat) tidak membuat baris baru
    solok = dict(wa[0], kab="Kab. Solok", kab_kode="13|Solok", prov_kode="13", kondisi="Rapat internalisasi Renduk bersama BAPENAS")
    assert len(perbarui_wa(rows, [solok])) == 4
    # kejadian baru yang sudah tercatat logbook (mulai berselisih <= 3 hari) masuk ke baris logbook itu
    r2 = [B("LB4", "11|Aceh Barat", "2026-11-02", False, mulai="2026-11-01")]
    perbarui_wa(r2, [dict(wa[0], kab_kode="11|Aceh Barat", tgl="2026-11-01", baru=True)])
    assert len(r2) == 1 and r2[0]["riwayat"][0]["tgl"] == "2026-11-01" and r2[0]["terakhir"] == "2026-11-02", r2
    assert not surut("Air sudah mulai surut, genangan kecil dan lumpur masih ada, Infrastruktur rusak")   # Pidie Jaya, WA 5 Nov
    print("uji dalops_banjir: lulus")


if __name__ == "__main__":
    main()
