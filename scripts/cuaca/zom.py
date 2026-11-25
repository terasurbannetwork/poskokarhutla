"""Zona Musim (ZOM) BMKG "Prediksi Musim Hujan 2026/2027" -> public/cuaca/data/zom.json, plus fase musim (ALGORITMA A8, H24).

Pakai:
  python3 scripts/cuaca/zom.py urai <pmh.txt>     # pdftotext -layout buku PMH; SEKALI PER MUSIM, manual (bukan workflow)
  python3 scripts/cuaca/zom.py fase YYYY-MM-DD    # daftar harian kab -> fase, ke public/cuaca/data/zom_fase.json
  python3 scripts/cuaca/zom.py uji                # parse fixture/zom_jabar.txt, cek JABAR_19/20

Sumber: BMKG, buku PMH 2026/2027 (https://content.bmkg.go.id/wp-content/uploads/00_Buku-PMH2026-27_fullver_ttd.pdf).
Nilai normal klimatologi TIDAK ada di tabel ZOM (hanya perbandingan terhadap normal), jadi tidak diisi.
Pita fixture = kutipan kecil (satu halaman) untuk uji; hak cipta BMKG.
"""
import json, os, re, sys
from collections import defaultdict
from datetime import date, timedelta

AKAR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
KELUAR = os.path.join(AKAR, "public/cuaca/data/zom.json")
FASE = os.path.join(AKAR, "public/cuaca/data/zom_fase.json")
FIXTURE = os.path.join(AKAR, "scripts/cuaca/fixture/zom_jabar.txt")
SUMBER = "BMKG, Prediksi Musim Hujan 2026/2027 (content.bmkg.go.id/wp-content/uploads/00_Buku-PMH2026-27_fullver_ttd.pdf)"
MUSIM = 2026  # tahun mulai musim; bulan SEP-DES di 2026, JAN-AGT di 2027
BULAN = ["JAN", "FEB", "MAR", "APR", "MEI", "JUN", "JUL", "AGT", "SEP", "OKT", "NOV", "DES"]
DAS = {"I": 1, "II": 11, "III": 21}
# awalan ZOM -> kode provinsi (public/geo/provinsi.json, kode BPS)
PREFIX = {"ACEH": ["11"], "SUMUT": ["12"], "SUMBAR": ["13"], "RIAU": ["14"], "JAMBI": ["15"], "SUMSEL": ["16"], "BENGKULU": ["17"],
          "LAMPUNG": ["18", "16"], "BABEL": ["19"], "KEPRI": ["21"], "BANTENDKI": ["36", "31"], "JABAR": ["32"], "JATENG": ["33"], "DIY": ["34"],
          "JATIM": ["35"], "BALI": ["51"], "NTB": ["52"], "NTT": ["53"], "KALBAR": ["61"], "KALTENG": ["62"], "KALSEL": ["63"],
          "KALTIM": ["64"], "KALTARA": ["65"], "SULUT": ["71"], "SULTENG": ["72"], "SULSEL": ["73"], "SULTRA": ["74"], "GORONTALO": ["75"],
          "SULBAR": ["76"], "MALUKU": ["81"], "MALUT": ["82"], "PAPBAR": ["92", "96"], "PAPUA": ["91", "94", "95"], "PAPSEL": ["93", "94", "95"]}

BAND = r"(?:SAMA|(?:MUNDUR|MAJU)(?:\s*[>≥]?\s*\d)?)"
PANJ = r"(?:SAMA|(?:LEBIH PENDEK|LEBIH PANJANG)(?:\s*[>≥]?\s*\d)?)"
BLN = "|".join(BULAN)
BARIS = re.compile(r"^\s*(\d{1,3})\s+([A-Z]+)_\s?(\d+)\b(.*)$")
MH = r"(?:SUDAH MH|TIDAK ADA MH)"
# kolom data berurutan, tiap kolom boleh kosong di PDF (mis. sifat MALUKU_01, awal SULTENG_13); jenis token saling berbeda jadi tak rancu
DATA = re.compile(rf"(?:^|\s)(?=\S)((?:{BLN})\s+I{{1,3}}|{MH}|SEPANJANG)?\s*({BAND}|{MH}|SEPANJANG)?\s*(BN|N|AN)?\s*((?:{BLN})(?:\s+2027)?)?\s*({BAND})?\s*(\d{{1,2}})?\s*({PANJ}|{MH})?\s*$")
BUANG = re.compile(r"PMH 202|ZONA HANYA|Perbandingan|Daerah/Kab|Terhadap|\(dasarian\)|\(Bulan\)|\(Sep-|^No\.|Catatan|Tertinggi")


