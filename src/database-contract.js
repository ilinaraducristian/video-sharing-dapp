const web3 = require("./web3");

module.exports = class DatabaseContract {
  static abi;
  static bin;

  constructor(address, options) {
    try {
      if (address == undefined && options == undefined) {
        this.contract = new web3.eth.Contract(DatabaseContract.abi);
      } else {
        this.contract = new web3.eth.Contract(
          DatabaseContract.abi,
          address,
          options
        );
        this.address = address;
      }
    } catch {}
  }

  static init(contracts, web3) {
    const contractKey = Object.keys(contracts).find((key) =>
      key.includes("Database")
    );
    if (contractKey == undefined) throw new Error("Contract not found!");
    const contract = contracts[contractKey];
    DatabaseContract.abi = JSON.parse(contract.abi);
    DatabaseContract.bin = contract.bin;
    web3 = web3;
  }

  static async deploy(from) {
    const newContract = new DatabaseContract();

    await newContract.contract
      .deploy({
        data: `0x${DatabaseContract.bin}`,
      })
      .send({
        from,
        gas: 0,
        gasPrice: "0",
      })
      .on("receipt", (receipt) => {
        newContract.address = receipt.contractAddress;
      });
    return newContract;
  }

  async getUser(from) {
    const callResponse = await this.contract.methods.getUser(from).call();
    const userParameters = callResponse.map((hexParameter) =>
      web3.utils.toUtf8(hexParameter)
    );
    return {
      firstName: userParameters[0],
      lastName: userParameters[1],
      avatarIPFSAddress: userParameters[2],
      videosIPFSAddress: userParameters[3],
      subscribersIPFSAddress: userParameters[4],
    };
  }

  updateUser(user, from) {
    return this.contract.methods
      .updateUser(
        web3.utils.fromAscii(user.firstName),
        web3.utils.fromAscii(user.lastName),
        web3.utils.fromAscii(user.avatarIPFSAddress),
        web3.utils.fromAscii(user.videosIPFSAddress),
        web3.utils.fromAscii(user.subscribersIPFSAddress)
      )
      .send({ from });
  }
};
