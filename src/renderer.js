const { ipcRenderer, ipcMain } = require("electron");
const db = require("./db");
$(document).ready(main);

function main() {
  // const eth_wallet = $("#eth-wallet");
  // const ipfs_wallet = $("#ipfs-wallet");

  let filepath;
  let searching = false;
  let searchBar = $("#user-ipfs-address");
  let menuButton = $("#menu");

  ipcRenderer.on("search", (event, videos) => {
    createList(videos);

    $("#loading").toggle();
    searching = false;
  });

  ipcRenderer.on("app-ready", (event, data) => {
    console.log("app-ready");
  });

  $("#search").click((event) => {
    //   $("#loading").toggle();
    //   if (searching === true) return false;
    //   searching = true;
    //   ipcRenderer.send("search", searchBar.val());
    // db.updateUser({ firstName: "asd" }).then((value) => {
    //   console.log(value);
    // });
    ipcRenderer.send("asd");
    return false;
  });
}

function createList(videos) {
  let html = `<table class="table"><thead><tr><th scope="col">#</th><th>Thumbnail</th><th scope="col">Title</th><th scope="col">Duration</th></tr></thead><tbody>`;

  videos.forEach((video, i) => {
    let videoDiv = `<tr><th scope="row">${
      i + 1
    }</th><td><img class="thumbnail" src="data:image/png;base64,${
      video.thumbnail.base64
    }"/></td><td>${video.title}</td><td>${video.duration}</td></tr>`;
    html += videoDiv;
  });
  html += `</tbody></table>`;

  $("#videos").html(html);
}
