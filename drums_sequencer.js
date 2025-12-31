/**
 * drums_sequencer.js
 * Sisältää kaiken logiikan rummuille, sekvensserille ja gate-efekteille.
 * Sisältää nyt automaattisen samplen latauksen juurikansiosta käynnistyksen yhteydessä.
 */

class DrumsAndSequencer {
    constructor(audioContext, ui, callbacks) {
        // --- Riippuvuudet ---
        this.audioContext = audioContext;
        this.ui = ui;
        
        // Callbacks sisältää pääohjelman funktiot ja objektit
        this.callbacks = callbacks;

        // --- Tilamuuttujat ---
        this.kickSampleBuffer = null;
        this.snareSampleBuffer = null;
        this.hatSampleBuffer = null;

        this.SEQ_LENGTH = 8;
        this.sequencerPlaying = false;
        this.currentSeqStep = 0;
        this.currentGateStep = 0;
        this.bpm = 120;
        this.seqTimerId = null;
        
        this.sequencerPattern = [];
        this.seqStepElements = []; // DOM elementit
        this.currentEditStepIndex = null;

        this.tremoloGatePattern = Array(16).fill(false);
        this.fxGatePattern = Array(16).fill(false);

        // --- Alustus ---
        this.initializeSequencerPattern();
    }

    // Kutsu tätä pääohjelman alussa (window.onload)
    init() {
        // Event Listenerit UI-elementeille
        this.initEventListeners();
        
        // Alusta graafinen käyttöliittymä
        this.initializeSequencerUI();
        this.initializeGateUI(this.ui.tremoloGateStepsContainer, this.tremoloGatePattern);
        this.initializeGateUI(this.ui.fxGateStepsContainer, this.fxGatePattern);

        // Aseta BPM UI:n perusteella
        this.bpm = parseInt(this.ui.bpmSlider.value);

        // Yritä ladata oletussamplet juuresta automaattisesti
        this.loadSamplesFromRoot();
    }

    initEventListeners() {
        // Sequencer Controls
        this.ui.playStopSequencer.addEventListener('click', () => this.toggleSequencer());
        this.ui.bpmSlider.addEventListener('input', (e) => { this.bpm = parseInt(e.target.value); });
        this.ui.numStepsSelect.addEventListener('change', (e) => this.changeSeqLength(parseInt(e.target.value)));
        this.ui.clearSelectedStepBtn.addEventListener('click', () => this.clearSelectedStep());
        this.ui.clearAllSeqBtn.addEventListener('click', () => this.clearAllSteps());
        this.ui.randomizeSequencerBtn.addEventListener('click', () => this.randomizeSequencer());

        // Sample Loaders (Manuaalinen lataus)
        this.ui.loadKickSample.addEventListener('change', (e) => this.loadSample(e.target.files[0], 'kick', this.ui.kickSampleName));
        this.ui.loadSnareSample.addEventListener('change', (e) => this.loadSample(e.target.files[0], 'snare', this.ui.snareSampleName));
        this.ui.loadHatSample.addEventListener('change', (e) => this.loadSample(e.target.files[0], 'hat', this.ui.hatSampleName));

        // Sample Clear Buttons
        this.ui.clearKickSampleBtn.addEventListener('click', () => { this.kickSampleBuffer = null; this.resetSampleUI(this.ui.kickSampleName, this.ui.loadKickSample); });
        this.ui.clearSnareSampleBtn.addEventListener('click', () => { this.snareSampleBuffer = null; this.resetSampleUI(this.ui.snareSampleName, this.ui.loadSnareSample); });
        this.ui.clearHatSampleBtn.addEventListener('click', () => { this.hatSampleBuffer = null; this.resetSampleUI(this.ui.hatSampleName, this.ui.loadHatSample); });

        // Volume Sliders
        this.ui.kickVolume.addEventListener('input', (e) => this.callbacks.mixerNodes.kick.gain.setTargetAtTime(parseFloat(e.target.value), this.audioContext.currentTime, 0.01));
        this.ui.snareVolume.addEventListener('input', (e) => this.callbacks.mixerNodes.snare.gain.setTargetAtTime(parseFloat(e.target.value), this.audioContext.currentTime, 0.01));
        this.ui.hatVolume.addEventListener('input', (e) => this.callbacks.mixerNodes.hat.gain.setTargetAtTime(parseFloat(e.target.value), this.audioContext.currentTime, 0.01));
        this.ui.sequencerVolume.addEventListener('input', (e) => this.callbacks.mixerNodes.sequencer.gain.setTargetAtTime(parseFloat(e.target.value), this.audioContext.currentTime, 0.01));
    }

