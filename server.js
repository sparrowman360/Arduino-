const SerialPort = require('serialport');
const Readline = require('@serialport/parser-readline');
const express = require('express');

const app = express();
const HTTP_PORT = process.env.PORT || 3000;
const SERIAL_PATH = process.env.SERIAL_PORT || process.argv[2] || '/dev/ttyACM0';
const BAUD = parseInt(process.env.BAUD) || 9600;

let latest = { ax: null, ay: null, az: null, ts: null };

const port = new SerialPort(SERIAL_PATH, { baudRate: BAUD, autoOpen: false });
const parser = port.pipe(new Readline({ delimiter: '\n' }));

port.open(err => {
  if (err) {
    console.error('Failed to open serial port', SERIAL_PATH, err.message);
    console.error('Set SERIAL_PORT env or pass path as argument.');
  } else {
    console.log('Serial port opened:', SERIAL_PATH, 'baud', BAUD);
  }
});

parser.on('data', line => {
  const parts = line.trim().split(/[,\s]+/);
  if (parts.length >= 3) {
    const ax = parseFloat(parts[0]);
    const ay = parseFloat(parts[1]);
    const az = parseFloat(parts[2]);
    if (!isNaN(ax) && !isNaN(ay) && !isNaN(az)) {
      latest = { ax, ay, az, ts: Date.now() };
    }
  }
});

app.get('/accel', (req, res) => {
  res.json(latest);
});

app.get('/', (req, res) => {
  res.send(`
    <!doctype html>
    <html>
    <head><meta charset="utf-8"><title>ADXL335 Live</title></head>
    <body>
      <h2>Latest Acceleration (g)</h2>
      <div id="vals">Waiting for data...</div>
      <script>
        async function fetchVals(){
          const res = await fetch('/accel');
          const j = await res.json();
          document.getElementById('vals').textContent = JSON.stringify(j);
        }
        setInterval(fetchVals, 200);
        fetchVals();
      </script>
    </body>
    </html>
  `);
});

app.listen(HTTP_PORT, () => {
  console.log('HTTP server listening on http://localhost:' + HTTP_PORT);
  console.log('Reading serial from', SERIAL_PATH, 'baud', BAUD);
});
