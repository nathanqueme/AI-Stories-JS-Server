/**
 * Types.ts
 * version 1.0.0
 * 
 * Created on the 04/02/2023
 */

// https://docs.aws.amazon.com/comprehend/latest/dg/how-languages.html

export type ColorType = "multicolor"
export type OpenaiImageFormatType = "url" | "b64_json"
export type OpenaiImageSizeType = "256x256" | "512x512" | "1024x1024"
// NOTE: all resource types are to the singular
export type ResourceType =
    "story" | "log" | "like" | "translation" |
    "monthly-usage" | "user-content-interaction" |
    "global-metric" | "user" | "custom-story" | 
    "reading-progress" | "newsletters"

/**
 * - `n-f` = `natural-form` The data is in it's original form.
 * - `f` = `flattened`      Minifacation is applied to the data by removing all datas' 
 *                          keys so that there is only values.
 * - `e` = `encrypted`      The data is returned encrypted using a secret-key and two 
 *                          way encryption technology.
 * - `bot-local`            (DEPRECATED) the data was created by a bot and saved locally. (Only in development.)
 */
export type DataFormatType = "n-f" | "f" | "e"
export type BotNameType = "Minipixbot-story"
export type SubscriptionPlanType = "trial-mode" | "standard" | "premium-max"
export type ProductIdType = "prod_NkmLTM0HABolPW" | "prod_NkmK0P10XmRmyB" | "prod_NkmIrq9BjNz9Co"
export type PriceIdType = "price_1MzGjRCJn9yoclfn5sU5HrSy" | "price_1MzGlbCJn9yoclfno1EYUcbI" | "price_1MzGmUCJn9yoclfnKP3CBhuj"
export type PaymentStateType = "paid" | "payment-failed" | null
export type BillingCycleType = "monthly" | "annually"
export type TransactionType = "+" | "-"
export type UsageValueType = "read-count" | "created-story-count"
export type UserTagType = "launch-user"
export type VoiceNameType = "lily" | "samuel"
export type MediaFolderName =
    "audios" |
    "collectibles" |
    "images" |
    "images_colorized" |      // alternate images colors
    "images_uncompressed"
export type CollectibleAssetType =
    "3D_anim" |     // animated 3D GIF
    "mesh" |        // 3D model aka .ply mesh 
    "bs" |          // black silhouette
    "ws" |          // white silhouette
    "ms"            // main silhouette