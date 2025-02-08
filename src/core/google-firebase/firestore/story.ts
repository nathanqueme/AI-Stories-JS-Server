/**
 * story.ts
 * version 1.0.0
 * 
 * Created on the 06/01/2023
 */

import admin from 'firebase-admin'
import { firestoreDB } from '../../clients'
import { StoryData, Story, GlobalMetricData, subscriptionPlans } from '../../../models'
import { ResourceType, SubscriptionPlanType, TransactionType } from '../../../types'
import { devtools, isArrayValid, isDateStringValid } from '../../../utils'
import { getCollectionPath, getItem } from './utils'
import { QuerySnapshot } from 'firebase-admin/firestore'

const resource: ResourceType = "story"
const path = getCollectionPath(resource)


export function getNthStory(
    user_id: string[], number: number, parts?: Array<keyof StoryData>) {
    return new Promise<StoryData>(async (resolve, reject) => {
        // CHECK
        const offset = number - 1
        if (offset < 0) return reject("invalid-offset") // e.g. user requested the story n°203 but there is only 200 stories

        var query = firestoreDB
            .collection(path)
            .where("user_id", "in", user_id)
            .orderBy("created_at", "desc")
            .offset(offset)
            .limit(1)

        const useParts = isArrayValid(parts)
        if (useParts) {
            query = query.select(...parts!)
        }

        query.get()
            .then((snapshot) => {
                if (snapshot.docs.length === 0) return reject("story-not-found")
                const dbStory = snapshot.docs[0].data() as StoryData
                const story = useParts ? dbStory : Story.deformatDatabaseFormat(dbStory)
                resolve(story)
            })
            .catch((error) => reject(error))
    })
}

export function getStory(id: string, hl?: string) {
    return new Promise<StoryData | null>(async (resolve, reject) => {

        const fullPath = `${path}/${id}`
        const ref = firestoreDB.doc(fullPath)

        // 1 
        var story: StoryData | null = null
        try {
            const doc = await ref.get()
            if (doc.exists) {
                const firebaseFormatStory = doc.data() as StoryData
                const storyData = Story.deformatDatabaseFormat(firebaseFormatStory)
                story = storyData
            }
        } catch (error) {
            reject(error)
        }
        if (!story) return resolve(null)


        // 2 
        story = await Story.translated(story, hl).catch((error) => { return story })

        resolve(story)

    })
}

export async function getRecommendedStory(ca: string, hl?: string | null, userIsAuthenticated = true) {
    return new Promise<StoryData | null>(async (resolve, reject) => {

        const ref = firestoreDB.collection(path);
        const numToRetrieve = 1;
        // generates a random number between 5 and 15
        const randomOffset = Math.floor(Math.random() * 11) + 5;
        var numAttempts = 0

        var lastFreeStory_created_at: string | null = null
        if (!userIsAuthenticated) {
            const freePlan = subscriptionPlans.
                filter(el => { return el.type === "trial-mode" }) ?? []
            const maxStories = (freePlan.length > 0) ? freePlan[0].story_count :
                7 // fallback if not found
            const snapshot = await ref
                .orderBy("created_at", "asc")
                .offset(maxStories - 1)             // -1 since starts at 0
                .get()
            if (snapshot.size > 1)
                lastFreeStory_created_at = snapshot.docs[0].data().created_at
            else console.log(`\n-> no paid stories to hide (stories qty < ${maxStories})`)
        }

        async function getStoryFromSnapshot(snapshot: QuerySnapshot) {
            var stories: StoryData[] = []
            snapshot.forEach(async (doc) => {
                const firebaseFormatStory = doc.data() as StoryData
                const story = Story.deformatDatabaseFormat(firebaseFormatStory)
                stories.push(story)
            })
            if (stories.length !== 1) {
                return null
            } else {
                const storyTranslated = await Story.
                    translated(stories[0], hl).catch((error) => { return story })
                return storyTranslated
            }
        }
        function getRandomStory(created_at: string, directionDesc = true, noOffset = false) {
            return new Promise<StoryData | null>(async (resolve, reject) => {
                const offset = noOffset ? 1 : randomOffset
                devtools.log(`rec. attempt n°` + (numAttempts + 1) + " offset: " + offset)

                var query = lastFreeStory_created_at ? ref
                    .orderBy("created_at", directionDesc ? "desc" : "asc")
                    .where("created_at", "<=", lastFreeStory_created_at)
                    :
                    ref.orderBy("created_at", directionDesc ? "desc" : "asc")

                query.startAt(created_at)
                    .offset(offset)
                    .limit(numToRetrieve)
                    .get().then(async (querySnapshot) => {
                        const story = await getStoryFromSnapshot(querySnapshot)
                        resolve(story)
                    }).catch(err => { reject(err) })
            })
        }

        var story: StoryData | null = null
        const options = [
            // 1 - after current one
            { directionDesc: true, noOffset: false },
            // 2 - before current one
            { directionDesc: false, noOffset: false },
            // 3 - fallback next one
            { directionDesc: true, noOffset: true },
            // 4 - fallback prev one
            { directionDesc: false, noOffset: true },
        ]
        // When the user is un-authenticated, paid stories shouldn't be recommended.
        // With this logic this function is going to take the next story (oldest one) or 
        // prev story (more recent) if param `ca` is from last story so it ONLY recommends FREE STORIES.
        if (!userIsAuthenticated) options.splice(0, 2)
        const MAX_ATTEMPTS = 4
        while (numAttempts < MAX_ATTEMPTS && !(story !== null)) {
            try {
                const { directionDesc, noOffset } = options[numAttempts]
                story = await getRandomStory(ca, directionDesc, noOffset)
                numAttempts++;
            } catch (error) {
                numAttempts = MAX_ATTEMPTS
                return reject(error)
            }
        }

        resolve(story)

    })
}

