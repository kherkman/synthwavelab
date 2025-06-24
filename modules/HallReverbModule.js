/**
 * Example Synth Module: A Hall Reverb.
 *
 * This module creates a synthetic hall reverb effect using an algorithmic
 * approach based on the classic Freeverb algorithm. It uses a parallel bank
 * of comb filters to create echoes and a serial chain of all-pass filters
 * to diffuse them into a smooth reverb tail.
 *
 * This module demonstrates:
 * - A complex audio graph implementing a well-known DSP algorithm.
 * - Combining parallel and serial filter networks.
 * - Creating a high-quality, spacious reverb without using a ConvolverNode.
 */
class HallReverbModule {
    constructor(audioContext) {
        this.audioContext = audioContext;
        this.id = 'hallReverbModule';
        this.name = 'Hall Reverb';

        // --- Freeverb Algorithm Parameters ---
        this.numCombFilters = 8;
        this.numAllPassFilters = 4;
        this.combFilterTunings = [1557, 1617, 1491, 1422, 1277, 1356, 1188, 1116].map(v => v / 44100);
        this.allPassFilterTunings = [225, 556, 441, 341].map(v => v / 44100);

        // --- Create Audio Nodes ---
        this.nodes = {
            input: this.audioContext.createGain(),
            output: this.audioContext.createGain(),
            dryGain: this.audioContext.createGain(),
            wetGain: this.audioContext.createGain(),
            // --- Reverb Component Nodes ---
            combFilters: [],
            allPassFilters: [],
        };
        
        // --- Create the parallel Comb Filter bank ---
        for (let i = 0; i < this.numCombFilters; i++) {
            const comb = {
                delay: this.audioContext.createDelay(1.0),
                feedback: this.audioContext.createGain(),
                filter: this.audioContext.createBiquadFilter(), // Damping filter
            };
            comb.filter.type = 'lowpass';
            
            // Connect the feedback loop for this comb filter: delay -> filter -> feedback -> delay
            comb.delay.connect(comb.filter);
            comb.filter.connect(comb.feedback);
            comb.feedback.connect(comb.delay);
            
            // The main input feeds into this comb filter's delay line
            this.nodes.input.connect(comb.delay);
            // The output of the comb filter is sent to the wet gain node
            comb.delay.connect(this.nodes.wetGain);
            
            this.nodes.combFilters.push(comb);
        }

        // --- Create the serial All-Pass Filter chain ---
        for (let i = 0; i < this.numAllPassFilters; i++) {
            const allPass = this.audioContext.createBiquadFilter();
            allPass.type = 'allpass';
            allPass.frequency.value = this.allPassFilterTunings[i] * this.audioContext.sampleRate;
            
            // The wet signal from the comb filters is routed through the all-pass chain
            if (i === 0) {
                this.nodes.wetGain.connect(allPass);
            } else {
                this.nodes.allPassFilters[i - 1].connect(allPass);
            }
            this.nodes.allPassFilters.push(allPass);
        }

        // --- Connect Wet/Dry and Final Output ---
        this.nodes.input.connect(this.nodes.dryGain);
        this.nodes.dryGain.connect(this.nodes.output);
        
        // The output of the final all-pass filter is the final wet signal
        const lastAllPass = this.nodes.allPassFilters[this.numAllPassFilters - 1];
        lastAllPass.connect(this.nodes.output);
        // We need to re-route the wetGain to only be a merger for the comb filters.
        const wetSignalMerger = this.nodes.wetGain;
        this.nodes.wetGain = this.audioContext.createGain(); // This will be our final wetness control
        lastAllPass.connect(this.nodes.wetGain);
        this.nodes.wetGain.connect(this.nodes.output);
    }

    getHTML() {
        return `
            <div class="control-row">
                <label for="hallSize">Room Size:</label>
                <input type="range" id="hallSize" min="0.1" max="1.0" value="0.8" step="0.01">
                <span id="hallSizeVal" class="value-display">0.80</span>
            </div>
            <div class="control-row">
                <label for="hallDecay">Decay (s):</label>
                <input type="range" id="hallDecay" min="0.1" max="0.98" value="0.7" step="0.01">
                <span id="hallDecayVal" class="value-display">0.70</span>
            </div>
            <div class="control-row">
                <label for="hallDamping">Damping (LPF):</label>
                <input type="range" id="hallDamping" min="500" max="15000" value="6000" step="100">
                <span id="hallDampingVal" class="value-display">6000</span>
            </div>
            <div class="control-row">
                <label for="hallMix">Mix (Wet):</label>
                <input type="range" id="hallMix" min="0" max="1" value="0.4" step="0.01">
                <span id="hallMixVal" class="value-display">0.40</span>
            </div>
        `;
    }

    initUI(container) {
        this.size = { slider: container.querySelector('#hallSize'), val: container.querySelector('#hallSizeVal') };
        this.decay = { slider: container.querySelector('#hallDecay'), val: container.querySelector('#hallDecayVal') };
        this.damping = { slider: container.querySelector('#hallDamping'), val: container.querySelector('#hallDampingVal') };
        this.mix = { slider: container.querySelector('#hallMix'), val: container.querySelector('#hallMixVal') };

        const connect = (ctrl, decimals = 2) => {
            ctrl.slider.addEventListener('input', () => {
                ctrl.val.textContent = parseFloat(ctrl.slider.value).toFixed(decimals);
                this.updateParams();
            });
        };
        
        connect(this.size);
        connect(this.decay);
        connect(this.damping, 0);
        connect(this.mix);

        this.updateParams();
    }

    updateParams() {
        if (this.nodes.combFilters.length === 0) return;
        
        const time = this.audioContext.currentTime;
        const smoothing = 0.03;

        const size = parseFloat(this.size.slider.value);
        const decay = parseFloat(this.decay.slider.value);
        const damping = parseFloat(this.damping.slider.value);
        const mix = parseFloat(this.mix.slider.value);
        
        // --- Update Comb Filters ---
        // Room size affects the delay time of each comb filter.
        // Decay affects the feedback amount.
        // Damping affects the cutoff of the filter in the feedback loop.
        this.nodes.combFilters.forEach((comb, i) => {
            const delayTime = this.combFilterTunings[i] * size;
            comb.delay.delayTime.setTargetAtTime(delayTime, time, smoothing);
            comb.feedback.gain.setTargetAtTime(decay, time, smoothing);
            comb.filter.frequency.setTargetAtTime(damping, time, smoothing);
        });
        
        // --- Update Final Mix ---
        this.nodes.wetGain.gain.setTargetAtTime(mix, time, smoothing);
        this.nodes.dryGain.gain.setTargetAtTime(1.0 - mix, time, smoothing);
    }
}

// --- This line is crucial for the main app to load the module ---
window.registerSynthModule(HallReverbModule);