"""Jaringan pemutakhiran: cek situs, rayap kontak dan medsos, logo. Disalin dan dirampingkan dari panen kontak2/logo (terbukti jalan).
Sopan: UA jujur, jeda 1 dtk per host, 403/429/tantangan = berhenti di host itu (status 'menolak', bukan bukti tutup)."""
import html, ipaddress, re, socket, ssl, time, urllib.error, urllib.parse, urllib.request
from html.parser import HTMLParser

UA = "Centurisk97-BNPB-direktori/1.0 (pemutakhiran bulanan; mailto:terasurbannetwork@gmail.com)"
JEDA = 1.0
BLOK = re.compile(r"just a moment|cf-challenge|captcha|attention required|access denied|verify you are human|ddos protection", re.I)
CTX = ssl.create_default_context()  # sertifikat selalu diverifikasi; situs bersertifikat rusak dicatat gagal, bukan dibuka tanpa verifikasi


def host_aman(url):
    """Anti-SSRF: hanya http/https, dan SEMUA IP hasil resolusi host harus publik (bukan loopback/link-local/privat/reserved/multicast).
    ponytail: resolusi ulang saat connect tetap mungkin (DNS rebinding); pin IP bila ancamannya naik."""
    try:
        pu = urllib.parse.urlparse(url)
        if pu.scheme not in ("http", "https") or not pu.hostname: return False
        ips = {a[4][0].split("%")[0] for a in socket.getaddrinfo(pu.hostname, pu.port or (443 if pu.scheme == "https" else 80), proto=socket.IPPROTO_TCP)}
        return bool(ips) and all(ipaddress.ip_address(i).is_global and not ipaddress.ip_address(i).is_multicast for i in ips)
    except (ValueError, OSError):
        return False


class _Alih(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        if not host_aman(urllib.parse.urljoin(req.full_url, newurl)):
            raise urllib.error.URLError("redirect ke host tak aman ditolak")
        return super().redirect_request(req, fp, code, msg, headers, newurl)


OPENER = urllib.request.build_opener(urllib.request.HTTPSHandler(context=CTX), _Alih)


def fetch(url, timeout=10):
    """(kode, teks, url_akhir, tantangan); kode 0 = tak terjangkau."""
    if not host_aman(url): return 0, "", url, False
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "text/html,*/*;q=0.8", "Accept-Language": "id,en;q=0.7"})
    for ctx in (CTX,):
        try:
            with OPENER.open(req, timeout=timeout) as r:
                b = r.read(1_500_000); ct = r.headers.get("content-type", "")
                if ct and "html" not in ct and "text" not in ct:
                    return r.status, "", r.geturl(), False
                cs = re.search(r"charset=([\w-]+)", ct)
                try: t = b.decode(cs.group(1) if cs else "utf-8", "replace")
                except LookupError: t = b.decode("utf-8", "replace")
                if not host_aman(r.geturl()): return 0, "", url, False  # jaga ganda setelah redirect
                return r.status, t, r.geturl(), bool(len(t) < 20000 and BLOK.search(t[:3000]))
        except urllib.error.HTTPError as e:
            return e.code, "", url, False
        except ssl.SSLError:
            continue
        except urllib.error.URLError as e:
            if isinstance(e.reason, ssl.SSLError) or "CERTIFICATE" in str(e.reason): continue
            return 0, "", url, False
        except Exception:
            return 0, "", url, False
    return 0, "", url, False


class Host:
    """Antrean sopan satu host: jeda JEDA antar permintaan; blok=True setelah ditolak."""
    def __init__(self): self.terakhir, self.blok = 0.0, False
    def ambil(self, url):
        if self.blok: return 0, "", url, False
        w = JEDA - (time.time() - self.terakhir)
        if w > 0: time.sleep(w)
        r = fetch(url); self.terakhir = time.time()
        if r[0] in (403, 429, 503) or r[3]: self.blok = True
        return r


class LP(HTMLParser):
    def __init__(s): super().__init__(); s.links = []; s.cur = None; s.txt = []; s.skip = 0; s.ikon = []; s.og = None
    def handle_starttag(s, t, a):
        a = dict(a)
        if t in ("script", "style", "noscript"): s.skip += 1
        if t == "a": s.cur = [a.get("href"), ""] if a.get("href") else None
        if t == "link" and a.get("href") and "icon" in (a.get("rel") or "").lower():
            rel = a["rel"].lower(); m = re.findall(r"(\d+)x\d+", a.get("sizes") or "")
            ukuran = max(map(int, m)) if m else (180 if "apple" in rel else 16)
            s.ikon.append((("apple" in rel) * 1000 + ukuran - a["href"].lower().endswith(".ico") * 500, a["href"]))
        if t == "meta" and (a.get("property") or a.get("name") or "").lower() in ("og:image", "og:logo") and a.get("content") and not s.og:
            s.og = a["content"]
    def handle_endtag(s, t):
        if t in ("script", "style", "noscript") and s.skip: s.skip -= 1
        if t == "a" and s.cur: s.links.append(tuple(s.cur)); s.cur = None
    def handle_data(s, d):
        if s.skip: return
        s.txt.append(d)
        if s.cur is not None: s.cur[1] += d


