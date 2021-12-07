import requiresAuth, { checkUserAuth, checkPermissions } from 'src/utils/permissions'
import { ObjectId } from 'mongodb'
import buildMongoFilters from 'src/utils/buildMongoFilters.js'
import buildMongoOrders from 'src/utils/buildMongoOrders.js'
import { compareObject } from 'utils/model'
import pubsub from 'src/utils/pubsub'
import { withFilter } from 'graphql-subscriptions'
import { mongoCreate, mongoUpdate, mongoDelete } from 'utils/crud'
import _ from "lodash"

export default {
  Activity: {
    id: parent => parent._id || parent.id,
    creator: async ({ creatorId }, args, { dataloaders }) => {
      return !!creatorId ? await dataloaders.get('userByIdLoader').load(creatorId) : null
    },
  },
  Subscription: {
    Activity: {
      subscribe: requiresAuth.createResolver(
        withFilter(
          () => pubsub.asyncIterator(process.env.APP_NAME + '-' + process.env.APP_ENV +'-Activity'),
          (payload, args) => {
            return compareObject(payload.Activity.node, args.dataFilter)
          }
        )
      )
    }
  },
  Query: {
    getActivity: requiresAuth.createResolver(
      async (parent, { id }, { mongo, user }) => {
        const currentActivity = id ? await mongo.Activity.findOne({ _id: ObjectId(id), deletedAt: null }) : null
        return currentActivity
    }),
    allActivities: requiresAuth.createResolver(
      async (parent, { filter, first, skip, orderBy }, { mongo }) => {
        const limit = first || 10
        const offset = skip || 0
        const filters = buildMongoFilters(filter)
        const obj = mongo.Activity.find(filters)
        if (first) obj.limit(limit)
        if (skip) obj.skip(offset)
        if (orderBy) obj.sort(buildMongoOrders(orderBy))
        else obj.sort({ createdAt: -1 }) // -1 = DESC

        return await obj.toArray()
      }
    ),
    _allActivitiesMeta: requiresAuth.createResolver(
      async (parent, { filter }, { mongo }) => {
        const filters = buildMongoFilters(filter) || {}
        const obj = mongo.Activity.find(filters)

        return { count: obj.count() }
      }
    ),
  },
  Mutation: {
    createActivity: requiresAuth.createResolver(async (parent, args, context) => {
      await checkPermissions(checkUserAuth)({ context })

      const { mongo, user } = context

      const currentUser = await mongo.User.findOne({ _id: ObjectId(user._id), deletedAt: null })

      if (!!currentUser) {
        const activity = await mongoCreate('Activity', args, context)
        return {
          success: true,
          message: "Activity has been created successfully!",
          activity,
        }
      }

      return {
        success: false,
        message: "User is not authorized.",
      }
    }),
    updateActivity: requiresAuth.createResolver(async (parent, args, context) => {
      await checkPermissions(checkUserAuth)({ context })

      const { mongo, user } = context

      const currentUser = await mongo.User.findOne({ _id: ObjectId(user._id), deletedAt: null })

      if (!!currentUser) {

        const currentCategory = await mongoUpdate('Activity', args, context)
        const activityResponse = await mongo.Activity.findOne({ _id: ObjectId(args.id), deletedAt: null })

        return {
          success: true,
          message: "Activity has been updated successfully!",
          activity: activityResponse,
        }
      }
      return {
        success: false,
        message: "User is not authorized."
      }
    }),
    deleteActivity: requiresAuth.createResolver(async (parent, args, context) => {
      await checkPermissions(checkUserAuth)({ context })

      const { mongo, user } = context

      const currentUser = await mongo.User.findOne({ _id: ObjectId(user._id), deletedAt: null })

      if (!!currentUser) {
        await mongoDelete('Activity', args, context)
        return {
          success: true,
          message: "Activity has been deleted successfully!"
        }
      }
      return {
        success: false,
        message: "User is not authorized."
      }
    })
  }
}
