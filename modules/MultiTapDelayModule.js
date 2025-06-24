/**
 * Example Synth Module: A 4-Tap Stereo Delay.
 *
 * This module creates a delay effect with four distinct "taps," each with its
 * own delay time, volume, and stereo pan position. It also includes feedback
 * and filtering on the feedback path for classic dub-style effects.
 *
 * This module demonstrates:
 * - Complex parallel routing with multiple delay lines.
 * - Creating a feedback loop with filtering.
 * - Dynamically generating UI controls in a loop.
 */
class MultiTapDelayModule {
    constructor(audioContext) {
        this.audioContext = audioContext;
        this.id = 'multiTapDelayModule'; // A unique ID
        this.name = 'Multi-Tap Delay';   // The display name
        this.numTaps = 4;
        this.taps = [];

        // --- Create Audio Nodes ---
        this.nodes = {
            input: this.audioContext.createGain(),
            output: this.audioContext.createGain(),
            dryGain: this.audioContext.createGain(),
            wetGain: this.audioContext.createGain(), // Master wet control
            feedbackGain: this.audioContext.createGain(),
            feedbackFilter: this.audioContext.createBiquadFilter(),
        };

        // --- Configure the Feedback Path ---
        this.nodes.feedbackFilter.type = 'lowpass';
        this.nodes.feedbackGain.gain.value = 0.5;
        this.nodes.feedbackFilter.frequency.value = 4000;
        
        // --- Connect Feedback Loop ---
        // The combined wet signal is filtered, scaled, and fed back to the input.
        this.nodes.wetGain.connect(this.nodes.feedbackFilter);
        this.nodes.feedbackFilter.connect(this.nodes.feedbackGain);
        this.nodes.feedbackGain.connect(this.nodes.input);

        // --- Connect Wet/Dry Path ---
        this.nodes.input.connect(this.nodes.dryGain);
        this.nodes.dryGain.connect(this.nodes.output);
        this.nodes.wetGain.connect(this.nodes.output);

        // --- Create Individual Taps ---
        for (let i = 0; i < this.numTaps; i++) {
            const tap = {
                delay: this.audioContext.createDelay(3.0), // Max 3s delay
                panner: this.audioContext.createStereoPanner(),
                gain: this.audioContext.createGain(),
            };
            // The main input feeds each tap's delay node.
            this.nodes.input.connect(tap.delay);
            // Each delay goes through its own gain and panner.
            tap.delay.connect(tap.panner);
            tap.panner.connect(tap.gain);
            // All taps are collected into the master wet gain node.
            tap.gain.connect(this.nodes.wetGain);

            this.taps.push(tap);
        }
    }

    /**
     * Returns the HTML string for the module's controls.
     */
    getHTML() {
        let tapsHTML = '';
        for (let i = 0; i < this.numTaps; i++) {
            tapsHTML += `
                <div style="border-bottom: 1px dashed var(--color-bg-medium); padding-bottom: 10px; margin-bottom: 10px;">
                    <div class="control-row">
                        <label for="tap${i}Time">Tap ${i+1} Time (s):</label>
                        <input type="range" id="tap${i}Time" min="0.01" max="3" value="${0.25 * (i+1)}" step="0.01">
                        <span id="tap${i}TimeVal" class="value-display">${(0.25 * (i+1)).toFixed(2)}</span>
                    </div>
                    <div class="control-row">
                        <label for="tap${i}Level">Tap ${i+1} Level:</label>
                        <input type="range" id="tap${i}Level" min="0" max="1" value="0.5" step="0.01">
                        <span id="tap${i}LevelVal" class="value-display">0.50</span>
                    </div>
                     <div class="control-row">
                        <label for="tap${i}Pan">Tap ${i+1} Pan:</label>
                        <input type="range" id="tap${i}Pan" min="-1" max="1" value="${((i % 2) * 2 - 1) * 0.7}" step="0.01">
                        <span id="tap${i}PanVal" class="value-display">${(((i % 2) * 2 - 1) * 0.7).toFixed(2)}</span>
                    </div>
                </div>
            `;
        }
        
        return `
            <h4>Global Controls</h4>
             <div class="control-row">
                <label for="multiTapMix">Mix (Wet):</label>
                <input type="range" id="multiTapMix" min="0" max="1" value="0.4" step="0.01">
                <span id="multiTapMixVal" class="value-display">0.40</span>
            </div>
            <div class="control-row">
                <label for="multiTapFeedback">Feedback:</label>
                <input type="range" id="multiTapFeedback" min="0" max="0.98" value="0.5" step="0.01">
                <span id="multiTapFeedbackVal" class="value-display">0.50</span>
            </div>
            <div class="control-row">
                <label for="multiTapFilter">Feedback Tone:</label>
                <input type="range" id="multiTapFilter" min="200" max="10000" value="4000" step="100">
                <span id="multiTapFilterVal" class="value-display">4000</span>
            </div>
            <h4 style="margin-top: 20px;">Delay Taps</h4>
            ${tapsHTML}
        `;
    }

