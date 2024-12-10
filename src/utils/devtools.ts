/**
 * devtools.ts
 * version 1.0.0
 * 
 * Created on the 01/05/2023
 */

import CONSTANTS from "../constants"

const { LOGS } = CONSTANTS

export const devtools = {
    /** Logs a message to the console if the environment is not in production.
     * @param message The message to log.
     * @returns void
    */
    log(message: any) {
        if (LOGS) console.log(message)
    },
    time(label?: string) {
        if (LOGS) console.time(label)
    }, 
    timeEnd(label?: string) {
        if (LOGS) console.timeEnd(label)
    },
}