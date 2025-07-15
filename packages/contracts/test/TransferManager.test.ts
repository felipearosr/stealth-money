import { expect } from "chai";
import { ethers } from "hardhat";
import { TransferManager, MockERC20 } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("TransferManager", function () {
  let transferManager: TransferManager;
  let mockToken: MockERC20;
  let owner: HardhatEthersSigner;
  let user: HardhatEthersSigner;
  let recipient: HardhatEthersSigner;
  let nonOwner: HardhatEthersSigner;

  const INITIAL_SUPPLY = ethers.parseUnits("1000000", 18); // 1M tokens
  const DEPOSIT_AMOUNT = ethers.parseUnits("100", 18); // 100 tokens
  const RELEASE_AMOUNT = ethers.parseUnits("50", 18); // 50 tokens
  const TRANSACTION_ID = ethers.keccak256(ethers.toUtf8Bytes("test-tx-001"));

  beforeEach(async function () {
    // Get signers
    [owner, user, recipient, nonOwner] = await ethers.getSigners();

    // Deploy MockERC20 token
    const MockERC20Factory = await ethers.getContractFactory("MockERC20");
    mockToken = await MockERC20Factory.deploy("Mock USDC", "mUSDC");
    await mockToken.waitForDeployment();

    // Deploy TransferManager contract
    const TransferManagerFactory = await ethers.getContractFactory("TransferManager");
    transferManager = await TransferManagerFactory.deploy(await mockToken.getAddress());
    await transferManager.waitForDeployment();

    // Mint tokens to user for testing
    await mockToken.mint(user.address, INITIAL_SUPPLY);
    
    // Approve TransferManager to spend user's tokens
    await mockToken.connect(user).approve(await transferManager.getAddress(), INITIAL_SUPPLY);
  });

  describe("Deployment", function () {
    it("Should set the correct token address", async function () {
      expect(await transferManager.token()).to.equal(await mockToken.getAddress());
    });

    it("Should set the correct owner", async function () {
      expect(await transferManager.owner()).to.equal(owner.address);
    });

    it("Should revert if token address is zero", async function () {
      const TransferManagerFactory = await ethers.getContractFactory("TransferManager");
      await expect(
        TransferManagerFactory.deploy(ethers.ZeroAddress)
      ).to.be.revertedWithCustomError(transferManager, "ZeroAddress");
    });
  });

  describe("Deposits", function () {
    it("Should successfully handle a valid deposit", async function () {
      const initialBalance = await mockToken.balanceOf(await transferManager.getAddress());
      
      await transferManager.connect(user).deposit(DEPOSIT_AMOUNT, TRANSACTION_ID);
      
      const finalBalance = await mockToken.balanceOf(await transferManager.getAddress());
      expect(finalBalance - initialBalance).to.equal(DEPOSIT_AMOUNT);
    });

    it("Should emit FundsDeposited event with correct arguments", async function () {
      await expect(
        transferManager.connect(user).deposit(DEPOSIT_AMOUNT, TRANSACTION_ID)
      )
        .to.emit(transferManager, "FundsDeposited")
        .withArgs(user.address, DEPOSIT_AMOUNT, TRANSACTION_ID);
    });

    it("Should revert if user tries to deposit zero tokens", async function () {
      await expect(
        transferManager.connect(user).deposit(0, TRANSACTION_ID)
      ).to.be.revertedWithCustomError(transferManager, "ZeroAmount");
    });

    it("Should revert if user has insufficient balance", async function () {
      const excessiveAmount = INITIAL_SUPPLY + ethers.parseUnits("1", 18);
      
      await expect(
        transferManager.connect(user).deposit(excessiveAmount, TRANSACTION_ID)
      ).to.be.reverted;
    });

    it("Should revert if user has not approved sufficient tokens", async function () {
      // Deploy new user without approval
      const [, , , newUser] = await ethers.getSigners();
      await mockToken.mint(newUser.address, DEPOSIT_AMOUNT);
      
      await expect(
        transferManager.connect(newUser).deposit(DEPOSIT_AMOUNT, TRANSACTION_ID)
      ).to.be.reverted;
    });
  });

  describe("Releases", function () {
    beforeEach(async function () {
      // Deposit some funds first for release tests
      await transferManager.connect(user).deposit(DEPOSIT_AMOUNT, TRANSACTION_ID);
    });

    it("Should allow owner to successfully release funds", async function () {
      const initialRecipientBalance = await mockToken.balanceOf(recipient.address);
      const initialContractBalance = await mockToken.balanceOf(await transferManager.getAddress());
      
      await transferManager.connect(owner).release(recipient.address, RELEASE_AMOUNT, TRANSACTION_ID);
      
      const finalRecipientBalance = await mockToken.balanceOf(recipient.address);
      const finalContractBalance = await mockToken.balanceOf(await transferManager.getAddress());
      
      expect(finalRecipientBalance - initialRecipientBalance).to.equal(RELEASE_AMOUNT);
      expect(initialContractBalance - finalContractBalance).to.equal(RELEASE_AMOUNT);
    });

    it("Should emit FundsReleased event on successful release", async function () {
      await expect(
        transferManager.connect(owner).release(recipient.address, RELEASE_AMOUNT, TRANSACTION_ID)
      )
        .to.emit(transferManager, "FundsReleased")
        .withArgs(recipient.address, RELEASE_AMOUNT, TRANSACTION_ID);
    });

    it("Should revert if non-owner tries to call release function", async function () {
      await expect(
        transferManager.connect(nonOwner).release(recipient.address, RELEASE_AMOUNT, TRANSACTION_ID)
      ).to.be.revertedWithCustomError(transferManager, "OwnableUnauthorizedAccount")
        .withArgs(nonOwner.address);
    });

    it("Should revert if owner tries to release more funds than contract holds", async function () {
      const excessiveAmount = DEPOSIT_AMOUNT + ethers.parseUnits("1", 18);
      
      await expect(
        transferManager.connect(owner).release(recipient.address, excessiveAmount, TRANSACTION_ID)
      ).to.be.revertedWithCustomError(transferManager, "InsufficientContractBalance");
    });

    it("Should revert if owner tries to release funds to zero address", async function () {
      await expect(
        transferManager.connect(owner).release(ethers.ZeroAddress, RELEASE_AMOUNT, TRANSACTION_ID)
      ).to.be.revertedWithCustomError(transferManager, "ZeroAddress");
    });

    it("Should allow owner to release all available funds", async function () {
      const contractBalance = await mockToken.balanceOf(await transferManager.getAddress());
      
      await expect(
        transferManager.connect(owner).release(recipient.address, contractBalance, TRANSACTION_ID)
      ).to.not.be.reverted;
      
      const finalContractBalance = await mockToken.balanceOf(await transferManager.getAddress());
      expect(finalContractBalance).to.equal(0);
    });
  });

  describe("Edge Cases", function () {
    it("Should handle multiple deposits from different users", async function () {
      const [, , , user2] = await ethers.getSigners();
      await mockToken.mint(user2.address, DEPOSIT_AMOUNT);
      await mockToken.connect(user2).approve(await transferManager.getAddress(), DEPOSIT_AMOUNT);
      
      const txId1 = ethers.keccak256(ethers.toUtf8Bytes("tx-001"));
      const txId2 = ethers.keccak256(ethers.toUtf8Bytes("tx-002"));
      
      await transferManager.connect(user).deposit(DEPOSIT_AMOUNT, txId1);
      await transferManager.connect(user2).deposit(DEPOSIT_AMOUNT, txId2);
      
      const contractBalance = await mockToken.balanceOf(await transferManager.getAddress());
      expect(contractBalance).to.equal(DEPOSIT_AMOUNT * 2n);
    });

    it("Should handle multiple releases to different recipients", async function () {
      // Deposit enough funds
      await transferManager.connect(user).deposit(DEPOSIT_AMOUNT, TRANSACTION_ID);
      
      const [, , recipient1, recipient2] = await ethers.getSigners();
      const releaseAmount = DEPOSIT_AMOUNT / 2n;
      
      const txId1 = ethers.keccak256(ethers.toUtf8Bytes("release-001"));
      const txId2 = ethers.keccak256(ethers.toUtf8Bytes("release-002"));
      
      await transferManager.connect(owner).release(recipient1.address, releaseAmount, txId1);
      await transferManager.connect(owner).release(recipient2.address, releaseAmount, txId2);
      
      expect(await mockToken.balanceOf(recipient1.address)).to.equal(releaseAmount);
      expect(await mockToken.balanceOf(recipient2.address)).to.equal(releaseAmount);
    });

    it("Should maintain correct contract balance after multiple operations", async function () {
      const txId1 = ethers.keccak256(ethers.toUtf8Bytes("tx-001"));
      const txId2 = ethers.keccak256(ethers.toUtf8Bytes("tx-002"));
      
      // Deposit
      await transferManager.connect(user).deposit(DEPOSIT_AMOUNT, txId1);
      expect(await mockToken.balanceOf(await transferManager.getAddress())).to.equal(DEPOSIT_AMOUNT);
      
      // Partial release
      await transferManager.connect(owner).release(recipient.address, RELEASE_AMOUNT, txId2);
      expect(await mockToken.balanceOf(await transferManager.getAddress())).to.equal(DEPOSIT_AMOUNT - RELEASE_AMOUNT);
    });
  });
});