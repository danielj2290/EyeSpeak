// voice.js  ← PARTNER'S FILE
// Listens for voice commands: "draw", "stop", "clear"
// Calls CanvasControls — never touches gaze or canvas directly.

(function () {
  const voiceStatus = document.getElementById('voice-status');
  const toast = document.getElementById('voice-toast');

  // ── Toast helper ─────────────────────────────────────────────────────────────
  let toastTimer = null;
  function showToast(msg) {
    toast.textContent = msg;
    toast.classList.add('visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('visible'), 2000);
  }

  // ── Voice Recognition ────────────────────────────────────────────────────────
  const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    voiceStatus.textContent = '🎤 Voice: unsupported';
    console.warn('[Voice] Web Speech API not supported in this browser.');
    return;
  }

  const recognition = new SpeechRecognition();
  recognition.continuous = true;       // keep listening
  recognition.interimResults = false;  // only fire on final results
  recognition.lang = 'en-US';

  recognition.onstart = () => {
    voiceStatus.textContent = '🎤 Voice: listening';
  };

  recognition.onresult = (event) => {
    const transcript = event.results[event.results.length - 1][0].transcript
      .trim()
      .toLowerCase();

    console.log('[Voice] Heard:', transcript);

    if (transcript.includes('draw')) {
      CanvasControls.startDrawing();
      showToast('✏️ Drawing');
    } else if (transcript.includes('stop')) {
      CanvasControls.stopDrawing();
      showToast('⏹ Stopped');
    } else if (transcript.includes('clear')) {
      CanvasControls.clearCanvas();
      showToast('🗑 Cleared');
    }
  };

  recognition.onerror = (event) => {
  console.error('[Voice] Error:', event.error);
  };

  recognition.onend = () => {
  setTimeout(() => recognition.start(), 500);
  };

  // Start listening
  recognition.start();
})();
