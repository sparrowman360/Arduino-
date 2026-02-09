# Arduino Angle Visualizer

Web app to visualize Arduino incline angle measurements. Displays raw angle data, live plot, and animated 3D airplane that rotates with recorded angles.

## Option 1: Static HTML Viewer (No Installation)

**Fastest way to view angle data locally:**

1. Open [viewer.html](viewer.html) directly in your browser (double-click the file)
2. Enter the path: `data/angles.csv`
3. Click "Load Data"
4. View raw angles, plot, and 3D airplane

**Deploy to GitHub Pages:**
- Push to GitHub
- Go to Settings → Pages → Deploy from `main` branch
- Access at `https://<username>.github.io/<repo>/viewer.html`

## Option 2: Full Node.js App with Live Serial

**For live Arduino serial streaming:**

1. Install:
```bash
npm install
```

2. Start:
```bash
npm start
```

3. Connect Arduino and click "Start Serial"
