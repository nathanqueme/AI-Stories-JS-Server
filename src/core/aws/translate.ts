//
//  translate.ts
//  atsight_apis
//
//  Created by Nathan Queme the 10/04/22
//

import { translateClient } from '../clients'
import { TranslateTextCommand, TranslateTextCommandInput } from '@aws-sdk/client-translate'
import { isStringValid } from '../../utils'


/** 
 * - Translates the text into the given language. 
 * @param text: the thing to translate.
 * @param source_hl: the language the text is written into.
 * @param hl: the language the the text should be translated in.
 */
export function translateText(text: string, source_hl: string, hl: string): Promise<string> {
    return new Promise(async (resolve, reject) => {
        let commandInput: TranslateTextCommandInput = {
            Text: text,
            SourceLanguageCode: source_hl,
            TargetLanguageCode: hl
        }


        if (!isStringValid(text)) reject(`Error (400): Bad request, text is not a valid string.`)

        try {
            const result = await translateClient.send(
                new TranslateTextCommand(commandInput)
            )
            resolve(result?.TranslatedText ?? "")

        } catch (error) {
            reject(error)
        }
    })
}
