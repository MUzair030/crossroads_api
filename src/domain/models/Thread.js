import mongoose from 'mongoose';

const threadSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String, required: true },
    media: [{ type: String }],
    creator: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    timestamp: { type: Date, default: Date.now },
    // comments: [{
    //     type: mongoose.Schema.Types.ObjectId,
    //     ref: 'Comment',
    // }],
});

const Thread = mongoose.model('Thread', threadSchema);

export default Thread;
