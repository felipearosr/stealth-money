import { ethers } from "hardhat";

async function main() {
  // Sepolia USDC address for testing (Circle's official Sepolia USDC)
  const STABLECOIN_ADDRESS = "0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8";

  console.log("Deploying TransferManager contract...");
  console.log("Using stablecoin address:", STABLECOIN_ADDRESS);

  // Get the TransferManager contract factory
  const TransferManager = await ethers.getContractFactory("TransferManager");

  // Deploy the contract with the stablecoin address
  const transferManager = await TransferManager.deploy(STABLECOIN_ADDRESS);

  // Wait for the deployment to be confirmed
  await transferManager.waitForDeployment();

  // Get the deployed contract address
  const contractAddress = await transferManager.getAddress();

  console.log("TransferManager deployed to:", contractAddress);
  console.log("Deployment completed successfully!");
}

// Standard Hardhat boilerplate
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Deployment failed:", error);
    process.exit(1);
  });