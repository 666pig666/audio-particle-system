PROJECT: Professional multi-channel audio visualizer with recording capabilities

REQUIREMENTS:
- Simultaneous visualization of multiple audio analysis methods:
  * Waveform (oscilloscope-style)
  * Frequency spectrum (logarithmic scale)
  * Spectrogram (waterfall display)
  * Stereo phase scope (Goniometer)
  * Peak meters with hold
- Web Audio API AnalyserNode optimization
- MIDI-controllable view switching and parameters
- Canvas recording to WebM video
- PNG sequence export for each frame
- Timeline scrubbing for recorded audio
- Color grading controls (hue shift, saturation, brightness)
- Multiple window layouts (single, split, quad, custom)

TECHNICAL SPECS:
- FFT sizes: 256, 512, 1024, 2048, 4096, 8192
- Smoothing time constants configurable
- Frequency range selection (20Hz-20kHz with zoom)
- Stereo/Mono mode switching
- Real-time parameter interpolation (no zipper noise on changes)

DELIVERABLES:
1. Single-page application (SPA) with modern UI
2. Modular analyzer components
3. Recording engine with format options
4. MIDI CC mapping system
5. Keyboard shortcut reference
6. Export utility functions

FILE STRUCTURE:
/audio-visualizer-pro/
  index.html
  /src/
    app.js
    audio-analyzer.js
    visualizers/
      waveform.js
      spectrum.js
      spectrogram.js
      phasescope.js
      meters.js
    midi-mapper.js
    recorder.js
    ui-controls.js
  /styles/
    main.css
  README.md