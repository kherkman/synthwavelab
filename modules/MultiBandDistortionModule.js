/**
 * Example Synth Module: A 3-Band Multiband Distortion.
 *
 * This module splits the audio signal into three frequency bands (low, mid, high),
 * applies separate distortion and gain to each, and then mixes them back together.
 *
 * This module demonstrates:
 * - A complex parallel processing graph using splitter and merger nodes.
 * - Using BiquadFilterNodes to create crossover filters.
 * - Independent processing for different parts of the frequency spectrum.
 */
class MultiBandDistortionModule {
    constructor(audioContext) {
        this.audioContext = audioContext;
        this.id = 'multiBandDistortionModule';
        this.name = 'Multi-Band Distortion';

        // --- Create Audio Nodes ---
        this.nodes = {
            input: this.audioContext.createGain(),
            output: this.audioContext.createGain(),
            // We use a splitter and merger, but the core processing happens in bands
            splitter: this.audioContext.createChannelSplitter(3),
            merger: this.audioContext.createChannelMerger(3),
        };
        
        this.bands = [
            { name: 'Low', nodes: {} },
            { name: 'Mid', nodes: {} },
            { name: 'High', nodes: {} },
        ];

        // --- Create Nodes for Each Band ---
        this.bands.forEach((band, i) => {
            // Filters for frequency splitting
            band.nodes.filter1 = this.audioContext.createBiquadFilter();
            // Distortion processor
            band.nodes.shaper = this.audioContext.createWaveShaper();
            // Post-distortion gain control
            band.nodes.gain = this.audioContext.createGain();

            // The Mid band needs a second filter to create a band-pass effect
            if (band.name === 'Mid') {
                band.nodes.filter2 = this.audioContext.createBiquadFilter();
            }
        });

        // --- Connect the Audio Graph ---
        this.nodes.input.connect(this.nodes.splitter);

        // Low Band Path: splitter[0] -> Lowpass Filter -> Shaper -> Gain -> merger[0]
        const low = this.bands[0];
        this.nodes.splitter.connect(low.nodes.filter1, 0);
        low.nodes.filter1.connect(low.nodes.shaper);
        low.nodes.shaper.connect(low.nodes.gain);
        low.nodes.gain.connect(this.nodes.merger, 0, 0);
        low.nodes.filter1.type = 'lowpass';

        // Mid Band Path: splitter[1] -> Highpass -> Lowpass -> Shaper -> Gain -> merger[1]
        const mid = this.bands[1];
        this.nodes.splitter.connect(mid.nodes.filter1, 1);
        mid.nodes.filter1.connect(mid.nodes.filter2);
        mid.nodes.filter2.connect(mid.nodes.shaper);
        mid.nodes.shaper.connect(mid.nodes.gain);
        mid.nodes.gain.connect(this.nodes.merger, 0, 1);
        mid.nodes.filter1.type = 'highpass';
        mid.nodes.filter2.type = 'lowpass';

        // High Band Path: splitter[2] -> Highpass Filter -> Shaper -> Gain -> merger[2]
        const high = this.bands[2];
        this.nodes.splitter.connect(high.nodes.filter1, 2);
        high.nodes.filter1.connect(high.nodes.shaper);
        high.nodes.shaper.connect(high.nodes.gain);
        high.nodes.gain.connect(this.nodes.merger, 0, 2);
        high.nodes.filter1.type = 'highpass';

        // Final connection
        this.nodes.merger.connect(this.nodes.output);
    }

    /**
     * Helper to create a distortion curve for the WaveShaperNode.
     */
    _createDistortionCurve(drive) {
        const k = drive > 0 ? drive : 1;
        const n_samples = 44100;
        const curve = new Float32Array(n_samples);
        const deg = Math.PI / 180;
        for (let i = 0; i < n_samples; ++i) {
            const x = i * 2 / n_samples - 1;
            curve[i] = (3 + k) * x * 20 * deg / (Math.PI + k * Math.abs(x));
        }
        return curve;
    }

