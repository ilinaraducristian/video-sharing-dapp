const fs = require("fs").promises;
const exec = require("child_process").exec;
const tmpdir = require("os").tmpdir;
const ipfs = require("ipfs");
const BufferList = require("bl/BufferList");

module.exports = class IPFS {
  static node;

  static async init(identity) {
    if (identity == undefined) {
      IPFS.node = await ipfs.create();
    } else {
      IPFS.node = await ipfs.create({
        config: {
          Identity: identity,
        },
      });
    }
  }

  static add(filepath) {
    return IPFS.node.add(filepath, { timeout: 3000 });
  }

  static async ls(ipfsPath) {
    const chunks = [];
    for await (const chunk of IPFS.node.ls(ipfsPath, { timeout: 3000 })) {
      chunks.push(chunk);
    }

    return chunks;
  }

  static async cat(ipfsPath) {
    const chunks = [];
    for await (const chunk of IPFS.node.cat(ipfsPath, { timeout: 3000 })) {
      chunks.push(chunk);
    }
    return Buffer.concat(chunks);
  }

  static async add(filePath) {
    const file = await fs.readFile(filePath);
    let chunks = [];
    for await (const chunk of IPFS.node.add(file)) {
      chunks.push(chunk);
    }
    return chunks[0].cid.toString().replace("CID(", "").replace(")", "");
  }

  static async get(cid) {
    for await (const file of IPFS.node.get(cid, { timeout: 3000 })) {
      if (!file.content) continue;

      const content = new BufferList();
      for await (const chunk of file.content) {
        content.append(chunk);
      }

      console.log(content.toString());
    }
  }

  static publish(cid) {
    return new Promise((resolve, reject) =>
      exec(`ipfs name publish ${cid}`, (err, stdout, stderr) => {
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
