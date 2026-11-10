"""Ikhtisar Cuaca Harian BMKG (Fact Sheet) -> public/banjir/data/cuaca_factsheet.json + arsip bulanan append-only.

Sumber: https://dataweb.bmkg.go.id/cuaca/dokumen/ikhtisar-cuaca-harian.pdf (16 halaman, BMKG hanya menyimpan yang terbaru, jadi arsip wajib).
PDF diunduh ke folder sementara, dibaca `pdftotext -layout`, dihapus; PDF tidak masuk repo. Gambar (peta potensi hujan, angin 3000 kaki, sepekan) tidak dibaca.
Tiap bagian diurai sendiri-sendiri: yang gagal jadi null dan tercatat di `bagian` ("ok" atau "gagal: alasan"), tidak dikarang.
Arsip: public/banjir/data/cuaca_factsheet_arsip_<YYYY-MM>.json {"terbit": {tanggal: isi}}; entri tak pernah diubah.
Pakai: python3 scripts/cuaca/factsheet.py [berkas.pdf] | ... uji
"""
import datetime as dt, json, os, re, shutil, subprocess, sys, tempfile, urllib.request

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from dasar import KELUAR, PROVINSI, WIB, simpan

URL = "https://dataweb.bmkg.go.id/cuaca/dokumen/ikhtisar-cuaca-harian.pdf"
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"
BERKAS = os.path.join(KELUAR, "cuaca_factsheet.json")
BULAN = {b: i + 1 for i, b in enumerate("Januari Februari Maret April Mei Juni Juli Agustus September Oktober November Desember".split())}
ALIAS = {"Kep. Riau": "21", "Kep. Bangka Belitung": "19", "Bangka Belitung": "19", "DI Yogyakarta": "34", "Daerah Istimewa Yogyakarta": "34",
         "Papua Pegununga": "95", "Yogyakarta": "34", "NTB": "52", "NTT": "53"}
NAMA = {**{v: k for k, v in PROVINSI.items()}, **ALIAS}
POLA_PROV = re.compile("|".join(re.escape(n) for n in sorted(NAMA, key=len, reverse=True)))
PROV_KANON = {k: n for k, n in PROVINSI.items()}


def kode_prov(s):
    """Nama provinsi tunggal -> kode BPS, atau None."""
    s = re.sub(r"\s+", " ", (s or "").strip().rstrip(".,"))
    for n, k in NAMA.items():
        if n.lower() == s.lower():
            return k
    return None


def daftar_prov(teks):
    """Semua provinsi yang disebut dalam teks (urut muncul, tanpa ganda) -> [kode]. Hanya untuk teks yang memang daftar provinsi."""
    out = []
    for m in POLA_PROV.finditer(teks):
        k = NAMA[m.group(0)]
        if k not in out:
            out.append(k)
    return out


def bersih(t):
    t = t.replace("​", "")
    baris = [b.rstrip() for b in t.splitlines()]
    return [b for b in baris if b.strip() and not re.match(r"^\s*(Fact Sheet Cuaca dan Iklim Terkini|Badan Meteorologi Klimatologi dan Geofisika - .*?)\s*\d*$", b)]


KEPALA = [("hujan", r"KONDISI CUACA 24 JAM TERAKHIR"), ("jabodetabek", r"^\s*2\.\s+Curah Hujan Jabodetabek"), ("bencana", r"^\s*3\.\s+Kejadian Bencana"),
          ("analisis", r"^\s*ANALISIS TERKINI"), ("global", r"^\s*1\.\s+Kondisi Global"), ("regional", r"^\s*2\.\s+Kondisi Regional"),
          ("lokal", r"^\s*3\.\s+Kondisi Lokal"), ("prognosis", r"^\s*III\.\s+PROGNOSIS"), ("prakiraan", r"^\s*IV\.\s+PRAKIRAAN"),
          ("gambar1", r"^\s*Potensi hujan dari citra"), ("ensemble", r"^\s*2\.\s+Potensi hujan ekstrem"), ("dki", r"^\s*3\.\s+Prakiraan Cuaca DKI"),
          ("sepekan", r"^\s*V\.\s+POTENSI HUJAN"), ("remarks", r"^\s*VI\.\s+REMARKS")]


