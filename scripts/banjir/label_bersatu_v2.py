"""Label banjir bersatu v2: kejadian kab-hari (dan kecamatan-hari) dengan TINGKAT KEYAKINAN dan penanda "tak teramati". Luring, stdlib.

v1 (label_bersatu.py) satu kolom per sumber, tanpa vonis. v2 menambah dedup antarsumber, keyakinan bertingkat, dan cakupan. v1 TIDAK disentuh:
sha256 berkas keluaran v1 dicek sebelum dan sesudah (kunci model hulu); v2 menulis HANYA ke data/raw/banjir/label_bersatu_v2/ dan
public/banjir/data/label_bersatu_v2_ringkas.json. Parser sumber diimpor dari v1 (satu kunci nama 'pp|Nama' lewat Kunci.cocok), tidak disalin.

ATURAN (ditetapkan sebelum melihat hasil; DIREVISI 1 Nov 2026 sesudah tinjauan cakupan, sebelum label dipakai menilai model mana pun;
revisi berikutnya sesudah label dipakai menilai model = v3):
1. Sumber positif per kunci (kab 'pp|Nama'; kecamatan 'pp|Kab|Kec'):
   dibi     DIBI banjir/bandang, kejadian >= 1 (resmi, terisi susulan).
   lb       logbook Pusdalops jenis banjir, SATU hari mulai per kejadian per kab (resmi). lb_dampak = kejadian itu punya angka dampak
            (rumah, rumah_rb/rs/rr, rumah_terendam atau ha > 0). Jendela aktif v1 (lb_aktif) tidak dipakai (turunan, bukan kejadian baru).
   gs       Google Groundsource, poligon -> kecamatan (berita). gs_n = jumlah poligon.
   berita   artikel public/banjir/data/berita.json yang berkab/berkec, bertopik 'kejadian' atau 'korban', judul TANPA kata masa depan/
            pencegahan (potensi, prakiraan, waspada, antisipasi, siaga, mitigasi, cegah, jelang). Hari = tanggal terbit WIB. berita_n = artikel.
   pb       PetaBencana (data/raw/banjir/genangan/petabencana_banjir.json, laporan warga DKI dll yang sudah dibersihkan simulasi/latihan),
            dipetakan titik -> kecamatan. Jendela uji J3 (PRAREG-J3) DIBUANG segera setelah baca lewat tanpa_j3(jendela_j3()) dan HARI-harinya
            tidak dihitung terliput; keluaran hanya menyebut "dikecualikan: jendela uji J3 terkunci". pb_n = laporan.
   Tidak dihitung (hanya dicatat belum layak): GFM (pilot 34 kab-hari), MODIS MCDWD (tanpa ambang, 90 hari), arsip pos SIHKA (tinggi muka air
   sejak 19 Okt 2026, bukan label kejadian), laporan warga D1 /warga (tak ada ekspor di repo; jangan query D1 produksi tanpa PK).
2. GRUP: RESMI = {dibi, lb} (keduanya kanal BNPB, independensi TAK terbukti: satu grup), MEDIA = {gs, berita} (turunan berita: satu grup),
   WARGA = {pb}.
3. Dedup antarsumber: per kunci, hari-hari positif dari semua sumber digugus BERJANGKAR: gugus mulai dari hari paling awal yang belum masuk
   gugus, memuat hari <= jangkar + 1 (selang +-1 hari; TIDAK berantai, jadi gugus maks 2 hari). Satu gugus = satu kejadian; tanggal = jangkar.
4. KEYAKINAN per kejadian:
   TINGGI  RESMI+MEDIA, RESMI+WARGA, atau LB dengan angka dampak (lb_dampak). dibi+lb TANPA grup lain = SEDANG.
   SEDANG  RESMI saja (dibi dan/atau lb).
   RENDAH  tanpa RESMI: media/warga saja (gs+berita satu grup; media+warga tetap RENDAH).
   tinggi_tanpa_media = TINGGI tanpa gs/berita (LB berdampak, atau RESMI+WARGA): dasar uji yang stabil antartahun (laju gs tumbuh ~5x).
5. TAK TERAMATI: hari (dan kab) yang tidak diliput sumber mana pun BUKAN 0 dan BUKAN negatif. Per kab: kab-tahun terliput media hanya bila
   >= 5 poligon Groundsource tahun itu (ambang ditetapkan 1 Nov 2026); di bawahnya hari tanpa kejadian = tak_teramati (kecuali DKI pada
   rentang pb), di atasnya = tidak_ada_laporan. Cakupan sumber: lb = hari yang punya berkas arsip
   logbook; dibi dan gs = tahun padat 2016-2025 (PADAT v1); berita = rentang tanggal artikel di berita.json; pb = hanya prov 31 (DKI) pada
   rentang datanya di luar jendela J3. Kelas hari: tak_teramati | tidak_ada_laporan (terliput tapi tak ada kejadian, negatif LEMAH karena bias
   media) | TINGGI/SEDANG/RENDAH.
6. episode = rantai kejadian per kunci tanpa putus (hari berikutnya <= akhir + 1), batas 14 hari sejak awal; gugus 2 hari tetap ada. BARIS
   BUKAN JUMLAH BANJIR: hitung per episode. parsial_2026 = 1 untuk baris 2026 (DIBI belum terisi susulan, tahun berjalan).
   jendela_j3 = 1 bila hari jangkar di jendela uji J3 (jendela_j3(), SEMUA sumber, bukan hanya pb): jangan dipakai menilai apa pun.
Pakai: python3 scripts/banjir/label_bersatu_v2.py susun | uji
"""
import csv, datetime as dt, gzip, hashlib, json, os, re, sys
from collections import Counter, defaultdict

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import label_bersatu as V1
import label_kec as LK
import lab_genangan_radar as LAB

