/**
 * Example Synth Module: A Flanger.
 *
 * This module creates the classic "flanger" effect by mixing the input
 * signal with a version of itself that is delayed by a very short,
 * sweeping amount of time. The key to the flanger sound is feeding the
 * output of the delay back into its input, creating strong resonant peaks.
 *
 * This module demonstrates:
 * - A modulation effect with a very short, modulated delay time.
 * - The implementation of a strong feedback path, which is crucial for the effect.
 * - The subtle but important differences between a flanger and a chorus.
 */
class FlangerModule {
    constructor(audioContext) {
        this.audioContext = audioContext;
        this.id = 'flangerModule';     // A unique ID
        this.name = 'Flanger';         // The display name

        // --- Create Audio Nodes ---
        this.nodes = {
            input: this.audioContext.createGain(),
            output: this.audioContext.createGain(),
            dryGain: this.audioContext.createGain(),
            wetGain: this.audioContext.createGain(),
            // A short delay line is the heart of the effect
            delayNode: this.audioContext.createDelay(0.05), // Max 50ms is plenty
            // A gain node to control the feedback amount
            feedbackGain: this.audioContext.createGain(),
            // --- LFO / Modulation Path ---
            lfo: this.audioContext.createOscillator(),
            lfoDepth: this.audioContext.createGain(),
        };

        // --- Configure the LFO ---
        this.nodes.lfo.type = 'sine';
        this.nodes.lfo.start();

        // --- Connect the Audio Graph ---
        
        // 1. Set up the Wet/Dry Mix
        this.nodes.input.connect(this.nodes.dryGain);
        this.nodes.dryGain.connect(this.nodes.output);

        this.nodes.input.connect(this.nodes.delayNode);
        this.nodes.delayNode.connect(this.nodes.wetGain);
        this.nodes.wetGain.connect(this.nodes.output);

        // 2. Set up the crucial Feedback Path
        // The output of the delay is routed back to its own input via the feedbackGain node.
        // This is what creates the resonant "jet plane" sound.
        this.nodes.delayNode.connect(this.nodes.feedbackGain);
        this.nodes.feedbackGain.connect(this.nodes.delayNode);

        // 3. Set up the Modulation Path
        // The LFO controls the delay time, making it sweep up and down.
        this.nodes.lfo.connect(this.nodes.lfoDepth);
        this.nodes.lfoDepth.connect(this.nodes.delayNode.delayTime);
    }

    /**
     * Returns the HTML string for the module's controls.
     */
    getHTML() {
        return `
            <div class="control-row">
                <label for="flangerRate">Rate (Hz):</label>
                <input type="range" id="flangerRate" min="0.05" max="5" value="0.2" step="0.01">
                <span id="flangerRateVal" class="value-display">0.20</span>
            </div>
            <div class="control-row">
                <label for="flangerDepth">Depth (ms):</label>
                <input type="range" id="flangerDepth" min="0.1" max="10" value="3" step="0.1">
                <span id="flangerDepthVal" class="value-display">3.0</span>
            </div>
            <div class="control-row">
                <label for="flangerDelay">Base Delay (ms):</label>
                <input type="range" id="flangerDelay" min="0.5" max="20" value="5" step="0.1">
                <span id="flangerDelayVal" class="value-display">5.0</span>
            </div>
            <div class="control-row">
                <label for="flangerFeedback">Feedback:</label>
                <input type="range" id="flangerFeedback" min="0" max="0.95" value="0.7" step="0.01">
                <span id="flangerFeedbackVal" class="value-display">0.70</span>
            </div>
            <div class="control-row">
                <label for="flangerMix">Mix (Wet):</label>
                <input type="range" id="flangerMix" min="0" max="1" value="0.5" step="0.01">
                <span id="flangerMixVal" class="value-display">0.50</span>
            </div>
        `;
    }

    /**
     * Finds the UI elements and attaches event listeners.
     * @param {HTMLElement} container - The div containing the module's HTML.
     */
    initUI(container) {
        this.rate = { slider: container.querySelector('#flangerRate'), val: container.querySelector('#flangerRateVal') };
        this.depth = { slider: container.querySelector('#flangerDepth'), val: container.querySelector('#flangerDepthVal') };
        this.delay = { slider: container.querySelector('#flangerDelay'), val: container.querySelector('#flangerDelayVal') };
        this.feedback = { slider: container.querySelector('#flangerFeedback'), val: container.querySelector('#flangerFeedbackVal') };
        this.mix = { slider: container.querySelector('#flangerMix'), val: container.querySelector('#flangerMixVal') };

        const connect = (ctrl, decimals = 2) => {
            ctrl.slider.addEventListener('input', () => {
                ctrl.val.textContent = parseFloat(ctrl.slider.value).toFixed(decimals);
                this.updateParams();
            });
        };
        
        connect(this.rate, 2);
        connect(this.depth, 1);
        connect(this.delay, 1);
        connect(this.feedback, 2);
        connect(this.mix, 2);

        this.updateParams();
    }

    /**
     * Reads values from the controls and updates the audio node parameters.
     */
    updateParams() {
        if (!this.nodes.delayNode) return;
        
        const time = this.audioContext.currentTime;
        const smoothing = 0.02;

        const rateHz = parseFloat(this.rate.slider.value);
        const depthMs = parseFloat(this.depth.slider.value);
        const delayMs = parseFloat(this.delay.slider.value);
        const feedback = parseFloat(this.feedback.slider.value);
        const mix = parseFloat(this.mix.slider.value);
        
        // Convert milliseconds to seconds for the API
        const depthSec = depthMs / 1000.0;
        const delaySec = delayMs / 1000.0;

        // The base delay time is set directly on the node's parameter
        this.nodes.delayNode.delayTime.value = delaySec;

        // The LFO modulates the delay time around this base value
        this.nodes.lfo.frequency.setTargetAtTime(rateHz, time, smoothing);
        this.nodes.lfoDepth.gain.setTargetAtTime(depthSec, time, smoothing);
        
        // Update feedback and mix levels
        this.nodes.feedbackGain.gain.setTargetAtTime(feedback, time, smoothing);
        this.nodes.wetGain.gain.setTargetAtTime(mix, time, smoothing);
        this.nodes.dryGain.gain.setTargetAtTime(1.0 - mix, time, smoothing);
    }
}

// --- This line is crucial for the main app to load the module ---
window.registerSynthModule(FlangerModule);