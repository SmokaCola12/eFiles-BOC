# Bureau of Customs – PEZA: eFiles System

A comprehensive offline file management web application designed for daily and monthly report approval workflows. Built with Next.js, SQLite, and modern web technologies.

## 🚀 Features

### 📁 File Management
- **Upload & Preview**: Support for PDF, Excel, Word, and image files
- **Categorization**: Organize files as Daily or Monthly reports
- **Permission System**: Control file visibility (Private/Shared)
- **File Preview**: In-browser preview for images and documents
- **Download**: Secure file download with permission checks

### 👥 User Management
- **Role-Based Access**: Developer, Collector, User1, and User2 roles
- **Account Creation**: Developer can create/delete user accounts
- **Profile Management**: Users can update passwords and profile pictures
- **Session Management**: Secure authentication with session cookies

### 💬 Communication
- **Built-in Chat**: Office-wide chat room for team communication
- **Private Messages**: 1-on-1 messaging system with unread indicators
- **File Comments**: Comment system for each file
- **Status Updates**: Approve/reject files with status tracking
- **Real-time Updates**: Live chat and notification system

### 🔒 Security & Privacy
- **Offline Operation**: Runs completely offline on local network
- **Local Storage**: Files stored locally on your PC
- **Role Permissions**: Strict access control based on user roles
- **Secure Authentication**: Bcrypt password hashing and secure sessions

## 🛠️ Installation & Setup

### Prerequisites
- Node.js 18+ installed
- Windows PC (for .exe packaging)

### Step 1: Download and Install
\`\`\`bash
# Clone or download the project
git clone <repository-url>
cd bureau-customs-peza-efiles

# Install dependencies
npm install
\`\`\`

### Step 2: Initial Setup
\`\`\`bash
# Start the development server
npm run dev

# The app will be available at http://localhost:3000
\`\`\`

### Step 3: First Login
Contact your system administrator for login credentials.

### Step 4: Configure Users
1. Login as developer
2. Go to "Users" tab
3. Create additional user accounts as needed
4. Assign appropriate roles (Developer/Collector/User1/User2)

## 📱 Usage Guide

### For Developers
1. **Upload Reports**: Use the "Upload File" button to add daily/monthly reports
2. **Manage Users**: Create, edit, or delete user accounts
3. **Set Permissions**: Choose file visibility (Private to Group or Shared with All)
4. **Monitor Activity**: View all files and comments across the system
5. **View Switch**: Switch between User1 and User2 groups to manage both

### For Collectors
1. **Review Reports**: Browse daily and monthly reports in the Files tab
2. **Approve/Reject**: Change file status and leave comments
3. **Mobile Friendly**: Optimized interface for iPad browsing
4. **Quick Communication**: Use chat for immediate feedback
5. **View Switch**: Switch between User1 and User2 groups

### For User1
1. **Submit Reports**: Upload daily/monthly reports for approval
2. **Track Status**: Monitor approval status of submitted files
3. **Team Chat**: Participate in User1 group communication
4. **Profile Management**: Update password and profile picture
5. **Collaborate**: Work with other User1 users on shared files

### For User2
1. **Submit Forms**: Upload forms, announcements, and leave files
2. **Track Status**: Monitor approval status of submitted files
3. **Team Chat**: Participate in User2 group communication
4. **Profile Management**: Update password and profile picture
5. **Collaborate**: Work with other User2 users on shared files

## 🗂️ File Organization

### Categories
- **User1 Group**: All Files, Daily Reports, Weekly Reports, Monthly Reports
- **User2 Group**: All Files, Forms, Announcements, Leave Files
- **Custom Categories**: Add new categories as needed

### Status Tracking
- **Pending**: Newly uploaded, awaiting review
- **Approved**: Collector/Developer has approved the report
- **Rejected**: Needs revision, feedback provided

### Permission Levels
- **Group Only**: Only visible to users in the same group
- **Shared with All**: Visible to all users

## 💾 Data Storage

### Local Database
- SQLite database stored in `/data/database.db`
- Automatic initialization with default users
- Persistent storage across application restarts

### File Storage
- Uploaded files stored in `/uploads` directory
- Secure filename generation prevents conflicts
- Automatic cleanup when files are deleted

## 🔧 Configuration

### Environment Variables
Create a `.env.local` file for custom configuration:
\`\`\`env
# Optional: Custom database path
DATABASE_PATH=./data/custom.db

# Optional: Custom uploads directory
UPLOADS_DIR=./uploads

# Optional: Session secret
SESSION_SECRET=your-secret-key
\`\`\`

### Port Configuration
\`\`\`bash
# Run on custom port
npm run dev -- -p 8080
\`\`\`

## 📦 Building for Production

### Development Build
\`\`\`bash
npm run build
npm start
\`\`\`

### Windows Executable (Coming Soon)
Instructions for packaging as Windows .exe will be provided in future updates.

## 🛡️ Security Features

- **Password Hashing**: Bcrypt with salt rounds
- **Session Management**: Secure HTTP-only cookies
- **File Validation**: Type and size restrictions
- **Permission Checks**: Role-based access control
- **SQL Injection Protection**: Prepared statements

## 🔍 Troubleshooting

### Common Issues

**Database Connection Error**
\`\`\`bash
# Delete and recreate database
rm -rf data/
npm run dev
\`\`\`

**File Upload Issues**
\`\`\`bash
# Check uploads directory permissions
mkdir uploads
chmod 755 uploads
\`\`\`

**Port Already in Use**
\`\`\`bash
# Use different port
npm run dev -- -p 3001
\`\`\`

### Reset to Defaults
\`\`\`bash
# Clear all data and start fresh
rm -rf data/ uploads/
npm run dev
\`\`\`

## 📞 Support

For technical support or feature requests:
1. Check the troubleshooting section above
2. Review the console logs for error messages
3. Ensure all dependencies are properly installed
4. Verify file permissions for data and uploads directories

## 🔄 Updates & Maintenance

### Regular Maintenance
- Monitor disk space in `/uploads` directory
- Backup `/data` directory regularly
- Update user passwords periodically
- Review and clean old files as needed

### Version Updates
- Check for new releases
- Backup data before updating
- Test in development environment first
- Update dependencies: `npm update`

---

**Built with ❤️ for efficient report management workflows**

This comprehensive offline file manager provides everything you need for report management and approval workflows. The system is designed to work completely offline, with local file storage and SQLite database, making it perfect for secure internal use.