def bagian_teks(baris):
    """-> {kunci: [baris]} antar kepala yang ditemukan (urut posisi)."""
    pos = []
    for k, p in KEPALA:
        for i, b in enumerate(baris):
            if re.search(p, b):
                pos.append((i, k))
                break
    pos.sort()
    return {k: baris[i + 1: pos[j + 1][0] if j + 1 < len(pos) else len(baris)] for j, (i, k) in enumerate(pos)}


def butir(baris):
    """Butir bernomor `n)` atau `n.` pada indentasi terkecil -> {n: teks tersambung}."""
    pola = re.compile(r"^(\s*)(\d+)[.)]\s+(.*)$")
    cocok = [(len(m.group(1)), i) for i, b in enumerate(baris) if (m := pola.match(b))]
    if not cocok:
        return {}
    ind = min(c[0] for c in cocok)
    out, kini = {}, None
    for b in baris:
        m = pola.match(b)
        if m and len(m.group(1)) == ind:
            kini = int(m.group(2))
            out[kini] = [m.group(3)]
        elif kini is not None:
            out[kini].append(b.strip())
    return {n: " ".join(v) for n, v in out.items()}


def angka(s):
    return float(s.replace(",", "."))


def baris_hujan(baris, dengan_prov=True):
    """Daftar `n) nama [, provinsi] : X mm` dengan baris sambungan (nama/provinsi terpotong ke baris bawah)."""
    blok, kini = [], None
    for b in baris:
        if re.match(r"^\s*\d+\)\s", b):
            kini = [b]
            blok.append(kini)
        elif kini is not None and not re.match(r"^\s*(Berdasarkan|2\.)", b):
            kini.append(b)
    out = []
    for bl in blok:
        m = re.match(r"^\s*(\d+)\)\s+(.*?)\s*:\s*(\d+(?:[.,]\d+)?)\s*mm\s*(.*)$", bl[0])
        if not m:
            out.append({"no": None, "nama": None, "prov": None, "kode_prov": None, "mm": None, "mentah": bl[0].strip()})
            continue
        nama = " ".join([m.group(2)] + [x.strip() for x in bl[1:]] if not m.group(4) else [m.group(2)])
        sisa = " ".join(x.strip() for x in bl[1:])
        nama = re.sub(r"\s+", " ", nama if not sisa else f"{m.group(2)} {sisa}")
        e = {"no": int(m.group(1)), "nama": nama, "mm": angka(m.group(3))}
        if dengan_prov:
            nm, _, pv = nama.rpartition(",")
            e.update(nama=nm.strip() if nm else nama, prov=pv.strip() if nm else None, kode_prov=kode_prov(pv) if nm else None)
        out.append(e)
    return out


def p_tanggal(t):
    m = re.search(r"FACT SHEET TANGGAL\s+(\d{1,2})\s+(\w+)\s+(\d{4})", t)
    b = re.search(r"BERLAKU TANGGAL\s+(\d{1,2})(?:\s+(\w+))?\s*-\s*(\d{1,2})\s+(\w+)\s+(\d{4})", t)
    d = dt.date(int(m.group(3)), BULAN[m.group(2)], int(m.group(1)))
    mb = BULAN[b.group(4)]
    thn = int(b.group(5))
    akhir = dt.date(thn, mb, int(b.group(3)))
    awal_bln = BULAN[b.group(2)] if b.group(2) else mb
    awal = dt.date(thn - (1 if awal_bln > mb else 0), awal_bln, int(b.group(1)))
    return {"tanggal": d.isoformat(), "berlaku_dari": awal.isoformat(), "berlaku_sampai": akhir.isoformat()}


