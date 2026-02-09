// Web Serial API Implementation for Arduino Communication
// No server-side serial libraries required - runs entirely in the browser

const connectBtn = document.getElementById('connectBtn');
const disconnectBtn = document.getElementById('disconnectBtn');
const statusDiv = document.getElementById('status');
const anglesTailInput = document.getElementById('angles-tail-input');
const anglesClearBtn = document.getElementById('angles-clear');
const anglesTbody = document.querySelector('#angles-table tbody');
const anglesChartEl = document.getElementById('angles-chart');

let port = null;
let reader = null;
let readerClosed = false;
let angleData = [];
let chart = null;
let sampleCount = 0;

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
    
    // Check if Web Serial API is available
    if (!navigator.serial) {
        statusDiv.innerHTML = '<strong>⚠ Web Serial API not supported</strong><br>Please use Chrome, Edge, or Opera browser.';
        statusDiv.className = 'status disconnected';
        connectBtn.disabled = true;
    }
});
