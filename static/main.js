const canvas = document.getElementById('track-canvas');
const ctx = canvas.getContext('2d');
const width = canvas.width;
const height = canvas.height;

// -- Variables de Simulation --
let allCarsData = {};
let allDrivers = [];
let animationFrameId;
let firstDataTimestamp = 0;
let lastDataTimestamp = 0;
let timeMultiplier = 10; // Vitesse par défaut
let currentSimulatedTime = 0; 
let lastFrameTime = 0;

// -- Variables de Rendu --
let scale = 1;
let xOffset = 0;
let yOffset = 0;
const driverColors = ['#DC0000', '#F91536', '#00D2BE', '#0090FF', '#3671C6', '#2293D1', '#F58020', '#5E8FAA', '#B6BABD', '#37BEDD', '#358C75', '#52E252', '#E6002B', '#9B0000', '#006F62', '#040000', '#6CD3BF', '#FF8700', '#C00000', '#005AFF'];

// Fonction appelée par les boutons HTML pour changer la vitesse
function setSpeed(speed) {
    timeMultiplier = speed;
}

function setupScaling(locationData) {
    if (!locationData || locationData.length === 0) return;

    const minX = Math.min(...locationData.map(p => p.x));
    const maxX = Math.max(...locationData.map(p => p.x));
    const minY = Math.min(...locationData.map(p => p.y));
    const maxY = Math.max(...locationData.map(p => p.y));

    const padding = 50;
    const dataWidth = maxX - minX;
    const dataHeight = maxY - minY;

    scale = Math.min((width - 2 * padding) / dataWidth, (height - 2 * padding) / dataHeight);
    xOffset = (width - dataWidth * scale) / 2 - minX * scale;
    yOffset = (height - dataHeight * scale) / 2 - minY * scale;
}

function drawTrackOutline(locationData) {
    ctx.clearRect(0, 0, width, height);
    if (locationData.length === 0) return;

    ctx.strokeStyle = 'white';
    ctx.lineWidth = 3;
    ctx.beginPath();

    for (let i = 0; i < locationData.length; i++) {
        const p = locationData[i];
        const canvasX = p.x * scale + xOffset;
        const canvasY = height - (p.y * scale + yOffset);

        if (i === 0) {
            ctx.moveTo(canvasX, canvasY);
        } else {
            ctx.lineTo(canvasX, canvasY);
        }
    }
    ctx.stroke();
}

function animate(timestamp) {
    if (!lastFrameTime) lastFrameTime = timestamp;
    
    const deltaTime = timestamp - lastFrameTime;
    lastFrameTime = timestamp;

    currentSimulatedTime += deltaTime * timeMultiplier;
    
    const targetDataTimestamp = firstDataTimestamp + currentSimulatedTime;

    drawTrackOutline(Object.values(allCarsData)[0] || []);

    allDrivers.forEach((driver, index) => {
        const driverData = allCarsData[driver.driver_number];
        if (!driverData) return;

        let currentIndex = driverData.findIndex(p => new Date(p.date).getTime() >= targetDataTimestamp);
        if (currentIndex === -1) currentIndex = driverData.length - 1;

        const point = driverData[currentIndex];
        if (point) {
            const canvasX = point.x * scale + xOffset;
            const canvasY = height - (point.y * scale + yOffset);

            ctx.fillStyle = driverColors[index % driverColors.length];
            ctx.beginPath();
            ctx.arc(canvasX, canvasY, 6, 0, 2 * Math.PI);
            ctx.fill();

            ctx.fillStyle = 'black';
            ctx.font = 'bold 10px Arial';
            ctx.fillText(point.driver_number, canvasX - 4, canvasY + 3);
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
    
    const trackData = Object.values(allCarsData)[0] || [];
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
    
    animationFrameId = requestAnimationFrame(animate);
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

    ctx.font = '20px Arial';
    ctx.fillStyle = 'white';
    ctx.fillText("Récupération de la liste des pilotes...", 250, 300);

    try {
        allDrivers = await getDrivers(sessionKey);
        if (!allDrivers || allDrivers.length === 0) {
            ctx.clearRect(0, 0, width, height);
            ctx.fillText("Impossible de récupérer les pilotes.", 250, 300);
            return;
        }

        for (let i = 0; i < allDrivers.length; i++) {
            const driver = allDrivers[i];
            
            ctx.clearRect(0, 0, width, height);
            ctx.fillText(`Chargement des pilotes (${i + 1}/${allDrivers.length}) : ${driver.full_name}...`, 250, 300);

            const locationData = await getLocationForDriver(sessionKey, driver.driver_number);
            
            if (locationData && locationData.length > 0) {
                allCarsData[driver.driver_number] = locationData
                    .filter(p => !(p.x === 0 && p.y === 0))
                    .sort((a, b) => new Date(a.date) - new Date(b.date));
            }

            await sleep(400);
        }

        startSimulation();
    } catch (error) {
        console.error("Une erreur est survenue lors du chargement :", error);
        ctx.clearRect(0, 0, width, height);
        ctx.fillText("Une erreur est survenue. Vérifiez la console.", 250, 300);
    }
}

main();
