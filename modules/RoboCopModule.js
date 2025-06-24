/**
 * Example Synth Module: A "RoboCop" Voice & SFX Generator.
 *
 * This module has two modes:
 * 1. A voice changer that processes microphone input to sound like RoboCop.
 * 2. A sound effect generator that creates the sound of his Auto-9 pistol.
 *
 * This module demonstrates:
 * - A multi-mode module with a switchable UI and audio graph.
 * - Combining a real-time effects processor with a procedural sound generator.
 * - Deconstructing and synthesizing multiple iconic sounds from a single source.
 */
class RoboCopModule {
    constructor(audioContext) {
        this.audioContext = audioContext;
        this.id = 'roboCopModule';
        this.name = 'RoboCop';
        
        this.micSource = null;
        this.isVoiceMode = true;

        // --- Create Audio Nodes ---
        // These nodes are for the voice processing chain.
        this.nodes = {
            input: this.audioContext.createGain(), // Will connect to the mic
            output: this.audioContext.createGain(),
            
            dryGain: this.audioContext.createGain(),
            wetGain: this.audioContext.createGain(),
            
            // A very short "slapback" delay for the metallic quality
            slapDelay: this.audioContext.createDelay(0.1),
            
            // A subtle flanger for the robotic, phasey quality
            flanger: this.audioContext.createDelay(0.05),
            flangerLFO: this.audioContext.createOscillator(),
            flangerLFODepth: this.audioContext.createGain(),
            flangerFeedback: this.audioContext.createGain(),
        };

        // --- Configure Nodes ---
        this.nodes.flangerLFO.type = 'sine';
        this.nodes.flangerLFO.frequency.value = 0.15; // Very slow sweep
        
        // --- Connect Voice Processing Graph ---
        this.nodes.input.connect(this.nodes.dryGain);
        this.nodes.dryGain.connect(this.nodes.output);

        // Wet path: input -> slap delay -> flanger -> wetGain -> output
        this.nodes.input.connect(this.nodes.slapDelay);
        this.nodes.slapDelay.connect(this.nodes.flanger);
        this.nodes.flanger.connect(this.nodes.flangerFeedback).connect(this.nodes.flanger);
        this.nodes.flangerLFO.connect(this.nodes.flangerLFODepth).connect(this.nodes.flanger.delayTime);
        this.nodes.flanger.connect(this.nodes.wetGain);
        this.nodes.wetGain.connect(this.nodes.output);
        
        this.nodes.flangerLFO.start();
    }
    
