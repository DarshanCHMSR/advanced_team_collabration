import { PrismaClient } from '@prisma/client';
import BaseAgent from './BaseAgent.js';

const prisma = new PrismaClient();

class TaskProjectAgent extends BaseAgent {
  constructor() {
    super('TaskProjectAgent', 'Manages tasks, assignments, and project tracking');
  }

  async processRequest(message, context) {
    const { userId } = context;
    const entities = this.extractEntities(message);

    try {
      if (entities.action === 'create' && entities.taskName) {
        return await this.createTask(message, userId);
      }

      if (entities.action === 'assign' && entities.taskName) {
        return await this.assignTask(message, userId);
      }

      if (message.toLowerCase().includes('progress') || message.toLowerCase().includes('status')) {
        return await this.getTaskProgress(message, userId);
      }

      return {
        success: false,
        message: "I couldn't understand your task request. Try: 'Assign Design Homepage task to Priya in Team Alpha.'"
      };
    } catch (error) {
      console.error('TaskProjectAgent error:', error);
      return {
        success: false,
        message: "Sorry, I encountered an error while managing tasks."
      };
    }
  }

  async createTask(message, userId) {
    try {
      const taskMatch = message.match(/(?:create|add)\s+task\s+(.+?)(?:\s+in\s+team\s+(\w+))?$/i);
      if (!taskMatch) {
        return {
          success: false,
          message: "Please specify the task details. Try: 'Create task Design Homepage in Team Alpha.'"
        };
      }

      const taskName = taskMatch[1].trim();
      const teamName = taskMatch[2];

      if (!teamName) {
        return {
          success: false,
          message: "Please specify the team for this task."
        };
      }

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
          message: "You must be a team member to create tasks."
        };
      }

      const task = await prisma.task.create({
        data: {
          title: taskName,
          description: `Task: ${taskName}`,
          status: 'TODO',
          priority: 'MEDIUM',
          teamId: team.id,
          createdById: userId,
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
        }
      });

      await this.log('create_task', { taskId: task.id, teamId: team.id, taskName }, userId);

      return {
        success: true,
        message: `✅ Task "${taskName}" has been created in Team ${teamName}.`,
        data: task
      };
    } catch (error) {
      console.error('Error creating task:', error);
      return {
        success: false,
        message: "Failed to create task. Please try again."
      };
    }
  }

  async assignTask(message, userId) {
    try {
      const assignMatch = message.match(/assign\s+(.+?)\s+task\s+to\s+(\w+)\s+in\s+team\s+(\w+)/i);
      if (!assignMatch) {
        return {
          success: false,
          message: "Please use format: 'Assign Design Homepage task to Priya in Team Alpha.'"
        };
      }

      const taskName = assignMatch[1].trim();
      const userName = assignMatch[2];
      const teamName = assignMatch[3];

      // Find team and task
      const team = await prisma.team.findFirst({
        where: { name: teamName },
        include: { 
          members: { include: { user: true } },
          tasks: true
        }
      });

      if (!team) {
        return {
          success: false,
          message: `Team "${teamName}" not found.`
        };
      }

      const task = team.tasks.find(t => t.title.toLowerCase().includes(taskName.toLowerCase()));
      if (!task) {
        return {
          success: false,
          message: `Task "${taskName}" not found in Team ${teamName}.`
        };
      }

      const assigneeUser = team.members.find(m => m.user.username === userName);
      if (!assigneeUser) {
        return {
          success: false,
          message: `User "${userName}" is not a member of Team ${teamName}.`
        };
      }

      // Check permissions
      const currentUserMember = team.members.find(m => m.userId === userId);
      if (!currentUserMember || (!['OWNER', 'ADMIN'].includes(currentUserMember.role) && task.createdById !== userId)) {
        return {
          success: false,
          message: "You don't have permission to assign this task."
        };
      }

      await prisma.task.update({
        where: { id: task.id },
        data: { 
          assignedToId: assigneeUser.userId,
          status: 'IN_PROGRESS'
        }
      });

      await this.log('assign_task', { 
        taskId: task.id, 
        assignedToId: assigneeUser.userId, 
        teamId: team.id 
      }, userId);

      return {
        success: true,
        message: `✅ Task "${taskName}" has been assigned to ${userName} in Team ${teamName}.`
      };
    } catch (error) {
      console.error('Error assigning task:', error);
      return {
        success: false,
        message: "Failed to assign task. Please try again."
      };
    }
  }

  async getTaskProgress(message, userId) {
    try {
      const teamMatch = message.match(/team\s+(\w+)/i);
      if (!teamMatch) {
        return {
          success: false,
          message: "Please specify the team. Try: 'Show progress for Team Alpha.'"
        };
      }

      const teamName = teamMatch[1];
      const team = await prisma.team.findFirst({
        where: { name: teamName },
        include: {
          tasks: {
            include: {
              assignedTo: true,
              createdBy: true
            }
          },
          members: true
        }
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
          message: "You must be a team member to view task progress."
        };
      }

      const taskSummary = {
        total: team.tasks.length,
        todo: team.tasks.filter(t => t.status === 'TODO').length,
        inProgress: team.tasks.filter(t => t.status === 'IN_PROGRESS').length,
        done: team.tasks.filter(t => t.status === 'DONE').length
      };

      const progressReport = [
        `📊 Task Progress for Team ${teamName}:`,
        `• Total Tasks: ${taskSummary.total}`,
        `• To Do: ${taskSummary.todo}`,
        `• In Progress: ${taskSummary.inProgress}`,
        `• Completed: ${taskSummary.done}`,
        ``,
        `Recent Tasks:`
      ];

      team.tasks.slice(-5).forEach(task => {
        const assignee = task.assignedTo ? task.assignedTo.username : 'Unassigned';
        progressReport.push(`• ${task.title} - ${task.status} (${assignee})`);
      });

      await this.log('view_progress', { teamId: team.id, taskSummary }, userId);

      return {
        success: true,
        message: progressReport.join('\n'),
        data: { team, taskSummary }
      };
    } catch (error) {
      console.error('Error getting task progress:', error);
      return {
        success: false,
        message: "Failed to get task progress. Please try again."
      };
    }
  }
}

export default TaskProjectAgent;
