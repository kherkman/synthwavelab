/**
 * sine.js - Synthwave Lab Audio Engine Module
 * Sisältää näytepohjaisen samplereosastot (ensijainen) ja 
 * additiivisen synteesin (varajärjestelmä).
 */

const SineEngine = (() => {
    let audioBuffer = null;
    let isSampleLoaded = false;
    const BASE_FREQ = 261.63; // C4 taajuus, jolla sine.wav on tallennettu

    // Ladataan äänitiedosto heti kun moduuli ladataan
    async function init(audioContext) {
        try {
            const response = await fetch('sine.wav');
            if (!response.ok) throw new Error('sine.wav ei löytynyt');
            const arrayBuffer = await response.arrayBuffer();
            audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
            isSampleLoaded = true;
            console.log("SineEngine: sine.wav ladattu. Käytetään sampleri-tilaa.");
        } catch (err) {
            isSampleLoaded = false;
            console.warn("SineEngine: sine.wav ei saatu ladattua. Käytetään syntetisaattori-tilaa.", err);
        }
    }

    /**
     * Soittaa nuotin joko sampleria tai syntetisaattoria käyttäen.
     */
    function play(audioContext, freq, velocity, adsr, globals, targetNode) {
        const time = audioContext.currentTime;
        const noteData = {
            nodes: [],
            gainNode: audioContext.createGain(),
            type: isSampleLoaded ? 'sampler' : 'synth'
        };

        // Lasketaan voimakkuus ADSR:n ja velositeetin mukaan
        const peakGain = ((1 - adsr.velSens) + (adsr.velSens * (velocity / 127)));
        const sustainGain = peakGain * adsr.sustain;

        noteData.gainNode.gain.setValueAtTime(0, time);
        noteData.gainNode.gain.linearRampToValueAtTime(peakGain, time + adsr.attack);
        noteData.gainNode.gain.linearRampToValueAtTime(sustainGain, time + adsr.attack + adsr.decay);
        noteData.gainNode.connect(targetNode);

        if (isSampleLoaded) {
            // SAMPLERI-TILA (sine.wav)
            const source = audioContext.createBufferSource();
            source.buffer = audioBuffer;
            
            // Lasketaan toistonopeus suhteessa C4-nuottiin
            // playbackRate = tavoitetaajuus / perustaajuus
            source.playbackRate.value = freq / BASE_FREQ;

            // Loop-asetukset: 0.3s - 0.93s
            source.loop = true;
            source.loopStart = 0.3;
            source.loopEnd = 0.93;

            source.connect(noteData.gainNode);
            source.start(time);
            noteData.nodes.push(source);

        } else {
            // SYNTETISAATTORI-TILA (Additiivinen fallback)
            for (let i = 0; i < globals.numHarmonics; i++) {
                const osc = audioContext.createOscillator();
                const phaseDelay = audioContext.createDelay(0.1);
                const cmpGain = audioContext.createGain();

                osc.type = 'sine';
                // Detune ja taajuus
                const harmonicFreq = freq * globals.freqMultipliers[i];
                if (harmonicFreq <= 0 || harmonicFreq > audioContext.sampleRate / 2) continue;
                
                osc.frequency.setValueAtTime(harmonicFreq, time);
                osc.detune.setValueAtTime(globals.pitchBendCents, time);

                // Vaiheensiirto
                const phaseRad = globals.phasesRad[i] % (2 * Math.PI);
                const delayAmount = phaseRad / (2 * Math.PI * harmonicFreq);
                phaseDelay.delayTime.setValueAtTime(delayAmount > 0 ? delayAmount : 0, time);

                cmpGain.gain.setValueAtTime(globals.amplitudes[i], time);

                osc.connect(phaseDelay);
                phaseDelay.connect(cmpGain);
                cmpGain.connect(noteData.gainNode);

                osc.start(time);
                noteData.nodes.push(osc);
            }
        }

        return noteData;
    }

    /**
     * Pysäyttää nuotin noudattaen ADSR Release -aikaa.
     */
    function stop(audioContext, noteData, adsrTime) {
        const time = audioContext.currentTime;
        const gainParam = noteData.gainNode.gain;

        gainParam.cancelScheduledValues(time);
        gainParam.setValueAtTime(gainParam.value, time);
        gainParam.linearRampToValueAtTime(0.0001, time + adsrTime);

        noteData.nodes.forEach(node => {
            if (node.stop) {
                node.stop(time + adsrTime + 0.1);
            }
        });

        // Siivotaan solmut kun ääni on vaiennut
        setTimeout(() => {
            noteData.gainNode.disconnect();
        }, (adsrTime + 0.2) * 1000);
    }

    return { init, play, stop, isSampleLoaded: () => isSampleLoaded };
})();

// Eksportoidaan globaalisti käyttöön
window.SineEngine = SineEngine;