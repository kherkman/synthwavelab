/**
 * Synthwave Lab - MIDI Module
 * Siirretty index.html:stä omaan tiedostoonsa.
 * Toimii ilman palvelinta globaalin alustusfunktion kautta.
 */

window.initSynthLabMIDI = (audioContext, ui, synthFunctions) => {
    'use strict';

    // --- MIDI MUUTTUJAT ---
    let midiAccess = null;
    let midiInEnabled = false;
    let midiOutEnabled = false;
    let selectedMidiInput = null;
    let selectedMidiOutput = null;

    // Destrukturoidaan tarvittavat funktiot syntetisaattorin pääohjelmasta
    const { playNote, stopNote, getActiveNotes, setGlobalPitchBend, getPitchBendRange } = synthFunctions;

    // --- APUFUNKTIOT ---
    
    function midiNoteToFreq(note) {
        return 440 * Math.pow(2, (note - 69) / 12);
    }

    function sendMidiMessage(messageArray) {
        if (midiOutEnabled && selectedMidiOutput) {
            selectedMidiOutput.send(messageArray);
        }
    }

    // --- MIDI-VIESTIEN KÄSITTELY ---

    function onMIDIMessage(event) {
        const command = event.data[0] & 0xf0;
        const note = event.data[1];
        const velocity = (event.data.length > 2) ? event.data[2] : 0; 

        switch (command) {
            case 0x90: // Note On
                if (velocity > 0) {
                    playNote(note, midiNoteToFreq(note), velocity);
                } else {
                    stopNote(note); // Jotkut laitteet lähettävät Note On velocity 0 sijasta Note Off
                }
                break;
            case 0x80: // Note Off
                stopNote(note);
                break;
            case 0xE0: // Pitch Bend
                const bendValue = (velocity << 7) | note;
                const normalizedBend = (bendValue - 8192) / 8192;
                const bendCents = normalizedBend * parseFloat(ui.pitchBendRange.value) * 100;
                
                // Päivitetään globaali vire
                setGlobalPitchBend(bendCents);
                
                // Päivitetään parhaillaan soivat äänet
                getActiveNotes().forEach(noteData => {
                    if (noteData.isSampler) return;
                    noteData.components.forEach(cmp => {
                        cmp.osc.detune.setTargetAtTime(bendCents, audioContext.currentTime, 0.01);
                    });
                });
                break;
            case 0xB0: // Control Change (CC)
                const ccNumber = note;
                const ccValue = velocity;
                
                if (ccNumber === 1) { // Mod Wheel
                    const destination = ui.modWheelDestination.value;
                    if (destination === 'none' || !ui[destination]) break;
                    
                    const targetSlider = ui[destination];
                    const min = parseFloat(targetSlider.min);
                    const max = parseFloat(targetSlider.max);
                    const normalizedValue = ccValue / 127;
                    
                    let newValue = min + (normalizedValue * (max - min));
                    
                    // Tarkistetaan askellus (step)
                    if (targetSlider.step && targetSlider.step.includes('.')) {
                        newValue = parseFloat(newValue.toFixed(3));
                    } else {
                        newValue = Math.round(newValue);
                    }

                    targetSlider.value = newValue;
                    // Laukaistaan input-tapahtuma, jotta syntetisaattori reagoi muutokseen
                    targetSlider.dispatchEvent(new Event('input'));
                }
                break;
        }
    }

    // --- MIDI-LAITTEIDEN ALUSTUS ---

    function setupMIDI() {
        if (!navigator.requestMIDIAccess) {
            ui.midiStatus.textContent = "MIDI not supported by browser.";
            return;
        }

        navigator.requestMIDIAccess({ sysex: true }).then(
            (access) => {
                midiAccess = access;
                ui.midiStatus.textContent = "MIDI Ready.";
                
                // Täytetään sisääntulolista
                ui.midiDeviceSelect.innerHTML = '';
                if (midiAccess.inputs.size === 0) {
                    ui.midiDeviceSelect.innerHTML = '<option value="">No MIDI inputs</option>';
                } else {
                    midiAccess.inputs.forEach(input => {
                        ui.midiDeviceSelect.appendChild(new Option(input.name, input.id));
                    });
                    selectedMidiInput = midiAccess.inputs.get(ui.midiDeviceSelect.value);
                }
                
                // Täytetään ulostulolista
                ui.midiOutDeviceSelect.innerHTML = '';
                if (midiAccess.outputs.size === 0) {
                    ui.midiOutDeviceSelect.innerHTML = '<option value="">No MIDI outputs</option>';
                } else {
                    midiAccess.outputs.forEach(output => {
                        ui.midiOutDeviceSelect.appendChild(new Option(output.name, output.id));
                    });
                    selectedMidiOutput = midiAccess.outputs.get(ui.midiOutDeviceSelect.value);
                }
            },
            () => {
                ui.midiStatus.textContent = "MIDI Access Denied.";
            }
        );
    }

    // --- TAPAHTUMANKUUNTELIJAT (UI) ---

    ui.toggleMidiInBtn.addEventListener('click', () => {
        midiInEnabled = !midiInEnabled;
        if (midiInEnabled && selectedMidiInput) {
            selectedMidiInput.onmidimessage = onMIDIMessage;
            ui.toggleMidiInBtn.classList.add('active');
            ui.toggleMidiInBtn.textContent = 'MIDI In Enabled';
        } else {
            if (selectedMidiInput) selectedMidiInput.onmidimessage = null;
            ui.toggleMidiInBtn.classList.remove('active');
            ui.toggleMidiInBtn.textContent = 'Enable MIDI In';
        }
    });

    ui.toggleMidiOutBtn.addEventListener('click', () => {
        midiOutEnabled = !midiOutEnabled;
        ui.toggleMidiOutBtn.classList.toggle('active', midiOutEnabled);
        ui.toggleMidiOutBtn.textContent = midiOutEnabled ? 'MIDI Out Enabled' : 'Enable MIDI Out';
    });

    ui.midiDeviceSelect.addEventListener('change', (e) => {
        if (selectedMidiInput) selectedMidiInput.onmidimessage = null;
        selectedMidiInput = midiAccess ? midiAccess.inputs.get(e.target.value) : null;
        if (midiInEnabled && selectedMidiInput) {
            selectedMidiInput.onmidimessage = onMIDIMessage;
        }
    });

    ui.midiOutDeviceSelect.addEventListener('change', (e) => {
        selectedMidiOutput = midiAccess ? midiAccess.outputs.get(e.target.value) : null;
    });

    // Käynnistetään MIDI-haku heti
    setupMIDI();

    // Palautetaan rajapinta ulkopuoliseen käyttöön
    return {
        sendMidiMessage: sendMidiMessage,
        refreshDevices: setupMIDI,
        isMidiInActive: () => midiInEnabled,
        isMidiOutActive: () => midiOutEnabled
    };
};