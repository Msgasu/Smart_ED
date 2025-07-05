# Smart Reports - Report Taking System

A specialized report management system built on top of the Smart_ED platform.

## Features

### Admin Portal
- ✅ **Class Management**: View and manage student class assignments
- ✅ **Report Generation**: Bulk generate report templates for classes
- ✅ **Semester Management**: Select and manage different academic terms
- ✅ **Statistics Dashboard**: Overview of students, teachers, and reports

### Teacher Portal  
- ✅ **Course Selection**: Access assigned courses
- ✅ **Student Grading**: Enter class scores and exam scores by class
- ✅ **Semester Reports**: Generate reports for specific terms
- ✅ **Grade Management**: Save and update student grades

### Student Portal
- ✅ **Report Viewing**: Access personal reports by semester
- ✅ **Performance Summary**: View grade summaries and progress
- ✅ **Communication**: Message teachers and admin

## Database Integration

This system **reuses the existing Smart_ED database** including:
- `profiles` - User management (admin/teacher/student)
- `courses` - Course definitions
- `student_courses` - Student-course assignments  
- `faculty_courses` - Teacher-course assignments
- `student_reports` - Report cards by term
- `student_grades` - Individual subject grades
- `notifications` - Communication system

## Setup Instructions

1. **Copy Supabase Configuration**:
   ```bash
   # Copy the supabase config from main Smart_ED
   cp ../src/lib/supabase.js src/lib/supabase.js
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Update Supabase Config**:
   Edit `src/lib/supabase.js` with your actual Supabase URL and keys (same as main Smart_ED).

4. **Run the Development Server**:
   ```bash
   npm run dev
   ```

The system will run on `http://localhost:3001` (different port from main Smart_ED).

## Key Advantages

- 🎯 **Focused UI**: Streamlined specifically for report generation
- 📊 **Leverages Existing Data**: Uses all your current students, courses, assignments  
- 🔄 **Same Authentication**: Users login with same credentials as Smart_ED
- 💾 **Shared Database**: No data duplication or synchronization needed
- ⚡ **Fast Setup**: 90% of backend already exists

## Usage Workflow

1. **Admin** assigns students to classes and generates report templates
2. **Teachers** enter grades for their courses by class and semester  
3. **Students** view their completed reports and performance summaries
4. **Communication** flows through the existing notification system

## Development

Built with:
- React 18
- Vite 4  
- React Router
- React Bootstrap
- Supabase (shared with Smart_ED)

## Integration Notes

This system is designed to work alongside the main Smart_ED application, sharing the same database and user base while providing a specialized interface for report management. 