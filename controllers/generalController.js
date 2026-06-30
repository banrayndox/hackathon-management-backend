import Team from '../models/Team.js';
import User from '../models/User.js';

// Get all teams (for general directory & leaderboard)
export const getAllTeams = async (req, res) => {
  try {
    const teams = await Team.find()
      .populate('leader', 'name email')
      .populate('members', 'name email')
      .populate('assignedJudge', 'name email');
    res.json(teams);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get a team by ID (for team profile)
export const getTeamById = async (req, res) => {
  try {
    const team = await Team.findById(req.params.teamId)
      .populate('leader', 'name email department phone bio profilePicture')
      .populate('members', 'name email department phone bio profilePicture')
      .populate('assignedJudge', 'name email department phone bio expertise industry designation profilePicture');
    
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }
    res.json(team);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get all judges (for judges directory)
export const getAllJudges = async (req, res) => {
  try {
    const judges = await User.find({ role: 'judge' }).select('-__v');
    
    // Count teams assigned to each judge
    const judgesWithCount = await Promise.all(
      judges.map(async (judge) => {
        const count = await Team.countDocuments({ assignedJudge: judge._id });
        return {
          ...judge.toObject(),
          assignedTeamsCount: count,
        };
      })
    );
    res.json(judgesWithCount);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
