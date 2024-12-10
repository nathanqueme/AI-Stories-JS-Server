/**
 * signatures.ts
 * version 1.0.0
 * 
 * Created on the 21/04/2023
 * 
 */

import CryptoJS from "crypto-js"

const config = {
    secret: process.env.SIGNATURE_SECRET ?? ""
}
const { secret } = config

/** Generates HMAC signature for the data */
export function generateHMACSignature(data: any) {
    try {
        const json = JSON.stringify(data)
        const signature = CryptoJS.HmacSHA256(json, secret).toString();
        return signature
    } catch (error) {
        return null
    }
}
