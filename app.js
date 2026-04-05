// ── State ────────────────────────────────────────────────────
let isDrawingMode = false;
let canvas, ctx;
let currentPage = 1;
let currentBook = null;

// NEW: Live Vitals State
let currentVitals = { hr: 72, sys: 120, dia: 80, o2: 98, temp: 98.6 };

// ── Vitals Simulation ────────────────────────────────────────
function startVitalsSimulation() {
  setInterval(() => {
    // Random walk for vitals
    currentVitals.hr += Math.floor(Math.random() * 5) - 2; // -2 to +2
    currentVitals.o2 += Math.floor(Math.random() * 3) - 1; // -1 to +1
    
    // Tiny fluctuations for BP and Temp
    if(Math.random() > 0.7) currentVitals.sys += Math.floor(Math.random() * 3) - 1;
    if(Math.random() > 0.8) currentVitals.temp += (Math.random() * 0.2 - 0.1);
    
    // Keep them within realistic bounds
    currentVitals.hr = Math.max(60, Math.min(100, currentVitals.hr));
    currentVitals.o2 = Math.max(92, Math.min(100, currentVitals.o2));
    currentVitals.sys = Math.max(110, Math.min(130, currentVitals.sys));

    // Update DOM
    document.getElementById('vital-hr').innerHTML = `${currentVitals.hr} <small>bpm</small>`;
    document.getElementById('vital-o2').innerHTML = `${currentVitals.o2} <small>%</small>`;
    document.getElementById('vital-bp').innerHTML = `${currentVitals.sys}/${currentVitals.dia} <small>mmHg</small>`;
    document.getElementById('vital-temp').innerHTML = `${currentVitals.temp.toFixed(1)} <small>°F</small>`;
  }, 2500); // Updates every 2.5 seconds
}

// ── Provider Activity Logger ─────────────────────────────────
function logActivity(message, isEmergency = false) {
  const container = document.getElementById('log-container');
  
  // Remove the "empty" placeholder if it exists
  const emptyPlaceholder = container.querySelector('.empty-log');
  if (emptyPlaceholder) emptyPlaceholder.remove();

  const now = new Date();
  const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  // Create the log card
  const logCard = document.createElement('div');
  logCard.className = `log-card ${isEmergency ? 'emergency' : ''}`;
  
  // Build the HTML with the specific vitals caught at this exact second
  logCard.innerHTML = `
    <div class="log-time">${timeString}</div>
    <div class="log-message">${message}</div>
    <div class="log-vitals-snapshot">
      HR: ${currentVitals.hr} | BP: ${currentVitals.sys}/${currentVitals.dia} | O2: ${currentVitals.o2}% | Temp: ${currentVitals.temp.toFixed(1)}°F
    </div>
  `;
  
  // Prepends it to the top of the list!
  container.prepend(logCard);
}

// ── Gaze Smoothing (Tuned for Responsiveness) ──────────────────
let lastSmoothed = { x: null, y: null };

const DEADZONE_RADIUS = 15; 
const EMA_ALPHA = 0.4;      

function smoothGaze(rawX, rawY) {
  if (lastSmoothed.x === null) {
    lastSmoothed = { x: rawX, y: rawY };
    return lastSmoothed;
  }

  const dx = rawX - lastSmoothed.x;
  const dy = rawY - lastSmoothed.y;
  const distance = Math.sqrt(dx * dx + dy * dy);

  if (distance < DEADZONE_RADIUS) {
    return lastSmoothed; 
  }

  let newX = (rawX * EMA_ALPHA) + (lastSmoothed.x * (1 - EMA_ALPHA));
  let newY = (rawY * EMA_ALPHA) + (lastSmoothed.y * (1 - EMA_ALPHA));

  lastSmoothed = { x: newX, y: newY };
  return lastSmoothed;
}

// ── Dwell Click & Magnetic Targeting ─────────────────────────
const DWELL_THRESHOLD = 1500;
let dwellTarget = null;
let dwellStartTime = 0;
let dwellCooldown = false;

function getGazeButton(x, y) {
  const buttons = document.querySelectorAll('.gaze-btn');
  let closestBtn = null;
  let minDistance = 150; 

  buttons.forEach(btn => {
    if (btn.offsetParent !== null) { 
      const rect = btn.getBoundingClientRect();
      const centerX = rect.left + (rect.width / 2);
      const centerY = rect.top + (rect.height / 2);
      
      let distance = Math.sqrt(Math.pow(centerX - x, 2) + Math.pow(centerY - y, 2));
      
      if (btn.classList.contains('side-nav')) {
        distance = distance * 0.5; 
      }
      
      if (distance < minDistance) {
        minDistance = distance;
        closestBtn = btn;
      }
    }
  });

  return closestBtn;
}

