
require('dotenv').config()
import Agenda from 'agenda'
import { mongoURI } from 'utils'
import connectMongo from '../mongoConnector'
import email from './email'
import worker from './worker'


let agenda = new Agenda({
  db: {
    address: mongoURI({
      protocol: process.env.MONGO_DB_BG_PROTOCOL,
      name: process.env.MONGO_DB_BG_NAME,
      host: process.env.MONGO_DB_BG_HOST,
      username: process.env.MONGO_DB_BG_USERNAME,
      password: process.env.MONGO_DB_BG_PASSWORD,
      params: process.env.MONGO_DB_BG_PARAMS
    }),
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true
    }
  }
})

email(agenda)
worker(agenda)

connectMongo().then(context => { })

agenda.on('ready', function () {
  if (process.env.BACKGROUND_JOBS == 'ON') {
    agenda.every('1 seconds', 'process-queue')

    agenda.start()
  }
})

function graceful() {
  agenda.stop(function () {
    process.exit(0)
  })
}

process.on('SIGTERM', graceful)
process.on('SIGINT', graceful)

module.exports = agenda
