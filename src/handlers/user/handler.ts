/**
 * userController.ts
 * version 1.0.0
 * 
 * Created on the 20/09/2023
 */

import { Request, Response } from 'express'
import { db } from '../../core';
import { useUserAccess } from '../../lib';
import { devtools, generateID, isStringValid } from '../../utils';

const userController = {
    async handleUpdateReadingProgress(req: Request, res: Response) {

        // PARAMS 
        const { user_id } = await useUserAccess(req);
        if (!isStringValid(user_id)) return res.sendStatus(403);               // Account needed

        var params = {
            user_id: user_id!,
            story_id: req.body.sid as string,
            collectible_unlocked: req.body.cu === "1",      // "1" to avoid making "true" visible
            last_read_at: req.body.lta as string,
            first_read_at: req.body.fra as string | undefined
        }
        var increment_read_count = req.body.rc === "1"
        var scrolling_progress: number,
            reading_time_progress: number

        try {
            scrolling_progress = Number(req.body.sp);
            reading_time_progress = Number(Number(req.body.rtp).toFixed(2));
        }
        catch (error) { return res.sendStatus(400) }        // invalid sp OR rt

        if (
            !isStringValid(user_id) ||
            !isStringValid(params.story_id)
        ) return res.sendStatus(400)                        // required params not properly provided

        try {
            await db.updateReadingProgress({
                ...params,
                scrolling_progress,
                reading_time_progress
            }, increment_read_count)
        } catch (error) {
            devtools.log(error)
            return res.sendStatus(500)
        }

    },
    async handleSignupToNewsletters(req: Request, res: Response) {

        const email = req.body.e as string
        const signed_at = req.body.sa as string
        if (!isStringValid(email)) return res.sendStatus(400)

        try {
            const id = generateID(12, false),
                data = { id, email, signed_at }
            await db.setItem(data, "newsletters")
            res.sendStatus(200)
        } catch (error) {
            res.sendStatus(500)
        }

    }
}


export default userController