def p_bencana(baris):
    out, kini = [], None
    for b in baris:
        m = re.match(r"^(\s*\d+\)\s+)(.*?)(\s{2,}:\s)(.*)$", b)
        if m:
            kol = len(m.group(1)) + len(m.group(2)) + len(m.group(3)) - 2
            kini = {"kol": kol, "jenis": [m.group(2)], "kanan": [m.group(4)]}
            out.append(kini)
        elif kini:
            kini["jenis"].append(b[:kini["kol"]].strip())
            kini["kanan"].append(b[kini["kol"] + 1:].strip())
    hasil = []
    for e in out:
        jenis = [j.strip() for j in re.split(r",", " ".join(x for x in e["jenis"] if x)) if j.strip()]
        grup, teks, url, mode = [], [], "", "lokasi"
        for k in e["kanan"]:
            if not k:
                continue
            if re.match(r"Sumber:", k):
                mode, url = "sumber", k[7:].strip()
            elif mode == "sumber" and " " not in k:
                url += k
            else:
                if mode == "sumber":
                    grup.append((" ".join(teks), url))
                    teks, url, mode = [], "", "lokasi"
                teks.append(k)
        if teks or url:
            grup.append((" ".join(teks), url))
        for lok, u in grup:
            butir_lok = [x.strip() for x in lok.split(";") if x.strip()]
            prov = kode_prov(butir_lok[-1].rpartition(",")[2]) if butir_lok else None
            hasil.append({"jenis": jenis, "lokasi": butir_lok, "kode_prov": prov, "sumber": u or None})
    return hasil


def p_global(baris):
    t = " ".join(b.strip() for b in baris)
    out = {}
    for k, pola in (("nino34", r"NINO 3\.4\s*:\s*harian\s*([+-]?\d+(?:\.\d+)?)\s*,\s*([^,]+),"), ("dmi", r"DMI\s*:\s*harian\s*([+-]?\d+(?:\.\d+)?)\s*,\s*([^,]+),"),
                    ("soi", r"SOI\s*:\s*harian\s*([+-]?\d+(?:\.\d+)?)\s*,\s*([^,]+),")):
        m = re.search(pola, t)
        if not m:
            out[k] = None
            continue
        akhir = t[m.end():m.end() + 40].lower()
        out[k] = {"nilai": float(m.group(1)), "label": m.group(2).strip(), "berpengaruh": False if akhir.lstrip().startswith("tidak berpengaruh") else None}
    if not any(out.values()):
        raise ValueError("indeks global tak terbaca")
    return out


def p_regional(baris):
    b = butir(baris)
    t = " ".join(b.values())
    mjo = re.search(r"MJO\) pada tanggal (\d{1,2} \w+ \d{4}) terpantau di\s+fase (\d)\s*-\s*([A-Za-z ]+?),", t)
    surge = re.search(r"Indeks Surge\s*:\s*([+-]?\d+(?:\.\d+)?)", t)
    return {"mjo": {"tanggal": mjo.group(1), "fase": int(mjo.group(2)), "nama_fase": mjo.group(3).strip()} if mjo else None,
            "surge": float(surge.group(1)) if surge else None, "butir": b}


def p_lokal(baris):
    b = butir([x for x in baris if "●" not in x])
    lab = next((daftar_prov(v) for v in b.values() if v.startswith("Labilitas")), None)
    vul = [{"gunung": m.group(1).strip(), "teramati": m.group(2).strip().rstrip(".")}
           for x in baris if (m := re.search(r"●\s*(Gunung [^:]+?)\s*:\s*(.*)$", x))]
    if lab is None:
        raise ValueError("butir labilitas tak ada")
    return {"labilitas_kuat_prov": lab, "debu_vulkanik": vul, "butir": b}


