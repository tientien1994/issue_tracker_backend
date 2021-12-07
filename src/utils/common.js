import { ObjectId } from 'mongodb'

const convertObject = (object, key, convertId=false) => {
	if (!object[key]) return null

	if (object[key].constructor == String) {
		if (convertId || key.match(/^[A-z]+Id$/)) object[key] = ObjectId(object[key])
		if (convertId || key === '_id') object[key] = ObjectId(object[key])
	}
	else if (object[key].constructor == Array) {
		if (convertId || key.match(/^[A-z]+Id$/)) object[key] = object[key].map(value => !!value && ObjectId(value) || null)
		if (convertId || key === '_id') object[key] = object[key].map(value => !!value && ObjectId(value) || null)
	}
	else if (object[key].constructor == Object) {
		if (convertId || key.match(/^[A-z]+Id$/)) object[key] = convertObjectKey(object[key], true)
		if (convertId || key === '_id') object[key] = convertObjectKey(object[key], true)
	}

  return object
}

const convertObjectKey = (object, convertId = false) => {
  Object.keys(object).map(key => {
    convertObject(object, key, convertId)
  })
  return object
}

export const convertObjectId = object => {
  return convertObjectKey(object)
}

export function sanitizeRegex(str) {
	if (!str) { return '' }

	const trimmedStr = str.trim()
	const sanitizedStr = trimmedStr.replace(/[#-.]|[[-^]|[?|{}]/g, '\\$&')

	return sanitizedStr
}


export const formatSlug = (title) => {
	const dashify = (title || '').toLowerCase().replace(/[^a-zA-Z\d:]/g, '-')
	const simplify = dashify.replace(/(-)\1+/g, '-')

	return simplify
}