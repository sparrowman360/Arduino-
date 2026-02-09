// Collision detection for Arduino UNO + ADXL335
// Implements detection using both if/else and while approaches.

const int xPin = A0; // ADXL335 X output
const int yPin = A1; // ADXL335 Y output
const int zPin = A2; // ADXL335 Z output
const int ledPin = 13; // onboard LED

float Axout, Ayout, Azout;
int xADC, yADC, zADC;

const float threshold = 2.8; // g threshold
const unsigned long blinkDuration = 3000; // milliseconds to blink when collision detected
const int blinkInterval = 200; // ms LED toggle interval while blinking

// Set this to false to use if/else implementation, true to use while-based implementation
bool USE_WHILE_METHOD = false;

void setup() {
  pinMode(ledPin, OUTPUT);
  digitalWrite(ledPin, LOW);
  Serial.begin(9600);
}

void loop() {
  if (USE_WHILE_METHOD) {
    collisionDetect_While();
  } else {
    collisionDetect_IfElse();
  }
  // send CSV over Serial for external intake (server bridge)
  printCSV();
  delay(10); // small pause to avoid flooding serial
}

// Reads ADCs, computes Axout/Ayout/Azout using provided formulas
void readAccelerations() {
  xADC = analogRead(xPin);
  yADC = analogRead(yPin);
  zADC = analogRead(zPin);

  Axout = (((xADC * 5.0) / 1023.0) - 1.65) / 0.33;
  Ayout = (((yADC * 5.0) / 1023.0) - 1.65) / 0.33;
  Azout = (((zADC * 5.0) / 1023.0) - 1.65) / 0.33;
}

// Implementation using if/else
void collisionDetect_IfElse() {
  readAccelerations();
  delay(2); // required 2ms between acceleration measurements

  if (abs(Axout) > threshold || abs(Ayout) > threshold || abs(Azout) > threshold) {
    unsigned long start = millis();
    while (millis() - start < blinkDuration) {
      digitalWrite(ledPin, HIGH);
      delay(blinkInterval);
      digitalWrite(ledPin, LOW);
      delay(blinkInterval);
    }
  } else {
    // do nothing
  }
}

// Implementation that uses a while statement to manage the blinking duration
void collisionDetect_While() {
  readAccelerations();
  delay(2); // required 2ms between acceleration measurements

  // If threshold exceeded, enter a while loop to blink for blinkDuration
  if (abs(Axout) > threshold || abs(Ayout) > threshold || abs(Azout) > threshold) {
    unsigned long endTime = millis() + blinkDuration;
    while (millis() < endTime) {
      digitalWrite(ledPin, HIGH);
      delay(blinkInterval);
      digitalWrite(ledPin, LOW);
      delay(blinkInterval);
    }
  }
}

// Optional helper to print values for troubleshooting
void printDebug() {
  Serial.print("xADC="); Serial.print(xADC);
  Serial.print(" Axout="); Serial.print(Axout);
  Serial.print(" yADC="); Serial.print(yADC);
  Serial.print(" Ayout="); Serial.print(Ayout);
  Serial.print(" zADC="); Serial.print(zADC);
  Serial.print(" Azout="); Serial.println(Azout);
}

// Print simple CSV: Ax,Ay,Az (floats) followed by newline
void printCSV() {
  Serial.print(Axout);
  Serial.print(',');
  Serial.print(Ayout);
  Serial.print(',');
  Serial.println(Azout);
}
