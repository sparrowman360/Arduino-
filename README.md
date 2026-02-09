# Arduino Visualizer

Minimal web app to visualize Arduino output. Currently implements the **Collision Detection** raw-data section that reads per-axis acceleration (ax, ay, az) in units of g from `data/owen_part_2.csv`.

Getting started

1. Install dependencies:

```bash
cd /workspaces/Arduino-
npm install
```

2. Start the server:

```bash
npm start
# then open http://localhost:3000 in your browser
```

Notes
- The raw data endpoint is GET `/api/raw/owen?tail=50` and returns the last N CSV lines as JSON.
# Values beyond ±2g are highlighted in red in the Collision Detection table.

- New: Inclination Angle Measurement section reads `data/angles.csv` (ax,ay,az in degrees) via GET `/api/raw/angles?tail=N`, displays raw rows, plots the three angles, and updates a simple 3D airplane in real time.

Next steps (waiting on your answers):
- Adjust angle source mapping (if Arduino sends angles on serial, specify message format)
- Improve 3D airplane model and controls (e.g., local axes conventions)
# Arduino-
For BRAE 328
