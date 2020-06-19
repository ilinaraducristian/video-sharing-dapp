// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.6.9;
pragma experimental ABIEncoderV2;

contract Database {
    struct User {
        string firstName;
        string lastName;
        string avatarIPFSAddress;
        string videosIPFSAddress;
        string subscribersIPFSAddress;
    }

    mapping(address => User) public users;

    function updateUser(
        string memory firstName,
        string memory lastName,
        string memory avatarIPFSAddress,
        string memory videosIPFSAddress,
        string memory subscribersIPFSAddress
    ) public {
        users[msg.sender] = User(
            firstName,
            lastName,
            avatarIPFSAddress,
            videosIPFSAddress,
            subscribersIPFSAddress
        );
    }

    function getUser(address user) public view returns (User memory) {
        return users[user];
    }
}
