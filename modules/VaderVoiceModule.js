/**
 * Example Synth Module: A "Darth Vader" Voice & Respiration Simulator.
 *
 * This module is a combination of a real-time voice changer and a sound
 * effects generator. It processes a live microphone input to create Darth
 * Vader's deep, modulated voice, and provides a button to trigger his
 * iconic mechanical breathing.
 *
 * This module demonstrates:
 * - A complex voice changer effect chain (pitch shift, ring mod, gate).
 * - A procedural SFX generator for a multi-part, narrative sound effect.
 * - Combining a live processor and a triggered SFX board in one module.
 */
class VaderVoiceModule {
    constructor(audioContext) {
        this.audioContext = audioContext;
        this.id = 'vaderVoiceModule';
        this.name = 'Vader';
        
        this.micSource = null;
        
        // --- Create Audio Nodes ---
        this.nodes = {
            input: this.audioContext.createGain(), // From mic
            output: this.audioContext.createGain(),
            
            // --- Voice Processing Chain ---
            // We'll use a granular pitch shifter for cleaner results.
            pitchProcessor: this.audioContext.createScriptProcessor(1024, 1, 1),
            ringMod: this.audioContext.createGain(),
            ringModCarrier: this.audioContext.createOscillator(),
            gate: this.audioContext.createDynamicsCompressor(),
        };

        // Pitch shifter buffer
        this.pitchBuffer = new Float32Array(this.audioContext.sampleRate * 2);
        this.pitchWritePos = 0;

        // --- Configure Nodes ---
        this.nodes.ringModCarrier.type = 'sine';
        this.nodes.ringModCarrier.frequency.value = 30;
        this.nodes.gate.threshold.value = -50;
        this.nodes.gate.ratio.value = 20;

        // --- Connect Voice Graph ---
        // input -> Pitch Shifter -> Ring Mod -> Gate -> Output
        this.nodes.input.connect(this.nodes.pitchProcessor);
        this.nodes.pitchProcessor.connect(this.nodes.ringMod);
        this.nodes.ringModCarrier.connect(this.nodes.ringMod.gain);
        this.nodes.ringMod.connect(this.nodes.gate);
        this.nodes.gate.connect(this.nodes.output);
        
        this.nodes.ringModCarrier.start();
        this.nodes.pitchProcessor.onaudioprocess = this._processPitchShift.bind(this);
    }
    
