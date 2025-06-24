/**
 * Example Synth Module: A Plate Reverb.
 *
 * This module simulates the sound of a vintage electro-mechanical plate
 * reverb. It uses a dense network of all-pass and delay filters to
 * create the bright, smooth, and diffuse sound characteristic of a
 * vibrating metal plate.
 *
 * This module demonstrates:
 * - Simulating a specific studio hardware effect with a unique character.
 * - A hybrid parallel/serial filter network for creating a dense reverb tail.
 * - A classic and versatile reverb algorithm.
 */
class PlateReverbModule {
    constructor(audioContext) {
        this.audioContext = audioContext;
        this.id = 'plateReverbModule';
        this.name = 'Plate Reverb';

        // --- Create Audio Nodes ---
        this.nodes = {
            input: this.audioContext.createGain(),
            output: this.audioContext.createGain(),
            dryGain: this.audioContext.createGain(),
            wetGain: this.audioContext.createGain(),
            
            // --- Reverb Algorithm Components ---
            // Input diffusion: A series of all-pass filters to smear the initial signal
            inputDiffusion1: this.audioContext.createBiquadFilter(),
            inputDiffusion2: this.audioContext.createBiquadFilter(),

            // The main reverb tank: two parallel delay lines with feedback
            leftDelay: this.audioContext.createDelay(0.1),
            rightDelay: this.audioContext.createDelay(0.1),
            
            // Feedback path with damping filters
            leftFeedback: this.audioContext.createGain(),
            rightFeedback: this.audioContext.createGain(),
            leftDamping: this.audioContext.createBiquadFilter(),
            rightDamping: this.audioContext.createBiquadFilter(),

            // A merger to combine the two delay line outputs
            merger: this.audioContext.createGain(),
        };

        // --- Configure Nodes ---
        this.nodes.inputDiffusion1.type = 'allpass';
        this.nodes.inputDiffusion1.frequency.value = 740;
        this.nodes.inputDiffusion2.type = 'allpass';
        this.nodes.inputDiffusion2.frequency.value = 1100;

        this.nodes.leftDamping.type = 'lowpass';
        this.nodes.rightDamping.type = 'lowpass';
        
        // Stagger the delay times slightly for a richer stereo image
        this.nodes.leftDelay.delayTime.value = 0.067;
        this.nodes.rightDelay.delayTime.value = 0.089;
        
        // --- Connect the Audio Graph ---
        // 1. Dry path
        this.nodes.input.connect(this.nodes.dryGain);
        this.nodes.dryGain.connect(this.nodes.output);
        
        // 2. Wet path starts with input diffusion
        this.nodes.input.connect(this.nodes.inputDiffusion1);
        this.nodes.inputDiffusion1.connect(this.nodes.inputDiffusion2);
        
        // The diffused signal feeds both delay lines
        this.nodes.inputDiffusion2.connect(this.nodes.leftDelay);
        this.nodes.inputDiffusion2.connect(this.nodes.rightDelay);

        // 3. Connect the feedback loops (criss-cross for stereo interaction)
        // Left channel feedback loop
        this.nodes.leftDelay.connect(this.nodes.leftDamping);
        this.nodes.leftDamping.connect(this.nodes.leftFeedback);
        this.nodes.leftFeedback.connect(this.nodes.rightDelay); // Left feeds into Right

        // Right channel feedback loop
        this.nodes.rightDelay.connect(this.nodes.rightDamping);
        this.nodes.rightDamping.connect(this.nodes.rightFeedback);
        this.nodes.rightFeedback.connect(this.nodes.leftDelay); // Right feeds into Left

        // 4. Combine the outputs of the delay lines
        this.nodes.leftDelay.connect(this.nodes.merger);
        this.nodes.rightDelay.connect(this.nodes.merger);
        
        // 5. Final wet signal path
        this.nodes.merger.connect(this.nodes.wetGain);
        this.nodes.wetGain.connect(this.nodes.output);
    }

    getHTML() {
        return `
            <div class="control-row">
                <label for="plateDecay">Decay:</label>
                <input type="range" id="plateDecay" min="0.3" max="0.95" value="0.7" step="0.01">
                <span id="plateDecayVal" class="value-display">0.70</span>
            </div>
            <div class="control-row">
                <label for="plateDamping">Damping (LPF):</label>
                <input type="range" id="plateDamping" min="1000" max="18000" value="8000" step="100">
                <span id="plateDampingVal" class="value-display">8000</span>
            </div>
            <div class="control-row">
                <label for="plateMix">Mix (Wet):</label>
                <input type="range" id="plateMix" min="0" max="1" value="0.5" step="0.01">
                <span id="plateMixVal" class="value-display">0.50</span>
            </div>
        `;
    }

    initUI(container) {
        this.decay = { slider: container.querySelector('#plateDecay'), val: container.querySelector('#plateDecayVal') };
        this.damping = { slider: container.querySelector('#plateDamping'), val: container.querySelector('#plateDampingVal') };
        this.mix = { slider: container.querySelector('#plateMix'), val: container.querySelector('#plateMixVal') };

        const connect = (ctrl, decimals = 2) => {
            ctrl.slider.addEventListener('input', () => {
                ctrl.val.textContent = parseFloat(ctrl.slider.value).toFixed(decimals);
                this.updateParams();
            });
        };

        connect(this.decay, 2);
        connect(this.damping, 0);
        connect(this.mix, 2);

        this.updateParams();
    }

    updateParams() {
        if (!this.nodes.input) return;

        const time = this.audioContext.currentTime;
        const smoothing = 0.025;
        
        const decay = parseFloat(this.decay.slider.value);
        const damping = parseFloat(this.damping.slider.value);
        const mix = parseFloat(this.mix.slider.value);

        // Decay controls the feedback gain for both loops
        this.nodes.leftFeedback.gain.setTargetAtTime(decay, time, smoothing);
        this.nodes.rightFeedback.gain.setTargetAtTime(decay, time, smoothing);

        // Damping controls the cutoff frequency of the low-pass filters in the feedback loops
        this.nodes.leftDamping.frequency.setTargetAtTime(damping, time, smoothing);
        this.nodes.rightDamping.frequency.setTargetAtTime(damping, time, smoothing);
        
        // Update the final wet/dry mix
        this.nodes.wetGain.gain.setTargetAtTime(mix, time, smoothing);
        this.nodes.dryGain.gain.setTargetAtTime(1.0 - mix, time, smoothing);
    }
}

// --- This line is crucial for the main app to load the module ---
window.registerSynthModule(PlateReverbModule);