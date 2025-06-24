/**
 * Example Synth Module: A Cinematic Soundtrack Toolkit.
 *
 * This module is a "composer's sketchpad" providing essential sounds for
 * modern cinematic and trailer music, including playable tension strings,
 * a sub boom, a riser, and a "braaam" impact.
 *
 * This module demonstrates:
 * - A toolkit approach, providing multiple related sounds in one module.
 * - Deconstructing and synthesizing several modern cinematic sound design tropes.
 * - Combining a playable instrument with one-shot, triggerable sound effects.
 */
class SoundtrackToolkitModule {
    constructor(audioContext) {
        this.audioContext = audioContext;
        this.id = 'soundtrackToolkitModule';
        this.name = 'Cinematic Toolkit';

        this.nodes = { input: this.audioContext.createGain(), output: this.audioContext.createGain() };
        this.activeVoices = new Map();
        this.isEnabled = false;
        this._patchNoteHandlers();
    }

    _patchNoteHandlers() {
        if (!window.playNote) return;
        const originalPlayNote = window.playNote.original || window.playNote;
        const originalStopNote = window.stopNote.original || window.stopNote;

        window.playNote = (noteId, freq, velocity, keyEl, isSeq, stepVol) => {
            if (this.isEnabled && !isSeq) this._playTensionString(noteId, freq, velocity);
            else originalPlayNote(noteId, freq, velocity, keyEl, isSeq, stepVol);
        };
        window.stopNote = (noteId, keyEl) => {
            if (this.isEnabled) this._stopTensionString(noteId);
            else originalStopNote(noteId, keyEl);
        };
        console.log("Cinematic Toolkit has patched note handlers.");
    }
    
    // --- Playable Instrument ---
    _playTensionString(noteId, freq, velocity) {
        if (this.activeVoices.has(noteId)) return;
        const now = this.audioContext.currentTime;
        const voice = {
            noise: this.audioContext.createBufferSource(),
            filter: this.audioContext.createBiquadFilter(),
            vca: this.audioContext.createGain(),
        };
        
        const noiseBuffer = this.audioContext.createBuffer(1, this.audioContext.sampleRate, this.audioContext.sampleRate);
        const data = noiseBuffer.getChannelData(0);
        for(let i=0; i<data.length; i++) data[i] = Math.random() * 2 - 1;
        voice.noise.buffer = noiseBuffer;
        voice.noise.loop = true;
        
        voice.filter.type = 'bandpass';
        voice.filter.frequency.value = freq;
        voice.filter.Q.value = 25;
        
        voice.noise.connect(voice.filter).connect(voice.vca).connect(this.nodes.output);
        
        voice.vca.gain.setValueAtTime(0, now);
        voice.vca.gain.linearRampToValueAtTime(0.4 * (velocity/127), now + 0.01);
        voice.vca.gain.setTargetAtTime(0, now + 0.01, 0.1);

        voice.noise.start(now);
        this.activeVoices.set(noteId, voice);
    }
    
    _stopTensionString(noteId) {
        const voice = this.activeVoices.get(noteId);
        if (voice) {
            const now = this.audioContext.currentTime;
            voice.vca.gain.cancelScheduledValues(now);
            voice.vca.gain.setTargetAtTime(0, now, 0.1);
            voice.noise.stop(now + 0.5);
            this.activeVoices.delete(noteId);
        }
    }
    
    // --- Triggered SFX ---
    _triggerSubBoom() {
        const now = this.audioContext.currentTime;
        const osc = this.audioContext.createOscillator();
        const vca = this.audioContext.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(120, now);
        osc.frequency.exponentialRampToValueAtTime(30, now + 1.5);
        vca.gain.setValueAtTime(0, now);
        vca.gain.linearRampToValueAtTime(0.9, now + 0.01);
        vca.gain.setTargetAtTime(0, now + 1.0, 0.5);
        osc.connect(vca).connect(this.nodes.output);
        osc.start(now);
        osc.stop(now + 3);
    }
    
