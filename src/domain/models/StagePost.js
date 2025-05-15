import mongoose from "mongoose";

const stagePostSchema = new mongoose.Schema({
  text: { type: String },
  mediaUrls: { type: [String], default: [] },
  timestamp: { type: Date, default: Date.now },
  creatorId: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
}, { _id: false }); // Use _id: true if individual posts need identification

export default stagePostSchema;
