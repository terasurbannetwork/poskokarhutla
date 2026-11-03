#!/usr/bin/env python3
"""Rekap operasi udara 2026 (patroli + waterbombing per kontrak pesawat) -> public/data/operasi/rekap_udara.json.

Sumber: 4 PDF rekap BNPB (Dit. Penanganan Darurat Wilayah I/II/III + rekap jam terbang akumulatif 25 Okt 2026).
  python3 scripts/data/rekap_udara.py bangun <dir-pdf>   # pdftotext -> .txt, lalu JSON
  python3 scripts/data/rekap_udara.py uji                # swa-uji: jumlah hitung == baris Subtotal/Total PDF

Ketergantungan: `pdftotext` (poppler) HANYA untuk `bangun`. Teks dok 1-3 di-commit di
data/kajian-bnpb/operasi/rekap_udara/doc{1,2,3}.txt sehingga `uji` jalan tanpa PDF.
Dok 4 memuat nama PIC dan nomor HP (data pribadi, repo publik): teksnya TIDAK pernah ditulis ke
disk repo; hanya baris registrasi/jam/sortie yang diambil, kolom PIC/NO HP tak dibaca.

Keputusan data (lihat catatan di JSON):
 - Dok 2 (Sumsel/Jambi) jam = DESIMAL jam ("104.02" = 104,02 jam, bukan 104 jam 02 mnt): nilai
   seperti 103.96, 4.67, 24.83 (>59) mustahil sebagai menit, dan jumlahnya cocok dengan Subtotal
   PDF dalam sentijam (1 sentijam = 36 detik). Dok 1/3 = J:MM(:SS).
 - Dok 3 kolom "liter" bukan liter (rasio per jatuhan 3-27, bukan ~4000): disimpan sebagai
   liter_cetak, liter=null.
 - Tanggal tunggal ("5 September 2026") = tanggal MULAI; selesai null, berjalan false.
 - Baris kontrak kosong (Genesa kontrak 6, tanpa periode/jam) dibuang.
"""
import datetime as dt, json, os, re, subprocess, sys

AKAR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
TXT = os.path.join(AKAR, "data/kajian-bnpb/operasi/rekap_udara")
KELUAR = os.path.join(AKAR, "public/data/operasi/rekap_udara.json")
PROV = {"RIAU": "14", "JAMBI": "15", "SUMATERA SELATAN": "16", "LAMPUNG": "18",
        "KALIMANTAN BARAT": "61", "KALIMANTAN TENGAH": "62", "KALIMANTAN SELATAN": "63"}
DOK = {1: ("Rekapitulasi Patroli Udara dan Waterbombing PDW 1 Wilayah Riau & Kalteng", "PDW 1"),
       2: ("Rekapitulasi Operasi Udara (Patroli dan WB) Sumsel Jambi", "Sumsel Jambi"),
       3: ("Patroli Udara dan Waterbombing PDW 3 Wilayah Kalbar dan Kalsel", "PDW 3"),
       4: ("Rekap Jam Terbang Heli Patroli dan WB akumulatif s.d. 25 Oktober 2026", "REKAP JAM TERBANG")}
BULAN = {"JAN": 1, "FEB": 2, "MAR": 3, "APR": 4, "MEI": 5, "JUN": 6, "JUL": 7, "AGU": 8, "SEP": 9, "OKT": 10, "NOV": 11, "DES": 12}
ALIAS = {"UR-SCM": "UR-CSM"}  # salah ketik dok 4; dok 1 dan op_armada: UR-CSM


# ---------- util ----------
def reg(s):
    s = re.sub(r"\s*-\s*", "-", s.strip().upper())
    if "-" not in s:
        m = re.match(r"(PK|VH|VN|UR|RA|HA|ZK)([A-Z0-9]+)$", s)
        if m:
            s = m.group(1) + "-" + m.group(2)
    return ALIAS.get(s, s)


def detik(tok, desimal=False):
    """'9:25:00' | '4:36' | '104.02' (desimal) -> detik; '-'/kosong -> None."""
    tok = tok.strip()
    if tok in ("", "-"):
        return None
    if desimal:
        tok = tok.replace(":", ".")  # '24:83' di dok 2 = salah ketik titik
        return round(float(tok) * 100) * 36
    p = [int(x) for x in tok.split(":")]
    return p[0] * 3600 + p[1] * 60 + (p[2] if len(p) > 2 else 0)


