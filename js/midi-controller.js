/**
 * MIDI Controller - Web MIDI API Integration
 * Features:
 * - MIDI CC mapping to all parameters
 * - MIDI learn functionality
 * - Multiple MIDI device support
 * - Preset save/load with MIDI mappings
 * - Visual feedback for MIDI activity
 */

class MIDIController {
    constructor() {
        this.midiAccess = null;
        this.inputs = [];
        this.outputs = [];
        this.isSupported = false;

        // MIDI mappings: { cc: { parameter: 'path.to.param', min: 0, max: 1, object: ref } }
        this.mappings = new Map();

        // Learn mode
        this.learnMode = false;
        this.learnParameter = null;
        this.learnCallback = null;

        // Activity tracking
        this.lastCC = null;
        this.lastValue = 0;
        this.activityTimeout = null;

        // Connected devices
        this.connectedDevices = [];

        // Callbacks
        this.onMidiMessage = null;
        this.onDeviceConnected = null;
        this.onDeviceDisconnected = null;
    }

    /**
     * Initialize MIDI access
     */
    async init() {
        if (!navigator.requestMIDIAccess) {
            console.warn('Web MIDI API not supported in this browser');
            this.isSupported = false;
            return false;
        }

        try {
            this.midiAccess = await navigator.requestMIDIAccess();
            this.isSupported = true;

            // Setup device change listeners
            this.midiAccess.onstatechange = (e) => this.onStateChange(e);

            // Get initial inputs and outputs
            this.updateDevices();

            console.log('MIDI Controller initialized successfully');
            console.log(`Found ${this.inputs.length} MIDI input devices`);

            return true;
        } catch (error) {
            console.error('Failed to initialize MIDI:', error);
            this.isSupported = false;
            return false;
        }
    }

    /**
     * Update device lists
     */
    updateDevices() {
        this.inputs = [];
        this.outputs = [];
        this.connectedDevices = [];

        // Get inputs
        for (let input of this.midiAccess.inputs.values()) {
            this.inputs.push(input);
            this.connectedDevices.push({
                id: input.id,
                name: input.name,
                manufacturer: input.manufacturer,
                type: 'input'
            });

            // Setup message handler
            input.onmidimessage = (e) => this.handleMidiMessage(e);

            console.log(`MIDI Input: ${input.name} (${input.manufacturer})`);
        }

        // Get outputs
        for (let output of this.midiAccess.outputs.values()) {
            this.outputs.push(output);
            console.log(`MIDI Output: ${output.name} (${output.manufacturer})`);
        }
    }

    /**
     * Handle device connection/disconnection
     */
    onStateChange(event) {
        console.log(`MIDI Device ${event.port.state}: ${event.port.name}`);

        this.updateDevices();

        if (event.port.state === 'connected') {
            if (this.onDeviceConnected) {
                this.onDeviceConnected(event.port);
            }
        } else if (event.port.state === 'disconnected') {
            if (this.onDeviceDisconnected) {
                this.onDeviceDisconnected(event.port);
            }
        }
    }

    /**
     * Handle incoming MIDI message
     */
    handleMidiMessage(event) {
        const [status, data1, data2] = event.data;

        // Parse MIDI message
        const messageType = status & 0xf0;
        const channel = status & 0x0f;

        // Handle Control Change (CC) messages
        if (messageType === 0xb0) {
            const cc = data1;
            const value = data2;

            this.handleCC(cc, value, channel);

            // Track activity
            this.lastCC = cc;
            this.lastValue = value;

            // Clear activity indicator after delay
            if (this.activityTimeout) {
                clearTimeout(this.activityTimeout);
            }
            this.activityTimeout = setTimeout(() => {
                this.lastCC = null;
            }, 500);
        }

        // Callback for all messages
        if (this.onMidiMessage) {
            this.onMidiMessage(event);
        }
    }

    /**
     * Handle CC message
     */
    handleCC(cc, value, channel) {
        // If in learn mode, assign this CC to the learning parameter
        if (this.learnMode && this.learnParameter) {
            console.log(`Learned: CC${cc} -> ${this.learnParameter}`);
            if (this.learnCallback) {
                this.learnCallback(cc, this.learnParameter);
            }
            this.learnMode = false;
            this.learnParameter = null;
        }

        // Apply CC to mapped parameters
        if (this.mappings.has(cc)) {
            const mapping = this.mappings.get(cc);

            // Normalize MIDI value (0-127) to parameter range
            const normalizedValue = value / 127;
            const mappedValue = mapping.min + normalizedValue * (mapping.max - mapping.min);

            // Apply value to parameter
            this.setParameter(mapping.parameter, mappedValue, mapping.object);
        }
    }

    /**
     * Set parameter value using path notation
     * e.g., 'physics.gravity' or 'emission.rate'
     */
    setParameter(path, value, object) {
        const parts = path.split('.');
        let current = object;

        // Navigate to the property
        for (let i = 0; i < parts.length - 1; i++) {
            if (current[parts[i]] === undefined) {
                console.warn(`Parameter path not found: ${path}`);
                return;
            }
            current = current[parts[i]];
        }

        // Set the value
        const finalKey = parts[parts.length - 1];
        if (current[finalKey] !== undefined) {
            current[finalKey] = value;
        }
    }

