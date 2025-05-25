// smart-home-backend/mongo-init-db/init-mongo.js
print("MONGO_INIT_SCRIPT: --- Starting init-mongo.js ---");

db = db.getSiblingDB('admin');
print("MONGO_INIT_SCRIPT: Switched to 'admin' database.");

const existingUser = db.getUser('admin');
if (existingUser) {
  print("MONGO_INIT_SCRIPT: User 'admin' already exists. Skipping creation.");
} else {
  try {
    db.createUser({
      user: 'admin',
      pwd: 'password', // Pastikan ini password yang akan kamu gunakan
      roles: [{ role: 'root', db: 'admin' }],
    });
    print("MONGO_INIT_SCRIPT: User 'admin' created successfully.");
  } catch (e) {
    print("MONGO_INIT_SCRIPT: Error creating user 'admin':");
    printjson(e); // Cetak detail error jika ada
  }
}

// Untuk memastikan skrip berjalan sampai akhir dan bisa melakukan operasi tulis
try {
  db.getSiblingDB('test_init').my_collection.insertOne({ script_ran_at: new Date() });
  print("MONGO_INIT_SCRIPT: Successfully wrote a test document to 'test_init' database.");
} catch (e) {
  print("MONGO_INIT_SCRIPT: Error writing test document:");
  printjson(e);
}

print("MONGO_INIT_SCRIPT: --- Finished init-mongo.js ---");