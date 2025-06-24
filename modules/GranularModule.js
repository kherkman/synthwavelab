/**
 * Example Synth Module: A Granular Synthesizer.
 *
 * This module creates a continuous soundscape by playing back tiny,
 * overlapping snippets ("grains") from a loaded audio sample. By controlling
 * the properties of these grains, it can create textures, pads, and glitchy
 * effects from any source material.
 *
 * This module demonstrates:
 * - A generative audio system using timed scheduling (setInterval).
 * - Advanced control of AudioBufferSourceNode, including offset and duration.
 * - Using randomization to create complex, evolving textures.
 */
class GranularModule {
    constructor(audioContext) {
        this.audioContext = audioContext;
        this.id = 'granularModule';
        this.name = 'Granulator';

        this.audioBuffer = null; // To store the decoded sample
        this.isPlaying = false;
        this.scheduler = null;   // To hold the setInterval ID

        // --- Create Audio Nodes ---
        this.nodes = {
            // Input is not used for processing but is required by the host.
            input: this.audioContext.createGain(),
            // A master output gain for the entire granular stream.
            output: this.audioContext.createGain(),
        };
    }

    /**
     * Starts the granular synthesis engine.
     * @private
     */
    _startEngine() {
        if (this.isPlaying || !this.audioBuffer) {
            return;
        }
        this.isPlaying = true;

        // The scheduler function will be called repeatedly to create new grains.
        const scheduleGrain = () => {
            if (!this.isPlaying) return;
            this._createGrain();
        };
        
        // Use setInterval to trigger new grains at a user-defined rate.
        const density = parseFloat(this.density.slider.value);
        const intervalMs = 1000 / density;
        
        // Clear any previous scheduler
        if (this.scheduler) {
            clearInterval(this.scheduler);
        }
        this.scheduler = setInterval(scheduleGrain, intervalMs);

        this.playButton.textContent = "Stop";
        this.playButton.classList.add('active');
    }

    /**
     * Stops the granular synthesis engine.
     * @private
     */
    _stopEngine() {
        if (!this.isPlaying) return;
        this.isPlaying = false;
        
        clearInterval(this.scheduler);
        this.scheduler = null;

        if (this.playButton) {
            this.playButton.textContent = this.audioBuffer ? (this.fileName || "Start") : "Load Sample";
            this.playButton.classList.remove('active');
        }
    }

    /**
     * Creates and schedules a single audio grain.
     * @private
     */
    _createGrain() {
        if (!this.audioBuffer) return;

        const grainSource = this.audioContext.createBufferSource();
        grainSource.buffer = this.audioBuffer;
        
        // --- Get Grain Parameters from UI ---
        const position = parseFloat(this.position.slider.value);
        const spread = parseFloat(this.spread.slider.value);
        const duration = parseFloat(this.duration.slider.value);
        const pitch = parseFloat(this.pitch.slider.value);
        const jitter = parseFloat(this.jitter.slider.value);
        
        // --- Calculate Randomized Parameters for this Grain ---
        // Start Position: The base position +/- a random spread.
        let startOffset = position + (Math.random() - 0.5) * spread;
        startOffset = Math.max(0, Math.min(startOffset, this.audioBuffer.duration - duration));
        
        // Pitch: The base pitch +/- a random jitter.
        grainSource.playbackRate.value = pitch + (Math.random() - 0.5) * jitter;
        
        // --- Create a volume envelope for the grain to avoid clicks ---
        const grainGain = this.audioContext.createGain();
        grainGain.connect(this.nodes.output);
        grainSource.connect(grainGain);
        
        const now = this.audioContext.currentTime;
        // A very short attack and release ramp.
        const attackTime = duration * 0.1;
        const releaseTime = duration * 0.9;
        grainGain.gain.setValueAtTime(0, now);
        grainGain.gain.linearRampToValueAtTime(1, now + attackTime);
        grainGain.gain.setValueAtTime(1, now + releaseTime);
        grainGain.gain.linearRampToValueAtTime(0, now + duration);
        
        // --- Schedule the grain playback ---
        grainSource.start(now, startOffset, duration);
        
        // Clean up the nodes after the grain has finished playing.
        grainSource.stop(now + duration + 0.01);
        setTimeout(() => {
            grainGain.disconnect();
            grainSource.disconnect();
        }, (duration + 0.1) * 1000);
    }

