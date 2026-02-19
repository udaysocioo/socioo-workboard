require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function testLogin(email, password) {
  console.log(`Testing login for: ${email}`);
  
  try {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });

    if (!user) {
      console.log('❌ User not found');
      return;
    }

    console.log(`✅ User found: ${user.name} (${user.email})`);
    console.log(`   Is Active: ${user.isActive}`);
    console.log(`   Has Password: ${!!user.password}`);

    if (user.password) {
      const isMatch = await bcrypt.compare(password, user.password);
      console.log(`   Password Match: ${isMatch ? '✅ YES' : '❌ NO'}`);
    } else {
      console.log('❌ No password set on user record');
    }

  } catch (error) {
    console.error('❌ Error during test:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Test with the credentials we gave the user
testLogin('likithmullapudi970@gmail.com', 'socioo@123');
