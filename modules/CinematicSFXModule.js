/**
 * Example Synth Module: A Cinematic SFX Toolkit.
 *
 * This module is a self-contained sound effects generator for creating the
 * core sounds of modern cinematic and trailer music: risers, downers,
 * impacts, and whooshes.
 *
 * This module demonstrates:
 * - A toolkit for professional-grade sound design.
 * - Deconstructing and synthesizing several complex, iconic sound effects.
 * - Advanced use of envelopes and modulation to create a sense of motion and impact.
 */
class CinematicSFXModule {
    constructor(audioContext) {
        this.audioContext = audioContext;
        this.id = 'cinematicSFXModule';
        this.name = 'Cinematic SFX';
        this.nodes = { input: this.audioContext.createGain(), output: this.audioContext.createGain() };
    }
    
    _triggerRiser() {
        const now = this.audioContext.currentTime;
        const duration = parseFloat(this.duration.slider.value);

        // --- Tonal Layer ---
        const osc = this.audioContext.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(100, now);
        osc.frequency.exponentialRampToValueAtTime(2000, now + duration);
        const oscVCA = this.audioContext.createGain();
        oscVCA.gain.setValueAtTime(0, now);
        oscVCA.gain.linearRampToValueAtTime(0.2, now + duration);
        osc.connect(oscVCA).connect(this.nodes.output);
        
        // --- Noise Layer ---
        const noise = this.audioContext.createBufferSource();
        noise.buffer = this.audioContext.createBuffer(1, this.audioContext.sampleRate*duration, this.audioContext.sampleRate);
        noise.loop = true;
        const noiseFilter = this.audioContext.createBiquadFilter();
        noiseFilter.type = 'highpass';
        noiseFilter.frequency.setValueAtTime(200, now);
        noiseFilter.frequency.exponentialRampToValueAtTime(8000, now + duration);
        const noiseVCA = this.audioContext.createGain();
        noiseVCA.gain.setValueAtTime(0, now);
        noiseVCA.gain.linearRampToValueAtTime(0.15, now + duration);
        noise.connect(noiseFilter).connect(noiseVCA).connect(this.nodes.output);
        
        osc.start(now); noise.start(now);
        osc.stop(now + duration); noise.stop(now + duration);
    }
    
    _triggerDowner() {
        const now = this.audioContext.currentTime;
        const duration = parseFloat(this.duration.slider.value);
        
        const osc = this.audioContext.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.exponentialRampToValueAtTime(40, now + duration);
        const vca = this.audioContext.createGain();
        vca.gain.setValueAtTime(0.4, now);
        vca.gain.exponentialRampToValueAtTime(0.001, now + duration);
        
        const filter = this.audioContext.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(4000, now);
        filter.frequency.exponentialRampToValueAtTime(200, now + duration);
        
        osc.connect(filter).connect(vca).connect(this.nodes.output);
        osc.start(now); osc.stop(now + duration);
    }

    _triggerImpact() {
        const now = this.audioContext.currentTime;
        const reverb = this.audioContext.createConvolver();
        const ir = this.audioContext.createBuffer(2,this.audioContext.sampleRate*4,this.audioContext.sampleRate);
        for(let c=0; c<2; c++){ let d=ir.getChannelData(c); for(let i=0; i<d.length; i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/d.length,2);}
        reverb.buffer = ir;
        reverb.connect(this.nodes.output);

        // --- Sub Boom ---
        const sub = this.audioContext.createOscillator();
        sub.type = 'sine';
        sub.frequency.setValueAtTime(120, now);
        sub.frequency.exponentialRampToValueAtTime(30, now + 0.5);
        const subVCA = this.audioContext.createGain();
        subVCA.gain.setValueAtTime(0.9, now);
        subVCA.gain.exponentialRampToValueAtTime(0.01, now + 1.0);
        sub.connect(subVCA).connect(reverb);
        sub.start(now); sub.stop(now + 1.5);
        
        // --- Metallic Clang ---
        const clang = this.audioContext.createOscillator();
        clang.type = 'square';
        clang.frequency.value = 440;
        const clangMod = this.audioContext.createOscillator();
        clangMod.frequency.value = 440 * 2.76;
        const clangModDepth = this.audioContext.createGain();
        clangModDepth.gain.value = 1000;
        clangMod.connect(clangModDepth).connect(clang.frequency);
        const clangVCA = this.audioContext.createGain();
        clangVCA.gain.setValueAtTime(0.3, now);
        clangVCA.gain.exponentialRampToValueAtTime(0.01, now + 1.2);
        clang.connect(clangVCA).connect(reverb);
        clang.start(now); clangMod.start(now);
        clang.stop(now+1.5); clangMod.stop(now+1.5);
    }
    
    _triggerWhoosh() {
        const now = this.audioContext.currentTime;
        const duration = 0.4;
        const noise = this.audioContext.createBufferSource();
        const buffer = this.audioContext.createBuffer(1,this.audioContext.sampleRate*duration,this.audioContext.sampleRate);
        noise.buffer = buffer;
        const filter = this.audioContext.createBiquadFilter();
        filter.type = 'bandpass';
        filter.Q.value = 8;
        filter.frequency.setValueAtTime(100, now);
        filter.frequency.exponentialRampToValueAtTime(8000, now + duration);
        const panner = this.audioContext.createStereoPanner();
        panner.pan.setValueAtTime(-1, now);
        panner.pan.linearRampToValueAtTime(1, now + duration);
        const vca = this.audioContext.createGain();
        vca.gain.setValueAtTime(0.5, now);
        vca.gain.setTargetAtTime(0, now + duration - 0.05, 0.02);
        noise.connect(filter).connect(panner).connect(vca).connect(this.nodes.output);
        noise.start(now, Math.random()*0.1, duration);
    }

    getHTML() {
        return `
            <div class="control-row">
                <label for="sfxDuration">Duration (s):</label>
                <input type="range" id="sfxDuration" min="1.0" max="8.0" value="4.0" step="0.1">
                <span id="sfxDurationVal" class="value-display">4.0</span>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 15px;">
                <button id="sfxRiserBtn" style="height: 50px;">Riser</button>
                <button id="sfxDownerBtn" style="height: 50px;">Downer</button>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 10px;">
                 <button id="sfxWhooshBtn" style="height: 50px;">Whoosh</button>
                 <button id="sfxImpactBtn" style="height: 50px; color: var(--color-neon-pink); border-color: var(--color-neon-pink);">Impact</button>
            </div>
        `;
    }

    initUI(container) {
        this.duration = { slider: container.querySelector('#sfxDuration'), val: container.querySelector('#sfxDurationVal') };
        container.querySelector('#sfxRiserBtn').addEventListener('click', () => this._triggerRiser());
        container.querySelector('#sfxDownerBtn').addEventListener('click', () => this._triggerDowner());
        container.querySelector('#sfxImpactBtn').addEventListener('click', () => this._triggerImpact());
        container.querySelector('#sfxWhooshBtn').addEventListener('click', () => this._triggerWhoosh());
        
        this.duration.slider.addEventListener('input', () => {
            this.duration.val.textContent = parseFloat(this.duration.slider.value).toFixed(1);
        });
    }
    
    updateParams() {}
}


// --- This line is crucial for the main app to load the module ---
window.registerSynthModule(CinematicSFXModule);