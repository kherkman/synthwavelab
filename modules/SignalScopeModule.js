/**
 * Example Synth Module: A Signal Oscilloscope and Level Meter.
 *
 * This module does not affect the audio signal. It acts as a visualizer,
 * providing a real-time oscilloscope display of the waveform and a peak/RMS
 * level meter. It can be placed anywhere in the signal chain for diagnostics.
 *
 * This module demonstrates:
 * - A pure utility/visualization module.
 * - Using an AnalyserNode to capture waveform and level data.
 * - Efficiently drawing to a <canvas> using requestAnimationFrame.
 */
class SignalScopeModule {
    constructor(audioContext) {
        this.audioContext = audioContext;
        this.id = 'signalScopeModule';
        this.name = 'Signal Scope';

        // --- Create Audio Nodes ---
        this.nodes = {
            input: this.audioContext.createGain(),
            output: this.audioContext.createGain(),
            analyser: this.audioContext.createAnalyser(),
        };

        // --- Configure the Analyser ---
        this.nodes.analyser.fftSize = 2048; // Standard size for good resolution
        this.timeDomainData = new Uint8Array(this.nodes.analyser.fftSize);
        this.floatTimeDomainData = new Float32Array(this.nodes.analyser.fftSize);

        // --- Connect the Audio Graph ---
        // The signal passes through the input, to the analyser, and then to the output.
        // The analyser node acts as a pass-through and doesn't change the sound.
        this.nodes.input.connect(this.nodes.analyser);
        this.nodes.analyser.connect(this.nodes.output);

        this.isDrawing = false;
    }

    /**
     * The main drawing loop for the oscilloscope and meters.
     * @private
     */
    _draw() {
        if (!this.isDrawing) {
            // Stop the loop if drawing has been disabled.
            return;
        }

        const analyser = this.nodes.analyser;
        const width = this.canvas.width;
        const height = this.canvas.height;
        const ctx = this.canvas.getContext('2d');

        // --- Oscilloscope Drawing ---
        analyser.getByteTimeDomainData(this.timeDomainData);
        
        ctx.fillStyle = 'var(--color-bg-container-opaque)';
        ctx.fillRect(0, 0, width, height);
        
        ctx.lineWidth = 2;
        ctx.strokeStyle = 'var(--color-neon-cyan)';
        ctx.beginPath();

        const sliceWidth = width * 1.0 / analyser.fftSize;
        let x = 0;
        for (let i = 0; i < analyser.fftSize; i++) {
            const v = this.timeDomainData[i] / 128.0; // value between 0 and 2
            const y = v * height / 2;

            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
            x += sliceWidth;
        }
        ctx.lineTo(width, height / 2);
        ctx.stroke();

        // --- Level Meter Drawing ---
        analyser.getFloatTimeDomainData(this.floatTimeDomainData);
        let peak = 0;
        let sumOfSquares = 0;
        for (let i = 0; i < this.floatTimeDomainData.length; i++) {
            const sample = this.floatTimeDomainData[i];
            sumOfSquares += sample * sample;
            if (Math.abs(sample) > peak) {
                peak = Math.abs(sample);
            }
        }
        const rms = Math.sqrt(sumOfSquares / this.floatTimeDomainData.length);
        
        // Convert linear amplitude (0-1) to dBFS (decibels relative to full scale)
        const peakDB = 20 * Math.log10(peak);
        const rmsDB = 20 * Math.log10(rms);
        
        this._updateMeter(this.peakMeter, peak);
        this._updateMeter(this.rmsMeter, rms);

        // Request the next frame to continue the animation
        requestAnimationFrame(() => this._draw());
    }
    
    _updateMeter(meterElement, value) {
        if (!meterElement) return;
        const linearValue = Math.max(0, Math.min(1, value)); // Clamp value between 0 and 1
        meterElement.style.width = `${linearValue * 100}%`;
        
        // Change color when clipping
        if (linearValue >= 0.98) {
            meterElement.style.backgroundColor = 'var(--color-neon-pink)';
        } else if (linearValue > 0.8) {
            meterElement.style.backgroundColor = 'var(--color-neon-yellow)';
        } else {
            meterElement.style.backgroundColor = 'var(--color-neon-green)';
        }
    }


    getHTML() {
        return `
            <style>
                .meter-container { background-color: var(--color-bg-deep); border: 1px solid var(--color-bg-medium); height: 12px; margin-top: 4px; }
                .meter-bar { height: 100%; width: 0%; transition: width 0.05s linear; }
            </style>
            <canvas id="scopeCanvas" width="400" height="150" class="display-canvas" style="margin-bottom: 15px;"></canvas>
            <div>
                <label style="font-size: 0.9em; color: var(--color-text-secondary);">Peak</label>
                <div class="meter-container"><div id="scopePeakMeter" class="meter-bar"></div></div>
                <label style="font-size: 0.9em; color: var(--color-text-secondary);">RMS</label>
                <div class="meter-container"><div id="scopeRmsMeter" class="meter-bar"></div></div>
            </div>
        `;
    }

    initUI(container) {
        this.canvas = container.querySelector('#scopeCanvas');
        this.peakMeter = container.querySelector('#scopePeakMeter');
        this.rmsMeter = container.querySelector('#scopeRmsMeter');
        
        // Start the drawing loop
        this.isDrawing = true;
        this._draw();
    }

    updateParams() {
        // This module has no adjustable parameters.
    }
    
    // It's good practice for modules with animation loops to have a cleanup method.
    // The host app would need to be modified to call this if the module were ever removed.
    destroy() {
        this.isDrawing = false;
        console.log("Signal Scope drawing loop stopped.");
    }
}

// --- This line is crucial for the main app to load the module ---
window.registerSynthModule(SignalScopeModule);