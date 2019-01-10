var random = require('./random');
var oneOf = require('./combinators').oneOf;

exports.String = string;
exports.Boolean = boolean;
exports.Null = nullVal;
exports.Number = number;
exports.Value = value;



function value(){
    return random.randomElement([number,string,number,string,number,string,nullVal,boolean])();
}

function string(){
    return function (accum$) {
        while (Math.random() < .9) {
          accum$.push(String.fromCharCode(32 + random.randomInt(94)));
        }
        return accum$;
      }.call(this, []).join('');
}

function nullVal(){
    return null
}

function boolean(){
    return random.randomBool();
}

function number(){
    return oneOf([
        function () {
          return function () {
            value = 0;
            return formatInt(value);
          };
        }(),
        function () {
          return function () {
            value = random.randomInt(1e6);
            return formatInt(value);
          };
        }(),
        function () {
          return function () {
            value = random.randomInt(Math.pow(2, 53) - 1);
            return formatInt(value);
          };
        }(),
        function () {
          return function () {
            var base, size;
            size = random.randomInt(20);
            base = random.randomInt(200) / 100;
            raw = '' + base + random.randomElement([
              'e',
              'E'
            ]) + size;
            return value = parseFloat(raw);
          };
        }(),
        function () {
          return function () {
            return value = Math.random();
          };
        }(),
        function () {
          return function () {
            raw = ('' + Math.random()).slice(1, 3 + random.randomInt(10));
            return value = parseFloat(raw);
          };
        }(),
        function () {
          return function () {
            return value = Math.random() * Math.pow(2, 16);
          };
        }()
      ])();

    function formatInt(value) {
      switch (random.randomInt(10)) {
      case 0:
        return raw = '' + random.randomElement([
          '0',
          '00',
          '000',
          '0000'
        ]) + value.toString(8);
      case 1:
        return raw = '0' + random.randomElement([
          'x',
          'X'
        ]) + value.toString(16);
      case 3:
        return raw = '' + value + '.';
      default:
        return value;
      }
    };
}