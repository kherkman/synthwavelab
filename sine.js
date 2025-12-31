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
            // --- SAMPLERI-TILA (Sample-pohjainen additiivinen synteesi) ---
            // Käydään läpi kaikki harmoniset aallot kuten syntetisaattorissakin,
            // mutta oskillaattorin sijaan käytetään sine.wav-samplea.
            
            for (let i = 0; i < globals.numHarmonics; i++) {
                // Lasketaan tämän kerroksen taajuus FreqMul-arvon perusteella
                const harmonicFreq = freq * globals.freqMultipliers[i];
                
                // Nyquist-tarkistus (ettei ylitetä puolta näytteenottotaajuudesta)
                if (harmonicFreq <= 0 || harmonicFreq > audioContext.sampleRate / 2) continue;

                // Luodaan tarvittavat noodit tälle kerrokselle
                const source = audioContext.createBufferSource();
                const phaseDelay = audioContext.createDelay(0.1); // Max 0.1s viive riittää vaiheenkääntöön
                const harmonicGain = audioContext.createGain();

                // Asetetaan puskuri
                source.buffer = audioBuffer;

                // Lasketaan toistonopeus: (Tavoitetaajuus / Perustaajuus)
                source.playbackRate.value = harmonicFreq / BASE_FREQ;

                // Asetetaan Pitch Bend (Detune)
                source.detune.setValueAtTime(globals.pitchBendCents, time);

                // Loop-asetukset (sine.wav optimoidut loop-pisteet)
                source.loop = true;
                source.loopStart = 0.3;
                source.loopEnd = 0.93;

                // Asetetaan amplitudi (Amp-liukusäädin)
                harmonicGain.gain.setValueAtTime(globals.amplitudes[i], time);

                // Lasketaan vaiheensiirto (Phase-liukusäädin)
                // Viive (s) = Vaihe (rad) / (2 * PI * Taajuus)
                const phaseRad = globals.phasesRad[i] % (2 * Math.PI);
                let delayAmount = 0;
                if (phaseRad > 0) {
                    delayAmount = phaseRad / (2 * Math.PI * harmonicFreq);
                }
                phaseDelay.delayTime.setValueAtTime(delayAmount, time);

                // Kytkennät: Source -> Delay -> HarmonicGain -> MainADSRGain
                source.connect(phaseDelay);
                phaseDelay.connect(harmonicGain);
                harmonicGain.connect(noteData.gainNode);

                // Käynnistys
                source.start(time);
                
                // Tallennetaan lähde, jotta se voidaan pysäyttää
                noteData.nodes.push(source);
            }

        } else {
            // --- SYNTETISAATTORI-TILA (Additiivinen fallback) ---
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
