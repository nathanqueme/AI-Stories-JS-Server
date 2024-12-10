/**
 * tsExtension.d.ts
 * version 1.0.0
 * 
 * Created on the 15/03/2023
 */
 
import { Request } from 'express';
import { JwtPayload } from 'jsonwebtoken';

declare global {
  namespace Express {
    interface Request {
      /** 
      * - Current users' `decodedIdToken` if signed in. 
      * - `decodedIdToken.uid` is used to restrict access to secured endpoints.  
      */
      decodedIdToken?: admin.auth.DecodedIdToken;
      /**
       * - The Bot if any
       */
      bot: BotData | undefined
    }
  }
}
  