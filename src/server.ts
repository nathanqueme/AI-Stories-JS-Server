/**
 * Express.JS Server
 * version 1.0.0
 * 
 * Created on the 01/01/2023
 */

/// <reference path="./tsExtension.d.ts" />
import "./utils/extensions"

import express, { Express } from "express";
import cors, { CorsOptions } from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv'; dotenv.config();

import {
    errorMiddleware,
    blockBodyManualOverridesMiddleware,
    allowedOrigins,
    unsupportedRequestMiddleware
} from "./utils/express";
import {
    authRouter, demoRouter,
    devRouter, storiesRouter,
    userRouter
} from "./routes";


// [CONFIG] ================================
const { PORT = 8080, NODE_ENV = "production", } = process.env
const production = NODE_ENV === "production"
const app: Express = express();
const corsOptions: CorsOptions = {
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.some(item =>
            (item === origin) ||
            (typeof item === 'object' && item.test(origin))
        )) {
            callback(null, true);
        } else {
            callback(new Error(`Not allowed by CORS: ${origin}`));
        }
    }
};

// [MIDDLEWARES] ================================
app.use(express.json({ limit: '5mb' }))
app.use(cors(corsOptions));
app.use(cookieParser())
app.use(errorMiddleware)
app.use(blockBodyManualOverridesMiddleware)
app.use(unsupportedRequestMiddleware)

// [ROUTES] ================================
app.listen(PORT, () => {
    console.log(`${NODE_ENV} server is running on port ${PORT}`)
})

app.use('/api/v1/auth', authRouter)
app.use('/api/v1/stories', storiesRouter)
app.use('/api/v1/users', userRouter)
app.use('/api/v1/demo', demoRouter)
if (!production) {
    app.use('/dev', devRouter)
}
