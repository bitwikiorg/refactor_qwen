const RateLimiterMemoryStore = require("express-rate-limit").MemoryStore;

// Initialize limiter enforcing <=5 requests/IP/min globally across all API calls:
const apiLimiter = expressRateLimit({
 store:new RateLimiterMemoryStore(),
 windowMs :60 *1e3,//per minute 
 max :5,//requests 
 standardHeaders:true,//X-Rate-Limit headers enabled 
})

// Apply specifically before messages endpoint:
router.post("/messages/send",(req,res,next)=>{
 apiLimiter(req,res,next)
})

// Or alternatively wrap entire route group:
router.use("/api/v1/messages/",apiLimiter)