    async _getMic() {
        if (this.micSource) return;
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
            this.micSource = this.audioContext.createMediaStreamSource(stream);
            this.micSource.connect(this.nodes.input);
            this.micStatus.textContent = "Mic Connected";
            this.micStatus.style.color = 'var(--color-neon-green)';
        } catch (err) {
            this.micStatus.textContent = "Mic Access Denied";
            this.micStatus.style.color = 'var(--color-neon-pink)';
        }
    }
    
    /**
     * Generates the 3-round burst of the Auto-9 pistol.
     * @private
     */
    _fireWeapon() {
        const now = this.audioContext.currentTime;
        const burstInterval = 0.08; // Time between shots in the burst

        for (let i = 0; i < 3; i++) {
            const fireTime = now + (i * burstInterval);
            
            // Layer 1: The sharp "crack"
            const crackNoise = this.audioContext.createBufferSource();
            const buffer = this.audioContext.createBuffer(1, this.audioContext.sampleRate * 0.1, this.audioContext.sampleRate);
            const data = buffer.getChannelData(0);
            for(let j=0; j<data.length; j++) data[j] = Math.random() * 2 - 1;
            crackNoise.buffer = buffer;
            
            const crackFilter = this.audioContext.createBiquadFilter();
            crackFilter.type = 'bandpass';
            crackFilter.frequency.value = 3000;
            crackFilter.Q.value = 2;
            
            const crackVCA = this.audioContext.createGain();
            crackVCA.gain.setValueAtTime(1.0, fireTime);
            crackVCA.gain.exponentialRampToValueAtTime(0.001, fireTime + 0.1);
            
            crackNoise.connect(crackFilter).connect(crackVCA).connect(this.nodes.output);
            crackNoise.start(fireTime);
            crackNoise.stop(fireTime + 0.15);

            // Layer 2: The low-end "thump"
            const thumpOsc = this.audioContext.createOscillator();
            thumpOsc.type = 'triangle';
            thumpOsc.frequency.value = 100;
            const thumpVCA = this.audioContext.createGain();
            thumpVCA.gain.setValueAtTime(0.8, fireTime);
            thumpVCA.gain.exponentialRampToValueAtTime(0.001, fireTime + 0.12);
            thumpOsc.connect(thumpVCA).connect(this.nodes.output);
            thumpOsc.start(fireTime);
            thumpOsc.stop(fireTime + 0.15);
        }
    }

    getHTML() {
        return `
            <div class="control-row" style="margin-bottom:15px; display: grid; grid-template-columns: 1fr 1fr; gap: 5px;">
                 <button id="rcModeVoice" class="toggle-button active" style="text-transform: none;">Voice Mode</button>
                 <button id="rcModeSfx" class="toggle-button" style="text-transform: none;">SFX Mode</button>
            </div>
            <!-- SFX UI (Initially Hidden) -->
            <div id="rcSfxUi" style="display:none;">
                 <button id="rcFireBtn" style="width: 100%; height: 50px; font-size: 1.2em; color: var(--color-neon-pink); border-color: var(--color-neon-pink);">FIRE AUTO-9</button>
            </div>
            <!-- Voice UI (Initially Shown) -->
            <div id="rcVoiceUi">
                <div class="control-row">
                     <button id="rcMicBtn" style="flex-grow:1;">Connect Mic</button>
                     <span id="rcMicStatus" style="flex-grow:1; text-align:center; color:var(--color-text-secondary);">Inactive</span>
                </div>
                <div class="control-row">
                    <label for="rcSlapback">Slapback (ms):</label>
                    <input type="range" id="rcSlapback" min="10" max="80" value="30" step="1">
                    <span id="rcSlapbackVal" class="value-display">30</span>
                </div>
                <div class="control-row">
                    <label for="rcFlangeRate">Flange Rate:</label>
                    <input type="range" id="rcFlangeRate" min="0.05" max="0.5" value="0.15" step="0.01">
                    <span id="rcFlangeRateVal" class="value-display">0.15</span>
                </div>
            </div>
        `;
    }

    initUI(container) {
        // Mode Buttons
        this.voiceModeButton = container.querySelector('#rcModeVoice');
        this.sfxModeButton = container.querySelector('#rcModeSfx');
        this.voiceUi = container.querySelector('#rcVoiceUi');
        this.sfxUi = container.querySelector('#rcSfxUi');

        // SFX Controls
        this.fireButton = container.querySelector('#rcFireBtn');
        
        // Voice Controls
        this.micButton = container.querySelector('#rcMicBtn');
        this.micStatus = container.querySelector('#rcMicStatus');
        this.slapback = { slider: container.querySelector('#rcSlapback'), val: container.querySelector('#rcSlapbackVal') };
        this.flangeRate = { slider: container.querySelector('#rcFlangeRate'), val: container.querySelector('#rcFlangeRateVal') };
        
        // --- Event Listeners ---
        this.voiceModeButton.addEventListener('click', () => this.setMode(true));
        this.sfxModeButton.addEventListener('click', () => this.setMode(false));
        
        this.fireButton.addEventListener('click', () => this._fireWeapon());
        this.micButton.addEventListener('click', () => this._getMic());
        
        this.slapback.slider.addEventListener('input', () => {
            this.slapback.val.textContent = this.slapback.slider.value;
            this.updateParams();
        });
        this.flangeRate.slider.addEventListener('input', () => {
            this.flangeRate.val.textContent = parseFloat(this.flangeRate.slider.value).toFixed(2);
            this.updateParams();
        });
        
        this.updateParams();
    }
    
    setMode(isVoice) {
        this.isVoiceMode = isVoice;
        this.voiceModeButton.classList.toggle('active', isVoice);
        this.sfxModeButton.classList.toggle('active', !isVoice);
        
        this.voiceUi.style.display = isVoice ? 'block' : 'none';
        this.sfxUi.style.display = isVoice ? 'none' : 'block';
        
        // When switching modes, connect/disconnect the mic to avoid feedback
        if (this.micSource) {
            if (isVoice) {
                this.micSource.connect(this.nodes.input);
            } else {
                this.micSource.disconnect(this.nodes.input);
            }
        }
    }

    updateParams() {
        if (!this.nodes.input) return;
        
        const time = this.audioContext.currentTime;
        const smoothing = 0.02;
        
        // Slapback delay time
        const slapTime = parseFloat(this.slapback.slider.value) / 1000.0;
        this.nodes.slapDelay.delayTime.setTargetAtTime(slapTime, time, smoothing);
        
        // Flanger settings
        const flangeRate = parseFloat(this.flangeRate.slider.value);
        this.nodes.flangerLFO.frequency.setTargetAtTime(flangeRate, time, smoothing);
        this.nodes.flanger.delayTime.value = 0.005; // Base
        this.nodes.flangerLFODepth.gain.value = 0.002; // Depth
        this.nodes.flangerFeedback.gain.value = 0.4;
        
        // For voice mode, we want a mix of dry and wet
        this.nodes.wetGain.gain.setTargetAtTime(0.6, time, smoothing);
        this.nodes.dryGain.gain.setTargetAtTime(1.0, time, smoothing);
    }
    
    destroy() {
        if (this.micSource) {
            this.micSource.disconnect();
            this.micSource.mediaStream.getTracks().forEach(track => track.stop());
        }
    }
}

// --- This line is crucial for the main app to load the module ---
window.registerSynthModule(RoboCopModule);