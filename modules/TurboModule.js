/**
 * Example Synth Module: A "Turbo" Drive and Harmonic Exciter.
 *
 * This module adds aggressive presence and brightness to a sound by splitting it
 * into low and high frequency bands and processing them independently. The low
 * end is saturated for warmth, while the high end is distorted to create new,
 * exciting harmonics.
 *
 * This module demonstrates:
 * - A multiband distortion/exciter effect, a professional mixing technique.
 * - Combining filtering and non-linear processing for powerful tonal shaping.
 * - An intuitive UI for a complex internal signal path.
 */
class TurboModule {
    constructor(audioContext) {
        this.audioContext = audioContext;
        this.id = 'turboModule';
        this.name = 'Turbo Drive';

        // --- Create Audio Nodes ---
        this.nodes = {
            input: this.audioContext.createGain(),
            output: this.audioContext.createGain(),
            
            // --- Crossover Filters ---
            // These split the signal into two bands
            lowpass: this.audioContext.createBiquadFilter(),
            highpass: this.audioContext.createBiquadFilter(),
            
            // --- Low Band Processing ---
            bassDrive: this.audioContext.createWaveShaper(),
            bassGain: this.audioContext.createGain(),
            
            // --- High Band Processing ---
            trebleExciter: this.audioContext.createWaveShaper(),
            trebleGain: this.audioContext.createGain(),
        };

        // --- Configure Nodes ---
        this.nodes.lowpass.type = 'lowpass';
        this.nodes.highpass.type = 'highpass';
        
        // --- Connect the Audio Graph ---
        
        // 1. Low Band Path: input -> LPF -> Bass Saturation -> Bass Gain -> Output
        this.nodes.input.connect(this.nodes.lowpass);
        this.nodes.lowpass.connect(this.nodes.bassDrive);
        this.nodes.bassDrive.connect(this.nodes.bassGain);
        this.nodes.bassGain.connect(this.nodes.output);
        
        // 2. High Band Path: input -> HPF -> Treble Exciter -> Treble Gain -> Output
        this.nodes.input.connect(this.nodes.highpass);
        this.nodes.highpass.connect(this.nodes.trebleExciter);
        this.nodes.trebleExciter.connect(this.nodes.trebleGain);
        this.nodes.trebleGain.connect(this.nodes.output);
    }
    
    _createCurve(amount, type = 'warm') {
        const k = amount;
        const n_samples = 44100;
        const curve = new Float32Array(n_samples);
        for (let i = 0; i < n_samples; ++i) {
            const x = i * 2 / n_samples - 1;
            if (type === 'warm') {
                // Gentle tanh curve for bass saturation
                curve[i] = Math.tanh(x * k);
            } else { // 'bright'
                // A more aggressive curve that creates harsher harmonics
                curve[i] = ( (3 + k) * x * 0.8 ) / (Math.PI + k * Math.abs(x));
            }
        }
        return curve;
    }

    getHTML() {
        return `
            <div class="control-row">
                <label for="turboDrive">Warm Drive:</label>
                <input type="range" id="turboDrive" min="1" max="10" value="1.5" step="0.1">
                <span id="turboDriveVal" class="value-display">1.5</span>
            </div>
            <div class="control-row">
                <label for="turboExciter">Turbo (Excite):</label>
                <input type="range" id="turboExciter" min="1" max="25" value="1" step="0.5">
                <span id="turboExciterVal" class="value-display">1.0</span>
            </div>
            <div class="control-row">
                <label for="turboCrossover">Crossover (Hz):</label>
                <input type="range" id="turboCrossover" min="100" max="2000" value="500" step="10">
                <span id="turboCrossoverVal" class="value-display">500</span>
            </div>
            <div class="control-row">
                <label for="turboOutput">Output Level:</label>
                <input type="range" id="turboOutput" min="0" max="1.5" value="1.0" step="0.01">
                <span id="turboOutputVal" class="value-display">1.00</span>
            </div>
        `;
    }

    initUI(container) {
        this.drive = { slider: container.querySelector('#turboDrive'), val: container.querySelector('#turboDriveVal') };
        this.exciter = { slider: container.querySelector('#turboExciter'), val: container.querySelector('#turboExciterVal') };
        this.crossover = { slider: container.querySelector('#turboCrossover'), val: container.querySelector('#turboCrossoverVal') };
        this.output = { slider: container.querySelector('#turboOutput'), val: container.querySelector('#turboOutputVal') };

        const connect = (ctrl, decimals = 1) => {
            ctrl.slider.addEventListener('input', () => {
                ctrl.val.textContent = parseFloat(ctrl.slider.value).toFixed(decimals);
                this.updateParams();
            });
        };
        
        connect(this.drive, 1);
        connect(this.exciter, 1);
        connect(this.crossover, 0);
        connect(this.output, 2);
        
        this.updateParams();
    }

    updateParams() {
        if (!this.nodes.input) return;
        
        const time = this.audioContext.currentTime;
        const smoothing = 0.015;
        
        const drive = parseFloat(this.drive.slider.value);
        const exciter = parseFloat(this.exciter.slider.value);
        const crossover = parseFloat(this.crossover.slider.value);
        const output = parseFloat(this.output.slider.value);
        
        // Set crossover frequency for both filters
        this.nodes.lowpass.frequency.setTargetAtTime(crossover, time, smoothing);
        this.nodes.highpass.frequency.setTargetAtTime(crossover, time, smoothing);
        
        // Update the distortion curves for each band
        this.nodes.bassDrive.curve = this._createCurve(drive, 'warm');
        this.nodes.trebleExciter.curve = this._createCurve(exciter, 'bright');

        // The bass gain is modulated to prevent it from getting too loud at high drive settings
        const bassLevel = 1.0 / (1 + (drive-1)*0.2);
        this.nodes.bassGain.gain.setTargetAtTime(bassLevel, time, smoothing);
        
        // The treble gain is boosted by the exciter amount
        const trebleLevel = 1.0 + (exciter-1) * 0.05;
        this.nodes.trebleGain.gain.setTargetAtTime(trebleLevel, time, smoothing);
        
        // Set the final output level
        this.nodes.output.gain.setTargetAtTime(output, time, smoothing);
    }
}

// --- This line is crucial for the main app to load the module ---
window.registerSynthModule(TurboModule);