/**
 * userRouter.ts
 * version 1.0.0
 * 
 * Created on the 20/09/2023
 */

import express from "express"
import { userController } from "../handlers"
const router = express.Router()

// MAIN ROUTES
router.post('/update-reading-progress', userController.handleUpdateReadingProgress)
router.post('/signup-newsletters', userController.handleSignupToNewsletters)


export default router