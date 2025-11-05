/**
 * Audio Engine - Web Audio API Implementation
 * Handles real-time audio analysis with 7-band frequency breakdown
 * and kick/transient detection
 *
 * Frequency Bands:
 * - Sub-bass: 20-60 Hz
 * - Bass: 60-250 Hz
 * - Low-mid: 250-500 Hz
 * - Mid: 500-2000 Hz
 * - High-mid: 2000-4000 Hz
 * - Treble: 4000-8000 Hz
 * - Presence: 8000-20000 Hz
 */

class AudioEngine {
    constructor() {
        this.audioContext = null;
        this.analyser = null;
        this.dataArray = null;
        this.bufferLength = null;
        this.source = null;
        this.gainNode = null;

        // Frequency band data
        this.bands = {
            subBass: 0,    // 20-60 Hz
            bass: 0,       // 60-250 Hz
            lowMid: 0,     // 250-500 Hz
            mid: 0,        // 500-2000 Hz
            highMid: 0,    // 2000-4000 Hz
            treble: 0,     // 4000-8000 Hz
            presence: 0    // 8000-20000 Hz
        };

        // Kick detection parameters
        this.kickThreshold = 0.7;
        this.kickDecay = 0.98;
        this.kickValue = 0;
        this.lastKickTime = 0;
        this.kickCooldown = 100; // ms

        // Overall levels
        this.rms = 0;
        this.peak = 0;

        // State
        this.isInitialized = false;
        this.isPlaying = false;

        // Performance tracking
        this.analysisStartTime = 0;
        this.latency = 0;
    }

    /**
     * Initialize the audio context and analyser
     * @param {number} fftSize - FFT size (default 2048 for good frequency resolution)
     */
    async init(fftSize = 2048) {
        try {
            // Create audio context
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();

            // Create analyser node
            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = fftSize;
            this.analyser.smoothingTimeConstant = 0.8; // Smooth but responsive

            this.bufferLength = this.analyser.frequencyBinCount;
            this.dataArray = new Uint8Array(this.bufferLength);

            // Create gain node for volume control
            this.gainNode = this.audioContext.createGain();
            this.gainNode.gain.value = 1.0;

            this.isInitialized = true;
            console.log('Audio Engine initialized successfully');
            console.log(`Sample rate: ${this.audioContext.sampleRate} Hz`);
            console.log(`FFT size: ${fftSize}, Frequency bins: ${this.bufferLength}`);

            return true;
        } catch (error) {
            console.error('Failed to initialize audio engine:', error);
            return false;
        }
    }

