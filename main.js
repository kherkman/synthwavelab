window.onload = () => {
    'use strict';

    // --- GLOBAL VARIABLES & CONSTANTS ---
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    
    // Alustetaan uusi äänimoottori (sine.js)
    SineEngine.init(audioContext);

    let NUM_HARMONICS = 6;
    let octaveShift = 0;
    const MAX_OCTAVE_SHIFT = 3;
    const MIN_OCTAVE_SHIFT = -3;
    const activeNotes = new Map();
    let audioContextResumedByInteraction = false;
    const noteNameToMidiNumberMap = new Map();
    let skins = [];
    let presets = [];
    let globalPitchBendCents = 0;
    let currentBgImageUrl = null;
    let whiteNoiseBuffer = null;
    let samplerPads = [];
    let assignedSamplerKeys = new Map();
    const loadedCustomModules = new Map(); 
    let drumSeq;
    let midiModule = null;


    // --- AUDIO NODES ---
    const masterGain = audioContext.createGain();
    const keysVolumeNode = audioContext.createGain();
    const kickVolumeNode = audioContext.createGain();
    const snareVolumeNode = audioContext.createGain();
    const hatVolumeNode = audioContext.createGain();
    masterGain.connect(audioContext.destination);
    kickVolumeNode.connect(masterGain);
    snareVolumeNode.connect(masterGain);
    hatVolumeNode.connect(masterGain);

    const effectsInputGate = audioContext.createGain();
    keysVolumeNode.connect(effectsInputGate);

    const sequencerVolumeNode = audioContext.createGain();
    sequencerVolumeNode.connect(keysVolumeNode);
    
    const analyserNode = audioContext.createAnalyser();
    analyserNode.fftSize = 2048;
    effectsInputGate.connect(analyserNode);

    // --- UI ELEMENTS ---
    const ui = {
        // Master Toggles
        showAllBtn: document.getElementById('showAllBtn'),
        hideAllBtn: document.getElementById('hideAllBtn'),
        // Global
        masterVolume: document.getElementById('masterVolume'), masterVolumeVal: document.getElementById('masterVolumeVal'),
        keysVolume: document.getElementById('keysVolume'), keysVolumeVal: document.getElementById('keysVolumeVal'),
        pitchBendRange: document.getElementById('pitchBendRange'), pitchBendRangeVal: document.getElementById('pitchBendRangeVal'),
        randomizeAllSettingsBtn: document.getElementById('randomizeAllSettingsBtn'),
        // Timbre
        numHarmonics: document.getElementById('numHarmonics'), applyHarmonicsBtn: document.getElementById('applyHarmonicsBtn'),
        additiveControlsContainer: document.getElementById('additive-controls'),
        freqMultInputs: [], ampInputs: [], ampValDisplays: [], phaseInputs: [], phaseValDisplays: [], harmonicCanvases: [],
        timbreSumCanvas: document.getElementById('timbreSumCanvas'),
        // Piano & Octave
        octaveUpBtn: document.getElementById('octaveUpBtn'), octaveDownBtn: document.getElementById('octaveDownBtn'),
        currentOctaveDisplay: document.getElementById('currentOctaveDisplay'), pianoKeys: document.querySelectorAll('#piano .key'),
        // Sampler
        numSamplers: document.getElementById('numSamplers'), applyNumSamplersBtn: document.getElementById('applyNumSamplersBtn'),
        samplerPadsContainer: document.getElementById('sampler-pads-container'),
        // Waveform
        waveformCanvas: document.getElementById('waveformCanvas'),
        eqCanvas: document.getElementById('eqCanvas'),
        adsrCanvas: document.getElementById('adsrCanvas'),
        signalFlowCanvas: document.getElementById('signalFlowCanvas'),
        // ADSR
        adsrAttack: document.getElementById('adsrAttack'), adsrDecay: document.getElementById('adsrDecay'),
        adsrSustain: document.getElementById('adsrSustain'), adsrRelease: document.getElementById('adsrRelease'),
        adsrVelocitySens: document.getElementById('adsrVelocitySens'),
        // Sequencer
        playStopSequencer: document.getElementById('playStopSequencer'), bpmSlider: document.getElementById('bpmSlider'), bpmVal: document.getElementById('bpmVal'),
        sequencerVolume: document.getElementById('sequencerVolume'), sequencerVolumeVal: document.getElementById('sequencerVolumeVal'),
        numStepsSelect: document.getElementById('numStepsSelect'),
        sequencerStepsContainer: document.getElementById('sequencer-steps'), clearSelectedStepBtn: document.getElementById('clearSelectedStepBtn'),
        clearAllSeqBtn: document.getElementById('clearAllSeqBtn'),
        randomizeSequencerBtn: document.getElementById('randomizeSequencerBtn'),
        // Drum Samples & Mix
        loadKickSample: document.getElementById('loadKickSample'), clearKickSampleBtn: document.getElementById('clearKickSampleBtn'), kickSampleName: document.getElementById('kickSampleName'),
        kickVolume: document.getElementById('kickVolume'), kickVolumeVal: document.getElementById('kickVolumeVal'),
        loadSnareSample: document.getElementById('loadSnareSample'), clearSnareSampleBtn: document.getElementById('clearSnareSampleBtn'), snareSampleName: document.getElementById('snareSampleName'),
        snareVolume: document.getElementById('snareVolume'), snareVolumeVal: document.getElementById('snareVolumeVal'),
        loadHatSample: document.getElementById('loadHatSample'), clearHatSampleBtn: document.getElementById('clearHatSampleBtn'), hatSampleName: document.getElementById('hatSampleName'),
        hatVolume: document.getElementById('hatVolume'), hatVolumeVal: document.getElementById('hatVolumeVal'),
        // EQ
        toggleEq: document.getElementById('toggleEq'), eqHpfCutoff: document.getElementById('eqHpfCutoff'), eqLowGain: document.getElementById('eqLowGain'), eqLowFreq: document.getElementById('eqLowFreq'),
        eqMidGain: document.getElementById('eqMidGain'), eqMidFreq: document.getElementById('eqMidFreq'), eqMidQ: document.getElementById('eqMidQ'),
        eqHighGain: document.getElementById('eqHighGain'), eqHighFreq: document.getElementById('eqHighFreq'), eqLpfCutoff: document.getElementById('eqLpfCutoff'),
        // Distortion
        toggleDistortion: document.getElementById('toggleDistortion'), distortionPreset: document.getElementById('distortionPreset'),
        distortionDrive: document.getElementById('distortionDrive'), distortionTone: document.getElementById('distortionTone'),
        distortionMix: document.getElementById('distortionMix'), distortionGain: document.getElementById('distortionGain'),
        // Ring Mod
        toggleRingMod: document.getElementById('toggleRingMod'), ringModFreq: document.getElementById('ringModFreq'), ringModMix: document.getElementById('ringModMix'),
        // Fader
        toggleFader: document.getElementById('toggleFader'), faderShape: document.getElementById('faderShape'),
        faderTime: document.getElementById('faderTime'), faderMinVolume: document.getElementById('faderMinVolume'),
        // Trance Gate
        toggleTremolo: document.getElementById('toggleTremolo'), tremoloDepth: document.getElementById('tremoloDepth'), tremoloGateLength: document.getElementById('tremoloGateLength'),
        tremoloGateStepsContainer: document.getElementById('tremolo-gate-steps'),
        // FX Gate
        toggleFxGate: document.getElementById('toggleFxGate'), fxGateDestination: document.getElementById('fxGateDestination'),
        fxGateDepth: document.getElementById('fxGateDepth'), fxGateGateLength: document.getElementById('fxGateGateLength'),
        fxGateStepsContainer: document.getElementById('fxGate-steps'),
        // LFO 1
        toggleLfo1: document.getElementById('toggleLfo1'), lfo1Rate: document.getElementById('lfo1Rate'), lfo1Depth: document.getElementById('lfo1Depth'),
        lfo1Waveform: document.getElementById('lfo1Waveform'), lfo1Destination: document.getElementById('lfo1Destination'),
        // LFO 2
        toggleLfo2: document.getElementById('toggleLfo2'), lfo2Rate: document.getElementById('lfo2Rate'), lfo2Depth: document.getElementById('lfo2Depth'),
        lfo2Waveform: document.getElementById('lfo2Waveform'), lfo2Destination: document.getElementById('lfo2Destination'),
        // Effects
        delay1Time: document.getElementById('delay1Time'), delay1Feedback: document.getElementById('delay1Feedback'), delay1Mix: document.getElementById('delay1Mix'), delay1Pan: document.getElementById('delay1Pan'), toggleDelay1: document.getElementById('toggleDelay1'),
        delay1LpfCutoff: document.getElementById('delay1LpfCutoff'), delay1HpfCutoff: document.getElementById('delay1HpfCutoff'),
        delay2Time: document.getElementById('delay2Time'), delay2Feedback: document.getElementById('delay2Feedback'), delay2Mix: document.getElementById('delay2Mix'), delay2Pan: document.getElementById('delay2Pan'), toggleDelay2: document.getElementById('toggleDelay2'),
        delay2LpfCutoff: document.getElementById('delay2LpfCutoff'), delay2HpfCutoff: document.getElementById('delay2HpfCutoff'),
        chorusRate: document.getElementById('chorusRate'), chorusDepth: document.getElementById('chorusDepth'), chorusDelay: document.getElementById('chorusDelay'), chorusMix: document.getElementById('chorusMix'), toggleChorus: document.getElementById('toggleChorus'),
        phaserRate: document.getElementById('phaserRate'), phaserDepth: document.getElementById('phaserDepth'), phaserBaseFreq: document.getElementById('phaserBaseFreq'), phaserFeedback: document.getElementById('phaserFeedback'), phaserMix: document.getElementById('phaserMix'), togglePhaser: document.getElementById('togglePhaser'),
        flangerRate: document.getElementById('flangerRate'), flangerDepth: document.getElementById('flangerDepth'), flangerDelay: document.getElementById('flangerDelay'), flangerFeedback: document.getElementById('flangerFeedback'), flangerMix: document.getElementById('flangerMix'), toggleFlanger: document.getElementById('toggleFlanger'),
        // Presets, MIDI, Files
        saveSettingsBtn: document.getElementById('saveSettingsBtn'), loadFileElement: document.getElementById('loadFile'),
        presetSelect: document.getElementById('presetSelect'),
        importPresetsBtn: document.getElementById('importPresetsBtn'),
        importPresetsFile: document.getElementById('importPresetsFile'),
        exportPresetsBtn: document.getElementById('exportPresetsBtn'),
        midiDeviceSelect: document.getElementById('midiDeviceSelect'), midiOutDeviceSelect: document.getElementById('midiOutDeviceSelect'),
        toggleMidiInBtn: document.getElementById('toggleMidiInBtn'), toggleMidiOutBtn: document.getElementById('toggleMidiOutBtn'),
        modWheelDestination: document.getElementById('modWheelDestination'),
        midiStatus: document.getElementById('midiStatus'),
        // Skins
        skinSelect: document.getElementById('skinSelect'), importSkinsBtn: document.getElementById('importSkinsBtn'),
        exportSkinsBtn: document.getElementById('exportSkinsBtn'), 
        loadBgImageBtn: document.getElementById('loadBgImageBtn'), clearBgImageBtn: document.getElementById('clearBgImageBtn'),
        bgImageFile: document.getElementById('bgImageFile'),
        uiZoom: document.getElementById('uiZoom'),
        // Module Loader
        moduleFile: document.getElementById('moduleFile'),
        knownModuleSelect: document.getElementById('knownModuleSelect'),
        loadSelectedModuleBtn: document.getElementById('loadSelectedModuleBtn'),
        updateModuleLibraryBtn: document.getElementById('updateModuleLibraryBtn'),
        moduleLoadStatus: document.getElementById('moduleLoadStatus'),
    };

    // --- INITIALIZE ADSR MODULE ---
    const adsrModule = window.initSynthLabADSR(ui);

    // --- INITIALIZE EFFECTS FROM FX.JS ---
    const { 
        distortionEffect, ringModEffect, faderEffect, 
        tremoloEffect, fxGateEffect, delayEffect1, delayEffect2, 
        chorusEffect, flangerEffect, phaserEffect 
    } = window.initSynthLabEffects(audioContext, ui);

    // --- INITIALIZE EQ MODULE ---
    const eqEffect = window.initSynthLabEQ(audioContext, ui);


    function updateSliderValueDisplay(slider, display, isFloat = false, decimals = 2) {
        if (!slider || !display) return;
        const update = () => { display.textContent = isFloat ? parseFloat(slider.value).toFixed(decimals) : slider.value; };
        slider.addEventListener('input', update);
        update();
    }
    
    function initAllValueDisplays(){
        const controls = [
            ['masterVolume', true, 2], ['keysVolume', true, 2], ['pitchBendRange', false], ['uiZoom', true, 2],
            ['kickVolume', true, 2], ['snareVolume', true, 2], ['hatVolume', true, 2],
            ['sequencerVolume', true, 2], ['bpmSlider', false],
            ['delay1Time', true, 2], ['delay1Feedback', true, 2], ['delay1Mix', true, 2], ['delay1Pan', true, 2], ['delay1LpfCutoff', false], ['delay1HpfCutoff', false],
            ['delay2Time', true, 2], ['delay2Feedback', true, 2], ['delay2Mix', true, 2], ['delay2Pan', true, 2], ['delay2LpfCutoff', false], ['delay2HpfCutoff', false],
            ['chorusRate', true, 1], ['chorusDepth', true, 1], ['chorusDelay', false], ['chorusMix', true, 2],
            ['flangerRate', true, 2], ['flangerDepth', true, 1], ['flangerDelay', true, 1], ['flangerFeedback', true, 2], ['flangerMix', true, 2],
            ['phaserRate', true, 2], ['phaserDepth', false], ['phaserBaseFreq', false], ['phaserFeedback', true, 2], ['phaserMix', true, 2],
            ['eqHpfCutoff', false], ['eqLowGain', false], ['eqLowFreq', false], ['eqMidGain', false], ['eqMidFreq', false], ['eqMidQ', true, 1], ['eqHighGain', false], ['eqHighFreq', false], ['eqLpfCutoff', false],
            ['distortionDrive', false], ['distortionTone', false], ['distortionMix', true, 2], ['distortionGain', true, 2],
            ['ringModFreq', false], ['ringModMix', true, 2],
            ['faderTime', true, 1], ['faderMinVolume', true, 2],
            ['tremoloDepth', true, 2],
            ['fxGateDepth', true, 2],
            ['lfo1Rate', true, 2], ['lfo1Depth', true, 2],
            ['lfo2Rate', true, 2], ['lfo2Depth', true, 2],
            ['adsrAttack', true, 3], ['adsrDecay', true, 3], ['adsrSustain', true, 2], ['adsrRelease', true, 3], ['adsrVelocitySens', true, 2]
        ];
        controls.forEach(([id, isFloat, decimals]) => {
            const displayId = id.endsWith('Slider') ? id.replace('Slider', 'Val') : id + 'Val';
            if (ui[id] && document.getElementById(displayId)) {
                updateSliderValueDisplay(ui[id], document.getElementById(displayId), isFloat, decimals);
            }
        });
    }

    // --- SYNTH CORE & TIMBRE ---
    let freqMultipliers = []; let amplitudes = []; let phasesRad = [];
    function updateAdditiveParams() { freqMultipliers = ui.freqMultInputs.map(input => parseFloat(input.value)); amplitudes = ui.ampInputs.map(input => parseFloat(input.value)); phasesRad = ui.phaseInputs.map(input => parseFloat(input.value) * Math.PI / 180); drawSummedWave(); }
    
    function drawHarmonicWave(canvas, amplitude, phaseRad) {
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;
        ctx.clearRect(0, 0, width, height);
        ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--color-neon-yellow').trim();
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        for (let x = 0; x <= width; x++) {
            const angle = (x / width) * 2 * Math.PI + phaseRad;
            const y = (height / 2) - (Math.sin(angle) * amplitude * (height / 2) * 0.9);
            if (x === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.stroke();
    }
    
    function drawSummedWave() {
        if (!ui.timbreSumCanvas) return;
        const canvas = ui.timbreSumCanvas;
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;
        
        ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--color-bg-container-opaque').trim();
        ctx.fillRect(0, 0, width, height);
        ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--color-neon-pink').trim();
        ctx.lineWidth = 2;
        ctx.beginPath();
        
        let maxAmp = 0;

        for (let x = 0; x <= width; x++) {
            const angleX = (x / width) * 2 * Math.PI;
            let ySum = 0;
            for (let i = 0; i < NUM_HARMONICS; i++) {
                ySum += Math.sin(angleX * (freqMultipliers[i] || 0) + (phasesRad[i] || 0)) * (amplitudes[i] || 0);
            }
            maxAmp = Math.max(maxAmp, Math.abs(ySum));
        }

        const normFactor = maxAmp > 0 ? (height / 2 * 0.95) / maxAmp : 0;

        for (let x = 0; x <= width; x++) {
            const angleX = (x / width) * 2 * Math.PI;
            let ySum = 0;
            for (let i = 0; i < NUM_HARMONICS; i++) {
                ySum += Math.sin(angleX * (freqMultipliers[i] || 0) + (phasesRad[i] || 0)) * (amplitudes[i] || 0);
            }
            const y = (height / 2) - (ySum * normFactor);
            if (x === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.stroke();
    }

    function rebuildHarmonicControls(numWaves) {
        NUM_HARMONICS = parseInt(numWaves);
        if (isNaN(NUM_HARMONICS) || NUM_HARMONICS < 1 || NUM_HARMONICS > 16) { NUM_HARMONICS = 6; ui.numHarmonics.value = 6; }
        ui.additiveControlsContainer.innerHTML = ''; 
        ui.freqMultInputs = []; ui.ampInputs = []; ui.ampValDisplays = []; ui.phaseInputs = []; ui.phaseValDisplays = []; ui.harmonicCanvases = [];
        
        for (let i = 1; i <= NUM_HARMONICS; i++) {
            const row = document.createElement('div'); row.className = 'harmonic-control-row';
            const defaultAmp = (i === 1 ? 0.7 : 1 / (i * 2.5)).toFixed(2);
            row.innerHTML = `<span class="harmonic-label">H${i}</span><label for="freqMult${i}">FreqMul:</label><input type="number" id="freqMult${i}" min="0.1" max="16" step="0.1" value="${i}"><label for="amp${i}">Amp:</label><input type="range" id="amp${i}" min="0" max="1" step="0.01" value="${defaultAmp}"><span id="amp${i}Val" class="value-display">${defaultAmp}</span><label for="phase${i}">Phase(&deg;):</label><input type="range" id="phase${i}" min="0" max="360" step="1" value="0"><span id="phase${i}Val" class="value-display">0</span><canvas id="harmonicCanvas${i}"></canvas>`;
            ui.additiveControlsContainer.appendChild(row);
            
            const freqInput = document.getElementById(`freqMult${i}`); 
            const ampInput = document.getElementById(`amp${i}`); 
            const ampVal = document.getElementById(`amp${i}Val`); 
            const phaseInput = document.getElementById(`phase${i}`); 
            const phaseVal = document.getElementById(`phase${i}Val`);
            const hCanvas = document.getElementById(`harmonicCanvas${i}`);

            ui.freqMultInputs.push(freqInput); ui.ampInputs.push(ampInput); ui.ampValDisplays.push(ampVal); 
            ui.phaseInputs.push(phaseInput); ui.phaseValDisplays.push(phaseVal); ui.harmonicCanvases.push(hCanvas);

            freqInput.addEventListener('change', updateAdditiveParams);
            updateSliderValueDisplay(ampInput, ampVal, true); 
            updateSliderValueDisplay(phaseInput, phaseVal, false);

            const drawThisWave = () => drawHarmonicWave(hCanvas, parseFloat(ampInput.value), parseFloat(phaseInput.value) * Math.PI / 180);

            ampInput.addEventListener('input', () => { updateAdditiveParams(); drawThisWave(); });
            phaseInput.addEventListener('input', () => { updateAdditiveParams(); drawThisWave(); });
            
            drawThisWave();
        }
        updateAdditiveParams();
    }
    ui.applyHarmonicsBtn.addEventListener('click', () => rebuildHarmonicControls(ui.numHarmonics.value));

    // --- NOTE PLAYBACK & PIANO CONTROLS ---
    function playNote(noteId, fundamentalFreq, velocity = 127, keyElement = null, isSequencerTriggered = false, stepVolume = 1.0, octaveOverride = null) { 
        if (!audioContextResumedByInteraction && audioContext.state === 'suspended') { audioContext.resume().then(() => { audioContextResumedByInteraction = true; actuallyPlayNote(noteId, fundamentalFreq, velocity, keyElement, isSequencerTriggered, stepVolume, octaveOverride); }); return; } 
        actuallyPlayNote(noteId, fundamentalFreq, velocity, keyElement, isSequencerTriggered, stepVolume, octaveOverride); 
    }

    function actuallyPlayNote(noteId, fundamentalFreq, velocity, keyElement, isSequencerTriggered, stepVolume, octaveOverride = null) { 
        let baseMidiNote;
        if (typeof noteId === 'number') { baseMidiNote = noteId; } else if (typeof noteId === 'string') { baseMidiNote = noteNameToMidiNumberMap.get(noteId.slice(0,-1));  if (baseMidiNote == null) baseMidiNote = noteNameToMidiNumberMap.get(noteId); }
        
        let noteOctaveShift = (octaveOverride !== null) ? octaveOverride : octaveShift;
        let finalMidiNote = baseMidiNote + (noteOctaveShift * 12);
        if (finalMidiNote < 0) finalMidiNote = 0; if (finalMidiNote > 127) finalMidiNote = 127;
        
        // Sampler override check (Pads)
        if (assignedSamplerKeys.has(finalMidiNote)) {
            const samplerIndex = assignedSamplerKeys.get(finalMidiNote);
            if (samplerPads[samplerIndex] && samplerPads[samplerIndex].buffer) {
                playSample(samplerIndex, velocity);
                if (keyElement) keyElement.classList.add('pressed'); 
                if (midiModule) midiModule.sendMidiMessage([0x90, finalMidiNote, velocity]);
                return;
            }
        }

        if (faderEffect.active && activeNotes.size === 0) {
            const time = audioContext.currentTime;
            const shape = ui.faderShape.value;
            const duration = parseFloat(ui.faderTime.value);
            const minVol = parseFloat(ui.faderMinVolume.value);
            const gainParam = faderEffect.nodes.faderGain.gain;
            gainParam.cancelScheduledValues(time);
            switch (shape) {
                case 'fadeIn': gainParam.setValueAtTime(minVol, time); gainParam.linearRampToValueAtTime(1.0, time + duration); break;
                case 'fadeOut': gainParam.setValueAtTime(1.0, time); gainParam.linearRampToValueAtTime(minVol, time + duration); break;
                case 'dip': gainParam.setValueAtTime(1.0, time); gainParam.linearRampToValueAtTime(minVol, time + duration / 2); gainParam.linearRampToValueAtTime(1.0, time + duration); break;
            }
        }

        if (midiModule) midiModule.sendMidiMessage([0x90, finalMidiNote, velocity]); 
        const uniqueNoteId = isSequencerTriggered ? `${noteId}_seq` : `${noteId}_manual`; 

        if (drumSeq && drumSeq.currentEditStepIndex !== null && keyElement && !isSequencerTriggered) { 
            const pianoKeyData = availablePianoNotes.find(n => n.baseNoteName === noteId); 
            if (pianoKeyData) { 
                drumSeq.sequencerPattern[drumSeq.currentEditStepIndex].baseNoteName = pianoKeyData.baseNoteName; 
                drumSeq.sequencerPattern[drumSeq.currentEditStepIndex].baseFreq = pianoKeyData.baseFreq; 
                drumSeq.sequencerPattern[drumSeq.currentEditStepIndex].octaveShift = octaveShift; 
                drumSeq.sequencerPattern[drumSeq.currentEditStepIndex].noteLabel = pianoKeyData.noteLabel; 
                drumSeq.updateSequencerStepUI(drumSeq.currentEditStepIndex); 
            } 
            return; 
        } 

        if (activeNotes.has(uniqueNoteId)) return; 
        
        const actualFundamentalFreq = fundamentalFreq * Math.pow(2, noteOctaveShift); 
        const targetNode = isSequencerTriggered ? sequencerVolumeNode : keysVolumeNode;

        // Kutsutaan uutta SineEngine-moottoria
        const adsrSettings = {
            attack: parseFloat(ui.adsrAttack.value),
            decay: parseFloat(ui.adsrDecay.value),
            sustain: parseFloat(ui.adsrSustain.value),
            velSens: parseFloat(ui.adsrVelocitySens.value)
        };

        const globalSettings = {
            numHarmonics: NUM_HARMONICS,
            freqMultipliers: freqMultipliers,
            amplitudes: amplitudes,
            phasesRad: phasesRad,
            pitchBendCents: globalPitchBendCents
        };

        const noteInstance = SineEngine.play(audioContext, actualFundamentalFreq, velocity, adsrSettings, globalSettings, targetNode);
        
        noteInstance.finalMidiNote = finalMidiNote;
        noteInstance.isSampler = false; // "isSampler" tässä viittaa pädeihin
        
        activeNotes.set(uniqueNoteId, noteInstance); 
        if (keyElement) keyElement.classList.add('pressed'); 
    }
    
    function stopNote(noteId, keyElement = null) {
        const idsToProcess = [];
    
        if (String(noteId).includes('_')) {
            idsToProcess.push(noteId);
        } else {
            idsToProcess.push(`${noteId}_manual`, `${noteId}_seq`);
            let baseMidiNote;
            if (typeof noteId === 'number') { 
                baseMidiNote = noteId;
            } else {
                baseMidiNote = noteNameToMidiNumberMap.get(noteId.slice(0,-1)) || noteNameToMidiNumberMap.get(noteId);
            }
            let finalMidiNote = baseMidiNote + (octaveShift * 12);
            if (assignedSamplerKeys.has(finalMidiNote)) {
                if (keyElement) keyElement.classList.remove('pressed');
                if (midiModule) midiModule.sendMidiMessage([0x80, finalMidiNote, 0]);
                return;
            }
        }
        
        idsToProcess.forEach(idToStop => {
            if (activeNotes.has(idToStop)) { 
                const noteInstance = activeNotes.get(idToStop); 
                if (noteInstance.isSampler) return;
                
                if (noteInstance.finalMidiNote != null && midiModule) { 
                    midiModule.sendMidiMessage([0x80, noteInstance.finalMidiNote, 0]); 
                }
                
                const releaseTime = parseFloat(ui.adsrRelease.value);
                SineEngine.stop(audioContext, noteInstance, releaseTime);
                
                activeNotes.delete(idToStop); 
            } 
        });
    
        if (keyElement) keyElement.classList.remove('pressed'); 
        
        if (faderEffect.active && activeNotes.size === 0) {
            faderEffect.nodes.faderGain.gain.cancelScheduledValues(audioContext.currentTime);
            faderEffect.nodes.faderGain.gain.setTargetAtTime(1.0, audioContext.currentTime, 0.01);
        }
    }

    const availablePianoNotes = []; ui.pianoKeys.forEach(keyEl => { 
        availablePianoNotes.push({ baseNoteName: keyEl.dataset.note, baseFreq: parseFloat(keyEl.dataset.frequency), noteLabel: keyEl.dataset.noteLabel, midiNote: parseInt(keyEl.dataset.midiNote) }); 
        keyEl.addEventListener('mousedown', (e) => playNote(keyEl.dataset.note, parseFloat(keyEl.dataset.frequency), 127, e.currentTarget)); 
        keyEl.addEventListener('mouseup', (e) => stopNote(keyEl.dataset.note, e.currentTarget)); 
        keyEl.addEventListener('mouseleave', (e) => { if (e.currentTarget.classList.contains('pressed')) stopNote(keyEl.dataset.note, e.currentTarget); }); 
    });

    // --- Touch Input for Piano ---
    const pianoEl = document.getElementById('piano');
    const activeTouchKeys = new Map();

    const onPianoTouchStart = (e) => {
        e.preventDefault();
        const touches = e.changedTouches;
        for (let i = 0; i < touches.length; i++) {
            const touch = touches[i];
            const targetKey = touch.target.closest('.key');
            if (targetKey) {
                playNote(targetKey.dataset.note, parseFloat(targetKey.dataset.frequency), 127, targetKey);
                activeTouchKeys.set(touch.identifier, targetKey);
            }
        }
    };

    const onPianoTouchEnd = (e) => {
        e.preventDefault();
        const touches = e.changedTouches;
        for (let i = 0; i < touches.length; i++) {
            const touch = touches[i];
            const activeKey = activeTouchKeys.get(touch.identifier);
            if (activeKey) {
                stopNote(activeKey.dataset.note, activeKey);
                activeTouchKeys.delete(touch.identifier);
            }
        }
    };

    const onPianoTouchMove = (e) => {
        e.preventDefault();
        const touches = e.changedTouches;
        for (let i = 0; i < touches.length; i++) {
            const touch = touches[i];
            const lastKey = activeTouchKeys.get(touch.identifier);
            const currentElement = document.elementFromPoint(touch.clientX, touch.clientY);
            const currentKey = currentElement ? currentElement.closest('.key') : null;

            if (currentKey !== lastKey) {
                if (lastKey) {
                    stopNote(lastKey.dataset.note, lastKey);
                }
                if (currentKey) {
                    playNote(currentKey.dataset.note, parseFloat(currentKey.dataset.frequency), 127, currentKey);
                    activeTouchKeys.set(touch.identifier, currentKey);
                } else {
                    activeTouchKeys.delete(touch.identifier);
                }
            }
        }
    };

    pianoEl.addEventListener('touchstart', onPianoTouchStart, { passive: false });
    pianoEl.addEventListener('touchend', onPianoTouchEnd, { passive: false });
    pianoEl.addEventListener('touchcancel', onPianoTouchEnd, { passive: false });
    pianoEl.addEventListener('touchmove', onPianoTouchMove, { passive: false });


    const keyToNoteNameMap = { 'z':'C3','s':'C#3','x':'D3','d':'D#3','c':'E3','v':'F3','g':'F#3','b':'G3','h':'G#3','n':'A3','j':'A#3','m':'B3', 'q':'C4','2':'C#4','w':'D4','3':'D#4','e':'E4','r':'F4','5':'F#4','t':'G4','6':'G#4','y':'A4','7':'A#4','u':'B4' }; 
    const noteToKeyElementMap = new Map(); ui.pianoKeys.forEach(keyEl => noteToKeyElementMap.set(keyEl.dataset.note, keyEl)); 
    const pressedKeyboardKeys = new Set();
    window.addEventListener('keydown', (e) => { if (e.metaKey || e.ctrlKey || e.altKey || ['INPUT', 'SELECT', 'BUTTON'].includes(document.activeElement.tagName)) return; const key = e.key.toLowerCase(); if (pressedKeyboardKeys.has(key)) return; const noteName = keyToNoteNameMap[key]; if (noteName) { e.preventDefault(); pressedKeyboardKeys.add(key); const keyElement = noteToKeyElementMap.get(noteName); playNote(noteName, parseFloat(keyElement.dataset.frequency), 127, keyElement); } });
    window.addEventListener('keyup', (e) => { const key = e.key.toLowerCase(); if (pressedKeyboardKeys.has(key)) { pressedKeyboardKeys.delete(key); const noteName = keyToNoteNameMap[key]; if (noteName) stopNote(noteName, noteToKeyElementMap.get(noteName)); } });
    function updateOctaveDisplay() { ui.currentOctaveDisplay.textContent = `Octave: ${octaveShift >= 0 ? '+' : ''}${octaveShift}`; }
    ui.octaveUpBtn.addEventListener('click', () => { if (octaveShift < MAX_OCTAVE_SHIFT) { octaveShift++; updateOctaveDisplay(); } }); ui.octaveDownBtn.addEventListener('click', () => { if (octaveShift > MIN_OCTAVE_SHIFT) { octaveShift--; updateOctaveDisplay(); } });
    
    // --- MIDI INITIALIZATION ---
    midiModule = window.initSynthLabMIDI(audioContext, ui, {
        playNote: playNote,
        stopNote: stopNote,
        getActiveNotes: () => activeNotes,
        setGlobalPitchBend: (val) => { globalPitchBendCents = val; },
        getPitchBendRange: () => parseFloat(ui.pitchBendRange.value)
    });

    const waveformCtx = ui.waveformCanvas.getContext('2d'); const waveformBufferLength = analyserNode.frequencyBinCount; const waveformDataArray = new Uint8Array(waveformBufferLength);
    function drawWaveform() { requestAnimationFrame(drawWaveform); analyserNode.getByteTimeDomainData(waveformDataArray); waveformCtx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--color-bg-container-opaque').trim(); waveformCtx.fillRect(0, 0, ui.waveformCanvas.width, ui.waveformCanvas.height); waveformCtx.lineWidth = 2; waveformCtx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--color-neon-cyan').trim(); waveformCtx.beginPath(); const sliceWidth = ui.waveformCanvas.width * 1.0 / waveformBufferLength; let x = 0; for (let i = 0; i < waveformBufferLength; i++) { const v = waveformDataArray[i] / 128.0; const y = v * ui.waveformCanvas.height / 2; if (i === 0) waveformCtx.moveTo(x, y); else waveformCtx.lineTo(x, y); x += sliceWidth; } waveformCtx.lineTo(ui.waveformCanvas.width, ui.waveformCanvas.height / 2); waveformCtx.stroke(); }
    
    // --- EFFECTS & LFO ---
    let effectChain = [];
    
    function rebuildEffectConnections() {
        effectsInputGate.disconnect();
        effectsInputGate.connect(analyserNode);
        const activeMainChainEffects = effectChain.filter(fx => fx.active);
        let lastNode = effectsInputGate;
        if (activeMainChainEffects.length > 0) {
            lastNode.connect(activeMainChainEffects[0].nodes.input);
            for (let i = 0; i < activeMainChainEffects.length - 1; i++) {
                activeMainChainEffects[i].nodes.output.connect(activeMainChainEffects[i + 1].nodes.input);
            }
            lastNode = activeMainChainEffects[activeMainChainEffects.length - 1].nodes.output;
        }
        lastNode.connect(masterGain);
        drawSignalFlow();
    }


    function ensureEffectInChain(effectWrapper) { 
        if (!effectChain.find(e => e.id === effectWrapper.id)) { 
            effectChain.push(effectWrapper);
            const order = { 'distortion': 0, 'ringMod': 1, 'eq': 2, 'tremolo': 3, 'fader': 4, 'fxGate': 5, 'phaser': 6, 'flanger': 7, 'chorus': 8, 'delay1': 9, 'delay2': 10 }; 
            effectChain.sort((a, b) => (order[a.id] || 99) - (order[b.id] || 99)); 
        } 
    }

    function updateEffectStateAndChain(effectWrapper, buttonElement) {
        effectWrapper.active = !effectWrapper.active;
        let btnText = effectWrapper.name || (effectWrapper.id === 'tremolo' || effectWrapper.id === 'fxGate' ? 'Gate' : effectWrapper.id.charAt(0).toUpperCase() + effectWrapper.id.slice(1));

        if (effectWrapper.active) {
            if (Object.keys(effectWrapper.nodes).length === 0 && typeof effectWrapper.create === 'function') {
                effectWrapper.create();
            }
            buttonElement.textContent = `Toggle ${btnText} (ON)`;
            buttonElement.classList.add('active');
        } else {
            buttonElement.textContent = `Toggle ${btnText} (OFF)`;
            buttonElement.classList.remove('active');
        }

        if (typeof effectWrapper.updateParams === 'function') {
            effectWrapper.updateParams();
        }
        rebuildEffectConnections();
    }
    
    let lfo1 = { active: false, node: null, depthGain: audioContext.createGain(), targetParam: null };
    let lfo2 = { active: false, node: null, depthGain: audioContext.createGain(), targetParam: null };
    function updateLfo(lfo, uiSet) {
        if (lfo.targetParam) { lfo.depthGain.disconnect(lfo.targetParam); lfo.targetParam = null; }
        if (lfo.node) { lfo.node.disconnect(); lfo.node.stop?.(); lfo.node = null; }
        if (!lfo.active) { drawSignalFlow(); return; }
        
        const waveform = uiSet.waveform.value;
        if (waveform === 'noise') {
            const noiseSource = audioContext.createBufferSource();
            noiseSource.buffer = whiteNoiseBuffer;
            noiseSource.loop = true;
            noiseSource.playbackRate.value = parseFloat(uiSet.rate.value);
            noiseSource.start();
            lfo.node = noiseSource;
        } else {
            const osc = audioContext.createOscillator();
            osc.type = waveform;
            osc.frequency.value = parseFloat(uiSet.rate.value);
            osc.start();
            lfo.node = osc;
        }
        lfo.node.connect(lfo.depthGain);

        const lfoTargetMap = { keysVolume: { param: keysVolumeNode.gain, scale: parseFloat(ui.keysVolume.value) }, eqLowGain: { param: eqEffect.nodes.lowShelf?.gain, scale: 24 }, eqMidGain: { param: eqEffect.nodes.peaking?.gain, scale: 24 }, eqHighGain: { param: eqEffect.nodes.highShelf?.gain, scale: 24 }, phaserRate: { param: phaserEffect.nodes.lfo?.frequency, scale: parseFloat(ui.phaserRate.max) * 0.5 }, flangerRate: { param: flangerEffect.nodes.lfo?.frequency, scale: parseFloat(ui.flangerRate.max) * 0.5 }, chorusDepth: { param: chorusEffect.nodes.lfoGain?.gain, scale: parseFloat(ui.chorusDepth.max) / 1000 * 0.5 }, delay1Mix: { param: delayEffect1.nodes.wetGain?.gain, scale: 1.0 }, delay2Mix: { param: delayEffect2.nodes.wetGain?.gain, scale: 1.0 }, distortionMix: { param: distortionEffect.nodes.wetGain?.gain, scale: 1.0 } };
        const dest = uiSet.destination.value;
        const newTargetData = (dest !== 'none' && lfoTargetMap[dest]) ? lfoTargetMap[dest] : null;
        if (newTargetData && newTargetData.param) {
            lfo.targetParam = newTargetData.param;
            const depthValue = parseFloat(uiSet.depth.value) * newTargetData.scale;
            lfo.depthGain.gain.setTargetAtTime(depthValue, audioContext.currentTime, 0.01);
            lfo.depthGain.connect(lfo.targetParam);
        }
        drawSignalFlow();
    }

    function handleLfoRateChange(lfo, uiSet) {
        if (!lfo.active || !lfo.node) return;
        const rate = parseFloat(uiSet.rate.value);
        if (lfo.node.constructor === OscillatorNode) {
            lfo.node.frequency.setTargetAtTime(rate, audioContext.currentTime, 0.01);
        } else if (lfo.node.constructor === AudioBufferSourceNode) {
            lfo.node.playbackRate.setTargetAtTime(rate, audioContext.currentTime, 0.01);
        }
    }
    const lfo1UiSet = { rate: ui.lfo1Rate, depth: ui.lfo1Depth, waveform: ui.lfo1Waveform, destination: ui.lfo1Destination };
    const lfo2UiSet = { rate: ui.lfo2Rate, depth: ui.lfo2Depth, waveform: ui.lfo2Waveform, destination: ui.lfo2Destination };
    ui.toggleLfo1.addEventListener('click', () => { lfo1.active = !lfo1.active; ui.toggleLfo1.classList.toggle('active', lfo1.active); ui.toggleLfo1.textContent = `Toggle LFO 1 (${lfo1.active ? 'ON' : 'OFF'})`; updateLfo(lfo1, lfo1UiSet); });
    ui.toggleLfo2.addEventListener('click', () => { lfo2.active = !lfo2.active; ui.toggleLfo2.classList.toggle('active', lfo2.active); ui.toggleLfo2.textContent = `Toggle LFO 2 (${lfo2.active ? 'ON' : 'OFF'})`; updateLfo(lfo2, lfo2UiSet); });
    lfo1UiSet.rate.addEventListener('input', () => handleLfoRateChange(lfo1, lfo1UiSet));
    lfo2UiSet.rate.addEventListener('input', () => handleLfoRateChange(lfo2, lfo2UiSet));
    lfo1UiSet.waveform.addEventListener('input', () => updateLfo(lfo1, lfo1UiSet));
    lfo2UiSet.waveform.addEventListener('input', () => updateLfo(lfo2, lfo2UiSet));
    lfo1UiSet.depth.addEventListener('input', () => updateLfo(lfo1, lfo1UiSet));
    lfo2UiSet.depth.addEventListener('input', () => updateLfo(lfo2, lfo2UiSet));
    lfo1UiSet.destination.addEventListener('input', () => updateLfo(lfo1, lfo1UiSet));
    lfo2UiSet.destination.addEventListener('input', () => updateLfo(lfo2, lfo2UiSet));

    // --- PRESETS, SAVE & LOAD ---
    function populatePresets() { ui.presetSelect.innerHTML = '<option value="-1">-- Select a Preset --</option>'; presets.forEach((p, i) => { const opt = document.createElement('option'); opt.value = i; opt.textContent = p.name; ui.presetSelect.appendChild(opt); }); }
    ui.presetSelect.addEventListener('change', (e) => { const index = parseInt(e.target.value); if (index >= 0 && presets[index]) { applyAllSettings(presets[index].settings); alert(`Preset "${presets[index].name}" loaded!`); } });
    ui.exportPresetsBtn.addEventListener('click', () => { const presetsString = JSON.stringify(presets, null, 2); const blob = new Blob([presetsString], {type: 'application/json'}); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'synthwave_lab_presets.json'; a.click(); URL.revokeObjectURL(url); a.remove(); });
    ui.importPresetsBtn.addEventListener('click', () => ui.importPresetsFile.click());
    ui.importPresetsFile.addEventListener('change', (e) => { const file = e.target.files[0]; if (!file) return; const reader = new FileReader(); reader.onload = (re) => { try { const loadedPresets = JSON.parse(re.target.result); if(Array.isArray(loadedPresets) && loadedPresets.every(p => p.name && p.settings)) { presets = loadedPresets; populatePresets(); alert(`${presets.length} presets loaded successfully.`); } else { throw new Error("Invalid preset file format."); } } catch(err) { alert(`Error loading presets: ${err.message}`); } }; reader.readAsText(file); e.target.value = null; });
    
    function gatherAllSettings() {
        const seqData = drumSeq.getData();
        const settings = { version: "19.0.0", masterVolume: ui.masterVolume.value, keysVolume: ui.keysVolume.value, pitchBendRange: ui.pitchBendRange.value, modWheelDestination: ui.modWheelDestination.value, kickVolume: ui.kickVolume.value, snareVolume: ui.snareVolume.value, hatVolume: ui.hatVolume.value, octaveShift: octaveShift, numHarmonics: NUM_HARMONICS, background: currentBgImageUrl };
        settings.additive = { freqMultipliers: ui.freqMultInputs.map(el => el.value), amplitudes: ui.ampInputs.map(el => el.value), phases: ui.phaseInputs.map(el => el.value) };
        settings.adsr = { attack: ui.adsrAttack.value, decay: ui.adsrDecay.value, sustain: ui.adsrSustain.value, release: ui.adsrRelease.value, velocitySens: ui.adsrVelocitySens.value };
        settings.sequencer = { bpm: seqData.bpm, volume: seqData.volume, length: seqData.length, pattern: seqData.pattern };
        settings.drums = { kickSample: seqData.kickSample, snareSample: seqData.snareSample, hatSample: seqData.hatSample };
        settings.sampler = { numPads: samplerPads.length, pads: samplerPads.map(p => ({ volume: p.volume, assignedKey: p.assignedKey })) };
        settings.effects = {};
        const allEffects = {eq: eqEffect, distortion: distortionEffect, ringMod: ringModEffect, fader:faderEffect, tremolo: tremoloEffect, fxGate: fxGateEffect, delay1: delayEffect1, delay2: delayEffect2, chorus: chorusEffect, flanger: flangerEffect, phaser: phaserEffect};
        Object.values(allEffects).forEach(effect => {
            const effectSettings = { active: effect.active };
            document.querySelectorAll(`[id^=${effect.id}]`).forEach(el => {
                const paramName = el.id.substring(effect.id.length).charAt(0).toLowerCase() + el.id.substring(effect.id.length + 1);
                if (el.type === 'range' || el.type === 'select-one' || el.tagName === 'SELECT') {
                     effectSettings[paramName] = el.value;
                }
            });
            if (effect.id === 'tremolo') effectSettings.gatePattern = seqData.tremoloGate;
            if (effect.id === 'fxGate') effectSettings.gatePattern = seqData.fxGate;
            settings.effects[effect.id] = effectSettings;
        });
        settings.lfo1 = { active: lfo1.active, rate: ui.lfo1Rate.value, depth: ui.lfo1Depth.value, waveform: ui.lfo1Waveform.value, destination: ui.lfo1Destination.value };
        settings.lfo2 = { active: lfo2.active, rate: ui.lfo2Rate.value, depth: ui.lfo2Depth.value, waveform: ui.lfo2Waveform.value, destination: ui.lfo2Destination.value };
        settings.customModules = [];
        for (const [id, moduleData] of loadedCustomModules.entries()) {
            const { instance, code } = moduleData;
            const moduleSettings = instance.getSettings ? instance.getSettings() : {};
            const effectWrapper = effectChain.find(e => e.id === id);
            const active = effectWrapper ? effectWrapper.active : false;
            settings.customModules.push({ id, name: instance.name, code, settings: moduleSettings, active });
        }
        return settings;
    }

    function applyAllSettings(settings) {
        try {
            if (drumSeq.sequencerPlaying) ui.playStopSequencer.click();
            clearAllCustomModules();
            const allEffects = {eq: eqEffect, distortion: distortionEffect, ringMod: ringModEffect, fader: faderEffect, tremolo: tremoloEffect, fxGate: fxGateEffect, delay1: delayEffect1, delay2: delayEffect2, chorus: chorusEffect, flanger: flangerEffect, phaser: phaserEffect};
            Object.values(allEffects).forEach(effect => { ensureEffectInChain(effect) });
            ui.masterVolume.value = settings.masterVolume || 0.3; 
            ui.keysVolume.value = settings.keysVolume || 0.8; 
            ui.pitchBendRange.value = settings.pitchBendRange || 2;
            ui.modWheelDestination.value = settings.modWheelDestination || 'none';
            ui.kickVolume.value = settings.kickVolume || 1.0; 
            ui.snareVolume.value = settings.snareVolume || 1.0; 
            ui.hatVolume.value = settings.hatVolume || 0.8; 
            octaveShift = settings.octaveShift || 0; 
            const adsr = settings.adsr || {};
            ui.adsrAttack.value = adsr.attack || 0.01; ui.adsrDecay.value = adsr.decay || 0.1;
            ui.adsrSustain.value = adsr.sustain || 0.8; ui.adsrRelease.value = adsr.release || 0.2;
            ui.adsrVelocitySens.value = adsr.velocitySens || 0.5;
            Object.values(allEffects).forEach(effect => {
                const effectSettings = settings.effects?.[effect.id] || {};
                Object.keys(effectSettings).forEach(paramKey => {
                    if (paramKey === 'active' || paramKey === 'gatePattern') return;
                    const uiId = effect.id + paramKey.charAt(0).toUpperCase() + paramKey.slice(1);
                    if(ui[uiId]) ui[uiId].value = effectSettings[paramKey];
                });
            });
            const lfo1Settings = settings.lfo1 || {};
            ui.lfo1Rate.value = lfo1Settings.rate || 2.0; ui.lfo1Depth.value = lfo1Settings.depth || 0.5;
            ui.lfo1Waveform.value = lfo1Settings.waveform || 'sine'; ui.lfo1Destination.value = lfo1Settings.destination || 'none';
            const lfo2Settings = settings.lfo2 || {};
            ui.lfo2Rate.value = lfo2Settings.rate || 0.5; ui.lfo2Depth.value = lfo2Settings.depth || 0.0;
            ui.lfo2Waveform.value = lfo2Settings.waveform || 'sine'; ui.lfo2Destination.value = lfo2Settings.destination || 'none';
            rebuildHarmonicControls(settings.numHarmonics || 6);
            ui.numHarmonics.value = settings.numHarmonics || 6;
            if (settings.additive) {
                ui.freqMultInputs.forEach((el, i) => el.value = settings.additive.freqMultipliers[i] || (i + 1));
                ui.ampInputs.forEach((el, i) => el.value = settings.additive.amplitudes[i] || (i === 0 ? 0.7 : 0));
                ui.phaseInputs.forEach((el, i) => el.value = settings.additive.phases[i] || 0);
            }
            updateAdditiveParams();
            if (settings.sampler) {
                ui.numSamplers.value = settings.sampler.numPads; createSamplerPads(settings.sampler.numPads);
                samplerPads.forEach((pad, i) => { if(settings.sampler.pads[i]) { pad.volume = settings.sampler.pads[i].volume; pad.assignedKey = settings.sampler.pads[i].assignedKey; pad.ui.volumeSlider.value = pad.volume; pad.ui.keyAssign.value = pad.assignedKey || "none"; } });
                updateSamplerKeyMap();
            }
            const seqData = {
                bpm: settings.sequencer?.bpm, volume: settings.sequencer?.volume, length: settings.sequencer?.length, pattern: settings.sequencer?.pattern, kickSample: settings.drums?.kickSample, snareSample: settings.drums?.snareSample, hatSample: settings.drums?.hatSample, tremoloGate: settings.effects?.tremolo?.gatePattern, fxGate: settings.effects?.fxGate?.gatePattern
            };
            drumSeq.applyData(seqData);
            Object.values(allEffects).forEach(effect => {
                const effectSettings = settings.effects?.[effect.id] || {};
                const wasActive = effect.active;
                const shouldBeActive = effectSettings.active || false;
                if (wasActive !== shouldBeActive) {
                    const button = ui[`toggle${effect.id.charAt(0).toUpperCase() + effect.id.slice(1)}`];
                    if (button) button.click();
                }
            });
            if ((lfo1.active) !== (lfo1Settings.active || false)) { ui.toggleLfo1.click(); }
            if ((lfo2.active) !== (lfo2Settings.active || false)) { ui.toggleLfo2.click(); }
            initAllValueDisplays();
            Object.values(allEffects).forEach(effect => effect.updateParams());
            updateLfo(lfo1, lfo1UiSet); updateLfo(lfo2, lfo2UiSet);
            if (settings.background) { currentBgImageUrl = settings.background; document.body.style.backgroundImage = `url(${currentBgImageUrl})`; document.body.style.backgroundSize = 'cover'; } else { ui.clearBgImageBtn.click(); }
            if (settings.customModules && Array.isArray(settings.customModules)) {
                for (const module of settings.customModules) {
                    try {
                        processModuleCode(module.code, `from settings: ${module.name}`);
                        const moduleData = loadedCustomModules.get(module.id);
                        if (moduleData && moduleData.instance.setSettings) { moduleData.instance.setSettings(module.settings); }
                        const effectWrapper = effectChain.find(e => e.id === module.id);
                        if (effectWrapper && module.active && !effectWrapper.active) {
                            const button = document.querySelector(`#group-${module.id} .toggle-button`);
                            if(button) button.click();
                        }
                    } catch (err) { console.error(`Failed to load custom module "${module.name}" from settings:`, err); }
                }
            }
            updateOctaveDisplay();
            adsrModule.draw();
            rebuildEffectConnections();
        } catch (e) { console.error("Error applying settings:", e); alert("Error loading settings file."); }
    }
    
    ui.saveSettingsBtn.addEventListener('click', () => { const settings = gatherAllSettings(); const settingsString = JSON.stringify(settings, null, 2); const blob = new Blob([settingsString], { type: 'application/json' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'synthwave_lab_settings.json'; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url); });
    ui.loadFileElement.addEventListener('change', (event) => { const file = event.target.files[0]; if (file) { const reader = new FileReader(); reader.onload = (e) => { try { const loadedSettings = JSON.parse(e.target.result); applyAllSettings(loadedSettings); alert("Settings loaded successfully!"); } catch (err) { console.error(err); alert("Could not load settings: Invalid JSON file."); } }; reader.readAsText(file); event.target.value = null; } });
    
    ui.randomizeAllSettingsBtn.addEventListener('click', () => {
        for (let i = 0; i < NUM_HARMONICS; i++) { ui.freqMultInputs[i].value = (i === 0) ? 1 : (Math.random() < 0.7 ? Math.ceil(Math.random() * 8) : (Math.random() * 7.5 + 0.5).toFixed(1)); ui.ampInputs[i].value = (i === 0) ? (Math.random() * 0.4 + 0.6).toFixed(2) : (Math.random() * (0.8 / (i + 1))).toFixed(2); ui.phaseInputs[i].value = Math.floor(Math.random() * 361); }
        updateAdditiveParams(); ui.harmonicCanvases.forEach((canvas, i) => { drawHarmonicWave(canvas, parseFloat(ui.ampInputs[i].value), parseFloat(ui.phaseInputs[i].value) * Math.PI / 180); });
        const allEffects = {eq: eqEffect, distortion: distortionEffect, ringMod: ringModEffect, fader:faderEffect, tremolo: tremoloEffect, fxGate: fxGateEffect, delay1: delayEffect1, delay2: delayEffect2, chorus: chorusEffect, flanger: flangerEffect, phaser: phaserEffect};
        Object.values(allEffects).forEach(effect => { const shouldBeActive = Math.random() < 0.5; if (effect.active !== shouldBeActive) { const buttonId = `toggle${effect.id.charAt(0).toUpperCase() + effect.id.slice(1)}`; const button = ui[buttonId]; if (button) { button.click(); } } });
        Object.values(allEffects).forEach(effect => { document.querySelectorAll(`[id^=${effect.id}]`).forEach(el => { if (el.type === 'range') { const min = parseFloat(el.min); const max = parseFloat(el.max); const step = parseFloat(el.step) || 1; let randomVal = Math.random() * (max - min) + min; el.value = (Math.round(randomVal / step) * step).toFixed(el.step && el.step.includes('.') ? 2 : 0); } else if (el.tagName === 'SELECT') { el.selectedIndex = Math.floor(Math.random() * el.options.length); } }); effect.updateParams(); });
        initAllValueDisplays();
    });

    // --- MODULE LOADER ---
    function processModuleCode(code, sourceName) {
        try {
            window.synthLabModuleCode = code;
            const script = document.createElement('script');
            script.textContent = code;
            document.head.appendChild(script);
            document.head.removeChild(script);
        } catch (err) {
            ui.moduleLoadStatus.textContent = `Error executing module from ${sourceName}: ${err.message}`;
            console.error(err);
        } finally {
            window.synthLabModuleCode = null;
        }
    }

    function handleModuleImportFromFile(event) {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => processModuleCode(e.target.result, file.name);
        reader.readAsText(file);
        event.target.value = null;
    }
    
    function handleKnownModuleLoad() {
        const filename = ui.knownModuleSelect.value;
        if (!filename) { ui.moduleLoadStatus.textContent = "Please select a module to load."; return; }
        const path = `modules/${filename}`;
        ui.moduleLoadStatus.textContent = `Loading ${filename}...`;
        fetch(path).then(response => {
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                return response.text();
            }).then(code => processModuleCode(code, filename))
            .catch(error => {
                ui.moduleLoadStatus.textContent = `Failed to load "${filename}".`;
                console.error(`Failed to load "${filename}":`, error);
            });
    }

    function populateModuleLibrary() {
        ui.moduleLoadStatus.textContent = 'Updating module library...';
        fetch('modules/module-list.json', { cache: "no-store" })
            .then(response => {
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                return response.json();
            }).then(knownModules => {
                if (!Array.isArray(knownModules)) throw new Error("module-list.json is not valid.");
                ui.knownModuleSelect.innerHTML = '<option value="">-- Select Module --</option>';
                knownModules.forEach(filename => ui.knownModuleSelect.appendChild(new Option(filename, filename)));
                ui.moduleLoadStatus.textContent = `Library updated. ${knownModules.length} modules found.`;
            }).catch(error => {
                ui.knownModuleSelect.innerHTML = '<option value="">Library not found</option>';
                ui.moduleLoadStatus.textContent = "Error loading library.";
            });
    }

    function clearAllCustomModules() {
        const moduleIdsToRemove = [...loadedCustomModules.keys()];
        for (const moduleId of moduleIdsToRemove) {
            const controlGroup = document.getElementById(`group-${moduleId}`);
            if (controlGroup) {
                const removeBtn = controlGroup.querySelector('.remove-module-btn');
                if (removeBtn) {
                    const originalConfirm = window.confirm; window.confirm = () => true;
                    removeBtn.click(); window.confirm = originalConfirm;
                }
            }
        }
    }

    window.registerSynthModule = (ModuleClass) => {
        const moduleCode = window.synthLabModuleCode;
        try {
            const moduleInstance = new ModuleClass(audioContext);
            if (!moduleInstance.id || !moduleInstance.name) throw new Error("Invalid module structure.");
            if (effectChain.some(e => e.id === moduleInstance.id)) throw new Error(`Module "${moduleInstance.id}" already loaded.`);
            const controlGroup = document.createElement('div'); controlGroup.className = 'control-group'; controlGroup.id = `group-${moduleInstance.id}`;
            const headerDiv = document.createElement('div'); headerDiv.className = 'collapsible-header';
            const h3 = document.createElement('h3'); h3.className = 'collapsible'; h3.draggable = true; h3.textContent = moduleInstance.name;
            const toggleBtn = document.createElement('button'); toggleBtn.className = 'toggle-button header-toggle'; toggleBtn.textContent = `Toggle ${moduleInstance.name} (OFF)`;
            const removeBtn = document.createElement('button'); removeBtn.textContent = '✖'; removeBtn.className = 'remove-module-btn';
            headerDiv.append(h3, removeBtn, toggleBtn);
            const contentDiv = document.createElement('div'); contentDiv.className = 'collapsible-content'; contentDiv.innerHTML = moduleInstance.getHTML();
            controlGroup.append(headerDiv, contentDiv);
            document.getElementById('column-right').appendChild(controlGroup);
            moduleInstance.initUI(contentDiv);
            const effectWrapper = { id: moduleInstance.id, name: moduleInstance.name, active: false, nodes: moduleInstance.nodes, updateParams: () => moduleInstance.updateParams() };
            removeBtn.addEventListener('click', () => {
                if (!confirm(`Remove module "${moduleInstance.name}"?`)) return;
                if (effectWrapper.active) toggleBtn.click();
                const idx = effectChain.findIndex(e => e.id === moduleInstance.id);
                if (idx > -1) effectChain.splice(idx, 1);
                loadedCustomModules.delete(moduleInstance.id); controlGroup.remove(); rebuildEffectConnections();
            });
            h3.addEventListener('click', (e) => { if (e.target.closest('.header-toggle, .remove-module-btn')) return; h3.classList.toggle('collapsed'); contentDiv.classList.toggle('collapsed'); });
            toggleBtn.addEventListener('click', () => updateEffectStateAndChain(effectWrapper, toggleBtn));
            loadedCustomModules.set(moduleInstance.id, { instance: moduleInstance, code: moduleCode });
            ensureEffectInChain(effectWrapper); rebuildEffectConnections();
        } catch (err) { ui.moduleLoadStatus.textContent = `Error: ${err.message}`; }
    };


    // --- UI INTERACTIVITY ---
    function applySkin(skinName) {
        const selectedSkin = skins.find(s => s.name === skinName);
        if (!selectedSkin) return;
        for (const [key, value] of Object.entries(selectedSkin.colors)) {
            document.documentElement.style.setProperty(key, value);
        }
        adsrModule.draw(); drawSummedWave(); drawSignalFlow(); eqEffect.draw();
    }
    function populateSkinSelector() { ui.skinSelect.innerHTML = ''; skins.forEach(skin => { ui.skinSelect.appendChild(new Option(skin.name, skin.name)); }); }
    ui.skinSelect.addEventListener('change', (e) => applySkin(e.target.value));
    ui.exportSkinsBtn.addEventListener('click', () => { const skinsString = JSON.stringify(skins, null, 2); const blob = new Blob([skinsString], { type: 'application/json' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'synthwave_lab_skins.json'; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url); });
    ui.importSkinsBtn.addEventListener('click', () => {
        const fInput = document.createElement('input'); fInput.type = 'file'; fInput.accept = '.json';
        fInput.onchange = (e) => {
            const file = e.target.files[0]; if (!file) return;
            const reader = new FileReader(); reader.onload = (re) => {
                try {
                    const lSkins = JSON.parse(re.target.result);
                    if (Array.isArray(lSkins)) { skins = lSkins; populateSkinSelector(); applySkin(skins[0].name); }
                } catch(err) { alert("Error loading skins."); }
            }; reader.readAsText(file);
        }; fInput.click();
    });
    
    ui.uiZoom.addEventListener('input', (e) => { document.querySelector('body').style.zoom = e.target.value; });

    function initDragAndDrop() {
        let draggedElement = null;
        function updateEffectChainOrder() {
            const rightColumn = document.getElementById('column-right');
            const orderedIds = Array.from(rightColumn.querySelectorAll('.control-group')).map(group => group.id.replace('group-', ''));
            const validEffectIds = effectChain.map(fx => fx.id);
            const orderedEffectIds = orderedIds.filter(id => validEffectIds.includes(id));
            effectChain.sort((a, b) => { return orderedEffectIds.indexOf(a.id) - orderedEffectIds.indexOf(b.id); });
        }
        document.addEventListener('dragstart', e => { if (e.target.tagName === 'H3' && e.target.draggable) { draggedElement = e.target.closest('.control-group'); setTimeout(() => { if (draggedElement) draggedElement.classList.add('dragging'); }, 0); } else if (e.target.closest('.control-group')) { e.preventDefault(); } });
        document.addEventListener('dragend', e => { if (draggedElement) { draggedElement.classList.remove('dragging'); updateEffectChainOrder(); rebuildEffectConnections(); draggedElement = null; } });
        document.querySelectorAll('.column').forEach(column => {
            column.addEventListener('dragover', e => {
                e.preventDefault(); if (!draggedElement) return;
                const afterElement = getDragAfterElement(column, e.clientY);
                if (afterElement == null) { column.appendChild(draggedElement); } else { column.insertBefore(draggedElement, afterElement); }
            });
        });
        function getDragAfterElement(container, y) { const draggables = [...container.querySelectorAll('.control-group:not(.dragging)')]; return draggables.reduce((closest, child) => { const box = child.getBoundingClientRect(); const offset = y - box.top - box.height / 2; if (offset < 0 && offset > closest.offset) { return { offset: offset, element: child }; } else { return closest; } }, { offset: Number.NEGATIVE_INFINITY }).element; }
    }


    // --- INITIALIZATION ---
    function createSamplerPads(num) {
        ui.samplerPadsContainer.innerHTML = ''; samplerPads = []; assignedSamplerKeys.clear();
        for (let i = 0; i < num; i++) {
            const pad = { id: i, buffer: null, volume: 1.0, assignedKey: "none", gainNode: audioContext.createGain(), ui: {} };
            pad.gainNode.connect(masterGain);
            const padEl = document.createElement('div'); padEl.className = 'sampler-pad';
            const playBtn = document.createElement('button'); playBtn.textContent = `Pad ${i+1}`; playBtn.className = 'play-button'; playBtn.onclick = () => playSample(i); pad.ui.playButton = playBtn;
            const fInput = document.createElement('input'); fInput.type = 'file'; fInput.accept = '.wav';
            fInput.onchange = (e) => {
                const file = e.target.files[0]; if (file) {
                    const reader = new FileReader(); reader.onload = (re) => {
                        audioContext.decodeAudioData(re.target.result, buffer => { pad.buffer = buffer; playBtn.classList.add('loaded'); }, err => alert("Decode error."));
                    }; reader.readAsArrayBuffer(file);
                }
            };
            const volumeRow = document.createElement('div'); volumeRow.className = 'volume-row';
            const volSlider = document.createElement('input'); volSlider.type = 'range'; volSlider.min = 0; volSlider.max = 1.5; volSlider.step = 0.01; volSlider.value = 1.0;
            volSlider.oninput = (e) => { pad.volume = parseFloat(e.target.value); pad.gainNode.gain.setTargetAtTime(pad.volume, audioContext.currentTime, 0.01); }; pad.ui.volumeSlider = volSlider;
            volumeRow.append(volSlider);
            const keyAssign = document.createElement('select'); keyAssign.innerHTML = '<option value="none">Assign to Key</option>';
            for(let m = 21; m <= 108; m++) { const names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']; keyAssign.innerHTML += `<option value="${m}">${names[m % 12]}${Math.floor(m / 12) - 1}</option>`; }
            keyAssign.onchange = () => { pad.assignedKey = keyAssign.value; updateSamplerKeyMap(); }; pad.ui.keyAssign = keyAssign;
            padEl.append(playBtn, fInput, volumeRow, keyAssign);
            ui.samplerPadsContainer.appendChild(padEl); samplerPads.push(pad);
        }
    }
    function playSample(padIndex, velocity = 127) {
        const pad = samplerPads[padIndex]; if (!pad || !pad.buffer) return;
        if (!audioContextResumedByInteraction) { audioContext.resume(); audioContextResumedByInteraction = true; }
        const source = audioContext.createBufferSource(); source.buffer = pad.buffer;
        pad.gainNode.gain.value = pad.volume * (velocity / 127); source.connect(pad.gainNode); source.start();
    }
    function updateSamplerKeyMap() { assignedSamplerKeys.clear(); samplerPads.forEach(pad => { if (pad.assignedKey && pad.assignedKey !== "none") { assignedSamplerKeys.set(parseInt(pad.assignedKey), pad.id); } }); }

    function drawSignalFlow() {
        const canvas = ui.signalFlowCanvas; if (!canvas) return; const ctx = canvas.getContext('2d'); const width = canvas.width; const height = canvas.height; const styles = getComputedStyle(document.documentElement); ctx.fillStyle = styles.getPropertyValue('--color-bg-container-opaque').trim(); ctx.fillRect(0, 0, width, height); const boxW = 85, boxH = 35, paddingX = 10, arrowSize = 6; const mainY = 50; const lfoY = 150; const activeEffects = effectChain.filter(fx => fx.active); const nodesToDraw = ['Synth', ...activeEffects.map(fx => fx.name || fx.id), 'Master']; const nodePositions = new Map(); const totalWidth = nodesToDraw.length * boxW + (nodesToDraw.length - 1) * paddingX; let currentX = (width - totalWidth) / 2; ctx.font = 'bold 11px ' + styles.getPropertyValue('--font-family-main').trim(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        function drawBox(x, y, label, color) { ctx.fillStyle = styles.getPropertyValue('--color-bg-medium').trim(); ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.beginPath(); ctx.rect(x, y, boxW, boxH); ctx.fill(); ctx.stroke(); ctx.fillStyle = color; ctx.fillText(label.toUpperCase(), x + boxW / 2, y + boxH / 2); }
        function drawArrow(fX, fY, tX, tY, color, isMod = false) { ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = 1.5; if(isMod) ctx.setLineDash([4, 4]); else ctx.setLineDash([]); ctx.beginPath(); ctx.moveTo(fX, fY); ctx.lineTo(tX, tY); ctx.stroke(); ctx.setLineDash([]); const angle = Math.atan2(tY - fY, tX - fX); ctx.beginPath(); ctx.moveTo(tX, tY); ctx.lineTo(tX - arrowSize * Math.cos(angle - Math.PI / 6), tY - arrowSize * Math.sin(angle - Math.PI / 6)); ctx.lineTo(tX - arrowSize * Math.cos(angle + Math.PI / 6), tY - arrowSize * Math.sin(angle + Math.PI / 6)); ctx.closePath(); ctx.fill(); }
        for (let i = 0; i < nodesToDraw.length; i++) { const label = nodesToDraw[i]; drawBox(currentX, mainY, label.substring(0, 10), styles.getPropertyValue('--color-neon-cyan').trim()); nodePositions.set(activeEffects[i-1]?.id || label, { x: currentX + boxW / 2, y: mainY }); if (i > 0) drawArrow(currentX - paddingX, mainY + boxH / 2, currentX, mainY + boxH / 2, styles.getPropertyValue('--color-neon-cyan').trim()); currentX += boxW + paddingX; }
        const lfos = [{lfo: lfo1, ui: lfo1UiSet, label: 'LFO 1'}, {lfo: lfo2, ui: lfo2UiSet, label: 'LFO 2'}]; const lfoBoxX = [width/4, 3*width/4]; const destMap = { keysVolume: 'Synth', eqLowGain: 'eq', eqMidGain: 'eq', eqHighGain: 'eq', phaserRate: 'phaser', flangerRate: 'flanger', chorusDepth: 'chorus', delay1Mix: 'delay1', delay2Mix: 'delay2', distortionMix: 'distortion' };
        lfos.forEach((l, index) => { if (l.lfo.active) { drawBox(lfoBoxX[index] - boxW/2, lfoY, l.label, styles.getPropertyValue('--color-neon-yellow').trim()); const destId = l.ui.destination.value; if (destId !== 'none') { const pos = nodePositions.get(destMap[destId]); if (pos) drawArrow(lfoBoxX[index], lfoY, pos.x, pos.y + boxH, styles.getPropertyValue('--color-neon-yellow').trim(), true); } } });
    }

    function initializeApp() {
        document.querySelector('body').style.zoom = ui.uiZoom.value;
        document.querySelectorAll('.control-group h3.collapsible, .collapsible-header > h3.collapsible').forEach(header => {
            header.addEventListener('click', (e) => { if (e.target.closest('.header-toggle')) return; const parent = header.closest('.control-group'); const content = parent.querySelector('.collapsible-content'); if (content) { header.classList.toggle('collapsed'); content.classList.toggle('collapsed'); } });
        });
        ui.showAllBtn.addEventListener('click', () => { document.querySelectorAll('.control-group h3.collapsible').forEach(h => h.classList.remove('collapsed')); document.querySelectorAll('.collapsible-content').forEach(c => c.classList.remove('collapsed')); });
        ui.hideAllBtn.addEventListener('click', () => { document.querySelectorAll('.control-group h3.collapsible').forEach(h => h.classList.add('collapsed')); document.querySelectorAll('.collapsible-content').forEach(c => c.classList.add('collapsed')); });
        ui.loadBgImageBtn.addEventListener('click', () => ui.bgImageFile.click());
        ui.clearBgImageBtn.addEventListener('click', () => { document.body.style.backgroundImage = 'var(--bg-grid-image)'; document.body.style.backgroundSize = '50px 50px'; currentBgImageUrl = null; });
        ui.bgImageFile.addEventListener('change', (e) => { const file = e.target.files[0]; if (file) { const reader = new FileReader(); reader.onload = (re) => { currentBgImageUrl = re.target.result; document.body.style.backgroundImage = `url(${currentBgImageUrl})`; document.body.style.backgroundSize = 'cover'; }; reader.readAsDataURL(file); } });
        ui.applyNumSamplersBtn.addEventListener('click', () => createSamplerPads(parseInt(ui.numSamplers.value)));
        createSamplerPads(parseInt(ui.numSamplers.value));
        ui.pianoKeys.forEach(keyEl => { noteNameToMidiNumberMap.set(keyEl.dataset.note, parseInt(keyEl.dataset.midiNote)); });
        masterGain.gain.value = ui.masterVolume.value; keysVolumeNode.gain.value = ui.keysVolume.value;
        sequencerVolumeNode.gain.value = ui.sequencerVolume.value; kickVolumeNode.gain.value = ui.kickVolume.value; 
        snareVolumeNode.gain.value = ui.snareVolume.value; hatVolumeNode.gain.value = ui.hatVolume.value;
        ui.masterVolume.addEventListener('input', (e) => masterGain.gain.setTargetAtTime(parseFloat(e.target.value), audioContext.currentTime, 0.01));
        ui.keysVolume.addEventListener('input', (e) => keysVolumeNode.gain.setTargetAtTime(parseFloat(e.target.value), audioContext.currentTime, 0.01));
        ui.sequencerVolume.addEventListener('input', (e) => sequencerVolumeNode.gain.setTargetAtTime(parseFloat(e.target.value), audioContext.currentTime, 0.01));
        ui.kickVolume.addEventListener('input', (e) => kickVolumeNode.gain.setTargetAtTime(parseFloat(e.target.value), audioContext.currentTime, 0.01));
        ui.snareVolume.addEventListener('input', (e) => snareVolumeNode.gain.setTargetAtTime(parseFloat(e.target.value), audioContext.currentTime, 0.01));
        ui.hatVolume.addEventListener('input', (e) => hatVolumeNode.gain.setTargetAtTime(parseFloat(e.target.value), audioContext.currentTime, 0.01));
        ui.moduleFile.addEventListener('change', handleModuleImportFromFile);
        ui.loadSelectedModuleBtn.addEventListener('click', handleKnownModuleLoad);
        ui.updateModuleLibraryBtn.addEventListener('click', populateModuleLibrary);
        populateModuleLibrary();
        rebuildHarmonicControls(NUM_HARMONICS); initAllValueDisplays(); updateOctaveDisplay();
        const allEffects = {eq: eqEffect, distortion: distortionEffect, ringMod: ringModEffect, fader: faderEffect, tremolo: tremoloEffect, fxGate: fxGateEffect, delay1: delayEffect1, delay2: delayEffect2, chorus: chorusEffect, flanger: flangerEffect, phaser: phaserEffect};
        Object.values(allEffects).forEach(effect => {
            effect.create?.(); ensureEffectInChain(effect);
            const button = ui[`toggle${effect.id.charAt(0).toUpperCase() + effect.id.slice(1)}`];
            if(button) button.addEventListener('click', () => updateEffectStateAndChain(effect, button));
            Object.keys(ui).filter(k => k.startsWith(effect.id)).forEach(k => { if(ui[k] && (ui[k].type==='range' || ui[k].tagName==='SELECT')) { ui[k].addEventListener('input', () => { effect.updateParams(); }); } });
        });
        const modDests = { "None": "none", "Keys Volume": "keysVolume", "LFO 1 Rate": "lfo1Rate", "LFO 1 Depth": "lfo1Depth", "LFO 2 Rate": "lfo2Rate", "LFO 2 Depth": "lfo2Depth", "Distortion Mix": "distortionMix", "RingMod Freq": "ringModFreq", "RingMod Mix": "ringModMix", "Delay 1 Time": "delay1Time", "Delay 1 Mix": "delay1Mix", "Delay 2 Time": "delay2Time", "Delay 2 Mix": "delay2Mix", "Phaser Rate": "phaserRate", "Phaser Mix": "phaserMix", "Flanger Rate": "flangerRate", "Flanger Mix": "flangerMix", "Chorus Mix": "chorusMix", "ADSR Attack": "adsrAttack", "ADSR Release": "adsrRelease" };
        Object.entries(modDests).forEach(([label, id]) => { ui.modWheelDestination.appendChild(new Option(label, id)); });
        const bSize = audioContext.sampleRate * 2; whiteNoiseBuffer = audioContext.createBuffer(1, bSize, audioContext.sampleRate);
        const out = whiteNoiseBuffer.getChannelData(0); for (let i = 0; i < bSize; i++) { out[i] = Math.random() * 2 - 1; }
        rebuildEffectConnections();
        drumSeq = new DrumsAndSequencer(audioContext, ui, {
            playNote: playNote, stopNote: stopNote,
            mixerNodes: { kick: kickVolumeNode, snare: snareVolumeNode, hat: hatVolumeNode, sequencer: sequencerVolumeNode },
            effects: { tremolo: tremoloEffect, fxGate: fxGateEffect },
            getAvailablePianoNotes: () => availablePianoNotes
        });
        drumSeq.init();
        drawWaveform(); adsrModule.draw(); eqEffect.draw(); initDragAndDrop();
        Promise.all([
            fetch('presets.json').then(res => res.ok ? res.json() : []),
            fetch('skins.json').then(res => res.ok ? res.json() : [])
        ]).then(([lPresets, lSkins]) => { presets = lPresets; skins = lSkins; populatePresets(); populateSkinSelector(); if (skins.length > 0) applySkin(skins[0].name); });
    }
    initializeApp();
};