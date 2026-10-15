# Rumusan model untuk naskah: PFVI tanpa pengamatan muka air, digabung dengan FWI

Bahan naskah. Rumus di sini sama dengan kode yang jalan: `scripts/data/pfvi.py` (indeks, proxy muka air, kalibrasi,
peluang gabungan), `scripts/data/harian.py` (`cuaca_fwi`, operasional harian), `scripts/sebaran/pfvi_balik.py`
(kalibrasi & uji balik). Angka hasil diambil dari `RISET-PFVI.md`; ubah salah satunya, ubah juga dokumen ini.

Rujukan pokok:
- Taufik, M., Widyastuti, M.T., Sulaiman, A., Murdiyarso, D., Santikayasa, I.P., Minasny, B. (2022). An improved
  drought-fire assessment for managing fire risks in tropical peatlands. *Agric. For. Meteorol.* 312, 108738.
  doi:10.1016/j.agrformet.2021.108738
- Mahdiyasa, A.W., Melly, M., Pasaribu, U.S., Taufik, M., Muljadi, B.P. (2025). Peatfr: An R package to forecast
  tropical peatland fire risk with stochastic, machine learning, and optimisation methods. *Ecol. Inform.* 92, 103532.
  doi:10.1016/j.ecoinf.2025.103532 (kode: github.com/mellygsln/peatfr)
- Van Wagner, C.E. (1987). Development and structure of the Canadian Forest Fire Weather Index System. CFS Tech. Rep. 35.
- Dataset muka air & api Kalimantan: Zenodo 17907349.

Catatan sumber: teks lengkap Mahdiyasa dkk. 2025 tidak bisa diambil otomatis (ScienceDirect meminta captcha). Rumus
di bawah diturunkan dari kode R peatfr (`R/Function Fire Predict.R`) dan abstraknya. Sebelum naskah dikirim,
cocokkan sekali lagi dengan PDF-nya.

## 1. Notasi

| Lambang | Arti | Satuan |
| --- | --- | --- |
| $t$ | hari (waktu lokal, 00–24) | – |
| $x_t$ | PFVI, indeks kekeringan gambut | 0–300 |
| $T_t$ | suhu udara maksimum harian | °C |
| $P_t$ | hujan harian (jumlah 00–24 lokal) | mm |
| $E_t$ | evapotranspirasi acuan FAO-56 harian | mm |
| $R_0$ | hujan tahunan rata-rata | mm (3.000) |
| $w_t$ | muka air tanah, negatif = di bawah permukaan | cm |
| $h_t=\max(0,-w_t)$ | kedalaman muka air | cm |
| $F_t$ | Fire Weather Index Kanada | – |

## 2. Indeks PFVI (Taufik dkk. 2022; peatfr)

Neraca harian, dengan keadaan dibatasi ke $[0, 300]$ sebelum tiap langkah:

$$\tilde x_t=\min(\max(x_{t-1},0),300)$$

$$x_t=\min\!\big(\max\big(\tilde x_t+\mathrm{DF}_t-\mathrm{RF}_t-\mathrm{WTF}_t,\;0\big),\;300\big)$$

**Faktor kekeringan** (bentuk KBDI metrik, $\Delta t = 1$ hari):

$$\mathrm{DF}_t=\frac{(300-\tilde x_t)\,\big(0{,}4982\,e^{0{,}0905\,T_t+1{,}6096}-4{,}268\big)\,\Delta t\cdot10^{-3}}{1+10{,}88\,e^{-0{,}001736\,R_0}}$$

**Faktor hujan bersih** (ambang intersepsi 5,1 mm):

$$\mathrm{RF}_t=\begin{cases}\max(0,\;P_t-5{,}1) & P_{t-1}\le5{,}1\ \text{atau tidak ada}\\ P_t & P_{t-1}>5{,}1\end{cases}$$

**Faktor muka air tanah** (kurva retensi van Genuchten):

$$\theta(h)=\Big[1+\Big(\frac{h}{\alpha}\Big)^{n}\Big]^{-(1-1/n)},\qquad \mathrm{WTF}_t=a_H-b_H\cdot300\,\big(1-\theta(h_t)\big)$$

