/**
 * Example Synth Module: An "Alien" Xenomorph Soundscape Generator.
 *
 * This module procedurally generates a dark, atmospheric soundscape inspired
 * by the "Alien" films, featuring dripping resin, a bio-mechanical hum,
 * random skittering sounds, and an ominous air vent drone.
 *
 * This module demonstrates:
 * - Advanced procedural sound design for creating a specific mood and environment.
 * - Using randomization of timing and pitch to create a non-repetitive texture.
 * - Layering multiple distinct synthesized elements into a cohesive whole.
 */
class AlienHiveModule {
    constructor(audioContext) {
        this.audioContext = audioContext;
        this.id = 'alienHiveModule';
        this.name = 'Xenomorph Hive';
        this.isPlaying = false;
        
        this.dripTimer = null;
        this.skitterTimer = null;

        // --- Create Audio Nodes for continuous sounds ---
        this.nodes = {
            input: this.audioContext.createGain(), // Unused
            output: this.audioContext.createGain(),
            
            // --- Bio-Mechanical Hum ---
            humOsc1: this.audioContext.createOscillator(),
            humOsc2: this.audioContext.createOscillator(),
            humLFO: this.audioContext.createOscillator(),
            humLFODepth: this.audioContext.createGain(),
            humGain: this.audioContext.createGain(),
            
            // --- Air Vent Drone ---
            ventNoise: this.audioContext.createBufferSource(),
            ventFilter: this.audioContext.createBiquadFilter(),
            ventGain: this.audioContext.createGain(),
        };

        // --- Configure Continuous Nodes ---
        this.nodes.humOsc1.type = 'sine';
        this.nodes.humOsc1.frequency.value = 35; // Deep sub
        this.nodes.humOsc2.type = 'sine';
        this.nodes.humOsc2.frequency.value = 35 * Math.pow(2, 6/12); // A tritone above
        this.nodes.humLFO.type = 'sine';
        this.nodes.humLFO.frequency.value = 0.05; // Very slow, unstable drift
        
        this.nodes.ventFilter.type = 'lowpass';
        this.nodes.ventFilter.frequency.value = 150;
        
        // Generate Pink Noise for the air vent
        const bufferSize = this.audioContext.sampleRate * 5;
        const noiseBuffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const data = noiseBuffer.getChannelData(0);
        let lastOut = 0;
        for (let i = 0; i < bufferSize; i++) {
            lastOut = (lastOut + (0.02 * (Math.random() * 2 - 1))) / 1.02;
            data[i] = lastOut * 3.5;
        }
        this.nodes.ventNoise.buffer = noiseBuffer;
        this.nodes.ventNoise.loop = true;

        // --- Connect Continuous Graphs ---
        this.nodes.humOsc1.connect(this.nodes.humGain);
        this.nodes.humOsc2.connect(this.nodes.humGain);
        this.nodes.humLFO.connect(this.nodes.humLFODepth);
        this.nodes.humLFODepth.connect(this.nodes.humOsc1.detune); // LFO modulates pitch
        this.nodes.humLFODepth.connect(this.nodes.humOsc2.detune);
        this.nodes.humGain.connect(this.nodes.output);
        
        this.nodes.ventNoise.connect(this.nodes.ventFilter).connect(this.nodes.ventGain);
        this.nodes.ventGain.connect(this.nodes.output);
    }
    
    _start() {
        if (this.isPlaying) return;
        this.isPlaying = true;
        
        Object.values(this.nodes).forEach(node => node.start && node.start(0));
        
        this.updateParams();
        this._scheduleDrip();
        this._scheduleSkitter();
        
        this.playButton.textContent = "Deactivate Hive";
        this.playButton.classList.add('active');
    }
    
    _stop() {
        if (!this.isPlaying) return;
        const now = this.audioContext.currentTime;
        this.nodes.output.gain.setTargetAtTime(0, now, 0.5);
        Object.values(this.nodes).forEach(node => node.stop && node.stop(now + 1));
        
        clearTimeout(this.dripTimer);
        clearTimeout(this.skitterTimer);
        
        this.constructor(this.audioContext); // Re-create nodes
        this.isPlaying = false;
        
        if (this.playButton) {
            this.playButton.textContent = "Activate Hive";
            this.playButton.classList.remove('active');
        }
    }
    
    _scheduleDrip() {
        if (!this.isPlaying) return;
        const randomInterval = (1 + Math.random() * 4) * 1000;
        this.dripTimer = setTimeout(() => {
            if (this.isPlaying) { this._createDrip(); this._scheduleDrip(); }
        }, randomInterval);
    }
    
