// class DB {
//   constructor() {
//     const openRequest = indexedDB.open("db");
//     openRequest.onerror = this.failed;
//     openRequest.onupgradeneeded = (event) => {
//       this.db = openRequest.result;
//       if (!this.db.objectStoreNames.contains("user"))
//         this.db.createObjectStore("user", { keyPath: "id" });
//     };
//     openRequest.onsuccess = (event) => {
//       this.db = openRequest.result;
//     };
//   }

//   failed(event) {
//     throw new Error("error opening app report to dev");
//   }

//   updateUser(user) {
//     const transaction = this.db.transaction("user", "readwrite");
//     const userStore = transaction.objectStore("user");

//     const request = userStore.put(user, 0);
//     return new Promise((resolve, reject) => {
//       request.onsuccess = () => {
//         resolve(request.result);
//       };

//       request.onerror = (event) => {
//         reject(request.error);
//       };
//     });
//   }

//   getUser() {
//     const transaction = this.db.transaction("user");
//     const userStore = transaction.objectStore("user");

//     return userStore.get(0);
//   }
// }

class DB {}

module.exports = new DB();
