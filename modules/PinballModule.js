/**
 * Example Synth Module: A Pinball Machine Sound FX Generator.
 *
 * This module is a self-contained sound effects generator that procedurally
 * creates the classic sounds of a retro pinball machine, including bumpers,
 * flippers, and chimes.
 *
 * This module demonstrates:
 * - A procedural sound effects generator for creating non-musical sounds.
 * - Combining multiple synthesis techniques to create a variety of timbres.
 * - An interactive, performance-oriented UI based on triggering specific events.
 */
class PinballModule {
    constructor(audioContext) {
        this.audioContext = audioContext;
        this.id = 'pinballModule';
        this.name = 'Pinball FX';

        this.nodes = {
            input: this.audioContext.createGain(), // Unused
            output: this.audioContext.createGain(),
            // --- Nodes for the continuous "Ball Roll" sound ---
            rollNoise: this.audioContext.createBufferSource(),
            rollFilter: this.audioContext.createBiquadFilter(),
            rollGain: this.audioContext.createGain(),
        };
        
        // --- Configure Rolling Sound ---
        this.nodes.rollFilter.type = 'bandpass';
        this.nodes.rollFilter.frequency.value = 800;
        this.nodes.rollFilter.Q.value = 0.5;
        this.nodes.rollGain.gain.value = 0; // Starts silent
        
        // Generate noise for rolling
        const bufferSize = this.audioContext.sampleRate * 2;
        const noiseBuffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const data = noiseBuffer.getChannelData(0);
        let lastOut = 0.0;
        for (let i = 0; i < bufferSize; i++) {
            const white = Math.random() * 2 - 1;
            lastOut = (lastOut + (0.02 * white)) / 1.02;
            data[i] = lastOut;
        }
        this.nodes.rollNoise.buffer = noiseBuffer;
        this.nodes.rollNoise.loop = true;
        
        // Connect the continuous rolling sound path
        this.nodes.rollNoise.connect(this.nodes.rollFilter);
        this.nodes.rollFilter.connect(this.nodes.rollGain);
        this.nodes.rollGain.connect(this.nodes.output);
        
        this.nodes.rollNoise.start(0);
    }
    
    // --- Sound Trigger Methods ---
    
    _triggerBumper() {
        const now = this.audioContext.currentTime;
        
        // Metallic "ping"
        const osc = this.audioContext.createOscillator();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(3000, now);
        osc.frequency.exponentialRampToValueAtTime(1000, now + 0.2);
        
        // Percussive click
        const noise = this.audioContext.createBufferSource();
        const buffer = this.audioContext.createBuffer(1, this.audioContext.sampleRate * 0.1, this.audioContext.sampleRate);
        noise.buffer = buffer;
        const noiseFilter = this.audioContext.createBiquadFilter();
        noiseFilter.type = 'highpass';
        noiseFilter.frequency.value = 4000;
        noise.connect(noiseFilter);
        
        const vca = this.audioContext.createGain();
        vca.gain.setValueAtTime(0.5, now);
        vca.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        
        osc.connect(vca);
        noiseFilter.connect(vca);
        vca.connect(this.nodes.output);
        
        osc.start(now);
        noise.start(now);
        osc.stop(now + 0.2);
        noise.stop(now + 0.2);
    }
    
    _triggerFlipper() {
        const now = this.audioContext.currentTime;
        
        // Mechanical "thump"
        const thump = this.audioContext.createOscillator();
        thump.type = 'sine';
        thump.frequency.setValueAtTime(120, now);
        thump.frequency.exponentialRampToValueAtTime(40, now + 0.1);
        
        // Solenoid "click"
        const click = this.audioContext.createGain();
        click.gain.setValueAtTime(0.8, now);
        click.gain.exponentialRampToValueAtTime(0.01, now + 0.03);
        
        thump.connect(click);
        click.connect(this.nodes.output);
        thump.start(now);
        thump.stop(now + 0.1);
    }
    
    _triggerChime() {
        const now = this.audioContext.currentTime;
        // Chimes are made of inharmonic partials
        const partials = [1.0, 2.76, 5.4, 8.93]; // Ratios for a bell-like sound
        const baseFreq = 523; // C5

        partials.forEach(ratio => {
            const osc = this.audioContext.createOscillator();
            const vca = this.audioContext.createGain();
            osc.type = 'sine';
            osc.frequency.value = baseFreq * ratio;
            
            vca.gain.setValueAtTime(0.4 / partials.length, now);
            vca.gain.setTargetAtTime(0, now, 0.8); // Long, ringing decay
            
            osc.connect(vca);
            vca.connect(this.nodes.output);
            osc.start(now);
            osc.stop(now + 4);
        });
    }


    getHTML() {
        return `
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 15px;">
                <button id="pinballBumperBtn" style="height: 50px;">Bumper</button>
                <button id="pinballFlipperBtn" style="height: 50px;">Flipper</button>
            </div>
            <div class="control-row" style="margin-bottom: 15px;">
                <button id="pinballChimeBtn" style="width: 100%; height: 50px;">Chime</button>
            </div>
            <div class="control-row">
                <label for="pinballRoll" style="min-width: 80px;">Ball Roll:</label>
                <button id="pinballRoll" class="toggle-button" style="width: 80px;">OFF</button>
                <input type="range" id="pinballRollLevel" min="0" max="0.05" value="0.01" step="0.001" style="flex-grow:1; margin-left: 10px;">
                <span id="pinballRollLevelVal" class="value-display">0.010</span>
            </div>
        `;
    }

    initUI(container) {
        container.querySelector('#pinballBumperBtn').addEventListener('click', () => this._triggerBumper());
        container.querySelector('#pinballFlipperBtn').addEventListener('click', () => this._triggerFlipper());
        container.querySelector('#pinballChimeBtn').addEventListener('click', () => this._triggerChime());
        
        this.rollButton = container.querySelector('#pinballRoll');
        this.rollLevel = { slider: container.querySelector('#pinballRollLevel'), val: container.querySelector('#pinballRollLevelVal') };

        this.rollButton.addEventListener('click', () => {
            const isOn = this.rollButton.classList.toggle('active');
            this.rollButton.textContent = isOn ? 'ON' : 'OFF';
            this.updateParams();
        });
        
        this.rollLevel.slider.addEventListener('input', () => {
            this.rollLevel.val.textContent = parseFloat(this.rollLevel.slider.value).toFixed(3);
            this.updateParams();
        });
    }

    updateParams() {
        const time = this.audioContext.currentTime;
        const isOn = this.rollButton.classList.contains('active');
        const level = parseFloat(this.rollLevel.slider.value);
        
        this.nodes.rollGain.gain.setTargetAtTime(isOn ? level : 0, time, 0.1);
    }
}

// --- This line is crucial for the main app to load the module ---
window.registerSynthModule(PinballModule);