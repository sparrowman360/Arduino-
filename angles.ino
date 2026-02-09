// ADXL335 Accelerometer Angle Detection
// Reads acceleration from X, Y, Z axes and calculates angles

// Pin Configuration
const int X_PIN = A0;
const int Y_PIN = A1;
const int Z_PIN = A2;

// Baud rate for serial communication
const int BAUD_RATE = 9600;

// ADC conversion constants
const float ADC_MAX = 1023.0;
const float VREF = 5.0;
const float V_OFFSET = 1.65;      // Zero-g voltage offset
const float SENSITIVITY = 0.33;   // V/g sensitivity

void setup() {
  // Initialize serial communication
  Serial.begin(BAUD_RATE);
  
  // Set analog pins as inputs
  pinMode(X_PIN, INPUT);
  pinMode(Y_PIN, INPUT);
  pinMode(Z_PIN, INPUT);
}

void loop() {
  // Read raw ADC values
  int rawX = analogRead(X_PIN);
  int rawY = analogRead(Y_PIN);
  int rawZ = analogRead(Z_PIN);
  
  // Convert ADC values to acceleration (g-force)
  float Axout = (((rawX * VREF) / ADC_MAX) - V_OFFSET) / SENSITIVITY;
  float Ayout = (((rawY * VREF) / ADC_MAX) - V_OFFSET) / SENSITIVITY;
  float Azout = (((rawZ * VREF) / ADC_MAX) - V_OFFSET) / SENSITIVITY;
  
  // Calculate angles in radians
  float theta_rad = atan(Axout / sqrt(Ayout * Ayout + Azout * Azout));
  float psi_rad = atan(Ayout / sqrt(Axout * Axout + Azout * Azout));
  float phi_rad = atan(sqrt(Axout * Axout + Ayout * Ayout) / Azout);
  
  // Convert radians to degrees
  float theta_deg = theta_rad * 180.0 / PI;
  float psi_deg = psi_rad * 180.0 / PI;
  float phi_deg = phi_rad * 180.0 / PI;
  
  // Output as CSV format: ang,theta,psi,phi
  Serial.print("ang,");
  Serial.print(theta_deg, 2);
  Serial.print(",");
  Serial.print(psi_deg, 2);
  Serial.print(",");
  Serial.println(phi_deg, 2);
  
  // 100ms delay between readings
  delay(100);
}
