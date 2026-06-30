import mongoose from 'mongoose';

const TeamSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
    },
    code: {
      type: String,
      unique: true,
      sparse: true,
    },
    leader: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    members: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    paid: {
      type: Boolean,
      default: false,
    },
    transactionId: {
      type: String,
      default: '',
    },
    paymentMethod: {
      type: String,
      default: '',
    },
    assignedJudge: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    criteria: {
      innovation: { type: Number, default: 0, min: 0, max: 100 },
      complexity: { type: Number, default: 0, min: 0, max: 100 },
      design: { type: Number, default: 0, min: 0, max: 100 },
      presentation: { type: Number, default: 0, min: 0, max: 100 },
      functionality: { type: Number, default: 0, min: 0, max: 100 },
    },
    feedback: {
      type: String,
      default: '',
    },
    projectName: {
      type: String,
      default: '',
    },
    projectDescription: {
      type: String,
      default: '',
    },
    techStack: [
      {
        type: String,
      },
    ],
    githubLink: {
      type: String,
      default: '',
    },
    driveLink: {
      type: String,
      default: '',
    },
    demoLink: {
      type: String,
      default: '',
    },
    submitted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

export default mongoose.model('Team', TeamSchema);