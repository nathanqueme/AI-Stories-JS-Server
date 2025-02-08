/**
 * readingProgress.ts
 * version 1.0.0
 * 
 * Created on the 10/09/2023
 */

import admin from 'firebase-admin'
import { ReadingProgress } from '../../../models';
import { ResourceType } from "../../../types";
import { firestoreDB } from '../../clients';
import { getCollectionPath } from "./utils";

const resource: ResourceType = "reading-progress"
const path = getCollectionPath(resource)

interface UpdateParams {
    user_id: string;
    story_id: string;
    last_read_at?: string;
    first_read_at?: string;
    increment_read_count?: boolean;
    scrolling_progress?: number;
    reading_time_progress?: number;
    collectible_unlocked?: boolean;
}

export async function updateReadingProgress(body: UpdateParams, increment_read_count: boolean): Promise<string> {

    const id = ReadingProgress.getId(body.user_id, body.story_id)
    const ref = firestoreDB.collection(path).doc(id);
    var updateData: Record<string, any> = {};

    // Only add properties with non-null and non-undefined values to updateData
    for (const key in body) {
        const val = body[key as keyof typeof body];
        if ((val !== null) && (val !== undefined)) {
            updateData[key] = val;
        }
    }

    // Increment read_count by 1
    if (increment_read_count) {
        updateData.read_count = admin.firestore.FieldValue.increment(1);
    }

    try {
        delete updateData.user_id
        delete updateData.story_id
        await ref.update(updateData);
    }
    catch (error) { // no ITEM to update (NEW)
        updateData.id = id
        if (increment_read_count) updateData.read_count = 1 
        await ref.set(updateData)
    }

    return '✅ updated';
}