    /**
     * Returns the HTML string for the module's controls.
     */
    getHTML() {
        let bandsHTML = '';
        this.bands.forEach(band => {
            bandsHTML += `
                <h4 style="margin-top:15px; text-align:center;">${band.name} Band</h4>
                <div class="control-row">
                    <label for="mbDist${band.name}Drive">Drive:</label>
                    <input type="range" id="mbDist${band.name}Drive" min="1" max="100" value="1" step="1">
                    <span id="mbDist${band.name}DriveVal" class="value-display">1</span>
                </div>
                 <div class="control-row">
                    <label for="mbDist${band.name}Level">Level:</label>
                    <input type="range" id="mbDist${band.name}Level" min="0" max="2" value="1" step="0.01">
                    <span id="mbDist${band.name}LevelVal" class="value-display">1.00</span>
                </div>
            `;
        });

        return `
            <h4>Crossovers</h4>
            <div class="control-row">
                <label for="mbDistLowMid">Low/Mid (Hz):</label>
                <input type="range" id="mbDistLowMid" min="100" max="1000" value="300" step="10">
                <span id="mbDistLowMidVal" class="value-display">300</span>
            </div>
            <div class="control-row">
                <label for="mbDistMidHigh">Mid/High (Hz):</label>
                <input type="range" id="mbDistMidHigh" min="1000" max="8000" value="2500" step="50">
                <span id="mbDistMidHighVal" class="value-display">2500</span>
            </div>
            ${bandsHTML}
            <h4 style="margin-top:15px; text-align:center;">Global</h4>
            <div class="control-row">
                <label for="mbDistOutputGain">Output Gain:</label>
                <input type="range" id="mbDistOutputGain" min="0" max="2" value="0.8" step="0.01">
                <span id="mbDistOutputGainVal" class="value-display">0.80</span>
            </div>
        `;
    }

    /**
     * Finds the UI elements and attaches event listeners.
     */
    initUI(container) {
        // Store references to global UI elements
        this.lowMidSlider = { slider: container.querySelector('#mbDistLowMid'), val: container.querySelector('#mbDistLowMidVal') };
        this.midHighSlider = { slider: container.querySelector('#mbDistMidHigh'), val: container.querySelector('#mbDistMidHighVal') };
        this.outputGainSlider = { slider: container.querySelector('#mbDistOutputGain'), val: container.querySelector('#mbDistOutputGainVal') };
        
        const connect = (ctrl, decimals = 0) => {
            ctrl.slider.addEventListener('input', () => {
                ctrl.val.textContent = parseFloat(ctrl.slider.value).toFixed(decimals);
                this.updateParams();
            });
        };

        connect(this.lowMidSlider);
        connect(this.midHighSlider);
        connect(this.outputGainSlider, 2);

        // Store references for each band's UI
        this.bands.forEach(band => {
            band.ui = {
                drive: { slider: container.querySelector(`#mbDist${band.name}Drive`), val: container.querySelector(`#mbDist${band.name}DriveVal`) },
                level: { slider: container.querySelector(`#mbDist${band.name}Level`), val: container.querySelector(`#mbDist${band.name}LevelVal`) }
            };
            connect(band.ui.drive);
            connect(band.ui.level, 2);
        });

        this.updateParams();
    }

    /**
     * Reads values from the controls and updates the audio node parameters.
     */
    updateParams() {
        const time = this.audioContext.currentTime;
        const smoothing = 0.02;

        const lowMidFreq = parseFloat(this.lowMidSlider.slider.value);
        const midHighFreq = parseFloat(this.midHighSlider.slider.value);
        
        // --- Update Crossover Frequencies ---
        // Low band is a low-pass filter
        this.bands[0].nodes.filter1.frequency.setTargetAtTime(lowMidFreq, time, smoothing);
        // Mid band is a high-pass followed by a low-pass
        this.bands[1].nodes.filter1.frequency.setTargetAtTime(lowMidFreq, time, smoothing);
        this.bands[1].nodes.filter2.frequency.setTargetAtTime(midHighFreq, time, smoothing);
        // High band is a high-pass filter
        this.bands[2].nodes.filter1.frequency.setTargetAtTime(midHighFreq, time, smoothing);
        
        // --- Update Band-Specific Parameters ---
        this.bands.forEach(band => {
            // Update distortion curve for the band
            const drive = parseFloat(band.ui.drive.slider.value);
            band.nodes.shaper.curve = this._createDistortionCurve(drive);
            
            // Update gain for the band
            const level = parseFloat(band.ui.level.slider.value);
            band.nodes.gain.gain.setTargetAtTime(level, time, smoothing);
        });
        
        // --- Update Master Output Gain ---
        const outputGain = parseFloat(this.outputGainSlider.slider.value);
        this.nodes.output.gain.setTargetAtTime(outputGain, time, smoothing);
    }
}

// --- This line is crucial for the main app to load the module ---
window.registerSynthModule(MultiBandDistortionModule);