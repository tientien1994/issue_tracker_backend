import EmailTemplate from 'email-templates'
import nodemailer from 'nodemailer'
require('dotenv').config();

var path = require('path')

const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST,
  port: process.env.MAIL_PORT,
  auth: {
    user: process.env.MAIL_USERNAME, // generated ethereal user
    pass: process.env.MAIL_PASSWORD // generated ethereal password
  },
  tls: {
    rejectUnauthorized: false
  }
})

const email = new EmailTemplate({
  message: {
    from: `${process.env.NAME} <${process.env.EMAIL_SUPPORT}>`
  },
  send: true,
  preview: true,
  transport: transporter,
  views: {
    root: path.join(__dirname, './templates'),
    options: {
      extension: 'ejs'
    }
  },
  juice: true,
  juiceResources: {
    preserveImportant: true,
    webResources: {
      relativeTo: path.join(__dirname, './templates')
    }
  }
})

export default email