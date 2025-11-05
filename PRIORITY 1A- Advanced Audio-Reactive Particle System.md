PROJECT: Build a production-ready audio-reactive particle system with real-time controls

REQUIREMENTS:
- HTML5 Canvas with WebGL acceleration
- Web Audio API with detailed frequency band analysis (sub-bass, bass, low-mid, mid, high-mid, treble, presence)
- MIDI CC mapping for all visual parameters (particle count, color schemes, physics behavior, blend modes)
- Kick/transient detection with configurable threshold
- Multiple particle behaviors: gravity, magnetism, turbulence, orbital
- Performance optimizations: object pooling, spatial hashing, LOD system
- Export settings presets as JSON
- Fullscreen mode with FPS counter
- Clean modular architecture for easy extension

TECHNICAL SPECS:
- Target 60fps at 1920x1080 with 500+ particles
- Latency <20ms from audio input to visual response
- Support both microphone input and file playback
- MIDI learn functionality for any parameter
- Color palette system with multiple preset schemes

DELIVERABLES:
1. Complete working HTML file with embedded JS/CSS
2. Separate modular JS files (audio.js, midi.js, particles.js, renderer.js)
3. README with parameter documentation and MIDI mapping guide
4. Example presets JSON file
5. Performance optimization notes

FILE STRUCTURE:
/audio-particle-system/
  index.html
  /js/
    audio-engine.js
    midi-controller.js
    particle-system.js
    renderer.js
    utils.js
  /presets/
    default.json
    aggressive.json
    ambient.json
  README.md