export function incrementStoryValue(id: string, property: keyof StoryData, transaction: TransactionType) {
    return new Promise<string>(async (resolve, reject) => {

        const ref = firestoreDB.collection(path).doc(id)

        var dataToUpdate: { [key: string]: any } = {}
        const incrementBy = transaction === "+" ? 1 : -1
        dataToUpdate[property] = admin.firestore.FieldValue.increment(incrementBy)
        await ref.update(dataToUpdate)
            .then(() => { resolve("✅ story value incremented") })
            .catch(error => { reject(error) })

    })
}

export function updateStoryImageUrls(
    id: string, keyValues: { media: [string][] }) {
    return new Promise(async (resolve, reject) => {
        try {
            await firestoreDB.doc(`${path}/${id}`).set(keyValues, { merge: true })
            resolve(`✅ URLS UPDATED`)
        } catch (error) {
            reject(error)
        }
    })
}

export function getStories(
    user_ids: string[], 
    max: number, 
    load_after_created_at?: string | null, 
    hl?: string | null, 
    loaded_count?: number | null, 
    user_max_story_count?: number | null, 
    only_story_id = false, 
    liked_story_ids?: string[] | null, 
    sub_plan?: SubscriptionPlanType
) {
    return new Promise<StoryData[]>(async (resolve, reject) => {

        const limitationDataProvided = (typeof loaded_count === 'number') && (typeof user_max_story_count === 'number')
        const limitReached = limitationDataProvided && (loaded_count >= user_max_story_count)
        if ((max === 0) || limitReached) return resolve([])
        const loadLikedStories = isArrayValid(liked_story_ids)
        const remainingStories = limitationDataProvided ? user_max_story_count - loaded_count : null
        const limit = remainingStories && (max > remainingStories) ? remainingStories : max
        var query = firestoreDB
            .collection(path)
            // this forces the limit to be less or equal to 50
            .limit(limit > 50 ? 50 : limit)

        if (loadLikedStories)
            query = query
                .where("id", "in", liked_story_ids)
        else {
            query = query
                .where("user_id", "in", user_ids)
                .orderBy("created_at", "desc")
        }


        // PAGINATION
        const dateIsValid = isDateStringValid(load_after_created_at)
        // the loadAfterCreatedAt is the "created_at" date of the last story
        if (dateIsValid) {
            query = query.startAfter(load_after_created_at)
        }
        else if (!loadLikedStories && ((loaded_count ?? 0) === 0) && (sub_plan !== "premium-max") && user_max_story_count) {
            devtools.log(`↕️ MANUAL PAGINATION (sub: ${sub_plan} / ${user_max_story_count} max)`)

            // - 1 - get current "story_count"
            // - 2 - get offset
            // - 3 - get the "created_at" of the story at given offset
            // - 4 - use the "created_at" date to startAt the given offset

            try {

                // 1 
                const id = getCollectionPath("story")
                const global_metric = await getItem(id, "global-metric") as GlobalMetricData
                // the number of stories on the Database now (changes every day)
                const { count: story_count } = global_metric as GlobalMetricData

                // 2
                const offset = story_count - user_max_story_count
                if (offset > 0) { // will always be the case
                    // 3
                    try {
                        const { created_at } = await getNthStory(user_ids, offset, ["created_at"])
                        // 4
                        if (isDateStringValid(created_at)) query = query.startAfter(created_at)
                    } catch (error) {
                    }
                } else devtools.log(`🟨 DB has currently not enought stories for manual pagination (${Math.abs(offset)} missing)`)

            } catch (error) {
            }
        }
        else devtools.log(`PAGINATION NOT USED`)


        if (only_story_id) query = query.select("id")


        // 1 
        var stories: StoryData[] = []
        try {
            const querySnapshot = await query.get()
            querySnapshot.forEach(doc => {
                const firebaseFormatStory = doc.data() as StoryData
                const story = only_story_id ?
                    firebaseFormatStory // #1 (see comment above)
                    :
                    Story.deformatDatabaseFormat(firebaseFormatStory)
                stories.push(story)
            })
        } catch (error) {
            return reject(error)
        }


        // 2 
        if (stories.length === 0) return resolve([])
        await Promise.all(stories.map(async (story, index) => {
            const storyTranslated = await Story.translated(story, hl).catch((error) => { return story })
            stories[index] = storyTranslated // -> use translation
        }))


        resolve(stories)

    })
}
