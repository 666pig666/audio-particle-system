/**
 * Renderer - High-performance Canvas 2D rendering engine
 * Features:
 * - Canvas 2D rendering with blend modes
 * - Color palette system
 * - LOD (Level of Detail) adaptive rendering
 * - Performance monitoring
 * - Multiple blend modes
 * - Trail effects
 */

class Renderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d', {
            alpha: false,
            desynchronized: true // Hint for better performance
        });

        this.width = canvas.width;
        this.height = canvas.height;

        // Rendering parameters
        this.params = {
            blendMode: 'screen', // 'normal', 'screen', 'multiply', 'add', 'overlay'
            backgroundColor: '#000000',
            backgroundAlpha: 0.1, // For trail effect
            enableTrails: true,
            particleShape: 'circle', // 'circle', 'square', 'triangle', 'glow'
            glowIntensity: 2,
            enableGlow: true,
            colorPalette: 'rainbow', // 'rainbow', 'fire', 'ice', 'purple', 'green', 'monochrome'
            saturation: 100,
            lightness: 50,
            lodEnabled: true,
            maxParticles: 500 // Max particles to render when LOD is enabled
        };

        // Color palettes
        this.colorPalettes = {
            rainbow: {
                hueStart: 0,
                hueRange: 360,
                saturation: 100,
                lightness: 50
            },
            fire: {
                hueStart: 0,
                hueRange: 60,
                saturation: 100,
                lightness: 50
            },
            ice: {
                hueStart: 180,
                hueRange: 60,
                saturation: 100,
                lightness: 60
            },
            purple: {
                hueStart: 260,
                hueRange: 60,
                saturation: 80,
                lightness: 50
            },
            green: {
                hueStart: 100,
                hueRange: 80,
                saturation: 70,
                lightness: 50
            },
            monochrome: {
                hueStart: 0,
                hueRange: 0,
                saturation: 0,
                lightness: 80
            }
        };

        // Performance tracking
        this.fps = 60;
        this.frameTime = 0;
        this.lastFrameTime = performance.now();
        this.frameTimes = [];
        this.maxFrameTimes = 60;

        // Stats
        this.particlesRendered = 0;
        this.drawCalls = 0;
    }

    /**
     * Set canvas size
     */
    setSize(width, height) {
        this.width = width;
        this.height = height;
        this.canvas.width = width;
        this.canvas.height = height;
    }

    /**
     * Set blend mode
     */
    setBlendMode(mode) {
        const modes = {
            'normal': 'source-over',
            'screen': 'screen',
            'multiply': 'multiply',
            'add': 'lighter',
            'overlay': 'overlay'
        };

        if (modes[mode]) {
            this.params.blendMode = mode;
            this.ctx.globalCompositeOperation = modes[mode];
        }
    }

    /**
     * Set color palette
     */
    setColorPalette(paletteName) {
        if (this.colorPalettes[paletteName]) {
            this.params.colorPalette = paletteName;
        }
    }

    /**
     * Get color from current palette for given hue
     */
    getPaletteColor(particleHue, alpha = 1) {
        const palette = this.colorPalettes[this.params.colorPalette];

        // Map particle hue to palette range
        let hue = palette.hueStart + (particleHue / 360) * palette.hueRange;
        hue = hue % 360;

        const sat = palette.saturation;
        const light = palette.lightness;

        return `hsla(${hue}, ${sat}%, ${light}%, ${alpha})`;
    }

    /**
     * Clear canvas with background color and alpha (for trails)
     */
    clear() {
        if (this.params.enableTrails) {
            // Semi-transparent clear for trail effect
            this.ctx.fillStyle = this.params.backgroundColor;
            this.ctx.globalAlpha = this.params.backgroundAlpha;
            this.ctx.fillRect(0, 0, this.width, this.height);
            this.ctx.globalAlpha = 1.0;
        } else {
            // Full clear
            this.ctx.fillStyle = this.params.backgroundColor;
            this.ctx.fillRect(0, 0, this.width, this.height);
        }
    }

    /**
     * Draw a single particle
     */
    drawParticle(particle) {
        const color = this.getPaletteColor(particle.hue, particle.alpha);

        this.ctx.save();

        // Apply glow effect
        if (this.params.enableGlow) {
            this.ctx.shadowBlur = particle.size * this.params.glowIntensity;
            this.ctx.shadowColor = color;
        }

        this.ctx.fillStyle = color;
        this.ctx.strokeStyle = color;

        // Draw based on shape
        switch (this.params.particleShape) {
            case 'circle':
                this.ctx.beginPath();
                this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
                this.ctx.fill();
                break;

            case 'square':
                this.ctx.fillRect(
                    particle.x - particle.size,
                    particle.y - particle.size,
                    particle.size * 2,
                    particle.size * 2
                );
                break;

            case 'triangle':
                this.ctx.beginPath();
                this.ctx.moveTo(particle.x, particle.y - particle.size);
                this.ctx.lineTo(particle.x + particle.size, particle.y + particle.size);
                this.ctx.lineTo(particle.x - particle.size, particle.y + particle.size);
                this.ctx.closePath();
                this.ctx.fill();
                break;

            case 'glow':
                // Multiple layers for intense glow
                for (let i = 3; i > 0; i--) {
                    this.ctx.globalAlpha = particle.alpha / (i * 2);
                    this.ctx.beginPath();
                    this.ctx.arc(particle.x, particle.y, particle.size * i, 0, Math.PI * 2);
                    this.ctx.fill();
                }
                this.ctx.globalAlpha = 1.0;
                break;
        }

        this.ctx.restore();
        this.drawCalls++;
    }

    /**
     * Render all particles
     */
    render(particleSystem) {
        const startTime = performance.now();

        // Reset stats
        this.particlesRendered = 0;
        this.drawCalls = 0;

        // Clear canvas
        this.clear();

        // Set blend mode
        this.setBlendMode(this.params.blendMode);

        // Get particles (with LOD if enabled)
        let particles;
        if (this.params.lodEnabled) {
            particles = particleSystem.getActiveParticlesLOD(this.params.maxParticles);
        } else {
            particles = particleSystem.getActiveParticles();
        }

        // Draw all particles
        for (let i = 0; i < particles.length; i++) {
            this.drawParticle(particles[i]);
            this.particlesRendered++;
        }

        // Calculate performance metrics
        this.frameTime = performance.now() - startTime;
        this.updateFPS();
    }

    /**
     * Update FPS calculation
     */
    updateFPS() {
        const now = performance.now();
        const delta = now - this.lastFrameTime;
        this.lastFrameTime = now;

        // Add to frame times array
        this.frameTimes.push(delta);
        if (this.frameTimes.length > this.maxFrameTimes) {
            this.frameTimes.shift();
        }

        // Calculate average FPS
        const avgDelta = this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length;
        this.fps = Math.round(1000 / avgDelta);
    }

    /**
     * Draw FPS counter
     */
    drawFPS(x = 10, y = 30) {
        this.ctx.save();
        this.ctx.font = '16px monospace';
        this.ctx.fillStyle = '#00ff00';
        this.ctx.shadowBlur = 5;
        this.ctx.shadowColor = '#000000';
        this.ctx.fillText(`FPS: ${this.fps}`, x, y);
        this.ctx.restore();
    }

    /**
     * Draw performance stats
     */
    drawStats(particleSystem, x = 10, y = 50) {
        this.ctx.save();
        this.ctx.font = '14px monospace';
        this.ctx.fillStyle = '#00ff00';
        this.ctx.shadowBlur = 5;
        this.ctx.shadowColor = '#000000';

        const stats = particleSystem.getStats();
        const lines = [
            `FPS: ${this.fps}`,
            `Frame: ${this.frameTime.toFixed(2)}ms`,
            `Particles: ${stats.activeParticles}/${stats.maxParticles}`,
            `Rendered: ${this.particlesRendered}`,
            `Draw Calls: ${this.drawCalls}`,
            `Mode: ${particleSystem.physics.mode}`,
            `Blend: ${this.params.blendMode}`,
            `Palette: ${this.params.colorPalette}`
        ];

        let currentY = y;
        for (let line of lines) {
            this.ctx.fillText(line, x, currentY);
            currentY += 18;
        }

        this.ctx.restore();
    }

    /**
     * Draw audio visualization bars
     */
    drawAudioBars(audioBands, x = 10, y = 250, width = 200, height = 100) {
        if (!audioBands || audioBands.length === 0) return;

        this.ctx.save();

        const barWidth = width / audioBands.length;
        const bandNames = ['Sub', 'Bass', 'LowM', 'Mid', 'HighM', 'Treb', 'Pres'];

        for (let i = 0; i < audioBands.length; i++) {
            const barHeight = audioBands[i] * height;
            const hue = (i / audioBands.length) * 360;

            // Draw bar
            this.ctx.fillStyle = `hsla(${hue}, 100%, 50%, 0.8)`;
            this.ctx.fillRect(
                x + i * barWidth + 2,
                y + height - barHeight,
                barWidth - 4,
                barHeight
            );

            // Draw label
            this.ctx.font = '10px monospace';
            this.ctx.fillStyle = '#ffffff';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(
                bandNames[i],
                x + i * barWidth + barWidth / 2,
                y + height + 12
            );
        }

        // Draw frame
        this.ctx.strokeStyle = '#ffffff';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(x, y, width, height);

        this.ctx.restore();
    }

    /**
     * Draw kick indicator
     */
    drawKickIndicator(kickValue, x = 10, y = 380, size = 30) {
        this.ctx.save();

        const alpha = Math.max(0, kickValue);

        this.ctx.fillStyle = `rgba(255, 50, 50, ${alpha})`;
        this.ctx.shadowBlur = 20 * alpha;
        this.ctx.shadowColor = '#ff0000';
        this.ctx.beginPath();
        this.ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.font = '12px monospace';
        this.ctx.fillStyle = '#ffffff';
        this.ctx.textAlign = 'left';
        this.ctx.fillText('KICK', x + size + 10, y + size / 2 + 5);

        this.ctx.restore();
    }

    /**
     * Get performance stats
     */
    getStats() {
        return {
            fps: this.fps,
            frameTime: this.frameTime,
            particlesRendered: this.particlesRendered,
            drawCalls: this.drawCalls
        };
    }

    /**
     * Take screenshot
     */
    takeScreenshot(filename = 'particle-system.png') {
        const link = document.createElement('a');
        link.download = filename;
        link.href = this.canvas.toDataURL();
        link.click();
    }

    /**
     * Set background color
     */
    setBackgroundColor(color) {
        this.params.backgroundColor = color;
    }

    /**
     * Set trail intensity (0 = no trails, 1 = full trails)
     */
    setTrailIntensity(intensity) {
        this.params.backgroundAlpha = 1 - Math.max(0, Math.min(1, intensity));
    }
}

export default Renderer;
