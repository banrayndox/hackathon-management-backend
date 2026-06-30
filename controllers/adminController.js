import User from '../models/User.js';
import Team from '../models/Team.js';
import Invitation from '../models/Invitation.js';
// ---------- User Management ----------
export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select('-__v');
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateUserRole = async (req, res) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;
    if (!['admin', 'judge', 'participant'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }
    const user = await User.findByIdAndUpdate(
      userId,
      { role },
      { new: true }
    ).select('-__v');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;

    // 1. Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // 2. Handle judge assignments: unassign from any teams where this user is the judge
    if (user.role === 'judge') {
      await Team.updateMany(
        { assignedJudge: userId },
        { $set: { assignedJudge: null } }
      );
    }

    // 3. Handle teams where the user is the leader
    const leaderTeams = await Team.find({ leader: userId });
    for (const team of leaderTeams) {
      // Remove leader from members list
      team.members = team.members.filter(
        (memberId) => memberId.toString() !== userId.toString()
      );

      if (team.members.length === 0) {
        // No members left → delete the team
        await team.deleteOne();
      } else {
        // Transfer leadership to the first remaining member
        const newLeaderId = team.members[0];
        team.leader = newLeaderId;
        await team.save();

        // Update isLeader flags
        await User.updateOne(
          { _id: newLeaderId },
          { $set: { isLeader: true } }
        );
        // (The deleted user's isLeader is irrelevant; we'll remove the user)
      }
    }

    // 4. Handle teams where the user is a non‑leader member
    const memberTeams = await Team.find({ members: userId });
    for (const team of memberTeams) {
      // Remove user from members list
      team.members = team.members.filter(
        (memberId) => memberId.toString() !== userId.toString()
      );
      // If the team becomes empty (shouldn't happen if leader handled above, but just in case)
      if (team.members.length === 0) {
        await team.deleteOne();
      } else {
        await team.save();
      }
    }

    // 5. Delete all invitations involving this user (sent or received)
    await Invitation.deleteMany({
      $or: [{ sender: userId }, { invitee: userId }]
    });

    // 6. Finally delete the user document
    await User.findByIdAndDelete(userId);

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ message: error.message });
  }
};

// ---------- Team Management ----------
export const getAllTeams = async (req, res) => {
  try {
    const teams = await Team.find()
      .populate('assignedJudge', 'name email')
      .populate('members', 'name email');
    res.json(teams);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteTeam = async (req, res) => {
  try {
    const { teamId } = req.params;
    const team = await Team.findByIdAndDelete(teamId);
    if (!team) return res.status(404).json({ message: 'Team not found' });
    res.json({ message: 'Team deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const assignJudge = async (req, res) => {
  try {
    const { teamId } = req.params;
    const { judgeId } = req.body;
    const judge = await User.findOne({ _id: judgeId, role: 'judge' });
    if (!judge) {
      return res.status(400).json({ message: 'Invalid judge ID or not a judge' });
    }
    const team = await Team.findByIdAndUpdate(
      teamId,
      { assignedJudge: judgeId },
      { new: true }
    ).populate('assignedJudge', 'name email');
    if (!team) return res.status(404).json({ message: 'Team not found' });
    res.json(team);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const updateTeamPayment = async (req, res) => {
  try {
    const { teamId } = req.params;
    const { paid, transactionId, paymentMethod } = req.body;
    const team = await Team.findByIdAndUpdate(
      teamId,
      { paid, transactionId, paymentMethod },
      { new: true }
    );
    if (!team) return res.status(404).json({ message: 'Team not found' });
    res.json(team);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// ---------- Update Team Scores (Admin) ----------
export const updateTeamScores = async (req, res) => {
  try {
    const { teamId } = req.params;
    const { innovation, complexity, design, presentation, functionality, feedback } =
      req.body;

    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    // Update only provided fields
    if (innovation !== undefined) team.criteria.innovation = innovation;
    if (complexity !== undefined) team.criteria.complexity = complexity;
    if (design !== undefined) team.criteria.design = design;
    if (presentation !== undefined) team.criteria.presentation = presentation;
    if (functionality !== undefined) team.criteria.functionality = functionality;
    if (feedback !== undefined) team.feedback = feedback;

    await team.save();
    res.json(team);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};



export const updateJudgeProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const { expertise, industry } = req.body;

    const updatedJudge = await User.findByIdAndUpdate(
      id,
      { $set: { expertise, industry } },
      { new: true, runValidators: true }
    );

    if (!updatedJudge) return res.status(404).json({ message: "Judge not found" });
    res.status(200).json(updatedJudge);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// ২. জাজের অ্যাসাইন করা টিমগুলোর লিস্ট নিয়ে আসার ফাংশন
export const getJudgeAssignedTeams = async (req, res) => {
  try {
    const { id } = req.params;
    // ফিল্ড নাম ঠিক করুন: 'assignedJudge' ব্যবহার করুন, 'judge' নয়
    const teams = await Team.find({ assignedJudge: id }).select('name projectTitle');
    res.status(200).json(teams);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};