    /**
     * Yrittää ladata kick.wav, snare.wav ja hi-hat.wav tiedostot automaattisesti juuresta.
     */
    async loadSamplesFromRoot() {
        const samplesToLoad = [
            { url: 'kick.wav', type: 'kick', ui: this.ui.kickSampleName },
            { url: 'snare.wav', type: 'snare', ui: this.ui.snareSampleName },
            { url: 'hi-hat.wav', type: 'hat', ui: this.ui.hatSampleName }
        ];

        for (const sample of samplesToLoad) {
            try {
                const response = await fetch(sample.url);
                if (response.ok) {
                    const arrayBuffer = await response.arrayBuffer();
                    const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
                    
                    if (sample.type === 'kick') this.kickSampleBuffer = audioBuffer;
                    else if (sample.type === 'snare') this.snareSampleBuffer = audioBuffer;
                    else if (sample.type === 'hat') this.hatSampleBuffer = audioBuffer;

                    sample.ui.textContent = sample.url;
                    sample.ui.style.color = 'var(--color-neon-green)';
                    console.log(`Auto-loaded default sample: ${sample.url}`);
                } else {
                    console.log(`Default sample ${sample.url} not found in root. Using synthesis.`);
                }
            } catch (err) {
                console.warn(`Could not auto-load ${sample.url}:`, err);
            }
        }
    }

    // --- Äänen tuotto (Drum Synthesis & Samples) ---

    createKickSound() {
        const time = this.audioContext.currentTime;
        if (this.kickSampleBuffer) {
            const source = this.audioContext.createBufferSource();
            source.buffer = this.kickSampleBuffer;
            source.connect(this.callbacks.mixerNodes.kick);
            source.start(time);
        } else {
            const osc = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();
            osc.connect(gain);
            gain.connect(this.callbacks.mixerNodes.kick);
            osc.frequency.setValueAtTime(150, time);
            gain.gain.setValueAtTime(1.0, time);
            osc.frequency.exponentialRampToValueAtTime(0.01, time + 0.15);
            gain.gain.exponentialRampToValueAtTime(0.001, time + 0.15);
            osc.start(time);
            osc.stop(time + 0.2);
        }
    }

    createSnareSound() {
        const time = this.audioContext.currentTime;
        if (this.snareSampleBuffer) {
            const source = this.audioContext.createBufferSource();
            source.buffer = this.snareSampleBuffer;
            source.connect(this.callbacks.mixerNodes.snare);
            source.start(time);
        } else {
            const noiseBuffer = this.audioContext.createBuffer(1, this.audioContext.sampleRate * 0.2, this.audioContext.sampleRate);
            const output = noiseBuffer.getChannelData(0);
            for (let i = 0; i < noiseBuffer.length; i++) output[i] = Math.random() * 2 - 1;
            
            const noiseSource = this.audioContext.createBufferSource();
            noiseSource.buffer = noiseBuffer;
            const noiseFilter = this.audioContext.createBiquadFilter();
            noiseFilter.type = 'highpass';
            noiseFilter.frequency.setValueAtTime(1000, time);
            const noiseGain = this.audioContext.createGain();
            
            noiseSource.connect(noiseFilter);
            noiseFilter.connect(noiseGain);
            noiseGain.connect(this.callbacks.mixerNodes.snare);
            
            noiseGain.gain.setValueAtTime(1.0, time);
            noiseGain.gain.exponentialRampToValueAtTime(0.01, time + 0.1);
            noiseSource.start(time);
            noiseSource.stop(time + 0.15);
        }
    }

