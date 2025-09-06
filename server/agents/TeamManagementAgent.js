import { PrismaClient } from '@prisma/client';
import BaseAgent from './BaseAgent.js';

const prisma = new PrismaClient();

class TeamManagementAgent extends BaseAgent {
  constructor() {
    super('TeamManagementAgent', 'Manages team details, roles, and member permissions');
  }

  async processRequest(message, context) {
    const { userId } = context;
    const entities = this.extractEntities(message);

    try {
      if (entities.action === 'promote' && entities.userName && entities.role) {
        return await this.promoteUser(entities.userName, entities.role, entities.teamName, userId);
      }
      
      if (entities.action === 'update' && entities.teamName) {
        return await this.updateTeam(entities.teamName, message, userId);
      }

      if (entities.action === 'archive' && entities.teamName) {
        return await this.archiveTeam(entities.teamName, userId);
      }

      return {
        success: false,
        message: "I couldn't understand your team management request. Try: 'Promote Ramesh to Admin in Team Alpha.'"
      };
    } catch (error) {
      console.error('TeamManagementAgent error:', error);
      return {
        success: false,
        message: "Sorry, I encountered an error while managing the team."
      };
    }
  }

  async promoteUser(userName, role, teamName, userId) {
    try {
      // Find user by username
      const user = await prisma.user.findFirst({
        where: { username: userName }
      });

      if (!user) {
        return {
          success: false,
          message: `User "${userName}" not found.`
        };
      }

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

      // Check if user is owner or admin
      const currentUserMember = team.members.find(m => m.userId === userId);
      if (!currentUserMember || !['OWNER', 'ADMIN'].includes(currentUserMember.role)) {
        return {
          success: false,
          message: "You don't have permission to promote users in this team."
        };
      }

      // Update user role
      await prisma.teamMember.updateMany({
        where: {
          teamId: team.id,
          userId: user.id
        },
        data: {
          role: role
        }
      });

      await this.log('promote_user', { teamId: team.id, userId: user.id, newRole: role }, userId);

      return {
        success: true,
        message: `✅ ${userName} has been promoted to ${role} in Team ${teamName}.`
      };
    } catch (error) {
      console.error('Error promoting user:', error);
      return {
        success: false,
        message: "Failed to promote user. Please try again."
      };
    }
  }

  async updateTeam(teamName, message, userId) {
    try {
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
          message: "You don't have permission to update this team."
        };
      }

      // Extract new name or description
      const newNameMatch = message.match(/rename\s+to\s+(\w+)/i);
      const newDescMatch = message.match(/description\s+to\s+(.+)$/i);

      const updateData = {};
      if (newNameMatch) updateData.name = newNameMatch[1];
      if (newDescMatch) updateData.description = newDescMatch[1];

      if (Object.keys(updateData).length === 0) {
        return {
          success: false,
          message: "Please specify what you'd like to update. Try: 'Rename Team Alpha to Beta'"
        };
      }

      await prisma.team.update({
        where: { id: team.id },
        data: updateData
      });

      await this.log('update_team', { teamId: team.id, updates: updateData }, userId);

      return {
        success: true,
        message: `✅ Team has been updated successfully.`
      };
    } catch (error) {
      console.error('Error updating team:', error);
      return {
        success: false,
        message: "Failed to update team. Please try again."
      };
    }
  }

  async archiveTeam(teamName, userId) {
    try {
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

      // Only owner can archive
      if (team.ownerId !== userId) {
        return {
          success: false,
          message: "Only the team owner can archive the team."
        };
      }

      await prisma.team.update({
        where: { id: team.id },
        data: { isActive: false }
      });

      await this.log('archive_team', { teamId: team.id }, userId);

      return {
        success: true,
        message: `✅ Team "${teamName}" has been archived.`
      };
    } catch (error) {
      console.error('Error archiving team:', error);
      return {
        success: false,
        message: "Failed to archive team. Please try again."
      };
    }
  }
}

export default TeamManagementAgent;
