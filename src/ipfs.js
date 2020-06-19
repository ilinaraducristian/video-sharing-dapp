const fs = require("fs").promises;
const exec = require("child_process").exec;
const tmpdir = require("os").tmpdir;
const ipfs = require("ipfs");

module.exports = class IPFS {
  constructor(identity) {
    if (identity != undefined) this.identity = identity;
  }

  async init() {
    if (this.identity == undefined) {
      this.node = await ipfs.create();
    } else {
      this.node = await ipfs.create({
        config: {
          Identity: this.identity,
        },
      });
    }
  }

  async newIdentity() {}

  static add(filepath) {
    this.node.add();
    // return new Promise((resolve, reject) =>
    //   exec(`ipfs add ${filepath}`, (err, stdout, stderr) => {
    //     if (err) return reject({ err, stderr });
    //     resolve(stdout.split(" ")[1].trim());
    //   })
    // );
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