def p_prognosis(baris):
    sub = {}
    kini = None
    for b in baris:
        if re.match(r"^\s*2\.\s", b):
            kini = 2
        elif re.match(r"^\s*\d\.\s", b):
            kini = None
        elif kini and (m := re.match(r"^\s*(\d)\)\s+(.*)$", b)):
            sub[int(m.group(1))] = [m.group(2)]
            continue
        if kini and sub and not re.match(r"^\s*\d\.\s", b):
            sub[max(sub)].append(b.strip())
    st = {n: " ".join(v) for n, v in sub.items()}
    if not st:
        raise ValueError("sub-butir analisis regional tak terbaca")
    return {"konveksi_meningkat_prov": {"anomali_mjo_gelombang": daftar_prov(st.get(1, "")), "konvergensi": daftar_prov(st.get(2, "")),
                                        "labilitas_lokal": daftar_prov(st.get(3, ""))}, "butir": st}


def p_prakiraan(baris):
    t = "\n".join(baris)
    das = []
    for m in re.finditer(r"^\s*([a-c])\.\s+((?:November|Desember|Januari|Februari|Maret|April|Mei|Juni|Juli|Agustus|September|Oktober)\s+[IV]+\s+\d{4}):\s*(.*?)(?=^\s*[a-c]\.\s|^\s*\d\)\s|\Z)", t, re.S | re.M):
        das.append({"dasarian": m.group(2), "rendah_meliputi": re.sub(r"\s+", " ", m.group(3)).strip()})
    b = butir(baris)
    lab = next((daftar_prov(v) for v in b.values() if v.startswith("Labilitas")), None)
    if not das:
        raise ValueError("dasarian tak terbaca")
    return {"dasarian_rendah": das, "labilitas_kuat_prov": lab, "butir": {n: v for n, v in b.items() if n != 1}}


def p_ensemble(baris):
    blok, kini = [], None
    for b in baris:
        m = re.match(r"^\s*(\d{1,2} \w+ \d{4})\s*$", b)
        if m:
            kini = [m.group(1), []]
            blok.append(kini)
        elif kini:
            kini[1].append(b.strip())
    out = []
    for tgl, ls in blok:
        t = " ".join(ls)
        d, mo, y = tgl.split()
        a = re.search(r">\s*(\d+)%.*?>\s*(\d+)\s*mm", t)
        out.append({"tanggal": dt.date(int(y), BULAN[mo], int(d)).isoformat(), "peluang_persen": int(a.group(1)) if a else None, "ambang_mm": int(a.group(2)) if a else None,
                    "ada_wilayah": False if "tidak terdapat" in t else None if not a else True, "kode_prov": daftar_prov(t) if "tidak terdapat" not in t else [], "teks": t})
    if not out:
        raise ValueError("tak ada blok tanggal")
    return out


def p_remarks(baris):
    b = butir(baris)
    if 1 not in b:
        raise ValueError("butir 1 tak ada")
    laut = None
    if 2 in b and "wilayah" in b[2]:
        s = b[2].split("wilayah", 1)[1].strip().rstrip(".")
        laut = [x.strip() for x in re.split(r",\s*(?:dan\s+)?|\s+dan\s+(?=Samudra|Laut|Selat)", s) if x.strip()]
    return {"dampak_3hari_prov": daftar_prov(b[1]), "hujan_lebat_perairan": laut, "butir": b}


def p_awan(baris):
    t = " ".join(x.strip() for x in baris)
    m = re.search(r"terdapat di (.*?)\.\s*(?:2\.|$)", t)
    if not m:
        raise ValueError("kalimat awan tak ada")
    return daftar_prov(m.group(1))