function handleDwellClick(x, y) {
  if (dwellCooldown) return;

  const btn = getGazeButton(x, y);

  if (btn) {
    if (dwellTarget !== btn) {
      resetDwell();
      dwellTarget = btn;
      dwellTarget.classList.add('dwelling');
      dwellStartTime = Date.now();
    } else {
      let requiredTime = DWELL_THRESHOLD;
      if (dwellTarget.classList.contains('side-nav')) {
        requiredTime = 700; 
      }

      if (Date.now() - dwellStartTime >= requiredTime) {
        dwellTarget.click();
        resetDwell();
        dwellCooldown = true;
        setTimeout(() => { dwellCooldown = false; }, 1200);
      }
    }
  } else {
    resetDwell();
  }
}

function resetDwell() {
  if (dwellTarget) {
    dwellTarget.classList.remove('dwelling');
    dwellTarget = null;
  }
}

// ── Calibration ───────────────────────────────────────────────
const CLICKS_REQUIRED = 5;
let dotsCompleted = 0;
const clickCounts = { pt1:0,pt2:0,pt3:0,pt4:0,pt5:0,pt6:0,pt7:0,pt8:0,pt9:0 };
const dotsDone = {};

function calibrateDot(dotId) {
  if (dotsDone[dotId]) return;

  clickCounts[dotId]++;
  const dot = document.getElementById(dotId);
  if (!dot) return;

  const progress = clickCounts[dotId] / CLICKS_REQUIRED;
  dot.style.opacity = 1 - progress * 0.7;
  dot.style.transform = `translate(-50%, -50%) scale(${1 - progress * 0.4})`;

  if (clickCounts[dotId] >= CLICKS_REQUIRED) {
    dotsDone[dotId] = true;
    dot.classList.add('done');
    dotsCompleted++;

    if (dotsCompleted >= 9) {
      webgazer.showFaceFeedbackBox(false);
      setTimeout(() => {
        switchView('home-view');
        speak('Calibration complete. Dashboard active.');
      }, 400);
    }
  }
}

function skipCalibration() {
  webgazer.showFaceFeedbackBox(false);
  switchView('home-view');
  speak('Calibration skipped. Dashboard active.');
}

// ── Books ─────────────────────────────────────────────────────
const books = [
  {
    title: "Sir Reginald's Missing Sock",
    pages: [
      "Sir Reginald, a corgi of immense dignity, had a problem. His favorite left sock, the one with the little rubber ducks on it, was missing.",
      "He sniffed the couch. He sniffed the radiator. He even sniffed the cat, who gave him a look of absolute disgust.",
      "Finally, he found it. It was completely buried inside the sofa cushions, alongside three tennis balls and a piece of old cheese. A successful quest indeed."
    ]
  },
  {
    title: "The Great Spaghetti Monster",
    pages: [
      "It started as a normal Tuesday dinner. But then, Timmy dropped a single noodle on the floor. It began to wiggle.",
      "Soon, the noodle rolled into a meatball, absorbing it entirely. It grew arms made of marinara sauce and demanded garlic bread.",
      "Timmy, armed only with a giant fork, stared down the pasta beast. 'You shall not pass!' he yelled, before eating it entirely."
    ]
  },
  {
    title: "Captain Fluff's Space Adventure",
    pages: [
      "Captain Fluff adjusted his tiny hamster helmet. The mission was dangerous, but someone had to find the legendary Asteroid of Sunflower Seeds.",
      "He engaged the hyper-wheel. His spaceship, the S.S. Squeak, shot past Mars and took a hard left at Jupiter.",
      "There it was. A rock the size of a minivan, made entirely of premium seeds. Captain Fluff wept a single, happy tear."
    ]
  },
  {
    title: "Mystery of the Burping Frog",
    pages: [
      "The swamp was usually quiet at night, except for a sound that sounded remarkably like a human burp echoing through the reeds.",
      "Detective Toad put on his magnifying glass. 'This is no ordinary frog,' he deduced, 'This frog has been drinking fizzy soda.'",
      "He found the culprit behind a lily pad, holding an empty can of Sprite and looking very unapologetic."
    ]
  },
  {
    title: "Attack of the Giant Pigeons",
    pages: [
      "They came from the sky, cooing aggressively. Pigeons, but the size of city buses. And they wanted our bread.",
      "Traffic came to a halt as a massive pigeon pecked at a hot dog stand, swallowing it whole in one gulp.",
      "The city was saved when the mayor deployed the ultimate weapon: a giant, motorized statue of a terrifying cat."
    ]
  },
  {
    title: "The Forgetful Squirrel",
    pages: [
      "Barnaby had a terrible memory. He knew he buried a magnificent acorn somewhere near the old oak tree, but which one?",
      "He dug a hole. Found a rock. Dug another hole. Found an old shoe. Dug a third hole and hit a water pipe.",
      "Eventually, he gave up and just ate a french fry he found on the sidewalk. It was a good day."
    ]
  }
];