def rapikan(s):
    return re.sub(r"\s+", " ", s).strip()


def band(s):
    return rapikan(s.replace("  ", " ")).replace("> ", ">").replace("≥ ", "≥") if s else None


def tgl_awal(bln, das):
    i = BULAN.index(bln)
    th = MUSIM if i >= 7 else MUSIM + 1  # musim mulai AGT 2026; AGT di kolom puncak bertanda 2027 dipisah (puncak_tahun)
    return date(th, i + 1, DAS[das]).isoformat()


def bersih_ujung(ln):
    """Teks wilayah di sisi kiri satu baris (sebelum kolom data); baris data diputus di dua spasi+kolom data."""
    return rapikan(ln)


def kalimat_selesai(t):
    return bool(t) and not t.endswith(",") and t.split()[-1].lower() not in ("kota", "kecil", "besar", "dan", "bagian", "kab.", "kabupaten", "pesisir,")


def mulai_baru(t):
    return bool(t) and t[0].isupper()


def urai_teks(baris):
    """-> (daftar ZOM, daftar id yang gagal diurai). Deskripsi wilayah membungkus di atas/bawah baris data; pemisah per ZOM
    dipilih di antara baris bebas: batas harus jatuh sesudah kalimat selesai dan sebelum huruf kapital, terdekat ke simetri."""
    baris = list(baris)
    i = 0
    while i < len(baris):  # halaman baru: dari "PMH 202" sampai "(Bulan)" = header; ganti satu penanda pemisah halaman
        if "PMH 202" in baris[i]:
            j = next((q for q in range(i, min(len(baris), i + 30)) if "(Bulan)" in baris[q]), i)
            baris[i:j + 1] = ["\x00PAGE"]
        i += 1
    rows = []  # (idx, no, pref, nomor, sisa)
    for i, l in enumerate(baris):
        m = BARIS.match(l)
        if m:
            rows.append((i, int(m.group(1)), m.group(2), int(m.group(3)), m.group(4)))
    if not rows:
        return [], []
    out, gagal = [], []
    data = []  # (cocok kolom data, -, teks wilayah di baris data)
    for i, no, pf, n, sisa in rows:
        mm = None
        for q in re.finditer(r"(?:^|\s)(?=[A-Z])", sisa):  # awal paling kiri yang seluruh sisanya cocok kolom data
            c = DATA.match(sisa, q.start())
            if c and any(c.groups()):
                mm = c
                break
        if not mm:
            gagal.append(f"{pf}_{n:02d}")
        data.append((mm, None, sisa[:mm.start()] if mm else sisa))
    # baris bebas (teks deskripsi) antara baris data; halaman baru memutus (header/footer dibuang oleh BUANG)
    def bebas(a, b):
        r = []
        for l in baris[a + 1:b]:
            if l == "\x00PAGE":
                r.append(None)
                continue
            t = rapikan(re.sub(r"\b(MH|SEPANJANG|2026|SUDAH|TIDAK ADA)\b", " ", l))
            if t and not BUANG.search(t) and not re.match(r"^\d{1,3}\s+[A-Z]+_", t):
                r.append(t)
        return r
    antara = []
    for k in range(len(rows)):
        a = rows[k][0]
        b = rows[k + 1][0] if k + 1 < len(rows) else min(len(baris), a + 8)
        antara.append(bebas(a, b))
    awal0 = []
    for l in reversed(baris[max(0, rows[0][0] - 6):rows[0][0]]):
        t = rapikan(re.sub(r"\b(MH|SEPANJANG|2026)\b", " ", l))
        if l == "\x00PAGE" or not t or BUANG.search(t) or t.startswith("ZOM"):
            break
        awal0.insert(0, t)
    atas = [awal0]  # atas[k] = baris sebelum ZOM k
    bawah = []
    for k in range(len(rows)):
        gap = antara[k]
        teks_k = rapikan(data[k][2])
        a_k = atas[k]
        if k + 1 == len(rows):
            bawah.append([g for g in gap[:gap.index(None)] if g] if None in gap else gap)
            continue
        if None in gap:  # batas halaman memutus: sebelum penanda milik k, sesudahnya milik k+1
            q = gap.index(None)
            bawah.append(gap[:q])
            atas.append([g for g in gap[q + 1:] if g])
            continue
        m = len(gap)
        # kandidat: j baris pertama jadi milik k (bawah), sisanya atas k+1
        kand = []
        for j in range(m + 1):
            akhir = gap[j - 1] if j else (teks_k or (a_k[-1] if a_k else ""))
            awl = gap[j] if j < m else rapikan(data[k + 1][2])
            if kalimat_selesai(akhir) and mulai_baru(awl):
                kand.append(j)
        sim = len(a_k)
        if kand:
            j = min(kand, key=lambda j: (abs(j - sim), j))
        else:
            j = min(m, sim)
        bawah.append(gap[:j])
        atas.append(gap[j:])
    for k, (i, no, pf, n, _) in enumerate(rows):
        mm, tipe, kiri = data[k]
        zid = f"{pf}_{n:02d}"
        if not mm:
            continue
        ls = atas[k] + [kiri] + bawah[k]
        frag = []  # sisa kolom data di baris wilayah, mis. "AGT" di satu baris dan "2027" di baris berikutnya (puncak)
        for q, t in enumerate(ls):
            m2 = re.search(rf"\s+(?:({BLN})|(2027))$", t) if (t != kiri or True) else None
            if m2 and (m2.group(1) or m2.group(2)) and t is not kiri:
                frag.append(m2.group(1) or m2.group(2))
                ls[q] = t[:m2.start()]
        wil = rapikan(re.sub(rf"\b(MH|SEPANJANG|2026|2027|SUDAH|TIDAK ADA|{BLN})\b", " ", " ".join(ls)))
        z = {"id": zid, "no": no, "prov": pf, "wilayah": wil}
        aw, ba, sf, pk, bp, pj, bj = mm.groups()
        if aw == "SEPANJANG":  # PDF: "MH SEPANJANG 2026" dipecah ke tiga baris
            aw = "MH SEPANJANG 2026"
        if ba == "SEPANJANG":
            ba = "MH SEPANJANG 2026"
        ds = None if not aw or aw in ("SUDAH MH", "TIDAK ADA MH", "MH SEPANJANG 2026") else aw.split()
        pt = None
        if pk and pk.endswith("2027"):
            pk, pt = pk.split()[0], 2027
        z.update(puncak_tahun=pt, awal=aw, awal_tgl=tgl_awal(ds[0], ds[1]) if ds else None, banding_awal=band(ba), sifat=sf, puncak=pk,
                 banding_puncak=band(bp), panjang_dasarian=int(pj) if pj else None, banding_panjang=band(bj))
        if not z["puncak"]:  # bulan puncak dicetak satu baris di atas baris data dan "2027" di bawahnya (MALUT_12)
            a1, b1 = baris[i - 1].strip(), baris[i + 1].strip() if i + 1 < len(baris) else ""
            if a1 in BULAN and b1 == "2027":
                z["puncak"], z["puncak_tahun"] = a1, 2027
        for f in frag:  # puncak ditulis di baris wilayah (mis. MALUKU_01 'AGT' + '2027')
            if f == "2027" and z["puncak"] and not z["puncak_tahun"]:
                z["puncak_tahun"] = 2027
            elif f in BULAN and not z["puncak"]:
                z["puncak"] = f
        out.append(z)
    return out, gagal


