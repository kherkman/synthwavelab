/**
 * Example Synth Module: A Bird Chirp Synthesizer.
 *
 * This module is a self-contained instrument that generates a synthesized
 * bird call when triggered. It uses a high-frequency oscillator with fast
 * pitch and amplitude modulation to simulate a chirp.
 *
 * This module demonstrates:
 * - A synthesizer voice designed to mimic a natural sound.
 * - Using fast LFOs and envelopes for rapid, expressive modulation.
 * - A fun, interactive sound effect generator.
 */
class BirdSynthModule {
    constructor(audioContext) {
        this.audioContext = audioContext;
        this.id = 'birdSynthModule';
        this.name = 'Bird Synth';

        // This module generates its own sound, so input is unused.
        this.nodes = {
            input: this.audioContext.createGain(),
            output: this.audioContext.createGain(),
        };
    }

    /**
     * Triggers a single bird chirp.
     * @private
     */
    _chirp() {
        const now = this.audioContext.currentTime;
        
        // --- Get parameters from the UI ---
        const basePitch = parseFloat(this.pitch.slider.value);
        const sweepDepth = parseFloat(this.sweep.slider.value);
        const sweepRate = parseFloat(this.rate.slider.value);
        const length = parseFloat(this.length.slider.value);

        // --- Create nodes for a single chirp instance ---
        const osc = this.audioContext.createOscillator();
        const vca = this.audioContext.createGain(); // Volume control
        const lfo = this.audioContext.createOscillator(); // For pitch modulation
        const lfoDepth = this.audioContext.createGain(); // Controls sweep amount

        // --- Configure the nodes ---
        osc.type = 'triangle'; // A triangle wave is good for flute/whistle-like sounds
        osc.frequency.value = basePitch;
        
        lfo.type = 'sine';
        lfo.frequency.value = sweepRate;
        
        // --- Connect the audio graph for this chirp ---
        osc.connect(vca);
        vca.connect(this.nodes.output);

        // --- Connect the modulation path ---
        lfo.connect(lfoDepth);
        lfoDepth.connect(osc.frequency); // LFO modulates the main oscillator's frequency
        
        // --- Apply Envelopes ---
        // Volume envelope (VCA): very fast attack and decay
        vca.gain.setValueAtTime(0, now);
        vca.gain.linearRampToValueAtTime(1.0, now + 0.01);
        vca.gain.exponentialRampToValueAtTime(0.001, now + length);
        
        // Pitch sweep amount
        lfoDepth.gain.value = sweepDepth;
        
        // --- Start and Stop the sound ---
        osc.start(now);
        lfo.start(now);

        osc.stop(now + length + 0.1);
        lfo.stop(now + length + 0.1);
    }

    getHTML() {
        return `
            <div class="control-row" style="margin-bottom:15px;">
                <button id="birdChirpBtn" style="width: 100%; height: 50px; font-size: 1.2em; color: var(--color-neon-green); border-color: var(--color-neon-green);">Chirp</button>
            </div>
            <div class="control-row">
                <label for="birdPitch">Base Pitch (Hz):</label>
                <input type="range" id="birdPitch" min="500" max="4000" value="1500" step="50">
                <span id="birdPitchVal" class="value-display">1500</span>
            </div>
            <div class="control-row">
                <label for="birdSweep">Sweep Depth (Hz):</label>
                <input type="range" id="birdSweep" min="0" max="1000" value="500" step="10">
                <span id="birdSweepVal" class="value-display">500</span>
            </div>
            <div class="control-row">
                <label for="birdRate">Sweep Rate (Hz):</label>
                <input type="range" id="birdRate" min="5" max="50" value="20" step="1">
                <span id="birdRateVal" class="value-display">20</span>
            </div>
            <div class="control-row">
                <label for="birdLength">Chirp Length (s):</label>
                <input type="range" id="birdLength" min="0.05" max="0.5" value="0.15" step="0.01">
                <span id="birdLengthVal" class="value-display">0.15</span>
            </div>
        `;
    }

    initUI(container) {
        this.chirpButton = container.querySelector('#birdChirpBtn');
        this.pitch = { slider: container.querySelector('#birdPitch'), val: container.querySelector('#birdPitchVal') };
        this.sweep = { slider: container.querySelector('#birdSweep'), val: container.querySelector('#birdSweepVal') };
        this.rate = { slider: container.querySelector('#birdRate'), val: container.querySelector('#birdRateVal') };
        this.length = { slider: container.querySelector('#birdLength'), val: container.querySelector('#birdLengthVal') };

        // The "Chirp" button triggers the sound synthesis.
        this.chirpButton.addEventListener('click', () => this._chirp());
        
        // We only need to display the values; they are read directly when a chirp is triggered.
        this.pitch.slider.addEventListener('input', () => this.pitch.val.textContent = this.pitch.slider.value);
        this.sweep.slider.addEventListener('input', () => this.sweep.val.textContent = this.sweep.slider.value);
        this.rate.slider.addEventListener('input', () => this.rate.val.textContent = this.rate.slider.value);
        this.length.slider.addEventListener('input', () => this.length.val.textContent = parseFloat(this.length.slider.value).toFixed(2));
    }

    updateParams() {
        // All parameters are read "live" when the chirp is triggered,
        // so this function is not needed.
    }
}

// --- This line is crucial for the main app to load the module ---
window.registerSynthModule(BirdSynthModule);