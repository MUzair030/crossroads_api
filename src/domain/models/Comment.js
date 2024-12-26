import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
    content: { type: String, required: true },
    media: [{ type: String }],
    thread: { type: mongoose.Schema.Types.ObjectId, ref: 'Thread' },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    timestamp: { type: Date, default: Date.now },
});

const Comment = mongoose.model('Comment', messageSchema);

export default Comment;
