/**
 * audioProcessing.ts
 * version 1.0.0
 * 
 * Created on the 20/07/2023
 */

export async function concatenateAudioBuffers(audioBuffers: Buffer[]) {
    const combinedBufferSize = audioBuffers
        .flatMap(el => { return el.length })
        .reduce((acc, cur) => { return acc += cur }, 0)

    var concatenatedBuffer = Buffer.alloc(combinedBufferSize);
    let offset = 0;

    for (const audioBuffer of audioBuffers) {
        audioBuffer.copy(concatenatedBuffer, offset);
        offset += audioBuffer.length;
    };

    return concatenatedBuffer;
}