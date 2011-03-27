/**
 * Wonky Javascript BSON parser / encoder. Replace with a C implementation later (just do bindings from mongo driver/bson.c to Node)
 */
function BSONParser() {
	this.offset = 0;
	this.data = false;
}

BSONParser.prototype.readByte = function() {
	var v;
	v = (this.data[this.offset]); this.offset++;
	return v;
}

BSONParser.prototype.readInt64 = function() {
	var v = 0;
	v |= (this.data[this.offset+0]);
	v |= (this.data[this.offset+1] << 8 );
	v |= (this.data[this.offset+2] << 16);
	v |= (this.data[this.offset+3] << 24);
	v |= (this.data[this.offset+4] << 32);
	v |= (this.data[this.offset+5] << 40);
	v |= (this.data[this.offset+6] << 48);
	v |= (this.data[this.offset+7] << 56);
	this.offset += 8;
	return v;
}

BSONParser.prototype.readInt32 = function() {
	var v = 0;
	v |= (this.data[this.offset+0]);
	v |= (this.data[this.offset+1] << 8);
	v |= (this.data[this.offset+2] << 24);
	v |= (this.data[this.offset+3] << 16);
	this.offset += 4;
	return v;
}

BSONParser.prototype.reset = function (data) {
	this.offset = 0;
	this.length = 0;
	this.data = data;
}

BSONParser.prototype.parse = function (data) {
	if (!(data instanceof Buffer)) {
		throw "The input type must be a Buffer";
	}
	this.reset(data);
	this.length = this.readInt32();
	this.length -= this.offset;
//	console.log("Parse data of length = " + this.length);
	return this.parseElist();
}

BSONParser.prototype.parseElist = function () {
	var kv = {};
	while (this.offset < this.length - 1) {

		var type = this.readByte();
		
		// TODO: there is a bug in the decoder or encoder... see the line below
		if (type == 0x00) return kv;

		if (type == 0x1) {
			var k = this.parseCstring(),
					v = this.parseFloat();
			kv[k]=v;
			continue;
		}

		if (type == 0x2) {
			var k = this.parseCstring(),
					v = this.parseString();
			kv[k]=v;
			continue;
		}

		if (type == 0x3 || type == 0x4) {
			var k = this.parseCstring(),
					v = new BSONParser().parse(this.data.slice(this.offset));
			this.offset += this.readInt32();
			if (type == 4) {
				c = [];
				for (i in v) c.push(v[i]);
				v = c;
			}
					
			kv[k]=v;
			continue;
		}
		
		if (type == 0x5) {
			var k = this.parseCstring(),
					v = this.parseBinary();
			kv[k]=v;
			continue;
		}

		if (type == 0x8) {
			var k = this.parseCstring(),
					v = this.readByte() == 1;
			kv[k]=v;
			continue;
		}

		if (type == 0x9) {
			var k = this.parseCstring(),
					v = this.readInt64();
			kv[k]=new Date(v);
			continue;
		}

		if (type == 0x0a) {
			var k = this.parseCstring();
			kv[k]=null;
			continue;
		}

		if (type == 0x10) {
			var k = this.parseCstring(),
					v = this.readInt32();
			kv[k]=v;
			continue;
		}

		if (type == 0x11) {
			var k = this.parseCstring(),
					v = this.readInt64();
			kv[k]=v;
			continue;
		}

		throw "Unrecognized data type 0x" + type.toString(16) + " @"+this.offset;

	};

	return kv;
}

BSONParser.prototype.parseCstring = function () {
	var str = new Buffer(256), i;
	for (i = 0; i < 256; i++) {
		var chr = this.readByte();
		if (chr == 0) break;
		str[i] = chr;
	}
	return str.toString('ascii', 0, i);
}

BSONParser.prototype.parseFloat = function () {
	// TODO: laterz
	return this.readInt64();
}

BSONParser.prototype.parseString = function () {
	var len = this.readInt32();
	var str = new Buffer(len), i;

	for (i = 0; i < len; i++) {
		str[i] = this.data[this.offset]; this.offset++;
	}

	return str.toString('utf8', 0, len-1);
}

