module.exports = class Database {
  static web3;
  static abi;
  static bin;

  constructor(address, options) {
    try {
      if (address == undefined && options == undefined) {
        this.contract = new Database.web3.eth.Contract(Database.abi);
      } else {
        this.contract = new Database.web3.eth.Contract(
          Database.abi,
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
    Database.abi = JSON.parse(contract.abi);
    Database.bin = contract.bin;
    Database.web3 = web3;
  }

  static async deploy(from) {
    const newContract = new Database();

    await newContract.contract
      .deploy({
        data: `0x${Database.bin}`,
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
      Database.web3.utils.toUtf8(hexParameter)
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
        Database.web3.utils.fromAscii(user.firstName),
        Database.web3.utils.fromAscii(user.lastName),
        Database.web3.utils.fromAscii(user.avatarIPFSAddress),
        Database.web3.utils.fromAscii(user.videosIPFSAddress),
        Database.web3.utils.fromAscii(user.subscribersIPFSAddress)
      )
      .send({ from });
  }
};
