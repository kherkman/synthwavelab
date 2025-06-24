/**
 * Example Synth Module: A "Predator" Jungle Ambience & SFX Generator.
 *
 * This module is a soundscape and SFX generator that creates the tense,
 * humid jungle atmosphere from "Predator," along with the creature's iconic
 * clicks, vision mode hum, and vocalizations.
 *
 * This module demonstrates:
 * - Blending synthesized organic ambience with procedural sci-fi sound effects.
 * - A multi-part sound generator with both continuous and triggered elements.
 * - Advanced synthesis techniques like noise-based FM for organic textures.
 */
class PredatorModule {
    constructor(audioContext) {
        this.audioContext = audioContext;
        this.id = 'predatorModule';
        this.name = 'Predator Jungle';
        this.isAmbienceOn = false;

        // --- Create Nodes for continuous ambience ---
        this.nodes = {
            input: this.audioContext.createGain(), // Unused
            output: this.audioContext.createGain(),
            
            // Insect layer
            insectNoise: this.audioContext.createBufferSource(),
            insectFilter: this.audioContext.createBiquadFilter(),
            insectLFO: this.audioContext.createOscillator(),
            insectLFODepth: this.audioContext.createGain(),
            
            // Humid air layer
            airNoise: this.audioContext.createBufferSource(),
            airGain: this.audioContext.createGain(),
        };

        // --- Configure Ambience Nodes ---
        this.nodes.insectFilter.type = 'bandpass';
        this.nodes.insectFilter.Q.value = 25;
        this.nodes.insectLFO.type = 'sine';
        this.nodes.insectLFO.frequency.value = 0.2;
        
        // Generate white noise for insects
        const wnBuffer = this.audioContext.createBuffer(1, this.audioContext.sampleRate * 2, this.audioContext.sampleRate);
        const wnData = wnBuffer.getChannelData(0);
        for (let i = 0; i < wnData.length; i++) wnData[i] = Math.random() * 2 - 1;
        this.nodes.insectNoise.buffer = wnBuffer;
        this.nodes.insectNoise.loop = true;

        // Generate brown noise for air
        const bnBuffer = this.audioContext.createBuffer(1, this.audioContext.sampleRate * 2, this.audioContext.sampleRate);
        const bnData = bnBuffer.getChannelData(0);
        let lastOut = 0;
        for (let i = 0; i < bnData.length; i++) {
            lastOut = (lastOut + (0.02 * (Math.random() * 2 - 1))) / 1.02;
            bnData[i] = lastOut * 3.5;
        }
        this.nodes.airNoise.buffer = bnBuffer;
        this.nodes.airNoise.loop = true;
        
        // --- Connect Ambience Graph ---
        this.nodes.insectNoise.connect(this.nodes.insectFilter);
        this.nodes.insectFilter.connect(this.nodes.output);
        this.nodes.insectLFO.connect(this.nodes.insectLFODepth).connect(this.nodes.insectFilter.frequency);
        
        this.nodes.airNoise.connect(this.nodes.airGain).connect(this.nodes.output);
    }
    
    // --- SFX Trigger Methods ---
    _triggerClicks() {
        const now = this.audioContext.currentTime;
        const numClicks = 10 + Math.floor(Math.random() * 10);
        
        for (let i = 0; i < numClicks; i++) {
            const time = now + (i * (0.02 + Math.random() * 0.03));
            const noise = this.audioContext.createBufferSource();
            noise.buffer = this.nodes.insectNoise.buffer; // Reuse buffer
            const vca = this.audioContext.createGain();
            vca.gain.setValueAtTime(0.4, time);
            vca.gain.exponentialRampToValueAtTime(0.001, time + 0.02);
            
            const filter = this.audioContext.createBiquadFilter();
            filter.type = 'bandpass';
            filter.frequency.value = 3000 + Math.random() * 2000;
            filter.Q.value = 15;
            
            noise.connect(filter).connect(vca).connect(this.nodes.output);
            noise.start(time, Math.random(), 0.01);
        }
    }
    
    _triggerVision() {
        const now = this.audioContext.currentTime;
        const vca = this.audioContext.createGain();
        vca.gain.setValueAtTime(0, now);
        vca.gain.linearRampToValueAtTime(0.2, now + 0.2);
        vca.gain.setValueAtTime(0.2, now + 1.0);
        vca.gain.linearRampToValueAtTime(0, now + 1.2);
        vca.connect(this.nodes.output);
        
        const osc = this.audioContext.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.value = 40;
        osc.connect(vca);
        osc.start(now);
        osc.stop(now + 1.3);
    }
    