Muka air dangkal ($\theta\to1$) membuat $\mathrm{WTF}\approx a_H>0$ dan menurunkan indeks. Muka air dalam
($\theta\to0$) membuat $\mathrm{WTF}\approx a_H-300\,b_H<0$ dan menambah kekeringan.

**Kelas** (peatfr): Rendah $x\le75$, Sedang $\le150$, Tinggi $\le225$, Ekstrem $>225$.

## 3. Perbaikan atas peatfr

1. **Hujan kemarin.** peatfr menulis `Rf_b <- c(Rf[-length(Rf)], NA)`. Vektor itu tidak digeser, jadi "hujan kemarin"
   sama dengan hujan hari ini dan hari terakhir jadi NA. Yang benar $P_{t-1}$, yaitu `c(NA, Rf[-n])`. Efeknya: pada hari
   hujan pertama setelah kering, peatfr mengurangi seluruh $P_t$, padahal yang benar hanya $P_t-5{,}1$ (diuji di
   self-check 2).
2. **Optimasi parameter.** peatfr mencari kisi `for i in 1:(1/par3)` bersarang empat kali dan memanggil `optim` di tiap
   titik: $m^4$ panggilan ($10^8$ bila langkah 0,01), dan berjalan mundur bila langkahnya negatif. Penggantinya
   Nelder–Mead multi-awal pada ruang tak berbatas lewat transformasi logistik:
   $$\phi_j=\ell_j+\frac{u_j-\ell_j}{1+e^{-z_j}},\qquad z^\*=\arg\min_z\ \mathcal L\big(\phi(z)\big)$$
   Titik awalnya pusat kotak plus $K$ titik Latin hypercube, dan yang dipakai minimum terbaik. Biayanya
   $\approx K\times$ iterasi evaluasi, dan batas fisik $n>1$, $\alpha>0$ terjamin. Tanpa batas itu, R menghasilkan NaN
   diam-diam.
3. **Target kalibrasi.** peatfr mencocokkan indeks ke $\mathrm{DI}_{obs}=300\,[1-(SM-40)/(70-40)]$ dari kelembapan
   tanah $SM$. Itu melingkar, karena kelembapan tanah juga membentuk indeksnya. Di sini parameter disetel ke
   **kejadian api** (bagian 5). $\mathrm{DI}_{obs}$ hanya dipakai untuk keadaan awal bila $SM$ tersedia.
4. **Muka air tanpa pengamatan.** peatfr membutuhkan deret $w_t$ terukur. Untuk cakupan nasional deret itu tidak ada
   (SiPALAGA/BRG tidak terbuka), jadi diganti proxy ember (bagian 4).
5. **Peramalan.** peatfr meramal tiap peubah dengan ARIMA (Box–Cox), LSTM, atau GRU univariat. Di sini masukan
   ramalan diambil dari prakiraan cuaca numerik (Open-Meteo/IFS). Untuk ansambel $M$ anggota, ketidakpastian
   dinyatakan sebagai $\Pr(x_{t+d}>150)=\frac1M\sum_m\mathbb 1[x^{(m)}_{t+d}>150]$ beserta P10/P50/P90
   (`ansambel_pfvi`; belum dipakai di operasional harian).
6. **Penggabungan dengan FWI** dan **uji di luar sampel** (bagian 6–7). Bagian ini tidak ada di peatfr.

## 4. Proxy muka air (ember gambut)

$$w_t=\mathrm{clip}\Big(w_{t-1}+\frac{P_t-k\,E_t}{10\,S_y}-\lambda,\;w_{\min},\;w_{\max}\Big),\qquad w_t\leftarrow\tfrac12w_t\ \text{bila}\ w_t>0$$

- $S_y$: hasil jenis (*specific yield*).
- $k$: faktor ET aktual/acuan.
- $\lambda$: kebocoran (cm/hari).
- Batas $[w_{\min},w_{\max}]=[-188{,}7;\,+22{,}8]$ cm, sama dengan rentang Zenodo 17907349.
- Air di atas permukaan mengalir cepat: separuhnya hilang tiap hari.

Keluaran yang memakai proxy ini wajib diberi label "muka air = perkiraan, bukan pengukuran".

## 5. Kalibrasi

Dua tahap, keduanya memakai data latih saja (2015 dan 2018):

