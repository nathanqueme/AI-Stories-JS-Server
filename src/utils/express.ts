import { NextFunction, Request, Response } from "express";
import ERRORS_MSGS from "../errorsMessages";
import { manualOverrideDetected } from "../lib";

const { NODE_ENV = "production", } = process.env
const production = NODE_ENV === "production"

export function errorMiddleware(
    err: Error, req: Request, res: Response, next: NextFunction
) {
    res.render('error', {
        message: err.message,
        // keep error private in production
        error: production ? 'An error occured.' : err
    });
}

export function blockBodyManualOverridesMiddleware(
    req: Request, res: Response, next: NextFunction
) {
    const paramsToCheck = ["uids"]
    const valuesAreOverriden = manualOverrideDetected(req, paramsToCheck)
    if (valuesAreOverriden) return res.status(403).send(ERRORS_MSGS.PARAM_OVERWRITE_FORBIDDEN)
    next();
}

export const allowedOrigins: (RegExp | string)[] = production ?
[
    'https://minipixkids.com/',     // exact path
    /\.minipixkids\.com$/,          // subdomains
    'https://nq-portfolio.com'
]
: [
    'http://localhost:3000', 
]

export function unsupportedRequestMiddleware(
    req: Request,
    res: Response
) {
    const error = {
        message: `Unsupported ${req.method.toLowerCase()} request.`,
        path: req.path,
        code: 404,
    }
    res.status(404).json(error);
}