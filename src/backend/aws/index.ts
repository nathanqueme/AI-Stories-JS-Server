
import { getMainLanguageLocale } from './comprehend'
import { translateText } from './translate'
import * as S3 from './s3'

const aws = {
    getMainLanguageLocale,
    translateText,
    S3
}
export default aws