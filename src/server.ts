/**
 * server.ts
 * version 1.0.0
 * 
 * Created on the 01/01/2023
 */

/// <reference path="./tsExtension.d.ts" />
import "./utils/extensions" // Makes custom extensions usable.
import express, { Express, NextFunction, Request, Response } from "express";
import cors, { CorsOptions } from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv'; dotenv.config();
// (DEPRECATED) import homeMessage from "./homeMessage"
import ERRORS_MSGS from "./errors";
import paymentRouter from './endpoints/paymentRouter';
import { manualOverrideDetected } from "./services";
import { authRouter, demoRouter, devRouter, storiesRouter, userRouter } from "./endpoints";
import homeMessage from "./homeMessage";

// CONFIG
const { PORT = 8080, NODE_ENV = "production", COMPUTER_IP = "" } = process.env
const production = NODE_ENV === "production"
const app: Express = express();
app.use(cookieParser())
app.use(express.json({ limit: '5mb' }))
const allowedOrigins: (RegExp | string)[] = production ?
    [
        'https://minipixkids.com/',     // exact path
        /\.minipixkids\.com$/,          // subdomains
        'https://nq-portfolio.com'
    ]
    : ['http://localhost:3000', 'http://localhost:4000', `http://${COMPUTER_IP}:3000`]
// CORS middleware
const corsOptions: CorsOptions = {
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.some(item => item === origin || (typeof item === 'object' && item.test(origin)))) {
            callback(null, true);
        } else {
            callback(new Error(`Not allowed by CORS: ${origin}`));
        }
    }
};
app.use(cors(corsOptions));
app.get('/', (req: Request, res: Response) => {
    res.set('Content-Type', 'text/html');
    res.send(Buffer.from(homeMessage));
})
app.listen(PORT, () => {
    // e.g. production server is running on port 8000
    console.log(`${NODE_ENV} server is running on port ${PORT}`)
})




// ERROR MIDDLEWARES
/** Function that catches exeptions and uncaught errors */
function errorMiddleware(err: Error, req: Request, res: Response, next: NextFunction) {
    // console.error(err.stack); -> sensitive info e.g.: can contain the structure of the backend, syntax error at file: "path/file/" , JSON.parse(""), secretFunction() can not parse string
    res.render('error', {
        message: err.message,
        // keep error private in production
        error: production ? 'An error occured.' : err
    });
}
app.use(errorMiddleware)
function blockBodyManualOverridesMiddleware(req: Request, res: Response, next: NextFunction) {
    const paramsToCheck = ["uids"]
    const valuesAreOverriden = manualOverrideDetected(req, paramsToCheck)
    if (valuesAreOverriden) return res.status(403).send(ERRORS_MSGS.PARAM_OVERWRITE_FORBIDDEN)
    next(); // Call the next middleware or route handler
}
app.use(blockBodyManualOverridesMiddleware)


// ENDPOINTS 
app.use('/api/v1/auth', authRouter)
app.use('/api/v1/stories', storiesRouter)
app.use('/api/v1/payments', paymentRouter)
app.use('/api/v1/users', userRouter)
if (!production) {
    app.use('/dev', devRouter)
}
// PORTOFOLIO WEBSITE
app.use('/api/v1/demo', demoRouter)

// Middleware for handling unfound routes (404 errors)
app.use((req, res) => {
    const error = {
        message: `Unsupported ${req.method.toLowerCase()} request.`,
        path: req.path,
        code: 404,
    }
    res.status(404).json(error);
});
