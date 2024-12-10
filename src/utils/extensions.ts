/**
 * extensions.ts
 * version 1.0.0
 * 
 * Created on the 01/01/2023
 */

// JAVASCRIPT INSTANCE EXTENSION(S) 

declare global {
    interface String {
        /** (CUSTOM EXTENSION) 
         * - Removes all whitespace from the given text.
        */
        trimAllWhitespace(): string;
        /** (CUSTOM EXTENSION) 
         * - Returns the last character from the given text.
        */
        lastCharacter(): string; 
        /** (CUSTOM EXTENSION) 
         * - Removes the last character from the given text.
        */
        trimLastCharacter(): string; 
    }
}
String.prototype.trimAllWhitespace = function () {
    return this.replace(/\s+/g, '')
}
String.prototype.lastCharacter = function () {
    const start = this.length -1  // index of the last word 
    return this.substring(start)
}
String.prototype.trimLastCharacter = function () {
    return this.substring(0, this.length -1)
}


export {}