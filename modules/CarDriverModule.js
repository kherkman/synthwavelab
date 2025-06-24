/**
 * Example Synth Module: A "City Car Driver" Simulator.
 *
 * This module is a self-contained soundscape and SFX generator that puts the
 * user in the driver's seat of a car in a city. It features a controllable
 * engine sound, background city ambience with random sirens, and a car horn.
 *
 * This module demonstrates:
 * - A complete, interactive, and procedural audio environment.
 * - Linking a single UI control to multiple sound parameters for realism.
 * - Combining continuous soundscapes with triggered, interactive sound effects.
 */
class CarDriverModule {
    constructor(audioContext) {
        this.audioContext = audioContext;
        this.id = 'carDriverModule';
        this.name = 'City Car Driver';
        
        this.isEngineOn = false;
        this.sirenTimer = null;
        this.activeHorn = null;
        
        // --- Create Audio Nodes ---
        this.nodes = {
            input: this.audioContext.createGain(), // Unused
            output: this.audioContext.createGain(),
            
            // --- Engine Components ---
            engineOsc: this.audioContext.createOscillator(),
            engineFilter: this.audioContext.createBiquadFilter(),
            engineVCA: this.audioContext.createGain(),
            
            // --- Ambience Components ---
            cityRumble: this.audioContext.createBufferSource(),
            cityRumbleGain: this.audioContext.createGain(),
        };

        // --- Configure Engine Nodes ---
        this.nodes.engineOsc.type = 'sawtooth';
        this.nodes.engineFilter.type = 'lowpass';
        this.nodes.engineFilter.Q.value = 2;
        this.nodes.engineVCA.gain.value = 0; // Engine starts off

        // --- Configure Ambience Nodes ---
        const bufferSize = this.audioContext.sampleRate * 5;
        const noiseBuffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const data = noiseBuffer.getChannelData(0);
        let lastOut = 0;
        for (let i=0; i<bufferSize; i++) { lastOut = (lastOut + (0.02 * (Math.random()*2-1)))/1.02; data[i] = lastOut*3.5; }
        this.nodes.cityRumble.buffer = noiseBuffer;
        this.nodes.cityRumble.loop = true;
        this.nodes.cityRumble.connect(this.nodes.cityRumbleGain).connect(this.nodes.output);
        this.nodes.cityRumble.start();
        
        // --- Connect Engine Path ---
        this.nodes.engineOsc.connect(this.nodes.engineFilter);
        this.nodes.engineFilter.connect(this.nodes.engineVCA);
        this.nodes.engineVCA.connect(this.nodes.output);
    }
    
    _toggleEngine(start) {
        const now = this.audioContext.currentTime;
        if (start) {
            if (this.isEngineOn) return;
            this.isEngineOn = true;
            this.engineButton.classList.add('active');
            this.engineButton.textContent = "Engine ON";
            
            this.nodes.engineOsc = this.audioContext.createOscillator();
            this.nodes.engineOsc.type = 'sawtooth';
            this.nodes.engineOsc.connect(this.nodes.engineFilter);
            this.nodes.engineOsc.start(now);
            
            this.nodes.engineVCA.gain.setTargetAtTime(0.4, now, 0.1);
            this._scheduleSiren();
            this.updateParams(); // Apply initial slider positions
        } else {
            if (!this.isEngineOn) return;
            this.isEngineOn = false;
            this.engineButton.classList.remove('active');
            this.engineButton.textContent = "Start Ignition";
            
            this.nodes.engineVCA.gain.setTargetAtTime(0, now, 0.2);
            this.nodes.engineOsc.stop(now + 0.5);
            clearTimeout(this.sirenTimer);
        }
    }
    
    _triggerHorn(start) {
        const now = this.audioContext.currentTime;
        if (start) {
            if (this.activeHorn) return;
            const horn = {
                osc1: this.audioContext.createOscillator(),
                osc2: this.audioContext.createOscillator(),
                vca: this.audioContext.createGain(),
            };
            horn.osc1.type = 'square';
            horn.osc1.frequency.value = 440; // A4
            horn.osc2.type = 'square';
            horn.osc2.frequency.value = 554; // C#5 - a dissonant interval
            
            horn.osc1.connect(horn.vca);
            horn.osc2.connect(horn.vca);
            horn.vca.connect(this.nodes.output);
            
            horn.vca.gain.setValueAtTime(0, now);
            horn.vca.gain.linearRampToValueAtTime(0.3, now + 0.01);
            
            horn.osc1.start(now);
            horn.osc2.start(now);
            this.activeHorn = horn;
        } else {
            if (!this.activeHorn) return;
            this.activeHorn.vca.gain.setTargetAtTime(0, now, 0.05);
            this.activeHorn.osc1.stop(now + 0.1);
            this.activeHorn.osc2.stop(now + 0.1);
            this.activeHorn = null;
        }
    }
    
