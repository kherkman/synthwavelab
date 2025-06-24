/**
 * Example Synth Module: A Tape Echo.
 *
 * This module simulates the sound of a vintage tape echo machine. It features
 * a filter and saturation stage within the feedback loop, causing each echo
* to sound darker and warmer than the last. It also includes subtle pitch
 * modulation to simulate "wow and flutter."
 *
 * This module demonstrates:
 * - A complex feedback path with multiple processing stages.
 * - Simulating the character and imperfections of analog hardware.
 * - Combining delay, filtering, distortion, and LFOs into one cohesive effect.
 */
class TapeEchoModule {
    constructor(audioContext) {
        this.audioContext = audioContext;
        this.id = 'tapeEchoModule';
        this.name = 'Tape Echo';

        // --- Create Audio Nodes ---
        this.nodes = {
            input: this.audioContext.createGain(),
            output: this.audioContext.createGain(),
            dryGain: this.audioContext.createGain(),
            wetGain: this.audioContext.createGain(),
            
            // The main delay line
            delay: this.audioContext.createDelay(5.0),
            
            // --- Feedback Path Nodes ---
            feedback: this.audioContext.createGain(),
            // A filter to darken each repeat
            toneFilter: this.audioContext.createBiquadFilter(),
            // A waveshaper for subtle tape saturation
            saturator: this.audioContext.createWaveShaper(),
            
            // --- Wow & Flutter LFO ---
            flutterLFO: this.audioContext.createOscillator(),
            flutterDepth: this.audioContext.createGain(),
        };

        // --- Configure Nodes ---
        this.nodes.toneFilter.type = 'lowpass';
        this.nodes.flutterLFO.type = 'sine';
        this.nodes.flutterLFO.frequency.value = 4; // A gentle 4Hz flutter
        this.nodes.flutterLFO.start();
        
        // Create a gentle saturation curve
        const curve = new Float32Array(256);
        for (let i = 0; i < 256; i++) {
            const x = (i / 127.5) - 1;
            curve[i] = Math.tanh(x * 1.5); // Gentle tanh curve
        }
        this.nodes.saturator.curve = curve;
        
        // --- Connect the Audio Graph ---
        
        // 1. Wet/Dry Mix
        this.nodes.input.connect(this.nodes.dryGain);
        this.nodes.dryGain.connect(this.nodes.output);
        
        this.nodes.delay.connect(this.nodes.wetGain);
        this.nodes.wetGain.connect(this.nodes.output);
        
        // 2. Initial Signal Path
        this.nodes.input.connect(this.nodes.delay);

        // 3. The Characterful Feedback Loop
        // The output of the delay is sent into our processing chain...
        this.nodes.delay.connect(this.nodes.saturator);
        this.nodes.saturator.connect(this.nodes.toneFilter);
        this.nodes.toneFilter.connect(this.nodes.feedback);
        // ...and the processed signal is fed back into the start of the delay.
        this.nodes.feedback.connect(this.nodes.delay);
        
        // 4. Wow & Flutter Modulation
        this.nodes.flutterLFO.connect(this.nodes.flutterDepth);
        this.nodes.flutterDepth.connect(this.nodes.delay.delayTime);
    }

    /**
     * Returns the HTML string for the module's controls.
     */
    getHTML() {
        return `
            <div class="control-row">
                <label for="tapeTime">Time (s):</label>
                <input type="range" id="tapeTime" min="0.05" max="4.0" value="0.5" step="0.01">
                <span id="tapeTimeVal" class="value-display">0.50</span>
            </div>
            <div class="control-row">
                <label for="tapeFeedback">Repeats:</label>
                <input type="range" id="tapeFeedback" min="0" max="0.95" value="0.6" step="0.01">
                <span id="tapeFeedbackVal" class="value-display">0.60</span>
            </div>
            <div class="control-row">
                <label for="tapeTone">Tone (LPF):</label>
                <input type="range" id="tapeTone" min="500" max="10000" value="3500" step="100">
                <span id="tapeToneVal" class="value-display">3500</span>
            </div>
            <div class="control-row">
                <label for="tapeFlutter">Flutter:</label>
                <input type="range" id="tapeFlutter" min="0" max="0.005" value="0.001" step="0.0001">
                <span id="tapeFlutterVal" class="value-display">0.0010</span>
            </div>
            <div class="control-row">
                <label for="tapeMix">Mix (Wet):</label>
                <input type="range" id="tapeMix" min="0" max="1" value="0.4" step="0.01">
                <span id="tapeMixVal" class="value-display">0.40</span>
            </div>
        `;
    }

    /**
     * Finds the UI elements and attaches event listeners.
     */
    initUI(container) {
        this.time = { slider: container.querySelector('#tapeTime'), val: container.querySelector('#tapeTimeVal') };
        this.feedback = { slider: container.querySelector('#tapeFeedback'), val: container.querySelector('#tapeFeedbackVal') };
        this.tone = { slider: container.querySelector('#tapeTone'), val: container.querySelector('#tapeToneVal') };
        this.flutter = { slider: container.querySelector('#tapeFlutter'), val: container.querySelector('#tapeFlutterVal') };
        this.mix = { slider: container.querySelector('#tapeMix'), val: container.querySelector('#tapeMixVal') };
        
        const connect = (ctrl, decimals = 2) => {
            ctrl.slider.addEventListener('input', () => {
                ctrl.val.textContent = parseFloat(ctrl.slider.value).toFixed(decimals);
                this.updateParams();
            });
        };
        
        connect(this.time, 2);
        connect(this.feedback, 2);
        connect(this.tone, 0);
        connect(this.flutter, 4);
        connect(this.mix, 2);

        this.updateParams();
    }

    /**
     * Reads values from the controls and updates the audio node parameters.
     */
    updateParams() {
        if (!this.nodes.delay) return;
        const time = this.audioContext.currentTime;
        const smoothing = 0.02;

        const delayTime = parseFloat(this.time.slider.value);
        const feedback = parseFloat(this.feedback.slider.value);
        const tone = parseFloat(this.tone.slider.value);
        const flutter = parseFloat(this.flutter.slider.value);
        const mix = parseFloat(this.mix.slider.value);
        
        // The delay time is the base value, which is then modulated by the LFO
        this.nodes.delay.delayTime.value = delayTime;
        this.nodes.flutterDepth.gain.setTargetAtTime(flutter, time, smoothing);
        
        // Update feedback path
        this.nodes.feedback.gain.setTargetAtTime(feedback, time, smoothing);
        this.nodes.toneFilter.frequency.setTargetAtTime(tone, time, smoothing);

        // Update final mix
        this.nodes.wetGain.gain.setTargetAtTime(mix, time, smoothing);
        this.nodes.dryGain.gain.setTargetAtTime(1.0 - mix, time, smoothing);
    }
}

// --- This line is crucial for the main app to load the module ---
window.registerSynthModule(TapeEchoModule);