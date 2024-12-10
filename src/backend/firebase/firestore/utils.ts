/**
 * utils.ts
 * version 1.0.0
 * 
 * Created on the 06/01/2023
 */

import admin from 'firebase-admin'
import { firestoreDB, firebaseConfig } from '../../configs'
import { FirestoreUpdateData, } from '../../../data'
import { ResourceType } from '../../../types'
import { splitIntoChunks } from '../../../utils'

// 🟨 BATCH OPERATION LIMITATION: Each transaction or batch of writes can write
// to a maximum of 500 documents.


// Utils
export function getCollectionPath(resource: ResourceType) {
    switch (resource) {
        case "story": return firebaseConfig.STORIES_PATH
        case "custom-story": return firebaseConfig.CUSTOM_STORIES_PATH
        case "log": return firebaseConfig.LOGS_PATH
        case "like": return firebaseConfig.LIKES_PATH
        case "translation": return firebaseConfig.TRANSLATIONS_PATH
        case "monthly-usage": return firebaseConfig.MONTHLY_USAGES_PATH
        case "user-content-interaction": return firebaseConfig.USER_CONTENT_INTERACTIONS_PATH
        case "global-metric": return firebaseConfig.GLOBAL_METRICS_PATH
        case "user": return firebaseConfig.USERS_PATH
        case "reading-progress": return firebaseConfig.READING_PROGRESSIONS_PATH
        case "newsletters": return firebaseConfig.NEWSLETTERS
    }
}




// All ---------------------------------------------------
// ONE BY ONE
/**
 * 
 * @param id : The identifier of the item. 
 * @returns The matching item
 */
export function getItem(id: string, resource: ResourceType): Promise<{ [key: string]: any }> {
    return new Promise<any>(async (resolve, reject) => {

        const path = getCollectionPath(resource)

        try {
            const output = await firestoreDB.doc(`${path}/${id}`).get()
            const item: any = output.data() as any
            resolve(item)
        } catch (error) {
            reject(error)
        }

    })
}

export function setItem(item: any, resource: ResourceType, id?: string) {
    return new Promise<string>(async (resolve, reject) => {
        try {
            const item_id = id ? id : item.id
            const path = getCollectionPath(resource)
            await firestoreDB.doc(`${path}/${item_id}`).set(item)
            resolve(`✅ ITEM ${item_id} UPLOADED (${resource})`)
        } catch (error) {
            reject(error)
        }
    })
}

export function updateItem(id: string, keyValues: object, resource: ResourceType) {
    return new Promise<string>(async (resolve, reject) => {
        try {
            const path = getCollectionPath(resource)
            await firestoreDB.doc(`${path}/${id}`).update(keyValues)
            resolve(`✅ ITEM ${id} UPDATED (${resource})`)
        } catch (error) {
            reject(error)
        }
    })
}

export function deleteItem(item: any, resource: ResourceType, id?: string) {
    return new Promise<string>(async (resolve, reject) => {
        try {
            const item_id = id ? id : item.id
            const path = getCollectionPath(resource)
            await firestoreDB.doc(`${path}/${item_id}`).delete()
            resolve(`✅ ITEM ${item_id} DELETED (${resource})`)
        } catch (error) {
            reject(error)
        }
    })
}


// BATCH 
/** A chunk has max 500 items */
function batchSetToFirestore(chunk: any[], path: string) {
    return new Promise<string>(async (resolve, reject) => {
        const batch = firestoreDB.batch()
        // ADD EACH ITEM TO THE BATCH
        chunk.forEach(item => {
            const ref = firestoreDB.doc(`${path}/${item.id}`)
            batch.set(ref, item)
        })
        batch.commit()
            .then(e => { resolve("✅ set") })
            .catch(error => { reject(error) })
    })
}
/** BATCH UPDATE (MAX 500 documents)
*/
export function setItems(items: any[], resource: ResourceType, customResource = ""): Promise<string> {
    return new Promise<string>(async (resolve, reject) => {
        try {

            const path = customResource !== "" ? customResource : getCollectionPath(resource)

            // SPLIT INTO CHUNKS TO BYPASS FIRESTORE'S 500 items LIMIT
            const dataChunks = splitIntoChunks(items, 500)
            await Promise.all(dataChunks.map(async (chunk) => {
                await batchSetToFirestore(chunk, path)
            }))

            resolve(`✅ ${items.length} ITEMS UPLOADED (${resource})`)
        } catch (error) {
            reject(error)
        }
    })
}

