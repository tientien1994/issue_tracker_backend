import requiresAuth, { checkUserAuth, checkPermissions } from 'src/utils/permissions'
import { ObjectId } from 'mongodb'
import { prepareCreate, prepareUpdate, compareObject } from 'src/utils/model'
import { getRoles, getCustomerRoles } from 'src/utils/authentication'
import { withFilter } from 'graphql-subscriptions'
import pubsub from 'src/utils/pubsub'
import userValidation from 'src/validations/user'
import buildMongoFilters from 'src/utils/buildMongoFilters'
import buildMongoOrders from 'src/utils/buildMongoOrders'
import _ from 'lodash'
import { tryLogin, hashPassword, tryLoginEcommerce, tryLoginDriver } from 'src/utils/auth'
import bcrypt from 'bcryptjs'
import agenda from 'jobs'
import { sms } from 'src/utils/auth/vonage'
import {isEmptyObject, isBlankString} from "utils/validate"
import { mongoCreate, mongoUpdate, mongoDelete } from "utils/crud"

export default {
  Pipeline: {
    id: async (parent) => parent.id || parent._id
  },
  Query: {
    findAllPipeline: async (_, args, { mongo }) => {
      const { first, skip, orderBy } = args

      const limit = first || 10
      const offset = skip || 0
      const obj = mongo.Pipeline.find()

      if (first !== undefined) obj.limit(limit)
      if (skip !== undefined) obj.skip(offset)

      if (orderBy) obj.sort(buildMongoOrders(orderBy))
      else obj.sort({ _id: -1 }) // -1 = DESC

      return await obj.toArray()
    },
    findOnePipeline: async (_, args, { mongo }) => {
      console.log(args)
      const pipeline = args.id ? await mongo.Pipeline.findOne({ _id: ObjectId(args.id) }) : null;
      return pipeline
    },
  },

  Mutation: {
    createPipeline: async (_, args, context) => {
      const { mongo } = context
        args.updatedAt=new Date().getTime()
        args.createdAt=new Date().getTime()
      //const { createProjectId } = await mongo.Project.insertOne(args)
      //const createdProject = await mongo.Project.findOne({ _id: createProjectId })
       await mongoCreate("Pipeline", args, context)
      return {
        success: true,
        project: null
      }
    },
    updatePipeline: async (_, args, context) => {
      const { mongo , user} = context
      
      const updatePipeline = await mongo.Pipeline.findOne({ _id: ObjectId(args.id)})
      if(!!updatePipeline){
          await mongoUpdate('Pipeline', args, context)
          const pipeReponsive=await mongo.Pipeline.findOne({ _id: ObjectId(args.id), deletedAt: null })
          return {
            success: true,
            message: "Pipeline has been updated successfully!",
            pipeline:pipeReponsive
          }
      }
      return {
        success: false,
        message: "Pipeline is not to be."
      }
    },
    
    deletePipeline:async (_, args, context)=> {
      const { mongo } = context
      const deletePipeline = await mongo.Pipeline.findOne({ _id: ObjectId(args.id)})
        if(!!deletePipeline){
            if(deletePipeline.deletedAt===null){
                await mongoDelete('Pipeline', args, context)
            return {
                success: true,
                message: "Pipeline has been deleted successfully!"     
              }
            }  
            else{
                return {
                    success: true,
                    message: "Has been deleted before!"     
                  }
            }              
            
        }
        else{
            return {
            success: false,
            message: "User is not authorized."
            }
        }
     
    }
  },
}