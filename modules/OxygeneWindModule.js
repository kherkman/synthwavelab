/**
 * Example Synth Module: An "Oxygène" Wind Synthesizer.
 *
 * This module is a self-contained soundscape generator that creates the classic,
 * sweeping "wind" sound famously used by Jean-Michel Jarre. It uses filtered
 * pink noise modulated by multiple LFOs to simulate howling, gusting wind.
 *
 * This module demonstrates:
 * - Synthesizing an iconic sound from classic electronic music.
 * - Using filtered noise as the basis for a tonal, atmospheric effect.
 * - Combining multiple, uncorrelated LFOs for complex and natural modulation.
 */
class OxygeneWindModule {
    constructor(audioContext) {
        this.audioContext = audioContext;
        this.id = 'oxygeneWindModule';
        this.name = 'Oxygène Wind';
        this.isPlaying = false;

        // --- Create Audio Nodes ---
        this.nodes = {
            input: this.audioContext.createGain(), // Unused
            output: this.audioContext.createGain(),
            
            // --- Noise Source ---
            noiseSource: this.audioContext.createBufferSource(),
            
            // --- Filter (The "Howl") ---
            bandpassFilter: this.audioContext.createBiquadFilter(),
            
            // --- LFO for Filter Sweeping ---
            filterLFO: this.audioContext.createOscillator(),
            filterLFODepth: this.audioContext.createGain(),

            // --- LFO for Volume Gusting ---
            ampLFO: this.audioContext.createOscillator(),
            ampLFODepth: this.audioContext.createGain(),
            
            // The main VCA for the gusting effect
            vca: this.audioContext.createGain(),
        };

        // --- Configure Nodes ---
        this.nodes.bandpassFilter.type = 'bandpass';
        this.nodes.filterLFO.type = 'sine';
        this.nodes.ampLFO.type = 'sine';
        
        // --- Generate Pink Noise Buffer ---
        // Pink noise has a more natural, "wind-like" quality than white noise.
        const bufferSize = this.audioContext.sampleRate * 5;
        const noiseBuffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const data = noiseBuffer.getChannelData(0);
        let b0=0, b1=0, b2=0, b3=0, b4=0, b5=0, b6=0;
        for (let i = 0; i < bufferSize; i++) {
            const white = Math.random() * 2 - 1;
            b0 = 0.99886 * b0 + white * 0.0555179;
            b1 = 0.99332 * b1 + white * 0.0750759;
            b2 = 0.96900 * b2 + white * 0.1538520;
            b3 = 0.86650 * b3 + white * 0.3104856;
            b4 = 0.55000 * b4 + white * 0.5329522;
            b5 = -0.7616 * b5 - white * 0.0168980;
            data[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
            data[i] *= 0.11; // (roughly) compensate for gain
            b6 = white * 0.115926;
        }
        this.nodes.noiseSource.buffer = noiseBuffer;
        this.nodes.noiseSource.loop = true;

        // --- Connect the Audio Graph ---
        // 1. Noise -> Filter -> VCA -> Output
        this.nodes.noiseSource.connect(this.nodes.bandpassFilter);
        this.nodes.bandpassFilter.connect(this.nodes.vca);
        this.nodes.vca.connect(this.nodes.output);
        
        // 2. Filter LFO -> Filter Frequency
        this.nodes.filterLFO.connect(this.nodes.filterLFODepth);
        this.nodes.filterLFODepth.connect(this.nodes.bandpassFilter.frequency);
        
        // 3. Amplitude LFO -> VCA Gain
        this.nodes.ampLFO.connect(this.nodes.ampLFODepth);
        this.nodes.ampLFODepth.connect(this.nodes.vca.gain);
    }
    
    _start() {
        if (this.isPlaying) return;
        this.isPlaying = true;
        
        this.nodes.noiseSource.start(0);
        this.nodes.filterLFO.start(0);
        this.nodes.ampLFO.start(0);
        
        this.updateParams();
        
        this.playButton.textContent = "Stop Wind";
        this.playButton.classList.add('active');
    }
    
    _stop() {
        if (!this.isPlaying) return;
        const now = this.audioContext.currentTime;
        
        // Fade out the main output to prevent clicks
        this.nodes.output.gain.setTargetAtTime(0, now, 0.5);
        
        this.nodes.noiseSource.stop(now + 1);
        this.nodes.filterLFO.stop(now + 1);
        this.nodes.ampLFO.stop(now + 1);
        
        this.constructor(this.audioContext); // Re-create nodes for next start
        this.isPlaying = false;
        
        if (this.playButton) {
            this.playButton.textContent = "Start Wind";
            this.playButton.classList.remove('active');
        }
    }

    getHTML() {
        return `
            <div class="control-row" style="margin-bottom:15px;">
                <button id="windPlayBtn" class="toggle-button" style="width: 100%; height: 40px; font-size: 1.1em;">Start Wind</button>
            </div>
            <div class="control-row">
                <label for="windPitch">Base Pitch (Hz):</label>
                <input type="range" id="windPitch" min="200" max="4000" value="1000" step="50">
                <span id="windPitchVal" class="value-display">1000</span>
            </div>
            <div class="control-row">
                <label for="windReso">Resonance:</label>
                <input type="range" id="windReso" min="10" max="100" value="50" step="1">
                <span id="windResoVal" class="value-display">50</span>
            </div>
            <div class="control-row">
                <label for="windSpeed">Sweep Speed:</label>
                <input type="range" id="windSpeed" min="0.05" max="1" value="0.2" step="0.01">
                <span id="windSpeedVal" class="value-display">0.20</span>
            </div>
             <div class="control-row">
                <label for="windGusts">Gust Speed:</label>
                <input type="range" id="windGusts" min="0.02" max="0.5" value="0.08" step="0.01">
                <span id="windGustsVal" class="value-display">0.08</span>
            </div>
        `;
    }

    initUI(container) {
        this.playButton = container.querySelector('#windPlayBtn');
        this.pitch = { slider: container.querySelector('#windPitch'), val: container.querySelector('#windPitchVal') };
        this.reso = { slider: container.querySelector('#windReso'), val: container.querySelector('#windResoVal') };
        this.speed = { slider: container.querySelector('#windSpeed'), val: container.querySelector('#windSpeedVal') };
        this.gusts = { slider: container.querySelector('#windGusts'), val: container.querySelector('#windGustsVal') };

        this.playButton.addEventListener('click', () => {
            if (this.isPlaying) this._stop(); else this._start();
        });
        
        const connect = (ctrl, decimals = 2) => {
            ctrl.slider.addEventListener('input', () => {
                ctrl.val.textContent = parseFloat(ctrl.slider.value).toFixed(decimals);
                if(this.isPlaying) this.updateParams();
            });
        };
        
        connect(this.pitch, 0);
        connect(this.reso, 0);
        connect(this.speed);
        connect(this.gusts);
    }

    updateParams() {
        if (!this.isPlaying) return;
        
        const time = this.audioContext.currentTime;
        const smoothing = 0.5; // Use slow smoothing for atmospheric changes
        
        const basePitch = parseFloat(this.pitch.slider.value);
        const resonance = parseFloat(this.reso.slider.value);
        const sweepSpeed = parseFloat(this.speed.slider.value);
        const gustSpeed = parseFloat(this.gusts.slider.value);
        
        // --- Set Filter Parameters ---
        // The LFO will sweep around this base frequency
        this.nodes.bandpassFilter.frequency.value = basePitch;
        this.nodes.bandpassFilter.Q.setTargetAtTime(resonance, time, smoothing);
        
        // --- Set LFO Parameters ---
        // Filter Sweep LFO
        this.nodes.filterLFO.frequency.setTargetAtTime(sweepSpeed, time, smoothing);
        this.nodes.filterLFODepth.gain.value = basePitch * 0.8; // Sweep range is relative to base pitch

        // Amplitude Gust LFO
        // We want the VCA gain to go from ~0.2 to 1.0. We set the base gain to 0.6
        // and modulate it by +/- 0.4.
        this.nodes.vca.gain.value = 0.6;
        this.nodes.ampLFO.frequency.setTargetAtTime(gustSpeed, time, smoothing);
        this.nodes.ampLFODepth.gain.value = 0.4;
    }
}

// --- This line is crucial for the main app to load the module ---
window.registerSynthModule(OxygeneWindModule);