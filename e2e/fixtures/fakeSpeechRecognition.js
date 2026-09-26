// E2E-only browser-side shim, injected via page.addInitScript. Provides a
// fake `webkitSpeechRecognition` so useRecording.ts (src/features/recording/
// useRecording.ts) takes its live-transcript path instead of falling back to
// /api/transcribe (which needs a real backend). Never shipped — this file is
// only ever loaded by Playwright's addInitScript, not by the app itself.
//
// Test driver protocol: before each mic "start", the test sets
// `window.__fakeSpeechNextAnswer` to the French text that answer should
// produce. On `start()`, the fake recognizer waits a tick then fires one
// final onresult with that text, mirroring the real API's
// {results: [[{transcript}]], resultIndex, isFinal} shape closely enough for
// useRecording's reader. `stop()`/`abort()` fire `onend()` asynchronously,
// resolving useRecording's stop() promise with the captured text.
(function () {
  window.__fakeSpeechNextAnswer = window.__fakeSpeechNextAnswer || '';

  function FakeSpeechRecognition() {
    this.lang = 'fr-FR';
    this.continuous = true;
    this.interimResults = true;
    this.maxAlternatives = 1;
    this.onresult = null;
    this.onerror = null;
    this.onend = null;
    this._resultTimer = null;
  }

  FakeSpeechRecognition.prototype.start = function () {
    const self = this;
    const text = window.__fakeSpeechNextAnswer || '';
    this._resultTimer = setTimeout(function () {
      if (!self.onresult) return;
      const alt = { transcript: text, confidence: 0.95 };
      const result = { 0: alt, length: 1, isFinal: true, item: function (i) { return this[i]; } };
      const results = { 0: result, length: 1, item: function (i) { return this[i]; } };
      self.onresult({ results: results, resultIndex: 0 });
    }, 80);
  };

  FakeSpeechRecognition.prototype.stop = function () {
    const self = this;
    if (this._resultTimer) clearTimeout(this._resultTimer);
    setTimeout(function () {
      if (self.onend) self.onend();
    }, 20);
  };

  FakeSpeechRecognition.prototype.abort = function () {
    this.stop();
  };

  // Chromium (even headless) defines a real, unprefixed `window.SpeechRecognition`
  // that useRecording.ts's constructor-selection tries FIRST — it exists but
  // never produces a result in this sandbox (no permissions/backend, no
  // audio), so it must be overridden too, not just the webkit-prefixed one.
  window.SpeechRecognition = FakeSpeechRecognition;
  window.webkitSpeechRecognition = FakeSpeechRecognition;

  // Also give getUserMedia a harmless fake stream if the real one is ever
  // unavailable in this headless profile (pronunciation-only path — the
  // exam transcript itself never depends on this, see useRecording.ts's
  // stop(), which resolves from the recognizer independent of the
  // MediaRecorder branch).
  if (navigator.mediaDevices && !navigator.mediaDevices.getUserMedia) {
    navigator.mediaDevices.getUserMedia = function () {
      return Promise.reject(new Error('fake-env: no media devices'));
    };
  }
})();
