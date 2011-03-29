var bson = require('../lib/bson'), assert = require('assert');
var parser = new bson.Parser(), encoder = new bson.Encoder();

var object = {key: 'value', list: [1,2,3,4,5,6,7,8,9], magical: 10, sub: {list: ['string', 'list', 10]}};
var pack = encoder.encode(object);
var result = parser.parse(pack);
assert.deepEqual(result, object);
console.dir(result);


console.log(bson.decode(bson.encode({data: 2001})).data);


var buf = new Buffer(2000);
for (var i = 0; i < 2000; i++) buf[i] = (1<<(i%8)) & 0xff;

var data = bson.encode({data: buf});

console.log(data);

var res = bson.decode(data);

console.log(res.data.length);

//assert.ok(res.data.length==2000);
