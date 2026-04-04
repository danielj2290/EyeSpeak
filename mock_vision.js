// mock_gaze.js
// Simulates eye tracking using the mouse.
// Your partner uses this while you build the real tracker.
// When real_gaze.js is ready, swap the script tag in index.html.

window.GazeEmitter = {
  onGaze: null, // Set this to a callback: ({ x, y }) => void

  start() {
    console.log('[GazeEmitter] Mock mode: using mouse position');
    this._handler = (e) => {
      if (typeof this.onGaze === 'function') {
        this.onGaze({ x: e.clientX, y: e.clientY });
      }
    };
    document.addEventListener('mousemove', this._handler);
  },

  stop() {
    if (this._handler) {
      document.removeEventListener('mousemove', this._handler);
      this._handler = null;
    }
    console.log('[GazeEmitter] Mock stopped');
  }
};
