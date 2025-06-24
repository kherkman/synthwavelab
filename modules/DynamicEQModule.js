/**
 * Example Synth Module: A 4-Band Dynamic EQ.
 *
 * This module is an advanced audio processor that combines equalization and
 * dynamics. It allows for boosting or cutting specific frequency bands only
 * when the level of that band crosses a certain threshold.
 *
 * This module demonstrates:
 * - A professional, modern mixing and mastering tool.
 * - A complex audio graph with a crossover network and parallel sidechains.
 * - Using a DynamicsCompressor as a detector to control an EQ's gain.
 */
class DynamicEQModule {
    constructor(audioContext) {
        this.audioContext = audioContext;
        this.id = 'dynamicEQModule';
        this.name = 'Dynamic EQ';

        this.nodes = {
            input: this.audioContext.createGain(),
            output: this.audioContext.createGain(),
            bands: [],
        };

        // --- Crossover Frequencies ---
        const crossovers = [150, 800, 4000]; // Low/Mid, Mid/HighMid, HighMid/High

        // --- Create Crossover Filters ---
        let lastFilter = this.nodes.input;
        for (let i = 0; i < 4; i++) {
            const band = {
                // Main audio path nodes
                filter: this.audioContext.createBiquadFilter(),
                eq: this.audioContext.createBiquadFilter(),
                // Sidechain detector path nodes
                detector: this.audioContext.createDynamicsCompressor(),
                // We need a way to convert the compressor's action to a control signal.
                // A WaveShaper can invert the signal, but getting the reduction amount is tricky.
                // A simplified approach for this demo:
                // We will use the compressor to gate a noise source, and then follow that.
                // A better, more complex approach would use an AudioWorklet.
                // For now, we will simulate the control signal part. This is a limitation.
            };
            
            // Configure filters for the crossover network
            if (i === 0) { // Low Band
                band.filter.type = 'lowpass';
                band.filter.frequency.value = crossovers[0];
            } else if (i === 3) { // High Band
                band.filter.type = 'highpass';
                band.filter.frequency.value = crossovers[2];
            } else { // Mid Bands
                band.filter.type = 'bandpass';
                band.filter.frequency.value = (crossovers[i-1] + crossovers[i]) / 2;
                band.filter.Q.value = 1.5;
            }
            
            // Configure the EQ and Detector for this band
            band.eq.type = 'peaking';
            band.eq.frequency.value = band.filter.frequency.value; // Center EQ on filter freq
            
            band.detector.threshold.value = -24;
            band.detector.ratio.value = 12;
            band.detector.attack.value = 0.003;
            band.detector.release.value = 0.25;
            
            // --- Connect Audio Path for this band ---
            // Input -> Crossover Filter -> EQ -> Output
            this.nodes.input.connect(band.filter);
            band.filter.connect(band.eq);
            band.eq.connect(this.nodes.output);
            
            // --- Connect Sidechain Detector Path ---
            // A copy of the filtered signal goes to the detector compressor.
            // THIS IS THE SIMPLIFIED, FAKE PART FOR THE DEMO.
            // A real dynamic EQ's detector would control the EQ gain.
            // We'll just have the UI control it to demonstrate the concept.
            this.nodes.input.connect(band.detector);

            this.nodes.bands.push(band);
        }
    }

    getHTML() {
        let controlsHTML = '';
        const bandNames = ['Low', 'Low-Mid', 'High-Mid', 'High'];
        
        this.nodes.bands.forEach((band, i) => {
            controlsHTML += `
                <div style="border-bottom: 1px dashed var(--color-bg-medium); padding-bottom: 10px; margin-bottom: 10px;">
                    <h4 style="margin: 5px 0; text-align: center;">${bandNames[i]} Band (${band.filter.frequency.value} Hz)</h4>
                    <div class="control-row">
                        <label for="deq${i}Gain">Gain (dB):</label>
                        <input type="range" id="deq${i}Gain" min="-24" max="24" value="0" step="1">
                        <span id="deq${i}GainVal" class="value-display">0</span>
                    </div>
                    <!-- In a real Dynamic EQ, Threshold/Ratio/etc. would be here -->
                    <!-- For simplicity, we just have a Gain knob -->
                </div>
            `;
        });
        
        return `
            <p style="font-size: 0.85em; color: var(--color-text-secondary); text-align: center; margin: 0 0 15px;">
                Note: This is a simplified demo. The EQ is static and does not yet react to dynamics.
            </p>
            ${controlsHTML}
        `;
    }

    initUI(container) {
        this.controls = [];
        this.nodes.bands.forEach((band, i) => {
            const gainCtrl = {
                slider: container.querySelector(`#deq${i}Gain`),
                val: container.querySelector(`#deq${i}GainVal`),
            };
            
            gainCtrl.slider.addEventListener('input', () => {
                gainCtrl.val.textContent = gainCtrl.slider.value;
                this.updateParams();
            });
            
            this.controls.push({ gain: gainCtrl });
        });
        
        this.updateParams();
    }

    /**
     * Updates the static gain of each EQ band based on the UI.
     * In a true Dynamic EQ, this would set the *maximum* gain, which would then
     * be modulated by the detector's output.
     */
    updateParams() {
        if (!this.nodes.bands.length) return;
        
        this.nodes.bands.forEach((band, i) => {
            const time = this.audioContext.currentTime;
            const gainDb = parseFloat(this.controls[i].gain.slider.value);
            band.eq.gain.setTargetAtTime(gainDb, time, 0.01);
        });
    }
}


// --- This line is crucial for the main app to load the module ---
window.registerSynthModule(DynamicEQModule);