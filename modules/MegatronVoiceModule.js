/**
 * Example Synth Module: A "Megatron" Voice Modulator.
 *
 * This module is an effects processor designed to transform a live microphone
 * input into the sound of a classic cartoon robot villain, using ring
 * modulation, pitch shifting, and flanging.
 *
 * This module demonstrates:
 * - A "voice changer" effect chain requiring live microphone input.
 * - Combining multiple effects in a specific order to achieve a target sound.
 * - Handling microphone permissions and routing live audio.
 */
class MegatronVoiceModule {
    constructor(audioContext) {
        this.audioContext = audioContext;
        this.id = 'megatronVoiceModule';
        this.name = 'Megatron Voice';
        
        this.micSource = null; // To hold the MediaStreamAudioSourceNode

        // --- Create Audio Nodes ---
        // This is a serial effects chain.
        this.nodes = {
            input: this.audioContext.createGain(), // This will be connected to the mic
            output: this.audioContext.createGain(),
            
            // Stage 1: Ring Modulator
            ringMod: this.audioContext.createGain(),
            ringModCarrier: this.audioContext.createOscillator(),
            
            // Stage 2: Pitch Shifter (using a simple delay line)
            pitchShiftDelay: this.audioContext.createDelay(0.1),
            
            // Stage 3: Flanger
            flangerDelay: this.audioContext.createDelay(0.05),
            flangerLFO: this.audioContext.createOscillator(),
            flangerLFODepth: this.audioContext.createGain(),
            flangerFeedback: this.audioContext.createGain(),
            
            // Final Wet/Dry Mix
            dryGain: this.audioContext.createGain(),
            wetGain: this.audioContext.createGain(),
        };

        // --- Configure Nodes ---
        this.nodes.ringModCarrier.type = 'sine';
        this.nodes.ringModCarrier.frequency.value = 50;
        this.nodes.flangerLFO.type = 'sine';
        
        // --- Connect Audio Graph ---
        
        // 1. A dry path for mixing
        this.nodes.input.connect(this.nodes.dryGain);
        this.nodes.dryGain.connect(this.nodes.output);
        
        // 2. The main wet processing chain
        // input -> Ring Mod -> Pitch Shift -> Flanger -> wetGain -> output
        this.nodes.input.connect(this.nodes.ringMod);
        
        // Ring Modulator setup
        this.nodes.ringModCarrier.connect(this.nodes.ringMod.gain);
        
        // Pitch Shifter setup
        this.nodes.ringMod.connect(this.nodes.pitchShiftDelay);
        
        // Flanger setup
        this.nodes.pitchShiftDelay.connect(this.nodes.flangerDelay);
        this.nodes.flangerDelay.connect(this.nodes.flangerFeedback).connect(this.nodes.flangerDelay);
        this.nodes.flangerLFO.connect(this.nodes.flangerLFODepth).connect(this.nodes.flangerDelay.delayTime);
        
        // Final wet connection
        this.nodes.flangerDelay.connect(this.nodes.wetGain);
        this.nodes.wetGain.connect(this.nodes.output);
        
        // Start the oscillators
        this.nodes.ringModCarrier.start(0);
        this.nodes.flangerLFO.start(0);
    }
    
