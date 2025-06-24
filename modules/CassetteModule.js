/**
 * Example Synth Module: A Cassette Deck Simulator.
 *
 * This module is an audio processor that simulates the characteristic lo-fi
 * sound of a vintage cassette tape deck. It combines tape saturation,
 * pitch instability (wow & flutter), tape hiss, and a muffled tone.
 *
 * This module demonstrates:
 * - A "character" effect that simulates a complete audio format.
 * - Complex modulation using multiple LFOs for a natural "wow & flutter" effect.
 * - A practical and highly sought-after tool for lo-fi sound design.
 */
class CassetteModule {
    constructor(audioContext) {
        this.audioContext = audioContext;
        this.id = 'cassetteModule';
        this.name = 'Cassette Deck';

        // --- Create Audio Nodes ---
        this.nodes = {
            input: this.audioContext.createGain(),
            output: this.audioContext.createGain(),
            
            // --- Signal Path ---
            saturator: this.audioContext.createWaveShaper(),
            wobbleDelay: this.audioContext.createDelay(0.02),
            toneFilter: this.audioContext.createBiquadFilter(),
            
            // --- Modulators ---
            wowLFO: this.audioContext.createOscillator(),
            flutterLFO: this.audioContext.createOscillator(),
            wobbleDepth: this.audioContext.createGain(),
            
            // --- Noise ---
            hissSource: this.audioContext.createBufferSource(),
            hissGain: this.audioContext.createGain(),
        };

        // --- Configure Nodes ---
        this.nodes.toneFilter.type = 'lowpass';
        this.nodes.wowLFO.type = 'sine';
        this.nodes.flutterLFO.type = 'sine';
        
        // --- Generate Brown Noise for Hiss ---
        const bufferSize = this.audioContext.sampleRate * 4;
        const noiseBuffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const data = noiseBuffer.getChannelData(0);
        let lastOut = 0.0;
        for (let i = 0; i < bufferSize; i++) {
            lastOut = (lastOut + (0.02 * (Math.random() * 2 - 1))) / 1.02;
            data[i] = lastOut * 3.5;
        }
        this.nodes.hissSource.buffer = noiseBuffer;
        this.nodes.hissSource.loop = true;

        // --- Connect Audio Graph ---
        // 1. Main Signal Path: input -> saturator -> wobble -> tone -> output
        this.nodes.input.connect(this.nodes.saturator);
        this.nodes.saturator.connect(this.nodes.wobbleDelay);
        this.nodes.wobbleDelay.connect(this.nodes.toneFilter);
        this.nodes.toneFilter.connect(this.nodes.output);
        
        // 2. Wobble LFOs -> Wobble Depth -> Delay Time
        this.nodes.wowLFO.connect(this.nodes.wobbleDepth);
        this.nodes.flutterLFO.connect(this.nodes.wobbleDepth);
        this.nodes.wobbleDepth.connect(this.nodes.wobbleDelay.delayTime);
        
        // 3. Hiss path is mixed directly into the output
        this.nodes.hissSource.connect(this.nodes.hissGain);
        this.nodes.hissGain.connect(this.nodes.output);
        
        // --- Start Sources ---
        this.nodes.wowLFO.start(0);
        this.nodes.flutterLFO.start(0);
        this.nodes.hissSource.start(0);
    }
    
    _createSaturationCurve(amount) {
        const k = amount * 4;
        const curve = new Float32Array(257);
        for (let i = 0; i < 257; i++) {
            const x = i * 2 / 256 - 1;
            // Asymmetrical curve for tape-like distortion
            curve[i] = (x + 0.1 * x * x) / (1 + k + Math.abs(x * 0.1));
        }
        return curve;
    }

