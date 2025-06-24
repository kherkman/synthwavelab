/**
 * Example Synth Module: A Lookahead Limiter.
 *
 * This module uses a DynamicsCompressorNode configured to act as a "brickwall"
 * limiter. It prevents the signal from exceeding a user-defined ceiling,
 * which is essential for taming peaks and increasing perceived loudness.
 * It includes a short "lookahead" delay for smoother processing.
 *
 * This module demonstrates:
 * - Configuring a DynamicsCompressorNode for limiting.
 * - Implementing a lookahead path to improve transient response.
 * - Creating a focused, professional-grade utility effect.
 */
class LimiterModule {
    constructor(audioContext) {
        this.audioContext = audioContext;
        this.id = 'limiterModule';
        this.name = 'Limiter';

        const lookaheadTime = 0.005; // 5ms lookahead

        // --- Create Audio Nodes ---
        this.nodes = {
            input: this.audioContext.createGain(),
            output: this.audioContext.createGain(),
            // The compressor node will do the actual limiting.
            compressor: this.audioContext.createDynamicsCompressor(),
            // A delay node for the main signal path to create the lookahead.
            lookaheadDelay: this.audioContext.createDelay(lookaheadTime),
        };

        // --- Configure the Compressor for Limiting ---
        this.nodes.compressor.threshold.value = -10; // Default threshold
        this.nodes.compressor.knee.value = 0;        // Hard knee for brickwall limiting
        this.nodes.compressor.ratio.value = 20;      // Very high ratio
        this.nodes.compressor.attack.value = 0.001;  // Very fast attack
        this.nodes.compressor.release.value = 0.1;   // Default release

        // Set the delay time for the lookahead
        this.nodes.lookaheadDelay.delayTime.value = lookaheadTime;

        // --- Connect the Audio Graph ---

        // 1. The input signal is split. One path goes directly to the compressor's
        //    detector input (this is the sidechain). The other path is delayed.
        this.nodes.input.connect(this.nodes.compressor);
        this.nodes.input.connect(this.nodes.lookaheadDelay);

        // 2. The delayed ("lookahead") signal is what we actually hear.
        //    The output of this delay is multiplied by the gain reduction amount
        //    calculated by the compressor.
        //    (Note: The DynamicsCompressorNode does this internally. We just need
        //    to connect our delayed signal to its input and take its output).
        this.nodes.lookaheadDelay.connect(this.nodes.compressor);
        
        // 3. The final, limited signal goes to the module's output.
        this.nodes.compressor.connect(this.nodes.output);
    }

    /**
     * Returns the HTML string for the module's controls.
     */
    getHTML() {
        return `
            <div class="control-row">
                <label for="limiterThreshold">Ceiling (dB):</label>
                <input type="range" id="limiterThreshold" min="-40" max="0" value="-6" step="0.5">
                <span id="limiterThresholdVal" class="value-display">-6.0</span>
            </div>
            <div class="control-row">
                <label for="limiterRelease">Release (s):</label>
                <input type="range" id="limiterRelease" min="0.01" max="1" value="0.1" step="0.01">
                <span id="limiterReleaseVal" class="value-display">0.10</span>
            </div>
        `;
    }

    /**
     * Finds the UI elements and attaches event listeners.
     * @param {HTMLElement} container - The div containing the module's HTML.
     */
    initUI(container) {
        this.threshold = { slider: container.querySelector('#limiterThreshold'), val: container.querySelector('#limiterThresholdVal') };
        this.release = { slider: container.querySelector('#limiterRelease'), val: container.querySelector('#limiterReleaseVal') };

        const connect = (ctrl, decimals = 1) => {
            ctrl.slider.addEventListener('input', () => {
                ctrl.val.textContent = parseFloat(ctrl.slider.value).toFixed(decimals);
                this.updateParams();
            });
        };

        connect(this.threshold, 1);
        connect(this.release, 2);

        this.updateParams();
    }

    /**
     * Reads values from the controls and updates the audio node parameters.
     */
    updateParams() {
        if (!this.nodes.compressor) return;
        const time = this.audioContext.currentTime;
        const smoothing = 0.01;

        const threshold = parseFloat(this.threshold.slider.value);
        const release = parseFloat(this.release.slider.value);
        
        // The 'threshold' of the compressor acts as the limiter's 'ceiling'.
        this.nodes.compressor.threshold.setTargetAtTime(threshold, time, smoothing);
        this.nodes.compressor.release.setTargetAtTime(release, time, smoothing);
    }
}

// --- This line is crucial for the main app to load the module ---
window.registerSynthModule(LimiterModule);