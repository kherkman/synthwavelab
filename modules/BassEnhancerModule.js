/**
 * Example Synth Module: A Psychoacoustic Bass Enhancer.
 *
 * This module enhances the perceived low-end of a signal by generating
 * harmonics from the bass frequencies and mixing them back in with the
 * original sound. This makes the bass feel fuller and more audible, even
 * on small speakers.
 *
 * This module demonstrates:
 * - A parallel processing chain for harmonic generation.
 * - Using filtering and saturation for targeted frequency enhancement.
 * - A practical and widely used psychoacoustic mixing technique.
 */
class BassEnhancerModule {
    constructor(audioContext) {
        this.audioContext = audioContext;
        this.id = 'bassEnhancerModule';
        this.name = 'Bass Enhancer';

        // --- Create Audio Nodes ---
        this.nodes = {
            input: this.audioContext.createGain(),
            output: this.audioContext.createGain(),
            
            // The dry signal passes straight through
            dryGain: this.audioContext.createGain(),
            
            // --- Parallel Processing Path for Harmonics ---
            // A filter to isolate the low frequencies
            lowPassFilter: this.audioContext.createBiquadFilter(),
            // A waveshaper to generate harmonics from the isolated bass
            saturator: this.audioContext.createWaveShaper(),
            // A filter to control which harmonics are added back in
            highPassFilter: this.audioContext.createBiquadFilter(),
            // The final gain control for the generated harmonics (the "wet" signal)
            wetGain: this.audioContext.createGain(),
        };

        // --- Configure Nodes ---
        this.nodes.lowPassFilter.type = 'lowpass';
        this.nodes.lowPassFilter.frequency.value = 200; // Isolate frequencies below 200Hz

        this.nodes.highPassFilter.type = 'highpass';
        this.nodes.highPassFilter.frequency.value = 200; // Only add back harmonics *above* the fundamental

        // --- Connect the Audio Graph ---
        
        // 1. Dry Path
        this.nodes.input.connect(this.nodes.dryGain);
        this.nodes.dryGain.connect(this.nodes.output);
        
        // 2. Wet (Harmonics) Path
        // input -> LPF -> Saturator -> HPF -> wetGain -> output
        this.nodes.input.connect(this.nodes.lowPassFilter);
        this.nodes.lowPassFilter.connect(this.nodes.saturator);
        this.nodes.saturator.connect(this.nodes.highPassFilter);
        this.nodes.highPassFilter.connect(this.nodes.wetGain);
        this.nodes.wetGain.connect(this.nodes.output);
    }
    
    /**
     * Creates a distortion curve for the saturator node.
     * @private
     */
    _createSaturationCurve(amount) {
        const k = amount * 5; // Scale for a more useful range
        const n_samples = 44100;
        const curve = new Float32Array(n_samples);
        for (let i = 0; i < n_samples; ++i) {
            const x = i * 2 / n_samples - 1;
            // A curve that emphasizes odd harmonics
            curve[i] = x - (x * x * x / 3) * (k / 5 + 0.5);
        }
        return curve;
    }

    getHTML() {
        return `
            <div class="control-row">
                <label for="bassHarmonics">Harmonics:</label>
                <input type="range" id="bassHarmonics" min="0" max="1" value="0.5" step="0.01">
                <span id="bassHarmonicsVal" class="value-display">0.50</span>
            </div>
            <div class="control-row">
                <label for="bassCrossover">Crossover (Hz):</label>
                <input type="range" id="bassCrossover" min="80" max="400" value="200" step="10">
                <span id="bassCrossoverVal" class="value-display">200</span>
            </div>
            <div class="control-row">
                <label for="bassMix">Mix:</label>
                <input type="range" id="bassMix" min="0" max="1.5" value="0.8" step="0.01">
                <span id="bassMixVal" class="value-display">0.80</span>
            </div>
        `;
    }

    initUI(container) {
        this.harmonics = { slider: container.querySelector('#bassHarmonics'), val: container.querySelector('#bassHarmonicsVal') };
        this.crossover = { slider: container.querySelector('#bassCrossover'), val: container.querySelector('#bassCrossoverVal') };
        this.mix = { slider: container.querySelector('#bassMix'), val: container.querySelector('#bassMixVal') };

        const connect = (ctrl, decimals = 2) => {
            ctrl.slider.addEventListener('input', () => {
                ctrl.val.textContent = parseFloat(ctrl.slider.value).toFixed(decimals);
                this.updateParams();
            });
        };
        
        connect(this.harmonics, 2);
        connect(this.crossover, 0);
        connect(this.mix, 2);

        this.updateParams();
    }

    updateParams() {
        if (!this.nodes.input) return;

        const time = this.audioContext.currentTime;
        const smoothing = 0.02;
        
        const harmonics = parseFloat(this.harmonics.slider.value);
        const crossover = parseFloat(this.crossover.slider.value);
        const mix = parseFloat(this.mix.slider.value);
        
        // Update the crossover frequency for both filters
        this.nodes.lowPassFilter.frequency.setTargetAtTime(crossover, time, smoothing);
        this.nodes.highPassFilter.frequency.setTargetAtTime(crossover, time, smoothing);
        
        // Update the saturation curve
        this.nodes.saturator.curve = this._createSaturationCurve(harmonics);
        
        // Update the mix level of the generated harmonics
        this.nodes.wetGain.gain.setTargetAtTime(mix, time, smoothing);
    }
}

// --- This line is crucial for the main app to load the module ---
window.registerSynthModule(BassEnhancerModule);