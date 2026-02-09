# Arduino Angle Visualizer - Complete Setup Guide

This guide will walk you through downloading everything, uploading the Arduino sketch, and viewing the data in your browser using the Web Serial API.

---

## System Requirements

- **Arduino Board** (compatible with ADXL335 accelerometer)
- **ADXL335 Accelerometer Module** connected to:
  - X-axis: Pin A0
  - Y-axis: Pin A1
  - Z-axis: Pin A2
  - VCC: 5V
  - GND: GND
- **Arduino IDE** (https://www.arduino.cc/en/software)
- **Web Browser** with Web Serial API support:
  - Google Chrome (v89+)
  - Microsoft Edge (v89+)
  - Opera (v76+)
  - NOT Firefox or Safari (yet)
- **Node.js** (optional, for running the local web server)
- **USB Cable** to connect Arduino to your computer

---

## Step 1: Download the Project

### Option A: Clone from GitHub
```bash
git clone https://github.com/sparrowman360/Arduino-.git
cd Arduino-
```

### Option B: Manual Download
1. Go to https://github.com/sparrowman360/Arduino-
2. Click the green "Code" button
3. Select "Download ZIP"
4. Extract the ZIP to a folder on your computer

---

## Step 2: Upload Arduino Sketch

### 2.1 Open Arduino IDE
1. Launch the **Arduino IDE**
2. Go to **File → Open**
3. Navigate to the project folder and open `angles.ino`

### 2.2 Configure Board and Port
1. Go to **Tools → Board** and select your board (e.g., "Arduino Uno")
2. Go to **Tools → Port** and select the USB port where your Arduino is connected
   - On Windows: `COM3`, `COM4`, etc.
   - On Mac: `/dev/cu.usbmodem14201`, etc.
   - On Linux: `/dev/ttyUSB0`, `/dev/ttyACM0`, etc.

### 2.3 Verify Hardware Setup
Before uploading, make sure the ADXL335 is properly connected:
- **X-axis** → **A0**
- **Y-axis** → **A1**
- **Z-axis** → **A2**
- **VCC** → **5V**
- **GND** → **GND**

### 2.4 Upload the Sketch
1. Click the **Upload** button (→ arrow icon) or press **Ctrl+U**
2. Wait for the message: `"Sketch uses X bytes... everything OK"`
3. The Arduino will reboot and start sending data at 9600 baud

---

## Step 3: Start the Web Server

The project includes a Node.js server, but you can skip this if you just want to open the HTML file directly in your browser.

### Option A: Using Node.js Server (Recommended)
1. Open a terminal/command prompt
2. Navigate to the project folder:
   ```bash
   cd Arduino-
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Start the server:
   ```bash
   npm start
   ```
   or
   ```bash
   node server.js
   ```
5. The server will start on `http://localhost:3000`

### Option B: Open HTML File Directly
1. Navigate to the `public` folder
2. Double-click `index.html` to open it in your browser
3. Or right-click → "Open with" → choose your browser

---

## Step 4: Connect and View Data

### 4.1 Open the Web Interface
- If using Node.js: Open http://localhost:3000 in your browser
- If opening directly: Open `public/index.html`

### 4.2 Connect to Arduino
1. Click the **"Connect to Arduino"** button
2. A browser dialog will appear listing available serial ports
3. Select the port where your Arduino is connected
4. Click **"Connect"**

### 4.3 View Your Data
Once connected, you should see:
- **Status indicator** showing "✓ Connected to Arduino" in green
- **Data table** showing individual Theta, Psi, and Phi angles with sample numbers
- **Live chart** displaying real-time angle data with three colored lines:
  - **Blue**: Theta angle
  - **Green**: Psi angle
  - **Yellow**: Phi angle

---

## How the Data Works

The Arduino sketch reads raw ADC values from the ADXL335 accelerometer and converts them to three orientation angles:

- **Theta (θ)**: Pitch angle - rotation around the Y-axis
- **Psi (ψ)**: Roll angle - rotation around the X-axis
- **Phi (φ)**: Yaw angle - rotation around the Z-axis

Data is transmitted every 100ms in this format:
```
ang,theta,psi,phi
ang,123.45,67.89,45.23
...
```

---

## Troubleshooting

### "Web Serial API not supported"
- You must use Chrome, Edge, or Opera
- Update your browser to the latest version
- Firefox and Safari don't support Web Serial API yet

### "Connection failed" or port doesn't appear
1. Check that Arduino is connected via USB
2. Verify the Arduino drivers are installed:
   - Windows: Install CH340 or FTDI drivers if needed
   - Mac: May require additional driver installation
   - Linux: Usually works out of the box
3. Check in Arduino IDE if the port is visible there first

### No data appearing after connection
1. Verify the ADXL335 is properly connected to A0, A1, A2
2. Check power supply to the accelerometer
3. Open Arduino IDE's Serial Monitor (Ctrl+Shift+M) at 9600 baud to verify data is being sent
4. Refresh the browser page

### Jumbled/incorrect angle values
1. Verify accelerometer calibration
2. Check that the accelerometer is securely connected
3. Try rotating the device slowly to see if values change appropriately

### Browser console shows errors
1. Open DevTools (F12) → Console tab
2. Check for any red error messages
3. Refresh the page and try reconnecting

---

## Using the Interface

### Clear Data
Click the **"Clear Data"** button to reset all collected samples and start fresh.

### Adjust Display Size
Change the input field next to "Display last" to show more or fewer samples in the table and chart.

### Disconnect
Click the **"Disconnect"** button to close the serial connection. You can reconnect anytime without restarting.

---

## File Structure

```
Arduino-/
├── angles.ino                 # Arduino sketch to upload
├── server.js                  # Node.js web server (optional)
├── package.json              # Dependencies
├── public/
│   ├── index.html            # Main webpage
│   ├── app.js                # Web Serial API implementation
│   └── styles.css            # CSS styles
├── data/                      # Sample data files
└── SETUP_GUIDE.md            # This file
```

---

## Technical Details: Web Serial API

The implementation uses the **Web Serial API** which allows browsers to communicate with serial devices directly without any server-side serial libraries. This means:

✓ **No external serial libraries needed** on the server
✓ **Browser handles all serial communication** directly
✓ **Works on Windows, Mac, and Linux**
✓ **Real-time data streaming** with low latency
✓ **Cross-platform compatibility** (Chrome, Edge, Opera)

The JavaScript code handles:
- Port selection and connection
- USB communication at 9600 baud
- Data parsing (CSV format)
- Real-time chart updates with Chart.js
- Table rendering with latest samples

---

## Advanced Usage

### Change Baud Rate
To use a different baud rate, edit line 129 in `public/app.js`:
```javascript
await port.open({ baudRate: 9600 }); // Change 9600 to desired rate
```

Also update the Arduino sketch in `angles.ino` line 9:
```cpp
const int BAUD_RATE = 9600; // Change to match
```

### Modify Chart Display
Edit the chart configuration in `public/app.js` around line 21 to change colors, line styles, or other properties.

### Add More Data Sensors
Extend the Arduino sketch to read from additional pins and modify the CSV output format accordingly. Update the parsing logic in `app.js` to handle the new fields.

---

## Support

If you encounter issues:
1. Check the troubleshooting section above
2. Verify browser compatibility (Chrome/Edge/Opera only)
3. Ensure Arduino IDE can communicate with your board
4. Check browser console (F12) for detailed error messages
5. Visit https://github.com/sparrowman360/Arduino- for more info

---

## Version Info

- **Arduino IDE**: 2.0+
- **Browser**: Chrome 89+, Edge 89+, Opera 76+
- **Node.js**: 14+ (optional, for server mode)
- **Chart.js**: 3.x (via CDN)

---

Good luck! 🚀
