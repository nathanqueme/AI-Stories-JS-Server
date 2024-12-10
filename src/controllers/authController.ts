/**
 * authController.ts
 * version 1.0.0
 * 
 * Created on the 15/03/2023
 */

import ERRORS_MSGS from '../errors'
import jwt from 'jsonwebtoken'
import { NextFunction, Request, Response } from 'express'
import { isStringValid, generateID, devtools, decrypt } from '../utils'
import { firebaseAuth, botsConfig, mainConfig } from '../backend/configs'
import { checkBotAccess, checkIdToken, catchUserCreated, useUserAccess } from '../services'
import { updateGlobalMetricCount } from '../backend/firebase/firestore/globalMetric'
import { updateNestedValue } from '../backend'

const { secret } = botsConfig
const { production } = mainConfig


// how the authentication flow works: 
// USER CREATION with email/password (-> and also SIGN IN)
// 1 - The user is created on the server, and a custom token is sent to the client.
// 2 - The client signs in the user using the custom token.
// 3 - The client retrieves the user ID token.
// 4 - The server checks that the ID token is valid. 

// SIGN IN (USER ALREADY EXISTS)
// 1 - The client signs in the user using an appropriate method curently supported options include: email/password and Google Sign in.
// 2 - The client retrieves the user ID token.
// 3 - The server checks that the ID token is valid. 

