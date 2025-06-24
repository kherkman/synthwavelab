class VUMeterModule {
    constructor(audioContext) {
        this.audioContext = audioContext;
        this.id = 'vuMeterModule';
        this.name = 'VU Meter';

        // The host application will control the 'active' state via its toggle button.
        this.active = false;

        // FULFILL HOST CONTRACT: Define both input and output nodes.
        this.nodes = {
            input: this.audioContext.createGain(),
            output: this.audioContext.createGain()
        };

        // CREATE PASS-THROUGH PATH: Audio flows through for the main chain.
        this.nodes.input.connect(this.nodes.output);

        // CREATE PARALLEL ANALYSIS PATH: This path is for listening only.
        const booster = this.audioContext.createGain();
        booster.gain.value = 2.0; // Compensates for the 50% signal split from the host.

        this.analyser = this.audioContext.createAnalyser();
        this.nodes.input.connect(booster);
        booster.connect(this.analyser);
        
        // --- FIX FOR DELAY ---
        // Configure the analyser for a much faster response.
        this.analyser.fftSize = 256;
        this.analyser.minDecibels = -90;
        this.analyser.maxDecibels = 0;
        // Lowered from 0.6 to 0.2 for less time-based smoothing.
        this.analyser.smoothingTimeConstant = 0.2; 
        
        this.bufferLength = this.analyser.frequencyBinCount;
        this.dataArray = new Float32Array(this.bufferLength);

        this.animationFrameId = null;
        this.canvas = null;
        this.ctx = null;
        this.peakDb = -90;
    }

    getHTML() {
        return `<canvas id="vuMeterCanvas" width="250" height="150" class="display-canvas"></canvas>`;
    }

    initUI(container) {
        this.canvas = container.querySelector('#vuMeterCanvas');
        if (!this.canvas) { return; }
        this.ctx = this.canvas.getContext('2d');
        this.startDrawing();
    }

    startDrawing() {
        if (this.animationFrameId) return;
        this._draw();
    }

    stopDrawing() {
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
    }

    _draw() {
        this.animationFrameId = requestAnimationFrame(() => this._draw());

        this.analyser.getFloatFrequencyData(this.dataArray);
        let currentMax = -Infinity;
        for (let i = 0; i < this.bufferLength; i++) {
            if (this.dataArray[i] > -Infinity) {
                currentMax = Math.max(currentMax, this.dataArray[i]);
            }
        }

        // --- FIX FOR DELAY ---
        // The smoothing factor here is increased from 0.1 to 0.4 for a much "snappier" needle.
        const smoothingFactor = 0.4;
        
        if (currentMax > -Infinity) {
            this.peakDb += (currentMax - this.peakDb) * smoothingFactor;
        } else {
            // Let the needle fall back gracefully when there is silence.
            this.peakDb += (this.analyser.minDecibels - this.peakDb) * 0.05;
        }

        const styles = getComputedStyle(document.documentElement);
        const { width, height } = this.canvas;
        this.ctx.fillStyle = styles.getPropertyValue('--color-bg-deep').trim();
        this.ctx.fillRect(0, 0, width, height);

        const centerX = width / 2;
        const centerY = height * 0.9;
        const radius = width * 0.4;

        this.ctx.strokeStyle = styles.getPropertyValue('--color-text-secondary').trim();
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, radius, Math.PI, 0);
        this.ctx.stroke();

        const totalDbRange = 23; // -20dB to +3dB
        const tickValues = [-20, -10, -7, -5, -3, 0, 3];
        this.ctx.font = '10px "Consolas", monospace';
        this.ctx.fillStyle = styles.getPropertyValue('--color-text-secondary').trim();
        this.ctx.textAlign = 'center';

        tickValues.forEach(val => {
            const tickDbProportion = (val + 20) / totalDbRange;
            const angleRad = Math.PI * (1 - tickDbProportion);
            const isLabel = val === -20 || val === -7 || val === 0 || val === 3;
            const startX = centerX + Math.cos(angleRad) * radius;
            const startY = centerY - Math.sin(angleRad) * radius;
            const endX = centerX + Math.cos(angleRad) * (radius - (isLabel ? 10 : 5));
            const endY = centerY - Math.sin(angleRad) * (radius - (isLabel ? 10 : 5));
            this.ctx.beginPath();
            this.ctx.moveTo(startX, startY);
            this.ctx.lineTo(endX, endY);
            this.ctx.stroke();
            if (isLabel) {
                const labelX = centerX + Math.cos(angleRad) * (radius - 18);
                const labelY = centerY - Math.sin(angleRad) * (radius - 18);
                this.ctx.fillText(val > 0 ? `+${val}` : val, labelX, labelY);
            }
        });

        let val = this.peakDb;
        let tickDbProportion = (val + 20) / totalDbRange;
        tickDbProportion = Math.max(0, Math.min(1, tickDbProportion));
        let angleRad = Math.PI * (1 - tickDbProportion);

        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, radius - 1, 0, Math.PI * (1 - ((0 + 20) / totalDbRange)));
        this.ctx.strokeStyle = styles.getPropertyValue('--color-drum-kick').trim();
        this.ctx.lineWidth = 4;
        this.ctx.stroke();

        this.ctx.strokeStyle = styles.getPropertyValue('--color-neon-pink').trim();
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(centerX, centerY);
        this.ctx.lineTo(centerX + Math.cos(angleRad) * (radius - 5), centerY - Math.sin(angleRad) * (radius - 5));
        this.ctx.stroke();

        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, 5, 0, Math.PI * 2);
        this.ctx.fillStyle = styles.getPropertyValue('--color-text-dim').trim();
        this.ctx.fill();
    }

    updateParams() {}

    destroy() {
        this.stopDrawing();
        if (this.analyser) this.analyser.disconnect();
        if (this.nodes.input) this.nodes.input.disconnect();
    }
}

// This line is crucial for the main app to load the module
if (window.registerSynthModule) {
    window.registerSynthModule(VUMeterModule);
}