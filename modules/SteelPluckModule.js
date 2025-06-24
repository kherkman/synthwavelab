/**
 * Example Synth Module: A Karplus-Strong Plucked String Synthesizer.
 *
 * This module generates the sound of a plucked string using the Karplus-Strong
 * algorithm. It works by feeding a short burst of noise into a filtered
 * delay loop with high feedback, which simulates a vibrating string.
 *
 * This module demonstrates:
 * - A complete synthesis voice built from basic components.
 * - A classic and highly efficient physical modeling algorithm.
 * - Generating sound from an impulse (a burst of noise) rather than a continuous oscillator.
 */
class SteelPluckModule {
    constructor(audioContext) {
        this.audioContext = audioContext;
        this.id = 'steelPluckModule';
        this.name = 'Steel String';

        // --- Create Audio Nodes ---
        this.nodes = {
            // Input is not used, but required by the host interface
            input: this.audioContext.createGain(),
            output: this.audioContext.createGain(),
            
            // The core of the Karplus-Strong algorithm
            delay: this.audioContext.createDelay(1.0), // Max delay for low notes
            feedback: this.audioContext.createGain(),
            filter: this.audioContext.createBiquadFilter(), // The damping filter
        };
        
        // --- Configure the nodes ---
        this.nodes.filter.type = 'lowpass';
        
        // --- Connect the Feedback Loop ---
        // This is the heart of the algorithm: the output of the delay is filtered,
        // scaled by the feedback amount, and then fed back into the delay's input.
        this.nodes.delay.connect(this.nodes.filter);
        this.nodes.filter.connect(this.nodes.feedback);
        this.nodes.feedback.connect(this.nodes.delay);
        
        // The output of the loop is sent to the module's main output
        this.nodes.feedback.connect(this.nodes.output);
    }

    /**
     * Triggers the "pluck" by injecting a short burst of noise.
     * @private
     */
    _pluck() {
        const now = this.audioContext.currentTime;

        // Create a very short burst of white noise to "excite" the delay loop.
        const noiseBurst = this.audioContext.createBufferSource();
        const bufferSize = this.audioContext.sampleRate * 0.05; // 50ms of noise
        const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        noiseBurst.buffer = buffer;
        
        // A simple gain envelope for the noise burst
        const pluckEnv = this.audioContext.createGain();
        pluckEnv.gain.setValueAtTime(1.0, now);
        pluckEnv.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

        // Connect the noise burst to the delay line and start it.
        noiseBurst.connect(pluckEnv);
        pluckEnv.connect(this.nodes.delay);
        noiseBurst.start(now);
        
        // The noise is very short, so we can stop and disconnect it quickly.
        noiseBurst.stop(now + 0.1);
        setTimeout(() => {
            noiseBurst.disconnect();
            pluckEnv.disconnect();
        }, 150);
    }

    getHTML() {
        return `
            <div class="control-row" style="margin-bottom:15px;">
                <button id="stringPluckBtn" style="width: 100%; height: 50px; font-size: 1.2em; color: var(--color-neon-pink); border-color: var(--color-neon-pink);">Pluck String</button>
            </div>
            <div class="control-row">
                <label for="stringPitch">Pitch (Hz):</label>
                <input type="range" id="stringPitch" min="50" max="2000" value="220" step="1">
                <span id="stringPitchVal" class="value-display">220</span>
            </div>
            <div class="control-row">
                <label for="stringDecay">Decay:</label>
                <input type="range" id="stringDecay" min="0.8" max="0.999" value="0.98" step="0.001">
                <span id="stringDecayVal" class="value-display">0.980</span>
            </div>
            <div class="control-row">
                <label for="stringDamping">Damping (Tone):</label>
                <input type="range" id="stringDamping" min="500" max="15000" value="5000" step="100">
                <span id="stringDampingVal" class="value-display">5000</span>
            </div>
        `;
    }

    initUI(container) {
        this.pluckButton = container.querySelector('#stringPluckBtn');
        this.pitch = { slider: container.querySelector('#stringPitch'), val: container.querySelector('#stringPitchVal') };
        this.decay = { slider: container.querySelector('#stringDecay'), val: container.querySelector('#stringDecayVal') };
        this.damping = { slider: container.querySelector('#stringDamping'), val: container.querySelector('#stringDampingVal') };

        // The "Pluck" button triggers the sound synthesis.
        this.pluckButton.addEventListener('click', () => this._pluck());

        const connect = (ctrl, decimals = 0) => {
            ctrl.slider.addEventListener('input', () => {
                ctrl.val.textContent = parseFloat(ctrl.slider.value).toFixed(decimals);
                this.updateParams();
            });
        };

        connect(this.pitch, 0);
        connect(this.decay, 3);
        connect(this.damping, 0);

        this.updateParams();
    }

    updateParams() {
        if (!this.nodes.delay) return;

        const time = this.audioContext.currentTime;
        const smoothing = 0.01;
        
        const pitchHz = parseFloat(this.pitch.slider.value);
        const decay = parseFloat(this.decay.slider.value);
        const damping = parseFloat(this.damping.slider.value);
        
        // --- The core of Karplus-Strong ---
        // The delay time determines the fundamental frequency of the string.
        // It's the inverse of the desired frequency.
        const delayTime = 1.0 / pitchHz;
        this.nodes.delay.delayTime.setTargetAtTime(delayTime, time, smoothing);

        // The feedback amount determines how long the string rings out (sustain).
        this.nodes.feedback.gain.setTargetAtTime(decay, time, smoothing);
        
        // The low-pass filter's cutoff determines the brightness/damping of the string.
        // Higher frequencies decay faster, just like a real string.
        this.nodes.filter.frequency.setTargetAtTime(damping, time, smoothing);
    }
}

// --- This line is crucial for the main app to load the module ---
window.registerSynthModule(SteelPluckModule);