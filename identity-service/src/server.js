require('dotenv').config()

const mongoose = require('mongoose')
const logger = require('./utils/logger')
const express = require('express')
const helmet = require('helmet')
const cors = require('cors')

const { RateLimiterRedis } = require('rate-limiter-flexible')
const Redis = require('ioredis')

const rateLimit = require('express-rate-limit')
const { RedisStore } = require('rate-limit-redis')

const routes = require('./routes/identity-service')
const errorHandle = require('./middleware/errorHandler')

const app = express()
const PORT = process.env.PORT || 3001

// connect to DB
mongoose.connect(process.env.MONGODB_URI)
    .then(() => logger.info('Connected to MongoDB'))
    .catch(e => logger.error('Mongo connection error', e))

// Redis connection
const redisClient = new Redis(process.env.REDIS_URL)

// middleware
app.use(helmet())
app.use(cors())
app.use(express.json())

app.use((req, res, next) => {
    logger.info(`Received ${req.method} request to ${req.url}`)
    logger.info(`Request Body ${JSON.stringify(req.body)}`)
    next()
})

// DDoS protection and rate limiting
const redisRateLimiter = new RateLimiterRedis({
    storeClient: redisClient,
    keyPrefix: 'middleware',
    points: 10,
    duration: 1
})

app.use((req, res, next) => {
    redisRateLimiter.consume(req.ip)
        .then(() => next())
        .catch(() => {
            logger.warn(`Rate limit exceeded for IP: ${req.ip}`)

            res.status(429).json({
                success: false,
                message: "Too many requests"
            })
        })
})

// IP-based limiter for sensitive endpoints
const sensitiveEndpointsLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 50,
    standardHeaders: true,
    legacyHeaders: false,

    handler: (req, res) => {
        logger.warn(`Sensitive endpoint rate limit exceeded for IP: ${req.ip}`)

        res.status(429).json({
            success: false,
            message: "Too many requests"
        })
    },

    store: new RedisStore({
        sendCommand: (...args) => redisClient.call(...args)
    })
})

// apply limiter
app.use('/api/auth/register', sensitiveEndpointsLimiter)

// routes
app.use('/api/auth', routes)

// error handler
app.use(errorHandle)

app.listen(PORT, () => {
    logger.info(`Identity service running on port ${PORT}`)
})

// unhandled promise rejection
process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled rejection at', promise, 'reason', reason)
})