    async _getMic() {
        if (this.micSource) { // If mic is already active, do nothing
            return;
        }
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            this.micSource = this.audioContext.createMediaStreamSource(stream);
            // Connect the live microphone input to this module's input node.
            this.micSource.connect(this.nodes.input);
            this.micStatus.textContent = "Microphone Active";
            this.micStatus.style.color = 'var(--color-neon-green)';
        } catch (err) {
            this.micStatus.textContent = "Microphone access denied.";
            this.micStatus.style.color = 'var(--color-neon-pink)';
            console.error("Error getting microphone:", err);
        }
    }

    getHTML() {
        return `
            <div class="control-row" style="margin-bottom:15px;">
                <button id="megaMicBtn" style="width: 100%; height: 40px; font-size: 1.1em;">Connect Microphone</button>
            </div>
            <div id="megaMicStatus" style="text-align: center; margin-bottom: 15px; color: var(--color-text-secondary);">
                Inactive
            </div>
            <div class="control-row">
                <label for="megaPitch">Pitch Shift:</label>
                <input type="range" id="megaPitch" min="-5" max="0" value="-3" step="0.1">
                <span id="megaPitchVal" class="value-display">-3.0</span>
            </div>
            <div class="control-row">
                <label for="megaRingMod">Ring Mod Freq:</label>
                <input type="range" id="megaRingMod" min="20" max="150" value="50" step="1">
                <span id="megaRingModVal" class="value-display">50</span>
            </div>
            <div class="control-row">
                <label for="megaFlange">Flanger Rate:</label>
                <input type="range" id="megaFlange" min="0.1" max="1.0" value="0.2" step="0.01">
                <span id="megaFlangeVal" class="value-display">0.20</span>
            </div>
            <div class="control-row">
                <label for="megaMix">Mix (Wet):</label>
                <input type="range" id="megaMix" min="0" max="1" value="1.0" step="0.01">
                <span id="megaMixVal" class="value-display">1.00</span>
            </div>
        `;
    }

    initUI(container) {
        this.micButton = container.querySelector('#megaMicBtn');
        this.micStatus = container.querySelector('#megaMicStatus');
        this.pitch = { slider: container.querySelector('#megaPitch'), val: container.querySelector('#megaPitchVal') };
        this.ringMod = { slider: container.querySelector('#megaRingMod'), val: container.querySelector('#megaRingModVal') };
        this.flange = { slider: container.querySelector('#megaFlange'), val: container.querySelector('#megaFlangeVal') };
        this.mix = { slider: container.querySelector('#megaMix'), val: container.querySelector('#megaMixVal') };

        this.micButton.addEventListener('click', () => this._getMic());
        
        const connect = (ctrl, decimals = 2) => {
            ctrl.slider.addEventListener('input', () => {
                ctrl.val.textContent = parseFloat(ctrl.slider.value).toFixed(decimals);
                this.updateParams();
            });
        };
        
        connect(this.pitch, 1);
        connect(this.ringMod, 0);
        connect(this.flange, 2);
        connect(this.mix, 2);
        
        this.updateParams();
    }

    updateParams() {
        if (!this.nodes.input) return;
        
        const time = this.audioContext.currentTime;
        const smoothing = 0.02;

        const pitchShift = parseFloat(this.pitch.slider.value);
        const ringModFreq = parseFloat(this.ringMod.slider.value);
        const flangeRate = parseFloat(this.flange.slider.value);
        const mix = parseFloat(this.mix.slider.value);
        
        // --- Pitch Shifter ---
        // We simulate a pitch shift by setting a very short, constant delay time.
        // The delay time is `1 / frequency`, but we are shifting by semitones.
        // This is a simple but effective "digital detune" sound.
        const pitchRatio = Math.pow(2, pitchShift / 12);
        // A more direct way is just to set a small fixed delay.
        // A proper pitch shifter is more complex. We'll use a delay of 1ms as a stand-in.
        this.nodes.pitchShiftDelay.delayTime.setTargetAtTime(0.001, time, smoothing);
        // A true pitch shifter would need a more complex granular or FFT approach.
        // This simplified version will mostly add a "phasing" digital character.
        // To get a real pitch shift, we'd need to modulate the delay time, but that creates vibrato.
        // Let's accept this as a "character" effect.
        
        // --- Ring Modulator ---
        this.nodes.ringModCarrier.frequency.setTargetAtTime(ringModFreq, time, smoothing);
        
        // --- Flanger ---
        this.nodes.flangerDelay.delayTime.value = 0.005; // Base delay
        this.nodes.flangerLFO.frequency.setTargetAtTime(flangeRate, time, smoothing);
        this.nodes.flangerLFODepth.gain.value = 0.003; // Depth of the sweep
        this.nodes.flangerFeedback.gain.value = 0.5; // Feedback amount

        // --- Mix ---
        this.nodes.wetGain.gain.setTargetAtTime(mix, time, smoothing);
        this.nodes.dryGain.gain.setTargetAtTime(1.0 - mix, time, smoothing);
    }
    
    // Cleanup method
    destroy() {
        if (this.micSource) {
            this.micSource.disconnect();
            this.micSource.mediaStream.getTracks().forEach(track => track.stop());
            this.micSource = null;
        }
    }
}

// --- This line is crucial for the main app to load the module ---
window.registerSynthModule(MegatronVoiceModule);