/**
 * Example Synth Module: A Tape Saturation simulator.
 *
 * This module simulates the warm, gentle compression and harmonic distortion
 * of analog tape saturation. It uses a WaveShaperNode with a tanh curve to
 * softly clip the signal, adding warmth and cohesion.
 *
 * This module demonstrates:
 * - A focused implementation of a specific, desirable distortion type.
 * - Using a WaveShaperNode with a classic tanh curve for soft clipping.
 * - Implementing a "Bias" control to create asymmetrical distortion for more tonal variety.
 */
class SaturationModule {
    constructor(audioContext) {
        this.audioContext = audioContext;
        this.id = 'saturationModule';
        this.name = 'Tape Saturation';

        // --- Create Audio Nodes ---
        this.nodes = {
            input: this.audioContext.createGain(),
            output: this.audioContext.createGain(),
            // A gain stage to drive the signal into the saturator
            driveGain: this.audioContext.createGain(),
            // The WaveShaperNode that will apply the saturation curve
            shaper: this.audioContext.createWaveShaper(),
            // A DC offset node to apply the bias
            biaser: this.audioContext.createConstantSource(),
            // A gain stage after the shaper to compensate for volume changes
            outputGain: this.audioContext.createGain(),
        };

        // --- Configure and Start Nodes ---
        this.nodes.biaser.offset.value = 0;
        this.nodes.biaser.start();
        
        // --- Connect the Audio Graph ---
        // 1. The input signal is amplified by the drive gain.
        this.nodes.input.connect(this.nodes.driveGain);
        
        // 2. The bias signal is added to the driven audio signal.
        // This is done by connecting both to the shaper's input.
        this.nodes.driveGain.connect(this.nodes.shaper);
        this.nodes.biaser.connect(this.nodes.shaper);
        
        // 3. The shaped signal is passed through the output gain.
        this.nodes.shaper.connect(this.nodes.outputGain);
        
        // 4. The final signal goes to the module's main output.
        this.nodes.outputGain.connect(this.nodes.output);
    }

    /**
     * Generates the tanh saturation curve for the WaveShaperNode.
     * @private
     */
    _createSaturationCurve(amount) {
        const k = amount;
        const n_samples = 44100;
        const curve = new Float32Array(n_samples);
        for (let i = 0; i < n_samples; ++i) {
            const x = i * 2 / n_samples - 1;
            curve[i] = Math.tanh(x * k);
        }
        return curve;
    }

    getHTML() {
        return `
            <div class="control-row">
                <label for="satDrive">Drive:</label>
                <input type="range" id="satDrive" min="1" max="20" value="3" step="0.1">
                <span id="satDriveVal" class="value-display">3.0</span>
            </div>
            <div class="control-row">
                <label for="satBias">Bias:</label>
                <input type="range" id="satBias" min="-0.5" max="0.5" value="0" step="0.01">
                <span id="satBiasVal" class="value-display">0.00</span>
            </div>
            <div class="control-row">
                <label for="satOutput">Output Level:</label>
                <input type="range" id="satOutput" min="0" max="1.5" value="1.0" step="0.01">
                <span id="satOutputVal" class="value-display">1.00</span>
            </div>
        `;
    }

    initUI(container) {
        this.drive = { slider: container.querySelector('#satDrive'), val: container.querySelector('#satDriveVal') };
        this.bias = { slider: container.querySelector('#satBias'), val: container.querySelector('#satBiasVal') };
        this.output = { slider: container.querySelector('#satOutput'), val: container.querySelector('#satOutputVal') };

        const connect = (ctrl, decimals = 2) => {
            ctrl.slider.addEventListener('input', () => {
                ctrl.val.textContent = parseFloat(ctrl.slider.value).toFixed(decimals);
                this.updateParams();
            });
        };
        
        connect(this.drive, 1);
        connect(this.bias, 2);
        connect(this.output, 2);

        this.updateParams();
    }

    updateParams() {
        if (!this.nodes.shaper) return;
        
        const time = this.audioContext.currentTime;
        const smoothing = 0.01;
        
        const drive = parseFloat(this.drive.slider.value);
        const bias = parseFloat(this.bias.slider.value);
        const output = parseFloat(this.output.slider.value);
        
        // The drive controls the input gain.
        this.nodes.driveGain.gain.setTargetAtTime(drive, time, smoothing);
        
        // The bias controls the DC offset.
        this.nodes.biaser.offset.setTargetAtTime(bias, time, smoothing);
        
        // The saturation curve itself is based on the drive amount.
        this.nodes.shaper.curve = this._createSaturationCurve(drive);
        
        // The output gain compensates for the overall volume increase.
        this.nodes.outputGain.gain.setTargetAtTime(output, time, smoothing);
    }
}

// --- This line is crucial for the main app to load the module ---
window.registerSynthModule(SaturationModule);