const { execSync } = require('child_process');

console.log('🚀 Starting Manual Database Migration...');

try {
  // Explicitly use the connection string from .env if available, or ask user to set it
  // This command pushes the schema state to the database, ignoring migrations history if needed
  console.log('📦 Pushing schema to database...');
  execSync('npx prisma db push --accept-data-loss', { stdio: 'inherit', cwd: './backend', shell: true });
  
  console.log('✅ Database schema synced successfully!');
  
  console.log('🌱 Seeding database...');
  execSync('node seed.js', { stdio: 'inherit', cwd: './backend', shell: true });
  
  console.log('🎉 Database setup complete!');
} catch (error) {
  console.error('❌ Migration failed:', error.message);
}
