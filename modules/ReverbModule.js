/**
 * Example Synth Module: A Convolution Reverb.
 *
 * This module uses a ConvolverNode to apply reverb based on an impulse response (IR).
 * It demonstrates:
 * - Programmatically generating a synthetic IR as a default.
 * - Allowing the user to load their own IR audio file.
 * - Implementing a standard wet/dry mix control.
 */
class ReverbModule {
    constructor(audioContext) {
        this.audioContext = audioContext;
        this.id = 'reverbModule'; // A unique ID
        this.name = 'Convolution Reverb'; // The display name

        // --- Create Audio Nodes ---
        this.nodes = {
            input: this.audioContext.createGain(),
            output: this.audioContext.createGain(),
            convolver: this.audioContext.createConvolver(),
            dryGain: this.audioContext.createGain(),
            wetGain: this.audioContext.createGain(),
        };

        // --- Connect the audio graph for wet/dry mixing ---
        // Dry Path: input -> dryGain -> output
        this.nodes.input.connect(this.nodes.dryGain);
        this.nodes.dryGain.connect(this.nodes.output);

        // Wet Path: input -> convolver -> wetGain -> output
        this.nodes.input.connect(this.nodes.convolver);
        this.nodes.convolver.connect(this.nodes.wetGain);
        this.nodes.wetGain.connect(this.nodes.output);

        // --- Create a default synthetic impulse response ---
        // This ensures the module works immediately without needing a file.
        this._createSyntheticIR();
    }

    /**
     * Generates a simple, noisy impulse response and loads it into the convolver.
     * This creates a basic, diffuse reverb sound.
     * @private
     */
    _createSyntheticIR() {
        const sampleRate = this.audioContext.sampleRate;
        const duration = 2.0; // 2 seconds long
        const decay = 3.0;    // Exponential decay rate
        const numSamples = sampleRate * duration;
        
        const irBuffer = this.audioContext.createBuffer(2, numSamples, sampleRate);
        const left = irBuffer.getChannelData(0);
        const right = irBuffer.getChannelData(1);

        for (let i = 0; i < numSamples; i++) {
            const envelope = Math.pow(1 - (i / numSamples), decay);
            left[i] = (Math.random() * 2 - 1) * envelope;
            right[i] = (Math.random() * 2 - 1) * envelope;
        }

        this.nodes.convolver.buffer = irBuffer;
        if (this.statusSpan) {
            this.statusSpan.textContent = "Synthetic IR";
        }
    }

    /**
     * Returns the HTML string for the module's controls.
     */
    getHTML() {
        return `
            <div class="control-row">
                <label for="reverbMix">Mix (Wet):</label>
                <input type="range" id="reverbMix" min="0" max="1" value="0.3" step="0.01">
                <span id="reverbMixVal" class="value-display">0.30</span>
            </div>
            <div class="control-row" style="margin-top: 15px;">
                <label for="reverbIrFile">Load IR (.wav):</label>
                <input type="file" id="reverbIrFile" accept="audio/wav, audio/mp3, audio/aiff">
            </div>
            <div class="control-row" style="justify-content: center;">
                <button id="generateIrBtn">Generate New IR</button>
                <span id="irStatusSpan" style="margin-left: 15px; color: var(--color-text-secondary);">Synthetic IR</span>
            </div>
        `;
    }

    /**
     * Finds the UI elements and attaches event listeners.
     * @param {HTMLElement} container - The div containing the module's HTML.
     */
    initUI(container) {
        this.mixSlider = container.querySelector('#reverbMix');
        this.mixVal = container.querySelector('#reverbMixVal');
        this.fileInput = container.querySelector('#reverbIrFile');
        this.generateBtn = container.querySelector('#generateIrBtn');
        this.statusSpan = container.querySelector('#irStatusSpan');
        
        // Listener for the mix slider
        this.mixSlider.addEventListener('input', () => {
            this.mixVal.textContent = parseFloat(this.mixSlider.value).toFixed(2);
            this.updateParams();
        });
        
        // Listener for the "Generate New IR" button
        this.generateBtn.addEventListener('click', () => {
            this._createSyntheticIR();
        });

        // Listener for the file input to load custom IRs
        this.fileInput.addEventListener('change', (event) => {
            const file = event.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (e) => {
                this.audioContext.decodeAudioData(e.target.result)
                    .then(buffer => {
                        this.nodes.convolver.buffer = buffer;
                        this.statusSpan.textContent = file.name.substring(0, 15) + (file.name.length > 15 ? '...' : '');
                    })
                    .catch(err => {
                        alert(`Error decoding impulse response: ${err.message}`);
                        this.statusSpan.textContent = "Load Error!";
                    });
            };
            reader.readAsArrayBuffer(file);
        });

        // Initialize parameters on load
        this.updateParams();
    }

    /**
     * Reads values from the controls and updates the audio node parameters.
     */
    updateParams() {
        if (!this.nodes.wetGain || !this.nodes.dryGain) return;

        const mixValue = parseFloat(this.mixSlider.value);
        
        // Use an equal-power crossfade for a smoother mix
        const wetValue = Math.sin(mixValue * 0.5 * Math.PI);
        const dryValue = Math.cos(mixValue * 0.5 * Math.PI);

        this.nodes.wetGain.gain.setTargetAtTime(wetValue, this.audioContext.currentTime, 0.01);
        this.nodes.dryGain.gain.setTargetAtTime(dryValue, this.audioContext.currentTime, 0.01);
    }
}

// --- This line is crucial for the main app to load the module ---
window.registerSynthModule(ReverbModule);