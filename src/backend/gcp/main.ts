/**
 * GoogleCloudPlatform.ts
 * version 1.0.0
 * 
 * Created on the 14/05/2023
 */

import { google } from '@google-cloud/text-to-speech/build/protos/protos';
import { VoiceNameType } from '../../types';
import { gcpTtoSpeechClient } from '../configs';


interface GCPVoice {
    name: "en-US-Studio-M" | "en-US-Studio-O"
    ssmlGender: "SSML_VOICE_GENDER_UNSPECIFIED" | "MALE" | "FEMALE" | "NEUTRAL" | null | undefined
}

/**
 * 
 * WARNING/LIMITATION: Google's API does not support text of about more than 1200 characters or
 * an output audio file of more than 1 minute long with STUDIO voices (most natural & expensive 
 * voice). Providing text longer over this lenght limit will throw the error 'Input size limit 
 * exceeded for Studio Voice.'
 * 
 * WORKAROUND: Split the text in smal batches then get speech for all of them and finally merge all
 * audio buffers. To create batches split the text by sentences so by preserving its punctuation
 * and make sure batches are less than 1000 characters long (1000 instead of 1200 to be sure its ok)
 *          
 */
export async function getTextToSpeech(text: string, voice: VoiceNameType) {
    // PARAMS 
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
        // slow down "speakingRate" so audio files are a bit longer
        audioConfig: { audioEncoding: 'MP3', speakingRate },
    };

    // Performs the text-to-speech request
    const [response] = await gcpTtoSpeechClient.synthesizeSpeech(request);
    return response
}