/**
 * Example Synth Module: A "Cybertron" Ambient Machinery Generator.
 *
 * This module is a self-contained soundscape generator that creates the sound
 * of a vast, futuristic, industrial machine, complete with a deep power core
 * hum, ventilation systems, rhythmic servos, and random data glitches.
 *
 * This module demonstrates:
 * - A complex, multi-layered procedural soundscape.
 * - Combining continuous, rhythmic, and random events to create a living texture.
 * - Synthesizing a variety of mechanical and futuristic sound effects.
 */
class CybertronModule {
    constructor(audioContext) {
        this.audioContext = audioContext;
        this.id = 'cybertronModule';
        this.name = 'Cybertron Ambience';
        this.isPlaying = false;
        this.dataTimer = null;

        // --- Create Audio Nodes ---
        this.nodes = {
            input: this.audioContext.createGain(), // Unused
            output: this.audioContext.createGain(),
            
            // --- Core Hum Components ---
            coreOsc1: this.audioContext.createOscillator(),
            coreOsc2: this.audioContext.createOscillator(),
            coreGain: this.audioContext.createGain(),

            // --- Ventilation Components ---
            ventNoise: this.audioContext.createBufferSource(),
            ventFilter: this.audioContext.createBiquadFilter(),
            ventLFO: this.audioContext.createOscillator(),
            ventLFODepth: this.audioContext.createGain(),
            ventGain: this.audioContext.createGain(),
            
            // --- Servo Components ---
            servoOsc: this.audioContext.createOscillator(),
            servoLFO: this.audioContext.createOscillator(),
            servoVCA: this.audioContext.createGain(), // This is modulated by the LFO
            servoGain: this.audioContext.createGain(), // Master gain for the servo sound
        };
        
        // --- Configure Nodes ---
        this.nodes.coreOsc1.type = 'sawtooth';
        this.nodes.coreOsc1.frequency.value = 40; // Deep hum
        this.nodes.coreOsc2.type = 'sine';
        this.nodes.coreOsc2.frequency.value = 80;

        this.nodes.ventFilter.type = 'lowpass';
        this.nodes.ventFilter.Q.value = 5;
        this.nodes.ventLFO.type = 'sine';
        this.nodes.ventLFO.frequency.value = 0.1;

        this.nodes.servoOsc.type = 'sawtooth';
        this.nodes.servoOsc.frequency.value = 220;
        this.nodes.servoLFO.type = 'square'; // For a hard on/off gating effect
        this.nodes.servoLFO.frequency.value = 1.0; // 1Hz rhythm

        // Generate Brown Noise
        const bufferSize = this.audioContext.sampleRate * 5;
        const noiseBuffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const data = noiseBuffer.getChannelData(0);
        let lastOut = 0.0;
        for (let i = 0; i < bufferSize; i++) {
            lastOut = (lastOut + (0.02 * (Math.random() * 2 - 1))) / 1.02;
            data[i] = lastOut * 3.5;
        }
        this.nodes.ventNoise.buffer = noiseBuffer;
        this.nodes.ventNoise.loop = true;
        
        // --- Connect Audio Graph ---
        // Core Hum
        this.nodes.coreOsc1.connect(this.nodes.coreGain);
        this.nodes.coreOsc2.connect(this.nodes.coreGain);
        this.nodes.coreGain.connect(this.nodes.output);

        // Vents
        this.nodes.ventNoise.connect(this.nodes.ventFilter);
        this.nodes.ventLFO.connect(this.nodes.ventLFODepth).connect(this.nodes.ventFilter.frequency);
        this.nodes.ventFilter.connect(this.nodes.ventGain);
        this.nodes.ventGain.connect(this.nodes.output);
        
        // Servos
        this.nodes.servoOsc.connect(this.nodes.servoVCA);
        this.nodes.servoLFO.connect(this.nodes.servoVCA.gain); // LFO controls the gain
        this.nodes.servoVCA.connect(this.nodes.servoGain);
        this.nodes.servoGain.connect(this.nodes.output);
    }
    
    _start() {
        if (this.isPlaying) return;
        this.isPlaying = true;
        
        Object.values(this.nodes).forEach(node => node.start && node.start(0));
        
        this.updateParams();
        this._scheduleDataGlitch();
        
        this.playButton.textContent = "Deactivate";
        this.playButton.classList.add('active');
    }
    