def angka(tok):
    tok = tok.strip()
    return None if tok in ("", "-") else int(re.sub(r"[.,]", "", tok))


def menit(sec):
    if sec is None:
        return None
    m = round(sec / 60, 2)
    return int(m) if m == int(m) else m


def penyedia(s):
    s = re.sub(r"\(.*?\)", "", s)
    s = re.sub(r"\bKontrak\s*\d+\b", "", s, flags=re.I)
    s = re.sub(r"^PT[.,]?\s*", "PT. ", s.strip())
    return re.sub(r"\s+", " ", s).strip()


def periode(teks):
    """-> (mulai, selesai, berjalan). Tanggal tunggal = mulai."""
    if not teks:
        return None, None, False
    t = teks.upper()
    jalan = "SEKARANG" in t
    t = t.replace("SEKARANG", "")
    tahun = (re.findall(r"\b(20\d\d)\b", t) or ["2026"])[0]
    t = re.sub(r"\b20\d\d\b", " ", t)
    it = [[int(d), BULAN[b[:3]] if b else None] for d, b in re.findall(r"(?<!\d)(\d{1,2})(?!\d)\s*([A-Z]*)", t)]
    for i in range(len(it) - 2, -1, -1):  # hari tanpa bulan ikut bulan berikutnya
        if it[i][1] is None:
            it[i][1] = it[i + 1][1]
    tgl = [dt.date(int(tahun), m, d).isoformat() for d, m in it if m]
    return (tgl[0] if tgl else None), (tgl[1] if len(tgl) > 1 and not jalan else None), jalan


# Selisih BAWAAN PDF: jumlah baris != baris Subtotal/Total PDF-nya sendiri. Nilai = hitung - PDF (detik).
# Uji lulus hanya bila selisihnya persis ini; selisih lain = gagal. Sebab (diselidiki lewat kombinasi bagian):
#  - Dok 1 Subtotal tak memuat baris yang ditambah belakangan (mis. N5193Y k5, N4875A k4, RDPL-34194 k3-4,
#    UR-CSN k1, UR-CSM k2 di kolom operasi; PK-FPA k1/k3, PK-ZGK k1, PK-WSD, PK-FBH k2 di kolom mob).
#    Baris Total PDF = jumlah Subtotal-nya (lulus), jadi Total ikut kurang.
#  - Dok 2 Sumsel: mob "24:83" (UH-60A VH-UHG k4) teks salah ketik, tak ikut Subtotal PDF (24,83 jam = 89388 dtk).
#  - Dok 3 Kalsel: Subtotal operasi lebih 24:00:00 persis dari baris; PK-RTQ k2 tercetak "21:47" kemungkinan
#    sel durasi 45:47 yang tampil mod 24 (format h:mm). Tidak dikoreksi: nilai tercetak dipertahankan.
BAWAAN = {("dok1 prov=14 jenis=patroli", "mob"): 127380, ("dok1 prov=14 jenis=wb", "op"): 746820,
          ("dok1 prov=62 jenis=patroli", "mob"): 13080, ("dok1 prov=62 jenis=wb", "op"): 57300,
          ("dok1 TOTAL", "mob"): 140460, ("dok1 TOTAL", "op"): 804120,
          ("dok2 prov=16 jenis=patroli+wb", "mob"): 89388,
          ("dok3 prov=63 jenis=patroli+wb", "op"): -86400, ("dok3 TOTAL", "op"): -86400}


def baris(fn):
    with open(os.path.join(TXT, fn), encoding="utf-8") as f:
        return f.read().split("\n")


def kosong_ke_nol(*a):
    return sum(x or 0 for x in a)


