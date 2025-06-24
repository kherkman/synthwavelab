/**
 * Example Synth Module: A Drone Synthesizer.
 *
 * This module generates a continuous, slowly evolving atmospheric drone.
 * It uses three detuned oscillators, a resonant filter, and slow LFO
 * modulation to create a rich, textural soundscape.
 *
 * This module demonstrates:
 * - A complete, self-contained synthesizer voice for atmospheric sounds.
 * - Using multiple detuned oscillators for a thick, rich tone.
 * - Slow LFO modulation of multiple parameters to create organic evolution.
 */
class DroneSynthModule {
    constructor(audioContext) {
        this.audioContext = audioContext;
        this.id = 'droneSynthModule';
        this.name = 'Drone Synth';
        this.isPlaying = false;

        // --- Create Audio Nodes ---
        this.nodes = {
            input: this.audioContext.createGain(), // Unused, for host interface
            output: this.audioContext.createGain(),
            
            // --- Core Oscillators ---
            osc1: this.audioContext.createOscillator(),
            osc2: this.audioContext.createOscillator(),
            osc3: this.audioContext.createOscillator(),
            
            // --- Noise for Texture ---
            noise: this.audioContext.createBufferSource(),
            noiseFilter: this.audioContext.createBiquadFilter(),
            noiseGain: this.audioContext.createGain(),
            
            // --- Main Filter and LFO ---
            filter: this.audioContext.createBiquadFilter(),
            lfo: this.audioContext.createOscillator(),
            lfoDepth: this.audioContext.createGain(),
        };

        // --- Configure Nodes ---
        [this.nodes.osc1, this.nodes.osc2, this.nodes.osc3].forEach(osc => osc.type = 'sawtooth');
        this.nodes.lfo.type = 'sine';
        this.nodes.filter.type = 'lowpass';
        this.nodes.noiseFilter.type = 'lowpass';
        this.nodes.noiseFilter.frequency.value = 500;
        
        // --- Generate Noise Buffer (Brown-ish) ---
        const bufferSize = this.audioContext.sampleRate * 2;
        const noiseBuffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const data = noiseBuffer.getChannelData(0);
        let lastOut = 0.0;
        for (let i = 0; i < bufferSize; i++) {
            const white = Math.random() * 2 - 1;
            data[i] = (lastOut + (0.02 * white)) / 1.02;
            lastOut = data[i];
            data[i] *= 3.5; // (roughly) compensate for gain
        }
        this.nodes.noise.buffer = noiseBuffer;
        this.nodes.noise.loop = true;

        // --- Connect the Audio Graph ---
        // Oscillators connect to the main filter
        this.nodes.osc1.connect(this.nodes.filter);
        this.nodes.osc2.connect(this.nodes.filter);
        this.nodes.osc3.connect(this.nodes.filter);
        
        // Noise path
        this.nodes.noise.connect(this.nodes.noiseFilter);
        this.nodes.noiseFilter.connect(this.nodes.noiseGain);
        this.nodes.noiseGain.connect(this.nodes.output);
        
        // Main filter path
        this.nodes.filter.connect(this.nodes.output);
        
        // LFO modulation path: LFO -> LFO Depth -> Filter Cutoff
        this.nodes.lfo.connect(this.nodes.lfoDepth);
        this.nodes.lfoDepth.connect(this.nodes.filter.frequency);
    }
    
    _start() {
        if (this.isPlaying) return;
        this.isPlaying = true;

        // Start all sound sources
        this.nodes.osc1.start(0);
        this.nodes.osc2.start(0);
        this.nodes.osc3.start(0);
        this.nodes.lfo.start(0);
        this.nodes.noise.start(0);
        
        // Apply current parameters
        this.updateParams();
        
        // Fade in the main output to avoid clicks
        this.nodes.output.gain.setTargetAtTime(1.0, this.audioContext.currentTime, 0.1);
        
        this.playButton.textContent = "Stop";
        this.playButton.classList.add('active');
    }
    
    _stop() {
        if (!this.isPlaying) return;
        
        // Fade out the main output
        this.nodes.output.gain.setTargetAtTime(0, this.audioContext.currentTime, 0.5);
        
        // Stop the sources after the fade-out is complete
        const now = this.audioContext.currentTime;
        this.nodes.osc1.stop(now + 1);
        this.nodes.osc2.stop(now + 1);
        this.nodes.osc3.stop(now + 1);
        this.nodes.lfo.stop(now + 1);
        this.nodes.noise.stop(now + 1);
        
        // Re-create the nodes so they can be started again
        this.constructor(this.audioContext);
        
        this.isPlaying = false;
        if (this.playButton) {
            this.playButton.textContent = "Start";
            this.playButton.classList.remove('active');
        }
    }

    _midiToFreq(midi) {
        return 440 * Math.pow(2, (midi - 69) / 12);
    }

