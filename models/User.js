import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema(
  {
    googleId: {
      type: String,
      required: true,
      unique: true,
    },
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    profilePicture: {
      type: String,
      default: '',
    },
    role: {
      type: String,
      enum: ['admin', 'judge', 'participant'],
      default: 'participant',
    },
    isLeader: {
      type: Boolean,
      default: false
    },
    department: { type: String, default: '' },
    phone: { type: String, default: '' },
    bio: { type: String, default: '' },
    // Judge-specific
    expertise: { type: String, default: '' },
    industry: { type: String, default: '' },
    designation: { type: String, default: '' },
  },
  { timestamps: true }
);

export default mongoose.model('User', UserSchema);