import { PrismaClient } from '@prisma/client';
import BaseAgent from './BaseAgent.js';

const prisma = new PrismaClient();

class CommunicationAgent extends BaseAgent {
  constructor() {
    super('CommunicationAgent', 'Handles team chat, message logging, and communication analytics');
  }

  async processRequest(message, context) {
    const { userId } = context;

    try {
      if (message.toLowerCase().includes('show') && message.toLowerCase().includes('messages')) {
        return await this.getMessages(message, userId);
      }

      if (message.toLowerCase().includes('log') && message.toLowerCase().includes('message')) {
        return await this.logMessage(message, userId);
      }

      if (message.toLowerCase().includes('analytics') || message.toLowerCase().includes('stats')) {
        return await this.getCommStats(message, userId);
      }

      return {
        success: false,
        message: "I couldn't understand your communication request. Try: 'Show me all messages from Team Alpha last week.'"
      };
    } catch (error) {
      console.error('CommunicationAgent error:', error);
      return {
        success: false,
        message: "Sorry, I encountered an error while processing communication data."
      };
    }
  }

  async getMessages(message, userId) {
    try {
      const teamMatch = message.match(/team\s+(\w+)/i);
      const timeMatch = message.match(/(last\s+\w+|yesterday|today)/i);

      if (!teamMatch) {
        return {
          success: false,
          message: "Please specify the team. Try: 'Show messages from Team Alpha last week.'"
        };
      }

      const teamName = teamMatch[1];
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

      // Check if user is team member
      const isMember = team.members.some(m => m.userId === userId);
      if (!isMember) {
        return {
          success: false,
          message: "You must be a team member to view messages."
        };
      }

      // Calculate date range
      let startDate = new Date();
      if (timeMatch) {
        const timeStr = timeMatch[1].toLowerCase();
        if (timeStr.includes('week')) {
          startDate.setDate(startDate.getDate() - 7);
        } else if (timeStr.includes('month')) {
          startDate.setMonth(startDate.getMonth() - 1);
        } else if (timeStr.includes('yesterday')) {
          startDate.setDate(startDate.getDate() - 1);
        }
      } else {
        startDate.setDate(startDate.getDate() - 7); // Default to last week
      }

      const messages = await prisma.message.findMany({
        where: {
          teamId: team.id,
          createdAt: {
            gte: startDate
          }
        },
        include: {
          sender: true
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: 20
      });

      if (messages.length === 0) {
        return {
          success: true,
          message: `No messages found in Team ${teamName} for the specified period.`
        };
      }

      const messageReport = [
        `💬 Recent Messages from Team ${teamName}:`,
        ``
      ];

      messages.forEach(msg => {
        const timestamp = msg.createdAt.toLocaleDateString();
        messageReport.push(`• ${msg.sender.username} (${timestamp}): ${msg.content}`);
      });

      await this.log('view_messages', { teamId: team.id, messageCount: messages.length }, userId);

      return {
        success: true,
        message: messageReport.join('\n'),
        data: { messages, team }
      };
    } catch (error) {
      console.error('Error getting messages:', error);
      return {
        success: false,
        message: "Failed to retrieve messages. Please try again."
      };
    }
  }

  async logMessage(message, userId) {
    try {
      // This would be called automatically when messages are sent through the system
      // For manual logging via agent request
      const contentMatch = message.match(/log\s+"(.+)"\s+in\s+team\s+(\w+)/i);
      
      if (!contentMatch) {
        return {
          success: false,
          message: 'Please use format: Log "Hello team!" in Team Alpha'
        };
      }

      const content = contentMatch[1];
      const teamName = contentMatch[2];

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

      const isMember = team.members.some(m => m.userId === userId);
      if (!isMember) {
        return {
          success: false,
          message: "You must be a team member to send messages."
        };
      }

      const newMessage = await prisma.message.create({
        data: {
          content,
          teamId: team.id,
          senderId: userId,
          type: 'TEXT'
        }
      });

      await this.log('send_message', { messageId: newMessage.id, teamId: team.id }, userId);

      return {
        success: true,
        message: `✅ Message logged to Team ${teamName}.`,
        data: newMessage
      };
    } catch (error) {
      console.error('Error logging message:', error);
      return {
        success: false,
        message: "Failed to log message. Please try again."
      };
    }
  }

  async getCommStats(message, userId) {
    try {
      const teamMatch = message.match(/team\s+(\w+)/i);
      
      if (!teamMatch) {
        return {
          success: false,
          message: "Please specify the team. Try: 'Show communication stats for Team Alpha.'"
        };
      }

      const teamName = teamMatch[1];
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

      const isMember = team.members.some(m => m.userId === userId);
      if (!isMember) {
        return {
          success: false,
          message: "You must be a team member to view communication stats."
        };
      }

      const totalMessages = await prisma.message.count({
        where: {
          teamId: team.id,
          createdAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
          }
        }
      });

      const messageStats = await prisma.message.groupBy({
        by: ['senderId'],
        where: {
          teamId: team.id,
          createdAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
          }
        },
        _count: {
          id: true
        }
      });

      const statsReport = [
        `📈 Communication Stats for Team ${teamName} (Last 30 days):`,
        `• Total Messages: ${totalMessages}`,
        `• Active Users: ${messageStats.length}`,
        `• Average Messages per User: ${Math.round(totalMessages / messageStats.length) || 0}`,
        ``,
        `Top Contributors:`
      ];

      // Get user details for top contributors
      for (const stat of messageStats.slice(0, 5)) {
        const user = await prisma.user.findUnique({
          where: { id: stat.senderId }
        });
        if (user) {
          statsReport.push(`• ${user.username}: ${stat._count.id} messages`);
        }
      }

      await this.log('view_comm_stats', { teamId: team.id, totalMessages, activeUsers: messageStats.length }, userId);

      return {
        success: true,
        message: statsReport.join('\n'),
        data: { messageStats, totalMessages, team }
      };
    } catch (error) {
      console.error('Error getting communication stats:', error);
      return {
        success: false,
        message: "Failed to get communication stats. Please try again."
      };
    }
  }
}

export default CommunicationAgent;
