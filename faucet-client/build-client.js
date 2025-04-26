import fs from 'fs';
import path from 'path';
import util from 'util';
import webpack from 'webpack';
import babel from "@babel/core";
import webpackConfig from './webpack.config.js';

let distDir = path.join(import.meta.dirname, 'dist');
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

function checkFileExists(filename, dstpath) {
  let dstfile = path.join(dstpath, filename);
  if(!fs.existsSync(dstfile)) {
    throw "file not found: " + dstfile;
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
  
  let staticPath = path.join(import.meta.dirname, "..", "static");
  if(!fs.existsSync(path.join(staticPath, "js")))
    fs.mkdirSync(path.join(staticPath, "js"));
  if(!fs.existsSync(path.join(staticPath, "css")))
    fs.mkdirSync(path.join(staticPath, "css"));

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

  copyIfFound("powfaucet-worker-nm.js", path.join(staticPath, "js"));
  copyIfFoundOrRemove("powfaucet-worker-nm.js.map", path.join(staticPath, "js"));

  console.log("finished");
}).then(() => {
  let staticPath = path.join(import.meta.dirname, "..", "static");
  checkFileExists("powfaucet.css", path.join(staticPath, "css"));
  checkFileExists("powfaucet.js", path.join(staticPath, "js"));
  checkFileExists("powfaucet-worker-sc.js", path.join(staticPath, "js"));
  checkFileExists("powfaucet-worker-cn.js", path.join(staticPath, "js"));
  checkFileExists("powfaucet-worker-a2.js", path.join(staticPath, "js"));
  checkFileExists("powfaucet-worker-nm.js", path.join(staticPath, "js"));
}).catch((err) => {
  console.log("build failed: ", err);
  process.exit(1);
});

