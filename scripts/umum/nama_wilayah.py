"""Normalisasi nama kab/kota (fungsi murni; dipakai profil_wilayah.py dan kemitraan/kode.py)."""
import re
# ejaan/nama lama -> nama IRBI (pasti sama kab; bukan tebakan)
ALIAS = {"tobasamosir": "toba", "mamujuutara": "pasangkayu", "malukutenggarabarat": "kepulauantanimbar", "simeuleu": "simeulue", "mentawai": "kepulauanmentawai",
         "pahuwato": "pohuwato", "pangkajenekepulauan": "pangkajenedankepulauan", "padangsidempuan": "padangsidimpuan"}
def nk(n):
    n = (n or "").lower().strip().replace("kep.", "kepulauan")
    while True:
        m = re.sub(r"^(kab\.?|kabupaten|kota|adm\.?|administrasi)\s+", "", n)
        if m == n: break
        n = m
    return (False, ALIAS.get(re.sub(r"[^a-z0-9]", "", n), re.sub(r"[^a-z0-9]", "", n)))
