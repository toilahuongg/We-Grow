import { env } from "@we-grow/env/server";
import mongoose from "mongoose";

await mongoose.connect(env.DATABASE_URL).catch((error) => {
  console.log("Error connecting to database:", error);
});

// Use the native MongoDB client from Mongoose connection
// When DATABASE_URL includes the database name (e.g., mongodb://host/dbname),
// useDb() will use that database, otherwise we need to extract it
const url = new URL(env.DATABASE_URL);
const dbName = url.pathname.slice(1) || undefined;
const client = mongoose.connection.getClient().db(dbName);

const ObjectId = mongoose.Types.ObjectId;

export { client, ObjectId };
