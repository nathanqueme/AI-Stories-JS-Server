/**
 * GoogleCloudPlatform.ts
 * version 1.0.0
 * 
 * Created on the 14/05/2023
 */

import { google } from '@google-cloud/text-to-speech/build/protos/protos';
import { VoiceNameType } from '../../types';
import { gcpTtoSpeechClient } from '../clients';


interface GCPVoice {
    name: "en-US-Studio-M" | "en-US-Studio-O"
    ssmlGender: "SSML_VOICE_GENDER_UNSPECIFIED" | "MALE" | "FEMALE" | "NEUTRAL" | null | undefined
}

export async function getTextToSpeech(text: string, voice: VoiceNameType) {
    function useVoice(voice: VoiceNameType) {
        const us_voices: { [key: string]: GCPVoice } = {
            "samuel": {
                name: "en-US-Studio-M",
                ssmlGender: "MALE"
            },
            "lily": {
                name: "en-US-Studio-O",
                ssmlGender: "FEMALE"
            },
        }
        return us_voices[voice]
    };
    const { name, ssmlGender } = useVoice(voice),
        speakingRate = 0.85
    const request: google.cloud.texttospeech.v1.ISynthesizeSpeechRequest = {
        input: { text: text },
        voice: { languageCode: 'en-US', ssmlGender: ssmlGender, name: name },
        audioConfig: { audioEncoding: 'MP3', speakingRate },
    };

    const [response] = await gcpTtoSpeechClient.synthesizeSpeech(request);
    return response
}