P = V1.P
DIR = P("data/raw/banjir/label_bersatu_v2")
OUT_KAB, OUT_KEC, OUT_HARI = (os.path.join(DIR, f) for f in ("kab_hari.csv.gz", "kec_hari.csv.gz", "cakupan_hari.csv.gz"))
OUT_JSON = P("public/banjir/data/label_bersatu_v2_ringkas.json")
BERITA, PB = P("public/banjir/data/berita.json"), P("data/raw/banjir/genangan/petabencana_banjir.json")
V1_BERKAS = [V1.OUT_CSV, V1.OUT_HARI, V1.OUT_JSON]
SUMBER = ["dibi", "lb", "gs", "berita", "pb"]
GRUP = {"dibi": "RESMI", "lb": "RESMI", "gs": "MEDIA", "berita": "MEDIA", "pb": "WARGA"}
TINGKAT = ["TINGGI", "SEDANG", "RENDAH"]
MULAI_HARI = dt.date(2011, 1, 1)
MIN_GS_KAB_TAHUN, MAKS_EPISODE = 5, 14
MEDIA = ("gs", "berita")
R_BUANG = re.compile(r"potensi|prakiraan|diprakirakan|waspada|antisipasi|siaga|mitigasi|cegah|jelang", re.I)
TOPIK = {"kejadian", "korban"}
DAMPAK_KOL = ["rumah", "rumah_rb", "rumah_rs", "rumah_rr", "rumah_terendam", "ha"]


def sha_v1():
    return {p: hashlib.sha256(open(p, "rb").read()).hexdigest() if os.path.exists(p) else None for p in V1_BERKAS}


# ------------------------------------------------------------------ sumber tambahan (v1 dipanggil untuk dibi, logbook, gs)
def positif(x):
    try:
        return float(x or 0) > 0
    except ValueError:
        return False


def dampak_logbook(rows, K):
    """{kab: set(hari mulai)} untuk kejadian banjir berangka dampak; hari mulai dihitung oleh dari_logbook v1 (aturan tanggal yang sama)."""
    out = defaultdict(set)
    for r in rows:
        if r["jenis"] == "banjir" and any(positif(r.get(c)) for c in DAMPAK_KOL):
            for k, hs in V1.dari_logbook([r], K, Counter())[0].items():
                out[k] |= hs
    return out


