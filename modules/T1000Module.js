/**
 * Example Synth Module: A "T-1000" Liquid Metal Sound Generator.
 *
 * This module is a combination of a generative soundscape and a real-time
 * effects processor, designed to simulate the sounds of the T-1000 from
 * "Terminator 2," including its liquid metal form and blade weapons.
 *
 * This module demonstrates:
 * - Granular synthesis for creating an amorphous, evolving texture.
 * - A complex effects chain for real-time processing.
 * - A dynamic, performance-oriented sound effect trigger.
 */
class T1000Module {
    constructor(audioContext) {
        this.audioContext = audioContext;
        this.id = 't1000Module';
        this.name = 'Liquid Metal';

        // --- Nodes for processing main synth audio ---
        this.nodes = {
            input: this.audioContext.createGain(),
            output: this.audioContext.createGain(),
            flanger: this.audioContext.createDelay(0.05),
            bladeFilter: this.audioContext.createBiquadFilter(),
            dryGain: this.audioContext.createGain(),
            wetGain: this.audioContext.createGain(),
        };

        // --- Ambience Components ---
        this.isAmbienceOn = false;
        this.ambienceTimer = null;
        this._createMetalSourceBuffer();

        // --- Processor State ---
        this.isMimicOn = false;
    }
    
    // Create a source buffer for the granular engine
    async _createMetalSourceBuffer() {
        const duration = 0.5;
        const sampleRate = this.audioContext.sampleRate;
        const offlineCtx = new OfflineAudioContext(1, sampleRate * duration, sampleRate);
        
        // Synthesize a metallic clang
        const ratios = [1, 2.76, 5.4, 8.93];
        ratios.forEach(ratio => {
            const osc = offlineCtx.createOscillator();
            const vca = offlineCtx.createGain();
            osc.type = 'square';
            osc.frequency.value = 220 * ratio;
            vca.gain.setValueAtTime(1, 0);
            vca.gain.exponentialRampToValueAtTime(0.001, 0.4);
            osc.connect(vca).connect(offlineCtx.destination);
            osc.start(0);
        });

        this.metalBuffer = await offlineCtx.startRendering();
    }
    
    // --- Ambience ---
    _toggleAmbience(enable) {
        this.isAmbienceOn = enable;
        if (enable) {
            this._scheduleGrain();
        } else {
            clearTimeout(this.ambienceTimer);
        }
    }

    _scheduleGrain() {
        if (!this.isAmbienceOn) return;
        this._createGrain();
        const randomInterval = 50 + Math.random() * 100; // Fast, overlapping grains
        this.ambienceTimer = setTimeout(() => this._scheduleGrain(), randomInterval);
    }
    
    _createGrain() {
        if (!this.metalBuffer) return;
        const now = this.audioContext.currentTime;
        const source = this.audioContext.createBufferSource();
        source.buffer = this.metalBuffer;
        
        const vca = this.audioContext.createGain();
        const panner = this.audioContext.createStereoPanner();
        
        const grainDur = 0.2 + Math.random() * 0.3;
        const startPos = Math.random() * (this.metalBuffer.duration - grainDur);
        source.playbackRate.value = 0.5 + Math.random();
        panner.pan.value = Math.random() * 2 - 1;
        
        vca.gain.setValueAtTime(0, now);
        vca.gain.linearRampToValueAtTime(0.1, now + grainDur * 0.5);
        vca.gain.linearRampToValueAtTime(0, now + grainDur);
        
        source.connect(panner).connect(vca).connect(this.nodes.output);
        source.start(now, startPos, grainDur * 2);
        source.stop(now + grainDur + 0.1);
    }

