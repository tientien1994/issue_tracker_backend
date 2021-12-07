import express from 'express'
import { excelRoute } from './excel'

export const routes = (app, context) => {
  const { router } = context || {}
  router.use(express.json({ strict: false }))
  router.use(
    express.urlencoded({
      extended: false
    })
  )
  excelRoute(app, context)
  
  app.use('/', router)
}