# ---------- dok 1 ----------
def dok1(L):
    rows, sub, tot = [], [], None
    prov = jenis = None
    i = 0
    while i < len(L):
        s = L[i].strip()
        if s.startswith("PROVINSI "):
            prov = PROV[s[9:].strip()]
        elif s == "PATROLI UDARA":
            jenis = "patroli"
        elif s == "WATERBOMBING":
            jenis = "wb"
        elif s.startswith("Subtotal"):
            n = L[i].split("Subtotal")[1]
            tk = re.findall(r"[\d:.]+", n.split("Operasi Udara")[-1].replace("Water Bombing", "").replace("Patroli", ""))
            sub.append(dict(prov=prov, jenis=jenis, mob=detik(tk[0]), op=detik(tk[1]), sortie=int(tk[2]),
                            wb=angka(tk[3]) if len(tk) > 3 else 0, liter=angka(tk[4]) if len(tk) > 4 else 0))
        elif s.startswith("Total"):
            tk = s.split()[1:]
            tot = dict(mob=detik(tk[0]), op=detik(tk[1]), sortie=int(tk[2]), wb=angka(tk[3]), liter=angka(tk[4]))
        elif re.match(r"\d+\s{2,}\S", L[i].strip()) and jenis and "Karhutla" in L[i]:
            blk = [L[i]]
            j = i + 1
            while j < len(L) and L[j].strip() and not re.match(r"\s*\d+\s{2,}\S", L[j]) and not L[j].strip().startswith("Subtotal"):
                blk.append(L[j]); j += 1
            r = d1_baris(blk, prov, jenis)
            if r:
                rows.append(r)
            i = j - 1
        i += 1
    return rows, sub, tot


def d1_baris(blk, prov, jenis):
    kiri, kanan = re.split(r"Karhutla", blk[0], 1)
    m = re.match(r"\s*\d+\s+(.*?)\s*(Riau|Kalimantan Tengah)\s*$", kiri)
    tengah = m.group(1)
    nama = ""
    if tengah.startswith("PT"):
        nama, per = re.split(r"\s{2,}", tengah, 1) if re.search(r"\s{2,}", tengah) else (tengah, "")
    else:
        per = tengah
    ekstra_t, ekstra_i = [], []
    for ln in blk[1:]:
        for seg in re.split(r"\s{2,}", ln.strip()):
            if seg.startswith("PT"):
                nama = nama or seg
            elif ":" in seg:
                ekstra_t.append(seg)
            elif re.fullmatch(r"\d+", seg):
                ekstra_i.append(seg)
    f = re.split(r"\s{2,}", kanan.strip())
    tk = " ".join(f[3:]).split() if len(f) >= 3 and re.fullmatch(r"\d+", f[2]) else []
    if len(f) < 3 or not re.fullmatch(r"\d+", f[2]):
        return None  # baris kontrak kosong
    tipe, rg, kontrak = f[0], reg(f[1]), int(f[2])
    t = [x for x in tk if ":" in x] + []
    ang = [x for x in tk if ":" not in x]
    if not per.strip() and not t and not ekstra_t:
        return None
    if len(t) == 2:
        mob, op = detik(t[0]), detik(t[1])
    else:
        op = detik(t[0]) if t else None
        mob = detik(ekstra_t[0]) if ekstra_t else None
    if jenis == "patroli":
        sortie, wb, lit = int((ang or ekstra_i or [0])[0]), None, None
    else:
        if len(ang) == 3:
            sortie, wb, lit = int(ang[0]), angka(ang[1]), angka(ang[2])
        else:
            sortie, wb, lit = int(ekstra_i[0]) if ekstra_i else None, angka(ang[0]), angka(ang[1])
    return dict(registrasi=rg, tipe=tipe, penyedia=penyedia(nama), prov=prov, jenis=jenis, kontrak_ke=kontrak,
                periode_teks=re.sub(r"\s+", " ", per).strip() or None, mob=mob, op=op, sortie=sortie, wb=wb, liter=lit, dok=1)


