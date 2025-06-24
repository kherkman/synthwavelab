/**
 * Example Synth Module: A simple Low-Pass Filter.
 *
 * To create your own module, follow this class structure.
 *
 * Required properties:
 * - id: A unique string for your module (e.g., 'myCustomFx').
 * - name: The display name for the module's UI panel.
 * - nodes: An object containing at least `input` and `output` AudioNodes.
 *
 * Required methods:
 * - constructor(audioContext): Sets up the audio nodes.
 * - getHTML(): Returns an HTML string for the module's controls.
 * - initUI(container): Attaches event listeners to the controls created by getHTML().
 * - updateParams(): Reads values from the controls and updates the audio nodes.
 *
 * The final line of the file MUST be:
 *   window.registerSynthModule(YourModuleClassName);
 */
class LowPassFilterModule {
    constructor(audioContext) {
        this.audioContext = audioContext;
        this.id = 'lpfModule'; // unique ID
        this.name = 'LPF Module'; // Display Name

        // Create Audio Nodes for the effect
        this.nodes = {
            input: this.audioContext.createGain(),
            output: this.audioContext.createGain(),
            filter: this.audioContext.createBiquadFilter(),
        };
        
        // Configure the filter node
        this.nodes.filter.type = 'lowpass';
        this.nodes.filter.frequency.value = 20000;
        this.nodes.filter.Q.value = 1;

        // Connect the internal audio path: input -> filter -> output
        this.nodes.input.connect(this.nodes.filter);
        this.nodes.filter.connect(this.nodes.output);
    }

    /**
     * Returns the HTML string for the module's controls.
     * Use standard class names for styling consistency.
     */
    getHTML() {
        return `
            <div class="control-row">
                <label for="lpfCutoff">Cutoff (Hz):</label>
                <input type="range" id="lpfCutoff" min="100" max="20000" value="20000" step="100">
                <span id="lpfCutoffVal" class="value-display">20000</span>
            </div>
            <div class="control-row">
                <label for="lpfQ">Resonance (Q):</label>
                <input type="range" id="lpfQ" min="0.1" max="20" value="1" step="0.1">
                <span id="lpfQVal" class="value-display">1.0</span>
            </div>
        `;
    }

    /**
     * Finds the UI elements within the module's container and attaches event listeners.
     * @param {HTMLElement} container - The div containing the module's HTML.
     */
    initUI(container) {
        // Store references to the UI elements for easy access
        this.cutoffSlider = container.querySelector('#lpfCutoff');
        this.qSlider = container.querySelector('#lpfQ');
        this.cutoffVal = container.querySelector('#lpfCutoffVal');
        this.qVal = container.querySelector('#lpfQVal');
        
        // Attach event listeners to call updateParams when controls change
        this.cutoffSlider.addEventListener('input', () => {
            this.cutoffVal.textContent = this.cutoffSlider.value;
            this.updateParams();
        });
        
        this.qSlider.addEventListener('input', () => {
            this.qVal.textContent = parseFloat(this.qSlider.value).toFixed(1);
            this.updateParams();
        });
    }

    /**
     * Reads values from the controls and updates the audio node parameters.
     */
    updateParams() {
        if (this.nodes.filter) {
            const cutoff = parseFloat(this.cutoffSlider.value);
            const q = parseFloat(this.qSlider.value);
            this.nodes.filter.frequency.setTargetAtTime(cutoff, this.audioContext.currentTime, 0.01);
            this.nodes.filter.Q.setTargetAtTime(q, this.audioContext.currentTime, 0.01);
        }
    }
}

// --- This line is crucial for the main app to load the module ---
window.registerSynthModule(LowPassFilterModule);