# --- wilayah teks -> kabupaten ------------------------------------------------------------------------------------
ALIAS = {"sidrap": "sidenreng rappang", "pangkep": "pangkajene dan kepulauan", "indargiri": "indragiri", "timut": "timur", "bagaian": "bagian", "oki": "ogan komering ilir", "oku": "ogan komering ulu", "oi": "ogan ilir", "pali": "penukal abab lematang ilir"}
ARAH = {"utara", "selatan", "timur", "barat", "tengah", "laut", "daya", "tenggara"}
STOP = ARAH | {"bawah", "atas", "hilir", "hulu", "lereng", "pesisir", "pantai", "darat", "tepi", "danau", "pegunungan", "luar", "ujung", "di", "kecamatan", "sekitarnya", "sebagian", "besar", "kecil", "bagian", "seluruh", "wilayah", "dan", "serta", "kabupaten", "kab", "kota", "hingga", "kec", "adm", "administrasi"}
KUAT = {"utama": 3, "sebagian": 2, "sebagian kecil": 1}


def kata(s):
    return [w for w in re.findall(r"[a-z0-9]+|[,;]", s.lower().replace("kabupaten/kota", "kabupaten kota").replace("-", " ")) if w not in ("administrasi", "adm")]


def daftar_kab():
    """-> (kab, kec, nama): kab {(prov, kunci_ringkas): [kode]}; kec {(prov, kunci_ringkas): {kode}}; nama {kode: 'prov|Nama'}.
    Kode = prov + nomor urut abjad nama kabupaten dari penduduk.json, SAMA dengan scripts/kekeringan/hth.py kode_kab (internal, bukan BPS)."""
    pend = json.load(open(os.path.join(AKAR, "public/data/penduduk.json")))
    per, kecs = defaultdict(set), []
    for kk in pend["kec"]:
        p, kb, kc = kk.split("|")
        per[p].add(kb)
        kecs.append((p, kb, kc))
    kode = {(p, kb): f"{p}{i:02d}" for p, s in per.items() for i, kb in enumerate(sorted(s), 1)}
    ring = lambda t: "".join(kata(t))
    kab, kec, nama = defaultdict(list), defaultdict(set), {}
    for (p, kb), k in kode.items():
        nama[k] = f"{p}|{kb}"
        kab[(p, ring(kb))].append(k)
        if kb.lower().startswith("kota "):  # 'Kota X' juga dikenali sebagai 'X' bila tak ada kabupaten X
            kab.setdefault((p, "kota:" + ring(kb[5:])), []).append(k)
    for p, kb, kc in kecs:
        kec[(p, ring(kc))].add(kode[(p, kb)])
    return kab, kec, nama


