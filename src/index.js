const { app, BrowserWindow } = require("electron");
const path = require("path");
const { ipcMain } = require("electron");
const web3 = require("./web3");
const VideoProcessor = require("./video-processor");
const IPFS = require("./ipfs");
const fs = require("fs").promises;
const os = require("os");
const homedir = os.homedir();
const tmpdir = os.tmpdir();
const DatabaseContract = require("./database-contract");

if (require("electron-squirrel-startup")) {
  app.quit();
}

let mainWindow;
const contractAddress = `0x32600864Dc2f94d8e62BBE7d63618120831CEaFd`;

let keystore;
let node;
let databaseContract;
let isIPFSInitialized = false;
let isETHInitialized = false;

let ipfsIdentity;
let ethIdentity;

const createWindow = async () => {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: { nodeIntegration: true },
  });

  mainWindow.loadFile(path.join(__dirname, "index.html"));

  mainWindow.webContents.openDevTools();

  try {
    await loadContracts();
  } catch {
    // show error
    return;
  }

  let user = localStorage.getItem("user");
  if (user) {
    user = JSON.parse(user);
    await Promise.all(
      IPFS.init(user.ipfsIdentity)
        .then(() => {
          ipfsIdentity = user.ipfsIdentity;
        })
        .catch(() => IPFS.init())
        .then(() => {
          isIPFSInitialized = true;
        }),
      web3.eth.personal
        .unlockAccount(user.ethIdentity.address, user.ethIdentity.password, 300)
        .then(() => {
          ethIdentity = user.ethIdentity;
        })
        .catch(() => {
          isETHInitialized = true;
        })
    );
  } else {
    await IPFS.init().then(() => {
      isIPFSInitialized = true;
    });
    isETHInitialized = true;
  }

  ipcMain.on("asd", () => {
    mainWindow.webContents.send("app-ready", {});
  });

  mainWindow.webContents.send("app-ready", {});

  // ipcMainEvents();
  // load contracts
  // if(failed to load contracts) show message "app corrupt redownload" and stop app loading
  // else continue
  // start paralel:
  // 1. if eth identity present load user data (name videos subs etc), if failed dont load anything and delete identity from db
  // 2. if ipfs identity present create node with that identiy, if fail delete identity from db and create node with new identity => ipfs logged in = false
  // after above 2 complete, register ipcMain events
};

async function loadContracts() {
  const contractsFile = await fs.readFile(
    `${__dirname}/contracts/contracts.json`,
    {
      encoding: "utf-8",
    }
  );
  const contracts = JSON.parse(contractsFile).contracts;
  DatabaseContract.init(contracts, web3);
  databaseContract = new DatabaseContract(contractAddress);
}

function ipcMainEvents() {
  ipcMain.on("upload", (event, filepath, name, description) => {
    fs.access(filepath)
      .then(() => {
        uploadVideo(filepath, name, description);
        event.reply("upload", "ok");
      })
      .catch((reason) => {
        event.reply("upload", reason);
      });
  });

  ipcMain.on("search", async (event, userIPFSAddress) => {
    const videos = [];
    const user = await databaseContract.getUser(userIPFSAddress);
    const videosIPFSPath = (await IPFS.cat(user.videosIPFSAddress))
      .toString("utf-8")
      .match(/.+/g);
    for (const videoIPFSPath of videosIPFSPath) {
      const files = await IPFS.ls(videoIPFSPath);
      let metadata = files.find((file) => file.name === "metadata.json");
      if (metadata == null) return;
      try {
        metadata = JSON.parse((await IPFS.cat(metadata.path)).toString("utf8"));
      } catch {
        return;
      }
      const thumbnail = await IPFS.cat(
        `${videoIPFSPath}/${metadata.thumbnail}`
      );
      metadata.thumbnail = {
        filename: metadata.thumbnail,
        base64: thumbnail.toString("base64"),
      };
      videos.push(metadata);
    }
    event.reply("search", videos);
    // const videos = await IPFS.ls(videosIPFSPath)
  });
}

async function loadKeystore() {
  const keystoreDir = `${homedir}/.ethereum/keystore`;
  keystore = await fs
    .readdir(keystoreDir, { encoding: "utf-8" })
    .then((files) =>
      fs.readFile(`${keystoreDir}/${files[0]}`, { encoding: "utf-8" })
    )
    .then((keystore) => {
      walletLoaded = true;
      return JSON.parse(keystore);
    });
}

async function uploadVideo(filepath, name, description) {
  const lastSlash = filepath.lastIndexOf("/");
  const lastDot = filepath.lastIndexOf(".");
  const dir = filepath.substring(0, lastSlash);
  const fileExtension = filepath.substring(lastDot + 1);
  const filename = filepath.substring(lastSlash + 1, lastDot);
  await VideoProcessor.toMultipleQualities(filepath, (progress) => {
    sendToRenderer("upload-progress", undefined, progress);
  });
  let videofile = {
    name,
    description,
    duration: 0,
    qualities: {},
  };
  let videoInfo = await VideoProcessor.getVideoInfo(filepath);
  // add quality to file
  videofile.duration = videoInfo.duration;
  let qualityIndex = VideoProcessor.qualities.indexOf(videoInfo.quality);

  let promises = [];
  for (let i = 0; i < qualityIndex; i++) {
    promises.push(
      IPFS.add(
        `${dir}/${filename}-${VideoProcessor.qualities[i]}.${fileExtension}`
      ).then((ipfspath) => {
        videofile.qualities[VideoProcessor.qualities[i]] = ipfspath;
      })
    );
  }
  promises.push(
    IPFS.add(filepath).then((ipfspath) => {
      videofile.qualities[VideoProcessor.qualities[qualityIndex]] = ipfspath;
    })
  );
  Promise.all(promises)
    .then(() =>
      fs.writeFile(`${tmpdir}/videoFile.json`, JSON.stringify(videofile), {
        encoding: "utf-8",
      })
    )
    .then(() => IPFS.add(`${tmpdir}/videoFile.json`).then(IPFS.publish))
    .then((ipns) => {
      console.log(ipns);
    })
    .then(() =>
      fs.rename(
        filepath,
        `${dir}/${filename}-${VideoProcessor.qualities[qualityIndex]}.${fileExtension}`
      )
    );
}

function sendToRenderer(channel, ...args) {
  mainWindow.webContents.send(channel, args);
}

app.on("ready", createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
