import { PrismaClient } from '@prisma/client';
import BaseAgent from './BaseAgent.js';

const prisma = new PrismaClient();

class TeamCreationAgent extends BaseAgent {
  constructor() {
    super('TeamCreationAgent', 'Creates new teams and projects with metadata');
  }

  async processRequest(message, context) {
    const { userId } = context;
    const entities = this.extractEntities(message);
    
    try {
      if (entities.action === 'create' && entities.teamName) {
        return await this.createTeam(entities.teamName, message, userId);
      }
      
      return {
        success: false,
        message: "I couldn't understand your team creation request. Try: 'Create a new team called Alpha for the Hackathon.'"
      };
    } catch (error) {
      console.error('TeamCreationAgent error:', error);
      return {
        success: false,
        message: "Sorry, I encountered an error while creating the team."
      };
    }
  }

  async createTeam(teamName, originalMessage, userId) {
    try {
      // Extract description from message
      const descriptionMatch = originalMessage.match(/for\s+(.+)$/i);
      const description = descriptionMatch ? descriptionMatch[1] : `Team ${teamName}`;

      const team = await prisma.team.create({
        data: {
          name: teamName,
          description: description,
          isPublic: true,
          ownerId: userId,
          members: {
            create: {
              userId: userId,
              role: 'OWNER'
            }
          }
        },
        include: {
          members: {
            include: {
              user: true
            }
          }
        }
      });

      await this.log('create_team', { teamId: team.id, teamName, description }, userId);

      return {
        success: true,
        message: `✅ Team "${teamName}" has been created successfully! You are the owner of this team.`,
        data: team
      };
    } catch (error) {
      console.error('Error creating team:', error);
      return {
        success: false,
        message: "Failed to create team. Please try again."
      };
    }
  }
}

export default TeamCreationAgent;