    _stop() {
        if (!this.isPlaying) return;
        const now = this.audioContext.currentTime;
        this.nodes.output.gain.setTargetAtTime(0, now, 0.5);
        
        Object.values(this.nodes).forEach(node => node.stop && node.stop(now + 1));
        
        clearTimeout(this.dataTimer);
        this.constructor(this.audioContext); // Re-create nodes
        this.isPlaying = false;
        
        if (this.playButton) {
            this.playButton.textContent = "Activate";
            this.playButton.classList.remove('active');
        }
    }
    
    _scheduleDataGlitch() {
        if (!this.isPlaying) return;
        const randomInterval = (0.5 + Math.random() * 3) * 1000;
        this.dataTimer = setTimeout(() => {
            if (this.isPlaying) {
                this._createDataGlitch();
                this._scheduleDataGlitch();
            }
        }, randomInterval);
    }
    
    _createDataGlitch() {
        const now = this.audioContext.currentTime;
        const osc = this.audioContext.createOscillator();
        osc.type = 'square';
        osc.frequency.value = 1000 + Math.random() * 2000;
        
        const vca = this.audioContext.createGain();
        vca.gain.setValueAtTime(parseFloat(this.data.slider.value), now);
        vca.gain.exponentialRampToValueAtTime(0.001, now + (0.02 + Math.random() * 0.05));
        
        osc.connect(vca).connect(this.nodes.output);
        osc.start(now);
        osc.stop(now + 0.1);
    }

    getHTML() {
        return `
            <div class="control-row" style="margin-bottom:15px;">
                <button id="cybertronPlayBtn" class="toggle-button" style="width: 100%; height: 40px; font-size: 1.1em;">Activate</button>
            </div>
            <div class="control-row">
                <label for="cybertronCore">Core Hum:</label>
                <input type="range" id="cybertronCore" min="0" max="0.2" value="0.1" step="0.001">
                <span id="cybertronCoreVal" class="value-display">0.100</span>
            </div>
            <div class="control-row">
                <label for="cybertronVents">Vents:</label>
                <input type="range" id="cybertronVents" min="0" max="0.4" value="0.2" step="0.001">
                <span id="cybertronVentsVal" class="value-display">0.200</span>
            </div>
            <div class="control-row">
                <label for="cybertronServos">Servos:</label>
                <input type="range" id="cybertronServos" min="0" max="0.1" value="0.05" step="0.001">
                <span id="cybertronServosVal" class="value-display">0.050</span>
            </div>
            <div class="control-row">
                <label for="cybertronData">Data:</label>
                <input type="range" id="cybertronData" min="0" max="0.2" value="0.08" step="0.001">
                <span id="cybertronDataVal" class="value-display">0.080</span>
            </div>
        `;
    }

    initUI(container) {
        this.playButton = container.querySelector('#cybertronPlayBtn');
        this.core = { slider: container.querySelector('#cybertronCore'), val: container.querySelector('#cybertronCoreVal') };
        this.vents = { slider: container.querySelector('#cybertronVents'), val: container.querySelector('#cybertronVentsVal') };
        this.servos = { slider: container.querySelector('#cybertronServos'), val: container.querySelector('#cybertronServosVal') };
        this.data = { slider: container.querySelector('#cybertronData'), val: container.querySelector('#cybertronDataVal') };
        
        this.playButton.addEventListener('click', () => {
            if (this.isPlaying) this._stop(); else this._start();
        });
        
        const connect = (ctrl) => {
            ctrl.slider.addEventListener('input', () => {
                ctrl.val.textContent = parseFloat(ctrl.slider.value).toFixed(3);
                if (this.isPlaying) this.updateParams();
            });
        };
        connect(this.core);
        connect(this.vents);
        connect(this.servos);
        connect(this.data);
    }

    updateParams() {
        if (!this.isPlaying) return;
        const time = this.audioContext.currentTime;
        const smoothing = 1.0;

        this.nodes.coreGain.gain.setTargetAtTime(parseFloat(this.core.slider.value), time, smoothing);
        this.nodes.ventGain.gain.setTargetAtTime(parseFloat(this.vents.slider.value), time, smoothing);
        this.nodes.servoGain.gain.setTargetAtTime(parseFloat(this.servos.slider.value), time, smoothing);
        
        // Set base parameters for modulators
        this.nodes.ventFilter.frequency.value = 250;
        this.nodes.ventLFODepth.gain.value = 150;
        this.nodes.servoVCA.gain.value = 0.5; // Base gain for LFO to modulate around
        this.nodes.servoLFODepth.gain.value = 0.5; // LFO modulates gain from 0 to 1
    }
}

// --- This line is crucial for the main app to load the module ---
window.registerSynthModule(CybertronModule);