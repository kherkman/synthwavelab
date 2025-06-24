/**
 * Example Synth Module: A Live FFT Spectrum Visualizer.
 *
 * This module is a pure visualizer that provides a detailed, real-time line graph
 * of the audio signal's frequency spectrum, using a Fast Fourier Transform (FFT).
 * It includes a logarithmic frequency scale, a decibel amplitude scale, and a
 * peak-hold display.
 *
 * This module demonstrates:
 * - A professional-grade audio analysis tool.
 * - Advanced canvas rendering for a detailed data graph.
 * - An educational tool for visualizing harmonics and the effects of filtering.
 */
class FFTAnalyzerModule {
    constructor(audioContext) {
        this.audioContext = audioContext;
        this.id = 'fftAnalyzerModule';
        this.name = 'FFT Spectrum';

        this.nodes = {
            input: this.audioContext.createGain(),
            output: this.audioContext.createGain(),
            analyser: this.audioContext.createAnalyser(),
        };

        // --- Configure the Analyser ---
        this.nodes.analyser.fftSize = 8192; // High resolution for detail
        this.nodes.analyser.smoothingTimeConstant = 0.8;
        this.frequencyData = new Uint8Array(this.nodes.analyser.frequencyBinCount);
        this.peakData = new Float32Array(this.nodes.analyser.frequencyBinCount).fill(0);
        this.peakDecay = 0.998; // How fast the peak line falls

        // --- Connect the Audio Graph ---
        this.nodes.input.connect(this.nodes.analyser);
        this.nodes.analyser.connect(this.nodes.output);

        this.isDrawing = false;
    }

    /**
     * The main drawing loop for the spectrum graph.
     * @private
     */
    _draw() {
        if (!this.isDrawing || !this.canvas) return;

        const analyser = this.nodes.analyser;
        const ctx = this.ctx;
        const width = this.canvas.width;
        const height = this.canvas.height;
        const bufferLength = analyser.frequencyBinCount;
        
        analyser.getByteFrequencyData(this.frequencyData);
        
        // --- Drawing ---
        ctx.fillStyle = 'var(--color-bg-deep)';
        ctx.fillRect(0, 0, width, height);
        
        // Draw Grid
        ctx.strokeStyle = 'var(--color-bg-medium)';
        ctx.fillStyle = 'var(--color-text-dim)';
        ctx.font = `10px var(--font-family-main)`;
        ctx.lineWidth = 1;
        const minLogFreq = Math.log(20);
        const maxLogFreq = Math.log(this.audioContext.sampleRate / 2);
        const logRange = maxLogFreq - minLogFreq;
        
        for (let i = 1; i < 10; i++) { // 20, 30, ... 90 Hz lines
             const f = (i+1)*10;
             const x = ((Math.log(f) - minLogFreq) / logRange) * width;
             ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,height); ctx.stroke();
        }
        for (let i = 1; i < 10; i++) { // 200, 300, ... 900 Hz lines
             const f = (i+1)*100;
             const x = ((Math.log(f) - minLogFreq) / logRange) * width;
             ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,height); ctx.stroke();
             if (i===4 || i===9) ctx.fillText(`${i+1}00`, x, height - 5);
        }
        for (let i = 1; i < 10; i++) { // 2k, 3k, ... 9k Hz lines
             const f = (i+1)*1000;
             const x = ((Math.log(f) - minLogFreq) / logRange) * width;
             ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,height); ctx.stroke();
             if (i===4 || i===9) ctx.fillText(`${i+1}k`, x, height - 5);
        }
        
        // Draw dB lines
        for(let db = 0; db > -60; db -= 12) {
            const y = (db / -72) * height;
            ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(width,y); ctx.stroke();
            ctx.fillText(`${db}dB`, 5, y+10);
        }

        // --- Draw Peak Hold Line ---
        ctx.strokeStyle = 'rgba(255, 255, 0, 0.4)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let i = 0; i < bufferLength; i++) {
            const freq = (i * this.audioContext.sampleRate) / analyser.fftSize;
            if (freq < 20) continue;
            
            const logX = ((Math.log(freq) - minLogFreq) / logRange);
            const x = logX * width;
            
            const dbValue = (this.frequencyData[i] / 255.0) * 72 - 72;
            if (dbValue > this.peakData[i] || this.peakData[i] < -72) {
                this.peakData[i] = dbValue;
            } else {
                this.peakData[i] *= this.peakDecay;
            }
            
            const y = (this.peakData[i] / -72) * height;
            if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();

        // --- Draw Live Spectrum Line ---
        ctx.strokeStyle = 'var(--color-neon-cyan)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let i = 0; i < bufferLength; i++) {
            const freq = (i * this.audioContext.sampleRate) / analyser.fftSize;
            if (freq < 20) continue;
            
            const logX = ((Math.log(freq) - minLogFreq) / logRange);
            const x = logX * width;
            
            const dbValue = (this.frequencyData[i] / 255.0) * 72 - 72; // Map 0-255 to -72dB-0dB
            const y = (dbValue / -72) * height; // Map -72dB-0dB to canvas height
            
            if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();

        requestAnimationFrame(() => this._draw());
    }

    getHTML() {
        return `
            <canvas id="fftCanvas" width="500" height="250" class="display-canvas" style="margin-bottom: 15px;"></canvas>
            <div class="control-row">
                <label for="fftSmoothing">Smoothing:</label>
                <input type="range" id="fftSmoothing" min="0" max="0.99" value="0.8" step="0.01">
                <span id="fftSmoothingVal" class="value-display">0.80</span>
            </div>
        `;
    }

    initUI(container) {
        this.canvas = container.querySelector('#fftCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.smoothing = { slider: container.querySelector('#fftSmoothing'), val: container.querySelector('#fftSmoothingVal') };
        
        this.smoothing.slider.addEventListener('input', () => {
            const smoothValue = parseFloat(this.smoothing.slider.value);
            this.smoothing.val.textContent = smoothValue.toFixed(2);
            this.nodes.analyser.smoothingTimeConstant = smoothValue;
        });
        
        this.isDrawing = true;
        this._draw();
    }
    
    updateParams() {}
    destroy() { this.isDrawing = false; }
}

// --- This line is crucial for the main app to load the module ---
window.registerSynthModule(FFTAnalyzerModule);