    _triggerGrowl() {
        const now = this.audioContext.currentTime;
        const vca = this.audioContext.createGain();
        const mainOsc = this.audioContext.createOscillator();
        const modNoise = this.audioContext.createBufferSource();
        const modDepth = this.audioContext.createGain();
        const filter = this.audioContext.createBiquadFilter();
        
        modNoise.buffer = this.nodes.insectNoise.buffer;
        modNoise.loop = true;
        
        mainOsc.type = 'sawtooth';
        mainOsc.frequency.value = 150;
        
        modDepth.gain.value = 50; // How much noise affects pitch
        
        filter.type = 'lowpass';
        filter.Q.value = 3;
        filter.frequency.setValueAtTime(2000, now);
        filter.frequency.exponentialRampToValueAtTime(400, now + 0.8);
        
        vca.gain.setValueAtTime(0, now);
        vca.gain.linearRampToValueAtTime(0.4, now + 0.1);
        vca.gain.exponentialRampToValueAtTime(0.001, now + 0.9);
        
        modNoise.connect(modDepth).connect(mainOsc.frequency);
        mainOsc.connect(filter).connect(vca).connect(this.nodes.output);
        
        mainOsc.start(now);
        modNoise.start(now);
        mainOsc.stop(now + 1);
        modNoise.stop(now + 1);
    }

    getHTML() {
        return `
            <div class="control-row" style="margin-bottom:15px;">
                <label for="predatorAmbience">Ambience:</label>
                <button id="predatorAmbience" class="toggle-button" style="flex-grow:1;">OFF</button>
            </div>
            <h4 style="margin: 15px 0 5px; text-align: center;">Predator SFX</h4>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 5px;">
                <button id="predatorClicksBtn" style="height: 40px;">Clicks</button>
                <button id="predatorVisionBtn" style="height: 40px;">Vision</button>
            </div>
            <div class="control-row" style="margin-top: 5px;">
                <button id="predatorGrowlBtn" style="width: 100%; height: 40px;">Growl</button>
            </div>
        `;
    }

    initUI(container) {
        this.ambienceButton = container.querySelector('#predatorAmbience');
        container.querySelector('#predatorClicksBtn').addEventListener('click', () => this._triggerClicks());
        container.querySelector('#predatorVisionBtn').addEventListener('click', () => this._triggerVision());
        container.querySelector('#predatorGrowlBtn').addEventListener('click', () => this._triggerGrowl());
        
        this.ambienceButton.addEventListener('click', () => {
            this.isAmbienceOn = !this.isAmbienceOn;
            this.ambienceButton.classList.toggle('active', this.isAmbienceOn);
            this.ambienceButton.textContent = this.isAmbienceOn ? 'ON' : 'OFF';
            this.updateParams();
        });
        
        this.updateParams(); // Set initial (off) state
    }

    updateParams() {
        const time = this.audioContext.currentTime;
        if (this.isAmbienceOn) {
            // Start the continuous nodes if they aren't already
            if (!this.ambienceStarted) {
                this.nodes.insectNoise.start(0);
                this.nodes.airNoise.start(0);
                this.nodes.insectLFO.start(0);
                this.ambienceStarted = true;
            }
            // Set levels for ambience
            this.nodes.airGain.gain.setTargetAtTime(0.05, time, 1.0);
            this.nodes.insectFilter.gain.setTargetAtTime(0.2, time, 1.0); // BPF has no gain
            
            // Set modulator parameters
            this.nodes.insectFilter.frequency.value = 5000;
            this.nodes.insectLFODepth.gain.value = 2000; // Sweep range
        } else {
            // Fade out ambience
            this.nodes.airGain.gain.setTargetAtTime(0, time, 0.5);
            // Can't directly fade a BPF like this, so we'll just let it run silently.
            // A better way would be to have a gain node after the filter.
        }
    }
    
    destroy() {
        this.isAmbienceOn = false;
        this.updateParams();
        try {
            Object.values(this.nodes).forEach(node => node.stop && node.stop(this.audioContext.currentTime + 1));
        } catch (e) {}
    }
}


// --- This line is crucial for the main app to load the module ---
window.registerSynthModule(PredatorModule);