var bson = require('../lib/bson'), assert = require('assert');
var parser = new bson.Parser(), encoder = new bson.Encoder();

var object = {key: 'value', list: [1,2,3,4,5,6,7,8,9], magical: 10, sub: {list: ['string', 'list', 10]}};
var pack = encoder.encode(object);
var result = parser.parse(pack);
assert.deepEqual(result, object);
console.dir(result);


var object2 = {somenullstuff: null, other: 10};
var pack2 = new bson.Encoder().encode(object2);

console.log(pack2);


var result = parser.parse(pack2);

console.dir(result);