BSONParser.prototype.parseBinary = function () {
	var len = this.readInt32();
	var type = this.readByte(); // TODO: sub type is ignored for now
	var str = new Buffer(len), i;

	for (i = 0; i < len; i++) {
		str[i] = this.data[this.offset]; this.offset++;
	}

	return str;
}

exports.Parser = BSONParser;
exports.Encoder = BSONEncoder;

function BSONEncoder() {
	this.buffer = [];
	this.offset = 0;
}

BSONEncoder.prototype.writeByte = function (v) {
	this.buffer.push( v & 0xff);
}

BSONEncoder.prototype.writeBytes = function (buf) {
	for (var i = 0; i < buf.length; i++) {
		this.writeByte(buf[i]);
	}
}

BSONEncoder.prototype.writeInt32 = function (v) {
	this.buffer.push((v)    );
	this.buffer.push((v<<8) );
	this.buffer.push((v<<16));
	this.buffer.push((v<<24));
}

BSONEncoder.prototype.writeInt64 = function (v) {
	this.buffer.push((v)    );
	this.buffer.push((v<<8) );
	this.buffer.push((v<<16));
	this.buffer.push((v<<24));
	this.buffer.push((v<<32));
	this.buffer.push((v<<40));
	this.buffer.push((v<<48));
	this.buffer.push((v<<56));
}

BSONEncoder.prototype.writeCstring = function (v) {
	for (var i = 0; i < v.length; i++) {
		this.writeByte(v.charCodeAt(i));
	}
	this.writeByte(0);
}

BSONEncoder.prototype.writeString = function (v) {
	var buf = new Buffer(v, 'utf8');
	this.writeInt32(buf.length+1);
	for (var i = 0; i < buf.length; i++) {
		this.writeByte(buf[i]);
	}
	this.writeByte(0);
}

BSONEncoder.prototype.writeBinary = function (buf) {
	this.writeInt32(buf.length);
	for (var i = 0; i < buf.length; i++) {
		this.writeByte(buf[i]);
	}
}

BSONEncoder.prototype.pack = function() {
	var data = new Buffer(this.buffer.length + 5), o = 0;
	
	for (var i = 0; i < data.length; i++) data[i] = 0;
	
	data[o++] = ((5+this.buffer.length) << 0) & 0xff;
	data[o++] = ((5+this.buffer.length) << 8) & 0xff;
	data[o++] = ((5+this.buffer.length) << 16) & 0xff;
	data[o++] = ((5+this.buffer.length) << 24) & 0xff;

	for (var i = 0; i < this.buffer.length; i++) {
		data[o++] = this.buffer[i];
	}

	data[o++] = 0;

	return data;
}

BSONEncoder.prototype.encode = function (object) {
	for (var k in object) {
		this.encodeItem(k, object[k]);
	}
	return this.pack();
}

BSONEncoder.prototype.encodeItem = function (k, v) {
	// console.log("k="+k+ ",v="+v+" t="+typeof(v));
	if (v == null || typeof(v) == 'undefined') {
		this.writeByte(0x0a);
		this.writeCstring(k);
		return;
	}
	if (typeof(v) == 'string') {
		this.writeByte(0x02);
		this.writeCstring(k);
		this.writeString(v);
		return;
	}
	if (typeof(v) == 'number') {
		if (Math.round(v) == v) {
			this.writeByte(0x10);
			this.writeCstring(k);
			this.writeInt32(v);
		} else {
			this.writeByte(0x11);
			this.writeCstring(k);
			this.writeInt64(v);
		}
		return;
	}
	if (v instanceof Array) {
		this.writeByte(0x04);
		this.writeCstring(k);
		this.writeBytes(new BSONEncoder().encode(v));
		return;
	}
	if (Buffer.isBuffer(v)) {
		this.writeByte(0x05);
		this.writeCstring(k);
		this.writeBinary(v)
		return;
	}
	if (typeof(v) == 'object') {
		this.writeByte(0x03);
		this.writeCstring(k);
		this.writeBytes(new BSONEncoder().encode(v));
		return;
	}
}

