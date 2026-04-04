// canvas.js  ← PARTNER'S FILE
// Handles all drawing on the canvas.
// Consumes GazeEmitter for coordinates — never touches gaze logic directly.

(function () {
  const canvas = document.getElementById('drawing-canvas');
  const ctx = canvas.getContext('2d');
  const cursor = document.getElementById('gaze-cursor');
  const modeIndicator = document.getElementById('mode-indicator');

  let isDrawing = false;
  let lastX = null;
  let lastY = null;

  // ── Resize canvas to fill window ────────────────────────────────────────────
  function resize() {
    // Preserve existing drawing when resizing
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    ctx.putImageData(imageData, 0, 0);
    setDrawingStyle();
  }

  function setDrawingStyle() {
    ctx.strokeStyle = '#00ff99';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }

  window.addEventListener('resize', resize);
  resize();

  // ── Public API (called by voice.js) ─────────────────────────────────────────
  window.CanvasControls = {
    startDrawing() {
      isDrawing = true;
      lastX = null;
      lastY = null;
      modeIndicator.textContent = '⬤ DRAWING';
      modeIndicator.classList.add('drawing');
      cursor.classList.add('drawing');
    },

    stopDrawing() {
      isDrawing = false;
      lastX = null;
      lastY = null;
      modeIndicator.textContent = '⬤ STOPPED';
      modeIndicator.classList.remove('drawing');
      cursor.classList.remove('drawing');
    },

    clearCanvas() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  // ── Hook into GazeEmitter ────────────────────────────────────────────────────
  GazeEmitter.onGaze = ({ x, y }) => {
    // Move the cursor dot
    cursor.style.left = x + 'px';
    cursor.style.top = y + 'px';

    // Draw if active
    if (isDrawing) {
      if (lastX !== null && lastY !== null) {
        ctx.beginPath();
        ctx.moveTo(lastX, lastY);
        ctx.lineTo(x, y);
        ctx.stroke();
      }
      lastX = x;
      lastY = y;
    } else {
      lastX = null;
      lastY = null;
    }
  };

  GazeEmitter.start();
})();
