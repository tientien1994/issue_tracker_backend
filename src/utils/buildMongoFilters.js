import { convertObjectId, sanitizeRegex } from 'utils/common'
import { ObjectId } from 'mongodb'
import _ from 'lodash'
const processValue = value => {
  if (value && typeof value.getMonth === 'function') {
    return new Date(value).valueOf()
  }

  return value
}

const processOrAndFilter = filter => {
  // Note:
  // input = { '$or': [ { email: 'chardy@gmail.com' }, { email: 'abc@gmail.com' } ]}
  // output = { '$or': [ { email: { '$regex': '.*$chardy@gmail.com.*'} }, { email: { '$regex': '.*$abc@gmail.com.*'} } ]}

  let filters = []
  for (let key in filter) {
    let obj = filter[key]

    Object.keys(obj).forEach(item => {
      const k = item

      if (key && k) {
        filters.push(processFilter({ [k]: obj[k] }))
      }
    })
  }

  return filters
}

const processFilter = filter => {
  let filters = {}
  let newFilters = {}

  for (let key in filter) {
    if (filter[key] === '') {
      // Do nothing
    } else if (key == 'OR' || key == 'or') {
      // graphql = filter: { OR: [{email: "chardy@gmail.com"}, {email: "abc@gmail.com"}] }
      // output = { "$or":[{"email":{"$regex":".*chardy@gmail.com.*"}},{"email":{"$regex":".*abc@gmail.com.*"}}] }
      filters = { $or: processOrAndFilter(filter[key]) }
    } else if (key == 'AND' || key == 'and') {
      // graphql = filter: { AND: [{email: "chardy@gmail.com"}, {email: "abc@gmail.com"}] }
      // output = { "$and":[{"email":{"$regex":".*chardy@gmail.com.*"}},{"email":{"$regex":".*abc@gmail.com.*"}}] }
      filters = { $and: processOrAndFilter(filter[key]) }
    } else if (key.indexOf("_id") > 0 && key.includes('_id')) {
      // equal ==
      // graphql = filter: { amount_eq: 20}
      // output = { email: { $eq: 20 }}
      filters = { [key.replace('_id', '')]: ObjectId(filter[key]) }
    } else if (key.includes('_eq')) {
      // equal ==
      // graphql = filter: { amount_eq: 20}
      // output = { email: { $eq: 20 }}
      filters = { [key.replace('_eq', '')]: { $eq: processValue(filter[key]) } }
    } else if (key.includes('_ne')) {
      // not equal !=
      // graphql = filter: { amount_ne: 20}
      // output = { email: { $ne: 20 }}
      filters = { [key.replace('_ne', '')]: { $ne: processValue(filter[key]) } }
    } else if (key.includes('_lte')) {
      // less than equal <=
      // graphql = filter: { amount_lte: 20}
      // output = { email: { $lt: 20 }}
      filters = { [key.replace('_lte', '')]: { $lte: processValue(filter[key]) } }
    } else if (key.includes('_gte')) {
      // greater than equal >=
      // graphql = filter: { amount_gte: 20}
      // output = { email: { $lt: 20 }}
      filters = { [key.replace('_gte', '')]: { $gte: processValue(filter[key]) } }
    } else if (key.includes('_lt')) {
      // less than <
      // graphql = filter: { amount_lt: 20}
      // output = { email: { $lt: 20 }}
      filters = { [key.replace('_lt', '')]: { $lt: processValue(filter[key]) } }
    } else if (key.includes('_gt')) {
      // greater than >
      // graphql = filter: { amount_gt: 20}
      // output = { email: { $lt: 20 }}
      filters = { [key.replace('_gt', '')]: { $gt: processValue(filter[key]) } }
    } else if (key.includes('_in')) {
      // same like IN sql
      // graphql = filter: { email_in: ["chardy@gmail.com", "abc@gmail.com"]}
      // output = { email: { $in: ["chardy@gmail.com", "abc@gmail.com"] }}
      filters = { [key.replace('_in', '')]: { $in: processValue(filter[key]) } }
    } else if (key.includes('_all')) {
      // same like IN sql
      // graphql = filter: { email_all: ["chardy@gmail.com", "abc@gmail.com"]}
      // output = { email: { $all: ["chardy@gmail.com", "abc@gmail.com"] }}
      filters = { [key.replace('_all', '')]: { $all: filter[key] } }
    } else if (key.includes('_nin')) {
      // not in
      // graphql = filter: { email_nin: ["chardy@gmail.com", "abc@gmail.com"]}
      // output = { email: { $nin: ["chardy@gmail.com", "abc@gmail.com"] }}
      filters = { [key.replace('_nin', '')]: { $nin: processValue(filter[key]) } }
    } else if (key.includes('_contains')) {
      // same like LIKE in SQL
      // graphql = filter: { email_contains: "chardy@gmail.com" }
      // output = {"username":{"$regex":".*char.*"}}
      filters = { [key.replace('_contains', '')]: { $regex: `.*${sanitizeRegex(filter[key])}.*` } }
    } else if (key.includes('_regex')) {
      // use REGEX to search
      // graphql = filter: { email_regex: "^abc.*" }
      // output = {"email":{"$regex":"^abc.*"}}
      filters = { [key.replace('_regex', '')]: { $regex: `${sanitizeRegex(filter[key])}`, $options: 'i' } }
    } else {
      // no regex search
      // graphql = filter: {email:"chardy@gmail.com"}
      // output = { "email":"chardy@gmail.com" }
      filters = { [key]: filter[key] }
    }
    newFilters = convertObjectId(_.merge(newFilters,filters))
  }

  return newFilters
}

export default filter => {
  const newFilters = processFilter(filter)
  return { ...newFilters, deletedAt: null }
}