/** A chunk has max 500 items */
function batchUpdateToFirestore(chunk: FirestoreUpdateData[], path: string) {
    return new Promise<string>(async (resolve, reject) => {
        const batch = firestoreDB.batch()
        // ADD EACH ITEM TO THE BATCH
        chunk.forEach(item => {
            const ref = firestoreDB.doc(`${path}/${item.id}`)
            batch.update(ref, item.keyValues)
        })
        batch.commit()
            .then(e => { resolve("✅ uploaded") })
            .catch(error => { reject(error) })
    })
}
/** BATCH UPDATE (MAX 500 documents)
*/
export function updateItems(updatesData: FirestoreUpdateData[], 
    resource: ResourceType, customResource = "") {
    return new Promise<string>(async (resolve, reject) => {
        try {

            const path = customResource !== "" ? customResource : getCollectionPath(resource)
            const dataChunks = splitIntoChunks(updatesData, 500)
            await Promise.all(dataChunks.map(async (chunk) => {
                await batchUpdateToFirestore(chunk, path)
            }))

            resolve(`✅ ${updatesData.length} ITEMS UPLOADED (${resource})`)
        } catch (error) {
            reject(error)
        }
    })
}

/** A chunk has max 500 items */
function batchDeleteToFirestore(chunk: string[], path: string) {
    return new Promise<string>(async (resolve, reject) => {
        const batch = firestoreDB.batch()
        // ADD EACH ITEM TO THE BATCH
        chunk.forEach((id) => {
            const ref = firestoreDB.doc(`${path}/${id}`)
            batch.delete(ref)
        })
        batch.commit()
            .then(e => { resolve("✅ deleted") })
            .catch(error => { reject(error) })
    })
}
/** BATCH DELETE (MAX 500 documents) */
export function deleteItems(ids: string[], resource: ResourceType, customResource = "") {
    return new Promise<string>(async (resolve, reject) => {
        try {

            const path = customResource !== "" ? customResource : getCollectionPath(resource)
            const dataChunks = splitIntoChunks(ids, 500)
            await Promise.all(dataChunks.map(async (chunk) => {
                await batchDeleteToFirestore(chunk, path)
            }))

            resolve(`✅ ${ids.length} ITEMS DELETED (${resource})`)
        } catch (error) {
            reject(error)
        }
    })
}


// TRANSACTION
/**
 * @param nestedProp The path to the value in the data object. For example, 
 * to update the "new-york" property (456) nested in "cities", you would pass 
 * "cities.new-york" for nestedProp.
 * @example
 * ```
 * {
 *   "id": "abc",
 *   "cities": {
 *     "los-angeles": 123,
 *     "new-york": 456
 *   },
 * }
 * ```
 * @param value required when the operation is "set". Is unused when the operation is "incr" or "decr".
 */
export function updateNestedValue(id: string, nestedProp: string, resource: ResourceType, 
    operation: "incr" | "decr" | "set" = "incr", value: any | null = null) {
    return new Promise<string>(async (resolve, reject) => {
        try {
            const path = getCollectionPath(resource)
            const ref = firestoreDB.collection(path).doc(id)
            const n = (operation === "incr") ? 1 : (operation === "decr") ? -1 : null
            const v = n ? admin.firestore.FieldValue.increment(n) : value
            const dataToUpdate = { [nestedProp]: v }

            await ref.update(dataToUpdate)
            resolve("✅ updated")
        } catch (error) {
            reject(error)
        }
    })
}
// --------------------------------------------------------