    createHatSound() {
        const time = this.audioContext.currentTime;
        if (this.hatSampleBuffer) {
            const source = this.audioContext.createBufferSource();
            source.buffer = this.hatSampleBuffer;
            source.connect(this.callbacks.mixerNodes.hat);
            source.start(time);
        } else {
            const noiseBuffer = this.audioContext.createBuffer(1, this.audioContext.sampleRate * 0.1, this.audioContext.sampleRate);
            const output = noiseBuffer.getChannelData(0);
            for (let i = 0; i < noiseBuffer.length; i++) output[i] = Math.random() * 2 - 1;

            const noiseSource = this.audioContext.createBufferSource();
            noiseSource.buffer = noiseBuffer;
            const noiseFilter = this.audioContext.createBiquadFilter();
            noiseFilter.type = 'highpass';
            noiseFilter.frequency.value = 8000;
            const noiseGain = this.audioContext.createGain();

            noiseSource.connect(noiseFilter);
            noiseFilter.connect(noiseGain);
            noiseGain.connect(this.callbacks.mixerNodes.hat);

            noiseGain.gain.setValueAtTime(1.0, time);
            noiseGain.gain.exponentialRampToValueAtTime(0.001, time + 0.05);
            noiseSource.start(time);
            noiseSource.stop(time + 0.1);
        }
    }

