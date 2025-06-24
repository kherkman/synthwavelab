/**
 * Example Synth Module: A Ring Modulator.
 *
 * This module multiplies the incoming audio signal with a sine wave (the carrier).
 * This process, also known as amplitude modulation, creates "sideband" frequencies
 * resulting in metallic, bell-like, and inharmonic sounds.
 *
 * This module demonstrates:
 * - A simple but powerful synthesis technique.
 * - Using an OscillatorNode to control the gain of another signal path.
 * - Implementing a classic sci-fi and experimental electronic music effect.
 */
class RingModulatorModule {
    constructor(audioContext) {
        this.audioContext = audioContext;
        this.id = 'ringModulatorModule'; // A unique ID
        this.name = 'Ring Modulator';    // The display name

        // --- Create Audio Nodes ---
        this.nodes = {
            input: this.audioContext.createGain(),
            output: this.audioContext.createGain(),
            dryGain: this.audioContext.createGain(),
            wetGain: this.audioContext.createGain(),
            // The GainNode that performs the multiplication
            modulator: this.audioContext.createGain(),
            // The sine wave "carrier" signal
            carrier: this.audioContext.createOscillator(),
        };
        
        // --- Configure the Carrier Oscillator ---
        this.nodes.carrier.type = 'sine';
        this.nodes.carrier.frequency.value = 100;
        this.nodes.carrier.start();

        // --- Connect the Audio Graph ---
        
        // 1. Set up the Wet/Dry Mix
        this.nodes.input.connect(this.nodes.dryGain);
        this.nodes.dryGain.connect(this.nodes.output);
        
        this.nodes.modulator.connect(this.nodes.wetGain);
        this.nodes.wetGain.connect(this.nodes.output);

        // 2. Set up the Ring Modulation Path
        // The input audio goes into the main input of the 'modulator' GainNode.
        this.nodes.input.connect(this.nodes.modulator);
        
        // The carrier oscillator is connected to the 'gain' AudioParam of the
        // modulator. This makes the gain of the input signal fluctuate at the
        // carrier's frequency, effectively multiplying the two signals.
        this.nodes.carrier.connect(this.nodes.modulator.gain);
    }

    /**
     * Returns the HTML string for the module's controls.
     */
    getHTML() {
        return `
            <div class="control-row">
                <label for="ringModFreq">Carrier Freq (Hz):</label>
                <input type="range" id="ringModFreq" min="1" max="4000" value="100" step="1">
                <span id="ringModFreqVal" class="value-display">100</span>
            </div>
            <div class="control-row">
                <label for="ringModMix">Mix (Wet):</label>
                <input type="range" id="ringModMix" min="0" max="1" value="0.5" step="0.01">
                <span id="ringModMixVal" class="value-display">0.50</span>
            </div>
        `;
    }

    /**
     * Finds the UI elements and attaches event listeners.
     * @param {HTMLElement} container - The div containing the module's HTML.
     */
    initUI(container) {
        this.freq = { slider: container.querySelector('#ringModFreq'), val: container.querySelector('#ringModFreqVal') };
        this.mix = { slider: container.querySelector('#ringModMix'), val: container.querySelector('#ringModMixVal') };
        
        const connect = (ctrl, decimals = 0) => {
            ctrl.slider.addEventListener('input', () => {
                ctrl.val.textContent = parseFloat(ctrl.slider.value).toFixed(decimals);
                this.updateParams();
            });
        };

        connect(this.freq, 0);
        connect(this.mix, 2);

        this.updateParams();
    }

    /**
     * Reads values from the controls and updates the audio node parameters.
     */
    updateParams() {
        if (!this.nodes.carrier) return;
        
        const time = this.audioContext.currentTime;
        const smoothing = 0.02;

        const freq = parseFloat(this.freq.slider.value);
        const mix = parseFloat(this.mix.slider.value);
        
        // Update the carrier frequency
        this.nodes.carrier.frequency.setTargetAtTime(freq, time, smoothing);
        
        // Update the wet/dry mix
        this.nodes.wetGain.gain.setTargetAtTime(mix, time, smoothing);
        this.nodes.dryGain.gain.setTargetAtTime(1.0 - mix, time, smoothing);
    }
}

// --- This line is crucial for the main app to load the module ---
window.registerSynthModule(RingModulatorModule);