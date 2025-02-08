/**
 * like.ts
 * version 1.0.0
 * 
 * Created on the 06/01/2023
 */

import { LikeData, Like } from "../../../models"
import { firestoreDB } from "../../clients"
import { isDateStringValid } from "../../../utils"
import { deleteItem, getCollectionPath, getItem, setItem } from "./utils"
import { ResourceType } from "../../../types"

const resource : ResourceType = "like"
const path = getCollectionPath(resource)


export function likeStory(item_id: string, user_id: string) {
    return new Promise<LikeData>(async (resolve, reject) => {

        const id = Like.getID(item_id, user_id)
        const liked_at = new Date().toISOString()
        const like = Like.object(id, item_id, user_id, liked_at)

        try {
            await setItem(like, resource)
            resolve(like)
        } catch (error) {
            reject("🟥 can't like story")
        }
    })
}

export function unlikeStory(item_id: string, user_id: string) {
    return new Promise<string>(async (resolve, reject) => {
        const id = Like.getID(item_id, user_id)
        try {
            await deleteItem({ id }, resource)
            resolve("✅ story unliked")
        } catch (error) {
            reject("🟥 can't unlike story")
        }
    })
}

export function getLikes(user_id: string, max: number, loadAfterLikedAt?: string) {
    return new Promise<LikeData[]>(async (resolve, reject) => {

        if (max === 0) return resolve([])
        var query = firestoreDB.collection(path)
            .where("user_id", "==", user_id)
            .orderBy("liked_at", "desc")
            .limit(max > 50 ? 50 : max)


        const dateIsValid = isDateStringValid(loadAfterLikedAt)
        if (dateIsValid) query = query.startAfter(loadAfterLikedAt)



        var likes: LikeData[] = []
        try {
            const querySnapshot = await query.get()
            querySnapshot.forEach(doc => {
                const like = doc.data() as LikeData
                likes.push(like)
            })
        } catch (error) {
            return reject(error)
        }


        resolve(likes)
    })
}

export function getLike(story_id: string, user_id: string) {
    return new Promise<LikeData | null>(async (resolve, reject) => {

        const id = Like.getID(story_id, user_id)

        try {
            const like = await getItem(id, resource) as LikeData | undefined | null
            if (like) {
                resolve(like)
            } else {
                resolve(null)
            }
        } catch (error: any) {
            reject("🟥 no like found for this story")
        }
    })
}