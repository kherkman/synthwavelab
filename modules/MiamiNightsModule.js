/**
 * Example Synth Module: A Miami Nights Ambience Generator.
 *
 * This module is a self-contained soundscape generator that creates the
 * atmospheric sound of a humid Miami night, complete with ocean waves,
 * a distant neon hum, and the occasional rumble of thunder.
 *
 * This module demonstrates:
 * - A procedural audio "world-building" tool.
 * - Using noise, LFOs, and randomization to create a non-repetitive soundscape.
 * - Layering multiple synthesized sounds to create a complex, evocative atmosphere.
 */
class MiamiNightsModule {
    constructor(audioContext) {
        this.audioContext = audioContext;
        this.id = 'miamiNightsModule';
        this.name = 'Miami Nights';
        this.isPlaying = false;
        this.thunderTimer = null;

        // --- Create Audio Nodes ---
        this.nodes = {
            input: this.audioContext.createGain(), // Unused
            output: this.audioContext.createGain(),
            
            // --- Ocean Waves Components ---
            waveNoise: this.audioContext.createBufferSource(),
            waveFilter: this.audioContext.createBiquadFilter(),
            waveLFO: this.audioContext.createOscillator(),
            waveLFODepth: this.audioContext.createGain(),
            waveGain: this.audioContext.createGain(),
            
            // --- Neon Hum Components ---
            hum60: this.audioContext.createOscillator(),
            hum120: this.audioContext.createOscillator(),
            humGain: this.audioContext.createGain(),
        };

        // --- Configure Nodes ---
        this.nodes.waveFilter.type = 'lowpass';
        this.nodes.waveFilter.Q.value = 2;
        this.nodes.waveLFO.type = 'sine';
        this.nodes.waveLFO.frequency.value = 0.15; // Very slow LFO for wave motion

        this.nodes.hum60.type = 'sine';
        this.nodes.hum60.frequency.value = 60;
        this.nodes.hum120.type = 'sine';
        this.nodes.hum120.frequency.value = 120;
        
        // --- Generate Noise Buffer (Brown Noise) ---
        const bufferSize = this.audioContext.sampleRate * 5;
        const noiseBuffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const data = noiseBuffer.getChannelData(0);
        let lastOut = 0.0;
        for (let i = 0; i < bufferSize; i++) {
            const white = Math.random() * 2 - 1;
            data[i] = (lastOut + (0.02 * white)) / 1.02;
            lastOut = data[i];
            data[i] *= 3.5;
        }
        this.nodes.waveNoise.buffer = noiseBuffer;
        this.nodes.waveNoise.loop = true;

        // --- Connect Audio Graph ---
        // Wave Path: Noise -> LFO-modulated Filter -> Gain -> Output
        this.nodes.waveNoise.connect(this.nodes.waveFilter);
        this.nodes.waveLFO.connect(this.nodes.waveLFODepth);
        this.nodes.waveLFODepth.connect(this.nodes.waveFilter.frequency);
        this.nodes.waveFilter.connect(this.nodes.waveGain);
        this.nodes.waveGain.connect(this.nodes.output);
        
        // Hum Path: Oscillators -> Gain -> Output
        this.nodes.hum60.connect(this.nodes.humGain);
        this.nodes.hum120.connect(this.nodes.humGain);
        this.nodes.humGain.connect(this.nodes.output);
    }
    
    _start() {
        if (this.isPlaying) return;
        this.isPlaying = true;
        
        this.nodes.waveNoise.start(0);
        this.nodes.waveLFO.start(0);
        this.nodes.hum60.start(0);
        this.nodes.hum120.start(0);
        
        this.updateParams();
        this._scheduleThunder();
        
        this.playButton.textContent = "Stop Ambience";
        this.playButton.classList.add('active');
    }
    
    _stop() {
        if (!this.isPlaying) return;
        this.isPlaying = false;
        
        const now = this.audioContext.currentTime;
        this.nodes.waveNoise.stop(now + 1);
        this.nodes.waveLFO.stop(now + 1);
        this.nodes.hum60.stop(now + 1);
        this.nodes.hum120.stop(now + 1);
        
        clearTimeout(this.thunderTimer);
        this.thunderTimer = null;
        
        this.constructor(this.audioContext); // Re-create nodes for next start
        
        if (this.playButton) {
            this.playButton.textContent = "Start Ambience";
            this.playButton.classList.remove('active');
        }
    }
    
