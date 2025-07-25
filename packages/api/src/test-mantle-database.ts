// Test script to verify Mantle database schema changes
import { DatabaseService } from './services/database.service';

async function testMantleDatabase() {
  const db = new DatabaseService();
  
  try {
    console.log('Testing Mantle database schema...');
    
    // Test 1: Create a transaction with Mantle fields
    console.log('1. Creating transaction with Mantle fields...');
    const transaction = await db.createTransaction({
      amount: 100,
      sourceCurrency: 'USD',
      destCurrency: 'EUR',
      exchangeRate: 0.85,
      recipientAmount: 85,
      recipientName: 'Test Recipient',
      recipientEmail: 'test@example.com',
      transferMethod: 'mantle',
      mantleWalletId: 'test-wallet-123',
      gasCostUsd: 2.50,
      networkFeeUsd: 1.25,
    });
    
    console.log('✓ Transaction created with ID:', transaction.id);
    console.log('✓ Transfer method:', transaction.transferMethod);
    console.log('✓ Mantle wallet ID:', transaction.mantleWalletId);
    console.log('✓ Gas cost USD:', transaction.gasCostUsd);
    
    // Test 2: Create a MantleTransfer record
    console.log('\n2. Creating MantleTransfer record...');
    const mantleTransfer = await db.createMantleTransfer({
      transferId: transaction.id,
      senderWalletAddress: '0x1234567890123456789012345678901234567890',
      recipientWalletAddress: '0x0987654321098765432109876543210987654321',
      tokenAddress: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
      amountWei: '100000000000000000000', // 100 tokens in wei
      gasPriceGwei: '20',
      status: 'PENDING',
    });
    
    console.log('✓ MantleTransfer created with ID:', mantleTransfer.id);
    console.log('✓ Sender wallet:', mantleTransfer.senderWalletAddress);
    console.log('✓ Recipient wallet:', mantleTransfer.recipientWalletAddress);
    console.log('✓ Amount wei:', mantleTransfer.amountWei);
    
    // Test 3: Retrieve transaction with Mantle data
    console.log('\n3. Retrieving transaction with Mantle data...');
    const retrievedTransaction = await db.getTransactionById(transaction.id);
    
    if (retrievedTransaction) {
      console.log('✓ Transaction retrieved successfully');
      console.log('✓ Transfer method:', retrievedTransaction.transferMethod);
      console.log('✓ Mantle wallet ID:', retrievedTransaction.mantleWalletId);
    }
    
    // Test 4: Retrieve MantleTransfer by transfer ID
    console.log('\n4. Retrieving MantleTransfer by transfer ID...');
    const retrievedMantleTransfer = await db.getMantleTransferByTransferId(transaction.id);
    
    if (retrievedMantleTransfer) {
      console.log('✓ MantleTransfer retrieved successfully');
      console.log('✓ Status:', retrievedMantleTransfer.status);
      console.log('✓ Token address:', retrievedMantleTransfer.tokenAddress);
    }
    
    // Test 5: Update MantleTransfer with transaction hash
    console.log('\n5. Updating MantleTransfer with transaction hash...');
    const uniqueTxHash = `0x${Date.now().toString(16).padStart(64, '0')}`;
    const updatedMantleTransfer = await db.updateMantleTransfer(transaction.id, {
      transactionHash: uniqueTxHash,
      blockNumber: BigInt(12345678),
      gasUsed: '21000',
      status: 'CONFIRMED',
    });
    
    console.log('✓ MantleTransfer updated successfully');
    console.log('✓ Transaction hash:', updatedMantleTransfer.transactionHash);
    console.log('✓ Block number:', updatedMantleTransfer.blockNumber?.toString());
    console.log('✓ Status:', updatedMantleTransfer.status);
    
    // Test 6: Update main transaction with Mantle details
    console.log('\n6. Updating main transaction with Mantle details...');
    const updatedTransaction = await db.updateTransactionWithMantleDetails(
      transaction.id,
      'COMPLETED',
      {
        mantleTxHash: uniqueTxHash, // Use the same unique hash
        gasCostUsd: 3.75,
        networkFeeUsd: 1.50,
      }
    );
    
    console.log('✓ Transaction updated successfully');
    console.log('✓ Status:', updatedTransaction.status);
    console.log('✓ Mantle TX hash:', updatedTransaction.mantleTxHash);
    console.log('✓ Updated gas cost:', updatedTransaction.gasCostUsd);
    
    console.log('\n✅ All Mantle database tests passed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  } finally {
    await db.close();
  }
}

// Run the test
if (require.main === module) {
  testMantleDatabase()
    .then(() => {
      console.log('\n🎉 Mantle database schema test completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Mantle database schema test failed:', error);
      process.exit(1);
    });
}

export { testMantleDatabase };