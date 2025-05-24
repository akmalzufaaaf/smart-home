// smart-home-backend/mongo-init-db/init-mongo.js
db = db.getSiblingDB('admin');

db.createUser({
  user: 'admin',
  pwd: 'password', // Pastikan ini password yang akan kamu gunakan di MONGO_URI
  roles: [{ role: 'root', db: 'admin' }],
});

// Opsional: Buat database aplikasi dan pengguna khusus jika perlu
// db = db.getSiblingDB('smart_home');
// db.createUser({
//   user: 'smarthomeuser',
//   pwd: 'smarthomepassword',
//   roles: [{ role: 'readWrite', db: 'smart_home' }],
// });