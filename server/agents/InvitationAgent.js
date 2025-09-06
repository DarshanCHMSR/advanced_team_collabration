import { PrismaClient } from '@prisma/client';
import BaseAgent from './BaseAgent.js';

const prisma = new PrismaClient();

class InvitationAgent extends BaseAgent {
  constructor() {
    super('InvitationAgent', 'Handles team invitations and member onboarding');
  }

  async processRequest(message, context) {
    const { userId } = context;
    const entities = this.extractEntities(message);

    try {
      if (entities.action === 'invite') {
        return await this.sendInvitations(message, userId);
      }

      if (message.toLowerCase().includes('accept')) {
        return await this.acceptInvitation(message, userId);
      }

      if (message.toLowerCase().includes('reject')) {
        return await this.rejectInvitation(message, userId);
      }

      return {
        success: false,
        message: "I couldn't understand your invitation request. Try: 'Invite Priya and John to Team Alpha.'"
      };
    } catch (error) {
      console.error('InvitationAgent error:', error);
      return {
        success: false,
        message: "Sorry, I encountered an error while processing the invitation."
      };
    }
  }

  async sendInvitations(message, userId) {
    try {
      // Extract usernames and team name
      const teamMatch = message.match(/to\s+team\s+(\w+)/i);
      const usersMatch = message.match(/invite\s+([^to]+)/i);

      if (!teamMatch || !usersMatch) {
        return {
          success: false,
          message: "Please specify users and team. Try: 'Invite Priya and John to Team Alpha.'"
        };
      }

      const teamName = teamMatch[1];
      const userNames = usersMatch[1].split(/\s+and\s+|\s*,\s*/).map(name => name.trim());

      // Find team
      const team = await prisma.team.findFirst({
        where: { name: teamName },
        include: { members: true }
      });

      if (!team) {
        return {
          success: false,
          message: `Team "${teamName}" not found.`
        };
      }

      // Check permissions
      const currentUserMember = team.members.find(m => m.userId === userId);
      if (!currentUserMember || !['OWNER', 'ADMIN'].includes(currentUserMember.role)) {
        return {
          success: false,
          message: "You don't have permission to invite users to this team."
        };
      }

      const inviteResults = [];
      for (const userName of userNames) {
        const user = await prisma.user.findFirst({
          where: { username: userName }
        });

        if (!user) {
          inviteResults.push(`❌ User "${userName}" not found`);
          continue;
        }

        // Check if already a member
        const existingMember = team.members.find(m => m.userId === user.id);
        if (existingMember) {
          inviteResults.push(`⚠️ "${userName}" is already a team member`);
          continue;
        }

        // Create invitation
        const invite = await prisma.teamInvite.create({
          data: {
            teamId: team.id,
            senderId: userId,
            receiverId: user.id,
            status: 'PENDING'
          }
        });

        inviteResults.push(`✅ Invitation sent to "${userName}"`);
        await this.log('send_invitation', { inviteId: invite.id, teamId: team.id, receiverId: user.id }, userId);
      }

      return {
        success: true,
        message: `Invitation results for Team ${teamName}:\n${inviteResults.join('\n')}`
      };
    } catch (error) {
      console.error('Error sending invitations:', error);
      return {
        success: false,
        message: "Failed to send invitations. Please try again."
      };
    }
  }

  async acceptInvitation(message, userId) {
    try {
      const teamMatch = message.match(/accept.*team\s+(\w+)/i);
      if (!teamMatch) {
        return {
          success: false,
          message: "Please specify the team. Try: 'Accept invitation to Team Alpha.'"
        };
      }

      const teamName = teamMatch[1];
      const team = await prisma.team.findFirst({
        where: { name: teamName }
      });

      if (!team) {
        return {
          success: false,
          message: `Team "${teamName}" not found.`
        };
      }

      const invite = await prisma.teamInvite.findFirst({
        where: {
          teamId: team.id,
          receiverId: userId,
          status: 'PENDING'
        }
      });

      if (!invite) {
        return {
          success: false,
          message: `No pending invitation found for Team ${teamName}.`
        };
      }

      // Accept invitation
      await prisma.$transaction([
        prisma.teamInvite.update({
          where: { id: invite.id },
          data: { status: 'ACCEPTED' }
        }),
        prisma.teamMember.create({
          data: {
            teamId: team.id,
            userId: userId,
            role: 'MEMBER'
          }
        })
      ]);

      await this.log('accept_invitation', { inviteId: invite.id, teamId: team.id }, userId);

      return {
        success: true,
        message: `✅ You have successfully joined Team ${teamName}! Welcome aboard! 🎉`
      };
    } catch (error) {
      console.error('Error accepting invitation:', error);
      return {
        success: false,
        message: "Failed to accept invitation. Please try again."
      };
    }
  }

  async rejectInvitation(message, userId) {
    try {
      const teamMatch = message.match(/reject.*team\s+(\w+)/i);
      if (!teamMatch) {
        return {
          success: false,
          message: "Please specify the team. Try: 'Reject invitation to Team Alpha.'"
        };
      }

      const teamName = teamMatch[1];
      const team = await prisma.team.findFirst({
        where: { name: teamName }
      });

      if (!team) {
        return {
          success: false,
          message: `Team "${teamName}" not found.`
        };
      }

      const invite = await prisma.teamInvite.findFirst({
        where: {
          teamId: team.id,
          receiverId: userId,
          status: 'PENDING'
        }
      });

      if (!invite) {
        return {
          success: false,
          message: `No pending invitation found for Team ${teamName}.`
        };
      }

      await prisma.teamInvite.update({
        where: { id: invite.id },
        data: { status: 'REJECTED' }
      });

      await this.log('reject_invitation', { inviteId: invite.id, teamId: team.id }, userId);

      return {
        success: true,
        message: `You have rejected the invitation to Team ${teamName}.`
      };
    } catch (error) {
      console.error('Error rejecting invitation:', error);
      return {
        success: false,
        message: "Failed to reject invitation. Please try again."
      };
    }
  }
}

export default InvitationAgent;
