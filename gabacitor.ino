/*
  ADXL335 Accelerometer Interface
  Arduino Uno
  Outputs X, Y, Z acceleration in g every 1 ms
*/

const int xPin = A0;
const int yPin = A1;
const int zPin = A2;

const float vRef = 5.0;        // Reference voltage (5V)
const float zeroG = 1.65;      // Zero-g voltage
const float sensitivity = 0.33; // V/g sensitivity

unsigned long lastTime = 0;
const unsigned long interval = 1; // 1 ms

void setup() {
  Serial.begin(115200);
}

void loop() {
  unsigned long currentTime = millis();

  if (currentTime - lastTime >= interval) {
    lastTime = currentTime;

    int xADC = analogRead(xPin);
    int yADC = analogRead(yPin);
    int zADC = analogRead(zPin);

    float xVoltage = (xADC * vRef) / 1023.0;
    float yVoltage = (yADC * vRef) / 1023.0;
    float zVoltage = (zADC * vRef) / 1023.0;

    float Ax = (xVoltage - zeroG) / sensitivity;
    float Ay = (yVoltage - zeroG) / sensitivity;
    float Az = (zVoltage - zeroG) / sensitivity;

    Serial.print(Ax, 3);
    Serial.print(",");
    Serial.print(Ay, 3);
    Serial.print(",");
    Serial.println(Az, 3);
  }
}
