const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// SSE clients for live serial streaming
let sseClients = [];
function broadcastToSSE(obj) {
  const payload = `data: ${JSON.stringify(obj)}\n\n`;
  sseClients.forEach((res) => {
    try { res.write(payload); } catch (e) { /* ignore */ }
  });
}

// Simple serial support using serialport. Start via POST /api/serial/start
const SerialPort = require('serialport');
const Readline = require('@serialport/parser-readline');
let serialInstance = null;
let serialParser = null;
let serialOptions = { port: process.env.SERIAL_PORT || null, baudRate: parseInt(process.env.SERIAL_BAUD || '115200', 10) };

function startSerial(portPath, baudRate) {
  if (serialInstance) return { started: false, message: 'already_running' };
  try {
    serialInstance = new SerialPort(portPath, { baudRate: baudRate || 115200, autoOpen: true });
    serialParser = serialInstance.pipe(new Readline({ delimiter: '\n' }));
    const file = path.join(__dirname, 'data', 'owen_part_2.csv');

    serialParser.on('data', (line) => {
      const l = line.trim();
      if (!l) return;
      // Append to file for persistence
      fs.appendFile(file, l + '\n', () => {});

      // Parse CSV ax,ay,az
      const parts = l.split(',').map(s => s.trim());
      const ax = parseFloat(parts[0]) || 0;
      const ay = parseFloat(parts[1]) || 0;
      const az = parseFloat(parts[2]) || 0;
      const obj = { ax, ay, az, raw: l, ts: Date.now() };
      broadcastToSSE(obj);
    });

    serialInstance.on('error', (err) => console.error('Serial error', err.message));
    serialInstance.on('close', () => { serialInstance = null; serialParser = null; });
    return { started: true, port: portPath, baudRate };
  } catch (e) {
    serialInstance = null; serialParser = null;
    return { started: false, message: e.message };
  }
}

function stopSerial() {
  if (!serialInstance) return { stopped: false, message: 'not_running' };
  serialInstance.close();
  serialInstance = null; serialParser = null;
  return { stopped: true };
}

// Return last N lines parsed from CSV at data/owen_part_2.csv
app.get('/api/raw/owen', (req, res) => {
  const tail = parseInt(req.query.tail || '100', 10);
  const file = path.join(__dirname, 'data', 'owen_part_2.csv');

  fs.readFile(file, 'utf8', (err, data) => {
    if (err) {
      return res.json({ error: 'file_not_found', message: err.message, data: [] });
    }

    const lines = data.split(/\r?\n/).filter(Boolean);
    const selected = tail > 0 ? lines.slice(-tail) : lines;

    const parsed = selected.map((line) => {
      const parts = line.split(',').map((s) => s.trim());
      const ax = parseFloat(parts[0]) || 0;
      const ay = parseFloat(parts[1]) || 0;
      const az = parseFloat(parts[2]) || 0;
      return { ax, ay, az, raw: line };
    });

    res.json({ count: parsed.length, data: parsed });
  });
});

  // Serve raw angle data from data/angles.csv
  app.get('/api/raw/angles', (req, res) => {
    const tail = parseInt(req.query.tail || '100', 10);
    const file = path.join(__dirname, 'data', 'angles.csv');

    fs.readFile(file, 'utf8', (err, data) => {
      if (err) {
        return res.json({ error: 'file_not_found', message: err.message, data: [] });
      }

      const lines = data.split(/\r?\n/).filter(Boolean);
      const selected = tail > 0 ? lines.slice(-tail) : lines;

      const parsed = selected.map((line) => {
        const parts = line.split(',').map((s) => s.trim());
        const ax = parseFloat(parts[0]) || 0;
        const ay = parseFloat(parts[1]) || 0;
        const az = parseFloat(parts[2]) || 0;
        return { ax, ay, az, raw: line };
      });

      res.json({ count: parsed.length, data: parsed });
    });
  });

  // Stream clients for angles SSE
  let sseAngleClients = [];
  function broadcastToAnglesSSE(obj) {
    const payload = `data: ${JSON.stringify(obj)}\n\n`;
    sseAngleClients.forEach((res) => {
      try { res.write(payload); } catch (e) { /* ignore */ }
    });
  }

  // Simple tail-watcher for data/angles.csv to broadcast appended lines
  const anglesFile = path.join(__dirname, 'data', 'angles.csv');
  let anglesFileSize = 0;
  try { anglesFileSize = fs.statSync(anglesFile).size; } catch (e) { anglesFileSize = 0; }

  fs.watchFile(anglesFile, { interval: 500 }, (curr, prev) => {
    if (curr.size > prev.size) {
      const stream = fs.createReadStream(anglesFile, { start: prev.size, end: curr.size });
      let buf = '';
      stream.on('data', (chunk) => { buf += chunk.toString(); });
      stream.on('end', () => {
        const lines = buf.split(/\r?\n/).filter(Boolean);
        lines.forEach((line) => {
          const parts = line.split(',').map(s => s.trim());
          const ax = parseFloat(parts[0]) || 0;
          const ay = parseFloat(parts[1]) || 0;
          const az = parseFloat(parts[2]) || 0;
          const obj = { ax, ay, az, raw: line, ts: Date.now() };
          broadcastToAnglesSSE(obj);
        });
      });
    }
  });

  app.get('/stream/angles', (req, res) => {
    res.set({ 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
    res.flushHeaders && res.flushHeaders();
    res.write('retry: 10000\n\n');
    sseAngleClients.push(res);
    req.on('close', () => { sseAngleClients = sseAngleClients.filter(c => c !== res); });
  });

  // SSE endpoint for live serial stream
  app.get('/stream/owen', (req, res) => {
    res.set({ 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
    res.flushHeaders && res.flushHeaders();
    res.write('retry: 10000\n\n');
    sseClients.push(res);
    req.on('close', () => { sseClients = sseClients.filter(c => c !== res); });
  });

  // Control serial via API
  app.post('/api/serial/start', (req, res) => {
    const { port, baud } = req.body || {};
    if (!port) return res.status(400).json({ error: 'missing_port' });
    const r = startSerial(port, baud || 115200);
    res.json(r);
  });

  app.post('/api/serial/stop', (req, res) => {
    const r = stopSerial();
    res.json(r);
  });

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
