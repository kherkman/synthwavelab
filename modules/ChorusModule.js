/**
 * Example Synth Module: A Stereo Chorus.
 *
 * This module creates a rich, stereo chorus effect by using two modulated
 * delay lines, each with its own LFO running at a slightly different rate.
 * This prevents the effect from sounding like a simple, predictable vibrato.
 *
 * This module demonstrates:
 * - A parallel processing path with multiple "voices".
 * - Using multiple, uncorrelated LFOs for a more natural-sounding modulation.
 * - Implementing a classic and essential synth effect.
 */
class ChorusModule {
    constructor(audioContext) {
        this.audioContext = audioContext;
        this.id = 'chorusModule';      // A unique ID
        this.name = 'Stereo Chorus';   // The display name

        // --- Create Audio Nodes ---
        this.nodes = {
            input: this.audioContext.createGain(),
            output: this.audioContext.createGain(),
            dryGain: this.audioContext.createGain(),
            wetGain: this.audioContext.createGain(), // Master wet control
        };
        
        // We will create two chorus "voices"
        this.voices = [
            { name: 'L', nodes: {} },
            { name: 'R', nodes: {} },
        ];

        this.voices.forEach((voice, i) => {
            // Each voice has a delay line and its own LFO components
            voice.nodes.delay = this.audioContext.createDelay(0.1); // Max 100ms
            voice.nodes.lfo = this.audioContext.createOscillator();
            voice.nodes.lfoDepth = this.audioContext.createGain();
            // Pan each voice to create stereo width
            voice.nodes.panner = this.audioContext.createStereoPanner();
            
            // --- Configure and Start LFOs ---
            voice.nodes.lfo.type = 'sine';
            // Set slightly different rates for each LFO to make them "uncorrelated"
            // This is the key to a rich chorus sound.
            voice.nodes.lfo.frequency.value = 0.8 + (i * 0.3); // e.g., 0.8Hz and 1.1Hz
            voice.nodes.lfo.start();
            
            // --- Connect the path for this voice ---
            // Input -> Delay
            this.nodes.input.connect(voice.nodes.delay);
            // Delay -> Panner
            voice.nodes.delay.connect(voice.nodes.panner);
            // Panner -> Master Wet Gain
            voice.nodes.panner.connect(this.nodes.wetGain);
            
            // --- Connect the modulation path for this voice ---
            // LFO -> LFO Depth -> Delay Time
            voice.nodes.lfo.connect(voice.nodes.lfoDepth);
            voice.nodes.lfoDepth.connect(voice.nodes.delay.delayTime);
            
            // Pan the voices left and right
            voice.nodes.panner.pan.value = (i === 0) ? -0.8 : 0.8;
        });

        // --- Connect Wet/Dry Path ---
        this.nodes.input.connect(this.nodes.dryGain);
        this.nodes.dryGain.connect(this.nodes.output);
        this.nodes.wetGain.connect(this.nodes.output);
    }

    /**
     * Returns the HTML string for the module's controls.
     */
    getHTML() {
        return `
            <div class="control-row">
                <label for="chorusRate">Rate (Hz):</label>
                <input type="range" id="chorusRate" min="0.1" max="10" value="1.0" step="0.1">
                <span id="chorusRateVal" class="value-display">1.0</span>
            </div>
            <div class="control-row">
                <label for="chorusDepth">Depth (ms):</label>
                <input type="range" id="chorusDepth" min="0.1" max="15" value="2.5" step="0.1">
                <span id="chorusDepthVal" class="value-display">2.5</span>
            </div>
            <div class="control-row">
                <label for="chorusDelay">Base Delay (ms):</label>
                <input type="range" id="chorusDelay" min="1" max="50" value="20" step="1">
                <span id="chorusDelayVal" class="value-display">20</span>
            </div>
            <div class="control-row">
                <label for="chorusMix">Mix (Wet):</label>
                <input type="range" id="chorusMix" min="0" max="1" value="0.5" step="0.01">
                <span id="chorusMixVal" class="value-display">0.50</span>
            </div>
        `;
    }

    /**
     * Finds the UI elements and attaches event listeners.
     * @param {HTMLElement} container - The div containing the module's HTML.
     */
    initUI(container) {
        this.rate = { slider: container.querySelector('#chorusRate'), val: container.querySelector('#chorusRateVal') };
        this.depth = { slider: container.querySelector('#chorusDepth'), val: container.querySelector('#chorusDepthVal') };
        this.delay = { slider: container.querySelector('#chorusDelay'), val: container.querySelector('#chorusDelayVal') };
        this.mix = { slider: container.querySelector('#chorusMix'), val: container.querySelector('#chorusMixVal') };
        
        const connect = (ctrl, decimals = 1) => {
            ctrl.slider.addEventListener('input', () => {
                ctrl.val.textContent = parseFloat(ctrl.slider.value).toFixed(decimals);
                this.updateParams();
            });
        };
        
        connect(this.rate, 1);
        connect(this.depth, 1);
        connect(this.delay, 0);
        connect(this.mix, 2);

        this.updateParams();
    }

    /**
     * Reads values from the controls and updates the audio node parameters.
     */
    updateParams() {
        if (!this.voices[0].nodes.delay) return;
        
        const time = this.audioContext.currentTime;
        const smoothing = 0.02;

        const rateHz = parseFloat(this.rate.slider.value);
        const depthMs = parseFloat(this.depth.slider.value);
        const delayMs = parseFloat(this.delay.slider.value);
        const mix = parseFloat(this.mix.slider.value);
        
        const depthSec = depthMs / 1000.0;
        const delaySec = delayMs / 1000.0;
        
        // Update parameters for each voice
        this.voices.forEach((voice, i) => {
            // Set the center delay time
            voice.nodes.delay.delayTime.value = delaySec;
            
            // Set the LFO rate, keeping a slight offset between them
            const lfoRate = rateHz + (i * rateHz * 0.2); // e.g., rate & rate * 1.2
            voice.nodes.lfo.frequency.setTargetAtTime(lfoRate, time, smoothing);
            
            // Set the LFO depth
            voice.nodes.lfoDepth.gain.setTargetAtTime(depthSec, time, smoothing);
        });
        
        // Update the wet/dry mix
        this.nodes.wetGain.gain.setTargetAtTime(mix, time, smoothing);
        this.nodes.dryGain.gain.setTargetAtTime(1.0 - mix, time, smoothing);
    }
}

// --- This line is crucial for the main app to load the module ---
window.registerSynthModule(ChorusModule);