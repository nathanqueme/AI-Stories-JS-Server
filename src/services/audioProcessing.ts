/**
 * audioProcessing.ts
 * version 1.0.0
 * 
 * Created on the 20/07/2023
 */


/** Concatenates audio buffers into one unified stream. */
export async function concatenateAudioBuffers(audioBuffers: Buffer[]) {
    // Combine the sizes of the two audio buffers
    const combinedBufferSize = audioBuffers
        .flatMap(el => { return el.length })
        .reduce((acc, cur) => { return acc += cur }, 0)

    // Create a new buffer to hold the concatenated audio
    var concatenatedBuffer = Buffer.alloc(combinedBufferSize);

    let offset = 0; // Keeps track of the current offset in the concatenated buffer

    // Loop over each audio buffer and copy its data into the new buffer at the 
    // right position
    for (const audioBuffer of audioBuffers) {
        audioBuffer.copy(concatenatedBuffer, offset);
        offset += audioBuffer.length; // Update the offset for the next buffer
    };

    return concatenatedBuffer;
}