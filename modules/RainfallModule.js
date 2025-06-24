/**
 * Example Synth Module: A Rain & Thunder Soundscape Generator.
 *
 * This module procedurally generates the sound of a rainstorm, complete
 * with the sound of raindrops, a sense of density, and occasional
 * distant thunder.
 *
 * This module demonstrates:
 * - A multi-layered procedural audio soundscape.
 * - Simulating a complex natural sound using filtered noise and modulation.
 * - A "macro" control ("Intensity") that affects multiple parameters at once.
 */
class RainfallModule {
    constructor(audioContext) {
        this.audioContext = audioContext;
        this.id = 'rainfallModule';
        this.name = 'Rainfall';
        this.isPlaying = false;
        this.thunderTimer = null;

        // --- Create Audio Nodes ---
        this.nodes = {
            input: this.audioContext.createGain(), // Unused
            output: this.audioContext.createGain(),
            
            // --- Rain Components ---
            rainNoise: this.audioContext.createBufferSource(),
            rainFilter: this.audioContext.createBiquadFilter(),
            rainVCA: this.audioContext.createGain(),
            
            // LFO for the "pitter-patter" texture
            patterLFO: this.audioContext.createOscillator(),
            patterLFODepth: this.audioContext.createGain(),
        };

        // --- Configure Nodes ---
        this.nodes.rainFilter.type = 'highpass';
        this.nodes.patterLFO.type = 'sawtooth'; // A sharp sawtooth creates a nice "patter"
        
        // --- Generate White Noise ---
        const bufferSize = this.audioContext.sampleRate * 2;
        const noiseBuffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const data = noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        this.nodes.rainNoise.buffer = noiseBuffer;
        this.nodes.rainNoise.loop = true;

        // --- Connect Audio Graph ---
        // 1. Rain Path: Noise -> Filter -> VCA -> Output
        this.nodes.rainNoise.connect(this.nodes.rainFilter);
        this.nodes.rainFilter.connect(this.nodes.rainVCA);
        this.nodes.rainVCA.connect(this.nodes.output);
        
        // 2. Patter LFO modulates the rain's volume
        this.nodes.patterLFO.connect(this.nodes.patterLFODepth);
        this.nodes.patterLFODepth.connect(this.nodes.rainVCA.gain);
    }
    
    _start() {
        if (this.isPlaying) return;
        this.isPlaying = true;
        
        this.nodes.rainNoise.start(0);
        this.nodes.patterLFO.start(0);
        
        this.updateParams();
        this._scheduleThunder();
        
        this.playButton.textContent = "Stop Rain";
        this.playButton.classList.add('active');
    }
    
    _stop() {
        if (!this.isPlaying) return;
        const now = this.audioContext.currentTime;
        
        this.nodes.output.gain.setTargetAtTime(0, now, 0.5);
        this.nodes.rainNoise.stop(now + 1);
        this.nodes.patterLFO.stop(now + 1);
        
        clearTimeout(this.thunderTimer);
        this.thunderTimer = null;
        
        this.constructor(this.audioContext); // Re-create nodes for next start
        this.isPlaying = false;
        
        if (this.playButton) {
            this.playButton.textContent = "Start Rain";
            this.playButton.classList.remove('active');
        }
    }
    
    _scheduleThunder() {
        if (!this.isPlaying) return;
        const intensity = parseFloat(this.intensity.slider.value);
        // Thunder is more frequent in heavier rain
        const baseInterval = 25 - (intensity * 15);
        const randomInterval = (baseInterval + Math.random() * 20) * 1000;
        
        this.thunderTimer = setTimeout(() => {
            if (Math.random() < intensity * 1.2) { // Chance of thunder increases with intensity
                this._createThunder();
            }
            this._scheduleThunder();
        }, randomInterval);
    }
    
    _createThunder() {
        const now = this.audioContext.currentTime;
        const noise = this.audioContext.createBufferSource();
        const bufferSize = this.audioContext.sampleRate * 4;
        const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const data = buffer.getChannelData(0);
        let lastOut = 0.0;
        for(let i=0; i<bufferSize; i++) {
            const white = Math.random() * 2 - 1;
            lastOut = (lastOut + (0.08 * white)) / 1.08; // Brown noise
            data[i] = lastOut;
        }
        noise.buffer = buffer;
        
        const filter = this.audioContext.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(50, now);
        filter.frequency.exponentialRampToValueAtTime(200, now + 3.5);
        
        const gain = this.audioContext.createGain();
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.3, now + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 4);

        noise.connect(filter).connect(gain).connect(this.nodes.output);
        noise.start(now);
        noise.stop(now + 4.1);
    }

    getHTML() {
        return `
            <div class="control-row" style="margin-bottom:15px;">
                <button id="rainPlayBtn" class="toggle-button" style="width: 100%; height: 40px; font-size: 1.1em;">Start Rain</button>
            </div>
            <div class="control-row">
                <label for="rainIntensity">Intensity:</label>
                <input type="range" id="rainIntensity" min="0.1" max="1.0" value="0.5" step="0.01">
                <span id="rainIntensityVal" class="value-display">0.50</span>
            </div>
        `;
    }

    initUI(container) {
        this.playButton = container.querySelector('#rainPlayBtn');
        this.intensity = { slider: container.querySelector('#rainIntensity'), val: container.querySelector('#rainIntensityVal') };
        
        this.playButton.addEventListener('click', () => {
            if (this.isPlaying) this._stop(); else this._start();
        });
        
        this.intensity.slider.addEventListener('input', () => {
            this.intensity.val.textContent = parseFloat(this.intensity.slider.value).toFixed(2);
            if (this.isPlaying) this.updateParams();
        });
    }

    updateParams() {
        if (!this.isPlaying) return;
        
        const time = this.audioContext.currentTime;
        const smoothing = 1.0;
        
        const intensity = parseFloat(this.intensity.slider.value);
        
        // --- Map Intensity to multiple parameters ---
        
        // 1. Overall volume of the rain
        const mainGain = intensity * 0.3;
        
        // 2. Patter LFO Rate (denser patter for heavier rain)
        const patterRate = 20 + (intensity * 80);
        
        // 3. Patter LFO Depth (more dynamic volume for heavier rain)
        const patterDepth = 0.1 + (intensity * 0.4);
        const patterBaseGain = 1.0 - patterDepth;
        
        // 4. Filter cutoff (brighter sound for heavier rain)
        const filterFreq = 4000 + (intensity * 6000);
        
        // --- Apply the parameters ---
        this.nodes.rainVCA.gain.value = patterBaseGain;
        this.nodes.patterLFO.frequency.setTargetAtTime(patterRate, time, 0.2);
        this.nodes.patterLFODepth.gain.value = patterDepth;
        this.nodes.rainFilter.frequency.setTargetAtTime(filterFreq, time, smoothing);
        this.nodes.output.gain.setTargetAtTime(mainGain, time, smoothing);
    }
}

// --- This line is crucial for the main app to load the module ---
window.registerSynthModule(RainfallModule);