def dari_berita(artikel, K, tak):
    """-> ({kab: {date: n}}, {kec: {date: n}}, (awal, akhir) rentang artikel)."""
    kab, kec, ds = defaultdict(Counter), defaultdict(Counter), []
    for a in artikel:
        d = V1.tgl(a.get("tgl"))
        if d:
            ds.append(d)
        if not d or not TOPIK & set(a.get("topik", [])) or R_BUANG.search(a.get("judul", "")):
            continue
        for k0 in a.get("kab", []):
            k = K.cocok(k0)
            if k:
                kab[k][d] += 1
            else:
                tak[k0] += 1
        for k0 in a.get("kec", []):
            kec[k0][d] += 1
    return kab, kec, ((min(ds), max(ds)) if ds else None)


def saring_pb(laporan):
    """Buang laporan di jendela uji J3 segera setelah baca (PRAREG-J3); -> (sisa, hari_dikecualikan set)."""
    return LAB.tanpa_j3(laporan, LAB.jendela_j3()), hari_j3()


def dari_pb(laporan, K, kec_cari, tak):
    """-> ({kab: {date: n}}, {kec: {date: n}}, (awal, akhir), hari_dikecualikan). kec_cari(lon, lat) -> 'pp|Kab|Kec' atau None."""
    laporan, ex = saring_pb(laporan)
    kab, kec, ds = defaultdict(Counter), defaultdict(Counter), []
    for r in laporan:
        d = V1.tgl(r["t"])
        if not d:
            continue
        ds.append(d)
        kc = kec_cari(r["lon"], r["lat"])
        k = K.cocok("|".join(kc.split("|")[:2])) if kc else None
        if not k:
            tak["luar_kecamatan"] += 1
            continue
        kab[k][d] += 1
        kec[kc][d] += 1
    return kab, kec, ((min(ds), max(ds)) if ds else None), ex


# ------------------------------------------------------------------ gugus, keyakinan, cakupan
def klaster(S, dampak=None):
    """S {sumber: {kunci: {date: n}}} -> [{tanggal, kunci, n:{sumber:total}, lb_dampak}] gugus berjangkar +1 hari (aturan 3)."""
    per = defaultdict(lambda: defaultdict(dict))
    for s, m in S.items():
        for k, hs in m.items():
            for d, n in (hs.items() if isinstance(hs, dict) else ((d, 1) for d in hs)):
                per[k][d][s] = n
    out = []
    for k, hari in per.items():
        g = None
        for d in sorted(hari):
            if g is None or (d - g["tanggal"]).days > 1:
                g = {"tanggal": d, "kunci": k, "akhir": d, "n": Counter(), "lb_dampak": False}
                out.append(g)
            g["akhir"] = d
            for s, n in hari[d].items():
                g["n"][s] += n
            g["lb_dampak"] |= d in (dampak or {}).get(k, ()) and "lb" in hari[d]
    ep = {}   # kunci -> (awal, akhir) episode berjalan; gugus sudah terurut per kunci menurut jangkar
    for g in out:
        a = ep.get(g["kunci"])
        if a and (g["tanggal"] - a[1]).days <= 1 and (g["akhir"] - a[0]).days < MAKS_EPISODE:
            ep[g["kunci"]] = a = (a[0], g["akhir"])
        else:
            ep[g["kunci"]] = a = (g["tanggal"], g["akhir"])
        g["episode"] = a[0]
    return sorted(out, key=lambda g: (g["tanggal"], g["kunci"]))


def tingkat(ada, lb_dampak=False):
    """aturan 4; ada = set sumber positif."""
    g = {GRUP[s] for s in ada}
    if ("RESMI" in g and len(g) >= 2) or (lb_dampak and "lb" in ada):
        return "TINGGI"
    return "SEDANG" if "RESMI" in g else "RENDAH"


def tinggi_tanpa_media(ada, lb_dampak=False):
    return tingkat(ada, lb_dampak) == "TINGGI" and not set(MEDIA) & set(ada)