def parse(t):
    p = LP()
    try: p.feed(t)
    except Exception: pass
    return p, " ".join(p.txt)


EMAIL = re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}")
BADMAIL = re.compile(r"\.(png|jpe?g|gif|svg|webp|css|js)$|example\.|@(sentry|wixpress|domain|email|yourdomain|your-?site|mysite|test)\.|^(name|nama|email|user|you|your|john|jane|someone|contoh|xxx)@|noreply|no-reply|donotreply|godaddy|wordpress|@2x|u003e", re.I)


def emails(links, txt, raw):
    out = []
    for h, _ in links:
        if h.lower().startswith("mailto:"): out += EMAIL.findall(urllib.parse.unquote(h[7:]).split("?")[0])
    out += EMAIL.findall(html.unescape(txt))
    for m in re.finditer(r'data-cfemail="([0-9a-f]+)"', raw):  # perlindungan email Cloudflare
        try: b = bytes.fromhex(m.group(1)); out.append("".join(chr(c ^ b[0]) for c in b[1:]))
        except ValueError: pass
    r = []
    for e in out:
        e = e.lower().strip(".")
        if not BADMAIL.search(e) and len(e) <= 60 and e not in r: r.append(e)
    return r


def e164(raw):
    d = re.sub(r"\D", "", raw)
    if d.startswith("62"): d = "+" + d
    elif d.startswith("0"): d = "+62" + d[1:]
    else: return None
    n = len(d) - 3
    ok = 9 <= n <= 12 if d.startswith("+628") else (7 <= n <= 11 and re.match(r"\+62[2-7]", d))
    return d if ok else None


TELRE = re.compile(r"(?<![\d/])(?:\+62|62|\(?0)[\s.\-()]*\d{1,4}[\s.\-)]*\d{3,4}[\s.\-]*\d{3,5}(?![\d])")


def phones(links, txt):
    out = [e164(urllib.parse.unquote(h[4:])) for h, _ in links if h.lower().startswith("tel:")]
    for m in re.finditer(r"(?:tel|telp|telepon|phone|hp|wa|whatsapp|call|hubungi|contact|kontak|fax)[^0-9+]{0,25}", txt, re.I):  # dekat kata kunci kontak saja
        mm = TELRE.search(txt[m.end() - 1:m.end() + 60])
        if mm and mm.start() < 6: out.append(e164(mm.group(0)))
    return list(dict.fromkeys(n for n in out if n))


def was(links):
    out = []
    for h, _ in links:
        m = re.search(r"(?:wa\.me/|whatsapp\.com/send/?\?(?:[^\"']*&)?phone=|whatsapp://send\?(?:[^\"']*&)?phone=)\+?(\d{8,15})", h.lower())
        n = e164(m.group(1)) if m else None
        if n and n not in out: out.append(n)
    return out


SOS = {
    "instagram": re.compile(r"^https?://(?:www\.)?instagram\.com/([A-Za-z0-9._]{2,30})/?(?:\?.*)?$", re.I),
    "tiktok": re.compile(r"^https?://(?:www\.)?tiktok\.com/@([A-Za-z0-9._]{2,30})/?(?:\?.*)?$", re.I),
    "facebook": re.compile(r"^https?://(?:www\.|m\.|web\.|id-id\.)?facebook\.com/(?!sharer|share|dialog|plugins|tr\b|groups/?$|login|pages/?$|events)([A-Za-z0-9._\-]{3,80}(?:/[0-9]{5,})?)/?(?:\?.*)?$", re.I),
    "x": re.compile(r"^https?://(?:www\.|mobile\.)?(?:x|twitter)\.com/(?!intent|share|home|search|i/)([A-Za-z0-9_]{2,15})/?(?:\?.*)?$", re.I),
    "youtube": re.compile(r"^https?://(?:www\.)?youtube\.com/((?:@|channel/|c/|user/)[A-Za-z0-9._\-]{2,60})/?(?:\?.*)?$", re.I),
    "linkedin": re.compile(r"^https?://(?:[a-z]{2,3}\.|www\.)?linkedin\.com/((?:company|in|school)/[A-Za-z0-9._%\-]{2,80})/?(?:\?.*)?$", re.I),
}
VENDOR = set("wordpress elementor envato themeforest wix wixsite squarespace weebly godaddy google facebook instagram twitter x youtube linkedin tiktok whatsapp joomla drupal themeisle themefusion colorlib wpengine jeg jegtheme newspaper_theme mekarsari idwebhost niagahoster rumahweb exabytes qwords hostinger sharer share intent home about login signup explore hashtag p reel reels tv stories sharer.php profile.php pages people".split())
UMUM = {"the", "and", "dan", "yang", "pusat", "indonesia", "daerah", "badan", "lembaga", "yayasan", "pemerintah", "provinsi", "kabupaten", "kota", "www", "com", "org", "net", "web", "http", "https", "nasional", "bencana", "penanggulangan", "palang", "merah", "dinas", "bpbd", "laz", "pmi", "id", "co", "or", "go"}