    getHTML() {
        return `
            <div class="control-row" style="margin-bottom:15px;">
                <button id="granularPlayBtn" style="width: 70%; height: 40px; font-size: 1.1em;">Load Sample</button>
                <input type="file" id="granularFile" accept="audio/*" style="display: none;">
                <button id="granularLoadBtn" style="width: 28%;">Load</button>
            </div>
            <h4>Grain Controls</h4>
            <div class="control-row">
                <label for="granularDensity">Density (grains/s):</label>
                <input type="range" id="granularDensity" min="1" max="100" value="20" step="1">
                <span id="granularDensityVal" class="value-display">20</span>
            </div>
            <div class="control-row">
                <label for="granularDuration">Duration (s):</label>
                <input type="range" id="granularDuration" min="0.01" max="1.0" value="0.2" step="0.01">
                <span id="granularDurationVal" class="value-display">0.20</span>
            </div>
            <div class="control-row">
                <label for="granularPosition">Position (s):</label>
                <input type="range" id="granularPosition" min="0" max="1" value="0" step="0.01" disabled>
                <span id="granularPositionVal" class="value-display">0.00</span>
            </div>
            <div class="control-row">
                <label for="granularSpread">Spread (s):</label>
                <input type="range" id="granularSpread" min="0" max="1" value="0.1" step="0.01" disabled>
                <span id="granularSpreadVal" class="value-display">0.10</span>
            </div>
            <h4>Pitch Controls</h4>
            <div class="control-row">
                <label for="granularPitch">Pitch:</label>
                <input type="range" id="granularPitch" min="0.1" max="4" value="1" step="0.01">
                <span id="granularPitchVal" class="value-display">1.00</span>
            </div>
            <div class="control-row">
                <label for="granularJitter">Jitter:</label>
                <input type="range" id="granularJitter" min="0" max="2" value="0.1" step="0.01">
                <span id="granularJitterVal" class="value-display">0.10</span>
            </div>
        `;
    }

    initUI(container) {
        this.playButton = container.querySelector('#granularPlayBtn');
        this.fileInput = container.querySelector('#granularFile');
        this.loadButton = container.querySelector('#granularLoadBtn');
        
        this.density = { slider: container.querySelector('#granularDensity'), val: container.querySelector('#granularDensityVal') };
        this.duration = { slider: container.querySelector('#granularDuration'), val: container.querySelector('#granularDurationVal') };
        this.position = { slider: container.querySelector('#granularPosition'), val: container.querySelector('#granularPositionVal') };
        this.spread = { slider: container.querySelector('#granularSpread'), val: container.querySelector('#granularSpreadVal') };
        this.pitch = { slider: container.querySelector('#granularPitch'), val: container.querySelector('#granularPitchVal') };
        this.jitter = { slider: container.querySelector('#granularJitter'), val: container.querySelector('#granularJitterVal') };

        // Play/Stop button toggles the synthesis engine
        this.playButton.addEventListener('click', () => {
            if (this.isPlaying) this._stopEngine();
            else this._startEngine();
        });
        
        this.loadButton.addEventListener('click', () => this.fileInput.click());

        // File loading logic
        this.fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;

            this._stopEngine();
            this.playButton.textContent = "Loading...";
            this.fileName = file.name.substring(0, 15) + (file.name.length > 15 ? '...' : '');

            const reader = new FileReader();
            reader.onload = (re) => {
                this.audioContext.decodeAudioData(re.target.result)
                    .then(buffer => {
                        this.audioBuffer = buffer;
                        // Update the range of sliders that depend on the sample length
                        this.position.slider.max = buffer.duration;
                        this.position.slider.disabled = false;
                        this.spread.slider.max = buffer.duration / 2;
                        this.spread.slider.disabled = false;
                        this.playButton.textContent = this.fileName;
                    })
                    .catch(err => {
                        alert(`Error decoding sample: ${err.message}`);
                        this.playButton.textContent = "Load Error";
                    });
            };
            reader.readAsArrayBuffer(file);
        });

        const connect = (ctrl, decimals = 2) => {
            ctrl.slider.addEventListener('input', () => {
                ctrl.val.textContent = parseFloat(ctrl.slider.value).toFixed(decimals);
                this.updateParams();
            });
        };
        
        connect(this.density, 0);
        connect(this.duration);
        connect(this.position);
        connect(this.spread);
        connect(this.pitch);
        connect(this.jitter);

        this.updateParams();
    }

    /**
     * Updates parameters. For the granulator, this mainly involves
     * restarting the scheduler if the density (interval) changes.
     */
    updateParams() {
        if (this.isPlaying) {
            // If the density changes, we need to restart the setInterval
            // with the new interval time.
            this._stopEngine();
            this._startEngine();
        }
    }
}

// --- This line is crucial for the main app to load the module ---
window.registerSynthModule(GranularModule);