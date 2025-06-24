/**
 * Example Synth Module: A Circuit Bent Toy Simulator.
 *
 * This module is a self-contained instrument that simulates the chaotic,
 * glitchy, and unpredictable sounds of a "circuit-bent" electronic device.
 * It uses audio-rate modulation of pitch and amplitude to create its sound.
 *
 * This module demonstrates:
 * - A synthesizer designed for chaotic and experimental sound design.
 * - Using LFOs running at audio rates to create complex, digital timbres.
 * - A performance-oriented effect with a momentary "crash" button.
 */
class CircuitBentModule {
    constructor(audioContext) {
        this.audioContext = audioContext;
        this.id = 'circuitBentModule';
        this.name = 'Circuit Bent Toy';
        this.isPlaying = false;

        // --- Create Audio Nodes ---
        this.nodes = {
            input: this.audioContext.createGain(), // Unused
            output: this.audioContext.createGain(),
            
            // --- Core Sound Source ---
            mainOsc: this.audioContext.createOscillator(),
            mainVCA: this.audioContext.createGain(),
            
            // --- Pitch Modulation (Glitch) ---
            pitchLFO: this.audioContext.createOscillator(),
            pitchLFODepth: this.audioContext.createGain(),
            
            // --- Amplitude Modulation (Stutter/Gate) ---
            gateLFO: this.audioContext.createOscillator(),
            gateLFODepth: this.audioContext.createGain(),
        };

        // --- Configure Nodes ---
        this.nodes.mainOsc.type = 'square';
        this.nodes.pitchLFO.type = 'sawtooth';
        this.nodes.gateLFO.type = 'square';
        
        // --- Connect Audio Graph ---
        // 1. Main audio path: Osc -> VCA -> Output
        this.nodes.mainOsc.connect(this.nodes.mainVCA);
        this.nodes.mainVCA.connect(this.nodes.output);
        
        // 2. Pitch LFO modulates the main oscillator's frequency
        this.nodes.pitchLFO.connect(this.nodes.pitchLFODepth);
        this.nodes.pitchLFODepth.connect(this.nodes.mainOsc.frequency);

        // 3. Gate LFO modulates the main VCA's gain
        this.nodes.gateLFO.connect(this.nodes.gateLFODepth);
        this.nodes.gateLFODepth.connect(this.nodes.mainVCA.gain);
    }
    
    _start() {
        if (this.isPlaying) return;
        this.isPlaying = true;
        
        this.nodes.mainOsc.start(0);
        this.nodes.pitchLFO.start(0);
        this.nodes.gateLFO.start(0);
        
        this.updateParams();
        
        this.playButton.textContent = "Stop";
        this.playButton.classList.add('active');
    }
    
    _stop() {
        if (!this.isPlaying) return;
        const now = this.audioContext.currentTime;
        
        this.nodes.mainOsc.stop(now + 0.1);
        this.nodes.pitchLFO.stop(now + 0.1);
        this.nodes.gateLFO.stop(now + 0.1);
        
        this.constructor(this.audioContext); // Re-create nodes
        this.isPlaying = false;
        
        if (this.playButton) {
            this.playButton.textContent = "Start";
            this.playButton.classList.remove('active');
        }
    }
    
    _crash(isCrashing) {
        if (!this.isPlaying) return;
        
        const time = this.audioContext.currentTime;
        const smoothing = 0.01;
        
        if (isCrashing) {
            // When crashing, max out the modulation rates and depths
            this.nodes.pitchLFO.frequency.setTargetAtTime(1000, time, smoothing);
            this.nodes.pitchLFODepth.gain.setTargetAtTime(2000, time, smoothing);
            this.nodes.gateLFO.frequency.setTargetAtTime(500, time, smoothing);
        } else {
            // When released, return to the knob settings
            this.updateParams();
        }
    }

    getHTML() {
        return `
            <div class="control-row" style="margin-bottom:15px;">
                <button id="bentPlayBtn" class="toggle-button" style="width: 50%; height: 40px;">Start</button>
                <button id="bentCrashBtn" style="width: 50%; height: 40px; color: var(--color-neon-pink); border-color: var(--color-neon-pink);">CRASH</button>
            </div>
            <div class="control-row">
                <label for="bentPitch">Base Pitch (Hz):</label>
                <input type="range" id="bentPitch" min="50" max="1000" value="220" step="1">
                <span id="bentPitchVal" class="value-display">220</span>
            </div>
            <div class="control-row">
                <label for="bentGlitch">Glitch Depth:</label>
                <input type="range" id="bentGlitch" min="0" max="1000" value="200" step="10">
                <span id="bentGlitchVal" class="value-display">200</span>
            </div>
            <div class="control-row">
                <label for="bentRate">Glitch Rate:</label>
                <input type="range" id="bentRate" min="1" max="200" value="30" step="1">
                <span id="bentRateVal" class="value-display">30</span>
            </div>
        `;
    }

    initUI(container) {
        this.playButton = container.querySelector('#bentPlayBtn');
        this.crashButton = container.querySelector('#bentCrashBtn');
        this.pitch = { slider: container.querySelector('#bentPitch'), val: container.querySelector('#bentPitchVal') };
        this.glitch = { slider: container.querySelector('#bentGlitch'), val: container.querySelector('#bentGlitchVal') };
        this.rate = { slider: container.querySelector('#bentRate'), val: container.querySelector('#bentRateVal') };

        this.playButton.addEventListener('click', () => {
            if (this.isPlaying) this._stop(); else this._start();
        });
        
        // The "Crash" button is momentary
        this.crashButton.addEventListener('mousedown', () => this._crash(true));
        this.crashButton.addEventListener('mouseup', () => this._crash(false));
        this.crashButton.addEventListener('mouseleave', () => this._crash(false));
        this.crashButton.addEventListener('touchstart', (e) => { e.preventDefault(); this._crash(true); });
        this.crashButton.addEventListener('touchend', (e) => { e.preventDefault(); this._crash(false); });
        
        const connect = (ctrl) => {
            ctrl.slider.addEventListener('input', () => {
                ctrl.val.textContent = ctrl.slider.value;
                if(this.isPlaying) this.updateParams();
            });
        };
        
        connect(this.pitch);
        connect(this.glitch);
        connect(this.rate);
    }

    updateParams() {
        if (!this.isPlaying) return;
        
        const time = this.audioContext.currentTime;
        const smoothing = 0.02;

        const pitch = parseFloat(this.pitch.slider.value);
        const glitchDepth = parseFloat(this.glitch.slider.value);
        const glitchRate = parseFloat(this.rate.slider.value);
        
        // --- Set base parameters ---
        this.nodes.mainOsc.frequency.value = pitch;
        this.nodes.mainVCA.gain.value = 0.5; // VCA is modulated by LFO, so base is 0.5
        
        // --- Set LFO parameters ---
        // The rate of one LFO also affects the depth of the other for more chaotic interaction
        this.nodes.pitchLFO.frequency.setTargetAtTime(glitchRate, time, smoothing);
        this.nodes.pitchLFODepth.gain.setTargetAtTime(glitchDepth, time, smoothing);
        
        this.nodes.gateLFO.frequency.setTargetAtTime(glitchRate * 1.5, time, smoothing); // Slightly different rate
        this.nodes.gateLFODepth.gain.value = 0.5; // Modulates between 0 and 1
    }
}

// --- This line is crucial for the main app to load the module ---
window.registerSynthModule(CircuitBentModule);