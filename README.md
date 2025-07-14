# User Management & Database Administration Application

A full-stack web application built with Node.js, Express, PostgreSQL, and vanilla JavaScript that provides user authentication and database table management capabilities.

## 📋 Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Backend Structure](#backend-structure)
- [Frontend Structure](#frontend-structure)
- [Database Design](#database-design)
- [Authentication & Authorization](#authentication--authorization)
- [Key Features](#key-features)
- [File Structure](#file-structure)
- [Setup & Installation](#setup--installation)
- [API Endpoints](#api-endpoints)
- [Security Features](#security-features)

## 🎯 Overview

This application follows the **MVC (Model-View-Controller)** design pattern and provides:

- **User Registration & Authentication** with role-based access (user/admin)
- **Database Table Management** for admins to view, edit, and manage database tables
- **Dynamic Theme Support** (light/dark mode)
- **Real-time Table Editing** with inline cell editing capabilities
- **Advanced Table Features** including sorting, searching, filtering, and pagination

## 🏗️ Architecture

The application uses a **three-tier architecture**:

1. **Presentation Layer** (Frontend) - HTML, CSS, JavaScript
2. **Business Logic Layer** (Backend) - Express.js controllers and middleware
3. **Data Access Layer** - PostgreSQL database with connection pooling

### Key Design Patterns:
- **MVC Pattern**: Separates concerns between models, views, and controllers
- **Repository Pattern**: Database operations encapsulated in model classes
- **Middleware Pattern**: Authentication, CORS, and request logging
- **Factory Pattern**: Dynamic table management with configurable permissions

## 🔧 Backend Structure

### Core Files

#### `src/app.js` - Application Entry Point
- Express server setup and configuration
- Middleware registration (CORS, JSON parsing, static file serving)
- Route mounting and error handling
- Health check endpoint for database connectivity

#### `src/config/database.js` - Database Configuration
- PostgreSQL connection pool setup using `pg` library
- Environment variable configuration
- Connection event handlers for monitoring

#### Models Layer

**`src/models/User.js`** - Core Business Logic
- **User Management**: CRUD operations for user accounts
- **Authentication**: Password hashing with bcrypt, user verification
- **Table Operations**: Dynamic database table management
- **Permission System**: Column-level permissions for data access
- **Data Validation**: Type checking and constraint validation

Key Methods:
```javascript
// User operations
createUser(userData)          // Create new user with role
authenticate(email, password) // Login validation
getUserById(userId)          // Fetch user details

// Table operations
getAllTables()               // List all database tables
getTableData(tableName)      // Fetch table content with pagination
addTableRow(tableName, data) // Insert new records
updateTableRow(tableName, rowId, updates) // Update existing records
deleteTableRow(tableName, rowId) // Delete records
```

#### Controllers Layer

**`src/controllers/userController.js`** - Request Handlers
- Route handler functions for user and table operations
- Request validation and sanitization
- Response formatting and error handling
- Integration with authentication middleware

**`src/controllers/authController.js`** - Authentication Logic
- JWT token generation and management
- Login/logout functionality
- User session handling

#### Middleware

**`src/middleware/authMiddleware.js`** - Security Layer
- JWT token validation
- User authentication verification
- Request context enrichment with user data
- Protected route access control

**`src/config/columnPermissions.js`** - Data Access Control
- Granular column-level permissions
- Role-based data visibility
- Edit/view restrictions
- Conditional access rules

### Permission System Details

The application implements a sophisticated permission system:

```javascript
const COLUMN_PERMISSIONS = {
    'users': {
        'password': { visible: false, editable: false, addable: true },
        'role': { visible: true, editable: 'conditional', addable: 'conditional' },
        'id': { visible: true, editable: false, addable: false }
    }
};
```

- **Visible**: Controls if column appears in table views
- **Editable**: Determines if existing data can be modified
- **Addable**: Controls if column can be set during record creation
- **Conditional**: Dynamic permissions based on user role and context

#### Routes

**`src/routes/userRoutes.js`** - API Endpoint Definitions
```javascript
// Authentication
POST /api/users/login          // User login
POST /api/users/register       // User registration

// Table Management (Admin only)
GET /api/users/tables          // List all tables
GET /api/users/tables/:tableName // Get table data
GET /api/users/tables/:tableName/columns // Get table structure
POST /api/users/tables/:tableName/rows   // Add new record
PATCH /api/users/tables/:tableName/rows/:rowId // Update record
DELETE /api/users/tables/:tableName/rows/:rowId // Delete record

// User Management
GET /api/users                 // List all users
GET /api/users/:id            // Get user by ID
PUT /api/users/:id            // Update user
DELETE /api/users/:id         // Delete user
```

## 🎨 Frontend Structure

### HTML Pages

**`login.html`** - Authentication Interface
- User login form with email/password fields
- Theme toggle functionality
- Responsive design with error/success messaging
- Automatic redirection based on user role

**`register.html`** - User Registration
- Account creation form with role selection
- Admin password verification for admin accounts
- Form validation and user feedback
- Conditional field display based on user type

**`dashboard-admin.html`** - Administrative Interface
- Comprehensive database management interface
- Multi-section navigation (Tables, Settings, Logs)
- Modal dialogs for data entry
- Advanced table features (search, filter, sort, pagination)

**`dashboard-user.html`** - User Interface
- Basic user dashboard (expandable for future features)
- Theme support and user session management

### JavaScript Modules

**`js/login.js`** - Authentication Logic
- Form submission handling
- API communication for login
- JWT token storage and management
- Role-based redirection logic

**`js/register.js`** - Registration Logic
- Dynamic form behavior (admin password field)
- User type selection handling
- Registration API integration
- Form validation and error handling

**`js/adminDash.js`** - Admin Dashboard Logic
- **Table Management**: Dynamic table loading and rendering
- **Inline Editing**: Click-to-edit functionality for table cells
- **CRUD Operations**: Add, update, delete records
- **Advanced Features**: Sorting, searching, filtering
- **Modal Management**: Dynamic form generation for new entries
- **Permission Handling**: Conditional UI based on user permissions

Key Functions:
```javascript
// Table operations
loadDatabaseTables()         // Fetch and display all tables
loadTableData(tableName)     // Load specific table content
sortTable(columnName)        // Client-side table sorting
handleCellEdit(event)        // Inline cell editing
updateCellValue()            // Save cell changes to database

// UI management
showAddEntryModal()          // Dynamic form generation
setupSearchAndFilter()       // Advanced table filtering
renderTable(tableName)       // Table rendering with permissions
```

**`js/userDash.js`** - User Dashboard Logic
- Theme management
- User session handling
- Extensible for additional user features

### CSS Styling

**`css/styles.css`** - Authentication Page Styles
- Light/dark theme variables
- Form styling and responsive design
- Smooth transitions and animations
- Cross-browser compatibility

**`css/dashboardStyle.css`** - Dashboard Interface Styles
- Advanced table styling with hover effects
- Modal dialog styling
- Theme-aware color schemes
- Responsive grid layouts
- Interactive elements (buttons, forms, tables)

### Theme System

The application implements a comprehensive theming system:

```css
:root {
    /* Light theme */
    --bg-primary: #f4f4f4;
    --text-primary: #333333;
    --accent-primary: #3498db;
}

[data-theme="dark"] {
    /* Dark theme */
    --bg-primary: #1a1a1a;
    --text-primary: #ffffff;
    --accent-primary: #4a9eff;
}
```

- **CSS Custom Properties**: For dynamic theming
- **LocalStorage Persistence**: Theme preference saved across sessions
- **Transition Effects**: Smooth theme switching
- **Component Coverage**: All UI elements support both themes

## 🗄️ Database Design

### Users Table Structure
```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Dynamic Table Management
The application can manage any PostgreSQL table through:
- **Information Schema Queries**: Discovering table structure
- **Dynamic Query Generation**: Safe parameterized queries
- **Type Validation**: Automatic data type handling
- **Constraint Enforcement**: Database-level validation

## 🔐 Authentication & Authorization

### JWT Token System
- **Stateless Authentication**: JWT tokens for session management
- **Token Expiration**: 1-hour token lifetime
- **Secure Storage**: Client-side token storage in localStorage
- **Authorization Headers**: Bearer token authentication

### Role-Based Access Control
- **User Role**: Limited dashboard access
- **Admin Role**: Full database management capabilities
- **Permission Inheritance**: Hierarchical access control
- **Route Protection**: Middleware-enforced access control

### Password Security
- **bcrypt Hashing**: Secure password storage with salt rounds
- **Password Validation**: Client and server-side validation
- **Admin Verification**: Secret-based admin account creation

## ✨ Key Features

### For Regular Users
- **Account Management**: Registration and login
- **Profile Dashboard**: Personal information display
- **Theme Customization**: Light/dark mode toggle

### For Administrators
- **Database Overview**: Complete table listing with metadata
- **Table Management**: View, edit, add, delete records
- **Advanced Search**: Multi-column search and filtering
- **Data Visualization**: Sortable columns with indicators
- **Bulk Operations**: Efficient data management tools
- **Permission System**: Granular access control

### Advanced Table Features
- **Inline Editing**: Click-to-edit table cells
- **Smart Sorting**: Multi-type sorting (numeric, date, string)
- **Real-time Search**: Instant table filtering
- **Column Filtering**: Specific column-based searches
- **Pagination**: Efficient large dataset handling
- **Type Validation**: Automatic data type detection and validation

## 📁 File Structure

```
project/
├── backend/
│   ├── src/
│   │   ├── app.js                 # Main application entry
│   │   ├── config/
│   │   │   ├── database.js        # DB connection setup
│   │   │   └── columnPermissions.js # Access control rules
│   │   ├── controllers/
│   │   │   ├── userController.js  # User & table operations
│   │   │   └── authController.js  # Authentication logic
│   │   ├── middleware/
│   │   │   └── authMiddleware.js  # JWT verification
│   │   ├── models/
│   │   │   └── User.js           # Business logic & DB operations
│   │   └── routes/
│   │       └── userRoutes.js     # API endpoint definitions
│   ├── package.json              # Dependencies & scripts
│   └── create_table.sql          # Database schema
├── frontend/
│   ├── css/
│   │   ├── styles.css           # Authentication page styles
│   │   └── dashboardStyle.css   # Dashboard interface styles
│   ├── js/
│   │   ├── login.js            # Login functionality
│   │   ├── register.js         # Registration logic
│   │   ├── adminDash.js        # Admin dashboard features
│   │   ├── userDash.js         # User dashboard
│   │   └── main.js             # Shared utilities
│   ├── login.html              # Login interface
│   ├── register.html           # Registration form
│   ├── dashboard-admin.html    # Admin interface
│   └── dashboard-user.html     # User interface
└── README.md
```

## 🚀 Setup & Installation

### Prerequisites
- Node.js (v14+)
- PostgreSQL (v12+)
- npm or yarn package manager

### Installation Steps

1. **Clone Repository**
```bash
git clone <repository-url>
cd project
```

2. **Backend Setup**
```bash
cd backend
npm install
```

3. **Environment Configuration**
Create `.env` file:
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=your_database
DB_USER=your_username
DB_PASSWORD=your_password
JWT_SECRET=your_jwt_secret
ADMIN_SECRET=your_admin_secret
PORT=3000
```

4. **Database Setup**
```bash
# Connect to PostgreSQL and run:
psql -U your_username -d your_database -f create_table.sql
```

5. **Start Application**
```bash
npm run dev  # Development mode with nodemon
npm start    # Production mode
```

6. **Access Application**
- Frontend: `http://localhost:3000`
- API Health Check: `http://localhost:3000/health`

## 📊 API Endpoints

### Authentication
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/users/login` | User authentication | No |
| POST | `/api/users/register` | Account creation | No |

### Table Management
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/users/tables` | List all tables | Admin |
| GET | `/api/users/tables/:tableName` | Get table data | Admin |
| GET | `/api/users/tables/:tableName/columns` | Get table structure | Admin |
| POST | `/api/users/tables/:tableName/rows` | Add new record | Admin |
| PATCH | `/api/users/tables/:tableName/rows/:rowId` | Update record | Admin |
| DELETE | `/api/users/tables/:tableName/rows/:rowId` | Delete record | Admin |

### User Management
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/users` | List all users | Yes |
| GET | `/api/users/:id` | Get user details | Yes |
| PUT | `/api/users/:id` | Update user | Yes |
| DELETE | `/api/users/:id` | Delete user | Yes |

## 🔒 Security Features

### Input Validation
- **SQL Injection Prevention**: Parameterized queries
- **XSS Protection**: Input sanitization
- **Type Validation**: Server-side data type checking
- **Length Constraints**: Field length validation

### Authentication Security
- **Password Hashing**: bcrypt with salt rounds
- **JWT Security**: Signed tokens with expiration
- **Admin Verification**: Secret-based admin creation
- **Session Management**: Stateless authentication

### Access Control
- **Role-Based Permissions**: User/Admin role separation
- **Route Protection**: Middleware-enforced access
- **Column-Level Security**: Granular data access control
- **Conditional Permissions**: Context-aware access rules

## 🎯 Learning Objectives

This application demonstrates:

1. **MVC Architecture**: Clean separation of concerns
2. **RESTful API Design**: Standard HTTP methods and status codes
3. **Database Integration**: PostgreSQL with connection pooling
4. **Authentication Systems**: JWT-based stateless authentication
5. **Frontend-Backend Communication**: AJAX/Fetch API usage
6. **Dynamic UI Management**: JavaScript DOM manipulation
7. **Security Best Practices**: Input validation and access control
8. **Responsive Design**: Cross-device compatibility
9. **Modern CSS**: Custom properties and theming
10. **Error Handling**: Comprehensive error management

## 🔄 Data Flow

1. **User Authentication**:
   - User submits credentials → AuthController validates → JWT token generated → Client stores token

2. **Table Management**:
   - Admin requests table list → Middleware validates token → UserController fetches tables → Response with table metadata

3. **Data Editing**:
   - User edits cell → JavaScript captures change → API call with new data → Database update → UI refresh

4. **Permission Checking**:
   - Request received → User identified → Permissions calculated → Data filtered → Response sent

This comprehensive structure provides a solid foundation for learning full-stack web development concepts while implementing real-world features like authentication, database management, and user interfaces.