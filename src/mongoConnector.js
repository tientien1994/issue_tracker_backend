/* es-lint disable */
require('dotenv').config()
import { Logger, MongoClient } from "mongodb"
import { mongoURI } from "utils"
import Utils from "utils/index"
/**
 * Export a function that connects to the db and returns the collections
 * your resolvers will use.
 */
export default async () => {
  /**
   * Specify the url for connecting to the desired MongoDB instance.
   * This is the default url usually available, but feel free to replace
   * it with your own if different.
   */
  Utils() // load String prototypes
  // Connecting to MongoDB is an async operation, so we need to wait here.
  const mongoClient = await MongoClient.connect(
    mongoURI({
      protocol: process.env.MONGO_DB_PROTOCOL,
      name: process.env.MONGO_DB_NAME,
      host: process.env.MONGO_DB_HOST,
      username: process.env.MONGO_DB_USERNAME,
      password: process.env.MONGO_DB_PASSWORD,
      params: process.env.MONGO_DB_PARAMS,
    }),
    {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    }
  )
  const db = mongoClient.db(process.env.MONGO_DB_NAME)

  if (process.env.MONGO_DB_DEBUG_LOG === "VERBOSE") {
    let logCount = 0
    Logger.setCurrentLogger((msg, state) => {
      console.log(`REQUEST ${++logCount}: ${msg}`)
    })
    Logger.setLevel("debug")
    Logger.filter("class", ["Cursor", "Server"])
    // Logger.filter('class', ['Cursor'])
  }

  return {
    mongo: {
      AppSetting: db.collection("appSettings"),
      User: db.collection("users"),
      Tenant: db.collection("tenants"),
      Report: db.collection("reports"),
      Project: db.collection("projects"),
      Pipeline: db.collection("pipelines"),
      Label: db.collection("labels"),
      Issue: db.collection("issues"),
      ParameterType: db.collection("parameterTypes"),
      Member:db.collection("members"),
    },
    db,
  }
}
