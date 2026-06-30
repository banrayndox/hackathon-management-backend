import express from 'express';
import { authenticate } from '../middlewares/auth.js';
import { roleCheck } from '../middlewares/roleCheck.js';
import * as participantController from '../controllers/participantController.js';

const router = express.Router();

router.use(authenticate);
router.use(roleCheck('participant'));

// Get my teams
router.get('/my-teams', participantController.getMyTeams);

// Create team
router.post('/teams', participantController.createTeam);

// Join a team (by team ID)
router.post('/teams/:teamId/join', participantController.joinTeam);

// Join a team (by invite code)
router.post('/teams/join-by-code', participantController.joinTeamByCode);

// Add member (only leader)
router.post('/teams/:teamId/members', participantController.addTeamMember);

// Remove member (only leader)
router.delete('/teams/:teamId/members', participantController.removeTeamMember);

// Leave team (any member)
router.post('/teams/:teamId/leave', participantController.leaveTeam);

// Delete team (only leader)
router.delete('/teams/:teamId', participantController.deleteTeam);

// Update payment (only leader)
router.put('/teams/:teamId/payment', participantController.updateTeamPayment);

// Available users not in any team
router.get('/available-users', participantController.getAvailableUsers);

// Get received invitations
router.get('/invitations', participantController.getInvitations);

// Send team invitation
router.post('/teams/invite', participantController.sendInvitation);

// Accept invitation
router.post('/invitations/:invitationId/accept', participantController.acceptInvitation);

// Reject invitation
router.post('/invitations/:invitationId/reject', participantController.rejectInvitation);

// Submit project details
router.put('/teams/:teamId/submit', participantController.submitProject);

export default router;