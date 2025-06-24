/**
 * Example Synth Module: A Decimator with Jitter.
 *
 * This module creates a lo-fi effect by reducing the effective sample rate
 * of the audio signal (a process called decimation). It includes a "Jitter"
 * control to add random instability to the timing of the decimation process,
 * which adds a unique noisy character.
 *
 * This module demonstrates:
 * - A second, different implementation using ScriptProcessorNode.
 * - A focus on timing-based DSP rather than value-based.
 * - The creative use of randomness for sound design.
 */
class DecimatorModule {
    constructor(audioContext) {
        this.audioContext = audioContext;
        this.id = 'decimatorModule';
        this.name = 'Decimator';

        // Internal state for the script processor
        this.decimationRate = 1; // How many samples to skip (1 = none)
        this.jitterAmount = 0;   // How much random variation in the rate

        // --- Create Audio Nodes ---
        // The ScriptProcessorNode is the core of this effect.
        const bufferSize = 1024;
        this.nodes = {
            input: this.audioContext.createGain(),
            output: this.audioContext.createGain(),
            processor: this.audioContext.createScriptProcessor(bufferSize, 1, 1),
        };

        // --- Connect the audio graph ---
        this.nodes.input.connect(this.nodes.processor);
        this.nodes.processor.connect(this.nodes.output);

        // --- Set up the audio processing logic ---
        this.nodes.processor.onaudioprocess = this._processAudio.bind(this);
    }

    /**
     * The main audio processing function.
     * @private
     */
    _processAudio(audioProcessingEvent) {
        const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
        const outputData = audioProcessingEvent.outputBuffer.getChannelData(0);
        
        let lastSample = 0;
        // Use a floating point counter to handle non-integer rates smoothly
        let sampleCounter = 0; 

        for (let i = 0; i < inputData.length; i++) {
            // Calculate the current step size, including jitter
            // The jitter adds a random offset to the decimation rate for each new sample hold.
            const jitter = (Math.random() - 0.5) * this.jitterAmount;
            const currentRate = Math.max(1, this.decimationRate + jitter);
            
            // Increment our counter by a normalized amount. When it exceeds 1,
            // it's time to grab a new sample from the input.
            sampleCounter += 1 / currentRate;

            if (sampleCounter >= 1.0) {
                sampleCounter -= 1.0; // Reset the counter, keeping the remainder
                lastSample = inputData[i];
            }
            
            // The output is always the last sample we grabbed.
            outputData[i] = lastSample;
        }
    }

    /**
     * Returns the HTML string for the module's controls.
     */
    getHTML() {
        return `
            <div class="control-row">
                <label for="decimatorRate">Decimation Rate:</label>
                <input type="range" id="decimatorRate" min="1" max="100" value="1" step="1">
                <span id="decimatorRateVal" class="value-display">1</span>
            </div>
            <div class="control-row">
                <label for="decimatorJitter">Jitter:</label>
                <input type="range" id="decimatorJitter" min="0" max="50" value="0" step="1">
                <span id="decimatorJitterVal" class="value-display">0</span>
            </div>
        `;
    }

    /**
     * Finds the UI elements and attaches event listeners.
     * @param {HTMLElement} container - The div containing the module's HTML.
     */
    initUI(container) {
        this.rate = { slider: container.querySelector('#decimatorRate'), val: container.querySelector('#decimatorRateVal') };
        this.jitter = { slider: container.querySelector('#decimatorJitter'), val: container.querySelector('#decimatorJitterVal') };
        
        const connect = (ctrl, decimals = 0) => {
            ctrl.slider.addEventListener('input', () => {
                ctrl.val.textContent = parseFloat(ctrl.slider.value).toFixed(decimals);
                this.updateParams();
            });
        };
        
        connect(this.rate);
        connect(this.jitter);

        this.updateParams();
    }

    /**
     * Reads values from the controls and updates the module's internal parameters.
     * These parameters are then read by the `_processAudio` function.
     */
    updateParams() {
        this.decimationRate = parseInt(this.rate.slider.value, 10);
        this.jitterAmount = parseInt(this.jitter.slider.value, 10);
    }
}

// --- This line is crucial for the main app to load the module ---
window.registerSynthModule(DecimatorModule);