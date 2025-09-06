import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

class BaseAgent {
  constructor(name, description) {
    this.name = name;
    this.description = description;
    this.id = uuidv4();
  }

  async processRequest(message, context) {
    throw new Error('processRequest method must be implemented by subclass');
  }

  async log(action, data, userId) {
    try {
      // Log agent activities to database
      await prisma.agentLog.create({
        data: {
          agentName: this.name,
          action,
          data: JSON.stringify(data),
          userId
        }
      });
    } catch (error) {
      console.error('Failed to log agent activity:', error);
    }
  }

  extractEntities(message) {
    // Simple entity extraction
    const entities = {
      teamName: this.extractTeamName(message),
      userName: this.extractUserName(message),
      taskName: this.extractTaskName(message),
      role: this.extractRole(message),
      action: this.extractAction(message)
    };
    return entities;
  }

  extractTeamName(message) {
    const teamMatch = message.match(/team\s+(?:called\s+)?(\w+)/i);
    return teamMatch ? teamMatch[1] : null;
  }

  extractUserName(message) {
    const userMatch = message.match(/(?:invite|add|promote)\s+(\w+)/i);
    return userMatch ? userMatch[1] : null;
  }

  extractTaskName(message) {
    const taskMatch = message.match(/task\s+(?:called\s+)?([^"]+?)(?:\s+to\s+|\s+in\s+|$)/i);
    return taskMatch ? taskMatch[1].trim() : null;
  }

  extractRole(message) {
    const roles = ['admin', 'member', 'owner'];
    for (const role of roles) {
      if (message.toLowerCase().includes(role)) {
        return role.toUpperCase();
      }
    }
    return null;
  }

  extractAction(message) {
    const actions = {
      'create': ['create', 'make', 'add', 'new'],
      'update': ['update', 'change', 'modify', 'edit'],
      'delete': ['delete', 'remove', 'archive'],
      'invite': ['invite', 'add'],
      'promote': ['promote', 'upgrade'],
      'assign': ['assign', 'give']
    };

    for (const [action, keywords] of Object.entries(actions)) {
      if (keywords.some(keyword => message.toLowerCase().includes(keyword))) {
        return action;
      }
    }
    return null;
  }
}

export default BaseAgent;
