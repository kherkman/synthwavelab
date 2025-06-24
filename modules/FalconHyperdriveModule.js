/**
 * Example Synth Module: A "Millennium Falcon" Hyperdrive SFX Generator.
 *
 * This module is a self-contained sound effects generator that procedurally
 * creates the two iconic sounds of the Millennium Falcon's hyperdrive:
 * the sputtering, grinding "fail" and the powerful "engage" sequence.
 *
 * This module demonstrates:
 * - A narrative approach to sound design, telling a story with sound.
 * - Synthesizing complex, multi-layered mechanical and sci-fi sound effects.
 * - Deconstructing and recreating two of the most famous sound effects in cinema.
 */
class FalconHyperdriveModule {
    constructor(audioContext) {
        this.audioContext = audioContext;
        this.id = 'falconHyperdriveModule';
        this.name = 'Hyperdrive';

        this.nodes = {
            input: this.audioContext.createGain(), // Unused
            output: this.audioContext.createGain(),
        };
    }

    // --- Sound Trigger Methods ---
    
    _triggerFail() {
        const now = this.audioContext.currentTime;
        const duration = 2.5;
        
        // --- Layer 1: The "Grinding" Engine ---
        const grindOsc = this.audioContext.createOscillator();
        grindOsc.type = 'sawtooth';
        
        // Pitch envelope - it sputters and dies
        grindOsc.frequency.setValueAtTime(100, now);
        grindOsc.frequency.linearRampToValueAtTime(120, now + 0.5);
        grindOsc.frequency.linearRampToValueAtTime(80, now + 1.5);
        grindOsc.frequency.exponentialRampToValueAtTime(20, now + duration);
        
        // Unstable LFO
        const lfo = this.audioContext.createOscillator();
        lfo.type = 'sine';
        lfo.frequency.value = 8;
        const lfoDepth = this.audioContext.createGain();
        lfoDepth.gain.value = 10; // Pitch variation
        lfo.connect(lfoDepth).connect(grindOsc.detune);
        
        const grindVCA = this.audioContext.createGain();
        grindVCA.gain.setValueAtTime(0.4, now);
        grindVCA.gain.setTargetAtTime(0, now + duration - 0.2, 0.1);
        
        grindOsc.connect(grindVCA).connect(this.nodes.output);

        // --- Layer 2: The "Electrical Sparks" ---
        for (let i = 0; i < 15; i++) {
            const time = now + Math.random() * duration;
            const noise = this.audioContext.createBufferSource();
            const buffer = this.audioContext.createBuffer(1, 4410, this.audioContext.sampleRate);
            noise.buffer = buffer;
            const vca = this.audioContext.createGain();
            vca.gain.setValueAtTime(0.2, time);
            vca.gain.exponentialRampToValueAtTime(0.001, time + 0.05);
            const filter = this.audioContext.createBiquadFilter();
            filter.type = 'highpass';
            filter.frequency.value = 5000;
            noise.connect(filter).connect(vca).connect(this.nodes.output);
            noise.start(time, Math.random() * 0.1, 0.02);
        }
        
        // --- Start Sources ---
        grindOsc.start(now);
        lfo.start(now);
        grindOsc.stop(now + duration + 0.2);
        lfo.stop(now + duration + 0.2);
    }
    
    _triggerEngage() {
        const now = this.audioContext.currentTime;
        const chargeTime = 1.0;
        const jumpTime = now + chargeTime;
        
        // --- Layer 1: The "Power Up" Whine ---
        const whineOsc = this.audioContext.createOscillator();
        whineOsc.type = 'sine';
        whineOsc.frequency.setValueAtTime(200, now);
        whineOsc.frequency.exponentialRampToValueAtTime(4000, jumpTime);
        
        const whineVCA = this.audioContext.createGain();
        whineVCA.gain.setValueAtTime(0, now);
        whineVCA.gain.linearRampToValueAtTime(0.3, now + 0.1);
        whineVCA.gain.setValueAtTime(0.3, jumpTime - 0.01);
        whineVCA.gain.linearRampToValueAtTime(0, jumpTime); // Abrupt cut
        
        whineOsc.connect(whineVCA).connect(this.nodes.output);
        
        // --- Layer 2: The "Bass Thump" on engage ---
        const thumpOsc = this.audioContext.createOscillator();
        thumpOsc.type = 'sine';
        thumpOsc.frequency.value = 60;
        const thumpVCA = this.audioContext.createGain();
        thumpVCA.gain.setValueAtTime(0, jumpTime);
        thumpVCA.gain.linearRampToValueAtTime(0.9, jumpTime + 0.01);
        thumpVCA.gain.exponentialRampToValueAtTime(0.001, jumpTime + 0.2);
        
        thumpOsc.connect(thumpVCA).connect(this.nodes.output);
        
        // --- Start Sources ---
        whineOsc.start(now);
        thumpOsc.start(jumpTime);
        whineOsc.stop(jumpTime + 0.01);
        thumpOsc.stop(jumpTime + 0.3);
    }

    getHTML() {
        return `
            <div class="control-row" style="margin-bottom:10px;">
                <button id="falconFailBtn" style="width: 100%; height: 50px;">Hyperdrive Fail</button>
            </div>
            <div class="control-row">
                <button id="falconEngageBtn" style="width: 100%; height: 50px; color: var(--color-neon-green); border-color: var(--color-neon-green);">Engage!</button>
            </div>
        `;
    }

    initUI(container) {
        container.querySelector('#falconFailBtn').addEventListener('click', () => this._triggerFail());
        container.querySelector('#falconEngageBtn').addEventListener('click', () => this._triggerEngage());
    }

    updateParams() {
        // This module has no user-adjustable parameters.
    }
}

// --- This line is crucial for the main app to load the module ---
window.registerSynthModule(FalconHyperdriveModule);