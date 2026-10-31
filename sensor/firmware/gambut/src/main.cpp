// Muka air tanah gambut: transduser tekanan submersible 4-20 mA (disarankan tipe VENTED agar kompensasi udara)
// lewat shunt ke ADS1115, ditambah kelembapan tanah kapasitif. Sampling jarang (INTERVAL_DET), daya sensor dimatikan antar ukur.
// muka_air_cm = -(kedalaman transduser - tinggi kolom air di atasnya); negatif = di bawah permukaan gambut,
// positif = tergenang. Payload: packGambut.
#include <Arduino.h>
#include <Wire.h>
#include <Adafruit_ADS1X15.h>
#include "config.h"
#include "bnpb_sensor.h"

static Adafruit_ADS1115 ads;

void setup() {
  bs::mulai();
  pinMode(PIN_DAYA_SENSOR, OUTPUT);
  digitalWrite(PIN_DAYA_SENSOR, HIGH);                    // nyalakan boost 12 V
  Wire.begin(PIN_SDA, PIN_SCL);
  bool ok = ads.begin();
  ads.setGain(GAIN_ONE);                                  // +-4,096 V; shunt 150 ohm -> maks 3,0 V
  for (int i = 0; i < 10; i++) { delay(500); bs::umpan(); }   // transduser perlu stabil ~5 s

  float mA[5], lb[5];
  int n = 0;
  for (int i = 0; ok && i < 5; i++) {
    float v = ads.computeVolts(ads.readADC_SingleEnded(0));
    float arus = v / SHUNT_OHM * 1000.0f;
    if (arus > 3.6f && arus < 21.0f) mA[n++] = arus;      // di luar 3,6-21 mA = kabel putus/korsleting
    lb[i] = (float)ads.readADC_SingleEnded(1);
    delay(200);
  }
  digitalWrite(PIN_DAYA_SENSOR, LOW);

  float muka = NAN;                                       // NAN = sensor rusak (kirim sentinel, bukan "kering sekali")
  int lembap = 255;
  if (n >= 3) {
    float h = (bs::median(mA, n) - OFFSET_NOL_MA) / 16.0f * TRANSDUCER_RENTANG_CM;
    muka = -(TRANSDUCER_DALAM_SUMUR_CM - h);
    float raw = bs::median(lb, 5);
    lembap = constrain((int)(100.0f * (LEMBAP_ADC_KERING - raw) / (LEMBAP_ADC_KERING - LEMBAP_ADC_JENUH)), 0, 100);
  }
  float volt = bs::baterai(BAT_PIN, BAT_PEMBAGI);
  bs::W w;
  bs::packGambut(w, bs::seqBerikut(), volt, muka, lembap);
  String js = "{\"muka_air_cm\":" + bs::jn(muka) + ",\"lembap\":" + (lembap == 255 ? String("null") : String(lembap)) + "}";
  bs::kirim(w, js.c_str(), volt);
  bs::tidur(INTERVAL_DET);
}
void loop() {}
