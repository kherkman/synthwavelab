/**
 * Example Synth Module: A "Transformers" Transformation Sound FX Generator.
 *
 * This module procedurally generates a complex, multi-layered sound effect
 * that emulates the classic G1 Transformers transformation sound, combining
 * grinding metal, servo whines, and ratcheting clicks.
 *
 * This module demonstrates:
 * - A complex, multi-layered procedural sound design.
 * - Precise scheduling of multiple envelopes and events to create a sonic narrative.
 * - Synthesizing mechanical and robotic sound effects from scratch.
 */
class TransformerFxModule {
    constructor(audioContext) {
        this.audioContext = audioContext;
        this.id = 'transformerFxModule';
        this.name = 'Transformation FX';

        this.nodes = {
            input: this.audioContext.createGain(), // Unused
            output: this.audioContext.createGain(),
        };
    }

    /**
     * Triggers the full transformation sound sequence.
     * @private
     */
    _trigger() {
        const now = this.audioContext.currentTime;
        const duration = parseFloat(this.duration.slider.value);
        const pitchMod = parseFloat(this.pitch.slider.value); // 0.5 to 1.5
        const masterGain = this.nodes.output;
        
        // --- Layer 1: The "Grinding" Base ---
        const grindOsc = this.audioContext.createOscillator();
        grindOsc.type = 'sawtooth';
        grindOsc.frequency.value = 80 * pitchMod;
        const grindFilter = this.audioContext.createBiquadFilter();
        grindFilter.type = 'bandpass';
        grindFilter.Q.value = 5;
        grindFilter.frequency.setValueAtTime(100, now);
        grindFilter.frequency.exponentialRampToValueAtTime(1200, now + duration);
        const grindVCA = this.audioContext.createGain();
        grindVCA.gain.setValueAtTime(0.3, now);
        grindVCA.gain.exponentialRampToValueAtTime(0.01, now + duration);
        
        grindOsc.connect(grindFilter).connect(grindVCA).connect(masterGain);
        
        // --- Layer 2: The "Servo Whine" ---
        const createServo = (startTime, startFreq, endFreq) => {
            const servoOsc = this.audioContext.createOscillator();
            servoOsc.type = 'sine';
            servoOsc.frequency.setValueAtTime(startFreq * pitchMod, now + startTime);
            servoOsc.frequency.exponentialRampToValueAtTime(endFreq * pitchMod, now + startTime + (duration * 0.4));
            const servoVCA = this.audioContext.createGain();
            servoVCA.gain.setValueAtTime(0, now + startTime);
            servoVCA.gain.linearRampToValueAtTime(0.2, now + startTime + 0.02);
            servoVCA.gain.linearRampToValueAtTime(0, now + startTime + (duration * 0.45));
            servoOsc.connect(servoVCA).connect(masterGain);
            servoOsc.start(now + startTime);
            servoOsc.stop(now + duration + 0.1);
        };
        createServo(0, 2000, 400); // Downwards sweep
        createServo(duration * 0.5, 300, 2500); // Upwards sweep

        // --- Layer 3: The "Ratchet" Clicks ---
        const createRatchet = (startTime, numClicks, rate) => {
            const clickInterval = 1 / (rate * pitchMod);
            for (let i = 0; i < numClicks; i++) {
                const clickTime = now + startTime + (i * clickInterval);
                const noise = this.audioContext.createBufferSource();
                const buffer = this.audioContext.createBuffer(1, 441, this.audioContext.sampleRate);
                noise.buffer = buffer; // Empty buffer is fine for a click
                const vca = this.audioContext.createGain();
                vca.gain.setValueAtTime(1, clickTime);
                vca.gain.exponentialRampToValueAtTime(0.001, clickTime + 0.03);
                noise.connect(vca).connect(masterGain);
                noise.start(clickTime);
                noise.stop(clickTime + 0.04);
            }
        };
        // Accelerating ratchet sound
        createRatchet(duration * 0.2, 8, 10);
        createRatchet(duration * 0.6, 12, 25);

        // --- Layer 4: The Final "Clang" ---
        const clangTime = now + duration;
        const clangPartials = [1, 2.76, 4.1];
        clangPartials.forEach(ratio => {
            const osc = this.audioContext.createOscillator();
            const vca = this.audioContext.createGain();
            osc.type = 'square';
            osc.frequency.value = 150 * pitchMod * ratio;
            osc.detune.value = Math.random() * 20 - 10;
            vca.gain.setValueAtTime(0, clangTime);
            vca.gain.linearRampToValueAtTime(0.3 / clangPartials.length, clangTime + 0.01);
            vca.gain.exponentialRampToValueAtTime(0.001, clangTime + 1.5);
            osc.connect(vca).connect(masterGain);
            osc.start(clangTime);
            osc.stop(clangTime + 2);
        });

        // Start the continuous parts
        grindOsc.start(now);
        grindOsc.stop(now + duration);
    }
    
    getHTML() {
        return `
            <div class="control-row" style="margin-bottom:15px;">
                <button id="transformBtn" style="width: 100%; height: 60px; font-size: 1.5em; color: var(--color-neon-pink); border-color: var(--color-neon-pink);">Transform!</button>
            </div>
            <div class="control-row">
                <label for="transformDuration">Duration (s):</label>
                <input type="range" id="transformDuration" min="0.5" max="5.0" value="1.8" step="0.1">
                <span id="transformDurationVal" class="value-display">1.8</span>
            </div>
            <div class="control-row">
                <label for="transformPitch">Pitch:</label>
                <input type="range" id="transformPitch" min="0.5" max="1.5" value="1.0" step="0.01">
                <span id="transformPitchVal" class="value-display">1.00</span>
            </div>
        `;
    }

    initUI(container) {
        this.transformButton = container.querySelector('#transformBtn');
        this.duration = { slider: container.querySelector('#transformDuration'), val: container.querySelector('#transformDurationVal') };
        this.pitch = { slider: container.querySelector('#transformPitch'), val: container.querySelector('#transformPitchVal') };

        // The main button triggers the entire sound effect sequence.
        this.transformButton.addEventListener('click', () => this._trigger());
        
        this.duration.slider.addEventListener('input', () => {
            this.duration.val.textContent = parseFloat(this.duration.slider.value).toFixed(1);
        });
        this.pitch.slider.addEventListener('input', () => {
            this.pitch.val.textContent = parseFloat(this.pitch.slider.value).toFixed(2);
        });
    }

    updateParams() {
        // All parameters are read "live" when the effect is triggered.
    }
}

// --- This line is crucial for the main app to load the module ---
window.registerSynthModule(TransformerFxModule);