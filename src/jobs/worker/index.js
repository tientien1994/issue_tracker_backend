import { ObjectId } from 'mongodb'
import mongoConnector from "../../mongoConnector"

async function userIds (mongo, userIds) {
  return await mongo.User.find({ 
    _id: { 
      $in: userIds.map(i => ObjectId(i))
    },
    deletedAt: null
  }).toArray() || null
}

export default agenda => {
  try {
    agenda.define(`people-email-worker`, async (job) => {
      const { mongo } = await mongoConnector()
      const { to, peopleEmailId } = job.attrs.data || {}
      const currentPeopleEmail = peopleEmailId ? await mongo.PeopleEmail.findOne({ _id: ObjectId(peopleEmailId), deletedAt: null}) : null
      const currentDocuments = peopleEmailId ? await mongo.Document.find({
        objectType: "PeopleEmail", objectId: ObjectId(peopleEmailId), deletedAt: null
      }).toArray() : []
      if (currentPeopleEmail) {
        const {ccIds, bccIds, subject, content} = currentPeopleEmail
        const ccUsers = ccIds && ccIds.length > 0 && await userIds(mongo, ccIds) || null
        const bccUsers = bccIds && bccIds.length > 0 && await userIds(mongo, bccIds) || null
        let emailVariables = {
          to,
          subject,
          body: content,
        }
        if (ccUsers && ccUsers.length > 0) {
          emailVariables["cc"] = ccUsers.map(i => i.email)
        }
        if (bccUsers && bccUsers.length > 0) {
          emailVariables["bcc"] = bccUsers.map(i => i.email)
        }
        if (currentDocuments && currentDocuments.length > 0) {
          emailVariables["attachments"] = currentDocuments.map(i => ({
            filename: i.documentName,
            path: i.documentUrl
          }))
        }
        agenda.now("people-send-email", emailVariables)
      }
    })
  } catch (err) {
    console.log('⛔️ ⛔️ ⛔️ Error Status: 500 - ', err)
  }
}