'use strict'
import path from 'path'
import test from 'ava'
import { parse } from '../src/lib'

const debug = require('debug')('sweet:xlsx')

const example = path.resolve(__dirname, 'files', 'upload_device_example.xlsx')
const error_example = path.resolve(__dirname, 'files', 'test-error.xlsx')

const field_map = {
  'imei': 'imei!required',
  'rfid': 'rfid!required',
  '设备注册码': 'regCode!default=123456',
  '设备号码': 'phone'
}

test('parse xlsx should ok', t => {
  let result
  try {
    result = parse({file: example, fieldMap: field_map})
  } catch (e) {
    debug('error:', e)
  }
  t.truthy(result)
  const data = result.data
  t.is(data.length, 1)
  const device = data[0]
  t.is(device.imei, '100000000000000')
  t.is(device.rfid, '2342343')
  t.is(device.regCode, '123456')
  t.is(device.phone, '134500000000')
})

test('parse error should return', t => {
  let {errors, data} = parse({file: error_example, fieldMap: field_map})

  debug('errors:', errors)
  debug('data:', data)

  t.truthy(errors)
  t.truthy(data)
  t.is(errors.length, 1)
  t.is(data.length, 2)
  let error = errors[0]
  let device = data[0]
  t.is(error.field, 'imei')
  t.is(error.method, 'required')
  t.is(error.index, 0)
  t.falsy(device.imei)
})