    _scheduleThunder() {
        if (!this.isPlaying) return;
        const randomInterval = (10 + Math.random() * 20) * 1000; // 10-30 seconds
        this.thunderTimer = setTimeout(() => {
            this._createThunder();
            this._scheduleThunder();
        }, randomInterval);
    }
    
    _createThunder() {
        const now = this.audioContext.currentTime;
        const noise = this.audioContext.createBufferSource();
        const bufferSize = this.audioContext.sampleRate * 3; // 3 second rumble
        const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const data = buffer.getChannelData(0);
        let lastOut = 0.0;
        for(let i=0; i<bufferSize; i++) {
            const white = Math.random() * 2 - 1;
            lastOut = (lastOut + (0.08 * white)) / 1.08;
            data[i] = lastOut;
        }
        noise.buffer = buffer;
        
        const filter = this.audioContext.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(40, now);
        filter.frequency.exponentialRampToValueAtTime(150, now + 2.5);
        
        const gain = this.audioContext.createGain();
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(parseFloat(this.thunder.slider.value), now + 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 3);

        noise.connect(filter).connect(gain).connect(this.nodes.output);
        noise.start(now);
        noise.stop(now + 3.1);
    }

    getHTML() {
        return `
            <div class="control-row" style="margin-bottom:15px;">
                <button id="miamiPlayBtn" class="toggle-button" style="width: 100%; height: 40px; font-size: 1.1em;">Start Ambience</button>
            </div>
            <div class="control-row">
                <label for="miamiWaves">Waves:</label>
                <input type="range" id="miamiWaves" min="0" max="0.3" value="0.15" step="0.001">
                <span id="miamiWavesVal" class="value-display">0.150</span>
            </div>
            <div class="control-row">
                <label for="miamiHum">Neon Hum:</label>
                <input type="range" id="miamiHum" min="0" max="0.05" value="0.01" step="0.001">
                <span id="miamiHumVal" class="value-display">0.010</span>
            </div>
            <div class="control-row">
                <label for="miamiThunder">Thunder:</label>
                <input type="range" id="miamiThunder" min="0" max="0.5" value="0.25" step="0.01">
                <span id="miamiThunderVal" class="value-display">0.25</span>
            </div>
        `;
    }

    initUI(container) {
        this.playButton = container.querySelector('#miamiPlayBtn');
        this.waves = { slider: container.querySelector('#miamiWaves'), val: container.querySelector('#miamiWavesVal') };
        this.hum = { slider: container.querySelector('#miamiHum'), val: container.querySelector('#miamiHumVal') };
        this.thunder = { slider: container.querySelector('#miamiThunder'), val: container.querySelector('#miamiThunderVal') };

        this.playButton.addEventListener('click', () => {
            if (this.isPlaying) this._stop(); else this._start();
        });
        
        const connect = (ctrl) => {
            ctrl.slider.addEventListener('input', () => {
                ctrl.val.textContent = parseFloat(ctrl.slider.value).toFixed(3);
                this.updateParams();
            });
        };
        connect(this.waves);
        connect(this.hum);
        connect(this.thunder);
    }

    updateParams() {
        if (!this.isPlaying) return;
        
        const time = this.audioContext.currentTime;
        const smoothing = 1.0; // Use slow smoothing for ambience
        
        const wavesLevel = parseFloat(this.waves.slider.value);
        this.nodes.waveGain.gain.setTargetAtTime(wavesLevel, time, smoothing);
        
        const humLevel = parseFloat(this.hum.slider.value);
        this.nodes.humGain.gain.setTargetAtTime(humLevel, time, smoothing);
        
        // Wave filter parameters
        this.nodes.waveFilter.frequency.value = 400; // Base cutoff for the waves
        this.nodes.waveLFODepth.gain.value = 200; // How much the LFO moves the filter
    }
}

// --- This line is crucial for the main app to load the module ---
window.registerSynthModule(MiamiNightsModule);