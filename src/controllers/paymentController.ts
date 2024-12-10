/**
 * paymentController.ts
 * version 1.0.0
 * 
 * Created on the 21/04/2023
 */

import Stripe from 'stripe';
import stripeApp from '../backend/configs/stripeApp';
import ERRORS_MSGS from '../errors';
import { isStringValid } from '../utils';
import { Request, Response } from 'express'
import { stripeConfig } from '../backend/configs';
import { paymentService } from '../services';

const paymentController = {
  /** Redirects the user to Stripe hosted UI where he will be able to pay. */
  async handleCreateStripeCheckoutSession(req: Request, res: Response) {

    // PARAMS
    const {
      uid: user_id,
      pid: price_id,
      e: email
    } = req.body;
    if (!isStringValid(price_id)) return res.status(400).json(ERRORS_MSGS.BAD_REQUEST_MISSING_PARAMS)

    const protocol = req.protocol; // "http" or "https"
    const hostname = req.hostname; // "www.domain.com" or "localhost"
    const reqDomain = `${protocol}://${hostname}`

    const params: Stripe.Checkout.SessionCreateParams = {
      mode: "subscription",
      line_items: [
        {
          price: price_id,
          quantity: 1,
        },
      ],
      client_reference_id: user_id,
      customer_email: email,
      // {CHECKOUT_SESSION_ID} is a string literal; do not change it!
      // the actual Session ID is returned in the query parameter when your customer
      // is redirected to the success page.
      success_url: `${reqDomain}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${reqDomain}/subscription/canceled`,
    }

    stripeApp.checkout.sessions.create(params)
      .then((session) => {
        if (session.url) {
          // Redirect to the URL returned on the Checkout Session.
          res.redirect(303, session.url);
        } else res.sendStatus(500)
      })
      .catch((err) => { res.sendStatus(500) })

  },
  async handleCreateStripePortalSession(req: Request, res: Response) {
    const stripe = require('stripe')('sk_test_51MzGSRCJn9yoclfnZN4Qfoa5CYg45xKcYCxDndZBSnHcMFblCfdBvUX4ZstF1ZptQt8mvqOobSrdZ8QEawyWezYP008Yq1Zyeu');

    // This is the url to which the customer will be redirected when they are done
    // managing their billing with the portal.
    const return_url = req.body.rurl
    const customerId = req.body.cuid
    if (!isStringValid(return_url) || !isStringValid(customerId)) return res.sendStatus(400) // bad request

    const params: Stripe.BillingPortal.SessionCreateParams = {
      customer: customerId,
      return_url
    }

    stripeApp.billingPortal.sessions.create(params)
    const portalSession = await stripeApp.billingPortal.sessions.create(params);
    // Redirect to the URL for the session
    res.redirect(303, portalSession.url);


  },
  // 
  //
  //
  //
  //
  // EVENTS
  async handleWebhookEvent(req: Request, res: Response) {

    // PARAMS 
    console.log("------ webhook event ------")
    const sig = req.headers['stripe-signature'] as string
    const { endpointSecret } = stripeConfig
    let event: Stripe.Event
    try {
      event = stripeApp.webhooks.constructEvent(req.body, sig, endpointSecret)
    } catch (err) {
      return res.sendStatus(403) // forbidden
    }

    // https://stripe.com/docs/api/subscription_schedules/object
    // https://dashboard.stripe.com/webhooks/create?endpoint_location=hosted&events=subscription_schedule.aborted%2Csubscription_schedule.canceled%2Csubscription_schedule.completed%2Csubscription_schedule.created%2Csubscription_schedule.expiring%2Csubscription_schedule.released%2Csubscription_schedule.updated%2Ccustomer.subscription.created%2Ccustomer.subscription.deleted
    // $ stripe listen --forward-to localhost:8000/api/v1/payments/webhook
    // then Trigger events with the CLI: $ stripe trigger payment_intent.succeeded
    // Handle the event
    switch (event.type) {
      // https://stripe.com/docs/api/events/types#event_types-checkout.session.completed
      case 'checkout.session.completed':
        const completedSession = event.data.object as Stripe.Checkout.Session
        // Payment is successful and the subscription is created.
        // You should provision the subscription and save the customer ID to your database
        paymentService.handleSessionCompleted(completedSession)
        break;


      // https://stripe.com/docs/api/events/types#event_types-invoice.paid
      case 'invoice.paid':
        const paidInvoice = event.data.object as Stripe.Invoice;
        // Continue to provision the subscription as payments continue to be made.
        // Store the status in your database and check when a user accesses your service.
        // This approach helps you avoid hitting rate limits.
        paymentService.handleInvoicePaid(paidInvoice)
        break;


      // https://stripe.com/docs/api/events/types#event_types-customer.subscription.updated
      case 'customer.subscription.updated': // e.g. user switched to a cheaper subscription
        // Occurs whenever a subscription changes(e.g., switching from one plan to another, or changing the status from trial to active).
        const updatedSubscription = event.data.object as Stripe.Subscription;
        paymentService.handleSubscriptionUpdated(updatedSubscription)
        break;


      // https://stripe.com/docs/api/events/types#event_types-customer.subscription.deleted
      case 'customer.subscription.deleted': // Occurs whenever a customer’s subscription ends.
        const deletedSubscription = event.data.object as Stripe.Subscription;
        paymentService.handleSubscriptionDeleted(deletedSubscription)
        break


      // https://stripe.com/docs/api/events/types#event_types-invoice.payment_failed
      case 'invoice.payment_failed':
        const failedPayment = event.data.object as Stripe.Invoice;
        // The payment failed or the customer does not have a valid payment method.
        // The subscription becomes past_due. Notify your customer and send them to the
        // customer portal to update their payment information.
        paymentService.handlePaymentFailed(failedPayment)
        break;


      default:
      // Unhandled event type
    }

    // objects 
    // checkout SESSION : https://stripe.com/docs/api/checkout/sessions/object
    // SUBSCRIPTION: https://stripe.com/docs/api/subscriptions/object
    // INVOICE: https://stripe.com/docs/api/invoices/object



    // 'customer.subscription.created' // (ALREADY HANDLED by 'checkout.session.completed')
    // data.object is a subscription
    // Occurs whenever a customer is signed up for a new plan.

    //'customer.subscription.paused'
    // data.object is a subscription
    // Occurs whenever a customer’s subscription is paused.Only applies when subscriptions enter status = paused, not when payment collection is paused.

    // 'customer.subscription.pending_update_applied'
    // data.object is a subscription
    // Occurs whenever a customer’s subscription’s pending update is applied, and the subscription is updated.

    // 'customer.subscription.pending_update_expired'
    // data.object is a subscription
    // Occurs whenever a customer’s subscription’s pending update expires before the related invoice is paid.

    // 'customer.subscription.resumed'
    // data.object is a subscription
    // Occurs whenever a customer’s subscription is no longer paused.Only applies when a status = paused subscription is resumed, not when payment collection is resumed.

    // 'customer.subscription.trial_will_end'
    // data.object is a subscription
    // Occurs three days before a subscription’s trial period is scheduled to end, or when a trial is ended immediately(using trial_end = now).

    // Return a 200 response to acknowledge receipt of the event
    res.send();

  },
  //
  //
  // handle all webhooks here ...
  // TODO
}


export default paymentController