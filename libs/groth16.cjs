(function webpackUniversalModuleDefinition(root, factory) {
	if(typeof exports === 'object' && typeof module === 'object')
		module.exports = factory();
	else if(typeof define === 'function' && define.amd)
		define([], factory);
	else if(typeof exports === 'object')
		exports["libpack"] = factory();
	else
		root["libpack"] = factory();
})(global, () => {
return /******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ({

/***/ 174:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {


const groth16 = __webpack_require__(972);
const ffjavascript = __webpack_require__(190);

function init() {
  if(!globalThis.curve_bn128) {
    return ffjavascript.buildBn128(true).then(function(curve_bn128) {
      globalThis.curve_bn128 = curve_bn128;
    });
  }
}

module.exports = {
  init: init,
  groth16: groth16,
};


/***/ }),

/***/ 972:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";
/**
 * @module @zk-kit/groth16
 * @version 0.5.0
 * @file A snippet of SnarkJS code for verifying and generating Groth16 proofs only.
 * @copyright Ethereum Foundation 2023
 * @license GPL-3.0
 * @see [Github]{@link https://github.com/privacy-scaling-explorations/zk-kit/tree/main/packages/groth16}
*/


var ffjavascript$1 = __webpack_require__(190);
var fs$1 = __webpack_require__(515);
var constants$1 = __webpack_require__(140);
var circom_runtime = __webpack_require__(149);

function _interopNamespaceDefault(e) {
    var n = Object.create(null);
    if (e) {
        Object.keys(e).forEach(function (k) {
            if (k !== 'default') {
                var d = Object.getOwnPropertyDescriptor(e, k);
                Object.defineProperty(n, k, d.get ? d : {
                    enumerable: true,
                    get: function () { return e[k]; }
                });
            }
        });
    }
    n.default = e;
    return Object.freeze(n);
}

var ffjavascript__namespace = /*#__PURE__*/_interopNamespaceDefault(ffjavascript$1);
var fs__namespace = /*#__PURE__*/_interopNamespaceDefault(fs$1);
var constants__namespace = /*#__PURE__*/_interopNamespaceDefault(constants$1);

/******************************************************************************
Copyright (c) Microsoft Corporation.

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
PERFORMANCE OF THIS SOFTWARE.
***************************************************************************** */
/* global Reflect, Promise, SuppressedError, Symbol */


function __awaiter(thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
}

function __generator(thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
}

typeof SuppressedError === "function" ? SuppressedError : function (error, suppressed, message) {
    var e = new Error(message);
    return e.name = "SuppressedError", e.error = error, e.suppressed = suppressed, e;
};

function getAugmentedNamespace(n) {
  if (n.__esModule) return n;
  var f = n.default;
	if (typeof f == "function") {
		var a = function a () {
			if (this instanceof a) {
				var args = [null];
				args.push.apply(args, arguments);
				var Ctor = Function.bind.apply(f, args);
				return new Ctor();
			}
			return f.apply(this, arguments);
		};
		a.prototype = f.prototype;
  } else a = {};
  Object.defineProperty(a, '__esModule', {value: true});
	Object.keys(n).forEach(function (k) {
		var d = Object.getOwnPropertyDescriptor(n, k);
		Object.defineProperty(a, k, d.get ? d : {
			enumerable: true,
			get: function () {
				return n[k];
			}
		});
	});
	return a;
}

var main$1 = {};

var require$$0$1 = /*@__PURE__*/getAugmentedNamespace(ffjavascript__namespace);

var main = {};

var require$$0 = /*@__PURE__*/getAugmentedNamespace(fs__namespace);

var require$$1 = /*@__PURE__*/getAugmentedNamespace(constants__namespace);

Object.defineProperty(main, '__esModule', { value: true });

function _interopDefault$1 (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var fs = _interopDefault$1(require$$0);
var constants = require$$1;

async function open(fileName, openFlags, cacheSize, pageSize) {
    cacheSize = cacheSize || 4096*64;
    if (typeof openFlags !== "number" && ["w+", "wx+", "r", "ax+", "a+"].indexOf(openFlags) <0)
        throw new Error("Invalid open option");
    const fd =await fs.promises.open(fileName, openFlags);

    const stats = await fd.stat();

    return  new FastFile(fd, stats, cacheSize, pageSize, fileName);
}


class FastFile {

    constructor(fd, stats, cacheSize, pageSize, fileName) {
        this.fileName = fileName;
        this.fd = fd;
        this.pos = 0;
        this.pageSize = pageSize || (1 << 8);
        while (this.pageSize < stats.blksize) {
            this.pageSize *= 2;
        }
        this.totalSize = stats.size;
        this.totalPages = Math.floor((stats.size -1) / this.pageSize)+1;
        this.maxPagesLoaded = Math.floor( cacheSize / this.pageSize)+1;
        this.pages = {};
        this.pendingLoads = [];
        this.writing = false;
        this.reading = false;
        this.avBuffs = [];
        this.history = {};
    }

    _loadPage(p) {
        const self = this;
        const P = new Promise((resolve, reject)=> {
            self.pendingLoads.push({
                page: p,
                resolve: resolve,
                reject: reject
            });
        });
        self.__statusPage("After Load request: ", p);
        return P;
    }

    __statusPage(s, p) {
        const logEntry = [];
        const self=this;
        if (!self.logHistory) return;
        logEntry.push("==" + s+ " " +p);
        let S = "";
        for (let i=0; i<self.pendingLoads.length; i++) {
            if (self.pendingLoads[i].page == p) S = S + " " + i;
        }
        if (S) logEntry.push("Pending loads:"+S);
        if (typeof self.pages[p] != "undefined") {
            const page = self.pages[p];
            logEntry.push("Loaded");
            logEntry.push("pendingOps: "+page.pendingOps);
            if (page.loading) logEntry.push("loading: "+page.loading);
            if (page.writing) logEntry.push("writing");
            if (page.dirty) logEntry.push("dirty");
        }
        logEntry.push("==");

        if (!self.history[p]) self.history[p] = [];
        self.history[p].push(logEntry);
    }

    __printHistory(p) {
        const self = this;
        if (!self.history[p]) console.log("Empty History ", p);
        console.log("History "+p);
        for (let i=0; i<self.history[p].length; i++) {
            for (let j=0; j<self.history[p][i].length; j++) {
                console.log("-> " + self.history[p][i][j]);
            }
        }
    }



    _triggerLoad() {
        const self = this;

        if (self.reading) return;
        if (self.pendingLoads.length==0) return;

        const pageIdxs = Object.keys(self.pages);

        const deletablePages = [];
        for (let i=0; i<pageIdxs.length; i++) {
            const page = self.pages[parseInt(pageIdxs[i])];
            if ((page.dirty == false)&&(page.pendingOps==0)&&(!page.writing)&&(!page.loading)) deletablePages.push(parseInt(pageIdxs[i]));
        }

        let freePages = self.maxPagesLoaded - pageIdxs.length;

        const ops = [];

        // while pending loads and
        //     the page is loaded or I can recover one.
        while (
            (self.pendingLoads.length>0) &&
            (   (typeof self.pages[self.pendingLoads[0].page] != "undefined" )
              ||(  (freePages>0)
                 ||(deletablePages.length>0)))) {
            const load = self.pendingLoads.shift();
            if (typeof self.pages[load.page] != "undefined") {
                self.pages[load.page].pendingOps ++;
                const idx = deletablePages.indexOf(load.page);
                if (idx>=0) deletablePages.splice(idx, 1);
                if (self.pages[load.page].loading) {
                    self.pages[load.page].loading.push(load);
                } else {
                    load.resolve();
                }
                self.__statusPage("After Load (cached): ", load.page);

            } else {
                if (freePages) {
                    freePages--;
                } else {
                    const fp = deletablePages.shift();
                    self.__statusPage("Before Unload: ", fp);
                    self.avBuffs.unshift(self.pages[fp]);
                    delete self.pages[fp];
                    self.__statusPage("After Unload: ", fp);
                }

                if (load.page>=self.totalPages) {
                    self.pages[load.page] = getNewPage();
                    load.resolve();
                    self.__statusPage("After Load (new): ", load.page);
                } else {
                    self.reading = true;
                    self.pages[load.page] = getNewPage();
                    self.pages[load.page].loading = [load];
                    ops.push(self.fd.read(self.pages[load.page].buff, 0, self.pageSize, load.page*self.pageSize).then((res)=> {
                        self.pages[load.page].size = res.bytesRead;
                        const loading = self.pages[load.page].loading;
                        delete self.pages[load.page].loading;
                        for (let i=0; i<loading.length; i++) {
                            loading[i].resolve();
                        }
                        self.__statusPage("After Load (loaded): ", load.page);
                        return res;
                    }, (err) => {
                        load.reject(err);
                    }));
                    self.__statusPage("After Load (loading): ", load.page);
                }
            }
        }
        // if (ops.length>1) console.log(ops.length);

        Promise.all(ops).then( () => {
            self.reading = false;
            if (self.pendingLoads.length>0) setImmediate(self._triggerLoad.bind(self));
            self._tryClose();
        });

        function getNewPage() {
            if (self.avBuffs.length>0) {
                const p = self.avBuffs.shift();
                p.dirty = false;
                p.pendingOps = 1;
                p.size =0;
                return p;
            } else {
                return {
                    dirty: false,
                    buff: new Uint8Array(self.pageSize),
                    pendingOps: 1,
                    size: 0
                };
            }
        }

    }


    _triggerWrite() {
        const self = this;
        if (self.writing) return;

        const pageIdxs = Object.keys(self.pages);

        const ops = [];

        for (let i=0; i<pageIdxs.length; i++) {
            const page = self.pages[parseInt(pageIdxs[i])];
            if (page.dirty) {
                page.dirty = false;
                page.writing = true;
                self.writing = true;
                ops.push( self.fd.write(page.buff, 0, page.size, parseInt(pageIdxs[i])*self.pageSize).then(() => {
                    page.writing = false;
                    return;
                }, (err) => {
                    console.log("ERROR Writing: "+err);
                    self.error = err;
                    self._tryClose();
                }));
            }
        }

        if (self.writing) {
            Promise.all(ops).then( () => {
                self.writing = false;
                setImmediate(self._triggerWrite.bind(self));
                self._tryClose();
                if (self.pendingLoads.length>0) setImmediate(self._triggerLoad.bind(self));
            });
        }
    }

    _getDirtyPage() {
        for (let p in this.pages) {
            if (this.pages[p].dirty) return p;
        }
        return -1;
    }

    async write(buff, pos) {
        if (buff.byteLength == 0) return;
        const self = this;
/*
        if (buff.byteLength > self.pageSize*self.maxPagesLoaded*0.8) {
            const cacheSize = Math.floor(buff.byteLength * 1.1);
            this.maxPagesLoaded = Math.floor( cacheSize / self.pageSize)+1;
        }
*/
        if (typeof pos == "undefined") pos = self.pos;
        self.pos = pos+buff.byteLength;
        if (self.totalSize < pos + buff.byteLength) self.totalSize = pos + buff.byteLength;
        if (self.pendingClose)
            throw new Error("Writing a closing file");
        const firstPage = Math.floor(pos / self.pageSize);
        const lastPage = Math.floor((pos + buff.byteLength -1) / self.pageSize);

        const pagePromises = [];
        for (let i=firstPage; i<=lastPage; i++) pagePromises.push(self._loadPage(i));
        self._triggerLoad();

        let p = firstPage;
        let o = pos % self.pageSize;
        let r = buff.byteLength;
        while (r>0) {
            await pagePromises[p-firstPage];
            const l = (o+r > self.pageSize) ? (self.pageSize -o) : r;
            const srcView = buff.slice( buff.byteLength - r, buff.byteLength - r + l);
            const dstView = new Uint8Array(self.pages[p].buff.buffer, o, l);
            dstView.set(srcView);
            self.pages[p].dirty = true;
            self.pages[p].pendingOps --;
            self.pages[p].size = Math.max(o+l, self.pages[p].size);
            if (p>=self.totalPages) {
                self.totalPages = p+1;
            }
            r = r-l;
            p ++;
            o = 0;
            if (!self.writing) setImmediate(self._triggerWrite.bind(self));
        }
    }

    async read(len, pos) {
        const self = this;
        let buff = new Uint8Array(len);
        await self.readToBuffer(buff, 0, len, pos);

        return buff;
    }

    async readToBuffer(buffDst, offset, len, pos) {
        if (len == 0) {
            return;
        }
        const self = this;
        if (len > self.pageSize*self.maxPagesLoaded*0.8) {
            const cacheSize = Math.floor(len * 1.1);
            this.maxPagesLoaded = Math.floor( cacheSize / self.pageSize)+1;
        }
        if (typeof pos == "undefined") pos = self.pos;
        self.pos = pos+len;
        if (self.pendingClose)
            throw new Error("Reading a closing file");
        const firstPage = Math.floor(pos / self.pageSize);
        const lastPage = Math.floor((pos + len -1) / self.pageSize);

        const pagePromises = [];
        for (let i=firstPage; i<=lastPage; i++) pagePromises.push(self._loadPage(i));

        self._triggerLoad();

        let p = firstPage;
        let o = pos % self.pageSize;
        // Remaining bytes to read
        let r = pos + len > self.totalSize ? len - (pos + len - self.totalSize): len;
        while (r>0) {
            await pagePromises[p - firstPage];
            self.__statusPage("After Await (read): ", p);

            // bytes to copy from this page
            const l = (o+r > self.pageSize) ? (self.pageSize -o) : r;
            const srcView = new Uint8Array(self.pages[p].buff.buffer, self.pages[p].buff.byteOffset + o, l);
            buffDst.set(srcView, offset+len-r);
            self.pages[p].pendingOps --;

            self.__statusPage("After Op done: ", p);

            r = r-l;
            p ++;
            o = 0;
            if (self.pendingLoads.length>0) setImmediate(self._triggerLoad.bind(self));
        }

        this.pos = pos + len;

    }


    _tryClose() {
        const self = this;
        if (!self.pendingClose) return;
        if (self.error) {
            self.pendingCloseReject(self.error);
        }
        const p = self._getDirtyPage();
        if ((p>=0) || (self.writing) || (self.reading) || (self.pendingLoads.length>0)) return;
        self.pendingClose();
    }

    close() {
        const self = this;
        if (self.pendingClose)
            throw new Error("Closing the file twice");
        return new Promise((resolve, reject) => {
            self.pendingClose = resolve;
            self.pendingCloseReject = reject;
            self._tryClose();
        }).then(()=> {
            self.fd.close();
        }, (err) => {
            self.fd.close();
            throw (err);
        });
    }

    async discard() {
        const self = this;
        await self.close();
        await fs.promises.unlink(this.fileName);
    }

    async writeULE32(v, pos) {
        const self = this;
        const tmpBuff32 = new Uint8Array(4);
        const tmpBuff32v = new DataView(tmpBuff32.buffer);

        tmpBuff32v.setUint32(0, v, true);

        await self.write(tmpBuff32, pos);
    }

    async writeUBE32(v, pos) {
        const self = this;

        const tmpBuff32 = new Uint8Array(4);
        const tmpBuff32v = new DataView(tmpBuff32.buffer);

        tmpBuff32v.setUint32(0, v, false);

        await self.write(tmpBuff32, pos);
    }


    async writeULE64(v, pos) {
        const self = this;

        const tmpBuff64 = new Uint8Array(8);
        const tmpBuff64v = new DataView(tmpBuff64.buffer);

        tmpBuff64v.setUint32(0, v & 0xFFFFFFFF, true);
        tmpBuff64v.setUint32(4, Math.floor(v / 0x100000000) , true);

        await self.write(tmpBuff64, pos);
    }

    async readULE32(pos) {
        const self = this;
        const b = await self.read(4, pos);

        const view = new Uint32Array(b.buffer);

        return view[0];
    }

    async readUBE32(pos) {
        const self = this;
        const b = await self.read(4, pos);

        const view = new DataView(b.buffer);

        return view.getUint32(0, false);
    }

    async readULE64(pos) {
        const self = this;
        const b = await self.read(8, pos);

        const view = new Uint32Array(b.buffer);

        return view[1] * 0x100000000 + view[0];
    }

    async readString(pos) {
        const self = this;

        if (self.pendingClose) {
            throw new Error("Reading a closing file");
        }

        let currentPosition = typeof pos == "undefined" ? self.pos : pos;
        let currentPage = Math.floor(currentPosition / self.pageSize);

        let endOfStringFound = false;
        let str = "";

        while (!endOfStringFound) {
            //Read page
            let pagePromise = self._loadPage(currentPage);
            self._triggerLoad();
            await pagePromise;
            self.__statusPage("After Await (read): ", currentPage);

            let offsetOnPage = currentPosition % self.pageSize;

            const dataArray = new Uint8Array(
                self.pages[currentPage].buff.buffer,
                self.pages[currentPage].buff.byteOffset + offsetOnPage,
                self.pageSize - offsetOnPage
            );

            let indexEndOfString = dataArray.findIndex(element => element === 0);
            endOfStringFound = indexEndOfString !== -1;

            if (endOfStringFound) {
                str += new TextDecoder().decode(dataArray.slice(0, indexEndOfString));
                self.pos = currentPage * this.pageSize + offsetOnPage + indexEndOfString + 1;
            } else {
                str += new TextDecoder().decode(dataArray);
                self.pos = currentPage * this.pageSize + offsetOnPage + dataArray.length;
            }

            self.pages[currentPage].pendingOps--;
            self.__statusPage("After Op done: ", currentPage);

            currentPosition = self.pos;
            currentPage++;

            if (self.pendingLoads.length > 0) setImmediate(self._triggerLoad.bind(self));
        }

        return str;
    }
}

function createNew(o) {
    const initialSize = o.initialSize || 1<<20;
    const fd = new MemFile();
    fd.o = o;
    fd.o.data = new Uint8Array(initialSize);
    fd.allocSize = initialSize;
    fd.totalSize = 0;
    fd.readOnly = false;
    fd.pos = 0;
    return fd;
}

function readExisting(o) {
    const fd = new MemFile();
    fd.o = o;
    fd.allocSize = o.data.byteLength;
    fd.totalSize = o.data.byteLength;
    fd.readOnly = true;
    fd.pos = 0;
    return fd;
}

function readWriteExisting(o) {
    const fd = new MemFile();
    fd.o = o;
    fd.allocSize = o.data.byteLength;
    fd.totalSize = o.data.byteLength;
    fd.readOnly = false;
    fd.pos = 0;
    return fd;
}

const tmpBuff32 = new Uint8Array(4);
const tmpBuff32v = new DataView(tmpBuff32.buffer);
const tmpBuff64 = new Uint8Array(8);
const tmpBuff64v = new DataView(tmpBuff64.buffer);

class MemFile {

    constructor() {
        this.pageSize = 1 << 14;  // for compatibility
    }

    _resizeIfNeeded(newLen) {
        if (newLen > this.allocSize) {
            const newAllocSize = Math.max(
                this.allocSize + (1 << 20),
                Math.floor(this.allocSize * 1.1),
                newLen
            );
            const newData = new Uint8Array(newAllocSize);
            newData.set(this.o.data);
            this.o.data = newData;
            this.allocSize = newAllocSize;
        }
    }

    async write(buff, pos) {
        const self =this;
        if (typeof pos == "undefined") pos = self.pos;
        if (this.readOnly) throw new Error("Writing a read only file");

        this._resizeIfNeeded(pos + buff.byteLength);

        this.o.data.set(buff.slice(), pos);

        if (pos + buff.byteLength > this.totalSize) this.totalSize = pos + buff.byteLength;

        this.pos = pos + buff.byteLength;
    }

    async readToBuffer(buffDest, offset, len, pos) {
        const self = this;
        if (typeof pos == "undefined") pos = self.pos;
        if (this.readOnly) {
            if (pos + len > this.totalSize) throw new Error("Reading out of bounds");
        }
        this._resizeIfNeeded(pos + len);

        const buffSrc = new Uint8Array(this.o.data.buffer, this.o.data.byteOffset + pos, len);

        buffDest.set(buffSrc, offset);

        this.pos = pos + len;
    }

    async read(len, pos) {
        const self = this;

        const buff = new Uint8Array(len);
        await self.readToBuffer(buff, 0, len, pos);

        return buff;
    }

    close() {
        if (this.o.data.byteLength != this.totalSize) {
            this.o.data = this.o.data.slice(0, this.totalSize);
        }
    }

    async discard() {
    }


    async writeULE32(v, pos) {
        const self = this;

        tmpBuff32v.setUint32(0, v, true);

        await self.write(tmpBuff32, pos);
    }

    async writeUBE32(v, pos) {
        const self = this;

        tmpBuff32v.setUint32(0, v, false);

        await self.write(tmpBuff32, pos);
    }


    async writeULE64(v, pos) {
        const self = this;

        tmpBuff64v.setUint32(0, v & 0xFFFFFFFF, true);
        tmpBuff64v.setUint32(4, Math.floor(v / 0x100000000) , true);

        await self.write(tmpBuff64, pos);
    }


    async readULE32(pos) {
        const self = this;
        const b = await self.read(4, pos);

        const view = new Uint32Array(b.buffer);

        return view[0];
    }

    async readUBE32(pos) {
        const self = this;
        const b = await self.read(4, pos);

        const view = new DataView(b.buffer);

        return view.getUint32(0, false);
    }

    async readULE64(pos) {
        const self = this;
        const b = await self.read(8, pos);

        const view = new Uint32Array(b.buffer);

        return view[1] * 0x100000000 + view[0];
    }

    async readString(pos) {
        const self = this;

        let currentPosition = typeof pos == "undefined" ? self.pos : pos;

        if (currentPosition > this.totalSize) {
            if (this.readOnly) {
                throw new Error("Reading out of bounds");
            }
            this._resizeIfNeeded(pos);
        }
        const dataArray = new Uint8Array(
            self.o.data.buffer,
            currentPosition,
            this.totalSize - currentPosition
        );

        let indexEndOfString = dataArray.findIndex(element => element === 0);
        let endOfStringFound = indexEndOfString !== -1;

        let str = "";
        if (endOfStringFound) {
            str = new TextDecoder().decode(dataArray.slice(0, indexEndOfString));
            self.pos = currentPosition + indexEndOfString + 1;
        } else {
            self.pos = currentPosition;
        }
        return str;
    }
}

const PAGE_SIZE = 1<<22;

function createNew$1(o) {
    const initialSize = o.initialSize || 0;
    const fd = new BigMemFile();
    fd.o = o;
    const nPages = initialSize ? Math.floor((initialSize - 1) / PAGE_SIZE)+1 : 0;
    fd.o.data = [];
    for (let i=0; i<nPages-1; i++) {
        fd.o.data.push( new Uint8Array(PAGE_SIZE));
    }
    if (nPages) fd.o.data.push( new Uint8Array(initialSize - PAGE_SIZE*(nPages-1)));
    fd.totalSize = 0;
    fd.readOnly = false;
    fd.pos = 0;
    return fd;
}

function readExisting$1(o) {
    const fd = new BigMemFile();
    fd.o = o;
    fd.totalSize = (o.data.length-1)* PAGE_SIZE + o.data[o.data.length-1].byteLength;
    fd.readOnly = true;
    fd.pos = 0;
    return fd;
}

function readWriteExisting$1(o) {
    const fd = new BigMemFile();
    fd.o = o;
    fd.totalSize = (o.data.length-1)* PAGE_SIZE + o.data[o.data.length-1].byteLength;
    fd.readOnly = false;
    fd.pos = 0;
    return fd;
}

const tmpBuff32$1 = new Uint8Array(4);
const tmpBuff32v$1 = new DataView(tmpBuff32$1.buffer);
const tmpBuff64$1 = new Uint8Array(8);
const tmpBuff64v$1 = new DataView(tmpBuff64$1.buffer);

class BigMemFile {

    constructor() {
        this.pageSize = 1 << 14;  // for compatibility
    }

    _resizeIfNeeded(newLen) {

        if (newLen <= this.totalSize) return;

        if (this.readOnly) throw new Error("Reading out of file bounds");

        const nPages = Math.floor((newLen - 1) / PAGE_SIZE)+1;
        for (let i= Math.max(this.o.data.length-1, 0); i<nPages; i++) {
            const newSize = i<nPages-1 ? PAGE_SIZE : newLen - (nPages-1)*PAGE_SIZE;
            const p = new Uint8Array(newSize);
            if (i == this.o.data.length-1) p.set(this.o.data[i]);
            this.o.data[i] = p;
        }
        this.totalSize = newLen;
    }

    async write(buff, pos) {
        const self =this;
        if (typeof pos == "undefined") pos = self.pos;
        if (this.readOnly) throw new Error("Writing a read only file");

        this._resizeIfNeeded(pos + buff.byteLength);

        const firstPage = Math.floor(pos / PAGE_SIZE);

        let p = firstPage;
        let o = pos % PAGE_SIZE;
        let r = buff.byteLength;
        while (r>0) {
            const l = (o+r > PAGE_SIZE) ? (PAGE_SIZE -o) : r;
            const srcView = buff.slice(buff.byteLength - r, buff.byteLength - r + l);
            const dstView = new Uint8Array(self.o.data[p].buffer, o, l);
            dstView.set(srcView);
            r = r-l;
            p ++;
            o = 0;
        }

        this.pos = pos + buff.byteLength;
    }

    async readToBuffer(buffDst, offset, len, pos) {
        const self = this;
        if (typeof pos == "undefined") pos = self.pos;
        if (this.readOnly) {
            if (pos + len > this.totalSize) throw new Error("Reading out of bounds");
        }
        this._resizeIfNeeded(pos + len);

        const firstPage = Math.floor(pos / PAGE_SIZE);

        let p = firstPage;
        let o = pos % PAGE_SIZE;
        // Remaining bytes to read
        let r = len;
        while (r>0) {
            // bytes to copy from this page
            const l = (o+r > PAGE_SIZE) ? (PAGE_SIZE -o) : r;
            const srcView = new Uint8Array(self.o.data[p].buffer, o, l);
            buffDst.set(srcView, offset+len-r);
            r = r-l;
            p ++;
            o = 0;
        }

        this.pos = pos + len;
    }

    async read(len, pos) {
        const self = this;
        const buff = new Uint8Array(len);

        await self.readToBuffer(buff, 0, len, pos);

        return buff;
    }

    close() {
    }

    async discard() {
    }


    async writeULE32(v, pos) {
        const self = this;

        tmpBuff32v$1.setUint32(0, v, true);

        await self.write(tmpBuff32$1, pos);
    }

    async writeUBE32(v, pos) {
        const self = this;

        tmpBuff32v$1.setUint32(0, v, false);

        await self.write(tmpBuff32$1, pos);
    }


    async writeULE64(v, pos) {
        const self = this;

        tmpBuff64v$1.setUint32(0, v & 0xFFFFFFFF, true);
        tmpBuff64v$1.setUint32(4, Math.floor(v / 0x100000000) , true);

        await self.write(tmpBuff64$1, pos);
    }


    async readULE32(pos) {
        const self = this;
        const b = await self.read(4, pos);

        const view = new Uint32Array(b.buffer);

        return view[0];
    }

    async readUBE32(pos) {
        const self = this;
        const b = await self.read(4, pos);

        const view = new DataView(b.buffer);

        return view.getUint32(0, false);
    }

    async readULE64(pos) {
        const self = this;
        const b = await self.read(8, pos);

        const view = new Uint32Array(b.buffer);

        return view[1] * 0x100000000 + view[0];
    }

    async readString(pos) {
        const self = this;
        const fixedSize = 2048;

        let currentPosition = typeof pos == "undefined" ? self.pos : pos;

        if (currentPosition > this.totalSize) {
            if (this.readOnly) {
                throw new Error("Reading out of bounds");
            }
            this._resizeIfNeeded(pos);
        }

        let endOfStringFound = false;
        let str = "";

        while (!endOfStringFound) {
            let currentPage = Math.floor(currentPosition / PAGE_SIZE);
            let offsetOnPage = currentPosition % PAGE_SIZE;

            if (self.o.data[currentPage] === undefined) {
                throw new Error("ERROR");
            }

            let readLength = Math.min(fixedSize, self.o.data[currentPage].length - offsetOnPage);
            const dataArray = new Uint8Array(self.o.data[currentPage].buffer, offsetOnPage, readLength);

            let indexEndOfString = dataArray.findIndex(element => element === 0);
            endOfStringFound = indexEndOfString !== -1;

            if (endOfStringFound) {
                str += new TextDecoder().decode(dataArray.slice(0, indexEndOfString));
                self.pos = currentPage * PAGE_SIZE + offsetOnPage + indexEndOfString + 1;
            } else {
                str += new TextDecoder().decode(dataArray);
                self.pos = currentPage * PAGE_SIZE + offsetOnPage + dataArray.length;
            }

            currentPosition = self.pos;
        }
        return str;
    }
}

/* global fetch */

const DEFAULT_CACHE_SIZE = (1 << 16);
const DEFAULT_PAGE_SIZE = (1 << 13);


async function createOverride(o, b, c) {
    if (typeof o === "string") {
        o = {
            type: "file",
            fileName: o,
            cacheSize: b || DEFAULT_CACHE_SIZE,
            pageSize: c || DEFAULT_PAGE_SIZE
        };
    }
    if (o.type == "file") {
        return await open(o.fileName, constants.O_TRUNC | constants.O_CREAT | constants.O_RDWR, o.cacheSize, o.pageSize);
    } else if (o.type == "mem") {
        return createNew(o);
    } else if (o.type == "bigMem") {
        return createNew$1(o);
    } else {
        throw new Error("Invalid FastFile type: "+o.type);
    }
}

function createNoOverride(o, b, c) {
    if (typeof o === "string") {
        o = {
            type: "file",
            fileName: o,
            cacheSize: b || DEFAULT_CACHE_SIZE,
            pageSize: c || DEFAULT_PAGE_SIZE
        };
    }
    if (o.type == "file") {
        return open(o.fileName, constants.O_TRUNC | constants.O_CREAT | constants.O_RDWR | constants.O_EXCL, o.cacheSize, o.pageSize);
    } else if (o.type == "mem") {
        return createNew(o);
    } else if (o.type == "bigMem") {
        return createNew$1(o);
    } else {
        throw new Error("Invalid FastFile type: "+o.type);
    }
}

async function readExisting$2(o, b, c) {
    if (o instanceof Uint8Array) {
        o = {
            type: "mem",
            data: o
        };
    }
    if (process.browser) {
        if (typeof o === "string") {
            const buff = await fetch(o).then( function(res) {
                return res.arrayBuffer();
            }).then(function (ab) {
                return new Uint8Array(ab);
            });
            o = {
                type: "mem",
                data: buff
            };
        }
    } else {
        if (typeof o === "string") {
            o = {
                type: "file",
                fileName: o,
                cacheSize: b || DEFAULT_CACHE_SIZE,
                pageSize: c || DEFAULT_PAGE_SIZE
            };
        }
    }
    if (o.type == "file") {
        return await open(o.fileName, constants.O_RDONLY, o.cacheSize, o.pageSize);
    } else if (o.type == "mem") {
        return await readExisting(o);
    } else if (o.type == "bigMem") {
        return await readExisting$1(o);
    } else {
        throw new Error("Invalid FastFile type: "+o.type);
    }
}

function readWriteExisting$2(o, b, c) {
    if (typeof o === "string") {
        o = {
            type: "file",
            fileName: o,
            cacheSize: b || DEFAULT_CACHE_SIZE,
            pageSize: c || DEFAULT_PAGE_SIZE
        };
    }
    if (o.type == "file") {
        return open(o.fileName, constants.O_CREAT | constants.O_RDWR, o.cacheSize, o.pageSize);
    } else if (o.type == "mem") {
        return readWriteExisting(o);
    } else if (o.type == "bigMem") {
        return readWriteExisting$1(o);
    } else {
        throw new Error("Invalid FastFile type: "+o.type);
    }
}

function readWriteExistingOrCreate(o, b, c) {
    if (typeof o === "string") {
        o = {
            type: "file",
            fileName: o,
            cacheSize: b || DEFAULT_CACHE_SIZE,
            pageSize: c || DEFAULT_PAGE_SIZE
        };
    }
    if (o.type == "file") {
        return open(o.fileName, constants.O_CREAT | constants.O_RDWR | constants.O_EXCL, o.cacheSize);
    } else if (o.type == "mem") {
        return readWriteExisting(o);
    } else if (o.type == "bigMem") {
        return readWriteExisting$1(o);
    } else {
        throw new Error("Invalid FastFile type: "+o.type);
    }
}

main.createNoOverride = createNoOverride;
var createOverride_1 = main.createOverride = createOverride;
var readExisting_1 = main.readExisting = readExisting$2;
main.readWriteExisting = readWriteExisting$2;
main.readWriteExistingOrCreate = readWriteExistingOrCreate;

Object.defineProperty(main$1, '__esModule', { value: true });

var ffjavascript = require$$0$1;
var fastFile = main;

function _interopNamespace$1(e) {
    if (e && e.__esModule) return e;
    var n = Object.create(null);
    if (e) {
        Object.keys(e).forEach(function (k) {
            if (k !== 'default') {
                var d = Object.getOwnPropertyDescriptor(e, k);
                Object.defineProperty(n, k, d.get ? d : {
                    enumerable: true,
                    get: function () { return e[k]; }
                });
            }
        });
    }
    n["default"] = e;
    return Object.freeze(n);
}

var fastFile__namespace = /*#__PURE__*/_interopNamespace$1(fastFile);

async function readBinFile(fileName, type, maxVersion, cacheSize, pageSize) {

    const fd = await fastFile__namespace.readExisting(fileName, cacheSize, pageSize);

    const b = await fd.read(4);
    let readedType = "";
    for (let i=0; i<4; i++) readedType += String.fromCharCode(b[i]);

    if (readedType != type) throw new Error(fileName + ": Invalid File format");

    let v = await fd.readULE32();

    if (v>maxVersion) throw new Error("Version not supported");

    const nSections = await fd.readULE32();

    // Scan sections
    let sections = [];
    for (let i=0; i<nSections; i++) {
        let ht = await fd.readULE32();
        let hl = await fd.readULE64();
        if (typeof sections[ht] == "undefined") sections[ht] = [];
        sections[ht].push({
            p: fd.pos,
            size: hl
        });
        fd.pos += hl;
    }

    return {fd, sections};
}

async function createBinFile(fileName, type, version, nSections, cacheSize, pageSize) {

    const fd = await fastFile__namespace.createOverride(fileName, cacheSize, pageSize);

    const buff = new Uint8Array(4);
    for (let i=0; i<4; i++) buff[i] = type.charCodeAt(i);
    await fd.write(buff, 0); // Magic "r1cs"

    await fd.writeULE32(version); // Version
    await fd.writeULE32(nSections); // Number of Sections

    return fd;
}

async function startWriteSection(fd, idSection) {
    if (typeof fd.writingSection !== "undefined") throw new Error("Already writing a section");
    await fd.writeULE32(idSection); // Header type
    fd.writingSection = {
        pSectionSize: fd.pos
    };
    await fd.writeULE64(0); // Temporally set to 0 length
}

async function endWriteSection(fd) {
    if (typeof fd.writingSection === "undefined") throw new Error("Not writing a section");

    const sectionSize = fd.pos - fd.writingSection.pSectionSize - 8;
    const oldPos = fd.pos;
    fd.pos = fd.writingSection.pSectionSize;
    await fd.writeULE64(sectionSize);
    fd.pos = oldPos;
    delete fd.writingSection;
}

async function startReadUniqueSection(fd, sections, idSection) {
    if (typeof fd.readingSection !== "undefined") throw new Error("Already reading a section");
    if (!sections[idSection])  throw new Error(fd.fileName + ": Missing section "+ idSection );
    if (sections[idSection].length>1) throw new Error(fd.fileName +": Section Duplicated " +idSection);

    fd.pos = sections[idSection][0].p;

    fd.readingSection = sections[idSection][0];
}

async function endReadSection(fd, noCheck) {
    if (typeof fd.readingSection === "undefined") throw new Error("Not reading a section");
    if (!noCheck) {
        if (fd.pos-fd.readingSection.p !=  fd.readingSection.size) throw new Error("Invalid section size reading");
    }
    delete fd.readingSection;
}

async function writeBigInt(fd, n, n8, pos) {
    const buff = new Uint8Array(n8);
    ffjavascript.Scalar.toRprLE(buff, 0, n, n8);
    await fd.write(buff, pos);
}

async function readBigInt(fd, n8, pos) {
    const buff = await fd.read(n8, pos);
    return ffjavascript.Scalar.fromRprLE(buff, 0, n8);
}

async function copySection(fdFrom, sections, fdTo, sectionId, size) {
    if (typeof size === "undefined") {
        size = sections[sectionId][0].size;
    }
    const chunkSize = fdFrom.pageSize;
    await startReadUniqueSection(fdFrom, sections, sectionId);
    await startWriteSection(fdTo, sectionId);
    for (let p=0; p<size; p+=chunkSize) {
        const l = Math.min(size -p, chunkSize);
        const buff = await fdFrom.read(l);
        await fdTo.write(buff);
    }
    await endWriteSection(fdTo);
    await endReadSection(fdFrom, size != sections[sectionId][0].size);

}

async function readSection(fd, sections, idSection, offset, length) {

    offset = (typeof offset === "undefined") ? 0 : offset;
    length = (typeof length === "undefined") ? sections[idSection][0].size - offset : length;

    if (offset + length > sections[idSection][0].size) {
        throw new Error("Reading out of the range of the section");
    }

    let buff;
    if (length < (1 << 30) ) {
        buff = new Uint8Array(length);
    } else {
        buff = new ffjavascript.BigBuffer(length);
    }

    await fd.readToBuffer(buff, 0, length, sections[idSection][0].p + offset);
    return buff;
}

async function sectionIsEqual(fd1, sections1, fd2, sections2, idSection) {
    const MAX_BUFF_SIZE = fd1.pageSize * 16;
    await startReadUniqueSection(fd1, sections1, idSection);
    await startReadUniqueSection(fd2, sections2, idSection);
    if (sections1[idSection][0].size != sections2[idSection][0].size) return false;
    const totalBytes=sections1[idSection][0].size;
    for (let i=0; i<totalBytes; i+= MAX_BUFF_SIZE) {
        const n = Math.min(totalBytes-i, MAX_BUFF_SIZE);
        const buff1 = await fd1.read(n);
        const buff2 = await fd2.read(n);
        for (let j=0; j<n; j++) if (buff1[j] != buff2[j]) return false;
    }
    await endReadSection(fd1);
    await endReadSection(fd2);
    return true;
}

main$1.copySection = copySection;
var createBinFile_1 = main$1.createBinFile = createBinFile;
var endReadSection_1 = main$1.endReadSection = endReadSection;
var endWriteSection_1 = main$1.endWriteSection = endWriteSection;
var readBigInt_1 = main$1.readBigInt = readBigInt;
var readBinFile_1 = main$1.readBinFile = readBinFile;
var readSection_1 = main$1.readSection = readSection;
main$1.sectionIsEqual = sectionIsEqual;
var startReadUniqueSection_1 = main$1.startReadUniqueSection = startReadUniqueSection;
var startWriteSection_1 = main$1.startWriteSection = startWriteSection;
var writeBigInt_1 = main$1.writeBigInt = writeBigInt;

/* eslint-disable import/prefer-default-export */
/* eslint-disable no-return-assign */
/* istanbul ignore file */
function log2(V) {
    return (((V & 0xffff0000) !== 0 ? ((V &= 0xffff0000), 16) : 0) |
        ((V & 0xff00ff00) !== 0 ? ((V &= 0xff00ff00), 8) : 0) |
        ((V & 0xf0f0f0f0) !== 0 ? ((V &= 0xf0f0f0f0), 4) : 0) |
        ((V & 0xcccccccc) !== 0 ? ((V &= 0xcccccccc), 2) : 0) |
        // @ts-ignore
        ((V & 0xaaaaaaaa) !== 0));
}

/* istanbul ignore file */
/**
 * Builds and returns a BN 128 curve. If the curve has been cached,
 * it returns the cached curve.
 * @returns BN 128 ffjavascript curve.
 */
function buildBn128() {
    var _a;
    return __awaiter(this, void 0, void 0, function () {
        var _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    if (!((_a = globalThis.curve_bn128) !== null && _a !== void 0)) return [3 /*break*/, 1];
                    _b = _a;
                    return [3 /*break*/, 3];
                case 1: return [4 /*yield*/, ffjavascript$1.buildBn128()];
                case 2:
                    _b = (_c.sent());
                    _c.label = 3;
                case 3: 
                // @ts-ignore
                return [2 /*return*/, _b];
            }
        });
    });
}

/* eslint-disable import/prefer-default-export */
/* istanbul ignore file */
function readG1(fd, curve, toObject) {
    return __awaiter(this, void 0, void 0, function () {
        var buff, res;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, fd.read(curve.G1.F.n8 * 2)];
                case 1:
                    buff = _a.sent();
                    res = curve.G1.fromRprLEM(buff, 0);
                    return [2 /*return*/, toObject ? curve.G1.toObject(res) : res];
            }
        });
    });
}
function readG2(fd, curve, toObject) {
    return __awaiter(this, void 0, void 0, function () {
        var buff, res;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, fd.read(curve.G2.F.n8 * 2)];
                case 1:
                    buff = _a.sent();
                    res = curve.G2.fromRprLEM(buff, 0);
                    return [2 /*return*/, toObject ? curve.G2.toObject(res) : res];
            }
        });
    });
}
function readHeaderGroth16(fd, sections, toObject) {
    return __awaiter(this, void 0, void 0, function () {
        var zkey, n8q, _a, n8r, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m;
        return __generator(this, function (_o) {
            switch (_o.label) {
                case 0:
                    zkey = {};
                    zkey.protocol = "groth16";
                    return [4 /*yield*/, startReadUniqueSection_1(fd, sections, 2)];
                case 1:
                    _o.sent();
                    return [4 /*yield*/, fd.readULE32()];
                case 2:
                    n8q = _o.sent();
                    zkey.n8q = n8q;
                    _a = zkey;
                    return [4 /*yield*/, readBigInt_1(fd, n8q)];
                case 3:
                    _a.q = _o.sent();
                    return [4 /*yield*/, fd.readULE32()];
                case 4:
                    n8r = _o.sent();
                    zkey.n8r = n8r;
                    _b = zkey;
                    return [4 /*yield*/, readBigInt_1(fd, n8r)];
                case 5:
                    _b.r = _o.sent();
                    _c = zkey;
                    return [4 /*yield*/, buildBn128()];
                case 6:
                    _c.curve = _o.sent();
                    _d = zkey;
                    return [4 /*yield*/, fd.readULE32()];
                case 7:
                    _d.nVars = _o.sent();
                    _e = zkey;
                    return [4 /*yield*/, fd.readULE32()];
                case 8:
                    _e.nPublic = _o.sent();
                    _f = zkey;
                    return [4 /*yield*/, fd.readULE32()];
                case 9:
                    _f.domainSize = _o.sent();
                    zkey.power = log2(zkey.domainSize);
                    _g = zkey;
                    return [4 /*yield*/, readG1(fd, zkey.curve, toObject)];
                case 10:
                    _g.vk_alpha_1 = _o.sent();
                    _h = zkey;
                    return [4 /*yield*/, readG1(fd, zkey.curve, toObject)];
                case 11:
                    _h.vk_beta_1 = _o.sent();
                    _j = zkey;
                    return [4 /*yield*/, readG2(fd, zkey.curve, toObject)];
                case 12:
                    _j.vk_beta_2 = _o.sent();
                    _k = zkey;
                    return [4 /*yield*/, readG2(fd, zkey.curve, toObject)];
                case 13:
                    _k.vk_gamma_2 = _o.sent();
                    _l = zkey;
                    return [4 /*yield*/, readG1(fd, zkey.curve, toObject)];
                case 14:
                    _l.vk_delta_1 = _o.sent();
                    _m = zkey;
                    return [4 /*yield*/, readG2(fd, zkey.curve, toObject)];
                case 15:
                    _m.vk_delta_2 = _o.sent();
                    return [4 /*yield*/, endReadSection_1(fd)];
                case 16:
                    _o.sent();
                    return [2 /*return*/, zkey];
            }
        });
    });
}
function readHeader$1(fd, sections, toObject) {
    return __awaiter(this, void 0, void 0, function () {
        var protocolId;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, startReadUniqueSection_1(fd, sections, 1)];
                case 1:
                    _a.sent();
                    return [4 /*yield*/, fd.readULE32()];
                case 2:
                    protocolId = _a.sent();
                    return [4 /*yield*/, endReadSection_1(fd)];
                case 3:
                    _a.sent();
                    if (protocolId === 1) {
                        return [2 /*return*/, readHeaderGroth16(fd, sections, toObject)];
                    }
                    throw new Error("Protocol not supported: ");
            }
        });
    });
}

/* eslint-disable eqeqeq */
/* istanbul ignore file */
function writeBin(fd, witnessBin, prime) {
    return __awaiter(this, void 0, void 0, function () {
        var n8;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, startWriteSection_1(fd, 1)];
                case 1:
                    _a.sent();
                    n8 = (Math.floor((ffjavascript$1.Scalar.bitLength(prime) - 1) / 64) + 1) * 8;
                    return [4 /*yield*/, fd.writeULE32(n8)];
                case 2:
                    _a.sent();
                    return [4 /*yield*/, writeBigInt_1(fd, prime, n8)];
                case 3:
                    _a.sent();
                    if (witnessBin.byteLength % n8 != 0) {
                        throw new Error("Invalid witness length");
                    }
                    return [4 /*yield*/, fd.writeULE32(witnessBin.byteLength / n8)];
                case 4:
                    _a.sent();
                    return [4 /*yield*/, endWriteSection_1(fd)];
                case 5:
                    _a.sent();
                    return [4 /*yield*/, startWriteSection_1(fd, 2)];
                case 6:
                    _a.sent();
                    return [4 /*yield*/, fd.write(witnessBin)];
                case 7:
                    _a.sent();
                    return [4 /*yield*/, endWriteSection_1(fd)];
                case 8:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
function readHeader(fd, sections) {
    return __awaiter(this, void 0, void 0, function () {
        var n8, q, nWitness;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, startReadUniqueSection_1(fd, sections, 1)];
                case 1:
                    _a.sent();
                    return [4 /*yield*/, fd.readULE32()];
                case 2:
                    n8 = _a.sent();
                    return [4 /*yield*/, readBigInt_1(fd, n8)];
                case 3:
                    q = _a.sent();
                    return [4 /*yield*/, fd.readULE32()];
                case 4:
                    nWitness = _a.sent();
                    return [4 /*yield*/, endReadSection_1(fd)];
                case 5:
                    _a.sent();
                    return [2 /*return*/, { n8: n8, q: q, nWitness: nWitness }];
            }
        });
    });
}

/* eslint-disable eqeqeq */
/* istanbul ignore file */
var unstringifyBigInts$2 = ffjavascript$1.utils.unstringifyBigInts;
function wtnsCalculate(_input, wasmFileName, wtnsFileName) {
    return __awaiter(this, void 0, void 0, function () {
        var input, fdWasm, wasm, wc, w, fdWtns, fdWtns, w;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    input = unstringifyBigInts$2(_input);
                    return [4 /*yield*/, readExisting_1(wasmFileName)];
                case 1:
                    fdWasm = _a.sent();
                    return [4 /*yield*/, fdWasm.read(fdWasm.totalSize)];
                case 2:
                    wasm = _a.sent();
                    return [4 /*yield*/, fdWasm.close()];
                case 3:
                    _a.sent();
                    return [4 /*yield*/, circom_runtime.WitnessCalculatorBuilder(wasm)];
                case 4:
                    wc = _a.sent();
                    if (!(wc.circom_version() == 1)) return [3 /*break*/, 9];
                    return [4 /*yield*/, wc.calculateBinWitness(input)];
                case 5:
                    w = _a.sent();
                    return [4 /*yield*/, createBinFile_1(wtnsFileName, "wtns", 2, 2)];
                case 6:
                    fdWtns = _a.sent();
                    return [4 /*yield*/, writeBin(fdWtns, w, wc.prime)];
                case 7:
                    _a.sent();
                    return [4 /*yield*/, fdWtns.close()];
                case 8:
                    _a.sent();
                    return [3 /*break*/, 14];
                case 9: return [4 /*yield*/, createOverride_1(wtnsFileName)];
                case 10:
                    fdWtns = _a.sent();
                    return [4 /*yield*/, wc.calculateWTNSBin(input)];
                case 11:
                    w = _a.sent();
                    return [4 /*yield*/, fdWtns.write(w)];
                case 12:
                    _a.sent();
                    return [4 /*yield*/, fdWtns.close()];
                case 13:
                    _a.sent();
                    _a.label = 14;
                case 14: return [2 /*return*/];
            }
        });
    });
}

/* eslint-disable no-plusplus */
/* eslint-disable eqeqeq */
/* eslint-disable @typescript-eslint/naming-convention */
/* istanbul ignore file */
var stringifyBigInts = ffjavascript$1.utils.stringifyBigInts, unstringifyBigInts$1 = ffjavascript$1.utils.unstringifyBigInts;
function buildABC1(curve, zkey, witness, coeffs) {
    return __awaiter(this, void 0, void 0, function () {
        var n8, sCoef, nCoef, outBuffA, outBuffB, outBuffC, outBuf, i, buffCoef, buffCoefV, m, c, s, coef, i;
        return __generator(this, function (_a) {
            n8 = curve.Fr.n8;
            sCoef = 4 * 3 + zkey.n8r;
            nCoef = (coeffs.byteLength - 4) / sCoef;
            outBuffA = new ffjavascript$1.BigBuffer(zkey.domainSize * n8);
            outBuffB = new ffjavascript$1.BigBuffer(zkey.domainSize * n8);
            outBuffC = new ffjavascript$1.BigBuffer(zkey.domainSize * n8);
            outBuf = [outBuffA, outBuffB];
            for (i = 0; i < nCoef; i++) {
                buffCoef = coeffs.slice(4 + i * sCoef, 4 + i * sCoef + sCoef);
                buffCoefV = new DataView(buffCoef.buffer);
                m = buffCoefV.getUint32(0, true);
                c = buffCoefV.getUint32(4, true);
                s = buffCoefV.getUint32(8, true);
                coef = buffCoef.slice(12, 12 + n8);
                outBuf[m].set(curve.Fr.add(outBuf[m].slice(c * n8, c * n8 + n8), curve.Fr.mul(coef, witness.slice(s * n8, s * n8 + n8))), c * n8);
            }
            for (i = 0; i < zkey.domainSize; i++) {
                outBuffC.set(curve.Fr.mul(outBuffA.slice(i * n8, i * n8 + n8), outBuffB.slice(i * n8, i * n8 + n8)), i * n8);
            }
            return [2 /*return*/, [outBuffA, outBuffB, outBuffC]];
        });
    });
}
function joinABC(curve, _zkey, a, b, c) {
    return __awaiter(this, void 0, void 0, function () {
        var MAX_CHUNK_SIZE, n8, nElements, promises, i, n, task, aChunk, bChunk, cChunk, result, outBuff, p, i;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    MAX_CHUNK_SIZE = 1 << 22;
                    n8 = curve.Fr.n8;
                    nElements = Math.floor(a.byteLength / curve.Fr.n8);
                    promises = [];
                    for (i = 0; i < nElements; i += MAX_CHUNK_SIZE) {
                        n = Math.min(nElements - i, MAX_CHUNK_SIZE);
                        task = [];
                        aChunk = a.slice(i * n8, (i + n) * n8);
                        bChunk = b.slice(i * n8, (i + n) * n8);
                        cChunk = c.slice(i * n8, (i + n) * n8);
                        task.push({ cmd: "ALLOCSET", var: 0, buff: aChunk });
                        task.push({ cmd: "ALLOCSET", var: 1, buff: bChunk });
                        task.push({ cmd: "ALLOCSET", var: 2, buff: cChunk });
                        task.push({ cmd: "ALLOC", var: 3, len: n * n8 });
                        task.push({
                            cmd: "CALL",
                            fnName: "qap_joinABC",
                            params: [{ var: 0 }, { var: 1 }, { var: 2 }, { val: n }, { var: 3 }]
                        });
                        task.push({ cmd: "CALL", fnName: "frm_batchFromMontgomery", params: [{ var: 3 }, { val: n }, { var: 3 }] });
                        task.push({ cmd: "GET", out: 0, var: 3, len: n * n8 });
                        promises.push(curve.tm.queueAction(task));
                    }
                    return [4 /*yield*/, Promise.all(promises)];
                case 1:
                    result = _a.sent();
                    if (a instanceof ffjavascript$1.BigBuffer) {
                        // @ts-ignore
                        outBuff = new ffjavascript$1.BigBuffer(a.byteLength);
                    }
                    else {
                        outBuff = new Uint8Array(a.byteLength);
                    }
                    p = 0;
                    for (i = 0; i < result.length; i++) {
                        outBuff.set(result[i][0], p);
                        p += result[i][0].byteLength;
                    }
                    return [2 /*return*/, outBuff];
            }
        });
    });
}
/**
 * Creates a Groth16 proof composed of public signals and zero-knowledge parameters.
 * @param input Input signals of the circuit.
 * @param wasmFile WASM file of the circuit.
 * @param zkeyFile ZKey file of the circuit.
 * @returns A proof containing public signals and zero-knowledge parameters.
 */
function prove(input, wasmFile, zkeyFile) {
    return __awaiter(this, void 0, void 0, function () {
        var witnessFileName, _a, fdWtns, sectionsWtns, wtns, _b, fdZKey, sectionsZKey, zkey, curve, Fr, G1, G2, power, buffWitness, buffCoeffs, _c, buffA_T, buffB_T, buffC_T, inc, buffA, buffAodd, buffAodd_T, buffB, buffBodd, buffBodd_T, buffC, buffCodd, buffCodd_T, buffPodd_T, proof, buffBasesA, _d, buffBasesB1, pib1, buffBasesB2, _e, buffBasesC, _f, buffBasesH, resH, r, s, publicSignals, i, b;
        return __generator(this, function (_g) {
            switch (_g.label) {
                case 0:
                    input = unstringifyBigInts$1(input);
                    witnessFileName = {
                        type: "mem"
                    };
                    return [4 /*yield*/, wtnsCalculate(input, wasmFile, witnessFileName)];
                case 1:
                    _g.sent();
                    return [4 /*yield*/, readBinFile_1(witnessFileName, "wtns", 2, 1 << 25, 1 << 23)];
                case 2:
                    _a = _g.sent(), fdWtns = _a.fd, sectionsWtns = _a.sections;
                    return [4 /*yield*/, readHeader(fdWtns, sectionsWtns)];
                case 3:
                    wtns = _g.sent();
                    return [4 /*yield*/, readBinFile_1(zkeyFile, "zkey", 2, 1 << 25, 1 << 23)];
                case 4:
                    _b = _g.sent(), fdZKey = _b.fd, sectionsZKey = _b.sections;
                    return [4 /*yield*/, readHeader$1(fdZKey, sectionsZKey, undefined)];
                case 5:
                    zkey = _g.sent();
                    if (zkey.protocol !== "groth16") {
                        throw new Error("zkey file is not groth16");
                    }
                    if (!ffjavascript$1.Scalar.eq(zkey.r, wtns.q)) {
                        throw new Error("Curve of the witness does not match the curve of the proving key");
                    }
                    if (wtns.nWitness !== zkey.nVars) {
                        throw new Error("Invalid witness length. Circuit: ".concat(zkey.nVars, ", witness: ").concat(wtns.nWitness));
                    }
                    curve = zkey.curve;
                    Fr = curve.Fr;
                    G1 = curve.G1;
                    G2 = curve.G2;
                    power = log2(zkey.domainSize);
                    return [4 /*yield*/, readSection_1(fdWtns, sectionsWtns, 2)];
                case 6:
                    buffWitness = _g.sent();
                    return [4 /*yield*/, readSection_1(fdZKey, sectionsZKey, 4)];
                case 7:
                    buffCoeffs = _g.sent();
                    return [4 /*yield*/, buildABC1(curve, zkey, buffWitness, buffCoeffs)];
                case 8:
                    _c = _g.sent(), buffA_T = _c[0], buffB_T = _c[1], buffC_T = _c[2];
                    inc = power == Fr.s ? curve.Fr.shift : curve.Fr.w[power + 1];
                    return [4 /*yield*/, Fr.ifft(buffA_T, "", "", undefined, "IFFT_A")];
                case 9:
                    buffA = _g.sent();
                    return [4 /*yield*/, Fr.batchApplyKey(buffA, Fr.e(1), inc)];
                case 10:
                    buffAodd = _g.sent();
                    return [4 /*yield*/, Fr.fft(buffAodd, "", "", undefined, "FFT_A")];
                case 11:
                    buffAodd_T = _g.sent();
                    return [4 /*yield*/, Fr.ifft(buffB_T, "", "", undefined, "IFFT_B")];
                case 12:
                    buffB = _g.sent();
                    return [4 /*yield*/, Fr.batchApplyKey(buffB, Fr.e(1), inc)];
                case 13:
                    buffBodd = _g.sent();
                    return [4 /*yield*/, Fr.fft(buffBodd, "", "", undefined, "FFT_B")];
                case 14:
                    buffBodd_T = _g.sent();
                    return [4 /*yield*/, Fr.ifft(buffC_T, "", "", undefined, "IFFT_C")];
                case 15:
                    buffC = _g.sent();
                    return [4 /*yield*/, Fr.batchApplyKey(buffC, Fr.e(1), inc)];
                case 16:
                    buffCodd = _g.sent();
                    return [4 /*yield*/, Fr.fft(buffCodd, "", "", undefined, "FFT_C")];
                case 17:
                    buffCodd_T = _g.sent();
                    return [4 /*yield*/, joinABC(curve, zkey, buffAodd_T, buffBodd_T, buffCodd_T)];
                case 18:
                    buffPodd_T = _g.sent();
                    proof = {};
                    return [4 /*yield*/, readSection_1(fdZKey, sectionsZKey, 5)];
                case 19:
                    buffBasesA = _g.sent();
                    _d = proof;
                    return [4 /*yield*/, curve.G1.multiExpAffine(buffBasesA, buffWitness, undefined, "multiexp A")];
                case 20:
                    _d.pi_a = _g.sent();
                    return [4 /*yield*/, readSection_1(fdZKey, sectionsZKey, 6)];
                case 21:
                    buffBasesB1 = _g.sent();
                    return [4 /*yield*/, curve.G1.multiExpAffine(buffBasesB1, buffWitness, undefined, "multiexp B1")];
                case 22:
                    pib1 = _g.sent();
                    return [4 /*yield*/, readSection_1(fdZKey, sectionsZKey, 7)];
                case 23:
                    buffBasesB2 = _g.sent();
                    _e = proof;
                    return [4 /*yield*/, curve.G2.multiExpAffine(buffBasesB2, buffWitness, undefined, "multiexp B2")];
                case 24:
                    _e.pi_b = _g.sent();
                    return [4 /*yield*/, readSection_1(fdZKey, sectionsZKey, 8)];
                case 25:
                    buffBasesC = _g.sent();
                    _f = proof;
                    return [4 /*yield*/, curve.G1.multiExpAffine(buffBasesC, buffWitness.slice((zkey.nPublic + 1) * curve.Fr.n8), undefined, "multiexp C")];
                case 26:
                    _f.pi_c = _g.sent();
                    return [4 /*yield*/, readSection_1(fdZKey, sectionsZKey, 9)];
                case 27:
                    buffBasesH = _g.sent();
                    return [4 /*yield*/, curve.G1.multiExpAffine(buffBasesH, buffPodd_T, undefined, "multiexp H")];
                case 28:
                    resH = _g.sent();
                    r = curve.Fr.random();
                    s = curve.Fr.random();
                    proof.pi_a = G1.add(proof.pi_a, zkey.vk_alpha_1);
                    proof.pi_a = G1.add(proof.pi_a, G1.timesFr(zkey.vk_delta_1, r));
                    proof.pi_b = G2.add(proof.pi_b, zkey.vk_beta_2);
                    proof.pi_b = G2.add(proof.pi_b, G2.timesFr(zkey.vk_delta_2, s));
                    pib1 = G1.add(pib1, zkey.vk_beta_1);
                    pib1 = G1.add(pib1, G1.timesFr(zkey.vk_delta_1, s));
                    proof.pi_c = G1.add(proof.pi_c, resH);
                    proof.pi_c = G1.add(proof.pi_c, G1.timesFr(proof.pi_a, s));
                    proof.pi_c = G1.add(proof.pi_c, G1.timesFr(pib1, r));
                    proof.pi_c = G1.add(proof.pi_c, G1.timesFr(zkey.vk_delta_1, Fr.neg(Fr.mul(r, s))));
                    publicSignals = [];
                    for (i = 1; i <= zkey.nPublic; i++) {
                        b = buffWitness.slice(i * Fr.n8, i * Fr.n8 + Fr.n8);
                        publicSignals.push(ffjavascript$1.Scalar.fromRprLE(b, undefined, undefined));
                    }
                    proof.pi_a = G1.toObject(G1.toAffine(proof.pi_a));
                    proof.pi_b = G2.toObject(G2.toAffine(proof.pi_b));
                    proof.pi_c = G1.toObject(G1.toAffine(proof.pi_c));
                    proof.protocol = "groth16";
                    proof.curve = curve.name;
                    return [4 /*yield*/, fdZKey.close()];
                case 29:
                    _g.sent();
                    return [4 /*yield*/, fdWtns.close()];
                case 30:
                    _g.sent();
                    proof = stringifyBigInts(proof);
                    publicSignals = stringifyBigInts(publicSignals);
                    return [2 /*return*/, { proof: proof, publicSignals: publicSignals }];
            }
        });
    });
}

/* eslint-disable no-plusplus */
/* eslint-disable @typescript-eslint/naming-convention */
/* istanbul ignore file */
var unstringifyBigInts = ffjavascript$1.utils.unstringifyBigInts;
function isWellConstructed(curve, proof) {
    var G1 = curve.G1;
    var G2 = curve.G2;
    return G1.isValid(proof.pi_a) && G2.isValid(proof.pi_b) && G1.isValid(proof.pi_c);
}
function publicInputsAreValid(curve, publicInputs) {
    for (var i = 0; i < publicInputs.length; i++) {
        if (!ffjavascript$1.Scalar.lt(publicInputs[i], curve.r)) {
            return false;
        }
    }
    return true;
}
/**
 * Verifies if a Groth16 proof is valid or not.
 * @param verificationKey The verification key used to verify the proof.
 * @param proof The proof containing public signals and zero-knowledge parameters.
 * @returns True if the proof is valid, and false otherwise.
 */
function verify(verificationKey, _a) {
    var proof = _a.proof, publicSignals = _a.publicSignals;
    return __awaiter(this, void 0, void 0, function () {
        var curve, IC0, IC, w, i, buffP, cpub, pi_a, pi_b, pi_c, vk_gamma_2, vk_delta_2, vk_alpha_1, vk_beta_2;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    verificationKey = unstringifyBigInts(verificationKey);
                    proof = unstringifyBigInts(proof);
                    publicSignals = unstringifyBigInts(publicSignals);
                    return [4 /*yield*/, buildBn128()];
                case 1:
                    curve = _b.sent();
                    IC0 = curve.G1.fromObject(verificationKey.IC[0]);
                    IC = new Uint8Array(curve.G1.F.n8 * 2 * publicSignals.length);
                    w = new Uint8Array(curve.Fr.n8 * publicSignals.length);
                    if (!publicInputsAreValid(curve, publicSignals)) {
                        return [2 /*return*/, false];
                    }
                    for (i = 0; i < publicSignals.length; i++) {
                        buffP = curve.G1.fromObject(verificationKey.IC[i + 1]);
                        IC.set(buffP, i * curve.G1.F.n8 * 2);
                        ffjavascript$1.Scalar.toRprLE(w, curve.Fr.n8 * i, publicSignals[i], curve.Fr.n8);
                    }
                    return [4 /*yield*/, curve.G1.multiExpAffine(IC, w)];
                case 2:
                    cpub = _b.sent();
                    cpub = curve.G1.add(cpub, IC0);
                    pi_a = curve.G1.fromObject(proof.pi_a);
                    pi_b = curve.G2.fromObject(proof.pi_b);
                    pi_c = curve.G1.fromObject(proof.pi_c);
                    if (!isWellConstructed(curve, { pi_a: pi_a, pi_b: pi_b, pi_c: pi_c })) {
                        return [2 /*return*/, false];
                    }
                    vk_gamma_2 = curve.G2.fromObject(verificationKey.vk_gamma_2);
                    vk_delta_2 = curve.G2.fromObject(verificationKey.vk_delta_2);
                    vk_alpha_1 = curve.G1.fromObject(verificationKey.vk_alpha_1);
                    vk_beta_2 = curve.G2.fromObject(verificationKey.vk_beta_2);
                    return [2 /*return*/, curve.pairingEq(curve.G1.neg(pi_a), pi_b, cpub, vk_gamma_2, pi_c, vk_delta_2, vk_alpha_1, vk_beta_2)];
            }
        });
    });
}

exports.buildBn128 = buildBn128;
exports.prove = prove;
exports.verify = verify;


/***/ }),

/***/ 189:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

/*
    Copyright 2019 0KIMS association.

    This file is part of wasmsnark (Web Assembly zkSnark Prover).

    wasmsnark is a free software: you can redistribute it and/or modify it
    under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    wasmsnark is distributed in the hope that it will be useful, but WITHOUT
    ANY WARRANTY; without even the implied warranty of MERCHANTABILITY
    or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public
    License for more details.

    You should have received a copy of the GNU General Public License
    along with wasmsnark. If not, see <https://www.gnu.org/licenses/>.
*/


// module.exports.bn128_wasm = require("./build/bn128_wasm.js");
// module.exports.bls12381_wasm = require("./build/bls12381_wasm.js");
// module.exports.mnt6753_wasm = require("./build/mnt6753_wasm.js");

module.exports.buildBn128 = __webpack_require__(584);
module.exports.buildBls12381 = __webpack_require__(920);
// module.exports.buildMnt6753 = require("./src/mnt6753/build_mnt7.js");

module.exports.buildF1m = __webpack_require__(75);


/***/ }),

/***/ 409:
/***/ ((module) => {

// Many of these utilities are from the `big-integer` library,
// but adjusted to only work with native BigInt type
// Ref https://github.com/peterolson/BigInteger.js/blob/e5d2154d3c417069c51e7116bafc3b91d0b9fe41/BigInteger.js
// Originally licensed The Unlicense

function compare(a, b) {
    return a === b ? 0 : a > b ? 1 : -1;
}

function square(n) {
    return n * n;
}

function isOdd(n) {
    return n % 2n !== 0n;
}

function isEven(n) {
    return n % 2n === 0n;
}

function isNegative(n) {
    return n < 0n;
}

function isPositive(n) {
    return n > 0n;
}

function bitLength(n) {
    if (isNegative(n)) {
        return n.toString(2).length - 1; // discard the - sign
    } else {
        return n.toString(2).length;
    }
}

function abs(n) {
    return n < 0n ? -n : n;
}

function isUnit(n) {
    return abs(n) === 1n;
}

function modInv(a, n) {
    var t = 0n, newT = 1n, r = n, newR = abs(a), q, lastT, lastR;
    while (newR !== 0n) {
        q = r / newR;
        lastT = t;
        lastR = r;
        t = newT;
        r = newR;
        newT = lastT - (q * newT);
        newR = lastR - (q * newR);
    }
    if (!isUnit(r)) throw new Error(a.toString() + " and " + n.toString() + " are not co-prime");
    if (compare(t, 0n) === -1) {
        t = t + n;
    }
    if (isNegative(a)) {
        return -t;
    }
    return t;
}

function modPow(n, exp, mod) {
    if (mod === 0n) throw new Error("Cannot take modPow with modulus 0");
    var r = 1n,
        base = n % mod;
    if (isNegative(exp)) {
        exp = exp * -1n;
        base = modInv(base, mod);
    }
    while (isPositive(exp)) {
        if (base === 0n) return 0n;
        if (isOdd(exp)) r = r * base % mod;
        exp = exp / 2n;
        base = square(base) % mod;
    }
    return r;
}

function compareAbs(a, b) {
    a = a >= 0n ? a : -a;
    b = b >= 0n ? b : -b;
    return a === b ? 0 : a > b ? 1 : -1;
}

function isDivisibleBy(a, n) {
    if (n === 0n) return false;
    if (isUnit(n)) return true;
    if (compareAbs(n, 2n) === 0) return isEven(a);
    return a % n === 0n;
}

function isBasicPrime(v) {
    var n = abs(v);
    if (isUnit(n)) return false;
    if (n === 2n || n === 3n || n === 5n) return true;
    if (isEven(n) || isDivisibleBy(n, 3n) || isDivisibleBy(n, 5n)) return false;
    if (n < 49n) return true;
    // we don't know if it's prime: let the other functions figure it out
}

function prev(n) {
    return n - 1n;
}

function millerRabinTest(n, a) {
    var nPrev = prev(n),
        b = nPrev,
        r = 0,
        d, i, x;
    while (isEven(b)) b = b / 2n, r++;
    next: for (i = 0; i < a.length; i++) {
        if (n < a[i]) continue;
        x = modPow(BigInt(a[i]), b, n);
        if (isUnit(x) || x === nPrev) continue;
        for (d = r - 1; d != 0; d--) {
            x = square(x) % n;
            if (isUnit(x)) return false;
            if (x === nPrev) continue next;
        }
        return false;
    }
    return true;
}

function isPrime(p) {
    var isPrime = isBasicPrime(p);
    if (isPrime !== undefined) return isPrime;
    var n = abs(p);
    var bits = bitLength(n);
    if (bits <= 64)
        return millerRabinTest(n, [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37]);
    var logN = Math.log(2) * Number(bits);
    var t = Math.ceil(logN);
    for (var a = [], i = 0; i < t; i++) {
        a.push(BigInt(i + 2));
    }
    return millerRabinTest(n, a);
}

module.exports.bitLength = bitLength;
module.exports.isOdd = isOdd;
module.exports.isNegative = isNegative;
module.exports.abs = abs;
module.exports.isUnit = isUnit;
module.exports.compare = compare;
module.exports.modInv = modInv;
module.exports.modPow = modPow;
module.exports.isPrime = isPrime;
module.exports.square = square;


/***/ }),

/***/ 920:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const utils = __webpack_require__(333);

const buildF1m =__webpack_require__(75);
const buildF1 =__webpack_require__(138);
const buildF2m =__webpack_require__(420);
const buildF3m =__webpack_require__(173);
const buildCurve =__webpack_require__(904);
const buildFFT = __webpack_require__(292);
const buildPol = __webpack_require__(896);
const buildQAP = __webpack_require__(637);
const buildApplyKey = __webpack_require__(320);
const { bitLength, isOdd, isNegative } = __webpack_require__(409);

// Definition here: https://electriccoin.co/blog/new-snark-curve/

module.exports = function buildBLS12381(module, _prefix) {

    const prefix = _prefix || "bls12381";

    if (module.modules[prefix]) return prefix;  // already builded

    const q = 0x1a0111ea397fe69a4b1ba7b6434bacd764774b84f38512bf6730d2a0f6b0f6241eabfffeb153ffffb9feffffffffaaabn;
    const r = 0x73eda753299d7d483339d80809a1d80553bda402fffe5bfeffffffff00000001n;

    const n64q = Math.floor((bitLength(q - 1n) - 1)/64) +1;
    const n8q = n64q*8;
    const f1size = n8q;
    const f2size = f1size * 2;
    const ftsize = f1size * 12;

    const n64r = Math.floor((bitLength(r - 1n) - 1)/64) +1;
    const n8r = n64r*8;
    const frsize = n8r;


    const pr = module.alloc(utils.bigInt2BytesLE( r, frsize ));

    const f1mPrefix = buildF1m(module, q, "f1m", "intq");
    buildF1(module, r, "fr", "frm", "intr");
    const pG1b = module.alloc(utils.bigInt2BytesLE( toMontgomery(4n), f1size ));
    const g1mPrefix = buildCurve(module, "g1m", "f1m", pG1b);

    buildFFT(module, "frm", "frm", "frm", "frm_mul");

    buildPol(module, "pol", "frm");
    buildQAP(module, "qap", "frm");

    const f2mPrefix = buildF2m(module, "f1m_neg", "f2m", "f1m");
    const pG2b = module.alloc([
        ...utils.bigInt2BytesLE( toMontgomery(4n), f1size ),
        ...utils.bigInt2BytesLE( toMontgomery(4n), f1size )
    ]);
    const g2mPrefix = buildCurve(module, "g2m", "f2m", pG2b);


    function buildGTimesFr(fnName, opMul) {
        const f = module.addFunction(fnName);
        f.addParam("pG", "i32");
        f.addParam("pFr", "i32");
        f.addParam("pr", "i32");

        const c = f.getCodeBuilder();

        const AUX = c.i32_const(module.alloc(n8r));

        f.addCode(
            c.call("frm_fromMontgomery", c.getLocal("pFr"), AUX),
            c.call(
                opMul,
                c.getLocal("pG"),
                AUX,
                c.i32_const(n8r),
                c.getLocal("pr")
            )
        );

        module.exportFunction(fnName);
    }
    buildGTimesFr("g1m_timesFr", "g1m_timesScalar");
    buildFFT(module, "g1m", "g1m", "frm", "g1m_timesFr");

    buildGTimesFr("g2m_timesFr", "g2m_timesScalar");
    buildFFT(module, "g2m", "g2m", "frm", "g2m_timesFr");

    buildGTimesFr("g1m_timesFrAffine", "g1m_timesScalarAffine");
    buildGTimesFr("g2m_timesFrAffine", "g2m_timesScalarAffine");

    buildApplyKey(module, "frm_batchApplyKey", "fmr", "frm", n8r, n8r, n8r, "frm_mul");
    buildApplyKey(module, "g1m_batchApplyKey", "g1m", "frm", n8q*3, n8q*3, n8r, "g1m_timesFr");
    buildApplyKey(module, "g1m_batchApplyKeyMixed", "g1m", "frm", n8q*2, n8q*3, n8r, "g1m_timesFrAffine");
    buildApplyKey(module, "g2m_batchApplyKey", "g2m", "frm", n8q*2*3, n8q*3*2, n8r, "g2m_timesFr");
    buildApplyKey(module, "g2m_batchApplyKeyMixed", "g2m", "frm", n8q*2*2, n8q*3*2, n8r, "g2m_timesFrAffine");


    function toMontgomery(a) {
        return BigInt(a) * (1n << BigInt(f1size*8)) % q;
    }

    const G1gen = [
        3685416753713387016781088315183077757961620795782546409894578378688607592378376318836054947676345821548104185464507n,
        1339506544944476473020471379941921221584933875938349620426543736416511423956333506472724655353366534992391756441569n,
        1n
    ];

    const pG1gen = module.alloc(
        [
            ...utils.bigInt2BytesLE( toMontgomery(G1gen[0]), f1size ),
            ...utils.bigInt2BytesLE( toMontgomery(G1gen[1]), f1size ),
            ...utils.bigInt2BytesLE( toMontgomery(G1gen[2]), f1size ),
        ]
    );

    const G1zero = [
        0n,
        1n,
        0n
    ];

    const pG1zero = module.alloc(
        [
            ...utils.bigInt2BytesLE( toMontgomery(G1zero[0]), f1size ),
            ...utils.bigInt2BytesLE( toMontgomery(G1zero[1]), f1size ),
            ...utils.bigInt2BytesLE( toMontgomery(G1zero[2]), f1size )
        ]
    );

    const G2gen = [
        [
            352701069587466618187139116011060144890029952792775240219908644239793785735715026873347600343865175952761926303160n,
            3059144344244213709971259814753781636986470325476647558659373206291635324768958432433509563104347017837885763365758n,
        ],[
            1985150602287291935568054521177171638300868978215655730859378665066344726373823718423869104263333984641494340347905n,
            927553665492332455747201965776037880757740193453592970025027978793976877002675564980949289727957565575433344219582n,
        ],[
            1n,
            0n,
        ]
    ];

    const pG2gen = module.alloc(
        [
            ...utils.bigInt2BytesLE( toMontgomery(G2gen[0][0]), f1size ),
            ...utils.bigInt2BytesLE( toMontgomery(G2gen[0][1]), f1size ),
            ...utils.bigInt2BytesLE( toMontgomery(G2gen[1][0]), f1size ),
            ...utils.bigInt2BytesLE( toMontgomery(G2gen[1][1]), f1size ),
            ...utils.bigInt2BytesLE( toMontgomery(G2gen[2][0]), f1size ),
            ...utils.bigInt2BytesLE( toMontgomery(G2gen[2][1]), f1size ),
        ]
    );

    const G2zero = [
        [
            0n,
            0n,
        ],[
            1n,
            0n,
        ],[
            0n,
            0n,
        ]
    ];

    const pG2zero = module.alloc(
        [
            ...utils.bigInt2BytesLE( toMontgomery(G2zero[0][0]), f1size ),
            ...utils.bigInt2BytesLE( toMontgomery(G2zero[0][1]), f1size ),
            ...utils.bigInt2BytesLE( toMontgomery(G2zero[1][0]), f1size ),
            ...utils.bigInt2BytesLE( toMontgomery(G2zero[1][1]), f1size ),
            ...utils.bigInt2BytesLE( toMontgomery(G2zero[2][0]), f1size ),
            ...utils.bigInt2BytesLE( toMontgomery(G2zero[2][1]), f1size ),
        ]
    );

    const pOneT = module.alloc([
        ...utils.bigInt2BytesLE( toMontgomery(1n), f1size ),
        ...utils.bigInt2BytesLE( toMontgomery(0n), f1size ),
        ...utils.bigInt2BytesLE( toMontgomery(0n), f1size ),
        ...utils.bigInt2BytesLE( toMontgomery(0n), f1size ),
        ...utils.bigInt2BytesLE( toMontgomery(0n), f1size ),
        ...utils.bigInt2BytesLE( toMontgomery(0n), f1size ),
        ...utils.bigInt2BytesLE( toMontgomery(0n), f1size ),
        ...utils.bigInt2BytesLE( toMontgomery(0n), f1size ),
        ...utils.bigInt2BytesLE( toMontgomery(0n), f1size ),
        ...utils.bigInt2BytesLE( toMontgomery(0n), f1size ),
        ...utils.bigInt2BytesLE( toMontgomery(0n), f1size ),
        ...utils.bigInt2BytesLE( toMontgomery(0n), f1size ),
    ]);

    const pBls12381Twist =  module.alloc([
        ...utils.bigInt2BytesLE( toMontgomery(1n), f1size ),
        ...utils.bigInt2BytesLE( toMontgomery(1n), f1size ),
    ]);

    function build_mulNR2() {
        const f = module.addFunction(f2mPrefix + "_mulNR");
        f.addParam("x", "i32");
        f.addParam("pr", "i32");

        const c = f.getCodeBuilder();

        const x0c = c.i32_const(module.alloc(f1size));
        const x0 = c.getLocal("x");
        const x1 = c.i32_add(c.getLocal("x"), c.i32_const(f1size));
        const r0 = c.getLocal("pr");
        const r1 = c.i32_add(c.getLocal("pr"), c.i32_const(f1size));

        f.addCode(
            c.call(f1mPrefix+"_copy", x0, x0c),
            c.call(f1mPrefix+"_sub", x0, x1, r0),
            c.call(f1mPrefix+"_add", x0c, x1, r1),
        );
    }
    build_mulNR2();

    const f6mPrefix = buildF3m(module, f2mPrefix+"_mulNR", "f6m", "f2m");

    function build_mulNR6() {
        const f = module.addFunction(f6mPrefix + "_mulNR");
        f.addParam("x", "i32");
        f.addParam("pr", "i32");

        const c = f.getCodeBuilder();

        const c0copy = c.i32_const(module.alloc(f1size*2));

        f.addCode(
            c.call(
                f2mPrefix + "_copy",
                c.getLocal("x"),
                c0copy
            ),
            c.call(
                f2mPrefix + "_mulNR",
                c.i32_add(c.getLocal("x"), c.i32_const(n8q*4)),
                c.getLocal("pr")
            ),
            c.call(
                f2mPrefix + "_copy",
                c.i32_add(c.getLocal("x"), c.i32_const(n8q*2)),
                c.i32_add(c.getLocal("pr"), c.i32_const(n8q*4)),
            ),
            c.call(
                f2mPrefix + "_copy",
                c0copy,
                c.i32_add(c.getLocal("pr"), c.i32_const(n8q*2)),
            ),
        );
    }
    build_mulNR6();

    const ftmPrefix = buildF2m(module, f6mPrefix+"_mulNR", "ftm", f6mPrefix);

    const ateLoopCount = 0xd201000000010000n;
    const ateLoopBitBytes = bits(ateLoopCount);
    const pAteLoopBitBytes = module.alloc(ateLoopBitBytes);
    const isLoopNegative = true;

    const ateCoefSize = 3 * f2size;
    const ateNDblCoefs = ateLoopBitBytes.length-1;
    const ateNAddCoefs = ateLoopBitBytes.reduce((acc, b) =>  acc + ( b!=0 ? 1 : 0)   ,0);
    const ateNCoefs = ateNAddCoefs + ateNDblCoefs + 1;
    const prePSize = 3*2*n8q;
    const preQSize = 3*n8q*2 + ateNCoefs*ateCoefSize;
    const finalExpIsNegative = true;

    const finalExpZ = 15132376222941642752n;


    module.modules[prefix] = {
        n64q: n64q,
        n64r: n64r,
        n8q: n8q,
        n8r: n8r,
        pG1gen: pG1gen,
        pG1zero: pG1zero,
        pG1b: pG1b,
        pG2gen: pG2gen,
        pG2zero: pG2zero,
        pG2b: pG2b,
        pq: module.modules["f1m"].pq,
        pr: pr,
        pOneT: pOneT,
        r: r,
        q: q,
        prePSize: prePSize,
        preQSize: preQSize
    };


    function naf(n) {
        let E = n;
        const res = [];
        while (E > 0n) {
            if (isOdd(E)) {
                const z = 2 - Number(E % 4n);
                res.push( z );
                E = E - BigInt(z);
            } else {
                res.push( 0 );
            }
            E = E >> 1n;
        }
        return res;
    }

    function bits(n) {
        let E = n;
        const res = [];
        while (E > 0n) {
            if (isOdd(E)) {
                res.push( 1 );
            } else {
                res.push( 0 );
            }
            E = E >> 1n;
        }
        return res;
    }

    function buildPrepareG1() {
        const f = module.addFunction(prefix+ "_prepareG1");
        f.addParam("pP", "i32");
        f.addParam("ppreP", "i32");

        const c = f.getCodeBuilder();

        f.addCode(
            c.call(g1mPrefix + "_normalize", c.getLocal("pP"), c.getLocal("ppreP")),  // TODO Remove if already in affine
        );
    }



    function buildPrepDoubleStep() {
        const f = module.addFunction(prefix+ "_prepDblStep");
        f.addParam("R", "i32");
        f.addParam("r", "i32");

        const c = f.getCodeBuilder();

        const Rx  = c.getLocal("R");
        const Ry  = c.i32_add(c.getLocal("R"), c.i32_const(2*n8q));
        const Rz  = c.i32_add(c.getLocal("R"), c.i32_const(4*n8q));

        const t0  = c.getLocal("r");
        const t3  = c.i32_add(c.getLocal("r"), c.i32_const(2*n8q));
        const t6  = c.i32_add(c.getLocal("r"), c.i32_const(4*n8q));


        const zsquared = c.i32_const(module.alloc(f2size));
        const t1 = c.i32_const(module.alloc(f2size));
        const t2 = c.i32_const(module.alloc(f2size));
        const t4 = c.i32_const(module.alloc(f2size));
        const t5 = c.i32_const(module.alloc(f2size));

        f.addCode(

            // tmp0 = r.x.square();
            c.call(f2mPrefix + "_square", Rx, t0),

            // tmp1 = r.y.square();
            c.call(f2mPrefix + "_square", Ry, t1),

            // tmp2 = tmp1.square();
            c.call(f2mPrefix + "_square", t1, t2),

            // tmp3 = (tmp1 + r.x).square() - tmp0 - tmp2;
            c.call(f2mPrefix + "_add", t1, Rx, t3),
            c.call(f2mPrefix + "_square", t3, t3),
            c.call(f2mPrefix + "_sub", t3, t0, t3),
            c.call(f2mPrefix + "_sub", t3, t2, t3),

            // tmp3 = tmp3 + tmp3;
            c.call(f2mPrefix + "_add", t3, t3, t3),

            // tmp4 = tmp0 + tmp0 + tmp0;
            c.call(f2mPrefix + "_add", t0, t0, t4),
            c.call(f2mPrefix + "_add", t4, t0, t4),

            // tmp6 = r.x + tmp4;
            c.call(f2mPrefix + "_add", Rx, t4, t6),

            // tmp5 = tmp4.square();
            c.call(f2mPrefix + "_square", t4, t5),

            // zsquared = r.z.square();
            c.call(f2mPrefix + "_square", Rz, zsquared),

            // r.x = tmp5 - tmp3 - tmp3;
            c.call(f2mPrefix + "_sub", t5, t3, Rx),
            c.call(f2mPrefix + "_sub", Rx, t3, Rx),

            // r.z = (r.z + r.y).square() - tmp1 - zsquared;
            c.call(f2mPrefix + "_add", Rz, Ry, Rz),
            c.call(f2mPrefix + "_square", Rz, Rz),
            c.call(f2mPrefix + "_sub", Rz, t1, Rz),
            c.call(f2mPrefix + "_sub", Rz, zsquared, Rz),

            // r.y = (tmp3 - r.x) * tmp4;
            c.call(f2mPrefix + "_sub", t3, Rx, Ry),
            c.call(f2mPrefix + "_mul", Ry, t4, Ry),

            // tmp2 = tmp2 + tmp2;
            c.call(f2mPrefix + "_add", t2, t2, t2),

            // tmp2 = tmp2 + tmp2;
            c.call(f2mPrefix + "_add", t2, t2, t2),

            // tmp2 = tmp2 + tmp2;
            c.call(f2mPrefix + "_add", t2, t2, t2),

            // r.y -= tmp2;
            c.call(f2mPrefix + "_sub", Ry, t2, Ry),

            // tmp3 = tmp4 * zsquared;
            c.call(f2mPrefix + "_mul", t4, zsquared, t3),

            // tmp3 = tmp3 + tmp3;
            c.call(f2mPrefix + "_add", t3, t3, t3),

            // tmp3 = -tmp3;
            c.call(f2mPrefix + "_neg", t3, t3),

            // tmp6 = tmp6.square() - tmp0 - tmp5;
            c.call(f2mPrefix + "_square", t6, t6),
            c.call(f2mPrefix + "_sub", t6, t0, t6),
            c.call(f2mPrefix + "_sub", t6, t5, t6),

            // tmp1 = tmp1 + tmp1;
            c.call(f2mPrefix + "_add", t1, t1, t1),

            // tmp1 = tmp1 + tmp1;
            c.call(f2mPrefix + "_add", t1, t1, t1),

            // tmp6 = tmp6 - tmp1;
            c.call(f2mPrefix + "_sub", t6, t1, t6),

            // tmp0 = r.z * zsquared;
            c.call(f2mPrefix + "_mul", Rz, zsquared, t0),

            // tmp0 = tmp0 + tmp0;
            c.call(f2mPrefix + "_add", t0, t0, t0),

        );
    }

    function buildPrepAddStep() {
        const f = module.addFunction(prefix+ "_prepAddStep");
        f.addParam("R", "i32");
        f.addParam("Q", "i32");
        f.addParam("r", "i32");

        const c = f.getCodeBuilder();

        const Rx  = c.getLocal("R");
        const Ry  = c.i32_add(c.getLocal("R"), c.i32_const(2*n8q));
        const Rz  = c.i32_add(c.getLocal("R"), c.i32_const(4*n8q));

        const Qx  = c.getLocal("Q");
        const Qy  = c.i32_add(c.getLocal("Q"), c.i32_const(2*n8q));

        const t10  = c.getLocal("r");
        const t1  = c.i32_add(c.getLocal("r"), c.i32_const(2*n8q));
        const t9  = c.i32_add(c.getLocal("r"), c.i32_const(4*n8q));

        const zsquared = c.i32_const(module.alloc(f2size));
        const ysquared = c.i32_const(module.alloc(f2size));
        const ztsquared = c.i32_const(module.alloc(f2size));
        const t0 = c.i32_const(module.alloc(f2size));
        const t2 = c.i32_const(module.alloc(f2size));
        const t3 = c.i32_const(module.alloc(f2size));
        const t4 = c.i32_const(module.alloc(f2size));
        const t5 = c.i32_const(module.alloc(f2size));
        const t6 = c.i32_const(module.alloc(f2size));
        const t7 = c.i32_const(module.alloc(f2size));
        const t8 = c.i32_const(module.alloc(f2size));

        f.addCode(

            // zsquared = r.z.square();
            c.call(f2mPrefix + "_square", Rz, zsquared),

            // ysquared = q.y.square();
            c.call(f2mPrefix + "_square", Qy, ysquared),

            // t0 = zsquared * q.x;
            c.call(f2mPrefix + "_mul", zsquared, Qx, t0),

            // t1 = ((q.y + r.z).square() - ysquared - zsquared) * zsquared;
            c.call(f2mPrefix + "_add", Qy, Rz, t1),
            c.call(f2mPrefix + "_square", t1, t1),
            c.call(f2mPrefix + "_sub", t1, ysquared, t1),
            c.call(f2mPrefix + "_sub", t1, zsquared, t1),
            c.call(f2mPrefix + "_mul", t1, zsquared, t1),

            // t2 = t0 - r.x;
            c.call(f2mPrefix + "_sub", t0, Rx, t2),

            // t3 = t2.square();
            c.call(f2mPrefix + "_square", t2, t3),

            // t4 = t3 + t3;
            c.call(f2mPrefix + "_add", t3, t3, t4),

            // t4 = t4 + t4;
            c.call(f2mPrefix + "_add", t4, t4, t4),

            // t5 = t4 * t2;
            c.call(f2mPrefix + "_mul", t4, t2, t5),

            // t6 = t1 - r.y - r.y;
            c.call(f2mPrefix + "_sub", t1, Ry, t6),
            c.call(f2mPrefix + "_sub", t6, Ry, t6),

            // t9 = t6 * q.x;
            c.call(f2mPrefix + "_mul", t6, Qx, t9),

            // t7 = t4 * r.x;
            c.call(f2mPrefix + "_mul", t4, Rx, t7),

            // r.x = t6.square() - t5 - t7 - t7;
            c.call(f2mPrefix + "_square", t6, Rx),
            c.call(f2mPrefix + "_sub", Rx, t5, Rx),
            c.call(f2mPrefix + "_sub", Rx, t7, Rx),
            c.call(f2mPrefix + "_sub", Rx, t7, Rx),

            // r.z = (r.z + t2).square() - zsquared - t3;
            c.call(f2mPrefix + "_add", Rz, t2, Rz),
            c.call(f2mPrefix + "_square", Rz, Rz),
            c.call(f2mPrefix + "_sub", Rz, zsquared, Rz),
            c.call(f2mPrefix + "_sub", Rz, t3, Rz),

            // t10 = q.y + r.z;
            c.call(f2mPrefix + "_add", Qy, Rz, t10),

            // t8 = (t7 - r.x) * t6;
            c.call(f2mPrefix + "_sub", t7, Rx, t8),
            c.call(f2mPrefix + "_mul", t8, t6, t8),

            // t0 = r.y * t5;
            c.call(f2mPrefix + "_mul", Ry, t5, t0),

            // t0 = t0 + t0;
            c.call(f2mPrefix + "_add", t0, t0, t0),

            // r.y = t8 - t0;
            c.call(f2mPrefix + "_sub", t8, t0, Ry),

            // t10 = t10.square() - ysquared;
            c.call(f2mPrefix + "_square", t10, t10),
            c.call(f2mPrefix + "_sub", t10, ysquared, t10),

            // ztsquared = r.z.square();
            c.call(f2mPrefix + "_square", Rz, ztsquared),

            // t10 = t10 - ztsquared;
            c.call(f2mPrefix + "_sub", t10, ztsquared, t10),

            // t9 = t9 + t9 - t10;
            c.call(f2mPrefix + "_add", t9, t9, t9),
            c.call(f2mPrefix + "_sub", t9, t10, t9),

            // t10 = r.z + r.z;
            c.call(f2mPrefix + "_add", Rz, Rz, t10),

            // t6 = -t6;
            c.call(f2mPrefix + "_neg", t6, t6),

            // t1 = t6 + t6;
            c.call(f2mPrefix + "_add", t6, t6, t1),
        );
    }


    function buildPrepareG2() {
        const f = module.addFunction(prefix+ "_prepareG2");
        f.addParam("pQ", "i32");
        f.addParam("ppreQ", "i32");
        f.addLocal("pCoef", "i32");
        f.addLocal("i", "i32");

        const c = f.getCodeBuilder();


        const Q = c.getLocal("pQ");

        const pR = module.alloc(f2size*3);
        const R = c.i32_const(pR);

        const base = c.getLocal("ppreQ");

        f.addCode(
            c.call(g2mPrefix + "_normalize", Q, base),
            c.if(
                c.call(g2mPrefix + "_isZero", base),
                c.ret([])
            ),
            c.call(g2mPrefix + "_copy", base, R),
            c.setLocal("pCoef", c.i32_add(c.getLocal("ppreQ"), c.i32_const(f2size*3))),
        );

        f.addCode(
            c.setLocal("i", c.i32_const(ateLoopBitBytes.length-2)),
            c.block(c.loop(

                c.call(prefix + "_prepDblStep", R, c.getLocal("pCoef")),
                c.setLocal("pCoef", c.i32_add(c.getLocal("pCoef"), c.i32_const(ateCoefSize))),

                c.if(
                    c.i32_load8_s(c.getLocal("i"), pAteLoopBitBytes),
                    [
                        ...c.call(prefix + "_prepAddStep", R, base, c.getLocal("pCoef")),
                        ...c.setLocal("pCoef", c.i32_add(c.getLocal("pCoef"), c.i32_const(ateCoefSize))),
                    ]
                ),
                c.br_if(1, c.i32_eqz ( c.getLocal("i") )),
                c.setLocal("i", c.i32_sub(c.getLocal("i"), c.i32_const(1))),
                c.br(0)
            ))
        );
    }


    function buildF6Mul1() {
        const f = module.addFunction(f6mPrefix+ "_mul1");
        f.addParam("pA", "i32");    // F6
        f.addParam("pC1", "i32");   // F2
        f.addParam("pR", "i32");    // F6

        const c = f.getCodeBuilder();

        const A_c0 = c.getLocal("pA");
        const A_c1 = c.i32_add(c.getLocal("pA"), c.i32_const(f1size*2));
        const A_c2 = c.i32_add(c.getLocal("pA"), c.i32_const(f1size*4));

        const c1  = c.getLocal("pC1");

        const t1 = c.getLocal("pR");
        const t2 = c.i32_add(c.getLocal("pR"), c.i32_const(f1size*2));
        const b_b = c.i32_add(c.getLocal("pR"), c.i32_const(f1size*4));

        const Ac0_Ac1 = c.i32_const(module.alloc(f1size*2));
        const Ac1_Ac2 = c.i32_const(module.alloc(f1size*2));

        f.addCode(

            c.call(f2mPrefix + "_add", A_c0, A_c1, Ac0_Ac1),
            c.call(f2mPrefix + "_add", A_c1, A_c2, Ac1_Ac2),

            // let b_b = self.c1 * c1;
            c.call(f2mPrefix + "_mul", A_c1, c1, b_b),

            // let t1 = (self.c1 + self.c2) * c1 - b_b;
            c.call(f2mPrefix + "_mul", Ac1_Ac2, c1, t1),
            c.call(f2mPrefix + "_sub", t1, b_b, t1),

            // let t1 = t1.mul_by_nonresidue();
            c.call(f2mPrefix + "_mulNR", t1, t1),

            // let t2 = (self.c0 + self.c1) * c1 - b_b;
            c.call(f2mPrefix + "_mul", Ac0_Ac1, c1, t2),
            c.call(f2mPrefix + "_sub", t2, b_b, t2),
        );
    }
    buildF6Mul1();

    function buildF6Mul01() {
        const f = module.addFunction(f6mPrefix+ "_mul01");
        f.addParam("pA", "i32");    // F6
        f.addParam("pC0", "i32");   // F2
        f.addParam("pC1", "i32");   // F2
        f.addParam("pR", "i32");    // F6

        const c = f.getCodeBuilder();

        const A_c0 = c.getLocal("pA");
        const A_c1 = c.i32_add(c.getLocal("pA"), c.i32_const(f1size*2));
        const A_c2 = c.i32_add(c.getLocal("pA"), c.i32_const(f1size*4));

        const c0  = c.getLocal("pC0");
        const c1  = c.getLocal("pC1");

        const t1 = c.getLocal("pR");
        const t2 = c.i32_add(c.getLocal("pR"), c.i32_const(f1size*2));
        const t3 = c.i32_add(c.getLocal("pR"), c.i32_const(f1size*4));

        const a_a = c.i32_const(module.alloc(f1size*2));
        const b_b = c.i32_const(module.alloc(f1size*2));
        const Ac0_Ac1 = c.i32_const(module.alloc(f1size*2));
        const Ac0_Ac2 = c.i32_const(module.alloc(f1size*2));

        f.addCode(
            // let a_a = self.c0 * c0;
            c.call(f2mPrefix + "_mul", A_c0, c0, a_a),

            // let b_b = self.c1 * c1;
            c.call(f2mPrefix + "_mul", A_c1, c1, b_b),


            c.call(f2mPrefix + "_add", A_c0, A_c1, Ac0_Ac1),
            c.call(f2mPrefix + "_add", A_c0, A_c2, Ac0_Ac2),

            // let t1 = (self.c1 + self.c2) * c1 - b_b;
            c.call(f2mPrefix + "_add", A_c1, A_c2, t1),
            c.call(f2mPrefix + "_mul", t1, c1, t1),
            c.call(f2mPrefix + "_sub", t1, b_b, t1),

            // let t1 = t1.mul_by_nonresidue() + a_a;
            c.call(f2mPrefix + "_mulNR", t1, t1),
            c.call(f2mPrefix + "_add", t1, a_a, t1),

            // let t2 = (c0 + c1) * (self.c0 + self.c1) - a_a - b_b;
            c.call(f2mPrefix + "_add", c0, c1, t2),
            c.call(f2mPrefix + "_mul", t2, Ac0_Ac1, t2),
            c.call(f2mPrefix + "_sub", t2, a_a, t2),
            c.call(f2mPrefix + "_sub", t2, b_b, t2),

            // let t3 = (self.c0 + self.c2) * c0 - a_a + b_b;
            c.call(f2mPrefix + "_mul", Ac0_Ac2, c0, t3),
            c.call(f2mPrefix + "_sub", t3, a_a, t3),
            c.call(f2mPrefix + "_add", t3, b_b, t3),


        );
    }
    buildF6Mul01();


    function buildF12Mul014() {

        const f = module.addFunction(ftmPrefix+ "_mul014");
        f.addParam("pA", "i32");    // F12
        f.addParam("pC0", "i32");   // F2
        f.addParam("pC1", "i32");   // F2
        f.addParam("pC4", "i32");   // F2
        f.addParam("pR", "i32");    // F12

        const c = f.getCodeBuilder();


        const A_c0 = c.getLocal("pA");
        const A_c1 = c.i32_add(c.getLocal("pA"), c.i32_const(f1size*6));

        const c0  = c.getLocal("pC0");
        const c1  = c.getLocal("pC1");
        const c4  = c.getLocal("pC4");

        const aa = c.i32_const(module.alloc(f1size*6));
        const bb = c.i32_const(module.alloc(f1size*6));
        const o = c.i32_const(module.alloc(f1size*2));

        const R_c0 = c.getLocal("pR");
        const R_c1 = c.i32_add(c.getLocal("pR"), c.i32_const(f1size*6));

        f.addCode(
            // let aa = self.c0.mul_by_01(c0, c1);
            c.call(f6mPrefix + "_mul01", A_c0, c0, c1, aa),

            // let bb = self.c1.mul_by_1(c4);
            c.call(f6mPrefix + "_mul1", A_c1, c4, bb),

            // let o = c1 + c4;
            c.call(f2mPrefix + "_add", c1, c4, o),

            // let c1 = self.c1 + self.c0;
            c.call(f6mPrefix + "_add", A_c1, A_c0, R_c1),

            // let c1 = c1.mul_by_01(c0, &o);
            c.call(f6mPrefix + "_mul01", R_c1, c0, o, R_c1),

            // let c1 = c1 - aa - bb;
            c.call(f6mPrefix + "_sub", R_c1, aa, R_c1),
            c.call(f6mPrefix + "_sub", R_c1, bb, R_c1),

            // let c0 = bb;
            c.call(f6mPrefix + "_copy", bb, R_c0),

            // let c0 = c0.mul_by_nonresidue();
            c.call(f6mPrefix + "_mulNR", R_c0, R_c0),

            // let c0 = c0 + aa;
            c.call(f6mPrefix + "_add", R_c0, aa, R_c0),
        );
    }
    buildF12Mul014();


    function buildELL() {
        const f = module.addFunction(prefix+ "_ell");
        f.addParam("pP", "i32");
        f.addParam("pCoefs", "i32");
        f.addParam("pF", "i32");

        const c = f.getCodeBuilder();

        const Px  = c.getLocal("pP");
        const Py  = c.i32_add(c.getLocal("pP"), c.i32_const(n8q));

        const F  = c.getLocal("pF");

        const coef0_0  = c.getLocal("pCoefs");
        const coef0_1  = c.i32_add(c.getLocal("pCoefs"), c.i32_const(f1size));
        const coef1_0  = c.i32_add(c.getLocal("pCoefs"), c.i32_const(f1size*2));
        const coef1_1  = c.i32_add(c.getLocal("pCoefs"), c.i32_const(f1size*3));
        const coef2  = c.i32_add(c.getLocal("pCoefs"), c.i32_const(f1size*4));

        const pc0 = module.alloc(f1size*2);
        const c0  = c.i32_const(pc0);
        const c0_c0 = c.i32_const(pc0);
        const c0_c1 = c.i32_const(pc0+f1size);

        const pc1 = module.alloc(f1size*2);
        const c1  = c.i32_const(pc1);
        const c1_c0 = c.i32_const(pc1);
        const c1_c1 = c.i32_const(pc1+f1size);
        f.addCode(
            //     let mut c0 = coeffs.0;
            //     let mut c1 = coeffs.1;
            //
            //    c0.c0 *= p.y;
            //    c0.c1 *= p.y;
            //
            //    c1.c0 *= p.x;
            //    c1.c1 *= p.x;
            //
            //     f.mul_by_014(&coeffs.2, &c1, &c0)

            c.call(f1mPrefix + "_mul", coef0_0, Py, c0_c0),
            c.call(f1mPrefix + "_mul", coef0_1, Py, c0_c1),
            c.call(f1mPrefix + "_mul", coef1_0, Px, c1_c0),
            c.call(f1mPrefix + "_mul", coef1_1, Px, c1_c1),

            c.call(ftmPrefix + "_mul014", F, coef2, c1, c0, F),

        );

    }
    buildELL();

    function buildMillerLoop() {
        const f = module.addFunction(prefix+ "_millerLoop");
        f.addParam("ppreP", "i32");
        f.addParam("ppreQ", "i32");
        f.addParam("r", "i32");
        f.addLocal("pCoef", "i32");
        f.addLocal("i", "i32");

        const c = f.getCodeBuilder();

        const preP = c.getLocal("ppreP");

        const coefs  = c.getLocal("pCoef");

        const F = c.getLocal("r");


        f.addCode(
            c.call(ftmPrefix + "_one", F),

            c.if(
                c.call(g1mPrefix + "_isZero", preP),
                c.ret([])
            ),
            c.if(
                c.call(g1mPrefix + "_isZero", c.getLocal("ppreQ")),
                c.ret([])
            ),
            c.setLocal("pCoef", c.i32_add( c.getLocal("ppreQ"), c.i32_const(f2size*3))),

            c.setLocal("i", c.i32_const(ateLoopBitBytes.length-2)),
            c.block(c.loop(


                c.call(prefix + "_ell", preP, coefs,  F),
                c.setLocal("pCoef", c.i32_add(c.getLocal("pCoef"), c.i32_const(ateCoefSize))),

                c.if(
                    c.i32_load8_s(c.getLocal("i"), pAteLoopBitBytes),
                    [
                        ...c.call(prefix + "_ell", preP, coefs,  F),
                        ...c.setLocal("pCoef", c.i32_add(c.getLocal("pCoef"), c.i32_const(ateCoefSize))),
                    ]
                ),
                c.call(ftmPrefix + "_square", F, F),

                c.br_if(1, c.i32_eq ( c.getLocal("i"), c.i32_const(1) )),
                c.setLocal("i", c.i32_sub(c.getLocal("i"), c.i32_const(1))),
                c.br(0)
            )),
            c.call(prefix + "_ell", preP, coefs,  F),

        );


        if (isLoopNegative) {
            f.addCode(
                c.call(ftmPrefix + "_conjugate", F, F),
            );
        }
    }


    function buildFrobeniusMap(n) {
        const F12 = [
            [
                [1n, 0n],
                [1n, 0n],
                [1n, 0n],
                [1n, 0n],
                [1n, 0n],
                [1n, 0n],
                [1n, 0n],
                [1n, 0n],
                [1n, 0n],
                [1n, 0n],
                [1n, 0n],
                [1n, 0n],
            ],
            [
                [1n, 0n],
                [3850754370037169011952147076051364057158807420970682438676050522613628423219637725072182697113062777891589506424760n, 151655185184498381465642749684540099398075398968325446656007613510403227271200139370504932015952886146304766135027n],
                [793479390729215512621379701633421447060886740281060493010456487427281649075476305620758731620351n, 0n],
                [2973677408986561043442465346520108879172042883009249989176415018091420807192182638567116318576472649347015917690530n, 1028732146235106349975324479215795277384839936929757896155643118032610843298655225875571310552543014690878354869257n],
                [793479390729215512621379701633421447060886740281060493010456487427281649075476305620758731620350n, 0n],
                [3125332594171059424908108096204648978570118281977575435832422631601824034463382777937621250592425535493320683825557n, 877076961050607968509681729531255177986764537961432449499635504522207616027455086505066378536590128544573588734230n],
                [4002409555221667393417789825735904156556882819939007885332058136124031650490837864442687629129015664037894272559786n, 0n],
                [151655185184498381465642749684540099398075398968325446656007613510403227271200139370504932015952886146304766135027n, 3850754370037169011952147076051364057158807420970682438676050522613628423219637725072182697113062777891589506424760n],
                [4002409555221667392624310435006688643935503118305586438271171395842971157480381377015405980053539358417135540939436n, 0n],
                [1028732146235106349975324479215795277384839936929757896155643118032610843298655225875571310552543014690878354869257n, 2973677408986561043442465346520108879172042883009249989176415018091420807192182638567116318576472649347015917690530n],
                [4002409555221667392624310435006688643935503118305586438271171395842971157480381377015405980053539358417135540939437n, 0n],
                [877076961050607968509681729531255177986764537961432449499635504522207616027455086505066378536590128544573588734230n, 3125332594171059424908108096204648978570118281977575435832422631601824034463382777937621250592425535493320683825557n],
            ]
        ];

        const F6 = [
            [
                [1n, 0n],
                [1n, 0n],
                [1n, 0n],
                [1n, 0n],
                [1n, 0n],
                [1n, 0n],
            ],
            [
                [1n, 0n],
                [0n, 4002409555221667392624310435006688643935503118305586438271171395842971157480381377015405980053539358417135540939436n],
                [793479390729215512621379701633421447060886740281060493010456487427281649075476305620758731620350n, 0n],
                [0n, 1n],
                [4002409555221667392624310435006688643935503118305586438271171395842971157480381377015405980053539358417135540939436n, 0n],
                [0n, 793479390729215512621379701633421447060886740281060493010456487427281649075476305620758731620350n],
            ],
            [
                [1n, 0n],
                [4002409555221667392624310435006688643935503118305586438271171395842971157480381377015405980053539358417135540939437n, 0n],
                [4002409555221667392624310435006688643935503118305586438271171395842971157480381377015405980053539358417135540939436n, 0n],
                [4002409555221667393417789825735904156556882819939007885332058136124031650490837864442687629129015664037894272559786n, 0n],
                [793479390729215512621379701633421447060886740281060493010456487427281649075476305620758731620350n, 0n],
                [793479390729215512621379701633421447060886740281060493010456487427281649075476305620758731620351n, 0n],
            ]
        ];

        const f = module.addFunction(ftmPrefix + "_frobeniusMap"+n);
        f.addParam("x", "i32");
        f.addParam("r", "i32");

        const c = f.getCodeBuilder();

        for (let i=0; i<6; i++) {
            const X = (i==0) ? c.getLocal("x") : c.i32_add(c.getLocal("x"), c.i32_const(i*f2size));
            const Xc0 = X;
            const Xc1 = c.i32_add(c.getLocal("x"), c.i32_const(i*f2size + f1size));
            const R = (i==0) ? c.getLocal("r") : c.i32_add(c.getLocal("r"), c.i32_const(i*f2size));
            const Rc0 = R;
            const Rc1 = c.i32_add(c.getLocal("r"), c.i32_const(i*f2size + f1size));
            const coef = mul2(F12[Math.floor(i/3)][n%12] , F6[i%3][n%6]);
            const pCoef = module.alloc([
                ...utils.bigInt2BytesLE(toMontgomery(coef[0]), n8q),
                ...utils.bigInt2BytesLE(toMontgomery(coef[1]), n8q),
            ]);
            if (n%2 == 1) {
                f.addCode(
                    c.call(f1mPrefix + "_copy", Xc0, Rc0),
                    c.call(f1mPrefix + "_neg", Xc1, Rc1),
                    c.call(f2mPrefix + "_mul", R, c.i32_const(pCoef), R),
                );
            } else {
                f.addCode(c.call(f2mPrefix + "_mul", X, c.i32_const(pCoef), R));
            }
        }

        function mul2(a, b) {
            const ac0 = a[0];
            const ac1 = a[1];
            const bc0 = b[0];
            const bc1 = b[1];
            const res = [
                (ac0 * bc0 - (ac1 * bc1)) % q,
                (ac0 * bc1 + (ac1 * bc0)) % q,
            ];
            if (isNegative(res[0])) res[0] = res[0] + q;
            return res;
        }

    }


    function buildCyclotomicSquare() {
        const f = module.addFunction(prefix+ "__cyclotomicSquare");
        f.addParam("x", "i32");
        f.addParam("r", "i32");

        const c = f.getCodeBuilder();

        const x0 = c.getLocal("x");
        const x4 = c.i32_add(c.getLocal("x"), c.i32_const(f2size));
        const x3 = c.i32_add(c.getLocal("x"), c.i32_const(2*f2size));
        const x2 = c.i32_add(c.getLocal("x"), c.i32_const(3*f2size));
        const x1 = c.i32_add(c.getLocal("x"), c.i32_const(4*f2size));
        const x5 = c.i32_add(c.getLocal("x"), c.i32_const(5*f2size));

        const r0 = c.getLocal("r");
        const r4 = c.i32_add(c.getLocal("r"), c.i32_const(f2size));
        const r3 = c.i32_add(c.getLocal("r"), c.i32_const(2*f2size));
        const r2 = c.i32_add(c.getLocal("r"), c.i32_const(3*f2size));
        const r1 = c.i32_add(c.getLocal("r"), c.i32_const(4*f2size));
        const r5 = c.i32_add(c.getLocal("r"), c.i32_const(5*f2size));

        const t0 = c.i32_const(module.alloc(f2size));
        const t1 = c.i32_const(module.alloc(f2size));
        const t2 = c.i32_const(module.alloc(f2size));
        const t3 = c.i32_const(module.alloc(f2size));
        const t4 = c.i32_const(module.alloc(f2size));
        const t5 = c.i32_const(module.alloc(f2size));
        const tmp = c.i32_const(module.alloc(f2size));
        const AUX = c.i32_const(module.alloc(f2size));


        f.addCode(
            //    // t0 + t1*y = (z0 + z1*y)^2 = a^2
            //    tmp = z0 * z1;
            //    t0 = (z0 + z1) * (z0 + my_Fp6::non_residue * z1) - tmp - my_Fp6::non_residue * tmp;
            //    t1 = tmp + tmp;
            c.call(f2mPrefix + "_mul", x0, x1, tmp),
            c.call(f2mPrefix + "_mulNR", x1, t0),
            c.call(f2mPrefix + "_add", x0, t0, t0),
            c.call(f2mPrefix + "_add", x0, x1, AUX),
            c.call(f2mPrefix + "_mul", AUX, t0, t0),
            c.call(f2mPrefix + "_mulNR", tmp, AUX),
            c.call(f2mPrefix + "_add", tmp, AUX, AUX),
            c.call(f2mPrefix + "_sub", t0, AUX, t0),
            c.call(f2mPrefix + "_add", tmp, tmp, t1),

            //  // t2 + t3*y = (z2 + z3*y)^2 = b^2
            //  tmp = z2 * z3;
            //  t2 = (z2 + z3) * (z2 + my_Fp6::non_residue * z3) - tmp - my_Fp6::non_residue * tmp;
            //  t3 = tmp + tmp;
            c.call(f2mPrefix + "_mul", x2, x3, tmp),
            c.call(f2mPrefix + "_mulNR", x3, t2),
            c.call(f2mPrefix + "_add", x2, t2, t2),
            c.call(f2mPrefix + "_add", x2, x3, AUX),
            c.call(f2mPrefix + "_mul", AUX, t2, t2),
            c.call(f2mPrefix + "_mulNR", tmp, AUX),
            c.call(f2mPrefix + "_add", tmp, AUX, AUX),
            c.call(f2mPrefix + "_sub", t2, AUX, t2),
            c.call(f2mPrefix + "_add", tmp, tmp, t3),

            //  // t4 + t5*y = (z4 + z5*y)^2 = c^2
            //  tmp = z4 * z5;
            //  t4 = (z4 + z5) * (z4 + my_Fp6::non_residue * z5) - tmp - my_Fp6::non_residue * tmp;
            //  t5 = tmp + tmp;
            c.call(f2mPrefix + "_mul", x4, x5, tmp),
            c.call(f2mPrefix + "_mulNR", x5, t4),
            c.call(f2mPrefix + "_add", x4, t4, t4),
            c.call(f2mPrefix + "_add", x4, x5, AUX),
            c.call(f2mPrefix + "_mul", AUX, t4, t4),
            c.call(f2mPrefix + "_mulNR", tmp, AUX),
            c.call(f2mPrefix + "_add", tmp, AUX, AUX),
            c.call(f2mPrefix + "_sub", t4, AUX, t4),
            c.call(f2mPrefix + "_add", tmp, tmp, t5),

            // For A
            // z0 = 3 * t0 - 2 * z0
            c.call(f2mPrefix + "_sub", t0, x0, r0),
            c.call(f2mPrefix + "_add", r0, r0, r0),
            c.call(f2mPrefix + "_add", t0, r0, r0),
            // z1 = 3 * t1 + 2 * z1
            c.call(f2mPrefix + "_add", t1, x1, r1),
            c.call(f2mPrefix + "_add", r1, r1, r1),
            c.call(f2mPrefix + "_add", t1, r1, r1),

            // For B
            // z2 = 3 * (xi * t5) + 2 * z2
            c.call(f2mPrefix + "_mul", t5, c.i32_const(pBls12381Twist), AUX),
            c.call(f2mPrefix + "_add", AUX, x2, r2),
            c.call(f2mPrefix + "_add", r2, r2, r2),
            c.call(f2mPrefix + "_add", AUX, r2, r2),
            // z3 = 3 * t4 - 2 * z3
            c.call(f2mPrefix + "_sub", t4, x3, r3),
            c.call(f2mPrefix + "_add", r3, r3, r3),
            c.call(f2mPrefix + "_add", t4, r3, r3),

            // For C
            // z4 = 3 * t2 - 2 * z4
            c.call(f2mPrefix + "_sub", t2, x4, r4),
            c.call(f2mPrefix + "_add", r4, r4, r4),
            c.call(f2mPrefix + "_add", t2, r4, r4),
            // z5 = 3 * t3 + 2 * z5
            c.call(f2mPrefix + "_add", t3, x5, r5),
            c.call(f2mPrefix + "_add", r5, r5, r5),
            c.call(f2mPrefix + "_add", t3, r5, r5),

        );
    }


    function buildCyclotomicExp(exponent, isExpNegative, fnName) {
        const exponentNafBytes = naf(exponent).map( (b) => (b==-1 ? 0xFF: b) );
        const pExponentNafBytes = module.alloc(exponentNafBytes);
        // const pExponent = module.alloc(utils.bigInt2BytesLE(exponent, n8));

        const f = module.addFunction(prefix+ "__cyclotomicExp_"+fnName);
        f.addParam("x", "i32");
        f.addParam("r", "i32");
        f.addLocal("bit", "i32");
        f.addLocal("i", "i32");

        const c = f.getCodeBuilder();

        const x = c.getLocal("x");

        const res = c.getLocal("r");

        const inverse = c.i32_const(module.alloc(ftsize));


        f.addCode(
            c.call(ftmPrefix + "_conjugate", x, inverse),
            c.call(ftmPrefix + "_one", res),

            c.if(
                c.teeLocal("bit", c.i32_load8_s(c.i32_const(exponentNafBytes.length-1), pExponentNafBytes)),
                c.if(
                    c.i32_eq(
                        c.getLocal("bit"),
                        c.i32_const(1)
                    ),
                    c.call(ftmPrefix + "_mul", res, x, res),
                    c.call(ftmPrefix + "_mul", res, inverse, res),
                )
            ),

            c.setLocal("i", c.i32_const(exponentNafBytes.length-2)),
            c.block(c.loop(
                c.call(prefix + "__cyclotomicSquare", res, res),
                c.if(
                    c.teeLocal("bit", c.i32_load8_s(c.getLocal("i"), pExponentNafBytes)),
                    c.if(
                        c.i32_eq(
                            c.getLocal("bit"),
                            c.i32_const(1)
                        ),
                        c.call(ftmPrefix + "_mul", res, x, res),
                        c.call(ftmPrefix + "_mul", res, inverse, res),
                    )
                ),
                c.br_if(1, c.i32_eqz ( c.getLocal("i") )),
                c.setLocal("i", c.i32_sub(c.getLocal("i"), c.i32_const(1))),
                c.br(0)
            ))
        );

        if (isExpNegative) {
            f.addCode(
                c.call(ftmPrefix + "_conjugate", res, res),
            );
        }

    }

    function buildFinalExponentiation() {
        buildCyclotomicSquare();
        buildCyclotomicExp(finalExpZ, finalExpIsNegative, "w0");

        const f = module.addFunction(prefix+ "_finalExponentiation");
        f.addParam("x", "i32");
        f.addParam("r", "i32");

        const c = f.getCodeBuilder();

        const elt = c.getLocal("x");
        const res = c.getLocal("r");
        const t0 = c.i32_const(module.alloc(ftsize));
        const t1 = c.i32_const(module.alloc(ftsize));
        const t2 = c.i32_const(module.alloc(ftsize));
        const t3 = c.i32_const(module.alloc(ftsize));
        const t4 = c.i32_const(module.alloc(ftsize));
        const t5 = c.i32_const(module.alloc(ftsize));
        const t6 = c.i32_const(module.alloc(ftsize));

        f.addCode(

            // let mut t0 = f.frobenius_map(6)
            c.call(ftmPrefix + "_frobeniusMap6", elt, t0),

            // let t1 = f.invert()
            c.call(ftmPrefix + "_inverse", elt, t1),

            // let mut t2 = t0 * t1;
            c.call(ftmPrefix + "_mul", t0, t1, t2),

            // t1 = t2.clone();
            c.call(ftmPrefix + "_copy", t2, t1),

            // t2 = t2.frobenius_map().frobenius_map();
            c.call(ftmPrefix + "_frobeniusMap2", t2, t2),

            // t2 *= t1;
            c.call(ftmPrefix + "_mul", t2, t1, t2),


            // t1 = cyclotomic_square(t2).conjugate();
            c.call(prefix + "__cyclotomicSquare", t2, t1),
            c.call(ftmPrefix + "_conjugate", t1, t1),

            // let mut t3 = cycolotomic_exp(t2);
            c.call(prefix + "__cyclotomicExp_w0", t2, t3),

            // let mut t4 = cyclotomic_square(t3);
            c.call(prefix + "__cyclotomicSquare", t3, t4),

            // let mut t5 = t1 * t3;
            c.call(ftmPrefix + "_mul", t1, t3, t5),

            // t1 = cycolotomic_exp(t5);
            c.call(prefix + "__cyclotomicExp_w0", t5, t1),

            // t0 = cycolotomic_exp(t1);
            c.call(prefix + "__cyclotomicExp_w0", t1, t0),

            // let mut t6 = cycolotomic_exp(t0);
            c.call(prefix + "__cyclotomicExp_w0", t0, t6),

            // t6 *= t4;
            c.call(ftmPrefix + "_mul", t6, t4, t6),

            // t4 = cycolotomic_exp(t6);
            c.call(prefix + "__cyclotomicExp_w0", t6, t4),

            // t5 = t5.conjugate();
            c.call(ftmPrefix + "_conjugate", t5, t5),

            // t4 *= t5 * t2;
            c.call(ftmPrefix + "_mul", t4, t5, t4),
            c.call(ftmPrefix + "_mul", t4, t2, t4),

            // t5 = t2.conjugate();
            c.call(ftmPrefix + "_conjugate", t2, t5),

            // t1 *= t2;
            c.call(ftmPrefix + "_mul", t1, t2, t1),

            // t1 = t1.frobenius_map().frobenius_map().frobenius_map();
            c.call(ftmPrefix + "_frobeniusMap3", t1, t1),

            // t6 *= t5;
            c.call(ftmPrefix + "_mul", t6, t5, t6),

            // t6 = t6.frobenius_map();
            c.call(ftmPrefix + "_frobeniusMap1", t6, t6),

            // t3 *= t0;
            c.call(ftmPrefix + "_mul", t3, t0, t3),

            // t3 = t3.frobenius_map().frobenius_map();
            c.call(ftmPrefix + "_frobeniusMap2", t3, t3),

            // t3 *= t1;
            c.call(ftmPrefix + "_mul", t3, t1, t3),

            // t3 *= t6;
            c.call(ftmPrefix + "_mul", t3, t6, t3),

            // f = t3 * t4;
            c.call(ftmPrefix + "_mul", t3, t4, res),

        );
    }


    function buildFinalExponentiationOld() {
        const f = module.addFunction(prefix+ "_finalExponentiationOld");
        f.addParam("x", "i32");
        f.addParam("r", "i32");

        const exponent = 322277361516934140462891564586510139908379969514828494218366688025288661041104682794998680497580008899973249814104447692778988208376779573819485263026159588510513834876303014016798809919343532899164848730280942609956670917565618115867287399623286813270357901731510188149934363360381614501334086825442271920079363289954510565375378443704372994881406797882676971082200626541916413184642520269678897559532260949334760604962086348898118982248842634379637598665468817769075878555493752214492790122785850202957575200176084204422751485957336465472324810982833638490904279282696134323072515220044451592646885410572234451732790590013479358343841220074174848221722017083597872017638514103174122784843925578370430843522959600095676285723737049438346544753168912974976791528535276317256904336520179281145394686565050419250614107803233314658825463117900250701199181529205942363159325765991819433914303908860460720581408201373164047773794825411011922305820065611121544561808414055302212057471395719432072209245600258134364584636810093520285711072578721435517884103526483832733289802426157301542744476740008494780363354305116978805620671467071400711358839553375340724899735460480144599782014906586543813292157922220645089192130209334926661588737007768565838519456601560804957985667880395221049249803753582637708560n;

        const pExponent = module.alloc(utils.bigInt2BytesLE( exponent, 544 ));

        const c = f.getCodeBuilder();

        f.addCode(
            c.call(ftmPrefix + "_exp", c.getLocal("x"), c.i32_const(pExponent), c.i32_const(544), c.getLocal("r")),
        );
    }


    const pPreP = module.alloc(prePSize);
    const pPreQ = module.alloc(preQSize);

    function buildPairingEquation(nPairings) {

        const f = module.addFunction(prefix+ "_pairingEq"+nPairings);
        for (let i=0; i<nPairings; i++) {
            f.addParam("p_"+i, "i32");
            f.addParam("q_"+i, "i32");
        }
        f.addParam("c", "i32");
        f.setReturnType("i32");


        const c = f.getCodeBuilder();

        const resT = c.i32_const(module.alloc(ftsize));
        const auxT = c.i32_const(module.alloc(ftsize));

        f.addCode(c.call(ftmPrefix + "_one", resT ));

        for (let i=0; i<nPairings; i++) {

            f.addCode(c.call(prefix + "_prepareG1", c.getLocal("p_"+i), c.i32_const(pPreP) ));
            f.addCode(c.call(prefix + "_prepareG2", c.getLocal("q_"+i), c.i32_const(pPreQ) ));

            // Checks
            f.addCode(
                c.if(
                    c.i32_eqz(c.call(g1mPrefix + "_inGroupAffine", c.i32_const(pPreP))),
                    c.ret(c.i32_const(0))
                ),
                c.if(
                    c.i32_eqz(c.call(g2mPrefix + "_inGroupAffine", c.i32_const(pPreQ))),
                    c.ret(c.i32_const(0))
                )
            );

            f.addCode(c.call(prefix + "_millerLoop", c.i32_const(pPreP), c.i32_const(pPreQ), auxT ));

            f.addCode(c.call(ftmPrefix + "_mul", resT, auxT, resT ));
        }

        f.addCode(c.call(prefix + "_finalExponentiation", resT, resT ));

        f.addCode(c.call(ftmPrefix + "_eq", resT, c.getLocal("c")));
    }


    function buildPairing() {

        const f = module.addFunction(prefix+ "_pairing");
        f.addParam("p", "i32");
        f.addParam("q", "i32");
        f.addParam("r", "i32");

        const c = f.getCodeBuilder();

        const resT = c.i32_const(module.alloc(ftsize));

        f.addCode(c.call(prefix + "_prepareG1", c.getLocal("p"), c.i32_const(pPreP) ));
        f.addCode(c.call(prefix + "_prepareG2", c.getLocal("q"), c.i32_const(pPreQ) ));
        f.addCode(c.call(prefix + "_millerLoop", c.i32_const(pPreP), c.i32_const(pPreQ), resT ));
        f.addCode(c.call(prefix + "_finalExponentiation", resT, c.getLocal("r") ));
    }


    function buildInGroupG2() {
        const f = module.addFunction(g2mPrefix+ "_inGroupAffine");
        f.addParam("p", "i32");
        f.setReturnType("i32");

        const c = f.getCodeBuilder();

        const WINV = [
            2001204777610833696708894912867952078278441409969503942666029068062015825245418932221343814564507832018947136279894n,
            2001204777610833696708894912867952078278441409969503942666029068062015825245418932221343814564507832018947136279893n
        ];

        const FROB2X = 4002409555221667392624310435006688643935503118305586438271171395842971157480381377015405980053539358417135540939436n;
        const FROB3Y = [
            2973677408986561043442465346520108879172042883009249989176415018091420807192182638567116318576472649347015917690530n,
            2973677408986561043442465346520108879172042883009249989176415018091420807192182638567116318576472649347015917690530n
        ];

        const wInv = c.i32_const(module.alloc([
            ...utils.bigInt2BytesLE(toMontgomery(WINV[0]), n8q),
            ...utils.bigInt2BytesLE(toMontgomery(WINV[1]), n8q),
        ]));

        const frob2X = c.i32_const(module.alloc(utils.bigInt2BytesLE(toMontgomery(FROB2X), n8q)));
        const frob3Y = c.i32_const(module.alloc([
            ...utils.bigInt2BytesLE(toMontgomery(FROB3Y[0]), n8q),
            ...utils.bigInt2BytesLE(toMontgomery(FROB3Y[1]), n8q),
        ]));

        const z = c.i32_const(module.alloc(utils.bigInt2BytesLE(finalExpZ, 8)));

        const px = c.getLocal("p");
        const py = c.i32_add(c.getLocal("p"), c.i32_const(f2size));

        const aux = c.i32_const(module.alloc(f1size));

        const x_winv = c.i32_const(module.alloc(f2size));
        const y_winv = c.i32_const(module.alloc(f2size));
        const pf2 = module.alloc(f2size*2);
        const f2 = c.i32_const(pf2);
        const f2x = c.i32_const(pf2);
        const f2x_c1 = c.i32_const(pf2);
        const f2x_c2 = c.i32_const(pf2+f1size);
        const f2y = c.i32_const(pf2+f2size);
        const f2y_c1 = c.i32_const(pf2+f2size);
        const f2y_c2 = c.i32_const(pf2+f2size+f1size);
        const pf3 = module.alloc(f2size*3);
        const f3 = c.i32_const(pf3);
        const f3x = c.i32_const(pf3);
        const f3x_c1 = c.i32_const(pf3);
        const f3x_c2 = c.i32_const(pf3+f1size);
        const f3y = c.i32_const(pf3+f2size);
        const f3y_c1 = c.i32_const(pf3+f2size);
        const f3y_c2 = c.i32_const(pf3+f2size+f1size);
        const f3z = c.i32_const(pf3+f2size*2);


        f.addCode(
            c.if(
                c.call(g2mPrefix + "_isZeroAffine", c.getLocal("p")),
                c.ret( c.i32_const(1)),
            ),
            c.if(
                c.i32_eqz(c.call(g2mPrefix + "_inCurveAffine", c.getLocal("p"))),
                c.ret( c.i32_const(0)),
            ),
            c.call(f2mPrefix + "_mul", px, wInv, x_winv),
            c.call(f2mPrefix + "_mul", py, wInv, y_winv),

            c.call(f2mPrefix + "_mul1", x_winv, frob2X, f2x),
            c.call(f2mPrefix + "_neg", y_winv, f2y),

            c.call(f2mPrefix + "_neg", x_winv, f3x),
            c.call(f2mPrefix + "_mul", y_winv, frob3Y, f3y),

            c.call(f1mPrefix + "_sub", f2x_c1, f2x_c2, aux),
            c.call(f1mPrefix + "_add", f2x_c1, f2x_c2, f2x_c2),
            c.call(f1mPrefix + "_copy", aux, f2x_c1),

            c.call(f1mPrefix + "_sub", f2y_c1, f2y_c2, aux),
            c.call(f1mPrefix + "_add", f2y_c1, f2y_c2, f2y_c2),
            c.call(f1mPrefix + "_copy", aux, f2y_c1),

            c.call(f1mPrefix + "_add", f3x_c1, f3x_c2, aux),
            c.call(f1mPrefix + "_sub", f3x_c1, f3x_c2, f3x_c2),
            c.call(f1mPrefix + "_copy", aux, f3x_c1),

            c.call(f1mPrefix + "_sub", f3y_c2, f3y_c1, aux),
            c.call(f1mPrefix + "_add", f3y_c1, f3y_c2, f3y_c2),
            c.call(f1mPrefix + "_copy", aux, f3y_c1),

            c.call(f2mPrefix + "_one", f3z),

            c.call(g2mPrefix + "_timesScalar", f3, z, c.i32_const(8), f3),
            c.call(g2mPrefix + "_addMixed", f3, f2, f3),

            c.ret(
                c.call(g2mPrefix + "_eqMixed", f3, c.getLocal("p"))
            )
        );

        const fInGroup = module.addFunction(g2mPrefix + "_inGroup");
        fInGroup.addParam("pIn", "i32");
        fInGroup.setReturnType("i32");

        const c2 = fInGroup.getCodeBuilder();

        const aux2 = c2.i32_const(module.alloc(f2size*2));

        fInGroup.addCode(
            c2.call(g2mPrefix + "_toAffine", c2.getLocal("pIn"), aux2),

            c2.ret(
                c2.call(g2mPrefix + "_inGroupAffine", aux2),
            )
        );

    }

    function buildInGroupG1() {
        const f = module.addFunction(g1mPrefix+ "_inGroupAffine");
        f.addParam("p", "i32");
        f.setReturnType("i32");

        const c = f.getCodeBuilder();

        const BETA = 4002409555221667392624310435006688643935503118305586438271171395842971157480381377015405980053539358417135540939436n;
        const BETA2 = 793479390729215512621379701633421447060886740281060493010456487427281649075476305620758731620350n;
        const Z2M1D3 = (finalExpZ * finalExpZ - 1n) / 3n;

        const beta = c.i32_const(module.alloc(utils.bigInt2BytesLE(toMontgomery(BETA), n8q)));
        const beta2 = c.i32_const(module.alloc(utils.bigInt2BytesLE(toMontgomery(BETA2), n8q)));

        const z2m1d3 = c.i32_const(module.alloc(utils.bigInt2BytesLE(Z2M1D3, 16)));


        const px = c.getLocal("p");
        const py = c.i32_add(c.getLocal("p"), c.i32_const(f1size));

        const psp = module.alloc(f1size*3);
        const sp = c.i32_const(psp);
        const spx = c.i32_const(psp);
        const spy = c.i32_const(psp+f1size);

        const ps2p = module.alloc(f1size*2);
        const s2p = c.i32_const(ps2p);
        const s2px = c.i32_const(ps2p);
        const s2py = c.i32_const(ps2p+f1size);

        f.addCode(
            c.if(
                c.call(g1mPrefix + "_isZeroAffine", c.getLocal("p")),
                c.ret( c.i32_const(1)),
            ),
            c.if(
                c.i32_eqz(c.call(g1mPrefix + "_inCurveAffine", c.getLocal("p"))),
                c.ret( c.i32_const(0)),
            ),

            c.call(f1mPrefix + "_mul", px, beta, spx),
            c.call(f1mPrefix + "_copy", py, spy),

            c.call(f1mPrefix + "_mul", px, beta2, s2px),
            c.call(f1mPrefix + "_copy", py, s2py),


            c.call(g1mPrefix + "_doubleAffine", sp, sp),
            c.call(g1mPrefix + "_subMixed", sp, c.getLocal("p"), sp),
            c.call(g1mPrefix + "_subMixed", sp, s2p, sp),

            c.call(g1mPrefix + "_timesScalar", sp, z2m1d3, c.i32_const(16), sp),

            c.ret(
                c.call(g1mPrefix + "_eqMixed", sp, s2p)
            )

        );

        const fInGroup = module.addFunction(g1mPrefix + "_inGroup");
        fInGroup.addParam("pIn", "i32");
        fInGroup.setReturnType("i32");

        const c2 = fInGroup.getCodeBuilder();

        const aux2 = c2.i32_const(module.alloc(f1size*2));

        fInGroup.addCode(
            c2.call(g1mPrefix + "_toAffine", c2.getLocal("pIn"), aux2),

            c2.ret(
                c2.call(g1mPrefix + "_inGroupAffine", aux2),
            )
        );
    }

    for (let i=0; i<10; i++) {
        buildFrobeniusMap(i);
        module.exportFunction(ftmPrefix + "_frobeniusMap"+i);
    }


    buildInGroupG1();
    buildInGroupG2();

    buildPrepAddStep();
    buildPrepDoubleStep();

    buildPrepareG1();
    buildPrepareG2();

    buildMillerLoop();

    buildFinalExponentiationOld();
    buildFinalExponentiation();

    for (let i=1; i<=5; i++) {
        buildPairingEquation(i);
        module.exportFunction(prefix + "_pairingEq"+i);
    }

    buildPairing();

    module.exportFunction(prefix + "_pairing");


    module.exportFunction(prefix + "_prepareG1");
    module.exportFunction(prefix + "_prepareG2");
    module.exportFunction(prefix + "_millerLoop");
    module.exportFunction(prefix + "_finalExponentiation");
    module.exportFunction(prefix + "_finalExponentiationOld");
    module.exportFunction(prefix + "__cyclotomicSquare");
    module.exportFunction(prefix + "__cyclotomicExp_w0");

    module.exportFunction(f6mPrefix + "_mul1");
    module.exportFunction(f6mPrefix + "_mul01");
    module.exportFunction(ftmPrefix + "_mul014");

    module.exportFunction(g1mPrefix + "_inGroupAffine");
    module.exportFunction(g1mPrefix + "_inGroup");
    module.exportFunction(g2mPrefix + "_inGroupAffine");
    module.exportFunction(g2mPrefix + "_inGroup");

    // console.log(module.functionIdxByName);
};



/***/ }),

/***/ 584:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const utils = __webpack_require__(333);

const buildF1m =__webpack_require__(75);
const buildF1 =__webpack_require__(138);
const buildF2m =__webpack_require__(420);
const buildF3m =__webpack_require__(173);
const buildCurve =__webpack_require__(904);
const buildFFT = __webpack_require__(292);
const buildPol = __webpack_require__(896);
const buildQAP = __webpack_require__(637);
const buildApplyKey = __webpack_require__(320);
const { bitLength, modInv, isOdd, isNegative } = __webpack_require__(409);

module.exports = function buildBN128(module, _prefix) {

    const prefix = _prefix || "bn128";

    if (module.modules[prefix]) return prefix;  // already builded

    const q = 21888242871839275222246405745257275088696311157297823662689037894645226208583n;
    const r = 21888242871839275222246405745257275088548364400416034343698204186575808495617n;


    const n64 = Math.floor((bitLength(q - 1n) - 1)/64) +1;
    const n8 = n64*8;
    const frsize = n8;
    const f1size = n8;
    const f2size = f1size * 2;
    const ftsize = f1size * 12;

    const pr = module.alloc(utils.bigInt2BytesLE( r, frsize ));

    const f1mPrefix = buildF1m(module, q, "f1m");
    buildF1(module, r, "fr", "frm");

    const pG1b = module.alloc(utils.bigInt2BytesLE( toMontgomery(3n), f1size ));
    const g1mPrefix = buildCurve(module, "g1m", "f1m", pG1b);

    buildFFT(module, "frm", "frm", "frm", "frm_mul");

    buildPol(module, "pol", "frm");
    buildQAP(module, "qap", "frm");

    const f2mPrefix = buildF2m(module, "f1m_neg", "f2m", "f1m");
    const pG2b = module.alloc([
        ...utils.bigInt2BytesLE( toMontgomery(19485874751759354771024239261021720505790618469301721065564631296452457478373n), f1size ),
        ...utils.bigInt2BytesLE( toMontgomery(266929791119991161246907387137283842545076965332900288569378510910307636690n), f1size )
    ]);
    const g2mPrefix = buildCurve(module, "g2m", "f2m", pG2b);


    function buildGTimesFr(fnName, opMul) {
        const f = module.addFunction(fnName);
        f.addParam("pG", "i32");
        f.addParam("pFr", "i32");
        f.addParam("pr", "i32");

        const c = f.getCodeBuilder();

        const AUX = c.i32_const(module.alloc(n8));

        f.addCode(
            c.call("frm_fromMontgomery", c.getLocal("pFr"), AUX),
            c.call(
                opMul,
                c.getLocal("pG"),
                AUX,
                c.i32_const(n8),
                c.getLocal("pr")
            )
        );

        module.exportFunction(fnName);
    }
    buildGTimesFr("g1m_timesFr", "g1m_timesScalar");
    buildFFT(module, "g1m", "g1m", "frm", "g1m_timesFr");

    buildGTimesFr("g2m_timesFr", "g2m_timesScalar");
    buildFFT(module, "g2m", "g2m", "frm", "g2m_timesFr");

    buildGTimesFr("g1m_timesFrAffine", "g1m_timesScalarAffine");
    buildGTimesFr("g2m_timesFrAffine", "g2m_timesScalarAffine");

    buildApplyKey(module, "frm_batchApplyKey", "fmr", "frm", n8, n8, n8, "frm_mul");
    buildApplyKey(module, "g1m_batchApplyKey", "g1m", "frm", n8*3, n8*3, n8, "g1m_timesFr");
    buildApplyKey(module, "g1m_batchApplyKeyMixed", "g1m", "frm", n8*2, n8*3, n8, "g1m_timesFrAffine");
    buildApplyKey(module, "g2m_batchApplyKey", "g2m", "frm", n8*2*3, n8*3*2, n8, "g2m_timesFr");
    buildApplyKey(module, "g2m_batchApplyKeyMixed", "g2m", "frm", n8*2*2, n8*3*2, n8, "g2m_timesFrAffine");

    function toMontgomery(a) {
        return BigInt(a) * ( 1n << BigInt(f1size*8)) % q;
    }

    const G1gen = [
        1n,
        2n,
        1n
    ];

    const pG1gen = module.alloc(
        [
            ...utils.bigInt2BytesLE( toMontgomery(G1gen[0]), f1size ),
            ...utils.bigInt2BytesLE( toMontgomery(G1gen[1]), f1size ),
            ...utils.bigInt2BytesLE( toMontgomery(G1gen[2]), f1size ),
        ]
    );

    const G1zero = [
        0n,
        1n,
        0n
    ];

    const pG1zero = module.alloc(
        [
            ...utils.bigInt2BytesLE( toMontgomery(G1zero[0]), f1size ),
            ...utils.bigInt2BytesLE( toMontgomery(G1zero[1]), f1size ),
            ...utils.bigInt2BytesLE( toMontgomery(G1zero[2]), f1size )
        ]
    );

    const G2gen = [
        [
            10857046999023057135944570762232829481370756359578518086990519993285655852781n,
            11559732032986387107991004021392285783925812861821192530917403151452391805634n,
        ],[
            8495653923123431417604973247489272438418190587263600148770280649306958101930n,
            4082367875863433681332203403145435568316851327593401208105741076214120093531n,
        ],[
            1n,
            0n,
        ]
    ];

    const pG2gen = module.alloc(
        [
            ...utils.bigInt2BytesLE( toMontgomery(G2gen[0][0]), f1size ),
            ...utils.bigInt2BytesLE( toMontgomery(G2gen[0][1]), f1size ),
            ...utils.bigInt2BytesLE( toMontgomery(G2gen[1][0]), f1size ),
            ...utils.bigInt2BytesLE( toMontgomery(G2gen[1][1]), f1size ),
            ...utils.bigInt2BytesLE( toMontgomery(G2gen[2][0]), f1size ),
            ...utils.bigInt2BytesLE( toMontgomery(G2gen[2][1]), f1size ),
        ]
    );

    const G2zero = [
        [
            0n,
            0n,
        ],[
            1n,
            0n,
        ],[
            0n,
            0n,
        ]
    ];

    const pG2zero = module.alloc(
        [
            ...utils.bigInt2BytesLE( toMontgomery(G2zero[0][0]), f1size ),
            ...utils.bigInt2BytesLE( toMontgomery(G2zero[0][1]), f1size ),
            ...utils.bigInt2BytesLE( toMontgomery(G2zero[1][0]), f1size ),
            ...utils.bigInt2BytesLE( toMontgomery(G2zero[1][1]), f1size ),
            ...utils.bigInt2BytesLE( toMontgomery(G2zero[2][0]), f1size ),
            ...utils.bigInt2BytesLE( toMontgomery(G2zero[2][1]), f1size ),
        ]
    );

    const pOneT = module.alloc([
        ...utils.bigInt2BytesLE( toMontgomery(1), f1size ),
        ...utils.bigInt2BytesLE( toMontgomery(0), f1size ),
        ...utils.bigInt2BytesLE( toMontgomery(0), f1size ),
        ...utils.bigInt2BytesLE( toMontgomery(0), f1size ),
        ...utils.bigInt2BytesLE( toMontgomery(0), f1size ),
        ...utils.bigInt2BytesLE( toMontgomery(0), f1size ),
        ...utils.bigInt2BytesLE( toMontgomery(0), f1size ),
        ...utils.bigInt2BytesLE( toMontgomery(0), f1size ),
        ...utils.bigInt2BytesLE( toMontgomery(0), f1size ),
        ...utils.bigInt2BytesLE( toMontgomery(0), f1size ),
        ...utils.bigInt2BytesLE( toMontgomery(0), f1size ),
        ...utils.bigInt2BytesLE( toMontgomery(0), f1size ),
    ]);

    const pNonResidueF6 = module.alloc([
        ...utils.bigInt2BytesLE( toMontgomery(9), f1size ),
        ...utils.bigInt2BytesLE( toMontgomery(1), f1size ),
    ]);

    const pTwoInv = module.alloc([
        ...utils.bigInt2BytesLE( toMontgomery(  modInv(2n, q)), f1size ),
        ...utils.bigInt2BytesLE( 0n, f1size )
    ]);

    const pAltBn128Twist = pNonResidueF6;

    const pTwistCoefB = module.alloc([
        ...utils.bigInt2BytesLE( toMontgomery(19485874751759354771024239261021720505790618469301721065564631296452457478373n), f1size ),
        ...utils.bigInt2BytesLE( toMontgomery(266929791119991161246907387137283842545076965332900288569378510910307636690n), f1size ),
    ]);

    function build_mulNR6() {
        const f = module.addFunction(prefix + "_mulNR6");
        f.addParam("x", "i32");
        f.addParam("pr", "i32");

        const c = f.getCodeBuilder();

        f.addCode(
            c.call(
                f2mPrefix + "_mul",
                c.i32_const(pNonResidueF6),
                c.getLocal("x"),
                c.getLocal("pr")
            )
        );
    }
    build_mulNR6();

    const f6mPrefix = buildF3m(module, prefix+"_mulNR6", "f6m", "f2m");

    function build_mulNR12() {
        const f = module.addFunction(prefix + "_mulNR12");
        f.addParam("x", "i32");
        f.addParam("pr", "i32");

        const c = f.getCodeBuilder();

        f.addCode(
            c.call(
                f2mPrefix + "_mul",
                c.i32_const(pNonResidueF6),
                c.i32_add(c.getLocal("x"), c.i32_const(n8*4)),
                c.getLocal("pr")
            ),
            c.call(
                f2mPrefix + "_copy",
                c.getLocal("x"),
                c.i32_add(c.getLocal("pr"), c.i32_const(n8*2)),
            ),
            c.call(
                f2mPrefix + "_copy",
                c.i32_add(c.getLocal("x"), c.i32_const(n8*2)),
                c.i32_add(c.getLocal("pr"), c.i32_const(n8*4)),
            )
        );
    }
    build_mulNR12();

    const ftmPrefix = buildF2m(module, prefix+"_mulNR12", "ftm", f6mPrefix);


    const ateLoopCount = 29793968203157093288n;
    const ateLoopBitBytes = bits(ateLoopCount);
    const pAteLoopBitBytes = module.alloc(ateLoopBitBytes);
    const isLoopNegative = false;

    const ateCoefSize = 3 * f2size;
    const ateNDblCoefs = ateLoopBitBytes.length-1;
    const ateNAddCoefs = ateLoopBitBytes.reduce((acc, b) =>  acc + ( b!=0 ? 1 : 0)   ,0);
    const ateNCoefs = ateNAddCoefs + ateNDblCoefs + 1;
    const prePSize = 3*2*n8;
    const preQSize = 3*n8*2 + ateNCoefs*ateCoefSize;
    const finalExpIsNegative = false;


    module.modules[prefix] = {
        n64: n64,
        pG1gen: pG1gen,
        pG1zero: pG1zero,
        pG1b: pG1b,
        pG2gen: pG2gen,
        pG2zero: pG2zero,
        pG2b: pG2b,
        pq: module.modules["f1m"].pq,
        pr: pr,
        pOneT: pOneT,
        prePSize: prePSize,
        preQSize: preQSize,
        r: r.toString(),
        q: q.toString()
    };

    // console.log("PrePSize: " +prePSize);
    // console.log("PreQSize: " +preQSize);

    const finalExpZ = 4965661367192848881n;

    function naf(n) {
        let E = n;
        const res = [];
        while (E > 0n) {
            if (isOdd(E)) {
                const z = 2 - Number(E % 4n);
                res.push( z );
                E = E - BigInt(z);
            } else {
                res.push( 0 );
            }
            E = E >> 1n;
        }
        return res;
    }

    function bits(n) {
        let E = n;
        const res = [];
        while (E > 0n) {
            if (isOdd(E)) {
                res.push( 1 );
            } else {
                res.push( 0 );
            }
            E = E >> 1n;
        }
        return res;
    }

    function buildPrepareG1() {
        const f = module.addFunction(prefix+ "_prepareG1");
        f.addParam("pP", "i32");
        f.addParam("ppreP", "i32");

        const c = f.getCodeBuilder();

        f.addCode(
            c.call(g1mPrefix + "_normalize", c.getLocal("pP"), c.getLocal("ppreP")),  // TODO Remove if already in affine
        );
    }

    function buildPrepAddStep() {
        const f = module.addFunction(prefix+ "_prepAddStep");
        f.addParam("pQ", "i32");
        f.addParam("pR", "i32");
        f.addParam("pCoef", "i32");

        const c = f.getCodeBuilder();

        const X2  = c.getLocal("pQ");
        const Y2  = c.i32_add(c.getLocal("pQ"), c.i32_const(f2size));

        const X1  = c.getLocal("pR");
        const Y1  = c.i32_add(c.getLocal("pR"), c.i32_const(f2size));
        const Z1  = c.i32_add(c.getLocal("pR"), c.i32_const(2*f2size));

        const ELL_0  = c.getLocal("pCoef");
        const ELL_VW = c.i32_add(c.getLocal("pCoef"), c.i32_const(f2size));
        const ELL_VV  = c.i32_add(c.getLocal("pCoef"), c.i32_const(2*f2size));

        const D = ELL_VW;
        const E = c.i32_const(module.alloc(f2size));
        const F = c.i32_const(module.alloc(f2size));
        const G = c.i32_const(module.alloc(f2size));
        const H = c.i32_const(module.alloc(f2size));
        const I = c.i32_const(module.alloc(f2size));
        const J = c.i32_const(module.alloc(f2size));
        const AUX = c.i32_const(module.alloc(f2size));

        f.addCode(
            // D = X1 - X2*Z1
            c.call(f2mPrefix + "_mul", X2, Z1, D),
            c.call(f2mPrefix + "_sub", X1, D, D),

            // E = Y1 - Y2*Z1
            c.call(f2mPrefix + "_mul", Y2, Z1, E),
            c.call(f2mPrefix + "_sub", Y1, E, E),

            // F = D^2
            c.call(f2mPrefix + "_square", D, F),

            // G = E^2
            c.call(f2mPrefix + "_square", E, G),

            // H = D*F
            c.call(f2mPrefix + "_mul", D, F, H),

            // I = X1 * F
            c.call(f2mPrefix + "_mul", X1, F, I),

            // J = H + Z1*G - (I+I)
            c.call(f2mPrefix + "_add", I, I, AUX),
            c.call(f2mPrefix + "_mul", Z1, G, J),
            c.call(f2mPrefix + "_add", H, J, J),
            c.call(f2mPrefix + "_sub", J, AUX, J),


            // X3 (X1) = D*J
            c.call(f2mPrefix + "_mul", D, J, X1),

            // Y3 (Y1) = E*(I-J)-(H*Y1)
            c.call(f2mPrefix + "_mul", H, Y1, Y1),
            c.call(f2mPrefix + "_sub", I, J, AUX),
            c.call(f2mPrefix + "_mul", E, AUX, AUX),
            c.call(f2mPrefix + "_sub", AUX, Y1, Y1),

            // Z3 (Z1) = Z1*H
            c.call(f2mPrefix + "_mul", Z1, H, Z1),

            // ell_0 = xi * (E * X2 - D * Y2)
            c.call(f2mPrefix + "_mul", D, Y2, AUX),
            c.call(f2mPrefix + "_mul", E, X2, ELL_0),
            c.call(f2mPrefix + "_sub", ELL_0, AUX, ELL_0),
            c.call(f2mPrefix + "_mul", ELL_0, c.i32_const(pAltBn128Twist), ELL_0),


            // ell_VV = - E (later: * xP)
            c.call(f2mPrefix + "_neg", E, ELL_VV),

            // ell_VW = D (later: * yP    )
            // Already assigned

        );
    }



    function buildPrepDoubleStep() {
        const f = module.addFunction(prefix+ "_prepDblStep");
        f.addParam("pR", "i32");
        f.addParam("pCoef", "i32");

        const c = f.getCodeBuilder();

        const X1  = c.getLocal("pR");
        const Y1  = c.i32_add(c.getLocal("pR"), c.i32_const(f2size));
        const Z1  = c.i32_add(c.getLocal("pR"), c.i32_const(2*f2size));

        const ELL_0  = c.getLocal("pCoef");
        const ELL_VW = c.i32_add(c.getLocal("pCoef"), c.i32_const(f2size));
        const ELL_VV  = c.i32_add(c.getLocal("pCoef"), c.i32_const(2*f2size));

        const A = c.i32_const(module.alloc(f2size));
        const B = c.i32_const(module.alloc(f2size));
        const C = c.i32_const(module.alloc(f2size));
        const D = c.i32_const(module.alloc(f2size));
        const E = c.i32_const(module.alloc(f2size));
        const F = c.i32_const(module.alloc(f2size));
        const G = c.i32_const(module.alloc(f2size));
        const H = c.i32_const(module.alloc(f2size));
        const I = c.i32_const(module.alloc(f2size));
        const J = c.i32_const(module.alloc(f2size));
        const E2 = c.i32_const(module.alloc(f2size));
        const AUX = c.i32_const(module.alloc(f2size));

        f.addCode(

            // A = X1 * Y1 / 2
            c.call(f2mPrefix + "_mul", Y1, c.i32_const(pTwoInv), A),
            c.call(f2mPrefix + "_mul", X1, A, A),

            // B = Y1^2
            c.call(f2mPrefix + "_square", Y1, B),

            // C = Z1^2
            c.call(f2mPrefix + "_square", Z1, C),

            // D = 3 * C
            c.call(f2mPrefix + "_add", C, C, D),
            c.call(f2mPrefix + "_add", D, C, D),

            // E = twist_b * D
            c.call(f2mPrefix + "_mul", c.i32_const(pTwistCoefB), D, E),

            // F = 3 * E
            c.call(f2mPrefix + "_add", E, E, F),
            c.call(f2mPrefix + "_add", E, F, F),

            // G = (B+F)/2
            c.call(f2mPrefix + "_add", B, F, G),
            c.call(f2mPrefix + "_mul", G, c.i32_const(pTwoInv), G),

            // H = (Y1+Z1)^2-(B+C)
            c.call(f2mPrefix + "_add", B, C, AUX),
            c.call(f2mPrefix + "_add", Y1, Z1, H),
            c.call(f2mPrefix + "_square", H, H),
            c.call(f2mPrefix + "_sub", H, AUX, H),

            // I = E-B
            c.call(f2mPrefix + "_sub", E, B, I),

            // J = X1^2
            c.call(f2mPrefix + "_square", X1, J),

            // E_squared = E^2
            c.call(f2mPrefix + "_square", E, E2),

            // X3 (X1) = A * (B-F)
            c.call(f2mPrefix + "_sub", B, F, AUX),
            c.call(f2mPrefix + "_mul", A, AUX, X1),

            // Y3 (Y1) = G^2 - 3*E^2
            c.call(f2mPrefix + "_add", E2, E2, AUX),
            c.call(f2mPrefix + "_add", E2, AUX, AUX),
            c.call(f2mPrefix + "_square", G, Y1),
            c.call(f2mPrefix + "_sub", Y1, AUX, Y1),

            // Z3 (Z1) = B * H
            c.call(f2mPrefix + "_mul", B, H, Z1),

            // ell_0 = xi * I
            c.call(f2mPrefix + "_mul", c.i32_const(pAltBn128Twist), I, ELL_0),

            // ell_VW = - H (later: * yP)
            c.call(f2mPrefix + "_neg", H, ELL_VW),

            // ell_VV = 3*J (later: * xP)
            c.call(f2mPrefix + "_add", J, J, ELL_VV),
            c.call(f2mPrefix + "_add", J, ELL_VV, ELL_VV),

        );
    }

    function buildMulByQ() {
        const f = module.addFunction(prefix + "_mulByQ");
        f.addParam("p1", "i32");
        f.addParam("pr", "i32");

        const c = f.getCodeBuilder();

        const x = c.getLocal("p1");
        const y = c.i32_add(c.getLocal("p1"), c.i32_const(f2size));
        const z = c.i32_add(c.getLocal("p1"), c.i32_const(f2size*2));
        const x3 = c.getLocal("pr");
        const y3 = c.i32_add(c.getLocal("pr"), c.i32_const(f2size));
        const z3 = c.i32_add(c.getLocal("pr"), c.i32_const(f2size*2));

        const MulByQX = c.i32_const(module.alloc([
            ...utils.bigInt2BytesLE( toMontgomery("21575463638280843010398324269430826099269044274347216827212613867836435027261"), f1size ),
            ...utils.bigInt2BytesLE( toMontgomery("10307601595873709700152284273816112264069230130616436755625194854815875713954"), f1size ),
        ]));

        const MulByQY = c.i32_const(module.alloc([
            ...utils.bigInt2BytesLE( toMontgomery("2821565182194536844548159561693502659359617185244120367078079554186484126554"), f1size ),
            ...utils.bigInt2BytesLE( toMontgomery("3505843767911556378687030309984248845540243509899259641013678093033130930403"), f1size ),
        ]));

        f.addCode(
            // The frobeniusMap(1) in this field, is the conjugate
            c.call(f2mPrefix + "_conjugate", x, x3),
            c.call(f2mPrefix + "_mul", MulByQX, x3, x3),
            c.call(f2mPrefix + "_conjugate", y, y3),
            c.call(f2mPrefix + "_mul", MulByQY, y3, y3),
            c.call(f2mPrefix + "_conjugate", z, z3),
        );
    }


    function buildPrepareG2() {
        buildMulByQ();
        const f = module.addFunction(prefix+ "_prepareG2");
        f.addParam("pQ", "i32");
        f.addParam("ppreQ", "i32");
        f.addLocal("pCoef", "i32");
        f.addLocal("i", "i32");

        const c = f.getCodeBuilder();

        const QX = c.getLocal("pQ");

        const pR = module.alloc(f2size*3);
        const R = c.i32_const(pR);
        const RX = c.i32_const(pR);
        const RY = c.i32_const(pR+f2size);
        const RZ = c.i32_const(pR+2*f2size);

        const cQX = c.i32_add( c.getLocal("ppreQ"), c.i32_const(0));
        const cQY = c.i32_add( c.getLocal("ppreQ"), c.i32_const(f2size));

        const pQ1 = module.alloc(f2size*3);
        const Q1 = c.i32_const(pQ1);

        const pQ2 = module.alloc(f2size*3);
        const Q2 = c.i32_const(pQ2);
        const Q2Y = c.i32_const(pQ2 + f2size);

        f.addCode(
            c.call(g2mPrefix + "_normalize", QX, cQX),  // TODO Remove if already in affine
            c.call(f2mPrefix + "_copy", cQX, RX),
            c.call(f2mPrefix + "_copy", cQY, RY),
            c.call(f2mPrefix + "_one", RZ),
        );

        f.addCode(
            c.setLocal("pCoef", c.i32_add( c.getLocal("ppreQ"), c.i32_const(f2size*3))),
            c.setLocal("i", c.i32_const(ateLoopBitBytes.length-2)),
            c.block(c.loop(

                c.call(prefix + "_prepDblStep", R, c.getLocal("pCoef")),
                c.setLocal("pCoef", c.i32_add(c.getLocal("pCoef"), c.i32_const(ateCoefSize))),

                c.if(
                    c.i32_load8_s(c.getLocal("i"), pAteLoopBitBytes),
                    [
                        ...c.call(prefix + "_prepAddStep", cQX, R, c.getLocal("pCoef")),
                        ...c.setLocal("pCoef", c.i32_add(c.getLocal("pCoef"), c.i32_const(ateCoefSize))),
                    ]
                ),
                c.br_if(1, c.i32_eqz ( c.getLocal("i") )),
                c.setLocal("i", c.i32_sub(c.getLocal("i"), c.i32_const(1))),
                c.br(0)
            ))
        );

        f.addCode(
            c.call(prefix + "_mulByQ", cQX, Q1),
            c.call(prefix + "_mulByQ", Q1, Q2)
        );

        if (isLoopNegative) {
            f.addCode(
                c.call(f2mPrefix + "_neg", RY, RY),
            );
        }

        f.addCode(
            c.call(f2mPrefix + "_neg", Q2Y, Q2Y),

            c.call(prefix + "_prepAddStep", Q1, R, c.getLocal("pCoef")),
            c.setLocal("pCoef", c.i32_add(c.getLocal("pCoef"), c.i32_const(ateCoefSize))),

            c.call(prefix + "_prepAddStep", Q2, R, c.getLocal("pCoef")),
            c.setLocal("pCoef", c.i32_add(c.getLocal("pCoef"), c.i32_const(ateCoefSize))),
        );
    }

    function buildMulBy024Old() {
        const f = module.addFunction(prefix+ "__mulBy024Old");
        f.addParam("pEll0", "i32");
        f.addParam("pEllVW", "i32");
        f.addParam("pEllVV", "i32");
        f.addParam("pR", "i32");            // Result in F12

        const c = f.getCodeBuilder();

        const x0  = c.getLocal("pEll0");
        const x2  = c.getLocal("pEllVV");
        const x4  = c.getLocal("pEllVW");

        const z0  = c.getLocal("pR");

        const pAUX12 = module.alloc(ftsize);
        const AUX12 = c.i32_const(pAUX12);
        const AUX12_0 = c.i32_const(pAUX12);
        const AUX12_2 = c.i32_const(pAUX12+f2size);
        const AUX12_4 = c.i32_const(pAUX12+f2size*2);
        const AUX12_6 = c.i32_const(pAUX12+f2size*3);
        const AUX12_8 = c.i32_const(pAUX12+f2size*4);
        const AUX12_10 = c.i32_const(pAUX12+f2size*5);

        f.addCode(

            c.call(f2mPrefix + "_copy", x0, AUX12_0),
            c.call(f2mPrefix + "_zero", AUX12_2),
            c.call(f2mPrefix + "_copy", x2, AUX12_4),
            c.call(f2mPrefix + "_zero", AUX12_6),
            c.call(f2mPrefix + "_copy", x4, AUX12_8),
            c.call(f2mPrefix + "_zero", AUX12_10),
            c.call(ftmPrefix + "_mul", AUX12, z0, z0),
        );
    }

    function buildMulBy024() {
        const f = module.addFunction(prefix+ "__mulBy024");
        f.addParam("pEll0", "i32");
        f.addParam("pEllVW", "i32");
        f.addParam("pEllVV", "i32");
        f.addParam("pR", "i32");            // Result in F12

        const c = f.getCodeBuilder();

        const x0  = c.getLocal("pEll0");
        const x2  = c.getLocal("pEllVV");
        const x4  = c.getLocal("pEllVW");

        const z0  = c.getLocal("pR");
        const z1  = c.i32_add(c.getLocal("pR"), c.i32_const(2*n8));
        const z2  = c.i32_add(c.getLocal("pR"), c.i32_const(4*n8));
        const z3  = c.i32_add(c.getLocal("pR"), c.i32_const(6*n8));
        const z4  = c.i32_add(c.getLocal("pR"), c.i32_const(8*n8));
        const z5  = c.i32_add(c.getLocal("pR"), c.i32_const(10*n8));

        const t0 = c.i32_const(module.alloc(f2size));
        const t1 = c.i32_const(module.alloc(f2size));
        const t2 = c.i32_const(module.alloc(f2size));
        const s0 = c.i32_const(module.alloc(f2size));
        const T3 = c.i32_const(module.alloc(f2size));
        const T4 = c.i32_const(module.alloc(f2size));
        const D0 = c.i32_const(module.alloc(f2size));
        const D2 = c.i32_const(module.alloc(f2size));
        const D4 = c.i32_const(module.alloc(f2size));
        const S1 = c.i32_const(module.alloc(f2size));
        const AUX = c.i32_const(module.alloc(f2size));

        f.addCode(

            // D0 = z0 * x0;
            c.call(f2mPrefix + "_mul", z0, x0, D0),
            // D2 = z2 * x2;
            c.call(f2mPrefix + "_mul", z2, x2, D2),
            // D4 = z4 * x4;
            c.call(f2mPrefix + "_mul", z4, x4, D4),
            // t2 = z0 + z4;
            c.call(f2mPrefix + "_add", z0, z4, t2),
            // t1 = z0 + z2;
            c.call(f2mPrefix + "_add", z0, z2, t1),
            // s0 = z1 + z3 + z5;
            c.call(f2mPrefix + "_add", z1, z3, s0),
            c.call(f2mPrefix + "_add", s0, z5, s0),


            // For z.a_.a_ = z0.
            // S1 = z1 * x2;
            c.call(f2mPrefix + "_mul", z1, x2, S1),
            // T3 = S1 + D4;
            c.call(f2mPrefix + "_add", S1, D4, T3),
            // T4 = my_Fp6::non_residue * T3 + D0;
            c.call(f2mPrefix + "_mul", c.i32_const(pNonResidueF6), T3, T4),
            c.call(f2mPrefix + "_add", T4, D0, z0),
            // z0 = T4;

            // For z.a_.b_ = z1
            // T3 = z5 * x4;
            c.call(f2mPrefix + "_mul", z5, x4, T3),
            // S1 = S1 + T3;
            c.call(f2mPrefix + "_add", S1, T3, S1),
            // T3 = T3 + D2;
            c.call(f2mPrefix + "_add", T3, D2, T3),
            // T4 = my_Fp6::non_residue * T3;
            c.call(f2mPrefix + "_mul", c.i32_const(pNonResidueF6), T3, T4),
            // T3 = z1 * x0;
            c.call(f2mPrefix + "_mul", z1, x0, T3),
            // S1 = S1 + T3;
            c.call(f2mPrefix + "_add", S1, T3, S1),
            // T4 = T4 + T3;
            c.call(f2mPrefix + "_add", T4, T3, z1),
            // z1 = T4;



            // For z.a_.c_ = z2
            // t0 = x0 + x2;
            c.call(f2mPrefix + "_add", x0, x2, t0),
            // T3 = t1 * t0 - D0 - D2;
            c.call(f2mPrefix + "_mul", t1, t0, T3),
            c.call(f2mPrefix + "_add", D0, D2, AUX),
            c.call(f2mPrefix + "_sub", T3, AUX, T3),
            // T4 = z3 * x4;
            c.call(f2mPrefix + "_mul", z3, x4, T4),
            // S1 = S1 + T4;
            c.call(f2mPrefix + "_add", S1, T4, S1),


            // For z.b_.a_ = z3 (z3 needs z2)
            // t0 = z2 + z4;
            c.call(f2mPrefix + "_add", z2, z4, t0),
            // T3 = T3 + T4;
            // z2 = T3;
            c.call(f2mPrefix + "_add", T3, T4, z2),
            // t1 = x2 + x4;
            c.call(f2mPrefix + "_add", x2, x4, t1),
            // T3 = t0 * t1 - D2 - D4;
            c.call(f2mPrefix + "_mul", t1, t0, T3),
            c.call(f2mPrefix + "_add", D2, D4, AUX),
            c.call(f2mPrefix + "_sub", T3, AUX, T3),
            // T4 = my_Fp6::non_residue * T3;
            c.call(f2mPrefix + "_mul", c.i32_const(pNonResidueF6), T3, T4),
            // T3 = z3 * x0;
            c.call(f2mPrefix + "_mul", z3, x0, T3),
            // S1 = S1 + T3;
            c.call(f2mPrefix + "_add", S1, T3, S1),
            // T4 = T4 + T3;
            c.call(f2mPrefix + "_add", T4, T3, z3),
            // z3 = T4;

            // For z.b_.b_ = z4
            // T3 = z5 * x2;
            c.call(f2mPrefix + "_mul", z5, x2, T3),
            // S1 = S1 + T3;
            c.call(f2mPrefix + "_add", S1, T3, S1),
            // T4 = my_Fp6::non_residue * T3;
            c.call(f2mPrefix + "_mul", c.i32_const(pNonResidueF6), T3, T4),
            // t0 = x0 + x4;
            c.call(f2mPrefix + "_add", x0, x4, t0),
            // T3 = t2 * t0 - D0 - D4;
            c.call(f2mPrefix + "_mul", t2, t0, T3),
            c.call(f2mPrefix + "_add", D0, D4, AUX),
            c.call(f2mPrefix + "_sub", T3, AUX, T3),
            // T4 = T4 + T3;
            c.call(f2mPrefix + "_add", T4, T3, z4),
            // z4 = T4;

            // For z.b_.c_ = z5.
            // t0 = x0 + x2 + x4;
            c.call(f2mPrefix + "_add", x0, x2, t0),
            c.call(f2mPrefix + "_add", t0, x4, t0),
            // T3 = s0 * t0 - S1;
            c.call(f2mPrefix + "_mul", s0, t0, T3),
            c.call(f2mPrefix + "_sub", T3, S1, z5),
            // z5 = T3;

        );
    }


    function buildMillerLoop() {
        const f = module.addFunction(prefix+ "_millerLoop");
        f.addParam("ppreP", "i32");
        f.addParam("ppreQ", "i32");
        f.addParam("r", "i32");
        f.addLocal("pCoef", "i32");
        f.addLocal("i", "i32");

        const c = f.getCodeBuilder();

        const preP_PX = c.getLocal("ppreP");
        const preP_PY = c.i32_add(c.getLocal("ppreP"), c.i32_const(f1size));

        const ELL_0  = c.getLocal("pCoef");
        const ELL_VW = c.i32_add(c.getLocal("pCoef"), c.i32_const(f2size));
        const ELL_VV  = c.i32_add(c.getLocal("pCoef"), c.i32_const(2*f2size));


        const pVW = module.alloc(f2size);
        const VW = c.i32_const(pVW);
        const pVV = module.alloc(f2size);
        const VV = c.i32_const(pVV);

        const F = c.getLocal("r");


        f.addCode(
            c.call(ftmPrefix + "_one", F),

            c.setLocal("pCoef", c.i32_add( c.getLocal("ppreQ"), c.i32_const(f2size*3))),

            c.setLocal("i", c.i32_const(ateLoopBitBytes.length-2)),
            c.block(c.loop(


                c.call(ftmPrefix + "_square", F, F),

                c.call(f2mPrefix + "_mul1", ELL_VW,preP_PY, VW),
                c.call(f2mPrefix + "_mul1", ELL_VV, preP_PX, VV),
                c.call(prefix + "__mulBy024", ELL_0, VW, VV, F),
                c.setLocal("pCoef", c.i32_add(c.getLocal("pCoef"), c.i32_const(ateCoefSize))),

                c.if(
                    c.i32_load8_s(c.getLocal("i"), pAteLoopBitBytes),
                    [
                        ...c.call(f2mPrefix + "_mul1", ELL_VW, preP_PY, VW),
                        ...c.call(f2mPrefix + "_mul1", ELL_VV, preP_PX, VV),

                        ...c.call(prefix + "__mulBy024", ELL_0, VW, VV, F),
                        ...c.setLocal("pCoef", c.i32_add(c.getLocal("pCoef"), c.i32_const(ateCoefSize))),

                    ]
                ),
                c.br_if(1, c.i32_eqz ( c.getLocal("i") )),
                c.setLocal("i", c.i32_sub(c.getLocal("i"), c.i32_const(1))),
                c.br(0)
            ))

        );

        if (isLoopNegative) {
            f.addCode(
                c.call(ftmPrefix + "_inverse", F, F),
            );
        }

        f.addCode(
            c.call(f2mPrefix + "_mul1", ELL_VW, preP_PY, VW),
            c.call(f2mPrefix + "_mul1", ELL_VV, preP_PX, VV),
            c.call(prefix + "__mulBy024", ELL_0, VW, VV, F),
            c.setLocal("pCoef", c.i32_add(c.getLocal("pCoef"), c.i32_const(ateCoefSize))),

            c.call(f2mPrefix + "_mul1", ELL_VW, preP_PY, VW),
            c.call(f2mPrefix + "_mul1", ELL_VV, preP_PX, VV),
            c.call(prefix + "__mulBy024", ELL_0, VW, VV, F),
            c.setLocal("pCoef", c.i32_add(c.getLocal("pCoef"), c.i32_const(ateCoefSize))),

        );

    }


    function buildFrobeniusMap(n) {
        const F12 = [
            [
                [1n, 0n],
                [1n, 0n],
                [1n, 0n],
                [1n, 0n],
                [1n, 0n],
                [1n, 0n],
                [1n, 0n],
                [1n, 0n],
                [1n, 0n],
                [1n, 0n],
                [1n, 0n],
                [1n, 0n],
            ],
            [
                [1n, 0n],
                [8376118865763821496583973867626364092589906065868298776909617916018768340080n, 16469823323077808223889137241176536799009286646108169935659301613961712198316n],
                [21888242871839275220042445260109153167277707414472061641714758635765020556617n, 0n],
                [11697423496358154304825782922584725312912383441159505038794027105778954184319n, 303847389135065887422783454877609941456349188919719272345083954437860409601n],
                [21888242871839275220042445260109153167277707414472061641714758635765020556616n, 0n],
                [3321304630594332808241809054958361220322477375291206261884409189760185844239n, 5722266937896532885780051958958348231143373700109372999374820235121374419868n],
                [21888242871839275222246405745257275088696311157297823662689037894645226208582n, 0n],
                [13512124006075453725662431877630910996106405091429524885779419978626457868503n, 5418419548761466998357268504080738289687024511189653727029736280683514010267n],
                [2203960485148121921418603742825762020974279258880205651966n, 0n],
                [10190819375481120917420622822672549775783927716138318623895010788866272024264n, 21584395482704209334823622290379665147239961968378104390343953940207365798982n],
                [2203960485148121921418603742825762020974279258880205651967n, 0n],
                [18566938241244942414004596690298913868373833782006617400804628704885040364344n, 16165975933942742336466353786298926857552937457188450663314217659523851788715n],
            ]
        ];

        const F6 = [
            [
                [1n, 0n],
                [1n, 0n],
                [1n, 0n],
                [1n, 0n],
                [1n, 0n],
                [1n, 0n],
            ],
            [
                [1n, 0n],
                [21575463638280843010398324269430826099269044274347216827212613867836435027261n, 10307601595873709700152284273816112264069230130616436755625194854815875713954n],
                [21888242871839275220042445260109153167277707414472061641714758635765020556616n, 0n],
                [3772000881919853776433695186713858239009073593817195771773381919316419345261n, 2236595495967245188281701248203181795121068902605861227855261137820944008926n],
                [2203960485148121921418603742825762020974279258880205651966n, 0n],
                [18429021223477853657660792034369865839114504446431234726392080002137598044644n, 9344045779998320333812420223237981029506012124075525679208581902008406485703n],
            ],
            [
                [1n, 0n],
                [2581911344467009335267311115468803099551665605076196740867805258568234346338n, 19937756971775647987995932169929341994314640652964949448313374472400716661030n],
                [2203960485148121921418603742825762020974279258880205651966n, 0n],
                [5324479202449903542726783395506214481928257762400643279780343368557297135718n, 16208900380737693084919495127334387981393726419856888799917914180988844123039n],
                [21888242871839275220042445260109153167277707414472061641714758635765020556616n, 0n],
                [13981852324922362344252311234282257507216387789820983642040889267519694726527n, 7629828391165209371577384193250820201684255241773809077146787135900891633097n],
            ]
        ];

        const f = module.addFunction(prefix+ "__frobeniusMap"+n);
        f.addParam("x", "i32");
        f.addParam("r", "i32");

        const c = f.getCodeBuilder();

        for (let i=0; i<6; i++) {
            const X = (i==0) ? c.getLocal("x") : c.i32_add(c.getLocal("x"), c.i32_const(i*f2size));
            const Xc0 = X;
            const Xc1 = c.i32_add(c.getLocal("x"), c.i32_const(i*f2size + f1size));
            const R = (i==0) ? c.getLocal("r") : c.i32_add(c.getLocal("r"), c.i32_const(i*f2size));
            const Rc0 = R;
            const Rc1 = c.i32_add(c.getLocal("r"), c.i32_const(i*f2size + f1size));
            const coef = mul2(F12[Math.floor(i/3)][n%12] , F6[i%3][n%6]);
            const pCoef = module.alloc([
                ...utils.bigInt2BytesLE(toMontgomery(coef[0]), 32),
                ...utils.bigInt2BytesLE(toMontgomery(coef[1]), 32),
            ]);
            if (n%2 == 1) {
                f.addCode(
                    c.call(f1mPrefix + "_copy", Xc0, Rc0),
                    c.call(f1mPrefix + "_neg", Xc1, Rc1),
                    c.call(f2mPrefix + "_mul", R, c.i32_const(pCoef), R),
                );
            } else {
                f.addCode(c.call(f2mPrefix + "_mul", X, c.i32_const(pCoef), R));
            }
        }

        function mul2(a, b) {
            const ac0 = BigInt(a[0]);
            const ac1 = BigInt(a[1]);
            const bc0 = BigInt(b[0]);
            const bc1 = BigInt(b[1]);
            const res = [
                (ac0 * bc0 - (  ac1 * bc1)  ) % q,
                (ac0 * bc1 + (  ac1 * bc0)  ) % q,
            ];
            if (isNegative(res[0])) res[0] = res[0] + q;
            return res;
        }

    }



    function buildFinalExponentiationFirstChunk() {

        const f = module.addFunction(prefix+ "__finalExponentiationFirstChunk");
        f.addParam("x", "i32");
        f.addParam("r", "i32");

        const c = f.getCodeBuilder();

        const elt = c.getLocal("x");
        const eltC0 = elt;
        const eltC1 = c.i32_add(elt, c.i32_const(n8*6));
        const r = c.getLocal("r");
        const pA = module.alloc(ftsize);
        const A = c.i32_const(pA);
        const Ac0 = A;
        const Ac1 = c.i32_const(pA + n8*6);
        const B = c.i32_const(module.alloc(ftsize));
        const C = c.i32_const(module.alloc(ftsize));
        const D = c.i32_const(module.alloc(ftsize));

        f.addCode(
            // const alt_bn128_Fq12 A = alt_bn128_Fq12(elt.c0,-elt.c1);
            c.call(f6mPrefix + "_copy", eltC0, Ac0),
            c.call(f6mPrefix + "_neg", eltC1, Ac1),

            // const alt_bn128_Fq12 B = elt.inverse();
            c.call(ftmPrefix + "_inverse", elt, B),

            // const alt_bn128_Fq12 C = A * B;
            c.call(ftmPrefix + "_mul", A, B, C),
            // const alt_bn128_Fq12 D = C.Frobenius_map(2);
            c.call(prefix + "__frobeniusMap2", C, D),
            // const alt_bn128_Fq12 result = D * C;
            c.call(ftmPrefix + "_mul", C, D, r),
        );
    }

    function buildCyclotomicSquare() {
        const f = module.addFunction(prefix+ "__cyclotomicSquare");
        f.addParam("x", "i32");
        f.addParam("r", "i32");

        const c = f.getCodeBuilder();

        const x0 = c.getLocal("x");
        const x4 = c.i32_add(c.getLocal("x"), c.i32_const(f2size));
        const x3 = c.i32_add(c.getLocal("x"), c.i32_const(2*f2size));
        const x2 = c.i32_add(c.getLocal("x"), c.i32_const(3*f2size));
        const x1 = c.i32_add(c.getLocal("x"), c.i32_const(4*f2size));
        const x5 = c.i32_add(c.getLocal("x"), c.i32_const(5*f2size));

        const r0 = c.getLocal("r");
        const r4 = c.i32_add(c.getLocal("r"), c.i32_const(f2size));
        const r3 = c.i32_add(c.getLocal("r"), c.i32_const(2*f2size));
        const r2 = c.i32_add(c.getLocal("r"), c.i32_const(3*f2size));
        const r1 = c.i32_add(c.getLocal("r"), c.i32_const(4*f2size));
        const r5 = c.i32_add(c.getLocal("r"), c.i32_const(5*f2size));

        const t0 = c.i32_const(module.alloc(f2size));
        const t1 = c.i32_const(module.alloc(f2size));
        const t2 = c.i32_const(module.alloc(f2size));
        const t3 = c.i32_const(module.alloc(f2size));
        const t4 = c.i32_const(module.alloc(f2size));
        const t5 = c.i32_const(module.alloc(f2size));
        const tmp = c.i32_const(module.alloc(f2size));
        const AUX = c.i32_const(module.alloc(f2size));


        f.addCode(
            //    // t0 + t1*y = (z0 + z1*y)^2 = a^2
            //    tmp = z0 * z1;
            //    t0 = (z0 + z1) * (z0 + my_Fp6::non_residue * z1) - tmp - my_Fp6::non_residue * tmp;
            //    t1 = tmp + tmp;
            c.call(f2mPrefix + "_mul", x0, x1, tmp),
            c.call(f2mPrefix + "_mul", x1, c.i32_const(pNonResidueF6), t0),
            c.call(f2mPrefix + "_add", x0, t0, t0),
            c.call(f2mPrefix + "_add", x0, x1, AUX),
            c.call(f2mPrefix + "_mul", AUX, t0, t0),
            c.call(f2mPrefix + "_mul", c.i32_const(pNonResidueF6), tmp, AUX),
            c.call(f2mPrefix + "_add", tmp, AUX, AUX),
            c.call(f2mPrefix + "_sub", t0, AUX, t0),
            c.call(f2mPrefix + "_add", tmp, tmp, t1),

            //  // t2 + t3*y = (z2 + z3*y)^2 = b^2
            //  tmp = z2 * z3;
            //  t2 = (z2 + z3) * (z2 + my_Fp6::non_residue * z3) - tmp - my_Fp6::non_residue * tmp;
            //  t3 = tmp + tmp;
            c.call(f2mPrefix + "_mul", x2, x3, tmp),
            c.call(f2mPrefix + "_mul", x3, c.i32_const(pNonResidueF6), t2),
            c.call(f2mPrefix + "_add", x2, t2, t2),
            c.call(f2mPrefix + "_add", x2, x3, AUX),
            c.call(f2mPrefix + "_mul", AUX, t2, t2),
            c.call(f2mPrefix + "_mul", c.i32_const(pNonResidueF6), tmp, AUX),
            c.call(f2mPrefix + "_add", tmp, AUX, AUX),
            c.call(f2mPrefix + "_sub", t2, AUX, t2),
            c.call(f2mPrefix + "_add", tmp, tmp, t3),

            //  // t4 + t5*y = (z4 + z5*y)^2 = c^2
            //  tmp = z4 * z5;
            //  t4 = (z4 + z5) * (z4 + my_Fp6::non_residue * z5) - tmp - my_Fp6::non_residue * tmp;
            //  t5 = tmp + tmp;
            c.call(f2mPrefix + "_mul", x4, x5, tmp),
            c.call(f2mPrefix + "_mul", x5, c.i32_const(pNonResidueF6), t4),
            c.call(f2mPrefix + "_add", x4, t4, t4),
            c.call(f2mPrefix + "_add", x4, x5, AUX),
            c.call(f2mPrefix + "_mul", AUX, t4, t4),
            c.call(f2mPrefix + "_mul", c.i32_const(pNonResidueF6), tmp, AUX),
            c.call(f2mPrefix + "_add", tmp, AUX, AUX),
            c.call(f2mPrefix + "_sub", t4, AUX, t4),
            c.call(f2mPrefix + "_add", tmp, tmp, t5),

            // For A
            // z0 = 3 * t0 - 2 * z0
            c.call(f2mPrefix + "_sub", t0, x0, r0),
            c.call(f2mPrefix + "_add", r0, r0, r0),
            c.call(f2mPrefix + "_add", t0, r0, r0),
            // z1 = 3 * t1 + 2 * z1
            c.call(f2mPrefix + "_add", t1, x1, r1),
            c.call(f2mPrefix + "_add", r1, r1, r1),
            c.call(f2mPrefix + "_add", t1, r1, r1),

            // For B
            // z2 = 3 * (xi * t5) + 2 * z2
            c.call(f2mPrefix + "_mul", t5, c.i32_const(pAltBn128Twist), AUX),
            c.call(f2mPrefix + "_add", AUX, x2, r2),
            c.call(f2mPrefix + "_add", r2, r2, r2),
            c.call(f2mPrefix + "_add", AUX, r2, r2),
            // z3 = 3 * t4 - 2 * z3
            c.call(f2mPrefix + "_sub", t4, x3, r3),
            c.call(f2mPrefix + "_add", r3, r3, r3),
            c.call(f2mPrefix + "_add", t4, r3, r3),

            // For C
            // z4 = 3 * t2 - 2 * z4
            c.call(f2mPrefix + "_sub", t2, x4, r4),
            c.call(f2mPrefix + "_add", r4, r4, r4),
            c.call(f2mPrefix + "_add", t2, r4, r4),
            // z5 = 3 * t3 + 2 * z5
            c.call(f2mPrefix + "_add", t3, x5, r5),
            c.call(f2mPrefix + "_add", r5, r5, r5),
            c.call(f2mPrefix + "_add", t3, r5, r5),

        );
    }


    function buildCyclotomicExp(exponent, fnName) {
        const exponentNafBytes = naf(exponent).map( (b) => (b==-1 ? 0xFF: b) );
        const pExponentNafBytes = module.alloc(exponentNafBytes);

        const f = module.addFunction(prefix+ "__cyclotomicExp_"+fnName);
        f.addParam("x", "i32");
        f.addParam("r", "i32");
        f.addLocal("bit", "i32");
        f.addLocal("i", "i32");

        const c = f.getCodeBuilder();

        const x = c.getLocal("x");

        const res = c.getLocal("r");

        const inverse = c.i32_const(module.alloc(ftsize));


        f.addCode(
            c.call(ftmPrefix + "_conjugate", x, inverse),
            c.call(ftmPrefix + "_one", res),

            c.if(
                c.teeLocal("bit", c.i32_load8_s(c.i32_const(exponentNafBytes.length-1), pExponentNafBytes)),
                c.if(
                    c.i32_eq(
                        c.getLocal("bit"),
                        c.i32_const(1)
                    ),
                    c.call(ftmPrefix + "_mul", res, x, res),
                    c.call(ftmPrefix + "_mul", res, inverse, res),
                )
            ),

            c.setLocal("i", c.i32_const(exponentNafBytes.length-2)),
            c.block(c.loop(
                c.call(prefix + "__cyclotomicSquare", res, res),
                c.if(
                    c.teeLocal("bit", c.i32_load8_s(c.getLocal("i"), pExponentNafBytes)),
                    c.if(
                        c.i32_eq(
                            c.getLocal("bit"),
                            c.i32_const(1)
                        ),
                        c.call(ftmPrefix + "_mul", res, x, res),
                        c.call(ftmPrefix + "_mul", res, inverse, res),
                    )
                ),
                c.br_if(1, c.i32_eqz ( c.getLocal("i") )),
                c.setLocal("i", c.i32_sub(c.getLocal("i"), c.i32_const(1))),
                c.br(0)
            ))
        );
    }



    function buildFinalExponentiationLastChunk() {
        buildCyclotomicSquare();
        buildCyclotomicExp(finalExpZ, "w0");

        const f = module.addFunction(prefix+ "__finalExponentiationLastChunk");
        f.addParam("x", "i32");
        f.addParam("r", "i32");

        const c = f.getCodeBuilder();

        const elt = c.getLocal("x");
        const result = c.getLocal("r");
        const A = c.i32_const(module.alloc(ftsize));
        const B = c.i32_const(module.alloc(ftsize));
        const C = c.i32_const(module.alloc(ftsize));
        const D = c.i32_const(module.alloc(ftsize));
        const E = c.i32_const(module.alloc(ftsize));
        const F = c.i32_const(module.alloc(ftsize));
        const G = c.i32_const(module.alloc(ftsize));
        const H = c.i32_const(module.alloc(ftsize));
        const I = c.i32_const(module.alloc(ftsize));
        const J = c.i32_const(module.alloc(ftsize));
        const K = c.i32_const(module.alloc(ftsize));
        const L = c.i32_const(module.alloc(ftsize));
        const M = c.i32_const(module.alloc(ftsize));
        const N = c.i32_const(module.alloc(ftsize));
        const O = c.i32_const(module.alloc(ftsize));
        const P = c.i32_const(module.alloc(ftsize));
        const Q = c.i32_const(module.alloc(ftsize));
        const R = c.i32_const(module.alloc(ftsize));
        const S = c.i32_const(module.alloc(ftsize));
        const T = c.i32_const(module.alloc(ftsize));
        const U = c.i32_const(module.alloc(ftsize));

        f.addCode(


            // A = exp_by_neg_z(elt)  // = elt^(-z)
            c.call(prefix + "__cyclotomicExp_w0", elt, A),
            finalExpIsNegative ? [] : c.call(ftmPrefix + "_conjugate", A, A),
            // B = A^2                // = elt^(-2*z)
            c.call(prefix + "__cyclotomicSquare", A, B),
            // C = B^2                // = elt^(-4*z)
            c.call(prefix + "__cyclotomicSquare", B, C),
            // D = C * B              // = elt^(-6*z)
            c.call(ftmPrefix + "_mul", C, B, D),
            // E = exp_by_neg_z(D)    // = elt^(6*z^2)
            c.call(prefix + "__cyclotomicExp_w0", D, E),
            finalExpIsNegative ? [] : c.call(ftmPrefix + "_conjugate", E, E),
            // F = E^2                // = elt^(12*z^2)
            c.call(prefix + "__cyclotomicSquare", E, F),
            // G = epx_by_neg_z(F)    // = elt^(-12*z^3)
            c.call(prefix + "__cyclotomicExp_w0", F, G),
            finalExpIsNegative ? [] : c.call(ftmPrefix + "_conjugate", G, G),
            // H = conj(D)            // = elt^(6*z)
            c.call(ftmPrefix + "_conjugate", D, H),
            // I = conj(G)            // = elt^(12*z^3)
            c.call(ftmPrefix + "_conjugate", G, I),
            // J = I * E              // = elt^(12*z^3 + 6*z^2)
            c.call(ftmPrefix + "_mul", I, E, J),
            // K = J * H              // = elt^(12*z^3 + 6*z^2 + 6*z)
            c.call(ftmPrefix + "_mul", J, H, K),
            // L = K * B              // = elt^(12*z^3 + 6*z^2 + 4*z)
            c.call(ftmPrefix + "_mul", K, B, L),
            // M = K * E              // = elt^(12*z^3 + 12*z^2 + 6*z)
            c.call(ftmPrefix + "_mul", K, E, M),

            // N = M * elt            // = elt^(12*z^3 + 12*z^2 + 6*z + 1)
            c.call(ftmPrefix + "_mul", M, elt, N),

            // O = L.Frobenius_map(1) // = elt^(q*(12*z^3 + 6*z^2 + 4*z))
            c.call(prefix + "__frobeniusMap1", L, O),
            // P = O * N              // = elt^(q*(12*z^3 + 6*z^2 + 4*z) * (12*z^3 + 12*z^2 + 6*z + 1))
            c.call(ftmPrefix + "_mul", O, N, P),
            // Q = K.Frobenius_map(2) // = elt^(q^2 * (12*z^3 + 6*z^2 + 6*z))
            c.call(prefix + "__frobeniusMap2", K, Q),
            // R = Q * P              // = elt^(q^2 * (12*z^3 + 6*z^2 + 6*z) + q*(12*z^3 + 6*z^2 + 4*z) * (12*z^3 + 12*z^2 + 6*z + 1))
            c.call(ftmPrefix + "_mul", Q, P, R),
            // S = conj(elt)          // = elt^(-1)
            c.call(ftmPrefix + "_conjugate", elt, S),
            // T = S * L              // = elt^(12*z^3 + 6*z^2 + 4*z - 1)
            c.call(ftmPrefix + "_mul", S, L, T),
            // U = T.Frobenius_map(3) // = elt^(q^3(12*z^3 + 6*z^2 + 4*z - 1))
            c.call(prefix + "__frobeniusMap3", T, U),
            // V = U * R              // = elt^(q^3(12*z^3 + 6*z^2 + 4*z - 1) + q^2 * (12*z^3 + 6*z^2 + 6*z) + q*(12*z^3 + 6*z^2 + 4*z) * (12*z^3 + 12*z^2 + 6*z + 1))
            c.call(ftmPrefix + "_mul", U, R, result),
            // result = V
        );
    }


    function buildFinalExponentiation() {
        buildFinalExponentiationFirstChunk();
        buildFinalExponentiationLastChunk();
        const f = module.addFunction(prefix+ "_finalExponentiation");
        f.addParam("x", "i32");
        f.addParam("r", "i32");

        const c = f.getCodeBuilder();

        const elt = c.getLocal("x");
        const result = c.getLocal("r");
        const eltToFirstChunk = c.i32_const(module.alloc(ftsize));

        f.addCode(
            c.call(prefix + "__finalExponentiationFirstChunk", elt, eltToFirstChunk ),
            c.call(prefix + "__finalExponentiationLastChunk", eltToFirstChunk, result )
        );
    }


    function buildFinalExponentiationOld() {
        const f = module.addFunction(prefix+ "_finalExponentiationOld");
        f.addParam("x", "i32");
        f.addParam("r", "i32");

        const exponent = 552484233613224096312617126783173147097382103762957654188882734314196910839907541213974502761540629817009608548654680343627701153829446747810907373256841551006201639677726139946029199968412598804882391702273019083653272047566316584365559776493027495458238373902875937659943504873220554161550525926302303331747463515644711876653177129578303191095900909191624817826566688241804408081892785725967931714097716709526092261278071952560171111444072049229123565057483750161460024353346284167282452756217662335528813519139808291170539072125381230815729071544861602750936964829313608137325426383735122175229541155376346436093930287402089517426973178917569713384748081827255472576937471496195752727188261435633271238710131736096299798168852925540549342330775279877006784354801422249722573783561685179618816480037695005515426162362431072245638324744480n;

        const pExponent = module.alloc(utils.bigInt2BytesLE( exponent, 352 ));

        const c = f.getCodeBuilder();

        f.addCode(
            c.call(ftmPrefix + "_exp", c.getLocal("x"), c.i32_const(pExponent), c.i32_const(352), c.getLocal("r")),
        );
    }




    const pPreP = module.alloc(prePSize);
    const pPreQ = module.alloc(preQSize);

    function buildPairingEquation(nPairings) {

        const f = module.addFunction(prefix+ "_pairingEq"+nPairings);
        for (let i=0; i<nPairings; i++) {
            f.addParam("p_"+i, "i32");
            f.addParam("q_"+i, "i32");
        }
        f.addParam("c", "i32");
        f.setReturnType("i32");


        const c = f.getCodeBuilder();

        const resT = c.i32_const(module.alloc(ftsize));
        const auxT = c.i32_const(module.alloc(ftsize));

        f.addCode(c.call(ftmPrefix + "_one", resT ));

        for (let i=0; i<nPairings; i++) {

            f.addCode(c.call(prefix + "_prepareG1", c.getLocal("p_"+i), c.i32_const(pPreP) ));
            f.addCode(c.call(prefix + "_prepareG2", c.getLocal("q_"+i), c.i32_const(pPreQ) ));
            f.addCode(c.call(prefix + "_millerLoop", c.i32_const(pPreP), c.i32_const(pPreQ), auxT ));

            f.addCode(c.call(ftmPrefix + "_mul", resT, auxT, resT ));
        }

        f.addCode(c.call(prefix + "_finalExponentiation", resT, resT ));

        f.addCode(c.call(ftmPrefix + "_eq", resT, c.getLocal("c")));
    }


    function buildPairing() {

        const f = module.addFunction(prefix+ "_pairing");
        f.addParam("p", "i32");
        f.addParam("q", "i32");
        f.addParam("r", "i32");

        const c = f.getCodeBuilder();

        const resT = c.i32_const(module.alloc(ftsize));

        f.addCode(c.call(prefix + "_prepareG1", c.getLocal("p"), c.i32_const(pPreP) ));
        f.addCode(c.call(prefix + "_prepareG2", c.getLocal("q"), c.i32_const(pPreQ) ));
        f.addCode(c.call(prefix + "_millerLoop", c.i32_const(pPreP), c.i32_const(pPreQ), resT ));
        f.addCode(c.call(prefix + "_finalExponentiation", resT, c.getLocal("r") ));
    }


    buildPrepAddStep();
    buildPrepDoubleStep();

    buildPrepareG1();
    buildPrepareG2();

    buildMulBy024();
    buildMulBy024Old();
    buildMillerLoop();


    for (let i=0; i<10; i++) {
        buildFrobeniusMap(i);
        module.exportFunction(prefix + "__frobeniusMap"+i);
    }

    buildFinalExponentiationOld();
    buildFinalExponentiation();

    for (let i=1; i<=5; i++) {
        buildPairingEquation(i);
        module.exportFunction(prefix + "_pairingEq"+i);
    }

    buildPairing();

    module.exportFunction(prefix + "_pairing");

    module.exportFunction(prefix + "_prepareG1");
    module.exportFunction(prefix + "_prepareG2");
    module.exportFunction(prefix + "_millerLoop");
    module.exportFunction(prefix + "_finalExponentiation");
    module.exportFunction(prefix + "_finalExponentiationOld");
    module.exportFunction(prefix + "__mulBy024");
    module.exportFunction(prefix + "__mulBy024Old");
    module.exportFunction(prefix + "__cyclotomicSquare");
    module.exportFunction(prefix + "__cyclotomicExp_w0");

    // console.log(module.functionIdxByName);

};



/***/ }),

/***/ 320:
/***/ ((module) => {



/*
    Copyright 2019 0KIMS association.

    This file is part of wasmsnark (Web Assembly zkSnark Prover).

    wasmsnark is a free software: you can redistribute it and/or modify it
    under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    wasmsnark is distributed in the hope that it will be useful, but WITHOUT
    ANY WARRANTY; without even the implied warranty of MERCHANTABILITY
    or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public
    License for more details.

    You should have received a copy of the GNU General Public License
    along with wasmsnark. If not, see <https://www.gnu.org/licenses/>.
*/

module.exports = function buildApplyKey(module, fnName, gPrefix, frPrefix, sizeGIn, sizeGOut, sizeF, opGtimesF) {

    const f = module.addFunction(fnName);
    f.addParam("pIn", "i32");
    f.addParam("n", "i32");
    f.addParam("pFirst", "i32");
    f.addParam("pInc", "i32");
    f.addParam("pOut", "i32");
    f.addLocal("pOldFree", "i32");
    f.addLocal("i", "i32");
    f.addLocal("pFrom", "i32");
    f.addLocal("pTo", "i32");

    const c = f.getCodeBuilder();

    const t = c.i32_const(module.alloc(sizeF));

    f.addCode(
        c.setLocal("pFrom", c.getLocal("pIn")),
        c.setLocal("pTo", c.getLocal("pOut")),
    );

    // t = first
    f.addCode(
        c.call(
            frPrefix + "_copy",
            c.getLocal("pFirst"),
            t
        )
    );
    f.addCode(
        c.setLocal("i", c.i32_const(0)),
        c.block(c.loop(
            c.br_if(1, c.i32_eq ( c.getLocal("i"), c.getLocal("n") )),

            c.call(
                opGtimesF,
                c.getLocal("pFrom"),
                t,
                c.getLocal("pTo")
            ),
            c.setLocal("pFrom", c.i32_add(c.getLocal("pFrom"), c.i32_const(sizeGIn))),
            c.setLocal("pTo", c.i32_add(c.getLocal("pTo"), c.i32_const(sizeGOut))),

            // t = t* inc
            c.call(
                frPrefix + "_mul",
                t,
                c.getLocal("pInc"),
                t
            ),
            c.setLocal("i", c.i32_add(c.getLocal("i"), c.i32_const(1))),
            c.br(0)
        ))
    );

    module.exportFunction(fnName);

};


/***/ }),

/***/ 440:
/***/ ((module) => {



module.exports = buildBatchConvertion;

function buildBatchConvertion(module, fnName, internalFnName, sizeIn, sizeOut, reverse) {
    if (typeof reverse === "undefined") {
        // Set the reverse in a way that allows to use the same buffer as in/out.
        if (sizeIn < sizeOut) {
            reverse = true;
        } else {
            reverse = false;
        }
    }

    const f = module.addFunction(fnName);
    f.addParam("pIn", "i32");
    f.addParam("n", "i32");
    f.addParam("pOut", "i32");
    f.addLocal("i", "i32");
    f.addLocal("itIn", "i32");
    f.addLocal("itOut", "i32");

    const c = f.getCodeBuilder();

    if (reverse) {
        f.addCode(
            c.setLocal("itIn",
                c.i32_add(
                    c.getLocal("pIn"),
                    c.i32_mul(
                        c.i32_sub(
                            c.getLocal("n"),
                            c.i32_const(1)
                        ),
                        c.i32_const(sizeIn)
                    )
                )
            ),
            c.setLocal("itOut",
                c.i32_add(
                    c.getLocal("pOut"),
                    c.i32_mul(
                        c.i32_sub(
                            c.getLocal("n"),
                            c.i32_const(1)
                        ),
                        c.i32_const(sizeOut)
                    )
                )
            ),
            c.setLocal("i", c.i32_const(0)),
            c.block(c.loop(
                c.br_if(1, c.i32_eq ( c.getLocal("i"), c.getLocal("n") )),

                c.call(internalFnName, c.getLocal("itIn"), c.getLocal("itOut")),

                c.setLocal("itIn", c.i32_sub(c.getLocal("itIn"), c.i32_const(sizeIn))),
                c.setLocal("itOut", c.i32_sub(c.getLocal("itOut"), c.i32_const(sizeOut))),
                c.setLocal("i", c.i32_add(c.getLocal("i"), c.i32_const(1))),
                c.br(0)
            )),
        );
    } else {
        f.addCode(
            c.setLocal("itIn", c.getLocal("pIn")),
            c.setLocal("itOut", c.getLocal("pOut")),
            c.setLocal("i", c.i32_const(0)),
            c.block(c.loop(
                c.br_if(1, c.i32_eq ( c.getLocal("i"), c.getLocal("n") )),

                c.call(internalFnName, c.getLocal("itIn"), c.getLocal("itOut")),

                c.setLocal("itIn", c.i32_add(c.getLocal("itIn"), c.i32_const(sizeIn))),
                c.setLocal("itOut", c.i32_add(c.getLocal("itOut"), c.i32_const(sizeOut))),
                c.setLocal("i", c.i32_add(c.getLocal("i"), c.i32_const(1))),
                c.br(0)
            )),
        );
    }
}


/***/ }),

/***/ 163:
/***/ ((module) => {


module.exports = buildBatchInverse;

function buildBatchInverse(module, prefix) {


    const n8 = module.modules[prefix].n64*8;

    const f = module.addFunction(prefix+"_batchInverse");
    f.addParam("pIn", "i32");
    f.addParam("inStep", "i32");
    f.addParam("n", "i32");
    f.addParam("pOut", "i32");
    f.addParam("outStep", "i32");
    f.addLocal("itAux", "i32");
    f.addLocal("itIn", "i32");
    f.addLocal("itOut","i32");
    f.addLocal("i","i32");

    const c = f.getCodeBuilder();

    const AUX = c.i32_const(module.alloc(n8));


    // Alloc Working space for accumulated umltiplications
    f.addCode(
        c.setLocal("itAux", c.i32_load( c.i32_const(0) )),
        c.i32_store(
            c.i32_const(0),
            c.i32_add(
                c.getLocal("itAux"),
                c.i32_mul(
                    c.i32_add(
                        c.getLocal("n"),
                        c.i32_const(1)
                    ),
                    c.i32_const(n8)
                )
            )
        )
    );

    f.addCode(

        // aux[0] = a;
        c.call(prefix+"_one", c.getLocal("itAux")),
        // for (i=0;i<n;i++) aux[i] = aux[i-1]*in[i]
        c.setLocal("itIn", c.getLocal("pIn")),
        c.setLocal("itAux", c.i32_add(c.getLocal("itAux"), c.i32_const(n8))),
        c.setLocal("i", c.i32_const(0)),

        c.block(c.loop(
            c.br_if(1, c.i32_eq ( c.getLocal("i"), c.getLocal("n") )),
            c.if(
                c.call(prefix+"_isZero", c.getLocal("itIn")),
                c.call(
                    prefix + "_copy",
                    c.i32_sub(c.getLocal("itAux"), c.i32_const(n8)),
                    c.getLocal("itAux")
                ),
                c.call(
                    prefix+"_mul",
                    c.getLocal("itIn"),
                    c.i32_sub(c.getLocal("itAux"), c.i32_const(n8)),
                    c.getLocal("itAux")
                )
            ),
            c.setLocal("itIn", c.i32_add(c.getLocal("itIn"), c.getLocal("inStep"))),
            c.setLocal("itAux", c.i32_add(c.getLocal("itAux"), c.i32_const(n8))),
            c.setLocal("i", c.i32_add(c.getLocal("i"), c.i32_const(1))),
            c.br(0)
        )),

        // point to the last
        c.setLocal("itIn", c.i32_sub(c.getLocal("itIn"), c.getLocal("inStep"))),
        c.setLocal("itAux", c.i32_sub(c.getLocal("itAux"), c.i32_const(n8))),
        // itOut = pOut + (n-1)*stepOut   // Point to the last
        c.setLocal(
            "itOut",
            c.i32_add(
                c.getLocal("pOut"),
                c.i32_mul(
                    c.i32_sub(c.getLocal("n"), c.i32_const(1)),
                    c.getLocal("outStep"),
                )
            )
        ),

        // aux[n-1] = 1/aux[n-1]
        c.call(prefix+"_inverse", c.getLocal("itAux"), c.getLocal("itAux") ),

        c.block(c.loop(
            c.br_if(1, c.i32_eqz( c.getLocal("i"))),
            c.if(
                c.call(prefix+"_isZero", c.getLocal("itIn")),
                [
                    ...c.call(
                        prefix + "_copy",
                        c.getLocal("itAux"),
                        c.i32_sub(c.getLocal("itAux"), c.i32_const(n8)),
                    ),
                    ...c.call(
                        prefix + "_zero",
                        c.getLocal("itOut")
                    )
                ],[
                    ...c.call(prefix + "_copy", c.i32_sub(c.getLocal("itAux"), c.i32_const(n8)), AUX),
                    ...c.call(
                        prefix+"_mul",
                        c.getLocal("itAux"),
                        c.getLocal("itIn"),
                        c.i32_sub(c.getLocal("itAux"), c.i32_const(n8)),
                    ),
                    ...c.call(
                        prefix+"_mul",
                        c.getLocal("itAux"),
                        AUX,
                        c.getLocal("itOut")
                    )
                ]
            ),
            c.setLocal("itIn", c.i32_sub(c.getLocal("itIn"), c.getLocal("inStep"))),
            c.setLocal("itOut", c.i32_sub(c.getLocal("itOut"), c.getLocal("outStep"))),
            c.setLocal("itAux", c.i32_sub(c.getLocal("itAux"), c.i32_const(n8))),
            c.setLocal("i", c.i32_sub(c.getLocal("i"), c.i32_const(1))),
            c.br(0)
        ))

    );


    // Recover Old memory
    f.addCode(
        c.i32_store(
            c.i32_const(0),
            c.getLocal("itAux")
        )
    );

}


/***/ }),

/***/ 948:
/***/ ((module) => {



module.exports = buildBatchConvertion;

function buildBatchConvertion(module, fnName, internalFnName, sizeIn, sizeOut, reverse) {
    if (typeof reverse === "undefined") {
        // Set the reverse in a way that allows to use the same buffer as in/out.
        if (sizeIn < sizeOut) {
            reverse = true;
        } else {
            reverse = false;
        }
    }

    const f = module.addFunction(fnName);
    f.addParam("pIn1", "i32");
    f.addParam("pIn2", "i32");
    f.addParam("n", "i32");
    f.addParam("pOut", "i32");
    f.addLocal("i", "i32");
    f.addLocal("itIn1", "i32");
    f.addLocal("itIn2", "i32");
    f.addLocal("itOut", "i32");

    const c = f.getCodeBuilder();

    if (reverse) {
        f.addCode(
            c.setLocal("itIn1",
                c.i32_add(
                    c.getLocal("pIn1"),
                    c.i32_mul(
                        c.i32_sub(
                            c.getLocal("n"),
                            c.i32_const(1)
                        ),
                        c.i32_const(sizeIn)
                    )
                )
            ),
            c.setLocal("itIn2",
                c.i32_add(
                    c.getLocal("pIn2"),
                    c.i32_mul(
                        c.i32_sub(
                            c.getLocal("n"),
                            c.i32_const(1)
                        ),
                        c.i32_const(sizeIn)
                    )
                )
            ),
            c.setLocal("itOut",
                c.i32_add(
                    c.getLocal("pOut"),
                    c.i32_mul(
                        c.i32_sub(
                            c.getLocal("n"),
                            c.i32_const(1)
                        ),
                        c.i32_const(sizeOut)
                    )
                )
            ),
            c.setLocal("i", c.i32_const(0)),
            c.block(c.loop(
                c.br_if(1, c.i32_eq ( c.getLocal("i"), c.getLocal("n") )),

                c.call(internalFnName, c.getLocal("itIn1"), c.getLocal("itIn2"), c.getLocal("itOut")),

                c.setLocal("itIn1", c.i32_sub(c.getLocal("itIn1"), c.i32_const(sizeIn))),
                c.setLocal("itIn2", c.i32_sub(c.getLocal("itIn2"), c.i32_const(sizeIn))),
                c.setLocal("itOut", c.i32_sub(c.getLocal("itOut"), c.i32_const(sizeOut))),
                c.setLocal("i", c.i32_add(c.getLocal("i"), c.i32_const(1))),
                c.br(0)
            )),
        );
    } else {
        f.addCode(
            c.setLocal("itIn1", c.getLocal("pIn1")),
            c.setLocal("itIn2", c.getLocal("pIn2")),
            c.setLocal("itOut", c.getLocal("pOut")),
            c.setLocal("i", c.i32_const(0)),
            c.block(c.loop(
                c.br_if(1, c.i32_eq ( c.getLocal("i"), c.getLocal("n") )),

                c.call(internalFnName, c.getLocal("itIn1"), c.getLocal("itIn2"), c.getLocal("itOut")),

                c.setLocal("itIn1", c.i32_add(c.getLocal("itIn1"), c.i32_const(sizeIn))),
                c.setLocal("itIn2", c.i32_add(c.getLocal("itIn2"), c.i32_const(sizeIn))),
                c.setLocal("itOut", c.i32_add(c.getLocal("itOut"), c.i32_const(sizeOut))),
                c.setLocal("i", c.i32_add(c.getLocal("i"), c.i32_const(1))),
                c.br(0)
            )),
        );
    }
}


/***/ }),

/***/ 904:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

/*
    Copyright 2019 0KIMS association.

    This file is part of wasmsnark (Web Assembly zkSnark Prover).

    wasmsnark is a free software: you can redistribute it and/or modify it
    under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    wasmsnark is distributed in the hope that it will be useful, but WITHOUT
    ANY WARRANTY; without even the implied warranty of MERCHANTABILITY
    or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public
    License for more details.

    You should have received a copy of the GNU General Public License
    along with wasmsnark. If not, see <https://www.gnu.org/licenses/>.
*/

const buildTimesScalarNAF = __webpack_require__(591);
//const buildTimesScalar = require("./build_timesscalar");
const buildBatchConvertion = __webpack_require__(440);
const buildMultiexp = __webpack_require__(911);

module.exports = function buildCurve(module, prefix, prefixField, pB) {


    const n64 = module.modules[prefixField].n64;
    const n8 = n64*8;

    if (module.modules[prefix]) return prefix;  // already builded
    module.modules[prefix] = {
        n64: n64*3
    };

    function buildIsZero() {
        const f = module.addFunction(prefix + "_isZero");
        f.addParam("p1", "i32");
        f.setReturnType("i32");

        const c = f.getCodeBuilder();

        f.addCode(c.call(
            prefixField + "_isZero",
            c.i32_add(
                c.getLocal("p1"),
                c.i32_const(n8*2)
            )
        ));
    }
    function buildIsZeroAffine() {
        const f = module.addFunction(prefix + "_isZeroAffine");
        f.addParam("p1", "i32");
        f.setReturnType("i32");

        const c = f.getCodeBuilder();

        f.addCode(
            c.i32_and(
                c.call(
                    prefixField + "_isZero",
                    c.getLocal("p1")
                ),
                c.call(
                    prefixField + "_isZero",
                    c.i32_add(
                        c.getLocal("p1"),
                        c.i32_const(n8)
                    )
                )
            )
        );
    }

    function buildCopy() {
        const f = module.addFunction(prefix + "_copy");
        f.addParam("ps", "i32");
        f.addParam("pd", "i32");

        const c = f.getCodeBuilder();

        for (let i=0; i<n64*3; i++) {
            f.addCode(
                c.i64_store(
                    c.getLocal("pd"),
                    i*8,
                    c.i64_load(
                        c.getLocal("ps"),
                        i*8
                    )
                )
            );
        }
    }


    function buildCopyAffine() {
        const f = module.addFunction(prefix + "_copyAffine");
        f.addParam("ps", "i32");
        f.addParam("pd", "i32");

        const c = f.getCodeBuilder();

        for (let i=0; i<n64*2; i++) {
            f.addCode(
                c.i64_store(
                    c.getLocal("pd"),
                    i*8,
                    c.i64_load(
                        c.getLocal("ps"),
                        i*8
                    )
                )
            );
        }

    }


    function buildZero() {
        const f = module.addFunction(prefix + "_zero");
        f.addParam("pr", "i32");

        const c = f.getCodeBuilder();

        f.addCode(c.call(
            prefixField + "_zero",
            c.getLocal("pr")
        ));

        f.addCode(c.call(
            prefixField + "_one",
            c.i32_add(
                c.getLocal("pr"),
                c.i32_const(n8)
            )
        ));

        f.addCode(c.call(
            prefixField + "_zero",
            c.i32_add(
                c.getLocal("pr"),
                c.i32_const(n8*2)
            )
        ));
    }


    function buildZeroAffine() {
        const f = module.addFunction(prefix + "_zeroAffine");
        f.addParam("pr", "i32");

        const c = f.getCodeBuilder();

        f.addCode(c.call(
            prefixField + "_zero",
            c.getLocal("pr")
        ));

        f.addCode(c.call(
            prefixField + "_zero",
            c.i32_add(
                c.getLocal("pr"),
                c.i32_const(n8)
            )
        ));
    }

    function buildEq() {
        const f = module.addFunction(prefix + "_eq");
        f.addParam("p1", "i32");
        f.addParam("p2", "i32");
        f.setReturnType("i32");
        f.addLocal("z1", "i32");
        f.addLocal("z2", "i32");

        const c = f.getCodeBuilder();

        const x1 = c.getLocal("p1");
        const y1 = c.i32_add(c.getLocal("p1"), c.i32_const(n8));
        f.addCode(c.setLocal("z1", c.i32_add(c.getLocal("p1"), c.i32_const(n8*2))));
        const z1 = c.getLocal("z1");
        const x2 = c.getLocal("p2");
        const y2 = c.i32_add(c.getLocal("p2"), c.i32_const(n8));
        f.addCode(c.setLocal("z2", c.i32_add(c.getLocal("p2"), c.i32_const(n8*2))));
        const z2 = c.getLocal("z2");

        const Z1Z1 = c.i32_const(module.alloc(n8));
        const Z2Z2 = c.i32_const(module.alloc(n8));
        const U1 = c.i32_const(module.alloc(n8));
        const U2 = c.i32_const(module.alloc(n8));
        const Z1_cubed = c.i32_const(module.alloc(n8));
        const Z2_cubed = c.i32_const(module.alloc(n8));
        const S1 = c.i32_const(module.alloc(n8));
        const S2 = c.i32_const(module.alloc(n8));


        f.addCode(
            c.if(
                c.call(prefix + "_isZero", c.getLocal("p1")),
                c.ret( c.call(prefix + "_isZero", c.getLocal("p2"))),
            ),
            c.if(
                c.call(prefix + "_isZero", c.getLocal("p2")),
                c.ret(c.i32_const(0))
            ),
            c.if(
                c.call(prefixField + "_isOne", z1),
                c.ret(c.call(prefix + "_eqMixed", c.getLocal("p2"), c.getLocal("p1")))
            ),
            c.if(
                c.call(prefixField + "_isOne", z2),
                c.ret(c.call(prefix + "_eqMixed", c.getLocal("p1"), c.getLocal("p2")))
            ),

            c.call(prefixField + "_square", z1, Z1Z1),
            c.call(prefixField + "_square", z2, Z2Z2),
            c.call(prefixField + "_mul", x1, Z2Z2, U1),
            c.call(prefixField + "_mul", x2, Z1Z1, U2),
            c.call(prefixField + "_mul", z1, Z1Z1, Z1_cubed),
            c.call(prefixField + "_mul", z2, Z2Z2, Z2_cubed),
            c.call(prefixField + "_mul", y1, Z2_cubed, S1),
            c.call(prefixField + "_mul", y2, Z1_cubed, S2),

            c.if(
                c.call(prefixField + "_eq", U1, U2),
                c.if(
                    c.call(prefixField + "_eq", S1, S2),
                    c.ret(c.i32_const(1))
                )
            ),
            c.ret(c.i32_const(0))
        );
    }


    function buildEqMixed() {
        const f = module.addFunction(prefix + "_eqMixed");
        f.addParam("p1", "i32");
        f.addParam("p2", "i32");
        f.setReturnType("i32");
        f.addLocal("z1", "i32");

        const c = f.getCodeBuilder();

        const x1 = c.getLocal("p1");
        const y1 = c.i32_add(c.getLocal("p1"), c.i32_const(n8));
        f.addCode(c.setLocal("z1", c.i32_add(c.getLocal("p1"), c.i32_const(n8*2))));
        const z1 = c.getLocal("z1");
        const x2 = c.getLocal("p2");
        const y2 = c.i32_add(c.getLocal("p2"), c.i32_const(n8));

        const Z1Z1 = c.i32_const(module.alloc(n8));
        const U2 = c.i32_const(module.alloc(n8));
        const Z1_cubed = c.i32_const(module.alloc(n8));
        const S2 = c.i32_const(module.alloc(n8));

        f.addCode(
            c.if(
                c.call(prefix + "_isZero", c.getLocal("p1")),
                c.ret( c.call(prefix + "_isZeroAffine", c.getLocal("p2"))),
            ),
            c.if(
                c.call(prefix + "_isZeroAffine", c.getLocal("p2")),
                c.ret(c.i32_const(0))
            ),
            c.if(
                c.call(prefixField + "_isOne", z1),
                c.ret(c.call(prefix + "_eqAffine", c.getLocal("p1"), c.getLocal("p2")))
            ),
            c.call(prefixField + "_square", z1, Z1Z1),
            c.call(prefixField + "_mul", x2, Z1Z1, U2),
            c.call(prefixField + "_mul", z1, Z1Z1, Z1_cubed),
            c.call(prefixField + "_mul", y2, Z1_cubed, S2),

            c.if(
                c.call(prefixField + "_eq", x1, U2),
                c.if(
                    c.call(prefixField + "_eq", y1, S2),
                    c.ret(c.i32_const(1))
                )
            ),
            c.ret(c.i32_const(0))
        );
    }

    function buildDouble() {
        const f = module.addFunction(prefix + "_double");
        f.addParam("p1", "i32");
        f.addParam("pr", "i32");

        const c = f.getCodeBuilder();

        const x = c.getLocal("p1");
        const y = c.i32_add(c.getLocal("p1"), c.i32_const(n8));
        const z = c.i32_add(c.getLocal("p1"), c.i32_const(n8*2));
        const x3 = c.getLocal("pr");
        const y3 = c.i32_add(c.getLocal("pr"), c.i32_const(n8));
        const z3 = c.i32_add(c.getLocal("pr"), c.i32_const(n8*2));

        const A = c.i32_const(module.alloc(n8));
        const B = c.i32_const(module.alloc(n8));
        const C = c.i32_const(module.alloc(n8));
        const D = c.i32_const(module.alloc(n8));
        const E = c.i32_const(module.alloc(n8));
        const F = c.i32_const(module.alloc(n8));
        const G = c.i32_const(module.alloc(n8));
        const eightC = c.i32_const(module.alloc(n8));

        f.addCode(
            c.if(
                c.call(prefix + "_isZero", c.getLocal("p1")),
                [
                    ...c.call(prefix + "_copy", c.getLocal("p1"), c.getLocal("pr")),
                    ...c.ret([])
                ]
            ),
            c.if(
                c.call(prefixField + "_isOne", z),
                [
                    ...c.ret(c.call(prefix + "_doubleAffine", c.getLocal("p1"), c.getLocal("pr"))),
                    ...c.ret([])
                ]
            ),

            c.call(prefixField + "_square", x, A),
            c.call(prefixField + "_square", y, B),
            c.call(prefixField + "_square", B, C),

            c.call(prefixField + "_add", x, B, D),
            c.call(prefixField + "_square", D, D),
            c.call(prefixField + "_sub", D, A, D),
            c.call(prefixField + "_sub", D, C, D),
            c.call(prefixField + "_add", D, D, D),

            c.call(prefixField + "_add", A, A, E),
            c.call(prefixField + "_add", E, A, E),
            c.call(prefixField + "_square", E, F),

            c.call(prefixField + "_mul", y, z, G),

            c.call(prefixField + "_add", D, D, x3),
            c.call(prefixField + "_sub", F, x3, x3),

            c.call(prefixField + "_add", C, C, eightC),
            c.call(prefixField + "_add", eightC, eightC, eightC),
            c.call(prefixField + "_add", eightC, eightC, eightC),

            c.call(prefixField + "_sub", D, x3, y3),
            c.call(prefixField + "_mul", y3, E, y3),
            c.call(prefixField + "_sub", y3, eightC, y3),

            c.call(prefixField + "_add", G, G, z3),
        );
    }


    function buildDoubleAffine() {
        const f = module.addFunction(prefix + "_doubleAffine");
        f.addParam("p1", "i32");
        f.addParam("pr", "i32");

        const c = f.getCodeBuilder();

        const x = c.getLocal("p1");
        const y = c.i32_add(c.getLocal("p1"), c.i32_const(n8));
        const x3 = c.getLocal("pr");
        const y3 = c.i32_add(c.getLocal("pr"), c.i32_const(n8));
        const z3 = c.i32_add(c.getLocal("pr"), c.i32_const(n8*2));

        const XX = c.i32_const(module.alloc(n8));
        const YY = c.i32_const(module.alloc(n8));
        const YYYY = c.i32_const(module.alloc(n8));
        const S = c.i32_const(module.alloc(n8));
        const M = c.i32_const(module.alloc(n8));
        const eightYYYY = c.i32_const(module.alloc(n8));

        f.addCode(
            c.if(
                c.call(prefix + "_isZeroAffine", c.getLocal("p1")),
                [
                    ...c.call(prefix + "_toJacobian", c.getLocal("p1"), c.getLocal("pr")),
                    ...c.ret([])
                ]
            ),

            // XX = X1^2
            c.call(prefixField + "_square", x, XX),

            // YY = Y1^2
            c.call(prefixField + "_square", y, YY),

            // YYYY = YY^2
            c.call(prefixField + "_square", YY, YYYY),

            // S = 2*((X1+YY)^2-XX-YYYY)
            c.call(prefixField + "_add", x, YY, S),
            c.call(prefixField + "_square", S, S),
            c.call(prefixField + "_sub", S, XX, S),
            c.call(prefixField + "_sub", S, YYYY, S),
            c.call(prefixField + "_add", S, S, S),

            // M = 3*XX+a  (Hera a=0)
            c.call(prefixField + "_add", XX, XX, M),
            c.call(prefixField + "_add", M, XX, M),

            // Z3 = 2*Y1
            c.call(prefixField + "_add", y, y, z3),

            // T = M^2-2*S
            // X3 = T
            c.call(prefixField + "_square", M, x3),
            c.call(prefixField + "_sub", x3, S, x3),
            c.call(prefixField + "_sub", x3, S, x3),

            // Y3 = M*(S-T)-8*YYYY
            c.call(prefixField + "_add", YYYY, YYYY, eightYYYY),
            c.call(prefixField + "_add", eightYYYY, eightYYYY, eightYYYY),
            c.call(prefixField + "_add", eightYYYY, eightYYYY, eightYYYY),
            c.call(prefixField + "_sub", S, x3, y3),
            c.call(prefixField + "_mul", y3, M, y3),
            c.call(prefixField + "_sub", y3, eightYYYY, y3),
        );
    }


    function buildEqAffine() {
        const f = module.addFunction(prefix + "_eqAffine");
        f.addParam("p1", "i32");
        f.addParam("p2", "i32");
        f.setReturnType("i32");
        f.addLocal("z1", "i32");

        const c = f.getCodeBuilder();

        f.addCode(
            c.ret(c.i32_and(
                c.call(
                    prefixField + "_eq",
                    c.getLocal("p1"),
                    c.getLocal("p2")
                ),
                c.call(
                    prefixField + "_eq",
                    c.i32_add(c.getLocal("p1"), c.i32_const(n8)),
                    c.i32_add(c.getLocal("p2"), c.i32_const(n8))
                )
            ))
        );
    }

    function buildToMontgomery() {
        const f = module.addFunction(prefix + "_toMontgomery");
        f.addParam("p1", "i32");
        f.addParam("pr", "i32");

        const c = f.getCodeBuilder();

        f.addCode(c.call(
            prefixField + "_toMontgomery",
            c.getLocal("p1"),
            c.getLocal("pr")
        ));
        for (let i=1; i<3; i++) {
            f.addCode(c.call(
                prefixField + "_toMontgomery",
                c.i32_add(c.getLocal("p1"), c.i32_const(i*n8)),
                c.i32_add(c.getLocal("pr"), c.i32_const(i*n8))
            ));
        }
    }

    function buildToMontgomeryAffine() {
        const f = module.addFunction(prefix + "_toMontgomeryAffine");
        f.addParam("p1", "i32");
        f.addParam("pr", "i32");

        const c = f.getCodeBuilder();

        f.addCode(c.call(
            prefixField + "_toMontgomery",
            c.getLocal("p1"),
            c.getLocal("pr")
        ));
        for (let i=1; i<2; i++) {
            f.addCode(c.call(
                prefixField + "_toMontgomery",
                c.i32_add(c.getLocal("p1"), c.i32_const(i*n8)),
                c.i32_add(c.getLocal("pr"), c.i32_const(i*n8))
            ));
        }
    }

    function buildFromMontgomery() {
        const f = module.addFunction(prefix + "_fromMontgomery");
        f.addParam("p1", "i32");
        f.addParam("pr", "i32");

        const c = f.getCodeBuilder();

        f.addCode(c.call(
            prefixField + "_fromMontgomery",
            c.getLocal("p1"),
            c.getLocal("pr")
        ));
        for (let i=1; i<3; i++) {
            f.addCode(c.call(
                prefixField + "_fromMontgomery",
                c.i32_add(c.getLocal("p1"), c.i32_const(i*n8)),
                c.i32_add(c.getLocal("pr"), c.i32_const(i*n8))
            ));
        }
    }


    function buildFromMontgomeryAffine() {
        const f = module.addFunction(prefix + "_fromMontgomeryAffine");
        f.addParam("p1", "i32");
        f.addParam("pr", "i32");

        const c = f.getCodeBuilder();

        f.addCode(c.call(
            prefixField + "_fromMontgomery",
            c.getLocal("p1"),
            c.getLocal("pr")
        ));
        for (let i=1; i<2; i++) {
            f.addCode(c.call(
                prefixField + "_fromMontgomery",
                c.i32_add(c.getLocal("p1"), c.i32_const(i*n8)),
                c.i32_add(c.getLocal("pr"), c.i32_const(i*n8))
            ));
        }
    }

    function buildAdd() {

        const f = module.addFunction(prefix + "_add");
        f.addParam("p1", "i32");
        f.addParam("p2", "i32");
        f.addParam("pr", "i32");
        f.addLocal("z1", "i32");
        f.addLocal("z2", "i32");

        const c = f.getCodeBuilder();

        const x1 = c.getLocal("p1");
        const y1 = c.i32_add(c.getLocal("p1"), c.i32_const(n8));
        f.addCode(c.setLocal("z1", c.i32_add(c.getLocal("p1"), c.i32_const(n8*2))));
        const z1 = c.getLocal("z1");
        const x2 = c.getLocal("p2");
        const y2 = c.i32_add(c.getLocal("p2"), c.i32_const(n8));
        f.addCode(c.setLocal("z2", c.i32_add(c.getLocal("p2"), c.i32_const(n8*2))));
        const z2 = c.getLocal("z2");
        const x3 = c.getLocal("pr");
        const y3 = c.i32_add(c.getLocal("pr"), c.i32_const(n8));
        const z3 = c.i32_add(c.getLocal("pr"), c.i32_const(n8*2));

        const Z1Z1 = c.i32_const(module.alloc(n8));
        const Z2Z2 = c.i32_const(module.alloc(n8));
        const U1 = c.i32_const(module.alloc(n8));
        const U2 = c.i32_const(module.alloc(n8));
        const Z1_cubed = c.i32_const(module.alloc(n8));
        const Z2_cubed = c.i32_const(module.alloc(n8));
        const S1 = c.i32_const(module.alloc(n8));
        const S2 = c.i32_const(module.alloc(n8));
        const H = c.i32_const(module.alloc(n8));
        const S2_minus_S1 = c.i32_const(module.alloc(n8));
        const I = c.i32_const(module.alloc(n8));
        const J = c.i32_const(module.alloc(n8));
        const r = c.i32_const(module.alloc(n8));
        const r2 = c.i32_const(module.alloc(n8));
        const V = c.i32_const(module.alloc(n8));
        const V2 = c.i32_const(module.alloc(n8));
        const S1_J2 = c.i32_const(module.alloc(n8));

        f.addCode(
            c.if(
                c.call(prefix + "_isZero", c.getLocal("p1")),
                [
                    ...c.call(prefix + "_copy", c.getLocal("p2"), c.getLocal("pr")),
                    ...c.ret([])
                ]
            ),
            c.if(
                c.call(prefix + "_isZero", c.getLocal("p2")),
                [
                    ...c.call(prefix + "_copy", c.getLocal("p1"), c.getLocal("pr")),
                    ...c.ret([])
                ]
            ),
            c.if(
                c.call(prefixField + "_isOne", z1),
                [
                    ...c.call(prefix + "_addMixed", x2, x1, x3),
                    ...c.ret([])
                ]
            ),
            c.if(
                c.call(prefixField + "_isOne", z2),
                [
                    ...c.call(prefix + "_addMixed", x1, x2, x3),
                    ...c.ret([])
                ]
            ),
            c.call(prefixField + "_square", z1, Z1Z1),
            c.call(prefixField + "_square", z2, Z2Z2),
            c.call(prefixField + "_mul", x1, Z2Z2, U1),
            c.call(prefixField + "_mul", x2, Z1Z1, U2),
            c.call(prefixField + "_mul", z1, Z1Z1, Z1_cubed),
            c.call(prefixField + "_mul", z2, Z2Z2, Z2_cubed),
            c.call(prefixField + "_mul", y1, Z2_cubed, S1),
            c.call(prefixField + "_mul", y2, Z1_cubed, S2),

            c.if(
                c.call(prefixField + "_eq", U1, U2),
                c.if(
                    c.call(prefixField + "_eq", S1, S2),
                    [
                        ...c.call(prefix + "_double", c.getLocal("p1"), c.getLocal("pr")),
                        ...c.ret([])
                    ]
                )
            ),

            c.call(prefixField + "_sub", U2, U1, H),
            c.call(prefixField + "_sub", S2, S1, S2_minus_S1),
            c.call(prefixField + "_add", H, H, I),
            c.call(prefixField + "_square", I, I),
            c.call(prefixField + "_mul", H, I, J),
            c.call(prefixField + "_add", S2_minus_S1, S2_minus_S1, r),
            c.call(prefixField + "_mul", U1, I, V),
            c.call(prefixField + "_square", r, r2),
            c.call(prefixField + "_add", V, V, V2),

            c.call(prefixField + "_sub", r2, J, x3),
            c.call(prefixField + "_sub", x3, V2, x3),

            c.call(prefixField + "_mul", S1, J, S1_J2),
            c.call(prefixField + "_add", S1_J2, S1_J2, S1_J2),

            c.call(prefixField + "_sub", V, x3, y3),
            c.call(prefixField + "_mul", y3, r, y3),
            c.call(prefixField + "_sub", y3, S1_J2, y3),

            c.call(prefixField + "_add", z1, z2, z3),
            c.call(prefixField + "_square", z3, z3),
            c.call(prefixField + "_sub", z3, Z1Z1, z3),
            c.call(prefixField + "_sub", z3, Z2Z2, z3),
            c.call(prefixField + "_mul", z3, H, z3),
        );

    }


    function buildAddMixed() {

        const f = module.addFunction(prefix + "_addMixed");
        f.addParam("p1", "i32");
        f.addParam("p2", "i32");
        f.addParam("pr", "i32");
        f.addLocal("z1", "i32");

        const c = f.getCodeBuilder();

        const x1 = c.getLocal("p1");
        const y1 = c.i32_add(c.getLocal("p1"), c.i32_const(n8));
        f.addCode(c.setLocal("z1", c.i32_add(c.getLocal("p1"), c.i32_const(n8*2))));
        const z1 = c.getLocal("z1");
        const x2 = c.getLocal("p2");
        const y2 = c.i32_add(c.getLocal("p2"), c.i32_const(n8));
        const x3 = c.getLocal("pr");
        const y3 = c.i32_add(c.getLocal("pr"), c.i32_const(n8));
        const z3 = c.i32_add(c.getLocal("pr"), c.i32_const(n8*2));

        const Z1Z1 = c.i32_const(module.alloc(n8));
        const U2 = c.i32_const(module.alloc(n8));
        const Z1_cubed = c.i32_const(module.alloc(n8));
        const S2 = c.i32_const(module.alloc(n8));
        const H = c.i32_const(module.alloc(n8));
        const HH = c.i32_const(module.alloc(n8));
        const S2_minus_y1 = c.i32_const(module.alloc(n8));
        const I = c.i32_const(module.alloc(n8));
        const J = c.i32_const(module.alloc(n8));
        const r = c.i32_const(module.alloc(n8));
        const r2 = c.i32_const(module.alloc(n8));
        const V = c.i32_const(module.alloc(n8));
        const V2 = c.i32_const(module.alloc(n8));
        const y1_J2 = c.i32_const(module.alloc(n8));

        f.addCode(
            c.if(
                c.call(prefix + "_isZero", c.getLocal("p1")),
                [
                    ...c.call(prefix + "_copyAffine", c.getLocal("p2"), c.getLocal("pr")),
                    ...c.call(prefixField + "_one", c.i32_add(c.getLocal("pr") , c.i32_const(n8*2))),
                    ...c.ret([])
                ]
            ),
            c.if(
                c.call(prefix + "_isZeroAffine", c.getLocal("p2")),
                [
                    ...c.call(prefix + "_copy", c.getLocal("p1"), c.getLocal("pr")),
                    ...c.ret([])
                ]
            ),
            c.if(
                c.call(prefixField + "_isOne", z1),
                [
                    ...c.call(prefix + "_addAffine", x1, x2, x3),
                    ...c.ret([])
                ]
            ),
            c.call(prefixField + "_square", z1, Z1Z1),
            c.call(prefixField + "_mul", x2, Z1Z1, U2),
            c.call(prefixField + "_mul", z1, Z1Z1, Z1_cubed),
            c.call(prefixField + "_mul", y2, Z1_cubed, S2),

            c.if(
                c.call(prefixField + "_eq", x1, U2),
                c.if(
                    c.call(prefixField + "_eq", y1, S2),
                    [
                        ...c.call(prefix + "_doubleAffine", c.getLocal("p2"), c.getLocal("pr")),
                        ...c.ret([])
                    ]
                )
            ),

            c.call(prefixField + "_sub", U2, x1, H),
            c.call(prefixField + "_sub", S2, y1, S2_minus_y1),
            c.call(prefixField + "_square", H, HH),
            c.call(prefixField + "_add", HH , HH, I),
            c.call(prefixField + "_add", I , I, I),
            c.call(prefixField + "_mul", H, I, J),
            c.call(prefixField + "_add", S2_minus_y1, S2_minus_y1, r),
            c.call(prefixField + "_mul", x1, I, V),
            c.call(prefixField + "_square", r, r2),
            c.call(prefixField + "_add", V, V, V2),

            c.call(prefixField + "_sub", r2, J, x3),
            c.call(prefixField + "_sub", x3, V2, x3),

            c.call(prefixField + "_mul", y1, J, y1_J2),
            c.call(prefixField + "_add", y1_J2, y1_J2, y1_J2),

            c.call(prefixField + "_sub", V, x3, y3),
            c.call(prefixField + "_mul", y3, r, y3),
            c.call(prefixField + "_sub", y3, y1_J2, y3),

            c.call(prefixField + "_add", z1, H, z3),
            c.call(prefixField + "_square", z3, z3),
            c.call(prefixField + "_sub", z3, Z1Z1, z3),
            c.call(prefixField + "_sub", z3, HH, z3),
        );
    }


    function buildAddAffine() {

        const f = module.addFunction(prefix + "_addAffine");
        f.addParam("p1", "i32");
        f.addParam("p2", "i32");
        f.addParam("pr", "i32");
        f.addLocal("z1", "i32");

        const c = f.getCodeBuilder();

        const x1 = c.getLocal("p1");
        const y1 = c.i32_add(c.getLocal("p1"), c.i32_const(n8));
        f.addCode(c.setLocal("z1", c.i32_add(c.getLocal("p1"), c.i32_const(n8*2))));
        const x2 = c.getLocal("p2");
        const y2 = c.i32_add(c.getLocal("p2"), c.i32_const(n8));
        const x3 = c.getLocal("pr");
        const y3 = c.i32_add(c.getLocal("pr"), c.i32_const(n8));
        const z3 = c.i32_add(c.getLocal("pr"), c.i32_const(n8*2));

        const H = c.i32_const(module.alloc(n8));
        const HH = c.i32_const(module.alloc(n8));
        const y2_minus_y1 = c.i32_const(module.alloc(n8));
        const I = c.i32_const(module.alloc(n8));
        const J = c.i32_const(module.alloc(n8));
        const r = c.i32_const(module.alloc(n8));
        const r2 = c.i32_const(module.alloc(n8));
        const V = c.i32_const(module.alloc(n8));
        const V2 = c.i32_const(module.alloc(n8));
        const y1_J2 = c.i32_const(module.alloc(n8));

        f.addCode(
            c.if(
                c.call(prefix + "_isZeroAffine", c.getLocal("p1")),
                [
                    ...c.call(prefix + "_copyAffine", c.getLocal("p2"), c.getLocal("pr")),
                    ...c.call(prefixField + "_one", c.i32_add(c.getLocal("pr") , c.i32_const(n8*2))),
                    ...c.ret([])
                ]
            ),
            c.if(
                c.call(prefix + "_isZeroAffine", c.getLocal("p2")),
                [
                    ...c.call(prefix + "_copyAffine", c.getLocal("p1"), c.getLocal("pr")),
                    ...c.call(prefixField + "_one", c.i32_add(c.getLocal("pr") , c.i32_const(n8*2))),
                    ...c.ret([])
                ]
            ),


            c.if(
                c.call(prefixField + "_eq", x1, x2),
                c.if(
                    c.call(prefixField + "_eq", y1, y2),
                    [
                        ...c.call(prefix + "_doubleAffine", c.getLocal("p2"), c.getLocal("pr")),
                        ...c.ret([])
                    ]
                )
            ),

            c.call(prefixField + "_sub", x2, x1, H),
            c.call(prefixField + "_sub", y2, y1, y2_minus_y1),
            c.call(prefixField + "_square", H, HH),
            c.call(prefixField + "_add", HH , HH, I),
            c.call(prefixField + "_add", I , I, I),
            c.call(prefixField + "_mul", H, I, J),
            c.call(prefixField + "_add", y2_minus_y1, y2_minus_y1, r),
            c.call(prefixField + "_mul", x1, I, V),
            c.call(prefixField + "_square", r, r2),
            c.call(prefixField + "_add", V, V, V2),

            c.call(prefixField + "_sub", r2, J, x3),
            c.call(prefixField + "_sub", x3, V2, x3),

            c.call(prefixField + "_mul", y1, J, y1_J2),
            c.call(prefixField + "_add", y1_J2, y1_J2, y1_J2),

            c.call(prefixField + "_sub", V, x3, y3),
            c.call(prefixField + "_mul", y3, r, y3),
            c.call(prefixField + "_sub", y3, y1_J2, y3),

            c.call(prefixField + "_add", H, H, z3),
        );
    }

    function buildNeg() {
        const f = module.addFunction(prefix + "_neg");
        f.addParam("p1", "i32");
        f.addParam("pr", "i32");

        const c = f.getCodeBuilder();

        const x = c.getLocal("p1");
        const y = c.i32_add(c.getLocal("p1"), c.i32_const(n8));
        const z = c.i32_add(c.getLocal("p1"), c.i32_const(n8*2));
        const x3 = c.getLocal("pr");
        const y3 = c.i32_add(c.getLocal("pr"), c.i32_const(n8));
        const z3 = c.i32_add(c.getLocal("pr"), c.i32_const(n8*2));

        f.addCode(
            c.call(prefixField + "_copy", x, x3),
            c.call(prefixField + "_neg", y, y3),
            c.call(prefixField + "_copy", z, z3)
        );
    }


    function buildNegAffine() {
        const f = module.addFunction(prefix + "_negAffine");
        f.addParam("p1", "i32");
        f.addParam("pr", "i32");

        const c = f.getCodeBuilder();

        const x = c.getLocal("p1");
        const y = c.i32_add(c.getLocal("p1"), c.i32_const(n8));
        const x3 = c.getLocal("pr");
        const y3 = c.i32_add(c.getLocal("pr"), c.i32_const(n8));

        f.addCode(
            c.call(prefixField + "_copy", x, x3),
            c.call(prefixField + "_neg", y, y3),
        );
    }


    function buildSub() {
        const f = module.addFunction(prefix + "_sub");
        f.addParam("p1", "i32");
        f.addParam("p2", "i32");
        f.addParam("pr", "i32");

        const c = f.getCodeBuilder();

        const AUX = c.i32_const(module.alloc(n8*3));

        f.addCode(
            c.call(prefix + "_neg", c.getLocal("p2"), AUX),
            c.call(prefix + "_add", c.getLocal("p1"), AUX, c.getLocal("pr")),
        );
    }

    function buildSubMixed() {
        const f = module.addFunction(prefix + "_subMixed");
        f.addParam("p1", "i32");
        f.addParam("p2", "i32");
        f.addParam("pr", "i32");

        const c = f.getCodeBuilder();

        const AUX = c.i32_const(module.alloc(n8*3));

        f.addCode(
            c.call(prefix + "_negAffine", c.getLocal("p2"), AUX),
            c.call(prefix + "_addMixed", c.getLocal("p1"), AUX, c.getLocal("pr")),
        );
    }


    function buildSubAffine() {
        const f = module.addFunction(prefix + "_subAffine");
        f.addParam("p1", "i32");
        f.addParam("p2", "i32");
        f.addParam("pr", "i32");

        const c = f.getCodeBuilder();

        const AUX = c.i32_const(module.alloc(n8*3));

        f.addCode(
            c.call(prefix + "_negAffine", c.getLocal("p2"), AUX),
            c.call(prefix + "_addAffine", c.getLocal("p1"), AUX, c.getLocal("pr")),
        );
    }

    // This sets Z to One
    function buildNormalize() {
        const f = module.addFunction(prefix + "_normalize");
        f.addParam("p1", "i32");
        f.addParam("pr", "i32");

        const c = f.getCodeBuilder();

        const x = c.getLocal("p1");
        const y = c.i32_add(c.getLocal("p1"), c.i32_const(n8));
        const z = c.i32_add(c.getLocal("p1"), c.i32_const(n8*2));
        const x3 = c.getLocal("pr");
        const y3 = c.i32_add(c.getLocal("pr"), c.i32_const(n8));
        const z3 = c.i32_add(c.getLocal("pr"), c.i32_const(n8*2));


        const Z_inv = c.i32_const(module.alloc(n8));
        const Z2_inv = c.i32_const(module.alloc(n8));
        const Z3_inv = c.i32_const(module.alloc(n8));

        f.addCode(
            c.if(
                c.call(prefix + "_isZero", c.getLocal("p1")),
                c.call(prefix + "_zero", c.getLocal("pr")),
                [
                    ...c.call(prefixField + "_inverse", z, Z_inv),
                    ...c.call(prefixField + "_square", Z_inv, Z2_inv),
                    ...c.call(prefixField + "_mul", Z_inv, Z2_inv, Z3_inv),
                    ...c.call(prefixField + "_mul", x, Z2_inv, x3),
                    ...c.call(prefixField + "_mul", y, Z3_inv, y3),
                    ...c.call(prefixField + "_one", z3),
                ]
            )
        );
    }


    // Does not set Z.
    function buildToAffine() {
        const f = module.addFunction(prefix + "_toAffine");
        f.addParam("p1", "i32");
        f.addParam("pr", "i32");

        const c = f.getCodeBuilder();

        const x = c.getLocal("p1");
        const y = c.i32_add(c.getLocal("p1"), c.i32_const(n8));
        const z = c.i32_add(c.getLocal("p1"), c.i32_const(n8*2));
        const x3 = c.getLocal("pr");
        const y3 = c.i32_add(c.getLocal("pr"), c.i32_const(n8));


        const Z_inv = c.i32_const(module.alloc(n8));
        const Z2_inv = c.i32_const(module.alloc(n8));
        const Z3_inv = c.i32_const(module.alloc(n8));

        f.addCode(
            c.if(
                c.call(prefix + "_isZero", c.getLocal("p1")),
                [
                    ...c.call(prefixField + "_zero", x3),
                    ...c.call(prefixField + "_zero", y3),
                ],
                [
                    ...c.call(prefixField + "_inverse", z, Z_inv),
                    ...c.call(prefixField + "_square", Z_inv, Z2_inv),
                    ...c.call(prefixField + "_mul", Z_inv, Z2_inv, Z3_inv),
                    ...c.call(prefixField + "_mul", x, Z2_inv, x3),
                    ...c.call(prefixField + "_mul", y, Z3_inv, y3),
                ]
            )
        );
    }


    function buildToJacobian() {
        const f = module.addFunction(prefix + "_toJacobian");
        f.addParam("p1", "i32");
        f.addParam("pr", "i32");

        const c = f.getCodeBuilder();

        const x = c.getLocal("p1");
        const y = c.i32_add(c.getLocal("p1"), c.i32_const(n8));
        const x3 = c.getLocal("pr");
        const y3 = c.i32_add(c.getLocal("pr"), c.i32_const(n8));
        const z3 = c.i32_add(c.getLocal("pr"), c.i32_const(n8*2));

        f.addCode(
            c.if(
                c.call(prefix + "_isZeroAffine", c.getLocal("p1")),
                c.call(prefix + "_zero", c.getLocal("pr")),
                [
                    ...c.call(prefixField + "_one", z3),
                    ...c.call(prefixField + "_copy", y, y3),
                    ...c.call(prefixField + "_copy", x, x3)
                ]
            )
        );
    }

    function buildBatchToAffine() {
        const f = module.addFunction(prefix + "_batchToAffine");
        f.addParam("pIn", "i32");
        f.addParam("n", "i32");
        f.addParam("pOut", "i32");
        f.addLocal("pAux", "i32");
        f.addLocal("itIn", "i32");
        f.addLocal("itAux", "i32");
        f.addLocal("itOut", "i32");
        f.addLocal("i", "i32");

        const c = f.getCodeBuilder();

        const tmp = c.i32_const(module.alloc(n8));

        f.addCode(
            c.setLocal("pAux", c.i32_load( c.i32_const(0) )),
            c.i32_store(
                c.i32_const(0),
                c.i32_add(
                    c.getLocal("pAux"),
                    c.i32_mul(c.getLocal("n"), c.i32_const(n8))
                )
            ),

            c.call(
                prefixField + "_batchInverse",
                c.i32_add(c.getLocal("pIn"), c.i32_const(n8*2)),
                c.i32_const(n8*3),
                c.getLocal("n"),
                c.getLocal("pAux"),
                c.i32_const(n8)
            ),

            c.setLocal("itIn", c.getLocal("pIn")),
            c.setLocal("itAux", c.getLocal("pAux")),
            c.setLocal("itOut", c.getLocal("pOut")),
            c.setLocal("i", c.i32_const(0)),
            c.block(c.loop(
                c.br_if(1, c.i32_eq ( c.getLocal("i"), c.getLocal("n") )),

                c.if(
                    c.call(prefixField + "_isZero", c.getLocal("itAux")),
                    [
                        ...c.call(prefixField + "_zero", c.getLocal("itOut")),
                        ...c.call(prefixField + "_zero", c.i32_add(c.getLocal("itOut"), c.i32_const(n8)))
                    ],
                    [
                        ...c.call(
                            prefixField+"_mul",
                            c.getLocal("itAux"),
                            c.i32_add(c.getLocal("itIn"), c.i32_const(n8)),
                            tmp,
                        ),
                        ...c.call(
                            prefixField+"_square",
                            c.getLocal("itAux"),
                            c.getLocal("itAux")
                        ),
                        ...c.call(
                            prefixField+"_mul",
                            c.getLocal("itAux"),
                            c.getLocal("itIn"),
                            c.getLocal("itOut"),
                        ),
                        ...c.call(
                            prefixField+"_mul",
                            c.getLocal("itAux"),
                            tmp,
                            c.i32_add(c.getLocal("itOut"), c.i32_const(n8)),
                        ),
                    ]
                ),

                c.setLocal("itIn", c.i32_add(c.getLocal("itIn"), c.i32_const(n8*3))),
                c.setLocal("itOut", c.i32_add(c.getLocal("itOut"), c.i32_const(n8*2))),
                c.setLocal("itAux", c.i32_add(c.getLocal("itAux"), c.i32_const(n8))),
                c.setLocal("i", c.i32_add(c.getLocal("i"), c.i32_const(1))),
                c.br(0)
            )),
            c.i32_store(
                c.i32_const(0),
                c.getLocal("pAux")
            )
        );
    }


    // This function is private and does not allow to OVERLAP buffers.
    function buildReverseBytes() {
        const f = module.addFunction(prefix + "__reverseBytes");
        f.addParam("pIn", "i32");
        f.addParam("n", "i32");
        f.addParam("pOut", "i32");
        f.addLocal("itOut", "i32");
        f.addLocal("itIn", "i32");

        const c = f.getCodeBuilder();

        f.addCode(
            c.setLocal(
                "itOut",
                c.i32_sub(
                    c.i32_add(
                        c.getLocal("pOut"),
                        c.getLocal("n")
                    ),
                    c.i32_const(1)
                )
            ),
            c.setLocal(
                "itIn",
                c.getLocal("pIn")
            ),
            c.block(c.loop(
                c.br_if(1, c.i32_lt_s( c.getLocal("itOut"), c.getLocal("pOut") )),
                c.i32_store8(
                    c.getLocal("itOut"),
                    c.i32_load8_u(c.getLocal("itIn")),
                ),
                c.setLocal("itOut", c.i32_sub(c.getLocal("itOut"), c.i32_const(1))),
                c.setLocal("itIn", c.i32_add(c.getLocal("itIn"), c.i32_const(1))),
                c.br(0)
            )),
        );

    }

    function buildLEMtoC() {
        const f = module.addFunction(prefix + "_LEMtoC");
        f.addParam("pIn", "i32");
        f.addParam("pOut", "i32");

        const c = f.getCodeBuilder();

        const tmp = c.i32_const(module.alloc(n8));

        f.addCode(
            c.if(
                c.call(prefix + "_isZeroAffine", c.getLocal("pIn")),
                [
                    ...c.call(prefixField + "_zero", c.getLocal("pOut")),
                    ...c.i32_store8(
                        c.getLocal("pOut"),
                        c.i32_const(0x40)
                    ),
                    ...c.ret([])
                ]
            ),
            c.call(prefixField + "_fromMontgomery", c.getLocal("pIn"), tmp),
            c.call(prefix + "__reverseBytes", tmp, c.i32_const(n8), c.getLocal("pOut")),
            c.if(
                c.i32_eq(
                    c.call(prefixField + "_sign", c.i32_add(c.getLocal("pIn"), c.i32_const(n8))),
                    c.i32_const(-1)
                ),
                c.i32_store8(
                    c.getLocal("pOut"),
                    c.i32_or(
                        c.i32_load8_u(c.getLocal("pOut")),
                        c.i32_const(0x80)
                    )
                )
            ),
        );
    }

    function buildLEMtoU() {
        const f = module.addFunction(prefix + "_LEMtoU");
        f.addParam("pIn", "i32");
        f.addParam("pOut", "i32");

        const c = f.getCodeBuilder();

        const pTmp = module.alloc(n8*2);
        const tmp = c.i32_const(pTmp);
        const tmpX = c.i32_const(pTmp);
        const tmpY = c.i32_const(pTmp + n8);

        f.addCode(
            c.if(
                c.call(prefix + "_isZeroAffine", c.getLocal("pIn")),
                [
                    ...c.call(prefix + "_zeroAffine", c.getLocal("pOut")),
                    ...c.ret([])
                ]
            ),

            c.call(prefix + "_fromMontgomeryAffine", c.getLocal("pIn"), tmp),

            c.call(prefix + "__reverseBytes", tmpX, c.i32_const(n8), c.getLocal("pOut")),
            c.call(prefix + "__reverseBytes", tmpY, c.i32_const(n8), c.i32_add(c.getLocal("pOut"), c.i32_const(n8))),
        );
    }

    function buildUtoLEM() {
        const f = module.addFunction(prefix + "_UtoLEM");
        f.addParam("pIn", "i32");
        f.addParam("pOut", "i32");

        const c = f.getCodeBuilder();

        const pTmp = module.alloc(n8*2);
        const tmp = c.i32_const(pTmp);
        const tmpX = c.i32_const(pTmp);
        const tmpY = c.i32_const(pTmp + n8);

        f.addCode(
            c.if(
                c.i32_and(c.i32_load8_u(c.getLocal("pIn")), c.i32_const(0x40)),
                [
                    ...c.call(prefix + "_zeroAffine", c.getLocal("pOut")),
                    ...c.ret([])
                ]
            ),
            c.call(prefix + "__reverseBytes", c.getLocal("pIn"), c.i32_const(n8), tmpX),
            c.call(prefix + "__reverseBytes", c.i32_add(c.getLocal("pIn"), c.i32_const(n8)), c.i32_const(n8), tmpY),
            c.call(prefix + "_toMontgomeryAffine", tmp,  c.getLocal("pOut"))
        );
    }

    function buildCtoLEM() {
        const f = module.addFunction(prefix + "_CtoLEM");
        f.addParam("pIn", "i32");
        f.addParam("pOut", "i32");
        f.addLocal("firstByte", "i32");
        f.addLocal("greatest", "i32");

        const c = f.getCodeBuilder();

        const pTmp = module.alloc(n8*2);
        const tmpX = c.i32_const(pTmp);
        const tmpY = c.i32_const(pTmp + n8);

        f.addCode(
            c.setLocal("firstByte", c.i32_load8_u(c.getLocal("pIn"))),
            c.if(
                c.i32_and(
                    c.getLocal("firstByte"),
                    c.i32_const(0x40)
                ),
                [
                    ...c.call(prefix + "_zeroAffine", c.getLocal("pOut")),
                    ...c.ret([])
                ]
            ),
            c.setLocal(
                "greatest",
                c.i32_and(
                    c.getLocal("firstByte"),
                    c.i32_const(0x80)
                )
            ),

            c.call(prefixField + "_copy", c.getLocal("pIn"), tmpY),
            c.i32_store8(tmpY, c.i32_and(c.getLocal("firstByte"), c.i32_const(0x3F))),
            c.call(prefix + "__reverseBytes", tmpY, c.i32_const(n8), tmpX),
            c.call(prefixField + "_toMontgomery", tmpX, c.getLocal("pOut")),

            c.call(prefixField + "_square", c.getLocal("pOut"), tmpY),
            c.call(prefixField + "_mul", c.getLocal("pOut"), tmpY,  tmpY),
            c.call(prefixField + "_add", tmpY, c.i32_const(pB),  tmpY),

            c.call(prefixField + "_sqrt", tmpY, tmpY),
            c.call(prefixField + "_neg", tmpY, tmpX),

            c.if(
                c.i32_eq(
                    c.call(prefixField + "_sign", tmpY),
                    c.i32_const(-1)
                ),
                c.if(
                    c.getLocal("greatest"),
                    c.call(prefixField + "_copy", tmpY, c.i32_add(c.getLocal("pOut"), c.i32_const(n8))),
                    c.call(prefixField + "_neg", tmpY, c.i32_add(c.getLocal("pOut"), c.i32_const(n8)))
                ),
                c.if(
                    c.getLocal("greatest"),
                    c.call(prefixField + "_neg", tmpY, c.i32_add(c.getLocal("pOut"), c.i32_const(n8))),
                    c.call(prefixField + "_copy", tmpY, c.i32_add(c.getLocal("pOut"), c.i32_const(n8)))
                ),
            )

        );
    }

    function buildInCurveAffine() {
        const f = module.addFunction(prefix + "_inCurveAffine");
        f.addParam("pIn", "i32");
        f.setReturnType("i32");

        const c = f.getCodeBuilder();

        const x = c.getLocal("pIn");
        const y = c.i32_add(c.getLocal("pIn"), c.i32_const(n8));

        const y2 = c.i32_const(module.alloc(n8));
        const x3b = c.i32_const(module.alloc(n8));

        f.addCode(
            c.call(prefixField + "_square", y, y2),
            c.call(prefixField + "_square", x, x3b),
            c.call(prefixField + "_mul", x, x3b, x3b),
            c.call(prefixField + "_add", x3b, c.i32_const(pB), x3b),

            c.ret(
                c.call(prefixField + "_eq", y2, x3b)
            )
        );
    }

    function buildInCurve() {
        const f = module.addFunction(prefix + "_inCurve");
        f.addParam("pIn", "i32");
        f.setReturnType("i32");

        const c = f.getCodeBuilder();

        const aux = c.i32_const(module.alloc(n8*2));

        f.addCode(
            c.call(prefix + "_toAffine", c.getLocal("pIn"), aux),

            c.ret(
                c.call(prefix + "_inCurveAffine", aux),
            )
        );
    }

    buildIsZeroAffine();
    buildIsZero();
    buildZeroAffine();
    buildZero();
    buildCopyAffine();
    buildCopy();
    buildToJacobian();
    buildEqAffine();
    buildEqMixed();
    buildEq();
    buildDoubleAffine();
    buildDouble();
    buildAddAffine();
    buildAddMixed();
    buildAdd();
    buildNegAffine();
    buildNeg();
    buildSubAffine();
    buildSubMixed();
    buildSub();
    buildFromMontgomeryAffine();
    buildFromMontgomery();
    buildToMontgomeryAffine();
    buildToMontgomery();
    buildToAffine();
    buildInCurveAffine();
    buildInCurve();

    buildBatchToAffine();

    buildNormalize();


    buildReverseBytes();

    buildLEMtoU();
    buildLEMtoC();
    buildUtoLEM();
    buildCtoLEM();

    buildBatchConvertion(module, prefix + "_batchLEMtoU", prefix + "_LEMtoU", n8*2, n8*2);
    buildBatchConvertion(module, prefix + "_batchLEMtoC", prefix + "_LEMtoC", n8*2, n8);
    buildBatchConvertion(module, prefix + "_batchUtoLEM", prefix + "_UtoLEM", n8*2, n8*2);
    buildBatchConvertion(module, prefix + "_batchCtoLEM", prefix + "_CtoLEM", n8, n8*2, true);

    buildBatchConvertion(module, prefix + "_batchToJacobian", prefix + "_toJacobian", n8*2, n8*3, true);

    buildMultiexp(module, prefix, prefix + "_multiexp", prefix + "_add", n8*3);
    buildMultiexp(module, prefix, prefix + "_multiexpAffine", prefix + "_addMixed", n8*2);

    /*
    buildTimesScalar(
        module,
        prefix + "_timesScalarOld",
        n8*3,
        prefix + "_add",
        prefix + "_double",
        prefix + "_copy",
        prefix + "_zero",
    );
    */
    buildTimesScalarNAF(
        module,
        prefix + "_timesScalar",
        n8*3,
        prefix + "_add",
        prefix + "_double",
        prefix + "_sub",
        prefix + "_copy",
        prefix + "_zero"
    );

    buildTimesScalarNAF(
        module,
        prefix + "_timesScalarAffine",
        n8*2,
        prefix + "_addMixed",
        prefix + "_double",
        prefix + "_subMixed",
        prefix + "_copyAffine",
        prefix + "_zero"
    );

    module.exportFunction(prefix + "_isZero");
    module.exportFunction(prefix + "_isZeroAffine");

    module.exportFunction(prefix + "_eq");
    module.exportFunction(prefix + "_eqMixed");
    module.exportFunction(prefix + "_eqAffine");

    module.exportFunction(prefix + "_copy");
    module.exportFunction(prefix + "_copyAffine");

    module.exportFunction(prefix + "_zero");
    module.exportFunction(prefix + "_zeroAffine");

    module.exportFunction(prefix + "_double");
    module.exportFunction(prefix + "_doubleAffine");

    module.exportFunction(prefix + "_add");
    module.exportFunction(prefix + "_addMixed");
    module.exportFunction(prefix + "_addAffine");

    module.exportFunction(prefix + "_neg");
    module.exportFunction(prefix + "_negAffine");

    module.exportFunction(prefix + "_sub");
    module.exportFunction(prefix + "_subMixed");
    module.exportFunction(prefix + "_subAffine");

    module.exportFunction(prefix + "_fromMontgomery");
    module.exportFunction(prefix + "_fromMontgomeryAffine");

    module.exportFunction(prefix + "_toMontgomery");
    module.exportFunction(prefix + "_toMontgomeryAffine");

    module.exportFunction(prefix + "_timesScalar");
    module.exportFunction(prefix + "_timesScalarAffine");

    module.exportFunction(prefix + "_normalize");

    // Convertion functions
    module.exportFunction(prefix + "_LEMtoU");
    module.exportFunction(prefix + "_LEMtoC");
    module.exportFunction(prefix + "_UtoLEM");
    module.exportFunction(prefix + "_CtoLEM");

    module.exportFunction(prefix + "_batchLEMtoU");
    module.exportFunction(prefix + "_batchLEMtoC");
    module.exportFunction(prefix + "_batchUtoLEM");
    module.exportFunction(prefix + "_batchCtoLEM");

    module.exportFunction(prefix + "_toAffine");
    module.exportFunction(prefix + "_toJacobian");

    module.exportFunction(prefix + "_batchToAffine");
    module.exportFunction(prefix + "_batchToJacobian");

    module.exportFunction(prefix + "_inCurve");
    module.exportFunction(prefix + "_inCurveAffine");

    /*
    buildG1MulScalar(module, zq);
    module.exportFunction("g1MulScalar");
    */

    return prefix;
};


/***/ }),

/***/ 138:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

/*
    Copyright 2019 0KIMS association.

    This file is part of wasmsnark (Web Assembly zkSnark Prover).

    wasmsnark is a free software: you can redistribute it and/or modify it
    under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    wasmsnark is distributed in the hope that it will be useful, but WITHOUT
    ANY WARRANTY; without even the implied warranty of MERCHANTABILITY
    or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public
    License for more details.

    You should have received a copy of the GNU General Public License
    along with wasmsnark. If not, see <https://www.gnu.org/licenses/>.
*/

const buildF1m =__webpack_require__(75);
const { bitLength } = __webpack_require__(409);

module.exports = function buildF1(module, _q, _prefix, _f1mPrefix, _intPrefix) {

    const q = BigInt(_q);
    const n64 = Math.floor((bitLength(q - 1n) - 1)/64) +1;
    const n8 = n64*8;

    const prefix = _prefix || "f1";
    if (module.modules[prefix]) return prefix;  // already builded
    module.modules[prefix] = {
        n64: n64
    };

    const intPrefix = _intPrefix || "int";
    const f1mPrefix = buildF1m(module, q, _f1mPrefix, intPrefix);


    const pR2 =     module.modules[f1mPrefix].pR2;
    const pq =     module.modules[f1mPrefix].pq;
    const pePlusOne = module.modules[f1mPrefix].pePlusOne;

    function buildMul() {
        const pAux1 = module.alloc(n8);

        const f = module.addFunction(prefix+ "_mul");
        f.addParam("x", "i32");
        f.addParam("y", "i32");
        f.addParam("r", "i32");

        const c = f.getCodeBuilder();
        f.addCode(c.call(f1mPrefix + "_mul", c.getLocal("x"), c.getLocal("y"), c.i32_const(pAux1)));
        f.addCode(c.call(f1mPrefix + "_mul", c.i32_const(pAux1), c.i32_const(pR2), c.getLocal("r")));
    }

    function buildSquare() {
        const f = module.addFunction(prefix+"_square");
        f.addParam("x", "i32");
        f.addParam("r", "i32");

        const c = f.getCodeBuilder();

        f.addCode(c.call(prefix + "_mul", c.getLocal("x"), c.getLocal("x"), c.getLocal("r")));
    }


    function buildInverse() {

        const f = module.addFunction(prefix+ "_inverse");
        f.addParam("x", "i32");
        f.addParam("r", "i32");

        const c = f.getCodeBuilder();
        f.addCode(c.call(intPrefix + "_inverseMod", c.getLocal("x"), c.i32_const(pq), c.getLocal("r")));
    }

    function buildIsNegative() {
        const f = module.addFunction(prefix+"_isNegative");
        f.addParam("x", "i32");
        f.setReturnType("i32");

        const c = f.getCodeBuilder();

        f.addCode(
            c.call(intPrefix + "_gte", c.getLocal("x"), c.i32_const(pePlusOne) )
        );
    }


    buildMul();
    buildSquare();
    buildInverse();
    buildIsNegative();
    module.exportFunction(f1mPrefix + "_add", prefix + "_add");
    module.exportFunction(f1mPrefix + "_sub", prefix + "_sub");
    module.exportFunction(f1mPrefix + "_neg", prefix + "_neg");
    module.exportFunction(prefix + "_mul");
    module.exportFunction(prefix + "_square");
    module.exportFunction(prefix + "_inverse");
    module.exportFunction(prefix + "_isNegative");
    module.exportFunction(f1mPrefix + "_copy", prefix+"_copy");
    module.exportFunction(f1mPrefix + "_zero", prefix+"_zero");
    module.exportFunction(f1mPrefix + "_one", prefix+"_one");
    module.exportFunction(f1mPrefix + "_isZero", prefix+"_isZero");
    module.exportFunction(f1mPrefix + "_eq", prefix+"_eq");

    return prefix;
};


/***/ }),

/***/ 75:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

/*
    Copyright 2019 0KIMS association.

    This file is part of wasmsnark (Web Assembly zkSnark Prover).

    wasmsnark is a free software: you can redistribute it and/or modify it
    under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    wasmsnark is distributed in the hope that it will be useful, but WITHOUT
    ANY WARRANTY; without even the implied warranty of MERCHANTABILITY
    or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public
    License for more details.

    You should have received a copy of the GNU General Public License
    along with wasmsnark. If not, see <https://www.gnu.org/licenses/>.
*/

const buildInt = __webpack_require__(754);
const utils = __webpack_require__(333);
const buildExp = __webpack_require__(345);
const buildBatchInverse = __webpack_require__(163);
const buildBatchConvertion = __webpack_require__(440);
const buildBatchOp = __webpack_require__(948);
const { bitLength, modInv, modPow, isPrime, isOdd, square } = __webpack_require__(409);

module.exports = function buildF1m(module, _q, _prefix, _intPrefix) {
    const q = BigInt(_q);
    const n64 = Math.floor((bitLength(q - 1n) - 1)/64) +1;
    const n32 = n64*2;
    const n8 = n64*8;

    const prefix = _prefix || "f1m";
    if (module.modules[prefix]) return prefix;  // already builded

    const intPrefix = buildInt(module, n64, _intPrefix);
    const pq = module.alloc(n8, utils.bigInt2BytesLE(q, n8));

    const pR2 = module.alloc(utils.bigInt2BytesLE(square(1n << BigInt(n64*64)) % q, n8));
    const pOne = module.alloc(utils.bigInt2BytesLE((1n << BigInt(n64*64)) % q, n8));
    const pZero = module.alloc(utils.bigInt2BytesLE(0n, n8));
    const _minusOne = q - 1n;
    const _e = _minusOne >> 1n; // e = (p-1)/2
    const pe = module.alloc(n8, utils.bigInt2BytesLE(_e, n8));

    const _ePlusOne = _e + 1n; // e = (p-1)/2
    const pePlusOne = module.alloc(n8, utils.bigInt2BytesLE(_ePlusOne, n8));

    module.modules[prefix] = {
        pq: pq,
        pR2: pR2,
        n64: n64,
        q: q,
        pOne: pOne,
        pZero: pZero,
        pePlusOne: pePlusOne
    };

    function buildOne() {
        const f = module.addFunction(prefix+"_one");
        f.addParam("pr", "i32");

        const c = f.getCodeBuilder();

        f.addCode(c.call(intPrefix + "_copy", c.i32_const(pOne), c.getLocal("pr")));
    }

    function buildAdd() {
        const f = module.addFunction(prefix+"_add");
        f.addParam("x", "i32");
        f.addParam("y", "i32");
        f.addParam("r", "i32");

        const c = f.getCodeBuilder();

        f.addCode(
            c.if(
                c.call(intPrefix+"_add", c.getLocal("x"),  c.getLocal("y"), c.getLocal("r")),
                c.drop(c.call(intPrefix+"_sub", c.getLocal("r"), c.i32_const(pq), c.getLocal("r"))),
                c.if(
                    c.call(intPrefix+"_gte", c.getLocal("r"), c.i32_const(pq)  ),
                    c.drop(c.call(intPrefix+"_sub", c.getLocal("r"), c.i32_const(pq), c.getLocal("r"))),
                )
            )
        );
    }

    function buildSub() {
        const f = module.addFunction(prefix+"_sub");
        f.addParam("x", "i32");
        f.addParam("y", "i32");
        f.addParam("r", "i32");

        const c = f.getCodeBuilder();

        f.addCode(
            c.if(
                c.call(intPrefix+"_sub", c.getLocal("x"),  c.getLocal("y"), c.getLocal("r")),
                c.drop(c.call(intPrefix+"_add", c.getLocal("r"),  c.i32_const(pq), c.getLocal("r")))
            )
        );
    }

    function buildNeg() {
        const f = module.addFunction(prefix+"_neg");
        f.addParam("x", "i32");
        f.addParam("r", "i32");

        const c = f.getCodeBuilder();

        f.addCode(
            c.call(prefix + "_sub", c.i32_const(pZero), c.getLocal("x"), c.getLocal("r"))
        );
    }


    function buildIsNegative() {
        const f = module.addFunction(prefix+"_isNegative");
        f.addParam("x", "i32");
        f.setReturnType("i32");

        const c = f.getCodeBuilder();

        const AUX = c.i32_const(module.alloc(n8));

        f.addCode(
            c.call(prefix + "_fromMontgomery", c.getLocal("x"), AUX),
            c.call(intPrefix + "_gte", AUX, c.i32_const(pePlusOne) )
        );
    }

    function buildSign() {
        const f = module.addFunction(prefix+"_sign");
        f.addParam("x", "i32");
        f.setReturnType("i32");

        const c = f.getCodeBuilder();

        const AUX = c.i32_const(module.alloc(n8));

        f.addCode(
            c.if (
                c.call(intPrefix + "_isZero", c.getLocal("x")),
                c.ret(c.i32_const(0))
            ),
            c.call(prefix + "_fromMontgomery", c.getLocal("x"), AUX),
            c.if(
                c.call(intPrefix + "_gte", AUX, c.i32_const(pePlusOne)),
                c.ret(c.i32_const(-1))
            ),
            c.ret(c.i32_const(1))
        );
    }


    function buildMReduct() {
        const carries = module.alloc(n32*n32*8);

        const f = module.addFunction(prefix+"_mReduct");
        f.addParam("t", "i32");
        f.addParam("r", "i32");
        f.addLocal("np32", "i64");
        f.addLocal("c", "i64");
        f.addLocal("m", "i64");

        const c = f.getCodeBuilder();

        const np32 = Number(0x100000000n - modInv(q, 0x100000000n));

        f.addCode(c.setLocal("np32", c.i64_const(np32)));

        for (let i=0; i<n32; i++) {
            f.addCode(c.setLocal("c", c.i64_const(0)));

            f.addCode(
                c.setLocal(
                    "m",
                    c.i64_and(
                        c.i64_mul(
                            c.i64_load32_u(c.getLocal("t"), i*4),
                            c.getLocal("np32")
                        ),
                        c.i64_const("0xFFFFFFFF")
                    )
                )
            );

            for (let j=0; j<n32; j++) {

                f.addCode(
                    c.setLocal("c",
                        c.i64_add(
                            c.i64_add(
                                c.i64_load32_u(c.getLocal("t"), (i+j)*4),
                                c.i64_shr_u(c.getLocal("c"), c.i64_const(32))
                            ),
                            c.i64_mul(
                                c.i64_load32_u(c.i32_const(pq), j*4),
                                c.getLocal("m")
                            )
                        )
                    )
                );

                f.addCode(
                    c.i64_store32(
                        c.getLocal("t"),
                        (i+j)*4,
                        c.getLocal("c")
                    )
                );
            }

            f.addCode(
                c.i64_store32(
                    c.i32_const(carries),
                    i*4,
                    c.i64_shr_u(c.getLocal("c"), c.i64_const(32))
                )
            );
        }

        f.addCode(
            c.call(
                prefix+"_add",
                c.i32_const(carries),
                c.i32_add(
                    c.getLocal("t"),
                    c.i32_const(n32*4)
                ),
                c.getLocal("r")
            )
        );
    }



    function buildMul() {

        const f = module.addFunction(prefix+"_mul");
        f.addParam("x", "i32");
        f.addParam("y", "i32");
        f.addParam("r", "i32");
        f.addLocal("c0", "i64");
        f.addLocal("c1", "i64");
        f.addLocal("np32", "i64");


        for (let i=0;i<n32; i++) {
            f.addLocal("x"+i, "i64");
            f.addLocal("y"+i, "i64");
            f.addLocal("m"+i, "i64");
            f.addLocal("q"+i, "i64");
        }

        const c = f.getCodeBuilder();

        const np32 = Number(0x100000000n - modInv(q, 0x100000000n));

        f.addCode(c.setLocal("np32", c.i64_const(np32)));


        const loadX = [];
        const loadY = [];
        const loadQ = [];
        function mulij(i, j) {
            let X,Y;
            if (!loadX[i]) {
                X = c.teeLocal("x"+i, c.i64_load32_u( c.getLocal("x"), i*4));
                loadX[i] = true;
            } else {
                X = c.getLocal("x"+i);
            }
            if (!loadY[j]) {
                Y = c.teeLocal("y"+j, c.i64_load32_u( c.getLocal("y"), j*4));
                loadY[j] = true;
            } else {
                Y = c.getLocal("y"+j);
            }

            return c.i64_mul( X, Y );
        }

        function mulqm(i, j) {
            let Q,M;
            if (!loadQ[i]) {
                Q = c.teeLocal("q"+i, c.i64_load32_u(c.i32_const(0), pq+i*4 ));
                loadQ[i] = true;
            } else {
                Q = c.getLocal("q"+i);
            }
            M = c.getLocal("m"+j);

            return c.i64_mul( Q, M );
        }


        let c0 = "c0";
        let c1 = "c1";

        for (let k=0; k<n32*2-1; k++) {
            for (let i=Math.max(0, k-n32+1); (i<=k)&&(i<n32); i++) {
                const j= k-i;

                f.addCode(
                    c.setLocal(c0,
                        c.i64_add(
                            c.i64_and(
                                c.getLocal(c0),
                                c.i64_const(0xFFFFFFFF)
                            ),
                            mulij(i,j)
                        )
                    )
                );

                f.addCode(
                    c.setLocal(c1,
                        c.i64_add(
                            c.getLocal(c1),
                            c.i64_shr_u(
                                c.getLocal(c0),
                                c.i64_const(32)
                            )
                        )
                    )
                );
            }


            for (let i=Math.max(1, k-n32+1); (i<=k)&&(i<n32); i++) {
                const j= k-i;

                f.addCode(
                    c.setLocal(c0,
                        c.i64_add(
                            c.i64_and(
                                c.getLocal(c0),
                                c.i64_const(0xFFFFFFFF)
                            ),
                            mulqm(i,j)
                        )
                    )
                );

                f.addCode(
                    c.setLocal(c1,
                        c.i64_add(
                            c.getLocal(c1),
                            c.i64_shr_u(
                                c.getLocal(c0),
                                c.i64_const(32)
                            )
                        )
                    )
                );
            }
            if (k<n32) {
                f.addCode(
                    c.setLocal(
                        "m"+k,
                        c.i64_and(
                            c.i64_mul(
                                c.i64_and(
                                    c.getLocal(c0),
                                    c.i64_const(0xFFFFFFFF)
                                ),
                                c.getLocal("np32")
                            ),
                            c.i64_const("0xFFFFFFFF")
                        )
                    )
                );


                f.addCode(
                    c.setLocal(c0,
                        c.i64_add(
                            c.i64_and(
                                c.getLocal(c0),
                                c.i64_const(0xFFFFFFFF)
                            ),
                            mulqm(0,k)
                        )
                    )
                );

                f.addCode(
                    c.setLocal(c1,
                        c.i64_add(
                            c.getLocal(c1),
                            c.i64_shr_u(
                                c.getLocal(c0),
                                c.i64_const(32)
                            )
                        )
                    )
                );
            }


            if (k>=n32) {
                f.addCode(
                    c.i64_store32(
                        c.getLocal("r"),
                        (k-n32)*4,
                        c.getLocal(c0)
                    )
                );
            }
            [c0, c1] = [c1, c0];
            f.addCode(
                c.setLocal(c1,
                    c.i64_shr_u(
                        c.getLocal(c0),
                        c.i64_const(32)
                    )
                )
            );
        }
        f.addCode(
            c.i64_store32(
                c.getLocal("r"),
                n32*4-4,
                c.getLocal(c0)
            )
        );

        f.addCode(
            c.if(
                c.i32_wrap_i64(c.getLocal(c1)),
                c.drop(c.call(intPrefix+"_sub", c.getLocal("r"), c.i32_const(pq), c.getLocal("r"))),
                c.if(
                    c.call(intPrefix+"_gte", c.getLocal("r"), c.i32_const(pq)  ),
                    c.drop(c.call(intPrefix+"_sub", c.getLocal("r"), c.i32_const(pq), c.getLocal("r"))),
                )
            )
        );
    }


    function buildSquare() {

        const f = module.addFunction(prefix+"_square");
        f.addParam("x", "i32");
        f.addParam("r", "i32");
        f.addLocal("c0", "i64");
        f.addLocal("c1", "i64");
        f.addLocal("c0_old", "i64");
        f.addLocal("c1_old", "i64");
        f.addLocal("np32", "i64");


        for (let i=0;i<n32; i++) {
            f.addLocal("x"+i, "i64");
            f.addLocal("m"+i, "i64");
            f.addLocal("q"+i, "i64");
        }

        const c = f.getCodeBuilder();

        const np32 = Number(0x100000000n - modInv(q, 0x100000000n));

        f.addCode(c.setLocal("np32", c.i64_const(np32)));


        const loadX = [];
        const loadQ = [];
        function mulij(i, j) {
            let X,Y;
            if (!loadX[i]) {
                X = c.teeLocal("x"+i, c.i64_load32_u( c.getLocal("x"), i*4));
                loadX[i] = true;
            } else {
                X = c.getLocal("x"+i);
            }
            if (!loadX[j]) {
                Y = c.teeLocal("x"+j, c.i64_load32_u( c.getLocal("x"), j*4));
                loadX[j] = true;
            } else {
                Y = c.getLocal("x"+j);
            }

            return c.i64_mul( X, Y );
        }

        function mulqm(i, j) {
            let Q,M;
            if (!loadQ[i]) {
                Q = c.teeLocal("q"+i, c.i64_load32_u(c.i32_const(0), pq+i*4 ));
                loadQ[i] = true;
            } else {
                Q = c.getLocal("q"+i);
            }
            M = c.getLocal("m"+j);

            return c.i64_mul( Q, M );
        }


        let c0 = "c0";
        let c1 = "c1";
        let c0_old = "c0_old";
        let c1_old = "c1_old";

        for (let k=0; k<n32*2-1; k++) {
            f.addCode(
                c.setLocal(c0, c.i64_const(0)),
                c.setLocal(c1, c.i64_const(0)),
            );
            for (let i=Math.max(0, k-n32+1); (i<((k+1)>>1) )&&(i<n32); i++) {
                const j= k-i;

                f.addCode(
                    c.setLocal(c0,
                        c.i64_add(
                            c.i64_and(
                                c.getLocal(c0),
                                c.i64_const(0xFFFFFFFF)
                            ),
                            mulij(i,j)
                        )
                    )
                );

                f.addCode(
                    c.setLocal(c1,
                        c.i64_add(
                            c.getLocal(c1),
                            c.i64_shr_u(
                                c.getLocal(c0),
                                c.i64_const(32)
                            )
                        )
                    )
                );
            }

            // Multiply by 2
            f.addCode(
                c.setLocal(c0,
                    c.i64_shl(
                        c.i64_and(
                            c.getLocal(c0),
                            c.i64_const(0xFFFFFFFF)
                        ),
                        c.i64_const(1)
                    )
                )
            );

            f.addCode(
                c.setLocal(c1,
                    c.i64_add(
                        c.i64_shl(
                            c.getLocal(c1),
                            c.i64_const(1)
                        ),
                        c.i64_shr_u(
                            c.getLocal(c0),
                            c.i64_const(32)
                        )
                    )
                )
            );

            if (k%2 == 0) {
                f.addCode(
                    c.setLocal(c0,
                        c.i64_add(
                            c.i64_and(
                                c.getLocal(c0),
                                c.i64_const(0xFFFFFFFF)
                            ),
                            mulij(k>>1, k>>1)
                        )
                    )
                );

                f.addCode(
                    c.setLocal(c1,
                        c.i64_add(
                            c.getLocal(c1),
                            c.i64_shr_u(
                                c.getLocal(c0),
                                c.i64_const(32)
                            )
                        )
                    )
                );
            }

            // Add the old carry

            if (k>0) {
                f.addCode(
                    c.setLocal(c0,
                        c.i64_add(
                            c.i64_and(
                                c.getLocal(c0),
                                c.i64_const(0xFFFFFFFF)
                            ),
                            c.i64_and(
                                c.getLocal(c0_old),
                                c.i64_const(0xFFFFFFFF)
                            ),
                        )
                    )
                );

                f.addCode(
                    c.setLocal(c1,
                        c.i64_add(
                            c.i64_add(
                                c.getLocal(c1),
                                c.i64_shr_u(
                                    c.getLocal(c0),
                                    c.i64_const(32)
                                )
                            ),
                            c.getLocal(c1_old)
                        )
                    )
                );
            }


            for (let i=Math.max(1, k-n32+1); (i<=k)&&(i<n32); i++) {
                const j= k-i;

                f.addCode(
                    c.setLocal(c0,
                        c.i64_add(
                            c.i64_and(
                                c.getLocal(c0),
                                c.i64_const(0xFFFFFFFF)
                            ),
                            mulqm(i,j)
                        )
                    )
                );

                f.addCode(
                    c.setLocal(c1,
                        c.i64_add(
                            c.getLocal(c1),
                            c.i64_shr_u(
                                c.getLocal(c0),
                                c.i64_const(32)
                            )
                        )
                    )
                );
            }
            if (k<n32) {
                f.addCode(
                    c.setLocal(
                        "m"+k,
                        c.i64_and(
                            c.i64_mul(
                                c.i64_and(
                                    c.getLocal(c0),
                                    c.i64_const(0xFFFFFFFF)
                                ),
                                c.getLocal("np32")
                            ),
                            c.i64_const("0xFFFFFFFF")
                        )
                    )
                );


                f.addCode(
                    c.setLocal(c0,
                        c.i64_add(
                            c.i64_and(
                                c.getLocal(c0),
                                c.i64_const(0xFFFFFFFF)
                            ),
                            mulqm(0,k)
                        )
                    )
                );

                f.addCode(
                    c.setLocal(c1,
                        c.i64_add(
                            c.getLocal(c1),
                            c.i64_shr_u(
                                c.getLocal(c0),
                                c.i64_const(32)
                            )
                        )
                    )
                );
            }

            if (k>=n32) {
                f.addCode(
                    c.i64_store32(
                        c.getLocal("r"),
                        (k-n32)*4,
                        c.getLocal(c0)
                    )
                );
            }
            f.addCode(
                c.setLocal(
                    c0_old,
                    c.getLocal(c1)
                ),
                c.setLocal(
                    c1_old,
                    c.i64_shr_u(
                        c.getLocal(c0_old),
                        c.i64_const(32)
                    )
                )
            );
        }
        f.addCode(
            c.i64_store32(
                c.getLocal("r"),
                n32*4-4,
                c.getLocal(c0_old)
            )
        );

        f.addCode(
            c.if(
                c.i32_wrap_i64(c.getLocal(c1_old)),
                c.drop(c.call(intPrefix+"_sub", c.getLocal("r"), c.i32_const(pq), c.getLocal("r"))),
                c.if(
                    c.call(intPrefix+"_gte", c.getLocal("r"), c.i32_const(pq)  ),
                    c.drop(c.call(intPrefix+"_sub", c.getLocal("r"), c.i32_const(pq), c.getLocal("r"))),
                )
            )
        );
    }


    function buildSquareOld() {
        const f = module.addFunction(prefix+"_squareOld");
        f.addParam("x", "i32");
        f.addParam("r", "i32");

        const c = f.getCodeBuilder();

        f.addCode(c.call(prefix + "_mul", c.getLocal("x"), c.getLocal("x"), c.getLocal("r")));
    }

    function buildToMontgomery() {
        const f = module.addFunction(prefix+"_toMontgomery");
        f.addParam("x", "i32");
        f.addParam("r", "i32");

        const c = f.getCodeBuilder();
        f.addCode(c.call(prefix+"_mul", c.getLocal("x"), c.i32_const(pR2), c.getLocal("r")));
    }

    function buildFromMontgomery() {

        const pAux2 = module.alloc(n8*2);

        const f = module.addFunction(prefix+"_fromMontgomery");
        f.addParam("x", "i32");
        f.addParam("r", "i32");

        const c = f.getCodeBuilder();
        f.addCode(c.call(intPrefix + "_copy", c.getLocal("x"), c.i32_const(pAux2) ));
        f.addCode(c.call(intPrefix + "_zero", c.i32_const(pAux2 + n8) ));
        f.addCode(c.call(prefix+"_mReduct", c.i32_const(pAux2), c.getLocal("r")));
    }

    function buildInverse() {

        const f = module.addFunction(prefix+ "_inverse");
        f.addParam("x", "i32");
        f.addParam("r", "i32");

        const c = f.getCodeBuilder();
        f.addCode(c.call(prefix + "_fromMontgomery", c.getLocal("x"), c.getLocal("r")));
        f.addCode(c.call(intPrefix + "_inverseMod", c.getLocal("r"), c.i32_const(pq), c.getLocal("r")));
        f.addCode(c.call(prefix + "_toMontgomery", c.getLocal("r"), c.getLocal("r")));
    }

    // Calculate various valuse needed for sqrt


    let _nqr = 2n;
    if (isPrime(q)) {
        while (modPow(_nqr, _e, q) !== _minusOne) _nqr = _nqr + 1n;
    }

    let s2 = 0;
    let _t = _minusOne;

    while ((!isOdd(_t))&&(_t !== 0n)) {
        s2++;
        _t = _t >> 1n;
    }
    const pt = module.alloc(n8, utils.bigInt2BytesLE(_t, n8));

    const _nqrToT = modPow(_nqr, _t, q);
    const pNqrToT = module.alloc(utils.bigInt2BytesLE((_nqrToT << BigInt(n64*64)) % q, n8));

    const _tPlusOneOver2 = (_t + 1n) >> 1n;
    const ptPlusOneOver2 = module.alloc(n8, utils.bigInt2BytesLE(_tPlusOneOver2, n8));

    function buildSqrt() {

        const f = module.addFunction(prefix+ "_sqrt");
        f.addParam("n", "i32");
        f.addParam("r", "i32");
        f.addLocal("m", "i32");
        f.addLocal("i", "i32");
        f.addLocal("j", "i32");

        const c = f.getCodeBuilder();

        const ONE = c.i32_const(pOne);
        const C = c.i32_const(module.alloc(n8));
        const T = c.i32_const(module.alloc(n8));
        const R = c.i32_const(module.alloc(n8));
        const SQ = c.i32_const(module.alloc(n8));
        const B = c.i32_const(module.alloc(n8));

        f.addCode(

            // If (n==0) return 0
            c.if(
                c.call(prefix + "_isZero", c.getLocal("n")),
                c.ret(
                    c.call(prefix + "_zero", c.getLocal("r"))
                )
            ),

            c.setLocal("m", c.i32_const(s2)),
            c.call(prefix + "_copy", c.i32_const(pNqrToT), C),
            c.call(prefix + "_exp", c.getLocal("n"), c.i32_const(pt), c.i32_const(n8), T),
            c.call(prefix + "_exp", c.getLocal("n"), c.i32_const(ptPlusOneOver2), c.i32_const(n8), R),

            c.block(c.loop(
                c.br_if(1, c.call(prefix + "_eq", T, ONE)),

                c.call(prefix + "_square", T, SQ),
                c.setLocal("i", c.i32_const(1)),
                c.block(c.loop(
                    c.br_if(1, c.call(prefix + "_eq", SQ, ONE)),
                    c.call(prefix + "_square", SQ, SQ),
                    c.setLocal("i", c.i32_add(c.getLocal("i"), c.i32_const(1))),
                    c.br(0)
                )),

                c.call(prefix + "_copy", C, B),
                c.setLocal("j", c.i32_sub(c.i32_sub( c.getLocal("m"), c.getLocal("i")), c.i32_const(1)) ),
                c.block(c.loop(
                    c.br_if(1, c.i32_eqz(c.getLocal("j"))),
                    c.call(prefix + "_square", B, B),
                    c.setLocal("j", c.i32_sub(c.getLocal("j"), c.i32_const(1))),
                    c.br(0)
                )),

                c.setLocal("m", c.getLocal("i")),
                c.call(prefix + "_square", B, C),
                c.call(prefix + "_mul", T, C, T),
                c.call(prefix + "_mul", R, B, R),

                c.br(0)
            )),

            c.if(
                c.call(prefix + "_isNegative", R),
                c.call(prefix + "_neg", R, c.getLocal("r")),
                c.call(prefix + "_copy", R, c.getLocal("r")),
            )
        );
    }

    function buildIsSquare() {
        const f = module.addFunction(prefix+"_isSquare");
        f.addParam("n", "i32");
        f.setReturnType("i32");

        const c = f.getCodeBuilder();

        const ONE = c.i32_const(pOne);
        const AUX = c.i32_const(module.alloc(n8));

        f.addCode(
            c.if(
                c.call(prefix + "_isZero", c.getLocal("n")),
                c.ret(c.i32_const(1))
            ),
            c.call(prefix + "_exp", c.getLocal("n"), c.i32_const(pe), c.i32_const(n8), AUX),
            c.call(prefix + "_eq", AUX, ONE)
        );
    }


    function buildLoad() {
        const f = module.addFunction(prefix+"_load");
        f.addParam("scalar", "i32");
        f.addParam("scalarLen", "i32");
        f.addParam("r", "i32");
        f.addLocal("p", "i32");
        f.addLocal("l", "i32");
        f.addLocal("i", "i32");
        f.addLocal("j", "i32");
        const c = f.getCodeBuilder();

        const R = c.i32_const(module.alloc(n8));
        const pAux = module.alloc(n8);
        const AUX = c.i32_const(pAux);

        f.addCode(
            c.call(intPrefix + "_zero", c.getLocal("r")),
            c.setLocal("i", c.i32_const(n8)),
            c.setLocal("p", c.getLocal("scalar")),
            c.block(c.loop(
                c.br_if(1, c.i32_gt_u(c.getLocal("i"), c.getLocal("scalarLen"))),

                c.if(
                    c.i32_eq(c.getLocal("i"), c.i32_const(n8)),
                    c.call(prefix + "_one", R),
                    c.call(prefix + "_mul", R, c.i32_const(pR2), R)
                ),
                c.call(prefix + "_mul", c.getLocal("p"), R, AUX),
                c.call(prefix + "_add", c.getLocal("r"), AUX, c.getLocal("r")),

                c.setLocal("p", c.i32_add(c.getLocal("p"), c.i32_const(n8))),
                c.setLocal("i", c.i32_add(c.getLocal("i"), c.i32_const(n8))),
                c.br(0)
            )),

            c.setLocal("l", c.i32_rem_u( c.getLocal("scalarLen"), c.i32_const(n8))),
            c.if(c.i32_eqz(c.getLocal("l")), c.ret([])),
            c.call(intPrefix + "_zero", AUX),
            c.setLocal("j", c.i32_const(0)),
            c.block(c.loop(
                c.br_if(1, c.i32_eq(c.getLocal("j"), c.getLocal("l"))),

                c.i32_store8(
                    c.getLocal("j"),
                    pAux,
                    c.i32_load8_u(c.getLocal("p")),
                ),
                c.setLocal("p", c.i32_add(c.getLocal("p"), c.i32_const(1))),
                c.setLocal("j", c.i32_add(c.getLocal("j"), c.i32_const(1))),
                c.br(0)
            )),

            c.if(
                c.i32_eq(c.getLocal("i"), c.i32_const(n8)),
                c.call(prefix + "_one", R),
                c.call(prefix + "_mul", R, c.i32_const(pR2), R)
            ),
            c.call(prefix + "_mul", AUX, R, AUX),
            c.call(prefix + "_add", c.getLocal("r"), AUX, c.getLocal("r")),
        );
    }

    function buildTimesScalar() {
        const f = module.addFunction(prefix+"_timesScalar");
        f.addParam("x", "i32");
        f.addParam("scalar", "i32");
        f.addParam("scalarLen", "i32");
        f.addParam("r", "i32");

        const c = f.getCodeBuilder();

        const AUX = c.i32_const(module.alloc(n8));

        f.addCode(
            c.call(prefix + "_load", c.getLocal("scalar"), c.getLocal("scalarLen"), AUX),
            c.call(prefix + "_toMontgomery", AUX, AUX),
            c.call(prefix + "_mul", c.getLocal("x"), AUX, c.getLocal("r")),
        );
    }

    function buildIsOne() {
        const f = module.addFunction(prefix+"_isOne");
        f.addParam("x", "i32");
        f.setReturnType("i32");

        const c = f.getCodeBuilder();
        f.addCode(
            c.ret(c.call(intPrefix + "_eq", c.getLocal("x"), c.i32_const(pOne)))
        );
    }


    module.exportFunction(intPrefix + "_copy", prefix+"_copy");
    module.exportFunction(intPrefix + "_zero", prefix+"_zero");
    module.exportFunction(intPrefix + "_isZero", prefix+"_isZero");
    module.exportFunction(intPrefix + "_eq", prefix+"_eq");

    buildIsOne();
    buildAdd();
    buildSub();
    buildNeg();
    buildMReduct();
    buildMul();
    buildSquare();
    buildSquareOld();
    buildToMontgomery();
    buildFromMontgomery();
    buildIsNegative();
    buildSign();
    buildInverse();
    buildOne();
    buildLoad();
    buildTimesScalar();
    buildBatchInverse(module, prefix);
    buildBatchConvertion(module, prefix + "_batchToMontgomery", prefix + "_toMontgomery", n8, n8);
    buildBatchConvertion(module, prefix + "_batchFromMontgomery", prefix + "_fromMontgomery", n8, n8);
    buildBatchConvertion(module, prefix + "_batchNeg", prefix + "_neg", n8, n8);
    buildBatchOp(module, prefix + "_batchAdd", prefix + "_add", n8, n8);
    buildBatchOp(module, prefix + "_batchSub", prefix + "_sub", n8, n8);
    buildBatchOp(module, prefix + "_batchMul", prefix + "_mul", n8, n8);

    module.exportFunction(prefix + "_add");
    module.exportFunction(prefix + "_sub");
    module.exportFunction(prefix + "_neg");
    module.exportFunction(prefix + "_isNegative");
    module.exportFunction(prefix + "_isOne");
    module.exportFunction(prefix + "_sign");
    module.exportFunction(prefix + "_mReduct");
    module.exportFunction(prefix + "_mul");
    module.exportFunction(prefix + "_square");
    module.exportFunction(prefix + "_squareOld");
    module.exportFunction(prefix + "_fromMontgomery");
    module.exportFunction(prefix + "_toMontgomery");
    module.exportFunction(prefix + "_inverse");
    module.exportFunction(prefix + "_one");
    module.exportFunction(prefix + "_load");
    module.exportFunction(prefix + "_timesScalar");
    buildExp(
        module,
        prefix + "_exp",
        n8,
        prefix + "_mul",
        prefix + "_square",
        intPrefix + "_copy",
        prefix + "_one",
    );
    module.exportFunction(prefix + "_exp");
    module.exportFunction(prefix + "_batchInverse");
    if (isPrime(q)) {
        buildSqrt();
        buildIsSquare();
        module.exportFunction(prefix + "_sqrt");
        module.exportFunction(prefix + "_isSquare");
    }
    module.exportFunction(prefix + "_batchToMontgomery");
    module.exportFunction(prefix + "_batchFromMontgomery");
    // console.log(module.functionIdxByName);

    return prefix;
};


/***/ }),

/***/ 420:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

/*
    Copyright 2019 0KIMS association.

    This file is part of wasmsnark (Web Assembly zkSnark Prover).

    wasmsnark is a free software: you can redistribute it and/or modify it
    under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    wasmsnark is distributed in the hope that it will be useful, but WITHOUT
    ANY WARRANTY; without even the implied warranty of MERCHANTABILITY
    or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public
    License for more details.

    You should have received a copy of the GNU General Public License
    along with wasmsnark. If not, see <https://www.gnu.org/licenses/>.
*/
const buildExp = __webpack_require__(345);
const buildBatchInverse = __webpack_require__(163);
const utils = __webpack_require__(333);

module.exports = function buildF2m(module, mulNonResidueFn, prefix, f1mPrefix) {

    if (module.modules[prefix]) return prefix;  // already builded

    const f1n8 = module.modules[f1mPrefix].n64*8;
    const q = module.modules[f1mPrefix].q;

    module.modules[prefix] = {
        n64: module.modules[f1mPrefix].n64*2
    };

    function buildAdd() {
        const f = module.addFunction(prefix+"_add");
        f.addParam("x", "i32");
        f.addParam("y", "i32");
        f.addParam("r", "i32");

        const c = f.getCodeBuilder();

        const x0 = c.getLocal("x");
        const x1 = c.i32_add(c.getLocal("x"), c.i32_const(f1n8));
        const y0 = c.getLocal("y");
        const y1 = c.i32_add(c.getLocal("y"), c.i32_const(f1n8));
        const r0 = c.getLocal("r");
        const r1 = c.i32_add(c.getLocal("r"), c.i32_const(f1n8));

        f.addCode(
            c.call(f1mPrefix+"_add", x0, y0, r0),
            c.call(f1mPrefix+"_add", x1, y1, r1),
        );
    }

    function buildTimesScalar() {
        const f = module.addFunction(prefix+"_timesScalar");
        f.addParam("x", "i32");
        f.addParam("scalar", "i32");
        f.addParam("scalarLen", "i32");
        f.addParam("r", "i32");

        const c = f.getCodeBuilder();

        const x0 = c.getLocal("x");
        const x1 = c.i32_add(c.getLocal("x"), c.i32_const(f1n8));
        const r0 = c.getLocal("r");
        const r1 = c.i32_add(c.getLocal("r"), c.i32_const(f1n8));

        f.addCode(
            c.call(f1mPrefix+"_timesScalar", x0, c.getLocal("scalar"), c.getLocal("scalarLen"), r0),
            c.call(f1mPrefix+"_timesScalar", x1, c.getLocal("scalar"), c.getLocal("scalarLen"), r1),
        );
    }

    function buildSub() {
        const f = module.addFunction(prefix+"_sub");
        f.addParam("x", "i32");
        f.addParam("y", "i32");
        f.addParam("r", "i32");

        const c = f.getCodeBuilder();

        const x0 = c.getLocal("x");
        const x1 = c.i32_add(c.getLocal("x"), c.i32_const(f1n8));
        const y0 = c.getLocal("y");
        const y1 = c.i32_add(c.getLocal("y"), c.i32_const(f1n8));
        const r0 = c.getLocal("r");
        const r1 = c.i32_add(c.getLocal("r"), c.i32_const(f1n8));

        f.addCode(
            c.call(f1mPrefix+"_sub", x0, y0, r0),
            c.call(f1mPrefix+"_sub", x1, y1, r1),
        );
    }

    function buildNeg() {
        const f = module.addFunction(prefix+"_neg");
        f.addParam("x", "i32");
        f.addParam("r", "i32");

        const c = f.getCodeBuilder();

        const x0 = c.getLocal("x");
        const x1 = c.i32_add(c.getLocal("x"), c.i32_const(f1n8));
        const r0 = c.getLocal("r");
        const r1 = c.i32_add(c.getLocal("r"), c.i32_const(f1n8));

        f.addCode(
            c.call(f1mPrefix+"_neg", x0, r0),
            c.call(f1mPrefix+"_neg", x1, r1),
        );
    }

    function buildConjugate() {
        const f = module.addFunction(prefix+"_conjugate");
        f.addParam("x", "i32");
        f.addParam("r", "i32");

        const c = f.getCodeBuilder();

        const x0 = c.getLocal("x");
        const x1 = c.i32_add(c.getLocal("x"), c.i32_const(f1n8));
        const r0 = c.getLocal("r");
        const r1 = c.i32_add(c.getLocal("r"), c.i32_const(f1n8));

        f.addCode(
            c.call(f1mPrefix+"_copy", x0, r0),
            c.call(f1mPrefix+"_neg", x1, r1),
        );
    }


    function buildIsNegative() {
        const f = module.addFunction(prefix+"_isNegative");
        f.addParam("x", "i32");
        f.setReturnType("i32");

        const c = f.getCodeBuilder();

        const x0 = c.getLocal("x");
        const x1 = c.i32_add(c.getLocal("x"), c.i32_const(f1n8));

        f.addCode(
            c.if(
                c.call(f1mPrefix+"_isZero", x1),
                c.ret(c.call(f1mPrefix+"_isNegative", x0))
            ),
            c.ret(c.call(f1mPrefix+"_isNegative", x1))
        );
    }

    function buildMul() {
        const f = module.addFunction(prefix+"_mul");
        f.addParam("x", "i32");
        f.addParam("y", "i32");
        f.addParam("r", "i32");

        const c = f.getCodeBuilder();

        const x0 = c.getLocal("x");
        const x1 = c.i32_add(c.getLocal("x"), c.i32_const(f1n8));
        const y0 = c.getLocal("y");
        const y1 = c.i32_add(c.getLocal("y"), c.i32_const(f1n8));
        const r0 = c.getLocal("r");
        const r1 = c.i32_add(c.getLocal("r"), c.i32_const(f1n8));

        const A = c.i32_const(module.alloc(f1n8));
        const B = c.i32_const(module.alloc(f1n8));
        const C = c.i32_const(module.alloc(f1n8));
        const D = c.i32_const(module.alloc(f1n8));


        f.addCode(
            c.call(f1mPrefix + "_mul", x0, y0, A),             // A = x0*y0
            c.call(f1mPrefix + "_mul", x1, y1, B),             // B = x1*y1

            c.call(f1mPrefix + "_add", x0, x1, C),             // C = x0 + x1
            c.call(f1mPrefix + "_add", y0, y1, D),             // D = y0 + y1
            c.call(f1mPrefix + "_mul", C, D, C),               // C = (x0 + x1)*(y0 + y1) = x0*y0+x0*y1+x1*y0+x1*y1

            //  c.call(f1mPrefix + "_mul", B, c.i32_const(pNonResidue), r0),  // r0 = nr*(x1*y1)
            c.call(mulNonResidueFn, B, r0),  // r0 = nr*(x1*y1)
            c.call(f1mPrefix + "_add", A, r0, r0),             // r0 = x0*y0 + nr*(x1*y1)
            c.call(f1mPrefix + "_add", A, B, r1),             // r1 = x0*y0+x1*y1
            c.call(f1mPrefix + "_sub", C, r1, r1)              // r1 = x0*y0+x0*y1+x1*y0+x1*y1 - x0*y0+x1*y1 = x0*y1+x1*y0
        );

    }

    function buildMul1() {
        const f = module.addFunction(prefix+"_mul1");
        f.addParam("x", "i32");
        f.addParam("y", "i32");
        f.addParam("r", "i32");

        const c = f.getCodeBuilder();

        const x0 = c.getLocal("x");
        const x1 = c.i32_add(c.getLocal("x"), c.i32_const(f1n8));
        const y = c.getLocal("y");
        const r0 = c.getLocal("r");
        const r1 = c.i32_add(c.getLocal("r"), c.i32_const(f1n8));


        f.addCode(
            c.call(f1mPrefix + "_mul", x0, y, r0),             // A = x0*y
            c.call(f1mPrefix + "_mul", x1, y, r1),             // B = x1*y
        );
    }

    function buildSquare() {
        const f = module.addFunction(prefix+"_square");
        f.addParam("x", "i32");
        f.addParam("r", "i32");

        const c = f.getCodeBuilder();

        const x0 = c.getLocal("x");
        const x1 = c.i32_add(c.getLocal("x"), c.i32_const(f1n8));
        const r0 = c.getLocal("r");
        const r1 = c.i32_add(c.getLocal("r"), c.i32_const(f1n8));

        const AB = c.i32_const(module.alloc(f1n8));
        const APB = c.i32_const(module.alloc(f1n8));
        const APNB = c.i32_const(module.alloc(f1n8));
        const ABPNAB = c.i32_const(module.alloc(f1n8));


        f.addCode(
            // AB = x0*y1
            c.call(f1mPrefix + "_mul", x0, x1, AB),

            // APB = x0+y1
            c.call(f1mPrefix + "_add", x0, x1, APB),

            // APBN0 = x0 + nr*x1
            c.call(mulNonResidueFn, x1, APNB),
            c.call(f1mPrefix + "_add", x0, APNB, APNB),

            // ABPNAB = ab + nr*ab
            c.call(mulNonResidueFn, AB, ABPNAB),
            c.call(f1mPrefix + "_add", ABPNAB, AB, ABPNAB),

            // r0 = APB * APNB - ABPNAB
            c.call(f1mPrefix + "_mul", APB, APNB, r0),
            c.call(f1mPrefix + "_sub", r0, ABPNAB, r0),

            // r1 = AB + AB
            c.call(f1mPrefix + "_add", AB, AB, r1),
        );

    }


    function buildToMontgomery() {
        const f = module.addFunction(prefix+"_toMontgomery");
        f.addParam("x", "i32");
        f.addParam("r", "i32");

        const c = f.getCodeBuilder();

        const x0 = c.getLocal("x");
        const x1 = c.i32_add(c.getLocal("x"), c.i32_const(f1n8));
        const r0 = c.getLocal("r");
        const r1 = c.i32_add(c.getLocal("r"), c.i32_const(f1n8));

        f.addCode(
            c.call(f1mPrefix+"_toMontgomery", x0, r0),
            c.call(f1mPrefix+"_toMontgomery", x1, r1)
        );
    }

    function buildFromMontgomery() {
        const f = module.addFunction(prefix+"_fromMontgomery");
        f.addParam("x", "i32");
        f.addParam("r", "i32");

        const c = f.getCodeBuilder();

        const x0 = c.getLocal("x");
        const x1 = c.i32_add(c.getLocal("x"), c.i32_const(f1n8));
        const r0 = c.getLocal("r");
        const r1 = c.i32_add(c.getLocal("r"), c.i32_const(f1n8));

        f.addCode(
            c.call(f1mPrefix+"_fromMontgomery", x0, r0),
            c.call(f1mPrefix+"_fromMontgomery", x1, r1)
        );
    }

    function buildCopy() {
        const f = module.addFunction(prefix+"_copy");
        f.addParam("x", "i32");
        f.addParam("r", "i32");

        const c = f.getCodeBuilder();

        const x0 = c.getLocal("x");
        const x1 = c.i32_add(c.getLocal("x"), c.i32_const(f1n8));
        const r0 = c.getLocal("r");
        const r1 = c.i32_add(c.getLocal("r"), c.i32_const(f1n8));

        f.addCode(
            c.call(f1mPrefix+"_copy", x0, r0),
            c.call(f1mPrefix+"_copy", x1, r1)
        );
    }

    function buildZero() {
        const f = module.addFunction(prefix+"_zero");
        f.addParam("x", "i32");

        const c = f.getCodeBuilder();

        const x0 = c.getLocal("x");
        const x1 = c.i32_add(c.getLocal("x"), c.i32_const(f1n8));

        f.addCode(
            c.call(f1mPrefix+"_zero", x0),
            c.call(f1mPrefix+"_zero", x1)
        );
    }

    function buildOne() {
        const f = module.addFunction(prefix+"_one");
        f.addParam("x", "i32");

        const c = f.getCodeBuilder();

        const x0 = c.getLocal("x");
        const x1 = c.i32_add(c.getLocal("x"), c.i32_const(f1n8));

        f.addCode(
            c.call(f1mPrefix+"_one", x0),
            c.call(f1mPrefix+"_zero", x1)
        );
    }

    function buildEq() {
        const f = module.addFunction(prefix+"_eq");
        f.addParam("x", "i32");
        f.addParam("y", "i32");
        f.setReturnType("i32");

        const c = f.getCodeBuilder();

        const x0 = c.getLocal("x");
        const x1 = c.i32_add(c.getLocal("x"), c.i32_const(f1n8));
        const y0 = c.getLocal("y");
        const y1 = c.i32_add(c.getLocal("y"), c.i32_const(f1n8));

        f.addCode(
            c.i32_and(
                c.call(f1mPrefix+"_eq", x0, y0),
                c.call(f1mPrefix+"_eq", x1, y1)
            )
        );
    }

    function buildIsZero() {
        const f = module.addFunction(prefix+"_isZero");
        f.addParam("x", "i32");
        f.setReturnType("i32");

        const c = f.getCodeBuilder();

        const x0 = c.getLocal("x");
        const x1 = c.i32_add(c.getLocal("x"), c.i32_const(f1n8));

        f.addCode(
            c.i32_and(
                c.call(f1mPrefix+"_isZero", x0),
                c.call(f1mPrefix+"_isZero", x1)
            )
        );
    }

    function buildInverse() {
        const f = module.addFunction(prefix+"_inverse");
        f.addParam("x", "i32");
        f.addParam("r", "i32");

        const c = f.getCodeBuilder();

        const x0 = c.getLocal("x");
        const x1 = c.i32_add(c.getLocal("x"), c.i32_const(f1n8));
        const r0 = c.getLocal("r");
        const r1 = c.i32_add(c.getLocal("r"), c.i32_const(f1n8));

        const t0 = c.i32_const(module.alloc(f1n8));
        const t1 = c.i32_const(module.alloc(f1n8));
        const t2 = c.i32_const(module.alloc(f1n8));
        const t3 = c.i32_const(module.alloc(f1n8));

        f.addCode(
            c.call(f1mPrefix+"_square", x0, t0),
            c.call(f1mPrefix+"_square", x1, t1),
            // c.call(f1mPrefix+"_mul", t1, c.i32_const(pNonResidue), t2),
            c.call(mulNonResidueFn, t1, t2),

            c.call(f1mPrefix+"_sub", t0, t2, t2),
            c.call(f1mPrefix+"_inverse", t2, t3),

            c.call(f1mPrefix+"_mul", x0, t3, r0),
            c.call(f1mPrefix+"_mul", x1, t3, r1),
            c.call(f1mPrefix+"_neg", r1, r1),
        );
    }


    function buildSign() {
        const f = module.addFunction(prefix+"_sign");
        f.addParam("x", "i32");
        f.addLocal("s", "i32");
        f.setReturnType("i32");

        const c = f.getCodeBuilder();

        const x0 = c.getLocal("x");
        const x1 = c.i32_add(c.getLocal("x"), c.i32_const(f1n8));

        f.addCode(
            c.setLocal("s" , c.call( f1mPrefix + "_sign", x1)),
            c.if(
                c.getLocal("s"),
                c.ret(c.getLocal("s"))
            ),
            c.ret(c.call( f1mPrefix + "_sign", x0))
        );
    }

    function buildIsOne() {
        const f = module.addFunction(prefix+"_isOne");
        f.addParam("x", "i32");
        f.setReturnType("i32");

        const c = f.getCodeBuilder();

        const x0 = c.getLocal("x");
        const x1 = c.i32_add(c.getLocal("x"), c.i32_const(f1n8));

        f.addCode(
            c.ret(c.i32_and(
                c.call(f1mPrefix + "_isOne", x0),
                c.call(f1mPrefix + "_isZero", x1),
            ))
        );
    }


    // Check here: https://eprint.iacr.org/2012/685.pdf
    // Alg 9adj
    function buildSqrt() {

        const f = module.addFunction(prefix+"_sqrt");
        f.addParam("a", "i32");
        f.addParam("pr", "i32");

        const c = f.getCodeBuilder();

        // BigInt can't take `undefined` so we use `|| 0`
        const e34 = c.i32_const(module.alloc(utils.bigInt2BytesLE((BigInt(q || 0) - 3n) / 4n, f1n8 )));
        // BigInt can't take `undefined` so we use `|| 0`
        const e12 = c.i32_const(module.alloc(utils.bigInt2BytesLE((BigInt(q || 0) - 1n) / 2n, f1n8 )));

        const a = c.getLocal("a");
        const a1 = c.i32_const(module.alloc(f1n8*2));
        const alpha = c.i32_const(module.alloc(f1n8*2));
        const a0 = c.i32_const(module.alloc(f1n8*2));
        const pn1 = module.alloc(f1n8*2);
        const n1 = c.i32_const(pn1);
        const n1a = c.i32_const(pn1);
        const n1b = c.i32_const(pn1+f1n8);
        const x0 = c.i32_const(module.alloc(f1n8*2));
        const b = c.i32_const(module.alloc(f1n8*2));

        f.addCode(

            c.call(prefix + "_one", n1),
            c.call(prefix + "_neg", n1, n1),

            // const a1 = F.pow(a, F.sqrt_e34);
            c.call(prefix + "_exp", a, e34, c.i32_const(f1n8), a1),

            // const a1 = F.pow(a, F.sqrt_e34);
            c.call(prefix + "_square", a1, alpha),
            c.call(prefix + "_mul", a, alpha, alpha),

            // const a0 = F.mul(F.frobenius(1, alfa), alfa);
            c.call(prefix + "_conjugate", alpha, a0),
            c.call(prefix + "_mul", a0, alpha, a0),

            // if (F.eq(a0, F.negone)) return null;
            c.if(c.call(prefix + "_eq",a0,n1), c.unreachable() ),

            // const x0 = F.mul(a1, a);
            c.call(prefix + "_mul", a1, a, x0),

            // if (F.eq(alfa, F.negone)) {
            c.if(
                c.call(prefix + "_eq", alpha, n1),
                [
                    // x = F.mul(x0, [F.F.zero, F.F.one]);
                    ...c.call(f1mPrefix + "_zero", n1a),
                    ...c.call(f1mPrefix + "_one", n1b),
                    ...c.call(prefix + "_mul", n1, x0, c.getLocal("pr")),
                ],
                [
                    // const b = F.pow(F.add(F.one, alfa), F.sqrt_e12);
                    ...c.call(prefix + "_one", b),
                    ...c.call(prefix + "_add", b, alpha, b),
                    ...c.call(prefix + "_exp", b, e12, c.i32_const(f1n8), b),

                    // x = F.mul(b, x0);
                    ...c.call(prefix + "_mul", b, x0, c.getLocal("pr")),
                ]
            )
        );

    }


    function buildIsSquare() {

        const f = module.addFunction(prefix+"_isSquare");
        f.addParam("a", "i32");
        f.setReturnType("i32");

        const c = f.getCodeBuilder();

        // BigInt can't take `undefined` so we use `|| 0`
        const e34 = c.i32_const(module.alloc(utils.bigInt2BytesLE((BigInt(q || 0) - 3n) / 4n, f1n8 )));

        const a = c.getLocal("a");
        const a1 = c.i32_const(module.alloc(f1n8*2));
        const alpha = c.i32_const(module.alloc(f1n8*2));
        const a0 = c.i32_const(module.alloc(f1n8*2));
        const pn1 = module.alloc(f1n8*2);
        const n1 = c.i32_const(pn1);

        f.addCode(

            c.call(prefix + "_one", n1),
            c.call(prefix + "_neg", n1, n1),

            // const a1 = F.pow(a, F.sqrt_e34);
            c.call(prefix + "_exp", a, e34, c.i32_const(f1n8), a1),

            // const a1 = F.pow(a, F.sqrt_e34);
            c.call(prefix + "_square", a1, alpha),
            c.call(prefix + "_mul", a, alpha, alpha),

            // const a0 = F.mul(F.frobenius(1, alfa), alfa);
            c.call(prefix + "_conjugate", alpha, a0),
            c.call(prefix + "_mul", a0, alpha, a0),

            // if (F.eq(a0, F.negone)) return null;
            c.if(
                c.call(
                    prefix + "_eq",
                    a0,
                    n1
                ),
                c.ret(c.i32_const(0))
            ),
            c.ret(c.i32_const(1))
        );

    }


    buildIsZero();
    buildIsOne();
    buildZero();
    buildOne();
    buildCopy();
    buildMul();
    buildMul1();
    buildSquare();
    buildAdd();
    buildSub();
    buildNeg();
    buildConjugate();
    buildToMontgomery();
    buildFromMontgomery();
    buildEq();
    buildInverse();
    buildTimesScalar();
    buildSign();
    buildIsNegative();

    module.exportFunction(prefix + "_isZero");
    module.exportFunction(prefix + "_isOne");
    module.exportFunction(prefix + "_zero");
    module.exportFunction(prefix + "_one");
    module.exportFunction(prefix + "_copy");
    module.exportFunction(prefix + "_mul");
    module.exportFunction(prefix + "_mul1");
    module.exportFunction(prefix + "_square");
    module.exportFunction(prefix + "_add");
    module.exportFunction(prefix + "_sub");
    module.exportFunction(prefix + "_neg");
    module.exportFunction(prefix + "_sign");
    module.exportFunction(prefix + "_conjugate");
    module.exportFunction(prefix + "_fromMontgomery");
    module.exportFunction(prefix + "_toMontgomery");
    module.exportFunction(prefix + "_eq");
    module.exportFunction(prefix + "_inverse");
    buildBatchInverse(module, prefix);
    buildExp(
        module,
        prefix + "_exp",
        f1n8*2,
        prefix + "_mul",
        prefix + "_square",
        prefix + "_copy",
        prefix + "_one",
    );
    buildSqrt();
    buildIsSquare();

    module.exportFunction(prefix + "_exp");
    module.exportFunction(prefix + "_timesScalar");
    module.exportFunction(prefix + "_batchInverse");
    module.exportFunction(prefix + "_sqrt");
    module.exportFunction(prefix + "_isSquare");
    module.exportFunction(prefix + "_isNegative");


    return prefix;
};


/***/ }),

/***/ 173:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

/*
    Copyright 2019 0KIMS association.

    This file is part of wasmsnark (Web Assembly zkSnark Prover).

    wasmsnark is a free software: you can redistribute it and/or modify it
    under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    wasmsnark is distributed in the hope that it will be useful, but WITHOUT
    ANY WARRANTY; without even the implied warranty of MERCHANTABILITY
    or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public
    License for more details.

    You should have received a copy of the GNU General Public License
    along with wasmsnark. If not, see <https://www.gnu.org/licenses/>.
*/
const buildExp = __webpack_require__(345);
const buildBatchInverse = __webpack_require__(163);

module.exports = function buildF3m(module, mulNonResidueFn, prefix, f1mPrefix) {

    if (module.modules[prefix]) return prefix;  // already builded

    const f1n8 = module.modules[f1mPrefix].n64*8;
    module.modules[prefix] = {
        n64: module.modules[f1mPrefix].n64*3
    };

    function buildAdd() {
        const f = module.addFunction(prefix+"_add");
        f.addParam("x", "i32");
        f.addParam("y", "i32");
        f.addParam("r", "i32");

        const c = f.getCodeBuilder();

        const x0 = c.getLocal("x");
        const x1 = c.i32_add(c.getLocal("x"), c.i32_const(f1n8));
        const x2 = c.i32_add(c.getLocal("x"), c.i32_const(2*f1n8));
        const y0 = c.getLocal("y");
        const y1 = c.i32_add(c.getLocal("y"), c.i32_const(f1n8));
        const y2 = c.i32_add(c.getLocal("y"), c.i32_const(2*f1n8));
        const r0 = c.getLocal("r");
        const r1 = c.i32_add(c.getLocal("r"), c.i32_const(f1n8));
        const r2 = c.i32_add(c.getLocal("r"), c.i32_const(2*f1n8));

        f.addCode(
            c.call(f1mPrefix+"_add", x0, y0, r0),
            c.call(f1mPrefix+"_add", x1, y1, r1),
            c.call(f1mPrefix+"_add", x2, y2, r2),
        );
    }

    function buildTimesScalar() {
        const f = module.addFunction(prefix+"_timesScalar");
        f.addParam("x", "i32");
        f.addParam("scalar", "i32");
        f.addParam("scalarLen", "i32");
        f.addParam("r", "i32");

        const c = f.getCodeBuilder();

        const x0 = c.getLocal("x");
        const x1 = c.i32_add(c.getLocal("x"), c.i32_const(f1n8));
        const x2 = c.i32_add(c.getLocal("x"), c.i32_const(2*f1n8));
        const r0 = c.getLocal("r");
        const r1 = c.i32_add(c.getLocal("r"), c.i32_const(f1n8));
        const r2 = c.i32_add(c.getLocal("r"), c.i32_const(2*f1n8));

        f.addCode(
            c.call(f1mPrefix+"_timesScalar", x0, c.getLocal("scalar"), c.getLocal("scalarLen"), r0),
            c.call(f1mPrefix+"_timesScalar", x1, c.getLocal("scalar"), c.getLocal("scalarLen"), r1),
            c.call(f1mPrefix+"_timesScalar", x2, c.getLocal("scalar"), c.getLocal("scalarLen"), r2),
        );
    }


    function buildSub() {
        const f = module.addFunction(prefix+"_sub");
        f.addParam("x", "i32");
        f.addParam("y", "i32");
        f.addParam("r", "i32");

        const c = f.getCodeBuilder();

        const x0 = c.getLocal("x");
        const x1 = c.i32_add(c.getLocal("x"), c.i32_const(f1n8));
        const x2 = c.i32_add(c.getLocal("x"), c.i32_const(2*f1n8));
        const y0 = c.getLocal("y");
        const y1 = c.i32_add(c.getLocal("y"), c.i32_const(f1n8));
        const y2 = c.i32_add(c.getLocal("y"), c.i32_const(2*f1n8));
        const r0 = c.getLocal("r");
        const r1 = c.i32_add(c.getLocal("r"), c.i32_const(f1n8));
        const r2 = c.i32_add(c.getLocal("r"), c.i32_const(2*f1n8));

        f.addCode(
            c.call(f1mPrefix+"_sub", x0, y0, r0),
            c.call(f1mPrefix+"_sub", x1, y1, r1),
            c.call(f1mPrefix+"_sub", x2, y2, r2),
        );
    }

    function buildNeg() {
        const f = module.addFunction(prefix+"_neg");
        f.addParam("x", "i32");
        f.addParam("r", "i32");

        const c = f.getCodeBuilder();

        const x0 = c.getLocal("x");
        const x1 = c.i32_add(c.getLocal("x"), c.i32_const(f1n8));
        const x2 = c.i32_add(c.getLocal("x"), c.i32_const(2*f1n8));
        const r0 = c.getLocal("r");
        const r1 = c.i32_add(c.getLocal("r"), c.i32_const(f1n8));
        const r2 = c.i32_add(c.getLocal("r"), c.i32_const(2*f1n8));

        f.addCode(
            c.call(f1mPrefix+"_neg", x0, r0),
            c.call(f1mPrefix+"_neg", x1, r1),
            c.call(f1mPrefix+"_neg", x2, r2),
        );
    }

    function buildIsNegative() {
        const f = module.addFunction(prefix+"_isNegative");
        f.addParam("x", "i32");
        f.setReturnType("i32");

        const c = f.getCodeBuilder();

        const x0 = c.getLocal("x");
        const x1 = c.i32_add(c.getLocal("x"), c.i32_const(f1n8));
        const x2 = c.i32_add(c.getLocal("x"), c.i32_const(2*f1n8));

        f.addCode(
            c.if(
                c.call(f1mPrefix+"_isZero", x2),
                c.if(
                    c.call(f1mPrefix+"_isZero", x1),
                    c.ret(c.call(f1mPrefix+"_isNegative", x0)),
                    c.ret(c.call(f1mPrefix+"_isNegative", x1))
                )
            ),
            c.ret(c.call(f1mPrefix+"_isNegative", x2))
        );
    }


    function buildMul() {
        const f = module.addFunction(prefix+"_mul");
        f.addParam("x", "i32");
        f.addParam("y", "i32");
        f.addParam("r", "i32");

        const cd = f.getCodeBuilder();

        const a = cd.getLocal("x");
        const b = cd.i32_add(cd.getLocal("x"), cd.i32_const(f1n8));
        const c = cd.i32_add(cd.getLocal("x"), cd.i32_const(2*f1n8));
        const A = cd.getLocal("y");
        const B = cd.i32_add(cd.getLocal("y"), cd.i32_const(f1n8));
        const C = cd.i32_add(cd.getLocal("y"), cd.i32_const(2*f1n8));
        const r0 = cd.getLocal("r");
        const r1 = cd.i32_add(cd.getLocal("r"), cd.i32_const(f1n8));
        const r2 = cd.i32_add(cd.getLocal("r"), cd.i32_const(2*f1n8));

        const aA = cd.i32_const(module.alloc(f1n8));
        const bB = cd.i32_const(module.alloc(f1n8));
        const cC = cd.i32_const(module.alloc(f1n8));
        const a_b = cd.i32_const(module.alloc(f1n8));
        const A_B = cd.i32_const(module.alloc(f1n8));
        const a_c = cd.i32_const(module.alloc(f1n8));
        const A_C = cd.i32_const(module.alloc(f1n8));
        const b_c = cd.i32_const(module.alloc(f1n8));
        const B_C = cd.i32_const(module.alloc(f1n8));
        const aA_bB = cd.i32_const(module.alloc(f1n8));
        const aA_cC = cd.i32_const(module.alloc(f1n8));
        const bB_cC = cd.i32_const(module.alloc(f1n8));
        const AUX = cd.i32_const(module.alloc(f1n8));


        f.addCode(
            cd.call(f1mPrefix + "_mul", a, A, aA),
            cd.call(f1mPrefix + "_mul", b, B, bB),
            cd.call(f1mPrefix + "_mul", c, C, cC),

            cd.call(f1mPrefix + "_add", a, b, a_b),
            cd.call(f1mPrefix + "_add", A, B, A_B),
            cd.call(f1mPrefix + "_add", a, c, a_c),
            cd.call(f1mPrefix + "_add", A, C, A_C),
            cd.call(f1mPrefix + "_add", b, c, b_c),
            cd.call(f1mPrefix + "_add", B, C, B_C),

            cd.call(f1mPrefix + "_add", aA, bB, aA_bB),
            cd.call(f1mPrefix + "_add", aA, cC, aA_cC),
            cd.call(f1mPrefix + "_add", bB, cC, bB_cC),

            cd.call(f1mPrefix + "_mul", b_c, B_C, r0),
            cd.call(f1mPrefix + "_sub", r0, bB_cC, r0),
            cd.call(mulNonResidueFn, r0, r0),
            cd.call(f1mPrefix + "_add", aA, r0, r0),

            cd.call(f1mPrefix + "_mul", a_b, A_B, r1),
            cd.call(f1mPrefix + "_sub", r1, aA_bB, r1),
            cd.call(mulNonResidueFn, cC, AUX),
            cd.call(f1mPrefix + "_add", r1, AUX, r1),

            cd.call(f1mPrefix + "_mul", a_c, A_C, r2),
            cd.call(f1mPrefix + "_sub", r2, aA_cC, r2),
            cd.call(f1mPrefix + "_add", r2, bB, r2),
        );

    }

    function buildSquare() {
        const f = module.addFunction(prefix+"_square");
        f.addParam("x", "i32");
        f.addParam("r", "i32");

        const c = f.getCodeBuilder();

        const A = c.getLocal("x");
        const B = c.i32_add(c.getLocal("x"), c.i32_const(f1n8));
        const C = c.i32_add(c.getLocal("x"), c.i32_const(2*f1n8));
        const r0 = c.getLocal("r");
        const r1 = c.i32_add(c.getLocal("r"), c.i32_const(f1n8));
        const r2 = c.i32_add(c.getLocal("r"), c.i32_const(2*f1n8));

        const s0 = c.i32_const(module.alloc(f1n8));
        const ab = c.i32_const(module.alloc(f1n8));
        const s1 = c.i32_const(module.alloc(f1n8));
        const s2 = c.i32_const(module.alloc(f1n8));
        const bc = c.i32_const(module.alloc(f1n8));
        const s3 = c.i32_const(module.alloc(f1n8));
        const s4 = c.i32_const(module.alloc(f1n8));


        f.addCode(

            c.call(f1mPrefix + "_square", A, s0),
            c.call(f1mPrefix + "_mul", A, B, ab),
            c.call(f1mPrefix + "_add", ab, ab, s1),

            c.call(f1mPrefix + "_sub", A, B, s2),
            c.call(f1mPrefix + "_add", s2, C, s2),
            c.call(f1mPrefix + "_square", s2, s2),

            c.call(f1mPrefix + "_mul", B, C, bc),
            c.call(f1mPrefix + "_add", bc, bc, s3),

            c.call(f1mPrefix + "_square", C, s4),

            c.call(mulNonResidueFn, s3, r0),
            c.call(f1mPrefix + "_add", s0, r0, r0),

            c.call(mulNonResidueFn, s4, r1),
            c.call(f1mPrefix + "_add", s1, r1, r1),

            c.call(f1mPrefix + "_add", s0, s4, r2),
            c.call(f1mPrefix + "_sub", s3, r2, r2),
            c.call(f1mPrefix + "_add", s2, r2, r2),
            c.call(f1mPrefix + "_add", s1, r2, r2),
        );

    }


    function buildToMontgomery() {
        const f = module.addFunction(prefix+"_toMontgomery");
        f.addParam("x", "i32");
        f.addParam("r", "i32");

        const c = f.getCodeBuilder();

        const x0 = c.getLocal("x");
        const x1 = c.i32_add(c.getLocal("x"), c.i32_const(f1n8));
        const x2 = c.i32_add(c.getLocal("x"), c.i32_const(2*f1n8));
        const r0 = c.getLocal("r");
        const r1 = c.i32_add(c.getLocal("r"), c.i32_const(f1n8));
        const r2 = c.i32_add(c.getLocal("r"), c.i32_const(2*f1n8));

        f.addCode(
            c.call(f1mPrefix+"_toMontgomery", x0, r0),
            c.call(f1mPrefix+"_toMontgomery", x1, r1),
            c.call(f1mPrefix+"_toMontgomery", x2, r2)
        );
    }

    function buildFromMontgomery() {
        const f = module.addFunction(prefix+"_fromMontgomery");
        f.addParam("x", "i32");
        f.addParam("r", "i32");

        const c = f.getCodeBuilder();

        const x0 = c.getLocal("x");
        const x1 = c.i32_add(c.getLocal("x"), c.i32_const(f1n8));
        const x2 = c.i32_add(c.getLocal("x"), c.i32_const(2*f1n8));
        const r0 = c.getLocal("r");
        const r1 = c.i32_add(c.getLocal("r"), c.i32_const(f1n8));
        const r2 = c.i32_add(c.getLocal("r"), c.i32_const(2*f1n8));

        f.addCode(
            c.call(f1mPrefix+"_fromMontgomery", x0, r0),
            c.call(f1mPrefix+"_fromMontgomery", x1, r1),
            c.call(f1mPrefix+"_fromMontgomery", x2, r2)
        );
    }

    function buildCopy() {
        const f = module.addFunction(prefix+"_copy");
        f.addParam("x", "i32");
        f.addParam("r", "i32");

        const c = f.getCodeBuilder();

        const x0 = c.getLocal("x");
        const x1 = c.i32_add(c.getLocal("x"), c.i32_const(f1n8));
        const x2 = c.i32_add(c.getLocal("x"), c.i32_const(2*f1n8));
        const r0 = c.getLocal("r");
        const r1 = c.i32_add(c.getLocal("r"), c.i32_const(f1n8));
        const r2 = c.i32_add(c.getLocal("r"), c.i32_const(2*f1n8));

        f.addCode(
            c.call(f1mPrefix+"_copy", x0, r0),
            c.call(f1mPrefix+"_copy", x1, r1),
            c.call(f1mPrefix+"_copy", x2, r2),
        );
    }

    function buildZero() {
        const f = module.addFunction(prefix+"_zero");
        f.addParam("x", "i32");

        const c = f.getCodeBuilder();

        const x0 = c.getLocal("x");
        const x1 = c.i32_add(c.getLocal("x"), c.i32_const(f1n8));
        const x2 = c.i32_add(c.getLocal("x"), c.i32_const(2*f1n8));

        f.addCode(
            c.call(f1mPrefix+"_zero", x0),
            c.call(f1mPrefix+"_zero", x1),
            c.call(f1mPrefix+"_zero", x2),
        );
    }

    function buildOne() {
        const f = module.addFunction(prefix+"_one");
        f.addParam("x", "i32");

        const c = f.getCodeBuilder();

        const x0 = c.getLocal("x");
        const x1 = c.i32_add(c.getLocal("x"), c.i32_const(f1n8));
        const x2 = c.i32_add(c.getLocal("x"), c.i32_const(2*f1n8));

        f.addCode(
            c.call(f1mPrefix+"_one", x0),
            c.call(f1mPrefix+"_zero", x1),
            c.call(f1mPrefix+"_zero", x2),
        );
    }

    function buildEq() {
        const f = module.addFunction(prefix+"_eq");
        f.addParam("x", "i32");
        f.addParam("y", "i32");
        f.setReturnType("i32");

        const c = f.getCodeBuilder();

        const x0 = c.getLocal("x");
        const x1 = c.i32_add(c.getLocal("x"), c.i32_const(f1n8));
        const x2 = c.i32_add(c.getLocal("x"), c.i32_const(2*f1n8));
        const y0 = c.getLocal("y");
        const y1 = c.i32_add(c.getLocal("y"), c.i32_const(f1n8));
        const y2 = c.i32_add(c.getLocal("y"), c.i32_const(2*f1n8));

        f.addCode(
            c.i32_and(
                c.i32_and(
                    c.call(f1mPrefix+"_eq", x0, y0),
                    c.call(f1mPrefix+"_eq", x1, y1),
                ),
                c.call(f1mPrefix+"_eq", x2, y2)
            )
        );
    }

    function buildIsZero() {
        const f = module.addFunction(prefix+"_isZero");
        f.addParam("x", "i32");
        f.setReturnType("i32");

        const c = f.getCodeBuilder();

        const x0 = c.getLocal("x");
        const x1 = c.i32_add(c.getLocal("x"), c.i32_const(f1n8));
        const x2 = c.i32_add(c.getLocal("x"), c.i32_const(2*f1n8));

        f.addCode(
            c.i32_and(
                c.i32_and(
                    c.call(f1mPrefix+"_isZero", x0),
                    c.call(f1mPrefix+"_isZero", x1)
                ),
                c.call(f1mPrefix+"_isZero", x2)
            )
        );
    }

    function buildInverse() {
        const f = module.addFunction(prefix+"_inverse");
        f.addParam("x", "i32");
        f.addParam("r", "i32");

        const c = f.getCodeBuilder();

        const x0 = c.getLocal("x");
        const x1 = c.i32_add(c.getLocal("x"), c.i32_const(f1n8));
        const x2 = c.i32_add(c.getLocal("x"), c.i32_const(2*f1n8));
        const r0 = c.getLocal("r");
        const r1 = c.i32_add(c.getLocal("r"), c.i32_const(f1n8));
        const r2 = c.i32_add(c.getLocal("r"), c.i32_const(2*f1n8));

        const t0 = c.i32_const(module.alloc(f1n8));
        const t1 = c.i32_const(module.alloc(f1n8));
        const t2 = c.i32_const(module.alloc(f1n8));
        const t3 = c.i32_const(module.alloc(f1n8));
        const t4 = c.i32_const(module.alloc(f1n8));
        const t5 = c.i32_const(module.alloc(f1n8));
        const c0 = c.i32_const(module.alloc(f1n8));
        const c1 = c.i32_const(module.alloc(f1n8));
        const c2 = c.i32_const(module.alloc(f1n8));
        const t6 = c.i32_const(module.alloc(f1n8));
        const AUX = c.i32_const(module.alloc(f1n8));

        f.addCode(
            c.call(f1mPrefix+"_square", x0, t0),
            c.call(f1mPrefix+"_square", x1, t1),
            c.call(f1mPrefix+"_square", x2, t2),
            c.call(f1mPrefix+"_mul", x0, x1, t3),
            c.call(f1mPrefix+"_mul", x0, x2, t4),
            c.call(f1mPrefix+"_mul", x1, x2, t5),

            c.call(mulNonResidueFn, t5, c0),
            c.call(f1mPrefix+"_sub", t0, c0, c0),

            c.call(mulNonResidueFn, t2, c1),
            c.call(f1mPrefix+"_sub", c1, t3, c1),

            c.call(f1mPrefix+"_sub", t1, t4, c2),

            c.call(f1mPrefix+"_mul", x2, c1, t6),
            c.call(f1mPrefix+"_mul", x1, c2, AUX),
            c.call(f1mPrefix+"_add", t6, AUX, t6),
            c.call(mulNonResidueFn, t6, t6),
            c.call(f1mPrefix+"_mul", x0, c0, AUX),
            c.call(f1mPrefix+"_add", AUX, t6, t6),

            c.call(f1mPrefix+"_inverse", t6, t6),

            c.call(f1mPrefix+"_mul", t6, c0, r0),
            c.call(f1mPrefix+"_mul", t6, c1, r1),
            c.call(f1mPrefix+"_mul", t6, c2, r2)
        );
    }


    function buildSign() {
        const f = module.addFunction(prefix+"_sign");
        f.addParam("x", "i32");
        f.addLocal("s", "i32");
        f.setReturnType("i32");

        const c = f.getCodeBuilder();

        const x0 = c.getLocal("x");
        const x1 = c.i32_add(c.getLocal("x"), c.i32_const(f1n8));
        const x2 = c.i32_add(c.getLocal("x"), c.i32_const(2*f1n8));

        f.addCode(
            c.setLocal("s" , c.call( f1mPrefix + "_sign", x2)),
            c.if(
                c.getLocal("s"),
                c.ret(c.getLocal("s"))
            ),
            c.setLocal("s" , c.call( f1mPrefix + "_sign", x1)),
            c.if(
                c.getLocal("s"),
                c.ret(c.getLocal("s"))
            ),
            c.ret(c.call( f1mPrefix + "_sign", x0))
        );
    }

    function buildIsOne() {
        const f = module.addFunction(prefix+"_isOne");
        f.addParam("x", "i32");
        f.setReturnType("i32");

        const c = f.getCodeBuilder();

        const x0 = c.getLocal("x");
        const x1 = c.i32_add(c.getLocal("x"), c.i32_const(f1n8));
        const x2 = c.i32_add(c.getLocal("x"), c.i32_const(f1n8*2));

        f.addCode(
            c.ret(
                c.i32_and(
                    c.i32_and(
                        c.call(f1mPrefix + "_isOne", x0),
                        c.call(f1mPrefix + "_isZero", x1)
                    ),
                    c.call(f1mPrefix + "_isZero", x2)
                )
            )
        );
    }

    buildIsZero();
    buildIsOne();
    buildZero();
    buildOne();
    buildCopy();
    buildMul();
    buildSquare();
    buildAdd();
    buildSub();
    buildNeg();
    buildSign();
    buildToMontgomery();
    buildFromMontgomery();
    buildEq();
    buildInverse();
    buildTimesScalar();
    buildIsNegative();

    module.exportFunction(prefix + "_isZero");
    module.exportFunction(prefix + "_isOne");
    module.exportFunction(prefix + "_zero");
    module.exportFunction(prefix + "_one");
    module.exportFunction(prefix + "_copy");
    module.exportFunction(prefix + "_mul");
    module.exportFunction(prefix + "_square");
    module.exportFunction(prefix + "_add");
    module.exportFunction(prefix + "_sub");
    module.exportFunction(prefix + "_neg");
    module.exportFunction(prefix + "_sign");
    module.exportFunction(prefix + "_fromMontgomery");
    module.exportFunction(prefix + "_toMontgomery");
    module.exportFunction(prefix + "_eq");
    module.exportFunction(prefix + "_inverse");
    buildBatchInverse(module, prefix);
    buildExp(
        module,
        prefix + "_exp",
        f1n8*3,
        prefix + "_mul",
        prefix + "_square",
        prefix + "_copy",
        prefix + "_one"
    );
    module.exportFunction(prefix + "_exp");
    module.exportFunction(prefix + "_timesScalar");
    module.exportFunction(prefix + "_batchInverse");
    module.exportFunction(prefix + "_isNegative");

    return prefix;
};


/***/ }),

/***/ 292:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

/*
    Copyright 2019 0KIMS association.

    This file is part of wasmsnark (Web Assembly zkSnark Prover).

    wasmsnark is a free software: you can redistribute it and/or modify it
    under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    wasmsnark is distributed in the hope that it will be useful, but WITHOUT
    ANY WARRANTY; without even the implied warranty of MERCHANTABILITY
    or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public
    License for more details.

    You should have received a copy of the GNU General Public License
    along with wasmsnark. If not, see <https://www.gnu.org/licenses/>.
*/

const { isOdd, modInv, modPow } = __webpack_require__(409);
const utils = __webpack_require__(333);

module.exports = function buildFFT(module, prefix, gPrefix, fPrefix, opGtimesF) {

    const n64f = module.modules[fPrefix].n64;
    const n8f = n64f*8;

    const n64g = module.modules[gPrefix].n64;
    const n8g = n64g*8;

    const q = module.modules[fPrefix].q;

    let rem = q - 1n;
    let maxBits = 0;
    while (!isOdd(rem)) {
        maxBits ++;
        rem = rem >> 1n;
    }

    let nr = 2n;

    while ( modPow(nr, q >> 1n, q) === 1n ) nr = nr + 1n;

    // console.log(nr);

    const w = new Array(maxBits+1);
    w[maxBits] = modPow(nr, rem, q);

    let n=maxBits-1;
    while (n>=0) {
        w[n] = modPow(w[n+1], 2n, q);
        n--;
    }

    const bytes = [];
    const R = (1n << BigInt(n8f*8)) % q;

    for (let i=0; i<w.length; i++) {
        const m = w[i] * R % q;
        bytes.push(...utils.bigInt2BytesLE(m, n8f));
    }

    const ROOTs = module.alloc(bytes);

    const i2 = new Array(maxBits+1);
    i2[0] = 1n;

    for (let i=1; i<=maxBits; i++) {
        i2[i] = i2[i-1] * 2n;
    }

    const bytesi2 =[];
    for (let i=0; i<=maxBits; i++) {
        const m = modInv(i2[i], q) * R % q;
        bytesi2.push(...utils.bigInt2BytesLE(m, n8f));
    }

    const INV2 = module.alloc(bytesi2);

    const shift = modPow(nr, 2n, q);
    const bytesShiftToSmallM =[];
    const bytesSConst =[];
    for (let i=0; i<=maxBits; i++) {
        const shiftToSmallM = modPow(shift, 2n ** BigInt(i), q);
        const sConst = modInv(q + 1n - shiftToSmallM, q);
        bytesShiftToSmallM.push(...utils.bigInt2BytesLE(shiftToSmallM * R % q, n8f));
        bytesSConst.push(...utils.bigInt2BytesLE(sConst * R % q, n8f));
    }

    const SHIFT_TO_M = module.alloc( bytesShiftToSmallM  );
    const SCONST = module.alloc( bytesSConst  );

    function rev(x) {
        let r=0;
        for (let i=0; i<8; i++) {
            if (x & (1 << i)) {
                r = r | (0x80 >> i);
            }
        }
        return r;
    }

    const rtable = Array(256);
    for (let i=0; i<256; i++) {
        rtable[i] = rev(i);
    }

    const REVTABLE = module.alloc(rtable);


    function buildLog2() {
        const f = module.addFunction(prefix+"__log2");
        f.addParam("n", "i32");
        f.setReturnType("i32");
        f.addLocal("bits", "i32");
        f.addLocal("aux", "i32");

        const c = f.getCodeBuilder();

        f.addCode(
            c.setLocal(
                "aux",
                c.i32_shr_u(
                    c.getLocal("n"),
                    c.i32_const(1)
                )
            )
        );
        f.addCode(c.setLocal("bits", c.i32_const(0)));

        f.addCode(c.block(c.loop(
            c.br_if(
                1,
                c.i32_eqz(c.getLocal("aux"))
            ),

            c.setLocal(
                "aux",
                c.i32_shr_u(
                    c.getLocal("aux"),
                    c.i32_const(1)
                )
            ),

            c.setLocal(
                "bits",
                c.i32_add(
                    c.getLocal("bits"),
                    c.i32_const(1)
                )
            ),

            c.br(0)
        )));

        f.addCode(c.if(
            c.i32_ne(
                c.getLocal("n"),
                c.i32_shl(
                    c.i32_const(1),
                    c.getLocal("bits")
                )
            ),
            c.unreachable()
        ));

        f.addCode(c.if(
            c.i32_gt_u(
                c.getLocal("bits"),
                c.i32_const(maxBits)
            ),
            c.unreachable()
        ));

        f.addCode(c.getLocal("bits"));
    }

    function buildFFT() {
        const f = module.addFunction(prefix+"_fft");
        f.addParam("px", "i32");
        f.addParam("n", "i32");

        f.addLocal("bits", "i32");

        const c = f.getCodeBuilder();

        const One = c.i32_const(module.alloc(n8f));

        f.addCode(
            c.setLocal(
                "bits",
                c.call(
                    prefix + "__log2",
                    c.getLocal("n")
                )
            ),
            c.call(fPrefix + "_one", One),
            c.call(
                prefix+"_rawfft",
                c.getLocal("px"),
                c.getLocal("bits"),
                c.i32_const(0),
                One
            )
        );

    }

    function buildIFFT() {
        const f = module.addFunction(prefix+"_ifft");
        f.addParam("px", "i32");
        f.addParam("n", "i32");
        f.addLocal("bits", "i32");
        f.addLocal("pInv2", "i32");

        const c = f.getCodeBuilder();

        f.addCode(
            c.setLocal(
                "bits",
                c.call(
                    prefix + "__log2",
                    c.getLocal("n")
                )
            ),
            c.setLocal(
                "pInv2",
                c.i32_add(
                    c.i32_const(INV2),
                    c.i32_mul(
                        c.getLocal("bits"),
                        c.i32_const(n8f)
                    )
                )
            ),

            c.call(
                prefix+"_rawfft",
                c.getLocal("px"),
                c.getLocal("bits"),
                c.i32_const(1),
                c.getLocal("pInv2")
            ),
        );
    }

    function buildRawFFT() {
        const f = module.addFunction(prefix+"_rawfft");
        f.addParam("px", "i32");
        f.addParam("bits", "i32"); // 2 power
        f.addParam("reverse", "i32");
        f.addParam("mulFactor", "i32");

        f.addLocal("s", "i32");
        f.addLocal("k", "i32");
        f.addLocal("j", "i32");
        f.addLocal("m", "i32");
        f.addLocal("mdiv2", "i32");
        f.addLocal("n", "i32");
        f.addLocal("pwm", "i32");
        f.addLocal("idx1", "i32");
        f.addLocal("idx2", "i32");

        const c = f.getCodeBuilder();

        const W = c.i32_const(module.alloc(n8f));
        const T = c.i32_const(module.alloc(n8g));
        const U = c.i32_const(module.alloc(n8g));

        f.addCode(
            c.call(prefix + "__reversePermutation", c.getLocal("px"), c.getLocal("bits")),
            c.setLocal("n", c.i32_shl(c.i32_const(1), c.getLocal("bits"))),
            c.setLocal("s", c.i32_const(1)),
            c.block(c.loop(
                c.br_if(
                    1,
                    c.i32_gt_u(
                        c.getLocal("s"),
                        c.getLocal("bits")
                    )
                ),
                c.setLocal("m", c.i32_shl(c.i32_const(1), c.getLocal("s"))),
                c.setLocal("pwm",
                    c.i32_add(
                        c.i32_const(ROOTs),
                        c.i32_mul(
                            c.getLocal("s"),
                            c.i32_const(n8f)
                        )
                    )
                ),
                c.setLocal("k", c.i32_const(0)),
                c.block(c.loop(
                    c.br_if(
                        1,
                        c.i32_ge_u(
                            c.getLocal("k"),
                            c.getLocal("n")
                        )
                    ),

                    c.call(fPrefix + "_one", W),

                    c.setLocal("mdiv2", c.i32_shr_u(c.getLocal("m"), c.i32_const(1)) ),
                    c.setLocal("j", c.i32_const(0)),
                    c.block(c.loop(
                        c.br_if(
                            1,
                            c.i32_ge_u(
                                c.getLocal("j"),
                                c.getLocal("mdiv2")
                            )
                        ),

                        c.setLocal(
                            "idx1",
                            c.i32_add(
                                c.getLocal("px"),
                                c.i32_mul(
                                    c.i32_add(
                                        c.getLocal("k"),
                                        c.getLocal("j")
                                    ),
                                    c.i32_const(n8g)
                                )
                            )
                        ),

                        c.setLocal(
                            "idx2",
                            c.i32_add(
                                c.getLocal("idx1"),
                                c.i32_mul(
                                    c.getLocal("mdiv2"),
                                    c.i32_const(n8g)
                                )
                            )
                        ),

                        c.call(
                            opGtimesF,
                            c.getLocal("idx2"),
                            W,
                            T
                        ),

                        c.call(
                            gPrefix + "_copy",
                            c.getLocal("idx1"),
                            U
                        ),

                        c.call(
                            gPrefix + "_add",
                            U,
                            T,
                            c.getLocal("idx1"),
                        ),

                        c.call(
                            gPrefix + "_sub",
                            U,
                            T,
                            c.getLocal("idx2"),
                        ),

                        c.call(
                            fPrefix + "_mul",
                            W,
                            c.getLocal("pwm"),
                            W,
                        ),

                        c.setLocal("j", c.i32_add(c.getLocal("j"), c.i32_const(1))),
                        c.br(0)
                    )),

                    c.setLocal("k", c.i32_add(c.getLocal("k"), c.getLocal("m"))),
                    c.br(0)
                )),

                c.setLocal("s", c.i32_add(c.getLocal("s"), c.i32_const(1))),
                c.br(0)
            )),
            c.call(
                prefix + "__fftFinal",
                c.getLocal("px"),
                c.getLocal("bits"),
                c.getLocal("reverse"),
                c.getLocal("mulFactor")
            )
        );
    }


    function buildFinalInverse() {
        const f = module.addFunction(prefix+"__fftFinal");
        f.addParam("px", "i32");
        f.addParam("bits", "i32");
        f.addParam("reverse", "i32");
        f.addParam("mulFactor", "i32");
        f.addLocal("n", "i32");
        f.addLocal("ndiv2", "i32");
        f.addLocal("pInv2", "i32");
        f.addLocal("i", "i32");
        f.addLocal("mask", "i32");
        f.addLocal("idx1", "i32");
        f.addLocal("idx2", "i32");

        const c = f.getCodeBuilder();

        const T = c.i32_const(module.alloc(n8g));

        f.addCode(
            c.if(
                c.i32_and(
                    c.i32_eqz(c.getLocal("reverse")),
                    c.call(fPrefix + "_isOne", c.getLocal("mulFactor"))
                ),
                c.ret([])
            ),
            c.setLocal("n", c.i32_shl( c.i32_const(1), c.getLocal("bits"))),

            c.setLocal("mask", c.i32_sub( c.getLocal("n") , c.i32_const(1))),
            c.setLocal("i", c.i32_const(1)),
            c.setLocal(
                "ndiv2",
                c.i32_shr_u(
                    c.getLocal("n"),
                    c.i32_const(1)
                )
            ),
            c.block(c.loop(
                c.br_if(
                    1,
                    c.i32_ge_u(
                        c.getLocal("i"),
                        c.getLocal("ndiv2")
                    )
                ),

                c.setLocal("idx1",
                    c.i32_add(
                        c.getLocal("px"),
                        c.i32_mul(
                            c.getLocal("i"),
                            c.i32_const(n8g)
                        )
                    )
                ),

                c.setLocal("idx2",
                    c.i32_add(
                        c.getLocal("px"),
                        c.i32_mul(
                            c.i32_sub(
                                c.getLocal("n"),
                                c.getLocal("i")
                            ),
                            c.i32_const(n8g)
                        )
                    )
                ),

                c.if(
                    c.getLocal("reverse"),
                    c.if(
                        c.call(fPrefix + "_isOne", c.getLocal("mulFactor")),
                        [
                            ...c.call(gPrefix + "_copy", c.getLocal("idx1"), T),
                            ...c.call(gPrefix + "_copy", c.getLocal("idx2") , c.getLocal("idx1") ),
                            ...c.call(gPrefix + "_copy", T , c.getLocal("idx2")),
                        ],
                        [
                            ...c.call(gPrefix + "_copy", c.getLocal("idx1"), T),
                            ...c.call(opGtimesF , c.getLocal("idx2") , c.getLocal("mulFactor"), c.getLocal("idx1") ),
                            ...c.call(opGtimesF , T , c.getLocal("mulFactor"), c.getLocal("idx2")),
                        ]
                    ),
                    c.if(
                        c.call(fPrefix + "_isOne", c.getLocal("mulFactor")),
                        [
                            // Do nothing (It should not be here)
                        ],
                        [
                            ...c.call(opGtimesF , c.getLocal("idx1") , c.getLocal("mulFactor"), c.getLocal("idx1") ),
                            ...c.call(opGtimesF , c.getLocal("idx2") , c.getLocal("mulFactor"), c.getLocal("idx2")),
                        ]
                    )
                ),
                c.setLocal("i", c.i32_add(c.getLocal("i"), c.i32_const(1))),

                c.br(0)
            )),

            c.if(
                c.call(fPrefix + "_isOne", c.getLocal("mulFactor")),
                [
                    // Do nothing (It should not be here)
                ],
                [
                    ...c.call(opGtimesF, c.getLocal("px") , c.getLocal("mulFactor"), c.getLocal("px")),
                    ...c.setLocal("idx2",
                        c.i32_add(
                            c.getLocal("px"),
                            c.i32_mul(
                                c.getLocal("ndiv2"),
                                c.i32_const(n8g)
                            )
                        )
                    ),
                    ...c.call(opGtimesF, c.getLocal("idx2"),c.getLocal("mulFactor"), c.getLocal("idx2"))
                ]
            )
        );
    }

    function buildReversePermutation() {
        const f = module.addFunction(prefix+"__reversePermutation");
        f.addParam("px", "i32");
        f.addParam("bits", "i32");
        f.addLocal("n", "i32");
        f.addLocal("i", "i32");
        f.addLocal("ri", "i32");
        f.addLocal("idx1", "i32");
        f.addLocal("idx2", "i32");

        const c = f.getCodeBuilder();

        const T = c.i32_const(module.alloc(n8g));

        f.addCode(
            c.setLocal("n", c.i32_shl( c.i32_const(1), c.getLocal("bits"))),
            c.setLocal("i", c.i32_const(0)),
            c.block(c.loop(
                c.br_if(
                    1,
                    c.i32_eq(
                        c.getLocal("i"),
                        c.getLocal("n")
                    )
                ),

                c.setLocal("idx1",
                    c.i32_add(
                        c.getLocal("px"),
                        c.i32_mul(
                            c.getLocal("i"),
                            c.i32_const(n8g)
                        )
                    )
                ),

                c.setLocal("ri", c.call(prefix + "__rev", c.getLocal("i"), c.getLocal("bits"))),

                c.setLocal("idx2",
                    c.i32_add(
                        c.getLocal("px"),
                        c.i32_mul(
                            c.getLocal("ri"),
                            c.i32_const(n8g)
                        )
                    )
                ),

                c.if(
                    c.i32_lt_u(
                        c.getLocal("i"),
                        c.getLocal("ri")
                    ),
                    [
                        ...c.call(gPrefix + "_copy", c.getLocal("idx1"), T),
                        ...c.call(gPrefix + "_copy", c.getLocal("idx2") , c.getLocal("idx1")),
                        ...c.call(gPrefix + "_copy", T , c.getLocal("idx2"))
                    ]
                ),

                c.setLocal("i", c.i32_add(c.getLocal("i"), c.i32_const(1))),

                c.br(0)
            ))
        );
    }

    function buildRev() {
        const f = module.addFunction(prefix+"__rev");
        f.addParam("x", "i32");
        f.addParam("bits", "i32");
        f.setReturnType("i32");

        const c = f.getCodeBuilder();

        f.addCode(
            c.i32_rotl(
                c.i32_add(
                    c.i32_add(
                        c.i32_shl(
                            c.i32_load8_u(
                                c.i32_and(
                                    c.getLocal("x"),
                                    c.i32_const(0xFF)
                                ),
                                REVTABLE,
                                0
                            ),
                            c.i32_const(24)
                        ),
                        c.i32_shl(
                            c.i32_load8_u(
                                c.i32_and(
                                    c.i32_shr_u(
                                        c.getLocal("x"),
                                        c.i32_const(8)
                                    ),
                                    c.i32_const(0xFF)
                                ),
                                REVTABLE,
                                0
                            ),
                            c.i32_const(16)
                        ),
                    ),
                    c.i32_add(
                        c.i32_shl(
                            c.i32_load8_u(
                                c.i32_and(
                                    c.i32_shr_u(
                                        c.getLocal("x"),
                                        c.i32_const(16)
                                    ),
                                    c.i32_const(0xFF)
                                ),
                                REVTABLE,
                                0
                            ),
                            c.i32_const(8)
                        ),
                        c.i32_load8_u(
                            c.i32_and(
                                c.i32_shr_u(
                                    c.getLocal("x"),
                                    c.i32_const(24)
                                ),
                                c.i32_const(0xFF)
                            ),
                            REVTABLE,
                            0
                        ),
                    )
                ),
                c.getLocal("bits")
            )
        );
    }


    function buildFFTJoin() {
        const f = module.addFunction(prefix+"_fftJoin");
        f.addParam("pBuff1", "i32");
        f.addParam("pBuff2", "i32");
        f.addParam("n", "i32");
        f.addParam("first", "i32");
        f.addParam("inc", "i32");
        f.addLocal("idx1", "i32");
        f.addLocal("idx2", "i32");
        f.addLocal("i", "i32");

        const c = f.getCodeBuilder();

        const W = c.i32_const(module.alloc(n8f));
        const T = c.i32_const(module.alloc(n8g));
        const U = c.i32_const(module.alloc(n8g));

        f.addCode(
            c.call( fPrefix + "_copy", c.getLocal("first"), W),
            c.setLocal("i", c.i32_const(0)),
            c.block(c.loop(
                c.br_if(
                    1,
                    c.i32_eq(
                        c.getLocal("i"),
                        c.getLocal("n")
                    )
                ),

                c.setLocal(
                    "idx1",
                    c.i32_add(
                        c.getLocal("pBuff1"),
                        c.i32_mul(
                            c.getLocal("i"),
                            c.i32_const(n8g)
                        )
                    )
                ),

                c.setLocal(
                    "idx2",
                    c.i32_add(
                        c.getLocal("pBuff2"),
                        c.i32_mul(
                            c.getLocal("i"),
                            c.i32_const(n8g)
                        )
                    )
                ),

                c.call(
                    opGtimesF,
                    c.getLocal("idx2"),
                    W,
                    T
                ),

                c.call(
                    gPrefix + "_copy",
                    c.getLocal("idx1"),
                    U
                ),

                c.call(
                    gPrefix + "_add",
                    U,
                    T,
                    c.getLocal("idx1"),
                ),

                c.call(
                    gPrefix + "_sub",
                    U,
                    T,
                    c.getLocal("idx2"),
                ),

                c.call(
                    fPrefix + "_mul",
                    W,
                    c.getLocal("inc"),
                    W,
                ),

                c.setLocal("i", c.i32_add(c.getLocal("i"), c.i32_const(1))),
                c.br(0)
            ))
        );
    }


    function buildFFTJoinExt() {
        const f = module.addFunction(prefix+"_fftJoinExt");
        f.addParam("pBuff1", "i32");
        f.addParam("pBuff2", "i32");
        f.addParam("n", "i32");
        f.addParam("first", "i32");
        f.addParam("inc", "i32");
        f.addParam("totalBits", "i32");
        f.addLocal("idx1", "i32");
        f.addLocal("idx2", "i32");
        f.addLocal("i", "i32");
        f.addLocal("pShiftToM", "i32");

        const c = f.getCodeBuilder();

        const W = c.i32_const(module.alloc(n8f));
        const U = c.i32_const(module.alloc(n8g));

        f.addCode(

            c.setLocal("pShiftToM",
                c.i32_add(
                    c.i32_const(SHIFT_TO_M),
                    c.i32_mul(
                        c.getLocal("totalBits"),
                        c.i32_const(n8f)
                    )
                )
            ),


            c.call( fPrefix + "_copy", c.getLocal("first"), W),
            c.setLocal("i", c.i32_const(0)),
            c.block(c.loop(
                c.br_if(
                    1,
                    c.i32_eq(
                        c.getLocal("i"),
                        c.getLocal("n")
                    )
                ),

                c.setLocal(
                    "idx1",
                    c.i32_add(
                        c.getLocal("pBuff1"),
                        c.i32_mul(
                            c.getLocal("i"),
                            c.i32_const(n8g)
                        )
                    )
                ),

                c.setLocal(
                    "idx2",
                    c.i32_add(
                        c.getLocal("pBuff2"),
                        c.i32_mul(
                            c.getLocal("i"),
                            c.i32_const(n8g)
                        )
                    )
                ),

                c.call(
                    gPrefix + "_add",
                    c.getLocal("idx1"),
                    c.getLocal("idx2"),
                    U
                ),

                c.call(
                    opGtimesF,
                    c.getLocal("idx2"),
                    c.getLocal("pShiftToM"),
                    c.getLocal("idx2")
                ),

                c.call(
                    gPrefix + "_add",
                    c.getLocal("idx1"),
                    c.getLocal("idx2"),
                    c.getLocal("idx2")
                ),

                c.call(
                    opGtimesF,
                    c.getLocal("idx2"),
                    W,
                    c.getLocal("idx2"),
                ),

                c.call(
                    gPrefix + "_copy",
                    U,
                    c.getLocal("idx1")
                ),

                c.call(
                    fPrefix + "_mul",
                    W,
                    c.getLocal("inc"),
                    W
                ),

                c.setLocal("i", c.i32_add(c.getLocal("i"), c.i32_const(1))),
                c.br(0)
            ))
        );
    }

    function buildFFTJoinExtInv() {
        const f = module.addFunction(prefix+"_fftJoinExtInv");
        f.addParam("pBuff1", "i32");
        f.addParam("pBuff2", "i32");
        f.addParam("n", "i32");
        f.addParam("first", "i32");
        f.addParam("inc", "i32");
        f.addParam("totalBits", "i32");
        f.addLocal("idx1", "i32");
        f.addLocal("idx2", "i32");
        f.addLocal("i", "i32");
        f.addLocal("pShiftToM", "i32");
        f.addLocal("pSConst", "i32");

        const c = f.getCodeBuilder();

        const W = c.i32_const(module.alloc(n8f));
        const U = c.i32_const(module.alloc(n8g));

        f.addCode(

            c.setLocal("pShiftToM",
                c.i32_add(
                    c.i32_const(SHIFT_TO_M),
                    c.i32_mul(
                        c.getLocal("totalBits"),
                        c.i32_const(n8f)
                    )
                )
            ),
            c.setLocal("pSConst",
                c.i32_add(
                    c.i32_const(SCONST),
                    c.i32_mul(
                        c.getLocal("totalBits"),
                        c.i32_const(n8f)
                    )
                )
            ),


            c.call( fPrefix + "_copy", c.getLocal("first"), W),
            c.setLocal("i", c.i32_const(0)),
            c.block(c.loop(
                c.br_if(
                    1,
                    c.i32_eq(
                        c.getLocal("i"),
                        c.getLocal("n")
                    )
                ),

                c.setLocal(
                    "idx1",
                    c.i32_add(
                        c.getLocal("pBuff1"),
                        c.i32_mul(
                            c.getLocal("i"),
                            c.i32_const(n8g)
                        )
                    )
                ),

                c.setLocal(
                    "idx2",
                    c.i32_add(
                        c.getLocal("pBuff2"),
                        c.i32_mul(
                            c.getLocal("i"),
                            c.i32_const(n8g)
                        )
                    )
                ),

                c.call(
                    opGtimesF,
                    c.getLocal("idx2"),
                    W,
                    U
                ),

                c.call(
                    gPrefix + "_sub",
                    c.getLocal("idx1"),
                    U,
                    c.getLocal("idx2"),
                ),

                c.call(
                    opGtimesF,
                    c.getLocal("idx2"),
                    c.getLocal("pSConst"),
                    c.getLocal("idx2")
                ),

                c.call(
                    opGtimesF,
                    c.getLocal("idx1"),
                    c.getLocal("pShiftToM"),
                    c.getLocal("idx1")
                ),

                c.call(
                    gPrefix + "_sub",
                    U,
                    c.getLocal("idx1"),
                    c.getLocal("idx1")
                ),

                c.call(
                    opGtimesF,
                    c.getLocal("idx1"),
                    c.getLocal("pSConst"),
                    c.getLocal("idx1")
                ),

                c.call(
                    fPrefix + "_mul",
                    W,
                    c.getLocal("inc"),
                    W
                ),

                c.setLocal("i", c.i32_add(c.getLocal("i"), c.i32_const(1))),
                c.br(0)
            ))
        );
    }



    function buildPrepareLagrangeEvaluation() {
        const f = module.addFunction(prefix+"_prepareLagrangeEvaluation");
        f.addParam("pBuff1", "i32");
        f.addParam("pBuff2", "i32");
        f.addParam("n", "i32");
        f.addParam("first", "i32");
        f.addParam("inc", "i32");
        f.addParam("totalBits", "i32");
        f.addLocal("idx1", "i32");
        f.addLocal("idx2", "i32");
        f.addLocal("i", "i32");
        f.addLocal("pShiftToM", "i32");
        f.addLocal("pSConst", "i32");

        const c = f.getCodeBuilder();

        const W = c.i32_const(module.alloc(n8f));
        const U = c.i32_const(module.alloc(n8g));

        f.addCode(

            c.setLocal("pShiftToM",
                c.i32_add(
                    c.i32_const(SHIFT_TO_M),
                    c.i32_mul(
                        c.getLocal("totalBits"),
                        c.i32_const(n8f)
                    )
                )
            ),
            c.setLocal("pSConst",
                c.i32_add(
                    c.i32_const(SCONST),
                    c.i32_mul(
                        c.getLocal("totalBits"),
                        c.i32_const(n8f)
                    )
                )
            ),


            c.call( fPrefix + "_copy", c.getLocal("first"), W),
            c.setLocal("i", c.i32_const(0)),
            c.block(c.loop(
                c.br_if(
                    1,
                    c.i32_eq(
                        c.getLocal("i"),
                        c.getLocal("n")
                    )
                ),

                c.setLocal(
                    "idx1",
                    c.i32_add(
                        c.getLocal("pBuff1"),
                        c.i32_mul(
                            c.getLocal("i"),
                            c.i32_const(n8g)
                        )
                    )
                ),

                c.setLocal(
                    "idx2",
                    c.i32_add(
                        c.getLocal("pBuff2"),
                        c.i32_mul(
                            c.getLocal("i"),
                            c.i32_const(n8g)
                        )
                    )
                ),


                c.call(
                    opGtimesF,
                    c.getLocal("idx1"),
                    c.getLocal("pShiftToM"),
                    U
                ),

                c.call(
                    gPrefix + "_sub",
                    c.getLocal("idx2"),
                    U,
                    U
                ),

                c.call(
                    gPrefix + "_sub",
                    c.getLocal("idx1"),
                    c.getLocal("idx2"),
                    c.getLocal("idx2"),
                ),

                c.call(
                    opGtimesF,
                    U,
                    c.getLocal("pSConst"),
                    c.getLocal("idx1"),
                ),

                c.call(
                    opGtimesF,
                    c.getLocal("idx2"),
                    W,
                    c.getLocal("idx2"),
                ),

                c.call(
                    fPrefix + "_mul",
                    W,
                    c.getLocal("inc"),
                    W
                ),

                c.setLocal("i", c.i32_add(c.getLocal("i"), c.i32_const(1))),
                c.br(0)
            ))
        );
    }

    function buildFFTMix() {
        const f = module.addFunction(prefix+"_fftMix");
        f.addParam("pBuff", "i32");
        f.addParam("n", "i32");
        f.addParam("exp", "i32");
        f.addLocal("nGroups", "i32");
        f.addLocal("nPerGroup", "i32");
        f.addLocal("nPerGroupDiv2", "i32");
        f.addLocal("pairOffset", "i32");
        f.addLocal("idx1", "i32");
        f.addLocal("idx2", "i32");
        f.addLocal("i", "i32");
        f.addLocal("j", "i32");
        f.addLocal("pwm", "i32");

        const c = f.getCodeBuilder();

        const W = c.i32_const(module.alloc(n8f));
        const T = c.i32_const(module.alloc(n8g));
        const U = c.i32_const(module.alloc(n8g));

        f.addCode(
            c.setLocal("nPerGroup", c.i32_shl(c.i32_const(1), c.getLocal("exp"))),
            c.setLocal("nPerGroupDiv2", c.i32_shr_u(c.getLocal("nPerGroup"), c.i32_const(1))),
            c.setLocal("nGroups", c.i32_shr_u(c.getLocal("n"), c.getLocal("exp"))),
            c.setLocal("pairOffset", c.i32_mul(c.getLocal("nPerGroupDiv2"), c.i32_const(n8g))),
            c.setLocal("pwm",
                c.i32_add(
                    c.i32_const(ROOTs),
                    c.i32_mul(
                        c.getLocal("exp"),
                        c.i32_const(n8f)
                    )
                )
            ),
            c.setLocal("i", c.i32_const(0)),
            c.block(c.loop(
                c.br_if(
                    1,
                    c.i32_eq(
                        c.getLocal("i"),
                        c.getLocal("nGroups")
                    )
                ),
                c.call( fPrefix + "_one", W),
                c.setLocal("j", c.i32_const(0)),
                c.block(c.loop(
                    c.br_if(
                        1,
                        c.i32_eq(
                            c.getLocal("j"),
                            c.getLocal("nPerGroupDiv2")
                        )
                    ),

                    c.setLocal(
                        "idx1",
                        c.i32_add(
                            c.getLocal("pBuff"),
                            c.i32_mul(
                                c.i32_add(
                                    c.i32_mul(
                                        c.getLocal("i"),
                                        c.getLocal("nPerGroup")
                                    ),
                                    c.getLocal("j")
                                ),
                                c.i32_const(n8g)
                            )
                        )
                    ),

                    c.setLocal(
                        "idx2",
                        c.i32_add(
                            c.getLocal("idx1"),
                            c.getLocal("pairOffset")
                        )
                    ),

                    c.call(
                        opGtimesF,
                        c.getLocal("idx2"),
                        W,
                        T
                    ),

                    c.call(
                        gPrefix + "_copy",
                        c.getLocal("idx1"),
                        U
                    ),

                    c.call(
                        gPrefix + "_add",
                        U,
                        T,
                        c.getLocal("idx1"),
                    ),

                    c.call(
                        gPrefix + "_sub",
                        U,
                        T,
                        c.getLocal("idx2"),
                    ),

                    c.call(
                        fPrefix + "_mul",
                        W,
                        c.getLocal("pwm"),
                        W,
                    ),
                    c.setLocal("j", c.i32_add(c.getLocal("j"), c.i32_const(1))),
                    c.br(0)
                )),
                c.setLocal("i", c.i32_add(c.getLocal("i"), c.i32_const(1))),
                c.br(0)
            ))
        );
    }


    // Reverse all and multiply by factor
    function buildFFTFinal() {
        const f = module.addFunction(prefix+"_fftFinal");
        f.addParam("pBuff", "i32");
        f.addParam("n", "i32");
        f.addParam("factor", "i32");
        f.addLocal("idx1", "i32");
        f.addLocal("idx2", "i32");
        f.addLocal("i", "i32");
        f.addLocal("ndiv2", "i32");

        const c = f.getCodeBuilder();

        const T = c.i32_const(module.alloc(n8g));

        f.addCode(
            c.setLocal("ndiv2", c.i32_shr_u(c.getLocal("n"), c.i32_const(1))),
            c.if(
                c.i32_and(
                    c.getLocal("n"),
                    c.i32_const(1)
                ),
                c.call(
                    opGtimesF,
                    c.i32_add(
                        c.getLocal("pBuff"),
                        c.i32_mul(
                            c.getLocal("ndiv2"),
                            c.i32_const(n8g)
                        )
                    ),
                    c.getLocal("factor"),
                    c.i32_add(
                        c.getLocal("pBuff"),
                        c.i32_mul(
                            c.getLocal("ndiv2"),
                            c.i32_const(n8g)
                        )
                    ),
                ),
            ),
            c.setLocal("i", c.i32_const(0)),
            c.block(c.loop(
                c.br_if(
                    1,
                    c.i32_ge_u(
                        c.getLocal("i"),
                        c.getLocal("ndiv2")
                    )
                ),

                c.setLocal(
                    "idx1",
                    c.i32_add(
                        c.getLocal("pBuff"),
                        c.i32_mul(
                            c.getLocal("i"),
                            c.i32_const(n8g)
                        )
                    )
                ),

                c.setLocal(
                    "idx2",
                    c.i32_add(
                        c.getLocal("pBuff"),
                        c.i32_mul(
                            c.i32_sub(
                                c.i32_sub(
                                    c.getLocal("n"),
                                    c.i32_const(1)
                                ),
                                c.getLocal("i")
                            ),
                            c.i32_const(n8g)
                        )
                    )
                ),

                c.call(
                    opGtimesF,
                    c.getLocal("idx2"),
                    c.getLocal("factor"),
                    T
                ),

                c.call(
                    opGtimesF,
                    c.getLocal("idx1"),
                    c.getLocal("factor"),
                    c.getLocal("idx2"),
                ),

                c.call(
                    gPrefix + "_copy",
                    T,
                    c.getLocal("idx1"),
                ),

                c.setLocal("i", c.i32_add(c.getLocal("i"), c.i32_const(1))),
                c.br(0)
            ))
        );
    }

    buildRev();
    buildReversePermutation();
    buildFinalInverse();
    buildRawFFT();
    buildLog2();
    buildFFT();
    buildIFFT();
    buildFFTJoin();
    buildFFTJoinExt();
    buildFFTJoinExtInv();
    buildFFTMix();
    buildFFTFinal();
    buildPrepareLagrangeEvaluation();

    module.exportFunction(prefix+"_fft");
    module.exportFunction(prefix+"_ifft");
    module.exportFunction(prefix+"_rawfft");
    module.exportFunction(prefix+"_fftJoin");
    module.exportFunction(prefix+"_fftJoinExt");
    module.exportFunction(prefix+"_fftJoinExtInv");
    module.exportFunction(prefix+"_fftMix");
    module.exportFunction(prefix+"_fftFinal");
    module.exportFunction(prefix+"_prepareLagrangeEvaluation");

};


/***/ }),

/***/ 754:
/***/ ((module) => {

/*
    Copyright 2019 0KIMS association.

    This file is part of wasmsnark (Web Assembly zkSnark Prover).

    wasmsnark is a free software: you can redistribute it and/or modify it
    under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    wasmsnark is distributed in the hope that it will be useful, but WITHOUT
    ANY WARRANTY; without even the implied warranty of MERCHANTABILITY
    or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public
    License for more details.

    You should have received a copy of the GNU General Public License
    along with wasmsnark. If not, see <https://www.gnu.org/licenses/>.
*/

module.exports = function buildInt(module, n64, _prefix) {

    const prefix = _prefix || "int";
    if (module.modules[prefix]) return prefix;  // already builded
    module.modules[prefix] = {};

    const n32 = n64*2;
    const n8 = n64*8;

    function buildCopy() {
        const f = module.addFunction(prefix+"_copy");
        f.addParam("px", "i32");
        f.addParam("pr", "i32");

        const c = f.getCodeBuilder();

        for (let i=0; i<n64; i++) {
            f.addCode(
                c.i64_store(
                    c.getLocal("pr"),
                    i*8,
                    c.i64_load(
                        c.getLocal("px"),
                        i*8
                    )
                )
            );
        }
    }

    function buildZero() {
        const f = module.addFunction(prefix+"_zero");
        f.addParam("pr", "i32");

        const c = f.getCodeBuilder();

        for (let i=0; i<n64; i++) {
            f.addCode(
                c.i64_store(
                    c.getLocal("pr"),
                    i*8,
                    c.i64_const(0)
                )
            );
        }
    }

    function buildOne() {
        const f = module.addFunction(prefix+"_one");
        f.addParam("pr", "i32");

        const c = f.getCodeBuilder();

        f.addCode(
            c.i64_store(
                c.getLocal("pr"),
                0,
                c.i64_const(1)
            )
        );
        for (let i=1; i<n64; i++) {
            f.addCode(
                c.i64_store(
                    c.getLocal("pr"),
                    i*8,
                    c.i64_const(0)
                )
            );
        }
    }

    function buildIsZero() {
        const f = module.addFunction(prefix+"_isZero");
        f.addParam("px", "i32");
        f.setReturnType("i32");

        const c = f.getCodeBuilder();

        function getCompCode(n) {
            if (n==0) {
                return  c.ret(c.i64_eqz(
                    c.i64_load(c.getLocal("px"))
                ));
            }
            return c.if(
                c.i64_eqz(
                    c.i64_load(c.getLocal("px"), n*8 )
                ),
                getCompCode(n-1),
                c.ret(c.i32_const(0))
            );
        }

        f.addCode(getCompCode(n64-1));
        f.addCode(c.ret(c.i32_const(0)));
    }

    function buildEq() {
        const f = module.addFunction(prefix+"_eq");
        f.addParam("px", "i32");
        f.addParam("py", "i32");
        f.setReturnType("i32");

        const c = f.getCodeBuilder();

        function getCompCode(n) {
            if (n==0) {
                return  c.ret(c.i64_eq(
                    c.i64_load(c.getLocal("px")),
                    c.i64_load(c.getLocal("py"))
                ));
            }
            return c.if(
                c.i64_eq(
                    c.i64_load(c.getLocal("px"), n*8 ),
                    c.i64_load(c.getLocal("py"), n*8 )
                ),
                getCompCode(n-1),
                c.ret(c.i32_const(0))
            );
        }

        f.addCode(getCompCode(n64-1));
        f.addCode(c.ret(c.i32_const(0)));
    }



    function buildGte() {
        const f = module.addFunction(prefix+"_gte");
        f.addParam("px", "i32");
        f.addParam("py", "i32");
        f.setReturnType("i32");

        const c = f.getCodeBuilder();

        function getCompCode(n) {
            if (n==0) {
                return  c.ret(c.i64_ge_u(
                    c.i64_load(c.getLocal("px")),
                    c.i64_load(c.getLocal("py"))
                ));
            }
            return c.if(
                c.i64_lt_u(
                    c.i64_load(c.getLocal("px"), n*8 ),
                    c.i64_load(c.getLocal("py"), n*8 )
                ),
                c.ret(c.i32_const(0)),
                c.if(
                    c.i64_gt_u(
                        c.i64_load(c.getLocal("px"), n*8 ),
                        c.i64_load(c.getLocal("py"), n*8 )
                    ),
                    c.ret(c.i32_const(1)),
                    getCompCode(n-1)
                )
            );
        }

        f.addCode(getCompCode(n64-1));
        f.addCode(c.ret(c.i32_const(0)));
    }



    function buildAdd() {

        const f = module.addFunction(prefix+"_add");
        f.addParam("x", "i32");
        f.addParam("y", "i32");
        f.addParam("r", "i32");
        f.setReturnType("i32");
        f.addLocal("c", "i64");

        const c = f.getCodeBuilder();

        f.addCode(c.setLocal(
            "c",
            c.i64_add(
                c.i64_load32_u(c.getLocal("x")),
                c.i64_load32_u(c.getLocal("y"))
            )
        ));

        f.addCode(c.i64_store32(
            c.getLocal("r"),
            c.getLocal("c"),
        ));

        for (let i=1; i<n32; i++) {
            f.addCode(c.setLocal( "c",
                c.i64_add(
                    c.i64_add(
                        c.i64_load32_u(c.getLocal("x"), 4*i),
                        c.i64_load32_u(c.getLocal("y"), 4*i)
                    ),
                    c.i64_shr_u (c.getLocal("c"), c.i64_const(32))
                )
            ));

            f.addCode(c.i64_store32(
                c.getLocal("r"),
                i*4,
                c.getLocal("c")
            ));
        }

        f.addCode(c.i32_wrap_i64(c.i64_shr_u (c.getLocal("c"), c.i64_const(32))));
    }


    function buildSub() {

        const f = module.addFunction(prefix+"_sub");
        f.addParam("x", "i32");
        f.addParam("y", "i32");
        f.addParam("r", "i32");
        f.setReturnType("i32");
        f.addLocal("c", "i64");

        const c = f.getCodeBuilder();

        f.addCode(c.setLocal(
            "c",
            c.i64_sub(
                c.i64_load32_u(c.getLocal("x")),
                c.i64_load32_u(c.getLocal("y"))
            )
        ));

        f.addCode(c.i64_store32(
            c.getLocal("r"),
            c.i64_and(
                c.getLocal("c"),
                c.i64_const("0xFFFFFFFF")
            )
        ));

        for (let i=1; i<n32; i++) {
            f.addCode(c.setLocal( "c",
                c.i64_add(
                    c.i64_sub(
                        c.i64_load32_u(c.getLocal("x"), 4*i),
                        c.i64_load32_u(c.getLocal("y"), 4*i)
                    ),
                    c.i64_shr_s (c.getLocal("c"), c.i64_const(32))
                )
            ));

            f.addCode(c.i64_store32(
                c.getLocal("r"),
                i*4,
                c.i64_and( c.getLocal("c"), c.i64_const("0xFFFFFFFF"))
            ));
        }

        f.addCode(c.i32_wrap_i64 ( c.i64_shr_s (c.getLocal("c"), c.i64_const(32))));
    }


    function buildMul() {

        const f = module.addFunction(prefix+"_mul");
        f.addParam("x", "i32");
        f.addParam("y", "i32");
        f.addParam("r", "i32");
        f.addLocal("c0", "i64");
        f.addLocal("c1", "i64");


        for (let i=0;i<n32; i++) {
            f.addLocal("x"+i, "i64");
            f.addLocal("y"+i, "i64");
        }

        const c = f.getCodeBuilder();

        const loadX = [];
        const loadY = [];
        function mulij(i, j) {
            let X,Y;
            if (!loadX[i]) {
                X = c.teeLocal("x"+i, c.i64_load32_u( c.getLocal("x"), i*4));
                loadX[i] = true;
            } else {
                X = c.getLocal("x"+i);
            }
            if (!loadY[j]) {
                Y = c.teeLocal("y"+j, c.i64_load32_u( c.getLocal("y"), j*4));
                loadY[j] = true;
            } else {
                Y = c.getLocal("y"+j);
            }

            return c.i64_mul( X, Y );
        }

        let c0 = "c0";
        let c1 = "c1";

        for (let k=0; k<n32*2-1; k++) {
            for (let i=Math.max(0, k-n32+1); (i<=k)&&(i<n32); i++) {
                const j= k-i;

                f.addCode(
                    c.setLocal(c0,
                        c.i64_add(
                            c.i64_and(
                                c.getLocal(c0),
                                c.i64_const(0xFFFFFFFF)
                            ),
                            mulij(i,j)
                        )
                    )
                );

                f.addCode(
                    c.setLocal(c1,
                        c.i64_add(
                            c.getLocal(c1),
                            c.i64_shr_u(
                                c.getLocal(c0),
                                c.i64_const(32)
                            )
                        )
                    )
                );

            }

            f.addCode(
                c.i64_store32(
                    c.getLocal("r"),
                    k*4,
                    c.getLocal(c0)
                )
            );
            [c0, c1] = [c1, c0];
            f.addCode(
                c.setLocal(c1,
                    c.i64_shr_u(
                        c.getLocal(c0),
                        c.i64_const(32)
                    )
                )
            );
        }
        f.addCode(
            c.i64_store32(
                c.getLocal("r"),
                n32*4*2-4,
                c.getLocal(c0)
            )
        );

    }



    function buildSquare() {

        const f = module.addFunction(prefix+"_square");
        f.addParam("x", "i32");
        f.addParam("r", "i32");
        f.addLocal("c0", "i64");
        f.addLocal("c1", "i64");
        f.addLocal("c0_old", "i64");
        f.addLocal("c1_old", "i64");


        for (let i=0;i<n32; i++) {
            f.addLocal("x"+i, "i64");
        }

        const c = f.getCodeBuilder();

        const loadX = [];
        function mulij(i, j) {
            let X,Y;
            if (!loadX[i]) {
                X = c.teeLocal("x"+i, c.i64_load32_u( c.getLocal("x"), i*4));
                loadX[i] = true;
            } else {
                X = c.getLocal("x"+i);
            }
            if (!loadX[j]) {
                Y = c.teeLocal("x"+j, c.i64_load32_u( c.getLocal("x"), j*4));
                loadX[j] = true;
            } else {
                Y = c.getLocal("x"+j);
            }

            return c.i64_mul( X, Y );
        }

        let c0 = "c0";
        let c1 = "c1";
        let c0_old = "c0_old";
        let c1_old = "c1_old";

        for (let k=0; k<n32*2-1; k++) {
            f.addCode(
                c.setLocal(c0, c.i64_const(0)),
                c.setLocal(c1, c.i64_const(0)),
            );

            for (let i=Math.max(0, k-n32+1); (i<((k+1)>>1) )&&(i<n32); i++) {
                const j= k-i;

                f.addCode(
                    c.setLocal(c0,
                        c.i64_add(
                            c.i64_and(
                                c.getLocal(c0),
                                c.i64_const(0xFFFFFFFF)
                            ),
                            mulij(i,j)
                        )
                    )
                );

                f.addCode(
                    c.setLocal(c1,
                        c.i64_add(
                            c.getLocal(c1),
                            c.i64_shr_u(
                                c.getLocal(c0),
                                c.i64_const(32)
                            )
                        )
                    )
                );
            }

            // Multiply by 2
            f.addCode(
                c.setLocal(c0,
                    c.i64_shl(
                        c.i64_and(
                            c.getLocal(c0),
                            c.i64_const(0xFFFFFFFF)
                        ),
                        c.i64_const(1)
                    )
                )
            );

            f.addCode(
                c.setLocal(c1,
                    c.i64_add(
                        c.i64_shl(
                            c.getLocal(c1),
                            c.i64_const(1)
                        ),
                        c.i64_shr_u(
                            c.getLocal(c0),
                            c.i64_const(32)
                        )
                    )
                )
            );

            if (k%2 == 0) {
                f.addCode(
                    c.setLocal(c0,
                        c.i64_add(
                            c.i64_and(
                                c.getLocal(c0),
                                c.i64_const(0xFFFFFFFF)
                            ),
                            mulij(k>>1, k>>1)
                        )
                    )
                );

                f.addCode(
                    c.setLocal(c1,
                        c.i64_add(
                            c.getLocal(c1),
                            c.i64_shr_u(
                                c.getLocal(c0),
                                c.i64_const(32)
                            )
                        )
                    )
                );
            }

            // Add the old carry

            if (k>0) {
                f.addCode(
                    c.setLocal(c0,
                        c.i64_add(
                            c.i64_and(
                                c.getLocal(c0),
                                c.i64_const(0xFFFFFFFF)
                            ),
                            c.i64_and(
                                c.getLocal(c0_old),
                                c.i64_const(0xFFFFFFFF)
                            ),
                        )
                    )
                );

                f.addCode(
                    c.setLocal(c1,
                        c.i64_add(
                            c.i64_add(
                                c.getLocal(c1),
                                c.i64_shr_u(
                                    c.getLocal(c0),
                                    c.i64_const(32)
                                )
                            ),
                            c.getLocal(c1_old)
                        )
                    )
                );
            }

            f.addCode(
                c.i64_store32(
                    c.getLocal("r"),
                    k*4,
                    c.getLocal(c0)
                )
            );

            f.addCode(
                c.setLocal(
                    c0_old,
                    c.getLocal(c1)
                ),
                c.setLocal(
                    c1_old,
                    c.i64_shr_u(
                        c.getLocal(c0_old),
                        c.i64_const(32)
                    )
                )
            );

        }
        f.addCode(
            c.i64_store32(
                c.getLocal("r"),
                n32*4*2-4,
                c.getLocal(c0_old)
            )
        );

    }


    function buildSquareOld() {
        const f = module.addFunction(prefix+"_squareOld");
        f.addParam("x", "i32");
        f.addParam("r", "i32");

        const c = f.getCodeBuilder();

        f.addCode(c.call(prefix + "_mul", c.getLocal("x"), c.getLocal("x"), c.getLocal("r")));
    }

    function _buildMul1() {
        const f = module.addFunction(prefix+"__mul1");
        f.addParam("px", "i32");
        f.addParam("y", "i64");
        f.addParam("pr", "i32");
        f.addLocal("c", "i64");

        const c = f.getCodeBuilder();

        f.addCode(c.setLocal(
            "c",
            c.i64_mul(
                c.i64_load32_u(c.getLocal("px"), 0, 0),
                c.getLocal("y")
            )
        ));

        f.addCode(c.i64_store32(
            c.getLocal("pr"),
            0,
            0,
            c.getLocal("c"),
        ));

        for (let i=1; i<n32; i++) {
            f.addCode(c.setLocal( "c",
                c.i64_add(
                    c.i64_mul(
                        c.i64_load32_u(c.getLocal("px"), 4*i, 0),
                        c.getLocal("y")
                    ),
                    c.i64_shr_u (c.getLocal("c"), c.i64_const(32))
                )
            ));

            f.addCode(c.i64_store32(
                c.getLocal("pr"),
                i*4,
                0,
                c.getLocal("c")
            ));
        }
    }

    function _buildAdd1() {
        const f = module.addFunction(prefix+"__add1");
        f.addParam("x", "i32");
        f.addParam("y", "i64");
        f.addLocal("c", "i64");
        f.addLocal("px", "i32");

        const c = f.getCodeBuilder();

        f.addCode(c.setLocal("px", c.getLocal("x")));

        f.addCode(c.setLocal(
            "c",
            c.i64_add(
                c.i64_load32_u(c.getLocal("px"), 0, 0),
                c.getLocal("y")
            )
        ));

        f.addCode(c.i64_store32(
            c.getLocal("px"),
            0,
            0,
            c.getLocal("c"),
        ));

        f.addCode(c.setLocal(
            "c",
            c.i64_shr_u(
                c.getLocal("c"),
                c.i64_const(32)
            )
        ));

        f.addCode(c.block(c.loop(
            c.br_if(
                1,
                c.i64_eqz(c.getLocal("c"))
            ),
            c.setLocal(
                "px",
                c.i32_add(
                    c.getLocal("px"),
                    c.i32_const(4)
                )
            ),

            c.setLocal(
                "c",
                c.i64_add(
                    c.i64_load32_u(c.getLocal("px"), 0, 0),
                    c.getLocal("c")
                )
            ),

            c.i64_store32(
                c.getLocal("px"),
                0,
                0,
                c.getLocal("c"),
            ),

            c.setLocal(
                "c",
                c.i64_shr_u(
                    c.getLocal("c"),
                    c.i64_const(32)
                )
            ),

            c.br(0)
        )));
    }


    function buildDiv() {
        _buildMul1();
        _buildAdd1();

        const f = module.addFunction(prefix+"_div");
        f.addParam("x", "i32");
        f.addParam("y", "i32");
        f.addParam("c", "i32");
        f.addParam("r", "i32");
        f.addLocal("rr", "i32");
        f.addLocal("cc", "i32");
        f.addLocal("eX", "i32");
        f.addLocal("eY", "i32");
        f.addLocal("sy", "i64");
        f.addLocal("sx", "i64");
        f.addLocal("ec", "i32");

        const c = f.getCodeBuilder();

        const Y = c.i32_const(module.alloc(n8));
        const Caux = c.i32_const(module.alloc(n8));
        const Raux = c.i32_const(module.alloc(n8));
        const C = c.getLocal("cc");
        const R = c.getLocal("rr");
        const pr1 = module.alloc(n8*2);
        const R1 = c.i32_const(pr1);
        const R2 = c.i32_const(pr1+n8);

        // Ic c is 0 then store it in an auxiliary buffer
        f.addCode(c.if(
            c.getLocal("c"),
            c.setLocal("cc", c.getLocal("c")),
            c.setLocal("cc", Caux)
        ));

        // Ic r is 0 then store it in an auxiliary buffer
        f.addCode(c.if(
            c.getLocal("r"),
            c.setLocal("rr", c.getLocal("r")),
            c.setLocal("rr", Raux)
        ));

        // Copy
        f.addCode(c.call(prefix + "_copy", c.getLocal("x"), R));
        f.addCode(c.call(prefix + "_copy", c.getLocal("y"), Y));
        f.addCode(c.call(prefix + "_zero", C));
        f.addCode(c.call(prefix + "_zero", R1));


        f.addCode(c.setLocal("eX", c.i32_const(n8-1)));
        f.addCode(c.setLocal("eY", c.i32_const(n8-1)));

        // while (eY>3)&&(Y[eY]==0) ey--;
        f.addCode(c.block(c.loop(
            c.br_if(
                1,
                c.i32_or(
                    c.i32_load8_u(
                        c.i32_add(Y , c.getLocal("eY")),
                        0,
                        0
                    ),
                    c.i32_eq(
                        c.getLocal("eY"),
                        c.i32_const(3)
                    )
                )
            ),
            c.setLocal("eY", c.i32_sub(c.getLocal("eY"), c.i32_const(1))),
            c.br(0)
        )));

        f.addCode(
            c.setLocal(
                "sy",
                c.i64_add(
                    c.i64_load32_u(
                        c.i32_sub(
                            c.i32_add( Y, c.getLocal("eY")),
                            c.i32_const(3)
                        ),
                        0,
                        0
                    ),
                    c.i64_const(1)
                )
            )
        );

        // Force a divide by 0 if quotien is 0
        f.addCode(
            c.if(
                c.i64_eq(
                    c.getLocal("sy"),
                    c.i64_const(1)
                ),
                c.drop(c.i64_div_u(c.i64_const(0), c.i64_const(0)))
            )
        );

        f.addCode(c.block(c.loop(

            // while (eX>7)&&(Y[eX]==0) ex--;
            c.block(c.loop(
                c.br_if(
                    1,
                    c.i32_or(
                        c.i32_load8_u(
                            c.i32_add(R , c.getLocal("eX")),
                            0,
                            0
                        ),
                        c.i32_eq(
                            c.getLocal("eX"),
                            c.i32_const(7)
                        )
                    )
                ),
                c.setLocal("eX", c.i32_sub(c.getLocal("eX"), c.i32_const(1))),
                c.br(0)
            )),

            c.setLocal(
                "sx",
                c.i64_load(
                    c.i32_sub(
                        c.i32_add( R, c.getLocal("eX")),
                        c.i32_const(7)
                    ),
                    0,
                    0
                )
            ),

            c.setLocal(
                "sx",
                c.i64_div_u(
                    c.getLocal("sx"),
                    c.getLocal("sy")
                )
            ),
            c.setLocal(
                "ec",
                c.i32_sub(
                    c.i32_sub(
                        c.getLocal("eX"),
                        c.getLocal("eY")
                    ),
                    c.i32_const(4)
                )
            ),

            // While greater than 32 bits or ec is neg, shr and inc exp
            c.block(c.loop(
                c.br_if(
                    1,
                    c.i32_and(
                        c.i64_eqz(
                            c.i64_and(
                                c.getLocal("sx"),
                                c.i64_const("0xFFFFFFFF00000000")
                            )
                        ),
                        c.i32_ge_s(
                            c.getLocal("ec"),
                            c.i32_const(0)
                        )
                    )
                ),

                c.setLocal(
                    "sx",
                    c.i64_shr_u(
                        c.getLocal("sx"),
                        c.i64_const(8)
                    )
                ),

                c.setLocal(
                    "ec",
                    c.i32_add(
                        c.getLocal("ec"),
                        c.i32_const(1)
                    )
                ),
                c.br(0)
            )),

            c.if(
                c.i64_eqz(c.getLocal("sx")),
                [
                    ...c.br_if(
                        2,
                        c.i32_eqz(c.call(prefix + "_gte", R, Y))
                    ),
                    ...c.setLocal("sx", c.i64_const(1)),
                    ...c.setLocal("ec", c.i32_const(0))
                ]
            ),

            c.call(prefix + "__mul1", Y, c.getLocal("sx"), R2),
            c.drop(c.call(
                prefix + "_sub",
                R,
                c.i32_sub(R2, c.getLocal("ec")),
                R
            )),
            c.call(
                prefix + "__add1",
                c.i32_add(C, c.getLocal("ec")),
                c.getLocal("sx")
            ),
            c.br(0)
        )));
    }

    function buildInverseMod() {

        const f = module.addFunction(prefix+"_inverseMod");
        f.addParam("px", "i32");
        f.addParam("pm", "i32");
        f.addParam("pr", "i32");
        f.addLocal("t", "i32");
        f.addLocal("newt", "i32");
        f.addLocal("r", "i32");
        f.addLocal("qq", "i32");
        f.addLocal("qr", "i32");
        f.addLocal("newr", "i32");
        f.addLocal("swp", "i32");
        f.addLocal("x", "i32");
        f.addLocal("signt", "i32");
        f.addLocal("signnewt", "i32");
        f.addLocal("signx", "i32");

        const c = f.getCodeBuilder();

        const aux1 = c.i32_const(module.alloc(n8));
        const aux2 = c.i32_const(module.alloc(n8));
        const aux3 = c.i32_const(module.alloc(n8));
        const aux4 = c.i32_const(module.alloc(n8));
        const aux5 = c.i32_const(module.alloc(n8));
        const aux6 = c.i32_const(module.alloc(n8));
        const mulBuff = c.i32_const(module.alloc(n8*2));
        const aux7 = c.i32_const(module.alloc(n8));

        f.addCode(
            c.setLocal("t", aux1),
            c.call(prefix + "_zero", aux1),
            c.setLocal("signt", c.i32_const(0)),
        );

        f.addCode(
            c.setLocal("r", aux2),
            c.call(prefix + "_copy", c.getLocal("pm"), aux2)
        );

        f.addCode(
            c.setLocal("newt", aux3),
            c.call(prefix + "_one", aux3),
            c.setLocal("signnewt", c.i32_const(0)),
        );

        f.addCode(
            c.setLocal("newr", aux4),
            c.call(prefix + "_copy", c.getLocal("px"), aux4)
        );




        f.addCode(c.setLocal("qq", aux5));
        f.addCode(c.setLocal("qr", aux6));
        f.addCode(c.setLocal("x", aux7));

        f.addCode(c.block(c.loop(
            c.br_if(
                1,
                c.call(prefix + "_isZero", c.getLocal("newr") )
            ),
            c.call(prefix + "_div", c.getLocal("r"), c.getLocal("newr"), c.getLocal("qq"), c.getLocal("qr")),

            c.call(prefix + "_mul", c.getLocal("qq"), c.getLocal("newt"), mulBuff),

            c.if(
                c.getLocal("signt"),
                c.if(
                    c.getLocal("signnewt"),
                    c.if (
                        c.call(prefix + "_gte", mulBuff, c.getLocal("t")),
                        [
                            ...c.drop(c.call(prefix + "_sub", mulBuff, c.getLocal("t"), c.getLocal("x"))),
                            ...c.setLocal("signx", c.i32_const(0))
                        ],
                        [
                            ...c.drop(c.call(prefix + "_sub", c.getLocal("t"), mulBuff, c.getLocal("x"))),
                            ...c.setLocal("signx", c.i32_const(1))
                        ],
                    ),
                    [
                        ...c.drop(c.call(prefix + "_add", mulBuff, c.getLocal("t"), c.getLocal("x"))),
                        ...c.setLocal("signx", c.i32_const(1))
                    ]
                ),
                c.if(
                    c.getLocal("signnewt"),
                    [
                        ...c.drop(c.call(prefix + "_add", mulBuff, c.getLocal("t"), c.getLocal("x"))),
                        ...c.setLocal("signx", c.i32_const(0))
                    ],
                    c.if (
                        c.call(prefix + "_gte", c.getLocal("t"), mulBuff),
                        [
                            ...c.drop(c.call(prefix + "_sub", c.getLocal("t"), mulBuff, c.getLocal("x"))),
                            ...c.setLocal("signx", c.i32_const(0))
                        ],
                        [
                            ...c.drop(c.call(prefix + "_sub", mulBuff, c.getLocal("t"), c.getLocal("x"))),
                            ...c.setLocal("signx", c.i32_const(1))
                        ]
                    )
                )
            ),

            c.setLocal("swp", c.getLocal("t")),
            c.setLocal("t", c.getLocal("newt")),
            c.setLocal("newt", c.getLocal("x")),
            c.setLocal("x", c.getLocal("swp")),

            c.setLocal("signt", c.getLocal("signnewt")),
            c.setLocal("signnewt", c.getLocal("signx")),

            c.setLocal("swp", c.getLocal("r")),
            c.setLocal("r", c.getLocal("newr")),
            c.setLocal("newr", c.getLocal("qr")),
            c.setLocal("qr", c.getLocal("swp")),

            c.br(0)
        )));

        f.addCode(c.if(
            c.getLocal("signt"),
            c.drop(c.call(prefix + "_sub", c.getLocal("pm"), c.getLocal("t"), c.getLocal("pr"))),
            c.call(prefix + "_copy", c.getLocal("t"), c.getLocal("pr"))
        ));
    }


    buildCopy();
    buildZero();
    buildIsZero();
    buildOne();
    buildEq();
    buildGte();
    buildAdd();
    buildSub();
    buildMul();
    buildSquare();
    buildSquareOld();
    buildDiv();
    buildInverseMod();
    module.exportFunction(prefix+"_copy");
    module.exportFunction(prefix+"_zero");
    module.exportFunction(prefix+"_one");
    module.exportFunction(prefix+"_isZero");
    module.exportFunction(prefix+"_eq");
    module.exportFunction(prefix+"_gte");
    module.exportFunction(prefix+"_add");
    module.exportFunction(prefix+"_sub");
    module.exportFunction(prefix+"_mul");
    module.exportFunction(prefix+"_square");
    module.exportFunction(prefix+"_squareOld");
    module.exportFunction(prefix+"_div");
    module.exportFunction(prefix+"_inverseMod");

    return prefix;
};


/***/ }),

/***/ 911:
/***/ ((module) => {

/*
    Copyright 2019 0KIMS association.

    This file is part of wasmsnark (Web Assembly zkSnark Prover).

    wasmsnark is a free software: you can redistribute it and/or modify it
    under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    wasmsnark is distributed in the hope that it will be useful, but WITHOUT
    ANY WARRANTY; without even the implied warranty of MERCHANTABILITY
    or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public
    License for more details.

    You should have received a copy of the GNU General Public License
    along with wasmsnark. If not, see <https://www.gnu.org/licenses/>.
*/

module.exports = function buildMultiexp(module, prefix, fnName, opAdd, n8b) {

    const n64g = module.modules[prefix].n64;
    const n8g = n64g*8;

    function buildGetChunk() {
        const f = module.addFunction(fnName + "_getChunk");
        f.addParam("pScalar", "i32");
        f.addParam("scalarSize", "i32");  // Number of bytes of the scalar
        f.addParam("startBit", "i32");  // Bit to start extract
        f.addParam("chunkSize", "i32");  // Chunk size in bits
        f.addLocal("bitsToEnd", "i32");
        f.addLocal("mask", "i32");
        f.setReturnType("i32");

        const c = f.getCodeBuilder();

        f.addCode(
            c.setLocal("bitsToEnd",
                c.i32_sub(
                    c.i32_mul(
                        c.getLocal("scalarSize"),
                        c.i32_const(8)
                    ),
                    c.getLocal("startBit")
                )
            ),
            c.if(
                c.i32_gt_s(
                    c.getLocal("chunkSize"),
                    c.getLocal("bitsToEnd")
                ),
                c.setLocal(
                    "mask",
                    c.i32_sub(
                        c.i32_shl(
                            c.i32_const(1),
                            c.getLocal("bitsToEnd")
                        ),
                        c.i32_const(1)
                    )
                ),
                c.setLocal(
                    "mask",
                    c.i32_sub(
                        c.i32_shl(
                            c.i32_const(1),
                            c.getLocal("chunkSize")
                        ),
                        c.i32_const(1)
                    )
                )
            ),
            c.i32_and(
                c.i32_shr_u(
                    c.i32_load(
                        c.i32_add(
                            c.getLocal("pScalar"),
                            c.i32_shr_u(
                                c.getLocal("startBit"),
                                c.i32_const(3)
                            )
                        ),
                        0,  // offset
                        0   // align to byte.
                    ),
                    c.i32_and(
                        c.getLocal("startBit"),
                        c.i32_const(0x7)
                    )
                ),
                c.getLocal("mask")
            )
        );
    }

    function buildMutiexpChunk() {
        const f = module.addFunction(fnName + "_chunk");
        f.addParam("pBases", "i32");
        f.addParam("pScalars", "i32");
        f.addParam("scalarSize", "i32");  // Number of points
        f.addParam("n", "i32");  // Number of points
        f.addParam("startBit", "i32");  // bit where it starts the chunk
        f.addParam("chunkSize", "i32");  // bit where it starts the chunk
        f.addParam("pr", "i32");
        f.addLocal("nChunks", "i32");
        f.addLocal("itScalar", "i32");
        f.addLocal("endScalar", "i32");
        f.addLocal("itBase", "i32");
        f.addLocal("i", "i32");
        f.addLocal("j", "i32");
        f.addLocal("nTable", "i32");
        f.addLocal("pTable", "i32");
        f.addLocal("idx", "i32");
        f.addLocal("pIdxTable", "i32");

        const c = f.getCodeBuilder();

        f.addCode(
            c.if(
                c.i32_eqz(c.getLocal("n")),
                [
                    ...c.call(prefix + "_zero", c.getLocal("pr")),
                    ...c.ret([])
                ]
            ),

            // Allocate memory

            c.setLocal(
                "nTable",
                c.i32_shl(
                    c.i32_const(1),
                    c.getLocal("chunkSize")
                )
            ),
            c.setLocal("pTable", c.i32_load( c.i32_const(0) )),
            c.i32_store(
                c.i32_const(0),
                c.i32_add(
                    c.getLocal("pTable"),
                    c.i32_mul(
                        c.getLocal("nTable"),
                        c.i32_const(n8g)
                    )
                )
            ),

            // Reset Table
            c.setLocal("j", c.i32_const(0)),
            c.block(c.loop(
                c.br_if(
                    1,
                    c.i32_eq(
                        c.getLocal("j"),
                        c.getLocal("nTable")
                    )
                ),

                c.call(
                    prefix + "_zero",
                    c.i32_add(
                        c.getLocal("pTable"),
                        c.i32_mul(
                            c.getLocal("j"),
                            c.i32_const(n8g)
                        )
                    )
                ),

                c.setLocal("j", c.i32_add(c.getLocal("j"), c.i32_const(1))),
                c.br(0)
            )),

            // Distribute elements
            c.setLocal("itBase", c.getLocal("pBases")),
            c.setLocal("itScalar", c.getLocal("pScalars")),
            c.setLocal("endScalar",
                c.i32_add(
                    c.getLocal("pScalars"),
                    c.i32_mul(
                        c.getLocal("n"),
                        c.getLocal("scalarSize")
                    )
                )
            ),
            c.block(c.loop(
                c.br_if(
                    1,
                    c.i32_eq(
                        c.getLocal("itScalar"),
                        c.getLocal("endScalar")
                    )
                ),

                c.setLocal(
                    "idx",
                    c.call(fnName + "_getChunk",
                        c.getLocal("itScalar"),
                        c.getLocal("scalarSize"),
                        c.getLocal("startBit"),
                        c.getLocal("chunkSize")
                    )
                ),

                c.if(
                    c.getLocal("idx"),
                    [
                        ...c.setLocal(
                            "pIdxTable",
                            c.i32_add(
                                c.getLocal("pTable"),
                                c.i32_mul(
                                    c.i32_sub(
                                        c.getLocal("idx"),
                                        c.i32_const(1)
                                    ),
                                    c.i32_const(n8g)
                                )
                            )
                        ),
                        ...c.call(
                            opAdd,
                            c.getLocal("pIdxTable"),
                            c.getLocal("itBase"),
                            c.getLocal("pIdxTable"),
                        )
                    ]
                ),

                c.setLocal("itScalar", c.i32_add(c.getLocal("itScalar"), c.getLocal("scalarSize"))),
                c.setLocal("itBase", c.i32_add(c.getLocal("itBase"), c.i32_const(n8b))),
                c.br(0)
            )),

            c.call(fnName + "_reduceTable", c.getLocal("pTable"), c.getLocal("chunkSize")),
            c.call(
                prefix + "_copy",
                c.getLocal("pTable"),
                c.getLocal("pr")
            ),


            c.i32_store(
                c.i32_const(0),
                c.getLocal("pTable")
            )

        );
    }

    function buildMultiexp() {
        const f = module.addFunction(fnName);
        f.addParam("pBases", "i32");
        f.addParam("pScalars", "i32");
        f.addParam("scalarSize", "i32");  // Number of points
        f.addParam("n", "i32");  // Number of points
        f.addParam("pr", "i32");
        f.addLocal("chunkSize", "i32");
        f.addLocal("nChunks", "i32");
        f.addLocal("itScalar", "i32");
        f.addLocal("endScalar", "i32");
        f.addLocal("itBase", "i32");
        f.addLocal("itBit", "i32");
        f.addLocal("i", "i32");
        f.addLocal("j", "i32");
        f.addLocal("nTable", "i32");
        f.addLocal("pTable", "i32");
        f.addLocal("idx", "i32");
        f.addLocal("pIdxTable", "i32");

        const c = f.getCodeBuilder();

        const aux = c.i32_const(module.alloc(n8g));

        const pTSizes = module.alloc([
            17, 17, 17, 17,   17, 17, 17, 17,
            17, 17, 16, 16,   15, 14, 13, 13,
            12, 11, 10,  9,    8,  7,  7,  6,
            5 ,  4,  3,  2,    1,  1,  1,  1
        ]);

        f.addCode(
            c.call(prefix + "_zero", c.getLocal("pr")),
            c.if(
                c.i32_eqz(c.getLocal("n")),
                c.ret([])
            ),
            c.setLocal("chunkSize", c.i32_load8_u( c.i32_clz(c.getLocal("n")),  pTSizes )),
            c.setLocal(
                "nChunks",
                c.i32_add(
                    c.i32_div_u(
                        c.i32_sub(
                            c.i32_shl(
                                c.getLocal("scalarSize"),
                                c.i32_const(3)
                            ),
                            c.i32_const(1)
                        ),
                        c.getLocal("chunkSize")
                    ),
                    c.i32_const(1)
                )
            ),


            // Allocate memory

            c.setLocal(
                "itBit",
                c.i32_mul(
                    c.i32_sub(
                        c.getLocal("nChunks"),
                        c.i32_const(1)
                    ),
                    c.getLocal("chunkSize")
                )
            ),
            c.block(c.loop(
                c.br_if(
                    1,
                    c.i32_lt_s(
                        c.getLocal("itBit"),
                        c.i32_const(0)
                    )
                ),

                // Double nChunk times
                c.if(
                    c.i32_eqz(c.call(prefix + "_isZero", c.getLocal("pr"))),
                    [
                        ...c.setLocal("j", c.i32_const(0)),
                        ...c.block(c.loop(
                            c.br_if(
                                1,
                                c.i32_eq(
                                    c.getLocal("j"),
                                    c.getLocal("chunkSize")
                                )
                            ),

                            c.call(prefix + "_double", c.getLocal("pr"), c.getLocal("pr")),

                            c.setLocal("j", c.i32_add(c.getLocal("j"), c.i32_const(1))),
                            c.br(0)
                        ))
                    ]
                ),

                c.call(
                    fnName + "_chunk",
                    c.getLocal("pBases"),
                    c.getLocal("pScalars"),
                    c.getLocal("scalarSize"),
                    c.getLocal("n"),
                    c.getLocal("itBit"),
                    c.getLocal("chunkSize"),
                    aux
                ),

                c.call(
                    prefix + "_add",
                    c.getLocal("pr"),
                    aux,
                    c.getLocal("pr")
                ),
                c.setLocal("itBit", c.i32_sub(c.getLocal("itBit"), c.getLocal("chunkSize"))),
                c.br(0)
            ))
        );
    }

    function buildReduceTable() {
        const f = module.addFunction(fnName + "_reduceTable");
        f.addParam("pTable", "i32");
        f.addParam("p", "i32");  // Number of bits of the table
        f.addLocal("half", "i32");
        f.addLocal("it1", "i32");
        f.addLocal("it2", "i32");
        f.addLocal("pAcc", "i32");

        const c = f.getCodeBuilder();

        f.addCode(
            c.if(
                c.i32_eq(c.getLocal("p"), c.i32_const(1)),
                c.ret([])
            ),
            c.setLocal(
                "half",
                c.i32_shl(
                    c.i32_const(1),
                    c.i32_sub(
                        c.getLocal("p"),
                        c.i32_const(1)
                    )
                )
            ),

            c.setLocal("it1", c.getLocal("pTable")),
            c.setLocal(
                "it2",
                c.i32_add(
                    c.getLocal("pTable"),
                    c.i32_mul(
                        c.getLocal("half"),
                        c.i32_const(n8g)
                    )
                )
            ),
            c.setLocal("pAcc",
                c.i32_sub(
                    c.getLocal("it2"),
                    c.i32_const(n8g)
                )
            ),
            c.block(c.loop(
                c.br_if(
                    1,
                    c.i32_eq(
                        c.getLocal("it1"),
                        c.getLocal("pAcc")
                    )
                ),
                c.call(
                    prefix + "_add",
                    c.getLocal("it1"),
                    c.getLocal("it2"),
                    c.getLocal("it1")
                ),
                c.call(
                    prefix + "_add",
                    c.getLocal("pAcc"),
                    c.getLocal("it2"),
                    c.getLocal("pAcc")
                ),
                c.setLocal("it1", c.i32_add(c.getLocal("it1"), c.i32_const(n8g))),
                c.setLocal("it2", c.i32_add(c.getLocal("it2"), c.i32_const(n8g))),
                c.br(0)
            )),

            c.call(
                fnName + "_reduceTable",
                c.getLocal("pTable"),
                c.i32_sub(
                    c.getLocal("p"),
                    c.i32_const(1)
                )
            ),

            c.setLocal("p", c.i32_sub(c.getLocal("p"), c.i32_const(1))),
            c.block(c.loop(
                c.br_if(1, c.i32_eqz(c.getLocal("p"))),
                c.call(prefix + "_double", c.getLocal("pAcc"), c.getLocal("pAcc")),
                c.setLocal("p", c.i32_sub(c.getLocal("p"), c.i32_const(1))),
                c.br(0)
            )),

            c.call(prefix + "_add", c.getLocal("pTable"), c.getLocal("pAcc"), c.getLocal("pTable"))
        );
    }

    buildGetChunk();
    buildReduceTable();
    buildMutiexpChunk();
    buildMultiexp();

    module.exportFunction(fnName);
    module.exportFunction(fnName +"_chunk");


};





/***/ }),

/***/ 896:
/***/ ((module) => {

/*
    Copyright 2019 0KIMS association.

    This file is part of wasmsnark (Web Assembly zkSnark Prover).

    wasmsnark is a free software: you can redistribute it and/or modify it
    under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    wasmsnark is distributed in the hope that it will be useful, but WITHOUT
    ANY WARRANTY; without even the implied warranty of MERCHANTABILITY
    or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public
    License for more details.

    You should have received a copy of the GNU General Public License
    along with wasmsnark. If not, see <https://www.gnu.org/licenses/>.
*/

module.exports = function buildPol(module, prefix, prefixField) {

    const n64 = module.modules[prefixField].n64;
    const n8 = n64*8;


    function buildZero() {
        const f = module.addFunction(prefix+"_zero");
        f.addParam("px", "i32");
        f.addParam("n", "i32");
        f.addLocal("lastp", "i32");
        f.addLocal("p", "i32");

        const c = f.getCodeBuilder();

        f.addCode(
            c.setLocal("p", c.getLocal("px")),
            c.setLocal(
                "lastp",
                c.i32_add(
                    c.getLocal("px"),
                    c.i32_mul(
                        c.getLocal("n"),
                        c.i32_const(n8)
                    )
                )
            ),
            c.block(c.loop(
                c.br_if(
                    1,
                    c.i32_eq(
                        c.getLocal("p"),
                        c.getLocal("lastp")
                    )
                ),
                c.call(prefixField + "_zero", c.getLocal("p")),
                c.setLocal("p", c.i32_add(c.getLocal("p"), c.i32_const(n8))),
                c.br(0)
            ))
        );
    }

    function buildConstructLC() {
        const f = module.addFunction(prefix+"_constructLC");
        f.addParam("ppolynomials", "i32");
        f.addParam("psignals", "i32");
        f.addParam("nSignals", "i32");
        f.addParam("pres", "i32");
        f.addLocal("i", "i32");
        f.addLocal("j", "i32");
        f.addLocal("pp", "i32");
        f.addLocal("ps", "i32");
        f.addLocal("pd", "i32");
        f.addLocal("ncoefs", "i32");

        const c = f.getCodeBuilder();

        const aux = c.i32_const(module.alloc(n8));

        f.addCode(
            c.setLocal("i", c.i32_const(0)),
            c.setLocal("pp", c.getLocal("ppolynomials")),
            c.setLocal("ps", c.getLocal("psignals")),
            c.block(c.loop(
                c.br_if(
                    1,
                    c.i32_eq(
                        c.getLocal("i"),
                        c.getLocal("nSignals")
                    )
                ),

                c.setLocal("ncoefs", c.i32_load(c.getLocal("pp"))),
                c.setLocal("pp", c.i32_add(c.getLocal("pp"), c.i32_const(4))),

                c.setLocal("j", c.i32_const(0)),
                c.block(c.loop(
                    c.br_if(
                        1,
                        c.i32_eq(
                            c.getLocal("j"),
                            c.getLocal("ncoefs")
                        )
                    ),

                    c.setLocal(
                        "pd",
                        c.i32_add(
                            c.getLocal("pres"),
                            c.i32_mul(
                                c.i32_load(c.getLocal("pp")),
                                c.i32_const(n8)
                            )
                        )
                    ),

                    c.setLocal("pp", c.i32_add(c.getLocal("pp"), c.i32_const(4))),


                    c.call(
                        prefixField + "_mul",
                        c.getLocal("ps"),
                        c.getLocal("pp"),
                        aux
                    ),

                    c.call(
                        prefixField + "_add",
                        aux,
                        c.getLocal("pd"),
                        c.getLocal("pd")
                    ),

                    c.setLocal("pp", c.i32_add(c.getLocal("pp"), c.i32_const(n8))),
                    c.setLocal("j", c.i32_add(c.getLocal("j"), c.i32_const(1))),
                    c.br(0)
                )),

                c.setLocal("ps", c.i32_add(c.getLocal("ps"), c.i32_const(n8))),
                c.setLocal("i", c.i32_add(c.getLocal("i"), c.i32_const(1))),
                c.br(0)
            ))
        );

    }

    buildZero();
    buildConstructLC();


    module.exportFunction(prefix + "_zero");
    module.exportFunction(prefix + "_constructLC");

    return prefix;




};


/***/ }),

/***/ 637:
/***/ ((module) => {


module.exports = function buildQAP(module, prefix, prefixField) {

    const n64 = module.modules[prefixField].n64;
    const n8 = n64*8;


    function buildBuildABC() {
        const f = module.addFunction(prefix+"_buildABC");
        f.addParam("pCoefs", "i32");
        f.addParam("nCoefs", "i32");
        f.addParam("pWitness", "i32");
        f.addParam("pA", "i32");
        f.addParam("pB", "i32");
        f.addParam("pC", "i32");
        f.addParam("offsetOut", "i32");
        f.addParam("nOut", "i32");
        f.addParam("offsetWitness", "i32");
        f.addParam("nWitness", "i32");
        f.addLocal("it", "i32");
        f.addLocal("ita", "i32");
        f.addLocal("itb", "i32");
        f.addLocal("last", "i32");
        f.addLocal("m", "i32");
        f.addLocal("c", "i32");
        f.addLocal("s", "i32");
        f.addLocal("pOut", "i32");

        const c = f.getCodeBuilder();

        const aux = c.i32_const(module.alloc(n8));

        f.addCode(

            // Set output a and b to 0
            c.setLocal("ita", c.getLocal("pA")),
            c.setLocal("itb", c.getLocal("pB")),
            c.setLocal(
                "last",
                c.i32_add(
                    c.getLocal("pA"),
                    c.i32_mul(
                        c.getLocal("nOut"),
                        c.i32_const(n8)
                    )
                )
            ),
            c.block(c.loop(
                c.br_if(
                    1,
                    c.i32_eq(
                        c.getLocal("ita"),
                        c.getLocal("last")
                    )
                ),
                c.call(prefixField + "_zero", c.getLocal("ita")),
                c.call(prefixField + "_zero", c.getLocal("itb")),
                c.setLocal("ita", c.i32_add(c.getLocal("ita"), c.i32_const(n8))),
                c.setLocal("itb", c.i32_add(c.getLocal("itb"), c.i32_const(n8))),
                c.br(0)
            )),


            c.setLocal("it", c.getLocal("pCoefs")),
            c.setLocal(
                "last",
                c.i32_add(
                    c.getLocal("pCoefs"),
                    c.i32_mul(
                        c.getLocal("nCoefs"),
                        c.i32_const(n8+12)
                    )
                )
            ),
            c.block(c.loop(
                c.br_if(
                    1,
                    c.i32_eq(
                        c.getLocal("it"),
                        c.getLocal("last")
                    )
                ),
                c.setLocal(
                    "s",
                    c.i32_load(c.getLocal("it"), 8)
                ),
                c.if(
                    c.i32_or(
                        c.i32_lt_u(
                            c.getLocal("s"),
                            c.getLocal("offsetWitness"),
                        ),
                        c.i32_ge_u(
                            c.getLocal("s"),
                            c.i32_add(
                                c.getLocal("offsetWitness"),
                                c.getLocal("nWitness"),
                            )
                        )
                    ),
                    [
                        ...c.setLocal("it", c.i32_add(c.getLocal("it"), c.i32_const(n8+12))),
                        ...c.br(1)
                    ]
                ),

                c.setLocal(
                    "m",
                    c.i32_load(c.getLocal("it"))
                ),
                c.if(
                    c.i32_eq(c.getLocal("m"), c.i32_const(0)),
                    c.setLocal("pOut", c.getLocal("pA")),
                    c.if(
                        c.i32_eq(c.getLocal("m"), c.i32_const(1)),
                        c.setLocal("pOut", c.getLocal("pB")),
                        [
                            ...c.setLocal("it", c.i32_add(c.getLocal("it"), c.i32_const(n8+12))),
                            ...c.br(1)
                        ]
                    )
                ),
                c.setLocal(
                    "c",
                    c.i32_load(c.getLocal("it"), 4)
                ),
                c.if(
                    c.i32_or(
                        c.i32_lt_u(
                            c.getLocal("c"),
                            c.getLocal("offsetOut"),
                        ),
                        c.i32_ge_u(
                            c.getLocal("c"),
                            c.i32_add(
                                c.getLocal("offsetOut"),
                                c.getLocal("nOut"),
                            )
                        )
                    ),
                    [
                        ...c.setLocal("it", c.i32_add(c.getLocal("it"), c.i32_const(n8+12))),
                        ...c.br(1)
                    ]
                ),
                c.setLocal(
                    "pOut",
                    c.i32_add(
                        c.getLocal("pOut"),
                        c.i32_mul(
                            c.i32_sub(
                                c.getLocal("c"),
                                c.getLocal("offsetOut")
                            ),
                            c.i32_const(n8)
                        )
                    )
                ),
                c.call(
                    prefixField + "_mul",
                    c.i32_add(
                        c.getLocal("pWitness"),
                        c.i32_mul(
                            c.i32_sub(c.getLocal("s"), c.getLocal("offsetWitness")),
                            c.i32_const(n8)
                        )
                    ),
                    c.i32_add( c.getLocal("it"), c.i32_const(12)),
                    aux
                ),
                c.call(
                    prefixField + "_add",
                    c.getLocal("pOut"),
                    aux,
                    c.getLocal("pOut"),
                ),
                c.setLocal("it", c.i32_add(c.getLocal("it"), c.i32_const(n8+12))),
                c.br(0)
            )),

            c.setLocal("ita", c.getLocal("pA")),
            c.setLocal("itb", c.getLocal("pB")),
            c.setLocal("it", c.getLocal("pC")),
            c.setLocal(
                "last",
                c.i32_add(
                    c.getLocal("pA"),
                    c.i32_mul(
                        c.getLocal("nOut"),
                        c.i32_const(n8)
                    )
                )
            ),
            c.block(c.loop(
                c.br_if(
                    1,
                    c.i32_eq(
                        c.getLocal("ita"),
                        c.getLocal("last")
                    )
                ),
                c.call(
                    prefixField + "_mul",
                    c.getLocal("ita"),
                    c.getLocal("itb"),
                    c.getLocal("it")
                ),
                c.setLocal("ita", c.i32_add(c.getLocal("ita"), c.i32_const(n8))),
                c.setLocal("itb", c.i32_add(c.getLocal("itb"), c.i32_const(n8))),
                c.setLocal("it", c.i32_add(c.getLocal("it"), c.i32_const(n8))),
                c.br(0)
            )),

        );
    }

    function buildJoinABC() {
        const f = module.addFunction(prefix+"_joinABC");
        f.addParam("pA", "i32");
        f.addParam("pB", "i32");
        f.addParam("pC", "i32");
        f.addParam("n", "i32");
        f.addParam("pP", "i32");
        f.addLocal("ita", "i32");
        f.addLocal("itb", "i32");
        f.addLocal("itc", "i32");
        f.addLocal("itp", "i32");
        f.addLocal("last", "i32");

        const c = f.getCodeBuilder();

        const aux = c.i32_const(module.alloc(n8));

        f.addCode(
            c.setLocal("ita", c.getLocal("pA")),
            c.setLocal("itb", c.getLocal("pB")),
            c.setLocal("itc", c.getLocal("pC")),
            c.setLocal("itp", c.getLocal("pP")),
            c.setLocal(
                "last",
                c.i32_add(
                    c.getLocal("pA"),
                    c.i32_mul(
                        c.getLocal("n"),
                        c.i32_const(n8)
                    )
                )
            ),
            c.block(c.loop(
                c.br_if(
                    1,
                    c.i32_eq(
                        c.getLocal("ita"),
                        c.getLocal("last")
                    )
                ),
                c.call(
                    prefixField + "_mul",
                    c.getLocal("ita"),
                    c.getLocal("itb"),
                    aux
                ),
                c.call(
                    prefixField + "_sub",
                    aux,
                    c.getLocal("itc"),
                    c.getLocal("itp"),
                ),
                c.setLocal("ita", c.i32_add(c.getLocal("ita"), c.i32_const(n8))),
                c.setLocal("itb", c.i32_add(c.getLocal("itb"), c.i32_const(n8))),
                c.setLocal("itc", c.i32_add(c.getLocal("itc"), c.i32_const(n8))),
                c.setLocal("itp", c.i32_add(c.getLocal("itp"), c.i32_const(n8))),
                c.br(0)
            ))
        );
    }

    function buildBatchAdd() {
        const f = module.addFunction(prefix+"_batchAdd");
        f.addParam("pa", "i32");
        f.addParam("pb", "i32");
        f.addParam("n", "i32");
        f.addParam("pr", "i32");
        f.addLocal("ita", "i32");
        f.addLocal("itb", "i32");
        f.addLocal("itr", "i32");
        f.addLocal("last", "i32");

        const c = f.getCodeBuilder();

        f.addCode(
            c.setLocal("ita", c.getLocal("pa")),
            c.setLocal("itb", c.getLocal("pb")),
            c.setLocal("itr", c.getLocal("pr")),
            c.setLocal(
                "last",
                c.i32_add(
                    c.getLocal("pa"),
                    c.i32_mul(
                        c.getLocal("n"),
                        c.i32_const(n8)
                    )
                )
            ),
            c.block(c.loop(
                c.br_if(
                    1,
                    c.i32_eq(
                        c.getLocal("ita"),
                        c.getLocal("last")
                    )
                ),
                c.call(
                    prefixField + "_add",
                    c.getLocal("ita"),
                    c.getLocal("itb"),
                    c.getLocal("itr"),
                ),
                c.setLocal("ita", c.i32_add(c.getLocal("ita"), c.i32_const(n8))),
                c.setLocal("itb", c.i32_add(c.getLocal("itb"), c.i32_const(n8))),
                c.setLocal("itr", c.i32_add(c.getLocal("itr"), c.i32_const(n8))),
                c.br(0)
            ))
        );
    }

    buildBuildABC();
    buildJoinABC();
    buildBatchAdd();

    module.exportFunction(prefix + "_buildABC");
    module.exportFunction(prefix + "_joinABC");
    module.exportFunction(prefix + "_batchAdd");

    return prefix;

};



/***/ }),

/***/ 345:
/***/ ((module) => {

/*
    Copyright 2019 0KIMS association.

    This file is part of wasmsnark (Web Assembly zkSnark Prover).

    wasmsnark is a free software: you can redistribute it and/or modify it
    under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    wasmsnark is distributed in the hope that it will be useful, but WITHOUT
    ANY WARRANTY; without even the implied warranty of MERCHANTABILITY
    or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public
    License for more details.

    You should have received a copy of the GNU General Public License
    along with wasmsnark. If not, see <https://www.gnu.org/licenses/>.
*/

module.exports = function buildTimesScalar(module, fnName, elementLen, opAB, opAA, opCopy, opInit) {

    const f = module.addFunction(fnName);
    f.addParam("base", "i32");
    f.addParam("scalar", "i32");
    f.addParam("scalarLength", "i32");
    f.addParam("r", "i32");
    f.addLocal("i", "i32");
    f.addLocal("b", "i32");

    const c = f.getCodeBuilder();

    const aux = c.i32_const(module.alloc(elementLen));

    f.addCode(
        c.if(
            c.i32_eqz(c.getLocal("scalarLength")),
            [
                ...c.call(opInit, c.getLocal("r")),
                ...c.ret([])
            ]
        )
    );
    f.addCode(c.call(opCopy, c.getLocal("base"), aux));
    f.addCode(c.call(opInit, c.getLocal("r")));
    f.addCode(c.setLocal("i", c.getLocal("scalarLength")));
    f.addCode(c.block(c.loop(
        c.setLocal("i", c.i32_sub(c.getLocal("i"), c.i32_const(1))),

        c.setLocal(
            "b",
            c.i32_load8_u(
                c.i32_add(
                    c.getLocal("scalar"),
                    c.getLocal("i")
                )
            )
        ),
        ...innerLoop(),
        c.br_if(1, c.i32_eqz ( c.getLocal("i") )),
        c.br(0)
    )));


    function innerLoop() {
        const code = [];
        for (let i=0; i<8; i++) {
            code.push(
                ...c.call(opAA, c.getLocal("r"), c.getLocal("r")),
                ...c.if(
                    c.i32_ge_u( c.getLocal("b"), c.i32_const(0x80 >> i)),
                    [
                        ...c.setLocal(
                            "b",
                            c.i32_sub(
                                c.getLocal("b"),
                                c.i32_const(0x80 >> i)
                            )
                        ),
                        ...c.call(opAB, c.getLocal("r"),aux, c.getLocal("r"))
                    ]
                )
            );
        }
        return code;
    }

};


/***/ }),

/***/ 591:
/***/ ((module) => {

/*
    Copyright 2019 0KIMS association.

    This file is part of wasmsnark (Web Assembly zkSnark Prover).

    wasmsnark is a free software: you can redistribute it and/or modify it
    under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    wasmsnark is distributed in the hope that it will be useful, but WITHOUT
    ANY WARRANTY; without even the implied warranty of MERCHANTABILITY
    or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public
    License for more details.

    You should have received a copy of the GNU General Public License
    along with wasmsnark. If not, see <https://www.gnu.org/licenses/>.
*/

module.exports = function buildTimesScalarNAF(module, fnName, elementLen, opAB, opAA, opAmB, opCopy, opInit) {

    const f = module.addFunction(fnName);
    f.addParam("base", "i32");
    f.addParam("scalar", "i32");
    f.addParam("scalarLength", "i32");
    f.addParam("r", "i32");
    f.addLocal("old0", "i32");
    f.addLocal("nbits", "i32");
    f.addLocal("i", "i32");
    f.addLocal("last", "i32");
    f.addLocal("cur", "i32");
    f.addLocal("carry", "i32");
    f.addLocal("p", "i32");

    const c = f.getCodeBuilder();

    const aux = c.i32_const(module.alloc(elementLen));

    function getBit(IDX) {
        return c.i32_and(
            c.i32_shr_u(
                c.i32_load(
                    c.i32_add(
                        c.getLocal("scalar"),
                        c.i32_and(
                            c.i32_shr_u(
                                IDX,
                                c.i32_const(3)
                            ),
                            c.i32_const(0xFFFFFFFC)
                        )
                    )
                ),
                c.i32_and(
                    IDX,
                    c.i32_const(0x1F)
                )
            ),
            c.i32_const(1)
        );
    }

    function pushBit(b) {
        return [
            ...c.i32_store8(
                c.getLocal("p"),
                c.i32_const(b)
            ),
            ...c.setLocal(
                "p",
                c.i32_add(
                    c.getLocal("p"),
                    c.i32_const(1)
                )
            )
        ];
    }

    f.addCode(
        c.if(
            c.i32_eqz(c.getLocal("scalarLength")),
            [
                ...c.call(opInit, c.getLocal("r")),
                ...c.ret([])
            ]
        ),
        c.setLocal("nbits", c.i32_shl(c.getLocal("scalarLength"), c.i32_const(3))),
        c.setLocal("old0", c.i32_load(c.i32_const(0))),
        c.setLocal("p", c.getLocal("old0")),
        c.i32_store(
            c.i32_const(0),
            c.i32_and(
                c.i32_add(
                    c.i32_add(
                        c.getLocal("old0"),
                        c.i32_const(32)
                    ),
                    c.getLocal("nbits")
                ),
                c.i32_const(0xFFFFFFF8)
            )
        ),
        c.setLocal("i", c.i32_const(1)),

        c.setLocal("last",getBit(c.i32_const(0))),
        c.setLocal("carry",c.i32_const(0)),

        c.block(c.loop(
            c.br_if(1, c.i32_eq( c.getLocal("i"), c.getLocal("nbits"))),

            c.setLocal("cur", getBit(c.getLocal("i"))),
            c.if( c.getLocal("last"),
                c.if( c.getLocal("cur"),
                    c.if(c.getLocal("carry"),
                        [
                            ...c.setLocal("last", c.i32_const(0)),
                            ...c.setLocal("carry", c.i32_const(1)),
                            ...pushBit(1)
                        ]
                        ,
                        [
                            ...c.setLocal("last", c.i32_const(0)),
                            ...c.setLocal("carry", c.i32_const(1)),
                            ...pushBit(255)
                        ],
                    ),
                    c.if(c.getLocal("carry"),
                        [
                            ...c.setLocal("last", c.i32_const(0)),
                            ...c.setLocal("carry", c.i32_const(1)),
                            ...pushBit(255)
                        ]
                        ,
                        [
                            ...c.setLocal("last", c.i32_const(0)),
                            ...c.setLocal("carry", c.i32_const(0)),
                            ...pushBit(1)
                        ],
                    ),
                ),
                c.if( c.getLocal("cur"),
                    c.if(c.getLocal("carry"),
                        [
                            ...c.setLocal("last", c.i32_const(0)),
                            ...c.setLocal("carry", c.i32_const(1)),
                            ...pushBit(0)
                        ]
                        ,
                        [
                            ...c.setLocal("last", c.i32_const(1)),
                            ...c.setLocal("carry", c.i32_const(0)),
                            ...pushBit(0)
                        ],
                    ),
                    c.if(c.getLocal("carry"),
                        [
                            ...c.setLocal("last", c.i32_const(1)),
                            ...c.setLocal("carry", c.i32_const(0)),
                            ...pushBit(0)
                        ]
                        ,
                        [
                            ...c.setLocal("last", c.i32_const(0)),
                            ...c.setLocal("carry", c.i32_const(0)),
                            ...pushBit(0)
                        ],
                    ),
                )
            ),
            c.setLocal("i", c.i32_add(c.getLocal("i"), c.i32_const(1))),
            c.br(0)
        )),

        c.if( c.getLocal("last"),
            c.if(c.getLocal("carry"),
                [
                    ...pushBit(255),
                    ...pushBit(0),
                    ...pushBit(1)
                ]
                ,
                [
                    ...pushBit(1)
                ],
            ),
            c.if(c.getLocal("carry"),
                [
                    ...pushBit(0),
                    ...pushBit(1)
                ]
            ),
        ),

        c.setLocal("p", c.i32_sub(c.getLocal("p"), c.i32_const(1))),

        // p already points to the last bit

        c.call(opCopy, c.getLocal("base"), aux),

        c.call(opInit, c.getLocal("r")),

        c.block(c.loop(


            c.call(opAA, c.getLocal("r"), c.getLocal("r")),


            c.setLocal("cur",
                c.i32_load8_u(
                    c.getLocal("p")
                )
            ),

            c.if(
                c.getLocal("cur"),
                c.if(
                    c.i32_eq(c.getLocal("cur"), c.i32_const(1)),
                    c.call(opAB,  c.getLocal("r"), aux, c.getLocal("r")),
                    c.call(opAmB, c.getLocal("r"), aux, c.getLocal("r")),
                )
            ),

            c.br_if(1, c.i32_eq( c.getLocal("old0"), c.getLocal("p"))),
            c.setLocal("p", c.i32_sub(c.getLocal("p"), c.i32_const(1))),
            c.br(0)

        )),

        c.i32_store( c.i32_const(0), c.getLocal("old0"))

    );

};


/***/ }),

/***/ 333:
/***/ ((__unused_webpack_module, exports) => {

/*
    Copyright 2019 0KIMS association.

    This file is part of wasmsnark (Web Assembly zkSnark Prover).

    wasmsnark is a free software: you can redistribute it and/or modify it
    under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    wasmsnark is distributed in the hope that it will be useful, but WITHOUT
    ANY WARRANTY; without even the implied warranty of MERCHANTABILITY
    or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public
    License for more details.

    You should have received a copy of the GNU General Public License
    along with wasmsnark. If not, see <https://www.gnu.org/licenses/>.
*/

exports.bigInt2BytesLE = function bigInt2BytesLE(_a, len) {
    const b = Array(len);
    let v = BigInt(_a);
    for (let i=0; i<len; i++) {
        b[i] = Number(v & 0xFFn);
        v = v >> 8n;
    }
    return b;
};

exports.bigInt2U32LE = function bigInt2BytesLE(_a, len) {
    const b = Array(len);
    let v = BigInt(_a);
    for (let i=0; i<len; i++) {
        b[i] = Number(v & 0xFFFFFFFFn);
        v = v >> 32n;
    }
    return b;
};

exports.isOcamNum = function(a) {
    if (!Array.isArray(a)) return false;
    if (a.length != 3) return false;
    if (typeof a[0] !== "number") return false;
    if (typeof a[1] !== "number") return false;
    if (!Array.isArray(a[2])) return false;
    return true;
};




/***/ }),

/***/ 667:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
// ESM COMPAT FLAG
__webpack_require__.r(__webpack_exports__);

// EXPORTS
__webpack_require__.d(__webpack_exports__, {
  "default": () => (/* binding */ node)
});

;// CONCATENATED MODULE: external "url"
const external_url_namespaceObject = require("url");
var external_url_default = /*#__PURE__*/__webpack_require__.n(external_url_namespaceObject);
;// CONCATENATED MODULE: external "vm"
const external_vm_namespaceObject = require("vm");
var external_vm_default = /*#__PURE__*/__webpack_require__.n(external_vm_namespaceObject);
;// CONCATENATED MODULE: external "worker_threads"
const external_worker_threads_namespaceObject = require("worker_threads");
var external_worker_threads_default = /*#__PURE__*/__webpack_require__.n(external_worker_threads_namespaceObject);
;// CONCATENATED MODULE: ./node_modules/web-worker/node.js
/**
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */





const WORKER = Symbol.for('worker');
const EVENTS = Symbol.for('events');

class EventTarget {
	constructor() {
		Object.defineProperty(this, EVENTS, {
			value: new Map()
		});
	}
	dispatchEvent(event) {
		event.target = event.currentTarget = this;
		if (this['on'+event.type]) {
			try {
				this['on'+event.type](event);
			}
			catch (err) {
				console.error(err);
			}
		}
		const list = this[EVENTS].get(event.type);
		if (list == null) return;
		list.forEach(handler => {
			try {
				handler.call(this, event);
			}
			catch (err) {
				console.error(err);
			}
		});
	}
	addEventListener(type, fn) {
		let events = this[EVENTS].get(type);
		if (!events) this[EVENTS].set(type, events = []);
		events.push(fn);
	}
	removeEventListener(type, fn) {
		let events = this[EVENTS].get(type);
		if (events) {
			const index = events.indexOf(fn);
			if (index !== -1) events.splice(index, 1);
		}
	}
}

function Event(type, target) {
	this.type = type;
	this.timeStamp = Date.now();
	this.target = this.currentTarget = this.data = null;
}

// this module is used self-referentially on both sides of the
// thread boundary, but behaves differently in each context.
/* harmony default export */ const node = ((external_worker_threads_default()).isMainThread ? mainThread() : workerThread());

const baseUrl = external_url_default().pathToFileURL(process.cwd() + '/');

function mainThread() {

	/**
	 * A web-compatible Worker implementation atop Node's worker_threads.
	 *  - uses DOM-style events (Event.data, Event.type, etc)
	 *  - supports event handler properties (worker.onmessage)
	 *  - Worker() constructor accepts a module URL
	 *  - accepts the {type:'module'} option
	 *  - emulates WorkerGlobalScope within the worker
	 * @param {string} url  The URL or module specifier to load
	 * @param {object} [options]  Worker construction options
	 * @param {string} [options.name]  Available as `self.name` within the Worker
	 * @param {string} [options.type="classic"]  Pass "module" to create a Module Worker.
	 */
	class Worker extends EventTarget {
		constructor(url, options) {
			super();
			const { name, type } = options || {};
			url += '';
			let mod;
			if (/^data:/.test(url)) {
				mod = url;
			}
			else {
				mod = external_url_default().fileURLToPath(new (external_url_default()).URL(url, baseUrl));
			}
			const worker = new (external_worker_threads_default()).Worker(
				__filename,
				{ workerData: { mod, name, type } }
			);
			Object.defineProperty(this, WORKER, {
				value: worker
			});
			worker.on('message', data => {
				const event = new Event('message');
				event.data = data;
				this.dispatchEvent(event);
			});
			worker.on('error', error => {
				error.type = 'error';
				this.dispatchEvent(error);
			});
			worker.on('exit', () => {
				this.dispatchEvent(new Event('close'));
			});
		}
		postMessage(data, transferList) {
			this[WORKER].postMessage(data, transferList);
		}
		terminate() {
			this[WORKER].terminate();
		}
	}
	Worker.prototype.onmessage = Worker.prototype.onerror = Worker.prototype.onclose = null;
	return Worker;
}

function workerThread() {
	let { mod, name, type } = (external_worker_threads_default()).workerData;
	if (!mod) return mainThread();

	// turn global into a mock WorkerGlobalScope
	const self = global.self = global;

	// enqueue messages to dispatch after modules are loaded
	let q = [];
	function flush() {
		const buffered = q;
		q = null;
		buffered.forEach(event => { self.dispatchEvent(event); });
	}
	external_worker_threads_default().parentPort.on('message', data => {
		const event = new Event('message');
		event.data = data;
		if (q == null) self.dispatchEvent(event);
		else q.push(event);
	});
	external_worker_threads_default().parentPort.on('error', err => {
		err.type = 'Error';
		self.dispatchEvent(err);
	});

	class WorkerGlobalScope extends EventTarget {
		postMessage(data, transferList) {
			external_worker_threads_default().parentPort.postMessage(data, transferList);
		}
		// Emulates https://developer.mozilla.org/en-US/docs/Web/API/DedicatedWorkerGlobalScope/close
		close() {
			process.exit();
		}
	}
	let proto = Object.getPrototypeOf(global);
	delete proto.constructor;
	Object.defineProperties(WorkerGlobalScope.prototype, proto);
	proto = Object.setPrototypeOf(global, new WorkerGlobalScope());
	['postMessage', 'addEventListener', 'removeEventListener', 'dispatchEvent'].forEach(fn => {
		proto[fn] = proto[fn].bind(global);
	});
	global.name = name;

	const isDataUrl = /^data:/.test(mod);
	if (type === 'module') {
		__webpack_require__(235)(mod)
			.catch(err => {
				if (isDataUrl && err.message === 'Not supported') {
					console.warn('Worker(): Importing data: URLs requires Node 12.10+. Falling back to classic worker.');
					return evaluateDataUrl(mod, name);
				}
				console.error(err);
			})
			.then(flush);
	}
	else {
		try {
			if (/^data:/.test(mod)) {
				evaluateDataUrl(mod, name);
			}
			else {
				__webpack_require__(759)(mod);
			}
		}
		catch (err) {
			console.error(err);
		}
		Promise.resolve().then(flush);
	}
}

function evaluateDataUrl(url, name) {
	const { data } = parseDataUrl(url);
	return external_vm_default().runInThisContext(data, {
		filename: 'worker.<'+(name || 'data:')+'>'
	});
}

function parseDataUrl(url) {
	let [m, type, encoding, data] = url.match(/^data: *([^;,]*)(?: *; *([^,]*))? *,(.*)$/) || [];
	if (!m) throw Error('Invalid Data URL.');
	if (encoding) switch (encoding.toLowerCase()) {
		case 'base64':
			data = Buffer.from(data, 'base64').toString();
			break;
		default:
			throw Error('Unknown Data URL encoding "' + encoding + '"');
	}
	return { type, data };
}


/***/ }),

/***/ 235:
/***/ ((module) => {

function webpackEmptyAsyncContext(req) {
	// Here Promise.resolve().then() is used instead of new Promise() to prevent
	// uncaught exception popping up in devtools
	return Promise.resolve().then(() => {
		var e = new Error("Cannot find module '" + req + "'");
		e.code = 'MODULE_NOT_FOUND';
		throw e;
	});
}
webpackEmptyAsyncContext.keys = () => ([]);
webpackEmptyAsyncContext.resolve = webpackEmptyAsyncContext;
webpackEmptyAsyncContext.id = 235;
module.exports = webpackEmptyAsyncContext;

/***/ }),

/***/ 759:
/***/ ((module) => {

function webpackEmptyContext(req) {
	var e = new Error("Cannot find module '" + req + "'");
	e.code = 'MODULE_NOT_FOUND';
	throw e;
}
webpackEmptyContext.keys = () => ([]);
webpackEmptyContext.resolve = webpackEmptyContext;
webpackEmptyContext.id = 759;
module.exports = webpackEmptyContext;

/***/ }),

/***/ 140:
/***/ ((module) => {

"use strict";
module.exports = require("constants");

/***/ }),

/***/ 982:
/***/ ((module) => {

"use strict";
module.exports = require("crypto");

/***/ }),

/***/ 515:
/***/ ((module) => {

"use strict";
module.exports = require("fs");

/***/ }),

/***/ 857:
/***/ ((module) => {

"use strict";
module.exports = require("os");

/***/ }),

/***/ 149:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";


Object.defineProperty(exports, "__esModule", ({ value: true }));

var ffjavascript = __webpack_require__(758);

/*

Copyright 2020 0KIMS association.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

*/

function flatArray(a) {
    var res = [];
    fillArray(res, a);
    return res;

    function fillArray(res, a) {
        if (Array.isArray(a)) {
            for (let i=0; i<a.length; i++) {
                fillArray(res, a[i]);
            }
        } else {
            res.push(a);
        }
    }
}

function fnvHash(str) {
    const uint64_max = BigInt(2) ** BigInt(64);
    let hash = BigInt("0xCBF29CE484222325");
    for (var i = 0; i < str.length; i++) {
    hash ^= BigInt(str[i].charCodeAt());
    hash *= BigInt(0x100000001B3);
    hash %= uint64_max;
    }
    let shash = hash.toString(16);
    let n = 16 - shash.length;
    shash = '0'.repeat(n).concat(shash);
    return shash;
}

// Note that this pads zeros
function toArray32(s,size) {
    const res = []; //new Uint32Array(size); //has no unshift
    let rem = BigInt(s);
    const radix = BigInt(0x100000000);
    while (rem) {
        res.unshift( Number(rem % radix));
        rem = rem / radix;
    }
    if (size) {
    var i = size - res.length;
    while (i>0) {
        res.unshift(0);
        i--;
    }
    }
    return res;
}

/* globals WebAssembly */

async function builder(code, options) {

    options = options || {};

    let memorySize = 32767;
    let memory;
    let memoryAllocated = false;
    while (!memoryAllocated){
        try{
            memory = new WebAssembly.Memory({initial:memorySize});
            memoryAllocated = true;
        } catch(err){
            if(memorySize === 1){
                throw err;
            }
            console.warn("Could not allocate " + memorySize * 1024 * 64 + " bytes. This may cause severe instability. Trying with " + memorySize * 1024 * 64 / 2 + " bytes");
            memorySize = Math.floor(memorySize/2);
        }
    }

    const wasmModule = await WebAssembly.compile(code);

    let wc;

    let errStr = "";
    let msgStr = "";

    // Only circom 2 implements version lookup through exports in the WASM
    // We default to `1` and update if we see the `getVersion` export (major version)
    // These are updated after the instance is instantiated, assuming the functions are available
    let majorVersion = 1;
    // After Circom 2.0.7, Blaine added exported functions for getting minor and patch versions
    let minorVersion = 0;
    // If we can't lookup the patch version, assume the lowest
    let patchVersion = 0;

    const instance = await WebAssembly.instantiate(wasmModule, {
        env: {
            "memory": memory
        },
        runtime: {
            exceptionHandler: function(code) {
                let err;
                if (code == 1) {
                    err = "Signal not found. ";
                } else if (code == 2) {
                    err = "Too many signals set. ";
                } else if (code == 3) {
                    err = "Signal already set. ";
                } else if (code == 4) {
                    err = "Assert Failed. ";
                } else if (code == 5) {
                    err = "Not enough memory. ";
                } else if (code == 6) {
                    err = "Input signal array access exceeds the size. ";
                } else {
                    err = "Unknown error. ";
                }
                console.error("ERROR: ", code, errStr);
                throw new Error(err + errStr);
            },
            // A new way of logging messages was added in Circom 2.0.7 that requires 2 new imports
            // `printErrorMessage` and `writeBufferMessage`.
            printErrorMessage: function() {
                errStr += getMessage() + "\n";
            },
            writeBufferMessage: function() {
                const msg = getMessage();
                // Any calls to `log()` will always end with a `\n`, so that's when we print and reset
                if (msg === "\n") {
                    console.log(msgStr);
                    msgStr = "";
                } else {
                    // If we've buffered other content, put a space in between the items
                    if (msgStr !== "") {
                        msgStr += " ";
                    }
                    // Then append the message to the message we are creating
                    msgStr += msg;
                }
            },
            showSharedRWMemory: function() {
                const shared_rw_memory_size = instance.exports.getFieldNumLen32();
                const arr = new Uint32Array(shared_rw_memory_size);
                for (let j=0; j<shared_rw_memory_size; j++) {
                    arr[shared_rw_memory_size-1-j] = instance.exports.readSharedRWMemory(j);
                }

                // In circom 2.0.7, they changed the log() function to allow strings and changed the
                // output API. This smoothes over the breaking change.
                if (majorVersion >= 2 && (minorVersion >= 1 || patchVersion >= 7)) {
                    // If we've buffered other content, put a space in between the items
                    if (msgStr !== "") {
                        msgStr += " ";
                    }
                    // Then append the value to the message we are creating
                    const msg = (ffjavascript.Scalar.fromArray(arr, 0x100000000).toString());
                    msgStr += msg;
                } else {
                    console.log(ffjavascript.Scalar.fromArray(arr, 0x100000000));
                }
            },
            error: function(code, pstr, a,b,c,d) {
                let errStr;
                if (code == 7) {
                    errStr=p2str(pstr) + " " + wc.getFr(b).toString() + " != " + wc.getFr(c).toString() + " " +p2str(d);
                } else if (code == 9) {
                    errStr=p2str(pstr) + " " + wc.getFr(b).toString() + " " +p2str(c);
                } else if ((code == 5)&&(options.sym)) {
                    errStr=p2str(pstr)+ " " + options.sym.labelIdx2Name[c];
                } else {
                    errStr=p2str(pstr)+ " " + a + " " + b + " " + c + " " + d;
                }
                console.log("ERROR: ", code, errStr);
                throw new Error(errStr);
            },
            log: function(a) {
                console.log(wc.getFr(a).toString());
            },
            logGetSignal: function(signal, pVal) {
                if (options.logGetSignal) {
                    options.logGetSignal(signal, wc.getFr(pVal) );
                }
            },
            logSetSignal: function(signal, pVal) {
                if (options.logSetSignal) {
                    options.logSetSignal(signal, wc.getFr(pVal) );
                }
            },
            logStartComponent: function(cIdx) {
                if (options.logStartComponent) {
                    options.logStartComponent(cIdx);
                }
            },
            logFinishComponent: function(cIdx) {
                if (options.logFinishComponent) {
                    options.logFinishComponent(cIdx);
                }
            }
        }
    });

    if (typeof instance.exports.getVersion == 'function') {
        majorVersion = instance.exports.getVersion();
    }
    if (typeof instance.exports.getMinorVersion == 'function') {
        minorVersion = instance.exports.getMinorVersion();
    }
    if (typeof instance.exports.getPatchVersion == 'function') {
        patchVersion = instance.exports.getPatchVersion();
    }

    const sanityCheck =
        options &&
        (
            options.sanityCheck ||
            options.logGetSignal ||
            options.logSetSignal ||
            options.logStartComponent ||
            options.logFinishComponent
        );

    // We explicitly check for major version 2 in case there's a circom v3 in the future
    if (majorVersion === 2) {
        wc = new WitnessCalculatorCircom2(instance, sanityCheck);
    } else {
        // TODO: Maybe we want to check for the explicit version 1 before choosing this?
        wc = new WitnessCalculatorCircom1(memory, instance, sanityCheck);
    }
    return wc;

    function getMessage() {
        var message = "";
        var c = instance.exports.getMessageChar();
        while ( c != 0 ) {
            message += String.fromCharCode(c);
            c = instance.exports.getMessageChar();
        }
        return message;
    }

    function p2str(p) {
        const i8 = new Uint8Array(memory.buffer);

        const bytes = [];

        for (let i=0; i8[p+i]>0; i++)  bytes.push(i8[p+i]);

        return String.fromCharCode.apply(null, bytes);
    }
}
class WitnessCalculatorCircom1 {
    constructor(memory, instance, sanityCheck) {
        this.memory = memory;
        this.i32 = new Uint32Array(memory.buffer);
        this.instance = instance;

        this.n32 = (this.instance.exports.getFrLen() >> 2) - 2;
        const pRawPrime = this.instance.exports.getPRawPrime();

        const arr = new Array(this.n32);
        for (let i=0; i<this.n32; i++) {
            arr[this.n32-1-i] = this.i32[(pRawPrime >> 2) + i];
        }

        this.prime = ffjavascript.Scalar.fromArray(arr, 0x100000000);

        this.Fr = new ffjavascript.F1Field(this.prime);

        this.mask32 = ffjavascript.Scalar.fromString("FFFFFFFF", 16);
        this.NVars = this.instance.exports.getNVars();
        this.n64 = Math.floor((this.Fr.bitLength - 1) / 64)+1;
        this.R = this.Fr.e( ffjavascript.Scalar.shiftLeft(1 , this.n64*64));
        this.RInv = this.Fr.inv(this.R);
        this.sanityCheck = sanityCheck;
    }

    circom_version() {
        return 1;
    }

    async _doCalculateWitness(input, sanityCheck) {
        this.instance.exports.init((this.sanityCheck || sanityCheck) ? 1 : 0);
        const pSigOffset = this.allocInt();
        const pFr = this.allocFr();
        const keys = Object.keys(input);
        keys.forEach( (k) => {
            const h = fnvHash(k);
            const hMSB = parseInt(h.slice(0,8), 16);
            const hLSB = parseInt(h.slice(8,16), 16);
            try {
                this.instance.exports.getSignalOffset32(pSigOffset, 0, hMSB, hLSB);
            } catch (err) {
                throw new Error(`Signal ${k} is not an input of the circuit.`);
            }
            const sigOffset = this.getInt(pSigOffset);
            const fArr = flatArray(input[k]);
            for (let i=0; i<fArr.length; i++) {
                this.setFr(pFr, fArr[i]);
                this.instance.exports.setSignal(0, 0, sigOffset + i, pFr);
            }
        });
    }

    async calculateWitness(input, sanityCheck) {
        const self = this;

        const old0 = self.i32[0];
        const w = [];

        await self._doCalculateWitness(input, sanityCheck);

        for (let i=0; i<self.NVars; i++) {
            const pWitness = self.instance.exports.getPWitness(i);
            w.push(self.getFr(pWitness));
        }

        self.i32[0] = old0;
        return w;
    }

    async calculateBinWitness(input, sanityCheck) {
        const self = this;

        const old0 = self.i32[0];

        await self._doCalculateWitness(input, sanityCheck);

        const pWitnessBuffer = self.instance.exports.getWitnessBuffer();

        self.i32[0] = old0;

        const buff = self.memory.buffer.slice(pWitnessBuffer, pWitnessBuffer + (self.NVars * self.n64 * 8));
        return new Uint8Array(buff);
    }

    allocInt() {
        const p = this.i32[0];
        this.i32[0] = p+8;
        return p;
    }

    allocFr() {
        const p = this.i32[0];
        this.i32[0] = p+this.n32*4 + 8;
        return p;
    }

    getInt(p) {
        return this.i32[p>>2];
    }

    setInt(p, v) {
        this.i32[p>>2] = v;
    }

    getFr(p) {
        const self = this;
        const idx = (p>>2);

        if (self.i32[idx + 1] & 0x80000000) {
            const arr = new Array(self.n32);
            for (let i=0; i<self.n32; i++) {
                arr[self.n32-1-i] = self.i32[idx+2+i];
            }
            const res = self.Fr.e(ffjavascript.Scalar.fromArray(arr, 0x100000000));
            if (self.i32[idx + 1] & 0x40000000) {
                return fromMontgomery(res);
            } else {
                return res;
            }

        } else {
            if (self.i32[idx] & 0x80000000) {
                return self.Fr.e( self.i32[idx] - 0x100000000);
            } else {
                return self.Fr.e(self.i32[idx]);
            }
        }

        function fromMontgomery(n) {
            return self.Fr.mul(self.RInv, n);
        }

    }


    setFr(p, v) {
        const self = this;

        v = self.Fr.e(v);

        const minShort = self.Fr.neg(self.Fr.e("80000000", 16));
        const maxShort = self.Fr.e("7FFFFFFF", 16);

        if (  (self.Fr.geq(v, minShort))
            &&(self.Fr.leq(v, maxShort)))
        {
            let a;
            if (self.Fr.geq(v, self.Fr.zero)) {
                a = ffjavascript.Scalar.toNumber(v);
            } else {
                a = ffjavascript.Scalar.toNumber( self.Fr.sub(v, minShort));
                a = a - 0x80000000;
                a = 0x100000000 + a;
            }
            self.i32[(p >> 2)] = a;
            self.i32[(p >> 2) + 1] = 0;
            return;
        }

        self.i32[(p >> 2)] = 0;
        self.i32[(p >> 2) + 1] = 0x80000000;
        const arr = ffjavascript.Scalar.toArray(v, 0x100000000);
        for (let i=0; i<self.n32; i++) {
            const idx = arr.length-1-i;

            if ( idx >=0) {
                self.i32[(p >> 2) + 2 + i] = arr[idx];
            } else {
                self.i32[(p >> 2) + 2 + i] = 0;
            }
        }
    }
}

class WitnessCalculatorCircom2 {
    constructor(instance, sanityCheck) {
        this.instance = instance;

        this.version = this.instance.exports.getVersion();
        this.n32 = this.instance.exports.getFieldNumLen32();

        this.instance.exports.getRawPrime();
        const arr = new Array(this.n32);
        for (let i=0; i<this.n32; i++) {
            arr[this.n32-1-i] = this.instance.exports.readSharedRWMemory(i);
        }
        this.prime = ffjavascript.Scalar.fromArray(arr, 0x100000000);

        this.witnessSize = this.instance.exports.getWitnessSize();

        this.sanityCheck = sanityCheck;
    }

    circom_version() {
        return this.instance.exports.getVersion();
    }

    async _doCalculateWitness(input, sanityCheck) {
        //input is assumed to be a map from signals to arrays of bigints
        this.instance.exports.init((this.sanityCheck || sanityCheck) ? 1 : 0);
        const keys = Object.keys(input);
        var input_counter = 0;
        keys.forEach( (k) => {
            const h = fnvHash(k);
            const hMSB = parseInt(h.slice(0,8), 16);
            const hLSB = parseInt(h.slice(8,16), 16);
            const fArr = flatArray(input[k]);
            for (let i=0; i<fArr.length; i++) {
        const arrFr = toArray32(fArr[i],this.n32);
        for (let j=0; j<this.n32; j++) {
            this.instance.exports.writeSharedRWMemory(j,arrFr[this.n32-1-j]);
        }
        try {
                    this.instance.exports.setInputSignal(hMSB, hLSB,i);
            input_counter++;
        } catch (err) {
            // console.log(`After adding signal ${i} of ${k}`)
                    throw new Error(err);
        }
            }

        });
        if (input_counter < this.instance.exports.getInputSize()) {
            throw new Error(`Not all inputs have been set. Only ${input_counter} out of ${this.instance.exports.getInputSize()}`);
        }
    }

    async calculateWitness(input, sanityCheck) {
        const w = [];

        await this._doCalculateWitness(input, sanityCheck);

        for (let i=0; i<this.witnessSize; i++) {
            this.instance.exports.getWitness(i);
        const arr = new Uint32Array(this.n32);
            for (let j=0; j<this.n32; j++) {
            arr[this.n32-1-j] = this.instance.exports.readSharedRWMemory(j);
            }
            w.push(ffjavascript.Scalar.fromArray(arr, 0x100000000));
        }

        return w;
    }

    async calculateWTNSBin(input, sanityCheck) {
        const buff32 = new Uint32Array(this.witnessSize*this.n32+this.n32+11);
        const buff = new  Uint8Array( buff32.buffer);
        await this._doCalculateWitness(input, sanityCheck);

        //"wtns"
        buff[0] = "w".charCodeAt(0);
        buff[1] = "t".charCodeAt(0);
        buff[2] = "n".charCodeAt(0);
        buff[3] = "s".charCodeAt(0);

        //version 2
        buff32[1] = 2;

        //number of sections: 2
        buff32[2] = 2;

        //id section 1
        buff32[3] = 1;

        const n8 = this.n32*4;
        //id section 1 length in 64bytes
        const idSection1length = 8 + n8;
        const idSection1lengthHex = idSection1length.toString(16);
            buff32[4] = parseInt(idSection1lengthHex.slice(0,8), 16);
            buff32[5] = parseInt(idSection1lengthHex.slice(8,16), 16);

        //this.n32
        buff32[6] = n8;

        //prime number
        this.instance.exports.getRawPrime();

        var pos = 7;
        for (let j=0; j<this.n32; j++) {
            buff32[pos+j] = this.instance.exports.readSharedRWMemory(j);
        }
        pos += this.n32;

        // witness size
        buff32[pos] = this.witnessSize;
        pos++;

        //id section 2
        buff32[pos] = 2;
        pos++;

        // section 2 length
        const idSection2length = n8*this.witnessSize;
        const idSection2lengthHex = idSection2length.toString(16);
        buff32[pos] = parseInt(idSection2lengthHex.slice(0,8), 16);
        buff32[pos+1] = parseInt(idSection2lengthHex.slice(8,16), 16);

        pos += 2;
        for (let i=0; i<this.witnessSize; i++) {
            this.instance.exports.getWitness(i);
            for (let j=0; j<this.n32; j++) {
                buff32[pos+j] = this.instance.exports.readSharedRWMemory(j);
            }
            pos += this.n32;
        }

        return buff;
    }

}

exports.WitnessCalculatorBuilder = builder;


/***/ }),

/***/ 758:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";


Object.defineProperty(exports, "__esModule", ({ value: true }));

var crypto = __webpack_require__(982);
var wasmcurves = __webpack_require__(189);
var os = __webpack_require__(857);
var Worker = __webpack_require__(667);
var wasmbuilder = __webpack_require__(14);

function _interopDefaultLegacy (e) { return e && typeof e === 'object' && 'default' in e ? e : { 'default': e }; }

var crypto__default = /*#__PURE__*/_interopDefaultLegacy(crypto);
var os__default = /*#__PURE__*/_interopDefaultLegacy(os);
var Worker__default = /*#__PURE__*/_interopDefaultLegacy(Worker);

/* global BigInt */
const hexLen = [ 0, 1, 2, 2, 3, 3, 3, 3, 4 ,4 ,4 ,4 ,4 ,4 ,4 ,4];

function fromString(s, radix) {
    if ((!radix)||(radix==10)) {
        return BigInt(s);
    } else if (radix==16) {
        if (s.slice(0,2) == "0x") {
            return BigInt(s);
        } else {
            return BigInt("0x"+s);
        }
    }
}

const e = fromString;

function fromArray(a, radix) {
    let acc =BigInt(0);
    radix = BigInt(radix);
    for (let i=0; i<a.length; i++) {
        acc = acc*radix + BigInt(a[i]);
    }
    return acc;
}

function bitLength(a) {
    const aS =a.toString(16);
    return (aS.length-1)*4 +hexLen[parseInt(aS[0], 16)];
}

function isNegative(a) {
    return BigInt(a) < BigInt(0);
}

function isZero(a) {
    return !a;
}

function shiftLeft(a, n) {
    return BigInt(a) << BigInt(n);
}

function shiftRight(a, n) {
    return BigInt(a) >> BigInt(n);
}

const shl = shiftLeft;
const shr = shiftRight;

function isOdd(a) {
    return (BigInt(a) & BigInt(1)) == BigInt(1);
}


function naf(n) {
    let E = BigInt(n);
    const res = [];
    while (E) {
        if (E & BigInt(1)) {
            const z = 2 - Number(E % BigInt(4));
            res.push( z );
            E = E - BigInt(z);
        } else {
            res.push( 0 );
        }
        E = E >> BigInt(1);
    }
    return res;
}


function bits(n) {
    let E = BigInt(n);
    const res = [];
    while (E) {
        if (E & BigInt(1)) {
            res.push(1);
        } else {
            res.push( 0 );
        }
        E = E >> BigInt(1);
    }
    return res;
}

function toNumber(s) {
    if (s>BigInt(Number.MAX_SAFE_INTEGER )) {
        throw new Error("Number too big");
    }
    return Number(s);
}

function toArray(s, radix) {
    const res = [];
    let rem = BigInt(s);
    radix = BigInt(radix);
    while (rem) {
        res.unshift( Number(rem % radix));
        rem = rem / radix;
    }
    return res;
}


function add(a, b) {
    return BigInt(a) + BigInt(b);
}

function sub(a, b) {
    return BigInt(a) - BigInt(b);
}

function neg(a) {
    return -BigInt(a);
}

function mul(a, b) {
    return BigInt(a) * BigInt(b);
}

function square(a) {
    return BigInt(a) * BigInt(a);
}

function pow(a, b) {
    return BigInt(a) ** BigInt(b);
}

function exp$1(a, b) {
    return BigInt(a) ** BigInt(b);
}

function abs(a) {
    return BigInt(a) >= 0 ? BigInt(a) : -BigInt(a);
}

function div(a, b) {
    return BigInt(a) / BigInt(b);
}

function mod(a, b) {
    return BigInt(a) % BigInt(b);
}

function eq(a, b) {
    return BigInt(a) == BigInt(b);
}

function neq(a, b) {
    return BigInt(a) != BigInt(b);
}

function lt(a, b) {
    return BigInt(a) < BigInt(b);
}

function gt(a, b) {
    return BigInt(a) > BigInt(b);
}

function leq(a, b) {
    return BigInt(a) <= BigInt(b);
}

function geq(a, b) {
    return BigInt(a) >= BigInt(b);
}

function band(a, b) {
    return BigInt(a) & BigInt(b);
}

function bor(a, b) {
    return BigInt(a) | BigInt(b);
}

function bxor(a, b) {
    return BigInt(a) ^ BigInt(b);
}

function land(a, b) {
    return BigInt(a) && BigInt(b);
}

function lor(a, b) {
    return BigInt(a) || BigInt(b);
}

function lnot(a) {
    return !BigInt(a);
}

// Returns a buffer with Little Endian Representation
function toRprLE(buff, o, e, n8) {
    const s = "0000000" + e.toString(16);
    const v = new Uint32Array(buff.buffer, buff.byteOffset + o, n8/4);
    const l = (((s.length-7)*4 - 1) >> 5)+1;    // Number of 32bit words;
    for (let i=0; i<l; i++) v[i] = parseInt(s.substring(s.length-8*i-8, s.length-8*i), 16);
    for (let i=l; i<v.length; i++) v[i] = 0;
    for (let i=v.length*4; i<n8; i++) buff[i] = toNumber(band(shiftRight(e, i*8), 0xFF));
}

// Returns a buffer with Big Endian Representation
function toRprBE(buff, o, e, n8) {
    const s = "0000000" + e.toString(16);
    const v = new DataView(buff.buffer, buff.byteOffset + o, n8);
    const l = (((s.length-7)*4 - 1) >> 5)+1;    // Number of 32bit words;
    for (let i=0; i<l; i++) v.setUint32(n8-i*4 -4, parseInt(s.substring(s.length-8*i-8, s.length-8*i), 16), false);
    for (let i=0; i<n8/4-l; i++) v[i] = 0;
}

// Pases a buffer with Little Endian Representation
function fromRprLE(buff, o, n8) {
    n8 = n8 || buff.byteLength;
    o = o || 0;
    const v = new Uint32Array(buff.buffer, buff.byteOffset + o, n8/4);
    const a = new Array(n8/4);
    v.forEach( (ch,i) => a[a.length-i-1] = ch.toString(16).padStart(8,"0") );
    return fromString(a.join(""), 16);
}

// Pases a buffer with Big Endian Representation
function fromRprBE(buff, o, n8) {
    n8 = n8 || buff.byteLength;
    o = o || 0;
    const v = new DataView(buff.buffer, buff.byteOffset + o, n8);
    const a = new Array(n8/4);
    for (let i=0; i<n8/4; i++) {
        a[i] = v.getUint32(i*4, false).toString(16).padStart(8, "0");
    }
    return fromString(a.join(""), 16);
}

function toString(a, radix) {
    return a.toString(radix);
}

function toLEBuff(a) {
    const buff = new Uint8Array(Math.floor((bitLength(a) - 1) / 8) +1);
    toRprLE(buff, 0, a, buff.byteLength);
    return buff;
}

const zero = e(0);
const one = e(1);

var _Scalar = /*#__PURE__*/Object.freeze({
    __proto__: null,
    fromString: fromString,
    e: e,
    fromArray: fromArray,
    bitLength: bitLength,
    isNegative: isNegative,
    isZero: isZero,
    shiftLeft: shiftLeft,
    shiftRight: shiftRight,
    shl: shl,
    shr: shr,
    isOdd: isOdd,
    naf: naf,
    bits: bits,
    toNumber: toNumber,
    toArray: toArray,
    add: add,
    sub: sub,
    neg: neg,
    mul: mul,
    square: square,
    pow: pow,
    exp: exp$1,
    abs: abs,
    div: div,
    mod: mod,
    eq: eq,
    neq: neq,
    lt: lt,
    gt: gt,
    leq: leq,
    geq: geq,
    band: band,
    bor: bor,
    bxor: bxor,
    land: land,
    lor: lor,
    lnot: lnot,
    toRprLE: toRprLE,
    toRprBE: toRprBE,
    fromRprLE: fromRprLE,
    fromRprBE: fromRprBE,
    toString: toString,
    toLEBuff: toLEBuff,
    zero: zero,
    one: one
});

/*
    Copyright 2018 0kims association.

    This file is part of snarkjs.

    snarkjs is a free software: you can redistribute it and/or
    modify it under the terms of the GNU General Public License as published by the
    Free Software Foundation, either version 3 of the License, or (at your option)
    any later version.

    snarkjs is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY
    or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for
    more details.

    You should have received a copy of the GNU General Public License along with
    snarkjs. If not, see <https://www.gnu.org/licenses/>.
*/

/*
    This library does operations on polynomials with coefficients in a field F.

    A polynomial P(x) = p0 + p1 * x + p2 * x^2 + ... + pn * x^n  is represented
    by the array [ p0, p1, p2, ... , pn ].
 */

class PolField {
    constructor (F) {
        this.F = F;

        let rem = F.sqrt_t;
        let s = F.sqrt_s;

        const five = this.F.add(this.F.add(this.F.two, this.F.two), this.F.one);

        this.w = new Array(s+1);
        this.wi = new Array(s+1);
        this.w[s] = this.F.pow(five, rem);
        this.wi[s] = this.F.inv(this.w[s]);

        let n=s-1;
        while (n>=0) {
            this.w[n] = this.F.square(this.w[n+1]);
            this.wi[n] = this.F.square(this.wi[n+1]);
            n--;
        }


        this.roots = [];
/*        for (let i=0; i<16; i++) {
            let r = this.F.one;
            n = 1 << i;
            const rootsi = new Array(n);
            for (let j=0; j<n; j++) {
                rootsi[j] = r;
                r = this.F.mul(r, this.w[i]);
            }

            this.roots.push(rootsi);
        }
    */
        this._setRoots(15);
    }

    _setRoots(n) {
        if (n > this.F.sqrt_s) n = this.s;
        for (let i=n; (i>=0) && (!this.roots[i]); i--) {
            let r = this.F.one;
            const nroots = 1 << i;
            const rootsi = new Array(nroots);
            for (let j=0; j<nroots; j++) {
                rootsi[j] = r;
                r = this.F.mul(r, this.w[i]);
            }
            this.roots[i] = rootsi;
        }
    }

    add(a, b) {
        const m = Math.max(a.length, b.length);
        const res = new Array(m);
        for (let i=0; i<m; i++) {
            res[i] = this.F.add(a[i] || this.F.zero, b[i] || this.F.zero);
        }
        return this.reduce(res);
    }

    double(a) {
        return this.add(a,a);
    }

    sub(a, b) {
        const m = Math.max(a.length, b.length);
        const res = new Array(m);
        for (let i=0; i<m; i++) {
            res[i] = this.F.sub(a[i] || this.F.zero, b[i] || this.F.zero);
        }
        return this.reduce(res);
    }

    mulScalar(p, b) {
        if (this.F.eq(b, this.F.zero)) return [];
        if (this.F.eq(b, this.F.one)) return p;
        const res = new Array(p.length);
        for (let i=0; i<p.length; i++) {
            res[i] = this.F.mul(p[i], b);
        }
        return res;
    }



    mul(a, b) {
        if (a.length == 0) return [];
        if (b.length == 0) return [];
        if (a.length == 1) return this.mulScalar(b, a[0]);
        if (b.length == 1) return this.mulScalar(a, b[0]);

        if (b.length > a.length) {
            [b, a] = [a, b];
        }

        if ((b.length <= 2) || (b.length < log2$2(a.length))) {
            return this.mulNormal(a,b);
        } else {
            return this.mulFFT(a,b);
        }
    }

    mulNormal(a, b) {
        let res = [];
        for (let i=0; i<b.length; i++) {
            res = this.add(res, this.scaleX(this.mulScalar(a, b[i]), i) );
        }
        return res;
    }

    mulFFT(a,b) {
        const longestN = Math.max(a.length, b.length);
        const bitsResult = log2$2(longestN-1)+2;
        this._setRoots(bitsResult);

        const m = 1 << bitsResult;
        const ea = this.extend(a,m);
        const eb = this.extend(b,m);

        const ta = __fft$1(this, ea, bitsResult, 0, 1);
        const tb = __fft$1(this, eb, bitsResult, 0, 1);

        const tres = new Array(m);

        for (let i=0; i<m; i++) {
            tres[i] = this.F.mul(ta[i], tb[i]);
        }

        const res = __fft$1(this, tres, bitsResult, 0, 1);

        const twoinvm = this.F.inv( this.F.mulScalar(this.F.one, m) );
        const resn = new Array(m);
        for (let i=0; i<m; i++) {
            resn[i] = this.F.mul(res[(m-i)%m], twoinvm);
        }

        return this.reduce(resn);
    }



    square(a) {
        return this.mul(a,a);
    }

    scaleX(p, n) {
        if (n==0) {
            return p;
        } else if (n>0) {
            const z = new Array(n).fill(this.F.zero);
            return z.concat(p);
        } else {
            if (-n >= p.length) return [];
            return p.slice(-n);
        }
    }

    eval2(p, x) {
        let v = this.F.zero;
        let ix = this.F.one;
        for (let i=0; i<p.length; i++) {
            v = this.F.add(v, this.F.mul(p[i], ix));
            ix = this.F.mul(ix, x);
        }
        return v;
    }

    eval(p,x) {
        const F = this.F;
        if (p.length == 0) return F.zero;
        const m = this._next2Power(p.length);
        const ep = this.extend(p, m);

        return _eval(ep, x, 0, 1, m);

        function _eval(p, x, offset, step, n) {
            if (n==1) return p[offset];
            const newX = F.square(x);
            const res= F.add(
                _eval(p, newX, offset, step << 1, n >> 1),
                F.mul(
                    x,
                    _eval(p, newX, offset+step , step << 1, n >> 1)));
            return res;
        }
    }

    lagrange(points) {
        let roots = [this.F.one];
        for (let i=0; i<points.length; i++) {
            roots = this.mul(roots, [this.F.neg(points[i][0]), this.F.one]);
        }

        let sum = [];
        for (let i=0; i<points.length; i++) {
            let mpol = this.ruffini(roots, points[i][0]);
            const factor =
                this.F.mul(
                    this.F.inv(this.eval(mpol, points[i][0])),
                    points[i][1]);
            mpol = this.mulScalar(mpol, factor);
            sum = this.add(sum, mpol);
        }
        return sum;
    }


    fft(p) {
        if (p.length <= 1) return p;
        const bits = log2$2(p.length-1)+1;
        this._setRoots(bits);

        const m = 1 << bits;
        const ep = this.extend(p, m);
        const res = __fft$1(this, ep, bits, 0, 1);
        return res;
    }

    fft2(p) {
        if (p.length <= 1) return p;
        const bits = log2$2(p.length-1)+1;
        this._setRoots(bits);

        const m = 1 << bits;
        const ep = this.extend(p, m);
        __bitReverse(ep, bits);
        const res = __fft2(this, ep, bits);
        return res;
    }


    ifft(p) {

        if (p.length <= 1) return p;
        const bits = log2$2(p.length-1)+1;
        this._setRoots(bits);
        const m = 1 << bits;
        const ep = this.extend(p, m);
        const res =  __fft$1(this, ep, bits, 0, 1);

        const twoinvm = this.F.inv( this.F.mulScalar(this.F.one, m) );
        const resn = new Array(m);
        for (let i=0; i<m; i++) {
            resn[i] = this.F.mul(res[(m-i)%m], twoinvm);
        }

        return resn;

    }


    ifft2(p) {

        if (p.length <= 1) return p;
        const bits = log2$2(p.length-1)+1;
        this._setRoots(bits);
        const m = 1 << bits;
        const ep = this.extend(p, m);
        __bitReverse(ep, bits);
        const res =  __fft2(this, ep, bits);

        const twoinvm = this.F.inv( this.F.mulScalar(this.F.one, m) );
        const resn = new Array(m);
        for (let i=0; i<m; i++) {
            resn[i] = this.F.mul(res[(m-i)%m], twoinvm);
        }

        return resn;

    }

    _fft(pall, bits, offset, step) {

        const n = 1 << bits;
        if (n==1) {
            return [ pall[offset] ];
        }

        const ndiv2 = n >> 1;
        const p1 = this._fft(pall, bits-1, offset, step*2);
        const p2 = this._fft(pall, bits-1, offset+step, step*2);

        const out = new Array(n);

        let m= this.F.one;
        for (let i=0; i<ndiv2; i++) {
            out[i] = this.F.add(p1[i], this.F.mul(m, p2[i]));
            out[i+ndiv2] = this.F.sub(p1[i], this.F.mul(m, p2[i]));
            m = this.F.mul(m, this.w[bits]);
        }

        return out;
    }

    extend(p, e) {
        if (e == p.length) return p;
        const z = new Array(e-p.length).fill(this.F.zero);

        return p.concat(z);
    }

    reduce(p) {
        if (p.length == 0) return p;
        if (! this.F.eq(p[p.length-1], this.F.zero) ) return p;
        let i=p.length-1;
        while( i>0 && this.F.eq(p[i], this.F.zero) ) i--;
        return p.slice(0, i+1);
    }

    eq(a, b) {
        const pa = this.reduce(a);
        const pb = this.reduce(b);

        if (pa.length != pb.length) return false;
        for (let i=0; i<pb.length; i++) {
            if (!this.F.eq(pa[i], pb[i])) return false;
        }

        return true;
    }

    ruffini(p, r) {
        const res = new Array(p.length-1);
        res[res.length-1] = p[p.length-1];
        for (let i = res.length-2; i>=0; i--) {
            res[i] = this.F.add(this.F.mul(res[i+1], r), p[i+1]);
        }
        return res;
    }

    _next2Power(v) {
        v--;
        v |= v >> 1;
        v |= v >> 2;
        v |= v >> 4;
        v |= v >> 8;
        v |= v >> 16;
        v++;
        return v;
    }

    toString(p) {
        const ap = this.normalize(p);
        let S = "";
        for (let i=ap.length-1; i>=0; i--) {
            if (!this.F.eq(p[i], this.F.zero)) {
                if (S!="") S += " + ";
                S = S + p[i].toString(10);
                if (i>0) {
                    S = S + "x";
                    if (i>1) {
                        S = S + "^" +i;
                    }
                }
            }
        }
        return S;
    }

    normalize(p) {
        const res  = new Array(p.length);
        for (let i=0; i<p.length; i++) {
            res[i] = this.F.normalize(p[i]);
        }
        return res;
    }


    _reciprocal(p, bits) {
        const k = 1 << bits;
        if (k==1) {
            return [ this.F.inv(p[0]) ];
        }
        const np = this.scaleX(p, -k/2);
        const q = this._reciprocal(np, bits-1);
        const a = this.scaleX(this.double(q), 3*k/2-2);
        const b = this.mul( this.square(q), p);

        return this.scaleX(this.sub(a,b),   -(k-2));
    }

    // divides x^m / v
    _div2(m, v) {
        const kbits = log2$2(v.length-1)+1;
        const k = 1 << kbits;

        const scaleV = k - v.length;

        // rec = x^(k - 2) / v* x^scaleV =>
        // rec = x^(k-2-scaleV)/ v
        //
        // res = x^m/v = x^(m + (2*k-2 - scaleV) - (2*k-2 - scaleV)) /v =>
        // res = rec * x^(m - (2*k-2 - scaleV)) =>
        // res = rec * x^(m - 2*k + 2 + scaleV)

        const rec = this._reciprocal(this.scaleX(v, scaleV), kbits);
        const res = this.scaleX(rec, m - 2*k + 2 + scaleV);

        return res;
    }

    div(_u, _v) {
        if (_u.length < _v.length) return [];
        const kbits = log2$2(_v.length-1)+1;
        const k = 1 << kbits;

        const u = this.scaleX(_u, k-_v.length);
        const v = this.scaleX(_v, k-_v.length);

        const n = v.length-1;
        let m = u.length-1;

        const s = this._reciprocal(v, kbits);
        let t;
        if (m>2*n) {
            t = this.sub(this.scaleX([this.F.one], 2*n), this.mul(s, v));
        }

        let q = [];
        let rem = u;
        let us, ut;
        let finish = false;

        while (!finish) {
            us = this.mul(rem, s);
            q = this.add(q, this.scaleX(us, -2*n));

            if ( m > 2*n ) {
                ut = this.mul(rem, t);
                rem = this.scaleX(ut, -2*n);
                m = rem.length-1;
            } else {
                finish = true;
            }
        }

        return q;
    }


    // returns the ith nth-root of one
    oneRoot(n, i) {
        let nbits = log2$2(n-1)+1;
        let res = this.F.one;
        let r = i;

        if(i>=n) {
            throw new Error("Given 'i' should be lower than 'n'");
        }
        else if (1<<nbits !== n) {
            throw new Error(`Internal errlr: ${n} should equal ${1<<nbits}`);
        }

        while (r>0) {
            if (r & 1 == 1) {
                res = this.F.mul(res, this.w[nbits]);
            }
            r = r >> 1;
            nbits --;
        }
        return res;
    }

    computeVanishingPolinomial(bits, t) {
        const m = 1 << bits;
        return this.F.sub(this.F.pow(t, m), this.F.one);
    }

    evaluateLagrangePolynomials(bits, t) {
        const m= 1 << bits;
        const tm = this.F.pow(t, m);
        const u= new Array(m).fill(this.F.zero);
        this._setRoots(bits);
        const omega = this.w[bits];

        if (this.F.eq(tm, this.F.one)) {
            for (let i = 0; i < m; i++) {
                if (this.F.eq(this.roots[bits][0],t)) { // i.e., t equals omega^i
                    u[i] = this.F.one;
                    return u;
                }
            }
        }

        const z = this.F.sub(tm, this.F.one);
        //        let l = this.F.mul(z,  this.F.pow(this.F.twoinv, m));
        let l = this.F.mul(z,  this.F.inv(this.F.e(m)));
        for (let i = 0; i < m; i++) {
            u[i] = this.F.mul(l, this.F.inv(this.F.sub(t,this.roots[bits][i])));
            l = this.F.mul(l, omega);
        }

        return u;
    }

    log2(V) {
        return log2$2(V);
    }
}

function log2$2( V )
{
    return( ( ( V & 0xFFFF0000 ) !== 0 ? ( V &= 0xFFFF0000, 16 ) : 0 ) | ( ( V & 0xFF00FF00 ) !== 0 ? ( V &= 0xFF00FF00, 8 ) : 0 ) | ( ( V & 0xF0F0F0F0 ) !== 0 ? ( V &= 0xF0F0F0F0, 4 ) : 0 ) | ( ( V & 0xCCCCCCCC ) !== 0 ? ( V &= 0xCCCCCCCC, 2 ) : 0 ) | ( ( V & 0xAAAAAAAA ) !== 0 ) );
}


function __fft$1(PF, pall, bits, offset, step) {

    const n = 1 << bits;
    if (n==1) {
        return [ pall[offset] ];
    } else if (n==2) {
        return [
            PF.F.add(pall[offset], pall[offset + step]),
            PF.F.sub(pall[offset], pall[offset + step])];
    }

    const ndiv2 = n >> 1;
    const p1 = __fft$1(PF, pall, bits-1, offset, step*2);
    const p2 = __fft$1(PF, pall, bits-1, offset+step, step*2);

    const out = new Array(n);

    for (let i=0; i<ndiv2; i++) {
        out[i] = PF.F.add(p1[i], PF.F.mul(PF.roots[bits][i], p2[i]));
        out[i+ndiv2] = PF.F.sub(p1[i], PF.F.mul(PF.roots[bits][i], p2[i]));
    }

    return out;
}


function __fft2(PF, pall, bits) {

    const n = 1 << bits;
    if (n==1) {
        return [ pall[0] ];
    }

    const ndiv2 = n >> 1;
    const p1 = __fft2(PF, pall.slice(0, ndiv2), bits-1);
    const p2 = __fft2(PF, pall.slice(ndiv2), bits-1);

    const out = new Array(n);

    for (let i=0; i<ndiv2; i++) {
        out[i] = PF.F.add(p1[i], PF.F.mul(PF.roots[bits][i], p2[i]));
        out[i+ndiv2] = PF.F.sub(p1[i], PF.F.mul(PF.roots[bits][i], p2[i]));
    }

    return out;
}

const _revTable$1 = [];
for (let i=0; i<256; i++) {
    _revTable$1[i] = _revSlow$1(i, 8);
}

function _revSlow$1(idx, bits) {
    let res =0;
    let a = idx;
    for (let i=0; i<bits; i++) {
        res <<= 1;
        res = res | (a &1);
        a >>=1;
    }
    return res;
}

function rev(idx, bits) {
    return (
        _revTable$1[idx >>> 24] |
        (_revTable$1[(idx >>> 16) & 0xFF] << 8) |
        (_revTable$1[(idx >>> 8) & 0xFF] << 16) |
        (_revTable$1[idx & 0xFF] << 24)
    ) >>> (32-bits);
}

function __bitReverse(p, bits) {
    for (let k=0; k<p.length; k++) {
        const r = rev(k, bits);
        if (r>k) {
            const tmp= p[k];
            p[k] = p[r];
            p[r] = tmp;
        }
    }

}

/*
    Copyright 2018 0kims association.

    This file is part of snarkjs.

    snarkjs is a free software: you can redistribute it and/or
    modify it under the terms of the GNU General Public License as published by the
    Free Software Foundation, either version 3 of the License, or (at your option)
    any later version.

    snarkjs is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY
    or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for
    more details.

    You should have received a copy of the GNU General Public License along with
    snarkjs. If not, see <https://www.gnu.org/licenses/>.
*/


function mulScalar(F, base, e) {
    let res;

    if (isZero(e)) return F.zero;

    const n = naf(e);

    if (n[n.length-1] == 1) {
        res = base;
    } else if (n[n.length-1] == -1) {
        res = F.neg(base);
    } else {
        throw new Error("invlaud NAF");
    }

    for (let i=n.length-2; i>=0; i--) {

        res = F.double(res);

        if (n[i] == 1) {
            res = F.add(res, base);
        } else if (n[i] == -1) {
            res = F.sub(res, base);
        }
    }

    return res;
}


/*
exports.mulScalar = (F, base, e) =>{
    let res = F.zero;
    let rem = bigInt(e);
    let exp = base;

    while (! rem.eq(bigInt.zero)) {
        if (rem.and(bigInt.one).eq(bigInt.one)) {
            res = F.add(res, exp);
        }
        exp = F.double(exp);
        rem = rem.shiftRight(1);
    }

    return res;
};
*/


function exp(F, base, e) {

    if (isZero(e)) return F.one;

    const n = bits(e);

    if (n.length==0) return F.one;

    let res = base;

    for (let i=n.length-2; i>=0; i--) {

        res = F.square(res);

        if (n[i]) {
            res = F.mul(res, base);
        }
    }

    return res;
}

// Check here: https://eprint.iacr.org/2012/685.pdf

function buildSqrt (F) {
    if ((F.m % 2) == 1) {
        if (eq(mod(F.p, 4), 1 )) {
            if (eq(mod(F.p, 8), 1 )) {
                if (eq(mod(F.p, 16), 1 )) {
                    // alg7_muller(F);
                    alg5_tonelliShanks(F);
                } else if (eq(mod(F.p, 16), 9 )) {
                    alg4_kong(F);
                } else {
                    throw new Error("Field withot sqrt");
                }
            } else if (eq(mod(F.p, 8), 5 )) {
                alg3_atkin(F);
            } else {
                throw new Error("Field withot sqrt");
            }
        } else if (eq(mod(F.p, 4), 3 )) {
            alg2_shanks(F);
        }
    } else {
        const pm2mod4 = mod(pow(F.p, F.m/2), 4);
        if (pm2mod4 == 1) {
            alg10_adj(F);
        } else if (pm2mod4 == 3) {
            alg9_adj(F);
        } else {
            alg8_complex(F);
        }

    }
}


function alg5_tonelliShanks(F) {
    F.sqrt_q = pow(F.p, F.m);

    F.sqrt_s = 0;
    F.sqrt_t = sub(F.sqrt_q, 1);

    while (!isOdd(F.sqrt_t)) {
        F.sqrt_s = F.sqrt_s + 1;
        F.sqrt_t = div(F.sqrt_t, 2);
    }

    let c0 = F.one;

    while (F.eq(c0, F.one)) {
        const c = F.random();
        F.sqrt_z = F.pow(c, F.sqrt_t);
        c0 = F.pow(F.sqrt_z, 2 ** (F.sqrt_s-1) );
    }

    F.sqrt_tm1d2 = div(sub(F.sqrt_t, 1),2);

    F.sqrt = function(a) {
        const F=this;
        if (F.isZero(a)) return F.zero;
        let w = F.pow(a, F.sqrt_tm1d2);
        const a0 = F.pow( F.mul(F.square(w), a), 2 ** (F.sqrt_s-1) );
        if (F.eq(a0, F.negone)) return null;

        let v = F.sqrt_s;
        let x = F.mul(a, w);
        let b = F.mul(x, w);
        let z = F.sqrt_z;
        while (!F.eq(b, F.one)) {
            let b2k = F.square(b);
            let k=1;
            while (!F.eq(b2k, F.one)) {
                b2k = F.square(b2k);
                k++;
            }

            w = z;
            for (let i=0; i<v-k-1; i++) {
                w = F.square(w);
            }
            z = F.square(w);
            b = F.mul(b, z);
            x = F.mul(x, w);
            v = k;
        }
        return F.geq(x, F.zero) ? x : F.neg(x);
    };
}

function alg4_kong(F) {
    F.sqrt = function() {
        throw new Error("Sqrt alg 4 not implemented");
    };
}

function alg3_atkin(F) {
    F.sqrt = function() {
        throw new Error("Sqrt alg 3 not implemented");
    };
}

function alg2_shanks(F) {

    F.sqrt_q = pow(F.p, F.m);
    F.sqrt_e1 = div( sub(F.sqrt_q, 3) , 4);

    F.sqrt = function(a) {
        if (this.isZero(a)) return this.zero;

        // Test that have solution
        const a1 = this.pow(a, this.sqrt_e1);

        const a0 = this.mul(this.square(a1), a);

        if ( this.eq(a0, this.negone) ) return null;

        const x = this.mul(a1, a);

        return F.geq(x, F.zero) ? x : F.neg(x);
    };
}

function alg10_adj(F) {
    F.sqrt = function() {
        throw new Error("Sqrt alg 10 not implemented");
    };
}

function alg9_adj(F) {
    F.sqrt_q = pow(F.p, F.m/2);
    F.sqrt_e34 = div( sub(F.sqrt_q, 3) , 4);
    F.sqrt_e12 = div( sub(F.sqrt_q, 1) , 2);

    F.frobenius = function(n, x) {
        if ((n%2) == 1) {
            return F.conjugate(x);
        } else {
            return x;
        }
    };

    F.sqrt = function(a) {
        const F = this;
        const a1 = F.pow(a, F.sqrt_e34);
        const alfa = F.mul(F.square(a1), a);
        const a0 = F.mul(F.frobenius(1, alfa), alfa);
        if (F.eq(a0, F.negone)) return null;
        const x0 = F.mul(a1, a);
        let x;
        if (F.eq(alfa, F.negone)) {
            x = F.mul(x0, [F.F.zero, F.F.one]);
        } else {
            const b = F.pow(F.add(F.one, alfa), F.sqrt_e12);
            x = F.mul(b, x0);
        }
        return F.geq(x, F.zero) ? x : F.neg(x);
    };
}


function alg8_complex(F) {
    F.sqrt = function() {
        throw new Error("Sqrt alg 8 not implemented");
    };
}

function quarterRound(st, a, b, c, d) {

    st[a] = (st[a] + st[b]) >>> 0;
    st[d] = (st[d] ^ st[a]) >>> 0;
    st[d] = ((st[d] << 16) | ((st[d]>>>16) & 0xFFFF)) >>> 0;

    st[c] = (st[c] + st[d]) >>> 0;
    st[b] = (st[b] ^ st[c]) >>> 0;
    st[b] = ((st[b] << 12) | ((st[b]>>>20) & 0xFFF)) >>> 0;

    st[a] = (st[a] + st[b]) >>> 0;
    st[d] = (st[d] ^ st[a]) >>> 0;
    st[d] = ((st[d] << 8) | ((st[d]>>>24) & 0xFF)) >>> 0;

    st[c] = (st[c] + st[d]) >>> 0;
    st[b] = (st[b] ^ st[c]) >>> 0;
    st[b] = ((st[b] << 7) | ((st[b]>>>25) & 0x7F)) >>> 0;
}

function doubleRound(st) {
    quarterRound(st, 0, 4, 8,12);
    quarterRound(st, 1, 5, 9,13);
    quarterRound(st, 2, 6,10,14);
    quarterRound(st, 3, 7,11,15);

    quarterRound(st, 0, 5,10,15);
    quarterRound(st, 1, 6,11,12);
    quarterRound(st, 2, 7, 8,13);
    quarterRound(st, 3, 4, 9,14);
}

class ChaCha {

    constructor(seed) {
        seed = seed || [0,0,0,0,0,0,0,0];
        this.state = [
            0x61707865,
            0x3320646E,
            0x79622D32,
            0x6B206574,
            seed[0],
            seed[1],
            seed[2],
            seed[3],
            seed[4],
            seed[5],
            seed[6],
            seed[7],
            0,
            0,
            0,
            0
        ];
        this.idx = 16;
        this.buff = new Array(16);
    }

    nextU32() {
        if (this.idx == 16) this.update();
        return this.buff[this.idx++];
    }

    nextU64() {
        return add(mul(this.nextU32(), 0x100000000), this.nextU32());
    }

    nextBool() {
        return (this.nextU32() & 1) == 1;
    }

    update() {
        // Copy the state
        for (let i=0; i<16; i++) this.buff[i] = this.state[i];

        // Apply the rounds
        for (let i=0; i<10; i++) doubleRound(this.buff);

        // Add to the initial
        for (let i=0; i<16; i++) this.buff[i] = (this.buff[i] + this.state[i]) >>> 0;

        this.idx = 0;

        this.state[12] = (this.state[12] + 1) >>> 0;
        if (this.state[12] != 0) return;
        this.state[13] = (this.state[13] + 1) >>> 0;
        if (this.state[13] != 0) return;
        this.state[14] = (this.state[14] + 1) >>> 0;
        if (this.state[14] != 0) return;
        this.state[15] = (this.state[15] + 1) >>> 0;
    }
}

function getRandomBytes(n) {
    let array = new Uint8Array(n);
    if (process.browser) { // Browser
        if (typeof globalThis.crypto !== "undefined") { // Supported
            globalThis.crypto.getRandomValues(array);
        } else { // fallback
            for (let i=0; i<n; i++) {
                array[i] = (Math.random()*4294967296)>>>0;
            }
        }
    }
    else { // NodeJS
        crypto__default["default"].randomFillSync(array);
    }
    return array;
}

function getRandomSeed() {
    const arr = getRandomBytes(32);
    const arrV = new Uint32Array(arr.buffer);
    const seed = [];
    for (let i=0; i<8; i++) {
        seed.push(arrV[i]);
    }
    return seed;
}

let threadRng = null;

function getThreadRng() {
    if (threadRng) return threadRng;
    threadRng = new ChaCha(getRandomSeed());
    return threadRng;
}

/*
    Copyright 2018 0kims association.

    This file is part of snarkjs.

    snarkjs is a free software: you can redistribute it and/or
    modify it under the terms of the GNU General Public License as published by the
    Free Software Foundation, either version 3 of the License, or (at your option)
    any later version.

    snarkjs is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY
    or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for
    more details.

    You should have received a copy of the GNU General Public License along with
    snarkjs. If not, see <https://www.gnu.org/licenses/>.
*/

/*
    This library does operations on polynomials with coefficients in a field F.

    A polynomial P(x) = p0 + p1 * x + p2 * x^2 + ... + pn * x^n  is represented
    by the array [ p0, p1, p2, ... , pn ].
 */

class FFT {
    constructor (G, F, opMulGF) {
        this.F = F;
        this.G = G;
        this.opMulGF = opMulGF;

        let rem = F.sqrt_t || F.t;
        let s = F.sqrt_s || F.s;

        let nqr = F.one;
        while (F.eq(F.pow(nqr, F.half), F.one)) nqr = F.add(nqr, F.one);

        this.w = new Array(s+1);
        this.wi = new Array(s+1);
        this.w[s] = this.F.pow(nqr, rem);
        this.wi[s] = this.F.inv(this.w[s]);

        let n=s-1;
        while (n>=0) {
            this.w[n] = this.F.square(this.w[n+1]);
            this.wi[n] = this.F.square(this.wi[n+1]);
            n--;
        }


        this.roots = [];
        /*
        for (let i=0; i<16; i++) {
            let r = this.F.one;
            n = 1 << i;
            const rootsi = new Array(n);
            for (let j=0; j<n; j++) {
                rootsi[j] = r;
                r = this.F.mul(r, this.w[i]);
            }

            this.roots.push(rootsi);
        }
        */
        this._setRoots(Math.min(s, 15));
    }

    _setRoots(n) {
        for (let i=n; (i>=0) && (!this.roots[i]); i--) {
            let r = this.F.one;
            const nroots = 1 << i;
            const rootsi = new Array(nroots);
            for (let j=0; j<nroots; j++) {
                rootsi[j] = r;
                r = this.F.mul(r, this.w[i]);
            }

            this.roots[i] = rootsi;
        }
    }

    fft(p) {
        if (p.length <= 1) return p;
        const bits = log2$1(p.length-1)+1;
        this._setRoots(bits);

        const m = 1 << bits;
        if (p.length != m) {
            throw new Error("Size must be multiple of 2");
        }
        const res = __fft(this, p, bits, 0, 1);
        return res;
    }

    ifft(p) {

        if (p.length <= 1) return p;
        const bits = log2$1(p.length-1)+1;
        this._setRoots(bits);
        const m = 1 << bits;
        if (p.length != m) {
            throw new Error("Size must be multiple of 2");
        }
        const res =  __fft(this, p, bits, 0, 1);
        const twoinvm = this.F.inv( this.F.mulScalar(this.F.one, m) );
        const resn = new Array(m);
        for (let i=0; i<m; i++) {
            resn[i] = this.opMulGF(res[(m-i)%m], twoinvm);
        }

        return resn;
    }


}

function log2$1( V )
{
    return( ( ( V & 0xFFFF0000 ) !== 0 ? ( V &= 0xFFFF0000, 16 ) : 0 ) | ( ( V & 0xFF00FF00 ) !== 0 ? ( V &= 0xFF00FF00, 8 ) : 0 ) | ( ( V & 0xF0F0F0F0 ) !== 0 ? ( V &= 0xF0F0F0F0, 4 ) : 0 ) | ( ( V & 0xCCCCCCCC ) !== 0 ? ( V &= 0xCCCCCCCC, 2 ) : 0 ) | ( ( V & 0xAAAAAAAA ) !== 0 ) );
}


function __fft(PF, pall, bits, offset, step) {

    const n = 1 << bits;
    if (n==1) {
        return [ pall[offset] ];
    } else if (n==2) {
        return [
            PF.G.add(pall[offset], pall[offset + step]),
            PF.G.sub(pall[offset], pall[offset + step])];
    }

    const ndiv2 = n >> 1;
    const p1 = __fft(PF, pall, bits-1, offset, step*2);
    const p2 = __fft(PF, pall, bits-1, offset+step, step*2);

    const out = new Array(n);

    for (let i=0; i<ndiv2; i++) {
        out[i] = PF.G.add(p1[i], PF.opMulGF(p2[i], PF.roots[bits][i]));
        out[i+ndiv2] = PF.G.sub(p1[i], PF.opMulGF(p2[i], PF.roots[bits][i]));
    }

    return out;
}

/* global BigInt */

class ZqField {
    constructor(p) {
        this.type="F1";
        this.one = BigInt(1);
        this.zero = BigInt(0);
        this.p = BigInt(p);
        this.m = 1;
        this.negone = this.p-this.one;
        this.two = BigInt(2);
        this.half = this.p >> this.one;
        this.bitLength = bitLength(this.p);
        this.mask = (this.one << BigInt(this.bitLength)) - this.one;

        this.n64 = Math.floor((this.bitLength - 1) / 64)+1;
        this.n32 = this.n64*2;
        this.n8 = this.n64*8;
        this.R = this.e(this.one << BigInt(this.n64*64));
        this.Ri = this.inv(this.R);

        const e = this.negone >> this.one;
        this.nqr = this.two;
        let r = this.pow(this.nqr, e);
        while (!this.eq(r, this.negone)) {
            this.nqr = this.nqr + this.one;
            r = this.pow(this.nqr, e);
        }


        this.s = 0;
        this.t = this.negone;

        while ((this.t & this.one) == this.zero) {
            this.s = this.s + 1;
            this.t = this.t >> this.one;
        }

        this.nqr_to_t = this.pow(this.nqr, this.t);

        buildSqrt(this);

        this.FFT = new FFT(this, this, this.mul.bind(this));

        this.fft = this.FFT.fft.bind(this.FFT);
        this.ifft = this.FFT.ifft.bind(this.FFT);
        this.w = this.FFT.w;
        this.wi = this.FFT.wi; 
    
        this.shift = this.square(this.nqr);
        this.k = this.exp(this.nqr, 2**this.s);
    }

    e(a,b) {
        let res;
        if (!b) {
            res = BigInt(a);
        } else if (b==16) {
            res = BigInt("0x"+a);
        }
        if (res < 0) {
            let nres = -res;
            if (nres >= this.p) nres = nres % this.p;
            return this.p - nres;
        } else {
            return (res>= this.p) ? res%this.p : res;
        }

    }

    add(a, b) {
        const res = a + b;
        return res >= this.p ? res-this.p : res;
    }

    sub(a, b) {
        return (a >= b) ? a-b : this.p-b+a;
    }

    neg(a) {
        return a ? this.p-a : a;
    }

    mul(a, b) {
        return (a*b)%this.p;
    }

    mulScalar(base, s) {
        return (base * this.e(s)) % this.p;
    }

    square(a) {
        return (a*a) % this.p;
    }

    eq(a, b) {
        return a==b;
    }

    neq(a, b) {
        return a!=b;
    }

    lt(a, b) {
        const aa = (a > this.half) ? a - this.p : a;
        const bb = (b > this.half) ? b - this.p : b;
        return aa < bb;
    }

    gt(a, b) {
        const aa = (a > this.half) ? a - this.p : a;
        const bb = (b > this.half) ? b - this.p : b;
        return aa > bb;
    }

    leq(a, b) {
        const aa = (a > this.half) ? a - this.p : a;
        const bb = (b > this.half) ? b - this.p : b;
        return aa <= bb;
    }

    geq(a, b) {
        const aa = (a > this.half) ? a - this.p : a;
        const bb = (b > this.half) ? b - this.p : b;
        return aa >= bb;
    }

    div(a, b) {
        return this.mul(a, this.inv(b));
    }

    idiv(a, b) {
        if (!b) throw new Error("Division by zero");
        return a / b;
    }

    inv(a) {
        if (!a) throw new Error("Division by zero");

        let t = this.zero;
        let r = this.p;
        let newt = this.one;
        let newr = a % this.p;
        while (newr) {
            let q = r/newr;
            [t, newt] = [newt, t-q*newt];
            [r, newr] = [newr, r-q*newr];
        }
        if (t<this.zero) t += this.p;
        return t;
    }

    mod(a, b) {
        return a % b;
    }

    pow(b, e) {
        return exp(this, b, e);
    }

    exp(b, e) {
        return exp(this, b, e);
    }

    band(a, b) {
        const res =  ((a & b) & this.mask);
        return res >= this.p ? res-this.p : res;
    }

    bor(a, b) {
        const res =  ((a | b) & this.mask);
        return res >= this.p ? res-this.p : res;
    }

    bxor(a, b) {
        const res =  ((a ^ b) & this.mask);
        return res >= this.p ? res-this.p : res;
    }

    bnot(a) {
        const res = a ^ this.mask;
        return res >= this.p ? res-this.p : res;
    }

    shl(a, b) {
        if (Number(b) < this.bitLength) {
            const res = (a << b) & this.mask;
            return res >= this.p ? res-this.p : res;
        } else {
            const nb = this.p - b;
            if (Number(nb) < this.bitLength) {
                return a >> nb;
            } else {
                return this.zero;
            }
        }
    }

    shr(a, b) {
        if (Number(b) < this.bitLength) {
            return a >> b;
        } else {
            const nb = this.p - b;
            if (Number(nb) < this.bitLength) {
                const res = (a << nb) & this.mask;
                return res >= this.p ? res-this.p : res;
            } else {
                return 0;
            }
        }
    }

    land(a, b) {
        return (a && b) ? this.one : this.zero;
    }

    lor(a, b) {
        return (a || b) ? this.one : this.zero;
    }

    lnot(a) {
        return (a) ? this.zero : this.one;
    }

    sqrt_old(n) {

        if (n == this.zero) return this.zero;

        // Test that have solution
        const res = this.pow(n, this.negone >> this.one);
        if ( res != this.one ) return null;

        let m = this.s;
        let c = this.nqr_to_t;
        let t = this.pow(n, this.t);
        let r = this.pow(n, this.add(this.t, this.one) >> this.one );

        while ( t != this.one ) {
            let sq = this.square(t);
            let i = 1;
            while (sq != this.one ) {
                i++;
                sq = this.square(sq);
            }

            // b = c ^ m-i-1
            let b = c;
            for (let j=0; j< m-i-1; j ++) b = this.square(b);

            m = i;
            c = this.square(b);
            t = this.mul(t, c);
            r = this.mul(r, b);
        }

        if (r > (this.p >> this.one)) {
            r = this.neg(r);
        }

        return r;
    }

    normalize(a, b) {
        a = BigInt(a,b);
        if (a < 0) {
            let na = -a;
            if (na >= this.p) na = na % this.p;
            return this.p - na;
        } else {
            return (a>= this.p) ? a%this.p : a;
        }
    }

    random() {
        const nBytes = (this.bitLength*2 / 8);
        let res =this.zero;
        for (let i=0; i<nBytes; i++) {
            res = (res << BigInt(8)) + BigInt(getRandomBytes(1)[0]);
        }
        return res % this.p;
    }

    toString(a, base) {
        base = base || 10;
        let vs;
        if ((a > this.half)&&(base == 10)) {
            const v = this.p-a;
            vs = "-"+v.toString(base);
        } else {
            vs = a.toString(base);
        }
        return vs;
    }

    isZero(a) {
        return a == this.zero;
    }

    fromRng(rng) {
        let v;
        do {
            v=this.zero;
            for (let i=0; i<this.n64; i++) {
                v += rng.nextU64() << BigInt(64 *i);
            }
            v &= this.mask;
        } while (v >= this.p);
        v = (v * this.Ri) % this.p;   // Convert from montgomery
        return v;
    }

    fft(a) {
        return this.FFT.fft(a);
    }

    ifft(a) {
        return this.FFT.ifft(a);
    }

    // Returns a buffer with Little Endian Representation
    toRprLE(buff, o, e) {
        toRprLE(buff, o, e, this.n64*8);
    }

    // Returns a buffer with Big Endian Representation
    toRprBE(buff, o, e) {
        toRprBE(buff, o, e, this.n64*8);
    }

    // Returns a buffer with Big Endian Montgomery Representation
    toRprBEM(buff, o, e) {
        return this.toRprBE(buff, o, this.mul(this.R, e));
    }

    toRprLEM(buff, o, e) {
        return this.toRprLE(buff, o, this.mul(this.R, e));
    }


    // Pases a buffer with Little Endian Representation
    fromRprLE(buff, o) {
        return fromRprLE(buff, o, this.n8);
    }

    // Pases a buffer with Big Endian Representation
    fromRprBE(buff, o) {
        return fromRprBE(buff, o, this.n8);
    }

    fromRprLEM(buff, o) {
        return this.mul(this.fromRprLE(buff, o), this.Ri);
    }

    fromRprBEM(buff, o) {
        return this.mul(this.fromRprBE(buff, o), this.Ri);
    }

    toObject(a) {
        return a;
    }
}

/*
    Copyright 2018 0kims association.

    This file is part of snarkjs.

    snarkjs is a free software: you can redistribute it and/or
    modify it under the terms of the GNU General Public License as published by the
    Free Software Foundation, either version 3 of the License, or (at your option)
    any later version.

    snarkjs is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY
    or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for
    more details.

    You should have received a copy of the GNU General Public License along with
    snarkjs. If not, see <https://www.gnu.org/licenses/>.
*/

class F2Field {
    constructor(F, nonResidue) {
        this.type="F2";
        this.F = F;
        this.zero = [this.F.zero, this.F.zero];
        this.one = [this.F.one, this.F.zero];
        this.negone = this.neg(this.one);
        this.nonResidue = nonResidue;
        this.m = F.m*2;
        this.p = F.p;
        this.n64 = F.n64*2;
        this.n32 = this.n64*2;
        this.n8 = this.n64*8;

        buildSqrt(this);
    }

    _mulByNonResidue(a) {
        return this.F.mul(this.nonResidue, a);
    }

    copy(a) {
        return [this.F.copy(a[0]), this.F.copy(a[1])];
    }

    add(a, b) {
        return [
            this.F.add(a[0], b[0]),
            this.F.add(a[1], b[1])
        ];
    }

    double(a) {
        return this.add(a,a);
    }

    sub(a, b) {
        return [
            this.F.sub(a[0], b[0]),
            this.F.sub(a[1], b[1])
        ];
    }

    neg(a) {
        return this.sub(this.zero, a);
    }

    conjugate(a) {
        return [
            a[0],
            this.F.neg(a[1])
        ];
    }

    mul(a, b) {
        const aA = this.F.mul(a[0] , b[0]);
        const bB = this.F.mul(a[1] , b[1]);

        return [
            this.F.add( aA , this._mulByNonResidue(bB)),
            this.F.sub(
                this.F.mul(
                    this.F.add(a[0], a[1]),
                    this.F.add(b[0], b[1])),
                this.F.add(aA, bB))];
    }

    inv(a) {
        const t0 = this.F.square(a[0]);
        const t1 = this.F.square(a[1]);
        const t2 = this.F.sub(t0, this._mulByNonResidue(t1));
        const t3 = this.F.inv(t2);
        return [
            this.F.mul(a[0], t3),
            this.F.neg(this.F.mul( a[1], t3)) ];
    }

    div(a, b) {
        return this.mul(a, this.inv(b));
    }

    square(a) {
        const ab = this.F.mul(a[0] , a[1]);

        /*
        [
            (a + b) * (a + non_residue * b) - ab - non_residue * ab,
            ab + ab
        ];
        */

        return [
            this.F.sub(
                this.F.mul(
                    this.F.add(a[0], a[1]) ,
                    this.F.add(
                        a[0] ,
                        this._mulByNonResidue(a[1]))),
                this.F.add(
                    ab,
                    this._mulByNonResidue(ab))),
            this.F.add(ab, ab)
        ];
    }

    isZero(a) {
        return this.F.isZero(a[0]) && this.F.isZero(a[1]);
    }

    eq(a, b) {
        return this.F.eq(a[0], b[0]) && this.F.eq(a[1], b[1]);
    }

    mulScalar(base, e) {
        return mulScalar(this, base, e);
    }

    pow(base, e) {
        return exp(this, base, e);
    }

    exp(base, e) {
        return exp(this, base, e);
    }

    toString(a) {
        return `[ ${this.F.toString(a[0])} , ${this.F.toString(a[1])} ]`;
    }

    fromRng(rng) {
        const c0 = this.F.fromRng(rng);
        const c1 = this.F.fromRng(rng);
        return [c0, c1];
    }

    gt(a, b) {
        if (this.F.gt(a[0], b[0])) return true;
        if (this.F.gt(b[0], a[0])) return false;
        if (this.F.gt(a[1], b[1])) return true;
        return false;
    }

    geq(a, b) {
        return this.gt(a, b) || this.eq(a, b);
    }

    lt(a, b) {
        return !this.geq(a,b);
    }

    leq(a, b) {
        return !this.gt(a,b);
    }

    neq(a, b) {
        return !this.eq(a,b);
    }

    random() {
        return [this.F.random(), this.F.random()];
    }


    toRprLE(buff, o, e) {
        this.F.toRprLE(buff, o, e[0]);
        this.F.toRprLE(buff, o+this.F.n8, e[1]);
    }

    toRprBE(buff, o, e) {
        this.F.toRprBE(buff, o, e[1]);
        this.F.toRprBE(buff, o+this.F.n8, e[0]);
    }

    toRprLEM(buff, o, e) {
        this.F.toRprLEM(buff, o, e[0]);
        this.F.toRprLEM(buff, o+this.F.n8, e[1]);
    }


    toRprBEM(buff, o, e) {
        this.F.toRprBEM(buff, o, e[1]);
        this.F.toRprBEM(buff, o+this.F.n8, e[0]);
    }

    fromRprLE(buff, o) {
        o = o || 0;
        const c0 = this.F.fromRprLE(buff, o);
        const c1 = this.F.fromRprLE(buff, o+this.F.n8);
        return [c0, c1];
    }

    fromRprBE(buff, o) {
        o = o || 0;
        const c1 = this.F.fromRprBE(buff, o);
        const c0 = this.F.fromRprBE(buff, o+this.F.n8);
        return [c0, c1];
    }

    fromRprLEM(buff, o) {
        o = o || 0;
        const c0 = this.F.fromRprLEM(buff, o);
        const c1 = this.F.fromRprLEM(buff, o+this.F.n8);
        return [c0, c1];
    }

    fromRprBEM(buff, o) {
        o = o || 0;
        const c1 = this.F.fromRprBEM(buff, o);
        const c0 = this.F.fromRprBEM(buff, o+this.F.n8);
        return [c0, c1];
    }

    toObject(a) {
        return a;
    }

}

/*
    Copyright 2018 0kims association.

    This file is part of snarkjs.

    snarkjs is a free software: you can redistribute it and/or
    modify it under the terms of the GNU General Public License as published by the
    Free Software Foundation, either version 3 of the License, or (at your option)
    any later version.

    snarkjs is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY
    or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for
    more details.

    You should have received a copy of the GNU General Public License along with
    snarkjs. If not, see <https://www.gnu.org/licenses/>.
*/

class F3Field {
    constructor(F, nonResidue) {
        this.type="F3";
        this.F = F;
        this.zero = [this.F.zero, this.F.zero, this.F.zero];
        this.one = [this.F.one, this.F.zero, this.F.zero];
        this.negone = this.neg(this.one);
        this.nonResidue = nonResidue;
        this.m = F.m*3;
        this.p = F.p;
        this.n64 = F.n64*3;
        this.n32 = this.n64*2;
        this.n8 = this.n64*8;
    }

    _mulByNonResidue(a) {
        return this.F.mul(this.nonResidue, a);
    }

    copy(a) {
        return [this.F.copy(a[0]), this.F.copy(a[1]), this.F.copy(a[2])];
    }

    add(a, b) {
        return [
            this.F.add(a[0], b[0]),
            this.F.add(a[1], b[1]),
            this.F.add(a[2], b[2])
        ];
    }

    double(a) {
        return this.add(a,a);
    }

    sub(a, b) {
        return [
            this.F.sub(a[0], b[0]),
            this.F.sub(a[1], b[1]),
            this.F.sub(a[2], b[2])
        ];
    }

    neg(a) {
        return this.sub(this.zero, a);
    }

    mul(a, b) {

        const aA = this.F.mul(a[0] , b[0]);
        const bB = this.F.mul(a[1] , b[1]);
        const cC = this.F.mul(a[2] , b[2]);

        return [
            this.F.add(
                aA,
                this._mulByNonResidue(
                    this.F.sub(
                        this.F.mul(
                            this.F.add(a[1], a[2]),
                            this.F.add(b[1], b[2])),
                        this.F.add(bB, cC)))),    // aA + non_residue*((b+c)*(B+C)-bB-cC),

            this.F.add(
                this.F.sub(
                    this.F.mul(
                        this.F.add(a[0], a[1]),
                        this.F.add(b[0], b[1])),
                    this.F.add(aA, bB)),
                this._mulByNonResidue( cC)),   // (a+b)*(A+B)-aA-bB+non_residue*cC

            this.F.add(
                this.F.sub(
                    this.F.mul(
                        this.F.add(a[0], a[2]),
                        this.F.add(b[0], b[2])),
                    this.F.add(aA, cC)),
                bB)];                           // (a+c)*(A+C)-aA+bB-cC)
    }

    inv(a) {
        const t0 = this.F.square(a[0]);             // t0 = a^2 ;
        const t1 = this.F.square(a[1]);             // t1 = b^2 ;
        const t2 = this.F.square(a[2]);             // t2 = c^2;
        const t3 = this.F.mul(a[0],a[1]);           // t3 = ab
        const t4 = this.F.mul(a[0],a[2]);           // t4 = ac
        const t5 = this.F.mul(a[1],a[2]);           // t5 = bc;
        // c0 = t0 - non_residue * t5;
        const c0 = this.F.sub(t0, this._mulByNonResidue(t5));
        // c1 = non_residue * t2 - t3;
        const c1 = this.F.sub(this._mulByNonResidue(t2), t3);
        const c2 = this.F.sub(t1, t4);              // c2 = t1-t4

        // t6 = (a * c0 + non_residue * (c * c1 + b * c2)).inv();
        const t6 =
            this.F.inv(
                this.F.add(
                    this.F.mul(a[0], c0),
                    this._mulByNonResidue(
                        this.F.add(
                            this.F.mul(a[2], c1),
                            this.F.mul(a[1], c2)))));

        return [
            this.F.mul(t6, c0),         // t6*c0
            this.F.mul(t6, c1),         // t6*c1
            this.F.mul(t6, c2)];        // t6*c2
    }

    div(a, b) {
        return this.mul(a, this.inv(b));
    }

    square(a) {
        const s0 = this.F.square(a[0]);                   // s0 = a^2
        const ab = this.F.mul(a[0], a[1]);                // ab = a*b
        const s1 = this.F.add(ab, ab);                    // s1 = 2ab;
        const s2 = this.F.square(
            this.F.add(this.F.sub(a[0],a[1]), a[2]));     // s2 = (a - b + c)^2;
        const bc = this.F.mul(a[1],a[2]);                 // bc = b*c
        const s3 = this.F.add(bc, bc);                    // s3 = 2*bc
        const s4 = this.F.square(a[2]);                   // s4 = c^2


        return [
            this.F.add(
                s0,
                this._mulByNonResidue(s3)),           // s0 + non_residue * s3,
            this.F.add(
                s1,
                this._mulByNonResidue(s4)),           // s1 + non_residue * s4,
            this.F.sub(
                this.F.add( this.F.add(s1, s2) , s3 ),
                this.F.add(s0, s4))];                      // s1 + s2 + s3 - s0 - s4
    }

    isZero(a) {
        return this.F.isZero(a[0]) && this.F.isZero(a[1]) && this.F.isZero(a[2]);
    }

    eq(a, b) {
        return this.F.eq(a[0], b[0]) && this.F.eq(a[1], b[1]) && this.F.eq(a[2], b[2]);
    }

    affine(a) {
        return [this.F.affine(a[0]), this.F.affine(a[1]), this.F.affine(a[2])];
    }

    mulScalar(base, e) {
        return mulScalar(this, base, e);
    }

    pow(base, e) {
        return exp(this, base, e);
    }

    exp(base, e) {
        return exp(this, base, e);
    }

    toString(a) {
        return `[ ${this.F.toString(a[0])} , ${this.F.toString(a[1])}, ${this.F.toString(a[2])} ]`;
    }

    fromRng(rng) {
        const c0 = this.F.fromRng(rng);
        const c1 = this.F.fromRng(rng);
        const c2 = this.F.fromRng(rng);
        return [c0, c1, c2];
    }

    gt(a, b) {
        if (this.F.gt(a[0], b[0])) return true;
        if (this.F.gt(b[0], a[0])) return false;
        if (this.F.gt(a[1], b[1])) return true;
        if (this.F.gt(b[1], a[1])) return false;
        if (this.F.gt(a[2], b[2])) return true;
        return false;
    }


    geq(a, b) {
        return this.gt(a, b) || this.eq(a, b);
    }

    lt(a, b) {
        return !this.geq(a,b);
    }

    leq(a, b) {
        return !this.gt(a,b);
    }

    neq(a, b) {
        return !this.eq(a,b);
    }

    random() {
        return [this.F.random(), this.F.random(), this.F.random()];
    }


    toRprLE(buff, o, e) {
        this.F.toRprLE(buff, o, e[0]);
        this.F.toRprLE(buff, o+this.F.n8, e[1]);
        this.F.toRprLE(buff, o+this.F.n8*2, e[2]);
    }

    toRprBE(buff, o, e) {
        this.F.toRprBE(buff, o, e[2]);
        this.F.toRprBE(buff, o+this.F.n8, e[1]);
        this.F.toRprBE(buff, o+this.F.n8*2, e[0]);
    }

    toRprLEM(buff, o, e) {
        this.F.toRprLEM(buff, o, e[0]);
        this.F.toRprLEM(buff, o+this.F.n8, e[1]);
        this.F.toRprLEM(buff, o+this.F.n8*2, e[2]);
    }


    toRprBEM(buff, o, e) {
        this.F.toRprBEM(buff, o, e[2]);
        this.F.toRprBEM(buff, o+this.F.n8, e[1]);
        this.F.toRprBEM(buff, o+this.F.n8*2, e[0]);
    }

    fromRprLE(buff, o) {
        o = o || 0;
        const c0 = this.F.fromRprLE(buff, o);
        const c1 = this.F.fromRprLE(buff, o+this.n8);
        const c2 = this.F.fromRprLE(buff, o+this.n8*2);
        return [c0, c1, c2];
    }

    fromRprBE(buff, o) {
        o = o || 0;
        const c2 = this.F.fromRprBE(buff, o);
        const c1 = this.F.fromRprBE(buff, o+this.n8);
        const c0 = this.F.fromRprBE(buff, o+this.n8*2);
        return [c0, c1, c2];
    }

    fromRprLEM(buff, o) {
        o = o || 0;
        const c0 = this.F.fromRprLEM(buff, o);
        const c1 = this.F.fromRprLEM(buff, o+this.n8);
        const c2 = this.F.fromRprLEM(buff, o+this.n8*2);
        return [c0, c1, c2];
    }

    fromRprBEM(buff, o) {
        o = o || 0;
        const c2 = this.F.fromRprBEM(buff, o);
        const c1 = this.F.fromRprBEM(buff, o+this.n8);
        const c0 = this.F.fromRprBEM(buff, o+this.n8*2);
        return [c0, c1, c2];
    }

    toObject(a) {
        return a;
    }
}

/*
    Copyright 2018 0kims association.

    This file is part of snarkjs.

    snarkjs is a free software: you can redistribute it and/or
    modify it under the terms of the GNU General Public License as published by the
    Free Software Foundation, either version 3 of the License, or (at your option)
    any later version.

    snarkjs is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY
    or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for
    more details.

    You should have received a copy of the GNU General Public License along with
    snarkjs. If not, see <https://www.gnu.org/licenses/>.
*/


function isGreatest(F, a) {
    if (Array.isArray(a)) {
        for (let i=a.length-1; i>=0; i--) {
            if (!F.F.isZero(a[i])) {
                return isGreatest(F.F, a[i]);
            }
        }
        return 0;
    } else {
        const na = F.neg(a);
        return gt(a, na);
    }
}


class EC {

    constructor(F, g) {
        this.F = F;
        this.g = g;
        if (this.g.length == 2) this.g[2] = this.F.one;
        this.zero = [this.F.zero, this.F.one, this.F.zero];
    }

    add(p1, p2) {

        const F = this.F;

        if (this.eq(p1, this.zero)) return p2;
        if (this.eq(p2, this.zero)) return p1;

        const res = new Array(3);

        const Z1Z1 = F.square( p1[2] );
        const Z2Z2 = F.square( p2[2] );

        const U1 = F.mul( p1[0] , Z2Z2 );     // U1 = X1  * Z2Z2
        const U2 = F.mul( p2[0] , Z1Z1 );     // U2 = X2  * Z1Z1

        const Z1_cubed = F.mul( p1[2] , Z1Z1);
        const Z2_cubed = F.mul( p2[2] , Z2Z2);

        const S1 = F.mul( p1[1] , Z2_cubed);  // S1 = Y1 * Z2 * Z2Z2
        const S2 = F.mul( p2[1] , Z1_cubed);  // S2 = Y2 * Z1 * Z1Z1

        if (F.eq(U1,U2) && F.eq(S1,S2)) {
            return this.double(p1);
        }

        const H = F.sub( U2 , U1 );                    // H = U2-U1

        const S2_minus_S1 = F.sub( S2 , S1 );

        const I = F.square( F.add(H,H) );         // I = (2 * H)^2
        const J = F.mul( H , I );                      // J = H * I

        const r = F.add( S2_minus_S1 , S2_minus_S1 );  // r = 2 * (S2-S1)
        const V = F.mul( U1 , I );                     // V = U1 * I

        res[0] =
            F.sub(
                F.sub( F.square(r) , J ),
                F.add( V , V ));                       // X3 = r^2 - J - 2 * V

        const S1_J = F.mul( S1 , J );

        res[1] =
            F.sub(
                F.mul( r , F.sub(V,res[0])),
                F.add( S1_J,S1_J ));                   // Y3 = r * (V-X3)-2 S1 J

        res[2] =
            F.mul(
                H,
                F.sub(
                    F.square( F.add(p1[2],p2[2]) ),
                    F.add( Z1Z1 , Z2Z2 )));            // Z3 = ((Z1+Z2)^2-Z1Z1-Z2Z2) * H

        return res;
    }

    neg(p) {
        return [p[0], this.F.neg(p[1]), p[2]];
    }

    sub(a, b) {
        return this.add(a, this.neg(b));
    }

    double(p) {
        const F = this.F;

        const res = new Array(3);

        if (this.eq(p, this.zero)) return p;

        const A = F.square( p[0] );                    // A = X1^2
        const B = F.square( p[1] );                    // B = Y1^2
        const C = F.square( B );                       // C = B^2

        let D =
            F.sub(
                F.square( F.add(p[0] , B )),
                F.add( A , C));
        D = F.add(D,D);                    // D = 2 * ((X1 + B)^2 - A - C)

        const E = F.add( F.add(A,A), A);          // E = 3 * A
        const FF =F.square( E );                       // F = E^2

        res[0] = F.sub( FF , F.add(D,D) );         // X3 = F - 2 D

        let eightC = F.add( C , C );
        eightC = F.add( eightC , eightC );
        eightC = F.add( eightC , eightC );

        res[1] =
            F.sub(
                F.mul(
                    E,
                    F.sub( D, res[0] )),
                eightC);                                    // Y3 = E * (D - X3) - 8 * C

        const Y1Z1 = F.mul( p[1] , p[2] );
        res[2] = F.add( Y1Z1 , Y1Z1 );                 // Z3 = 2 * Y1 * Z1

        return res;
    }

    timesScalar(base, e) {
        return mulScalar(this, base, e);
    }

    mulScalar(base, e) {
        return mulScalar(this, base, e);
    }

    affine(p) {
        const F = this.F;
        if (this.isZero(p)) {
            return this.zero;
        } else if (F.eq(p[2], F.one)) {
            return p;
        } else {
            const Z_inv = F.inv(p[2]);
            const Z2_inv = F.square(Z_inv);
            const Z3_inv = F.mul(Z2_inv, Z_inv);

            const res = new Array(3);
            res[0] = F.mul(p[0],Z2_inv);
            res[1] = F.mul(p[1],Z3_inv);
            res[2] = F.one;

            return res;
        }
    }

    multiAffine(arr) {
        const keys = Object.keys(arr);
        const F = this.F;
        const accMul = new Array(keys.length+1);
        accMul[0] = F.one;
        for (let i = 0; i< keys.length; i++) {
            if (F.eq(arr[keys[i]][2], F.zero)) {
                accMul[i+1] = accMul[i];
            } else {
                accMul[i+1] = F.mul(accMul[i], arr[keys[i]][2]);
            }
        }

        accMul[keys.length] = F.inv(accMul[keys.length]);

        for (let i = keys.length-1; i>=0; i--) {
            if (F.eq(arr[keys[i]][2], F.zero)) {
                accMul[i] = accMul[i+1];
                arr[keys[i]] = this.zero;
            } else {
                const Z_inv = F.mul(accMul[i], accMul[i+1]);
                accMul[i] = F.mul(arr[keys[i]][2], accMul[i+1]);

                const Z2_inv = F.square(Z_inv);
                const Z3_inv = F.mul(Z2_inv, Z_inv);

                arr[keys[i]][0] = F.mul(arr[keys[i]][0],Z2_inv);
                arr[keys[i]][1] = F.mul(arr[keys[i]][1],Z3_inv);
                arr[keys[i]][2] = F.one;
            }
        }

    }

    eq(p1, p2) {
        const F = this.F;

        if (this.F.eq(p1[2], this.F.zero)) return this.F.eq(p2[2], this.F.zero);
        if (this.F.eq(p2[2], this.F.zero)) return false;

        const Z1Z1 = F.square( p1[2] );
        const Z2Z2 = F.square( p2[2] );

        const U1 = F.mul( p1[0] , Z2Z2 );
        const U2 = F.mul( p2[0] , Z1Z1 );

        const Z1_cubed = F.mul( p1[2] , Z1Z1);
        const Z2_cubed = F.mul( p2[2] , Z2Z2);

        const S1 = F.mul( p1[1] , Z2_cubed);
        const S2 = F.mul( p2[1] , Z1_cubed);

        return (F.eq(U1,U2) && F.eq(S1,S2));
    }

    isZero(p) {
        return this.F.isZero(p[2]);
    }

    toString(p) {
        const cp = this.affine(p);
        return `[ ${this.F.toString(cp[0])} , ${this.F.toString(cp[1])} ]`;
    }

    fromRng(rng) {
        const F = this.F;
        let P = [];
        let greatest;
        do {
            P[0] = F.fromRng(rng);
            greatest = rng.nextBool();
            const x3b = F.add(F.mul(F.square(P[0]), P[0]), this.b);
            P[1] = F.sqrt(x3b);
        } while ((P[1] == null)||(F.isZero[P]));

        const s = isGreatest(F, P[1]);
        if (greatest ^ s) P[1] = F.neg(P[1]);
        P[2] = F.one;

        if (this.cofactor) {
            P = this.mulScalar(P, this.cofactor);
        }

        P = this.affine(P);

        return P;

    }

    toRprLE(buff, o, p) {
        p = this.affine(p);
        if (this.isZero(p)) {
            const BuffV = new Uint8Array(buff, o, this.F.n8*2);
            BuffV.fill(0);
            return;
        }
        this.F.toRprLE(buff, o, p[0]);
        this.F.toRprLE(buff, o+this.F.n8, p[1]);
    }

    toRprBE(buff, o, p) {
        p = this.affine(p);
        if (this.isZero(p)) {
            const BuffV = new Uint8Array(buff, o, this.F.n8*2);
            BuffV.fill(0);
            return;
        }
        this.F.toRprBE(buff, o, p[0]);
        this.F.toRprBE(buff, o+this.F.n8, p[1]);
    }

    toRprLEM(buff, o, p) {
        p = this.affine(p);
        if (this.isZero(p)) {
            const BuffV = new Uint8Array(buff, o, this.F.n8*2);
            BuffV.fill(0);
            return;
        }
        this.F.toRprLEM(buff, o, p[0]);
        this.F.toRprLEM(buff, o+this.F.n8, p[1]);
    }

    toRprLEJM(buff, o, p) {
        p = this.affine(p);
        if (this.isZero(p)) {
            const BuffV = new Uint8Array(buff, o, this.F.n8*2);
            BuffV.fill(0);
            return;
        }
        this.F.toRprLEM(buff, o, p[0]);
        this.F.toRprLEM(buff, o+this.F.n8, p[1]);
        this.F.toRprLEM(buff, o+2*this.F.n8, p[2]);
    }


    toRprBEM(buff, o, p) {
        p = this.affine(p);
        if (this.isZero(p)) {
            const BuffV = new Uint8Array(buff, o, this.F.n8*2);
            BuffV.fill(0);
            return;
        }
        this.F.toRprBEM(buff, o, p[0]);
        this.F.toRprBEM(buff, o+this.F.n8, p[1]);
    }

    fromRprLE(buff, o) {
        o = o || 0;
        const x = this.F.fromRprLE(buff, o);
        const y = this.F.fromRprLE(buff, o+this.F.n8);
        if (this.F.isZero(x) && this.F.isZero(y)) {
            return this.zero;
        }
        return [x, y, this.F.one];
    }

    fromRprBE(buff, o) {
        o = o || 0;
        const x = this.F.fromRprBE(buff, o);
        const y = this.F.fromRprBE(buff, o+this.F.n8);
        if (this.F.isZero(x) && this.F.isZero(y)) {
            return this.zero;
        }
        return [x, y, this.F.one];
    }

    fromRprLEM(buff, o) {
        o = o || 0;
        const x = this.F.fromRprLEM(buff, o);
        const y = this.F.fromRprLEM(buff, o+this.F.n8);
        if (this.F.isZero(x) && this.F.isZero(y)) {
            return this.zero;
        }
        return [x, y, this.F.one];
    }

    fromRprLEJM(buff, o) {
        o = o || 0;
        const x = this.F.fromRprLEM(buff, o);
        const y = this.F.fromRprLEM(buff, o+this.F.n8);
        const z = this.F.fromRprLEM(buff, o+this.F.n8*2);
        if (this.F.isZero(x) && this.F.isZero(y)) {
            return this.zero;
        }
        return [x, y, z];
    }

    fromRprBEM(buff, o) {
        o = o || 0;
        const x = this.F.fromRprBEM(buff, o);
        const y = this.F.fromRprBEM(buff, o+this.F.n8);
        if (this.F.isZero(x) && this.F.isZero(y)) {
            return this.zero;
        }
        return [x, y, this.F.one];
    }

    fromRprCompressed(buff, o) {
        const F = this.F;
        const v = new Uint8Array(buff.buffer, o, F.n8);
        if (v[0] & 0x40) return this.zero;
        const P = new Array(3);

        const greatest = ((v[0] & 0x80) != 0);
        v[0] = v[0] & 0x7F;
        P[0] = F.fromRprBE(buff, o);
        if (greatest) v[0] = v[0] | 0x80;  // set back again the old value

        const x3b = F.add(F.mul(F.square(P[0]), P[0]), this.b);
        P[1] = F.sqrt(x3b);

        if (P[1] === null) {
            throw new Error("Invalid Point!");
        }

        const s = isGreatest(F, P[1]);
        if (greatest ^ s) P[1] = F.neg(P[1]);
        P[2] = F.one;

        return P;
    }

    toRprCompressed(buff, o, p) {
        p = this.affine(p);
        const v = new Uint8Array(buff.buffer, o, this.F.n8);
        if (this.isZero(p)) {
            v.fill(0);
            v[0] = 0x40;
            return;
        }
        this.F.toRprBE(buff, o, p[0]);

        if (isGreatest(this.F, p[1])) {
            v[0] = v[0] | 0x80;
        }
    }


    fromRprUncompressed(buff, o) {
        if (buff[0] & 0x40) return this.zero;

        return this.fromRprBE(buff, o);
    }

    toRprUncompressed(buff, o, p) {
        this.toRprBE(buff, o, p);

        if (this.isZero(p)) {
            buff[o] = buff[o] | 0x40;
        }
    }


}

/* global BigInt */

function stringifyBigInts(o) {
    if (typeof o == "bigint" || o.eq !== undefined) {
        return o.toString(10);
    } else if (o instanceof Uint8Array) {
        return fromRprLE(o, 0);
    } else if (Array.isArray(o)) {
        return o.map(stringifyBigInts);
    } else if (typeof o == "object") {
        const res = {};
        const keys = Object.keys(o);
        keys.forEach((k) => {
            res[k] = stringifyBigInts(o[k]);
        });
        return res;
    } else {
        return o;
    }
}

function unstringifyBigInts(o) {
    if (typeof o == "string" && /^[0-9]+$/.test(o)) {
        return BigInt(o);
    } else if (typeof o == "string" && /^0x[0-9a-fA-F]+$/.test(o)) {
        return BigInt(o);
    } else if (Array.isArray(o)) {
        return o.map(unstringifyBigInts);
    } else if (typeof o == "object") {
        if (o === null) return null;
        const res = {};
        const keys = Object.keys(o);
        keys.forEach((k) => {
            res[k] = unstringifyBigInts(o[k]);
        });
        return res;
    } else {
        return o;
    }
}

function beBuff2int(buff) {
    let res = BigInt(0);
    let i = buff.length;
    let offset = 0;
    const buffV = new DataView(buff.buffer, buff.byteOffset, buff.byteLength);
    while (i > 0) {
        if (i >= 4) {
            i -= 4;
            res += BigInt(buffV.getUint32(i)) << BigInt(offset * 8);
            offset += 4;
        } else if (i >= 2) {
            i -= 2;
            res += BigInt(buffV.getUint16(i)) << BigInt(offset * 8);
            offset += 2;
        } else {
            i -= 1;
            res += BigInt(buffV.getUint8(i)) << BigInt(offset * 8);
            offset += 1;
        }
    }
    return res;
}

function beInt2Buff(n, len) {
    let r = n;
    const buff = new Uint8Array(len);
    const buffV = new DataView(buff.buffer);
    let o = len;
    while (o > 0) {
        if (o - 4 >= 0) {
            o -= 4;
            buffV.setUint32(o, Number(r & BigInt(0xffffffff)));
            r = r >> BigInt(32);
        } else if (o - 2 >= 0) {
            o -= 2;
            buffV.setUint16(o, Number(r & BigInt(0xffff)));
            r = r >> BigInt(16);
        } else {
            o -= 1;
            buffV.setUint8(o, Number(r & BigInt(0xff)));
            r = r >> BigInt(8);
        }
    }
    if (r) {
        throw new Error("Number does not fit in this length");
    }
    return buff;
}

function leBuff2int(buff) {
    let res = BigInt(0);
    let i = 0;
    const buffV = new DataView(buff.buffer, buff.byteOffset, buff.byteLength);
    while (i < buff.length) {
        if (i + 4 <= buff.length) {
            res += BigInt(buffV.getUint32(i, true)) << BigInt(i * 8);
            i += 4;
        } else if (i + 2 <= buff.length) {
            res += BigInt(buffV.getUint16(i, true)) << BigInt(i * 8);
            i += 2;
        } else {
            res += BigInt(buffV.getUint8(i, true)) << BigInt(i * 8);
            i += 1;
        }
    }
    return res;
}

function leInt2Buff(n, len) {
    let r = n;
    if (typeof len === "undefined") {
        len = Math.floor((bitLength(n) - 1) / 8) + 1;
        if (len == 0) len = 1;
    }
    const buff = new Uint8Array(len);
    const buffV = new DataView(buff.buffer);
    let o = 0;
    while (o < len) {
        if (o + 4 <= len) {
            buffV.setUint32(o, Number(r & BigInt(0xffffffff)), true);
            o += 4;
            r = r >> BigInt(32);
        } else if (o + 2 <= len) {
            buffV.setUint16(o, Number(r & BigInt(0xffff)), true);
            o += 2;
            r = r >> BigInt(16);
        } else {
            buffV.setUint8(o, Number(r & BigInt(0xff)), true);
            o += 1;
            r = r >> BigInt(8);
        }
    }
    if (r) {
        throw new Error("Number does not fit in this length");
    }
    return buff;
}

function stringifyFElements(F, o) {
    if (typeof o == "bigint" || o.eq !== undefined) {
        return o.toString(10);
    } else if (o instanceof Uint8Array) {
        return F.toString(F.e(o));
    } else if (Array.isArray(o)) {
        return o.map(stringifyFElements.bind(this, F));
    } else if (typeof o == "object") {
        const res = {};
        const keys = Object.keys(o);
        keys.forEach((k) => {
            res[k] = stringifyFElements(F, o[k]);
        });
        return res;
    } else {
        return o;
    }
}

function unstringifyFElements(F, o) {
    if (typeof o == "string" && /^[0-9]+$/.test(o)) {
        return F.e(o);
    } else if (typeof o == "string" && /^0x[0-9a-fA-F]+$/.test(o)) {
        return F.e(o);
    } else if (Array.isArray(o)) {
        return o.map(unstringifyFElements.bind(this, F));
    } else if (typeof o == "object") {
        if (o === null) return null;
        const res = {};
        const keys = Object.keys(o);
        keys.forEach((k) => {
            res[k] = unstringifyFElements(F, o[k]);
        });
        return res;
    } else {
        return o;
    }
}

const _revTable = [];
for (let i = 0; i < 256; i++) {
    _revTable[i] = _revSlow(i, 8);
}

function _revSlow(idx, bits) {
    let res = 0;
    let a = idx;
    for (let i = 0; i < bits; i++) {
        res <<= 1;
        res = res | (a & 1);
        a >>= 1;
    }
    return res;
}

function bitReverse(idx, bits) {
    return (
        (_revTable[idx >>> 24] |
        (_revTable[(idx >>> 16) & 0xff] << 8) |
        (_revTable[(idx >>> 8) & 0xff] << 16) |
        (_revTable[idx & 0xff] << 24)) >>>
        (32 - bits)
    );
}

function log2(V) {
    return (
        ((V & 0xffff0000) !== 0 ? ((V &= 0xffff0000), 16) : 0) |
        ((V & 0xff00ff00) !== 0 ? ((V &= 0xff00ff00), 8) : 0) |
        ((V & 0xf0f0f0f0) !== 0 ? ((V &= 0xf0f0f0f0), 4) : 0) |
        ((V & 0xcccccccc) !== 0 ? ((V &= 0xcccccccc), 2) : 0) |
        ((V & 0xaaaaaaaa) !== 0)
    );
}

function buffReverseBits(buff, eSize) {
    const n = buff.byteLength / eSize;
    const bits = log2(n);
    if (n != 1 << bits) {
        throw new Error("Invalid number of pointers");
    }
    for (let i = 0; i < n; i++) {
        const r = bitReverse(i, bits);
        if (i > r) {
            const tmp = buff.slice(i * eSize, (i + 1) * eSize);
            buff.set(buff.slice(r * eSize, (r + 1) * eSize), i * eSize);
            buff.set(tmp, r * eSize);
        }
    }
}

function array2buffer(arr, sG) {
    const buff = new Uint8Array(sG * arr.length);

    for (let i = 0; i < arr.length; i++) {
        buff.set(arr[i], i * sG);
    }

    return buff;
}

function buffer2array(buff, sG) {
    const n = buff.byteLength / sG;
    const arr = new Array(n);
    for (let i = 0; i < n; i++) {
        arr[i] = buff.slice(i * sG, i * sG + sG);
    }
    return arr;
}

var _utils = /*#__PURE__*/Object.freeze({
    __proto__: null,
    stringifyBigInts: stringifyBigInts,
    unstringifyBigInts: unstringifyBigInts,
    beBuff2int: beBuff2int,
    beInt2Buff: beInt2Buff,
    leBuff2int: leBuff2int,
    leInt2Buff: leInt2Buff,
    stringifyFElements: stringifyFElements,
    unstringifyFElements: unstringifyFElements,
    bitReverse: bitReverse,
    log2: log2,
    buffReverseBits: buffReverseBits,
    array2buffer: array2buffer,
    buffer2array: buffer2array
});

const PAGE_SIZE = 1<<30;

class BigBuffer {

    constructor(size) {
        this.buffers = [];
        this.byteLength = size;
        for (let i=0; i<size; i+= PAGE_SIZE) {
            const n = Math.min(size-i, PAGE_SIZE);
            this.buffers.push(new Uint8Array(n));
        }

    }

    slice(fr, to) {
        if ( to === undefined ) to = this.byteLength;
        if ( fr === undefined ) fr = 0;
        const len = to-fr;

        const firstPage = Math.floor(fr / PAGE_SIZE);
        const lastPage = Math.floor((fr+len-1) / PAGE_SIZE);

        if ((firstPage == lastPage)||(len==0))
            return this.buffers[firstPage].slice(fr%PAGE_SIZE, fr%PAGE_SIZE + len);

        let buff;

        let p = firstPage;
        let o = fr % PAGE_SIZE;
        // Remaining bytes to read
        let r = len;
        while (r>0) {
            // bytes to copy from this page
            const l = (o+r > PAGE_SIZE) ? (PAGE_SIZE -o) : r;
            const srcView = new Uint8Array(this.buffers[p].buffer, this.buffers[p].byteOffset+o, l);
            if (l == len) return srcView.slice();
            if (!buff) {
                if (len <= PAGE_SIZE) {
                    buff = new Uint8Array(len);
                } else {
                    buff = new BigBuffer(len);
                }
            }
            buff.set(srcView, len-r);
            r = r-l;
            p ++;
            o = 0;
        }

        return buff;
    }

    set(buff, offset) {
        if (offset === undefined) offset = 0;

        const len = buff.byteLength;

        if (len==0) return;

        const firstPage = Math.floor(offset / PAGE_SIZE);
        const lastPage = Math.floor((offset+len-1) / PAGE_SIZE);

        if (firstPage == lastPage) {
            if ((buff instanceof BigBuffer)&&(buff.buffers.length==1)) {
                return this.buffers[firstPage].set(buff.buffers[0], offset % PAGE_SIZE);
            } else {
                return this.buffers[firstPage].set(buff, offset % PAGE_SIZE);
            }

        }


        let p = firstPage;
        let o = offset % PAGE_SIZE;
        let r = len;
        while (r>0) {
            const l = (o+r > PAGE_SIZE) ? (PAGE_SIZE -o) : r;
            const srcView = buff.slice( len -r, len -r+l);
            const dstView = new Uint8Array(this.buffers[p].buffer, this.buffers[p].byteOffset + o, l);
            dstView.set(srcView);
            r = r-l;
            p ++;
            o = 0;
        }

    }
}

function buildBatchConvert(tm, fnName, sIn, sOut) {
    return async function batchConvert(buffIn) {
        const nPoints = Math.floor(buffIn.byteLength / sIn);
        if ( nPoints * sIn !== buffIn.byteLength) {
            throw new Error("Invalid buffer size");
        }
        const pointsPerChunk = Math.floor(nPoints/tm.concurrency);
        const opPromises = [];
        for (let i=0; i<tm.concurrency; i++) {
            let n;
            if (i< tm.concurrency-1) {
                n = pointsPerChunk;
            } else {
                n = nPoints - i*pointsPerChunk;
            }
            if (n==0) continue;

            const buffChunk = buffIn.slice(i*pointsPerChunk*sIn, i*pointsPerChunk*sIn + n*sIn);
            const task = [
                {cmd: "ALLOCSET", var: 0, buff:buffChunk},
                {cmd: "ALLOC", var: 1, len:sOut * n},
                {cmd: "CALL", fnName: fnName, params: [
                    {var: 0},
                    {val: n},
                    {var: 1}
                ]},
                {cmd: "GET", out: 0, var: 1, len:sOut * n},
            ];
            opPromises.push(
                tm.queueAction(task)
            );
        }

        const result = await Promise.all(opPromises);

        let fullBuffOut;
        if (buffIn instanceof BigBuffer) {
            fullBuffOut = new BigBuffer(nPoints*sOut);
        } else {
            fullBuffOut = new Uint8Array(nPoints*sOut);
        }

        let p =0;
        for (let i=0; i<result.length; i++) {
            fullBuffOut.set(result[i][0], p);
            p+=result[i][0].byteLength;
        }

        return fullBuffOut;
    };
}

class WasmField1 {

    constructor(tm, prefix, n8, p) {
        this.tm = tm;
        this.prefix = prefix;

        this.p = p;
        this.n8 = n8;
        this.type = "F1";
        this.m = 1;

        this.half = shiftRight(p, one);
        this.bitLength = bitLength(p);
        this.mask = sub(shiftLeft(one, this.bitLength), one);

        this.pOp1 = tm.alloc(n8);
        this.pOp2 = tm.alloc(n8);
        this.pOp3 = tm.alloc(n8);
        this.tm.instance.exports[prefix + "_zero"](this.pOp1);
        this.zero = this.tm.getBuff(this.pOp1, this.n8);
        this.tm.instance.exports[prefix + "_one"](this.pOp1);
        this.one = this.tm.getBuff(this.pOp1, this.n8);

        this.negone = this.neg(this.one);
        this.two = this.add(this.one, this.one);

        this.n64 = Math.floor(n8/8);
        this.n32 = Math.floor(n8/4);

        if(this.n64*8 != this.n8) {
            throw new Error("n8 must be a multiple of 8");
        }

        this.half = shiftRight(this.p, one);
        this.nqr = this.two;
        let r = this.exp(this.nqr, this.half);
        while (!this.eq(r, this.negone)) {
            this.nqr = this.add(this.nqr, this.one);
            r = this.exp(this.nqr, this.half);
        }

        this.shift = this.mul(this.nqr, this.nqr);
        this.shiftInv = this.inv(this.shift);

        this.s = 0;
        let t = sub(this.p, one);

        while ( !isOdd(t) ) {
            this.s = this.s + 1;
            t = shiftRight(t, one);
        }

        this.w = [];
        this.w[this.s] = this.exp(this.nqr, t);

        for (let i= this.s-1; i>=0; i--) {
            this.w[i] = this.square(this.w[i+1]);
        }

        if (!this.eq(this.w[0], this.one)) {
            throw new Error("Error calculating roots of unity");
        }

        this.batchToMontgomery = buildBatchConvert(tm, prefix + "_batchToMontgomery", this.n8, this.n8);
        this.batchFromMontgomery = buildBatchConvert(tm, prefix + "_batchFromMontgomery", this.n8, this.n8);
    }


    op2(opName, a, b) {
        this.tm.setBuff(this.pOp1, a);
        this.tm.setBuff(this.pOp2, b);
        this.tm.instance.exports[this.prefix + opName](this.pOp1, this.pOp2, this.pOp3);
        return this.tm.getBuff(this.pOp3, this.n8);
    }

    op2Bool(opName, a, b) {
        this.tm.setBuff(this.pOp1, a);
        this.tm.setBuff(this.pOp2, b);
        return !!this.tm.instance.exports[this.prefix + opName](this.pOp1, this.pOp2);
    }

    op1(opName, a) {
        this.tm.setBuff(this.pOp1, a);
        this.tm.instance.exports[this.prefix + opName](this.pOp1, this.pOp3);
        return this.tm.getBuff(this.pOp3, this.n8);
    }

    op1Bool(opName, a) {
        this.tm.setBuff(this.pOp1, a);
        return !!this.tm.instance.exports[this.prefix + opName](this.pOp1, this.pOp3);
    }

    add(a,b) {
        return this.op2("_add", a, b);
    }


    eq(a,b) {
        return this.op2Bool("_eq", a, b);
    }

    isZero(a) {
        return this.op1Bool("_isZero", a);
    }

    sub(a,b) {
        return this.op2("_sub", a, b);
    }

    neg(a) {
        return this.op1("_neg", a);
    }

    inv(a) {
        return this.op1("_inverse", a);
    }

    toMontgomery(a) {
        return this.op1("_toMontgomery", a);
    }

    fromMontgomery(a) {
        return this.op1("_fromMontgomery", a);
    }

    mul(a,b) {
        return this.op2("_mul", a, b);
    }

    div(a, b) {
        this.tm.setBuff(this.pOp1, a);
        this.tm.setBuff(this.pOp2, b);
        this.tm.instance.exports[this.prefix + "_inverse"](this.pOp2, this.pOp2);
        this.tm.instance.exports[this.prefix + "_mul"](this.pOp1, this.pOp2, this.pOp3);
        return this.tm.getBuff(this.pOp3, this.n8);
    }

    square(a) {
        return this.op1("_square", a);
    }

    isSquare(a) {
        return this.op1Bool("_isSquare", a);
    }

    sqrt(a) {
        return this.op1("_sqrt", a);
    }

    exp(a, b) {
        if (!(b instanceof Uint8Array)) {
            b = toLEBuff(e(b));
        }
        this.tm.setBuff(this.pOp1, a);
        this.tm.setBuff(this.pOp2, b);
        this.tm.instance.exports[this.prefix + "_exp"](this.pOp1, this.pOp2, b.byteLength, this.pOp3);
        return this.tm.getBuff(this.pOp3, this.n8);
    }

    isNegative(a) {
        return this.op1Bool("_isNegative", a);
    }

    e(a, b) {
        if (a instanceof Uint8Array) return a;
        let ra = e(a, b);
        if (isNegative(ra)) {
            ra = neg(ra);
            if (gt(ra, this.p)) {
                ra = mod(ra, this.p);
            }
            ra = sub(this.p, ra);
        } else {
            if (gt(ra, this.p)) {
                ra = mod(ra, this.p);
            }
        }
        const buff = leInt2Buff(ra, this.n8);
        return this.toMontgomery(buff);
    }

    toString(a, radix) {
        const an = this.fromMontgomery(a);
        const s = fromRprLE(an, 0);
        return toString(s, radix);
    }

    fromRng(rng) {
        let v;
        const buff = new Uint8Array(this.n8);
        do {
            v = zero;
            for (let i=0; i<this.n64; i++) {
                v = add(v,  shiftLeft(rng.nextU64(), 64*i));
            }
            v = band(v, this.mask);
        } while (geq(v, this.p));
        toRprLE(buff, 0, v, this.n8);
        return buff;
    }

    random() {
        return this.fromRng(getThreadRng());
    }

    toObject(a) {
        const an = this.fromMontgomery(a);
        return fromRprLE(an, 0);
    }

    fromObject(a) {
        const buff = new Uint8Array(this.n8);
        toRprLE(buff, 0, a, this.n8);
        return this.toMontgomery(buff);
    }

    toRprLE(buff, offset, a) {
        buff.set(this.fromMontgomery(a), offset);
    }

    toRprBE(buff, offset, a) {
        const buff2 = this.fromMontgomery(a);
        for (let i=0; i<this.n8/2; i++) {
            const aux = buff2[i];
            buff2[i] = buff2[this.n8-1-i];
            buff2[this.n8-1-i] = aux;
        }
        buff.set(buff2, offset);
    }

    fromRprLE(buff, offset) {
        offset = offset || 0;
        const res = buff.slice(offset, offset + this.n8);
        return this.toMontgomery(res);
    }

    async batchInverse(buffIn) {
        let returnArray = false;
        const sIn = this.n8;
        const sOut = this.n8;

        if (Array.isArray(buffIn)) {
            buffIn = array2buffer(buffIn, sIn );
            returnArray = true;
        } else {
            buffIn = buffIn.slice(0, buffIn.byteLength);
        }

        const nPoints = Math.floor(buffIn.byteLength / sIn);
        if ( nPoints * sIn !== buffIn.byteLength) {
            throw new Error("Invalid buffer size");
        }
        const pointsPerChunk = Math.floor(nPoints/this.tm.concurrency);
        const opPromises = [];
        for (let i=0; i<this.tm.concurrency; i++) {
            let n;
            if (i< this.tm.concurrency-1) {
                n = pointsPerChunk;
            } else {
                n = nPoints - i*pointsPerChunk;
            }
            if (n==0) continue;

            const buffChunk = buffIn.slice(i*pointsPerChunk*sIn, i*pointsPerChunk*sIn + n*sIn);
            const task = [
                {cmd: "ALLOCSET", var: 0, buff:buffChunk},
                {cmd: "ALLOC", var: 1, len:sOut * n},
                {cmd: "CALL", fnName: this.prefix + "_batchInverse", params: [
                    {var: 0},
                    {val: sIn},
                    {val: n},
                    {var: 1},
                    {val: sOut},
                ]},
                {cmd: "GET", out: 0, var: 1, len:sOut * n},
            ];
            opPromises.push(
                this.tm.queueAction(task)
            );
        }

        const result = await Promise.all(opPromises);

        let fullBuffOut;
        if (buffIn instanceof BigBuffer) {
            fullBuffOut = new BigBuffer(nPoints*sOut);
        } else {
            fullBuffOut = new Uint8Array(nPoints*sOut);
        }

        let p =0;
        for (let i=0; i<result.length; i++) {
            fullBuffOut.set(result[i][0], p);
            p+=result[i][0].byteLength;
        }

        if (returnArray) {
            return buffer2array(fullBuffOut, sOut);
        } else {
            return fullBuffOut;
        }

    }

}

class WasmField2 {

    constructor(tm, prefix, F) {
        this.tm = tm;
        this.prefix = prefix;

        this.F = F;
        this.type = "F2";
        this.m = F.m * 2;
        this.n8 = this.F.n8*2;
        this.n32 = this.F.n32*2;
        this.n64 = this.F.n64*2;

        this.pOp1 = tm.alloc(F.n8*2);
        this.pOp2 = tm.alloc(F.n8*2);
        this.pOp3 = tm.alloc(F.n8*2);
        this.tm.instance.exports[prefix + "_zero"](this.pOp1);
        this.zero = tm.getBuff(this.pOp1, this.n8);
        this.tm.instance.exports[prefix + "_one"](this.pOp1);
        this.one = tm.getBuff(this.pOp1, this.n8);

        this.negone = this.neg(this.one);
        this.two = this.add(this.one, this.one);

    }

    op2(opName, a, b) {
        this.tm.setBuff(this.pOp1, a);
        this.tm.setBuff(this.pOp2, b);
        this.tm.instance.exports[this.prefix + opName](this.pOp1, this.pOp2, this.pOp3);
        return this.tm.getBuff(this.pOp3, this.n8);
    }

    op2Bool(opName, a, b) {
        this.tm.setBuff(this.pOp1, a);
        this.tm.setBuff(this.pOp2, b);
        return !!this.tm.instance.exports[this.prefix + opName](this.pOp1, this.pOp2);
    }

    op1(opName, a) {
        this.tm.setBuff(this.pOp1, a);
        this.tm.instance.exports[this.prefix + opName](this.pOp1, this.pOp3);
        return this.tm.getBuff(this.pOp3, this.n8);
    }

    op1Bool(opName, a) {
        this.tm.setBuff(this.pOp1, a);
        return !!this.tm.instance.exports[this.prefix + opName](this.pOp1, this.pOp3);
    }

    add(a,b) {
        return this.op2("_add", a, b);
    }

    eq(a,b) {
        return this.op2Bool("_eq", a, b);
    }

    isZero(a) {
        return this.op1Bool("_isZero", a);
    }

    sub(a,b) {
        return this.op2("_sub", a, b);
    }

    neg(a) {
        return this.op1("_neg", a);
    }

    inv(a) {
        return this.op1("_inverse", a);
    }

    isNegative(a) {
        return this.op1Bool("_isNegative", a);
    }

    toMontgomery(a) {
        return this.op1("_toMontgomery", a);
    }

    fromMontgomery(a) {
        return this.op1("_fromMontgomery", a);
    }

    mul(a,b) {
        return this.op2("_mul", a, b);
    }

    mul1(a,b) {
        return this.op2("_mul1", a, b);
    }

    div(a, b) {
        this.tm.setBuff(this.pOp1, a);
        this.tm.setBuff(this.pOp2, b);
        this.tm.instance.exports[this.prefix + "_inverse"](this.pOp2, this.pOp2);
        this.tm.instance.exports[this.prefix + "_mul"](this.pOp1, this.pOp2, this.pOp3);
        return this.tm.getBuff(this.pOp3, this.n8);
    }

    square(a) {
        return this.op1("_square", a);
    }

    isSquare(a) {
        return this.op1Bool("_isSquare", a);
    }

    sqrt(a) {
        return this.op1("_sqrt", a);
    }

    exp(a, b) {
        if (!(b instanceof Uint8Array)) {
            b = toLEBuff(e(b));
        }
        this.tm.setBuff(this.pOp1, a);
        this.tm.setBuff(this.pOp2, b);
        this.tm.instance.exports[this.prefix + "_exp"](this.pOp1, this.pOp2, b.byteLength, this.pOp3);
        return this.tm.getBuff(this.pOp3, this.n8);
    }

    e(a, b) {
        if (a instanceof Uint8Array) return a;
        if ((Array.isArray(a)) && (a.length == 2)) {
            const c1 = this.F.e(a[0], b);
            const c2 = this.F.e(a[1], b);
            const res = new Uint8Array(this.F.n8*2);
            res.set(c1);
            res.set(c2, this.F.n8*2);
            return res;
        } else {
            throw new Error("invalid F2");
        }
    }

    toString(a, radix) {
        const s1 = this.F.toString(a.slice(0, this.F.n8), radix);
        const s2 = this.F.toString(a.slice(this.F.n8), radix);
        return `[${s1}, ${s2}]`;
    }

    fromRng(rng) {
        const c1 = this.F.fromRng(rng);
        const c2 = this.F.fromRng(rng);
        const res = new Uint8Array(this.F.n8*2);
        res.set(c1);
        res.set(c2, this.F.n8);
        return res;
    }

    random() {
        return this.fromRng(getThreadRng());
    }

    toObject(a) {
        const c1 = this.F.toObject(a.slice(0, this.F.n8));
        const c2 = this.F.toObject(a.slice(this.F.n8, this.F.n8*2));
        return [c1, c2];
    }

    fromObject(a) {
        const buff = new Uint8Array(this.F.n8*2);
        const b1 = this.F.fromObject(a[0]);
        const b2 = this.F.fromObject(a[1]);
        buff.set(b1);
        buff.set(b2, this.F.n8);
        return buff;
    }

    c1(a) {
        return a.slice(0, this.F.n8);
    }

    c2(a) {
        return a.slice(this.F.n8);
    }

}

class WasmField3 {

    constructor(tm, prefix, F) {
        this.tm = tm;
        this.prefix = prefix;

        this.F = F;
        this.type = "F3";
        this.m = F.m * 3;
        this.n8 = this.F.n8*3;
        this.n32 = this.F.n32*3;
        this.n64 = this.F.n64*3;

        this.pOp1 = tm.alloc(F.n8*3);
        this.pOp2 = tm.alloc(F.n8*3);
        this.pOp3 = tm.alloc(F.n8*3);
        this.tm.instance.exports[prefix + "_zero"](this.pOp1);
        this.zero = tm.getBuff(this.pOp1, this.n8);
        this.tm.instance.exports[prefix + "_one"](this.pOp1);
        this.one = tm.getBuff(this.pOp1, this.n8);

        this.negone = this.neg(this.one);
        this.two = this.add(this.one, this.one);

    }

    op2(opName, a, b) {
        this.tm.setBuff(this.pOp1, a);
        this.tm.setBuff(this.pOp2, b);
        this.tm.instance.exports[this.prefix + opName](this.pOp1, this.pOp2, this.pOp3);
        return this.tm.getBuff(this.pOp3, this.n8);
    }

    op2Bool(opName, a, b) {
        this.tm.setBuff(this.pOp1, a);
        this.tm.setBuff(this.pOp2, b);
        return !!this.tm.instance.exports[this.prefix + opName](this.pOp1, this.pOp2);
    }

    op1(opName, a) {
        this.tm.setBuff(this.pOp1, a);
        this.tm.instance.exports[this.prefix + opName](this.pOp1, this.pOp3);
        return this.tm.getBuff(this.pOp3, this.n8);
    }

    op1Bool(opName, a) {
        this.tm.setBuff(this.pOp1, a);
        return !!this.tm.instance.exports[this.prefix + opName](this.pOp1, this.pOp3);
    }


    eq(a,b) {
        return this.op2Bool("_eq", a, b);
    }

    isZero(a) {
        return this.op1Bool("_isZero", a);
    }

    add(a,b) {
        return this.op2("_add", a, b);
    }

    sub(a,b) {
        return this.op2("_sub", a, b);
    }

    neg(a) {
        return this.op1("_neg", a);
    }

    inv(a) {
        return this.op1("_inverse", a);
    }

    isNegative(a) {
        return this.op1Bool("_isNegative", a);
    }

    toMontgomery(a) {
        return this.op1("_toMontgomery", a);
    }

    fromMontgomery(a) {
        return this.op1("_fromMontgomery", a);
    }

    mul(a,b) {
        return this.op2("_mul", a, b);
    }

    div(a, b) {
        this.tm.setBuff(this.pOp1, a);
        this.tm.setBuff(this.pOp2, b);
        this.tm.instance.exports[this.prefix + "_inverse"](this.pOp2, this.pOp2);
        this.tm.instance.exports[this.prefix + "_mul"](this.pOp1, this.pOp2, this.pOp3);
        return this.tm.getBuff(this.pOp3, this.n8);
    }

    square(a) {
        return this.op1("_square", a);
    }

    isSquare(a) {
        return this.op1Bool("_isSquare", a);
    }

    sqrt(a) {
        return this.op1("_sqrt", a);
    }

    exp(a, b) {
        if (!(b instanceof Uint8Array)) {
            b = toLEBuff(e(b));
        }
        this.tm.setBuff(this.pOp1, a);
        this.tm.setBuff(this.pOp2, b);
        this.tm.instance.exports[this.prefix + "_exp"](this.pOp1, this.pOp2, b.byteLength, this.pOp3);
        return this.getBuff(this.pOp3, this.n8);
    }

    e(a, b) {
        if (a instanceof Uint8Array) return a;
        if ((Array.isArray(a)) && (a.length == 3)) {
            const c1 = this.F.e(a[0], b);
            const c2 = this.F.e(a[1], b);
            const c3 = this.F.e(a[2], b);
            const res = new Uint8Array(this.F.n8*3);
            res.set(c1);
            res.set(c2, this.F.n8);
            res.set(c3, this.F.n8*2);
            return res;
        } else {
            throw new Error("invalid F3");
        }
    }

    toString(a, radix) {
        const s1 = this.F.toString(a.slice(0, this.F.n8), radix);
        const s2 = this.F.toString(a.slice(this.F.n8, this.F.n8*2), radix);
        const s3 = this.F.toString(a.slice(this.F.n8*2), radix);
        return `[${s1}, ${s2}, ${s3}]`;
    }

    fromRng(rng) {
        const c1 = this.F.fromRng(rng);
        const c2 = this.F.fromRng(rng);
        const c3 = this.F.fromRng(rng);
        const res = new Uint8Array(this.F.n8*3);
        res.set(c1);
        res.set(c2, this.F.n8);
        res.set(c3, this.F.n8*2);
        return res;
    }

    random() {
        return this.fromRng(getThreadRng());
    }

    toObject(a) {
        const c1 = this.F.toObject(a.slice(0, this.F.n8));
        const c2 = this.F.toObject(a.slice(this.F.n8, this.F.n8*2));
        const c3 = this.F.toObject(a.slice(this.F.n8*2, this.F.n8*3));
        return [c1, c2, c3];
    }

    fromObject(a) {
        const buff = new Uint8Array(this.F.n8*3);
        const b1 = this.F.fromObject(a[0]);
        const b2 = this.F.fromObject(a[1]);
        const b3 = this.F.fromObject(a[2]);
        buff.set(b1);
        buff.set(b2, this.F.n8);
        buff.set(b3, this.F.n8*2);
        return buff;
    }

    c1(a) {
        return a.slice(0, this.F.n8);
    }

    c2(a) {
        return a.slice(this.F.n8, this.F.n8*2);
    }

    c3(a) {
        return a.slice(this.F.n8*2);
    }

}

class WasmCurve {

    constructor(tm, prefix, F, pGen, pGb, cofactor) {
        this.tm = tm;
        this.prefix = prefix;
        this.F = F;

        this.pOp1 = tm.alloc(F.n8*3);
        this.pOp2 = tm.alloc(F.n8*3);
        this.pOp3 = tm.alloc(F.n8*3);
        this.tm.instance.exports[prefix + "_zero"](this.pOp1);
        this.zero = this.tm.getBuff(this.pOp1, F.n8*3);
        this.tm.instance.exports[prefix + "_zeroAffine"](this.pOp1);
        this.zeroAffine = this.tm.getBuff(this.pOp1, F.n8*2);
        this.one = this.tm.getBuff(pGen, F.n8*3);
        this.g = this.one;
        this.oneAffine = this.tm.getBuff(pGen, F.n8*2);
        this.gAffine = this.oneAffine;
        this.b = this.tm.getBuff(pGb, F.n8);

        if (cofactor) {
            this.cofactor = toLEBuff(cofactor);
        }

        this.negone = this.neg(this.one);
        this.two = this.add(this.one, this.one);

        this.batchLEMtoC = buildBatchConvert(tm, prefix + "_batchLEMtoC", F.n8*2, F.n8);
        this.batchLEMtoU = buildBatchConvert(tm, prefix + "_batchLEMtoU", F.n8*2, F.n8*2);
        this.batchCtoLEM = buildBatchConvert(tm, prefix + "_batchCtoLEM", F.n8, F.n8*2);
        this.batchUtoLEM = buildBatchConvert(tm, prefix + "_batchUtoLEM", F.n8*2, F.n8*2);
        this.batchToJacobian = buildBatchConvert(tm, prefix + "_batchToJacobian", F.n8*2, F.n8*3);
        this.batchToAffine = buildBatchConvert(tm, prefix + "_batchToAffine", F.n8*3, F.n8*2);
    }

    op2(opName, a, b) {
        this.tm.setBuff(this.pOp1, a);
        this.tm.setBuff(this.pOp2, b);
        this.tm.instance.exports[this.prefix + opName](this.pOp1, this.pOp2, this.pOp3);
        return this.tm.getBuff(this.pOp3, this.F.n8*3);
    }

    op2bool(opName, a, b) {
        this.tm.setBuff(this.pOp1, a);
        this.tm.setBuff(this.pOp2, b);
        return !!this.tm.instance.exports[this.prefix + opName](this.pOp1, this.pOp2, this.pOp3);
    }

    op1(opName, a) {
        this.tm.setBuff(this.pOp1, a);
        this.tm.instance.exports[this.prefix + opName](this.pOp1, this.pOp3);
        return this.tm.getBuff(this.pOp3, this.F.n8*3);
    }

    op1Affine(opName, a) {
        this.tm.setBuff(this.pOp1, a);
        this.tm.instance.exports[this.prefix + opName](this.pOp1, this.pOp3);
        return this.tm.getBuff(this.pOp3, this.F.n8*2);
    }

    op1Bool(opName, a) {
        this.tm.setBuff(this.pOp1, a);
        return !!this.tm.instance.exports[this.prefix + opName](this.pOp1, this.pOp3);
    }

    add(a,b) {
        if (a.byteLength == this.F.n8*3) {
            if (b.byteLength == this.F.n8*3) {
                return this.op2("_add", a, b);
            } else if (b.byteLength == this.F.n8*2) {
                return this.op2("_addMixed", a, b);
            } else {
                throw new Error("invalid point size");
            }
        } else if (a.byteLength == this.F.n8*2) {
            if (b.byteLength == this.F.n8*3) {
                return this.op2("_addMixed", b, a);
            } else if (b.byteLength == this.F.n8*2) {
                return this.op2("_addAffine", a, b);
            } else {
                throw new Error("invalid point size");
            }
        } else {
            throw new Error("invalid point size");
        }
    }

    sub(a,b) {
        if (a.byteLength == this.F.n8*3) {
            if (b.byteLength == this.F.n8*3) {
                return this.op2("_sub", a, b);
            } else if (b.byteLength == this.F.n8*2) {
                return this.op2("_subMixed", a, b);
            } else {
                throw new Error("invalid point size");
            }
        } else if (a.byteLength == this.F.n8*2) {
            if (b.byteLength == this.F.n8*3) {
                return this.op2("_subMixed", b, a);
            } else if (b.byteLength == this.F.n8*2) {
                return this.op2("_subAffine", a, b);
            } else {
                throw new Error("invalid point size");
            }
        } else {
            throw new Error("invalid point size");
        }
    }

    neg(a) {
        if (a.byteLength == this.F.n8*3) {
            return this.op1("_neg", a);
        } else if (a.byteLength == this.F.n8*2) {
            return this.op1Affine("_negAffine", a);
        } else {
            throw new Error("invalid point size");
        }
    }

    double(a) {
        if (a.byteLength == this.F.n8*3) {
            return this.op1("_double", a);
        } else if (a.byteLength == this.F.n8*2) {
            return this.op1("_doubleAffine", a);
        } else {
            throw new Error("invalid point size");
        }
    }

    isZero(a) {
        if (a.byteLength == this.F.n8*3) {
            return this.op1Bool("_isZero", a);
        } else if (a.byteLength == this.F.n8*2) {
            return this.op1Bool("_isZeroAffine", a);
        } else {
            throw new Error("invalid point size");
        }
    }

    timesScalar(a, s) {
        if (!(s instanceof Uint8Array)) {
            s = toLEBuff(e(s));
        }
        let fnName;
        if (a.byteLength == this.F.n8*3) {
            fnName = this.prefix + "_timesScalar";
        } else if (a.byteLength == this.F.n8*2) {
            fnName = this.prefix + "_timesScalarAffine";
        } else {
            throw new Error("invalid point size");
        }
        this.tm.setBuff(this.pOp1, a);
        this.tm.setBuff(this.pOp2, s);
        this.tm.instance.exports[fnName](this.pOp1, this.pOp2, s.byteLength, this.pOp3);
        return this.tm.getBuff(this.pOp3, this.F.n8*3);
    }

    timesFr(a, s) {
        let fnName;
        if (a.byteLength == this.F.n8*3) {
            fnName = this.prefix + "_timesFr";
        } else if (a.byteLength == this.F.n8*2) {
            fnName = this.prefix + "_timesFrAffine";
        } else {
            throw new Error("invalid point size");
        }
        this.tm.setBuff(this.pOp1, a);
        this.tm.setBuff(this.pOp2, s);
        this.tm.instance.exports[fnName](this.pOp1, this.pOp2, this.pOp3);
        return this.tm.getBuff(this.pOp3, this.F.n8*3);
    }

    eq(a,b) {
        if (a.byteLength == this.F.n8*3) {
            if (b.byteLength == this.F.n8*3) {
                return this.op2bool("_eq", a, b);
            } else if (b.byteLength == this.F.n8*2) {
                return this.op2bool("_eqMixed", a, b);
            } else {
                throw new Error("invalid point size");
            }
        } else if (a.byteLength == this.F.n8*2) {
            if (b.byteLength == this.F.n8*3) {
                return this.op2bool("_eqMixed", b, a);
            } else if (b.byteLength == this.F.n8*2) {
                return this.op2bool("_eqAffine", a, b);
            } else {
                throw new Error("invalid point size");
            }
        } else {
            throw new Error("invalid point size");
        }
    }

    toAffine(a) {
        if (a.byteLength == this.F.n8*3) {
            return this.op1Affine("_toAffine", a);
        } else if (a.byteLength == this.F.n8*2) {
            return a;
        } else {
            throw new Error("invalid point size");
        }
    }

    toJacobian(a) {
        if (a.byteLength == this.F.n8*3) {
            return a;
        } else if (a.byteLength == this.F.n8*2) {
            return this.op1("_toJacobian", a);
        } else {
            throw new Error("invalid point size");
        }
    }

    toRprUncompressed(arr, offset, a) {
        this.tm.setBuff(this.pOp1, a);
        if (a.byteLength == this.F.n8*3) {
            this.tm.instance.exports[this.prefix + "_toAffine"](this.pOp1, this.pOp1);
        } else if (a.byteLength != this.F.n8*2) {
            throw new Error("invalid point size");
        }
        this.tm.instance.exports[this.prefix + "_LEMtoU"](this.pOp1, this.pOp1);
        const res = this.tm.getBuff(this.pOp1, this.F.n8*2);
        arr.set(res, offset);
    }

    fromRprUncompressed(arr, offset) {
        const buff = arr.slice(offset, offset + this.F.n8*2);
        this.tm.setBuff(this.pOp1, buff);
        this.tm.instance.exports[this.prefix + "_UtoLEM"](this.pOp1, this.pOp1);
        return this.tm.getBuff(this.pOp1, this.F.n8*2);
    }

    toRprCompressed(arr, offset, a) {
        this.tm.setBuff(this.pOp1, a);
        if (a.byteLength == this.F.n8*3) {
            this.tm.instance.exports[this.prefix + "_toAffine"](this.pOp1, this.pOp1);
        } else if (a.byteLength != this.F.n8*2) {
            throw new Error("invalid point size");
        }
        this.tm.instance.exports[this.prefix + "_LEMtoC"](this.pOp1, this.pOp1);
        const res = this.tm.getBuff(this.pOp1, this.F.n8);
        arr.set(res, offset);
    }

    fromRprCompressed(arr, offset) {
        const buff = arr.slice(offset, offset + this.F.n8);
        this.tm.setBuff(this.pOp1, buff);
        this.tm.instance.exports[this.prefix + "_CtoLEM"](this.pOp1, this.pOp2);
        return this.tm.getBuff(this.pOp2, this.F.n8*2);
    }

    toUncompressed(a) {
        const buff = new Uint8Array(this.F.n8*2);
        this.toRprUncompressed(buff, 0, a);
        return buff;
    }

    toRprLEM(arr, offset, a) {
        if (a.byteLength == this.F.n8*2) {
            arr.set(a, offset);
            return;
        } else if (a.byteLength == this.F.n8*3) {
            this.tm.setBuff(this.pOp1, a);
            this.tm.instance.exports[this.prefix + "_toAffine"](this.pOp1, this.pOp1);
            const res = this.tm.getBuff(this.pOp1, this.F.n8*2);
            arr.set(res, offset);
        } else {
            throw new Error("invalid point size");
        }
    }

    fromRprLEM(arr, offset) {
        offset = offset || 0;
        return arr.slice(offset, offset+this.F.n8*2);
    }

    toString(a, radix) {
        if (a.byteLength == this.F.n8*3) {
            const x = this.F.toString(a.slice(0, this.F.n8), radix);
            const y = this.F.toString(a.slice(this.F.n8, this.F.n8*2), radix);
            const z = this.F.toString(a.slice(this.F.n8*2), radix);
            return `[ ${x}, ${y}, ${z} ]`;
        } else if (a.byteLength == this.F.n8*2) {
            const x = this.F.toString(a.slice(0, this.F.n8), radix);
            const y = this.F.toString(a.slice(this.F.n8), radix);
            return `[ ${x}, ${y} ]`;
        } else {
            throw new Error("invalid point size");
        }
    }

    isValid(a) {
        if (this.isZero(a)) return true;
        const F = this.F;
        const aa = this.toAffine(a);
        const x = aa.slice(0, this.F.n8);
        const y = aa.slice(this.F.n8, this.F.n8*2);
        const x3b = F.add(F.mul(F.square(x),x), this.b);
        const y2 = F.square(y);
        return F.eq(x3b, y2);
    }

    fromRng(rng) {
        const F = this.F;
        let P = [];
        let greatest;
        let x3b;
        do {
            P[0] = F.fromRng(rng);
            greatest = rng.nextBool();
            x3b = F.add(F.mul(F.square(P[0]), P[0]), this.b);
        } while (!F.isSquare(x3b));

        P[1] = F.sqrt(x3b);

        const s = F.isNegative(P[1]);
        if (greatest ^ s) P[1] = F.neg(P[1]);

        let Pbuff = new Uint8Array(this.F.n8*2);
        Pbuff.set(P[0]);
        Pbuff.set(P[1], this.F.n8);

        if (this.cofactor) {
            Pbuff = this.timesScalar(Pbuff, this.cofactor);
        }

        return Pbuff;
    }



    toObject(a) {
        if (this.isZero(a)) {
            return [
                this.F.toObject(this.F.zero),
                this.F.toObject(this.F.one),
                this.F.toObject(this.F.zero),
            ];
        }
        const x = this.F.toObject(a.slice(0, this.F.n8));
        const y = this.F.toObject(a.slice(this.F.n8, this.F.n8*2));
        let z;
        if (a.byteLength == this.F.n8*3) {
            z = this.F.toObject(a.slice(this.F.n8*2, this.F.n8*3));
        } else {
            z = this.F.toObject(this.F.one);
        }
        return [x, y, z];
    }

    fromObject(a) {
        const x = this.F.fromObject(a[0]);
        const y = this.F.fromObject(a[1]);
        let z;
        if (a.length==3) {
            z = this.F.fromObject(a[2]);
        } else {
            z = this.F.one;
        }
        if (this.F.isZero(z, this.F.one)) {
            return this.zeroAffine;
        } else if (this.F.eq(z, this.F.one)) {
            const buff = new Uint8Array(this.F.n8*2);
            buff.set(x);
            buff.set(y, this.F.n8);
            return buff;
        } else {
            const buff = new Uint8Array(this.F.n8*3);
            buff.set(x);
            buff.set(y, this.F.n8);
            buff.set(z, this.F.n8*2);
            return buff;
        }
    }

    e(a) {
        if (a instanceof Uint8Array) return a;
        return this.fromObject(a);
    }

    x(a) {
        const tmp = this.toAffine(a);
        return tmp.slice(0, this.F.n8);
    }

    y(a) {
        const tmp = this.toAffine(a);
        return tmp.slice(this.F.n8);
    }

}

/* global WebAssembly */

function thread(self) {
    const MAXMEM = 32767;
    let instance;
    let memory;

    if (self) {
        self.onmessage = function(e) {
            let data;
            if (e.data) {
                data = e.data;
            } else {
                data = e;
            }

            if (data[0].cmd == "INIT") {
                init(data[0]).then(function() {
                    self.postMessage(data.result);
                });
            } else if (data[0].cmd == "TERMINATE") {
                self.close();
            } else {
                const res = runTask(data);
                self.postMessage(res);
            }
        };
    }

    async function init(data) {
        const code = new Uint8Array(data.code);
        const wasmModule = await WebAssembly.compile(code);
        memory = new WebAssembly.Memory({initial:data.init, maximum: MAXMEM});

        instance = await WebAssembly.instantiate(wasmModule, {
            env: {
                "memory": memory
            }
        });
    }



    function alloc(length) {
        const u32 = new Uint32Array(memory.buffer, 0, 1);
        while (u32[0] & 3) u32[0]++;  // Return always aligned pointers
        const res = u32[0];
        u32[0] += length;
        if (u32[0] + length > memory.buffer.byteLength) {
            const currentPages = memory.buffer.byteLength / 0x10000;
            let requiredPages = Math.floor((u32[0] + length) / 0x10000)+1;
            if (requiredPages>MAXMEM) requiredPages=MAXMEM;
            memory.grow(requiredPages-currentPages);
        }
        return res;
    }

    function allocBuffer(buffer) {
        const p = alloc(buffer.byteLength);
        setBuffer(p, buffer);
        return p;
    }

    function getBuffer(pointer, length) {
        const u8 = new Uint8Array(memory.buffer);
        return new Uint8Array(u8.buffer, u8.byteOffset + pointer, length);
    }

    function setBuffer(pointer, buffer) {
        const u8 = new Uint8Array(memory.buffer);
        u8.set(new Uint8Array(buffer), pointer);
    }

    function runTask(task) {
        if (task[0].cmd == "INIT") {
            return init(task[0]);
        }
        const ctx = {
            vars: [],
            out: []
        };
        const u32a = new Uint32Array(memory.buffer, 0, 1);
        const oldAlloc = u32a[0];
        for (let i=0; i<task.length; i++) {
            switch (task[i].cmd) {
            case "ALLOCSET":
                ctx.vars[task[i].var] = allocBuffer(task[i].buff);
                break;
            case "ALLOC":
                ctx.vars[task[i].var] = alloc(task[i].len);
                break;
            case "SET":
                setBuffer(ctx.vars[task[i].var], task[i].buff);
                break;
            case "CALL": {
                const params = [];
                for (let j=0; j<task[i].params.length; j++) {
                    const p = task[i].params[j];
                    if (typeof p.var !== "undefined") {
                        params.push(ctx.vars[p.var] + (p.offset || 0));
                    } else if (typeof p.val != "undefined") {
                        params.push(p.val);
                    }
                }
                instance.exports[task[i].fnName](...params);
                break;
            }
            case "GET":
                ctx.out[task[i].out] = getBuffer(ctx.vars[task[i].var], task[i].len).slice();
                break;
            default:
                throw new Error("Invalid cmd");
            }
        }
        const u32b = new Uint32Array(memory.buffer, 0, 1);
        u32b[0] = oldAlloc;
        return ctx.out;
    }


    return runTask;
}

/* global navigator, WebAssembly */
/*
    Copyright 2019 0KIMS association.

    This file is part of wasmsnark (Web Assembly zkSnark Prover).

    wasmsnark is a free software: you can redistribute it and/or modify it
    under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    wasmsnark is distributed in the hope that it will be useful, but WITHOUT
    ANY WARRANTY; without even the implied warranty of MERCHANTABILITY
    or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public
    License for more details.

    You should have received a copy of the GNU General Public License
    along with wasmsnark. If not, see <https://www.gnu.org/licenses/>.
*/

// const MEM_SIZE = 1000;  // Memory size in 64K Pakes (512Mb)
const MEM_SIZE = 25;  // Memory size in 64K Pakes (1600Kb)

class Deferred {
    constructor() {
        this.promise = new Promise((resolve, reject)=> {
            this.reject = reject;
            this.resolve = resolve;
        });
    }
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function stringToBase64(str) {
    if (process.browser) {
        return globalThis.btoa(str);
    } else {
        return Buffer.from(str).toString("base64");
    }
}

const threadSource = stringToBase64("(" + thread.toString() + ")(self)");
const workerSource = "data:application/javascript;base64," + threadSource;



async function buildThreadManager(wasm, singleThread) {
    const tm = new ThreadManager();

    tm.memory = new WebAssembly.Memory({initial:MEM_SIZE});
    tm.u8 = new Uint8Array(tm.memory.buffer);
    tm.u32 = new Uint32Array(tm.memory.buffer);

    const wasmModule = await WebAssembly.compile(wasm.code);

    tm.instance = await WebAssembly.instantiate(wasmModule, {
        env: {
            "memory": tm.memory
        }
    });

    tm.singleThread = singleThread;
    tm.initalPFree = tm.u32[0];   // Save the Pointer to free space.
    tm.pq = wasm.pq;
    tm.pr = wasm.pr;
    tm.pG1gen = wasm.pG1gen;
    tm.pG1zero = wasm.pG1zero;
    tm.pG2gen = wasm.pG2gen;
    tm.pG2zero = wasm.pG2zero;
    tm.pOneT = wasm.pOneT;

    //    tm.pTmp0 = tm.alloc(curve.G2.F.n8*3);
    //    tm.pTmp1 = tm.alloc(curve.G2.F.n8*3);


    if (singleThread) {
        tm.code = wasm.code;
        tm.taskManager = thread();
        await tm.taskManager([{
            cmd: "INIT",
            init: MEM_SIZE,
            code: tm.code.slice()
        }]);
        tm.concurrency  = 1;
    } else {
        tm.workers = [];
        tm.pendingDeferreds = [];
        tm.working = [];

        let concurrency;

        if ((typeof(navigator) === "object") && navigator.hardwareConcurrency) {
            concurrency = navigator.hardwareConcurrency;
        } else {
            concurrency = os__default["default"].cpus().length;
        }

        if(concurrency == 0){
            concurrency = 2;
        }

        // Limit to 64 threads for memory reasons.
        if (concurrency>64) concurrency=64;
        tm.concurrency = concurrency;

        for (let i = 0; i<concurrency; i++) {

            tm.workers[i] = new Worker__default["default"](workerSource);

            tm.workers[i].addEventListener("message", getOnMsg(i));

            tm.working[i]=false;
        }

        const initPromises = [];
        for (let i=0; i<tm.workers.length;i++) {
            const copyCode = wasm.code.slice();
            initPromises.push(tm.postAction(i, [{
                cmd: "INIT",
                init: MEM_SIZE,
                code: copyCode
            }], [copyCode.buffer]));
        }

        await Promise.all(initPromises);

    }
    return tm;

    function getOnMsg(i) {
        return function(e) {
            let data;
            if ((e)&&(e.data)) {
                data = e.data;
            } else {
                data = e;
            }

            tm.working[i]=false;
            tm.pendingDeferreds[i].resolve(data);
            tm.processWorks();
        };
    }

}

class ThreadManager {
    constructor() {
        this.actionQueue = [];
        this.oldPFree = 0;
    }

    startSyncOp() {
        if (this.oldPFree != 0) throw new Error("Sync operation in progress");
        this.oldPFree = this.u32[0];
    }

    endSyncOp() {
        if (this.oldPFree == 0) throw new Error("No sync operation in progress");
        this.u32[0] = this.oldPFree;
        this.oldPFree = 0;
    }

    postAction(workerId, e, transfers, _deferred) {
        if (this.working[workerId]) {
            throw new Error("Posting a job t a working worker");
        }
        this.working[workerId] = true;

        this.pendingDeferreds[workerId] = _deferred ? _deferred : new Deferred();
        this.workers[workerId].postMessage(e, transfers);

        return this.pendingDeferreds[workerId].promise;
    }

    processWorks() {
        for (let i=0; (i<this.workers.length)&&(this.actionQueue.length > 0); i++) {
            if (this.working[i] == false) {
                const work = this.actionQueue.shift();
                this.postAction(i, work.data, work.transfers, work.deferred);
            }
        }
    }

    queueAction(actionData, transfers) {
        const d = new Deferred();

        if (this.singleThread) {
            const res = this.taskManager(actionData);
            d.resolve(res);
        } else {
            this.actionQueue.push({
                data: actionData,
                transfers: transfers,
                deferred: d
            });
            this.processWorks();
        }
        return d.promise;
    }

    resetMemory() {
        this.u32[0] = this.initalPFree;
    }

    allocBuff(buff) {
        const pointer = this.alloc(buff.byteLength);
        this.setBuff(pointer, buff);
        return pointer;
    }

    getBuff(pointer, length) {
        return this.u8.slice(pointer, pointer+ length);
    }

    setBuff(pointer, buffer) {
        this.u8.set(new Uint8Array(buffer), pointer);
    }

    alloc(length) {
        while (this.u32[0] & 3) this.u32[0]++;  // Return always aligned pointers
        const res = this.u32[0];
        this.u32[0] += length;
        return res;
    }

    async terminate() {
        for (let i=0; i<this.workers.length; i++) {
            this.workers[i].postMessage([{cmd: "TERMINATE"}]);
        }
        await sleep(200);
    }

}

function buildBatchApplyKey(curve, groupName) {
    const G = curve[groupName];
    const Fr = curve.Fr;
    const tm = curve.tm;

    curve[groupName].batchApplyKey = async function(buff, first, inc, inType, outType) {
        inType = inType || "affine";
        outType = outType || "affine";
        let fnName, fnAffine;
        let sGin, sGmid, sGout;
        if (groupName == "G1") {
            if (inType == "jacobian") {
                sGin = G.F.n8*3;
                fnName = "g1m_batchApplyKey";
            } else {
                sGin = G.F.n8*2;
                fnName = "g1m_batchApplyKeyMixed";
            }
            sGmid = G.F.n8*3;
            if (outType == "jacobian") {
                sGout = G.F.n8*3;
            } else {
                fnAffine = "g1m_batchToAffine";
                sGout = G.F.n8*2;
            }
        } else if (groupName == "G2") {
            if (inType == "jacobian") {
                sGin = G.F.n8*3;
                fnName = "g2m_batchApplyKey";
            } else {
                sGin = G.F.n8*2;
                fnName = "g2m_batchApplyKeyMixed";
            }
            sGmid = G.F.n8*3;
            if (outType == "jacobian") {
                sGout = G.F.n8*3;
            } else {
                fnAffine = "g2m_batchToAffine";
                sGout = G.F.n8*2;
            }
        } else if (groupName == "Fr") {
            fnName = "frm_batchApplyKey";
            sGin = G.n8;
            sGmid = G.n8;
            sGout = G.n8;
        } else {
            throw new Error("Invalid group: " + groupName);
        }
        const nPoints = Math.floor(buff.byteLength / sGin);
        const pointsPerChunk = Math.floor(nPoints/tm.concurrency);
        const opPromises = [];
        inc = Fr.e(inc);
        let t = Fr.e(first);
        for (let i=0; i<tm.concurrency; i++) {
            let n;
            if (i< tm.concurrency-1) {
                n = pointsPerChunk;
            } else {
                n = nPoints - i*pointsPerChunk;
            }
            if (n==0) continue;

            const task = [];

            task.push({
                cmd: "ALLOCSET",
                var: 0,
                buff: buff.slice(i*pointsPerChunk*sGin, i*pointsPerChunk*sGin + n*sGin)
            });
            task.push({cmd: "ALLOCSET", var: 1, buff: t});
            task.push({cmd: "ALLOCSET", var: 2, buff: inc});
            task.push({cmd: "ALLOC", var: 3, len: n*Math.max(sGmid, sGout)});
            task.push({
                cmd: "CALL",
                fnName: fnName,
                params: [
                    {var: 0},
                    {val: n},
                    {var: 1},
                    {var: 2},
                    {var:3}
                ]
            });
            if (fnAffine) {
                task.push({
                    cmd: "CALL",
                    fnName: fnAffine,
                    params: [
                        {var: 3},
                        {val: n},
                        {var: 3},
                    ]
                });
            }
            task.push({cmd: "GET", out: 0, var: 3, len: n*sGout});

            opPromises.push(tm.queueAction(task));
            t = Fr.mul(t, Fr.exp(inc, n));
        }

        const result = await Promise.all(opPromises);

        let outBuff;
        if (buff instanceof BigBuffer) {
            outBuff = new BigBuffer(nPoints*sGout);
        } else {
            outBuff = new Uint8Array(nPoints*sGout);
        }

        let p=0;
        for (let i=0; i<result.length; i++) {
            outBuff.set(result[i][0], p);
            p += result[i][0].byteLength;
        }

        return outBuff;
    };
}

function buildPairing(curve) {
    const tm = curve.tm;
    curve.pairing = function pairing(a, b) {

        tm.startSyncOp();
        const pA = tm.allocBuff(curve.G1.toJacobian(a));
        const pB = tm.allocBuff(curve.G2.toJacobian(b));
        const pRes = tm.alloc(curve.Gt.n8);
        tm.instance.exports[curve.name + "_pairing"](pA, pB, pRes);

        const res = tm.getBuff(pRes, curve.Gt.n8);

        tm.endSyncOp();
        return res;
    };

    curve.pairingEq = async function pairingEq() {
        let  buffCt;
        let nEqs;
        if ((arguments.length % 2) == 1) {
            buffCt = arguments[arguments.length-1];
            nEqs = (arguments.length -1) /2;
        } else {
            buffCt = curve.Gt.one;
            nEqs = arguments.length /2;
        }

        const opPromises = [];
        for (let i=0; i<nEqs; i++) {

            const task = [];

            const g1Buff = curve.G1.toJacobian(arguments[i*2]);
            task.push({cmd: "ALLOCSET", var: 0, buff: g1Buff});
            task.push({cmd: "ALLOC", var: 1, len: curve.prePSize});

            const g2Buff = curve.G2.toJacobian(arguments[i*2 +1]);
            task.push({cmd: "ALLOCSET", var: 2, buff: g2Buff});
            task.push({cmd: "ALLOC", var: 3, len: curve.preQSize});

            task.push({cmd: "ALLOC", var: 4, len: curve.Gt.n8});

            task.push({cmd: "CALL", fnName: curve.name + "_prepareG1", params: [
                {var: 0},
                {var: 1}
            ]});

            task.push({cmd: "CALL", fnName: curve.name + "_prepareG2", params: [
                {var: 2},
                {var: 3}
            ]});

            task.push({cmd: "CALL", fnName: curve.name + "_millerLoop", params: [
                {var: 1},
                {var: 3},
                {var: 4}
            ]});

            task.push({cmd: "GET", out: 0, var: 4, len: curve.Gt.n8});

            opPromises.push(
                tm.queueAction(task)
            );
        }


        const result = await Promise.all(opPromises);

        tm.startSyncOp();
        const pRes = tm.alloc(curve.Gt.n8);
        tm.instance.exports.ftm_one(pRes);

        for (let i=0; i<result.length; i++) {
            const pMR = tm.allocBuff(result[i][0]);
            tm.instance.exports.ftm_mul(pRes, pMR, pRes);
        }
        tm.instance.exports[curve.name + "_finalExponentiation"](pRes, pRes);

        const pCt = tm.allocBuff(buffCt);

        const r = !!tm.instance.exports.ftm_eq(pRes, pCt);

        tm.endSyncOp();

        return r;
    };

    curve.prepareG1 = function(p) {
        this.tm.startSyncOp();
        const pP = this.tm.allocBuff(p);
        const pPrepP = this.tm.alloc(this.prePSize);
        this.tm.instance.exports[this.name + "_prepareG1"](pP, pPrepP);
        const res = this.tm.getBuff(pPrepP, this.prePSize);
        this.tm.endSyncOp();
        return res;
    };

    curve.prepareG2 = function(q) {
        this.tm.startSyncOp();
        const pQ = this.tm.allocBuff(q);
        const pPrepQ = this.tm.alloc(this.preQSize);
        this.tm.instance.exports[this.name + "_prepareG2"](pQ, pPrepQ);
        const res = this.tm.getBuff(pPrepQ, this.preQSize);
        this.tm.endSyncOp();
        return res;
    };

    curve.millerLoop = function(preP, preQ) {
        this.tm.startSyncOp();
        const pPreP = this.tm.allocBuff(preP);
        const pPreQ = this.tm.allocBuff(preQ);
        const pRes = this.tm.alloc(this.Gt.n8);
        this.tm.instance.exports[this.name + "_millerLoop"](pPreP, pPreQ, pRes);
        const res = this.tm.getBuff(pRes, this.Gt.n8);
        this.tm.endSyncOp();
        return res;
    };

    curve.finalExponentiation = function(a) {
        this.tm.startSyncOp();
        const pA = this.tm.allocBuff(a);
        const pRes = this.tm.alloc(this.Gt.n8);
        this.tm.instance.exports[this.name + "_finalExponentiation"](pA, pRes);
        const res = this.tm.getBuff(pRes, this.Gt.n8);
        this.tm.endSyncOp();
        return res;
    };

}

const pTSizes = [
    1 ,  1,  1,  1,    2,  3,  4,  5,
    6 ,  7,  7,  8,    9, 10, 11, 12,
    13, 13, 14, 15,   16, 16, 17, 17,
    17, 17, 17, 17,   17, 17, 17, 17
];

function buildMultiexp(curve, groupName) {
    const G = curve[groupName];
    const tm = G.tm;
    async function _multiExpChunk(buffBases, buffScalars, inType, logger, logText) {
        if ( ! (buffBases instanceof Uint8Array) ) {
            if (logger) logger.error(`${logText} _multiExpChunk buffBases is not Uint8Array`);
            throw new Error(`${logText} _multiExpChunk buffBases is not Uint8Array`);
        }
        if ( ! (buffScalars instanceof Uint8Array) ) {
            if (logger) logger.error(`${logText} _multiExpChunk buffScalars is not Uint8Array`);
            throw new Error(`${logText} _multiExpChunk buffScalars is not Uint8Array`);
        }
        inType = inType || "affine";

        let sGIn;
        let fnName;
        if (groupName == "G1") {
            if (inType == "affine") {
                fnName = "g1m_multiexpAffine_chunk";
                sGIn = G.F.n8*2;
            } else {
                fnName = "g1m_multiexp_chunk";
                sGIn = G.F.n8*3;
            }
        } else if (groupName == "G2") {
            if (inType == "affine") {
                fnName = "g2m_multiexpAffine_chunk";
                sGIn = G.F.n8*2;
            } else {
                fnName = "g2m_multiexp_chunk";
                sGIn = G.F.n8*3;
            }
        } else {
            throw new Error("Invalid group");
        }
        const nPoints = Math.floor(buffBases.byteLength / sGIn);

        if (nPoints == 0) return G.zero;
        const sScalar = Math.floor(buffScalars.byteLength / nPoints);
        if( sScalar * nPoints != buffScalars.byteLength) {
            throw new Error("Scalar size does not match");
        }

        const bitChunkSize = pTSizes[log2(nPoints)];
        const nChunks = Math.floor((sScalar*8 - 1) / bitChunkSize) +1;

        const opPromises = [];
        for (let i=0; i<nChunks; i++) {
            const task = [
                {cmd: "ALLOCSET", var: 0, buff: buffBases},
                {cmd: "ALLOCSET", var: 1, buff: buffScalars},
                {cmd: "ALLOC", var: 2, len: G.F.n8*3},
                {cmd: "CALL", fnName: fnName, params: [
                    {var: 0},
                    {var: 1},
                    {val: sScalar},
                    {val: nPoints},
                    {val: i*bitChunkSize},
                    {val: Math.min(sScalar*8 - i*bitChunkSize, bitChunkSize)},
                    {var: 2}
                ]},
                {cmd: "GET", out: 0, var: 2, len: G.F.n8*3}
            ];
            opPromises.push(
                G.tm.queueAction(task)
            );
        }

        const result = await Promise.all(opPromises);

        let res = G.zero;
        for (let i=result.length-1; i>=0; i--) {
            if (!G.isZero(res)) {
                for (let j=0; j<bitChunkSize; j++) res = G.double(res);
            }
            res = G.add(res, result[i][0]);
        }

        return res;
    }

    async function _multiExp(buffBases, buffScalars, inType, logger, logText) {
        const MAX_CHUNK_SIZE = 1 << 22;
        const MIN_CHUNK_SIZE = 1 << 10;
        let sGIn;

        if (groupName == "G1") {
            if (inType == "affine") {
                sGIn = G.F.n8*2;
            } else {
                sGIn = G.F.n8*3;
            }
        } else if (groupName == "G2") {
            if (inType == "affine") {
                sGIn = G.F.n8*2;
            } else {
                sGIn = G.F.n8*3;
            }
        } else {
            throw new Error("Invalid group");
        }

        const nPoints = Math.floor(buffBases.byteLength / sGIn);
        const sScalar = Math.floor(buffScalars.byteLength / nPoints);
        if( sScalar * nPoints != buffScalars.byteLength) {
            throw new Error("Scalar size does not match");
        }

        const bitChunkSize = pTSizes[log2(nPoints)];
        const nChunks = Math.floor((sScalar*8 - 1) / bitChunkSize) +1;

        let chunkSize;
        chunkSize = Math.floor(nPoints / (tm.concurrency /nChunks));
        if (chunkSize>MAX_CHUNK_SIZE) chunkSize = MAX_CHUNK_SIZE;
        if (chunkSize<MIN_CHUNK_SIZE) chunkSize = MIN_CHUNK_SIZE;

        const opPromises = [];
        for (let i=0; i<nPoints; i += chunkSize) {
            if (logger) logger.debug(`Multiexp start: ${logText}: ${i}/${nPoints}`);
            const n= Math.min(nPoints - i, chunkSize);
            const buffBasesChunk = buffBases.slice(i*sGIn, (i+n)*sGIn);
            const buffScalarsChunk = buffScalars.slice(i*sScalar, (i+n)*sScalar);
            opPromises.push(_multiExpChunk(buffBasesChunk, buffScalarsChunk, inType, logger, logText).then( (r) => {
                if (logger) logger.debug(`Multiexp end: ${logText}: ${i}/${nPoints}`);
                return r;
            }));
        }

        const result = await Promise.all(opPromises);

        let res = G.zero;
        for (let i=result.length-1; i>=0; i--) {
            res = G.add(res, result[i]);
        }

        return res;
    }

    G.multiExp = async function multiExpAffine(buffBases, buffScalars, logger, logText) {
        return await _multiExp(buffBases, buffScalars, "jacobian", logger, logText);
    };
    G.multiExpAffine = async function multiExpAffine(buffBases, buffScalars, logger, logText) {
        return await _multiExp(buffBases, buffScalars, "affine", logger, logText);
    };
}

function buildFFT(curve, groupName) {
    const G = curve[groupName];
    const Fr = curve.Fr;
    const tm = G.tm;
    async function _fft(buff, inverse, inType, outType, logger, loggerTxt) {

        inType = inType || "affine";
        outType = outType || "affine";
        const MAX_BITS_THREAD = 14;

        let sIn, sMid, sOut, fnIn2Mid, fnMid2Out, fnFFTMix, fnFFTJoin, fnFFTFinal;
        if (groupName == "G1") {
            if (inType == "affine") {
                sIn = G.F.n8*2;
                fnIn2Mid = "g1m_batchToJacobian";
            } else {
                sIn = G.F.n8*3;
            }
            sMid = G.F.n8*3;
            if (inverse) {
                fnFFTFinal = "g1m_fftFinal";
            }
            fnFFTJoin = "g1m_fftJoin";
            fnFFTMix = "g1m_fftMix";

            if (outType == "affine") {
                sOut = G.F.n8*2;
                fnMid2Out = "g1m_batchToAffine";
            } else {
                sOut = G.F.n8*3;
            }

        } else if (groupName == "G2") {
            if (inType == "affine") {
                sIn = G.F.n8*2;
                fnIn2Mid = "g2m_batchToJacobian";
            } else {
                sIn = G.F.n8*3;
            }
            sMid = G.F.n8*3;
            if (inverse) {
                fnFFTFinal = "g2m_fftFinal";
            }
            fnFFTJoin = "g2m_fftJoin";
            fnFFTMix = "g2m_fftMix";
            if (outType == "affine") {
                sOut = G.F.n8*2;
                fnMid2Out = "g2m_batchToAffine";
            } else {
                sOut = G.F.n8*3;
            }
        } else if (groupName == "Fr") {
            sIn = G.n8;
            sMid = G.n8;
            sOut = G.n8;
            if (inverse) {
                fnFFTFinal = "frm_fftFinal";
            }
            fnFFTMix = "frm_fftMix";
            fnFFTJoin = "frm_fftJoin";
        }


        let returnArray = false;
        if (Array.isArray(buff)) {
            buff = array2buffer(buff, sIn);
            returnArray = true;
        } else {
            buff = buff.slice(0, buff.byteLength);
        }

        const nPoints = buff.byteLength / sIn;
        const bits = log2(nPoints);

        if  ((1 << bits) != nPoints) {
            throw new Error("fft must be multiple of 2" );
        }

        if (bits == Fr.s +1) {
            let buffOut;

            if (inverse) {
                buffOut =  await _fftExtInv(buff, inType, outType, logger, loggerTxt);
            } else {
                buffOut =  await _fftExt(buff, inType, outType, logger, loggerTxt);
            }

            if (returnArray) {
                return buffer2array(buffOut, sOut);
            } else {
                return buffOut;
            }
        }

        let inv;
        if (inverse) {
            inv = Fr.inv(Fr.e(nPoints));
        }

        let buffOut;

        buffReverseBits(buff, sIn);

        let chunks;
        let pointsInChunk = Math.min(1 << MAX_BITS_THREAD, nPoints);
        let nChunks = nPoints / pointsInChunk;

        while ((nChunks < tm.concurrency)&&(pointsInChunk>=16)) {
            nChunks *= 2;
            pointsInChunk /= 2;
        }

        const l2Chunk = log2(pointsInChunk);

        const promises = [];
        for (let i = 0; i< nChunks; i++) {
            if (logger) logger.debug(`${loggerTxt}: fft ${bits} mix start: ${i}/${nChunks}`);
            const task = [];
            task.push({cmd: "ALLOC", var: 0, len: sMid*pointsInChunk});
            const buffChunk = buff.slice( (pointsInChunk * i)*sIn, (pointsInChunk * (i+1))*sIn);
            task.push({cmd: "SET", var: 0, buff: buffChunk});
            if (fnIn2Mid) {
                task.push({cmd: "CALL", fnName:fnIn2Mid, params: [{var:0}, {val: pointsInChunk}, {var: 0}]});
            }
            for (let j=1; j<=l2Chunk;j++) {
                task.push({cmd: "CALL", fnName:fnFFTMix, params: [{var:0}, {val: pointsInChunk}, {val: j}]});
            }

            if (l2Chunk==bits) {
                if (fnFFTFinal) {
                    task.push({cmd: "ALLOCSET", var: 1, buff: inv});
                    task.push({cmd: "CALL", fnName: fnFFTFinal,  params:[
                        {var: 0},
                        {val: pointsInChunk},
                        {var: 1},
                    ]});
                }
                if (fnMid2Out) {
                    task.push({cmd: "CALL", fnName:fnMid2Out, params: [{var:0}, {val: pointsInChunk}, {var: 0}]});
                }
                task.push({cmd: "GET", out: 0, var: 0, len: pointsInChunk*sOut});
            } else {
                task.push({cmd: "GET", out:0, var: 0, len: sMid*pointsInChunk});
            }
            promises.push(tm.queueAction(task).then( (r) => {
                if (logger) logger.debug(`${loggerTxt}: fft ${bits} mix end: ${i}/${nChunks}`);
                return r;
            }));
        }

        chunks = await Promise.all(promises);
        for (let i = 0; i< nChunks; i++) chunks[i] = chunks[i][0];

        for (let i = l2Chunk+1;   i<=bits; i++) {
            if (logger) logger.debug(`${loggerTxt}: fft  ${bits}  join: ${i}/${bits}`);
            const nGroups = 1 << (bits - i);
            const nChunksPerGroup = nChunks / nGroups;
            const opPromises = [];
            for (let j=0; j<nGroups; j++) {
                for (let k=0; k <nChunksPerGroup/2; k++) {
                    const first = Fr.exp( Fr.w[i], k*pointsInChunk);
                    const inc = Fr.w[i];
                    const o1 = j*nChunksPerGroup + k;
                    const o2 = j*nChunksPerGroup + k + nChunksPerGroup/2;

                    const task = [];
                    task.push({cmd: "ALLOCSET", var: 0, buff: chunks[o1]});
                    task.push({cmd: "ALLOCSET", var: 1, buff: chunks[o2]});
                    task.push({cmd: "ALLOCSET", var: 2, buff: first});
                    task.push({cmd: "ALLOCSET", var: 3, buff: inc});
                    task.push({cmd: "CALL", fnName: fnFFTJoin,  params:[
                        {var: 0},
                        {var: 1},
                        {val: pointsInChunk},
                        {var: 2},
                        {var: 3}
                    ]});
                    if (i==bits) {
                        if (fnFFTFinal) {
                            task.push({cmd: "ALLOCSET", var: 4, buff: inv});
                            task.push({cmd: "CALL", fnName: fnFFTFinal,  params:[
                                {var: 0},
                                {val: pointsInChunk},
                                {var: 4},
                            ]});
                            task.push({cmd: "CALL", fnName: fnFFTFinal,  params:[
                                {var: 1},
                                {val: pointsInChunk},
                                {var: 4},
                            ]});
                        }
                        if (fnMid2Out) {
                            task.push({cmd: "CALL", fnName:fnMid2Out, params: [{var:0}, {val: pointsInChunk}, {var: 0}]});
                            task.push({cmd: "CALL", fnName:fnMid2Out, params: [{var:1}, {val: pointsInChunk}, {var: 1}]});
                        }
                        task.push({cmd: "GET", out: 0, var: 0, len: pointsInChunk*sOut});
                        task.push({cmd: "GET", out: 1, var: 1, len: pointsInChunk*sOut});
                    } else {
                        task.push({cmd: "GET", out: 0, var: 0, len: pointsInChunk*sMid});
                        task.push({cmd: "GET", out: 1, var: 1, len: pointsInChunk*sMid});
                    }
                    opPromises.push(tm.queueAction(task).then( (r) => {
                        if (logger) logger.debug(`${loggerTxt}: fft ${bits} join  ${i}/${bits}  ${j+1}/${nGroups} ${k}/${nChunksPerGroup/2}`);
                        return r;
                    }));
                }
            }

            const res = await Promise.all(opPromises);
            for (let j=0; j<nGroups; j++) {
                for (let k=0; k <nChunksPerGroup/2; k++) {
                    const o1 = j*nChunksPerGroup + k;
                    const o2 = j*nChunksPerGroup + k + nChunksPerGroup/2;
                    const resChunk = res.shift();
                    chunks[o1] = resChunk[0];
                    chunks[o2] = resChunk[1];
                }
            }
        }

        if (buff instanceof BigBuffer) {
            buffOut = new BigBuffer(nPoints*sOut);
        } else {
            buffOut = new Uint8Array(nPoints*sOut);
        }
        if (inverse) {
            buffOut.set(chunks[0].slice((pointsInChunk-1)*sOut));
            let p= sOut;
            for (let i=nChunks-1; i>0; i--) {
                buffOut.set(chunks[i], p);
                p += pointsInChunk*sOut;
                delete chunks[i];  // Liberate mem
            }
            buffOut.set(chunks[0].slice(0, (pointsInChunk-1)*sOut), p);
            delete chunks[0];
        } else {
            for (let i=0; i<nChunks; i++) {
                buffOut.set(chunks[i], pointsInChunk*sOut*i);
                delete chunks[i];
            }
        }

        if (returnArray) {
            return buffer2array(buffOut, sOut);
        } else {
            return buffOut;
        }
    }

    async function _fftExt(buff, inType, outType, logger, loggerTxt) {
        let b1, b2;
        b1 = buff.slice( 0 , buff.byteLength/2);
        b2 = buff.slice( buff.byteLength/2, buff.byteLength);

        const promises = [];

        [b1, b2] = await _fftJoinExt(b1, b2, "fftJoinExt", Fr.one, Fr.shift, inType, "jacobian", logger, loggerTxt);

        promises.push( _fft(b1, false, "jacobian", outType, logger, loggerTxt));
        promises.push( _fft(b2, false, "jacobian", outType, logger, loggerTxt));

        const res1 = await Promise.all(promises);

        let buffOut;
        if (res1[0].byteLength > (1<<28)) {
            buffOut = new BigBuffer(res1[0].byteLength*2);
        } else {
            buffOut = new Uint8Array(res1[0].byteLength*2);
        }

        buffOut.set(res1[0]);
        buffOut.set(res1[1], res1[0].byteLength);

        return buffOut;
    }

    async function _fftExtInv(buff, inType, outType, logger, loggerTxt) {
        let b1, b2;
        b1 = buff.slice( 0 , buff.byteLength/2);
        b2 = buff.slice( buff.byteLength/2, buff.byteLength);

        const promises = [];

        promises.push( _fft(b1, true, inType, "jacobian", logger, loggerTxt));
        promises.push( _fft(b2, true, inType, "jacobian", logger, loggerTxt));

        [b1, b2] = await Promise.all(promises);

        const res1 = await _fftJoinExt(b1, b2, "fftJoinExtInv", Fr.one, Fr.shiftInv, "jacobian", outType, logger, loggerTxt);

        let buffOut;
        if (res1[0].byteLength > (1<<28)) {
            buffOut = new BigBuffer(res1[0].byteLength*2);
        } else {
            buffOut = new Uint8Array(res1[0].byteLength*2);
        }

        buffOut.set(res1[0]);
        buffOut.set(res1[1], res1[0].byteLength);

        return buffOut;
    }


    async function _fftJoinExt(buff1, buff2, fn, first, inc, inType, outType, logger, loggerTxt) {
        const MAX_CHUNK_SIZE = 1<<16;
        const MIN_CHUNK_SIZE = 1<<4;

        let fnName;
        let fnIn2Mid, fnMid2Out;
        let sOut, sIn, sMid;

        if (groupName == "G1") {
            if (inType == "affine") {
                sIn = G.F.n8*2;
                fnIn2Mid = "g1m_batchToJacobian";
            } else {
                sIn = G.F.n8*3;
            }
            sMid = G.F.n8*3;
            fnName = "g1m_"+fn;
            if (outType == "affine") {
                fnMid2Out = "g1m_batchToAffine";
                sOut = G.F.n8*2;
            } else {
                sOut = G.F.n8*3;
            }
        } else if (groupName == "G2") {
            if (inType == "affine") {
                sIn = G.F.n8*2;
                fnIn2Mid = "g2m_batchToJacobian";
            } else {
                sIn = G.F.n8*3;
            }
            fnName = "g2m_"+fn;
            sMid = G.F.n8*3;
            if (outType == "affine") {
                fnMid2Out = "g2m_batchToAffine";
                sOut = G.F.n8*2;
            } else {
                sOut = G.F.n8*3;
            }
        } else if (groupName == "Fr") {
            sIn = Fr.n8;
            sOut = Fr.n8;
            sMid = Fr.n8;
            fnName = "frm_" + fn;
        } else {
            throw new Error("Invalid group");
        }

        if (buff1.byteLength != buff2.byteLength) {
            throw new Error("Invalid buffer size");
        }
        const nPoints = Math.floor(buff1.byteLength / sIn);
        if (nPoints != 1 << log2(nPoints)) {
            throw new Error("Invalid number of points");
        }

        let chunkSize = Math.floor(nPoints /tm.concurrency);
        if (chunkSize < MIN_CHUNK_SIZE) chunkSize = MIN_CHUNK_SIZE;
        if (chunkSize > MAX_CHUNK_SIZE) chunkSize = MAX_CHUNK_SIZE;

        const opPromises = [];

        for (let i=0; i<nPoints; i += chunkSize) {
            if (logger) logger.debug(`${loggerTxt}: fftJoinExt Start: ${i}/${nPoints}`);
            const n= Math.min(nPoints - i, chunkSize);

            const firstChunk = Fr.mul(first, Fr.exp( inc, i));
            const task = [];

            const b1 = buff1.slice(i*sIn, (i+n)*sIn);
            const b2 = buff2.slice(i*sIn, (i+n)*sIn);

            task.push({cmd: "ALLOC", var: 0, len: sMid*n});
            task.push({cmd: "SET", var: 0, buff: b1});
            task.push({cmd: "ALLOC", var: 1, len: sMid*n});
            task.push({cmd: "SET", var: 1, buff: b2});
            task.push({cmd: "ALLOCSET", var: 2, buff: firstChunk});
            task.push({cmd: "ALLOCSET", var: 3, buff: inc});
            if (fnIn2Mid) {
                task.push({cmd: "CALL", fnName:fnIn2Mid, params: [{var:0}, {val: n}, {var: 0}]});
                task.push({cmd: "CALL", fnName:fnIn2Mid, params: [{var:1}, {val: n}, {var: 1}]});
            }
            task.push({cmd: "CALL", fnName: fnName, params: [
                {var: 0},
                {var: 1},
                {val: n},
                {var: 2},
                {var: 3},
                {val: Fr.s},
            ]});
            if (fnMid2Out) {
                task.push({cmd: "CALL", fnName:fnMid2Out, params: [{var:0}, {val: n}, {var: 0}]});
                task.push({cmd: "CALL", fnName:fnMid2Out, params: [{var:1}, {val: n}, {var: 1}]});
            }
            task.push({cmd: "GET", out: 0, var: 0, len: n*sOut});
            task.push({cmd: "GET", out: 1, var: 1, len: n*sOut});
            opPromises.push(
                tm.queueAction(task).then( (r) => {
                    if (logger) logger.debug(`${loggerTxt}: fftJoinExt End: ${i}/${nPoints}`);
                    return r;
                })
            );
        }

        const result = await Promise.all(opPromises);

        let fullBuffOut1;
        let fullBuffOut2;
        if (nPoints * sOut > 1<<28) {
            fullBuffOut1 = new BigBuffer(nPoints*sOut);
            fullBuffOut2 = new BigBuffer(nPoints*sOut);
        } else {
            fullBuffOut1 = new Uint8Array(nPoints*sOut);
            fullBuffOut2 = new Uint8Array(nPoints*sOut);
        }

        let p =0;
        for (let i=0; i<result.length; i++) {
            fullBuffOut1.set(result[i][0], p);
            fullBuffOut2.set(result[i][1], p);
            p+=result[i][0].byteLength;
        }

        return [fullBuffOut1, fullBuffOut2];
    }


    G.fft = async function(buff, inType, outType, logger, loggerTxt) {
        return await _fft(buff, false, inType, outType, logger, loggerTxt);
    };

    G.ifft = async function(buff, inType, outType, logger, loggerTxt) {
        return await _fft(buff, true, inType, outType, logger, loggerTxt);
    };

    G.lagrangeEvaluations = async function (buff, inType, outType, logger, loggerTxt) {
        inType = inType || "affine";
        outType = outType || "affine";

        let sIn;
        if (groupName == "G1") {
            if (inType == "affine") {
                sIn = G.F.n8*2;
            } else {
                sIn = G.F.n8*3;
            }
        } else if (groupName == "G2") {
            if (inType == "affine") {
                sIn = G.F.n8*2;
            } else {
                sIn = G.F.n8*3;
            }
        } else if (groupName == "Fr") {
            sIn = Fr.n8;
        } else {
            throw new Error("Invalid group");
        }

        const nPoints = buff.byteLength /sIn;
        const bits = log2(nPoints);

        if ((2 ** bits)*sIn != buff.byteLength) {
            if (logger) logger.error("lagrangeEvaluations iinvalid input size");
            throw new Error("lagrangeEvaluations invalid Input size");
        }

        if (bits <= Fr.s) {
            return await G.ifft(buff, inType, outType, logger, loggerTxt);
        }

        if (bits > Fr.s+1) {
            if (logger) logger.error("lagrangeEvaluations input too big");
            throw new Error("lagrangeEvaluations input too big");
        }

        let t0 = buff.slice(0, buff.byteLength/2);
        let t1 = buff.slice(buff.byteLength/2, buff.byteLength);


        const shiftToSmallM = Fr.exp(Fr.shift, nPoints/2);
        const sConst = Fr.inv( Fr.sub(Fr.one, shiftToSmallM));

        [t0, t1] = await _fftJoinExt(t0, t1, "prepareLagrangeEvaluation", sConst, Fr.shiftInv, inType, "jacobian", logger, loggerTxt + " prep");

        const promises = [];

        promises.push( _fft(t0, true, "jacobian", outType, logger, loggerTxt + " t0"));
        promises.push( _fft(t1, true, "jacobian", outType, logger, loggerTxt + " t1"));

        [t0, t1] = await Promise.all(promises);

        let buffOut;
        if (t0.byteLength > (1<<28)) {
            buffOut = new BigBuffer(t0.byteLength*2);
        } else {
            buffOut = new Uint8Array(t0.byteLength*2);
        }

        buffOut.set(t0);
        buffOut.set(t1, t0.byteLength);

        return buffOut;
    };

    G.fftMix = async function fftMix(buff) {
        const sG = G.F.n8*3;
        let fnName, fnFFTJoin;
        if (groupName == "G1") {
            fnName = "g1m_fftMix";
            fnFFTJoin = "g1m_fftJoin";
        } else if (groupName == "G2") {
            fnName = "g2m_fftMix";
            fnFFTJoin = "g2m_fftJoin";
        } else if (groupName == "Fr") {
            fnName = "frm_fftMix";
            fnFFTJoin = "frm_fftJoin";
        } else {
            throw new Error("Invalid group");
        }

        const nPoints = Math.floor(buff.byteLength / sG);
        const power = log2(nPoints);

        let nChunks = 1 << log2(tm.concurrency);

        if (nPoints <= nChunks*2) nChunks = 1;

        const pointsPerChunk = nPoints / nChunks;

        const powerChunk = log2(pointsPerChunk);

        const opPromises = [];
        for (let i=0; i<nChunks; i++) {
            const task = [];
            const b = buff.slice((i* pointsPerChunk)*sG, ((i+1)* pointsPerChunk)*sG);
            task.push({cmd: "ALLOCSET", var: 0, buff: b});
            for (let j=1; j<=powerChunk; j++) {
                task.push({cmd: "CALL", fnName: fnName, params: [
                    {var: 0},
                    {val: pointsPerChunk},
                    {val: j}
                ]});
            }
            task.push({cmd: "GET", out: 0, var: 0, len: pointsPerChunk*sG});
            opPromises.push(
                tm.queueAction(task)
            );
        }

        const result = await Promise.all(opPromises);

        const chunks = [];
        for (let i=0; i<result.length; i++) chunks[i] = result[i][0];


        for (let i = powerChunk+1; i<=power; i++) {
            const nGroups = 1 << (power - i);
            const nChunksPerGroup = nChunks / nGroups;
            const opPromises = [];
            for (let j=0; j<nGroups; j++) {
                for (let k=0; k <nChunksPerGroup/2; k++) {
                    const first = Fr.exp( Fr.w[i], k*pointsPerChunk);
                    const inc = Fr.w[i];
                    const o1 = j*nChunksPerGroup + k;
                    const o2 = j*nChunksPerGroup + k + nChunksPerGroup/2;

                    const task = [];
                    task.push({cmd: "ALLOCSET", var: 0, buff: chunks[o1]});
                    task.push({cmd: "ALLOCSET", var: 1, buff: chunks[o2]});
                    task.push({cmd: "ALLOCSET", var: 2, buff: first});
                    task.push({cmd: "ALLOCSET", var: 3, buff: inc});
                    task.push({cmd: "CALL", fnName: fnFFTJoin,  params:[
                        {var: 0},
                        {var: 1},
                        {val: pointsPerChunk},
                        {var: 2},
                        {var: 3}
                    ]});
                    task.push({cmd: "GET", out: 0, var: 0, len: pointsPerChunk*sG});
                    task.push({cmd: "GET", out: 1, var: 1, len: pointsPerChunk*sG});
                    opPromises.push(tm.queueAction(task));
                }
            }

            const res = await Promise.all(opPromises);
            for (let j=0; j<nGroups; j++) {
                for (let k=0; k <nChunksPerGroup/2; k++) {
                    const o1 = j*nChunksPerGroup + k;
                    const o2 = j*nChunksPerGroup + k + nChunksPerGroup/2;
                    const resChunk = res.shift();
                    chunks[o1] = resChunk[0];
                    chunks[o2] = resChunk[1];
                }
            }
        }

        let fullBuffOut;
        if (buff instanceof BigBuffer) {
            fullBuffOut = new BigBuffer(nPoints*sG);
        } else {
            fullBuffOut = new Uint8Array(nPoints*sG);
        }
        let p =0;
        for (let i=0; i<nChunks; i++) {
            fullBuffOut.set(chunks[i], p);
            p+=chunks[i].byteLength;
        }

        return fullBuffOut;
    };

    G.fftJoin = async function fftJoin(buff1, buff2, first, inc) {
        const sG = G.F.n8*3;
        let fnName;
        if (groupName == "G1") {
            fnName = "g1m_fftJoin";
        } else if (groupName == "G2") {
            fnName = "g2m_fftJoin";
        } else if (groupName == "Fr") {
            fnName = "frm_fftJoin";
        } else {
            throw new Error("Invalid group");
        }

        if (buff1.byteLength != buff2.byteLength) {
            throw new Error("Invalid buffer size");
        }
        const nPoints = Math.floor(buff1.byteLength / sG);
        if (nPoints != 1 << log2(nPoints)) {
            throw new Error("Invalid number of points");
        }

        let nChunks = 1 << log2(tm.concurrency);
        if (nPoints <= nChunks*2) nChunks = 1;

        const pointsPerChunk = nPoints / nChunks;


        const opPromises = [];
        for (let i=0; i<nChunks; i++) {
            const task = [];

            const firstChunk = Fr.mul(first, Fr.exp(inc, i*pointsPerChunk));
            const b1 = buff1.slice((i* pointsPerChunk)*sG, ((i+1)* pointsPerChunk)*sG);
            const b2 = buff2.slice((i* pointsPerChunk)*sG, ((i+1)* pointsPerChunk)*sG);
            task.push({cmd: "ALLOCSET", var: 0, buff: b1});
            task.push({cmd: "ALLOCSET", var: 1, buff: b2});
            task.push({cmd: "ALLOCSET", var: 2, buff: firstChunk});
            task.push({cmd: "ALLOCSET", var: 3, buff: inc});
            task.push({cmd: "CALL", fnName: fnName, params: [
                {var: 0},
                {var: 1},
                {val: pointsPerChunk},
                {var: 2},
                {var: 3}
            ]});
            task.push({cmd: "GET", out: 0, var: 0, len: pointsPerChunk*sG});
            task.push({cmd: "GET", out: 1, var: 1, len: pointsPerChunk*sG});
            opPromises.push(
                tm.queueAction(task)
            );

        }


        const result = await Promise.all(opPromises);

        let fullBuffOut1;
        let fullBuffOut2;
        if (buff1 instanceof BigBuffer) {
            fullBuffOut1 = new BigBuffer(nPoints*sG);
            fullBuffOut2 = new BigBuffer(nPoints*sG);
        } else {
            fullBuffOut1 = new Uint8Array(nPoints*sG);
            fullBuffOut2 = new Uint8Array(nPoints*sG);
        }

        let p =0;
        for (let i=0; i<result.length; i++) {
            fullBuffOut1.set(result[i][0], p);
            fullBuffOut2.set(result[i][1], p);
            p+=result[i][0].byteLength;
        }

        return [fullBuffOut1, fullBuffOut2];
    };



    G.fftFinal =  async function fftFinal(buff, factor) {
        const sG = G.F.n8*3;
        const sGout = G.F.n8*2;
        let fnName, fnToAffine;
        if (groupName == "G1") {
            fnName = "g1m_fftFinal";
            fnToAffine = "g1m_batchToAffine";
        } else if (groupName == "G2") {
            fnName = "g2m_fftFinal";
            fnToAffine = "g2m_batchToAffine";
        } else {
            throw new Error("Invalid group");
        }

        const nPoints = Math.floor(buff.byteLength / sG);
        if (nPoints != 1 << log2(nPoints)) {
            throw new Error("Invalid number of points");
        }

        const pointsPerChunk = Math.floor(nPoints / tm.concurrency);

        const opPromises = [];
        for (let i=0; i<tm.concurrency; i++) {
            let n;
            if (i< tm.concurrency-1) {
                n = pointsPerChunk;
            } else {
                n = nPoints - i*pointsPerChunk;
            }
            if (n==0) continue;
            const task = [];
            const b = buff.slice((i* pointsPerChunk)*sG, (i*pointsPerChunk+n)*sG);
            task.push({cmd: "ALLOCSET", var: 0, buff: b});
            task.push({cmd: "ALLOCSET", var: 1, buff: factor});
            task.push({cmd: "CALL", fnName: fnName, params: [
                {var: 0},
                {val: n},
                {var: 1},
            ]});
            task.push({cmd: "CALL", fnName: fnToAffine, params: [
                {var: 0},
                {val: n},
                {var: 0},
            ]});
            task.push({cmd: "GET", out: 0, var: 0, len: n*sGout});
            opPromises.push(
                tm.queueAction(task)
            );

        }

        const result = await Promise.all(opPromises);

        let fullBuffOut;
        if (buff instanceof BigBuffer) {
            fullBuffOut = new BigBuffer(nPoints*sGout);
        } else {
            fullBuffOut = new Uint8Array(nPoints*sGout);
        }

        let p =0;
        for (let i=result.length-1; i>=0; i--) {
            fullBuffOut.set(result[i][0], p);
            p+=result[i][0].byteLength;
        }

        return fullBuffOut;
    };
}

async function buildEngine(params) {

    const tm = await buildThreadManager(params.wasm, params.singleThread);


    const curve = {};

    curve.q = e(params.wasm.q.toString());
    curve.r = e(params.wasm.r.toString());
    curve.name = params.name;
    curve.tm = tm;
    curve.prePSize = params.wasm.prePSize;
    curve.preQSize = params.wasm.preQSize;
    curve.Fr = new WasmField1(tm, "frm", params.n8r, params.r);
    curve.F1 = new WasmField1(tm, "f1m", params.n8q, params.q);
    curve.F2 = new WasmField2(tm, "f2m", curve.F1);
    curve.G1 = new WasmCurve(tm, "g1m", curve.F1, params.wasm.pG1gen, params.wasm.pG1b, params.cofactorG1);
    curve.G2 = new WasmCurve(tm, "g2m", curve.F2, params.wasm.pG2gen, params.wasm.pG2b, params.cofactorG2);
    curve.F6 = new WasmField3(tm, "f6m", curve.F2);
    curve.F12 = new WasmField2(tm, "ftm", curve.F6);

    curve.Gt = curve.F12;

    buildBatchApplyKey(curve, "G1");
    buildBatchApplyKey(curve, "G2");
    buildBatchApplyKey(curve, "Fr");

    buildMultiexp(curve, "G1");
    buildMultiexp(curve, "G2");

    buildFFT(curve, "G1");
    buildFFT(curve, "G2");
    buildFFT(curve, "Fr");

    buildPairing(curve);

    curve.array2buffer = function(arr, sG) {
        const buff = new Uint8Array(sG*arr.length);

        for (let i=0; i<arr.length; i++) {
            buff.set(arr[i], i*sG);
        }

        return buff;
    };

    curve.buffer2array = function(buff , sG) {
        const n= buff.byteLength / sG;
        const arr = new Array(n);
        for (let i=0; i<n; i++) {
            arr[i] = buff.slice(i*sG, i*sG+sG);
        }
        return arr;
    };

    return curve;
}

globalThis.curve_bn128 = null;

async function buildBn128(singleThread, plugins) {

    const moduleBuilder = new wasmbuilder.ModuleBuilder();
    moduleBuilder.setMemory(25);
    wasmcurves.buildBn128(moduleBuilder);

    if (plugins) plugins(moduleBuilder);

    const bn128wasm = {};

    bn128wasm.code = moduleBuilder.build();
    bn128wasm.pq = moduleBuilder.modules.f1m.pq;
    bn128wasm.pr = moduleBuilder.modules.frm.pq;
    bn128wasm.pG1gen = moduleBuilder.modules.bn128.pG1gen;
    bn128wasm.pG1zero = moduleBuilder.modules.bn128.pG1zero;
    bn128wasm.pG1b = moduleBuilder.modules.bn128.pG1b;
    bn128wasm.pG2gen = moduleBuilder.modules.bn128.pG2gen;
    bn128wasm.pG2zero = moduleBuilder.modules.bn128.pG2zero;
    bn128wasm.pG2b = moduleBuilder.modules.bn128.pG2b;
    bn128wasm.pOneT = moduleBuilder.modules.bn128.pOneT;
    bn128wasm.prePSize = moduleBuilder.modules.bn128.prePSize;
    bn128wasm.preQSize = moduleBuilder.modules.bn128.preQSize;
    bn128wasm.n8q = 32;
    bn128wasm.n8r = 32;
    bn128wasm.q = moduleBuilder.modules.bn128.q;
    bn128wasm.r = moduleBuilder.modules.bn128.r;

    if ((!singleThread) && (globalThis.curve_bn128)) return globalThis.curve_bn128;
    const params = {
        name: "bn128",
        wasm: bn128wasm,
        q: e("21888242871839275222246405745257275088696311157297823662689037894645226208583"),
        r: e("21888242871839275222246405745257275088548364400416034343698204186575808495617"),
        n8q: 32,
        n8r: 32,
        cofactorG2: e("30644e72e131a029b85045b68181585e06ceecda572a2489345f2299c0f9fa8d", 16),
        singleThread: singleThread ? true : false
    };

    const curve = await buildEngine(params);
    curve.terminate = async function () {
        if (!params.singleThread) {
            globalThis.curve_bn128 = null;
            await this.tm.terminate();
        }
    };

    if (!singleThread) {
        globalThis.curve_bn128 = curve;
    }

    return curve;
}

globalThis.curve_bls12381 = null;

async function buildBls12381(singleThread, plugins) {

    const moduleBuilder = new wasmbuilder.ModuleBuilder();
    moduleBuilder.setMemory(25);
    wasmcurves.buildBls12381(moduleBuilder);

    if (plugins) plugins(moduleBuilder);

    const bls12381wasm = {};

    bls12381wasm.code = moduleBuilder.build();
    bls12381wasm.pq = moduleBuilder.modules.f1m.pq;
    bls12381wasm.pr = moduleBuilder.modules.frm.pq;
    bls12381wasm.pG1gen = moduleBuilder.modules.bls12381.pG1gen;
    bls12381wasm.pG1zero = moduleBuilder.modules.bls12381.pG1zero;
    bls12381wasm.pG1b = moduleBuilder.modules.bls12381.pG1b;
    bls12381wasm.pG2gen = moduleBuilder.modules.bls12381.pG2gen;
    bls12381wasm.pG2zero = moduleBuilder.modules.bls12381.pG2zero;
    bls12381wasm.pG2b = moduleBuilder.modules.bls12381.pG2b;
    bls12381wasm.pOneT = moduleBuilder.modules.bls12381.pOneT;
    bls12381wasm.prePSize = moduleBuilder.modules.bls12381.prePSize;
    bls12381wasm.preQSize = moduleBuilder.modules.bls12381.preQSize;
    bls12381wasm.n8q = 48;
    bls12381wasm.n8r = 32;
    bls12381wasm.q = moduleBuilder.modules.bls12381.q;
    bls12381wasm.r = moduleBuilder.modules.bls12381.r;


    if ((!singleThread) && (globalThis.curve_bls12381)) return globalThis.curve_bls12381;
    const params = {
        name: "bls12381",
        wasm: bls12381wasm,
        q: e("1a0111ea397fe69a4b1ba7b6434bacd764774b84f38512bf6730d2a0f6b0f6241eabfffeb153ffffb9feffffffffaaab", 16),
        r: e("73eda753299d7d483339d80809a1d80553bda402fffe5bfeffffffff00000001", 16),
        n8q: 48,
        n8r: 32,
        cofactorG1: e("0x396c8c005555e1568c00aaab0000aaab", 16),
        cofactorG2: e("0x5d543a95414e7f1091d50792876a202cd91de4547085abaa68a205b2e5a7ddfa628f1cb4d9e82ef21537e293a6691ae1616ec6e786f0c70cf1c38e31c7238e5", 16),
        singleThread: singleThread ? true : false
    };

    const curve = await buildEngine(params);
    curve.terminate = async function () {
        if (!params.singleThread) {
            globalThis.curve_bls12381 = null;
            await this.tm.terminate();
        }
    };

    if (!singleThread) {
        globalThis.curve_bls12381 = curve;
    }

    return curve;
}

const bls12381r = e("73eda753299d7d483339d80809a1d80553bda402fffe5bfeffffffff00000001", 16);
const bn128r = e("21888242871839275222246405745257275088548364400416034343698204186575808495617");

const bls12381q = e("1a0111ea397fe69a4b1ba7b6434bacd764774b84f38512bf6730d2a0f6b0f6241eabfffeb153ffffb9feffffffffaaab", 16);
const bn128q = e("21888242871839275222246405745257275088696311157297823662689037894645226208583");

async function getCurveFromR(r, singleThread, plugins) {
    let curve;
    if (eq(r, bn128r)) {
        curve = await buildBn128(singleThread, plugins);
    } else if (eq(r, bls12381r)) {
        curve = await buildBls12381(singleThread, plugins);
    } else {
        throw new Error(`Curve not supported: ${toString(r)}`);
    }
    return curve;
}

async function getCurveFromQ(q, singleThread, plugins) {
    let curve;
    if (eq(q, bn128q)) {
        curve = await buildBn128(singleThread, plugins);
    } else if (eq(q, bls12381q)) {
        curve = await buildBls12381(singleThread, plugins);
    } else {
        throw new Error(`Curve not supported: ${toString(q, 16)}`);
    }
    return curve;
}

async function getCurveFromName(name, singleThread, plugins) {
    let curve;
    const normName = normalizeName(name);
    if (["BN128", "BN254", "ALTBN128"].indexOf(normName) >= 0) {
        curve = await buildBn128(singleThread, plugins);
    } else if (["BLS12381"].indexOf(normName) >= 0) {
        curve = await buildBls12381(singleThread, plugins);
    } else {
        throw new Error(`Curve not supported: ${name}`);
    }
    return curve;

    function normalizeName(n) {
        return n.toUpperCase().match(/[A-Za-z0-9]+/g).join("");
    }

}

const Scalar=_Scalar;
const utils = _utils;

exports.BigBuffer = BigBuffer;
exports.ChaCha = ChaCha;
exports.EC = EC;
exports.F1Field = ZqField;
exports.F2Field = F2Field;
exports.F3Field = F3Field;
exports.PolField = PolField;
exports.Scalar = Scalar;
exports.ZqField = ZqField;
exports.buildBls12381 = buildBls12381;
exports.buildBn128 = buildBn128;
exports.getCurveFromName = getCurveFromName;
exports.getCurveFromQ = getCurveFromQ;
exports.getCurveFromR = getCurveFromR;
exports.utils = utils;


/***/ }),

/***/ 190:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";


var crypto = __webpack_require__(982);
var wasmcurves = __webpack_require__(189);
var os = __webpack_require__(857);
var Worker2 = __webpack_require__(667);
var wasmbuilder = __webpack_require__(14);

/* global BigInt */
const hexLen = [ 0, 1, 2, 2, 3, 3, 3, 3, 4 ,4 ,4 ,4 ,4 ,4 ,4 ,4];

function fromString(s, radix) {
    if ((!radix)||(radix==10)) {
        return BigInt(s);
    } else if (radix==16) {
        if (s.slice(0,2) == "0x") {
            return BigInt(s);
        } else {
            return BigInt("0x"+s);
        }
    }
}

const e = fromString;

function fromArray(a, radix) {
    let acc =BigInt(0);
    radix = BigInt(radix);
    for (let i=0; i<a.length; i++) {
        acc = acc*radix + BigInt(a[i]);
    }
    return acc;
}

function bitLength(a) {
    const aS =a.toString(16);
    return (aS.length-1)*4 +hexLen[parseInt(aS[0], 16)];
}

function isNegative(a) {
    return BigInt(a) < BigInt(0);
}

function isZero(a) {
    return !a;
}

function shiftLeft(a, n) {
    return BigInt(a) << BigInt(n);
}

function shiftRight(a, n) {
    return BigInt(a) >> BigInt(n);
}

const shl = shiftLeft;
const shr = shiftRight;

function isOdd(a) {
    return (BigInt(a) & BigInt(1)) == BigInt(1);
}


function naf(n) {
    let E = BigInt(n);
    const res = [];
    while (E) {
        if (E & BigInt(1)) {
            const z = 2 - Number(E % BigInt(4));
            res.push( z );
            E = E - BigInt(z);
        } else {
            res.push( 0 );
        }
        E = E >> BigInt(1);
    }
    return res;
}


function bits(n) {
    let E = BigInt(n);
    const res = [];
    while (E) {
        if (E & BigInt(1)) {
            res.push(1);
        } else {
            res.push( 0 );
        }
        E = E >> BigInt(1);
    }
    return res;
}

function toNumber(s) {
    if (s>BigInt(Number.MAX_SAFE_INTEGER )) {
        throw new Error("Number too big");
    }
    return Number(s);
}

function toArray(s, radix) {
    const res = [];
    let rem = BigInt(s);
    radix = BigInt(radix);
    while (rem) {
        res.unshift( Number(rem % radix));
        rem = rem / radix;
    }
    return res;
}


function add(a, b) {
    return BigInt(a) + BigInt(b);
}

function sub(a, b) {
    return BigInt(a) - BigInt(b);
}

function neg(a) {
    return -BigInt(a);
}

function mul(a, b) {
    return BigInt(a) * BigInt(b);
}

function square(a) {
    return BigInt(a) * BigInt(a);
}

function pow(a, b) {
    return BigInt(a) ** BigInt(b);
}

function exp$1(a, b) {
    return BigInt(a) ** BigInt(b);
}

function abs(a) {
    return BigInt(a) >= 0 ? BigInt(a) : -BigInt(a);
}

function div(a, b) {
    return BigInt(a) / BigInt(b);
}

function mod(a, b) {
    return BigInt(a) % BigInt(b);
}

function eq(a, b) {
    return BigInt(a) == BigInt(b);
}

function neq(a, b) {
    return BigInt(a) != BigInt(b);
}

function lt(a, b) {
    return BigInt(a) < BigInt(b);
}

function gt(a, b) {
    return BigInt(a) > BigInt(b);
}

function leq(a, b) {
    return BigInt(a) <= BigInt(b);
}

function geq(a, b) {
    return BigInt(a) >= BigInt(b);
}

function band(a, b) {
    return BigInt(a) & BigInt(b);
}

function bor(a, b) {
    return BigInt(a) | BigInt(b);
}

function bxor(a, b) {
    return BigInt(a) ^ BigInt(b);
}

function land(a, b) {
    return BigInt(a) && BigInt(b);
}

function lor(a, b) {
    return BigInt(a) || BigInt(b);
}

function lnot(a) {
    return !BigInt(a);
}

// Returns a buffer with Little Endian Representation
function toRprLE(buff, o, e, n8) {
    const s = "0000000" + e.toString(16);
    const v = new Uint32Array(buff.buffer, buff.byteOffset + o, n8/4);
    const l = (((s.length-7)*4 - 1) >> 5)+1;    // Number of 32bit words;
    for (let i=0; i<l; i++) v[i] = parseInt(s.substring(s.length-8*i-8, s.length-8*i), 16);
    for (let i=l; i<v.length; i++) v[i] = 0;
    for (let i=v.length*4; i<n8; i++) buff[i] = toNumber(band(shiftRight(e, i*8), 0xFF));
}

// Returns a buffer with Big Endian Representation
function toRprBE(buff, o, e, n8) {
    const s = "0000000" + e.toString(16);
    const v = new DataView(buff.buffer, buff.byteOffset + o, n8);
    const l = (((s.length-7)*4 - 1) >> 5)+1;    // Number of 32bit words;
    for (let i=0; i<l; i++) v.setUint32(n8-i*4 -4, parseInt(s.substring(s.length-8*i-8, s.length-8*i), 16), false);
    for (let i=0; i<n8/4-l; i++) v[i] = 0;
}

// Pases a buffer with Little Endian Representation
function fromRprLE(buff, o, n8) {
    n8 = n8 || buff.byteLength;
    o = o || 0;
    const v = new Uint32Array(buff.buffer, buff.byteOffset + o, n8/4);
    const a = new Array(n8/4);
    v.forEach( (ch,i) => a[a.length-i-1] = ch.toString(16).padStart(8,"0") );
    return fromString(a.join(""), 16);
}

// Pases a buffer with Big Endian Representation
function fromRprBE(buff, o, n8) {
    n8 = n8 || buff.byteLength;
    o = o || 0;
    const v = new DataView(buff.buffer, buff.byteOffset + o, n8);
    const a = new Array(n8/4);
    for (let i=0; i<n8/4; i++) {
        a[i] = v.getUint32(i*4, false).toString(16).padStart(8, "0");
    }
    return fromString(a.join(""), 16);
}

function toString(a, radix) {
    return a.toString(radix);
}

function toLEBuff(a) {
    const buff = new Uint8Array(Math.floor((bitLength(a) - 1) / 8) +1);
    toRprLE(buff, 0, a, buff.byteLength);
    return buff;
}

const zero = e(0);
const one = e(1);

var _Scalar = /*#__PURE__*/Object.freeze({
    __proto__: null,
    abs: abs,
    add: add,
    band: band,
    bitLength: bitLength,
    bits: bits,
    bor: bor,
    bxor: bxor,
    div: div,
    e: e,
    eq: eq,
    exp: exp$1,
    fromArray: fromArray,
    fromRprBE: fromRprBE,
    fromRprLE: fromRprLE,
    fromString: fromString,
    geq: geq,
    gt: gt,
    isNegative: isNegative,
    isOdd: isOdd,
    isZero: isZero,
    land: land,
    leq: leq,
    lnot: lnot,
    lor: lor,
    lt: lt,
    mod: mod,
    mul: mul,
    naf: naf,
    neg: neg,
    neq: neq,
    one: one,
    pow: pow,
    shiftLeft: shiftLeft,
    shiftRight: shiftRight,
    shl: shl,
    shr: shr,
    square: square,
    sub: sub,
    toArray: toArray,
    toLEBuff: toLEBuff,
    toNumber: toNumber,
    toRprBE: toRprBE,
    toRprLE: toRprLE,
    toString: toString,
    zero: zero
});

/*
    Copyright 2018 0kims association.

    This file is part of snarkjs.

    snarkjs is a free software: you can redistribute it and/or
    modify it under the terms of the GNU General Public License as published by the
    Free Software Foundation, either version 3 of the License, or (at your option)
    any later version.

    snarkjs is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY
    or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for
    more details.

    You should have received a copy of the GNU General Public License along with
    snarkjs. If not, see <https://www.gnu.org/licenses/>.
*/

/*
    This library does operations on polynomials with coefficients in a field F.

    A polynomial P(x) = p0 + p1 * x + p2 * x^2 + ... + pn * x^n  is represented
    by the array [ p0, p1, p2, ... , pn ].
 */

class PolField {
    constructor (F) {
        this.F = F;

        let rem = F.sqrt_t;
        let s = F.sqrt_s;

        const five = this.F.add(this.F.add(this.F.two, this.F.two), this.F.one);

        this.w = new Array(s+1);
        this.wi = new Array(s+1);
        this.w[s] = this.F.pow(five, rem);
        this.wi[s] = this.F.inv(this.w[s]);

        let n=s-1;
        while (n>=0) {
            this.w[n] = this.F.square(this.w[n+1]);
            this.wi[n] = this.F.square(this.wi[n+1]);
            n--;
        }


        this.roots = [];
/*        for (let i=0; i<16; i++) {
            let r = this.F.one;
            n = 1 << i;
            const rootsi = new Array(n);
            for (let j=0; j<n; j++) {
                rootsi[j] = r;
                r = this.F.mul(r, this.w[i]);
            }

            this.roots.push(rootsi);
        }
    */
        this._setRoots(15);
    }

    _setRoots(n) {
        if (n > this.F.sqrt_s) n = this.s;
        for (let i=n; (i>=0) && (!this.roots[i]); i--) {
            let r = this.F.one;
            const nroots = 1 << i;
            const rootsi = new Array(nroots);
            for (let j=0; j<nroots; j++) {
                rootsi[j] = r;
                r = this.F.mul(r, this.w[i]);
            }
            this.roots[i] = rootsi;
        }
    }

    add(a, b) {
        const m = Math.max(a.length, b.length);
        const res = new Array(m);
        for (let i=0; i<m; i++) {
            res[i] = this.F.add(a[i] || this.F.zero, b[i] || this.F.zero);
        }
        return this.reduce(res);
    }

    double(a) {
        return this.add(a,a);
    }

    sub(a, b) {
        const m = Math.max(a.length, b.length);
        const res = new Array(m);
        for (let i=0; i<m; i++) {
            res[i] = this.F.sub(a[i] || this.F.zero, b[i] || this.F.zero);
        }
        return this.reduce(res);
    }

    mulScalar(p, b) {
        if (this.F.eq(b, this.F.zero)) return [];
        if (this.F.eq(b, this.F.one)) return p;
        const res = new Array(p.length);
        for (let i=0; i<p.length; i++) {
            res[i] = this.F.mul(p[i], b);
        }
        return res;
    }



    mul(a, b) {
        if (a.length == 0) return [];
        if (b.length == 0) return [];
        if (a.length == 1) return this.mulScalar(b, a[0]);
        if (b.length == 1) return this.mulScalar(a, b[0]);

        if (b.length > a.length) {
            [b, a] = [a, b];
        }

        if ((b.length <= 2) || (b.length < log2$2(a.length))) {
            return this.mulNormal(a,b);
        } else {
            return this.mulFFT(a,b);
        }
    }

    mulNormal(a, b) {
        let res = [];
        for (let i=0; i<b.length; i++) {
            res = this.add(res, this.scaleX(this.mulScalar(a, b[i]), i) );
        }
        return res;
    }

    mulFFT(a,b) {
        const longestN = Math.max(a.length, b.length);
        const bitsResult = log2$2(longestN-1)+2;
        this._setRoots(bitsResult);

        const m = 1 << bitsResult;
        const ea = this.extend(a,m);
        const eb = this.extend(b,m);

        const ta = __fft$1(this, ea, bitsResult, 0, 1);
        const tb = __fft$1(this, eb, bitsResult, 0, 1);

        const tres = new Array(m);

        for (let i=0; i<m; i++) {
            tres[i] = this.F.mul(ta[i], tb[i]);
        }

        const res = __fft$1(this, tres, bitsResult, 0, 1);

        const twoinvm = this.F.inv( this.F.mulScalar(this.F.one, m) );
        const resn = new Array(m);
        for (let i=0; i<m; i++) {
            resn[i] = this.F.mul(res[(m-i)%m], twoinvm);
        }

        return this.reduce(resn);
    }



    square(a) {
        return this.mul(a,a);
    }

    scaleX(p, n) {
        if (n==0) {
            return p;
        } else if (n>0) {
            const z = new Array(n).fill(this.F.zero);
            return z.concat(p);
        } else {
            if (-n >= p.length) return [];
            return p.slice(-n);
        }
    }

    eval2(p, x) {
        let v = this.F.zero;
        let ix = this.F.one;
        for (let i=0; i<p.length; i++) {
            v = this.F.add(v, this.F.mul(p[i], ix));
            ix = this.F.mul(ix, x);
        }
        return v;
    }

    eval(p,x) {
        const F = this.F;
        if (p.length == 0) return F.zero;
        const m = this._next2Power(p.length);
        const ep = this.extend(p, m);

        return _eval(ep, x, 0, 1, m);

        function _eval(p, x, offset, step, n) {
            if (n==1) return p[offset];
            const newX = F.square(x);
            const res= F.add(
                _eval(p, newX, offset, step << 1, n >> 1),
                F.mul(
                    x,
                    _eval(p, newX, offset+step , step << 1, n >> 1)));
            return res;
        }
    }

    lagrange(points) {
        let roots = [this.F.one];
        for (let i=0; i<points.length; i++) {
            roots = this.mul(roots, [this.F.neg(points[i][0]), this.F.one]);
        }

        let sum = [];
        for (let i=0; i<points.length; i++) {
            let mpol = this.ruffini(roots, points[i][0]);
            const factor =
                this.F.mul(
                    this.F.inv(this.eval(mpol, points[i][0])),
                    points[i][1]);
            mpol = this.mulScalar(mpol, factor);
            sum = this.add(sum, mpol);
        }
        return sum;
    }


    fft(p) {
        if (p.length <= 1) return p;
        const bits = log2$2(p.length-1)+1;
        this._setRoots(bits);

        const m = 1 << bits;
        const ep = this.extend(p, m);
        const res = __fft$1(this, ep, bits, 0, 1);
        return res;
    }

    fft2(p) {
        if (p.length <= 1) return p;
        const bits = log2$2(p.length-1)+1;
        this._setRoots(bits);

        const m = 1 << bits;
        const ep = this.extend(p, m);
        __bitReverse(ep, bits);
        const res = __fft2(this, ep, bits);
        return res;
    }


    ifft(p) {

        if (p.length <= 1) return p;
        const bits = log2$2(p.length-1)+1;
        this._setRoots(bits);
        const m = 1 << bits;
        const ep = this.extend(p, m);
        const res =  __fft$1(this, ep, bits, 0, 1);

        const twoinvm = this.F.inv( this.F.mulScalar(this.F.one, m) );
        const resn = new Array(m);
        for (let i=0; i<m; i++) {
            resn[i] = this.F.mul(res[(m-i)%m], twoinvm);
        }

        return resn;

    }


    ifft2(p) {

        if (p.length <= 1) return p;
        const bits = log2$2(p.length-1)+1;
        this._setRoots(bits);
        const m = 1 << bits;
        const ep = this.extend(p, m);
        __bitReverse(ep, bits);
        const res =  __fft2(this, ep, bits);

        const twoinvm = this.F.inv( this.F.mulScalar(this.F.one, m) );
        const resn = new Array(m);
        for (let i=0; i<m; i++) {
            resn[i] = this.F.mul(res[(m-i)%m], twoinvm);
        }

        return resn;

    }

    _fft(pall, bits, offset, step) {

        const n = 1 << bits;
        if (n==1) {
            return [ pall[offset] ];
        }

        const ndiv2 = n >> 1;
        const p1 = this._fft(pall, bits-1, offset, step*2);
        const p2 = this._fft(pall, bits-1, offset+step, step*2);

        const out = new Array(n);

        let m= this.F.one;
        for (let i=0; i<ndiv2; i++) {
            out[i] = this.F.add(p1[i], this.F.mul(m, p2[i]));
            out[i+ndiv2] = this.F.sub(p1[i], this.F.mul(m, p2[i]));
            m = this.F.mul(m, this.w[bits]);
        }

        return out;
    }

    extend(p, e) {
        if (e == p.length) return p;
        const z = new Array(e-p.length).fill(this.F.zero);

        return p.concat(z);
    }

    reduce(p) {
        if (p.length == 0) return p;
        if (! this.F.eq(p[p.length-1], this.F.zero) ) return p;
        let i=p.length-1;
        while( i>0 && this.F.eq(p[i], this.F.zero) ) i--;
        return p.slice(0, i+1);
    }

    eq(a, b) {
        const pa = this.reduce(a);
        const pb = this.reduce(b);

        if (pa.length != pb.length) return false;
        for (let i=0; i<pb.length; i++) {
            if (!this.F.eq(pa[i], pb[i])) return false;
        }

        return true;
    }

    ruffini(p, r) {
        const res = new Array(p.length-1);
        res[res.length-1] = p[p.length-1];
        for (let i = res.length-2; i>=0; i--) {
            res[i] = this.F.add(this.F.mul(res[i+1], r), p[i+1]);
        }
        return res;
    }

    _next2Power(v) {
        v--;
        v |= v >> 1;
        v |= v >> 2;
        v |= v >> 4;
        v |= v >> 8;
        v |= v >> 16;
        v++;
        return v;
    }

    toString(p) {
        const ap = this.normalize(p);
        let S = "";
        for (let i=ap.length-1; i>=0; i--) {
            if (!this.F.eq(p[i], this.F.zero)) {
                if (S!="") S += " + ";
                S = S + p[i].toString(10);
                if (i>0) {
                    S = S + "x";
                    if (i>1) {
                        S = S + "^" +i;
                    }
                }
            }
        }
        return S;
    }

    normalize(p) {
        const res  = new Array(p.length);
        for (let i=0; i<p.length; i++) {
            res[i] = this.F.normalize(p[i]);
        }
        return res;
    }


    _reciprocal(p, bits) {
        const k = 1 << bits;
        if (k==1) {
            return [ this.F.inv(p[0]) ];
        }
        const np = this.scaleX(p, -k/2);
        const q = this._reciprocal(np, bits-1);
        const a = this.scaleX(this.double(q), 3*k/2-2);
        const b = this.mul( this.square(q), p);

        return this.scaleX(this.sub(a,b),   -(k-2));
    }

    // divides x^m / v
    _div2(m, v) {
        const kbits = log2$2(v.length-1)+1;
        const k = 1 << kbits;

        const scaleV = k - v.length;

        // rec = x^(k - 2) / v* x^scaleV =>
        // rec = x^(k-2-scaleV)/ v
        //
        // res = x^m/v = x^(m + (2*k-2 - scaleV) - (2*k-2 - scaleV)) /v =>
        // res = rec * x^(m - (2*k-2 - scaleV)) =>
        // res = rec * x^(m - 2*k + 2 + scaleV)

        const rec = this._reciprocal(this.scaleX(v, scaleV), kbits);
        const res = this.scaleX(rec, m - 2*k + 2 + scaleV);

        return res;
    }

    div(_u, _v) {
        if (_u.length < _v.length) return [];
        const kbits = log2$2(_v.length-1)+1;
        const k = 1 << kbits;

        const u = this.scaleX(_u, k-_v.length);
        const v = this.scaleX(_v, k-_v.length);

        const n = v.length-1;
        let m = u.length-1;

        const s = this._reciprocal(v, kbits);
        let t;
        if (m>2*n) {
            t = this.sub(this.scaleX([this.F.one], 2*n), this.mul(s, v));
        }

        let q = [];
        let rem = u;
        let us, ut;
        let finish = false;

        while (!finish) {
            us = this.mul(rem, s);
            q = this.add(q, this.scaleX(us, -2*n));

            if ( m > 2*n ) {
                ut = this.mul(rem, t);
                rem = this.scaleX(ut, -2*n);
                m = rem.length-1;
            } else {
                finish = true;
            }
        }

        return q;
    }


    // returns the ith nth-root of one
    oneRoot(n, i) {
        let nbits = log2$2(n-1)+1;
        let res = this.F.one;
        let r = i;

        if(i>=n) {
            throw new Error("Given 'i' should be lower than 'n'");
        }
        else if (1<<nbits !== n) {
            throw new Error(`Internal errlr: ${n} should equal ${1<<nbits}`);
        }

        while (r>0) {
            if (r & 1 == 1) {
                res = this.F.mul(res, this.w[nbits]);
            }
            r = r >> 1;
            nbits --;
        }
        return res;
    }

    computeVanishingPolinomial(bits, t) {
        const m = 1 << bits;
        return this.F.sub(this.F.pow(t, m), this.F.one);
    }

    evaluateLagrangePolynomials(bits, t) {
        const m= 1 << bits;
        const tm = this.F.pow(t, m);
        const u= new Array(m).fill(this.F.zero);
        this._setRoots(bits);
        const omega = this.w[bits];

        if (this.F.eq(tm, this.F.one)) {
            for (let i = 0; i < m; i++) {
                if (this.F.eq(this.roots[bits][0],t)) { // i.e., t equals omega^i
                    u[i] = this.F.one;
                    return u;
                }
            }
        }

        const z = this.F.sub(tm, this.F.one);
        //        let l = this.F.mul(z,  this.F.pow(this.F.twoinv, m));
        let l = this.F.mul(z,  this.F.inv(this.F.e(m)));
        for (let i = 0; i < m; i++) {
            u[i] = this.F.mul(l, this.F.inv(this.F.sub(t,this.roots[bits][i])));
            l = this.F.mul(l, omega);
        }

        return u;
    }

    log2(V) {
        return log2$2(V);
    }
}

function log2$2( V )
{
    return( ( ( V & 0xFFFF0000 ) !== 0 ? ( V &= 0xFFFF0000, 16 ) : 0 ) | ( ( V & 0xFF00FF00 ) !== 0 ? ( V &= 0xFF00FF00, 8 ) : 0 ) | ( ( V & 0xF0F0F0F0 ) !== 0 ? ( V &= 0xF0F0F0F0, 4 ) : 0 ) | ( ( V & 0xCCCCCCCC ) !== 0 ? ( V &= 0xCCCCCCCC, 2 ) : 0 ) | ( ( V & 0xAAAAAAAA ) !== 0 ) );
}


function __fft$1(PF, pall, bits, offset, step) {

    const n = 1 << bits;
    if (n==1) {
        return [ pall[offset] ];
    } else if (n==2) {
        return [
            PF.F.add(pall[offset], pall[offset + step]),
            PF.F.sub(pall[offset], pall[offset + step])];
    }

    const ndiv2 = n >> 1;
    const p1 = __fft$1(PF, pall, bits-1, offset, step*2);
    const p2 = __fft$1(PF, pall, bits-1, offset+step, step*2);

    const out = new Array(n);

    for (let i=0; i<ndiv2; i++) {
        out[i] = PF.F.add(p1[i], PF.F.mul(PF.roots[bits][i], p2[i]));
        out[i+ndiv2] = PF.F.sub(p1[i], PF.F.mul(PF.roots[bits][i], p2[i]));
    }

    return out;
}


function __fft2(PF, pall, bits) {

    const n = 1 << bits;
    if (n==1) {
        return [ pall[0] ];
    }

    const ndiv2 = n >> 1;
    const p1 = __fft2(PF, pall.slice(0, ndiv2), bits-1);
    const p2 = __fft2(PF, pall.slice(ndiv2), bits-1);

    const out = new Array(n);

    for (let i=0; i<ndiv2; i++) {
        out[i] = PF.F.add(p1[i], PF.F.mul(PF.roots[bits][i], p2[i]));
        out[i+ndiv2] = PF.F.sub(p1[i], PF.F.mul(PF.roots[bits][i], p2[i]));
    }

    return out;
}

const _revTable$1 = [];
for (let i=0; i<256; i++) {
    _revTable$1[i] = _revSlow$1(i, 8);
}

function _revSlow$1(idx, bits) {
    let res =0;
    let a = idx;
    for (let i=0; i<bits; i++) {
        res <<= 1;
        res = res | (a &1);
        a >>=1;
    }
    return res;
}

function rev(idx, bits) {
    return (
        _revTable$1[idx >>> 24] |
        (_revTable$1[(idx >>> 16) & 0xFF] << 8) |
        (_revTable$1[(idx >>> 8) & 0xFF] << 16) |
        (_revTable$1[idx & 0xFF] << 24)
    ) >>> (32-bits);
}

function __bitReverse(p, bits) {
    for (let k=0; k<p.length; k++) {
        const r = rev(k, bits);
        if (r>k) {
            const tmp= p[k];
            p[k] = p[r];
            p[r] = tmp;
        }
    }

}

/*
    Copyright 2018 0kims association.

    This file is part of snarkjs.

    snarkjs is a free software: you can redistribute it and/or
    modify it under the terms of the GNU General Public License as published by the
    Free Software Foundation, either version 3 of the License, or (at your option)
    any later version.

    snarkjs is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY
    or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for
    more details.

    You should have received a copy of the GNU General Public License along with
    snarkjs. If not, see <https://www.gnu.org/licenses/>.
*/



function mulScalar(F, base, e) {
    let res;

    if (isZero(e)) return F.zero;

    const n = naf(e);

    if (n[n.length-1] == 1) {
        res = base;
    } else if (n[n.length-1] == -1) {
        res = F.neg(base);
    } else {
        throw new Error("invlaud NAF");
    }

    for (let i=n.length-2; i>=0; i--) {

        res = F.double(res);

        if (n[i] == 1) {
            res = F.add(res, base);
        } else if (n[i] == -1) {
            res = F.sub(res, base);
        }
    }

    return res;
}


/*
exports.mulScalar = (F, base, e) =>{
    let res = F.zero;
    let rem = bigInt(e);
    let exp = base;

    while (! rem.eq(bigInt.zero)) {
        if (rem.and(bigInt.one).eq(bigInt.one)) {
            res = F.add(res, exp);
        }
        exp = F.double(exp);
        rem = rem.shiftRight(1);
    }

    return res;
};
*/


function exp(F, base, e) {

    if (isZero(e)) return F.one;

    const n = bits(e);

    if (n.length==0) return F.one;

    let res = base;

    for (let i=n.length-2; i>=0; i--) {

        res = F.square(res);

        if (n[i]) {
            res = F.mul(res, base);
        }
    }

    return res;
}

// Check here: https://eprint.iacr.org/2012/685.pdf

function buildSqrt (F) {
    if ((F.m % 2) == 1) {
        if (eq(mod(F.p, 4), 1 )) {
            if (eq(mod(F.p, 8), 1 )) {
                if (eq(mod(F.p, 16), 1 )) {
                    // alg7_muller(F);
                    alg5_tonelliShanks(F);
                } else if (eq(mod(F.p, 16), 9 )) {
                    alg4_kong(F);
                } else {
                    throw new Error("Field withot sqrt");
                }
            } else if (eq(mod(F.p, 8), 5 )) {
                alg3_atkin(F);
            } else {
                throw new Error("Field withot sqrt");
            }
        } else if (eq(mod(F.p, 4), 3 )) {
            alg2_shanks(F);
        }
    } else {
        const pm2mod4 = mod(pow(F.p, F.m/2), 4);
        if (pm2mod4 == 1) {
            alg10_adj(F);
        } else if (pm2mod4 == 3) {
            alg9_adj(F);
        } else {
            alg8_complex(F);
        }

    }
}


function alg5_tonelliShanks(F) {
    F.sqrt_q = pow(F.p, F.m);

    F.sqrt_s = 0;
    F.sqrt_t = sub(F.sqrt_q, 1);

    while (!isOdd(F.sqrt_t)) {
        F.sqrt_s = F.sqrt_s + 1;
        F.sqrt_t = div(F.sqrt_t, 2);
    }

    let c0 = F.one;

    while (F.eq(c0, F.one)) {
        const c = F.random();
        F.sqrt_z = F.pow(c, F.sqrt_t);
        c0 = F.pow(F.sqrt_z, 2 ** (F.sqrt_s-1) );
    }

    F.sqrt_tm1d2 = div(sub(F.sqrt_t, 1),2);

    F.sqrt = function(a) {
        const F=this;
        if (F.isZero(a)) return F.zero;
        let w = F.pow(a, F.sqrt_tm1d2);
        const a0 = F.pow( F.mul(F.square(w), a), 2 ** (F.sqrt_s-1) );
        if (F.eq(a0, F.negone)) return null;

        let v = F.sqrt_s;
        let x = F.mul(a, w);
        let b = F.mul(x, w);
        let z = F.sqrt_z;
        while (!F.eq(b, F.one)) {
            let b2k = F.square(b);
            let k=1;
            while (!F.eq(b2k, F.one)) {
                b2k = F.square(b2k);
                k++;
            }

            w = z;
            for (let i=0; i<v-k-1; i++) {
                w = F.square(w);
            }
            z = F.square(w);
            b = F.mul(b, z);
            x = F.mul(x, w);
            v = k;
        }
        return F.geq(x, F.zero) ? x : F.neg(x);
    };
}

function alg4_kong(F) {
    F.sqrt = function() {
        throw new Error("Sqrt alg 4 not implemented");
    };
}

function alg3_atkin(F) {
    F.sqrt = function() {
        throw new Error("Sqrt alg 3 not implemented");
    };
}

function alg2_shanks(F) {

    F.sqrt_q = pow(F.p, F.m);
    F.sqrt_e1 = div( sub(F.sqrt_q, 3) , 4);

    F.sqrt = function(a) {
        if (this.isZero(a)) return this.zero;

        // Test that have solution
        const a1 = this.pow(a, this.sqrt_e1);

        const a0 = this.mul(this.square(a1), a);

        if ( this.eq(a0, this.negone) ) return null;

        const x = this.mul(a1, a);

        return F.geq(x, F.zero) ? x : F.neg(x);
    };
}

function alg10_adj(F) {
    F.sqrt = function() {
        throw new Error("Sqrt alg 10 not implemented");
    };
}

function alg9_adj(F) {
    F.sqrt_q = pow(F.p, F.m/2);
    F.sqrt_e34 = div( sub(F.sqrt_q, 3) , 4);
    F.sqrt_e12 = div( sub(F.sqrt_q, 1) , 2);

    F.frobenius = function(n, x) {
        if ((n%2) == 1) {
            return F.conjugate(x);
        } else {
            return x;
        }
    };

    F.sqrt = function(a) {
        const F = this;
        const a1 = F.pow(a, F.sqrt_e34);
        const alfa = F.mul(F.square(a1), a);
        const a0 = F.mul(F.frobenius(1, alfa), alfa);
        if (F.eq(a0, F.negone)) return null;
        const x0 = F.mul(a1, a);
        let x;
        if (F.eq(alfa, F.negone)) {
            x = F.mul(x0, [F.F.zero, F.F.one]);
        } else {
            const b = F.pow(F.add(F.one, alfa), F.sqrt_e12);
            x = F.mul(b, x0);
        }
        return F.geq(x, F.zero) ? x : F.neg(x);
    };
}


function alg8_complex(F) {
    F.sqrt = function() {
        throw new Error("Sqrt alg 8 not implemented");
    };
}

function quarterRound(st, a, b, c, d) {

    st[a] = (st[a] + st[b]) >>> 0;
    st[d] = (st[d] ^ st[a]) >>> 0;
    st[d] = ((st[d] << 16) | ((st[d]>>>16) & 0xFFFF)) >>> 0;

    st[c] = (st[c] + st[d]) >>> 0;
    st[b] = (st[b] ^ st[c]) >>> 0;
    st[b] = ((st[b] << 12) | ((st[b]>>>20) & 0xFFF)) >>> 0;

    st[a] = (st[a] + st[b]) >>> 0;
    st[d] = (st[d] ^ st[a]) >>> 0;
    st[d] = ((st[d] << 8) | ((st[d]>>>24) & 0xFF)) >>> 0;

    st[c] = (st[c] + st[d]) >>> 0;
    st[b] = (st[b] ^ st[c]) >>> 0;
    st[b] = ((st[b] << 7) | ((st[b]>>>25) & 0x7F)) >>> 0;
}

function doubleRound(st) {
    quarterRound(st, 0, 4, 8,12);
    quarterRound(st, 1, 5, 9,13);
    quarterRound(st, 2, 6,10,14);
    quarterRound(st, 3, 7,11,15);

    quarterRound(st, 0, 5,10,15);
    quarterRound(st, 1, 6,11,12);
    quarterRound(st, 2, 7, 8,13);
    quarterRound(st, 3, 4, 9,14);
}

class ChaCha {

    constructor(seed) {
        seed = seed || [0,0,0,0,0,0,0,0];
        this.state = [
            0x61707865,
            0x3320646E,
            0x79622D32,
            0x6B206574,
            seed[0],
            seed[1],
            seed[2],
            seed[3],
            seed[4],
            seed[5],
            seed[6],
            seed[7],
            0,
            0,
            0,
            0
        ];
        this.idx = 16;
        this.buff = new Array(16);
    }

    nextU32() {
        if (this.idx == 16) this.update();
        return this.buff[this.idx++];
    }

    nextU64() {
        return add(mul(this.nextU32(), 0x100000000), this.nextU32());
    }

    nextBool() {
        return (this.nextU32() & 1) == 1;
    }

    update() {
        // Copy the state
        for (let i=0; i<16; i++) this.buff[i] = this.state[i];

        // Apply the rounds
        for (let i=0; i<10; i++) doubleRound(this.buff);

        // Add to the initial
        for (let i=0; i<16; i++) this.buff[i] = (this.buff[i] + this.state[i]) >>> 0;

        this.idx = 0;

        this.state[12] = (this.state[12] + 1) >>> 0;
        if (this.state[12] != 0) return;
        this.state[13] = (this.state[13] + 1) >>> 0;
        if (this.state[13] != 0) return;
        this.state[14] = (this.state[14] + 1) >>> 0;
        if (this.state[14] != 0) return;
        this.state[15] = (this.state[15] + 1) >>> 0;
    }
}

function getRandomBytes(n) {
    let array = new Uint8Array(n);
    if (process.browser) { // Browser
        if (typeof globalThis.crypto !== "undefined") { // Supported
            globalThis.crypto.getRandomValues(array);
        } else { // fallback
            for (let i=0; i<n; i++) {
                array[i] = (Math.random()*4294967296)>>>0;
            }
        }
    }
    else { // NodeJS
        crypto.randomFillSync(array);
    }
    return array;
}

function getRandomSeed() {
    const arr = getRandomBytes(32);
    const arrV = new Uint32Array(arr.buffer);
    const seed = [];
    for (let i=0; i<8; i++) {
        seed.push(arrV[i]);
    }
    return seed;
}

let threadRng = null;

function getThreadRng() {
    if (threadRng) return threadRng;
    threadRng = new ChaCha(getRandomSeed());
    return threadRng;
}

/*
    Copyright 2018 0kims association.

    This file is part of snarkjs.

    snarkjs is a free software: you can redistribute it and/or
    modify it under the terms of the GNU General Public License as published by the
    Free Software Foundation, either version 3 of the License, or (at your option)
    any later version.

    snarkjs is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY
    or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for
    more details.

    You should have received a copy of the GNU General Public License along with
    snarkjs. If not, see <https://www.gnu.org/licenses/>.
*/

/*
    This library does operations on polynomials with coefficients in a field F.

    A polynomial P(x) = p0 + p1 * x + p2 * x^2 + ... + pn * x^n  is represented
    by the array [ p0, p1, p2, ... , pn ].
 */

class FFT {
    constructor (G, F, opMulGF) {
        this.F = F;
        this.G = G;
        this.opMulGF = opMulGF;

        let rem = F.sqrt_t || F.t;
        let s = F.sqrt_s || F.s;

        let nqr = F.one;
        while (F.eq(F.pow(nqr, F.half), F.one)) nqr = F.add(nqr, F.one);

        this.w = new Array(s+1);
        this.wi = new Array(s+1);
        this.w[s] = this.F.pow(nqr, rem);
        this.wi[s] = this.F.inv(this.w[s]);

        let n=s-1;
        while (n>=0) {
            this.w[n] = this.F.square(this.w[n+1]);
            this.wi[n] = this.F.square(this.wi[n+1]);
            n--;
        }


        this.roots = [];
        /*
        for (let i=0; i<16; i++) {
            let r = this.F.one;
            n = 1 << i;
            const rootsi = new Array(n);
            for (let j=0; j<n; j++) {
                rootsi[j] = r;
                r = this.F.mul(r, this.w[i]);
            }

            this.roots.push(rootsi);
        }
        */
        this._setRoots(Math.min(s, 15));
    }

    _setRoots(n) {
        for (let i=n; (i>=0) && (!this.roots[i]); i--) {
            let r = this.F.one;
            const nroots = 1 << i;
            const rootsi = new Array(nroots);
            for (let j=0; j<nroots; j++) {
                rootsi[j] = r;
                r = this.F.mul(r, this.w[i]);
            }

            this.roots[i] = rootsi;
        }
    }

    fft(p) {
        if (p.length <= 1) return p;
        const bits = log2$1(p.length-1)+1;
        this._setRoots(bits);

        const m = 1 << bits;
        if (p.length != m) {
            throw new Error("Size must be multiple of 2");
        }
        const res = __fft(this, p, bits, 0, 1);
        return res;
    }

    ifft(p) {

        if (p.length <= 1) return p;
        const bits = log2$1(p.length-1)+1;
        this._setRoots(bits);
        const m = 1 << bits;
        if (p.length != m) {
            throw new Error("Size must be multiple of 2");
        }
        const res =  __fft(this, p, bits, 0, 1);
        const twoinvm = this.F.inv( this.F.mulScalar(this.F.one, m) );
        const resn = new Array(m);
        for (let i=0; i<m; i++) {
            resn[i] = this.opMulGF(res[(m-i)%m], twoinvm);
        }

        return resn;
    }


}

function log2$1( V )
{
    return( ( ( V & 0xFFFF0000 ) !== 0 ? ( V &= 0xFFFF0000, 16 ) : 0 ) | ( ( V & 0xFF00FF00 ) !== 0 ? ( V &= 0xFF00FF00, 8 ) : 0 ) | ( ( V & 0xF0F0F0F0 ) !== 0 ? ( V &= 0xF0F0F0F0, 4 ) : 0 ) | ( ( V & 0xCCCCCCCC ) !== 0 ? ( V &= 0xCCCCCCCC, 2 ) : 0 ) | ( ( V & 0xAAAAAAAA ) !== 0 ) );
}


function __fft(PF, pall, bits, offset, step) {

    const n = 1 << bits;
    if (n==1) {
        return [ pall[offset] ];
    } else if (n==2) {
        return [
            PF.G.add(pall[offset], pall[offset + step]),
            PF.G.sub(pall[offset], pall[offset + step])];
    }

    const ndiv2 = n >> 1;
    const p1 = __fft(PF, pall, bits-1, offset, step*2);
    const p2 = __fft(PF, pall, bits-1, offset+step, step*2);

    const out = new Array(n);

    for (let i=0; i<ndiv2; i++) {
        out[i] = PF.G.add(p1[i], PF.opMulGF(p2[i], PF.roots[bits][i]));
        out[i+ndiv2] = PF.G.sub(p1[i], PF.opMulGF(p2[i], PF.roots[bits][i]));
    }

    return out;
}

/* global BigInt */

class ZqField {
    constructor(p) {
        this.type="F1";
        this.one = BigInt(1);
        this.zero = BigInt(0);
        this.p = BigInt(p);
        this.m = 1;
        this.negone = this.p-this.one;
        this.two = BigInt(2);
        this.half = this.p >> this.one;
        this.bitLength = bitLength(this.p);
        this.mask = (this.one << BigInt(this.bitLength)) - this.one;

        this.n64 = Math.floor((this.bitLength - 1) / 64)+1;
        this.n32 = this.n64*2;
        this.n8 = this.n64*8;
        this.R = this.e(this.one << BigInt(this.n64*64));
        this.Ri = this.inv(this.R);

        const e = this.negone >> this.one;
        this.nqr = this.two;
        let r = this.pow(this.nqr, e);
        while (!this.eq(r, this.negone)) {
            this.nqr = this.nqr + this.one;
            r = this.pow(this.nqr, e);
        }


        this.s = 0;
        this.t = this.negone;

        while ((this.t & this.one) == this.zero) {
            this.s = this.s + 1;
            this.t = this.t >> this.one;
        }

        this.nqr_to_t = this.pow(this.nqr, this.t);

        buildSqrt(this);

        this.FFT = new FFT(this, this, this.mul.bind(this));

        this.fft = this.FFT.fft.bind(this.FFT);
        this.ifft = this.FFT.ifft.bind(this.FFT);
        this.w = this.FFT.w;
        this.wi = this.FFT.wi; 
    
        this.shift = this.square(this.nqr);
        this.k = this.exp(this.nqr, 2**this.s);
    }

    e(a,b) {
        let res;
        if (!b) {
            res = BigInt(a);
        } else if (b==16) {
            res = BigInt("0x"+a);
        }
        if (res < 0) {
            let nres = -res;
            if (nres >= this.p) nres = nres % this.p;
            return this.p - nres;
        } else {
            return (res>= this.p) ? res%this.p : res;
        }

    }

    add(a, b) {
        const res = a + b;
        return res >= this.p ? res-this.p : res;
    }

    sub(a, b) {
        return (a >= b) ? a-b : this.p-b+a;
    }

    neg(a) {
        return a ? this.p-a : a;
    }

    mul(a, b) {
        return (a*b)%this.p;
    }

    mulScalar(base, s) {
        return (base * this.e(s)) % this.p;
    }

    square(a) {
        return (a*a) % this.p;
    }

    eq(a, b) {
        return a==b;
    }

    neq(a, b) {
        return a!=b;
    }

    lt(a, b) {
        const aa = (a > this.half) ? a - this.p : a;
        const bb = (b > this.half) ? b - this.p : b;
        return aa < bb;
    }

    gt(a, b) {
        const aa = (a > this.half) ? a - this.p : a;
        const bb = (b > this.half) ? b - this.p : b;
        return aa > bb;
    }

    leq(a, b) {
        const aa = (a > this.half) ? a - this.p : a;
        const bb = (b > this.half) ? b - this.p : b;
        return aa <= bb;
    }

    geq(a, b) {
        const aa = (a > this.half) ? a - this.p : a;
        const bb = (b > this.half) ? b - this.p : b;
        return aa >= bb;
    }

    div(a, b) {
        return this.mul(a, this.inv(b));
    }

    idiv(a, b) {
        if (!b) throw new Error("Division by zero");
        return a / b;
    }

    inv(a) {
        if (!a) throw new Error("Division by zero");

        let t = this.zero;
        let r = this.p;
        let newt = this.one;
        let newr = a % this.p;
        while (newr) {
            let q = r/newr;
            [t, newt] = [newt, t-q*newt];
            [r, newr] = [newr, r-q*newr];
        }
        if (t<this.zero) t += this.p;
        return t;
    }

    mod(a, b) {
        return a % b;
    }

    pow(b, e) {
        return exp(this, b, e);
    }

    exp(b, e) {
        return exp(this, b, e);
    }

    band(a, b) {
        const res =  ((a & b) & this.mask);
        return res >= this.p ? res-this.p : res;
    }

    bor(a, b) {
        const res =  ((a | b) & this.mask);
        return res >= this.p ? res-this.p : res;
    }

    bxor(a, b) {
        const res =  ((a ^ b) & this.mask);
        return res >= this.p ? res-this.p : res;
    }

    bnot(a) {
        const res = a ^ this.mask;
        return res >= this.p ? res-this.p : res;
    }

    shl(a, b) {
        if (Number(b) < this.bitLength) {
            const res = (a << b) & this.mask;
            return res >= this.p ? res-this.p : res;
        } else {
            const nb = this.p - b;
            if (Number(nb) < this.bitLength) {
                return a >> nb;
            } else {
                return this.zero;
            }
        }
    }

    shr(a, b) {
        if (Number(b) < this.bitLength) {
            return a >> b;
        } else {
            const nb = this.p - b;
            if (Number(nb) < this.bitLength) {
                const res = (a << nb) & this.mask;
                return res >= this.p ? res-this.p : res;
            } else {
                return 0;
            }
        }
    }

    land(a, b) {
        return (a && b) ? this.one : this.zero;
    }

    lor(a, b) {
        return (a || b) ? this.one : this.zero;
    }

    lnot(a) {
        return (a) ? this.zero : this.one;
    }

    sqrt_old(n) {

        if (n == this.zero) return this.zero;

        // Test that have solution
        const res = this.pow(n, this.negone >> this.one);
        if ( res != this.one ) return null;

        let m = this.s;
        let c = this.nqr_to_t;
        let t = this.pow(n, this.t);
        let r = this.pow(n, this.add(this.t, this.one) >> this.one );

        while ( t != this.one ) {
            let sq = this.square(t);
            let i = 1;
            while (sq != this.one ) {
                i++;
                sq = this.square(sq);
            }

            // b = c ^ m-i-1
            let b = c;
            for (let j=0; j< m-i-1; j ++) b = this.square(b);

            m = i;
            c = this.square(b);
            t = this.mul(t, c);
            r = this.mul(r, b);
        }

        if (r > (this.p >> this.one)) {
            r = this.neg(r);
        }

        return r;
    }

    normalize(a, b) {
        a = BigInt(a,b);
        if (a < 0) {
            let na = -a;
            if (na >= this.p) na = na % this.p;
            return this.p - na;
        } else {
            return (a>= this.p) ? a%this.p : a;
        }
    }

    random() {
        const nBytes = (this.bitLength*2 / 8);
        let res =this.zero;
        for (let i=0; i<nBytes; i++) {
            res = (res << BigInt(8)) + BigInt(getRandomBytes(1)[0]);
        }
        return res % this.p;
    }

    toString(a, base) {
        base = base || 10;
        let vs;
        if ((a > this.half)&&(base == 10)) {
            const v = this.p-a;
            vs = "-"+v.toString(base);
        } else {
            vs = a.toString(base);
        }
        return vs;
    }

    isZero(a) {
        return a == this.zero;
    }

    fromRng(rng) {
        let v;
        do {
            v=this.zero;
            for (let i=0; i<this.n64; i++) {
                v += rng.nextU64() << BigInt(64 *i);
            }
            v &= this.mask;
        } while (v >= this.p);
        v = (v * this.Ri) % this.p;   // Convert from montgomery
        return v;
    }

    fft(a) {
        return this.FFT.fft(a);
    }

    ifft(a) {
        return this.FFT.ifft(a);
    }

    // Returns a buffer with Little Endian Representation
    toRprLE(buff, o, e) {
        toRprLE(buff, o, e, this.n64*8);
    }

    // Returns a buffer with Big Endian Representation
    toRprBE(buff, o, e) {
        toRprBE(buff, o, e, this.n64*8);
    }

    // Returns a buffer with Big Endian Montgomery Representation
    toRprBEM(buff, o, e) {
        return this.toRprBE(buff, o, this.mul(this.R, e));
    }

    toRprLEM(buff, o, e) {
        return this.toRprLE(buff, o, this.mul(this.R, e));
    }


    // Pases a buffer with Little Endian Representation
    fromRprLE(buff, o) {
        return fromRprLE(buff, o, this.n8);
    }

    // Pases a buffer with Big Endian Representation
    fromRprBE(buff, o) {
        return fromRprBE(buff, o, this.n8);
    }

    fromRprLEM(buff, o) {
        return this.mul(this.fromRprLE(buff, o), this.Ri);
    }

    fromRprBEM(buff, o) {
        return this.mul(this.fromRprBE(buff, o), this.Ri);
    }

    toObject(a) {
        return a;
    }
}

/*
    Copyright 2018 0kims association.

    This file is part of snarkjs.

    snarkjs is a free software: you can redistribute it and/or
    modify it under the terms of the GNU General Public License as published by the
    Free Software Foundation, either version 3 of the License, or (at your option)
    any later version.

    snarkjs is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY
    or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for
    more details.

    You should have received a copy of the GNU General Public License along with
    snarkjs. If not, see <https://www.gnu.org/licenses/>.
*/


class F2Field {
    constructor(F, nonResidue) {
        this.type="F2";
        this.F = F;
        this.zero = [this.F.zero, this.F.zero];
        this.one = [this.F.one, this.F.zero];
        this.negone = this.neg(this.one);
        this.nonResidue = nonResidue;
        this.m = F.m*2;
        this.p = F.p;
        this.n64 = F.n64*2;
        this.n32 = this.n64*2;
        this.n8 = this.n64*8;

        buildSqrt(this);
    }

    _mulByNonResidue(a) {
        return this.F.mul(this.nonResidue, a);
    }

    copy(a) {
        return [this.F.copy(a[0]), this.F.copy(a[1])];
    }

    add(a, b) {
        return [
            this.F.add(a[0], b[0]),
            this.F.add(a[1], b[1])
        ];
    }

    double(a) {
        return this.add(a,a);
    }

    sub(a, b) {
        return [
            this.F.sub(a[0], b[0]),
            this.F.sub(a[1], b[1])
        ];
    }

    neg(a) {
        return this.sub(this.zero, a);
    }

    conjugate(a) {
        return [
            a[0],
            this.F.neg(a[1])
        ];
    }

    mul(a, b) {
        const aA = this.F.mul(a[0] , b[0]);
        const bB = this.F.mul(a[1] , b[1]);

        return [
            this.F.add( aA , this._mulByNonResidue(bB)),
            this.F.sub(
                this.F.mul(
                    this.F.add(a[0], a[1]),
                    this.F.add(b[0], b[1])),
                this.F.add(aA, bB))];
    }

    inv(a) {
        const t0 = this.F.square(a[0]);
        const t1 = this.F.square(a[1]);
        const t2 = this.F.sub(t0, this._mulByNonResidue(t1));
        const t3 = this.F.inv(t2);
        return [
            this.F.mul(a[0], t3),
            this.F.neg(this.F.mul( a[1], t3)) ];
    }

    div(a, b) {
        return this.mul(a, this.inv(b));
    }

    square(a) {
        const ab = this.F.mul(a[0] , a[1]);

        /*
        [
            (a + b) * (a + non_residue * b) - ab - non_residue * ab,
            ab + ab
        ];
        */

        return [
            this.F.sub(
                this.F.mul(
                    this.F.add(a[0], a[1]) ,
                    this.F.add(
                        a[0] ,
                        this._mulByNonResidue(a[1]))),
                this.F.add(
                    ab,
                    this._mulByNonResidue(ab))),
            this.F.add(ab, ab)
        ];
    }

    isZero(a) {
        return this.F.isZero(a[0]) && this.F.isZero(a[1]);
    }

    eq(a, b) {
        return this.F.eq(a[0], b[0]) && this.F.eq(a[1], b[1]);
    }

    mulScalar(base, e) {
        return mulScalar(this, base, e);
    }

    pow(base, e) {
        return exp(this, base, e);
    }

    exp(base, e) {
        return exp(this, base, e);
    }

    toString(a) {
        return `[ ${this.F.toString(a[0])} , ${this.F.toString(a[1])} ]`;
    }

    fromRng(rng) {
        const c0 = this.F.fromRng(rng);
        const c1 = this.F.fromRng(rng);
        return [c0, c1];
    }

    gt(a, b) {
        if (this.F.gt(a[0], b[0])) return true;
        if (this.F.gt(b[0], a[0])) return false;
        if (this.F.gt(a[1], b[1])) return true;
        return false;
    }

    geq(a, b) {
        return this.gt(a, b) || this.eq(a, b);
    }

    lt(a, b) {
        return !this.geq(a,b);
    }

    leq(a, b) {
        return !this.gt(a,b);
    }

    neq(a, b) {
        return !this.eq(a,b);
    }

    random() {
        return [this.F.random(), this.F.random()];
    }


    toRprLE(buff, o, e) {
        this.F.toRprLE(buff, o, e[0]);
        this.F.toRprLE(buff, o+this.F.n8, e[1]);
    }

    toRprBE(buff, o, e) {
        this.F.toRprBE(buff, o, e[1]);
        this.F.toRprBE(buff, o+this.F.n8, e[0]);
    }

    toRprLEM(buff, o, e) {
        this.F.toRprLEM(buff, o, e[0]);
        this.F.toRprLEM(buff, o+this.F.n8, e[1]);
    }


    toRprBEM(buff, o, e) {
        this.F.toRprBEM(buff, o, e[1]);
        this.F.toRprBEM(buff, o+this.F.n8, e[0]);
    }

    fromRprLE(buff, o) {
        o = o || 0;
        const c0 = this.F.fromRprLE(buff, o);
        const c1 = this.F.fromRprLE(buff, o+this.F.n8);
        return [c0, c1];
    }

    fromRprBE(buff, o) {
        o = o || 0;
        const c1 = this.F.fromRprBE(buff, o);
        const c0 = this.F.fromRprBE(buff, o+this.F.n8);
        return [c0, c1];
    }

    fromRprLEM(buff, o) {
        o = o || 0;
        const c0 = this.F.fromRprLEM(buff, o);
        const c1 = this.F.fromRprLEM(buff, o+this.F.n8);
        return [c0, c1];
    }

    fromRprBEM(buff, o) {
        o = o || 0;
        const c1 = this.F.fromRprBEM(buff, o);
        const c0 = this.F.fromRprBEM(buff, o+this.F.n8);
        return [c0, c1];
    }

    toObject(a) {
        return a;
    }

}

/*
    Copyright 2018 0kims association.

    This file is part of snarkjs.

    snarkjs is a free software: you can redistribute it and/or
    modify it under the terms of the GNU General Public License as published by the
    Free Software Foundation, either version 3 of the License, or (at your option)
    any later version.

    snarkjs is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY
    or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for
    more details.

    You should have received a copy of the GNU General Public License along with
    snarkjs. If not, see <https://www.gnu.org/licenses/>.
*/


class F3Field {
    constructor(F, nonResidue) {
        this.type="F3";
        this.F = F;
        this.zero = [this.F.zero, this.F.zero, this.F.zero];
        this.one = [this.F.one, this.F.zero, this.F.zero];
        this.negone = this.neg(this.one);
        this.nonResidue = nonResidue;
        this.m = F.m*3;
        this.p = F.p;
        this.n64 = F.n64*3;
        this.n32 = this.n64*2;
        this.n8 = this.n64*8;
    }

    _mulByNonResidue(a) {
        return this.F.mul(this.nonResidue, a);
    }

    copy(a) {
        return [this.F.copy(a[0]), this.F.copy(a[1]), this.F.copy(a[2])];
    }

    add(a, b) {
        return [
            this.F.add(a[0], b[0]),
            this.F.add(a[1], b[1]),
            this.F.add(a[2], b[2])
        ];
    }

    double(a) {
        return this.add(a,a);
    }

    sub(a, b) {
        return [
            this.F.sub(a[0], b[0]),
            this.F.sub(a[1], b[1]),
            this.F.sub(a[2], b[2])
        ];
    }

    neg(a) {
        return this.sub(this.zero, a);
    }

    mul(a, b) {

        const aA = this.F.mul(a[0] , b[0]);
        const bB = this.F.mul(a[1] , b[1]);
        const cC = this.F.mul(a[2] , b[2]);

        return [
            this.F.add(
                aA,
                this._mulByNonResidue(
                    this.F.sub(
                        this.F.mul(
                            this.F.add(a[1], a[2]),
                            this.F.add(b[1], b[2])),
                        this.F.add(bB, cC)))),    // aA + non_residue*((b+c)*(B+C)-bB-cC),

            this.F.add(
                this.F.sub(
                    this.F.mul(
                        this.F.add(a[0], a[1]),
                        this.F.add(b[0], b[1])),
                    this.F.add(aA, bB)),
                this._mulByNonResidue( cC)),   // (a+b)*(A+B)-aA-bB+non_residue*cC

            this.F.add(
                this.F.sub(
                    this.F.mul(
                        this.F.add(a[0], a[2]),
                        this.F.add(b[0], b[2])),
                    this.F.add(aA, cC)),
                bB)];                           // (a+c)*(A+C)-aA+bB-cC)
    }

    inv(a) {
        const t0 = this.F.square(a[0]);             // t0 = a^2 ;
        const t1 = this.F.square(a[1]);             // t1 = b^2 ;
        const t2 = this.F.square(a[2]);             // t2 = c^2;
        const t3 = this.F.mul(a[0],a[1]);           // t3 = ab
        const t4 = this.F.mul(a[0],a[2]);           // t4 = ac
        const t5 = this.F.mul(a[1],a[2]);           // t5 = bc;
        // c0 = t0 - non_residue * t5;
        const c0 = this.F.sub(t0, this._mulByNonResidue(t5));
        // c1 = non_residue * t2 - t3;
        const c1 = this.F.sub(this._mulByNonResidue(t2), t3);
        const c2 = this.F.sub(t1, t4);              // c2 = t1-t4

        // t6 = (a * c0 + non_residue * (c * c1 + b * c2)).inv();
        const t6 =
            this.F.inv(
                this.F.add(
                    this.F.mul(a[0], c0),
                    this._mulByNonResidue(
                        this.F.add(
                            this.F.mul(a[2], c1),
                            this.F.mul(a[1], c2)))));

        return [
            this.F.mul(t6, c0),         // t6*c0
            this.F.mul(t6, c1),         // t6*c1
            this.F.mul(t6, c2)];        // t6*c2
    }

    div(a, b) {
        return this.mul(a, this.inv(b));
    }

    square(a) {
        const s0 = this.F.square(a[0]);                   // s0 = a^2
        const ab = this.F.mul(a[0], a[1]);                // ab = a*b
        const s1 = this.F.add(ab, ab);                    // s1 = 2ab;
        const s2 = this.F.square(
            this.F.add(this.F.sub(a[0],a[1]), a[2]));     // s2 = (a - b + c)^2;
        const bc = this.F.mul(a[1],a[2]);                 // bc = b*c
        const s3 = this.F.add(bc, bc);                    // s3 = 2*bc
        const s4 = this.F.square(a[2]);                   // s4 = c^2


        return [
            this.F.add(
                s0,
                this._mulByNonResidue(s3)),           // s0 + non_residue * s3,
            this.F.add(
                s1,
                this._mulByNonResidue(s4)),           // s1 + non_residue * s4,
            this.F.sub(
                this.F.add( this.F.add(s1, s2) , s3 ),
                this.F.add(s0, s4))];                      // s1 + s2 + s3 - s0 - s4
    }

    isZero(a) {
        return this.F.isZero(a[0]) && this.F.isZero(a[1]) && this.F.isZero(a[2]);
    }

    eq(a, b) {
        return this.F.eq(a[0], b[0]) && this.F.eq(a[1], b[1]) && this.F.eq(a[2], b[2]);
    }

    affine(a) {
        return [this.F.affine(a[0]), this.F.affine(a[1]), this.F.affine(a[2])];
    }

    mulScalar(base, e) {
        return mulScalar(this, base, e);
    }

    pow(base, e) {
        return exp(this, base, e);
    }

    exp(base, e) {
        return exp(this, base, e);
    }

    toString(a) {
        return `[ ${this.F.toString(a[0])} , ${this.F.toString(a[1])}, ${this.F.toString(a[2])} ]`;
    }

    fromRng(rng) {
        const c0 = this.F.fromRng(rng);
        const c1 = this.F.fromRng(rng);
        const c2 = this.F.fromRng(rng);
        return [c0, c1, c2];
    }

    gt(a, b) {
        if (this.F.gt(a[0], b[0])) return true;
        if (this.F.gt(b[0], a[0])) return false;
        if (this.F.gt(a[1], b[1])) return true;
        if (this.F.gt(b[1], a[1])) return false;
        if (this.F.gt(a[2], b[2])) return true;
        return false;
    }


    geq(a, b) {
        return this.gt(a, b) || this.eq(a, b);
    }

    lt(a, b) {
        return !this.geq(a,b);
    }

    leq(a, b) {
        return !this.gt(a,b);
    }

    neq(a, b) {
        return !this.eq(a,b);
    }

    random() {
        return [this.F.random(), this.F.random(), this.F.random()];
    }


    toRprLE(buff, o, e) {
        this.F.toRprLE(buff, o, e[0]);
        this.F.toRprLE(buff, o+this.F.n8, e[1]);
        this.F.toRprLE(buff, o+this.F.n8*2, e[2]);
    }

    toRprBE(buff, o, e) {
        this.F.toRprBE(buff, o, e[2]);
        this.F.toRprBE(buff, o+this.F.n8, e[1]);
        this.F.toRprBE(buff, o+this.F.n8*2, e[0]);
    }

    toRprLEM(buff, o, e) {
        this.F.toRprLEM(buff, o, e[0]);
        this.F.toRprLEM(buff, o+this.F.n8, e[1]);
        this.F.toRprLEM(buff, o+this.F.n8*2, e[2]);
    }


    toRprBEM(buff, o, e) {
        this.F.toRprBEM(buff, o, e[2]);
        this.F.toRprBEM(buff, o+this.F.n8, e[1]);
        this.F.toRprBEM(buff, o+this.F.n8*2, e[0]);
    }

    fromRprLE(buff, o) {
        o = o || 0;
        const c0 = this.F.fromRprLE(buff, o);
        const c1 = this.F.fromRprLE(buff, o+this.n8);
        const c2 = this.F.fromRprLE(buff, o+this.n8*2);
        return [c0, c1, c2];
    }

    fromRprBE(buff, o) {
        o = o || 0;
        const c2 = this.F.fromRprBE(buff, o);
        const c1 = this.F.fromRprBE(buff, o+this.n8);
        const c0 = this.F.fromRprBE(buff, o+this.n8*2);
        return [c0, c1, c2];
    }

    fromRprLEM(buff, o) {
        o = o || 0;
        const c0 = this.F.fromRprLEM(buff, o);
        const c1 = this.F.fromRprLEM(buff, o+this.n8);
        const c2 = this.F.fromRprLEM(buff, o+this.n8*2);
        return [c0, c1, c2];
    }

    fromRprBEM(buff, o) {
        o = o || 0;
        const c2 = this.F.fromRprBEM(buff, o);
        const c1 = this.F.fromRprBEM(buff, o+this.n8);
        const c0 = this.F.fromRprBEM(buff, o+this.n8*2);
        return [c0, c1, c2];
    }

    toObject(a) {
        return a;
    }
}

/*
    Copyright 2018 0kims association.

    This file is part of snarkjs.

    snarkjs is a free software: you can redistribute it and/or
    modify it under the terms of the GNU General Public License as published by the
    Free Software Foundation, either version 3 of the License, or (at your option)
    any later version.

    snarkjs is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY
    or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for
    more details.

    You should have received a copy of the GNU General Public License along with
    snarkjs. If not, see <https://www.gnu.org/licenses/>.
*/



function isGreatest(F, a) {
    if (Array.isArray(a)) {
        for (let i=a.length-1; i>=0; i--) {
            if (!F.F.isZero(a[i])) {
                return isGreatest(F.F, a[i]);
            }
        }
        return 0;
    } else {
        const na = F.neg(a);
        return gt(a, na);
    }
}


class EC {

    constructor(F, g) {
        this.F = F;
        this.g = g;
        if (this.g.length == 2) this.g[2] = this.F.one;
        this.zero = [this.F.zero, this.F.one, this.F.zero];
    }

    add(p1, p2) {

        const F = this.F;

        if (this.eq(p1, this.zero)) return p2;
        if (this.eq(p2, this.zero)) return p1;

        const res = new Array(3);

        const Z1Z1 = F.square( p1[2] );
        const Z2Z2 = F.square( p2[2] );

        const U1 = F.mul( p1[0] , Z2Z2 );     // U1 = X1  * Z2Z2
        const U2 = F.mul( p2[0] , Z1Z1 );     // U2 = X2  * Z1Z1

        const Z1_cubed = F.mul( p1[2] , Z1Z1);
        const Z2_cubed = F.mul( p2[2] , Z2Z2);

        const S1 = F.mul( p1[1] , Z2_cubed);  // S1 = Y1 * Z2 * Z2Z2
        const S2 = F.mul( p2[1] , Z1_cubed);  // S2 = Y2 * Z1 * Z1Z1

        if (F.eq(U1,U2) && F.eq(S1,S2)) {
            return this.double(p1);
        }

        const H = F.sub( U2 , U1 );                    // H = U2-U1

        const S2_minus_S1 = F.sub( S2 , S1 );

        const I = F.square( F.add(H,H) );         // I = (2 * H)^2
        const J = F.mul( H , I );                      // J = H * I

        const r = F.add( S2_minus_S1 , S2_minus_S1 );  // r = 2 * (S2-S1)
        const V = F.mul( U1 , I );                     // V = U1 * I

        res[0] =
            F.sub(
                F.sub( F.square(r) , J ),
                F.add( V , V ));                       // X3 = r^2 - J - 2 * V

        const S1_J = F.mul( S1 , J );

        res[1] =
            F.sub(
                F.mul( r , F.sub(V,res[0])),
                F.add( S1_J,S1_J ));                   // Y3 = r * (V-X3)-2 S1 J

        res[2] =
            F.mul(
                H,
                F.sub(
                    F.square( F.add(p1[2],p2[2]) ),
                    F.add( Z1Z1 , Z2Z2 )));            // Z3 = ((Z1+Z2)^2-Z1Z1-Z2Z2) * H

        return res;
    }

    neg(p) {
        return [p[0], this.F.neg(p[1]), p[2]];
    }

    sub(a, b) {
        return this.add(a, this.neg(b));
    }

    double(p) {
        const F = this.F;

        const res = new Array(3);

        if (this.eq(p, this.zero)) return p;

        const A = F.square( p[0] );                    // A = X1^2
        const B = F.square( p[1] );                    // B = Y1^2
        const C = F.square( B );                       // C = B^2

        let D =
            F.sub(
                F.square( F.add(p[0] , B )),
                F.add( A , C));
        D = F.add(D,D);                    // D = 2 * ((X1 + B)^2 - A - C)

        const E = F.add( F.add(A,A), A);          // E = 3 * A
        const FF =F.square( E );                       // F = E^2

        res[0] = F.sub( FF , F.add(D,D) );         // X3 = F - 2 D

        let eightC = F.add( C , C );
        eightC = F.add( eightC , eightC );
        eightC = F.add( eightC , eightC );

        res[1] =
            F.sub(
                F.mul(
                    E,
                    F.sub( D, res[0] )),
                eightC);                                    // Y3 = E * (D - X3) - 8 * C

        const Y1Z1 = F.mul( p[1] , p[2] );
        res[2] = F.add( Y1Z1 , Y1Z1 );                 // Z3 = 2 * Y1 * Z1

        return res;
    }

    timesScalar(base, e) {
        return mulScalar(this, base, e);
    }

    mulScalar(base, e) {
        return mulScalar(this, base, e);
    }

    affine(p) {
        const F = this.F;
        if (this.isZero(p)) {
            return this.zero;
        } else if (F.eq(p[2], F.one)) {
            return p;
        } else {
            const Z_inv = F.inv(p[2]);
            const Z2_inv = F.square(Z_inv);
            const Z3_inv = F.mul(Z2_inv, Z_inv);

            const res = new Array(3);
            res[0] = F.mul(p[0],Z2_inv);
            res[1] = F.mul(p[1],Z3_inv);
            res[2] = F.one;

            return res;
        }
    }

    multiAffine(arr) {
        const keys = Object.keys(arr);
        const F = this.F;
        const accMul = new Array(keys.length+1);
        accMul[0] = F.one;
        for (let i = 0; i< keys.length; i++) {
            if (F.eq(arr[keys[i]][2], F.zero)) {
                accMul[i+1] = accMul[i];
            } else {
                accMul[i+1] = F.mul(accMul[i], arr[keys[i]][2]);
            }
        }

        accMul[keys.length] = F.inv(accMul[keys.length]);

        for (let i = keys.length-1; i>=0; i--) {
            if (F.eq(arr[keys[i]][2], F.zero)) {
                accMul[i] = accMul[i+1];
                arr[keys[i]] = this.zero;
            } else {
                const Z_inv = F.mul(accMul[i], accMul[i+1]);
                accMul[i] = F.mul(arr[keys[i]][2], accMul[i+1]);

                const Z2_inv = F.square(Z_inv);
                const Z3_inv = F.mul(Z2_inv, Z_inv);

                arr[keys[i]][0] = F.mul(arr[keys[i]][0],Z2_inv);
                arr[keys[i]][1] = F.mul(arr[keys[i]][1],Z3_inv);
                arr[keys[i]][2] = F.one;
            }
        }

    }

    eq(p1, p2) {
        const F = this.F;

        if (this.F.eq(p1[2], this.F.zero)) return this.F.eq(p2[2], this.F.zero);
        if (this.F.eq(p2[2], this.F.zero)) return false;

        const Z1Z1 = F.square( p1[2] );
        const Z2Z2 = F.square( p2[2] );

        const U1 = F.mul( p1[0] , Z2Z2 );
        const U2 = F.mul( p2[0] , Z1Z1 );

        const Z1_cubed = F.mul( p1[2] , Z1Z1);
        const Z2_cubed = F.mul( p2[2] , Z2Z2);

        const S1 = F.mul( p1[1] , Z2_cubed);
        const S2 = F.mul( p2[1] , Z1_cubed);

        return (F.eq(U1,U2) && F.eq(S1,S2));
    }

    isZero(p) {
        return this.F.isZero(p[2]);
    }

    toString(p) {
        const cp = this.affine(p);
        return `[ ${this.F.toString(cp[0])} , ${this.F.toString(cp[1])} ]`;
    }

    fromRng(rng) {
        const F = this.F;
        let P = [];
        let greatest;
        do {
            P[0] = F.fromRng(rng);
            greatest = rng.nextBool();
            const x3b = F.add(F.mul(F.square(P[0]), P[0]), this.b);
            P[1] = F.sqrt(x3b);
        } while ((P[1] == null)||(F.isZero[P]));

        const s = isGreatest(F, P[1]);
        if (greatest ^ s) P[1] = F.neg(P[1]);
        P[2] = F.one;

        if (this.cofactor) {
            P = this.mulScalar(P, this.cofactor);
        }

        P = this.affine(P);

        return P;

    }

    toRprLE(buff, o, p) {
        p = this.affine(p);
        if (this.isZero(p)) {
            const BuffV = new Uint8Array(buff, o, this.F.n8*2);
            BuffV.fill(0);
            return;
        }
        this.F.toRprLE(buff, o, p[0]);
        this.F.toRprLE(buff, o+this.F.n8, p[1]);
    }

    toRprBE(buff, o, p) {
        p = this.affine(p);
        if (this.isZero(p)) {
            const BuffV = new Uint8Array(buff, o, this.F.n8*2);
            BuffV.fill(0);
            return;
        }
        this.F.toRprBE(buff, o, p[0]);
        this.F.toRprBE(buff, o+this.F.n8, p[1]);
    }

    toRprLEM(buff, o, p) {
        p = this.affine(p);
        if (this.isZero(p)) {
            const BuffV = new Uint8Array(buff, o, this.F.n8*2);
            BuffV.fill(0);
            return;
        }
        this.F.toRprLEM(buff, o, p[0]);
        this.F.toRprLEM(buff, o+this.F.n8, p[1]);
    }

    toRprLEJM(buff, o, p) {
        p = this.affine(p);
        if (this.isZero(p)) {
            const BuffV = new Uint8Array(buff, o, this.F.n8*2);
            BuffV.fill(0);
            return;
        }
        this.F.toRprLEM(buff, o, p[0]);
        this.F.toRprLEM(buff, o+this.F.n8, p[1]);
        this.F.toRprLEM(buff, o+2*this.F.n8, p[2]);
    }


    toRprBEM(buff, o, p) {
        p = this.affine(p);
        if (this.isZero(p)) {
            const BuffV = new Uint8Array(buff, o, this.F.n8*2);
            BuffV.fill(0);
            return;
        }
        this.F.toRprBEM(buff, o, p[0]);
        this.F.toRprBEM(buff, o+this.F.n8, p[1]);
    }

    fromRprLE(buff, o) {
        o = o || 0;
        const x = this.F.fromRprLE(buff, o);
        const y = this.F.fromRprLE(buff, o+this.F.n8);
        if (this.F.isZero(x) && this.F.isZero(y)) {
            return this.zero;
        }
        return [x, y, this.F.one];
    }

    fromRprBE(buff, o) {
        o = o || 0;
        const x = this.F.fromRprBE(buff, o);
        const y = this.F.fromRprBE(buff, o+this.F.n8);
        if (this.F.isZero(x) && this.F.isZero(y)) {
            return this.zero;
        }
        return [x, y, this.F.one];
    }

    fromRprLEM(buff, o) {
        o = o || 0;
        const x = this.F.fromRprLEM(buff, o);
        const y = this.F.fromRprLEM(buff, o+this.F.n8);
        if (this.F.isZero(x) && this.F.isZero(y)) {
            return this.zero;
        }
        return [x, y, this.F.one];
    }

    fromRprLEJM(buff, o) {
        o = o || 0;
        const x = this.F.fromRprLEM(buff, o);
        const y = this.F.fromRprLEM(buff, o+this.F.n8);
        const z = this.F.fromRprLEM(buff, o+this.F.n8*2);
        if (this.F.isZero(x) && this.F.isZero(y)) {
            return this.zero;
        }
        return [x, y, z];
    }

    fromRprBEM(buff, o) {
        o = o || 0;
        const x = this.F.fromRprBEM(buff, o);
        const y = this.F.fromRprBEM(buff, o+this.F.n8);
        if (this.F.isZero(x) && this.F.isZero(y)) {
            return this.zero;
        }
        return [x, y, this.F.one];
    }

    fromRprCompressed(buff, o) {
        const F = this.F;
        const v = new Uint8Array(buff.buffer, o, F.n8);
        if (v[0] & 0x40) return this.zero;
        const P = new Array(3);

        const greatest = ((v[0] & 0x80) != 0);
        v[0] = v[0] & 0x7F;
        P[0] = F.fromRprBE(buff, o);
        if (greatest) v[0] = v[0] | 0x80;  // set back again the old value

        const x3b = F.add(F.mul(F.square(P[0]), P[0]), this.b);
        P[1] = F.sqrt(x3b);

        if (P[1] === null) {
            throw new Error("Invalid Point!");
        }

        const s = isGreatest(F, P[1]);
        if (greatest ^ s) P[1] = F.neg(P[1]);
        P[2] = F.one;

        return P;
    }

    toRprCompressed(buff, o, p) {
        p = this.affine(p);
        const v = new Uint8Array(buff.buffer, o, this.F.n8);
        if (this.isZero(p)) {
            v.fill(0);
            v[0] = 0x40;
            return;
        }
        this.F.toRprBE(buff, o, p[0]);

        if (isGreatest(this.F, p[1])) {
            v[0] = v[0] | 0x80;
        }
    }


    fromRprUncompressed(buff, o) {
        if (buff[0] & 0x40) return this.zero;

        return this.fromRprBE(buff, o);
    }

    toRprUncompressed(buff, o, p) {
        this.toRprBE(buff, o, p);

        if (this.isZero(p)) {
            buff[o] = buff[o] | 0x40;
        }
    }


}

/* global BigInt */

function stringifyBigInts(o) {
    if (typeof o == "bigint" || o.eq !== undefined) {
        return o.toString(10);
    } else if (o instanceof Uint8Array) {
        return fromRprLE(o, 0);
    } else if (Array.isArray(o)) {
        return o.map(stringifyBigInts);
    } else if (typeof o == "object") {
        const res = {};
        const keys = Object.keys(o);
        keys.forEach((k) => {
            res[k] = stringifyBigInts(o[k]);
        });
        return res;
    } else {
        return o;
    }
}

function unstringifyBigInts(o) {
    if (typeof o == "string" && /^[0-9]+$/.test(o)) {
        return BigInt(o);
    } else if (typeof o == "string" && /^0x[0-9a-fA-F]+$/.test(o)) {
        return BigInt(o);
    } else if (Array.isArray(o)) {
        return o.map(unstringifyBigInts);
    } else if (typeof o == "object") {
        if (o === null) return null;
        const res = {};
        const keys = Object.keys(o);
        keys.forEach((k) => {
            res[k] = unstringifyBigInts(o[k]);
        });
        return res;
    } else {
        return o;
    }
}

function beBuff2int(buff) {
    let res = BigInt(0);
    let i = buff.length;
    let offset = 0;
    const buffV = new DataView(buff.buffer, buff.byteOffset, buff.byteLength);
    while (i > 0) {
        if (i >= 4) {
            i -= 4;
            res += BigInt(buffV.getUint32(i)) << BigInt(offset * 8);
            offset += 4;
        } else if (i >= 2) {
            i -= 2;
            res += BigInt(buffV.getUint16(i)) << BigInt(offset * 8);
            offset += 2;
        } else {
            i -= 1;
            res += BigInt(buffV.getUint8(i)) << BigInt(offset * 8);
            offset += 1;
        }
    }
    return res;
}

function beInt2Buff(n, len) {
    let r = n;
    const buff = new Uint8Array(len);
    const buffV = new DataView(buff.buffer);
    let o = len;
    while (o > 0) {
        if (o - 4 >= 0) {
            o -= 4;
            buffV.setUint32(o, Number(r & BigInt(0xffffffff)));
            r = r >> BigInt(32);
        } else if (o - 2 >= 0) {
            o -= 2;
            buffV.setUint16(o, Number(r & BigInt(0xffff)));
            r = r >> BigInt(16);
        } else {
            o -= 1;
            buffV.setUint8(o, Number(r & BigInt(0xff)));
            r = r >> BigInt(8);
        }
    }
    if (r) {
        throw new Error("Number does not fit in this length");
    }
    return buff;
}

function leBuff2int(buff) {
    let res = BigInt(0);
    let i = 0;
    const buffV = new DataView(buff.buffer, buff.byteOffset, buff.byteLength);
    while (i < buff.length) {
        if (i + 4 <= buff.length) {
            res += BigInt(buffV.getUint32(i, true)) << BigInt(i * 8);
            i += 4;
        } else if (i + 2 <= buff.length) {
            res += BigInt(buffV.getUint16(i, true)) << BigInt(i * 8);
            i += 2;
        } else {
            res += BigInt(buffV.getUint8(i, true)) << BigInt(i * 8);
            i += 1;
        }
    }
    return res;
}

function leInt2Buff(n, len) {
    let r = n;
    if (typeof len === "undefined") {
        len = Math.floor((bitLength(n) - 1) / 8) + 1;
        if (len == 0) len = 1;
    }
    const buff = new Uint8Array(len);
    const buffV = new DataView(buff.buffer);
    let o = 0;
    while (o < len) {
        if (o + 4 <= len) {
            buffV.setUint32(o, Number(r & BigInt(0xffffffff)), true);
            o += 4;
            r = r >> BigInt(32);
        } else if (o + 2 <= len) {
            buffV.setUint16(o, Number(r & BigInt(0xffff)), true);
            o += 2;
            r = r >> BigInt(16);
        } else {
            buffV.setUint8(o, Number(r & BigInt(0xff)), true);
            o += 1;
            r = r >> BigInt(8);
        }
    }
    if (r) {
        throw new Error("Number does not fit in this length");
    }
    return buff;
}

function stringifyFElements(F, o) {
    if (typeof o == "bigint" || o.eq !== undefined) {
        return o.toString(10);
    } else if (o instanceof Uint8Array) {
        return F.toString(F.e(o));
    } else if (Array.isArray(o)) {
        return o.map(stringifyFElements.bind(this, F));
    } else if (typeof o == "object") {
        const res = {};
        const keys = Object.keys(o);
        keys.forEach((k) => {
            res[k] = stringifyFElements(F, o[k]);
        });
        return res;
    } else {
        return o;
    }
}

function unstringifyFElements(F, o) {
    if (typeof o == "string" && /^[0-9]+$/.test(o)) {
        return F.e(o);
    } else if (typeof o == "string" && /^0x[0-9a-fA-F]+$/.test(o)) {
        return F.e(o);
    } else if (Array.isArray(o)) {
        return o.map(unstringifyFElements.bind(this, F));
    } else if (typeof o == "object") {
        if (o === null) return null;
        const res = {};
        const keys = Object.keys(o);
        keys.forEach((k) => {
            res[k] = unstringifyFElements(F, o[k]);
        });
        return res;
    } else {
        return o;
    }
}

const _revTable = [];
for (let i = 0; i < 256; i++) {
    _revTable[i] = _revSlow(i, 8);
}

function _revSlow(idx, bits) {
    let res = 0;
    let a = idx;
    for (let i = 0; i < bits; i++) {
        res <<= 1;
        res = res | (a & 1);
        a >>= 1;
    }
    return res;
}

function bitReverse(idx, bits) {
    return (
        (_revTable[idx >>> 24] |
        (_revTable[(idx >>> 16) & 0xff] << 8) |
        (_revTable[(idx >>> 8) & 0xff] << 16) |
        (_revTable[idx & 0xff] << 24)) >>>
        (32 - bits)
    );
}

function log2(V) {
    return (
        ((V & 0xffff0000) !== 0 ? ((V &= 0xffff0000), 16) : 0) |
        ((V & 0xff00ff00) !== 0 ? ((V &= 0xff00ff00), 8) : 0) |
        ((V & 0xf0f0f0f0) !== 0 ? ((V &= 0xf0f0f0f0), 4) : 0) |
        ((V & 0xcccccccc) !== 0 ? ((V &= 0xcccccccc), 2) : 0) |
        ((V & 0xaaaaaaaa) !== 0)
    );
}

function buffReverseBits(buff, eSize) {
    const n = buff.byteLength / eSize;
    const bits = log2(n);
    if (n != 1 << bits) {
        throw new Error("Invalid number of pointers");
    }
    for (let i = 0; i < n; i++) {
        const r = bitReverse(i, bits);
        if (i > r) {
            const tmp = buff.slice(i * eSize, (i + 1) * eSize);
            buff.set(buff.slice(r * eSize, (r + 1) * eSize), i * eSize);
            buff.set(tmp, r * eSize);
        }
    }
}

function array2buffer(arr, sG) {
    const buff = new Uint8Array(sG * arr.length);

    for (let i = 0; i < arr.length; i++) {
        buff.set(arr[i], i * sG);
    }

    return buff;
}

function buffer2array(buff, sG) {
    const n = buff.byteLength / sG;
    const arr = new Array(n);
    for (let i = 0; i < n; i++) {
        arr[i] = buff.slice(i * sG, i * sG + sG);
    }
    return arr;
}

var _utils = /*#__PURE__*/Object.freeze({
    __proto__: null,
    array2buffer: array2buffer,
    beBuff2int: beBuff2int,
    beInt2Buff: beInt2Buff,
    bitReverse: bitReverse,
    buffReverseBits: buffReverseBits,
    buffer2array: buffer2array,
    leBuff2int: leBuff2int,
    leInt2Buff: leInt2Buff,
    log2: log2,
    stringifyBigInts: stringifyBigInts,
    stringifyFElements: stringifyFElements,
    unstringifyBigInts: unstringifyBigInts,
    unstringifyFElements: unstringifyFElements
});

const PAGE_SIZE = 1<<30;

class BigBuffer {

    constructor(size) {
        this.buffers = [];
        this.byteLength = size;
        for (let i=0; i<size; i+= PAGE_SIZE) {
            const n = Math.min(size-i, PAGE_SIZE);
            this.buffers.push(new Uint8Array(n));
        }

    }

    slice(fr, to) {
        if ( to === undefined ) to = this.byteLength;
        if ( fr === undefined ) fr = 0;
        const len = to-fr;

        const firstPage = Math.floor(fr / PAGE_SIZE);
        const lastPage = Math.floor((fr+len-1) / PAGE_SIZE);

        if ((firstPage == lastPage)||(len==0))
            return this.buffers[firstPage].slice(fr%PAGE_SIZE, fr%PAGE_SIZE + len);

        let buff;

        let p = firstPage;
        let o = fr % PAGE_SIZE;
        // Remaining bytes to read
        let r = len;
        while (r>0) {
            // bytes to copy from this page
            const l = (o+r > PAGE_SIZE) ? (PAGE_SIZE -o) : r;
            const srcView = new Uint8Array(this.buffers[p].buffer, this.buffers[p].byteOffset+o, l);
            if (l == len) return srcView.slice();
            if (!buff) {
                if (len <= PAGE_SIZE) {
                    buff = new Uint8Array(len);
                } else {
                    buff = new BigBuffer(len);
                }
            }
            buff.set(srcView, len-r);
            r = r-l;
            p ++;
            o = 0;
        }

        return buff;
    }

    set(buff, offset) {
        if (offset === undefined) offset = 0;

        const len = buff.byteLength;

        if (len==0) return;

        const firstPage = Math.floor(offset / PAGE_SIZE);
        const lastPage = Math.floor((offset+len-1) / PAGE_SIZE);

        if (firstPage == lastPage) {
            if ((buff instanceof BigBuffer)&&(buff.buffers.length==1)) {
                return this.buffers[firstPage].set(buff.buffers[0], offset % PAGE_SIZE);
            } else {
                return this.buffers[firstPage].set(buff, offset % PAGE_SIZE);
            }

        }


        let p = firstPage;
        let o = offset % PAGE_SIZE;
        let r = len;
        while (r>0) {
            const l = (o+r > PAGE_SIZE) ? (PAGE_SIZE -o) : r;
            const srcView = buff.slice( len -r, len -r+l);
            const dstView = new Uint8Array(this.buffers[p].buffer, this.buffers[p].byteOffset + o, l);
            dstView.set(srcView);
            r = r-l;
            p ++;
            o = 0;
        }

    }
}

function buildBatchConvert(tm, fnName, sIn, sOut) {
    return async function batchConvert(buffIn) {
        const nPoints = Math.floor(buffIn.byteLength / sIn);
        if ( nPoints * sIn !== buffIn.byteLength) {
            throw new Error("Invalid buffer size");
        }
        const pointsPerChunk = Math.floor(nPoints/tm.concurrency);
        const opPromises = [];
        for (let i=0; i<tm.concurrency; i++) {
            let n;
            if (i< tm.concurrency-1) {
                n = pointsPerChunk;
            } else {
                n = nPoints - i*pointsPerChunk;
            }
            if (n==0) continue;

            const buffChunk = buffIn.slice(i*pointsPerChunk*sIn, i*pointsPerChunk*sIn + n*sIn);
            const task = [
                {cmd: "ALLOCSET", var: 0, buff:buffChunk},
                {cmd: "ALLOC", var: 1, len:sOut * n},
                {cmd: "CALL", fnName: fnName, params: [
                    {var: 0},
                    {val: n},
                    {var: 1}
                ]},
                {cmd: "GET", out: 0, var: 1, len:sOut * n},
            ];
            opPromises.push(
                tm.queueAction(task)
            );
        }

        const result = await Promise.all(opPromises);

        let fullBuffOut;
        if (buffIn instanceof BigBuffer) {
            fullBuffOut = new BigBuffer(nPoints*sOut);
        } else {
            fullBuffOut = new Uint8Array(nPoints*sOut);
        }

        let p =0;
        for (let i=0; i<result.length; i++) {
            fullBuffOut.set(result[i][0], p);
            p+=result[i][0].byteLength;
        }

        return fullBuffOut;
    };
}

class WasmField1 {

    constructor(tm, prefix, n8, p) {
        this.tm = tm;
        this.prefix = prefix;

        this.p = p;
        this.n8 = n8;
        this.type = "F1";
        this.m = 1;

        this.half = shiftRight(p, one);
        this.bitLength = bitLength(p);
        this.mask = sub(shiftLeft(one, this.bitLength), one);

        this.pOp1 = tm.alloc(n8);
        this.pOp2 = tm.alloc(n8);
        this.pOp3 = tm.alloc(n8);
        this.tm.instance.exports[prefix + "_zero"](this.pOp1);
        this.zero = this.tm.getBuff(this.pOp1, this.n8);
        this.tm.instance.exports[prefix + "_one"](this.pOp1);
        this.one = this.tm.getBuff(this.pOp1, this.n8);

        this.negone = this.neg(this.one);
        this.two = this.add(this.one, this.one);

        this.n64 = Math.floor(n8/8);
        this.n32 = Math.floor(n8/4);

        if(this.n64*8 != this.n8) {
            throw new Error("n8 must be a multiple of 8");
        }

        this.half = shiftRight(this.p, one);
        this.nqr = this.two;
        let r = this.exp(this.nqr, this.half);
        while (!this.eq(r, this.negone)) {
            this.nqr = this.add(this.nqr, this.one);
            r = this.exp(this.nqr, this.half);
        }

        this.shift = this.mul(this.nqr, this.nqr);
        this.shiftInv = this.inv(this.shift);

        this.s = 0;
        let t = sub(this.p, one);

        while ( !isOdd(t) ) {
            this.s = this.s + 1;
            t = shiftRight(t, one);
        }

        this.w = [];
        this.w[this.s] = this.exp(this.nqr, t);

        for (let i= this.s-1; i>=0; i--) {
            this.w[i] = this.square(this.w[i+1]);
        }

        if (!this.eq(this.w[0], this.one)) {
            throw new Error("Error calculating roots of unity");
        }

        this.batchToMontgomery = buildBatchConvert(tm, prefix + "_batchToMontgomery", this.n8, this.n8);
        this.batchFromMontgomery = buildBatchConvert(tm, prefix + "_batchFromMontgomery", this.n8, this.n8);
    }


    op2(opName, a, b) {
        this.tm.setBuff(this.pOp1, a);
        this.tm.setBuff(this.pOp2, b);
        this.tm.instance.exports[this.prefix + opName](this.pOp1, this.pOp2, this.pOp3);
        return this.tm.getBuff(this.pOp3, this.n8);
    }

    op2Bool(opName, a, b) {
        this.tm.setBuff(this.pOp1, a);
        this.tm.setBuff(this.pOp2, b);
        return !!this.tm.instance.exports[this.prefix + opName](this.pOp1, this.pOp2);
    }

    op1(opName, a) {
        this.tm.setBuff(this.pOp1, a);
        this.tm.instance.exports[this.prefix + opName](this.pOp1, this.pOp3);
        return this.tm.getBuff(this.pOp3, this.n8);
    }

    op1Bool(opName, a) {
        this.tm.setBuff(this.pOp1, a);
        return !!this.tm.instance.exports[this.prefix + opName](this.pOp1, this.pOp3);
    }

    add(a,b) {
        return this.op2("_add", a, b);
    }


    eq(a,b) {
        return this.op2Bool("_eq", a, b);
    }

    isZero(a) {
        return this.op1Bool("_isZero", a);
    }

    sub(a,b) {
        return this.op2("_sub", a, b);
    }

    neg(a) {
        return this.op1("_neg", a);
    }

    inv(a) {
        return this.op1("_inverse", a);
    }

    toMontgomery(a) {
        return this.op1("_toMontgomery", a);
    }

    fromMontgomery(a) {
        return this.op1("_fromMontgomery", a);
    }

    mul(a,b) {
        return this.op2("_mul", a, b);
    }

    div(a, b) {
        this.tm.setBuff(this.pOp1, a);
        this.tm.setBuff(this.pOp2, b);
        this.tm.instance.exports[this.prefix + "_inverse"](this.pOp2, this.pOp2);
        this.tm.instance.exports[this.prefix + "_mul"](this.pOp1, this.pOp2, this.pOp3);
        return this.tm.getBuff(this.pOp3, this.n8);
    }

    square(a) {
        return this.op1("_square", a);
    }

    isSquare(a) {
        return this.op1Bool("_isSquare", a);
    }

    sqrt(a) {
        return this.op1("_sqrt", a);
    }

    exp(a, b) {
        if (!(b instanceof Uint8Array)) {
            b = toLEBuff(e(b));
        }
        this.tm.setBuff(this.pOp1, a);
        this.tm.setBuff(this.pOp2, b);
        this.tm.instance.exports[this.prefix + "_exp"](this.pOp1, this.pOp2, b.byteLength, this.pOp3);
        return this.tm.getBuff(this.pOp3, this.n8);
    }

    isNegative(a) {
        return this.op1Bool("_isNegative", a);
    }

    e(a, b) {
        if (a instanceof Uint8Array) return a;
        let ra = e(a, b);
        if (isNegative(ra)) {
            ra = neg(ra);
            if (gt(ra, this.p)) {
                ra = mod(ra, this.p);
            }
            ra = sub(this.p, ra);
        } else {
            if (gt(ra, this.p)) {
                ra = mod(ra, this.p);
            }
        }
        const buff = leInt2Buff(ra, this.n8);
        return this.toMontgomery(buff);
    }

    toString(a, radix) {
        const an = this.fromMontgomery(a);
        const s = fromRprLE(an, 0);
        return toString(s, radix);
    }

    fromRng(rng) {
        let v;
        const buff = new Uint8Array(this.n8);
        do {
            v = zero;
            for (let i=0; i<this.n64; i++) {
                v = add(v,  shiftLeft(rng.nextU64(), 64*i));
            }
            v = band(v, this.mask);
        } while (geq(v, this.p));
        toRprLE(buff, 0, v, this.n8);
        return buff;
    }

    random() {
        return this.fromRng(getThreadRng());
    }

    toObject(a) {
        const an = this.fromMontgomery(a);
        return fromRprLE(an, 0);
    }

    fromObject(a) {
        const buff = new Uint8Array(this.n8);
        toRprLE(buff, 0, a, this.n8);
        return this.toMontgomery(buff);
    }

    toRprLE(buff, offset, a) {
        buff.set(this.fromMontgomery(a), offset);
    }

    toRprBE(buff, offset, a) {
        const buff2 = this.fromMontgomery(a);
        for (let i=0; i<this.n8/2; i++) {
            const aux = buff2[i];
            buff2[i] = buff2[this.n8-1-i];
            buff2[this.n8-1-i] = aux;
        }
        buff.set(buff2, offset);
    }

    fromRprLE(buff, offset) {
        offset = offset || 0;
        const res = buff.slice(offset, offset + this.n8);
        return this.toMontgomery(res);
    }

    async batchInverse(buffIn) {
        let returnArray = false;
        const sIn = this.n8;
        const sOut = this.n8;

        if (Array.isArray(buffIn)) {
            buffIn = array2buffer(buffIn, sIn );
            returnArray = true;
        } else {
            buffIn = buffIn.slice(0, buffIn.byteLength);
        }

        const nPoints = Math.floor(buffIn.byteLength / sIn);
        if ( nPoints * sIn !== buffIn.byteLength) {
            throw new Error("Invalid buffer size");
        }
        const pointsPerChunk = Math.floor(nPoints/this.tm.concurrency);
        const opPromises = [];
        for (let i=0; i<this.tm.concurrency; i++) {
            let n;
            if (i< this.tm.concurrency-1) {
                n = pointsPerChunk;
            } else {
                n = nPoints - i*pointsPerChunk;
            }
            if (n==0) continue;

            const buffChunk = buffIn.slice(i*pointsPerChunk*sIn, i*pointsPerChunk*sIn + n*sIn);
            const task = [
                {cmd: "ALLOCSET", var: 0, buff:buffChunk},
                {cmd: "ALLOC", var: 1, len:sOut * n},
                {cmd: "CALL", fnName: this.prefix + "_batchInverse", params: [
                    {var: 0},
                    {val: sIn},
                    {val: n},
                    {var: 1},
                    {val: sOut},
                ]},
                {cmd: "GET", out: 0, var: 1, len:sOut * n},
            ];
            opPromises.push(
                this.tm.queueAction(task)
            );
        }

        const result = await Promise.all(opPromises);

        let fullBuffOut;
        if (buffIn instanceof BigBuffer) {
            fullBuffOut = new BigBuffer(nPoints*sOut);
        } else {
            fullBuffOut = new Uint8Array(nPoints*sOut);
        }

        let p =0;
        for (let i=0; i<result.length; i++) {
            fullBuffOut.set(result[i][0], p);
            p+=result[i][0].byteLength;
        }

        if (returnArray) {
            return buffer2array(fullBuffOut, sOut);
        } else {
            return fullBuffOut;
        }

    }

}

class WasmField2 {

    constructor(tm, prefix, F) {
        this.tm = tm;
        this.prefix = prefix;

        this.F = F;
        this.type = "F2";
        this.m = F.m * 2;
        this.n8 = this.F.n8*2;
        this.n32 = this.F.n32*2;
        this.n64 = this.F.n64*2;

        this.pOp1 = tm.alloc(F.n8*2);
        this.pOp2 = tm.alloc(F.n8*2);
        this.pOp3 = tm.alloc(F.n8*2);
        this.tm.instance.exports[prefix + "_zero"](this.pOp1);
        this.zero = tm.getBuff(this.pOp1, this.n8);
        this.tm.instance.exports[prefix + "_one"](this.pOp1);
        this.one = tm.getBuff(this.pOp1, this.n8);

        this.negone = this.neg(this.one);
        this.two = this.add(this.one, this.one);

    }

    op2(opName, a, b) {
        this.tm.setBuff(this.pOp1, a);
        this.tm.setBuff(this.pOp2, b);
        this.tm.instance.exports[this.prefix + opName](this.pOp1, this.pOp2, this.pOp3);
        return this.tm.getBuff(this.pOp3, this.n8);
    }

    op2Bool(opName, a, b) {
        this.tm.setBuff(this.pOp1, a);
        this.tm.setBuff(this.pOp2, b);
        return !!this.tm.instance.exports[this.prefix + opName](this.pOp1, this.pOp2);
    }

    op1(opName, a) {
        this.tm.setBuff(this.pOp1, a);
        this.tm.instance.exports[this.prefix + opName](this.pOp1, this.pOp3);
        return this.tm.getBuff(this.pOp3, this.n8);
    }

    op1Bool(opName, a) {
        this.tm.setBuff(this.pOp1, a);
        return !!this.tm.instance.exports[this.prefix + opName](this.pOp1, this.pOp3);
    }

    add(a,b) {
        return this.op2("_add", a, b);
    }

    eq(a,b) {
        return this.op2Bool("_eq", a, b);
    }

    isZero(a) {
        return this.op1Bool("_isZero", a);
    }

    sub(a,b) {
        return this.op2("_sub", a, b);
    }

    neg(a) {
        return this.op1("_neg", a);
    }

    inv(a) {
        return this.op1("_inverse", a);
    }

    isNegative(a) {
        return this.op1Bool("_isNegative", a);
    }

    toMontgomery(a) {
        return this.op1("_toMontgomery", a);
    }

    fromMontgomery(a) {
        return this.op1("_fromMontgomery", a);
    }

    mul(a,b) {
        return this.op2("_mul", a, b);
    }

    mul1(a,b) {
        return this.op2("_mul1", a, b);
    }

    div(a, b) {
        this.tm.setBuff(this.pOp1, a);
        this.tm.setBuff(this.pOp2, b);
        this.tm.instance.exports[this.prefix + "_inverse"](this.pOp2, this.pOp2);
        this.tm.instance.exports[this.prefix + "_mul"](this.pOp1, this.pOp2, this.pOp3);
        return this.tm.getBuff(this.pOp3, this.n8);
    }

    square(a) {
        return this.op1("_square", a);
    }

    isSquare(a) {
        return this.op1Bool("_isSquare", a);
    }

    sqrt(a) {
        return this.op1("_sqrt", a);
    }

    exp(a, b) {
        if (!(b instanceof Uint8Array)) {
            b = toLEBuff(e(b));
        }
        this.tm.setBuff(this.pOp1, a);
        this.tm.setBuff(this.pOp2, b);
        this.tm.instance.exports[this.prefix + "_exp"](this.pOp1, this.pOp2, b.byteLength, this.pOp3);
        return this.tm.getBuff(this.pOp3, this.n8);
    }

    e(a, b) {
        if (a instanceof Uint8Array) return a;
        if ((Array.isArray(a)) && (a.length == 2)) {
            const c1 = this.F.e(a[0], b);
            const c2 = this.F.e(a[1], b);
            const res = new Uint8Array(this.F.n8*2);
            res.set(c1);
            res.set(c2, this.F.n8*2);
            return res;
        } else {
            throw new Error("invalid F2");
        }
    }

    toString(a, radix) {
        const s1 = this.F.toString(a.slice(0, this.F.n8), radix);
        const s2 = this.F.toString(a.slice(this.F.n8), radix);
        return `[${s1}, ${s2}]`;
    }

    fromRng(rng) {
        const c1 = this.F.fromRng(rng);
        const c2 = this.F.fromRng(rng);
        const res = new Uint8Array(this.F.n8*2);
        res.set(c1);
        res.set(c2, this.F.n8);
        return res;
    }

    random() {
        return this.fromRng(getThreadRng());
    }

    toObject(a) {
        const c1 = this.F.toObject(a.slice(0, this.F.n8));
        const c2 = this.F.toObject(a.slice(this.F.n8, this.F.n8*2));
        return [c1, c2];
    }

    fromObject(a) {
        const buff = new Uint8Array(this.F.n8*2);
        const b1 = this.F.fromObject(a[0]);
        const b2 = this.F.fromObject(a[1]);
        buff.set(b1);
        buff.set(b2, this.F.n8);
        return buff;
    }

    c1(a) {
        return a.slice(0, this.F.n8);
    }

    c2(a) {
        return a.slice(this.F.n8);
    }

}

class WasmField3 {

    constructor(tm, prefix, F) {
        this.tm = tm;
        this.prefix = prefix;

        this.F = F;
        this.type = "F3";
        this.m = F.m * 3;
        this.n8 = this.F.n8*3;
        this.n32 = this.F.n32*3;
        this.n64 = this.F.n64*3;

        this.pOp1 = tm.alloc(F.n8*3);
        this.pOp2 = tm.alloc(F.n8*3);
        this.pOp3 = tm.alloc(F.n8*3);
        this.tm.instance.exports[prefix + "_zero"](this.pOp1);
        this.zero = tm.getBuff(this.pOp1, this.n8);
        this.tm.instance.exports[prefix + "_one"](this.pOp1);
        this.one = tm.getBuff(this.pOp1, this.n8);

        this.negone = this.neg(this.one);
        this.two = this.add(this.one, this.one);

    }

    op2(opName, a, b) {
        this.tm.setBuff(this.pOp1, a);
        this.tm.setBuff(this.pOp2, b);
        this.tm.instance.exports[this.prefix + opName](this.pOp1, this.pOp2, this.pOp3);
        return this.tm.getBuff(this.pOp3, this.n8);
    }

    op2Bool(opName, a, b) {
        this.tm.setBuff(this.pOp1, a);
        this.tm.setBuff(this.pOp2, b);
        return !!this.tm.instance.exports[this.prefix + opName](this.pOp1, this.pOp2);
    }

    op1(opName, a) {
        this.tm.setBuff(this.pOp1, a);
        this.tm.instance.exports[this.prefix + opName](this.pOp1, this.pOp3);
        return this.tm.getBuff(this.pOp3, this.n8);
    }

    op1Bool(opName, a) {
        this.tm.setBuff(this.pOp1, a);
        return !!this.tm.instance.exports[this.prefix + opName](this.pOp1, this.pOp3);
    }


    eq(a,b) {
        return this.op2Bool("_eq", a, b);
    }

    isZero(a) {
        return this.op1Bool("_isZero", a);
    }

    add(a,b) {
        return this.op2("_add", a, b);
    }

    sub(a,b) {
        return this.op2("_sub", a, b);
    }

    neg(a) {
        return this.op1("_neg", a);
    }

    inv(a) {
        return this.op1("_inverse", a);
    }

    isNegative(a) {
        return this.op1Bool("_isNegative", a);
    }

    toMontgomery(a) {
        return this.op1("_toMontgomery", a);
    }

    fromMontgomery(a) {
        return this.op1("_fromMontgomery", a);
    }

    mul(a,b) {
        return this.op2("_mul", a, b);
    }

    div(a, b) {
        this.tm.setBuff(this.pOp1, a);
        this.tm.setBuff(this.pOp2, b);
        this.tm.instance.exports[this.prefix + "_inverse"](this.pOp2, this.pOp2);
        this.tm.instance.exports[this.prefix + "_mul"](this.pOp1, this.pOp2, this.pOp3);
        return this.tm.getBuff(this.pOp3, this.n8);
    }

    square(a) {
        return this.op1("_square", a);
    }

    isSquare(a) {
        return this.op1Bool("_isSquare", a);
    }

    sqrt(a) {
        return this.op1("_sqrt", a);
    }

    exp(a, b) {
        if (!(b instanceof Uint8Array)) {
            b = toLEBuff(e(b));
        }
        this.tm.setBuff(this.pOp1, a);
        this.tm.setBuff(this.pOp2, b);
        this.tm.instance.exports[this.prefix + "_exp"](this.pOp1, this.pOp2, b.byteLength, this.pOp3);
        return this.getBuff(this.pOp3, this.n8);
    }

    e(a, b) {
        if (a instanceof Uint8Array) return a;
        if ((Array.isArray(a)) && (a.length == 3)) {
            const c1 = this.F.e(a[0], b);
            const c2 = this.F.e(a[1], b);
            const c3 = this.F.e(a[2], b);
            const res = new Uint8Array(this.F.n8*3);
            res.set(c1);
            res.set(c2, this.F.n8);
            res.set(c3, this.F.n8*2);
            return res;
        } else {
            throw new Error("invalid F3");
        }
    }

    toString(a, radix) {
        const s1 = this.F.toString(a.slice(0, this.F.n8), radix);
        const s2 = this.F.toString(a.slice(this.F.n8, this.F.n8*2), radix);
        const s3 = this.F.toString(a.slice(this.F.n8*2), radix);
        return `[${s1}, ${s2}, ${s3}]`;
    }

    fromRng(rng) {
        const c1 = this.F.fromRng(rng);
        const c2 = this.F.fromRng(rng);
        const c3 = this.F.fromRng(rng);
        const res = new Uint8Array(this.F.n8*3);
        res.set(c1);
        res.set(c2, this.F.n8);
        res.set(c3, this.F.n8*2);
        return res;
    }

    random() {
        return this.fromRng(getThreadRng());
    }

    toObject(a) {
        const c1 = this.F.toObject(a.slice(0, this.F.n8));
        const c2 = this.F.toObject(a.slice(this.F.n8, this.F.n8*2));
        const c3 = this.F.toObject(a.slice(this.F.n8*2, this.F.n8*3));
        return [c1, c2, c3];
    }

    fromObject(a) {
        const buff = new Uint8Array(this.F.n8*3);
        const b1 = this.F.fromObject(a[0]);
        const b2 = this.F.fromObject(a[1]);
        const b3 = this.F.fromObject(a[2]);
        buff.set(b1);
        buff.set(b2, this.F.n8);
        buff.set(b3, this.F.n8*2);
        return buff;
    }

    c1(a) {
        return a.slice(0, this.F.n8);
    }

    c2(a) {
        return a.slice(this.F.n8, this.F.n8*2);
    }

    c3(a) {
        return a.slice(this.F.n8*2);
    }

}

class WasmCurve {

    constructor(tm, prefix, F, pGen, pGb, cofactor) {
        this.tm = tm;
        this.prefix = prefix;
        this.F = F;

        this.pOp1 = tm.alloc(F.n8*3);
        this.pOp2 = tm.alloc(F.n8*3);
        this.pOp3 = tm.alloc(F.n8*3);
        this.tm.instance.exports[prefix + "_zero"](this.pOp1);
        this.zero = this.tm.getBuff(this.pOp1, F.n8*3);
        this.tm.instance.exports[prefix + "_zeroAffine"](this.pOp1);
        this.zeroAffine = this.tm.getBuff(this.pOp1, F.n8*2);
        this.one = this.tm.getBuff(pGen, F.n8*3);
        this.g = this.one;
        this.oneAffine = this.tm.getBuff(pGen, F.n8*2);
        this.gAffine = this.oneAffine;
        this.b = this.tm.getBuff(pGb, F.n8);

        if (cofactor) {
            this.cofactor = toLEBuff(cofactor);
        }

        this.negone = this.neg(this.one);
        this.two = this.add(this.one, this.one);

        this.batchLEMtoC = buildBatchConvert(tm, prefix + "_batchLEMtoC", F.n8*2, F.n8);
        this.batchLEMtoU = buildBatchConvert(tm, prefix + "_batchLEMtoU", F.n8*2, F.n8*2);
        this.batchCtoLEM = buildBatchConvert(tm, prefix + "_batchCtoLEM", F.n8, F.n8*2);
        this.batchUtoLEM = buildBatchConvert(tm, prefix + "_batchUtoLEM", F.n8*2, F.n8*2);
        this.batchToJacobian = buildBatchConvert(tm, prefix + "_batchToJacobian", F.n8*2, F.n8*3);
        this.batchToAffine = buildBatchConvert(tm, prefix + "_batchToAffine", F.n8*3, F.n8*2);
    }

    op2(opName, a, b) {
        this.tm.setBuff(this.pOp1, a);
        this.tm.setBuff(this.pOp2, b);
        this.tm.instance.exports[this.prefix + opName](this.pOp1, this.pOp2, this.pOp3);
        return this.tm.getBuff(this.pOp3, this.F.n8*3);
    }

    op2bool(opName, a, b) {
        this.tm.setBuff(this.pOp1, a);
        this.tm.setBuff(this.pOp2, b);
        return !!this.tm.instance.exports[this.prefix + opName](this.pOp1, this.pOp2, this.pOp3);
    }

    op1(opName, a) {
        this.tm.setBuff(this.pOp1, a);
        this.tm.instance.exports[this.prefix + opName](this.pOp1, this.pOp3);
        return this.tm.getBuff(this.pOp3, this.F.n8*3);
    }

    op1Affine(opName, a) {
        this.tm.setBuff(this.pOp1, a);
        this.tm.instance.exports[this.prefix + opName](this.pOp1, this.pOp3);
        return this.tm.getBuff(this.pOp3, this.F.n8*2);
    }

    op1Bool(opName, a) {
        this.tm.setBuff(this.pOp1, a);
        return !!this.tm.instance.exports[this.prefix + opName](this.pOp1, this.pOp3);
    }

    add(a,b) {
        if (a.byteLength == this.F.n8*3) {
            if (b.byteLength == this.F.n8*3) {
                return this.op2("_add", a, b);
            } else if (b.byteLength == this.F.n8*2) {
                return this.op2("_addMixed", a, b);
            } else {
                throw new Error("invalid point size");
            }
        } else if (a.byteLength == this.F.n8*2) {
            if (b.byteLength == this.F.n8*3) {
                return this.op2("_addMixed", b, a);
            } else if (b.byteLength == this.F.n8*2) {
                return this.op2("_addAffine", a, b);
            } else {
                throw new Error("invalid point size");
            }
        } else {
            throw new Error("invalid point size");
        }
    }

    sub(a,b) {
        if (a.byteLength == this.F.n8*3) {
            if (b.byteLength == this.F.n8*3) {
                return this.op2("_sub", a, b);
            } else if (b.byteLength == this.F.n8*2) {
                return this.op2("_subMixed", a, b);
            } else {
                throw new Error("invalid point size");
            }
        } else if (a.byteLength == this.F.n8*2) {
            if (b.byteLength == this.F.n8*3) {
                return this.op2("_subMixed", b, a);
            } else if (b.byteLength == this.F.n8*2) {
                return this.op2("_subAffine", a, b);
            } else {
                throw new Error("invalid point size");
            }
        } else {
            throw new Error("invalid point size");
        }
    }

    neg(a) {
        if (a.byteLength == this.F.n8*3) {
            return this.op1("_neg", a);
        } else if (a.byteLength == this.F.n8*2) {
            return this.op1Affine("_negAffine", a);
        } else {
            throw new Error("invalid point size");
        }
    }

    double(a) {
        if (a.byteLength == this.F.n8*3) {
            return this.op1("_double", a);
        } else if (a.byteLength == this.F.n8*2) {
            return this.op1("_doubleAffine", a);
        } else {
            throw new Error("invalid point size");
        }
    }

    isZero(a) {
        if (a.byteLength == this.F.n8*3) {
            return this.op1Bool("_isZero", a);
        } else if (a.byteLength == this.F.n8*2) {
            return this.op1Bool("_isZeroAffine", a);
        } else {
            throw new Error("invalid point size");
        }
    }

    timesScalar(a, s) {
        if (!(s instanceof Uint8Array)) {
            s = toLEBuff(e(s));
        }
        let fnName;
        if (a.byteLength == this.F.n8*3) {
            fnName = this.prefix + "_timesScalar";
        } else if (a.byteLength == this.F.n8*2) {
            fnName = this.prefix + "_timesScalarAffine";
        } else {
            throw new Error("invalid point size");
        }
        this.tm.setBuff(this.pOp1, a);
        this.tm.setBuff(this.pOp2, s);
        this.tm.instance.exports[fnName](this.pOp1, this.pOp2, s.byteLength, this.pOp3);
        return this.tm.getBuff(this.pOp3, this.F.n8*3);
    }

    timesFr(a, s) {
        let fnName;
        if (a.byteLength == this.F.n8*3) {
            fnName = this.prefix + "_timesFr";
        } else if (a.byteLength == this.F.n8*2) {
            fnName = this.prefix + "_timesFrAffine";
        } else {
            throw new Error("invalid point size");
        }
        this.tm.setBuff(this.pOp1, a);
        this.tm.setBuff(this.pOp2, s);
        this.tm.instance.exports[fnName](this.pOp1, this.pOp2, this.pOp3);
        return this.tm.getBuff(this.pOp3, this.F.n8*3);
    }

    eq(a,b) {
        if (a.byteLength == this.F.n8*3) {
            if (b.byteLength == this.F.n8*3) {
                return this.op2bool("_eq", a, b);
            } else if (b.byteLength == this.F.n8*2) {
                return this.op2bool("_eqMixed", a, b);
            } else {
                throw new Error("invalid point size");
            }
        } else if (a.byteLength == this.F.n8*2) {
            if (b.byteLength == this.F.n8*3) {
                return this.op2bool("_eqMixed", b, a);
            } else if (b.byteLength == this.F.n8*2) {
                return this.op2bool("_eqAffine", a, b);
            } else {
                throw new Error("invalid point size");
            }
        } else {
            throw new Error("invalid point size");
        }
    }

    toAffine(a) {
        if (a.byteLength == this.F.n8*3) {
            return this.op1Affine("_toAffine", a);
        } else if (a.byteLength == this.F.n8*2) {
            return a;
        } else {
            throw new Error("invalid point size");
        }
    }

    toJacobian(a) {
        if (a.byteLength == this.F.n8*3) {
            return a;
        } else if (a.byteLength == this.F.n8*2) {
            return this.op1("_toJacobian", a);
        } else {
            throw new Error("invalid point size");
        }
    }

    toRprUncompressed(arr, offset, a) {
        this.tm.setBuff(this.pOp1, a);
        if (a.byteLength == this.F.n8*3) {
            this.tm.instance.exports[this.prefix + "_toAffine"](this.pOp1, this.pOp1);
        } else if (a.byteLength != this.F.n8*2) {
            throw new Error("invalid point size");
        }
        this.tm.instance.exports[this.prefix + "_LEMtoU"](this.pOp1, this.pOp1);
        const res = this.tm.getBuff(this.pOp1, this.F.n8*2);
        arr.set(res, offset);
    }

    fromRprUncompressed(arr, offset) {
        const buff = arr.slice(offset, offset + this.F.n8*2);
        this.tm.setBuff(this.pOp1, buff);
        this.tm.instance.exports[this.prefix + "_UtoLEM"](this.pOp1, this.pOp1);
        return this.tm.getBuff(this.pOp1, this.F.n8*2);
    }

    toRprCompressed(arr, offset, a) {
        this.tm.setBuff(this.pOp1, a);
        if (a.byteLength == this.F.n8*3) {
            this.tm.instance.exports[this.prefix + "_toAffine"](this.pOp1, this.pOp1);
        } else if (a.byteLength != this.F.n8*2) {
            throw new Error("invalid point size");
        }
        this.tm.instance.exports[this.prefix + "_LEMtoC"](this.pOp1, this.pOp1);
        const res = this.tm.getBuff(this.pOp1, this.F.n8);
        arr.set(res, offset);
    }

    fromRprCompressed(arr, offset) {
        const buff = arr.slice(offset, offset + this.F.n8);
        this.tm.setBuff(this.pOp1, buff);
        this.tm.instance.exports[this.prefix + "_CtoLEM"](this.pOp1, this.pOp2);
        return this.tm.getBuff(this.pOp2, this.F.n8*2);
    }

    toUncompressed(a) {
        const buff = new Uint8Array(this.F.n8*2);
        this.toRprUncompressed(buff, 0, a);
        return buff;
    }

    toRprLEM(arr, offset, a) {
        if (a.byteLength == this.F.n8*2) {
            arr.set(a, offset);
            return;
        } else if (a.byteLength == this.F.n8*3) {
            this.tm.setBuff(this.pOp1, a);
            this.tm.instance.exports[this.prefix + "_toAffine"](this.pOp1, this.pOp1);
            const res = this.tm.getBuff(this.pOp1, this.F.n8*2);
            arr.set(res, offset);
        } else {
            throw new Error("invalid point size");
        }
    }

    fromRprLEM(arr, offset) {
        offset = offset || 0;
        return arr.slice(offset, offset+this.F.n8*2);
    }

    toString(a, radix) {
        if (a.byteLength == this.F.n8*3) {
            const x = this.F.toString(a.slice(0, this.F.n8), radix);
            const y = this.F.toString(a.slice(this.F.n8, this.F.n8*2), radix);
            const z = this.F.toString(a.slice(this.F.n8*2), radix);
            return `[ ${x}, ${y}, ${z} ]`;
        } else if (a.byteLength == this.F.n8*2) {
            const x = this.F.toString(a.slice(0, this.F.n8), radix);
            const y = this.F.toString(a.slice(this.F.n8), radix);
            return `[ ${x}, ${y} ]`;
        } else {
            throw new Error("invalid point size");
        }
    }

    isValid(a) {
        if (this.isZero(a)) return true;
        const F = this.F;
        const aa = this.toAffine(a);
        const x = aa.slice(0, this.F.n8);
        const y = aa.slice(this.F.n8, this.F.n8*2);
        const x3b = F.add(F.mul(F.square(x),x), this.b);
        const y2 = F.square(y);
        return F.eq(x3b, y2);
    }

    fromRng(rng) {
        const F = this.F;
        let P = [];
        let greatest;
        let x3b;
        do {
            P[0] = F.fromRng(rng);
            greatest = rng.nextBool();
            x3b = F.add(F.mul(F.square(P[0]), P[0]), this.b);
        } while (!F.isSquare(x3b));

        P[1] = F.sqrt(x3b);

        const s = F.isNegative(P[1]);
        if (greatest ^ s) P[1] = F.neg(P[1]);

        let Pbuff = new Uint8Array(this.F.n8*2);
        Pbuff.set(P[0]);
        Pbuff.set(P[1], this.F.n8);

        if (this.cofactor) {
            Pbuff = this.timesScalar(Pbuff, this.cofactor);
        }

        return Pbuff;
    }



    toObject(a) {
        if (this.isZero(a)) {
            return [
                this.F.toObject(this.F.zero),
                this.F.toObject(this.F.one),
                this.F.toObject(this.F.zero),
            ];
        }
        const x = this.F.toObject(a.slice(0, this.F.n8));
        const y = this.F.toObject(a.slice(this.F.n8, this.F.n8*2));
        let z;
        if (a.byteLength == this.F.n8*3) {
            z = this.F.toObject(a.slice(this.F.n8*2, this.F.n8*3));
        } else {
            z = this.F.toObject(this.F.one);
        }
        return [x, y, z];
    }

    fromObject(a) {
        const x = this.F.fromObject(a[0]);
        const y = this.F.fromObject(a[1]);
        let z;
        if (a.length==3) {
            z = this.F.fromObject(a[2]);
        } else {
            z = this.F.one;
        }
        if (this.F.isZero(z, this.F.one)) {
            return this.zeroAffine;
        } else if (this.F.eq(z, this.F.one)) {
            const buff = new Uint8Array(this.F.n8*2);
            buff.set(x);
            buff.set(y, this.F.n8);
            return buff;
        } else {
            const buff = new Uint8Array(this.F.n8*3);
            buff.set(x);
            buff.set(y, this.F.n8);
            buff.set(z, this.F.n8*2);
            return buff;
        }
    }

    e(a) {
        if (a instanceof Uint8Array) return a;
        return this.fromObject(a);
    }

    x(a) {
        const tmp = this.toAffine(a);
        return tmp.slice(0, this.F.n8);
    }

    y(a) {
        const tmp = this.toAffine(a);
        return tmp.slice(this.F.n8);
    }

}

/* global WebAssembly */

function thread(self) {
    const MAXMEM = 32767;
    let instance;
    let memory;

    if (self) {
        self.onmessage = function(e) {
            let data;
            if (e.data) {
                data = e.data;
            } else {
                data = e;
            }

            if (data[0].cmd == "INIT") {
                init(data[0]).then(function() {
                    self.postMessage(data.result);
                });
            } else if (data[0].cmd == "TERMINATE") {
                self.close();
            } else {
                const res = runTask(data);
                self.postMessage(res);
            }
        };
    }

    async function init(data) {
        const code = new Uint8Array(data.code);
        const wasmModule = await WebAssembly.compile(code);
        memory = new WebAssembly.Memory({initial:data.init, maximum: MAXMEM});

        instance = await WebAssembly.instantiate(wasmModule, {
            env: {
                "memory": memory
            }
        });
    }



    function alloc(length) {
        const u32 = new Uint32Array(memory.buffer, 0, 1);
        while (u32[0] & 3) u32[0]++;  // Return always aligned pointers
        const res = u32[0];
        u32[0] += length;
        if (u32[0] + length > memory.buffer.byteLength) {
            const currentPages = memory.buffer.byteLength / 0x10000;
            let requiredPages = Math.floor((u32[0] + length) / 0x10000)+1;
            if (requiredPages>MAXMEM) requiredPages=MAXMEM;
            memory.grow(requiredPages-currentPages);
        }
        return res;
    }

    function allocBuffer(buffer) {
        const p = alloc(buffer.byteLength);
        setBuffer(p, buffer);
        return p;
    }

    function getBuffer(pointer, length) {
        const u8 = new Uint8Array(memory.buffer);
        return new Uint8Array(u8.buffer, u8.byteOffset + pointer, length);
    }

    function setBuffer(pointer, buffer) {
        const u8 = new Uint8Array(memory.buffer);
        u8.set(new Uint8Array(buffer), pointer);
    }

    function runTask(task) {
        if (task[0].cmd == "INIT") {
            return init(task[0]);
        }
        const ctx = {
            vars: [],
            out: []
        };
        const u32a = new Uint32Array(memory.buffer, 0, 1);
        const oldAlloc = u32a[0];
        for (let i=0; i<task.length; i++) {
            switch (task[i].cmd) {
            case "ALLOCSET":
                ctx.vars[task[i].var] = allocBuffer(task[i].buff);
                break;
            case "ALLOC":
                ctx.vars[task[i].var] = alloc(task[i].len);
                break;
            case "SET":
                setBuffer(ctx.vars[task[i].var], task[i].buff);
                break;
            case "CALL": {
                const params = [];
                for (let j=0; j<task[i].params.length; j++) {
                    const p = task[i].params[j];
                    if (typeof p.var !== "undefined") {
                        params.push(ctx.vars[p.var] + (p.offset || 0));
                    } else if (typeof p.val != "undefined") {
                        params.push(p.val);
                    }
                }
                instance.exports[task[i].fnName](...params);
                break;
            }
            case "GET":
                ctx.out[task[i].out] = getBuffer(ctx.vars[task[i].var], task[i].len).slice();
                break;
            default:
                throw new Error("Invalid cmd");
            }
        }
        const u32b = new Uint32Array(memory.buffer, 0, 1);
        u32b[0] = oldAlloc;
        return ctx.out;
    }


    return runTask;
}

/*
    Copyright 2019 0KIMS association.

    This file is part of wasmsnark (Web Assembly zkSnark Prover).

    wasmsnark is a free software: you can redistribute it and/or modify it
    under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    wasmsnark is distributed in the hope that it will be useful, but WITHOUT
    ANY WARRANTY; without even the implied warranty of MERCHANTABILITY
    or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public
    License for more details.

    You should have received a copy of the GNU General Public License
    along with wasmsnark. If not, see <https://www.gnu.org/licenses/>.
*/

// const MEM_SIZE = 1000;  // Memory size in 64K Pakes (512Mb)
const MEM_SIZE = 25;  // Memory size in 64K Pakes (1600Kb)

class Deferred {
    constructor() {
        this.promise = new Promise((resolve, reject)=> {
            this.reject = reject;
            this.resolve = resolve;
        });
    }
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function stringToBase64(str) {
    if (process.browser) {
        return globalThis.btoa(str);
    } else {
        return Buffer.from(str).toString("base64");
    }
}

const threadSource = stringToBase64("(" + thread.toString() + ")(self)");
const workerSource = "data:application/javascript;base64," + threadSource;



async function buildThreadManager(wasm, singleThread) {
    const tm = new ThreadManager();

    tm.memory = new WebAssembly.Memory({initial:MEM_SIZE});
    tm.u8 = new Uint8Array(tm.memory.buffer);
    tm.u32 = new Uint32Array(tm.memory.buffer);

    const wasmModule = await WebAssembly.compile(wasm.code);

    tm.instance = await WebAssembly.instantiate(wasmModule, {
        env: {
            "memory": tm.memory
        }
    });

    tm.singleThread = singleThread;
    tm.initalPFree = tm.u32[0];   // Save the Pointer to free space.
    tm.pq = wasm.pq;
    tm.pr = wasm.pr;
    tm.pG1gen = wasm.pG1gen;
    tm.pG1zero = wasm.pG1zero;
    tm.pG2gen = wasm.pG2gen;
    tm.pG2zero = wasm.pG2zero;
    tm.pOneT = wasm.pOneT;

    //    tm.pTmp0 = tm.alloc(curve.G2.F.n8*3);
    //    tm.pTmp1 = tm.alloc(curve.G2.F.n8*3);


    if (singleThread) {
        tm.code = wasm.code;
        tm.taskManager = thread();
        await tm.taskManager([{
            cmd: "INIT",
            init: MEM_SIZE,
            code: tm.code.slice()
        }]);
        tm.concurrency  = 1;
    } else {
        tm.workers = [];
        tm.pendingDeferreds = [];
        tm.working = [];

        let concurrency = 2;
        if (process.browser) {
          if (typeof navigator === "object" && navigator.hardwareConcurrency) {
            concurrency = navigator.hardwareConcurrency;
          }
        } else {
          concurrency = os.cpus().length;
        }

        if(concurrency == 0){
            concurrency = 2;
        }

        // Limit to 64 threads for memory reasons.
        if (concurrency>64) concurrency=64;
        tm.concurrency = concurrency;

        for (let i = 0; i<concurrency; i++) {

            tm.workers[i] = new Worker(workerSource);

            tm.workers[i].addEventListener("message", getOnMsg(i));

            tm.working[i]=false;
        }

        const initPromises = [];
        for (let i=0; i<tm.workers.length;i++) {
            const copyCode = wasm.code.slice();
            initPromises.push(tm.postAction(i, [{
                cmd: "INIT",
                init: MEM_SIZE,
                code: copyCode
            }], [copyCode.buffer]));
        }

        await Promise.all(initPromises);

    }
    return tm;

    function getOnMsg(i) {
        return function(e) {
            let data;
            if ((e)&&(e.data)) {
                data = e.data;
            } else {
                data = e;
            }

            tm.working[i]=false;
            tm.pendingDeferreds[i].resolve(data);
            tm.processWorks();
        };
    }

}

class ThreadManager {
    constructor() {
        this.actionQueue = [];
        this.oldPFree = 0;
    }

    startSyncOp() {
        if (this.oldPFree != 0) throw new Error("Sync operation in progress");
        this.oldPFree = this.u32[0];
    }

    endSyncOp() {
        if (this.oldPFree == 0) throw new Error("No sync operation in progress");
        this.u32[0] = this.oldPFree;
        this.oldPFree = 0;
    }

    postAction(workerId, e, transfers, _deferred) {
        if (this.working[workerId]) {
            throw new Error("Posting a job t a working worker");
        }
        this.working[workerId] = true;

        this.pendingDeferreds[workerId] = _deferred ? _deferred : new Deferred();
        this.workers[workerId].postMessage(e, transfers);

        return this.pendingDeferreds[workerId].promise;
    }

    processWorks() {
        for (let i=0; (i<this.workers.length)&&(this.actionQueue.length > 0); i++) {
            if (this.working[i] == false) {
                const work = this.actionQueue.shift();
                this.postAction(i, work.data, work.transfers, work.deferred);
            }
        }
    }

    queueAction(actionData, transfers) {
        const d = new Deferred();

        if (this.singleThread) {
            const res = this.taskManager(actionData);
            d.resolve(res);
        } else {
            this.actionQueue.push({
                data: actionData,
                transfers: transfers,
                deferred: d
            });
            this.processWorks();
        }
        return d.promise;
    }

    resetMemory() {
        this.u32[0] = this.initalPFree;
    }

    allocBuff(buff) {
        const pointer = this.alloc(buff.byteLength);
        this.setBuff(pointer, buff);
        return pointer;
    }

    getBuff(pointer, length) {
        return this.u8.slice(pointer, pointer+ length);
    }

    setBuff(pointer, buffer) {
        this.u8.set(new Uint8Array(buffer), pointer);
    }

    alloc(length) {
        while (this.u32[0] & 3) this.u32[0]++;  // Return always aligned pointers
        const res = this.u32[0];
        this.u32[0] += length;
        return res;
    }

    async terminate() {
        for (let i=0; i<this.workers.length; i++) {
            this.workers[i].postMessage([{cmd: "TERMINATE"}]);
        }
        await sleep(200);
    }

}

function buildBatchApplyKey(curve, groupName) {
    const G = curve[groupName];
    const Fr = curve.Fr;
    const tm = curve.tm;

    curve[groupName].batchApplyKey = async function(buff, first, inc, inType, outType) {
        inType = inType || "affine";
        outType = outType || "affine";
        let fnName, fnAffine;
        let sGin, sGmid, sGout;
        if (groupName == "G1") {
            if (inType == "jacobian") {
                sGin = G.F.n8*3;
                fnName = "g1m_batchApplyKey";
            } else {
                sGin = G.F.n8*2;
                fnName = "g1m_batchApplyKeyMixed";
            }
            sGmid = G.F.n8*3;
            if (outType == "jacobian") {
                sGout = G.F.n8*3;
            } else {
                fnAffine = "g1m_batchToAffine";
                sGout = G.F.n8*2;
            }
        } else if (groupName == "G2") {
            if (inType == "jacobian") {
                sGin = G.F.n8*3;
                fnName = "g2m_batchApplyKey";
            } else {
                sGin = G.F.n8*2;
                fnName = "g2m_batchApplyKeyMixed";
            }
            sGmid = G.F.n8*3;
            if (outType == "jacobian") {
                sGout = G.F.n8*3;
            } else {
                fnAffine = "g2m_batchToAffine";
                sGout = G.F.n8*2;
            }
        } else if (groupName == "Fr") {
            fnName = "frm_batchApplyKey";
            sGin = G.n8;
            sGmid = G.n8;
            sGout = G.n8;
        } else {
            throw new Error("Invalid group: " + groupName);
        }
        const nPoints = Math.floor(buff.byteLength / sGin);
        const pointsPerChunk = Math.floor(nPoints/tm.concurrency);
        const opPromises = [];
        inc = Fr.e(inc);
        let t = Fr.e(first);
        for (let i=0; i<tm.concurrency; i++) {
            let n;
            if (i< tm.concurrency-1) {
                n = pointsPerChunk;
            } else {
                n = nPoints - i*pointsPerChunk;
            }
            if (n==0) continue;

            const task = [];

            task.push({
                cmd: "ALLOCSET",
                var: 0,
                buff: buff.slice(i*pointsPerChunk*sGin, i*pointsPerChunk*sGin + n*sGin)
            });
            task.push({cmd: "ALLOCSET", var: 1, buff: t});
            task.push({cmd: "ALLOCSET", var: 2, buff: inc});
            task.push({cmd: "ALLOC", var: 3, len: n*Math.max(sGmid, sGout)});
            task.push({
                cmd: "CALL",
                fnName: fnName,
                params: [
                    {var: 0},
                    {val: n},
                    {var: 1},
                    {var: 2},
                    {var:3}
                ]
            });
            if (fnAffine) {
                task.push({
                    cmd: "CALL",
                    fnName: fnAffine,
                    params: [
                        {var: 3},
                        {val: n},
                        {var: 3},
                    ]
                });
            }
            task.push({cmd: "GET", out: 0, var: 3, len: n*sGout});

            opPromises.push(tm.queueAction(task));
            t = Fr.mul(t, Fr.exp(inc, n));
        }

        const result = await Promise.all(opPromises);

        let outBuff;
        if (buff instanceof BigBuffer) {
            outBuff = new BigBuffer(nPoints*sGout);
        } else {
            outBuff = new Uint8Array(nPoints*sGout);
        }

        let p=0;
        for (let i=0; i<result.length; i++) {
            outBuff.set(result[i][0], p);
            p += result[i][0].byteLength;
        }

        return outBuff;
    };
}

function buildPairing(curve) {
    const tm = curve.tm;
    curve.pairing = function pairing(a, b) {

        tm.startSyncOp();
        const pA = tm.allocBuff(curve.G1.toJacobian(a));
        const pB = tm.allocBuff(curve.G2.toJacobian(b));
        const pRes = tm.alloc(curve.Gt.n8);
        tm.instance.exports[curve.name + "_pairing"](pA, pB, pRes);

        const res = tm.getBuff(pRes, curve.Gt.n8);

        tm.endSyncOp();
        return res;
    };

    curve.pairingEq = async function pairingEq() {
        let  buffCt;
        let nEqs;
        if ((arguments.length % 2) == 1) {
            buffCt = arguments[arguments.length-1];
            nEqs = (arguments.length -1) /2;
        } else {
            buffCt = curve.Gt.one;
            nEqs = arguments.length /2;
        }

        const opPromises = [];
        for (let i=0; i<nEqs; i++) {

            const task = [];

            const g1Buff = curve.G1.toJacobian(arguments[i*2]);
            task.push({cmd: "ALLOCSET", var: 0, buff: g1Buff});
            task.push({cmd: "ALLOC", var: 1, len: curve.prePSize});

            const g2Buff = curve.G2.toJacobian(arguments[i*2 +1]);
            task.push({cmd: "ALLOCSET", var: 2, buff: g2Buff});
            task.push({cmd: "ALLOC", var: 3, len: curve.preQSize});

            task.push({cmd: "ALLOC", var: 4, len: curve.Gt.n8});

            task.push({cmd: "CALL", fnName: curve.name + "_prepareG1", params: [
                {var: 0},
                {var: 1}
            ]});

            task.push({cmd: "CALL", fnName: curve.name + "_prepareG2", params: [
                {var: 2},
                {var: 3}
            ]});

            task.push({cmd: "CALL", fnName: curve.name + "_millerLoop", params: [
                {var: 1},
                {var: 3},
                {var: 4}
            ]});

            task.push({cmd: "GET", out: 0, var: 4, len: curve.Gt.n8});

            opPromises.push(
                tm.queueAction(task)
            );
        }


        const result = await Promise.all(opPromises);

        tm.startSyncOp();
        const pRes = tm.alloc(curve.Gt.n8);
        tm.instance.exports.ftm_one(pRes);

        for (let i=0; i<result.length; i++) {
            const pMR = tm.allocBuff(result[i][0]);
            tm.instance.exports.ftm_mul(pRes, pMR, pRes);
        }
        tm.instance.exports[curve.name + "_finalExponentiation"](pRes, pRes);

        const pCt = tm.allocBuff(buffCt);

        const r = !!tm.instance.exports.ftm_eq(pRes, pCt);

        tm.endSyncOp();

        return r;
    };

    curve.prepareG1 = function(p) {
        this.tm.startSyncOp();
        const pP = this.tm.allocBuff(p);
        const pPrepP = this.tm.alloc(this.prePSize);
        this.tm.instance.exports[this.name + "_prepareG1"](pP, pPrepP);
        const res = this.tm.getBuff(pPrepP, this.prePSize);
        this.tm.endSyncOp();
        return res;
    };

    curve.prepareG2 = function(q) {
        this.tm.startSyncOp();
        const pQ = this.tm.allocBuff(q);
        const pPrepQ = this.tm.alloc(this.preQSize);
        this.tm.instance.exports[this.name + "_prepareG2"](pQ, pPrepQ);
        const res = this.tm.getBuff(pPrepQ, this.preQSize);
        this.tm.endSyncOp();
        return res;
    };

    curve.millerLoop = function(preP, preQ) {
        this.tm.startSyncOp();
        const pPreP = this.tm.allocBuff(preP);
        const pPreQ = this.tm.allocBuff(preQ);
        const pRes = this.tm.alloc(this.Gt.n8);
        this.tm.instance.exports[this.name + "_millerLoop"](pPreP, pPreQ, pRes);
        const res = this.tm.getBuff(pRes, this.Gt.n8);
        this.tm.endSyncOp();
        return res;
    };

    curve.finalExponentiation = function(a) {
        this.tm.startSyncOp();
        const pA = this.tm.allocBuff(a);
        const pRes = this.tm.alloc(this.Gt.n8);
        this.tm.instance.exports[this.name + "_finalExponentiation"](pA, pRes);
        const res = this.tm.getBuff(pRes, this.Gt.n8);
        this.tm.endSyncOp();
        return res;
    };

}

const pTSizes = [
    1 ,  1,  1,  1,    2,  3,  4,  5,
    6 ,  7,  7,  8,    9, 10, 11, 12,
    13, 13, 14, 15,   16, 16, 17, 17,
    17, 17, 17, 17,   17, 17, 17, 17
];

function buildMultiexp(curve, groupName) {
    const G = curve[groupName];
    const tm = G.tm;
    async function _multiExpChunk(buffBases, buffScalars, inType, logger, logText) {
        if ( ! (buffBases instanceof Uint8Array) ) {
            if (logger) logger.error(`${logText} _multiExpChunk buffBases is not Uint8Array`);
            throw new Error(`${logText} _multiExpChunk buffBases is not Uint8Array`);
        }
        if ( ! (buffScalars instanceof Uint8Array) ) {
            if (logger) logger.error(`${logText} _multiExpChunk buffScalars is not Uint8Array`);
            throw new Error(`${logText} _multiExpChunk buffScalars is not Uint8Array`);
        }
        inType = inType || "affine";

        let sGIn;
        let fnName;
        if (groupName == "G1") {
            if (inType == "affine") {
                fnName = "g1m_multiexpAffine_chunk";
                sGIn = G.F.n8*2;
            } else {
                fnName = "g1m_multiexp_chunk";
                sGIn = G.F.n8*3;
            }
        } else if (groupName == "G2") {
            if (inType == "affine") {
                fnName = "g2m_multiexpAffine_chunk";
                sGIn = G.F.n8*2;
            } else {
                fnName = "g2m_multiexp_chunk";
                sGIn = G.F.n8*3;
            }
        } else {
            throw new Error("Invalid group");
        }
        const nPoints = Math.floor(buffBases.byteLength / sGIn);

        if (nPoints == 0) return G.zero;
        const sScalar = Math.floor(buffScalars.byteLength / nPoints);
        if( sScalar * nPoints != buffScalars.byteLength) {
            throw new Error("Scalar size does not match");
        }

        const bitChunkSize = pTSizes[log2(nPoints)];
        const nChunks = Math.floor((sScalar*8 - 1) / bitChunkSize) +1;

        const opPromises = [];
        for (let i=0; i<nChunks; i++) {
            const task = [
                {cmd: "ALLOCSET", var: 0, buff: buffBases},
                {cmd: "ALLOCSET", var: 1, buff: buffScalars},
                {cmd: "ALLOC", var: 2, len: G.F.n8*3},
                {cmd: "CALL", fnName: fnName, params: [
                    {var: 0},
                    {var: 1},
                    {val: sScalar},
                    {val: nPoints},
                    {val: i*bitChunkSize},
                    {val: Math.min(sScalar*8 - i*bitChunkSize, bitChunkSize)},
                    {var: 2}
                ]},
                {cmd: "GET", out: 0, var: 2, len: G.F.n8*3}
            ];
            opPromises.push(
                G.tm.queueAction(task)
            );
        }

        const result = await Promise.all(opPromises);

        let res = G.zero;
        for (let i=result.length-1; i>=0; i--) {
            if (!G.isZero(res)) {
                for (let j=0; j<bitChunkSize; j++) res = G.double(res);
            }
            res = G.add(res, result[i][0]);
        }

        return res;
    }

    async function _multiExp(buffBases, buffScalars, inType, logger, logText) {
        const MAX_CHUNK_SIZE = 1 << 22;
        const MIN_CHUNK_SIZE = 1 << 10;
        let sGIn;

        if (groupName == "G1") {
            if (inType == "affine") {
                sGIn = G.F.n8*2;
            } else {
                sGIn = G.F.n8*3;
            }
        } else if (groupName == "G2") {
            if (inType == "affine") {
                sGIn = G.F.n8*2;
            } else {
                sGIn = G.F.n8*3;
            }
        } else {
            throw new Error("Invalid group");
        }

        const nPoints = Math.floor(buffBases.byteLength / sGIn);
        const sScalar = Math.floor(buffScalars.byteLength / nPoints);
        if( sScalar * nPoints != buffScalars.byteLength) {
            throw new Error("Scalar size does not match");
        }

        const bitChunkSize = pTSizes[log2(nPoints)];
        const nChunks = Math.floor((sScalar*8 - 1) / bitChunkSize) +1;

        let chunkSize;
        chunkSize = Math.floor(nPoints / (tm.concurrency /nChunks));
        if (chunkSize>MAX_CHUNK_SIZE) chunkSize = MAX_CHUNK_SIZE;
        if (chunkSize<MIN_CHUNK_SIZE) chunkSize = MIN_CHUNK_SIZE;

        const opPromises = [];
        for (let i=0; i<nPoints; i += chunkSize) {
            if (logger) logger.debug(`Multiexp start: ${logText}: ${i}/${nPoints}`);
            const n= Math.min(nPoints - i, chunkSize);
            const buffBasesChunk = buffBases.slice(i*sGIn, (i+n)*sGIn);
            const buffScalarsChunk = buffScalars.slice(i*sScalar, (i+n)*sScalar);
            opPromises.push(_multiExpChunk(buffBasesChunk, buffScalarsChunk, inType, logger, logText).then( (r) => {
                if (logger) logger.debug(`Multiexp end: ${logText}: ${i}/${nPoints}`);
                return r;
            }));
        }

        const result = await Promise.all(opPromises);

        let res = G.zero;
        for (let i=result.length-1; i>=0; i--) {
            res = G.add(res, result[i]);
        }

        return res;
    }

    G.multiExp = async function multiExpAffine(buffBases, buffScalars, logger, logText) {
        return await _multiExp(buffBases, buffScalars, "jacobian", logger, logText);
    };
    G.multiExpAffine = async function multiExpAffine(buffBases, buffScalars, logger, logText) {
        return await _multiExp(buffBases, buffScalars, "affine", logger, logText);
    };
}

function buildFFT(curve, groupName) {
    const G = curve[groupName];
    const Fr = curve.Fr;
    const tm = G.tm;
    async function _fft(buff, inverse, inType, outType, logger, loggerTxt) {

        inType = inType || "affine";
        outType = outType || "affine";
        const MAX_BITS_THREAD = 14;

        let sIn, sMid, sOut, fnIn2Mid, fnMid2Out, fnFFTMix, fnFFTJoin, fnFFTFinal;
        if (groupName == "G1") {
            if (inType == "affine") {
                sIn = G.F.n8*2;
                fnIn2Mid = "g1m_batchToJacobian";
            } else {
                sIn = G.F.n8*3;
            }
            sMid = G.F.n8*3;
            if (inverse) {
                fnFFTFinal = "g1m_fftFinal";
            }
            fnFFTJoin = "g1m_fftJoin";
            fnFFTMix = "g1m_fftMix";

            if (outType == "affine") {
                sOut = G.F.n8*2;
                fnMid2Out = "g1m_batchToAffine";
            } else {
                sOut = G.F.n8*3;
            }

        } else if (groupName == "G2") {
            if (inType == "affine") {
                sIn = G.F.n8*2;
                fnIn2Mid = "g2m_batchToJacobian";
            } else {
                sIn = G.F.n8*3;
            }
            sMid = G.F.n8*3;
            if (inverse) {
                fnFFTFinal = "g2m_fftFinal";
            }
            fnFFTJoin = "g2m_fftJoin";
            fnFFTMix = "g2m_fftMix";
            if (outType == "affine") {
                sOut = G.F.n8*2;
                fnMid2Out = "g2m_batchToAffine";
            } else {
                sOut = G.F.n8*3;
            }
        } else if (groupName == "Fr") {
            sIn = G.n8;
            sMid = G.n8;
            sOut = G.n8;
            if (inverse) {
                fnFFTFinal = "frm_fftFinal";
            }
            fnFFTMix = "frm_fftMix";
            fnFFTJoin = "frm_fftJoin";
        }


        let returnArray = false;
        if (Array.isArray(buff)) {
            buff = array2buffer(buff, sIn);
            returnArray = true;
        } else {
            buff = buff.slice(0, buff.byteLength);
        }

        const nPoints = buff.byteLength / sIn;
        const bits = log2(nPoints);

        if  ((1 << bits) != nPoints) {
            throw new Error("fft must be multiple of 2" );
        }

        if (bits == Fr.s +1) {
            let buffOut;

            if (inverse) {
                buffOut =  await _fftExtInv(buff, inType, outType, logger, loggerTxt);
            } else {
                buffOut =  await _fftExt(buff, inType, outType, logger, loggerTxt);
            }

            if (returnArray) {
                return buffer2array(buffOut, sOut);
            } else {
                return buffOut;
            }
        }

        let inv;
        if (inverse) {
            inv = Fr.inv(Fr.e(nPoints));
        }

        let buffOut;

        buffReverseBits(buff, sIn);

        let chunks;
        let pointsInChunk = Math.min(1 << MAX_BITS_THREAD, nPoints);
        let nChunks = nPoints / pointsInChunk;

        while ((nChunks < tm.concurrency)&&(pointsInChunk>=16)) {
            nChunks *= 2;
            pointsInChunk /= 2;
        }

        const l2Chunk = log2(pointsInChunk);

        const promises = [];
        for (let i = 0; i< nChunks; i++) {
            if (logger) logger.debug(`${loggerTxt}: fft ${bits} mix start: ${i}/${nChunks}`);
            const task = [];
            task.push({cmd: "ALLOC", var: 0, len: sMid*pointsInChunk});
            const buffChunk = buff.slice( (pointsInChunk * i)*sIn, (pointsInChunk * (i+1))*sIn);
            task.push({cmd: "SET", var: 0, buff: buffChunk});
            if (fnIn2Mid) {
                task.push({cmd: "CALL", fnName:fnIn2Mid, params: [{var:0}, {val: pointsInChunk}, {var: 0}]});
            }
            for (let j=1; j<=l2Chunk;j++) {
                task.push({cmd: "CALL", fnName:fnFFTMix, params: [{var:0}, {val: pointsInChunk}, {val: j}]});
            }

            if (l2Chunk==bits) {
                if (fnFFTFinal) {
                    task.push({cmd: "ALLOCSET", var: 1, buff: inv});
                    task.push({cmd: "CALL", fnName: fnFFTFinal,  params:[
                        {var: 0},
                        {val: pointsInChunk},
                        {var: 1},
                    ]});
                }
                if (fnMid2Out) {
                    task.push({cmd: "CALL", fnName:fnMid2Out, params: [{var:0}, {val: pointsInChunk}, {var: 0}]});
                }
                task.push({cmd: "GET", out: 0, var: 0, len: pointsInChunk*sOut});
            } else {
                task.push({cmd: "GET", out:0, var: 0, len: sMid*pointsInChunk});
            }
            promises.push(tm.queueAction(task).then( (r) => {
                if (logger) logger.debug(`${loggerTxt}: fft ${bits} mix end: ${i}/${nChunks}`);
                return r;
            }));
        }

        chunks = await Promise.all(promises);
        for (let i = 0; i< nChunks; i++) chunks[i] = chunks[i][0];

        for (let i = l2Chunk+1;   i<=bits; i++) {
            if (logger) logger.debug(`${loggerTxt}: fft  ${bits}  join: ${i}/${bits}`);
            const nGroups = 1 << (bits - i);
            const nChunksPerGroup = nChunks / nGroups;
            const opPromises = [];
            for (let j=0; j<nGroups; j++) {
                for (let k=0; k <nChunksPerGroup/2; k++) {
                    const first = Fr.exp( Fr.w[i], k*pointsInChunk);
                    const inc = Fr.w[i];
                    const o1 = j*nChunksPerGroup + k;
                    const o2 = j*nChunksPerGroup + k + nChunksPerGroup/2;

                    const task = [];
                    task.push({cmd: "ALLOCSET", var: 0, buff: chunks[o1]});
                    task.push({cmd: "ALLOCSET", var: 1, buff: chunks[o2]});
                    task.push({cmd: "ALLOCSET", var: 2, buff: first});
                    task.push({cmd: "ALLOCSET", var: 3, buff: inc});
                    task.push({cmd: "CALL", fnName: fnFFTJoin,  params:[
                        {var: 0},
                        {var: 1},
                        {val: pointsInChunk},
                        {var: 2},
                        {var: 3}
                    ]});
                    if (i==bits) {
                        if (fnFFTFinal) {
                            task.push({cmd: "ALLOCSET", var: 4, buff: inv});
                            task.push({cmd: "CALL", fnName: fnFFTFinal,  params:[
                                {var: 0},
                                {val: pointsInChunk},
                                {var: 4},
                            ]});
                            task.push({cmd: "CALL", fnName: fnFFTFinal,  params:[
                                {var: 1},
                                {val: pointsInChunk},
                                {var: 4},
                            ]});
                        }
                        if (fnMid2Out) {
                            task.push({cmd: "CALL", fnName:fnMid2Out, params: [{var:0}, {val: pointsInChunk}, {var: 0}]});
                            task.push({cmd: "CALL", fnName:fnMid2Out, params: [{var:1}, {val: pointsInChunk}, {var: 1}]});
                        }
                        task.push({cmd: "GET", out: 0, var: 0, len: pointsInChunk*sOut});
                        task.push({cmd: "GET", out: 1, var: 1, len: pointsInChunk*sOut});
                    } else {
                        task.push({cmd: "GET", out: 0, var: 0, len: pointsInChunk*sMid});
                        task.push({cmd: "GET", out: 1, var: 1, len: pointsInChunk*sMid});
                    }
                    opPromises.push(tm.queueAction(task).then( (r) => {
                        if (logger) logger.debug(`${loggerTxt}: fft ${bits} join  ${i}/${bits}  ${j+1}/${nGroups} ${k}/${nChunksPerGroup/2}`);
                        return r;
                    }));
                }
            }

            const res = await Promise.all(opPromises);
            for (let j=0; j<nGroups; j++) {
                for (let k=0; k <nChunksPerGroup/2; k++) {
                    const o1 = j*nChunksPerGroup + k;
                    const o2 = j*nChunksPerGroup + k + nChunksPerGroup/2;
                    const resChunk = res.shift();
                    chunks[o1] = resChunk[0];
                    chunks[o2] = resChunk[1];
                }
            }
        }

        if (buff instanceof BigBuffer) {
            buffOut = new BigBuffer(nPoints*sOut);
        } else {
            buffOut = new Uint8Array(nPoints*sOut);
        }
        if (inverse) {
            buffOut.set(chunks[0].slice((pointsInChunk-1)*sOut));
            let p= sOut;
            for (let i=nChunks-1; i>0; i--) {
                buffOut.set(chunks[i], p);
                p += pointsInChunk*sOut;
                delete chunks[i];  // Liberate mem
            }
            buffOut.set(chunks[0].slice(0, (pointsInChunk-1)*sOut), p);
            delete chunks[0];
        } else {
            for (let i=0; i<nChunks; i++) {
                buffOut.set(chunks[i], pointsInChunk*sOut*i);
                delete chunks[i];
            }
        }

        if (returnArray) {
            return buffer2array(buffOut, sOut);
        } else {
            return buffOut;
        }
    }

    async function _fftExt(buff, inType, outType, logger, loggerTxt) {
        let b1, b2;
        b1 = buff.slice( 0 , buff.byteLength/2);
        b2 = buff.slice( buff.byteLength/2, buff.byteLength);

        const promises = [];

        [b1, b2] = await _fftJoinExt(b1, b2, "fftJoinExt", Fr.one, Fr.shift, inType, "jacobian", logger, loggerTxt);

        promises.push( _fft(b1, false, "jacobian", outType, logger, loggerTxt));
        promises.push( _fft(b2, false, "jacobian", outType, logger, loggerTxt));

        const res1 = await Promise.all(promises);

        let buffOut;
        if (res1[0].byteLength > (1<<28)) {
            buffOut = new BigBuffer(res1[0].byteLength*2);
        } else {
            buffOut = new Uint8Array(res1[0].byteLength*2);
        }

        buffOut.set(res1[0]);
        buffOut.set(res1[1], res1[0].byteLength);

        return buffOut;
    }

    async function _fftExtInv(buff, inType, outType, logger, loggerTxt) {
        let b1, b2;
        b1 = buff.slice( 0 , buff.byteLength/2);
        b2 = buff.slice( buff.byteLength/2, buff.byteLength);

        const promises = [];

        promises.push( _fft(b1, true, inType, "jacobian", logger, loggerTxt));
        promises.push( _fft(b2, true, inType, "jacobian", logger, loggerTxt));

        [b1, b2] = await Promise.all(promises);

        const res1 = await _fftJoinExt(b1, b2, "fftJoinExtInv", Fr.one, Fr.shiftInv, "jacobian", outType, logger, loggerTxt);

        let buffOut;
        if (res1[0].byteLength > (1<<28)) {
            buffOut = new BigBuffer(res1[0].byteLength*2);
        } else {
            buffOut = new Uint8Array(res1[0].byteLength*2);
        }

        buffOut.set(res1[0]);
        buffOut.set(res1[1], res1[0].byteLength);

        return buffOut;
    }


    async function _fftJoinExt(buff1, buff2, fn, first, inc, inType, outType, logger, loggerTxt) {
        const MAX_CHUNK_SIZE = 1<<16;
        const MIN_CHUNK_SIZE = 1<<4;

        let fnName;
        let fnIn2Mid, fnMid2Out;
        let sOut, sIn, sMid;

        if (groupName == "G1") {
            if (inType == "affine") {
                sIn = G.F.n8*2;
                fnIn2Mid = "g1m_batchToJacobian";
            } else {
                sIn = G.F.n8*3;
            }
            sMid = G.F.n8*3;
            fnName = "g1m_"+fn;
            if (outType == "affine") {
                fnMid2Out = "g1m_batchToAffine";
                sOut = G.F.n8*2;
            } else {
                sOut = G.F.n8*3;
            }
        } else if (groupName == "G2") {
            if (inType == "affine") {
                sIn = G.F.n8*2;
                fnIn2Mid = "g2m_batchToJacobian";
            } else {
                sIn = G.F.n8*3;
            }
            fnName = "g2m_"+fn;
            sMid = G.F.n8*3;
            if (outType == "affine") {
                fnMid2Out = "g2m_batchToAffine";
                sOut = G.F.n8*2;
            } else {
                sOut = G.F.n8*3;
            }
        } else if (groupName == "Fr") {
            sIn = Fr.n8;
            sOut = Fr.n8;
            sMid = Fr.n8;
            fnName = "frm_" + fn;
        } else {
            throw new Error("Invalid group");
        }

        if (buff1.byteLength != buff2.byteLength) {
            throw new Error("Invalid buffer size");
        }
        const nPoints = Math.floor(buff1.byteLength / sIn);
        if (nPoints != 1 << log2(nPoints)) {
            throw new Error("Invalid number of points");
        }

        let chunkSize = Math.floor(nPoints /tm.concurrency);
        if (chunkSize < MIN_CHUNK_SIZE) chunkSize = MIN_CHUNK_SIZE;
        if (chunkSize > MAX_CHUNK_SIZE) chunkSize = MAX_CHUNK_SIZE;

        const opPromises = [];

        for (let i=0; i<nPoints; i += chunkSize) {
            if (logger) logger.debug(`${loggerTxt}: fftJoinExt Start: ${i}/${nPoints}`);
            const n= Math.min(nPoints - i, chunkSize);

            const firstChunk = Fr.mul(first, Fr.exp( inc, i));
            const task = [];

            const b1 = buff1.slice(i*sIn, (i+n)*sIn);
            const b2 = buff2.slice(i*sIn, (i+n)*sIn);

            task.push({cmd: "ALLOC", var: 0, len: sMid*n});
            task.push({cmd: "SET", var: 0, buff: b1});
            task.push({cmd: "ALLOC", var: 1, len: sMid*n});
            task.push({cmd: "SET", var: 1, buff: b2});
            task.push({cmd: "ALLOCSET", var: 2, buff: firstChunk});
            task.push({cmd: "ALLOCSET", var: 3, buff: inc});
            if (fnIn2Mid) {
                task.push({cmd: "CALL", fnName:fnIn2Mid, params: [{var:0}, {val: n}, {var: 0}]});
                task.push({cmd: "CALL", fnName:fnIn2Mid, params: [{var:1}, {val: n}, {var: 1}]});
            }
            task.push({cmd: "CALL", fnName: fnName, params: [
                {var: 0},
                {var: 1},
                {val: n},
                {var: 2},
                {var: 3},
                {val: Fr.s},
            ]});
            if (fnMid2Out) {
                task.push({cmd: "CALL", fnName:fnMid2Out, params: [{var:0}, {val: n}, {var: 0}]});
                task.push({cmd: "CALL", fnName:fnMid2Out, params: [{var:1}, {val: n}, {var: 1}]});
            }
            task.push({cmd: "GET", out: 0, var: 0, len: n*sOut});
            task.push({cmd: "GET", out: 1, var: 1, len: n*sOut});
            opPromises.push(
                tm.queueAction(task).then( (r) => {
                    if (logger) logger.debug(`${loggerTxt}: fftJoinExt End: ${i}/${nPoints}`);
                    return r;
                })
            );
        }

        const result = await Promise.all(opPromises);

        let fullBuffOut1;
        let fullBuffOut2;
        if (nPoints * sOut > 1<<28) {
            fullBuffOut1 = new BigBuffer(nPoints*sOut);
            fullBuffOut2 = new BigBuffer(nPoints*sOut);
        } else {
            fullBuffOut1 = new Uint8Array(nPoints*sOut);
            fullBuffOut2 = new Uint8Array(nPoints*sOut);
        }

        let p =0;
        for (let i=0; i<result.length; i++) {
            fullBuffOut1.set(result[i][0], p);
            fullBuffOut2.set(result[i][1], p);
            p+=result[i][0].byteLength;
        }

        return [fullBuffOut1, fullBuffOut2];
    }


    G.fft = async function(buff, inType, outType, logger, loggerTxt) {
        return await _fft(buff, false, inType, outType, logger, loggerTxt);
    };

    G.ifft = async function(buff, inType, outType, logger, loggerTxt) {
        return await _fft(buff, true, inType, outType, logger, loggerTxt);
    };

    G.lagrangeEvaluations = async function (buff, inType, outType, logger, loggerTxt) {
        inType = inType || "affine";
        outType = outType || "affine";

        let sIn;
        if (groupName == "G1") {
            if (inType == "affine") {
                sIn = G.F.n8*2;
            } else {
                sIn = G.F.n8*3;
            }
        } else if (groupName == "G2") {
            if (inType == "affine") {
                sIn = G.F.n8*2;
            } else {
                sIn = G.F.n8*3;
            }
        } else if (groupName == "Fr") {
            sIn = Fr.n8;
        } else {
            throw new Error("Invalid group");
        }

        const nPoints = buff.byteLength /sIn;
        const bits = log2(nPoints);

        if ((2 ** bits)*sIn != buff.byteLength) {
            if (logger) logger.error("lagrangeEvaluations iinvalid input size");
            throw new Error("lagrangeEvaluations invalid Input size");
        }

        if (bits <= Fr.s) {
            return await G.ifft(buff, inType, outType, logger, loggerTxt);
        }

        if (bits > Fr.s+1) {
            if (logger) logger.error("lagrangeEvaluations input too big");
            throw new Error("lagrangeEvaluations input too big");
        }

        let t0 = buff.slice(0, buff.byteLength/2);
        let t1 = buff.slice(buff.byteLength/2, buff.byteLength);


        const shiftToSmallM = Fr.exp(Fr.shift, nPoints/2);
        const sConst = Fr.inv( Fr.sub(Fr.one, shiftToSmallM));

        [t0, t1] = await _fftJoinExt(t0, t1, "prepareLagrangeEvaluation", sConst, Fr.shiftInv, inType, "jacobian", logger, loggerTxt + " prep");

        const promises = [];

        promises.push( _fft(t0, true, "jacobian", outType, logger, loggerTxt + " t0"));
        promises.push( _fft(t1, true, "jacobian", outType, logger, loggerTxt + " t1"));

        [t0, t1] = await Promise.all(promises);

        let buffOut;
        if (t0.byteLength > (1<<28)) {
            buffOut = new BigBuffer(t0.byteLength*2);
        } else {
            buffOut = new Uint8Array(t0.byteLength*2);
        }

        buffOut.set(t0);
        buffOut.set(t1, t0.byteLength);

        return buffOut;
    };

    G.fftMix = async function fftMix(buff) {
        const sG = G.F.n8*3;
        let fnName, fnFFTJoin;
        if (groupName == "G1") {
            fnName = "g1m_fftMix";
            fnFFTJoin = "g1m_fftJoin";
        } else if (groupName == "G2") {
            fnName = "g2m_fftMix";
            fnFFTJoin = "g2m_fftJoin";
        } else if (groupName == "Fr") {
            fnName = "frm_fftMix";
            fnFFTJoin = "frm_fftJoin";
        } else {
            throw new Error("Invalid group");
        }

        const nPoints = Math.floor(buff.byteLength / sG);
        const power = log2(nPoints);

        let nChunks = 1 << log2(tm.concurrency);

        if (nPoints <= nChunks*2) nChunks = 1;

        const pointsPerChunk = nPoints / nChunks;

        const powerChunk = log2(pointsPerChunk);

        const opPromises = [];
        for (let i=0; i<nChunks; i++) {
            const task = [];
            const b = buff.slice((i* pointsPerChunk)*sG, ((i+1)* pointsPerChunk)*sG);
            task.push({cmd: "ALLOCSET", var: 0, buff: b});
            for (let j=1; j<=powerChunk; j++) {
                task.push({cmd: "CALL", fnName: fnName, params: [
                    {var: 0},
                    {val: pointsPerChunk},
                    {val: j}
                ]});
            }
            task.push({cmd: "GET", out: 0, var: 0, len: pointsPerChunk*sG});
            opPromises.push(
                tm.queueAction(task)
            );
        }

        const result = await Promise.all(opPromises);

        const chunks = [];
        for (let i=0; i<result.length; i++) chunks[i] = result[i][0];


        for (let i = powerChunk+1; i<=power; i++) {
            const nGroups = 1 << (power - i);
            const nChunksPerGroup = nChunks / nGroups;
            const opPromises = [];
            for (let j=0; j<nGroups; j++) {
                for (let k=0; k <nChunksPerGroup/2; k++) {
                    const first = Fr.exp( Fr.w[i], k*pointsPerChunk);
                    const inc = Fr.w[i];
                    const o1 = j*nChunksPerGroup + k;
                    const o2 = j*nChunksPerGroup + k + nChunksPerGroup/2;

                    const task = [];
                    task.push({cmd: "ALLOCSET", var: 0, buff: chunks[o1]});
                    task.push({cmd: "ALLOCSET", var: 1, buff: chunks[o2]});
                    task.push({cmd: "ALLOCSET", var: 2, buff: first});
                    task.push({cmd: "ALLOCSET", var: 3, buff: inc});
                    task.push({cmd: "CALL", fnName: fnFFTJoin,  params:[
                        {var: 0},
                        {var: 1},
                        {val: pointsPerChunk},
                        {var: 2},
                        {var: 3}
                    ]});
                    task.push({cmd: "GET", out: 0, var: 0, len: pointsPerChunk*sG});
                    task.push({cmd: "GET", out: 1, var: 1, len: pointsPerChunk*sG});
                    opPromises.push(tm.queueAction(task));
                }
            }

            const res = await Promise.all(opPromises);
            for (let j=0; j<nGroups; j++) {
                for (let k=0; k <nChunksPerGroup/2; k++) {
                    const o1 = j*nChunksPerGroup + k;
                    const o2 = j*nChunksPerGroup + k + nChunksPerGroup/2;
                    const resChunk = res.shift();
                    chunks[o1] = resChunk[0];
                    chunks[o2] = resChunk[1];
                }
            }
        }

        let fullBuffOut;
        if (buff instanceof BigBuffer) {
            fullBuffOut = new BigBuffer(nPoints*sG);
        } else {
            fullBuffOut = new Uint8Array(nPoints*sG);
        }
        let p =0;
        for (let i=0; i<nChunks; i++) {
            fullBuffOut.set(chunks[i], p);
            p+=chunks[i].byteLength;
        }

        return fullBuffOut;
    };

    G.fftJoin = async function fftJoin(buff1, buff2, first, inc) {
        const sG = G.F.n8*3;
        let fnName;
        if (groupName == "G1") {
            fnName = "g1m_fftJoin";
        } else if (groupName == "G2") {
            fnName = "g2m_fftJoin";
        } else if (groupName == "Fr") {
            fnName = "frm_fftJoin";
        } else {
            throw new Error("Invalid group");
        }

        if (buff1.byteLength != buff2.byteLength) {
            throw new Error("Invalid buffer size");
        }
        const nPoints = Math.floor(buff1.byteLength / sG);
        if (nPoints != 1 << log2(nPoints)) {
            throw new Error("Invalid number of points");
        }

        let nChunks = 1 << log2(tm.concurrency);
        if (nPoints <= nChunks*2) nChunks = 1;

        const pointsPerChunk = nPoints / nChunks;


        const opPromises = [];
        for (let i=0; i<nChunks; i++) {
            const task = [];

            const firstChunk = Fr.mul(first, Fr.exp(inc, i*pointsPerChunk));
            const b1 = buff1.slice((i* pointsPerChunk)*sG, ((i+1)* pointsPerChunk)*sG);
            const b2 = buff2.slice((i* pointsPerChunk)*sG, ((i+1)* pointsPerChunk)*sG);
            task.push({cmd: "ALLOCSET", var: 0, buff: b1});
            task.push({cmd: "ALLOCSET", var: 1, buff: b2});
            task.push({cmd: "ALLOCSET", var: 2, buff: firstChunk});
            task.push({cmd: "ALLOCSET", var: 3, buff: inc});
            task.push({cmd: "CALL", fnName: fnName, params: [
                {var: 0},
                {var: 1},
                {val: pointsPerChunk},
                {var: 2},
                {var: 3}
            ]});
            task.push({cmd: "GET", out: 0, var: 0, len: pointsPerChunk*sG});
            task.push({cmd: "GET", out: 1, var: 1, len: pointsPerChunk*sG});
            opPromises.push(
                tm.queueAction(task)
            );

        }


        const result = await Promise.all(opPromises);

        let fullBuffOut1;
        let fullBuffOut2;
        if (buff1 instanceof BigBuffer) {
            fullBuffOut1 = new BigBuffer(nPoints*sG);
            fullBuffOut2 = new BigBuffer(nPoints*sG);
        } else {
            fullBuffOut1 = new Uint8Array(nPoints*sG);
            fullBuffOut2 = new Uint8Array(nPoints*sG);
        }

        let p =0;
        for (let i=0; i<result.length; i++) {
            fullBuffOut1.set(result[i][0], p);
            fullBuffOut2.set(result[i][1], p);
            p+=result[i][0].byteLength;
        }

        return [fullBuffOut1, fullBuffOut2];
    };



    G.fftFinal =  async function fftFinal(buff, factor) {
        const sG = G.F.n8*3;
        const sGout = G.F.n8*2;
        let fnName, fnToAffine;
        if (groupName == "G1") {
            fnName = "g1m_fftFinal";
            fnToAffine = "g1m_batchToAffine";
        } else if (groupName == "G2") {
            fnName = "g2m_fftFinal";
            fnToAffine = "g2m_batchToAffine";
        } else {
            throw new Error("Invalid group");
        }

        const nPoints = Math.floor(buff.byteLength / sG);
        if (nPoints != 1 << log2(nPoints)) {
            throw new Error("Invalid number of points");
        }

        const pointsPerChunk = Math.floor(nPoints / tm.concurrency);

        const opPromises = [];
        for (let i=0; i<tm.concurrency; i++) {
            let n;
            if (i< tm.concurrency-1) {
                n = pointsPerChunk;
            } else {
                n = nPoints - i*pointsPerChunk;
            }
            if (n==0) continue;
            const task = [];
            const b = buff.slice((i* pointsPerChunk)*sG, (i*pointsPerChunk+n)*sG);
            task.push({cmd: "ALLOCSET", var: 0, buff: b});
            task.push({cmd: "ALLOCSET", var: 1, buff: factor});
            task.push({cmd: "CALL", fnName: fnName, params: [
                {var: 0},
                {val: n},
                {var: 1},
            ]});
            task.push({cmd: "CALL", fnName: fnToAffine, params: [
                {var: 0},
                {val: n},
                {var: 0},
            ]});
            task.push({cmd: "GET", out: 0, var: 0, len: n*sGout});
            opPromises.push(
                tm.queueAction(task)
            );

        }

        const result = await Promise.all(opPromises);

        let fullBuffOut;
        if (buff instanceof BigBuffer) {
            fullBuffOut = new BigBuffer(nPoints*sGout);
        } else {
            fullBuffOut = new Uint8Array(nPoints*sGout);
        }

        let p =0;
        for (let i=result.length-1; i>=0; i--) {
            fullBuffOut.set(result[i][0], p);
            p+=result[i][0].byteLength;
        }

        return fullBuffOut;
    };
}

async function buildEngine(params) {

    const tm = await buildThreadManager(params.wasm, params.singleThread);


    const curve = {};

    curve.q = e(params.wasm.q.toString());
    curve.r = e(params.wasm.r.toString());
    curve.name = params.name;
    curve.tm = tm;
    curve.prePSize = params.wasm.prePSize;
    curve.preQSize = params.wasm.preQSize;
    curve.Fr = new WasmField1(tm, "frm", params.n8r, params.r);
    curve.F1 = new WasmField1(tm, "f1m", params.n8q, params.q);
    curve.F2 = new WasmField2(tm, "f2m", curve.F1);
    curve.G1 = new WasmCurve(tm, "g1m", curve.F1, params.wasm.pG1gen, params.wasm.pG1b, params.cofactorG1);
    curve.G2 = new WasmCurve(tm, "g2m", curve.F2, params.wasm.pG2gen, params.wasm.pG2b, params.cofactorG2);
    curve.F6 = new WasmField3(tm, "f6m", curve.F2);
    curve.F12 = new WasmField2(tm, "ftm", curve.F6);

    curve.Gt = curve.F12;

    buildBatchApplyKey(curve, "G1");
    buildBatchApplyKey(curve, "G2");
    buildBatchApplyKey(curve, "Fr");

    buildMultiexp(curve, "G1");
    buildMultiexp(curve, "G2");

    buildFFT(curve, "G1");
    buildFFT(curve, "G2");
    buildFFT(curve, "Fr");

    buildPairing(curve);

    curve.array2buffer = function(arr, sG) {
        const buff = new Uint8Array(sG*arr.length);

        for (let i=0; i<arr.length; i++) {
            buff.set(arr[i], i*sG);
        }

        return buff;
    };

    curve.buffer2array = function(buff , sG) {
        const n= buff.byteLength / sG;
        const arr = new Array(n);
        for (let i=0; i<n; i++) {
            arr[i] = buff.slice(i*sG, i*sG+sG);
        }
        return arr;
    };

    return curve;
}

globalThis.curve_bn128 = null;

async function buildBn128(singleThread, plugins) {

    const moduleBuilder = new wasmbuilder.ModuleBuilder();
    moduleBuilder.setMemory(25);
    wasmcurves.buildBn128(moduleBuilder);

    if (plugins) plugins(moduleBuilder);

    const bn128wasm = {};

    bn128wasm.code = moduleBuilder.build();
    bn128wasm.pq = moduleBuilder.modules.f1m.pq;
    bn128wasm.pr = moduleBuilder.modules.frm.pq;
    bn128wasm.pG1gen = moduleBuilder.modules.bn128.pG1gen;
    bn128wasm.pG1zero = moduleBuilder.modules.bn128.pG1zero;
    bn128wasm.pG1b = moduleBuilder.modules.bn128.pG1b;
    bn128wasm.pG2gen = moduleBuilder.modules.bn128.pG2gen;
    bn128wasm.pG2zero = moduleBuilder.modules.bn128.pG2zero;
    bn128wasm.pG2b = moduleBuilder.modules.bn128.pG2b;
    bn128wasm.pOneT = moduleBuilder.modules.bn128.pOneT;
    bn128wasm.prePSize = moduleBuilder.modules.bn128.prePSize;
    bn128wasm.preQSize = moduleBuilder.modules.bn128.preQSize;
    bn128wasm.n8q = 32;
    bn128wasm.n8r = 32;
    bn128wasm.q = moduleBuilder.modules.bn128.q;
    bn128wasm.r = moduleBuilder.modules.bn128.r;

    if ((!singleThread) && (globalThis.curve_bn128)) return globalThis.curve_bn128;
    const params = {
        name: "bn128",
        wasm: bn128wasm,
        q: e("21888242871839275222246405745257275088696311157297823662689037894645226208583"),
        r: e("21888242871839275222246405745257275088548364400416034343698204186575808495617"),
        n8q: 32,
        n8r: 32,
        cofactorG2: e("30644e72e131a029b85045b68181585e06ceecda572a2489345f2299c0f9fa8d", 16),
        singleThread: singleThread ? true : false
    };

    const curve = await buildEngine(params);
    curve.terminate = async function () {
        if (!params.singleThread) {
            globalThis.curve_bn128 = null;
            await this.tm.terminate();
        }
    };

    if (!singleThread) {
        globalThis.curve_bn128 = curve;
    }

    return curve;
}

globalThis.curve_bls12381 = null;

async function buildBls12381(singleThread, plugins) {

    const moduleBuilder = new wasmbuilder.ModuleBuilder();
    moduleBuilder.setMemory(25);
    wasmcurves.buildBls12381(moduleBuilder);

    if (plugins) plugins(moduleBuilder);

    const bls12381wasm = {};

    bls12381wasm.code = moduleBuilder.build();
    bls12381wasm.pq = moduleBuilder.modules.f1m.pq;
    bls12381wasm.pr = moduleBuilder.modules.frm.pq;
    bls12381wasm.pG1gen = moduleBuilder.modules.bls12381.pG1gen;
    bls12381wasm.pG1zero = moduleBuilder.modules.bls12381.pG1zero;
    bls12381wasm.pG1b = moduleBuilder.modules.bls12381.pG1b;
    bls12381wasm.pG2gen = moduleBuilder.modules.bls12381.pG2gen;
    bls12381wasm.pG2zero = moduleBuilder.modules.bls12381.pG2zero;
    bls12381wasm.pG2b = moduleBuilder.modules.bls12381.pG2b;
    bls12381wasm.pOneT = moduleBuilder.modules.bls12381.pOneT;
    bls12381wasm.prePSize = moduleBuilder.modules.bls12381.prePSize;
    bls12381wasm.preQSize = moduleBuilder.modules.bls12381.preQSize;
    bls12381wasm.n8q = 48;
    bls12381wasm.n8r = 32;
    bls12381wasm.q = moduleBuilder.modules.bls12381.q;
    bls12381wasm.r = moduleBuilder.modules.bls12381.r;


    if ((!singleThread) && (globalThis.curve_bls12381)) return globalThis.curve_bls12381;
    const params = {
        name: "bls12381",
        wasm: bls12381wasm,
        q: e("1a0111ea397fe69a4b1ba7b6434bacd764774b84f38512bf6730d2a0f6b0f6241eabfffeb153ffffb9feffffffffaaab", 16),
        r: e("73eda753299d7d483339d80809a1d80553bda402fffe5bfeffffffff00000001", 16),
        n8q: 48,
        n8r: 32,
        cofactorG1: e("0x396c8c005555e1568c00aaab0000aaab", 16),
        cofactorG2: e("0x5d543a95414e7f1091d50792876a202cd91de4547085abaa68a205b2e5a7ddfa628f1cb4d9e82ef21537e293a6691ae1616ec6e786f0c70cf1c38e31c7238e5", 16),
        singleThread: singleThread ? true : false
    };

    const curve = await buildEngine(params);
    curve.terminate = async function () {
        if (!params.singleThread) {
            globalThis.curve_bls12381 = null;
            await this.tm.terminate();
        }
    };

    if (!singleThread) {
        globalThis.curve_bls12381 = curve;
    }

    return curve;
}

const bls12381r = e("73eda753299d7d483339d80809a1d80553bda402fffe5bfeffffffff00000001", 16);
const bn128r = e("21888242871839275222246405745257275088548364400416034343698204186575808495617");

const bls12381q = e("1a0111ea397fe69a4b1ba7b6434bacd764774b84f38512bf6730d2a0f6b0f6241eabfffeb153ffffb9feffffffffaaab", 16);
const bn128q = e("21888242871839275222246405745257275088696311157297823662689037894645226208583");

async function getCurveFromR(r, singleThread, plugins) {
    let curve;
    if (eq(r, bn128r)) {
        curve = await buildBn128(singleThread, plugins);
    } else if (eq(r, bls12381r)) {
        curve = await buildBls12381(singleThread, plugins);
    } else {
        throw new Error(`Curve not supported: ${toString(r)}`);
    }
    return curve;
}

async function getCurveFromQ(q, singleThread, plugins) {
    let curve;
    if (eq(q, bn128q)) {
        curve = await buildBn128(singleThread, plugins);
    } else if (eq(q, bls12381q)) {
        curve = await buildBls12381(singleThread, plugins);
    } else {
        throw new Error(`Curve not supported: ${toString(q, 16)}`);
    }
    return curve;
}

async function getCurveFromName(name, singleThread, plugins) {
    let curve;
    const normName = normalizeName(name);
    if (["BN128", "BN254", "ALTBN128"].indexOf(normName) >= 0) {
        curve = await buildBn128(singleThread, plugins);
    } else if (["BLS12381"].indexOf(normName) >= 0) {
        curve = await buildBls12381(singleThread, plugins);
    } else {
        throw new Error(`Curve not supported: ${name}`);
    }
    return curve;

    function normalizeName(n) {
        return n.toUpperCase().match(/[A-Za-z0-9]+/g).join("");
    }

}

const Scalar=_Scalar;
const utils = _utils;

exports.BigBuffer = BigBuffer;
exports.ChaCha = ChaCha;
exports.EC = EC;
exports.F1Field = ZqField;
exports.F2Field = F2Field;
exports.F3Field = F3Field;
exports.PolField = PolField;
exports.Scalar = Scalar;
exports.ZqField = ZqField;
exports.buildBls12381 = buildBls12381;
exports.buildBn128 = buildBn128;
exports.getCurveFromName = getCurveFromName;
exports.getCurveFromQ = getCurveFromQ;
exports.getCurveFromR = getCurveFromR;
exports.utils = utils;


/***/ }),

/***/ 14:
/***/ ((__unused_webpack_module, exports) => {

"use strict";


Object.defineProperty(exports, "__esModule", ({ value: true }));

/*
    Copyright 2019 0KIMS association.

    This file is part of wasmbuilder

    wasmbuilder is a free software: you can redistribute it and/or modify it
    under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    wasmbuilder is distributed in the hope that it will be useful, but WITHOUT
    ANY WARRANTY; without even the implied warranty of MERCHANTABILITY
    or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public
    License for more details.

    You should have received a copy of the GNU General Public License
    along with wasmbuilder. If not, see <https://www.gnu.org/licenses/>.
*/

function toNumber(n) {
    return BigInt(n);
}

function isNegative(n) {
    return n < 0n;
}

function isZero(n) {
    return n === 0n;
}

function bitLength(n) {
    if (isNegative(n)) {
        return n.toString(2).length - 1; // discard the - sign
    } else {
        return n.toString(2).length;
    }
}

function u32(n) {
    const b = [];
    const v = toNumber(n);
    b.push(Number(v & 0xFFn));
    b.push(Number(v >> 8n & 0xFFn));
    b.push(Number(v >> 16n & 0xFFn));
    b.push(Number(v >> 24n & 0xFFn));
    return b;
}

function toUTF8Array(str) {
    var utf8 = [];
    for (var i=0; i < str.length; i++) {
        var charcode = str.charCodeAt(i);
        if (charcode < 0x80) utf8.push(charcode);
        else if (charcode < 0x800) {
            utf8.push(0xc0 | (charcode >> 6),
                0x80 | (charcode & 0x3f));
        }
        else if (charcode < 0xd800 || charcode >= 0xe000) {
            utf8.push(0xe0 | (charcode >> 12),
                0x80 | ((charcode>>6) & 0x3f),
                0x80 | (charcode & 0x3f));
        }
        // surrogate pair
        else {
            i++;
            // UTF-16 encodes 0x10000-0x10FFFF by
            // subtracting 0x10000 and splitting the
            // 20 bits of 0x0-0xFFFFF into two halves
            charcode = 0x10000 + (((charcode & 0x3ff)<<10)
                      | (str.charCodeAt(i) & 0x3ff));
            utf8.push(0xf0 | (charcode >>18),
                0x80 | ((charcode>>12) & 0x3f),
                0x80 | ((charcode>>6) & 0x3f),
                0x80 | (charcode & 0x3f));
        }
    }
    return utf8;
}

function string(str) {
    const bytes = toUTF8Array(str);
    return [ ...varuint32(bytes.length), ...bytes ];
}

function varuint(n) {
    const code = [];
    let v = toNumber(n);
    if (isNegative(v)) throw new Error("Number cannot be negative");
    while (!isZero(v)) {
        code.push(Number(v & 0x7Fn));
        v = v >> 7n;
    }
    if (code.length==0) code.push(0);
    for (let i=0; i<code.length-1; i++) {
        code[i] = code[i] | 0x80;
    }
    return code;
}

function varint(_n) {
    let n, sign;
    const bits = bitLength(_n);
    if (_n<0) {
        sign = true;
        n = (1n << BigInt(bits)) + _n;
    } else {
        sign = false;
        n = toNumber(_n);
    }
    const paddingBits = 7 - (bits % 7);

    const padding = ((1n << BigInt(paddingBits)) - 1n) << BigInt(bits);
    const paddingMask = ((1 << (7 - paddingBits))-1) | 0x80;

    const code = varuint(n + padding);

    if (!sign) {
        code[code.length-1] = code[code.length-1] & paddingMask;
    }

    return code;
}

function varint32(n) {
    let v = toNumber(n);
    if (v > 0xFFFFFFFFn) throw new Error("Number too big");
    if (v > 0x7FFFFFFFn) v = v - 0x100000000n;
    // bigInt("-80000000", 16) as base10
    if (v < -2147483648n) throw new Error("Number too small");
    return varint(v);
}

function varint64(n) {
    let v = toNumber(n);
    if (v > 0xFFFFFFFFFFFFFFFFn) throw new Error("Number too big");
    if (v > 0x7FFFFFFFFFFFFFFFn) v = v - 0x10000000000000000n;
    // bigInt("-8000000000000000", 16) as base10
    if (v < -9223372036854775808n) throw new Error("Number too small");
    return varint(v);
}

function varuint32(n) {
    let v = toNumber(n);
    if (v > 0xFFFFFFFFn) throw new Error("Number too big");
    return varuint(v);
}

function toHexString(byteArray) {
    return Array.from(byteArray, function(byte) {
        return ("0" + (byte & 0xFF).toString(16)).slice(-2);
    }).join("");
}

function ident(text) {
    if (typeof text === "string") {
        let lines = text.split("\n");
        for (let i=0; i<lines.length; i++) {
            if (lines[i]) lines[i] = "    "+lines[i];
        }
        return lines.join("\n");
    } else if (Array.isArray(text)) {
        for (let i=0; i<text.length; i++ ) {
            text[i] = ident(text[i]);
        }
        return text;
    }
}

/*
    Copyright 2019 0KIMS association.

    This file is part of wasmbuilder

    wasmbuilder is a free software: you can redistribute it and/or modify it
    under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    wasmbuilder is distributed in the hope that it will be useful, but WITHOUT
    ANY WARRANTY; without even the implied warranty of MERCHANTABILITY
    or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public
    License for more details.

    You should have received a copy of the GNU General Public License
    along with wasmbuilder. If not, see <https://www.gnu.org/licenses/>.
*/

class CodeBuilder {
    constructor(func) {
        this.func = func;
        this.functionName = func.functionName;
        this.module = func.module;
    }

    setLocal(localName, valCode) {
        const idx = this.func.localIdxByName[localName];
        if (idx === undefined)
            throw new Error(`Local Variable not defined: Function: ${this.functionName} local: ${localName} `);
        return [...valCode, 0x21, ...varuint32( idx )];
    }

    teeLocal(localName, valCode) {
        const idx = this.func.localIdxByName[localName];
        if (idx === undefined)
            throw new Error(`Local Variable not defined: Function: ${this.functionName} local: ${localName} `);
        return [...valCode, 0x22, ...varuint32( idx )];
    }

    getLocal(localName) {
        const idx = this.func.localIdxByName[localName];
        if (idx === undefined)
            throw new Error(`Local Variable not defined: Function: ${this.functionName} local: ${localName} `);
        return [0x20, ...varuint32( idx )];
    }

    i64_load8_s(idxCode, _offset, _align) {
        const offset = _offset || 0;
        const align = (_align === undefined) ? 0 : _align;  // 8 bits alignment by default
        return [...idxCode, 0x30, align, ...varuint32(offset)];
    }

    i64_load8_u(idxCode, _offset, _align) {
        const offset = _offset || 0;
        const align = (_align === undefined) ? 0 : _align;  // 8 bits alignment by default
        return [...idxCode, 0x31, align, ...varuint32(offset)];
    }

    i64_load16_s(idxCode, _offset, _align) {
        const offset = _offset || 0;
        const align = (_align === undefined) ? 1 : _align;  // 16 bits alignment by default
        return [...idxCode, 0x32, align, ...varuint32(offset)];
    }

    i64_load16_u(idxCode, _offset, _align) {
        const offset = _offset || 0;
        const align = (_align === undefined) ? 1 : _align;  // 16 bits alignment by default
        return [...idxCode, 0x33, align, ...varuint32(offset)];
    }

    i64_load32_s(idxCode, _offset, _align) {
        const offset = _offset || 0;
        const align = (_align === undefined) ? 2 : _align;  // 32 bits alignment by default
        return [...idxCode, 0x34, align, ...varuint32(offset)];
    }

    i64_load32_u(idxCode, _offset, _align) {
        const offset = _offset || 0;
        const align = (_align === undefined) ? 2 : _align;  // 32 bits alignment by default
        return [...idxCode, 0x35, align, ...varuint32(offset)];
    }

    i64_load(idxCode, _offset, _align) {
        const offset = _offset || 0;
        const align = (_align === undefined) ? 3 : _align;  // 64 bits alignment by default
        return [...idxCode, 0x29, align, ...varuint32(offset)];
    }


    i64_store(idxCode, _offset, _align, _codeVal) {
        let offset, align, codeVal;
        if (Array.isArray(_offset)) {
            offset = 0;
            align = 3;
            codeVal = _offset;
        } else if (Array.isArray(_align)) {
            offset = _offset;
            align = 3;
            codeVal = _align;
        } else if (Array.isArray(_codeVal)) {
            offset = _offset;
            align = _align;
            codeVal = _codeVal;
        }
        return [...idxCode, ...codeVal, 0x37, align, ...varuint32(offset)];
    }

    i64_store32(idxCode, _offset, _align, _codeVal) {
        let offset, align, codeVal;
        if (Array.isArray(_offset)) {
            offset = 0;
            align = 2;
            codeVal = _offset;
        } else if (Array.isArray(_align)) {
            offset = _offset;
            align = 2;
            codeVal = _align;
        } else if (Array.isArray(_codeVal)) {
            offset = _offset;
            align = _align;
            codeVal = _codeVal;
        }
        return [...idxCode, ...codeVal, 0x3e, align, ...varuint32(offset)];
    }


    i64_store16(idxCode, _offset, _align, _codeVal) {
        let offset, align, codeVal;
        if (Array.isArray(_offset)) {
            offset = 0;
            align = 1;
            codeVal = _offset;
        } else if (Array.isArray(_align)) {
            offset = _offset;
            align = 1;
            codeVal = _align;
        } else if (Array.isArray(_codeVal)) {
            offset = _offset;
            align = _align;
            codeVal = _codeVal;
        }
        return [...idxCode, ...codeVal, 0x3d, align, ...varuint32(offset)];
    }


    i64_store8(idxCode, _offset, _align, _codeVal) {
        let offset, align, codeVal;
        if (Array.isArray(_offset)) {
            offset = 0;
            align = 0;
            codeVal = _offset;
        } else if (Array.isArray(_align)) {
            offset = _offset;
            align = 0;
            codeVal = _align;
        } else if (Array.isArray(_codeVal)) {
            offset = _offset;
            align = _align;
            codeVal = _codeVal;
        }
        return [...idxCode, ...codeVal, 0x3c, align, ...varuint32(offset)];
    }

    i32_load8_s(idxCode, _offset, _align) {
        const offset = _offset || 0;
        const align = (_align === undefined) ? 0 : _align;  // 32 bits alignment by default
        return [...idxCode, 0x2c, align, ...varuint32(offset)];
    }

    i32_load8_u(idxCode, _offset, _align) {
        const offset = _offset || 0;
        const align = (_align === undefined) ? 0 : _align;  // 32 bits alignment by default
        return [...idxCode, 0x2d, align, ...varuint32(offset)];
    }

    i32_load16_s(idxCode, _offset, _align) {
        const offset = _offset || 0;
        const align = (_align === undefined) ? 1 : _align;  // 32 bits alignment by default
        return [...idxCode, 0x2e, align, ...varuint32(offset)];
    }

    i32_load16_u(idxCode, _offset, _align) {
        const offset = _offset || 0;
        const align = (_align === undefined) ? 1 : _align;  // 32 bits alignment by default
        return [...idxCode, 0x2f, align, ...varuint32(offset)];
    }

    i32_load(idxCode, _offset, _align) {
        const offset = _offset || 0;
        const align = (_align === undefined) ? 2 : _align;  // 32 bits alignment by default
        return [...idxCode, 0x28, align, ...varuint32(offset)];
    }

    i32_store(idxCode, _offset, _align, _codeVal) {
        let offset, align, codeVal;
        if (Array.isArray(_offset)) {
            offset = 0;
            align = 2;
            codeVal = _offset;
        } else if (Array.isArray(_align)) {
            offset = _offset;
            align = 2;
            codeVal = _align;
        } else if (Array.isArray(_codeVal)) {
            offset = _offset;
            align = _align;
            codeVal = _codeVal;
        }
        return [...idxCode, ...codeVal, 0x36, align, ...varuint32(offset)];
    }


    i32_store16(idxCode, _offset, _align, _codeVal) {
        let offset, align, codeVal;
        if (Array.isArray(_offset)) {
            offset = 0;
            align = 1;
            codeVal = _offset;
        } else if (Array.isArray(_align)) {
            offset = _offset;
            align = 1;
            codeVal = _align;
        } else if (Array.isArray(_codeVal)) {
            offset = _offset;
            align = _align;
            codeVal = _codeVal;
        }
        return [...idxCode, ...codeVal, 0x3b, align, ...varuint32(offset)];
    }

    i32_store8(idxCode, _offset, _align, _codeVal) {
        let offset, align, codeVal;
        if (Array.isArray(_offset)) {
            offset = 0;
            align = 0;
            codeVal = _offset;
        } else if (Array.isArray(_align)) {
            offset = _offset;
            align = 0;
            codeVal = _align;
        } else if (Array.isArray(_codeVal)) {
            offset = _offset;
            align = _align;
            codeVal = _codeVal;
        }
        return [...idxCode, ...codeVal, 0x3a, align, ...varuint32(offset)];
    }

    call(fnName, ...args) {
        const idx = this.module.functionIdxByName[fnName];
        if (idx === undefined)
            throw new Error(`Function not defined: Function: ${fnName}`);
        return [...[].concat(...args), 0x10, ...varuint32(idx)];
    }

    call_indirect(fnIdx, ...args) {
        return [...[].concat(...args), ...fnIdx, 0x11, 0, 0];
    }

    if(condCode, thenCode, elseCode) {
        if (elseCode) {
            return [...condCode, 0x04, 0x40, ...thenCode, 0x05, ...elseCode, 0x0b];
        } else {
            return [...condCode, 0x04, 0x40, ...thenCode, 0x0b];
        }
    }

    block(bCode) { return [0x02, 0x40, ...bCode, 0x0b]; }
    loop(...args) {
        return [0x03, 0x40, ...[].concat(...[...args]), 0x0b];
    }
    br_if(relPath, condCode) { return [...condCode, 0x0d, ...varuint32(relPath)]; }
    br(relPath) { return [0x0c, ...varuint32(relPath)]; }
    ret(rCode) { return [...rCode, 0x0f]; }
    drop(dCode) { return [...dCode,  0x1a]; }

    i64_const(num) { return [0x42, ...varint64(num)]; }
    i32_const(num) { return [0x41, ...varint32(num)]; }


    i64_eqz(opcode) { return [...opcode, 0x50]; }
    i64_eq(op1code, op2code) { return [...op1code, ...op2code, 0x51]; }
    i64_ne(op1code, op2code) { return [...op1code, ...op2code, 0x52]; }
    i64_lt_s(op1code, op2code) { return [...op1code, ...op2code, 0x53]; }
    i64_lt_u(op1code, op2code) { return [...op1code, ...op2code, 0x54]; }
    i64_gt_s(op1code, op2code) { return [...op1code, ...op2code, 0x55]; }
    i64_gt_u(op1code, op2code) { return [...op1code, ...op2code, 0x56]; }
    i64_le_s(op1code, op2code) { return [...op1code, ...op2code, 0x57]; }
    i64_le_u(op1code, op2code) { return [...op1code, ...op2code, 0x58]; }
    i64_ge_s(op1code, op2code) { return [...op1code, ...op2code, 0x59]; }
    i64_ge_u(op1code, op2code) { return [...op1code, ...op2code, 0x5a]; }
    i64_add(op1code, op2code) { return [...op1code, ...op2code, 0x7c]; }
    i64_sub(op1code, op2code) { return [...op1code, ...op2code, 0x7d]; }
    i64_mul(op1code, op2code) { return [...op1code, ...op2code, 0x7e]; }
    i64_div_s(op1code, op2code) { return [...op1code, ...op2code, 0x7f]; }
    i64_div_u(op1code, op2code) { return [...op1code, ...op2code, 0x80]; }
    i64_rem_s(op1code, op2code) { return [...op1code, ...op2code, 0x81]; }
    i64_rem_u(op1code, op2code) { return [...op1code, ...op2code, 0x82]; }
    i64_and(op1code, op2code) { return [...op1code, ...op2code, 0x83]; }
    i64_or(op1code, op2code) { return [...op1code, ...op2code, 0x84]; }
    i64_xor(op1code, op2code) { return [...op1code, ...op2code, 0x85]; }
    i64_shl(op1code, op2code) { return [...op1code, ...op2code, 0x86]; }
    i64_shr_s(op1code, op2code) { return [...op1code, ...op2code, 0x87]; }
    i64_shr_u(op1code, op2code) { return [...op1code, ...op2code, 0x88]; }
    i64_extend_i32_s(op1code) { return [...op1code, 0xac]; }
    i64_extend_i32_u(op1code) { return [...op1code, 0xad]; }
    i64_clz(op1code) { return [...op1code, 0x79]; }
    i64_ctz(op1code) { return [...op1code, 0x7a]; }

    i32_eqz(op1code) { return [...op1code, 0x45]; }
    i32_eq(op1code, op2code) { return [...op1code, ...op2code, 0x46]; }
    i32_ne(op1code, op2code) { return [...op1code, ...op2code, 0x47]; }
    i32_lt_s(op1code, op2code) { return [...op1code, ...op2code, 0x48]; }
    i32_lt_u(op1code, op2code) { return [...op1code, ...op2code, 0x49]; }
    i32_gt_s(op1code, op2code) { return [...op1code, ...op2code, 0x4a]; }
    i32_gt_u(op1code, op2code) { return [...op1code, ...op2code, 0x4b]; }
    i32_le_s(op1code, op2code) { return [...op1code, ...op2code, 0x4c]; }
    i32_le_u(op1code, op2code) { return [...op1code, ...op2code, 0x4d]; }
    i32_ge_s(op1code, op2code) { return [...op1code, ...op2code, 0x4e]; }
    i32_ge_u(op1code, op2code) { return [...op1code, ...op2code, 0x4f]; }
    i32_add(op1code, op2code) { return [...op1code, ...op2code, 0x6a]; }
    i32_sub(op1code, op2code) { return [...op1code, ...op2code, 0x6b]; }
    i32_mul(op1code, op2code) { return [...op1code, ...op2code, 0x6c]; }
    i32_div_s(op1code, op2code) { return [...op1code, ...op2code, 0x6d]; }
    i32_div_u(op1code, op2code) { return [...op1code, ...op2code, 0x6e]; }
    i32_rem_s(op1code, op2code) { return [...op1code, ...op2code, 0x6f]; }
    i32_rem_u(op1code, op2code) { return [...op1code, ...op2code, 0x70]; }
    i32_and(op1code, op2code) { return [...op1code, ...op2code, 0x71]; }
    i32_or(op1code, op2code) { return [...op1code, ...op2code, 0x72]; }
    i32_xor(op1code, op2code) { return [...op1code, ...op2code, 0x73]; }
    i32_shl(op1code, op2code) { return [...op1code, ...op2code, 0x74]; }
    i32_shr_s(op1code, op2code) { return [...op1code, ...op2code, 0x75]; }
    i32_shr_u(op1code, op2code) { return [...op1code, ...op2code, 0x76]; }
    i32_rotl(op1code, op2code) { return [...op1code, ...op2code, 0x77]; }
    i32_rotr(op1code, op2code) { return [...op1code, ...op2code, 0x78]; }
    i32_wrap_i64(op1code) { return [...op1code, 0xa7]; }
    i32_clz(op1code) { return [...op1code, 0x67]; }
    i32_ctz(op1code) { return [...op1code, 0x68]; }

    unreachable() { return [ 0x0 ]; }

    current_memory() { return [ 0x3f, 0]; }

    comment() { return []; }
}

/*
    Copyright 2019 0KIMS association.

    This file is part of wasmbuilder

    wasmbuilder is a free software: you can redistribute it and/or modify it
    under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    wasmbuilder is distributed in the hope that it will be useful, but WITHOUT
    ANY WARRANTY; without even the implied warranty of MERCHANTABILITY
    or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public
    License for more details.

    You should have received a copy of the GNU General Public License
    along with wasmbuilder. If not, see <https://www.gnu.org/licenses/>.
*/

const typeCodes = {
    "i32": 0x7f,
    "i64": 0x7e,
    "f32": 0x7d,
    "f64": 0x7c,
    "anyfunc": 0x70,
    "func": 0x60,
    "emptyblock": 0x40
};


class FunctionBuilder {

    constructor (module, fnName, fnType, moduleName, fieldName) {
        if (fnType == "import") {
            this.fnType = "import";
            this.moduleName = moduleName;
            this.fieldName = fieldName;
        } else if (fnType == "internal") {
            this.fnType = "internal";
        } else {
            throw new Error("Invalid function fnType: " + fnType);
        }
        this.module = module;
        this.fnName = fnName;
        this.params = [];
        this.locals = [];
        this.localIdxByName = {};
        this.code = [];
        this.returnType = null;
        this.nextLocal =0;
    }

    addParam(paramName, paramType) {
        if (this.localIdxByName[paramName])
            throw new Error(`param already exists. Function: ${this.fnName}, Param: ${paramName} `);
        const idx = this.nextLocal++;
        this.localIdxByName[paramName] = idx;
        this.params.push({
            type: paramType
        });
    }

    addLocal(localName, localType, _length) {
        const length = _length || 1;
        if (this.localIdxByName[localName])
            throw new Error(`local already exists. Function: ${this.fnName}, Param: ${localName} `);
        const idx = this.nextLocal++;
        this.localIdxByName[localName] = idx;
        this.locals.push({
            type: localType,
            length: length
        });
    }

    setReturnType(returnType) {
        if (this.returnType)
            throw new Error(`returnType already defined. Function: ${this.fnName}`);
        this.returnType = returnType;
    }

    getSignature() {
        const params = [...varuint32(this.params.length), ...this.params.map((p) => typeCodes[p.type])];
        const returns = this.returnType ? [0x01, typeCodes[this.returnType]] : [0];
        return [0x60, ...params, ...returns];
    }

    getBody() {
        const locals = this.locals.map((l) => [
            ...varuint32(l.length),
            typeCodes[l.type]
        ]);

        const body = [
            ...varuint32(this.locals.length),
            ...[].concat(...locals),
            ...this.code,
            0x0b
        ];
        return [
            ...varuint32(body.length),
            ...body
        ];
    }

    addCode(...code) {
        this.code.push(...[].concat(...[...code]));
    }

    getCodeBuilder() {
        return new CodeBuilder(this);
    }
}

/*
    Copyright 2019 0KIMS association.

    This file is part of wasmbuilder

    wasmbuilder is a free software: you can redistribute it and/or modify it
    under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    wasmbuilder is distributed in the hope that it will be useful, but WITHOUT
    ANY WARRANTY; without even the implied warranty of MERCHANTABILITY
    or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public
    License for more details.

    You should have received a copy of the GNU General Public License
    along with wasmbuilder. If not, see <https://www.gnu.org/licenses/>.
*/

class ModuleBuilder {

    constructor() {
        this.functions = [];
        this.functionIdxByName = {};
        this.nImportFunctions = 0;
        this.nInternalFunctions =0;
        this.memory = {
            pagesSize: 1,
            moduleName: "env",
            fieldName: "memory"
        };
        this.free = 8;
        this.datas = [];
        this.modules = {};
        this.exports = [];
        this.functionsTable = [];
    }

    build() {
        this._setSignatures();
        return new Uint8Array([
            ...u32(0x6d736100),
            ...u32(1),
            ...this._buildType(),
            ...this._buildImport(),
            ...this._buildFunctionDeclarations(),
            ...this._buildFunctionsTable(),
            ...this._buildExports(),
            ...this._buildElements(),
            ...this._buildCode(),
            ...this._buildData()
        ]);
    }

    addFunction(fnName) {
        if (typeof(this.functionIdxByName[fnName]) !== "undefined")
            throw new Error(`Function already defined: ${fnName}`);

        const idx = this.functions.length;
        this.functionIdxByName[fnName] = idx;

        this.functions.push(new FunctionBuilder(this, fnName, "internal"));

        this.nInternalFunctions++;
        return this.functions[idx];
    }

    addIimportFunction(fnName, moduleName, _fieldName) {
        if (typeof(this.functionIdxByName[fnName]) !== "undefined")
            throw new Error(`Function already defined: ${fnName}`);

        if (  (this.functions.length>0)
            &&(this.functions[this.functions.length-1].type == "internal"))
            throw new Error(`Import functions must be declared before internal: ${fnName}`);

        let fieldName = _fieldName || fnName;

        const idx = this.functions.length;
        this.functionIdxByName[fnName] = idx;

        this.functions.push(new FunctionBuilder(this, fnName, "import", moduleName, fieldName));

        this.nImportFunctions ++;
        return this.functions[idx];
    }

    setMemory(pagesSize, moduleName, fieldName) {
        this.memory = {
            pagesSize: pagesSize,
            moduleName: moduleName || "env",
            fieldName: fieldName || "memory"
        };
    }

    exportFunction(fnName, _exportName) {
        const exportName = _exportName || fnName;
        if (typeof(this.functionIdxByName[fnName]) === "undefined")
            throw new Error(`Function not defined: ${fnName}`);
        const idx = this.functionIdxByName[fnName];
        if (exportName != fnName) {
            this.functionIdxByName[exportName] = idx;
        }
        this.exports.push({
            exportName: exportName,
            idx: idx
        });
    }

    addFunctionToTable(fnName) {
        const idx = this.functionIdxByName[fnName];
        this.functionsTable.push(idx);
    }

    addData(offset, bytes) {
        this.datas.push({
            offset: offset,
            bytes: bytes
        });
    }

    alloc(a, b) {
        let size;
        let bytes;
        if ((Array.isArray(a) || ArrayBuffer.isView(a)) && (typeof(b) === "undefined")) {
            size = a.length;
            bytes = a;
        } else {
            size = a;
            bytes = b;
        }
        size = (((size-1)>>3) +1)<<3;       // Align to 64 bits.
        const p = this.free;
        this.free += size;
        if (bytes) {
            this.addData(p, bytes);
        }
        return p;
    }

    allocString(s) {
        const encoder = new globalThis.TextEncoder();
        const uint8array = encoder.encode(s);
        return this.alloc([...uint8array, 0]);
    }

    _setSignatures() {
        this.signatures = [];
        const signatureIdxByName = {};
        if (this.functionsTable.length>0) {
            const signature = this.functions[this.functionsTable[0]].getSignature();
            const signatureName = "s_"+toHexString(signature);
            signatureIdxByName[signatureName] = 0;
            this.signatures.push(signature);
        }
        for (let i=0; i<this.functions.length; i++) {
            const signature = this.functions[i].getSignature();
            const signatureName = "s_"+toHexString(signature);
            if (typeof(signatureIdxByName[signatureName]) === "undefined") {
                signatureIdxByName[signatureName] = this.signatures.length;
                this.signatures.push(signature);
            }

            this.functions[i].signatureIdx = signatureIdxByName[signatureName];
        }

    }

    _buildSection(sectionType, section) {
        return [sectionType, ...varuint32(section.length), ...section];
    }

    _buildType() {
        return this._buildSection(
            0x01,
            [
                ...varuint32(this.signatures.length),
                ...[].concat(...this.signatures)
            ]
        );
    }

    _buildImport() {
        const entries = [];
        entries.push([
            ...string(this.memory.moduleName),
            ...string(this.memory.fieldName),
            0x02,
            0x00,   //Flags no init valua
            ...varuint32(this.memory.pagesSize)
        ]);
        for (let i=0; i< this.nImportFunctions; i++) {
            entries.push([
                ...string(this.functions[i].moduleName),
                ...string(this.functions[i].fieldName),
                0x00,
                ...varuint32(this.functions[i].signatureIdx)
            ]);
        }
        return this._buildSection(
            0x02,
            varuint32(entries.length).concat(...entries)
        );
    }

    _buildFunctionDeclarations() {
        const entries = [];
        for (let i=this.nImportFunctions; i< this.nImportFunctions + this.nInternalFunctions; i++) {
            entries.push(...varuint32(this.functions[i].signatureIdx));
        }
        return this._buildSection(
            0x03,
            [
                ...varuint32(entries.length),
                ...[...entries]
            ]
        );
    }

    _buildFunctionsTable() {
        if (this.functionsTable.length == 0) return [];
        return this._buildSection(
            0x04,
            [
                ...varuint32(1),
                0x70, 0, ...varuint32(this.functionsTable.length)
            ]
        );
    }

    _buildElements() {
        if (this.functionsTable.length == 0) return [];
        const entries = [];
        for (let i=0; i<this.functionsTable.length; i++) {
            entries.push(...varuint32(this.functionsTable[i]));
        }
        return this._buildSection(
            0x09,
            [
                ...varuint32(1),      // 1 entry
                ...varuint32(0),      // Table (0 in MVP)
                0x41,                       // offset 0
                ...varint32(0),
                0x0b,
                ...varuint32(this.functionsTable.length), // Number of elements
                ...[...entries]
            ]
        );
    }

    _buildExports() {
        const entries = [];
        for (let i=0; i< this.exports.length; i++) {
            entries.push([
                ...string(this.exports[i].exportName),
                0x00,
                ...varuint32(this.exports[i].idx)
            ]);
        }
        return this._buildSection(
            0x07,
            varuint32(entries.length).concat(...entries)
        );
    }

    _buildCode() {
        const entries = [];
        for (let i=this.nImportFunctions; i< this.nImportFunctions + this.nInternalFunctions; i++) {
            entries.push(this.functions[i].getBody());
        }
        return this._buildSection(
            0x0a,
            varuint32(entries.length).concat(...entries)
        );
    }

    _buildData() {
        const entries = [];
        entries.push([
            0x00,
            0x41,
            0x00,
            0x0b,
            0x04,
            ...u32(this.free)
        ]);
        for (let i=0; i< this.datas.length; i++) {
            entries.push([
                0x00,
                0x41,
                ...varint32(this.datas[i].offset),
                0x0b,
                ...varuint32(this.datas[i].bytes.length),
                ...this.datas[i].bytes,
            ]);
        }
        return this._buildSection(
            0x0b,
            varuint32(entries.length).concat(...entries)
        );
    }

}

/*
    Copyright 2019 0KIMS association.

    This file is part of wasmbuilder

    wasmbuilder is a free software: you can redistribute it and/or modify it
    under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    wasmbuilder is distributed in the hope that it will be useful, but WITHOUT
    ANY WARRANTY; without even the implied warranty of MERCHANTABILITY
    or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public
    License for more details.

    You should have received a copy of the GNU General Public License
    along with wasmbuilder. If not, see <https://www.gnu.org/licenses/>.
*/

class CodeBuilderWat {
    constructor(func) {
        this.func = func;
        this.functionName = func.functionName;
        this.module = func.module;
    }

    setLocal(localName, valCode) {
        const idx = this.func.localIdxByName[localName];
        if (idx === undefined)
            throw new Error(`Local Variable not defined: Function: ${this.functionName} local: ${localName} `);
        return [valCode, `set_local $${localName}`];
    }

    teeLocal(localName, valCode) {
        const idx = this.func.localIdxByName[localName];
        if (idx === undefined)
            throw new Error(`Local Variable not defined: Function: ${this.functionName} local: ${localName} `);
        return [valCode, `tee_local $${localName}`];
    }

    getLocal(localName) {
        const idx = this.func.localIdxByName[localName];
        if (idx === undefined)
            throw new Error(`Local Variable not defined: Function: ${this.functionName} local: ${localName} `);
        return `get_local $${localName}`;
    }

    genLoad(inst, def_align, idxCode, _offset, _align) {
        let S = inst;
        const offset = _offset || 0;
        if (offset>0) S += ` offset=${offset}`;
        const align = (_align === undefined) ? def_align : _align;  // 8 bits alignment by default
        if (align!=def_align) S += ` align=${1 << align}`;
        return [idxCode, S];
    }


    genStore(inst, def_align, idxCode, _offset, _align, _codeVal) {
        let offset, align, codeVal;
        if (typeof _align === "undefined") {
            offset = 0;
            align = def_align;
            codeVal = _offset;
        } else if (typeof _codeVal === "undefined") {
            offset = _offset;
            align = def_align;
            codeVal = _align;
        } else {
            offset = _offset;
            align = _align;
            codeVal = _codeVal;
        }
        let S = inst;
        if (offset>0) S += ` offset=${offset}`;
        if (align!=def_align) S += ` align=${1 << align}`;
        return [idxCode, codeVal, S];
    }

    i64_load8_s(idxCode, _offset, _align) {
        return this.genLoad("i64.load8_s", 0, idxCode, _offset, _align);
    }

    i64_load8_u(idxCode, _offset, _align) {
        return this.genLoad("i64.load8_u", 0, idxCode, _offset, _align);
    }

    i64_load16_s(idxCode, _offset, _align) {
        return this.genLoad("i64.load16_s", 1,idxCode, _offset, _align);
    }

    i64_load16_u(idxCode, _offset, _align) {
        return this.genLoad("i64.load16_u", 1, idxCode, _offset, _align);
    }

    i64_load32_s(idxCode, _offset, _align) {
        return this.genLoad("i64.load32_s", 2, idxCode, _offset, _align);
    }

    i64_load32_u(idxCode, _offset, _align) {
        return this.genLoad("i64.load32_u", 2, idxCode, _offset, _align);
    }

    i64_load(idxCode, _offset, _align) {
        return this.genLoad("i64.load", 3, idxCode, _offset, _align);
    }


    i64_store(idxCode, _offset, _align, _codeVal) {
        return this.genStore("i64.store", 3, idxCode, _offset, _align, _codeVal);
    }

    i64_store32(idxCode, _offset, _align, _codeVal) {
        return this.genStore("i64.store32", 2, idxCode, _offset, _align, _codeVal);
    }

    i64_store16(idxCode, _offset, _align, _codeVal) {
        return this.genStore("i64.store16", 1, idxCode, _offset, _align, _codeVal);
    }

    i64_store8(idxCode, _offset, _align, _codeVal) {
        return this.genStore("i64.store8", 0, idxCode, _offset, _align, _codeVal);
    }

    i32_load8_s(idxCode, _offset, _align) {
        return this.genLoad("i32.load8_s", 0, idxCode, _offset, _align);
    }

    i32_load8_u(idxCode, _offset, _align) {
        return this.genLoad("i32.load8_u", 0, idxCode, _offset, _align);
    }

    i32_load16_s(idxCode, _offset, _align) {
        return this.genLoad("i32.load16_s", 1, idxCode, _offset, _align);
    }

    i32_load16_u(idxCode, _offset, _align) {
        return this.genLoad("i32.load16_u", 1, idxCode, _offset, _align);
    }

    i32_load(idxCode, _offset, _align) {
        return this.genLoad("i32.load", 2, idxCode, _offset, _align);
    }

    i32_store(idxCode, _offset, _align, _codeVal) {
        return this.genStore("i32.store", 2, idxCode, _offset, _align, _codeVal);
    }

    i32_store16(idxCode, _offset, _align, _codeVal) {
        return this.genStore("i32.store16", 1, idxCode, _offset, _align, _codeVal);
    }

    i32_store8(idxCode, _offset, _align, _codeVal) {
        return this.genStore("i32.store8", 0, idxCode, _offset, _align, _codeVal);
    }

    call(fnName, ...args) {
        const idx = this.module.functionIdxByName[fnName];
        if (idx === undefined)
            throw new Error(`Function not defined: Function: ${fnName}`);
        return [args, `call $${fnName}`];
    }

    call_indirect(fnIdx, ...args) {
        return [args, fnIdx, "call_indirect (type 0)"];
    }

    if(condCode, thenCode, elseCode) {
        if (elseCode) {
            return [condCode, "if", ident(thenCode), "else", ident(elseCode), "end"];
        } else {
            return [condCode, "if", ident(thenCode), "end"];
        }
    }

    block(bCode) { return ["block", ident(bCode), "end"]; }
    loop(...args) { return ["loop", ident(args), "end"]; }
    br_if(relPath, condCode) { return [condCode, `br_if ${relPath}`]; }
    br(relPath) { return `br ${relPath}`; }
    ret(rCode) { return [rCode, "return"]; }
    drop(dCode) { return [dCode,  "drop"]; }

    i64_const(num) { return `i64.const ${num}`; }
    i32_const(num) { return `i32.const ${num}`; }

    i64_eqz(opcode) { return [opcode, "i64.eqz"]; }
    i64_eq(op1code, op2code) { return [op1code, op2code, "i64.eq"]; }
    i64_ne(op1code, op2code) { return [op1code, op2code, "i64.ne"]; }
    i64_lt_s(op1code, op2code) { return [op1code, op2code, "i64.lt_s"]; }
    i64_lt_u(op1code, op2code) { return [op1code, op2code, "i64.lt_u"]; }
    i64_gt_s(op1code, op2code) { return [op1code, op2code, "i64.gt_s"]; }
    i64_gt_u(op1code, op2code) { return [op1code, op2code, "i64.gt_u"]; }
    i64_le_s(op1code, op2code) { return [op1code, op2code, "i64.le_s"]; }
    i64_le_u(op1code, op2code) { return [op1code, op2code, "i64.le_u"]; }
    i64_ge_s(op1code, op2code) { return [op1code, op2code, "i64.ge_s"]; }
    i64_ge_u(op1code, op2code) { return [op1code, op2code, "i64.ge_u"]; }
    i64_add(op1code, op2code) { return [op1code, op2code, "i64.add"]; }
    i64_sub(op1code, op2code) { return [op1code, op2code, "i64.sub"]; }
    i64_mul(op1code, op2code) { return [op1code, op2code, "i64.mul"]; }
    i64_div_s(op1code, op2code) { return [op1code, op2code, "i64.div_s"]; }
    i64_div_u(op1code, op2code) { return [op1code, op2code, "i64.div_u"]; }
    i64_rem_s(op1code, op2code) { return [op1code, op2code, "i64.rem_s"]; }
    i64_rem_u(op1code, op2code) { return [op1code, op2code, "i64.rem_u"]; }
    i64_and(op1code, op2code) { return [op1code, op2code, "i64.and"]; }
    i64_or(op1code, op2code) { return [op1code, op2code, "i64.or"]; }
    i64_xor(op1code, op2code) { return [op1code, op2code, "i64.xor"]; }
    i64_shl(op1code, op2code) { return [op1code, op2code, "i64.shl"]; }
    i64_shr_s(op1code, op2code) { return [op1code, op2code, "i64.shr_s"]; }
    i64_shr_u(op1code, op2code) { return [op1code, op2code, "i64.shr_u"]; }
    i64_extend_i32_s(op1code) { return [op1code, "i64.extend_s/i32"]; }
    i64_extend_i32_u(op1code) { return [op1code, "i64.extend_u/i32"]; }


    i32_eqz(op1code) { return [op1code, "i32.eqz"]; }
    i32_eq(op1code, op2code) { return [op1code, op2code, "i32.eq"]; }
    i32_ne(op1code, op2code) { return [op1code, op2code, "i32.ne"]; }
    i32_lt_s(op1code, op2code) { return [op1code, op2code, "i32.lt_s"]; }
    i32_lt_u(op1code, op2code) { return [op1code, op2code, "i32.lt_u"]; }
    i32_gt_s(op1code, op2code) { return [op1code, op2code, "i32.gt_s"]; }
    i32_gt_u(op1code, op2code) { return [op1code, op2code, "i32.gt_u"]; }
    i32_le_s(op1code, op2code) { return [op1code, op2code, "i32.le_s"]; }
    i32_le_u(op1code, op2code) { return [op1code, op2code, "i32.le_u"]; }
    i32_ge_s(op1code, op2code) { return [op1code, op2code, "i32.ge_s"]; }
    i32_ge_u(op1code, op2code) { return [op1code, op2code, "i32.ge_u"]; }
    i32_add(op1code, op2code) { return [op1code, op2code, "i32.add"]; }
    i32_sub(op1code, op2code) { return [op1code, op2code, "i32.sub"]; }
    i32_mul(op1code, op2code) { return [op1code, op2code, "i32.mul"]; }
    i32_div_s(op1code, op2code) { return [op1code, op2code, "i32.div_s"]; }
    i32_div_u(op1code, op2code) { return [op1code, op2code, "i32.div_u"]; }
    i32_rem_s(op1code, op2code) { return [op1code, op2code, "i32.rem_s"]; }
    i32_rem_u(op1code, op2code) { return [op1code, op2code, "i32.rem_u"]; }
    i32_and(op1code, op2code) { return [op1code, op2code, "i32.and"]; }
    i32_or(op1code, op2code) { return [op1code, op2code, "i32.or"]; }
    i32_xor(op1code, op2code) { return [op1code, op2code, "i32.xor"]; }
    i32_shl(op1code, op2code) { return [op1code, op2code, "i32.shl"]; }
    i32_shr_s(op1code, op2code) { return [op1code, op2code, "i32.shr_s"]; }
    i32_shr_u(op1code, op2code) { return [op1code, op2code, "i32.shr_u"]; }
    i32_rotl(op1code, op2code) { return [op1code, op2code, "i32.rotl"]; }
    i32_rotr(op1code, op2code) { return [op1code, op2code, "i32.rotr"]; }
    i32_wrap_i64(op1code) { return [op1code, "i32.wrap/i64"]; }

    ureachable() { return "unreachable"; }

    current_memory() { return "current_memory"; }

    comment(c) { return ";; " + c; }

}

/*
    Copyright 2019 0KIMS association.

    This file is part of wasmbuilder

    wasmbuilder is a free software: you can redistribute it and/or modify it
    under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    wasmbuilder is distributed in the hope that it will be useful, but WITHOUT
    ANY WARRANTY; without even the implied warranty of MERCHANTABILITY
    or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public
    License for more details.

    You should have received a copy of the GNU General Public License
    along with wasmbuilder. If not, see <https://www.gnu.org/licenses/>.
*/

class FunctionBuilderWat {

    constructor (module, fnName, fnType, moduleName, fieldName) {
        if (fnType == "import") {
            this.fnType = "import";
            this.moduleName = moduleName;
            this.fieldName = fieldName;
        } else if (fnType == "internal") {
            this.fnType = "internal";
            this.comment = moduleName;
        } else {
            throw new Error("Invalid function fnType: " + fnType);
        }
        this.module = module;
        this.fnName = fnName;
        this.params = [];
        this.locals = [];
        this.localIdxByName = {};
        this.code = [];
        this.returnType = null;
        this.nextLocal =0;
    }

    addParam(paramName, paramType) {
        if (this.localIdxByName[paramName])
            throw new Error(`param already exists. Function: ${this.fnName}, Param: ${paramName} `);
        const idx = this.nextLocal++;
        this.localIdxByName[paramName] = idx;
        this.params.push({
            type: paramType,
            name: paramName
        });
    }

    addLocal(localName, localType, _length) {
        if ((typeof _length != "undefined") && (_length != 1)) {
            throw new Error("Locals greater than 1 not implemented");
        }
        if (this.localIdxByName[localName])
            throw new Error(`local already exists. Function: ${this.fnName}, Param: ${localName} `);
        const idx = this.nextLocal++;
        this.localIdxByName[localName] = idx;
        this.locals.push({
            type: localType,
            name: localName,
        });
    }

    setReturnType(returnType) {
        if (this.returnType)
            throw new Error(`returnType already defined. Function: ${this.fnName}`);
        this.returnType = returnType;
    }

    getSignature() {
        let p = "";
        for (let i=0; i<this.params.length; i++) {
            if (i==0) p += " (param";
            p += " " + this.params[i].type;
        }
        if (p!="") p+= ")";
        let r = "";
        if (this.returnType) {
            r += ` (result ${this.returnType})`;
        }
        return `(type $${this.getSignatureName()} (func ${p}${r}))`;
    }

    getSignatureName() {
        let s = "_sig_";
        for (let i=0; i<this.params.length; i++) {
            s += this.params[i].type;
        }
        if (this.returnType) {
            s+="r"+this.returnType;
        }
        return s;
    }

    getBody() {
        const src = [];

        for (let i=0; i<this.params.length; i++) {
            src.push(` (param $${this.params[i].name} ${this.params[i].type})`);
        }
        if (this.returnType) {
            src.push(`(result ${this.returnType})`);
        }
        for (let i=0; i<this.locals.length; i++) {
            src.push(` (local $${this.locals[i].name} ${this.locals[i].type})`);
        }
        src.push(this.code);

        let Ss;
        if (this.comment) {
            Ss = this.comment.split("\n");
            for (let i=0; i<Ss.length; i++) {
                Ss[i] = ";; " + Ss[i];
            }
        } else {
            Ss = [];
        }

        return [
            ...Ss,
            `(func $${this.fnName} (type $${this.getSignatureName()})`,
            ident(src),
            ")"
        ];

    }

    addCode(...code) {
        this.code.push(code);
    }

    getCodeBuilder() {
        return new CodeBuilderWat(this);
    }
}

/*
    Copyright 2019 0KIMS association.

    This file is part of wasmbuilder

    wasmbuilder is a free software: you can redistribute it and/or modify it
    under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    wasmbuilder is distributed in the hope that it will be useful, but WITHOUT
    ANY WARRANTY; without even the implied warranty of MERCHANTABILITY
    or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public
    License for more details.

    You should have received a copy of the GNU General Public License
    along with wasmbuilder. If not, see <https://www.gnu.org/licenses/>.
*/

class ModuleBuilderWat {

    constructor() {
        this.functions = [];
        this.functionIdxByName = {};
        this.nImportFunctions = 0;
        this.nInternalFunctions =0;
        this.memory = {
            pagesSize: 1,
            moduleName: "env",
            fieldName: "memory"
        };
        this.free = 8;
        this.datas = [];
        this.modules = {};
        this.exports = [];
        this.functionsTable = [];
    }

    build() {
        const src = [];
        this._setSignatures();
        src.push(this._buildType());
        src.push(this._buildImport());
        if (this.functionsTable.length>0) {
            src.push(this._buildFunctionsTable());
        }
        if (this.exports.length > 0) {
            src.push(this._buildExports());
        }
        if (this.functionsTable.length>0) {
            src.push(this._buildElements());
        }
        if (this.nInternalFunctions>0) {
            src.push(this._buildFunctions());
        }
        src.push(this._buildData());
        return [
            "(module",
            ident(src),
            ")"
        ];
    }

    addFunction(fnName, comment) {
        if (typeof(this.functionIdxByName[fnName]) !== "undefined")
            throw new Error(`Function already defined: ${fnName}`);

        const idx = this.functions.length;
        this.functionIdxByName[fnName] = idx;

        this.functions.push(new FunctionBuilderWat(this, fnName, "internal", comment));

        this.nInternalFunctions++;
        return this.functions[idx];
    }

    addIimportFunction(fnName, moduleName, _fieldName) {
        if (typeof(this.functionIdxByName[fnName]) !== "undefined")
            throw new Error(`Function already defined: ${fnName}`);

        if (  (this.functions.length>0)
            &&(this.functions[this.functions.length-1].type == "internal"))
            throw new Error(`Import functions must be declared before internal: ${fnName}`);

        let fieldName = _fieldName || fnName;

        const idx = this.functions.length;
        this.functionIdxByName[fnName] = idx;

        this.functions.push(new FunctionBuilderWat(this, fnName, "import", moduleName, fieldName));

        this.nImportFunctions ++;
        return this.functions[idx];
    }

    setMemory(pagesSize, moduleName, fieldName) {
        this.memory = {
            pagesSize: pagesSize,
            moduleName: moduleName || "env",
            fieldName: fieldName || "memory"
        };
    }

    exportFunction(fnName, _exportName) {
        const exportName = _exportName || fnName;
        if (typeof(this.functionIdxByName[fnName]) === "undefined")
            throw new Error(`Function not defined: ${fnName}`);
        const idx = this.functionIdxByName[fnName];
        if (exportName != fnName) {
            this.functionIdxByName[exportName] = idx;
        }
        this.exports.push({
            exportName: exportName,
            idx: idx
        });
    }

    addFunctionToTable(fnName) {
        const idx = this.functionIdxByName[fnName];
        this.functionsTable.push(idx);
    }

    addData(offset, bytes) {
        this.datas.push({
            offset: offset,
            bytes: bytes
        });
    }

    alloc(a, b) {
        let size;
        let bytes;
        if ((Array.isArray(a) || ArrayBuffer.isView(a)) && (typeof(b) === "undefined")) {
            size = a.length;
            bytes = a;
        } else {
            size = a;
            bytes = b;
        }
        size = (((size-1)>>3) +1)<<3;       // Align to 64 bits.
        const p = this.free;
        this.free += size;
        if (bytes) {
            this.addData(p, bytes);
        }
        return p;
    }

    allocString(s) {
        const encoder = new TextEncoder();
        const uint8array = encoder.encode(s);
        return this.alloc([...uint8array, 0]);
    }

    _setSignatures() {
        this.signatures = [];
        const signatureIdxByName = {};
        if (this.functionsTable.length>0) {
            const signature = this.functions[this.functionsTable[0]].getSignature();
            const signatureName = this.functions[this.functionsTable[0]].getSignatureName();
            signatureIdxByName[signatureName] = 0;
            this.signatures.push(signature);
        }
        for (let i=0; i<this.functions.length; i++) {
            const signature = this.functions[i].getSignature();
            const signatureName = this.functions[i].getSignatureName();
            if (typeof(signatureIdxByName[signatureName]) === "undefined") {
                signatureIdxByName[signatureName] = this.signatures.length;
                this.signatures.push(signature);
            }

            this.functions[i].signatureIdx = signatureIdxByName[signatureName];
            this.functions[i].signatureName = signatureName;
        }

    }

    _buildType() {
        return this.signatures;
    }

    _buildImport() {
        const src = [];
        src.push(`(import "${this.memory.moduleName}" "${this.memory.fieldName}" (memory ${this.memory.pagesSize}))`);
        for (let i=0; i< this.nImportFunctions; i++) {
            src.push(`(import "${this.functions[i].moduleName}" "${this.functions[i].fieldName}" (func $${this.functions[i].fnName} (type $${this.functions[i].getSignatureName()})))`);
        }
        return src;
    }

    _buildFunctionsTable() {
        return `(table ${this.functionsTable.length} anyfunc)`;
    }

    _buildElements() {
        let funcs="";
        for (let i=0; i<this.functionsTable.length; i++) {
            funcs += " $"+this.functions[this.functionsTable[i]].fnName;
        }
        return `(elem (i32.const 0) ${funcs})`;
    }

    _buildExports() {
        const src = [];
        for (let i=0; i< this.exports.length; i++) {
            src.push(`(export "${this.exports[i].exportName}" (func $${this.functions[this.exports[i].idx].fnName}))`);
        }
        return src;
    }

    _buildFunctions() {
        const src = [];
        for (let i=this.nImportFunctions; i< this.nImportFunctions + this.nInternalFunctions; i++) {
            src.push(this.functions[i].getBody());
        }
        return src;
    }

    _buildData() {
        const src = [];
        const buf = Buffer.alloc(4);
        buf.writeUInt32LE(this.free, 0);
        src.push(`(data (i32.const 0) ${bytes2string(buf)})`);
        for (let i=0; i< this.datas.length; i++) {
            src.push(`(data (i32.const ${this.datas[i].offset}) ${bytes2string(this.datas[i].bytes)})`);
        }
        return src;

        function bytes2string(b) {
            let S = "\"";
            for (let i=0; i<b.length; i++) {
                if (b[i]<32 || b[i] >126 || b[i] == 34 || b[i]==92) {
                    let h=b[i].toString(16);
                    while (h.length<2) h = "0"+h;
                    S += "\\" + h;
                } else {
                    S += String.fromCharCode(b[i]);
                }
            }
            S +=  "\"";
            return S;
        }
    }

}

/*
    Copyright 2019 0KIMS association.

    This file is part of websnark (Web Assembly zkSnark Prover).

    websnark is a free software: you can redistribute it and/or modify it
    under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    websnark is distributed in the hope that it will be useful, but WITHOUT
    ANY WARRANTY; without even the implied warranty of MERCHANTABILITY
    or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public
    License for more details.

    You should have received a copy of the GNU General Public License
    along with websnark. If not, see <https://www.gnu.org/licenses/>.
*/

async function buildProtoboard(builder, defBytes, bitsPerBytes) {
    const protoboard = new Protoboard();

    protoboard.defBytes = defBytes;
    protoboard.bitsPerBytes = bitsPerBytes || 32;

    protoboard.memory = new WebAssembly.Memory({initial:20000});
    protoboard.i32 = new Uint32Array(protoboard.memory.buffer);
    protoboard.i8 = new Uint8Array(protoboard.memory.buffer);

    const moduleBuilder = new ModuleBuilder();

    const fLog32 = moduleBuilder.addIimportFunction("debug_log32", "debug", "log32");
    fLog32.addParam("x", "i32");
    const fLog64 = moduleBuilder.addIimportFunction("debug_log64", "debug", "log64");
    fLog64.addParam("x", "i32");
    fLog64.addParam("y", "i32");

    buildLog32(moduleBuilder);
    buildLog64(moduleBuilder);

    builder(moduleBuilder, protoboard);


    const code = moduleBuilder.build();

    const wasmModule = await WebAssembly.compile(code);

    protoboard.log = console.log;

    protoboard.instance = await WebAssembly.instantiate(wasmModule, {
        env: {
            "memory": protoboard.memory
        },
        debug: {
            log32: function (c1) {
                if (c1<0) c1 = 0x100000000+c1;
                let s=c1.toString(16);
                while (s.length<8) s = "0"+s;
                protoboard.log(s + ": " + c1.toString());
            },
            log64: function (c1, c2) {
                if (c1<0) c1 = 0x100000000+c1;
                if (c2<0) c2 = 0x100000000+c2;
                const n = BigInt(c1) + (BigInt(c2) << 32n);
                let s=n.toString(16);
                while (s.length<16) s = "0"+s;
                protoboard.log(s + ": " + n.toString());
            }
        }
    });

    Object.assign(protoboard, protoboard.instance.exports);
    Object.assign(protoboard, moduleBuilder.modules);

    return protoboard;

    function buildLog32(module) {

        const f = module.addFunction("log32");
        f.addParam("x", "i32");

        const c = f.getCodeBuilder();
        f.addCode(c.call("debug_log32", c.getLocal("x")));
    }

    function buildLog64(module) {

        const f = module.addFunction("log64");
        f.addParam("x", "i64");

        const c = f.getCodeBuilder();
        f.addCode(c.call(
            "debug_log64",
            c.i32_wrap_i64(c.getLocal("x")),
            c.i32_wrap_i64(
                c.i64_shr_u(
                    c.getLocal("x"),
                    c.i64_const(32)
                )
            )
        ));
    }

}

class Protoboard {

    constructor() {

    }

    alloc(length) {
        if (typeof length === "undefined") {
            length = this.defBytes;
        }
        length = (((length-1)>>3) +1)<<3;       // Align to 64 bits.

        const res = this.i32[0];
        this.i32[0] += length;
        return res;
    }

    set(pos, nums, nBytes) {
        if (!Array.isArray(nums)) {
            nums = [nums];
        }
        if (typeof nBytes === "undefined") {
            nBytes = this.defBytes;
        }

        const words = Math.floor((nBytes -1)/4)+1;
        let p = pos;

        const CHUNK = 1n << BigInt(this.bitsPerBytes);

        for (let i=0; i<nums.length; i++) {
            let v = BigInt(nums[i]);
            for (let j=0; j<words; j++) {
                const quotient = v / CHUNK;
                const remainder = v % CHUNK;
                this.i32[p>>2] = Number(remainder);
                v = quotient;
                p += 4;
            }
            if (v !== 0n) {
                throw new Error("Expected v to be 0");
            }
        }

        return pos;
    }

    get(pos, nElements, nBytes) {
        if (typeof nBytes == "undefined") {
            if (typeof nElements == "undefined") {
                nElements = 1;
                nBytes = this.defBytes;
            } else {
                nElements = nBytes;
                nBytes = this.defBytes;
            }
        }

        const words = Math.floor((nBytes -1)/4)+1;

        const CHUNK = 1n << BigInt(this.bitsPerBytes);


        const nums = [];
        for (let i=0; i<nElements; i++) {
            let acc = 0n;
            for (let j=words-1; j>=0; j--) {
                acc = acc * CHUNK;
                let v = this.i32[(pos>>2)+j];
                if (this.bitsPerBytes <32) {
                    if (v&0x80000000) v = v-0x100000000;
                }
                acc = acc + BigInt(v);
            }
            nums.push(acc);
            pos += words*4;
        }

        if (nums.length == 1) return nums[0];
        return nums;
    }
}

exports.ModuleBuilder = ModuleBuilder;
exports.ModuleBuilderWat = ModuleBuilderWat;
exports.buildProtoboard = buildProtoboard;


/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/compat get default export */
/******/ 	(() => {
/******/ 		// getDefaultExport function for compatibility with non-harmony modules
/******/ 		__webpack_require__.n = (module) => {
/******/ 			var getter = module && module.__esModule ?
/******/ 				() => (module['default']) :
/******/ 				() => (module);
/******/ 			__webpack_require__.d(getter, { a: getter });
/******/ 			return getter;
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/define property getters */
/******/ 	(() => {
/******/ 		// define getter functions for harmony exports
/******/ 		__webpack_require__.d = (exports, definition) => {
/******/ 			for(var key in definition) {
/******/ 				if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	(() => {
/******/ 		// define __esModule on exports
/******/ 		__webpack_require__.r = (exports) => {
/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	})();
/******/ 	
/************************************************************************/
/******/ 	
/******/ 	// startup
/******/ 	// Load entry module and return exports
/******/ 	// This entry module is referenced by other modules so it can't be inlined
/******/ 	var __webpack_exports__ = __webpack_require__(174);
/******/ 	
/******/ 	return __webpack_exports__;
/******/ })()
;
});