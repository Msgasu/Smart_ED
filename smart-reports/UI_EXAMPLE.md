# Expected UI for Admin Controls & Status Indicators

## 📊 Statistics Panel (should show)
```
Class Statistics
┌─────────────────┬─────────────────┬─────────────────┬─────────────────┐
│ Total Students  │ Total Reports   │ Draft Reports   │ Completed Reports│
│      25         │       48        │ 🟠 12          │ 🟢 36          │
└─────────────────┴─────────────────┴─────────────────┴─────────────────┘
```

## 🎯 Status Filter (should show)
```
Status: [All Reports ▼] [Completed Only] [Draft Only]
```

## 📋 Report Cards with Status Badges

### Draft Report (Orange Badge)
```
┌──────────────────────────────────────────────────────────────┐
│ 📊 2024 - Term 1                           🟠 ⏰ Draft       │
│ Total Score: 78% | Grade: B | 6 subjects                    │
│                                                              │
│ Admin Controls (only visible to admin):                     │
│ [👁️ View] [✅ Complete] [📝 Edit Draft]                      │
└──────────────────────────────────────────────────────────────┘
```

### Completed Report (Green Badge)
```
┌──────────────────────────────────────────────────────────────┐
│ 📊 2024 - Term 1                        🟢 🔒 Completed      │
│ Total Score: 85% | Grade: A | 7 subjects                    │
│ Completed: 12/15/2024 by John Admin                         │
│                                                              │
│ Admin Controls (only visible to admin):                     │
│ [👁️ View] [🖨️ Print] [🔓 Revert]                            │
└──────────────────────────────────────────────────────────────┘
```

## 🔄 Revert Modal (when clicking Revert button)
```
┌─────────────────────────────────────────────────────────────┐
│                  Revert Report to Draft                    │
│                                                             │
│ Are you sure you want to revert this report back to draft  │
│ status? This will unlock the report for editing.           │
│                                                             │
│ Report: 2024 - Term 1                                      │
│ Student: John Smith                                         │
│                                                             │
│ Reason for reverting (required):                           │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Please explain why this report is being reverted...    │ │
│ │                                                         │ │
│ │                                                         │ │
│ └─────────────────────────────────────────────────────────┘ │
│ Minimum 10 characters required                             │
│                                                             │
│                           [Cancel] [Revert to Draft]       │
└─────────────────────────────────────────────────────────────┘
```

## 🚨 Troubleshooting Checklist

If you don't see these elements, check:

### ✅ 1. Database Setup
Run this in Supabase SQL editor:
```sql
-- Check if status column exists
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'student_reports' AND column_name = 'status';
```

### ✅ 2. User Role
```sql
-- Check your user role (replace with your email)
SELECT role FROM profiles WHERE email = 'your-email@domain.com';

-- Make yourself admin if needed
UPDATE profiles SET role = 'admin' WHERE email = 'your-email@domain.com';
```

### ✅ 3. Sample Data
```sql
-- Check if you have reports with different statuses
SELECT status, COUNT(*) FROM student_reports GROUP BY status;

-- Check if reports have grades
SELECT COUNT(*) FROM student_grades;
```

### ✅ 4. Browser Console
Open Developer Tools (F12) and check for:
- JavaScript errors in Console tab
- Failed API calls in Network tab
- User profile data: `console.log(userProfile)`

### ✅ 5. Component Refresh
- Clear browser cache (Ctrl+Shift+R)
- Restart development server
- Check if imports are working

## 🎨 CSS Classes Used

The status indicators use these CSS classes:
- `.status-badge.completed` - Green completed badge
- `.status-badge.draft` - Orange draft badge  
- `.stat-card.draft` - Orange statistics card
- `.stat-card.completed` - Green statistics card
- `.btn-success` - Green complete button
- `.btn-warning` - Orange revert button

If styles aren't loading, check that `ClassReportsPage.css` is imported. 