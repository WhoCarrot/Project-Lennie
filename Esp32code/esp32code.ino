#include <AsyncTCP.h>
#include <AsyncEventSource.h>
#include <AsyncJson.h>
#include <AsyncWebSocket.h>
#include <ESPAsyncWebServer.h>
#include <SPIFFSEditor.h>
#include <StringArray.h>
#include <WebAuthentication.h>
#include <WebHandlerImpl.h>
#include <WebResponseImpl.h>
#include "webpage.h"
#include "WiFi.h"
#include <list> // for list operations 
using namespace std; 

AsyncWebServer server(80);

struct setting {
  int pin;
  double ontime;
  double del;
  double next;
  double turn_off;

  setting(int _pin, double _ontime, double _del, double _next) {
    pin = _pin;
    ontime = _ontime;
    del = _del;
    next = _next;
    turn_off = 0;
  }
};

const char* ssid = "PROJECT LENNIE";
const char* pass = "dit is cool zeg!";

const int pin_amount = 4;
const int pins[pin_amount] = {32, 15, 33, 27};
const int relay1 = 26;
const int relay2 = 25;
const int button = 21;

vector<setting> settings;
unsigned int next_step_id = 0;
double next_step = 0;
double percentage_done = 0;
double experiment_time_duration = 60 * 1000;
double experiment_time_current = 0;
double experiment_time_setback_precentage = 10;
double length_start = 100;
double length_end = 200;
double hardness_start = 80;
double hardness_end = 40;
double divider = 100;
double start_time = -1;
double last_time = -1;
bool pressed = false;
bool cooldown = false;

void setup() {
  Serial.begin(115200);
  Serial.println("Starting Project Lennie...");

  Serial.println("Setting up Access Point...");
  WiFi.softAP(ssid, pass);
  IPAddress ip = WiFi.softAPIP();
  Serial.print("Access Point launched with ip address: ");
  Serial.println(ip);

  server.on("/", HTTP_GET, [](AsyncWebServerRequest* request) {
    request->send(200, "text/html", html);
  });
  
  AsyncCallbackJsonWebHandler* handler = new AsyncCallbackJsonWebHandler("/vibrators", [](AsyncWebServerRequest *request, JsonVariant &json) {
    JsonObject& jsonObj = json.as<JsonObject>();
    JsonArray& jsonArray = jsonObj.get<JsonArray>("values");
    settings.erase(settings.begin(), settings.end());

    hardness_start = jsonObj.get<double>("hardnessfrom");
    hardness_end = jsonObj.get<double>("hardnessto");
    length_start = jsonObj.get<double>("lengthfrom");
    length_end = jsonObj.get<double>("lengthto");
    experiment_time_duration = jsonObj.get<double>("experimenttimeduration") * 1000;
    experiment_time_setback_precentage = jsonObj.get<double>("setbackpercentage");
    
    for(const auto& value : jsonArray) {
      const int json_pin = value["id"];
      const double json_ontime = value["ontime"];
      const double json_del = value["delay"];
      const double json_next = value["next"];
      settings.push_back(setting(json_pin, json_ontime, json_del, json_next));
    }

    reset();

    Serial.println("New settings received, starting experiment!");
    
    request->send(200);
  });
  server.addHandler(handler);

  server.begin();

  Serial.println("Setting up outputs...");
  for (int i = 0; i < 4; i++) {
    pinMode(pins[i], OUTPUT);
    ledcAttachPin(pins[i], i);
    ledcSetup(i, 12000, 8);
  }
  pinMode(relay1, OUTPUT);
  pinMode(relay2, OUTPUT);
  pinMode(button, INPUT);
  
  Serial.println("Outputs set up");
  Serial.println("Testing outputs...");
  for (int i = pin_amount - 1; i >= 0; i--) {
    if (i != pin_amount) {
      ledcWrite(i + 1, 0);
    }
    for (int j = 0; j < 256; j++) {
      ledcWrite(i, j);
      delay(1);
    }
    for (int j = 255; j >= 0; j--) {
      ledcWrite(i, j);
      delay(1);
    }
  }
  ledcWrite(0, 0);
  Serial.println("Outputs tested");

  Serial.println();
  Serial.println("Waiting for HTTP input...");
}

void reset() {
    experiment_time_current = 0;
    percentage_done = 0;
    start_time = -1;
    last_time = -1;
    next_step = 0;
    cooldown = false;
    for (setting sett : settings) {
      ledcWrite(sett.pin, 0);
      sett.turn_off = 0;
    }
}

double math_map(double inValue, double inMin, double inMax, double outMin, double outMax) {
  double temp = (inValue - inMin) / (inMax - inMin);
  return outMin + (outMax - outMin) * temp;
}

void loop() {
  if (settings.size() == 0) return;
  if (percentage_done >= 100) {
    reset();
    cooldown = true;
  }
  if (cooldown) {
    if (digitalRead(button)) {
      reset();
      return;      
    } else return;
  }
  if (start_time == -1) start_time = millis();

  // Calculate time
  double current_time = millis();
  if (last_time == -1) last_time = current_time; 
  double current_length = math_map(percentage_done, 0, 100, length_start, length_end) / divider;
  double relative_elapsed_time = (current_time - last_time) / current_length;
  last_time = current_time;
  
  // Add elapsed time to current experiment time
  experiment_time_current += relative_elapsed_time;

  // Calculate percentage done
  percentage_done = (experiment_time_current / experiment_time_duration) * 100;
  
  // Setback timer when button has been pressed
  if (digitalRead(button)) {
    if (!pressed) {
      experiment_time_current -= experiment_time_duration * (experiment_time_setback_precentage / divider);
      if (experiment_time_current < 0) experiment_time_current = 0;
      next_step = 0;
      for (setting sett : settings) {
        ledcWrite(sett.pin, 0);
        sett.turn_off = 0;
      }
    }
    pressed = true;
  } else {
    pressed = false;
  }

  // If we should go to the next step, execute the next step
  unsigned int current_one_fuck_this = 0;
  if (experiment_time_current > next_step) {
    printf("%f, %f\n", percentage_done, current_length);

    
    double turn_off = experiment_time_current + settings[next_step_id].ontime;
    settings[next_step_id].turn_off = turn_off;

    next_step = turn_off + settings[next_step_id].del;
    current_one_fuck_this = settings[next_step_id].pin;
//    Serial.printf("pin: %i, turn off: %f, elapsed time: %f, ontime: %f, next step time: %f, next step id: %i\n", settings[next_step_id].pin, turn_off, elapsed_time, settings[next_step_id].ontime, next_step, next_step_id);

    int hardness = round(math_map(percentage_done, 0, 100, (hardness_start / divider) * 255, (hardness_end / divider) * 255));
//    Serial.printf("%i, %i\n", hardness, settings[next_step_id].pin);
    ledcWrite(settings[next_step_id].pin, hardness);
    next_step_id = settings[next_step_id].next;
  }

  // Turn all leds of where nessecary
  for (setting s : settings) {
    if (experiment_time_current >= s.turn_off && s.pin != current_one_fuck_this) {
      ledcWrite(s.pin, 0);
    }
  }
}
