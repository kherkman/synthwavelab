/**
 * Example Synth Module: A Sub-Oscillator with Pitch Detection.
 *
 * This module detects the fundamental frequency of the incoming audio and
 * generates a sine wave one or two octaves below it. This adds low-end
 * weight and power to a sound.
 *
 * This module demonstrates:
 * - Real-time pitch detection using an autocorrelation algorithm.
 * - A practical and complex use of the ScriptProcessorNode for analysis.
 * - Generating a new audio signal (a sine wave) in response to an input.
 */
class SubOscillatorModule {
    constructor(audioContext) {
        this.audioContext = audioContext;
        this.id = 'subOscillatorModule';
        this.name = 'Sub Oscillator';

        // Pitch detection parameters
        this.bufferSize = 2048; // Larger buffer for better low-frequency accuracy
        this.pitchHistory = []; // For smoothing the detected pitch
        this.historyLength = 5;

        // --- Create Audio Nodes ---
        this.nodes = {
            input: this.audioContext.createGain(),
            output: this.audioContext.createGain(),
            // The processor node for analyzing the input signal
            analyser: this.audioContext.createScriptProcessor(this.bufferSize, 1, 1),
            // The oscillator that will generate the sub-bass tone
            subOsc: this.audioContext.createOscillator(),
            // Gain control for the generated sub-bass tone
            subGain: this.audioContext.createGain(),
        };

        // --- Configure and Connect the Audio Graph ---
        // 1. The original "dry" signal passes straight through to the output.
        this.nodes.input.connect(this.nodes.output);

        // 2. A copy of the input signal goes to the analyser for pitch detection.
        this.nodes.input.connect(this.nodes.analyser);
        // The analyser's output is not connected anywhere, as it's only for analysis.
        // We must connect it to something, so we connect it to a dummy node that will be garbage collected.
        this.nodes.analyser.connect(this.audioContext.destination);
        this.nodes.analyser.disconnect(this.audioContext.destination);


        // 3. The sub-oscillator is generated and mixed into the output.
        this.nodes.subOsc.type = 'sine';
        this.nodes.subOsc.start();
        this.nodes.subOsc.connect(this.nodes.subGain);
        this.nodes.subGain.connect(this.nodes.output);

        // --- Set up the pitch detection logic ---
        this.nodes.analyser.onaudioprocess = this._detectPitch.bind(this);
    }

    /**
     * Pitch detection algorithm using autocorrelation.
     * @private
     */
    _detectPitch(audioProcessingEvent) {
        const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
        const sampleRate = this.audioContext.sampleRate;
        const bufferSize = this.bufferSize;

        // --- Autocorrelation Algorithm ---
        const rms = Math.sqrt(inputData.reduce((s, v) => s + v * v, 0) / bufferSize);
        // Don't try to detect pitch if the signal is too quiet
        if (rms < 0.02) {
            this.nodes.subOsc.frequency.setTargetAtTime(0, this.audioContext.currentTime, 0.1);
            return;
        }

        let bestCorrelation = 0;
        let bestOffset = -1;
        
        // Find the offset with the highest correlation
        for (let offset = 80; offset < bufferSize / 2; offset++) {
            let correlation = 0;
            for (let i = 0; i < bufferSize / 2; i++) {
                correlation += Math.abs(inputData[i] - inputData[i + offset]);
            }
            correlation = 1 - (correlation / (bufferSize / 2));
            if (correlation > bestCorrelation) {
                bestCorrelation = correlation;
                bestOffset = offset;
            }
        }

        let detectedPitch = 0;
        if (bestCorrelation > 0.9) { // Confidence threshold
            detectedPitch = sampleRate / bestOffset;
        }

        // --- Smoothing ---
        // Average the last few detected pitches for a more stable result.
        this.pitchHistory.push(detectedPitch);
        if (this.pitchHistory.length > this.historyLength) {
            this.pitchHistory.shift();
        }
        const smoothedPitch = this.pitchHistory.reduce((a, b) => a + b, 0) / this.pitchHistory.length;
        
        if (smoothedPitch > 0) {
            const octaveShift = parseInt(this.octave.slider.value, 10);
            const subFrequency = smoothedPitch / Math.pow(2, octaveShift);
            this.nodes.subOsc.frequency.setTargetAtTime(subFrequency, this.audioContext.currentTime, 0.01);
        } else {
            // If no pitch is detected, fade the sub to silence.
            this.nodes.subOsc.frequency.setTargetAtTime(0, this.audioContext.currentTime, 0.1);
        }
    }

    /**
     * Returns the HTML string for the module's controls.
     */
    getHTML() {
        return `
            <div class="control-row">
                <label for="subOscLevel">Sub Level:</label>
                <input type="range" id="subOscLevel" min="0" max="1.5" value="0.5" step="0.01">
                <span id="subOscLevelVal" class="value-display">0.50</span>
            </div>
            <div class="control-row">
                <label for="subOscOctave">Sub Octave:</label>
                <select id="subOscOctave" style="flex-grow:1;">
                    <option value="1">-1 Octave</option>
                    <option value="2" selected>-2 Octaves</option>
                </select>
            </div>
            <div class="control-row">
                <label for="subOscWave">Waveform:</label>
                 <select id="subOscWave" style="flex-grow:1;">
                    <option value="sine" selected>Sine</option>
                    <option value="square">Square</option>
                    <option value="triangle">Triangle</option>
                </select>
            </div>
        `;
    }

    /**
     * Finds the UI elements and attaches event listeners.
     */
    initUI(container) {
        this.level = { slider: container.querySelector('#subOscLevel'), val: container.querySelector('#subOscLevelVal') };
        this.octave = { slider: container.querySelector('#subOscOctave') };
        this.wave = { slider: container.querySelector('#subOscWave') };
        
        this.level.slider.addEventListener('input', () => {
            this.level.val.textContent = parseFloat(this.level.slider.value).toFixed(2);
            this.updateParams();
        });
        
        this.octave.slider.addEventListener('change', () => this.updateParams());
        this.wave.slider.addEventListener('change', () => this.updateParams());

        this.updateParams();
    }

    /**
     * Reads values from the controls and updates the audio node parameters.
     */
    updateParams() {
        if (!this.nodes.subOsc) return;
        const time = this.audioContext.currentTime;
        const smoothing = 0.02;

        const level = parseFloat(this.level.slider.value);
        this.nodes.subGain.gain.setTargetAtTime(level, time, smoothing);
        
        const waveType = this.wave.slider.value;
        this.nodes.subOsc.type = waveType;

        // The octave is read directly by the pitch detection algorithm,
        // so no audio param needs to be set here for that.
    }
}

// --- This line is crucial for the main app to load the module ---
window.registerSynthModule(SubOscillatorModule);