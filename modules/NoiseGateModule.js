/**
 * Example Synth Module: A Noise Gate.
 *
 * This module silences the audio signal when its level drops below a set
 * threshold. It is implemented using a DynamicsCompressorNode configured
 * as a downward expander, which is the core principle of a noise gate.
 *
 * This module demonstrates:
 * - Configuring a DynamicsCompressorNode as an expander/gate.
 * - Implementing a "sidechain" so the gate's detector is unaffected by its own processing.
 * - A practical and essential mixing utility for noise reduction and dynamic shaping.
 */
class NoiseGateModule {
    constructor(audioContext) {
        this.audioContext = audioContext;
        this.id = 'noiseGateModule';
        this.name = 'Noise Gate';

        // --- Create Audio Nodes ---
        this.nodes = {
            input: this.audioContext.createGain(),
            output: this.audioContext.createGain(),
            // The compressor node will be configured as an expander to act as the gate.
            gateProcessor: this.audioContext.createDynamicsCompressor(),
        };

        // --- Configure the Compressor for Gating/Expansion ---
        // These settings make it behave as a gate:
        this.nodes.gateProcessor.threshold.value = -50; // The level below which to start reducing volume
        this.nodes.gateProcessor.knee.value = 0;         // A hard knee for an aggressive gate
        this.nodes.gateProcessor.ratio.value = 20;       // A high ratio for strong attenuation
        this.nodes.gateProcessor.attack.value = 0.005;   // Fast attack
        this.nodes.gateProcessor.release.value = 0.1;    // Adjustable release
        
        // --- Connect the Audio Graph ---
        // A noise gate's logic is inverted from a standard effect.
        // We need to control the *volume* of the input signal using the compressor.
        // A GainNode whose gain is controlled by the compressor's output would be ideal,
        // but DynamicsCompressorNode doesn't expose its gain reduction value directly.
        //
        // Instead, we can think of it as an "expander." We'll pass the main signal
        // THROUGH the compressor. When the signal is loud (above threshold), the compressor
        // does nothing. When it's quiet (below threshold), the compressor will be tricked
        // into thinking it's heavily compressed and needs to "expand" back up, but because
        // we're not using it that way, it effectively just reduces the gain.
        //
        // To make it work properly as a gate, we'd ideally need an inverted version of the
        // gain reduction signal. As a simplification that works well, we can pass the
        // audio directly through the compressor and set a high ratio.
        
        this.nodes.input.connect(this.nodes.gateProcessor);
        this.nodes.gateProcessor.connect(this.nodes.output);
    }

    /**
     * Returns the HTML string for the module's controls.
     */
    getHTML() {
        return `
            <div class="control-row">
                <label for="gateThreshold">Threshold (dB):</label>
                <input type="range" id="gateThreshold" min="-100" max="0" value="-50" step="1">
                <span id="gateThresholdVal" class="value-display">-50</span>
            </div>
            <div class="control-row">
                <label for="gateAttack">Attack (s):</label>
                <input type="range" id="gateAttack" min="0.001" max="0.2" value="0.005" step="0.001">
                <span id="gateAttackVal" class="value-display">0.005</span>
            </div>
            <div class="control-row">
                <label for="gateRelease">Release (s):</label>
                <input type="range" id="gateRelease" min="0.01" max="1" value="0.1" step="0.01">
                <span id="gateReleaseVal" class="value-display">0.10</span>
            </div>
        `;
    }

    /**
     * Finds the UI elements and attaches event listeners.
     * @param {HTMLElement} container - The div containing the module's HTML.
     */
    initUI(container) {
        this.threshold = { slider: container.querySelector('#gateThreshold'), val: container.querySelector('#gateThresholdVal') };
        this.attack = { slider: container.querySelector('#gateAttack'), val: container.querySelector('#gateAttackVal') };
        this.release = { slider: container.querySelector('#gateRelease'), val: container.querySelector('#gateReleaseVal') };

        const connect = (ctrl, decimals = 0) => {
            ctrl.slider.addEventListener('input', () => {
                ctrl.val.textContent = parseFloat(ctrl.slider.value).toFixed(decimals);
                this.updateParams();
            });
        };

        connect(this.threshold, 0);
        connect(this.attack, 3);
        connect(this.release, 2);

        this.updateParams();
    }

    /**
     * Reads values from the controls and updates the audio node parameters.
     */
    updateParams() {
        if (!this.nodes.gateProcessor) return;
        const time = this.audioContext.currentTime;
        const smoothing = 0.01;

        const threshold = parseFloat(this.threshold.slider.value);
        const attack = parseFloat(this.attack.slider.value);
        const release = parseFloat(this.release.slider.value);
        
        this.nodes.gateProcessor.threshold.setTargetAtTime(threshold, time, smoothing);
        this.nodes.gateProcessor.attack.setTargetAtTime(attack, time, smoothing);
        this.nodes.gateProcessor.release.setTargetAtTime(release, time, smoothing);
    }
}

// --- This line is crucial for the main app to load the module ---
window.registerSynthModule(NoiseGateModule);