    getHTML() {
        let noteOptions = '';
        const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        for (let i = 24; i <= 72; i++) { // C1 to C5
            const noteName = noteNames[i % 12];
            const octave = Math.floor(i / 12) - 1;
            const selected = i === 36 ? 'selected' : ''; // Default to C2
            noteOptions += `<option value="${i}" ${selected}>${noteName}${octave}</option>`;
        }
        
        return `
            <div class="control-row" style="margin-bottom:15px;">
                <button id="dronePlayBtn" class="toggle-button" style="width: 100%; height: 40px; font-size: 1.1em;">Start</button>
            </div>
            <div class="control-row">
                <label for="droneRootNote">Root Note:</label>
                <select id="droneRootNote" style="flex-grow:1;">${noteOptions}</select>
            </div>
            <div class="control-row">
                <label for="droneDetune">Detune (cents):</label>
                <input type="range" id="droneDetune" min="0" max="50" value="10" step="0.1">
                <span id="droneDetuneVal" class="value-display">10.0</span>
            </div>
            <div class="control-row">
                <label for="droneFilterFreq">Filter Freq:</label>
                <input type="range" id="droneFilterFreq" min="100" max="10000" value="2000" step="50">
                <span id="droneFilterFreqVal" class="value-display">2000</span>
            </div>
            <div class="control-row">
                <label for="droneFilterQ">Filter Reso:</label>
                <input type="range" id="droneFilterQ" min="0.1" max="15" value="2" step="0.1">
                <span id="droneFilterQVal" class="value-display">2.0</span>
            </div>
            <div class="control-row">
                <label for="droneLfoRate">Drift (Rate):</label>
                <input type="range" id="droneLfoRate" min="0.01" max="1" value="0.1" step="0.01">
                <span id="droneLfoRateVal" class="value-display">0.10</span>
            </div>
            <div class="control-row">
                <label for="droneLfoDepth">Drift (Depth):</label>
                <input type="range" id="droneLfoDepth" min="0" max="2000" value="500" step="10">
                <span id="droneLfoDepthVal" class="value-display">500</span>
            </div>
             <div class="control-row">
                <label for="droneNoiseLevel">Noise Level:</label>
                <input type="range" id="droneNoiseLevel" min="0" max="0.1" value="0.02" step="0.001">
                <span id="droneNoiseLevelVal" class="value-display">0.020</span>
            </div>
        `;
    }

    initUI(container) {
        this.playButton = container.querySelector('#dronePlayBtn');
        this.rootNote = { selector: container.querySelector('#droneRootNote') };
        this.detune = { slider: container.querySelector('#droneDetune'), val: container.querySelector('#droneDetuneVal') };
        this.filterFreq = { slider: container.querySelector('#droneFilterFreq'), val: container.querySelector('#droneFilterFreqVal') };
        this.filterQ = { slider: container.querySelector('#droneFilterQ'), val: container.querySelector('#droneFilterQVal') };
        this.lfoRate = { slider: container.querySelector('#droneLfoRate'), val: container.querySelector('#droneLfoRateVal') };
        this.lfoDepth = { slider: container.querySelector('#droneLfoDepth'), val: container.querySelector('#droneLfoDepthVal') };
        this.noiseLevel = { slider: container.querySelector('#droneNoiseLevel'), val: container.querySelector('#droneNoiseLevelVal') };
        
        this.playButton.addEventListener('click', () => {
            if (this.isPlaying) this._stop(); else this._start();
        });

        const connect = (ctrl, decimals = 2) => {
            if (ctrl.slider) {
                ctrl.slider.addEventListener('input', () => {
                    ctrl.val.textContent = parseFloat(ctrl.slider.value).toFixed(decimals);
                    this.updateParams();
                });
            } else if (ctrl.selector) {
                ctrl.selector.addEventListener('change', () => this.updateParams());
            }
        };

        connect(this.rootNote);
        connect(this.detune, 1);
        connect(this.filterFreq, 0);
        connect(this.filterQ, 1);
        connect(this.lfoRate, 2);
        connect(this.lfoDepth, 0);
        connect(this.noiseLevel, 3);
        
        // Set initial state
        this.nodes.output.gain.value = 0;
    }

    updateParams() {
        if (!this.isPlaying) return;

        const time = this.audioContext.currentTime;
        const smoothing = 0.1; // Use a longer smoothing time for drones

        const rootMidi = parseInt(this.rootNote.selector.value, 10);
        const rootFreq = this._midiToFreq(rootMidi);
        const detune = parseFloat(this.detune.slider.value);
        
        // Set oscillator pitches
        this.nodes.osc1.frequency.setTargetAtTime(rootFreq, time, smoothing);
        this.nodes.osc2.frequency.setTargetAtTime(rootFreq, time, smoothing);
        this.nodes.osc3.frequency.setTargetAtTime(rootFreq, time, smoothing);
        this.nodes.osc1.detune.setTargetAtTime(0, time, smoothing);
        this.nodes.osc2.detune.setTargetAtTime(detune, time, smoothing);
        this.nodes.osc3.detune.setTargetAtTime(-detune, time, smoothing);

        // Set filter parameters
        const filterFreq = parseFloat(this.filterFreq.slider.value);
        const filterQ = parseFloat(this.filterQ.slider.value);
        this.nodes.filter.frequency.value = filterFreq; // Base frequency is set directly
        this.nodes.filter.Q.setTargetAtTime(filterQ, time, smoothing);

        // Set LFO (Drift) parameters
        const lfoRate = parseFloat(this.lfoRate.slider.value);
        const lfoDepth = parseFloat(this.lfoDepth.slider.value);
        this.nodes.lfo.frequency.setTargetAtTime(lfoRate, time, smoothing);
        this.nodes.lfoDepth.gain.setTargetAtTime(lfoDepth, time, smoothing);
        
        // Set Noise Level
        const noiseLevel = parseFloat(this.noiseLevel.slider.value);
        this.nodes.noiseGain.gain.setTargetAtTime(noiseLevel, time, smoothing);
    }
}

// --- This line is crucial for the main app to load the module ---
window.registerSynthModule(DroneSynthModule);