    _triggerRiser() {
        const now = this.audioContext.currentTime;
        const duration = 4.0;
        const noise = this.audioContext.createBufferSource();
        noise.buffer = this.activeVoices.values().next().value?.noise.buffer; // Reuse a noise buffer
        if (!noise.buffer) return;
        noise.loop = true;
        
        const filter = this.audioContext.createBiquadFilter();
        filter.type = 'highpass';
        filter.Q.value = 5;
        filter.frequency.setValueAtTime(100, now);
        filter.frequency.exponentialRampToValueAtTime(8000, now + duration);
        
        const vca = this.audioContext.createGain();
        vca.gain.setValueAtTime(0, now);
        vca.gain.linearRampToValueAtTime(0.2, now + duration);
        
        noise.connect(filter).connect(vca).connect(this.nodes.output);
        noise.start(now);
        noise.stop(now + duration);
    }
    
    _triggerBraaam() {
        const now = this.audioContext.currentTime;
        const rootFreq = 55; // A1
        const chordRatios = [1, 1.5, 2.1]; // Dissonant cluster
        
        const master = this.audioContext.createGain();
        const distorter = this.audioContext.createWaveShaper();
        const reverb = this.audioContext.createConvolver();
        
        const curve = new Float32Array(257);
        for(let i=0;i<257;i++){const x=i*2/256-1;curve[i]=Math.tanh(x*4);}
        distorter.curve = curve;
        
        const ir = this.audioContext.createBuffer(2,this.audioContext.sampleRate*4,this.audioContext.sampleRate);
        for(let c=0;c<2;c++){let d=ir.getChannelData(c);for(let i=0;i<d.length;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/d.length,2);}
        reverb.buffer = ir;
        
        chordRatios.forEach(ratio => {
            const osc = this.audioContext.createOscillator();
            osc.type = 'sawtooth';
            osc.frequency.value = rootFreq * ratio;
            osc.detune.value = (Math.random() - 0.5) * 20;
            osc.connect(master);
            osc.start(now);
            osc.stop(now + 3);
        });
        
        master.connect(distorter).connect(reverb).connect(this.nodes.output);
        
        master.gain.setValueAtTime(0, now);
        master.gain.linearRampToValueAtTime(0.4, now + 1.5); // Slow swell
        master.gain.setTargetAtTime(0, now + 1.5, 1.0);
    }

    getHTML() {
        return `
            <div class="control-row" style="margin-bottom: 15px;">
                 <label for="tkEnable">Enable Strings:</label>
                 <button id="tkEnable" class="toggle-button" style="flex-grow:1;">OFF</button>
            </div>
            <p style="font-size: 0.85em; color: var(--color-text-secondary); text-align: center; margin-top: 5px;">
                Play keyboard for tension strings.
            </p>
            <h4 style="margin: 15px 0 5px; text-align: center;">Cinematic Hits</h4>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 5px;">
                <button id="tkBoomBtn" style="height: 40px;">Sub Boom</button>
                <button id="tkRiserBtn" style="height: 40px;">Riser</button>
            </div>
            <div class="control-row" style="margin-top: 5px;">
                <button id="tkBraaamBtn" style="width: 100%; height: 50px; color: var(--color-neon-pink); border-color: var(--color-neon-pink);">BRAAAM</button>
            </div>
        `;
    }

    initUI(container) {
        this.enableButton = container.querySelector('#tkEnable');
        container.querySelector('#tkBoomBtn').addEventListener('click', () => this._triggerSubBoom());
        container.querySelector('#tkRiserBtn').addEventListener('click', () => this._triggerRiser());
        container.querySelector('#tkBraaamBtn').addEventListener('click', () => this._triggerBraaam());

        this.enableButton.addEventListener('click', () => {
            this.isEnabled = !this.isEnabled;
            this.enableButton.classList.toggle('active');
            this.enableButton.textContent = this.isEnabled ? 'ON' : 'OFF';
            if (!this.isEnabled) this.activeVoices.forEach((v, id) => this._stopTensionString(id));
        });
    }
    
    updateParams() {}
}

// --- This line is crucial for the main app to load the module ---
if (typeof window.playNote === 'function' && typeof window.stopNote === 'function') {
    if (!window.playNote.original) window.playNote.original = window.playNote;
    if (!window.stopNote.original) window.stopNote.original = window.stopNote;
    window.registerSynthModule(SoundtrackToolkitModule);
} else {
    console.error("Cinematic Toolkit Module cannot be loaded: Required global note handlers not found.");
}