    _scheduleSiren() {
        if (!this.isEngineOn) return;
        const randomInterval = (8 + Math.random() * 15) * 1000;
        this.sirenTimer = setTimeout(() => {
            if (this.isEngineOn) { this._createSiren(); this._scheduleSiren(); }
        }, randomInterval);
    }
    
    _createSiren() {
        const now = this.audioContext.currentTime;
        const duration = 2.5;
        const osc = this.audioContext.createOscillator();
        const lfo = this.audioContext.createOscillator();
        const lfoDepth = this.audioContext.createGain();
        const panner = this.audioContext.createStereoPanner();
        const vca = this.audioContext.createGain();
        
        osc.type = 'sawtooth';
        osc.frequency.value = 800;
        lfo.type = 'sine';
        lfo.frequency.value = 7;
        lfoDepth.gain.value = 50;
        
        panner.pan.setValueAtTime(-1, now);
        panner.pan.linearRampToValueAtTime(1, now + duration);
        
        vca.gain.setValueAtTime(0, now);
        vca.gain.linearRampToValueAtTime(0.1, now + 0.5);
        vca.gain.linearRampToValueAtTime(0, now + duration);
        
        lfo.connect(lfoDepth).connect(osc.detune);
        osc.connect(panner).connect(vca).connect(this.nodes.output);
        
        lfo.start(now);
        osc.start(now);
        lfo.stop(now + duration);
        osc.stop(now + duration);
    }

    getHTML() {
        return `
            <div class="control-row" style="margin-bottom:15px;">
                <button id="carIgnitionBtn" class="toggle-button" style="width: 50%; height: 40px;">Start Ignition</button>
                <button id="carHornBtn" style="width: 50%; height: 40px;">Horn</button>
            </div>
            <div class="control-row">
                <label for="carAccelerator">Accelerator:</label>
                <input type="range" id="carAccelerator" min="0" max="1" value="0" step="0.01">
                <span id="carAcceleratorVal" class="value-display">0.00</span>
            </div>
            <div class="control-row">
                <label for="carAmbience">City Ambience:</label>
                <input type="range" id="carAmbience" min="0" max="0.1" value="0.03" step="0.001">
                <span id="carAmbienceVal" class="value-display">0.030</span>
            </div>
        `;
    }

    initUI(container) {
        this.engineButton = container.querySelector('#carIgnitionBtn');
        this.hornButton = container.querySelector('#carHornBtn');
        this.accelerator = { slider: container.querySelector('#carAccelerator'), val: container.querySelector('#carAcceleratorVal') };
        this.ambience = { slider: container.querySelector('#carAmbience'), val: container.querySelector('#carAmbienceVal') };
        
        this.engineButton.addEventListener('click', () => this._toggleEngine(!this.isEngineOn));
        
        this.hornButton.addEventListener('mousedown', () => this._triggerHorn(true));
        this.hornButton.addEventListener('mouseup', () => this._triggerHorn(false));
        this.hornButton.addEventListener('mouseleave', () => this._triggerHorn(false));
        this.hornButton.addEventListener('touchstart', (e)=>{e.preventDefault();this._triggerHorn(true);});
        this.hornButton.addEventListener('touchend', (e)=>{e.preventDefault();this._triggerHorn(false);});
        
        this.accelerator.slider.addEventListener('input', () => {
            this.accelerator.val.textContent = parseFloat(this.accelerator.slider.value).toFixed(2);
            this.updateParams();
        });
        this.ambience.slider.addEventListener('input', () => {
            this.ambience.val.textContent = parseFloat(this.ambience.slider.value).toFixed(3);
            this.updateParams();
        });
        
        this.updateParams(); // Set initial ambience level
    }
    
    updateParams() {
        const time = this.audioContext.currentTime;
        
        // Update ambience level
        const ambienceLevel = parseFloat(this.ambience.slider.value);
        this.nodes.cityRumbleGain.gain.setTargetAtTime(ambienceLevel, time, 0.5);

        // Update engine params only if engine is on
        if (this.isEngineOn) {
            const accel = parseFloat(this.accelerator.slider.value);
            // Map acceleration (0-1) to RPM (e.g., 40Hz to 150Hz)
            const engineFreq = 40 + (accel * 110);
            // Map acceleration to filter cutoff (e.g., 300Hz to 4000Hz)
            const filterFreq = 300 + (accel * 3700);
            
            this.nodes.engineOsc.frequency.setTargetAtTime(engineFreq, time, 0.05);
            this.nodes.engineFilter.frequency.setTargetAtTime(filterFreq, time, 0.05);
        }
    }
    
    destroy() {
        if (this.isEngineOn) this._toggleEngine(false);
    }
}

// --- This line is crucial for the main app to load the module ---
window.registerSynthModule(CarDriverModule);