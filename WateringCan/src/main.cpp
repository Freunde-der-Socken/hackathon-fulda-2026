#include <Arduino.h>
#include <Wire.h>
#include <SPI.h>
#include <Adafruit_GFX.h>
#include <Adafruit_GC9A01A.h>

// GC9A01 SPI Display Pins (Header 1)
#define TFT_SCLK  20
#define TFT_MOSI  19
#define TFT_DC    18
#define TFT_RST   14
#define TFT_CS    -1    // CS tied to GND rail

// GY-521 I2C Pins (Header 2)
#define I2C_SDA   2
#define I2C_SCL   3

Adafruit_GC9A01A tft(&SPI, TFT_DC, TFT_CS, TFT_RST);

// Geometry & Colors
const int CENTER_X = 120;
const int CENTER_Y = 120;
const int RADIUS   = 112;

#define COLOR_AIR     0x10A2  // Dark slate air
#define COLOR_WATER   0x04FF  // Deep vibrant blue
#define COLOR_RIM     0xC618  // Outer silver ring

// Water simulation variables
float waterLevel = 0.80f;     // Initial level: 80%
const float MAX_LEVEL = 0.80f;

float smoothGx = 0.0f;
float smoothGy = 1.0f;
float smoothGz = 0.0f;
uint8_t mpuAddress = 0x68;
unsigned long lastLogTime = 0;

// ---------------- Wave settings (tune these) ----------------
const float MAX_WAVE_AMP  = 9.0f;    // max wave height in pixels
const float WAVE_GAIN     = 30.0f;   // pixels of wave per unit of "agitation"
const float WAVE_DEADBAND = 0.03f;   // ignore sensor noise below this
const float WAVE_DECAY    = 0.97f;   // per frame; closer to 1.0 = waves last longer
const float WAVE_K1       = TWO_PI / 90.0f;  // main wavelength: 90 px
const float WAVE_K2       = TWO_PI / 45.0f;  // ripple wavelength: 45 px
const float WAVE_SPEED    = 2.5f;    // base phase speed (rad/s)

float prevAx = 0, prevAy = 0, prevAz = 0;
bool  havePrev = false;
float agitation = 0.0f;   // filtered amount of change in the sensor values
float waveAmp = 0.0f;     // current wave height in pixels
float wavePhase1 = 0.0f;
float wavePhase2 = 0.0f;
unsigned long lastFrameMs = 0;

// Low-level register access to wake MPU-6050 / ICM-20689 (Chip ID 0x98)
bool initMPU(uint8_t addr) {
  Wire.beginTransmission(addr);
  Wire.write(0x75); // WHO_AM_I
  Wire.endTransmission(false);

  Wire.requestFrom(addr, (uint8_t)1);
  if (!Wire.available()) return false;
  uint8_t chipID = Wire.read();
  Serial.printf("Device at 0x%02X reported Chip ID: 0x%02X\n", addr, chipID);

  // Wake up sensor (clear SLEEP bit in PWR_MGMT_1)
  Wire.beginTransmission(addr);
  Wire.write(0x6B);
  Wire.write(0x00);
  if (Wire.endTransmission(true) != 0) return false;

  delay(20);

  // Set Accelerometer to +/- 4G range (Register 0x1C)
  Wire.beginTransmission(addr);
  Wire.write(0x1C);
  Wire.write(0x08);
  return (Wire.endTransmission(true) == 0);
}

// Robust read of accelerometer registers (0x3B..0x40)
bool readMPU(uint8_t addr, float &ax, float &ay, float &az) {
  Wire.beginTransmission(addr);
  Wire.write(0x3B);
  // If repeated start fails on ESP32-C6, fall back to stop-start
  if (Wire.endTransmission(false) != 0) {
    Wire.beginTransmission(addr);
    Wire.write(0x3B);
    if (Wire.endTransmission(true) != 0) return false;
  }

  uint8_t count = Wire.requestFrom(addr, (uint8_t)6);
  if (count < 6 && Wire.available() < 6) return false;

  int16_t rawX = (Wire.read() << 8) | Wire.read();
  int16_t rawY = (Wire.read() << 8) | Wire.read();
  int16_t rawZ = (Wire.read() << 8) | Wire.read();

  ax = (float)rawX / 8192.0f;
  ay = (float)rawY / 8192.0f;
  az = (float)rawZ / 8192.0f;
  return true;
}

