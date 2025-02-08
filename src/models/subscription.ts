/**
 * version 1.0.0
 * 
 * Created on the 12/03/2023
 * 
 * /** PRICES & PLANS : 
*/

import { SubscriptionPlanType, BillingCycleType, } from '../types'

export interface SubscriptionPlanData {
    type: SubscriptionPlanType
    name: string
    story_count: number
    new_story_count: number,
    custom_story_count: number,
    translation: boolean
    price: {
        value: number,
        currency: string
    } | null,
    billing_cycle: BillingCycleType
    product_id: string
    price_id: string
}
export const SubscriptionPlanData = {
    object(type: SubscriptionPlanType, name: string, story_count: number, new_story_count: number, custom_story_count: number, translation: boolean, price: { value: number, currency: string } | null, billing_cycle: BillingCycleType, product_id: string, price_id: string) {
        return {
            type: type ?? null,
            name: name ?? null,
            story_count: story_count ?? null,
            new_story_count: new_story_count ?? null,
            custom_story_count: custom_story_count ?? null,
            translation: translation ?? null,
            price: price ?? null,
            billing_cycle: billing_cycle ?? null,
            product_id: product_id ?? null,
            price_id: price_id ?? null,
        }
    }
}

export const subscriptionPlans: SubscriptionPlanData[] = [
    SubscriptionPlanData.object("trial-mode", "Trial mode", 7, 0, 0, false, null, "monthly", "p1", "xx1"), 
    SubscriptionPlanData.object("standard", "Standard", 90, 0, 0, true, { value: 4.99, currency: "€" }, "monthly", "p2", "xx2"), 
    SubscriptionPlanData.object("premium-max", "Premium max", 200, 2, 0, true, { value: 9.99, currency: "€" }, "monthly", "p3", "xx3")
]