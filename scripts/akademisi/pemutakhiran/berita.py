"""Berita baru tentang lembaga lewat Google News RSS (disalin dari panen_berita.py, tanpa cache berkas). Jeda 1,5 dtk, UA jujur."""
import hashlib, html, re, time, urllib.parse, urllib.request
import xml.etree.ElementTree as ET
from email.utils import parsedate_to_datetime
from rayap import UA, OPENER, host_aman

GAP, MAXPER = 1.5, 15
KAT = [
    ("hukum dan izin", r"izin|perizinan|akreditasi|sertifikasi|dicabut|legalitas|sengketa|gugat|tersangka|korupsi|\bkpk\b|sanksi"),
    ("penunjukan jabatan", r"dilantik|lantik|pelantikan|ditunjuk|penunjukan|kepala baru|terpilih|ketua baru|pj\b|plt\b|serah terima jabatan|sertijab|musyawarah|munas|musda|muspro|aklamasi|dipilih"),
    ("penghargaan", r"penghargaan|award|juara|raih|meraih|diganjar|apresiasi|anugerah|terbaik|piagam|prestasi"),
    ("pendanaan dan hibah", r"hibah|pendanaan|dana |anggaran|donasi|grant|sumbangan|kucurkan|investasi|\bcsr\b|dukungan dana|rp\s?\d"),
    ("peluncuran inovasi", r"luncur|meluncurkan|peluncuran|inovasi|aplikasi|teknologi|prototipe|diresmikan|resmikan|rilis|sistem peringatan dini|dashboard|platform"),
    ("uji dan penerapan", r"uji coba|pemasangan|dipasang|simulasi|latihan|gladi|pelatihan|bimtek|diterapkan|penerapan|implementasi|pilot|sosialisasi|edukasi|workshop|lokakarya"),
    ("kerja sama", r"kerja ?sama|\bmou\b|nota kesepahaman|kolaborasi|sinergi|bermitra|kemitraan|perjanjian|pks\b|bersinergi|menggandeng|gandeng"),
    ("kebijakan", r"kebijakan|regulasi|peraturan|perpres|perda|strategi|rencana aksi|\bsk\b|surat edaran|rakor|rapat koordinasi|rencana kontinjensi"),
    ("riset dan publikasi", r"riset|penelitian|studi|kajian|jurnal|publikasi|laporan|survei|seminar|webinar|\bdata\b"),
    ("bantuan dan respons", r"bantuan|bantu|salur|menyalurkan|distribusi|siaga|evakuasi|tanggap|respons|respon|relawan|posko|dapur umum|logistik|menangani|penanganan|kirim|mengirim|turun tangan|pemadaman|pencarian"),
]
BENCANA = r"banjir|gempa|longsor|tsunami|kebakaran|karhutla|erupsi|letusan|puting beliung|angin kencang|kekeringan|banjir rob|abrasi|korban|meninggal|tewas|terendam|bencana"
RUMPUN = [("gempa", "gempa"), ("tsunami", "tsunami"), ("gunung api", "erupsi|letusan|gunung api|gunungapi|vulkan"), ("banjir", "banjir"), ("longsor", "longsor|tanah bergerak"),
          ("karhutla", "karhutla|kebakaran hutan|kebakaran lahan|hotspot|titik panas"), ("kekeringan", "kekeringan|kemarau"), ("cuaca ekstrem", "cuaca ekstrem|angin kencang|puting beliung|siklon"),
          ("pesisir", "abrasi|rob\\b|pesisir"), ("iklim", "perubahan iklim|iklim")]
RINGKAS = {
    "kerja sama": "memberitakan kerja sama yang melibatkan {e}", "bantuan dan respons": "memberitakan bantuan atau respons lapangan oleh {e}",
    "peluncuran inovasi": "memberitakan peluncuran atau peresmian yang dikaitkan dengan {e}", "uji dan penerapan": "memberitakan kegiatan uji, pelatihan, atau penerapan yang melibatkan {e}",
    "pendanaan dan hibah": "memberitakan pendanaan atau dukungan dana yang terkait {e}", "penghargaan": "memberitakan penghargaan atau prestasi yang terkait {e}",
    "penunjukan jabatan": "memberitakan pelantikan, pemilihan, atau pergantian jabatan di {e}", "kebijakan": "memberitakan kebijakan atau rapat koordinasi yang menyangkut {e}",
    "riset dan publikasi": "memberitakan riset, kajian, atau publikasi yang terkait {e}", "hukum dan izin": "memberitakan urusan hukum atau perizinan yang menyangkut {e}",
    "lainnya": "memberitakan kegiatan {e}",
}
norm = lambda s: re.sub(r"\s+", " ", re.sub(r"[^a-z0-9 ]", " ", s.lower())).strip()


