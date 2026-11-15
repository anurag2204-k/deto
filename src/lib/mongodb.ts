import { MongoClient, Db, GridFSBucket } from 'mongodb';

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || 'deto';

if (!uri) {
  throw new Error('Please define the MONGODB_URI environment variable in .env.local');
}

declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined;
  var _mongoIndexesCreated: boolean | undefined;
}

function formatMongoError(error: unknown): Error {
  if (
    error instanceof Error &&
    (error.message.includes('alert number 80') ||
      error.message.includes('SSL alert') ||
      error.message.includes('tlsv1 alert internal error'))
  ) {
    return new Error(
      'MongoDB Atlas connection rejected: Your current IP address is not whitelisted in MongoDB Atlas Network Access. Please add your current IP (or 0.0.0.0/0) in MongoDB Atlas under Network Access.'
    );
  }
  return error instanceof Error ? error : new Error(String(error));
}

async function getConnectedClient(): Promise<MongoClient> {
  if (global._mongoClientPromise) {
    try {
      return await global._mongoClientPromise;
    } catch {
      global._mongoClientPromise = undefined;
    }
  }

  const client = new MongoClient(uri!);
  const promise = client.connect().catch((err) => {
    global._mongoClientPromise = undefined;
    throw err;
  });

  global._mongoClientPromise = promise;
  return promise;
}

async function ensureIndexes(db: Db): Promise<void> {
  if (global._mongoIndexesCreated) return;

  const topics = db.collection('topics');
  await Promise.all([
    topics.createIndex({ queuePos: 1 }),
    topics.createIndex({ 'revision.nextDueAt': 1 }),
  ]);

  global._mongoIndexesCreated = true;
}

export async function getDb(): Promise<Db> {
  try {
    const client = await getConnectedClient();
    const db = client.db(dbName);
    await ensureIndexes(db);
    return db;
  } catch (error) {
    throw formatMongoError(error);
  }
}

export async function getBucket(): Promise<GridFSBucket> {
  const db = await getDb();
  return new GridFSBucket(db, { bucketName: 'files' });
}
