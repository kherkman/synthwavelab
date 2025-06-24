/**
 * Example Synth Module: A Spring Reverb.
 *
 * This module simulates the sound of a vintage electro-mechanical spring
 * reverb unit. It uses a network of short, filtered, and interacting
 * delay lines to create the characteristic bright, "boingy," and
 * metallic sound of real springs.
 *
 * This module demonstrates:
 * - Simulating the sound of a specific physical object.
 * - Using multiple, nested feedback paths with filtering to create character.
 * - Implementing a classic vintage effect with a unique timbral quality.
 */
class SpringReverbModule {
    constructor(audioContext) {
        this.audioContext = audioContext;
        this.id = 'springReverbModule';
        this.name = 'Spring Reverb';

        // We'll simulate the spring with three delay lines in series
        this.numSprings = 3;

        // --- Create Audio Nodes ---
        this.nodes = {
            input: this.audioContext.createGain(),
            output: this.audioContext.createGain(),
            dryGain: this.audioContext.createGain(),
            wetGain: this.audioContext.createGain(),
            // A high-pass filter before the springs to make it "splashy"
            preFilter: this.audioContext.createBiquadFilter(),
            // A merger to collect the output from all springs
            merger: this.audioContext.createGain(),
            // The delay lines that form the core of the spring simulation
            springs: [],
        };

        // --- Configure Pre-Filter ---
        this.nodes.preFilter.type = 'highpass';
        this.nodes.preFilter.frequency.value = 300;

        // --- Create and connect the spring stages ---
        for (let i = 0; i < this.numSprings; i++) {
            const spring = {
                // Each stage is an all-pass filter to create phase diffusion
                allPass: this.audioContext.createBiquadFilter(),
                // And a feedback delay with its own tone control
                delay: this.audioContext.createDelay(0.1),
                feedback: this.audioContext.createGain(),
                tone: this.audioContext.createBiquadFilter(),
            };
            spring.allPass.type = 'allpass';
            spring.tone.type = 'highshelf'; // Boost highs in the feedback for "brightness"

            // Connect the feedback loop for this spring stage
            spring.delay.connect(spring.tone);
            spring.tone.connect(spring.feedback);
            spring.feedback.connect(spring.delay);
            
            // Connect this stage in series with the previous one
            if (i === 0) {
                this.nodes.preFilter.connect(spring.allPass);
            } else {
                this.nodes.springs[i - 1].delay.connect(spring.allPass);
            }
            spring.allPass.connect(spring.delay);
            
            // Tap the output of each stage and send it to the final merger
            spring.delay.connect(this.nodes.merger);
            
            this.nodes.springs.push(spring);
        }

        // --- Connect the main audio graph ---
        this.nodes.input.connect(this.nodes.preFilter);
        this.nodes.input.connect(this.nodes.dryGain);
        this.nodes.dryGain.connect(this.nodes.output);
        
        this.nodes.merger.connect(this.nodes.wetGain);
        this.nodes.wetGain.connect(this.nodes.output);
    }

    getHTML() {
        return `
            <div class="control-row">
                <label for="springDrip">Drip (Tone):</label>
                <input type="range" id="springDrip" min="0" max="24" value="12" step="1">
                <span id="springDripVal" class="value-display">12</span>
            </div>
            <div class="control-row">
                <label for="springDecay">Decay:</label>
                <input type="range" id="springDecay" min="0" max="0.9" value="0.7" step="0.01">
                <span id="springDecayVal" class="value-display">0.70</span>
            </div>
            <div class="control-row">
                <label for="springMix">Mix (Wet):</label>
                <input type="range" id="springMix" min="0" max="1" value="0.6" step="0.01">
                <span id="springMixVal" class="value-display">0.60</span>
            </div>
        `;
    }

    initUI(container) {
        this.drip = { slider: container.querySelector('#springDrip'), val: container.querySelector('#springDripVal') };
        this.decay = { slider: container.querySelector('#springDecay'), val: container.querySelector('#springDecayVal') };
        this.mix = { slider: container.querySelector('#springMix'), val: container.querySelector('#springMixVal') };

        const connect = (ctrl, decimals = 0) => {
            ctrl.slider.addEventListener('input', () => {
                ctrl.val.textContent = parseFloat(ctrl.slider.value).toFixed(decimals);
                this.updateParams();
            });
        };
        
        connect(this.drip, 0);
        connect(this.decay, 2);
        connect(this.mix, 2);

        this.updateParams();
    }

    updateParams() {
        if (this.nodes.springs.length === 0) return;

        const time = this.audioContext.currentTime;
        const smoothing = 0.03;
        
        const drip = parseFloat(this.drip.slider.value);
        const decay = parseFloat(this.decay.slider.value);
        const mix = parseFloat(this.mix.slider.value);

        // Base delay times for the "springs" - these are very short and staggered
        const delayTimes = [0.011, 0.017, 0.023];

        this.nodes.springs.forEach((spring, i) => {
            spring.delay.delayTime.setTargetAtTime(delayTimes[i], time, smoothing);
            spring.feedback.gain.setTargetAtTime(decay, time, smoothing);
            
            // The "drip" is controlled by the gain of the high-shelf filter
            spring.tone.frequency.value = 3000; // Affects frequencies above 3kHz
            spring.tone.gain.setTargetAtTime(drip, time, smoothing);
            
            // Stagger the all-pass filter frequencies for more diffusion
            spring.allPass.frequency.value = 300 + (i * 150);
        });

        this.nodes.wetGain.gain.setTargetAtTime(mix, time, smoothing);
        this.nodes.dryGain.gain.setTargetAtTime(1.0 - mix, time, smoothing);
    }
}

// --- This line is crucial for the main app to load the module ---
window.registerSynthModule(SpringReverbModule);