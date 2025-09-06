import TeamCreationAgent from './TeamCreationAgent.js';
import TeamManagementAgent from './TeamManagementAgent.js';
import InvitationAgent from './InvitationAgent.js';
import TaskProjectAgent from './TaskProjectAgent.js';
import CommunicationAgent from './CommunicationAgent.js';

class AgentManager {
  constructor() {
    this.agents = {
      teamCreation: new TeamCreationAgent(),
      teamManagement: new TeamManagementAgent(),
      invitation: new InvitationAgent(),
      taskProject: new TaskProjectAgent(),
      communication: new CommunicationAgent()
    };
  }

  async processMessage(message, context) {
    try {
      // Normalize message
      const normalizedMessage = message.toLowerCase().trim();

      // Determine which agent should handle the request
      const agentType = this.determineAgent(normalizedMessage);

      if (!agentType) {
        return this.getHelpResponse();
      }

      const agent = this.agents[agentType];
      const response = await agent.processRequest(message, context);

      return {
        ...response,
        agentType,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('AgentManager error:', error);
      return {
        success: false,
        message: "I encountered an error while processing your request. Please try again.",
        agentType: 'error',
        timestamp: new Date().toISOString()
      };
    }
  }

  determineAgent(message) {
    // Team Creation patterns
    if (this.matchesPatterns(message, [
      'create team',
      'new team',
      'start team',
      'form team',
      'establish team'
    ])) {
      return 'teamCreation';
    }

    // Team Management patterns
    if (this.matchesPatterns(message, [
      'promote',
      'make admin',
      'remove user',
      'kick',
      'update team',
      'change team',
      'archive team',
      'delete team',
      'manage team',
      'team settings'
    ])) {
      return 'teamManagement';
    }

    // Invitation patterns
    if (this.matchesPatterns(message, [
      'invite',
      'add user',
      'join team',
      'accept invitation',
      'reject invitation',
      'decline invitation',
      'send invitation'
    ])) {
      return 'invitation';
    }

    // Task/Project patterns
    if (this.matchesPatterns(message, [
      'create task',
      'new task',
      'assign task',
      'update task',
      'complete task',
      'finish task',
      'task status',
      'show tasks',
      'list tasks',
      'my tasks',
      'team tasks'
    ])) {
      return 'taskProject';
    }

    // Communication patterns
    if (this.matchesPatterns(message, [
      'show messages',
      'view messages',
      'message history',
      'chat history',
      'communication stats',
      'message analytics',
      'log message'
    ])) {
      return 'communication';
    }

    return null;
  }

  matchesPatterns(message, patterns) {
    return patterns.some(pattern => message.includes(pattern));
  }

  getHelpResponse() {
    return {
      success: true,
      message: `🤖 **SynergySphere AI Assistant**

I can help you with:

🔹 **Team Creation**
   • "Create team Alpha for marketing"
   • "Start new team called Development"

🔹 **Team Management**  
   • "Promote john to admin in Team Alpha"
   • "Remove user sarah from Team Beta"
   • "Archive Team Gamma"

🔹 **Invitations**
   • "Invite alice@email.com to Team Alpha"
   • "Accept invitation to Team Beta"
   • "Show my pending invitations"

🔹 **Tasks & Projects**
   • "Create task 'Fix login bug' for Team Alpha"
   • "Assign task to john"
   • "Show all my tasks"
   • "Update task status to completed"

🔹 **Communication**
   • "Show messages from Team Alpha last week"
   • "Communication stats for Team Beta"

Just ask me what you'd like to do!`,
      agentType: 'help',
      timestamp: new Date().toISOString()
    };
  }

  // Get all available agents and their capabilities
  getAgentCapabilities() {
    return {
      teamCreation: {
        name: 'Team Creation Agent',
        description: 'Creates new teams with proper metadata',
        commands: ['create team', 'new team', 'start team']
      },
      teamManagement: {
        name: 'Team Management Agent',
        description: 'Manages team members, roles, and settings',
        commands: ['promote user', 'remove user', 'update team', 'archive team']
      },
      invitation: {
        name: 'Invitation Agent',
        description: 'Handles team invitations and member onboarding',
        commands: ['invite user', 'accept invitation', 'show invitations']
      },
      taskProject: {
        name: 'Task & Project Agent',
        description: 'Manages tasks, assignments, and project tracking',
        commands: ['create task', 'assign task', 'update task', 'show tasks']
      },
      communication: {
        name: 'Communication Agent',
        description: 'Provides message history and communication analytics',
        commands: ['show messages', 'message stats', 'communication analytics']
      }
    };
  }

  // Health check for all agents
  async healthCheck() {
    const results = {};
    
    for (const [agentType, agent] of Object.entries(this.agents)) {
      try {
        results[agentType] = {
          status: 'healthy',
          name: agent.name,
          description: agent.description
        };
      } catch (error) {
        results[agentType] = {
          status: 'error',
          error: error.message
        };
      }
    }

    return results;
  }
}

export default AgentManager;
