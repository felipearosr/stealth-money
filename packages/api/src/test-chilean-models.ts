import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testChileanModels() {
  console.log('Testing Chilean data models...');

  try {
    // Test creating a Chilean user
    const chileanUser = await prisma.user.create({
      data: {
        id: 'test-chilean-user-' + Date.now(),
        email: 'test@example.cl',
        username: 'testuser_cl',
        firstName: 'Juan',
        lastName: 'Pérez',
        country: 'CL',
        rut: '12345678-9',
        preferredCurrency: 'CLP',
        isVerified: true,
        onboardingCompleted: true,
      },
    });
    console.log('✅ Created Chilean user:', chileanUser.id);

    // Test creating a Chilean bank account
    const chileanBankAccount = await prisma.bankAccount.create({
      data: {
        userId: chileanUser.id,
        accountName: 'Cuenta Corriente Principal',
        currency: 'CLP',
        country: 'CL',
        bankName: 'Banco de Chile',
        bankCode: '001',
        rut: '12345678-9',
        chileanAccountNumber: '123456789',
        accountHolderName: 'Juan Pérez',
        accountType: 'checking',
        isVerified: true,
        isPrimary: true,
        verificationMethod: 'micro_deposits',
      },
    });
    console.log('✅ Created Chilean bank account:', chileanBankAccount.id);

    // Test creating a Chilean transfer
    const recipient = await prisma.user.create({
      data: {
        id: 'test-recipient-' + Date.now(),
        email: 'recipient@example.cl',
        username: 'recipient_cl',
        firstName: 'María',
        lastName: 'González',
        country: 'CL',
        rut: '98765432-1',
        preferredCurrency: 'CLP',
        isVerified: true,
      },
    });

    const chileanTransfer = await prisma.transaction.create({
      data: {
        userId: chileanUser.id,
        recipientUserId: recipient.id,
        amount: 50000, // 50,000 CLP
        sourceCurrency: 'CLP',
        destCurrency: 'CLP',
        exchangeRate: 1.0,
        recipientAmount: 49500, // After fees
        fees: 500,
        status: 'PENDING',
        description: 'Transferencia a María',
        paymentMethodId: chileanBankAccount.id,
        senderBankAccount: chileanBankAccount.id,
        statusHistory: JSON.stringify([
          {
            status: 'PENDING',
            timestamp: new Date().toISOString(),
            message: 'Transfer initiated',
          },
        ]),
      },
    });
    console.log('✅ Created Chilean transfer:', chileanTransfer.id);

    // Test querying Chilean users
    const chileanUsers = await prisma.user.findMany({
      where: {
        country: 'CL',
      },
      include: {
        bankAccounts: true,
      },
    });
    console.log('✅ Found Chilean users:', chileanUsers.length);

    // Test querying by RUT
    const userByRut = await prisma.user.findUnique({
      where: {
        rut: '12345678-9',
      },
    });
    console.log('✅ Found user by RUT:', userByRut?.username);

    // Test querying Chilean transfers
    const chileanTransfers = await prisma.transaction.findMany({
      where: {
        sourceCurrency: 'CLP',
        destCurrency: 'CLP',
      },
      include: {
        sender: true,
        recipient: true,
      },
    });
    console.log('✅ Found Chilean transfers:', chileanTransfers.length);

    console.log('\n🎉 All Chilean model tests passed!');

    // Cleanup test data
    await prisma.transaction.deleteMany({
      where: {
        OR: [
          { userId: chileanUser.id },
          { recipientUserId: recipient.id },
        ],
      },
    });
    await prisma.bankAccount.deleteMany({
      where: {
        userId: chileanUser.id,
      },
    });
    await prisma.user.deleteMany({
      where: {
        id: {
          in: [chileanUser.id, recipient.id],
        },
      },
    });
    console.log('✅ Cleaned up test data');

  } catch (error) {
    console.error('❌ Error testing Chilean models:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  testChileanModels().catch(console.error);
}

export { testChileanModels };