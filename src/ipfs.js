const fs = require("fs").promises;
const exec = require("child_process").exec;
const tmpdir = require("os").tmpdir;

module.exports = class IPFS {
  constructor() {}

  static add(filepath) {
    return new Promise((resolve, reject) =>
      exec(`ipfs add ${filepath}`, (err, stdout, stderr) => {
        if (err) return reject({ err, stderr });
        resolve(stdout.split(" ")[1].trim());
      })
    );
  }

  static get(ipfspath) {
    return new Promise((resolve, reject) =>
      exec(`ipfs get -o ${tmpdir()} ${ipfspath}`, (err, stdout, stderr) => {
        if (err) return reject({ err, stderr });
        resolve(ipfspath);
      })
    );
  }

  static publish(ipfspath) {
    return new Promise((resolve, reject) =>
      exec(`ipfs name publish ${ipfspath}`, (err, stdout, stderr) => {
        if (err) return reject({ err, stderr });
        const ipns = stdout.split(" ")[2];
        resolve(ipns.substr(0, ipns.length - 1).trim());
      })
    );
  }

  static resolve(ipnspath) {
    return new Promise((resolve, reject) =>
      exec(`ipfs name resolve ${ipnspath}`, (err, stdout, stderr) => {
        if (err) return reject({ err, stderr });
        resolve(stdout.replace("/ipfs/", "").trim());
      })
    );
  }
};