# ---------- dok 2 & 3 ----------
def dok23(L, dok):
    des = dok == 2
    rows, sub, tot = [], [], None
    prov = jenis = None
    for i, ln in enumerate(L):
        s = ln.strip()
        if s.startswith("PROVINSI "):
            prov = PROV[s[9:].strip()]
        elif s == "PATROLI UDARA":
            jenis = "patroli"
        elif s == "WATERBOMBING":
            jenis = "wb"
        elif s.startswith("Subtotal"):
            for k in L[i + 1:i + 4]:
                tk = k.split()
                if tk and all(re.fullmatch(r"[\d:.,-]+", x) for x in tk):
                    sub.append(dict(prov=prov, jenis=None, mob=detik(tk[0], des), op=detik(tk[1], des),
                                    sortie=int(tk[2]), wb=angka(tk[3]), liter=angka(tk[4])))
                    break
        elif s.startswith("Total"):
            tk = s.split()[1:]
            tot = dict(mob=None if des else detik(tk[0]), op=None if des else detik(tk[1]),
                       sortie=int(tk[-3]), wb=angka(tk[-2]), liter=angka(tk[-1]))
        else:
            m = re.match(r"\s*(\d+)\s+(PT\b.*)$", ln)
            if not m or not jenis:
                continue
            f = re.split(r"\s{2,}", m.group(2).strip())
            if f[1].upper() in PROV:
                f.insert(1, "")
            nama, per, wil, _, tipe, rg, kontrak = f[:7]
            n = f[7:]
            if jenis == "patroli":
                mob, op, sortie, wb, lit = (detik(n[0], des), detik(n[1], des), int(n[2]), None, None) if len(n) == 3 \
                    else (None, detik(n[0], des), int(n[1]), None, None)
            else:
                if len(n) == 4:
                    n = [""] + n
                mob, op, sortie, wb, lit = detik(n[0], des), detik(n[1], des), angka(n[2]), angka(n[3]), angka(n[4])
            r = dict(registrasi=reg(rg), tipe=tipe, penyedia=penyedia(nama), prov=prov, jenis=jenis, kontrak_ke=int(kontrak),
                     periode_teks=per or None, mob=mob, op=op, sortie=sortie, wb=wb, liter=lit, dok=dok)
            rows.append(r)
    return rows, sub, tot


# ---------- dok 4 (akumulasi) ----------
def dok4(teks):
    """Hanya registrasi/tgl mulai/kontrak/jam/sortie. PIC dan NO HP tak dibaca."""
    L = teks.split("\n")
    prov = jenis = None
    idx = []
    for i, ln in enumerate(L):
        s = ln.strip()
        if "REKAP REPOSISI" in s:
            L = L[:i]; break
        if s in PROV:
            prov = PROV[s]
        elif s == "PATROLI UDARA":
            jenis = "patroli"
        elif s == "WATER BOMBING":
            jenis = "wb"
        m = re.match(r"\s*\d+\s+PT\.?\s.*?\s{2,}(\S+)(?:\s|$)", ln)
        if m:
            idx.append((i, prov, jenis, reg(m.group(1))))
    out = []
    for n, (i, p, j, rg) in enumerate(idx):
        fin = idx[n + 1][0] if n + 1 < len(idx) else len(L)
        blk = "\n".join(L[i:fin])
        tgl = re.search(r"(?<!\d)(\d{1,2})\s+(Januari|Februari|Maret|April|Mei|Juni|Juli|Agustus|September|Oktober|November|Desember)", blk) \
            or re.search(r"(?<!\d)(\d{1,2})\s+(Januari|Februari|Maret|April|Mei|Juni|Juli|Agustus|September|Oktober|November|Desember)", "\n".join(L[max(0, i - 3):i]))
        mulai = dt.date(2026, BULAN[tgl.group(2)[:3].upper()], int(tgl.group(1))).isoformat()
        h = re.search(r"(?<!\d)(\d{1,2})\s+(\d+:\d\d:\d\d)\s+(\d+)", blk)
        if h:
            out.append(dict(registrasi=rg, prov=p, jenis=j, mulai=mulai, kontrak_ke=int(h.group(1)),
                            jam_menit=menit(detik(h.group(2))), sortie=int(h.group(3))))
        else:  # REPOSISI: tak ada jam
            k = re.search(r"(?<!\d)(\d{1,2})\s+REPOSISI", blk)
            out.append(dict(registrasi=rg, prov=p, jenis=j, mulai=mulai, kontrak_ke=int(k.group(1)) if k else None,
                            jam_menit=None, sortie=None, catatan="reposisi"))
    return out


# ---------- rakit ----------
def selesaikan(r):
    mulai, selesai, jalan = periode(r["periode_teks"])
    o = dict(registrasi=r["registrasi"], tipe=r["tipe"], penyedia=r["penyedia"], prov=r["prov"], jenis=r["jenis"],
             kontrak_ke=r["kontrak_ke"], periode_teks=r["periode_teks"], mulai=mulai, selesai=selesai, berjalan=jalan,
             jam_mob_menit=menit(r["mob"]), jam_operasi_menit=menit(r["op"]), sortie=r["sortie"], wb_drop=r["wb"])
    if r["dok"] == 3:
        o["liter"], o["liter_cetak"] = None, r["liter"]
    else:
        o["liter"] = r["liter"]
    o["dok"] = r["dok"]
    return o


