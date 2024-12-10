/**
 * paymentRouter.ts
 * version 1.0.0
 * 
 * Created on the 18/03/2023
 */

import express from "express"
import { paymentController  } from "../controllers"
const router = express.Router()

// MAIN ROUTES
router.post('/create-checkout', paymentController.handleCreateStripeCheckoutSession)
router.post('/create-portal-session', paymentController.handleCreateStripePortalSession)
router.post('/webhook', express.raw({ type: 'application/json' }), paymentController.handleWebhookEvent)

export default router