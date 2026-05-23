require('dotenv').config()

const mongoose = require('mongoose')
const logger = require('./utils/logger')
const express = require('express')
const helmet = require('helmet')
const cors = require('cors')


const app = express()



//connect to DB
mongoose.connect(process.env.MONGODB_URI).then(()=> logger.info('Connected to Mongodb')).catch(e=>logger.error('Mongo connection error',e))


//middleware
app.use(helmet())
app.use(cors())
app.use(express.json())

app.use((req,res,next)=>{
    logger.info(`Recived ${req.method} request to ${req.url}`)
    logger.info(`Request Body ${req.body}`)
     next();
})


