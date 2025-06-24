/**
 * Example Synth Module: A Soft Clipper & Tone Shaper.
 *
 * This module is a sound-polishing utility that combines a gentle soft
 * clipper to tame harsh peaks with a "tilt" EQ to easily adjust the
 * overall tonal balance from dark to bright.
 *
 * This module demonstrates:
 * - A subtle but powerful "character" effect for sound shaping.
 * - Implementing a classic "Tilt EQ" with two shelving filters.
 * - A practical use of a very gentle WaveShaper curve for soft clipping.
 */
class SoftShaperModule {
    constructor(audioContext) {
        this.audioContext = audioContext;
        this.id = 'softShaperModule';
        this.name = 'Soft Shaper';

        // --- Create Audio Nodes ---
        this.nodes = {
            input: this.audioContext.createGain(),
            output: this.audioContext.createGain(),
            
            // --- Soft Clipper ---
            shaper: this.audioContext.createWaveShaper(),
            
            // --- Tilt EQ ---
            lowShelf: this.audioContext.createBiquadFilter(),
            highShelf: this.audioContext.createBiquadFilter(),
        };

        // --- Configure Nodes ---
        this.nodes.lowShelf.type = 'lowshelf';
        this.nodes.highShelf.type = 'highshelf';
        // The pivot frequency for the tilt EQ
        this.nodes.lowShelf.frequency.value = 800;
        this.nodes.highShelf.frequency.value = 800;
        
        // --- Connect the Audio Graph ---
        // The signal flows through the shaper, then the two EQ filters.
        this.nodes.input.connect(this.nodes.shaper);
        this.nodes.shaper.connect(this.nodes.lowShelf);
        this.nodes.lowShelf.connect(this.nodes.highShelf);
        this.nodes.highShelf.connect(this.nodes.output);
    }

    /**
     * Creates a very gentle curve that only affects the loudest parts of the signal.
     * @private
     */
    _createSoftClipCurve(amount) {
        // Amount goes from 0 to 1. 0 is linear, 1 is heavy soft clipping.
        const n_samples = 44100;
        const curve = new Float32Array(n_samples);
        const peak = 0.9 - amount * 0.3; // The point where clipping starts
        
        for (let i = 0; i < n_samples; ++i) {
            const x = i * 2 / n_samples - 1;
            if (Math.abs(x) < peak) {
                // If below the peak, the signal is linear
                curve[i] = x;
            } else {
                // If above the peak, apply gentle tanh saturation
                const sign = Math.sign(x);
                const overflow = Math.abs(x) - peak;
                curve[i] = sign * (peak + (1 - peak) * Math.tanh(overflow / (1 - peak)));
            }
        }
        return curve;
    }

    getHTML() {
        return `
            <div class="control-row">
                <label for="softenAmount">Soften (Clip):</label>
                <input type="range" id="softenAmount" min="0" max="1" value="0.2" step="0.01">
                <span id="softenAmountVal" class="value-display">0.20</span>
            </div>
            <div class="control-row">
                <label for="softenTilt">Tone Tilt:</label>
                <input type="range" id="softenTilt" min="-12" max="12" value="0" step="1">
                <span id="softenTiltVal" class="value-display">0</span>
            </div>
             <div class="control-row">
                <label for="softenOutput">Output Level:</label>
                <input type="range" id="softenOutput" min="0" max="1.5" value="1.0" step="0.01">
                <span id="softenOutputVal" class="value-display">1.00</span>
            </div>
        `;
    }

    initUI(container) {
        this.soften = { slider: container.querySelector('#softenAmount'), val: container.querySelector('#softenAmountVal') };
        this.tilt = { slider: container.querySelector('#softenTilt'), val: container.querySelector('#softenTiltVal') };
        this.output = { slider: container.querySelector('#softenOutput'), val: container.querySelector('#softenOutputVal') };

        const connect = (ctrl, decimals = 2) => {
            ctrl.slider.addEventListener('input', () => {
                ctrl.val.textContent = parseFloat(ctrl.slider.value).toFixed(decimals);
                this.updateParams();
            });
        };
        
        connect(this.soften, 2);
        connect(this.tilt, 0);
        connect(this.output, 2);
        
        this.updateParams();
    }

    updateParams() {
        if (!this.nodes.input) return;
        
        const time = this.audioContext.currentTime;
        const smoothing = 0.02;
        
        const soften = parseFloat(this.soften.slider.value);
        const tilt = parseFloat(this.tilt.slider.value);
        const output = parseFloat(this.output.slider.value);
        
        // Update the soft clipper curve based on the "Soften" amount
        this.nodes.shaper.curve = this._createSoftClipCurve(soften);
        
        // --- Update the Tilt EQ ---
        // A positive tilt value boosts highs and cuts lows.
        // A negative tilt value boosts lows and cuts highs.
        const lowGain = -tilt;
        const highGain = tilt;
        
        this.nodes.lowShelf.gain.setTargetAtTime(lowGain, time, smoothing);
        this.nodes.highShelf.gain.setTargetAtTime(highGain, time, smoothing);
        
        // Set the final output level
        this.nodes.output.gain.setTargetAtTime(output, time, smoothing);
    }
}

// --- This line is crucial for the main app to load the module ---
window.registerSynthModule(SoftShaperModule);