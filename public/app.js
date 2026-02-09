const tailInput = document.getElementById('tail-input');
const tailSize = document.getElementById('tail-size');
const refreshBtn = document.getElementById('refresh');
const tbody = document.querySelector('#raw-table tbody');
const serialPortInput = document.getElementById('serial-port');
const serialBaudInput = document.getElementById('serial-baud');
const serialStartBtn = document.getElementById('serial-start');
const serialStopBtn = document.getElementById('serial-stop');
// Angles elements
const anglesTailInput = document.getElementById('angles-tail-input');
const anglesTailSize = document.getElementById('angles-tail');
const anglesRefreshBtn = document.getElementById('angles-refresh');
const anglesTbody = document.querySelector('#angles-table tbody');
const anglesChartEl = document.getElementById('angles-chart');
const threeContainer = document.getElementById('three-container');

let anglesTail = parseInt(anglesTailInput.value, 10) || 50;
anglesTailInput.addEventListener('change', () => { anglesTail = parseInt(anglesTailInput.value, 10) || 50; anglesTailSize.textContent = anglesTail; fetchAndRenderAngles(); });
anglesRefreshBtn.addEventListener('click', () => fetchAndRenderAngles());

let tail = parseInt(tailInput.value, 10) || 50;
tailInput.addEventListener('change', () => {
  tail = parseInt(tailInput.value, 10) || 50;
  tailSize.textContent = tail;
  fetchAndRender();
});

refreshBtn.addEventListener('click', () => fetchAndRender());

function highlightClass(v) {
  return Math.abs(v) > 2 ? 'alert' : '';
}

async function fetchAndRender() {
  try {
    const res = await fetch(`/api/raw/owen?tail=${tail}`);
    const json = await res.json();
    const data = json.data || [];
    renderRows(data.map((r, i) => ({ ...r, _idx: i + 1 })));
  } catch (e) {
    console.error('Failed to fetch data', e);
  }
}

function renderRows(rows) {
  tbody.innerHTML = '';
  rows.forEach((row) => {
    const tr = document.createElement('tr');
    const idx = document.createElement('td');
    idx.textContent = row._idx || '';

    const ax = document.createElement('td');
    ax.textContent = (row.ax || 0).toFixed(3);
    ax.className = highlightClass(row.ax || 0);

    const ay = document.createElement('td');
    ay.textContent = (row.ay || 0).toFixed(3);
    ay.className = highlightClass(row.ay || 0);

    const az = document.createElement('td');
    az.textContent = (row.az || 0).toFixed(3);
    az.className = highlightClass(row.az || 0);

    tr.appendChild(idx);
    tr.appendChild(ax);
    tr.appendChild(ay);
    tr.appendChild(az);

    tbody.appendChild(tr);
  });
}

// Live serial via SSE
let evtSource = null;
let liveBuffer = [];
serialStartBtn.addEventListener('click', async () => {
  const port = serialPortInput.value.trim();
  const baud = parseInt(serialBaudInput.value, 10) || 115200;
  if (!port) return alert('Enter serial port path');
  // Ask server to start serial
  await fetch('/api/serial/start', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ port, baud }) });
  startSSE();
});

serialStopBtn.addEventListener('click', async () => {
  await fetch('/api/serial/stop', { method: 'POST' });
  stopSSE();
});

function startSSE() {
  if (evtSource) return;
  evtSource = new EventSource('/stream/owen');
  evtSource.onmessage = (e) => {
    try {
      const obj = JSON.parse(e.data);
      // insert at end, keep size to tail
      liveBuffer.push({ ...obj, _idx: liveBuffer.length + 1 });
      if (liveBuffer.length > tail) liveBuffer.shift();
      renderRows(liveBuffer.map((r, i) => ({ ...r, _idx: i + 1 })));
    } catch (err) { console.error('Invalid SSE data', err); }
  };
  evtSource.onerror = (e) => { console.error('SSE error', e); stopSSE(); };
}

function stopSSE() {
  if (!evtSource) return;
  evtSource.close();
  evtSource = null;
  liveBuffer = [];
  fetchAndRender();
}

// Poll periodically
fetchAndRender();
setInterval(fetchAndRender, 1500);

