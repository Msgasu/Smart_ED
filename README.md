# Smart ED - Educational Management System

Smart ED is a comprehensive educational management system designed to streamline the learning experience for students, teachers, and guardians. The system provides features for course management, assignment tracking, grade monitoring, and performance analytics. It also has features for presbopic users.

## Features

- **Student Portal**
  - Course enrollment and management
  - Assignment submission and tracking
  - Grade viewing and performance analytics
  - Interactive course materials
  - font size scaling
  - career course recomendation

- **Teacher Portal**
  - Course creation and management
  - Assignment creation and grading
  - Student performance monitoring
  - Grade management and reporting
  - - font size scaling

- **Guardian Portal**
  - Student progress monitoring
  - Grade and performance tracking
  - Communication with teachers
  - Attendance monitoring


- **Admin Portal**
  - User management (students, teachers, guardians)
  - Course and department management
  - System configuration and settings
  - Analytics and reporting
  - Role and permission management
  - System monitoring and maintenance

## Tech Stack

- Frontend: React.js with modern JavaScript (ES6+)
- Styling: CSS3 with custom variables and responsive design
- Charts: Chart.js for data visualization
- Date Handling: date-fns
- State Management: React Context API
- Routing: React Router

## Prerequisites

Before you begin, ensure you have the following installed:
- Node.js (v14.0.0 or higher)
- npm (v6.0.0 or higher)
- Git

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/smart-ed.git
cd smart-ed
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory and add your environment variables:
```env
REACT_APP_API_URL=your_api_url
REACT_APP_ENV=development
```

## Development

To start the development server:

```bash
npm run dev
```

The application will be available at `http://localhost:3000`

## Building for Production

To create a production build:

```bash
npm run build
```

The build files will be created in the `build` directory.

## Deployment

### Deploying to Production

1. Build the application:
```bash
npm run build
```

2. Deploy the contents of the `build` directory to your web server.

### Environment Configuration

For different environments (development, staging, production), create corresponding `.env` files:
- `.env.development`
- `.env.staging`
- `.env.production`

## Project Structure

```
smart-ed/
├── public/
│   ├── index.html
│   └── assets/
├── src/
│   ├── components/
│   │   ├── shared/
│   │   ├── student/
│   │   ├── teacher/
│   │   └── guardian/
│   ├── pages/
│   │   ├── student/
│   │   ├── teacher/
│   │   └── guardian/
│   ├── context/
│   ├── hooks/
│   ├── utils/
│   └── App.js
├── package.json
└── README.md
```

## Usage Guide

### For Students

1. Log in to your student account
2. Access your enrolled courses from the dashboard
3. View and submit assignments
4. Track your grades and performance
5. Get career course recommendations

### For Teachers

1. Log in to your teacher account
2. Create and manage courses
3. Create assignments and grade submissions
4. Monitor student performance

### For Guardians

1. Log in to your guardian account
2. View your ward's progress
3. Monitor grades and attendance
4. Communicate with teachers

### For Administrators

1. Log in to your admin account
2. Manage user accounts and permissions
3. Configure system settings
4. Monitor system performance
5. Generate institutional reports
6. Manage courses and departments
7. Handle system maintenance


## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request


## Support

For support, email support@smarted.com or create an issue in the GitHub repository.

## Acknowledgments

- Chart.js for data visualization
- React community for excellent documentation
- All contributors who have helped shape this project

---

Made with ❤️ by the SmartED Team
