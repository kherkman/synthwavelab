/**
 * Example Synth Module: A 4-Band Visual Parametric EQ.
 *
 * This module provides a four-band parametric equalizer with a real-time
 * graphical display of the resulting frequency response curve.
 *
 * This module demonstrates:
 * - A complex audio graph with multiple parallel/serial filter nodes.
 * - Combining an effect with a sophisticated real-time visualization.
 * - A professional and intuitive UI for a fundamental mixing tool.
 */
class VisualEQModule {
    constructor(audioContext) {
        this.audioContext = audioContext;
        this.id = 'visualEQModule';
        this.name = 'Visual EQ';

        // --- Create Audio Nodes ---
        this.nodes = {
            input: this.audioContext.createGain(),
            output: this.audioContext.createGain(),
            // The four EQ bands in series
            low: this.audioContext.createBiquadFilter(),
            lowMid: this.audioContext.createBiquadFilter(),
            highMid: this.audioContext.createBiquadFilter(),
            high: this.audioContext.createBiquadFilter(),
            // An analyser node to calculate the frequency response for drawing
            analyser: this.audioContext.createAnalyser(),
        };

        // --- Configure Nodes ---
        this.nodes.low.type = 'lowshelf';
        this.nodes.lowMid.type = 'peaking';
        this.nodes.highMid.type = 'peaking';
        this.nodes.high.type = 'highshelf';

        this.nodes.analyser.fftSize = 2048;
        
        // --- Connect the Audio Graph ---
        // 1. The main audio path flows through the filters in series.
        this.nodes.input.connect(this.nodes.low);
        this.nodes.low.connect(this.nodes.lowMid);
        this.nodes.lowMid.connect(this.nodes.highMid);
        this.nodes.highMid.connect(this.nodes.high);
        this.nodes.high.connect(this.nodes.output);
        
        // 2. The analyser is connected in parallel to the output to measure the result.
        // It does not affect the sound.
        this.nodes.high.connect(this.nodes.analyser);
        
        this.isDrawing = false;
    }

    /**
     * The main drawing loop for the EQ curve.
     * @private
     */
    _draw() {
        if (!this.isDrawing || !this.canvas) return;

        const analyser = this.nodes.analyser;
        const ctx = this.canvas.getContext('2d');
        const width = this.canvas.width;
        const height = this.canvas.height;
        const numFreqs = width; // Draw one point per pixel of width
        
        const freqArray = new Float32Array(numFreqs);
        const magResponse = new Float32Array(numFreqs);
        const phaseResponse = new Float32Array(numFreqs);

        // We need to calculate the combined response of all filters.
        // We'll do this by getting the response of each filter and multiplying them.
        const combinedMagResponse = new Float32Array(numFreqs).fill(1);
        const filters = [this.nodes.low, this.nodes.lowMid, this.nodes.highMid, this.nodes.high];
        
        const minLogFreq = Math.log(20);
        const maxLogFreq = Math.log(this.audioContext.sampleRate / 2);
        const logRange = maxLogFreq - minLogFreq;

        for (let i = 0; i < numFreqs; i++) {
            // Logarithmic frequency scale
            freqArray[i] = Math.exp(minLogFreq + logRange * (i / numFreqs));
        }

        filters.forEach(filter => {
            filter.getFrequencyResponse(freqArray, magResponse, phaseResponse);
            for (let i = 0; i < numFreqs; i++) {
                combinedMagResponse[i] *= magResponse[i];
            }
        });

        // --- Drawing ---
        ctx.fillStyle = 'var(--color-bg-deep)';
        ctx.fillRect(0, 0, width, height);
        
        // Draw grid lines
        ctx.strokeStyle = 'var(--color-bg-medium)';
        ctx.lineWidth = 1;
        // Frequency lines (100, 1k, 10k)
        [100, 1000, 10000].forEach(freq => {
            const x = ((Math.log(freq) - minLogFreq) / logRange) * width;
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
            ctx.stroke();
        });
        // Gain lines (+12, 0, -12 dB)
        [-12, 0, 12].forEach(db => {
            const y = height / 2 - (db / 24) * (height * 0.8);
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
        });

        // Draw the EQ curve
        ctx.strokeStyle = 'var(--color-neon-yellow)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let i = 0; i < numFreqs; i++) {
            const dbResponse = 20 * Math.log10(combinedMagResponse[i]);
            const x = (i / numFreqs) * width;
            // Map dB range (-24 to +24) to canvas height
            const y = height / 2 - (dbResponse / 24) * (height * 0.8);
            
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.stroke();
        
        requestAnimationFrame(() => this._draw());
    }

