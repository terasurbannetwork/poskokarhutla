// Kirim langsung ke /api/sensor/baca lewat modem SIM7600 / A7670 (TinyGSM), badan JSON + HMAC-SHA256.
// HTTP/HTTPS lewat AT+HTTP* bawaan modem (belum diuji pada modem sungguhan). Hanya disertakan bila MODE_SELULER. Parameter: MODEM_RX/TX/PWRKEY, APN, SERVER_HOST/PORT/PATH, ALAT_ID, KUNCI_HMAC.
#pragma once
#define TINY_GSM_MODEM_SIM7600          // A7670 memakai driver yang sama
#define TINY_GSM_RX_BUFFER 1024
#include <TinyGsmClient.h>
#include <mbedtls/md.h>

namespace bs {

static void hmacHex(const char* kunci, const uint8_t* data, size_t n, char out[65]) {
  uint8_t h[32];
  mbedtls_md_hmac(mbedtls_md_info_from_type(MBEDTLS_MD_SHA256), (const uint8_t*)kunci, strlen(kunci), data, n, h);
  for (int i = 0; i < 32; i++) sprintf(out + 2 * i, "%02x", h[i]);
}

// hari sejak 1970 dari tanggal sipil (algoritma Howard Hinnant)
static int64_t hariSipil(int y, int m, int d) {
  y -= m <= 2;
  int era = (y >= 0 ? y : y - 399) / 400;
  unsigned yoe = y - era * 400, doy = (153 * (m + (m > 2 ? -3 : 9)) + 2) / 5 + d - 1;
  unsigned doe = yoe * 365 + yoe / 4 - yoe / 100 + doy;
  return (int64_t)era * 146097 + doe - 719468;
}

static bool selulerKirim(const char* nilaiJson, float volt) {
  HardwareSerial& ser = Serial1;
  ser.begin(115200, SERIAL_8N1, MODEM_RX, MODEM_TX);
  pinMode(MODEM_PWRKEY, OUTPUT);
  digitalWrite(MODEM_PWRKEY, HIGH); delay(1000); digitalWrite(MODEM_PWRKEY, LOW);   // denyut nyala modem
  TinyGsm modem(ser);
  delay(6000);
  umpan();
  if (!modem.init() || !modem.waitForNetwork(60000L) || !modem.gprsConnect(APN, APN_USER, APN_SANDI)) return false;
  umpan();
  int y, mo, d, h, mi, s; float tz;
  if (!modem.getNetworkTime(&y, &mo, &d, &h, &mi, &s, &tz) || y < 2025) return false;   // tanpa jam benar worker menolak
  time_t t = (time_t)(hariSipil(y, mo, d) * 86400 + h * 3600 + mi * 60 + s - (long)(tz * 3600));
  struct tm g; gmtime_r(&t, &g);
  char waktu[24]; strftime(waktu, sizeof waktu, "%Y-%m-%dT%H:%M:%SZ", &g);
  int rssi = -113 + 2 * modem.getSignalQuality();
  char badan[320];
  int n = snprintf(badan, sizeof badan, "{\"alat\":\"%s\",\"waktu\":\"%s\",\"nilai\":%s,\"baterai\":%.2f,\"rssi\":%d}",
                   ALAT_ID, waktu, nilaiJson, volt, rssi);
  char tanda[65];
  hmacHex(KUNCI_HMAC, (const uint8_t*)badan, n, tanda);
  // TinyGSM SIM7600 tidak punya klien TLS: pakai tumpukan HTTP(S) bawaan modem (AT+HTTP*), yang menangani HTTPS sendiri.
#ifdef SERVER_TLS
  String url = String("https://") + SERVER_HOST + ":" + SERVER_PORT + SERVER_PATH;
#else
  String url = String("http://") + SERVER_HOST + ":" + SERVER_PORT + SERVER_PATH;
#endif
  int kode = -1;
  modem.sendAT(GF("+HTTPTERM")); modem.waitResponse();
  modem.sendAT(GF("+HTTPINIT"));
  if (modem.waitResponse(10000L) == 1) {
    modem.sendAT(GF("+HTTPPARA=\"URL\",\""), url, GF("\""));                     modem.waitResponse();
    modem.sendAT(GF("+HTTPPARA=\"CONTENT\",\"application/json\""));          modem.waitResponse();
    modem.sendAT(GF("+HTTPPARA=\"USERDATA\",\"X-Sensor-Tanda: "), tanda, GF("\""));   modem.waitResponse();
    modem.sendAT(GF("+HTTPDATA="), n, ',', 10000);
    if (modem.waitResponse(10000L, GF("DOWNLOAD")) == 1) {
      modem.stream.write((const uint8_t*)badan, n);
      modem.waitResponse(10000L);
      modem.sendAT(GF("+HTTPACTION=1"));                                               // 1 = POST
      if (modem.waitResponse(60000L, GF("+HTTPACTION: 1,")) == 1) kode = modem.stream.parseInt();
    }
  }
  modem.sendAT(GF("+HTTPTERM")); modem.waitResponse();
  modem.gprsDisconnect();
  digitalWrite(MODEM_PWRKEY, HIGH); delay(1500); digitalWrite(MODEM_PWRKEY, LOW);     // matikan modem
  return (kode >= 200 && kode < 300) || kode == 409;
}

}  // namespace bs
