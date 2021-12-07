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
    Member:{
        id: async (parent) => parent.id || parent._id
    },
    Query:{
        findAllMember: async (_, args, {mongo}) =>{
            const { first, skip, orderBy}=args

            const limit = first || 10
            const offset = skip || 0
            const obj = mongo.Member.find()

            if (first !== undefined) obj.limit(limit)
            if (skip !== undefined) obj.skip(offset)

            if (orderBy) obj.sort(buildMongoOrders(orderBy))
            else obj.sort({ _id: -1 }) // -1 = DESC

            return await obj.toArray()

        },
        findOneMember: async (_, args, {mongo}) =>{
            const member = args.id ? await mongo.Member.findOne({ _id: ObjectId(args.id),deletedAt: null }) : null;
            if(!!member){
                return member
            }
            return null
        }
    },
    Mutation: {
        createdMember: async (_, args, context)=>{
            const { mongo , user} = context
            
             args.updatedAt=new Date().getTime()
             args.createdAt=new Date().getTime()
             
             const state =await mongoCreate("Member", args, context)
            console.log(state.id)
            return{
                success: true,
                member:state,
                message:""
                }           
            }
            
        }

}