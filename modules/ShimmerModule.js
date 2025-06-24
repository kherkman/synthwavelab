/**
 * Example Synth Module: A Shimmer Reverb.
 *
 * This module creates an ethereal "shimmer" effect by placing a pitch
 * shifter inside the feedback loop of a long delay line (acting as a reverb).
 * Each repeat is pitched up, creating a rising cascade of harmonics.
 *
 * This module demonstrates:
 * - A complex feedback path involving multiple processing nodes.
 * - Combining pitch shifting and delay to create a modern, iconic effect.
 * - A practical implementation of a sought-after sound design tool.
 */
class ShimmerModule {
    constructor(audioContext) {
        this.audioContext = audioContext;
        this.id = 'shimmerModule';
        this.name = 'Shimmer Verb';
        
        // --- Create Audio Nodes ---
        this.nodes = {
            input: this.audioContext.createGain(),
            output: this.audioContext.createGain(),
            dryGain: this.audioContext.createGain(),
            wetGain: this.audioContext.createGain(),

            // The main delay line that creates the long reverb tail
            delay: this.audioContext.createDelay(5.0), // Max 5s for a long tail
            
            // The feedback gain controls the length of the shimmer trail
            feedbackGain: this.audioContext.createGain(),
            
            // A low-pass filter to prevent high frequencies from getting too harsh
            // as they are repeatedly pitch-shifted.
            filter: this.audioContext.createBiquadFilter(),

            // --- Pitch Shifter Components ---
            // This is a simple pitch shifter using a modulated delay line (vibrato).
            // Shifting by exactly one octave (1200 cents) is difficult without more
            // advanced DSP. We'll use a ring modulator-style shifter for simplicity
            // and character, which is common in many shimmer algorithms.
            shifter: this.audioContext.createGain(),
            shifterCarrier: this.audioContext.createOscillator(),
        };

        // --- Configure Nodes ---
        this.nodes.delay.delayTime.value = 2.0;
        this.nodes.filter.type = 'lowpass';
        this.nodes.filter.frequency.value = 4000;
        this.nodes.shifterCarrier.type = 'sine';
        this.nodes.shifterCarrier.start();
        
        // --- Connect the Audio Graph ---
        
        // 1. Wet/Dry Mix
        this.nodes.input.connect(this.nodes.dryGain);
        this.nodes.dryGain.connect(this.nodes.output);
        
        // The final processed signal goes to the wet gain, then the output
        this.nodes.delay.connect(this.nodes.wetGain);
        this.nodes.wetGain.connect(this.nodes.output);

        // 2. Initial Signal Path
        // The input signal goes into the delay line to start the process.
        this.nodes.input.connect(this.nodes.delay);

        // 3. The Shimmer Feedback Loop (The core of the effect)
        // The output of the delay is sent into the pitch shifter.
        this.nodes.delay.connect(this.nodes.shifter);
        this.nodes.shifterCarrier.connect(this.nodes.shifter.gain);

        // The pitch-shifted signal is then filtered.
        this.nodes.shifter.connect(this.nodes.filter);

        // The filtered, pitch-shifted signal is scaled by the feedback amount.
        this.nodes.filter.connect(this.nodes.feedbackGain);

        // Finally, the processed signal is fed back into the start of the delay line.
        this.nodes.feedbackGain.connect(this.nodes.delay);
    }

