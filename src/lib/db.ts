import mongoose from "mongoose";
const globalForMongoose = global as typeof globalThis & { mongooseConn?: Promise<typeof mongoose> };
export function connectDb() {
  if (!globalForMongoose.mongooseConn) {
    if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI missing");
    globalForMongoose.mongooseConn = mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      dbName: process.env.MONGODB_DB_NAME
    }).catch((error) => {
      globalForMongoose.mongooseConn = undefined;
      throw error;
    });
  }
  return globalForMongoose.mongooseConn;
}

export function isDbConnectionError(error: unknown) {
  return error instanceof mongoose.Error.MongooseServerSelectionError || error instanceof Error && /ECONNREFUSED|ENOTFOUND|MongoServerSelectionError|MongooseServerSelectionError/.test(error.message);
}
