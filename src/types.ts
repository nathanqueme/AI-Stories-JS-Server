/**
 * Types.ts
 * version 1.0.0
 * 
 * Created on the 04/02/2023
 */

export type MediaFolderName =
    "audios" |
    "collectibles" |
    "images" |
    "images_colorized" |
    "images_uncompressed"

export type VoiceNameType =
    "lily" |
    "samuel"

export type CollectibleAssetType =
    "3D_anim" |     // animated 3D GIF
    "mesh" |        // 3D model aka .ply mesh 
    "bs" |          // black silhouette
    "ws" |          // white silhouette
    "ms"            // main silhouette

export type ResourceType =
    "story" |
    "log" |
    "like" |
    "translation" |
    "monthly-usage" |
    "user-content-interaction" |
    "global-metric" |
    "user" |
    "custom-story" |
    "reading-progress" |
    "newsletters"

export type OpenaiImageFormatType =
    "url" |
    "b64_json"

export type OpenaiImageSizeType =
    "256x256" |
    "512x512" |
    "1024x1024"

export type ProductIdType =
    "p1" |
    "p2" |
    "p3"

export type PriceIdType =
    "xx1" |
    "xx2" |
    "xx3"

export type BotNameType =
    "Minipixbot-story"

export type SubscriptionPlanType =
    "trial-mode" |
    "standard" |
    "premium-max"

export type PaymentStateType =
    "paid" |
    "payment-failed" |
    null

export type BillingCycleType =
    "monthly" |
    "annually"

export type TransactionType =
    "+" |
    "-"

export type UsageValueType =
    "read-count" |
    "created-story-count"

export type UserTagType =
    "launch-user"

export type ColorType =
    "multicolor"

export type DataFormatType =
    "n-f" |
    "f" |
    "e"

// [AWS Dominant Language]  https://docs.aws.amazon.com/comprehend/latest/dg/how-languages.html