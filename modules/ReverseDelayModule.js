/**
 * Example Synth Module: A Reverse Delay.
 *
 * This module records incoming audio into a buffer, and then plays it
 * back in reverse. It uses a "circular buffer" technique to continuously
 * record and play back without interruption.
 *
 * This module demonstrates:
 * - A complex audio processing task using ScriptProcessorNode.
 * - Implementing a circular buffer for audio data.
 * - Buffer manipulation (reading an array backwards).
 */
class ReverseDelayModule {
    constructor(audioContext) {
        this.audioContext = audioContext;
        this.id = 'reverseDelayModule';
        this.name = 'Reverse Delay';

        this.maxDelayTime = 2.0; // Max 2 seconds of delay
        
        // --- Create a buffer to store audio for reversing ---
        const bufferSize = this.audioContext.sampleRate * this.maxDelayTime;
        this.delayBuffer = new Float32Array(bufferSize);
        this.writePosition = 0; // Where we are currently writing in the buffer

        // --- Create Audio Nodes ---
        this.nodes = {
            input: this.audioContext.createGain(),
            output: this.audioContext.createGain(),
            dryGain: this.audioContext.createGain(),
            wetGain: this.audioContext.createGain(),
            feedbackGain: this.audioContext.createGain(),
            // The processor node is where the reverse logic happens.
            processor: this.audioContext.createScriptProcessor(1024, 1, 1),
        };

        // --- Connect the Audio Graph ---
        // 1. Wet/Dry Mix
        this.nodes.input.connect(this.nodes.dryGain);
        this.nodes.dryGain.connect(this.nodes.output);
        this.nodes.processor.connect(this.nodes.wetGain);
        this.nodes.wetGain.connect(this.nodes.output);
        
        // 2. Main Signal Path
        this.nodes.input.connect(this.nodes.processor);
        
        // 3. Feedback Path
        // The processed (reversed) signal is fed back into the processor's input.
        this.nodes.processor.connect(this.nodes.feedbackGain);
        this.nodes.feedbackGain.connect(this.nodes.processor);
        
        // --- Set up the reverse logic ---
        this.nodes.processor.onaudioprocess = this._processReverse.bind(this);
    }

    /**
     * The main audio processing function for reversing the audio.
     * @private
     */
    _processReverse(audioProcessingEvent) {
        const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
        const outputData = audioProcessingEvent.outputBuffer.getChannelData(0);
        const bufferSize = inputData.length;
        
        const delayTimeSamples = this.audioContext.sampleRate * parseFloat(this.time.slider.value);
        
        for (let i = 0; i < bufferSize; i++) {
            // --- Write to the buffer ---
            // Write the current input sample to our delay buffer at the write position.
            this.delayBuffer[this.writePosition] = inputData[i];

            // --- Read from the buffer ---
            // Calculate the position to read from (in the past, reversed).
            let readPosition = this.writePosition - delayTimeSamples;
            
            // To make it "reverse," we read from a mirrored position within the delay segment.
            // We find our position within the current delay "slice"
            const slicePos = (this.writePosition % delayTimeSamples);
            // And read from the opposite end of that slice.
            const reverseReadPos = readPosition + (delayTimeSamples - slicePos * 2);

            // Handle buffer wrapping (circular buffer logic)
            if (reverseReadPos < 0) {
                readPosition = this.delayBuffer.length + reverseReadPos;
            } else {
                readPosition = reverseReadPos;
            }
            
            // The output is the sample we read from the past.
            outputData[i] = this.delayBuffer[Math.floor(readPosition)];

            // --- Advance the write head ---
            this.writePosition++;
            if (this.writePosition >= this.delayBuffer.length) {
                this.writePosition = 0;
            }
        }
    }

    /**
     * Returns the HTML string for the module's controls.
     */
    getHTML() {
        return `
            <div class="control-row">
                <label for="revDelayTime">Time (s):</label>
                <input type="range" id="revDelayTime" min="0.05" max="${this.maxDelayTime}" value="0.5" step="0.01">
                <span id="revDelayTimeVal" class="value-display">0.50</span>
            </div>
            <div class="control-row">
                <label for="revDelayFeedback">Feedback:</label>
                <input type="range" id="revDelayFeedback" min="0" max="0.9" value="0.3" step="0.01">
                <span id="revDelayFeedbackVal" class="value-display">0.30</span>
            </div>
            <div class="control-row">
                <label for="revDelayMix">Mix (Wet):</label>
                <input type="range" id="revDelayMix" min="0" max="1" value="0.5" step="0.01">
                <span id="revDelayMixVal" class="value-display">0.50</span>
            </div>
        `;
    }

    /**
     * Finds the UI elements and attaches event listeners.
     */
    initUI(container) {
        this.time = { slider: container.querySelector('#revDelayTime'), val: container.querySelector('#revDelayTimeVal') };
        this.feedback = { slider: container.querySelector('#revDelayFeedback'), val: container.querySelector('#revDelayFeedbackVal') };
        this.mix = { slider: container.querySelector('#revDelayMix'), val: container.querySelector('#revDelayMixVal') };

        const connect = (ctrl, decimals = 2) => {
            ctrl.slider.addEventListener('input', () => {
                ctrl.val.textContent = parseFloat(ctrl.slider.value).toFixed(decimals);
                this.updateParams();
            });
        };
        
        connect(this.time);
        connect(this.feedback);
        connect(this.mix);

        this.updateParams();
    }

    /**
     * Reads values from the controls and updates the audio node parameters.
     */
    updateParams() {
        if (!this.nodes.input) return;
        const time = this.audioContext.currentTime;
        const smoothing = 0.01;
        
        const feedback = parseFloat(this.feedback.slider.value);
        this.nodes.feedbackGain.gain.setTargetAtTime(feedback, time, smoothing);
        
        const mix = parseFloat(this.mix.slider.value);
        this.nodes.wetGain.gain.setTargetAtTime(mix, time, smoothing);
        this.nodes.dryGain.gain.setTargetAtTime(1.0 - mix, time, smoothing);
        
        // The delay time is read directly by the script processor, so no audio param is set here.
    }
}

// --- This line is crucial for the main app to load the module ---
window.registerSynthModule(ReverseDelayModule);