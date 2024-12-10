/**
 * paymentUtils.ts
 * version 1.0.0
 * 
 * Created on the 27/04/2023
 */

import Stripe from "stripe"
import { subscriptionPlans, SubscriptionPlanData } from "../data"
import { ProductIdType } from "../types"


export function updateSubscriptionDataOnUser(subscription: Stripe.Subscription) {
    return new Promise<string>(async (resolve, reject) => {

        try {
            // PARAMS 
            const stripe_customer_id = subscription.customer as string
            /// const session = await stripeApp.checkout.sessions.retrieve(session_id);
            // const customer = await stripeApp.customers.retrieve(session.customer as string);
            //const subscription = await stripeApp.subscriptions.retrieve(session.subscription as string);

            // const subscription = await stripeApp.subscriptions.retrieve(session.subscription as string);

            console.log(subscription)

            // CHECK IF IS VALID ?
            const expired: boolean = false

            const freshData = {
                paid: true,
                // @ts-ignore
                subscription: subscription?.plan?.id ?? null,
                subscription_id: subscription.id,
                current_period_end: subscription.current_period_end,
                current_period_start: subscription.current_period_start,
                start_date: subscription.start_date,
            }
            console.log(freshData)
            // await updateCustomerPaymentInfo(stripe_customer_id, freshData)
            resolve(`TODO`) //: ✅ saved the customer's ${subscription.customer} new subscription info`)

        } catch (error) {
            reject(`❌ ERROR: ${error}`)
        }
    })
}

export function getSubscriptionPlan(subscriptionId: ProductIdType) {
    const plan =
        subscriptionPlans
            .find(el => { return el.product_id === subscriptionId }) ??
        // fallback
        subscriptionPlans.find(el => { return el.type === "trial-mode" }) as SubscriptionPlanData
    return plan
}


// USE THE RIGHT WEBHOOKS TO HANDLE ALL SCENARIOS WELL.


// ALL OF THIS IN ON ONE SHARED FUNCTION 
// 1 - is expired ?
// 2 - update the user via "user_id"
// 3 - Create a "plan_state" prop to display small messages to user such as "paid", "payment-failed"
//     in combination with it's plan type


// TODO
export function handleSessionCompleted(session: Stripe.Checkout.Session) {

    const subscriptionId = session.subscription;
    const customerId = session.customer;
    const email = session.customer_email;

}

export function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
    return new Promise(async (resolve, reject) => {
        try {
            const response = await updateSubscriptionDataOnUser(subscription)
            resolve(`✅ handled subscription change`)
        } catch (error) {
            reject(`Can't handle subscription change ${error}`)
        }
    })
}

export function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
    return new Promise(async (resolve, reject) => {
        try {
            const response = await updateSubscriptionDataOnUser(subscription)
            resolve(`✅ handled subscription deletion`)
        } catch (error) {
            reject(`Can't handle subscription deletion ${error}`)
        }
    })
}

// TODO
export function handleInvoicePaid(invoice: Stripe.Invoice) {

    const subscriptionId = invoice.subscription;
    const customerId = invoice.customer;
    const email = invoice.customer_email;

}

// TODO
export function handlePaymentFailed(invoice: Stripe.Invoice) {

    const subscriptionId = invoice.subscription;
    const customerId = invoice.customer;
    const email = invoice.customer_email;

}