    /**
     * Map a CC to a parameter
     * @param {number} cc - CC number (0-127)
     * @param {string} parameter - Parameter path (e.g., 'physics.gravity')
     * @param {object} object - Object containing the parameter
     * @param {number} min - Minimum value for parameter
     * @param {number} max - Maximum value for parameter
     */
    map(cc, parameter, object, min = 0, max = 1) {
        this.mappings.set(cc, {
            parameter,
            object,
            min,
            max
        });

        console.log(`MIDI Mapping: CC${cc} -> ${parameter} (${min} to ${max})`);
    }

    /**
     * Remove a CC mapping
     */
    unmap(cc) {
        if (this.mappings.has(cc)) {
            const mapping = this.mappings.get(cc);
            console.log(`Removed mapping: CC${cc} -> ${mapping.parameter}`);
            this.mappings.delete(cc);
        }
    }

    /**
     * Clear all mappings
     */
    clearMappings() {
        this.mappings.clear();
        console.log('All MIDI mappings cleared');
    }

    /**
     * Start learn mode for a parameter
     */
    learn(parameter, object, callback, min = 0, max = 1) {
        this.learnMode = true;
        this.learnParameter = parameter;
        this.learnCallback = (cc, param) => {
            this.map(cc, param, object, min, max);
            if (callback) callback(cc, param);
        };

        console.log(`MIDI Learn mode active for: ${parameter}`);
        console.log('Move a knob or slider on your MIDI controller...');
    }

    /**
     * Cancel learn mode
     */
    cancelLearn() {
        this.learnMode = false;
        this.learnParameter = null;
        this.learnCallback = null;
        console.log('MIDI Learn mode cancelled');
    }

    /**
     * Get all mappings as array
     */
    getMappings() {
        const result = [];
        for (let [cc, mapping] of this.mappings) {
            result.push({
                cc,
                parameter: mapping.parameter,
                min: mapping.min,
                max: mapping.max
            });
        }
        return result;
    }

    /**
     * Load mappings from array
     */
    loadMappings(mappingsArray, object) {
        this.clearMappings();

        for (let mapping of mappingsArray) {
            this.map(
                mapping.cc,
                mapping.parameter,
                object,
                mapping.min,
                mapping.max
            );
        }

        console.log(`Loaded ${mappingsArray.length} MIDI mappings`);
    }

    /**
     * Get last CC activity
     */
    getLastActivity() {
        return {
            cc: this.lastCC,
            value: this.lastValue
        };
    }

    /**
     * Check if MIDI is supported
     */
    isAvailable() {
        return this.isSupported && this.inputs.length > 0;
    }

    /**
     * Get connected device info
     */
    getDevices() {
        return this.connectedDevices;
    }

    /**
     * Create default MIDI mappings for common controllers
     * @param {object} particleSystem - Particle system instance
     * @param {object} renderer - Renderer instance
     */
    createDefaultMappings(particleSystem, renderer) {
        // Particle emission controls (CC 1-10)
        this.map(1, 'emission.rate', particleSystem, 1, 50);
        this.map(2, 'emission.velocityMin', particleSystem, 0.1, 5);
        this.map(3, 'emission.velocityMax', particleSystem, 1, 10);
        this.map(4, 'emission.sizeMin', particleSystem, 1, 10);
        this.map(5, 'emission.sizeMax', particleSystem, 2, 20);
        this.map(6, 'emission.lifeMin', particleSystem, 50, 500);
        this.map(7, 'emission.lifeMax', particleSystem, 100, 1000);
        this.map(8, 'emission.spread', particleSystem, 0, 1);
        this.map(9, 'emission.hue', particleSystem, 0, 360);
        this.map(10, 'emission.hueVariation', particleSystem, 0, 180);

        // Physics controls (CC 11-20)
        this.map(11, 'physics.gravityY', particleSystem, -0.5, 0.5);
        this.map(12, 'physics.gravityX', particleSystem, -0.5, 0.5);
        this.map(13, 'physics.magnetismStrength', particleSystem, 0, 2);
        this.map(14, 'physics.turbulenceStrength', particleSystem, 0, 1);
        this.map(15, 'physics.turbulenceFrequency', particleSystem, 0.001, 0.05);
        this.map(16, 'physics.orbitalStrength', particleSystem, 0, 1);
        this.map(17, 'physics.damping', particleSystem, 0.9, 1.0);

        // Audio reactivity (CC 21-25)
        this.map(21, 'audioReactive.emissionMultiplier', particleSystem, 0, 5);
        this.map(22, 'audioReactive.sizeMultiplier', particleSystem, 0, 3);
        this.map(23, 'audioReactive.velocityMultiplier', particleSystem, 0, 3);
        this.map(24, 'audioReactive.hueShift', particleSystem, -180, 180);

        // Renderer controls (CC 30-35)
        this.map(30, 'params.backgroundAlpha', renderer, 0, 1);
        this.map(31, 'params.glowIntensity', renderer, 0, 5);
        this.map(32, 'params.maxParticles', renderer, 100, 1000);

        console.log('Default MIDI mappings created');
    }

    /**
     * Export mappings to JSON
     */
    exportMappings() {
        return JSON.stringify(this.getMappings(), null, 2);
    }

    /**
     * Import mappings from JSON
     */
    importMappings(json, object) {
        try {
            const mappings = JSON.parse(json);
            this.loadMappings(mappings, object);
            return true;
        } catch (error) {
            console.error('Failed to import MIDI mappings:', error);
            return false;
        }
    }
}

export default MIDIController;
