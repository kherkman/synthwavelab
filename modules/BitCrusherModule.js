/**
 * Example Synth Module: A Bit Crusher.
 *
 * This module creates a digital "lo-fi" effect by reducing the bit depth
 * and sample rate of the incoming audio signal.
 *
 * It is implemented using the (deprecated but simple-to-demonstrate)
 * ScriptProcessorNode to directly manipulate audio samples. For new projects,
 * AudioWorkletNode is the modern replacement.
 *
 * This module demonstrates:
 * - Direct audio buffer manipulation via ScriptProcessorNode.
 * - Implementing two distinct DSP effects: quantization and decimation.
 */
class BitCrusherModule {
    constructor(audioContext) {
        this.audioContext = audioContext;
        this.id = 'bitCrusherModule'; // A unique ID
        this.name = 'Bit Crusher';    // The display name

        // --- Module parameters (will be updated by UI) ---
        this.bitDepth = 8; // Effective bit depth (1 to 16)
        this.frequencyReduction = 1; // Factor to divide sample rate by (1 = no reduction)

        // --- Create Audio Nodes ---
        // The ScriptProcessorNode is the core of this effect.
        const bufferSize = 1024; // A common buffer size
        this.nodes = {
            input: this.audioContext.createGain(),
            output: this.audioContext.createGain(),
            processor: this.audioContext.createScriptProcessor(bufferSize, 1, 1),
        };

        // --- Connect the audio graph ---
        this.nodes.input.connect(this.nodes.processor);
        this.nodes.processor.connect(this.nodes.output);

        // --- Set up the audio processing logic ---
        // This function is called repeatedly to process chunks of audio data.
        this.nodes.processor.onaudioprocess = this._processAudio.bind(this);
    }

    /**
     * The main audio processing function.
     * @private
     */
    _processAudio(audioProcessingEvent) {
        const inputBuffer = audioProcessingEvent.inputBuffer;
        const outputBuffer = audioProcessingEvent.outputBuffer;
        const inputData = inputBuffer.getChannelData(0);
        const outputData = outputBuffer.getChannelData(0);

        // Calculate the number of quantization steps based on bit depth
        const steps = Math.pow(2, this.bitDepth);
        
        let phase = 0;
        let lastSample = 0;

        for (let i = 0; i < inputData.length; i++) {
            // --- 1. Sample Rate Reduction (Crushing) ---
            // We only take a new sample from the input when the phase resets.
            // Otherwise, we hold the previous sample.
            phase++;
            if (phase >= this.frequencyReduction) {
                phase = 0;
                lastSample = inputData[i];
            }
            
            // --- 2. Bit Depth Reduction (Quantization) ---
            // We snap the held sample to the nearest "step".
            const totalSteps = steps - 1;
            // Scale sample from [-1, 1] to [0, totalSteps]
            const scaledSample = Math.round((lastSample + 1) / 2 * totalSteps);
            // Scale back to [-1, 1]
            const quantizedSample = (scaledSample / totalSteps) * 2 - 1;
            
            outputData[i] = quantizedSample;
        }
    }

    /**
     * Returns the HTML string for the module's controls.
     */
    getHTML() {
        return `
            <div class="control-row">
                <label for="crusherBitDepth">Bit Depth:</label>
                <input type="range" id="crusherBitDepth" min="1" max="16" value="8" step="1">
                <span id="crusherBitDepthVal" class="value-display">8</span>
            </div>
            <div class="control-row">
                <label for="crusherFreqReduction">Crush:</label>
                <input type="range" id="crusherFreqReduction" min="1" max="50" value="1" step="1">
                <span id="crusherFreqReductionVal" class="value-display">1</span>
            </div>
        `;
    }

    /**
     * Finds the UI elements and attaches event listeners.
     * @param {HTMLElement} container - The div containing the module's HTML.
     */
    initUI(container) {
        this.bitDepthSlider = container.querySelector('#crusherBitDepth');
        this.bitDepthVal = container.querySelector('#crusherBitDepthVal');
        this.freqReductionSlider = container.querySelector('#crusherFreqReduction');
        this.freqReductionVal = container.querySelector('#crusherFreqReductionVal');
        
        this.bitDepthSlider.addEventListener('input', () => {
            this.bitDepthVal.textContent = this.bitDepthSlider.value;
            this.updateParams();
        });
        
        this.freqReductionSlider.addEventListener('input', () => {
            this.freqReductionVal.textContent = this.freqReductionSlider.value;
            this.updateParams();
        });

        this.updateParams();
    }

    /**
     * Reads values from the controls and updates the module's internal parameters.
     * These parameters are then read by the `_processAudio` function.
     */
    updateParams() {
        this.bitDepth = parseInt(this.bitDepthSlider.value, 10);
        this.frequencyReduction = parseInt(this.freqReductionSlider.value, 10);
    }
}

// --- This line is crucial for the main app to load the module ---
window.registerSynthModule(BitCrusherModule);