import { ObjectId } from 'mongodb'
const DataLoader = require('dataloader')
import _ from 'lodash'


async function batchGetParameterTypeByCode(mongo, keys) {
  const keyObjs = keys.map(key => key.toString())
  return await mongo.ParameterType.find({ code: { $in: keyObjs }, deletedAt: null }).toArray()
}

async function batchGetCompanyPhotoById(mongo, keys) {
  const keyObjs = keys.map(key => ObjectId(key))
  return await mongo.Photo.find({ objectType: 'Company', objectId: { $in: keyObjs }, deletedAt: null }).sort({ position: 1, createdAt: -1 }).toArray()
}

async function batchGetPhotoByObject(mongo, keys) {
  const keyObjs = keys.map(key => ObjectId(key.objectId))
  const typeObjs = keys.map(key => key.objectType)
  return await mongo.Photo.find({ objectType: { $in: typeObjs }, objectId: { $in: keyObjs }, deletedAt: null }).sort({ objectType: 1, objectId: 1, position: 1, createdAt: -1}).toArray()
}

async function getDocumentByObject(mongo, keys) {
  const keyObjs = keys.map(({ objectId }) => ObjectId(objectId))
  const objectTypes = keys.map(({ objectType }) => String(objectType))
  const documentTypes = keys.map(({ documentType }) => String(documentType))

  return await mongo.Document.find({ 
    objectType: { $in: objectTypes }, 
    objectId: { $in: keyObjs }, 
    documentType: { $in: documentTypes },
    deletedAt: null 
  })
    .sort({ position: 1 })
    .toArray()
}

async function batchGetCompanyNoteById(mongo, keys) {
  const keyObjs = keys.map(key => ObjectId(key))
  return await mongo.Note.find({ objectType: 'Company', objectId: { $in: keyObjs }, deletedAt: null }).toArray()
}

async function batchGetCompanyActivityById(mongo, keys) {
  const keyObjs = keys.map(key => ObjectId(key))
  return await mongo.Activity.find({ objectType: 'Company', objectId: { $in: keyObjs }, deletedAt: null }).toArray()
}

async function batchGetPeopleNoteById(mongo, keys) {
  const keyObjs = keys.map(key => ObjectId(key))
  return await mongo.Note.find({ objectType: 'People', objectId: { $in: keyObjs }, deletedAt: null }).toArray()
}

async function batchGetPeopleActivityById(mongo, keys) {
  const keyObjs = keys.map(key => ObjectId(key))
  return await mongo.Activity.find({ objectType: 'People', objectId: { $in: keyObjs }, deletedAt: null }).toArray()
}

async function batchGetUserByIds(mongo, keys) {
  const keyObjs = keys.map(key => ObjectId(key))
  return await mongo.User.find({ _id: { $in: keyObjs }, deletedAt: null }).toArray()
}

async function batchGetCompanyById(mongo, keys) {
  const keyObjs = keys.map(key => ObjectId(key))
  return await mongo.Company.find({ _id: { $in: keyObjs }, deletedAt: null }).toArray()
}

async function batchGetWorkflowByIds(mongo, keys) {
  const keyObjs = keys.map(key => ObjectId(key))
  return await mongo.Workflow.find({ _id: { $in: keyObjs }, deletedAt: null }).toArray()
}

async function batchGetJobOrdersByCandidateIds(mongo, keys) {
  const keyObjs = keys.map(key => ObjectId(key))
  const jobApplicantsByCandidateId = await mongo.JobApplicant.find({ candidateId: { $in: keyObjs }, deletedAt: null }).toArray()
  const jobOrderIds = jobApplicantsByCandidateId.map(jobApplicant => ObjectId(jobApplicant.jobId))
  const jobOrders = await mongo.JobOrder.find({ _id: { $in: jobOrderIds }, deletedAt: null }).toArray()
  const result = jobOrders.map(jobOrder => ({
    ...jobOrder, 
    candidateIds: jobApplicantsByCandidateId.filter(jobApplicant => jobApplicant.jobId.toString() === jobOrder._id.toString()).map(jobApplicant => jobApplicant.candidateId.toString()) || null
  }))
  return result
}

async function batchGetJobOrderById(mongo, keys) {
  const keyObjs = keys.map(key => ObjectId(key))
  return await mongo.JobOrder.find({ _id: { $in: keyObjs }, deletedAt: null }).toArray()
}

async function batchGetPeopleById(mongo, keys) {
  const keyObjs = keys.map(key => ObjectId(key))
  return await mongo.People.find({ _id: { $in: keyObjs }, deletedAt: null }).toArray()
}

async function batchGetJobOrderNoteById(mongo, keys) {
  const keyObjs = keys.map(key => ObjectId(key))
  return await mongo.Note.find({ objectType: 'JobOrder', objectId: { $in: keyObjs }, deletedAt: null }).toArray()
}

async function batchGetJobOrderActivityById(mongo, keys) {
  const keyObjs = keys.map(key => ObjectId(key))
  return await mongo.Activity.find({ objectType: 'JobOrder', objectId: { $in: keyObjs }, deletedAt: null }).toArray()
}