    getHTML() {
        return `
            <div class="control-row">
                <label for="tapeAge">Tape Age:</label>
                <input type="range" id="tapeAge" min="0" max="1" value="0.2" step="0.01">
                <span id="tapeAgeVal" class="value-display">0.20</span>
            </div>
            <h4 style="margin:15px 0 5px; text-align: center;">Fine Controls</h4>
            <div class="control-row">
                <label for="tapeSaturate">Saturation:</label>
                <input type="range" id="tapeSaturate" min="0" max="1" value="0.3" step="0.01">
                <span id="tapeSaturateVal" class="value-display">0.30</span>
            </div>
            <div class="control-row">
                <label for="tapeWobble">Wobble:</label>
                <input type="range" id="tapeWobble" min="0" max="0.005" value="0.001" step="0.0001">
                <span id="tapeWobbleVal" class="value-display">0.0010</span>
            </div>
             <div class="control-row">
                <label for="tapeMuffle">Muffle (LPF):</label>
                <input type="range" id="tapeMuffle" min="2000" max="20000" value="16000" step="100">
                <span id="tapeMuffleVal" class="value-display">16000</span>
            </div>
             <div class="control-row">
                <label for="tapeHiss">Hiss:</label>
                <input type="range" id="tapeHiss" min="0" max="0.05" value="0.005" step="0.001">
                <span id="tapeHissVal" class="value-display">0.005</span>
            </div>
        `;
    }

    initUI(container) {
        this.age = { slider: container.querySelector('#tapeAge'), val: container.querySelector('#tapeAgeVal') };
        this.saturate = { slider: container.querySelector('#tapeSaturate'), val: container.querySelector('#tapeSaturateVal') };
        this.wobble = { slider: container.querySelector('#tapeWobble'), val: container.querySelector('#tapeWobbleVal') };
        this.muffle = { slider: container.querySelector('#tapeMuffle'), val: container.querySelector('#tapeMuffleVal') };
        this.hiss = { slider: container.querySelector('#tapeHiss'), val: container.querySelector('#tapeHissVal') };

        // The "Age" slider is a macro that controls the other sliders.
        this.age.slider.addEventListener('input', () => {
            const ageValue = parseFloat(this.age.slider.value);
            this.age.val.textContent = ageValue.toFixed(2);
            
            // Link age to other parameters
            this.saturate.slider.value = ageValue * 0.8;
            this.wobble.slider.value = ageValue * 0.004;
            this.muffle.slider.value = 18000 - (ageValue * 14000);
            this.hiss.slider.value = ageValue * 0.04;
            
            // Manually trigger the 'input' event on others to update displays and audio
            this.saturate.slider.dispatchEvent(new Event('input', { bubbles:true }));
            this.wobble.slider.dispatchEvent(new Event('input', { bubbles:true }));
            this.muffle.slider.dispatchEvent(new Event('input', { bubbles:true }));
            this.hiss.slider.dispatchEvent(new Event('input', { bubbles:true }));
        });
        
        const connect = (ctrl, decimals = 2, update = true) => {
            ctrl.slider.addEventListener('input', () => {
                ctrl.val.textContent = parseFloat(ctrl.slider.value).toFixed(decimals);
                if (update) this.updateParams();
            });
        };
        
        connect(this.saturate);
        connect(this.wobble, 4);
        connect(this.muffle, 0);
        connect(this.hiss, 3);
        
        this.updateParams();
    }

    updateParams() {
        if (!this.nodes.input) return;
        const time = this.audioContext.currentTime;
        const smoothing = 0.03;

        // Saturation
        this.nodes.saturator.curve = this._createSaturationCurve(parseFloat(this.saturate.slider.value));
        
        // Wow & Flutter
        this.nodes.wobbleDelay.delayTime.value = 0.01; // Base delay
        this.nodes.wowLFO.frequency.value = 0.5; // Slow wow
        this.nodes.flutterLFO.frequency.value = 7.0; // Faster flutter
        this.nodes.wobbleDepth.gain.setTargetAtTime(parseFloat(this.wobble.slider.value), time, smoothing);

        // Muffle
        this.nodes.toneFilter.frequency.setTargetAtTime(parseFloat(this.muffle.slider.value), time, smoothing);
        
        // Hiss
        this.nodes.hissGain.gain.setTargetAtTime(parseFloat(this.hiss.slider.value), time, smoothing);
    }
    
    destroy() {
        Object.values(this.nodes).forEach(node => node.stop && node.stop(0));
    }
}

// --- This line is crucial for the main app to load the module ---
window.registerSynthModule(CassetteModule);