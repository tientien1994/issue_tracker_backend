require("dotenv").config()

import connectMongo from "src/mongoConnector"

const runIndexing = async () => {
  try {
    connectMongo().then(async (context) => {
      console.log("\n")
      console.log("Create index.")
      console.log("\n")

     
      console.log("Done!")
      console.log("\n")
      process.exit(0)
    })
  } catch (err) {
    console.log(err)
  }
}
runIndexing()
