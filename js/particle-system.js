/**
 * Particle System - High-performance particle physics engine
 * Features:
 * - Object pooling for memory efficiency
 * - Spatial hashing for collision optimization
 * - Multiple physics behaviors (gravity, magnetism, turbulence, orbital)
 * - LOD (Level of Detail) system for performance scaling
 * - Audio-reactive properties
 */

/**
 * Single particle class
 */
class Particle {
    constructor() {
        this.x = 0;
        this.y = 0;
        this.vx = 0;
        this.vy = 0;
        this.ax = 0;
        this.ay = 0;
        this.size = 2;
        this.life = 1.0;
        this.maxLife = 1.0;
        this.hue = 0;
        this.saturation = 100;
        this.lightness = 50;
        this.alpha = 1.0;
        this.active = false;
        this.mass = 1.0;
        this.angle = 0;
        this.angularVelocity = 0;
    }

    /**
     * Initialize particle with starting parameters
     */
    init(x, y, vx, vy, size, life, hue) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.ax = 0;
        this.ay = 0;
        this.size = size;
        this.life = life;
        this.maxLife = life;
        this.hue = hue;
        this.saturation = 100;
        this.lightness = 50;
        this.alpha = 1.0;
        this.active = true;
        this.mass = size * 0.1;
        this.angle = Math.random() * Math.PI * 2;
        this.angularVelocity = (Math.random() - 0.5) * 0.1;
    }

    /**
     * Update particle physics
     */
    update(width, height, deltaTime = 1) {
        if (!this.active) return;

        // Apply acceleration
        this.vx += this.ax * deltaTime;
        this.vy += this.ay * deltaTime;

        // Apply velocity
        this.x += this.vx * deltaTime;
        this.y += this.vy * deltaTime;

        // Update angle
        this.angle += this.angularVelocity * deltaTime;

        // Decrease life
        this.life -= 0.01 * deltaTime;

        // Update alpha based on life
        this.alpha = Math.max(0, this.life / this.maxLife);

        // Deactivate if dead
        if (this.life <= 0) {
            this.active = false;
        }

        // Reset acceleration
        this.ax = 0;
        this.ay = 0;
    }

    /**
     * Apply force to particle
     */
    applyForce(fx, fy) {
        this.ax += fx / this.mass;
        this.ay += fy / this.mass;
    }

    /**
     * Bounce off boundaries
     */
    bounce(width, height, damping = 0.8) {
        if (this.x < 0) {
            this.x = 0;
            this.vx *= -damping;
        } else if (this.x > width) {
            this.x = width;
            this.vx *= -damping;
        }

        if (this.y < 0) {
            this.y = 0;
            this.vy *= -damping;
        } else if (this.y > height) {
            this.y = height;
            this.vy *= -damping;
        }
    }

    /**
     * Wrap around boundaries
     */
    wrap(width, height) {
        if (this.x < 0) this.x = width;
        if (this.x > width) this.x = 0;
        if (this.y < 0) this.y = height;
        if (this.y > height) this.y = 0;
    }
}

/**
 * Spatial hash grid for efficient particle queries
 */
class SpatialHash {
    constructor(cellSize = 50) {
        this.cellSize = cellSize;
        this.grid = new Map();
    }

    /**
     * Get cell key for position
     */
    getCellKey(x, y) {
        const cellX = Math.floor(x / this.cellSize);
        const cellY = Math.floor(y / this.cellSize);
        return `${cellX},${cellY}`;
    }

    /**
     * Clear the grid
     */
    clear() {
        this.grid.clear();
    }

    /**
     * Insert particle into grid
     */
    insert(particle) {
        const key = this.getCellKey(particle.x, particle.y);
        if (!this.grid.has(key)) {
            this.grid.set(key, []);
        }
        this.grid.get(key).push(particle);
    }

    /**
     * Get nearby particles
     */
    getNearby(x, y, radius) {
        const nearby = [];
        const cellRadius = Math.ceil(radius / this.cellSize);
        const centerCellX = Math.floor(x / this.cellSize);
        const centerCellY = Math.floor(y / this.cellSize);

        for (let dx = -cellRadius; dx <= cellRadius; dx++) {
            for (let dy = -cellRadius; dy <= cellRadius; dy++) {
                const key = `${centerCellX + dx},${centerCellY + dy}`;
                if (this.grid.has(key)) {
                    nearby.push(...this.grid.get(key));
                }
            }
        }

        return nearby;
    }
}

/**
 * Main particle system class
 */
