/**
 * Example Synth Module: A "Random Pan" / Scatter Delay.
 *
 * This module is an audio processor that creates a wide, complex stereo
 * delay effect by taking multiple "taps" from a delay line and continuously
 * randomizing their position in the stereo field.
 *
 * This module demonstrates:
 * - A generative, randomized spatial effect.
 * - A multi-tap delay architecture for creating complex rhythmic echoes.
 * - A powerful tool for creating wide, immersive stereo textures.
 */
class ScatterDelayModule {
    constructor(audioContext) {
        this.audioContext = audioContext;
        this.id = 'scatterDelayModule';
        this.name = 'Scatter Delay';

        this.numTaps = 4;
        this.panTimer = null;
        
        // --- Create Audio Nodes ---
        this.nodes = {
            input: this.audioContext.createGain(),
            output: this.audioContext.createGain(),
            dryGain: this.audioContext.createGain(),
            wetGain: this.audioContext.createGain(),
            
            // --- Feedback Loop ---
            feedback: this.audioContext.createGain(),
            filter: this.audioContext.createBiquadFilter(),
            
            taps: [], // Will hold {delay, panner} for each tap
        };

        // --- Configure Nodes ---
        this.nodes.filter.type = 'lowpass';
        
        // --- Create Taps ---
        for (let i = 0; i < this.numTaps; i++) {
            const tap = {
                delay: this.audioContext.createDelay(3.0),
                panner: this.audioContext.createStereoPanner(),
            };
            // The output of each tap's panner is mixed into the wet signal
            tap.panner.connect(this.nodes.wetGain);
            this.nodes.taps.push(tap);
        }

        // --- Connect Audio Graph ---
        // 1. Dry Path
        this.nodes.input.connect(this.nodes.dryGain).connect(this.nodes.output);
        
        // 2. Wet path starts at the input and goes to each tap's delay
        this.nodes.taps.forEach(tap => {
            this.nodes.input.connect(tap.delay);
            tap.delay.connect(tap.panner);
        });
        
        // 3. Feedback Path: The combined wet signal is filtered and fed back to the input
        this.nodes.wetGain.connect(this.nodes.filter);
        this.nodes.filter.connect(this.nodes.feedback);
        this.nodes.feedback.connect(this.nodes.input); // Feedback to the start
        
        // 4. Final wet signal to output
        this.nodes.wetGain.connect(this.nodes.output);
    }
    
    _startPanning() {
        if (this.panTimer) clearInterval(this.panTimer);
        
        const scatterRate = parseFloat(this.scatter.slider.value);
        if (scatterRate === 0) return; // Don't start a timer if rate is zero
        
        const interval = 1000 / scatterRate;
        
        this.panTimer = setInterval(() => {
            this.nodes.taps.forEach(tap => {
                const randomPan = Math.random() * 2 - 1;
                tap.panner.pan.setTargetAtTime(randomPan, this.audioContext.currentTime, 0.05);
            });
        }, interval);
    }
    
    _stopPanning() {
        clearInterval(this.panTimer);
        this.panTimer = null;
    }

    updateParams() {
        if (!this.nodes.input) return;
        
        const time = this.audioContext.currentTime;
        const smoothing = 0.02;

        const baseTime = parseFloat(this.time.slider.value);
        const decay = parseFloat(this.decay.slider.value);
        const smear = parseFloat(this.smear.slider.value);
        const mix = parseFloat(this.mix.slider.value);

        // --- Set Tap Delay Times ---
        // Taps are set to musical subdivisions of the base time.
        const subdivisions = [0.25, 0.5, 0.75, 1.0];
        this.nodes.taps.forEach((tap, i) => {
            tap.delay.delayTime.setTargetAtTime(baseTime * subdivisions[i], time, smoothing);
        });
        
        // --- Update Feedback and Filter ---
        this.nodes.feedback.gain.setTargetAtTime(decay, time, smoothing);
        this.nodes.filter.frequency.setTargetAtTime(smear, time, smoothing);
        
        // --- Update Mix ---
        this.nodes.wetGain.gain.setTargetAtTime(mix, time, smoothing);
        this.nodes.dryGain.gain.setTargetAtTime(1.0 - mix, time, smoothing);
        
        // --- Update Pan Rate ---
        this._startPanning();
    }

    getHTML() {
        return `
            <div class="control-row">
                <label for="scatterTime">Time:</label>
                <input type="range" id="scatterTime" min="0.1" max="2.0" value="0.5" step="0.01">
                <span id="scatterTimeVal" class="value-display">0.50</span>
            </div>
            <div class="control-row">
                <label for="scatterDecay">Decay:</label>
                <input type="range" id="scatterDecay" min="0" max="0.95" value="0.5" step="0.01">
                <span id="scatterDecayVal" class="value-display">0.50</span>
            </div>
            <div class="control-row">
                <label for="scatterSmear">Smear (LPF):</label>
                <input type="range" id="scatterSmear" min="500" max="15000" value="5000" step="100">
                <span id="scatterSmearVal" class="value-display">5000</span>
            </div>
             <div class="control-row">
                <label for="scatterRate">Scatter Rate (Hz):</label>
                <input type="range" id="scatterRate" min="0" max="20" value="4" step="0.5">
                <span id="scatterRateVal" class="value-display">4.0</span>
            </div>
            <div class="control-row">
                <label for="scatterMix">Mix (Wet):</label>
                <input type="range" id="scatterMix" min="0" max="1" value="0.5" step="0.01">
                <span id="scatterMixVal" class="value-display">0.50</span>
            </div>
        `;
    }

    initUI(container) {
        this.time = { slider: container.querySelector('#scatterTime'), val: container.querySelector('#scatterTimeVal') };
        this.decay = { slider: container.querySelector('#scatterDecay'), val: container.querySelector('#scatterDecayVal') };
        this.smear = { slider: container.querySelector('#scatterSmear'), val: container.querySelector('#scatterSmearVal') };
        this.scatter = { slider: container.querySelector('#scatterRate'), val: container.querySelector('#scatterRateVal') };
        this.mix = { slider: container.querySelector('#scatterMix'), val: container.querySelector('#scatterMixVal') };

        const connect = (ctrl, decimals = 2) => {
            ctrl.slider.addEventListener('input', () => {
                ctrl.val.textContent = parseFloat(ctrl.slider.value).toFixed(decimals);
                this.updateParams();
            });
        };
        
        connect(this.time, 2);
        connect(this.decay, 2);
        connect(this.smear, 0);
        connect(this.scatter, 1);
        connect(this.mix, 2);
        
        this.updateParams();
    }
    
    destroy() {
        this._stopPanning();
    }
}


// --- This line is crucial for the main app to load the module ---
window.registerSynthModule(ScatterDelayModule);