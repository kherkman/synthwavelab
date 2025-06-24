/**
 * Example Synth Module: A Lo-Fi Multi-Effect.
 *
 * This module simulates the classic sound of lo-fi, vintage audio by
 * combining several effects: vinyl/tape noise, pitch wobble (wow & flutter),
 * aggressive filtering, and gentle saturation.
 *
 * This module demonstrates:
 * - A "channel strip" approach, combining multiple effects into a single unit.
 * - An intuitive, high-level UI for achieving a specific sonic character.
 * - A combination of many previously demonstrated techniques.
 */
class LoFiModule {
    constructor(audioContext) {
        this.audioContext = audioContext;
        this.id = 'loFiModule';
        this.name = 'Lo-Fi';

        // --- Create Audio Nodes ---
        this.nodes = {
            input: this.audioContext.createGain(),
            output: this.audioContext.createGain(),
            
            // --- The main signal processing chain ---
            wobbleDelay: this.audioContext.createDelay(0.02),
            saturator: this.audioContext.createWaveShaper(),
            hpf: this.audioContext.createBiquadFilter(),
            lpf: this.audioContext.createBiquadFilter(),
            
            // --- Wow & Flutter LFO ---
            wobbleLFO: this.audioContext.createOscillator(),
            wobbleDepth: this.audioContext.createGain(),
            
            // --- Noise Generator ---
            noiseSource: this.audioContext.createBufferSource(),
            noiseGain: this.audioContext.createGain(),
        };

        // --- Configure Nodes ---
        this.nodes.hpf.type = 'highpass';
        this.nodes.lpf.type = 'lowpass';
        this.nodes.wobbleLFO.type = 'sine';
        this.nodes.wobbleLFO.frequency.value = 3.0;
        
        // --- Generate Vinyl Crackle Noise ---
        const bufferSize = this.audioContext.sampleRate * 4; // 4 seconds of noise
        const noiseBuffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const data = noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            // A simple filtered noise to simulate crackle
            data[i] = Math.random() * 2 - 1;
            if (Math.random() > 0.995) { // Add sparse "pops"
                data[i] *= 20;
            }
        }
        this.nodes.noiseSource.buffer = noiseBuffer;
        this.nodes.noiseSource.loop = true;
        
        // --- Connect the Audio Graph ---
        
        // 1. Main signal path: input -> wobble -> saturate -> HPF -> LPF -> output
        this.nodes.input.connect(this.nodes.wobbleDelay);
        this.nodes.wobbleDelay.connect(this.nodes.saturator);
        this.nodes.saturator.connect(this.nodes.hpf);
        this.nodes.hpf.connect(this.nodes.lpf);
        this.nodes.lpf.connect(this.nodes.output);
        
        // 2. Wobble LFO path
        this.nodes.wobbleLFO.connect(this.nodes.wobbleDepth);
        this.nodes.wobbleDepth.connect(this.nodes.wobbleDelay.delayTime);
        
        // 3. Noise path: noise source is mixed directly into the final output
        this.nodes.noiseSource.connect(this.nodes.noiseGain);
        this.nodes.noiseGain.connect(this.nodes.output);
        
        // --- Start sources ---
        this.nodes.wobbleLFO.start();
        this.nodes.noiseSource.start();
    }
    
    _createSaturationCurve(amount) {
        const k = amount * 4;
        const curve = new Float32Array(257);
        for (let i = 0; i < 257; i++) {
            const x = i * 2 / 256 - 1;
            curve[i] = (3 + k) * x / (Math.PI + k * Math.abs(x));
        }
        return curve;
    }

    getHTML() {
        return `
            <div class="control-row">
                <label for="lofiWobble">Wobble:</label>
                <input type="range" id="lofiWobble" min="0" max="0.003" value="0.0005" step="0.0001">
                <span id="lofiWobbleVal" class="value-display">0.0005</span>
            </div>
            <div class="control-row">
                <label for="lofiSaturate">Saturate:</label>
                <input type="range" id="lofiSaturate" min="0" max="1" value="0.2" step="0.01">
                <span id="lofiSaturateVal" class="value-display">0.20</span>
            </div>
            <div class="control-row">
                <label for="lofiHPF">HPF Cutoff:</label>
                <input type="range" id="lofiHPF" min="20" max="2000" value="100" step="10">
                <span id="lofiHPFVal" class="value-display">100</span>
            </div>
            <div class="control-row">
                <label for="lofiLPF">LPF Cutoff:</label>
                <input type="range" id="lofiLPF" min="500" max="20000" value="12000" step="100">
                <span id="lofiLPFVal" class="value-display">12000</span>
            </div>
            <div class="control-row">
                <label for="lofiNoise">Noise:</label>
                <input type="range" id="lofiNoise" min="0" max="0.1" value="0.01" step="0.001">
                <span id="lofiNoiseVal" class="value-display">0.010</span>
            </div>
        `;
    }

    initUI(container) {
        this.wobble = { slider: container.querySelector('#lofiWobble'), val: container.querySelector('#lofiWobbleVal') };
        this.saturate = { slider: container.querySelector('#lofiSaturate'), val: container.querySelector('#lofiSaturateVal') };
        this.hpf = { slider: container.querySelector('#lofiHPF'), val: container.querySelector('#lofiHPFVal') };
        this.lpf = { slider: container.querySelector('#lofiLPF'), val: container.querySelector('#lofiLPFVal') };
        this.noise = { slider: container.querySelector('#lofiNoise'), val: container.querySelector('#lofiNoiseVal') };

        const connect = (ctrl, decimals = 2) => {
            ctrl.slider.addEventListener('input', () => {
                ctrl.val.textContent = parseFloat(ctrl.slider.value).toFixed(decimals);
                this.updateParams();
            });
        };
        
        connect(this.wobble, 4);
        connect(this.saturate, 2);
        connect(this.hpf, 0);
        connect(this.lpf, 0);
        connect(this.noise, 3);

        this.updateParams();
    }

    updateParams() {
        if (!this.nodes.input) return;
        const time = this.audioContext.currentTime;
        const smoothing = 0.02;

        // Wobble (wow & flutter)
        const wobble = parseFloat(this.wobble.slider.value);
        this.nodes.wobbleDelay.delayTime.value = 0.01; // Base delay
        this.nodes.wobbleDepth.gain.setTargetAtTime(wobble, time, smoothing);

        // Saturation
        const saturate = parseFloat(this.saturate.slider.value);
        this.nodes.saturator.curve = this._createSaturationCurve(saturate);
        
        // Filters
        const hpf = parseFloat(this.hpf.slider.value);
        const lpf = parseFloat(this.lpf.slider.value);
        this.nodes.hpf.frequency.setTargetAtTime(hpf, time, smoothing);
        this.nodes.lpf.frequency.setTargetAtTime(lpf, time, smoothing);

        // Noise
        const noise = parseFloat(this.noise.slider.value);
        this.nodes.noiseGain.gain.setTargetAtTime(noise, time, smoothing);
    }
}

// --- This line is crucial for the main app to load the module ---
window.registerSynthModule(LoFiModule);