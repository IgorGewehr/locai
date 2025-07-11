#!/usr/bin/env node

const bcrypt = require('bcryptjs');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: true
});

// Hide password input
const askPassword = (question) => {
  return new Promise((resolve) => {
    const stdin = process.stdin;
    const stdout = process.stdout;

    // Prepare readline for hidden input
    if (stdin.isTTY) {
      stdin.setRawMode(true);
    }

    stdout.write(question);

    let password = '';
    
    stdin.on('data', (char) => {
      char = char.toString();

      switch (char) {
        case '\n':
        case '\r':
        case '\u0004':
          // Enter or Ctrl+D
          if (stdin.isTTY) {
            stdin.setRawMode(false);
          }
          stdout.write('\n');
          stdin.pause();
          stdin.removeAllListeners('data');
          resolve(password);
          break;
        case '\u0003':
          // Ctrl+C
          stdout.write('\n');
          process.exit();
          break;
        case '\u007f':
        case '\b':
          // Backspace
          if (password.length > 0) {
            password = password.slice(0, -1);
            stdout.clearLine();
            stdout.cursorTo(0);
            stdout.write(question + '*'.repeat(password.length));
          }
          break;
        default:
          // Regular character
          password += char;
          stdout.write('*');
          break;
      }
    });

    stdin.resume();
  });
};

async function generatePasswordHash() {
  console.log('🔐 Password Hash Generator for Admin Account\n');
  
  try {
    const password = await askPassword('Enter password: ');
    
    if (!password || password.length < 8) {
      console.error('\n❌ Password must be at least 8 characters long');
      process.exit(1);
    }

    // Generate salt and hash
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);

    console.log('\n✅ Password hash generated successfully!\n');
    console.log('Add this to your environment variables:');
    console.log(`ADMIN_PASSWORD_HASH=${hash}\n`);
    
    // Test the hash
    const isValid = await bcrypt.compare(password, hash);
    if (isValid) {
      console.log('✓ Hash verified successfully');
    } else {
      console.error('❌ Hash verification failed');
    }

  } catch (error) {
    console.error('\n❌ Error generating hash:', error.message);
    process.exit(1);
  } finally {
    rl.close();
  }
}

// Run the generator
generatePasswordHash();