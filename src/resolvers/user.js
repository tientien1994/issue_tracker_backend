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
  User: {
    id: parent => parent._id || parent.id,
    avatar: async ({ _id }, args, { dataloaders }) => {
      if (!dataloaders) {
        console.log('No dataloaders provided')
      }
      return await dataloaders.get('photoByObjectLoader').load({ objectId: _id, objectType: 'User' })
    },
  },
  Subscription: {
    User: {
      subscribe: requiresAuth.createResolver(
        withFilter(
          () => pubsub.asyncIterator(process.env.APP_NAME + '-' + process.env.APP_ENV + '-User'),
          (payload, args) => {
            if (!payload) return false
            return compareObject(payload.User.node, args.dataFilter)
          }
        )
      )
    }
  },
  Query: {
    getUser: async (parent, args, context) => {
      if (!args.id) return null

      await checkPermissions(checkUserAuth)({ context })
      const { mongo, user } = context

      const theUser = await mongo.User.findOne({ _id: ObjectId(user._id), deletedAt: null })

      if (!!theUser && !!getRoles(theUser).isAdmin) {
        const { id } = args
        const { mongo, user } = context

        return await mongo.User.findOne({ _id: ObjectId(id), deletedAt: null })
      }

      return null
    },
    allUsers: requiresAuth.createResolver(async (parent, args, context) => {
      // Read
      const { allowAdmin, filter = {}, first, skip, orderBy } = args
      const { mongo, user } = context

      const currentUser = await mongo.User.findOne({ _id: ObjectId(user._id), deletedAt: null })
      const rolesObj = getRoles(currentUser)

      if (currentUser) {
        const limit = first || 10
        const offset = skip || 0
        if (!allowAdmin) {
          filter._id_ne = currentUser._id.toString()
        }
        const filters = buildMongoFilters(filter)
        const obj = mongo.User.find(filters)
          .sort(orderBy ? buildMongoOrders(orderBy) : { createdAt: -1 })
          .skip(offset)
          .limit(limit)
  
        return await obj.toArray()
      }
      return null
    }),
    _allUsersMeta: requiresAuth.createResolver(
      async (parent, { allowAdmin, filter }, { mongo, user }) => {
        const currentUser = await mongo.User.findOne({ _id: ObjectId(user._id), deletedAt: null })
        const rolesObj = getRoles(currentUser)
        if (!allowAdmin) {
          filter._id_ne = currentUser._id.toString()
        }
        if (currentUser) {
          const filters = buildMongoFilters(filter)
          const obj = await mongo.User.find(filters)

          return { count: obj.count() }
        }
        return { count: 0 }
      }
    ),
    me: requiresAuth.createResolver(async (parent, args, { mongo, user }) => {
      if (!user) return null
      return await mongo.User.findOne({ _id: ObjectId(user._id) })
    })
  },
  Mutation: {
    login: async (parent, args, { mongo, SECRET1, SECRET2 }) => {
      if ('username' in args) { args.username = args.username.toLowerCase().trim() }
      return await tryLogin(
        { username: args.username, password: args.password },
        { mongo, SECRET1, SECRET2 }
      ) 
    },
    createUser: async (parent, args, context) => {
      await checkPermissions(checkUserAuth)({ context })
      const { mongo, user } = context
      const currentUser = await mongo.User.findOne({ _id: ObjectId(user._id), deletedAt: null })
      const rolesObj = getRoles(currentUser)

      if (!!currentUser) {
        if ('username' in args) {
          const validation = await userValidation({
            user: Object.assign({}, args),
            mongo
          })

          if (validation.errors) {
            return {
              success: false,
              message: "Failed to update user. User already exists.",
              errors: validation.errors
            }
          }
        }

        if ('password' in args) {
          args.password = hashPassword(args.password)
        }

        args.approved = true
        
        try {
          if (!rolesObj.isAdmin && !!args.roles && !!args.roles.includes('Admin')) {
            return {
              success: false,
              message: 'Unauthorized Action'
            }
          }

          const newObj = prepareCreate(args)
          newObj._id = new ObjectId()

          let { user, errors } = await userValidation({ user: newObj, mongo })
          const userObj = user || newObj

          if (errors) {
            return {
              success: false,
              message: "Failed to create new user. User already exists.",
              errors: errors
            }
          } else {
            const rs = await mongo.User.insertOne(userObj)

            pubsub.publish(process.env.APP_NAME + '-' + process.env.APP_ENV + '-User', { User: { mutation: 'CREATED', node: userObj } })
          }

          return {
            success: true,
            message: "New user has been created",
            user: user
          }
        } catch (err) {
          return {
            success: false,
            message: "Failed to create new user",
            errors: formatErrors(err, mongo)
          }
        }
      }

      return {
        success: false
      }
    },
    updateUser: async (parent, args, context) => {
      // Update data
      await checkPermissions(checkUserAuth)({ context })
      const { mongo, user } = context

      const currentUser = await mongo.User.findOne({ _id: ObjectId(user._id), deletedAt: null })
      const updatedUser = await mongo.User.findOne({ _id: ObjectId(args.id), deletedAt: null })

      const rolesObj = getRoles(currentUser)

      if (!!currentUser && !!updatedUser && (!!rolesObj.isAdmin)) {
        const id = args.id
        

        if ('email' in args) { args.email = args.email.toLowerCase() }
        if ('password' in args) {
          args.password = hashPassword(args.password)
        }
        const sendEmail = !updatedUser.approved && !!args.approved
        
        const update = prepareUpdate(args)
        const obj = await mongo.User.updateOne(
          { _id: ObjectId(id) },
          { $set: update },
          { returnOriginal: false }
        )

        const lastUser = await mongo.User.findOne({ _id: ObjectId(id) })

        if (obj.modifiedCount) {
          pubsub.publish(process.env.APP_NAME + '-' + process.env.APP_ENV + '-User', {
            User: {
              mutation: 'UPDATED',
              node: { _id: ObjectId(id), roles: lastUser.roles }
            }
          })

          const updatedUser = await mongo.User.findOne({ _id: ObjectId(id) })

          if (sendEmail) {
            //Send Register Successfully Email
            agenda.now('register-successfully-ecommerce-email', {
              to: updatedUser.email,
              subject: 'Thanks for your registration. Your account has been approved!',
              fullName: updatedUser.fullName,
            })
          }
          return { user: updatedUser, success: true }
        } else {
          return new Error(
            JSON.stringify({ matchedCount: obj.matchedCount, modifiedCount: obj.modifiedCount })
          )
        }
      }
    },
    updateProfile: async (parent, args, context) => {
      await checkPermissions(checkUserAuth)({ context })
      const { mongo, user } = context

      const currentUser = await mongo.User.findOne({ _id: ObjectId(user._id), deletedAt: null })
      if (!!currentUser) {
        if ('email' in args) { args.email = args.email.toLowerCase() }
        
        const id = currentUser._id
        if ('currentPassword' in args && 'newPassword' in args &&  bcrypt.compareSync(args.currentPassword, currentUser.password)) {
          args.password = hashPassword(args.newPassword)
        }

        delete args.currentPassword 
        delete args.newPassword

        const update = prepareUpdate(args)
        const obj = await mongo.User.updateOne(
          { _id: ObjectId(id) },
          { $set: update },
          { returnOriginal: false }
        )
        const lastUser = await mongo.User.findOne({ _id: ObjectId(id) })

        if (obj.modifiedCount) {
          pubsub.publish(process.env.APP_NAME + '-' + process.env.APP_ENV + '-User', {
            User: {
              mutation: 'UPDATED',
              node: { _id: ObjectId(id), role: lastUser.role }
            }
          })
          return { user: lastUser, success: true }
        } else {
          return new Error(
            JSON.stringify({ matchedCount: obj.matchedCount, modifiedCount: obj.modifiedCount })
          )
        }
      }
    },
    deleteUser: async (parent, args, context) => {
      // Update data
      await checkPermissions(checkUserAuth)({ context })
      const { mongo, user } = context

      const currentUser = await mongo.User.findOne({ _id: ObjectId(user._id), deletedAt: null })
      const deletedUser = await mongo.User.findOne({ _id: ObjectId(args.id), deletedAt: null })
      if (!!currentUser && !!deletedUser && !!getRoles(currentUser).isAdmin) {
        await mongo.User.updateOne({ _id: ObjectId(args.id) }, { $set: { deletedAt: new Date().getTime() } })
        pubsub.publish(process.env.APP_NAME + '-' + process.env.APP_ENV + '-User', {
          User: {
            mutation: 'DELETED',
            previousValues: deletedUser,
            node: deletedUser
          }
        })

        return {
          success: true,
          message: 'User has been deleted'
        }
      }
    },
    registerAs: async (parent, args, context) => {
      const { mongo, user } = context
      const {email, mobileCode, mobileNumber } = args
      if ('email' in args) { args.email = args.email.toLowerCase() }
      if ('firstName' in args) { args.fullName = args.firstName + (!!args.lastName? ` ${args.lastName}` : '')}
      args.inactive = false
      args.approved = false
      args.roles = "Staff"
      if (!email && !(mobileCode && mobileNumber)) {
        return {
          success: false,
          message: "Required either email or mobile for new user registration"
        }
      }
      if ('password' in args) {
        args.password = hashPassword(args.password)
      }
      try {
        const newObj = prepareCreate(args)
        newObj._id = new ObjectId()
        let { user, errors } = await userValidation({ user: newObj, mongo })
        const userObj = user || newObj

        if (errors) {
          return {
            success: false,
            message: "Failed to create new user. User already exists.",
            errors: errors
          }
        } else {
          const rs = await mongo.User.insertOne(userObj)
          pubsub.publish(process.env.APP_NAME + '-' + process.env.APP_ENV + '-User', { User: { mutation: 'CREATED', node: userObj } })
          
        }

        return {
          success: true,
          message: "New user has been created",
          user: user
        }
      } catch (err) {
        return {
          success: false,
          message: "Failed to create new user",
          errors: formatErrors(err, mongo)
        }
      }
    }
  }
}
