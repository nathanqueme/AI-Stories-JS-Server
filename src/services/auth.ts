/**
 * auth.ts
 * version 1.0.0
 * 
 * Created on the 15/03/2023
 */

import jwt from 'jsonwebtoken'
import { Request } from 'express'
import { botsConfig, firebaseAuth } from '../backend/configs'
import { DecodedIdToken, UserRecord } from 'firebase-admin/auth'
import { BotData, UserExtraInfo, subscriptionPlans } from '../data'
import { updateGlobalMetricCount } from '../backend/firebase/firestore/globalMetric'
import { devtools } from '../utils'
import { setItem } from '../backend'

const { secret } = botsConfig

// SERVER
/** RETURNS THE CURRENT BOT IF ANY. */
export function checkBotAccess(req: Request) {
    return new Promise<BotData | undefined>((resolve, reject) => {
        const authHeader = req.headers?.authorization;
        if (authHeader) {
            const token = authHeader.split(' ')[1];
            jwt.verify(token, secret, (err, user) => {
                if (err) {
                    reject("FORBIDDEN")
                }
                resolve(user as BotData)
            });
        } else {
            reject("FORBIDDEN")
        }
    })
}

/**
* A middleware function that verifies the idToken and decode it's info. 
* RETURNS FIREBASE USER IF ANY 
*/
export async function checkIdToken(req: Request) {
    return new Promise<DecodedIdToken | undefined>(async (resolve, reject) => {
        // EXCTRACT `ID TOKEN` SENT THROUGHT THE HEADER
        const authHeader = req.headers?.authorization;
        if (authHeader) {
            const idToken = authHeader.split(' ')[1];
            try {
                const decodedToken = await firebaseAuth.verifyIdToken(idToken);
                resolve(decodedToken)
            } catch (error: any) {
                if (error.code == 'auth/id-token-revoked') {
                    reject(error)
                    // Token has been revoked. Inform the user to reauthenticate or signOut() the user.
                } else {
                    // Token is invalid.
                    reject(error)
                }
            }
        } else {
            reject("FORBIDDEN")
        }
    })
}

/** DETECTS IF `body / query` PARAMS ARE SET MANUALLY. */
export function manualOverrideDetected(req: Request, paramsToCheck: string[]) {
    function isValueSet(value: any | undefined | null) {
        return (value !== undefined) && (value !== null)
    }
    const valuesSet = paramsToCheck.flatMap(el => {
        const bodyValue = req.body[el]
        const queryValue = req.query[el]
        const valueIsSet = isValueSet(bodyValue) || isValueSet(queryValue)
        return valueIsSet
    })
    return valuesSet.includes(true)
}

/** 
 * Extracts the user's access data. For instance if user subscription is expired, it 
 * makes the app behaves the app accordingly.
 */
export async function useUserAccess(req: Request) {

    // GET USER SETTINGS and INFO
    const userIdToken = await checkIdToken(req).catch(el => { return undefined })
    const user_id = userIdToken?.uid
    var userExtraInfo = await UserExtraInfo.fromUser(userIdToken)
    // consider the user to be unsubscribed if the subscription is expired
    if (userExtraInfo.sub_expired) userExtraInfo.sub_plan = "trial-mode"
    const userPlan = subscriptionPlans
        .find(el => {
            const { sub_plan } = userExtraInfo
            return el.type === sub_plan
        }) ??
        // FALLBACK
        subscriptionPlans
            .filter(el => { return el.type === "trial-mode" })[0]


    const story_bot_name = "Minipixbot-story"
    var uids = [story_bot_name]
    if (user_id) uids.push(user_id)
    const accessData = { user_id, user_ids: uids, max_story_count: userPlan.story_count, max_custom_story_count: userPlan.custom_story_count, userExtraInfo, }

    // is search engine ?
    // TODO: if (searchEngineCrawlerUserAgent === "google-bot-..." || "bing-bot-..."")

    // is internal bot ?
    // const bot = await checkBotAccess(req).catch(err => { return undefined })

    // is developper ?
    //if (!production) return [...]

    return accessData
}

// DATABASE
export async function getUserByEmail(email: string) {
    return new Promise<UserRecord>((resolve, reject) => {
        firebaseAuth
            .getUserByEmail(email)
            .then((userRecord) => {
                resolve(userRecord)
            })
            .catch((error) => {
                reject(`Error fetching user data: ${error}`)
            })
    })
}

/** 
 * Handles two things:
 * - 1 - copies user information into the "users" table
 * - 2 - increases the user global metric count (so that devs can quickly see the number of users)
 */
export async function catchUserCreated(userData: { userRecord?: UserRecord, uid?: string }) {
    return new Promise<string>(async (resolve, reject) => {

        var data: UserRecord
        if (userData.userRecord) data = userData.userRecord
        else if (userData.uid) {
            try {
                data = await firebaseAuth.getUser(userData.uid)
            } catch (error) {
                return reject(error)
            }
        }
        else return reject("⛔：user data not found")

        // 1
        // when the user signed up with google, the display name
        // is something like "Joe Mack" so it is not valid info
        // so use the default values 
        const settings = await UserExtraInfo.fromUser(data)
        try {
            var finalUserData: any = {}
            finalUserData.uid = data?.uid ?? ""
            finalUserData.email = data?.email ?? ""
            finalUserData.displayName = JSON.stringify(settings)
            finalUserData.photoURL = data?.photoURL ?? null
            finalUserData.signupDate = new Date().toISOString()
            await setItem(finalUserData, "user", finalUserData.uid)
        } catch (error) {
            devtools.log(error)
            return reject(error)
        }

        // 2 
        try {
            // update user's related global metric
            await updateGlobalMetricCount("user", "incr", "count")
        } catch (error) {
            devtools.log(error)
            return reject(error)
        }

        resolve("✅ catched user created")

    })
}

