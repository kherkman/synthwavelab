/**
 * Example Synth Module: A Glitch / Buffer Repeat Effect.
 *
 * This module continuously records audio into a buffer. When engaged, it
 * captures a small slice of the buffer and plays it back in a rapid,
* rhythmic loop, creating stutter and glitch effects.
 *
 * This module demonstrates:
 * - A performance-oriented effect controlled by a momentary button.
 * - Dynamic creation and scheduling of AudioBufferSourceNodes for looping.
 * - Managing a circular buffer for live audio recording.
 */
class GlitchModule {
    constructor(audioContext) {
        this.audioContext = audioContext;
        this.id = 'glitchModule';
        this.name = 'Glitch';

        this.bufferSize = this.audioContext.sampleRate * 2; // 2-second buffer
        this.audioBuffer = this.audioContext.createBuffer(1, this.bufferSize, this.audioContext.sampleRate);
        this.writePosition = 0;
        
        this.isEngaged = false;
        this.repeatSource = null; // The currently looping AudioBufferSourceNode

        // --- Create Audio Nodes ---
        this.nodes = {
            input: this.audioContext.createGain(),
            output: this.audioContext.createGain(),
            dryGain: this.audioContext.createGain(),
            wetGain: this.audioContext.createGain(),
            // The processor node is only used for writing to the buffer.
            recorder: this.audioContext.createScriptProcessor(1024, 1, 1),
        };

        // --- Connect the Audio Graph ---
        // The dry signal passes through when the effect is not engaged.
        this.nodes.input.connect(this.nodes.dryGain);
        this.nodes.dryGain.connect(this.nodes.output);
        
        // The wet signal (the repeated glitch) also goes to the output.
        this.nodes.wetGain.connect(this.nodes.output);
        
        // The input signal is also sent to the recorder to be captured.
        this.nodes.input.connect(this.nodes.recorder);
        // The recorder's output doesn't need to go anywhere.
        this.nodes.recorder.connect(this.audioContext.destination); 
        this.nodes.recorder.disconnect(this.audioContext.destination);

        // --- Set up the recording logic ---
        this.nodes.recorder.onaudioprocess = this._record.bind(this);
    }

    /**
     * Continuously records input audio to the circular buffer.
     * @private
     */
    _record(audioProcessingEvent) {
        const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
        const bufferData = this.audioBuffer.getChannelData(0);
        
        for (let i = 0; i < inputData.length; i++) {
            bufferData[this.writePosition] = inputData[i];
            this.writePosition++;
            if (this.writePosition >= this.bufferSize) {
                this.writePosition = 0; // Wrap around
            }
        }
    }

    /**
     * Starts the glitch/repeat effect.
     * @private
     */
    _startGlitch() {
        if (this.isEngaged) return;
        this.isEngaged = true;
        
        // When engaged, fade out the dry signal and fade in the wet.
        const now = this.audioContext.currentTime;
        this.nodes.dryGain.gain.setTargetAtTime(0, now, 0.01);
        this.nodes.wetGain.gain.setTargetAtTime(1, now, 0.01);

        this._triggerRepeat();
    }
    
    /**
     * Stops the glitch/repeat effect.
     * @private
     */
    _stopGlitch() {
        if (!this.isEngaged) return;
        this.isEngaged = false;
        
        if (this.repeatSource) {
            this.repeatSource.stop(0);
            this.repeatSource = null;
        }

        // When disengaged, fade the wet signal out and the dry signal back in.
        const now = this.audioContext.currentTime;
        this.nodes.wetGain.gain.setTargetAtTime(0, now, 0.02);
        this.nodes.dryGain.gain.setTargetAtTime(1, now, 0.02);
    }
    
    /**
     * Creates and plays a single loop of the captured slice.
     * @private
     */
    _triggerRepeat() {
        if (!this.isEngaged) return;

        const sliceDuration = parseFloat(this.slice.slider.value);
        const repeatSpeed = parseFloat(this.speed.slider.value);
        const loopDuration = sliceDuration / repeatSpeed;

        // Calculate the start of the slice to capture from the buffer
        let captureStart = this.writePosition - (this.audioContext.sampleRate * sliceDuration);
        if (captureStart < 0) {
            captureStart += this.bufferSize;
        }

        // Stop any previous loop
        if (this.repeatSource) {
            this.repeatSource.stop(0);
        }

        this.repeatSource = this.audioContext.createBufferSource();
        this.repeatSource.buffer = this.audioBuffer;
        this.repeatSource.loop = true;
        this.repeatSource.loopStart = captureStart / this.audioContext.sampleRate;
        this.repeatSource.loopEnd = (captureStart / this.audioContext.sampleRate) + sliceDuration;
        
        this.repeatSource.connect(this.nodes.wetGain);
        this.repeatSource.start(0, this.repeatSource.loopStart);
        
        // This is a simple implementation. A more advanced one might schedule
        // the next loop to start exactly when the current one ends.
    }

    getHTML() {
        return `
            <div class="control-row" style="margin-bottom:15px;">
                <button id="glitchEngageBtn" style="width: 100%; height: 50px; font-size: 1.2em; color: var(--color-neon-pink); border-color: var(--color-neon-pink);">Engage</button>
            </div>
            <div class="control-row">
                <label for="glitchSlice">Slice Size (s):</label>
                <input type="range" id="glitchSlice" min="0.01" max="1.0" value="0.25" step="0.01">
                <span id="glitchSliceVal" class="value-display">0.25</span>
            </div>
            <div class="control-row">
                <label for="glitchSpeed">Repeat Speed:</label>
                <input type="range" id="glitchSpeed" min="1" max="32" value="8" step="1">
                <span id="glitchSpeedVal" class="value-display">8</span>
            </div>
        `;
    }

    initUI(container) {
        this.engageButton = container.querySelector('#glitchEngageBtn');
        this.slice = { slider: container.querySelector('#glitchSlice'), val: container.querySelector('#glitchSliceVal') };
        this.speed = { slider: container.querySelector('#glitchSpeed'), val: container.querySelector('#glitchSpeedVal') };

        // This is a momentary effect button
        this.engageButton.addEventListener('mousedown', () => this._startGlitch());
        this.engageButton.addEventListener('touchstart', (e) => { e.preventDefault(); this._startGlitch(); });
        
        this.engageButton.addEventListener('mouseup', () => this._stopGlitch());
        this.engageButton.addEventListener('mouseleave', () => this._stopGlitch());
        this.engageButton.addEventListener('touchend', (e) => { e.preventDefault(); this._stopGlitch(); });
        
        // The controls can be adjusted live while the button is held down
        this.slice.slider.addEventListener('input', () => {
            this.slice.val.textContent = parseFloat(this.slice.slider.value).toFixed(2);
            if (this.isEngaged) this._triggerRepeat();
        });
        
        this.speed.slider.addEventListener('input', () => {
            this.speed.val.textContent = this.speed.slider.value;
            if (this.isEngaged) {
                // For speed, we need to adjust the playback rate of the looping source
                if (this.repeatSource) {
                    this.repeatSource.playbackRate.value = parseFloat(this.speed.slider.value);
                }
            }
        });
    }

    updateParams() {
        // Most logic is handled by the event listeners directly in this module.
    }
}

// --- This line is crucial for the main app to load the module ---
window.registerSynthModule(GlitchModule);