def jumlah(rs):
    return dict(kontrak=len(rs), jam_mob_menit=menit(sum(r["mob"] or 0 for r in rs)), jam_operasi_menit=menit(sum(r["op"] or 0 for r in rs)),
                sortie=kosong_ke_nol(*[r["sortie"] for r in rs]), wb_drop=kosong_ke_nol(*[r["wb"] for r in rs]),
                liter=kosong_ke_nol(*[r["liter"] for r in rs]))


def baca_semua():
    r1, s1, t1 = dok1(baris("doc1.txt"))
    r2, s2, t2 = dok23(baris("doc2.txt"), 2)
    r3, s3, t3 = dok23(baris("doc3.txt"), 3)
    return (r1, s1, t1), (r2, s2, t2), (r3, s3, t3)


def periksa(hasil):
    """Bandingkan jumlah hitung vs Subtotal/Total PDF. Kembalikan daftar kegagalan."""
    gagal, n = [], 0

    def cek(nama, hit, pdf, kunci=("mob", "op", "sortie", "wb", "liter")):
        nonlocal n
        for k in kunci:
            n += 1
            if pdf.get(k) is None:
                continue
            d = (hit[k] or 0) - pdf[k]
            if d != BAWAAN.get((nama, k), 0):
                gagal.append(f"{nama} {k}: hitung={hit[k]} PDF={pdf[k]} selisih={d} (bawaan={BAWAAN.get((nama, k), 0)})")

    def hit(rs):
        return dict(mob=sum(r["mob"] or 0 for r in rs), op=sum(r["op"] or 0 for r in rs), sortie=sum(r["sortie"] or 0 for r in rs),
                    wb=sum(r["wb"] or 0 for r in rs), liter=sum(r["liter"] or 0 for r in rs))

    for no, (rows, sub, tot) in enumerate(hasil, 1):
        for s in sub:
            rs = [r for r in rows if r["prov"] == s["prov"] and (s["jenis"] is None or r["jenis"] == s["jenis"])]
            h = hit(rs)
            if no == 3:  # kolom 'liter' dok 3 dibanding sebagai liter_cetak
                h["liter"] = sum(r["liter"] or 0 for r in rs)
            cek(f"dok{no} prov={s['prov']} jenis={s['jenis'] or 'patroli+wb'}", h, s)
        if tot:
            h = hit(rows)
            cek(f"dok{no} TOTAL", h, tot)
        # total harus = jumlah Subtotal PDF (jaring ke-2 bila baris Total hilang/rusak)
        if tot:
            h = {k: sum(s[k] or 0 for s in sub) for k in ("mob", "op", "sortie", "wb", "liter")}
            cek(f"dok{no} TOTAL vs jumlah Subtotal", h, tot, ("sortie", "wb", "liter") if no == 2 else ("mob", "op", "sortie", "wb", "liter"))
    return gagal, n


