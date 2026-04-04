// real_gaze.js  ← YOUR FILE
// Implements GazeEmitter using WebGazer.js for real eye tracking.
// Add <script src="https://webgazer.cs.brown.edu/webgazer.js"></script>
// to index.html BEFORE this script when you're ready.

window.GazeEmitter = {
  onGaze: null, // Set this to a callback: ({ x, y }) => void

  // Smoothing buffer — reduces jitter in raw gaze data
  _buffer: [],
  _bufferSize: 8,

  _smooth(x, y) {
    this._buffer.push({ x, y });
    if (this._buffer.length > this._bufferSize) {
      this._buffer.shift();
    }
    const avg = this._buffer.reduce(
      (acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }),
      { x: 0, y: 0 }
    );
    return {
      x: avg.x / this._buffer.length,
      y: avg.y / this._buffer.length,
    };
  },

  start() {
    console.log('[GazeEmitter] Real mode: starting WebGazer');

    // TODO: Run calibration UI before calling .begin()
    // webgazer.showPredictionPoints(true); // helpful during dev

    webgazer
      .setGazeListener((data, timestamp) => {
        if (!data) return;
        const smoothed = this._smooth(data.x, data.y);
        if (typeof this.onGaze === 'function') {
          this.onGaze(smoothed);
        }
      })
      .begin();

    // Hide the WebGazer video feed overlay if you don't want it shown
    // webgazer.showVideo(false);
    // webgazer.showFaceOverlay(false);
    // webgazer.showFaceFeedbackBox(false);
  },

  stop() {
    webgazer.pause();
    console.log('[GazeEmitter] Real gaze paused');
  }
};
