/**
 * Example Synth Module: An "Optimus Prime" Voice & SFX Generator.
 *
 * This module is a combination of a real-time voice changer and an SFX
 * generator. It processes a live microphone input to create the deep, noble
 * voice of Optimus Prime and provides a button to trigger the iconic
 * transformation sound.
 *
 * This module demonstrates:
 * - A voice changer focused on a "heroic" and "resonant" character.
 * - Deconstructing and synthesizing a complex, multi-layered mechanical sound effect.
 * - Combining live processing with a triggered SFX for a complete character toolkit.
 */
class OptimusPrimeModule {
    constructor(audioContext) {
        this.audioContext = audioContext;
        this.id = 'optimusPrimeModule';
        this.name = 'Optimus Prime';
        
        this.micSource = null;
        
        // --- Create Audio Nodes ---
        this.nodes = {
            input: this.audioContext.createGain(), // From mic
            output: this.audioContext.createGain(),
            
            // --- Voice Processing Chain ---
            pitchProcessor: this.audioContext.createScriptProcessor(1024, 1, 1),
            chestResonator: this.audioContext.createBiquadFilter(),
            reverb: this.audioContext.createConvolver(),
            reverbGate: this.audioContext.createGain(),
        };

        // Pitch shifter buffer
        this.pitchBuffer = new Float32Array(this.audioContext.sampleRate * 2);
        this.pitchWritePos = 0;

        // --- Configure Nodes ---
        this.nodes.chestResonator.type = 'peaking';
        this.nodes.chestResonator.frequency.value = 200;
        this.nodes.chestResonator.Q.value = 0.8;
        
        // Gated Reverb IR
        const ir = this.audioContext.createBuffer(2, this.audioContext.sampleRate * 1.5, this.audioContext.sampleRate);
        for(let c=0; c<2; c++) { let d = ir.getChannelData(c); for(let i=0; i<d.length; i++) d[i] = (Math.random()*2-1)*Math.pow(1-i/d.length, 2); }
        this.nodes.reverb.buffer = ir;

        // --- Connect Voice Graph ---
        // input -> Pitch Shifter -> Chest EQ -> Reverb -> Gated VCA -> Output
        // A dry signal is also mixed in.
        this.nodes.input.connect(this.nodes.pitchProcessor);
        
        const mainChain = this.nodes.pitchProcessor
            .connect(this.nodes.chestResonator);
            
        mainChain.connect(this.nodes.output); // Dry signal
        mainChain.connect(this.nodes.reverb).connect(this.nodes.reverbGate).connect(this.nodes.output); // Wet signal
        
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
    
    _processPitchShift(e) {
        const input = e.inputBuffer.getChannelData(0);
        const output = e.outputBuffer.getChannelData(0);
        const pitchRatio = Math.pow(2, -5 / 12); // Pitch down by 5 semitones
        
        for(let i=0; i<input.length; i++) {
            this.pitchBuffer[this.pitchWritePos] = input[i];
            this.pitchWritePos = (this.pitchWritePos + 1) % this.pitchBuffer.length;
        }
        let readPos = this.pitchWritePos;
        for(let i=0; i<output.length; i++) {
            output[i] = this.pitchBuffer[Math.floor(readPos)];
            readPos = (readPos - pitchRatio + this.pitchBuffer.length) % this.pitchBuffer.length;
        }
    }
    
    // --- SFX Generation ---
    _triggerTransform() {
        const now = this.audioContext.currentTime;
        const duration = 1.2;
        
        // --- Ratchet Clicks ---
        const clickInterval = 0.05;
        for (let i = 0; i < duration / clickInterval; i++) {
            const time = now + i * clickInterval;
            const noise = this.audioContext.createBufferSource();
            const buffer = this.audioContext.createBuffer(1, 441, this.audioContext.sampleRate);
            noise.buffer = buffer;
            const vca = this.audioContext.createGain();
            vca.gain.setValueAtTime(0.3, time);
            vca.gain.exponentialRampToValueAtTime(0.001, time + 0.04);
            const filter = this.audioContext.createBiquadFilter();
            filter.type = 'highpass';
            filter.frequency.value = 3000;
            noise.connect(filter).connect(vca).connect(this.nodes.output);
            noise.start(time);
        }
        
        // --- Servo Whine ---
        const servoOsc = this.audioContext.createOscillator();
        servoOsc.type = 'sawtooth';
        servoOsc.frequency.setValueAtTime(400, now);
        servoOsc.frequency.linearRampToValueAtTime(1200, now + duration * 0.5);
        servoOsc.frequency.linearRampToValueAtTime(600, now + duration);
        const servoVCA = this.audioContext.createGain();
        servoVCA.gain.setValueAtTime(0.2, now);
        servoVCA.gain.setTargetAtTime(0, now + duration, 0.05);
        servoOsc.connect(servoVCA).connect(this.nodes.output);
        servoOsc.start(now);
        servoOsc.stop(now + duration + 0.2);
        
        // --- Air Brake Hiss ---
        const airTime = now + duration;
        const airNoise = this.audioContext.createBufferSource();
        const airBuffer = this.audioContext.createBuffer(1, this.audioContext.sampleRate*0.5, this.audioContext.sampleRate);
        const airData = airBuffer.getChannelData(0);
        for(let i=0; i<airData.length; i++) airData[i] = Math.random() * 2 - 1;
        airNoise.buffer = airBuffer;
        const airVCA = this.audioContext.createGain();
        airVCA.gain.setValueAtTime(0.5, airTime);
        airVCA.gain.exponentialRampToValueAtTime(0.001, airTime + 0.3);
        airNoise.connect(airVCA).connect(this.nodes.output);
        airNoise.start(airTime);
    }
    
    getHTML() {
        return `
            <div class="control-row" style="margin-bottom:15px;">
                 <button id="primeMicBtn" style="flex-grow:1;">Connect Mic</button>
                 <span id="primeMicStatus" style="flex-grow:1; text-align:center;">Inactive</span>
            </div>
            <div class="control-row">
                <label for="primeChest">Chest Reso:</label>
                <input type="range" id="primeChest" min="-6" max="12" value="4" step="1">
                <span id="primeChestVal" class="value-display">4</span>
            </div>
            <div class="control-row">
                <label for="primeGate">Reverb Gate:</label>
                <input type="range" id="primeGate" min="0.05" max="0.5" value="0.2" step="0.01">
                <span id="primeGateVal" class="value-display">0.20</span>
            </div>
            <h4 style="margin: 15px 0 5px; text-align: center;">Autobots, Roll Out!</h4>
            <div class="control-row">
                <button id="primeTransformBtn" style="width: 100%; height: 50px;">Transform</button>
            </div>
        `;
    }

    initUI(container) {
        this.micButton = container.querySelector('#primeMicBtn');
        this.micStatus = container.querySelector('#primeMicStatus');
        this.transformButton = container.querySelector('#primeTransformBtn');
        this.chest = { slider: container.querySelector('#primeChest'), val: container.querySelector('#primeChestVal') };
        this.gate = { slider: container.querySelector('#primeGate'), val: container.querySelector('#primeGateVal') };

        this.micButton.addEventListener('click', () => this._getMic());
        this.transformButton.addEventListener('click', () => this._triggerTransform());
        
        const connect = (ctrl, decimals = 0) => {
            ctrl.slider.addEventListener('input', () => {
                ctrl.val.textContent = parseFloat(ctrl.slider.value).toFixed(decimals);
                this.updateParams();
            });
        };
        
        connect(this.chest, 0);
        connect(this.gate, 2);
        
        this.updateParams();
    }
    
    updateParams() {
        const time = this.audioContext.currentTime;
        
        const chestGain = parseFloat(this.chest.slider.value);
        this.nodes.chestResonator.gain.setTargetAtTime(chestGain, time, 0.02);
        
        // The reverb gate is controlled by an envelope when the mic signal passes a threshold.
        // For simplicity, we'll control its overall mix level here.
        const gateTime = parseFloat(this.gate.slider.value);
        this.nodes.reverbGate.gain.setTargetAtTime(0.3, time, 0.01); // A fixed mix level for the reverb
        // A full gate would require an envelope follower on the mic input.
    }
    
    destroy() {
        if (this.micSource) {
            this.micSource.disconnect();
            this.micSource.mediaStream.getTracks().forEach(track => track.stop());
        }
    }
}


// --- This line is crucial for the main app to load the module ---
window.registerSynthModule(OptimusPrimeModule);