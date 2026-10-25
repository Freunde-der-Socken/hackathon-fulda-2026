#include <Arduino.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include <WebServer.h>
#include <DHT.h>
#include <ArduinoJson.h>
#include <ESP32Servo.h>
#include <Adafruit_NeoPixel.h>
#include <math.h>

// --- Wi-Fi ---
const char* ssid      = "Hackathon";
const char* password  = "Hackathon2026";
const char* serverUrl = "https://10.247.10.129/api";

// --- Sensors ---
#define DHTPIN 4
#define DHTTYPE DHT11
#define LDRPIN 34

// --- Servos (both move together as one motor) ---
#define SERVO1_PIN 18
#define SERVO2_PIN 19

// --- NeoPixel ring (lamp) ---
#define LED_PIN        5
#define LED_COUNT      8
#define LED_MAX_BRIGHTNESS 255  // brightness 100 % maps to this (0-255)
#define LED_FRAME_MS   20       // animation refresh, ~50 fps

DHT dht(DHTPIN, DHTTYPE);
Servo servo1;
Servo servo2;
Adafruit_NeoPixel ring(LED_COUNT, LED_PIN, NEO_GRB + NEO_KHZ800);
WebServer server(80);
WiFiClientSecure tlsClient;

int servoTarget = 0;
int currentAngle = 15;
const char* plantId = "6f1c0b6e-2a4d-4c43-9a8e-0d6a2f1b7c11";

// Last successfully sent values. They start far outside the real range,
// so the first reading of every sensor is always sent.
float oldTemp  = -1000.0f;
float oldHum   = -1000.0f;
float oldLight = -1000.0f;
const float thresholdTemp  = 0.5f;   // 0.5°C change threshold
const float thresholdHum   = 2.0f;   // 2% change threshold
const float thresholdLight = 10.0f;  // 10 ADC value change threshold

const unsigned long sendInterval = 5000;
unsigned long lastSendTime = 0;


// =====================================================================
//  Servos (unchanged)
// =====================================================================

float g(float x) {
  return 62.281f + logf((x + 5.1145f) / (112.5917f - x)) / 0.0513f;
}

void updateServos(int value) {
  servoTarget = value;
  currentAngle = map(value, 1, 100, 0, 60);
  currentAngle = g(currentAngle); // Apply the non-linear mapping function

  servo1.write(currentAngle);
  servo2.write(currentAngle);
  Serial.printf("[SERVO] Target: %d -> Angle: %d deg\n", servoTarget, currentAngle);
}


// =====================================================================
//  NeoPixel ring (lamp)
// =====================================================================

// Lamp state, written by the HTTP handler and read by the LED task.
// Only the LED task touches the ring itself.
struct LampState {
  uint8_t r, g, b;
  int brightness;               // 0-100 %, <= 0 means off
  unsigned long countdownStart; // millis() when the countdown started
  unsigned long countdownMs;    // 0 = no countdown running
  uint32_t version;             // bumped on every change
};

LampState lamp = {255, 255, 255, 0, 0, 0, 0};
portMUX_TYPE lampMux = portMUX_INITIALIZER_UNLOCKED;

uint32_t scaleColor(uint8_t r, uint8_t g, uint8_t b, uint8_t level) {
  return ring.Color((uint16_t)r * level / 255,
                    (uint16_t)g * level / 255,
                    (uint16_t)b * level / 255);
}

// Countdown: all 8 LEDs start lit and go out one after another around the
// circle. The LED that is currently running out fades smoothly.
void drawCountdown(const LampState& st, unsigned long elapsed) {
  float remaining = 1.0f - (float)elapsed / st.countdownMs;  // 1 -> 0
  float lit = remaining * LED_COUNT;                         // 8 -> 0
  for (int i = 0; i < LED_COUNT; i++) {
    float level = constrain(lit - i, 0.0f, 1.0f);
    ring.setPixelColor(i, scaleColor(st.r, st.g, st.b, ring.gamma8(level * 255)));
  }
}