def toks(*s):
    return {w for x in s if x for w in re.split(r"[^a-z0-9]+", x.lower()) if len(w) >= 3 and w not in UMUM}


def sosial(links, ent):
    """Akun medsos yang namanya cocok dengan lembaga (token nama, singkatan, atau domain); selain itu ditolak."""
    host = urllib.parse.urlparse(ent.get("web") or "").netloc.lower().replace("www.", "")
    tk = toks(ent.get("nama"), ent.get("singkatan"), host.split(".")[0] if host else "")
    abbr = re.sub(r"[^a-z0-9]", "", (ent.get("singkatan") or "").lower()); dom = re.sub(r"[^a-z0-9]", "", host.split(".")[0])
    res = {}
    for h, _ in links:
        h = h.strip()
        if h.startswith("//"): h = "https:" + h
        for k, rx in SOS.items():
            m = rx.match(h)
            if not m: continue
            base = re.sub(r"^(@|channel/|c/|user/|company/|in/|school/)", "", m.group(1).lower()).rstrip("/")
            if base.split("/")[0] in VENDOR or base in VENDOR: break
            norm = re.sub(r"[^a-z0-9]", "", base)
            ok = any(t in norm for t in tk) or (len(abbr) >= 3 and abbr in norm) or (len(dom) >= 3 and dom in norm) or any(len(t) >= 5 and norm.startswith(t[:5]) for t in tk)
            if ok: res.setdefault(k, h.split("?")[0].rstrip("/"))
            break
    return res


def link_kontak(links, base, host):
    out = []
    for h, t in links:
        if not h or h.startswith(("#", "mailto:", "tel:", "javascript:")): continue
        u = urllib.parse.urljoin(base, h).split("#")[0]; pu = urllib.parse.urlparse(u)
        if pu.netloc.lower().replace("www.", "") != host or re.search(r"\.(pdf|jpg|png|zip|docx?)$", pu.path, re.I): continue
        sc = 3 if re.search(r"kontak|hubungi|contact", t + " " + pu.path, re.I) else 1 if re.search(r"tentang|about|profil", t + " " + pu.path, re.I) else 0
        if sc and u not in [x[1] for x in out]: out.append((sc, u))
    return [u for _, u in sorted(out, key=lambda x: -x[0])[:2]]


def periksa(ent, host, hari, rayap):
    """Satu lembaga: cek situs (halaman depan); bila rayap, ambil juga halaman kontak/tentang dan ekstrak.
    Mengembalikan {kode, tantangan, url_akhir, panen: None | {email, telepon, wa, medsos, sumber}, logo: None | url}."""
    web = ent["web"] if ent["web"].startswith("http") else "https://" + ent["web"]
    kode, t, akhir, tant = host.ambil(web)
    if kode == 0 and web.startswith("https://") and not host.blok:
        kode, t, akhir, tant = host.ambil("http://" + web[8:])
    out = {"kode": kode, "tantangan": tant, "url_akhir": akhir, "panen": None, "logo": None}
    if kode != 200 or tant: return out
    p, txt = parse(t)
    if not ent.get("logo"):  # urutan: apple-touch-icon terbesar, ikon terbesar (bukan .ico), og:image; hanya https
        for h in [h for _, h in sorted(p.ikon, reverse=True)] + ([p.og] if p.og else []) + ["/apple-touch-icon.png"]:
            u = urllib.parse.urljoin(akhir, h)
            if u.startswith("https://") and not re.search(r"[\"'<>\s]", u): out["logo"] = u; break
    if not rayap: return out
    h0 = urllib.parse.urlparse(akhir).netloc.lower().replace("www.", "")
    halaman = [(akhir, t)]
    for u in link_kontak(p.links, akhir, h0):
        r = host.ambil(u)
        if r[0] == 200 and not r[3]: halaman.append((u, r[1]))
    panen = {"email": [], "telepon": [], "wa": [], "medsos": {}, "sumber": []}
    for u, ht in halaman:
        pp, tx = parse(ht)
        links = pp.links + [(html.unescape(h), "") for h in re.findall(r"(?:href|content|data-href)=[\"']([^\"']+)[\"']", ht)]
        for b, vs in (("email", emails(links, tx, ht)), ("telepon", phones(links, tx)), ("wa", was(links))):
            for x in vs:
                if x not in panen[b]: panen[b].append(x); panen["sumber"].append({"butir": b, "url": u, "diperiksa": hari})
        for k, v in sosial(links, ent).items():
            if k not in panen["medsos"]: panen["medsos"][k] = v; panen["sumber"].append({"butir": "medsos", "url": u, "diperiksa": hari})
    panen["email"], panen["telepon"], panen["wa"] = panen["email"][:5], panen["telepon"][:4], panen["wa"][:2]
    out["panen"] = panen
    return out
