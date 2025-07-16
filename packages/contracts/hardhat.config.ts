import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

const config: HardhatUserConfig = {
  solidity: "0.8.20",
  networks: {
    sepolia: {
      url: "https://sepolia.infura.io/v3/YOUR_PROJECT_ID", // Replace with your Infura project ID
      accounts: ["0xa102eb786264342a5223767a74665fefd419c19ed481144c2c7b0434cb36757f"] // Your test wallet private key
    },
    hardhat: {
      // Local development network
    }
  }
};

export default config;