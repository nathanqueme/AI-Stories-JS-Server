/**
 * stripeConfig.ts
 * version 1.0.0
 * 
 * Created on the 21/04/2023
 * 
 */

export const stripeConfig = {
    // https://dashboard.stripe.com/apikeys
    // Remember to switch to the live secret key in production.
    secret: process.env.STRIPE_TEST_SECRET ?? "",
    // This is your test secret API key.
    // Replace this endpoint secret with your endpoint's unique secret
    // If you are testing with the CLI, find the secret by running 'stripe listen'
    // If you are using an endpoint defined with the API or dashboard, look in your webhook settings
    // at https://dashboard.stripe.com/webhooks
    // This is your Stripe CLI webhook secret for testing your endpoint locally.
    endpointSecret: process.env.STRIPE_TEST_ENDPOINT_SECRET ?? ""
}