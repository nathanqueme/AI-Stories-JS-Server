/**
 * firebaseApp.ts
 * version 1.0.0
 * 
 * Created on the 23/01/2023
 */

import admin from "firebase-admin"
import serviceAccount from "./serviceAccountKey.json"
import { getAuth } from "firebase-admin/auth"
import { getFirestore } from "firebase-admin/firestore"

const firebaseApp = admin.initializeApp({
  credential: admin.credential.cert(serviceAccount as any),
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
})
export const firebaseAuth = getAuth(firebaseApp)
export const firestoreDB =  getFirestore(firebaseApp)