def urai(teks):
    """Teks pdftotext -layout -> dokumen. Tiap bagian try/except sendiri; `bagian` mencatat ok/gagal."""
    baris = bersih(teks)
    sec = bagian_teks(baris)
    dok, status = {}, {}
    dok.update(p_tanggal(teks))  # tanpa tanggal tidak ada dokumen: biarkan melempar

    def ambil(nama, kunci, fn):
        try:
            if kunci not in sec:
                raise KeyError(f"kepala '{kunci}' tak ada")
            dok[nama] = fn(sec[kunci])
            status[nama] = "ok"
        except Exception as x:
            dok[nama] = None
            status[nama] = f"gagal: {type(x).__name__} {x}"
    hujan = sec.get("hujan", [])
    cut = next((i for i, b in enumerate(hujan) if re.match(r"^\s*Berdasarkan pantauan", b)), len(hujan))
    judul = re.search(r"Curah Hujan Indonesia\s*[≥>=]+\s*(\d+(?:[.,]\d+)?)\s*mm", teks)
    ambil("hujan_stasiun", "hujan", lambda s: baris_hujan(hujan[:cut]) or (_ for _ in ()).throw(ValueError("0 baris")))
    dok["hujan_judul_mm"] = angka(judul.group(1)) if judul else None
    ambil("awan_konvektif_prov", "hujan", lambda s: p_awan(hujan[cut:]))
    ambil("hujan_jabodetabek", "jabodetabek", lambda s: baris_hujan(s, dengan_prov=False))
    ambil("kejadian_bencana", "bencana", p_bencana)
    ambil("global", "global", p_global)
    ambil("regional", "regional", p_regional)
    ambil("lokal", "lokal", p_lokal)
    ambil("prognosis", "prognosis", p_prognosis)
    ambil("prakiraan_3hari", "prakiraan", p_prakiraan)
    ambil("ensemble_3hari", "ensemble", p_ensemble)
    ambil("remarks", "remarks", p_remarks)
    for n, k, alasan in (("dki_tabel", "dki", "tabel DKI berkolom bertingkat tidak diurai"), ("peta_potensi_hujan", "gambar1", "gambar"), ("sepekan", "sepekan", "gambar")):
        dok[n] = None
        status[n] = f"dilewati: {alasan}" if k in sec else "tak ada di dokumen"
    dok["bagian"] = status
    dok["olah"] = olah(dok)
    return dok


def olah(d):
    """Ringkasan per provinsi + prov per bahaya + `ringkas` siap kartu. Tanpa skor model."""
    st = d.get("hujan_stasiun") or []
    per = {}
    for s in sorted([s for s in st if s.get("mm") is not None], key=lambda s: -s["mm"]):
        k = s.get("kode_prov") or "?"
        e = per.setdefault(k, {"prov": PROV_KANON.get(k, s.get("prov")), "n_stasiun": 0, "mm_maks": s["mm"], "stasiun_maks": s["nama"], "stasiun": []})
        e["n_stasiun"] += 1
        e["stasiun"].append({"nama": s["nama"], "mm": s["mm"], "peringkat": s["no"]})
    bahaya = {}
    for nama, v in (("hujan_berdampak_3hari", (d.get("remarks") or {}).get("dampak_3hari_prov")), ("awan_konvektif_24j", d.get("awan_konvektif_prov")),
                    ("labilitas_kuat_kini", (d.get("lokal") or {}).get("labilitas_kuat_prov")), ("labilitas_kuat_prakiraan", (d.get("prakiraan_3hari") or {}).get("labilitas_kuat_prov")),
                    ("konveksi_meningkat_konvergensi", ((d.get("prognosis") or {}).get("konveksi_meningkat_prov") or {}).get("konvergensi"))):
        for k in v or []:
            bahaya.setdefault(k, []).append(nama)
    for e in d.get("ensemble_3hari") or []:
        for k in e["kode_prov"]:
            bahaya.setdefault(k, []).append(f"ensemble_{e['tanggal']}")
    r = {"n_stasiun": len(st), "n_provinsi_stasiun": len([k for k in per if k != "?"]), "hujan_maks": None,
         "n_stasiun_50mm": sum(1 for s in st if (s.get("mm") or 0) >= 50), "ensemble_ada_wilayah": any(e["ada_wilayah"] for e in d.get("ensemble_3hari") or []) if d.get("ensemble_3hari") else None,
         "n_prov_dampak_3hari": len((d.get("remarks") or {}).get("dampak_3hari_prov") or [])}
    if st:
        t = max((s for s in st if s.get("mm") is not None), key=lambda s: s["mm"])
        r["hujan_maks"] = {"stasiun": t["nama"], "prov": t.get("prov"), "mm": t["mm"]}
        tk = (d.get("tanggal") or "")[8:] + "-" + (d.get("tanggal") or "")[5:7]
        r["teks"] = f"Hujan tertinggi 24 jam terakhir {str(t['mm']).rstrip('0').rstrip('.')} mm di {t['nama']}" + (f", {t['prov']}" if t.get("prov") else "") + \
                    f". {r['n_stasiun_50mm']} dari {len(st)} stasiun melapor 50 mm atau lebih."
    return {"per_provinsi": per, "prov_bahaya": bahaya, "ringkas": r}