def cari_porsi(awal, akhir, toks, i, j):
    """porsi untuk nama pada toks[i:j]; awal = indeks awal klausa (sesudah koma/;/dan terakhir)."""
    pre = " ".join(toks[awal:i])
    nxt = toks[j] if j < len(toks) else ""
    if "sebagian kecil" in pre:
        return "sebagian kecil"
    if "sebagian besar" in pre or "seluruh" in pre:
        return "utama"
    if "sebagian" in pre or nxt == "bagian" or "bagian" in pre.split() or any(w in ARAH for w in toks[awal:i]):
        return "sebagian"
    return "utama"


def petakan(zoms, tabel):
    kab, kec, _ = tabel
    kab_zom = defaultdict(dict)  # kode -> {zom: porsi}
    tak = defaultdict(list)
    for z in zoms:
        provs = PREFIX[z["prov"]]
        w = re.sub(r"\(([^)]*)\)?", " bagian ", z["wilayah"])  # isi kurung = kecamatan: kabupatennya sebagian
        t = []
        for x in kata(re.sub(r"(?i)mamuju utara", "pasangkayu", w)):  # nama lama = Pasangkayu di repo
            t.extend(kata(ALIAS[x]) if x in ALIAS else [x])
        i, awal, sisa = 0, 0, []
        while i < len(t):
            if t[i] in (",", ";", "dan", "serta"):
                awal = i + 1
                i += 1
                continue
            hit = None
            for n in range(min(6, len(t) - i), 0, -1):
                c = "".join(t[i:i + n])
                ks = [k for p in provs for k in kab.get((p, c), [])] or [k for p in provs for k in kab.get((p, "kota:" + c), [])]
                if ks:
                    hit = (n, ks)
                    break
            if hit:
                por = cari_porsi(awal, None, t, i, i + hit[0])
                for k in hit[1]:
                    if KUAT[por] > KUAT.get(kab_zom[k].get(z["id"]), 0):
                        kab_zom[k][z["id"]] = por
                i += hit[0]
            else:
                sisa.append((awal, i, t[i]))
                i += 1
        # sisa kata tak dikenal: kelompokkan berurutan, coba sebagai nama kecamatan (tiap kecamatan -> kabupatennya, 'sebagian')
        grup, cur = [], []
        for aw, ix, wd in sisa:
            if wd in STOP or wd in (",", ";"):
                if cur:
                    grup.append(cur)
                cur = []
            elif cur and ix != cur[-1][1] + 1:
                grup.append(cur)
                cur = [(aw, ix, wd)]
            else:
                cur.append((aw, ix, wd))
        if cur:
            grup.append(cur)
        for g in grup:
            fr = " ".join(x[2] for x in g)
            ks = set()
            for p in provs:
                ks |= kec.get((p, "".join(x[2] for x in g)), set())
            if ks:
                for k in ks:
                    if KUAT["sebagian"] > KUAT.get(kab_zom[k].get(z["id"]), 0):
                        kab_zom[k][z["id"]] = "sebagian"
            else:
                tak[z["id"]].append(fr)
    return {k: [{"zom": zi, "porsi": pr} for zi, pr in v.items()] for k, v in kab_zom.items()}, tak


