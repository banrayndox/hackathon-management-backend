import Team from '../models/Team.js';
import User from '../models/User.js';
import Invitation from '../models/Invitation.js';

// Helper: Check if a user is already in any team
const isUserInTeam = async (userId) => {
  const team = await Team.findOne({ members: userId });
  return !!team;
};

// Helper: Get user's current team
const getUserTeam = async (userId) => {
  return await Team.findOne({ members: userId });
};

// ---------- Get my teams (participant's own teams) ----------
export const getMyTeams = async (req, res) => {
  try {
    const teams = await Team.find({ members: req.user._id })
      .populate('leader', 'name email')
      .populate('assignedJudge', 'name email profilePicture')
      .populate('members', 'name email profilePicture')
    res.json(teams);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ---------- Create a team (only if not in any team) ----------
export const createTeam = async (req, res) => {
  try {
    const { name, initialMembers = [] } = req.body;

    // Check if user is already in a team
    if (await isUserInTeam(req.user._id)) {
      return res.status(400).json({ message: 'You are already in a team' });
    }

    // Check if team name is unique
    const existingTeam = await Team.findOne({ name });
    if (existingTeam) {
      return res.status(400).json({ message: 'Team name already taken' });
    }

    // Generate unique code
    let code;
    let codeExists = true;
    while (codeExists) {
      code = 'TEAM-' + Math.random().toString(36).substring(2, 8).toUpperCase();
      const existing = await Team.findOne({ code });
      if (!existing) codeExists = false;
    }

    // Prepare members: leader + optional initial members
    const memberIds = [req.user._id];
    for (const memberId of initialMembers) {
      // Ensure member exists and is not already in a team
      const user = await User.findById(memberId);
      if (!user) {
        return res.status(400).json({ message: `User ${memberId} not found` });
      }
      if (await isUserInTeam(memberId)) {
        return res.status(400).json({ message: `User ${user.email} is already in a team` });
      }
      memberIds.push(memberId);
    }

    const team = new Team({
      name,
      code,
      leader: req.user._id,
      members: memberIds,
    });

    await team.save();

    await User.updateOne(
      { _id: req.user._id },
      { $set: { isLeader: true } }
    );
    if (initialMembers.length > 0) {
      await User.updateMany(
        { _id: { $in: initialMembers } },
        { $set: { isLeader: false } }
      );
    }

    // Populate and return
    const populatedTeam = await Team.findById(team._id)
      .populate('leader', 'name email')
      .populate('members', 'name email');

    res.status(201).json(populatedTeam);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// ---------- Join a team by invite code ----------
export const joinTeamByCode = async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) {
      return res.status(400).json({ message: 'Invitation code is required' });
    }

    // Check if user is already in a team
    if (await isUserInTeam(req.user._id)) {
      return res.status(400).json({ message: 'You are already in a team' });
    }

    const team = await Team.findOne({ code });
    if (!team) {
      return res.status(404).json({ message: 'Team not found with this invitation code' });
    }

    // Add user to members
    team.members.push(req.user._id);
    await team.save();

    const populatedTeam = await Team.findById(team._id)
      .populate('leader', 'name email')
      .populate('members', 'name email');

    res.json(populatedTeam);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// ---------- Join a team (by team ID) ----------
// ---------- Join a team (by team code) ----------
export const joinTeam = async (req, res) => {
  try {
    // teamId এর বদলে code নেওয়া হলো
    const { code } = req.params; 

    // Check if user is already in a team
    if (await isUserInTeam(req.user._id)) {
      return res.status(400).json({ message: 'You are already in a team' });
    }

    // findById এর বদলে findOne দিয়ে code ম্যাচ করা হলো
    const team = await Team.findOne({ code: code }); 
    if (!team) {
      return res.status(404).json({ message: 'Invalid team code or team not found' });
    }

    // Check if user is already a member of this team (Optional but safe)
    if (team.members.includes(req.user._id)) {
      return res.status(400).json({ message: 'You are already a member of this team' });
    }

    // Add user to members
    team.members.push(req.user._id);
    await team.save();

    const populatedTeam = await Team.findById(team._id)
      .populate('leader', 'name email')
      .populate('members', 'name email');

    res.json(populatedTeam);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// ---------- Add member to team (only leader) ----------
export const addTeamMember = async (req, res) => {
  try {
    const { teamId } = req.params;
    const { memberId } = req.body;

    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    // Only leader can add members
    if (team.leader.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only the team leader can add members' });
    }

    // Check if member exists and not already in a team
    const user = await User.findById(memberId);
    if (!user) {
      return res.status(400).json({ message: 'User not found' });
    }
    if (await isUserInTeam(memberId)) {
      return res.status(400).json({ message: 'User is already in a team' });
    }

    // Add member
    team.members.push(memberId);
    await team.save();

    const populatedTeam = await Team.findById(team._id)
      .populate('leader', 'name email')
      .populate('members', 'name email');

    res.json(populatedTeam);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// ---------- Remove member from team (only leader) ----------
export const removeTeamMember = async (req, res) => {
  try {
    const { teamId } = req.params;
    const { memberId } = req.body;

    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    // Only leader can remove members
    if (team.leader.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only the team leader can remove members' });
    }

    // Cannot remove the leader (they should leave via leaveTeam or delete)
    if (memberId === team.leader.toString()) {
      return res.status(400).json({ message: 'Leader cannot be removed. Use delete team or transfer leadership.' });
    }

    // Check if member is in the team
    if (!team.members.includes(memberId)) {
      return res.status(400).json({ message: 'User is not a member of this team' });
    }

    // Remove member
    team.members = team.members.filter(id => id.toString() !== memberId);
    await team.save();

    const populatedTeam = await Team.findById(team._id)
      .populate('leader', 'name email')
      .populate('members', 'name email');

    res.json(populatedTeam);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// ---------- Delete team (only leader) ----------
export const deleteTeam = async (req, res) => {
  try {
    const { teamId } = req.params;

    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    // Only leader can delete
    if (team.leader.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only the team leader can delete the team' });
    }

    await team.deleteOne();
    res.json({ message: 'Team deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ---------- Leave team (any member) ----------
export const leaveTeam = async (req, res) => {
  try {
    const { teamId } = req.params;

    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    if (!team.members.includes(req.user._id)) {
      return res.status(400).json({ message: 'You are not a member of this team' });
    }

    // If user is the leader
    if (team.leader.toString() === req.user._id.toString()) {
      // Remove leader from members
      team.members = team.members.filter(id => id.toString() !== req.user._id.toString());

      // Case 1: No members left → delete team, set old leader's isLeader false
      if (team.members.length === 0) {
        await team.deleteOne();
        await User.updateOne(
          { _id: req.user._id },
          { $set: { isLeader: false } }
        );
        return res.json({ message: 'Team deleted as you were the only member' });
      }

      // Case 2: Transfer leadership to first remaining member
      const newLeaderId = team.members[0];
      team.leader = newLeaderId;
      await team.save();

      // Update isLeader flags
      await User.updateOne(
        { _id: req.user._id },
        { $set: { isLeader: false } }
      );
      await User.updateOne(
        { _id: newLeaderId },
        { $set: { isLeader: true } }
      );

      const populated = await Team.findById(team._id)
        .populate('leader', 'name email')
        .populate('members', 'name email');

      return res.json({
        message: 'You left the team. Leadership transferred to another member.',
        team: populated
      });
    }

    // Non-leader leaves
    team.members = team.members.filter(id => id.toString() !== req.user._id.toString());
    await team.save();

    // Ensure the leaving member's isLeader is false (should already be)
    await User.updateOne(
      { _id: req.user._id },
      { $set: { isLeader: false } }
    );

    const populated = await Team.findById(team._id)
      .populate('leader', 'name email')
      .populate('members', 'name email');

    return res.json({ message: 'You left the team successfully', team: populated });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// ---------- Team payment (only leader) ----------
export const updateTeamPayment = async (req, res) => {
  try {
    const { teamId } = req.params;
    const { paid, transactionId, paymentMethod } = req.body;

    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    // Only leader can update payment
    if (team.leader.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only the team leader can manage payment' });
    }

    if (paid !== undefined) team.paid = paid;
    if (transactionId !== undefined) team.transactionId = transactionId;
    if (paymentMethod !== undefined) team.paymentMethod = paymentMethod;

    await team.save();

    const populated = await Team.findById(team._id)
      .populate('leader', 'name email')
      .populate('members', 'name email');

    res.json(populated);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// ---------- Get Available Users (Participants not in any team) ----------
export const getAvailableUsers = async (req, res) => {
  try {
    const teams = await Team.find({}, 'members');
    const memberIds = teams.reduce((acc, team) => acc.concat(team.members), []);

    const availableUsers = await User.find({
      role: 'participant',
      _id: { $nin: [...memberIds, req.user._id] }
    }).select('name email');

    res.json(availableUsers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ---------- Send Team Invitation (Only leader) ----------
export const sendInvitation = async (req, res) => {
  try {
    const { inviteeId } = req.body;
    if (!inviteeId) {
      return res.status(400).json({ message: 'Invitee ID is required' });
    }

    const team = await Team.findOne({ leader: req.user._id });
    if (!team) {
      return res.status(400).json({ message: 'Only team leaders can send invitations' });
    }

    const invitee = await User.findById(inviteeId);
    if (!invitee || invitee.role !== 'participant') {
      return res.status(404).json({ message: 'Invitee not found or is not a participant' });
    }

    if (await isUserInTeam(inviteeId)) {
      return res.status(400).json({ message: 'User is already in a team' });
    }

    const existingInvite = await Invitation.findOne({
      team: team._id,
      invitee: inviteeId,
      status: 'pending'
    });
    if (existingInvite) {
      return res.status(400).json({ message: 'Invitation is already pending' });
    }

    const invitation = new Invitation({
      team: team._id,
      sender: req.user._id,
      invitee: inviteeId
    });

    await invitation.save();
    res.status(201).json(invitation);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// ---------- Get invitations received by current user ----------
export const getInvitations = async (req, res) => {
  try {
    const invitations = await Invitation.find({
      invitee: req.user._id,
      status: 'pending'
    })
    .populate('team', 'name code')
    .populate('sender', 'name email');
    res.json(invitations);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ---------- Accept invitation ----------
export const acceptInvitation = async (req, res) => {
  try {
    const { invitationId } = req.params;
    const invitation = await Invitation.findById(invitationId);
    if (!invitation || invitation.invitee.toString() !== req.user._id.toString()) {
      return res.status(404).json({ message: 'Invitation not found' });
    }

    if (invitation.status !== 'pending') {
      return res.status(400).json({ message: 'Invitation is no longer pending' });
    }

    if (await isUserInTeam(req.user._id)) {
      await Invitation.updateMany({ invitee: req.user._id, status: 'pending' }, { status: 'rejected' });
      return res.status(400).json({ message: 'You are already in a team' });
    }

    const team = await Team.findById(invitation.team);
    if (!team) {
      invitation.status = 'rejected';
      await invitation.save();
      return res.status(404).json({ message: 'Team no longer exists' });
    }

    // Add user to team
    team.members.push(req.user._id);
    await team.save();

    // Mark invitation accepted
    invitation.status = 'accepted';
    await invitation.save();

    // Reject other invitations
    await Invitation.updateMany(
      { invitee: req.user._id, status: 'pending', _id: { $ne: invitationId } },
      { status: 'rejected' }
    );

    res.json({ message: 'Invitation accepted successfully', team });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// ---------- Reject invitation ----------
export const rejectInvitation = async (req, res) => {
  try {
    const { invitationId } = req.params;
    const invitation = await Invitation.findById(invitationId);
    if (!invitation || invitation.invitee.toString() !== req.user._id.toString()) {
      return res.status(404).json({ message: 'Invitation not found' });
    }

    invitation.status = 'rejected';
    await invitation.save();
    res.json({ message: 'Invitation rejected successfully' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// ---------- Submit Project (Only leader) ----------
export const submitProject = async (req, res) => {
  try {
    const { teamId } = req.params;
    const { projectName, projectDescription, techStack, githubLink, driveLink, demoLink } = req.body;

    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    if (team.leader.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only the team leader can submit the project' });
    }

    team.projectName = projectName || '';
    team.projectDescription = projectDescription || '';
    
    if (techStack !== undefined) {
      team.techStack = Array.isArray(techStack) 
        ? techStack 
        : typeof techStack === 'string' 
          ? techStack.split(',').map(s => s.trim()).filter(Boolean)
          : [];
    }
    
    team.githubLink = githubLink || '';
    team.driveLink = driveLink || '';
    team.demoLink = demoLink || '';
    team.submitted = true;

    await team.save();
    res.json(team);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};