**(a) Bentuk retensi $(n,\alpha)$ dari dataset spasial Zenodo** (58.245 sel ~1 km di Kalimantan, berisi muka air dan
kejadian api). Kemungkinan Bernoulli dimaksimalkan:

$$\Pr(\text{api}\mid h)=\sigma\big(c_0+c_1\,[1-\theta(h;n,\alpha)]\big),\quad n\in[1{,}1;3],\ \alpha\in[10;150]\ \text{cm}$$

Kemampuannya dicek dengan validasi blok spasial 1°.

**(b) Parameter dinamis $\phi=(a_H,b_H,S_y,k,\lambda)$ dari api VIIRS.** Satu sampel adalah satu sel-hari pada sel kisi
0,5° yang ≥ 30% luasnya gambut, bulan Agustus–Oktober. Target $y_{t+1}=\mathbb 1[\ge1$ deteksi VIIRS S-NPP keyakinan
n/h di poligon gambut sel itu pada hari $t+1]$. Fungsi yang diminimalkan:

$$\mathcal L(\phi)=-\frac1N\sum_{i,t}\Big[y_{i,t+1}\ln p_{i,t}+(1-y_{i,t+1})\ln(1-p_{i,t})\Big],\quad p_{i,t}=\sigma\big(\gamma_0+\gamma_1\,x_{i,t}(\phi)/100\big)$$

$(\gamma_0,\gamma_1)$ diprofilkan keluar (diselesaikan Newton di dalam tiap evaluasi). Batas
$\phi$: $a_H\in[-5,10]$, $b_H\in[0;0{,}1]$, $S_y\in[0{,}05;0{,}4]$, $k\in[0{,}5;1{,}5]$, $\lambda\in[0,1]$.

**Hasil** (`PAR_BAKU`, `WT_PAR_BAKU`):

| Parameter | Nilai | Catatan |
| --- | --- | --- |
| $n$, $\alpha$ | 3,0 / 150 cm | menyentuh batas fisik; tanpa batas data mendorong ke tangga tajam ~100 cm |
| $a_H$, $b_H$ | 2,2022 / 0,04276 | |
| $S_y$ | 0,05 | menyentuh batas bawah; literatur gambut 0,1–0,3 |
| $k$, $\lambda$ | 0,505 / 0 | |

Ablasi (−loglik latih per sel-hari, makin kecil makin baik):

| Varian | −loglik |
| --- | --- |
| Bentuk Zenodo | 0,5294 |
| Kurva "60 cm" ($n$ 2, $\alpha$ 60) | 0,5352 |
| Tanpa faktor muka air ($a_H=b_H=0$, KBDI murni) | 0,5409 |

## 6. Peluang gabungan FWI + PFVI

Fitur yang dipakai $\mathbf z_t=[\ln(1+F_t),\;x_t/100]$, distandarkan dengan rerata dan simpangan data latih.
Regresi logistik ber-L2 ($\lambda=1$), Newton–Raphson:

$$p_t=\Pr(\text{api}_{t+1}\mid F_t,x_t)=\sigma\Big(b_0+\sum_{j=1}^2 b_j\,\frac{z_{t,j}-\mu_j}{s_j}\Big)$$

| | $\mu$ | $s$ | $b$ |
| --- | --- | --- | --- |
| intersep | – | – | 0,11585 |
| $\ln(1+F)$ | 1,52110 | 1,29162 | 1,02319 |
| $x/100$ | 1,73273 | 0,79951 | 0,71689 |

Dalam skala asli:

$$\operatorname{logit}p_t=-2{,}6428+0{,}79218\,\ln(1+F_t)+0{,}0089665\,x_t$$

**Ambang alarm** $p^\*=0{,}6344$ ($\operatorname{logit}=0{,}551$) dipilih supaya porsi sel-hari yang ditandai di data
latih sama dengan aturan baku FWI ≥ 7 (anggaran alarm sama). Dengan begitu perbandingan recall-nya adil.

Contoh: FWI 7 dan PFVI 150 memberi $p=0{,}59$; FWI 0 dan PFVI 0 memberi $p=0{,}07$; FWI 20 dan PFVI 250
memberi $p=0{,}88$.

## 7. Desain uji

