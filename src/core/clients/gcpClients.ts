/**
 * gcpClients.ts
 * version 1.0.0
 * 
 * Created on the 14/05/2023
 */

import textToSpeech from '@google-cloud/text-to-speech';
import serviceAccount from "./serviceAccountKey.json";
import {auth} from 'google-auth-library';


export const gcpAuthClient = auth.fromJSON(serviceAccount);
export const gcpTtoSpeechClient = new textToSpeech.TextToSpeechClient({ 
    authClient: gcpAuthClient 
});