// Runs on its own task, so the animation keeps going while the main loop
// blocks on sensor reads or HTTP requests to the Pi.
void ledTask(void*) {
  uint32_t shownVersion = UINT32_MAX;
  bool counting = false;

  for (;;) {
    LampState st;
    portENTER_CRITICAL(&lampMux);
    st = lamp;
    portEXIT_CRITICAL(&lampMux);

    unsigned long elapsed = millis() - st.countdownStart;
    bool countdownActive = st.brightness > 0 && st.countdownMs > 0 && elapsed < st.countdownMs;

    // Redraw on every frame while counting down, otherwise only on changes
    if (countdownActive || counting || st.version != shownVersion) {
      if (st.brightness <= 0) {
        ring.clear();
      } else {
        ring.setBrightness(map(st.brightness, 0, 100, 0, LED_MAX_BRIGHTNESS));
        if (countdownActive) drawCountdown(st, elapsed);
        else                 ring.fill(ring.Color(st.r, st.g, st.b));
      }
      ring.show();
      if (counting && !countdownActive) Serial.println("[LED] Countdown finished");
      counting = countdownActive;
      shownVersion = st.version;
    }
    vTaskDelay(pdMS_TO_TICKS(LED_FRAME_MS));
  }
}

// Parses "#RRGGBB" or "RRGGBB"
bool parseHexColor(String text, uint8_t& r, uint8_t& g, uint8_t& b) {
  text.trim();
  if (text.startsWith("#")) text.remove(0, 1);
  if (text.length() != 6) return false;
  for (char c : text) {
    if (!isxdigit(c)) return false;
  }
  uint32_t rgb = strtoul(text.c_str(), nullptr, 16);
  r = rgb >> 16;
  g = rgb >> 8;
  b = rgb;
  return true;
}

// =====================================================================
//  HTTP server (Pi -> ESP32)
// =====================================================================

// GET /api/servo
// JSON: {"value": 1-100}
// Also accepted: a plain body "42", or the form field value=42
void getHeight(const char* id) {
  HTTPClient http;
  String url = String(serverUrl) + "/plants/" + id + "/noise-score";   
  http.begin(url);
  Serial.printf("[GET] %s\n", url.c_str());
  http.addHeader("Accept", "application/json");
  http.addHeader("Connection", "close");
  http.setTimeout(3000);

  int httpCode = http.GET();
  if (httpCode == HTTP_CODE_OK) {
    String body = http.getString();
    body.trim();

    int height = -1;
    if (body.startsWith("{")) {
      // JSON reply, e.g. {"height": 42} or {"value": 42}
      JsonDocument doc;
      if (!deserializeJson(doc, body)) {
        height = doc["height"] | (doc["value"] | -1);
      }
    } else {
      // Plain number reply, e.g. 42
      height = body.toInt();
    }

    if (height >= 1 && height <= 100) {
      updateServos(height);
    } else {
      Serial.printf("GET [%s] invalid height: '%s'\n", id, body.c_str());
    }
  } else if (httpCode <= 0) {
    Serial.printf("GET [%s] failed (%d): %s\n", id, httpCode, http.errorToString(httpCode).c_str());
  } else {
    Serial.printf("GET [%s] unexpected HTTP %d\n", id, httpCode);
  }
  http.end();

  server.handleClient();
}

void handleServoCommand() {
  int receivedVal = -1;

  if (server.hasArg("plain")) {
    String body = server.arg("plain");
    body.trim();
    if (body.startsWith("{")) {
      JsonDocument doc;
      DeserializationError err = deserializeJson(doc, body);
      if (err) {
        Serial.printf("[HTTP] Invalid JSON: %s\n", err.c_str());
      } else if (!doc["value"].isNull()) {
        receivedVal = doc["value"].as<int>();
      }
    } else {
      receivedVal = body.toInt();
    }
  } else if (server.hasArg("value")) {
    receivedVal = server.arg("value").toInt();
  } else if (server.args() > 0) {
    // curl -d "42" without Content-Type arrives as a form field named "42"
    receivedVal = server.argName(0).toInt();
  }

  if (receivedVal < 1 || receivedVal > 100) {
    Serial.printf("[HTTP] Rejected servo value %d\n", receivedVal);
    server.send(400, "text/plain", "Invalid value. Expecting integer 1-100.");
    return;
  }

  updateServos(receivedVal);
  server.send(200, "text/plain", "OK");
}

// POST /api/light
// JSON: {"color": "#RRGGBB", "brightness": 0-100, "countdown": <seconds>}
//   color       hex colour, "#" optional
//   brightness  percent; <= 0 turns the lamp off
//   countdown   > 0: the ring counts down that many seconds, then stays on
//               in color/brightness; 0 cancels a running countdown
// Every field is optional; missing fields keep their current value.
// Also accepted as form fields: color=FF8800&brightness=50&countdown=10
void handleLightCommand() {
  String colorText;
  bool hasColor = false, hasBrightness = false, hasCountdown = false;
  int brightness = 0;
  long countdown = 0;

  // JSON needs "Content-Type: application/json"; without it, WebServer parses
  // the body as form data and drops it.
  if (server.hasArg("plain")) {
    JsonDocument doc;
    DeserializationError err = deserializeJson(doc, server.arg("plain"));
    if (err) {
      Serial.printf("[HTTP] Invalid JSON: %s\n", err.c_str());
      server.send(400, "text/plain", "Invalid JSON.");
      return;
    }
    if (!doc["color"].isNull())      { hasColor = true;      colorText  = doc["color"].as<String>(); }
    if (!doc["brightness"].isNull()) { hasBrightness = true; brightness = doc["brightness"].as<int>(); }
    if (!doc["countdown"].isNull())  { hasCountdown = true;  countdown  = doc["countdown"].as<long>(); }
  } else {
    if (server.hasArg("color"))      { hasColor = true;      colorText  = server.arg("color"); }
    if (server.hasArg("brightness")) { hasBrightness = true; brightness = server.arg("brightness").toInt(); }
    if (server.hasArg("countdown"))  { hasCountdown = true;  countdown  = server.arg("countdown").toInt(); }
  }

  if (!hasColor && !hasBrightness && !hasCountdown) {
    server.send(400, "text/plain", "Expecting at least one of: color, brightness, countdown.");
    return;
  }

  uint8_t r = 0, g = 0, b = 0;
  if (hasColor && !parseHexColor(colorText, r, g, b)) {
    server.send(400, "text/plain", "Invalid color. Expecting hex like \"#FF8800\".");
    return;
  }
  if (hasBrightness && brightness > 100) {
    server.send(400, "text/plain", "Invalid brightness. Expecting 0-100 (<= 0 = off).");
    return;
  }
  if (hasCountdown && countdown < 0) {
    server.send(400, "text/plain", "Invalid countdown. Expecting seconds >= 0.");
    return;
  }

  portENTER_CRITICAL(&lampMux);
  if (hasColor)      { lamp.r = r; lamp.g = g; lamp.b = b; }
  if (hasBrightness) lamp.brightness = brightness;
  if (hasCountdown) {
    lamp.countdownStart = millis();
    lamp.countdownMs    = (unsigned long)countdown * 1000UL;
  }
  lamp.version++;
  LampState st = lamp;
  portEXIT_CRITICAL(&lampMux);

  Serial.printf("[LED] Color #%02X%02X%02X, brightness %d, countdown %lds\n",
                st.r, st.g, st.b, st.brightness, hasCountdown ? countdown : 0L);
  server.send(200, "text/plain", "OK");
}

void handleNotFound() {
  Serial.printf("[HTTP] 404 for %s\n", server.uri().c_str());
  server.send(404, "text/plain", "Not found. Use POST /api/servo or /api/light");
}


// =====================================================================
//  Wi-Fi
// =====================================================================

void connectWiFi() {
  if (WiFi.status() == WL_CONNECTED) return;
  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.printf("\nWi-Fi Connected! IP: %s\n", WiFi.localIP().toString().c_str());
  } else {
    Serial.println("\nFailed to connect to Wi-Fi.");
  }
}


// =====================================================================
//  HTTP client (ESP32 -> Pi)
// =====================================================================

// Returns true if the Pi accepted the data (HTTP 2xx)
bool sendSingleSensor(const char* sensorId, float value, const char* unit) {
  HTTPClient http;

  String url = String(serverUrl) + "/sensor-data";   
  if (!http.begin(tlsClient, url)) {
    Serial.println("[POST] Invalid serverUrl");
    return false;
  }
  http.addHeader("Content-Type", "application/json");
  // Sends "Connection: close". addHeader("Connection", ...) is silently ignored by HTTPClient.
  http.setReuse(false);
  // 3 s for connecting and for the response: enough for the Hackathon Wi-Fi
  http.setConnectTimeout(3000);
  http.setTimeout(3000);

  JsonDocument doc;
  doc["plantId"]  = plantId;
  doc["sensorId"] = sensorId;
  doc["value"]    = value;
  doc["unit"]     = unit;

  String jsonPayload;
  serializeJson(doc, jsonPayload);
  Serial.printf("Sending data for %s: %s\n", sensorId, jsonPayload.c_str());

  int httpCode = http.POST(jsonPayload);
  bool ok = false;
  if (httpCode <= 0) {
    Serial.printf("POST [%s] failed (%d): %s\n", sensorId, httpCode, http.errorToString(httpCode).c_str());
  } else if (httpCode >= 200 && httpCode < 300) {
    Serial.printf("POST [%s] success (HTTP %d)\n", sensorId, httpCode);
    ok = true;
  } else {
    Serial.printf("POST [%s] rejected (HTTP %d): %s\n", sensorId, httpCode, http.getString().c_str());
  }
  http.end();

  // Process incoming commands immediately after each send
  server.handleClient();
  return ok;
}

// Sends a value only if it changed by more than the threshold since the last
// SUCCESSFUL send. If sending fails, it is retried in the next interval.
void sendIfChanged(const char* sensorId, float value, float& lastSent, float threshold, const char* unit) {
  if (fabsf(value - lastSent) <= threshold) return;

  if (sendSingleSensor(sensorId, value, unit)) {
    lastSent = value;
  }
  delay(100);  // 100ms breather for the Pi socket stack
  server.handleClient();
}


// =====================================================================
//  Setup & Loop
// =====================================================================

void setup() {
  Serial.begin(115200);
  delay(500);

  ring.begin();
  ring.clear();
  ring.show();
  xTaskCreatePinnedToCore(ledTask, "led", 4096, nullptr, 1, nullptr, 1);

  servo1.attach(SERVO1_PIN, 500, 2400);
  servo2.attach(SERVO2_PIN, 500, 2400);
  updateServos(1);

  dht.begin();
  pinMode(LDRPIN, INPUT);

  // Caddy on the Pi uses its own self-signed CA ("Caddy Local Authority"),
  // so the certificate is not verified. Traffic is encrypted but not authenticated.
  tlsClient.setInsecure();
  tlsClient.setHandshakeTimeout(5);  // seconds; default would block for 120 s

  connectWiFi();
  server.on("/api/servo", HTTP_POST, handleServoCommand);
  server.on("/api/light", HTTP_POST, handleLightCommand);
  server.onNotFound(handleNotFound);
  server.begin();

  lastSendTime = millis();
}

void loop() {
  // Always handle incoming requests with priority
  server.handleClient();

  if (millis() - lastSendTime >= sendInterval) {
    lastSendTime = millis();

    if (WiFi.status() != WL_CONNECTED) {
      connectWiFi();
    } else {
      float humidity    = dht.readHumidity();
      float temperature = dht.readTemperature();
      int   lightRaw    = analogRead(LDRPIN);

      if (!isnan(humidity) && !isnan(temperature)) {
        sendIfChanged("temp_sensor_01", temperature, oldTemp, thresholdTemp, "C");
        sendIfChanged("humidity_sensor_01", humidity, oldHum, thresholdHum, "%");
      } else {
        Serial.println("Warning: DHT reading timed out.");
      }

      // The LDR does not depend on the DHT, so it is sent even if the DHT failed
      sendIfChanged("ldr_sensor_01", (float)lightRaw, oldLight, thresholdLight, "adc");
    
      getHeight(plantId);  // Fetch the latest height command from the Pi
    }
  }

  // Minimal yield to let background Wi-Fi tasks and web server breathe
  yield();
}