    // --- Processor ---
    _toggleMimic(enable) {
        this.isMimicOn = enable;
        this.nodes.input.disconnect();
        if (enable) {
            // Route audio through the effects chain
            const flangerLFO = this.audioContext.createOscillator();
            flangerLFO.type='sine'; flangerLFO.frequency.value = 0.5;
            const flangerDepth = this.audioContext.createGain();
            flangerDepth.gain.value = 0.005;
            this.nodes.flanger.delayTime.value = 0.01;
            flangerLFO.connect(flangerDepth).connect(this.nodes.flanger.delayTime);
            flangerLFO.start();

            this.nodes.bladeFilter.type = 'bandpass'; this.nodes.bladeFilter.Q.value = 10;
            this.nodes.bladeFilter.frequency.value = 1000;
            
            this.nodes.input.connect(this.nodes.dryGain).connect(this.nodes.output);
            this.nodes.input.connect(this.nodes.flanger).connect(this.nodes.bladeFilter).connect(this.nodes.wetGain).connect(this.nodes.output);
            this.updateParams();
        } else {
            // Bypass effects
            this.nodes.input.connect(this.nodes.output);
        }
    }
    
    _formBlade() {
        if (!this.isMimicOn) return;
        const now = this.audioContext.currentTime;
        this.nodes.bladeFilter.frequency.cancelScheduledValues(now);
        this.nodes.bladeFilter.frequency.setTargetAtTime(8000, now, 0.02);
    }
    
    _releaseBlade() {
        if (!this.isMimicOn) return;
        const now = this.audioContext.currentTime;
        this.nodes.bladeFilter.frequency.cancelScheduledValues(now);
        this.nodes.bladeFilter.frequency.setTargetAtTime(1000, now, 0.1);
    }

    getHTML() {
        return `
            <div class="control-row" style="margin-bottom: 15px;">
                 <label for="t1kAmbience">Liquid Metal:</label>
                 <button id="t1kAmbience" class="toggle-button" style="flex-grow:1;">OFF</button>
            </div>
            <h4 style="margin: 15px 0 5px; text-align: center;">Mimic / Weapon</h4>
            <div class="control-row" style="margin-bottom: 10px;">
                 <label for="t1kMimic">Processor:</label>
                 <button id="t1kMimic" class="toggle-button" style="flex-grow:1;">OFF</button>
            </div>
            <div class="control-row">
                 <button id="t1kBladeBtn" style="width: 100%; height: 40px;">Form Blade</button>
            </div>
        `;
    }

    initUI(container) {
        this.ambienceButton = container.querySelector('#t1kAmbience');
        this.mimicButton = container.querySelector('#t1kMimic');
        this.bladeButton = container.querySelector('#t1kBladeBtn');
        
        this.ambienceButton.addEventListener('click', () => {
            const willBeOn = !this.ambienceButton.classList.contains('active');
            this.ambienceButton.classList.toggle('active', willBeOn);
            this.ambienceButton.textContent = willBeOn ? 'ON' : 'OFF';
            this._toggleAmbience(willBeOn);
        });
        
        this.mimicButton.addEventListener('click', () => {
            const willBeOn = !this.mimicButton.classList.contains('active');
            this.mimicButton.classList.toggle('active', willBeOn);
            this.mimicButton.textContent = willBeOn ? 'ON' : 'OFF';
            this._toggleMimic(willBeOn);
        });
        
        this.bladeButton.addEventListener('mousedown', () => this._formBlade());
        this.bladeButton.addEventListener('mouseup', () => this._releaseBlade());
        this.bladeButton.addEventListener('mouseleave', () => this._releaseBlade());
        this.bladeButton.addEventListener('touchstart', e=>{e.preventDefault();this._formBlade();});
        this.bladeButton.addEventListener('touchend', e=>{e.preventDefault();this._releaseBlade();});
        
        this._toggleMimic(false); // Initialize with bypass
    }
    
    updateParams() {
        if (this.isMimicOn) {
            const time = this.audioContext.currentTime;
            this.nodes.wetGain.gain.setTargetAtTime(0.5, time, 0.01);
            this.nodes.dryGain.gain.setTargetAtTime(0.5, time, 0.01);
        }
    }
    
    destroy() {
        this._toggleAmbience(false);
    }
}


// --- This line is crucial for the main app to load the module ---
window.registerSynthModule(T1000Module);