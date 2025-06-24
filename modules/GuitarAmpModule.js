/**
 * Example Synth Module: A Guitar Amp and Cabinet Simulator.
 *
 * This module simulates a full electric guitar signal chain, including a
 * preamp for distortion, a 3-band tone stack for EQ, and a speaker
 * cabinet simulator using convolution.
 *
 * This module demonstrates:
 * - Modeling a complete, multi-stage audio signal chain.
 * - Using a ConvolverNode for speaker cabinet emulation.
 * - Programmatically generating a convincing Impulse Response (IR) for the cabinet.
 */
class GuitarAmpModule {
    constructor(audioContext) {
        this.audioContext = audioContext;
        this.id = 'guitarAmpModule';
        this.name = 'Guitar Amp Sim';

        // --- Create Audio Nodes ---
        this.nodes = {
            input: this.audioContext.createGain(),
            output: this.audioContext.createGain(),
            
            // --- Amp Head Simulation ---
            preamp: this.audioContext.createWaveShaper(),
            
            // --- Tone Stack (EQ) ---
            bass: this.audioContext.createBiquadFilter(),
            mid: this.audioContext.createBiquadFilter(),
            treble: this.audioContext.createBiquadFilter(),
            
            // --- Cabinet Simulation ---
            cabinet: this.audioContext.createConvolver(),
        };

        // --- Configure Nodes ---
        this.nodes.bass.type = 'lowshelf';
        this.nodes.mid.type = 'peaking';
        this.nodes.treble.type = 'highshelf';

        this.nodes.bass.frequency.value = 200;
        this.nodes.mid.frequency.value = 800;
        this.nodes.mid.Q.value = 1.0;
        this.nodes.treble.frequency.value = 3000;
        
        // --- Connect the Audio Graph ---
        // The signal flows through the chain: preamp -> bass -> mid -> treble -> cabinet -> output
        this.nodes.input.connect(this.nodes.preamp);
        this.nodes.preamp.connect(this.nodes.bass);
        this.nodes.bass.connect(this.nodes.mid);
        this.nodes.mid.connect(this.nodes.treble);
        this.nodes.treble.connect(this.nodes.cabinet);
        this.nodes.cabinet.connect(this.nodes.output);

        // --- Generate a default Cabinet Impulse Response ---
        this._createDefaultCabinetIR();
    }

    /**
     * Creates a simple, synthetic IR that mimics the frequency response of a guitar speaker.
     * @private
     */
    _createDefaultCabinetIR() {
        const sampleRate = this.audioContext.sampleRate;
        const duration = 0.05; // A very short, dry impulse
        const numSamples = sampleRate * duration;
        
        const irBuffer = this.audioContext.createBuffer(1, numSamples, sampleRate);
        const irData = irBuffer.getChannelData(0);

        // Create a simple, decaying noise burst as the base for our IR
        for (let i = 0; i < numSamples; i++) {
            irData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / numSamples, 2.5);
        }

        // Now, we create an offline context to filter this noise, shaping it
        // into a speaker-like frequency response.
        const offlineCtx = new OfflineAudioContext(1, numSamples, sampleRate);
        const source = offlineCtx.createBufferSource();
        source.buffer = irBuffer;
        
        // A typical guitar speaker has a big mid-range hump and rolls off highs and lows.
        const lowPass = offlineCtx.createBiquadFilter();
        lowPass.type = 'lowpass';
        lowPass.frequency.value = 4500; // Cut off fizzy highs
        
        const highPass = offlineCtx.createBiquadFilter();
        highPass.type = 'highpass';
        highPass.frequency.value = 80; // Cut off muddy lows

        source.connect(highPass);
        highPass.connect(lowPass);
        lowPass.connect(offlineCtx.destination);
        
        source.start(0);
        offlineCtx.startRendering().then(renderedBuffer => {
            // Use the rendered, filtered noise as our cabinet impulse response
            this.nodes.cabinet.buffer = renderedBuffer;
        });
    }

    /**
     * Creates a distortion curve for the preamp WaveShaperNode.
     * @private
     */
    _createDistortionCurve(drive) {
        const k = drive * 10; // Scale drive for a more noticeable effect
        const n_samples = 44100;
        const curve = new Float32Array(n_samples);
        for (let i = 0; i < n_samples; ++i) {
            const x = i * 2 / n_samples - 1;
            // A simple soft-clipping formula
            curve[i] = (Math.PI + k) * x / (Math.PI + k * Math.abs(x));
        }
        return curve;
    }

    getHTML() {
        return `
            <div class="control-row">
                <label for="ampDrive">Drive:</label>
                <input type="range" id="ampDrive" min="0.1" max="10" value="2.0" step="0.1">
                <span id="ampDriveVal" class="value-display">2.0</span>
            </div>
            <h4 style="margin-top:15px; text-align:center;">Tone Stack</h4>
            <div class="control-row">
                <label for="ampBass">Bass:</label>
                <input type="range" id="ampBass" min="-18" max="18" value="0" step="1">
                <span id="ampBassVal" class="value-display">0</span>
            </div>
            <div class="control-row">
                <label for="ampMid">Mid:</label>
                <input type="range" id="ampMid" min="-18" max="18" value="0" step="1">
                <span id="ampMidVal" class="value-display">0</span>
            </div>
            <div class="control-row">
                <label for="ampTreble">Treble:</label>
                <input type="range" id="ampTreble" min="-18" max="18" value="0" step="1">
                <span id="ampTrebleVal" class="value-display">0</span>
            </div>
        `;
    }

    initUI(container) {
        this.drive = { slider: container.querySelector('#ampDrive'), val: container.querySelector('#ampDriveVal') };
        this.bass = { slider: container.querySelector('#ampBass'), val: container.querySelector('#ampBassVal') };
        this.mid = { slider: container.querySelector('#ampMid'), val: container.querySelector('#ampMidVal') };
        this.treble = { slider: container.querySelector('#ampTreble'), val: container.querySelector('#ampTrebleVal') };

        const connect = (ctrl, decimals = 0) => {
            ctrl.slider.addEventListener('input', () => {
                ctrl.val.textContent = parseFloat(ctrl.slider.value).toFixed(decimals);
                this.updateParams();
            });
        };
        
        connect(this.drive, 1);
        connect(this.bass, 0);
        connect(this.mid, 0);
        connect(this.treble, 0);
        
        this.updateParams();
    }

    updateParams() {
        if (!this.nodes.preamp) return;
        const time = this.audioContext.currentTime;
        const smoothing = 0.01;
        
        const drive = parseFloat(this.drive.slider.value);
        this.nodes.preamp.curve = this._createDistortionCurve(drive);

        const bass = parseFloat(this.bass.slider.value);
        const mid = parseFloat(this.mid.slider.value);
        const treble = parseFloat(this.treble.slider.value);
        
        this.nodes.bass.gain.setTargetAtTime(bass, time, smoothing);
        this.nodes.mid.gain.setTargetAtTime(mid, time, smoothing);
        this.nodes.treble.gain.setTargetAtTime(treble, time, smoothing);
    }
}

// --- This line is crucial for the main app to load the module ---
window.registerSynthModule(GuitarAmpModule);