def bangun_json(akum):
    (r1, s1, t1), (r2, s2, t2), (r3, s3, t3) = baca_semua()
    rows = [selesaikan(r) for r in r1 + r2 + r3]
    rows.sort(key=lambda r: (r["prov"], r["jenis"], r["registrasi"], r["kontrak_ke"]))
    grup = {}
    for r in rows:
        grup.setdefault((r["prov"], r["jenis"]), []).append(r)
    total = []
    for (p, j), rs in sorted(grup.items()):
        t = dict(prov=p, jenis=j, kontrak=len(rs), jam_mob_menit=menit(sum(detik_balik(r["jam_mob_menit"]) for r in rs)),
                 jam_operasi_menit=menit(sum(detik_balik(r["jam_operasi_menit"]) for r in rs)),
                 sortie=sum(r["sortie"] or 0 for r in rs), wb_drop=sum(r["wb_drop"] or 0 for r in rs))
        if rs[0]["dok"] == 3:
            t["liter"], t["liter_cetak"] = None, sum(r["liter_cetak"] or 0 for r in rs)
        else:
            t["liter"] = sum(r["liter"] or 0 for r in rs)
        total.append(t)
    for r in rows:
        r.pop("dok")
    return {
        "dibuat": dt.datetime.now(dt.timezone(dt.timedelta(hours=7))).isoformat(timespec="minutes"),
        "sumber": [DOK[k][0] for k in sorted(DOK)],
        "catatan": ["Dok 2 (Sumsel, Jambi): jam desimal jam (104.02 = 104,02 jam), cocok dengan Subtotal PDF.",
                    "Dok 3 (Kalbar, Kalsel): kolom 'liter air' bukan liter (rasio per jatuhan 3-27, bukan ~4000); liter=null, nilai cetak di liter_cetak.",
                    "Tanggal tunggal di periode = tanggal mulai (selesai null); berjalan=true hanya bila teks memuat SEKARANG.",
                    "Tidak ada kontrak OMC di keempat PDF. Registrasi UR-SCM (dok 4) dinormalkan ke UR-CSM.",
                    "Dok 4 tidak memuat PIC/NO HP (data pribadi)."],
        "kontrak": rows,
        "akumulasi_25okt": akum,
        "total": total,
    }


def detik_balik(m):
    return 0 if m is None else m * 60


def pdf_teks(path):
    return subprocess.run(["pdftotext", "-layout", path, "-"], check=True, capture_output=True, text=True).stdout


def cari(dirp, kunci):
    for f in sorted(os.listdir(dirp)):
        if f.lower().endswith(".pdf") and kunci.lower() in f.lower():
            return os.path.join(dirp, f)
    sys.exit(f"PDF dengan '{kunci}' di nama tidak ada di {dirp}")


def bangun(dirp):
    os.makedirs(TXT, exist_ok=True)
    for k in (1, 2, 3):
        with open(os.path.join(TXT, f"doc{k}.txt"), "w", encoding="utf-8") as f:
            f.write(pdf_teks(cari(dirp, DOK[k][1])))
    akum = dok4(pdf_teks(cari(dirp, DOK[4][1])))
    gagal, n = periksa(baca_semua())
    if gagal:
        sys.exit("GAGAL, tidak menulis JSON:\n  " + "\n  ".join(gagal))
    out = bangun_json(akum)
    os.makedirs(os.path.dirname(KELUAR), exist_ok=True)
    with open(KELUAR, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=1)
        f.write("\n")
    print(f"ok: {len(out['kontrak'])} kontrak, {len(akum)} akumulasi, {n} pemeriksaan -> {KELUAR}")


def uji():
    gagal, n = periksa(baca_semua())
    # JSON terbit harus = hasil parse teks yang di-commit (kecuali 'dibuat'); akumulasi dari JSON itu sendiri
    with open(KELUAR, encoding="utf-8") as f:
        ada = json.load(f)
    baru = bangun_json(ada["akumulasi_25okt"])
    for k in ("kontrak", "total"):
        n += 1
        if ada[k] != baru[k]:
            gagal.append(f"JSON terbit '{k}' beda dari parse teks (jalankan bangun)")
    pri = [json.dumps(a, ensure_ascii=False) for a in ada["akumulasi_25okt"]]
    for a in ada["akumulasi_25okt"]:
        n += 1
        if set(a) - {"registrasi", "prov", "jenis", "mulai", "kontrak_ke", "jam_menit", "sortie", "catatan"} or "pic" in json.dumps(a).lower() \
                or re.search(r"\b0\d{8,}\b", json.dumps(a)):
            gagal.append(f"akumulasi memuat kolom/nilai terlarang: {a}")
    if len({(a["registrasi"], a["prov"], a["jenis"]) for a in ada["akumulasi_25okt"]}) != len(pri):
        gagal.append("akumulasi: registrasi ganda per prov+jenis")
    if gagal:
        print("GAGAL:\n  " + "\n  ".join(gagal)); sys.exit(1)
    print(f"LULUS: {n} pemeriksaan (subtotal per prov/jenis, total, JSON segar, akumulasi tanpa data pribadi)")


if __name__ == "__main__":
    a = sys.argv[1:]
    if a[:1] == ["bangun"] and len(a) == 2:
        bangun(a[1])
    elif a[:1] == ["uji"]:
        uji()
    else:
        sys.exit(__doc__)
