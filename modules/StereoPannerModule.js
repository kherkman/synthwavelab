/**
 * Example Synth Module: A Stereo Panner with LFO modulation.
 *
 * This module demonstrates:
 * - Creating a self-contained effect with its own modulator (LFO).
 * - Managing multiple UI controls.
 * - Connecting an LFO to an AudioParam (panner.pan).
 */
class StereoPannerModule {
    constructor(audioContext) {
        this.audioContext = audioContext;
        this.id = 'stereoPannerModule'; // unique ID
        this.name = 'Stereo Panner';    // Display Name

        // Create Audio Nodes for the effect
        this.nodes = {
            input: this.audioContext.createGain(),
            output: this.audioContext.createGain(),
            panner: this.audioContext.createStereoPanner(),
            lfo: this.audioContext.createOscillator(),
            lfoDepth: this.audioContext.createGain()
        };
        
        // --- Main Signal Path ---
        // The main audio signal goes through the panner.
        this.nodes.input.connect(this.nodes.panner);
        this.nodes.panner.connect(this.nodes.output);

        // --- Modulation Path ---
        // The LFO's output is scaled by the lfoDepth gain node,
        // and the result is used to modulate the pan parameter.
        this.nodes.lfo.type = 'sine';
        this.nodes.lfo.frequency.value = 1;
        this.nodes.lfoDepth.gain.value = 0; // Start with no modulation
        
        this.nodes.lfo.connect(this.nodes.lfoDepth);
        this.nodes.lfoDepth.connect(this.nodes.panner.pan); // Modulate the pan value

        // Start the LFO so it's always running
        this.nodes.lfo.start();
    }

    /**
     * Returns the HTML string for the module's controls.
     */
    getHTML() {
        return `
            <div class="control-row">
                <label for="pannerPan">Pan (L/R):</label>
                <input type="range" id="pannerPan" min="-1" max="1" value="0" step="0.01">
                <span id="pannerPanVal" class="value-display">0.00</span>
            </div>
            <div class="control-row">
                <label for="pannerLfoRate">LFO Rate (Hz):</label>
                <input type="range" id="pannerLfoRate" min="0.1" max="10" value="1" step="0.1">
                <span id="pannerLfoRateVal" class="value-display">1.0</span>
            </div>
            <div class="control-row">
                <label for="pannerLfoDepth">LFO Depth:</label>
                <input type="range" id="pannerLfoDepth" min="0" max="1" value="0" step="0.01">
                <span id="pannerLfoDepthVal" class="value-display">0.00</span>
            </div>
        `;
    }

    /**
     * Finds the UI elements and attaches event listeners.
     * @param {HTMLElement} container - The div containing the module's HTML.
     */
    initUI(container) {
        // Store references to the UI elements
        this.panSlider = container.querySelector('#pannerPan');
        this.panVal = container.querySelector('#pannerPanVal');
        this.rateSlider = container.querySelector('#pannerLfoRate');
        this.rateVal = container.querySelector('#pannerLfoRateVal');
        this.depthSlider = container.querySelector('#pannerLfoDepth');
        this.depthVal = container.querySelector('#pannerLfoDepthVal');
        
        // Attach event listeners
        this.panSlider.addEventListener('input', () => {
            this.panVal.textContent = parseFloat(this.panSlider.value).toFixed(2);
            this.updateParams();
        });
        
        this.rateSlider.addEventListener('input', () => {
            this.rateVal.textContent = parseFloat(this.rateSlider.value).toFixed(1);
            this.updateParams();
        });

        this.depthSlider.addEventListener('input', () => {
            this.depthVal.textContent = parseFloat(this.depthSlider.value).toFixed(2);
            this.updateParams();
        });
    }

    /**
     * Reads values from the controls and updates the audio node parameters.
     */
    updateParams() {
        if (!this.nodes.panner) return;

        const pan = parseFloat(this.panSlider.value);
        const rate = parseFloat(this.rateSlider.value);
        const depth = parseFloat(this.depthSlider.value);
        
        // The 'pan' slider sets the center position of the pan.
        this.nodes.panner.pan.setTargetAtTime(pan, this.audioContext.currentTime, 0.01);
        
        // The LFO rate controls the speed of the auto-pan.
        this.nodes.lfo.frequency.setTargetAtTime(rate, this.audioContext.currentTime, 0.01);

        // The LFO depth controls the width of the pan sweep.
        this.nodes.lfoDepth.gain.setTargetAtTime(depth, this.audioContext.currentTime, 0.01);
    }
}

// --- This line is crucial for the main app to load the module ---
window.registerSynthModule(StereoPannerModule);