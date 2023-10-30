
const fs = require('fs');
const path = require('path');
const util = require('util');
const webpack = require('webpack');
const babel = require("@babel/core");
const webpackConfig = require('./webpack.config');

let distDir = path.join(__dirname, 'dist');
if(fs.existsSync(distDir))
  fs.rmdirSync(distDir, { recursive: true });
fs.mkdirSync(distDir);

function copyIfFound(filename, dstpath, dstname) {
  let srcFile = path.join(distDir, filename);
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

function deleteMatching(pattern, dstpath) {
  let fsptr = fs.readdirSync(dstpath);
  for(let i = 0; i < fsptr.length; i++) {
    if(fsptr[i].match(pattern)) {
      fs.rmSync(path.join(dstpath, fsptr[i]));
    }
  }
}

function copyMatching(pattern, dstpath) {
  let fsptr = fs.readdirSync(distDir);
  for(let i = 0; i < fsptr.length; i++) {
    if(fsptr[i].match(pattern)) {
      copyIfFound(fsptr[i], dstpath);
    }
  }
}

(new Promise((resolve, reject) => {
  console.log("Building pow-faucet-client...");
  let compiler = webpack(webpackConfig);
  compiler.options.stats = { modulesSpace: 999 };
  compiler.run((err, res) => {
    if (err)
      return reject(err);
    fs.writeFileSync(path.join(distDir, "webpack-stats.json"), JSON.stringify(res.toJson({
      assets: false,
      hash: true,
    })));

    resolve(res.toString({
      colors: true
    }));
  });
})).then((res) => {
  console.log(res);
  
  let staticPath = path.join(__dirname, "..", "static");

  copyIfFound("powfaucet.css", path.join(staticPath, "css"));
  copyIfFoundOrRemove("powfaucet.css.map", path.join(staticPath, "css"));

  copyIfFound("powfaucet.js", path.join(staticPath, "js"));
  copyIfFoundOrRemove("powfaucet.js.map", path.join(staticPath, "js"));

  copyIfFound("powfaucet-worker-sc.js", path.join(staticPath, "js"));
  copyIfFoundOrRemove("powfaucet-worker-sc.js.map", path.join(staticPath, "js"));

  copyIfFound("powfaucet-worker-cn.js", path.join(staticPath, "js"));
  copyIfFoundOrRemove("powfaucet-worker-cn.js.map", path.join(staticPath, "js"));

  copyIfFound("powfaucet-worker-a2.js", path.join(staticPath, "js"));
  copyIfFoundOrRemove("powfaucet-worker-a2.js.map", path.join(staticPath, "js"));

  deleteMatching("powfaucet-chunk-.*", path.join(staticPath, "js"));
  copyMatching("powfaucet-chunk-.*", path.join(staticPath, "js"));
  copyMatching("powfaucet\\..*\\.css", path.join(staticPath, "js"));

  console.log("finished");
});

