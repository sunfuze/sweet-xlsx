'use strict'
import path from 'path'
import test from 'ava'
import { parse } from '../src/lib'

const debug = require('debug')('sweet:xlsx')

const example = path.resolve(__dirname, 'files', 'upload_device_example.xlsx')

test('parse xlsx should ok', t => {
  const field_map = {
    'imei': 'imei!required',
    'rfid': 'rfid!required',
    '设备注册码': 'regCode!default=123456',
    '设备号码': 'phone'
  }
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