def muat():
    return json.load(open(KELUAR))


def urai(path):
    z, gagal = urai_teks(_bagian_zom(open(path, encoding="utf-8").read().split("\n")))
    assert not gagal, f"gagal urai: {gagal}"
    assert len(z) == 699, f"jumlah ZOM {len(z)} != 699"
    assert [x["no"] for x in z] == list(range(1, 700)), "nomor ZOM tidak berurutan"
    tabel = daftar_kab()
    nama = tabel[2]
    kz, tak = petakan(z, tabel)
    d = {"sumber": SUMBER, "musim": f"{MUSIM}/{MUSIM + 1}", "n_zom": len(z),
         "catatan": "awal_tgl = dasarian I=tgl 1, II=11, III=21; perbandingan terhadap normal apa adanya dari BMKG (nilai normal tidak ada di tabel). "
                    "Zona tanpa awal musim (zona hanya 1 musim) hanya punya sifat dan puncak. kab = kode internal kode_kab hth.py (bukan BPS).",
         "zom": z, "kab_nama": {k: nama[k] for k in kz}, "kab_zom": dict(sorted(kz.items())),
         "tak_cocok": {k: v for k, v in sorted(tak.items())}}
    os.makedirs(os.path.dirname(KELUAR), exist_ok=True)
    tmp = KELUAR + ".tmp"
    json.dump(d, open(tmp, "w"), ensure_ascii=False, indent=1)
    os.replace(tmp, KELUAR)
    n_tak = sum(len(v) for v in tak.values())
    print(f"zom {len(z)}; kab terpetakan {len(kz)}/{len(nama)}; nama tak cocok {n_tak} di {len(tak)} ZOM -> {KELUAR}")
    for k, v in tak.items():
        print("  tak cocok", k, sorted(v))


def _bagian_zom(L):
    """Tabel ZOM = dari baris ZOM 1 sampai baris ZOM 699 + wilayah bawahnya (sebelum 'Catatan')."""
    a = next(i for i, l in enumerate(L) if re.match(r"^\s*1\s+ACEH_\s?01\b", l))
    b = next(i for i in range(a, len(L)) if re.match(r"^\s*699\s+PAPSEL_\s?13\b", L[i]))
    return L[max(0, a - 6):b + 4]