    /**
     * Finds the UI elements and attaches event listeners.
     * @param {HTMLElement} container - The div containing the module's HTML.
     */
    initUI(container) {
        // Store references to global UI elements
        this.mixSlider = container.querySelector('#multiTapMix');
        this.mixVal = container.querySelector('#multiTapMixVal');
        this.feedbackSlider = container.querySelector('#multiTapFeedback');
        this.feedbackVal = container.querySelector('#multiTapFeedbackVal');
        this.filterSlider = container.querySelector('#multiTapFilter');
        this.filterVal = container.querySelector('#multiTapFilterVal');
        
        // Add listeners for global controls
        this.mixSlider.addEventListener('input', () => { this.mixVal.textContent = parseFloat(this.mixSlider.value).toFixed(2); this.updateParams(); });
        this.feedbackSlider.addEventListener('input', () => { this.feedbackVal.textContent = parseFloat(this.feedbackSlider.value).toFixed(2); this.updateParams(); });
        this.filterSlider.addEventListener('input', () => { this.filterVal.textContent = this.filterSlider.value; this.updateParams(); });

        // Store references to individual tap UI elements
        for (let i = 0; i < this.numTaps; i++) {
            this.taps[i].ui = {
                time: { slider: container.querySelector(`#tap${i}Time`), val: container.querySelector(`#tap${i}TimeVal`) },
                level: { slider: container.querySelector(`#tap${i}Level`), val: container.querySelector(`#tap${i}LevelVal`) },
                pan: { slider: container.querySelector(`#tap${i}Pan`), val: container.querySelector(`#tap${i}PanVal`) },
            };
            
            // Add listeners for each tap control
            this.taps[i].ui.time.slider.addEventListener('input', () => { this.taps[i].ui.time.val.textContent = parseFloat(this.taps[i].ui.time.slider.value).toFixed(2); this.updateParams(); });
            this.taps[i].ui.level.slider.addEventListener('input', () => { this.taps[i].ui.level.val.textContent = parseFloat(this.taps[i].ui.level.slider.value).toFixed(2); this.updateParams(); });
            this.taps[i].ui.pan.slider.addEventListener('input', () => { this.taps[i].ui.pan.val.textContent = parseFloat(this.taps[i].ui.pan.slider.value).toFixed(2); this.updateParams(); });
        }
        
        // Initialize parameters on load
        this.updateParams();
    }

    /**
     * Reads values from the controls and updates the audio node parameters.
     */
    updateParams() {
        if (!this.nodes.input) return;
        const time = this.audioContext.currentTime;
        const smoothing = 0.02;

        // Update global parameters
        const mix = parseFloat(this.mixSlider.value);
        this.nodes.wetGain.gain.setTargetAtTime(mix, time, smoothing);
        this.nodes.dryGain.gain.setTargetAtTime(1.0 - mix, time, smoothing);
        this.nodes.feedbackGain.gain.setTargetAtTime(parseFloat(this.feedbackSlider.value), time, smoothing);
        this.nodes.feedbackFilter.frequency.setTargetAtTime(parseFloat(this.filterSlider.value), time, smoothing);

        // Update parameters for each individual tap
        for (let i = 0; i < this.numTaps; i++) {
            const tap = this.taps[i];
            tap.delay.delayTime.setTargetAtTime(parseFloat(tap.ui.time.slider.value), time, smoothing);
            tap.gain.gain.setTargetAtTime(parseFloat(tap.ui.level.slider.value), time, smoothing);
            tap.panner.pan.setTargetAtTime(parseFloat(tap.ui.pan.slider.value), time, smoothing);
        }
    }
}

// --- This line is crucial for the main app to load the module ---
window.registerSynthModule(MultiTapDelayModule);