    /**
     * Start microphone input
     */
    async startMicrophone() {
        if (!this.isInitialized) {
            await this.init();
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: false,
                    noiseSuppression: false,
                    autoGainControl: false
                }
            });

            // Disconnect previous source if exists
            if (this.source) {
                this.source.disconnect();
            }

            this.source = this.audioContext.createMediaStreamSource(stream);
            this.source.connect(this.analyser);
            this.analyser.connect(this.gainNode);
            this.gainNode.connect(this.audioContext.destination);

            this.isPlaying = true;
            console.log('Microphone input started');
            return true;
        } catch (error) {
            console.error('Failed to access microphone:', error);
            return false;
        }
    }

    /**
     * Load and play audio from file
     * @param {File} file - Audio file to play
     */
    async loadFile(file) {
        if (!this.isInitialized) {
            await this.init();
        }

        try {
            const arrayBuffer = await file.arrayBuffer();
            const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);

            // Disconnect previous source if exists
            if (this.source) {
                this.source.disconnect();
                this.source.stop && this.source.stop();
            }

            this.source = this.audioContext.createBufferSource();
            this.source.buffer = audioBuffer;
            this.source.loop = true;
            this.source.connect(this.analyser);
            this.analyser.connect(this.gainNode);
            this.gainNode.connect(this.audioContext.destination);

            this.source.start(0);
            this.isPlaying = true;
            console.log(`Audio file loaded: ${file.name}`);
            return true;
        } catch (error) {
            console.error('Failed to load audio file:', error);
            return false;
        }
    }

    /**
     * Stop audio playback
     */
    stop() {
        if (this.source) {
            try {
                this.source.disconnect();
                if (this.source.stop) {
                    this.source.stop();
                }
            } catch (e) {
                // Already stopped
            }
            this.source = null;
        }
        this.isPlaying = false;
    }

    /**
     * Get frequency for a given bin index
     * @param {number} index - Bin index
     * @returns {number} Frequency in Hz
     */
    getFrequencyForBin(index) {
        return (index * this.audioContext.sampleRate) / (this.analyser.fftSize);
    }

    /**
     * Get bin index for a given frequency
     * @param {number} frequency - Frequency in Hz
     * @returns {number} Bin index
     */
    getBinForFrequency(frequency) {
        return Math.round((frequency * this.analyser.fftSize) / this.audioContext.sampleRate);
    }

    /**
     * Get average amplitude for a frequency range
     * @param {number} startFreq - Start frequency in Hz
     * @param {number} endFreq - End frequency in Hz
     * @returns {number} Average amplitude (0-1)
     */
    getFrequencyRangeAverage(startFreq, endFreq) {
        const startBin = this.getBinForFrequency(startFreq);
        const endBin = this.getBinForFrequency(endFreq);

        let sum = 0;
        let count = 0;

        for (let i = startBin; i <= endBin && i < this.bufferLength; i++) {
            sum += this.dataArray[i];
            count++;
        }

        return count > 0 ? (sum / count) / 255 : 0;
    }

    /**
     * Detect kick/transient in bass frequencies
     */
    detectKick() {
        const now = Date.now();
        const bassEnergy = this.bands.bass;

        // Apply decay
        this.kickValue *= this.kickDecay;

        // Check for kick if cooldown has passed
        if (now - this.lastKickTime > this.kickCooldown) {
            if (bassEnergy > this.kickThreshold) {
                this.kickValue = 1.0;
                this.lastKickTime = now;
                return true;
            }
        }

        return false;
    }

    /**
     * Calculate RMS (Root Mean Square) level
     */
    calculateRMS() {
        let sum = 0;
        for (let i = 0; i < this.bufferLength; i++) {
            const normalized = this.dataArray[i] / 255;
            sum += normalized * normalized;
        }
        this.rms = Math.sqrt(sum / this.bufferLength);
    }

    /**
     * Calculate peak level
     */
    calculatePeak() {
        let max = 0;
        for (let i = 0; i < this.bufferLength; i++) {
            if (this.dataArray[i] > max) {
                max = this.dataArray[i];
            }
        }
        this.peak = max / 255;
    }

    /**
     * Main analysis function - call this in animation loop
     * Updates all frequency bands and detection
     */
    analyze() {
        if (!this.isPlaying || !this.analyser) {
            return;
        }

        // Track analysis start time for latency measurement
        this.analysisStartTime = performance.now();

        // Get frequency data
        this.analyser.getByteFrequencyData(this.dataArray);

        // Update 7 frequency bands
        this.bands.subBass = this.getFrequencyRangeAverage(20, 60);
        this.bands.bass = this.getFrequencyRangeAverage(60, 250);
        this.bands.lowMid = this.getFrequencyRangeAverage(250, 500);
        this.bands.mid = this.getFrequencyRangeAverage(500, 2000);
        this.bands.highMid = this.getFrequencyRangeAverage(2000, 4000);
        this.bands.treble = this.getFrequencyRangeAverage(4000, 8000);
        this.bands.presence = this.getFrequencyRangeAverage(8000, 20000);

        // Calculate overall levels
        this.calculateRMS();
        this.calculatePeak();

        // Detect kick
        this.detectKick();

        // Calculate latency
        this.latency = performance.now() - this.analysisStartTime;
    }

    /**
     * Set kick detection threshold
     * @param {number} threshold - Threshold value (0-1)
     */
    setKickThreshold(threshold) {
        this.kickThreshold = Math.max(0, Math.min(1, threshold));
    }

    /**
     * Set overall volume
     * @param {number} volume - Volume level (0-1)
     */
    setVolume(volume) {
        if (this.gainNode) {
            this.gainNode.gain.value = Math.max(0, Math.min(1, volume));
        }
    }

    /**
     * Get all band values as array
     * @returns {Array} Array of band values
     */
    getBandsArray() {
        return [
            this.bands.subBass,
            this.bands.bass,
            this.bands.lowMid,
            this.bands.mid,
            this.bands.highMid,
            this.bands.treble,
            this.bands.presence
        ];
    }

    /**
     * Get overall energy (average of all bands)
     * @returns {number} Overall energy (0-1)
     */
    getOverallEnergy() {
        const bands = this.getBandsArray();
        return bands.reduce((sum, val) => sum + val, 0) / bands.length;
    }

    /**
     * Resume audio context (required for autoplay policies)
     */
    async resume() {
        if (this.audioContext && this.audioContext.state === 'suspended') {
            await this.audioContext.resume();
        }
    }
}

export default AudioEngine;