async function batchGetPeoplePhotoById(mongo, keys) {
  const keyObjs = keys.map(key => ObjectId(key))
  return await mongo.Photo.find({ objectType: 'People', objectId: { $in: keyObjs }, deletedAt: null }).sort({ position: 1, createdAt: -1 }).toArray()
}

async function batchGetJobApplicantNoteById(mongo, keys) {
  const keyObjs = keys.map(key => ObjectId(key))
  return await mongo.Note.find({ objectType: 'JobApplicant', objectId: { $in: keyObjs }, deletedAt: null }).toArray()
}

async function batchGetJobApplicantActivityById(mongo, keys) {
  const keyObjs = keys.map(key => ObjectId(key))
  return await mongo.Activity.find({ objectType: 'JobApplicant', objectId: { $in: keyObjs }, deletedAt: null }).toArray()
}

module.exports = (mongo) => {
  const datamap = new Map()

  datamap.set('parameterTypeByCode', new DataLoader(
    keys => {
      const parameterTypes = batchGetParameterTypeByCode(mongo, keys)
      return Promise.all(keys.map(async (key) => {
        const readyParameterTypes = await parameterTypes
        return readyParameterTypes.find(type => type.code === key)
      }))
    },
    { cacheKeyFn: key => key }
  ))

  datamap.set('parameterValuesByType', new DataLoader(
    keys => {
      const parameterType = datamap.get('parameterTypeByCode')
      return Promise.all(keys.map(async (key) => {
        const readyParameterType = await parameterType.load(key)

        if (!!readyParameterType) {
          return readyParameterType.parameterValues || []
        }
        return []
      }))
    },
    { cacheKeyFn: key => key }
  ))

  datamap.set('companyPhotoByIdLoader', new DataLoader(
    keys => {
      const companyPhotos = batchGetCompanyPhotoById(mongo, keys)
      return Promise.all(keys.map(async (key) => {
        const readyCompanyPhotos = await companyPhotos
        return readyCompanyPhotos.find(photo => photo.objectId.toString() === key.toString())
      }))
    },
    { cacheKeyFn: key => key.toString() }
  ))

  datamap.set('photoByObjectLoader', new DataLoader(
    keys => {
      const photos = batchGetPhotoByObject(mongo, keys)
      return Promise.all(keys.map(async (key) => {
        const readyPhotos = await photos
        return readyPhotos.find(photo => photo.objectId.toString() === key.objectId.toString() &&
          photo.objectType.toString() === key.objectType.toString())
      }))
    },
    { cacheKeyFn: key => `${key.objectType.toString()}-${key.objectId.toString()}` }
  ))

  datamap.set('photosByObjectLoader', new DataLoader(
    keys => {
      const photos = batchGetPhotoByObject(mongo, keys)
      return Promise.all(keys.map(async (key) => {
        const readyPhotos = await photos
        return readyPhotos.filter(photo => photo.objectId.toString() === key.objectId.toString() &&
          photo.objectType.toString() === key.objectType.toString())
      }))
    },
    { cacheKeyFn: key => `${key.objectType.toString()}-${key.objectId.toString()}` }
  ))

  datamap.set('documentsByObject', new DataLoader(
    keys => {
      const documents = getDocumentByObject(mongo, keys)
      return Promise.all(keys.map(async (key) => {
        const readyDocuments = await documents
        return readyDocuments.filter(document => {
          return String(document.objectId) === String(key.objectId) && 
            String(document.objectType) === String(key.objectType) &&
            String(document.documentType) === String(key.documentType)
        })
      }))
    },
    { cacheKeyFn: ({ objectId, objectType, documentType }) => [objectId, objectType, documentType].join('-') }
  ))

  datamap.set('notesByCompanyIdLoader', new DataLoader(
    keys => {
      const companyNotes = batchGetCompanyNoteById(mongo, keys)
      return Promise.all(keys.map(async (key) => {
        const readyCompanyNotes = await companyNotes
        return readyCompanyNotes.filter(note => note.objectId.toString() === key.toString())
      }))
    },
    { cacheKeyFn: key => key.toString() }
  ))

  datamap.set('activitiesByCompanyIdLoader', new DataLoader(
    keys => {
      const companyActivities = batchGetCompanyActivityById(mongo, keys)
      return Promise.all(keys.map(async (key) => {
        const readyCompanyActivities = await companyActivities
        return readyCompanyActivities.filter(note => note.objectId.toString() === key.toString())
      }))
    },
    { cacheKeyFn: key => key.toString() }
  ))

  datamap.set('userByIdLoader', new DataLoader(
    keys => {
      const users = batchGetUserByIds(mongo, keys)
      return Promise.all(keys.map(async (key) => {
        const readyUsers = await users
        return readyUsers.find(user => user._id.toString() === key.toString())
      }))
    },
    { cacheKeyFn: key => key.toString() }
  ))

  datamap.set('notesByPeopleIdLoader', new DataLoader(
    keys => {
      const peopleNotes = batchGetPeopleNoteById(mongo, keys)
      return Promise.all(keys.map(async (key) => {
        const readyPeopleNotes = await peopleNotes
        return readyPeopleNotes.filter(note => note.objectId.toString() === key.toString())
      }))
    },
    { cacheKeyFn: key => key.toString() }
  ))

  datamap.set('activitiesByPeopleIdLoader', new DataLoader(
    keys => {
      const peopleActivities = batchGetPeopleActivityById(mongo, keys)
      return Promise.all(keys.map(async (key) => {
        const readyPeopleActivities = await peopleActivities
        return readyPeopleActivities.filter(note => note.objectId.toString() === key.toString())
      }))
    },
    { cacheKeyFn: key => key.toString() }
  ))

  datamap.set('companyByIdLoader', new DataLoader(
    keys => {
      const companies = batchGetCompanyById(mongo, keys)
      return Promise.all(keys.map(async (key) => {
        const readyCompanies = await companies
        return readyCompanies.find(company => company._id.toString() === key.toString())
      }))
    },
    { cacheKeyFn: key => key.toString() }
  ))
  
  datamap.set('workflowByIdLoader', new DataLoader(
    keys => {
      const workflows = batchGetWorkflowByIds(mongo, keys)
      return Promise.all(keys.map(async (key) => {
        const readyWorkflows = await workflows
        return readyWorkflows.find(workflow => workflow._id.toString() === key.toString())
      }))
    },
    { cacheKeyFn: key => key.toString() }
  ))

  datamap.set('jobOrderByCandidateIdLoader', new DataLoader(
    keys => {
      const jobOrders = batchGetJobOrdersByCandidateIds(mongo, keys)
      return Promise.all(keys.map(async (key) => {
        const readyJobOrders = await jobOrders
        return readyJobOrders.filter(jobOrder => (jobOrder.candidateIds || []).includes(key.toString()))
      }))
    },
    { cacheKeyFn: key => key.toString() }
  ))

  datamap.set('jobOrderByIdLoader', new DataLoader(
    keys => {
      const jobOrders = batchGetJobOrderById(mongo, keys)
      return Promise.all(keys.map(async (key) => {
        const readyJobOrders = await jobOrders
        return readyJobOrders.find(jobOrder => jobOrder._id.toString() === key.toString())
      }))
    },
    { cacheKeyFn: key => key.toString() }
  ))

  datamap.set('peopleByIdLoader', new DataLoader(
    keys => {
      const jobPeoples = batchGetPeopleById(mongo, keys)
      return Promise.all(keys.map(async (key) => {
        const readyJobPeoples = await jobPeoples
        return readyJobPeoples.find(jobPeople => jobPeople._id.toString() === key.toString())
      }))
    },
    { cacheKeyFn: key => key.toString() }
  ))

  datamap.set('notesByJobOrderIdLoader', new DataLoader(
    keys => {
      const jobOrderNotes = batchGetJobOrderNoteById(mongo, keys)
      return Promise.all(keys.map(async (key) => {
        const readyJobOrderNotes = await jobOrderNotes
        return readyJobOrderNotes.filter(note => note.objectId.toString() === key.toString())
      }))
    },
    { cacheKeyFn: key => key.toString() }
  ))

  datamap.set('activitiesByJobOrderIdLoader', new DataLoader(
    keys => {
      const jobOrderActivities = batchGetJobOrderActivityById(mongo, keys)
      return Promise.all(keys.map(async (key) => {
        const readyJobOrderActivities = await jobOrderActivities
        return readyJobOrderActivities.filter(note => note.objectId.toString() === key.toString())
      }))
    },
    { cacheKeyFn: key => key.toString() }
  ))

  datamap.set('peoplePhotoByIdLoader', new DataLoader(
    keys => {
      const peoplePhotos = batchGetPeoplePhotoById(mongo, keys)
      return Promise.all(keys.map(async (key) => {
        const readyPeoplePhotos = await peoplePhotos
        return readyPeoplePhotos.find(photo => photo.objectId.toString() === key.toString())
      }))
    },
    { cacheKeyFn: key => key.toString() }
  ))

  datamap.set('notesByJobApplicantIdLoader', new DataLoader(
    keys => {
      const companyNotes = batchGetJobApplicantNoteById(mongo, keys)
      return Promise.all(keys.map(async (key) => {
        const readyJobApplicantNotes = await companyNotes
        return readyJobApplicantNotes.filter(note => note.objectId.toString() === key.toString())
      }))
    },
    { cacheKeyFn: key => key.toString() }
  ))

  datamap.set('activitiesByJobApplicantIdLoader', new DataLoader(
    keys => {
      const companyActivities = batchGetJobApplicantActivityById(mongo, keys)
      return Promise.all(keys.map(async (key) => {
        const readyJobApplicantActivities = await companyActivities
        return readyJobApplicantActivities.filter(note => note.objectId.toString() === key.toString())
      }))
    },
    { cacheKeyFn: key => key.toString() }
  ))

  return datamap
}
