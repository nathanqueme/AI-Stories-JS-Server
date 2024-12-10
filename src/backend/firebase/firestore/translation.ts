/**
 * translation.ts
 * version 1.0.0
 * 
 * Created on the 06/01/2023
 */

import { StoryTranslation, StoryTranslationData } from "../../../data"
import { ResourceType } from "../../../types"
import { firestoreDB } from "../../configs"
import { getCollectionPath } from "./utils"

const resource : ResourceType = "translation"
const path = getCollectionPath(resource)


export async function getTranslation(story_id: string, hl: string) {
    return new Promise<StoryTranslationData | null>(async (resolve, reject) => {

        const translation_id = StoryTranslation.getId(story_id, hl)
        const fullPath = `${path}/${translation_id}`
        const ref = firestoreDB.doc(fullPath)

        // Retrieve the translation's data
        await ref.get().then((doc) => {
            if (doc.exists) {
                // Document exists, retrieve its data
                const data = doc.data() as StoryTranslationData
                resolve(data)
            } else {
                resolve(null)
            }
        }).catch((error) => {
            resolve(null)
        })

    })
}