    async _getMic() {
        if (this.micSource) return;
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            this.micSource = this.audioContext.createMediaStreamSource(stream);
            this.micSource.connect(this.nodes.input);
            this.micStatus.textContent = "Mic Active";
            this.micStatus.style.color = 'var(--color-neon-green)';
        } catch (err) {
            this.micStatus.textContent = "Mic Denied";
            this.micStatus.style.color = 'var(--color-neon-pink)';
        }
    }
    
    // --- Simple granular pitch shifter ---
    _processPitchShift(e) {
        const input = e.inputBuffer.getChannelData(0);
        const output = e.outputBuffer.getChannelData(0);
        const pitchRatio = Math.pow(2, parseFloat(this.pitch.slider.value) / 12);
        
        // Write new data to our circular buffer
        for(let i=0; i<input.length; i++) {
            this.pitchBuffer[this.pitchWritePos] = input[i];
            this.pitchWritePos = (this.pitchWritePos + 1) % this.pitchBuffer.length;
        }

        // Read from the buffer at a different speed
        let readPos = this.pitchWritePos;
        for(let i=0; i<output.length; i++) {
            const readIndex = Math.floor(readPos);
            output[i] = this.pitchBuffer[readIndex];
            readPos = (readPos - pitchRatio + this.pitchBuffer.length) % this.pitchBuffer.length;
        }
    }
    
    // --- SFX Generation ---
    _triggerBreathe() {
        const now = this.audioContext.currentTime;
        
        // --- Part 1: The "ksssh" Inhale ---
        const inhaleNoise = this.audioContext.createBufferSource();
        const buffer = this.audioContext.createBuffer(1, this.audioContext.sampleRate * 1, this.audioContext.sampleRate);
        const data = buffer.getChannelData(0);
        for(let i=0; i<data.length; i++) data[i] = Math.random() * 2 - 1;
        inhaleNoise.buffer = buffer;
        
        const inhaleFilter = this.audioContext.createBiquadFilter();
        inhaleFilter.type = 'highpass';
        inhaleFilter.frequency.value = 2000;
        
        const inhaleVCA = this.audioContext.createGain();
        inhaleVCA.gain.setValueAtTime(0, now);
        inhaleVCA.gain.linearRampToValueAtTime(0.6, now + 0.1);
        inhaleVCA.gain.linearRampToValueAtTime(0, now + 0.6);
        
        inhaleNoise.connect(inhaleFilter).connect(inhaleVCA).connect(this.nodes.output);
        inhaleNoise.start(now);
        inhaleNoise.stop(now + 1);
        
        // --- Part 2: The "koooh" Exhale ---
        const exhaleTime = now + 0.7;
        const exhaleNoise = this.audioContext.createBufferSource();
        exhaleNoise.buffer = buffer;
        
        const exhaleFilter = this.audioContext.createBiquadFilter();
        exhaleFilter.type = 'lowpass';
        exhaleFilter.frequency.value = 800;
        
        const exhaleVCA = this.audioContext.createGain();
        exhaleVCA.gain.setValueAtTime(0, exhaleTime);
        exhaleVCA.gain.linearRampToValueAtTime(0.5, exhaleTime + 0.2);
        exhaleVCA.gain.exponentialRampToValueAtTime(0.001, exhaleTime + 1.2);
        
        exhaleNoise.connect(exhaleFilter).connect(exhaleVCA).connect(this.nodes.output);
        exhaleNoise.start(exhaleTime);
        exhaleNoise.stop(exhaleTime + 1.5);
    }
    
    getHTML() {
        return `
            <div class="control-row" style="margin-bottom:15px;">
                 <button id="vaderMicBtn" style="flex-grow:1;">Connect Mic</button>
                 <span id="vaderMicStatus" style="flex-grow:1; text-align:center;">Inactive</span>
            </div>
            <div class="control-row">
                <label for="vaderPitch">Pitch Shift:</label>
                <input type="range" id="vaderPitch" min="-12" max="0" value="-8" step="0.1">
                <span id="vaderPitchVal" class="value-display">-8.0</span>
            </div>
            <div class="control-row">
                <label for="vaderRingMod">Ring Mod:</label>
                <input type="range" id="vaderRingMod" min="0" max="0.2" value="0.05" step="0.001">
                <span id="vaderRingModVal" class="value-display">0.050</span>
            </div>
            <h4 style="margin: 15px 0 5px; text-align: center;">Respirator</h4>
            <div class="control-row">
                <button id="vaderBreatheBtn" style="width: 100%; height: 50px;">Breathe</button>
            </div>
        `;
    }

    initUI(container) {
        this.micButton = container.querySelector('#vaderMicBtn');
        this.micStatus = container.querySelector('#vaderMicStatus');
        this.breatheButton = container.querySelector('#vaderBreatheBtn');
        this.pitch = { slider: container.querySelector('#vaderPitch'), val: container.querySelector('#vaderPitchVal') };
        this.ringMod = { slider: container.querySelector('#vaderRingMod'), val: container.querySelector('#vaderRingModVal') };

        this.micButton.addEventListener('click', () => this._getMic());
        this.breatheButton.addEventListener('click', () => this._triggerBreathe());
        
        const connect = (ctrl, decimals = 1) => {
            ctrl.slider.addEventListener('input', () => {
                ctrl.val.textContent = parseFloat(ctrl.slider.value).toFixed(decimals);
                this.updateParams();
            });
        };
        
        connect(this.pitch, 1);
        connect(this.ringMod, 3);
        
        this.updateParams();
    }
    
    updateParams() {
        const time = this.audioContext.currentTime;
        const ringModGain = parseFloat(this.ringMod.slider.value);
        this.nodes.ringMod.gain.setTargetAtTime(ringModGain, time, 0.01);
        // Pitch is read live by the script processor.
    }
    
    destroy() {
        if (this.micSource) {
            this.micSource.disconnect();
            this.micSource.mediaStream.getTracks().forEach(track => track.stop());
        }
    }
}


// --- This line is crucial for the main app to load the module ---
window.registerSynthModule(VaderVoiceModule);