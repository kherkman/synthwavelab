/**
 * Example Synth Module: A Stereo Phaser.
 *
 * This module creates the classic "phaser" sweep effect by cascading a
 * series of all-pass filters and modulating their center frequency with an LFO.
 *
 * This module demonstrates:
 * - Chaining multiple BiquadFilterNodes to create a phase-shifting network.
 * - Implementing a feedback path to create the characteristic resonant sound.
 * - Using a single LFO to modulate multiple AudioParams simultaneously.
 */
class PhaserModule {
    constructor(audioContext) {
        this.audioContext = audioContext;
        this.id = 'phaserModule';    // A unique ID
        this.name = 'Phaser';        // The display name
        this.numStages = 6;          // Number of all-pass filter stages
        this.allPassFilters = [];

        // --- Create Audio Nodes ---
        this.nodes = {
            input: this.audioContext.createGain(),
            output: this.audioContext.createGain(),
            dryGain: this.audioContext.createGain(),
            wetGain: this.audioContext.createGain(),
            feedbackGain: this.audioContext.createGain(),
            // --- LFO / Modulation Path ---
            lfo: this.audioContext.createOscillator(),
            lfoDepth: this.audioContext.createGain(),
        };

        // --- Configure the LFO ---
        this.nodes.lfo.type = 'triangle'; // Triangle or sine waves are common for phasers
        this.nodes.lfo.start();

        // --- Create and Chain the All-Pass Filter Stages ---
        for (let i = 0; i < this.numStages; i++) {
            const filter = this.audioContext.createBiquadFilter();
            filter.type = 'allpass';
            this.allPassFilters.push(filter);

            // Connect this filter to the previous node in the chain
            if (i === 0) {
                this.nodes.input.connect(filter);
            } else {
                this.allPassFilters[i - 1].connect(filter);
            }
            
            // The LFO will control the frequency of *all* filters at once
            this.nodes.lfoDepth.connect(filter.frequency);
        }
        const lastFilter = this.allPassFilters[this.numStages - 1];
        
        // --- Connect the Audio Graph ---

        // 1. Wet/Dry Mix
        this.nodes.input.connect(this.nodes.dryGain);
        this.nodes.dryGain.connect(this.nodes.output);
        
        lastFilter.connect(this.nodes.wetGain);
        this.nodes.wetGain.connect(this.nodes.output);

        // 2. Feedback Path
        // The output of the final filter stage is fed back to the input of the first.
        lastFilter.connect(this.nodes.feedbackGain);
        this.nodes.feedbackGain.connect(this.allPassFilters[0]);
    }

    /**
     * Returns the HTML string for the module's controls.
     */
    getHTML() {
        return `
            <div class="control-row">
                <label for="phaserRate">Rate (Hz):</label>
                <input type="range" id="phaserRate" min="0.05" max="5" value="0.5" step="0.05">
                <span id="phaserRateVal" class="value-display">0.50</span>
            </div>
            <div class="control-row">
                <label for="phaserDepth">Depth (Hz):</label>
                <input type="range" id="phaserDepth" min="100" max="1500" value="700" step="50">
                <span id="phaserDepthVal" class="value-display">700</span>
            </div>
            <div class="control-row">
                <label for="phaserBaseFreq">Base Freq (Hz):</label>
                <input type="range" id="phaserBaseFreq" min="200" max="2000" value="800" step="50">
                <span id="phaserBaseFreqVal" class="value-display">800</span>
            </div>
             <div class="control-row">
                <label for="phaserQ">Resonance (Q):</label>
                <input type="range" id="phaserQ" min="1" max="25" value="10" step="0.5">
                <span id="phaserQVal" class="value-display">10.0</span>
            </div>
            <div class="control-row">
                <label for="phaserFeedback">Feedback:</label>
                <input type="range" id="phaserFeedback" min="0" max="0.9" value="0.5" step="0.01">
                <span id="phaserFeedbackVal" class="value-display">0.50</span>
            </div>
            <div class="control-row">
                <label for="phaserMix">Mix (Wet):</label>
                <input type="range" id="phaserMix" min="0" max="1" value="0.5" step="0.01">
                <span id="phaserMixVal" class="value-display">0.50</span>
            </div>
        `;
    }

    /**
     * Finds the UI elements and attaches event listeners.
     */
    initUI(container) {
        this.rate = { slider: container.querySelector('#phaserRate'), val: container.querySelector('#phaserRateVal') };
        this.depth = { slider: container.querySelector('#phaserDepth'), val: container.querySelector('#phaserDepthVal') };
        this.baseFreq = { slider: container.querySelector('#phaserBaseFreq'), val: container.querySelector('#phaserBaseFreqVal') };
        this.q = { slider: container.querySelector('#phaserQ'), val: container.querySelector('#phaserQVal') };
        this.feedback = { slider: container.querySelector('#phaserFeedback'), val: container.querySelector('#phaserFeedbackVal') };
        this.mix = { slider: container.querySelector('#phaserMix'), val: container.querySelector('#phaserMixVal') };
        
        const connect = (ctrl, decimals = 2) => {
            ctrl.slider.addEventListener('input', () => {
                ctrl.val.textContent = parseFloat(ctrl.slider.value).toFixed(decimals);
                this.updateParams();
            });
        };
        
        connect(this.rate);
        connect(this.depth, 0);
        connect(this.baseFreq, 0);
        connect(this.q, 1);
        connect(this.feedback);
        connect(this.mix);

        this.updateParams();
    }

    /**
     * Reads values from the controls and updates the audio node parameters.
     */
    updateParams() {
        if (this.allPassFilters.length === 0) return;
        
        const time = this.audioContext.currentTime;
        const smoothing = 0.02;

        const rateHz = parseFloat(this.rate.slider.value);
        const depth = parseFloat(this.depth.slider.value);
        const baseFreq = parseFloat(this.baseFreq.slider.value);
        const q = parseFloat(this.q.slider.value);
        const feedback = parseFloat(this.feedback.slider.value);
        const mix = parseFloat(this.mix.slider.value);
        
        // --- Update LFO ---
        this.nodes.lfo.frequency.setTargetAtTime(rateHz, time, smoothing);
        this.nodes.lfoDepth.gain.setTargetAtTime(depth, time, smoothing);
        
        // --- Update Filters ---
        // Set the base frequency and Q for all filter stages.
        // The LFO then modulates the frequency around this base value.
        this.allPassFilters.forEach(filter => {
            filter.frequency.value = baseFreq; // Set base immediately
            filter.Q.setTargetAtTime(q, time, smoothing);
        });

        // --- Update Feedback and Mix ---
        this.nodes.feedbackGain.gain.setTargetAtTime(feedback, time, smoothing);
        this.nodes.wetGain.gain.setTargetAtTime(mix, time, smoothing);
        this.nodes.dryGain.gain.setTargetAtTime(1.0 - mix, time, smoothing);
    }
}

// --- This line is crucial for the main app to load the module ---
window.registerSynthModule(PhaserModule);