// ── Init, Login & WOW Factors ────────────────────────────────
let particles = [];
let animationFrameId;

window.onload = function () {
  canvas = document.getElementById('gaze-canvas');
  ctx = canvas.getContext('2d');
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);
  
  // Start the WOW factors on page load
  initNetworkBackground();
  runDiagnosticsTicker();
};

// 1. The Neural Network Particle Background
function initNetworkBackground() {
  const bgCanvas = document.getElementById('network-bg');
  const bgCtx = bgCanvas.getContext('2d');
  
  bgCanvas.width = window.innerWidth;
  bgCanvas.height = window.innerHeight;

  // Create 50 floating nodes
  for (let i = 0; i < 50; i++) {
    particles.push({
      x: Math.random() * bgCanvas.width,
      y: Math.random() * bgCanvas.height,
      vx: (Math.random() - 0.5) * 0.5, // Move very slowly
      vy: (Math.random() - 0.5) * 0.5,
      radius: Math.random() * 2 + 1
    });
  }

  function animateParticles() {
    bgCtx.clearRect(0, 0, bgCanvas.width, bgCanvas.height);
    
    // Draw and move particles
    for (let i = 0; i < particles.length; i++) {
      let p = particles[i];
      p.x += p.vx;
      p.y += p.vy;

      // Bounce off walls
      if (p.x < 0 || p.x > bgCanvas.width) p.vx *= -1;
      if (p.y < 0 || p.y > bgCanvas.height) p.vy *= -1;

      bgCtx.beginPath();
      bgCtx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      bgCtx.fillStyle = 'rgba(0, 98, 155, 0.4)'; // UCSD Blue
      bgCtx.fill();

      // Draw lines between close particles
      for (let j = i + 1; j < particles.length; j++) {
        let p2 = particles[j];
        let dx = p.x - p2.x;
        let dy = p.y - p2.y;
        let dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 150) { // Connect if close
          bgCtx.beginPath();
          bgCtx.moveTo(p.x, p.y);
          bgCtx.lineTo(p2.x, p2.y);
          bgCtx.strokeStyle = `rgba(0, 98, 155, ${0.15 - dist/1000})`; 
          bgCtx.stroke();
        }
      }
    }
    animationFrameId = requestAnimationFrame(animateParticles);
  }
  animateParticles();
}

// 2. The Hacker/Diagnostics Ticker
function runDiagnosticsTicker() {
  const tickerText = document.getElementById('ticker-text');
  const messages = [
    "Establishing secure socket...",
    "Querying Epic Systems API...",
    "Calibrating neural tracking...",
    "Fetching patient records...",
    "Bypassing proxy server...",
    "Ready for authentication."
  ];
  
  let msgIndex = 0;
  setInterval(() => {
    msgIndex = (msgIndex + 1) % messages.length;
    tickerText.textContent = messages[msgIndex];
  }, 2500);
}

// 3. The Judge Demo Fast-Track Login
async function runDemoLogin(event) {
  event.preventDefault(); // Stop normal click
  
  const userField = document.getElementById('patient-id');
  const passField = document.getElementById('password');
  const btn = document.querySelector('.demo-login-btn');
  
  // Make it look like the computer took over
  btn.textContent = "Authenticating...";
  btn.style.background = "var(--primary)";
  btn.style.color = "white";

  // Simulate fast typing
  setTimeout(() => { userField.value = "UCSD_Guest"; }, 300);
  setTimeout(() => { passField.value = "••••••••"; }, 700);
  
  // Automatically click the real login button
  setTimeout(() => { 
    document.querySelector('.login-submit-btn').click(); 
  }, 1200);
}