// Surface displacement (in pixels, along the surface normal) at tangent position s
static inline float waveAt(float s) {
  return waveAmp * (sinf(WAVE_K1 * s + wavePhase1) +
                    0.5f * sinf(WAVE_K2 * s - wavePhase2)) / 1.5f;
}

void renderWater(float gx, float gy, float level) {
  float norm = sqrt(gx * gx + gy * gy);
  if (norm < 0.001f) {
    gx = 0.0f;
    gy = 1.0f;
  } else {
    gx /= norm;
    gy /= norm;
  }

  // Water is where  dx*gx + dy*gy >= D  (+ wave offset)
  float D = RADIUS * (1.0f - 2.0f * level);
  bool waving = waveAmp > 0.3f;

  tft.startWrite();

  if (fabsf(gy) >= fabsf(gx)) {
    // Surface is more horizontal -> draw column by column
    for (int x = CENTER_X - RADIUS; x <= CENTER_X + RADIUS; x++) {
      int dx = x - CENTER_X;
      int dyMax = (int)sqrtf((float)(RADIUS * RADIUS - dx * dx));
      int yTop = CENTER_Y - dyMax;
      int yBot = CENTER_Y + dyMax;

      float cut = (D - dx * gx) / gy;              // dy of the flat surface
      if (waving) {
        float s = dx * (-gy) + cut * gx;           // tangent position
        cut = (D + waveAt(s) - dx * gx) / gy;      // dy of the wavy surface
      }

      int b = (gy > 0) ? (int)ceilf(CENTER_Y + cut)
                       : (int)floorf(CENTER_Y + cut) + 1;
      b = constrain(b, yTop, yBot + 1);

      uint16_t c1 = (gy > 0) ? COLOR_AIR : COLOR_WATER;
      uint16_t c2 = (gy > 0) ? COLOR_WATER : COLOR_AIR;
      if (b > yTop)  tft.writeFastVLine(x, yTop, b - yTop, c1);
      if (b <= yBot) tft.writeFastVLine(x, b, yBot - b + 1, c2);
    }
  } else {
    // Surface is more vertical -> draw row by row
    for (int y = CENTER_Y - RADIUS; y <= CENTER_Y + RADIUS; y++) {
      int dy = y - CENTER_Y;
      int dxMax = (int)sqrtf((float)(RADIUS * RADIUS - dy * dy));
      int xLeft = CENTER_X - dxMax;
      int xRight = CENTER_X + dxMax;

      float cut = (D - dy * gy) / gx;              // dx of the flat surface
      if (waving) {
        float s = cut * (-gy) + dy * gx;
        cut = (D + waveAt(s) - dy * gy) / gx;
      }

      int b = (gx > 0) ? (int)ceilf(CENTER_X + cut)
                       : (int)floorf(CENTER_X + cut) + 1;
      b = constrain(b, xLeft, xRight + 1);

      uint16_t c1 = (gx > 0) ? COLOR_AIR : COLOR_WATER;
      uint16_t c2 = (gx > 0) ? COLOR_WATER : COLOR_AIR;
      if (b > xLeft)   tft.writeFastHLine(xLeft, y, b - xLeft, c1);
      if (b <= xRight) tft.writeFastHLine(b, y, xRight - b + 1, c2);
    }
  }

  tft.endWrite();
}

