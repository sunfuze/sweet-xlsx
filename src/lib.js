import xlsx from 'xlsx'
import path from 'path'
import fs from 'fs'

export function parse ({file, filedMap, defaults = {}}) {
  checkFile(file)
  let workbook = xlsx.readFile(file)

  let data = workbook.sheetnames.reduce((data, sheetName) => {
    let sheet = workbook.Sheets[sheetName]
    data = data.concat(sheet)
  }, [])
  return format(data, fieldMap, defaults)
}

function checkFile (file) {
  let ext = path.extname(file)
  if (['xlsx', 'xls'].indexOf(ext) === -1) {
    throw Error(`${ext} is not supported`)
  }
  let stat = fs.lstat(file)
  if (!stat.isFile()) {
    throw Error(`${file} is not a file`)
  }
}

function format(rawData, filedMap, defaults) {
  let ret = {error: false, data: [], reasons: []}

  rawData.forEach((t, index) => formatOne(t, fieldMap, index))

  return ret

  function formatOne (raw, fieldMap, index) {
    let one = Object.keys(fieldMap).reduce((one, key) => {
      let fieldFormat = filedMap[clearKey(key)]
      let {field, required, defaultValue, isIn, map, isInt} = parseFiledFormat(fieldFormat)
      one[field] = raw && raw[key] && raw[key].replace(/\t/g, '')
      if (!one[filed]) {
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
    }, Object.assign({}， defaults))
    ret.push(one)
  }
}

function clearKey (key) {
  return key.toLowerCase().trim().replace(/\t/g, '')
}

function parseFiledFormat(format) {
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
