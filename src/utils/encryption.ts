/**
 * encryption.ts
 * version 1.0.0
 * 
 * Created on the 23/02/2023
 */

import CryptoJS from "crypto-js"

const config = {
    secret: process.env.RESPONSE_ENCRYPTION_KEY ?? "", 
    signatureSecret: process.env.SIGNATURE_SECRET ?? ""
}
const { secret, signatureSecret } = config


/** Encrypts the provided data into a string. */
export function serverSideEncryption(data: any) {
    return new Promise<string>((resolve, reject) => {
        try {
            const plaintext = JSON.stringify(data)
            const encrypted = CryptoJS.AES.encrypt(plaintext, secret)
            const encryptedData = encrypted.toString()
            resolve(encryptedData)
        } catch (error) {
            reject(error)
        }
    })
}

export function decrypt(ciphertext: string, secretKey = secret) {
    return new Promise<string>((resolve, reject) => {
        try {
            const decrypted = CryptoJS.AES.decrypt(ciphertext, secretKey);
            const plaintext = decrypted.toString(CryptoJS.enc.Utf8);
            const decryptedData = JSON.parse(plaintext);
            resolve(decryptedData)
        } catch (error) {
            reject(error)
        }
    })
}

export function generateHMACSignature(data: any) {
    try {
        const json = JSON.stringify(data)
        const signature = CryptoJS.HmacSHA256(json, secret).toString();
        return signature
    } catch (error) {
        return null
    }
}
