/**
 * Example Synth Module: A "Total Recall" Mars Atmosphere Generator.
 *
 * This module is a self-contained soundscape generator that creates the sound
 * of the vast, windy, and desolate Martian landscape from "Total Recall".
 * It combines a dual-filtered wind, a deep subsonic rumble, and random
 * swirling dust devils.
 *
 * This module demonstrates:
 * - Advanced sound design using multiple, modulated filters on a noise source.
 * - Layering continuous drones with randomized, panned events for a wide stereo image.
 * - Creating a cinematic soundscape that evokes a specific sense of place and scale.
 */
class TotalRecallModule {
    constructor(audioContext) {
        this.audioContext = audioContext;
        this.id = 'totalRecallModule';
        this.name = 'Mars Atmosphere';
        this.isPlaying = false;
        this.dustTimer = null;

        // --- Create Audio Nodes ---
        this.nodes = {
            input: this.audioContext.createGain(), // Unused
            output: this.audioContext.createGain(),
            
            // --- Wind Components ---
            windNoise: this.audioContext.createBufferSource(),
            windFilter1: this.audioContext.createBiquadFilter(),
            windFilter2: this.audioContext.createBiquadFilter(),
            windLFO1: this.audioContext.createOscillator(),
            windLFO2: this.audioContext.createOscillator(),
            windLFO1Depth: this.audioContext.createGain(),
            windLFO2Depth: this.audioContext.createGain(),
            windGain: this.audioContext.createGain(),
            
            // --- Rumble Components ---
            rumbleOsc1: this.audioContext.createOscillator(),
            rumbleOsc2: this.audioContext.createOscillator(),
            rumbleGain: this.audioContext.createGain(),
        };

        // --- Configure Nodes ---
        this.nodes.windFilter1.type = 'bandpass';
        this.nodes.windFilter1.Q.value = 15;
        this.nodes.windFilter2.type = 'bandpass';
        this.nodes.windFilter2.Q.value = 15;
        this.nodes.windLFO1.type = 'sine';
        this.nodes.windLFO1.frequency.value = 0.08; // Very slow
        this.nodes.windLFO2.type = 'sine';
        this.nodes.windLFO2.frequency.value = 0.13; // Uncorrelated rate

        this.nodes.rumbleOsc1.type = 'sine';
        this.nodes.rumbleOsc1.frequency.value = 30; // Sub-bass
        this.nodes.rumbleOsc2.type = 'sine';
        this.nodes.rumbleOsc2.frequency.value = 33; // Dissonant interval
        
        // --- Generate Pink Noise ---
        const bufferSize = this.audioContext.sampleRate * 5;
        const noiseBuffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const data = noiseBuffer.getChannelData(0);
        let b0=0, b1=0, b2=0, b3=0, b4=0, b5=0, b6=0;
        for (let i = 0; i < bufferSize; i++) {
            const white = Math.random() * 2 - 1;
            b0 = 0.99886 * b0 + white * 0.0555179; b1 = 0.99332 * b1 + white * 0.0750759; b2 = 0.96900 * b2 + white * 0.1538520; b3 = 0.86650 * b3 + white * 0.3104856; b4 = 0.55000 * b4 + white * 0.5329522; b5 = -0.7616 * b5 - white * 0.0168980; data[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362; data[i] *= 0.11; b6 = white * 0.115926;
        }
        this.nodes.windNoise.buffer = noiseBuffer;
        this.nodes.windNoise.loop = true;

        // --- Connect Audio Graph ---
        // Wind Path: Noise -> Filter 1 -> Gain -> Output
        //          -> Filter 2 -> Gain -> Output
        this.nodes.windNoise.connect(this.nodes.windFilter1);
        this.nodes.windNoise.connect(this.nodes.windFilter2);
        this.nodes.windFilter1.connect(this.nodes.windGain);
        this.nodes.windFilter2.connect(this.nodes.windGain);
        this.nodes.windGain.connect(this.nodes.output);
        
        // Wind LFOs modulate the filters
        this.nodes.windLFO1.connect(this.nodes.windLFO1Depth).connect(this.nodes.windFilter1.frequency);
        this.nodes.windLFO2.connect(this.nodes.windLFO2Depth).connect(this.nodes.windFilter2.frequency);
        
        // Rumble Path
        this.nodes.rumbleOsc1.connect(this.nodes.rumbleGain);
        this.nodes.rumbleOsc2.connect(this.nodes.rumbleGain);
        this.nodes.rumbleGain.connect(this.nodes.output);
    }
    
    _start() {
        if (this.isPlaying) return;
        this.isPlaying = true;
        Object.values(this.nodes).forEach(node => node.start && node.start(0));
        this.updateParams();
        this._scheduleDustDevil();
        this.playButton.textContent = "Deactivate";
        this.playButton.classList.add('active');
    }
    
    _stop() {
        if (!this.isPlaying) return;
        const now = this.audioContext.currentTime;
        this.nodes.output.gain.setTargetAtTime(0, now, 0.5);
        Object.values(this.nodes).forEach(node => node.stop && node.stop(now + 1));
        clearTimeout(this.dustTimer);
        this.constructor(this.audioContext);
        this.isPlaying = false;
        if (this.playButton) {
            this.playButton.textContent = "Activate";
            this.playButton.classList.remove('active');
        }
    }
    
    _scheduleDustDevil() {
        if (!this.isPlaying) return;
        const randomInterval = (4 + Math.random() * 10) * 1000;
        this.dustTimer = setTimeout(() => {
            if (this.isPlaying) { this._createDustDevil(); this._scheduleDustDevil(); }
        }, randomInterval);
    }
    
    _createDustDevil() {
        const now = this.audioContext.currentTime;
        const gain = parseFloat(this.dust.slider.value);
        const duration = 1.0 + Math.random() * 2.0;
        
        const noise = this.audioContext.createBufferSource();
        noise.buffer = this.nodes.windNoise.buffer;
        
        const filter = this.audioContext.createBiquadFilter();
        filter.type = 'bandpass';
        filter.Q.value = 5;
        filter.frequency.setValueAtTime(800, now);
        filter.frequency.linearRampToValueAtTime(3000, now + duration);
        
        const panner = this.audioContext.createStereoPanner();
        panner.pan.setValueAtTime(Math.random() > 0.5 ? -1 : 1, now);
        panner.pan.linearRampToValueAtTime(Math.random() > 0.5 ? -1 : 1, now + duration);
        
        const vca = this.audioContext.createGain();
        vca.gain.setValueAtTime(0, now);
        vca.gain.linearRampToValueAtTime(gain, now + duration * 0.5);
        vca.gain.linearRampToValueAtTime(0, now + duration);

        noise.connect(filter).connect(panner).connect(vca).connect(this.nodes.output);
        noise.start(now, Math.random(), duration);
    }

    getHTML() {
        return `
            <div class="control-row" style="margin-bottom:15px;">
                <button id="marsPlayBtn" class="toggle-button" style="width: 100%; height: 40px; font-size: 1.1em;">Activate</button>
            </div>
            <div class="control-row">
                <label for="marsWind">Wind:</label>
                <input type="range" id="marsWind" min="0" max="0.3" value="0.15" step="0.001">
                <span id="marsWindVal" class="value-display">0.150</span>
            </div>
            <div class="control-row">
                <label for="marsRumble">Rumble:</label>
                <input type="range" id="marsRumble" min="0" max="0.4" value="0.2" step="0.001">
                <span id="marsRumbleVal" class="value-display">0.200</span>
            </div>
            <div class="control-row">
                <label for="marsDust">Dust Devils:</label>
                <input type="range" id="marsDust" min="0" max="0.5" value="0.25" step="0.01">
                <span id="marsDustVal" class="value-display">0.25</span>
            </div>
        `;
    }

    initUI(container) {
        this.playButton = container.querySelector('#marsPlayBtn');
        this.wind = { slider: container.querySelector('#marsWind'), val: container.querySelector('#marsWindVal') };
        this.rumble = { slider: container.querySelector('#marsRumble'), val: container.querySelector('#marsRumbleVal') };
        this.dust = { slider: container.querySelector('#marsDust'), val: container.querySelector('#marsDustVal') };
        
        this.playButton.addEventListener('click', () => {
            if (this.isPlaying) this._stop(); else this._start();
        });
        
        const connect = (ctrl, decimals = 3) => {
            ctrl.slider.addEventListener('input', () => {
                ctrl.val.textContent = parseFloat(ctrl.slider.value).toFixed(decimals);
                if (this.isPlaying) this.updateParams();
            });
        };
        connect(this.wind);
        connect(this.rumble);
        connect(this.dust, 2);
    }

    updateParams() {
        if (!this.isPlaying) return;
        const time = this.audioContext.currentTime;
        const smoothing = 1.5;

        this.nodes.windGain.gain.setTargetAtTime(parseFloat(this.wind.slider.value), time, smoothing);
        this.nodes.rumbleGain.gain.setTargetAtTime(parseFloat(this.rumble.slider.value), time, smoothing);
        
        // Set base parameters for modulators
        this.nodes.windFilter1.frequency.value = 600;
        this.nodes.windLFO1Depth.gain.value = 400; // Sweep range
        this.nodes.windFilter2.frequency.value = 1200;
        this.nodes.windLFO2Depth.gain.value = 800;
    }
}

// --- This line is crucial for the main app to load the module ---
window.registerSynthModule(TotalRecallModule);