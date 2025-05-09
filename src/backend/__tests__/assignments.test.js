import { describe, test, expect, vi, beforeEach } from 'vitest';
import { 
  getStudentAssignments, 
  getAssignmentDetails, 
  submitAssignment,
  uploadAssignmentFile
} from '../students/assignments';
import { supabase } from '../../lib/supabase';

// Mock the supabase client
vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis()
    })),
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn().mockResolvedValue({ data: null, error: null }),
        remove: vi.fn().mockResolvedValue({ data: null, error: null })
      }))
    }
  }
}));

describe('Assignment Backend Functions', () => {
  const mockStudentId = '123';
  const mockAssignmentId = '456';
  const mockFile = new File(['test'], 'test.pdf', { type: 'application/pdf' });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Test 1: Get Student Assignments
  test('getStudentAssignments fetches assignments successfully', async () => {
    // Mock successful response for student courses
    const mockStudentCourses = { data: [{ course_id: '1' }], error: null };
    const mockAssignments = { 
      data: [{
        id: '1',
        title: 'Test Assignment',
        student_assignments: []
      }], 
      error: null 
    };

    // Set up the mock responses
    const mockSelect = vi.fn().mockReturnThis();
    const mockEq = vi.fn().mockReturnThis();
    const mockIn = vi.fn().mockReturnThis();
    const mockOrder = vi.fn().mockResolvedValue(mockAssignments);

    supabase.from.mockReturnValue({
      select: mockSelect,
      eq: mockEq,
      in: mockIn,
      order: mockOrder
    });

    // Mock the first call to get student courses
    supabase.from.mockReturnValueOnce({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue(mockStudentCourses)
    });

    const result = await getStudentAssignments(mockStudentId);

    expect(result.error).toBeNull();
    expect(result.data).toEqual(mockAssignments.data);
  });

  // Test 2: Get Assignment Details
  test('getAssignmentDetails fetches assignment details successfully', async () => {
    // Mock successful response for assignment
    const mockAssignment = {
      data: {
        id: mockAssignmentId,
        title: 'Test Assignment',
        courses: {
          code: 'CS101',
          name: 'Computer Science'
        }
      },
      error: null
    };

    // Set up the mock responses
    const mockSelect = vi.fn().mockReturnThis();
    const mockEq = vi.fn().mockReturnThis();
    const mockSingle = vi.fn().mockResolvedValue(mockAssignment);
    const mockMaybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });

    supabase.from.mockReturnValue({
      select: mockSelect,
      eq: mockEq,
      single: mockSingle,
      maybeSingle: mockMaybeSingle
    });

    const result = await getAssignmentDetails(mockAssignmentId, mockStudentId);

    expect(result.error).toBeNull();
    expect(result.data).toEqual(expect.objectContaining({
      id: mockAssignmentId,
      title: 'Test Assignment'
    }));
  });

  // Test 3: Submit Assignment
  test('submitAssignment creates new submission successfully', async () => {
    // Mock successful response for existing submission check
    const mockSubmission = {
      data: {
        id: '789',
        assignment_id: mockAssignmentId,
        student_id: mockStudentId,
        status: 'submitted'
      },
      error: null
    };

    // Set up the mock responses
    const mockSelect = vi.fn().mockReturnThis();
    const mockEq = vi.fn().mockReturnThis();
    const mockMaybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    const mockInsert = vi.fn().mockReturnThis();
    const mockSingle = vi.fn().mockResolvedValue(mockSubmission);

    supabase.from.mockReturnValue({
      select: mockSelect,
      eq: mockEq,
      maybeSingle: mockMaybeSingle,
      insert: mockInsert,
      single: mockSingle
    });

    const result = await submitAssignment(mockAssignmentId, mockStudentId, {
      description: 'Test submission'
    });

    expect(result.error).toBeNull();
    expect(result.data).toEqual(mockSubmission.data);
  });

  // Test 4: Upload Assignment File
  test('uploadAssignmentFile uploads file successfully', async () => {
    // Mock successful upload
    const mockUpload = {
      data: { path: 'assignment_files/test.pdf' },
      error: null
    };

    const mockFileRecord = {
      data: {
        id: '1',
        path: 'assignment_files/test.pdf',
        filename: 'test.pdf'
      },
      error: null
    };

    // Set up the mock responses
    supabase.storage.from.mockReturnValue({
      upload: vi.fn().mockResolvedValue(mockUpload)
    });

    const mockSelect = vi.fn().mockReturnThis();
    const mockInsert = vi.fn().mockReturnThis();
    const mockSingle = vi.fn().mockResolvedValue(mockFileRecord);

    supabase.from.mockReturnValue({
      select: mockSelect,
      insert: mockInsert,
      single: mockSingle
    });

    const result = await uploadAssignmentFile(mockAssignmentId, mockStudentId, mockFile);

    expect(result.error).toBeNull();
    expect(result.data).toBeDefined();
  });

  // Test 5: Error Handling
  test('handles errors appropriately', async () => {
    // Mock error response
    const mockError = {
      data: null,
      error: { message: 'Failed to fetch student courses' }
    };

    // Set up the mock response
    supabase.from.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue(mockError)
    });

    const result = await getStudentAssignments(mockStudentId);

    expect(result.error).toBeDefined();
    expect(result.data).toBeNull();
  });

  // Test 6: File Upload Error
  test('handles file upload errors', async () => {
    // Mock file upload error
    const mockError = {
      data: null,
      error: { message: 'Failed to upload file' }
    };

    // Set up the mock response
    supabase.storage.from.mockReturnValue({
      upload: vi.fn().mockResolvedValue(mockError)
    });

    const result = await uploadAssignmentFile(mockAssignmentId, mockStudentId, mockFile);

    expect(result.error).toBeDefined();
    expect(result.error.message).toBe('Failed to upload file');
  });
}); 