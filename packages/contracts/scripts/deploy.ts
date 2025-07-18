import { ethers, network } from "hardhat";

async function main() {
  console.log(`🚀 Deploying contracts to ${network.name}...`);
  
  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  
  // Check deployer balance
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "ETH");
  
  if (balance < ethers.parseEther("0.01")) {
    console.warn("⚠️  Low balance! You may need more ETH for deployment and gas fees.");
    if (network.name === "sepolia") {
      console.log("Get Sepolia ETH from: https://sepoliafaucet.com/");
    }
  }

  let stablecoinAddress: string;
  
  if (network.name === "sepolia") {
    // Use Circle's official Sepolia USDC for testnet
    stablecoinAddress = "0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8";
    console.log("Using Sepolia USDC:", stablecoinAddress);
  } else if (network.name === "hardhat" || network.name === "localhost") {
    // Deploy a mock ERC20 token for local testing
    console.log("📝 Deploying MockERC20 for local testing...");
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const mockToken = await MockERC20.deploy("Test USDC", "TUSDC");
    await mockToken.waitForDeployment();
    stablecoinAddress = await mockToken.getAddress();
    
    // Mint some tokens to the deployer for testing
    const mintAmount = ethers.parseUnits("10000", 6); // 10,000 TUSDC with 6 decimals
    await mockToken.mint(deployer.address, mintAmount);
    
    console.log("MockERC20 deployed to:", stablecoinAddress);
    console.log("Minted 10,000 TUSDC to deployer");
  } else {
    throw new Error(`Unsupported network: ${network.name}`);
  }

  console.log("📝 Deploying TransferManager contract...");
  console.log("Using stablecoin address:", stablecoinAddress);

  // Get the TransferManager contract factory
  const TransferManager = await ethers.getContractFactory("TransferManager");

  // Deploy the contract with the stablecoin address
  const transferManager = await TransferManager.deploy(stablecoinAddress);

  // Wait for the deployment to be confirmed
  await transferManager.waitForDeployment();

  // Get the deployed contract address
  const contractAddress = await transferManager.getAddress();

  console.log("✅ TransferManager deployed to:", contractAddress);
  
  // Verify the deployment
  console.log("🔍 Verifying deployment...");
  const tokenAddress = await transferManager.token();
  const owner = await transferManager.owner();
  
  console.log("Contract token address:", tokenAddress);
  console.log("Contract owner:", owner);
  
  if (tokenAddress.toLowerCase() !== stablecoinAddress.toLowerCase()) {
    throw new Error("Token address mismatch!");
  }
  
  if (owner.toLowerCase() !== deployer.address.toLowerCase()) {
    throw new Error("Owner address mismatch!");
  }

  console.log("🎉 Deployment completed successfully!");
  console.log("\n📋 Configuration for .env file:");
  console.log(`TRANSFER_MANAGER_CONTRACT_ADDRESS=${contractAddress}`);
  console.log(`BLOCKCHAIN_NETWORK=${network.name}`);
  
  if (network.name === "sepolia") {
    console.log("\n🔗 Etherscan verification:");
    console.log(`npx hardhat verify --network sepolia ${contractAddress} ${stablecoinAddress}`);
  }
}

// Standard Hardhat boilerplate
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });