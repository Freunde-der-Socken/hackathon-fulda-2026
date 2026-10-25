#include <Arduino.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <WebServer.h>
#include <DHT.h>
#include <ArduinoJson.h>
#include <ESP32Servo.h>
#include <math.h>


const char* ssid     = "Hackathon";
const char* password = "Hackathon2026";
const char* serverUrl = "http://10.247.10.129:80/api/sensor-data";

#define DHTPIN 4
#define DHTTYPE DHT11
#define LDRPIN 34

#define SERVO1_PIN 18
#define SERVO2_PIN 19

DHT dht(DHTPIN, DHTTYPE);
Servo servo1;
Servo servo2;
WebServer server(80);

int servoTarget = 0;
int currentAngle = 15;
const char* plantId = "6f1c0b6e-2a4d-4c43-9a8e-0d6a2f1b7c11";

// Save old values
float oldTemp = UINT_MAX;
float oldHum = UINT_MAX;
int oldLight = UINT_MAX;
float thresholdTemp = 0.5; // 0.5°C change threshold
float thresholdHum = 2.0;  // 2% change threshold
int thresholdLight = 10;   // 10 ADC value change threshold

const unsigned long sendInterval = 5000;
unsigned long lastSendTime = 0;

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

void handleServoCommand() {
  int receivedVal = -1;

  if (server.hasArg("plain")) {
    String body = server.arg("plain");
    body.trim();
    if (body.startsWith("{")) {
      JsonDocument doc;
      if (!deserializeJson(doc, body)) {
        if (doc.containsKey("value")) receivedVal = doc["value"].as<int>();
        else if (doc.containsKey("position")) receivedVal = doc["position"].as<int>();
      }
    } else {
      receivedVal = body.toInt();
    }
  } else if (server.hasArg("value")) {
    receivedVal = server.arg("value").toInt();
  } else if (server.args() > 0) {
    receivedVal = server.argName(0).toInt();
  }

  if (receivedVal >= 1 && receivedVal <= 100) {
    updateServos(receivedVal);
    server.send(200, "text/plain", "OK");
  } else {
    server.send(400, "text/plain", "Invalid value. Expecting integer 1-100.");
  }
}

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


void sendSingleSensor(const char* sensorId, float value, const char* unit) {
  HTTPClient http;
  http.begin(serverUrl);
  http.addHeader("Content-Type", "application/json");
  // Explicitly tell the Pi server to close the socket after responding
  http.addHeader("Connection", "close");
  
  // 3000ms gives the Pi and Hackathon Wi-Fi enough time to respond
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
  if (httpCode <= 0) {
    Serial.printf("POST [%s] failed (%d): %s\n", sensorId, httpCode, http.errorToString(httpCode).c_str());
  } else {
    Serial.printf("POST [%s] success (HTTP %d)\n", sensorId, httpCode);
  }
  http.end();

  // Process incoming servo curls immediately after each send
  server.handleClient();
}

void sendAllSensorData(float temp, float hum, int light) {
  sendSingleSensor("temp_sensor_01", temp, "C");
  delay(100); // 100ms breather for the Pi socket stack
  server.handleClient();

  sendSingleSensor("humidity_sensor_01", hum, "%");
  delay(100);
  server.handleClient();

  sendSingleSensor("ldr_sensor_01", (float)light, "adc");
}


void setup() {
  Serial.begin(115200);
  delay(500);

  servo1.attach(SERVO1_PIN, 500, 2400);
  servo2.attach(SERVO2_PIN, 500, 2400);
  updateServos(1);

  dht.begin();
  pinMode(LDRPIN, INPUT);

  connectWiFi();
  server.on("/api/servo", HTTP_POST, handleServoCommand);
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
      float humidity = dht.readHumidity();
      float temperature = dht.readTemperature();
      int lightRaw = analogRead(LDRPIN);

      if (!isnan(humidity) && !isnan(temperature)) {
        // Check if the temperature has changed significantly
        if (abs(temperature - oldTemp) > thresholdTemp) {
          oldTemp = temperature;

            sendSingleSensor("temp_sensor_01", temperature, "C");
            delay(100); // 100ms breather for the Pi socket stack
            server.handleClient();
        }

        // Check if the humidity has changed significantly
        if (abs(humidity - oldHum) > thresholdHum) {
          oldHum = humidity;

          sendSingleSensor("humidity_sensor_01", humidity, "%");
          delay(100);
          server.handleClient();
        }

        // Check if the light level has changed significantly
        if (abs(lightRaw - oldLight) > thresholdLight) {
          oldLight = lightRaw;

          sendSingleSensor("ldr_sensor_01", (float)lightRaw, "adc");
          delay(100);
          server.handleClient();
        }

      } else {
        Serial.println("Warning: DHT reading timed out.");
      }
    }
  }

  // Minimal yield to let background Wi-Fi tasks and web server breathe
  yield();
}