/**
 * stripeApp.ts
 * version 1.0.0
 * 
 * Created on the 21/04/2023
 */

import Stripe from 'stripe'
import { stripeConfig } from './stripeConfig'

const stripeApp = new Stripe(stripeConfig.secret, {
    apiVersion: "2022-11-15",
    typescript: true
})

export default stripeApp