    _createDrip() {
        const now = this.audioContext.currentTime;
        const click = this.audioContext.createBufferSource();
        click.buffer = this.nodes.ventNoise.buffer; // We can reuse the noise buffer
        
        const vca = this.audioContext.createGain();
        vca.gain.setValueAtTime(0.8, now);
        vca.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

        const filter = this.audioContext.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 2000 + Math.random() * 3000;
        filter.Q.value = 20;
        
        const delay = this.audioContext.createDelay(2.0);
        delay.delayTime.value = 1.0;
        const feedback = this.audioContext.createGain();
        feedback.gain.value = 0.6;
        
        const gain = parseFloat(this.drips.slider.value);
        const masterVCA = this.audioContext.createGain();
        masterVCA.gain.value = gain;
        
        click.connect(vca).connect(filter).connect(masterVCA).connect(this.nodes.output);
        filter.connect(delay);
        delay.connect(feedback).connect(delay);
        feedback.connect(masterVCA);
        
        click.start(now, Math.random(), 0.005);
    }
    
    _scheduleSkitter() {
        if (!this.isPlaying) return;
        const randomInterval = (2 + Math.random() * 8) * 1000;
        this.skitterTimer = setTimeout(() => {
            if (this.isPlaying) { this._createSkitter(); this._scheduleSkitter(); }
        }, randomInterval);
    }
    
    _createSkitter() {
        const now = this.audioContext.currentTime;
        const gain = parseFloat(this.skitters.slider.value);
        const duration = 0.05 + Math.random() * 0.1;
        
        const noise = this.audioContext.createBufferSource();
        noise.buffer = this.nodes.ventNoise.buffer;
        
        const filter = this.audioContext.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.value = 6000;
        
        const vca = this.audioContext.createGain();
        vca.gain.setValueAtTime(gain, now);
        vca.gain.exponentialRampToValueAtTime(0.001, now + duration);
        
        noise.connect(filter).connect(vca).connect(this.nodes.output);
        noise.start(now, Math.random(), duration);
    }

    getHTML() {
        return `
            <div class="control-row" style="margin-bottom:15px;">
                <button id="alienPlayBtn" class="toggle-button" style="width: 100%; height: 40px; font-size: 1.1em;">Activate Hive</button>
            </div>
            <div class="control-row">
                <label for="alienHum">Hum:</label>
                <input type="range" id="alienHum" min="0" max="0.2" value="0.08" step="0.001">
                <span id="alienHumVal" class="value-display">0.080</span>
            </div>
            <div class="control-row">
                <label for="alienVents">Vents:</label>
                <input type="range" id="alienVents" min="0" max="0.5" value="0.3" step="0.001">
                <span id="alienVentsVal" class="value-display">0.300</span>
            </div>
            <div class="control-row">
                <label for="alienDrips">Drips:</label>
                <input type="range" id="alienDrips" min="0" max="0.4" value="0.2" step="0.001">
                <span id="alienDripsVal" class="value-display">0.200</span>
            </div>
            <div class="control-row">
                <label for="alienSkitters">Skitters:</label>
                <input type="range" id="alienSkitters" min="0" max="0.5" value="0.15" step="0.001">
                <span id="alienSkittersVal" class="value-display">0.150</span>
            </div>
        `;
    }

    initUI(container) {
        this.playButton = container.querySelector('#alienPlayBtn');
        this.hum = { slider: container.querySelector('#alienHum'), val: container.querySelector('#alienHumVal') };
        this.vents = { slider: container.querySelector('#alienVents'), val: container.querySelector('#alienVentsVal') };
        this.drips = { slider: container.querySelector('#alienDrips'), val: container.querySelector('#alienDripsVal') };
        this.skitters = { slider: container.querySelector('#alienSkitters'), val: container.querySelector('#alienSkittersVal') };
        
        this.playButton.addEventListener('click', () => {
            if (this.isPlaying) this._stop(); else this._start();
        });
        
        const connect = (ctrl) => {
            ctrl.slider.addEventListener('input', () => {
                ctrl.val.textContent = parseFloat(ctrl.slider.value).toFixed(3);
                if (this.isPlaying) this.updateParams();
            });
        };
        connect(this.hum);
        connect(this.vents);
        connect(this.drips);
        connect(this.skitters);
    }

    updateParams() {
        if (!this.isPlaying) return;
        const time = this.audioContext.currentTime;
        const smoothing = 2.0; // Very slow smoothing for ambience
        
        this.nodes.humGain.gain.setTargetAtTime(parseFloat(this.hum.slider.value), time, smoothing);
        this.nodes.ventGain.gain.setTargetAtTime(parseFloat(this.vents.slider.value), time, smoothing);
        this.nodes.humLFODepth.gain.value = 5; // Cents of pitch drift
        
        // Drips and Skitters are controlled at the moment they are created.
    }
}

// --- This line is crucial for the main app to load the module ---
window.registerSynthModule(AlienHiveModule);