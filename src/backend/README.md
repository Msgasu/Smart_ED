# Backend Services

This directory contains backend services that handle data fetching and manipulation for the application. The services are organized by user role (students, teachers, admins) and provide a clean separation between the frontend UI components and the data layer.

## Structure

```
backend/
├── students/           # Student-related services
│   ├── index.js        # Main export file
│   ├── profile.js      # Student profile services
│   ├── courses.js      # Course-related services
│   ├── assignments.js  # Assignment-related services
│   └── performance.js  # Performance and grades services
├── teachers/           # Teacher-related services
│   └── ...
├── admins/             # Admin-related services
│   └── ...
└── README.md           # This file
```

## Usage

Import the services from their respective modules:

```javascript
// Import specific services
import { getStudentProfile, getStudentCourses } from '../backend/students';
import { getChartData } from '../backend/students/performance';

// Use in components
const { data, error } = await getStudentProfile(userId);
```

## Service Pattern

All services follow a consistent pattern:

1. They accept parameters needed for the operation
2. They handle data fetching from Supabase
3. They process the data as needed
4. They return a consistent response object: `{ data, error }`

## Error Handling

Services handle errors internally and return them in a consistent format. Frontend components should check for errors before using the data:

```javascript
const { data, error } = await getStudentProfile(userId);
if (error) {
  // Handle error
  console.error('Error fetching profile:', error);
  return;
}

// Use data safely
setProfile(data);
```

## Available Services

### Student Services

#### Profile
- `getStudentProfile(userId)` - Get student profile data
- `updateStudentProfile(userId, profileData)` - Update student profile

#### Courses
- `getStudentCourses(studentId)` - Get all courses for a student
- `getCourseDetails(courseId)` - Get course details including instructor information
- `enrollInCourse(studentId, courseId)` - Enroll a student in a course

#### Assignments
- `getStudentAssignments(studentId)` - Get all assignments for a student
- `getAssignmentDetails(assignmentId, studentId)` - Get details of a specific assignment
- `submitAssignment(assignmentId, studentId, submissionData)` - Submit an assignment

#### Performance
- `getChartData(courseId, studentId)` - Get chart data for a course
- `calculateCourseGrade(courseId, studentId)` - Calculate overall grade for a course 