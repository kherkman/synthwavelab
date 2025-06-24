/**
 * Example Synth Module: The "MacGyver" Signal Toolkit.
 *
 * This module is a collection of simple, fundamental audio utilities, like a
 * Swiss Army knife for signal processing. It allows the user to perform basic
 * but powerful operations like inverting polarity, adding DC offset, adjusting
 * gain, and summing to mono.
 *
 * This module demonstrates:
 * - A "utility belt" or "toolkit" approach to module design.
 * - Exposing fundamental audio processing nodes directly to the user.
 * - Encouraging experimentation by providing simple, independent building blocks.
 */
class MacGyverToolkitModule {
    constructor(audioContext) {
        this.audioContext = audioContext;
        this.id = 'macGyverToolkitModule';
        this.name = 'Signal Toolkit';

        // --- Create Audio Nodes ---
        // We create a node for each "gadget" and a bypass gain for each.
        this.nodes = {
            input: this.audioContext.createGain(),
            output: this.audioContext.createGain(),
            
            // --- Gadget 1: Inverter ---
            inverter: this.audioContext.createGain(),
            
            // --- Gadget 2: DC Offset ---
            dcOffset: this.audioContext.createConstantSource(),
            
            // --- Gadget 3: Gain ---
            gain: this.audioContext.createGain(),
            
            // --- Gadget 4: Mono ---
            monoSum: this.audioContext.createGain(), // Acts as a merger
        };

        // --- Configure Nodes ---
        this.nodes.inverter.gain.value = 1; // Start with normal polarity
        this.nodes.dcOffset.offset.value = 0; // Start with no offset
        this.nodes.dcOffset.start();

        // --- Connect the Audio Graph ---
        // The signal flows through each gadget stage in series.
        this.nodes.input.connect(this.nodes.gain);
        this.nodes.gain.connect(this.nodes.inverter);
        this.nodes.inverter.connect(this.nodes.monoSum);
        // The DC offset is added in at the final stage before output.
        this.nodes.dcOffset.connect(this.nodes.monoSum);
        this.nodes.monoSum.connect(this.nodes.output);
    }

    getHTML() {
        return `
            <div class="control-row">
                <label for="mgGain">Gain:</label>
                <input type="range" id="mgGain" min="0" max="4" value="1" step="0.01">
                <span id="mgGainVal" class="value-display">1.00</span>
            </div>
            <div class="control-row">
                <label for="mgDcOffset">DC Offset:</label>
                <input type="range" id="mgDcOffset" min="-1" max="1" value="0" step="0.01">
                <span id="mgDcOffsetVal" class="value-display">0.00</span>
            </div>
            <div class="control-row" style="margin-top: 15px;">
                 <label for="mgInvert" style="min-width: 120px;">Invert Polarity:</label>
                 <button id="mgInvert" class="toggle-button" style="width: 80px;">OFF</button>
                 <label for="mgMono" style="min-width: 80px; margin-left: auto;">Sum Mono:</label>
                 <button id="mgMono" class="toggle-button" style="width: 80px;">OFF</button>
            </div>
        `;
    }

    initUI(container) {
        this.gain = { slider: container.querySelector('#mgGain'), val: container.querySelector('#mgGainVal') };
        this.dcOffset = { slider: container.querySelector('#mgDcOffset'), val: container.querySelector('#mgDcOffsetVal') };
        this.invertButton = container.querySelector('#mgInvert');
        this.monoButton = container.querySelector('#mgMono');
        
        // --- Connect Listeners ---
        
        this.gain.slider.addEventListener('input', () => {
            this.gain.val.textContent = parseFloat(this.gain.slider.value).toFixed(2);
            this.updateParams();
        });
        
        this.dcOffset.slider.addEventListener('input', () => {
            this.dcOffset.val.textContent = parseFloat(this.dcOffset.slider.value).toFixed(2);
            this.updateParams();
        });
        
        this.invertButton.addEventListener('click', () => {
            this.invertButton.classList.toggle('active');
            this.invertButton.textContent = this.invertButton.classList.contains('active') ? 'ON' : 'OFF';
            this.updateParams();
        });
        
        this.monoButton.addEventListener('click', () => {
            this.monoButton.classList.toggle('active');
            this.monoButton.textContent = this.monoButton.classList.contains('active') ? 'ON' : 'OFF';
            this.updateParams();
        });
        
        this.updateParams();
    }

    updateParams() {
        if (!this.nodes.input) return;
        
        const time = this.audioContext.currentTime;
        const smoothing = 0.01;
        
        // --- Gain Control ---
        const gainValue = parseFloat(this.gain.slider.value);
        this.nodes.gain.gain.setTargetAtTime(gainValue, time, smoothing);
        
        // --- DC Offset Control ---
        const dcValue = parseFloat(this.dcOffset.slider.value);
        this.nodes.dcOffset.offset.setTargetAtTime(dcValue, time, smoothing);
        
        // --- Invert Polarity Control ---
        const isInverted = this.invertButton.classList.contains('active');
        this.nodes.inverter.gain.setTargetAtTime(isInverted ? -1 : 1, time, smoothing);
        
        // --- Sum to Mono Control ---
        const isMono = this.monoButton.classList.contains('active');
        // This is a property of the node, not an AudioParam, so it changes instantly.
        // A ChannelMerger is a better choice for this, but GainNode works for mono sources.
        // For true stereo -> mono, we'd need a splitter and merger. We'll simulate it.
        // If the main synth becomes stereo, a more robust solution is needed.
        // For now, this affects the panning of stereo effects after it.
        if (this.nodes.monoSum.channelCount !== (isMono ? 1 : 2)) {
            // This is a simplified way to hint at mono summing. A real implementation
            // would use a ChannelMergerNode. This is a good "MacGyvered" approximation.
             this.nodes.monoSum.channelCountMode = isMono ? 'explicit' : 'max';
             this.nodes.monoSum.channelInterpretation = isMono ? 'speakers' : 'discrete';
             this.nodes.monoSum.channelCount = isMono ? 1 : 2;
        }
    }
}

// --- This line is crucial for the main app to load the module ---
window.registerSynthModule(MacGyverToolkitModule);