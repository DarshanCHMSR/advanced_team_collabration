# SynergySphere - Advanced Team Collaboration Platform

![SynergySphere Logo](https://via.placeholder.com/150x50/2563eb/ffffff?text=SynergySphere)

**SynergySphere** is a modern, real-time team collaboration platform built with React, Node.js, Socket.io, and PostgreSQL. It enables teams to communicate, collaborate, and manage projects seamlessly with professional UI and advanced features.

## ✨ Features

### 🔐 Authentication & User Management
- **Secure Registration/Login** with JWT authentication
- **Username & Email Support** - Login with either username or email
- **Professional UI** with Material-UI components
- **Real-time Online Status** tracking

### 👥 Team Management
- **Create Teams** with public/private visibility options
- **Team Invitations** - Send and manage invites by username
- **Role-based Access Control** (Owner, Admin, Member)
- **Team Discovery** for public teams
- **Team Member Management** with online status indicators

### 💬 Real-time Communication
- **WebSocket Integration** with Socket.io for instant messaging
- **Team Chat Rooms** with message history
- **Typing Indicators** to show when users are typing
- **Real-time Notifications** for invites and messages
- **Message Persistence** stored in PostgreSQL

### 🚀 Project Management
- **Project Creation** and assignment to teams
- **Task Management** with priority levels and due dates
- **Project Dashboard** with statistics and insights
- **Team Collaboration** on shared projects

### 🎨 Professional UI/UX
- **Modern Design** with Material-UI and custom theming
- **Responsive Layout** for desktop and mobile devices
- **Dark/Light Theme** support
- **Intuitive Navigation** with sidebar and breadcrumbs
- **Professional Gradients** and animations

### 📊 Dashboard & Analytics
- **Team Statistics** - members, projects, activity
- **Quick Actions** for common tasks
- **Recent Activity** feed
- **Notification Center** with invite management

## 🛠️ Technology Stack

### Frontend
- **React 19** - Modern React with hooks and functional components
- **Material-UI (MUI)** - Professional component library
- **Socket.io Client** - Real-time communication
- **React Router** - Client-side routing
- **Axios** - HTTP client for API calls
- **Vite** - Fast build tool and development server

### Backend
- **Node.js** - JavaScript runtime
- **Express.js** - Web application framework
- **Socket.io** - Real-time bidirectional communication
- **Prisma ORM** - Type-safe database client
- **PostgreSQL** - Robust relational database
- **JWT** - JSON Web Tokens for authentication
- **bcrypt.js** - Password hashing

### Database Schema
```prisma
model User {
  id        Int      @id @default(autoincrement())
  email     String   @unique
  username  String   @unique
  name      String?
  password  String
  avatar    String?
  isOnline  Boolean  @default(false)
  // ... relations
}

model Team {
  id          Int      @id @default(autoincrement())
  name        String
  description String?
  isPublic    Boolean  @default(false)
  // ... relations
}

model TeamInvite {
  id        Int               @id @default(autoincrement())
  status    TeamInviteStatus  @default(PENDING)
  message   String?
  // ... relations
}

model Message {
  id        Int      @id @default(autoincrement())
  content   String
  type      MessageType @default(TEXT)
  // ... relations
}
```

## 🚀 Getting Started

### Prerequisites
- **Node.js** (v18+ recommended)
- **PostgreSQL** database
- **npm** or **yarn** package manager

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/synergy-sphere.git
   cd synergy-sphere
   ```

2. **Install server dependencies**
   ```bash
   cd server
   npm install
   ```

3. **Install client dependencies**
   ```bash
   cd ../client
   npm install
   ```

4. **Database Setup**
   ```bash
   cd ../server
   # Create a PostgreSQL database and update the DATABASE_URL in .env
   npx prisma migrate dev --name "initial-setup"
   npx prisma generate
   ```

5. **Environment Configuration**
   
   Create a `.env` file in the server directory:
   ```env
   DATABASE_URL="postgresql://username:password@localhost:5432/synergysphere"
   JWT_SECRET="your-super-secret-jwt-key"
   PORT=5000
   ```

6. **Start the development servers**
   
   **Terminal 1 - Server:**
   ```bash
   cd server
   node index.js
   ```
   
   **Terminal 2 - Client:**
   ```bash
   cd client
   npm run dev
   ```

7. **Access the application**
   - Frontend: `http://localhost:5173`
   - Backend API: `http://localhost:5000`

## 📱 Usage Guide

### Getting Started
1. **Create Account** - Register with your name, username, email, and password
2. **Login** - Use your email or username to sign in
3. **Dashboard** - View your teams, invites, and quick actions

### Team Collaboration
1. **Create Team** - Click "Create Team" and set up your workspace
2. **Invite Members** - Search for users by username and send invites
3. **Real-time Chat** - Communicate with team members instantly
4. **Manage Projects** - Create and organize team projects

### Communication Features
- **Send Messages** - Type and send messages in team chat rooms
- **Receive Notifications** - Get notified of new invites and messages
- **Online Status** - See who's currently online in your teams
- **Typing Indicators** - See when others are typing

## 🔧 API Endpoints

### Authentication
```
POST /api/auth/register    - Register new user
POST /api/auth/login       - Login user
GET  /api/auth/me          - Get current user
POST /api/auth/logout      - Logout user
PUT  /api/auth/profile     - Update user profile
```

### Teams
```
GET    /api/teams           - Get user's teams
POST   /api/teams           - Create new team
GET    /api/teams/:id       - Get specific team
PUT    /api/teams/:id       - Update team
DELETE /api/teams/:id       - Delete team
POST   /api/teams/:id/members     - Add team member
DELETE /api/teams/:id/members/:userId - Remove team member
GET    /api/teams/:id/messages     - Get team messages
POST   /api/teams/:id/messages     - Send team message
```

### Invites
```
GET    /api/invites         - Get user invites
POST   /api/invites         - Send team invite
PUT    /api/invites/:id     - Respond to invite (accept/reject)
DELETE /api/invites/:id     - Cancel sent invite
GET    /api/invites/search-users - Search users for inviting
```

## 🎯 WebSocket Events

### Client to Server
```javascript
join_team(teamId)           - Join team chat room
leave_team(teamId)          - Leave team chat room
send_message(data)          - Send message to team
typing(data)                - Indicate user is typing
stop_typing(data)           - Stop typing indicator
user_online()               - Mark user as online
```

### Server to Client
```javascript
new_message(message)        - Receive new team message
user_typing(data)           - User started typing
user_stop_typing(data)      - User stopped typing
user_status_change(data)    - User online/offline status changed
new_invite(invite)          - Received new team invite
invite_response(invite)     - Invite was accepted/rejected
invite_cancelled(data)      - Invite was cancelled
```

## 🚀 Deployment

### Production Build
```bash
# Build client
cd client
npm run build

# The build files will be in client/dist/
# Serve these static files with your preferred web server
```

### Environment Variables (Production)
```env
DATABASE_URL="your-production-database-url"
JWT_SECRET="your-production-jwt-secret"
PORT=5000
NODE_ENV=production
```

### Deploy to Cloud Platforms
- **Frontend**: Vercel, Netlify, or AWS S3 + CloudFront
- **Backend**: Heroku, Railway, DigitalOcean, or AWS EC2
- **Database**: Neon, Supabase, or AWS RDS

## 🤝 Contributing

We welcome contributions to SynergySphere! Please follow these steps:

1. **Fork the repository**
2. **Create a feature branch** (`git checkout -b feature/amazing-feature`)
3. **Commit your changes** (`git commit -m 'Add amazing feature'`)
4. **Push to the branch** (`git push origin feature/amazing-feature`)
5. **Open a Pull Request**

### Development Guidelines
- Follow ESLint and Prettier configurations
- Write meaningful commit messages
- Add tests for new features
- Update documentation as needed

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👥 Team

- **Lead Developer**: Your Name
- **UI/UX Designer**: Designer Name
- **Backend Developer**: Backend Dev Name

## 🔮 Roadmap

### Upcoming Features
- [ ] **File Sharing** - Upload and share files in team chats
- [ ] **Video Calls** - Integrate video conferencing
- [ ] **Advanced Project Management** - Kanban boards, Gantt charts
- [ ] **Team Analytics** - Detailed activity and productivity metrics
- [ ] **Mobile App** - React Native mobile application
- [ ] **Integrations** - Slack, Discord, GitHub, Jira integrations
- [ ] **Advanced Notifications** - Email, push notifications
- [ ] **Team Templates** - Predefined team structures

### Version History
- **v1.0.0** - Initial release with core features
- **v1.1.0** - Real-time messaging and WebSocket integration
- **v1.2.0** - Team invite system and user search

## 📞 Support

For support, email support@synergysphere.com or join our Discord community.

## 🙏 Acknowledgments

- Material-UI team for the excellent component library
- Socket.io team for real-time communication capabilities
- Prisma team for the amazing ORM
- React team for the fantastic frontend framework

---

**SynergySphere** - *Where teams come together to create extraordinary things* 🚀
