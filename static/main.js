const canvas = document.getElementById('track-canvas');
const ctx = canvas.getContext('2d');

// -- Variables de Simulation --
let allCarsData = {};
let allDrivers = [];
let currentSessionDetails = null;
let animationFrameId;
let firstDataTimestamp = 0;
let lastDataTimestamp = 0;
let timeMultiplier = 10;
let currentSimulatedTime = 0; 
let lastFrameTime = 0;
let isPaused = false;

// -- Variables de Rendu --
let scale = 1;
let xOffset = 0;
let yOffset = 0;

// --- SOLUTION DE CONTOURNEMENT POUR LES COULEURS ---
// On code en dur les couleurs des équipes de la saison 2023
const teamColors = new Map([
    ['Red Bull Racing', '#060024'],
    ['Ferrari', '#DC0000'],
    ['Mercedes', '#00D2BE'],
    ['Alpine', '#0090FF'],
    ['McLaren', '#FF8700'],
    ['Alfa Romeo', '#900000'],
    ['Aston Martin', '#006F62'],
    ['Haas F1 Team', '#FFFFFF'],
    ['AlphaTauri', '#2B4562'],
    ['Williams', '#005AFF']
]);

// --- Fonctions de contrôle ---
function setSpeed(speed) {
    timeMultiplier = speed;
    updateSpeedButtonsUI();
}

function togglePlayPause() {
    isPaused = !isPaused;
    const btn = document.getElementById('playPauseBtn');
    if (isPaused) {
        btn.textContent = 'Play';
        btn.className = 'paused';
        cancelAnimationFrame(animationFrameId);
    } else {
        btn.textContent = 'Pause';
        btn.className = 'playing';
        lastFrameTime = 0;
        animationFrameId = requestAnimationFrame(animate);
    }
}

function updateSpeedButtonsUI() {
    const buttons = document.querySelectorAll('#controls .control-group:nth-of-type(2) button');
    buttons.forEach(button => {
        button.classList.remove('active');
        if (parseInt(button.textContent.replace('x', '')) === timeMultiplier) {
            button.classList.add('active');
        }
    });
}

// --- Fonctions de Rendu ---
function setupScaling(locationData) {
    if (!locationData || locationData.length === 0) return;

    const container = document.getElementById('track-container');
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;

    const minX = Math.min(...locationData.map(p => p.x));
    const maxX = Math.max(...locationData.map(p => p.x));
    const minY = Math.min(...locationData.map(p => p.y));
    const maxY = Math.max(...locationData.map(p => p.y));

    const padding = 50;
    const dataWidth = maxX - minX;
    const dataHeight = maxY - minY;

    scale = Math.min((canvas.width - 2 * padding) / dataWidth, (canvas.height - 2 * padding) / dataHeight);
    xOffset = (canvas.width - dataWidth * scale) / 2 - minX * scale;
    yOffset = (canvas.height - dataHeight * scale) / 2 - minY * scale;
}

function drawTrackOutline(locationData) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (locationData.length === 0) return;

    ctx.strokeStyle = 'white';
    ctx.lineWidth = 4;
    ctx.beginPath();

    for (let i = 0; i < locationData.length; i++) {
        const p = locationData[i];
        const canvasX = p.x * scale + xOffset;
        const canvasY = canvas.height - (p.y * scale + yOffset);

        if (i === 0) {
            ctx.moveTo(canvasX, canvasY);
        } else {
            ctx.lineTo(canvasX, canvasY);
        }
    }
    ctx.stroke();
}

function animate(timestamp) {
    if (isPaused) return;

    if (!lastFrameTime) lastFrameTime = timestamp;
    
    const deltaTime = timestamp - lastFrameTime;
    lastFrameTime = timestamp;

    currentSimulatedTime += deltaTime * timeMultiplier;
    
    const targetDataTimestamp = firstDataTimestamp + currentSimulatedTime;

    drawTrackOutline(Object.values(allCarsData).find(data => data.length > 0) || []);

    allDrivers.forEach(driver => {
        const driverData = allCarsData[driver.driver_number];
        if (!driverData) return;

        let currentIndex = driverData.findIndex(p => new Date(p.date).getTime() >= targetDataTimestamp);
        if (currentIndex === -1) currentIndex = driverData.length - 1;

        const point = driverData[currentIndex];
        if (point) {
            const canvasX = point.x * scale + xOffset;
            const canvasY = canvas.height - (point.y * scale + yOffset);

            // Utilise la couleur de l'équipe via notre Map
            ctx.fillStyle = teamColors.get(driver.team_name) || 'grey';
            ctx.beginPath();
            ctx.arc(canvasX, canvasY, 12, 0, 2 * Math.PI);
            ctx.fill();

            ctx.fillStyle = 'black';
            ctx.font = 'bold 14px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(point.driver_number, canvasX, canvasY);
        }
    });

    if (targetDataTimestamp < lastDataTimestamp) {
        animationFrameId = requestAnimationFrame(animate);
    }
}