    loadSample(file, targetType, nameDisplayElement) {
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            this.audioContext.decodeAudioData(e.target.result, (buffer) => {
                if (targetType === 'kick') this.kickSampleBuffer = buffer;
                else if (targetType === 'snare') this.snareSampleBuffer = buffer;
                else if (targetType === 'hat') this.hatSampleBuffer = buffer;
                
                nameDisplayElement.textContent = file.name;
                nameDisplayElement.style.color = 'var(--color-neon-green)';
            }, (err) => { alert(`Error decoding audio data: ${err}`); });
        };
        reader.readAsArrayBuffer(file);
    }

    resetSampleUI(nameDisplayElement, inputElement) {
        nameDisplayElement.textContent = "Default";
        nameDisplayElement.style.color = 'var(--color-text-secondary)';
        inputElement.value = null;
    }

    // --- Sequencer Data & UI ---

    createEmptyStep() {
        return { baseNoteName: null, baseFreq: null, octaveShift: 0, noteLabel: null, kick: false, snare: false, hat: false, volume: 1.0 };
    }

    initializeSequencerPattern() {
        // Luodaan askeleet (oletuksena 8 kpl)
        this.sequencerPattern = Array.from({ length: this.SEQ_LENGTH }, (_, i) => {
            const step = this.createEmptyStep();

            // 1. Hi-hat jokaisessa askeleessa
            step.hat = true;

            // 2. Kick ensimmäisessä askeleessa (indeksi 0)
            if (i === 0) {
                step.kick = true;
            }

            // 3. Snare viidennessä askeleessa (indeksi 4)
            if (i === 4) {
                step.snare = true;
            }

            return step;
        });
    }

    changeSeqLength(newLength) {
        this.SEQ_LENGTH = newLength;
        const oldPattern = this.sequencerPattern;
        this.sequencerPattern = Array.from({ length: this.SEQ_LENGTH }, (_, i) => oldPattern[i] || this.createEmptyStep());
        if (this.sequencerPlaying) { this.toggleSequencer(); } // Stop to reset
        this.currentSeqStep = 0;
        this.setCurrentEditStep(null);
        this.initializeSequencerUI();
    }

    initializeSequencerUI() {
        this.ui.sequencerStepsContainer.innerHTML = '';
        this.seqStepElements = [];
        for (let i = 0; i < this.SEQ_LENGTH; i++) {
            const stepDiv = document.createElement('div');
            stepDiv.className = 'seq-step';
            stepDiv.dataset.index = i;
            
            const mainPart = document.createElement('div');
            mainPart.className = 'seq-step-main';

            const notePart = document.createElement('div');
            notePart.classList.add('seq-step-note');
            notePart.addEventListener('click', () => this.setCurrentEditStep(i));
            mainPart.appendChild(notePart);
            
            const drumsContainer = document.createElement('div');
            drumsContainer.className = 'seq-step-drums-container';
            ['kick', 'snare', 'hat'].forEach(drumType => {
                const drumPart = document.createElement('div');
                drumPart.classList.add('seq-step-drum', drumType);
                drumPart.textContent = drumType.substring(0,1).toUpperCase();
                drumPart.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const stepIndex = parseInt(stepDiv.dataset.index);
                    this.sequencerPattern[stepIndex][drumType] = !this.sequencerPattern[stepIndex][drumType];
                    this.updateSequencerStepUI(stepIndex);
                });
                drumsContainer.appendChild(drumPart);
            });
            mainPart.appendChild(drumsContainer);
            stepDiv.appendChild(mainPart);

            const volSlider = document.createElement('input');
            volSlider.type = 'range';
            volSlider.className = 'seq-step-volume';
            volSlider.min = 0; volSlider.max = 1; volSlider.step = 0.05;
            volSlider.value = this.sequencerPattern[i]?.volume ?? 1.0;
            volSlider.addEventListener('input', (e) => {
                this.sequencerPattern[i].volume = parseFloat(e.target.value);
            });
            stepDiv.appendChild(volSlider);

            this.ui.sequencerStepsContainer.appendChild(stepDiv); 
            this.seqStepElements.push(stepDiv); 
            this.updateSequencerStepUI(i);
        }
    }

    setCurrentEditStep(index) {
        if (this.currentEditStepIndex !== null && this.seqStepElements[this.currentEditStepIndex]) {
            this.seqStepElements[this.currentEditStepIndex].classList.remove('selected-for-edit');
        }
        this.currentEditStepIndex = index;
        if (this.currentEditStepIndex !== null && this.seqStepElements[this.currentEditStepIndex]) {
            this.seqStepElements[this.currentEditStepIndex].classList.add('selected-for-edit');
        }
    }

    updateSequencerStepUI(index) {
        if (index >= this.seqStepElements.length) return;
        const stepDiv = this.seqStepElements[index]; 
        const notePart = stepDiv.querySelector('.seq-step-note'); 
        const stepData = this.sequencerPattern[index];
        if (stepData.baseNoteName) { 
            notePart.innerHTML = `<span>${stepData.noteLabel}</span><span class="step-octave">o:${stepData.octaveShift >= 0 ? '+' : ''}${stepData.octaveShift}</span>`; 
            notePart.classList.remove('empty'); 
        } else { 
            notePart.innerHTML = '<span>---</span>'; 
            notePart.classList.add('empty'); 
        }
        stepDiv.querySelector('.kick').classList.toggle('active', stepData.kick);
        stepDiv.querySelector('.snare').classList.toggle('active', stepData.snare);
        stepDiv.querySelector('.hat').classList.toggle('active', stepData.hat);
        stepDiv.classList.toggle('empty', !stepData.baseNoteName && !stepData.kick && !stepData.snare && !stepData.hat);
    }

    // --- Muokkaus (Clear / Randomize) ---

    clearSelectedStep() {
        if (this.currentEditStepIndex !== null) {
            const drums = {
                kick: this.sequencerPattern[this.currentEditStepIndex].kick,
                snare: this.sequencerPattern[this.currentEditStepIndex].snare,
                hat: this.sequencerPattern[this.currentEditStepIndex].hat,
                volume: 1.0
            };
            this.sequencerPattern[this.currentEditStepIndex] = { ...this.createEmptyStep(), ...drums };
            this.seqStepElements[this.currentEditStepIndex].querySelector('.seq-step-volume').value = 1.0;
            this.updateSequencerStepUI(this.currentEditStepIndex);
        }
    }

    clearAllSteps() {
        if (confirm('Are you sure you want to clear the entire sequence?')) {
            this.initializeSequencerPattern();
            for(let i=0; i < this.SEQ_LENGTH; i++) {
                this.seqStepElements[i].querySelector('.seq-step-volume').value = 1.0;
                this.updateSequencerStepUI(i);
            }
        }
    }

    randomizeSequencer() {
        const availablePianoNotes = this.callbacks.getAvailablePianoNotes();
        const chordTypes = { major: [0, 4, 7], minor: [0, 3, 7], dom7: [0, 4, 7, 10], major7: [0, 4, 7, 11], minor7: [0, 3, 7, 10], dim: [0, 3, 6] };
        const chordTypeNames = Object.keys(chordTypes);

        this.setCurrentEditStep(null);
        const rootNotePoolIndex = Math.floor(Math.random() * availablePianoNotes.length);
        const rootNoteDataFromPool = availablePianoNotes[rootNotePoolIndex];
        const rootOctaveForChord = Math.floor(Math.random() * 7) - 3; // -3 to +3
        const randomChordTypeName = chordTypeNames[Math.floor(Math.random() * chordTypeNames.length)];
        const intervals = chordTypes[randomChordTypeName];
        
        const chordNotesForArp = [];
        
        for (const interval of intervals) {
            let targetPoolIndex = rootNotePoolIndex + interval;
            if (targetPoolIndex >= availablePianoNotes.length) targetPoolIndex %= availablePianoNotes.length;
            if (availablePianoNotes[targetPoolIndex]) {
                chordNotesForArp.push({ ...availablePianoNotes[targetPoolIndex], octaveShift: rootOctaveForChord });
            }
        }
        if (chordNotesForArp.length === 0) chordNotesForArp.push({...rootNoteDataFromPool, octaveShift: rootOctaveForChord });

        for (let i = 0; i < this.SEQ_LENGTH; i++) {
            const existingDrums = { kick: this.sequencerPattern[i].kick, snare: this.sequencerPattern[i].snare, hat: this.sequencerPattern[i].hat };
            const existingVolume = { volume: this.sequencerPattern[i].volume };
            
            if (Math.random() < 0.85) {
                const arpNoteData = chordNotesForArp[i % chordNotesForArp.length];
                let currentArpNoteOctave = arpNoteData.octaveShift;
                if (Math.random() < 0.3) {
                    const octaveChange = Math.random() < 0.5 ? -1 : 1;
                    let newOctave = currentArpNoteOctave + octaveChange;
                    if (newOctave > 3) newOctave = 3; if (newOctave < -3) newOctave = -3;
                    currentArpNoteOctave = newOctave;
                }
                this.sequencerPattern[i] = { 
                    baseNoteName: arpNoteData.baseNoteName, 
                    baseFreq: arpNoteData.baseFreq, 
                    octaveShift: currentArpNoteOctave, 
                    noteLabel: arpNoteData.noteLabel, 
                    ...existingDrums, ...existingVolume 
                };
            } else {
                this.sequencerPattern[i] = { ...this.createEmptyStep(), ...existingDrums, ...existingVolume };
            }
            this.updateSequencerStepUI(i);
        }

        if (this.sequencerPlaying) {
            clearTimeout(this.seqTimerId);
            this.currentSeqStep = 0;
            this.currentGateStep = 0;
            this.sequencerStep();
        }
    }

    // --- Sequencer Loop (The Heart) ---

    toggleSequencer() {
        this.sequencerPlaying = !this.sequencerPlaying;
        this.setCurrentEditStep(null);
        
        if (this.sequencerPlaying) {
            if (this.audioContext.state === 'suspended') {
                this.audioContext.resume().then(() => {
                    this.startLoop();
                });
            } else {
                this.startLoop();
            }
        } else {
            this.stopLoop();
        }
    }

    startLoop() {
        this.currentSeqStep = 0;
        this.currentGateStep = 0;
        this.ui.playStopSequencer.textContent = 'Stop Sequencer';
        this.ui.playStopSequencer.classList.add('active');
        this.sequencerStep();
    }

    stopLoop() {
        clearTimeout(this.seqTimerId);
        this.seqTimerId = null;
        
        const effects = this.callbacks.effects;
        
        if (effects.tremolo.active) {
            effects.tremolo.nodes.tremoloGain.gain.cancelScheduledValues(this.audioContext.currentTime);
            effects.tremolo.nodes.tremoloGain.gain.setTargetAtTime(1.0, this.audioContext.currentTime, 0.01);
        }
        
        this.ui.playStopSequencer.textContent = 'Play Sequencer';
        this.ui.playStopSequencer.classList.remove('active');
        this.seqStepElements.forEach(el => el.classList.remove('playing'));
    }

    sequencerStep() {
        if (!this.sequencerPlaying) return;

        const time = this.audioContext.currentTime;
        const ticksPerMainStep = 16 / this.SEQ_LENGTH;
        const timePer16thNote = (60.0 / this.bpm) / 4.0;
        const effects = this.callbacks.effects;

        // --- Gate Logic ---
        if (effects.tremolo.active) {
            const gain = effects.tremolo.nodes.tremoloGain.gain;
            const depthTarget = 1.0 - parseFloat(this.ui.tremoloDepth.value);
            gain.cancelScheduledValues(time);
            if (this.tremoloGatePattern[this.currentGateStep]) {
                const gateLengthMultiplier = parseFloat(this.ui.tremoloGateLength.value);
                const onDuration = timePer16thNote * gateLengthMultiplier;
                gain.setTargetAtTime(1.0, time, 0.002);
                if (gateLengthMultiplier < 1.0) {
                   gain.setTargetAtTime(depthTarget, time + onDuration, 0.002);
                }
            } else {
                gain.setTargetAtTime(depthTarget, time, 0.002);
            }
        }

        if (effects.fxGate.active) {
            const destination = this.ui.fxGateDestination.value;
            const target = effects.fxGate.getTarget(destination);
            if (target && target.param) {
                const gain = target.param;
                const baseValue = target.baseValue;
                const depthTarget = baseValue * (1.0 - parseFloat(this.ui.fxGateDepth.value));
                gain.cancelScheduledValues(time);
                 if (this.fxGatePattern[this.currentGateStep]) {
                    const gateLengthMultiplier = parseFloat(this.ui.fxGateGateLength.value);
                    const onDuration = timePer16thNote * gateLengthMultiplier;
                    gain.setTargetAtTime(baseValue, time, 0.002);
                    if (gateLengthMultiplier < 1.0) {
                       gain.setTargetAtTime(depthTarget, time + onDuration, 0.002);
                    }
                } else {
                    gain.setTargetAtTime(depthTarget, time, 0.002);
                }
            }
        }

        // --- Main Sequencer Logic ---
        if (this.currentGateStep % ticksPerMainStep === 0) {
            this.currentSeqStep = Math.floor(this.currentGateStep / ticksPerMainStep);
            
            this.seqStepElements.forEach(el => el.classList.remove('playing'));
            if (this.seqStepElements[this.currentSeqStep]) {
                this.seqStepElements[this.currentSeqStep].classList.add('playing');
            }

            const stepData = this.sequencerPattern[this.currentSeqStep];
            if (stepData) {
                if (stepData.baseNoteName && stepData.baseFreq != null) {
                    const stepVolume = stepData.volume;
                    const uniqueId = `${stepData.baseNoteName}_seq`;
                    
                    this.callbacks.playNote(
                        stepData.baseNoteName, 
                        stepData.baseFreq, 
                        100, 
                        null, 
                        true, 
                        stepVolume, 
                        stepData.octaveShift 
                    );

                    const noteDurationSeconds = (timePer16thNote * ticksPerMainStep) * 0.98;
                    setTimeout(() => {
                        this.callbacks.stopNote(uniqueId);
                    }, noteDurationSeconds * 1000);
                }

                if (stepData.kick) this.createKickSound();
                if (stepData.snare) this.createSnareSound();
                if (stepData.hat) this.createHatSound();
            }
        }

        // --- Advance Clocks ---
        this.currentGateStep = (this.currentGateStep + 1) % 16;
        this.seqTimerId = setTimeout(() => this.sequencerStep(), timePer16thNote * 1000);
    }

    // --- Gate UI Helper ---
    
    initializeGateUI(container, patternArray) {
        container.innerHTML = '';
        for (let i = 0; i < 16; i++) {
            const step = document.createElement('div');
            step.className = 'gate-step';
            step.dataset.index = i;
            if (patternArray[i]) step.classList.add('active');
            
            step.addEventListener('click', () => {
                patternArray[i] = !patternArray[i];
                step.classList.toggle('active', patternArray[i]);
            });
            container.appendChild(step);
        }
    }
    
    updateGateUI(container, patternArray) {
        const steps = container.children;
        for (let i = 0; i < steps.length; i++) {
            steps[i].classList.toggle('active', patternArray[i]);
        }
    }

    // --- Data Export/Import Helpers ---

    getData() {
        return {
            bpm: this.bpm,
            volume: this.ui.sequencerVolume.value,
            length: this.SEQ_LENGTH,
            pattern: this.sequencerPattern.map(p => p ? {...p} : null),
            kickSample: this.bufferToData(this.kickSampleBuffer),
            snareSample: this.bufferToData(this.snareSampleBuffer),
            hatSample: this.bufferToData(this.hatSampleBuffer),
            tremoloGate: [...this.tremoloGatePattern],
            fxGate: [...this.fxGatePattern]
        };
    }

    applyData(data) {
        if (!data) return;
        
        if (data.kickSample) this.kickSampleBuffer = this.dataToBuffer(data.kickSample);
        if (data.snareSample) this.snareSampleBuffer = this.dataToBuffer(data.snareSample);
        if (data.hatSample) this.hatSampleBuffer = this.dataToBuffer(data.hatSample);
        
        this.ui.kickSampleName.textContent = this.kickSampleBuffer ? "Loaded Sample" : "Default";
        this.ui.snareSampleName.textContent = this.snareSampleBuffer ? "Loaded Sample" : "Default";
        this.ui.hatSampleName.textContent = this.hatSampleBuffer ? "Loaded Sample" : "Default";

        this.ui.bpmSlider.value = data.bpm || 120; 
        this.bpm = data.bpm || 120;
        this.ui.sequencerVolume.value = data.volume || 0.7;
        
        const newLength = data.length || 8;
        if (this.SEQ_LENGTH !== newLength) {
            this.ui.numStepsSelect.value = newLength;
            this.changeSeqLength(newLength);
        }
        
        if (data.pattern) {
            this.sequencerPattern = Array.from({ length: this.SEQ_LENGTH }, (_, i) => (data.pattern[i]) || this.createEmptyStep());
            this.initializeSequencerUI();
        }

        if (data.tremoloGate) {
            this.tremoloGatePattern = [...data.tremoloGate];
            this.updateGateUI(this.ui.tremoloGateStepsContainer, this.tremoloGatePattern);
        }
        if (data.fxGate) {
            this.fxGatePattern = [...data.fxGate];
            this.updateGateUI(this.ui.fxGateStepsContainer, this.fxGatePattern);
        }
    }

    bufferToData(buffer) {
        if (!buffer) return null;
        const channels = [];
        for (let i = 0; i < buffer.numberOfChannels; i++) {
            channels.push(Array.from(buffer.getChannelData(i)));
        }
        return { sampleRate: buffer.sampleRate, length: buffer.length, numberOfChannels: buffer.numberOfChannels, channels: channels };
    }

    dataToBuffer(data) {
        if (!data || !data.channels || data.channels.length === 0) return null;
        try {
            const buffer = this.audioContext.createBuffer(data.numberOfChannels, data.length, data.sampleRate);
            for (let i = 0; i < data.numberOfChannels; i++) {
                buffer.copyToChannel(Float32Array.from(data.channels[i]), i);
            }
            return buffer;
        } catch (e) {
            console.error("Error creating buffer from data:", e);
            return null;
        }
    }
}
