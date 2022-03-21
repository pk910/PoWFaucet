
module.exports = (function() {
    var args = {};
    var arg, key;
    for(var i = 0; i < process.argv.length; i++) {
        if((arg = /^--([^=]+)(?:=(.+))?$/.exec(process.argv[i]))) {
            key = arg[1];
            args[arg[1]] = arg[2] || true;
        }
        else if(key) {
            args[key] = process.argv[i];
            key = null;
        }
    }
    return args;
})();