def pdf_ke_teks(jalur):
    return subprocess.run(["pdftotext", "-layout", jalur, "-"], capture_output=True, text=True, check=True, timeout=120).stdout


def tambah(isi, tgl, e):
    if tgl in isi["terbit"]:
        return isi, False
    isi["terbit"][tgl] = e
    return isi, True


def main():
    d0 = tempfile.mkdtemp()
    try:
        jalur = sys.argv[1] if len(sys.argv) > 1 else os.path.join(d0, "fs.pdf")
        if len(sys.argv) <= 1:
            with urllib.request.urlopen(urllib.request.Request(URL, headers={"User-Agent": UA}), timeout=120) as r, open(jalur, "wb") as f:
                shutil.copyfileobj(r, f)
        dok = urai(pdf_ke_teks(jalur))
    finally:
        shutil.rmtree(d0, ignore_errors=True)
    if not dok.get("hujan_stasiun"):
        raise RuntimeError(f"daftar hujan stasiun kosong ({dok['bagian']['hujan_stasiun']}): berkas lama dibiarkan")
    dibuat = dt.datetime.now(WIB).isoformat(timespec="minutes")
    dok.update(diambil=dibuat, sumber="BMKG Ikhtisar Cuaca Harian (dataweb.bmkg.go.id)")
    simpan(BERKAS, dok)
    jal = os.path.join(KELUAR, f"cuaca_factsheet_arsip_{dok['tanggal'][:7]}.json")
    if os.path.exists(jal):
        try:
            isi = json.load(open(jal))
            assert isinstance(isi["terbit"], dict)
        except Exception as x:
            raise RuntimeError(f"{jal} rusak ({x}): berhenti")
    else:
        isi = {"versi": 1, "bulan": dok["tanggal"][:7], "sumber": "BMKG Ikhtisar Cuaca Harian; entri tidak diubah sesudah terbit", "terbit": {}}
    isi, baru = tambah(isi, dok["tanggal"], dok)
    if baru:
        simpan(jal, isi)
    bad = {k: v for k, v in dok["bagian"].items() if v != "ok"}
    print(f"factsheet {dok['tanggal']}: {dok['olah']['ringkas']['n_stasiun']} stasiun, arsip {'ditambah' if baru else 'sudah ada'}; bagian tak ok: {bad}", file=sys.stderr)


