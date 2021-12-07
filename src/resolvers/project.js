import { ObjectId } from 'mongodb'
import buildMongoOrders from 'src/utils/buildMongoOrders'
import _ from 'lodash'

export default {
  Project: {
    id: async (parent) => parent.id || parent._id
  },
  Query: {
    findAllProject: async (_, args, { mongo }) => {
      const { first, skip, orderBy } = args

      const limit = first || 10
      const offset = skip || 0
      const obj = mongo.Project.find()

      if (first !== undefined) obj.limit(limit)
      if (skip !== undefined) obj.skip(offset)

      if (orderBy) obj.sort(buildMongoOrders(orderBy))
      else obj.sort({ _id: -1 }) // -1 = DESC

      return await obj.toArray()
    },
    findOneProject: async (_, args, { mongo }) => {
      console.log(args)
      const project = args.id ? await mongo.Project.findOne({ _id: ObjectId(args.id),deletedAt: null  }) : null;

      return project
    },
  },

  Mutation: {
    createProject: async (_, args, context) => {
      const { mongo } = context

      const { createProjectId } = await mongo.Project.insertOne(args)
      const createdProject = await mongo.Project.findOne({ _id: createProjectId ,deletedAt: null })

      return {
        success: true,
        project: createdProject
      }
    },
    updateProject: async (_, args, context) => {
      const { mongo } = context
      
      const { updateProjectId } = await mongo.Project.updateOne({_id:ObjectId(args.id)}, {$set:{
          name: args.name,
          description: args.description,
          updateAt:new Date().getTime()

      }})
      const updateProject = await mongo.Project.findOne({ _id: updateProjectId })
      return {
        success: true,
        project: updateProject
      }
    },
    deleteProject:async (_, args, context)=> {
      const { mongo } = context
      const deleteProject = await mongo.Project.findOne({ _id: ObjectId(args.id)})
        if(deleteProject!==null){
            await mongo.Project.deleteOne({ _id: ObjectId(args.id) })
            return {
                success: true,
                project:deleteProject,
                message:"Complete delete project"        
              }
        }
        else{
            return {
                success: false,
                project:null,
                message:"Can not Delete or Find this"
            }
        }
     
    }
  },
}