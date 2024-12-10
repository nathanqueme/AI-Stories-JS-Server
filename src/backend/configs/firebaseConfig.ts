/**
 * firebaseConfig.ts
 * version 1.0.0
 * 
 * Created on the 23/01/2023
 */

// NOTE: all tables are to the plural (s)
const firebaseConfig = {
    MEDIA_BUCKET: process.env.FIREBASE_MEDIA_BUCKET ?? "",
    // PATHS 
    STORIES_PATH: "stories",
    CUSTOM_STORIES_PATH: "custom-stories",  
    LOGS_PATH: "logs", 
    LIKES_PATH: "likes", 
    TRANSLATIONS_PATH: "translations",
    MONTHLY_USAGES_PATH: "monthly-usages", 
    USER_CONTENT_INTERACTIONS_PATH: "user-content-interactions",
    GLOBAL_METRICS_PATH: "global-metrics",
    USERS_PATH: "users",
    READING_PROGRESSIONS_PATH: "reading-progressions", 
    NEWSLETTERS: "newsletters", 
}
export default firebaseConfig