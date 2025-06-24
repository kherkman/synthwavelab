/**
 * Example Synth Module: A Wavefolder.
 *
 * A wavefolder is a distortion effect that "folds" a waveform back on
 * itself when it exceeds a threshold, rather than clipping it. This adds
 * complex new harmonics to the signal. This module includes a live visualizer
 * to show the wave-shaping transfer curve.
 *
 * This module demonstrates:
 * - A complex, dynamically generated curve for a WaveShaperNode.
 * - Including a <canvas> visualizer within a module's UI.
 * - A classic "West Coast" synthesis technique.
 */
class WavefolderModule {
    constructor(audioContext) {
        this.audioContext = audioContext;
        this.id = 'wavefolderModule';
        this.name = 'Wavefolder';

        // --- Create Audio Nodes ---
        this.nodes = {
            input: this.audioContext.createGain(),
            output: this.audioContext.createGain(),
            // A gain stage before the shaper to control the amount of folding
            preGain: this.audioContext.createGain(),
            // The WaveShaperNode that will apply the folding curve
            shaper: this.audioContext.createWaveShaper(),
            // A gain stage after the shaper to compensate for volume changes
            postGain: this.audioContext.createGain(),
        };

        // --- Connect the Audio Graph ---
        this.nodes.input.connect(this.nodes.preGain);
        this.nodes.preGain.connect(this.nodes.shaper);
        this.nodes.shaper.connect(this.nodes.postGain);
        this.nodes.postGain.connect(this.nodes.output);
    }

    /**
     * Generates the wave-folding curve for the WaveShaperNode.
     * @private
     */
    _createFoldingCurve(foldAmount) {
        const samples = 44100;
        const curve = new Float32Array(samples);
        // The foldAmount is scaled for a more intuitive UI control range
        const f = 1 + foldAmount * 5;
        
        for (let i = 0; i < samples; i++) {
            // Map the sample index to a value from -1 to 1
            const x = (i * 2 / samples) - 1;
            // The core of the wavefolder: a sine wave whose frequency
            // increases as the input signal (x) moves away from zero.
            curve[i] = Math.sin((x * Math.PI) * f);
        }
        return curve;
    }

    /**
     * Draws the current transfer curve on the module's canvas.
     * @private
     */
    _drawCurve() {
        if (!this.canvas) return;
        
        const ctx = this.canvas.getContext('2d');
        const width = this.canvas.width;
        const height = this.canvas.height;
        const curve = this.nodes.shaper.curve;

        if (!curve) return;
        
        // Clear and style the canvas
        ctx.fillStyle = 'var(--color-bg-container-opaque)';
        ctx.fillRect(0, 0, width, height);
        ctx.strokeStyle = 'var(--color-neon-yellow)';
        ctx.lineWidth = 2;

        ctx.beginPath();
        for (let i = 0; i < curve.length; i++) {
            const x = (i / (curve.length - 1)) * width;
            // Map the curve value from [-1, 1] to the canvas height
            const y = (1 - curve[i]) * height / 2;

            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }
        ctx.stroke();
    }

    /**
     * Returns the HTML string for the module's controls.
     */
    getHTML() {
        return `
            <canvas id="wavefolderCanvas" width="200" height="100" class="display-canvas" style="margin-bottom: 15px;"></canvas>
            <div class="control-row">
                <label for="folderGain">Input Gain:</label>
                <input type="range" id="folderGain" min="1" max="50" value="1" step="0.5">
                <span id="folderGainVal" class="value-display">1.0</span>
            </div>
            <div class="control-row">
                <label for="folderAmount">Fold Amount:</label>
                <input type="range" id="folderAmount" min="0" max="1" value="0" step="0.01">
                <span id="folderAmountVal" class="value-display">0.00</span>
            </div>
            <div class="control-row">
                <label for="folderMix">Mix (Wet):</label>
                <input type="range" id="folderMix" min="0" max="1" value="1" step="0.01">
                <span id="folderMixVal" class="value-display">1.00</span>
            </div>
        `;
    }

    /**
     * Finds the UI elements and attaches event listeners.
     */
    initUI(container) {
        this.canvas = container.querySelector('#wavefolderCanvas');
        this.gain = { slider: container.querySelector('#folderGain'), val: container.querySelector('#folderGainVal') };
        this.fold = { slider: container.querySelector('#folderAmount'), val: container.querySelector('#folderAmountVal') };
        this.mix = { slider: container.querySelector('#folderMix'), val: container.querySelector('#folderMixVal') };

        const connect = (ctrl, decimals = 1) => {
            ctrl.slider.addEventListener('input', () => {
                ctrl.val.textContent = parseFloat(ctrl.slider.value).toFixed(decimals);
                this.updateParams();
            });
        };

        connect(this.gain, 1);
        connect(this.fold, 2);
        connect(this.mix, 2);

        this.updateParams();
    }

    /**
     * Reads values from the controls and updates the audio node parameters.
     */
    updateParams() {
        if (!this.nodes.shaper) return;
        const time = this.audioContext.currentTime;
        const smoothing = 0.01;

        const gain = parseFloat(this.gain.slider.value);
        const foldAmount = parseFloat(this.fold.slider.value);
        const mix = parseFloat(this.mix.slider.value);
        
        // Update the pre-gain, which drives the signal into the folder
        this.nodes.preGain.gain.setTargetAtTime(gain, time, smoothing);
        
        // Generate and apply the new folding curve
        this.nodes.shaper.curve = this._createFoldingCurve(foldAmount);
        
        // For this effect, instead of a traditional wet/dry, we'll control
        // the output level of the shaper. The original signal is not mixed back in,
        // as wavefolding is typically a full-signal transformation.
        // The 'mix' control here will act as an output gain for the wet signal.
        this.nodes.postGain.gain.setTargetAtTime(mix, time, smoothing);
        
        // Redraw the visualizer
        this._drawCurve();
    }
}

// --- This line is crucial for the main app to load the module ---
window.registerSynthModule(WavefolderModule);