/**
 * Example Synth Module: A Time Warping / Pitch Shifting Sampler.
 *
 * This module plays back a loaded audio sample, allowing the user to
 * independently control its pitch and duration. It uses a granular
 * synthesis approach to reconstruct the audio in real-time.
 *
 * This module demonstrates:
 * - A practical implementation of a time-stretching and pitch-shifting algorithm.
 * - An advanced use of ScriptProcessorNode for sample reconstruction.
 * - A powerful tool for creative sample manipulation and sound design.
 */
class WarperModule {
    constructor(audioContext) {
        this.audioContext = audioContext;
        this.id = 'warperModule';
        this.name = 'Time Warper';

        this.audioBuffer = null;
        this.isPlaying = false;
        
        // --- Grain parameters ---
        this.grainSize = 0.1; // 100ms grains
        this.overlap = 0.5;   // 50% overlap
        this.readPosition = 0.0; // Our "virtual playhead" in the source buffer

        // --- Create Audio Nodes ---
        this.nodes = {
            input: this.audioContext.createGain(), // Unused
            output: this.audioContext.createGain(),
            processor: this.audioContext.createScriptProcessor(2048, 1, 1),
        };

        // --- Connect Audio Graph ---
        this.nodes.processor.connect(this.nodes.output);
        
        // --- Setup Processing Logic ---
        this.nodes.processor.onaudioprocess = this._generateGrains.bind(this);
    }

    _play() {
        if (!this.audioBuffer) return;
        this.readPosition = 0.0;
        this.isPlaying = true;
        this.playButton.textContent = "Stop";
        this.playButton.classList.add('active');
    }

    _stop() {
        this.isPlaying = false;
        if (this.playButton) {
            this.playButton.textContent = this.audioBuffer ? (this.fileName || "Play") : "Load Sample";
            this.playButton.classList.remove('active');
        }
    }
    
    /**
     * The main processing function that generates the output stream of grains.
     * @private
     */
    _generateGrains() {
        if (!this.isPlaying || !this.audioBuffer) {
            return;
        }

        const timeStretchRatio = parseFloat(this.stretch.slider.value);
        const pitchShiftRatio = Math.pow(2, parseFloat(this.pitch.slider.value) / 12);
        
        // How much to advance our virtual playhead each processing block
        const advanceAmount = (this.nodes.processor.bufferSize / this.audioContext.sampleRate) * timeStretchRatio;
        
        // Create a new grain every 'hop' distance
        const hopSize = this.grainSize * (1 - this.overlap);
        
        // --- Check if it's time to schedule a new grain ---
        // This is a simplified scheduler that triggers when the playhead crosses a hop boundary.
        // A more robust implementation would use a separate, faster timer.
        if (this.readPosition % hopSize < advanceAmount) {
            const grainSource = this.audioContext.createBufferSource();
            grainSource.buffer = this.audioBuffer;
            grainSource.playbackRate.value = pitchShiftRatio;

            // Create a gain envelope for the grain to prevent clicks
            const grainEnvelope = this.audioContext.createGain();
            grainEnvelope.connect(this.nodes.processor); // Connect to the processor's input

            grainSource.connect(grainEnvelope);
            
            const now = this.audioContext.currentTime;
            const grainStartTime = this.readPosition;
            
            // Envelope: ramp up, hold, ramp down
            grainEnvelope.gain.setValueAtTime(0, now);
            grainEnvelope.gain.linearRampToValueAtTime(1, now + (this.grainSize * this.overlap));
            grainEnvelope.gain.setValueAtTime(1, now + this.grainSize - (this.grainSize * this.overlap));
            grainEnvelope.gain.linearRampToValueAtTime(0, now + this.grainSize);

            grainSource.start(now, grainStartTime, this.grainSize * 2); // Start playing from the calculated position
            
            // Cleanup
            grainSource.stop(now + this.grainSize + 0.01);
            setTimeout(() => {
                grainEnvelope.disconnect();
                grainSource.disconnect();
            }, (this.grainSize + 0.1) * 1000);
        }
        
        // Advance the virtual playhead
        this.readPosition += advanceAmount;

        // If playhead reaches the end, stop or loop
        if (this.readPosition > this.audioBuffer.duration) {
            if (this.loopToggle.checked) {
                this.readPosition = 0;
            } else {
                this._stop();
            }
        }
    }

    getHTML() {
        return `
            <div class="control-row" style="margin-bottom:15px;">
                <button id="warperPlayBtn" style="width: 70%; height: 40px; font-size: 1.1em;">Load Sample</button>
                <input type="file" id="warperFile" accept="audio/*" style="display: none;">
                <button id="warperLoadBtn" style="width: 28%;">Load</button>
            </div>
            <div class="control-row">
                <label for="warperStretch">Time Stretch:</label>
                <input type="range" id="warperStretch" min="0.25" max="4.0" value="1.0" step="0.01">
                <span id="warperStretchVal" class="value-display">1.00</span>
            </div>
            <div class="control-row">
                <label for="warperPitch">Pitch Shift (semi):</label>
                <input type="range" id="warperPitch" min="-24" max="24" value="0" step="1">
                <span id="warperPitchVal" class="value-display">0</span>
            </div>
            <div class="control-row" style="justify-content: center;">
                 <label for="warperLoop" style="min-width:initial; margin-right: 10px;">Loop:</label>
                 <input type="checkbox" id="warperLoop" style="width: 20px; height: 20px;">
            </div>
        `;
    }

    initUI(container) {
        this.playButton = container.querySelector('#warperPlayBtn');
        this.fileInput = container.querySelector('#warperFile');
        this.loadButton = container.querySelector('#warperLoadBtn');
        
        this.stretch = { slider: container.querySelector('#warperStretch'), val: container.querySelector('#warperStretchVal') };
        this.pitch = { slider: container.querySelector('#warperPitch'), val: container.querySelector('#warperPitchVal') };
        this.loopToggle = container.querySelector('#warperLoop');

        this.playButton.addEventListener('click', () => {
            if (this.isPlaying) this._stop(); else this._play();
        });
        
        this.loadButton.addEventListener('click', () => this.fileInput.click());

        this.fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;

            this._stop();
            this.playButton.textContent = "Loading...";
            this.fileName = file.name.substring(0, 15) + (file.name.length > 15 ? '...' : '');

            const reader = new FileReader();
            reader.onload = (re) => {
                this.audioContext.decodeAudioData(re.target.result)
                    .then(buffer => {
                        this.audioBuffer = buffer;
                        this.playButton.textContent = this.fileName;
                    })
                    .catch(err => {
                        alert(`Error decoding sample: ${err.message}`);
                        this.playButton.textContent = "Load Error";
                    });
            };
            reader.readAsArrayBuffer(file);
        });

        this.stretch.slider.addEventListener('input', () => this.stretch.val.textContent = parseFloat(this.stretch.slider.value).toFixed(2));
        this.pitch.slider.addEventListener('input', () => this.pitch.val.textContent = this.pitch.slider.value);
    }
    
    updateParams() {
        // All parameters are read "live" by the script processor.
    }
}

// --- This line is crucial for the main app to load the module ---
window.registerSynthModule(WarperModule);