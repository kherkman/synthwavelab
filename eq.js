/**
 * Synthwave Lab - EQ Module (KORJATTU)
 * Sisältää 5-alueisen ekvalisaattorin ja dynaamisen visualisoinnin.
 * Toimii ilman palvelinta globaalin alustusfunktion kautta.
 */

window.initSynthLabEQ = (audioContext, ui) => {
    'use strict';

    // --- FILTTERIEN LUONTI ---
    const hpf = audioContext.createBiquadFilter();
    const lowShelf = audioContext.createBiquadFilter();
    const peaking = audioContext.createBiquadFilter();
    const highShelf = audioContext.createBiquadFilter();
    const lpf = audioContext.createBiquadFilter();

    // Asetetaan tyypit
    hpf.type = 'highpass';
    lowShelf.type = 'lowshelf';
    peaking.type = 'peaking';
    highShelf.type = 'highshelf';
    lpf.type = 'lowpass';

    // Kytketään suodattimet sarjaan
    hpf.connect(lowShelf);
    lowShelf.connect(peaking);
    peaking.connect(highShelf);
    highShelf.connect(lpf);

    // Luodaan "offline" solmut visualisointia varten
    const offlineFilters = {
        hpf: audioContext.createBiquadFilter(),
        lowShelf: audioContext.createBiquadFilter(),
        peaking: audioContext.createBiquadFilter(),
        highShelf: audioContext.createBiquadFilter(),
        lpf: audioContext.createBiquadFilter()
    };
    offlineFilters.hpf.type = 'highpass';
    offlineFilters.lowShelf.type = 'lowshelf';
    offlineFilters.peaking.type = 'peaking';
    offlineFilters.highShelf.type = 'highshelf';
    offlineFilters.lpf.type = 'lowpass';

    const eqEffect = {
        id: 'eq',
        active: false,
        nodes: {
            input: hpf,
            output: lpf,
            lowShelf: lowShelf,
            peaking: peaking,
            highShelf: highShelf
        },
        offlineNodes: offlineFilters,
        
        updateParams: function() {
            const time = audioContext.currentTime;
            
            // Määritellään parametrit (KORJATTU RIVI 68)
            const params = [
                { node: 'hpf', attr: 'frequency', val: parseFloat(ui.eqHpfCutoff.value) },
                { node: 'lowShelf', attr: 'frequency', val: parseFloat(ui.eqLowFreq.value) },
                { node: 'lowShelf', attr: 'gain', val: parseFloat(ui.eqLowGain.value) },
                { node: 'peaking', attr: 'frequency', val: parseFloat(ui.eqMidFreq.value) },
                { node: 'peaking', attr: 'gain', val: parseFloat(ui.eqMidGain.value) },
                { node: 'peaking', attr: 'Q', val: parseFloat(ui.eqMidQ.value) },
                { node: 'highShelf', attr: 'frequency', val: parseFloat(ui.eqHighFreq.value) },
                { node: 'highShelf', attr: 'gain', val: parseFloat(ui.eqHighGain.value) },
                { node: 'lpf', attr: 'frequency', val: parseFloat(ui.eqLpfCutoff.value) }
            ];

            params.forEach(p => {
                const liveNode = p.node === 'hpf' ? hpf : 
                                 p.node === 'lowShelf' ? lowShelf : 
                                 p.node === 'peaking' ? peaking : 
                                 p.node === 'highShelf' ? highShelf : lpf;
                
                liveNode[p.attr].setTargetAtTime(p.val, time, 0.01);
                this.offlineNodes[p.node][p.attr].value = p.val;
            });

            this.draw();
        },

        draw: function() {
            const canvas = ui.eqCanvas;
            if (!canvas) return;
            const ctx = canvas.getContext('2d');
            const width = canvas.width;
            const height = canvas.height;
            
            const numFreqs = 200;
            const freqArray = new Float32Array(numFreqs);
            const magResponse = new Float32Array(numFreqs);
            const phaseResponse = new Float32Array(numFreqs);
            const totalMagResponse = new Float32Array(numFreqs).fill(1);
            
            const minLogFreq = Math.log(20);
            const maxLogFreq = Math.log(20000);
            const logRange = maxLogFreq - minLogFreq;

            for (let i = 0; i < numFreqs; i++) {
                freqArray[i] = Math.exp(minLogFreq + logRange * i / (numFreqs - 1));
            }

            Object.values(this.offlineNodes).forEach(filter => {
                filter.getFrequencyResponse(freqArray, magResponse, phaseResponse);
                for (let i = 0; i < numFreqs; i++) {
                    totalMagResponse[i] *= magResponse[i];
                }
            });

            const styles = getComputedStyle(document.documentElement);
            ctx.fillStyle = styles.getPropertyValue('--color-bg-container-opaque').trim();
            ctx.fillRect(0, 0, width, height);

            ctx.strokeStyle = styles.getPropertyValue('--color-bg-medium').trim();
            ctx.fillStyle = styles.getPropertyValue('--color-text-dim').trim();
            ctx.font = '10px monospace';
            ctx.textAlign = 'center';

            [100, 1000, 10000].forEach(freq => {
                const x = (Math.log(freq) - minLogFreq) / logRange * width;
                ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke();
                const label = freq < 1000 ? freq : (freq / 1000) + 'k';
                ctx.fillText(label, x, height - 5);
            });

            const minDb = -24, maxDb = 24;
            [-12, 0, 12].forEach(db => {
                const y = height - ((db - minDb) / (maxDb - minDb)) * height;
                ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke();
                ctx.textAlign = 'left'; ctx.fillText(db + 'dB', 5, y - 2);
            });

            const neonPink = styles.getPropertyValue('--color-neon-pink').trim();
            ctx.strokeStyle = neonPink;
            ctx.lineWidth = 2;
            ctx.shadowColor = neonPink;
            ctx.shadowBlur = 5;
            ctx.beginPath();

            for (let i = 0; i < numFreqs; i++) {
                const dbResponse = 20 * Math.log10(totalMagResponse[i]);
                const x = (Math.log(freqArray[i]) - minLogFreq) / logRange * width;
                const y = height - ((dbResponse - minDb) / (maxDb - minDb)) * height;
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }

            ctx.stroke();
            ctx.shadowBlur = 0;
        }
    };

    const eqControls = [
        ui.eqHpfCutoff, ui.eqLowGain, ui.eqLowFreq, 
        ui.eqMidGain, ui.eqMidFreq, ui.eqMidQ, 
        ui.eqHighGain, ui.eqHighFreq, ui.eqLpfCutoff
    ];

    eqControls.forEach(control => {
        if (control) control.addEventListener('input', () => eqEffect.updateParams());
    });

    eqEffect.updateParams();
    return eqEffect;
};