/**
 * fx.js - Synth Lab Effects
 * 
 * Tämä tiedosto sisältää kaikki efektiobjektit ja niiden logiikan.
 * Koodi on kääritty funktioon, jotta se toimii ilman moduuleja (file://)
 * ja saa tarvittavat riippuvuudet (audioContext, ui) pääohjelmasta.
 */

window.initSynthLabEffects = function(audioContext, ui) {
    'use strict';

    // --- Helper Functions ---

    function makeDistortionCurve(preset, drive, samples = 44100) {
        const curve = new Float32Array(samples);
        let x;
        switch(preset) {
            case 'saturation': {
                const k = drive * 0.5;
                for (let i = 0; i < samples; i++) { x = i * 2 / samples - 1; curve[i] = (1 + k) * x / (1 + k * Math.abs(x)); }
                break;
            }
            case 'fuzz': {
                const k = drive * 0.1;
                for (let i = 0; i < samples; i++) { x = i * 2 / samples - 1; curve[i] = Math.tanh(x * k); }
                break;
            }
            case 'overdrive': {
                const k = drive;
                for (let i = 0; i < samples; i++) { x = i * 2 / samples - 1; if (x >= 0) { curve[i] = 1 - Math.exp(-k * x); } else { curve[i] = -(1 - Math.exp(k * x * 0.8)); } }
                break;
            }
            case 'crunch': {
                const k = Math.pow(drive, 2) / 20;
                for (let i = 0; i < samples; i++) { x = i * 2 / samples - 1; curve[i] = Math.sign(x) * (1 - Math.exp(-Math.abs(x) * k)); }
                break;
            }
            case 'bitcrush': {
                const bits = Math.max(1, 16 - Math.floor(drive / 100 * 15));
                const steps = Math.pow(2, bits);
                for (let i = 0; i < samples; i++) { x = i * 2 / samples - 1; curve[i] = Math.round(x * (steps / 2)) / (steps / 2); }
                break;
            }
            case 'tubeamp': {
                const k = drive * 0.2;
                for (let i = 0; i < samples; i++) { x = i * 2 / samples - 1; curve[i] = (x + 0.15 * x * x) / (1 + k * Math.abs(x + 0.15 * x * x)); }
                break;
            }
            default:
                for (let i = 0; i < samples; i++) { x = i * 2 / samples - 1; curve[i] = x; }
        }
        return curve;
    }

    // --- Effect Objects ---

    // EQ Effect
    const eqEffect = { 
        id: 'eq', 
        active: false, 
        nodes: {}, 
        offlineNodes: {}, 
        create: function(){ 
            this.nodes.input = audioContext.createGain(); 
            this.nodes.output = audioContext.createGain(); 
            this.nodes.hpf = audioContext.createBiquadFilter(); this.nodes.hpf.type = 'highpass'; 
            this.nodes.lowShelf = audioContext.createBiquadFilter(); this.nodes.lowShelf.type = 'lowshelf'; 
            this.nodes.peaking = audioContext.createBiquadFilter(); this.nodes.peaking.type = 'peaking'; 
            this.nodes.highShelf = audioContext.createBiquadFilter(); this.nodes.highShelf.type = 'highshelf'; 
            this.nodes.lpf = audioContext.createBiquadFilter(); this.nodes.lpf.type = 'lowpass'; 
            this.nodes.input.connect(this.nodes.hpf).connect(this.nodes.lowShelf).connect(this.nodes.peaking).connect(this.nodes.highShelf).connect(this.nodes.lpf).connect(this.nodes.output); 
            
            // Offline nodes for visualization
            this.offlineNodes.hpf = audioContext.createBiquadFilter(); this.offlineNodes.hpf.type = 'highpass'; 
            this.offlineNodes.lowShelf = audioContext.createBiquadFilter(); this.offlineNodes.lowShelf.type = 'lowshelf'; 
            this.offlineNodes.peaking = audioContext.createBiquadFilter(); this.offlineNodes.peaking.type = 'peaking'; 
            this.offlineNodes.highShelf = audioContext.createBiquadFilter(); this.offlineNodes.highShelf.type = 'highshelf'; 
            this.offlineNodes.lpf = audioContext.createBiquadFilter(); this.offlineNodes.lpf.type = 'lowpass';
        }, 
        updateParams: function() { 
            if (!this.nodes.lowShelf) return; 
            const params = { hpfCutoff: parseFloat(ui.eqHpfCutoff.value), lowGain: parseFloat(ui.eqLowGain.value), lowFreq: parseFloat(ui.eqLowFreq.value), midGain: parseFloat(ui.eqMidGain.value), midFreq: parseFloat(ui.eqMidFreq.value), midQ: parseFloat(ui.eqMidQ.value), highGain: parseFloat(ui.eqHighGain.value), highFreq: parseFloat(ui.eqHighFreq.value), lpfCutoff: parseFloat(ui.eqLpfCutoff.value), }; 
            this.nodes.hpf.frequency.setTargetAtTime(params.hpfCutoff, audioContext.currentTime, 0.01); 
            this.nodes.lowShelf.gain.setTargetAtTime(params.lowGain, audioContext.currentTime, 0.01); 
            this.nodes.lowShelf.frequency.setTargetAtTime(params.lowFreq, audioContext.currentTime, 0.01); 
            this.nodes.peaking.gain.setTargetAtTime(params.midGain, audioContext.currentTime, 0.01); 
            this.nodes.peaking.frequency.setTargetAtTime(params.midFreq, audioContext.currentTime, 0.01); 
            this.nodes.peaking.Q.setTargetAtTime(params.midQ, audioContext.currentTime, 0.01); 
            this.nodes.highShelf.gain.setTargetAtTime(params.highGain, audioContext.currentTime, 0.01); 
            this.nodes.highShelf.frequency.setTargetAtTime(params.highFreq, audioContext.currentTime, 0.01); 
            this.nodes.lpf.frequency.setTargetAtTime(params.lpfCutoff, audioContext.currentTime, 0.01); 
            
            this.offlineNodes.hpf.frequency.value = params.hpfCutoff; 
            this.offlineNodes.lowShelf.gain.value = params.lowGain; 
            this.offlineNodes.lowShelf.frequency.value = params.lowFreq; 
            this.offlineNodes.peaking.gain.value = params.midGain; 
            this.offlineNodes.peaking.frequency.value = params.midFreq; 
            this.offlineNodes.peaking.Q.value = params.midQ; 
            this.offlineNodes.highShelf.gain.value = params.highGain; 
            this.offlineNodes.highShelf.frequency.value = params.highFreq; 
            this.offlineNodes.lpf.frequency.value = params.lpfCutoff; 
            // Note: Main app needs to handle redraw of EQ curve
        } 
    };

    // Distortion Effect
    const distortionEffect = { 
        id: 'distortion', 
        active: false, 
        nodes: {}, 
        create: function() { 
            this.nodes.input = audioContext.createGain(); 
            this.nodes.output = audioContext.createGain(); 
            this.nodes.dryGain = audioContext.createGain(); 
            this.nodes.wetGain = audioContext.createGain(); 
            this.nodes.shaper = audioContext.createWaveShaper(); 
            this.nodes.toneFilter = audioContext.createBiquadFilter(); 
            this.nodes.toneFilter.type = 'lowpass'; 
            this.nodes.postGain = audioContext.createGain(); 
            this.nodes.input.connect(this.nodes.dryGain); 
            this.nodes.dryGain.connect(this.nodes.postGain); 
            this.nodes.input.connect(this.nodes.shaper); 
            this.nodes.shaper.connect(this.nodes.toneFilter); 
            this.nodes.toneFilter.connect(this.nodes.wetGain); 
            this.nodes.wetGain.connect(this.nodes.postGain); 
            this.nodes.postGain.connect(this.nodes.output); 
        }, 
        updateParams: function() { 
            if (!this.nodes.shaper) return; 
            const preset = ui.distortionPreset.value; 
            const drive = parseFloat(ui.distortionDrive.value); 
            this.nodes.shaper.curve = makeDistortionCurve(preset, drive); 
            this.nodes.shaper.oversample = '4x'; 
            this.nodes.toneFilter.frequency.setTargetAtTime(parseFloat(ui.distortionTone.value), audioContext.currentTime, 0.01); 
            const mix = parseFloat(ui.distortionMix.value); 
            this.nodes.wetGain.gain.setTargetAtTime(mix, audioContext.currentTime, 0.01); 
            this.nodes.dryGain.gain.setTargetAtTime(1 - mix, audioContext.currentTime, 0.01); 
            this.nodes.postGain.gain.setTargetAtTime(parseFloat(ui.distortionGain.value), audioContext.currentTime, 0.01); 
        } 
    };

    // Ring Modulator Effect
    const ringModEffect = { 
        id: 'ringMod', 
        active: false, 
        nodes: {}, 
        create: function() { 
            this.nodes.input = audioContext.createGain(); 
            this.nodes.output = audioContext.createGain(); 
            this.nodes.dryGain = audioContext.createGain(); 
            this.nodes.wetGain = audioContext.createGain(); 
            this.nodes.carrier = audioContext.createOscillator(); 
            this.nodes.carrier.type = 'sine'; 
            this.nodes.modulator = audioContext.createGain(); 
            this.nodes.input.connect(this.nodes.dryGain); 
            this.nodes.dryGain.connect(this.nodes.output); 
            this.nodes.input.connect(this.nodes.modulator); 
            this.nodes.carrier.connect(this.nodes.modulator.gain); 
            this.nodes.modulator.connect(this.nodes.wetGain); 
            this.nodes.wetGain.connect(this.nodes.output); 
            this.nodes.carrier.start(); 
        }, 
        updateParams: function() { 
            if (!this.nodes.carrier) return; 
            this.nodes.carrier.frequency.setTargetAtTime(parseFloat(ui.ringModFreq.value), audioContext.currentTime, 0.01); 
            const mix = parseFloat(ui.ringModMix.value); 
            this.nodes.wetGain.gain.setTargetAtTime(mix, audioContext.currentTime, 0.01); 
            this.nodes.dryGain.gain.setTargetAtTime(1 - mix, audioContext.currentTime, 0.01); 
        } 
    };

    // Fader Effect
    const faderEffect = { 
        id: 'fader', 
        active: false, 
        nodes: {}, 
        create: function() { 
            this.nodes.input = audioContext.createGain(); 
            this.nodes.output = audioContext.createGain(); 
            this.nodes.faderGain = audioContext.createGain(); 
            this.nodes.input.connect(this.nodes.faderGain); 
            this.nodes.faderGain.connect(this.nodes.output); 
        }, 
        updateParams: function() { 
            if (!this.active) { 
                this.nodes.faderGain.gain.cancelScheduledValues(audioContext.currentTime); 
                this.nodes.faderGain.gain.setTargetAtTime(1.0, audioContext.currentTime, 0.01); 
            } 
        } 
    };

    // Tremolo (Trance Gate) Effect
    const tremoloEffect = { 
        id: 'tremolo', 
        active: false, 
        nodes: {}, 
        create: function() { 
            this.nodes.input = audioContext.createGain(); 
            this.nodes.output = audioContext.createGain(); 
            this.nodes.tremoloGain = audioContext.createGain(); 
            this.nodes.input.connect(this.nodes.tremoloGain); 
            this.nodes.tremoloGain.connect(this.nodes.output); 
        }, 
        updateParams: function() { 
            if (!this.active) { 
                this.nodes.tremoloGain.gain.cancelScheduledValues(audioContext.currentTime); 
                this.nodes.tremoloGain.gain.setTargetAtTime(1.0, audioContext.currentTime, 0.01); 
            } 
        } 
    };

    // Delay 1 Effect
    const delayEffect1 = { 
        id: 'delay1', 
        active: false, 
        nodes: {}, 
        create: function() { 
            this.nodes.input = audioContext.createGain(); 
            this.nodes.output = audioContext.createGain(); 
            this.nodes.dryGain = audioContext.createGain(); 
            this.nodes.wetGain = audioContext.createGain(); 
            this.nodes.delayNode = audioContext.createDelay(2.0); 
            this.nodes.feedbackGain = audioContext.createGain(); 
            this.nodes.panner = audioContext.createStereoPanner(); 
            this.nodes.lpf = audioContext.createBiquadFilter(); 
            this.nodes.lpf.type = 'lowpass'; 
            this.nodes.hpf = audioContext.createBiquadFilter(); 
            this.nodes.hpf.type = 'highpass'; 
            this.nodes.input.connect(this.nodes.dryGain); 
            this.nodes.dryGain.connect(this.nodes.output); 
            this.nodes.input.connect(this.nodes.delayNode); 
            this.nodes.delayNode.connect(this.nodes.lpf); 
            this.nodes.lpf.connect(this.nodes.hpf); 
            this.nodes.hpf.connect(this.nodes.feedbackGain); 
            this.nodes.feedbackGain.connect(this.nodes.delayNode); 
            this.nodes.hpf.connect(this.nodes.wetGain); 
            this.nodes.wetGain.connect(this.nodes.panner); 
            this.nodes.panner.connect(this.nodes.output); 
        }, 
        updateParams: function() { 
            if (!this.nodes.delayNode) return; 
            this.nodes.delayNode.delayTime.setTargetAtTime(parseFloat(ui.delay1Time.value), audioContext.currentTime, 0.01); 
            this.nodes.feedbackGain.gain.setTargetAtTime(parseFloat(ui.delay1Feedback.value), audioContext.currentTime, 0.01); 
            this.nodes.wetGain.gain.setTargetAtTime(parseFloat(ui.delay1Mix.value), audioContext.currentTime, 0.01); 
            this.nodes.dryGain.gain.setTargetAtTime(1 - parseFloat(ui.delay1Mix.value), audioContext.currentTime, 0.01); 
            this.nodes.panner.pan.setTargetAtTime(parseFloat(ui.delay1Pan.value), audioContext.currentTime, 0.01); 
            this.nodes.lpf.frequency.setTargetAtTime(parseFloat(ui.delay1LpfCutoff.value), audioContext.currentTime, 0.01); 
            this.nodes.hpf.frequency.setTargetAtTime(parseFloat(ui.delay1HpfCutoff.value), audioContext.currentTime, 0.01); 
        } 
    };

    // Delay 2 Effect
    const delayEffect2 = { 
        id: 'delay2', 
        active: false, 
        nodes: {}, 
        create: function() { 
            this.nodes.input = audioContext.createGain(); 
            this.nodes.output = audioContext.createGain(); 
            this.nodes.dryGain = audioContext.createGain(); 
            this.nodes.wetGain = audioContext.createGain(); 
            this.nodes.delayNode = audioContext.createDelay(2.0); 
            this.nodes.feedbackGain = audioContext.createGain(); 
            this.nodes.panner = audioContext.createStereoPanner(); 
            this.nodes.lpf = audioContext.createBiquadFilter(); 
            this.nodes.lpf.type = 'lowpass'; 
            this.nodes.hpf = audioContext.createBiquadFilter(); 
            this.nodes.hpf.type = 'highpass'; 
            this.nodes.input.connect(this.nodes.dryGain); 
            this.nodes.dryGain.connect(this.nodes.output); 
            this.nodes.input.connect(this.nodes.delayNode); 
            this.nodes.delayNode.connect(this.nodes.lpf); 
            this.nodes.lpf.connect(this.nodes.hpf); 
            this.nodes.hpf.connect(this.nodes.feedbackGain); 
            this.nodes.feedbackGain.connect(this.nodes.delayNode); 
            this.nodes.hpf.connect(this.nodes.wetGain); 
            this.nodes.wetGain.connect(this.nodes.panner); 
            this.nodes.panner.connect(this.nodes.output); 
        }, 
        updateParams: function() { 
            if (!this.nodes.delayNode) return; 
            this.nodes.delayNode.delayTime.setTargetAtTime(parseFloat(ui.delay2Time.value), audioContext.currentTime, 0.01); 
            this.nodes.feedbackGain.gain.setTargetAtTime(parseFloat(ui.delay2Feedback.value), audioContext.currentTime, 0.01); 
            this.nodes.wetGain.gain.setTargetAtTime(parseFloat(ui.delay2Mix.value), audioContext.currentTime, 0.01); 
            this.nodes.dryGain.gain.setTargetAtTime(1 - parseFloat(ui.delay2Mix.value), audioContext.currentTime, 0.01); 
            this.nodes.panner.pan.setTargetAtTime(parseFloat(ui.delay2Pan.value), audioContext.currentTime, 0.01); 
            this.nodes.lpf.frequency.setTargetAtTime(parseFloat(ui.delay2LpfCutoff.value), audioContext.currentTime, 0.01); 
            this.nodes.hpf.frequency.setTargetAtTime(parseFloat(ui.delay2HpfCutoff.value), audioContext.currentTime, 0.01); 
        } 
    };

    // Chorus Effect
    const chorusEffect = { 
        id: 'chorus', 
        active: false, 
        nodes: {}, 
        create: function() { 
            this.nodes.input = audioContext.createGain(); 
            this.nodes.output = audioContext.createGain(); 
            this.nodes.delayNode = audioContext.createDelay(0.1); 
            this.nodes.dryGain = audioContext.createGain(); 
            this.nodes.wetGain = audioContext.createGain(); 
            this.nodes.lfo = audioContext.createOscillator(); 
            this.nodes.lfoGain = audioContext.createGain(); 
            this.nodes.input.connect(this.nodes.dryGain); 
            this.nodes.dryGain.connect(this.nodes.output); 
            this.nodes.input.connect(this.nodes.delayNode); 
            this.nodes.delayNode.connect(this.nodes.wetGain); 
            this.nodes.wetGain.connect(this.nodes.output); 
            this.nodes.lfo.connect(this.nodes.lfoGain); 
            this.nodes.lfoGain.connect(this.nodes.delayNode.delayTime); 
            this.nodes.lfo.type = 'sine'; 
            this.nodes.lfo.start(); 
        }, 
        updateParams: function() { 
            if (!this.nodes.delayNode) return; 
            const rate = parseFloat(ui.chorusRate.value); 
            const depthMs = parseFloat(ui.chorusDepth.value); 
            const baseDelayMs = parseFloat(ui.chorusDelay.value); 
            const mix = parseFloat(ui.chorusMix.value); 
            const depthSec = depthMs / 1000; 
            const baseDelaySec = baseDelayMs / 1000; 
            this.nodes.lfo.frequency.setTargetAtTime(rate, audioContext.currentTime, 0.01); 
            this.nodes.lfoGain.gain.setTargetAtTime(depthSec, audioContext.currentTime, 0.01); 
            this.nodes.delayNode.delayTime.value = baseDelaySec; 
            this.nodes.wetGain.gain.setTargetAtTime(mix, audioContext.currentTime, 0.01); 
            this.nodes.dryGain.gain.setTargetAtTime(1 - mix, audioContext.currentTime, 0.01); 
        }
    };

    // Flanger Effect
    const flangerEffect = { 
        id: 'flanger', 
        active: false, 
        nodes: {}, 
        create: function() { 
            this.nodes.input = audioContext.createGain(); 
            this.nodes.output = audioContext.createGain(); 
            this.nodes.delayNode = audioContext.createDelay(0.02); 
            this.nodes.dryGain = audioContext.createGain(); 
            this.nodes.wetGain = audioContext.createGain(); 
            this.nodes.feedbackGain = audioContext.createGain(); 
            this.nodes.lfo = audioContext.createOscillator(); 
            this.nodes.lfoGain = audioContext.createGain(); 
            this.nodes.input.connect(this.nodes.dryGain); 
            this.nodes.dryGain.connect(this.nodes.output); 
            this.nodes.input.connect(this.nodes.delayNode); 
            this.nodes.delayNode.connect(this.nodes.wetGain); 
            this.nodes.wetGain.connect(this.nodes.output); 
            this.nodes.delayNode.connect(this.nodes.feedbackGain); 
            this.nodes.feedbackGain.connect(this.nodes.input); 
            this.nodes.lfo.connect(this.nodes.lfoGain); 
            this.nodes.lfoGain.connect(this.nodes.delayNode.delayTime); 
            this.nodes.lfo.type = 'sine'; 
            this.nodes.lfo.start(); 
        }, 
        updateParams: function() { 
            if (!this.nodes.delayNode) return; 
            const rate = parseFloat(ui.flangerRate.value); 
            const depthMs = parseFloat(ui.flangerDepth.value); 
            const baseDelayMs = parseFloat(ui.flangerDelay.value); 
            const feedback = parseFloat(ui.flangerFeedback.value); 
            const mix = parseFloat(ui.flangerMix.value); 
            const depthSec = depthMs / 1000; 
            const baseDelaySec = baseDelayMs / 1000; 
            this.nodes.lfo.frequency.setTargetAtTime(rate, audioContext.currentTime, 0.01); 
            this.nodes.lfoGain.gain.setTargetAtTime(depthSec, audioContext.currentTime, 0.01); 
            this.nodes.delayNode.delayTime.value = baseDelaySec; 
            this.nodes.feedbackGain.gain.setTargetAtTime(feedback, audioContext.currentTime, 0.01); 
            this.nodes.wetGain.gain.setTargetAtTime(mix, audioContext.currentTime, 0.01); 
            this.nodes.dryGain.gain.setTargetAtTime(1 - mix, audioContext.currentTime, 0.01); 
        }
    };

    // Phaser Effect
    const phaserEffect = { 
        id: 'phaser', 
        active: false, 
        nodes: {}, 
        allPassFilters: [], 
        create: function() { 
            const STAGES = 4; 
            this.nodes.input = audioContext.createGain(); 
            this.nodes.output = audioContext.createGain(); 
            this.nodes.dryGain = audioContext.createGain(); 
            this.nodes.wetGain = audioContext.createGain(); 
            this.nodes.feedbackGain = audioContext.createGain(); 
            this.nodes.lfo = audioContext.createOscillator(); 
            this.nodes.lfoGain = audioContext.createGain(); 
            this.allPassFilters = []; 
            for (let i = 0; i < STAGES; i++) { 
                const filter = audioContext.createBiquadFilter(); 
                filter.type = 'allpass'; 
                filter.Q.value = 5; 
                this.allPassFilters.push(filter); 
            } 
            this.nodes.input.connect(this.nodes.dryGain); 
            this.nodes.dryGain.connect(this.nodes.output); 
            this.nodes.input.connect(this.allPassFilters[0]); 
            for (let i = 0; i < STAGES - 1; i++) { 
                this.allPassFilters[i].connect(this.allPassFilters[i + 1]); 
            } 
            this.allPassFilters[STAGES - 1].connect(this.nodes.wetGain); 
            this.nodes.wetGain.connect(this.nodes.output); 
            this.allPassFilters[STAGES - 1].connect(this.nodes.feedbackGain); 
            this.nodes.feedbackGain.connect(this.allPassFilters[0]); 
            this.nodes.lfo.connect(this.nodes.lfoGain); 
            this.allPassFilters.forEach(filter => { this.nodes.lfoGain.connect(filter.frequency); }); 
            this.nodes.lfo.type = 'sine'; 
            this.nodes.lfo.start(); 
        }, 
        updateParams: function() { 
            if (this.allPassFilters.length === 0) return; 
            const rate = parseFloat(ui.phaserRate.value); 
            const depth = parseFloat(ui.phaserDepth.value); 
            const baseFreq = parseFloat(ui.phaserBaseFreq.value); 
            const feedback = parseFloat(ui.phaserFeedback.value); 
            const mix = parseFloat(ui.phaserMix.value); 
            this.nodes.lfo.frequency.setTargetAtTime(rate, audioContext.currentTime, 0.01); 
            this.nodes.lfoGain.gain.setTargetAtTime(depth, audioContext.currentTime, 0.01); 
            this.allPassFilters.forEach(filter => { filter.frequency.value = baseFreq; }); 
            this.nodes.feedbackGain.gain.setTargetAtTime(feedback, audioContext.currentTime, 0.01); 
            this.nodes.wetGain.gain.setTargetAtTime(mix, audioContext.currentTime, 0.01); 
            this.nodes.dryGain.gain.setTargetAtTime(1 - mix, audioContext.currentTime, 0.01); 
        }
    };

    // FX Gate Effect
    const fxGateEffect = { 
        id: 'fxGate', 
        active: false, 
        nodes: {}, 
        create: function() {}, 
        updateParams: function() {}, 
        getTarget: function(dest) { 
            // Note: references to effect objects defined in the closure
            const fxMap = { 
                delay1Mix: {param: delayEffect1.nodes.wetGain.gain, baseValue: parseFloat(ui.delay1Mix.value)}, 
                delay2Mix: {param: delayEffect2.nodes.wetGain.gain, baseValue: parseFloat(ui.delay2Mix.value)}, 
                chorusMix: {param: chorusEffect.nodes.wetGain.gain, baseValue: parseFloat(ui.chorusMix.value)}, 
                flangerMix: {param: flangerEffect.nodes.wetGain.gain, baseValue: parseFloat(ui.flangerMix.value)}, 
                phaserMix: {param: phaserEffect.nodes.wetGain.gain, baseValue: parseFloat(ui.phaserMix.value)}, 
                ringModMix: {param: ringModEffect.nodes.wetGain.gain, baseValue: parseFloat(ui.ringModMix.value)}, 
                distortionMix: {param: distortionEffect.nodes.wetGain.gain, baseValue: parseFloat(ui.distortionMix.value)} 
            }; 
            return fxMap[dest] || null; 
        } 
    };

    // Return all effects as an object
    return {
        eqEffect,
        distortionEffect,
        ringModEffect,
        faderEffect,
        tremoloEffect,
        fxGateEffect,
        delayEffect1,
        delayEffect2,
        chorusEffect,
        flangerEffect,
        phaserEffect
    };
};