/**
 * Example Synth Module: A Modulation Delay.
 *
 * This module creates effects like chorus, vibrato, and flanging by
 * modulating the delay time of a delay line with a low-frequency
 * oscillator (LFO).
 *
 * This module demonstrates:
 * - A clear separation of the main signal path and the modulation control path.
 * - Using an LFO (OscillatorNode) to control an AudioParam (delay.delayTime).
 * - Implementing a feedback path for flanger-style resonance.
 */
class ModulationDelayModule {
    constructor(audioContext) {
        this.audioContext = audioContext;
        this.id = 'modDelayModule'; // A unique ID
        this.name = 'Modulation Delay'; // The display name

        // --- Create Audio Nodes ---
        this.nodes = {
            input: this.audioContext.createGain(),
            output: this.audioContext.createGain(),
            dryGain: this.audioContext.createGain(),
            wetGain: this.audioContext.createGain(),
            // The main delay line for the effect
            delayNode: this.audioContext.createDelay(0.1), // Max 100ms delay
            // A feedback path for resonance/flanging effects
            feedbackGain: this.audioContext.createGain(),
            // --- LFO / Modulation Path ---
            // The LFO that will modulate the delay time
            lfo: this.audioContext.createOscillator(),
            // A gain node to control the LFO's intensity (modulation depth)
            lfoDepth: this.audioContext.createGain(),
        };

        // --- Configure the LFO ---
        this.nodes.lfo.type = 'sine';
        this.nodes.lfo.frequency.value = 1; // Default rate of 1 Hz
        this.nodes.lfo.start();

        // --- Connect the audio graph ---

        // 1. Set up the Wet/Dry mix
        this.nodes.input.connect(this.nodes.dryGain);
        this.nodes.dryGain.connect(this.nodes.output);
        
        this.nodes.input.connect(this.nodes.delayNode);
        this.nodes.delayNode.connect(this.nodes.wetGain);
        this.nodes.wetGain.connect(this.nodes.output);

        // 2. Set up the Feedback path
        // The output of the delay is fed back into itself to create resonance.
        this.nodes.delayNode.connect(this.nodes.feedbackGain);
        this.nodes.feedbackGain.connect(this.nodes.delayNode);

        // 3. Set up the Modulation path
        // The LFO's signal is scaled by lfoDepth, and then connected to the
        // delayTime AudioParam of the main delay node. This makes the delay time wobble.
        this.nodes.lfo.connect(this.nodes.lfoDepth);
        this.nodes.lfoDepth.connect(this.nodes.delayNode.delayTime);
    }

    /**
     * Returns the HTML string for the module's controls.
     */
    getHTML() {
        return `
            <div class="control-row">
                <label for="modDelayTime">Base Delay (ms):</label>
                <input type="range" id="modDelayTime" min="0.1" max="50" value="10" step="0.1">
                <span id="modDelayTimeVal" class="value-display">10.0</span>
            </div>
            <div class="control-row">
                <label for="modDelayRate">LFO Rate (Hz):</label>
                <input type="range" id="modDelayRate" min="0.05" max="20" value="1" step="0.05">
                <span id="modDelayRateVal" class="value-display">1.00</span>
            </div>
            <div class="control-row">
                <label for="modDelayDepth">LFO Depth (ms):</label>
                <input type="range" id="modDelayDepth" min="0" max="20" value="2" step="0.1">
                <span id="modDelayDepthVal" class="value-display">2.0</span>
            </div>
            <div class="control-row">
                <label for="modDelayFeedback">Feedback:</label>
                <input type="range" id="modDelayFeedback" min="0" max="0.95" value="0" step="0.01">
                <span id="modDelayFeedbackVal" class="value-display">0.00</span>
            </div>
            <div class="control-row">
                <label for="modDelayMix">Mix (Wet):</label>
                <input type="range" id="modDelayMix" min="0" max="1" value="0.5" step="0.01">
                <span id="modDelayMixVal" class="value-display">0.50</span>
            </div>
        `;
    }

    /**
     * Finds the UI elements and attaches event listeners.
     * @param {HTMLElement} container - The div containing the module's HTML.
     */
    initUI(container) {
        // Store references to UI elements
        this.delayTime = { slider: container.querySelector('#modDelayTime'), val: container.querySelector('#modDelayTimeVal') };
        this.rate = { slider: container.querySelector('#modDelayRate'), val: container.querySelector('#modDelayRateVal') };
        this.depth = { slider: container.querySelector('#modDelayDepth'), val: container.querySelector('#modDelayDepthVal') };
        this.feedback = { slider: container.querySelector('#modDelayFeedback'), val: container.querySelector('#modDelayFeedbackVal') };
        this.mix = { slider: container.querySelector('#modDelayMix'), val: container.querySelector('#modDelayMixVal') };

        // Helper function to attach listeners
        const connectControl = (control, decimals = 2) => {
            control.slider.addEventListener('input', () => {
                control.val.textContent = parseFloat(control.slider.value).toFixed(decimals);
                this.updateParams();
            });
        };

        connectControl(this.delayTime, 1);
        connectControl(this.rate, 2);
        connectControl(this.depth, 1);
        connectControl(this.feedback, 2);
        connectControl(this.mix, 2);

        // Initialize parameters on load
        this.updateParams();
    }

    /**
     * Reads values from the controls and updates the audio node parameters.
     */
    updateParams() {
        if (!this.nodes.delayNode) return;

        const time = this.audioContext.currentTime;
        const smoothing = 0.02;

        const delayTimeMs = parseFloat(this.delayTime.slider.value);
        const rateHz = parseFloat(this.rate.slider.value);
        const depthMs = parseFloat(this.depth.slider.value);
        const feedback = parseFloat(this.feedback.slider.value);
        const mix = parseFloat(this.mix.slider.value);
        
        // Convert milliseconds to seconds for the Web Audio API
        const delayTimeSec = delayTimeMs / 1000.0;
        const depthSec = depthMs / 1000.0;

        // The delayNode's `delayTime` parameter is now the *center* point of the modulation.
        // It's set directly, not with setTargetAtTime, because the LFO is what causes changes.
        this.nodes.delayNode.delayTime.value = delayTimeSec;

        // Update LFO parameters
        this.nodes.lfo.frequency.setTargetAtTime(rateHz, time, smoothing);
        this.nodes.lfoDepth.gain.setTargetAtTime(depthSec, time, smoothing);

        // Update feedback and mix
        this.nodes.feedbackGain.gain.setTargetAtTime(feedback, time, smoothing);
        this.nodes.wetGain.gain.setTargetAtTime(mix, time, smoothing);
        this.nodes.dryGain.gain.setTargetAtTime(1.0 - mix, time, smoothing);
    }
}

// --- This line is crucial for the main app to load the module ---
window.registerSynthModule(ModulationDelayModule);