CONTOH = """\
        FACT SHEET TANGGAL 10 November 2026
        BERLAKU TANGGAL 10 - 12 November 2026
         KONDISI CUACA 24 JAM TERAKHIR
         Curah Hujan Indonesia ≥ 50.0 mm/hari:
         1)    Stasiun Meteorologi Tebelian, Kalimantan Barat                :   141   mm

         2)    Stasiun Meteorologi Tanah Merah, Papua Selatan                :   96    mm
Fact Sheet Cuaca dan Iklim Terkini
Badan Meteorologi Klimatologi dan Geofisika - November 2026​   ​                            2
         13)   Stasiun Meteorologi Sultan Aji Muhammad Sulaiman Sepinggan,   :   29    mm
               Kalimantan Timur

         18)    Raden Sadjad TNI AU, Kepulauan Riau                           :   23     mm

         Berdasarkan pantauan citra satelit, distribusi awan konvektif signifikan selama 24 jam
         terakhir terdapat di Aceh, Kep. Riau, DKI Jakarta, Papua Barat Daya, Papua Barat,
         dan Papua Selatan.

         2. Curah Hujan Jabodetabek ≥ 10.0 mm/hari:
               1)    AWS IPB Bogor                        :    68.0   mm
         3. Kejadian Bencana:
            1) Angin Kencang,           : Desa Cileuleuy, Kecamatan Cigugur, Kabupaten Kuningan, Jawa
               Hujan Lebat                Barat
                                          Sumber: Laporan BPBD Kabupaten Kuningan

                                          Desa Setren, Kecamatan Ngasem, Kabupaten Bojonegoro, Jawa Timur
                                          Sumber:
                                          https://beritajatim.com/angin-kencang-terjang-bojonegoro-17-
                                          pohon-tumbang
         ANALISIS TERKINI:
            1. Kondisi Global
            1) Indeks NINO 3.4               : harian +2.75, El Nino Event, tidak berpengaruh terhadap
                                               peningkatan.
            2) Indeks DMI                    : harian +0.75, IOD Positif, tidak berpengaruh terhadap
                                               peningkatan.
            3) Indeks SOI                    : harian -13.7, El Nino Event, tidak berpengaruh terhadap
                                               peningkatan.
            2. Kondisi Regional
               1)​ Madden-Julian Oscillation (MJO) pada tanggal 8 November 2026 terpantau di
                   fase 2 - Indian Ocean, kurang kontribusi.
               4)​ Indeks Surge : +7.9 (signifikan > +10) lalu
            3. Kondisi Lokal/Mikro
                  1)​ Labilitas Lokal Kuat yang mendukung proses konvektif terdapat
                      di Aceh, Sumatera Utara, Papua Pegunungan.
                     ●​ Gunung Semeru​                   : teramati ke arah Barat Daya.
          III. ​PROGNOSIS
                 2.​ Hasil analisis kondisi regional tanggal 10 November 2026 berdasarkan:
                   1)​ Analisis anomali OLR di Aceh, Bali.
                   2)​ Pantauan daerah konvergensi di Riau, Kep. Riau, Papua Barat Daya.
                   3)​ Hasil analisis kondisi lokal di Jawa Barat dan Papua Pegununga.
          IV. ​PRAKIRAAN 3 HARI KEDEPAN
                  1)​ Dasar Prakiraan
                       a.​ November II 2026: meliputi pesisir timur Aceh, Bali.
                       b.​ November III 2026: meliputi pesisir utara Banten.
                  7)​ Labilitas Lokal Kuat terdapat
                      di Aceh, Jawa Timur.
         Potensi hujan dari citra Himawari-9 tanggal 10 November 2026 pukul 10.00 WIB
         2.​ Potensi hujan ekstrem berdasarkan output model
                                                   10 November 2026
                  Probabilistik > 60% untuk potensi hujan lebat > 50 mm tidak terdapat di wilayah
                  Indonesia.
         VI. REMARKS
             1.​ Secara umum curah hujan di Aceh, Sumatera Utara, Kep. Bangka Belitung, DI Yogyakarta,
                 dan Papua.
             2.​ Potensi hujan dengan intensitas lebat di wilayah Selat Malaka bagian utara, Laut Natuna Utara, dan Samudra Pasifik utara Papua Barat.
"""


