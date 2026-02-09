// Web Serial API Implementation for Arduino Communication
// No server-side serial libraries required - runs entirely in the browser

const connectBtn = document.getElementById('connectBtn');
const disconnectBtn = document.getElementById('disconnectBtn');
const statusDiv = document.getElementById('status');
const anglesTailInput = document.getElementById('angles-tail-input');
const anglesClearBtn = document.getElementById('angles-clear');
const anglesTbody = document.querySelector('#angles-table tbody');
const anglesChartEl = document.getElementById('angles-chart');
const threeContainer = document.getElementById('three-container');

let port = null;
let reader = null;
let readerClosed = false;
let angleData = [];
let chart = null;
let sampleCount = 0;

// Three.js variables
let scene, camera, renderer, cube;
let currentTheta = 0, currentPsi = 0, currentPhi = 0;

// Initialize chart
function initChart() {
    const ctx = anglesChartEl.getContext('2d');
    if (chart) {
        chart.destroy();
    }
    chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [
                {
                    label: 'Theta (°)',
                    data: [],
                    borderColor: '#007bff',
                    backgroundColor: 'rgba(0, 123, 255, 0.1)',
                    tension: 0.3,
                    pointRadius: 2,
                    pointHoverRadius: 4
                },
                {
                    label: 'Psi (°)',
                    data: [],
                    borderColor: '#28a745',
                    backgroundColor: 'rgba(40, 167, 69, 0.1)',
                    tension: 0.3,
                    pointRadius: 2,
                    pointHoverRadius: 4
                },
                {
                    label: 'Phi (°)',
                    data: [],
                    borderColor: '#ffc107',
                    backgroundColor: 'rgba(255, 193, 7, 0.1)',
                    tension: 0.3,
                    pointRadius: 2,
                    pointHoverRadius: 4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: 'top'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Angle (degrees)'
                    }
                }
            }
        }
    });
}

// Initialize Three.js scene with rotating cube
function initThreeJS() {
    const width = threeContainer.clientWidth;
    const height = threeContainer.clientHeight;

    // Scene setup
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a2e);

    // Camera setup
    camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.position.z = 3;

    // Renderer setup
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    threeContainer.appendChild(renderer.domElement);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 5, 5);
    scene.add(directionalLight);

    // Create cube
    const geometry = new THREE.BoxGeometry(2, 2, 2);
    const materials = [
        new THREE.MeshPhongMaterial({ color: 0xff6b6b }), // right
        new THREE.MeshPhongMaterial({ color: 0x4ecdc4 }), // left
        new THREE.MeshPhongMaterial({ color: 0xffe66d }), // top
        new THREE.MeshPhongMaterial({ color: 0x95e1d3 }), // bottom
        new THREE.MeshPhongMaterial({ color: 0xa8e6cf }), // front
        new THREE.MeshPhongMaterial({ color: 0xff8b94 })  // back
    ];
    cube = new THREE.Mesh(geometry, materials);
    scene.add(cube);

    // Add edges to cube for better visibility
    const edges = new THREE.EdgesGeometry(geometry);
    const lineSegments = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0x000000, linewidth: 2 }));
    cube.add(lineSegments);

    // Animation loop
    function animate() {
        requestAnimationFrame(animate);
        renderer.render(scene, camera);
    }
    animate();
}

// Update cube rotation based on accelerometer angles
function updateCubeRotation(theta, psi, phi) {
    if (!cube) return;
    currentTheta = theta * Math.PI / 180; // Convert to radians
    currentPsi = psi * Math.PI / 180;
    currentPhi = phi * Math.PI / 180;

    // Apply rotations: theta (X), psi (Y), phi (Z)
    cube.rotation.x = currentTheta;
    cube.rotation.y = currentPsi;
    cube.rotation.z = currentPhi;
}

