/**
 * authRouter.ts
 * version 1.0.0
 * 
 * Created on the 15/03/2023
 */

import express from "express"
import { authController } from "../controllers"
const router = express.Router()

// MAIN ROUTES
//router.post('/create-bot-admin', authController.handleCreateBotUserToken)
router.post('/signup', authController.handleSignupWithEmailAndPassword)

// GLOBAL METRIC
router.post('/signed-up-with-provider', authController.handleSignedUpWitProvider)
router.post('/session', authController.handleSessionCreated)

// USER COPY
router.post('/update-user-profile', authController.handleUpdateUserProfile)

export default router