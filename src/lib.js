import xlsx from 'xlsx'
import path from 'path'
import fs from 'fs'

const debug = require('debug')('sweet:xlsx')

export function parse ({file, fieldMap, defaults = {}} = {}) {
  checkFile(file)

  if (!fieldMap || typeof fieldMap !== 'object') {
    throw Error('need fieldMap, and type of fieldMap must be object')
  }

  const workbook = xlsx.readFile(file)
  const data = workbook.SheetNames.reduce((data, sheetName) => {
    const sheet = workbook.Sheets[sheetName]
    data = data.concat(xlsx.utils.sheet_to_json(sheet))
    return data
  }, [])
  debug('data of workbook:', data)
  return format(data, fieldMap, defaults)
}

function checkFile (file) {
  // file must can be read
  fs.accessSync(file, fs.constants.R_OK)
  debug(`${file} is accessieble`)
  const ext = path.extname(file)
  if (['.xlsx', '.xls'].indexOf(ext) === -1) {
    throw Error(`*.${ext} is not supported`)
  }
  const stat = fs.lstatSync(file)
  debug(`stat of ${file}:`, stat)
  if (!stat.isFile()) {
    throw Error(`${file} is not a file`)
  }
}

function format(rawData, fieldMap, defaults) {
  let ret = {error: false, data: [], reasons: []}

  rawData.forEach((t, index) => formatOne(t, index))

  return ret

  function formatOne (raw, index) {
    debug('format line', raw)
    let one = Object.keys(fieldMap).reduce((one, key) => {
      let fieldFormat = fieldMap[clearKey(key)]
      debug('key', key, 'field format', fieldFormat)

      let {field, required, defaultValue, isIn, map, isInt} = parseFieldFormat(fieldFormat)
      one[field] = raw && raw[key] && raw[key].replace(/\t/g, '')
      if (!one[field]) {
        if (defaultValue) {
          one[field] = defaultValue
        } else if (required) {
          ret.error = true
          ret.reasons.push(`${key} is required, index: ${index}`)
        }
      }

      if (isIn && isIn.length) {
        let i = 0, len = isIn.length
        while (i < len) {
          if (isIn[i] === one[field]) break
        }

        if (i === len) {
          ret.error = true
          ret.reasons.push(`value of ${key} is not in (${isIn.join(',')})`)
        }
      }

      if (map && one[field]) {
        one[field] = !!map[one[field]] ? map[one[field]] : one[field]
      }

      if (isInt && one[field] && !isNaN(parseInt(one[field]))) {
        one[field] = parseInt(one[field])
      }

      return one
    }, Object.assign({}, defaults))
    ret.data.push(one)
  }
}

function clearKey (key) {
  return key.toLowerCase().trim().replace(/\t/g, '')
}

function parseFieldFormat(format) {
  if (format.indexOf('!') === -1) {
    return {field: format}
  }
  let [field, helpers] = format.split('!')
  helpers = helpers.split('|')

  return helpers.reduce((ret, helper) => {
    if (isRequired(helper)) {
      ret.required = true
    } else if (isDefault(helper)) {
      let [, defaultValue] = helper.split('=')
      ret.defaultValue = defaultValue
    } else if (isIn(helper)) {
      let [, isIn] = helper.split('=')
      ret.isIn = isIn.split(',')
    } else if (isInt(helper)) {
      ret.isInt = true
    } else if (isMap(helper)) {
      let [, map] = helper.split('=')
      ret.map = map.split(',').reduce((map, curr) => {
        let [key, value] = curr.split(':')
        if (isNaN(parseInt(value))) {
          map[key] = value
        } else {
          map[key] = parseInt(value)
        }
        return map
      })
    }
    return ret
  }, {field})

  function isRequired (helper) {
    return contain(helper, 'required')
  }

  function isDefault (helper) {
    return contain(helper, 'default')
  }

  function isIn (helper) {
    return contain(helper, 'in')
  }

  function isMap (helper) {
    return contain(helper, 'map')
  }

  function isInt (helper) {
    return contain(helper, 'isInt')
  }
}

function contain (str, sub) {
  return str.indexOf(sub) !== -1
}
