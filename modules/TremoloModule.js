/**
 * Example Synth Module: A Tremolo Effect.
 *
 * This module creates the classic tremolo effect by modulating the amplitude
 * (volume) of the input signal with a low-frequency oscillator (LFO).
 *
 * This module demonstrates:
 * - A simple and clear implementation of amplitude modulation.
 * - Using an LFO to control the 'gain' AudioParam of a GainNode.
 * - A "Smoothness" control that adjusts the time constant of parameter changes.
 */
class TremoloModule {
    constructor(audioContext) {
        this.audioContext = audioContext;
        this.id = 'tremoloModule';
        this.name = 'Tremolo';

        // --- Create Audio Nodes ---
        this.nodes = {
            input: this.audioContext.createGain(),
            output: this.audioContext.createGain(),
            // This GainNode's volume will be modulated to create the effect.
            // It sits directly in the signal path.
            tremoloGain: this.audioContext.createGain(),
            // --- LFO / Modulation Path ---
            lfo: this.audioContext.createOscillator(),
            // The LFO's output is bipolar (-1 to 1). We need to scale and offset it
            // to control the gain correctly (e.g., from 0 to 1).
            lfoDepth: this.audioContext.createGain(),
        };

        // --- Configure and Start the LFO ---
        this.nodes.lfo.type = 'sine';
        this.nodes.lfo.start();
        
        // --- Connect the Audio Graph ---
        // 1. The main signal path passes through the tremoloGain node.
        this.nodes.input.connect(this.nodes.tremoloGain);
        this.nodes.tremoloGain.connect(this.nodes.output);

        // 2. The LFO modulates the gain of the tremoloGain node.
        this.nodes.lfo.connect(this.nodes.lfoDepth);
        this.nodes.lfoDepth.connect(this.nodes.tremoloGain.gain);
        
        // By default, the LFO will try to push the gain negative, which is invalid.
        // We will manage the depth and offset in the updateParams function.
    }

    /**
     * Returns the HTML string for the module's controls.
     */
    getHTML() {
        return `
            <div class="control-row">
                <label for="tremoloRate">Rate (Hz):</label>
                <input type="range" id="tremoloRate" min="0.1" max="30" value="5" step="0.1">
                <span id="tremoloRateVal" class="value-display">5.0</span>
            </div>
            <div class="control-row">
                <label for="tremoloDepth">Depth:</label>
                <input type="range" id="tremoloDepth" min="0" max="1" value="0.8" step="0.01">
                <span id="tremoloDepthVal" class="value-display">0.80</span>
            </div>
            <div class="control-row">
                <label for="tremoloSmooth">Smoothness:</label>
                <input type="range" id="tremoloSmooth" min="0.001" max="0.2" value="0.01" step="0.001">
                <span id="tremoloSmoothVal" class="value-display">0.010</span>
            </div>
            <div class="control-row">
                <label for="tremoloWave">Waveform:</label>
                 <select id="tremoloWave" style="flex-grow:1;">
                    <option value="sine" selected>Sine</option>
                    <option value="square">Square</option>
                    <option value="triangle">Triangle</option>
                    <option value="sawtooth">Sawtooth</option>
                </select>
            </div>
        `;
    }

    /**
     * Finds the UI elements and attaches event listeners.
     */
    initUI(container) {
        this.rate = { slider: container.querySelector('#tremoloRate'), val: container.querySelector('#tremoloRateVal') };
        this.depth = { slider: container.querySelector('#tremoloDepth'), val: container.querySelector('#tremoloDepthVal') };
        this.smooth = { slider: container.querySelector('#tremoloSmooth'), val: container.querySelector('#tremoloSmoothVal') };
        this.wave = { selector: container.querySelector('#tremoloWave') };

        const connect = (ctrl, decimals = 2) => {
            ctrl.slider.addEventListener('input', () => {
                ctrl.val.textContent = parseFloat(ctrl.slider.value).toFixed(decimals);
                this.updateParams();
            });
        };

        connect(this.rate, 1);
        connect(this.depth, 2);
        connect(this.smooth, 3);
        this.wave.selector.addEventListener('change', () => this.updateParams());

        this.updateParams();
    }

    /**
     * Reads values from the controls and updates the audio node parameters.
     */
    updateParams() {
        if (!this.nodes.lfo) return;
        
        const time = this.audioContext.currentTime;
        const smoothing = parseFloat(this.smooth.slider.value);

        const rateHz = parseFloat(this.rate.slider.value);
        const depth = parseFloat(this.depth.slider.value);
        const waveType = this.wave.selector.value;

        // Set LFO parameters
        this.nodes.lfo.type = waveType;
        this.nodes.lfo.frequency.setTargetAtTime(rateHz, time, smoothing);
        
        // --- Manage Gain Modulation ---
        // An LFO outputs a bipolar signal from -1 to 1. Gain must be >= 0.
        // To control gain from (1 - depth) to 1, we can do the following:
        // 1. The LFO's output (-1 to 1) is scaled by `lfoDepth` to be (-depth/2 to depth/2).
        // 2. The `tremoloGain`'s base gain is set to 1 - depth/2.
        // The result is that the gain modulates from (1 - depth/2) - depth/2 = (1 - depth)
        // up to (1 - depth/2) + depth/2 = 1.
        
        const scaledDepth = depth / 2;
        const baseGain = 1 - scaledDepth;
        
        this.nodes.lfoDepth.gain.setTargetAtTime(scaledDepth, time, smoothing);
        this.nodes.tremoloGain.gain.setTargetAtTime(baseGain, time, smoothing);
    }
}

// --- This line is crucial for the main app to load the module ---
window.registerSynthModule(TremoloModule);