    /**
     * Returns the HTML string for the module's controls.
     */
    getHTML() {
        return `
            <div class="control-row">
                <label for="shimmerSize">Size (Time):</label>
                <input type="range" id="shimmerSize" min="0.5" max="5.0" value="2.5" step="0.1">
                <span id="shimmerSizeVal" class="value-display">2.5</span>
            </div>
            <div class="control-row">
                <label for="shimmerDecay">Decay (Feedback):</label>
                <input type="range" id="shimmerDecay" min="0" max="0.95" value="0.7" step="0.01">
                <span id="shimmerDecayVal" class="value-display">0.70</span>
            </div>
            <div class="control-row">
                <label for="shimmerPitch">Pitch Shift:</label>
                <select id="shimmerPitch" style="flex-grow:1;">
                    <option value="12" selected>+1 Octave</option>
                    <option value="7">+1 Fifth</option>
                    <option value="5">+1 Fourth</option>
                    <option value="-12">-1 Octave (Sub)</option>
                </select>
            </div>
            <div class="control-row">
                <label for="shimmerTone">Tone (LPF):</label>
                <input type="range" id="shimmerTone" min="1000" max="15000" value="4000" step="100">
                <span id="shimmerToneVal" class="value-display">4000</span>
            </div>
            <div class="control-row">
                <label for="shimmerMix">Mix (Wet):</label>
                <input type="range" id="shimmerMix" min="0" max="1" value="0.5" step="0.01">
                <span id="shimmerMixVal" class="value-display">0.50</span>
            </div>
        `;
    }

    /**
     * Finds the UI elements and attaches event listeners.
     */
    initUI(container) {
        this.size = { slider: container.querySelector('#shimmerSize'), val: container.querySelector('#shimmerSizeVal') };
        this.decay = { slider: container.querySelector('#shimmerDecay'), val: container.querySelector('#shimmerDecayVal') };
        this.pitch = { selector: container.querySelector('#shimmerPitch') };
        this.tone = { slider: container.querySelector('#shimmerTone'), val: container.querySelector('#shimmerToneVal') };
        this.mix = { slider: container.querySelector('#shimmerMix'), val: container.querySelector('#shimmerMixVal') };
        
        const connect = (ctrl, decimals = 1) => {
            ctrl.slider.addEventListener('input', () => {
                ctrl.val.textContent = parseFloat(ctrl.slider.value).toFixed(decimals);
                this.updateParams();
            });
        };
        
        connect(this.size, 1);
        connect(this.decay, 2);
        connect(this.tone, 0);
        connect(this.mix, 2);
        this.pitch.selector.addEventListener('change', () => this.updateParams());
        
        this.updateParams();
    }

    /**
     * Reads values from the controls and updates the audio node parameters.
     */
    updateParams() {
        if (!this.nodes.delay) return;
        const time = this.audioContext.currentTime;
        const smoothing = 0.02;

        const size = parseFloat(this.size.slider.value);
        const decay = parseFloat(this.decay.slider.value);
        const pitchShiftSemitones = parseFloat(this.pitch.selector.value);
        const tone = parseFloat(this.tone.slider.value);
        const mix = parseFloat(this.mix.slider.value);

        // To use our simple ring-mod shifter, we need to know the fundamental frequency
        // of the incoming signal. This is a limitation; a true pitch shifter wouldn't need this.
        // We will assume a base pitch of around A4 (440Hz) for the shifter calculation,
        // which gives a characteristic shimmer sound, even if not perfectly harmonic.
        const basePitch = 440; 
        const pitchRatio = Math.pow(2, pitchShiftSemitones / 12);
        // The carrier frequency for a ring-mod shifter should be the desired output pitch.
        const carrierFrequency = basePitch * pitchRatio;
        
        // Set the parameters
        this.nodes.delay.delayTime.setTargetAtTime(size, time, smoothing);
        this.nodes.feedbackGain.gain.setTargetAtTime(decay, time, smoothing);
        this.nodes.filter.frequency.setTargetAtTime(tone, time, smoothing);
        this.nodes.shifterCarrier.frequency.setTargetAtTime(carrierFrequency, time, smoothing);
        
        this.nodes.wetGain.gain.setTargetAtTime(mix, time, smoothing);
        this.nodes.dryGain.gain.setTargetAtTime(1.0 - mix, time, smoothing);
    }
}

// --- This line is crucial for the main app to load the module ---
window.registerSynthModule(ShimmerModule);