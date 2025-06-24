/**
 * Example Synth Module: A Dynamics Compressor.
 *
 * This module wraps the built-in DynamicsCompressorNode, providing
 * a user-friendly interface for this essential audio effect.
 */
class CompressorModule {
    constructor(audioContext) {
        this.audioContext = audioContext;
        this.id = 'compressorModule'; // A unique ID
        this.name = 'Compressor';     // The display name

        // --- Create Audio Nodes ---
        // For this module, the signal path is very simple:
        // input -> compressor -> output
        this.nodes = {
            input: this.audioContext.createGain(),
            output: this.audioContext.createGain(),
            compressor: this.audioContext.createDynamicsCompressor(),
        };

        // --- Connect the audio graph ---
        this.nodes.input.connect(this.nodes.compressor);
        this.nodes.compressor.connect(this.nodes.output);
    }

    /**
     * Returns the HTML string for the module's controls.
     */
    getHTML() {
        return `
            <div class="control-row">
                <label for="compThreshold">Threshold (dB):</label>
                <input type="range" id="compThreshold" min="-100" max="0" value="-24" step="1">
                <span id="compThresholdVal" class="value-display">-24</span>
            </div>
            <div class="control-row">
                <label for="compKnee">Knee:</label>
                <input type="range" id="compKnee" min="0" max="40" value="30" step="1">
                <span id="compKneeVal" class="value-display">30</span>
            </div>
            <div class="control-row">
                <label for="compRatio">Ratio:</label>
                <input type="range" id="compRatio" min="1" max="20" value="12" step="1">
                <span id="compRatioVal" class="value-display">12</span>
            </div>
            <div class="control-row">
                <label for="compAttack">Attack (s):</label>
                <input type="range" id="compAttack" min="0.001" max="1" value="0.003" step="0.001">
                <span id="compAttackVal" class="value-display">0.003</span>
            </div>
            <div class="control-row">
                <label for="compRelease">Release (s):</label>
                <input type="range" id="compRelease" min="0.01" max="1" value="0.25" step="0.01">
                <span id="compReleaseVal" class="value-display">0.25</span>
            </div>
        `;
    }

    /**
     * Finds the UI elements and attaches event listeners.
     * @param {HTMLElement} container - The div containing the module's HTML.
     */
    initUI(container) {
        // Store references to UI elements
        this.threshold = { slider: container.querySelector('#compThreshold'), val: container.querySelector('#compThresholdVal') };
        this.knee = { slider: container.querySelector('#compKnee'), val: container.querySelector('#compKneeVal') };
        this.ratio = { slider: container.querySelector('#compRatio'), val: container.querySelector('#compRatioVal') };
        this.attack = { slider: container.querySelector('#compAttack'), val: container.querySelector('#compAttackVal') };
        this.release = { slider: container.querySelector('#compRelease'), val: container.querySelector('#compReleaseVal') };

        // Helper function to connect a slider to its display and the update function
        const connectControl = (control, decimals = 0) => {
            control.slider.addEventListener('input', () => {
                control.val.textContent = parseFloat(control.slider.value).toFixed(decimals);
                this.updateParams();
            });
        };

        // Connect all controls
        connectControl(this.threshold);
        connectControl(this.knee);
        connectControl(this.ratio);
        connectControl(this.attack, 3);
        connectControl(this.release, 2);

        // Initialize parameters on load
        this.updateParams();
    }

    /**
     * Reads values from the controls and updates the audio node parameters.
     */
    updateParams() {
        if (!this.nodes.compressor) return;
        const time = this.audioContext.currentTime;
        const smoothing = 0.01; // Small time constant for smooth parameter changes

        this.nodes.compressor.threshold.setTargetAtTime(parseFloat(this.threshold.slider.value), time, smoothing);
        this.nodes.compressor.knee.setTargetAtTime(parseFloat(this.knee.slider.value), time, smoothing);
        this.nodes.compressor.ratio.setTargetAtTime(parseFloat(this.ratio.slider.value), time, smoothing);
        this.nodes.compressor.attack.setTargetAtTime(parseFloat(this.attack.slider.value), time, smoothing);
        this.nodes.compressor.release.setTargetAtTime(parseFloat(this.release.slider.value), time, smoothing);
    }
}

// --- This line is crucial for the main app to load the module ---
window.registerSynthModule(CompressorModule);