def uji():
    d = urai(CONTOH)
    assert (d["tanggal"], d["berlaku_dari"], d["berlaku_sampai"]) == ("2026-11-10", "2026-11-10", "2026-11-12")
    h = d["hujan_stasiun"]
    assert len(h) == 4 and h[0] == {"no": 1, "nama": "Stasiun Meteorologi Tebelian", "mm": 141.0, "prov": "Kalimantan Barat", "kode_prov": "61"}, h[0]
    assert h[2]["nama"] == "Stasiun Meteorologi Sultan Aji Muhammad Sulaiman Sepinggan" and h[2]["prov"] == "Kalimantan Timur" and h[2]["kode_prov"] == "64", h[2]
    assert h[3]["kode_prov"] == "21" and d["hujan_judul_mm"] == 50.0
    assert d["awan_konvektif_prov"] == ["11", "21", "31", "96", "92", "93"], d["awan_konvektif_prov"]
    assert d["hujan_jabodetabek"] == [{"no": 1, "nama": "AWS IPB Bogor", "mm": 68.0}]
    b = d["kejadian_bencana"]
    assert b[0]["jenis"] == ["Angin Kencang", "Hujan Lebat"] and b[0]["kode_prov"] == "32" and b[0]["sumber"] == "Laporan BPBD Kabupaten Kuningan", b[0]
    assert b[1]["kode_prov"] == "35" and b[1]["sumber"] == "https://beritajatim.com/angin-kencang-terjang-bojonegoro-17-pohon-tumbang", b[1]
    g = d["global"]
    assert g["nino34"] == {"nilai": 2.75, "label": "El Nino Event", "berpengaruh": False} and g["soi"]["nilai"] == -13.7 and g["dmi"]["label"] == "IOD Positif"
    assert d["regional"]["mjo"] == {"tanggal": "8 November 2026", "fase": 2, "nama_fase": "Indian Ocean"} and d["regional"]["surge"] == 7.9
    assert d["lokal"]["labilitas_kuat_prov"] == ["11", "12", "95"] and d["lokal"]["debu_vulkanik"] == [{"gunung": "Gunung Semeru", "teramati": "ke arah Barat Daya"}] or d["lokal"]["debu_vulkanik"][0]["gunung"] == "Gunung Semeru"
    assert d["prognosis"]["konveksi_meningkat_prov"] == {"anomali_mjo_gelombang": ["11", "51"], "konvergensi": ["14", "21", "96"], "labilitas_lokal": ["32", "95"]}, d["prognosis"]
    assert [x["dasarian"] for x in d["prakiraan_3hari"]["dasarian_rendah"]] == ["November II 2026", "November III 2026"] and d["prakiraan_3hari"]["labilitas_kuat_prov"] == ["11", "35"]
    e = d["ensemble_3hari"][0]
    assert e["tanggal"] == "2026-11-10" and e["ada_wilayah"] is False and e["peluang_persen"] == 60 and e["ambang_mm"] == 50 and e["kode_prov"] == []
    assert d["remarks"]["dampak_3hari_prov"] == ["11", "12", "19", "34", "91"] and d["remarks"]["hujan_lebat_perairan"] == ["Selat Malaka bagian utara", "Laut Natuna Utara", "Samudra Pasifik utara Papua Barat"], d["remarks"]
    assert d["bagian"]["hujan_stasiun"] == "ok" and d["bagian"]["sepekan"] == "tak ada di dokumen"
    o = d["olah"]
    assert o["ringkas"]["n_stasiun"] == 4 and o["ringkas"]["n_stasiun_50mm"] == 2 and o["per_provinsi"]["61"]["mm_maks"] == 141.0 and o["per_provinsi"]["64"]["n_stasiun"] == 1
    assert "141 mm di Stasiun Meteorologi Tebelian, Kalimantan Barat" in o["ringkas"]["teks"], o["ringkas"]["teks"]
    assert "hujan_berdampak_3hari" in o["prov_bahaya"]["34"]
    s, baru = tambah({"terbit": {}}, "2026-11-10", {"x": 1})
    assert baru and not tambah(s, "2026-11-10", {"x": 2})[1] and s["terbit"]["2026-11-10"] == {"x": 1}
    try:
        urai("kosong")
        assert False
    except AttributeError:
        pass
    print("uji factsheet ok")


if __name__ == "__main__":
    uji() if sys.argv[1:] == ["uji"] else main()