# --- A8 fase musim ------------------------------------------------------------------------------------------------
def pilih_zom(entri, zmap):
    """ZOM utama kabupaten (porsi 'utama'), bila tak ada yang pertama."""
    for e in entri:
        if e["porsi"] == "utama":
            return zmap[e["zom"]]
    return zmap[entri[0]["zom"]] if entri else None


def fase(kab, tanggal, d=None):
    """-> {zom, hari_sejak_awal, kelas} untuk kode kab dan tanggal (date/ISO). kelas: peralihan (|hari| <= 30), puncak (bulan puncak),
    lainnya; None bila kab tak punya ZOM atau ZOM tanpa awal musim."""
    d = d or muat()
    zmap = {z["id"]: z for z in d["zom"]}
    z = pilih_zom(d["kab_zom"].get(kab, []), zmap)
    if not z:
        return None
    t = date.fromisoformat(tanggal) if isinstance(tanggal, str) else tanggal
    hari = (t - date.fromisoformat(z["awal_tgl"])).days if z["awal_tgl"] else None
    if hari is not None and abs(hari) <= 30:
        kls = "peralihan"
    elif BULAN[t.month - 1] == z["puncak"]:
        kls = "puncak"
    else:
        kls = "lainnya"
    return {"zom": z["id"], "hari_sejak_awal": hari, "kelas": kls}


def tulis_fase(tanggal):
    d = muat()
    hasil = {k: f for k in d["kab_zom"] if (f := fase(k, tanggal, d))}
    out = {"tanggal": tanggal, "sumber": d["sumber"], "kab": hasil}
    tmp = FASE + ".tmp"
    json.dump(out, open(tmp, "w"), ensure_ascii=False, separators=(",", ":"))
    os.replace(tmp, FASE)
    kls = defaultdict(int)
    for f in hasil.values():
        kls[f["kelas"]] += 1
    print(f"fase {tanggal}: {len(hasil)} kab, {dict(kls)} -> {FASE}")


def uji():
    z, gagal = urai_teks(open(FIXTURE, encoding="utf-8").read().split("\n"))
    assert not gagal, gagal
    m = {x["id"]: x for x in z}
    a = m["JABAR_19"]
    assert (a["awal"], a["banding_awal"], a["sifat"], a["puncak"], a["banding_puncak"], a["panjang_dasarian"], a["banding_panjang"]) == \
        ("NOV II", "MUNDUR >3", "N", "FEB", "MAJU >1", 17, "LEBIH PENDEK ≥3"), a
    assert a["awal_tgl"] == "2026-11-11"
    assert a["wilayah"] == "Sebagian kecil Bandung bagian barat, Bandung Barat bagian selatan, sebagian kecil Cianjur bagian tengah", a["wilayah"]
    b = m["JABAR_20"]
    assert (b["awal"], b["banding_awal"], b["sifat"], b["puncak"], b["banding_puncak"], b["panjang_dasarian"], b["banding_panjang"]) == \
        ("NOV III", "MUNDUR 3", "AN", "FEB", "MAJU 1", 16, "LEBIH PENDEK ≥3"), b
    assert b["wilayah"] == "Bandung, Bandung Barat bagian timur, Kota Bandung, Kota Cimahi, sebagian kecil Sumedang bagian barat daya", b["wilayah"]
    c = m["JABAR_16"]  # zona tanpa awal musim
    assert c["awal"] is None and (c["sifat"], c["puncak"], c["banding_puncak"]) == ("BN", "FEB", "MUNDUR >1"), c
    assert fase_dari(b, "2026-11-21")["kelas"] == "peralihan"
    print("uji zom ok:", len(z), "ZOM fixture")


def fase_dari(z, tanggal):  # untuk uji tanpa berkas keluaran
    d = {"zom": [z], "kab_zom": {"x": [{"zom": z["id"], "porsi": "utama"}]}}
    return fase("x", tanggal, d)


if __name__ == "__main__":
    a = sys.argv[1:]
    if a[:1] == ["urai"] and len(a) == 2:
        urai(a[1])
    elif a[:1] == ["fase"] and len(a) == 2:
        tulis_fase(a[1])
    elif a[:1] == ["uji"]:
        uji()
    else:
        sys.exit(__doc__)