// --- Angles: polling, chart and 3D setup ---
let anglesChart = null;
function initAnglesChart() {
  const ctx = anglesChartEl.getContext('2d');
  anglesChart = new Chart(ctx, {
    type: 'line',
    data: { labels: [], datasets: [
      { label: 'ax', borderColor: '#1f77b4', data: [], fill: false },
      { label: 'ay', borderColor: '#ff7f0e', data: [], fill: false },
      { label: 'az', borderColor: '#2ca02c', data: [], fill: false }
    ] },
    options: { animation: false, responsive: true, plugins: { legend: { position: 'top' } }, scales: { x: { display: true }, y: { display: true } } }
  });
}

function renderAngleRows(rows) {
  anglesTbody.innerHTML = '';
  rows.forEach((row, i) => {
    const tr = document.createElement('tr');
    const idx = document.createElement('td'); idx.textContent = i + 1;
    const ax = document.createElement('td'); ax.textContent = (row.ax||0).toFixed(2);
    const ay = document.createElement('td'); ay.textContent = (row.ay||0).toFixed(2);
    const az = document.createElement('td'); az.textContent = (row.az||0).toFixed(2);
    tr.appendChild(idx); tr.appendChild(ax); tr.appendChild(ay); tr.appendChild(az);
    anglesTbody.appendChild(tr);
  });
}

async function fetchAndRenderAngles() {
  try {
    const res = await fetch(`/api/raw/angles?tail=${anglesTail}`);
    const json = await res.json();
    const data = json.data || [];
    renderAngleRows(data.map((r,i)=>({...r,_idx:i+1})));
    // update chart
    if (!anglesChart) initAnglesChart();
    anglesChart.data.labels = data.map((_,i)=>i+1);
    anglesChart.data.datasets[0].data = data.map(d=>d.ax);
    anglesChart.data.datasets[1].data = data.map(d=>d.ay);
    anglesChart.data.datasets[2].data = data.map(d=>d.az);
    anglesChart.update('none');
  } catch (e) { console.error('Failed to fetch angles', e); }
}

// --- Three.js airplane ---
let scene, camera, renderer, airplane;
function initThree() {
  const width = threeContainer.clientWidth;
  const height = threeContainer.clientHeight;
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(width, height);
  threeContainer.innerHTML = '';
  threeContainer.appendChild(renderer.domElement);
  const light = new THREE.DirectionalLight(0xffffff, 1);
  light.position.set(5,10,7);
  scene.add(light);

  // simple airplane model
  airplane = new THREE.Group();
  const bodyGeo = new THREE.BoxGeometry(1.6, 0.3, 0.3);
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x5555ff });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  airplane.add(body);
  const wingGeo = new THREE.BoxGeometry(0.1, 2.0, 0.6);
  const wing = new THREE.Mesh(wingGeo, new THREE.MeshStandardMaterial({ color: 0x333333 }));
  wing.position.set(0,0,0);
  airplane.add(wing);
  const tailGeo = new THREE.BoxGeometry(0.05,0.6,0.4);
  const tail = new THREE.Mesh(tailGeo, bodyMat);
  tail.position.set(-0.8,0.2,0);
  airplane.add(tail);

  scene.add(airplane);
  camera.position.set(0, 3, 5);
  camera.lookAt(0,0,0);

  function animate(){ requestAnimationFrame(animate); renderer.render(scene, camera); }
  animate();
}

function applyAnglesToAirplane(ax, ay, az) {
  if (!airplane) return;
  // assume ax,ay,az are degrees; convert to radians
  const rx = (ax || 0) * Math.PI/180; // pitch
  const ry = (ay || 0) * Math.PI/180; // roll
  const rz = (az || 0) * Math.PI/180; // yaw
  airplane.rotation.x = rx;
  airplane.rotation.y = ry;
  airplane.rotation.z = rz;
}

// SSE for angles
let anglesEvt = null;
function startAnglesSSE() {
  if (anglesEvt) return;
  anglesEvt = new EventSource('/stream/angles');
  anglesEvt.onmessage = (e) => {
    try {
      const obj = JSON.parse(e.data);
      // update table/chart with this new point
      // keep newest anglesTail points
      const existing = anglesChart ? anglesChart.data.labels.length : 0;
      // fetch fresh tail for simplicity
      fetchAndRenderAngles();
      applyAnglesToAirplane(obj.ax, obj.ay, obj.az);
    } catch (err) { console.error('angles SSE parse', err); }
  };
  anglesEvt.onerror = () => { anglesEvt && anglesEvt.close(); anglesEvt = null; };
}

// initialize angles components
initAnglesChart();
initThree();
fetchAndRenderAngles();
startAnglesSSE();