// 4. The Real Login Logic
async function handleLogin(event) {
  event.preventDefault(); 

  // Hide the moving background to save CPU and remove distractions
  document.getElementById('network-bg').style.display = 'none';
  cancelAnimationFrame(animationFrameId);

  document.getElementById('vitals-bar').style.display = 'flex';
  startVitalsSimulation();
  switchView('calibration-view');

  await webgazer
    .setRegression('ridge')
    .setGazeListener((data) => {
      if (!data) return;
      const smoothed = smoothGaze(data.x, data.y);
      handleDwellClick(smoothed.x, smoothed.y);
      handleDrawing(smoothed.x, smoothed.y);
    })
    .begin();

  webgazer.showVideoPreview(true);
  webgazer.showPredictionPoints(true);
  webgazer.showFaceOverlay(true);
  webgazer.showFaceFeedbackBox(true);
}

// ── Drawing ───────────────────────────────────────────────────
function resizeCanvas() {
  if (!canvas) return;
  canvas.width = canvas.clientWidth;
  canvas.height = canvas.clientHeight;
  setDrawStyle();
}

function setDrawStyle() {
  ctx.strokeStyle = '#182B49'; 
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
}

function toggleDrawing() {
  isDrawingMode = !isDrawingMode;
  const btn = document.getElementById('toggle-draw-btn');
  if (isDrawingMode) {
    btn.textContent = 'Stop Drawing';
    btn.style.background = 'var(--primary-hover)';
    ctx.beginPath();
  } else {
    btn.textContent = 'Start Drawing';
    btn.style.background = '';
  }
}

function clearCanvas() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (isDrawingMode) ctx.beginPath();
}

function handleDrawing(x, y) {
  const drawView = document.getElementById('draw-view');
  if (!isDrawingMode || !drawView.classList.contains('active')) return;

  const rect = canvas.getBoundingClientRect();
  const cx = x - rect.left;
  const cy = y - rect.top;

  if (cx < 0 || cy < 0 || cx > canvas.width || cy > canvas.height) {
    ctx.beginPath();
    return;
  }

  ctx.lineTo(cx, cy);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx, cy);
}

// ── Navigation ────────────────────────────────────────────────
function switchView(viewId) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.getElementById(viewId).classList.add('active');
  if (viewId !== 'draw-view' && isDrawingMode) toggleDrawing();
  if (viewId === 'draw-view') setTimeout(resizeCanvas, 50);
  
  lastSmoothed = { x: null, y: null };
  resetDwell();
}

// ── Reading ───────────────────────────────────────────────────
function openBook(title, index) {
  currentBook = books[index];
  currentPage = 1;
  document.getElementById('book-selection').style.display = 'none';
  document.getElementById('book-content').style.display = 'flex';
  document.getElementById('book-title-display').textContent = currentBook.title;
  renderPage();
}

function closeBook() {
  document.getElementById('book-selection').style.display = 'block';
  document.getElementById('book-content').style.display = 'none';
}

function renderPage() {
  document.getElementById('page-text').textContent = currentBook.pages[currentPage - 1];
  document.getElementById('page-num').textContent = `Page ${currentPage} of ${currentBook.pages.length}`;
}

function nextPage() {
  if (!currentBook || currentPage >= currentBook.pages.length) return;
  currentPage++;
  renderPage();
}

function prevPage() {
  if (!currentBook || currentPage <= 1) return;
  currentPage--;
  renderPage();
}

// ── Nurse + Speech ────────────────────────────────────────────
function callNurse() {
  // Log the emergency to the dashboard!
  logActivity('EMERGENCY: Patient activated Nurse Call', true);

  const btn = document.querySelector('.nurse-btn');
  const status = document.getElementById('nurse-status');
  btn.classList.add('active');
  status.textContent = 'Nurse Called';
  status.classList.add('alert');
  
  // Use speech synthesis without triggering the standard logger loop
  const utterance = new SpeechSynthesisUtterance("Emergency. Nurse has been called.");
  utterance.rate = 0.95;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);

  setTimeout(() => {
    btn.classList.remove('active');
    status.textContent = 'All Clear';
    status.classList.remove('alert');
  }, 10000);
}

function speak(text) {
  // Log standard requests to the dashboard!
  logActivity(`Patient requested: "${text}"`, false);

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 0.95;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}