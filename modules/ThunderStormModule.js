/**
 * Example Synth Module: A Procedural Thunder & Lightning Generator.
 *
 * This module is a self-contained sound effects generator that procedurally
 * creates the sound of a complete, realistic thunderclap, from the initial
 * sharp "crack" of the lightning to the long, evolving low-frequency rumble.
 *
 * This module demonstrates:
 * - Synthesizing a complex natural phenomenon from scratch.
 * - Advanced use of filtered noise for creating realistic textures.
 * - Precise scheduling and randomization to create a believable, non-repetitive effect.
 */
class ThunderStormModule {
    constructor(audioContext) {
        this.audioContext = audioContext;
        this.id = 'thunderStormModule';
        this.name = 'Thunder & Lightning';

        this.nodes = {
            input: this.audioContext.createGain(), // Unused
            output: this.audioContext.createGain(),
        };
    }

    /**
     * Triggers the full thunder and lightning sound sequence.
     * @private
     */
    _trigger() {
        const now = this.audioContext.currentTime;
        const distance = parseFloat(this.distance.slider.value); // in km
        const speedOfSound = 343; // m/s
        const rumbleDelay = (distance * 1000) / speedOfSound;
        
        // --- Layer 1: The "Crack" of the lightning strike ---
        // A very short, loud burst of white noise.
        const crackNoise = this.audioContext.createBufferSource();
        const crackBufferSize = this.audioContext.sampleRate * 0.2;
        const crackBuffer = this.audioContext.createBuffer(1, crackBufferSize, this.audioContext.sampleRate);
        const crackData = crackBuffer.getChannelData(0);
        for (let i=0; i < crackData.length; i++) crackData[i] = Math.random() * 2 - 1;
        crackNoise.buffer = crackBuffer;
        
        const crackVCA = this.audioContext.createGain();
        crackVCA.gain.setValueAtTime(0.8, now);
        crackVCA.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        
        const crackHPF = this.audioContext.createBiquadFilter();
        crackHPF.type = 'highpass';
        crackHPF.frequency.value = 1000;
        
        crackNoise.connect(crackHPF).connect(crackVCA).connect(this.nodes.output);
        crackNoise.start(now);
        crackNoise.stop(now + 0.2);
        
        // --- Layer 2: The "Rumble" of the thunder ---
        // This starts after a delay based on the "distance".
        const rumbleTime = now + rumbleDelay;
        const rumbleDuration = 4.0 + Math.random() * 3.0;

        // We use brown noise for the deep rumble.
        const rumbleNoise = this.audioContext.createBufferSource();
        const rumbleBufferSize = this.audioContext.sampleRate * (rumbleDuration + 1);
        const rumbleBuffer = this.audioContext.createBuffer(1, rumbleBufferSize, this.audioContext.sampleRate);
        const rumbleData = rumbleBuffer.getChannelData(0);
        let lastOut = 0;
        for (let i = 0; i < rumbleData.length; i++) {
            lastOut = (lastOut + (0.02 * (Math.random() * 2 - 1))) / 1.02;
            rumbleData[i] = lastOut * 3.5;
        }
        rumbleNoise.buffer = rumbleBuffer;
        
        const rumbleVCA = this.audioContext.createGain();
        rumbleVCA.gain.setValueAtTime(0, rumbleTime);
        rumbleVCA.gain.linearRampToValueAtTime(0.7, rumbleTime + 0.2);
        rumbleVCA.gain.exponentialRampToValueAtTime(0.001, rumbleTime + rumbleDuration);
        
        // The key to a realistic rumble is multiple, moving low-pass filters.
        const rumbleMerger = this.audioContext.createGain();
        for (let i = 0; i < 3; i++) {
            const lpf = this.audioContext.createBiquadFilter();
            lpf.type = 'lowpass';
            lpf.Q.value = 2;
            
            const startFreq = 80 + Math.random() * 100;
            const endFreq = 40 + Math.random() * 50;
            lpf.frequency.setValueAtTime(startFreq, rumbleTime);
            lpf.frequency.exponentialRampToValueAtTime(endFreq, rumbleTime + rumbleDuration);
            
            rumbleNoise.connect(lpf).connect(rumbleMerger);
        }
        
        rumbleMerger.connect(rumbleVCA).connect(this.nodes.output);
        rumbleNoise.start(rumbleTime);
        rumbleNoise.stop(rumbleTime + rumbleDuration + 0.1);
    }
    
    getHTML() {
        return `
            <div class="control-row" style="margin-bottom:15px;">
                <button id="thunderTriggerBtn" style="width: 100%; height: 60px; font-size: 1.5em; color: var(--color-neon-pink); border-color: var(--color-neon-pink);">Summon Storm</button>
            </div>
            <div class="control-row">
                <label for="thunderDistance">Distance (km):</label>
                <input type="range" id="thunderDistance" min="0.1" max="10.0" value="2.0" step="0.1">
                <span id="thunderDistanceVal" class="value-display">2.0</span>
            </div>
        `;
    }

    initUI(container) {
        this.triggerButton = container.querySelector('#thunderTriggerBtn');
        this.distance = { slider: container.querySelector('#thunderDistance'), val: container.querySelector('#thunderDistanceVal') };
        
        this.triggerButton.addEventListener('click', () => this._trigger());
        
        this.distance.slider.addEventListener('input', () => {
            this.distance.val.textContent = parseFloat(this.distance.slider.value).toFixed(1);
        });
    }

    updateParams() {
        // All parameters are read "live" when the effect is triggered.
    }
}

// --- This line is crucial for the main app to load the module ---
window.registerSynthModule(ThunderStormModule);