class ParticleSystem {
    constructor(maxParticles = 1000) {
        this.maxParticles = maxParticles;
        this.particles = [];
        this.particlePool = [];

        // Initialize object pool
        for (let i = 0; i < maxParticles; i++) {
            this.particlePool.push(new Particle());
        }

        // Spatial hashing
        this.spatialHash = new SpatialHash(50);

        // Physics parameters
        this.physics = {
            mode: 'gravity', // 'gravity', 'magnetism', 'turbulence', 'orbital'
            gravity: 0.1,
            gravityX: 0,
            gravityY: 0.1,
            magnetismStrength: 0.5,
            magnetX: 0,
            magnetY: 0,
            turbulenceStrength: 0.3,
            turbulenceFrequency: 0.01,
            orbitalCenterX: 0.5,
            orbitalCenterY: 0.5,
            orbitalStrength: 0.2,
            damping: 0.99,
            bounceEnabled: false,
            wrapEnabled: true
        };

        // Emission parameters
        this.emission = {
            rate: 10, // particles per frame
            x: 0.5, // normalized position
            y: 0.5,
            spread: 0.2,
            velocityMin: 1,
            velocityMax: 3,
            sizeMin: 2,
            sizeMax: 6,
            lifeMin: 100,
            lifeMax: 200,
            hue: 200,
            hueVariation: 60
        };

        // Audio reactivity parameters
        this.audioReactive = {
            emissionMultiplier: 1.0,
            sizeMultiplier: 1.0,
            velocityMultiplier: 1.0,
            hueShift: 0
        };

        // Performance
        this.width = 1920;
        this.height = 1080;
        this.activeParticleCount = 0;

        // Time tracking
        this.time = 0;
    }

    /**
     * Set canvas dimensions
     */
    setDimensions(width, height) {
        this.width = width;
        this.height = height;
        this.physics.magnetX = width / 2;
        this.physics.magnetY = height / 2;
    }

    /**
     * Get particle from pool
     */
    getParticle() {
        for (let i = 0; i < this.particlePool.length; i++) {
            if (!this.particlePool[i].active) {
                return this.particlePool[i];
            }
        }
        return null;
    }

    /**
     * Emit particles
     */
    emit(count = 1, audioEnergy = 0) {
        // Apply audio reactivity to emission
        const actualCount = Math.floor(count * (1 + audioEnergy * this.audioReactive.emissionMultiplier));

        for (let i = 0; i < actualCount; i++) {
            const particle = this.getParticle();
            if (!particle) break;

            // Calculate spawn position
            const x = this.emission.x * this.width + (Math.random() - 0.5) * this.emission.spread * this.width;
            const y = this.emission.y * this.height + (Math.random() - 0.5) * this.emission.spread * this.height;

            // Calculate velocity
            const angle = Math.random() * Math.PI * 2;
            const speed = this.emission.velocityMin + Math.random() * (this.emission.velocityMax - this.emission.velocityMin);
            const speedMultiplier = 1 + audioEnergy * this.audioReactive.velocityMultiplier;
            const vx = Math.cos(angle) * speed * speedMultiplier;
            const vy = Math.sin(angle) * speed * speedMultiplier;

            // Calculate size
            const size = this.emission.sizeMin + Math.random() * (this.emission.sizeMax - this.emission.sizeMin);
            const sizeMultiplier = 1 + audioEnergy * this.audioReactive.sizeMultiplier;
            const actualSize = size * sizeMultiplier;

            // Calculate life
            const life = this.emission.lifeMin + Math.random() * (this.emission.lifeMax - this.emission.lifeMin);

            // Calculate color
            const hue = (this.emission.hue + (Math.random() - 0.5) * this.emission.hueVariation + this.audioReactive.hueShift) % 360;

            particle.init(x, y, vx, vy, actualSize, life, hue);
        }
    }

    /**
     * Apply gravity physics
     */
    applyGravity(particle) {
        particle.applyForce(this.physics.gravityX, this.physics.gravityY);
    }

    /**
     * Apply magnetism physics (attraction to a point)
     */
    applyMagnetism(particle) {
        const dx = this.physics.magnetX - particle.x;
        const dy = this.physics.magnetY - particle.y;
        const distSq = dx * dx + dy * dy;
        const dist = Math.sqrt(distSq);

        if (dist > 0) {
            const force = this.physics.magnetismStrength * particle.mass / (distSq + 100);
            particle.applyForce(dx / dist * force, dy / dist * force);
        }
    }

