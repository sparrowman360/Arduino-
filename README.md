# Arduino UNO + ADXL335 — collision detection + serial-to-web bridge

Files added:
- `collision_detection.ino` — Arduino sketch that implements collision detection and emits CSV `Ax,Ay,Az` over Serial.
- `server.js` — Node.js serial-to-web bridge exposing `/accel` and a simple web UI.
- `package.json` — Node dependencies and start script.

Quick setup

1. Connect your Arduino UNO to the host via USB.
2. Open `collision_detection.ino` in the Arduino IDE (or VS Code Arduino extension):
   - In Arduino IDE: File → Open → navigate to this workspace and open `/workspaces/Arduino-/collision_detection.ino`.
   - Select **Tools → Board → Arduino Uno** and select the correct **Port** (e.g. `/dev/ttyACM0` or `/dev/ttyUSB0`).
   - Click Upload. The sketch will run on the UNO.

Notes on the upload process (detailed for beginners)
- Ensure the UNO is connected via a USB cable that supports data (not just charging).
- In Arduino IDE, select the correct board (`Arduino Uno`) and the COM/tty port shown under Tools → Port.
- Click the right-arrow Upload button; status will show compile and upload progress. After upload, the sketch runs automatically.

Serial output and verifying
- Open the Serial Monitor (Tools → Serial Monitor) at `9600` baud to see CSV lines like `-0.01,0.02,1.01` representing Ax,Ay,Az in g.

Run the web bridge

1. Install Node.js (v18+ recommended) and npm.
2. From this project folder run:

```bash
cd /workspaces/Arduino-
npm install
```

3. Start the server. Replace the path if your Arduino uses a different device node:

```bash
SERIAL_PORT=/dev/ttyACM0 node server.js
```

Or pass the serial path as an argument:

```bash
node server.js /dev/ttyACM0
```

4. Open your browser at `http://localhost:3000` to view live values, or GET `http://localhost:3000/accel` to fetch the latest JSON.

Troubleshooting
- If you see no serial output: confirm the UNO is connected and the correct port is used. Verify `/dev/ttyACM0` or `/dev/ttyUSB0` exists.
- If upload fails: make sure the correct board and port are selected and no other application (like another serial monitor) holds the port.
- If data looks offset, verify ADXL335 wiring (Vcc, GND, X→A0, Y→A1, Z→A2) and that module Vcc matches expected reference (3.3V vs 5V).
# Arduino-
For BRAE 328
