/**
 * usage.ts
 * version 1.0.0
 * 
 * Created on the 06/01/2023
 */

import { MonthlyUsageData } from "../../../data";
import { ResourceType, UsageValueType } from "../../../types";
import { firestoreDB } from "../../configs";
import { getCollectionPath, updateNestedValue } from "./utils";

const resource : ResourceType = "monthly-usage"
const path = getCollectionPath(resource)


export function incrementReadCount(id: string) {
    return new Promise<string>(async (resolve, reject) => {

        const date = new Date(); const day = date.getUTCDate()
        const nestedProp = `reads.${day}` // specify nested property using dot notation
        updateNestedValue(id, nestedProp, resource, "incr")
            .then((res) => { resolve(`✅ ${"read-count" as UsageValueType} incremented`) })
            .catch(error => { reject(error) })

    })
}
export function incrementCreatedStoryCount(id: string, hl: string) {
    return new Promise<string>(async (resolve, reject) => {

        // ACTION
        const date = new Date(); const day = date.getUTCDate()
        const nestedProp = `created_stories.${day}.${hl}` // specify nested property using dot notation
        updateNestedValue(id, nestedProp, resource, "incr")
            .then((res) => { resolve(`✅ ${"created-story-count" as UsageValueType} incremented`) })
            .catch(error => { reject(error) })

    })
}
export function getUsageData(user_id: string, year: number) {
    return new Promise<MonthlyUsageData[]>(async (resolve, reject) => {

        var query = firestoreDB.collection(path)
            .where("user_id", "==", user_id)
            .where("year", "==", year)


        var monthlyUsages: MonthlyUsageData[] = []
        try {
            const querySnapshot = await query.get()
            querySnapshot.forEach(doc => {
                const monthlyUsage = doc.data() as MonthlyUsageData
                monthlyUsages.push(monthlyUsage)
            })
        } catch (error) {
            reject(error)
        }

        var sortedMonthlyUsages = monthlyUsages
            .sort(function (a, b) { // Sort by chronologicaly
                if (a.month < b.month) { return -1 }
                if (a.month > b.month) { return 1 }
                return 0
            })
        resolve(sortedMonthlyUsages)

    })
}