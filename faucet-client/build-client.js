
const fs = require('fs');
const path = require('path');
const webpack = require('webpack');
const webpackConfig = require('./webpack.config');

let distDirt = path.join(__dirname, 'dist');
fs.rmdirSync(distDirt, { recursive: true });

function copyIfFound(filename, dstpath, dstname) {
  let srcFile = path.join(distDirt, filename);
  if(!dstname)
    dstname = filename;
  if(!fs.existsSync(srcFile))
    return false;
  fs.copyFileSync(srcFile, path.join(dstpath, dstname));
  return true;
}

function copyIfFoundOrRemove(filename, dstpath, dstname) {
  if(!copyIfFound(filename, dstpath, dstname)) {
    let dstfile = path.join(dstpath, dstname || filename);
    if(fs.existsSync(dstfile))
      fs.rmSync(dstfile);
  }
}

(new Promise((resolve, reject) => {
  webpack(webpackConfig).run((err, res) => {
    if (err)
      return reject(err);
    resolve(res);
  });
})).then((res) => {
  console.log(res);
  let staticPath = path.join(__dirname, "..", "static");

  copyIfFound("powcaptcha.css", path.join(staticPath, "css"));
  copyIfFound("powcaptcha.min.css", path.join(staticPath, "css"), "powcaptcha.css");
  copyIfFoundOrRemove("powcaptcha.css.map", path.join(staticPath, "css"));

  copyIfFound("powcaptcha.js", path.join(staticPath, "js"));
  copyIfFound("powcaptcha.min.js", path.join(staticPath, "js"), "powcaptcha.js");
  copyIfFoundOrRemove("powcaptcha.js.map", path.join(staticPath, "js"));

  copyIfFound("powcaptcha-worker.js", path.join(staticPath, "js"));
  copyIfFound("powcaptcha-worker.min.js", path.join(staticPath, "js"), "powcaptcha-worker.js");
  copyIfFoundOrRemove("powcaptcha-worker.js.map", path.join(staticPath, "js"));

  console.log("finished");
});

