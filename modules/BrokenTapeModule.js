/**
 * Example Synth Module: A Broken Tape Machine.
 *
 * This module simulates the lo-fi artifacts of a worn-out tape deck, including:
 * - Pitch "wow and flutter" via a modulated delay line.
 * - Random signal "dropouts" via a ScriptProcessorNode.
 * - Constant "tape hiss" via a generated white noise source.
 *
 * This module demonstrates combining multiple simple effects into a single
 * complex, characterful processor.
 */
class BrokenTapeModule {
    constructor(audioContext) {
        this.audioContext = audioContext;
        this.id = 'brokenTapeModule';
        this.name = 'Broken Tape';
        
        // Internal state for the script processor
        this.dropoutChance = 0.0;
        this.hissLevel = 0.0;

        // --- Create Audio Nodes ---
        this.nodes = {
            input: this.audioContext.createGain(),
            output: this.audioContext.createGain(),
            // Pitch Flutter Section
            flutterDelay: this.audioContext.createDelay(0.05),
            flutterLFO: this.audioContext.createOscillator(),
            flutterDepth: this.audioContext.createGain(),
            // Dropout Section
            dropoutProcessor: this.audioContext.createScriptProcessor(1024, 1, 1),
            // Hiss Section
            hissSource: this.audioContext.createBufferSource(),
            hissGain: this.audioContext.createGain(),
        };

        // --- Configure and Connect the Main Signal Path ---
        // input -> flutter delay -> dropout processor -> output
        this.nodes.input.connect(this.nodes.flutterDelay);
        this.nodes.flutterDelay.connect(this.nodes.dropoutProcessor);
        this.nodes.dropoutProcessor.connect(this.nodes.output);

        // --- Configure the Pitch Flutter Section ---
        this.nodes.flutterLFO.type = 'sine';
        this.nodes.flutterLFO.frequency.value = 5; // Start with a 5Hz flutter
        this.nodes.flutterLFO.start();
        this.nodes.flutterLFO.connect(this.nodes.flutterDepth);
        this.nodes.flutterDepth.connect(this.nodes.flutterDelay.delayTime);
        this.nodes.flutterDelay.delayTime.value = 0.01; // Base delay of 10ms

        // --- Configure the Dropout Section ---
        this.nodes.dropoutProcessor.onaudioprocess = this._processDropouts.bind(this);
        
        // --- Configure the Hiss Section ---
        const bufferSize = this.audioContext.sampleRate * 2; // 2 seconds of noise
        const noiseBuffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            output[i] = Math.random() * 2 - 1; // Generate white noise
        }
        this.nodes.hissSource.buffer = noiseBuffer;
        this.nodes.hissSource.loop = true;
        this.nodes.hissSource.start();
        this.nodes.hissSource.connect(this.nodes.hissGain);
        this.nodes.hissGain.connect(this.nodes.output); // Mix hiss in with the main signal
    }

    /**
     * Custom audio processing for creating random dropouts.
     * @private
     */
    _processDropouts(audioProcessingEvent) {
        const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
        const outputData = audioProcessingEvent.outputBuffer.getChannelData(0);

        for (let i = 0; i < inputData.length; i++) {
            if (Math.random() < this.dropoutChance) {
                // Create a dropout by outputting silence
                outputData[i] = 0;
            } else {
                // Pass the signal through normally
                outputData[i] = inputData[i];
            }
        }
    }

    /**
     * Returns the HTML string for the module's controls.
     */
    getHTML() {
        return `
            <div class="control-row">
                <label for="tapeAge">Tape Age:</label>
                <input type="range" id="tapeAge" min="0" max="1" value="0.2" step="0.01">
                <span id="tapeAgeVal" class="value-display">0.20</span>
            </div>
            <h4 style="margin-top:15px; text-align:center;">Fine Controls</h4>
            <div class="control-row">
                <label for="tapeFlutter">Flutter Depth:</label>
                <input type="range" id="tapeFlutter" min="0" max="0.005" value="0.001" step="0.0001">
                <span id="tapeFlutterVal" class="value-display">0.0010</span>
            </div>
            <div class="control-row">
                <label for="tapeDropouts">Dropout Rate:</label>
                <input type="range" id="tapeDropouts" min="0" max="0.005" value="0.0001" step="0.0001">
                <span id="tapeDropoutsVal" class="value-display">0.0001</span>
            </div>
            <div class="control-row">
                <label for="tapeHiss">Hiss Level:</label>
                <input type="range" id="tapeHiss" min="0" max="0.05" value="0.005" step="0.001">
                <span id="tapeHissVal" class="value-display">0.005</span>
            </div>
        `;
    }

    /**
     * Finds the UI elements and attaches event listeners.
     * @param {HTMLElement} container - The div containing the module's HTML.
     */
    initUI(container) {
        this.age = { slider: container.querySelector('#tapeAge'), val: container.querySelector('#tapeAgeVal') };
        this.flutter = { slider: container.querySelector('#tapeFlutter'), val: container.querySelector('#tapeFlutterVal') };
        this.dropouts = { slider: container.querySelector('#tapeDropouts'), val: container.querySelector('#tapeDropoutsVal') };
        this.hiss = { slider: container.querySelector('#tapeHiss'), val: container.querySelector('#tapeHissVal') };

        // The "Tape Age" slider is a macro that controls the other sliders.
        this.age.slider.addEventListener('input', () => {
            const ageValue = parseFloat(this.age.slider.value);
            this.age.val.textContent = ageValue.toFixed(2);
            
            // As age increases, link it to the other parameters
            this.flutter.slider.value = ageValue * 0.005;
            this.dropouts.slider.value = ageValue * ageValue * 0.005; // Dropouts increase exponentially
            this.hiss.slider.value = ageValue * 0.05;
            
            // Manually trigger the 'input' event on the other sliders to update their displays and the audio
            this.flutter.slider.dispatchEvent(new Event('input', { bubbles:true }));
            this.dropouts.slider.dispatchEvent(new Event('input', { bubbles:true }));
            this.hiss.slider.dispatchEvent(new Event('input', { bubbles:true }));
        });
        
        // Individual listeners for fine-tuning
        this.flutter.slider.addEventListener('input', () => { this.flutter.val.textContent = parseFloat(this.flutter.slider.value).toFixed(4); this.updateParams(); });
        this.dropouts.slider.addEventListener('input', () => { this.dropouts.val.textContent = parseFloat(this.dropouts.slider.value).toFixed(4); this.updateParams(); });
        this.hiss.slider.addEventListener('input', () => { this.hiss.val.textContent = parseFloat(this.hiss.slider.value).toFixed(3); this.updateParams(); });

        this.updateParams();
    }

    /**
     * Reads values from the controls and updates the audio node parameters.
     */
    updateParams() {
        if (!this.nodes.input) return;
        const time = this.audioContext.currentTime;
        const smoothing = 0.05; // Use more smoothing for a more organic feel

        // Update parameters for the script processor
        this.dropoutChance = parseFloat(this.dropouts.slider.value);
        
        // Update audio node parameters
        const flutterDepth = parseFloat(this.flutter.slider.value);
        this.nodes.flutterDepth.gain.setTargetAtTime(flutterDepth, time, smoothing);

        const hissLevel = parseFloat(this.hiss.slider.value);
        this.nodes.hissGain.gain.setTargetAtTime(hissLevel, time, smoothing);
    }
}

// --- This line is crucial for the main app to load the module ---
window.registerSynthModule(BrokenTapeModule);