    /**
     * Apply turbulence physics (perlin-like noise)
     */
    applyTurbulence(particle) {
        const noiseX = Math.sin(particle.x * this.physics.turbulenceFrequency + this.time * 0.01) *
                       Math.cos(particle.y * this.physics.turbulenceFrequency);
        const noiseY = Math.cos(particle.x * this.physics.turbulenceFrequency) *
                       Math.sin(particle.y * this.physics.turbulenceFrequency + this.time * 0.01);

        particle.applyForce(noiseX * this.physics.turbulenceStrength, noiseY * this.physics.turbulenceStrength);
    }

    /**
     * Apply orbital physics (circular motion around center)
     */
    applyOrbital(particle) {
        const centerX = this.physics.orbitalCenterX * this.width;
        const centerY = this.physics.orbitalCenterY * this.height;

        const dx = particle.x - centerX;
        const dy = particle.y - centerY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > 0) {
            // Tangential force
            const forceMag = this.physics.orbitalStrength;
            particle.applyForce(-dy / dist * forceMag, dx / dist * forceMag);

            // Centripetal force
            const centripetalForce = 0.01;
            particle.applyForce(-dx / dist * centripetalForce, -dy / dist * centripetalForce);
        }
    }

    /**
     * Update all particles
     */
    update(deltaTime = 1, audioBands = null) {
        this.time++;

        // Clear spatial hash
        this.spatialHash.clear();

        // Reset active particle count
        this.activeParticleCount = 0;

        // Update all particles in pool
        for (let i = 0; i < this.particlePool.length; i++) {
            const particle = this.particlePool[i];

            if (!particle.active) continue;

            this.activeParticleCount++;

            // Apply physics based on mode
            switch (this.physics.mode) {
                case 'gravity':
                    this.applyGravity(particle);
                    break;
                case 'magnetism':
                    this.applyMagnetism(particle);
                    break;
                case 'turbulence':
                    this.applyTurbulence(particle);
                    break;
                case 'orbital':
                    this.applyOrbital(particle);
                    break;
            }

            // Apply audio reactive forces (optional)
            if (audioBands && audioBands.length === 7) {
                // Bass affects Y velocity
                particle.vy += audioBands[1] * 0.5;

                // Treble affects X velocity
                particle.vx += (audioBands[5] - 0.5) * 0.3;

                // Mid frequencies affect size
                particle.size = particle.size * (1 + audioBands[3] * 0.2);
            }

            // Apply damping
            particle.vx *= this.physics.damping;
            particle.vy *= this.physics.damping;

            // Update particle
            particle.update(this.width, this.height, deltaTime);

            // Handle boundaries
            if (this.physics.bounceEnabled) {
                particle.bounce(this.width, this.height, 0.8);
            } else if (this.physics.wrapEnabled) {
                particle.wrap(this.width, this.height);
            }

            // Insert into spatial hash
            this.spatialHash.insert(particle);
        }
    }

    /**
     * Get all active particles
     */
    getActiveParticles() {
        return this.particlePool.filter(p => p.active);
    }

    /**
     * Get particles with LOD (Level of Detail)
     * Returns fewer particles when count is high for better performance
     */
    getActiveParticlesLOD(maxParticles = 500) {
        const active = this.getActiveParticles();

        if (active.length <= maxParticles) {
            return active;
        }

        // Sample particles uniformly
        const step = active.length / maxParticles;
        const sampled = [];

        for (let i = 0; i < maxParticles; i++) {
            const index = Math.floor(i * step);
            sampled.push(active[index]);
        }

        return sampled;
    }

    /**
     * Clear all particles
     */
    clear() {
        for (let i = 0; i < this.particlePool.length; i++) {
            this.particlePool[i].active = false;
        }
        this.activeParticleCount = 0;
    }

    /**
     * Set physics mode
     */
    setPhysicsMode(mode) {
        const validModes = ['gravity', 'magnetism', 'turbulence', 'orbital'];
        if (validModes.includes(mode)) {
            this.physics.mode = mode;
        }
    }

    /**
     * Set emission position (normalized 0-1)
     */
    setEmissionPosition(x, y) {
        this.emission.x = Math.max(0, Math.min(1, x));
        this.emission.y = Math.max(0, Math.min(1, y));
    }

    /**
     * Set magnet position (screen coordinates)
     */
    setMagnetPosition(x, y) {
        this.physics.magnetX = x;
        this.physics.magnetY = y;
    }

    /**
     * Get statistics
     */
    getStats() {
        return {
            activeParticles: this.activeParticleCount,
            maxParticles: this.maxParticles,
            utilization: (this.activeParticleCount / this.maxParticles * 100).toFixed(1) + '%'
        };
    }
}

export default ParticleSystem;