def aliases(x, hitung_singkatan):
    clean = re.sub(r"\s*\([^)]*\)", "", x["nama"]).strip(); out = [clean]
    for m in re.findall(r"\(([^)]+)\)", x["nama"]):
        if len(m) >= 4 and " " not in m.strip() and hitung_singkatan.get(norm(m), 0) <= 1: out.append(m.strip())
    s = (x.get("singkatan") or "").strip()
    if len(s) >= 4 and " " not in s and hitung_singkatan.get(norm(s), 0) == 1: out.append(s)
    short = re.sub(r"^Palang Merah Indonesia", "PMI", re.sub(r"^Badan Penanggulangan Bencana Daerah", "BPBD", clean))
    if short != clean: out.append(short)
    return [a for a in dict.fromkeys(out) if len(norm(a)) >= 6]


def klasifikasi(judul):
    tl = judul.lower()
    for k, rx in KAT:
        if re.search(rx, tl): return k
    return None if re.search(BENCANA, tl) else "lainnya"  # kejadian bencana tanpa peran lembaga: buang


def parse(raw, sejak):
    out = []
    try: root = ET.fromstring(raw)
    except ET.ParseError: return out
    for it in root.iter("item"):
        t = html.unescape(it.findtext("title") or ""); src = it.find("source"); media = (src.text if src is not None else "") or ""
        if media and t.endswith(" - " + media): t = t[:-(len(media) + 3)]
        try: d = parsedate_to_datetime(it.findtext("pubDate")).strftime("%Y-%m-%d")
        except (TypeError, ValueError): continue
        if d >= sejak: out.append((t.strip(), it.findtext("link") or "", media.strip(), d))
    return out


def ambil(q):
    u = "https://news.google.com/rss/search?q=" + urllib.parse.quote_plus(q) + "&hl=id&gl=ID&ceid=ID:id"
    if not host_aman(u): return None
    for t in range(3):
        try: return OPENER.open(urllib.request.Request(u, headers={"User-Agent": UA}), timeout=30).read()
        except Exception as e:
            time.sleep(30 * (t + 1) if "429" in str(e) or "403" in str(e) else 3)
    return None


def panen(lembaga, sejak, hari, ada_id, habis):
    """Berita baru (id belum di ada_id) sejak 'YYYY-MM-DD'. habis() True = anggaran waktu habis, berhenti rapi."""
    hs = {}
    for x in lembaga:
        s = norm(x.get("singkatan") or "")
        if s: hs[s] = hs.get(s, 0) + 1
    ada, hasil, terakhir = set(ada_id), {}, 0.0
    for x in lembaga:
        if habis(): break
        al = aliases(x, hs)
        if not al: continue
        w = GAP - (time.time() - terakhir)
        if w > 0: time.sleep(w)
        terakhir = time.time()
        raw = ambil(" OR ".join('"%s"' % a for a in al[:2]) + " after:" + sejak)
        if not raw: continue
        keys = [norm(a) for a in al]; got = []
        for t, lk, media, d in parse(raw, sejak):
            if not any(" " + k + " " in " " + norm(t) + " " for k in keys): continue
            kat = klasifikasi(t)
            if kat: got.append((t, lk, media, d, kat))
        for t, lk, media, d, kat in sorted(got, key=lambda r: r[3], reverse=True)[:MAXPER]:
            k = norm(t)[:90] + "|" + norm(media); bid = "brt-" + hashlib.md5(k.encode()).hexdigest()[:10]
            if bid in ada: continue
            r = hasil.get(bid)
            if not r:
                r = hasil[bid] = {"id": bid, "judul": t, "tanggal": d, "media": media, "url": lk, "ringkas": "", "kategori": kat, "entitas": [],
                                  "rumpun": [rp for rp, rx in RUMPUN if re.search(rx, t.lower())], "sumber": "Google News RSS", "diperiksa": hari,
                                  "_nama": x.get("singkatan") or re.sub(r"\s*\([^)]*\)", "", x["nama"])}
            if {"jenis": "lembaga", "id": x["id"]} not in r["entitas"]: r["entitas"].append({"jenis": "lembaga", "id": x["id"]})
    out = []
    for r in sorted(hasil.values(), key=lambda r: r["tanggal"], reverse=True):
        nm = r.pop("_nama"); extra = f" dan {len(r['entitas']) - 1} entitas lain" if len(r["entitas"]) > 1 else ""
        r["ringkas"] = (r["media"] or "Media daring") + " " + RINGKAS[r["kategori"]].format(e=nm + extra) + "."
        if not r["rumpun"]: del r["rumpun"]
        out.append(r)
    return out