function startSimulation() {
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
    }
    
    const trackData = Object.values(allCarsData).find(data => data.length > 0) || [];
    if (trackData.length === 0) return;

    setupScaling(trackData);
    drawTrackOutline(trackData);

    let minTime = Infinity;
    let maxTime = -Infinity;
    
    for (const driverNumber in allCarsData) {
        const data = allCarsData[driverNumber];
        if (data && data.length > 0) {
            const first = new Date(data[0].date).getTime();
            const last = new Date(data[data.length - 1].date).getTime();
            if (first < minTime) minTime = first;
            if (last > maxTime) maxTime = last;
        }
    }
    
    firstDataTimestamp = minTime;
    lastDataTimestamp = maxTime;
    
    currentSimulatedTime = 0;
    lastFrameTime = 0; 
    
    document.getElementById('playPauseBtn').textContent = 'Pause';
    document.getElementById('playPauseBtn').className = 'playing';
    isPaused = false;
    updateSpeedButtonsUI();

    animationFrameId = requestAnimationFrame(animate);
}

// --- Fonctions de récupération de données ---
async function getSessions() {
    const response = await fetch(`/api/sessions`);
    if (!response.ok) throw new Error(`Erreur HTTP ! statut: ${response.status}`);
    return await response.json();
}

async function getDrivers(session_key) {
    const response = await fetch(`/api/drivers/${session_key}`);
    if (!response.ok) throw new Error(`Erreur HTTP ! statut: ${response.status}`);
    return await response.json();
}

async function getLocationForDriver(session_key, driver_number) {
    const response = await fetch(`/api/location/${session_key}?driver_number=${driver_number}`);
    if (!response.ok) throw new Error(`Erreur HTTP ! statut: ${response.status}`);
    return await response.json();
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
    const sessionKey = "9161";
    const circuitNameElement = document.getElementById('circuit-name');
    const sessionNameElement = document.getElementById('session-name');

    circuitNameElement.textContent = "Chargement...";
    sessionNameElement.textContent = "Récupération des détails de la session...";

    try {
        const allSessions = await getSessions();
        currentSessionDetails = allSessions.find(s => s.session_key == sessionKey);

        if (!currentSessionDetails) {
            circuitNameElement.textContent = "Erreur";
            sessionNameElement.textContent = "Session non trouvée.";
            return;
        }

        circuitNameElement.textContent = currentSessionDetails.circuit_short_name;
        sessionNameElement.textContent = `${currentSessionDetails.year} - ${currentSessionDetails.session_name}`;

        // On ne récupère plus les équipes, on utilise notre Map
        sessionNameElement.textContent = `Récupération de la liste des pilotes...`;
        allDrivers = await getDrivers(sessionKey);

        if (!allDrivers || allDrivers.length === 0) {
            sessionNameElement.textContent = "Impossible de récupérer les pilotes.";
            return;
        }

        for (let i = 0; i < allDrivers.length; i++) {
            const driver = allDrivers[i];
            
            sessionNameElement.textContent = `Chargement des pilotes (${i + 1}/${allDrivers.length}) : ${driver.full_name}...`;

            const locationData = await getLocationForDriver(sessionKey, driver.driver_number);
            
            if (locationData && locationData.length > 0) {
                allCarsData[driver.driver_number] = locationData
                    .filter(p => !(p.x === 0 && p.y === 0))
                    .sort((a, b) => new Date(a.date) - new Date(b.date));
            }

            await sleep(400);
        }
        
        sessionNameElement.textContent = `${currentSessionDetails.year} - ${currentSessionDetails.session_name}`;

        startSimulation();
    } catch (error) {
        console.error("Une erreur est survenue lors du chargement :", error);
        circuitNameElement.textContent = "Une erreur est survenue.";
        sessionNameElement.textContent = "Vérifiez la console pour plus de détails.";
    }
}

main();
