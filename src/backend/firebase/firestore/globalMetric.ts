/**
 * like.ts
 * version 1.0.0
 * 
 * Created on the 06/01/2023
 */

import { GlobalMetricData } from "../../../data"
import { getCollectionPath, updateNestedValue } from "./utils"
import { ResourceType } from "../../../types"
import { firestoreDB } from "../../configs"

const resource: ResourceType = "global-metric"
const path = getCollectionPath(resource)


export function getGlobalMetric(metricResource: ResourceType): Promise<GlobalMetricData | null> {
    return new Promise(async (resolve, reject) => {
        try {
            const query = firestoreDB
                .collection(path)
                .where("resource", "==", metricResource)
                .limit(1)

            const snapshot = await query.get()
            const globalMetric = snapshot.docs.length > 0 ? snapshot.docs[0].data() as GlobalMetricData : null
            resolve(globalMetric)

        } catch (error) {
            reject(error)
        }
    })
}

/** @param nestedProp the nested property of the global metric data. By default it is "count" */
export function updateGlobalMetricCount(metricResource: "custom-story" | "story" | "user", operation: "incr" | "decr", nestedProp = "count") {
    return new Promise<string>(async (resolve, reject) => {
        // the id is the collection path, e.g. "stories" for "story"
        const id = getCollectionPath(metricResource)
        updateNestedValue(id, nestedProp, resource, operation)
            .then(response => resolve(response))
            .catch(error => reject(error))
    })
}