void setup() {
  Serial.begin(115200);
  delay(1500);
  Serial.println("\n--- Starting Fluid Level System ---");

  // 1. Physically reset the GC9A01 controller
  pinMode(TFT_RST, OUTPUT);
  digitalWrite(TFT_RST, HIGH);
  delay(50);
  digitalWrite(TFT_RST, LOW);
  delay(100);
  digitalWrite(TFT_RST, HIGH);
  delay(120);

  // 2. Hardware SPI on the ESP32-C6
  SPI.begin(TFT_SCLK, -1, TFT_MOSI, -1);

  // 3. Start display driver at 20 MHz
  tft.begin(20000000);
  tft.setRotation(2);
  tft.invertDisplay(true);

  // Visual splash so you immediately see the display is alive
  tft.fillScreen(COLOR_WATER);
  tft.setTextColor(GC9A01A_WHITE);
  tft.setTextSize(2);
  tft.setCursor(80, 110);
  tft.println("ONLINE");
  delay(700);

  tft.fillScreen(COLOR_AIR);
  tft.drawCircle(CENTER_X, CENTER_Y, RADIUS + 1, COLOR_RIM);
  tft.drawCircle(CENTER_X, CENTER_Y, RADIUS + 2, COLOR_RIM);

  // 4. Initialize I2C Bus on GPIO 2 & 3
  Wire.begin(I2C_SDA, I2C_SCL, 100000);
  delay(100);

  Serial.println("Checking I2C sensor...");
  if (!initMPU(mpuAddress)) {
    tft.setTextColor(GC9A01A_RED);
    tft.setCursor(55, 110);
    tft.println("Init Failed");
    Serial.println("ERROR: Sensor failed to initialize.");
    while (1) delay(100);
  }

  lastFrameMs = millis();
  Serial.println("Sensor online! Starting fluid simulation engine...");
}

void loop() {
  float ax = 0, ay = 0, az = 0;
  bool readSuccess = readMPU(mpuAddress, ax, ay, az);

  if (readSuccess) {
    // Tilt axes mapping
    float targetGx = ax;
    float targetGy = ay;
    float targetGz = az;

    // Inertia smoothing
    smoothGx += (targetGx - smoothGx) * 0.18f;
    smoothGy += (targetGy - smoothGy) * 0.18f;
    smoothGz += (targetGz - smoothGz) * 0.18f;

    // Agitation = how much ANY of the raw values changed since the last frame
    if (havePrev) {
      float change = fabsf(ax - prevAx) + fabsf(ay - prevAy) + fabsf(az - prevAz);
      agitation += (change - agitation) * 0.35f;   // low-pass so single spikes don't dominate
    }
    prevAx = ax; prevAy = ay; prevAz = az;
    havePrev = true;
  }

  // ---- Wave amplitude: rises quickly with motion, fades out slowly ----
  float targetAmp = constrain((agitation - WAVE_DEADBAND) * WAVE_GAIN, 0.0f, MAX_WAVE_AMP);
  if (targetAmp > waveAmp) {
    waveAmp += (targetAmp - waveAmp) * 0.4f;
  } else {
    waveAmp *= WAVE_DECAY;
  }

  // ---- Wave phase: bigger waves also travel a bit faster ----
  unsigned long now = millis();
  float dt = (now - lastFrameMs) / 1000.0f;
  lastFrameMs = now;
  float speed = WAVE_SPEED + waveAmp * 0.4f;
  wavePhase1 = fmodf(wavePhase1 + dt * speed, TWO_PI);
  wavePhase2 = fmodf(wavePhase2 + dt * speed * 1.7f, TWO_PI);

  float tiltAngle = atan2(fabs(smoothGx), smoothGy) * 180.0f / PI;

  // Pouring vs refill logic
  if (tiltAngle > 30.0f && waterLevel > 0.0f) {
    float pourSpeed = (tiltAngle - 30.0f) * 0.00045f;
    waterLevel -= pourSpeed;
    if (waterLevel < 0.0f) waterLevel = 0.0f;
  } else if (tiltAngle < 15.0f && waterLevel < MAX_LEVEL) {
    waterLevel += 0.004f;
    if (waterLevel > MAX_LEVEL) waterLevel = MAX_LEVEL;
  }

  // Draw simulation frame
  renderWater(smoothGx, smoothGy, waterLevel);

  // Water level percentage readout
  tft.setTextSize(2);
  tft.setTextColor(GC9A01A_WHITE, COLOR_WATER);
  tft.setCursor(100, 112);
  int pct = (int)(waterLevel * 100.0f);
  tft.printf("%2d%%", pct);

  // Telemetry output every 500ms
  if (millis() - lastLogTime > 500) {
    lastLogTime = millis();
    Serial.printf("Gx: %.2f | Gy: %.2f | Gz: %.2f | Level: %d%% | Agit: %.3f | Wave: %.1fpx | Read: %s\n",
                  smoothGx, smoothGy, smoothGz, pct, agitation, waveAmp, readSuccess ? "OK" : "FAIL");
  }

  delay(20);
}
