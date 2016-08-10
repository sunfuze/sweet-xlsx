'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var xlsx = _interopDefault(require('xlsx'));
var path = _interopDefault(require('path'));
var fs = _interopDefault(require('fs'));

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) {
  return typeof obj;
} : function (obj) {
  return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj;
};

var slicedToArray = function () {
  function sliceIterator(arr, i) {
    var _arr = [];
    var _n = true;
    var _d = false;
    var _e = undefined;

    try {
      for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) {
        _arr.push(_s.value);

        if (i && _arr.length === i) break;
      }
    } catch (err) {
      _d = true;
      _e = err;
    } finally {
      try {
        if (!_n && _i["return"]) _i["return"]();
      } finally {
        if (_d) throw _e;
      }
    }

    return _arr;
  }

  return function (arr, i) {
    if (Array.isArray(arr)) {
      return arr;
    } else if (Symbol.iterator in Object(arr)) {
      return sliceIterator(arr, i);
    } else {
      throw new TypeError("Invalid attempt to destructure non-iterable instance");
    }
  };
}();

var debug = require('debug')('sweet:xlsx');

function parse() {
  var _ref = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

  var file = _ref.file;
  var fieldMap = _ref.fieldMap;
  var _ref$defaults = _ref.defaults;
  var defaults = _ref$defaults === undefined ? {} : _ref$defaults;

  checkFile(file);

  if (!fieldMap || (typeof fieldMap === 'undefined' ? 'undefined' : _typeof(fieldMap)) !== 'object') {
    throw Error('need fieldMap, and type of fieldMap must be object');
  }

  var workbook = xlsx.readFile(file);
  var data = workbook.SheetNames.reduce(function (data, sheetName) {
    var sheet = workbook.Sheets[sheetName];
    data = data.concat(xlsx.utils.sheet_to_json(sheet));
    return data;
  }, []);
  debug('data of workbook:', data);
  return format(data, fieldMap, defaults);
}

function checkFile(file) {
  // file must can be read
  fs.accessSync(file, fs.constants.R_OK);
  debug(file + ' is accessieble');
  var ext = path.extname(file);
  if (['.xlsx', '.xls'].indexOf(ext) === -1) {
    throw Error('*.' + ext + ' is not supported');
  }
  var stat = fs.lstatSync(file);
  debug('stat of ' + file + ':', stat);
  if (!stat.isFile()) {
    throw Error(file + ' is not a file');
  }
}

function format(rawData, fieldMap, defaults) {
  var ret = { error: false, data: [], reasons: [] };

  rawData.forEach(function (t, index) {
    return formatOne(t, index);
  });

  return ret;

  function formatOne(raw, index) {
    debug('format line', raw);
    var one = Object.keys(fieldMap).reduce(function (one, key) {
      var fieldFormat = fieldMap[clearKey(key)];
      debug('key', key, 'field format', fieldFormat);

      var _parseFieldFormat = parseFieldFormat(fieldFormat);

      var field = _parseFieldFormat.field;
      var required = _parseFieldFormat.required;
      var defaultValue = _parseFieldFormat.defaultValue;
      var isIn = _parseFieldFormat.isIn;
      var map = _parseFieldFormat.map;
      var isInt = _parseFieldFormat.isInt;

      one[field] = raw && raw[key] && raw[key].replace(/\t/g, '');
      if (!one[field]) {
        if (defaultValue) {
          one[field] = defaultValue;
        } else if (required) {
          ret.error = true;
          ret.reasons.push(key + ' is required, index: ' + index);
        }
      }

      if (isIn && isIn.length) {
        var i = 0,
            len = isIn.length;
        while (i < len) {
          if (isIn[i] === one[field]) break;
        }

        if (i === len) {
          ret.error = true;
          ret.reasons.push('value of ' + key + ' is not in (' + isIn.join(',') + ')');
        }
      }

      if (map && one[field]) {
        one[field] = !!map[one[field]] ? map[one[field]] : one[field];
      }

      if (isInt && one[field] && !isNaN(parseInt(one[field]))) {
        one[field] = parseInt(one[field]);
      }

      return one;
    }, Object.assign({}, defaults));
    ret.data.push(one);
  }
}

function clearKey(key) {
  return key.toLowerCase().trim().replace(/\t/g, '');
}

function parseFieldFormat(format) {
  if (format.indexOf('!') === -1) {
    return { field: format };
  }

  var _format$split = format.split('!');

  var _format$split2 = slicedToArray(_format$split, 2);

  var field = _format$split2[0];
  var helpers = _format$split2[1];

  helpers = helpers.split('|');

  return helpers.reduce(function (ret, helper) {
    if (isRequired(helper)) {
      ret.required = true;
    } else if (isDefault(helper)) {
      var _helper$split = helper.split('=');

      var _helper$split2 = slicedToArray(_helper$split, 2);

      var defaultValue = _helper$split2[1];

      ret.defaultValue = defaultValue;
    } else if (isIn(helper)) {
      var _helper$split3 = helper.split('=');

      var _helper$split4 = slicedToArray(_helper$split3, 2);

      var _isIn = _helper$split4[1];

      ret.isIn = _isIn.split(',');
    } else if (isInt(helper)) {
      ret.isInt = true;
    } else if (isMap(helper)) {
      var _helper$split5 = helper.split('=');

      var _helper$split6 = slicedToArray(_helper$split5, 2);

      var map = _helper$split6[1];

      ret.map = map.split(',').reduce(function (map, curr) {
        var _curr$split = curr.split(':');

        var _curr$split2 = slicedToArray(_curr$split, 2);

        var key = _curr$split2[0];
        var value = _curr$split2[1];

        if (isNaN(parseInt(value))) {
          map[key] = value;
        } else {
          map[key] = parseInt(value);
        }
        return map;
      });
    }
    return ret;
  }, { field: field });

  function isRequired(helper) {
    return contain(helper, 'required');
  }

  function isDefault(helper) {
    return contain(helper, 'default');
  }

  function isIn(helper) {
    return contain(helper, 'in');
  }

  function isMap(helper) {
    return contain(helper, 'map');
  }

  function isInt(helper) {
    return contain(helper, 'isInt');
  }
}

function contain(str, sub) {
  return str.indexOf(sub) !== -1;
}

exports.parse = parse;
//# sourceMappingURL=lib.js.map
