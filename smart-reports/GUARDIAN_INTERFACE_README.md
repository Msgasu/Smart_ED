# Guardian Interface - Life International College Reports

## Overview

The Guardian Interface provides a secure and user-friendly portal for parents and guardians to view their ward's academic progress and reports. This interface maintains the beautiful Life International College branding while providing comprehensive access to student academic information.

## Features

### 🎯 **Core Functionality**
- **Ward Management**: View and manage multiple wards if guardian is responsible for multiple students
- **Academic Reports**: Access complete terminal reports with grades, attendance, and performance metrics
- **Performance Overview**: Quick dashboard showing overall academic performance
- **Report Viewing**: Professional report display matching school branding
- **Print & Download**: Export reports for offline viewing

### 🎨 **Design & Branding**
- **Life International College Branding**: Consistent wine (#722F37) and lime (#8BC34A) color scheme
- **Professional Layout**: Clean, modern interface matching admin and teacher portals
- **Responsive Design**: Optimized for desktop, tablet, and mobile viewing
- **Print-Friendly**: Professional formatting for printed reports

### 🔐 **Security Features**
- **Role-Based Access**: Guardians can only view their assigned ward's information
- **Secure Authentication**: Integration with existing Smart Reports authentication
- **Data Privacy**: Row-level security ensuring guardians only see relevant data

## User Interface

### Dashboard
- **Ward Overview**: Quick view of assigned students
- **Performance Summary**: Key metrics (average scores, grade distribution)
- **Recent Reports**: Latest academic reports
- **Quick Actions**: Easy navigation to detailed views

### Ward Profile
- **Student Information**: Basic details and contact information
- **Academic History**: Overview of academic progress

### Academic Reports
- **Complete Reports**: Full terminal reports with:
  - Student information
  - Subject grades and scores
  - Performance summary
  - Teacher remarks
  - Signature sections

## Database Schema

### Guardian-Student Relationship Table
```sql
guardian_students (
    id UUID PRIMARY KEY,
    guardian_id UUID REFERENCES profiles(id),
    student_id UUID REFERENCES profiles(id),
    relationship VARCHAR(50) DEFAULT 'Parent',
    is_primary BOOLEAN DEFAULT false,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
)
```

### User Roles
- Added `guardian` role to existing user role enum
- Maintains compatibility with existing `admin`, `faculty`, and `student` roles

## Setup Instructions

### 1. Database Migration
Run the guardian migration to set up the required tables:
```bash
# Apply the guardian migration
psql -d your_database -f migrations/create_guardian_students.sql
```

### 2. Create Guardian Users
Through the admin interface or directly in the database:
```sql
-- Insert a guardian user
INSERT INTO profiles (id, email, first_name, last_name, role) 
VALUES (gen_random_uuid(), 'guardian@example.com', 'John', 'Doe', 'guardian');

-- Link guardian to student
INSERT INTO guardian_students (guardian_id, student_id, relationship, is_primary)
VALUES (
    (SELECT id FROM profiles WHERE email = 'guardian@example.com'),
    (SELECT id FROM profiles WHERE email = 'student@example.com'),
    'Parent',
    true
);
```

### 3. Access the Interface
Guardians can log in using the same login page with their credentials:
- Navigate to the Smart Reports login page
- Enter guardian email and password
- System automatically redirects to Guardian Dashboard

## File Structure

```
smart-reports/src/guardian/
├── GuardianDashboard.jsx      # Main dashboard component
├── GuardianLayout.jsx         # Layout wrapper with sidebar
└── GuardianReportViewer.jsx   # Report viewing component

smart-reports/src/styles/
├── guardian.css               # Guardian-specific styling
└── report-enhancements.css    # Enhanced report styling

smart-reports/migrations/
└── create_guardian_students.sql # Database migration
```

## Component Architecture

### GuardianLayout
- Sidebar navigation with Life International College branding
- Purple accent color for guardian differentiation
- Responsive mobile navigation
- User profile section

### GuardianDashboard
- Multi-ward support with selection interface
- Performance summary cards
- Recent reports overview
- Quick action buttons

### GuardianReportViewer
- Professional report display
- Matches school report format exactly
- Print optimization
- Download functionality

## Styling Details

### Color Scheme
- **Primary**: Wine (#722F37) - School brand color
- **Secondary**: Lime Green (#8BC34A) - School accent color
- **Guardian Accent**: Purple (#6B46C1) - Unique guardian identification
- **Neutral**: Professional grays for content

### Typography
- **Headers**: Wine color with gradient effects
- **Content**: Professional gray tones
- **School Motto**: Lime green highlighting
- **Grades**: Color-coded based on performance

## Security Implementation

### Row-Level Security (RLS)
```sql
-- Guardians can only view their ward relationships
CREATE POLICY "Guardians can view their own ward relationships" ON guardian_students
    FOR SELECT USING (auth.uid() = guardian_id);

-- Guardians can only view reports for their wards
-- (Implemented through application logic)
```

### Data Access Control
- Guardians authenticated through Supabase auth
- Database queries filtered by guardian-student relationships
- No direct access to other student data

## Integration with Existing System

### Authentication
- Uses existing Supabase authentication
- No changes required to login flow
- Role-based routing in App.jsx

### Reports
- Displays same report data as admin/teacher views
- Read-only access to student_reports and student_grades tables
- No modification capabilities

### Styling
- Shares CSS variables with admin and teacher interfaces
- Consistent branding across all portals
- Responsive design principles

## Usage Examples

### Guardian with Single Ward
1. Login redirects to dashboard
2. Ward information displayed automatically
3. Can view reports and performance immediately

### Guardian with Multiple Wards
1. Dashboard shows ward selection interface
2. Click on ward card to select active ward
3. All subsequent views filtered to selected ward

### Viewing Reports
1. Navigate to "Academic Reports" tab
2. Browse available reports by term/year
3. Click "View Full Report" for detailed view
4. Use print/download options as needed

## Troubleshooting

### Common Issues

**Guardian can't see any wards:**
- Check guardian_students table for correct relationships
- Verify guardian_id matches the authenticated user's ID

**Reports not loading:**
- Ensure student has reports in student_reports table
- Check that student_grades are properly linked

**Styling issues:**
- Verify guardian.css is properly imported
- Check CSS variable definitions in :root

### Admin Tasks

**Adding Guardian-Student Relationships:**
```sql
INSERT INTO guardian_students (guardian_id, student_id, relationship, is_primary)
VALUES (
    'guardian-uuid',
    'student-uuid', 
    'Parent',
    true
);
```

**Removing Relationships:**
```sql
DELETE FROM guardian_students 
WHERE guardian_id = 'guardian-uuid' AND student_id = 'student-uuid';
```

## Future Enhancements

### Planned Features
- **Communication Portal**: Message teachers directly
- **Attendance Tracking**: Real-time attendance notifications
- **Performance Alerts**: Email notifications for grade changes
- **Payment Integration**: School fee payment portal
- **Event Calendar**: School events and parent-teacher meetings

### Technical Improvements
- **Mobile App**: Native mobile application
- **Push Notifications**: Real-time updates
- **Analytics**: Performance trend analysis
- **Multi-language**: Localization support

## Support

For technical support or questions about the Guardian Interface:
- Contact system administrator
- Check the main Smart Reports documentation
- Review database logs for authentication issues

## Conclusion

The Guardian Interface provides a comprehensive, secure, and user-friendly way for parents and guardians to stay connected with their ward's academic progress. The interface maintains the professional standards of Life International College while providing essential functionality for family engagement in education. 