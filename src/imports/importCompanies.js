require("dotenv").config()

import connectMongo from "src/mongoConnector"
import companyData from "./data/companies.json"

const runImport = async () => {
  try {
    connectMongo().then(async (context) => {
      console.log("\n")
      console.log("Companies Importing...")
      console.log("\n")

      const { mongo } = context

      await Promise.all(companyData.map(async (company) => {
        await mongo.Company.updateOne({
          name: String(company['Company Name']).trim()
        }, {
          $set: {
            name: String(company['Company Name']).trim(),
            url: String(company['URL']),
            industry: String(company['Industry']),
            contacts: [{}],
            placementFees: [],
            status: 'ACTIVE'
          }
        }, {
          upsert: true
        })
      }))

      console.log("\n")
      console.log("Done!")
      console.log("\n")
      process.exit(0)
    })
  } catch (err) {
    console.log(err)
  }
}

runImport()
