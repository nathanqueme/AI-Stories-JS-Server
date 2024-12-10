/**
 * Errors.ts
 * version 1.0.0
 * 
 * Created on the 01/01/2023
 * 
 * During prod mode use messages which are as general as possible to not divulge any 
 * information on how the server is working.
 */

const ERRORS_MSGS = {
  // can also occur when a param is present but it is not in the correct format. e.g.: a number property was received as a string. 
  BAD_REQUEST_MISSING_PARAMS: 'Bad request', // , missing required parameter.
  UNAUTHORIZED_ACCESS: "Unauthorized", // 401
  FORBIDDEN: "Forbidden", // 403
  FORBIDDEN_ACCOUNT_NEEDED: "Forbidden", // 403 Action requires having an account. (or using a bot)
  OPENAI_RESPONSE_ERROR: "Error",// 'OpenAI response error.',
  SERVER_ERROR: "Error",
  PARAM_OVERWRITE_FORBIDDEN: "Forbidden", // Manual param setting is not allowed.
  ELEMENT_NOT_FOUND: "Element not found.", 
  INVALID_REQUEST: "Invalid request",
  STORY: {
    GET_LIKES_ERROR: "Can't get likes",
    GET_LIST_ERROR: "Can't get stories",
    GET_LIST_BY_ID_ERROR: "Can't get stories",
    GET_ERROR: "Can't get story",
    NOT_FOUND: "Story not found.", 
    LIKE_ERROR: "Failed liking story",
    UNLIKE_ERROR: "Can't unlike story",
    INCREMENTATION_ERROR: "Can't update story", 
    USAGE_DATA_ERROR: "Can't save usage data",
    GET_USAGE_DATA_ERROR: "Can't get usage data",
  }
}
export default ERRORS_MSGS