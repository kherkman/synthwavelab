/**
 * Example Synth Module: A "Dune" / Spice Drone & Soundscape Generator.
 *
 * This module is a self-contained soundscape generator that creates the sounds
 * of the desert planet Arrakis, including the sandworm rumble, the Spice shimmer,
 * desolate winds, and distant, mysterious voices.
 *
 * This module demonstrates:
 * - A complex, multi-layered cinematic sound design project.
 * - Combining granular synthesis, procedural noise, and LFOs for rich textures.
 * - Creating an evocative and immersive sense of place with sound.
 */
class DuneDroneModule {
    constructor(audioContext) {
        this.audioContext = audioContext;
        this.id = 'duneDroneModule';
        this.name = 'Dune Spice Drone';
        this.isPlaying = false;
        
        this.shimmerTimer = null;

        // --- Create Audio Nodes ---
        this.nodes = {
            input: this.audioContext.createGain(), // Unused
            output: this.audioContext.createGain(),
            
            // --- Sandworm Rumble ---
            rumbleOsc1: this.audioContext.createOscillator(),
            rumbleOsc2: this.audioContext.createOscillator(),
            rumbleLFO: this.audioContext.createOscillator(),
            rumbleVCA: this.audioContext.createGain(), // Modulated by LFO
            rumbleGain: this.audioContext.createGain(), // Master gain
            
            // --- Desert Wind ---
            windNoise: this.audioContext.createBufferSource(),
            windFilter: this.audioContext.createBiquadFilter(),
            windGain: this.audioContext.createGain(),
            
            // --- Voices ---
            voiceNoise: this.audioContext.createBufferSource(),
            voiceFormant1: this.audioContext.createBiquadFilter(),
            voiceFormant2: this.audioContext.createBiquadFilter(),
            voiceGain: this.audioContext.createGain(),
            
            // --- Spice Shimmer ---
            shimmerGain: this.audioContext.createGain(),
        };

        // --- Configure Nodes ---
        this.nodes.rumbleOsc1.type = 'sine';
        this.nodes.rumbleOsc1.frequency.value = 25;
        this.nodes.rumbleOsc2.type = 'sine';
        this.nodes.rumbleOsc2.frequency.value = 28;
        this.nodes.rumbleLFO.type = 'sine';
        this.nodes.rumbleLFO.frequency.value = 0.5;

        this.nodes.windFilter.type = 'bandpass';
        this.nodes.windFilter.Q.value = 8;
        this.nodes.windFilter.frequency.value = 400;

        this.nodes.voiceFormant1.type = 'bandpass';
        this.nodes.voiceFormant1.Q.value = 10;
        this.nodes.voiceFormant1.frequency.value = 800;
        this.nodes.voiceFormant2.type = 'bandpass';
        this.nodes.voiceFormant2.Q.value = 10;
        this.nodes.voiceFormant2.frequency.value = 1200;
        
        // Generate Pink Noise for wind and voices
        const bufferSize = this.audioContext.sampleRate * 4;
        this.noiseBuffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const data = this.noiseBuffer.getChannelData(0);
        let lastOut = 0;
        for (let i = 0; i < bufferSize; i++) {
            lastOut = (lastOut + (0.02 * (Math.random() * 2 - 1))) / 1.02;
            data[i] = lastOut * 3.5;
        }
        this.nodes.windNoise.buffer = this.noiseBuffer;
        this.nodes.windNoise.loop = true;
        this.nodes.voiceNoise.buffer = this.noiseBuffer;
        this.nodes.voiceNoise.loop = true;
        
        // --- Connect Audio Graph ---
        // Rumble path
        this.nodes.rumbleOsc1.connect(this.nodes.rumbleVCA);
        this.nodes.rumbleOsc2.connect(this.nodes.rumbleVCA);
        this.nodes.rumbleLFO.connect(this.nodes.rumbleVCA.gain); // Tremolo effect
        this.nodes.rumbleVCA.connect(this.nodes.rumbleGain).connect(this.nodes.output);
        
        // Wind path
        this.nodes.windNoise.connect(this.nodes.windFilter).connect(this.nodes.windGain).connect(this.nodes.output);

        // Voices path
        this.nodes.voiceNoise.connect(this.nodes.voiceFormant1).connect(this.nodes.voiceGain);
        this.nodes.voiceNoise.connect(this.nodes.voiceFormant2).connect(this.nodes.voiceGain);
        this.nodes.voiceGain.connect(this.nodes.output);
    }
    
    _start() {
        if (this.isPlaying) return;
        this.isPlaying = true;
        Object.values(this.nodes).forEach(node => node.start && node.start(0));
        this.updateParams();
        this._scheduleShimmer();
        this.playButton.textContent = "Deactivate";
        this.playButton.classList.add('active');
    }
    
