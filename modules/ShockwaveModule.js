/**
 * Example Synth Module: A "Shockwave" / Laser Cannon Sound FX Generator.
 *
 * This module procedurally generates the sound of a futuristic energy weapon,
 * including the initial laser "zap," a low-frequency impact "thump," and a
 * booming shockwave.
 *
 * This module demonstrates:
 * - A multi-layered procedural sound effect with precise event scheduling.
 * - Synthesizing complex, non-musical sci-fi sound effects.
 * - Using pitch and amplitude envelopes to create a sonic narrative.
 */
class ShockwaveModule {
    constructor(audioContext) {
        this.audioContext = audioContext;
        this.id = 'shockwaveModule';
        this.name = 'Shockwave Cannon';

        this.nodes = {
            input: this.audioContext.createGain(), // Unused
            output: this.audioContext.createGain(),
        };
    }

    /**
     * Triggers the full sound effect sequence.
     * @private
     */
    _fire() {
        const now = this.audioContext.currentTime;
        const chargeTime = parseFloat(this.charge.slider.value);
        const power = parseFloat(this.power.slider.value); // 0 to 1
        const masterGain = this.nodes.output;
        
        const fireTime = now + chargeTime;

        // --- Layer 0: The "Charge Up" Whine ---
        const chargeOsc = this.audioContext.createOscillator();
        chargeOsc.type = 'sawtooth';
        chargeOsc.frequency.setValueAtTime(200, now);
        chargeOsc.frequency.exponentialRampToValueAtTime(1500, fireTime);
        const chargeVCA = this.audioContext.createGain();
        chargeVCA.gain.setValueAtTime(0, now);
        chargeVCA.gain.linearRampToValueAtTime(0.1 * power, fireTime - 0.01);
        chargeVCA.gain.linearRampToValueAtTime(0, fireTime);
        chargeOsc.connect(chargeVCA).connect(masterGain);
        chargeOsc.start(now);
        chargeOsc.stop(fireTime);
        
        // --- Layer 1: The "Zap" (Laser Beam) ---
        const zapOsc = this.audioContext.createOscillator();
        zapOsc.type = 'sawtooth';
        zapOsc.frequency.setValueAtTime(8000, fireTime);
        zapOsc.frequency.exponentialRampToValueAtTime(200, fireTime + 0.1 * (1 + power));
        const zapVCA = this.audioContext.createGain();
        zapVCA.gain.setValueAtTime(0.4, fireTime);
        zapVCA.gain.exponentialRampToValueAtTime(0.001, fireTime + 0.15 * (1 + power));
        zapOsc.connect(zapVCA).connect(masterGain);
        zapOsc.start(fireTime);
        zapOsc.stop(fireTime + 0.2);

        // --- Layer 2: The "Thump" (Impact) ---
        const thumpOsc = this.audioContext.createOscillator();
        thumpOsc.type = 'sine';
        thumpOsc.frequency.setValueAtTime(200, fireTime);
        thumpOsc.frequency.exponentialRampToValueAtTime(30, fireTime + 0.1);
        const thumpVCA = this.audioContext.createGain();
        thumpVCA.gain.setValueAtTime(0.9 * power, fireTime);
        thumpVCA.gain.exponentialRampToValueAtTime(0.001, fireTime + 0.12);
        thumpOsc.connect(thumpVCA).connect(masterGain);
        thumpOsc.start(fireTime);
        thumpOsc.stop(fireTime + 0.2);
        
        // --- Layer 3: The "Boom" (Shockwave) ---
        const boomOsc = this.audioContext.createOscillator();
        boomOsc.type = 'triangle';
        boomOsc.frequency.setValueAtTime(40, fireTime);
        const boomSaturator = this.audioContext.createWaveShaper();
        const curve = new Float32Array([ -1, 0, 1 ]);
        boomSaturator.curve = curve;
        const boomVCA = this.audioContext.createGain();
        boomVCA.gain.setValueAtTime(0, fireTime);
        boomVCA.gain.linearRampToValueAtTime(0.8 * power, fireTime + 0.05);
        boomVCA.gain.exponentialRampToValueAtTime(0.001, fireTime + 0.8 * (1 + power));
        boomOsc.connect(boomSaturator).connect(boomVCA).connect(masterGain);
        boomOsc.start(fireTime);
        boomOsc.stop(fireTime + 1.0 * (1 + power));

        // --- Layer 4: The "Sizzle" (After-effect) ---
        const sizzleNoise = this.audioContext.createBufferSource();
        const buffer = this.audioContext.createBuffer(1, this.audioContext.sampleRate * 0.5, this.audioContext.sampleRate);
        const data = buffer.getChannelData(0);
        for(let i=0; i<data.length; i++) data[i] = Math.random() * 2 - 1;
        sizzleNoise.buffer = buffer;
        sizzleNoise.loop = true;
        const sizzleFilter = this.audioContext.createBiquadFilter();
        sizzleFilter.type = 'bandpass';
        sizzleFilter.Q.value = 10;
        sizzleFilter.frequency.setValueAtTime(12000, fireTime);
        sizzleFilter.frequency.exponentialRampToValueAtTime(4000, fireTime + 0.5);
        const sizzleVCA = this.audioContext.createGain();
        sizzleVCA.gain.setValueAtTime(0, fireTime);
        sizzleVCA.gain.linearRampToValueAtTime(0.1 * power, fireTime + 0.1);
        sizzleVCA.gain.exponentialRampToValueAtTime(0.001, fireTime + 0.6);
        sizzleNoise.connect(sizzleFilter).connect(sizzleVCA).connect(masterGain);
        sizzleNoise.start(fireTime);
        sizzleNoise.stop(fireTime + 1.0);
    }

    getHTML() {
        return `
            <div class="control-row" style="margin-bottom:15px;">
                <button id="shockwaveFireBtn" style="width: 100%; height: 60px; font-size: 1.5em; color: var(--color-neon-pink); border-color: var(--color-neon-pink);">FIRE</button>
            </div>
            <div class="control-row">
                <label for="shockwaveCharge">Charge Time (s):</label>
                <input type="range" id="shockwaveCharge" min="0" max="2.0" value="0.2" step="0.01">
                <span id="shockwaveChargeVal" class="value-display">0.20</span>
            </div>
            <div class="control-row">
                <label for="shockwavePower">Power:</label>
                <input type="range" id="shockwavePower" min="0.1" max="1.0" value="0.8" step="0.01">
                <span id="shockwavePowerVal" class="value-display">0.80</span>
            </div>
        `;
    }

    initUI(container) {
        this.fireButton = container.querySelector('#shockwaveFireBtn');
        this.charge = { slider: container.querySelector('#shockwaveCharge'), val: container.querySelector('#shockwaveChargeVal') };
        this.power = { slider: container.querySelector('#shockwavePower'), val: container.querySelector('#shockwavePowerVal') };

        // The main button triggers the entire sound effect sequence.
        this.fireButton.addEventListener('click', () => this._fire());
        
        this.charge.slider.addEventListener('input', () => {
            this.charge.val.textContent = parseFloat(this.charge.slider.value).toFixed(2);
        });
        this.power.slider.addEventListener('input', () => {
            this.power.val.textContent = parseFloat(this.power.slider.value).toFixed(2);
        });
    }

    updateParams() {
        // All parameters are read "live" when the effect is triggered.
    }
}

// --- This line is crucial for the main app to load the module ---
window.registerSynthModule(ShockwaveModule);