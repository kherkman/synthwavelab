/**
 * Example Synth Module: An Envelope Filter (Auto-Wah).
 *
 * This module creates a "wah-wah" effect that is controlled by the amplitude
 * of the input signal. Louder notes will sweep the filter's cutoff frequency higher.
 *
 * This module demonstrates:
 * - Creating a side-chain/detector path to analyze the input signal.
 * - Using a WaveShaperNode to rectify the signal (a key step in envelope detection).
 * - Using a low-pass filter to smooth the rectified signal, creating the envelope.
 * - Modulating one AudioParam (filter.frequency) with the output of this detector path.
 */
class EnvelopeFilterModule {
    constructor(audioContext) {
        this.audioContext = audioContext;
        this.id = 'envelopeFilterModule'; // A unique ID
        this.name = 'Envelope Filter';    // The display name

        // --- Create Audio Nodes ---
        this.nodes = {
            input: this.audioContext.createGain(),
            output: this.audioContext.createGain(),
            // The main filter that processes the sound
            filter: this.audioContext.createBiquadFilter(),
            // --- Detector Path Nodes ---
            // Splits the input to go to the filter AND the detector
            splitter: this.audioContext.createChannelSplitter(2),
            // Rectifies the audio signal (makes all values positive)
            detector: this.audioContext.createWaveShaper(),
            // Smoothes the rectified signal to create the envelope
            attackReleaseFilter: this.audioContext.createBiquadFilter(),
            // Scales the envelope signal to control modulation depth (Sensitivity)
            depthGain: this.audioContext.createGain(),
        };

        // --- Configure the nodes ---
        this.nodes.filter.type = 'lowpass';
        this.nodes.filter.Q.value = 5.0; // A nice resonant peak for a "wah" sound

        // Create a curve for the WaveShaper to act as a full-wave rectifier
        const curve = new Float32Array(256);
        for (let i = 0; i < 256; i++) {
            const x = (i / 127.5) - 1; // Map i from [0, 255] to x in [-1, 1]
            curve[i] = Math.abs(x);   // The curve is the absolute value
        }
        this.nodes.detector.curve = curve;
        
        this.nodes.attackReleaseFilter.type = 'lowpass';

        // --- Connect the audio graph ---
        this.nodes.input.connect(this.nodes.splitter);

        // 1. The Main Signal Path: goes through the filter to the output.
        this.nodes.splitter.connect(this.nodes.filter, 0, 0);
        this.nodes.filter.connect(this.nodes.output);

        // 2. The Detector/Control Path: creates the envelope signal.
        this.nodes.splitter.connect(this.nodes.detector, 1, 0); // Use the other splitter output
        this.nodes.detector.connect(this.nodes.attackReleaseFilter);
        this.nodes.attackReleaseFilter.connect(this.nodes.depthGain);

        // 3. The Modulation Connection: The envelope signal controls the filter's frequency.
        this.nodes.depthGain.connect(this.nodes.filter.frequency);
    }

    /**
     * Returns the HTML string for the module's controls.
     */
    getHTML() {
        return `
            <div class="control-row">
                <label for="envFiltBaseCutoff">Base Cutoff (Hz):</label>
                <input type="range" id="envFiltBaseCutoff" min="50" max="5000" value="200" step="10">
                <span id="envFiltBaseCutoffVal" class="value-display">200</span>
            </div>
            <div class="control-row">
                <label for="envFiltSensitivity">Sensitivity:</label>
                <input type="range" id="envFiltSensitivity" min="0" max="8000" value="3000" step="100">
                <span id="envFiltSensitivityVal" class="value-display">3000</span>
            </div>
            <div class="control-row">
                <label for="envFiltQ">Resonance (Q):</label>
                <input type="range" id="envFiltQ" min="0.1" max="25" value="5" step="0.1">
                <span id="envFiltQVal" class="value-display">5.0</span>
            </div>
            <div class="control-row">
                <label for="envFiltResponse">Response (Atk/Rel):</label>
                <input type="range" id="envFiltResponse" min="1" max="100" value="10" step="1">
                <span id="envFiltResponseVal" class="value-display">10</span>
            </div>
        `;
    }

    /**
     * Finds the UI elements and attaches event listeners.
     * @param {HTMLElement} container - The div containing the module's HTML.
     */
    initUI(container) {
        this.baseCutoff = { slider: container.querySelector('#envFiltBaseCutoff'), val: container.querySelector('#envFiltBaseCutoffVal') };
        this.sensitivity = { slider: container.querySelector('#envFiltSensitivity'), val: container.querySelector('#envFiltSensitivityVal') };
        this.q = { slider: container.querySelector('#envFiltQ'), val: container.querySelector('#envFiltQVal') };
        this.response = { slider: container.querySelector('#envFiltResponse'), val: container.querySelector('#envFiltResponseVal') };

        // Helper to connect a slider to its display and update function
        const connectControl = (control, decimals = 0) => {
            control.slider.addEventListener('input', () => {
                control.val.textContent = parseFloat(control.slider.value).toFixed(decimals);
                this.updateParams();
            });
        };

        connectControl(this.baseCutoff);
        connectControl(this.sensitivity);
        connectControl(this.q, 1);
        connectControl(this.response);

        // Initialize parameters on load
        this.updateParams();
    }

    /**
     * Reads values from the controls and updates the audio node parameters.
     */
    updateParams() {
        if (!this.nodes.filter) return;
        const time = this.audioContext.currentTime;
        const smoothing = 0.02;

        const baseCutoff = parseFloat(this.baseCutoff.slider.value);
        const sensitivity = parseFloat(this.sensitivity.slider.value);
        const q = parseFloat(this.q.slider.value);
        // We want a lower filter frequency for a slower response (longer time).
        // This inverse mapping makes the UI slider more intuitive.
        const responseFreq = 100 / parseFloat(this.response.slider.value);

        // The filter's static frequency value acts as the "base" or floor.
        this.nodes.filter.frequency.setTargetAtTime(baseCutoff, time, smoothing);
        this.nodes.filter.Q.setTargetAtTime(q, time, smoothing);

        // The sensitivity slider scales the envelope signal.
        this.nodes.depthGain.gain.setTargetAtTime(sensitivity, time, smoothing);

        // The response slider controls how quickly the envelope follows the signal.
        this.nodes.attackReleaseFilter.frequency.setTargetAtTime(responseFreq, time, smoothing);
    }
}

// --- This line is crucial for the main app to load the module ---
window.registerSynthModule(EnvelopeFilterModule);