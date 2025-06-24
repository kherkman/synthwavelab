/**
 * Example Synth Module: A "DeLorean" Time Machine SFX Generator.
 *
 * This module procedurally generates the sound of the DeLorean time machine
 * from "Back to the Future" as it charges up for a time jump, including the
 * flux capacitor hum, the time circuit computer sounds, and the final vent release.
 *
 * This module demonstrates:
 * - A complex, narrative sound effect with precisely scheduled layers.
 * - Synthesizing a variety of mechanical, electrical, and atmospheric sounds.
 * - An interactive sound effect generator based on a single trigger event.
 */
class DeLoreanModule {
    constructor(audioContext) {
        this.audioContext = audioContext;
        this.id = 'deloreanModule';
        this.name = 'Time Machine';

        this.nodes = {
            input: this.audioContext.createGain(), // Unused
            output: this.audioContext.createGain(),
        };
        
        this.isEngaged = false;
    }

    /**
     * Triggers the full time jump sound sequence.
     * @private
     */
    _engage() {
        if (this.isEngaged) return;
        this.isEngaged = true;
        this.engageButton.disabled = true;
        this.engageButton.textContent = "CHARGING...";

        const now = this.audioContext.currentTime;
        const chargeTime = parseFloat(this.chargeTime.slider.value);
        const jumpTime = now + chargeTime;
        const masterGain = this.nodes.output;
        
        // --- Layer 1: The "Flux Capacitor" Hum ---
        const humOsc1 = this.audioContext.createOscillator();
        const humOsc2 = this.audioContext.createOscillator();
        const humVCA = this.audioContext.createGain();
        humOsc1.type = 'sawtooth';
        humOsc1.frequency.value = 50; // Deep G
        humOsc1.detune.value = -7;
        humOsc2.type = 'sawtooth';
        humOsc2.frequency.value = 50;
        humOsc2.detune.value = 7;
        
        humOsc1.connect(humVCA);
        humOsc2.connect(humVCA);
        humVCA.connect(masterGain);
        
        // The hum fades in and then cuts out abruptly at the jump
        humVCA.gain.setValueAtTime(0, now);
        humVCA.gain.linearRampToValueAtTime(0.2, now + chargeTime * 0.8);
        humVCA.gain.setValueAtTime(0, jumpTime);

        // --- Layer 2: The "Time Circuit" Computer ---
        // We'll schedule beeps that get faster and faster.
        const numBeeps = 30;
        for (let i = 0; i < numBeeps; i++) {
            // Use an easing curve to make the beeps accelerate
            const timePosition = Math.pow(i / numBeeps, 2.5);
            const beepTime = now + timePosition * chargeTime;
            
            const osc = this.audioContext.createOscillator();
            osc.type = 'square';
            osc.frequency.value = 1200 + Math.random() * 800;
            const vca = this.audioContext.createGain();
            vca.gain.setValueAtTime(0.15, beepTime);
            vca.gain.exponentialRampToValueAtTime(0.001, beepTime + 0.05);
            osc.connect(vca).connect(masterGain);
            osc.start(beepTime);
            osc.stop(beepTime + 0.06);
        }
        
        // --- Layer 3: The "Vent" Steam Release ---
        const ventTime = jumpTime;
        const noise = this.audioContext.createBufferSource();
        const buffer = this.audioContext.createBuffer(1, this.audioContext.sampleRate * 1, this.audioContext.sampleRate);
        const data = buffer.getChannelData(0);
        for(let i=0; i<data.length; i++) data[i] = Math.random() * 2 - 1;
        noise.buffer = buffer;
        
        const filter = this.audioContext.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 6000;
        filter.Q.value = 0.8;
        
        const vca = this.audioContext.createGain();
        vca.gain.setValueAtTime(0, ventTime);
        vca.gain.linearRampToValueAtTime(0.4, ventTime + 0.05);
        vca.gain.exponentialRampToValueAtTime(0.001, ventTime + 0.8);
        
        noise.connect(filter).connect(vca).connect(masterGain);
        
        // --- Start and Stop everything ---
        humOsc1.start(now);
        humOsc2.start(now);
        humOsc1.stop(jumpTime);
        humOsc2.stop(jumpTime);
        noise.start(ventTime);
        noise.stop(ventTime + 1);
        
        // --- Reset the UI after the sequence is over ---
        setTimeout(() => {
            this.isEngaged = false;
            this.engageButton.disabled = false;
            this.engageButton.textContent = "Engage Time Circuits";
        }, (chargeTime + 1.0) * 1000);
    }
    
    getHTML() {
        return `
            <div class="control-row" style="margin-bottom:15px;">
                <button id="deloreanEngageBtn" style="width: 100%; height: 60px; font-size: 1.2em; color: var(--color-neon-pink); border-color: var(--color-neon-pink);">Engage Time Circuits</button>
            </div>
            <div class="control-row">
                <label for="deloreanCharge">Charge Time (s):</label>
                <input type="range" id="deloreanCharge" min="1.0" max="8.8" value="4.0" step="0.1">
                <span id="deloreanChargeVal" class="value-display">4.0</span>
            </div>
        `;
    }

    initUI(container) {
        this.engageButton = container.querySelector('#deloreanEngageBtn');
        this.chargeTime = { slider: container.querySelector('#deloreanCharge'), val: container.querySelector('#deloreanChargeVal') };

        // The main button triggers the entire sound effect sequence.
        this.engageButton.addEventListener('click', () => this._engage());
        
        this.chargeTime.slider.addEventListener('input', () => {
            this.chargeTime.val.textContent = parseFloat(this.chargeTime.slider.value).toFixed(1);
        });
    }

    updateParams() {
        // All parameters are read "live" when the effect is triggered.
    }
}

// --- This line is crucial for the main app to load the module ---
window.registerSynthModule(DeLoreanModule);