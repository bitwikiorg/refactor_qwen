// app/features/auth/routes.js
import { Router } from 'express';
import { celebrate } from 'celebrate'; // Ensure installed via npm install celebrate joi
import Joi from 'joi';
import loggerService from '../../services/logger';
import * as authSvcMod from './service';

const router = Router();

// Login endpoint with schema validation & enhanced security
router.post(
    '/login',
    celebrate({
        body: Joi.object({
            username: Joi.string().required(),
            password: Joi.string().required()
        })
    }),
    async (req, res) => {
        const { username, password } = req.body;

        try {
            const authResult = await authSvcMod.authenticate(username.toLowerCase(), password);

            return res.status(200).json({
                accessToken: `Bearer ${authResult.jwt}`,
                expiresAtUtc: authResult.expires,
                permissionsScopeId: authResult.roleId,
                refreshAvailableUntilUtcIsoString:
                    authResult.refreshExpires.toISOString()
            });

        } catch (err) {
            loggerService.error(`Auth Failed [${username}]: ${err.message}`);

            switch(err.code) {
                case 'AUTH_INVALID_CREDENTIALS':
                    return res.status(401).json({ message:"Invalid credentials"});

                case 'AUTH_ACCOUNT_LOCKED':
                    return res.status(429).json({ 
                        message:"Account locked - too many failed attempts",
                        retryAfterSeconds:Number(err.retryAfter)
                    });

                default:
                    return res.sendStatus(503);
            }
        }
    }
);

// Registration disabled - moved into approval workflow system
router.post('/register', (_req,res)=> 
    res.status(418).send("Registration requires prior approval")
);

// Protected profile endpoint showing session details + permissions map
router.get(
    '/me',
    authSvcMod.verifyJWTTokenMiddleware,

     // Enhanced response structure example assuming User model has these fields  
     ({user},res)=>{ 
         const sessionData ={
             userId:user._id.toString(),
             activeSessionCount:user.activeSessions.length,
             lastLoginAtISO:user.lastLogin?.toISOString() || null,
         };

         const permissionSet = getRolePermissions(user.roleId);

         return res.status(200).json({...sessionData,...permissionSet});
     }
);

function getRolePermissions(roleTypeId) {
   // Assume roles come back populated when verifying JWT token   
   switch(roleTypeId){
       case 1 /* Admin */:
           return {
               allowedApis:["*"],
               restrictedEndpoints:[],
               maxDailyRequests:Number.POSITIVE_INFINITY};

       case 2 /* Editor */:
           return {allowedApis:['/api/v*/content/*'],
                   maxDailyRequests:'unlimited'};

       default /* User */:
           throw new Error('Missing permission definition');
   }
}

export default router;