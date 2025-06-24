/**
 * Example Synth Module: A Stereo Widener (Haas Effect).
 *
 * This module creates a stereo widening effect by applying a very short
 * delay to one channel. This tricks the human ear into perceiving a wider
 * stereo image from a mono source.
 *
 * This module demonstrates:
 * - Splitting a signal path using ChannelSplitterNode and ChannelMergerNode.
 * - Implementing a simple, but effective, psychoacoustic effect.
 * - Creating an intuitive "Width" control that crossfades between a mono
 *   and a wide signal.
 */
class StereoWidenerModule {
    constructor(audioContext) {
        this.audioContext = audioContext;
        this.id = 'stereoWidenerModule'; // A unique ID
        this.name = 'Stereo Widener';    // The display name

        // --- Create Audio Nodes ---
        this.nodes = {
            input: this.audioContext.createGain(),
            output: this.audioContext.createGain(),
            // Splitter/merger to handle left and right channels independently
            splitter: this.audioContext.createChannelSplitter(2),
            merger: this.audioContext.createChannelMerger(2),
            // A very short delay for the right channel
            delay: this.audioContext.createDelay(0.05), // Max 50ms delay
            // Gain nodes for the right channel's wet/dry mix (the "Width" control)
            dryGain: this.audioContext.createGain(), // Non-delayed signal
            wetGain: this.audioContext.createGain(), // Delayed signal
        };

        // --- Connect the audio graph ---
        
        // 1. Input signal is split into L/R. We primarily use the left (channel 0)
        //    as the source to ensure mono-compatibility.
        this.nodes.input.connect(this.nodes.splitter);

        // 2. The LEFT channel path is direct:
        //    splitter.L -> merger.L
        this.nodes.splitter.connect(this.nodes.merger, 0, 0);

        // 3. The RIGHT channel path is a mix of direct and delayed signals:
        //    - Direct ("dry") path for mono signal: splitter.L -> dryGain -> merger.R
        this.nodes.splitter.connect(this.nodes.dryGain, 0);
        this.nodes.dryGain.connect(this.nodes.merger, 0, 1);
        
        //    - Delayed ("wet") path for stereo width: splitter.L -> delay -> wetGain -> merger.R
        this.nodes.splitter.connect(this.nodes.delay, 0);
        this.nodes.delay.connect(this.nodes.wetGain);
        this.nodes.wetGain.connect(this.nodes.merger, 0, 1);

        // 4. The merged stereo signal goes to the module's main output.
        this.nodes.merger.connect(this.nodes.output);
    }

    /**
     * Returns the HTML string for the module's controls.
     */
    getHTML() {
        return `
            <div class="control-row">
                <label for="widenerWidth">Width:</label>
                <input type="range" id="widenerWidth" min="0" max="1" value="0.5" step="0.01">
                <span id="widenerWidthVal" class="value-display">0.50</span>
            </div>
            <div class="control-row">
                <label for="widenerDelay">Delay (ms):</label>
                <input type="range" id="widenerDelay" min="1" max="50" value="15" step="0.1">
                <span id="widenerDelayVal" class="value-display">15.0</span>
            </div>
        `;
    }

    /**
     * Finds the UI elements and attaches event listeners.
     * @param {HTMLElement} container - The div containing the module's HTML.
     */
    initUI(container) {
        // Store references to UI elements
        this.widthSlider = container.querySelector('#widenerWidth');
        this.widthVal = container.querySelector('#widenerWidthVal');
        this.delaySlider = container.querySelector('#widenerDelay');
        this.delayVal = container.querySelector('#widenerDelayVal');

        // Attach event listeners
        this.widthSlider.addEventListener('input', () => {
            this.widthVal.textContent = parseFloat(this.widthSlider.value).toFixed(2);
            this.updateParams();
        });
        
        this.delaySlider.addEventListener('input', () => {
            this.delayVal.textContent = parseFloat(this.delaySlider.value).toFixed(1);
            this.updateParams();
        });

        // Initialize parameters on load
        this.updateParams();
    }

    /**
     * Reads values from the controls and updates the audio node parameters.
     */
    updateParams() {
        if (!this.nodes.delay) return;
        
        const width = parseFloat(this.widthSlider.value);
        const delayMs = parseFloat(this.delaySlider.value);
        const delaySec = delayMs / 1000.0;
        const time = this.audioContext.currentTime;
        const smoothing = 0.01;

        // Set the delay time for the right channel
        this.nodes.delay.delayTime.setTargetAtTime(delaySec, time, smoothing);
        
        // Crossfade the right channel between the direct (dry) and delayed (wet) signal.
        // At width=0, dry=1 and wet=0 (mono).
        // At width=1, dry=0 and wet=1 (fully widened).
        this.nodes.dryGain.gain.setTargetAtTime(1 - width, time, smoothing);
        this.nodes.wetGain.gain.setTargetAtTime(width, time, smoothing);
    }
}

// --- This line is crucial for the main app to load the module ---
window.registerSynthModule(StereoWidenerModule);