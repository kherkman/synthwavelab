/**
 * Example Synth Module: A Sample Player.
 *
 * This module allows loading and playing back a single audio sample, with
 * controls for pitch, looping, and volume. It acts as a self-contained
 * sound source that is triggered manually.
 *
 * This module demonstrates:
 * - Handling audio file loading and decoding via FileReader and decodeAudioData.
 * - Controlling an AudioBufferSourceNode (starting, stopping, looping, pitch).
 * - Creating a UI that reflects the state of the sampler (e.g., loaded, playing).
 * - Note: This sampler is triggered manually and replaces the incoming audio signal
 *   when playing. It does not process the input signal like a typical effect.
 */
class SamplerModule {
    constructor(audioContext) {
        this.audioContext = audioContext;
        this.id = 'samplerModule';
        this.name = 'Sample Player';

        this.audioBuffer = null; // To store the decoded audio data
        this.sourceNode = null;  // To hold the currently playing AudioBufferSourceNode
        this.isPlaying = false;
        
        // --- Create Audio Nodes ---
        this.nodes = {
            // The input node isn't used for processing, but is required by the host.
            input: this.audioContext.createGain(),
            // The output gain controls the final volume of the sample.
            output: this.audioContext.createGain(),
        };
    }

    /**
     * Starts playback of the loaded sample.
     * @private
     */
    _play() {
        if (!this.audioBuffer || this.isPlaying) {
            this._stop(); // Stop if it's already playing to allow re-triggering
        }
        
        if (!this.audioBuffer) return;

        // Create a new source node for this playback instance
        this.sourceNode = this.audioContext.createBufferSource();
        this.sourceNode.buffer = this.audioBuffer;
        
        // Connect it to the module's output
        this.sourceNode.connect(this.nodes.output);
        
        // Apply current parameters
        this.updateParams(true); // 'true' forces an immediate update
        
        // Start playback
        this.sourceNode.start(0);
        this.isPlaying = true;
        this.playButton.textContent = "Stop";
        this.playButton.classList.add('active');

        // When the sample finishes playing (if not looping), update the state.
        this.sourceNode.onended = () => {
            if (this.sourceNode && !this.sourceNode.loop) {
                this._stop(false); // 'false' because it already stopped
            }
        };
    }

    /**
     * Stops playback of the sample.
     * @private
     */
    _stop(shouldStopNode = true) {
        if (this.sourceNode && shouldStopNode) {
            this.sourceNode.onended = null; // prevent re-triggering this logic
            this.sourceNode.stop(0);
        }
        this.sourceNode = null;
        this.isPlaying = false;
        if (this.playButton) {
            this.playButton.textContent = this.audioBuffer ? (this.fileName || "Play") : "Load Sample";
            this.playButton.classList.remove('active');
        }
    }

    /**
     * Returns the HTML string for the module's controls.
     */
    getHTML() {
        return `
            <div class="control-row" style="margin-bottom:15px;">
                <button id="samplerPlayBtn" style="width: 70%; height: 40px; font-size: 1.1em;">Load Sample</button>
                <input type="file" id="samplerFile" accept="audio/*" style="display: none;">
                <button id="samplerLoadBtn" style="width: 28%;">Load</button>
            </div>
            <div class="control-row">
                <label for="samplerPitch">Pitch (Rate):</label>
                <input type="range" id="samplerPitch" min="0.1" max="4" value="1" step="0.01">
                <span id="samplerPitchVal" class="value-display">1.00</span>
            </div>
            <div class="control-row">
                <label for="samplerVolume">Volume:</label>
                <input type="range" id="samplerVolume" min="0" max="1.5" value="1" step="0.01">
                <span id="samplerVolumeVal" class="value-display">1.00</span>
            </div>
            <div class="control-row" style="justify-content: center;">
                 <label for="samplerLoop" style="min-width:initial; margin-right: 10px;">Loop:</label>
                 <input type="checkbox" id="samplerLoop" style="width: 20px; height: 20px;">
            </div>
        `;
    }

    /**
     * Finds the UI elements and attaches event listeners.
     * @param {HTMLElement} container - The div containing the module's HTML.
     */
    initUI(container) {
        this.playButton = container.querySelector('#samplerPlayBtn');
        this.fileInput = container.querySelector('#samplerFile');
        this.loadButton = container.querySelector('#samplerLoadBtn');
        
        this.pitch = { slider: container.querySelector('#samplerPitch'), val: container.querySelector('#samplerPitchVal') };
        this.volume = { slider: container.querySelector('#samplerVolume'), val: container.querySelector('#samplerVolumeVal') };
        this.loopToggle = container.querySelector('#samplerLoop');

        // Play/Stop button toggles playback
        this.playButton.addEventListener('click', () => {
            if (this.isPlaying) {
                this._stop();
            } else {
                this._play();
            }
        });
        
        // The 'Load' button just triggers the hidden file input
        this.loadButton.addEventListener('click', () => this.fileInput.click());

        // File loading logic
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

        const connect = (ctrl, decimals = 2) => {
            ctrl.slider.addEventListener('input', () => {
                ctrl.val.textContent = parseFloat(ctrl.slider.value).toFixed(decimals);
                this.updateParams();
            });
        };
        connect(this.pitch);
        connect(this.volume);
        this.loopToggle.addEventListener('change', () => this.updateParams());
        
        this.updateParams();
    }

    /**
     * Reads values from the controls and updates the audio node parameters.
     */
    updateParams(force = false) {
        const time = this.audioContext.currentTime;
        const smoothing = 0.01;
        
        const volume = parseFloat(this.volume.slider.value);
        this.nodes.output.gain.setTargetAtTime(volume, time, smoothing);

        // These parameters can only be set when a source node exists
        if (this.sourceNode) {
            const pitch = parseFloat(this.pitch.slider.value);
            this.sourceNode.playbackRate.setTargetAtTime(pitch, time, smoothing);
            
            this.sourceNode.loop = this.loopToggle.checked;
            
            // If looping is turned off while playing, we need to manually stop it
            // if it was previously looping.
            if (!this.sourceNode.loop && force === false) {
                 this.sourceNode.onended = () => this._stop(false);
            }
        }
    }
}

// --- This line is crucial for the main app to load the module ---
window.registerSynthModule(SamplerModule);