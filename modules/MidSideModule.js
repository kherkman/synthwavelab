/**
 * Example Synth Module: A Mid/Side Processor.
 *
 * This module converts a standard Left/Right stereo signal into its
 * Mid (center) and Side (stereo) components, allows for independent gain
 * control of each, and then converts the signal back to L/R stereo.
 * This is a powerful tool for controlling the stereo width of a sound.
 *
 * This module demonstrates:
 * - A complex signal routing matrix for M/S encoding and decoding.
 * - Using GainNodes with inverted gain to perform phase cancellation.
 * - Implementing a professional mixing and mastering utility.
 */
class MidSideModule {
    constructor(audioContext) {
        this.audioContext = audioContext;
        this.id = 'midSideModule';
        this.name = 'Mid/Side Processor';

        // --- Create Audio Nodes ---
        this.nodes = {
            input: this.audioContext.createGain(),
            output: this.audioContext.createGain(),

            // --- M/S ENCODER ---
            // Splits the L/R input signal
            encoderSplitter: this.audioContext.createChannelSplitter(2),
            // These two nodes will sum L+R to create the Mid signal
            midSummer: this.audioContext.createGain(),
            // These nodes will subtract R from L (L + (-R)) to create the Side signal
            sideSummer: this.audioContext.createGain(),
            sideInverter: this.audioContext.createGain(), // Inverts the phase of the R channel

            // --- PROCESSING ---
            midGain: this.audioContext.createGain(),
            sideGain: this.audioContext.createGain(),

            // --- M/S DECODER ---
            // This gain node will be fed by both the processed Mid and Side signals
            leftDecoder: this.audioContext.createGain(),
            // This one will be fed by the Mid and an INVERTED Side signal
            rightDecoder: this.audioContext.createGain(),
            decoderInverter: this.audioContext.createGain(), // Inverts the processed Side signal for the R channel
            // Merges the final L/R signals back together
            merger: this.audioContext.createChannelMerger(2),
        };

        // --- Configure Inverters ---
        this.nodes.sideInverter.gain.value = -1;
        this.nodes.decoderInverter.gain.value = -1;
        
        // --- Connect the M/S ENCODER ---
        this.nodes.input.connect(this.nodes.encoderSplitter);
        
        // Create Mid signal (L+R):
        this.nodes.encoderSplitter.connect(this.nodes.midSummer, 0, 0); // L -> Mid
        this.nodes.encoderSplitter.connect(this.nodes.midSummer, 1, 0); // R -> Mid
        
        // Create Side signal (L-R):
        this.nodes.encoderSplitter.connect(this.nodes.sideSummer, 0, 0);     // L -> Side
        this.nodes.encoderSplitter.connect(this.nodes.sideInverter, 1, 0); // R -> Inverter
        this.nodes.sideInverter.connect(this.nodes.sideSummer);              // -R -> Side

        // --- Connect PROCESSING stage ---
        this.nodes.midSummer.connect(this.nodes.midGain);
        this.nodes.sideSummer.connect(this.nodes.sideGain);

        // --- Connect the M/S DECODER ---
        // Create Left channel (Mid+Side)
        this.nodes.midGain.connect(this.nodes.leftDecoder);
        this.nodes.sideGain.connect(this.nodes.leftDecoder);
        
        // Create Right channel (Mid-Side)
        this.nodes.midGain.connect(this.nodes.rightDecoder);
        this.nodes.sideGain.connect(this.nodes.decoderInverter);
        this.nodes.decoderInverter.connect(this.nodes.rightDecoder);
        
        // --- Final Merge and Output ---
        this.nodes.leftDecoder.connect(this.nodes.merger, 0, 0);
        this.nodes.rightDecoder.connect(this.nodes.merger, 0, 1);
        this.nodes.merger.connect(this.nodes.output);
    }

    /**
     * Returns the HTML string for the module's controls.
     */
    getHTML() {
        return `
            <div class="control-row">
                <label for="msMidGain">Mid Gain (dB):</label>
                <input type="range" id="msMidGain" min="-24" max="24" value="0" step="1">
                <span id="msMidGainVal" class="value-display">0</span>
            </div>
            <div class="control-row">
                <label for="msSideGain">Side Gain (dB):</label>
                <input type="range" id="msSideGain" min="-24" max="24" value="0" step="1">
                <span id="msSideGainVal" class="value-display">0</span>
            </div>
        `;
    }

    /**
     * Finds the UI elements and attaches event listeners.
     */
    initUI(container) {
        this.midGain = { slider: container.querySelector('#msMidGain'), val: container.querySelector('#msMidGainVal') };
        this.sideGain = { slider: container.querySelector('#msSideGain'), val: container.querySelector('#msSideGainVal') };
        
        const connect = (ctrl, decimals = 0) => {
            ctrl.slider.addEventListener('input', () => {
                ctrl.val.textContent = parseFloat(ctrl.slider.value).toFixed(decimals);
                this.updateParams();
            });
        };

        connect(this.midGain);
        connect(this.sideGain);

        this.updateParams();
    }

    /**
     * Reads values from the controls and updates the audio node parameters.
     */
    updateParams() {
        if (!this.nodes.midGain) return;
        
        const time = this.audioContext.currentTime;
        const smoothing = 0.01;
        
        // Convert decibels to a linear gain value
        const midGainDb = parseFloat(this.midGain.slider.value);
        const midGainLinear = Math.pow(10, midGainDb / 20);
        
        const sideGainDb = parseFloat(this.sideGain.slider.value);
        const sideGainLinear = Math.pow(10, sideGainDb / 20);
        
        this.nodes.midGain.gain.setTargetAtTime(midGainLinear, time, smoothing);
        this.nodes.sideGain.gain.setTargetAtTime(sideGainLinear, time, smoothing);
    }
}

// --- This line is crucial for the main app to load the module ---
window.registerSynthModule(MidSideModule);