const authController = {
    // USER MANAGEMENT 
    // 
    // TODO: create the users on auth0 as well so one day we can: 
    // - 1 - migrate out of firebase 
    // - 2 - create an ON-PREMISE server infrastructure 100% cloud free
    async handleSignupWithEmailAndPassword(req: Request, res: Response) {

        // 1 - PARAMS
        const email = req.body.e as string
        const encrypted_password = req.body.p as string
        const display_name = req.body.dn as string | undefined
        const account_pic_url = req.body.ap_url as string | undefined
        const uid = req.body.uid as string | undefined | null
        const password = await decrypt(encrypted_password).catch(err => null)
        if (!isStringValid(email) || !isStringValid(password))
            // or invalid params. e.g.: "uid" is a number instead of a string
            return res.status(400).send(ERRORS_MSGS.BAD_REQUEST_MISSING_PARAMS)
        const new_user_id = generateID(28, false)
        // try using client's one if valid otherwise use the generated one
        const user_id = uid && isStringValid(uid) && (uid?.length ?? 0) >= 28 ? uid : new_user_id

        // HANDLE
        firebaseAuth
            // 1 
            .createUser({
                uid: user_id,
                email: email,
                password: password!,
                displayName: display_name,
                photoURL: account_pic_url
            })
            .then(async (userRecord) => { // ✅ user created (on Firebase)

                // create a copy on auth0 for when we migrate out of firebase (Auth0 has a User Management API, which enables exporting users in many formats.)
                /*
                await auth0.createUser({
                    user_id: user_id,
                    email: email,
                    password: password,
                    name: display_name,
                    picture: account_pic_url,
                    connection: 'Username-Password-Authentication', // Replace with the name of your Auth0 connection
                })
                    .then((user) => {
                        // ✅ user created (on Auth0) 
                        // status 201
                    })
                    .catch((error) => {
                        // ❌ user NOT created (on Auth0)
                        // status 500
                    })
                    */

                // 2 
                await catchUserCreated({ userRecord })
                    .catch(err => { devtools.log(err) })

                // 3
                const additionalClaims = undefined // { premiumAccount: true, customInfo2: ""};
                firebaseAuth
                    .createCustomToken(user_id, additionalClaims)
                    .then((customToken) => {
                        // Now will be used by CLIENT to SIGN IN:
                        res.status(201).send(customToken)
                    })
                    .catch((error) => {
                        // `Error creating custom token ${error.code}`
                        res.status(400).send(error.code)
                    })

            })
            .catch((error) => {
                // `Error creating custom token ${error.code}`
                res.status(400).send(error.code)
            })

    },
    async handleDeleteUser(req: Request, res: Response) {

        // PARAMS 
        const user_id = req.body.uid as string

        // HANDLE 
        firebaseAuth
            .deleteUser(user_id)
            .then(() => { res.json('✅ user deleted') })
            .catch((error) => {
                res.status(400).json(`Error deleting user: ${error}`)
            })
    },

    // GLOBAL METRICS related to users
    async handleSignedUpWitProvider(req: Request, res: Response) {
        const uid = req.body.uid as string
        if (!uid) return res.sendStatus(400)
        await catchUserCreated({ uid })
            .then(() => res.json('✅'))
            .catch(err => { console.log(err); res.sendStatus(500) })
    },
    async handleSessionCreated(req: Request, res: Response) {
        // PARAMS
        const domain = req.body.d as string
        if (!isStringValid(domain)) return res.sendStatus(400) // bad request

        // HANDLE
        const nestedProp = `sessions.${domain}`
        updateGlobalMetricCount("user", "incr", nestedProp)
            .then(() => res.json("✅"))
            .catch(err => res.sendStatus(500))
    },
    async handleUpdateUserProfile(req: Request, res: Response) {

        // PARAMS
        const freshUserExtraInfo = req.body.data as string
        const { user_id } = await useUserAccess(req)
        if (!isStringValid(freshUserExtraInfo) || !isStringValid(user_id) || !user_id) return res.sendStatus(400)

        // HANDLE
        const nestedProp = `displayName`
        updateNestedValue(user_id, nestedProp, "user", "set", freshUserExtraInfo)
            .then(() => res.json("✅"))
            .catch(err => {
                devtools.log(err)
                res.sendStatus(500)
            })
    },

    // SECURITY AND ACCESS RESTRICTIONS
    // 
    //
    // FIREBASE :
    //
    /**
   * A middleware function that verifies the idToken and decode it's info. 
   * Attach this middleware to restrict access to protected routes : 
   * 
   * app.post('/secured-route', verifyIdTokenMiddleware, (req, res) => {
   *   const uid = req.decodedIdToken.uid;
   *   // Use the uid to interact with Firestore...
   * })
   * 
   */
    async handleCheckIdToken(req: Request, res: Response, next: NextFunction) {
        try {
            const decodedToken = await checkIdToken(req)
            if (decodedToken) return next();
            else return res.status(401).send(ERRORS_MSGS.UNAUTHORIZED_ACCESS);
        } catch (error: any) {
            return res.status(401).send(ERRORS_MSGS.UNAUTHORIZED_ACCESS);
        }
    },
    //
    //
    // (custom) : 
    //
    /** 
     * - Creates a bot admin which behaves as a bot and is allowed to interact with the the endpoints reserved for bots.
     * - @param req.body.bi: the bot_id
     * - On success outputs bots' authentification JWT token.
    */
    async handleCreateBotUserToken(req: Request, res: Response) {
        // ONLY USABLE INTERNALY
        if (production) return res.status(401).send(ERRORS_MSGS.UNAUTHORIZED_ACCESS)

        // PARAMS 
        const bot_name = req.body.bot_name
        if (!isStringValid(bot_name) || !isStringValid(secret))
            return res.status(400).send(ERRORS_MSGS.BAD_REQUEST_MISSING_PARAMS)

        // ACTION
        const token = jwt.sign({ bot_name: bot_name }, secret);
        res.json(token)
    },
    /** 
    * - RESTRICTS ACCESS TO THE GIVEN ROUTE TO ALL NON ALLOWED INTERNAL BOT ADMINS.
    * - FOR NOW USES A COMBINATION OF SECRET KEY AND A INTERNALY GENERATED SECRET JWT token (JSON Web Token)
    */
    async handleBlockNonBots(req: Request, res: Response, next: NextFunction) {
        try {
            const bot = await checkBotAccess(req)
            if (bot) return next()
            else return res.status(403).send(ERRORS_MSGS.FORBIDDEN);
        } catch (error) {
            return res.status(403).send(ERRORS_MSGS.FORBIDDEN);
        }
    },
}


export default authController