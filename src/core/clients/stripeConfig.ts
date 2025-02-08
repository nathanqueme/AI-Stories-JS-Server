/**
 * stripeConfig.ts
 * version 1.0.0
 * 
 * Created on the 21/04/2023
 * 
 */

export const stripeConfig = {
    secret: process.env.STRIPE_TEST_SECRET ?? "",
    endpointSecret: process.env.STRIPE_TEST_ENDPOINT_SECRET ?? ""
}