// Update the table and chart with new data
function updateDisplay() {
    const tailSize = parseInt(anglesTailInput.value, 10) || 50;
    const displayData = angleData.slice(-tailSize);

    // Update table
    anglesTbody.innerHTML = '';
    displayData.forEach((row, idx) => {
        const tr = document.createElement('tr');
        const indexTd = document.createElement('td');
        indexTd.textContent = sampleCount - displayData.length + idx + 1;

        const thetaTd = document.createElement('td');
        thetaTd.textContent = row.theta.toFixed(2);

        const psiTd = document.createElement('td');
        psiTd.textContent = row.psi.toFixed(2);

        const phiTd = document.createElement('td');
        phiTd.textContent = row.phi.toFixed(2);

        tr.appendChild(indexTd);
        tr.appendChild(thetaTd);
        tr.appendChild(psiTd);
        tr.appendChild(phiTd);
        anglesTbody.appendChild(tr);
    });

    // Update chart
    if (chart) {
        chart.data.labels = displayData.map((_, i) => i + 1);
        chart.data.datasets[0].data = displayData.map(d => d.theta);
        chart.data.datasets[1].data = displayData.map(d => d.psi);
        chart.data.datasets[2].data = displayData.map(d => d.phi);
        chart.update();
    }

    // Update cube rotation with latest angle
    if (angleData.length > 0) {
        const latest = angleData[angleData.length - 1];
        updateCubeRotation(latest.theta, latest.psi, latest.phi);
    }
}

// Connect to Arduino via Web Serial API
async function connect() {
    try {
        // Request a port from the user
        port = await navigator.serial.requestPort();
        // Open the port at 9600 baud (matching Arduino sketch)
        await port.open({ baudRate: 9600 });

        readerClosed = false;
        connectBtn.disabled = true;
        disconnectBtn.disabled = false;
        statusDiv.textContent = '✓ Connected to Arduino';
        statusDiv.className = 'status connected';
        angleData = [];
        sampleCount = 0;
        initChart();
        updateDisplay();

        // Start reading data
        readLoop();
    } catch (err) {
        console.error('Failed to connect:', err);
        statusDiv.textContent = '✗ Connection failed: ' + err.message;
        statusDiv.className = 'status disconnected';
    }
}

// Disconnect from Arduino
async function disconnect() {
    readerClosed = true;
    if (reader) {
        await reader.cancel();
    }
    if (port) {
        await port.close();
        port = null;
    }
    connectBtn.disabled = false;
    disconnectBtn.disabled = true;
    statusDiv.textContent = '✗ Disconnected';
    statusDiv.className = 'status disconnected';
}

// Read data from Arduino in a loop
async function readLoop() {
    try {
        const textDecoder = new TextDecoderStream();
        const readableStreamClosed = port.readable.pipeTo(textDecoder.writable);
        reader = textDecoder.readable.getReader();

        let buffer = '';

        while (true) {
            const { value, done } = await reader.read();
            if (done) {
                if (readerClosed) {
                    break;
                }
                break;
            }

            buffer += value;
            const lines = buffer.split('\n');
            buffer = lines.pop(); // Keep incomplete line in buffer

            for (const line of lines) {
                const trimmedLine = line.trim();
                if (!trimmedLine) continue;

                // Parse CSV format: ang,theta,psi,phi
                const parts = trimmedLine.split(',').map(s => s.trim());
                if (parts.length >= 4 && parts[0].toLowerCase() === 'ang') {
                    try {
                        const theta = parseFloat(parts[1]);
                        const psi = parseFloat(parts[2]);
                        const phi = parseFloat(parts[3]);

                        if (!isNaN(theta) && !isNaN(psi) && !isNaN(phi)) {
                            sampleCount++;
                            angleData.push({ theta, psi, phi });
                            updateDisplay();
                        }
                    } catch (e) {
                        console.error('Error parsing data:', e);
                    }
                }
            }
        }
    } catch (err) {
        if (!readerClosed) {
            console.error('Error reading from port:', err);
            statusDiv.textContent = '✗ Error: ' + err.message;
            statusDiv.className = 'status disconnected';
        }
    }
}

// Event listeners
connectBtn.addEventListener('click', connect);
disconnectBtn.addEventListener('click', disconnect);
anglesTailInput.addEventListener('change', updateDisplay);
anglesClearBtn.addEventListener('click', () => {
    angleData = [];
    sampleCount = 0;
    updateDisplay();
});

// Initialize on page load
window.addEventListener('DOMContentLoaded', () => {
    initChart();
    initThreeJS();
    
    // Check if Web Serial API is available
    if (!navigator.serial) {
        statusDiv.innerHTML = '<strong>⚠ Web Serial API not supported</strong><br>Please use Chrome, Edge, or Opera browser.';
        statusDiv.className = 'status disconnected';
        connectBtn.disabled = true;
    }

    // Handle window resize
    window.addEventListener('resize', () => {
        if (renderer && camera) {
            const width = threeContainer.clientWidth;
            const height = threeContainer.clientHeight;
            camera.aspect = width / height;
            camera.updateProjectionMatrix();
            renderer.setSize(width, height);
        }
    });
});