    getHTML() {
        const bands = [
            { id: 'veqLow', name: 'Low Shelf', freq: 250, q: 0.71 },
            { id: 'veqLowMid', name: 'Low Mid', freq: 800, q: 1.41 },
            { id: 'veqHighMid', name: 'High Mid', freq: 2500, q: 1.41 },
            { id: 'veqHigh', name: 'High Shelf', freq: 5000, q: 0.71 },
        ];
        
        let controlsHTML = '';
        bands.forEach(band => {
            controlsHTML += `
                <div style="border-bottom: 1px dashed var(--color-bg-medium); padding-bottom: 10px; margin-bottom: 10px;">
                    <h4 style="margin: 5px 0; text-align: center;">${band.name}</h4>
                    <div class="control-row">
                        <label for="${band.id}Freq">Freq:</label>
                        <input type="range" id="${band.id}Freq" min="20" max="20000" value="${band.freq}" step="10">
                        <span id="${band.id}FreqVal" class="value-display">${band.freq}</span>
                    </div>
                    <div class="control-row">
                        <label for="${band.id}Gain">Gain:</label>
                        <input type="range" id="${band.id}Gain" min="-24" max="24" value="0" step="1">
                        <span id="${band.id}GainVal" class="value-display">0</span>
                    </div>
                    <div class="control-row">
                        <label for="${band.id}Q">Q:</label>
                        <input type="range" id="${band.id}Q" min="0.1" max="18" value="${band.q}" step="0.1">
                        <span id="${band.id}QVal" class="value-display">${band.q}</span>
                    </div>
                </div>
            `;
        });

        return `
            <canvas id="visualEQCanvas" width="500" height="250" class="display-canvas" style="margin-bottom: 15px;"></canvas>
            ${controlsHTML}
        `;
    }

    initUI(container) {
        this.canvas = container.querySelector('#visualEQCanvas');
        
        const bandIds = ['veqLow', 'veqLowMid', 'veqHighMid', 'veqHigh'];
        const filterNodes = [this.nodes.low, this.nodes.lowMid, this.nodes.highMid, this.nodes.high];
        this.controls = {};

        bandIds.forEach((id, index) => {
            const freqCtrl = { slider: container.querySelector(`#${id}Freq`), val: container.querySelector(`#${id}FreqVal`) };
            const gainCtrl = { slider: container.querySelector(`#${id}Gain`), val: container.querySelector(`#${id}GainVal`) };
            const qCtrl = { slider: container.querySelector(`#${id}Q`), val: container.querySelector(`#${id}QVal`) };
            
            this.controls[id] = { freq: freqCtrl, gain: gainCtrl, q: qCtrl, node: filterNodes[index] };

            const update = () => this.updateParams();
            
            freqCtrl.slider.addEventListener('input', () => {
                 const freq = parseFloat(freqCtrl.slider.value);
                 freqCtrl.val.textContent = freq >= 1000 ? `${(freq / 1000).toFixed(1)}k` : freq;
                 update();
            });
            gainCtrl.slider.addEventListener('input', () => { gainCtrl.val.textContent = gainCtrl.slider.value; update(); });
            qCtrl.slider.addEventListener('input', () => { qCtrl.val.textContent = parseFloat(qCtrl.slider.value).toFixed(1); update(); });
        });

        this.updateParams();
        this.isDrawing = true;
        this._draw();
    }

    updateParams() {
        if (!this.nodes.input) return;
        const time = this.audioContext.currentTime;
        const smoothing = 0.01;

        for (const bandId in this.controls) {
            const ctrl = this.controls[bandId];
            const freq = parseFloat(ctrl.freq.slider.value);
            const gain = parseFloat(ctrl.gain.slider.value);
            const q = parseFloat(ctrl.q.slider.value);
            
            ctrl.node.frequency.setTargetAtTime(freq, time, smoothing);
            ctrl.node.gain.setTargetAtTime(gain, time, smoothing);
            ctrl.node.Q.setTargetAtTime(q, time, smoothing);
        }
    }

    destroy() {
        this.isDrawing = false;
    }
}

// --- This line is crucial for the main app to load the module ---
window.registerSynthModule(VisualEQModule);