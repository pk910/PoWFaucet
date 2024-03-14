
const groth16 = require('@zk-kit/groth16');
const ffjavascript = require('ffjavascript');

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
