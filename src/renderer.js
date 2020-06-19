const { ipcRenderer, ipcMain } = require("electron");
$(document).ready(main);

function main() {
  // const eth_wallet = $("#eth-wallet");
  // const ipfs_wallet = $("#ipfs-wallet");

  let filepath;
  let searching = false;
  let searchBar = $("#user-ipfs-address");
  // $("#new-ipfs-identity").click((event) => {
  //   let password = $("#password").value;
  //   ipcRenderer.send("new-ipfs-identity", password);
  //   return false;
  // });
  // $("#upload").click((event) => {
  //   let name = $("#name").value;
  //   let description = $("#description").value;
  //   ipcRenderer.send("upload", filepath, name, description);
  //   return false;
  // });

  // $("#video").click((event) => {
  //   filepath = event.target.files[0].path;
  // });

  // ipcRenderer.on("upload", (event, args) => {
  //   if (args[0]) {
  //     // eroare
  //   } else {
  //     // ok
  //   }
  // });

  // ipcRenderer.on("upload-progress", (event, args) => {
  //   if (args[0]) {
  //     // eroare
  //   } else {
  //     console.log(args[1]);
  //   }
  // });

  // ipcRenderer.on("eth-wallet", (event, args) => {
  //   eth_wallet.textContent = args[0];
  // });

  // ipcRenderer.on("ipfs-wallet", (event, args) => {
  //   ipfs_wallet.textContent = args[0];
  // });

  ipcRenderer.on("search", (event, user) => {
    // if (args[0]) {
    //   // error
    // } else {
    //   console.log("loaded");
    //   createList(args[1]);
    //   searching = false;
    // }
  });

  $("#search").click((event) => {
    console.log("loading");
    if (searching === true) return false;
    searching = true;
    ipcRenderer.send("search", searchBar.val());
    // createList([{ name: "ahbasdbasjkdbajks ads", duration: "13:53" }]);
    return false;
  });
}

function createList(videos) {
  const row = $(`<div class="row"></div>`);
  const container = $(`<div class="container"></div>`);
  row.append(container);
  $("#main").append(row);

  videos.forEach((video, i) => {
    const row = $(`<div class="row"></div>`);
    row.append(`<div class="col-1 center-text">${i + 1}</div>`);
    row.append(`<div class="col-9 video-name">${video.name}</div>`);
    row.append(`<div class="col-2 center-text">${video.duration}</div>`);
    container.append(row);
  });
}
