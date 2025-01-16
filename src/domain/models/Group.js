import mongoose from 'mongoose';

const GroupSchema = new mongoose.Schema(
    {
        name: { type: String, required: true, unique: true },
        description: { type: String, required: false },
        category: { type: String, required: true },
        coverPicture: { type: String, required: false },
        groupPicture: { type: String, required: false },
        type: { type: String, enum: ['public', 'private'], required: true },
        creator: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        members: [
            {
                user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
                role: { type: String, enum: ['admin', 'member'], default: 'member' },
            },
        ],
        inviteRequests: [
            {
                user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
                status: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' },
            },
        ],
        isDeleted: { type: Boolean, default: false },
    },
    { timestamps: true }
);

const Group = mongoose.model('Group', GroupSchema);
export default Group;
