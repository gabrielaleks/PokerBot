import { MongoClient } from 'mongodb';

let client: MongoClient

const dbName = 'docs';

export async function getDatabaseConnectionToCollection(collection: string) {
  connectToDatabase()
  return client.db(dbName).collection(collection);
}

async function connectToDatabase() {
  if (!client) {
    client = new MongoClient(process.env.MONGODB_ATLAS_URI || '', {
      driverInfo: { name: "langchainjs" },
    });

    try {
      await client.connect();
      console.log('Connected to the database');
    } catch (error) {
      console.error('Error connecting to the database:', error);
      throw error;
    }
  }
  return client.db();
}