- **Unit:** sel kisi 0,5°, ≥ 30% gambut, 89 sel di Riau, Kalteng, Kalbar, Sumsel, Kaltim, Kalsel, dan Jambi.
- **Cuaca:** ERA5 per jam dari Open-Meteo archive.
  - $F_t$ dari jam 12 lokal plus hujan 24 jam (Van Wagner 1987, faktor panjang hari khatulistiwa).
  - $x_t$ dari $T^{\max}$, $P$ 00–24, dan $E$ FAO-56.
- **Ramalan:** indeks hari $t$ dipakai untuk api hari $t+1$. Api hari ini tidak dipakai, jadi yang diuji bahaya cuaca,
  bukan persistensi api.
- **Pembagian waktu:** latih 2015 dan 2018, uji 2019 dan 2023, tanpa penyetelan ulang. Ada 16.198 sel-hari uji.
- **Selang:** bootstrap berpasangan per seri sel-tahun, $B=300$.
- **Target kedua:** hari api besar, ≥ 20 deteksi di sel.

## 8. Hasil (uji 2019 + 2023)

| Target | FWI | PFVI | Gabungan | ΔAUC gabungan − FWI (CI 95%) |
| --- | --- | --- | --- | --- |
| Api besok | 0,783 | 0,767 | 0,801 | +0,018 (+0,013; +0,023) |
| Api besar besok | 0,809 | 0,811 | 0,835 | +0,026 (+0,017; +0,035) |

Recall api besar pada anggaran alarm sama (44,6% sel-hari ditandai):

| | Recall |
| --- | --- |
| FWI ≥ 7 | 82,8% |
| PFVI | 84,9% |
| Gabungan | 86,3% |

**Hasil negatif yang perlu dilaporkan.** PFVI ditambahkan sebagai fitur ke model "api membesar" (GBDT 150 pohon,
kedalaman 3; target puncak harian ≥ 20 titik dalam 3 hari; latih 2015/18/19/23, uji 2024–25). AUC-nya turun dari
0,866 ke 0,863 (Δ −0,003; CI −0,019 s.d. +0,008). Begitu ukuran api dan kode FWI (DC/DMC) masuk model, PFVI tidak
membawa informasi baru. Karena itu PFVI dipakai untuk **bahaya kemunculan api**, bukan untuk sebaran atau eskalasi.

## 9. Operasional (`harian.py`)

Berjalan tiap hari untuk 89 sel gambut:

- **Keadaan bersambung.** $(x,w,P_{t-1})$ disimpan pada H-2 di `pfvi_state.json`, supaya revisi data beberapa hari
  terakhir ikut terbawa.
- **Pemanasan.** Sel tanpa keadaan dipanaskan dari ERA5 300 hari ke belakang.
- **Masukan.** 8 hari terakhir plus prakiraan 3 hari dari Open-Meteo.
- **Keluaran.** `pfvi` dan `pg` ($=p_t$) per hari di `public/data/fwi.json`. Di peta tampil sebagai lapisan "Bahaya api
  gambut (FWI + PFVI)".

## 10. Keterbatasan dan arah lanjut

1. **Muka air hanya proxy.** $S_y$ menyentuh batas bawah, jadi ember lebih cepat naik-turun dari fisika sebenarnya.
   Asimilasi pengamatan muka air (SiPALAGA/BRGM, bila dibuka) atau kelembapan tanah SMAP akan memperbaikinya.
2. **Zenodo bukan deret waktu.** Pola laju api per kedalaman tidak monoton, dan AUC luar-blok hanya 0,575. Muka airnya
   tampaknya ditempel per stasiun, sehingga $(n,\alpha)$ menyentuh batas fisik. Ambang 60 cm Taufik dkk. tidak tampak
   tegas di data ini.
3. **Sel 0,5° kasar dan target jenuh.** 48% sel-hari berapi esoknya. Uji pada kisi 375 m (VIIRS) dengan target api
   besar lebih bermakna.
4. **$R_0$ tetap 3.000 mm.** Bisa diganti klimatologi hujan per sel.
5. **Prakiraan ansambel** belum dinilai (skor Brier/CRPS untuk $\Pr(x>150)$ pada 1–7 hari).
6. **Tahun uji berat.** 2019 dan 2023 sama-sama tahun El Niño/IOD positif. Uji di tahun La Niña belum ada.
