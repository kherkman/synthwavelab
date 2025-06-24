/**
 * Example Synth Module: A Single-Band Parametric EQ.
 *
 * This module provides a fully parametric "peaking" filter, which can be
 * used to boost or cut a specific range of frequencies with precise control
 * over the center frequency, gain, and bandwidth (Q).
 *
 * This module demonstrates:
 * - A focused implementation of the BiquadFilterNode in 'peaking' mode.
 * - Exposing the three fundamental parameters of a parametric EQ.
 * - Creating a reusable "building block" that could be chained multiple
 *   times to create a complex graphic equalizer.
 */
class ParametricEQModule {
    constructor(audioContext) {
        this.audioContext = audioContext;
        this.id = 'parametricEqModule';
        this.name = 'Parametric EQ';

        // --- Create Audio Nodes ---
        // The signal path is very simple: input -> filter -> output
        this.nodes = {
            input: this.audioContext.createGain(),
            output: this.audioContext.createGain(),
            filter: this.audioContext.createBiquadFilter(),
        };

        // --- Configure the Filter Node ---
        this.nodes.filter.type = 'peaking';
        this.nodes.filter.frequency.value = 1000; // Default center frequency
        this.nodes.filter.gain.value = 0;         // Default to no boost or cut
        this.nodes.filter.Q.value = 1.41;         // A standard starting Q value

        // --- Connect the Audio Graph ---
        this.nodes.input.connect(this.nodes.filter);
        this.nodes.filter.connect(this.nodes.output);
    }

    /**
     * Returns the HTML string for the module's controls.
     */
    getHTML() {
        return `
            <div class="control-row">
                <label for="peqFrequency">Frequency (Hz):</label>
                <input type="range" id="peqFrequency" min="20" max="20000" value="1000" step="10">
                <span id="peqFrequencyVal" class="value-display">1000</span>
            </div>
            <div class="control-row">
                <label for="peqGain">Gain (dB):</label>
                <input type="range" id="peqGain" min="-24" max="24" value="0" step="1">
                <span id="peqGainVal" class="value-display">0</span>
            </div>
            <div class="control-row">
                <label for="peqQ">Bandwidth (Q):</label>
                <input type="range" id="peqQ" min="0.1" max="18" value="1.4" step="0.1">
                <span id="peqQVal" class="value-display">1.4</span>
            </div>
        `;
    }

    /**
     * Finds the UI elements and attaches event listeners.
     * @param {HTMLElement} container - The div containing the module's HTML.
     */
    initUI(container) {
        this.frequency = { slider: container.querySelector('#peqFrequency'), val: container.querySelector('#peqFrequencyVal') };
        this.gain = { slider: container.querySelector('#peqGain'), val: container.querySelector('#peqGainVal') };
        this.q = { slider: container.querySelector('#peqQ'), val: container.querySelector('#peqQVal') };

        const connect = (ctrl, decimals = 0) => {
            ctrl.slider.addEventListener('input', () => {
                // Special handling for frequency to show 'k' for thousands
                if (ctrl === this.frequency) {
                    const freq = parseFloat(ctrl.slider.value);
                    ctrl.val.textContent = freq >= 1000 ? `${(freq / 1000).toFixed(1)}k` : freq;
                } else {
                    ctrl.val.textContent = parseFloat(ctrl.slider.value).toFixed(decimals);
                }
                this.updateParams();
            });
            // Trigger initial display update
            ctrl.slider.dispatchEvent(new Event('input'));
        };

        connect(this.frequency, 0);
        connect(this.gain, 0);
        connect(this.q, 1);

        this.updateParams();
    }

    /**
     * Reads values from the controls and updates the audio node parameters.
     */
    updateParams() {
        if (!this.nodes.filter) return;
        const time = this.audioContext.currentTime;
        const smoothing = 0.01;

        // The frequency slider is linear, but our perception of pitch is logarithmic.
        // For a more musically useful control, we can map the linear slider value
        // to a logarithmic scale.
        const minLog = Math.log(20);
        const maxLog = Math.log(20000);
        const scale = (maxLog - minLog) / (this.frequency.slider.max - this.frequency.slider.min);
        const logFreq = Math.exp(minLog + scale * (this.frequency.slider.value - this.frequency.slider.min));

        const gain = parseFloat(this.gain.slider.value);
        const q = parseFloat(this.q.slider.value);
        
        this.nodes.filter.frequency.setTargetAtTime(logFreq, time, smoothing);
        this.nodes.filter.gain.setTargetAtTime(gain, time, smoothing);
        this.nodes.filter.Q.setTargetAtTime(q, time, smoothing);
    }
}

// --- This line is crucial for the main app to load the module ---
window.registerSynthModule(ParametricEQModule);