    _stop() {
        if (!this.isPlaying) return;
        const now = this.audioContext.currentTime;
        this.nodes.output.gain.setTargetAtTime(0, now, 1.0);
        Object.values(this.nodes).forEach(node => node.stop && node.stop(now + 1.1));
        clearTimeout(this.shimmerTimer);
        this.constructor(this.audioContext);
        this.isPlaying = false;
        if (this.playButton) {
            this.playButton.textContent = "Activate";
            this.playButton.classList.remove('active');
        }
    }
    
    _scheduleShimmer() {
        if (!this.isPlaying) return;
        const randomInterval = (0.05 + Math.random() * 0.2) * 1000; // Fast and continuous
        this.shimmerTimer = setTimeout(() => {
            if (this.isPlaying) { this._createShimmerGrain(); this._scheduleShimmer(); }
        }, randomInterval);
    }
    
    _createShimmerGrain() {
        const now = this.audioContext.currentTime;
        const gain = parseFloat(this.shimmer.slider.value);
        if (gain === 0) return;
        
        const source = this.audioContext.createBufferSource();
        source.buffer = this.noiseBuffer;
        
        const vca = this.audioContext.createGain();
        vca.gain.setValueAtTime(0, now);
        vca.gain.linearRampToValueAtTime(gain * 0.5, now + 0.1);
        vca.gain.setTargetAtTime(0, now + 0.1, 1.5); // Long decay

        const panner = this.audioContext.createStereoPanner();
        panner.pan.value = Math.random() * 2 - 1;

        const filter = this.audioContext.createBiquadFilter();
        filter.type = 'bandpass';
        // Pitch the grain to a high consonant interval
        const intervals = [12, 19, 24]; // Octave, Fifth above, Two Octaves
        const semitones = intervals[Math.floor(Math.random() * intervals.length)];
        filter.frequency.value = 440 * Math.pow(2, semitones / 12);
        filter.Q.value = 50;

        source.connect(filter).connect(panner).connect(vca).connect(this.nodes.output);
        source.start(now, Math.random(), 0.1); // Play a tiny random snippet of noise
    }

    getHTML() {
        return `
            <div class="control-row" style="margin-bottom:15px;">
                <button id="dunePlayBtn" class="toggle-button" style="width: 100%; height: 40px; font-size: 1.1em;">Activate</button>
            </div>
            <div class="control-row">
                <label for="duneRumble">Rumble:</label>
                <input type="range" id="duneRumble" min="0" max="0.5" value="0.2" step="0.01">
                <span id="duneRumbleVal" class="value-display">0.20</span>
            </div>
            <div class="control-row">
                <label for="duneWind">Wind:</label>
                <input type="range" id="duneWind" min="0" max="0.2" value="0.05" step="0.001">
                <span id="duneWindVal" class="value-display">0.050</span>
            </div>
            <div class="control-row">
                <label for="duneShimmer">Shimmer (Spice):</label>
                <input type="range" id="duneShimmer" min="0" max="0.3" value="0.1" step="0.01">
                <span id="duneShimmerVal" class="value-display">0.10</span>
            </div>
            <div class="control-row">
                <label for="duneVoices">Voices:</label>
                <input type="range" id="duneVoices" min="0" max="0.15" value="0.0" step="0.001">
                <span id="duneVoicesVal" class="value-display">0.000</span>
            </div>
        `;
    }

    initUI(container) {
        this.playButton = container.querySelector('#dunePlayBtn');
        this.rumble = { slider: container.querySelector('#duneRumble'), val: container.querySelector('#duneRumbleVal') };
        this.wind = { slider: container.querySelector('#duneWind'), val: container.querySelector('#duneWindVal') };
        this.shimmer = { slider: container.querySelector('#duneShimmer'), val: container.querySelector('#duneShimmerVal') };
        this.voices = { slider: container.querySelector('#duneVoices'), val: container.querySelector('#duneVoicesVal') };
        
        this.playButton.addEventListener('click', () => {
            if (this.isPlaying) this._stop(); else this._start();
        });
        
        const connect = (ctrl, decimals = 2) => {
            ctrl.slider.addEventListener('input', () => {
                ctrl.val.textContent = parseFloat(ctrl.slider.value).toFixed(decimals);
                if (this.isPlaying) this.updateParams();
            });
        };
        connect(this.rumble);
        connect(this.wind, 3);
        connect(this.shimmer);
        connect(this.voices, 3);
    }

    updateParams() {
        if (!this.isPlaying) return;
        const time = this.audioContext.currentTime;
        const smoothing = 2.0;

        this.nodes.rumbleGain.gain.setTargetAtTime(parseFloat(this.rumble.slider.value), time, smoothing);
        this.nodes.windGain.gain.setTargetAtTime(parseFloat(this.wind.slider.value), time, smoothing);
        this.nodes.voiceGain.gain.setTargetAtTime(parseFloat(this.voices.slider.value), time, smoothing);
        // Shimmer gain is read live when a grain is created.
    }
}

// --- This line is crucial for the main app to load the module ---
window.registerSynthModule(DuneDroneModule);