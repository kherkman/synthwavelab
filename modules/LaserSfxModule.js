/**
 * Example Synth Module: A Laser Shots Sound FX Generator.
 *
 * This module is a self-contained sound effects generator that procedurally
 * creates a variety of classic sci-fi laser sounds, from simple "pews" to
 * heavy cannons and rapid-fire bursts.
 *
 * This module demonstrates:
 * - A focused sound effects generator for a specific theme.
 * - The crucial role of fast pitch envelopes in creating laser sounds.
 * - Synthesizing multiple distinct but related sound effects within one module.
 */
class LaserSfxModule {
    constructor(audioContext) {
        this.audioContext = audioContext;
        this.id = 'laserSfxModule';
        this.name = 'Laser Cannon';

        this.nodes = {
            input: this.audioContext.createGain(), // Unused
            output: this.audioContext.createGain(),
        };
    }

    // --- Sound Trigger Methods ---
    
    _triggerClassicPew() {
        const now = this.audioContext.currentTime;
        const osc = this.audioContext.createOscillator();
        osc.type = 'triangle';
        const vca = this.audioContext.createGain();
        
        // The pitch envelope is the key to the sound
        osc.frequency.setValueAtTime(3000, now);
        osc.frequency.exponentialRampToValueAtTime(200, now + 0.15);
        
        // The volume envelope is a short, sharp click
        vca.gain.setValueAtTime(0.5, now);
        vca.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        
        osc.connect(vca).connect(this.nodes.output);
        osc.start(now);
        osc.stop(now + 0.2);
    }
    
    _triggerHeavyCannon() {
        const now = this.audioContext.currentTime;
        
        // Layer 1: The main beam
        const beamOsc = this.audioContext.createOscillator();
        beamOsc.type = 'sawtooth';
        beamOsc.frequency.setValueAtTime(1200, now);
        beamOsc.frequency.exponentialRampToValueAtTime(100, now + 0.3);
        const beamVCA = this.audioContext.createGain();
        beamVCA.gain.setValueAtTime(0.5, now);
        beamVCA.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
        beamOsc.connect(beamVCA).connect(this.nodes.output);

        // Layer 2: The low-end "thump"
        const thumpOsc = this.audioContext.createOscillator();
        thumpOsc.type = 'sine';
        thumpOsc.frequency.setValueAtTime(150, now);
        thumpOsc.frequency.exponentialRampToValueAtTime(30, now + 0.1);
        const thumpVCA = this.audioContext.createGain();
        thumpVCA.gain.setValueAtTime(0.8, now);
        thumpVCA.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
        thumpOsc.connect(thumpVCA).connect(this.nodes.output);
        
        beamOsc.start(now);
        thumpOsc.start(now);
        beamOsc.stop(now + 0.4);
        thumpOsc.stop(now + 0.4);
    }
    
    _triggerStunner() {
        const now = this.audioContext.currentTime;
        const osc = this.audioContext.createOscillator();
        osc.type = 'square';
        osc.frequency.value = 800;
        
        // A fast vibrato creates the "stun" sound
        const lfo = this.audioContext.createOscillator();
        lfo.type = 'sine';
        lfo.frequency.value = 50;
        const lfoDepth = this.audioContext.createGain();
        lfoDepth.gain.value = 100; // a wide, fast vibrato
        
        const vca = this.audioContext.createGain();
        vca.gain.setValueAtTime(0.4, now);
        vca.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        
        lfo.connect(lfoDepth).connect(osc.frequency);
        osc.connect(vca).connect(this.nodes.output);
        
        osc.start(now);
        lfo.start(now);
        osc.stop(now + 0.35);
        lfo.stop(now + 0.35);
    }
    
    _triggerRapidFire() {
        for (let i = 0; i < 5; i++) {
            const time = this.audioContext.currentTime + i * 0.06;
            const osc = this.audioContext.createOscillator();
            osc.type = 'triangle';
            const vca = this.audioContext.createGain();
            
            osc.frequency.setValueAtTime(2500, time);
            osc.frequency.exponentialRampToValueAtTime(800, time + 0.05);
            
            vca.gain.setValueAtTime(0.3, time);
            vca.gain.exponentialRampToValueAtTime(0.001, time + 0.06);
            
            osc.connect(vca).connect(this.nodes.output);
            osc.start(time);
            osc.stop(time + 0.07);
        }
    }

    getHTML() {
        return `
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 10px;">
                <button id="laserPewBtn" style="height: 50px;">Classic Pew</button>
                <button id="laserCannonBtn" style="height: 50px;">Heavy Cannon</button>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                 <button id="laserStunBtn" style="height: 50px;">Stunner</button>
                 <button id="laserRapidBtn" style="height: 50px;">Rapid Fire</button>
            </div>
        `;
    }

    initUI(container) {
        container.querySelector('#laserPewBtn').addEventListener('click', () => this._triggerClassicPew());
        container.querySelector('#laserCannonBtn').addEventListener('click', () => this._triggerHeavyCannon());
        container.querySelector('#laserStunBtn').addEventListener('click', () => this._triggerStunner());
        container.querySelector('#laserRapidBtn').addEventListener('click', () => this._triggerRapidFire());
    }

    updateParams() {
        // This module has no user-adjustable parameters.
    }
}

// --- This line is crucial for the main app to load the module ---
window.registerSynthModule(LaserSfxModule);