def hari_j3():
    """hari-hari jendela uji J3 (semua sumber ditandai jendela_j3)."""
    return {(a + dt.timedelta(i)).date() for a, b in LAB.jendela_j3() for i in range(int((b - a).total_seconds() // 86400) + 1)}


class Cakupan:
    """aturan 5. hari_lb = set date arsip logbook; berita/pb = (awal, akhir) atau None; pb_ex = hari J3 yang dikecualikan."""
    def __init__(self, hari_lb, berita, pb, pb_ex=(), gs_kab_tahun=None):
        self.lb, self.berita, self.pb, self.pb_ex = set(hari_lb), berita, pb, set(pb_ex)
        self.gs_kt = gs_kab_tahun or {}

    def kab_terliput(self, d, kunci):
        """negatif per kab: media >= MIN_GS_KAB_TAHUN poligon gs di kab-tahun itu, atau DKI pada rentang pb."""
        return (d.year in V1.PADAT["gs"] and self.gs_kt.get((kunci, d.year), 0) >= MIN_GS_KAB_TAHUN) or self.ada("pb", d, kunci.split("|")[0])

    def ada(self, s, d, prov=None):
        if s == "lb":
            return d in self.lb
        if s in ("dibi", "gs"):
            return d.year in V1.PADAT[s]
        r = self.berita if s == "berita" else self.pb
        return bool(r) and r[0] <= d <= r[1] and (s == "berita" or (prov == "31" and d not in self.pb_ex))

    def teramati(self, d, prov=None):
        return any(self.ada(s, d, prov) for s in SUMBER)


def kelas_hari(C, d, kunci, ada_kejadian):
    """ada_kejadian = tingkat gugus bila ada, selain itu None. Negatif memakai cakupan PER KAB (kab_terliput)."""
    if ada_kejadian:
        return ada_kejadian
    return "tidak_ada_laporan" if C.kab_terliput(d, kunci) else "tak_teramati"


def tumpang(G, C, a, b, bulan=None):
    """Dari kejadian yang punya sumber a (hari jangkar terliput b), berapa yang juga punya b. Tanpa cakupan b = tak dihitung (bukan 0%)."""
    na = nb = 0
    for g in G:
        if a in g["n"] and C.ada(b, g["tanggal"], g["kunci"].split("|")[0]) and (not bulan or g["tanggal"].month in bulan):
            na += 1
            nb += b in g["n"]
    return {"n_a": na, "n_ada_b": nb, "persen": round(100 * nb / na, 1) if na else None}


# ------------------------------------------------------------------ susun
def susun():
    awal = sha_v1()
    K, tak = V1.Kunci(V1.semesta()), defaultdict(Counter)
    rows_lb = list(csv.DictReader(open(V1.CSV_LB, encoding="utf-8")))
    lb, _, st_lb = V1.dari_logbook(rows_lb, K, tak["logbook"])
    damp = dampak_logbook(rows_lb, K)
    hari_lb = {dt.date.fromisoformat(d) for ds in V1.hari_tercakup().values() for d in ds}
    dibi = V1.dari_dibi(json.load(open(V1.DIBI)), K, tak["dibi"])
    di_dalam, bag = LK.muat_kec()
    idx = LK.indeks(bag)
    ev, _ = LK.petakan(json.load(gzip.open(LK.POLI, "rt")), di_dalam, bag, idx)
    ev = [e for e in ev if e["d0"][:4].isdigit() and int(e["d0"][:4]) >= 2016]
    gs_kab, gs_kec = defaultdict(Counter), defaultdict(Counter)
    for e in ev:
        d, k = V1.tgl(e["d0"]), K.cocok("|".join(e["kec"].split("|")[:2]))
        if d and k:
            gs_kab[k][d] += 1
            gs_kec[e["kec"]][d] += 1
        elif not k:
            tak["gs"][e["kec"]] += 1
    b_kab, b_kec, b_rng = dari_berita(json.load(open(BERITA))["artikel"], K, tak["berita"])
    p_kab, p_kec, p_rng, p_ex = dari_pb(json.load(open(PB)), K, lambda x, y: LK.cari(di_dalam, bag, idx, x, y), tak["pb"])
    gs_kt = Counter()
    for k, hs in gs_kab.items():
        for d, n in hs.items():
            gs_kt[(k, d.year)] += n
    C = Cakupan(hari_lb, b_rng, p_rng, p_ex, gs_kt)
    J3 = hari_j3()
    G = klaster({"dibi": dibi, "lb": lb, "gs": gs_kab, "berita": b_kab, "pb": p_kab}, damp)
    GK = klaster({"gs": gs_kec, "berita": b_kec, "pb": p_kec})
    os.makedirs(DIR, exist_ok=True)

    def tulis(jalur, kolom, baris):
        with gzip.open(jalur, "wt", newline="") as f:
            w = csv.writer(f)
            w.writerow(kolom)
            w.writerows(baris)

    def baris(g):
        ada = set(g["n"])
        return [g["tanggal"].isoformat(), g["kunci"], g["kunci"].split("|")[0], *(int(s in ada) for s in SUMBER), g["n"]["gs"], g["n"]["berita"], g["n"]["pb"],
                int(g["lb_dampak"]), len({GRUP[s] for s in ada}), tingkat(ada, g["lb_dampak"]), int(tinggi_tanpa_media(ada, g["lb_dampak"])),
                g["episode"].isoformat(), int(g["tanggal"].year == 2026), int(g["tanggal"] in J3)]
    kol = ["tanggal", "kunci", "prov", *SUMBER, "gs_n", "berita_n", "pb_n", "lb_dampak", "n_grup", "keyakinan", "tinggi_tanpa_media", "episode", "parsial_2026", "jendela_j3"]
    tulis(OUT_KAB, kol, [baris(g) for g in G])
    tulis(OUT_KEC, kol, [baris(g) for g in GK])
    hari, d = [], MULAI_HARI
    while d <= dt.date.today():
        hari.append([d.isoformat(), *(int(C.ada(s, d, None)) for s in SUMBER[:4]), int(C.ada("pb", d, "31")), int(not C.teramati(d))])
        d += dt.timedelta(1)
    tulis(OUT_HARI, ["tanggal", "dibi", "lb", "gs", "berita", "pb_dki", "tak_teramati"], hari)

    def per_tahun(L):
        t = defaultdict(Counter)
        for g in L:
            t[str(g["tanggal"].year)][tingkat(set(g["n"]), g["lb_dampak"])] += 1
        return {y: {**{k: t[y][k] for k in TINGKAT}, "jumlah": sum(t[y].values())} for y in sorted(t)}

    def tinggi_th(L):
        t = defaultdict(Counter)
        for g in L:
            ada = set(g["n"])
            if tingkat(ada, g["lb_dampak"]) == "TINGGI":
                t[str(g["tanggal"].year)]["tinggi_tanpa_media" if tinggi_tanpa_media(ada, g["lb_dampak"]) else "tinggi_dengan_media"] += 1
        return {y: {**t[y], "pangsa_media_persen": round(100 * t[y]["tinggi_dengan_media"] / sum(t[y].values()), 1)} for y in sorted(t)}

    def gs_dist():
        out = {}
        for y in range(2016, 2026):
            v = sorted(n for (k, yy), n in gs_kt.items() if yy == y)
            q = lambda f: v[min(len(v) - 1, int(f * len(v)))] if v else None
            out[str(y)] = {"kab_dengan_gs": len(v), "kab_semesta": len(K.semesta), "kab_terliput_ge5": sum(n >= MIN_GS_KAB_TAHUN for n in v),
                           "gs_n_median": q(0.5), "gs_n_p90": q(0.9), "gs_n_maks": v[-1] if v else None}
        return out

    def episode_th(L):
        e = defaultdict(set)
        for g in L:
            e[str(g["tanggal"].year)].add((g["kunci"], g["episode"]))
        return {y: len(e[y]) for y in sorted(e)}
    cak = {}
    for s in SUMBER:
        c = defaultdict(lambda: {"kejadian": 0, "hari_terliput": 0})
        for g in G:
            c[str(g["tanggal"].year)]["kejadian"] += s in g["n"]
        for h in hari:
            c[h[0][:4]]["hari_terliput"] += h[1 + SUMBER.index(s)] if s != "pb" else h[5]
        cak[s] = {y: c[y] for y in sorted(c)}
    hujan = {11, 12, 1, 2, 3, 4}
    silang = {f"{a}>{b}": tumpang(G, C, a, b) for a in SUMBER for b in SUMBER if a != b}
    for a, b in (("dibi", "lb"), ("lb", "dibi")):
        silang[f"{a}>{b}_musim_hujan_nov_apr"] = tumpang(G, C, a, b, hujan)
    tak_th = Counter(h[0][:4] for h in hari if h[6])
    lb_hari = Counter(h[0][:4] for h in hari if h[2])
    ring = {
        "dibuat": dt.date.today().isoformat(),
        "satuan": "kejadian = gugus kab-hari berjangkar +1 hari; kecamatan terpisah (hanya gs, berita, pb)",
        "aturan_direvisi": "1 Nov 2026 sesudah tinjauan cakupan, sebelum label dipakai menilai model mana pun",
        "aturan_keyakinan": {"TINGGI": "RESMI+MEDIA, RESMI+WARGA, atau logbook dengan angka dampak", "SEDANG": "RESMI saja (dibi dan/atau logbook; satu grup, independensi tak terbukti)",
                             "RENDAH": "tanpa RESMI: media (gs, berita) atau warga (pb) saja",
                             "tinggi_tanpa_media": "TINGGI tanpa gs/berita (logbook berdampak atau RESMI+WARGA): dasar uji stabil antartahun",
                             "grup": {"RESMI": ["dibi", "lb"], "MEDIA": ["gs", "berita"], "WARGA": ["pb"]}},
        "negatif_per_kab": f"kab-tahun terliput media hanya bila >= {MIN_GS_KAB_TAHUN} poligon Groundsource; di bawahnya hari tanpa kejadian = tak_teramati, bukan tidak_ada_laporan (negatif lemah)",
        "episode": f"baris BUKAN jumlah banjir; hitung per episode (rantai per kab tanpa putus, maks {MAKS_EPISODE} hari)",
        "penanda": "parsial_2026 = tahun berjalan; jendela_j3 = hari di jendela uji J3 pada SEMUA sumber: dikecualikan, jangan dipakai menilai",
        "sumber": {"dibi": "DIBI BNPB banjir+bandang (tanggal laporan, terisi susulan)", "lb": "logbook Pusdalops, hari mulai per kab (CSV sekarang sampai 2026; hari tercakup dari arsip, 2011-2013 dan 2022-2023 parsial)",
                   "gs": "Google Groundsource 2016-2025 (berita, poligon->kecamatan)", "berita": "berita.json 1.500 artikel berkab, rentang pendek",
                   "pb": "PetaBencana laporan warga (DKI dan sekitarnya); dikecualikan: jendela uji J3 terkunci"},
        "belum_layak": {"gfm": "pilot 34 kab-hari", "mcdwd": "tanpa ambang, 90 hari", "arsip_pos_sihka": "tinggi muka air sejak 19 Okt 2026, bukan label kejadian",
                        "laporan_warga_d1": "tak ada ekspor di repo; query D1 produksi butuh PK (kuota baca)"},
        "kejadian_kab_per_tahun_per_tingkat": per_tahun(G),
        "kejadian_kec_per_tahun_per_tingkat": per_tahun(GK),
        "tinggi_dengan_dan_tanpa_media_per_tahun": tinggi_th(G),
        "episode_kab_per_tahun": episode_th(G),
        "groundsource_per_kab_tahun": gs_dist(),
        "lb_hari_tercakup_per_tahun": {y: lb_hari[y] for y in sorted(lb_hari)},
        "cakupan_per_sumber_per_tahun": cak,
        "hari_tak_teramati_per_tahun": {y: tak_th[y] for y in sorted(tak_th)},
        "tumpang_tindih_persen": silang,
        "kab_tak_cocok": {s: {"jumlah_baris": sum(c.values()), "kunci_unik": len(c)} for s, c in tak.items()},
        "catatan": ["Teramati = ada sumber yang beroperasi padat, BUKAN bukti negatif: media dan logbook bias ke tempat ber-media/dilaporkan.",
                    "Tumpang-tindih A>B = persen kejadian bersumber A (hari jangkar terliput B) yang juga punya B; tanpa cakupan B tidak dihitung.",
                    "Berita hanya rentang artikel di berita.json (sepuluh hari, Oktober 2026): bukan arsip; pb hanya DKI.",
                    "gs dan berita satu grup (keduanya berita); jangan dihitung dua sumber independen."],
        "baris": {"kab": len(G), "kec": len(GK), "logbook_n_pasangan": st_lb["n_pasangan"]},
    }
    json.dump(ring, open(OUT_JSON, "w"), ensure_ascii=False, indent=1)
    assert sha_v1() == awal, "berkas v1 berubah: batal"
    print(json.dumps({k: ring[k] for k in ("baris", "kejadian_kab_per_tahun_per_tingkat", "hari_tak_teramati_per_tahun", "tumpang_tindih_persen")}, ensure_ascii=False))


# ------------------------------------------------------------------ uji
def uji():
    awal = sha_v1()
    K = V1.Kunci({"35|Bojonegoro", "32|Bogor", "31|Jakarta Selatan"})
    D = lambda s: dt.date.fromisoformat(s)
    # normalisasi nama lintas sumber: DIBI 'Kab. Bojonegoro' dan logbook 'Bojonegoro' bertemu di satu kunci
    d = V1.dari_dibi([[["banjir"], "35", "Kab. Bojonegoro", "2020-01-02", 1]], K, Counter())
    lb = V1.dari_logbook([{"jenis": "banjir", "tgl_kejadian": "2020-01-03", "pertama_dicatat": "2020-01-03", "terakhir_dicatat": "2020-01-03",
                           "kab_kode": "35|Bojonegoro"}], K, Counter())[0]
    assert set(d) == set(lb) == {"35|Bojonegoro"}
    # dedup selang 1 hari: dibi 2 Jan + lb 3 Jan = SATU kejadian; 4 Jan masuk gugus baru (jangkar, tak berantai)
    G = klaster({"dibi": d, "lb": {"35|Bojonegoro": {D("2020-01-03"), D("2020-01-04")}}})
    assert [(g["tanggal"].isoformat(), sorted(g["n"])) for g in G] == [("2020-01-02", ["dibi", "lb"]), ("2020-01-04", ["lb"])], G
    # keyakinan; pembeda revisi: dibi+lb (satu grup RESMI) SEDANG, dibi+gs TINGGI, gs+berita dan gs+pb (tanpa resmi) RENDAH
    assert tingkat({"dibi", "lb"}) == "SEDANG" and tingkat({"dibi", "gs"}) == "TINGGI" and tingkat({"lb", "pb"}) == "TINGGI"
    assert tingkat({"gs", "berita"}) == "RENDAH" and tingkat({"gs", "pb"}) == "RENDAH"
    assert tinggi_tanpa_media({"lb"}, True) and tinggi_tanpa_media({"dibi", "pb"}) and not tinggi_tanpa_media({"dibi", "gs"}) and not tinggi_tanpa_media({"dibi"})
    assert tingkat({"dibi"}) == "SEDANG" and tingkat({"lb"}) == "SEDANG" and tingkat({"lb"}, True) == "TINGGI" and tingkat({"pb"}) == "RENDAH"
    assert tingkat({"dibi"}, True) == "SEDANG"   # dampak hanya naik bila logbook yang positif
    dm = {"35|Bojonegoro": {D("2020-01-03")}}
    assert klaster({"lb": {"35|Bojonegoro": {D("2020-01-03")}}}, dm)[0]["lb_dampak"] and not klaster({"lb": {"35|Bojonegoro": {D("2020-01-03")}}})[0]["lb_dampak"]
    # tak teramati bukan 0 dan bukan 'tidak_ada_laporan'
    C = Cakupan({D("2018-02-01")}, (D("2026-10-07"), D("2026-10-16")), (D("2017-01-01"), D("2025-12-31")), {D("2024-08-17")},
                {("35|Bojonegoro", 2018): 5, ("32|Bogor", 2018): 4})
    assert kelas_hari(C, D("2012-05-05"), "35|Bojonegoro", None) == "tak_teramati" != 0
    assert kelas_hari(C, D("2018-06-05"), "35|Bojonegoro", None) == "tidak_ada_laporan"      # >= 5 poligon gs di kab-tahun itu
    assert kelas_hari(C, D("2018-06-05"), "32|Bogor", None) == "tak_teramati"                 # 4 < 5: media tak meliput kab-tahun ini
    assert kelas_hari(C, D("2026-03-05"), "35|Bojonegoro", None) == "tak_teramati" and kelas_hari(C, D("2020-01-03"), "35|Bojonegoro", "SEDANG") == "SEDANG"
    assert not C.ada("pb", D("2020-01-03"), "35") and C.ada("pb", D("2020-01-03"), "31") and not C.ada("pb", D("2024-08-17"), "31")
    # episode: rantai +1 hari tanpa putus, gugus 2 hari tetap ada, batas 14 hari; kab berbeda tak tercampur
    h = lambda a, b: {D("2020-02-%02d" % i) for i in range(a, b + 1)}
    Ge = klaster({"lb": {"35|Bojonegoro": h(1, 20), "32|Bogor": {D("2020-02-01"), D("2020-02-05")}}})
    ep = {(g["kunci"], g["tanggal"].day): g["episode"].day for g in Ge}
    assert [g["tanggal"].day for g in Ge if g["kunci"] == "35|Bojonegoro"] == [1, 3, 5, 7, 9, 11, 13, 15, 17, 19]      # gugus 2 hari
    assert ep[("35|Bojonegoro", 13)] == 1 and ep[("35|Bojonegoro", 15)] == 15 and ep[("35|Bojonegoro", 19)] == 15    # putus di 14 hari
    assert ep[("32|Bogor", 1)] == 1 and ep[("32|Bogor", 5)] == 5
    # jendela J3 menandai SEMUA sumber (dari jendela_j3 yang ada), bukan hanya pb
    J3 = hari_j3()
    assert D("2024-08-17") in J3 and D("2025-04-23") in J3 and D("2024-08-25") not in J3
    # tumpang: tanpa cakupan b -> tak dihitung (None), bukan 0%
    Gt = klaster({"dibi": {"k|X": {D("2012-01-01")}}, "lb": {"k|Y": {D("2018-02-01")}}})
    assert tumpang(Gt, C, "dibi", "lb")["persen"] is None and tumpang(Gt, C, "lb", "dibi") == {"n_a": 1, "n_ada_b": 0, "persen": 0.0}
    # berita: masa depan dibuang, topik wajib; PetaBencana: jendela J3 uji terbuang, hari tak terliput
    kb, _, rng = dari_berita([{"judul": "Banjir rendam 3 desa", "tgl": "2026-10-08T10:00+07:00", "topik": ["kejadian"], "kab": ["35|Kab. Bojonegoro"], "kec": []},
                              {"judul": "Potensi banjir besok", "tgl": "2026-10-08T10:00+07:00", "topik": ["kejadian"], "kab": ["35|Bojonegoro"], "kec": []},
                              {"judul": "Banjir", "tgl": "2026-10-09T10:00+07:00", "topik": ["cuaca"], "kab": ["35|Bojonegoro"], "kec": []}], K, Counter())
    assert dict(kb["35|Bojonegoro"]) == {D("2026-10-08"): 1} and rng == (D("2026-10-08"), D("2026-10-09"))
    sisa, ex = saring_pb([{"t": "2024-08-17T10:00:00+07:00", "lon": 106.8, "lat": -6.2}, {"t": "2024-08-25T10:00:00+07:00", "lon": 106.8, "lat": -6.2}])
    assert [r["t"][:10] for r in sisa] == ["2024-08-25"] and D("2024-08-17") in ex and D("2024-08-25") not in ex
    pk, pc, prng, pex = dari_pb([{"t": "2025-04-23T10:00:00+07:00", "lon": 1, "lat": 1}, {"t": "2025-05-05T10:00:00+07:00", "lon": 1, "lat": 1}], K,
                                lambda x, y: "31|Jakarta Selatan|Tebet", Counter())
    assert dict(pk["31|Jakarta Selatan"]) == {D("2025-05-05"): 1} and "31|Jakarta Selatan|Tebet" in pc
    # v1 tidak disentuh
    assert sha_v1() == awal and all(p.startswith(DIR) for p in (OUT_KAB, OUT_KEC, OUT_HARI)) and V1.OUT_CSV not in (OUT_KAB, OUT_KEC)
    print("uji label_bersatu_v2: hijau")


if __name__ == "__main__":
    {"susun": susun, "uji": uji}.get(sys.argv[1] if len(sys.argv) > 1 else "", lambda: sys.exit(__doc__))()
